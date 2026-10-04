import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#17143a', color: '#f4f2ff', border: '1px solid rgba(139,92,246,.3)', fontSize: 14 },
            success: { iconTheme: { primary: '#22c55e', secondary: '#17143a' } },
            error: { iconTheme: { primary: '#f43f5e', secondary: '#17143a' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
