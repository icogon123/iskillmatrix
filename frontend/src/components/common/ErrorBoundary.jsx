import { Component } from 'react';
import { RefreshCw } from 'lucide-react';
import Logo from './Logo';

// After a new deploy, an open tab may ask for a code file from the previous build that no longer exists.
const isStaleBuild = (error) =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(error?.message || '');

const RELOAD_KEY = 'ism:stale-build-reload';

/** Reloads the page once (per minute) to pick up the new build. Returns false if it already tried. */
export function reloadForNewBuild() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage unavailable: reload anyway */
  }
  window.location.reload();
  return true;
}

/** Catches render errors so a crash shows a recovery screen instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  // Navigating to another page clears the error.
  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error) {
    if (isStaleBuild(error) && reloadForNewBuild()) return;
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-950 px-5">
        <div className="max-w-sm text-center">
          <Logo className="justify-center" />
          <h1 className="mt-8 text-xl font-bold text-fg">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">This page didn’t load properly. Reloading usually fixes it.</p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500">
              <RefreshCw className="size-4" /> Reload
            </button>
            <a href="/" className="inline-flex h-10 items-center rounded-xl border border-line px-4 text-sm font-semibold text-fg hover:bg-fg/5">Go to home</a>
          </div>
        </div>
      </div>
    );
  }
}
