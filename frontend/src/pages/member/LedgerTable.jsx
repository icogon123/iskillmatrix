import { DataTable, Pagination, StatusBadge } from '../../components/ui';
import Money from '../../components/common/Money';
import { LEDGER_LABELS, INCOME_TYPES } from '../../lib/constants';
import { dateTime } from '../../lib/format';

const COLORS = Object.fromEntries(INCOME_TYPES.map((t) => [t.key, t.color]));

export default function LedgerTable({ data, loading, onPage, showDirection = true }) {
  return (
    <>
      <DataTable
        loading={loading}
        rows={data?.items || []}
        columns={[
          { key: 'createdAt', header: 'Date', render: (r) => <span className="text-xs whitespace-nowrap text-muted">{dateTime(r.completedAt || r.createdAt)}</span> },
          {
            key: 'category', header: 'Type',
            render: (r) => (
              <span className="flex items-center gap-2 whitespace-nowrap">
                {COLORS[r.category] && <span className="size-2 rounded-full" style={{ background: COLORS[r.category] }} />}
                {LEDGER_LABELS[r.category]}
                {r.level ? <span className="text-xs text-subtle">L{r.level}</span> : null}
              </span>
            ),
          },
          {
            key: 'details', header: 'Details',
            render: (r) => (
              <div className="max-w-xs">
                <p className="truncate text-xs text-muted" title={r.remarks}>{r.remarks || '—'}</p>
                <p className="text-[10px] text-subtle">{r.txnId}</p>
              </div>
            ),
          },
          {
            key: 'amount', header: 'Amount', align: 'right',
            render: (r) => (
              <span className={`font-semibold whitespace-nowrap ${r.status !== 'completed' ? 'text-muted' : r.direction === 'credit' ? 'text-success' : 'text-danger'}`}>
                {showDirection && (r.direction === 'credit' ? '+' : '−')}
                <Money value={r.netAmount} />
              </span>
            ),
          },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status === 'completed' ? (r.direction === 'credit' ? 'Credited' : 'Debited') : undefined} /> },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={onPage} />
    </>
  );
}
