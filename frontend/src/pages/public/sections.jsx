import { Link } from 'react-router-dom';
import { ArrowRight, Check, Plus, UserPlus, BadgeCheck, QrCode, GraduationCap, WifiOff, Flag, Eye, Quote } from 'lucide-react';
import { Button } from '../../components/ui';
import CourseIcon, { categoryTone } from '../../components/common/CourseIcon';
import { inr } from '../../lib/format';
import { ABOUT_HEADLINE, ABOUT_TEXT, FOUNDER, MISSION, VISION, VALUES, WHY_POINTS, TESTIMONIALS } from './content';

/* ---------- Layout ---------- */

export const container = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

/** Left-aligned section heading with an optional link on the right. */
export function SectionHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 ${className}`}>
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function TextLink({ to, children }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-300 hover:text-brand-200">
      {children} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Top of an inner page (Courses, Pricing, About, Contact). */
export function PageIntro({ eyebrow, title, description, children }) {
  return (
    <section className={`${container} pt-6`}>
      <div className="rounded-3xl bg-brand-50 px-5 py-12 sm:px-10 sm:py-16">
        {eyebrow && <p className="text-sm font-semibold text-gold-400">{eyebrow}</p>}
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-fg sm:text-[2.6rem] sm:leading-[1.1]">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">{description}</p>}
        {children}
      </div>
    </section>
  );
}

/** Shown when the catalog can't be loaded (API down, no connection). */
export function LoadError({ onRetry }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-900 px-6 py-10 text-center">
      <WifiOff className="mx-auto size-8 text-subtle" />
      <p className="mt-3 font-semibold text-fg">Courses couldn’t be loaded</p>
      <p className="mt-1 text-sm text-muted">Check your connection and try again.</p>
      {onRetry && <Button variant="quiet" className="mt-5" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/* ---------- Courses ---------- */

const topicCount = (course) => course.modules.reduce((n, m) => n + m.topics.length, 0);
export const courseMeta = (course) => ({ modules: course.modules.length, topics: topicCount(course), from: course.bundles[0] });

// Courses with a photo thumbnail in public/courseThumbnails/<slug>.webp. Courses the admin adds later keep the colour cover.
const COURSE_THUMBNAILS = new Set([
  'ai-tools-mastery', 'graphic-design', 'video-editing', 'instagram-mastery', 'youtube-mastery',
  'meta-ads', 'lead-generation', 'sales-mastery', 'communication-skills', 'personal-branding',
]);
export const courseThumbnail = (course) => (COURSE_THUMBNAILS.has(course.slug) ? `/courseThumbnails/${course.slug}.webp` : null);

/** Course cover: the course's photo thumbnail, or a category-colour panel with the course icon, like a class poster. */
export function CourseCover({ course, className = 'aspect-[16/10]', rounded = 'rounded-xl', large = false }) {
  const thumbnail = courseThumbnail(course);
  if (thumbnail) {
    return (
      <div className={`relative overflow-hidden bg-ink-900 ${rounded} ${className}`}>
        {/* Decorative: the course title is always shown next to the cover */}
        <img src={thumbnail} alt="" width={1200} height={800} loading={large ? 'eager' : 'lazy'} decoding="async"
          className="absolute inset-0 size-full object-cover object-[center_35%]" />
        <span className="absolute bottom-4 left-4 rounded-md bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">{course.category}</span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${categoryTone(course.category)} ${rounded} ${className}`}>
      <CourseIcon icon={course.icon}
        className={`absolute -right-5 -bottom-6 rotate-[-12deg] text-white/[0.13] ${large ? 'size-48' : 'size-32'}`} />
      <span className={`absolute top-4 left-4 grid place-items-center rounded-xl bg-white/15 text-white ${large ? 'size-14' : 'size-10'}`}>
        <CourseIcon icon={course.icon} className={large ? 'size-7' : 'size-5'} />
      </span>
      <span className="absolute bottom-4 left-4 rounded-md bg-black/25 px-2 py-0.5 text-[11px] font-medium text-white/90">{course.category}</span>
    </div>
  );
}

