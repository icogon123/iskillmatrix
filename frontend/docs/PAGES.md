# Pages and routes

All routes are defined in `src/App.jsx`. Files are under `src/pages/`.

The public website is an e-learning store: it shows the **course catalog** (AI Tools Mastery, Graphic Design, …)
and the **bundles** people enroll in, and nothing about income. A bundle is what the API and database call a
`package` (`usePackagesQuery`, `packageId`, `user.package`, …); `package.courses` lists the course slugs it
includes. The income plan lives in the member panel (`/app/plan`). Old URLs redirect: `/packages` and `/plan` →
`/pricing`, `/admin/packages` → `/admin/bundles`; `/register?package=key` and `?course=key` still preselect a
bundle alongside the new `?bundle=key`.

## Public website (`PublicLayout`)

| URL | File | Content |
|-----|------|---------|
| `/` | `public/Home.jsx` | Hero with course search and a featured course, topics, popular courses, Why us, Vision & mission, how enrollment works, FAQ, call to action. Course data comes from the live catalog |
| `/courses?q=…&category=…` | `public/Courses.jsx` | Course catalog with search and category filter (kept in the URL), course cards, how it works |
| `/courses/:slug` | `public/CourseDetail.jsx` | Course page: summary, about, what you'll learn, curriculum (modules + topics), bundles that include it (cheapest first) with Enroll buttons, sticky enroll card, related courses |
| `/why-us` | `public/WhyUs.jsx` | Six reasons to learn with AroviaSkillTech, "What you get" panel built from the live catalog (course, topic, module and bundle counts, starting price), enrollment steps |
| `/vision-mission` | `public/VisionMission.jsx` | Mission and vision statements, the five values (Learn · Practise · Create · Share · Grow) |
| `/pricing` | `public/Pricing.jsx` | Bundle cards with included courses → "Enroll Now" opens registration with the bundle pre-selected; course × bundle comparison table; how it works; FAQ |
| `/about` | `public/About.jsx` | Who we are, what we teach (topics with course counts from the catalog), links to Why us and Vision & mission |
| `/contact` | `public/Contact.jsx` | Contact cards from settings, message form (opens the user's email app) |
| `*` | `public/NotFound.jsx` | 404 |

Top menu: Home · Courses · Why Us · Vision & Mission · About · Contact. Pricing is linked from the footer, course pages and the catalog.

The mission, vision, values and "why us" reasons are written once in `public/content.js` and reused by the homepage, Why Us, Vision & Mission and About.

Shared website pieces: `public/sections.jsx` (`SectionHeader`, `PageIntro`, `CourseCover`, `CourseCard`, `BundleCard`, `Steps`, `FaqSection`, `CtaBand`, `LoadError`, skeletons). Course icons and cover colours: `components/common/CourseIcon.jsx`. Every page sets its browser tab title (and, for public pages, the meta description) with `lib/usePageTitle.js`; the dashboards take the title from the current menu item.

The website uses the flat button variants `solid`, `accent`, `quiet` and `onBrand` (`components/ui/Button.jsx`); the dashboards keep the original `primary` / `gold` / `outline` styles.

`components/common/ErrorBoundary.jsx` shows a recovery screen instead of a blank page if something crashes, and reloads once when a code file from an older build is missing after a deploy.

## Authentication (`AuthShell` layout)

| URL | File | Content |
|-----|------|---------|
| `/login` | `public/Login.jsx` | Username or member ID + password, forgot link, "Not registered? Join Now" |
| `/admin/login` | `public/Login.jsx` (`admin` prop) | Same form, admin wording |
| `/register?ref=ASM…&bundle=pro` | `public/Register.jsx` | Referral code (live sponsor lookup), profile detail, login access (live username check, password + transaction password), bundle choice with included courses, confirmation; success screen shows member ID |
| `/forgot-password` | `public/ForgotPassword.jsx` | Request reset email |
| `/reset-password?token=…` | `public/ResetPassword.jsx` | Set a new password |

After login, members go to `/app` and admins to `/admin` (or to the `next` URL they were trying to open).

## Member panel (`/app`, `MemberLayout`, role `member`)

| URL | File | Content |
|-----|------|---------|
| `/app` | `member/Dashboard.jsx` | Alerts (activate bundle, payment under review, KYC), balance card (total income + Main and Activation Wallet), My Rank with profile picture and progress, today / last 7 days / this month / weekly income / pending withdrawal / total withdrawn, quick actions (Deposit, Transfer, P2P Activate, Payout, My Team), team overview, last 7 days earnings chart, this week's qualification, income summary, profile, referral code & link |
| `/app/courses` | `member/MyCourses.jsx` | Courses in the member's bundle (locked until the bundle is activated), linking to the course pages |
| `/app/activate` | `member/Activate.jsx` | Steps, bundle selection with included courses and member benefits; **Pay by UPI / QR** (QR + UPI + amount, UTR / date / screenshot form) or **Pay from wallet** (wallet choice, transaction password, instant activation); payment history with method, status and remarks |
| `/app/p2p` | `member/P2PActivate.jsx` | P2P activation: find a member by username, pick bundle and wallet, transaction password; history of wallet-paid bundles |
| `/app/kyc` | `member/Kyc.jsx` | Status stepper, form (Aadhaar — hint to use the registration Aadhaar —, PAN, bank + documents), submitted details (masked) |
| `/app/team` | `member/Team.jsx` | Team stats, level tabs (All, Level 1 = direct, Level 2…), search, member table, level summary |
| `/app/genealogy` | `member/Genealogy.jsx` | Expandable tree of the downline; "Focus" re-roots on a member |
| `/app/income` | `member/Income.jsx` | Lifetime breakdown, cards per income type (lifetime + this month), filtered income ledger |
| `/app/plan` | `member/IncomePlan.jsx` | Income plan: price split table, bundle flow diagram (R → −A → A → B…), team-building level table, weekly / monthly / working bonus, withdrawal example, badges & royalty — all from live settings |
| `/app/wallet` | `member/Wallet.jsx` | Wallets & Ledger: Main and Activation Wallet cards, pending/withdrawn, transaction filter (wallet type, from, to), statement with S.No., type, pre wallet, amount, after wallet, remark, date; CSV/Excel export and print/PDF |
| `/app/deposit` | `member/Deposit.jsx` | Deposit to the Activation Wallet: QR + UPI, amount / UTR / date / screenshot form, deposit history |
| `/app/transfer` | `member/Transfer.jsx` | Transfer from the Main Wallet to my Activation Wallet or to an upline/downline member (username check), transaction password; transfer history (all / sent / received) |
| `/app/withdraw` | `member/Withdraw.jsx` | KYC check, Main Wallet balance + bank, amount with live TDS/admin/net, transaction password, history with cancel |
| `/app/achievements` | `member/Achievements.jsx` | Current badge, progress to next, full ladder with royalty % and achieved dates |
| `/app/join` | `member/JoinMember.jsx` | Register a new member directly under yourself (same form as `/register`, sponsor fixed). Locked until your own bundle is active |
| `/app/referral` | `member/Referral.jsx` | Referral code and link with copy, WhatsApp / Telegram / native share. Locked until your own bundle is active |
| `/app/notifications` | `member/Notifications.jsx` | Notification list, mark one/all read |
| `/app/profile` | `member/Profile.jsx` | Profile picture upload / remove, profile details (Aadhaar masked), change login password, change transaction password |

Shared: `member/LedgerTable.jsx` (income ledger table), `member/MemberFinder.jsx` (username lookup used by Transfer and
P2P Activation), `member/WalletChoice.jsx` (pick the paying wallet, used by Activate and P2P Activation).

The member sidebar is grouped: main items, **Wallet** (Wallets & Ledger, Deposit Fund, Transfer Fund, Withdraw),
**Earnings & team**, **Account**.

## Admin panel (`/admin`, `AdminLayout`, role `admin`)

| URL | File | Content |
|-----|------|---------|
| `/admin` | `admin/Dashboard.jsx` | Approval queues, member/finance KPIs (collection, GST, system tax income, income distributed, wallet liability, withdrawals with TDS/admin charge), daily collection and registration charts, bundle statistics, income by type, latest pending registrations and payments |
| `/admin/registrations` | `admin/Registrations.jsx` | Accounts left pending from the old approval flow (new registrations are active at once): approve, reject with reason |
| `/admin/payments` | `admin/Payments.jsx` | Pending / approved / rejected / all payments, "Paid with" (UPI + UTR, or wallet + who paid), proof link, approve & activate (with remarks), reject with reason |
| `/admin/deposits` | `admin/Deposits.jsx` | Fund deposits: status tabs, search, totals, proof link; approve (credits the Activation Wallet) / reject with reason |
| `/admin/kyc` | `admin/Kyc.jsx` | KYC queue with an Aadhaar check column (matches / mismatch with registration); review modal with both Aadhaar numbers side by side, mismatch warning, full details and document previews; mark under review / approve / reject |
| `/admin/withdrawals` | `admin/Withdrawals.jsx` | Status tabs, totals, bank details; approve → processing → mark paid (reference), reject (refund) |
| `/admin/members` | `admin/Members.jsx` | Search + filters (status, bundle, KYC), member table |
| `/admin/members/:id` | `admin/MemberDetail.jsx` | Profile (reveal/mask sensitive data), Main and Activation Wallet balances, KYC with Aadhaar check, achievement, income, ledger (with wallet), payments (own and paid for others), withdrawals, deposits, network tree; activate / deactivate / suspend, wallet adjust (choose wallet), reset password, edit details |
| `/admin/network` | `admin/Network.jsx` | Tree from the root or any member ID |
| `/admin/processing` | `admin/Processing.jsx` | Non-working bonus status and manual credit; live weekly bonus pool (company sales, pool, qualified members, share); generate weekly / monthly bonus / royalty; runs history |
| `/admin/processing/:id` | `admin/RunDetail.jsx` | Run entries with basis, rate, amount and calculation; approve & credit, cancel, export CSV |
| `/admin/ledger` | `admin/Ledger.jsx` | Every transaction with search, wallet, type, status and date filters, credit/debit totals |
| `/admin/reports` | `admin/Reports.jsx` | 12 reports (incl. fund deposits) with filters, totals, CSV export and print/PDF |
| `/admin/courses` | `admin/Courses.jsx` | Course catalog table; create / edit courses (title, slug, category, level, icon, summary, description, outcomes, curriculum modules, status, order) |
| `/admin/bundles` | `admin/Bundles.jsx` | Bundle cards with cost/payout/margin and included courses; editor for price, income amounts, levels, bonus, weekly flag, status, included courses, description, member benefits |
| `/admin/settings` | `admin/Settings.jsx` | Tabs: Website, QR payment (QR upload, UPI, GST/system %), Income rules, Badges & royalty, Wallets & withdrawal (withdrawal rules, deposit min/max, transfer min); History modal |
| `/admin/audit` | `admin/Audit.jsx` | Audit trail with search and action filter |

The admin sidebar also has a **key icon** next to the admin's name that opens *Change admin password*.
