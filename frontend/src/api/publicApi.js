import { api } from '../app/api';
import { setUser, loggedOut } from '../features/auth/authSlice';

export const publicApi = api.injectEndpoints({
  endpoints: (b) => ({
    packages: b.query({ query: () => '/public/packages', providesTags: ['Packages'] }),
    courses: b.query({ query: () => '/public/courses', providesTags: ['Courses', 'Packages'] }),
    site: b.query({ query: () => '/public/site' }),
    sponsor: b.query({ query: (code) => `/public/sponsor/${encodeURIComponent(code)}` }),
    checkUsername: b.query({ query: (u) => `/auth/check-username?username=${encodeURIComponent(u)}` }),

    me: b.query({
      query: () => '/auth/me',
      providesTags: ['Me'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.user));
        } catch {
          dispatch(setUser(null));
        }
      },
    }),
    login: b.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser(data.user));
        } catch {
          /* handled by the form */
        }
      },
    }),
    logout: b.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled.catch(() => {});
        dispatch(loggedOut());
      },
    }),
    sendRegisterOtp: b.mutation({ query: (body) => ({ url: '/auth/register/send-otp', method: 'POST', body }) }),
    register: b.mutation({ query: (body) => ({ url: '/auth/register', method: 'POST', body }), invalidatesTags: ['Team', 'Dashboard', 'Notifications'] }),
    forgotPassword: b.mutation({ query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }) }),
    resetPassword: b.mutation({ query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }) }),
    changePassword: b.mutation({ query: (body) => ({ url: '/auth/change-password', method: 'POST', body }) }),
  }),
});

export const {
  usePackagesQuery, useCoursesQuery, useSiteQuery, useLazySponsorQuery, useLazyCheckUsernameQuery, useMeQuery, useLoginMutation,
  useLogoutMutation, useSendRegisterOtpMutation, useRegisterMutation, useForgotPasswordMutation, useResetPasswordMutation, useChangePasswordMutation,
} = publicApi;
