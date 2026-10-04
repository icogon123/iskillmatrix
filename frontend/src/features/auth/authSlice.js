import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'checking' }, // checking | authenticated | guest
  reducers: {
    setUser(state, { payload }) {
      state.user = payload;
      state.status = payload ? 'authenticated' : 'guest';
    },
    loggedOut(state) {
      state.user = null;
      state.status = 'guest';
    },
    sessionExpired(state) {
      state.user = null;
      state.status = 'guest';
    },
  },
});

export const { setUser, loggedOut, sessionExpired } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (s) => s.auth.user;
export const selectAuthStatus = (s) => s.auth.status;
