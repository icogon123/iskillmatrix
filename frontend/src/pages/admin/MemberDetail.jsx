import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2, PauseCircle, Wallet, KeyRound, Pencil, Eye, EyeOff, Lock, LockOpen } from 'lucide-react';
import {
  useMemberQuery, useMemberStatusMutation, useWalletAdjustMutation, useWalletStatusMutation, useMemberResetPasswordMutation, useMemberProfileMutation, useLazyNetworkQuery, useNetworkQuery,
} from '../../api/adminApi';
import {
  Card, CardHeader, Button, Tabs, KeyValue, StatusBadge, DataTable, Modal, Input, Select, Textarea, ConfirmModal, PageLoader, ErrorState, StatCard, Notice,
} from '../../components/ui';
import Avatar from '../../components/common/Avatar';
import BadgeMedal from '../../components/common/BadgeMedal';
import IncomeBreakdown from '../../components/common/IncomeBreakdown';
import FileLink from '../../components/common/FileLink';
import TreeView from '../../components/common/TreeView';
import { useAction } from '../../lib/useAction';
import { LEDGER_LABELS, WALLETS, WALLET_LABELS } from '../../lib/constants';
import { inr, date, dateTime } from '../../lib/format';

function Network({ id }) {
  const { data, isLoading } = useNetworkQuery({ node: id });
  const [load] = useLazyNetworkQuery();
  if (isLoading) return <PageLoader />;
  return <TreeView root={data.node} load={(n) => load({ node: n }, true).unwrap()} />;
}

