import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute paths resolved from this file, so the server works from any working directory. */
export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const UPLOAD_ROOT = path.join(BACKEND_ROOT, 'uploads');
export const CLIENT_DIST = path.resolve(BACKEND_ROOT, '../frontend/dist');
