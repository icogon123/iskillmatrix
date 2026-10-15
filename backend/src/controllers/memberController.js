import mongoose from 'mongoose';
import User from '../models/User.js';
import Package from '../models/Package.js';
import Payment from '../models/Payment.js';
import Kyc from '../models/Kyc.js';
import Ledger, { INCOME_CATEGORIES } from '../models/Ledger.js';
import Withdrawal from '../models/Withdrawal.js';
import Notification from '../models/Notification.js';
import Deposit from '../models/Deposit.js';
import FileAsset from '../models/FileAsset.js';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';
import { getSettings } from '../services/settingsService.js';
import { incomeByCategory, incomeBetween, getBalances, walletStatement, CATEGORY_LABELS } from '../services/ledgerService.js';
import { badgeProgress } from '../services/badgeService.js';
import { teamStats, levelSummary, levelMembers, treeNode, isInDownline } from '../services/teamService.js';
import { walletSummary, requestWithdrawal, cancelWithdrawal, quote, sendWithdrawalOtp } from '../services/withdrawalService.js';
import { submitPayment as submitPaymentSvc, priceBreakdown } from '../services/paymentService.js';
import { lookupMember, transferFunds, purchaseBundle } from '../services/walletService.js';
import { submitDeposit as submitDepositSvc } from '../services/depositService.js';
import { reqAudit } from '../services/auditService.js';
import { storeUpload, removeAsset, fileRef, publicAssetUrl } from '../services/storageService.js';
import { publicUser } from './authController.js';
import { getPaging, paged } from '../utils/pagination.js';
import { startOfDayIST, startOfMonthIST, startOfWeekIST, addDays, addMonthsIST, dayKeyIST, parseDayIST } from '../utils/dates.js';
import { maskAadhaar, maskPan, maskTail } from '../utils/mask.js';
import { round2 } from '../utils/money.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const referralLink = (u) => `${env.clientUrl}/register?ref=${u.memberId}`;

async function last7Days(userId) {
  const from = addDays(startOfDayIST(), -6);
  const rows = await Ledger.aggregate([
    {
      $match: {
        user: oid(userId),
        direction: 'credit',
        status: 'completed',
        category: { $in: INCOME_CATEGORIES },
        completedAt: { $gte: from },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt', timezone: 'Asia/Kolkata' } },
        total: { $sum: '$netAmount' },
      },
    },
  ]);
  const map = new Map(rows.map((r) => [r._id, round2(r.total)]));
  return Array.from({ length: 7 }, (_, i) => {
    const key = dayKeyIST(addDays(from, i));
    return { date: key, total: map.get(key) || 0 };
  });
}

