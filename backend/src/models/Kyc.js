import mongoose from 'mongoose';

const kycSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    aadhaarNumber: { type: String, required: true },
    aadhaarDoc: String,
    panNumber: { type: String, required: true, uppercase: true },
    panDoc: String,
    bankName: { type: String, required: true },
    accountHolder: { type: String, required: true },
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true, uppercase: true },
    bankDoc: String,
    status: { type: String, enum: ['submitted', 'under_review', 'approved', 'rejected'], default: 'submitted', index: true },
    rejectionReason: String,
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model('Kyc', kycSchema);
