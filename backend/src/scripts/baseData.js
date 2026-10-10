import crypto from 'node:crypto';
import env from '../config/env.js';
import Package from '../models/Package.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { getSettings } from '../services/settingsService.js';
import { nextMemberId } from '../utils/ids.js';
import { passwordRule } from '../controllers/validators.js';
import { DEFAULT_COURSES, DEFAULT_BUNDLE_COURSES } from './courseData.js';

// Defaults from the System Requirements Document (tax slab + package models). Packages are shown to people as
// course bundles; `courses` lists the catalog courses each bundle includes. Admin can edit later.
// passiveLevels[0] = Level 1 (sponsor's sponsor), passiveLevels[1] = Level 2, …
export const DEFAULT_PACKAGES = [
  {
    key: 'starter', name: 'Starter', price: 1300, activeIncome: 800, passiveLevels: [100], nonWorkingBonus: 0, weeklyEligible: false, sortOrder: 1,
    description: 'Begin your digital-skills journey.',
    benefits: ['Communication Skills', 'Personal Branding', '1 level passive income'],
  },
  {
    key: 'basic', name: 'Basic', price: 3000, activeIncome: 1500, passiveLevels: [200, 100], nonWorkingBonus: 0, weeklyEligible: false, sortOrder: 2,
    description: 'Core social-media skills to start creating.',
    benefits: ['Everything in Starter', 'Instagram Mastery', 'Graphic Design', '2 levels passive income'],
  },
  {
    key: 'standard', name: 'Standard', price: 5000, activeIncome: 2000, passiveLevels: [300, 50, 100, 150, 25], nonWorkingBonus: 200, weeklyEligible: true, sortOrder: 3,
    description: 'Create content and grow an audience.',
    benefits: ['Everything in Basic', 'YouTube Mastery', 'Video Editing', '5 levels passive income', 'Weekly income eligible'],
  },
  {
    key: 'premium', name: 'Premium', price: 11000, activeIncome: 4500, passiveLevels: [600, 75, 150, 300, 37.5, 18, 10], nonWorkingBonus: 500, weeklyEligible: true, sortOrder: 4,
    description: 'Paid ads and lead generation for growth.',
    benefits: ['Everything in Standard', 'Meta Ads', 'Lead Generation', '7 levels passive income', 'Weekly income eligible'],
  },
  {
    key: 'pro', name: 'Pro', price: 18600, activeIncome: 7000, passiveLevels: [1000, 125, 250, 500, 75, 25, 13, 10, 13, 13, 13, 13], nonWorkingBonus: 1000, weeklyEligible: true, sortOrder: 5,
    description: 'The complete skill matrix, including AI tools.',
    benefits: ['All 10 trending skills', 'Sales Mastery', 'AI Tools Mastery', '12 levels passive income', 'Weekly income eligible'],
  },
].map((p) => ({ ...p, courses: DEFAULT_BUNDLE_COURSES[p.key] }));

const isStrong = (pw) => passwordRule.safeParse(pw || '').success;

/** Idempotent: creates settings, courses, packages, the first admin and the company root member if missing. */
export async function ensureBaseData({ log = true } = {}) {
  await getSettings();

  for (const c of DEFAULT_COURSES) {
    await Course.updateOne({ slug: c.slug }, { $setOnInsert: c }, { upsert: true });
  }

  for (const p of DEFAULT_PACKAGES) {
    await Package.updateOne({ key: p.key }, { $setOnInsert: p }, { upsert: true });
    // Packages created before the course catalog existed get their default course list once.
    await Package.updateOne({ key: p.key, courses: { $exists: false } }, { $set: { courses: p.courses } });
  }

  if (!(await User.exists({ role: 'admin' }))) {
    if (!isStrong(env.admin.password)) {
      throw new Error(
        'No administrator exists yet. Set a strong ADMIN_PASSWORD in backend/.env ' +
          '(8+ characters with a letter, a number and a symbol) and start the server again.',
      );
    }
    await User.create({
      role: 'admin',
      username: env.admin.username,
      fullName: 'Administrator',
      email: env.admin.email || undefined,
      password: await User.hash(env.admin.password),
      status: 'active',
    });
    if (log) console.log(`[setup] administrator created → username "${env.admin.username}" (password = ADMIN_PASSWORD in .env)`);
  }

  if (!(await User.exists({ isRoot: true }))) {
    const pro = await Package.findOne({ key: 'pro' });
    // The root member is the company's own account at the top of the tree. Without ROOT_PASSWORD it gets
    // an unguessable password; the admin can set one later from Members → iSkillMatrix → Reset password.
    const rootPassword = isStrong(env.rootPassword) ? env.rootPassword : `${crypto.randomBytes(24).toString('base64url')}#9A`;
    const root = await User.create({
      role: 'member',
      isRoot: true,
      memberId: await nextMemberId(),
      username: 'iskillmatrix',
      fullName: 'iSkillMatrix',
      email: env.admin.email || undefined,
      password: await User.hash(rootPassword),
      txnPassword: await User.hash(crypto.randomBytes(24).toString('base64url')),
      status: 'active',
      approvedAt: new Date(),
      package: pro._id,
      selectedPackage: pro._id,
      packageActivatedAt: new Date(),
      kycStatus: 'not_submitted',
    });
    if (log) {
      console.log(
        `[setup] company root member created → ${root.memberId} (username "iskillmatrix"). ` +
          'Share this member ID as the sponsor code for your first members.',
      );
    }
  }
}
