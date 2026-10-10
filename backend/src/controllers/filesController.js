import path from 'node:path';
import fs from 'node:fs';
import AppError from '../utils/AppError.js';
import FileAsset from '../models/FileAsset.js';
import { UPLOAD_ROOT } from '../config/paths.js';
import { parseRef, streamAsset } from '../services/storageService.js';

/**
 * Serves KYC documents and payment proofs. Admins can open every file; members only their own.
 * Cloudinary files are streamed through the API, so their storage location is never exposed.
 */
export async function privateFile(req, res) {
  const isAdmin = req.user.role === 'admin';
  const id = parseRef(req.params.name);

  if (id) {
    const asset = await FileAsset.findById(id).lean();
    if (!asset || asset.deletedAt) throw new AppError('File not found', 404);
    if (!isAdmin && String(asset.owner) !== String(req.user._id)) throw new AppError('Not allowed', 403);
    return streamAsset(asset, res);
  }

  // Legacy files saved on the server disk before Cloudinary (named "<ownerId>-<time>-<random>.<ext>").
  const name = path.basename(req.params.name);
  if (!isAdmin && !name.startsWith(`${req.user._id}-`)) throw new AppError('Not allowed', 403);
  const file = path.join(UPLOAD_ROOT, 'private', name);
  if (!fs.existsSync(file)) throw new AppError('File not found', 404);
  res.set('Cache-Control', 'private, max-age=300');
  res.sendFile(file);
}