/** This week's direct sales per weekly-eligible package (progress towards the weekly qualification). */
async function weeklyProgress(userId, settings) {
  const start = startOfWeekIST();
  const packages = await Package.find({ weeklyEligible: true }).sort({ price: 1 }).lean();
  const directs = await User.find({ sponsor: userId }).distinct('_id');
  const counts = await Payment.aggregate([
    { $match: { status: 'approved', verifiedAt: { $gte: start }, user: { $in: directs }, package: { $in: packages.map((p) => p._id) } } },
    { $group: { _id: '$package', n: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    weekStart: start,
    required: settings.weekly.qualifyingSales,
    percent: settings.weekly.percent,
    packages: packages.map((p) => ({ key: p.key, name: p.name, sales: map.get(String(p._id)) || 0 })),
  };
}

export async function dashboard(req, res) {
  const u = req.user;
  const settings = await getSettings();
  const now = new Date();
  const [profile, income, wallet, today, month, chart, team, unread, kyc, pendingPayment, weekly, lastWeekly] = await Promise.all([
    publicUser(u._id),
    incomeByCategory(u._id),
    walletSummary(u._id),
    incomeBetween(u._id, startOfDayIST(now), addDays(startOfDayIST(now), 1)),
    incomeBetween(u._id, startOfMonthIST(now), addMonthsIST(startOfMonthIST(now), 1)),
    last7Days(u._id),
    teamStats(u._id),
    Notification.countDocuments({ user: u._id, read: false }),
    Kyc.findOne({ user: u._id }).select('status rejectionReason').lean(),
    Payment.findOne({ user: u._id }).sort({ createdAt: -1 }).populate('package', 'name').lean(),
    weeklyProgress(u._id, settings),
    Ledger.findOne({ user: u._id, category: 'weekly', status: 'completed' }).sort({ completedAt: -1 }).select('netAmount period completedAt').lean(),
  ]);
  res.json({
    profile,
    income,
    wallet,
    earnings: { today, month, last7Days: chart, last7Total: round2(chart.reduce((a, b) => a + b.total, 0)) },
    team,
    referral: { code: u.memberId, link: referralLink(u) },
    achievement: badgeProgress(settings, u),
    kyc: { status: kyc?.status || 'not_submitted', rejectionReason: kyc?.rejectionReason },
    latestPayment: pendingPayment,
    weekly,
    weeklyIncome: {
      total: income.weekly,
      pending: income.pending.weekly,
      last: lastWeekly ? { amount: lastWeekly.netAmount, week: lastWeekly.period, creditedAt: lastWeekly.completedAt } : null,
    },
    unreadNotifications: unread,
  });
}

export async function profile(req, res) {
  const p = await publicUser(req.user._id);
  res.json({ user: p, referral: { code: p.memberId, link: referralLink(p) } });
}

/** Profile picture: stored as a public image, served cropped square around the face. Replaces any previous picture. */
export async function uploadAvatar(req, res) {
  if (!req.file) throw new AppError('Choose an image (JPG, PNG or WEBP)');
  const asset = await storeUpload(req.file, { owner: req.user._id, purpose: 'avatar', visibility: 'public', allowPdf: false });
  const avatar = asset.url.replace('/upload/', '/upload/c_fill,g_face,w_320,h_320,q_auto,f_auto/');
  const prev = await User.findByIdAndUpdate(req.user._id, { $set: { avatar, avatarAsset: asset._id } }).select('+avatarAsset').lean();
  if (prev?.avatarAsset) {
    const old = await FileAsset.findById(prev.avatarAsset);
    if (old) await removeAsset(old);
  }
  await reqAudit(req, 'profile.avatar_updated', { entityType: 'User', entityId: req.user.memberId });
  res.json({ message: 'Profile picture updated', avatar });
}

export async function removeAvatar(req, res) {
  const prev = await User.findByIdAndUpdate(req.user._id, { $unset: { avatar: 1, avatarAsset: 1 } }).select('+avatarAsset').lean();
  if (prev?.avatarAsset) {
    const old = await FileAsset.findById(prev.avatarAsset);
    if (old) await removeAsset(old);
  }
  await reqAudit(req, 'profile.avatar_removed', { entityType: 'User', entityId: req.user.memberId });
  res.json({ message: 'Profile picture removed' });
}

/* ---------- Bundle (package) activation (QR payment or wallet) ---------- */

export async function paymentInfo(req, res) {
  const settings = await getSettings();
  const packages = await Package.find({ status: 'active' }).sort({ sortOrder: 1, price: 1 }).lean();
  const [payments, wallets] = await Promise.all([
    Payment.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('package', 'name key').populate('paidBy', 'fullName username').lean(),
    getBalances(req.user._id),
  ]);
  res.json({
    payment: {
      upiId: settings.payment.upiId,
      payeeName: settings.payment.payeeName,
      qrImage: publicAssetUrl(settings.payment.qrImage),
      instructions: settings.payment.instructions,
    },
    packages: packages.map((p) => ({
      _id: p._id, key: p.key, name: p.name, price: p.price, courses: p.courses || [], benefits: p.benefits || [], ...priceBreakdown(p.price, settings),
    })),
    selectedPackage: req.user.selectedPackage,
    activePackage: req.user.package,
    payments,
    canSubmit: !req.user.package && !payments.some((p) => p.status === 'pending'),
    wallets,
    walletSuspended: Boolean(req.user.walletSuspended),
  });
}

export async function submitPayment(req, res) {
  const payment = await submitPaymentSvc(req.user, req.body, req.file, req.ip);
  res.status(201).json({ message: 'Payment submitted for verification', payment });
}

/* ---------- KYC ---------- */

const maskKyc = (k) =>
  k && {
    ...k,
    aadhaarNumber: maskAadhaar(k.aadhaarNumber),
    panNumber: maskPan(k.panNumber),
    accountNumber: maskTail(k.accountNumber),
  };

export async function getKyc(req, res) {
  const kyc = await Kyc.findOne({ user: req.user._id }).lean();
  res.json({ kyc: maskKyc(kyc), status: kyc?.status || 'not_submitted' });
}

export async function submitKyc(req, res) {
  const existing = await Kyc.findOne({ user: req.user._id });
  if (existing && existing.status !== 'rejected') {
    throw new AppError(existing.status === 'approved' ? 'Your KYC is already approved' : 'Your KYC is already under review', 409);
  }
  const files = req.files || {};
  const has = (name) => Boolean(files[name]?.[0] || existing?.[name]);
  if (!has('aadhaarDoc')) throw new AppError('Upload your Aadhaar document');
  if (!has('panDoc')) throw new AppError('Upload your PAN document');

  // Upload new documents to Cloudinary; keep previously uploaded ones on a re-submission.
  const uploaded = [];
  const docRef = async (name, purpose) => {
    const file = files[name]?.[0];
    if (!file) return existing?.[name];
    const asset = await storeUpload(file, { owner: req.user._id, purpose });
    uploaded.push(asset);
    return fileRef(asset);
  };

  let kyc;
  try {
    const data = {
      ...req.body,
      aadhaarDoc: await docRef('aadhaarDoc', 'kyc_aadhaar'),
      panDoc: await docRef('panDoc', 'kyc_pan'),
      bankDoc: await docRef('bankDoc', 'kyc_bank'),
      status: 'submitted',
      rejectionReason: undefined,
      submittedAt: new Date(),
      reviewedAt: undefined,
      reviewedBy: undefined,
    };
    kyc = existing ? Object.assign(existing, data) : new Kyc({ user: req.user._id, ...data });
    await kyc.save();
  } catch (err) {
    await Promise.all(uploaded.map((a) => removeAsset(a)));
    throw err;
  }
  await User.updateOne({ _id: req.user._id }, { $set: { kycStatus: 'submitted' } });
  await reqAudit(req, 'kyc.submitted', { entityType: 'Kyc', entityId: req.user.memberId });
  res.status(201).json({ message: 'KYC submitted for review', kyc: maskKyc(kyc.toObject()) });
}

/* ---------- Team ---------- */

export async function team(req, res) {
  const [stats, levels] = await Promise.all([teamStats(req.user._id), levelSummary(req.user._id)]);
  res.json({ stats, levels });
}

export async function teamMembers(req, res) {
  const paging = getPaging(req.query);
  const level = parseInt(req.query.level, 10) || 0;
  const { items, total } = await levelMembers(req.user._id, level, { ...paging, search: req.query.search });
  res.json(paged(items, total, paging));
}

export async function tree(req, res) {
  const nodeId = req.query.node || req.user._id;
  if (!(await isInDownline(req.user._id, nodeId))) throw new AppError('This member is not in your network', 403);
  const node = await treeNode(nodeId);
  if (!node) throw new AppError('Member not found', 404);
  res.json({ node });
}

/* ---------- Income & wallet ---------- */

export async function incomeSummary(req, res) {
  const now = new Date();
  const [all, month] = await Promise.all([
    incomeByCategory(req.user._id),
    incomeByCategory(req.user._id, { from: startOfMonthIST(now), to: addMonthsIST(startOfMonthIST(now), 1) }),
  ]);
  res.json({ lifetime: all, thisMonth: month, labels: CATEGORY_LABELS });
}

export async function ledger(req, res) {
  const paging = getPaging(req.query);
  const q = { user: req.user._id };
  if (req.query.category) q.category = req.query.category;
  else if (req.query.scope === 'income') q.category = { $in: INCOME_CATEGORIES };
  if (req.query.status) q.status = req.query.status;
  else q.status = { $ne: 'cancelled' };
  const [items, total] = await Promise.all([
    Ledger.find(q)
      .populate('sourceUser', 'memberId fullName')
      .populate('package', 'name')
      .sort({ createdAt: -1 })
      .skip(paging.skip)
      .limit(paging.limit)
      .lean(),
    Ledger.countDocuments(q),
  ]);
  res.json(paged(items, total, paging));
}

export async function wallet(req, res) {
  const settings = await getSettings();
  const [summary, kyc] = await Promise.all([walletSummary(req.user._id), Kyc.findOne({ user: req.user._id }).lean()]);
  res.json({
    ...summary,
    rules: settings.withdrawal,
    transferMin: settings.wallet.transferMin,
    deposit: { min: settings.wallet.depositMin, max: settings.wallet.depositMax },
    suspended: req.user.walletSuspended ? { reason: req.user.walletSuspendedReason, at: req.user.walletSuspendedAt } : null,
    kycStatus: kyc?.status || 'not_submitted',
    bank: kyc
      ? { bankName: kyc.bankName, accountHolder: kyc.accountHolder, accountNumber: maskTail(kyc.accountNumber), ifsc: kyc.ifsc }
      : null,
  });
}

export async function withdrawalQuote(req, res) {
  const settings = await getSettings();
  res.json(quote(Number(req.query.amount) || 0, settings));
}

export async function listWithdrawals(req, res) {
  const paging = getPaging(req.query);
  const q = { user: req.user._id };
  const [items, total] = await Promise.all([
    Withdrawal.find(q).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Withdrawal.countDocuments(q),
  ]);
  res.json(paged(items.map((w) => ({ ...w, bank: { ...w.bank, accountNumber: maskTail(w.bank?.accountNumber) } })), total, paging));
}

export async function withdrawalOtp(req, res) {
  res.json(await sendWithdrawalOtp(req.user, req.body.amount));
}

export async function createWithdrawal(req, res) {
  const w = await requestWithdrawal(req.user, req.body, req.ip);
  res.status(201).json({ message: 'Withdrawal request submitted', withdrawal: w });
}

export async function cancelMyWithdrawal(req, res) {
  const w = await cancelWithdrawal(req.user, req.params.id, req.ip);
  res.json({ message: 'Withdrawal cancelled and amount returned to wallet', withdrawal: w });
}

/* ---------- Wallets: statement, transfers, wallet purchases, deposits ---------- */

/** Statement of one wallet with the balance before and after every entry (`all=1` returns up to 5,000 rows for export). */
export async function statement(req, res) {
  const paging = req.query.all ? { page: 1, limit: 5000, skip: 0 } : getPaging(req.query);
  const wallet = req.query.wallet === 'activation' ? 'activation' : 'main';
  const from = parseDayIST(req.query.from);
  const to = parseDayIST(req.query.to);
  const { items, total } = await walletStatement(req.user._id, wallet, { from, to: to && addDays(to, 1), skip: paging.skip, limit: paging.limit });
  res.json({ ...paged(items, total, paging), wallet });
}

export async function memberLookup(req, res) {
  res.json({ member: await lookupMember(req.user, req.query.username) });
}

export async function createTransfer(req, res) {
  const result = await transferFunds(req.user, req.body, req.ip);
  res.status(201).json({
    message: result.self
      ? `₹${result.amount.toLocaleString('en-IN')} moved to your Activation Wallet`
      : `₹${result.amount.toLocaleString('en-IN')} sent to ${result.recipient.fullName}'s Activation Wallet`,
    ...result,
  });
}

/** Transfers sent and received. A transfer between your own wallets is listed once (as sent). */
export async function listTransfers(req, res) {
  const paging = getPaging(req.query);
  const q = {
    user: req.user._id,
    category: req.query.type === 'sent' ? 'transfer_out' : req.query.type === 'received' ? 'transfer_in' : { $in: ['transfer_out', 'transfer_in'] },
    $nor: [{ category: 'transfer_in', counterparty: req.user._id }],
  };
  const [items, total] = await Promise.all([
    Ledger.find(q).populate('counterparty', 'memberId fullName username').sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Ledger.countDocuments(q),
  ]);
  res.json(paged(items, total, paging));
}

export async function walletPurchase(req, res) {
  const result = await purchaseBundle(req.user, req.body, req.ip);
  const self = String(result.payment.user) === String(req.user._id);
  res.status(201).json({
    message: self ? `${result.package} bundle activated` : `${result.package} bundle activated for ${result.member.fullName}`,
    ...result,
  });
}

/** Bundles paid from this member's wallets: their own activation and members they activated (P2P). */
export async function listActivations(req, res) {
  const paging = getPaging(req.query);
  const q = { paidBy: req.user._id, method: 'wallet' };
  const [items, total] = await Promise.all([
    Payment.find(q).populate('user', 'memberId fullName username').populate('package', 'name').sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Payment.countDocuments(q),
  ]);
  res.json(paged(items, total, paging));
}

export async function depositInfo(req, res) {
  const settings = await getSettings();
  const paging = getPaging(req.query);
  const q = { user: req.user._id };
  const [items, total, pending] = await Promise.all([
    Deposit.find(q).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Deposit.countDocuments(q),
    Deposit.aggregate([{ $match: { user: req.user._id, status: 'pending' } }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
  ]);
  res.json({
    ...paged(items, total, paging),
    payment: {
      upiId: settings.payment.upiId,
      payeeName: settings.payment.payeeName,
      qrImage: publicAssetUrl(settings.payment.qrImage),
    },
    rules: { min: settings.wallet.depositMin, max: settings.wallet.depositMax },
    pending: { count: pending[0]?.n || 0, amount: round2(pending[0]?.amount || 0) },
  });
}

export async function createDeposit(req, res) {
  const deposit = await submitDepositSvc(req.user, req.body, req.file, req.ip);
  res.status(201).json({ message: 'Deposit submitted for verification', deposit });
}

/* ---------- Achievements ---------- */

export async function achievements(req, res) {
  const settings = await getSettings();
  const u = await User.findById(req.user._id).lean();
  res.json({ ...badgeProgress(settings, u), history: u.badgeHistory, royalty: settings.royalty });
}

/* ---------- Notifications ---------- */

export async function notifications(req, res) {
  const paging = getPaging(req.query);
  const q = { user: req.user._id };
  const [items, total, unread] = await Promise.all([
    Notification.find(q).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Notification.countDocuments(q),
    Notification.countDocuments({ ...q, read: false }),
  ]);
  res.json({ ...paged(items, total, paging), unread });
}

export async function markNotificationsRead(req, res) {
  const filter = { user: req.user._id, read: false };
  if (req.params.id) filter._id = req.params.id;
  await Notification.updateMany(filter, { $set: { read: true } });
  res.json({ message: 'Marked as read' });
}
