import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookCheck, QrCode, CheckCircle2, Clock, XCircle, Check, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaymentInfoQuery, useSubmitPaymentMutation, useWalletPurchaseMutation } from '../../api/memberApi';
import { useCoursesQuery } from '../../api/publicApi';
import { errorMessage } from '../../app/api';
import {
  PageHeader, Card, CardHeader, Button, Input, FileField, Notice, PageLoader, ErrorState, DataTable, StatusBadge, CopyButton, Tabs,
} from '../../components/ui';
import FileLink from '../../components/common/FileLink';
import PasswordInput from '../../components/common/PasswordInput';
import Money from '../../components/common/Money';
import WalletChoice from './WalletChoice';
import { WALLET_LABELS } from '../../lib/constants';
import { inr, date, dateTime, todayKey } from '../../lib/format';

const STEPS = {
  upi: ['Select bundle', 'Scan QR & pay', 'Submit UTR & proof', 'Admin verifies', 'Bundle activated'],
  wallet: ['Select bundle', 'Choose wallet', 'Confirm with transaction password', 'Bundle activated instantly'],
};

/** How a bundle payment was made, for the history table. */
const paidWith = (p) =>
  p.method === 'wallet'
    ? `${WALLET_LABELS[p.wallet] || 'Wallet'}${p.paidBy && p.paidBy._id !== p.user ? ` of @${p.paidBy.username}` : ''}`
    : 'UPI / QR';

/** Pays for the selected bundle from one of the member's wallets; activates at once. */
function WalletPay({ data, pkg }) {
  const [purchase, { isLoading }] = useWalletPurchaseMutation();
  const [wallet, setWallet] = useState(() => (data.wallets.activation >= (pkg?.price || 0) ? 'activation' : 'main'));
  const [txnPassword, setTxnPassword] = useState('');
  const balance = data.wallets[wallet] || 0;
  const short = pkg && pkg.price > balance;

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await purchase({ packageId: pkg._id, wallet, txnPassword }).unwrap();
      toast.success(res.message);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card className="card-pad lg:col-span-3">
      <CardHeader title="2. Pay from your wallet" subtitle="No admin verification needed — the bundle activates as soon as you confirm." />
      {data.walletSuspended ? (
        <Notice tone="red" icon={Lock} title="Your wallet is suspended" className="mt-4">Wallet payments are on hold. You can still pay by UPI / QR.</Notice>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <WalletChoice wallets={data.wallets} value={wallet} onChange={setWallet} price={pkg?.price || 0} />
          {pkg && (
            <div className="space-y-1.5 rounded-xl bg-fg/[0.04] p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">{pkg.name} bundle</span><span className="font-semibold">{inr(pkg.price)}</span></div>
              <div className="flex justify-between"><span className="text-muted">{WALLET_LABELS[wallet]} after payment</span>
                <span className={short ? 'text-danger' : ''}>{short ? 'Not enough balance' : <Money value={balance - pkg.price} />}</span></div>
            </div>
          )}
          {short && (
            <p className="text-xs text-muted">
              Top up with a <Link to="/app/deposit" className="font-semibold text-brand-300">deposit</Link> or a{' '}
              <Link to="/app/transfer" className="font-semibold text-brand-300">transfer from your Main Wallet</Link>, or pay by UPI instead.
            </p>
          )}
          <PasswordInput label="Transaction password" autoComplete="off" value={txnPassword} onChange={(e) => setTxnPassword(e.target.value)} required />
          <Button type="submit" variant="gold" loading={isLoading} disabled={!pkg || short || !txnPassword} className="w-full sm:w-auto">
            {pkg ? `Pay ${inr(pkg.price)} & activate` : 'Pay & activate'}
          </Button>
        </form>
      )}
    </Card>
  );
}

/** Courses and member benefits of the selected bundle. */
function BundleContents({ pkg, titles }) {
  const courses = pkg.courses.filter((slug) => titles[slug]);
  return (
    <div className="mt-4 space-y-4 text-sm">
      {courses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted">{courses.length} course{courses.length === 1 ? '' : 's'} included</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {courses.map((slug) => (
              <li key={slug}><Link to={`/courses/${slug}`} className="inline-block rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-fg">{titles[slug]}</Link></li>
            ))}
          </ul>
        </div>
      )}
      {pkg.benefits.length > 0 && (
        <ul className="space-y-1.5">
          {pkg.benefits.map((b) => <li key={b} className="flex gap-2 text-xs text-muted"><Check className="mt-0.5 size-3.5 shrink-0 text-success" />{b}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function Activate() {
  const { data, isLoading, error, refetch } = usePaymentInfoQuery();
  const { data: courseData } = useCoursesQuery();
  const courseTitles = useMemo(() => Object.fromEntries((courseData?.courses || []).map((c) => [c.slug, c.title])), [courseData]);
  const [submit, { isLoading: saving }] = useSubmitPaymentMutation();
  const [packageId, setPackageId] = useState('');
  const [utr, setUtr] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayKey());
  const [proof, setProof] = useState(null);
  const [method, setMethod] = useState('upi');

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
      <PageHeader icon={BookCheck} title="Activate Bundle" subtitle="Pay with the company QR code. Your bundle activates after admin verification." />

      {!active && !pending && (
        <Tabs className="mb-4" value={method} onChange={setMethod}
          tabs={[{ value: 'upi', label: 'Pay by UPI / QR' }, { value: 'wallet', label: `Pay from wallet (${inr(data.wallets.main + data.wallets.activation)})` }]} />
      )}

      <ol className="scrollbar-none mb-5 flex gap-2 overflow-x-auto">
        {STEPS[method].map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-2 rounded-full border border-line bg-ink-850 px-3 py-1.5 text-xs text-muted">
            <span className="grid size-5 place-items-center rounded-full bg-brand-500/30 text-[10px] font-bold text-brand-100">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {active ? (
        <Notice tone="green" icon={CheckCircle2} title={`Your ${approved?.package?.name || ''} bundle is active`}>
          Activated on {date(approved?.verifiedAt)}{approved?.method === 'wallet' ? ` (paid from ${paidWith(approved)})` : ''}. Bundle upgrades are not supported, so no further payment is needed.
        </Notice>
      ) : pending ? (
        <Notice tone="blue" icon={Clock} title="Payment under verification">
          {pending.paymentId} · {pending.package?.name} · {inr(pending.amount)} · UTR {pending.utr}. You will be notified once it is approved.
        </Notice>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="card-pad lg:col-span-2">
            <CardHeader title="1. Choose your bundle" />
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
              <div className="mt-4 space-y-1.5 rounded-xl bg-fg/[0.04] p-3 text-xs text-muted">
                <div className="flex justify-between"><span>Bundle fee (incl. GST)</span><span className="text-fg">{inr(pkg.amount)}</span></div>
                <div className="flex justify-between"><span>GST included</span><span>{inr(pkg.gstAmount)}</span></div>
              </div>
            )}
            {pkg && <BundleContents pkg={pkg} titles={courseTitles} />}
          </Card>

          {method === 'wallet' ? <WalletPay data={data} pkg={pkg} /> : (
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
          )}
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
            { key: 'package', header: 'Bundle', render: (r) => r.package?.name },
            { key: 'amount', header: 'Amount', render: (r) => inr(r.amount) },
            { key: 'method', header: 'Paid with', render: (r) => <span className="text-xs">{paidWith(r)}</span> },
            { key: 'utr', header: 'UTR', render: (r) => r.utr || '—' },
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
