import mongoose from 'mongoose';
import { z } from 'zod';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Kyc from '../models/Kyc.js';
import Ledger, { INCOME_CATEGORIES } from '../models/Ledger.js';
import Withdrawal from '../models/Withdrawal.js';
import Deposit from '../models/Deposit.js';
import AppError from '../utils/AppError.js';
import { getPaging, paged, escapeRegex } from '../utils/pagination.js';
import { round2 } from '../utils/money.js';
import { addDays, startOfDayIST, dayKeyIST } from '../utils/dates.js';
import { incomeByCategory, createEntry, getBalance, WALLET_LABELS } from '../services/ledgerService.js';
import { walletSummary, setWalletSuspension } from '../services/withdrawalService.js';
import { withWalletLock } from '../services/walletService.js';
import { teamStats } from '../services/teamService.js';
import { notify } from '../services/notificationService.js';
import { reqAudit } from '../services/auditService.js';
import { sendMail } from '../services/mailService.js';
import { passwordRule } from './validators.js';

const MEMBERS = { role: 'member', isRoot: { $ne: true } };

const profilePatchSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter the full name').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    mobile: z.string().trim().regex(/^\d{10}$/, 'Enter a valid 10-digit mobile number'),
    country: z.string().trim().min(2).max(60),
  })
  .partial()
  .transform((o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v)));

/* ---------- Dashboard ---------- */

