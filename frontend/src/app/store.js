import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from './api';
import authReducer, { loggedOut, sessionExpired } from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefault) => getDefault().concat(api.middleware),
});

// Drop all cached server data when the session ends so the next user never sees it.
store.subscribe(
  (() => {
    let prev = store.getState().auth.user?._id;
    return () => {
      const cur = store.getState().auth.user?._id;
      const ended = prev && !cur;
      // Update before dispatching: dispatch re-enters this listener synchronously.
      prev = cur;
      if (ended) store.dispatch(api.util.resetApiState());
    };
  })(),
);

setupListeners(store.dispatch);
export { loggedOut, sessionExpired };
