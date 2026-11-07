import { vi } from 'vitest';
import type { PwaState } from '../../../src/lib/pwa';

/**
 * HONESTY & ENVIRONMENT DISCLOSURE:
 * Real Apple Safari (macOS Safari, iOS Safari, iPadOS Safari, iOS Simulator, or WebKit)
 * is NOT installed or executed in this Debian 12 Linux environment.
 * All iOS/macOS Safari profiles below are mock/emulated environments (User-Agent,
 * navigator.platform, navigator.maxTouchPoints, navigator.standalone, and matchMedia).
 */
export const TRACK_B_AUDIT_DISCLOSURE = {
  environment: 'Debian 12 Linux (Vitest + jsdom & Headless Chromium 156 CDP emulation)',
  realSafariExecuted: false,
  realIosDeviceExecuted: false,
  realAndroidDeviceExecuted: false,
} as const;

export type FixtureCategory =
  | 'ios-safari-iphone'
  | 'ios-safari-ipad-desktop-ua'
  | 'ios-other-browsers'
  | 'ios-inapp-browsers'
  | 'android-chrome'
  | 'unsupported-browsers';

export interface MockBrowserProfile {
  id: string;
  category: FixtureCategory;
  label: string;
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  navigatorStandalone?: boolean;
  displayModeStandalone?: boolean;
  isSecureContext: boolean;
  serviceWorkerSupported: boolean;
  supportsBeforeInstallPrompt: boolean;
  /** Expected platform according to current src/lib/pwa.ts implementation */
  actualDetectedPlatform: PwaState['platform'];
  /** Ideal platform classification for end-user install UX */
  idealPlatform: PwaState['platform'];
  notes: string;
}

