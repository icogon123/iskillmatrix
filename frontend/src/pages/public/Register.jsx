import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UserCheck, Phone, Mail, IdCard, AtSign, CheckCircle2, XCircle, Hash, MailCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import { Button, Input, Select, Notice, Spinner } from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import OtpField, { otpSentHint, retryAfter } from '../../components/common/OtpField';
import {
  usePackagesQuery, useCoursesQuery, useLazySponsorQuery, useLazyCheckUsernameQuery, useSendRegisterOtpMutation, useRegisterMutation,
} from '../../api/publicApi';
import { errorMessage } from '../../app/api';
import { useDebounce } from '../../lib/useDebounce';
import { inr } from '../../lib/format';

const COUNTRIES = ['India', 'Nepal', 'Bhutan', 'Bangladesh', 'Sri Lanka', 'United Arab Emirates', 'Other'].map((c) => ({ value: c, label: c }));
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function validate(f) {
  const e = {};
  if (!f.sponsorId.trim()) e.sponsorId = 'Referral code is required';
  if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name';
  if (!/^\d{10}$/.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
  if (!f.dob) e.dob = 'Enter your date of birth';
  else if ((Date.now() - new Date(f.dob)) / (365.25 * 864e5) < 18) e.dob = 'You must be at least 18 years old';
  if (!/^\d{12}$/.test(f.aadhaar)) e.aadhaar = 'Aadhaar number must be 12 digits';
  if (!/^[a-z0-9_]{4,20}$/i.test(f.username)) e.username = 'Username must be 4–20 letters, numbers or underscore';
  if (!PASSWORD_RE.test(f.password)) e.password = 'Min 8 characters with a letter, a number and a special character';
  if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match';
  if (f.txnPassword.length < 6) e.txnPassword = 'Transaction password must be at least 6 characters';
  else if (f.txnPassword === f.password) e.txnPassword = 'Must be different from your login password';
  if (f.confirmTxnPassword !== f.txnPassword) e.confirmTxnPassword = 'Transaction passwords do not match';
  if (!f.packageId) e.packageId = 'Select a bundle';
  return e;
}

function Section({ title, children }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-ink-900 p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h3 className="mb-4 font-semibold text-fg">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * The registration form. On the public page the referral code is typed in (or comes from ?ref=);
 * from the member area `fixedSponsor` ({ memberId, fullName }) places the new member under the logged-in member.
 */
export function RegisterForm({ fixedSponsor, onDone }) {
  const [params] = useSearchParams();
  const { data: pkgData } = usePackagesQuery();
  const packages = pkgData?.packages || [];
  const { data: courseData } = useCoursesQuery();
  const catalog = useMemo(() => courseData?.courses || [], [courseData]);
  const [lookupSponsor, sponsorRes] = useLazySponsorQuery();
  const [checkUsername, usernameRes] = useLazyCheckUsernameQuery();
  const [register, { isLoading }] = useRegisterMutation();
  const [sendRegisterOtp, { isLoading: sendingOtp }] = useSendRegisterOtpMutation();

  const [form, setForm] = useState({
    sponsorId: fixedSponsor?.memberId || params.get('ref') || '',
    fullName: '', mobile: '', email: '', dob: '', country: 'India', aadhaar: '',
    username: '', password: '', confirmPassword: '', txnPassword: '', confirmTxnPassword: '', packageId: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [agree, setAgree] = useState(false);
  // Email OTP: the code belongs to the address it was sent to, so editing the email asks for a new one.
  const [otp, setOtp] = useState('');
  const [otpInfo, setOtpInfo] = useState(null);
  const [otpError, setOtpError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const otpReady = Boolean(otpInfo) && otpInfo.email === form.email.trim().toLowerCase();

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };
  const digits = (k, max) => (e) => set(k)({ target: { value: e.target.value.replace(/\D/g, '').slice(0, max) } });

  // Preselect the bundle from ?bundle=key (older ?package= / ?course= links still work)
  useEffect(() => {
    const key = params.get('bundle') || params.get('package') || params.get('course');
    if (key && packages.length && !form.packageId) {
      const p = packages.find((x) => x.key === key);
      if (p) setForm((f) => ({ ...f, packageId: p._id }));
    }
  }, [params, packages, form.packageId]);

  const sponsorCode = useDebounce(form.sponsorId.trim(), 400);
  useEffect(() => {
    if (!fixedSponsor && sponsorCode.length >= 3) lookupSponsor(sponsorCode);
  }, [fixedSponsor, sponsorCode, lookupSponsor]);

  const username = useDebounce(form.username.trim(), 400);
  useEffect(() => {
    if (username.length >= 4) checkUsername(username);
  }, [username, checkUsername]);

  const sponsorOk = sponsorCode.length >= 3 && sponsorRes.isSuccess && !sponsorRes.isFetching && sponsorRes.originalArgs === sponsorCode;
  const sponsorBad = sponsorCode.length >= 3 && sponsorRes.isError && !sponsorRes.isFetching;
  const sponsorError = sponsorBad ? sponsorRes.error?.data?.message || 'Referral code not found or inactive' : undefined;
  const usernameTaken = usernameRes.data && usernameRes.data.username === username.toLowerCase() && usernameRes.data.valid && !usernameRes.data.available;
  const usernameFree = usernameRes.data && usernameRes.data.username === username.toLowerCase() && usernameRes.data.available;
  const selectedPkg = useMemo(() => packages.find((p) => p._id === form.packageId), [packages, form.packageId]);

  const sendOtp = async () => {
    setOtpError('');
    const email = form.email.trim().toLowerCase();
    try {
      const res = await sendRegisterOtp({ email, fullName: form.fullName.trim() }).unwrap();
      setOtpInfo({ ...res, email });
      setOtp('');
      setResendAt(Date.now() + res.resendIn * 1000);
    } catch (err) {
      if (retryAfter(err)) setResendAt(Date.now() + retryAfter(err) * 1000);
      setOtpError(errorMessage(err, 'Could not send the OTP'));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    setOtpError('');
    const v = validate(form);
    if (sponsorError) v.sponsorId = sponsorError;
    if (usernameTaken) v.username = 'This username is already taken';
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!agree) return setServerError('Please confirm that your details are correct.');
    if (!otpReady) return sendOtp();
    if (otp.length !== 6) return setOtpError('Enter the 6-digit OTP sent to the email address');
    try {
      const res = await register({ ...form, otp }).unwrap();
      onDone(res);
      window.scrollTo(0, 0);
    } catch (err) {
      const message = errorMessage(err, 'Registration failed');
      if (/OTP/.test(message)) return setOtpError(message);
      const fieldErrors = Object.fromEntries((err?.data?.errors || []).map((x) => [x.field, x.message]));
      setErrors(fieldErrors);
      setServerError(message);
    }
  };

  const err = (k) => ({ error: errors[k], 'data-error': Boolean(errors[k]) });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {serverError && <Notice tone="red" title={serverError} />}

      <Section title="Referral">
        {fixedSponsor ? (
          <>
            <Input label="Sponsor ID" icon={Hash} value={fixedSponsor.memberId} readOnly hint="The new member joins your team" />
            <Input label="Sponsor name" icon={UserCheck} value={fixedSponsor.fullName} readOnly />
          </>
        ) : (
          <>
            <Input label="Referral code (Sponsor ID)" icon={Hash} placeholder="e.g. ISM100001" value={form.sponsorId} onChange={set('sponsorId')} {...err('sponsorId')}
              right={sponsorRes.isFetching ? <Spinner className="mr-2 size-4" /> : sponsorOk ? <CheckCircle2 className="mr-2 size-4 text-success" /> : sponsorBad ? <XCircle className="mr-2 size-4 text-danger" /> : null} />
            <Input label="Sponsor name" icon={UserCheck} value={sponsorOk ? sponsorRes.data.fullName : ''} placeholder={sponsorBad ? 'Not available' : 'Auto-filled from sponsor ID'} readOnly
              hint={sponsorOk ? `Referred by ${sponsorRes.data.fullName}` : undefined} />
          </>
        )}
      </Section>

      <Section title="Profile detail">
        <Input label="Full name" value={form.fullName} onChange={set('fullName')} autoComplete="name" {...err('fullName')} />
        <Input label="Mobile number" icon={Phone} inputMode="numeric" value={form.mobile} onChange={digits('mobile', 10)} autoComplete="tel-national" {...err('mobile')} />
        <Input label="Email address" icon={Mail} type="email" value={form.email} onChange={set('email')} autoComplete="email" {...err('email')} />
        <Input label="Date of birth" type="date" value={form.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} {...err('dob')} />
        <Select label="Country" value={form.country} onChange={set('country')} options={COUNTRIES} />
        <Input label="Aadhaar number" icon={IdCard} inputMode="numeric" value={form.aadhaar} onChange={digits('aadhaar', 12)} placeholder="12-digit Aadhaar" {...err('aadhaar')} />
      </Section>

      <Section title="Login access">
        <Input label="Username / User ID" icon={AtSign} value={form.username} onChange={set('username')} autoComplete={fixedSponsor ? 'off' : 'username'} {...err('username')}
          hint={usernameFree ? 'Username is available' : undefined}
          right={usernameRes.isFetching ? <Spinner className="mr-2 size-4" /> : usernameFree ? <CheckCircle2 className="mr-2 size-4 text-success" /> : usernameTaken ? <XCircle className="mr-2 size-4 text-danger" /> : null} />
        <div className="hidden sm:block" />
        <PasswordInput label="Password" autoComplete="new-password" value={form.password} onChange={set('password')} {...err('password')}
          hint="Min 8 characters, with a letter, a number and a special character (e.g. Riches#123)" />
        <PasswordInput label="Confirm password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} {...err('confirmPassword')} />
        <PasswordInput label="Transaction password" autoComplete="new-password" value={form.txnPassword} onChange={set('txnPassword')} {...err('txnPassword')}
          hint="Used to authorise withdrawals. Keep it different from your login password." />
        <PasswordInput label="Confirm transaction password" autoComplete="new-password" value={form.confirmTxnPassword} onChange={set('confirmTxnPassword')} {...err('confirmTxnPassword')} />
      </Section>

      <fieldset className="rounded-2xl border border-line bg-ink-900 p-5 sm:p-6" data-error={Boolean(errors.packageId)}>
        <legend className="sr-only">Choose your bundle</legend>
        <h3 className="mb-4 font-semibold text-fg">Choose your bundle</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => {
            const active = form.packageId === p._id;
            return (
              <label key={p._id}
                className={`cursor-pointer rounded-2xl border p-4 transition ${active ? 'border-brand-400 bg-brand-500/10' : 'border-line hover:border-fg/25'}`}>
                <input type="radio" name="package" className="sr-only" checked={active} onChange={() => set('packageId')({ target: { value: p._id } })} />
                <div className="flex items-center justify-between">
                  <span className="font-bold">{p.name}</span>
                  <span className={`size-4 rounded-full border-2 ${active ? 'border-brand-400 bg-brand-400 ring-2 ring-inset ring-ink-900' : 'border-subtle'}`} />
                </div>
                <p className="mt-2 text-2xl font-bold">{inr(p.price)}</p>
                <p className="mt-1 text-xs font-semibold text-brand-200">{p.courses.length} course{p.courses.length === 1 ? '' : 's'} included</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{catalog.filter((c) => p.courses.includes(c.slug)).map((c) => c.title).join(', ')}</p>
              </label>
            );
          })}
        </div>
        {errors.packageId && <p className="mt-2 text-xs text-danger">{errors.packageId}</p>}
        {selectedPkg && <p className="mt-3 text-xs text-subtle">{inr(selectedPkg.price)} (one-time, incl. GST), paid by QR code after logging in. The ID is activated once the bundle is bought. {!fixedSponsor && <Link to="/pricing" className="text-brand-300">Compare bundles</Link>}</p>}
      </fieldset>

      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-brand-500" />
        {fixedSponsor ? 'I confirm that the details above are correct and belong to the new member.' : 'I confirm that the details above are correct and belong to me.'}
      </label>

      {otpReady ? (
        <fieldset className="rounded-2xl border border-brand-400/40 bg-ink-900 p-5 sm:p-6">
          <legend className="sr-only">Verify email</legend>
          <h3 className="mb-1 flex items-center gap-2 font-semibold text-fg"><MailCheck className="size-4 text-brand-300" /> Verify email address</h3>
          <p className="mb-4 text-xs text-muted">
            {fixedSponsor ? 'Ask the new member for the code we emailed them.' : 'Enter the code we emailed you.'} Wrong address? Edit the email above and send a new code.
          </p>
          <OtpField value={otp} onChange={(v) => { setOtp(v); setOtpError(''); }} onSend={sendOtp} sending={sendingOtp} sent resendAt={resendAt}
            error={otpError} hint={otpSentHint(otpInfo)} />
        </fieldset>
      ) : (
        otpError && <Notice tone="red" title={otpError} />
      )}

      <Button type="submit" variant="solid" size="lg" className="w-full" loading={isLoading || (sendingOtp && !otpReady)}>
        {!otpReady ? 'Send email OTP' : fixedSponsor ? 'Verify & register member' : 'Verify & create account'}
      </Button>
      {!otpReady && <p className="-mt-2 text-center text-xs text-subtle">We email a 6-digit code to {fixedSponsor ? 'the new member' : 'you'} to verify the address.</p>}
      {!fixedSponsor && (
        <p className="text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="font-semibold text-brand-300">Log in</Link>
        </p>
      )}
    </form>
  );
}

/** Member ID + username card shown after a successful registration. */
export function RegisteredIds({ done }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 text-left">
      <div className="rounded-xl bg-fg/[0.04] p-3">
        <p className="text-xs text-muted">Member ID</p>
        <p className="text-lg font-bold text-gold-400">{done.memberId}</p>
      </div>
      <div className="rounded-xl bg-fg/[0.04] p-3">
        <p className="text-xs text-muted">Username</p>
        <p className="text-lg font-bold">{done.username}</p>
      </div>
    </div>
  );
}

export default function Register() {
  const [done, setDone] = useState(null);
  if (done) {
    return (
      <AuthShell title="Account created" aside={false}>
        <div className="rounded-2xl border border-line bg-ink-900 p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/15 text-success"><CheckCircle2 className="size-7" /></span>
          <p className="mt-4 text-muted">{done.message}</p>
          <RegisteredIds done={done} />
          <p className="mt-5 text-xs text-subtle">Keep these safe. Log in now and buy your course bundle to activate your ID. Once it is active you can invite new members.</p>
          <Button to="/login" variant="solid" className="mt-6 w-full">Go to log in</Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Enroll in a course bundle. All fields are required. You can log in as soon as your account is created." wide aside={false}>
      <RegisterForm onDone={setDone} />
    </AuthShell>
  );
}
