import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { SavedSequence } from '../types/pilates';
import { cloudBackupDataSchema } from '../schemas/cloudBackupSchema';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'warmup');
const schedule: InstructorScheduleData = {
  locations: [{ id: 'studio', alias: '연습 장소', equipmentIds: ['mat'], propIds: [], notes: '' }],
  classes: [
    {
      id: 'weekly',
      title: '연습반',
      participantAlias: '',
      locationId: 'studio',
      startDate: '2026-11-02',
      untilDate: '2026-11-30',
      weekdays: [1],
      recurrence: 'weekly',
      startTime: '10:00',
      endTime: '10:50',
      notes: '',
    },
  ],
  exceptions: [],
};
const source: SavedSequence = {
  id: 'source',
  title: '독립 보존 계획',
  subtitle: '강사 작성',
  apparatus: 'mat',
  level: '1.0',
  focusTags: [],
  targetMinutes: 50,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  taughtCount: 0,
  steps: [
    {
      stepId: 'motion',
      order: 1,
      exerciseId: exercise.id,
      blockCategory: 'warmup',
      durationMin: 48,
      selectedLayer: 'easy',
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      locked: true,
      explanationSec: 30,
      transitionSec: 30,
    },
    {
      kind: 'rest',
      stepId: 'rest',
      order: 2,
      exerciseId: '',
      blockCategory: 'core',
      selectedLayer: 'standard',
      durationMin: 2,
    },
  ],
  criteriaSnapshot: {
    apparatus: 'mat',
    availableEquipment: ['mat'],
    level: '1.0',
    focusPreset: 'full-body',
    preferredProps: ['none'],
    excludeDaysWindow: 10,
    targetMinutes: 50,
    restMinutes: 2,
    defaultLayer: 'easy',
    targetGroupId: 'private-other-group',
    instructorObservations: ['posterior-pelvic-tilt'],
  },
};
function active(state = usePilatesStore.getState()) {
  return {
    id: state.activeSequenceId,
    title: state.activeTitle,
    subtitle: state.activeSubtitle,
    apparatus: state.activeApparatus,
    level: state.activeLevel,
    target: state.activeTargetMinutes,
    group: state.activeTargetGroupId,
    steps: state.activeSteps,
    draft: state.draftCriteria,
    last: state.lastCriteria,
  };
}
function assign(date = '2026-11-02') {
  const result = usePilatesStore.getState().assignSequenceToOccurrence({
    sequenceId: source.id,
    classId: 'weekly',
    originalDate: date,
    state: 'prepared',
  });
  expect(result.success).toBe(true);
  return usePilatesStore
    .getState()
    .datedSequencePlanning!.assignments.find((a) => a.originalDate === date)!;
}
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    exercises: [exercise],
    savedSequences: [structuredClone(source)],
    historyLogs: [],
    instructorSchedule: structuredClone(schedule),
    datedSequencePlanning: undefined,
    instructorStudyState: undefined,
    undoStack: [],
    activeSequenceId: 'unsaved-before-load',
    activeTab: 'schedule',
    activeTitle: '수정 중인 초안',
    activeSteps: [
      {
        stepId: 'unsaved',
        exerciseId: exercise.id,
        order: 1,
        blockCategory: 'warmup',
        durationMin: 12,
        selectedLayer: 'hard',
        instructorNote: '이전 초안 메모',
      },
    ],
    draftCriteria: structuredClone(source.criteriaSnapshot!),
    lastCriteria: structuredClone(source.criteriaSnapshot!),
  }),
);
afterEach(() => usePilatesStore.setState(original, true));