export async function dashboard(_req, res) {
  const since = addDays(startOfDayIST(), -13);
  const [
    statusRows, withPackage, packageRows, incomeRows, pendingIncome, withdrawalRows, liabilityRows,
    pendingRegistrations, pendingKyc, pendingPayments, pendingWithdrawals, joinRows, collectionRows,
    recentRegistrations, recentPayments, pendingDeposits, depositRows, methodRows,
  ] = await Promise.all([
    User.aggregate([{ $match: MEMBERS }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    User.countDocuments({ ...MEMBERS, package: { $ne: null } }),
    Payment.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$package',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          gst: { $sum: '$gstAmount' },
          systemCost: { $sum: '$systemCost' },
          packageCost: { $sum: '$packageCost' },
        },
      },
      { $lookup: { from: 'packages', localField: '_id', foreignField: '_id', as: 'pkg' } },
      { $unwind: '$pkg' },
      { $sort: { 'pkg.price': 1 } },
    ]),
    Ledger.aggregate([
      { $match: { direction: 'credit', category: { $in: INCOME_CATEGORIES }, status: { $in: ['completed', 'lapsed'] } } },
      { $group: { _id: { category: '$category', status: '$status' }, total: { $sum: '$netAmount' } } },
    ]),
    Ledger.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: '$category', total: { $sum: '$netAmount' }, n: { $sum: 1 } } }]),
    Withdrawal.aggregate([
      { $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$amount' }, tds: { $sum: '$tds' }, adminCharge: { $sum: '$adminCharge' }, net: { $sum: '$netAmount' } } },
    ]),
    Ledger.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: { wallet: { $ifNull: ['$wallet', 'main'] }, direction: '$direction' }, total: { $sum: '$netAmount' } } },
    ]),
    User.countDocuments({ ...MEMBERS, status: 'pending' }),
    Kyc.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
    Payment.countDocuments({ status: 'pending' }),
    Withdrawal.countDocuments({ status: { $in: ['pending', 'approved', 'processing'] } }),
    User.aggregate([
      { $match: { ...MEMBERS, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, n: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'approved', verifiedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$verifiedAt', timezone: 'Asia/Kolkata' } }, amount: { $sum: '$amount' } } },
    ]),
    User.find({ ...MEMBERS, status: 'pending' }).sort({ createdAt: -1 }).limit(5)
      .select('memberId fullName mobile createdAt selectedPackage sponsor').populate('selectedPackage', 'name').populate('sponsor', 'memberId fullName').lean(),
    Payment.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).populate('user', 'memberId fullName').populate('package', 'name').lean(),
    Deposit.countDocuments({ status: 'pending' }),
    Deposit.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: null, n: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
    Payment.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: { $ifNull: ['$method', 'upi'] }, amount: { $sum: '$amount' } } }]),
  ]);

  const members = Object.fromEntries(statusRows.map((r) => [r._id, r.n]));
  members.total = statusRows.reduce((a, r) => a + r.n, 0);
  members.withPackage = withPackage;

  const income = Object.fromEntries(INCOME_CATEGORIES.map((c) => [c, 0]));
  const lapsed = Object.fromEntries(INCOME_CATEGORIES.map((c) => [c, 0]));
  for (const r of incomeRows) (r._id.status === 'completed' ? income : lapsed)[r._id.category] = round2(r.total);
  const incomePaid = round2(Object.values(income).reduce((a, b) => a + b, 0));

  const packages = packageRows.map((r) => ({
    key: r.pkg.key, name: r.pkg.name, count: r.count, amount: r.amount, gst: round2(r.gst), systemCost: round2(r.systemCost), packageCost: round2(r.packageCost),
  }));
  const sum = (k) => round2(packages.reduce((a, p) => a + p[k], 0));
  const w = Object.fromEntries(withdrawalRows.map((r) => [r._id, r]));
  const liability = { main: 0, activation: 0 };
  for (const r of liabilityRows) liability[r._id.wallet] += r._id.direction === 'credit' ? r.total : -r.total;
  const byMethod = Object.fromEntries(methodRows.map((r) => [r._id, round2(r.amount)]));

  const joinMap = new Map(joinRows.map((r) => [r._id, r.n]));
  const colMap = new Map(collectionRows.map((r) => [r._id, r.amount]));
  const daily = Array.from({ length: 14 }, (_, i) => {
    const key = dayKeyIST(addDays(since, i));
    return { date: key, joinings: joinMap.get(key) || 0, collection: colMap.get(key) || 0 };
  });

  res.json({
    members,
    packages,
    finance: {
      collection: sum('amount'),
      gst: sum('gst'),
      systemCost: sum('systemCost'),
      packageCost: sum('packageCost'),
      incomePaid,
      income,
      lapsed,
      pendingIncome: Object.fromEntries(pendingIncome.map((r) => [r._id, { total: round2(r.total), count: r.n }])),
      walletLiability: round2(liability.main + liability.activation),
      wallets: { main: round2(liability.main), activation: round2(liability.activation) },
      // Bundle sales by how they were paid; wallet sales are funded by deposits or by income already credited.
      salesByMethod: { upi: byMethod.upi || 0, wallet: byMethod.wallet || 0 },
      deposits: { count: depositRows[0]?.n || 0, amount: round2(depositRows[0]?.amount || 0) },
      withdrawals: {
        requested: round2(withdrawalRows.reduce((a, r) => a + (['rejected', 'cancelled'].includes(r._id) ? 0 : r.amount), 0)),
        paid: round2(w.paid?.amount || 0),
        paidNet: round2(w.paid?.net || 0),
        tds: round2(w.paid?.tds || 0),
        adminCharge: round2(w.paid?.adminCharge || 0),
        byStatus: Object.fromEntries(withdrawalRows.map((r) => [r._id, { count: r.n, amount: round2(r.amount) }])),
      },
    },
    queues: { pendingRegistrations, pendingKyc, pendingPayments, pendingWithdrawals, pendingDeposits },
    daily,
    recentRegistrations,
    recentPayments,
  });
}

/* ---------- Registrations ---------- */

export async function listRegistrations(req, res) {
  const paging = getPaging(req.query);
  const q = { ...MEMBERS, status: req.query.status || 'pending' };
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    q.$or = [{ fullName: rx }, { memberId: rx }, { username: rx }, { mobile: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(q).populate('sponsor', 'memberId fullName').populate('selectedPackage', 'name price')
      .sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    User.countDocuments(q),
  ]);
  res.json(paged(items, total, paging));
}

