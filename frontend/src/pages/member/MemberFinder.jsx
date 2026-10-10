import { useState } from 'react';
import { Search, CircleAlert } from 'lucide-react';
import { useLazyMemberLookupQuery } from '../../api/memberApi';
import { errorMessage } from '../../app/api';
import { Input, Button, StatusBadge } from '../../components/ui';
import Avatar from '../../components/common/Avatar';

const RELATION = { upline: 'Your upline', downline: 'Your downline', self: 'This is you' };

/** Username box that looks the member up and shows who they are before any money moves. */
export default function MemberFinder({ value, onChange, member, onFound, check, disabled, label = 'Member username' }) {
  const [lookup, { isFetching, error }] = useLazyMemberLookupQuery();
  const [checked, setChecked] = useState('');
  const find = async () => {
    const u = value.trim();
    if (!u) return;
    setChecked(u);
    try {
      onFound((await lookup(u).unwrap()).member);
    } catch {
      onFound(null);
    }
  };
  const problem = member && check(member);
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <Input label={label} icon={Search} value={value} disabled={disabled} placeholder="e.g. rahul_23" autoComplete="off" className="flex-1"
          onChange={(e) => { onChange(e.target.value.toLowerCase().replace(/\s/g, '')); onFound(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find(); } }} />
        <Button variant="outline" className="h-[42px]" loading={isFetching} disabled={!value.trim() || disabled} onClick={find}>Check</Button>
      </div>
      {!member && !isFetching && value.trim() && (checked === value.trim() && error
        ? <p className="text-xs text-danger">{errorMessage(error)}</p>
        : checked !== value.trim() && <p className="text-xs text-subtle">Press “Check” (or Enter) to confirm the member before you continue.</p>)}
      {member && (
        <div className={`flex items-center gap-3 rounded-xl border p-3 ${problem ? 'border-danger/40 bg-danger/5' : 'border-success/40 bg-success/5'}`}>
          <Avatar name={member.fullName} src={member.avatar} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{member.fullName}</p>
            <p className="text-xs text-muted">@{member.username} · {member.memberId}{member.relation ? ` · ${RELATION[member.relation]}` : ''}</p>
            {problem && <p className="mt-1 flex items-center gap-1 text-xs text-danger"><CircleAlert className="size-3.5" />{problem}</p>}
          </div>
          <StatusBadge status={member.bundle ? 'active' : 'pending'} label={member.bundle || 'No bundle'} />
        </div>
      )}
    </div>
  );
}
