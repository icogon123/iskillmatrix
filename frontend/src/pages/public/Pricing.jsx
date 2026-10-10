import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useCoursesQuery, usePackagesQuery } from '../../api/publicApi';
import { PageLoader } from '../../components/ui';
import CourseIcon from '../../components/common/CourseIcon';
import { inr } from '../../lib/format';
import { usePageTitle } from '../../lib/usePageTitle';
import { container, PageIntro, SectionHeader, BundleCard, Steps, FaqSection, CtaBand, LoadError, courseMapOf } from './sections';

export default function Pricing() {
  usePageTitle('Pricing', 'Course bundles with a one-time fee, GST included. Compare what each iSkillMatrix bundle includes.');
  const { data: pkgData, isLoading, isError, refetch } = usePackagesQuery();
  const { data: courseData } = useCoursesQuery();
  const bundles = pkgData?.packages || [];
  const courses = useMemo(() => courseData?.courses || [], [courseData]);
  const courseMap = useMemo(() => courseMapOf(courses), [courses]);

  return (
    <>
      <PageIntro eyebrow="Pricing" title="One payment. A whole set of courses."
        description="Every bundle is a one-time fee with GST included. Choose the one with the skills you want to learn." />

      <section className={`${container} py-12 sm:py-14`}>
        {isError ? (
          <LoadError onRetry={refetch} />
        ) : isLoading ? (
          <PageLoader />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {bundles.map((b) => <BundleCard key={b.key} bundle={b} courseMap={courseMap} featured={b.key === 'pro'} />)}
          </div>
        )}
        <p className="mt-6 text-sm text-subtle">
          You pay after your account is approved, by scanning our QR code with any UPI app. Your bundle activates once the payment is verified.
        </p>
      </section>

      {bundles.length > 0 && courses.length > 0 && (
        <section className="bg-ink-900">
          <div className={`${container} py-14 sm:py-16`}>
            <SectionHeader title="Compare bundles" description="See exactly which courses each bundle includes." />
            <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-ink-950">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th scope="col" className="px-5 py-4 font-medium text-subtle">Course</th>
                    {bundles.map((b) => (
                      <th key={b.key} scope="col" className={`px-4 py-4 text-center font-semibold ${b.key === 'pro' ? 'text-gold-300' : 'text-fg'}`}>
                        {b.name}
                        <span className="block text-xs font-normal text-subtle">{inr(b.price)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {courses.map((c) => (
                    <tr key={c.slug} className="hover:bg-ink-900">
                      <th scope="row" className="px-5 py-3 text-left font-normal">
                        <Link to={`/courses/${c.slug}`} className="flex items-center gap-3 text-fg hover:text-brand-200">
                          <CourseIcon icon={c.icon} className="size-4 text-brand-300" />
                          {c.title}
                        </Link>
                      </th>
                      {bundles.map((b) => (
                        <td key={b.key} className="px-4 py-3 text-center">
                          {(b.courses || []).includes(c.slug)
                            ? <Check className="mx-auto size-4 text-gold-400" aria-label="Included" />
                            : <span className="text-fg/20" aria-label="Not included">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line">
                    <th scope="row" className="px-5 py-4 text-left font-semibold text-fg">Courses included</th>
                    {bundles.map((b) => (
                      <td key={b.key} className="px-4 py-4 text-center font-semibold text-fg">{(b.courses || []).filter((s) => courseMap[s]).length}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className={`${container} py-16 sm:py-20`}>
        <SectionHeader title="How enrollment works" description="From sign-up to your first lesson in four steps." />
        <Steps />
      </section>

      <div className="border-t border-line"><FaqSection /></div>
      <CtaBand />
    </>
  );
}
