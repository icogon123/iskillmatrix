import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useRunDetailQuery, useApproveRunMutation, useCancelRunMutation } from '../../api/adminApi';
import { PageHeader, Card, Button, DataTable, StatusBadge, PageLoader, ErrorState, ConfirmModal, StatCard, Notice } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { RUN_LABELS } from '../../lib/constants';
import { inr, dateTime } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';

export default function RunDetail() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useRunDetailQuery(id);
  const [approveT, { isLoading: a1 }] = useApproveRunMutation();
  const [cancelT, { isLoading: a2 }] = useCancelRunMutation();
  const approve = useAction(approveT);
  const cancel = useAction(cancelT);
  const [modal, setModal] = useState(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { run, entries } = data;
  const payable = entries.filter((e) => e.status !== 'lapsed');
  const lapsed = entries.filter((e) => e.status === 'lapsed');
  const pool = run.type === 'weekly' && run.pool?.percent !== undefined ? run.pool : null;
  const by = (u) => u?.fullName || (run.trigger === 'auto' ? 'the system (automatic)' : '—');

  const exportCsv = () => downloadCsv(`${run.type}-${run.periodKey}`, [
    { key: 'memberId', label: 'Member ID' }, { key: 'name', label: 'Name' }, { key: 'basis', label: 'Basis' }, { key: 'rate', label: 'Rate %' },
    { key: 'amount', label: 'Amount' }, { key: 'status', label: 'Status' }, { key: 'remarks', label: 'Remarks' },
  ], entries.map((e) => ({ memberId: e.user?.memberId, name: e.user?.fullName, basis: e.basisAmount, rate: e.rate, amount: e.netAmount, status: e.status, remarks: e.remarks })));

  return (
    <div className="space-y-5">
      <Link to="/admin/processing" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Income processing</Link>
      <PageHeader title={`${RUN_LABELS[run.type]} · ${run.periodKey}`} subtitle={`Generated ${dateTime(run.createdAt)} by ${by(run.generatedBy)} (settings v${run.settingsVersion})`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!entries.length}>Export CSV</Button>
            {run.status === 'generated' && (
              <>
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => setModal('cancel')}><XCircle className="size-4" /> Cancel run</Button>
                <Button variant="success" size="sm" onClick={() => setModal('approve')} disabled={!payable.length}><CheckCircle2 className="size-4" /> Approve & credit</Button>
              </>
            )}
          </>
        } />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Status" value={<StatusBadge status={run.status} />} />
        <StatCard label="Payable entries" value={payable.length} />
        <StatCard label="Total amount" value={inr(run.totalAmount)} tone="gold" />
        <StatCard label="Lapsed (inactive members)" value={lapsed.length} hint={inr(lapsed.reduce((a, e) => a + e.netAmount, 0))} tone="red" />
      </div>
      {pool && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Company sales in the week" value={inr(pool.companyIncome)} hint={`${pool.salesCount} bundle${pool.salesCount === 1 ? '' : 's'} · ${pool.basis === 'net' ? 'after GST & system cost' : 'amount received'}`} tone="blue" />
          <StatCard label={`Pool (${pool.percent}%)`} value={inr(pool.amount)} tone="gold" />
          <StatCard label="Eligible members" value={pool.eligible} tone="green" />
          <StatCard label="Equal share each" value={inr(pool.share)} hint={pool.eligible ? `Remainder ${inr(pool.amount - pool.share * pool.eligible)} stays with the company` : 'Pool stays with the company'} />
        </div>
      )}
      {run.status === 'approved' && <Notice tone="green" icon={CheckCircle2} title={`Approved ${dateTime(run.approvedAt)} by ${by(run.approvedBy)}`}>All payable entries were credited to member wallets.</Notice>}
      {run.status === 'cancelled' && <Notice tone="red" icon={XCircle} title="This run was cancelled">You can generate this period again.</Notice>}
      <Card>
        <DataTable rows={entries}
          columns={[
            { key: 'member', header: 'Member', render: (r) => <div><p className="font-semibold">{r.user?.fullName}</p><p className="text-xs text-muted">{r.user?.memberId}</p></div> },
            { key: 'pkg', header: 'Bundle', render: (r) => r.package?.name || '—' },
            { key: 'basis', header: 'Basis', align: 'right', render: (r) => inr(r.basisAmount) },
            { key: 'rate', header: 'Rate', align: 'right', render: (r) => (r.rate ? `${r.rate}%` : 'Slab') },
            { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-bold">{inr(r.netAmount)}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'remarks', header: 'Calculation', render: (r) => <span className="text-xs text-muted">{r.remarks}</span> },
          ]}
          empty={<p className="py-10 text-center text-sm text-subtle">No member qualified in this period.</p>} />
      </Card>

      <ConfirmModal open={modal === 'approve'} onClose={() => setModal(null)} title="Approve and credit?" variant="success" confirmLabel="Approve & credit" loading={a1}
        message={`${payable.length} entries totalling ${inr(run.totalAmount)} will be credited to member wallets. This cannot be undone.`}
        onConfirm={async () => (await approve(run._id)) && setModal(null)} />
      <ConfirmModal open={modal === 'cancel'} onClose={() => setModal(null)} title="Cancel this run?" variant="danger" confirmLabel="Cancel run" loading={a2}
        message="The calculated entries will be discarded and you can generate this period again."
        onConfirm={async () => (await cancel(run._id)) && setModal(null)} />
    </div>
  );
}
