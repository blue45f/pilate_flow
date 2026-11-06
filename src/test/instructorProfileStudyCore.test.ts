import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, ClassGroupProfile } from '../types/pilates';
import { createEmptyInstructorStudyState } from '../types/instructorStudy';
import {
  cloudBackupDataSchema,
  groupPlanningPreferencesSchema,
  groupSchema,
} from '../schemas/cloudBackupSchema';
import { instructorStudyStateSchema } from '../schemas/instructorStudySchema';
import {
  captureGroupPlanningConditions,
  preserveCurrentGroupPlanningPreferences,
} from '../utils/instructorPlanning';
import { mergeInstructorStudyState } from '../utils/instructorStudy';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'warmup');
const group: ClassGroupProfile = {
  id: 'private-alias',
  name: '오후 별칭반',
  type: 'group',
  defaultLevel: '1.0',
  scheduleLabel: '',
  notes: '',
};
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  level: '1.5',
  focusPreset: 'full-body',
  preferredProps: ['mini-ball'],
  planningGoals: ['mobility'],
  targetMinutes: 60,
  restMinutes: 5,
  defaultLayer: 'easy',
  excludeDaysWindow: 10,
  targetGroupId: 'foreign-group',
  instructorObservations: ['anterior-pelvic-tilt'],
};
function protectedDomain(state = usePilatesStore.getState()) {
  return {
    steps: state.activeSteps,
    title: state.activeTitle,
    subtitle: state.activeSubtitle,
    level: state.activeLevel,
    target: state.activeTargetMinutes,
    apparatus: state.activeApparatus,
    sequenceId: state.activeSequenceId,
    exercises: state.exercises,
    saved: state.savedSequences,
    history: state.historyLogs,
    ownedEquipment: state.ownedEquipment,
    ownedProps: state.ownedProps,
    ownedApparatus: state.ownedApparatus,
    lastCriteria: state.lastCriteria,
    undo: state.undoStack,
  };
}
function assertProtected(before: ReturnType<typeof protectedDomain>) {
  const after = protectedDomain();
  for (const key of Object.keys(before) as (keyof typeof before)[])
    expect(after[key]).toBe(before[key]);
}
function hydrate(raw: object, current = usePilatesStore.getState()): PilatesStudioState {
  return usePilatesStore.persist.getOptions().merge!(raw, current) as PilatesStudioState;
}
beforeEach(() => {
  usePilatesStore.setState({
    ...original,
    classGroups: [{ ...group }],
    exercises: [exercise],
    instructorStudyState: undefined,
    historyLogs: [],
    savedSequences: [],
    ownedEquipment: ['mat'],
    ownedApparatus: ['mat'],
    ownedProps: ['mini-ball'],
    draftCriteria: structuredClone(criteria),
    lastCriteria: { ...criteria, level: '1.0' },
    activeSteps: [
      {
        stepId: 'locked',
        exerciseId: exercise.id,
        blockCategory: 'warmup',
        order: 1,
        selectedLayer: 'standard',
        durationMin: 50,
        locked: true,
      },
    ],
    activeTargetGroupId: 'unchanged-target',
    generationError: null,
    saveFeedback: null,
  });
});
afterEach(() => usePilatesStore.setState(original, true));

