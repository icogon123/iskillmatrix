import Money from '../../components/common/Money';
import { WALLETS } from '../../lib/constants';

/** Pick the wallet that pays for a bundle; each option shows its balance and whether it covers the price. */
export default function WalletChoice({ wallets, value, onChange, price, disabled }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted">Pay from</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {[...WALLETS].reverse().map((w) => {
          const balance = wallets?.[w.value] || 0;
          const short = price > 0 && price > balance;
          const selected = value === w.value;
          return (
            <label key={w.value}
              className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${selected ? 'border-gold-400/60 bg-gold-400/10' : 'border-line hover:border-brand-500/40'} ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
              <input type="radio" name="wallet" className="sr-only" checked={selected} disabled={disabled} onChange={() => onChange(w.value)} />
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`size-4 rounded-full border-2 ${selected ? 'border-gold-400 bg-gold-400' : 'border-subtle'}`} />
                {w.label}
              </span>
              <Money value={balance} className="mt-1 text-lg font-bold" />
              <span className={`text-[11px] ${short ? 'text-danger' : 'text-subtle'}`}>
                {short ? <>Short by <Money value={price - balance} /></> : price > 0 ? 'Enough balance' : 'Available balance'}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
