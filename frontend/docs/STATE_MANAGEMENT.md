# State management (Redux Toolkit + RTK Query)

## 1. Store shape

`src/app/store.js`

```js
{
  api:  { … },                 // RTK Query cache: every fetched server response
  auth: { user, status },      // status: 'checking' | 'authenticated' | 'guest'
  ui:   { sidebarOpen, hideAmounts },
}
```

| Kind of state | Where it lives | Why |
|---------------|----------------|-----|
| Data from the server (lists, totals, settings) | RTK Query cache (`api`) | Caching, de-duplication, loading/error flags, automatic refetch after mutations |
| Who is logged in | `auth` slice | Read synchronously by route guards and layouts |
| UI preferences | `ui` slice | Mobile sidebar open/closed, hide-amounts privacy toggle |
| Form inputs, open modals, filters | Component `useState` | Local, short-lived |

Store wiring:
- `setupListeners` enables refetch on window focus / reconnect where requested.
- A store subscriber resets the whole API cache when the user changes from logged-in to logged-out.

## 2. Slices

### `features/auth/authSlice.js`

| Action | Effect |
|--------|--------|
| `setUser(user \| null)` | Sets the user and `status` (`authenticated` or `guest`) |
| `loggedOut()` | Clears the user (dispatched after `POST /auth/logout`) |
| `sessionExpired()` | Clears the user (dispatched by the base query on a 401) |

Selectors: `selectUser`, `selectAuthStatus`.

### `features/ui/uiSlice.js`

| Action | Effect |
|--------|--------|
| `toggleSidebar(open?)` | Opens/closes the mobile drawer (closes automatically on navigation) |
| `toggleAmounts()` | Hides/shows rupee amounts in the member panel (`<Money>` reads it) |

## 3. RTK Query

### Base API — `src/app/api.js`

- `baseUrl: '/api'`, `credentials: 'include'` (sends the httpOnly session cookie).
- Wrapper base query: a `401` from any endpoint except `/auth/login` and `/auth/me` dispatches
  `sessionExpired()`.
- `errorMessage(err)` turns any RTK error into a readable string (server `message`, network error…).
- Endpoints are added with `api.injectEndpoints` in three files (below), so each area's code is separate
  but shares one cache.

### Cache tags

A query **provides** tags; a mutation **invalidates** tags; RTK Query refetches every mounted query
whose tag was invalidated. Example: approving a payment invalidates `AdminPayments`, `AdminDashboard`,
`Members`, `Member`, `AdminLedger`, `Processing`, so the payment list, dashboard numbers, member pages,
ledger and processing screen all update without manual refresh.

Tags: `Me`, `Dashboard`, `Payments`, `Kyc`, `Team`, `Ledger`, `Wallet`, `Withdrawals`, `Notifications`,
`Achievements`, `Transfers`, `Deposits`, `AdminDashboard`, `Registrations`, `Members`, `Member`, `AdminKyc`,
`AdminPayments`, `AdminDeposits`, `AdminWithdrawals`, `Processing`, `Packages`, `Courses`, `Settings`, `AdminLedger`, `Audit`.

### `src/api/publicApi.js`

| Hook | Request | Notes |
|------|---------|-------|
| `usePackagesQuery` | GET `/public/packages` (bundles) | tag `Packages` |
| `useCoursesQuery` | GET `/public/courses` | tags `Courses`, `Packages` |
| `useSiteQuery` | GET `/public/site` | contact info + plan parameters |
| `useLazySponsorQuery` | GET `/public/sponsor/:code` | live sponsor name on registration |
| `useLazyCheckUsernameQuery` | GET `/auth/check-username` | live availability |
| `useMeQuery` | GET `/auth/me` | `onQueryStarted` → `setUser(user or null)` |
| `useLoginMutation` | POST `/auth/login` | `onQueryStarted` → `setUser(user)` |
| `useLogoutMutation` | POST `/auth/logout` | → `loggedOut()` |
| `useRegisterMutation` | POST `/auth/register` | |
| `useForgotPasswordMutation`, `useResetPasswordMutation` | POST | |
| `useChangePasswordMutation` | POST `/auth/change-password` | |

### `src/api/memberApi.js`

