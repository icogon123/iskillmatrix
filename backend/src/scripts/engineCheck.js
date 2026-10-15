/**
 * End-to-end check of the income engine against a throwaway in-memory MongoDB.
 * Run: npm run test:engine
 */
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Package from '../models/Package.js';
import Payment from '../models/Payment.js';
import Ledger from '../models/Ledger.js';
import Kyc from '../models/Kyc.js';
import IncomeRun from '../models/IncomeRun.js';
import Deposit from '../models/Deposit.js';
import Otp from '../models/Otp.js';
import { ensureBaseData } from './baseData.js';
import env from '../config/env.js';
import { nextMemberId } from '../utils/ids.js';
import { approvePayment, rejectPayment } from '../services/paymentService.js';
import { distributePackageIncome, processNonWorking } from '../services/incomeEngine.js';
import { getBalance, getBalances, createEntry, walletStatement } from '../services/ledgerService.js';
import { transferFunds, purchaseBundle } from '../services/walletService.js';
import { approveDeposit, rejectDeposit, utrInUse } from '../services/depositService.js';
import { requestWithdrawal as requestWithdrawalRaw, sendWithdrawalOtp, adminUpdateWithdrawal, cancelWithdrawal, setWalletSuspension } from '../services/withdrawalService.js';
import { generateWeekly, generateMonthlyBonus, generateRoyalty, approveRun, cancelRun, weeklyPool, autoProcessWeekly } from '../services/runService.js';
import { addDays, startOfWeekIST, dayKeyIST, startOfMonthIST, addMonthsIST, monthKeyIST } from '../utils/dates.js';

// Throwaway database and test-only admin password: this check never touches the real MONGODB_URI.
env.admin.password = 'EngineCheck#2026';
env.smtp.host = ''; // never email the test members through the real SMTP account

// Withdrawals need the email OTP. With mail off, sendWithdrawalOtp hands the code back as `devCode`.
// When the request is expected to fail before the OTP step (KYC, password, balance, suspension) no code is requested.
async function requestWithdrawal(user, body, ip) {
  let otp;
  await Otp.deleteMany({}); // skip the 60s resend cooldown between checks
  try {
    otp = (await sendWithdrawalOtp(user, body.amount)).devCode;
  } catch { /* the request itself reports the reason */ }
  return requestWithdrawalRaw(user, { ...body, otp }, ip);
}

const mem = await MongoMemoryServer.create();
await mongoose.connect(mem.getUri('engine-check'));
await ensureBaseData({ log: false });

const admin = await User.findOne({ role: 'admin' });
const root = await User.findOne({ isRoot: true });
const pkgs = Object.fromEntries((await Package.find().lean()).map((p) => [p.key, p]));
let utr = 100000;

async function addMember(name, sponsor, { status = 'active' } = {}) {
  return User.create({
    memberId: await nextMemberId(),
    username: name.toLowerCase().replace(/\W/g, '') + utr,
    fullName: name,
    email: `${name.toLowerCase()}@test.dev`,
    password: await User.hash('Test@1234'),
    txnPassword: await User.hash('Txn@1234'),
    sponsor: sponsor._id,
    ancestors: [sponsor._id, ...sponsor.ancestors],
    depth: sponsor.depth + 1,
    status,
  });
}

async function buy(user, key) {
  utr += 1;
  const p = pkgs[key];
  const payment = await Payment.create({
    paymentId: `PAYT${utr}`, user: user._id, package: p._id, amount: p.price, paymentDate: new Date(), utr: `UTR${utr}`,
    userLock: String(user._id), utrLock: `UTR${utr}`,
  });
  await approvePayment(admin, payment._id, 'ok');
  return Payment.findById(payment._id);
}

const credited = async (user, category) => {
  const rows = await Ledger.find({ user: user._id, category, status: 'completed' }).lean();
  return rows.reduce((a, r) => a + r.netAmount, 0);
};

