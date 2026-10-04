import { useState } from 'react';
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useKycQuery, useSubmitKycMutation } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import { PageHeader, Card, CardHeader, Button, Input, FileField, Notice, PageLoader, ErrorState, KeyValue, StatusBadge } from '../../components/ui';
import FileLink from '../../components/common/FileLink';
import { dateTime } from '../../lib/format';

const FLOW = ['not_submitted', 'submitted', 'under_review', 'approved'];

export default function Kyc() {
  const { data, isLoading, error, refetch } = useKycQuery();
  const [submit, { isLoading: saving }] = useSubmitKycMutation();
  const [form, setForm] = useState({ aadhaarNumber: '', panNumber: '', bankName: '', accountHolder: '', accountNumber: '', ifsc: '' });
  const [files, setFiles] = useState({ aadhaarDoc: null, panDoc: null, bankDoc: null });
  const [errors, setErrors] = useState({});
  const set = (k, transform = (v) => v) => (e) => setForm((f) => ({ ...f, [k]: transform(e.target.value) }));

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { kyc, status } = data;
  const canSubmit = status === 'not_submitted' || status === 'rejected';
  const stepIdx = FLOW.indexOf(status === 'rejected' ? 'under_review' : status);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    Object.entries(files).forEach(([k, f]) => f && fd.append(k, f));
    try {
      await submit(fd).unwrap();
      toast.success('KYC submitted for review');
    } catch (err) {
      setErrors(Object.fromEntries((err?.data?.errors || []).map((x) => [x.field, x.message])));
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="KYC Verification" subtitle="Aadhaar, PAN and bank details are required to withdraw your earnings." />

      <Card className="card-pad mb-5">
        <div className="flex items-center justify-between gap-2">
          {['Not submitted', 'Submitted', 'Under review', status === 'rejected' ? 'Rejected' : 'Approved'].map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-2 text-center">
              <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${
                i === 3 && status === 'rejected' ? 'bg-danger text-white' : i <= stepIdx || status === 'approved' ? 'bg-brand-500 text-white' : 'bg-ink-700 text-subtle'}`}>
                {i + 1}
              </span>
              <span className="text-[11px] text-muted">{s}</span>
            </div>
          ))}
        </div>
      </Card>

      {status === 'approved' && <Notice tone="green" icon={CheckCircle2} title="Your KYC is approved" className="mb-5">You can now request withdrawals to the bank account below.</Notice>}
      {(status === 'submitted' || status === 'under_review') && (
        <Notice tone="blue" icon={Clock} title="Your KYC is being reviewed" className="mb-5">Submitted on {dateTime(kyc.submittedAt)}. You will be notified once it is reviewed.</Notice>
      )}
      {status === 'rejected' && (
        <Notice tone="red" icon={AlertTriangle} title="Your KYC was rejected" className="mb-5">Reason: {kyc.rejectionReason}. Please correct the details and submit again.</Notice>
      )}

      {kyc && !canSubmit && (
        <Card className="card-pad">
          <CardHeader title="Submitted details" action={<StatusBadge status={status} />} />
          <KeyValue className="mt-4" items={[
            ['Aadhaar number', kyc.aadhaarNumber], ['PAN', kyc.panNumber], ['Bank name', kyc.bankName], ['Account holder', kyc.accountHolder],
            ['Account number', kyc.accountNumber], ['IFSC', kyc.ifsc],
            ['Aadhaar document', <FileLink name={kyc.aadhaarDoc} />], ['PAN document', <FileLink name={kyc.panDoc} />],
            kyc.bankDoc && ['Bank proof', <FileLink name={kyc.bankDoc} />],
          ]} />
        </Card>
      )}

      {canSubmit && (
        <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-2">
          <Card className="card-pad space-y-4">
            <CardHeader title="Identity" />
            <Input label="Aadhaar number" inputMode="numeric" value={form.aadhaarNumber} onChange={set('aadhaarNumber', (v) => v.replace(/\D/g, '').slice(0, 12))} error={errors.aadhaarNumber} required />
            <FileField label="Aadhaar card (front & back)" file={files.aadhaarDoc} existing={kyc?.aadhaarDoc} onChange={(f) => setFiles((x) => ({ ...x, aadhaarDoc: f }))} required={!kyc?.aadhaarDoc} />
            <Input label="PAN number" value={form.panNumber} onChange={set('panNumber', (v) => v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" error={errors.panNumber} required />
            <FileField label="PAN card" file={files.panDoc} existing={kyc?.panDoc} onChange={(f) => setFiles((x) => ({ ...x, panDoc: f }))} required={!kyc?.panDoc} />
          </Card>
          <Card className="card-pad space-y-4">
            <CardHeader title="Bank account" subtitle="Withdrawals are paid to this account" />
            <Input label="Bank name" value={form.bankName} onChange={set('bankName')} error={errors.bankName} required />
            <Input label="Account holder name" value={form.accountHolder} onChange={set('accountHolder')} error={errors.accountHolder} required />
            <Input label="Bank account number" inputMode="numeric" value={form.accountNumber} onChange={set('accountNumber', (v) => v.replace(/\D/g, '').slice(0, 18))} error={errors.accountNumber} required />
            <Input label="IFSC code" value={form.ifsc} onChange={set('ifsc', (v) => v.toUpperCase().slice(0, 11))} placeholder="SBIN0001234" error={errors.ifsc} required />
            <FileField label="Bank proof (passbook / cancelled cheque)" hint="Optional" file={files.bankDoc} existing={kyc?.bankDoc} onChange={(f) => setFiles((x) => ({ ...x, bankDoc: f }))} />
          </Card>
          <div className="lg:col-span-2">
            <Button type="submit" size="lg" loading={saving} className="w-full sm:w-auto">Submit KYC</Button>
          </div>
        </form>
      )}
    </div>
  );
}
