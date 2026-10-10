import { useState } from 'react';
import { Package, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { useAdminPackagesQuery, useUpdatePackageMutation, useAdminCoursesQuery } from '../../api/adminApi';
import { PageHeader, Card, Button, Modal, Input, Select, Textarea, Toggle, StatusBadge, PageLoader, ErrorState, Notice } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { inr } from '../../lib/format';

const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);

function Editor({ pkg, tax, courses, onClose }) {
  const [form, setForm] = useState({
    name: pkg.name, price: pkg.price, activeIncome: pkg.activeIncome, passiveLevels: [...pkg.passiveLevels], nonWorkingBonus: pkg.nonWorkingBonus,
    weeklyEligible: pkg.weeklyEligible, status: pkg.status, description: pkg.description || '', benefits: (pkg.benefits || []).join('\n'),
    courses: [...(pkg.courses || [])],
  });
  const toggleCourse = (slug) => setForm((f) => ({ ...f, courses: f.courses.includes(slug) ? f.courses.filter((s) => s !== slug) : [...f.courses, slug] }));
  const [updateT, { isLoading }] = useUpdatePackageMutation();
  const update = useAction(updateT);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const cost = Number(form.price) * (1 - (tax.gstPercent + tax.systemCostPercent) / 100);
  const payout = Number(form.activeIncome) + sum(form.passiveLevels) + Number(form.nonWorkingBonus);

  const save = async () => {
    const body = {
      ...form,
      price: Number(form.price), activeIncome: Number(form.activeIncome), nonWorkingBonus: Number(form.nonWorkingBonus),
      passiveLevels: form.passiveLevels.map(Number),
      benefits: form.benefits.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    if (await update({ id: pkg._id, ...body })) onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`Edit ${pkg.name} bundle`} subtitle="Changes apply to new sales only. Past ledger entries keep the amounts they were created with."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={save}>Save bundle</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Bundle name" value={form.name} onChange={set('name')} />
          <Input label="Customer price (₹)" type="number" value={form.price} onChange={set('price')} />
          <Select label="Status" value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive (hidden)' }]} />
          <Input label="Active income to sponsor (₹)" type="number" value={form.activeIncome} onChange={set('activeIncome')} />
          <Input label="Non-working bonus to sponsor (₹)" type="number" value={form.nonWorkingBonus} onChange={set('nonWorkingBonus')} />
          <div className="flex items-end pb-2"><Toggle checked={form.weeklyEligible} onChange={(v) => setForm((f) => ({ ...f, weeklyEligible: v }))} label="Weekly income eligible" /></div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted">Passive income per level (Level 1 = sponsor’s sponsor)</p>
            <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, passiveLevels: [...f.passiveLevels, 0] }))} disabled={form.passiveLevels.length >= 30}><Plus className="size-3.5" /> Level</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {form.passiveLevels.map((v, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-xl border border-line bg-ink-900 p-1.5 pl-3">
                <span className="w-6 text-xs font-semibold text-subtle">L{i + 1}</span>
                <input type="number" step="0.5" min="0" className="w-full bg-transparent text-sm outline-none" value={v} aria-label={`Level ${i + 1} amount`}
                  onChange={(e) => setForm((f) => ({ ...f, passiveLevels: f.passiveLevels.map((x, j) => (j === i ? e.target.value : x)) }))} />
                <button type="button" className="rounded-lg p-1 text-subtle hover:text-danger" aria-label="Remove level"
                  onClick={() => setForm((f) => ({ ...f, passiveLevels: f.passiveLevels.filter((_, j) => j !== i) }))}><Trash2 className="size-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 rounded-xl bg-fg/[0.04] p-3 text-sm sm:grid-cols-3">
          <p><span className="text-muted">Bundle cost after GST & system:</span> <b>{inr(cost)}</b></p>
          <p><span className="text-muted">Total payout per sale:</span> <b>{inr(payout)}</b></p>
          <p><span className="text-muted">Company margin:</span> <b className={cost - payout < 0 ? 'text-danger' : 'text-success'}>{inr(cost - payout)}</b></p>
        </div>
        {payout > cost && <Notice tone="red" icon={AlertTriangle} title="Payout exceeds the bundle cost">This bundle would pay out more than it earns after GST and system cost.</Notice>}

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted">Included courses ({form.courses.length}) — shown on the website</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {courses.map((c) => (
              <label key={c.slug} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-sm transition ${form.courses.includes(c.slug) ? 'border-gold-400/50 bg-gold-400/10' : 'border-line hover:border-brand-500/40'}`}>
                <input type="checkbox" className="size-4 accent-gold-400" checked={form.courses.includes(c.slug)} onChange={() => toggleCourse(c.slug)} />
                <span className="flex-1">{c.title}</span>
                {c.status !== 'active' && <span className="text-[10px] text-subtle uppercase">Hidden</span>}
              </label>
            ))}
          </div>
        </div>

        <Textarea label="Description (shown on the website)" value={form.description} onChange={set('description')} rows={2} />
        <Textarea label="Member benefits (one per line)" value={form.benefits} onChange={set('benefits')} rows={5}
          hint="Shown to logged-in members when they choose a bundle to activate. Not shown on the public website." />
      </div>
    </Modal>
  );
}

export default function AdminBundles() {
  const { data, isLoading, error, refetch } = useAdminPackagesQuery();
  const { data: courseData } = useAdminCoursesQuery();
  const courses = courseData?.courses || [];
  const titles = Object.fromEntries(courses.map((c) => [c.slug, c.title]));
  const [editing, setEditing] = useState(null);
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { packages, tax } = data;

  return (
    <div>
      <PageHeader icon={Package} title="Bundles & Income Rules" subtitle={`Prices include GST ${tax.gstPercent}% and system cost ${tax.systemCostPercent}%. Bundle upgrades are not supported.`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((p) => {
          const cost = p.price * (1 - (tax.gstPercent + tax.systemCostPercent) / 100);
          const payout = p.activeIncome + sum(p.passiveLevels) + p.nonWorkingBonus;
          return (
            <Card key={p._id} className="card-pad">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-sm font-extrabold tracking-widest text-muted uppercase">{p.name}</p>
                  <p className="font-display text-3xl font-black">{inr(p.price)}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                {[
                  ['Bundle cost', inr(cost)], ['Active income', inr(p.activeIncome)], ['Passive', `${p.passiveLevels.length} level${p.passiveLevels.length === 1 ? '' : 's'} · ${inr(sum(p.passiveLevels))}`],
                  ['Non-working bonus', p.nonWorkingBonus ? inr(p.nonWorkingBonus) : '—'], ['Weekly income', p.weeklyEligible ? 'Eligible' : 'No'],
                  ['Payout / margin', `${inr(payout)} / ${inr(cost - payout)}`],
                ].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
              </dl>
              <p className="mt-3 text-xs text-subtle">Levels: {p.passiveLevels.map((x) => `₹${x}`).join(' · ')}</p>
              <p className="mt-2 text-xs text-muted">
                <span className="font-semibold text-fg">{(p.courses || []).filter((s) => titles[s]).length} courses:</span>{' '}
                {(p.courses || []).map((s) => titles[s]).filter(Boolean).join(', ') || '—'}
              </p>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setEditing(p)}><Pencil className="size-3.5" /> Edit bundle</Button>
            </Card>
          );
        })}
      </div>
      {editing && <Editor pkg={editing} tax={tax} courses={courses} onClose={() => setEditing(null)} />}
    </div>
  );
}