export default function MemberDetail() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useMemberQuery(id);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [adjust, setAdjust] = useState({ wallet: 'main', type: 'credit', amount: '', remarks: '' });
  const [profile, setProfile] = useState(null);
  const [statusT, { isLoading: s1 }] = useMemberStatusMutation();
  const [adjustT, { isLoading: s2 }] = useWalletAdjustMutation();
  const [resetT, { isLoading: s3 }] = useMemberResetPasswordMutation();
  const [profileT, { isLoading: s4 }] = useMemberProfileMutation();
  const [walletStatusT, { isLoading: s5 }] = useWalletStatusMutation();
  const setWalletStatus = useAction(walletStatusT);
  const changeStatus = useAction(statusT);
  const doAdjust = useAction(adjustT);
  const resetPassword = useAction(resetT);
  const saveProfile = useAction(profileT);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { user: u, kyc, wallet, income, team, payments, withdrawals, ledger, deposits } = data;
  const digits = (v) => String(v || '').replace(/\D/g, '');
  const aadhaarMatch = kyc && u.aadhaar ? digits(kyc.aadhaarNumber) === digits(u.aadhaar) : null;
  const mask = (v, n = 4) => (reveal || !v ? v : `${'•'.repeat(Math.max(0, String(v).length - n))}${String(v).slice(-n)}`);

  return (
    <div className="space-y-5">
      <Link to="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Members</Link>

      <Card className="card-pad">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-4">
            <Avatar name={u.fullName} src={u.avatar} size="lg" />
            <div className="min-w-0">
              <p className="text-xl font-bold">{u.fullName}</p>
              <p className="text-sm text-muted">{u.memberId} · @{u.username} · joined {date(u.createdAt)}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5"><StatusBadge status={u.status} /><StatusBadge status={u.kycStatus} label={`KYC: ${u.kycStatus.replace('_', ' ')}`} />{u.walletSuspended && <StatusBadge status="suspended" label="Wallet suspended" />}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!u.isRoot && (
              <>
                {u.status !== 'active' && <Button size="sm" variant="success" onClick={() => setModal('active')}><CheckCircle2 className="size-4" /> Activate</Button>}
                {u.status === 'active' && <Button size="sm" variant="outline" onClick={() => setModal('inactive')}><PauseCircle className="size-4" /> Deactivate</Button>}
                {u.status !== 'suspended' && <Button size="sm" variant="danger" onClick={() => setModal('suspended')}><Ban className="size-4" /> Suspend</Button>}
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => setModal('wallet')}><Wallet className="size-4" /> Adjust wallet</Button>
            {u.walletSuspended
              ? <Button size="sm" variant="success" onClick={() => setModal('walletOn')}><LockOpen className="size-4" /> Reactivate wallet</Button>
              : <Button size="sm" variant="danger" onClick={() => setModal('walletOff')}><Lock className="size-4" /> Suspend wallet</Button>}
            <Button size="sm" variant="outline" onClick={() => setModal('password')}><KeyRound className="size-4" /> Reset password</Button>
            <Button size="sm" variant="ghost" onClick={() => { setProfile({ fullName: u.fullName, email: u.email, mobile: u.mobile, country: u.country }); setModal('profile'); }}><Pencil className="size-4" /> Edit</Button>
          </div>
        </div>
        {u.statusReason && u.status !== 'active' && <p className="mt-3 text-xs text-danger">Reason: {u.statusReason}</p>}
      </Card>

      {u.walletSuspended && (
        <Notice tone="red" icon={Lock} title={`Wallet suspended ${dateTime(u.walletSuspendedAt)}${u.walletSuspendedBy ? ` by ${u.walletSuspendedBy.fullName}` : ''}`}
          action={<Button size="sm" variant="outline" onClick={() => setModal('walletOn')}><LockOpen className="size-4" /> Reactivate</Button>}>
          Reason: {u.walletSuspendedReason}. Income still credits to the wallet; the member cannot withdraw and open withdrawals can only be rejected.
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Main wallet" value={inr(wallet.balance)} hint="Withdrawable" tone="gold" icon={Wallet} />
        <StatCard label="Activation wallet" value={inr(wallet.activationBalance)} hint="Bundles only" tone="pink" icon={Wallet} />
        <StatCard label="Total income" value={inr(income.total)} tone="violet" icon={Wallet} />
        <StatCard label="Pending / withdrawn" value={`${inr(wallet.pendingWithdrawal)} / ${inr(wallet.totalWithdrawn)}`} tone="blue" icon={Wallet} />
        <StatCard label="Team (direct / total)" value={`${team.direct} / ${team.total}`} hint={`${team.active} active`} tone="green" icon={Wallet} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'overview', label: 'Overview' }, { value: 'ledger', label: 'Ledger', count: ledger.length }, { value: 'payments', label: 'Payments', count: payments.length },
        { value: 'withdrawals', label: 'Withdrawals', count: withdrawals.length }, { value: 'deposits', label: 'Deposits', count: deposits.length },
        { value: 'network', label: 'Network' },
      ]} />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="card-pad lg:col-span-2">
            <CardHeader title="Profile" action={<Button size="sm" variant="ghost" onClick={() => setReveal((r) => !r)}>{reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{reveal ? 'Mask' : 'Reveal'}</Button>} />
            <KeyValue className="mt-4" items={[
              ['Email', u.email], ['Mobile', u.mobile], ['Date of birth', date(u.dob)], ['Country', u.country], ['Aadhaar', mask(u.aadhaar)],
              ['Sponsor', u.sponsor ? `${u.sponsor.fullName} (${u.sponsor.memberId})` : '—'], ['Network level', u.depth],
              ['Bundle', u.package ? `${u.package.name} · ${inr(u.package.price)}` : `Selected: ${u.selectedPackage?.name || '—'}`],
              ['Activated', date(u.packageActivatedAt)], ['Approved', u.approvedAt ? `${date(u.approvedAt)} by ${u.approvedBy?.fullName || '—'}` : '—'],
              ['Last login', dateTime(u.lastLoginAt)], ['Lifetime earnings', inr(u.lifetimeEarnings)],
            ]} />
            {kyc && (
              <>
                <h4 className="mt-6 mb-3 border-t border-line pt-4 text-sm font-semibold">
                  KYC <StatusBadge status={kyc.status} className="ml-2" />
                  {aadhaarMatch !== null && <StatusBadge status={aadhaarMatch ? 'approved' : 'rejected'} label={aadhaarMatch ? 'Aadhaar matches registration' : 'Aadhaar differs from registration'} className="ml-2" />}
                </h4>
                <KeyValue items={[
                  ['Aadhaar', mask(kyc.aadhaarNumber)], ['PAN', reveal ? kyc.panNumber : `${kyc.panNumber.slice(0, 2)}•••••${kyc.panNumber.slice(-3)}`],
                  ['Bank', kyc.bankName], ['Account holder', kyc.accountHolder], ['Account number', mask(kyc.accountNumber)], ['IFSC', kyc.ifsc],
                  ['Documents', <span className="flex gap-3"><FileLink name={kyc.aadhaarDoc} label="Aadhaar" /><FileLink name={kyc.panDoc} label="PAN" />{kyc.bankDoc && <FileLink name={kyc.bankDoc} label="Bank" />}</span>],
                ]} />
              </>
            )}
          </Card>
          <div className="space-y-4">
            <Card className="card-pad">
              <CardHeader title="Achievement" />
              <div className="mt-3 flex items-center gap-3">
                <BadgeMedal badgeKey={u.badge} locked={!u.badge} />
                <div><p className="font-bold capitalize">{u.badge?.replace('_', ' ') || 'None yet'}</p><p className="text-xs text-muted">{u.badgeAchievedAt ? `since ${date(u.badgeAchievedAt)}` : ''}</p></div>
              </div>
            </Card>
            <Card className="card-pad"><CardHeader title="Income" /><div className="mt-3"><IncomeBreakdown income={income} pending={income.pending} /></div></Card>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <Card>
          <DataTable dense rows={ledger} columns={[
            { key: 'date', header: 'Date', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
            { key: 'wallet', header: 'Wallet', render: (r) => <span className="text-xs whitespace-nowrap text-muted">{WALLET_LABELS[r.wallet || 'main']}</span> },
            { key: 'cat', header: 'Type', render: (r) => <span className="whitespace-nowrap">{LEDGER_LABELS[r.category]}{r.level ? ` · L${r.level}` : ''}</span> },
            { key: 'src', header: 'Source', render: (r) => <span className="text-xs text-muted">{(r.sourceUser || r.counterparty)?.memberId || r.period || r.reference || '—'}</span> },
            { key: 'remarks', header: 'Remarks', render: (r) => <span className="block max-w-xs truncate text-xs text-muted" title={r.remarks}>{r.remarks}</span> },
            { key: 'amt', header: 'Amount', align: 'right', render: (r) => <span className={r.direction === 'credit' ? 'text-success' : 'text-danger'}>{r.direction === 'credit' ? '+' : '−'}{inr(r.netAmount)}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]} />
          <p className="px-4 py-3 text-xs text-subtle">Latest 50 entries. Use Financial Ledger for the full history.</p>
        </Card>
      )}

      {tab === 'payments' && (
        <Card>
          <DataTable dense rows={payments} columns={[
            { key: 'id', header: 'Payment', render: (r) => <span className="font-semibold">{r.paymentId}</span> },
            { key: 'date', header: 'Submitted', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
            {
              key: 'for', header: 'For',
              render: (r) => (r.user?._id === u._id ? <span className="text-xs">This member</span> : <span className="text-xs">{r.user?.fullName} ({r.user?.memberId})</span>),
            },
            { key: 'pkg', header: 'Bundle', render: (r) => r.package?.name },
            { key: 'amt', header: 'Amount', render: (r) => inr(r.amount) },
            {
              key: 'utr', header: 'Paid with',
              render: (r) => <span className="text-xs">{r.method === 'wallet' ? `${WALLET_LABELS[r.wallet] || 'Wallet'}${r.paidBy && r.paidBy._id !== u._id ? ` of ${r.paidBy.memberId}` : ''}` : `UPI · ${r.utr}`}</span>,
            },
            { key: 'proof', header: 'Proof', render: (r) => <FileLink name={r.proof} /> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'rem', header: 'Remarks', render: (r) => <span className="text-xs text-muted">{r.adminRemarks || '—'}</span> },
          ]} />
        </Card>
      )}

      {tab === 'withdrawals' && (
        <Card>
          <DataTable dense rows={withdrawals} columns={[
            { key: 'id', header: 'ID', render: (r) => <span className="font-semibold">{r.withdrawalId}</span> },
            { key: 'date', header: 'Requested', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
            { key: 'amt', header: 'Amount', render: (r) => inr(r.amount) },
            { key: 'net', header: 'Net', render: (r) => inr(r.netAmount) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'ref', header: 'Reference', render: (r) => <span className="text-xs text-muted">{r.paymentReference || r.adminRemarks || '—'}</span> },
          ]} />
        </Card>
      )}

      {tab === 'deposits' && (
        <Card>
          <DataTable dense rows={deposits} empty={<p className="py-10 text-center text-sm text-subtle">No deposits</p>} columns={[
            { key: 'id', header: 'Deposit', render: (r) => <span className="font-semibold">{r.depositId}</span> },
            { key: 'date', header: 'Submitted', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
            { key: 'amt', header: 'Amount', render: (r) => inr(r.amount) },
            { key: 'utr', header: 'UTR', render: (r) => <span className="font-mono text-xs">{r.utr}</span> },
            { key: 'proof', header: 'Proof', render: (r) => <FileLink name={r.proof} /> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'rem', header: 'Remarks', render: (r) => <span className="text-xs text-muted">{r.adminRemarks || '—'}</span> },
          ]} />
        </Card>
      )}

      {tab === 'network' && <Card className="card-pad"><Network id={u._id} /></Card>}

      <ConfirmModal open={['active', 'inactive', 'suspended'].includes(modal)} onClose={() => setModal(null)} loading={s1}
        title={modal === 'active' ? 'Activate member?' : modal === 'inactive' ? 'Deactivate member?' : 'Suspend member?'}
        variant={modal === 'active' ? 'success' : 'danger'} confirmLabel={modal === 'active' ? 'Activate' : modal === 'inactive' ? 'Deactivate' : 'Suspend'}
        message={modal === 'active' ? 'The member will be able to log in and receive income again.' : 'The member will be logged out, cannot log in, and new income for them will be recorded as lapsed.'}
        reasonLabel={modal !== 'active' ? 'Reason' : undefined} requireReason={modal !== 'active'}
        onConfirm={async ({ reason }) => (await changeStatus({ id, status: modal, reason })) && setModal(null)} />

      <ConfirmModal open={modal === 'walletOff'} onClose={() => setModal(null)} loading={s5} title="Suspend wallet?" variant="danger" confirmLabel="Suspend wallet"
        message={`${u.fullName} will not be able to withdraw, transfer or pay from either wallet. Income keeps crediting to the Main Wallet (balance ${inr(wallet.balance)}), and open withdrawals can only be rejected until you reactivate it. The member is notified with the reason.`}
        reasonLabel="Reason (shown to the member)" requireReason
        onConfirm={async ({ reason }) => (await setWalletStatus({ id, suspended: true, reason })) && setModal(null)} />
      <ConfirmModal open={modal === 'walletOn'} onClose={() => setModal(null)} loading={s5} title="Reactivate wallet?" variant="success" confirmLabel="Reactivate wallet"
        message={`${u.fullName} will be able to withdraw, transfer and pay from their wallets again.`}
        onConfirm={async () => (await setWalletStatus({ id, suspended: false })) && setModal(null)} />

      <Modal open={modal === 'wallet'} onClose={() => setModal(null)} title="Adjust wallet" subtitle={`Main ${inr(wallet.balance)} · Activation ${inr(wallet.activationBalance)}`}
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button loading={s2} disabled={!adjust.amount || !adjust.remarks.trim()}
            onClick={async () => { if (await doAdjust({ id, ...adjust, amount: Number(adjust.amount) })) { setModal(null); setAdjust({ wallet: 'main', type: 'credit', amount: '', remarks: '' }); } }}>Post adjustment</Button></>}>
        <div className="space-y-4">
          <Select label="Wallet" value={adjust.wallet} onChange={(e) => setAdjust({ ...adjust, wallet: e.target.value })}
            options={WALLETS.map((w) => ({ value: w.value, label: `${w.label} (${inr(w.value === 'main' ? wallet.balance : wallet.activationBalance)})` }))}
            hint={adjust.wallet === 'main' ? 'Main Wallet money can be withdrawn.' : 'Activation Wallet money can only buy bundles.'} />
          <Select label="Type" value={adjust.type} onChange={(e) => setAdjust({ ...adjust, type: e.target.value })} options={[{ value: 'credit', label: 'Credit (add to wallet)' }, { value: 'debit', label: 'Debit (deduct from wallet)' }]} />
          <Input label="Amount (₹)" type="number" min="1" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} />
          <Textarea label="Remarks" required value={adjust.remarks} onChange={(e) => setAdjust({ ...adjust, remarks: e.target.value })} hint="Shown to the member and recorded in the audit log." />
        </div>
      </Modal>

      <ConfirmModal open={modal === 'password'} onClose={() => setModal(null)} title="Reset login password" confirmLabel="Reset password" loading={s3}
        message="Set a new login password and share it with the member securely. Their active sessions will end."
        inputLabel="New password" inputPlaceholder="Min 8 chars with letter, number, symbol" requireInput
        onConfirm={async ({ input }) => (await resetPassword({ id, password: input })) && setModal(null)} />

      <Modal open={modal === 'profile'} onClose={() => setModal(null)} title="Edit member details"
        footer={<><Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button><Button loading={s4} onClick={async () => (await saveProfile({ id, ...profile })) && setModal(null)}>Save</Button></>}>
        {profile && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[['fullName', 'Full name'], ['email', 'Email'], ['mobile', 'Mobile'], ['country', 'Country']].map(([k, l]) => (
              <Input key={k} label={l} value={profile[k] || ''} onChange={(e) => setProfile({ ...profile, [k]: e.target.value })} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
