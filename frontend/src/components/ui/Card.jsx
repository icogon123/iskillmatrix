export function Card({ className = '', children, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-semibold text-fg">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'violet', className = '' }) {
  const tones = {
    violet: 'from-brand-500/25 to-brand-700/10 text-brand-300',
    gold: 'from-gold-400/25 to-gold-600/5 text-gold-400',
    green: 'from-success/25 to-success/5 text-success',
    blue: 'from-info/25 to-info/5 text-info',
    red: 'from-danger/25 to-danger/5 text-danger',
    pink: 'from-pink-500/25 to-pink-500/5 text-pink-400',
  };
  return (
    <div className={`card card-pad flex items-start gap-3 ${className}`}>
      {Icon && (
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-1 truncate text-lg font-bold tracking-tight text-fg sm:text-xl">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-subtle">{hint}</p>}
      </div>
    </div>
  );
}
