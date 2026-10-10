import Package from '../models/Package.js';
import Course from '../models/Course.js';
import SettingHistory from '../models/SettingHistory.js';
import Ledger, { walletMatch } from '../models/Ledger.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { z } from 'zod';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { treeNode } from '../services/teamService.js';
import { reqAudit } from '../services/auditService.js';
import { storeUpload } from '../services/storageService.js';
import { getPaging, paged, escapeRegex } from '../utils/pagination.js';
import { parseDayIST, addDays } from '../utils/dates.js';
import { round2 } from '../utils/money.js';

/* ---------- Packages (shown as course bundles) ---------- */

export async function listPackages(_req, res) {
  const settings = await getSettings();
  const packages = await Package.find().sort({ sortOrder: 1, price: 1 }).lean();
  res.json({ packages, tax: settings.tax });
}

const money = z.coerce.number().min(0);
const packageSchema = z.object({
  name: z.string().trim().min(2),
  price: money.positive(),
  activeIncome: money,
  passiveLevels: z.array(money).max(30),
  nonWorkingBonus: money,
  weeklyEligible: z.boolean(),
  status: z.enum(['active', 'inactive']),
  description: z.string().max(500).optional().default(''),
  benefits: z.array(z.string().trim().min(1)).max(20).optional().default([]),
  courses: z.array(z.string().trim().toLowerCase()).max(100).optional(),
});

export async function updatePackage(req, res) {
  const data = packageSchema.parse(req.body);
  if (data.courses === undefined) delete data.courses;
  else {
    data.courses = [...new Set(data.courses)];
    const known = await Course.countDocuments({ slug: { $in: data.courses } });
    if (known !== data.courses.length) throw new AppError('One or more selected courses no longer exist');
  }
  const pkg = await Package.findById(req.params.id);
  if (!pkg) throw new AppError('Bundle not found', 404);
  await SettingHistory.create({ scope: 'package', refId: pkg.key, snapshot: pkg.toObject(), changedBy: req.user._id });
  const before = { price: pkg.price, activeIncome: pkg.activeIncome, passiveLevels: [...pkg.passiveLevels], nonWorkingBonus: pkg.nonWorkingBonus };
  pkg.set(data);
  await pkg.save();
  await reqAudit(req, 'package.updated', { entityType: 'Package', entityId: pkg.key, details: { before, after: data } });

  const settings = await getSettings();
  const payout = data.activeIncome + data.passiveLevels.reduce((a, b) => a + b, 0) + data.nonWorkingBonus;
  const cost = round2(data.price * (1 - (settings.tax.gstPercent + settings.tax.systemCostPercent) / 100));
  res.json({
    message: 'Bundle updated',
    package: pkg,
    warning: payout > cost ? `Total payout ₹${payout} exceeds the bundle cost ₹${cost} after GST and system cost.` : undefined,
  });
}

/* ---------- Course catalog ---------- */

export async function listCourses(_req, res) {
  const [courses, packages] = await Promise.all([
    Course.find().sort({ sortOrder: 1, title: 1 }).lean(),
    Package.find().sort({ sortOrder: 1, price: 1 }).select('key name courses').lean(),
  ]);
  res.json({
    courses: courses.map((c) => ({ ...c, bundles: packages.filter((p) => (p.courses || []).includes(c.slug)).map((p) => p.name) })),
  });
}

const lines = z.array(z.string().trim().min(1)).max(30);
const courseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'All levels']),
  icon: z.string().trim().max(40).optional().default('graduation-cap'),
  summary: z.string().trim().max(300).optional().default(''),
  description: z.string().trim().max(3000).optional().default(''),
  outcomes: lines.optional().default([]),
  modules: z.array(z.object({ title: z.string().trim().min(1).max(160), topics: lines.optional().default([]) })).max(40).optional().default([]),
  status: z.enum(['active', 'inactive']),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
});
const slugRule = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens (e.g. ai-tools-mastery)').max(80);

export async function createCourse(req, res) {
  const data = courseSchema.parse(req.body);
  const slug = slugRule.parse(req.body.slug);
  const course = await Course.create({ ...data, slug });
  await reqAudit(req, 'course.created', { entityType: 'Course', entityId: slug });
  res.status(201).json({ message: 'Course created', course });
}

export async function updateCourse(req, res) {
  const data = courseSchema.parse(req.body); // the slug is fixed after creation: bundles and links refer to it
  const course = await Course.findById(req.params.id);
  if (!course) throw new AppError('Course not found', 404);
  course.set(data);
  await course.save();
  await reqAudit(req, 'course.updated', { entityType: 'Course', entityId: course.slug });
  res.json({ message: 'Course updated', course });
}

/* ---------- Settings ---------- */

