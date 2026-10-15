# API reference

Base URL: `/api` (development: `http://localhost:5050/api`; through the Vite dev server: `http://localhost:5173/api`).

## Conventions

| Topic | Rule |
|-------|------|
| Format | JSON request and response bodies, except uploads (`multipart/form-data`). |
| Auth | httpOnly cookie `ism_token` set by `POST /auth/login`. Send requests with credentials (`fetch(…, { credentials: 'include' })`). `Authorization: Bearer <jwt>` also works. |
| Access column | **Public** = no login · **User** = any logged-in active account · **Member** = role `member` · **Admin** = role `admin`. |
| Money | Indian Rupees as numbers with up to 2 decimals. |
| Dates | ISO 8601 strings (UTC). Query dates `from`/`to` are `YYYY-MM-DD` interpreted in IST; months are `YYYY-MM`. |
| Pagination | Query `page` (default 1) and `limit` (default 20, max 200). Response: `{ items, total, page, limit, pages }`. |
| Errors | `{ "message": "…" }`. Validation errors (422) add `errors: [{ field, message }]`. |

| Status | Meaning |
|--------|---------|
| 400 | Bad input / business rule (e.g. "Insufficient balance") |
| 401 | Not logged in, wrong password, session expired |
| 403 | Logged in but not allowed (wrong role, account not active) |
| 404 | Not found |
| 409 | Conflict / already processed (double approval, duplicate run, UTR reused) |
| 422 | Validation failed |
| 429 | Too many attempts (rate limit) |

---

## 1. Health and public

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/health` | Public | `{ ok, db: 'connected' \| 'disconnected', time }` — 503 while the database is unreachable |
| GET | `/public/packages` | Public | Active packages (shown as course bundles) and tax rates |
| GET | `/public/courses` | Public | Active catalog courses, each with the active bundles that include it |
| GET | `/public/sponsor/:code` | Public | Look up a sponsor by member ID or username |
| GET | `/public/site` | Public | Site contact info and plan parameters for the website |

**GET /public/packages** →
```json
{
  "packages": [{
    "_id": "…", "key": "standard", "name": "Standard", "price": 5000,
    "activeIncome": 2000, "passiveLevels": [300, 50, 100, 150, 25], "passiveTotal": 625,
    "nonWorkingBonus": 200, "weeklyEligible": true, "description": "…", "benefits": ["…"],
    "courses": ["communication-skills", "personal-branding", "…"]
  }],
  "tax": { "gstPercent": 18, "systemCostPercent": 12 }
}
```

**GET /public/courses** →
```json
{
  "courses": [{
    "_id": "…", "slug": "graphic-design", "title": "Graphic Design", "category": "Design & Video", "level": "Beginner",
    "icon": "palette", "summary": "…", "description": "…", "outcomes": ["…"],
    "modules": [{ "title": "Design fundamentals", "topics": ["…"] }],
    "bundles": [{ "key": "basic", "name": "Basic", "price": 3000 }, "…cheapest first"]
  }]
}
```

**GET /public/sponsor/ISM100001** → `{ "memberId": "ISM100001", "fullName": "AroviaSkillTech" }` · 404 if not found or not active, or if the sponsor has not bought a bundle yet (ID not activated; the message says so).

**GET /public/site** → `{ site: { name, tagline, email, phone, whatsapp, address }, plan: { weekly, monthlyBonus, badges, royalty, withdrawal: { tdsPercent, adminChargePercent, min } } }`

---

## 2. Authentication

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/auth/register/send-otp` | Public (rate-limited) | Email a 6-digit code that verifies the new member's address |
| POST | `/auth/register` | Public (rate-limited) | Create an account (status `active`, can log in at once). Sponsor must be active **and** own a bundle, else 400 |
| GET | `/auth/check-username?username=` | Public | `{ username, valid, available }` |
| POST | `/auth/login` | Public (rate-limited) | Log in, sets cookie |
| POST | `/auth/logout` | Public | Clears cookie |
| GET | `/auth/me` | User | Current user profile |
| POST | `/auth/forgot-password` | Public (rate-limited) | Email a reset link |
| POST | `/auth/reset-password` | Public (rate-limited) | Set a new password with the token |
| POST | `/auth/change-password` | User | Change login password (ends other sessions) |