let passed = 0;
const check = async (label, fn) => {
  await fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
};

console.log('Income engine checks');

// Chain: root → A1 → … → A7 (all Pro) → buyer B
const chain = [];
let parent = root;
for (let i = 1; i <= 7; i += 1) {
  const u = await addMember(`A${i}`, parent);
  await buy(u, 'pro');
  chain.push(u);
  parent = u;
}
const [A1, A2, A3, A4, A5, A6, A7] = chain;

await check('Pro purchase pays sponsor ₹7,000 active income', async () => {
  // A7's purchase paid A6 active income
  assert.equal(await credited(A6, 'active'), 7000);
});

const before = {};
for (const u of chain) before[u.memberId] = await credited(u, 'passive');
const B = await addMember('Buyer', A7);
const bPayment = await buy(B, 'standard');

await check('Standard purchase: direct sponsor gets ₹2,000 active income', async () => {
  const rows = await Ledger.find({ payment: bPayment._id, category: 'active' }).lean();
  assert.equal(rows.length, 1);
  assert.equal(String(rows[0].user), String(A7._id));
  assert.equal(rows[0].netAmount, 2000);
});

await check('Standard passive: L1=sponsor’s sponsor ₹300, then ₹50, ₹100, ₹150, ₹25', async () => {
  const rows = await Ledger.find({ payment: bPayment._id, category: 'passive' }).sort({ level: 1 }).lean();
  assert.deepEqual(rows.map((r) => [String(r.user), r.level, r.netAmount]), [
    [String(A6._id), 1, 300], [String(A5._id), 2, 50], [String(A4._id), 3, 100], [String(A3._id), 4, 150], [String(A2._id), 5, 25],
  ]);
  assert.equal(await Ledger.countDocuments({ payment: bPayment._id, user: A1._id }), 0);
});

await check('Non-working ₹200 goes to direct sponsor as pending until the 12 AM run', async () => {
  const nw = await Ledger.findOne({ payment: bPayment._id, category: 'non_working' }).lean();
  assert.equal(String(nw.user), String(A7._id));
  assert.equal(nw.status, 'pending');
  assert.equal(nw.netAmount, 200);
  assert.ok(nw.scheduledFor > new Date());
  const { credited: n } = await processNonWorking({ now: addDays(new Date(), 1) });
  assert.ok(n >= 1);
  assert.equal((await Ledger.findById(nw._id)).status, 'completed');
});

await check('Re-running distribution for the same payment creates no duplicates', async () => {
  const buyer = await User.findById(B._id);
  const res = await distributePackageIncome(bPayment, buyer, pkgs.standard);
  assert.equal(res.created, 0);
});

await check('Approving an already-approved payment is refused', async () => {
  await assert.rejects(() => approvePayment(admin, bPayment._id, 'again'), /already processed/);
});

await check('A second live payment for the same member is blocked', async () => {
  await assert.rejects(() => Payment.create({
    paymentId: 'PAYDUP', user: B._id, package: pkgs.pro._id, amount: 1, paymentDate: new Date(), utr: 'UTRDUP', userLock: String(B._id), utrLock: 'UTRDUP',
  }), /duplicate key/);
});

await check('Inactive upline income is recorded as lapsed (not credited)', async () => {
  await User.updateOne({ _id: A5._id }, { status: 'suspended' });
  const C = await addMember('C', A7);
  const p = await buy(C, 'starter');
  const l1 = await Ledger.findOne({ payment: p._id, category: 'passive', level: 1 }).lean();
  assert.equal(String(l1.user), String(A6._id));
  assert.equal(l1.status, 'completed');
  await User.updateOne({ _id: A5._id }, { status: 'active' });
  const D = await addMember('D', A6);
  await User.updateOne({ _id: A5._id }, { status: 'suspended' });
  const pd = await buy(D, 'starter');
  const lapsed = await Ledger.findOne({ payment: pd._id, category: 'passive', level: 1 }).lean();
  assert.equal(String(lapsed.user), String(A5._id));
  assert.equal(lapsed.status, 'lapsed');
  await User.updateOne({ _id: A5._id }, { status: 'active' });
});

