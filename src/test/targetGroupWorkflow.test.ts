import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  ClassGroupProfile,
  ClassHistoryLog,
  SequenceStep,
} from '../types/pilates';

const originalStore = usePilatesStore.getState();
const storageKey = 'pilates-flow-atelier-storage-v3';
const matExercise = INITIAL_EXERCISES.find((exercise) => exercise.apparatus === 'mat')!;
const groups: ClassGroupProfile[] = [
  {
    id: 'target-a',
    name: '개인 A',
    type: 'private',
    defaultLevel: '1.0',
    scheduleLabel: '월 오전',
    notes: '준비 확인',
  },
  {
    id: 'target-b',
    name: '저녁 B반',
    type: 'group',
    defaultLevel: '2.0',
    scheduleLabel: '화 저녁',
    notes: '',
  },
];
const criteria: AutoGenerateCriteria = {
  apparatus: 'mixed',
  ownedApparatus: ['mat', 'reformer'],
  availableEquipment: ['mat', 'reformer'],
  level: '1.5',
  focusPreset: 'full-body',
  preferredProps: ['mini-ball'],
  excludeDaysWindow: 14,
  targetGroupId: 'target-b',
  targetMinutes: 63,
  defaultLayer: 'standard',
  planningGoals: ['pelvic-control', 'trunk-hip-coordination'],
  instructorObservations: ['anterior-pelvic-tilt'],
};
const steps: SequenceStep[] = [
  {
    stepId: 'preserved-locked-step',
    order: 1,
    exerciseId: matExercise.id,
    blockCategory: 'warmup',
    durationMin: 5,
    selectedLayer: 'easy',
    locked: true,
    explanationSec: 20,
    transitionSec: 3,
    instructorNote: '유지할 수업 메모',
    customSpringOverride: '강사가 직접 확인',
  },
];
function logFor(
  id: string,
  groupId: string,
  taughtAt: string,
  snapshot?: AutoGenerateCriteria,
): ClassHistoryLog {
  return {
    id,
    groupId,
    groupName: groupId === 'target-a' ? '이전 개인 별칭' : '이전 B반 별칭',
    sequenceId: 'historical-sequence',
    sequenceTitle: '이전 수업',
    taughtAt,
    apparatus: snapshot?.apparatus ?? 'mat',
    level: snapshot?.level ?? '1.0',
    exerciseIds: [matExercise.id],
    rating: 4,
    intensity: 'moderate',
    instructorReflection: '다음 준비에 참고',
    stepsSnapshot: structuredClone(steps),
    ...(snapshot ? { criteriaSnapshot: snapshot } : {}),
  };
}
function assertSequencePreserved(before: PilatesStudioState) {
  const after = usePilatesStore.getState();
  expect(after.activeSteps).toBe(before.activeSteps);
  expect(after.activeSteps[0]).toBe(before.activeSteps[0]);
  expect(after.activeSequenceId).toBe(before.activeSequenceId);
  expect(after.activeTitle).toBe(before.activeTitle);
  expect(after.activeSubtitle).toBe(before.activeSubtitle);
  expect(after.activeApparatus).toBe(before.activeApparatus);
  expect(after.activeLevel).toBe(before.activeLevel);
  expect(after.activeTargetMinutes).toBe(before.activeTargetMinutes);
  expect(after.historyLogs).toBe(before.historyLogs);
  expect(after.savedSequences).toBe(before.savedSequences);
  expect(after.lastCriteria).toBe(before.lastCriteria);
  expect(after.ownedEquipment).toBe(before.ownedEquipment);
  expect(after.ownedProps).toBe(before.ownedProps);
  expect(after.exercises).toBe(before.exercises);
}
function assertFailureAtomic(
  before: PilatesStudioState,
  result: { success: boolean; message: string },
) {
  expect(result.success).toBe(false);
  expect(result.message.trim().length).toBeGreaterThan(0);
  assertSequencePreserved(before);
  const after = usePilatesStore.getState();
  expect(after.draftCriteria).toBe(before.draftCriteria);
  expect(after.activeTargetGroupId).toBe(before.activeTargetGroupId);
  expect(after.classGroups).toBe(before.classGroups);
}

beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...originalStore,
      classGroups: structuredClone(groups),
      exercises: INITIAL_EXERCISES,
      historyLogs: [
        logFor('existing-log', 'target-a', '2026-10-01T10:00:00.000Z', structuredClone(criteria)),
      ],
      savedSequences: [],
      activeSteps: structuredClone(steps),
      activeSequenceId: 'current-draft',
      activeTitle: '유지할 오늘 수업',
      activeSubtitle: '편집 중인 초안',
      activeApparatus: 'mat',
      activeLevel: '1.5',
      activeTargetMinutes: 50,
      activeTargetGroupId: 'target-b',
      draftCriteria: structuredClone(criteria),
      lastCriteria: structuredClone(criteria),
      ownedEquipment: ['mat', 'reformer'],
      ownedApparatus: ['mat', 'reformer'],
      ownedProps: ['mini-ball', 'loop-band'],
      generationError: null,
      saveFeedback: null,
      undoStack: [],
    },
    true,
  );
});
afterEach(() => {
  usePilatesStore.setState(originalStore, true);
});

