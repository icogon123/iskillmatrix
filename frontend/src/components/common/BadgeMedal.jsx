import { Crown, Award } from 'lucide-react';
import { BADGE_COLORS } from '../../lib/constants';

/** Visual for an achievement badge. Royalty ranks (Emerald+) get a crown. */
export default function BadgeMedal({ badgeKey, size = 'md', locked = false }) {
  const [a, b] = BADGE_COLORS[badgeKey] || ['#6f6a9e', '#2e2866'];
  const royal = ['emerald', 'senior_emerald', 'director', 'senior_director', 'sapphire_director'].includes(badgeKey);
  const Icon = royal ? Crown : Award;
  const sizes = { sm: 'size-9 [&>svg]:size-4', md: 'size-12 [&>svg]:size-6', lg: 'size-16 [&>svg]:size-8' };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${sizes[size]} ${locked ? 'opacity-35 grayscale' : ''}`}
      style={{ background: `radial-gradient(circle at 30% 25%, ${a}, ${b})`, boxShadow: locked ? 'none' : `0 6px 22px -6px ${b}` }}
    >
      <Icon className="text-char-950/80" strokeWidth={2.4} />
    </span>
  );
}
