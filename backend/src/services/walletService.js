import User from '../models/User.js';
import Package from '../models/Package.js';
import Payment from '../models/Payment.js';
import { WALLETS } from '../models/Ledger.js';
import AppError from '../utils/AppError.js';
import { nextCode } from '../utils/ids.js';
import { round2 } from '../utils/money.js';
import { createEntry, getBalance, WALLET_LABELS } from './ledgerService.js';
import { getSettings } from './settingsService.js';
import { priceBreakdown } from './paymentService.js';
import { distributePackageIncome } from './incomeEngine.js';
import { notify } from './notificationService.js';
import { audit } from './auditService.js';

const LOCK_MS = 30_000;
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

/**
 * Runs `fn` while holding the member's wallet lock, so two simultaneous debits (withdrawal, transfer, wallet
 * purchase) cannot both pass the same balance check. A lock older than 30 s is treated as abandoned.
 */
export async function withWalletLock(userId, fn) {
  const now = new Date();
  const locked = await User.findOneAndUpdate(
    { _id: userId, $or: [{ walletLock: null }, { walletLock: { $lt: new Date(now - LOCK_MS) } }] },
    { $set: { walletLock: now } },
  );
  if (!locked) throw new AppError('Another wallet transaction is in progress. Please try again.', 409);
  try {
    return await fn();
  } finally {
    await User.updateOne({ _id: userId, walletLock: now }, { $set: { walletLock: null } });
  }
}

export const suspendedMessage = (u) =>
  `Your wallet is suspended${u.walletSuspendedReason ? `: ${u.walletSuspendedReason}` : ''}. Withdrawals, transfers and wallet payments are on hold — please contact support.`;

/** Checks the member may move money out of their wallets: wallet not suspended and the transaction password is right. */
export async function authorizeWalletDebit(userId, txnPassword) {
  const full = await User.findById(userId).select('+txnPassword');
  if (!full) throw new AppError('Member not found', 404);
  if (full.walletSuspended) throw new AppError(suspendedMessage(full), 403);
  if (!(await full.checkTxnPassword(txnPassword || ''))) throw new AppError('Incorrect transaction password', 401);
  return full;
}

const isSame = (a, b) => String(a) === String(b);

/** How `other` sits relative to `me` in the sponsor tree: self, upline, downline, or null (another branch). */
export function relationTo(me, other) {
  if (isSame(me._id, other._id)) return 'self';
  if ((me.ancestors || []).some((id) => isSame(id, other._id))) return 'upline';
  if ((other.ancestors || []).some((id) => isSame(id, me._id))) return 'downline';
  return null;
}

export async function findMemberByUsername(username) {
  const u = String(username || '').trim().toLowerCase().replace(/^@/, '');
  if (!u) return null;
  return User.findOne({ username: u, role: 'member' })
    .select('memberId username fullName status package ancestors isRoot avatar')
    .populate('package', 'name')
    .lean();
}

/** What the member can do with another member, for the confirmation shown before a transfer or P2P activation. */
export async function lookupMember(viewer, username) {
  const m = await findMemberByUsername(username);
  if (!m) throw new AppError('No member found with this username', 404);
  const relation = relationTo(viewer, m);
  const approved = m.status === 'active';
  return {
    username: m.username,
    memberId: m.memberId,
    fullName: m.fullName,
    avatar: m.avatar,
    status: m.status,
    bundle: m.package?.name || null,
    relation,
    canReceiveTransfer: approved && !m.isRoot && (relation === 'upline' || relation === 'downline'),
    canActivate: approved && !m.package,
  };
}

/**
 * Moves money out of the sender's Main Wallet. `target: 'self'` tops up their own Activation Wallet; `target: 'member'`
 * sends it to an upline or downline member (by username), always into the receiver's Activation Wallet.
 */
export async function transferFunds(sender, { target, username, amount, txnPassword, remarks }, ip) {
  const settings = await getSettings();
  amount = round2(amount);
  if (!(amount > 0)) throw new AppError('Enter a valid amount');
  if (amount < settings.wallet.transferMin) throw new AppError(`Minimum transfer is ${inr(settings.wallet.transferMin)}`);
  const note = String(remarks || '').trim().slice(0, 120);

  let recipient = sender;
  if (target === 'member') {
    recipient = await findMemberByUsername(username);
    if (!recipient) throw new AppError('No member found with this username', 404);
    const relation = relationTo(sender, recipient);
    if (relation === 'self') throw new AppError('To move money into your own Activation Wallet, choose “My Activation Wallet”');
    if (!relation) throw new AppError('You can only transfer to members in your upline or your downline team');
    if (recipient.isRoot) throw new AppError('Transfers to the company account are not allowed');
    if (recipient.status !== 'active') throw new AppError(`${recipient.fullName}'s account is not active`);
  } else if (target !== 'self') {
    throw new AppError('Choose where to transfer the money');
  }
  const self = isSame(recipient._id, sender._id);

  await authorizeWalletDebit(sender._id, txnPassword);
  return withWalletLock(sender._id, async () => {
    const balance = await getBalance(sender._id, 'main');
    if (amount > balance) throw new AppError(`Insufficient Main Wallet balance. Available: ${inr(balance)}`);

    const reference = await nextCode('TRF', 'transfer');
    const to = self ? 'your Activation Wallet' : `${recipient.fullName} (${recipient.username})`;
    const from = self ? 'your Main Wallet' : `${sender.fullName} (${sender.username})`;
    const suffix = note ? ` · ${note}` : '';
    await createEntry({
      user: sender._id,
      wallet: 'main',
      direction: 'debit',
      category: 'transfer_out',
      grossAmount: amount,
      counterparty: recipient._id,
      reference,
      idempotencyKey: `TRF:${reference}:OUT`,
      remarks: `Transfer to ${to}${suffix}`,
    });
    await createEntry({
      user: recipient._id,
      wallet: 'activation',
      direction: 'credit',
      category: 'transfer_in',
      grossAmount: amount,
      counterparty: sender._id,
      reference,
      idempotencyKey: `TRF:${reference}:IN`,
      remarks: `Received from ${from}${suffix}`,
    });
    if (!self) {
      await notify(recipient._id, {
        title: 'Funds received',
        message: `${inr(amount)} from ${sender.fullName} (${sender.username}) is now in your Activation Wallet. Use it to activate a course bundle.${suffix}`,
        type: 'wallet',
        link: '/app/wallet',
      });
    }
    await audit(sender, 'wallet.transfer', {
      entityType: 'Transfer',
      entityId: reference,
      details: { to: self ? 'own activation wallet' : recipient.memberId, amount },
      ip,
    });
    return { reference, amount, self, recipient: { fullName: recipient.fullName, username: recipient.username, memberId: recipient.memberId } };
  });
}

