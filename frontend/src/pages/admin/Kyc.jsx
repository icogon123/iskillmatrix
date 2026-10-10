import { useState } from 'react';
import { ShieldCheck, Search, CheckCircle2, TriangleAlert } from 'lucide-react';
import { useAdminKycQuery, useReviewKycMutation } from '../../api/adminApi';
import { PageHeader, Card, Tabs, Input, DataTable, Pagination, Button, StatusBadge, Modal, KeyValue, Textarea, Notice } from '../../components/ui';
import FileLink from '../../components/common/FileLink';
import { useAction } from '../../lib/useAction';
import { useDebounce } from '../../lib/useDebounce';
import { dateTime } from '../../lib/format';

const spaced = (v) => String(v || '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');

/** Match / Mismatch flag for the Aadhaar in the KYC against the one given at registration. */
function AadhaarFlag({ match }) {
  if (match === null || match === undefined) return <StatusBadge status="not_submitted" label="Not on registration" className="whitespace-nowrap" />;
  return match
    ? <StatusBadge status="approved" label="Aadhaar matches" className="whitespace-nowrap" />
    : <StatusBadge status="rejected" label="Aadhaar mismatch" className="whitespace-nowrap" />;
}

export default function AdminKyc() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const { data, isFetching } = useAdminKycQuery({ status, page, search: q });
  const [reviewT, { isLoading }] = useReviewKycMutation();
  const review = useAction(reviewT);
  const [open, setOpen] = useState(null);
  const [reason, setReason] = useState('');

  const act = async (action) => {
    if (await review({ id: open._id, action, reason })) {
      setOpen(null);
      setReason('');
    }
  };

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="KYC Approvals" subtitle="Verify Aadhaar, PAN and bank details. Rejections require a reason." />
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={status} onChange={(v) => { setStatus(v); setPage(1); }}
            tabs={[{ value: 'pending', label: 'To review' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }, { value: 'all', label: 'All' }]} />
          <Input icon={Search} placeholder="Search member" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:w-64" />
        </div>
        <DataTable
          loading={isFetching && !data}
          rows={data?.items || []}
          onRowClick={setOpen}
          columns={[
            { key: 'member', header: 'Member', render: (r) => <div><p className="font-semibold">{r.user?.fullName}</p><p className="text-xs text-muted">{r.user?.memberId}</p></div> },
            { key: 'aadhaar', header: 'Aadhaar check', render: (r) => <AadhaarFlag match={r.aadhaarMatch} /> },
            { key: 'pan', header: 'PAN', render: (r) => r.panNumber },
            { key: 'bank', header: 'Bank', render: (r) => <div className="text-xs"><p>{r.bankName}</p><p className="text-muted">{r.ifsc}</p></div> },
            { key: 'holder', header: 'Account holder', render: (r) => r.accountHolder },
            { key: 'submitted', header: 'Submitted', render: (r) => <span className="text-xs">{dateTime(r.submittedAt)}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'open', header: '', align: 'right', render: () => <span className="text-xs font-semibold text-brand-300">Review →</span> },
          ]}
          empty={<p className="py-10 text-center text-sm text-subtle">No KYC records</p>}
        />
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>

      <Modal open={Boolean(open)} onClose={() => { setOpen(null); setReason(''); }} size="lg" title={`KYC · ${open?.user?.fullName || ''}`} subtitle={open?.user?.memberId}
        footer={open && ['submitted', 'under_review'].includes(open.status) && (
          <>
            {open.status === 'submitted' && <Button variant="outline" loading={isLoading} onClick={() => act('review')}>Mark under review</Button>}
            <Button variant="danger" loading={isLoading} disabled={!reason.trim()} onClick={() => act('reject')}>Reject</Button>
            <Button variant="success" loading={isLoading} onClick={() => act('approve')}>Approve</Button>
          </>
        )}>
        {open && (
          <div className="space-y-5">
            <div className={`rounded-xl border p-3 ${open.aadhaarMatch === false ? 'border-danger/40 bg-danger/5' : open.aadhaarMatch ? 'border-success/40 bg-success/5' : 'border-line'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Aadhaar check</p>
                <AadhaarFlag match={open.aadhaarMatch} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-subtle uppercase">Given at registration</p>
                  <p className="mt-0.5 font-mono text-sm">{open.registrationAadhaar ? spaced(open.registrationAadhaar) : '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-subtle uppercase">Submitted in KYC</p>
                  <p className={`mt-0.5 font-mono text-sm ${open.aadhaarMatch === false ? 'text-danger' : ''}`}>{spaced(open.aadhaarNumber)}</p>
                </div>
              </div>
            </div>
            {open.aadhaarMatch === false && ['submitted', 'under_review'].includes(open.status) && (
              <Notice tone="red" icon={TriangleAlert} title="The Aadhaar numbers do not match">
                Check the Aadhaar document carefully. You can still approve, but rejecting with a reason lets the member re-submit the correct number.
              </Notice>
            )}
            {open.aadhaarMatch && ['submitted', 'under_review'].includes(open.status) && (
              <p className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="size-4" /> Aadhaar number matches the registration. Still check the document image.</p>
            )}
            <KeyValue items={[
              ['Name on account', open.accountHolder], ['Member name', open.user?.fullName], ['Aadhaar number', open.aadhaarNumber], ['PAN', open.panNumber],
              ['Bank', open.bankName], ['Account number', open.accountNumber], ['IFSC', open.ifsc], ['Status', <StatusBadge status={open.status} />],
              open.rejectionReason && ['Rejection reason', open.rejectionReason], open.reviewedBy && ['Reviewed by', `${open.reviewedBy.fullName} · ${dateTime(open.reviewedAt)}`],
            ]} />
            <div className="grid gap-3 sm:grid-cols-3">
              {[['Aadhaar', open.aadhaarDoc], ['PAN', open.panDoc], ['Bank proof', open.bankDoc]].map(([l, f]) => (
                <div key={l} className="rounded-xl border border-line p-3">
                  <p className="mb-2 text-xs text-muted">{l}</p>
                  {f && !f.endsWith('.pdf') ? (
                    <a href={`/api/files/${f}`} target="_blank" rel="noreferrer"><img src={`/api/files/${f}`} alt={l} className="h-28 w-full rounded-lg bg-white object-contain" /></a>
                  ) : <FileLink name={f} label="Open document" />}
                </div>
              ))}
            </div>
            {['submitted', 'under_review'].includes(open.status) && (
              <Textarea label="Rejection reason (required to reject)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. PAN image is not readable" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
