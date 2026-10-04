import { useEffect, useMemo, useState } from 'react';
import { PackageCheck, QrCode, CheckCircle2, Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaymentInfoQuery, useSubmitPaymentMutation } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import {
  PageHeader, Card, CardHeader, Button, Input, FileField, Notice, PageLoader, ErrorState, DataTable, StatusBadge, CopyButton,
} from '../../components/ui';
import FileLink from '../../components/common/FileLink';
import { inr, date, dateTime, todayKey } from '../../lib/format';

const STEPS = ['Select package', 'Scan QR & pay', 'Submit UTR & proof', 'Admin verifies', 'Package activated'];

export default function Activate() {
  const { data, isLoading, error, refetch } = usePaymentInfoQuery();
  const [submit, { isLoading: saving }] = useSubmitPaymentMutation();
  const [packageId, setPackageId] = useState('');
  const [utr, setUtr] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayKey());
  const [proof, setProof] = useState(null);

  useEffect(() => {
    if (data && !packageId) setPackageId(data.selectedPackage || data.packages[0]?._id || '');
  }, [data, packageId]);

  const pkg = useMemo(() => data?.packages.find((p) => p._id === packageId), [data, packageId]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const pending = data.payments.find((p) => p.status === 'pending');
  const active = data.activePackage;
  const approved = data.payments.find((p) => p.status === 'approved');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!proof) return toast.error('Upload the payment screenshot / proof');
    const fd = new FormData();
    fd.append('packageId', packageId);
    fd.append('utr', utr);
    fd.append('paymentDate', paymentDate);
    fd.append('proof', proof);
    try {
      await submit(fd).unwrap();
      toast.success('Payment submitted for verification');
      setUtr('');
      setProof(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader icon={PackageCheck} title="Activate Package" subtitle="Pay with the company QR code. Your package activates after admin verification." />

      <ol className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        {STEPS.map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-xs text-muted">
            <span className="grid size-5 place-items-center rounded-full bg-brand-500/30 text-[10px] font-bold text-brand-100">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {active ? (
        <Notice tone="green" icon={CheckCircle2} title={`Your ${approved?.package?.name || ''} package is active`}>
          Activated on {date(approved?.verifiedAt)}. Package upgrades are not supported, so no further payment is needed.
        </Notice>
      ) : pending ? (
        <Notice tone="blue" icon={Clock} title="Payment under verification">
          {pending.paymentId} · {pending.package?.name} · {inr(pending.amount)} · UTR {pending.utr}. You will be notified once it is approved.
        </Notice>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="card-pad lg:col-span-2">
            <CardHeader title="1. Choose your package" />
            <div className="mt-4 space-y-2">
              {data.packages.map((p) => (
                <label key={p._id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${packageId === p._id ? 'border-gold-400/60 bg-gold-400/10' : 'border-line hover:border-brand-500/40'}`}>
                  <input type="radio" name="pkg" className="sr-only" checked={packageId === p._id} onChange={() => setPackageId(p._id)} />
                  <span className={`size-4 rounded-full border-2 ${packageId === p._id ? 'border-gold-400 bg-gold-400' : 'border-subtle'}`} />
                  <span className="flex-1 font-semibold">{p.name}</span>
                  <span className="font-bold">{inr(p.price)}</span>
                </label>
              ))}
            </div>
            {pkg && (
              <div className="mt-4 space-y-1.5 rounded-xl bg-white/[0.04] p-3 text-xs text-muted">
                <div className="flex justify-between"><span>Package price (incl. GST)</span><span className="text-fg">{inr(pkg.amount)}</span></div>
                <div className="flex justify-between"><span>GST included</span><span>{inr(pkg.gstAmount)}</span></div>
              </div>
            )}
          </Card>

          <Card className="card-pad lg:col-span-3">
            <CardHeader title="2. Scan & pay" subtitle={data.payment.instructions} />
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col items-center rounded-2xl bg-white p-4">
                {data.payment.qrImage ? (
                  <img src={data.payment.qrImage} alt="Payment QR code" className="aspect-square w-full max-w-56 object-contain" />
                ) : (
                  <div className="grid aspect-square w-full max-w-56 place-items-center text-center text-sm text-gray-500">
                    <div><QrCode className="mx-auto mb-2 size-10" />QR code not configured yet. Please contact support.</div>
                  </div>
                )}
                <p className="mt-2 text-center text-xs font-semibold text-gray-600">{data.payment.payeeName}</p>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-gold-400/40 bg-gold-400/10 p-3">
                  <p className="text-xs text-muted">Amount to pay</p>
                  <p className="font-display text-2xl font-black text-gold-400">{pkg ? inr(pkg.amount) : '—'}</p>
                </div>
                {data.payment.upiId && (
                  <div className="rounded-xl border border-line p-3">
                    <p className="text-xs text-muted">UPI ID</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{data.payment.upiId}</p>
                      <CopyButton text={data.payment.upiId} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-5 space-y-4 border-t border-line pt-5">
              <h4 className="text-sm font-semibold">3. Submit payment details</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="UTR / Reference number" value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase())} placeholder="12-digit UPI reference" required minLength={6} />
                <Input label="Payment date" type="date" value={paymentDate} max={todayKey()} onChange={(e) => setPaymentDate(e.target.value)} required />
              </div>
              <FileField label="Payment screenshot / proof" file={proof} onChange={setProof} required />
              <Button type="submit" loading={saving} disabled={!packageId || !utr} className="w-full sm:w-auto">Submit for verification</Button>
            </form>
          </Card>
        </div>
      )}

      <Card className="mt-5">
        <div className="card-pad pb-0"><CardHeader title="Payment history" /></div>
        <DataTable
          rows={data.payments}
          empty={<p className="px-4 py-8 text-center text-sm text-subtle">No payments yet</p>}
          columns={[
            { key: 'paymentId', header: 'Payment ID', render: (r) => <span className="font-semibold">{r.paymentId}</span> },
            { key: 'createdAt', header: 'Submitted', render: (r) => dateTime(r.createdAt) },
            { key: 'package', header: 'Package', render: (r) => r.package?.name },
            { key: 'amount', header: 'Amount', render: (r) => inr(r.amount) },
            { key: 'utr', header: 'UTR' },
            { key: 'proof', header: 'Proof', render: (r) => <FileLink name={r.proof} /> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            {
              key: 'adminRemarks', header: 'Remarks',
              render: (r) => (r.status === 'rejected' ? <span className="flex items-center gap-1 text-danger"><XCircle className="size-3.5" />{r.adminRemarks}</span> : r.adminRemarks || '—'),
            },
          ]}
        />
      </Card>
    </div>
  );
}
