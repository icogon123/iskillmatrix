import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { useTeamQuery, useTeamMembersQuery } from '../../api/memberApi';
import { PageHeader, Card, StatCard, Input, DataTable, Pagination, StatusBadge, Tabs, PageLoader, ErrorState } from '../../components/ui';
import Avatar from '../../components/common/Avatar';
import { date } from '../../lib/format';
import { useDebounce } from '../../lib/useDebounce';

export default function Team() {
  const { data, isLoading, error, refetch } = useTeamQuery();
  const [level, setLevel] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data: list, isFetching } = useTeamMembersQuery({ level, page, search: q, limit: 20 });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { stats, levels } = data;

  return (
    <div>
      <PageHeader icon={Users} title="My Team" subtitle="Your direct referrals and downline, level by level." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Direct Team" value={stats.direct} icon={Users} />
        <StatCard label="Active Directs" value={stats.directActive} icon={Users} tone="green" />
        <StatCard label="Total Team" value={stats.total} icon={Users} tone="blue" />
        <StatCard label="Active Team" value={stats.active} icon={Users} tone="gold" />
      </div>

      <Card className="mt-5">
        <div className="space-y-3 p-4">
          <Tabs value={level} onChange={(v) => { setLevel(v); setPage(1); }}
            tabs={[{ value: 0, label: 'All levels', count: stats.total }, ...levels.map((l) => ({ value: l.level, label: l.level === 1 ? 'Level 1 (Direct)' : `Level ${l.level}`, count: l.total }))]} />
          <Input icon={Search} placeholder="Search by name or member ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:max-w-xs" />
        </div>
        <DataTable
          loading={isFetching && !list}
          rows={list?.items || []}
          columns={[
            {
              key: 'name', header: 'Member',
              render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.fullName} size="sm" />
                  <div>
                    <p className="font-semibold">{r.fullName}</p>
                    <p className="text-xs text-muted">{r.memberId}</p>
                  </div>
                </div>
              ),
            },
            { key: 'level', header: 'Level', render: (r) => `L${r.level}` },
            { key: 'sponsor', header: 'Sponsor', render: (r) => r.sponsor?.memberId },
            { key: 'package', header: 'Bundle', render: (r) => r.package?.name || <span className="text-subtle">Not active</span> },
            { key: 'joined', header: 'Joined', render: (r) => date(r.createdAt) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.package ? r.status : 'inactive'} label={r.package ? undefined : 'No bundle'} /> },
          ]}
        />
        <Pagination page={list?.page} pages={list?.pages} total={list?.total} onChange={setPage} />
      </Card>

      {levels.length > 0 && (
        <Card className="mt-5">
          <div className="p-4 pb-0"><h3 className="font-semibold">Level summary</h3></div>
          <DataTable dense rowKey="level" rows={levels}
            columns={[
              { key: 'level', header: 'Level', render: (r) => `Level ${r.level}` },
              { key: 'total', header: 'Members' },
              { key: 'active', header: 'Active' },
              { key: 'inactive', header: 'Without bundle', render: (r) => r.total - r.active },
            ]} />
        </Card>
      )}
    </div>
  );
}
