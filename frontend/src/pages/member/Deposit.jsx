import { useState } from 'react';
import { HandCoins, QrCode, Clock, Info, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDepositsQuery, useCreateDepositMutation } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import {
  PageHeader, Card, CardHeader, Button, Input, FileField, Notice, PageLoader, ErrorState, DataTable, Pagination, StatusBadge, CopyButton,
} from '../../components/ui';
import FileLink from '../../components/common/FileLink';
import { inr, date, dateTime, todayKey } from '../../lib/format';

export default function Deposit() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useDepositsQuery({ page, limit: 10 });
  const [submit, { isLoading: saving }] = useCreateDepositMutation();
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayKey());
  const [proof, setProof] = useState(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { rules, payment } = data;
  const amt = Number(amount) || 0;
  const tooLow = amt > 0 && amt < rules.min;
  const tooHigh = rules.max > 0 && amt > rules.max;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!proof) return toast.error('Upload the payment screenshot / proof');
    const fd = new FormData();
    fd.append('amount', amt);
    fd.append('utr', utr);
    fd.append('paymentDate', paymentDate);
    fd.append('proof', proof);
    try {
      await submit(fd).unwrap();
      toast.success('Deposit submitted for verification');
      setAmount('');
      setUtr('');
      setProof(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader icon={HandCoins} title="Deposit Fund" subtitle="Add money to your Activation Wallet by UPI. It is credited once the admin verifies your payment." />

      <Notice tone="violet" icon={Info} className="mb-5" title="Deposits go to your Activation Wallet">
        Use it to activate a course bundle for yourself or for another member (P2P activation). Activation Wallet money cannot be withdrawn.
      </Notice>
      {data.pending.count > 0 && (
        <Notice tone="blue" icon={Clock} className="mb-5" title={`${data.pending.count} deposit${data.pending.count === 1 ? '' : 's'} under verification`}>
          {inr(data.pending.amount)} will be added to your Activation Wallet once approved. You will get a notification.
        </Notice>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="card-pad lg:col-span-2">
          <CardHeader title="1. Scan & pay" subtitle="Pay the amount you want to deposit" />
          <div className="mt-4 flex flex-col items-center rounded-2xl bg-white p-4">
            {payment.qrImage ? (
              <img src={payment.qrImage} alt="Payment QR code" className="aspect-square w-full max-w-56 object-contain" />
            ) : (
              <div className="grid aspect-square w-full max-w-56 place-items-center text-center text-sm text-gray-500">
                <div><QrCode className="mx-auto mb-2 size-10" />QR code not configured yet. Please contact support.</div>
              </div>
            )}
            <p className="mt-2 text-center text-xs font-semibold text-gray-600">{payment.payeeName}</p>
          </div>
          {payment.upiId && (
            <div className="mt-3 rounded-xl border border-line p-3">
              <p className="text-xs text-muted">UPI ID</p>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-semibold">{payment.upiId}</p>
                <CopyButton text={payment.upiId} />
              </div>
            </div>
          )}
        </Card>

        <Card className="card-pad lg:col-span-3">
          <CardHeader title="2. Submit payment details" />
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <Input label="Deposit amount (₹)" type="number" inputMode="decimal" min={rules.min} step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              hint={`Minimum ${inr(rules.min)}${rules.max ? ` · Maximum ${inr(rules.max)}` : ''} — enter exactly what you paid`}
              error={tooLow ? `Minimum deposit is ${inr(rules.min)}` : tooHigh ? `Maximum deposit is ${inr(rules.max)}` : undefined} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="UTR / Reference number" value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase())} placeholder="12-digit UPI reference" required minLength={6} />
              <Input label="Payment date" type="date" value={paymentDate} max={todayKey()} onChange={(e) => setPaymentDate(e.target.value)} required />
            </div>
            <FileField label="Payment screenshot / proof" file={proof} onChange={setProof} required />
            <Button type="submit" loading={saving} disabled={!amt || tooLow || tooHigh || utr.length < 6} className="w-full sm:w-auto">Submit deposit</Button>
          </form>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="card-pad pb-0"><CardHeader title="Deposit history" /></div>
        <DataTable
          loading={isFetching && !data}
          rows={data.items}
          empty={<p className="px-4 py-10 text-center text-sm text-subtle">No deposits yet</p>}
          columns={[
            { key: 'id', header: 'Deposit ID', render: (r) => <span className="font-semibold">{r.depositId}</span> },
            { key: 'createdAt', header: 'Submitted', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
            { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
            { key: 'utr', header: 'UTR / Paid on', render: (r) => <div className="text-xs"><p className="font-mono">{r.utr}</p><p className="text-muted">{date(r.paymentDate)}</p></div> },
            { key: 'proof', header: 'Proof', render: (r) => <FileLink name={r.proof} /> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} label={r.status === 'approved' ? 'Credited' : undefined} /> },
            {
              key: 'remarks', header: 'Remarks',
              render: (r) => (r.status === 'rejected'
                ? <span className="flex items-center gap-1 text-xs text-danger"><XCircle className="size-3.5" />{r.adminRemarks}</span>
                : <span className="text-xs text-muted">{r.adminRemarks || '—'}</span>),
            },
          ]}
        />
        <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
      </Card>
    </div>
  );
}
