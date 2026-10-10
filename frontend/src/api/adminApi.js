import { api } from '../app/api';
import { qs } from './memberApi';

const post = (url, body) => ({ url, method: 'POST', body });

export const adminApi = api.injectEndpoints({
  endpoints: (b) => ({
    adminDashboard: b.query({ query: () => '/admin/dashboard', providesTags: ['AdminDashboard'] }),

    registrations: b.query({ query: (p) => `/admin/registrations${qs(p)}`, providesTags: ['Registrations'] }),
    approveRegistration: b.mutation({ query: (id) => post(`/admin/registrations/${id}/approve`), invalidatesTags: ['Registrations', 'AdminDashboard', 'Members'] }),
    rejectRegistration: b.mutation({ query: ({ id, reason }) => post(`/admin/registrations/${id}/reject`, { reason }), invalidatesTags: ['Registrations', 'AdminDashboard'] }),

    members: b.query({ query: (p) => `/admin/members${qs(p)}`, providesTags: ['Members'] }),
    member: b.query({ query: (id) => `/admin/members/${id}`, providesTags: (_r, _e, id) => [{ type: 'Member', id }] }),
    memberStatus: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/members/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => ['Members', 'AdminDashboard', { type: 'Member', id }],
    }),
    memberProfile: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/members/${id}/profile`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => ['Members', { type: 'Member', id }],
    }),
    memberResetPassword: b.mutation({ query: ({ id, password }) => post(`/admin/members/${id}/reset-password`, { password }) }),
    walletStatus: b.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/members/${id}/wallet-status`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => ['Members', 'AdminWithdrawals', { type: 'Member', id }],
    }),
    walletAdjust: b.mutation({
      query: ({ id, ...body }) => post(`/admin/members/${id}/wallet-adjust`, body),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Member', id }, 'AdminLedger', 'AdminDashboard'],
    }),

    adminKyc: b.query({ query: (p) => `/admin/kyc${qs(p)}`, providesTags: ['AdminKyc'] }),
    reviewKyc: b.mutation({ query: ({ id, ...body }) => post(`/admin/kyc/${id}/review`, body), invalidatesTags: ['AdminKyc', 'AdminDashboard', 'Member', 'Members'] }),

    adminPayments: b.query({ query: (p) => `/admin/payments${qs(p)}`, providesTags: ['AdminPayments'] }),
    approvePayment: b.mutation({
      query: ({ id, remarks }) => post(`/admin/payments/${id}/approve`, { remarks }),
      invalidatesTags: ['AdminPayments', 'AdminDashboard', 'Members', 'Member', 'AdminLedger', 'Processing'],
    }),
    rejectPayment: b.mutation({ query: ({ id, reason }) => post(`/admin/payments/${id}/reject`, { reason }), invalidatesTags: ['AdminPayments', 'AdminDashboard'] }),

    adminDeposits: b.query({ query: (p) => `/admin/deposits${qs(p)}`, providesTags: ['AdminDeposits'] }),
    approveDeposit: b.mutation({
      query: ({ id, remarks }) => post(`/admin/deposits/${id}/approve`, { remarks }),
      invalidatesTags: ['AdminDeposits', 'AdminDashboard', 'Member', 'AdminLedger'],
    }),
    rejectDeposit: b.mutation({ query: ({ id, reason }) => post(`/admin/deposits/${id}/reject`, { reason }), invalidatesTags: ['AdminDeposits', 'AdminDashboard', 'Member'] }),

    adminWithdrawals: b.query({ query: (p) => `/admin/withdrawals${qs(p)}`, providesTags: ['AdminWithdrawals'] }),
    updateWithdrawal: b.mutation({
      query: ({ id, ...body }) => post(`/admin/withdrawals/${id}/status`, body),
      invalidatesTags: ['AdminWithdrawals', 'AdminDashboard', 'AdminLedger', 'Member'],
    }),

    processing: b.query({ query: () => '/admin/processing', providesTags: ['Processing'] }),
    weeklyPool: b.query({ query: (week) => `/admin/processing/weekly-pool${qs({ week })}`, providesTags: ['Processing'] }),
    runNonWorking: b.mutation({ query: (body) => post('/admin/processing/non-working', body), invalidatesTags: ['Processing', 'AdminDashboard', 'AdminLedger'] }),
    generateRun: b.mutation({ query: ({ type, period }) => post(`/admin/processing/runs/${type}`, { period }), invalidatesTags: ['Processing'] }),
    runDetail: b.query({ query: (id) => `/admin/processing/runs/${id}`, providesTags: (_r, _e, id) => [{ type: 'Processing', id }] }),
    approveRun: b.mutation({ query: (id) => post(`/admin/processing/runs/${id}/approve`), invalidatesTags: ['Processing', 'AdminDashboard', 'AdminLedger'] }),
    cancelRun: b.mutation({ query: (id) => post(`/admin/processing/runs/${id}/cancel`), invalidatesTags: ['Processing'] }),

    adminPackages: b.query({ query: () => '/admin/packages', providesTags: ['Packages'] }),
    updatePackage: b.mutation({ query: ({ id, ...body }) => ({ url: `/admin/packages/${id}`, method: 'PUT', body }), invalidatesTags: ['Packages', 'Courses'] }),
    adminCourses: b.query({ query: () => '/admin/courses', providesTags: ['Courses'] }),
    createCourse: b.mutation({ query: (body) => ({ url: '/admin/courses', method: 'POST', body }), invalidatesTags: ['Courses'] }),
    updateCourse: b.mutation({ query: ({ id, ...body }) => ({ url: `/admin/courses/${id}`, method: 'PUT', body }), invalidatesTags: ['Courses'] }),

    settings: b.query({ query: () => '/admin/settings', providesTags: ['Settings'] }),
    updateSettings: b.mutation({ query: (body) => ({ url: '/admin/settings', method: 'PUT', body }), invalidatesTags: ['Settings'] }),
    uploadQr: b.mutation({ query: (formData) => post('/admin/settings/qr', formData), invalidatesTags: ['Settings'] }),
    settingsHistory: b.query({ query: (p) => `/admin/settings/history${qs(p)}`, providesTags: ['Settings'] }),

    adminLedger: b.query({ query: (p) => `/admin/ledger${qs(p)}`, providesTags: ['AdminLedger'] }),
    auditLogs: b.query({ query: (p) => `/admin/audit-logs${qs(p)}`, providesTags: ['Audit'] }),
    network: b.query({ query: (p) => `/admin/network${qs(p)}` }),
    reportTypes: b.query({ query: () => '/admin/reports' }),
    report: b.query({ query: ({ type, ...p }) => `/admin/reports/${type}${qs(p)}` }),
  }),
});

