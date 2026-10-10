// All business periods (days, weeks, months) are in Indian Standard Time (UTC+05:30, no DST).
const IST_OFFSET_MS = 330 * 60 * 1000;

const toIST = (d) => new Date(new Date(d).getTime() + IST_OFFSET_MS);
const fromIST = (d) => new Date(d.getTime() - IST_OFFSET_MS);

export function startOfDayIST(date = new Date()) {
  const ist = toIST(date);
  ist.setUTCHours(0, 0, 0, 0);
  return fromIST(ist);
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * 86400000);
}

/** Next 12:00 AM IST strictly after `date`. */
export function nextMidnightIST(date = new Date()) {
  return addDays(startOfDayIST(date), 1);
}

/** Monday 00:00 IST of the week containing `date`. */
export function startOfWeekIST(date = new Date()) {
  const ist = toIST(date);
  const dow = (ist.getUTCDay() + 6) % 7; // Monday = 0
  ist.setUTCDate(ist.getUTCDate() - dow);
  ist.setUTCHours(0, 0, 0, 0);
  return fromIST(ist);
}

export function startOfMonthIST(date = new Date()) {
  const ist = toIST(date);
  ist.setUTCDate(1);
  ist.setUTCHours(0, 0, 0, 0);
  return fromIST(ist);
}

export function addMonthsIST(monthStart, months) {
  const ist = toIST(monthStart);
  ist.setUTCMonth(ist.getUTCMonth() + months);
  return fromIST(ist);
}

/** "YYYY-MM-DD" (IST) of a date. */
export function dayKeyIST(date) {
  return toIST(date).toISOString().slice(0, 10);
}

/** "YYYY-MM" (IST) of a date. */
export function monthKeyIST(date) {
  return toIST(date).toISOString().slice(0, 7);
}

/** Parse "YYYY-MM-DD" as an IST calendar date (00:00 IST). */
export function parseDayIST(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  if (!y || !m || !d) return null;
  return fromIST(new Date(Date.UTC(y, m - 1, d)));
}

/** Parse "YYYY-MM" as the first day of that month, 00:00 IST. */
export function parseMonthIST(str) {
  const [y, m] = String(str).split('-').map(Number);
  if (!y || !m) return null;
  return fromIST(new Date(Date.UTC(y, m - 1, 1)));
}
