import { useState } from 'react';
import { ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import Avatar from './Avatar';
import BadgeMedal from './BadgeMedal';
import { StatusBadge } from '../ui';

/**
 * Lazy-loading unilevel tree. `load(nodeId)` returns { node } with `children` (each with directCount/teamCount).
 */
function TreeRow({ node, depth, load, onFocus, initialOpen = false, preloaded }) {
  const [open, setOpen] = useState(initialOpen);
  const [children, setChildren] = useState(preloaded || null);
  const [loading, setLoading] = useState(false);
  const hasChildren = (node.directCount ?? node.children?.length ?? 0) > 0;

  const toggle = async () => {
    if (!hasChildren) return;
    if (!open && !children) {
      setLoading(true);
      try {
        const res = await load(node._id);
        setChildren(res.node.children);
      } finally {
        setLoading(false);
      }
    }
    setOpen((o) => !o);
  };

  return (
    <li>
      <div className="group flex items-center gap-2 rounded-xl py-1.5 pr-2 hover:bg-fg/[0.03]" style={{ paddingLeft: depth * 20 }}>
        <button type="button" onClick={toggle} disabled={!hasChildren}
          className={`grid size-6 shrink-0 place-items-center rounded-md ${hasChildren ? 'text-brand-300 hover:bg-brand-500/15' : 'text-transparent'}`}
          aria-label={open ? 'Collapse' : 'Expand'}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
        <Avatar name={node.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {node.fullName} <span className="font-normal text-muted">· {node.memberId}</span>
          </p>
          <p className="text-[11px] text-subtle">
            {node.package?.name || 'No bundle'} · {node.directCount ?? 0} direct · {node.teamCount ?? 0} team
          </p>
        </div>
        {node.badge && <span className="hidden sm:block"><BadgeMedal badgeKey={node.badge} size="sm" /></span>}
        <StatusBadge status={node.package ? node.status : 'inactive'} label={node.package ? undefined : 'Inactive'} className="hidden sm:inline-flex" />
        {onFocus && depth > 0 && (
          <button type="button" onClick={() => onFocus(node)} className="hidden rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-300 group-hover:block hover:bg-brand-500/15">
            Focus
          </button>
        )}
      </div>
      {open && children && (
        <ul className="border-l border-line/70" style={{ marginLeft: depth * 20 + 12 }}>
          {children.length === 0 ? (
            <li className="py-1.5 pl-6 text-xs text-subtle">No members</li>
          ) : (
            children.map((c) => <TreeRow key={c._id} node={c} depth={1} load={load} onFocus={onFocus} />)
          )}
        </ul>
      )}
    </li>
  );
}

export default function TreeView({ root, load, onFocus }) {
  return (
    <ul className="text-fg">
      <TreeRow key={root._id} node={root} depth={0} load={load} onFocus={onFocus} initialOpen preloaded={root.children} />
    </ul>
  );
}
