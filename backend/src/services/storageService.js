import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import FileAsset from '../models/FileAsset.js';
import AppError from '../utils/AppError.js';

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
let configured = false;

export const storageConfigured = () => Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);

function client() {
  if (!storageConfigured()) throw new AppError('File uploads are not available yet (storage not configured). Please contact support.', 503);
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

/** Detects the real file type from its first bytes, so a renamed file can't pass as an image or PDF. */
export function sniffType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString('latin1') === 'PNG') return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

/** Reference stored on payments/KYC: "<FileAsset id>.<ext>" (the extension lets the UI tell PDFs from images). */
export const fileRef = (asset) => `${asset._id}.${asset.ext}`;

/** Returns the FileAsset id from a reference, or null for legacy (local disk) file names. */
export function parseRef(ref) {
  const m = /^([a-f0-9]{24})\.([a-z0-9]+)$/i.exec(String(ref || ''));
  return m ? m[1] : null;
}

/**
 * Uploads a file (multer memory file or { buffer, originalname }) to Cloudinary and records it.
 * Private files use Cloudinary's "private" delivery type: they have no public URL.
 */
export async function storeUpload(file, { owner, purpose, visibility = 'private', allowPdf = true }) {
  const ext = sniffType(file?.buffer);
  if (!ext || (!allowPdf && ext === 'pdf')) {
    throw new AppError(`Only ${allowPdf ? 'JPG, PNG, WEBP or PDF' : 'JPG, PNG or WEBP'} files are allowed`);
  }
  const cld = client();
  const isPrivate = visibility === 'private';
  let result;
  try {
    result = await new Promise((resolve, reject) => {
      const stream = cld.uploader.upload_stream(
        {
          folder: `${env.cloudinary.folder}/${isPrivate ? 'private' : 'public'}/${purpose}`,
          public_id: crypto.randomBytes(12).toString('hex'),
          resource_type: 'image', // Cloudinary stores PDFs as the image resource type
          type: isPrivate ? 'private' : 'upload',
          overwrite: false,
        },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
      stream.end(file.buffer);
    });
  } catch (err) {
    console.error('[storage] upload failed:', err?.message || err);
    throw new AppError('Could not upload the file. Please try again.', 502);
  }
  try {
    return await FileAsset.create({
      owner,
      purpose,
      visibility,
      publicId: result.public_id,
      resourceType: result.resource_type,
      deliveryType: result.type,
      format: result.format || ext,
      ext,
      mimeType: MIME[ext],
      bytes: result.bytes,
      originalName: file.originalname,
      url: isPrivate ? undefined : result.secure_url,
    });
  } catch (err) {
    await cld.uploader
      .destroy(result.public_id, { resource_type: result.resource_type, type: result.type, invalidate: true })
      .catch(() => {});
    throw err;
  }
}

/** Deletes a file from Cloudinary and marks the record deleted. Never throws. */
export async function removeAsset(asset) {
  try {
    await client().uploader.destroy(asset.publicId, { resource_type: asset.resourceType, type: asset.deliveryType, invalidate: true });
    await FileAsset.updateOne({ _id: asset._id }, { $set: { deletedAt: new Date() } });
  } catch (err) {
    console.error('[storage] delete failed:', err?.message || err);
  }
}

/** Streams a stored file to the response through a short-lived signed Cloudinary download link. */
export async function streamAsset(asset, res) {
  const url = client().utils.private_download_url(asset.publicId, asset.format, {
    resource_type: asset.resourceType,
    type: asset.deliveryType,
    expires_at: Math.floor(Date.now() / 1000) + 120,
  });
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    console.error('[storage] fetch failed:', upstream.status, asset.publicId);
    throw new AppError('Could not load this file. Please try again.', 502);
  }
  res.set({
    'Content-Type': asset.mimeType,
    'Content-Disposition': `inline; filename="${asset.purpose}.${asset.ext}"`,
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff',
  });
  await new Promise((resolve, reject) => {
    Readable.fromWeb(upstream.body).on('error', reject).pipe(res).on('finish', resolve).on('error', reject);
  });
}

/** URL for a public asset value stored in settings (Cloudinary URL, or a legacy local file name). */
export const publicAssetUrl = (value) => (!value ? null : /^https?:\/\//.test(value) ? value : `/uploads/public/${value}`);
