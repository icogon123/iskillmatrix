import crypto from 'node:crypto';
import User from '../models/User.js';
import Package from '../models/Package.js';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';
import { nextMemberId } from '../utils/ids.js';
import { issueToken, clearToken } from '../middleware/auth.js';
import { reqAudit, audit } from '../services/auditService.js';
import { notify } from '../services/notificationService.js';
import { sendMail } from '../services/mailService.js';
import { escapeRegex } from '../utils/pagination.js';
import { maskAadhaar } from '../utils/mask.js';

const SPONSOR_FIELDS = 'memberId fullName status ancestors depth role';

export async function findSponsor(code) {
  const c = String(code || '').trim();
  if (!c) return null;
  return User.findOne({
    role: 'member',
    $or: [{ memberId: c.toUpperCase() }, { username: c.toLowerCase() }],
  }).select(SPONSOR_FIELDS);
}

export async function register(req, res) {
  const d = req.body;
  const sponsor = await findSponsor(d.sponsorId);
  if (!sponsor || sponsor.status !== 'active') throw new AppError('Invalid or inactive sponsor ID / referral code');
  const pkg = await Package.findOne({ _id: d.packageId, status: 'active' }).lean();
  if (!pkg) throw new AppError('Select a valid course bundle');
  if (await User.exists({ username: d.username })) throw new AppError('This username is already taken', 409);

  const user = await User.create({
    memberId: await nextMemberId(),
    username: d.username,
    fullName: d.fullName,
    email: d.email,
    mobile: d.mobile,
    dob: d.dob,
    country: d.country,
    aadhaar: d.aadhaar,
    password: await User.hash(d.password),
    txnPassword: await User.hash(d.txnPassword),
    sponsor: sponsor._id,
    ancestors: [sponsor._id, ...sponsor.ancestors],
    depth: sponsor.depth + 1,
    selectedPackage: pkg._id,
    status: 'pending',
  });

  await notify(sponsor._id, {
    title: 'New referral registered',
    message: `${user.fullName} (${user.memberId}) joined with your referral and is awaiting admin approval.`,
    type: 'team',
    link: '/app/team',
  });
  await sendMail({
    to: user.email,
    subject: 'iSkillMatrix: Registration submitted',
    text: `Hi ${user.fullName},\n\nYour registration is submitted.\nMember ID: ${user.memberId}\nUsername: ${user.username}\n\nYou can log in once an administrator approves your account.\n\nTeam iSkillMatrix`,
  });
  await audit(user, 'registration.submitted', { entityType: 'User', entityId: user.memberId, details: { sponsor: sponsor.memberId, package: pkg.key }, ip: req.ip });

  res.status(201).json({
    message: 'Registration submitted. You can log in after admin approval.',
    memberId: user.memberId,
    username: user.username,
  });
}

export async function checkUsername(req, res) {
  const username = String(req.query.username || '').trim().toLowerCase();
  const valid = /^[a-z0-9_]{4,20}$/.test(username);
  res.json({ username, valid, available: valid && !(await User.exists({ username })) });
}

const STATUS_MESSAGES = {
  pending: 'Your registration is pending admin approval. You will be able to log in once it is approved.',
  inactive: 'Your account is inactive. Please contact support.',
  suspended: 'Your account has been suspended. Please contact support.',
};

export async function login(req, res) {
  const { identifier, password } = req.body;
  const id = identifier.trim();
  const user = await User.findOne({
    $or: [{ username: id.toLowerCase() }, { memberId: id.toUpperCase() }],
  }).select('+password +tokenVersion');
  if (!user || !(await user.checkPassword(password))) throw new AppError('Invalid username / member ID or password', 401);

  if (user.status === 'rejected') {
    throw new AppError(`Your registration was rejected${user.statusReason ? `: ${user.statusReason}` : ''}.`, 403);
  }
  if (user.status !== 'active') throw new AppError(STATUS_MESSAGES[user.status] || 'Account not active', 403);

  user.lastLoginAt = new Date();
  await user.save();
  issueToken(res, user);
  await audit(user, `${user.role}.login`, { entityType: 'User', entityId: user.memberId || user.username, ip: req.ip });
  res.json({ user: await publicUser(user._id) });
}

export async function logout(req, res) {
  clearToken(res);
  res.json({ message: 'Logged out' });
}

export async function publicUser(id) {
  return User.findById(id)
    .populate('package', 'name key price courses')
    .populate('selectedPackage', 'name key price courses')
    .populate('sponsor', 'memberId fullName')
    .lean()
    .then((u) => {
      if (!u) return null;
      const { password, txnPassword, tokenVersion, walletLock, resetTokenHash, resetTokenExpires, ancestors, ...rest } = u;
      return { ...rest, aadhaar: maskAadhaar(rest.aadhaar), isPackageActive: Boolean(u.package) };
    });
}

export async function me(req, res) {
  res.json({ user: await publicUser(req.user._id) });
}

export async function forgotPassword(req, res) {
  const id = String(req.body.identifier || '').trim();
  const generic = { message: 'If the account exists, a password reset link has been sent to the registered email.' };
  if (!id) return res.json(generic);
  const user = await User.findOne({
    $or: [{ username: id.toLowerCase() }, { memberId: id.toUpperCase() }, { email: new RegExp(`^${escapeRegex(id)}$`, 'i') }],
  });
  if (!user?.email) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();
  const link = `${env.clientUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'iSkillMatrix: Reset your password',
    text: `Hi ${user.fullName},\n\nUse this link to reset your password (valid for 30 minutes):\n${link}\n\nIf you did not request this, ignore this email.`,
  });
  await audit(user, 'password.reset_requested', { entityType: 'User', entityId: user.memberId || user.username, ip: req.ip });
  res.json(generic);
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const hash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const user = await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } });
  if (!user) throw new AppError('This reset link is invalid or has expired');
  user.password = await User.hash(password);
  user.resetTokenHash = undefined;
  user.resetTokenExpires = undefined;
  user.tokenVersion += 1;
  await user.save();
  await audit(user, 'password.reset', { entityType: 'User', entityId: user.memberId || user.username, ip: req.ip });
  res.json({ message: 'Password updated. Please log in with your new password.' });
}

export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.checkPassword(req.body.currentPassword))) throw new AppError('Current password is incorrect', 401);
  user.password = await User.hash(req.body.newPassword);
  user.tokenVersion += 1;
  await user.save();
  issueToken(res, user);
  await reqAudit(req, 'password.changed', { entityType: 'User', entityId: user.memberId || user.username });
  res.json({ message: 'Login password changed' });
}

export async function changeTxnPassword(req, res) {
  const user = await User.findById(req.user._id).select('+password +txnPassword');
  if (!(await user.checkPassword(req.body.currentPassword))) throw new AppError('Login password is incorrect', 401);
  if (await user.checkPassword(req.body.newTxnPassword)) throw new AppError('Transaction password must be different from login password');
  user.txnPassword = await User.hash(req.body.newTxnPassword);
  await user.save();
  await reqAudit(req, 'txn_password.changed', { entityType: 'User', entityId: user.memberId });
  res.json({ message: 'Transaction password changed' });
}
