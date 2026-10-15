# Income engine and business rules

Code: `src/services/incomeEngine.js`, `runService.js`, `ledgerService.js`, `badgeService.js`,
`withdrawalService.js`, `paymentService.js`. Every number below is the **default** and can be
changed in the admin panel (Packages & Income, System Settings) without touching code.

```
Member Income = Active + Passive + Weekly + Monthly Bonus + Non-Working + Royalty
```

## 1. Member lifecycle

```
Register (referral link/code, or Join Member from a sponsor's panel) ─► active (can log in at once)
   sponsor must have an activated ID (a bought bundle), else the registration is refused
   (accounts left `pending` from the old approval flow are still approved/rejected under Admin → Registrations)

Active member ─► KYC (Aadhaar + PAN + bank) ─► submitted ─► under review ─► approved / rejected
              ─► Select package ─► pay by QR ─► submit UTR + screenshot ─► Admin verifies
                     └► approved: package activated + income distributed to the upline
                     └► rejected: member can submit a new payment
```

- Package upgrades are **not** supported: one approved package per member.
- Admin can later set a member to `inactive` or `suspended` (blocks login and new income) and back to `active`.

## 2. Packages and the price split

Customer price includes GST and system cost. The remainder is the **package cost** that funds payouts.

| Package | Price | GST 18% | System 12% | Package cost | Active | Passive levels | Non-working | Weekly |
|---------|------:|--------:|-----------:|-------------:|-------:|----------------|------------:|:------:|
| Starter | 1,300 | 234 | 156 | **910** | 800 | 100 | — | — |
| Basic | 3,000 | 540 | 360 | **2,100** | 1,500 | 200 · 100 | — | — |
| Standard | 5,000 | 900 | 600 | **3,500** | 2,000 | 300 · 50 · 100 · 150 · 25 | 200 | ✓ |
| Premium | 11,000 | 1,980 | 1,320 | **7,700** | 4,500 | 600 · 75 · 150 · 300 · 37.5 · 18 · 10 | 500 | ✓ |
| Pro | 18,600 | 3,348 | 2,232 | **13,020** | 7,000 | 1000 · 125 · 250 · 500 · 75 · 25 · 13 · 13 · 13 · 13 · 13 · 13 | 1,000 | ✓ |

The split is stored on each payment, and the admin dashboard shows total GST and "system tax income".
When an admin edits a package so that payouts exceed the package cost, the API returns a warning.

## 3. Payouts when a package payment is approved

`distributePackageIncome(payment, buyer, package)` uses the buyer's `ancestors` array
(nearest first):

```
R  = buyer (purchases the package)
−A = ancestors[0] = direct sponsor      → Active income (credited now)
                                        → Non-working bonus (pending, credited at next 12:00 AM IST)
A  = ancestors[1] = sponsor's sponsor   → Passive Level 1
B  = ancestors[2]                       → Passive Level 2
…  up to the number of levels of the PURCHASED package
```

**Worked example — a Standard purchase (₹5,000):**

| Who | Receives | Amount | When |
|-----|----------|-------:|------|
| Direct sponsor (−A) | Active income | 2,000 | immediately |
| Direct sponsor (−A) | Non-working bonus | 200 | next 12:00 AM IST |
| Sponsor's sponsor (A) | Passive L1 | 300 | immediately |
| Next up (B) | Passive L2 | 50 | immediately |
| (C) | Passive L3 | 100 | immediately |
| (D) | Passive L4 | 150 | immediately |
| (E) | Passive L5 | 25 | immediately |
| **Total** | | **2,825** | of the 3,500 package cost |

If the chain is shorter than the level count (e.g. near the root), the remaining levels are simply not paid.

### Eligibility (lapsed income)

With *Settings → Income rules → "Only active members with a package receive income"* on (default),
a beneficiary whose account is not `active` or who has no approved package gets the entry with
status **`lapsed`**: it is recorded for transparency, shown in admin totals, and never added to the wallet.
Income does **not** roll up to the next person.

