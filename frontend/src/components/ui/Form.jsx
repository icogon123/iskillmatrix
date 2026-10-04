import { useId } from 'react';
import { Upload, FileCheck2 } from 'lucide-react';

export function Field({ label, error, hint, required, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold tracking-wide text-muted">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}

export function Input({ label, error, hint, required, className = '', icon: Icon, right, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />}
        <input id={id} className={`input ${Icon ? 'pl-9' : ''} ${right ? 'pr-11' : ''} ${error ? 'border-danger/60' : ''}`} {...props} />
        {right && <div className="absolute inset-y-0 right-1.5 flex items-center">{right}</div>}
      </div>
    </Field>
  );
}

export function Select({ label, error, hint, required, className = '', options = [], placeholder, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <select id={id} className={`input appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9 ${error ? 'border-danger/60' : ''}`}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a6a2cf'%3E%3Cpath stroke-linecap='round' stroke-width='2' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
        {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, required, className = '', ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <textarea id={id} rows={3} className={`input resize-y ${error ? 'border-danger/60' : ''}`} {...props} />
    </Field>
  );
}

export function FileField({ label, file, onChange, accept = 'image/*,.pdf', hint, required, error, existing }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={id}>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-sm transition hover:border-brand-500/60 hover:bg-brand-500/5 ${
          error ? 'border-danger/60' : 'border-line'
        }`}
      >
        {file || existing ? <FileCheck2 className="size-5 shrink-0 text-success" /> : <Upload className="size-5 shrink-0 text-brand-400" />}
        <span className="min-w-0 truncate text-muted">{file ? file.name : existing ? 'Previously uploaded — choose to replace' : 'Choose file (JPG, PNG or PDF, max 5 MB)'}</span>
      </label>
      <input id={id} type="file" accept={accept} className="sr-only" onChange={(e) => onChange(e.target.files?.[0] || null)} />
    </Field>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-500' : 'bg-ink-600'}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}
