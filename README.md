# AroviaSkillTech — Linear (Unilevel) MLM Platform

Public website, member panel and admin panel for AroviaSkillTech, built from the
*System Requirements Document — MLM / Direct Selling Management System*.

| Layer     | Tech |
|-----------|------|
| Frontend  | React 19, Redux Toolkit (+ RTK Query), React Router 7, Tailwind CSS 4, Recharts, Vite 8 |
| Backend   | Node.js, Express 5, Mongoose 9, JWT (httpOnly cookie), Cloudinary (file storage), node-cron, Zod |
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

Requires Node.js 20+ and a MongoDB database (this project uses **MongoDB Atlas**).

```bash
# Terminal 1 — API on http://localhost:5050
cd backend
npm install
cp .env.example .env        # set MONGODB_URI, JWT_SECRET, ADMIN_PASSWORD (see backend/README.md)
npm run dev

# Terminal 2 — website on http://localhost:5173
cd frontend
npm install
npm run dev
```

On the first start the API connects to MongoDB and creates the settings, the 10 catalog courses, the 5 packages (course bundles), the
administrator and the company root member. There is no demo or sample data: every member, payment
and transaction is real and stored in the database.

> Port 5000 is taken by AirPlay Receiver on macOS, so the API uses **5050**.
> In MongoDB Atlas → **Network Access**, allow the IP address of every machine/server that runs the API.

### Logins

| Who | Where | Username | Password |
|-----|-------|----------|----------|
| Administrator | `/admin/login` | `ADMIN_USERNAME` from `backend/.env` (`admin`) | `ADMIN_PASSWORD` from `backend/.env` |
| Company root member `ISM100001` (first sponsor code) | `/login` | `aroviaskilltech` or `ISM100001` | `ROOT_PASSWORD` from `backend/.env` |
| Members | `/login` | their username or member ID | chosen at registration (can log in right away) |

`ADMIN_PASSWORD` / `ROOT_PASSWORD` are only used when those accounts are first created. After that,
the admin changes their password with the key icon in the admin sidebar, and members from
Profile & Security.

### Checks

```bash
cd backend && npm run test:engine   # 17 end-to-end checks of the income engine (throwaway in-memory DB, never touches Atlas)
cd frontend && npm run build        # production build
```

---

## 2. What is included

**Website** — an e-learning store with no income content: Home (course search, topics, popular courses, why us,
vision & mission, FAQ), course catalog with search and category filter, course pages (curriculum, bundles that
include the course), Why Us, Vision & Mission, Pricing (bundles + comparison table, linked from the footer),
About, Contact, Login, Join Now. Packages are shown as
**course bundles**; the income plan is in the member panel (Income Plan).

