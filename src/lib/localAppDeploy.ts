export interface AuthUser {
  userId: string;
  email?: string;
  name?: string;
  picture?: string;
  scope: string;
}

export interface FirebaseWebConfig {
  apiKey: string;
  appId?: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface FirebaseUserLike {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface FirebaseSignInOptions {
  provider?: string;
  scope?: string;
  prompt?: string;
}

export interface FirebaseAuthBridge {
  currentUser?: FirebaseUserLike | AuthUser | null;
  getCurrentUser?: () =>
    | Promise<FirebaseUserLike | AuthUser | null>
    | FirebaseUserLike
    | AuthUser
    | null;
  getRedirectResult?: () => Promise<
    { user?: FirebaseUserLike | AuthUser | null } | FirebaseUserLike | AuthUser | null
  >;
  onAuthStateChanged?: (
    callback: (user: FirebaseUserLike | AuthUser | null) => void,
  ) => (() => void) | void;
  setPersistence?: (persistence: string) => Promise<void> | void;
  signInWithPopup?: (
    options?: FirebaseSignInOptions,
  ) => Promise<
    { user?: FirebaseUserLike | AuthUser | null } | FirebaseUserLike | AuthUser | null | void
  >;
  signInWithRedirect?: (
    options?: FirebaseSignInOptions,
  ) => Promise<
    { user?: FirebaseUserLike | AuthUser | null } | FirebaseUserLike | AuthUser | null | void
  >;
  signOut?: () => Promise<void> | void;
}

interface FirebaseGoogleAuthProviderInstance {
  addScope?: (scope: string) => void;
  setCustomParameters?: (params: Record<string, string>) => void;
}

interface FirebaseCompatAuthInstance {
  currentUser?: FirebaseUserLike | null;
  setPersistence?: (persistence: string) => Promise<void>;
  getRedirectResult?: () => Promise<{ user?: FirebaseUserLike | null } | null>;
  onAuthStateChanged?: (
    nextOrObserver: (user: FirebaseUserLike | null) => void,
    error?: (err: unknown) => void,
  ) => () => void;
  signInWithPopup?: (
    provider: unknown,
  ) => Promise<{ user?: FirebaseUserLike | null } | FirebaseUserLike | null>;
  signInWithRedirect?: (provider: unknown) => Promise<void>;
  signOut?: () => Promise<void>;
}

interface FirebaseCompatNamespace {
  apps?: unknown[];
  app?: () => unknown;
  initializeApp?: (config: FirebaseWebConfig) => unknown;
  auth?: (() => FirebaseCompatAuthInstance) & {
    GoogleAuthProvider?: new () => FirebaseGoogleAuthProviderInstance;
    Auth?: {
      Persistence?: {
        LOCAL?: string;
      };
    };
  };
}

declare global {
  var __PILATES_FIREBASE_AUTH__: FirebaseAuthBridge | null | undefined;
  var __PILATES_FIREBASE_CONFIG__: FirebaseWebConfig | null | undefined;
  interface Window {
    firebase?: FirebaseCompatNamespace;
    __PILATES_FIREBASE_AUTH__?: FirebaseAuthBridge | null;
    __PILATES_FIREBASE_CONFIG__?: FirebaseWebConfig | null;
  }
}

export const FIREBASE_SESSION_STORAGE_KEY = 'pilates-flow-atelier-firebase-session-v1';
export const ACCOUNT_BACKUP_STORAGE_PREFIX = 'pilates-flow-atelier-account-backup-v3:';

const DEFAULT_SCOPE = 'openid email profile';
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const CANONICAL_FIREBASE_PROJECT_ID = 'deskcloud-fleet-auth';
const CANONICAL_FIREBASE_AUTH_DOMAIN = 'deskcloud-fleet-auth.firebaseapp.com';

export const DEFAULT_FIREBASE_CONFIG: Readonly<FirebaseWebConfig> = Object.freeze({
  apiKey: 'AIzaSyC2FEx-FOiO2OUrvcnUNvGI_YUNFc_AyC0',
  appId: '1:1083045258283:web:25c2e482307b366e70366e',
  authDomain: CANONICAL_FIREBASE_AUTH_DOMAIN,
  projectId: CANONICAL_FIREBASE_PROJECT_ID,
  storageBucket: 'deskcloud-fleet-auth.firebasestorage.app',
  messagingSenderId: '1083045258283',
});

const HOSTED_FIREBASE_DOMAINS = new Set([
  'pilates-flow-atelier.web.app',
  'pilates-flow-atelier.firebaseapp.com',
  'deskcloud-fleet-auth.firebaseapp.com',
  'deskcloud-fleet-auth.web.app',
]);

class ApiResponseError extends Error {
  readonly response: { data: { error: string; message: string } };
  readonly data: { error: string; message: string };

  constructor(error: string, message: string) {
    super(message);
    this.name = 'ApiResponseError';
    this.data = { error, message };
    this.response = { data: { error, message } };
  }
}

function unavailable(): never {
  throw new Error(
    '서버 계정 백업은 배포된 앱에서 사용할 수 있습니다. 이 환경에서는 JSON 백업을 이용해 주세요.',
  );
}

function apiError(error: string, message: string): never {
  throw new ApiResponseError(error, message);
}

function isJsdomEnvironment(): boolean {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
}

function isHostedBrowserHostname(): boolean {
  if (typeof window === 'undefined' || !window.location?.hostname) return false;
  const host = window.location.hostname.toLowerCase();
  return (
    HOSTED_FIREBASE_DOMAINS.has(host) ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com')
  );
}

export function normalizeFirebaseConfig(raw: unknown): FirebaseWebConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const apiKey = typeof candidate.apiKey === 'string' ? candidate.apiKey.trim() : '';
  const projectId = typeof candidate.projectId === 'string' ? candidate.projectId.trim() : '';
  const rawAuthDomain = typeof candidate.authDomain === 'string' ? candidate.authDomain.trim() : '';
  if (!apiKey || !projectId) return null;

  // Always use deskcloud-fleet-auth.firebaseapp.com for deskcloud-fleet-auth so Google OAuth
  // uses the registered https://deskcloud-fleet-auth.firebaseapp.com/__/auth/handler redirect URI.
  const authDomain =
    projectId === CANONICAL_FIREBASE_PROJECT_ID
      ? CANONICAL_FIREBASE_AUTH_DOMAIN
      : rawAuthDomain || `${projectId}.firebaseapp.com`;

  const config: FirebaseWebConfig = {
    apiKey,
    authDomain,
    projectId,
  };
  if (typeof candidate.appId === 'string' && candidate.appId.trim()) {
    config.appId = candidate.appId.trim();
  }
  if (typeof candidate.storageBucket === 'string' && candidate.storageBucket.trim()) {
    config.storageBucket = candidate.storageBucket.trim();
  }
  if (typeof candidate.messagingSenderId === 'string' && candidate.messagingSenderId.trim()) {
    config.messagingSenderId = candidate.messagingSenderId.trim();
  }
  return config;
}

function toAuthUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const unwrapped =
    'user' in raw && (raw as { user?: unknown }).user !== undefined
      ? (raw as { user?: unknown }).user
      : raw;
  if (!unwrapped || typeof unwrapped !== 'object') return null;
  const record = unwrapped as Record<string, unknown>;
  const uid =
    typeof record.uid === 'string' && record.uid.trim()
      ? record.uid.trim()
      : typeof record.userId === 'string' && record.userId.trim()
        ? record.userId.trim()
        : '';
  if (!uid) return null;

