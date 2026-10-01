import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Toaster } from 'sonner';

// In development mode, unregister any active service workers and clear legacy caches
// to prevent stale HTML/asset hijacking and MIME type errors on localhost
if (typeof window !== 'undefined') {
  if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        if (name.startsWith('hteim-erp-pwa') || (import.meta.env.DEV && name.includes('precache'))) {
          caches.delete(name);
        }
      }
    });
  }
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster 
      position="bottom-right" 
      toastOptions={{
        className: 'font-sans font-bold shadow-2xl rounded-xl border border-slate-200 dark:border-slate-800',
      }} 
    />
  </StrictMode>,
);