describe('target group profile edits', () => {
  it('updates only profile fields and preserves identity, historical names, snapshots and the draft', () => {
    const before = usePilatesStore.getState();
    const historyBefore = structuredClone(before.historyLogs);
    const result = before.updateClassGroup('target-a', {
      name: '  오전 개인 A  ',
      defaultLevel: '2.0',
      scheduleLabel: '  월·수 오전  ',
      notes: '  수업 준비 확인  ',
    });
    expect(result.success).toBe(true);
    const after = usePilatesStore.getState();
    expect(after.classGroups[0]).toEqual({
      ...groups[0],
      name: '오전 개인 A',
      defaultLevel: '2.0',
      scheduleLabel: '월·수 오전',
      notes: '수업 준비 확인',
    });
    expect(after.classGroups[1]).toBe(before.classGroups[1]);
    expect(after.historyLogs).toEqual(historyBefore);
    expect(after.historyLogs[0]?.groupName).toBe('이전 개인 별칭');
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.activeTargetGroupId).toBe(before.activeTargetGroupId);
    assertSequencePreserved(before);
  });

  it.each([
    { label: 'blank alias', patch: { name: '   ' } },
    { label: 'long alias', patch: { name: '가'.repeat(61) } },
    { label: 'invalid level', patch: { name: '적용되면 안 되는 별칭', defaultLevel: '9.0' } },
    {
      label: 'long schedule',
      patch: { name: '적용되면 안 되는 별칭', scheduleLabel: '가'.repeat(121) },
    },
    { label: 'long notes', patch: { name: '적용되면 안 되는 별칭', notes: '가'.repeat(1001) } },
  ])('rejects $label without changing any profile or planning data', ({ patch }) => {
    const before = usePilatesStore.getState();
    const result = before.updateClassGroup(
      'target-a',
      patch as Parameters<typeof before.updateClassGroup>[1],
    );
    assertFailureAtomic(before, result);
  });

  it('rejects an unknown target without changing another profile', () => {
    const before = usePilatesStore.getState();
    assertFailureAtomic(before, before.updateClassGroup('missing-target', { name: '다른 별칭' }));
  });
});

