import { createStore } from '#/lib/store.ts';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const pwaStore = createStore<{
  /**
   * A new version is installed and waiting for the reader to accept it.
   */
  updateReady: boolean;
  /**
   * The browser offered its own install prompt (Chrome, Edge, Android).
   */
  canInstall: boolean;
}>({ updateReady: false, canInstall: false });

let installPrompt: BeforeInstallPromptEvent | null = null;
let waiting: ServiceWorker | null = null;
let acceptedUpdate = false;

// The browser offers this once, early; keep it for the Settings button
// instead of letting the browser show its own banner.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event as BeforeInstallPromptEvent;
    pwaStore.set((prev) => ({ ...prev, canInstall: true }));
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    pwaStore.set((prev) => ({ ...prev, canInstall: false }));
  });
}

/**
 * Running as the installed app rather than in a browser tab.
 */
export function isInstalled(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iPhone and iPad, where installing is Share → Add to Home Screen; iPadOS
 * reports itself as a Mac, so touch support tells them apart.
 */
export function isIos(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
  );
}

export async function promptInstall() {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  pwaStore.set((prev) => ({ ...prev, canInstall: false }));
}

function onWaiting(worker: ServiceWorker) {
  waiting = worker;
  pwaStore.set((prev) => ({ ...prev, updateReady: true }));
}

/**
 * Switch to the waiting version; the page reloads once it takes over.
 */
export function applyUpdate() {
  acceptedUpdate = true;
  waiting?.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Register `/sw.js` (production only; it is built with the app). An update
 * found later waits for the reader to accept it, rather than swapping the
 * code under an open page.
 */
export async function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.register('/sw.js');

  if (registration.waiting && navigator.serviceWorker.controller) onWaiting(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => {
      // With no controller this is the first install, not an update.
      if (worker.state === 'installed' && navigator.serviceWorker.controller) onWaiting(worker);
    });
  });
  // The installed app can stay open for days; look for a new version
  // whenever it comes back to the foreground.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void registration.update().catch(() => {});
  });
  // Only reload for an update the reader accepted, not the first install
  // taking control of the page.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (acceptedUpdate) window.location.reload();
  });
}
