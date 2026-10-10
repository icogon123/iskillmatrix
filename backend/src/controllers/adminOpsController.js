import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Kyc from '../models/Kyc.js';
import Ledger from '../models/Ledger.js';
import Withdrawal from '../models/Withdrawal.js';
import IncomeRun from '../models/IncomeRun.js';
import Deposit from '../models/Deposit.js';
import AppError from '../utils/AppError.js';
import { getPaging, paged, escapeRegex } from '../utils/pagination.js';
import { round2 } from '../utils/money.js';
import { startOfWeekIST, addDays, dayKeyIST, startOfMonthIST, addMonthsIST, monthKeyIST, parseDayIST } from '../utils/dates.js';
import { approvePayment as approvePaymentSvc, rejectPayment as rejectPaymentSvc } from '../services/paymentService.js';
import { adminUpdateWithdrawal } from '../services/withdrawalService.js';
import { approveDeposit as approveDepositSvc, rejectDeposit as rejectDepositSvc } from '../services/depositService.js';
import { processNonWorking } from '../services/incomeEngine.js';
import { generateWeekly, generateMonthlyBonus, generateRoyalty, approveRun, cancelRun, weeklyPool } from '../services/runService.js';
import { getSettings } from '../services/settingsService.js';
import { notify } from '../services/notificationService.js';
import { reqAudit } from '../services/auditService.js';

/** Builds a filter on `user` from a free-text member search. */
async function memberFilter(search) {
  if (!search) return {};
  const rx = new RegExp(escapeRegex(search), 'i');
  const ids = await User.find({ $or: [{ fullName: rx }, { memberId: rx }, { username: rx }, { mobile: rx }] }).distinct('_id');
  return { user: { $in: ids } };
}

/** Free-text search over the member (name, ID, username, mobile) or the payment's UTR / reference ID. */
async function withReferenceSearch(search, idField) {
  const text = String(search || '').trim();
  if (!text) return {};
  const rx = new RegExp(escapeRegex(text), 'i');
  const ids = await User.find({ $or: [{ fullName: rx }, { memberId: rx }, { username: rx }, { mobile: rx }] }).distinct('_id');
  return { $or: [{ user: { $in: ids } }, { utr: rx }, { [idField]: rx }] };
}

/* ---------- KYC ---------- */

const digits = (v) => String(v || '').replace(/\D/g, '');

/** Compares the Aadhaar in the KYC with the one given at registration (null when registration had none). */
export const aadhaarCheck = (kyc, user) => ({
  registrationAadhaar: user?.aadhaar || null,
  aadhaarMatch: user?.aadhaar ? digits(user.aadhaar) === digits(kyc.aadhaarNumber) : null,
});

