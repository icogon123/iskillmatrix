import Setting from '../models/Setting.js';
import SettingHistory from '../models/SettingHistory.js';

let cache = null;

export async function getSettings() {
  if (cache) return cache;
  // Not lean: hydrating applies schema defaults, so fields added after the document was created are filled in.
  let doc = await Setting.findOne({ key: 'global' });
  if (!doc) {
    await Setting.updateOne({ key: 'global' }, { $setOnInsert: { key: 'global' } }, { upsert: true });
    doc = await Setting.findOne({ key: 'global' });
  }
  cache = doc.toObject();
  return cache;
}

export function invalidateSettings() {
  cache = null;
}

/** Applies a partial update, bumps the version and keeps a snapshot of the previous version. */
export async function updateSettings(patch, adminId, note) {
  const current = await Setting.findOne({ key: 'global' });
  await SettingHistory.create({
    scope: 'settings',
    refId: 'global',
    version: current.version,
    snapshot: current.toObject(),
    changedBy: adminId,
    note,
  });
  current.set(patch);
  current.version += 1;
  current.updatedBy = adminId;
  await current.save();
  invalidateSettings();
  return current.toObject();
}

export function badgeLadder(settings) {
  return [...(settings.badges || [])].sort((a, b) => a.threshold - b.threshold);
}

export function badgeRank(settings, key) {
  return badgeLadder(settings).findIndex((b) => b.key === key);
}
