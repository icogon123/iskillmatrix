import { useState } from 'react';
import { Package, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { useAdminPackagesQuery, useUpdatePackageMutation } from '../../api/adminApi';
import { PageHeader, Card, Button, Modal, Input, Select, Textarea, Toggle, StatusBadge, PageLoader, ErrorState, Notice } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { inr } from '../../lib/format';

const sum = (a) => a.reduce((x, y) => x + (Number(y) || 0), 0);

function Editor({ pkg, tax, onClose }) {
  const [form, setForm] = useState({
    name: pkg.name, price: pkg.price, activeIncome: pkg.activeIncome, passiveLevels: [...pkg.passiveLevels], nonWorkingBonus: pkg.nonWorkingBonus,
    weeklyEligible: pkg.weeklyEligible, status: pkg.status, description: pkg.description || '', benefits: (pkg.benefits || []).join('\n'),
  });
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
    <Modal open onClose={onClose} size="lg" title={`Edit ${pkg.name} package`} subtitle="Changes apply to new sales only. Past ledger entries keep the amounts they were created with."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={isLoading} onClick={save}>Save package</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Package name" value={form.name} onChange={set('name')} />
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

        <div className="grid gap-2 rounded-xl bg-white/[0.04] p-3 text-sm sm:grid-cols-3">
          <p><span className="text-muted">Package cost after GST & system:</span> <b>{inr(cost)}</b></p>
          <p><span className="text-muted">Total payout per sale:</span> <b>{inr(payout)}</b></p>
          <p><span className="text-muted">Company margin:</span> <b className={cost - payout < 0 ? 'text-danger' : 'text-success'}>{inr(cost - payout)}</b></p>
        </div>
        {payout > cost && <Notice tone="red" icon={AlertTriangle} title="Payout exceeds the package cost">This package would pay out more than it earns after GST and system cost.</Notice>}

        <Textarea label="Description" value={form.description} onChange={set('description')} rows={2} />
        <Textarea label="Benefits (one per line)" value={form.benefits} onChange={set('benefits')} rows={5} />
      </div>
    </Modal>
  );
}

export default function AdminPackages() {
  const { data, isLoading, error, refetch } = useAdminPackagesQuery();
  const [editing, setEditing] = useState(null);
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { packages, tax } = data;

  return (
    <div>
      <PageHeader icon={Package} title="Packages & Income Rules" subtitle={`Prices include GST ${tax.gstPercent}% and system cost ${tax.systemCostPercent}%. Package upgrades are not supported.`} />
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
                  ['Package cost', inr(cost)], ['Active income', inr(p.activeIncome)], ['Passive', `${p.passiveLevels.length} level${p.passiveLevels.length === 1 ? '' : 's'} · ${inr(sum(p.passiveLevels))}`],
                  ['Non-working bonus', p.nonWorkingBonus ? inr(p.nonWorkingBonus) : '—'], ['Weekly income', p.weeklyEligible ? 'Eligible' : 'No'],
                  ['Payout / margin', `${inr(payout)} / ${inr(cost - payout)}`],
                ].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
              </dl>
              <p className="mt-3 text-xs text-subtle">Levels: {p.passiveLevels.map((x) => `₹${x}`).join(' · ')}</p>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setEditing(p)}><Pencil className="size-3.5" /> Edit package</Button>
            </Card>
          );
        })}
      </div>
      {editing && <Editor pkg={editing} tax={tax} onClose={() => setEditing(null)} />}
    </div>
  );
}
