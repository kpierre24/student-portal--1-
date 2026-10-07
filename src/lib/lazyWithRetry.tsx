import React from 'react';

/**
 * Robust lazy-loader helper with automatic retry, Vite dev-server HMR recovery,
 * and graceful fallback component to prevent ErrorBoundary crashes on dynamic import failure.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  componentName: string = 'Component'
) {
  return React.lazy(async () => {
    const pageReloadKey = `hteim_chunk_reload_${componentName.replace(/[^a-zA-Z0-9]/g, '_')}`;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const module = await factory();
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(pageReloadKey);
          }
        } catch {}
        return module;
      } catch (error) {
        console.warn(`[lazyWithRetry] Attempt ${attempt} to load ${componentName} failed:`, error);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 350));
        }
      }
    }

    // Auto-reload once if stale Vite module chunk URL
    try {
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        const reloaded = sessionStorage.getItem(pageReloadKey);
        if (!reloaded) {
          sessionStorage.setItem(pageReloadKey, 'true');
          console.warn(`[lazyWithRetry] Reloading page to sync fresh Vite module chunk for ${componentName}...`);
          window.location.reload();
        }
      }
    } catch {}

    // Fallback component to prevent React ErrorBoundary crash
    const FallbackComponent: React.FC<any> = () => (
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 my-2">
        <span>The {componentName} module is reconnecting...</span>
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.removeItem(pageReloadKey); } catch {}
            window.location.reload();
          }}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer transition-all shrink-0"
        >
          Reload Module
        </button>
      </div>
    );

    return { default: FallbackComponent as unknown as T };
  });
}