**POST /auth/register**
```jsonc
{
  "sponsorId": "ISM100002",          // member ID or username of an active member who has bought a bundle
  "fullName": "Test Member",
  "mobile": "9876543210",            // 10 digits
  "email": "test@example.com",
  "dob": "1995-06-15",               // must be 18+
  "country": "India",
  "aadhaar": "123456789012",         // 12 digits
  "username": "testmember",          // 4–20 a-z 0-9 _
  "password": "Riches#123",          // 8+ with letter, number, special char
  "confirmPassword": "Riches#123",
  "txnPassword": "Txn@1234",         // 6+, different from password
  "confirmTxnPassword": "Txn@1234",
  "packageId": "<package _id>",
  "otp": "123456"                    // from /auth/register/send-otp, sent to this email
}
```
→ `201 { message, memberId: "ISM100031", username }`. The sponsor gets a notification; the applicant gets an email.

**POST /auth/register/send-otp** `{ "email": "test@example.com", "fullName": "Test Member" }`
→ `200 { message, sentTo: "te**@example.com", expiresInMinutes: 10, resendIn: 60 }`.

Email OTPs (registration and withdrawal): 6 digits, valid 10 minutes, single use, 5 wrong tries then a new code
is needed, one new code per 60 seconds (`429` with `details.retryAfter`), at most 20 OTP requests per IP per 15 minutes.
A registration code is tied to the email; a withdrawal code is tied to the amount. If the email cannot be sent the
request fails with `502`. In development without SMTP the response also carries `devCode`.

**POST /auth/login** `{ "identifier": "<username or member ID>", "password": "…" }`
→ `200 { user }` + cookie. Refused with 403 and a reason for pending, rejected, inactive or suspended accounts.

**GET /auth/me** → `{ user }` — profile with `package`, `selectedPackage`, `sponsor { memberId, fullName }`, masked `aadhaar`, `isPackageActive`, `badge`, `lifetimeEarnings`, `kycStatus`, `status`, `role`.

**POST /auth/forgot-password** `{ "identifier": "username | member ID | email" }` → always `200 { message }`.
The email contains `CLIENT_URL/reset-password?token=…` (valid 30 minutes).

**POST /auth/reset-password** `{ "token": "…", "password": "NewPass#1" }` → `200 { message }`.

**POST /auth/change-password** `{ "currentPassword", "newPassword", "confirmPassword" }` → `200 { message }` (cookie re-issued).

---

## 3. Files

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | `/files/:ref` | User | KYC document or payment proof (`ref` = `<fileId>.<ext>` as stored on the payment/KYC record). Members can open only their own files; admins all. The file is streamed from Cloudinary with its content type. |
| GET | `/uploads/public/:name` | Public | Legacy QR images saved on disk before Cloudinary. New QR images are public Cloudinary URLs returned in `payment.qrImage`. |

---

## 4. Member endpoints (`/api/member/*`, role `member`)

### Dashboard and profile

| Method | Path | Description |
|--------|------|-------------|
| GET | `/member/dashboard` | Everything the member dashboard needs |
| GET | `/member/profile` | `{ user, referral: { code, link } }` — `user.avatar` is the profile picture URL (or absent) |
| POST | `/member/avatar` | `multipart/form-data`: `avatar` (JPG/PNG/WEBP, max 5 MB). Public image, served as a 320×320 face crop; replaces (and deletes) the previous one → `{ avatar }` |
| DELETE | `/member/avatar` | Removes the profile picture |
| POST | `/member/change-txn-password` | `{ currentPassword (login password), newTxnPassword, confirmTxnPassword }` |

