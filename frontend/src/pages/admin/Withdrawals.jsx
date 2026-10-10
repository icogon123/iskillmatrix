import { useState } from 'react';
import { Banknote, Search } from 'lucide-react';
import { useAdminWithdrawalsQuery, useUpdateWithdrawalMutation } from '../../api/adminApi';
import { PageHeader, Card, Tabs, Input, DataTable, Pagination, Button, StatusBadge, ConfirmModal } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { useDebounce } from '../../lib/useDebounce';
import { inr, dateTime } from '../../lib/format';

const NEXT = {
  pending: [['approved', 'Approve', 'success'], ['rejected', 'Reject', 'danger']],
  approved: [['processing', 'Processing', 'outline'], ['paid', 'Mark paid', 'success'], ['rejected', 'Reject', 'danger']],
  processing: [['paid', 'Mark paid', 'success'], ['rejected', 'Reject', 'danger']],
};

export default function Withdrawals() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data, isFetching } = useAdminWithdrawalsQuery({ status, page, search: q });
  const [updateT, { isLoading }] = useUpdateWithdrawalMutation();
  const update = useAction(updateT);
  const [modal, setModal] = useState(null); // { w, to }

  return (
    <div>
      <PageHeader icon={Banknote} title="Withdrawals" subtitle="Approve, pay and record the bank reference. Rejected amounts are returned to the member’s wallet." />
      <Card>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }}
            tabs={['open', 'pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled', 'all'].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))} />
          <Input icon={Search} placeholder="Search member" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="lg:w-64" />
        </div>
        {data?.totals && (
          <p className="px-4 pb-2 text-xs text-muted">Total requested {inr(data.totals.amount)} · Net payable {inr(data.totals.net)}</p>
        )}
        <DataTable
          loading={isFetching && !data}
          rows={data?.items || []}
          columns={[
            { key: 'id', header: 'Withdrawal', render: (r) => <div><p className="font-semibold">{r.withdrawalId}</p><p className="text-xs text-muted">{dateTime(r.createdAt)}</p></div> },
            { key: 'member', header: 'Member', render: (r) => <div><p className="font-semibold">{r.user?.fullName}</p><p className="text-xs text-muted">{r.user?.memberId}</p>{r.user?.walletSuspended && <StatusBadge status="suspended" label="Wallet suspended" className="mt-1" />}</div> },
            { key: 'amount', header: 'Amount', render: (r) => <div className="text-xs"><p className="text-sm font-semibold">{inr(r.amount)}</p><p className="text-muted">TDS {inr(r.tds)} · Admin {inr(r.adminCharge)}</p></div> },
            { key: 'net', header: 'Net payable', render: (r) => <span className="font-bold text-gold-400">{inr(r.netAmount)}</span> },
            { key: 'bank', header: 'Bank', render: (r) => <div className="text-xs"><p>{r.bank?.accountHolder}</p><p className="font-mono text-muted">{r.bank?.accountNumber}</p><p className="text-muted">{r.bank?.bankName} · {r.bank?.ifsc}</p></div> },
            { key: 'status', header: 'Status', render: (r) => <div><StatusBadge status={r.status} />{r.paymentReference && <p className="mt-1 font-mono text-[10px] text-subtle">{r.paymentReference}</p>}</div> },
            {
              key: 'actions', header: '', align: 'right',
              render: (r) => (
                <div className="flex justify-end gap-1.5">
                  {(NEXT[r.status] || []).filter(([to]) => !r.user?.walletSuspended || to === 'rejected').map(([to, label, variant]) => (
                    <Button key={to} size="sm" variant={variant} onClick={() => setModal({ w: r, to })}>{label}</Button>
                  ))}
                </div>
              ),
            },
          ]}
          empty={<p className="py-10 text-center text-sm text-subtle">No withdrawals</p>}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>

      <ConfirmModal
        open={Boolean(modal)} onClose={() => setModal(null)} loading={isLoading}
        title={modal && { approved: 'Approve withdrawal', processing: 'Mark as processing', paid: 'Mark as paid', rejected: 'Reject withdrawal' }[modal.to]}
        variant={modal?.to === 'rejected' ? 'danger' : 'success'} confirmLabel="Confirm"
        message={modal && <>{modal.w.withdrawalId} · {modal.w.user?.fullName} · net <b className="text-fg">{inr(modal.w.netAmount)}</b> to {modal.w.bank?.bankName} A/C {modal.w.bank?.accountNumber}.{modal.to === 'rejected' && ' The full amount will be returned to the member’s wallet.'}</>}
        inputLabel={modal?.to === 'paid' ? 'Payment reference (UTR / NEFT / IMPS)' : undefined} requireInput={modal?.to === 'paid'}
        reasonLabel={modal?.to === 'rejected' ? 'Reason' : 'Remarks (optional)'} requireReason={modal?.to === 'rejected'}
        onConfirm={async ({ reason, input }) => (await update({ id: modal.w._id, status: modal.to, remarks: reason || undefined, paymentReference: input || undefined })) && setModal(null)} />
    </div>
  );
}
