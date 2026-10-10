import { usePageTitle } from '../../lib/usePageTitle';
import { container, PageIntro, SectionHeader, MissionVisionCards, CtaBand } from './sections';
import { MISSION, VALUES } from './content';

export default function VisionMission() {
  usePageTitle('Vision & mission', MISSION);
  return (
    <>
      <PageIntro eyebrow="Vision & Mission" title="Where we’re going, and how we’ll get there."
        description="iSkillMatrix exists to make practical digital skills something anyone can learn and use." />

      <section className={`${container} py-16 sm:py-20`}>
        <MissionVisionCards large />
      </section>

      <section className="bg-ink-900">
        <div className={`${container} py-16 sm:py-20`}>
          <SectionHeader title="What we stand for" description="Five ideas that shape every course we make." />
          <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map(([title, text], i) => (
              <li key={title} className="border-t border-line pt-5">
                <span className="text-sm font-semibold text-gold-400">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-2 text-lg font-semibold text-fg">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="pt-16"><CtaBand /></div>
    </>
  );
}
