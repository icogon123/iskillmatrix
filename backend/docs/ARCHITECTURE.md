# Backend architecture

## 1. Layers

```
HTTP request
   │
   ▼
routes/index.js ──► middleware (rate limit → authenticate → requireRole → upload → validate)
   │
   ▼
controllers/*  ── read req, call services, shape JSON (no business rules here)
   │
   ▼
services/*     ── business rules: income engine, ledger, withdrawals, runs, badges, settings
   │
   ▼
models/*       ── Mongoose schemas + indexes (MongoDB)
```

| Layer | Rule of thumb |
|-------|---------------|
| **Routes** | Only wiring. Every endpoint and its guards are visible in one file. |
| **Controllers** | Thin. Parse query/params, call a service or a query, return JSON. |
| **Services** | All money logic. Callable from controllers, scripts and the scheduler alike (the engine check calls them directly). |
| **Models** | Data shape, indexes and unique keys that enforce correctness (e.g. idempotency keys). |

Errors are thrown as `AppError(message, status)` and turned into JSON by `middleware/error.js`.
Express 5 forwards errors from `async` handlers automatically, so controllers have no `try/catch`.

## 2. Startup sequence (`src/server.js`)

1. `assertServerEnv()` — stops with a clear message if `MONGODB_URI` or `JWT_SECRET` is missing.
   `connectDB()` — connects to MongoDB Atlas (`MONGODB_URI`, database `MONGODB_DB_NAME`); a failed connection
   explains the usual causes (wrong password, IP not allowed in Atlas Network Access).
2. `ensureBaseData()` — idempotently creates the settings document, the 10 catalog courses, the 5 packages (and their course lists), the first admin
   (requires a strong `ADMIN_PASSWORD`; there is no default password) and the company root member.
   Existing data is never overwritten. No demo or sample data is ever created.
3. `startScheduler()` — registers the 12:00 AM IST cron job and immediately credits any
   non-working bonuses that became due while the server was down.
4. Logs a warning if SMTP is not configured, then `app.listen(PORT)`.
5. `SIGINT` / `SIGTERM` close the server and the database cleanly.

## 3. Request lifecycle example — "Admin approves a payment"

```
POST /api/admin/payments/:id/approve
  authenticate        → verify JWT cookie, load user, check tokenVersion and status === 'active'
  requireRole('admin')
  adminOpsController.approvePayment
    paymentService.approvePayment
      1. Payment pending → approved            (atomic findOneAndUpdate, refuses if not pending)
      2. User.package null → package            (atomic; rolls the payment back if already active)
      3. incomeEngine.distributePackageIncome   (active, non-working, passive entries)
           ledgerService.createEntry × N        (unique idempotencyKey per entry)
             badgeService.addLifetimeEarnings   (for qualifying income)
             notificationService.notify
      4. notify buyer, write audit log
  ← 200 { message, payment }
```

## 4. Authentication and sessions

- Login sets an **httpOnly, SameSite=Lax** cookie `ism_token` (Secure in production) holding a JWT
  `{ sub: userId, v: tokenVersion, role }`, valid for `JWT_EXPIRES_IN` (default 1 day).
- A `Authorization: Bearer <token>` header is also accepted (useful for API testing).
- Every authenticated request reloads the user and checks:
  - `tokenVersion` matches — changing or resetting a password increments it and ends all other sessions;
  - `status === 'active'` — suspending or deactivating a member blocks them immediately.
- Roles: `member` and `admin`. Member routes are under `/api/member/*`, admin routes under `/api/admin/*`.
- Login is refused with a clear message for `pending`, `rejected` (with reason), `inactive` and `suspended` accounts.

## 5. Security measures

| Area | Measure |
|------|---------|
| Passwords | bcrypt (cost 10). Login and transaction passwords stored separately; the transaction password must differ from the login password. |
| Brute force | `express-rate-limit`: 50 requests / 15 min per IP on register, login, forgot and reset password. |
| Headers | `helmet` (CSP disabled because the SPA loads Google Fonts). |
| CORS | Only `CLIENT_URL`, with credentials. |
| Input | Zod schemas on all write bodies; Express 5 "simple" query parser (no nested objects → no Mongo operator injection via query strings); search terms are regex-escaped. |
| Uploads | JPG/PNG/WEBP/PDF only, checked by the file's actual content (not just its name), 5 MB, max 5 files. Kept in memory and sent to **Cloudinary**. KYC documents and payment proofs use Cloudinary's *private* delivery type (no public URL). They are viewed only through `GET /api/files/:ref`, which checks that the viewer is the owner or an admin and streams the file using a signed download link valid for 2 minutes. Uploads are made after form validation, and removed again if saving the record fails. |
| Sensitive data | Aadhaar, PAN and bank account numbers are masked in member-facing responses. Admins see full values (masked by default in the UI with a "Reveal" toggle). |
| Password reset | Random 32-byte token, only its SHA-256 hash is stored, valid 30 minutes; the response never reveals whether an account exists. |
| CSRF | SameSite=Lax cookie + JSON/multipart API; cross-site POSTs don't carry the cookie. |
| Errors | 5xx messages are generic in production; details only in server logs. |

