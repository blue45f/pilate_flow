import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecoveryStorageStatus, usePilatesStore } from '../store/usePilatesStore';
import { inspectBackupRecovery } from '../utils/backupRecoveryInspection';
import { syntheticPlanningExercise } from './planningFixtures';

const key = 'pilates-flow-atelier-storage-v3';
const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const externalExercise = { ...exercise, id: 'qa-v6-other-tab-only' };
const incomingExercise = { ...exercise, id: 'qa-v6-file-only' };
function backup(exercises: unknown[] = []) {
  return JSON.stringify({
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: '2026-11-05T01:00:00.000Z',
    data: { exercises, savedSequences: [], classGroups: [], historyLogs: [] },
  });
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
    generationError: null,
    persistenceError: null,
    undoStack: [],
  });
  await Promise.resolve();
});
afterEach(() => {
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
});
describe('recovery must preserve newer other-tab records', () => {
  it.each([
    ['invalid', '{'],
    ['unchanged', backup()],
    ['changed', backup([incomingExercise])],
  ])('%s restore leaves both RAM and external disk exact and performs no writes', (_name, raw) => {
    const disk = JSON.parse(localStorage.getItem(key)!);
    disk.state.exercises.push(externalExercise);
    const externalRaw = JSON.stringify(disk);
    localStorage.setItem(key, externalRaw); // A different tab; this store never observed it.
    const before = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const result = before.restoreBackup(raw);
    // Check the data-loss outcome before feedback/reference assertions.
    expect(localStorage.getItem(key) === externalRaw).toBe(true);
    expect(usePilatesStore.getState() === before).toBe(true);
    expect(write).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it('returns invalid/no-op feedback without any RAM change or persistence even without an external edit', async () => {
    const before = usePilatesStore.getState();
    const disk = localStorage.getItem(key);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(before.restoreBackup('{').success).toBe(false);
    expect(before.restoreBackup(backup())).toMatchObject({
      success: true,
      unchanged: true,
      added: 0,
    });
    await Promise.resolve();
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem(key) === disk).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it('accepts a fresh same-tab preview and preserves the working draft, then repeats without writes', () => {
    usePilatesStore.setState({ activeTitle: 'Synthetic local edit', activeSteps: [] });
    const disk = getRecoveryStorageStatus();
    const file = backup([incomingExercise]);
    const plan = inspectBackupRecovery(file, usePilatesStore.getState());
    expect(disk.ok && plan.success).toBe(true);
    if (!disk.ok || !plan.success) return;
    const before = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const options = {
      expectedStateFingerprint: plan.stateFingerprint,
      expectedStorageFingerprint: disk.fingerprint,
    };
    expect(before.restoreBackup(file, options)).toMatchObject({
      success: true,
      added: 1,
      unchanged: false,
    });
    expect(write).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().activeTitle).toBe(before.activeTitle);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(
      usePilatesStore.getState().exercises.some((item) => item.id === incomingExercise.id),
    ).toBe(true);
    const saved = localStorage.getItem(key);
    write.mockClear();
    const next = usePilatesStore.getState();
    expect(next.restoreBackup(file)).toMatchObject({ success: true, unchanged: true });
    expect(usePilatesStore.getState()).toBe(next);
    expect(localStorage.getItem(key) === saved).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects stale preview tokens after a valid same-tab domain edit', () => {
    const disk = getRecoveryStorageStatus();
    const plan = inspectBackupRecovery(backup([incomingExercise]), usePilatesStore.getState());
    expect(disk.ok && plan.success).toBe(true);
    if (!disk.ok || !plan.success) return;
    usePilatesStore.setState({ activeTitle: 'Newer same-tab draft' });
    const before = usePilatesStore.getState();
    const raw = localStorage.getItem(key);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(
      before.restoreBackup(backup([incomingExercise]), {
        expectedStorageFingerprint: disk.fingerprint,
      }).success,
    ).toBe(false);
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem(key) === raw).toBe(true);
    expect(write).not.toHaveBeenCalled();
  });

  it('ignores external display-only navigation/theme while rejecting unknown field changes', () => {
    const before = usePilatesStore.getState();
    const disk = JSON.parse(localStorage.getItem(key)!);
    disk.state.activeTab = 'history';
    disk.state.themeMode = 'dark';
    const harmless = JSON.stringify(disk);
    localStorage.setItem(key, harmless);
    expect(getRecoveryStorageStatus().ok).toBe(true);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(before.restoreBackup(backup())).toMatchObject({ success: true, unchanged: true });
    expect(write).not.toHaveBeenCalled();
    disk.state.futureUnknownRecord = { marker: 'synthetic unknown extension' };
    const unknown = JSON.stringify(disk);
    write.mockRestore();
    localStorage.setItem(key, unknown);
    const finalWrite = vi.spyOn(Storage.prototype, 'setItem');
    expect(before.restoreBackup(backup([incomingExercise])).success).toBe(false);
    expect(usePilatesStore.getState()).toBe(before);
    expect(localStorage.getItem(key) === unknown).toBe(true);
    expect(finalWrite).not.toHaveBeenCalled();
  });

  it.each(['{', JSON.stringify({ version: 99, state: {} }), null])(
    'preserves malformed/future/deleted disk exact without falling back to an empty file',
    (value) => {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      const before = usePilatesStore.getState();
      const write = vi.spyOn(Storage.prototype, 'setItem');
      expect(before.restoreBackup(backup([incomingExercise])).success).toBe(false);
      expect(usePilatesStore.getState()).toBe(before);
      expect(localStorage.getItem(key) === value).toBe(true);
      expect(write).not.toHaveBeenCalled();
    },
  );

  it('does not route a recovery read denial through persistent feedback/storageResult', async () => {
    const before = usePilatesStore.getState();
    const disk = localStorage.getItem(key);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Synthetic denied', 'SecurityError');
    });
    expect(before.restoreBackup(backup([incomingExercise]))).toMatchObject({ success: false });
    expect(getRecoveryStorageStatus()).toMatchObject({ ok: false, code: 'storage_unavailable' });
    await Promise.resolve();
    expect(usePilatesStore.getState()).toBe(before);
    expect(write).not.toHaveBeenCalled();
    read.mockRestore();
    expect(localStorage.getItem(key) === disk).toBe(true);
  });

  it('detects a change between the first read and final changed commit', () => {
    const before = usePilatesStore.getState();
    const current = localStorage.getItem(key)!;
    const external = JSON.parse(current);
    external.state.exercises.push(externalExercise);
    const externalRaw = JSON.stringify(external);
    const originalRead = Storage.prototype.getItem;
    const originalWrite = Storage.prototype.setItem;
    let checks = 0;
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      name,
    ) {
      if (name === key && ++checks === 2) originalWrite.call(this, key, externalRaw);
      return originalRead.call(this, name);
    });
    expect(before.restoreBackup(backup([incomingExercise])).success).toBe(false);
    expect(checks).toBe(2);
    expect(usePilatesStore.getState()).toBe(before);
    expect(write).not.toHaveBeenCalled();
    read.mockRestore();
    expect(localStorage.getItem(key) === externalRaw).toBe(true);
  });
});