  const email =
    typeof record.email === 'string' && record.email.trim() ? record.email.trim() : undefined;
  const name =
    typeof record.displayName === 'string' && record.displayName.trim()
      ? record.displayName.trim()
      : typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : undefined;
  const picture =
    typeof record.photoURL === 'string' && record.photoURL.trim()
      ? record.photoURL.trim()
      : typeof record.picture === 'string' && record.picture.trim()
        ? record.picture.trim()
        : undefined;
  const scope =
    typeof record.scope === 'string' && record.scope.trim() ? record.scope.trim() : DEFAULT_SCOPE;

  return {
    userId: uid,
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
    ...(picture ? { picture } : {}),
    scope,
  };
}

function readPersistedSession(): AuthUser | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FIREBASE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const user = toAuthUser(parsed);
    if (!user) {
      localStorage.removeItem(FIREBASE_SESSION_STORAGE_KEY);
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

function writePersistedSession(user: AuthUser | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem(FIREBASE_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(FIREBASE_SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

let cachedConfigPromise: Promise<FirebaseWebConfig | null> | null = null;
let cachedBridgePromise: Promise<FirebaseAuthBridge | null> | null = null;
let authUnsubscribe: (() => void) | null = null;
let redirectHandled = false;
let currentSessionUser: AuthUser | null = null;
let signedOutUserId: string | null = null;

export function resetLocalAppDeployForTesting(): void {
  cachedConfigPromise = null;
  cachedBridgePromise = null;
  if (authUnsubscribe) {
    try {
      authUnsubscribe();
    } catch {
      // Ignore unsubscribe errors
    }
    authUnsubscribe = null;
  }
  redirectHandled = false;
  currentSessionUser = null;
  signedOutUserId = null;
}

export async function resolveFirebaseConfig(): Promise<FirebaseWebConfig | null> {
  const injectedConfig =
    globalThis.__PILATES_FIREBASE_CONFIG__ !== undefined
      ? globalThis.__PILATES_FIREBASE_CONFIG__
      : typeof window !== 'undefined'
        ? window.__PILATES_FIREBASE_CONFIG__
        : undefined;

  if (injectedConfig === null) {
    return null;
  }
  if (injectedConfig !== undefined) {
    return normalizeFirebaseConfig(injectedConfig);
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const injectedAuth =
    globalThis.__PILATES_FIREBASE_AUTH__ !== undefined
      ? globalThis.__PILATES_FIREBASE_AUTH__
      : window.__PILATES_FIREBASE_AUTH__;

  if (isJsdomEnvironment() && !isHostedBrowserHostname()) {
    if (injectedAuth && typeof injectedAuth === 'object') {
      return normalizeFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    }
    if (window.firebase?.auth) {
      return normalizeFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    }
    return null;
  }

  if (!cachedConfigPromise) {
    cachedConfigPromise = (async () => {
      if (typeof fetch === 'function') {
        try {
          const response = await fetch('/__/firebase/init.json', {
            headers: { Accept: 'application/json' },
          });
          if (response.ok) {
            const json: unknown = await response.json();
            const normalized = normalizeFirebaseConfig(json);
            if (normalized) return normalized;
          }
        } catch {
          // Fall back to default production Firebase config
        }
      }
      return normalizeFirebaseConfig(DEFAULT_FIREBASE_CONFIG);
    })();
  }

  return cachedConfigPromise;
}

function loadScriptWithFallback(primarySrc: string, fallbackSrc: string): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Document is not available'));
  }

  const attemptLoad = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existing?.dataset.loaded === 'true') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => {
        script.remove();
        reject(new Error(`Failed to load script: ${src}`));
      };
      document.head.appendChild(script);
    });

  return attemptLoad(primarySrc).catch(() => attemptLoad(fallbackSrc));
}