## 4. Non-working bonus (12:00 AM run)

- Created as `pending` with `scheduledFor` = the next 12:00 AM IST after approval.
- `jobs/scheduler.js` credits all due entries every night at 12:00 AM IST, and on server start (catch-up).
- Admin → Income Processing can credit due entries now, or force all pending entries.
- Turn automatic crediting off in Settings → Income rules.

## 5. Weekly income (company pool, shared equally)

1. Week = Monday 00:00 → Sunday 23:59:59 IST.
2. **Pool** = weekly% (5) × the company's approved bundle sales in the week — all bundles, by amount
   received (or after GST and system cost, *Settings → Income rules → Company sales counted as*).
3. A member **qualifies** with `qualifyingSales` (3) **direct** sales of the **same weekly-eligible bundle**
   (Standard, Premium, Pro) approved in the week. With *Only active members receive income* on, they must
   also be active with a bundle. The company root account never takes a share.
4. **Share** = pool ÷ number of qualified members, the same for everyone, rounded **down** to the paisa
   (the remainder stays with the company). More sales or more bundles do not give a bigger share.
5. No qualified member → no entries; the pool stays with the company.

Example: company sales ₹1,000 → pool 5% = ₹50 → 10 qualified members → ₹5 each.

**Automatic processing** (`weekly.autoProcess`, on by default): `jobs/scheduler.js` generates the run at
**Monday 12:05 AM IST** right after the week closes and, with `weekly.autoApprove` (on by default),
credits it at once. With auto-approve off the run waits in Income Processing for **Approve & credit**.
A week that already has a run of any status — including one the admin cancelled — is never re-created
automatically. On server start it catches up on the week that just closed (within 2 days).

**Live view**: Admin → Income Processing → *Weekly bonus pool* shows this week's (or last week's)
company sales, pool, the members who qualify so far and the share each would get.

Manual: Income Processing → Weekly income → pick any day of a finished week → **Generate** (entries are
`pending`) → review → **Approve & credit** (or **Cancel run** and generate again). A week can only be
generated after it has ended, and only once.

## 6. Monthly bonus

Based on the member's **Active income credited in the calendar month** (IST). Only the highest slab is paid.

| Monthly active income | Bonus |
|-----------------------|------:|
| more than ₹20,000 | 1,500 |
| more than ₹50,000 | 4,000 |
| more than ₹1,00,000 | 10,000 |

"More than" is strict by default (exactly ₹50,000 gets ₹1,500). Switch to "greater than or equal" in
Settings → Income rules. Generated and approved like the weekly run, after the month ends.

## 7. Achievement badges

- **Lifetime earnings** = total of credited income of the qualifying types (default: Active + Passive).
- After every credit, the highest badge whose threshold is reached is awarded. Badges are **permanent**:
  they never go down, even if later income changes.
- The member is notified and emailed; the change is audit-logged.

| Badge | Lifetime earnings | Royalty |
|-------|------------------:|--------:|
| Bronze Executive | 5,000 | — |
| Silver Executive | 10,000 | — |
| Gold Executive | 30,000 | — |
| Platinum Executive | 50,000 | — |
| Diamond Executive | 1,00,000 | — |
| Emerald Executive | 5,00,000 | 5% |
| Senior Emerald Executive | 10,00,000 | 6% |
| Director | 20,00,000 | 7% |
| Senior Director | 50,00,000 | 8% |
| Sapphire Director | 1,00,00,000 | 10% |

## 8. Royalty income (monthly)

For each member whose badge has a royalty slab:

```
basis   = Active + Passive income credited in the month to the member's whole downline   (basis "team", default)
        = … to the member themself                                                     (basis "own")
royalty = basis × royalty% of the member's badge
```

Example: an Emerald Executive whose downline earned ₹2,00,000 Active + Passive in September gets
5% × 2,00,000 = **₹10,000**. Generated and approved per month like the other runs.
Badge achievement (lifetime) and royalty (monthly) are separate: the badge decides the %, the month decides the basis.

