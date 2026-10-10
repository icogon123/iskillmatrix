/**
 * Pre-deploy check: runs the real app with NODE_ENV=production against a throwaway in-memory MongoDB and the
 * built frontend (../frontend/dist): caching, compression, SPA routing, health check, robots/sitemap, cookies.
 * Run `npm run build` in frontend first, then `npm run test:prod` here. Never touches MONGODB_URI.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import env from '../config/env.js';
import { CLIENT_DIST } from '../config/paths.js';
import { ensureBaseData } from './baseData.js';

assert.equal(env.isProd, true, 'run with NODE_ENV=production (npm run test:prod)');
assert.ok(fs.existsSync(path.join(CLIENT_DIST, 'index.html')), 'build the frontend first: cd ../frontend && npm run build');
env.admin.password = 'ProdCheck#2026';
const mem = await MongoMemoryServer.create();
await mongoose.connect(mem.getUri('prod-check'));
await ensureBaseData({ log: false });
const { default: app } = await import('../app.js');
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const get = (p, headers = {}) => fetch(base + p, { headers });

let r = await get('/', { 'Accept-Encoding': 'gzip' });
assert.equal(r.status, 200);
assert.match(r.headers.get('content-type'), /text\/html/);
assert.equal(r.headers.get('cache-control'), 'no-cache');
console.log('  ✓ / serves index.html, no-cache');

r = await get('/courses/graphic-design');
assert.equal(r.status, 200);
assert.match(await r.text(), /<div id="root">/);
console.log('  ✓ deep link /courses/graphic-design serves the app');

const asset = fs.readdirSync(path.join(CLIENT_DIST, 'assets')).find((f) => f.startsWith('index-') && f.endsWith('.js'));
r = await get(`/assets/${asset}`, { 'Accept-Encoding': 'gzip' });
assert.equal(r.status, 200);
assert.match(r.headers.get('cache-control'), /max-age=31536000.*immutable/);
assert.equal(r.headers.get('content-encoding'), 'gzip');
console.log(`  ✓ /assets/${asset}: immutable 1y cache, gzip`);

r = await get('/assets/OldChunk-deadbeef.js');
assert.equal(r.status, 404);
console.log('  ✓ stale build file → 404 (not index.html)');

r = await get('/missing-image.png');
assert.equal(r.status, 404);
r = await get('/favicon.svg');
assert.equal(r.status, 200);
console.log('  ✓ static files served, unknown files 404');

r = await get('/api/health');
assert.equal(r.status, 200);
assert.equal((await r.json()).db, 'connected');
r = await get('/api/nope');
assert.equal(r.status, 404);
assert.match(r.headers.get('content-type'), /json/);
console.log('  ✓ /api/health connected, unknown API → JSON 404');

r = await get('/robots.txt');
const robots = await r.text();
assert.match(robots, /Disallow: \/admin/);
assert.match(robots, new RegExp(`Sitemap: ${env.clientUrl}/sitemap.xml`));
r = await get('/sitemap.xml');
const xml = await r.text();
assert.match(r.headers.get('content-type'), /xml/);
assert.equal((xml.match(/<url>/g) || []).length, 17, '7 pages + 10 courses');
console.log('  ✓ robots.txt and sitemap.xml (17 URLs)');

r = await get('/api/public/courses');
assert.equal((await r.json()).courses.length, 10);
r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: 'admin', password: 'ProdCheck#2026' }) });
assert.equal(r.status, 200);
const cookie = r.headers.get('set-cookie');
assert.match(cookie, /HttpOnly/i);
assert.match(cookie, /Secure/i);
assert.match(cookie, /SameSite=Lax/i);
console.log('  ✓ login cookie is HttpOnly + Secure + SameSite=Lax');

await mongoose.disconnect();
r = await get('/api/health');
assert.equal(r.status, 503);
console.log('  ✓ /api/health → 503 when the database is down');

server.close();
await mem.stop();
console.log('Production check passed.');
