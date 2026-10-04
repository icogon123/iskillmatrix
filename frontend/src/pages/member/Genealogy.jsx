import { useState } from 'react';
import { Network, ArrowLeft } from 'lucide-react';
import { useTreeNodeQuery, useLazyTreeNodeQuery } from '../../api/memberApi';
import { PageHeader, Card, Button, PageLoader, ErrorState } from '../../components/ui';
import TreeView from '../../components/common/TreeView';

export default function Genealogy() {
  const [focus, setFocus] = useState([]); // stack of focused nodes
  const current = focus[focus.length - 1];
  const { data, isLoading, error, refetch } = useTreeNodeQuery(current?._id);
  const [loadNode] = useLazyTreeNodeQuery();

  return (
    <div>
      <PageHeader icon={Network} title="Genealogy" subtitle="Your unilevel network. Expand any member to see their direct referrals."
        actions={focus.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setFocus((f) => f.slice(0, -1))}><ArrowLeft className="size-4" /> Back</Button>
        )} />
      {isLoading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={refetch} /> : (
        <Card className="card-pad overflow-x-auto">
          <TreeView key={data.node._id} root={data.node} load={(id) => loadNode(id, true).unwrap()} onFocus={(n) => setFocus((f) => [...f, n])} />
        </Card>
      )}
    </div>
  );
}
