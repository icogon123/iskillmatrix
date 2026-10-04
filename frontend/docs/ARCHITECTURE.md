# Frontend architecture

## 1. Big picture

```
main.jsx
 └─ <Provider store>          Redux store (RTK Query cache + auth + ui)
     └─ <BrowserRouter>
         └─ <App>             useMeQuery() → restores the session from the cookie
             ├─ PublicLayout   header + footer      → website pages
             ├─ auth pages     (own full-screen layout: AuthShell)
             ├─ RequireAuth role="member" → MemberLayout → /app/* pages
             └─ RequireAuth role="admin"  → AdminLayout  → /admin/* pages
```

- **Server data** (dashboard numbers, lists, settings…) lives in the **RTK Query cache** — fetched by
  hooks like `useDashboardQuery()`, refreshed automatically after mutations via cache tags.
- **Client state** lives in two small slices: `auth` (who is logged in) and `ui` (sidebar, hide amounts).
- Components never call `fetch` directly; they use the generated hooks.

## 2. Routing (`src/App.jsx`)

| Path prefix | Layout | Guard |
|-------------|--------|-------|
| `/`, `/about`, `/plan`, `/packages`, `/contact` | `PublicLayout` | none |
| `/login`, `/admin/login`, `/register`, `/forgot-password`, `/reset-password` | `AuthShell` (inside each page) | none (logged-in users are redirected from login) |
| `/app/*` | `MemberLayout` | `RequireAuth role="member"` |
| `/admin/*` | `AdminLayout` | `RequireAuth role="admin"` |
| `*` | — | `NotFound` |

All pages except Home are **lazy-loaded** (`React.lazy` + `Suspense`), so the public site does not
download admin code. Vite splits each page into its own chunk.

The full route list is in [PAGES.md](PAGES.md).

## 3. Login and session flow

```
App mounts → useMeQuery() → GET /api/auth/me (cookie sent automatically)
   200 → authSlice.setUser(user) → status "authenticated"
   401 → authSlice.setUser(null) → status "guest"

RequireAuth
   status "checking"           → full-page loader
   no user                      → redirect to /login?next=<current url>  (or /admin/login)
   user with the other role     → redirect to their own area (/app or /admin)

Login page → useLoginMutation() → POST /api/auth/login → cookie set → setUser → navigate(next || home)

Logout → POST /api/auth/logout → loggedOut() → store.js listener calls api.util.resetApiState()
         (the next user can never see the previous user's cached data)

Any API call returning 401 (session expired, password changed elsewhere, account suspended)
         → base query dispatches sessionExpired() → RequireAuth sends the user to login
```

The JWT lives in an **httpOnly cookie** set by the server; JavaScript never reads or stores it
(no localStorage), which protects it from XSS. Requests use `credentials: 'include'`.

## 4. Layouts

| Layout | Desktop | Mobile |
|--------|---------|--------|
| `PublicLayout` | Sticky header with nav + Login / Join Now, footer with contact info from settings | Hamburger menu |
| `MemberLayout` | Left sidebar (profile card + 12 links), top bar "Hi, <name>", eye toggle (hide amounts), notification bell with unread count | Top bar + **bottom navigation** (Home, Team, Earning, Wallet, More) as in the mockup; "More" opens the sidebar drawer |
| `AdminLayout` | Grouped sidebar (Overview, Approvals, Network & Income, Configuration) with live pending counts | Drawer menu |

Layouts scroll to top and close the drawer on navigation. Notification count and admin queue counts
poll every 60 seconds.

## 5. Data flow inside a page (example: Withdraw)

```jsx
const { data: wallet, isLoading } = useWalletQuery();             // GET /member/wallet (cached, tag 'Wallet')
const [create, { isLoading: saving }] = useCreateWithdrawalMutation();

await create({ amount, txnPassword }).unwrap();                     // POST /member/withdrawals
// invalidatesTags: Withdrawals, Wallet, Ledger, Dashboard, Notifications
// → every mounted query with those tags refetches automatically
```

Admin pages wrap mutations with `useAction(trigger)` (`src/lib/useAction.js`), which unwraps the
result, shows a success toast with the server's message (and any `warning`), or an error toast.

## 6. Forms and validation

- Inputs are controlled components (`useState`).
- The registration form validates on the client (same rules as the server) and also maps the
  server's `422 errors[]` back onto fields.
- Sponsor ID and username are checked live with debounced lazy queries (`useDebounce` 400 ms).
- File uploads use `FormData` (payments, KYC, QR) — RTK Query sends them as `multipart/form-data`.
- Confirmations never use `window.confirm`; they use `ConfirmModal`, which can also collect a reason
  or a reference (e.g. rejection reason, bank payment reference).

## 7. Formatting conventions

- Money: `inr(n)` → `₹1,23,456.5` (Indian grouping). Members' amounts render through `<Money>`,
  which respects the hide-amounts toggle.
- Dates: `date()`, `dateTime()` in **Asia/Kolkata** time, regardless of the viewer's time zone.
- Status values (`pending`, `under_review`…) render with `<StatusBadge>` for consistent colours.

## 8. Adding a new page — checklist

1. Add endpoints in `src/api/memberApi.js` or `adminApi.js` (`providesTags` / `invalidatesTags`).
2. Create the page in `src/pages/member/` or `src/pages/admin/` using `PageHeader`, `Card`, `DataTable`…
3. Register the route in `src/App.jsx` with `lazy(() => import(...))`.
4. Add a nav link in `MEMBER_NAV` (`MemberLayout.jsx`) or `NAV` (`AdminLayout.jsx`).
5. Check it at phone width (≈390 px) and desktop.

## 9. Dev server and build

- `vite.config.js` proxies `/api` and `/uploads` to `VITE_API_PROXY` (default `http://127.0.0.1:5050`),
  so cookies are same-origin in development too.
- `npm run build` produces static files in `dist/`; the backend serves them in production with an
  SPA fallback (unknown paths → `index.html`).