async function ensureBrowserFirebaseSdkLoaded(): Promise<FirebaseCompatNamespace> {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }
  if (window.firebase?.auth) {
    return window.firebase;
  }
  await loadScriptWithFallback(
    '/__/firebase/11.0.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js',
  );
  await loadScriptWithFallback(
    '/__/firebase/11.0.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth-compat.js',
  );
  if (!window.firebase?.auth) {
    throw new Error('Firebase Auth SDK did not initialize');
  }
  return window.firebase;
}

function buildGoogleProvider(
  fbNamespace: FirebaseCompatNamespace | undefined,
  options?: FirebaseSignInOptions,
): unknown {
  const prompt = options?.prompt ?? 'select_account';
  const ProviderCtor = fbNamespace?.auth?.GoogleAuthProvider;
  if (typeof ProviderCtor === 'function') {
    const provider = new ProviderCtor();
    provider.addScope?.('email');
    provider.addScope?.('profile');
    provider.setCustomParameters?.({ prompt });
    return provider;
  }
  return {
    providerId: options?.provider ?? 'google.com',
    scope: options?.scope ?? DEFAULT_SCOPE,
    customParameters: { prompt },
  };
}

async function createBrowserFirebaseBridge(
  config: FirebaseWebConfig,
): Promise<FirebaseAuthBridge> {
  const fb = await ensureBrowserFirebaseSdkLoaded();
  if (!fb.apps?.length) {
    fb.initializeApp?.(config);
  } else {
    fb.app?.();
  }
  const fbAuth = fb.auth?.();
  if (!fbAuth) {
    throw new Error('Firebase Auth instance unavailable');
  }

  const persistenceMode = fb.auth?.Auth?.Persistence?.LOCAL ?? 'local';
  if (typeof fbAuth.setPersistence === 'function') {
    try {
      await fbAuth.setPersistence(persistenceMode);
    } catch {
      // Ignore persistence mode failure in restricted storage contexts
    }
  }

  let redirectUser: AuthUser | null = null;
  if (typeof fbAuth.getRedirectResult === 'function') {
    try {
      const result = await fbAuth.getRedirectResult();
      redirectUser = toAuthUser(result);
      if (redirectUser) {
        signedOutUserId = null;
        currentSessionUser = redirectUser;
        writePersistedSession(redirectUser);
      }
    } catch {
      // Ignore redirect result errors during normal startup
    }
  }
  redirectHandled = true;

  let initialAuthResolved = false;
  await new Promise<void>((resolve) => {
    if (typeof fbAuth.onAuthStateChanged !== 'function') {
      initialAuthResolved = true;
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      if (!initialAuthResolved) {
        initialAuthResolved = true;
        resolve();
      }
    }, 3500);

    const unsub = fbAuth.onAuthStateChanged(
      (fbUser) => {
        const mapped = toAuthUser(fbUser);
        if (mapped) {
          signedOutUserId = null;
          currentSessionUser = mapped;
          writePersistedSession(mapped);
        } else if (initialAuthResolved || !redirectUser) {
          currentSessionUser = null;
          if (initialAuthResolved) {
            writePersistedSession(null);
          }
        }
        if (!initialAuthResolved) {
          initialAuthResolved = true;
          clearTimeout(timer);
          resolve();
        }
      },
      () => {
        if (!initialAuthResolved) {
          initialAuthResolved = true;
          clearTimeout(timer);
          resolve();
        }
      },
    );
    if (typeof unsub === 'function') {
      authUnsubscribe = unsub;
    }
  });

  return {
    getCurrentUser: async () => fbAuth.currentUser ?? currentSessionUser,
    signInWithPopup: async (options) => {
      if (typeof fbAuth.signInWithPopup !== 'function') {
        throw Object.assign(new Error('Popup not supported'), {
          code: 'auth/operation-not-supported-in-this-environment',
        });
      }
      const provider = buildGoogleProvider(fb, options);
      return fbAuth.signInWithPopup(provider);
    },
    signInWithRedirect: async (options) => {
      if (typeof fbAuth.signInWithRedirect !== 'function') {
        throw new Error('Redirect sign-in is not supported');
      }
      const provider = buildGoogleProvider(fb, options);
      return fbAuth.signInWithRedirect(provider);
    },
    signOut: async () => {
      if (typeof fbAuth.signOut === 'function') {
        await fbAuth.signOut();
      }
    },
  };
}

