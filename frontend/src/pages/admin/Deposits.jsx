import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, Search, Check, X } from 'lucide-react';
import { useAdminDepositsQuery, useApproveDepositMutation, useRejectDepositMutation } from '../../api/adminApi';
import { PageHeader, Card, Tabs, Input, DataTable, Pagination, Button, StatusBadge, ConfirmModal } from '../../components/ui';
import FileLink from '../../components/common/FileLink';
import { useAction } from '../../lib/useAction';
import { useDebounce } from '../../lib/useDebounce';
import { inr, dateTime, date } from '../../lib/format';

export default function Deposits() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data, isFetching } = useAdminDepositsQuery({ status, page, search: q });
  const [approveT, { isLoading: a1 }] = useApproveDepositMutation();
  const [rejectT, { isLoading: a2 }] = useRejectDepositMutation();
  const approve = useAction(approveT);
  const reject = useAction(rejectT);
  const [modal, setModal] = useState(null);

  return (
    <div>
      <PageHeader icon={HandCoins} title="Fund Deposits"
        subtitle="Members' wallet deposits by UPI. Match the UTR and screenshot with your bank statement; approval credits the member's Activation Wallet." />
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }}
            tabs={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' }]} />
          <Input icon={Search} placeholder="Member, deposit ID or UTR" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:w-72" />
        </div>
        {data?.totals && <p className="px-4 pb-2 text-xs text-muted">Total of matching deposits: {inr(data.totals.amount)}</p>}
        <DataTable
          loading={isFetching && !data}
          rows={data?.items || []}
          columns={[
            { key: 'id', header: 'Deposit', render: (r) => <div><p className="font-semibold">{r.depositId}</p><p className="text-xs text-muted">{dateTime(r.createdAt)}</p></div> },
            {
              key: 'member', header: 'Member',
              render: (r) => <Link to={`/admin/members/${r.user?._id}`} className="block"><p className="font-semibold hover:text-brand-300">{r.user?.fullName}</p><p className="text-xs text-muted">{r.user?.memberId}</p></Link>,
            },
            { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
            { key: 'utr', header: 'UTR / Paid on', render: (r) => <div className="text-xs"><p className="font-mono">{r.utr}</p><p className="text-muted">{date(r.paymentDate)}</p></div> },
            { key: 'proof', header: 'Proof', render: (r) => <FileLink name={r.proof} /> },
            { key: 'status', header: 'Status', render: (r) => <div><StatusBadge status={r.status} />{r.verifiedBy && <p className="mt-1 text-[10px] text-subtle">by {r.verifiedBy.fullName}</p>}</div> },
            status === 'pending'
              ? {
                  key: 'actions', header: '', align: 'right',
                  render: (r) => (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="success" onClick={() => setModal({ type: 'approve', d: r })}><Check className="size-3.5" /> Approve</Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setModal({ type: 'reject', d: r })}><X className="size-3.5" /> Reject</Button>
                    </div>
                  ),
                }
              : { key: 'remarks', header: 'Remarks', render: (r) => <span className="text-xs text-muted">{r.adminRemarks || '—'}</span> },
          ]}
          empty={<p className="py-10 text-center text-sm text-subtle">No deposits</p>}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>

      <ConfirmModal open={modal?.type === 'approve'} onClose={() => setModal(null)} title="Approve deposit" confirmLabel="Approve & credit" variant="success" loading={a1}
        message={modal?.d && <>Confirm you received <b className="text-fg">{inr(modal.d.amount)}</b> with UTR <b className="font-mono text-fg">{modal.d.utr}</b> from {modal.d.user?.fullName}. The amount is credited to their Activation Wallet at once (it can buy bundles but cannot be withdrawn).</>}
        reasonLabel="Remarks (optional)"
        onConfirm={async ({ reason }) => (await approve({ id: modal.d._id, remarks: reason })) && setModal(null)} />
      <ConfirmModal open={modal?.type === 'reject'} onClose={() => setModal(null)} title="Reject deposit" confirmLabel="Reject" variant="danger" loading={a2}
        message="The member is notified with your reason. Nothing is credited." reasonLabel="Reason" requireReason reasonPlaceholder="e.g. UTR not found in bank statement"
        onConfirm={async ({ reason }) => (await reject({ id: modal.d._id, reason })) && setModal(null)} />
    </div>
  );
}
