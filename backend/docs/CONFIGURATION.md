# Configuration

Two kinds of configuration:

1. **Environment variables** (`backend/.env`) — server, database, secrets, email. Need a restart.
2. **Admin settings** (stored in MongoDB, edited in the admin panel) — business rules. Take effect immediately and are versioned.

## 1. Environment variables

Copy `.env.example` to `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `production` enables secure cookies, generic error messages and serving `frontend/dist` |
| `PORT` | `5050` | API port |
| `CLIENT_URL` | `http://localhost:5173` | Public URL of the website. Used for CORS, referral links (`/register?ref=…`) and password-reset links. Production: `https://aroviaskilltechnologies.com` |
| `MONGODB_URI` | — | **Required.** MongoDB Atlas connection string (`mongodb+srv://user:password@cluster….mongodb.net/?retryWrites=true&w=majority`). The server will not start without it |
| `MONGODB_DB_NAME` | `iskillmatrix` | Database name inside the cluster |
| `JWT_SECRET` | — | **Required**, at least 32 characters. Signs session tokens. Changing it logs everyone out |
| `JWT_EXPIRES_IN` | `1d` | Session length (e.g. `12h`, `7d`) |
| `ADMIN_USERNAME` | `admin` | Username of the first administrator |
| `ADMIN_PASSWORD` | — | **Required on first start** (when no admin exists yet). 8+ characters with a letter, a number and a symbol. There is no default password |
| `ADMIN_EMAIL` | empty | Email of the first admin and the root member (used for password-reset emails) |
| `ROOT_PASSWORD` | — | Optional login password for the company root member `ASM100001`. If empty, the root member gets an unguessable password; the admin can set one later with **Reset password** |
| `CLOUDINARY_CLOUD_NAME` | — | **Required for uploads.** Cloudinary → Dashboard → *Cloud name* |
| `CLOUDINARY_API_KEY` | — | **Required for uploads.** Cloudinary → Settings → API Keys |
| `CLOUDINARY_API_SECRET` | — | **Required for uploads.** Secret — never share it. Without these three, payment proofs, KYC documents and the QR code can't be uploaded (the server logs a warning) |
| `CLOUDINARY_FOLDER` | `aroviaskilltech` | Folder in your Cloudinary Media Library for this site's files |
| `CLOUDINARY_URL` | — | Alternative to the three values above: `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` |
| `SMTP_HOST` | empty | SMTP server. Empty = emails are not delivered (in development they are printed to the console) and the server logs a warning |
| `SMTP_PORT` | `587` | `465` uses SSL, others use STARTTLS |
| `SMTP_USER`, `SMTP_PASS` | empty | SMTP credentials. **Required in production**: registration and withdrawals need an email OTP. For Gmail, `SMTP_PASS` must be a 16-character [App Password](https://myaccount.google.com/apppasswords) (needs 2-Step Verification), not the account password |
| `MAIL_FROM` | `AroviaSkillTech <aroviaskilltechnologies@gmail.com>` | Sender shown in emails |

`ADMIN_*` and `ROOT_PASSWORD` are used only when those accounts are **first created**. Editing
`.env` later does not change existing accounts:

- **Admin password** — admin panel → key icon next to your name in the sidebar → *Change admin password*.
- **Any member's password (including the root member)** — admin panel → Members → open the member → *Reset password*.
- **Forgotten password** — *Forgot password?* on the login page (requires SMTP and an email on the account).

`.env` holds secrets (database password, JWT secret, Cloudinary API secret). It is git-ignored: never commit it, paste it in
chat or send it by email. If it leaks, change the database user's password in Atlas → Database Access
and generate a new `JWT_SECRET` (and regenerate the Cloudinary API secret in Cloudinary → Settings → API Keys).

Test-only: `MAIL_LOG=off` hides console email output (used by `npm run test:engine`).

Example production `.env`:

```env
NODE_ENV=production
PORT=5050
CLIENT_URL=https://aroviaskilltechnologies.com
MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME=iskillmatrix
JWT_SECRET=paste-output-of-openssl-rand-hex-32
JWT_EXPIRES_IN=1d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=a-strong-unique-password
ADMIN_EMAIL=aroviaskilltechnologies@gmail.com
ROOT_PASSWORD=another-strong-unique-password
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=aroviaskilltech
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=aroviaskilltechnologies@gmail.com
SMTP_PASS=app-password
MAIL_FROM="AroviaSkillTech <aroviaskilltechnologies@gmail.com>"
```

## 2. Admin settings

Admin → **System Settings** (tabs) and Admin → **Packages & Income**. Every save increments the
settings `version`; the previous version is kept (History button). Existing ledger entries are never recalculated.

### Website (`site`)
| Setting | Default | Used on |
|---------|---------|---------|
| Site name, tagline | AroviaSkillTech · Learn Skills. Build Your Future. | Footer, page text |
| Support email, phone, WhatsApp, address | `aroviaskilltechnologies@gmail.com`, empty | Footer and Contact page |

### QR payment (`payment`, `tax`)
| Setting | Default | Notes |
|---------|---------|-------|
| QR code image | none | Upload PNG/JPG. Members see a placeholder until it is uploaded |
| UPI ID, payee name | empty, AROVIA SKILL TECHNOLOGIES PRIVATE LIMITED | Shown next to the QR with a copy button |
| Instructions | "Scan the QR code, pay the exact package amount…" | Shown on the activation page |
| GST % | 18 | Price split and reports |
| System cost % | 12 | Price split and reports |

### Income rules (`weekly`, `monthlyBonus`, `nonWorking`, `income`)
| Setting | Default | Notes |
|---------|---------|-------|
| Pool % of weekly sales (`weekly.percent`) | 5 | Pool = % × company bundle sales in the week, split equally among qualified members |
| Same-bundle direct sales to qualify (`weekly.qualifyingSales`) | 3 | weekly-eligible bundles only |
| Company sales counted as (`weekly.poolBasis`) | `collection` | `collection` = amount received; `net` = after GST and system cost |
| Process the weekly pool automatically (`weekly.autoProcess`) | on | runs Monday 12:05 AM IST |
| Credit wallets without approval (`weekly.autoApprove`) | on | off = the automatic run waits for **Approve & credit** |
| Monthly threshold rule | Strictly greater (`gt`) | or `gte` |
| Monthly slabs | >20,000 → 1,500 · >50,000 → 4,000 · >1,00,000 → 10,000 | add/remove rows |
| Auto-credit non-working at 12 AM | on | off = credit manually in Income Processing |
| Only active members with a package receive income | on | off = inactive uplines are paid too |

### Badges & royalty (`badges`, `badgeQualifyingCategories`, `royalty`)
| Setting | Default |
|---------|---------|
| Badges (key, name, lifetime ₹) | Bronze 5,000 → Sapphire Director 1,00,00,000 (10 badges) |
| Income types counted for badges | Active, Passive |
| Royalty basis | Team (downline) Active + Passive; or member's own |
| Royalty slabs (badge key, %) | emerald 5 · senior_emerald 6 · director 7 · senior_director 8 · sapphire_director 10 |

Badge keys are referenced by royalty slabs and by members' stored badges — rename a badge's **name**
freely, but keep its **key** stable once members hold it.

### Withdrawal (`withdrawal`)
| Setting | Default |
|---------|---------|
| TDS % | 2 |
| Admin charge % | 5 |
| Minimum / maximum | ₹500 / ₹1,00,000 (`0` = no maximum) |
| Require approved KYC | on |

### Deposits & transfers (`wallet`)
| Setting | Default |
|---------|---------|
| Minimum deposit | ₹100 |
| Maximum deposit | `0` = no maximum |
| Minimum transfer | ₹100 |

Deposits use the same QR code / UPI ID as bundle payments (`payment`).

### Packages (Admin → Packages & Income)
Per package: name, customer price, active income, passive amount per level (add/remove levels),
non-working bonus, weekly eligible, status (inactive = hidden from new purchases), description, benefits.
The editor shows package cost, total payout per sale and the company margin, and warns if the payout
exceeds the package cost.