async function hydrateBridgeOnce(bridge: FirebaseAuthBridge): Promise<void> {
  if (redirectHandled) return;
  redirectHandled = true;

  if (typeof bridge.setPersistence === 'function') {
    try {
      await bridge.setPersistence('local');
    } catch {
      // Ignore persistence setup error
    }
  }

  let redirectUser: AuthUser | null = null;
  if (typeof bridge.getRedirectResult === 'function') {
    try {
      const result = await bridge.getRedirectResult();
      redirectUser = toAuthUser(result);
      if (redirectUser) {
        signedOutUserId = null;
        currentSessionUser = redirectUser;
        writePersistedSession(redirectUser);
      }
    } catch {
      // Ignore redirect errors on startup
    }
  }

  if (typeof bridge.onAuthStateChanged === 'function') {
    let settled = false;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve();
        }
      }, 1000);

      const maybeUnsub = bridge.onAuthStateChanged?.((rawUser) => {
        const mapped = toAuthUser(rawUser);
        if (mapped) {
          signedOutUserId = null;
          currentSessionUser = mapped;
          writePersistedSession(mapped);
        } else if (settled || !redirectUser) {
          currentSessionUser = null;
          if (settled) {
            writePersistedSession(null);
          }
        }
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve();
        }
      });

      if (typeof maybeUnsub === 'function') {
        authUnsubscribe = maybeUnsub;
      } else if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    });
  }
}

