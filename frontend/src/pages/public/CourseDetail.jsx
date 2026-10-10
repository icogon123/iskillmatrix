import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Check, ChevronDown } from 'lucide-react';
import { useCoursesQuery, usePackagesQuery } from '../../api/publicApi';
import { PageLoader, Button } from '../../components/ui';
import { inr } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { container, SectionHeader, CourseCard, CourseCover, LoadError, CtaBand, courseMeta } from './sections';

/** Up to 4 other courses, same category first. */
function relatedCourses(courses, course) {
  const others = courses.filter((c) => c.slug !== course.slug);
  return [...others.filter((c) => c.category === course.category), ...others.filter((c) => c.category !== course.category)].slice(0, 4);
}

function EnrollCard({ course }) {
  const { modules, topics, from } = courseMeta(course);
  const facts = [
    ['Level', course.level],
    ['Modules', `${modules} modules · ${topics} topics`],
    ['Topic', course.category],
    ['Payment', 'One-time, GST included'],
  ];
  return (
    <div className="rounded-2xl border border-line bg-ink-950 p-4 shadow-[0_20px_40px_-24px_rgb(38_39_44/0.35)]">
      <CourseCover course={course} large className="aspect-[16/10]" />
      <div className="px-1 pt-5 pb-1">
        {from ? (
          <>
            <p className="text-sm text-muted">From</p>
            <p className="text-3xl font-extrabold tracking-tight text-fg">{inr(from.price)}</p>
            <p className="mt-0.5 text-sm text-subtle">with the {from.name} bundle</p>
            <Button to={`/register?bundle=${from.key}`} variant="accent" size="lg" className="mt-5 w-full">Enroll now</Button>
            {course.bundles.length > 1 && (
              <a href="#bundles" className="mt-3 block text-center text-sm font-medium text-brand-300 hover:text-brand-200">
                Also in {course.bundles.length - 1} other bundle{course.bundles.length > 2 ? 's' : ''}
              </a>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">This course will be added to a bundle soon. <Link to="/contact" className="font-medium text-brand-300">Ask us about it</Link>.</p>
        )}
        <dl className="mt-5 divide-y divide-line border-t border-line text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-subtle">{k}</dt>
              <dd className="text-right text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default function CourseDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError, refetch } = useCoursesQuery();
  const { data: pkgData } = usePackagesQuery();
  const courses = useMemo(() => data?.courses || [], [data]);
  const course = courses.find((c) => c.slug === slug);
  const related = useMemo(() => (course ? relatedCourses(courses, course) : []), [courses, course]);
  const bundleSize = Object.fromEntries((pkgData?.packages || []).map((p) => [p.key, p.courses.length]));
  usePageTitle(course?.title || (isLoading ? '' : 'Course not found'), course?.summary);

  if (isLoading) return <PageLoader />;
  if (isError) return <div className={`${container} py-16`}><LoadError onRetry={refetch} /></div>;
  if (!course) {
    return (
      <section className={`${container} py-24 text-center`}>
        <h1 className="text-2xl font-bold text-fg">We couldn’t find that course</h1>
        <p className="mt-2 text-muted">It may have been renamed or is no longer offered.</p>
        <Button to="/courses" variant="solid" className="mt-6">Browse all courses</Button>
      </section>
    );
  }

  const { modules, topics } = courseMeta(course);

  return (
    <>
      <div className={`${container} grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14 lg:py-14`}>
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-subtle" aria-label="Breadcrumb">
            <Link to="/courses" className="hover:text-fg">Courses</Link>
            <ChevronRight className="size-3.5" />
            <Link to={`/courses?category=${encodeURIComponent(course.category)}`} className="hover:text-fg">{course.category}</Link>
          </nav>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-fg sm:text-[2.75rem] sm:leading-[1.1]">{course.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{course.summary}</p>
          <p className="mt-5 text-sm text-subtle">{course.level} · {modules} modules · {topics} topics</p>

          <div className="mt-8 lg:hidden"><EnrollCard course={course} /></div>

          {course.description && (
            <section className="mt-12">
              <h2 className="text-xl font-bold text-fg">About this course</h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-muted">{course.description}</p>
            </section>
          )}

          {course.outcomes.length > 0 && (
            <section className="mt-12 rounded-2xl border border-line p-6">
              <h2 className="text-xl font-bold text-fg">What you’ll learn</h2>
              <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex gap-3 text-sm text-muted"><Check className="mt-0.5 size-4 shrink-0 text-brand-300" />{o}</li>
                ))}
              </ul>
            </section>
          )}

          {modules > 0 && (
            <section className="mt-12">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold text-fg">Curriculum</h2>
                <p className="text-sm text-subtle">{modules} modules · {topics} topics</p>
              </div>
              <div className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {course.modules.map((m, i) => (
                  <details key={`${i}-${m.title}`} className="group" open={i === 0}>
                    <summary className="flex cursor-pointer list-none items-center gap-4 bg-ink-900/70 px-5 py-4 hover:bg-ink-900 [&::-webkit-details-marker]:hidden">
                      <span className="w-16 shrink-0 text-xs font-medium text-subtle">Module {i + 1}</span>
                      <span className="flex-1 font-medium text-fg">{m.title}</span>
                      <span className="hidden text-xs text-subtle sm:inline">{m.topics.length} topic{m.topics.length === 1 ? '' : 's'}</span>
                      <ChevronDown className="size-4 shrink-0 text-subtle transition group-open:rotate-180" />
                    </summary>
                    {m.topics.length > 0 && (
                      <ul className="space-y-2 px-5 py-4 text-sm text-muted sm:pl-[6.25rem]">
                        {m.topics.map((t) => <li key={t}>{t}</li>)}
                      </ul>
                    )}
                  </details>
                ))}
              </div>
            </section>
          )}

          {course.bundles.length > 0 && (
            <section id="bundles" className="mt-12 scroll-mt-24">
              <h2 className="text-xl font-bold text-fg">Bundles with this course</h2>
              <p className="mt-1 text-sm text-muted">Each bundle is a one-time fee and includes other courses too.</p>
              <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
                {course.bundles.map((b, i) => (
                  <div key={b.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-fg">{b.name}</p>
                      <p className="text-sm text-subtle">
                        {bundleSize[b.key] ? `${bundleSize[b.key]} courses` : 'Bundle'}{i === 0 && <span className="text-gold-400"> · most affordable</span>}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-fg">{inr(b.price)}</p>
                    <Button to={`/register?bundle=${b.key}`} variant={i === 0 ? 'solid' : 'quiet'} size="sm">Enroll</Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24"><EnrollCard course={course} /></div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line">
          <div className={`${container} py-16`}>
            <SectionHeader title="You might also like" />
            <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((c) => <CourseCard key={c.slug} course={c} />)}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