describe('group profile and explicit draft-only condition reuse', () => {
  it('keeps age/experience informational and validates optional notes without touching a plan', () => {
    const before = protectedDomain(),
      draft = usePilatesStore.getState().draftCriteria;
    expect(
      usePilatesStore.getState().updateClassGroup(group.id, {
        planningPreferences: {
          ageBand: '60-plus',
          experience: 'new',
          mixedLevelNotes: '  진도는 직접 확인  ',
        },
      }).success,
    ).toBe(true);
    expect(usePilatesStore.getState().classGroups[0].planningPreferences).toEqual({
      ageBand: '60-plus',
      experience: 'new',
      mixedLevelNotes: '진도는 직접 확인',
    });
    assertProtected(before);
    expect(usePilatesStore.getState().draftCriteria).toBe(draft);
    expect(usePilatesStore.getState().classGroups[0].defaultLevel).toBe('1.0');
    const groups = usePilatesStore.getState().classGroups;
    expect(
      usePilatesStore.getState().updateClassGroup(group.id, {
        planningPreferences: {
          mixedLevelNotes: 'x'.repeat(1001),
        },
      }).success,
    ).toBe(false);
    expect(usePilatesStore.getState().classGroups).toBe(groups);
    expect(groupPlanningPreferencesSchema.safeParse({ dateOfBirth: '2000-01-01' }).success).toBe(
      false,
    );
  });

  it('saves the draft conditions as an independent snapshot without personal observations or foreign group identity', () => {
    const before = protectedDomain(),
      draft = usePilatesStore.getState().draftCriteria;
    const target = usePilatesStore.getState().activeTargetGroupId;
    expect(usePilatesStore.getState().saveCurrentConditionsToGroup(group.id).success).toBe(true);
    const stored = usePilatesStore.getState().classGroups[0].planningPreferences!.conditions!;
    expect(stored).toMatchObject({
      level: '1.5',
      targetMinutes: 60,
      restMinutes: 5,
      defaultLayer: 'easy',
      availableEquipment: ['mat'],
      preferredProps: ['mini-ball'],
      planningGoals: ['mobility'],
    });
    expect(stored).not.toHaveProperty('instructorObservations');
    expect(stored).not.toHaveProperty('targetGroupId');
    expect(stored.preferredProps).not.toBe(draft!.preferredProps);
    expect(stored.availableEquipment).not.toBe(draft!.availableEquipment);
    assertProtected(before);
    expect(usePilatesStore.getState().draftCriteria).toBe(draft);
    expect(usePilatesStore.getState().activeTargetGroupId).toBe(target);
  });

  it('applies only saved draft choices, forcing its own target identity and preserving locks/meta/last generated conditions', () => {
    usePilatesStore.getState().saveCurrentConditionsToGroup(group.id);
    const before = protectedDomain();
    expect(usePilatesStore.getState().applyGroupPlanningConditions(group.id).success).toBe(true);
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      targetGroupId: group.id,
      level: '1.5',
      targetMinutes: 60,
      restMinutes: 5,
      defaultLayer: 'easy',
    });
    expect(usePilatesStore.getState().draftCriteria).not.toHaveProperty('instructorObservations');
    expect(usePilatesStore.getState().activeTargetGroupId).toBe(group.id);
    assertProtected(before);
  });

  it.each([
    { availableEquipment: ['chair'], apparatus: 'chair' },
    { availableEquipment: [] },
    { availableEquipment: ['mat'], apparatus: 'reformer' },
    { preferredProps: ['dumbbell'] },
    { targetMinutes: 40, restMinutes: 40 },
  ])('fails saving invalid or unowned conditions atomically: %j', (patch) => {
    usePilatesStore.setState({
      draftCriteria: { ...criteria, ...patch } as AutoGenerateCriteria,
    });
    const before = protectedDomain(),
      groups = usePilatesStore.getState().classGroups;
    const draft = usePilatesStore.getState().draftCriteria;
    expect(usePilatesStore.getState().saveCurrentConditionsToGroup(group.id).success).toBe(false);
    expect(usePilatesStore.getState().classGroups).toBe(groups);
    expect(usePilatesStore.getState().draftCriteria).toBe(draft);
    assertProtected(before);
  });

  it('rechecks ownership when applying and rejects leaked target/observation fields on the wire', () => {
    usePilatesStore.getState().saveCurrentConditionsToGroup(group.id);
    usePilatesStore.setState({ ownedProps: [] });
    const before = protectedDomain(),
      draft = usePilatesStore.getState().draftCriteria;
    expect(usePilatesStore.getState().applyGroupPlanningConditions(group.id).success).toBe(false);
    assertProtected(before);
    expect(usePilatesStore.getState().draftCriteria).toBe(draft);
    const conditions = captureGroupPlanningConditions(criteria, {
      ownedEquipment: ['mat'],
      ownedProps: ['mini-ball'],
    });
    expect(groupSchema.safeParse(group).success).toBe(true);
    for (const leaked of [{ targetGroupId: 'foreign' }, { instructorObservations: [] }])
      expect(
        groupPlanningPreferencesSchema.safeParse({
          conditions: { ...conditions, ...leaked },
        }).success,
      ).toBe(false);
  });

  it('preserves current preferences against old same-ID backups/hydration, including an explicit empty clear', () => {
    usePilatesStore.getState().updateClassGroup(group.id, {
      planningPreferences: { ageBand: 'mixed' },
    });
    const data = JSON.parse(usePilatesStore.getState().exportBackup());
    delete data.data.classGroups[0].planningPreferences;
    expect(usePilatesStore.getState().restoreBackup(JSON.stringify(data)).success).toBe(true);
    expect(usePilatesStore.getState().classGroups[0].planningPreferences?.ageBand).toBe('mixed');
    expect(
      hydrate({ classGroups: [{ ...group, name: 'legacy' }] }).classGroups[0].planningPreferences
        ?.ageBand,
    ).toBe('mixed');
    usePilatesStore.getState().updateClassGroup(group.id, { planningPreferences: {} });
    expect(
      hydrate({
        classGroups: [{ ...group, planningPreferences: { ageBand: '60-plus' } }],
      }).classGroups[0].planningPreferences,
    ).toEqual({});
    expect(
      preserveCurrentGroupPlanningPreferences(usePilatesStore.getState().classGroups, []),
    ).toHaveLength(1);
  });
});

