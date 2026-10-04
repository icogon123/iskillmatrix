// Categorical colours for the six income types, in this fixed order. Validated with the dataviz
// palette checker against the dark card surface #120f2e (worst adjacent CVD ΔE 9.4, normal-vision 19.3).
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
};

export const RUN_LABELS = { weekly: 'Weekly Income', monthly_bonus: 'Monthly Bonus', royalty: 'Royalty Income' };

const TONES = {
  green: 'bg-success/12 text-success ring-success/25',
  red: 'bg-danger/12 text-danger ring-danger/25',
  amber: 'bg-warning/12 text-warning ring-warning/25',
  blue: 'bg-info/12 text-info ring-info/25',
  violet: 'bg-brand-500/15 text-brand-300 ring-brand-500/30',
  gray: 'bg-white/6 text-muted ring-white/10',
};

const STATUS_TONE = {
  active: 'green', approved: 'green', completed: 'green', paid: 'green', credited: 'green',
  pending: 'amber', submitted: 'amber', generated: 'amber', processing: 'blue', under_review: 'blue',
  rejected: 'red', suspended: 'red', cancelled: 'gray', inactive: 'gray', lapsed: 'gray', not_submitted: 'gray',
};

export const toneClass = (tone) => TONES[tone] || TONES.gray;
export const statusTone = (status) => TONES[STATUS_TONE[status] || 'gray'];
export const statusLabel = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const TRENDING_SKILLS = [
  'Instagram Mastery', 'Meta Ads', 'YouTube Mastery', 'Video Editing', 'Graphic Design',
  'Sales Mastery', 'Lead Generation', 'Communication Skills', 'AI Tools Mastery', 'Personal Branding',
];

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
