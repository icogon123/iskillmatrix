import User from '../models/User.js';
import Package from '../models/Package.js';
import Ledger from '../models/Ledger.js';
import { createEntry, completeEntry } from './ledgerService.js';
import { getSettings } from './settingsService.js';
import { nextMidnightIST } from '../utils/dates.js';

const isEligible = (u) => Boolean(u && u.status === 'active' && u.package);

/**
 * Distributes income for an approved package purchase (unilevel):
 *  - Active Income       → direct sponsor (credited immediately)
 *  - Non-Working Bonus   → direct sponsor (pending, credited at the 12:00 AM run)
 *  - Passive Income      → level 1 = sponsor's sponsor, level 2 = next upline, … (credited immediately)
 * Every entry carries an idempotency key derived from the payment, so re-running is a no-op.
 */
export async function distributePackageIncome(payment, buyer, pkg, oldPkg = null) {
  if (!oldPkg && payment.oldPackage) {
    oldPkg = await Package.findById(payment.oldPackage).lean();
  }
  const settings = await getSettings();
  const upline = buyer.ancestors || [];
  if (!upline.length) return { created: 0 };

  const levelsNeeded = Math.min(upline.length, 1 + (pkg.passiveLevels?.length || 0));
  const uplineIds = upline.slice(0, levelsNeeded);
  const users = await User.find({ _id: { $in: uplineIds } }).select('status package fullName memberId').lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  const enforce = settings.income.requireActiveBeneficiary;

  const statusFor = (beneficiary, normal) => (enforce && !isEligible(beneficiary) ? 'lapsed' : normal);
  const base = { direction: 'credit', sourceUser: buyer._id, payment: payment._id, package: pkg._id };
  const from = `${buyer.fullName} (${buyer.memberId})`;
  let created = 0;

  const sponsorId = uplineIds[0];
  const sponsor = byId.get(String(sponsorId));

  const activePayout = Math.max(0, (pkg.activeIncome || 0) - (oldPkg?.activeIncome || 0));
  if (activePayout > 0) {
    const status = statusFor(sponsor, 'completed');
    const e = await createEntry({
      ...base,
      user: sponsorId,
      category: 'active',
      level: 0,
      grossAmount: activePayout,
      status,
      idempotencyKey: `ACTIVE:${payment._id}`,
      remarks: oldPkg ? `Upgrade to ${pkg.name} (from ${oldPkg.name}) by ${from}` : `Direct sale of ${pkg.name} by ${from}`,
    });
    if (e) created += 1;
  }

  const nonWorkingPayout = Math.max(0, (pkg.nonWorkingBonus || 0) - (oldPkg?.nonWorkingBonus || 0));
  if (nonWorkingPayout > 0) {
    const status = statusFor(sponsor, 'pending');
    const e = await createEntry({
      ...base,
      user: sponsorId,
      category: 'non_working',
      level: 0,
      grossAmount: nonWorkingPayout,
      status,
      scheduledFor: nextMidnightIST(payment.verifiedAt || new Date()),
      idempotencyKey: `NONWORKING:${payment._id}`,
      remarks: oldPkg ? `Bonus on ${pkg.name} upgrade (from ${oldPkg.name}) by ${from}` : `Bonus on ${pkg.name} sale by ${from}`,
    });
    if (e) created += 1;
  }

  for (let i = 0; i < (pkg.passiveLevels || []).length; i += 1) {
    const amount = Math.max(0, (Number(pkg.passiveLevels[i]) || 0) - (Number(oldPkg?.passiveLevels?.[i]) || 0));
    const beneficiaryId = uplineIds[i + 1];
    if (!beneficiaryId) break;
    if (amount <= 0) continue;
    const e = await createEntry({
      ...base,
      user: beneficiaryId,
      category: 'passive',
      level: i + 1,
      grossAmount: amount,
      status: statusFor(byId.get(String(beneficiaryId)), 'completed'),
      idempotencyKey: `PASSIVE:${payment._id}:L${i + 1}`,
      remarks: oldPkg ? `Level ${i + 1} on ${pkg.name} upgrade (from ${oldPkg.name}) by ${from}` : `Level ${i + 1} on ${pkg.name} purchase by ${from}`,
    });
    if (e) created += 1;
  }

  return { created };
}

/** Credits non-working bonuses that are due (or all pending ones when `force`). */
export async function processNonWorking({ force = false, now = new Date() } = {}) {
  const query = { category: 'non_working', status: 'pending' };
  if (!force) query.scheduledFor = { $lte: now };
  const due = await Ledger.find(query).select('_id').lean();
  let credited = 0;
  for (const { _id } of due) {
    if (await completeEntry(_id)) credited += 1;
  }
  return { credited };
}
