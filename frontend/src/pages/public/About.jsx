import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, BookOpen, Repeat, Sparkles, Share2, TrendingUp, GraduationCap } from 'lucide-react';
import { useCoursesQuery } from '../../api/publicApi';
import { Button } from '../../components/ui';
import { categoryTone } from '../../components/common/CourseIcon';
import { usePageTitle } from '../../lib/usePageTitle';
import {
  container, SectionHeader, TextLink, FounderFigure, VisionMissionSection, CtaBand, courseThumbnail, courseMeta,
} from './sections';
import { ABOUT_HEADLINE, ABOUT_TEXT, VALUES } from './content';

const cardShadow = 'shadow-[0_14px_30px_-12px_rgb(38_39_44/0.35)]';

/* ---------- Hero ---------- */

const COLLAGE = ['graphic-design', 'instagram-mastery', 'video-editing', 'ai-tools-mastery'];

/** Four course photos in a staggered grid, with a "learn by doing" badge. */
function HeroCollage() {
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {COLLAGE.map((slug, i) => (
          <img key={slug} src={courseThumbnail({ slug })} alt="" width={1200} height={800} decoding="async"
            className={`aspect-[4/3] w-full rounded-2xl object-cover object-[center_35%] ${cardShadow} ${i % 2 ? 'translate-y-6 sm:translate-y-8' : ''}`} />
        ))}
      </div>
      <div className={`absolute -bottom-3 left-3 flex items-center gap-3 rounded-2xl border border-line bg-ink-950 px-4 py-3 sm:-left-5 ${cardShadow}`}>
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
          <GraduationCap className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-bold text-fg">Learn by doing</span>
          <span className="block text-xs text-muted">Short modules, clear topics</span>
        </span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className={`${container} pt-6`}>
      {/* Extra bottom padding: the stats card overlaps the bottom of this panel */}
      <div className="relative overflow-hidden rounded-3xl bg-brand-50 px-5 pt-12 pb-24 sm:px-10 sm:pt-16 sm:pb-28">
        <span aria-hidden className="absolute -top-32 -right-24 size-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <p className="text-sm font-semibold text-gold-400">About us</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-fg sm:text-[2.6rem] sm:leading-[1.1]">{ABOUT_HEADLINE}</h1>
            <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
              iSkillMatrix is an online learning platform for the skills people use every day to create content, run campaigns and
              sell online — taught step by step, so you can put each lesson to work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/courses" variant="accent" size="lg">Explore courses <ArrowRight className="size-4" /></Button>
              <Button to="/contact" variant="quiet" size="lg">Talk to us</Button>
            </div>
          </div>
          <HeroCollage />
        </div>
      </div>
    </section>
  );
}

/* ---------- Catalog numbers ---------- */

