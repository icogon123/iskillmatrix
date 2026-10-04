import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Upload, History } from 'lucide-react';
import { useSettingsQuery, useUpdateSettingsMutation, useUploadQrMutation, useSettingsHistoryQuery } from '../../api/adminApi';
import { PageHeader, Card, CardHeader, Button, Input, Select, Textarea, Toggle, Tabs, PageLoader, ErrorState, DataTable, Modal } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { INCOME_TYPES } from '../../lib/constants';
import { dateTime } from '../../lib/format';

const SECTIONS = [
  { value: 'site', label: 'Website' }, { value: 'payment', label: 'QR payment' }, { value: 'income', label: 'Income rules' },
  { value: 'badges', label: 'Badges & royalty' }, { value: 'withdrawal', label: 'Withdrawal' },
];

function SlabEditor({ rows, onChange, fields, addLabel }) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-end gap-2">
          {fields.map((f) => (
            <Input key={f.key} className="flex-1" label={i === 0 ? f.label : undefined} type={f.type || 'number'} value={row[f.key]}
              onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, [f.key]: f.type === 'text' ? e.target.value : e.target.value } : r)))} />
          ))}
          <button type="button" className="mb-1 rounded-lg p-2 text-subtle hover:text-danger" aria-label="Remove row" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...rows, Object.fromEntries(fields.map((f) => [f.key, f.type === 'text' ? '' : 0]))])}><Plus className="size-3.5" /> {addLabel}</Button>
    </div>
  );
}

function HistoryModal({ open, onClose }) {
  const { data } = useSettingsHistoryQuery({ limit: 50 }, { skip: !open });
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Configuration history" subtitle="Snapshots saved before each change">
      <DataTable dense rows={data?.items || []} columns={[
        { key: 'when', header: 'Changed', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
        { key: 'scope', header: 'Scope', render: (r) => `${r.scope}${r.refId && r.scope === 'package' ? ` · ${r.refId}` : ''}` },
        { key: 'v', header: 'Previous version', render: (r) => (r.version ? `v${r.version}` : '—') },
        { key: 'by', header: 'By', render: (r) => r.changedBy?.fullName || '—' },
        { key: 'note', header: 'Note', render: (r) => <span className="text-xs text-muted">{r.note || '—'}</span> },
      ]} />
    </Modal>
  );
}

