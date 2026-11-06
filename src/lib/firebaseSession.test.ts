import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const workspace = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock('./accountStorage', () => ({ syncAccountWorkspace: workspace.sync }));

const sdk = vi.hoisted(() => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(),
  getAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider(this: {
    setCustomParameters: ReturnType<typeof vi.fn>;
  }) {
    this.setCustomParameters = vi.fn();
  }),
}));

vi.mock('firebase/app', () => ({
  initializeApp: sdk.initializeApp,
  getApps: sdk.getApps,
}));
vi.mock('firebase/auth', () => ({
  getAuth: sdk.getAuth,
  onAuthStateChanged: sdk.onAuthStateChanged,
  signInWithPopup: sdk.signInWithPopup,
  signOut: sdk.signOut,
  GoogleAuthProvider: sdk.GoogleAuthProvider,
}));

type TestUser = { uid: string; displayName: string | null; email: string | null };
let observer: (user: TestUser | null) => void;
let observerError: (cause: unknown) => void;
let autoNotify: boolean;
let currentUser: TestUser | null;
const syntheticUser: TestUser = {
  uid: 'synthetic-account',
  displayName: '테스트 강사',
  email: 'instructor@example.test',
};
const config = {
  projectId: 'deskcloud-fleet-auth',
  appId: '1:1083045258283:web:25c2e482307b366e70366e',
  authDomain: 'deskcloud-fleet-auth.firebaseapp.com',
  apiKey: 'synthetic-public-client-key',
};
const authInstance = {
  name: 'synthetic-auth',
  get currentUser() {
    return currentUser;
  },
};
const fetchMock = vi.fn();

function response(value: unknown = config) {
  return { ok: true, json: async () => value };
}
async function load() {
  return import('./firebaseSession');
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  workspace.sync.mockReset();
  localStorage.clear();
  autoNotify = true;
  currentUser = null;
  vi.stubGlobal('window', {
    location: { origin: 'https://pilates-flow-atelier.web.app' },
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValue(response());
  sdk.getApps.mockReturnValue([]);
  sdk.initializeApp.mockReturnValue({ name: 'pilates-flow-account', options: config });
  sdk.getAuth.mockReturnValue(authInstance);
  sdk.onAuthStateChanged.mockImplementation((_auth, next, error) => {
    observer = next;
    observerError = error;
    if (autoNotify) queueMicrotask(() => next(currentUser));
    return sdk.unsubscribe;
  });
  sdk.signInWithPopup.mockResolvedValue({ user: syntheticUser });
  sdk.signOut.mockImplementation(async () => {
    observer(null);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Firebase account bootstrap', () => {
  it.each([
    'http://localhost:5173',
    'https://flow-atelier-g2mgg1.v2.appdeploy.ai',
    'https://pilates-flow-atelier.web.app.attacker.test',
    'http://pilates-flow-atelier.web.app',
  ])('does not fetch or initialize on unsupported origin %s', async (origin) => {
    Object.assign(window.location, { origin });
    const session = await load();
    await session.bootstrapFirebaseSession();
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'unavailable',
      error: { code: 'auth/unsupported-host' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sdk.initializeApp).not.toHaveBeenCalled();
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
  });

  it('bootstraps once and waits for the auth observer without automatic login', async () => {
    autoNotify = false;
    const session = await load();
    const first = session.bootstrapFirebaseSession();
    const second = session.bootstrapFirebaseSession();
    await vi.waitFor(() => expect(sdk.onAuthStateChanged).toHaveBeenCalledOnce());
    expect(session.useFirebaseSession.getState().phase).toBe('checking');
    observer(null);
    await Promise.all([first, second]);
    await session.bootstrapFirebaseSession();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      '/__/firebase/init.json',
      expect.objectContaining({
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
      }),
    );
    expect(sdk.getAuth).toHaveBeenCalledWith(sdk.initializeApp.mock.results[0].value);
    expect(session.useFirebaseSession.getState().phase).toBe('signed-out');
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
  });

  it('restores only the observed account and reacts to later account changes', async () => {
    currentUser = syntheticUser;
    const session = await load();
    await session.bootstrapFirebaseSession();
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'signed-in',
      user: syntheticUser,
    });
    observer({ ...syntheticUser, uid: 'second-account', displayName: '두 번째 강사' });
    expect(session.useFirebaseSession.getState().user?.uid).toBe('second-account');
    observer(null);
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'signed-out',
      user: null,
    });
  });

  it.each([
    { ...config, projectId: 'different-project' },
    { ...config, authDomain: 'untrusted.example.test' },
    { ...config, appId: 'different-app' },
    { ...config, apiKey: '' },
    null,
  ])('rejects unexpected public hosting configuration', async (invalid) => {
    fetchMock.mockResolvedValue(response(invalid));
    const session = await load();
    await session.bootstrapFirebaseSession();
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'unavailable',
      error: { code: 'auth/invalid-hosting-config' },
    });
    expect(sdk.initializeApp).not.toHaveBeenCalled();
  });

  it('bounds a hanging fetch, aborts it, ignores late results and allows retry', async () => {
    vi.useFakeTimers();
    const pending = deferred<ReturnType<typeof response>>();
    fetchMock.mockReturnValueOnce(pending.promise);
    const session = await load();
    const first = session.bootstrapFirebaseSession();
    await vi.advanceTimersByTimeAsync(session.FIREBASE_BOOTSTRAP_TIMEOUT_MS);
    await first;
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'unavailable',
      error: { code: 'auth/bootstrap-timeout' },
    });
    await session.bootstrapFirebaseSession();
    expect(session.useFirebaseSession.getState().phase).toBe('signed-out');
    pending.resolve(response());
    await Promise.resolve();
    await Promise.resolve();
    expect(sdk.initializeApp).toHaveBeenCalledOnce();
    expect(session.useFirebaseSession.getState().phase).toBe('signed-out');
  });

  it('bounds restoration, unsubscribes a stuck observer and rejects its late callback', async () => {
    vi.useFakeTimers();
    autoNotify = false;
    const session = await load();
    const pending = session.bootstrapFirebaseSession();
    await vi.advanceTimersByTimeAsync(session.FIREBASE_BOOTSTRAP_TIMEOUT_MS);
    await pending;
    expect(sdk.unsubscribe).toHaveBeenCalledOnce();
    observer(syntheticUser);
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'unavailable',
      user: null,
      error: { code: 'auth/bootstrap-timeout' },
    });
  });

  it('can retry a failed public configuration request', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const session = await load();
    await session.bootstrapFirebaseSession();
    expect(session.useFirebaseSession.getState().phase).toBe('unavailable');
    await session.bootstrapFirebaseSession();
    expect(session.useFirebaseSession.getState().phase).toBe('signed-out');
  });

  it('reports an observer error without showing a stale account', async () => {
    currentUser = syntheticUser;
    const session = await load();
    await session.bootstrapFirebaseSession();
    observerError({ code: 'auth/network-request-failed' });
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'unavailable',
      user: null,
      error: { code: 'auth/network-request-failed' },
    });
  });
});

