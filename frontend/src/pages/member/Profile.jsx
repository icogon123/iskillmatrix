import { useState } from 'react';
import { UserCog, KeyRound, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProfileQuery, useChangeTxnPasswordMutation } from '../../api/memberApi';
import { useChangePasswordMutation } from '../../api/publicApi';
import { errorMessage } from '../../app/api';
import { PageHeader, Card, CardHeader, KeyValue, Button, StatusBadge, PageLoader, ErrorState } from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import Avatar from '../../components/common/Avatar';
import { date } from '../../lib/format';

function PasswordForm({ title, icon: Icon, fields, onSubmit, loading, note }) {
  const [values, setValues] = useState(Object.fromEntries(fields.map((f) => [f.name, ''])));
  const submit = async (e) => {
    e.preventDefault();
    if (await onSubmit(values)) setValues(Object.fromEntries(fields.map((f) => [f.name, ''])));
  };
  return (
    <Card className="card-pad">
      <CardHeader title={title} subtitle={note} action={<Icon className="size-5 text-brand-300" />} />
      <form onSubmit={submit} className="mt-4 space-y-3">
        {fields.map((f) => (
          <PasswordInput key={f.name} label={f.label} autoComplete={f.auto || 'new-password'} value={values[f.name]} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} required />
        ))}
        <Button type="submit" loading={loading}>Update</Button>
      </form>
    </Card>
  );
}

export default function Profile() {
  const { data, isLoading, error, refetch } = useProfileQuery();
  const [changePassword, { isLoading: p1 }] = useChangePasswordMutation();
  const [changeTxn, { isLoading: p2 }] = useChangeTxnPasswordMutation();
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const u = data.user;

  const run = (fn, msg) => async (values) => {
    try {
      await fn(values).unwrap();
      toast.success(msg);
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  return (
    <div>
      <PageHeader icon={UserCog} title="Profile & Security" />
      <Card className="card-pad">
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={u.fullName} size="lg" />
          <div>
            <p className="text-lg font-bold">{u.fullName}</p>
            <p className="text-sm text-muted">{u.memberId} · @{u.username}</p>
          </div>
          <StatusBadge status={u.status} className="ml-auto" />
        </div>
        <KeyValue items={[
          ['Email', u.email], ['Mobile', u.mobile], ['Date of birth', date(u.dob)], ['Country', u.country], ['Aadhaar', u.aadhaar],
          ['Sponsor', u.sponsor ? `${u.sponsor.fullName} (${u.sponsor.memberId})` : '—'], ['Package', u.package?.name || 'Not active'],
          ['Package activated', date(u.packageActivatedAt)], ['KYC status', <StatusBadge status={u.kycStatus} />], ['Member since', date(u.createdAt)],
        ]} />
        <p className="mt-5 text-xs text-subtle">To correct your personal details, contact support.</p>
      </Card>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <PasswordForm title="Change login password" icon={KeyRound} loading={p1}
          fields={[
            { name: 'currentPassword', label: 'Current password', auto: 'current-password' },
            { name: 'newPassword', label: 'New password' },
            { name: 'confirmPassword', label: 'Confirm new password' },
          ]}
          onSubmit={run(changePassword, 'Login password changed')} />
        <PasswordForm title="Change transaction password" icon={Lock} loading={p2} note="Required for withdrawals. Confirm with your login password."
          fields={[
            { name: 'currentPassword', label: 'Login password', auto: 'current-password' },
            { name: 'newTxnPassword', label: 'New transaction password' },
            { name: 'confirmTxnPassword', label: 'Confirm transaction password' },
          ]}
          onSubmit={run(changeTxn, 'Transaction password changed')} />
      </div>
    </div>
  );
}
