import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UserCheck, Phone, Mail, IdCard, AtSign, CheckCircle2, XCircle, PartyPopper, Hash } from 'lucide-react';
import AuthShell from './AuthShell';
import { Button, Input, Select, Notice, Spinner } from '../../components/ui';
import PasswordInput from '../../components/common/PasswordInput';
import { usePackagesQuery, useLazySponsorQuery, useLazyCheckUsernameQuery, useRegisterMutation } from '../../api/publicApi';
import { errorMessage } from '../../app/api';
import { useDebounce } from '../../lib/useDebounce';
import { inr } from '../../lib/format';

const COUNTRIES = ['India', 'Nepal', 'Bhutan', 'Bangladesh', 'Sri Lanka', 'United Arab Emirates', 'Other'].map((c) => ({ value: c, label: c }));
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function validate(f) {
  const e = {};
  if (!f.sponsorId.trim()) e.sponsorId = 'Sponsor ID / referral code is required';
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
  if (!f.packageId) e.packageId = 'Select a package';
  return e;
}

function Section({ title, children }) {
  return (
    <fieldset className="card card-pad">
      <legend className="sr-only">{title}</legend>
      <h3 className="mb-4 border-b border-line pb-3 text-sm font-bold tracking-wide text-brand-200 uppercase">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function Register() {
  const [params] = useSearchParams();
  const { data: pkgData } = usePackagesQuery();
  const packages = pkgData?.packages || [];
  const [lookupSponsor, sponsorRes] = useLazySponsorQuery();
  const [checkUsername, usernameRes] = useLazyCheckUsernameQuery();
  const [register, { isLoading }] = useRegisterMutation();

  const [form, setForm] = useState({
    sponsorId: params.get('ref') || '',
    fullName: '', mobile: '', email: '', dob: '', country: 'India', aadhaar: '',
    username: '', password: '', confirmPassword: '', txnPassword: '', confirmTxnPassword: '', packageId: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [agree, setAgree] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };
  const digits = (k, max) => (e) => set(k)({ target: { value: e.target.value.replace(/\D/g, '').slice(0, max) } });

  // Preselect package from ?package=key
  useEffect(() => {
    const key = params.get('package');
    if (key && packages.length && !form.packageId) {
      const p = packages.find((x) => x.key === key);
      if (p) setForm((f) => ({ ...f, packageId: p._id }));
    }
  }, [params, packages, form.packageId]);

  const sponsorCode = useDebounce(form.sponsorId.trim(), 400);
  useEffect(() => {
    if (sponsorCode.length >= 3) lookupSponsor(sponsorCode);
  }, [sponsorCode, lookupSponsor]);

  const username = useDebounce(form.username.trim(), 400);
  useEffect(() => {
    if (username.length >= 4) checkUsername(username);
  }, [username, checkUsername]);

  const sponsorOk = sponsorCode.length >= 3 && sponsorRes.isSuccess && !sponsorRes.isFetching && sponsorRes.originalArgs === sponsorCode;
  const sponsorBad = sponsorCode.length >= 3 && sponsorRes.isError && !sponsorRes.isFetching;
  const usernameTaken = usernameRes.data && usernameRes.data.username === username.toLowerCase() && usernameRes.data.valid && !usernameRes.data.available;
  const usernameFree = usernameRes.data && usernameRes.data.username === username.toLowerCase() && usernameRes.data.available;
  const selectedPkg = useMemo(() => packages.find((p) => p._id === form.packageId), [packages, form.packageId]);

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const v = validate(form);
    if (sponsorBad) v.sponsorId = 'Sponsor not found or inactive';
    if (usernameTaken) v.username = 'This username is already taken';
    setErrors(v);
    if (Object.keys(v).length) {
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!agree) return setServerError('Please confirm that your details are correct.');
    try {
      const res = await register(form).unwrap();
      setDone(res);
      window.scrollTo(0, 0);
    } catch (err) {
      const fieldErrors = Object.fromEntries((err?.data?.errors || []).map((x) => [x.field, x.message]));
      setErrors(fieldErrors);
      setServerError(errorMessage(err, 'Registration failed'));
    }
  };

  if (done) {
    return (
      <AuthShell title="Registration submitted" aside={false}>
        <div className="card card-pad text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success"><PartyPopper className="size-8" /></span>
          <p className="mt-4 text-muted">{done.message}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-muted">Member ID</p>
              <p className="font-display text-lg font-black text-gold-400">{done.memberId}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xs text-muted">Username</p>
              <p className="font-display text-lg font-black">{done.username}</p>
            </div>
          </div>
          <p className="mt-5 text-xs text-subtle">Keep these safe. After approval, log in, complete your KYC and pay for your package using the QR code.</p>
          <Button to="/login" className="mt-6 w-full">Go to login</Button>
        </div>
      </AuthShell>
    );
  }

  const err = (k) => ({ error: errors[k], 'data-error': Boolean(errors[k]) });

  return (
    <AuthShell title="Register a new membership" subtitle="All fields are required. Your account is activated after admin approval." wide aside={false}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        {serverError && <Notice tone="red" title={serverError} />}

        <Section title="Referral detail">
          <Input label="Sponsor ID / Referral code" icon={Hash} placeholder="e.g. ISM100001" value={form.sponsorId} onChange={set('sponsorId')} {...err('sponsorId')}
            right={sponsorRes.isFetching ? <Spinner className="mr-2 size-4" /> : sponsorOk ? <CheckCircle2 className="mr-2 size-4 text-success" /> : sponsorBad ? <XCircle className="mr-2 size-4 text-danger" /> : null} />
          <Input label="Sponsor name" icon={UserCheck} value={sponsorOk ? sponsorRes.data.fullName : ''} placeholder={sponsorBad ? 'Sponsor not found' : 'Auto-filled from sponsor ID'} readOnly
            hint={sponsorOk ? `You will join ${sponsorRes.data.fullName}'s team` : undefined} />
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
          <Input label="Username / User ID" icon={AtSign} value={form.username} onChange={set('username')} autoComplete="username" {...err('username')}
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

        <fieldset className="card card-pad" data-error={Boolean(errors.packageId)}>
          <h3 className="mb-4 border-b border-line pb-3 text-sm font-bold tracking-wide text-brand-200 uppercase">Select package</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => {
              const active = form.packageId === p._id;
              return (
                <label key={p._id}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${active ? 'border-gold-400/70 bg-gold-400/10 shadow-gold' : 'border-line hover:border-brand-500/50'}`}>
                  <input type="radio" name="package" className="sr-only" checked={active} onChange={() => set('packageId')({ target: { value: p._id } })} />
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{p.name}</span>
                    <span className={`size-4 rounded-full border-2 ${active ? 'border-gold-400 bg-gold-400' : 'border-subtle'}`} />
                  </div>
                  <p className="mt-2 font-display text-2xl font-black">{inr(p.price)}</p>
                  <p className="mt-1 text-xs text-muted">Direct income {inr(p.activeIncome)} · {p.passiveLevels.length} level{p.passiveLevels.length === 1 ? '' : 's'}</p>
                </label>
              );
            })}
          </div>
          {errors.packageId && <p className="mt-2 text-xs text-danger">{errors.packageId}</p>}
          {selectedPkg && <p className="mt-3 text-xs text-subtle">You will pay {inr(selectedPkg.price)} by QR code after your registration is approved.</p>}
        </fieldset>

        <label className="flex items-start gap-3 text-sm text-muted">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-brand-500" />
          I confirm that the details above are correct and belong to me.
        </label>

        <Button type="submit" size="lg" className="w-full" loading={isLoading}>Submit registration</Button>
        <p className="text-center text-sm text-muted">
          Already registered? <Link to="/login" className="font-semibold text-brand-300">Login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
