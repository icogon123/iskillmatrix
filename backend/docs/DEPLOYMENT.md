# Deployment (aroviaskilltechnologies.com)

The simplest setup is **one Linux server (VPS)** running one Node.js process that serves both the
API (`/api`) and the built React site, behind Nginx with HTTPS, plus MongoDB.

```
Browser ──HTTPS──► Nginx (aroviaskilltechnologies.com, SSL) ──► Node.js :5050 ──► Cloudinary (uploaded files)
                                                     ├── /api/*            Express API
                                                     └── /*                frontend/dist (React)
                                                  ──► MongoDB (Atlas or local)
```

## 1. Server requirements

- Ubuntu 22.04+/Debian 12 (or any Linux), 1 vCPU / 1 GB RAM minimum (2 GB recommended)
- Node.js 20 LTS or newer, npm
- Nginx, Certbot (Let's Encrypt)
- MongoDB Atlas cluster (or MongoDB 6+ on the server). In Atlas → **Network Access**, allow the server's public IP
- DNS: `A` records for `aroviaskilltechnologies.com` and `www.aroviaskilltechnologies.com` pointing to the server

## 2. Get the code on the server

```bash
sudo mkdir -p /var/www && cd /var/www
# copy the project folder here (git clone, scp or rsync)
cd /var/www/aroviaskilltech
```

## 3. Build the frontend

```bash
cd /var/www/aroviaskilltech/frontend
npm ci
npm run build          # → frontend/dist
```

Before deploying, you can check the production setup on your own computer (needs the backend's dev
dependencies; it uses a throwaway in-memory database and never touches `MONGODB_URI`):

```bash
cd frontend && npm run build
cd ../backend && npm run test:prod   # caching, gzip, SPA routing, health check, robots/sitemap, secure cookies
npm run test:engine                  # income engine
```

## 4. Configure and start the backend

```bash
cd /var/www/aroviaskilltech/backend
npm ci --omit=dev
cp .env.example .env
nano .env              # see CONFIGURATION.md → example production .env
```

Required: `NODE_ENV=production`, `CLIENT_URL=https://aroviaskilltechnologies.com`, a real `MONGODB_URI`,
a random `JWT_SECRET`, a strong `ADMIN_PASSWORD`.

Run with **PM2** so it restarts on crash and on reboot:

```bash
sudo npm install -g pm2
cd /var/www/aroviaskilltech/backend
NODE_ENV=production pm2 start src/server.js --name aroviaskilltech
pm2 save
pm2 startup            # run the command it prints
pm2 logs aroviaskilltech  # view logs
```

On first start the API creates the settings, course catalog, bundles (packages), admin and root member (`ASM100001`).
Check: `curl http://127.0.0.1:5050/api/health` → `{"ok":true,"db":"connected",…}`. It answers **503** while the
database is unreachable, so it can be used by an uptime monitor.

What the server does for the website in production: gzip compression; built files under `/assets` cached for
a year (their names change on every build); `index.html` never cached, so a new deploy shows up immediately;
`/robots.txt` and `/sitemap.xml` (the 7 public pages and every active course) generated from `CLIENT_URL` and the catalog.
Visitors who still have the old version open reload automatically when they navigate.

Run a **single** PM2 instance (not cluster mode): the 12:00 AM scheduler should run once.

## 5. Nginx + HTTPS

`/etc/nginx/sites-available/aroviaskilltech`:

```nginx
server {
    listen 80;
    server_name aroviaskilltechnologies.com www.aroviaskilltechnologies.com;

    client_max_body_size 6m;            # KYC documents and payment screenshots (API limit is 5 MB)

    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/aroviaskilltech /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d aroviaskilltechnologies.com -d www.aroviaskilltechnologies.com
```

The app sets `trust proxy`, so rate limiting and audit IPs use the real client IP from Nginx.
Cookies are `Secure` in production, so the site must be served over HTTPS.

## 6. Alternative: frontend on separate static hosting

The React app calls the API with relative paths (`/api/...`, `/uploads/...`). If you host
`frontend/dist` on a separate static host, that host must **proxy `/api` and `/uploads` on the same
domain** to the Node.js server, and must rewrite unknown paths to `index.html` (SPA routing).
Without such a proxy, use the single-server setup above (recommended).

## 7. Updating the site

```bash
cd /var/www/aroviaskilltech
# pull/copy new code
cd frontend && npm ci && npm run build
cd ../backend && npm ci --omit=dev
pm2 restart aroviaskilltech
```

## 8. Backups

Uploaded files live in **Cloudinary**, so the server itself holds no user files and can be replaced or
redeployed freely. Back up the database:

```bash
# daily via cron, keep 14 days
mongodump --uri "$MONGODB_URI" --db iskillmatrix --gzip --archive=/backups/db-$(date +%F).gz
find /backups -mtime +14 -delete
```

MongoDB Atlas also offers automatic backups. Store copies off the server.

## 9. Go-live checklist

- [ ] `NODE_ENV=production`, `CLIENT_URL=https://aroviaskilltechnologies.com`
- [ ] Strong `JWT_SECRET` and `ADMIN_PASSWORD`
- [ ] `MONGODB_URI` points to the production Atlas cluster; the server's IP is allowed in Atlas → Network Access
- [ ] HTTPS working; `http://` redirects to `https://`
- [ ] SMTP configured and a password-reset email received
- [ ] Admin → System Settings: QR image, UPI ID, payee name, contact details
- [ ] Admin → Course Catalog: course descriptions and curricula replaced with the real content (the defaults are starter text)
- [ ] Admin → Bundles & Income: prices, income amounts, included courses and member benefits reviewed with the client
- [ ] Admin → System Settings → payment instructions say "bundle" (older databases still say "package amount")
- [ ] `https://<your-domain>/sitemap.xml` lists your courses; submit it in Google Search Console
- [ ] Income rules confirmed with the client (royalty basis, monthly slab rule, weekly %)
- [ ] Test registration with the root member code `ASM100001` → log in → pay → approve payment
- [ ] Cloudinary keys set in `.env`; `npm run test:storage` passes on the server
- [ ] Daily backups scheduled
- [ ] `pm2 startup` configured so the site comes back after a reboot