**GET /member/dashboard** →
```json
{
  "profile": { "…": "same shape as /auth/me" },
  "income": { "active": 23800, "passive": 3250, "weekly": 0, "monthly_bonus": 0, "non_working": 2500, "royalty": 0,
              "total": 29550, "pending": { "non_working": 500, "…": 0 }, "pendingTotal": 500 },
  "wallet": { "balance": 22050, "activationBalance": 3000, "pendingWithdrawal": 2500, "totalWithdrawn": 5000, "totalWithdrawnNet": 4650 },
  "earnings": { "today": 5150, "month": 14150, "last7Days": [{ "date": "2026-09-28", "total": 7375 }], "last7Total": 29550 },
  "team": { "direct": 10, "total": 25, "active": 22, "directActive": 9, "inactive": 3 },
  "referral": { "code": "ISM100002", "link": "https://aroviaskilltech.com/register?ref=ISM100002" },
  "achievement": { "current": { "key": "silver", "name": "Silver Executive", "threshold": 10000 },
                   "next": { "key": "gold", "…": "…" }, "lifetimeEarnings": 27050, "requiredAmount": 2950, "progress": 85.3, "ladder": [] },
  "kyc": { "status": "approved", "rejectionReason": null },
  "latestPayment": { "paymentId": "PAY000001", "status": "approved", "…": "…" },
  "weekly": { "weekStart": "…", "required": 3, "percent": 5, "packages": [{ "key": "standard", "name": "Standard", "sales": 2 }] },
  "weeklyIncome": { "total": 6010, "pending": 0, "last": { "amount": 3005, "week": "2026-09-28", "creditedAt": "…" } },
  "unreadNotifications": 4
}
```

`wallet.balance` is the **Main Wallet**; `wallet.activationBalance` is the **Activation Wallet** (see section 9 of INCOME_ENGINE.md).

### Package activation (QR payment or wallet)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/member/payment-info` | QR image URL, UPI ID, instructions, packages with GST split, my payments, `canSubmit`, `wallets { main, activation }`, `walletSuspended` |
| POST | `/member/payments` | `multipart/form-data`: `packageId`, `utr`, `paymentDate` (YYYY-MM-DD), `proof` (file) |
| POST | `/member/wallet/purchase` | `{ packageId, wallet: main\|activation, username?, txnPassword }` — pay from a wallet. Without `username` (or with your own) it activates **your** bundle; with another member's username it is a **P2P activation**. Approved at once, income distributed as for an approved UPI payment → `201 { message, payment, member, package }` |
| GET | `/member/wallet/activations?page=` | Bundles paid from my wallets (mine and members I activated) |

Rules: not allowed if a package is already active (no upgrades) or a payment is pending; a UTR cannot be reused (across
bundle payments **and** deposits). Wallet purchases also need: the target member approved (`status: active`) without a
bundle and without a payment under verification, enough balance in the chosen wallet, a correct transaction password and
a wallet that is not suspended. The payment is stored with `method: "wallet"`, `wallet` and `paidBy`.
→ `201 { message, payment }`.

### KYC

| Method | Path | Description |
|--------|------|-------------|
| GET | `/member/kyc` | `{ kyc (masked), status }` — status `not_submitted` when none |
| POST | `/member/kyc` | `multipart/form-data` fields `aadhaarNumber`, `panNumber`, `bankName`, `accountHolder`, `accountNumber`, `ifsc`; files `aadhaarDoc`, `panDoc` (required first time), `bankDoc` (optional) |

Allowed only when no KYC exists or the last one was rejected. Formats: Aadhaar 12 digits, PAN `ABCDE1234F`,
account 9–18 digits, IFSC `SBIN0001234`.

### Team

| Method | Path | Description |
|--------|------|-------------|
| GET | `/member/team` | `{ stats, levels: [{ level, total, active }] }` |
| GET | `/member/team/members?level=&search=&page=&limit=` | Paged downline; `level=0` or omitted = all levels |
| GET | `/member/team/tree?node=<userId>` | A node and its direct children (each with `directCount`, `teamCount`). Default node = me. 403 if the node is outside my downline. |