describe('explicit Google account actions (mocked SDK, not identity verification)', () => {
  it('opens the popup in the click call stack and deduplicates repeated clicks', async () => {
    const pending = deferred<unknown>();
    sdk.signInWithPopup.mockReturnValue(pending.promise);
    const session = await load();
    await session.bootstrapFirebaseSession();
    const first = session.signInWithGoogle();
    expect(sdk.signInWithPopup).toHaveBeenCalledWith(
      authInstance,
      expect.any(sdk.GoogleAuthProvider),
    );
    const second = session.signInWithGoogle();
    expect(first).toBe(second);
    expect(sdk.signInWithPopup).toHaveBeenCalledOnce();
    expect(session.useFirebaseSession.getState().operation).toBe('signing-in');
    observer(syntheticUser);
    pending.resolve({ user: syntheticUser });
    await first;
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'signed-in',
      user: syntheticUser,
      operation: null,
    });
  });

  it('does not claim a session from the popup result without an auth observer update', async () => {
    const session = await load();
    await session.bootstrapFirebaseSession();
    await session.signInWithGoogle();
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'signed-out',
      user: null,
    });
  });

  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    'handles cancellation %s and permits a fresh attempt',
    async (code) => {
      sdk.signInWithPopup.mockRejectedValueOnce({ code });
      const session = await load();
      await session.bootstrapFirebaseSession();
      await session.signInWithGoogle();
      expect(session.useFirebaseSession.getState()).toMatchObject({
        phase: 'signed-out',
        operation: null,
        error: null,
      });
      expect(session.useFirebaseSession.getState().notice).not.toBe('');
      await session.signInWithGoogle();
      expect(sdk.signInWithPopup).toHaveBeenCalledTimes(2);
    },
  );

  it.each([
    ['auth/unauthorized-domain', '허용 도메인'],
    ['auth/operation-not-allowed', '제공자'],
    ['auth/popup-blocked', '팝업'],
    ['auth/network-request-failed', '네트워크'],
    ['auth/web-storage-unsupported', '저장소'],
  ])('reports actionable %s errors and allows retry', async (code, text) => {
    sdk.signInWithPopup.mockRejectedValueOnce({ code, message: 'private-provider-detail' });
    const session = await load();
    await session.bootstrapFirebaseSession();
    await session.signInWithGoogle();
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'signed-out',
      operation: null,
      error: { code },
    });
    expect(session.useFirebaseSession.getState().error?.message).toContain(text);
    expect(JSON.stringify(session.useFirebaseSession.getState())).not.toContain(
      'private-provider-detail',
    );
    await session.signInWithGoogle();
    expect(sdk.signInWithPopup).toHaveBeenCalledTimes(2);
  });

  it('handles a synchronous popup failure without leaving controls busy', async () => {
    sdk.signInWithPopup.mockImplementation(() => {
      throw { code: 'auth/popup-blocked' };
    });
    const session = await load();
    await session.bootstrapFirebaseSession();
    await session.signInWithGoogle();
    expect(session.useFirebaseSession.getState()).toMatchObject({
      operation: null,
      error: { code: 'auth/popup-blocked' },
    });
  });

  it('signs out only Firebase and preserves all existing local app data', async () => {
    currentUser = syntheticUser;
    localStorage.setItem('pilates-store-test', 'synthetic-local-data');
    localStorage.setItem('appdeploy-backup-test', 'synthetic-existing-data');
    const before = { ...localStorage };
    const session = await load();
    await session.bootstrapFirebaseSession();
    await session.signOutOfFirebase();
    expect(sdk.signOut).toHaveBeenCalledWith(authInstance);
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'signed-out',
      user: null,
      operation: null,
    });
    expect(session.useFirebaseSession.getState().notice).toContain('같은 계정으로 다시 로그인');
    expect({ ...localStorage }).toEqual(before);
    expect(fetchMock).toHaveBeenCalledOnce();
    localStorage.removeItem('pilates-store-test');
    localStorage.removeItem('appdeploy-backup-test');
  });

  it('deduplicates logout and keeps the observed account when logout fails', async () => {
    currentUser = syntheticUser;
    const pending = deferred<void>();
    sdk.signOut.mockReturnValue(pending.promise);
    const session = await load();
    await session.bootstrapFirebaseSession();
    const first = session.signOutOfFirebase();
    const second = session.signOutOfFirebase();
    expect(first).toBe(second);
    pending.reject({ code: 'auth/network-request-failed' });
    await first;
    expect(sdk.signOut).toHaveBeenCalledOnce();
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'signed-in',
      user: syntheticUser,
      operation: null,
      error: { code: 'auth/network-request-failed' },
    });
  });

  it('does not open a popup before bootstrap or on an unverified host', async () => {
    const session = await load();
    await session.signInWithGoogle();
    Object.assign(window.location, { origin: 'https://example.test' });
    await session.bootstrapFirebaseSession();
    await session.signInWithGoogle();
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
  });
});

