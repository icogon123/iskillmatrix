import { FileText, ExternalLink } from 'lucide-react';

/** Link to a private uploaded file (served with auth by the API). */
export default function FileLink({ name, label = 'View' }) {
  if (!name) return <span className="text-subtle">—</span>;
  const isPdf = name.toLowerCase().endsWith('.pdf');
  return (
    <a href={`/api/files/${name}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200">
      {isPdf ? <FileText className="size-3.5" /> : <ExternalLink className="size-3.5" />}
      {label}
    </a>
  );
}
