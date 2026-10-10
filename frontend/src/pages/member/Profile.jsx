import { useRef, useState } from 'react';
import { UserCog, KeyRound, Lock, Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProfileQuery, useChangeTxnPasswordMutation, useUploadAvatarMutation, useRemoveAvatarMutation } from '../../api/memberApi';
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

const MAX_BYTES = 5 * 1024 * 1024;

/** Profile picture with upload / remove. Shown on the dashboard rank card and in the menu. */
function AvatarEditor({ user }) {
  const input = useRef(null);
  const [upload, { isLoading: uploading }] = useUploadAvatarMutation();
  const [remove, { isLoading: removing }] = useRemoveAvatarMutation();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast.error('Choose a JPG, PNG or WEBP image');
    if (file.size > MAX_BYTES) return toast.error('The image must be 5 MB or smaller');
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      await upload(fd).unwrap();
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={() => input.current?.click()} disabled={uploading} title="Change profile picture"
        className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
        <Avatar name={user.fullName} src={user.avatar} size="xl" />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Camera className="size-6" />
        </span>
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
      <div className="min-w-0">
        <p className="text-lg font-bold">{user.fullName}</p>
        <p className="text-sm text-muted">{user.memberId} · @{user.username}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" loading={uploading} onClick={() => input.current?.click()}>
            <Camera className="size-3.5" /> {user.avatar ? 'Change photo' : 'Upload photo'}
          </Button>
          {user.avatar && (
            <Button size="sm" variant="ghost" loading={removing} className="text-danger"
              onClick={async () => {
                try {
                  await remove().unwrap();
                  toast.success('Profile picture removed');
                } catch (err) {
                  toast.error(errorMessage(err));
                }
              }}>
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-subtle">JPG, PNG or WEBP, up to 5 MB. Shown on your dashboard.</p>
      </div>
    </div>
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
        <div className="mb-5 flex items-start justify-between gap-4">
          <AvatarEditor user={u} />
          <StatusBadge status={u.status} className="shrink-0" />
        </div>
        <KeyValue items={[
          ['Email', u.email], ['Mobile', u.mobile], ['Date of birth', date(u.dob)], ['Country', u.country], ['Aadhaar', u.aadhaar],
          ['Sponsor', u.sponsor ? `${u.sponsor.fullName} (${u.sponsor.memberId})` : '—'], ['Bundle', u.package?.name || 'Not active'],
          ['Bundle activated', date(u.packageActivatedAt)], ['KYC status', <StatusBadge status={u.kycStatus} />], ['Member since', date(u.createdAt)],
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
