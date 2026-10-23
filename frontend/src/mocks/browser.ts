import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

declare global {
  interface Window {
    __msw_worker?: ReturnType<typeof setupWorker>;
    __msw_initialized?: boolean;
    __msw_promise?: Promise<any>;
  }
}

export const worker =
  typeof window !== 'undefined' && window.__msw_worker
    ? window.__msw_worker
    : setupWorker(...handlers);

if (typeof window !== 'undefined' && !window.__msw_worker) {
  window.__msw_worker = worker;
}

export async function initMocks() {
  if (typeof window === 'undefined') {
    return;
  }

  // Prevent multiple worker.start() calls during React 19 StrictMode & HMR
  if (window.__msw_initialized) {
    return;
  }

  if (window.__msw_promise) {
    return window.__msw_promise;
  }

  window.__msw_promise = (async () => {
    try {
      window.__msw_initialized = true;
      const registration = await worker.start({
        onUnhandledFrame: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      });
      return registration;
    } catch (err: any) {
      // Gracefully handle already enabled or configured network invariant
      if (
        err?.message?.includes('already enabled') ||
        err?.message?.includes('configure()')
      ) {
        console.debug('MSW network interceptor already active:', err.message);
        return;
      }
      console.warn('MSW start notice:', err?.message || err);
    }
  })();

  return window.__msw_promise;
}
