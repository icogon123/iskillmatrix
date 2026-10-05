# User guide

Plain-language steps for members and administrators. Amounts are the defaults; the admin can change them.

---

## Part A — Members

### 1. Join
1. Open the referral link you received (`iskillmatrix.com/register?ref=ISM…`) or go to **Join Now** and
   type the sponsor's member ID. The sponsor's name appears automatically.
2. Fill in your profile: full name, mobile, email, date of birth (18+), country, Aadhaar number.
3. Choose a **username**, a **login password** (8+ characters with a letter, a number and a symbol) and a
   separate **transaction password** (used only for withdrawals).
4. Choose your package and submit. Note your **member ID** (e.g. `ISM100031`).
5. Wait for admin approval. You can log in only after approval; you will receive an email.

### 2. Activate your package
1. Log in → **Activate Package**.
2. Check the package and amount, scan the QR code (or use the UPI ID) and pay the **exact** amount.
3. Enter the UTR / reference number from your payment app, the payment date, and upload a screenshot.
4. Submit. The status shows *Pending* until the admin verifies it. Once approved your package is active
   and you can earn from your team. Package upgrades are not available, so choose carefully.

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
| Active income | Immediately when someone you referred gets their package approved (₹800–₹7,000) |
| Passive income | When someone deeper in your team buys a package — you earn as their Level 1, 2, 3… upline |
| Non-working (working) bonus | ₹200 / ₹500 / ₹1,000 extra on your direct Standard / Premium / Pro sales, credited at 12:00 AM |
| Weekly income | 3, 6 or 9 direct sales of the same package (Standard/Premium/Pro) in one week (Mon–Sun) → 5% of those sales |
| Monthly bonus | Your active income in a month above ₹20,000 / ₹50,000 / ₹1,00,000 → ₹1,500 / ₹4,000 / ₹10,000 |
| Royalty | From Emerald Executive badge: 5–10% of your team's monthly income |

You receive income only while your account is active and your own package is active.
The dashboard's **This Week's Qualification** card shows how many more sales you need this week.

### 6. Wallet and withdrawal
1. **Wallet** shows your balance and every transaction.
2. **Withdraw** → enter the amount (minimum ₹500). You see TDS 2%, admin charge 5% and the net amount
   (₹10,000 → ₹9,300). Enter your transaction password → Submit.
3. The amount is held from your wallet. You can **Cancel** while it is *Pending* to get it back.
4. The admin approves and pays to your KYC bank account; the status becomes *Paid* with a bank reference.
   If rejected, the full amount returns to your wallet.

### 7. Badges
Your lifetime Active + Passive income unlocks badges from Bronze (₹5,000) to Sapphire Director (₹1 crore).
Badges never expire. **Achievements** shows your progress.

### 8. Account
- **Profile & Security**: change your login password or transaction password.
- **Forgot password?** on the login page emails you a reset link (valid 30 minutes).
- The eye icon in the top bar hides amounts on screen; the bell shows notifications.

---

## Part B — Administrators

Log in at **`/admin/login`** with the admin username and the password set in `backend/.env` when the
site was first started. Change it right away with the **key icon** next to your name at the bottom of the
sidebar. The sidebar also shows how many items wait in each queue.

The company's own member account is **ISM100001** (username `iskillmatrix`). Give this code to your first
members as their sponsor code. You can set its password from Members → iSkillMatrix → Reset password.

### Daily routine
1. **Registrations** — check each applicant (name, Aadhaar, sponsor) → **Approve** or **Reject** with a reason.
2. **Payment Verification** — match the UTR and screenshot with your bank statement → **Approve** (activates
   the package and pays the upline immediately) or **Reject** with a reason (member can pay again).
3. **KYC Approvals** — open a record, view the documents → **Approve**, **Mark under review**, or **Reject** with a reason.
4. **Withdrawals** — **Approve** → pay from your bank → **Mark paid** with the UTR/NEFT reference.
   **Reject** with a reason returns the money to the member's wallet.

The non-working bonus is credited automatically every night at 12:00 AM. **Income Processing** shows
how many are pending and lets you credit them now if needed.

### Weekly (every Monday)
**Income Processing** → *Weekly income* → keep the suggested date (last week) → **Generate** →
review the entries (member, package, basis, 5%, amount) → **Approve & credit**. If something looks wrong,
**Cancel run**, fix the data or settings, and generate again. Export CSV for your records.

### Monthly (first days of the month)
Generate and approve **Monthly bonus** and **Royalty income** for last month the same way.

### Members
**Members** → search by name, member ID, mobile or email → open a member to see everything about them.
Actions: Activate / Deactivate / Suspend (with reason), Adjust wallet (credit/debit with remarks),
Reset password, Edit contact details. Sensitive numbers are masked — press **Reveal** when needed.

### Reports
**Reports** → choose the report, set dates and filters → **Run report** → **Export CSV** (opens in Excel) or
**Print / PDF**. Available: registrations, active members, package-wise, referrals, income, wallet ledger,
withdrawals, TDS (with PAN), admin charges, package payments, KYC.

### Configuration
- **System Settings → QR payment**: upload the QR image and set the UPI ID — do this before launch.
- **System Settings → Website**: support email, phone, WhatsApp, address shown on the website.
- **System Settings → Income rules / Badges & royalty / Withdrawal**: percentages, slabs, limits.
- **Packages & Income**: prices, active income, passive amount per level, bonus, benefits text.
- Every change is versioned (**History**) and logged in the **Audit Log**. Changes affect only new
  transactions; past income is never recalculated.

### Good practice
- Never approve a payment until the money is visible in the bank account.
- Use clear reasons when rejecting — the member sees them.
- Generate weekly/monthly runs only after the period has ended (the system enforces this).
- Review the **Financial Ledger** and **Audit Log** regularly.
