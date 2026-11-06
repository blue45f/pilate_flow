import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CANONICAL_BLOCKS,
  INITIAL_EXERCISES,
  INITIAL_SAVED_SEQUENCES,
  INITIAL_CLASS_GROUPS,
} from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  ClassHistoryLog,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import {
  fitSequenceDuration,
  generateOptimal50MinSequence,
  getStepTiming,
  optimizeSequenceTransitions,
  regenerateSequence,
  swapDuplicateStepsWithFresh,
} from '../utils/sequenceEngine';
import { exerciseRevision } from '../utils/exerciseReview';

function approved(exercise: PilatesExercise): PilatesExercise {
  // Use the same serializable record that a real persisted review would retain.
  const record = JSON.parse(JSON.stringify(exercise)) as PilatesExercise;
  return {
    ...record,
    review: {
      status: 'approved',
      scope: 'planning-metadata',
      credentialVerified: false,
      reviewerAlias: 'Test reviewer',
      reviewedAt: '2026-11-04T10:00:00.000Z',
      revision: exerciseRevision(record),
    },
  };
}

const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: [],
  excludeDaysWindow: 10,
  targetMinutes: 50,
  defaultLayer: 'standard',
};

// Every block has equivalent alternatives, so tests exercise the constraints
// without relying on the content or popularity of the production catalog.
const exercises: PilatesExercise[] = CANONICAL_BLOCKS.flatMap((block) =>
  ['a', 'b'].flatMap((variant) =>
    (['mat', 'reformer'] as const).map((apparatus) =>
      approved({
        ...INITIAL_EXERCISES[0]!,
        id: `${apparatus}-${block.category}-${variant}`,
        nameKo: `${block.nameKo} ${variant}`,
        nameEn: `Distinct ${block.category} ${variant} ${apparatus} fixture movement`,
        movementFamily: `fixture-${apparatus}-${block.category}-${variant}`,
        apparatus,
        requiredEquipment: undefined,
        blockCategory: block.category,
        level: '1.0' as const,
        props: ['none' as const],
        targetMuscles: ['코어'],
        favoriteTag: 'none' as const,
        springs: apparatus === 'mat' ? 'Bodyweight' : '1R',
        box: 'none' as const,
        bodyPosition: 'supine' as const,
        isUnilateral: false,
        isCustom: true,
      }),
    ),
  ),
);

function historyFor(exerciseIds: string[]): ClassHistoryLog[] {
  return [
    {
      id: 'recent-class',
      sequenceId: 'taught-sequence',
      sequenceTitle: '최근 수업',
      groupId: 'test-group',
      groupName: '수업 반',
      taughtAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      apparatus: 'mat',
      level: '1.0',
      exerciseIds,
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '',
    },
  ];
}

const total = (steps: SequenceStep[]) => steps.reduce((sum, step) => sum + step.durationMin, 0);