export function CourseCard({ course }) {
  const { modules, from } = courseMeta(course);
  return (
    <Link to={`/courses/${course.slug}`} className="group block">
      <CourseCover course={course} className="aspect-[16/10] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_30px_-12px_rgb(38_39_44/0.35)]" />
      <div className="pt-3.5">
        <h3 className="font-semibold text-fg group-hover:text-brand-200">{course.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{course.summary}</p>
        <p className="mt-2 text-xs text-subtle">{course.level} · {modules} module{modules === 1 ? '' : 's'}</p>
        <p className="mt-2 text-sm">
          {from ? <>From <span className="font-semibold text-fg">{inr(from.price)}</span></> : <span className="text-subtle">Coming soon</span>}
        </p>
      </div>
    </Link>
  );
}

export function CourseGridSkeleton({ count = 8, className = 'grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4' }) {
  return (
    <div className={className} aria-busy="true" aria-label="Loading courses">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className="aspect-[16/10] animate-pulse rounded-xl bg-ink-900" />
          <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-ink-900" />
          <div className="mt-2 h-3 w-full animate-pulse rounded bg-ink-900" />
        </div>
      ))}
    </div>
  );
}

/** Course slug → course, for showing bundle contents. */
export const courseMapOf = (courses = []) => Object.fromEntries(courses.map((c) => [c.slug, c]));

/* ---------- Bundles ---------- */

export function BundleCard({ bundle, courseMap = {}, featured }) {
  const included = (bundle.courses || []).map((slug) => courseMap[slug]).filter(Boolean);
  return (
    <div className={`relative flex flex-col rounded-2xl p-6 ${featured ? 'bg-char-900 text-white' : 'border border-line bg-ink-950'}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold">{bundle.name}</h3>
        {featured && <span className="rounded-full bg-brand-400 px-2.5 py-0.5 text-xs font-bold text-white">Best value</span>}
      </div>
      {bundle.description && <p className={`mt-1 text-sm ${featured ? 'text-white/70' : 'text-muted'}`}>{bundle.description}</p>}
      <p className="mt-5 text-3xl font-extrabold tracking-tight">{inr(bundle.price)}</p>
      <p className={`text-xs ${featured ? 'text-white/65' : 'text-subtle'}`}>One-time, incl. GST</p>

      <p className={`mt-6 text-sm font-semibold ${featured ? 'text-brand-400' : 'text-fg'}`}>{included.length} course{included.length === 1 ? '' : 's'}</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {included.map((c) => (
          <li key={c.slug} className="flex gap-2">
            <Check className={`mt-0.5 size-4 shrink-0 ${featured ? 'text-brand-400' : 'text-brand-300'}`} />
            <Link to={`/courses/${c.slug}`} className={featured ? 'text-white/90 hover:text-white' : 'text-muted hover:text-fg'}>{c.title}</Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-7">
        <Button to={`/register?bundle=${bundle.key}`} variant={featured ? 'accent' : 'quiet'} className="w-full">Enroll in {bundle.name}</Button>
      </div>
    </div>
  );
}

/* ---------- About ---------- */

/** The founder's photo on an offset orange panel, with a name card (homepage and About page). */
export function FounderFigure({ className = '' }) {
  return (
    // Padding makes room for the orange panel, so photo + panel stay inside the container edge
    <figure className={`relative mx-auto w-full max-w-sm pr-3 pb-3 sm:pr-4 sm:pb-4 ${className}`}>
      <span aria-hidden className="absolute top-3 right-0 bottom-0 left-3 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 sm:top-4 sm:left-4" />
      <img src="/founder/founder.png" alt={FOUNDER.name ? `${FOUNDER.name}, ${FOUNDER.role}` : FOUNDER.role}
        width={1696} height={2528} loading="lazy" decoding="async"
        className="relative aspect-[4/5] w-full rounded-3xl object-cover object-top" />
      <figcaption className="absolute -bottom-2 left-4 rounded-2xl border border-line bg-ink-950 px-4 py-3 shadow-[0_14px_30px_-12px_rgb(38_39_44/0.35)]">
        <p className="font-bold text-fg">{FOUNDER.name || 'Meet our founder'}</p>
        <p className="text-sm text-muted">{FOUNDER.role}</p>
      </figcaption>
    </figure>
  );
}

/** Homepage "About us": who we are on the left, the founder's photo on the right. */
export function AboutSection() {
  return (
    <section id="about" className={`${container} grid scroll-mt-16 items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-16`}>
      <div>
        <p className="text-sm font-semibold text-gold-400">About us</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg sm:text-3xl">{ABOUT_HEADLINE}</h2>
        <div className="mt-4 space-y-4 leading-relaxed text-muted">
          <p>{ABOUT_TEXT}</p>
          <p>Every course is organised into modules and topics, so you always know what you’re learning and what comes next.</p>
        </div>
        <ol className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          {VALUES.map(([title], i) => (
            <li key={title} className="flex items-center gap-2">
              {i > 0 && <ArrowRight aria-hidden className="size-3.5 text-subtle" />}
              <span className="rounded-full border border-line px-3 py-1 font-medium text-fg">{title}</span>
            </li>
          ))}
        </ol>
        <Button to="/about" variant="accent" className="mt-8">More about us <ArrowRight className="size-4" /></Button>
      </div>
      <FounderFigure className="lg:mr-0" />
    </section>
  );
}

/* ---------- Why us, vision & mission ---------- */

/** One reason in the "Why us" lists. */
export function WhyPoint({ icon: Icon, title, text }) {
  return (
    <div className="border-t border-line pt-5">
      <Icon className="size-5 text-brand-400" />
      <h3 className="mt-3 font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </div>
  );
}

export function WhyUsSection() {
  return (
    <section id="why-us" className="scroll-mt-16 bg-ink-900">
      <div className={`${container} grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1.5fr] lg:gap-16`}>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Why us</h2>
          <p className="mt-3 text-muted">
            Learning built around doing. Every course is broken into short modules with clear topics, so you always know what you’re
            learning next — and why it matters for the work you want to do.
          </p>
          <div className="mt-5"><TextLink to="/why-us">More reasons to learn with us</TextLink></div>
        </div>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {WHY_POINTS.slice(0, 4).map(([icon, title, text]) => <WhyPoint key={title} icon={icon} title={title} text={text} />)}
        </div>
      </div>
    </section>
  );
}

/** Mission (orange panel) and vision (grey panel) side by side. */
export function MissionVisionCards({ large = false }) {
  const text = large ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 ${large ? 'p-8 sm:p-10' : 'p-6 sm:p-8'}`}>
        <Flag aria-hidden className="absolute -right-4 -bottom-6 size-36 rotate-[-12deg] text-white/[0.14]" />
        <p className="relative text-sm font-semibold text-white/85">Our mission</p>
        <p className={`relative mt-3 leading-snug font-semibold text-white ${text}`}>{MISSION}</p>
      </div>
      <div className={`relative overflow-hidden rounded-2xl border border-line bg-ink-900 ${large ? 'p-8 sm:p-10' : 'p-6 sm:p-8'}`}>
        <Eye aria-hidden className="absolute -right-4 -bottom-6 size-36 rotate-[-12deg] text-fg/[0.05]" />
        <p className="relative text-sm font-semibold text-gold-400">Our vision</p>
        <p className={`relative mt-3 leading-snug font-semibold text-fg ${text}`}>{VISION}</p>
      </div>
    </div>
  );
}

