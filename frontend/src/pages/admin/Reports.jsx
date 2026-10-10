import { useState } from 'react';
import { FileBarChart, Download, Printer, Play } from 'lucide-react';
import { useReportTypesQuery, useLazyReportQuery, useAdminPackagesQuery } from '../../api/adminApi';
import { PageHeader, Card, Select, Input, Button, DataTable, Notice } from '../../components/ui';
import { INCOME_TYPES } from '../../lib/constants';
import { inr, dateTime, date, num } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';

const STATUS_OPTIONS = {
  registrations: ['pending', 'active', 'rejected', 'inactive', 'suspended'],
  income: ['completed', 'pending', 'lapsed'],
  'wallet-ledger': ['completed', 'pending', 'lapsed', 'cancelled'],
  withdrawals: ['pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled'],
  payments: ['pending', 'approved', 'rejected'],
  kyc: ['submitted', 'under_review', 'approved', 'rejected'],
};
const WITH_PACKAGE = ['registrations', 'active-members', 'income', 'payments'];

const fmt = (type, v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (type === 'money') return inr(v);
  if (type === 'date') return date(v);
  if (type === 'datetime') return dateTime(v);
  if (type === 'number') return num(v);
  return String(v);
};

export default function Reports() {
  const { data: types } = useReportTypesQuery();
  const { data: pk } = useAdminPackagesQuery();
  const [type, setType] = useState('registrations');
  const [f, setF] = useState({ from: '', to: '', status: '', package: '', category: '', search: '' });
  const [run, { data, isFetching, error }] = useLazyReportQuery();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const go = () => run({ type, ...f });
  const exportCsv = () => {
    const rows = data.rows.map((r) => Object.fromEntries(data.columns.map((c) => [c.key, ['date', 'datetime'].includes(c.type) && r[c.key] ? fmt(c.type, r[c.key]) : r[c.key]])));
    downloadCsv(`${data.key}-${new Date().toISOString().slice(0, 10)}`, data.columns, rows);
  };

  return (
    <div>
      <PageHeader icon={FileBarChart} title="Reports" subtitle="Filter by date, member, bundle and type. Export to CSV (Excel) or print / save as PDF." />
      <Card className="card-pad no-print">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Report" value={type} onChange={(e) => { setType(e.target.value); setF((x) => ({ ...x, status: '', category: '' })); }}
            options={(types?.types || []).map((t) => ({ value: t.key, label: t.title }))} />
          <Input label="From" type="date" value={f.from} onChange={set('from')} />
          <Input label="To" type="date" value={f.to} onChange={set('to')} />
          <Input label="Member" placeholder="Name or member ID" value={f.search} onChange={set('search')} />
          {STATUS_OPTIONS[type] && <Select label="Status" value={f.status} onChange={set('status')} placeholder="All" options={STATUS_OPTIONS[type].map((s) => ({ value: s, label: s.replace('_', ' ') }))} />}
          {WITH_PACKAGE.includes(type) && <Select label="Bundle" value={f.package} onChange={set('package')} placeholder="All" options={(pk?.packages || []).map((p) => ({ value: p._id, label: p.name }))} />}
          {type === 'income' && <Select label="Income type" value={f.category} onChange={set('category')} placeholder="All" options={INCOME_TYPES.map((t) => ({ value: t.key, label: t.label }))} />}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={go} loading={isFetching}><Play className="size-4" /> Run report</Button>
          {data && <Button variant="outline" onClick={exportCsv} disabled={!data.rows.length}><Download className="size-4" /> Export CSV</Button>}
          {data && <Button variant="outline" onClick={() => window.print()} disabled={!data.rows.length}><Printer className="size-4" /> Print / PDF</Button>}
        </div>
      </Card>

      {error && <Notice tone="red" className="mt-4" title={error?.data?.message || 'Report failed'} />}
      {data && (
        <Card className="mt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 p-4">
            <div>
              <h3 className="font-bold">{data.title}</h3>
              <p className="text-xs text-muted">{data.rows.length} rows{data.rows.length >= data.limit ? ` (first ${data.limit})` : ''}{f.from || f.to ? ` · ${f.from || '…'} to ${f.to || '…'}` : ''}</p>
            </div>
            {data.summary && (
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(data.summary).map(([k, v]) => {
                  const c = data.columns.find((x) => x.key === k);
                  return <span key={k} className="rounded-lg bg-fg/5 px-2 py-1"><span className="text-muted">{c?.label || k}:</span> <b>{fmt(c?.type || 'money', v)}</b></span>;
                })}
              </div>
            )}
          </div>
          <DataTable dense rowKey="__i" rows={data.rows.map((r, i) => ({ ...r, __i: i }))}
            columns={data.columns.map((c) => ({ key: c.key, header: c.label, align: ['money', 'number'].includes(c.type) ? 'right' : undefined, render: (r) => <span className="text-xs whitespace-nowrap">{fmt(c.type, r[c.key])}</span> }))} />
        </Card>
      )}
    </div>
  );
}
