# Database (MongoDB)

Database name: `iskillmatrix`. Schemas are in `src/models/`. All collections have
`createdAt` / `updatedAt` timestamps unless noted.

```
users ──< payments          (a member's package payments)
  │  ──< fileassets        (uploaded files stored in Cloudinary)
  │  ──1 kycs               (one KYC record per member)
  │  ──< ledgers            (every credit/debit; wallet balance is derived from it)
  │  ──< withdrawals
  │  ──< notifications
  │  ──  sponsor / ancestors → users   (the unilevel tree)
packages ──< payments, ledgers
incomeruns ──< ledgers      (weekly / monthly bonus / royalty entries)
settings (1 document) ── settinghistories (previous versions, package snapshots)
auditlogs, counters
```

## ID formats

| ID | Format | Example | Source |
|----|--------|---------|--------|
| Member ID / referral code | `ISM` + sequence from 100001 | `ISM100002` | `counters._id = "member"` |
| Payment ID | `PAY` + 6 digits | `PAY000024` | `counters._id = "payment"` |
| Withdrawal ID | `WD` + 6 digits | `WD000002` | `counters._id = "withdrawal"` |
| Ledger transaction ID | `TXN` + base-36 time + random | `TXNMU308ICC385A3` | generated |

---

## users

Members and admins.

| Field | Type | Notes |
|-------|------|-------|
| `role` | `member` \| `admin` | |
| `memberId` | string, unique (members) | `ISM100002` |
| `username` | string, unique, lowercase | login name |
| `fullName`, `email`, `mobile`, `dob`, `country`, `aadhaar` | | from registration (the admin KYC review compares `aadhaar` with the KYC Aadhaar) |
| `avatar`, `avatarAsset` | URL, ObjectId → fileassets (`select: false`) | profile picture (public Cloudinary image); the asset is deleted when replaced |
| `password`, `txnPassword` | bcrypt hash, `select: false` | never returned by the API |
| `tokenVersion` | number | incremented on password change/reset → ends sessions |
| `resetTokenHash`, `resetTokenExpires` | | forgot-password flow |
| `sponsor` | ObjectId → users | direct sponsor |
| `ancestors` | [ObjectId] | upline, **nearest first**: `[sponsor, sponsor's sponsor, …, root]` (indexed) |
| `depth` | number | network level from the root (root = 0) |
| `selectedPackage` | ObjectId → packages | chosen at registration / payment |
| `package`, `packageActivatedAt` | | set when a payment is approved (null = no active package) |
| `status` | `pending` \| `active` \| `rejected` \| `inactive` \| `suspended` | `statusReason` holds the reason |
| `approvedAt`, `approvedBy` | | registration approval |
| `kycStatus` | `not_submitted` \| `submitted` \| `under_review` \| `approved` \| `rejected` | copy of the KYC status for filtering |
| `badge`, `badgeAchievedAt`, `badgeHistory[]` | | highest badge key, never downgraded |
| `lifetimeEarnings` | number | sum of badge-qualifying income credited |
| `walletLock` | Date, `select: false` | short lease during withdrawals, transfers and wallet purchases |
| `walletSuspended`, `walletSuspendedReason`, `walletSuspendedAt`, `walletSuspendedBy` | | admin wallet freeze: withdrawals, transfers and wallet payments blocked, income still credited |
| `lastLoginAt` | Date | |
| `isRoot` | boolean | company root member `ISM100001` |

Why `ancestors`? Upline payouts read it directly (no recursive queries), and the whole downline of
X is simply `users.find({ ancestors: X })`. A member's level under X is `ancestors.indexOf(X) + 1`.

## packages

