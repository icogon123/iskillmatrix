# iSkillMatrix — Backend (API)

REST API for the iSkillMatrix linear (unilevel) MLM platform: registration and approval,
QR package payments, KYC, the referral network, the income engine (active, passive, weekly,
monthly bonus, non-working, royalty), wallet ledger, withdrawals, reports and audit log.

| | |
|---|---|
| Runtime | Node.js 20+ (ES modules) |
| Framework | Express 5 |
| Database | MongoDB Atlas via Mongoose 9 |
| Auth | JWT in an httpOnly cookie (`ism_token`), bcrypt password hashes |
| Validation | Zod |
| File storage | Cloudinary (private delivery for documents), Multer in-memory uploads (images / PDF, 5 MB max) |
| Scheduler | node-cron (non-working bonus at 12:00 AM IST) |
| Email | Nodemailer (optional; logs to console when SMTP is not set) |

Detailed documentation lives in [`docs/`](docs/README.md).

---

## 1. Requirements

- **Node.js 20 or newer** (`node -v`)
- **npm 9+**
- **A MongoDB database** — this project uses **MongoDB Atlas**. In Atlas:
  1. **Database Access** → a database user with read/write access.
  2. **Network Access** → add the IP address of every machine that runs the API
     (your computer for development, the server's IP in production).
  3. **Connect → Drivers** → copy the `mongodb+srv://…` connection string.

---

## 2. Install

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:

| Variable | What to put |
|----------|-------------|
| `MONGODB_URI` | Your Atlas connection string (`mongodb+srv://user:password@cluster…mongodb.net/?retryWrites=true&w=majority`) |
| `MONGODB_DB_NAME` | Database name inside the cluster (default `iskillmatrix`) |
| `JWT_SECRET` | 32+ random characters (`openssl rand -hex 32`) |
| `ADMIN_PASSWORD` | Strong password for the first administrator (8+ chars, letter, number, symbol) |
| `ROOT_PASSWORD` | Optional login password for the company root member `ISM100001` |
| `CLIENT_URL` | Where the website runs (`http://localhost:5173` in development) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From the Cloudinary dashboard — required for payment proofs, KYC documents and the QR code |
| `SMTP_*` | Your email server, so password-reset and notification emails are delivered |

`.env` contains secrets and is git-ignored — never commit it or share it.
All variables are explained in [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md).

---

## 3. Run

### Development

```bash
npm run dev
```

- API: **http://localhost:5050/api** (health check: `/api/health`)
- Restarts automatically when files change (`node --watch`).
- On the first start against an empty database it creates the default settings, the 10 catalog courses, the 5 packages (course bundles),
  the administrator and the company root member **ISM100001** (the first sponsor code). Existing data
  is never overwritten. There is no demo data.

> Port 5000 is used by AirPlay Receiver on macOS, so the default port is **5050**.

### Production

```bash
npm ci --omit=dev
NODE_ENV=production npm start
```

In production the API also serves the built frontend (`../frontend/dist`) so the whole site
runs from one port. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 4. npm scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the API with auto-reload |
| `npm start` | Start in production mode (`NODE_ENV=production`) |
| `npm run seed` | Create the base data (settings, packages, admin, root member) without starting the server |
| `npm run test:engine` | 17 end-to-end checks of the income engine against a throwaway in-memory database (never touches Atlas) |
| `npm run test:prod` | Pre-deploy check of the production server (build the frontend first): caching, gzip, SPA routing, health check, robots/sitemap, secure cookies. In-memory database |
| `npm run test:storage` | Checks Cloudinary: private upload, not publicly reachable, download through the API, public QR upload; cleans up after itself |
| `npm run migrate:uploads` | Moves files saved on disk before Cloudinary into Cloudinary and updates the records (`-- --dry-run`, `-- --delete-local`) |

---

## 5. Accounts

| Account | Login page | Username | Password |
|---------|-----------|----------|----------|
| Administrator | `/admin/login` | `ADMIN_USERNAME` (`admin`) | `ADMIN_PASSWORD` from `.env` |
| Company root member `ISM100001` | `/login` | `iskillmatrix` or `ISM100001` | `ROOT_PASSWORD` from `.env` |

These two accounts are created once, on the first start. Changing `.env` afterwards does not change
them: the admin changes their password from the key icon in the admin sidebar, and the admin can reset
any member's password (including the root member) from **Members → member → Reset password**.

Every other account is a real member who registers through the website and is approved by the admin.

---

## 6. Folder structure

```
backend/
├── .env.example            Environment template (copy to .env)
├── package.json
├── docs/                   Documentation (start at docs/README.md)
├── uploads/                Legacy local files only (before Cloudinary); new uploads go to Cloudinary
└── src/
    ├── server.js           Entry point: connect DB → seed base data → start scheduler → listen
    ├── app.js              Express app: security headers, CORS, JSON, cookies, routes, errors, SPA serving
    ├── config/
    │   ├── env.js          Reads environment variables; fails fast if MONGODB_URI / JWT_SECRET are missing
    │   ├── db.js           MongoDB Atlas connection (MONGODB_URI + MONGODB_DB_NAME)
    │   └── paths.js        Absolute paths: uploads, frontend/dist
    ├── routes/
    │   └── index.js        Every API route with its middleware (auth, role, validation, uploads)
    ├── middleware/
    │   ├── auth.js         JWT cookie issue/verify, account-status check, role guard
    │   ├── upload.js       Multer in-memory uploads, type/size limits (files then go to Cloudinary)
    │   ├── validate.js     Zod body validation
    │   └── error.js        404 and central error handler
    ├── controllers/        HTTP layer: read request → call services → shape response
    │   ├── authController.js       Register, login, logout, me, forgot/reset/change password
    │   ├── publicController.js     Packages, sponsor lookup, public site/plan info
    │   ├── memberController.js     Member dashboard, avatar, payments, KYC, team, income, wallets, transfers, deposits, withdrawals
    │   ├── adminController.js      Admin dashboard, registrations, members
    │   ├── adminOpsController.js   KYC review (Aadhaar check), payment and deposit verification, withdrawals, income runs
    │   ├── adminConfigController.js Packages, settings, ledger, audit log, network tree
    │   ├── reportController.js     12 reports (JSON rows + columns + totals)
    │   ├── filesController.js      Streams private files from Cloudinary after an owner/admin check
    │   └── validators.js           Zod schemas (registration, login, KYC, withdrawal, transfer, wallet purchase, passwords)
    ├── services/           Business logic (no HTTP)
    │   ├── incomeEngine.js         Package activation payouts + non-working run
    │   ├── runService.js           Weekly / monthly bonus / royalty generation, approve, cancel
    │   ├── ledgerService.js        Ledger entries, idempotency, per-wallet balances, wallet statement, income totals
    │   ├── badgeService.js         Lifetime earnings and permanent badges
    │   ├── paymentService.js       Submit / approve / reject package payments, GST split
    │   ├── withdrawalService.js    Request, cancel, admin status flow, wallet suspension
    │   ├── walletService.js        Wallet lock, transfers, wallet-paid bundles / P2P activation, member lookup
    │   ├── depositService.js       Fund deposits: submit, approve (→ Activation Wallet), reject
    │   ├── teamService.js          Team stats, level summary, tree nodes
    │   ├── settingsService.js      Cached settings, versioned updates
    │   ├── notificationService.js  Dashboard notifications (+ optional email)
    │   ├── storageService.js       Cloudinary upload / private download / delete, file-type check
    │   ├── mailService.js          SMTP sender
    │   └── auditService.js         Audit log writer
    ├── models/             Mongoose schemas (see docs/DATABASE.md)
    ├── jobs/
    │   └── scheduler.js    Daily 12:00 AM IST non-working bonus credit + startup catch-up
    ├── scripts/
    │   ├── baseData.js     Default packages, first admin and root member (first run only)
    │   ├── courseData.js   Default course catalog and the courses in each bundle
    │   ├── seed.js         `npm run seed`
    │   ├── migrateUploads.js  `npm run migrate:uploads` — move old local files to Cloudinary
    │   ├── storageCheck.js `npm run test:storage` — verify the Cloudinary setup
    │   ├── engineCheck.js  `npm run test:engine` (in-memory test database)
    │   └── prodCheck.js    `npm run test:prod` (production server check, in-memory database)
    └── utils/              Money rounding, IST date helpers, IDs, masking, pagination, AppError
```

---

## 7. Documentation

| Document | Contents |
|----------|----------|
| [docs/README.md](docs/README.md) | Index |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, request lifecycle, security, design decisions |
| [docs/API.md](docs/API.md) | Every endpoint with auth, parameters and responses |
| [docs/DATABASE.md](docs/DATABASE.md) | Collections, fields, indexes, ID formats |
| [docs/INCOME_ENGINE.md](docs/INCOME_ENGINE.md) | Business rules and calculations with worked examples |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables and admin settings |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production setup, Nginx, PM2, backups, go-live checklist |

---

## 8. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Missing required setting(s) in backend/.env` | Copy `.env.example` to `.env` and fill in `MONGODB_URI` and `JWT_SECRET`. |
| `Could not connect to MongoDB … Network Access` | In Atlas → Network Access, add this machine's IP address. Check the user name/password in `MONGODB_URI`. |
| `No administrator exists yet. Set a strong ADMIN_PASSWORD` | Set `ADMIN_PASSWORD` (8+ characters with a letter, a number and a symbol) and start again. |
| `EADDRINUSE` on 5050 | Another process uses the port. Change `PORT` in `.env` and `VITE_API_PROXY` for the frontend. |
| Emails not delivered | `SMTP_HOST` is empty. In development the email text is printed in the server console. |
| "File uploads are not available yet (storage not configured)" | Set the three `CLOUDINARY_*` values in `.env`, restart, and run `npm run test:storage`. |
| Forgot the admin password | Use **Forgot password?** on the login page with the admin username (needs SMTP and `ADMIN_EMAIL`). |
