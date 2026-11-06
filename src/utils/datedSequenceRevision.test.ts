import { describe, expect, it } from 'vitest';
import { sequenceSchema } from '../schemas/cloudBackupSchema';
import {
  createDatedPlanningSchema,
  DATED_PLAN_PRIOR_VERSION_LIMIT,
} from '../schemas/datedSequencePlanningSchema';
import type { DatedSequencePlanningData } from '../types/datedSequencePlanning';
import {
  revisionAssigned,
  revisionNow,
  revisionSchedule,
  revisionSource,
} from '../test/datedRevisionFixtures';
import {
  copyDatedPlanWeek,
  getDatedPlanSourceFingerprint,
  mergeDatedSequencePlanning,
  replaceDatedPlanSnapshot,
  setDatedPlanState,
} from './datedSequencePlanning';

const schema = createDatedPlanningSchema(sequenceSchema);
function request(planning = revisionAssigned().planning) {
  const assignment = planning.assignments[0],
    sequence = revisionSource('revised');
  return {
    schedule: revisionSchedule(),
    planning,
    sequence,
    assignmentId: assignment.id,
    expectedUpdatedAt: assignment.updatedAt,
    expectedOccurrenceSnapshot: assignment.occurrenceSnapshot,
    expectedSourceFingerprint: getDatedPlanSourceFingerprint(sequence),
    now: revisionNow,
  };
}