**Member panel (`/app`)** — dashboard in the requested dark/violet style (total income, Main and Activation
Wallet, today / last 7 days / this month / weekly income, rank card with profile picture, team overview,
last-7-days chart, weekly qualification), My Courses (courses in the member's bundle), bundle activation by
QR + UTR + screenshot or from a wallet, P2P activation of another member by username, deposits (credited to the
Activation Wallet after admin verification), transfers (Main Wallet → own or upline/downline Activation Wallet),
income plan, KYC (Aadhaar, PAN, bank), My Team (level-wise), genealogy tree, income ledger by type, wallet
statement with balance before/after (CSV / print), withdrawals (TDS/admin charge preview,
transaction password, cancel), achievements, referral link/code sharing, notifications,
profile, login/transaction password change, forgot/reset password.

**Admin panel (`/admin`)** — dashboard (member, package and financial stats incl. GST and
system tax income, wallet liability, approval queues, daily charts), registration approval/
rejection with reason, members (search, filters, profile, network, ledger, status
activate/deactivate/suspend, credit/debit on either wallet, password reset), KYC review with documents and an
Aadhaar check against registration, payment verification, fund deposit verification, withdrawals (approve → processing → paid with reference / reject with
automatic refund), income processing (non-working, weekly, monthly bonus, royalty), network
tree, financial ledger, 11 reports with CSV (Excel) export and print/PDF, course catalog editor, bundles & income
rules editor, system settings (QR, UPI, tax, weekly, monthly slabs, badges, royalty,
withdrawal rules) with version history, and an audit log.

---

## 3. Business rules as implemented

Everything below is editable in **Admin → Bundles & Income** or **Admin → System Settings**. Courses are
edited in **Admin → Course Catalog**.
Settings are versioned; every ledger entry stores the amount it was created with, so past
transactions are never recalculated.

| Rule | Implementation |
|------|----------------|
| Plan | Unilevel sponsor tree: unlimited direct referrals, levels follow the sponsor chain |
| Registration | Referral link (`/register?ref=ISM…`) or code, or **Join Member** in the member panel; no admin approval, the member can log in at once. The ID is *activated* by buying a first bundle; only activated members can sponsor new members |
| Payment | QR / UPI, member submits UTR + screenshot, admin verifies; one live payment per member; a UTR can't be reused; no package upgrades |
| Package price split | Customer price includes GST 18% + system cost 12%; remainder = package cost (₹910 / 2,100 / 3,500 / 7,700 / 13,020) |
| Active income | Direct sponsor: ₹800 / 1,500 / 2,000 / 4,500 / 7,000, credited when the payment is approved |
| Passive income | Level 1 = **sponsor's sponsor**, then up the chain. Starter 1, Basic 2, Standard 5, Premium 7, Pro 12 levels, amounts as in the package diagrams |
| Non-working bonus | ₹200 / 500 / 1,000 on Standard / Premium / Pro sales, to the **direct sponsor**, credited at the 12:00 AM IST run |
| Weekly income | Mon–Sun (IST). **5% of the company's bundle sales in the week** goes into a pool, shared **equally** by every active member with 3 same-bundle direct sales (Standard/Premium/Pro) that week. Generated and credited automatically on Monday 12:05 AM IST (auto-credit can be turned off to approve manually); live pool on Income Processing |
| Monthly bonus | Highest slab of the month's Active income: > ₹20,000 → ₹1,500, > ₹50,000 → ₹4,000, > ₹1,00,000 → ₹10,000 (strictly greater; switchable to ≥) |
| Badges | Lifetime Active + Passive income, Bronze ₹5,000 … Sapphire Director ₹1 crore; permanent once achieved |
| Royalty | Emerald 5%, Sr. Emerald 6%, Director 7%, Sr. Director 8%, Sapphire 10% of the month's **team (downline) Active + Passive income** (switchable to the member's own income) |
| Eligibility | Income for an upline who is not active or has no package is recorded as *lapsed*, not credited (switchable) |
| Wallets | Two per member, each derived from the ledger (completed credits − debits). **Main**: all income; withdraw, transfer, buy bundles. **Activation**: deposits and transfers received; only buys bundles (self or P2P). Transfers go to your own or an upline/downline member's Activation Wallet |
| Withdrawal | Approved KYC + transaction password; min ₹500 / max ₹1,00,000; TDS 2% + admin 5% of the requested amount (₹10,000 → ₹9,300). The amount is held on request and returned if rejected/cancelled |
| Duplicates | Unique idempotency keys on every payout and wallet move (package activation, bonuses, runs, withdrawals, deposits, transfers, wallet purchases); one live run per period; atomic status transitions; per-member wallet lock |

### Assumptions to confirm with the client

- The spec and the webinar deck differ in places (monthly first slab ₹20,000 vs ₹24,000;
  Premium/Pro deep-level amounts). The **spec values** are used.
- Royalty basis defaults to *team* income. The weekly pool uses the amount received for bundles (configurable: after GST and system cost).
- The course descriptions and curricula are starter content; edit them under Admin → Course Catalog, and
  which courses each bundle includes under Admin → Bundles & Income.

---

## 4. Deploying to aroviaskilltech.com

1. **MongoDB** — create a database (e.g. MongoDB Atlas, or MongoDB on your server).
2. **Build the frontend**
   ```bash
   cd frontend && npm ci && npm run build      # creates frontend/dist
   ```
3. **Configure the API** — `backend/.env`:
   ```env
   NODE_ENV=production
   PORT=5050
   CLIENT_URL=https://aroviaskilltech.com
   MONGODB_URI=mongodb+srv://USER:PASS@cluster/iskillmatrix
   JWT_SECRET=<long random string>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<strong password>
   SMTP_HOST=...   # optional, for password-reset and notification emails
   ```
4. **Start the API** (it also serves `frontend/dist`, so the whole site runs on one port):
   ```bash
   cd backend && npm ci --omit=dev && npm start      # or: pm2 start src/server.js --name aroviaskilltech
   ```
5. **Reverse proxy + HTTPS** — point Nginx (or your host's proxy) for `aroviaskilltech.com` to
   `http://127.0.0.1:5050` and enable SSL (e.g. Let's Encrypt). Set `client_max_body_size 6m;`
   for document uploads.
6. **Back up** the database (uploaded files are stored in Cloudinary).
7. **Before launch**, in the admin panel: upload the payment QR, set UPI ID, contact details,
   and review package benefits and income settings.