async function resolveAuthBridge(): Promise<FirebaseAuthBridge | null> {
  const injectedAuth =
    globalThis.__PILATES_FIREBASE_AUTH__ !== undefined
      ? globalThis.__PILATES_FIREBASE_AUTH__
      : typeof window !== 'undefined'
        ? window.__PILATES_FIREBASE_AUTH__
        : undefined;

  if (injectedAuth === null) {
    return null;
  }

  const config = await resolveFirebaseConfig();
  if (globalThis.__PILATES_FIREBASE_CONFIG__ === null) {
    return null;
  }

  if (injectedAuth !== undefined) {
    await hydrateBridgeOnce(injectedAuth);
    return injectedAuth;
  }

  if (typeof window !== 'undefined' && window.firebase?.auth && config) {
    if (!cachedBridgePromise) {
      cachedBridgePromise = createBrowserFirebaseBridge(config);
    }
    return cachedBridgePromise;
  }

  if (isJsdomEnvironment()) {
    const persisted = readPersistedSession();
    if (persisted || config) {
      return {
        getCurrentUser: async () => currentSessionUser ?? readPersistedSession(),
        signOut: async () => {
          currentSessionUser = null;
          writePersistedSession(null);
        },
      };
    }
    return null;
  }

  if (!config) {
    return null;
  }

  if (!cachedBridgePromise) {
    cachedBridgePromise = createBrowserFirebaseBridge(config);
  }
  return cachedBridgePromise;
}

async function queryBridgeUser(bridge: FirebaseAuthBridge): Promise<AuthUser | null> {
  if (typeof bridge.getCurrentUser === 'function') {
    const raw = await bridge.getCurrentUser();
    const mapped = toAuthUser(raw);
    if (mapped) {
      if (signedOutUserId && mapped.userId === signedOutUserId) {
        return null;
      }
      signedOutUserId = null;
      return mapped;
    }
  }

  if (bridge.currentUser !== undefined && bridge.currentUser !== null) {
    const mapped = toAuthUser(bridge.currentUser);
    if (mapped) {
      if (signedOutUserId && mapped.userId === signedOutUserId) {
        return null;
      }
      signedOutUserId = null;
      return mapped;
    }
  }

  if (currentSessionUser) {
    if (signedOutUserId && currentSessionUser.userId === signedOutUserId) {
      return null;
    }
    return currentSessionUser;
  }

  return null;
}

function getErrorCode(cause: unknown): string {
  if (!cause || typeof cause !== 'object') return '';
  const code = (cause as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

const POPUP_CANCELLED_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
]);

