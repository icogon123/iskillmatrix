import { INCOME_TYPES } from '../../lib/constants';
import Money from './Money';

/**
 * Six income types as a labelled list plus a proportion bar. Every segment is direct-labelled in the list,
 * so identity never depends on colour alone. Segments are separated by a 2px surface gap.
 */
export default function IncomeBreakdown({ income, pending }) {
  const total = INCOME_TYPES.reduce((a, t) => a + (income?.[t.key] || 0), 0);
  return (
    <div>
      {total > 0 && (
        <div className="mb-4 flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Share of each income type">
          {INCOME_TYPES.filter((t) => income?.[t.key] > 0).map((t) => (
            <span key={t.key} title={`${t.label}: ${Math.round((income[t.key] / total) * 100)}%`} style={{ width: `${(income[t.key] / total) * 100}%`, background: t.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
          ))}
        </div>
      )}
      <ul className="divide-y divide-line/60">
        {INCOME_TYPES.map((t) => (
          <li key={t.key} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
            <span className="flex-1 text-muted">{t.label}</span>
            {pending?.[t.key] > 0 && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">+<Money value={pending[t.key]} /> pending</span>
            )}
            <Money value={income?.[t.key] || 0} className="font-semibold text-fg" />
          </li>
        ))}
        <li className="flex items-center gap-3 pt-3 text-sm">
          <span className="flex-1 font-semibold text-fg">Total Income</span>
          <Money value={income?.total ?? total} className="font-display text-base font-black text-gold-400" />
        </li>
      </ul>
    </div>
  );
}
