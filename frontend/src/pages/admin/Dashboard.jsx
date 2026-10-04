import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Users, UserPlus, QrCode, ShieldCheck, Banknote, IndianRupee, Receipt, Landmark, Wallet, PiggyBank, BadgePercent, ArrowRight, UserCheck,
} from 'lucide-react';
import { useAdminDashboardQuery } from '../../api/adminApi';
import { PageHeader, Card, CardHeader, StatCard, PageLoader, ErrorState, DataTable } from '../../components/ui';
import IncomeBreakdown from '../../components/common/IncomeBreakdown';
import ChartTooltip from '../../components/common/ChartTooltip';
import { inr, shortDay, timeAgo, num } from '../../lib/format';

function Queue({ to, label, count, icon: Icon }) {
  return (
    <Link to={to} className={`card card-pad flex items-center gap-3 transition hover:border-brand-500/50 ${count ? 'border-gold-400/40' : ''}`}>
      <span className={`grid size-10 place-items-center rounded-xl ${count ? 'bg-gold-400/15 text-gold-400' : 'bg-white/5 text-muted'}`}><Icon className="size-5" /></span>
      <div className="flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-xl font-bold">{count}</p>
      </div>
      <ArrowRight className="size-4 text-subtle" />
    </Link>
  );
}

function DailyChart({ data, dataKey, name, formatter }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="rgba(139,92,246,0.10)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6f6a9e', fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: '#6f6a9e', fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} allowDecimals={false} />
          <Tooltip content={<ChartTooltip valueFormatter={formatter} />} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
          <Bar dataKey={dataKey} name={name} fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: d, isLoading, error, refetch } = useAdminDashboardQuery(undefined, { refetchOnMountOrArgChange: true });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const f = d.finance;
  const daily = d.daily.map((x) => ({ ...x, label: shortDay(x.date) }));

  return (
    <div className="space-y-5">
      <PageHeader title="Admin Dashboard" subtitle="Members, collections, income and payouts at a glance." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Queue to="/admin/registrations" label="Pending registrations" count={d.queues.pendingRegistrations} icon={UserPlus} />
        <Queue to="/admin/payments" label="Payments to verify" count={d.queues.pendingPayments} icon={QrCode} />
        <Queue to="/admin/kyc" label="KYC to review" count={d.queues.pendingKyc} icon={ShieldCheck} />
        <Queue to="/admin/withdrawals" label="Open withdrawals" count={d.queues.pendingWithdrawals} icon={Banknote} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total members" value={num(d.members.total)} hint={`${d.members.active || 0} approved · ${d.members.pending || 0} pending`} icon={Users} />
        <StatCard label="Active (with package)" value={num(d.members.withPackage)} hint={`${(d.members.suspended || 0) + (d.members.inactive || 0)} inactive / suspended`} icon={UserCheck} tone="green" />
        <StatCard label="Total collection" value={inr(f.collection)} hint="Approved package payments" icon={IndianRupee} tone="gold" />
        <StatCard label="Income distributed" value={inr(f.incomePaid)} hint="All income types credited" icon={Wallet} tone="blue" />
        <StatCard label="GST (18%)" value={inr(f.gst)} icon={Receipt} tone="pink" />
        <StatCard label="System tax income (12%)" value={inr(f.systemCost)} icon={Landmark} />
        <StatCard label="Wallet liability" value={inr(f.walletLiability)} hint="Balance held in member wallets" icon={PiggyBank} tone="red" />
        <StatCard label="Withdrawals paid" value={inr(f.withdrawals.paid)} hint={`TDS ${inr(f.withdrawals.tds)} · Admin ${inr(f.withdrawals.adminCharge)}`} icon={BadgePercent} tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-pad">
          <CardHeader title="Daily collection" subtitle="Approved package payments, last 14 days" />
          <div className="mt-3"><DailyChart data={daily} dataKey="collection" name="Collection" formatter={inr} /></div>
        </Card>
        <Card className="card-pad">
          <CardHeader title="Daily registrations" subtitle="New sign-ups, last 14 days" />
          <div className="mt-3"><DailyChart data={daily} dataKey="joinings" name="Registrations" formatter={(v) => num(v)} /></div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="card-pad pb-0"><CardHeader title="Package statistics" subtitle="Sales and tax split of approved payments" /></div>
          <DataTable dense rowKey="key" rows={d.packages}
            columns={[
              { key: 'name', header: 'Package', render: (r) => <span className="font-semibold">{r.name}</span> },
              { key: 'count', header: 'Sold', align: 'right' },
              { key: 'amount', header: 'Collection', align: 'right', render: (r) => inr(r.amount) },
              { key: 'gst', header: 'GST', align: 'right', render: (r) => inr(r.gst) },
              { key: 'systemCost', header: 'System', align: 'right', render: (r) => inr(r.systemCost) },
              { key: 'packageCost', header: 'Package cost', align: 'right', render: (r) => inr(r.packageCost) },
            ]} />
        </Card>
        <Card className="card-pad">
          <CardHeader title="Income credited by type" />
          <div className="mt-3"><IncomeBreakdown income={{ ...f.income, total: f.incomePaid }} /></div>
          {Object.keys(f.pendingIncome).length > 0 && (
            <p className="mt-3 rounded-xl bg-warning/10 p-2.5 text-xs text-warning">
              Pending: {Object.entries(f.pendingIncome).map(([k, v]) => `${k.replace('_', ' ')} ${inr(v.total)}`).join(' · ')}
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-pad">
          <CardHeader title="Latest pending registrations" action={<Link to="/admin/registrations" className="text-xs font-semibold text-brand-300">View all</Link>} />
          <ul className="mt-3 divide-y divide-line/60 text-sm">
            {d.recentRegistrations.length === 0 && <li className="py-6 text-center text-subtle">All caught up</li>}
            {d.recentRegistrations.map((u) => (
              <li key={u._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{u.fullName} <span className="font-normal text-muted">· {u.memberId}</span></p>
                  <p className="text-xs text-subtle">Sponsor {u.sponsor?.memberId} · {u.selectedPackage?.name}</p>
                </div>
                <span className="shrink-0 text-xs text-subtle">{timeAgo(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="card-pad">
          <CardHeader title="Latest payments to verify" action={<Link to="/admin/payments" className="text-xs font-semibold text-brand-300">View all</Link>} />
          <ul className="mt-3 divide-y divide-line/60 text-sm">
            {d.recentPayments.length === 0 && <li className="py-6 text-center text-subtle">All caught up</li>}
            {d.recentPayments.map((p) => (
              <li key={p._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.user?.fullName} <span className="font-normal text-muted">· {p.package?.name}</span></p>
                  <p className="text-xs text-subtle">{p.paymentId} · UTR {p.utr}</p>
                </div>
                <span className="shrink-0 font-semibold">{inr(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