### Income, wallet and withdrawals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/member/income` | `{ lifetime, thisMonth, labels }` — totals per income type |
| GET | `/member/ledger?category=&scope=income&status=&page=` | My ledger entries (excludes cancelled by default) |
| GET | `/member/wallet` | `{ balance (Main), activationBalance, pendingWithdrawal, totalWithdrawn, totalWithdrawnNet, rules, transferMin, deposit { min, max }, suspended, kycStatus, bank (masked) }` |
| GET | `/member/wallet/statement?wallet=main\|activation&from=&to=&page=&limit=` | Completed entries of one wallet, newest first, each with `balanceBefore` / `balanceAfter`. `all=1` returns up to 5,000 rows (CSV export) |
| GET | `/member/withdrawals?page=` | My withdrawals (account number masked) |
| GET | `/member/withdrawals/quote?amount=10000` | `{ amount, tdsPercent, tds, adminChargePercent, adminCharge, netAmount }` |
| POST | `/member/withdrawals/send-otp` | `{ "amount": 10000 }` → emails a code for exactly this amount. Runs the limit, KYC, suspension and balance checks first |
| POST | `/member/withdrawals` | `{ "amount": 10000, "txnPassword": "…", "otp": "123456" }` → `201 { withdrawal }` |
| POST | `/member/withdrawals/:id/cancel` | Cancel a **pending** request; amount returned to the Main Wallet |

Withdrawal checks: min/max limits, approved KYC (if required), correct transaction password,
amount ≤ **Main Wallet** balance, email OTP for this amount, no concurrent request. The Activation Wallet can never be withdrawn.

### Transfers and deposits

| Method | Path | Description |
|--------|------|-------------|
| GET | `/member/members/lookup?username=` | `{ member: { username, memberId, fullName, avatar, status, bundle, relation: self\|upline\|downline\|null, canReceiveTransfer, canActivate } }` — confirm who you pay before a transfer or P2P activation |
| POST | `/member/transfers` | `{ target: self\|member, username?, amount, txnPassword, remarks? }` — from the Main Wallet to your own Activation Wallet (`self`) or to an **upline or downline** member's Activation Wallet → `201 { message, reference (TRF…), amount, self, recipient }` |
| GET | `/member/transfers?type=sent\|received&page=` | Transfers sent and received (a move between your own wallets is listed once) |
| GET | `/member/deposits?page=` | My deposits + QR/UPI details, `rules { min, max }`, `pending { count, amount }` |
| POST | `/member/deposits` | `multipart/form-data`: `amount`, `utr`, `paymentDate`, `proof` (file) → `201 { deposit }`. Credited to the Activation Wallet once the admin approves it |

Transfer checks: minimum `settings.wallet.transferMin`, enough Main Wallet balance, correct transaction password, wallet not
suspended, recipient approved and in your upline or downline (not another branch, not the company root account).

### Achievements and notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/member/achievements` | Badge progress + `history` + `royalty` settings |
| GET | `/member/notifications?page=&limit=` | Paged list + `unread` count |
| POST | `/member/notifications/read` | Mark all as read |
| POST | `/member/notifications/:id/read` | Mark one as read |

---

## 5. Admin endpoints (`/api/admin/*`, role `admin`)

### Dashboard

**GET /admin/dashboard** → `members` (counts by status, `withPackage`), `packages` (sold, collection, GST,
system cost, package cost per package), `finance` (collection, gst, systemCost, packageCost, incomePaid,
income by type, lapsed by type, pendingIncome, walletLiability, `wallets { main, activation }`, `salesByMethod { upi, wallet }`,
`deposits { count, amount }`, withdrawals { requested, paid, paidNet, tds, adminCharge, byStatus }), `queues` (pending
registrations, KYC, payments, deposits, withdrawals), `daily` (14 days of
joinings and collection), `recentRegistrations`, `recentPayments`.

