import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackupService, BackupError } from '../../backend/backupService';
import type { BackupRecord, BackupRepository } from '../../backend/backupService';
import { syntheticPlanningExercise } from '../test/planningFixtures';

// Keep React's hook dispatcher shared with the renderer while reloading the real cloud module.
vi.mock('react', async (original) => original());
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

const actorA = { userId: 'qa-cleanup-a', email: 'qa-a@example.test', scope: 'openid email' };
const actorB = { ...actorA, userId: 'qa-cleanup-b', email: 'qa-b@example.test' };
const firstRevision = '10000000-0000-4000-8000-000000000001';
const deletedRevision = '10000000-0000-4000-8000-000000000002';
const replacementRevision = '10000000-0000-4000-8000-000000000003';
const storageKey = 'pilates-flow-atelier-storage-v3';
const optionalAction = '이전 백업 파일 삭제 다시 확인';
const cleanupConfirm = '이전 백업 파일 삭제 확인';
const cleanupFailure = '합성 QA: 백업 접근은 해제했지만 파일 삭제 결과를 확인하지 못했습니다.';
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const raw = JSON.stringify({
  format: 'pilates-flow-atelier',
  version: 3,
  exportedAt: '2026-11-05T01:00:00.000Z',
  data: { exercises: [exercise], savedSequences: [], classGroups: [], historyLogs: [] },
});

function memoryBackup() {
  const records = new Map<string, BackupRecord>();
  const files = new Map<string, string>();
  const repository = {
    get: vi.fn(async (owner: string) => records.get(owner) ?? null),
    create: vi.fn(async (owner: string, record: BackupRecord) => {
      if (records.has(owner)) return false;
      records.set(owner, { ...record });
      return true;
    }),
    replace: vi.fn(async (owner: string, previous: string, record: BackupRecord) => {
      if (records.get(owner)?.revision !== previous) return false;
      records.set(owner, { ...record });
      return true;
    }),
    write: vi.fn(async (path: string, value: string) => {
      files.set(path, value);
      return true;
    }),
    read: vi.fn(async (path: string) => files.get(path) ?? null),
    removeFile: vi.fn(async (path: string) => {
      files.delete(path);
      return true;
    }),
  } satisfies BackupRepository;
  const service = createBackupService(repository);
  mocks.get.mockImplementation(async (url, config) => {
    expect(url).toBe('/api/studio/backup/status');
    return { data: await service.getStatus(config.params.expectedUserId) };
  });
  mocks.remove.mockImplementation(async (url, config) => {
    expect(url).toBe('/api/studio/backup');
    try {
      return { data: await service.remove(config.data.expectedUserId, config.data) };
    } catch (cause) {
      if (!(cause instanceof BackupError)) throw cause;
      throw { response: { data: { error: cause.code, message: cleanupFailure } } };
    }
  });
  return { service, repository, files };
}

async function loadPanel() {
  const cloud = await import('../lib/cloudSync');
  const { CloudSyncPanel } = await import('./CloudSyncPanel');
  const { usePilatesStore } = await import('../store/usePilatesStore');
  return { cloud, CloudSyncPanel, store: usePilatesStore };
}

async function mountPanel() {
  const loaded = await loadPanel();
  const view = render(<loaded.CloudSyncPanel />);
  await screen.findByText(actorA.email);
  await waitFor(() => expect(loaded.cloud.useCloudSession.getState().backup).not.toBeNull());
  return { ...loaded, ...view };
}

