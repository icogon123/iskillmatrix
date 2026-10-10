import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';

export const COOKIE_NAME = 'ism_token';

export function issueToken(res, user) {
  const token = jwt.sign({ sub: String(user._id), v: user.tokenVersion, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });
  return token;
}

export function clearToken(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/** Authenticates via the httpOnly cookie (or a Bearer token) and re-checks account status on every request. */
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw new AppError('Please log in', 401);

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError('Your session has expired. Please log in again.', 401);
  }
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.v) throw new AppError('Your session has expired. Please log in again.', 401);
  if (user.status !== 'active') throw new AppError(`Your account is ${user.status}. Please contact support.`, 403);
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) throw new AppError('You do not have access to this area', 403);
  next();
};
