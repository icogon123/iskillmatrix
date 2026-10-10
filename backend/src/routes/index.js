import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { privateUpload, publicImageUpload } from '../middleware/upload.js';
import {
  registerSchema, loginSchema, changePasswordSchema, changeTxnPasswordSchema, kycSchema, withdrawalSchema, passwordRule,
  transferSchema, walletPurchaseSchema,
} from '../controllers/validators.js';
import { z } from 'zod';
import * as auth from '../controllers/authController.js';
import * as pub from '../controllers/publicController.js';
import * as member from '../controllers/memberController.js';
import * as admin from '../controllers/adminController.js';
import * as ops from '../controllers/adminOpsController.js';
import * as config from '../controllers/adminConfigController.js';
import * as reports from '../controllers/reportController.js';
import { privateFile } from '../controllers/filesController.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });

// For uptime monitors and load balancers: 503 while the database is unreachable.
router.get('/health', (_req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503).json({ ok: db, db: db ? 'connected' : 'disconnected', time: new Date().toISOString() });
});

/* Public */
router.get('/public/packages', pub.listPackages);
router.get('/public/courses', pub.listCourses);
router.get('/public/sponsor/:code', pub.sponsorLookup);
router.get('/public/site', pub.siteInfo);

/* Auth */
router.post('/auth/register', authLimiter, validate(registerSchema), auth.register);
router.get('/auth/check-username', auth.checkUsername);
router.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
router.post('/auth/logout', auth.logout);
router.post('/auth/forgot-password', authLimiter, auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(z.object({ token: z.string().min(10), password: passwordRule })), auth.resetPassword);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/change-password', authenticate, validate(changePasswordSchema), auth.changePassword);

router.get('/files/:name', authenticate, privateFile);

/* Member */
const m = Router();
m.use(authenticate, requireRole('member'));
m.get('/dashboard', member.dashboard);
m.get('/profile', member.profile);
m.post('/avatar', publicImageUpload.single('avatar'), member.uploadAvatar);
m.delete('/avatar', member.removeAvatar);
m.post('/change-txn-password', validate(changeTxnPasswordSchema), auth.changeTxnPassword);
m.get('/payment-info', member.paymentInfo);
m.post('/payments', privateUpload.single('proof'), member.submitPayment);
m.get('/kyc', member.getKyc);
m.post(
  '/kyc',
  privateUpload.fields([{ name: 'aadhaarDoc', maxCount: 1 }, { name: 'panDoc', maxCount: 1 }, { name: 'bankDoc', maxCount: 1 }]),
  validate(kycSchema),
  member.submitKyc,
);
m.get('/team', member.team);
m.get('/team/members', member.teamMembers);
m.get('/team/tree', member.tree);
m.get('/income', member.incomeSummary);
m.get('/ledger', member.ledger);
m.get('/wallet', member.wallet);
m.get('/wallet/statement', member.statement);
m.post('/wallet/purchase', validate(walletPurchaseSchema), member.walletPurchase);
m.get('/wallet/activations', member.listActivations);
m.get('/members/lookup', member.memberLookup);
m.get('/transfers', member.listTransfers);
m.post('/transfers', validate(transferSchema), member.createTransfer);
m.get('/deposits', member.depositInfo);
m.post('/deposits', privateUpload.single('proof'), member.createDeposit);
m.get('/withdrawals', member.listWithdrawals);
m.get('/withdrawals/quote', member.withdrawalQuote);
m.post('/withdrawals', validate(withdrawalSchema), member.createWithdrawal);
m.post('/withdrawals/:id/cancel', member.cancelMyWithdrawal);
m.get('/achievements', member.achievements);
m.get('/notifications', member.notifications);
m.post('/notifications/read', member.markNotificationsRead);
m.post('/notifications/:id/read', member.markNotificationsRead);
router.use('/member', m);

/* Admin */
const a = Router();
a.use(authenticate, requireRole('admin'));
a.get('/dashboard', admin.dashboard);
a.get('/registrations', admin.listRegistrations);
a.post('/registrations/:id/approve', admin.approveRegistration);
a.post('/registrations/:id/reject', admin.rejectRegistration);
a.get('/members', admin.listMembers);
a.get('/members/:id', admin.memberDetail);
a.patch('/members/:id/status', admin.updateMemberStatus);
a.patch('/members/:id/profile', admin.updateMemberProfile);
a.post('/members/:id/reset-password', admin.resetMemberPassword);
a.post('/members/:id/wallet-adjust', admin.adjustWallet);
a.patch('/members/:id/wallet-status', admin.updateWalletStatus);
a.get('/kyc', ops.listKyc);
a.post('/kyc/:id/review', ops.reviewKyc);
a.get('/payments', ops.listPayments);
a.post('/payments/:id/approve', ops.approvePayment);
a.post('/payments/:id/reject', ops.rejectPayment);
a.get('/deposits', ops.listDeposits);
a.post('/deposits/:id/approve', ops.approveDeposit);
a.post('/deposits/:id/reject', ops.rejectDeposit);
a.get('/withdrawals', ops.listWithdrawals);
a.post('/withdrawals/:id/status', ops.updateWithdrawal);
a.get('/processing', ops.processingOverview);
a.post('/processing/non-working', ops.runNonWorking);
a.get('/processing/weekly-pool', ops.weeklyPoolPreview);
a.post('/processing/runs/:type', ops.generateRun);
a.get('/processing/runs/:id', ops.runDetail);
a.post('/processing/runs/:id/approve', ops.approveIncomeRun);
a.post('/processing/runs/:id/cancel', ops.cancelIncomeRun);
a.get('/packages', config.listPackages);
a.put('/packages/:id', config.updatePackage);
a.get('/courses', config.listCourses);
a.post('/courses', config.createCourse);
a.put('/courses/:id', config.updateCourse);
a.get('/settings', config.getSettingsAdmin);
a.put('/settings', config.putSettings);
a.post('/settings/qr', publicImageUpload.single('qr'), config.uploadQr);
a.get('/settings/history', config.settingsHistory);
a.get('/ledger', config.ledger);
a.get('/audit-logs', config.auditLogs);
a.get('/network', config.networkTree);
a.get('/reports', reports.reportTypes);
a.get('/reports/:type', reports.runReport);
router.use('/admin', a);

export default router;
