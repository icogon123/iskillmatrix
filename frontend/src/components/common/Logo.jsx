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
      <path d="M14 46V20h6v26zM26 46V20h6l8 13 8-13h0v26h-6V31l-8 12-8-12v15z" fill="url(#lm-g)" />
      <circle cx="17" cy="12.5" r="4" style={{ fill: 'var(--logo-dot)' }} />
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
  const [i, skill, matrix] = TONES[tone];
  return (
    <Link to={to} className={`flex items-center gap-2.5 ${className}`} aria-label="iSkillMatrix home">
      <LogoMark />
      {!compact && (
        <span className="font-display text-lg font-extrabold tracking-tight">
          <span className={i}>i</span>
          <span className={skill}>Skill</span>
          <span className={matrix}>Matrix</span>
        </span>
      )}
    </Link>
  );
}
