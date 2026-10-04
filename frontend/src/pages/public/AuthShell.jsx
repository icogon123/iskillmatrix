import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Logo from '../../components/common/Logo';

export default function AuthShell({ title, subtitle, children, wide = false, aside = true }) {
  return (
    <div className="flex min-h-dvh">
      {aside && (
        <div className="hero-gradient relative hidden w-[42%] overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative"><Logo /></div>
          <div className="relative">
            <h2 className="font-display text-4xl leading-tight font-black text-white uppercase">
              Learn skills.
              <br />
              <span className="gold-text">Build your future.</span>
            </h2>
            <ul className="mt-8 space-y-3 text-sm text-brand-100/90">
              {['10 trending digital skills', '6 transparent income streams', 'Track every rupee in your wallet ledger', 'Lifetime achievement badges & royalty'].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><CheckCircle2 className="size-5 text-gold-300" />{t}</li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-brand-100/60">© {new Date().getFullYear()} iSkillMatrix</p>
        </div>
      )}
      <div className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_0%,rgba(124,58,237,0.18),transparent)]" />
        <div className="relative flex items-center justify-between px-5 py-4 sm:px-8">
          <span className={aside ? 'lg:invisible' : ''}><Logo /></span>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Website</Link>
        </div>
        <div className="relative flex flex-1 items-start justify-center px-5 py-6 sm:items-center sm:px-8">
          <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
