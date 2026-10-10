import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useAuditLogsQuery } from '../../api/adminApi';
import { PageHeader, Card, Input, Select, DataTable, Pagination } from '../../components/ui';
import { useDebounce } from '../../lib/useDebounce';
import { dateTime } from '../../lib/format';

const GROUPS = ['registration', 'member', 'admin.login', 'kyc', 'payment', 'income', 'wallet', 'withdrawal', 'badge', 'package', 'course', 'settings', 'password'];

export default function Audit() {
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);
  const { data, isFetching } = useAuditLogsQuery({ action, search: q, page });

  return (
    <div>
      <PageHeader icon={ScrollText} title="Audit Log" subtitle="Logins, approvals, income runs, wallet adjustments and configuration changes." />
      <Card>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <Input icon={Search} placeholder="Actor, entity or action" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:col-span-2" />
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="All actions" options={GROUPS.map((g) => ({ value: g, label: g === 'package' ? 'bundle' : g }))} />
        </div>
        <DataTable dense loading={isFetching && !data} rows={data?.items || []}
          columns={[
            { key: 'when', header: 'When', render: (r) => <span className="text-xs whitespace-nowrap">{dateTime(r.createdAt)}</span> },
            { key: 'action', header: 'Action', render: (r) => <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 font-mono text-[11px] text-brand-200">{r.action}</span> },
            { key: 'actor', header: 'Actor', render: (r) => <div className="text-xs"><p>{r.actorName}</p><p className="text-subtle">{r.actorRole}</p></div> },
            { key: 'entity', header: 'Entity', render: (r) => <span className="text-xs text-muted">{r.entityType ? `${r.entityType} ${r.entityId || ''}` : '—'}</span> },
            { key: 'details', header: 'Details', render: (r) => <code className="block max-w-md truncate text-[11px] text-subtle" title={JSON.stringify(r.details)}>{r.details ? JSON.stringify(r.details) : '—'}</code> },
            { key: 'ip', header: 'IP', render: (r) => <span className="text-[11px] text-subtle">{r.ip || '—'}</span> },
          ]} />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>
    </div>
  );
}
