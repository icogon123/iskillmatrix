import crypto from 'node:crypto';
import Counter from '../models/Counter.js';

/** Atomically increments a named counter and returns `offset + n` (n starts at 1). */
export async function nextSequence(name, offset = 0) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return offset + doc.seq;
}

export async function nextMemberId() {
  return `ISM${await nextSequence('member', 100000)}`;
}

export async function nextCode(prefix, name) {
  const seq = await nextSequence(name);
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

export function txnId() {
  const stamp = Date.now().toString(36).toUpperCase();
  return `TXN${stamp}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}