## 6. Money correctness

| Concern | How it is handled |
|---------|-------------------|
| Balance source of truth | The `ledgers` collection. `getBalance()` sums completed credits minus completed debits. There is no stored balance that can drift. |
| Duplicate payouts | Every payout has a unique `idempotencyKey` (e.g. `ACTIVE:<paymentId>`, `PASSIVE:<paymentId>:L3`, `WEEKLY:<week>:<user>`). A repeat insert hits the unique index and is ignored. |
| Double approval | Status changes use conditional atomic updates (`findOneAndUpdate({ status: 'pending' } …)`). A second click gets `409`. |
| Concurrent wallet debits | A per-member `walletLock` (30 s lease, `withWalletLock` in `walletService.js`) wraps the balance check + debit for withdrawals, transfers and wallet purchases. Verified by tests that fire 3 simultaneous withdrawals / transfers. |
| Two wallets | Every ledger entry belongs to the `main` or `activation` wallet; each balance is summed separately. Activation money can only leave through a bundle purchase. |
| One package per member | `payments.userLock` (unique, sparse) allows only one pending/approved payment (UPI or wallet); `utrLock` stops reuse of a UTR, checked across payments and deposits. Cleared on rejection. |
| One run per period | `incomeruns.activeKey` (`weekly:2026-09-21`) is unique while the run is not cancelled. |
| Rule changes | Ledger entries store the computed amount and the `settingsVersion`; changing settings never recalculates history. |
| Rounding | All amounts rounded to 2 decimals (`utils/money.js`). |
| Time zone | Days, weeks (Mon–Sun) and months are computed in IST (`utils/dates.js`), independent of server time zone. |

## 7. Scheduled job

`jobs/scheduler.js` runs `0 0 * * *` in `Asia/Kolkata`:
credits every pending `non_working` ledger entry whose `scheduledFor` ≤ now (if
*Settings → Income rules → Auto-credit non-working bonus* is on). A second job at `5 0 * * 1`
(Monday 12:05 AM IST) generates last week's weekly pool run and, with `weekly.autoApprove`, credits it
(`runService.autoProcessWeekly`); it skips any week that already has a run, including a cancelled one.
Monthly bonus and royalty are **not** automatic — they need admin review.

If you run more than one API instance, run the scheduler on one instance only (or keep the
default single instance). The job is idempotent, so an accidental double run credits nothing twice.

## 8. Notifications and email

`notificationService.notify()` writes a dashboard notification and, for important events
(approval, payment, KYC, withdrawal, badge), also emails the member. `mailService` sends via SMTP
when `SMTP_HOST` is set; otherwise it prints the email to the console in development.
Notification failures are logged and never roll back a financial action.

## 9. Audit log

`auditService.audit()` records: member/admin logins, registration submitted/approved/rejected,
member status changes and profile edits, password resets, KYC decisions, payment approvals and
rejections, wallet adjustments, withdrawal requests and status changes, income runs generated,
approved and cancelled, non-working processing, badge achievements, package edits and settings
changes. Each entry has actor, role, action, entity, details and IP.

## 10. Testing

`npm run test:engine` (`src/scripts/engineCheck.js`) starts a throwaway in-memory MongoDB (it never
connects to Atlas or reads real data) and
verifies, with exact rupee amounts:

- active income, passive levels (Level 1 = sponsor's sponsor), non-working scheduling;
- idempotency (re-running distribution, double approval, second live payment);
- lapsed income for suspended uplines; rejected payments allow resubmission;
- badges from lifetime earnings;
- withdrawal charges, KYC and transaction-password checks, insufficient balance, reject/cancel refunds,
  paid-with-reference, and concurrent requests;
- weekly pool split equally among qualified members (inactive excluded, paisa rounding), automatic processing,
  duplicate and unfinished-week protection, cancel and regenerate;
- wallet suspension blocking withdrawals and payouts;
- two wallets: income lands in Main; transfers to own / upline / downline Activation Wallet (other branches and the root
  refused); Activation money can't be withdrawn or transferred; wallet purchases and P2P activation pay income like an
  approved UPI payment; deposits credit once and a rejected deposit frees its UTR; suspension blocks transfers and
  purchases; concurrent transfers can't overdraw; statement before/after balances chain correctly on every page;
- monthly slab boundaries (strictly greater than);
- royalty on team income;
- ledger balance consistency for every member, per wallet.
