# User guide

Plain-language steps for members and administrators. Amounts are the defaults; the admin can change them.

---

## Part A — Members

### 1. Join
1. Open the referral link you received (`aroviaskilltech.com/register?ref=ISM…`) or go to **Join Now** and
   type the sponsor's member ID. The sponsor's name appears automatically. A sponsor can also register you
   from their own panel (**Join Member**). The sponsor must have bought a bundle (an activated ID).
2. Fill in your profile: full name, mobile, email, date of birth (18+), country, Aadhaar number.
3. Choose a **username**, a **login password** (8+ characters with a letter, a number and a symbol) and a
   separate **transaction password** (used only for withdrawals).
4. Choose your course bundle and submit. Note your **member ID** (e.g. `ISM100031`).
5. Log in straight away. Your ID is **not activated** until you buy a bundle: until then you cannot invite
   anyone (your referral code and **Join Member** stay locked).

### 2. Activate your bundle
1. Log in → **Activate Bundle**.
2. Check the bundle and amount, scan the QR code (or use the UPI ID) and pay the **exact** amount.
3. Enter the UTR / reference number from your payment app, the payment date, and upload a screenshot.
4. Submit. The status shows *Pending* until the admin verifies it. Once approved your bundle is active, its courses unlock under **My Courses**,
   and you can earn from your team. Bundle upgrades are not available, so choose carefully. The full income plan is under **Income Plan**.

### 3. Complete KYC
**KYC** → enter Aadhaar and PAN numbers, upload both documents, add bank name, account holder,
account number and IFSC (bank proof optional) → Submit. If rejected, the reason is shown — correct and
submit again. Approved KYC is required to withdraw.

### 4. Grow your team
- **Refer & Earn** → copy your code or link, or share on WhatsApp/Telegram.
- **My Team** shows your direct members (Level 1) and every level below; **Genealogy** shows the tree.

### 5. How you earn
| Income | When |
|--------|------|
| Active income | Immediately when someone you referred gets their bundle approved (₹800–₹7,000) |
| Passive income | When someone deeper in your team buys a bundle — you earn as their Level 1, 2, 3… upline |
| Non-working (working) bonus | ₹200 / ₹500 / ₹1,000 extra on your direct Standard / Premium / Pro sales, credited at 12:00 AM |
| Weekly income | 5% of the company's weekly sales is shared equally by everyone with 3 direct sales of the same bundle (Standard/Premium/Pro) in that week (Mon–Sun) |
| Monthly bonus | Your active income in a month above ₹20,000 / ₹50,000 / ₹1,00,000 → ₹1,500 / ₹4,000 / ₹10,000 |
| Royalty | From Emerald Executive badge: 5–10% of your team's monthly income |

You receive income only while your account is active and your own bundle is active.
The dashboard's **This Week's Qualification** card shows how many more sales you need this week, and the
**Weekly Income** card shows your total weekly income and the last payout.

### 6. Wallets, deposits, transfers and withdrawal
You have two wallets:

| | Main Wallet | Activation Wallet |
|--|-------------|-------------------|
| Filled by | all your income | deposits and transfers you receive |
| Withdraw to bank | yes | no |
| Transfer to others | yes | no |
| Buy a bundle (for you or another member) | yes | yes |

1. **Wallets & Ledger** shows both balances. Pick a wallet and dates and press **Get detail** to see every
   transaction with the balance before and after it. Export it to CSV/Excel or print it as PDF.
2. **Deposit Fund** → pay by the QR code / UPI, then enter the amount, UTR, date and screenshot. Once the admin
   verifies it, the money is added to your **Activation Wallet**.
3. **Transfer Fund** → send Main Wallet money to your own Activation Wallet, or to a member above or below you in
   your team: type their username and press **Check** to see their name first. The money always lands in their
   Activation Wallet. Transfers can't be reversed.
4. **P2P Activation** → activate a bundle for another member: their username, the bundle, and the wallet that pays.
   Their bundle is active at once. To pay for your own bundle from a wallet, use **Activate Bundle → Pay from wallet**.
5. **Withdraw** → enter the amount (minimum ₹500, from your Main Wallet). You see TDS 2%, admin charge 5% and the net
   amount (₹10,000 → ₹9,300). Enter your transaction password → Submit.
6. The amount is held from your Main Wallet. You can **Cancel** while it is *Pending* to get it back.
7. The admin approves and pays to your KYC bank account; the status becomes *Paid* with a bank reference.
   If rejected, the full amount returns to your Main Wallet.

Transfers, wallet payments and withdrawals all ask for your **transaction password**.

