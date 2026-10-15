import crypto from 'node:crypto';
import Otp from '../models/Otp.js';
import AppError from '../utils/AppError.js';
import env from '../config/env.js';
import { maskEmail } from '../utils/mask.js';
import { sendMail, mailEnabled } from './mailService.js';

export const OTP_TTL_MINUTES = 10;
export const OTP_RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const hashCode = (key, code) => crypto.createHmac('sha256', `otp:${env.jwtSecret}`).update(`${key}:${code}`).digest('hex');

/**
 * Emails a fresh 6-digit code for `purpose` + `subject`, replacing any earlier one.
 * `meta` is stored with the code and must match again in `verifyOtp` (e.g. the withdrawal amount).
 */
export async function sendOtp({ purpose, subject, email, name, action, meta }) {
  const key = `${purpose}:${subject}`;
  const existing = await Otp.findOne({ key }).lean();
  if (existing) {
    const wait = Math.ceil((existing.sentAt.getTime() + OTP_RESEND_SECONDS * 1000 - Date.now()) / 1000);
    if (wait > 0) throw new AppError(`Please wait ${wait}s before requesting a new OTP`, 429, { retryAfter: wait });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const now = new Date();
  await Otp.findOneAndUpdate(
    { key },
    { $set: { codeHash: hashCode(key, code), meta, attempts: 0, sentAt: now, expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000) } },
    { upsert: true },
  );

  const sent = await sendMail({
    to: email,
    subject: `AroviaSkillTech: ${code} is your OTP`,
    text: `Hi ${name || 'there'},\n\nYour one-time password (OTP) to ${action} is:\n\n${code}\n\nIt is valid for ${OTP_TTL_MINUTES} minutes. Do not share it with anyone, AroviaSkillTech staff will never ask for it.\n\nIf you did not request this, you can ignore this email.\n\nTeam AroviaSkillTech`,
  });
  if (!sent) {
    await Otp.deleteOne({ key });
    throw new AppError('We could not send the OTP email right now. Please try again in a few minutes.', 502);
  }

  return {
    message: `OTP sent to ${maskEmail(email)}`,
    sentTo: maskEmail(email),
    expiresInMinutes: OTP_TTL_MINUTES,
    resendIn: OTP_RESEND_SECONDS,
    // Local development without SMTP: hand the code back so the flow can be tested.
    ...(!mailEnabled() && !env.isProd ? { devCode: code } : {}),
  };
}

/**
 * Checks and consumes the code. Throws a 400 with a member-friendly message when it is missing, wrong or expired.
 * The match and the delete are one operation, so a code can never be used by two parallel requests.
 */
export async function verifyOtp({ purpose, subject, code, meta, metaMismatch = 'This OTP was issued for a different request. Please request a new OTP.' }) {
  const key = `${purpose}:${subject}`;
  code = String(code || '').trim();
  if (!/^\d{6}$/.test(code)) throw new AppError('Enter the 6-digit OTP sent to your email');

  const live = { key, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } };
  const otp = await Otp.findOneAndDelete({ ...live, codeHash: hashCode(key, code) }).lean();
  if (otp) {
    if (meta !== undefined && JSON.stringify(meta) !== JSON.stringify(otp.meta)) throw new AppError(metaMismatch);
    return;
  }

  const missed = await Otp.findOneAndUpdate(live, { $inc: { attempts: 1 } }, { returnDocument: 'after' }).lean();
  if (!missed) throw new AppError('Your OTP has expired or too many wrong attempts were made. Please request a new OTP.');
  const left = MAX_ATTEMPTS - missed.attempts;
  throw new AppError(left > 0 ? `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Incorrect OTP. Please request a new OTP.');
}