async function seedTombstone(pending: boolean) {
  const fixture = memoryBackup();
  await fixture.service.save(actorA.userId, { requestId: firstRevision, baseRevision: null, raw });
  if (pending) fixture.repository.removeFile.mockResolvedValueOnce(false);
  const removal = fixture.service.remove(actorA.userId, {
    requestId: deletedRevision,
    baseRevision: firstRevision,
  });
  if (pending) await expect(removal).rejects.toMatchObject({ code: 'delete_cleanup_pending' });
  else await removal;
  return fixture;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  mocks.getUser.mockResolvedValue(actorA);
  mocks.signOut.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('explicit cleanup checks in the account backup panel (synthetic actors only)', () => {
  it('reloads a failed deletion and cleans its private file only after a fresh explicit confirmation', async () => {
    const fixture = memoryBackup();
    await fixture.service.save(actorA.userId, {
      requestId: firstRevision,
      baseRevision: null,
      raw,
    });
    const initial = await mountPanel();
    const localExercises = [...initial.store.getState().exercises, exercise];
    initial.store.setState({
      exercises: localExercises,
      savedSequences: [],
      classGroups: [],
      historyLogs: [],
      activeSteps: [],
    });
    const localRecords = localStorage.getItem(storageKey);
    fixture.repository.removeFile.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '서버 백업 삭제' }));
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '서버 사본 삭제 확인' }));
    await screen.findByText(cleanupFailure);
    expect(initial.cloud.useCloudSession.getState().pendingDelete).toBe(true);
    const originalRequest = mocks.remove.mock.calls[0][1].data;
    expect(fixture.files.size).toBe(1);
    await expect(fixture.service.read(actorA.userId)).rejects.toMatchObject({
      code: 'backup_missing',
      status: 404,
    });

    initial.unmount();
    vi.resetModules();
    const reloaded = await mountPanel();
    const reloadedLocalState = reloaded.store.getState();
    expect(reloaded.cloud.useCloudSession.getState()).toMatchObject({
      pendingDelete: false,
      backup: { exists: false, revision: originalRequest.requestId },
    });
    await act(() => reloaded.cloud.refreshCloudStatus());
    expect(fixture.files.size).toBe(1);
    expect(fixture.repository.removeFile).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '서버 자료 합치기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: optionalAction }));
    expect(screen.getByRole('group', { name: '서버 백업 삭제 확인' })).toBeInTheDocument();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: cleanupConfirm }));
    await screen.findByText('이전 백업 파일 삭제를 확인했습니다. 이 기기의 자료는 유지됩니다.');
    expect(mocks.remove).toHaveBeenCalledTimes(2);
    expect(mocks.remove.mock.calls[1][1]).toEqual({
      data: {
        requestId: expect.any(String),
        baseRevision: originalRequest.requestId,
        expectedUserId: actorA.userId,
      },
    });
    expect(mocks.remove.mock.calls[1][1].data.requestId).not.toBe(originalRequest.requestId);
    expect(fixture.files.size).toBe(0);
    expect(reloaded.cloud.useCloudSession.getState().pendingDelete).toBe(false);
    expect(localStorage.getItem(storageKey)).toBe(localRecords);
    expect(reloaded.store.getState()).toBe(reloadedLocalState);
    expect(reloaded.store.getState().exercises).toEqual(localExercises);
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('offers no cleanup action for an account without any backup revision', async () => {
    const fixture = memoryBackup();
    await mountPanel();
    expect(screen.queryByRole('button', { name: optionalAction })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '서버 백업 삭제' })).not.toBeInTheDocument();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(fixture.repository.removeFile).not.toHaveBeenCalled();
  });

  it('offers an optional recheck after completed deletion without claiming cleanup is pending', async () => {
    const fixture = await seedTombstone(false);
    const { cloud } = await mountPanel();
    expect(cloud.useCloudSession.getState().pendingDelete).toBe(false);
    expect(screen.getByRole('button', { name: optionalAction })).toBeInTheDocument();
    expect(screen.getByText(/이미 삭제가 끝난 경우에도 이 항목이 표시됩니다/)).toBeInTheDocument();
    expect(screen.queryByText(/파일 삭제 결과를 확인하지 못했습니다/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: optionalAction }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(fixture.repository.removeFile).toHaveBeenCalledTimes(1);
  });

  it('preserves a failed explicit retry and confirms the same request on the next click', async () => {
    const fixture = await seedTombstone(true);
    const { cloud, store } = await mountPanel();
    const localState = store.getState();
    fixture.repository.removeFile.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: optionalAction }));
    fireEvent.click(screen.getByRole('button', { name: cleanupConfirm }));
    await screen.findByText(cleanupFailure);
    expect(cloud.useCloudSession.getState().pendingDelete).toBe(true);
    expect(fixture.files.size).toBe(1);
    const retryRequest = mocks.remove.mock.calls[0][1];
    expect(retryRequest.data.baseRevision).toBe(deletedRevision);
    fireEvent.click(screen.getByRole('button', { name: '같은 삭제 요청 다시 확인' }));
    await waitFor(() => expect(cloud.useCloudSession.getState().pendingDelete).toBe(false));
    expect(mocks.remove.mock.calls[1][1]).toEqual(retryRequest);
    expect(fixture.files.size).toBe(0);
    expect(store.getState()).toBe(localState);
  });

  it('requires another confirmation after status refresh discovers a different revision', async () => {
    const fixture = await seedTombstone(false);
    await mountPanel();
    fireEvent.click(screen.getByRole('button', { name: optionalAction }));
    expect(screen.getByRole('button', { name: cleanupConfirm })).toBeInTheDocument();
    await fixture.service.save(actorA.userId, {
      requestId: replacementRevision,
      baseRevision: deletedRevision,
      raw,
    });
    fireEvent.click(screen.getByRole('button', { name: '상태 확인' }));
    await screen.findByText('서버 백업 상태를 확인했습니다.');
    expect(screen.queryByRole('group', { name: '서버 백업 삭제 확인' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '서버 백업 삭제' })).toBeInTheDocument();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(fixture.files.size).toBe(1);
  });

  it('hides the previous account confirmation and blocks deletion when identity changes before confirming', async () => {
    await seedTombstone(true);
    const { cloud } = await mountPanel();
    fireEvent.click(screen.getByRole('button', { name: optionalAction }));
    mocks.getUser.mockResolvedValue(actorB);
    fireEvent.click(screen.getByRole('button', { name: cleanupConfirm }));
    await screen.findByRole('button', { name: '서버 연결 다시 확인' });
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: '서버 백업 삭제 확인' })).not.toBeInTheDocument();
    await act(() => cloud.bootstrapCloudSession(true));
    expect(screen.getByText(actorB.email)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: optionalAction })).not.toBeInTheDocument();
    expect(screen.queryByText(/계정이 변경되었거나/)).not.toBeInTheDocument();
  });

  it('does not inherit confirmation when another account has the same tombstone revision', async () => {
    const fixture = await seedTombstone(true);
    await fixture.service.save(actorB.userId, {
      requestId: firstRevision,
      baseRevision: null,
      raw,
    });
    await fixture.service.remove(actorB.userId, {
      requestId: deletedRevision,
      baseRevision: firstRevision,
    });
    const { cloud } = await mountPanel();
    fireEvent.click(screen.getByRole('button', { name: optionalAction }));
    expect(screen.getByRole('button', { name: cleanupConfirm })).toBeInTheDocument();
    mocks.getUser.mockResolvedValue(actorB);
    await act(() => cloud.bootstrapCloudSession(true));
    expect(screen.getByText(actorB.email)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '서버 백업 삭제 확인' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: optionalAction })).toBeInTheDocument();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(fixture.files.size).toBe(1);
  });

  it('hides an earlier account cleanup error after reconnecting as another account', async () => {
    const fixture = await seedTombstone(true);
    const { cloud } = await mountPanel();
    fixture.repository.removeFile.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: optionalAction }));
    fireEvent.click(screen.getByRole('button', { name: cleanupConfirm }));
    await screen.findByText(cleanupFailure);
    mocks.getUser.mockResolvedValue(actorB);
    fireEvent.click(screen.getByRole('button', { name: '상태 확인' }));
    await screen.findByRole('button', { name: '서버 연결 다시 확인' });
    await act(() => cloud.bootstrapCloudSession(true));
    expect(screen.getByText(actorB.email)).toBeInTheDocument();
    expect(screen.queryByText(cleanupFailure)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: optionalAction })).not.toBeInTheDocument();
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(fixture.files.size).toBe(1);
  });
});
