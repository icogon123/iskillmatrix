import { useEffect, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';

// Keep in sync with the boot script in index.html, which applies the theme before the app loads.
export const THEME_KEY = 'ism-theme';

/** Member and admin apps follow the user's light/dark choice; the website and auth pages are always light. */
export const isAppPath = (path) => /^\/(app|admin)(\/|$)/.test(path) && path !== '/admin/login';

export function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Puts the theme classes on <html>, so modals and toasts (rendered outside the layouts) follow it too. */
export function useThemeClass(pathname) {
  const theme = useSelector((s) => s.ui.theme);
  const inApp = isAppPath(pathname);
  const light = !inApp || theme === 'light';

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('theme-light', light);
    html.classList.toggle('surface-app', inApp);
  }, [light, inApp]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage unavailable (private mode): the choice lasts for this visit only.
    }
  }, [theme]);
}
