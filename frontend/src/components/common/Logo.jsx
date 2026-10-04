import { Link } from 'react-router-dom';

export function LogoMark({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#17143a" stroke="rgba(139,92,246,.35)" />
      <path d="M14 46V20h6v26zM26 46V20h6l8 13 8-13h0v26h-6V31l-8 12-8-12v15z" fill="url(#lm-g)" />
      <circle cx="17" cy="12.5" r="4" fill="#f5c542" />
    </svg>
  );
}

export default function Logo({ to = '/', compact = false, className = '' }) {
  return (
    <Link to={to} className={`flex items-center gap-2.5 ${className}`} aria-label="iSkillMatrix home">
      <LogoMark />
      {!compact && (
        <span className="font-display text-lg font-extrabold tracking-tight">
          <span className="gold-text">i</span>
          <span className="text-fg">Skill</span>
          <span className="violet-text">Matrix</span>
        </span>
      )}
    </Link>
  );
}