export const {
  useAdminDashboardQuery, useRegistrationsQuery, useApproveRegistrationMutation, useRejectRegistrationMutation, useMembersQuery, useMemberQuery,
  useMemberStatusMutation, useMemberProfileMutation, useMemberResetPasswordMutation, useWalletAdjustMutation, useWalletStatusMutation, useAdminKycQuery, useReviewKycMutation,
  useAdminPaymentsQuery, useApprovePaymentMutation, useRejectPaymentMutation, useAdminDepositsQuery, useApproveDepositMutation, useRejectDepositMutation, useAdminWithdrawalsQuery, useUpdateWithdrawalMutation,
  useProcessingQuery, useWeeklyPoolQuery, useRunNonWorkingMutation, useGenerateRunMutation, useRunDetailQuery, useApproveRunMutation, useCancelRunMutation,
  useAdminPackagesQuery, useUpdatePackageMutation, useAdminCoursesQuery, useCreateCourseMutation, useUpdateCourseMutation, useSettingsQuery, useUpdateSettingsMutation, useUploadQrMutation, useSettingsHistoryQuery,
  useAdminLedgerQuery, useAuditLogsQuery, useNetworkQuery, useLazyNetworkQuery, useReportTypesQuery, useLazyReportQuery,
} = adminApi;
