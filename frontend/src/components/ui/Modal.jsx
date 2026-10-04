import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';
import { Textarea, Input } from './Form';

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92dvh] w-full ${widths[size]} flex-col rounded-t-3xl border border-line bg-ink-900 shadow-2xl sm:rounded-3xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-fg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-white/5 hover:text-fg" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * In-app confirmation (no browser dialogs). When `reasonLabel` is set a text field is shown and
 * `onConfirm(text)` receives it; `requireReason` makes it mandatory.
 */
export function ConfirmModal({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'primary', loading,
  reasonLabel, requireReason, reasonPlaceholder, inputLabel, inputPlaceholder, requireInput,
}) {
  const [text, setText] = useState('');
  const [input, setInput] = useState('');
  useEffect(() => {
    if (open) {
      setText('');
      setInput('');
    }
  }, [open]);
  const blocked = (requireReason && !text.trim()) || (requireInput && !input.trim());
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={variant} loading={loading} disabled={blocked} onClick={() => onConfirm({ reason: text.trim(), input: input.trim() })}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <div className="text-sm text-muted">{message}</div>}
      {inputLabel && (
        <Input className="mt-4" label={inputLabel} placeholder={inputPlaceholder} value={input} onChange={(e) => setInput(e.target.value)} required={requireInput} />
      )}
      {reasonLabel && (
        <Textarea className="mt-4" label={reasonLabel} placeholder={reasonPlaceholder} value={text} onChange={(e) => setText(e.target.value)} required={requireReason} />
      )}
    </Modal>
  );
}
