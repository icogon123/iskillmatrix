import env, { assertServerEnv } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { ensureBaseData } from './scripts/baseData.js';
import { startScheduler } from './jobs/scheduler.js';
import { mailEnabled } from './services/mailService.js';
import { storageConfigured } from './services/storageService.js';
import app from './app.js';

assertServerEnv();
await connectDB();
await ensureBaseData();
startScheduler();

if (!storageConfigured()) {
  console.warn('[storage] Cloudinary is not configured: payment proofs, KYC documents and the QR code cannot be uploaded. Set CLOUDINARY_* in backend/.env.');
}
if (!mailEnabled()) {
  console.warn('[mail] SMTP is not configured: password-reset and notification emails will not be delivered. Set SMTP_* in backend/.env.');
}

const server = app.listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`[api] ${signal} received, shutting down`);
  server.close();
  await disconnectDB();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