### Registrations

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/registrations?status=pending\|rejected&search=&page=` | | Applicants with sponsor and selected package (new registrations no longer need approval; this only lists accounts left `pending` from the old flow) |
| POST | `/admin/registrations/:id/approve` | | `pending → active`; member notified and emailed |
| POST | `/admin/registrations/:id/reject` | `{ reason }` | `pending → rejected`; reason stored and emailed |

### Members

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/members?search=&status=&package=<id>\|none&kyc=&badge=&page=` | | Approved members (pending/rejected excluded unless `status` given) |
| GET | `/admin/members/:id` | | `{ user, kyc, wallet, income, team, payments (own + paid for others), withdrawals, ledger (latest 50), deposits }` — full Aadhaar/bank for admin |
| PATCH | `/admin/members/:id/status` | `{ status: active\|inactive\|suspended, reason }` | Reason required unless activating. Root member cannot be changed. |
| PATCH | `/admin/members/:id/profile` | `{ fullName?, email?, mobile?, country? }` | Edit contact details |
| POST | `/admin/members/:id/reset-password` | `{ password }` | Sets a new login password, ends sessions |
| POST | `/admin/members/:id/wallet-adjust` | `{ wallet: main\|activation, type: credit\|debit, amount, remarks }` | Ledger adjustment on one wallet (default `main`); debit cannot exceed that wallet's balance |
| PATCH | `/admin/members/:id/wallet-status` | `{ suspended: boolean, reason? }` | Suspend (reason required) or reactivate the wallet. While suspended the member cannot withdraw, transfer or pay from either wallet, and open withdrawals can only be rejected; income still credits. `GET /admin/members?wallet=suspended` lists them |

### KYC

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/kyc?status=pending\|approved\|rejected\|all&search=&page=` | | `pending` = submitted + under review |
| POST | `/admin/kyc/:id/review` | `{ action: review\|approve\|reject, reason? }` | `review` marks under review; `reject` needs a reason |

Each KYC in the list carries `registrationAadhaar` (the Aadhaar given at registration) and `aadhaarMatch` (`true`, `false`,
or `null` when registration had none). A mismatch does **not** block approval: the response then includes a `warning`, and
the audit entry records `aadhaarMatch`.

### Payments

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/payments?status=pending\|approved\|rejected\|all&search=&page=` | | Search by member, payment ID or UTR |
| POST | `/admin/payments/:id/approve` | `{ remarks? }` | Activates the package and distributes income immediately |
| POST | `/admin/payments/:id/reject` | `{ reason }` | Frees the member to pay again |

Wallet-paid bundles appear here already approved, with `method: "wallet"`, `wallet` and `paidBy` (populated).

### Fund deposits

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/deposits?status=pending\|approved\|rejected\|all&search=&page=` | | Search by member, deposit ID or UTR. Includes `totals { amount }` |
| POST | `/admin/deposits/:id/approve` | `{ remarks? }` | Credits the member's **Activation Wallet** (ledger category `deposit`) |
| POST | `/admin/deposits/:id/reject` | `{ reason }` | Nothing is credited; the UTR can be used again |

### Withdrawals

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/withdrawals?status=open\|pending\|approved\|processing\|paid\|rejected\|cancelled\|all&search=&page=` | | `open` = pending + approved + processing. Includes `totals { amount, net }` |
| POST | `/admin/withdrawals/:id/status` | `{ status, remarks?, paymentReference? }` | See transitions below |

Allowed transitions: `pending → approved | processing | paid | rejected`, `approved → processing | paid | rejected`,
`processing → paid | rejected`. `paid` requires `paymentReference`; `rejected` requires `remarks` and refunds the wallet.
If the member's wallet is suspended only `rejected` is allowed (409 otherwise).

