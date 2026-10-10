import { useState } from 'react';
import {
  Wallet as WalletIcon, Banknote, Clock, CheckCircle2, Lock, HandCoins, ArrowLeftRight, UserPlus, Search, Download, Printer, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWalletQuery, useStatementQuery, useLazyStatementQuery } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import {
  PageHeader, Card, CardHeader, StatCard, Button, PageLoader, ErrorState, Notice, Select, Input, DataTable, Pagination,
} from '../../components/ui';
import Money from '../../components/common/Money';
import { LEDGER_LABELS, INCOME_TYPES, WALLETS, WALLET_LABELS } from '../../lib/constants';
import { dateTime, todayKey } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';

const COLORS = Object.fromEntries(INCOME_TYPES.map((t) => [t.key, t.color]));
const LIMIT = 20;
const EMPTY = { wallet: 'main', from: '', to: '' };
const signed = (r) => (r.direction === 'credit' ? r.netAmount : -r.netAmount);

/** "Transfer Sent · @username" style label naming the other member (not for moves between your own wallets). */
function typeLabel(r) {
  const base = LEDGER_LABELS[r.category] || r.category;
  const other = r.counterparty;
  return !other || other._id === r.user ? base : `${base} · @${other.username}`;
}

function WalletCard({ title, balance, note, tone, actions }) {
  return (
    <div className={tone === 'main' ? 'hero-gradient rounded-3xl p-5 shadow-glow sm:p-6' : 'card rounded-3xl border-gold-400/40 p-5 sm:p-6'}>
      <p className={`text-sm font-medium ${tone === 'main' ? 'text-white/80' : 'text-muted'}`}>{title}</p>
      <p className={`mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl ${tone === 'main' ? 'text-white' : 'text-gold-400'}`}><Money value={balance} /></p>
      <p className={`mt-1 text-xs ${tone === 'main' ? 'text-white/70' : 'text-subtle'}`}>{note}</p>
      <div className="mt-4 flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export default function Wallet() {
  const { data, isLoading, error, refetch } = useWalletQuery();
  const [draft, setDraft] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const { data: st, isFetching } = useStatementQuery({ ...filters, page, limit: LIMIT });
  const [fetchAll, { isFetching: exporting }] = useLazyStatementQuery();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const apply = (e) => {
    e.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) return toast.error('“From” date must be before “To” date');
    setFilters(draft);
    setPage(1);
  };
  const reset = () => { setDraft(EMPTY); setFilters(EMPTY); setPage(1); };

  const exportCsv = async () => {
    try {
      const all = await fetchAll({ ...filters, all: 1 }).unwrap();
      downloadCsv(`${filters.wallet}-wallet-statement-${todayKey()}`, [
        { key: 'sno', label: 'S.No.' }, { key: 'date', label: 'Date' }, { key: 'type', label: 'Transaction Type' }, { key: 'pre', label: 'Pre Wallet' },
        { key: 'amount', label: 'Amount' }, { key: 'post', label: 'After Wallet' }, { key: 'remarks', label: 'Remark' }, { key: 'txnId', label: 'Txn ID' },
      ], all.items.map((r, i) => ({
        sno: i + 1, date: dateTime(r.completedAt || r.createdAt), type: typeLabel(r), pre: r.balanceBefore, amount: signed(r), post: r.balanceAfter,
        remarks: r.remarks || '', txnId: r.txnId,
      })));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const suspended = Boolean(data.suspended);

  return (
    <div>
      <PageHeader icon={WalletIcon} title="Wallets & Ledger" subtitle="Two wallets, each with its own statement. Balances are calculated from your transaction ledger."
        actions={!suspended && (
          <>
            <Button to="/app/deposit" variant="outline"><HandCoins className="size-4" /> Deposit</Button>
            <Button to="/app/transfer" variant="outline"><ArrowLeftRight className="size-4" /> Transfer</Button>
          </>
        )} />

      {suspended && (
        <Notice tone="red" icon={Lock} title="Your wallet is suspended" className="mb-4">
          {data.suspended.reason ? `Reason: ${data.suspended.reason}. ` : ''}Your income is still credited here, but withdrawals, transfers and wallet payments are on hold until the admin reactivates your wallet. Please contact support.
        </Notice>
      )}

      <div className="no-print grid gap-4 md:grid-cols-2">
        <WalletCard tone="main" title="Main Wallet" balance={data.balance} note="All income lands here. Withdraw it, transfer it, or buy a bundle for yourself or a member."
          actions={!suspended && (
            <>
              <Button to="/app/withdraw" size="sm" variant="gold"><Banknote className="size-3.5" /> Withdraw</Button>
              <Button to="/app/transfer" size="sm" variant="onBrand" className="bg-white/10"><ArrowLeftRight className="size-3.5" /> Transfer</Button>
            </>
          )} />
        <WalletCard tone="activation" title="Activation Wallet" balance={data.activationBalance}
          note="Deposits and transfers you receive. Not withdrawable — use it to activate a course bundle for yourself or another member."
          actions={!suspended && (
            <>
              <Button to="/app/deposit" size="sm" variant="outline"><HandCoins className="size-3.5" /> Deposit</Button>
              <Button to="/app/p2p" size="sm" variant="outline"><UserPlus className="size-3.5" /> Activate a member</Button>
            </>
          )} />
      </div>
      <div className="no-print mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Pending withdrawal" value={<Money value={data.pendingWithdrawal} />} icon={Clock} tone="blue" />
        <StatCard label="Total withdrawn (gross)" value={<Money value={data.totalWithdrawn} />} hint={<>Net received <Money value={data.totalWithdrawnNet} /></>} icon={CheckCircle2} tone="green" />
      </div>

      <Card className="no-print card-pad mt-5">
        <CardHeader title="Transaction filter" action={<Search className="size-5 text-brand-300" />} />
        <form onSubmit={apply} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Select label="Wallet type" value={draft.wallet} onChange={(e) => setDraft((d) => ({ ...d, wallet: e.target.value }))}
            options={WALLETS.map((w) => ({ value: w.value, label: w.label }))} />
          <Input label="From" type="date" value={draft.from} max={draft.to || todayKey()} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          <Input label="To" type="date" value={draft.to} min={draft.from || undefined} max={todayKey()} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          <div className="flex gap-2">
            <Button type="submit" variant="gold" className="flex-1">Get detail</Button>
            <Button variant="ghost" onClick={reset} title="Reset filters" aria-label="Reset filters"><RotateCcw className="size-4" /></Button>
          </div>
        </form>
      </Card>

      <Card className="mt-5">
        <div className="card-pad flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title={`${WALLET_LABELS[filters.wallet]} · transaction detail`}
            subtitle={filters.from || filters.to ? `${filters.from || 'Start'} to ${filters.to || 'today'}` : 'All dates'} />
          <div className="no-print flex gap-2">
            <Button size="sm" variant="outline" loading={exporting} disabled={!st?.total} onClick={exportCsv}><Download className="size-3.5" /> CSV / Excel</Button>
            <Button size="sm" variant="outline" disabled={!st?.total} onClick={() => window.print()}><Printer className="size-3.5" /> Print / PDF</Button>
          </div>
        </div>
        <DataTable
          dense
          loading={isFetching && !st}
          rows={(st?.items || []).map((r, i) => ({ ...r, sno: (st.page - 1) * st.limit + i + 1 }))}
          empty={<p className="px-4 py-10 text-center text-sm text-subtle">No transactions in this wallet{filters.from || filters.to ? ' for these dates' : ' yet'}</p>}
          columns={[
            { key: 'sno', header: 'S.No.', render: (r) => <span className="text-xs text-muted">{r.sno}</span> },
            {
              key: 'type', header: 'Transaction type',
              render: (r) => (
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {COLORS[r.category] && <span className="size-2 rounded-full" style={{ background: COLORS[r.category] }} />}
                  {typeLabel(r)}
                  {r.level ? <span className="text-xs text-subtle">L{r.level}</span> : null}
                </span>
              ),
            },
            { key: 'pre', header: 'Pre wallet', align: 'right', render: (r) => <Money value={r.balanceBefore} className="whitespace-nowrap text-muted" /> },
            {
              key: 'amount', header: 'Amount', align: 'right',
              render: (r) => (
                <span className={`font-semibold whitespace-nowrap ${r.direction === 'credit' ? 'text-success' : 'text-danger'}`}>
                  {r.direction === 'credit' ? '+' : '−'}<Money value={r.netAmount} />
                </span>
              ),
            },
            { key: 'post', header: 'After wallet', align: 'right', render: (r) => <Money value={r.balanceAfter} className="font-semibold whitespace-nowrap" /> },
            {
              key: 'remark', header: 'Remark',
              render: (r) => (
                <div className="max-w-xs">
                  <p className="truncate text-xs text-muted" title={r.remarks}>{r.remarks || '—'}</p>
                  <p className="text-[10px] text-subtle">{r.txnId}</p>
                </div>
              ),
            },
            { key: 'date', header: 'Date', render: (r) => <span className="text-xs whitespace-nowrap text-muted">{dateTime(r.completedAt || r.createdAt)}</span> },
          ]}
        />
        <div className="no-print"><Pagination page={st?.page} pages={st?.pages} total={st?.total} onChange={setPage} /></div>
      </Card>
    </div>
  );
}
