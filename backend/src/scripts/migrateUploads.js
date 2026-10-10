/**
 * Moves files saved on the server disk (backend/uploads) to Cloudinary and updates the database references.
 *   npm run migrate:uploads                 → migrate
 *   npm run migrate:uploads -- --dry-run    → only report what would be migrated
 *   npm run migrate:uploads -- --delete-local  → also delete the local copies after a successful migration
 * Safe to run more than once: already-migrated references are skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { assertServerEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { UPLOAD_ROOT } from '../config/paths.js';
import Payment from '../models/Payment.js';
import Kyc from '../models/Kyc.js';
import Setting from '../models/Setting.js';
import { storeUpload, fileRef, parseRef, storageConfigured } from '../services/storageService.js';
import { invalidateSettings } from '../services/settingsService.js';

const dryRun = process.argv.includes('--dry-run');
const deleteLocal = process.argv.includes('--delete-local');
const stats = { migrated: 0, skipped: 0, missing: 0, failed: 0 };
const migratedFiles = [];

assertServerEnv();
if (!storageConfigured() && !dryRun) {
  console.error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env.');
  process.exit(1);
}
await connectDB();

async function migrate(ref, folder, options, label) {
  if (!ref || parseRef(ref) || /^https?:\/\//.test(ref)) {
    stats.skipped += 1;
    return null;
  }
  const file = path.join(UPLOAD_ROOT, folder, path.basename(ref));
  if (!fs.existsSync(file)) {
    stats.missing += 1;
    console.warn(`  ! missing on disk: ${label} → ${ref}`);
    return null;
  }
  if (dryRun) {
    console.log(`  would migrate ${label} → ${ref}`);
    stats.migrated += 1;
    return null;
  }
  try {
    const asset = await storeUpload({ buffer: fs.readFileSync(file), originalname: path.basename(file) }, options);
    migratedFiles.push(file);
    stats.migrated += 1;
    console.log(`  ✓ ${label}`);
    return asset;
  } catch (err) {
    stats.failed += 1;
    console.error(`  ✗ ${label}: ${err.message}`);
    return null;
  }
}

console.log(`${dryRun ? '[dry run] ' : ''}Migrating local uploads to Cloudinary…`);

for (const p of await Payment.find({ proof: { $exists: true, $ne: null } })) {
  const asset = await migrate(p.proof, 'private', { owner: p.user, purpose: 'payment_proof' }, `payment ${p.paymentId}`);
  if (asset) await Payment.updateOne({ _id: p._id }, { $set: { proof: fileRef(asset) } });
}

const KYC_DOCS = { aadhaarDoc: 'kyc_aadhaar', panDoc: 'kyc_pan', bankDoc: 'kyc_bank' };
for (const k of await Kyc.find()) {
  for (const [field, purpose] of Object.entries(KYC_DOCS)) {
    const asset = await migrate(k[field], 'private', { owner: k.user, purpose }, `KYC ${k.user} ${field}`);
    if (asset) await Kyc.updateOne({ _id: k._id }, { $set: { [field]: fileRef(asset) } });
  }
}

const settings = await Setting.findOne({ key: 'global' });
if (settings?.payment?.qrImage) {
  const asset = await migrate(settings.payment.qrImage, 'public', { purpose: 'qr_code', visibility: 'public', allowPdf: false }, 'payment QR code');
  if (asset) {
    await Setting.updateOne({ _id: settings._id }, { $set: { 'payment.qrImage': asset.url } });
    invalidateSettings();
  }
}

// Local files no database record points to (left by submissions that failed before Cloudinary was used).
const referenced = new Set();
for (const p of await Payment.find().select('proof').lean()) referenced.add(p.proof);
for (const k of await Kyc.find().select('aadhaarDoc panDoc bankDoc').lean()) [k.aadhaarDoc, k.panDoc, k.bankDoc].forEach((r) => referenced.add(r));
const privateDir = path.join(UPLOAD_ROOT, 'private');
const orphans = fs.existsSync(privateDir)
  ? fs.readdirSync(privateDir).filter((f) => f !== '.gitkeep' && !referenced.has(f)).map((f) => path.join(privateDir, f))
  : [];
const stale = orphans.filter((f) => !migratedFiles.includes(f));
if (stale.length) console.log(`${stale.length} local file(s) are not referenced by any record${deleteLocal && !dryRun ? ' — deleting' : ' (use --delete-local to remove them)'}.`);

if (deleteLocal && !dryRun) {
  for (const f of [...migratedFiles, ...stale]) fs.rmSync(f, { force: true });
  console.log(`Deleted ${migratedFiles.length + stale.length} local file(s).`);
}

console.log(`Done. migrated: ${stats.migrated}, already in Cloudinary/empty: ${stats.skipped}, missing on disk: ${stats.missing}, failed: ${stats.failed}`);
await disconnectDB();
process.exit(stats.failed ? 1 : 0);
