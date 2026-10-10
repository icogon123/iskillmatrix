import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { GraduationCap, Lock, CheckCircle2, ArrowRight, Layers } from 'lucide-react';
import { useCoursesQuery } from '../../api/publicApi';
import { selectUser } from '../../features/auth/authSlice';
import { PageHeader, Notice, Button, PageLoader, EmptyState } from '../../components/ui';
import { CourseCover, courseMeta } from '../public/sections';

/** Courses included in the member's bundle (or the bundle they selected, until it is activated). */
export default function MyCourses() {
  const user = useSelector(selectUser);
  const { data, isLoading } = useCoursesQuery();
  const active = Boolean(user?.package);
  const bundle = user?.package || user?.selectedPackage;
  const slugs = bundle?.courses || [];
  const courses = (data?.courses || []).filter((c) => slugs.includes(c.slug));

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <PageHeader icon={GraduationCap} title="My Courses"
        subtitle={bundle ? `${courses.length} course${courses.length === 1 ? '' : 's'} in your ${bundle.name} bundle` : 'Courses included in your bundle'}
        actions={<Button to="/courses" variant="outline" size="sm">Browse all courses</Button>} />

      {!active && (
        <Notice tone="gold" icon={Lock} title="Activate your bundle to unlock these courses" className="mb-5"
          action={<Button to="/app/activate" variant="gold" size="sm">Activate</Button>}>
          Pay for your {bundle?.name || ''} bundle using the QR code. Your courses unlock once the payment is verified.
        </Notice>
      )}

      {courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => {
            const { modules, topics } = courseMeta(c);
            return (
              <Link key={c.slug} to={`/courses/${c.slug}`} className="group card overflow-hidden transition hover:border-brand-500/40">
                <CourseCover course={c} className="aspect-[16/7]" rounded="" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold group-hover:text-gold-300">{c.title}</h3>
                    {active
                      ? <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-success"><CheckCircle2 className="size-3.5" />Unlocked</span>
                      : <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-subtle"><Lock className="size-3.5" />Locked</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted"><Layers className="mr-1 inline size-3.5" />{c.level} · {modules} modules · {topics} topics</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-300">View curriculum <ArrowRight className="size-4" /></p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No courses yet" message="Choose a bundle to see the courses it includes." />
      )}
    </div>
  );
}
