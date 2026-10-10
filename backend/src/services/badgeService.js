import User from '../models/User.js';
import { getSettings, badgeLadder, badgeRank } from './settingsService.js';
import { notify } from './notificationService.js';
import { audit } from './auditService.js';

/**
 * Adds qualifying income to a member's lifetime earnings and awards the highest badge reached.
 * Badges are permanent: they are never removed if earnings later decrease.
 */
export async function addLifetimeEarnings(userId, amount) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { lifetimeEarnings: amount } },
    { returnDocument: 'after' },
  );
  if (!user) return;
  await evaluateBadge(user);
}

export async function evaluateBadge(user) {
  const settings = await getSettings();
  const reached = badgeLadder(settings).filter((b) => user.lifetimeEarnings >= b.threshold);
  const best = reached[reached.length - 1];
  if (!best) return;
  if (badgeRank(settings, best.key) <= badgeRank(settings, user.badge)) return;

  const now = new Date();
  // Conditional update so two concurrent credits cannot both award the same badge.
  const updated = await User.findOneAndUpdate(
    { _id: user._id, badge: user.badge ?? null },
    {
      $set: { badge: best.key, badgeAchievedAt: now },
      $push: { badgeHistory: { badge: best.key, achievedAt: now, lifetimeEarnings: user.lifetimeEarnings } },
    },
    { returnDocument: 'after' },
  );
  if (!updated) return;
  await notify(user._id, {
    title: `Congratulations! You are now ${best.name}`,
    message: `Your lifetime earnings crossed ₹${best.threshold.toLocaleString('en-IN')}. This achievement is permanent.`,
    type: 'badge',
    link: '/app/achievements',
    email: true,
  });
  await audit(null, 'badge.achieved', {
    entityType: 'User',
    entityId: user._id,
    details: { from: user.badge, to: best.key, lifetimeEarnings: user.lifetimeEarnings },
  });
}

export function badgeProgress(settings, user) {
  const ladder = badgeLadder(settings);
  const idx = ladder.findIndex((b) => b.key === user.badge);
  const current = idx >= 0 ? ladder[idx] : null;
  const next = ladder[idx + 1] || null;
  const floor = current ? current.threshold : 0;
  const progress = next
    ? Math.min(100, Math.max(0, ((user.lifetimeEarnings - floor) / (next.threshold - floor)) * 100))
    : 100;
  return {
    current,
    next,
    lifetimeEarnings: user.lifetimeEarnings,
    requiredAmount: next ? Math.max(0, next.threshold - user.lifetimeEarnings) : 0,
    progress: Math.round(progress * 10) / 10,
    ladder,
  };
}
