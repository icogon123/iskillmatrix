import mongoose from 'mongoose';

const settingHistorySchema = new mongoose.Schema(
  {
    scope: { type: String, default: 'settings' }, // settings | package
    refId: String,
    version: Number,
    snapshot: mongoose.Schema.Types.Mixed,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.model('SettingHistory', settingHistorySchema);
