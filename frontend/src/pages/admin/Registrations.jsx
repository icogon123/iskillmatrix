import { useState } from 'react';
import { UserPlus, Check, X, Search } from 'lucide-react';
import { useRegistrationsQuery, useApproveRegistrationMutation, useRejectRegistrationMutation } from '../../api/adminApi';
import { PageHeader, Card, Tabs, Input, DataTable, Pagination, Button, ConfirmModal, StatusBadge } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { useDebounce } from '../../lib/useDebounce';
import { dateTime, date } from '../../lib/format';

export default function Registrations() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data, isFetching } = useRegistrationsQuery({ status, page, search: q });
  const [approveTrigger, { isLoading: approving }] = useApproveRegistrationMutation();
  const [rejectTrigger, { isLoading: rejecting }] = useRejectRegistrationMutation();
  const approve = useAction(approveTrigger);
  const reject = useAction(rejectTrigger);
  const [modal, setModal] = useState(null); // { type, user }

  return (
    <div>
      <PageHeader icon={UserPlus} title="Registrations" subtitle="Approve new members before they can log in." />
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }]} />
          <Input icon={Search} placeholder="Search name, ID, mobile, email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:w-72" />
        </div>
        <DataTable
          loading={isFetching && !data}
          rows={data?.items || []}
          columns={[
            { key: 'member', header: 'Applicant', render: (r) => <div><p className="font-semibold">{r.fullName}</p><p className="text-xs text-muted">{r.memberId} · @{r.username}</p></div> },
            { key: 'contact', header: 'Contact', render: (r) => <div className="text-xs"><p>{r.mobile}</p><p className="text-muted">{r.email}</p></div> },
            { key: 'dob', header: 'DOB / Country', render: (r) => <div className="text-xs"><p>{date(r.dob)}</p><p className="text-muted">{r.country}</p></div> },
            { key: 'sponsor', header: 'Sponsor', render: (r) => <div className="text-xs"><p className="font-semibold">{r.sponsor?.memberId}</p><p className="text-muted">{r.sponsor?.fullName}</p></div> },
            { key: 'package', header: 'Bundle', render: (r) => r.selectedPackage?.name },
            { key: 'createdAt', header: 'Submitted', render: (r) => <span className="text-xs">{dateTime(r.createdAt)}</span> },
            status === 'rejected'
              ? { key: 'reason', header: 'Reason', render: (r) => <span className="text-xs text-danger">{r.statusReason}</span> }
              : {
                  key: 'actions', header: '', align: 'right',
                  render: (r) => (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="success" onClick={() => setModal({ type: 'approve', user: r })}><Check className="size-3.5" /> Approve</Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setModal({ type: 'reject', user: r })}><X className="size-3.5" /> Reject</Button>
                    </div>
                  ),
                },
          ]}
          empty={<p className="py-10 text-center text-sm text-subtle">{status === 'pending' ? 'No registrations waiting for approval' : 'No rejected registrations'}</p>}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>

      <ConfirmModal
        open={modal?.type === 'approve'} onClose={() => setModal(null)} title="Approve registration?" confirmLabel="Approve" variant="success" loading={approving}
        message={modal?.user && <>Activate <b className="text-fg">{modal.user.fullName}</b> ({modal.user.memberId}) under sponsor {modal.user.sponsor?.memberId}? They will be able to log in immediately.</>}
        onConfirm={async () => (await approve(modal.user._id)) && setModal(null)} />
      <ConfirmModal
        open={modal?.type === 'reject'} onClose={() => setModal(null)} title="Reject registration" confirmLabel="Reject" variant="danger" loading={rejecting}
        message={modal?.user && <>The account for <b className="text-fg">{modal.user.fullName}</b> will stay inactive.</>}
        reasonLabel="Reason for rejection" requireReason reasonPlaceholder="e.g. Aadhaar number does not match the name"
        onConfirm={async ({ reason }) => (await reject({ id: modal.user._id, reason })) && setModal(null)} />
      {status === 'rejected' && data?.items?.length > 0 && <p className="mt-3 text-xs text-subtle">Rejected registrations stay inactive with the reason stored. <StatusBadge status="rejected" /></p>}
    </div>
  );
}
