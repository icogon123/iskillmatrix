import mongoose from 'mongoose';

export const FILE_PURPOSES = ['payment_proof', 'deposit_proof', 'kyc_aadhaar', 'kyc_pan', 'kyc_bank', 'qr_code', 'avatar'];

/**
 * A file stored in Cloudinary. Payments/KYC store a reference "<_id>.<ext>"; the API streams the file
 * after checking that the viewer is the owner or an admin. Private files have no public URL.
 */
const fileAssetSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    purpose: { type: String, enum: FILE_PURPOSES, required: true },
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    provider: { type: String, default: 'cloudinary' },
    publicId: { type: String, required: true },
    resourceType: { type: String, default: 'image' },
    deliveryType: { type: String, default: 'private' }, // Cloudinary "type": private | upload
    format: String,
    ext: { type: String, required: true },
    mimeType: { type: String, required: true },
    bytes: Number,
    originalName: String,
    url: String, // only for public files (QR code)
    deletedAt: Date,
  },
  { timestamps: true },
);

export default mongoose.model('FileAsset', fileAssetSchema);
