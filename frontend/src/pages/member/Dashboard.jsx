import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Users, Network, Banknote, IndianRupee, ShieldCheck, Share2, PackageCheck, Clock, AlertTriangle, ChevronRight, CalendarCheck,
} from 'lucide-react';
import { useDashboardQuery } from '../../api/memberApi';
import { Card, CardHeader, PageLoader, ErrorState, Notice, Button, StatusBadge, ProgressBar, CopyButton } from '../../components/ui';
import Money from '../../components/common/Money';
import WalletArt from '../../components/common/WalletArt';
import BadgeMedal from '../../components/common/BadgeMedal';
import IncomeBreakdown from '../../components/common/IncomeBreakdown';
import ChartTooltip from '../../components/common/ChartTooltip';
import { shortDay, date } from '../../lib/format';

const ACTIONS = [
  { to: '/app/team', label: 'My Team', icon: Users },
  { to: '/app/genealogy', label: 'Genealogy', icon: Network },
  { to: '/app/withdraw', label: 'Payout', icon: Banknote },
  { to: '/app/income', label: 'Income', icon: IndianRupee },
];

function Alerts({ d }) {
  const p = d.profile;
  const out = [];
  if (!p.isPackageActive) {
    if (d.latestPayment?.status === 'pending') {
      out.push(<Notice key="pay" tone="blue" icon={Clock} title="Payment under verification">
        Your {d.latestPayment.package?.name} payment ({d.latestPayment.paymentId}) was submitted on {date(d.latestPayment.createdAt)}. Your package activates once it is approved.
      </Notice>);
    } else {
      out.push(<Notice key="pay" tone="gold" icon={PackageCheck} title="Activate your package to start earning"
        action={<Button to="/app/activate" variant="gold" size="sm">Activate now</Button>}>
        {d.latestPayment?.status === 'rejected' ? `Your last payment was rejected: ${d.latestPayment.adminRemarks}. ` : ''}
        Pay for your {p.selectedPackage?.name || ''} package using the QR code and upload the payment proof.
      </Notice>);
    }
  }
  if (d.kyc.status === 'not_submitted' || d.kyc.status === 'rejected') {
    out.push(<Notice key="kyc" tone={d.kyc.status === 'rejected' ? 'red' : 'violet'} icon={d.kyc.status === 'rejected' ? AlertTriangle : ShieldCheck}
      title={d.kyc.status === 'rejected' ? 'KYC rejected — please re-submit' : 'Complete your KYC'}
      action={<Button to="/app/kyc" variant="outline" size="sm">Go to KYC</Button>}>
      {d.kyc.status === 'rejected' ? d.kyc.rejectionReason : 'Aadhaar, PAN and bank details are required before you can withdraw.'}
    </Notice>);
  }
  return out.length ? <div className="space-y-3">{out}</div> : null;
}

