import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  getUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getState: vi.fn(),
}));
vi.mock('./firebaseSession', () => ({
  bootstrapFirebaseSession: mocks.bootstrap,
  getVerifiedFirebaseAccount: mocks.getUser,
  signInWithGoogle: mocks.signIn,
  signOutOfFirebase: mocks.signOut,
  useFirebaseSession: { getState: mocks.getState },
}));
import {
  ACCOUNT_BACKUP_STORAGE_PREFIX,
  FIREBASE_SESSION_STORAGE_KEY,
  api,
  auth,
} from './localAppDeploy';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.bootstrap.mockResolvedValue(undefined);
  mocks.getUser.mockReturnValue(null);
  mocks.getState.mockReturnValue({ phase: 'signed-out', user: null, error: null });
});

describe('legacy adapter fails closed', () => {
  it('never trusts a cached local profile as an authenticated account', async () => {
    localStorage.setItem(
      FIREBASE_SESSION_STORAGE_KEY,
      JSON.stringify({ userId: 'forged-profile' }),
    );
    expect(await auth.getUser()).toBeNull();
    expect(localStorage.getItem(FIREBASE_SESSION_STORAGE_KEY)).toContain('forged-profile');
  });

  it('rejects an unavailable SDK instead of restoring the cached profile', async () => {
    localStorage.setItem(FIREBASE_SESSION_STORAGE_KEY, '{"userId":"old-user"}');
    mocks.getState.mockReturnValue({ phase: 'unavailable', error: { message: 'SDK unavailable' } });
    await expect(auth.getUser()).rejects.toThrow('SDK unavailable');
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('maps only a verified live Firebase identity', async () => {
    mocks.getState.mockReturnValue({ phase: 'signed-in', error: null });
    mocks.getUser.mockReturnValue({
      uid: 'live-uid',
      email: 'teacher@example.test',
      displayName: '강사',
      photoURL: null,
    });
    expect(await auth.getUser()).toEqual({
      userId: 'live-uid',
      email: 'teacher@example.test',
      name: '강사',
      scope: 'openid email profile',
    });
  });

  it('delegates explicit actions without loading another SDK or making a redirect', async () => {
    await auth.signInWithRedirect();
    await auth.signOut();
    expect(mocks.signIn).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.bootstrap).not.toHaveBeenCalled();
  });

  it.each(['get', 'put', 'post', 'delete'] as const)(
    'does not expose local backup copies as a server %s API or mutate legacy copies',
    async (method) => {
      const key = ACCOUNT_BACKUP_STORAGE_PREFIX + 'old-account';
      localStorage.setItem(key, '{"raw":"existing-user-data"}');
      const before = { ...localStorage };
      const request = api[method]('/api/studio/backup', { raw: 'overwrite' });
      await expect(request).rejects.toThrow('서버 기능은 연결');
      await expect(request).rejects.toMatchObject({ code: 'local_api_unavailable' });
      expect({ ...localStorage }).toEqual(before);
    },
  );
});
