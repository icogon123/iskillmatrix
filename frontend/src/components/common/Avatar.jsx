import { initials } from '../../lib/format';

export default function Avatar({ name, size = 'md', className = '' }) {
  const sizes = { sm: 'size-8 text-[11px]', md: 'size-10 text-sm', lg: 'size-14 text-lg' };
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-800 font-bold text-white ${sizes[size]} ${className}`}>
      {initials(name) || '?'}
    </span>
  );
}
