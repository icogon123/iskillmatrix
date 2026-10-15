import { Link } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  Users, Banknote, ShieldCheck, Share2, BookCheck, Clock, AlertTriangle, ChevronRight, CalendarCheck, HandCoins, ArrowLeftRight, UserPlus, UserRoundPlus, Camera, Lock,
} from 'lucide-react';
import { useDashboardQuery } from '../../api/memberApi';
import { Card, CardHeader, PageLoader, ErrorState, Notice, Button, StatusBadge, ProgressBar, CopyButton } from '../../components/ui';
import Money from '../../components/common/Money';
import WalletArt from '../../components/common/WalletArt';
import BadgeMedal from '../../components/common/BadgeMedal';
import Avatar from '../../components/common/Avatar';
import IncomeBreakdown from '../../components/common/IncomeBreakdown';
import ChartTooltip from '../../components/common/ChartTooltip';
import { shortDay, date } from '../../lib/format';

const ACTIONS = [
  { to: '/app/join', label: 'Join Member', icon: UserRoundPlus },
  { to: '/app/deposit', label: 'Deposit', icon: HandCoins },
  { to: '/app/transfer', label: 'Transfer', icon: ArrowLeftRight },
  { to: '/app/p2p', label: 'P2P Activate', icon: UserPlus },
  { to: '/app/withdraw', label: 'Payout', icon: Banknote },
  { to: '/app/team', label: 'My Team', icon: Users },
];