### Income processing

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/processing` | | Non-working pending/due totals, last 50 runs, suggested last week/month |
| POST | `/admin/processing/non-working` | `{ force?: boolean }` | Credit due non-working bonuses (`force` = all pending now) |
| GET | `/admin/processing/weekly-pool?week=YYYY-MM-DD` | | Live weekly pool for the week containing `week` (default: this week): `{ week, weekStart, weekEnd, closed, run, auto, percent, qualifyingSales, basis, salesCount, companyIncome, amount, eligible, share, distributed, members[] }` |
| POST | `/admin/processing/runs/weekly` | `{ period: "YYYY-MM-DD" }` | Any day of the week to generate (week must have ended) |
| POST | `/admin/processing/runs/monthly_bonus` | `{ period: "YYYY-MM" }` | Month must have ended |
| POST | `/admin/processing/runs/royalty` | `{ period: "YYYY-MM" }` | Month must have ended |
| GET | `/admin/processing/runs/:id` | | `{ run, entries }` |
| POST | `/admin/processing/runs/:id/approve` | | Credits all pending entries of the run |
| POST | `/admin/processing/runs/:id/cancel` | | Discards entries; the period can be generated again |

A second generate for the same period returns `409` until the first run is cancelled.

### Packages (bundles), course catalog and settings

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/admin/packages` | | All packages + tax |
| PUT | `/admin/packages/:id` | `{ name, price, activeIncome, passiveLevels[], nonWorkingBonus, weeklyEligible, status, description, benefits[], courses?[] }` | Snapshot saved to history; response may include `warning` if payout exceeds bundle cost. `courses` (course slugs) is left unchanged when omitted; unknown slugs are refused |
| GET | `/admin/courses` | | All catalog courses (active and hidden), each with the names of the bundles that include it |
| POST | `/admin/courses` | `{ slug, title, category, level, icon?, summary?, description?, outcomes[]?, modules[{ title, topics[] }]?, status, sortOrder? }` | Create a course. `slug`: lowercase letters, numbers and hyphens; 409 if taken |
| PUT | `/admin/courses/:id` | Same as POST without `slug` | Update a course; the slug never changes |
| GET | `/admin/settings` | | Current settings document |
| PUT | `/admin/settings` | Any subset of sections (see CONFIGURATION.md) + optional `note` | Version is incremented, previous version saved |
| POST | `/admin/settings/qr` | `multipart/form-data` file `qr` (JPG/PNG/WEBP) | Upload payment QR |
| GET | `/admin/settings/history?page=` | | Previous versions of settings and packages |

### Ledger, audit, network

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/ledger?search=&wallet=main\|activation&category=&status=&direction=&from=&to=&page=&limit=` | All ledger entries + `totals { credit, debit }` |
| GET | `/admin/audit-logs?action=<prefix>&search=&page=` | Audit trail (30 per page by default) |
| GET | `/admin/network?node=<userId>` or `?memberId=ISM…` | Tree node with children; default = root member |

### Reports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/reports` | `{ types: [{ key, title }] }` |
| GET | `/admin/reports/:type?from=&to=&status=&package=&category=&search=` | `{ key, title, limit, columns: [{ key, label, type }], rows, summary? }` (max 5,000 rows) |

| `type` | Report | Filters used |
|--------|--------|--------------|
| `registrations` | Member registration | date (registered), status, package, member |
| `active-members` | Active members | date (activated), package, member |
| `package-wise` | Package-wise sales & tax split | date (verified) |
| `referrals` | Referral / network (directs, team size) | member |
| `income` | Income by type | date, category, status, package, member |
| `wallet-ledger` | Wallet ledger (with a Wallet column) | date, wallet, category, status, member |
| `withdrawals` | Withdrawals | date (requested), status, member |
| `tds` | TDS on paid withdrawals (with PAN) | date (paid), member |
| `admin-charges` | Admin charges on paid withdrawals | date (paid), member |
| `payments` | Package payments (with "Paid With": UPI or wallet) | date, status, package, member |
| `deposits` | Fund deposits | date (submitted), status, member |
| `kyc` | KYC status | date (submitted), status, member |

Column `type` is one of `text`, `money`, `number`, `date`, `datetime` (the frontend uses it for formatting and CSV export).

---

## 6. Quick test with curl

```bash
# log in and keep the cookie
curl -c jar.txt -H 'Content-Type: application/json' \
  -d '{"identifier":"<username or member ID>","password":"<password>"}' http://localhost:5050/api/auth/login

# call a member endpoint with the cookie
curl -b jar.txt http://localhost:5050/api/member/wallet
```
