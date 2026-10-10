import mongoose from 'mongoose';

export const INCOME_CATEGORIES = ['active', 'passive', 'weekly', 'monthly_bonus', 'non_working', 'royalty'];
// Money moving between wallets and members (not income): fund deposits, transfers and bundle purchases paid from a wallet.
export const WALLET_CATEGORIES = ['deposit', 'transfer_out', 'transfer_in', 'bundle_purchase'];
export const LEDGER_CATEGORIES = [
  ...INCOME_CATEGORIES,
  'withdrawal',
  'withdrawal_reversal',
  'adjustment_credit',
  'adjustment_debit',
  ...WALLET_CATEGORIES,
];

// main: income lands here; withdrawable, can buy bundles and be transferred.
// activation: deposits and transfers received; can only buy bundles (never withdrawn or transferred).
// Entries written before the two-wallet split have no `wallet` field and belong to the main wallet.
export const WALLETS = ['main', 'activation'];
export const walletMatch = (wallet) => (wallet === 'activation' ? { wallet: 'activation' } : { wallet: { $ne: 'activation' } });

const ledgerSchema = new mongoose.Schema(
  {
    txnId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    wallet: { type: String, enum: WALLETS, default: 'main' },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    category: { type: String, enum: LEDGER_CATEGORIES, required: true },
    grossAmount: { type: Number, required: true },
    charges: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    // pending: awaiting processing/approval, completed: affects balance,
    // lapsed: beneficiary not eligible (kept for audit, no balance effect), cancelled: voided
    status: { type: String, enum: ['pending', 'completed', 'lapsed', 'cancelled'], default: 'completed' },
    sourceUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    level: Number,
    rate: Number,
    basisAmount: Number,
    run: { type: mongoose.Schema.Types.ObjectId, ref: 'IncomeRun', index: true },
    withdrawal: { type: mongoose.Schema.Types.ObjectId, ref: 'Withdrawal' },
    deposit: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposit' },
    // The other member in a transfer or wallet-paid bundle purchase (yourself for transfers between your own wallets).
    counterparty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    period: String,
    reference: String,
    remarks: String,
    idempotencyKey: { type: String, unique: true, sparse: true },
    scheduledFor: Date,
    completedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    settingsVersion: Number,
  },
  { timestamps: true },
);

ledgerSchema.index({ user: 1, status: 1, category: 1, completedAt: -1 });
ledgerSchema.index({ category: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ user: 1, wallet: 1, status: 1, completedAt: -1 });

export default mongoose.model('Ledger', ledgerSchema);