await check('Rejected payment frees the member to pay again', async () => {
  const E = await addMember('E', A7);
  const pay = await Payment.create({ paymentId: 'PAYREJ', user: E._id, package: pkgs.basic._id, amount: 3000, paymentDate: new Date(), utr: 'UTRREJ1', userLock: String(E._id), utrLock: 'UTRREJ1' });
  await rejectPayment(admin, pay._id, 'blurred screenshot');
  await Payment.create({ paymentId: 'PAYREJ2', user: E._id, package: pkgs.basic._id, amount: 3000, paymentDate: new Date(), utr: 'UTRREJ1', userLock: String(E._id), utrLock: 'UTRREJ1' });
});

await check('Badge awarded from lifetime Active + Passive earnings (A6 ≥ ₹5,000 → Bronze or higher)', async () => {
  const a6 = await User.findById(A6._id).lean();
  assert.ok(a6.lifetimeEarnings >= 5000);
  assert.ok(a6.badge);
  assert.equal(a6.badgeHistory.length >= 1, true);
});

await check('Withdrawal ₹1,000: TDS ₹20 + admin ₹50 → net ₹930; balance debited; KYC + txn password enforced', async () => {
  const bal = await getBalance(A6._id);
  await assert.rejects(() => requestWithdrawal(A6, { amount: 1000, txnPassword: 'Txn@1234' }), /KYC/);
  await Kyc.create({ user: A6._id, aadhaarNumber: '123412341234', panNumber: 'ABCDE1234F', bankName: 'SBI', accountHolder: 'A6', accountNumber: '1234567890', ifsc: 'SBIN0001234', status: 'approved' });
  await assert.rejects(() => requestWithdrawal(A6, { amount: 1000, txnPassword: 'wrong' }), /transaction password/);
  await assert.rejects(() => requestWithdrawal(A6, { amount: bal + 1, txnPassword: 'Txn@1234' }), /Insufficient|Maximum/);
  const w = await requestWithdrawal(A6, { amount: 1000, txnPassword: 'Txn@1234' });
  assert.equal(w.tds, 20);
  assert.equal(w.adminCharge, 50);
  assert.equal(w.netAmount, 930);
  assert.equal(await getBalance(A6._id), bal - 1000);
  await adminUpdateWithdrawal(admin, w._id, { status: 'rejected', remarks: 'test' });
  assert.equal(await getBalance(A6._id), bal);
  const w2 = await requestWithdrawal(A6, { amount: 1000, txnPassword: 'Txn@1234' });
  await cancelWithdrawal(A6, w2._id);
  assert.equal(await getBalance(A6._id), bal);
  const w3 = await requestWithdrawal(A6, { amount: 1000, txnPassword: 'Txn@1234' });
  await assert.rejects(() => adminUpdateWithdrawal(admin, w3._id, { status: 'paid' }), /reference/);
  await adminUpdateWithdrawal(admin, w3._id, { status: 'paid', paymentReference: 'NEFT123' });
  assert.equal(await getBalance(A6._id), bal - 1000);
});

await check('Concurrent withdrawals cannot overdraw the wallet', async () => {
  const bal = await getBalance(A6._id);
  const amt = Math.floor(bal * 0.6);
  await Otp.deleteMany({});
  const { devCode: otp } = await sendWithdrawalOtp(A6, amt); // one code shared by all three: it can only be used once too
  const results = await Promise.allSettled([1, 2, 3].map(() => requestWithdrawalRaw(A6, { amount: amt, txnPassword: 'Txn@1234', otp })));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.ok((await getBalance(A6._id)) >= 0);
});

