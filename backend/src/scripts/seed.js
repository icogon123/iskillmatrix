/** Creates the base data (settings, packages, first admin, company root member) if missing. Safe to re-run. */
import { assertServerEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { ensureBaseData } from './baseData.js';

assertServerEnv();
await connectDB();
await ensureBaseData();
console.log('[seed] done');
await disconnectDB();
