import mongoose from 'mongoose';

export const WITHDRAWAL_STATUSES = ['pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled'];

const withdrawalSchema = new mongoose.Schema(
  {
    withdrawalId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    tdsPercent: Number,
    tds: Number,
    adminChargePercent: Number,
    adminCharge: Number,
    netAmount: Number,
    bank: {
      bankName: String,
      accountHolder: String,
      accountNumber: String,
      ifsc: String,
    },
    status: { type: String, enum: WITHDRAWAL_STATUSES, default: 'pending', index: true },
    adminRemarks: String,
    paymentReference: String,
    processedAt: Date,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    history: [
      {
        _id: false,
        status: String,
        at: Date,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        remarks: String,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model('Withdrawal', withdrawalSchema);
