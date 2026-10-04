import { useState } from 'react';
import { Banknote, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWalletQuery, useWithdrawalsQuery, useCreateWithdrawalMutation, useCancelWithdrawalMutation } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import {
  PageHeader, Card, CardHeader, Input, Button, Notice, PageLoader, ErrorState, DataTable, Pagination, StatusBadge, ConfirmModal,
} from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import Money from '../../components/common/Money';
import { inr, dateTime } from '../../lib/format';

const round2 = (n) => Math.round(n * 100) / 100;

export default function Withdraw() {
  const { data: w, isLoading, error, refetch } = useWalletQuery();
  const [page, setPage] = useState(1);
  const { data: list, isFetching } = useWithdrawalsQuery({ page, limit: 10 });
  const [create, { isLoading: saving }] = useCreateWithdrawalMutation();
  const [cancel, { isLoading: cancelling }] = useCancelWithdrawalMutation();
  const [amount, setAmount] = useState('');
  const [txnPassword, setTxnPassword] = useState('');
  const [cancelId, setCancelId] = useState(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const rules = w.rules;
  const amt = Number(amount) || 0;
  const tds = round2((amt * rules.tdsPercent) / 100);
  const admin = round2((amt * rules.adminChargePercent) / 100);
  const net = round2(amt - tds - admin);
  const kycOk = !rules.requireKyc || w.kycStatus === 'approved';
  const tooLow = amt > 0 && amt < rules.min;
  const tooHigh = amt > 0 && (amt > w.balance || (rules.max && amt > rules.max));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await create({ amount: amt, txnPassword }).unwrap();
      toast.success('Withdrawal request submitted');
      setAmount('');
      setTxnPassword('');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader icon={Banknote} title="Withdraw" subtitle={`TDS ${rules.tdsPercent}% and admin charge ${rules.adminChargePercent}% are deducted from the requested amount.`} />

      {!kycOk && (
        <Notice tone="gold" icon={ShieldAlert} title="KYC approval required" className="mb-5" action={<Button to="/app/kyc" size="sm" variant="outline">Go to KYC</Button>}>
          Your KYC status is “{w.kycStatus.replace('_', ' ')}”. Withdrawals are available once your KYC is approved.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-pad lg:col-span-3">
          <CardHeader title="Withdrawal request" />
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gold-400/40 bg-gold-400/10 p-3">
                <p className="text-xs text-muted">Balance</p>
                <p className="text-xl font-bold text-gold-400"><Money value={w.balance} /></p>
              </div>
              <div className="rounded-xl border border-line p-3 text-sm">
                <p className="text-xs text-muted">Bank account</p>
                {w.bank ? (
                  <>
                    <p className="font-semibold">{w.bank.bankName}</p>
                    <p className="text-xs text-muted">A/C {w.bank.accountNumber} · IFSC {w.bank.ifsc}</p>
                  </>
                ) : <p className="text-subtle">Add via KYC</p>}
              </div>
            </div>
            <Input label="Request amount (₹)" type="number" inputMode="decimal" min={rules.min} step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              hint={`Min ${inr(rules.min)}${rules.max ? ` · Max ${inr(rules.max)}` : ''}`}
              error={tooLow ? `Minimum withdrawal is ${inr(rules.min)}` : tooHigh ? 'Amount exceeds your balance or the maximum limit' : undefined} disabled={!kycOk} required />
            <div className="space-y-2 rounded-xl bg-white/[0.04] p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted">Request amount</span><span>{inr(amt)}</span></div>
              <div className="flex justify-between"><span className="text-muted">TDS charge ({rules.tdsPercent}%)</span><span>− {inr(tds)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Admin charge ({rules.adminChargePercent}%)</span><span>− {inr(admin)}</span></div>
              <div className="flex justify-between border-t border-line pt-2 font-bold"><span>Net amount</span><span className="text-gold-400">{inr(Math.max(0, net))}</span></div>
            </div>
            <PasswordInput label="Transaction password" autoComplete="off" value={txnPassword} onChange={(e) => setTxnPassword(e.target.value)} disabled={!kycOk} required />
            <Button type="submit" size="lg" loading={saving} disabled={!kycOk || !amt || tooLow || tooHigh || !txnPassword} className="w-full">Submit withdrawal</Button>
          </form>
        </Card>
        <Card className="card-pad self-start lg:col-span-2">
          <CardHeader title="How it works" />
          <ol className="mt-4 space-y-3 text-sm text-muted">
            {['Enter the amount and your transaction password', 'The amount is held from your wallet immediately', 'Admin reviews and approves the request',
              'Payment is sent to your bank account with a reference', 'Rejected or cancelled requests are returned to your wallet'].map((s, i) => (
              <li key={s} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500/25 text-xs font-bold text-brand-200">{i + 1}</span>{s}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="card-pad pb-0"><CardHeader title="Withdrawal history" /></div>
        <DataTable
          loading={isFetching && !list}
          rows={list?.items || []}
          columns={[
            { key: 'withdrawalId', header: 'ID', render: (r) => <span className="font-semibold">{r.withdrawalId}</span> },
            { key: 'createdAt', header: 'Requested', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
            { key: 'amount', header: 'Amount', render: (r) => inr(r.amount) },
            { key: 'charges', header: 'TDS + Admin', render: (r) => <span className="text-xs text-muted">{inr(r.tds)} + {inr(r.adminCharge)}</span> },
            { key: 'netAmount', header: 'Net', render: (r) => <span className="font-semibold">{inr(r.netAmount)}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'ref', header: 'Reference / Remarks', render: (r) => <span className="text-xs text-muted">{r.paymentReference || r.adminRemarks || '—'}</span> },
            {
              key: 'act', header: '',
              render: (r) => r.status === 'pending' && (
                <Button size="sm" variant="ghost" onClick={() => setCancelId(r._id)}><X className="size-3.5" /> Cancel</Button>
              ),
            },
          ]}
        />
        <Pagination page={list?.page} pages={list?.pages} total={list?.total} onChange={setPage} />
      </Card>

      <ConfirmModal open={Boolean(cancelId)} onClose={() => setCancelId(null)} title="Cancel this withdrawal?" variant="danger" confirmLabel="Cancel withdrawal"
        loading={cancelling} message="The held amount will be returned to your wallet."
        onConfirm={async () => {
          try {
            await cancel(cancelId).unwrap();
            toast.success('Withdrawal cancelled');
            setCancelId(null);
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }} />
    </div>
  );
}
