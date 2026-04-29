/**
 * serviceWorkerRegistration.ts
 *
 * Registers the custom service worker at /sw.js.
 * Call this once from a client component after mount.
 */

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // A new version is available
          console.log('New version of Notes is available. Refresh to update.');
        }
      });
    });

    console.log('Service worker registered:', registration.scope);
  } catch (err) {
    console.error('Service worker registration failed:', err);
  }
}

export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }

    console.log('Service workers unregistered for development.');
  } catch (err) {
    console.error('Failed to unregister service worker:', err);
  }
}