describe('sequence timing and generation constraints', () => {
  it('includes both sides, explanation and transition within the stored total', () => {
    const exercise = { ...exercises[0]!, isUnilateral: true };
    const step: SequenceStep = {
      stepId: 'timed',
      order: 1,
      exerciseId: exercise.id,
      blockCategory: 'warmup',
      durationMin: 5,
      selectedLayer: 'standard',
      explanationSec: 30,
      transitionSec: 30,
    };
    expect(getStepTiming(step, exercise)).toEqual({
      totalSec: 300,
      movementSec: 240,
      perSideSec: 120,
      sides: 2,
      explanationSec: 30,
      transitionSec: 30,
    });
    const bilateral = getStepTiming(step, { ...exercise, isUnilateral: false });
    expect(bilateral.sides).toBe(1);
    expect(bilateral.perSideSec).toBe(240);
  });

  it('does not double legacy unilateral duration when timing fields are absent', () => {
    const step: SequenceStep = {
      stepId: 'legacy',
      order: 1,
      exerciseId: exercises[0]!.id,
      blockCategory: 'warmup',
      durationMin: 5,
      selectedLayer: 'standard',
    };
    const timing = getStepTiming(step, { ...exercises[0]!, isUnilateral: true });
    expect(timing.totalSec).toBe(300);
    expect(timing.movementSec + timing.explanationSec + timing.transitionSec).toBe(300);
    expect(timing.perSideSec * timing.sides).toBe(timing.movementSec);
  });

  it.each([10, 15, 30, 50, 60, 73, 120])('fits a %i-minute request exactly', (targetMinutes) => {
    const steps = generateOptimal50MinSequence({ ...criteria, targetMinutes }, exercises, []);
    expect(steps.length).toBeGreaterThan(0);
    expect(total(steps)).toBeCloseTo(targetMinutes, 8);
    expect(steps.every((step) => step.durationMin > 0)).toBe(true);
  });

  it('is deterministic and never substitutes another apparatus or a harder level', () => {
    const harder = exercises.map((exercise) =>
      approved({
        ...exercise,
        id: `advanced-${exercise.id}`,
        level: '2.0' as const,
      }),
    );
    const pool = [...harder, ...exercises];
    const first = generateOptimal50MinSequence(criteria, pool, []);
    const second = generateOptimal50MinSequence(criteria, pool, []);
    expect(second).toEqual(first);
    const byId = new Map(pool.map((exercise) => [exercise.id, exercise]));
    expect(first.every((step) => byId.get(step.exerciseId)?.apparatus === 'mat')).toBe(true);
    expect(first.every((step) => Number(byId.get(step.exerciseId)?.level) <= 1)).toBe(true);
  });

  it('requires every non-none prop to be available and never substitutes unavailable props', () => {
    const unavailable = exercises.map((exercise) =>
      approved({
        ...exercise,
        id: `ball-${exercise.id}`,
        props: ['mini-ball' as const],
      }),
    );
    expect(() => generateOptimal50MinSequence(criteria, unavailable, [])).toThrow();
    const generated = generateOptimal50MinSequence(
      { ...criteria, preferredProps: ['mini-ball'] },
      unavailable,
      [],
    );
    expect(total(generated)).toBeCloseTo(50, 8);
    const bothProps = unavailable.map((exercise) =>
      approved({
        ...exercise,
        props: ['mini-ball' as const, 'magic-circle' as const],
      }),
    );
    expect(() =>
      generateOptimal50MinSequence({ ...criteria, preferredProps: ['mini-ball'] }, bothProps, []),
    ).toThrow();
  });

  it('keeps instructor observations as planning notes without diagnosing or changing eligibility', () => {
    const plain = generateOptimal50MinSequence(criteria, exercises, []);
    const tagged = generateOptimal50MinSequence(
      {
        ...criteria,
        planningGoals: ['pelvic-control', 'trunk-hip-coordination'],
        instructorObservations: ['anterior-pelvic-tilt', 'posterior-pelvic-tilt'],
      },
      exercises,
      [],
    );
    expect(tagged).toEqual(plain);
  });

  it('uses only explicitly owned apparatus for mixed classes', () => {
    const steps = generateOptimal50MinSequence({ ...criteria, apparatus: 'mixed' }, exercises, []);
    expect(steps.every((step) => step.exerciseId.startsWith('mat-'))).toBe(true);
  });

  it.each([
    { ...criteria, apparatus: 'reformer' as const, ownedApparatus: ['mat' as const] },
    { ...criteria, apparatus: 'mixed' as const, ownedApparatus: ['chair' as const] },
    { ...criteria, ownedApparatus: [] },
    { ...criteria, targetMinutes: 9 },
    { ...criteria, targetMinutes: 121 },
  ])('reports impossible criteria instead of silently relaxing them: %j', (request) => {
    expect(() => generateOptimal50MinSequence(request, exercises, [])).toThrow();
  });

  it('does not fall back to harder exercises when the allowed pool is empty', () => {
    const harderOnly = exercises.map((exercise) =>
      approved({ ...exercise, level: '2.0' as const }),
    );
    expect(() => generateOptimal50MinSequence(criteria, harderOnly, [])).toThrow();
  });

  it('prefers fresh equivalent candidates and still allows overlap when all were taught', () => {
    const first = generateOptimal50MinSequence(criteria, exercises, []);
    const recentlyUsed = new Set(first.map((step) => step.exerciseId));
    const next = generateOptimal50MinSequence(criteria, exercises, historyFor([...recentlyUsed]));
    expect(next.filter((step) => recentlyUsed.has(step.exerciseId))).toHaveLength(0);
    const allRecent = generateOptimal50MinSequence(
      criteria,
      exercises,
      historyFor(exercises.map((e) => e.id)),
    );
    expect(total(allRecent)).toBe(50);
  });
});

