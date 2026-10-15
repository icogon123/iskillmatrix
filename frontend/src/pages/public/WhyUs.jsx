import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useCoursesQuery, usePackagesQuery } from '../../api/publicApi';
import { Button } from '../../components/ui';
import { inr } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { container, PageIntro, SectionHeader, WhyPoint, Steps, CtaBand } from './sections';
import { WHY_POINTS } from './content';

/** Facts taken from the live catalog and bundles, so nothing here can go out of date. */
function WhatYouGet() {
  const { data: courseData } = useCoursesQuery();
  const { data: pkgData } = usePackagesQuery();
  const courses = useMemo(() => courseData?.courses || [], [courseData]);
  const bundles = pkgData?.packages || [];
  if (!courses.length || !bundles.length) return null;

  const topics = [...new Set(courses.map((c) => c.category))];
  const modules = courses.reduce((n, c) => n + c.modules.length, 0);
  const minPrice = Math.min(...bundles.map((b) => b.price));
  const facts = [
    `${courses.length} courses across ${topics.length} topics: ${topics.join(', ')}`,
    `${modules} structured modules in total, each with clear topics`,
    `${bundles.length} bundles to choose from, starting at ${inr(minPrice)}`,
    'One-time fee with GST included — no subscription',
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-char-900 p-6 sm:p-8">
      <p className="text-sm font-semibold text-brand-400">What you get</p>
      <ul className="mt-4 space-y-3">
        {facts.map((f) => (
          <li key={f} className="flex gap-3 text-white/90"><Check className="mt-0.5 size-5 shrink-0 text-brand-400" />{f}</li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button to="/courses" variant="accent">Browse courses</Button>
        <Button to="/pricing" variant="onBrand">See bundles</Button>
      </div>
    </div>
  );
}

export default function WhyUs() {
  usePageTitle('Why us', 'Why learners choose AroviaSkillTech: practical courses, structured modules, mentorship and a one-time fee with GST included.');
  return (
    <>
      <PageIntro eyebrow="Why us" title="Why learners choose AroviaSkillTech"
        description="We built AroviaSkillTech for people who want to learn a skill and put it to work straight away." />

      <section className={`${container} py-16 sm:py-20`}>
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {WHY_POINTS.map(([icon, title, text]) => <WhyPoint key={title} icon={icon} title={title} text={text} />)}
        </div>
      </section>

      <section className="bg-ink-900">
        <div className={`${container} grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16`}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Learning built around doing</h2>
            <p className="mt-3 text-muted">
              Every course is broken into short modules with clear topics, so you always know what you’re learning next — and why it
              matters for the work you want to do. Pick a course, follow the modules in order, and practise as you go.
            </p>
          </div>
          <WhatYouGet />
        </div>
      </section>

      <section className={`${container} py-16 sm:py-20`}>
        <SectionHeader title="Getting started is simple" description="From sign-up to your first lesson in four steps." />
        <Steps />
      </section>

      <CtaBand />
    </>
  );
}
