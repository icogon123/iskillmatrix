import { useState } from 'react';
import { QrCode, Search, Check, X } from 'lucide-react';
import { useAdminPaymentsQuery, useApprovePaymentMutation, useRejectPaymentMutation } from '../../api/adminApi';
import { PageHeader, Card, Tabs, Input, DataTable, Pagination, Button, StatusBadge, ConfirmModal } from '../../components/ui';
import FileLink from '../../components/common/FileLink';
import { useAction } from '../../lib/useAction';
import { useDebounce } from '../../lib/useDebounce';
import { WALLET_LABELS } from '../../lib/constants';
import { inr, dateTime, date } from '../../lib/format';

export default function Payments() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data, isFetching } = useAdminPaymentsQuery({ status, page, search: q });
  const [approveT, { isLoading: a1 }] = useApprovePaymentMutation();
  const [rejectT, { isLoading: a2 }] = useRejectPaymentMutation();
  const approve = useAction(approveT);
  const reject = useAction(rejectT);
  const [modal, setModal] = useState(null);

  return (
    <div>
      <PageHeader icon={QrCode} title="Payment Verification" subtitle="Match the UTR and screenshot with your bank statement, then approve to activate the bundle and release income." />
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }}
            tabs={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' }]} />
          <Input icon={Search} placeholder="Member, payment ID or UTR" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:w-72" />
        </div>
        <DataTable
          loading={isFetching && !data}
          rows={data?.items || []}
          columns={[
            { key: 'id', header: 'Payment', render: (r) => <div><p className="font-semibold">{r.paymentId}</p><p className="text-xs text-muted">{dateTime(r.createdAt)}</p></div> },
            { key: 'member', header: 'Member', render: (r) => <div><p className="font-semibold">{r.user?.fullName}</p><p className="text-xs text-muted">{r.user?.memberId}</p></div> },
            { key: 'pkg', header: 'Bundle', render: (r) => r.package?.name },
            { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
            {
              key: 'utr', header: 'Paid with',
              render: (r) => (r.method === 'wallet'
                ? <div className="text-xs"><p className="font-semibold">{WALLET_LABELS[r.wallet] || 'Wallet'}</p><p className="text-muted">{r.paidBy && r.paidBy._id !== r.user?._id ? `by ${r.paidBy.fullName} (@${r.paidBy.username})` : 'by the member'}</p></div>
                : <div className="text-xs"><p className="font-mono">UPI · {r.utr}</p><p className="text-muted">{date(r.paymentDate)}</p></div>),
            },
            { key: 'proof', header: 'Proof', render: (r) => <FileLink name={r.proof} /> },
            { key: 'status', header: 'Status', render: (r) => <div><StatusBadge status={r.status} />{r.verifiedBy && <p className="mt-1 text-[10px] text-subtle">by {r.verifiedBy.fullName}</p>}</div> },
            status === 'pending'
              ? {
                  key: 'actions', header: '', align: 'right',
                  render: (r) => (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="success" onClick={() => setModal({ type: 'approve', p: r })}><Check className="size-3.5" /> Approve</Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setModal({ type: 'reject', p: r })}><X className="size-3.5" /> Reject</Button>
                    </div>
                  ),
                }
              : { key: 'remarks', header: 'Remarks', render: (r) => <span className="text-xs text-muted">{r.adminRemarks || '—'}</span> },
          ]}
          empty={<p className="py-10 text-center text-sm text-subtle">No payments</p>}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>

      <ConfirmModal open={modal?.type === 'approve'} onClose={() => setModal(null)} title="Approve payment & activate bundle" confirmLabel="Approve & activate" variant="success" loading={a1}
        message={modal?.p && <>Confirm you received <b className="text-fg">{inr(modal.p.amount)}</b> with UTR <b className="font-mono text-fg">{modal.p.utr}</b> from {modal.p.user?.fullName}. The {modal.p.package?.name} bundle will be activated and income distributed to the upline immediately.</>}
        reasonLabel="Remarks (optional)"
        onConfirm={async ({ reason }) => (await approve({ id: modal.p._id, remarks: reason })) && setModal(null)} />
      <ConfirmModal open={modal?.type === 'reject'} onClose={() => setModal(null)} title="Reject payment" confirmLabel="Reject" variant="danger" loading={a2}
        message="The member will be asked to submit a valid payment again." reasonLabel="Reason" requireReason reasonPlaceholder="e.g. UTR not found in bank statement"
        onConfirm={async ({ reason }) => (await reject({ id: modal.p._id, reason })) && setModal(null)} />
    </div>
  );
}
