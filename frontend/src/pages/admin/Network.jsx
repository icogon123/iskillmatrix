import { useState } from 'react';
import { Network as NetworkIcon, Search } from 'lucide-react';
import { useNetworkQuery, useLazyNetworkQuery } from '../../api/adminApi';
import { PageHeader, Card, Input, Button, PageLoader, ErrorState } from '../../components/ui';
import TreeView from '../../components/common/TreeView';

export default function Network() {
  const [memberId, setMemberId] = useState('');
  const [query, setQuery] = useState({});
  const { data, isLoading, isFetching, error } = useNetworkQuery(query);
  const [load] = useLazyNetworkQuery();

  return (
    <div>
      <PageHeader icon={NetworkIcon} title="Network Tree" subtitle="Unilevel sponsor tree. Start from the company root or any member ID." />
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setQuery(memberId.trim() ? { memberId: memberId.trim() } : {}); }}>
        <Input icon={Search} placeholder="Member ID, e.g. ISM100001" value={memberId} onChange={(e) => setMemberId(e.target.value)} className="max-w-xs flex-1" />
        <Button type="submit" loading={isFetching}>Show</Button>
        {query.memberId && <Button variant="ghost" onClick={() => { setMemberId(''); setQuery({}); }}>Root</Button>}
      </form>
      {isLoading ? <PageLoader /> : error ? <ErrorState error={error} /> : (
        <Card className="card-pad overflow-x-auto">
          <TreeView key={data.node._id} root={data.node} load={(id) => load({ node: id }, true).unwrap()} onFocus={(n) => { setMemberId(n.memberId); setQuery({ memberId: n.memberId }); }} />
        </Card>
      )}
    </div>
  );
}
