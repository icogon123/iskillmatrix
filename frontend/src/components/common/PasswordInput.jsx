import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '../ui';

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <Input
      type={show ? 'text' : 'password'}
      icon={Lock}
      autoComplete="current-password"
      right={
        <button type="button" onClick={() => setShow((s) => !s)} className="rounded-lg p-2 text-subtle hover:text-fg" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
      {...props}
    />
  );
}
