import mongoose from 'mongoose';

const slab = (fields) => new mongoose.Schema(fields, { _id: false });

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    version: { type: Number, default: 1 },
    site: {
      name: { type: String, default: 'iSkillMatrix' },
      tagline: { type: String, default: 'Learn Skills. Build Your Future.' },
      email: { type: String, default: 'support@iskillmatrix.com' },
      phone: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    payment: {
      upiId: { type: String, default: '' },
      payeeName: { type: String, default: 'iSkillMatrix' },
      qrImage: { type: String, default: '' },
      instructions: {
        type: String,
        default: 'Scan the QR code, pay the exact bundle amount, then submit the UTR/reference number with a screenshot.',
      },
    },
    tax: {
      gstPercent: { type: Number, default: 18 },
      systemCostPercent: { type: Number, default: 12 },
    },
    weekly: {
      // Pool = percent × the company's bundle sales in the week, shared equally by the qualified members.
      percent: { type: Number, default: 5 },
      // Same-bundle direct sales (weekly-eligible bundles) a member needs in the week to qualify.
      qualifyingSales: { type: Number, default: 3 },
      // collection: amount received for bundles; net: after GST and system cost.
      poolBasis: { type: String, enum: ['collection', 'net'], default: 'collection' },
      // Generate the run automatically when the week closes (Monday 12:05 AM IST)…
      autoProcess: { type: Boolean, default: true },
      // …and credit it straight away instead of waiting for admin approval.
      autoApprove: { type: Boolean, default: true },
    },
    monthlyBonus: {
      comparator: { type: String, enum: ['gt', 'gte'], default: 'gt' },
      slabs: {
        type: [slab({ threshold: Number, bonus: Number })],
        default: [
          { threshold: 20000, bonus: 1500 },
          { threshold: 50000, bonus: 4000 },
          { threshold: 100000, bonus: 10000 },
        ],
      },
    },
    badges: {
      type: [slab({ key: String, name: String, threshold: Number })],
      default: [
        { key: 'bronze', name: 'Bronze Executive', threshold: 5000 },
        { key: 'silver', name: 'Silver Executive', threshold: 10000 },
        { key: 'gold', name: 'Gold Executive', threshold: 30000 },
        { key: 'platinum', name: 'Platinum Executive', threshold: 50000 },
        { key: 'diamond', name: 'Diamond Executive', threshold: 100000 },
        { key: 'emerald', name: 'Emerald Executive', threshold: 500000 },
        { key: 'senior_emerald', name: 'Senior Emerald Executive', threshold: 1000000 },
        { key: 'director', name: 'Director', threshold: 2000000 },
        { key: 'senior_director', name: 'Senior Director', threshold: 5000000 },
        { key: 'sapphire_director', name: 'Sapphire Director', threshold: 10000000 },
      ],
    },
    // Income categories that count towards lifetime earnings for badges.
    badgeQualifyingCategories: { type: [String], default: ['active', 'passive'] },
    royalty: {
      // team: % of the downline's Active + Passive income in the month; own: % of the member's own.
      basis: { type: String, enum: ['team', 'own'], default: 'team' },
      slabs: {
        type: [slab({ badgeKey: String, percent: Number })],
        default: [
          { badgeKey: 'emerald', percent: 5 },
          { badgeKey: 'senior_emerald', percent: 6 },
          { badgeKey: 'director', percent: 7 },
          { badgeKey: 'senior_director', percent: 8 },
          { badgeKey: 'sapphire_director', percent: 10 },
        ],
      },
    },
    withdrawal: {
      tdsPercent: { type: Number, default: 2 },
      adminChargePercent: { type: Number, default: 5 },
      min: { type: Number, default: 500 },
      max: { type: Number, default: 100000 },
      requireKyc: { type: Boolean, default: true },
    },
    wallet: {
      // Fund deposits (credited to the Activation Wallet after admin verification). Max 0 = no maximum.
      depositMin: { type: Number, default: 100 },
      depositMax: { type: Number, default: 0 },
      // Smallest Main Wallet transfer, to your own Activation Wallet or to an upline/downline member.
      transferMin: { type: Number, default: 100 },
    },
    nonWorking: {
      autoProcess: { type: Boolean, default: true },
    },
    income: {
      // When true, income for an upline who is not active / has no package is recorded as "lapsed".
      requireActiveBeneficiary: { type: Boolean, default: true },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false },
);

export default mongoose.model('Setting', settingSchema);
