import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { useMembersQuery, useAdminPackagesQuery } from '../../api/adminApi';
import { PageHeader, Card, Input, Select, DataTable, Pagination, StatusBadge } from '../../components/ui';
import Avatar from '../../components/common/Avatar';
import { useDebounce } from '../../lib/useDebounce';
import { date, inr } from '../../lib/format';

export default function Members() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: '', package: '', kyc: '', wallet: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);
  const { data, isFetching } = useMembersQuery({ ...filters, search: q, page });
  const { data: pk } = useAdminPackagesQuery();
  const setF = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  return (
    <div>
      <PageHeader icon={Users} title="Members" subtitle="Search members and open a profile to manage status, wallet and network." />
      <Card>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input icon={Search} placeholder="Name, member ID, mobile, email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select value={filters.status} onChange={setF('status')} placeholder="All approved statuses"
            options={['active', 'inactive', 'suspended'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
          <Select value={filters.package} onChange={setF('package')} placeholder="All bundles"
            options={[{ value: 'none', label: 'No bundle yet' }, ...(pk?.packages || []).map((p) => ({ value: p._id, label: p.name }))]} />
          <Select value={filters.kyc} onChange={setF('kyc')} placeholder="Any KYC status"
            options={['not_submitted', 'submitted', 'under_review', 'approved', 'rejected'].map((s) => ({ value: s, label: s.replace('_', ' ') }))} />
          <Select value={filters.wallet} onChange={setF('wallet')} placeholder="Any wallet" options={[{ value: 'suspended', label: 'Wallet suspended' }]} />
        </div>
        <DataTable
          loading={isFetching && !data}
          rows={data?.items || []}
          onRowClick={(r) => navigate(`/admin/members/${r._id}`)}
          columns={[
            {
              key: 'member', header: 'Member',
              render: (r) => (
                <div className="flex items-center gap-3">
                  <Avatar name={r.fullName} size="sm" />
                  <div><p className="font-semibold">{r.fullName}{r.isRoot && <span className="ml-1.5 rounded bg-gold-400/15 px-1 text-[10px] text-gold-400">ROOT</span>}</p><p className="text-xs text-muted">{r.memberId} · {r.mobile}</p></div>
                </div>
              ),
            },
            { key: 'sponsor', header: 'Sponsor', render: (r) => r.sponsor?.memberId || '—' },
            { key: 'package', header: 'Bundle', render: (r) => r.package?.name || <span className="text-subtle">—</span> },
            { key: 'badge', header: 'Badge', render: (r) => <span className="text-xs capitalize">{r.badge?.replace('_', ' ') || '—'}</span> },
            { key: 'lifetime', header: 'Lifetime', align: 'right', render: (r) => inr(r.lifetimeEarnings) },
            { key: 'kyc', header: 'KYC', render: (r) => <StatusBadge status={r.kycStatus} /> },
            { key: 'status', header: 'Status', render: (r) => <div className="flex flex-wrap gap-1"><StatusBadge status={r.status} />{r.walletSuspended && <StatusBadge status="suspended" label="Wallet suspended" />}</div> },
            { key: 'joined', header: 'Joined', render: (r) => <span className="text-xs">{date(r.createdAt)}</span> },
          ]}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>
    </div>
  );
}
