import mongoose from 'mongoose';
import Ledger, { INCOME_CATEGORIES, walletMatch } from '../models/Ledger.js';
import { txnId } from '../utils/ids.js';
import { round2 } from '../utils/money.js';
import { getSettings } from './settingsService.js';
import { addLifetimeEarnings } from './badgeService.js';
import { notify } from './notificationService.js';

export const CATEGORY_LABELS = {
  active: 'Active Income',
  passive: 'Passive Income',
  weekly: 'Weekly Income',
  monthly_bonus: 'Monthly Bonus',
  non_working: 'Non-Working Income',
  royalty: 'Royalty Income',
  withdrawal: 'Withdrawal',
  withdrawal_reversal: 'Withdrawal Reversal',
  adjustment_credit: 'Admin Credit',
  adjustment_debit: 'Admin Debit',
  deposit: 'Fund Deposit',
  transfer_out: 'Transfer Sent',
  transfer_in: 'Transfer Received',
  bundle_purchase: 'Bundle Purchase',
};

export const WALLET_LABELS = { main: 'Main Wallet', activation: 'Activation Wallet' };

const isDuplicateKey = (err) => err?.code === 11000;

/**
 * Creates a ledger entry. Returns null when an entry with the same idempotency key already
 * exists, which is what makes package activation, bonuses and payouts safe to retry.
 */
export async function createEntry(data, { silent = false } = {}) {
  const settings = await getSettings();
  const gross = round2(data.grossAmount);
  const charges = round2(data.charges || 0);
  const status = data.status || 'completed';
  try {
    const entry = await Ledger.create({
      ...data,
      txnId: txnId(),
      grossAmount: gross,
      charges,
      netAmount: round2(data.netAmount ?? gross - charges),
      status,
      completedAt: status === 'completed' ? new Date() : undefined,
      settingsVersion: settings.version,
    });
    if (status === 'completed') await afterCompleted(entry, { silent });
    return entry;
  } catch (err) {
    if (isDuplicateKey(err) && err.keyPattern?.idempotencyKey) return null;
    throw err;
  }
}

/** Moves a pending entry to completed exactly once (atomic), then runs post-credit hooks. */
export async function completeEntry(entryId, { silent = false } = {}) {
  const entry = await Ledger.findOneAndUpdate(
    { _id: entryId, status: 'pending' },
    { $set: { status: 'completed', completedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (entry) await afterCompleted(entry, { silent });
  return entry;
}

async function afterCompleted(entry, { silent }) {
  if (entry.direction !== 'credit' || !INCOME_CATEGORIES.includes(entry.category)) return;
  const settings = await getSettings();
  if (settings.badgeQualifyingCategories.includes(entry.category)) {
    await addLifetimeEarnings(entry.user, entry.netAmount);
  }
  if (!silent) {
    await notify(entry.user, {
      title: `${CATEGORY_LABELS[entry.category]} credited`,
      message: `₹${entry.netAmount.toLocaleString('en-IN')} has been credited to your Main Wallet.${entry.remarks ? ` ${entry.remarks}` : ''}`,
      type: 'income',
      link: '/app/income',
    });
  }
}

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const signedAmount = { $cond: [{ $eq: ['$direction', 'credit'] }, '$netAmount', { $multiply: ['$netAmount', -1] }] };

/** Wallet balance derived from the ledger: completed credits minus completed debits of that wallet. */
export async function getBalance(userId, wallet = 'main') {
  const [row] = await Ledger.aggregate([
    { $match: { user: oid(userId), status: 'completed', ...walletMatch(wallet) } },
    {
      $group: {
        _id: null,
        credit: { $sum: { $cond: [{ $eq: ['$direction', 'credit'] }, '$netAmount', 0] } },
        debit: { $sum: { $cond: [{ $eq: ['$direction', 'debit'] }, '$netAmount', 0] } },
      },
    },
  ]);
  return round2((row?.credit || 0) - (row?.debit || 0));
}

/** Both wallet balances in one pass: { main, activation }. */
export async function getBalances(userId) {
  const rows = await Ledger.aggregate([
    { $match: { user: oid(userId), status: 'completed' } },
    { $group: { _id: { $ifNull: ['$wallet', 'main'] }, total: { $sum: signedAmount } } },
  ]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r.total]));
  return { main: round2(by.main || 0), activation: round2(by.activation || 0) };
}

/**
 * Statement of one wallet: completed entries, newest first, each with the wallet balance before and after it.
 * The running balance is worked out from the ledger itself (sum of everything up to the newest row on the page),
 * so it is right for any page and date range without storing balances on the entries.
 */
export async function walletStatement(userId, wallet, { from, to, skip = 0, limit = 20 } = {}) {
  const base = { user: oid(userId), status: 'completed', ...walletMatch(wallet) };
  const q = { ...base };
  if (from || to) q.completedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
  const [items, total] = await Promise.all([
    Ledger.find(q)
      .populate('counterparty', 'memberId fullName username')
      .populate('sourceUser', 'memberId fullName')
      .populate('package', 'name')
      .sort({ completedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Ledger.countDocuments(q),
  ]);
  if (!items.length) return { items, total };

  const top = items[0];
  const [row] = await Ledger.aggregate([
    { $match: { ...base, $or: [{ completedAt: { $lt: top.completedAt } }, { completedAt: top.completedAt, _id: { $lte: top._id } }] } },
    { $group: { _id: null, total: { $sum: signedAmount } } },
  ]);
  let after = round2(row?.total || 0);
  return {
    items: items.map((e) => {
      const before = round2(after - (e.direction === 'credit' ? e.netAmount : -e.netAmount));
      const out = { ...e, balanceBefore: before, balanceAfter: after };
      after = before;
      return out;
    }),
    total,
  };
}

/** Completed income per category (+ pending) for one member, optionally within a date range. */
export async function incomeByCategory(userId, { from, to } = {}) {
  const match = { user: oid(userId), direction: 'credit', category: { $in: INCOME_CATEGORIES } };
  const rows = await Ledger.aggregate([
    { $match: { ...match, status: { $in: ['completed', 'pending'] } } },
    ...(from || to
      ? [{ $match: { $expr: { $and: [
          ...(from ? [{ $gte: [{ $ifNull: ['$completedAt', '$createdAt'] }, from] }] : []),
          ...(to ? [{ $lt: [{ $ifNull: ['$completedAt', '$createdAt'] }, to] }] : []),
        ] } } }]
      : []),
    { $group: { _id: { category: '$category', status: '$status' }, total: { $sum: '$netAmount' } } },
  ]);
  const result = Object.fromEntries(INCOME_CATEGORIES.map((c) => [c, 0]));
  const pending = Object.fromEntries(INCOME_CATEGORIES.map((c) => [c, 0]));
  for (const r of rows) {
    if (r._id.status === 'completed') result[r._id.category] = round2(r.total);
    else pending[r._id.category] = round2(r.total);
  }
  const total = round2(Object.values(result).reduce((a, b) => a + b, 0));
  const pendingTotal = round2(Object.values(pending).reduce((a, b) => a + b, 0));
  return { ...result, total, pending, pendingTotal };
}

/** Sum of completed income credited in [from, to). */
export async function incomeBetween(userId, from, to) {
  const [row] = await Ledger.aggregate([
    {
      $match: {
        user: oid(userId),
        direction: 'credit',
        status: 'completed',
        category: { $in: INCOME_CATEGORIES },
        completedAt: { $gte: from, $lt: to },
      },
    },
    { $group: { _id: null, total: { $sum: '$netAmount' } } },
  ]);
  return round2(row?.total || 0);
}
