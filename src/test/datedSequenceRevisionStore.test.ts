import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import { cloudBackupDataSchema } from '../schemas/cloudBackupSchema';
import { getDatedPlanSourceFingerprint } from '../utils/datedSequencePlanning';
import {
  revisionAssigned,
  revisionExercise,
  revisionNow,
  revisionSchedule,
  revisionSource,
} from './datedRevisionFixtures';

const original = usePilatesStore.getState();
function active(state = usePilatesStore.getState()) {
  return {
    id: state.activeSequenceId,
    title: state.activeTitle,
    steps: state.activeSteps,
    group: state.activeTargetGroupId,
    draft: state.draftCriteria,
    last: state.lastCriteria,
    tab: state.activeTab,
  };
}
function reviewed() {
  const state = usePilatesStore.getState(),
    assignment = state.datedSequencePlanning!.assignments[0];
  return {
    assignmentId: assignment.id,
    sequenceId: 'revised',
    expectedUpdatedAt: assignment.updatedAt,
    expectedOccurrenceSnapshot: assignment.occurrenceSnapshot,
    expectedSourceFingerprint: getDatedPlanSourceFingerprint(state.savedSequences[1]),
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(revisionNow));
  usePilatesStore.setState({
    ...original,
    exercises: [revisionExercise],
    savedSequences: [revisionSource(), revisionSource('revised')],
    historyLogs: [],
    instructorSchedule: revisionSchedule(),
    datedSequencePlanning: revisionAssigned().planning,
    activeTab: 'schedule',
    activeSequenceId: 'unsaved-draft',
    activeTitle: '이전 초안',
    activeSteps: [
      { ...revisionSource().steps[0], stepId: 'unsaved', instructorNote: '이전 개인 메모' },
    ],
    activeTargetGroupId: 'private-group',
    draftCriteria: revisionSource().criteriaSnapshot!,
    lastCriteria: revisionSource().criteriaSnapshot!,
    undoStack: [],
  });
});
afterEach(() => {
  usePilatesStore.setState(original, true);
  vi.useRealTimers();
});

