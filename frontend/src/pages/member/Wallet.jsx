import { useState } from 'react';
import { Wallet as WalletIcon, Banknote, Clock, CheckCircle2 } from 'lucide-react';
import { useWalletQuery, useLedgerQuery } from '../../api/memberApi';
import { PageHeader, Card, StatCard, Tabs, Button, PageLoader, ErrorState } from '../../components/ui';
import Money from '../../components/common/Money';
import LedgerTable from './LedgerTable';

export default function Wallet() {
  const { data, isLoading, error, refetch } = useWalletQuery();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const { data: ledger, isFetching } = useLedgerQuery({ category, page, limit: 20 });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      <PageHeader icon={WalletIcon} title="Wallet" subtitle="Your balance is calculated from your transaction ledger." actions={<Button to="/app/withdraw" variant="gold"><Banknote className="size-4" /> Withdraw</Button>} />
      <div className="hero-gradient mb-4 rounded-3xl p-6 shadow-glow">
        <p className="text-sm text-brand-100/85">Available balance</p>
        <p className="mt-1 text-4xl font-extrabold text-white"><Money value={data.balance} /></p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Pending withdrawal" value={<Money value={data.pendingWithdrawal} />} icon={Clock} tone="blue" />
        <StatCard label="Total withdrawn (gross)" value={<Money value={data.totalWithdrawn} />} hint={<>Net received <Money value={data.totalWithdrawnNet} /></>} icon={CheckCircle2} tone="green" />
      </div>
      <Card className="mt-5">
        <div className="p-4">
          <Tabs value={category} onChange={(v) => { setCategory(v); setPage(1); }}
            tabs={[
              { value: '', label: 'All transactions' }, { value: 'withdrawal', label: 'Withdrawals' }, { value: 'withdrawal_reversal', label: 'Reversals' },
              { value: 'adjustment_credit', label: 'Admin credits' }, { value: 'adjustment_debit', label: 'Admin debits' },
            ]} />
        </div>
        <LedgerTable data={ledger} loading={isFetching && !ledger} onPage={setPage} />
      </Card>
    </div>
  );
}
