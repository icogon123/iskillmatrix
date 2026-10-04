import { useState } from 'react';
import { IndianRupee } from 'lucide-react';
import { useIncomeSummaryQuery, useLedgerQuery } from '../../api/memberApi';
import { PageHeader, Card, CardHeader, Tabs, PageLoader, ErrorState } from '../../components/ui';
import Money from '../../components/common/Money';
import IncomeBreakdown from '../../components/common/IncomeBreakdown';
import { INCOME_TYPES } from '../../lib/constants';
import LedgerTable from './LedgerTable';

export default function Income() {
  const { data, isLoading, error, refetch } = useIncomeSummaryQuery();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const { data: ledger, isFetching } = useLedgerQuery({ scope: 'income', category, page, limit: 20 });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader icon={IndianRupee} title="My Income" subtitle="Every income credit with its source, level and status." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-pad">
          <CardHeader title="Lifetime income" />
          <div className="mt-3"><IncomeBreakdown income={data.lifetime} pending={data.lifetime.pending} /></div>
        </Card>
        <div className="grid grid-cols-2 gap-3 self-start lg:col-span-2 lg:grid-cols-3">
          {INCOME_TYPES.map((t) => (
            <button key={t.key} type="button" onClick={() => { setCategory(category === t.key ? '' : t.key); setPage(1); }}
              className={`card card-pad text-left transition hover:border-brand-500/40 ${category === t.key ? 'border-brand-500/60 ring-1 ring-brand-500/40' : ''}`}>
              <span className="flex items-center gap-2 text-xs font-medium text-muted">
                <span className="size-2 rounded-full" style={{ background: t.color }} />{t.label}
              </span>
              <p className="mt-2 text-lg font-bold"><Money value={data.lifetime[t.key]} /></p>
              <p className="mt-0.5 text-[11px] text-subtle">This month <Money value={data.thisMonth[t.key]} /></p>
            </button>
          ))}
        </div>
      </div>

      <Card className="mt-5">
        <div className="p-4">
          <Tabs value={category} onChange={(v) => { setCategory(v); setPage(1); }}
            tabs={[{ value: '', label: 'All income' }, ...INCOME_TYPES.map((t) => ({ value: t.key, label: t.short }))]} />
        </div>
        <LedgerTable data={ledger} loading={isFetching && !ledger} onPage={setPage} showDirection={false} />
      </Card>
    </div>
  );
}
