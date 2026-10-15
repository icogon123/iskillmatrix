import 'dotenv/config';

const str = (name, fallback = '') => (process.env[name] ?? fallback).toString().trim();

/** Cloudinary credentials from CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET, or a single CLOUDINARY_URL. */
function cloudinaryConfig() {
  const cfg = {
    cloudName: str('CLOUDINARY_CLOUD_NAME'),
    apiKey: str('CLOUDINARY_API_KEY'),
    apiSecret: str('CLOUDINARY_API_SECRET'),
    folder: str('CLOUDINARY_FOLDER', 'aroviaskilltech').replace(/^\/+|\/+$/g, ''),
  };
  const url = str('CLOUDINARY_URL');
  if (url && !(cfg.cloudName && cfg.apiKey && cfg.apiSecret)) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url);
    if (m) [, cfg.apiKey, cfg.apiSecret, cfg.cloudName] = m;
  }
  return cfg;
}

const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  port: Number(process.env.PORT) || 5050,
  clientUrl: str('CLIENT_URL', 'http://localhost:5173').replace(/\/$/, ''),
  mongoUri: str('MONGODB_URI'),
  mongoDbName: str('MONGODB_DB_NAME', 'iskillmatrix'),
  jwtSecret: str('JWT_SECRET'),
  jwtExpiresIn: str('JWT_EXPIRES_IN', '1d'),
  admin: {
    username: str('ADMIN_USERNAME', 'admin').toLowerCase(),
    password: str('ADMIN_PASSWORD'),
    email: str('ADMIN_EMAIL'),
  },
  rootPassword: str('ROOT_PASSWORD'),
  cloudinary: cloudinaryConfig(),
  smtp: {
    host: str('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT) || 587,
    user: str('SMTP_USER'),
    pass: str('SMTP_PASS'),
    from: str('MAIL_FROM', 'AroviaSkillTech <aroviaskilltechnologies@gmail.com>'),
  },
};

env.isProd = env.nodeEnv === 'production';

/** Fails fast with a clear message when the server is started without its required settings. */
export function assertServerEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGODB_URI');
  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing required setting(s) in backend/.env: ${missing.join(', ')} (see backend/.env.example)`);
  }
  if (env.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters (e.g. `openssl rand -hex 32`)');
}

export default env;
