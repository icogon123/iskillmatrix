import { api } from '../app/api';

const qs = (params = {}) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)).toString();
  return s ? `?${s}` : '';
};
export { qs };

export const memberApi = api.injectEndpoints({
  endpoints: (b) => ({
    dashboard: b.query({ query: () => '/member/dashboard', providesTags: ['Dashboard'] }),
    profile: b.query({ query: () => '/member/profile', providesTags: ['Me'] }),
    uploadAvatar: b.mutation({ query: (formData) => ({ url: '/member/avatar', method: 'POST', body: formData }), invalidatesTags: ['Me', 'Dashboard'] }),
    removeAvatar: b.mutation({ query: () => ({ url: '/member/avatar', method: 'DELETE' }), invalidatesTags: ['Me', 'Dashboard'] }),
    changeTxnPassword: b.mutation({ query: (body) => ({ url: '/member/change-txn-password', method: 'POST', body }) }),

    paymentInfo: b.query({ query: () => '/member/payment-info', providesTags: ['Payments'] }),
    submitPayment: b.mutation({
      query: (formData) => ({ url: '/member/payments', method: 'POST', body: formData }),
      invalidatesTags: ['Payments', 'Dashboard'],
    }),

    kyc: b.query({ query: () => '/member/kyc', providesTags: ['Kyc'] }),
    submitKyc: b.mutation({ query: (formData) => ({ url: '/member/kyc', method: 'POST', body: formData }), invalidatesTags: ['Kyc', 'Dashboard', 'Wallet'] }),

    team: b.query({ query: () => '/member/team', providesTags: ['Team'] }),
    teamMembers: b.query({ query: (p) => `/member/team/members${qs(p)}`, providesTags: ['Team'] }),
    treeNode: b.query({ query: (node) => `/member/team/tree${qs({ node })}`, providesTags: ['Team'] }),

    incomeSummary: b.query({ query: () => '/member/income', providesTags: ['Ledger'] }),
    ledger: b.query({ query: (p) => `/member/ledger${qs(p)}`, providesTags: ['Ledger'] }),
    wallet: b.query({ query: () => '/member/wallet', providesTags: ['Wallet'] }),
    statement: b.query({ query: (p) => `/member/wallet/statement${qs(p)}`, providesTags: ['Wallet', 'Ledger'] }),
    memberLookup: b.query({ query: (username) => `/member/members/lookup${qs({ username })}` }),
    transfers: b.query({ query: (p) => `/member/transfers${qs(p)}`, providesTags: ['Transfers'] }),
    createTransfer: b.mutation({
      query: (body) => ({ url: '/member/transfers', method: 'POST', body }),
      invalidatesTags: ['Transfers', 'Wallet', 'Ledger', 'Dashboard', 'Payments'],
    }),
    walletPurchase: b.mutation({
      query: (body) => ({ url: '/member/wallet/purchase', method: 'POST', body }),
      invalidatesTags: ['Payments', 'Wallet', 'Ledger', 'Dashboard', 'Me', 'Team', 'Notifications'],
    }),
    activations: b.query({ query: (p) => `/member/wallet/activations${qs(p)}`, providesTags: ['Payments'] }),
    deposits: b.query({ query: (p) => `/member/deposits${qs(p)}`, providesTags: ['Deposits'] }),
    createDeposit: b.mutation({ query: (formData) => ({ url: '/member/deposits', method: 'POST', body: formData }), invalidatesTags: ['Deposits'] }),
    withdrawals: b.query({ query: (p) => `/member/withdrawals${qs(p)}`, providesTags: ['Withdrawals'] }),
    createWithdrawal: b.mutation({
      query: (body) => ({ url: '/member/withdrawals', method: 'POST', body }),
      invalidatesTags: ['Withdrawals', 'Wallet', 'Ledger', 'Dashboard', 'Notifications'],
    }),
    cancelWithdrawal: b.mutation({
      query: (id) => ({ url: `/member/withdrawals/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['Withdrawals', 'Wallet', 'Ledger', 'Dashboard'],
    }),

    achievements: b.query({ query: () => '/member/achievements', providesTags: ['Achievements'] }),
    notifications: b.query({ query: (p) => `/member/notifications${qs(p)}`, providesTags: ['Notifications'] }),
    markRead: b.mutation({
      query: (id) => ({ url: id ? `/member/notifications/${id}/read` : '/member/notifications/read', method: 'POST' }),
      invalidatesTags: ['Notifications', 'Dashboard'],
    }),
  }),
});

export const {
  useUploadAvatarMutation, useRemoveAvatarMutation, useStatementQuery, useLazyStatementQuery, useLazyMemberLookupQuery, useTransfersQuery,
  useCreateTransferMutation, useWalletPurchaseMutation, useActivationsQuery, useDepositsQuery, useCreateDepositMutation,
  useDashboardQuery, useProfileQuery, useChangeTxnPasswordMutation, usePaymentInfoQuery, useSubmitPaymentMutation, useKycQuery,
  useSubmitKycMutation, useTeamQuery, useTeamMembersQuery, useTreeNodeQuery, useLazyTreeNodeQuery, useIncomeSummaryQuery, useLedgerQuery,
  useWalletQuery, useWithdrawalsQuery, useCreateWithdrawalMutation, useCancelWithdrawalMutation, useAchievementsQuery,
  useNotificationsQuery, useMarkReadMutation,
} = memberApi;