export default function Settings() {
  const { data, isLoading, error, refetch } = useSettingsQuery();
  const [updateT, { isLoading: saving }] = useUpdateSettingsMutation();
  const [qrT, { isLoading: uploading }] = useUploadQrMutation();
  const save = useAction(updateT);
  const uploadQr = useAction(qrT);
  const [tab, setTab] = useState('site');
  const [s, setS] = useState(null);
  const [qr, setQr] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (data?.settings) setS(structuredClone(data.settings));
  }, [data]);

  if (isLoading || !s) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const set = (section, key) => (e) => {
    const v = e?.target ? e.target.value : e;
    setS((x) => ({ ...x, [section]: { ...x[section], [key]: v } }));
  };
  const n = (v) => Number(v);
  const submit = (keys) => {
    const body = Object.fromEntries(keys.map((k) => [k, s[k]]));
    if (body.monthlyBonus) body.monthlyBonus = { ...body.monthlyBonus, slabs: body.monthlyBonus.slabs.map((x) => ({ threshold: n(x.threshold), bonus: n(x.bonus) })) };
    if (body.badges) body.badges = body.badges.map((b) => ({ key: b.key, name: b.name, threshold: n(b.threshold) }));
    if (body.royalty) body.royalty = { ...body.royalty, slabs: body.royalty.slabs.map((x) => ({ badgeKey: x.badgeKey, percent: n(x.percent) })) };
    return save(body);
  };
  const Save = ({ keys }) => <Button loading={saving} onClick={() => submit(keys)}>Save changes</Button>;

  return (
    <div>
      <PageHeader icon={SettingsIcon} title="System Settings" subtitle={`Configuration version ${s.version}. Every change is versioned and audited; past transactions are never recalculated.`}
        actions={<Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}><History className="size-4" /> History</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={SECTIONS} className="mb-5" />

      {tab === 'site' && (
        <Card className="card-pad space-y-4">
          <CardHeader title="Website & contact" subtitle="Shown on the public website footer and contact page" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Site name" value={s.site.name} onChange={set('site', 'name')} />
            <Input label="Tagline" value={s.site.tagline} onChange={set('site', 'tagline')} />
            <Input label="Support email" value={s.site.email} onChange={set('site', 'email')} />
            <Input label="Phone" value={s.site.phone} onChange={set('site', 'phone')} />
            <Input label="WhatsApp number" value={s.site.whatsapp} onChange={set('site', 'whatsapp')} hint="With country code, e.g. 919876543210" />
            <Input label="Address" value={s.site.address} onChange={set('site', 'address')} />
          </div>
          <Save keys={['site']} />
        </Card>
      )}

      {tab === 'payment' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="card-pad space-y-4 lg:col-span-2">
            <CardHeader title="QR code payment" subtitle="No payment gateway — members pay by QR and you verify manually" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="UPI ID" value={s.payment.upiId} onChange={set('payment', 'upiId')} placeholder="company@bank" />
              <Input label="Payee name" value={s.payment.payeeName} onChange={set('payment', 'payeeName')} />
            </div>
            <Textarea label="Instructions shown to members" value={s.payment.instructions} onChange={set('payment', 'instructions')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="GST %" type="number" value={s.tax.gstPercent} onChange={set('tax', 'gstPercent')} />
              <Input label="System cost %" type="number" value={s.tax.systemCostPercent} onChange={set('tax', 'systemCostPercent')} />
            </div>
            <Button loading={saving} onClick={() => submit(['payment', 'tax'])}>Save changes</Button>
          </Card>
          <Card className="card-pad">
            <CardHeader title="QR code image" />
            <div className="mt-4 grid place-items-center rounded-2xl bg-white p-4">
              {s.payment.qrImage ? <img src={`/uploads/public/${s.payment.qrImage}`} alt="Payment QR" className="aspect-square w-full max-w-48 object-contain" />
                : <p className="py-16 text-sm text-gray-500">No QR uploaded</p>}
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line p-3 text-sm text-muted hover:border-brand-500/50">
              <Upload className="size-4 text-brand-300" /> {qr ? qr.name : 'Choose QR image (PNG/JPG)'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setQr(e.target.files?.[0] || null)} />
            </label>
            <Button className="mt-3 w-full" disabled={!qr} loading={uploading}
              onClick={async () => { const fd = new FormData(); fd.append('qr', qr); if (await uploadQr(fd)) setQr(null); }}>Upload QR</Button>
          </Card>
        </div>
      )}

      {tab === 'income' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-pad space-y-4">
            <CardHeader title="Weekly income" subtitle="Standard, Premium and Pro (set per package)" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Weekly %" type="number" value={s.weekly.percent} onChange={set('weekly', 'percent')} />
              <Input label="Qualifying sales per set" type="number" value={s.weekly.qualifyingSales} onChange={set('weekly', 'qualifyingSales')} />
            </div>
            <CardHeader title="Monthly bonus" subtitle="Slab on monthly Active income" />
            <Select label="Threshold rule" value={s.monthlyBonus.comparator} onChange={set('monthlyBonus', 'comparator')}
              options={[{ value: 'gt', label: 'Strictly greater than (>)' }, { value: 'gte', label: 'Greater than or equal (≥)' }]} />
            <SlabEditor rows={s.monthlyBonus.slabs} addLabel="Slab" onChange={set('monthlyBonus', 'slabs')}
              fields={[{ key: 'threshold', label: 'Active income above (₹)' }, { key: 'bonus', label: 'Bonus (₹)' }]} />
            <Button loading={saving} onClick={() => submit(['weekly', 'monthlyBonus'])}>Save changes</Button>
          </Card>
          <Card className="card-pad space-y-5">
            <CardHeader title="Processing & eligibility" />
            <Toggle checked={s.nonWorking.autoProcess} onChange={set('nonWorking', 'autoProcess')} label="Auto-credit non-working bonus at 12:00 AM" description="When off, credit them manually from Income Processing." />
            <Toggle checked={s.income.requireActiveBeneficiary} onChange={set('income', 'requireActiveBeneficiary')} label="Only active members with a package receive income"
              description="Income for inactive/suspended uplines is recorded as lapsed." />
            <Button loading={saving} onClick={() => submit(['nonWorking', 'income'])}>Save changes</Button>
          </Card>
        </div>
      )}

      {tab === 'badges' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-pad space-y-4">
            <CardHeader title="Achievement badges" subtitle="Lifetime earning thresholds. Badges already achieved are never removed." />
            <SlabEditor rows={s.badges} addLabel="Badge" onChange={(v) => setS((x) => ({ ...x, badges: v }))}
              fields={[{ key: 'key', label: 'Key', type: 'text' }, { key: 'name', label: 'Name', type: 'text' }, { key: 'threshold', label: 'Lifetime ₹' }]} />
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">Income types counted towards lifetime earnings</p>
              <div className="flex flex-wrap gap-2">
                {INCOME_TYPES.map((t) => {
                  const on = s.badgeQualifyingCategories.includes(t.key);
                  return (
                    <button key={t.key} type="button"
                      onClick={() => setS((x) => ({ ...x, badgeQualifyingCategories: on ? x.badgeQualifyingCategories.filter((k) => k !== t.key) : [...x.badgeQualifyingCategories, t.key] }))}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${on ? 'bg-brand-500/20 text-brand-200 ring-brand-500/40' : 'text-muted ring-line'}`}>{t.label}</button>
                  );
                })}
              </div>
            </div>
            <Button loading={saving} onClick={() => submit(['badges', 'badgeQualifyingCategories'])}>Save changes</Button>
          </Card>
          <Card className="card-pad space-y-4">
            <CardHeader title="Royalty" subtitle="Monthly royalty by badge" />
            <Select label="Royalty is calculated on" value={s.royalty.basis} onChange={set('royalty', 'basis')}
              options={[{ value: 'team', label: 'Team (downline) Active + Passive income' }, { value: 'own', label: 'Member’s own Active + Passive income' }]} />
            <SlabEditor rows={s.royalty.slabs} addLabel="Royalty slab" onChange={set('royalty', 'slabs')}
              fields={[{ key: 'badgeKey', label: 'Badge key', type: 'text' }, { key: 'percent', label: 'Royalty %' }]} />
            <Button loading={saving} onClick={() => submit(['royalty'])}>Save changes</Button>
          </Card>
        </div>
      )}

      {tab === 'withdrawal' && (
        <Card className="card-pad max-w-2xl space-y-4">
          <CardHeader title="Withdrawal rules" subtitle="Charges are deducted from the requested amount" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="TDS %" type="number" value={s.withdrawal.tdsPercent} onChange={set('withdrawal', 'tdsPercent')} />
            <Input label="Admin charge %" type="number" value={s.withdrawal.adminChargePercent} onChange={set('withdrawal', 'adminChargePercent')} />
            <Input label="Minimum withdrawal (₹)" type="number" value={s.withdrawal.min} onChange={set('withdrawal', 'min')} />
            <Input label="Maximum withdrawal (₹)" type="number" value={s.withdrawal.max} onChange={set('withdrawal', 'max')} hint="0 = no maximum" />
          </div>
          <Toggle checked={s.withdrawal.requireKyc} onChange={set('withdrawal', 'requireKyc')} label="Require approved KYC to withdraw" />
          <Save keys={['withdrawal']} />
        </Card>
      )}

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
