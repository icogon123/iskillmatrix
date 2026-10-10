import path from 'node:path';
import multer from 'multer';
import AppError from '../utils/AppError.js';

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

/**
 * Keeps uploads in memory (max 5 MB each); controllers send them to Cloudinary via storageService.
 * The extension check here is a quick first filter; storageService verifies the real file content.
 */
function make({ allowPdf = true } = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED.has(ext) || (!allowPdf && ext === '.pdf')) {
        return cb(new AppError(`Only ${allowPdf ? 'JPG, PNG, WEBP or PDF' : 'JPG, PNG or WEBP'} files are allowed`));
      }
      cb(null, true);
    },
  });
}

export const privateUpload = make();
export const publicImageUpload = make({ allowPdf: false });
