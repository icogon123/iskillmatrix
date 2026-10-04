# iSkillMatrix — Linear (Unilevel) MLM Platform

Public website, member panel and admin panel for iSkillMatrix, built from the
*System Requirements Document — MLM / Direct Selling Management System*.

| Layer     | Tech |
|-----------|------|
| Frontend  | React 19, Redux Toolkit (+ RTK Query), React Router 7, Tailwind CSS 4, Recharts, Vite 8 |
| Backend   | Node.js, Express 5, Mongoose 9, JWT (httpOnly cookie), Multer, node-cron, Zod |
| Database  | MongoDB (an embedded MongoDB is used automatically in development) |

```
iskillmatrix/
├── backend/    Express API, income engine, schedulers, seed scripts
│   ├── README.md   install, run, scripts, folder structure
│   └── docs/       architecture, API, database, income engine, configuration, deployment
└── frontend/   React app: website + member panel (/app) + admin panel (/admin)
    ├── README.md   install, run, build, folder structure
    └── docs/       architecture, state management, UI & theme, pages, user guide
```

## Documentation

| Backend | Frontend |
|---------|----------|
| [README — install & run](backend/README.md) | [README — install & run](frontend/README.md) |
| [Architecture](backend/docs/ARCHITECTURE.md) | [Architecture](frontend/docs/ARCHITECTURE.md) |
| [API reference](backend/docs/API.md) | [State management (Redux)](frontend/docs/STATE_MANAGEMENT.md) |
| [Database](backend/docs/DATABASE.md) | [UI, theme & components](frontend/docs/UI_AND_THEME.md) |
| [Income engine & business rules](backend/docs/INCOME_ENGINE.md) | [Pages & routes](frontend/docs/PAGES.md) |
| [Configuration](backend/docs/CONFIGURATION.md) | [User guide (members & admins)](frontend/docs/USER_GUIDE.md) |
| [Deployment](backend/docs/DEPLOYMENT.md) | |

---

## 1. Run it locally

Requires Node.js 20+. No MongoDB install is needed for development.

```bash
# Terminal 1 — API on http://localhost:5050
cd backend
npm install
cp .env.example .env        # then set JWT_SECRET, ADMIN_PASSWORD
npm run seed:demo           # optional: demo network with income, KYC, withdrawals
npm run dev

# Terminal 2 — website on http://localhost:5173
cd frontend
npm install
npm run dev
```

With `MONGODB_URI=memory` (the default in `.env.example`) the API starts an embedded
MongoDB whose data is kept in `backend/.data`. Delete that folder to start fresh.

> Port 5000 is taken by AirPlay Receiver on macOS, so the API uses **5050**.

### Logins

| Who | Where | Username | Password |
|-----|-------|----------|----------|
| Administrator | `/admin/login` | `ADMIN_USERNAME` from `.env` (`admin`) | `ADMIN_PASSWORD` from `.env` |
| Company root member (first sponsor, `ISM100001`) | `/login` | `iskillmatrix` | same as `ADMIN_PASSWORD` |
| Demo member (after `seed:demo`) | `/login` | `rajesh` | `Demo@1234` (transaction password `Txn@1234`) |

The admin and root member are created automatically on first start. **Change the admin
password before going live.** All demo members share the demo passwords.

### Checks

```bash
cd backend && npm run test:engine   # 17 end-to-end checks of the income engine (throwaway DB)
cd frontend && npm run build        # production build
```

---

## 2. What is included

**Website** — Home, About, Income Plan (package model diagrams, level table, weekly/monthly/
working bonus, badges & royalty, withdrawal example), Packages, Contact, Login, Join Now.

**Member panel (`/app`)** — dashboard in the requested dark/violet style (total income, wallet,
today/this month, rank progress, team overview, last-7-days chart, weekly qualification),
package activation by QR + UTR + screenshot, KYC (Aadhaar, PAN, bank), My Team (level-wise),
genealogy tree, income ledger by type, wallet ledger, withdrawals (TDS/admin charge preview,
transaction password, cancel), achievements, referral link/code sharing, notifications,
profile, login/transaction password change, forgot/reset password.

**Admin panel (`/admin`)** — dashboard (member, package and financial stats incl. GST and
system tax income, wallet liability, approval queues, daily charts), registration approval/
rejection with reason, members (search, filters, profile, network, ledger, status
activate/deactivate/suspend, wallet credit/debit, password reset), KYC review with documents,
payment verification, withdrawals (approve → processing → paid with reference / reject with
automatic refund), income processing (non-working, weekly, monthly bonus, royalty), network
tree, financial ledger, 11 reports with CSV (Excel) export and print/PDF, packages & income
rules editor, system settings (QR, UPI, tax, weekly, monthly slabs, badges, royalty,
withdrawal rules) with version history, and an audit log.

