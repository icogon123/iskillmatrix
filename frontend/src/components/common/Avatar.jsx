import { useState } from 'react';
import { initials } from '../../lib/format';

/** Profile picture when the member has uploaded one, otherwise their initials. */
export default function Avatar({ name, src, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(null);
  const sizes = { sm: 'size-8 text-[11px]', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-20 text-2xl' };
  if (src && failed !== src) {
    return (
      <img src={src} alt={name ? `${name}'s profile picture` : 'Profile picture'} onError={() => setFailed(src)}
        className={`shrink-0 rounded-full bg-ink-800 object-cover ${sizes[size]} ${className}`} />
    );
  }
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-800 font-bold text-white ${sizes[size]} ${className}`}>
      {initials(name) || '?'}
    </span>
  );
}
