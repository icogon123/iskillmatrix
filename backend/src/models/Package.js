import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    activeIncome: { type: Number, default: 0, min: 0 },
    // passiveLevels[i] = amount paid to upline level i+1 (level 1 = sponsor's sponsor)
    passiveLevels: { type: [Number], default: [] },
    nonWorkingBonus: { type: Number, default: 0, min: 0 },
    weeklyEligible: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    description: String,
    benefits: { type: [String], default: [] },
    // Slugs of the catalog courses (Course.slug) this bundle includes.
    courses: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model('Package', packageSchema);
