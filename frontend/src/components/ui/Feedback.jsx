import { Loader2, Inbox, AlertTriangle } from 'lucide-react';
import { statusTone, statusLabel } from '../../lib/constants';

export function Spinner({ className = 'size-5' }) {
  return <Loader2 className={`animate-spin text-brand-400 ${className}`} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted">
        <Spinner className="size-7" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-400">
        <Icon className="size-6" />
      </span>
      <p className="mt-3 font-semibold text-fg">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="card card-pad flex items-center gap-3 border-danger/30 text-sm">
      <AlertTriangle className="size-5 shrink-0 text-danger" />
      <span className="flex-1 text-muted">{error?.data?.message || 'Could not load this data.'}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold text-brand-300 hover:text-brand-200">
          Retry
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status, label, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusTone(status)} ${className}`}>
      {label || statusLabel(status)}
    </span>
  );
}

export function Notice({ tone = 'violet', icon: Icon, title, children, action, className = '' }) {
  const tones = {
    violet: 'border-brand-500/30 bg-brand-500/8',
    gold: 'border-gold-400/30 bg-gold-400/8',
    red: 'border-danger/30 bg-danger/8',
    green: 'border-success/30 bg-success/8',
    blue: 'border-info/30 bg-info/8',
  };
  const iconTone = { violet: 'text-brand-300', gold: 'text-gold-400', red: 'text-danger', green: 'text-success', blue: 'text-info' };
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${tones[tone]} ${className}`}>
      {Icon && <Icon className={`size-5 shrink-0 ${iconTone[tone]}`} />}
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-fg">{title}</p>}
        {children && <div className="mt-0.5 text-muted">{children}</div>}
      </div>
      {action}
    </div>
  );
}
