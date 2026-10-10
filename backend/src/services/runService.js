import mongoose from 'mongoose';
import IncomeRun from '../models/IncomeRun.js';
import Ledger from '../models/Ledger.js';
import Payment from '../models/Payment.js';
import Package from '../models/Package.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { createEntry, completeEntry } from './ledgerService.js';
import { getSettings } from './settingsService.js';
import { notify } from './notificationService.js';
import { pct, round2 } from '../utils/money.js';
import {
  startOfWeekIST, addDays, dayKeyIST, parseDayIST, parseMonthIST, addMonthsIST, monthKeyIST,
} from '../utils/dates.js';

const RUN_LABELS = { weekly: 'Weekly Income', monthly_bonus: 'Monthly Bonus', royalty: 'Royalty Income' };

const isEligible = (u) => Boolean(u && u.status === 'active' && u.package);

async function openRun(type, periodKey, periodStart, periodEnd, adminId, trigger = 'manual') {
  if (periodEnd > new Date()) {
    throw new AppError(`This ${type === 'weekly' ? 'week' : 'month'} has not ended yet. Process it after ${periodEnd.toISOString()}.`);
  }
  const settings = await getSettings();
  try {
    return await IncomeRun.create({
      type,
      periodKey,
      periodStart,
      periodEnd,
      generatedBy: adminId,
      trigger,
      settingsVersion: settings.version,
      activeKey: `${type}:${periodKey}`,
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError(`${RUN_LABELS[type]} for ${periodKey} has already been generated.`, 409);
    throw err;
  }
}

async function finalizeRun(run) {
  const [agg] = await Ledger.aggregate([
    { $match: { run: run._id, status: 'pending' } },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$netAmount' } } },
  ]);
  run.itemsCount = agg?.count || 0;
  run.totalAmount = round2(agg?.total || 0);
  await run.save();
  return run;
}

/**
 * Weekly bonus pool for the week [start, end) (Mon–Sun IST).
 *  - Pool = weekly% × the company's approved bundle sales in the week (amount received, or net of GST and
 *    system cost when `poolBasis` is "net").
 *  - A member qualifies with `qualifyingSales` (default 3) direct sales of the same weekly-eligible bundle
 *    (Standard/Premium/Pro) approved in the week. With "only active members receive income" on, they must
 *    also be active with a bundle; the company root account never takes a share.
 *  - Every eligible member gets the same share, rounded down to the paisa; the remainder stays with the company.
 */
export async function weeklyPool(start, end) {
  const settings = await getSettings();
  const { percent, qualifyingSales, poolBasis } = settings.weekly;
  const inWeek = { status: 'approved', verifiedAt: { $gte: start, $lt: end } };

  const [sales] = await Payment.aggregate([
    { $match: inWeek },
    { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' }, net: { $sum: { $ifNull: ['$packageCost', '$amount'] } } } },
  ]);
  const companyIncome = round2(poolBasis === 'net' ? sales?.net || 0 : sales?.amount || 0);
  const amount = pct(companyIncome, percent);

  const packages = await Package.find({ weeklyEligible: true }).select('key name').lean();
  const pkgById = new Map(packages.map((p) => [String(p._id), p]));
  const groups = await Payment.aggregate([
    { $match: { ...inWeek, package: { $in: packages.map((p) => p._id) } } },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'buyer', pipeline: [{ $project: { sponsor: 1 } }] } },
    { $unwind: '$buyer' },
    { $match: { 'buyer.sponsor': { $ne: null } } },
    { $group: { _id: { sponsor: '$buyer.sponsor', package: '$package' }, count: { $sum: 1 } } },
    { $match: { count: { $gte: qualifyingSales } } },
  ]);

  const salesBySponsor = new Map();
  for (const g of groups) {
    const key = String(g._id.sponsor);
    if (!salesBySponsor.has(key)) salesBySponsor.set(key, []);
    salesBySponsor.get(key).push({ package: pkgById.get(String(g._id.package))?.name, count: g.count });
  }
  const users = await User.find({ _id: { $in: [...salesBySponsor.keys()] }, isRoot: { $ne: true } })
    .select('memberId fullName status package walletSuspended')
    .lean();
  const enforce = settings.income.requireActiveBeneficiary;
  const members = users
    .map((u) => ({
      _id: u._id,
      memberId: u.memberId,
      fullName: u.fullName,
      status: u.status,
      hasPackage: Boolean(u.package),
      walletSuspended: Boolean(u.walletSuspended),
      sales: salesBySponsor.get(String(u._id)),
      eligible: !enforce || isEligible(u),
    }))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || String(a.memberId).localeCompare(String(b.memberId)));

  const eligible = members.filter((m) => m.eligible).length;
  // Integer paise so the shares never add up to more than the pool.
  const share = eligible ? Math.floor(Math.round(amount * 100) / eligible) / 100 : 0;
  return {
    percent,
    qualifyingSales,
    basis: poolBasis,
    salesCount: sales?.count || 0,
    companyIncome,
    amount,
    eligible,
    share,
    distributed: round2(share * eligible),
    members,
  };
}

