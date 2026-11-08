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

export interface RegisterPwaServiceWorkerOptions {
  scriptUrl?: string;
  onPreparing?: () => void;
  onReady?: (registration: ServiceWorkerRegistration) => void;
  onUpdateReady?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: unknown) => void;
}

const IOS_OTHER_BROWSER_PATTERN =
  /CriOS|FxiOS|EdgiOS|OPiOS|GSA|KAKAOTALK|NAVER|Whale|Instagram|FBAN|FBAV|Line/i;

export function detectPwaPlatform(
  nav: Partial<Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'>> =
    typeof navigator !== 'undefined' ? navigator : {},
): 'ios-safari' | 'ios-other' | 'browser' {
  const userAgent = nav.userAgent ?? '';
  const platform = nav.platform ?? '';
  const maxTouchPoints = nav.maxTouchPoints ?? 0;
  const ios =
    /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (!ios) return 'browser';
  const safari = /Safari/.test(userAgent) && !IOS_OTHER_BROWSER_PATTERN.test(userAgent);
  return safari ? 'ios-safari' : 'ios-other';
}

export function isStandaloneDisplayMode(
  win: Window | undefined = typeof window !== 'undefined' ? window : undefined,
  nav: (Partial<Navigator> & { standalone?: boolean }) | undefined =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { standalone?: boolean })
      : undefined,
): boolean {
  const display = win?.matchMedia?.('(display-mode: standalone)');
  return Boolean(display?.matches || nav?.standalone);
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
let domStarted = false;
let swStarted = false;
let boundDisplayMedia: MediaQueryList | undefined;

const listeners = new Set<() => void>();
const publish = (next: Partial<PwaState>) => {
  const keys = Object.keys(next) as Array<keyof PwaState>;
  if (keys.every((key) => state[key] === next[key])) {
    return;
  }
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

function bindDisplayMediaListener() {
  if (typeof window === 'undefined') return;
  const display = window.matchMedia?.('(display-mode: standalone)');
  if (!display || display === boundDisplayMedia) return;
  boundDisplayMedia = display;
  display.addEventListener?.('change', (event) => {
    const eventMatches =
      typeof (event as MediaQueryListEvent | undefined)?.matches === 'boolean'
        ? (event as MediaQueryListEvent).matches
        : undefined;
    const standalone = Boolean(
      (eventMatches ?? display.matches) ||
        (navigator as Navigator & { standalone?: boolean }).standalone,
    );
    publish({
      standalone,
      installed: standalone,
      ...(standalone ? { canInstall: false } : { canInstall: pendingPrompt !== null }),
    });
  });
}

function ensureDomInitialized() {
  if (typeof window === 'undefined') return;
  if (!domStarted) {
    startPwa({ registerServiceWorker: false });
    return;
  }
  if (listeners.size === 0) {
    bindDisplayMediaListener();
    const nextPlatform = detectPwaPlatform(navigator);
    const nextStandalone = isStandaloneDisplayMode(window, navigator);
    if (state.platform !== nextPlatform || state.standalone !== nextStandalone) {
      state = {
        ...state,
        platform: nextPlatform,
        standalone: nextStandalone,
        installed: nextStandalone ? true : state.installed,
      };
    }
  }
}

const subscribe = (listener: () => void) => {
  ensureDomInitialized();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getPwaState = () => state;
const snapshot = () => {
  ensureDomInitialized();
  return state;
};

export function usePwa() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function resetPwaInstallStatus() {
  if (state.installStatus === 'dismissed' || state.installStatus === 'error') {
    publish({ installStatus: 'idle' });
  }
}

export function registerPwaServiceWorker(
  optionsOrCallback?:
    | RegisterPwaServiceWorkerOptions
    | ((registration: ServiceWorkerRegistration) => void),
): () => void {
  const callbacks: RegisterPwaServiceWorkerOptions =
    typeof optionsOrCallback === 'function'
      ? { onUpdateReady: optionsOrCallback }
      : (optionsOrCallback ?? {});

  if (typeof window === 'undefined' || !window.isSecureContext || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const scriptUrl = callbacks.scriptUrl ?? '/sw.js';
  let disposed = false;
  let onlineListenerAttached = false;
  let registrationSucceeded = false;
  let attemptId = 0;
  const cleanups: Array<() => void> = [];

  const removeOnlineListener = () => {
    if (!onlineListenerAttached) return;
    onlineListenerAttached = false;
    window.removeEventListener('online', handleOnline);
  };

  const addOnlineListener = () => {
    if (disposed || onlineListenerAttached || registrationSucceeded) return;
    onlineListenerAttached = true;
    window.addEventListener('online', handleOnline);
  };

  function handleOnline() {
    if (disposed || registrationSucceeded) return;
    removeOnlineListener();
    registerSw();
  }

  function registerSw() {
    if (disposed || registrationSucceeded) return;
    const currentAttempt = ++attemptId;

    if (navigator.onLine === false) {
      addOnlineListener();
    }

    publish({ offlineStatus: 'preparing' });
    callbacks.onPreparing?.();

    void Promise.resolve(
      navigator.serviceWorker.register(scriptUrl, { scope: '/', updateViaCache: 'none' }),
    )
      .then((registration) => {
        if (disposed || currentAttempt !== attemptId) return;
        registrationSucceeded = true;
        removeOnlineListener();

        const hasExistingControllerOrActive = () =>
          Boolean(navigator.serviceWorker.controller || registration.active);

        const update = (hadActive = hasExistingControllerOrActive()) => {
          if (disposed || currentAttempt !== attemptId) return;
          if (registration.waiting && hadActive) {
            publish({ offlineStatus: 'update-ready' });
            callbacks.onUpdateReady?.(registration);
          } else if (registration.active) {
            publish({ offlineStatus: 'ready' });
            callbacks.onReady?.(registration);
          } else {
            publish({ offlineStatus: 'preparing' });
            callbacks.onPreparing?.();
          }
        };

        const watchWorker = (
          worker: ServiceWorker | null | undefined,
          hadActiveWorker: boolean,
        ) => {
          if (!worker) return;
          const onStateChange = () => {
            if (disposed || currentAttempt !== attemptId) return;
            if (worker.state === 'redundant' && !registration.active) {
              registrationSucceeded = false;
              publish({ offlineStatus: 'error' });
              callbacks.onError?.(new Error('Service worker installation became redundant'));
              addOnlineListener();
            } else if (worker.state === 'installed') {
              if (hadActiveWorker) {
                publish({ offlineStatus: 'update-ready' });
                callbacks.onUpdateReady?.(registration);
              } else {
                update(false);
              }
            } else {
              update(hadActiveWorker);
            }
          };
          worker.addEventListener?.('statechange', onStateChange);
          cleanups.push(() => worker.removeEventListener?.('statechange', onStateChange));
        };

        const initialHadActive = hasExistingControllerOrActive();
        update(initialHadActive);
        watchWorker(registration.installing, initialHadActive);

        const onUpdateFound = () => {
          if (disposed || currentAttempt !== attemptId) return;
          const hadActiveWorker = Boolean(
            navigator.serviceWorker.controller || registration.active,
          );
          watchWorker(registration.installing, hadActiveWorker);
        };
        registration.addEventListener?.('updatefound', onUpdateFound);
        cleanups.push(() => registration.removeEventListener?.('updatefound', onUpdateFound));
      })
      .catch((error: unknown) => {
        if (disposed || currentAttempt !== attemptId) return;
        publish({ offlineStatus: 'error' });
        callbacks.onError?.(error);
        addOnlineListener();
      });
  }

  registerSw();

  return () => {
    disposed = true;
    removeOnlineListener();
    while (cleanups.length > 0) {
      const fn = cleanups.pop();
      fn?.();
    }
  };
}

/** Start before React, so an install event cannot be lost while settings is closed. */
export function startPwa({ registerServiceWorker = true } = {}) {
  if (typeof window === 'undefined') return;
  if (!domStarted) {
    domStarted = true;
    const standalone = isStandaloneDisplayMode(window, navigator);
    publish({
      standalone,
      installed: standalone,
      platform: detectPwaPlatform(navigator),
    });
    bindDisplayMediaListener();
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      pendingPrompt = event as InstallEvent;
      if (!state.installed && state.installStatus !== 'prompting') {
        publish({
          canInstall: true,
          ...(listeners.size > 0 ? { installStatus: 'idle' } : {}),
        });
      }
    });
    window.addEventListener('appinstalled', () => {
      pendingPrompt = null;
      publish({ installed: true, canInstall: false, installStatus: 'idle' });
    });
  }
  if (!registerServiceWorker || swStarted) return;
  swStarted = true;
  return registerPwaServiceWorker();
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
