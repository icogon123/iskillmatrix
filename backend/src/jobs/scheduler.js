import cron from 'node-cron';
import { processNonWorking } from '../services/incomeEngine.js';
import { autoProcessWeekly } from '../services/runService.js';
import { getSettings } from '../services/settingsService.js';
import { audit } from '../services/auditService.js';

async function runNonWorking(trigger) {
  const settings = await getSettings();
  if (!settings.nonWorking.autoProcess) return;
  const result = await processNonWorking();
  if (result.credited) {
    console.log(`[jobs] non-working bonuses credited: ${result.credited} (${trigger})`);
    await audit(null, 'income.non_working_processed', { details: { ...result, trigger } });
  }
}

async function runWeekly(trigger, opts) {
  const run = await autoProcessWeekly(opts);
  if (!run) return;
  console.log(`[jobs] weekly pool ${run.periodKey}: ₹${run.pool?.amount} → ${run.itemsCount} × ₹${run.pool?.share} (${run.status}, ${trigger})`);
  await audit(null, `income.weekly_${run.status === 'approved' ? 'approved' : 'generated'}`, {
    entityType: 'IncomeRun',
    entityId: run._id,
    details: { period: run.periodKey, pool: run.pool, items: run.itemsCount, total: run.totalAmount, trigger },
  });
}

/** One pass of every scheduled job. Safe to call repeatedly; used by the serverless cron endpoint (Vercel). */
export async function runDailyJobs(trigger = 'cron') {
  await runNonWorking(trigger);
  await runWeekly(trigger);
}

export function startScheduler() {
  // Non-working bonuses are credited every day at 12:00 AM IST.
  cron.schedule('0 0 * * *', () => runNonWorking('cron').catch((e) => console.error('[jobs] non-working failed', e)), {
    timezone: 'Asia/Kolkata',
  });
  // The weekly pool is distributed right after the week (Mon–Sun) closes: Monday 12:05 AM IST.
  cron.schedule('5 0 * * 1', () => runWeekly('cron').catch((e) => console.error('[jobs] weekly failed', e)), {
    timezone: 'Asia/Kolkata',
  });
  // Catch up on anything that became due while the server was down.
  runNonWorking('startup').catch((e) => console.error('[jobs] non-working catch-up failed', e));
  runWeekly('startup', { maxDelayDays: 2 }).catch((e) => console.error('[jobs] weekly catch-up failed', e));
}
