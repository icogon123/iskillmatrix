import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import env from './config/env.js';
import routes from './routes/index.js';
import { UPLOAD_ROOT, CLIENT_DIST } from './config/paths.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { robotsTxt, sitemapXml } from './controllers/publicController.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' }, contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));

app.use('/uploads/public', express.static(path.join(UPLOAD_ROOT, 'public'), { maxAge: '1d' }));
app.use('/api', routes);
app.use('/api', notFoundHandler);

app.get('/robots.txt', robotsTxt);
app.get('/sitemap.xml', sitemapXml);

// In production the built React app (frontend/dist) can be served by this same server.
if (env.isProd && fs.existsSync(CLIENT_DIST)) {
  // Build files have a content hash in their name, so they can be cached for a year. A file from an older
  // build that no longer exists must 404 (not fall through to index.html), so the app can reload itself.
  app.use('/assets', express.static(path.join(CLIENT_DIST, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
  app.get('/{*splat}', (req, res) => {
    if (path.extname(req.path)) return res.status(404).end();
    // index.html is revalidated on every visit so a new deploy is picked up immediately.
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