| Field | Notes |
|-------|-------|
| `key` (unique) | `starter`, `basic`, `standard`, `premium`, `pro` |
| `name`, `price` | customer price, GST inclusive |
| `activeIncome` | paid to the direct sponsor |
| `passiveLevels` | array of amounts: index 0 = Level 1 (sponsor's sponsor) |
| `nonWorkingBonus` | paid to the direct sponsor at the 12 AM run |
| `weeklyEligible` | counts for weekly income |
| `status` | `active` \| `inactive` (hidden from new purchases) |
| `description`, `sortOrder` | display (website) |
| `benefits[]` | member benefits, shown in the member panel when activating |
| `courses[]` | slugs of the catalog courses this bundle includes (website). Filled with defaults once for older databases |

Packages are shown to people as **course bundles**.

## courses

Public course catalog. Courses are not bought on their own; members buy a bundle (package).

| Field | Notes |
|-------|-------|
| `slug` (unique) | URL key, e.g. `graphic-design`; fixed after creation (bundles refer to it) |
| `title`, `category`, `level` | `level`: `Beginner` \| `Intermediate` \| `Advanced` \| `All levels` |
| `icon` | icon key the website maps to an icon |
| `summary`, `description` | card line and course page text |
| `outcomes[]` | "What you'll learn" |
| `modules[]` | curriculum: `{ title, topics[] }` |
| `status` | `active` \| `inactive` (hidden from the website) |
| `sortOrder` | catalog order |

## payments

| Field | Notes |
|-------|-------|
| `paymentId` (unique), `user`, `package` | |
| `amount`, `gstAmount`, `systemCost`, `packageCost` | split stored at submission time |
| `method` | `upi` (QR payment, admin verifies) \| `wallet` (paid from a wallet, approved at once) |
| `wallet`, `paidBy` | wallet payments only: which wallet paid and who paid (another member for a P2P activation) |
| `paymentDate`, `utr`, `proof` | member-entered; `proof` = file reference `<fileassets _id>.<ext>`. `utr` required for UPI only |
| `status` | `pending` \| `approved` \| `rejected` |
| `adminRemarks`, `verifiedAt`, `verifiedBy` | |
| `userLock` (unique, sparse) | = user id while pending/approved → one live payment per member |
| `utrLock` (unique, sparse) | = UTR while pending/approved → a UTR can't be reused (also checked against deposits) |

## deposits

Fund deposits by QR/UPI, credited to the member's **Activation Wallet** when approved.

| Field | Notes |
|-------|-------|
| `depositId` (unique, `DEP000001`), `user` | |
| `amount`, `paymentDate`, `utr`, `proof` | member-entered |
| `status` | `pending` \| `approved` \| `rejected` |
| `adminRemarks`, `verifiedAt`, `verifiedBy` | |
| `utrLock` (unique, sparse) | = UTR while pending/approved; cleared on rejection |

## kycs

One per member (`user` unique): `aadhaarNumber`, `aadhaarDoc`, `panNumber`, `panDoc`, `bankName`,
`accountHolder`, `accountNumber`, `ifsc`, `bankDoc`, `status` (`submitted` \| `under_review` \|
`approved` \| `rejected`), `rejectionReason`, `submittedAt`, `reviewedAt`, `reviewedBy`.

## ledgers

The financial source of truth. One document per credit or debit.

| Field | Notes |
|-------|-------|
| `txnId` (unique) | |
| `user` | whose wallet |
| `wallet` | `main` (default) \| `activation`. Entries written before the two-wallet split have no field and count as `main` |
| `direction` | `credit` \| `debit` |
| `category` | income: `active`, `passive`, `weekly`, `monthly_bonus`, `non_working`, `royalty`; `withdrawal`, `withdrawal_reversal`, `adjustment_credit`, `adjustment_debit`; wallet moves: `deposit`, `transfer_out`, `transfer_in`, `bundle_purchase` |
| `grossAmount`, `charges`, `netAmount` | balance uses `netAmount` |
| `status` | `pending` (awaiting run/approval) · `completed` (counts in balance) · `lapsed` (beneficiary ineligible, never counts) · `cancelled` |
| `sourceUser`, `payment`, `package`, `level` | where income came from |
| `rate`, `basisAmount` | for % based income (weekly, royalty) and the monthly basis |
| `run`, `period` | link to an income run and its period key |
| `withdrawal`, `deposit`, `reference`, `remarks` | `reference` = withdrawal / deposit / transfer (`TRF…`) / payment ID |
| `counterparty` | the other member in a transfer or wallet-paid purchase (yourself for a move between your own wallets) |
| `idempotencyKey` (unique, sparse) | prevents duplicate payouts (see INCOME_ENGINE.md) |
| `scheduledFor` | non-working bonus due time (next 12:00 AM IST) |
| `completedAt` | when it hit the wallet (used for "today", "this month", charts and monthly calculations) |
| `createdBy`, `settingsVersion` | |

Indexes: `{ user, status, category, completedAt }`, `{ user, wallet, status, completedAt }`, `{ category, status, createdAt }`, `run`.

**Wallet balance** (per wallet) = Σ `netAmount` of completed credits − Σ `netAmount` of completed debits of that wallet.
The statement's "pre" and "after" balances are worked out from the same sums, so they are never stored.

## withdrawals

| Field | Notes |
|-------|-------|
| `withdrawalId` (unique), `user` | |
| `amount`, `tdsPercent`, `tds`, `adminChargePercent`, `adminCharge`, `netAmount` | computed at request time |
| `bank { bankName, accountHolder, accountNumber, ifsc }` | copied from KYC at request time |
| `status` | `pending` → `approved` → `processing` → `paid`, or `rejected` / `cancelled` |
| `adminRemarks`, `paymentReference`, `processedAt`, `processedBy` | |
| `history[] { status, at, by, remarks }` | full status trail |

## incomeruns

| Field | Notes |
|-------|-------|
| `type` | `weekly` \| `monthly_bonus` \| `royalty` |
| `periodKey` | week start `YYYY-MM-DD` (Monday) or month `YYYY-MM` |
| `periodStart`, `periodEnd` | IST boundaries stored as UTC instants |
| `status` | `generated` → `approved`, or `cancelled` |
| `itemsCount`, `totalAmount` | payable entries |
| `generatedBy`, `approvedBy`, `approvedAt`, `cancelledBy`, `cancelledAt`, `settingsVersion` | `generatedBy`/`approvedBy` are empty for automatic runs |
| `trigger` | `manual` \| `auto` (scheduler) |
| `pool { basis, salesCount, companyIncome, percent, amount, eligible, share }` | weekly runs: the company pool and the equal share |
| `activeKey` (unique, sparse) | `type:periodKey` while not cancelled → one live run per period |

## settings

A single document (`key: "global"`) with `version` and sections `site`, `payment`, `tax`, `weekly`,
`monthlyBonus`, `badges`, `badgeQualifyingCategories`, `royalty`, `withdrawal`, `nonWorking`,
`income`. Defaults and meaning: [CONFIGURATION.md](CONFIGURATION.md#2-admin-settings).

## settinghistories

Snapshot saved **before** each change: `scope` (`settings` \| `package`), `refId`, `version`,
`snapshot`, `changedBy`, `note`, `createdAt`.

## notifications

`user`, `title`, `message`, `type` (`income`, `badge`, `kyc`, `withdrawal`, `team`, `payment`, `wallet`, `account`), `link`, `read`.

## auditlogs

`actor`, `actorName`, `actorRole` (`member` \| `admin` \| `system`), `action` (e.g. `payment.approved`),
`entityType`, `entityId`, `details`, `ip`, `createdAt`.

## fileassets

One record per uploaded file stored in Cloudinary. Payments and KYC records point to it with the
reference `<_id>.<ext>`.

| Field | Notes |
|-------|-------|
| `owner` | user who uploaded it (only they and admins can open private files) |
| `purpose` | `payment_proof`, `kyc_aadhaar`, `kyc_pan`, `kyc_bank`, `qr_code` |
| `visibility` | `private` (documents) or `public` (QR code) |
| `publicId`, `resourceType`, `deliveryType`, `format` | Cloudinary identifiers (`deliveryType` `private` = no public URL) |
| `ext`, `mimeType`, `bytes`, `originalName` | file details (type detected from the file content) |
| `url` | public URL — only for public files |
| `deletedAt` | set when the file was removed from Cloudinary |

Cloudinary folders: `<CLOUDINARY_FOLDER>/private/<purpose>/…` and `<CLOUDINARY_FOLDER>/public/qr_code/…`.

## counters

`{ _id: "member" | "payment" | "withdrawal", seq }` — atomic sequences for readable IDs.

---

## Backups

Files (KYC documents, payment proofs, QR images) are stored in **Cloudinary**, not in MongoDB or on
the server. Back up the database with Atlas backups or `mongodump`; Cloudinary keeps the files (you can
also export them from the Cloudinary Media Library).

```bash
mongodump --uri "$MONGODB_URI" --db iskillmatrix --out backup-$(date +%F)
```
