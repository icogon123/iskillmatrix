# Pages and routes

All routes are defined in `src/App.jsx`. Files are under `src/pages/`.

## Public website (`PublicLayout`)

| URL | File | Content |
|-----|------|---------|
| `/` | `public/Home.jsx` | Hero with dashboard preview, 2 ways of income, 10 trending skills, 6 income types, active vs passive, packages (live from API), badge ladder, 3 secrets, call to action |
| `/about` | `public/About.jsx` | Mission, vision, values (Learn · Educate · Earn · Together · Repeat), why iSkillMatrix |
| `/plan` | `public/Plan.jsx` | Price split table (GST/system/package cost), interactive package flow diagram (R → −A → A → B…), team-building level table, weekly / monthly / working bonus, withdrawal example, badges & royalty — all from live settings |
| `/packages` | `public/Packages.jsx` | Package cards → "Join with …" opens registration with the package pre-selected |
| `/contact` | `public/Contact.jsx` | Contact cards from settings, message form (opens the user's email app) |
| `*` | `public/NotFound.jsx` | 404 |

Shared website pieces: `public/sections.jsx` (`SectionTitle`, `PackageCard`, `PageHero`, `CtaBand`, skill icons).

## Authentication (`AuthShell` layout)

| URL | File | Content |
|-----|------|---------|
| `/login` | `public/Login.jsx` | Username or member ID + password, forgot link, "Not registered? Join Now" |
| `/admin/login` | `public/Login.jsx` (`admin` prop) | Same form, admin wording |
| `/register?ref=ISM…&package=pro` | `public/Register.jsx` | Referral detail (live sponsor lookup), profile detail, login access (live username check, password + transaction password), package choice, confirmation; success screen shows member ID |
| `/forgot-password` | `public/ForgotPassword.jsx` | Request reset email |
| `/reset-password?token=…` | `public/ResetPassword.jsx` | Set a new password |

After login, members go to `/app` and admins to `/admin` (or to the `next` URL they were trying to open).

## Member panel (`/app`, `MemberLayout`, role `member`)

| URL | File | Content |
|-----|------|---------|
| `/app` | `member/Dashboard.jsx` | Alerts (activate package, payment under review, KYC), balance card (total income + wallet), My Rank with progress, today / this month / pending withdrawal / total withdrawn, quick actions (My Team, Genealogy, Payout, Income), team overview, last 7 days earnings chart, this week's qualification, income summary, profile, referral code & link |
| `/app/activate` | `member/Activate.jsx` | Steps, package selection, QR + UPI + amount, UTR / date / screenshot form, payment history with status and remarks |
| `/app/kyc` | `member/Kyc.jsx` | Status stepper, form (Aadhaar, PAN, bank + documents), submitted details (masked) |
| `/app/team` | `member/Team.jsx` | Team stats, level tabs (All, Level 1 = direct, Level 2…), search, member table, level summary |
| `/app/genealogy` | `member/Genealogy.jsx` | Expandable tree of the downline; "Focus" re-roots on a member |
| `/app/income` | `member/Income.jsx` | Lifetime breakdown, cards per income type (lifetime + this month), filtered income ledger |
| `/app/wallet` | `member/Wallet.jsx` | Available balance, pending/withdrawn, all wallet transactions with filters |
| `/app/withdraw` | `member/Withdraw.jsx` | KYC check, balance + bank, amount with live TDS/admin/net, transaction password, history with cancel |
| `/app/achievements` | `member/Achievements.jsx` | Current badge, progress to next, full ladder with royalty % and achieved dates |
| `/app/referral` | `member/Referral.jsx` | Referral code and link with copy, WhatsApp / Telegram / native share |
| `/app/notifications` | `member/Notifications.jsx` | Notification list, mark one/all read |
| `/app/profile` | `member/Profile.jsx` | Profile details (Aadhaar masked), change login password, change transaction password |

Shared: `member/LedgerTable.jsx` (ledger table used by Income and Wallet).

## Admin panel (`/admin`, `AdminLayout`, role `admin`)

| URL | File | Content |
|-----|------|---------|
| `/admin` | `admin/Dashboard.jsx` | Approval queues, member/finance KPIs (collection, GST, system tax income, income distributed, wallet liability, withdrawals with TDS/admin charge), daily collection and registration charts, package statistics, income by type, latest pending registrations and payments |
| `/admin/registrations` | `admin/Registrations.jsx` | Pending / rejected applicants, approve, reject with reason |
| `/admin/payments` | `admin/Payments.jsx` | Pending / approved / rejected / all payments, proof link, approve & activate (with remarks), reject with reason |
| `/admin/kyc` | `admin/Kyc.jsx` | KYC queue; review modal with full details and document previews; mark under review / approve / reject |
| `/admin/withdrawals` | `admin/Withdrawals.jsx` | Status tabs, totals, bank details; approve → processing → mark paid (reference), reject (refund) |
| `/admin/members` | `admin/Members.jsx` | Search + filters (status, package, KYC), member table |
| `/admin/members/:id` | `admin/MemberDetail.jsx` | Profile (reveal/mask sensitive data), KYC, achievement, income, ledger, payments, withdrawals, network tree; activate / deactivate / suspend, wallet adjust, reset password, edit details |
| `/admin/network` | `admin/Network.jsx` | Tree from the root or any member ID |
| `/admin/processing` | `admin/Processing.jsx` | Non-working bonus status and manual credit; generate weekly / monthly bonus / royalty; runs history |
| `/admin/processing/:id` | `admin/RunDetail.jsx` | Run entries with basis, rate, amount and calculation; approve & credit, cancel, export CSV |
| `/admin/ledger` | `admin/Ledger.jsx` | Every transaction with search, type, status and date filters, credit/debit totals |
| `/admin/reports` | `admin/Reports.jsx` | 11 reports with filters, totals, CSV export and print/PDF |
| `/admin/packages` | `admin/Packages.jsx` | Package cards with cost/payout/margin; editor for price, income amounts, levels, bonus, weekly flag, status, benefits |
| `/admin/settings` | `admin/Settings.jsx` | Tabs: Website, QR payment (QR upload, UPI, GST/system %), Income rules, Badges & royalty, Withdrawal; History modal |
| `/admin/audit` | `admin/Audit.jsx` | Audit trail with search and action filter |