export const INSTALL_FLOW_FIXTURES: Record<FixtureCategory, readonly MockBrowserProfile[]> = {
  'ios-safari-iphone': [
    {
      id: 'ios-safari-iphone-browser-tab',
      category: 'ios-safari-iphone',
      label: 'iPhone iOS 18.3 Mobile Safari (Browser Tab, standalone=false)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-safari',
      idealPlatform: 'ios-safari',
      notes: 'Mocked iPhone Safari tab; should render 3-step Share -> Add to Home Screen guide.',
    },
    {
      id: 'ios-safari-iphone-standalone',
      category: 'ios-safari-iphone',
      label: 'iPhone iOS 18.3 Mobile Safari (Home Screen Web App, navigator.standalone=true)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: true,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-safari',
      idealPlatform: 'ios-safari',
      notes:
        'Mocked iPhone Home Screen Web App where navigator.standalone === true even if matchMedia is false.',
    },
  ],
  'ios-safari-ipad-desktop-ua': [
    {
      id: 'ios-safari-ipad-desktop-ua-tab',
      category: 'ios-safari-ipad-desktop-ua',
      label: 'iPadOS 18.3 Safari (Desktop-class UA: MacIntel + maxTouchPoints=5)',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-safari',
      idealPlatform: 'ios-safari',
      notes:
        'Mocked iPadOS Safari requesting desktop website; detected via platform === MacIntel && maxTouchPoints > 1.',
    },
  ],
  'ios-other-browsers': [
    {
      id: 'ios-chrome-crios',
      category: 'ios-other-browsers',
      label: 'Chrome on iOS (CriOS)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/134.0.6998.99 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-other',
      idealPlatform: 'ios-other',
      notes: 'Excluded from safari regex via !/CriOS|FxiOS|EdgiOS|OPiOS/.',
    },
    {
      id: 'ios-firefox-fxios',
      category: 'ios-other-browsers',
      label: 'Firefox on iOS (FxiOS)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/136.0 Mobile/15E148 Safari/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-other',
      idealPlatform: 'ios-other',
      notes: 'Excluded from safari regex via !/CriOS|FxiOS|EdgiOS|OPiOS/.',
    },
    {
      id: 'ios-edge-edgios',
      category: 'ios-other-browsers',
      label: 'Edge on iOS (EdgiOS)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/134.3124.68 Mobile/15E148 Safari/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-other',
      idealPlatform: 'ios-other',
      notes: 'Excluded from safari regex via !/CriOS|FxiOS|EdgiOS|OPiOS/.',
    },
    {
      id: 'ios-opera-opios',
      category: 'ios-other-browsers',
      label: 'Opera on iOS (OPiOS)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 OPiOS/5.4.1 Mobile/15E148 Safari/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-other',
      idealPlatform: 'ios-other',
      notes: 'Excluded from safari regex via !/CriOS|FxiOS|EdgiOS|OPiOS/.',
    },
  ],
  'ios-inapp-browsers': [
    {
      id: 'ios-kakaotalk-inapp',
      category: 'ios-inapp-browsers',
      label: 'KakaoTalk iOS In-App Browser (KAKAOTALK)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 25.2.1 (INAPP) Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-safari',
      idealPlatform: 'ios-other',
      notes:
        'Finding B-F1: Contains Safari/604.1 and is not in CriOS|FxiOS|EdgiOS|OPiOS, so src/lib/pwa.ts:53 misclassifies it as ios-safari.',
    },
    {
      id: 'ios-naver-inapp',
      category: 'ios-inapp-browsers',
      label: 'Naver iOS In-App Browser (NAVER(inapp))',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 NAVER(inapp; search; 2000; 12.11.2; 15PRO)',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-safari',
      idealPlatform: 'ios-other',
      notes:
        'Finding B-F1: Contains Safari/604.1 and is not in CriOS|FxiOS|EdgiOS|OPiOS, so src/lib/pwa.ts:53 misclassifies it as ios-safari.',
    },
    {
      id: 'ios-google-search-app-gsa',
      category: 'ios-inapp-browsers',
      label: 'Google Search App on iOS (GSA)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/358.0.728945112 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-safari',
      idealPlatform: 'ios-other',
      notes:
        'Finding B-F1: GSA includes Safari/604.1 in UA string and is misclassified as ios-safari.',
    },
    {
      id: 'ios-whale-browser',
      category: 'ios-inapp-browsers',
      label: 'Naver Whale on iOS (Whale)',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Whale/3.6.0.3512 Mobile/15E148 Safari/605.1.15',
      platform: 'iPhone',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'ios-safari',
      idealPlatform: 'ios-other',
      notes:
        'Finding B-F1: Whale on iOS includes Safari/605.1.15 in UA string and is misclassified as ios-safari.',
    },
  ],
  'android-chrome': [
    {
      id: 'android-15-chrome-mobile',
      category: 'android-chrome',
      label: 'Android 15 Chrome 134 Mobile (Supports beforeinstallprompt & appinstalled)',
      userAgent:
        'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: true,
      actualDetectedPlatform: 'browser',
      idealPlatform: 'browser',
      notes: 'Primary Android install prompt flow target.',
    },
  ],
  'unsupported-browsers': [
    {
      id: 'firefox-desktop',
      category: 'unsupported-browsers',
      label: 'Firefox 136 Desktop (No beforeinstallprompt)',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:136.0) Gecko/20100101 Firefox/136.0',
      platform: 'Linux x86_64',
      maxTouchPoints: 0,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'browser',
      idealPlatform: 'browser',
      notes: 'Should render manual <details open> fallback without install button.',
    },
    {
      id: 'firefox-android',
      category: 'unsupported-browsers',
      label: 'Firefox 136 Android (No beforeinstallprompt)',
      userAgent: 'Mozilla/5.0 (Android 15; Mobile; rv:136.0) Gecko/136.0 Firefox/136.0',
      platform: 'Linux armv81',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'browser',
      idealPlatform: 'browser',
      notes: 'Should render manual <details open> fallback without install button.',
    },
    {
      id: 'macos-safari-desktop',
      category: 'unsupported-browsers',
      label: 'macOS Sequoia Safari 18.3 Desktop (maxTouchPoints=0, no beforeinstallprompt)',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 0,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'browser',
      idealPlatform: 'browser',
      notes:
        'Mocked macOS Safari desktop (maxTouchPoints=0); falls back to <details open> showing File -> Add to Dock.',
    },
    {
      id: 'chromium-private-incognito',
      category: 'unsupported-browsers',
      label: 'Chromium Private / Incognito Window (beforeinstallprompt suppressed)',
      userAgent:
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'browser',
      idealPlatform: 'browser',
      notes: 'Incognito suppresses beforeinstallprompt; manual <details open> remains visible.',
    },
    {
      id: 'insecure-http-context',
      category: 'unsupported-browsers',
      label: 'Insecure HTTP Context (isSecureContext=false)',
      userAgent:
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
      maxTouchPoints: 5,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: false,
      serviceWorkerSupported: true,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'browser',
      idealPlatform: 'browser',
      notes: 'Service worker registration skipped; offlineStatus stays unavailable.',
    },
    {
      id: 'missing-service-worker-api',
      category: 'unsupported-browsers',
      label: 'Browser Missing navigator.serviceWorker API',
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      maxTouchPoints: 0,
      navigatorStandalone: false,
      displayModeStandalone: false,
      isSecureContext: true,
      serviceWorkerSupported: false,
      supportsBeforeInstallPrompt: false,
      actualDetectedPlatform: 'browser',
      idealPlatform: 'browser',
      notes: 'navigator.serviceWorker absent; offlineStatus stays unavailable.',
    },
  ],
};

export interface MockMatchMediaController {
  readonly matches: boolean;
  setStandalone: (nextMatches: boolean) => void;
}

export interface MockServiceWorkerWorker {
  state: ServiceWorkerState;
  addEventListener: (type: string, listener: () => void) => void;
  triggerStateChange: (nextState: ServiceWorkerState) => void;
}

export interface MockServiceWorkerRegistration {
  installing?: MockServiceWorkerWorker;
  waiting?: Partial<ServiceWorker>;
  active?: Partial<ServiceWorker>;
  addEventListener: (type: string, listener: () => void) => void;
  triggerUpdateFound: (installingWorker: MockServiceWorkerWorker) => void;
}

