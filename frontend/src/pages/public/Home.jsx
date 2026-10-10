import { useMemo } from 'react';
import HeroSlider from '../../components/common/HeroSlider';
import { useCoursesQuery } from '../../api/publicApi';
import { usePageTitle } from '../../lib/usePageTitle';
import {
  container, SectionHeader, TextLink, CourseCard, CourseGridSkeleton, AboutSection, WhyUsSection, VisionMissionSection, Steps, TestimonialsSection,
  FaqSection, CtaBand, LoadError,
} from './sections';

export default function Home() {
  usePageTitle();
  const { data: courseData, isLoading, isError, refetch } = useCoursesQuery();
  const courses = useMemo(() => courseData?.courses || [], [courseData]);

  return (
    <>
      {/* Hero — full-bleed banner slider */}
      <HeroSlider />
      <AboutSection />
      <WhyUsSection />

      {/* Popular courses */}
      <section className={`${container} py-16 sm:py-20`}>
        <SectionHeader title="Our Courses" description="Start with one skill and build from there."
          action={courses.length > 8 && <TextLink to="/courses">See all {courses.length} courses</TextLink>} />
        <div className="mt-8">
          {isError ? (
            <LoadError onRetry={refetch} />
          ) : isLoading ? (
            <CourseGridSkeleton count={8} />
          ) : (
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {courses.slice(0, 8).map((c) => <CourseCard key={c.slug} course={c} />)}
            </div>
          )}
        </div>
      </section>

      <VisionMissionSection />

      {/* How it works */}
      <section className="bg-ink-900">
        <div className={`${container} py-16 sm:py-20`}>
          <SectionHeader title="How enrollment works" description="From sign-up to your first lesson in four steps." />
          <Steps />
        </div>
      </section>

      <TestimonialsSection />
      <FaqSection />
      <CtaBand />
    </>
  );
}
