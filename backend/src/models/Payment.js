import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    amount: { type: Number, required: true },
    // upi: paid to the company QR and verified by the admin. wallet: paid from a member's wallet and approved at once.
    method: { type: String, enum: ['upi', 'wallet'], default: 'upi' },
    wallet: { type: String, enum: ['main', 'activation'] },
    // Who paid for a wallet purchase: the member themselves, or someone activating them (P2P activation).
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    gstAmount: Number,
    systemCost: Number,
    packageCost: Number,
    paymentDate: { type: Date, required: true },
    utr: { type: String, required() { return this.method !== 'wallet'; }, trim: true, uppercase: true },
    proof: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    adminRemarks: String,
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Set while pending/approved and cleared on rejection, so a member can have only one live payment
    // and a UTR cannot be reused across live payments.
    userLock: { type: String, unique: true, sparse: true },
    utrLock: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

export default mongoose.model('Payment', paymentSchema);
