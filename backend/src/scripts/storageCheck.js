/**
 * Verifies the Cloudinary setup end to end, without touching the real database:
 * uploads a test PNG and PDF as private files, checks they are NOT publicly reachable, downloads them
 * back through the API's streaming path, compares the bytes, then deletes them.
 * Run: npm run test:storage
 */
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import env from '../config/env.js';
import { storeUpload, streamAsset, removeAsset, storageConfigured, sniffType } from '../services/storageService.js';

if (!storageConfigured()) {
  console.error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env.');
  process.exit(1);
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

function tinyPdf() {
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

async function download(asset) {
  const chunks = [];
  const res = new PassThrough();
  res.headers = {};
  res.set = (h) => Object.assign(res.headers, h);
  res.on('data', (c) => chunks.push(c));
  await streamAsset(asset, res);
  return { body: Buffer.concat(chunks), headers: res.headers };
}

const mem = await MongoMemoryServer.create();
await mongoose.connect(mem.getUri('storage-check'));
const owner = new mongoose.Types.ObjectId();
const created = [];
let passed = 0;
const check = async (label, fn) => {
  await fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
};

console.log(`Cloudinary storage checks (cloud "${env.cloudinary.cloudName}", folder "${env.cloudinary.folder}")`);
try {
  await check('Rejects a file whose content is not an image/PDF', async () => {
    await assert.rejects(() => storeUpload({ buffer: Buffer.from('<html>not an image</html>'), originalname: 'x.png' }, { owner, purpose: 'payment_proof' }), /Only/);
  });

  for (const [label, buf] of [['PNG', PNG], ['PDF', tinyPdf()]]) {
    let asset;
    await check(`Uploads a ${label} as a private file`, async () => {
      assert.ok(sniffType(buf));
      asset = await storeUpload({ buffer: buf, originalname: `test.${label.toLowerCase()}` }, { owner, purpose: 'payment_proof' });
      created.push(asset);
      assert.equal(asset.deliveryType, 'private');
      assert.equal(asset.url, undefined);
    });
    await check(`${label} is not reachable at a public Cloudinary URL`, async () => {
      const guess = `https://res.cloudinary.com/${env.cloudinary.cloudName}/image/upload/${asset.publicId}.${asset.format}`;
      const r = await fetch(guess);
      assert.ok(!r.ok, `expected public URL to fail, got ${r.status}`);
    });
    await check(`${label} downloads through the API with identical bytes`, async () => {
      const { body, headers } = await download(asset);
      assert.equal(headers['Content-Type'], asset.mimeType);
      assert.ok(body.equals(buf), `downloaded ${body.length} bytes, expected ${buf.length}`);
    });
  }

  await check('Public QR-style upload returns a working public URL', async () => {
    const asset = await storeUpload({ buffer: PNG, originalname: 'qr.png' }, { owner, purpose: 'qr_code', visibility: 'public', allowPdf: false });
    created.push(asset);
    const r = await fetch(asset.url);
    assert.ok(r.ok, `public URL returned ${r.status}`);
  });
} finally {
  for (const a of created) await removeAsset(a);
  console.log(`  (cleaned up ${created.length} test file(s) from Cloudinary)`);
  await mongoose.disconnect();
  await mem.stop();
}
console.log(`\nAll ${passed} storage checks passed.`);
