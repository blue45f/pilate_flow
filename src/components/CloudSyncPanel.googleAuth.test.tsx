import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBackupService, BackupError } from '../../backend/backupService';
import type { BackupRecord, BackupRepository } from '../../backend/backupService';

// Keep React's hook dispatcher shared with the renderer while reloading modules across simulated refreshes.
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

const googleAccountA = {
  userId: 'google-instructor-a',
  email: 'pila.a@gmail.com',
  name: '김필라 강사',
  picture: 'https://lh3.googleusercontent.com/a/pila-instructor-a',
  scope: 'openid email profile',
};

const googleAccountB = {
  userId: 'google-instructor-b',
  email: 'core.b@gmail.com',
  name: '이코어 강사',
  picture: 'http://insecure.example.test/avatar.png',
  scope: 'openid email profile',
};

function setupMemoryCloudServer() {
  const records = new Map<string, BackupRecord>();
  const files = new Map<string, string>();
  const repository: BackupRepository = {
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
  };
  const service = createBackupService(repository);

  mocks.get.mockImplementation(async (url: string, config?: { params?: { expectedUserId?: string } }) => {
    const owner = config?.params?.expectedUserId ?? '';
    if (url === '/api/studio/backup/status') {
      return { data: await service.getStatus(owner) };
    }
    if (url === '/api/studio/backup') {
      return { data: await service.read(owner) };
    }
    throw new Error(`Unexpected GET ${url}`);
  });

  mocks.put.mockImplementation(
    async (
      url: string,
      body: { requestId: string; baseRevision: string | null; raw: string; expectedUserId: string },
    ) => {
      expect(url).toBe('/api/studio/backup');
      try {
        return {
          data: await service.save(body.expectedUserId, {
            requestId: body.requestId,
            baseRevision: body.baseRevision,
            raw: body.raw,
          }),
        };
      } catch (cause) {
        if (!(cause instanceof BackupError)) throw cause;
        throw { response: { data: { error: cause.code, message: cause.message } } };
      }
    },
  );

  mocks.remove.mockImplementation(
    async (
      url: string,
      config: { data: { requestId: string; baseRevision: string | null; expectedUserId: string } },
    ) => {
      expect(url).toBe('/api/studio/backup');
      return {
        data: await service.remove(config.data.expectedUserId, {
          requestId: config.data.requestId,
          baseRevision: config.data.baseRevision,
        }),
      };
    },
  );

  return { service, records, files };
}

async function loadModules() {
  const cloud = await import('../lib/cloudSync');
  const { CloudSyncPanel } = await import('./CloudSyncPanel');
  const { usePilatesStore } = await import('../store/usePilatesStore');
  return { cloud, CloudSyncPanel, store: usePilatesStore };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear();
  setupMemoryCloudServer();
  mocks.signOut.mockImplementation(async () => {
    mocks.getUser.mockResolvedValue(null);
  });
});

afterEach(cleanup);