export async function approveRegistration(req, res) {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'member', status: 'pending' },
    { $set: { status: 'active', approvedAt: new Date(), approvedBy: req.user._id }, $unset: { statusReason: 1 } },
    { returnDocument: 'after' },
  );
  if (!user) throw new AppError('Registration not found or already processed', 409);
  await notify(user._id, {
    title: 'Welcome! Your account is approved',
    message: 'Your registration has been approved. Complete your KYC and activate your course bundle to start learning and earning.',
    type: 'account',
    link: '/app/activate',
    email: true,
  });
  if (user.sponsor) {
    await notify(user.sponsor, { title: 'Referral approved', message: `${user.fullName} (${user.memberId}) is now an approved member of your team.`, type: 'team', link: '/app/team' });
  }
  await reqAudit(req, 'registration.approved', { entityType: 'User', entityId: user.memberId });
  res.json({ message: `${user.fullName} approved`, user });
}

export async function rejectRegistration(req, res) {
  const reason = String(req.body.reason || '').trim();
  if (!reason) throw new AppError('Please give a reason for rejection');
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'member', status: 'pending' },
    { $set: { status: 'rejected', statusReason: reason, approvedBy: req.user._id } },
    { returnDocument: 'after' },
  );
  if (!user) throw new AppError('Registration not found or already processed', 409);
  await sendMail({
    to: user.email,
    subject: 'AroviaSkillTech: Registration update',
    text: `Hi ${user.fullName},\n\nYour registration (${user.memberId}) was not approved.\nReason: ${reason}\n\nTeam AroviaSkillTech`,
  });
  await reqAudit(req, 'registration.rejected', { entityType: 'User', entityId: user.memberId, details: { reason } });
  res.json({ message: `${user.fullName} rejected`, user });
}

/* ---------- Members ---------- */

export async function listMembers(req, res) {
  const paging = getPaging(req.query);
  const q = { role: 'member' };
  if (req.query.status) q.status = req.query.status;
  else q.status = { $nin: ['pending', 'rejected'] };
  if (req.query.package === 'none') q.package = null;
  else if (req.query.package) q.package = req.query.package;
  if (req.query.kyc) q.kycStatus = req.query.kyc;
  if (req.query.badge) q.badge = req.query.badge;
  if (req.query.wallet === 'suspended') q.walletSuspended = true;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    q.$or = [{ fullName: rx }, { memberId: rx }, { username: rx }, { mobile: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(q).populate('sponsor', 'memberId fullName').populate('package', 'name key')
      .sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    User.countDocuments(q),
  ]);
  res.json(paged(items, total, paging));
}

export async function memberDetail(req, res) {
  const user = await User.findOne({ _id: req.params.id, role: 'member' })
    .populate('sponsor', 'memberId fullName mobile')
    .populate('package', 'name key price')
    .populate('selectedPackage', 'name key price')
    .populate('approvedBy', 'fullName username')
    .populate('walletSuspendedBy', 'fullName')
    .lean();
  if (!user) throw new AppError('Member not found', 404);
  const [kyc, wallet, income, team, payments, withdrawals, ledger, deposits] = await Promise.all([
    Kyc.findOne({ user: user._id }).lean(),
    walletSummary(user._id),
    incomeByCategory(user._id),
    teamStats(user._id),
    Payment.find({ $or: [{ user: user._id }, { paidBy: user._id }] }).populate('package', 'name').populate('user paidBy', 'memberId fullName')
      .sort({ createdAt: -1 }).lean(),
    Withdrawal.find({ user: user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Ledger.find({ user: user._id }).populate('sourceUser counterparty', 'memberId fullName').sort({ createdAt: -1 }).limit(50).lean(),
    Deposit.find({ user: user._id }).populate('verifiedBy', 'fullName').sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  const { password, txnPassword, tokenVersion, resetTokenHash, resetTokenExpires, ancestors, ...profile } = user;
  res.json({ user: profile, kyc, wallet, income, team, payments, withdrawals, ledger, deposits });
}

export async function updateMemberStatus(req, res) {
  const { status, reason } = req.body;
  if (!['active', 'inactive', 'suspended'].includes(status)) throw new AppError('Invalid status');
  if (status !== 'active' && !reason) throw new AppError('Please give a reason');
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'member', isRoot: { $ne: true }, status: { $in: ['active', 'inactive', 'suspended'] } },
    { $set: { status, statusReason: status === 'active' ? undefined : reason } },
    { returnDocument: 'after' },
  );
  if (!user) throw new AppError('Member not found or status cannot be changed', 409);
  await reqAudit(req, `member.${status === 'active' ? 'activated' : status}`, { entityType: 'User', entityId: user.memberId, details: { reason } });
  res.json({ message: `Member is now ${status}`, user });
}

export async function updateMemberProfile(req, res) {
  const patch = profilePatchSchema.parse(req.body);
  if (!Object.keys(patch).length) throw new AppError('Nothing to update');
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'member' }, { $set: patch }, { returnDocument: 'after' });
  if (!user) throw new AppError('Member not found', 404);
  await reqAudit(req, 'member.profile_updated', { entityType: 'User', entityId: user.memberId, details: patch });
  res.json({ message: 'Profile updated', user });
}

