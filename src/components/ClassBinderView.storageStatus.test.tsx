import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from './ClassBinderView';
import { useCloudSession } from '../lib/cloudSync';
import * as storeModule from '../store/usePilatesStore';

const originalStore = storeModule.usePilatesStore.getState();
const originalCloud = useCloudSession.getState();
const account = { userId: 'synthetic-status-user', email: 'status@example.invalid', scope: 'authenticated' };
const existingBackup = { exists: true, revision: 'synthetic-revision', updatedAt: '2026-11-05T10:00:00Z', bytes: 128 };

beforeEach(async () => {
  localStorage.clear();
  storeModule.usePilatesStore.setState({
    ...originalStore, savedSequences: [], historyLogs: [], conditionTemplates: [],
    classGroups: [], activeSteps: [], persistenceError: null,
  }, true);
  useCloudSession.setState({ ...originalCloud, phase: 'signed-out', user: null, backup: null }, true);
  await Promise.resolve();
  vi.spyOn(storeModule, 'getRecoveryStorageStatus').mockReturnValue({ ok: true, fingerprint: 'synthetic' });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  storeModule.usePilatesStore.setState(originalStore, true);
  useCloudSession.setState(originalCloud, true);
  localStorage.clear();
});

describe.each(['saved', 'history'] as const)('%s storage and account status wording', (view) => {
  const bannerName = view === 'saved' ? '계획 및 템플릿 구분 안내' : '진행 완료 이력 스냅샷 보존 안내';
  const cases = [
    { label: 'checking identity', phase: 'checking', user: null, backup: null, expected: '계정 확인 중 · 기기 자료 사용 중' },
    { label: 'signed out', phase: 'signed-out', user: null, backup: null, expected: '로그아웃 상태 · 기기 자료 사용 중' },
    { label: 'account unavailable', phase: 'unavailable', user: null, backup: null, expected: '계정 백업 미연결' },
    { label: 'signed in without a backup connection', phase: 'signed-in', user: account, backup: null, expected: '계정 연결됨 (status@example.invalid · 계정 백업 미연결)' },
    { label: 'signed in with no existing backup', phase: 'signed-in', user: account, backup: { ...existingBackup, exists: false }, expected: '계정 연결됨 (status@example.invalid · 계정 백업 미연결)' },
    { label: 'signed in with existing backup', phase: 'signed-in', user: account, backup: existingBackup, expected: '계정 연결됨 (status@example.invalid · 백업 있음)' },
    { label: 'signed in without an email', phase: 'signed-in', user: { userId: 'synthetic-no-email', scope: 'authenticated' }, backup: null, expected: '계정 연결됨 (강사 계정 · 계정 백업 미연결)' },
  ] as const;

  it.each(cases)('describes $label without promising saved or synchronized data', ({ phase, user, backup, expected }) => {
    useCloudSession.setState({ phase, user, backup, pendingSave: true });
    const before = storeModule.usePilatesStore.getState();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    render(<ClassBinderView view={view} onOpenLogModal={vi.fn()} />);
    const banner = screen.getByLabelText(bannerName);
    expect(banner).toHaveTextContent('이 기기 저장 사용 중');
    expect(banner).toHaveTextContent(expected);
    expect(banner).not.toHaveTextContent(/P[13]|저장 완료|저장 성공|동기화 완료|동기화 성공|저장 보장/);
    expect(banner.querySelector('[role="alert"]')).toBeNull();
    if (!backup?.exists) expect(banner).not.toHaveTextContent('백업 있음');
    expect(storeModule.usePilatesStore.getState()).toBe(before);
    expect(writes).not.toHaveBeenCalled();
  });

  it('announces the persistence error even while an account backup exists', async () => {
    storeModule.usePilatesStore.setState({ persistenceError: '합성 저장 실패: 공간 부족' });
    useCloudSession.setState({ phase: 'signed-in', user: account, backup: existingBackup });
    render(<ClassBinderView view={view} onOpenLogModal={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('기기 저장 확인 필요: 합성 저장 실패: 공간 부족');
    expect(alert).toHaveTextContent('백업 있음');
    expect(alert).not.toHaveTextContent('이 기기 저장 사용 중');
    // Flush the store persistence observer before ending the simulated error case.
    await act(async () => { await Promise.resolve(); });
  });

  it('announces an unreadable storage status without claiming a successful save', () => {
    vi.mocked(storeModule.getRecoveryStorageStatus).mockReturnValue({
      ok: false, code: 'storage_unavailable', message: '합성 저장 자료를 읽을 수 없습니다.',
    });
    render(<ClassBinderView view={view} onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('기기 저장 확인 필요: 합성 저장 자료를 읽을 수 없습니다.');
    expect(screen.getByLabelText(bannerName)).not.toHaveTextContent('이 기기 저장 사용 중');
  });
});