/** Weekly Income: generates the week's pool and one equal pending share per eligible member. */
export async function generateWeekly(weekOf, adminId, { trigger = 'manual' } = {}) {
  const date = parseDayIST(weekOf);
  if (!date) throw new AppError('Invalid week date');
  const start = startOfWeekIST(date);
  const end = addDays(start, 7);
  const periodKey = dayKeyIST(start);
  const run = await openRun('weekly', periodKey, start, end, adminId, trigger);

  const pool = await weeklyPool(start, end);
  run.pool = {
    basis: pool.basis, salesCount: pool.salesCount, companyIncome: pool.companyIncome, percent: pool.percent,
    amount: pool.amount, eligible: pool.eligible, share: pool.share,
  };
  const inr = (n) => `₹${n.toLocaleString('en-IN')}`;
  if (pool.share > 0) {
    for (const m of pool.members) {
      if (!m.eligible) continue;
      await createEntry({
        user: m._id,
        direction: 'credit',
        category: 'weekly',
        grossAmount: pool.share,
        rate: pool.percent,
        basisAmount: pool.companyIncome,
        status: 'pending',
        run: run._id,
        period: periodKey,
        idempotencyKey: `WEEKLY:${periodKey}:${m._id}`,
        remarks: `Equal share of the ${pool.percent}% weekly pool ${inr(pool.amount)} (company sales ${inr(pool.companyIncome)}) among ${pool.eligible} qualified member${pool.eligible === 1 ? '' : 's'} · qualified with ${m.sales.map((x) => `${x.count} ${x.package}`).join(', ')} sales in week of ${periodKey}`,
      });
    }
  }
  return finalizeRun(run);
}

/**
 * Scheduler hook: once a week has closed, generates its weekly run and (when `autoApprove` is on) credits it.
 * Skips a week that already has a run of any status, so a run the admin cancelled is never re-created behind
 * their back. `maxDelayDays` limits start-up catch-up to shortly after the week closed.
 */
export async function autoProcessWeekly({ now = new Date(), maxDelayDays } = {}) {
  const settings = await getSettings();
  if (!settings.weekly.autoProcess) return null;
  const end = startOfWeekIST(now);
  const start = addDays(end, -7);
  if (maxDelayDays !== undefined && now - end > maxDelayDays * 86400000) return null;
  const periodKey = dayKeyIST(start);
  if (await IncomeRun.exists({ type: 'weekly', periodKey })) return null;

  let run;
  try {
    run = await generateWeekly(periodKey, null, { trigger: 'auto' });
  } catch (err) {
    if (err.status === 409) return null; // another instance got there first
    throw err;
  }
  if (settings.weekly.autoApprove) ({ run } = await approveRun(run._id, null));
  return run;
}

/** Monthly Bonus: slab on the member's Active Income credited in the month. Highest slab only. */
export async function generateMonthlyBonus(month, adminId) {
  const start = parseMonthIST(month);
  if (!start) throw new AppError('Invalid month');
  const end = addMonthsIST(start, 1);
  const periodKey = monthKeyIST(start);
  const run = await openRun('monthly_bonus', periodKey, start, end, adminId);

  const settings = await getSettings();
  const { comparator, slabs } = settings.monthlyBonus;
  const ordered = [...slabs].sort((a, b) => b.threshold - a.threshold);
  const meets = (v, t) => (comparator === 'gte' ? v >= t : v > t);

  const totals = await Ledger.aggregate([
    { $match: { category: 'active', direction: 'credit', status: 'completed', completedAt: { $gte: start, $lt: end } } },
    { $group: { _id: '$user', total: { $sum: '$netAmount' } } },
  ]);
  const users = await User.find({ _id: { $in: totals.map((t) => t._id) } }).select('status package').lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  for (const t of totals) {
    const slab = ordered.find((s) => meets(t.total, s.threshold));
    if (!slab) continue;
    const eligible = !settings.income.requireActiveBeneficiary || isEligible(userById.get(String(t._id)));
    await createEntry({
      user: t._id,
      direction: 'credit',
      category: 'monthly_bonus',
      grossAmount: slab.bonus,
      basisAmount: round2(t.total),
      status: eligible ? 'pending' : 'lapsed',
      run: run._id,
      period: periodKey,
      idempotencyKey: `MONTHLY:${periodKey}:${t._id}`,
      remarks: `Active income ₹${round2(t.total).toLocaleString('en-IN')} in ${periodKey} (slab ${comparator === 'gte' ? '≥' : '>'} ₹${slab.threshold.toLocaleString('en-IN')})`,
    });
  }
  return finalizeRun(run);
}