export function VisionMissionSection() {
  return (
    <section id="vision-mission" className={`${container} scroll-mt-16 py-16 sm:py-20`}>
      <SectionHeader title="Vision & mission" description="What we’re working towards, and how we get there."
        action={<TextLink to="/vision-mission">Read more</TextLink>} />
      <div className="mt-8"><MissionVisionCards /></div>
    </section>
  );
}

/* ---------- How it works ---------- */

export const ENROLL_STEPS = [
  [UserPlus, 'Create your account', 'Sign up with the referral code of the person who introduced you, and pick a bundle.'],
  [BadgeCheck, 'Get approved', 'Our team checks your details and approves your account.'],
  [QrCode, 'Pay by QR', 'Log in and pay the one-time fee with any UPI app.'],
  [GraduationCap, 'Start learning', 'Once the payment is verified, your bundle is active and your courses unlock.'],
];

export function Steps() {
  return (
    <ol className="relative mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      <span aria-hidden className="absolute top-5 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-brand-500/50 via-brand-500/30 to-gold-400/50 lg:block" />
      {ENROLL_STEPS.map(([Icon, title, text], i) => (
        <li key={title} className="relative">
          <span className={`relative grid size-10 place-items-center rounded-full ring-4 ring-ink-950 ${i === ENROLL_STEPS.length - 1 ? 'bg-gold-400 text-ink-950' : 'bg-brand-600 text-white'}`}>
            <Icon className="size-[18px]" />
          </span>
          <p className="mt-4 text-xs font-semibold text-subtle">Step {i + 1}</p>
          <h3 className="mt-0.5 font-semibold text-fg">{title}</h3>
          <p className="mt-1 text-sm text-muted">{text}</p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Success stories ---------- */

function TestimonialCard({ quote, name, place, course }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <figure className="flex h-full flex-col rounded-2xl bg-char-900 p-6 text-white sm:p-7">
      <Quote aria-hidden className="size-7 text-brand-400" />
      <blockquote className="mt-4 leading-relaxed text-white/90">“{quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-6">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
          {initials}
        </span>
        <span>
          <span className="block font-semibold">{name}</span>
          <span className="block text-sm text-white/65">{course} · {place}</span>
        </span>
      </figcaption>
    </figure>
  );
}

// Each half of the marquee track repeats the stories until it's wider than the container, so the loop never shows a gap.
const MARQUEE_HALF = Array.from({ length: Math.ceil(6 / TESTIMONIALS.length) }, () => TESTIMONIALS).flat();
const MARQUEE_TRACK = [...MARQUEE_HALF, ...MARQUEE_HALF];

/**
 * Homepage testimonials, sliding right to left in a loop. Hovering or tabbing into a card pauses it; with reduced
 * motion it stays still and scrolls by hand, showing each story once.
 */
export function TestimonialsSection() {
  return (
    <section id="success-stories" className={`${container} scroll-mt-16 py-16 sm:py-20`}>
      <SectionHeader title="Our success stories" description="What learners have made with the skills from their courses." />
      <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]
        motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]">
        <div className="flex w-max animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none">
          {MARQUEE_TRACK.map((t, i) => {
            const copy = i >= TESTIMONIALS.length; // repeats exist only for the loop: hide them from screen readers
            return (
              // Spacing is padding, not flex gap, so the two halves are exactly the same width
              <div key={i} aria-hidden={copy || undefined} className={`w-[19rem] shrink-0 pr-4 sm:w-[22rem] ${copy ? 'motion-reduce:hidden' : ''}`}>
                <TestimonialCard {...t} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

export const FAQS = [
  ['How do I enroll in a course?', 'Courses come in bundles. Choose the bundle that has the courses you want, create your account with a referral code, log in straight away and pay by QR.'],
  ['Can I get just one course?', 'Every course is part of one or more bundles. Open a course to see which bundles include it — the most affordable one is listed first.'],
  ['Is it a one-time fee?', 'Yes. Bundle prices are a one-time fee with GST included. Bundles can’t be upgraded later, so pick the one that covers everything you want to learn.'],
  ['How do I pay?', 'Log in and pay by scanning our QR code or using the UPI ID. Enter the UTR / reference number and upload a screenshot. Your bundle activates as soon as we verify the payment.'],
  ['Do I need a referral code?', 'Yes, sign-up asks for the referral code (member ID) of the person who introduced you to AroviaSkillTech. Don’t have one? Contact us and we’ll help.'],
];

export function FaqSection({ className = '' }) {
  return (
    <section className={`${container} grid gap-8 py-16 sm:py-20 lg:grid-cols-[1fr_1.6fr] lg:gap-16 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Questions, answered</h2>
        <p className="mt-3 text-muted">Can’t find what you’re looking for?</p>
        <TextLink to="/contact">Talk to us</TextLink>
      </div>
      <div className="divide-y divide-line border-y border-line">
        {FAQS.map(([q, a]) => (
          <details key={q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-fg [&::-webkit-details-marker]:hidden">
              {q}
              <Plus className="size-5 shrink-0 text-subtle transition group-open:rotate-45" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- Closing call to action ---------- */

export function CtaBand() {
  return (
    <section className={`${container} pb-20`}>
      <div className="relative overflow-hidden rounded-3xl bg-char-900 px-6 py-10 sm:px-12 sm:py-14">
        <span aria-hidden className="absolute -top-24 -right-16 size-72 rounded-full bg-brand-400/30 blur-3xl" />
        <GraduationCap aria-hidden className="absolute -right-6 -bottom-10 size-56 rotate-[-12deg] text-white/[0.06]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Your next skill starts with one course.</h2>
            <p className="mt-2 text-white/70">Browse the catalog, pick a bundle that fits, and start learning this week.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to="/courses" variant="accent" size="lg">Browse courses</Button>
            <Button to="/register" size="lg" variant="onBrand">Create account</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export { Link };
