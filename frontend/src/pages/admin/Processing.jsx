import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog, Moon, CalendarRange, CalendarDays, Crown, Play } from 'lucide-react';
import { useProcessingQuery, useRunNonWorkingMutation, useGenerateRunMutation } from '../../api/adminApi';
import { PageHeader, Card, CardHeader, Button, Input, DataTable, StatusBadge, PageLoader, ErrorState, ConfirmModal } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { RUN_LABELS } from '../../lib/constants';
import { inr, dateTime } from '../../lib/format';

function Generator({ type, icon: Icon, title, text, inputType, value, onChange, onGenerate, loading }) {
  return (
    <Card className="card-pad flex flex-col">
      <CardHeader title={title} subtitle={text} action={<Icon className="size-5 text-brand-300" />} />
      <div className="mt-auto flex items-end gap-2 pt-4">
        <Input className="flex-1" label={inputType === 'date' ? 'Any day in the week' : 'Month'} type={inputType} value={value} onChange={(e) => onChange(e.target.value)} />
        <Button loading={loading} onClick={() => onGenerate(type)} disabled={!value}><Play className="size-4" /> Generate</Button>
      </div>
    </Card>
  );
}

export default function Processing() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useProcessingQuery(undefined, { refetchOnMountOrArgChange: true });
  const [nwT, { isLoading: nwLoading }] = useRunNonWorkingMutation();
  const [genT, { isLoading: genLoading, originalArgs }] = useGenerateRunMutation();
  const runNw = useAction(nwT);
  const generate = useAction(genT);
  const [week, setWeek] = useState('');
  const [month, setMonth] = useState('');
  const [royaltyMonth, setRoyaltyMonth] = useState('');
  const [forceOpen, setForceOpen] = useState(false);

  useEffect(() => {
    if (data?.suggestions) {
      setWeek((w) => w || data.suggestions.week);
      setMonth((m) => m || data.suggestions.month);
      setRoyaltyMonth((m) => m || data.suggestions.month);
    }
  }, [data]);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const onGenerate = async (type) => {
    const period = type === 'weekly' ? week : type === 'monthly_bonus' ? month : royaltyMonth;
    const res = await generate({ type, period });
    if (res?.run) navigate(`/admin/processing/${res.run._id}`);
  };
  const busy = (t) => genLoading && originalArgs?.type === t;

  return (
    <div className="space-y-5">
      <PageHeader icon={Cog} title="Income Processing" subtitle="Generate periodic incomes, review the calculated entries, then approve to credit wallets." />

      <Card className="card-pad">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-500/20 text-brand-300"><Moon className="size-5" /></span>
          <div className="flex-1">
            <p className="font-semibold">Non-working bonus (12:00 AM run)</p>
            <p className="text-sm text-muted">
              {data.nonWorking.pending} pending · {inr(data.nonWorking.total)} · {data.nonWorking.due} due now. Credited automatically every night at 12:00 AM IST.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" loading={nwLoading} disabled={!data.nonWorking.due} onClick={() => runNw({})}>Credit due now</Button>
            <Button variant="ghost" disabled={!data.nonWorking.pending} onClick={() => setForceOpen(true)}>Credit all pending</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Generator type="weekly" icon={CalendarRange} title="Weekly income" text="Week runs Monday–Sunday (IST). 5% of qualifying same-package direct sales (sets of 3)." inputType="date"
          value={week} onChange={setWeek} onGenerate={onGenerate} loading={busy('weekly')} />
        <Generator type="monthly_bonus" icon={CalendarDays} title="Monthly bonus" text="Slab bonus on the member’s Active income credited in the month." inputType="month"
          value={month} onChange={setMonth} onGenerate={onGenerate} loading={busy('monthly_bonus')} />
        <Generator type="royalty" icon={Crown} title="Royalty income" text="Royalty % by badge (Emerald+) on the month’s panel income." inputType="month"
          value={royaltyMonth} onChange={setRoyaltyMonth} onGenerate={onGenerate} loading={busy('royalty')} />
      </div>

      <Card>
        <div className="card-pad pb-0"><CardHeader title="Processing runs" subtitle="A period can be generated once. Cancel a generated run to regenerate it." /></div>
        <DataTable
          rows={data.runs}
          onRowClick={(r) => navigate(`/admin/processing/${r._id}`)}
          columns={[
            { key: 'type', header: 'Type', render: (r) => <span className="font-semibold">{RUN_LABELS[r.type]}</span> },
            { key: 'period', header: 'Period', render: (r) => r.periodKey },
            { key: 'items', header: 'Entries', align: 'right', render: (r) => r.itemsCount },
            { key: 'total', header: 'Amount', align: 'right', render: (r) => inr(r.totalAmount) },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'by', header: 'Generated', render: (r) => <span className="text-xs text-muted">{dateTime(r.createdAt)} · {r.generatedBy?.fullName}</span> },
            { key: 'approved', header: 'Approved', render: (r) => <span className="text-xs text-muted">{r.approvedAt ? `${dateTime(r.approvedAt)} · ${r.approvedBy?.fullName}` : '—'}</span> },
          ]}
          empty={<p className="py-10 text-center text-sm text-subtle">No runs yet. Generate one above.</p>}
        />
      </Card>

      <ConfirmModal open={forceOpen} onClose={() => setForceOpen(false)} title="Credit all pending non-working bonuses now?" loading={nwLoading}
        message="This credits every pending non-working bonus immediately, including those scheduled for tonight’s 12:00 AM run."
        onConfirm={async () => (await runNw({ force: true })) && setForceOpen(false)} />
    </div>
  );
}
