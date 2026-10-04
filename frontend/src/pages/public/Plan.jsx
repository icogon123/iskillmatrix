import { useMemo, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { usePackagesQuery, useSiteQuery } from '../../api/publicApi';
import { Tabs, PageLoader } from '../../components/ui';
import BadgeMedal from '../../components/common/BadgeMedal';
import { inr } from '../../lib/format';
import { PageHero, SectionTitle, CtaBand } from './sections';

const LEVEL_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function FlowDiagram({ pkg }) {
  const nodes = [
    { tag: 'R', title: 'New member', note: `buys ${pkg.name} · ${inr(pkg.price)}`, cls: 'border-success/50 bg-success/10' },
    { tag: '−A', title: 'Direct sponsor', note: `Active income ${inr(pkg.activeIncome)}${pkg.nonWorkingBonus ? ` + bonus ${inr(pkg.nonWorkingBonus)}` : ''}`, cls: 'border-gold-400/60 bg-gold-400/10' },
    ...pkg.passiveLevels.map((amt, i) => ({
      tag: LEVEL_NAMES[i],
      title: `Level ${i + 1} upline`,
      note: `Passive income ${inr(amt)}`,
      cls: i === 0 ? 'border-orange-400/50 bg-orange-400/10' : 'border-brand-500/40 bg-brand-500/10',
    })),
  ];
  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      {nodes.map((n, i) => (
        <div key={n.tag} className="flex w-full flex-col items-center">
          <div className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3 ${n.cls}`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-950/60 font-display font-black">{n.tag}</span>
            <div>
              <p className="text-sm font-bold">{n.title}</p>
              <p className="text-xs text-muted">{n.note}</p>
            </div>
          </div>
          {i < nodes.length - 1 && <ArrowDown className="my-1 size-4 rotate-180 text-subtle" />}
        </div>
      ))}
      <p className="mt-4 text-center text-xs text-subtle">Arrows show money flowing up the sponsor chain when R's purchase is approved.</p>
    </div>
  );
}

export default function Plan() {
  const { data, isLoading } = usePackagesQuery();
  const { data: site } = useSiteQuery();
  const packages = data?.packages || [];
  const [tab, setTab] = useState('standard');
  const selected = packages.find((p) => p.key === tab) || packages[0];
  const maxLevels = useMemo(() => Math.max(0, ...packages.map((p) => p.passiveLevels.length)), [packages]);
  const tax = data?.tax;
  const plan = site?.plan;

  if (isLoading) return <PageLoader />;

  return (
    <>
      <PageHero kicker="Transparent & configurable" title="The income" gold="plan" sub="A unilevel plan: refer as many people as you like. Your income flows from your direct sales and from your team’s growth." />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle title="Package" gold="structure" sub={`Customer price includes GST ${tax?.gstPercent ?? 18}% and system cost ${tax?.systemCostPercent ?? 12}%. The remainder funds the income plan.`} />
        <div className="card mt-10 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-wider text-subtle uppercase">
                {['Package', 'Customer price', 'GST', 'System cost', 'Package cost', 'Active income', 'Passive levels', 'Working bonus'].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => {
                const gst = (p.price * (tax?.gstPercent ?? 18)) / 100;
                const sys = (p.price * (tax?.systemCostPercent ?? 12)) / 100;
                return (
                  <tr key={p.key} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 font-bold">{p.name}</td>
                    <td className="px-4 py-3">{inr(p.price)}</td>
                    <td className="px-4 py-3 text-muted">{inr(gst)}</td>
                    <td className="px-4 py-3 text-muted">{inr(sys)}</td>
                    <td className="px-4 py-3">{inr(p.price - gst - sys)}</td>
                    <td className="px-4 py-3 font-semibold text-gold-400">{inr(p.activeIncome)}</td>
                    <td className="px-4 py-3">{p.passiveLevels.length} level{p.passiveLevels.length > 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">{p.nonWorkingBonus ? inr(p.nonWorkingBonus) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-y border-line bg-ink-900/50 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <SectionTitle center={false} kicker="How a sale pays out" title="Package" gold="model" sub="R = new member, −A = direct sponsor (active income), A–L = upline levels earning passive income. Level 1 is your sponsor’s sponsor." />
            <Tabs className="mt-6" value={selected?.key} onChange={setTab} tabs={packages.map((p) => ({ value: p.key, label: p.name }))} />
            <div className="mt-6 rounded-2xl border border-line bg-ink-950/40 p-4 text-sm text-muted">
              <p>
                <span className="font-semibold text-fg">Total distributed per {selected?.name} sale:</span>{' '}
                {selected && inr(selected.activeIncome + selected.passiveTotal + selected.nonWorkingBonus)}
              </p>
              <p className="mt-1">Income is credited only to members whose account and package are active.</p>
            </div>
          </div>
          {selected && <FlowDiagram pkg={selected} />}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle title="Team building" gold="income" sub="Passive income per level for each package purchased in your team." />
        <div className="card mt-10 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-wider text-subtle uppercase">
                <th className="px-4 py-3">Level</th>
                {packages.map((p) => <th key={p.key} className="px-4 py-3">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxLevels }, (_, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 font-semibold">Level {i + 1}</td>
                  {packages.map((p) => (
                    <td key={p.key} className={`px-4 py-2.5 ${p.passiveLevels[i] ? 'text-gold-400' : 'text-subtle'}`}>
                      {p.passiveLevels[i] ? inr(p.passiveLevels[i]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-y border-line bg-ink-900/50 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-display text-xl font-black uppercase">Weekly <span className="gold-text">income</span></h3>
            <p className="mt-3 text-sm text-muted">
              Complete {plan?.weekly?.qualifyingSales ?? 3}, {(plan?.weekly?.qualifyingSales ?? 3) * 2} or {(plan?.weekly?.qualifyingSales ?? 3) * 3} direct sales of the same package (Standard, Premium or Pro) in a week (Mon–Sun).
              You earn {plan?.weekly?.percent ?? 5}% of the value of your qualifying sales, paid after the week closes.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {[1, 2, 3].map((m) => (
                <li key={m} className="flex justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                  <span>{m * (plan?.weekly?.qualifyingSales ?? 3)} sales</span>
                  <span className="font-semibold text-gold-400">{['Single', 'Double', 'Triple'][m - 1]} weekly income</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-subtle">Example: 3 Pro sales → {plan?.weekly?.percent ?? 5}% × 3 × ₹18,600 = {inr(((plan?.weekly?.percent ?? 5) / 100) * 3 * 18600)}</p>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-xl font-black uppercase">Monthly <span className="gold-text">bonus</span></h3>
            <p className="mt-3 text-sm text-muted">Based on your active (direct) income in a calendar month. You receive the highest slab you cross.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {(plan?.monthlyBonus?.slabs || []).map((s) => (
                <li key={s.threshold} className="flex justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                  <span>Direct income {plan.monthlyBonus.comparator === 'gte' ? '≥' : 'above'} {inr(s.threshold)}</span>
                  <span className="font-semibold text-gold-400">{inr(s.bonus)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-xl font-black uppercase">Working <span className="gold-text">bonus</span></h3>
            <p className="mt-3 text-sm text-muted">An extra bonus for the direct sponsor on every Standard, Premium or Pro sale, credited at 12:00 AM.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {packages.filter((p) => p.nonWorkingBonus > 0).map((p) => (
                <li key={p.key} className="flex justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                  <span>{p.name}: {inr(p.activeIncome)} + {inr(p.nonWorkingBonus)}</span>
                  <span className="font-semibold text-gold-400">= {inr(p.activeIncome + p.nonWorkingBonus)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-xl font-black uppercase">Withdrawals</h3>
            <p className="mt-3 text-sm text-muted">
              Withdraw your wallet balance to your KYC-verified bank account. TDS {plan?.withdrawal?.tdsPercent ?? 2}% and admin charge{' '}
              {plan?.withdrawal?.adminChargePercent ?? 5}% are deducted from the requested amount.
            </p>
            <div className="mt-4 space-y-1.5 rounded-xl bg-white/[0.04] p-3 text-sm">
              <div className="flex justify-between"><span>Request</span><span>₹10,000</span></div>
              <div className="flex justify-between text-muted"><span>TDS ({plan?.withdrawal?.tdsPercent ?? 2}%)</span><span>− {inr(100 * (plan?.withdrawal?.tdsPercent ?? 2))}</span></div>
              <div className="flex justify-between text-muted"><span>Admin ({plan?.withdrawal?.adminChargePercent ?? 5}%)</span><span>− {inr(100 * (plan?.withdrawal?.adminChargePercent ?? 5))}</span></div>
              <div className="flex justify-between border-t border-line pt-1.5 font-bold text-gold-400">
                <span>You receive</span>
                <span>{inr(10000 - 100 * ((plan?.withdrawal?.tdsPercent ?? 2) + (plan?.withdrawal?.adminChargePercent ?? 5)))}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionTitle title="Achievements &" gold="royalty" sub="Badges are based on lifetime earnings and never expire. From Emerald Executive, you also earn a monthly royalty on your team’s income." />
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(plan?.badges || []).map((b) => {
            const royalty = plan.royalty.slabs.find((s) => s.badgeKey === b.key);
            return (
              <div key={b.key} className={`card flex flex-col items-center gap-2 p-5 text-center ${royalty ? 'border-gold-400/30' : ''}`}>
                <BadgeMedal badgeKey={b.key} />
                <p className="text-sm font-bold">{b.name}</p>
                <p className="text-xs text-muted">Lifetime {inr(b.threshold)}</p>
                {royalty && <p className="rounded-full bg-gold-400/15 px-2 py-0.5 text-[11px] font-bold text-gold-400">{royalty.percent}% royalty</p>}
              </div>
            );
          })}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
