import { inr } from '../../lib/format';

/** Tooltip body for Recharts: text uses text tokens; the coloured swatch carries identity. */
export default function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = inr }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-ink-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-muted">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-fg">
          <span className="size-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto pl-3 font-bold">{valueFormatter(p.value)}</span>
        </p>
      ))}
    </div>
  );
}