export const auth = {
  async getUser(): Promise<AuthUser | null> {
    if (
      globalThis.__PILATES_FIREBASE_AUTH__ === null ||
      globalThis.__PILATES_FIREBASE_CONFIG__ === null
    ) {
      return unavailable();
    }

    let bridge: FirebaseAuthBridge | null;
    try {
      bridge = await resolveAuthBridge();
    } catch {
      const cached = readPersistedSession();
      if (cached) {
        currentSessionUser = cached;
        return cached;
      }
      return unavailable();
    }

    if (!bridge) {
      const cached = readPersistedSession();
      if (cached) {
        currentSessionUser = cached;
        return cached;
      }
      return unavailable();
    }

    try {
      const liveUser = await queryBridgeUser(bridge);
      if (liveUser) {
        currentSessionUser = liveUser;
        writePersistedSession(liveUser);
        return liveUser;
      }
      const persisted = signedOutUserId ? null : readPersistedSession();
      if (persisted) {
        currentSessionUser = persisted;
        return persisted;
      }
      return null;
    } catch {
      const persisted = signedOutUserId ? null : readPersistedSession();
      if (persisted) {
        currentSessionUser = persisted;
        return persisted;
      }
      return unavailable();
    }
  },

  async signInWithRedirect(options?: FirebaseSignInOptions): Promise<void> {
    const bridge = await resolveAuthBridge().catch(() => null);
    if (!bridge) {
      return unavailable();
    }

    const signInOptions: FirebaseSignInOptions = {
      provider: options?.provider ?? 'google.com',
      scope: options?.scope ?? DEFAULT_SCOPE,
      prompt: options?.prompt ?? 'select_account',
    };

    if (typeof bridge.signInWithPopup === 'function') {
      try {
        const result = await bridge.signInWithPopup(signInOptions);
        signedOutUserId = null;
        const user = toAuthUser(result) ?? (await queryBridgeUser(bridge));
        if (user) {
          currentSessionUser = user;
          writePersistedSession(user);
        }
        return;
      } catch (cause) {
        const code = getErrorCode(cause);
        if (POPUP_CANCELLED_CODES.has(code)) {
          throw new Error('Google 로그인 창이 닫혀 연결을 취소했습니다. 다시 시도해 주세요.', {
            cause,
          });
        }
        if (POPUP_FALLBACK_CODES.has(code) && typeof bridge.signInWithRedirect === 'function') {
          const redirectResult = await bridge.signInWithRedirect(signInOptions);
          signedOutUserId = null;
          const user = toAuthUser(redirectResult) ?? (await queryBridgeUser(bridge));
          if (user) {
            currentSessionUser = user;
            writePersistedSession(user);
          }
          return;
        }
        throw cause instanceof Error
          ? cause
          : new Error('Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.', { cause });
      }
    }

    if (typeof bridge.signInWithRedirect === 'function') {
      const redirectResult = await bridge.signInWithRedirect(signInOptions);
      signedOutUserId = null;
      const user = toAuthUser(redirectResult) ?? (await queryBridgeUser(bridge));
      if (user) {
        currentSessionUser = user;
        writePersistedSession(user);
      }
      return;
    }

    return unavailable();
  },

  async signOut(): Promise<void> {
    const bridge = await resolveAuthBridge().catch(() => null);
    if (!bridge && !readPersistedSession()) {
      return unavailable();
    }
    const previousUser = currentSessionUser ?? readPersistedSession();
    signedOutUserId = previousUser?.userId ?? '__signed_out__';
    currentSessionUser = null;
    writePersistedSession(null);
    if (bridge && typeof bridge.signOut === 'function') {
      await bridge.signOut();
    }
  },
};

interface StoredAccountBackupRecord {
  exists: boolean;
  revision: string | null;
  updatedAt: string | null;
  bytes: number;
  raw: string | null;
}

const EMPTY_BACKUP_RECORD: Readonly<StoredAccountBackupRecord> = Object.freeze({
  exists: false,
  revision: null,
  updatedAt: null,
  bytes: 0,
  raw: null,
});

