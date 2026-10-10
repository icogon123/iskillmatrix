import { useState } from 'react';
import { ArrowLeftRight, Lock, Wallet, Users, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWalletQuery, useTransfersQuery, useCreateTransferMutation } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import {
  PageHeader, Card, CardHeader, Input, Button, Notice, PageLoader, ErrorState, DataTable, Pagination, Tabs,
} from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import MemberFinder from './MemberFinder';
import Money from '../../components/common/Money';
import { inr, dateTime } from '../../lib/format';

const transferProblem = (m) => {
  if (m.relation === 'self') return 'To fill your own Activation Wallet, choose “My Activation Wallet” above.';
  if (!m.canReceiveTransfer) {
    if (m.status !== 'active') return 'This member’s account is not active.';
    if (!m.relation) return 'You can only transfer to members in your upline or your downline team.';
    return 'This account cannot receive transfers.';
  }
  return null;
};

export default function Transfer() {
  const { data: w, isLoading, error, refetch } = useWalletQuery();
  const [create, { isLoading: saving }] = useCreateTransferMutation();
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data: list, isFetching } = useTransfersQuery({ type, page, limit: 10 });
  const [target, setTarget] = useState('self');
  const [username, setUsername] = useState('');
  const [member, setMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [txnPassword, setTxnPassword] = useState('');

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const amt = Number(amount) || 0;
  const tooLow = amt > 0 && amt < w.transferMin;
  const tooHigh = amt > w.balance;
  const memberOk = target === 'self' || (member && !transferProblem(member));
  const blocked = Boolean(w.suspended);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await create({ target, username: target === 'member' ? member.username : undefined, amount: amt, txnPassword, remarks: remarks || undefined }).unwrap();
      toast.success(res.message);
      setAmount('');
      setRemarks('');
      setTxnPassword('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader icon={ArrowLeftRight} title="Transfer Fund"
        subtitle="Send Main Wallet money to your own Activation Wallet, or to a member in your upline or downline." />

      {blocked && (
        <Notice tone="red" icon={Lock} title="Your wallet is suspended" className="mb-5">
          {w.suspended.reason ? `Reason: ${w.suspended.reason}. ` : ''}Transfers are on hold until the admin reactivates your wallet.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-pad lg:col-span-3">
          <CardHeader title="New transfer" />
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gold-400/40 bg-gold-400/10 p-3">
                <p className="text-xs text-muted">Main Wallet (available)</p>
                <p className="text-xl font-bold text-gold-400"><Money value={w.balance} /></p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs text-muted">Your Activation Wallet</p>
                <p className="text-xl font-bold"><Money value={w.activationBalance} /></p>
              </div>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted">Transfer to</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: 'self', label: 'My Activation Wallet', hint: 'Use it to buy bundles', icon: Wallet },
                  { value: 'member', label: 'Another member', hint: 'Upline or downline, by username', icon: Users },
                ].map((o) => (
                  <label key={o.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${target === o.value ? 'border-gold-400/60 bg-gold-400/10' : 'border-line hover:border-brand-500/40'}`}>
                    <input type="radio" name="target" className="sr-only" checked={target === o.value} disabled={blocked} onChange={() => setTarget(o.value)} />
                    <o.icon className={`size-5 shrink-0 ${target === o.value ? 'text-gold-400' : 'text-subtle'}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-[11px] text-muted">{o.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {target === 'member' && (
              <MemberFinder value={username} onChange={setUsername} member={member} onFound={setMember} check={transferProblem} disabled={blocked} />
            )}

            <Input label="Amount (₹)" type="number" inputMode="decimal" min={w.transferMin} step="1" value={amount} disabled={blocked}
              onChange={(e) => setAmount(e.target.value)} hint={`Minimum ${inr(w.transferMin)}`}
              error={tooLow ? `Minimum transfer is ${inr(w.transferMin)}` : tooHigh ? 'Amount is more than your Main Wallet balance' : undefined} required />
            {target === 'member' && (
              <Input label="Note (optional)" value={remarks} maxLength={120} disabled={blocked} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. For your Standard bundle" />
            )}
            <PasswordInput label="Transaction password" autoComplete="off" value={txnPassword} disabled={blocked} onChange={(e) => setTxnPassword(e.target.value)} required />
            <Button type="submit" size="lg" loading={saving} disabled={blocked || !amt || tooLow || tooHigh || !txnPassword || !memberOk} className="w-full">
              {target === 'self' ? `Move ${amt ? inr(amt) : ''} to Activation Wallet` : `Send ${amt ? inr(amt) : ''}${member && memberOk ? ` to ${member.fullName}` : ''}`}
            </Button>
          </form>
        </Card>

        <Card className="card-pad self-start lg:col-span-2">
          <CardHeader title="How transfers work" />
          <ol className="mt-4 space-y-3 text-sm text-muted">
            {[
              'Transfers are paid from your Main Wallet only.',
              'The money always lands in the receiver’s Activation Wallet, where it can only be used to activate course bundles.',
              'You can send to members above you (upline) or below you (downline) in your team, using their username.',
              'Check the name shown before you send — transfers cannot be reversed.',
              'Your transaction password confirms every transfer.',
            ].map((s, i) => (
              <li key={s} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500/25 text-xs font-bold text-brand-200">{i + 1}</span>{s}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Transfer history" />
          <Tabs value={type} onChange={(v) => { setType(v); setPage(1); }}
            tabs={[{ value: '', label: 'All' }, { value: 'sent', label: 'Sent' }, { value: 'received', label: 'Received' }]} />
        </div>
        <DataTable
          loading={isFetching && !list}
          rows={list?.items || []}
          empty={<p className="px-4 py-10 text-center text-sm text-subtle">No transfers yet</p>}
          columns={[
            { key: 'date', header: 'Date', render: (r) => <span className="text-xs whitespace-nowrap text-muted">{dateTime(r.createdAt)}</span> },
            { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> },
            {
              key: 'dir', header: 'Type',
              render: (r) => (r.category === 'transfer_out'
                ? <span className="inline-flex items-center gap-1 text-danger"><ArrowUpRight className="size-4" />Sent</span>
                : <span className="inline-flex items-center gap-1 text-success"><ArrowDownLeft className="size-4" />Received</span>),
            },
            {
              key: 'who', header: 'Member',
              render: (r) => (r.counterparty?._id === r.user
                ? <span className="text-sm">My Activation Wallet</span>
                : <div><p className="text-sm font-semibold">{r.counterparty?.fullName}</p><p className="text-xs text-muted">@{r.counterparty?.username} · {r.counterparty?.memberId}</p></div>),
            },
            {
              key: 'amount', header: 'Amount', align: 'right',
              render: (r) => <span className={`font-semibold whitespace-nowrap ${r.direction === 'credit' ? 'text-success' : 'text-danger'}`}>{r.direction === 'credit' ? '+' : '−'}<Money value={r.netAmount} /></span>,
            },
            { key: 'remarks', header: 'Remark', render: (r) => <span className="block max-w-xs truncate text-xs text-muted" title={r.remarks}>{r.remarks}</span> },
          ]}
        />
        <Pagination page={list?.page} pages={list?.pages} total={list?.total} onChange={setPage} />
      </Card>
    </div>
  );
}
