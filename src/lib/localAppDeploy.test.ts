import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACCOUNT_BACKUP_STORAGE_PREFIX,
  DEFAULT_FIREBASE_CONFIG,
  FIREBASE_SESSION_STORAGE_KEY,
  api,
  auth,
  normalizeFirebaseConfig,
  resetLocalAppDeployForTesting,
  resolveFirebaseConfig,
  type FirebaseAuthBridge,
} from './localAppDeploy';

const accountA = {
  uid: 'google-uid-account-a',
  email: 'instructor.a@pilates.example',
  displayName: '김필라 강사 A',
  photoURL: 'https://example.com/avatar-a.png',
};

const accountB = {
  uid: 'google-uid-account-b',
  email: 'instructor.b@pilates.example',
  displayName: '이플로우 강사 B',
  photoURL: 'https://example.com/avatar-b.png',
};

const revA1 = '11111111-1111-4111-8111-111111111111';
const revA2 = '22222222-2222-4222-8222-222222222222';
const revB1 = '33333333-3333-4333-8333-333333333333';
const revBDelete = '44444444-4444-4444-8444-444444444444';

describe('localAppDeploy Firebase Google Auth and per-account backup bridge', () => {
  beforeEach(() => {
    localStorage.clear();
    delete globalThis.__PILATES_FIREBASE_AUTH__;
    delete globalThis.__PILATES_FIREBASE_CONFIG__;
    if (typeof window !== 'undefined') {
      delete window.firebase;
      delete window.__PILATES_FIREBASE_AUTH__;
      delete window.__PILATES_FIREBASE_CONFIG__;
    }
    resetLocalAppDeployForTesting();
  });

  afterEach(() => {
    localStorage.clear();
    delete globalThis.__PILATES_FIREBASE_AUTH__;
    delete globalThis.__PILATES_FIREBASE_CONFIG__;
    if (typeof window !== 'undefined') {
      delete window.firebase;
      delete window.__PILATES_FIREBASE_AUTH__;
      delete window.__PILATES_FIREBASE_CONFIG__;
    }
    resetLocalAppDeployForTesting();
  });

  it('throws the Korean unavailable guidance in unconfigured jsdom or when config is explicitly null', async () => {
    await expect(auth.getUser()).rejects.toThrow('서버 계정 백업은 배포된 앱에서 사용할 수 있습니다');
    await expect(auth.signInWithRedirect()).rejects.toThrow(
      '서버 계정 백업은 배포된 앱에서 사용할 수 있습니다',
    );

    globalThis.__PILATES_FIREBASE_CONFIG__ = null;
    await expect( resolveFirebaseConfig()).resolves.toBeNull();
    await expect(auth.getUser()).rejects.toThrow('서버 계정 백업은 배포된 앱에서 사용할 수 있습니다');
  });

  it('normalizes authDomain to deskcloud-fleet-auth.firebaseapp.com for the production Firebase project', async () => {
    const normalized = normalizeFirebaseConfig({
      apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: 'pilates-flow-atelier.web.app',
      projectId: 'deskcloud-fleet-auth',
      appId: DEFAULT_FIREBASE_CONFIG.appId,
    });
    expect(normalized).toEqual({
      apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: 'deskcloud-fleet-auth.firebaseapp.com',
      projectId: 'deskcloud-fleet-auth',
      appId: DEFAULT_FIREBASE_CONFIG.appId,
    });

    globalThis.__PILATES_FIREBASE_CONFIG__ = {
      apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: 'pilates-flow-atelier.firebaseapp.com',
      projectId: 'deskcloud-fleet-auth',
    };
    const resolved = await resolveFirebaseConfig();
    expect(resolved?.authDomain).toBe('deskcloud-fleet-auth.firebaseapp.com');
  });

  it('signs in with Google popup, persists session in localStorage, and restores across page reloads', async () => {
    let activeFirebaseUser: typeof accountA | null = null;
    const bridge: FirebaseAuthBridge = {
      getCurrentUser: vi.fn(async () => activeFirebaseUser),
      signInWithPopup: vi.fn(async () => {
        activeFirebaseUser = accountA;
        return { user: accountA };
      }),
      signInWithRedirect: vi.fn(async () => undefined),
      signOut: vi.fn(async () => {
        activeFirebaseUser = null;
      }),
    };
    globalThis.__PILATES_FIREBASE_AUTH__ = bridge;

    expect(await auth.getUser()).toBeNull();

    await auth.signInWithRedirect();
    expect(bridge.signInWithPopup).toHaveBeenCalledWith({
      provider: 'google.com',
      scope: 'openid email profile',
      prompt: 'select_account',
    });
    expect(bridge.signInWithRedirect).not.toHaveBeenCalled();

    const storedSessionRaw = localStorage.getItem(FIREBASE_SESSION_STORAGE_KEY);
    expect(storedSessionRaw).not.toBeNull();
    expect(JSON.parse(storedSessionRaw ?? '{}')).toEqual({
      userId: accountA.uid,
      email: accountA.email,
      name: accountA.displayName,
      picture: accountA.photoURL,
      scope: 'openid email profile',
    });

    // Simulate page reload where module state is reset and only localStorage persists
    resetLocalAppDeployForTesting();
    const restoredUser = await auth.getUser();
    expect(restoredUser).toEqual({
      userId: accountA.uid,
      email: accountA.email,
      name: accountA.displayName,
      picture: accountA.photoURL,
      scope: 'openid email profile',
    });

    // Simulate transient offline failure on bridge while cached session exists in localStorage
    resetLocalAppDeployForTesting();
    globalThis.__PILATES_FIREBASE_AUTH__ = {
      getCurrentUser: vi.fn(async () => {
        throw new Error('Network offline');
      }),
    };
    expect(await auth.getUser()).toEqual({
      userId: accountA.uid,
      email: accountA.email,
      name: accountA.displayName,
      picture: accountA.photoURL,
      scope: 'openid email profile',
    });
  });

  it('falls back to signInWithRedirect when popup is blocked and completes OAuth redirect callback via getRedirectResult', async () => {
    const popupBlockedBridge: FirebaseAuthBridge = {
      getCurrentUser: vi.fn(async () => null),
      signInWithPopup: vi.fn(async () => {
        throw Object.assign(new Error('Popup blocked by browser'), {
          code: 'auth/popup-blocked',
        });
      }),
      signInWithRedirect: vi.fn(async () => undefined),
    };
    globalThis.__PILATES_FIREBASE_AUTH__ = popupBlockedBridge;

    await auth.signInWithRedirect({ prompt: 'select_account' });
    expect(popupBlockedBridge.signInWithPopup).toHaveBeenCalledOnce();
    expect(popupBlockedBridge.signInWithRedirect).toHaveBeenCalledWith({
      provider: 'google.com',
      scope: 'openid email profile',
      prompt: 'select_account',
    });

    // Simulate returning from https://deskcloud-fleet-auth.firebaseapp.com/__/auth/handler
    resetLocalAppDeployForTesting();
    const postRedirectBridge: FirebaseAuthBridge = {
      getRedirectResult: vi.fn(async () => ({ user: accountA })),
      onAuthStateChanged: vi.fn((cb) => {
        cb(accountA);
        return () => undefined;
      }),
      getCurrentUser: vi.fn(async () => accountA),
    };
    globalThis.__PILATES_FIREBASE_AUTH__ = postRedirectBridge;

    const userAfterCallback = await auth.getUser();
    expect(postRedirectBridge.getRedirectResult).toHaveBeenCalledOnce();
    expect(userAfterCallback).toEqual({
      userId: accountA.uid,
      email: accountA.email,
      name: accountA.displayName,
      picture: accountA.photoURL,
      scope: 'openid email profile',
    });
    expect(localStorage.getItem(FIREBASE_SESSION_STORAGE_KEY)).toContain(accountA.uid);
  });

  it('preserves existing signed-in account when user closes the Google popup during an account switch attempt', async () => {
    let activeUser: typeof accountA | null = accountA;
    const bridge: FirebaseAuthBridge = {
      getCurrentUser: vi.fn(async () => activeUser),
      signInWithPopup: vi.fn(async () => {
        throw Object.assign(new Error('The popup has been closed by the user'), {
          code: 'auth/popup-closed-by-user',
        });
      }),
      signOut: vi.fn(async () => {
        activeUser = null;
      }),
    };
    globalThis.__PILATES_FIREBASE_AUTH__ = bridge;

    const initialUser = await auth.getUser();
    expect(initialUser?.userId).toBe(accountA.uid);

    await expect(auth.signInWithRedirect()).rejects.toThrow(
      'Google 로그인 창이 닫혀 연결을 취소했습니다. 다시 시도해 주세요.',
    );

    // Account A must remain signed in and cached in localStorage
    const afterCancelUser = await auth.getUser();
    expect(afterCancelUser?.userId).toBe(accountA.uid);
    expect(localStorage.getItem(FIREBASE_SESSION_STORAGE_KEY)).toContain(accountA.uid);

    // Explicit sign-out clears the session
    await auth.signOut();
    expect(bridge.signOut).toHaveBeenCalledOnce();
    expect(localStorage.getItem(FIREBASE_SESSION_STORAGE_KEY)).toBeNull();
    expect(await auth.getUser()).toBeNull();
  });

  it('integrates with window.firebase compat SDK and configures GoogleAuthProvider with select_account', async () => {
    const addScope = vi.fn();
    const setCustomParameters = vi.fn();
    class MockGoogleAuthProvider {
      addScope = addScope;
      setCustomParameters = setCustomParameters;
    }

    const initializeApp = vi.fn();
    const setPersistence = vi.fn(async () => undefined);
    const getRedirectResult = vi.fn(async () => ({ user: null }));
    const signInWithPopup = vi.fn(async () => ({ user: accountA }));
    const signOut = vi.fn(async () => undefined);

    window.firebase = {
      apps: [],
      initializeApp,
      auth: Object.assign(
        () => ({
          currentUser: null,
          setPersistence,
          getRedirectResult,
          onAuthStateChanged: (cb: (u: typeof accountA | null) => void) => {
            cb(null);
            return () => undefined;
          },
          signInWithPopup,
          signOut,
        }),
        {
          GoogleAuthProvider: MockGoogleAuthProvider,
          Auth: { Persistence: { LOCAL: 'local' } },
        },
      ),
    };

    expect(await auth.getUser()).toBeNull();
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'deskcloud-fleet-auth',
        authDomain: 'deskcloud-fleet-auth.firebaseapp.com',
      }),
    );
    expect(setPersistence).toHaveBeenCalledWith('local');

    await auth.signInWithRedirect();
    expect(addScope).toHaveBeenCalledWith('email');
    expect(addScope).toHaveBeenCalledWith('profile');
    expect(setCustomParameters).toHaveBeenCalledWith({ prompt: 'select_account' });
    expect(signInWithPopup).toHaveBeenCalledOnce();
    expect((await auth.getUser())?.userId).toBe(accountA.uid);
  });

  it('strictly isolates /api/studio/backup* data per account and enforces compare-and-swap revisions', async () => {
    let currentAccount: typeof accountA | typeof accountB | null = accountA;
    globalThis.__PILATES_FIREBASE_AUTH__ = {
      getCurrentUser: vi.fn(async () => currentAccount),
      signOut: vi.fn(async () => {
        currentAccount = null;
      }),
    };

    // 1. Account A initial status is empty
    const statusA0 = await api.get('/api/studio/backup/status', {
      params: { expectedUserId: accountA.uid },
    });
    expect(statusA0.data).toEqual({
      exists: false,
      revision: null,
      updatedAt: null,
      bytes: 0,
    });

    // Missing expectedUserId is rejected with principal_required
    await expect(api.get('/api/studio/backup/status')).rejects.toMatchObject({
      response: { data: { error: 'principal_required' } },
    });

    // 2. Account A saves a backup
    const payloadA1 = JSON.stringify({ studio: 'Atelier A', sequences: ['warmup-a'] });
    const saveA1 = await api.put('/api/studio/backup', {
      requestId: revA1,
      baseRevision: null,
      raw: payloadA1,
      expectedUserId: accountA.uid,
    });
    expect(saveA1.data).toMatchObject({
      exists: true,
      revision: revA1,
      bytes: new TextEncoder().encode(payloadA1).byteLength,
    });
    expect(localStorage.getItem(`${ACCOUNT_BACKUP_STORAGE_PREFIX}${accountA.uid}`)).toContain(
      'Atelier A',
    );

    // Idempotent retry with the same requestId succeeds even if baseRevision is null
    const retryA1 = await api.put('/api/studio/backup', {
      requestId: revA1,
      baseRevision: null,
      raw: payloadA1,
      expectedUserId: accountA.uid,
    });
    expect(retryA1.data).toEqual(saveA1.data);

    // Stale baseRevision with a new requestId fails with revision_conflict
    await expect(
      api.put('/api/studio/backup', {
        requestId: revA2,
        baseRevision: null,
        raw: JSON.stringify({ studio: 'Stale overwrite' }),
        expectedUserId: accountA.uid,
      }),
    ).rejects.toMatchObject({
      response: { data: { error: 'revision_conflict' } },
    });

    // 3. Switch active user to Account B
    currentAccount = accountB;

    // Request with Account A's expectedUserId while signed in as Account B fails with principal_mismatch
    await expect(
      api.get('/api/studio/backup/status', {
        params: { expectedUserId: accountA.uid },
      }),
    ).rejects.toMatchObject({
      response: { data: { error: 'principal_mismatch' } },
    });

    // Account B sees an empty backup status (completely isolated from Account A)
    const statusB0 = await api.get('/api/studio/backup/status', {
      params: { expectedUserId: accountB.uid },
    });
    expect(statusB0.data).toEqual({
      exists: false,
      revision: null,
      updatedAt: null,
      bytes: 0,
    });

    // Account B saves its own backup
    const payloadB1 = JSON.stringify({ studio: 'Atelier B', sequences: ['reformer-b'] });
    const saveB1 = await api.put('/api/studio/backup', {
      requestId: revB1,
      baseRevision: null,
      raw: payloadB1,
      expectedUserId: accountB.uid,
    });
    expect(saveB1.data).toMatchObject({
      exists: true,
      revision: revB1,
    });

    const readB1 = await api.get('/api/studio/backup', {
      params: { expectedUserId: accountB.uid },
    });
    expect(readB1.data).toEqual({
      status: saveB1.data,
      raw: payloadB1,
    });

    // Account B deletes its backup (creates tombstone)
    const deleteB = await api.delete('/api/studio/backup', {
      data: {
        requestId: revBDelete,
        baseRevision: revB1,
        expectedUserId: accountB.uid,
      },
    });
    expect(deleteB.data).toEqual({
      exists: false,
      revision: revBDelete,
      updatedAt: null,
      bytes: 0,
    });

    // 4. Switch back to Account A and verify Account A's backup is completely untouched
    currentAccount = accountA;
    const readA1 = await api.get('/api/studio/backup', {
      params: { expectedUserId: accountA.uid },
    });
    expect(readA1.data).toEqual({
      status: saveA1.data,
      raw: payloadA1,
    });
  });

  it('connects CloudSyncPanel -> cloudSync -> unmocked @appdeploy/client (localAppDeploy) -> window.firebase end-to-end', async () => {
    let activeFbUser: typeof accountA | typeof accountB | null = null;
    let nextPopupUser: typeof accountA | typeof accountB = accountA;
    const authListeners = new Set<(u: typeof accountA | null) => void>();

    class MockGoogleAuthProvider {
      scopes: string[] = [];
      params: Record<string, string> = {};
      addScope(scope: string) {
        this.scopes.push(scope);
      }
      setCustomParameters(params: Record<string, string>) {
        this.params = params;
      }
    }

    window.firebase = {
      apps: [],
      initializeApp: vi.fn(),
      auth: Object.assign(
        () => ({
          get currentUser() {
            return activeFbUser;
          },
          setPersistence: vi.fn(async () => undefined),
          getRedirectResult: vi.fn(async () => ({ user: null })),
          onAuthStateChanged: (cb: (u: typeof accountA | null) => void) => {
            authListeners.add(cb);
            cb(activeFbUser);
            return () => authListeners.delete(cb);
          },
          signInWithPopup: vi.fn(async () => {
            activeFbUser = nextPopupUser;
            authListeners.forEach((cb) => cb(activeFbUser));
            return { user: activeFbUser };
          }),
          signOut: vi.fn(async () => {
            activeFbUser = null;
            authListeners.forEach((cb) => cb(null));
          }),
        }),
        {
          GoogleAuthProvider: MockGoogleAuthProvider,
          Auth: { Persistence: { LOCAL: 'local' } },
        },
      ),
    };

    const cloud = await import('./cloudSync');
    const { usePilatesStore } = await import('../store/usePilatesStore');

    // 1. Initial startup on web.app resolves to signed-out (not unavailable)
    await cloud.bootstrapCloudSession(true);
    expect(cloud.useCloudSession.getState().phase).toBe('signed-out');
    expect(cloud.useCloudSession.getState().error).toBeNull();

    // 2. Sign in with Google as Account A
    nextPopupUser = accountA;
    await cloud.signInWithGoogle();
    expect(cloud.useCloudSession.getState().phase).toBe('signed-in');
    expect(cloud.useCloudSession.getState().user).toMatchObject({
      userId: accountA.uid,
      email: accountA.email,
      name: accountA.displayName,
    });

    // Save studio sequence and cloud backup under Account A
    usePilatesStore.getState().setActiveSequenceMeta({
      title: 'WebApp E2E 계정 A 시퀀스',
    });
    usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    await cloud.saveCloudBackup(usePilatesStore.getState().exportBackup());
    expect(cloud.useCloudSession.getState().backup?.exists).toBe(true);

    // 3. Refresh persistence: reset localAppDeploy runtime state and re-bootstrap
    resetLocalAppDeployForTesting();
    await cloud.bootstrapCloudSession(true);
    expect(cloud.useCloudSession.getState().phase).toBe('signed-in');
    expect(cloud.useCloudSession.getState().user?.userId).toBe(accountA.uid);
    expect(
      usePilatesStore
        .getState()
        .savedSequences.some((seq) => seq.title === 'WebApp E2E 계정 A 시퀀스'),
    ).toBe(true);

    // 4. Logout & Re-entry
    await cloud.signOutOfCloud();
    expect(cloud.useCloudSession.getState().phase).toBe('signed-out');
    expect(
      usePilatesStore
        .getState()
        .savedSequences.some((seq) => seq.title === 'WebApp E2E 계정 A 시퀀스'),
    ).toBe(false);

    nextPopupUser = accountA;
    await cloud.signInWithGoogle();
    expect(cloud.useCloudSession.getState().user?.userId).toBe(accountA.uid);
    expect(
      usePilatesStore
        .getState()
        .savedSequences.some((seq) => seq.title === 'WebApp E2E 계정 A 시퀀스'),
    ).toBe(true);

    // 5. Switch to Account B and verify account data isolation
    nextPopupUser = accountB;
    await cloud.signInWithGoogle({ prompt: 'select_account' });
    expect(cloud.useCloudSession.getState().user?.userId).toBe(accountB.uid);
    expect(cloud.useCloudSession.getState().backup?.exists).toBe(false);
    expect(
      usePilatesStore
        .getState()
        .savedSequences.some((seq) => seq.title === 'WebApp E2E 계정 A 시퀀스'),
    ).toBe(false);
  });
});
