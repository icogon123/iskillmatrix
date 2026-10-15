import mongoose from 'mongoose';

/** One live email OTP per `key` (`<purpose>:<subject>`). Mongo removes expired codes on its own. */
const otpSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    // What the code was issued for (e.g. the withdrawal amount); the verifying request must match it.
    meta: mongoose.Schema.Types.Mixed,
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Otp', otpSchema);
