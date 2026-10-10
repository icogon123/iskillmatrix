import { createSlice } from '@reduxjs/toolkit';
import { savedTheme } from '../../lib/useTheme';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: false, hideAmounts: false, theme: savedTheme() },
  reducers: {
    toggleSidebar(state, { payload }) {
      state.sidebarOpen = typeof payload === 'boolean' ? payload : !state.sidebarOpen;
    },
    toggleAmounts(state) {
      state.hideAmounts = !state.hideAmounts;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
  },
});

export const { toggleSidebar, toggleAmounts, toggleTheme } = uiSlice.actions;
export default uiSlice.reducer;
