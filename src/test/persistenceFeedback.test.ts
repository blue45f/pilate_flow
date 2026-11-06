import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const productionIds = new Set(production.map((exercise) => exercise.id));
const exercise = syntheticPlanningExercise('mat', 'warmup');
const steps: SequenceStep[] = [
  {
    stepId: 'v8-persistence-synthetic-step',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: 'warmup',
    durationMin: 10,
    selectedLayer: 'standard',
    locked: true,
  },
];
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  targetMinutes: 10,
  restMinutes: 0,
  excludeDaysWindow: 0,
  defaultLayer: 'standard',
  targetGroupId: INITIAL_CLASS_GROUPS[0].id,
};
const settleStorage = async () => {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
};
const failWrites = () =>
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Synthetic repeated quota failure', 'QuotaExceededError');
  });

describe('repeated persistence failures keep feedback honest', () => {
  beforeEach(async () => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        activeSequenceId: 'v8-synthetic-persistence-draft',
        activeTitle: 'V8 합성 저장 오류 검증 · 실제 수업 아님',
        activeSubtitle: '',
        activeSteps: structuredClone(steps),
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 10,
        activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
        exercises: [...INITIAL_EXERCISES, exercise],
        classGroups: INITIAL_CLASS_GROUPS,
        savedSequences: [],
        historyLogs: [],
        draftCriteria: structuredClone(criteria),
        lastCriteria: structuredClone(criteria),
        persistenceError: null,
        saveFeedback: null,
        generationError: null,
        undoStack: [],
      },
      true,
    );
    await settleStorage();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    expect(INITIAL_EXERCISES).toEqual(production);
    expect(
      usePilatesStore.getState().exercises.filter((item) => productionIds.has(item.id)),
    ).toEqual(production);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    usePilatesStore.setState(original, true);
    await settleStorage();
    localStorage.clear();
  });

  it('clears success after first, second and third failed saves without discarding RAM plans', async () => {
    const diskBefore = localStorage.getItem(RECOVERY_STORAGE_KEY);
    const writer = failWrites();
    let firstError: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(() => usePilatesStore.getState().saveCurrentSequenceToBinder(true)).not.toThrow();
      await settleStorage();
      const current = usePilatesStore.getState();
      if (attempt === 1) firstError = current.persistenceError;
      expect(firstError).toEqual(expect.any(String));
      expect(current.persistenceError).toBe(firstError);
      expect(
        current.saveFeedback,
        `failed save ${attempt} cannot claim browser success`,
      ).toBeNull();
      expect(current.savedSequences).toHaveLength(attempt);
      expect(current.activeSteps).toEqual(steps);
      expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(diskBefore);
      expect(JSON.parse(current.exportBackup()).data.savedSequences).toHaveLength(attempt);
    }
    const settledWrites = writer.mock.calls.length;
    expect(settledWrites).toBeLessThanOrEqual(9);
    await settleStorage();
    expect(writer.mock.calls.length).toBe(settledWrites);
  });

  it('keeps failed session records in RAM and backup, then recovers without submitting duplicates', async () => {
    const diskBefore = localStorage.getItem(RECOVERY_STORAGE_KEY);
    const writer = failWrites();
    usePilatesStore.getState().saveCurrentSequenceToBinder();
    await settleStorage();
    const error = usePilatesStore.getState().persistenceError;
    expect(error).toEqual(expect.any(String));
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const current = usePilatesStore.getState();
      current.logClassSession({
        sequenceId: current.activeSequenceId,
        groupId: INITIAL_CLASS_GROUPS[0].id,
        taughtAt: `2026-11-0${attempt}T12:00:00.000Z`,
        rating: 3,
        intensity: 'moderate',
        instructorReflection: `V8 합성 저장 오류 기록 ${attempt} · 실제 수업 아님`,
        actualDurationSec: 7,
        actualRestDurationSec: 0,
        stepsSnapshot: structuredClone(steps),
      });
      await settleStorage();
      const after = usePilatesStore.getState();
      expect(after.historyLogs).toHaveLength(attempt);
      expect(after.persistenceError).toBe(error);
      expect(after.saveFeedback, 'RAM append is not browser persistence success').toBeNull();
      expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(diskBefore);
      const backup = JSON.parse(after.exportBackup());
      expect(backup.data.historyLogs).toEqual(after.historyLogs);
      expect(backup.data.savedSequences[0].taughtCount).toBe(attempt);
    }
    const logsBeforeRecovery = structuredClone(usePilatesStore.getState().historyLogs);
    writer.mockRestore();
    usePilatesStore.getState().saveCurrentSequenceToBinder();
    await settleStorage();
    const recovered = usePilatesStore.getState();
    expect(recovered.persistenceError).toBeNull();
    expect(recovered.saveFeedback).toBe('이 브라우저에 수업을 저장했습니다.');
    expect(recovered.historyLogs).toEqual(logsBeforeRecovery);
    expect(recovered.savedSequences).toHaveLength(1);
    expect(recovered.savedSequences[0].taughtCount).toBe(2);
    expect(JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY)!).state.historyLogs).toEqual(
      logsBeforeRecovery,
    );
  });

  it('does not echo writes when the same error is already shown and feedback is empty', async () => {
    const diskBefore = localStorage.getItem(RECOVERY_STORAGE_KEY);
    const writer = failWrites();
    usePilatesStore.getState().saveCurrentSequenceToBinder();
    await settleStorage();
    const error = usePilatesStore.getState().persistenceError;
    expect(error).toEqual(expect.any(String));
    expect(usePilatesStore.getState().saveFeedback).toBeNull();
    const beforeEditWrites = writer.mock.calls.length;
    usePilatesStore
      .getState()
      .setActiveSequenceMeta({ subtitle: 'V8 합성 실패 중에도 보존할 메모' });
    await settleStorage();
    const after = usePilatesStore.getState();
    expect(after.persistenceError).toBe(error);
    expect(after.saveFeedback).toBeNull();
    expect(after.activeSubtitle).toBe('V8 합성 실패 중에도 보존할 메모');
    expect(after.activeSteps).toEqual(steps);
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(diskBefore);
    expect(writer.mock.calls.length - beforeEditWrites).toBeLessThanOrEqual(2);
    const settledWrites = writer.mock.calls.length;
    await settleStorage();
    expect(writer.mock.calls.length).toBe(settledWrites);
  });
});
