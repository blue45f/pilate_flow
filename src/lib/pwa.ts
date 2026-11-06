import { useSyncExternalStore } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export interface PwaState {
  standalone: boolean;
  installed: boolean;
  platform: 'ios-safari' | 'ios-other' | 'browser';
  canInstall: boolean;
  installStatus: 'idle' | 'prompting' | 'accepted' | 'dismissed' | 'error';
  offlineStatus: 'unavailable' | 'preparing' | 'ready' | 'update-ready' | 'error';
}
let state: PwaState = {
  standalone: false,
  installed: false,
  platform: 'browser',
  canInstall: false,
  installStatus: 'idle',
  offlineStatus: 'unavailable',
};
let pendingPrompt: InstallEvent | null = null;
let started = false;
const listeners = new Set<() => void>();
const publish = (next: Partial<PwaState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getPwaState = () => state;
const snapshot = getPwaState;
export function usePwa() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Start before React, so an install event cannot be lost while settings is closed. */
export function startPwa({ registerServiceWorker = true } = {}) {
  if (started || typeof window === 'undefined') return;
  started = true;
  const display = window.matchMedia?.('(display-mode: standalone)');
  const isStandalone = () =>
    Boolean(display?.matches || (navigator as Navigator & { standalone?: boolean }).standalone);
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari =
    /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
  publish({
    standalone: isStandalone(),
    installed: isStandalone(),
    platform: ios ? (safari ? 'ios-safari' : 'ios-other') : 'browser',
  });
  display?.addEventListener('change', () => {
    publish({
      standalone: isStandalone(),
      ...(isStandalone() ? { installed: true, canInstall: false } : {}),
    });
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    pendingPrompt = event as InstallEvent;
    if (!state.installed && state.installStatus !== 'prompting') publish({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    pendingPrompt = null;
    publish({ installed: true, canInstall: false, installStatus: 'idle' });
  });
  if (!registerServiceWorker || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  publish({ offlineStatus: 'preparing' });
  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((registration) => {
      const update = () =>
        publish({
          offlineStatus: registration.waiting
            ? 'update-ready'
            : registration.active
              ? 'ready'
              : 'preparing',
        });
      const watch = () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'redundant' && !registration.active)
            publish({ offlineStatus: 'error' });
          else update();
        });
      };
      update();
      watch();
      registration.addEventListener('updatefound', watch);
    })
    .catch(() => publish({ offlineStatus: 'error' }));
}

/** Called only from the install button's user gesture. Each browser event is single-use. */
export async function requestPwaInstall() {
  if (!pendingPrompt || state.installed || state.installStatus === 'prompting') return;
  const prompt = pendingPrompt;
  pendingPrompt = null;
  publish({ canInstall: false, installStatus: 'prompting' });
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (!state.installed) publish({ installStatus: outcome, canInstall: pendingPrompt !== null });
  } catch {
    if (!state.installed) publish({ installStatus: 'error', canInstall: pendingPrompt !== null });
  }
}
