import mongoose from 'mongoose';
import User from '../models/User.js';
import Kyc from '../models/Kyc.js';
import Withdrawal from '../models/Withdrawal.js';
import Ledger from '../models/Ledger.js';
import AppError from '../utils/AppError.js';
import { nextCode } from '../utils/ids.js';
import { pct, round2 } from '../utils/money.js';
import { createEntry, getBalance, getBalances } from './ledgerService.js';
import { withWalletLock, authorizeWalletDebit } from './walletService.js';
import { getSettings } from './settingsService.js';
import { notify } from './notificationService.js';
import { audit } from './auditService.js';

export function quote(amount, settings) {
  const { tdsPercent, adminChargePercent } = settings.withdrawal;
  const tds = pct(amount, tdsPercent);
  const adminCharge = pct(amount, adminChargePercent);
  return { amount: round2(amount), tdsPercent, tds, adminChargePercent, adminCharge, netAmount: round2(amount - tds - adminCharge) };
}

export async function walletSummary(userId) {
  userId = new mongoose.Types.ObjectId(String(userId));
  const [balances, pendingAgg, paidAgg] = await Promise.all([
    getBalances(userId),
    Withdrawal.aggregate([
      { $match: { user: userId, status: { $in: ['pending', 'approved', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Withdrawal.aggregate([
      { $match: { user: userId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' }, net: { $sum: '$netAmount' } } },
    ]),
  ]);
  return {
    // `balance` is the Main Wallet (withdrawable); the Activation Wallet can only buy bundles.
    balance: balances.main,
    activationBalance: balances.activation,
    pendingWithdrawal: round2(pendingAgg[0]?.total || 0),
    totalWithdrawn: round2(paidAgg[0]?.total || 0),
    totalWithdrawnNet: round2(paidAgg[0]?.net || 0),
  };
}

/** Admin wallet freeze / unfreeze. Income keeps accruing while suspended; withdrawals, transfers and wallet payments are blocked. */
export async function setWalletSuspension(admin, userId, { suspended, reason }, ip) {
  reason = String(reason || '').trim();
  if (suspended && !reason) throw new AppError('Please give a reason');
  const user = await User.findOneAndUpdate(
    { _id: userId, role: 'member', walletSuspended: suspended ? { $ne: true } : true },
    suspended
      ? { $set: { walletSuspended: true, walletSuspendedReason: reason, walletSuspendedAt: new Date(), walletSuspendedBy: admin._id } }
      : { $set: { walletSuspended: false }, $unset: { walletSuspendedReason: 1, walletSuspendedAt: 1, walletSuspendedBy: 1 } },
    { returnDocument: 'after' },
  );
  if (!user) throw new AppError(suspended ? 'Member not found or wallet already suspended' : 'Member not found or wallet is not suspended', 409);
  await notify(user._id, {
    title: suspended ? 'Wallet suspended' : 'Wallet reactivated',
    message: suspended
      ? `Your wallet has been suspended by the admin: ${reason}. Your income is safe, but withdrawals, transfers and wallet payments are on hold until it is reactivated.`
      : 'Your wallet has been reactivated. You can withdraw, transfer and pay from your wallets again.',
    type: 'wallet',
    link: '/app/wallet',
    email: true,
  });
  await audit(admin, `wallet.${suspended ? 'suspended' : 'reactivated'}`, { entityType: 'User', entityId: user.memberId, details: { reason: reason || undefined }, ip });
  return user;
}

/** Requests a withdrawal from the Main Wallet. The requested amount is debited immediately (held). */
export async function requestWithdrawal(user, { amount, txnPassword }, ip) {
  const settings = await getSettings();
  const cfg = settings.withdrawal;
  amount = round2(amount);
  if (!(amount > 0)) throw new AppError('Enter a valid amount');
  if (amount < cfg.min) throw new AppError(`Minimum withdrawal is ₹${cfg.min.toLocaleString('en-IN')}`);
  if (cfg.max && amount > cfg.max) throw new AppError(`Maximum withdrawal is ₹${cfg.max.toLocaleString('en-IN')}`);

  await authorizeWalletDebit(user._id, txnPassword);

  const kyc = await Kyc.findOne({ user: user._id }).lean();
  if (cfg.requireKyc && kyc?.status !== 'approved') throw new AppError('Your KYC must be approved before you can withdraw');
  if (!kyc) throw new AppError('Add your bank details through KYC first');

  return withWalletLock(user._id, async () => {
    const now = new Date();
    const balance = await getBalance(user._id, 'main');
    if (amount > balance) throw new AppError(`Insufficient Main Wallet balance. Available: ₹${balance.toLocaleString('en-IN')}`);

    const q = quote(amount, settings);
    const withdrawal = await Withdrawal.create({
      withdrawalId: await nextCode('WD', 'withdrawal'),
      user: user._id,
      ...q,
      bank: { bankName: kyc.bankName, accountHolder: kyc.accountHolder, accountNumber: kyc.accountNumber, ifsc: kyc.ifsc },
      history: [{ status: 'pending', at: now, by: user._id }],
    });
    await createEntry({
      user: user._id,
      direction: 'debit',
      category: 'withdrawal',
      grossAmount: amount,
      charges: 0,
      netAmount: amount,
      withdrawal: withdrawal._id,
      reference: withdrawal.withdrawalId,
      idempotencyKey: `WITHDRAW:${withdrawal._id}`,
      remarks: `Withdrawal request ${withdrawal.withdrawalId} (TDS ₹${q.tds}, admin ₹${q.adminCharge}, net ₹${q.netAmount})`,
    });
    await notify(user._id, {
      title: 'Withdrawal submitted',
      message: `Your withdrawal ${withdrawal.withdrawalId} of ₹${amount.toLocaleString('en-IN')} is pending approval.`,
      type: 'withdrawal',
      link: '/app/withdraw',
    });
    await audit(user, 'withdrawal.requested', { entityType: 'Withdrawal', entityId: withdrawal.withdrawalId, details: q, ip });
    return withdrawal;
  });
}

async function reverse(withdrawal, actorId, reason) {
  await createEntry({
    user: withdrawal.user,
    direction: 'credit',
    category: 'withdrawal_reversal',
    grossAmount: withdrawal.amount,
    withdrawal: withdrawal._id,
    reference: withdrawal.withdrawalId,
    idempotencyKey: `WREV:${withdrawal._id}`,
    remarks: `Reversal of ${withdrawal.withdrawalId}${reason ? `: ${reason}` : ''}`,
    createdBy: actorId,
  });
}

export async function cancelWithdrawal(user, id, ip) {
  const w = await Withdrawal.findOneAndUpdate(
    { _id: id, user: user._id, status: 'pending' },
    { $set: { status: 'cancelled' }, $push: { history: { status: 'cancelled', at: new Date(), by: user._id } } },
    { returnDocument: 'after' },
  );
  if (!w) throw new AppError('Only pending withdrawals can be cancelled', 409);
  await reverse(w, user._id, 'cancelled by member');
  await audit(user, 'withdrawal.cancelled', { entityType: 'Withdrawal', entityId: w.withdrawalId, ip });
  return w;
}

const TRANSITIONS = {
  approved: ['pending'],
  processing: ['pending', 'approved'],
  paid: ['pending', 'approved', 'processing'],
  rejected: ['pending', 'approved', 'processing'],
};

export async function adminUpdateWithdrawal(admin, id, { status, remarks, paymentReference }, ip) {
  if (!TRANSITIONS[status]) throw new AppError('Invalid status');
  if (status === 'paid' && !paymentReference) throw new AppError('Payment reference is required to mark as paid');
  if (status === 'rejected' && !remarks) throw new AppError('Please give a reason for rejection');

  if (status !== 'rejected') {
    const current = await Withdrawal.findById(id).select('user').lean();
    if (current && (await User.exists({ _id: current.user, walletSuspended: true }))) {
      throw new AppError('This member’s wallet is suspended. Reject the withdrawal (refunds the wallet) or reactivate the wallet first.', 409);
    }
  }

  const set = { status, adminRemarks: remarks };
  if (paymentReference) set.paymentReference = paymentReference;
  if (['paid', 'rejected'].includes(status)) {
    set.processedAt = new Date();
    set.processedBy = admin._id;
  }
  const w = await Withdrawal.findOneAndUpdate(
    { _id: id, status: { $in: TRANSITIONS[status] } },
    { $set: set, $push: { history: { status, at: new Date(), by: admin._id, remarks } } },
    { returnDocument: 'after' },
  );
  if (!w) throw new AppError('Withdrawal not found or cannot move to this status', 409);

  if (status === 'rejected') await reverse(w, admin._id, remarks);
  if (status === 'paid') {
    await Ledger.updateOne({ withdrawal: w._id, category: 'withdrawal' }, { $set: { remarks: `Paid: ${w.withdrawalId}, ref ${paymentReference}` } });
  }

  const messages = {
    approved: `Your withdrawal ${w.withdrawalId} has been approved and will be paid soon.`,
    processing: `Your withdrawal ${w.withdrawalId} is being processed.`,
    paid: `₹${w.netAmount.toLocaleString('en-IN')} for withdrawal ${w.withdrawalId} has been paid. Reference: ${paymentReference}.`,
    rejected: `Your withdrawal ${w.withdrawalId} was rejected: ${remarks}. The amount has been returned to your wallet.`,
  };
  await notify(w.user, { title: `Withdrawal ${status}`, message: messages[status], type: 'withdrawal', link: '/app/withdraw', email: true });
  await audit(admin, `withdrawal.${status}`, { entityType: 'Withdrawal', entityId: w.withdrawalId, details: { remarks, paymentReference }, ip });
  return w;
}