function accountBackupKey(userId: string): string {
  return `${ACCOUNT_BACKUP_STORAGE_PREFIX}${userId}`;
}

function readAccountBackupRecord(userId: string): StoredAccountBackupRecord {
  if (typeof localStorage === 'undefined') {
    return { ...EMPTY_BACKUP_RECORD };
  }
  try {
    const rawItem = localStorage.getItem(accountBackupKey(userId));
    if (!rawItem) return { ...EMPTY_BACKUP_RECORD };
    const parsed = JSON.parse(rawItem) as Partial<StoredAccountBackupRecord>;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_BACKUP_RECORD };
    const exists = Boolean(parsed.exists);
    const revision =
      typeof parsed.revision === 'string' && parsed.revision.trim() ? parsed.revision : null;
    const updatedAt =
      exists && typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim()
        ? parsed.updatedAt
        : null;
    const rawPayload = exists && typeof parsed.raw === 'string' ? parsed.raw : null;
    const bytes =
      exists && typeof parsed.bytes === 'number' && parsed.bytes >= 0
        ? parsed.bytes
        : rawPayload
          ? new TextEncoder().encode(rawPayload).byteLength
          : 0;
    if (exists && (!revision || !rawPayload)) {
      return { ...EMPTY_BACKUP_RECORD };
    }
    return {
      exists,
      revision,
      updatedAt,
      bytes: exists ? bytes : 0,
      raw: rawPayload,
    };
  } catch {
    return { ...EMPTY_BACKUP_RECORD };
  }
}

function writeAccountBackupRecord(userId: string, record: StoredAccountBackupRecord): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(accountBackupKey(userId), JSON.stringify(record));
}

function toStatusPayload(record: StoredAccountBackupRecord) {
  return {
    exists: record.exists,
    revision: record.revision,
    updatedAt: record.exists ? record.updatedAt : null,
    bytes: record.exists ? record.bytes : 0,
  };
}

function extractExpectedUserId(url: string, configOrBody?: unknown): string | undefined {
  if (configOrBody && typeof configOrBody === 'object') {
    const record = configOrBody as Record<string, unknown>;
    if (typeof record.expectedUserId === 'string') {
      return record.expectedUserId;
    }
    if (record.params && typeof record.params === 'object') {
      const params = record.params as Record<string, unknown>;
      if (typeof params.expectedUserId === 'string') {
        return params.expectedUserId;
      }
    }
    if (record.data && typeof record.data === 'object') {
      const data = record.data as Record<string, unknown>;
      if (typeof data.expectedUserId === 'string') {
        return data.expectedUserId;
      }
    }
  }
  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    const searchParams = new URLSearchParams(url.slice(queryIndex + 1));
    const fromQuery = searchParams.get('expectedUserId');
    if (fromQuery !== null) return fromQuery;
  }
  return undefined;
}

async function verifyRequestPrincipal(expectedUserId: string | undefined): Promise<AuthUser> {
  if (typeof expectedUserId !== 'string' || !expectedUserId.trim()) {
    apiError('principal_required', '계정 확인 정보가 필요합니다.');
  }
  const currentUser = await auth.getUser();
  if (!currentUser || currentUser.userId !== expectedUserId) {
    apiError(
      'principal_mismatch',
      '계정이 변경되었거나 연결이 해제되었습니다. 서버 연결을 다시 확인해 주세요. 기기의 자료는 유지됩니다.',
    );
  }
  return currentUser;
}

function normalizePath(url: string): string {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
}

