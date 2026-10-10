import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_STATUSES = ['pending', 'active', 'rejected', 'inactive', 'suspended'];
export const KYC_STATUSES = ['not_submitted', 'submitted', 'under_review', 'approved', 'rejected'];

const badgeHistorySchema = new mongoose.Schema(
  { badge: String, achievedAt: Date, lifetimeEarnings: Number },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['member', 'admin'], default: 'member', index: true },
    memberId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    mobile: { type: String, trim: true },
    dob: Date,
    country: { type: String, default: 'India' },
    aadhaar: { type: String, trim: true },
    // Profile picture: public Cloudinary URL, plus the FileAsset so the old image is deleted when it is replaced.
    avatar: String,
    avatarAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset', select: false },

    password: { type: String, required: true, select: false },
    txnPassword: { type: String, select: false },
    tokenVersion: { type: Number, default: 0 },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },

    // Unilevel network. `ancestors` holds the upline, nearest sponsor first.
    sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    ancestors: { type: [mongoose.Schema.Types.ObjectId], index: true, default: [] },
    depth: { type: Number, default: 0 },

    selectedPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', index: true },
    packageActivatedAt: Date,

    status: { type: String, enum: USER_STATUSES, default: 'pending', index: true },
    statusReason: String,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    kycStatus: { type: String, enum: KYC_STATUSES, default: 'not_submitted' },

    badge: { type: String, default: null },
    badgeAchievedAt: Date,
    badgeHistory: { type: [badgeHistorySchema], default: [] },
    lifetimeEarnings: { type: Number, default: 0 },

    walletLock: { type: Date, default: null, select: false },
    // Admin wallet freeze: income still accrues, but withdrawals, transfers and wallet payments are blocked until it is lifted.
    walletSuspended: { type: Boolean, default: false },
    walletSuspendedReason: String,
    walletSuspendedAt: Date,
    walletSuspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastLoginAt: Date,
    isRoot: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.checkTxnPassword = function checkTxnPassword(plain) {
  return this.txnPassword ? bcrypt.compare(plain, this.txnPassword) : false;
};

userSchema.statics.hash = (plain) => bcrypt.hash(plain, 10);

userSchema.virtual('isPackageActive').get(function isPackageActive() {
  return Boolean(this.package);
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.txnPassword;
    delete ret.resetTokenHash;
    delete ret.resetTokenExpires;
    delete ret.walletLock;
    delete ret.tokenVersion;
    delete ret.__v;
    delete ret.id;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