/**
 * Buys a course bundle with wallet funds, for the payer or for another member found by username (P2P activation).
 * Approved at once: the bundle is activated and income is distributed exactly as for an admin-approved UPI payment.
 */
export async function purchaseBundle(payer, { username, packageId, wallet, txnPassword }, ip) {
  if (!WALLETS.includes(wallet)) throw new AppError('Choose the wallet to pay from');
  const pkg = await Package.findOne({ _id: packageId, status: 'active' }).lean();
  if (!pkg) throw new AppError('Please select a valid course bundle');

  const forSelf = !username || String(username).trim().toLowerCase().replace(/^@/, '') === payer.username;
  const target = forSelf ? payer : await findMemberByUsername(username);
  if (!target) throw new AppError('No member found with this username', 404);
  const who = forSelf ? 'You' : `${target.fullName} (${target.username})`;
  if (target.status !== 'active') throw new AppError(`${who}'s account is not approved yet`);
  if (target.package) throw new AppError(forSelf ? 'Your bundle is already active. Bundle upgrades are not supported.' : `${who} already has an active bundle`, 409);

  await authorizeWalletDebit(payer._id, txnPassword);
  const settings = await getSettings();
  return withWalletLock(payer._id, async () => {
    const balance = await getBalance(payer._id, wallet);
    if (pkg.price > balance) {
      throw new AppError(`Insufficient ${WALLET_LABELS[wallet]} balance. Available ${inr(balance)}, bundle price ${inr(pkg.price)}.`);
    }
    const now = new Date();
    let payment;
    try {
      payment = await Payment.create({
        paymentId: await nextCode('PAY', 'payment'),
        user: target._id,
        package: pkg._id,
        ...priceBreakdown(pkg.price, settings),
        method: 'wallet',
        wallet,
        paidBy: payer._id,
        paymentDate: now,
        status: 'approved',
        verifiedAt: now,
        adminRemarks: forSelf ? `Paid from ${WALLET_LABELS[wallet]}` : `Paid by ${payer.fullName} (${payer.memberId}) from ${WALLET_LABELS[wallet]}`,
        userLock: String(target._id),
      });
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.userLock) {
        throw new AppError(forSelf ? 'You already have a payment under verification' : `${who} already has a bundle payment under verification`, 409);
      }
      throw err;
    }

    const buyer = await User.findOneAndUpdate(
      { _id: target._id, package: null, status: 'active' },
      { $set: { package: pkg._id, selectedPackage: pkg._id, packageActivatedAt: now } },
      { returnDocument: 'after' },
    );
    if (!buyer) {
      await Payment.deleteOne({ _id: payment._id });
      throw new AppError(`${who} already has an active bundle`, 409);
    }
    await createEntry({
      user: payer._id,
      wallet,
      direction: 'debit',
      category: 'bundle_purchase',
      grossAmount: pkg.price,
      payment: payment._id,
      package: pkg._id,
      counterparty: target._id,
      reference: payment.paymentId,
      idempotencyKey: `PURCHASE:${payment._id}`,
      remarks: forSelf ? `${pkg.name} bundle activated for you` : `${pkg.name} bundle activated for ${target.fullName} (${target.memberId})`,
    });
    const result = await distributePackageIncome(payment, buyer, pkg);

    await notify(buyer._id, {
      title: 'Bundle activated',
      message: forSelf
        ? `Your ${pkg.name} bundle is active (paid from your ${WALLET_LABELS[wallet]}).`
        : `${payer.fullName} (${payer.username}) activated the ${pkg.name} bundle for you. Your courses are now unlocked.`,
      type: 'payment',
      link: '/app/courses',
      email: !forSelf,
    });
    await audit(payer, 'payment.wallet', {
      entityType: 'Payment',
      entityId: payment.paymentId,
      details: { member: buyer.memberId, package: pkg.key, amount: pkg.price, wallet, incomeEntries: result.created },
      ip,
    });
    return { payment, member: { fullName: buyer.fullName, username: buyer.username, memberId: buyer.memberId }, package: pkg.name };
  });
}
