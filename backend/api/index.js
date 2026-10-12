// Vercel serverless entry. The app is created once per warm instance; the database connection and base data
// are initialised lazily on the first request (there is no long-running server.js process on Vercel).
import env, { assertServerEnv } from '../src/config/env.js';
import { connectDB } from '../src/config/db.js';
import { ensureBaseData } from '../src/scripts/baseData.js';
import app from '../src/app.js';

let ready;
function init() {
  ready ??= (async () => {
    assertServerEnv();
    await connectDB();
    await ensureBaseData({ log: false });
  })().catch((err) => {
    ready = undefined; // let the next request retry
    throw err;
  });
  return ready;
}

export default async function handler(req, res) {
  try {
    await init();
  } catch (err) {
    console.error('[init] failed:', err.message);
    return res.status(500).json({ message: env.isProd ? 'Service unavailable' : err.message });
  }
  return app(req, res);
}