export async function listKyc(req, res) {
  const paging = getPaging(req.query);
  const status = req.query.status || 'pending';
  const q = {
    ...(status === 'pending' ? { status: { $in: ['submitted', 'under_review'] } } : status === 'all' ? {} : { status }),
    ...(await memberFilter(req.query.search)),
  };
  const [items, total] = await Promise.all([
    Kyc.find(q).populate('user', 'memberId fullName mobile email aadhaar').populate('reviewedBy', 'fullName')
      .sort({ submittedAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Kyc.countDocuments(q),
  ]);
  res.json(paged(items.map((k) => ({ ...k, ...aadhaarCheck(k, k.user) })), total, paging));
}

export async function reviewKyc(req, res) {
  const { action, reason } = req.body;
  const map = { review: ['under_review', ['submitted']], approve: ['approved', ['submitted', 'under_review']], reject: ['rejected', ['submitted', 'under_review']] };
  if (!map[action]) throw new AppError('Invalid action');
  if (action === 'reject' && !reason) throw new AppError('Please give a reason for rejection');
  const [status, from] = map[action];
  const kyc = await Kyc.findOneAndUpdate(
    { _id: req.params.id, status: { $in: from } },
    { $set: { status, rejectionReason: action === 'reject' ? reason : undefined, reviewedAt: new Date(), reviewedBy: req.user._id } },
    { returnDocument: 'after' },
  );
  if (!kyc) throw new AppError('KYC not found or already processed', 409);
  const owner = await User.findByIdAndUpdate(kyc.user, { $set: { kycStatus: status } }).select('aadhaar').lean();
  const { aadhaarMatch } = aadhaarCheck(kyc, owner);
  if (action !== 'review') {
    await notify(kyc.user, {
      title: `KYC ${status}`,
      message: action === 'approve' ? 'Your KYC is approved. You can now request withdrawals.' : `Your KYC was rejected: ${reason}. Please re-submit.`,
      type: 'kyc',
      link: '/app/kyc',
      email: true,
    });
  }
  await reqAudit(req, `kyc.${status}`, { entityType: 'Kyc', entityId: kyc._id, details: { reason, aadhaarMatch } });
  const warning = action === 'approve' && aadhaarMatch === false ? 'Approved although the Aadhaar number differs from the one given at registration.' : undefined;
  res.json({ message: `KYC ${status.replace('_', ' ')}`, warning, kyc });
}

/* ---------- Payments ---------- */

export async function listPayments(req, res) {
  const paging = getPaging(req.query);
  const q = { ...(req.query.status && req.query.status !== 'all' ? { status: req.query.status } : {}), ...(await withReferenceSearch(req.query.search, 'paymentId')) };
  const [items, total] = await Promise.all([
    Payment.find(q).populate('user', 'memberId fullName mobile sponsor').populate('package', 'name price').populate('verifiedBy', 'fullName')
      .populate('paidBy', 'memberId fullName username')
      .sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Payment.countDocuments(q),
  ]);
  res.json(paged(items, total, paging));
}

export async function approvePayment(req, res) {
  const payment = await approvePaymentSvc(req.user, req.params.id, req.body.remarks, req.ip);
  res.json({ message: 'Payment approved and bundle activated', payment });
}

export async function rejectPayment(req, res) {
  const payment = await rejectPaymentSvc(req.user, req.params.id, String(req.body.reason || '').trim(), req.ip);
  res.json({ message: 'Payment rejected', payment });
}

/* ---------- Fund deposits ---------- */

export async function listDeposits(req, res) {
  const paging = getPaging(req.query);
  const q = { ...(req.query.status && req.query.status !== 'all' ? { status: req.query.status } : {}), ...(await withReferenceSearch(req.query.search, 'depositId')) };
  const [items, total, totals] = await Promise.all([
    Deposit.find(q).populate('user', 'memberId fullName mobile').populate('verifiedBy', 'fullName')
      .sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Deposit.countDocuments(q),
    Deposit.aggregate([{ $match: q }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
  ]);
  res.json({ ...paged(items, total, paging), totals: { amount: round2(totals[0]?.amount || 0) } });
}

export async function approveDeposit(req, res) {
  const deposit = await approveDepositSvc(req.user, req.params.id, req.body.remarks, req.ip);
  res.json({ message: 'Deposit approved and credited to the Activation Wallet', deposit });
}

export async function rejectDeposit(req, res) {
  const deposit = await rejectDepositSvc(req.user, req.params.id, String(req.body.reason || '').trim(), req.ip);
  res.json({ message: 'Deposit rejected', deposit });
}

/* ---------- Withdrawals ---------- */

export async function listWithdrawals(req, res) {
  const paging = getPaging(req.query);
  const status = req.query.status || 'open';
  const q = {
    ...(status === 'open' ? { status: { $in: ['pending', 'approved', 'processing'] } } : status === 'all' ? {} : { status }),
    ...(await memberFilter(req.query.search)),
  };
  const [items, total, totals] = await Promise.all([
    Withdrawal.find(q).populate('user', 'memberId fullName mobile walletSuspended').populate('processedBy', 'fullName')
      .sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    Withdrawal.countDocuments(q),
    Withdrawal.aggregate([{ $match: q }, { $group: { _id: null, amount: { $sum: '$amount' }, net: { $sum: '$netAmount' } } }]),
  ]);
  res.json({ ...paged(items, total, paging), totals: { amount: round2(totals[0]?.amount || 0), net: round2(totals[0]?.net || 0) } });
}

export async function updateWithdrawal(req, res) {
  const w = await adminUpdateWithdrawal(req.user, req.params.id, req.body, req.ip);
  res.json({ message: `Withdrawal ${w.status}`, withdrawal: w });
}

/* ---------- Income processing ---------- */

export async function processingOverview(_req, res) {
  const now = new Date();
  const [nonWorking, due, runs] = await Promise.all([
    Ledger.aggregate([{ $match: { category: 'non_working', status: 'pending' } }, { $group: { _id: null, n: { $sum: 1 }, total: { $sum: '$netAmount' } } }]),
    Ledger.countDocuments({ category: 'non_working', status: 'pending', scheduledFor: { $lte: now } }),
    IncomeRun.find().sort({ createdAt: -1 }).limit(50).populate('generatedBy approvedBy', 'fullName').lean(),
  ]);
  const lastWeek = addDays(startOfWeekIST(now), -7);
  const lastMonth = addMonthsIST(startOfMonthIST(now), -1);
  res.json({
    nonWorking: { pending: nonWorking[0]?.n || 0, total: round2(nonWorking[0]?.total || 0), due },
    runs,
    suggestions: { week: dayKeyIST(lastWeek), month: monthKeyIST(lastMonth) },
  });
}

/** Live weekly pool for any week (default: the current one): company sales, the pool, who qualifies and each share. */
export async function weeklyPoolPreview(req, res) {
  const day = req.query.week ? parseDayIST(req.query.week) : new Date();
  if (!day) throw new AppError('Invalid week date');
  const start = startOfWeekIST(day);
  const end = addDays(start, 7);
  const [pool, run, settings] = await Promise.all([
    weeklyPool(start, end),
    IncomeRun.findOne({ type: 'weekly', periodKey: dayKeyIST(start), status: { $ne: 'cancelled' } })
      .select('status itemsCount totalAmount trigger createdAt approvedAt').lean(),
    getSettings(),
  ]);
  res.json({
    week: dayKeyIST(start),
    weekStart: start,
    weekEnd: end,
    closed: end <= new Date(),
    run,
    auto: { process: settings.weekly.autoProcess, approve: settings.weekly.autoApprove },
    ...pool,
  });
}

export async function runNonWorking(req, res) {
  const result = await processNonWorking({ force: Boolean(req.body.force) });
  await reqAudit(req, 'income.non_working_processed', { details: result });
  res.json({ message: `${result.credited} non-working bonus entries credited`, ...result });
}

const GENERATORS = { weekly: generateWeekly, monthly_bonus: generateMonthlyBonus, royalty: generateRoyalty };

export async function generateRun(req, res) {
  const gen = GENERATORS[req.params.type];
  if (!gen) throw new AppError('Unknown run type');
  const period = req.body.period;
  if (!period) throw new AppError(req.params.type === 'weekly' ? 'Choose a week' : 'Choose a month');
  const run = await gen(period, req.user._id);
  await reqAudit(req, `income.${req.params.type}_generated`, { entityType: 'IncomeRun', entityId: run._id, details: { period: run.periodKey, items: run.itemsCount, total: run.totalAmount } });
  res.status(201).json({ message: `Generated ${run.itemsCount} entries for ${run.periodKey}`, run });
}

export async function runDetail(req, res) {
  const run = await IncomeRun.findById(req.params.id).populate('generatedBy approvedBy cancelledBy', 'fullName').lean();
  if (!run) throw new AppError('Run not found', 404);
  const entries = await Ledger.find({ run: run._id }).populate('user', 'memberId fullName badge').populate('package', 'name').sort({ netAmount: -1 }).lean();
  res.json({ run, entries });
}

export async function approveIncomeRun(req, res) {
  const { run, credited } = await approveRun(req.params.id, req.user._id);
  await reqAudit(req, `income.${run.type}_approved`, { entityType: 'IncomeRun', entityId: run._id, details: { period: run.periodKey, credited } });
  res.json({ message: `${credited} entries credited`, run });
}

export async function cancelIncomeRun(req, res) {
  const run = await cancelRun(req.params.id, req.user._id);
  await reqAudit(req, `income.${run.type}_cancelled`, { entityType: 'IncomeRun', entityId: run._id, details: { period: run.periodKey } });
  res.json({ message: 'Run cancelled', run });
}