describe('Google 로그인·세션·계정별 데이터 분리 검증', () => {
  it('1. 계정 표시: 로그아웃 상태의 Google 로그인 버튼과 로그인 후 이름·이메일·프로필 아바타를 표시한다', async () => {
    mocks.getUser.mockResolvedValue(null);
    mocks.signIn.mockImplementationOnce(async () => {
      mocks.getUser.mockResolvedValue(googleAccountA);
    });

    const { CloudSyncPanel } = await loadModules();
    const { container } = render(<CloudSyncPanel />);

    const googleLoginBtn = await screen.findByRole('button', { name: 'Google 계정으로 로그인' });
    expect(googleLoginBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인하고 백업 연결' })).toBeInTheDocument();

    fireEvent.click(googleLoginBtn);

    expect(await screen.findByText(googleAccountA.name)).toBeInTheDocument();
    expect(screen.getByText(googleAccountA.email)).toBeInTheDocument();
    expect(mocks.signIn).toHaveBeenCalledWith({
      provider: 'google',
      scope: 'openid email profile',
      prompt: 'select_account',
    });

    const avatarImg = container.querySelector('img.cloud-avatar');
    expect(avatarImg).not.toBeNull();
    expect(avatarImg?.getAttribute('src')).toBe(googleAccountA.picture);
    expect(screen.getByRole('button', { name: '다른 Google 계정으로 전환' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
  });

  it('2. 새로고침 유지: Google 로그인 후 시퀀스와 서버 백업을 저장하고 새로고침해도 계정과 데이터가 유지된다', async () => {
    mocks.getUser.mockResolvedValue(googleAccountA);
    const initial = await loadModules();
    const view = render(<initial.CloudSyncPanel />);

    await screen.findByText(googleAccountA.email);
    await waitFor(() => expect(initial.cloud.useCloudSession.getState().backup).not.toBeNull());

    act(() => {
      initial.store.getState().setActiveSequenceMeta({
        title: 'A 강사 전용 리포머 시퀀스',
        subtitle: '새로고침 유지 검증용',
      });
      initial.store.getState().saveCurrentSequenceToBinder(true);
    });

    expect(
      initial.store.getState().savedSequences.some((seq) => seq.title === 'A 강사 전용 리포머 시퀀스'),
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '서버에 저장' }));
    await screen.findByText(/서버에 백업을 저장했습니다/);

    // Simulate browser page refresh by unmounting, resetting modules, and remounting
    view.unmount();
    vi.resetModules();

    const reloaded = await loadModules();
    render(<reloaded.CloudSyncPanel />);

    expect(await screen.findByText(googleAccountA.name)).toBeInTheDocument();
    expect(screen.getByText(googleAccountA.email)).toBeInTheDocument();
    await waitFor(() =>
      expect(reloaded.cloud.useCloudSession.getState().backup?.exists).toBe(true),
    );
    expect(screen.getByText(/마지막 서버 저장:/)).toBeInTheDocument();

    expect(reloaded.store.getState().activeTitle).toBe('A 강사 전용 리포머 시퀀스');
    expect(
      reloaded.store
        .getState()
        .savedSequences.some((seq) => seq.title === 'A 강사 전용 리포머 시퀀스'),
    ).toBe(true);
  });

  it('3. 로그아웃/재진입: 로그아웃 시 개인 시퀀스를 노출하지 않고 같은 Google 계정 재진입 시 복원한다', async () => {
    mocks.getUser.mockResolvedValue(googleAccountA);
    const { CloudSyncPanel, store } = await loadModules();
    render(<CloudSyncPanel />);

    await screen.findByText(googleAccountA.email);

    act(() => {
      store.getState().setActiveSequenceMeta({
        title: 'A 계정 비공개 수업안',
      });
      store.getState().saveCurrentSequenceToBinder(true);
    });
    expect(
      store.getState().savedSequences.some((seq) => seq.title === 'A 계정 비공개 수업안'),
    ).toBe(true);

    // Click logout
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('button', { name: 'Google 계정으로 로그인' })).toBeInTheDocument();
    expect(mocks.signOut).toHaveBeenCalledOnce();

    // Signed-out state must not expose Account A's private sequence
    expect(
      store.getState().savedSequences.some((seq) => seq.title === 'A 계정 비공개 수업안'),
    ).toBe(false);

    // Re-enter as Account A via Google login
    mocks.signIn.mockImplementationOnce(async () => {
      mocks.getUser.mockResolvedValue(googleAccountA);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Google 계정으로 로그인' }));

    expect(await screen.findByText(googleAccountA.email)).toBeInTheDocument();
    expect(
      store.getState().savedSequences.some((seq) => seq.title === 'A 계정 비공개 수업안'),
    ).toBe(true);
    expect(store.getState().activeTitle).toBe('A 계정 비공개 수업안');
  });

  it('4. 계정 전환 & 저장 데이터 분리: 다른 Google 계정으로 전환 시 로컬 작업공간과 서버 백업이 계정별로 완전히 분리된다', async () => {
    mocks.getUser.mockResolvedValue(googleAccountA);
    const { CloudSyncPanel, store, cloud } = await loadModules();
    const { container } = render(<CloudSyncPanel />);

    await screen.findByText(googleAccountA.email);
    await waitFor(() => expect(cloud.useCloudSession.getState().backup).not.toBeNull());

    // Save Account A's studio sequence & upload Account A's server backup
    act(() => {
      store.getState().setActiveSequenceMeta({
        title: '김필라 A 전용 시퀀스',
      });
      store.getState().saveCurrentSequenceToBinder(true);
    });
    fireEvent.click(screen.getByRole('button', { name: '서버에 저장' }));
    await screen.findByText(/서버에 백업을 저장했습니다/);
    expect(cloud.useCloudSession.getState().backup?.exists).toBe(true);

    // Switch to Account B via "다른 Google 계정으로 전환"
    mocks.signIn.mockImplementationOnce(async () => {
      mocks.getUser.mockResolvedValue(googleAccountB);
    });
    fireEvent.click(screen.getByRole('button', { name: '다른 Google 계정으로 전환' }));

    expect(await screen.findByText(googleAccountB.name)).toBeInTheDocument();
    expect(screen.getByText(googleAccountB.email)).toBeInTheDocument();
    expect(screen.queryByText(googleAccountA.email)).not.toBeInTheDocument();
    expect(mocks.signIn).toHaveBeenCalledWith({
      provider: 'google',
      scope: 'openid email profile',
      prompt: 'select_account',
    });

    // Account B has a non-HTTPS avatar URL, so fallback initial is rendered instead of <img>
    expect(container.querySelector('img.cloud-avatar')).toBeNull();
    expect(container.querySelector('.cloud-avatar-fallback')?.textContent).toBe('이');

    // Account B must not see Account A's server backup or local sequence
    await waitFor(() => expect(cloud.useCloudSession.getState().backup?.exists).toBe(false));
    expect(screen.getByText('이 계정에 저장된 서버 백업이 없습니다.')).toBeInTheDocument();
    expect(
      store.getState().savedSequences.some((seq) => seq.title === '김필라 A 전용 시퀀스'),
    ).toBe(false);
    expect(store.getState().activeTitle).not.toBe('김필라 A 전용 시퀀스');

    // Save Account B's own sequence under Account B
    act(() => {
      store.getState().setActiveSequenceMeta({
        title: '이코어 B 전용 시퀀스',
      });
      store.getState().saveCurrentSequenceToBinder(true);
    });
    expect(
      store.getState().savedSequences.some((seq) => seq.title === '이코어 B 전용 시퀀스'),
    ).toBe(true);

    // Switch back to Account A
    mocks.signIn.mockImplementationOnce(async () => {
      mocks.getUser.mockResolvedValue(googleAccountA);
    });
    fireEvent.click(screen.getByRole('button', { name: '다른 Google 계정으로 전환' }));

    expect(await screen.findByText(googleAccountA.name)).toBeInTheDocument();
    expect(screen.getByText(googleAccountA.email)).toBeInTheDocument();
    await waitFor(() => expect(cloud.useCloudSession.getState().backup?.exists).toBe(true));
    expect(screen.getByText(/마지막 서버 저장:/)).toBeInTheDocument();

    // Account A's sequence is intact and Account B's sequence is not mixed in
    expect(
      store.getState().savedSequences.some((seq) => seq.title === '김필라 A 전용 시퀀스'),
    ).toBe(true);
    expect(
      store.getState().savedSequences.some((seq) => seq.title === '이코어 B 전용 시퀀스'),
    ).toBe(false);
    expect(store.getState().activeTitle).toBe('김필라 A 전용 시퀀스');
  });
});
