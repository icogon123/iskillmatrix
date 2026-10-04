import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, MailCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import { Button, Input, Notice } from '../../components/ui';
import { useForgotPasswordMutation } from '../../api/publicApi';
import { errorMessage } from '../../app/api';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [forgot, { isLoading }] = useForgotPasswordMutation();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await forgot({ identifier }).unwrap();
      setSent(res.message);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="Enter your username, member ID or registered email. We will email you a reset link.">
      {sent ? (
        <Notice tone="green" icon={MailCheck} title="Check your email">{sent}</Notice>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="red" title={error} />}
          <Input label="Username / Member ID / Email" icon={User} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <Button type="submit" size="lg" className="w-full" loading={isLoading}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        Remembered it? <Link to="/login" className="font-semibold text-brand-300">Back to login</Link>
      </p>
    </AuthShell>
  );
}