describe('explicit per-occurrence immutable plan revisions', () => {
  it('retains the complete prior prepared version and changes only the target snapshot/context/state', () => {
    const input = request(),
      before = JSON.stringify(input);
    const other = revisionAssigned('2026-11-09').assignment;
    input.planning = { assignments: [...input.planning.assignments, other] };
    const result = replaceDatedPlanSnapshot(input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const current = result.assignment;
    expect(current.priorVersions).toEqual([input.planning.assignments[0]]);
    expect(current.priorVersions![0]).not.toHaveProperty('priorVersions');
    expect(current.priorVersions![0].state).toBe('prepared');
    expect(current.priorVersions![0].sequenceSnapshot.steps[0]).toMatchObject({
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      instructorNote: '원래 강사 메모',
      customSpringOverride: '직접 설정',
      locked: true,
    });
    expect(current.priorVersions![0].sequenceSnapshot.steps[1].kind).toBe('rest');
    expect(current.state).toBe('draft');
    expect(current.sourceSequenceId).toBe('revised');
    expect(current.sequenceSnapshot).toEqual(input.sequence);
    expect(current.createdAt).toBe(input.planning.assignments[0].createdAt);
    expect(current.updatedAt).toBe('2026-11-05T10:00:00.001Z');
    expect(result.planning.assignments[1]).toEqual(other);
    expect(
      Object.isFrozen(current.priorVersions![0].sequenceSnapshot.criteriaSnapshot!.preferredProps),
    ).toBe(true);
    input.sequence.steps[0].repetitions = 17;
    expect(current.sequenceSnapshot.steps[0].repetitions).toBe(8);
    expect(
      JSON.stringify({
        ...input,
        sequence: revisionSource('revised'),
        planning: revisionAssigned().planning,
      }),
    ).toBe(before);
  });

  it('keeps every full prior version without recursive histories through successive revisions', () => {
    const first = replaceDatedPlanSnapshot(request());
    expect(first.success).toBe(true);
    if (!first.success) return;
    const nextInput = request(first.planning);
    nextInput.sequence.title = '다시 수정';
    nextInput.expectedSourceFingerprint = getDatedPlanSourceFingerprint(nextInput.sequence);
    const second = replaceDatedPlanSnapshot(nextInput);
    expect(second.success).toBe(true);
    if (!second.success) return;
    expect(second.assignment.priorVersions).toHaveLength(2);
    expect(second.assignment.priorVersions![0]).toEqual(first.assignment.priorVersions![0]);
    expect(second.assignment.priorVersions![1]).toEqual({
      ...first.assignment,
      priorVersions: undefined,
    });
    expect(second.assignment.priorVersions!.every((version) => !('priorVersions' in version))).toBe(
      true,
    );
    expect(second.assignment.updatedAt).toBe('2026-11-05T10:00:00.002Z');
  });

  it('rejects absent/stale assignment tokens and never treats a same-ms state edit as the reviewed version', () => {
    const input = request();
    expect(replaceDatedPlanSnapshot({ ...input, expectedUpdatedAt: 'old' }).success).toBe(false);
    expect(
      replaceDatedPlanSnapshot({ ...input, expectedUpdatedAt: undefined as never }).success,
    ).toBe(false);
    expect(replaceDatedPlanSnapshot({ ...input, assignmentId: 'missing' }).success).toBe(false);
    const changed = setDatedPlanState({ ...input, state: 'draft' });
    expect(changed.success).toBe(true);
    if (!changed.success) return;
    expect(changed.planning.assignments[0].updatedAt).not.toBe(input.expectedUpdatedAt);
    expect(replaceDatedPlanSnapshot({ ...input, planning: changed.planning }).success).toBe(false);
    const revised = replaceDatedPlanSnapshot(request(changed.planning));
    expect(revised.success).toBe(true);
    if (!revised.success) return;
    expect(revised.assignment.updatedAt).toBe('2026-11-05T10:00:00.002Z');
  });

  it('uses monotonic tokens even if the wall clock moves backward and fails invalid clocks atomically', () => {
    const input = request();
    const result = replaceDatedPlanSnapshot({ ...input, now: '2026-11-01T00:00:00Z' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.assignment.updatedAt).toBe('2026-11-05T10:00:00.001Z');
    expect(replaceDatedPlanSnapshot({ ...input, now: 'invalid' }).success).toBe(false);
    expect(input.planning).toEqual(revisionAssigned().planning);
  });

  it('guards the entire reviewed source including same-updatedAt content and has deterministic key order', () => {
    const input = request(),
      originalToken = input.expectedSourceFingerprint;
    const reordered = Object.fromEntries(Object.entries(input.sequence).reverse());
    expect(getDatedPlanSourceFingerprint(reordered as typeof input.sequence)).toBe(originalToken);
    input.sequence.steps[0].instructorNote = '검토 후 달라진 메모';
    expect(input.sequence.updatedAt).toBe(revisionNow);
    expect(getDatedPlanSourceFingerprint(input.sequence)).not.toBe(originalToken);
    expect(replaceDatedPlanSnapshot(input).success).toBe(false);
    expect(
      replaceDatedPlanSnapshot({ ...request(), expectedSourceFingerprint: undefined as never })
        .success,
    ).toBe(false);
    expect(() =>
      getDatedPlanSourceFingerprint({
        ...input.sequence,
        steps: [{ ...input.sequence.steps[0], sets: 0 }],
      }),
    ).toThrow();
  });

  it('explicitly rebinds a moved occurrence only to the exact live reviewed context, retaining old context', () => {
    const input = request();
    input.schedule.exceptions.push({
      id: 'moved',
      kind: 'reschedule',
      classId: 'class',
      originalDate: '2026-11-02',
      date: '2026-11-03',
      startTime: '11:00',
      endTime: '11:50',
      locationId: 'other-place',
      reason: '',
    });
    expect(replaceDatedPlanSnapshot(input).success).toBe(false);
    expect(
      replaceDatedPlanSnapshot({ ...input, expectedOccurrenceSnapshot: undefined as never })
        .success,
    ).toBe(false);
    const newContext = {
      date: '2026-11-03',
      startTime: '11:00',
      endTime: '11:50',
      locationId: 'other-place',
    };
    const result = replaceDatedPlanSnapshot({ ...input, expectedOccurrenceSnapshot: newContext });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.assignment.occurrenceSnapshot).toEqual(newContext);
    expect(result.assignment.priorVersions![0].occurrenceSnapshot).toEqual(
      input.expectedOccurrenceSnapshot,
    );
    expect(result.assignment.originalDate).toBe('2026-11-02');
    expect(result.assignment.state).toBe('draft');
    input.schedule.exceptions[0] = {
      ...input.schedule.exceptions[0],
      startTime: '11:01',
    } as (typeof input.schedule.exceptions)[0];
    expect(
      replaceDatedPlanSnapshot({ ...input, expectedOccurrenceSnapshot: newContext }).success,
    ).toBe(false);
  });

  it.each(['cancelled', 'closed', 'missing'] as const)(
    'rejects %s occurrence even with a matching displayed context',
    (status) => {
      const input = request();
      if (status === 'cancelled')
        input.schedule.exceptions.push({
          id: 'cancel',
          kind: 'cancel',
          classId: 'class',
          originalDate: '2026-11-02',
          reason: '',
        });
      if (status === 'closed')
        input.schedule.exceptions.push({
          id: 'closed',
          kind: 'closed',
          date: '2026-11-02',
          locationId: 'place',
          reason: '',
        });
      if (status === 'missing') input.schedule.classes = [];
      expect(replaceDatedPlanSnapshot(input).success).toBe(false);
      expect(input.planning).toEqual(revisionAssigned().planning);
    },
  );

  it('retains all20 prior versions and rejects21st without dropping or changing anything', () => {
    let planning: DatedSequencePlanningData = revisionAssigned().planning;
    for (let index = 0; index < DATED_PLAN_PRIOR_VERSION_LIMIT; index++) {
      const result = replaceDatedPlanSnapshot(request(planning));
      expect(result.success).toBe(true);
      if (!result.success) return;
      planning = result.planning;
    }
    expect(planning.assignments[0].priorVersions).toHaveLength(20);
    const before = JSON.stringify(planning),
      result = replaceDatedPlanSnapshot(request(planning));
    expect(result.success).toBe(false);
    expect(result.message).toContain('20');
    expect(JSON.stringify(planning)).toBe(before);
    expect(schema.safeParse(planning).success).toBe(true);
  });

  it('validates oldv3 plus bounded fullhistory and rejects nested, alias, order, source-metadata corruption', () => {
    const old = revisionAssigned();
    expect(schema.safeParse(old.planning).success).toBe(true);
    const result = replaceDatedPlanSnapshot(request());
    expect(result.success).toBe(true);
    if (!result.success) return;
    const valid = JSON.parse(JSON.stringify(result.planning));
    const bad = (mutate: (data: typeof valid) => void) => {
      const data = structuredClone(valid);
      mutate(data);
      expect(schema.safeParse(data).success).toBe(false);
    };
    bad((data) => (data.assignments[0].priorVersions[0].priorVersions = []));
    bad((data) => (data.assignments[0].priorVersions[0].classId = 'different'));
    bad((data) => (data.assignments[0].priorVersions[0].id = 'different'));
    bad((data) => (data.assignments[0].priorVersions[0].createdAt = '2026-11-01'));
    bad((data) => (data.assignments[0].priorVersions[0].sourceSequenceId = 'different'));
    bad((data) => (data.assignments[0].priorVersions[0].updatedAt = data.assignments[0].updatedAt));
    bad(
      (data) =>
        (data.assignments[0].priorVersions = Array(21).fill(data.assignments[0].priorVersions[0])),
    );
  });

  it('preserves current revision history against older same-occurrence backups and rejects ID aliasing', () => {
    const input = request(),
      revised = replaceDatedPlanSnapshot(input);
    expect(revised.success).toBe(true);
    if (!revised.success) return;
    const merged = mergeDatedSequencePlanning(revised.planning, input.planning);
    expect(merged.conflicts).toBe(1);
    expect(merged.planning).toEqual(revised.planning);
    expect(mergeDatedSequencePlanning(revised.planning).planning).toEqual(revised.planning);
    expect(() =>
      mergeDatedSequencePlanning(revised.planning, {
        assignments: [{ ...input.planning.assignments[0], originalDate: '2026-11-09' }],
      }),
    ).toThrow();
  });

  it('copies only the latest snapshot to a fresh next-week draft and never overwrites any assigned target', () => {
    const revised = replaceDatedPlanSnapshot(request());
    expect(revised.success).toBe(true);
    if (!revised.success) return;
    const copied = copyDatedPlanWeek({
      schedule: revisionSchedule(),
      planning: revised.planning,
      sourceStartDate: '2026-11-02',
      targetStartDate: '2026-11-09',
      now: revisionNow,
      createId: () => 'next-week',
    });
    expect(copied.success).toBe(true);
    if (!copied.success) return;
    const target = copied.planning.assignments[1];
    expect(target.sequenceSnapshot).toEqual(revised.assignment.sequenceSnapshot);
    expect(target).not.toHaveProperty('priorVersions');
    expect(target.state).toBe('draft');
    expect(copied.planning.assignments[0]).toEqual(revised.assignment);
    const repeated = copyDatedPlanWeek({
      schedule: revisionSchedule(),
      planning: copied.planning,
      sourceStartDate: '2026-11-02',
      targetStartDate: '2026-11-09',
      now: revisionNow,
      createId: () => 'unused',
    });
    expect(repeated).toMatchObject({ success: true, added: 0, conflicts: 1 });
  });
});