export const api = {
  async get(url: string, config?: unknown): Promise<{ data: unknown }> {
    const path = normalizePath(url);
    if (path !== '/api/studio/backup/status' && path !== '/api/studio/backup') {
      return unavailable();
    }
    const expectedUserId = extractExpectedUserId(url, config);
    const user = await verifyRequestPrincipal(expectedUserId);
    const record = readAccountBackupRecord(user.userId);

    if (path === '/api/studio/backup/status') {
      return { data: toStatusPayload(record) };
    }

    if (!record.exists || typeof record.raw !== 'string') {
      apiError('not_found', '저장된 서버 백업이 없습니다.');
    }

    return {
      data: {
        status: toStatusPayload(record),
        raw: record.raw,
      },
    };
  },

  async post(): Promise<{ data: unknown }> {
    return unavailable();
  },

  async put(url: string, body?: unknown): Promise<{ data: unknown }> {
    const path = normalizePath(url);
    if (path !== '/api/studio/backup') {
      return unavailable();
    }
    const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const expectedUserId = extractExpectedUserId(url, payload);
    const user = await verifyRequestPrincipal(expectedUserId);

    const requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : '';
    if (!requestId) {
      apiError('invalid_request', '백업 요청 식별자가 올바르지 않습니다.');
    }
    const baseRevision =
      typeof payload.baseRevision === 'string' && payload.baseRevision.trim()
        ? payload.baseRevision.trim()
        : null;
    const raw = typeof payload.raw === 'string' ? payload.raw : '';
    if (!raw) {
      apiError('invalid_payload', '백업 자료 형식이 올바르지 않습니다.');
    }

    let compact: string;
    try {
      compact = JSON.stringify(JSON.parse(raw));
    } catch {
      apiError('invalid_json', '백업 JSON 형식이 올바르지 않습니다.');
    }

    const bytes = new TextEncoder().encode(compact).byteLength;
    if (bytes > MAX_BACKUP_BYTES) {
      apiError(
        'payload_too_large',
        '서버 백업은 2MB까지 지원합니다. 전체 JSON 백업을 이용해 주세요.',
      );
    }

    const current = readAccountBackupRecord(user.userId);
    if (current.revision !== null && current.revision === requestId && current.exists) {
      return { data: toStatusPayload(current) };
    }

    if (baseRevision !== current.revision) {
      apiError(
        'revision_conflict',
        '다른 기기 또는 세션에서 백업이 변경되었습니다. 먼저 불러온 후 다시 저장해 주세요.',
      );
    }

    const nextRecord: StoredAccountBackupRecord = {
      exists: true,
      revision: requestId,
      updatedAt: new Date().toISOString(),
      bytes,
      raw: compact,
    };
    writeAccountBackupRecord(user.userId, nextRecord);
    return { data: toStatusPayload(nextRecord) };
  },

  async delete(url: string, config?: unknown): Promise<{ data: unknown }> {
    const path = normalizePath(url);
    if (path !== '/api/studio/backup') {
      return unavailable();
    }
    const envelope = (config && typeof config === 'object' ? config : {}) as Record<
      string,
      unknown
    >;
    const payload = (
      envelope.data && typeof envelope.data === 'object' ? envelope.data : envelope
    ) as Record<string, unknown>;

    const expectedUserId = extractExpectedUserId(url, config);
    const user = await verifyRequestPrincipal(expectedUserId);

    const requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : '';
    if (!requestId) {
      apiError('invalid_request', '삭제 요청 식별자가 올바르지 않습니다.');
    }
    const baseRevision =
      typeof payload.baseRevision === 'string' && payload.baseRevision.trim()
        ? payload.baseRevision.trim()
        : null;

    const current = readAccountBackupRecord(user.userId);
    if (current.revision !== null && current.revision === requestId && !current.exists) {
      return { data: toStatusPayload(current) };
    }

    if (baseRevision !== current.revision) {
      apiError(
        'revision_conflict',
        '다른 기기 또는 세션에서 백업이 변경되었습니다. 먼저 불러온 후 다시 저장해 주세요.',
      );
    }

    const tombstone: StoredAccountBackupRecord = {
      exists: false,
      revision: requestId,
      updatedAt: null,
      bytes: 0,
      raw: null,
    };
    writeAccountBackupRecord(user.userId, tombstone);
    return { data: toStatusPayload(tombstone) };
  },
};
