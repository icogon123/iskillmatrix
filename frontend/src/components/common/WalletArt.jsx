/** Decorative wallet illustration for the balance card (matches the dashboard mockup). */
export default function WalletArt({ className = '' }) {
  return (
    <svg viewBox="0 0 120 96" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wa-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id="wa-note" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="40" y="6" width="54" height="32" rx="4" fill="url(#wa-note)" transform="rotate(-12 67 22)" opacity=".9" />
      <rect x="50" y="10" width="54" height="32" rx="4" fill="#a5f3fc" transform="rotate(6 77 26)" opacity=".85" />
      <circle cx="80" cy="28" r="6" fill="none" stroke="#0e7490" strokeWidth="2" transform="rotate(6 77 26)" opacity=".6" />
      <rect x="10" y="30" width="96" height="60" rx="14" fill="url(#wa-body)" />
      <path d="M10 44c0-8 6-14 14-14h70c7 0 12 5 12 12v2H10z" fill="#ddd6fe" opacity=".35" />
      <rect x="72" y="50" width="38" height="22" rx="8" fill="#6d28d9" stroke="#c4b5fd" strokeOpacity=".6" />
      <circle cx="84" cy="61" r="4.5" fill="#f5c542" />
    </svg>
  );
}
