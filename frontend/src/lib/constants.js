// Registered company name — used in copyright lines and wherever the legal entity is named.
export const COMPANY_LEGAL_NAME = 'AROVIA SKILL TECHNOLOGIES PRIVATE LIMITED';

// Categorical colours for the six income types, in this fixed order (same in both themes). Validated with the
// dataviz palette checker against the dark card surface #120f2e (worst adjacent CVD ΔE 9.4, normal-vision 19.3).
export const INCOME_TYPES = [
  { key: 'active', label: 'Active Income', short: 'Active', color: '#9085e9' },
  { key: 'passive', label: 'Passive Income', short: 'Passive', color: '#199e70' },
  { key: 'weekly', label: 'Weekly Income', short: 'Weekly', color: '#d95926' },
  { key: 'monthly_bonus', label: 'Monthly Bonus', short: 'Monthly', color: '#3987e5' },
  { key: 'non_working', label: 'Non-Working Income', short: 'Non-Working', color: '#c98500' },
  { key: 'royalty', label: 'Royalty Income', short: 'Royalty', color: '#d55181' },
];

export const LEDGER_LABELS = {
  active: 'Active Income',
  passive: 'Passive Income',
  weekly: 'Weekly Income',
  monthly_bonus: 'Monthly Bonus',
  non_working: 'Non-Working Income',
  royalty: 'Royalty Income',
  withdrawal: 'Withdrawal',
  withdrawal_reversal: 'Withdrawal Reversal',
  adjustment_credit: 'Admin Credit',
  adjustment_debit: 'Admin Debit',
  deposit: 'Fund Deposit',
  transfer_out: 'Transfer Sent',
  transfer_in: 'Transfer Received',
  bundle_purchase: 'Bundle Purchase',
};

// Main: income lands here; withdrawable. Activation: deposits and transfers received; only buys bundles.
export const WALLETS = [
  { value: 'main', label: 'Main Wallet', short: 'Main' },
  { value: 'activation', label: 'Activation Wallet', short: 'Activation' },
];
export const WALLET_LABELS = { main: 'Main Wallet', activation: 'Activation Wallet' };

export const RUN_LABELS = { weekly: 'Weekly Income', monthly_bonus: 'Monthly Bonus', royalty: 'Royalty Income' };

const TONES = {
  green: 'bg-success/12 text-success ring-success/25',
  red: 'bg-danger/12 text-danger ring-danger/25',
  amber: 'bg-warning/12 text-warning ring-warning/25',
  blue: 'bg-info/12 text-info ring-info/25',
  violet: 'bg-brand-500/15 text-brand-300 ring-brand-500/30',
  gray: 'bg-fg/6 text-muted ring-fg/10',
};

const STATUS_TONE = {
  active: 'green', approved: 'green', completed: 'green', paid: 'green', credited: 'green',
  pending: 'amber', submitted: 'amber', generated: 'amber', processing: 'blue', under_review: 'blue',
  rejected: 'red', suspended: 'red', cancelled: 'gray', inactive: 'gray', lapsed: 'gray', not_submitted: 'gray',
};

export const toneClass = (tone) => TONES[tone] || TONES.gray;
export const statusTone = (status) => TONES[STATUS_TONE[status] || 'gray'];
export const statusLabel = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const BADGE_COLORS = {
  bronze: ['#d97706', '#92400e'],
  silver: ['#e5e7eb', '#9ca3af'],
  gold: ['#fde68a', '#d97706'],
  platinum: ['#e0f2fe', '#7dd3fc'],
  diamond: ['#a5f3fc', '#38bdf8'],
  emerald: ['#6ee7b7', '#059669'],
  senior_emerald: ['#34d399', '#047857'],
  director: ['#c4b5fd', '#7c3aed'],
  senior_director: ['#f0abfc', '#a21caf'],
  sapphire_director: ['#93c5fd', '#1d4ed8'],
};