const pctNum = z.coerce.number().min(0).max(100);
const settingsSchema = z
  .object({
    site: z.object({
      name: z.string().trim().min(2),
      tagline: z.string().trim().optional().default(''),
      email: z.string().trim().optional().default(''),
      phone: z.string().trim().optional().default(''),
      whatsapp: z.string().trim().optional().default(''),
      address: z.string().trim().optional().default(''),
    }),
    payment: z.object({
      upiId: z.string().trim().optional().default(''),
      payeeName: z.string().trim().optional().default(''),
      instructions: z.string().trim().optional().default(''),
    }),
    tax: z.object({ gstPercent: pctNum, systemCostPercent: pctNum }),
    weekly: z.object({
      percent: pctNum,
      qualifyingSales: z.coerce.number().int().min(1).max(100),
      poolBasis: z.enum(['collection', 'net']).default('collection'),
      autoProcess: z.boolean().default(true),
      autoApprove: z.boolean().default(true),
    }),
    monthlyBonus: z.object({
      comparator: z.enum(['gt', 'gte']),
      slabs: z.array(z.object({ threshold: money, bonus: money })).max(20),
    }),
    badges: z.array(z.object({ key: z.string().trim().min(1), name: z.string().trim().min(1), threshold: money })).min(1).max(30),
    badgeQualifyingCategories: z.array(z.enum(['active', 'passive', 'weekly', 'monthly_bonus', 'non_working', 'royalty'])).min(1),
    royalty: z.object({
      basis: z.enum(['team', 'own']),
      slabs: z.array(z.object({ badgeKey: z.string().trim().min(1), percent: pctNum })).max(30),
    }),
    withdrawal: z.object({
      tdsPercent: pctNum,
      adminChargePercent: pctNum,
      min: money,
      max: money,
      requireKyc: z.boolean(),
    }),
    wallet: z.object({ depositMin: money, depositMax: money, transferMin: money }),
    nonWorking: z.object({ autoProcess: z.boolean() }),
    income: z.object({ requireActiveBeneficiary: z.boolean() }),
    note: z.string().max(300).optional(),
  })
  .partial();

export async function getSettingsAdmin(_req, res) {
  res.json({ settings: await getSettings() });
}

export async function putSettings(req, res) {
  const { note, ...patch } = settingsSchema.parse(req.body);
  if (patch.badges) {
    const keys = patch.badges.map((b) => b.key);
    if (new Set(keys).size !== keys.length) throw new AppError('Badge keys must be unique');
  }
  if (patch.payment) {
    const current = await getSettings();
    patch.payment = { ...patch.payment, qrImage: current.payment.qrImage };
  }
  const before = await getSettings();
  const updated = await updateSettings(patch, req.user._id, note);
  await reqAudit(req, 'settings.updated', {
    entityType: 'Setting',
    entityId: `v${updated.version}`,
    details: { sections: Object.keys(patch), fromVersion: before.version, note },
  });
  res.json({ message: `Settings saved (version ${updated.version})`, settings: updated });
}

export async function uploadQr(req, res) {
  if (!req.file) throw new AppError('Upload a QR code image');
  const asset = await storeUpload(req.file, { owner: req.user._id, purpose: 'qr_code', visibility: 'public', allowPdf: false });
  const current = await getSettings();
  // Previous QR images are kept in Cloudinary so older settings versions still point to a valid file.
  const updated = await updateSettings({ payment: { ...current.payment, qrImage: asset.url } }, req.user._id, 'QR code updated');
  await reqAudit(req, 'settings.qr_updated', { entityType: 'Setting', entityId: `v${updated.version}` });
  res.json({ message: 'QR code updated', settings: updated });
}

export async function settingsHistory(req, res) {
  const paging = getPaging(req.query);
  const [items, total] = await Promise.all([
    SettingHistory.find().populate('changedBy', 'fullName').sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    SettingHistory.countDocuments(),
  ]);
  res.json(paged(items, total, paging));
}

/* ---------- Ledger ---------- */

export async function ledger(req, res) {
  const paging = getPaging(req.query);
  const q = {};
  if (req.query.category) q.category = req.query.category;
  if (req.query.status) q.status = req.query.status;
  if (req.query.direction) q.direction = req.query.direction;
  if (req.query.wallet) Object.assign(q, walletMatch(req.query.wallet));
  const from = parseDayIST(req.query.from);
  const to = parseDayIST(req.query.to);
  if (from || to) q.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: addDays(to, 1) } : {}) };
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    const ids = await User.find({ $or: [{ fullName: rx }, { memberId: rx }, { username: rx }] }).distinct('_id');
    q.$or = [{ user: { $in: ids } }, { txnId: rx }, { reference: rx }];
  }
  const [items, total, totals] = await Promise.all([
    Ledger.find(q).populate('user', 'memberId fullName').populate('sourceUser counterparty', 'memberId fullName').populate('package', 'name')
      .sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Ledger.countDocuments(q),
    Ledger.aggregate([{ $match: q }, { $group: { _id: '$direction', total: { $sum: '$netAmount' } } }]),
  ]);
  const t = Object.fromEntries(totals.map((r) => [r._id, round2(r.total)]));
  res.json({ ...paged(items, total, paging), totals: { credit: t.credit || 0, debit: t.debit || 0 } });
}

/* ---------- Audit log ---------- */

export async function auditLogs(req, res) {
  const paging = getPaging(req.query, 30);
  const q = {};
  if (req.query.action) q.action = new RegExp(`^${escapeRegex(req.query.action)}`);
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    q.$or = [{ actorName: rx }, { entityId: rx }, { action: rx }];
  }
  const [items, total] = await Promise.all([
    AuditLog.find(q).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    AuditLog.countDocuments(q),
  ]);
  res.json(paged(items, total, paging));
}

/* ---------- Network ---------- */

export async function networkTree(req, res) {
  let nodeId = req.query.node;
  if (!nodeId && req.query.memberId) {
    const u = await User.findOne({ memberId: String(req.query.memberId).toUpperCase(), role: 'member' }).select('_id').lean();
    if (!u) throw new AppError('Member not found', 404);
    nodeId = u._id;
  }
  if (!nodeId) {
    const root = await User.findOne({ isRoot: true }).select('_id').lean();
    nodeId = root?._id;
  }
  const node = nodeId && (await treeNode(nodeId));
  if (!node) throw new AppError('Member not found', 404);
  res.json({ node });
}