describe('locked steps and partial regeneration', () => {
  it('preserves locked step contents and untouched sections during main regeneration', () => {
    const original = generateOptimal50MinSequence(criteria, exercises, []);
    const lockedIndex = original.findIndex((step) => step.blockCategory === 'core');
    const steps = original.map((step, index) =>
      index === lockedIndex
        ? { ...step, locked: true, instructorNote: '보존할 큐', customSpringOverride: '수동 설정' }
        : step,
    );
    const before = structuredClone(steps);
    const next = regenerateSequence(
      criteria,
      exercises,
      historyFor(steps.map((s) => s.exerciseId)),
      steps,
      'main',
    );
    expect(total(next)).toBe(50);
    expect(next[lockedIndex]).toEqual(before[lockedIndex]);
    for (const [index, step] of before.entries()) {
      if (step.blockCategory === 'warmup' || step.blockCategory === 'cooldown') {
        expect(next[index]).toEqual(step);
      }
    }
    expect(steps).toEqual(before);
    expect(
      next.some(
        (step, index) =>
          !step.locked &&
          step.blockCategory !== 'warmup' &&
          step.blockCategory !== 'cooldown' &&
          step.exerciseId !== before[index]?.exerciseId,
      ),
    ).toBe(true);
  });

  it('fits the target by changing only unlocked durations and rejects impossible locked totals', () => {
    const original = generateOptimal50MinSequence(criteria, exercises, []);
    const steps = original.map((step, index) => ({ ...step, locked: index === 0 }));
    const locked = structuredClone(steps[0]);
    const fitted = fitSequenceDuration(steps, 60);
    expect(total(fitted)).toBeCloseTo(60, 8);
    expect(fitted[0]).toEqual(locked);
    const allLocked = steps.map((step) => ({ ...step, locked: true }));
    expect(() => fitSequenceDuration(allLocked, 60)).toThrow();
    expect(() =>
      fitSequenceDuration([{ ...steps[0]!, durationMin: 60, locked: true }, steps[1]!], 50),
    ).toThrow();
  });

  it('does not stretch a single unlocked item past twenty minutes to fill locked time', () => {
    const steps = generateOptimal50MinSequence(criteria, exercises, []).map((step, index) => ({
      ...step,
      locked: index !== 0,
    }));
    expect(() => fitSequenceDuration(steps, 120)).toThrow();
    const weights = generateOptimal50MinSequence(criteria, exercises, []).map((step, index) => ({
      ...step,
      durationMin: index === 0 ? 100 : 1,
    }));
    const fitted = fitSequenceDuration(weights, 120);
    expect(total(fitted)).toBeCloseTo(120, 8);
    expect(fitted.every((step) => step.durationMin <= 20)).toBe(true);
  });

  it('reports a locked exercise that contradicts the requested apparatus', () => {
    const steps = generateOptimal50MinSequence(criteria, exercises, []);
    steps[0] = { ...steps[0]!, locked: true };
    const before = structuredClone(steps);
    expect(() =>
      regenerateSequence(
        { ...criteria, apparatus: 'reformer', ownedApparatus: ['reformer'] },
        exercises,
        [],
        steps,
      ),
    ).toThrow();
    expect(steps).toEqual(before);
  });

  it('rejects section criteria that would leave incompatible steps in another section', () => {
    const steps = generateOptimal50MinSequence(criteria, exercises, []);
    const before = structuredClone(steps);
    expect(() =>
      regenerateSequence(
        { ...criteria, apparatus: 'reformer', ownedApparatus: ['reformer'] },
        exercises,
        [],
        steps,
        'main',
      ),
    ).toThrow();
    expect(steps).toEqual(before);
  });

  it('keeps locked anchors when optimizing and respects constraints when swapping recent exercises', () => {
    const original = generateOptimal50MinSequence(criteria, exercises, []);
    const steps = original.map((step, index) => ({
      ...step,
      locked: index === 3,
      instructorNote: index === 3 ? '잠긴 큐' : undefined,
    }));
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    expect(optimizeSequenceTransitions(steps, byId)[3]).toEqual(steps[3]);
    const swapped = swapDuplicateStepsWithFresh(
      steps,
      exercises,
      historyFor(steps.map((step) => step.exerciseId)),
      undefined,
      criteria,
    );
    expect(swapped[3]).toEqual(steps[3]);
    expect(swapped.every((step) => byId.get(step.exerciseId)?.apparatus === 'mat')).toBe(true);
    expect(total(swapped)).toBe(50);
  });
});