describe('account workspace boundary', () => {
  it('switches the workspace before publishing each observed account', async () => {
    const session = await load();
    await session.bootstrapFirebaseSession();
    workspace.sync.mockImplementation((uid) => {
      if (uid === syntheticUser.uid) expect(session.useFirebaseSession.getState().user).toBeNull();
    });
    currentUser = syntheticUser;
    observer(currentUser);
    expect(workspace.sync).toHaveBeenLastCalledWith(syntheticUser.uid);
    expect(session.getVerifiedFirebaseAccount()?.uid).toBe(syntheticUser.uid);
    currentUser = null;
    expect(session.getVerifiedFirebaseAccount()).toBeNull();
    observer(null);
    expect(workspace.sync).toHaveBeenLastCalledWith(null);
    expect(session.useFirebaseSession.getState().user).toBeNull();
  });

  it('fails closed if account workspace preservation fails', async () => {
    const session = await load();
    await session.bootstrapFirebaseSession();
    workspace.sync.mockImplementation(() => {
      throw new Error('quota');
    });
    currentUser = syntheticUser;
    observer(currentUser);
    expect(session.useFirebaseSession.getState()).toMatchObject({
      phase: 'unavailable',
      user: null,
      error: { code: 'auth/workspace-storage-failed' },
    });
    expect(session.getVerifiedFirebaseAccount()).toBeNull();
  });

  it('keeps the original account after cancelled account selection', async () => {
    currentUser = syntheticUser;
    sdk.signInWithPopup.mockRejectedValueOnce({ code: 'auth/popup-closed-by-user' });
    const session = await load();
    await session.bootstrapFirebaseSession();
    workspace.sync.mockClear();
    await session.signInWithGoogle();
    expect(session.getVerifiedFirebaseAccount()?.uid).toBe(syntheticUser.uid);
    expect(workspace.sync).not.toHaveBeenCalled();
    expect(session.useFirebaseSession.getState().error).toBeNull();
  });
});
