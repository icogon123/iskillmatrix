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
function WalletPay({ data, pkg, payableAmount, isUpgrade }) {
  const [purchase, { isLoading }] = useWalletPurchaseMutation();
  const payable = payableAmount ?? (pkg?.price || 0);
  const [wallet, setWallet] = useState(() => (data.wallets.activation >= payable ? 'activation' : 'main'));
  const [txnPassword, setTxnPassword] = useState('');
  const balance = data.wallets[wallet] || 0;
  const short = payable > balance;

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
      <CardHeader title="2. Pay from your wallet" subtitle={`No admin verification needed — the bundle ${isUpgrade ? 'upgrades' : 'activates'} as soon as you confirm.`} />
      {data.walletSuspended ? (
        <Notice tone="red" icon={Lock} title="Your wallet is suspended" className="mt-4">Wallet payments are on hold. You can still pay by UPI / QR.</Notice>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <WalletChoice wallets={data.wallets} value={wallet} onChange={setWallet} price={payable} />
          {pkg && (
            <div className="space-y-1.5 rounded-xl bg-fg/[0.04] p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">{pkg.name} bundle {isUpgrade ? 'upgrade' : ''}</span><span className="font-semibold">{inr(payable)}</span></div>
              <div className="flex justify-between"><span className="text-muted">{WALLET_LABELS[wallet]} after payment</span>
                <span className={short ? 'text-danger' : ''}>{short ? 'Not enough balance' : <Money value={balance - payable} />}</span></div>
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
            {pkg ? `Pay ${inr(payable)} & ${isUpgrade ? 'upgrade' : 'activate'}` : 'Pay & activate'}
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

  const currentPkg = useMemo(() => data?.packages.find((p) => p.isCurrent), [data]);
  const isUpgradeMode = Boolean(data?.activePackage && currentPkg);
  const canUpgrade = useMemo(() => Boolean(data?.packages.some((p) => p.canUpgrade)), [data]);
  const upgradeCandidates = useMemo(() => data?.packages.filter((p) => p.canUpgrade) || [], [data]);

  useEffect(() => {
    if (data && !packageId) {
      if (isUpgradeMode && upgradeCandidates.length > 0) {
        setPackageId(upgradeCandidates[0]._id);
      } else {
        setPackageId(data.selectedPackage || data.packages[0]?._id || '');
      }
    }
  }, [data, packageId, isUpgradeMode, upgradeCandidates]);

  const pkg = useMemo(() => data?.packages.find((p) => p._id === packageId), [data, packageId]);
  const payableAmount = isUpgradeMode && pkg?.canUpgrade ? pkg.upgradePrice : (pkg?.price || 0);

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
      toast.success(isUpgradeMode ? 'Upgrade payment submitted for verification' : 'Payment submitted for verification');
      setUtr('');
      setProof(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const showForm = (!active || (isUpgradeMode && canUpgrade)) && !pending;

  return (
    <div>
      <PageHeader
        icon={BookCheck}
        title={isUpgradeMode ? 'Upgrade Course Bundle' : 'Activate Bundle'}
        subtitle={isUpgradeMode ? 'Upgrade your bundle to access more courses by paying only the price difference.' : 'Pay with the company QR code. Your bundle activates after admin verification.'}
      />

      {showForm && (
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

      {pending ? (
        <Notice tone="blue" icon={Clock} title="Payment under verification">
          {pending.paymentId} · {pending.isUpgrade ? `Upgrade to ${pending.package?.name}` : pending.package?.name} · {inr(pending.amount)} · UTR {pending.utr}. You will be notified once it is approved.
        </Notice>
      ) : active && !canUpgrade ? (
        <Notice tone="green" icon={CheckCircle2} title={`Your ${approved?.package?.name || currentPkg?.name || ''} bundle is active`}>
          Activated on {date(approved?.verifiedAt)}{approved?.method === 'wallet' ? ` (paid from ${paidWith(approved)})` : ''}. You are already on the highest plan, so all courses and maximum income benefits are unlocked.
        </Notice>
      ) : (
        <div className="space-y-4">
          {isUpgradeMode && (
            <Notice tone="blue" icon={CheckCircle2} title={`Your ${currentPkg?.name || ''} bundle is currently active`}>
              Current plan price: <b className="text-fg">{inr(currentPkg?.price)}</b>. Select a higher bundle below to upgrade by paying only the remaining difference.
            </Notice>
          )}

          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="card-pad lg:col-span-2">
              <CardHeader title={isUpgradeMode ? '1. Choose bundle to upgrade to' : '1. Choose your bundle'} />
              <div className="mt-4 space-y-2">
                {data.packages.map((p) => {
                  const isCurrent = p.isCurrent;
                  const isLower = p.isLower;
                  const disabled = isCurrent || isLower;
                  const selected = packageId === p._id;
                  return (
                    <label key={p._id}
                      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                        disabled
                          ? 'cursor-not-allowed opacity-50 border-line bg-fg/[0.02]'
                          : selected
                            ? 'cursor-pointer border-gold-400/60 bg-gold-400/10'
                            : 'cursor-pointer border-line hover:border-brand-500/40'
                      }`}>
                      <input type="radio" name="pkg" className="sr-only" checked={selected} disabled={disabled} onChange={() => setPackageId(p._id)} />
                      <span className={`size-4 rounded-full border-2 ${selected ? 'border-gold-400 bg-gold-400' : 'border-subtle'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{p.name}</p>
                        {isCurrent && <span className="text-[10px] font-bold text-success uppercase">Current Plan</span>}
                        {isLower && <span className="text-[10px] text-subtle">Lower tier</span>}
                      </div>
                      <div className="text-right">
                        {isUpgradeMode && p.canUpgrade ? (
                          <>
                            <p className="font-bold text-gold-400">{inr(p.upgradePrice)}</p>
                            <p className="text-[10px] text-muted">Full {inr(p.price)}</p>
                          </>
                        ) : (
                          <p className="font-bold">{inr(p.price)}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {pkg && isUpgradeMode && pkg.canUpgrade && (
                <div className="mt-4 space-y-1.5 rounded-xl bg-fg/[0.04] p-3 text-xs text-muted">
                  <div className="flex justify-between"><span>New bundle price</span><span className="text-fg">{inr(pkg.price)}</span></div>
                  <div className="flex justify-between"><span>Current plan credit ({currentPkg?.name})</span><span className="text-success">− {inr(currentPkg?.price)}</span></div>
                  <div className="flex justify-between border-t border-line pt-1.5 font-semibold text-fg"><span>Upgrade amount to pay</span><span className="text-gold-400">{inr(pkg.upgradePrice)}</span></div>
                  <div className="flex justify-between"><span>GST included in price</span><span>{inr(pkg.gstAmount)}</span></div>
                </div>
              )}

              {pkg && !isUpgradeMode && (
                <div className="mt-4 space-y-1.5 rounded-xl bg-fg/[0.04] p-3 text-xs text-muted">
                  <div className="flex justify-between"><span>Bundle fee (incl. GST)</span><span className="text-fg">{inr(pkg.amount)}</span></div>
                  <div className="flex justify-between"><span>GST included</span><span>{inr(pkg.gstAmount)}</span></div>
                </div>
              )}
              {pkg && <BundleContents pkg={pkg} titles={courseTitles} />}
            </Card>

            {method === 'wallet' ? (
              <WalletPay data={data} pkg={pkg} payableAmount={payableAmount} isUpgrade={isUpgradeMode} />
            ) : (
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
                      <p className="text-xs text-muted">{isUpgradeMode ? 'Upgrade amount to pay' : 'Amount to pay'}</p>
                      <p className="font-display text-2xl font-black text-gold-400">{pkg ? inr(payableAmount) : '—'}</p>
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
                  <Button type="submit" loading={saving} disabled={!packageId || !utr || (isUpgradeMode && !pkg?.canUpgrade)} className="w-full sm:w-auto">
                    {isUpgradeMode ? 'Submit upgrade for verification' : 'Submit for verification'}
                  </Button>
                </form>
              </Card>
            )}
          </div>
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
            {
              key: 'package', header: 'Bundle',
              render: (r) => (
                <div>
                  <span className="font-medium">{r.package?.name}</span>
                  {r.isUpgrade && (
                    <span className="ml-1.5 inline-block rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-300">
                      Upgrade{r.oldPackage?.name ? ` from ${r.oldPackage.name}` : ''}
                    </span>
                  )}
                </div>
              ),
            },
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