## 9. Wallets (Main and Activation)

Every member has two wallets, both derived from the ledger (`ledgers.wallet`):

| | Main Wallet | Activation Wallet |
|--|-------------|-------------------|
| Credits | all six income types, withdrawal reversals, admin credits | approved deposits, transfers received, admin credits |
| Debits | withdrawals, transfers sent, bundle purchases, admin debits | bundle purchases, admin debits |
| Withdraw | yes | **no** |
| Transfer out | yes | **no** |
| Buy a bundle (self or P2P) | yes | yes |

- **Balance = completed credits − completed debits** of that wallet. Pending and lapsed entries never count.
- **Deposit:** QR/UPI + UTR + screenshot → admin approves → credit to the Activation Wallet (category `deposit`).
- **Transfer:** from the Main Wallet only, to your own Activation Wallet or to a member in your **upline or downline**
  (not another branch, not the company root). It always lands in the receiver's Activation Wallet
  (`transfer_out` on the sender's Main Wallet + `transfer_in` on the receiver's Activation Wallet, same `TRF…` reference).
- **Wallet purchase / P2P activation:** pay the bundle price from either wallet for yourself or for any approved member
  without a bundle. A `payments` record is created already approved (`method: wallet`, `paidBy`), the bundle is activated
  and income is distributed exactly as in section 3. The payer gets a `bundle_purchase` debit.
- Transfers and wallet purchases need the transaction password and are blocked while the wallet is suspended. All wallet
  debits run under the per-member wallet lock, so two at once cannot overdraw a wallet.

## 10. Withdrawals

```
Request (amount + transaction password)
  checks: min ₹500, max ₹1,00,000, KYC approved, amount ≤ Main Wallet balance, no other request in progress
  → full amount debited from the Main Wallet (held) → status pending
Admin: approve → processing → paid (bank reference required)
       reject (reason)          → full amount returned to the wallet
Member: cancel while pending    → full amount returned to the wallet
```

Charges are taken from the requested amount:

```
TDS          = amount × 2%
Admin charge = amount × 5%
Net paid     = amount − TDS − admin charge
₹10,000 → ₹200 + ₹500 → ₹9,300 to the bank
```

Bank details are copied from the approved KYC at request time.

## 11. Duplicate prevention (idempotency keys)

| Event | Key | Effect of a repeat |
|-------|-----|--------------------|
| Active income | `ACTIVE:<paymentId>` | ignored |
| Non-working bonus | `NONWORKING:<paymentId>` | ignored |
| Passive income | `PASSIVE:<paymentId>:L<level>` | ignored |
| Weekly income | `WEEKLY:<weekStart>:<userId>` | ignored |
| Monthly bonus | `MONTHLY:<YYYY-MM>:<userId>` | ignored |
| Royalty | `ROYALTY:<YYYY-MM>:<userId>` | ignored |
| Withdrawal hold | `WITHDRAW:<withdrawalId>` | ignored |
| Withdrawal refund | `WREV:<withdrawalId>` | ignored |
| Admin adjustment | `ADJ:<random id>` | each adjustment is unique |
| Deposit credit | `DEPOSIT:<depositId>` | ignored |
| Transfer | `TRF:<reference>:OUT` / `TRF:<reference>:IN` | ignored |
| Wallet purchase debit | `PURCHASE:<paymentId>` | ignored |

Plus: payment/deposit/KYC/withdrawal/run status changes are atomic conditional updates, one live payment per
member, unique UTRs (across payments and deposits), one live run per period, and a wallet lock around every wallet debit
(withdrawals, transfers, wallet purchases).

## 12. Changing the rules safely

- Edit amounts in **Admin → Packages & Income**; edit percentages, slabs, badges and limits in
  **Admin → System Settings**. Each save creates a new settings version and keeps the old one in History.
- Changes apply to **new** events only. Existing ledger entries keep their amounts and record the
  settings version they were calculated with.
- After changing rules, run `npm run test:engine` only if you changed **code**; the test uses the default values.
