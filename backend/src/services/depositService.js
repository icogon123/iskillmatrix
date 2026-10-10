import Deposit from '../models/Deposit.js';
import Payment from '../models/Payment.js';
import AppError from '../utils/AppError.js';
import { nextCode } from '../utils/ids.js';
import { round2 } from '../utils/money.js';
import { createEntry } from './ledgerService.js';
import { getSettings } from './settingsService.js';
import { notify } from './notificationService.js';
import { audit } from './auditService.js';
import { storeUpload, removeAsset, fileRef } from './storageService.js';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

/** True when the UTR is already on a live bundle payment or fund deposit (one UTR = one bank transfer). */
export async function utrInUse(utr) {
  return Boolean((await Payment.exists({ utrLock: utr })) || (await Deposit.exists({ utrLock: utr })));
}

/** Member deposit by QR/UPI with UTR and screenshot; credited to the Activation Wallet once the admin verifies it. */
export async function submitDeposit(user, { amount, utr, paymentDate }, proofFile, ip) {
  const { depositMin, depositMax } = (await getSettings()).wallet;
  amount = round2(amount);
  if (!(amount > 0)) throw new AppError('Enter a valid amount');
  if (amount < depositMin) throw new AppError(`Minimum deposit is ${inr(depositMin)}`);
  if (depositMax && amount > depositMax) throw new AppError(`Maximum deposit is ${inr(depositMax)}`);
  if (!proofFile) throw new AppError('Upload the payment screenshot / proof');
  const cleanUtr = String(utr || '').trim().toUpperCase();
  if (cleanUtr.length < 6) throw new AppError('Enter a valid UTR / reference number');
  // Check before uploading, so rejected requests don't leave files behind.
  if (await utrInUse(cleanUtr)) throw new AppError('This UTR / reference number has already been used', 409);

  const asset = await storeUpload(proofFile, { owner: user._id, purpose: 'deposit_proof' });
  try {
    const deposit = await Deposit.create({
      depositId: await nextCode('DEP', 'deposit'),
      user: user._id,
      amount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      utr: cleanUtr,
      proof: fileRef(asset),
      utrLock: cleanUtr,
    });
    await audit(user, 'deposit.submitted', { entityType: 'Deposit', entityId: deposit.depositId, details: { amount, utr: cleanUtr }, ip });
    return deposit;
  } catch (err) {
    await removeAsset(asset);
    if (err.code === 11000 && err.keyPattern?.utrLock) throw new AppError('This UTR / reference number has already been used', 409);
    throw err;
  }
}

export async function approveDeposit(admin, id, remarks, ip) {
  const deposit = await Deposit.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'approved', adminRemarks: remarks, verifiedAt: new Date(), verifiedBy: admin._id } },
    { returnDocument: 'after' },
  );
  if (!deposit) throw new AppError('Deposit not found or already processed', 409);
  await createEntry({
    user: deposit.user,
    wallet: 'activation',
    direction: 'credit',
    category: 'deposit',
    grossAmount: deposit.amount,
    deposit: deposit._id,
    reference: deposit.depositId,
    idempotencyKey: `DEPOSIT:${deposit._id}`,
    remarks: `Deposit ${deposit.depositId} · UTR ${deposit.utr}`,
    createdBy: admin._id,
  });
  await notify(deposit.user, {
    title: 'Deposit approved',
    message: `${inr(deposit.amount)} (deposit ${deposit.depositId}) is now in your Activation Wallet. Use it to activate a course bundle for yourself or a member.`,
    type: 'wallet',
    link: '/app/wallet',
    email: true,
  });
  await audit(admin, 'deposit.approved', { entityType: 'Deposit', entityId: deposit.depositId, details: { amount: deposit.amount }, ip });
  return deposit;
}

export async function rejectDeposit(admin, id, reason, ip) {
  if (!reason) throw new AppError('Please give a reason for rejection');
  const deposit = await Deposit.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'rejected', adminRemarks: reason, verifiedAt: new Date(), verifiedBy: admin._id }, $unset: { utrLock: 1 } },
    { returnDocument: 'after' },
  );
  if (!deposit) throw new AppError('Deposit not found or already processed', 409);
  await notify(deposit.user, {
    title: 'Deposit rejected',
    message: `Your deposit ${deposit.depositId} of ${inr(deposit.amount)} was rejected: ${reason}.`,
    type: 'wallet',
    link: '/app/deposit',
    email: true,
  });
  await audit(admin, 'deposit.rejected', { entityType: 'Deposit', entityId: deposit.depositId, details: { reason }, ip });
  return deposit;
}