---

## 3. Business rules as implemented

Everything below is editable in **Admin → Packages & Income** or **Admin → System Settings**.
Settings are versioned; every ledger entry stores the amount it was created with, so past
transactions are never recalculated.

| Rule | Implementation |
|------|----------------|
| Plan | Unilevel sponsor tree: unlimited direct referrals, levels follow the sponsor chain |
| Registration | Referral link (`/register?ref=ISM…`) or code; admin approval required before login |
| Payment | QR / UPI, member submits UTR + screenshot, admin verifies; one live payment per member; a UTR can't be reused; no package upgrades |
| Package price split | Customer price includes GST 18% + system cost 12%; remainder = package cost (₹910 / 2,100 / 3,500 / 7,700 / 13,020) |
| Active income | Direct sponsor: ₹800 / 1,500 / 2,000 / 4,500 / 7,000, credited when the payment is approved |
| Passive income | Level 1 = **sponsor's sponsor**, then up the chain. Starter 1, Basic 2, Standard 5, Premium 7, Pro 12 levels, amounts as in the package diagrams |
| Non-working bonus | ₹200 / 500 / 1,000 on Standard / Premium / Pro sales, to the **direct sponsor**, credited at the 12:00 AM IST run |
| Weekly income | Mon–Sun (IST). Every full set of 3 same-package direct sales (Standard/Premium/Pro) qualifies; pays **5% × qualifying sales × package price** (3 = 1×, 6 = 2×, 9 = 3×). Admin generates, reviews, approves |
| Monthly bonus | Highest slab of the month's Active income: > ₹20,000 → ₹1,500, > ₹50,000 → ₹4,000, > ₹1,00,000 → ₹10,000 (strictly greater; switchable to ≥) |
| Badges | Lifetime Active + Passive income, Bronze ₹5,000 … Sapphire Director ₹1 crore; permanent once achieved |
| Royalty | Emerald 5%, Sr. Emerald 6%, Director 7%, Sr. Director 8%, Sapphire 10% of the month's **team (downline) Active + Passive income** (switchable to the member's own income) |
| Eligibility | Income for an upline who is not active or has no package is recorded as *lapsed*, not credited (switchable) |
| Wallet | Balance is always derived from the ledger (completed credits − debits) |
| Withdrawal | Approved KYC + transaction password; min ₹500 / max ₹1,00,000; TDS 2% + admin 5% of the requested amount (₹10,000 → ₹9,300). The amount is held on request and returned if rejected/cancelled |
| Duplicates | Unique idempotency keys on every payout (package activation, bonuses, runs, withdrawals); one live run per period; atomic status transitions; per-member wallet lock |

### Assumptions to confirm with the client

- The spec and the webinar deck differ in places (monthly first slab ₹20,000 vs ₹24,000;
  Premium/Pro deep-level amounts). The **spec values** are used.
- Royalty basis defaults to *team* income. Weekly income uses the customer price as the sale value.
- The course list per package on the Packages page is placeholder text; edit it under
  Admin → Packages & Income.

---

## 4. Deploying to iskillmatrix.com

1. **MongoDB** — create a database (e.g. MongoDB Atlas, or MongoDB on your server).
2. **Build the frontend**
   ```bash
   cd frontend && npm ci && npm run build      # creates frontend/dist
   ```
3. **Configure the API** — `backend/.env`:
   ```env
   NODE_ENV=production
   PORT=5050
   CLIENT_URL=https://iskillmatrix.com
   MONGODB_URI=mongodb+srv://USER:PASS@cluster/iskillmatrix
   JWT_SECRET=<long random string>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<strong password>
   SMTP_HOST=...   # optional, for password-reset and notification emails
   ```
4. **Start the API** (it also serves `frontend/dist`, so the whole site runs on one port):
   ```bash
   cd backend && npm ci --omit=dev && npm start      # or: pm2 start src/server.js --name iskillmatrix
   ```
5. **Reverse proxy + HTTPS** — point Nginx (or your host's proxy) for `iskillmatrix.com` to
   `http://127.0.0.1:5050` and enable SSL (e.g. Let's Encrypt). Set `client_max_body_size 6m;`
   for document uploads.
6. **Back up** the database and `backend/uploads/` (KYC documents, payment proofs, QR image).
7. **Before launch**, in the admin panel: upload the payment QR, set UPI ID, contact details,
   and review package benefits and income settings.
