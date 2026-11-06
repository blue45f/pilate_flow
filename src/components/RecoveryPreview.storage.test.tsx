import { Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryPreview } from './RecoveryPreview';
import { getRecoveryStorageStatus, usePilatesStore } from '../store/usePilatesStore';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { syntheticPlanningExercise } from '../test/planningFixtures';

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const incoming = { ...exercise, id: 'qa-v6-ui-file' };
const other = { ...exercise, id: 'qa-v6-ui-other-tab' };
const raw = JSON.stringify({
  format: 'pilates-flow-atelier',
  version: 3,
  exportedAt: '2026-11-05T01:00:00.000Z',
  data: { exercises: [incoming], savedSequences: [], classGroups: [], historyLogs: [] },
});
function choose() {
  const file = new File([raw], 'synthetic.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue(raw) });
  fireEvent.change(screen.getByLabelText('백업 JSON 파일 선택'), { target: { files: [file] } });
}
function writeExternal(
  update: (state: Record<string, unknown>) => void,
  eventKey: string | null = RECOVERY_STORAGE_KEY,
) {
  const value = JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY)!);
  update(value.state);
  const next = JSON.stringify(value);
  localStorage.setItem(RECOVERY_STORAGE_KEY, next);
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: eventKey, newValue: next })));
  return next;
}
beforeEach(async () => {
  usePilatesStore.setState({
    ...original,
    exercises: [exercise],
    savedSequences: [],
    classGroups: [],
    historyLogs: [],
    conditionTemplates: [],
    activeSteps: [],
    draftCriteria: null,
    lastCriteria: null,
    saveFeedback: null,
    persistenceError: null,
  });
  await Promise.resolve();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
});

describe('recovery preview external disk protection', () => {
  it('disables Apply on an external record event without rehydrating, and repeated inspection cannot adopt it', async () => {
    render(<RecoveryPreview />);
    choose();
    const apply = await screen.findByRole('button', { name: '이 내용으로 복원 적용' });
    expect(apply).toBeEnabled();
    const before = usePilatesStore.getState();
    const next = writeExternal((state) => {
      state.exercises = [exercise, other];
    });
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(apply).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('다른 탭 또는 창');
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: '현재 자료로 다시 검토' }));
    expect(apply).toBeDisabled();
    expect(getRecoveryStorageStatus()).toMatchObject({ ok: false, code: 'storage_changed' });
    fireEvent.click(screen.getByRole('button', { name: '복원 취소' }));
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY) === next).toBe(true);
    expect(usePilatesStore.getState()).toBe(before);
    expect(write).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '백업 불러오기' })).toHaveFocus();
  });

  it('blocks an external record event during the first enabled Apply commit before passive effects', async () => {
    const before = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    let dispatched = false;
    let external: string | null = null;
    render(
      <Profiler
        id="recovery-storage-listener-readiness"
        onRender={() => {
          const apply = screen.queryByRole('button', { name: '이 내용으로 복원 적용' });
          if (dispatched || !apply || apply.hasAttribute('disabled')) return;
          // Child layout effects have run; passive effects have not refreshed the listener yet.
          dispatched = true;
          const value = JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY)!);
          value.state.exercises = [exercise, other];
          external = JSON.stringify(value);
          localStorage.setItem(RECOVERY_STORAGE_KEY, external);
          write.mockClear();
          window.dispatchEvent(
            new StorageEvent('storage', { key: RECOVERY_STORAGE_KEY, newValue: external }),
          );
        }}
      >
        <RecoveryPreview />
      </Profiler>,
    );
    choose();
    const apply = await screen.findByRole('button', { name: '이 내용으로 복원 적용' });
    expect(dispatched).toBe(true);
    expect(apply).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('다른 탭 또는 창');
    expect(getRecoveryStorageStatus()).toMatchObject({ ok: false, code: 'storage_changed' });
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY) === external).toBe(true);
    expect(write).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '현재 자료로 다시 검토' }));
    expect(apply).toBeDisabled();
    expect(getRecoveryStorageStatus()).toMatchObject({ ok: false, code: 'storage_changed' });
    fireEvent.click(screen.getByRole('button', { name: '복원 취소' }));
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY) === external).toBe(true);
    expect(usePilatesStore.getState()).toBe(before);
    expect(write).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '백업 불러오기' })).toHaveFocus();
  });

  it('checks a file against the disk before showing an enabled Apply even when no storage event arrived', async () => {
    const next = writeExternal((state) => {
      state.exercises = [exercise, other];
    });
    const before = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    render(<RecoveryPreview />);
    choose();
    expect(await screen.findByRole('button', { name: '이 내용으로 복원 적용' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('다른 탭 또는 창');
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY) === next).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it('leaves display-only external events harmless and ignores unrelated keys', async () => {
    render(<RecoveryPreview />);
    choose();
    const apply = await screen.findByRole('button', { name: '이 내용으로 복원 적용' });
    writeExternal((state) => {
      state.activeTab = 'history';
      state.themeMode = 'dark';
    });
    expect(apply).toBeEnabled();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated-key' })));
    expect(apply).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(apply);
    expect(usePilatesStore.getState().exercises.some((item) => item.id === incoming.id)).toBe(true);
  });

  it('rechecks on click without an event, then keeps RAM/disk exact and warns locally', async () => {
    render(<RecoveryPreview />);
    choose();
    const apply = await screen.findByRole('button', { name: '이 내용으로 복원 적용' });
    const external = JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY)!);
    external.state.exercises.push(other);
    const next = JSON.stringify(external);
    localStorage.setItem(RECOVERY_STORAGE_KEY, next);
    const before = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    fireEvent.click(apply);
    expect(apply).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('다른 탭 또는 창');
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY) === next).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it('treats a storage clear event as a change without writing the missing key back', async () => {
    render(<RecoveryPreview />);
    choose();
    const apply = await screen.findByRole('button', { name: '이 내용으로 복원 적용' });
    const before = usePilatesStore.getState();
    localStorage.removeItem(RECOVERY_STORAGE_KEY);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
    expect(apply).toBeDisabled();
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBeNull();
    expect(write).not.toHaveBeenCalled();
  });
});