export interface AppliedMockEnvironment {
  profile: MockBrowserProfile;
  matchMediaController: MockMatchMediaController;
  registration: MockServiceWorkerRegistration;
  registerMock: ReturnType<typeof vi.fn>;
}

export function createMockServiceWorkerWorker(
  initialState: ServiceWorkerState = 'installing',
): MockServiceWorkerWorker {
  const listeners = new Map<string, Set<() => void>>();
  const worker: MockServiceWorkerWorker = {
    state: initialState,
    addEventListener: (type: string, listener: () => void) => {
      const set = listeners.get(type) ?? new Set<() => void>();
      set.add(listener);
      listeners.set(type, set);
    },
    triggerStateChange: (nextState: ServiceWorkerState) => {
      worker.state = nextState;
      listeners.get('statechange')?.forEach((listener) => listener());
    },
  };
  return worker;
}

export function applyMockBrowserProfile(
  profile: MockBrowserProfile,
  options?: {
    registrationState?: 'active' | 'waiting' | 'installing' | 'reject';
  },
): AppliedMockEnvironment {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: profile.userAgent,
  });
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: profile.platform,
  });
  Object.defineProperty(window.navigator, 'maxTouchPoints', {
    configurable: true,
    value: profile.maxTouchPoints,
  });

  if (profile.navigatorStandalone !== undefined) {
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: profile.navigatorStandalone,
    });
  } else {
    Reflect.deleteProperty(
      window.navigator as Navigator & { standalone?: boolean },
      'standalone',
    );
  }

  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: profile.isSecureContext,
  });

  let standaloneMatches = Boolean(profile.displayModeStandalone);
  const mediaChangeListeners = new Set<() => void>();

  const matchMediaController: MockMatchMediaController = {
    get matches() {
      return standaloneMatches;
    },
    setStandalone(nextMatches: boolean) {
      standaloneMatches = nextMatches;
      mediaChangeListeners.forEach((listener) => listener());
    },
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      get matches() {
        return query === '(display-mode: standalone)' ? standaloneMatches : false;
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'change') mediaChangeListeners.add(listener);
      }),
      removeEventListener: vi.fn((type: string, listener: () => void) => {
        if (type === 'change') mediaChangeListeners.delete(listener);
      }),
      dispatchEvent: vi.fn(),
    })),
  });

  const regListeners = new Map<string, Set<() => void>>();
  const registrationState = options?.registrationState ?? 'active';
  const registration: MockServiceWorkerRegistration = {
    active: registrationState === 'active' ? ({ state: 'activated' } as Partial<ServiceWorker>) : undefined,
    waiting: registrationState === 'waiting' ? ({ state: 'installed' } as Partial<ServiceWorker>) : undefined,
    installing:
      registrationState === 'installing' ? createMockServiceWorkerWorker('installing') : undefined,
    addEventListener: (type: string, listener: () => void) => {
      const set = regListeners.get(type) ?? new Set<() => void>();
      set.add(listener);
      regListeners.set(type, set);
    },
    triggerUpdateFound: (installingWorker: MockServiceWorkerWorker) => {
      registration.installing = installingWorker;
      regListeners.get('updatefound')?.forEach((listener) => listener());
    },
  };

  const registerMock = vi.fn(() =>
    registrationState === 'reject'
      ? Promise.reject(new Error('Simulated SW register error'))
      : Promise.resolve(registration),
  );

  if (profile.serviceWorkerSupported) {
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: registerMock,
      },
    });
  } else {
    Reflect.deleteProperty(
      window.navigator as unknown as Record<string, unknown>,
      'serviceWorker',
    );
  }

  return {
    profile,
    matchMediaController,
    registration,
    registerMock,
  };
}

export interface MockBeforeInstallPromptEvent extends Event {
  prompt: ReturnType<typeof vi.fn<() => Promise<void>>>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  resolveChoice: (choice: { outcome: 'accepted' | 'dismissed' }) => void;
  rejectChoice: (error: Error) => void;
}

export function createMockBeforeInstallPromptEvent(options?: {
  immediateOutcome?: 'accepted' | 'dismissed';
  promptRejectsWith?: Error;
}): MockBeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  let resolveChoice!: (choice: { outcome: 'accepted' | 'dismissed' }) => void;
  let rejectChoice!: (error: Error) => void;

  const userChoice = options?.immediateOutcome
    ? Promise.resolve({ outcome: options.immediateOutcome })
    : new Promise<{ outcome: 'accepted' | 'dismissed' }>((resolve, reject) => {
        resolveChoice = resolve;
        rejectChoice = reject;
      });

  const prompt = vi.fn<() => Promise<void>>(() =>
    options?.promptRejectsWith ? Promise.reject(options.promptRejectsWith) : Promise.resolve(),
  );

  return Object.assign(event, {
    prompt,
    userChoice,
    resolveChoice: resolveChoice ?? (() => undefined),
    rejectChoice: rejectChoice ?? (() => undefined),
  });
}
