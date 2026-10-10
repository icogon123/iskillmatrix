import { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { useAdminLedgerQuery } from '../../api/adminApi';
import { PageHeader, Card, Input, Select, DataTable, Pagination, StatusBadge } from '../../components/ui';
import { LEDGER_LABELS, WALLETS, WALLET_LABELS } from '../../lib/constants';
import { useDebounce } from '../../lib/useDebounce';
import { inr, dateTime } from '../../lib/format';

export default function Ledger() {
  const [f, setF] = useState({ wallet: '', category: '', status: '', direction: '', from: '', to: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);
  const { data, isFetching } = useAdminLedgerQuery({ ...f, search: q, page, limit: 30 });
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setPage(1); };

  return (
    <div>
      <PageHeader icon={BookOpen} title="Financial Ledger" subtitle="Every credit and debit across all wallets, with idempotent transaction IDs." />
      <Card>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-7">
          <Input icon={Search} placeholder="Member, txn ID, reference" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="lg:col-span-2" />
          <Select value={f.wallet} onChange={set('wallet')} placeholder="All wallets" options={WALLETS.map((w) => ({ value: w.value, label: w.label }))} />
          <Select value={f.category} onChange={set('category')} placeholder="All types" options={Object.entries(LEDGER_LABELS).map(([value, label]) => ({ value, label }))} />
          <Select value={f.status} onChange={set('status')} placeholder="All statuses" options={['completed', 'pending', 'lapsed', 'cancelled'].map((s) => ({ value: s, label: s }))} />
          <Input type="date" value={f.from} onChange={set('from')} aria-label="From date" />
          <Input type="date" value={f.to} onChange={set('to')} aria-label="To date" />
        </div>
        {data?.totals && <p className="px-4 pb-2 text-xs text-muted">Credits {inr(data.totals.credit)} · Debits {inr(data.totals.debit)} (all matching rows)</p>}
        <DataTable
          dense loading={isFetching && !data} rows={data?.items || []}
          columns={[
            { key: 'date', header: 'Date', render: (r) => <span className="text-xs whitespace-nowrap">{dateTime(r.createdAt)}</span> },
            { key: 'txn', header: 'Txn ID', render: (r) => <span className="font-mono text-[11px] text-muted">{r.txnId}</span> },
            { key: 'member', header: 'Member', render: (r) => <div className="text-xs"><p className="font-semibold">{r.user?.memberId}</p><p className="text-muted">{r.user?.fullName}</p></div> },
            { key: 'wallet', header: 'Wallet', render: (r) => <span className="text-xs whitespace-nowrap text-muted">{WALLET_LABELS[r.wallet || 'main']}</span> },
            { key: 'type', header: 'Type', render: (r) => <span className="text-xs whitespace-nowrap">{LEDGER_LABELS[r.category]}{r.level ? ` · L${r.level}` : ''}</span> },
            { key: 'source', header: 'Source', render: (r) => <span className="text-xs text-muted">{(r.sourceUser || r.counterparty)?.memberId || r.reference || r.period || '—'}</span> },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className={`font-semibold whitespace-nowrap ${r.direction === 'credit' ? 'text-success' : 'text-danger'}`}>{r.direction === 'credit' ? '+' : '−'}{inr(r.netAmount)}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'remarks', header: 'Remarks', render: (r) => <span className="block max-w-[16rem] truncate text-xs text-muted" title={r.remarks}>{r.remarks}</span> },
          ]} />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>
    </div>
  );
}