/** Numbers counted from the live catalog, so they're always true. */
function CatalogStats() {
  const { data, isLoading } = useCoursesQuery();
  const courses = useMemo(() => data?.courses || [], [data]);
  if (!isLoading && !courses.length) return null;

  const stats = [
    [courses.length, 'Courses'],
    [new Set(courses.map((c) => c.category)).size, 'Skill areas'],
    [courses.reduce((n, c) => n + c.modules.length, 0), 'Modules'],
    [courses.reduce((n, c) => n + courseMeta(c).topics, 0), 'Topics covered'],
  ];
  return (
    <section className={`${container} relative -mt-12 sm:-mt-14`}>
      <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4 ${cardShadow}`}>
        {stats.map(([value, label]) => (
          <div key={label} className="flex flex-col-reverse bg-ink-950 px-5 py-5 sm:px-8 sm:py-6">
            <dt className="mt-1 text-sm text-muted">{label}</dt>
            <dd className="text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
              {isLoading ? <span className="inline-block h-9 w-14 animate-pulse rounded-lg bg-ink-900 align-middle" /> : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ---------- Our story ---------- */

const STORY_POINTS = [
  'Short modules with clear topics',
  'Taught by people who do the work',
  'Bundles: several skills, one fee',
  'One-time payment, GST included',
];

function Story() {
  return (
    <section className={`${container} grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_1.25fr] lg:gap-16`}>
      <FounderFigure className="order-last lg:order-first lg:ml-0" />
      <div>
        <p className="text-sm font-semibold text-gold-400">Our story</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg sm:text-3xl">Built for people who learn by doing</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-muted">
          <p>{ABOUT_TEXT}</p>
          <p>
            Most people don’t need more theory. They need to know what to open, what to make and what to practise next. So every course
            is split into short modules with clear topics, and every lesson is something you can use straight away.
          </p>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {STORY_POINTS.map((p) => (
            <li key={p} className="flex gap-2.5 text-sm font-medium text-fg">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-400"><Check className="size-3.5" /></span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-8"><TextLink to="/why-us">Why learners choose us</TextLink></div>
      </div>
    </section>
  );
}

/* ---------- How we teach ---------- */

// One icon per step in VALUES (Learn, Practise, Create, Share, Grow)
const VALUE_ICONS = [BookOpen, Repeat, Sparkles, Share2, TrendingUp];

function HowWeTeach() {
  return (
    <section className="bg-ink-900">
      <div className={`${container} py-16 sm:py-20`}>
        <SectionHeader title="How we teach"
          description="Every course follows the same simple path — from your first lesson to helping someone else start theirs." />
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          <span aria-hidden className="absolute top-6 right-[10%] left-[10%] hidden h-px bg-gradient-to-r from-brand-500/50 via-brand-500/30 to-gold-400/50 lg:block" />
          {VALUES.map(([title, text], i) => {
            const Icon = VALUE_ICONS[i] || Sparkles;
            const last = i === VALUES.length - 1;
            return (
              <li key={title} className="relative lg:text-center">
                <span className={`relative grid size-12 place-items-center rounded-2xl ring-4 ring-ink-900 lg:mx-auto ${last ? 'bg-gold-400 text-white' : 'bg-brand-600 text-white'}`}>
                  <Icon className="size-5" />
                </span>
                <p className="mt-4 text-xs font-semibold text-subtle">Step {i + 1}</p>
                <h3 className="mt-0.5 text-lg font-semibold text-fg">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ---------- What we teach ---------- */

/** One skill area: the photo of its first course, its name and the courses in it. */
function SkillAreaCard({ name, courses }) {
  const photo = courses.map((c) => courseThumbnail(c)).find(Boolean);
  return (
    <Link to={`/courses?category=${encodeURIComponent(name)}`}
      className={`group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl p-5 sm:p-6 ${photo ? 'bg-char-900' : categoryTone(name)}`}>
      {photo && (
        <img src={photo} alt="" width={1200} height={800} loading="lazy" decoding="async"
          className="absolute inset-0 -z-10 size-full object-cover object-[center_35%] transition duration-500 group-hover:scale-105" />
      )}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/0" />
      <span className="absolute top-4 left-4 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-char-900">
        {courses.length} course{courses.length === 1 ? '' : 's'}
      </span>
      <h3 className="text-xl font-bold text-white">{name}</h3>
      <p className="mt-1 line-clamp-1 text-sm text-white/75">{courses.map((c) => c.title).join(' · ')}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white">
        Explore <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Skill areas (course categories) from the live catalog. */
function WhatWeTeach() {
  const { data, isLoading } = useCoursesQuery();
  const areas = useMemo(() => {
    const map = new Map();
    for (const c of data?.courses || []) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category).push(c);
    }
    return [...map].map(([name, courses]) => ({ name, courses }));
  }, [data]);
  if (!isLoading && !areas.length) return null;

  return (
    // No bottom padding: the vision & mission section below brings its own
    <section className={`${container} pt-16 sm:pt-20`}>
      <SectionHeader title="What we teach"
        description={areas.length ? `Practical courses across ${areas.length} skill areas. Pick one to see its courses.` : 'Practical courses across in-demand skill areas.'}
        action={<TextLink to="/courses">See all courses</TextLink>} />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-ink-900" />)
          : areas.map((a) => <SkillAreaCard key={a.name} {...a} />)}
      </div>
    </section>
  );
}

export default function About() {
  usePageTitle('About us', 'iSkillMatrix is an online learning platform for practical digital skills — AI tools, design, video, social media, marketing and sales.');
  return (
    <>
      <Hero />
      <CatalogStats />
      <Story />
      <HowWeTeach />
      <WhatWeTeach />
      <VisionMissionSection />
      <CtaBand />
    </>
  );
}
