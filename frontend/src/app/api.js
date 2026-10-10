import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { sessionExpired } from '../features/auth/authSlice';

const rawBaseQuery = fetchBaseQuery({ baseUrl: '/api', credentials: 'include' });

/** Base query that logs the user out locally when the server says the session is gone. */
const baseQuery = async (args, api, extra) => {
  const result = await rawBaseQuery(args, api, extra);
  const url = typeof args === 'string' ? args : args.url;
  if (result.error?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/me')) {
    api.dispatch(sessionExpired());
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Me', 'Dashboard', 'Payments', 'Kyc', 'Team', 'Ledger', 'Wallet', 'Withdrawals', 'Notifications', 'Achievements', 'Transfers', 'Deposits',
    'AdminDashboard', 'Registrations', 'Members', 'Member', 'AdminKyc', 'AdminPayments', 'AdminWithdrawals', 'Processing',
    'Packages', 'Courses', 'Settings', 'AdminLedger', 'Audit', 'AdminDeposits',
  ],
  endpoints: () => ({}),
});

/** Turns an RTK Query error into a readable message. */
export const errorMessage = (err, fallback = 'Something went wrong') =>
  err?.data?.message || (err?.status === 'FETCH_ERROR' ? 'Cannot reach the server. Check your connection.' : err?.error) || fallback;
