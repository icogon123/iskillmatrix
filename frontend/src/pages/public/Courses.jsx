import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useCoursesQuery } from '../../api/publicApi';
import { Button } from '../../components/ui';
import { usePageTitle } from '../../lib/usePageTitle';
import { container, PageIntro, CourseCard, CourseGridSkeleton, LoadError, TextLink, CtaBand } from './sections';

const matches = (c, q) => [c.title, c.summary, c.category, ...c.outcomes, ...c.modules.map((m) => m.title), ...c.modules.flatMap((m) => m.topics)]
  .some((t) => t?.toLowerCase().includes(q));

export default function Courses() {
  const { data, isLoading, isError, refetch } = useCoursesQuery();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const courses = useMemo(() => data?.courses || [], [data]);
  const categories = useMemo(() => [...new Set(courses.map((c) => c.category))], [courses]);
  usePageTitle(category ? `${category} courses` : 'All courses');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return courses.filter((c) => (!category || c.category === category) && (!needle || matches(c, needle)));
  }, [courses, q, category]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageIntro eyebrow="Course catalog" title="Find your next skill"
        description="Practical courses in AI, design, video, social media, marketing and personal growth.">
        <label className="mt-8 flex max-w-lg items-center gap-2.5 rounded-xl border border-line bg-ink-950 px-3.5 shadow-sm focus-within:border-brand-500">
          <Search className="size-4 shrink-0 text-subtle" />
          <span className="sr-only">Search courses</span>
          <input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Search courses or topics"
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle" />
          {q && (
            <button type="button" onClick={() => setParam('q', '')} className="rounded-md p-1 text-subtle hover:text-fg" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </label>
      </PageIntro>

      <section className={`${container} py-10 sm:py-12`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line">
          <nav className="scrollbar-none -mb-px flex gap-6 overflow-x-auto" aria-label="Categories">
            {['', ...categories].map((cat) => {
              const active = category === cat;
              return (
                <button key={cat || 'all'} type="button" onClick={() => setParam('category', cat)} aria-pressed={active}
                  className={`shrink-0 border-b-2 pb-3 text-sm font-medium transition ${active ? 'border-brand-500 text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
                  {cat || 'All'}
                </button>
              );
            })}
          </nav>
          {!isLoading && !isError && <p className="pb-3 text-sm text-subtle">{shown.length} course{shown.length === 1 ? '' : 's'}</p>}
        </div>

        <div className="mt-8">
          {isError ? (
            <LoadError onRetry={refetch} />
          ) : isLoading ? (
            <CourseGridSkeleton count={8} />
          ) : shown.length ? (
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((c) => <CourseCard key={c.slug} course={c} />)}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="font-semibold text-fg">No courses match {q ? `“${q}”` : 'this filter'}</p>
              <p className="mt-1 text-sm text-muted">Try another word, or browse every course.</p>
              <Button variant="quiet" className="mt-5" onClick={() => setParams({}, { replace: true })}>Show all courses</Button>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col gap-3 rounded-2xl border border-line bg-ink-900 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-semibold text-fg">Courses come in bundles</p>
            <p className="mt-0.5 text-sm text-muted">Pay once for a bundle and get every course in it. GST included.</p>
          </div>
          <TextLink to="/pricing">Compare bundles</TextLink>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
