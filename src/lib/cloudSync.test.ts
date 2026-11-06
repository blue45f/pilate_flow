import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@appdeploy/client', () => ({
  auth: { getUser: mocks.getUser, signInWithRedirect: mocks.signIn, signOut: mocks.signOut },
  api: { get: mocks.get, put: mocks.put, delete: mocks.remove },
}));

const firstRevision = '9e1d3789-1ce4-4caa-8be8-fcc0d0e2d348';
const deletedRevision = '05781f86-e301-42b0-8dd0-5b018fc14b18';
const user = { userId: 'account-a', email: 'teacher@example.test', scope: 'openid email' };
const emptyStatus = { exists: false, revision: null, updatedAt: null, bytes: 0 };
const existingStatus = {
  exists: true,
  revision: firstRevision,
  updatedAt: '2026-11-04T12:00:00.000Z',
  bytes: 128,
};

async function acknowledgeFixtureRecovery(cloud: typeof import('./cloudSync')) {
  mocks.get.mockResolvedValueOnce({
    data: { status: cloud.useCloudSession.getState().backup, raw: '{"fixture":true}' },
  });
  await cloud.readCloudBackup();
  await cloud.acknowledgeCloudRecovery();
}

describe('cloud account backup client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    mocks.getUser.mockResolvedValue(user);
    mocks.get.mockResolvedValue({ data: emptyStatus });
    mocks.signOut.mockResolvedValue(undefined);
  });

  it('waits for restored identity before loading protected server data', async () => {
    let restore!: (value: typeof user) => void;
    mocks.getUser.mockReturnValue(
      new Promise((resolve) => {
        restore = resolve;
      }),
    );
    const cloud = await import('./cloudSync');
    const startup = cloud.bootstrapCloudSession();
    expect(cloud.useCloudSession.getState().phase).toBe('checking');
    expect(mocks.get).not.toHaveBeenCalled();
    restore(user);
    await startup;
    expect(mocks.get).toHaveBeenCalledWith('/api/studio/backup/status', {
      params: { expectedUserId: user.userId },
    });
    expect(cloud.useCloudSession.getState().phase).toBe('signed-in');
  });

  it('keeps anonymous visitors away from cloud API calls', async () => {
    mocks.getUser.mockResolvedValue(null);
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('로그인');
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('retains the same request and payload when a save result is uncertain', async () => {
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    mocks.put.mockRejectedValueOnce({
      response: { data: { error: 'write_unconfirmed', message: '확인되지 않았습니다.' } },
    });
    await expect(cloud.saveCloudBackup('{"draft":"original"}')).rejects.toThrow('확인되지');
    expect(cloud.useCloudSession.getState().pendingSave).toBe(true);
    const sent = mocks.put.mock.calls[0][1];
    expect(sent.raw).toBe('{"draft":"original"}');
    mocks.put.mockResolvedValueOnce({ data: { ...existingStatus, revision: sent.requestId } });
    await cloud.saveCloudBackup('{"draft":"edited after failed request"}');
    expect(mocks.put.mock.calls[1][1]).toEqual(sent);
    expect(cloud.useCloudSession.getState().pendingSave).toBe(false);
  });

  it('allows a deliberate new save after refreshing a remotely deleted backup', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    await acknowledgeFixtureRecovery(cloud);
    mocks.put.mockRejectedValueOnce({
      response: { data: { error: 'revision_conflict', message: '다른 기기에서 변경했습니다.' } },
    });
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('다른 기기');
    expect(cloud.useCloudSession.getState().conflict).toBe(true);
    mocks.get.mockResolvedValueOnce({ data: { ...emptyStatus, revision: deletedRevision } });
    await cloud.refreshCloudStatus();
    expect(cloud.useCloudSession.getState().conflict).toBe(false);
    mocks.put.mockImplementationOnce(async (_url, body) => ({
      data: { ...existingStatus, revision: body.requestId },
    }));
    await cloud.saveCloudBackup('{}');
    expect(mocks.put.mock.calls[1][1].baseRevision).toBe(deletedRevision);
  });

  it('requires recovery before saving over an existing conflicting server backup', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    await acknowledgeFixtureRecovery(cloud);
    mocks.put.mockRejectedValueOnce({
      response: { data: { error: 'revision_conflict', message: '변경 충돌' } },
    });
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('변경 충돌');
    await cloud.refreshCloudStatus();
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('먼저 불러온');
    expect(mocks.put).toHaveBeenCalledTimes(1);
    mocks.get.mockResolvedValueOnce({
      data: { status: existingStatus, raw: '{"recovered":true}' },
    });
    expect(await cloud.readCloudBackup()).toBe('{"recovered":true}');
    // A download alone cannot authorize overwriting; the store must first validate and merge it.
    expect(cloud.useCloudSession.getState().conflict).toBe(true);
    await cloud.acknowledgeCloudRecovery();
    expect(cloud.useCloudSession.getState().conflict).toBe(false);
  });

  it('sends deletion JSON in the Axios config data field used by the real injected SDK', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    mocks.remove.mockImplementationOnce(async (_url, config) => {
      if (!config?.data?.requestId) throw new Error('Axios did not receive a DELETE body');
      return { data: { ...emptyStatus, revision: config.data.requestId } };
    });
    await cloud.deleteCloudBackup();
    expect(mocks.remove).toHaveBeenCalledWith('/api/studio/backup', {
      data: {
        requestId: expect.any(String),
        baseRevision: firstRevision,
        expectedUserId: user.userId,
      },
    });
    expect(cloud.useCloudSession.getState().backup?.exists).toBe(false);
    expect(cloud.useCloudSession.getState().pendingDelete).toBe(false);
  });

  it('clears cloud account metadata and pending work after successful sign out', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    await cloud.signOutOfCloud();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(cloud.useCloudSession.getState()).toMatchObject({
      phase: 'signed-out',
      user: null,
      backup: null,
      pendingSave: false,
      pendingDelete: false,
    });
  });

  it('blocks saving stale local work after a status refresh discovers a newer remote snapshot', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    await acknowledgeFixtureRecovery(cloud);
    mocks.get.mockResolvedValueOnce({ data: { ...existingStatus, revision: deletedRevision } });
    await cloud.refreshCloudStatus();
    expect(cloud.useCloudSession.getState().conflict).toBe(true);
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('먼저 불러온');
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('detects a cross-tab account switch before any mutation and requires reconnecting', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    mocks.getUser.mockResolvedValue({ ...user, userId: 'account-b' });
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('계정이 변경');
    expect(mocks.put).not.toHaveBeenCalled();
    expect(cloud.useCloudSession.getState()).toMatchObject({
      phase: 'unavailable',
      user: null,
      backup: null,
      pendingSave: false,
      pendingDelete: false,
    });
    await cloud.bootstrapCloudSession(true);
    expect(cloud.useCloudSession.getState().user?.userId).toBe('account-b');
  });

  it('discards a protected response if the account changes while the request is in flight', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    mocks.get.mockImplementationOnce(async () => {
      mocks.getUser.mockResolvedValue({ ...user, userId: 'account-b' });
      return { data: { status: existingStatus, raw: 'private account-a snapshot' } };
    });
    await expect(cloud.readCloudBackup()).rejects.toThrow('계정이 변경');
    expect(cloud.useCloudSession.getState().backup).toBeNull();
  });

  it('uses the server principal mismatch response to clear stale identity and pending payloads', async () => {
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    mocks.put.mockRejectedValueOnce({
      response: { data: { error: 'principal_mismatch', message: '다른 계정입니다.' } },
    });
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('계정이 변경');
    expect(mocks.put.mock.calls[0][1].expectedUserId).toBe(user.userId);
    expect(cloud.useCloudSession.getState()).toMatchObject({
      phase: 'unavailable',
      user: null,
      backup: null,
      pendingSave: false,
    });
  });

  it('does not clear conflicts when a recovery download has not been acknowledged as merged', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    cloud.useCloudSession.setState({ conflict: true });
    mocks.get.mockResolvedValueOnce({
      data: { status: existingStatus, raw: 'unvalidated snapshot' },
    });
    await cloud.readCloudBackup();
    await expect(cloud.saveCloudBackup('{}')).rejects.toThrow('먼저 불러온');
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('requires recovery on a fresh session before replacing an existing account backup', async () => {
    mocks.get.mockResolvedValue({ data: existingStatus });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    expect(cloud.useCloudSession.getState().conflict).toBe(true);
    await expect(cloud.saveCloudBackup('{"freshDevice":true}')).rejects.toThrow('먼저 불러온');
    expect(mocks.put).not.toHaveBeenCalled();
    await acknowledgeFixtureRecovery(cloud);
    mocks.put.mockImplementationOnce(async (_url, body) => ({
      data: { ...existingStatus, revision: body.requestId },
    }));
    await cloud.saveCloudBackup('{"mergedDevice":true}');
    expect(mocks.put).toHaveBeenCalledOnce();
  });

  it('allows confirming the same pending save after a status refresh finds that exact request', async () => {
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    mocks.put.mockRejectedValueOnce({
      response: { data: { error: 'write_unconfirmed', message: '결과 미확인' } },
    });
    await expect(cloud.saveCloudBackup('{"draft":true}')).rejects.toThrow('결과 미확인');
    const sent = mocks.put.mock.calls[0][1];
    const saved = { ...existingStatus, revision: sent.requestId };
    mocks.get.mockResolvedValueOnce({ data: saved });
    await cloud.refreshCloudStatus();
    expect(cloud.useCloudSession.getState().conflict).toBe(false);
    mocks.put.mockResolvedValueOnce({ data: saved });
    await cloud.saveCloudBackup('{"newDraftIgnoredUntilPendingConfirmed":true}');
    expect(mocks.put.mock.calls[1][1]).toEqual(sent);
  });

  it('requests Google OAuth scope and account selector prompt when signing in with Google', async () => {
    mocks.getUser.mockResolvedValue(null);
    const googleUser = {
      userId: 'google-account-1',
      email: 'instructor@gmail.com',
      name: '김필라',
      picture: 'https://lh3.googleusercontent.com/a/instructor-avatar',
      scope: 'openid email profile',
    };
    mocks.signIn.mockImplementationOnce(async () => {
      mocks.getUser.mockResolvedValue(googleUser);
    });
    const cloud = await import('./cloudSync');
    await cloud.bootstrapCloudSession();
    expect(cloud.useCloudSession.getState().phase).toBe('signed-out');

    await cloud.signInWithGoogle();
    expect(mocks.signIn).toHaveBeenCalledWith({
      provider: 'google',
      scope: 'openid email profile',
      prompt: 'select_account',
    });
    expect(cloud.useCloudSession.getState()).toMatchObject({
      phase: 'signed-in',
      user: googleUser,
      backup: emptyStatus,
    });
  });

  it('validates Google avatar URLs so only HTTPS picture URLs are accepted', async () => {
    const cloud = await import('./cloudSync');
    expect(cloud.safePictureUrl('https://lh3.googleusercontent.com/a/photo')).toBe(
      'https://lh3.googleusercontent.com/a/photo',
    );
    expect(cloud.safePictureUrl('http://insecure.example.test/photo.png')).toBeNull();
    expect(cloud.safePictureUrl('javascript:alert(1)')).toBeNull();
    expect(cloud.safePictureUrl('')).toBeNull();
    expect(cloud.safePictureUrl(null)).toBeNull();
  });
});