### 7. Badges
Your lifetime Active + Passive income unlocks badges from Bronze (₹5,000) to Sapphire Director (₹1 crore).
Badges never expire. **Achievements** shows your progress.

### 8. Account
- **Profile & Security**: add or change your profile picture (shown on your dashboard), change your login password
  or transaction password.
- **KYC**: use the same Aadhaar number you gave at registration — the admin checks that they match.
- **Forgot password?** on the login page emails you a reset link (valid 30 minutes).
- The eye icon in the top bar hides amounts on screen; the bell shows notifications.

---

## Part B — Administrators

Log in at **`/admin/login`** with the admin username and the password set in `backend/.env` when the
site was first started. Change it right away with the **key icon** next to your name at the bottom of the
sidebar. The sidebar also shows how many items wait in each queue.

The company's own member account is **ISM100001** (username `aroviaskilltech`). Give this code to your first
members as their sponsor code. You can set its password from Members → AroviaSkillTech → Reset password.

### Daily routine
1. **Registrations** — new members no longer need approval; this only lists accounts left pending from before.
2. **Payment Verification** — match the UTR and screenshot with your bank statement → **Approve** (activates
   the bundle and pays the upline immediately) or **Reject** with a reason (member can pay again).
3. **Fund Deposits** — match the UTR and screenshot with your bank statement → **Approve** (credits the member's
   Activation Wallet) or **Reject** with a reason.
4. **KYC Approvals** — the *Aadhaar check* column shows whether the KYC Aadhaar matches the one given at registration.
   Open a record, compare both numbers and view the documents → **Approve**, **Mark under review**, or **Reject** with a
   reason. A mismatch shows a warning but does not stop you from approving.
5. **Withdrawals** — **Approve** → pay from your bank → **Mark paid** with the UTR/NEFT reference.
   **Reject** with a reason returns the money to the member's wallet.

The non-working bonus is credited automatically every night at 12:00 AM. **Income Processing** shows
how many are pending and lets you credit them now if needed.

### Weekly (automatic, Monday 12:05 AM)
The weekly pool (5% of the week's company sales, shared equally by every member with 3 same-bundle
direct sales) is calculated and credited automatically right after the week closes. **Income Processing**
→ *Weekly bonus pool* shows this week's sales, pool, who qualifies so far and each share; switch to
*Last week* to see the closed week and its run. To review before money moves, turn off
*Settings → Income rules → Credit wallets without waiting for approval*: the run then waits for
**Approve & credit** (or **Cancel run**, fix, and generate again from *Weekly income*). Export CSV for your records.

### Suspending a wallet
**Members** → open the member → **Suspend wallet** with a reason (the member is notified). Income keeps
crediting, but they cannot withdraw, transfer or pay from either wallet, and their open withdrawals can only be rejected.
**Adjust wallet** lets you credit or debit either the Main or the Activation Wallet.
**Reactivate wallet** lifts it. Filter *Members* by *Wallet suspended* to see all of them.

### Monthly (first days of the month)
Generate and approve **Monthly bonus** and **Royalty income** for last month the same way.

### Members
**Members** → search by name, member ID, mobile or email → open a member to see everything about them.
Actions: Activate / Deactivate / Suspend (with reason), Adjust wallet (credit/debit with remarks),
Reset password, Edit contact details. Sensitive numbers are masked — press **Reveal** when needed.

### Reports
**Reports** → choose the report, set dates and filters → **Run report** → **Export CSV** (opens in Excel) or
**Print / PDF**. Available: registrations, active members, bundle-wise, referrals, income, wallet ledger,
withdrawals, TDS (with PAN), admin charges, bundle payments, KYC.

### Configuration
- **System Settings → QR payment**: upload the QR image and set the UPI ID — do this before launch.
- **System Settings → Website**: support email, phone, WhatsApp, address shown on the website.
- **System Settings → Income rules / Badges & royalty / Withdrawal**: percentages, slabs, limits.
- **Course Catalog**: add and edit the courses shown on the website (title, category, level, icon, summary,
  description, what you'll learn, curriculum). Hide a course by setting it to *Hidden*.
- **Bundles & Income**: prices, active income, passive amount per level, bonus, included courses, description
  and member benefits.
- Every change is versioned (**History**) and logged in the **Audit Log**. Changes affect only new
  transactions; past income is never recalculated.

### Good practice
- Never approve a payment until the money is visible in the bank account.
- Use clear reasons when rejecting — the member sees them.
- Generate weekly/monthly runs only after the period has ended (the system enforces this).
- Review the **Financial Ledger** and **Audit Log** regularly.
