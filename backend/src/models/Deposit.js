import mongoose from 'mongoose';

/** A member's fund deposit by QR/UPI. Once the admin verifies it, the amount is credited to their Activation Wallet. */
const depositSchema = new mongoose.Schema(
  {
    depositId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    utr: { type: String, required: true, trim: true, uppercase: true },
    proof: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    adminRemarks: String,
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Set while pending/approved and cleared on rejection, so a UTR cannot be reused across live deposits.
    utrLock: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);

export default mongoose.model('Deposit', depositSchema);
