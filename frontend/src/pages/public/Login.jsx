import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from './AuthShell';
import { Button, Input, Notice } from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import { useLoginMutation } from '../../api/publicApi';
import { errorMessage } from '../../app/api';
import { selectUser } from '../../features/auth/authSlice';

export default function Login({ admin = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [login, { isLoading }] = useLoginMutation();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');

  const next = params.get('next');
  const home = (role) => (next && next.startsWith(role === 'admin' ? '/admin' : '/app') ? next : role === 'admin' ? '/admin' : '/app');

  if (user) return <Navigate to={home(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { user: u } = await login(form).unwrap();
      toast.success(`Welcome back, ${u.fullName.split(' ')[0]}!`);
      navigate(home(u.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    }
  };

  return (
    <AuthShell
      title={admin ? 'Admin login' : 'Welcome back'}
      pageTitle={admin ? 'Admin login' : 'Log in'}
      subtitle={admin ? 'Sign in to manage members, payments and payouts.' : 'Log in with your username or member ID.'}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="red" title={error} />}
        <Input
          label={admin ? 'Username' : 'Username / Member ID'}
          icon={admin ? ShieldCheck : User}
          placeholder={admin ? 'Admin username' : 'Your username or member ID'}
          autoComplete="username"
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          required
        />
        <PasswordInput label="Password" placeholder="Your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs font-semibold text-brand-300 hover:text-brand-200">Forgot password?</Link>
        </div>
        <Button type="submit" variant="solid" size="lg" className="w-full" loading={isLoading}>Log in</Button>
      </form>
      {!admin && (
        <p className="mt-6 text-center text-sm text-muted">
          New to AroviaSkillTech?{' '}
          <Link to="/register" className="font-semibold text-gold-400 hover:text-gold-300">Create an account</Link>
        </p>
      )}
    </AuthShell>
  );
}