describe('dated snapshot store and recovery boundaries', () => {
  it('assigns a frozen independent snapshot without changing Binder, current draft, taught counters, reviews or history', () => {
    const before = usePilatesStore.getState(),
      oldActive = active();
    const assignment = assign();
    expect(assignment.classId).toBe('weekly');
    expect(assignment.originalDate).toBe('2026-11-02');
    expect(assignment.state).toBe('prepared');
    expect(assignment.sequenceSnapshot.steps[0]).toMatchObject({
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      locked: true,
    });
    expect(Object.isFrozen(assignment.sequenceSnapshot.steps[0])).toBe(true);
    expect(Object.isFrozen(assignment.sequenceSnapshot.criteriaSnapshot!.preferredProps)).toBe(
      true,
    );
    before.savedSequences[0].steps[0].repetitions = 19;
    expect(assignment.sequenceSnapshot.steps[0].repetitions).toBe(8);
    const after = usePilatesStore.getState();
    expect(active()).toEqual(oldActive);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.exercises).toBe(before.exercises);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.savedSequences[0].taughtCount).toBe(0);
  });

  it('never overwrites an existing assignment, including prepared snapshots', () => {
    const first = assign(),
      planning = usePilatesStore.getState().datedSequencePlanning;
    expect(
      usePilatesStore.getState().assignSequenceToOccurrence({
        sequenceId: source.id,
        classId: 'weekly',
        originalDate: '2026-11-02',
        state: 'draft',
      }).success,
    ).toBe(false);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(planning);
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0]).toBe(first);
  });

  it('loads a new independent draft with an undo path and privacy clearing; deleting the Binder source does not remove its snapshot', () => {
    const assignment = assign(),
      oldActive = structuredClone(active());
    usePilatesStore.setState({ savedSequences: [] });
    const before = usePilatesStore.getState(),
      planning = before.datedSequencePlanning;
    expect(before.loadDatedSequencePlanAsDraft(assignment.id, assignment.updatedAt).success).toBe(
      true,
    );
    const loaded = usePilatesStore.getState();
    expect(loaded.activeSequenceId).toMatch(/^draft-dated-/);
    expect(loaded.activeSequenceId).not.toBe(source.id);
    expect(loaded.activeTab).toBe(before.activeTab);
    expect(loaded.activeSteps).toEqual(source.steps);
    expect(loaded.activeSteps).not.toBe(assignment.sequenceSnapshot.steps);
    expect(loaded.activeTargetGroupId).toBe('');
    expect(loaded.draftCriteria).not.toHaveProperty('targetGroupId');
    expect(loaded.draftCriteria).not.toHaveProperty('instructorObservations');
    expect(loaded.lastCriteria).toBeNull();
    expect(loaded.datedSequencePlanning).toBe(planning);
    expect(loaded.savedSequences).toBe(before.savedSequences);
    expect(loaded.historyLogs).toBe(before.historyLogs);
    expect(loaded.undoStack).toHaveLength(1);
    loaded.undoSequence();
    expect(active()).toEqual(oldActive);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(planning);
  });

  it('rejects stale load/state requests and changed occurrence context atomically', () => {
    const assignment = assign(),
      before = active(),
      planning = usePilatesStore.getState().datedSequencePlanning;
    expect(
      usePilatesStore.getState().loadDatedSequencePlanAsDraft(assignment.id, 'old-version').success,
    ).toBe(false);
    expect(
      usePilatesStore.getState().setDatedSequencePlanState(assignment.id, 'draft', 'old-version')
        .success,
    ).toBe(false);
    usePilatesStore.setState({
      instructorSchedule: {
        ...schedule,
        exceptions: [
          {
            id: 'move',
            kind: 'reschedule',
            classId: 'weekly',
            originalDate: '2026-11-02',
            date: '2026-11-03',
            startTime: '11:00',
            endTime: '11:50',
            reason: '',
          },
        ],
      },
    });
    expect(usePilatesStore.getState().loadDatedSequencePlanAsDraft(assignment.id).success).toBe(
      false,
    );
    expect(
      usePilatesStore
        .getState()
        .setDatedSequencePlanState(assignment.id, 'prepared', assignment.updatedAt).success,
    ).toBe(false);
    expect(active()).toEqual(before);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(planning);
  });

  it('previews without a store write and copies only next-week drafts, leaving existing assigned targets intact', () => {
    assign();
    const before = usePilatesStore.getState();
    const preview = before.previewDatedSequencePlanWeekCopy('2026-11-02', '2026-11-09');
    expect(preview.success).toBe(true);
    expect(usePilatesStore.getState()).toBe(before);
    const copied = before.copyDatedSequencePlanWeek('2026-11-02', '2026-11-09');
    expect(copied).toMatchObject({ success: true, added: 1, conflicts: 0 });
    const target = usePilatesStore
      .getState()
      .datedSequencePlanning!.assignments.find((a) => a.originalDate === '2026-11-09')!;
    expect(target.state).toBe('draft');
    expect(target.sequenceSnapshot.steps).toEqual(source.steps);
    const planning = usePilatesStore.getState().datedSequencePlanning;
    expect(
      usePilatesStore.getState().copyDatedSequencePlanWeek('2026-11-02', '2026-11-09'),
    ).toMatchObject({ success: true, added: 0, conflicts: 1 });
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(planning);
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    expect(usePilatesStore.getState().savedSequences[0].taughtCount).toBe(0);
  });

  it('round-trips v3 snapshots independently of the live Binder and preserves local semantic occurrence conflicts', () => {
    const assignment = assign(),
      raw = usePilatesStore.getState().exportBackup(),
      backup = JSON.parse(raw);
    expect(cloudBackupDataSchema.safeParse(backup.data).success).toBe(true);
    usePilatesStore.setState({ datedSequencePlanning: undefined, savedSequences: [] });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0]).toEqual(assignment);
    expect(
      Object.isFrozen(
        usePilatesStore.getState().datedSequencePlanning!.assignments[0].sequenceSnapshot.steps,
      ),
    ).toBe(true);
    backup.data.datedSequencePlanning.assignments[0].id = 'same-occurrence-older-id';
    backup.data.datedSequencePlanning.assignments[0].state = 'draft';
    const result = usePilatesStore.getState().restoreBackup(JSON.stringify(backup));
    expect(result.success).toBe(true);
    expect(result.message).toContain('같은 회차');
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments).toHaveLength(1);
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0].id).toBe(assignment.id);
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0].state).toBe('prepared');
  });

  it('preserves old optional-state backups and orphan snapshots; rejects cross-occurrence ID aliases atomically', () => {
    const assignment = assign(),
      planning = usePilatesStore.getState().datedSequencePlanning;
    const backup = JSON.parse(usePilatesStore.getState().exportBackup());
    delete backup.data.datedSequencePlanning;
    expect(usePilatesStore.getState().restoreBackup(JSON.stringify(backup)).success).toBe(true);
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0]).toEqual(assignment);
    backup.data.datedSequencePlanning = {
      assignments: [{ ...assignment, classId: 'other-class' }],
    };
    const before = usePilatesStore.getState();
    expect(before.restoreBackup(JSON.stringify(backup)).success).toBe(false);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(before.datedSequencePlanning);
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    const merge = usePilatesStore.persist.getOptions().merge!;
    const fresh = { ...usePilatesStore.getState(), datedSequencePlanning: undefined };
    const restored = merge(
      {
        datedSequencePlanning: planning,
        instructorSchedule: { locations: [], classes: [], exceptions: [] },
      },
      fresh,
    ) as PilatesStudioState;
    expect(restored.datedSequencePlanning!.assignments[0]).toEqual(assignment);
    const invalid = merge(
      { datedSequencePlanning: { assignments: [{ ...assignment, originalDate: 'bad' }] } },
      before,
    ) as PilatesStudioState;
    expect(invalid.datedSequencePlanning).toBe(before.datedSequencePlanning);
    expect(invalid.generationError).toContain('날짜별 계획');
  });
});