// Weekly pool: company sales last week × 5%, shared equally by members with ≥ 3 same-bundle direct sales.
//   X: 7 Standard (₹35,000) → qualifies   Z: 3 Premium (₹33,000) → qualifies
//   Q: 3 Standard (₹15,000) but inactive → excluded   T: 2 Pro (₹37,200) → not enough sales
//   Company sales ₹1,20,200 → pool ₹6,010 → 2 eligible → ₹3,005 each
const lastWeek = addDays(startOfWeekIST(), -7);
const X = await addMember('X', root);
await buy(X, 'standard');
const wkPayments = [];
const directSales = async (sponsor, key, n, prefix) => {
  for (let i = 0; i < n; i += 1) wkPayments.push((await buy(await addMember(`${prefix}${i}`, sponsor), key))._id);
};
await directSales(X, 'standard', 7, 'W');
const Z = await addMember('Z', root);
await buy(Z, 'premium');
await directSales(Z, 'premium', 3, 'V');
const Q = await addMember('Q', root);
await buy(Q, 'standard');
await directSales(Q, 'standard', 3, 'U');
await User.updateOne({ _id: Q._id }, { status: 'inactive' });
const T = await addMember('T', root);
await buy(T, 'standard');
await directSales(T, 'pro', 2, 'S');
await Payment.updateMany({ _id: { $in: wkPayments } }, { verifiedAt: addDays(lastWeek, 2) });

await check('Weekly pool: 5% of company sales ₹1,20,200 = ₹6,010 shared equally by 2 qualified members → ₹3,005 each', async () => {
  const preview = await weeklyPool(lastWeek, addDays(lastWeek, 7));
  assert.equal(preview.companyIncome, 120200);
  assert.equal(preview.amount, 6010);
  assert.equal(preview.eligible, 2);
  assert.equal(preview.share, 3005);
  assert.deepEqual(preview.members.map((m) => [m.fullName, m.eligible]), [['X', true], ['Z', true], ['Q', false]]);

  const run = await generateWeekly(dayKeyIST(lastWeek), admin._id);
  assert.equal(run.pool.amount, 6010);
  assert.equal(run.itemsCount, 2);
  assert.equal(run.totalAmount, 6010);
  const entries = await Ledger.find({ run: run._id }).lean();
  assert.deepEqual(entries.map((e) => String(e.user)).sort(), [String(X._id), String(Z._id)].sort());
  assert.ok(entries.every((e) => e.netAmount === 3005 && e.status === 'pending'));
  await assert.rejects(() => generateWeekly(dayKeyIST(lastWeek), admin._id), /already been generated/);
  await cancelRun(run._id, admin._id);
  assert.equal(await autoProcessWeekly(), null, 'auto-processing must not re-create a week the admin cancelled');
  const run2 = await generateWeekly(dayKeyIST(lastWeek), admin._id);
  await approveRun(run2._id, admin._id);
  assert.equal(await credited(X, 'weekly'), 3005);
  assert.equal(await credited(Z, 'weekly'), 3005);
  assert.equal(await credited(Q, 'weekly'), 0);
});

await check('Weekly pool shares round down to the paisa and never exceed the pool', async () => {
  // Same week, 3 eligible: ₹6,010 / 3 = ₹2,003.33 each, ₹0.01 stays with the company.
  await User.updateOne({ _id: Q._id }, { status: 'active' });
  const p = await weeklyPool(lastWeek, addDays(lastWeek, 7));
  await User.updateOne({ _id: Q._id }, { status: 'inactive' });
  assert.equal(p.eligible, 3);
  assert.equal(p.share, 2003.33);
  assert.equal(p.distributed, 6009.99);
});

