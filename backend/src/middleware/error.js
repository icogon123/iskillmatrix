import multer from 'multer';
import { ZodError } from 'zod';
import env from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(422).json({ message: issues[0]?.message || 'Invalid input', errors: issues });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
    return res.status(400).json({ message });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `This ${field} is already in use` });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 && env.isProd ? 'Something went wrong. Please try again.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}
