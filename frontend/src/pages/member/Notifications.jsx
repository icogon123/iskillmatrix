import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, IndianRupee, Award, ShieldCheck, Banknote, Users, QrCode, Info } from 'lucide-react';
import { useNotificationsQuery, useMarkReadMutation } from '../../api/memberApi';
import { PageHeader, Card, Button, EmptyState, Pagination, PageLoader } from '../../components/ui';
import { timeAgo } from '../../lib/format';

const ICONS = { income: IndianRupee, badge: Award, kyc: ShieldCheck, withdrawal: Banknote, team: Users, payment: QrCode, wallet: IndianRupee };

export default function Notifications() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useNotificationsQuery({ page, limit: 20 });
  const [markRead, { isLoading: marking }] = useMarkReadMutation();

  if (isLoading) return <PageLoader />;
  return (
    <div>
      <PageHeader icon={Bell} title="Notifications"
        actions={data?.unread > 0 && <Button variant="outline" size="sm" loading={marking} onClick={() => markRead()}><CheckCheck className="size-4" /> Mark all read</Button>} />
      <Card>
        {data?.items.length ? (
          <ul className="divide-y divide-line/60">
            {data.items.map((n) => {
              const Icon = ICONS[n.type] || Info;
              const body = (
                <div className={`flex gap-3 px-4 py-3.5 ${n.read ? '' : 'bg-brand-500/[0.06]'}`}>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${n.read ? 'bg-white/5 text-muted' : 'bg-brand-500/20 text-brand-200'}`}><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read ? 'text-muted' : 'font-semibold text-fg'}`}>{n.title}</p>
                    {n.message && <p className="mt-0.5 text-xs text-muted">{n.message}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-subtle">{timeAgo(n.createdAt)}</span>
                </div>
              );
              return (
                <li key={n._id} onClick={() => !n.read && markRead(n._id)}>
                  {n.link ? <Link to={n.link} className="block hover:bg-white/[0.02]">{body}</Link> : body}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Bell} title="No notifications yet" message="Income credits, approvals and payouts will show up here." />
        )}
        <Pagination page={data?.page} pages={data?.pages} total={data?.total} onChange={setPage} />
      </Card>
    </div>
  );
}