const originalStore = usePilatesStore.getState();

describe('workbench state, undo and validated backup merge', () => {
  beforeEach(() => {
    usePilatesStore.setState(
      {
        ...originalStore,
        exercises,
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        activeSteps: generateOptimal50MinSequence(criteria, exercises, []),
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        ownedApparatus: ['mat'],
        lastCriteria: criteria,
        generationError: null,
        conditionTemplates: [],
      },
      true,
    );
  });

  afterEach(() => {
    usePilatesStore.setState(originalStore, true);
  });

  it('does not alter locked exercises, times or cues and can undo an unlocked edit', () => {
    const store = usePilatesStore.getState();
    store.toggleStepLock(0);
    const locked = structuredClone(usePilatesStore.getState().activeSteps[0]);
    store.adjustStepDuration(0, 1);
    store.replaceStepExercise(0, exercises[4]!.id);
    store.updateStepNote(0, '덮어쓰기');
    store.scaleAllStepsLayer('easy');
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(locked);
    const before = structuredClone(usePilatesStore.getState().activeSteps);
    store.adjustStepDuration(1, 1);
    expect(usePilatesStore.getState().activeSteps[1]!.durationMin).toBe(before[1]!.durationMin + 1);
    store.undoSequence();
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
  });

  it('preserves the draft and exposes a reason after failed generation', () => {
    const before = structuredClone(usePilatesStore.getState().activeSteps);
    usePilatesStore.getState().autoGenerateSequence({ ...criteria, apparatus: 'chair' });
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
    expect(usePilatesStore.getState().generationError).toEqual(expect.any(String));
    expect(usePilatesStore.getState().generationError!.length).toBeGreaterThan(0);
  });

  it('preserves the draft and exposes a reason when locked time cannot fit the target', () => {
    const steps = usePilatesStore.getState().activeSteps.map((step) => ({ ...step, locked: true }));
    usePilatesStore.setState({ activeSteps: steps, activeTargetMinutes: 60 });
    usePilatesStore.getState().fitActiveDuration();
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    expect(usePilatesStore.getState().generationError).toEqual(expect.any(String));
  });

  it('retains reusable conditions through a named template', () => {
    const storedCriteria = { ...criteria, targetMinutes: 60 };
    usePilatesStore.getState().setLastCriteria(storedCriteria);
    usePilatesStore.getState().saveConditionTemplate('오전 매트');
    const template = usePilatesStore.getState().conditionTemplates[0]!;
    expect(template.name).toBe('오전 매트');
    usePilatesStore.getState().setLastCriteria(criteria);
    usePilatesStore.getState().applyConditionTemplate(template.id);
    expect(usePilatesStore.getState().lastCriteria).toEqual(storedCriteria);
  });

  it('roundtrips user data while preserving existing records on an ID conflict', () => {
    const custom = { ...exercises[0]!, id: 'custom-backup', nameKo: '백업 동작', isCustom: true };
    const savedSteps = usePilatesStore
      .getState()
      .activeSteps.map((step, index) => (index === 0 ? { ...step, exerciseId: custom.id } : step));
    const saved: SavedSequence = {
      id: 'saved-backup',
      title: '저장 수업',
      subtitle: '',
      apparatus: 'mat',
      level: '1.0',
      focusTags: [],
      targetMinutes: 50,
      steps: savedSteps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      taughtCount: 1,
    };
    const group = {
      id: 'group-backup',
      name: '오전 반',
      type: 'group' as const,
      defaultLevel: '1.0' as const,
      scheduleLabel: '',
      notes: '',
    };
    const log = {
      ...historyFor([custom.id])[0]!,
      id: 'log-backup',
      groupId: group.id,
      sequenceId: saved.id,
    };
    usePilatesStore.setState({
      exercises: [...exercises, custom],
      savedSequences: [saved],
      classGroups: [group],
      historyLogs: [log],
    });
    const backup = usePilatesStore.getState().exportBackup();
    const existingCustom = { ...custom, nameKo: '현재 수정한 동작' };
    const existingSaved = { ...saved, id: 'saved-existing', title: '기존 수업' };
    usePilatesStore.setState({
      exercises: [...exercises, existingCustom],
      savedSequences: [existingSaved],
      classGroups: [],
      historyLogs: [],
    });
    const restored = usePilatesStore.getState().restoreBackup(backup);
    expect(restored.success).toBe(true);
    const state = usePilatesStore.getState();
    expect(state.exercises.find((exercise) => exercise.id === custom.id)?.nameKo).toBe(
      '현재 수정한 동작',
    );
    expect(state.savedSequences.map((sequence) => sequence.id)).toEqual(
      expect.arrayContaining([saved.id, existingSaved.id]),
    );
    expect(state.classGroups).toContainEqual(group);
    expect(state.historyLogs).toContainEqual(log);
    const afterFirstRestore = state.savedSequences.length;
    state.restoreBackup(backup);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(afterFirstRestore);
  });

  it('records the taught draft snapshot rather than a stale saved sequence and replays legacy IDs honestly', () => {
    const state = usePilatesStore.getState();
    const sequenceId = state.saveCurrentSequenceToBinder();
    state.updateStepNote(1, '실제 수업 메모');
    const taughtSteps = structuredClone(usePilatesStore.getState().activeSteps);
    state.logClassSession({
      sequenceId,
      groupId: 'group',
      taughtAt: new Date().toISOString(),
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '다음 수업 참고',
      actualDurationSec: 2400,
    });
    const log = usePilatesStore.getState().historyLogs[0]!;
    expect(log.stepsSnapshot).toEqual(taughtSteps);
    expect(log.actualDurationSec).toBe(2400);
    const legacy = {
      ...log,
      id: 'legacy-history',
      stepsSnapshot: undefined,
      exerciseIds: [exercises[0]!.id],
    };
    usePilatesStore.setState({ historyLogs: [legacy] });
    state.loadHistoryIntoWorkbench(legacy.id);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(exercises[0]!.id);
    expect(usePilatesStore.getState().activeSubtitle).toContain('현재 기본값');
  });

  it('recovers customized seed records on a fresh device while preserving actual local edits', () => {
    usePilatesStore.setState({
      exercises: structuredClone(INITIAL_EXERCISES),
      savedSequences: structuredClone(INITIAL_SAVED_SEQUENCES),
      classGroups: structuredClone(INITIAL_CLASS_GROUPS),
    });
    const backup = JSON.parse(usePilatesStore.getState().exportBackup());
    delete backup.data.activeDraft;
    backup.data.exercises[0].favoriteTag = 'member-love';
    backup.data.savedSequences[0].title = '백업에서 되찾은 수업';
    backup.data.classGroups[0].name = '백업 수업 별칭';
    expect(usePilatesStore.getState().restoreBackup(JSON.stringify(backup)).success).toBe(true);
    expect(usePilatesStore.getState().exercises[0]?.favoriteTag).toBe('member-love');
    expect(usePilatesStore.getState().savedSequences[0]?.title).toBe('백업에서 되찾은 수업');
    expect(usePilatesStore.getState().classGroups[0]?.name).toBe('백업 수업 별칭');
    usePilatesStore.getState().setExerciseFavoriteTag(INITIAL_EXERCISES[0]!.id, 'signature');
    expect(usePilatesStore.getState().restoreBackup(JSON.stringify(backup)).success).toBe(true);
    expect(usePilatesStore.getState().exercises[0]?.favoriteTag).toBe('signature');
  });

  it('backs up an unsaved draft as a saved copy while retaining the current draft on restore', () => {
    const state = usePilatesStore.getState();
    state.updateStepNote(1, '저장 전 초안 메모');
    const originalDraft = structuredClone(usePilatesStore.getState().activeSteps);
    const backup = state.exportBackup();
    state.updateStepNote(1, '현재 새 작업');
    const currentDraft = structuredClone(usePilatesStore.getState().activeSteps);
    expect(state.restoreBackup(backup).success).toBe(true);
    expect(usePilatesStore.getState().activeSteps).toEqual(currentDraft);
    expect(
      usePilatesStore
        .getState()
        .savedSequences.some(
          (sequence) => sequence.steps[1]?.instructorNote === originalDraft[1]?.instructorNote,
        ),
    ).toBe(true);
  });

  it('keeps edits usable and reports a browser persistence failure without claiming a saved result', async () => {
    const failWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    try {
      expect(() => usePilatesStore.getState().saveCurrentSequenceToBinder(true)).not.toThrow();
      await Promise.resolve();
      expect(usePilatesStore.getState().persistenceError).toEqual(expect.any(String));
      expect(usePilatesStore.getState().saveFeedback).toBeNull();
      expect(() => usePilatesStore.getState().exportBackup()).not.toThrow();
    } finally {
      failWrite.mockRestore();
    }
    usePilatesStore.getState().adjustStepDuration(1, 1);
    await Promise.resolve();
    expect(usePilatesStore.getState().persistenceError).toBeNull();
  });

  it.each(['{broken', '{}', '{"exercises":[{"id":"invalid"}]}'])(
    'rejects malformed backup data without changing user data: %s',
    (raw) => {
      const before = usePilatesStore.getState();
      const result = before.restoreBackup(raw);
      expect(result.success).toBe(false);
      const after = usePilatesStore.getState();
      expect(after.exercises).toEqual(before.exercises);
      expect(after.savedSequences).toEqual(before.savedSequences);
      expect(after.classGroups).toEqual(before.classGroups);
      expect(after.historyLogs).toEqual(before.historyLogs);
    },
  );

  it('hydrates the existing v3 storage key without losing legacy user data or new actions', async () => {
    const custom = { ...exercises[0]!, id: 'legacy-custom', isCustom: true };
    const oldSteps = usePilatesStore.getState().activeSteps.map((step) => ({ ...step }));
    const oldHistory = historyFor([custom.id]);
    localStorage.setItem(
      'pilates-flow-atelier-storage-v3',
      JSON.stringify({
        state: { exercises: [custom], historyLogs: oldHistory, activeSteps: oldSteps },
        version: 0,
      }),
    );
    await usePilatesStore.persist.rehydrate();
    const state = usePilatesStore.getState();
    expect(state.exercises).toContainEqual(custom);
    expect(state.historyLogs).toEqual(oldHistory);
    expect(state.activeSteps).toEqual(oldSteps);
    expect(typeof state.toggleStepLock).toBe('function');
    expect(typeof state.restoreBackup).toBe('function');
    expect(Array.isArray(state.conditionTemplates)).toBe(true);
  });
});
