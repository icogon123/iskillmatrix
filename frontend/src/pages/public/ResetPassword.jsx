import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { Button, Notice } from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import { useResetPasswordMutation } from '../../api/publicApi';
import { errorMessage } from '../../app/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [reset, { isLoading }] = useResetPasswordMutation();
  const token = params.get('token');

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setError('');
    try {
      const res = await reset({ token, password: form.password }).unwrap();
      toast.success(res.message);
      navigate('/login');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Use at least 8 characters with a letter, a number and a special character.">
      {!token ? (
        <Notice tone="red" title="This reset link is incomplete." action={<Button to="/forgot-password" size="sm" variant="outline">Request a new link</Button>} />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="red" title={error} />}
          <PasswordInput label="New password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
          <Button type="submit" variant="solid" size="lg" className="w-full" loading={isLoading}>Update password</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted"><Link to="/login" className="font-semibold text-brand-300">Back to log in</Link></p>
    </AuthShell>
  );
}