await check('Weekly auto-processing generates and credits a closed week once (no qualifiers → empty run)', async () => {
  const now = addDays(startOfWeekIST(), -7); // pretend it is the Monday after the week before last
  const run = await autoProcessWeekly({ now });
  assert.equal(run.trigger, 'auto');
  assert.equal(run.status, 'approved');
  assert.equal(run.periodKey, dayKeyIST(addDays(now, -7)));
  assert.equal(await autoProcessWeekly({ now }), null);
  const older = addDays(now, -7);
  assert.equal(await autoProcessWeekly({ now: addDays(older, 3), maxDelayDays: 2 }), null, 'start-up catch-up is limited to 2 days');
  assert.equal(await IncomeRun.exists({ type: 'weekly', periodKey: dayKeyIST(addDays(older, -7)) }), null);
});

await check('Weekly run for the current (unfinished) week is refused', async () => {
  await assert.rejects(() => generateWeekly(dayKeyIST(new Date()), admin._id), /not ended/);
});

await check('Suspended wallet: withdrawals blocked; open withdrawals can only be rejected (refund still reaches the wallet)', async () => {
  const w = await requestWithdrawal(A6, { amount: 600, txnPassword: 'Txn@1234' });
  await assert.rejects(() => setWalletSuspension(admin, A6._id, { suspended: true }), /reason/);
  await setWalletSuspension(admin, A6._id, { suspended: true, reason: 'Under review' });
  await assert.rejects(() => setWalletSuspension(admin, A6._id, { suspended: true, reason: 'again' }), /already suspended/);
  await assert.rejects(() => requestWithdrawal(A6, { amount: 600, txnPassword: 'Txn@1234' }), /suspended: Under review/);
  await assert.rejects(() => adminUpdateWithdrawal(admin, w._id, { status: 'paid', paymentReference: 'NEFT9' }), /suspended/);
  const before = await getBalance(A6._id);
  await adminUpdateWithdrawal(admin, w._id, { status: 'rejected', remarks: 'wallet on hold' });
  assert.equal(await getBalance(A6._id), before + 600);
  await setWalletSuspension(admin, A6._id, { suspended: false });
  const w2 = await requestWithdrawal(A6, { amount: 600, txnPassword: 'Txn@1234' });
  assert.equal(w2.status, 'pending');
});

// Monthly bonus: give X > ₹20,000 active income completed last month
const lastMonth = addMonthsIST(startOfMonthIST(), -1);
await check('Monthly bonus: active income ₹21,000 in month → ₹1,500; exactly ₹50,000 stays in ₹1,500 slab (strict >)', async () => {
  const Y = await addMember('Y', root);
  await buy(Y, 'pro');
  await Ledger.updateMany({ user: X._id, category: 'active' }, { completedAt: addDays(lastMonth, 3) });
  await Ledger.create({ txnId: 'TXNMB1', user: X._id, direction: 'credit', category: 'active', grossAmount: 7000, netAmount: 7000, status: 'completed', completedAt: addDays(lastMonth, 4) });
  // X: 7 × 2000 + 7000 = 21,000
  await Ledger.create({ txnId: 'TXNMB2', user: Y._id, direction: 'credit', category: 'active', grossAmount: 50000, netAmount: 50000, status: 'completed', completedAt: addDays(lastMonth, 5) });
  const run = await generateMonthlyBonus(monthKeyIST(lastMonth), admin._id);
  const x = await Ledger.findOne({ run: run._id, user: X._id }).lean();
  const y = await Ledger.findOne({ run: run._id, user: Y._id }).lean();
  assert.equal(x.basisAmount, 21000);
  assert.equal(x.netAmount, 1500);
  assert.equal(y.netAmount, 1500);
  await approveRun(run._id, admin._id);
  assert.equal(await credited(X, 'monthly_bonus'), 1500);
});