export default function Dashboard() {
  const { data: d, isLoading, error, refetch } = useDashboardQuery(undefined, { refetchOnMountOrArgChange: 30 });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const a = d.achievement;
  const chart = d.earnings.last7Days.map((x) => ({ ...x, label: shortDay(x.date) }));

  return (
    <div className="space-y-4">
      <Alerts d={d} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Balance */}
        <div className="hero-gradient relative overflow-hidden rounded-3xl p-5 shadow-glow sm:p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" />
          <WalletArt className="absolute right-3 bottom-3 w-28 sm:right-6 sm:w-36" />
          <div className="relative">
            <p className="text-sm font-medium text-brand-100/85">Total Income</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"><Money value={d.income.total} /></p>
            <p className="mt-5 text-sm font-medium text-brand-100/85">Wallet Balance</p>
            <p className="mt-0.5 text-xl font-bold text-white sm:text-2xl"><Money value={d.wallet.balance} /></p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button to="/app/withdraw" size="sm" variant="gold">Withdraw</Button>
              <Button to="/app/wallet" size="sm" variant="outline" className="border-white/25 bg-white/10 text-white">Wallet ledger</Button>
            </div>
          </div>
        </div>

        {/* Rank */}
        <Card className="card-pad flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted">My Rank</p>
              <p className="gold-text mt-1 font-display text-2xl font-black">{a.current?.name || 'Member'}</p>
            </div>
            <BadgeMedal badgeKey={a.current?.key} size="lg" locked={!a.current} />
          </div>
          <div className="mt-auto pt-5">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>{a.next ? `Progress to ${a.next.name}` : 'Highest rank achieved'}</span>
              <span className="font-semibold text-fg">{Math.floor(a.progress)}%</span>
            </div>
            <ProgressBar value={a.progress} />
            {a.next && <p className="mt-2 text-xs text-subtle"><Money value={a.requiredAmount} /> more lifetime earnings needed</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="card-pad">
          <p className="text-xs font-semibold text-gold-400">Today's Earning</p>
          <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.earnings.today} /></p>
        </Card>
        <Card className="card-pad">
          <p className="text-xs font-semibold text-muted">This Month</p>
          <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.earnings.month} /></p>
        </Card>
        <Card className="card-pad">
          <p className="text-xs font-semibold text-muted">Pending Withdrawal</p>
          <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.wallet.pendingWithdrawal} /></p>
        </Card>
        <Card className="card-pad">
          <p className="text-xs font-semibold text-muted">Total Withdrawn</p>
          <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.wallet.totalWithdrawn} /></p>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 py-1">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="group flex flex-col items-center gap-2 rounded-2xl py-2 text-xs font-medium text-muted hover:text-fg">
            <span className="grid size-14 place-items-center rounded-full border border-brand-500/30 bg-gradient-to-b from-brand-500/25 to-brand-800/20 text-brand-200 shadow-glow transition group-hover:scale-105">
              <Icon className="size-6" />
            </span>
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Team overview */}
          <Card className="card-pad">
            <CardHeader title="Team Overview" action={<Link to="/app/team" className="text-xs font-semibold text-brand-300">View all</Link>} />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[['Total Team', d.team.total], ['Active Team', d.team.active], ['Direct Team', d.team.direct]].map(([l, v]) => (
                <div key={l} className="rounded-2xl border border-line bg-ink-900/60 p-3 text-center">
                  <p className="text-[11px] text-muted">{l}</p>
                  <p className="mt-1 text-xl font-bold">{v.toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 7-day earnings */}
          <Card className="card-pad">
            <CardHeader title="Last 7 Days Earning" action={<Link to="/app/income" className="text-xs font-semibold text-brand-300">View all</Link>} />
            <p className="mt-2 text-2xl font-extrabold"><Money value={d.earnings.last7Total} /></p>
            <div className="mt-3 h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 8, right: 6, left: 6, bottom: 0 }}>
                  <defs>
                    <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(139,92,246,0.10)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6f6a9e', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis hide domain={[0, 'dataMax']} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#a78bfa', strokeOpacity: 0.5, strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="total" name="Earning" stroke="#a78bfa" strokeWidth={2} fill="url(#earnFill)"
                    dot={{ r: 3, fill: '#a78bfa', stroke: '#120f2e', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#c4b5fd', stroke: '#120f2e', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Weekly progress */}
          {d.profile.isPackageActive && (
            <Card className="card-pad">
              <CardHeader title="This Week’s Qualification" subtitle={`Make ${d.weekly.required} same-package direct sales this week to earn ${d.weekly.percent}% weekly income`}
                action={<CalendarCheck className="size-5 text-brand-300" />} />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {d.weekly.packages.map((p) => {
                  const sets = Math.floor(p.sales / d.weekly.required);
                  const into = p.sales % d.weekly.required;
                  return (
                    <div key={p.key} className="rounded-2xl border border-line bg-ink-900/60 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-xs text-muted">{p.sales} sale{p.sales === 1 ? '' : 's'}</span>
                      </div>
                      <ProgressBar className="mt-2" tone={sets ? 'gold' : 'violet'} value={sets && !into ? 100 : (into / d.weekly.required) * 100} />
                      <p className="mt-1.5 text-[11px] text-subtle">{sets ? `${sets}× qualified` : `${d.weekly.required - into} more to qualify`}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="card-pad">
            <CardHeader title="Income Summary" />
            <div className="mt-3"><IncomeBreakdown income={d.income} pending={d.income.pending} /></div>
          </Card>

          <Card className="card-pad">
            <CardHeader title="My Profile" action={<Link to="/app/profile" className="text-brand-300"><ChevronRight className="size-5" /></Link>} />
            <dl className="mt-3 space-y-2.5 text-sm">
              {[
                ['Member ID', <span className="font-semibold text-gold-400">{d.profile.memberId}</span>],
                ['Package', d.profile.package?.name || <span className="text-subtle">Not active</span>],
                ['Sponsor', d.profile.sponsor ? `${d.profile.sponsor.fullName} (${d.profile.sponsor.memberId})` : '—'],
                ['Account', <StatusBadge status={d.profile.status} />],
                ['KYC', <StatusBadge status={d.kyc.status} />],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="card-pad">
            <CardHeader title="Refer & Earn" subtitle="Share your link — new members join your team" action={<Share2 className="size-5 text-brand-300" />} />
            <div className="mt-3 rounded-xl border border-line bg-ink-900 p-3">
              <p className="text-[11px] text-subtle">Referral code</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-lg font-black text-gold-400">{d.referral.code}</p>
                <CopyButton text={d.referral.code} />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-ink-900 p-3">
              <p className="min-w-0 flex-1 truncate text-xs text-muted">{d.referral.link}</p>
              <CopyButton text={d.referral.link} label="Link" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
