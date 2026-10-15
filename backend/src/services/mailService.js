import nodemailer from 'nodemailer';
import env from '../config/env.js';

// Built on first use so check scripts can switch mail off (env.smtp.host = '') after importing the services.
let transporter;
function getTransporter() {
  if (transporter === undefined) {
    transporter = env.smtp.host
      ? nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      })
      : null;
  }
  return transporter;
}

export const mailEnabled = () => Boolean(getTransporter());

/**
 * Sends an email when SMTP is configured; otherwise logs it (development). Never throws.
 * Resolves to true when the mail was handed to SMTP (or logged in development), false otherwise.
 */
export async function sendMail({ to, subject, text }) {
  if (!to) return false;
  const transporter = getTransporter();
  if (!transporter) {
    if (!env.isProd && process.env.MAIL_LOG !== 'off') console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`);
    return !env.isProd;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, text });
    return true;
  } catch (err) {
    console.error('[mail] failed', err.message);
    return false;
  }
}