await check('Royalty: Emerald member gets 5% of downline Active + Passive income for the month', async () => {
  await User.updateOne({ _id: X._id }, { badge: 'emerald' });
  const [agg] = await Ledger.aggregate([
    { $match: { user: { $in: await User.find({ ancestors: X._id }).distinct('_id') }, category: { $in: ['active', 'passive'] }, status: 'completed', completedAt: { $gte: lastMonth, $lt: addMonthsIST(lastMonth, 1) } } },
    { $group: { _id: null, t: { $sum: '$netAmount' } } },
  ]);
  await Ledger.create({ txnId: 'TXNRY1', user: (await User.findOne({ sponsor: X._id }))._id, direction: 'credit', category: 'active', grossAmount: 10000, netAmount: 10000, status: 'completed', completedAt: addDays(lastMonth, 6) });
  const expectedBasis = (agg?.t || 0) + 10000;
  const run = await generateRoyalty(monthKeyIST(lastMonth), admin._id);
  const e = await Ledger.findOne({ run: run._id, user: X._id }).lean();
  assert.equal(e.basisAmount, expectedBasis);
  assert.equal(e.netAmount, Math.round(expectedBasis * 5) / 100);
});

// Two wallets: P (Pro, under root) gets ₹50,000 of admin credit in the Main Wallet.
//   root → P → P1 → P2 (P1, P2 without bundles) and R on another branch under root.
console.log('\nWallet checks');
const TXN = 'Txn@1234';
const P = await addMember('P', root);
await buy(P, 'pro');
const P1 = await addMember('P1', P);
const P2 = await addMember('P2', P1);
const R = await addMember('R', root);
await createEntry({ user: P._id, direction: 'credit', category: 'adjustment_credit', grossAmount: 50000, idempotencyKey: 'ADJ:WALLETCHECK', remarks: 'test funds' });

await check('Income and admin credits land in the Main Wallet; the Activation Wallet starts empty', async () => {
  assert.deepEqual(await getBalances(P._id), { main: 50000, activation: 0 });
  assert.equal(await getBalance(P._id), 50000);
});

await check('Main → own Activation Wallet transfer; minimum, balance and transaction password enforced', async () => {
  await assert.rejects(() => transferFunds(P, { target: 'self', amount: 50, txnPassword: TXN }), /Minimum transfer/);
  await assert.rejects(() => transferFunds(P, { target: 'self', amount: 5000, txnPassword: 'wrong' }), /transaction password/);
  await assert.rejects(() => transferFunds(P, { target: 'self', amount: 60000, txnPassword: TXN }), /Insufficient Main Wallet/);
  const r = await transferFunds(P, { target: 'self', amount: 5000, txnPassword: TXN });
  assert.equal(r.self, true);
  assert.deepEqual(await getBalances(P._id), { main: 45000, activation: 5000 });
});

await check('Transfers to upline or downline land in their Activation Wallet; other branches and the company account are refused', async () => {
  await transferFunds(P, { target: 'member', username: P2.username, amount: 3000, txnPassword: TXN });
  assert.deepEqual(await getBalances(P2._id), { main: 0, activation: 3000 });
  await createEntry({ user: P1._id, direction: 'credit', category: 'adjustment_credit', grossAmount: 2000, idempotencyKey: 'ADJ:WALLETCHECK:P1', remarks: 'test' });
  await transferFunds(P1, { target: 'member', username: P.username, amount: 1000, txnPassword: TXN }); // to upline
  assert.deepEqual(await getBalances(P._id), { main: 42000, activation: 6000 });
  await assert.rejects(() => transferFunds(P, { target: 'member', username: R.username, amount: 500, txnPassword: TXN }), /upline or your downline/);
  await assert.rejects(() => transferFunds(P, { target: 'member', username: root.username, amount: 500, txnPassword: TXN }), /company account/);
  await assert.rejects(() => transferFunds(P, { target: 'member', username: P.username, amount: 500, txnPassword: TXN }), /own Activation Wallet/);
  await assert.rejects(() => transferFunds(P, { target: 'member', username: 'nobody_here', amount: 500, txnPassword: TXN }), /No member found/);
  // The Activation Wallet itself can't be transferred: P2 has ₹3,000 there and nothing in Main.
  await assert.rejects(() => transferFunds(P2, { target: 'member', username: P1.username, amount: 500, txnPassword: TXN }), /Insufficient Main Wallet/);
});

