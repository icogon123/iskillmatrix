import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;
if (env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
}

export const mailEnabled = () => Boolean(transporter);

/** Sends an email when SMTP is configured; otherwise logs it (development). Never throws. */
export async function sendMail({ to, subject, text }) {
  if (!to) return;
  if (!transporter) {
    if (!env.isProd && process.env.MAIL_LOG !== 'off') console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`);
    return;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, text });
  } catch (err) {
    console.error('[mail] failed', err.message);
  }
}
