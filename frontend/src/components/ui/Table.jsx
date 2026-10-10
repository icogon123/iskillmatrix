import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner, EmptyState } from './Feedback';

/**
 * columns: [{ key, header, render?(row), className?, align? }]
 */
export function DataTable({ columns, rows = [], loading, empty, rowKey = '_id', onRowClick, dense }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] font-semibold tracking-wider text-subtle uppercase">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-14 text-center">
                <Spinner className="mx-auto size-6" />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{empty || <EmptyState title="No records found" />}</td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={r[rowKey] ?? i}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`border-b border-line/60 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-fg/[0.03]' : ''}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 ${dense ? 'py-2' : 'py-3'} align-middle ${c.align === 'right' ? 'text-right' : ''} ${c.className || ''}`}>
                    {c.render ? c.render(r) : r[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page = 1, pages = 1, total, onChange }) {
  if (pages <= 1) return total !== undefined ? <p className="px-4 py-3 text-xs text-subtle">{total} record{total === 1 ? '' : 's'}</p> : null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
      <span>
        Page {page} of {pages}
        {total !== undefined && ` · ${total} records`}
      </span>
      <div className="flex gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}
          className="rounded-lg border border-line p-1.5 hover:bg-fg/5 disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)}
          className="rounded-lg border border-line p-1.5 hover:bg-fg/5 disabled:opacity-40" aria-label="Next page">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
