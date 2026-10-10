import Package from '../models/Package.js';
import Course from '../models/Course.js';
import { getSettings, badgeLadder } from '../services/settingsService.js';
import { findSponsor } from './authController.js';
import { round2 } from '../utils/money.js';
import env from '../config/env.js';

export async function listPackages(_req, res) {
  const settings = await getSettings();
  const packages = await Package.find({ status: 'active' }).sort({ sortOrder: 1, price: 1 }).lean();
  res.json({
    packages: packages.map((p) => ({
      _id: p._id,
      key: p.key,
      name: p.name,
      price: p.price,
      activeIncome: p.activeIncome,
      passiveLevels: p.passiveLevels,
      passiveTotal: round2(p.passiveLevels.reduce((a, b) => a + b, 0)),
      nonWorkingBonus: p.nonWorkingBonus,
      weeklyEligible: p.weeklyEligible,
      description: p.description,
      benefits: p.benefits,
      courses: p.courses || [],
    })),
    tax: settings.tax,
  });
}

/** Course catalog. Each course lists the active bundles (packages) that include it, cheapest first. */
export async function listCourses(_req, res) {
  const [courses, packages] = await Promise.all([
    Course.find({ status: 'active' }).sort({ sortOrder: 1, title: 1 }).lean(),
    Package.find({ status: 'active' }).sort({ price: 1 }).select('key name price courses').lean(),
  ]);
  res.json({
    courses: courses.map((c) => ({
      _id: c._id,
      slug: c.slug,
      title: c.title,
      category: c.category,
      level: c.level,
      icon: c.icon,
      summary: c.summary,
      description: c.description,
      outcomes: c.outcomes,
      modules: c.modules,
      bundles: packages.filter((p) => (p.courses || []).includes(c.slug)).map((p) => ({ key: p.key, name: p.name, price: p.price })),
    })),
  });
}

export async function sponsorLookup(req, res) {
  const sponsor = await findSponsor(req.params.code);
  if (!sponsor || sponsor.status !== 'active') return res.status(404).json({ message: 'Sponsor not found' });
  res.json({ memberId: sponsor.memberId, fullName: sponsor.fullName });
}

export async function siteInfo(_req, res) {
  const s = await getSettings();
  res.json({
    site: s.site,
    plan: {
      weekly: { percent: s.weekly.percent, qualifyingSales: s.weekly.qualifyingSales },
      monthlyBonus: s.monthlyBonus,
      badges: badgeLadder(s),
      royalty: s.royalty,
      withdrawal: { tdsPercent: s.withdrawal.tdsPercent, adminChargePercent: s.withdrawal.adminChargePercent, min: s.withdrawal.min },
    },
  });
}

/* ---------- Search engines ---------- */

export function robotsTxt(_req, res) {
  res.type('text/plain').send(
    ['User-agent: *', 'Disallow: /app', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${env.clientUrl}/sitemap.xml`, ''].join('\n'),
  );
}

/** Public pages plus one entry per active course. */
export async function sitemapXml(_req, res) {
  const courses = await Course.find({ status: 'active' }).sort({ sortOrder: 1 }).select('slug updatedAt').lean();
  const pages = ['/', '/courses', '/why-us', '/vision-mission', '/pricing', '/about', '/contact'].map((p) => ({ loc: p }));
  const entries = [...pages, ...courses.map((c) => ({ loc: `/courses/${c.slug}`, lastmod: c.updatedAt }))];
  const xml = entries
    .map((e) => `  <url><loc>${env.clientUrl}${e.loc}</loc>${e.lastmod ? `<lastmod>${new Date(e.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`)
    .join('\n');
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml}\n</urlset>\n`,
  );
}