describe('personal instructor study state and v3 recovery', () => {
  it('starts unspecified, then records bookmarks/cue hiding/tasks without touching reviews, history or plan state', () => {
    expect(usePilatesStore.getState().instructorStudyState).toBeUndefined();
    expect(createEmptyInstructorStudyState()).toEqual({
      bookmarkedExerciseIds: [],
      rehearsalCueHidden: true,
      completedTutorialTaskIds: [],
    });
    const before = protectedDomain();
    expect(usePilatesStore.getState().toggleStudyBookmark(exercise.id).success).toBe(true);
    expect(usePilatesStore.getState().setRehearsalCueHidden(false).success).toBe(true);
    expect(
      usePilatesStore.getState().setStudyTutorialTaskCompleted('timeline:inspect', true).success,
    ).toBe(true);
    expect(usePilatesStore.getState().instructorStudyState).toEqual({
      bookmarkedExerciseIds: [exercise.id],
      rehearsalCueHidden: false,
      completedTutorialTaskIds: ['timeline:inspect'],
    });
    assertProtected(before);
    expect(
      usePilatesStore.getState().setStudyTutorialTaskCompleted('timeline:inspect', false).success,
    ).toBe(true);
    expect(usePilatesStore.getState().toggleStudyBookmark(exercise.id).success).toBe(true);
    expect(usePilatesStore.getState().instructorStudyState?.bookmarkedExerciseIds).toEqual([]);
  });

  it('rejects invalid, duplicated, excessive or approval-shaped study state atomically', () => {
    usePilatesStore.getState().toggleStudyBookmark(exercise.id);
    const current = usePilatesStore.getState().instructorStudyState;
    for (const input of [
      { ...current, bookmarkedExerciseIds: [exercise.id, exercise.id] },
      { ...current, bookmarkedExerciseIds: [' x'] },
      { ...current, completedTutorialTaskIds: ['x'.repeat(101)] },
      {
        ...current,
        completedTutorialTaskIds: Array.from({ length: 101 }, (_, i) => `task-${i}`),
      },
      { ...current, rehearsalCueHidden: 'false' },
      { ...current, credentialVerified: true },
    ]) {
      expect(instructorStudyStateSchema.safeParse(input).success).toBe(false);
      expect(usePilatesStore.getState().setInstructorStudyState(input as never).success).toBe(
        false,
      );
      expect(usePilatesStore.getState().instructorStudyState).toBe(current);
    }
    expect(usePilatesStore.getState().toggleStudyBookmark('unknown-new-id').success).toBe(false);
  });

  it('round-trips optional study/preferences through v3 backup; legacy missing fields preserve current', () => {
    usePilatesStore.getState().saveCurrentConditionsToGroup(group.id);
    usePilatesStore.getState().toggleStudyBookmark(exercise.id);
    const raw = usePilatesStore.getState().exportBackup(),
      parsed = JSON.parse(raw);
    expect(cloudBackupDataSchema.safeParse(parsed.data).success).toBe(true);
    const expected = structuredClone(usePilatesStore.getState().instructorStudyState);
    usePilatesStore.setState({
      instructorStudyState: undefined,
      classGroups: [],
    });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    expect(usePilatesStore.getState().instructorStudyState).toEqual(expected);
    expect(
      usePilatesStore.getState().classGroups.find((g) => g.id === group.id)?.planningPreferences
        ?.conditions?.level,
    ).toBe('1.5');
    delete parsed.data.instructorStudyState;
    expect(cloudBackupDataSchema.safeParse(parsed.data).success).toBe(true);
    expect(usePilatesStore.getState().restoreBackup(JSON.stringify(parsed)).success).toBe(true);
    expect(usePilatesStore.getState().instructorStudyState).toEqual(expected);
  });

  it('preserves deliberate local clears against old backups and retains bounded dormant bookmarks without exercise creation', () => {
    const remote = {
      bookmarkedExerciseIds: ['removed-exercise'],
      rehearsalCueHidden: false,
      completedTutorialTaskIds: ['old-task'],
    };
    const current = createEmptyInstructorStudyState();
    expect(mergeInstructorStudyState(current, remote)).toMatchObject({
      state: current,
      added: 0,
      conflicts: 1,
    });
    expect(mergeInstructorStudyState(undefined, remote).state?.bookmarkedExerciseIds).toEqual([
      'removed-exercise',
    ]);
    usePilatesStore.getState().setInstructorStudyState(remote);
    const exercises = usePilatesStore.getState().exercises;
    expect(hydrate({ instructorStudyState: current }).instructorStudyState).toEqual(remote);
    expect(usePilatesStore.getState().toggleStudyBookmark('removed-exercise').success).toBe(true);
    expect(usePilatesStore.getState().instructorStudyState?.bookmarkedExerciseIds).toEqual([]);
    expect(usePilatesStore.getState().exercises).toBe(exercises);
  });

  it('fails malformed backup atomically and preserves current invalid-hydration fragments with visible feedback', () => {
    usePilatesStore.getState().toggleStudyBookmark(exercise.id);
    const current = usePilatesStore.getState().instructorStudyState,
      before = protectedDomain();
    const raw = JSON.parse(usePilatesStore.getState().exportBackup());
    raw.data.instructorStudyState.completedTutorialTaskIds = ['unsafe task with spaces'];
    expect(usePilatesStore.getState().restoreBackup(JSON.stringify(raw)).success).toBe(false);
    expect(usePilatesStore.getState().instructorStudyState).toBe(current);
    assertProtected(before);
    const result = hydrate({
      instructorStudyState: { credentialVerified: true },
    });
    expect(result.instructorStudyState).toBe(current);
    expect(result.generationError).toContain('개인 학습');
  });
});
