import { Link } from 'react-router-dom';

// Colours come from the --logo-* variables, so the mark follows the page theme.
export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--logo-from)' }} />
          <stop offset="1" style={{ stopColor: 'var(--logo-to)' }} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" style={{ fill: 'var(--logo-tile)', stroke: 'var(--logo-stroke)' }} />
      <path d="M28.5 14h7L52 50h-7.2l-3.6-8.4H22.8L19.2 50H12zM25.5 35.4h13L32 20.6z" fillRule="evenodd" fill="url(#lm-g)" />
    </svg>
  );
}

// Word colours: `auto` follows the theme, `onDark` is for charcoal/violet panels, `white` for the orange footer.
const TONES = {
  auto: ['gold-text', 'text-fg', 'violet-text'],
  onDark: ['gold-text', 'text-white', 'violet-text'],
  white: ['text-white', 'text-white', 'text-white'],
};

export default function Logo({ to = '/', compact = false, tone = 'auto', className = '' }) {
  const [arovia, skill, tech] = TONES[tone];
  return (
    <Link to={to} className={`flex items-center gap-2.5 ${className}`} aria-label="AroviaSkillTech home">
      <LogoMark />
      {!compact && (
        <span className="font-display text-lg font-extrabold tracking-tight">
          <span className={arovia}>Arovia</span>
          <span className={skill}>Skill</span>
          <span className={tech}>Tech</span>
        </span>
      )}
    </Link>
  );
}
