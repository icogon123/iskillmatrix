import { useSelector } from 'react-redux';
import { inr } from '../../lib/format';

/** Rupee amount that respects the "hide amounts" privacy toggle in the member app. */
export default function Money({ value, className = '' }) {
  const hidden = useSelector((s) => s.ui.hideAmounts);
  return <span className={className}>{hidden ? '₹ ••••••' : inr(value)}</span>;
}
