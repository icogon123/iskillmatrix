import { useEffect, useId, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button, Field } from '../ui';

/** Whole seconds left until `until` (a ms timestamp), re-rendering once a second while it counts down. */
export function useCountdown(until) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return undefined;
    setNow(Date.now());
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= until) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [until]);
  return Math.max(0, Math.ceil(((until || 0) - now) / 1000));
}

/**
 * 6-digit email OTP input with a Send / Resend button.
 * `sent` unlocks the input; `resendAt` (ms timestamp) keeps the button disabled while the server's resend cooldown runs.
 */
export default function OtpField({ label = 'Email OTP', value, onChange, onSend, sending, sent, resendAt, disabled, error, hint }) {
  const id = useId();
  const wait = useCountdown(resendAt);
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input id={id} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code"
            className={`input pl-9 ${value ? 'font-semibold tracking-[0.35em]' : ''} ${error ? 'border-danger/60' : ''}`}
            value={value} disabled={disabled || !sent} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </div>
        <Button variant="outline" onClick={onSend} loading={sending} disabled={disabled || wait > 0} className="shrink-0">
          {wait > 0 ? `Resend in ${wait}s` : sent ? 'Resend OTP' : 'Send OTP'}
        </Button>
      </div>
    </Field>
  );
}

/** Hint line under the OTP field after a code was sent. Shows the code itself only in local development without SMTP. */
export function otpSentHint(info) {
  if (!info) return undefined;
  const base = `Code sent to ${info.sentTo}. Valid for ${info.expiresInMinutes} minutes.`;
  return info.devCode ? `${base} (Dev mode, no SMTP: ${info.devCode})` : base;
}

/** Seconds to wait from a 429 "please wait" error, if the server sent one. */
export const retryAfter = (err) => Number(err?.data?.details?.retryAfter) || 0;