/**
 * Royalty: for members holding a royalty badge (Emerald and above), royalty% × panel income for the month.
 * Panel income = Active + Passive income of the member's whole downline (basis "team") or their own ("own").
 */
export async function generateRoyalty(month, adminId) {
  const start = parseMonthIST(month);
  if (!start) throw new AppError('Invalid month');
  const end = addMonthsIST(start, 1);
  const periodKey = monthKeyIST(start);
  const run = await openRun('royalty', periodKey, start, end, adminId);

  const settings = await getSettings();
  const percentByBadge = new Map(settings.royalty.slabs.map((s) => [s.badgeKey, s.percent]));
  const members = await User.find({ role: 'member', badge: { $in: [...percentByBadge.keys()] } })
    .select('status package badge')
    .lean();

  const incomeMatch = {
    direction: 'credit',
    status: 'completed',
    category: { $in: ['active', 'passive'] },
    completedAt: { $gte: start, $lt: end },
  };

  for (const m of members) {
    const percent = percentByBadge.get(m.badge);
    let basisMatch;
    if (settings.royalty.basis === 'own') {
      basisMatch = { ...incomeMatch, user: m._id };
    } else {
      const downline = await User.find({ ancestors: m._id }).distinct('_id');
      if (!downline.length) continue;
      basisMatch = { ...incomeMatch, user: { $in: downline } };
    }
    const [agg] = await Ledger.aggregate([{ $match: basisMatch }, { $group: { _id: null, total: { $sum: '$netAmount' } } }]);
    const basis = round2(agg?.total || 0);
    const amount = pct(basis, percent);
    if (amount <= 0) continue;
    const eligible = !settings.income.requireActiveBeneficiary || isEligible(m);
    await createEntry({
      user: m._id,
      direction: 'credit',
      category: 'royalty',
      grossAmount: amount,
      rate: percent,
      basisAmount: basis,
      status: eligible ? 'pending' : 'lapsed',
      run: run._id,
      period: periodKey,
      idempotencyKey: `ROYALTY:${periodKey}:${m._id}`,
      remarks: `${percent}% royalty on ${settings.royalty.basis === 'own' ? 'own' : 'team'} income ₹${basis.toLocaleString('en-IN')} for ${periodKey}`,
    });
  }
  return finalizeRun(run);
}

export async function approveRun(runId, adminId) {
  const run = await IncomeRun.findOneAndUpdate(
    { _id: runId, status: 'generated' },
    { $set: { status: 'approved', approvedBy: adminId, approvedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!run) throw new AppError('Run not found or already processed', 409);
  const pending = await Ledger.find({ run: run._id, status: 'pending' }).select('_id').lean();
  let credited = 0;
  for (const { _id } of pending) {
    if (await completeEntry(_id)) credited += 1;
  }
  const users = await Ledger.distinct('user', { run: run._id, status: 'completed' });
  for (const u of users) {
    await notify(u, {
      title: `${RUN_LABELS[run.type]} processed`,
      message: `${RUN_LABELS[run.type]} for ${run.periodKey} has been processed.`,
      type: 'income',
      link: '/app/income',
    });
  }
  return { run, credited };
}

export async function cancelRun(runId, adminId) {
  const run = await IncomeRun.findOneAndUpdate(
    { _id: runId, status: 'generated' },
    { $set: { status: 'cancelled', cancelledBy: adminId, cancelledAt: new Date() }, $unset: { activeKey: 1 } },
    { returnDocument: 'after' },
  );
  if (!run) throw new AppError('Run not found or already processed', 409);
  // Entries of a cancelled run were never credited; removing them lets the period be regenerated.
  await Ledger.deleteMany({ run: run._id, status: { $in: ['pending', 'lapsed'] } });
  return run;
}

export const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));
