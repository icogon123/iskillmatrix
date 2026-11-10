import Payment from '../models/Payment.js';
import Deposit from '../models/Deposit.js';
import Package from '../models/Package.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { nextCode } from '../utils/ids.js';
import { pct, round2 } from '../utils/money.js';
import { getSettings } from './settingsService.js';
import { distributePackageIncome } from './incomeEngine.js';
import { notify } from './notificationService.js';
import { audit } from './auditService.js';
import { storeUpload, removeAsset, fileRef } from './storageService.js';

export function priceBreakdown(price, settings) {
  const gstAmount = pct(price, settings.tax.gstPercent);
  const systemCost = pct(price, settings.tax.systemCostPercent);
  return { amount: price, gstAmount, systemCost, packageCost: round2(price - gstAmount - systemCost) };
}

export async function submitPayment(user, { packageId, utr, paymentDate }, proofFile, ip) {
  const pkg = await Package.findOne({ _id: packageId, status: 'active' }).lean();
  if (!pkg) throw new AppError('Please select a valid course bundle');

  // Self upgrades are not allowed: a bundle can only be upgraded by another member through P2P activation.
  if (user.package) {
    throw new AppError('Your bundle is already active. Self upgrades are not available — any other member in the network can upgrade your bundle for you.', 409);
  }
  const isUpgrade = false;
  const currentPkg = null;
  const chargeAmount = pkg.price;

  if (!proofFile) throw new AppError('Upload the payment screenshot / proof');
  const cleanUtr = String(utr || '').trim().toUpperCase();
  if (cleanUtr.length < 6) throw new AppError('Enter a valid UTR / reference number');
  // Check the common conflicts before uploading, so rejected requests don't leave files behind.
  if (await Payment.exists({ userLock: String(user._id) })) throw new AppError('You already have a payment under verification', 409);
  if ((await Payment.exists({ utrLock: cleanUtr })) || (await Deposit.exists({ utrLock: cleanUtr }))) {
    throw new AppError('This UTR / reference number has already been used', 409);
  }

  const settings = await getSettings();
  const asset = await storeUpload(proofFile, { owner: user._id, purpose: 'payment_proof' });
  try {
    const payment = await Payment.create({
      paymentId: await nextCode('PAY', 'payment'),
      user: user._id,
      package: pkg._id,
      oldPackage: isUpgrade ? currentPkg._id : undefined,
      isUpgrade,
      ...priceBreakdown(chargeAmount, settings),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      utr: cleanUtr,
      proof: fileRef(asset),
      userLock: String(user._id),
      utrLock: cleanUtr,
    });
    await User.updateOne({ _id: user._id }, { $set: { selectedPackage: pkg._id } });
    await audit(user, isUpgrade ? 'payment.upgrade_submitted' : 'payment.submitted', {
      entityType: 'Payment',
      entityId: payment.paymentId,
      details: { package: pkg.key, isUpgrade, amount: chargeAmount, utr: cleanUtr },
      ip,
    });
    return payment;
  } catch (err) {
    await removeAsset(asset);
    if (err.code === 11000 && err.keyPattern?.userLock) throw new AppError('You already have a payment under verification', 409);
    if (err.code === 11000 && err.keyPattern?.utrLock) throw new AppError('This UTR / reference number has already been used', 409);
    throw err;
  }
}

export async function approvePayment(admin, paymentId, remarks, ip) {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: 'pending' },
    { $set: { status: 'approved', adminRemarks: remarks, verifiedAt: new Date(), verifiedBy: admin._id }, $unset: { userLock: 1 } },
    { returnDocument: 'after' },
  );
  if (!payment) throw new AppError('Payment not found or already processed', 409);

  let buyer;
  if (payment.isUpgrade) {
    buyer = await User.findOneAndUpdate(
      { _id: payment.user, package: payment.oldPackage },
      { $set: { package: payment.package, selectedPackage: payment.package, packageActivatedAt: payment.verifiedAt } },
      { returnDocument: 'after' },
    );
  } else {
    buyer = await User.findOneAndUpdate(
      { _id: payment.user, package: null },
      { $set: { package: payment.package, selectedPackage: payment.package, packageActivatedAt: payment.verifiedAt } },
      { returnDocument: 'after' },
    );
  }
  if (!buyer) {
    await Payment.updateOne({ _id: payment._id }, { $set: { status: 'pending', userLock: String(payment.user) }, $unset: { verifiedAt: 1, verifiedBy: 1 } });
    throw new AppError('This member already has an active bundle or status changed', 409);
  }
  const pkg = await Package.findById(payment.package).lean();
  const oldPkg = payment.oldPackage ? await Package.findById(payment.oldPackage).lean() : null;
  const result = await distributePackageIncome(payment, buyer, pkg, oldPkg);

  await notify(buyer._id, {
    title: payment.isUpgrade ? 'Payment approved — bundle upgraded' : 'Payment approved — bundle activated',
    message: payment.isUpgrade
      ? `Your payment ${payment.paymentId} is verified and your bundle is now upgraded to ${pkg.name}.`
      : `Your payment ${payment.paymentId} is verified and the ${pkg.name} bundle is now active.`,
    type: 'payment',
    link: '/app',
    email: true,
  });
  await audit(admin, payment.isUpgrade ? 'payment.upgraded' : 'payment.approved', {
    entityType: 'Payment',
    entityId: payment.paymentId,
    details: { member: buyer.memberId, package: pkg.key, isUpgrade: payment.isUpgrade, amount: payment.amount, incomeEntries: result.created },
    ip,
  });
  return payment;
}

export async function rejectPayment(admin, paymentId, reason, ip) {
  if (!reason) throw new AppError('Please give a reason for rejection');
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: 'pending' },
    {
      $set: { status: 'rejected', adminRemarks: reason, verifiedAt: new Date(), verifiedBy: admin._id },
      $unset: { userLock: 1, utrLock: 1 },
    },
    { returnDocument: 'after' },
  );
  if (!payment) throw new AppError('Payment not found or already processed', 409);
  await notify(payment.user, {
    title: 'Payment rejected',
    message: `Your payment ${payment.paymentId} was rejected: ${reason}. Please submit a valid payment again.`,
    type: 'payment',
    link: '/app/activate',
    email: true,
  });
  await audit(admin, 'payment.rejected', { entityType: 'Payment', entityId: payment.paymentId, details: { reason }, ip });
  return payment;
}
