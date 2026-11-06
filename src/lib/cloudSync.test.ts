import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getState: vi.fn(),
  subscribe: vi.fn(),
  bootstrap: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('./firebaseSession', () => ({
  bootstrapFirebaseSession: mocks.bootstrap,
  signInWithGoogle: mocks.signIn,
  signOutOfFirebase: mocks.signOut,
  useFirebaseSession: { getState: mocks.getState, subscribe: mocks.subscribe },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.getState.mockReturnValue({ phase: 'signed-out', user: null, error: null });
  mocks.bootstrap.mockResolvedValue(undefined);
});

describe('Firebase compatibility view with no server backup', () => {
  it('bootstraps only the official Firebase session', async () => {
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    expect(mocks.bootstrap).toHaveBeenCalledOnce();
    expect(cloud.useCloudSession.getState()).toMatchObject({
      phase: 'signed-out',
      user: null,
      backup: null,
    });
  });

  it('mirrors observed account changes and clears stale account metadata', async () => {
    const cloud = await import('./cloudSync');
    const reflect = mocks.subscribe.mock.calls[0][0] as () => void;
    mocks.getState.mockReturnValue({
      phase: 'signed-in',
      user: { uid: 'a', email: 'a@example.test', displayName: '강사 A' },
      error: null,
    });
    reflect();
    expect(cloud.useCloudSession.getState()).toMatchObject({
      phase: 'signed-in',
      user: { userId: 'a', name: '강사 A' },
      backup: null,
    });
    mocks.getState.mockReturnValue({
      phase: 'unavailable',
      user: null,
      error: { message: '계정 연결 실패' },
    });
    reflect();
    expect(cloud.useCloudSession.getState()).toMatchObject({
      phase: 'unavailable',
      user: null,
      backup: null,
      error: '계정 연결 실패',
      pendingSave: false,
      pendingDelete: false,
    });
  });

  it('never presents local storage as server backup', async () => {
    const cloud = await import('./cloudSync');
    await expect(cloud.refreshCloudStatus()).rejects.toThrow('서버 백업은 연결');
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('서버 백업은 연결');
    await expect(cloud.readCloudBackup()).rejects.toThrow('서버 백업은 연결');
    await expect(cloud.acknowledgeCloudRecovery()).rejects.toThrow('서버 백업은 연결');
    await expect(cloud.deleteCloudBackup()).rejects.toThrow('서버 백업은 연결');
    expect(cloud.useCloudSession.getState().backup).toBeNull();
  });

  it('routes all login entry points to the same session implementation', async () => {
    const cloud = await import('./cloudSync');
    await cloud.signInWithGoogle({ prompt: 'select_account' });
    await cloud.signInToCloud();
    await cloud.signOutOfCloud();
    expect(mocks.signIn).toHaveBeenCalledTimes(2);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it('accepts only https identity images', async () => {
    const cloud = await import('./cloudSync');
    expect(cloud.safePictureUrl('https://example.test/a.png')).toBe('https://example.test/a.png');
    for (const url of ['http://example.test/a', 'javascript:alert(1)', '', null]) {
      expect(cloud.safePictureUrl(url)).toBeNull();
    }
  });
});
