import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import App from './App';
import { reloadForNewBuild } from './components/common/ErrorBoundary';
import './index.css';

// A code file from the previous build failed to load (the site was redeployed): reload to get the new one.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewBuild()) event.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            // Theme tokens, so toasts follow light/dark
            style: { background: 'var(--color-ink-800)', color: 'var(--color-fg)', border: '1px solid var(--color-line)', fontSize: 14 },
            success: { iconTheme: { primary: '#22c55e', secondary: 'var(--color-ink-800)' } },
            error: { iconTheme: { primary: '#f43f5e', secondary: 'var(--color-ink-800)' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