await check('Activation Wallet money cannot be withdrawn', async () => {
  await Kyc.create({ user: P2._id, aadhaarNumber: '123412341234', panNumber: 'ABCDE1234F', bankName: 'SBI', accountHolder: 'P2', accountNumber: '1234567890', ifsc: 'SBIN0001234', status: 'approved' });
  await assert.rejects(() => requestWithdrawal(P2, { amount: 1000, txnPassword: TXN }), /Insufficient Main Wallet/);
});

await check('Main Wallet buys Pro for a downline: bundle active at once, income paid as for an approved UPI payment', async () => {
  const { payment } = await purchaseBundle(P, { username: P1.username, packageId: pkgs.pro._id, wallet: 'main', txnPassword: TXN });
  assert.equal(payment.method, 'wallet');
  assert.equal(payment.wallet, 'main');
  assert.equal(payment.status, 'approved');
  assert.equal(String(payment.paidBy), String(P._id));
  assert.equal(String(payment.user), String(P1._id));
  assert.equal(String((await User.findById(P1._id)).package), String(pkgs.pro._id));
  const debit = await Ledger.findOne({ payment: payment._id, category: 'bundle_purchase' }).lean();
  assert.equal(debit.netAmount, 18600);
  assert.equal(String(debit.counterparty), String(P1._id));
  // P paid ₹18,600 and, as P1's sponsor, earned ₹7,000 active income (+ ₹1,000 non-working, pending).
  assert.deepEqual(await getBalances(P._id), { main: 42000 - 18600 + 7000, activation: 6000 });
  assert.equal((await Ledger.findOne({ payment: payment._id, category: 'non_working' })).status, 'pending');
});

await check('P2P activation from the Activation Wallet; active members, pending UPI payments and short balances are refused', async () => {
  await purchaseBundle(P, { username: P2.username, packageId: pkgs.standard._id, wallet: 'activation', txnPassword: TXN });
  assert.equal((await getBalances(P._id)).activation, 1000);
  assert.equal(await credited(P1, 'active'), 2000);
  await assert.rejects(() => purchaseBundle(P, { username: P2.username, packageId: pkgs.starter._id, wallet: 'main', txnPassword: TXN }), /already has an active bundle/);
  const W1 = await addMember('W1', P);
  await Payment.create({ paymentId: 'PAYPEND', user: W1._id, package: pkgs.basic._id, amount: 3000, paymentDate: new Date(), utr: 'UTRPEND1', userLock: String(W1._id), utrLock: 'UTRPEND1' });
  await assert.rejects(() => purchaseBundle(P, { username: W1.username, packageId: pkgs.basic._id, wallet: 'main', txnPassword: TXN }), /under verification/);
  const W2 = await addMember('W2', P);
  await assert.rejects(() => purchaseBundle(P, { username: W2.username, packageId: pkgs.starter._id, wallet: 'activation', txnPassword: TXN }), /Insufficient Activation Wallet/);
  const pending = await addMember('Pend', P, { status: 'pending' });
  await assert.rejects(() => purchaseBundle(P, { username: pending.username, packageId: pkgs.starter._id, wallet: 'main', txnPassword: TXN }), /not approved/);
});

await check('A member activates their own bundle from their Activation Wallet', async () => {
  const S1 = await addMember('S1', P);
  await transferFunds(P, { target: 'member', username: S1.username, amount: 1300, txnPassword: TXN });
  const { payment } = await purchaseBundle(S1, { packageId: pkgs.starter._id, wallet: 'activation', txnPassword: TXN });
  assert.equal(String(payment.user), String(S1._id));
  assert.equal(String((await User.findById(S1._id)).package), String(pkgs.starter._id));
  assert.deepEqual(await getBalances(S1._id), { main: 0, activation: 0 });
  const s1 = await User.findById(S1._id);
  await assert.rejects(() => purchaseBundle(s1, { packageId: pkgs.basic._id, wallet: 'main', txnPassword: TXN }), /already active/);
});

