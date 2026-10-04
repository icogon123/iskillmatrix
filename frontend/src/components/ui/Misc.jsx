import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="hidden size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/30 to-brand-800/20 text-brand-300 sm:grid">
            <Icon className="size-5" />
          </span>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
            value === t.value ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/40' : 'text-muted hover:bg-white/5 hover:text-fg'
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-px text-[10px]">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy', className = '' }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.success('Copied');
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button type="button" onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-brand-200 hover:bg-brand-500/10 ${className}`}>
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label}
    </button>
  );
}

export function KeyValue({ items, className = '' }) {
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 ${className}`}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold tracking-wide text-subtle uppercase">{k}</dt>
          <dd className="mt-0.5 truncate text-sm text-fg">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value = 0, className = '', tone = 'violet' }) {
  const tones = { violet: 'from-brand-400 to-brand-600', gold: 'from-gold-300 to-gold-500', green: 'from-emerald-300 to-success' };
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-white/8 ${className}`}>
      <div className={`h-full rounded-full bg-gradient-to-r ${tones[tone]} transition-[width] duration-700`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