describe('explicit target preparation actions', () => {
  it('applies the selected default level only to conditions and selects the target', () => {
    const before = usePilatesStore.getState();
    const result = before.applyGroupDefaultLevel('target-a');
    expect(result.success).toBe(true);
    const after = usePilatesStore.getState();
    expect(after.draftCriteria).toEqual({
      ...before.draftCriteria,
      level: '1.0',
      targetGroupId: 'target-a',
    });
    expect(after.activeTargetGroupId).toBe('target-a');
    expect(after.classGroups).toBe(before.classGroups);
    assertSequencePreserved(before);
    expect(after.draftCriteria?.availableEquipment).not.toBe(
      before.draftCriteria?.availableEquipment,
    );
    expect(after.draftCriteria?.preferredProps).not.toBe(before.draftCriteria?.preferredProps);
    expect(after.draftCriteria?.planningGoals).not.toBe(before.draftCriteria?.planningGoals);
    expect(after.draftCriteria?.instructorObservations).not.toBe(
      before.draftCriteria?.instructorObservations,
    );
  });

  it('can use valid last conditions when no draft conditions exist', () => {
    usePilatesStore.setState({ draftCriteria: null });
    const before = usePilatesStore.getState();
    expect(before.applyGroupDefaultLevel('target-a').success).toBe(true);
    expect(usePilatesStore.getState().draftCriteria).toEqual({
      ...before.lastCriteria,
      level: '1.0',
      targetGroupId: 'target-a',
    });
    assertSequencePreserved(before);
  });

  it('can start from current planning metadata without fabricating a past condition snapshot', () => {
    usePilatesStore.setState({ draftCriteria: null, lastCriteria: null });
    const before = usePilatesStore.getState();
    expect(before.applyGroupDefaultLevel('target-a').success).toBe(true);
    const after = usePilatesStore.getState();
    expect(after.draftCriteria).toMatchObject({
      targetGroupId: 'target-a',
      level: '1.0',
      apparatus: 'mat',
      targetMinutes: 50,
    });
    expect(after.lastCriteria).toBeNull();
    assertSequencePreserved(before);
  });

  it('fails atomically for an unknown target', () => {
    const before = usePilatesStore.getState();
    assertFailureAtomic(before, before.applyGroupDefaultLevel('missing-target'));
  });

  it('reuses the most recent valid same-target real snapshot and makes independent condition arrays', () => {
    const older = { ...structuredClone(criteria), targetMinutes: 30 };
    const latest = {
      ...structuredClone(criteria),
      targetMinutes: 60,
      planningGoals: ['strength' as const],
      targetGroupId: 'original-plan-target',
    };
    const invalid = { ...structuredClone(criteria), targetMinutes: 0 };
    const sample = {
      ...logFor(INITIAL_HISTORY_LOGS[0]!.id, 'target-a', '2026-10-30T10:00:00.000Z', criteria),
      groupName: '예시 기록',
    };
    const history = [
      logFor('other-target', 'target-b', '2026-10-31T10:00:00.000Z', criteria),
      logFor('old-target', 'target-a', '2026-10-02T10:00:00.000Z', older),
      logFor('latest-target', 'target-a', '2026-10-20T10:00:00.000Z', latest),
      logFor('invalid-newest', 'target-a', '2026-10-29T10:00:00.000Z', invalid),
      logFor('without-snapshot', 'target-a', '2026-10-28T10:00:00.000Z'),
      logFor('invalid-date', 'target-a', 'not-a-date', criteria),
      sample,
    ];
    usePilatesStore.setState({ historyLogs: history });
    const before = usePilatesStore.getState();
    expect(before.reuseGroupRecentCriteria('target-a').success).toBe(true);
    const after = usePilatesStore.getState();
    expect(after.draftCriteria).toEqual({ ...latest, targetGroupId: 'target-a' });
    expect(after.activeTargetGroupId).toBe('target-a');
    assertSequencePreserved(before);
    expect(after.draftCriteria?.availableEquipment).not.toBe(latest.availableEquipment);
    expect(after.draftCriteria?.ownedApparatus).not.toBe(latest.ownedApparatus);
    expect(after.draftCriteria?.preferredProps).not.toBe(latest.preferredProps);
    expect(after.draftCriteria?.planningGoals).not.toBe(latest.planningGoals);
    expect(after.draftCriteria?.instructorObservations).not.toBe(latest.instructorObservations);
    expect(history[2]?.criteriaSnapshot?.targetGroupId).toBe('original-plan-target');
  });

  it.each(['missing-target', 'target-a'])(
    'does not fall back to global or another target for %s',
    (targetId) => {
      usePilatesStore.setState({
        historyLogs: [logFor('other-only', 'target-b', '2026-10-01T10:00:00.000Z', criteria)],
      });
      const before = usePilatesStore.getState();
      assertFailureAtomic(before, before.reuseGroupRecentCriteria(targetId));
    },
  );

  it('does not reuse an illustrative history snapshot as real class history', () => {
    usePilatesStore.setState({
      historyLogs: [
        logFor(INITIAL_HISTORY_LOGS[0]!.id, 'target-a', '2026-10-01T10:00:00.000Z', criteria),
      ],
    });
    const before = usePilatesStore.getState();
    assertFailureAtomic(before, before.reuseGroupRecentCriteria('target-a'));
  });

  it.each([
    {
      label: 'exact unowned tower',
      snapshot: {
        ...criteria,
        availableEquipment: ['mat', 'tower'],
        ownedApparatus: ['mat', 'cadillac'],
      },
    },
    { label: 'unowned prop', snapshot: { ...criteria, preferredProps: ['magic-circle'] } },
  ])(
    'fails atomically for $label without expanding inventory or relaxing the record',
    ({ snapshot }) => {
      const recorded = snapshot as AutoGenerateCriteria;
      usePilatesStore.setState({
        ...(snapshot.availableEquipment?.includes('tower')
          ? {
              ownedEquipment: ['mat', 'cadillac'],
              ownedApparatus: ['mat' as const, 'cadillac' as const],
            }
          : {}),
        historyLogs: [
          logFor('older-available-history', 'target-a', '2026-09-01T10:00:00.000Z', criteria),
          logFor('unavailable-history', 'target-a', '2026-10-01T10:00:00.000Z', recorded),
        ],
      });
      const before = usePilatesStore.getState();
      const recordBefore = structuredClone(before.historyLogs);
      assertFailureAtomic(before, before.reuseGroupRecentCriteria('target-a'));
      expect(usePilatesStore.getState().historyLogs).toEqual(recordBefore);
    },
  );

  it('retains profile edits and explicit conditions through the existing v3 persistence and JSON backup', async () => {
    const store = usePilatesStore.getState();
    expect(
      store.updateClassGroup('target-a', {
        name: '오전 개인 A',
        defaultLevel: '2.0',
        notes: '진행 준비 메모',
      }).success,
    ).toBe(true);
    expect(store.applyGroupDefaultLevel('target-a').success).toBe(true);
    const savedProfile = structuredClone(usePilatesStore.getState().classGroups[0]);
    const savedConditions = structuredClone(usePilatesStore.getState().draftCriteria);
    const raw = localStorage.getItem(storageKey)!;
    const backup = store.exportBackup();
    expect(JSON.parse(backup).data.classGroups[0]).toEqual(savedProfile);
    expect(JSON.parse(backup).data.draftCriteria).toEqual(savedConditions);
    usePilatesStore.setState({ classGroups: [], draftCriteria: null });
    localStorage.setItem(storageKey, raw);
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().classGroups[0]).toEqual(savedProfile);
    expect(usePilatesStore.getState().draftCriteria).toEqual(savedConditions);
    expect(usePilatesStore.getState().historyLogs[0]?.groupName).toBe('이전 개인 별칭');
  });
});
