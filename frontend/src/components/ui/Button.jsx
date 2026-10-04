import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const VARIANTS = {
  primary:
    'text-white bg-gradient-to-br from-brand-500 to-brand-700 shadow-glow hover:from-brand-400 hover:to-brand-600 focus-visible:ring-brand-400',
  gold: 'text-ink-950 bg-gradient-to-b from-gold-300 to-gold-500 shadow-gold hover:from-gold-200 hover:to-gold-400 focus-visible:ring-gold-300',
  outline: 'text-fg border border-line bg-white/[0.03] hover:bg-white/[0.07] hover:border-brand-500/40 focus-visible:ring-brand-400',
  ghost: 'text-muted hover:text-fg hover:bg-white/[0.06] focus-visible:ring-brand-400',
  danger: 'text-white bg-danger/90 hover:bg-danger focus-visible:ring-danger',
  success: 'text-white bg-success/90 hover:bg-success focus-visible:ring-success',
};
const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-xl',
};

export default function Button({ variant = 'primary', size = 'md', loading, disabled, className = '', to, href, children, ...props }) {
  const cls = `inline-flex items-center justify-center font-semibold whitespace-nowrap transition outline-none focus-visible:ring-2
    focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls} {...props}>{content}</Link>;
  if (href) return <a href={href} className={cls} {...props}>{content}</a>;
  return (
    <button type="button" className={cls} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}
