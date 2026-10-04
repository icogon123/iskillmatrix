import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: false, hideAmounts: false },
  reducers: {
    toggleSidebar(state, { payload }) {
      state.sidebarOpen = typeof payload === 'boolean' ? payload : !state.sidebarOpen;
    },
    toggleAmounts(state) {
      state.hideAmounts = !state.hideAmounts;
    },
  },
});

export const { toggleSidebar, toggleAmounts } = uiSlice.actions;
export default uiSlice.reducer;
