import { Link } from 'react-router-dom';
import { ArrowLeft, Check, GraduationCap } from 'lucide-react';
import Logo from '../../components/common/Logo';
import { usePageTitle } from '../../lib/usePageTitle';

const POINTS = ['Practical courses in AI, design, video and marketing', 'Short modules you can follow step by step', 'One-time fee, GST included'];

export default function AuthShell({ title, pageTitle, subtitle, children, wide = false, aside = true }) {
  usePageTitle(pageTitle || title);
  return (
    <div className="flex min-h-dvh">
      {aside && (
        <div className="relative hidden w-[40%] max-w-xl overflow-hidden bg-char-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <span aria-hidden className="absolute -top-32 -left-24 size-96 rounded-full bg-brand-400/25 blur-3xl" />
          <GraduationCap aria-hidden className="absolute -right-10 -bottom-12 size-80 rotate-[-12deg] text-white/[0.05]" />
          <div className="relative"><Logo tone="onDark" /></div>
          <div className="relative">
            <h2 className="text-3xl leading-tight font-bold text-white">Learn skills.<br /><span className="text-brand-400">Build your future.</span></h2>
            <ul className="mt-8 space-y-3 text-white/80">
              {POINTS.map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 size-5 shrink-0 text-brand-400" />{t}</li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-white/50">© {new Date().getFullYear()} iSkillMatrix</p>
        </div>
      )}
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-4 sm:px-8">
          <span className={aside ? 'lg:invisible' : ''}><Logo /></span>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Back to website</Link>
        </div>
        <div className="flex flex-1 items-start justify-center px-5 py-6 sm:items-center sm:px-8">
          <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
