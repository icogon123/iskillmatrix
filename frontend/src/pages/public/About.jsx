import { BookOpen, Presentation, IndianRupee, Users, Repeat, Eye, Target, ShieldCheck, LineChart, HeartHandshake } from 'lucide-react';
import { PageHero, SectionTitle, CtaBand } from './sections';

const VALUES = [
  [BookOpen, 'Learn', 'Master trending digital skills from practical, industry-focused courses.'],
  [Presentation, 'Educate', 'Share what you learn and help others start their journey.'],
  [IndianRupee, 'Earn', 'Turn your skills and your network into multiple income streams.'],
  [Users, 'Together', 'Grow as a team — your success is linked to your team’s success.'],
  [Repeat, 'Repeat', 'Keep learning, keep sharing, keep growing.'],
];

const WHY = [
  [ShieldCheck, 'Transparent ledger', 'Every rupee you earn or withdraw is recorded with a transaction ID you can see.'],
  [LineChart, 'Clear income plan', 'Package values, levels and bonuses are published openly on the income plan page.'],
  [HeartHandshake, 'Mentorship', 'Learn alongside leaders who have built their own digital careers.'],
];

export default function About() {
  return (
    <>
      <PageHero kicker="About us" title="Learn skills." gold="Build your future." sub="iSkillMatrix is a skills-first community. We help people learn in-demand digital skills and earn by sharing them with others." />

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div className="card p-7">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-500/20 text-brand-300"><Target className="size-5" /></span>
          <h3 className="mt-4 font-display text-xl font-black uppercase">Our mission</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            To help every learner unlock their potential through practical digital skills, and to give them a fair, transparent way to earn while they
            grow.
          </p>
        </div>
        <div className="card p-7">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-400/15 text-gold-400"><Eye className="size-5" /></span>
          <h3 className="mt-4 font-display text-xl font-black uppercase">Our vision</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            A community where education meets opportunity — where every member can become an independent earner and a leader in the digital economy.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-ink-900/50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle title="What we" gold="stand for" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map(([Icon, t, d]) => (
              <div key={t} className="card p-5 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950"><Icon className="size-6" /></span>
                <p className="mt-4 font-display text-lg font-black uppercase">{t}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <SectionTitle title="Why" gold="iSkillMatrix" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {WHY.map(([Icon, t, d]) => (
            <div key={t} className="card p-6">
              <Icon className="size-6 text-brand-300" />
              <h3 className="mt-4 font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