export async function resetMemberPassword(req, res) {
  const password = passwordRule.parse(req.body.password);
  const user = await User.findOne({ _id: req.params.id, role: 'member' }).select('+tokenVersion');
  if (!user) throw new AppError('Member not found', 404);
  user.password = await User.hash(password);
  user.tokenVersion += 1;
  await user.save();
  await reqAudit(req, 'member.password_reset', { entityType: 'User', entityId: user.memberId });
  res.json({ message: 'Password reset' });
}

export async function updateWalletStatus(req, res) {
  const suspended = req.body.suspended === true;
  const user = await setWalletSuspension(req.user, req.params.id, { suspended, reason: req.body.reason }, req.ip);
  res.json({ message: suspended ? 'Wallet suspended' : 'Wallet reactivated', user });
}

export async function adjustWallet(req, res) {
  const { type, remarks } = req.body;
  const wallet = req.body.wallet === 'activation' ? 'activation' : 'main';
  const amount = round2(req.body.amount);
  if (!['credit', 'debit'].includes(type)) throw new AppError('Choose credit or debit');
  if (!(amount > 0)) throw new AppError('Enter a valid amount');
  if (!remarks) throw new AppError('Remarks are required for wallet adjustments');
  const user = await User.findOne({ _id: req.params.id, role: 'member' });
  if (!user) throw new AppError('Member not found', 404);
  const post = async () => {
    // Debits are checked under the same wallet lock as withdrawals and transfers, so they cannot overdraw a wallet.
    if (type === 'debit' && amount > (await getBalance(user._id, wallet))) throw new AppError(`Debit exceeds the member’s ${WALLET_LABELS[wallet]} balance`);
    return createEntry({
      user: user._id,
      wallet,
      direction: type,
      category: type === 'credit' ? 'adjustment_credit' : 'adjustment_debit',
      grossAmount: amount,
      remarks,
      createdBy: req.user._id,
      idempotencyKey: `ADJ:${new mongoose.Types.ObjectId()}`,
    });
  };
  const entry = type === 'debit' ? await withWalletLock(user._id, post) : await post();
  await notify(user._id, {
    title: `Wallet ${type === 'credit' ? 'credited' : 'debited'} by admin`,
    message: `₹${amount.toLocaleString('en-IN')} ${type === 'credit' ? 'credited to' : 'debited from'} your ${WALLET_LABELS[wallet]}. ${remarks}`,
    type: 'wallet',
    link: '/app/wallet',
  });
  await reqAudit(req, `wallet.adjustment_${type}`, { entityType: 'User', entityId: user.memberId, details: { amount, wallet, remarks, txnId: entry.txnId } });
  res.json({ message: 'Wallet adjusted', entry });
}
