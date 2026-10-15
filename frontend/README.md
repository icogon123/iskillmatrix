# AroviaSkillTech — Frontend

One React app containing three areas:

| Area | URL | Who |
|------|-----|-----|
| Public website | `/`, `/courses`, `/courses/:slug`, `/why-us`, `/vision-mission`, `/pricing`, `/about`, `/contact`, `/login`, `/register` | Everyone |
| Member panel | `/app/*` | Logged-in members |
| Admin panel | `/admin/*` (login at `/admin/login`) | Administrators |

| | |
|---|---|
| UI | React 19 |
| State management | Redux Toolkit (store + slices) and RTK Query (server data, caching) |
| Routing | React Router 7 (pages lazy-loaded) |
| Styling | Tailwind CSS 4 with a custom dark theme (navy · violet · gold) |
| Charts | Recharts |
| Icons / toasts | lucide-react · react-hot-toast |
| Build tool | Vite 8 |

Detailed documentation lives in [`docs/`](docs/README.md).

---

## 1. Requirements

- Node.js 20 or newer, npm 9+
- The backend API running (see [`../backend/README.md`](../backend/README.md)). In development the
  frontend forwards `/api` and `/uploads` to `http://127.0.0.1:5050`.

## 2. Install

```bash
cd frontend
npm install
```

## 3. Run (development)

Start the backend first (`cd backend && npm run dev`), then:

```bash
npm run dev
```

Open **http://localhost:5173**.

| Page | Login |
|------|-------|
| Admin panel — http://localhost:5173/admin/login | `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `backend/.env` (first start) |
| Member panel — http://localhost:5173/login | Real member accounts: register at `/register` with a sponsor code (the first one is `ISM100001`) and log in straight away |

All data comes from the real MongoDB database through the API — there are no demo users or sample figures in the frontend.

If the API runs on another port or machine:

```bash
VITE_API_PROXY=http://127.0.0.1:6000 npm run dev
```

## 4. Build (production)

```bash
npm run build      # outputs frontend/dist
npm run preview    # optional: serve the build locally on http://localhost:4173 (uses the same API proxy)
```

In production the backend serves `frontend/dist` itself when `NODE_ENV=production`, so you only
deploy one Node.js server. See [`../backend/docs/DEPLOYMENT.md`](../backend/docs/DEPLOYMENT.md).

The app calls the API with relative URLs (`/api/...`), so the site and the API must be on the same
domain (or behind a proxy that forwards `/api` and `/uploads`).

## 5. npm scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Dev server with hot reload on port 5173, proxies `/api` and `/uploads` to the backend |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` locally |

## 6. Folder structure

```
frontend/
├── index.html                 HTML shell, Google Fonts (Montserrat, Plus Jakarta Sans)
├── vite.config.js             React + Tailwind plugins, dev proxy to the API
├── public/
│   └── favicon.svg
├── docs/                      Documentation (start at docs/README.md)
└── src/
    ├── main.jsx               Entry: Redux <Provider>, <BrowserRouter>, toast container
    ├── App.jsx                All routes; lazy-loaded pages; session check on load
    ├── index.css              Tailwind import + theme tokens (colours, fonts) + shared classes
    ├── app/
    │   ├── store.js           Redux store (api, auth, ui) + cache reset on logout
    │   └── api.js             RTK Query base API (cookies, 401 handling, cache tags) + errorMessage()
    ├── api/                   RTK Query endpoints (one file per area)
    │   ├── publicApi.js       packages (bundles), courses, site, sponsor lookup, login, register, me, passwords
    │   ├── memberApi.js       dashboard, avatar, payments, KYC, team, income, wallets, transfers, deposits, withdrawals, notifications
    │   └── adminApi.js        admin dashboard, approvals, members, processing, bundles, course catalog, settings, reports
    ├── features/              Redux slices (client state)
    │   ├── auth/authSlice.js  logged-in user and session status
    │   └── ui/uiSlice.js      mobile sidebar open/closed, hide-amounts toggle
    ├── components/
    │   ├── ui/                Design-system building blocks (Button, Card, Input, Modal, DataTable, …)
    │   ├── layout/            PublicLayout, MemberLayout, AdminLayout, RequireAuth (route guard)
    │   └── common/            App-specific pieces (Logo, BadgeMedal, IncomeBreakdown, TreeView, WalletArt, …)
    ├── pages/
    │   ├── public/            Website + auth pages (Home, Courses, CourseDetail, WhyUs, VisionMission, Pricing, Login, Register, …)
    │   ├── member/            Member panel pages (Dashboard, Activate, P2PActivate, Wallet, Deposit, Transfer, Kyc, Team, Income, Withdraw, …)
    │   └── admin/             Admin panel pages (Dashboard, Registrations, Payments, Processing, Reports, …)
    └── lib/                   Helpers: formatting (₹, dates in IST), constants/labels/colours,
                               CSV export, useDebounce, useAction (mutation + toast)
```

## 7. Documentation

| Document | Contents |
|----------|----------|
| [docs/README.md](docs/README.md) | Index |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Routing, layouts, auth flow, data flow, how to add a page |
| [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) | Redux store, slices, RTK Query endpoints and cache tags |
| [docs/UI_AND_THEME.md](docs/UI_AND_THEME.md) | Colours, fonts, components, charts, responsive rules |
| [docs/PAGES.md](docs/PAGES.md) | Every route and what it shows |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Step-by-step guide for members and administrators |

## 8. Troubleshooting

| Problem | Fix |
|---------|-----|
| "Cannot reach the server" toasts | The backend isn't running on 5050, or `VITE_API_PROXY` points to the wrong place. |
| Login works but you're sent back to login | Cookies blocked, or the site and API are on different domains without a proxy. |
| Blank page after deploying | Make sure unknown paths are served `index.html` (the backend does this automatically in production). |
| Port 5173 busy | Vite picks the next free port; use the URL it prints. |