describe('dated revision store atomicity and recovery', () => {
  it('replaces one date only with exact preview guards, preserving Binder, history, review data, inventory and unsaved work', () => {
    const first = usePilatesStore.getState().datedSequencePlanning!.assignments[0],
      other = revisionAssigned('2026-11-09').assignment;
    usePilatesStore.setState({ datedSequencePlanning: { assignments: [first, other] } });
    const before = usePilatesStore.getState(),
      oldActive = active();
    expect(before.replaceDatedSequencePlanSnapshot(reviewed())).toMatchObject({
      success: true,
      assignmentId: first.id,
    });
    const after = usePilatesStore.getState(),
      current = after.datedSequencePlanning!.assignments[0];
    expect(current.sourceSequenceId).toBe('revised');
    expect(current.state).toBe('draft');
    expect(current.priorVersions).toEqual([first]);
    expect(after.datedSequencePlanning!.assignments[1]).toEqual(other);
    expect(active()).toEqual(oldActive);
    for (const key of [
      'savedSequences',
      'historyLogs',
      'exercises',
      'classGroups',
      'ownedEquipment',
      'ownedProps',
      'undoStack',
    ] as const)
      expect(after[key]).toBe(before[key]);
    expect(after.savedSequences.map((s) => s.taughtCount)).toEqual([3, 3]);
    expect(current.updatedAt).toBe('2026-11-05T10:00:00.001Z');
    expect(Object.isFrozen(current.priorVersions![0].sequenceSnapshot.steps)).toBe(true);
  });

  it('rejects unknown source, stale dated token, missing guard and same-updatedAt changed source without domain mutation', () => {
    const input = reviewed();
    const failureCases = [
      { ...input, sequenceId: 'missing' },
      { ...input, assignmentId: 'missing' },
      { ...input, expectedUpdatedAt: 'old' },
      { ...input, expectedUpdatedAt: undefined as never },
      { ...input, expectedSourceFingerprint: undefined as never },
      { ...input, expectedOccurrenceSnapshot: undefined as never },
    ];
    for (const patch of failureCases) {
      const before = usePilatesStore.getState();
      expect(before.replaceDatedSequencePlanSnapshot(patch).success).toBe(false);
      const after = usePilatesStore.getState();
      expect(after.datedSequencePlanning).toBe(before.datedSequencePlanning);
      expect(active(after)).toEqual(active(before));
      expect(after.savedSequences).toBe(before.savedSequences);
    }
    const state = usePilatesStore.getState();
    usePilatesStore.setState({
      savedSequences: state.savedSequences.map((s) =>
        s.id === 'revised' ? { ...s, title: '동일 시각의 새 내용' } : s,
      ),
    });
    const before = usePilatesStore.getState();
    expect(before.savedSequences[1].updatedAt).toBe(revisionNow);
    expect(before.replaceDatedSequencePlanSnapshot(input).success).toBe(false);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(before.datedSequencePlanning);
  });

  it('supports explicit current-context rebind while stale preview, cancel and closed requests stay atomic', () => {
    const input = reviewed(),
      schedule = revisionSchedule();
    schedule.exceptions.push({
      id: 'move',
      kind: 'reschedule',
      classId: 'class',
      originalDate: '2026-11-02',
      date: '2026-11-03',
      startTime: '11:00',
      endTime: '11:50',
      locationId: 'other-place',
      reason: '',
    });
    usePilatesStore.setState({ instructorSchedule: schedule });
    const before = usePilatesStore.getState();
    expect(
      before.loadDatedSequencePlanAsDraft(input.assignmentId, input.expectedUpdatedAt).success,
    ).toBe(false);
    expect(before.replaceDatedSequencePlanSnapshot(input).success).toBe(false);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(before.datedSequencePlanning);
    const expectedOccurrenceSnapshot = {
      date: '2026-11-03',
      startTime: '11:00',
      endTime: '11:50',
      locationId: 'other-place',
    };
    expect(
      usePilatesStore
        .getState()
        .replaceDatedSequencePlanSnapshot({ ...input, expectedOccurrenceSnapshot }).success,
    ).toBe(true);
    const assignment = usePilatesStore.getState().datedSequencePlanning!.assignments[0];
    expect(assignment.occurrenceSnapshot).toEqual(expectedOccurrenceSnapshot);
    expect(assignment.priorVersions![0].occurrenceSnapshot).toEqual(
      input.expectedOccurrenceSnapshot,
    );
    const currentInput = { ...reviewed(), expectedOccurrenceSnapshot };
    usePilatesStore.setState({
      instructorSchedule: {
        ...schedule,
        exceptions: [
          ...schedule.exceptions,
          {
            id: 'closed',
            kind: 'closed',
            date: '2026-11-03',
            locationId: 'other-place',
            reason: '',
          },
        ],
      },
    });
    expect(usePilatesStore.getState().replaceDatedSequencePlanSnapshot(currentInput).success).toBe(
      false,
    );
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0]).toBe(assignment);
  });

  it('makes same-ms prepared/state edits invalidate old revision previews and accepts a newly reviewed one', () => {
    const input = reviewed();
    expect(
      usePilatesStore
        .getState()
        .setDatedSequencePlanState(input.assignmentId, 'draft', input.expectedUpdatedAt).success,
    ).toBe(true);
    const before = usePilatesStore.getState();
    expect(before.datedSequencePlanning!.assignments[0].updatedAt).toBe('2026-11-05T10:00:00.001Z');
    expect(before.replaceDatedSequencePlanSnapshot(input).success).toBe(false);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(before.datedSequencePlanning);
    expect(usePilatesStore.getState().replaceDatedSequencePlanSnapshot(reviewed()).success).toBe(
      true,
    );
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0].updatedAt).toBe(
      '2026-11-05T10:00:00.002Z',
    );
  });

  it('round-trips complete frozen revisions throughv3 export/import and hydration; older aliases cannot replace current history', () => {
    expect(usePilatesStore.getState().replaceDatedSequencePlanSnapshot(reviewed()).success).toBe(
      true,
    );
    const expected = usePilatesStore.getState().datedSequencePlanning!,
      raw = usePilatesStore.getState().exportBackup(),
      backup = JSON.parse(raw);
    expect(cloudBackupDataSchema.safeParse(backup.data).success).toBe(true);
    usePilatesStore.setState({ datedSequencePlanning: undefined });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    expect(usePilatesStore.getState().datedSequencePlanning).toEqual(expected);
    expect(
      Object.isFrozen(
        usePilatesStore.getState().datedSequencePlanning!.assignments[0].priorVersions![0]
          .sequenceSnapshot.steps[0],
      ),
    ).toBe(true);
    const merged = usePilatesStore.persist.getOptions().merge!(
      { datedSequencePlanning: expected },
      { ...usePilatesStore.getState(), datedSequencePlanning: undefined },
    ) as PilatesStudioState;
    expect(merged.datedSequencePlanning).toEqual(expected);
    backup.data.datedSequencePlanning = structuredClone(revisionAssigned().planning);
    backup.data.datedSequencePlanning.assignments[0] = {
      ...backup.data.datedSequencePlanning.assignments[0],
      id: 'older-alias',
    };
    const result = usePilatesStore.getState().restoreBackup(JSON.stringify(backup));
    expect(result.success).toBe(true);
    expect(result.message).toContain('같은 회차');
    expect(usePilatesStore.getState().datedSequencePlanning).toEqual(expected);
    delete backup.data.datedSequencePlanning;
    expect(usePilatesStore.getState().restoreBackup(JSON.stringify(backup)).success).toBe(true);
    expect(usePilatesStore.getState().datedSequencePlanning).toEqual(expected);
  });

  it('rejects corrupted history before any backup merge and prevents cross-occurrence ID aliases', () => {
    expect(usePilatesStore.getState().replaceDatedSequencePlanSnapshot(reviewed()).success).toBe(
      true,
    );
    const raw = JSON.parse(usePilatesStore.getState().exportBackup()),
      before = usePilatesStore.getState();
    raw.data.datedSequencePlanning.assignments[0].priorVersions[0].sourceSequenceId = 'corrupt';
    expect(before.restoreBackup(JSON.stringify(raw)).success).toBe(false);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(before.datedSequencePlanning);
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    const alias = JSON.parse(before.exportBackup());
    const assignment = alias.data.datedSequencePlanning.assignments[0];
    assignment.originalDate = '2026-11-09';
    assignment.priorVersions[0].originalDate = '2026-11-09';
    expect(before.restoreBackup(JSON.stringify(alias)).success).toBe(false);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(before.datedSequencePlanning);
  });

  it('loads latest revised snapshot as independent draft with privacy clearing and standard Undo, preserving every assignment version', () => {
    expect(usePilatesStore.getState().replaceDatedSequencePlanSnapshot(reviewed()).success).toBe(
      true,
    );
    const before = usePilatesStore.getState(),
      oldActive = structuredClone(active()),
      planning = before.datedSequencePlanning!,
      assignment = planning.assignments[0];
    expect(before.loadDatedSequencePlanAsDraft(assignment.id, assignment.updatedAt).success).toBe(
      true,
    );
    const loaded = usePilatesStore.getState();
    expect(loaded.activeSequenceId).toMatch(/^draft-dated-/);
    expect(loaded.activeSequenceId).not.toBe('revised');
    expect(loaded.activeSteps).toEqual(assignment.sequenceSnapshot.steps);
    expect(loaded.activeTargetGroupId).toBe('');
    expect(loaded.draftCriteria).not.toHaveProperty('instructorObservations');
    expect(loaded.draftCriteria).not.toHaveProperty('targetGroupId');
    expect(loaded.activeTab).toBe('schedule');
    expect(loaded.datedSequencePlanning).toBe(planning);
    expect(loaded.savedSequences).toBe(before.savedSequences);
    expect(loaded.historyLogs).toBe(before.historyLogs);
    expect(loaded.exercises).toBe(before.exercises);
    loaded.undoSequence();
    expect(active()).toEqual(oldActive);
    expect(usePilatesStore.getState().datedSequencePlanning).toBe(planning);
  });
});
