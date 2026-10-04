import {
  ArrowRight, Users, GraduationCap, TrendingUp, CalendarCheck, Gift, Crown, Clock, Target, Compass, Sparkles, Wallet,
} from 'lucide-react';
import { Button } from '../../components/ui';
import BadgeMedal from '../../components/common/BadgeMedal';
import { usePackagesQuery, useSiteQuery } from '../../api/publicApi';
import { TRENDING_SKILLS } from '../../lib/constants';
import { inr } from '../../lib/format';
import { SectionTitle, PackageCard, CtaBand, SKILL_ICONS } from './sections';

const INCOMES = [
  { icon: TrendingUp, title: 'Active (Direct) Income', text: 'Earn up to ₹7,000 instantly on every package sold through your referral.' },
  { icon: Users, title: 'Passive (Team) Income', text: 'Earn on purchases across up to 12 levels of your team network.' },
  { icon: CalendarCheck, title: 'Weekly Income', text: 'Make 3, 6 or 9 same-package sales in a week and earn 5% on them.' },
  { icon: Gift, title: 'Working Bonus', text: '₹200 / ₹500 / ₹1,000 extra on every Standard, Premium or Pro sale.' },
  { icon: Target, title: 'Monthly Bonus', text: 'Hit your monthly direct-income target and earn up to ₹10,000.' },
  { icon: Crown, title: 'Royalty Income', text: 'From Emerald Executive onwards, earn 5–10% royalty every month.' },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute -inset-8 rounded-full bg-brand-600/30 blur-3xl" />
      <div className="relative space-y-3 rounded-[2rem] border border-line bg-ink-900/90 p-4 shadow-2xl">
        <div className="hero-gradient relative overflow-hidden rounded-2xl p-5">
          <p className="text-xs text-brand-100/80">Total Balance</p>
          <p className="mt-1 text-2xl font-extrabold text-white">₹5,62,450.00</p>
          <p className="mt-3 text-xs text-brand-100/80">Wallet Balance</p>
          <p className="text-lg font-bold text-white">₹1,25,450.00</p>
          <Wallet className="absolute right-4 bottom-4 size-14 text-white/25" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-ink-850 p-3">
            <p className="text-[11px] text-gold-400">Today's Earning</p>
            <p className="font-bold">₹6,250</p>
          </div>
          <div className="rounded-2xl border border-line bg-ink-850 p-3">
            <p className="text-[11px] text-muted">This Month</p>
            <p className="font-bold">₹1,05,750</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-line bg-ink-850 p-3">
          <div>
            <p className="text-[11px] text-muted">My Rank</p>
            <p className="gold-text font-display text-lg font-black">Emerald</p>
          </div>
          <BadgeMedal badgeKey="emerald" size="md" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data } = usePackagesQuery();
  const { data: site } = useSiteQuery();
  const packages = data?.packages || [];
  const badges = site?.plan?.badges || [];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -top-32 -left-32 size-[32rem] rounded-full bg-brand-700/30 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -right-40 size-[28rem] rounded-full bg-gold-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-bold tracking-wider text-gold-300 uppercase">
              <Sparkles className="size-3.5" /> Learn · Educate · Earn · Together
            </span>
            <h1 className="glow-title mt-6 font-display text-4xl leading-[1.05] font-black text-fg uppercase sm:text-6xl">
              Learn skills.
              <br />
              <span className="gold-text">Build your future.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              iSkillMatrix brings you 10 trending digital skills and a transparent team-income plan, so you can earn independently and grow
              together with your network.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/register" variant="gold" size="lg">Join Now <ArrowRight className="size-5" /></Button>
              <Button to="/plan" variant="outline" size="lg">Explore Income Plan</Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-4 gap-4">
              {[['10', 'Trending skills'], ['6', 'Income types'], ['5', 'Packages'], ['12', 'Team levels']].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-display text-3xl font-black text-fg">{n}</dt>
                  <dd className="mt-1 text-[11px] leading-tight text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* Two ways */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionTitle kicker="Your journey, your choice" title="2 ways of" gold="income" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[
            { icon: GraduationCap, title: 'Skills Learning', steps: ['Learn', 'Practice', 'Create', 'Earn independently', 'Grow your identity'], tone: 'from-gold-400/20' },
            { icon: Users, title: 'Network Building', steps: ['Connect', 'Share', 'Help', 'Build your team', 'Earn together'], tone: 'from-brand-500/25' },
          ].map(({ icon: Icon, title, steps, tone }) => (
            <div key={title} className={`card relative overflow-hidden p-7`}>
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone} to-transparent`} />
              <div className="relative">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/10"><Icon className="size-6 text-gold-300" /></span>
                <h3 className="mt-5 font-display text-2xl font-black uppercase">{title}</h3>
                <ol className="mt-5 flex flex-wrap gap-2">
                  {steps.map((s, i) => (
                    <li key={s} className="flex items-center gap-2 rounded-full border border-line bg-ink-950/50 px-3 py-1.5 text-sm text-muted">
                      <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section className="border-y border-line bg-ink-900/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionTitle kicker="Way 1" title="Trending" gold="skills" sub="Practical, job-ready digital skills that let you earn independently." />
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TRENDING_SKILLS.map((s) => {
              const Icon = SKILL_ICONS[s];
              return (
                <div key={s} className="group card flex flex-col items-center gap-3 p-5 text-center transition hover:border-gold-400/40">
                  <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-brand-800/30 text-brand-200 transition group-hover:from-gold-400/30 group-hover:text-gold-300">
                    <Icon className="size-6" />
                  </span>
                  <span className="text-sm font-semibold">{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Incomes */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionTitle kicker="Way 2" title="6 types of" gold="income" sub="Every rupee is tracked in your personal ledger. Here is how you earn." />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INCOMES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6 transition hover:border-brand-500/40">
              <span className="grid size-11 place-items-center rounded-xl bg-gold-400/15 text-gold-400"><Icon className="size-5" /></span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button to="/plan" variant="outline">See the full plan <ArrowRight className="size-4" /></Button>
        </div>
      </section>

      {/* Active vs passive */}
      <section className="border-y border-line bg-ink-900/50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionTitle kicker="Cashflow quadrant" title="Active vs" gold="passive income" />
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <h3 className="font-display text-xl font-black text-muted uppercase">Active income</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-muted">
                {['Individual effort', 'Limited income', 'No time freedom', 'No security'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Clock className="size-4 text-subtle" />{t}</li>
                ))}
              </ul>
            </div>
            <div className="card border-gold-400/40 p-6 shadow-gold">
              <h3 className="gold-text font-display text-xl font-black uppercase">Passive income</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-fg">
                {['Team work', 'Unlimited income', 'Time freedom', 'Security'].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Sparkles className="size-4 text-gold-400" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionTitle kicker="Choose your path" title="Our" gold="packages" sub="A one-time purchase. No upgrades needed — pick the package that fits your goals." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {packages.map((p) => <PackageCard key={p.key} pkg={p} featured={p.key === 'pro'} />)}
        </div>
      </section>

      {/* Badges */}
      {badges.length > 0 && (
        <section className="border-y border-line bg-ink-900/50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionTitle kicker="Lifetime achievements" title="Rise through the" gold="ranks" sub="Badges are earned on lifetime earnings and are yours forever." />
            <div className="scrollbar-none mt-12 flex gap-4 overflow-x-auto pb-2">
              {badges.map((b) => (
                <div key={b.key} className="card flex w-44 shrink-0 flex-col items-center gap-3 p-5 text-center">
                  <BadgeMedal badgeKey={b.key} size="lg" />
                  <p className="text-sm font-bold">{b.name}</p>
                  <p className="text-xs text-gold-400">{inr(b.threshold)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Secrets */}
      <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <SectionTitle kicker="iSkillMatrix" title="3 secrets that" gold="change your life" />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[[Clock, 'Right Time'], [Compass, 'Right Opportunity'], [Users, 'Right Mentorship']].map(([Icon, t]) => (
            <div key={t} className="card flex flex-col items-center gap-3 p-8 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-ink-950"><Icon className="size-7" /></span>
              <p className="font-display text-lg font-black uppercase">{t}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