function Alerts({ d }) {
  const p = d.profile;
  const out = [];
  if (!p.isPackageActive) {
    if (d.latestPayment?.status === 'pending') {
      out.push(<Notice key="pay" tone="blue" icon={Clock} title="Payment under verification">
        Your {d.latestPayment.package?.name} payment ({d.latestPayment.paymentId}) was submitted on {date(d.latestPayment.createdAt)}. Your bundle activates once it is approved.
      </Notice>);
    } else {
      out.push(<Notice key="pay" tone="gold" icon={BookCheck} title="Activate your bundle to start learning and earning"
        action={<Button to="/app/activate" variant="gold" size="sm">Activate now</Button>}>
        {d.latestPayment?.status === 'rejected' ? `Your last payment was rejected: ${d.latestPayment.adminRemarks}. ` : ''}
        Your ID is not activated yet. Buy your {p.selectedPackage?.name || ''} bundle to activate it; after that you can invite and join new members.
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
        {/* Rank */}
        <Card className="card-pad flex flex-col">
          <div className="flex items-center gap-3">
            <Link to="/app/profile" className="relative shrink-0 rounded-full" title={d.profile.avatar ? 'Change profile picture' : 'Add a profile picture'}>
              <Avatar name={d.profile.fullName} src={d.profile.avatar} size="lg" className="ring-2 ring-gold-400/60" />
              <span className="absolute -right-0.5 -bottom-0.5 grid size-6 place-items-center rounded-full border-2 border-ink-850 bg-brand-500 text-white">
                <Camera className="size-3" />
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{d.profile.fullName}</p>
              <p className="text-xs text-muted">{d.profile.memberId}</p>
            </div>
            <BadgeMedal badgeKey={a.current?.key} size="lg" locked={!a.current} />
          </div>
          <div className="mt-4">
            <p className="text-sm text-muted">My Rank</p>
            <p className="gold-text mt-0.5 font-display text-2xl font-black">{a.current?.name || 'Member'}</p>
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

        {/* Earnings */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-2">
          <Card className="card-pad">
            <p className="text-xs font-semibold text-gold-400">Today's Earning</p>
            <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.earnings.today} /></p>
          </Card>
          <Card className="card-pad">
            <p className="text-xs font-semibold text-muted">Last 7 Days</p>
            <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.earnings.last7Total} /></p>
          </Card>
          <Card className="card-pad">
            <p className="text-xs font-semibold text-muted">This Month</p>
            <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.earnings.month} /></p>
          </Card>
          <Link to="/app/income" className="card card-pad transition hover:border-brand-500/40">
            <p className="text-xs font-semibold text-muted">Weekly Income</p>
            <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.weeklyIncome.total} /></p>
            <p className="mt-0.5 text-[11px] text-subtle">
              {d.weeklyIncome.pending > 0
                ? <>+<Money value={d.weeklyIncome.pending} /> awaiting credit</>
                : d.weeklyIncome.last
                  ? <>Last <Money value={d.weeklyIncome.last.amount} /> · week of {shortDay(d.weeklyIncome.last.week)}</>
                  : 'Credited every Monday'}
            </p>
          </Link>
          <Card className="card-pad">
            <p className="text-xs font-semibold text-muted">Pending Withdrawal</p>
            <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.wallet.pendingWithdrawal} /></p>
          </Card>
          <Card className="card-pad">
            <p className="text-xs font-semibold text-muted">Total Withdrawn</p>
            <p className="mt-1 text-lg font-bold sm:text-xl"><Money value={d.wallet.totalWithdrawn} /></p>
          </Card>
        </div>
      </div>

      {/* Balance */}
      <div className="hero-gradient relative overflow-hidden rounded-3xl p-5 shadow-glow sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/10 blur-2xl" />
        <WalletArt className="absolute right-3 bottom-3 hidden w-28 sm:right-6 sm:block sm:w-36" />
        <div className="relative sm:pr-40">
          <p className="text-sm font-medium text-white/80">Total Income</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl"><Money value={d.income.total} /></p>
          <div className="mt-5 grid max-w-md grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/10 px-3 py-2.5">
              <p className="text-xs font-medium text-white/75">Main Wallet</p>
              <p className="mt-0.5 text-lg font-bold text-white sm:text-xl"><Money value={d.wallet.balance} /></p>
              <p className="text-[10px] text-white/60">Withdraw · transfer · buy</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2.5">
              <p className="text-xs font-medium text-white/75">Activation Wallet</p>
              <p className="mt-0.5 text-lg font-bold text-white sm:text-xl"><Money value={d.wallet.activationBalance} /></p>
              <p className="text-[10px] text-white/60">For buying bundles</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button to="/app/withdraw" size="sm" variant="gold">Withdraw</Button>
            <Button to="/app/wallet" size="sm" variant="onBrand" className="bg-white/10">Wallet ledger</Button>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-1 py-1 sm:grid-cols-6 sm:gap-2">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="group flex flex-col items-center gap-2 rounded-2xl py-2 text-center text-[11px] font-medium text-muted hover:text-fg sm:text-xs">
            <span className="grid size-12 place-items-center rounded-full border border-brand-500/30 bg-gradient-to-b from-brand-500/25 to-brand-800/20 text-brand-200 shadow-glow transition group-hover:scale-105 sm:size-14">
              <Icon className="size-5 sm:size-6" />
            </span>
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
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
                      <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-line)" strokeOpacity={0.6} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-subtle)', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis hide domain={[0, 'dataMax']} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-brand-400)', strokeOpacity: 0.5, strokeDasharray: '3 3' }} />
                  <Area type="monotone" dataKey="total" name="Earning" stroke="var(--color-brand-400)" strokeWidth={2} fill="url(#earnFill)"
                    dot={{ r: 3, fill: 'var(--color-brand-400)', stroke: 'var(--color-ink-850)', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: 'var(--color-brand-300)', stroke: 'var(--color-ink-850)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Weekly progress */}
          {d.profile.isPackageActive && (
            <Card className="card-pad">
              <CardHeader title="This Week’s Qualification" subtitle={`Make ${d.weekly.required} same-bundle direct sales this week to share the ${d.weekly.percent}% weekly company pool`}
                action={<CalendarCheck className="size-5 text-brand-300" />} />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {d.weekly.packages.map((p) => {
                  const qualified = p.sales >= d.weekly.required;
                  return (
                    <div key={p.key} className="rounded-2xl border border-line bg-ink-900/60 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-xs text-muted">{p.sales} sale{p.sales === 1 ? '' : 's'}</span>
                      </div>
                      <ProgressBar className="mt-2" tone={qualified ? 'gold' : 'violet'} value={Math.min(p.sales / d.weekly.required, 1) * 100} />
                      <p className="mt-1.5 text-[11px] text-subtle">{qualified ? 'Qualified for this week’s pool' : `${d.weekly.required - p.sales} more to qualify`}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="card-pad">
            <CardHeader title="Income Summary" />
            <div className="mt-3"><IncomeBreakdown income={d.income} pending={d.income.pending} /></div>
          </Card>

          <Card className="card-pad">
            <CardHeader title="My Profile" action={<Link to="/app/profile" className="text-brand-300"><ChevronRight className="size-5" /></Link>} />
            <dl className="mt-3 space-y-2.5 text-sm">
              {[
                ['Member ID', <span className="font-semibold text-gold-400">{d.profile.memberId}</span>],
                ['Bundle', d.profile.package?.name || <span className="text-subtle">Not active</span>],
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
            {!d.profile.isPackageActive ? (
              <div className="mt-3 rounded-xl border border-gold-400/30 bg-gold-400/8 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold"><Lock className="size-4 text-gold-400" /> Locked until your ID is activated</p>
                <p className="mt-1 text-xs text-muted">Buy a course bundle to unlock your referral code and invite new members.</p>
                <Button to="/app/activate" variant="gold" size="sm" className="mt-3">Buy a bundle</Button>
              </div>
            ) : (
              <>
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
                <Button to="/app/join" variant="outline" size="sm" className="mt-3 w-full"><UserRoundPlus className="size-4" /> Join a new member</Button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