await check('Deposits credit the Activation Wallet once; rejection frees the UTR; UTRs are shared with bundle payments', async () => {
  const before = await getBalances(P2._id);
  const d = await Deposit.create({ depositId: 'DEPT1', user: P2._id, amount: 2500, paymentDate: new Date(), utr: 'UTRDEP1', utrLock: 'UTRDEP1' });
  await approveDeposit(admin, d._id, 'ok');
  assert.deepEqual(await getBalances(P2._id), { main: before.main, activation: before.activation + 2500 });
  await assert.rejects(() => approveDeposit(admin, d._id, 'again'), /already processed/);
  assert.equal(await utrInUse('UTRDEP1'), true);
  assert.equal(await utrInUse('UTRPEND1'), true, 'a UTR on a live bundle payment cannot be used for a deposit');
  const d2 = await Deposit.create({ depositId: 'DEPT2', user: P2._id, amount: 900, paymentDate: new Date(), utr: 'UTRDEP2', utrLock: 'UTRDEP2' });
  await assert.rejects(() => rejectDeposit(admin, d2._id, ''), /reason/);
  await rejectDeposit(admin, d2._id, 'not received');
  assert.equal(await utrInUse('UTRDEP2'), false);
  assert.equal((await getBalances(P2._id)).activation, before.activation + 2500);
});

await check('Suspended wallet blocks transfers and wallet purchases', async () => {
  await setWalletSuspension(admin, P._id, { suspended: true, reason: 'Audit' });
  await assert.rejects(() => transferFunds(P, { target: 'self', amount: 500, txnPassword: TXN }), /suspended: Audit/);
  const W3 = await addMember('W3', P);
  await assert.rejects(() => purchaseBundle(P, { username: W3.username, packageId: pkgs.starter._id, wallet: 'main', txnPassword: TXN }), /suspended/);
  await setWalletSuspension(admin, P._id, { suspended: false });
});

await check('Concurrent transfers cannot overdraw the Main Wallet', async () => {
  const bal = await getBalance(P._id, 'main');
  const amt = Math.floor(bal * 0.6);
  const results = await Promise.allSettled([1, 2, 3].map(() => transferFunds(P, { target: 'self', amount: amt, txnPassword: TXN })));
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(await getBalance(P._id, 'main'), Math.round((bal - amt) * 100) / 100);
});

await check('Wallet statement: balance before/after each entry chains to the current balance, on every page', async () => {
  for (const wallet of ['main', 'activation']) {
    const { items, total } = await walletStatement(P._id, wallet, { limit: 200 });
    assert.equal(items.length, total);
    assert.equal(items[0].balanceAfter, await getBalance(P._id, wallet));
    for (let i = 0; i < items.length - 1; i += 1) assert.equal(items[i].balanceBefore, items[i + 1].balanceAfter);
    assert.equal(items.at(-1).balanceBefore, 0);
    const page2 = await walletStatement(P._id, wallet, { skip: 2, limit: 2 });
    assert.equal(page2.items[0].balanceAfter, items[2].balanceAfter);
  }
});

await check('Ledger-derived balance equals credits − debits for every member, per wallet', async () => {
  const members = await User.find({ role: 'member' }).select('_id').lean();
  for (const m of members) {
    const rows = await Ledger.find({ user: m._id, status: 'completed' }).lean();
    const sum = (w) => Math.round(rows.filter((r) => (r.wallet || 'main') === w).reduce((a, r) => a + (r.direction === 'credit' ? r.netAmount : -r.netAmount), 0) * 100) / 100;
    assert.deepEqual(await getBalances(m._id), { main: sum('main'), activation: sum('activation') });
    assert.equal(await getBalance(m._id, 'activation'), sum('activation'));
  }
});

console.log(`\nAll ${passed} checks passed.`);
await mongoose.disconnect();
await mem.stop();