| Hook | Request | Provides / invalidates |
|------|---------|------------------------|
| `useDashboardQuery` | GET `/member/dashboard` | `Dashboard` |
| `useProfileQuery` | GET `/member/profile` | `Me` |
| `useUploadAvatarMutation` / `useRemoveAvatarMutation` | POST / DELETE `/member/avatar` | ✗ `Me`, `Dashboard` |
| `useChangeTxnPasswordMutation` | POST `/member/change-txn-password` | |
| `usePaymentInfoQuery` | GET `/member/payment-info` | `Payments` |
| `useWalletPurchaseMutation` | POST `/member/wallet/purchase` | ✗ `Payments`, `Wallet`, `Ledger`, `Dashboard`, `Me`, `Team`, `Notifications` |
| `useActivationsQuery` | GET `/member/wallet/activations` | `Payments` |
| `useSubmitPaymentMutation` | POST `/member/payments` (FormData) | ✗ `Payments`, `Dashboard` |
| `useKycQuery` / `useSubmitKycMutation` | GET / POST `/member/kyc` | `Kyc` / ✗ `Kyc`, `Dashboard`, `Wallet` |
| `useTeamQuery`, `useTeamMembersQuery`, `useTreeNodeQuery`, `useLazyTreeNodeQuery` | `/member/team…` | `Team` |
| `useIncomeSummaryQuery`, `useLedgerQuery` | `/member/income`, `/member/ledger` | `Ledger` |
| `useWalletQuery` | GET `/member/wallet` | `Wallet` |
| `useStatementQuery`, `useLazyStatementQuery` | GET `/member/wallet/statement` | `Wallet`, `Ledger` |
| `useLazyMemberLookupQuery` | GET `/member/members/lookup` | |
| `useTransfersQuery` / `useCreateTransferMutation` | GET / POST `/member/transfers` | `Transfers` / ✗ `Transfers`, `Wallet`, `Ledger`, `Dashboard`, `Payments` |
| `useDepositsQuery` / `useCreateDepositMutation` | GET / POST `/member/deposits` | `Deposits` / ✗ `Deposits` |
| `useWithdrawalsQuery` | GET `/member/withdrawals` | `Withdrawals` |
| `useCreateWithdrawalMutation` | POST `/member/withdrawals` | ✗ `Withdrawals`, `Wallet`, `Ledger`, `Dashboard`, `Notifications` |
| `useCancelWithdrawalMutation` | POST `/member/withdrawals/:id/cancel` | ✗ `Withdrawals`, `Wallet`, `Ledger`, `Dashboard` |
| `useAchievementsQuery` | GET `/member/achievements` | `Achievements` |
| `useNotificationsQuery`, `useMarkReadMutation` | `/member/notifications…` | `Notifications` / ✗ `Notifications`, `Dashboard` |

The `qs(params)` helper (exported from `memberApi.js`) builds query strings and drops empty values.

### `src/api/adminApi.js`

| Hook(s) | Area | Invalidates on change |
|---------|------|-----------------------|
| `useAdminDashboardQuery` | dashboard (also polled by the sidebar for queue counts) | — |
| `useRegistrationsQuery`, `useApproveRegistrationMutation`, `useRejectRegistrationMutation` | registrations | `Registrations`, `AdminDashboard`, `Members` |
| `useMembersQuery`, `useMemberQuery` | members list / detail (`Member` tag per id) | — |
| `useMemberStatusMutation`, `useMemberProfileMutation`, `useMemberResetPasswordMutation`, `useWalletAdjustMutation` | member actions | `Members`, `Member:<id>`, `AdminLedger`, `AdminDashboard` |
| `useAdminKycQuery`, `useReviewKycMutation` | KYC | `AdminKyc`, `AdminDashboard`, `Member`, `Members` |
| `useAdminPaymentsQuery`, `useApprovePaymentMutation`, `useRejectPaymentMutation` | payments | `AdminPayments`, `AdminDashboard`, `Members`, `Member`, `AdminLedger`, `Processing` |
| `useAdminDepositsQuery`, `useApproveDepositMutation`, `useRejectDepositMutation` | fund deposits | `AdminDeposits`, `AdminDashboard`, `Member`, `AdminLedger` |
| `useAdminWithdrawalsQuery`, `useUpdateWithdrawalMutation` | withdrawals | `AdminWithdrawals`, `AdminDashboard`, `AdminLedger`, `Member` |
| `useProcessingQuery`, `useRunNonWorkingMutation`, `useGenerateRunMutation`, `useRunDetailQuery`, `useApproveRunMutation`, `useCancelRunMutation` | income processing | `Processing`, `AdminDashboard`, `AdminLedger` |
| `useAdminPackagesQuery`, `useUpdatePackageMutation` | packages (bundles) | `Packages` (update also invalidates `Courses`) |
| `useAdminCoursesQuery`, `useCreateCourseMutation`, `useUpdateCourseMutation` | course catalog | `Courses` |
| `useSettingsQuery`, `useUpdateSettingsMutation`, `useUploadQrMutation`, `useSettingsHistoryQuery` | settings | `Settings` |
| `useAdminLedgerQuery`, `useAuditLogsQuery` | ledger, audit | — |
| `useNetworkQuery`, `useLazyNetworkQuery` | network tree | — |
| `useReportTypesQuery`, `useLazyReportQuery` | reports (run on button click) | — |

## 4. Patterns used in pages

```jsx
// Query with params — refetches when params change; previous data shown while fetching
const { data, isFetching } = useMembersQuery({ status, search: debouncedSearch, page });

// Mutation + toast (admin pages)
const [approveT, { isLoading }] = useApprovePaymentMutation();
const approve = useAction(approveT);
if (await approve({ id, remarks })) closeModal();

// Lazy query (on demand)
const [loadNode] = useLazyTreeNodeQuery();
const { node } = await loadNode(id, true).unwrap();   // true = prefer cache
```

- Search boxes are debounced (`useDebounce`) so typing does not send a request per key.
- Pages show `<PageLoader>` on first load and `<ErrorState onRetry={refetch}>` on failure.
- The member dashboard uses `refetchOnMountOrArgChange: 30` so returning to it shows fresh numbers.
