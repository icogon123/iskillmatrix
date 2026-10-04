import { Link } from 'react-router-dom';
import {
  Camera, Megaphone, MonitorPlay, Clapperboard, Palette, Handshake, Magnet, MessageSquare, Bot, BadgeCheck, Check, ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { inr } from '../../lib/format';

export const SKILL_ICONS = {
  'Instagram Mastery': Camera,
  'Meta Ads': Megaphone,
  'YouTube Mastery': MonitorPlay,
  'Video Editing': Clapperboard,
  'Graphic Design': Palette,
  'Sales Mastery': Handshake,
  'Lead Generation': Magnet,
  'Communication Skills': MessageSquare,
  'AI Tools Mastery': Bot,
  'Personal Branding': BadgeCheck,
};

export function SectionTitle({ kicker, title, gold, sub, center = true }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : ''}>
      {kicker && <p className="text-xs font-bold tracking-[0.25em] text-brand-300 uppercase">{kicker}</p>}
      <h2 className="glow-title mt-3 font-display text-3xl font-black tracking-tight text-fg uppercase sm:text-4xl">
        {title} {gold && <span className="gold-text">{gold}</span>}
      </h2>
      <div className={`gold-line mt-4 h-px w-40 ${center ? 'mx-auto' : ''}`} />
      {sub && <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">{sub}</p>}
    </div>
  );
}

const PACKAGE_ACCENT = {
  starter: 'from-slate-300/20',
  basic: 'from-sky-400/20',
  standard: 'from-brand-500/30',
  premium: 'from-fuchsia-500/25',
  pro: 'from-gold-400/30',
};

export function PackageCard({ pkg, featured, cta = true }) {
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-3xl border p-6 transition hover:-translate-y-1 ${featured ? 'border-gold-400/50 shadow-gold' : 'border-line'} bg-ink-850`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${PACKAGE_ACCENT[pkg.key] || 'from-brand-500/20'} to-transparent opacity-70`} />
      {featured && (
        <span className="absolute top-4 right-4 rounded-full bg-gold-400 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-ink-950 uppercase">Best value</span>
      )}
      <div className="relative">
        <p className="font-display text-sm font-extrabold tracking-[0.2em] text-muted uppercase">{pkg.name}</p>
        <p className="mt-3 font-display text-4xl font-black text-fg">{inr(pkg.price)}</p>
        <p className="mt-1 text-xs text-subtle">One-time · inclusive of GST</p>
        <p className="mt-4 text-sm text-muted">{pkg.description}</p>
        <div className="mt-5 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.04] p-2.5">
            <p className="text-[10px] font-semibold text-subtle uppercase">Direct income</p>
            <p className="font-bold text-gold-400">{inr(pkg.activeIncome)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] p-2.5">
            <p className="text-[10px] font-semibold text-subtle uppercase">Team levels</p>
            <p className="font-bold text-brand-300">{pkg.passiveLevels.length}</p>
          </div>
        </div>
        <ul className="mt-5 space-y-2 text-sm">
          {pkg.benefits.map((b) => (
            <li key={b} className="flex gap-2 text-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              {b}
            </li>
          ))}
        </ul>
      </div>
      {cta && (
        <div className="relative mt-auto pt-6">
          <Button to={`/register?package=${pkg.key}`} variant={featured ? 'gold' : 'outline'} className="w-full">
            Join with {pkg.name} <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function CtaBand() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="hero-gradient relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] px-6 py-14 text-center shadow-glow sm:px-12">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative">
          <p className="text-xs font-bold tracking-[0.3em] text-brand-200 uppercase">Your choice</p>
          <h2 className="mt-3 font-display text-3xl font-black text-white uppercase sm:text-5xl">
            A chance to <span className="gold-text">change your life</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-brand-100/80 text-sm sm:text-base">
            Right time. Right opportunity. Right mentorship. Start learning today and build your team with iSkillMatrix.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/register" variant="gold" size="lg">Join Now <ArrowRight className="size-5" /></Button>
            <Button to="/plan" variant="outline" size="lg" className="border-white/30 bg-white/10">See the Income Plan</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageHero({ kicker, title, gold, sub }) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
        <p className="text-xs font-bold tracking-[0.3em] text-gold-400 uppercase">{kicker}</p>
        <h1 className="glow-title mt-3 font-display text-4xl font-black text-fg uppercase sm:text-5xl">
          {title} {gold && <span className="gold-text">{gold}</span>}
        </h1>
        {sub && <p className="mx-auto mt-4 max-w-2xl text-muted">{sub}</p>}
      </div>
    </section>
  );
}

export const linkCls = 'font-semibold text-brand-300 hover:text-brand-200';
export { Link };
