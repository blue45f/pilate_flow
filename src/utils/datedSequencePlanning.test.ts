import { describe, expect, it } from 'vitest';
import { sequenceSchema } from '../schemas/cloudBackupSchema';
import {
  createDatedPlanningSchema,
  DATED_PLAN_LIMIT,
} from '../schemas/datedSequencePlanningSchema';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { createEmptyDatedSequencePlanning } from '../types/datedSequencePlanning';
import type {
  DatedSequencePlanAssignment,
  DatedSequencePlanningData,
} from '../types/datedSequencePlanning';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { SavedSequence } from '../types/pilates';
import { expandInstructorSchedule } from './instructorSchedule';
import {
  copyDatedPlanWeek,
  createDatedPlanAssignment,
  getDatedPlanKey,
  getDatedPlanWarnings,
  mergeDatedSequencePlanning,
  previewDatedPlanWeekCopy,
  resolveDatedPlanOccurrence,
  setDatedPlanState,
} from './datedSequencePlanning';

const now = '2026-11-04T10:00:00.000Z';
const later = '2026-11-04T11:00:00.000Z';
const exercise = syntheticPlanningExercise('mat', 'core');
const schema = createDatedPlanningSchema(sequenceSchema);

function schedule(): InstructorScheduleData {
  return {
    locations: [
      {
        id: 'mat-place',
        alias: '장소 별칭',
        equipmentIds: ['mat'],
        propIds: [],
        notes: '',
      },
      {
        id: 'other-place',
        alias: '다른 장소',
        equipmentIds: ['reformer'],
        propIds: ['mini-ball'],
        notes: '',
      },
    ],
    classes: [
      {
        id: 'class@weekly',
        title: '직접 등록 수업',
        participantAlias: '별칭',
        locationId: 'mat-place',
        startDate: '2026-10-26',
        untilDate: '2026-11-30',
        startTime: '09:00',
        endTime: '09:50',
        recurrence: 'weekly',
        weekdays: [1, 3],
        notes: '',
      },
    ],
    exceptions: [],
  };
}

function sequence(): SavedSequence {
  return {
    id: 'source-sequence',
    title: '원본 수업',
    subtitle: '직접 구성',
    apparatus: 'mat',
    level: '2.0',
    focusTags: ['직접 입력'],
    targetMinutes: 50,
    steps: [
      {
        stepId: 'exercise-step',
        order: 1,
        exerciseId: exercise.id,
        blockCategory: 'core',
        selectedLayer: 'standard',
        durationMin: 48,
        repetitions: 8,
        sets: 2,
        sideMode: 'left-then-right',
        explanationSec: 30,
        transitionSec: 30,
        instructorNote: '강사 메모',
        customSpringOverride: '수업별 설정',
        locked: true,
      },
      {
        stepId: 'rest-step',
        order: 2,
        kind: 'rest',
        exerciseId: '',
        blockCategory: 'cooldown',
        selectedLayer: 'standard',
        durationMin: 2,
      },
    ],
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    taughtCount: 3,
    criteriaSnapshot: {
      apparatus: 'mat',
      availableEquipment: ['mat'],
      preferredProps: [],
      level: '2.0',
      focusPreset: 'full-body',
      excludeDaysWindow: 0,
      targetMinutes: 50,
      restMinutes: 2,
      defaultLayer: 'standard',
      planningGoals: ['mobility'],
      targetGroupId: 'group-alias',
    },
  };
}

function assigned(
  data = schedule(),
  originalDate = '2026-11-02',
  planning = createEmptyDatedSequencePlanning(),
  assignmentId = `assignment-${originalDate}`,
  state: 'draft' | 'prepared' = 'draft',
): {
  assignment: DatedSequencePlanAssignment;
  planning: DatedSequencePlanningData;
} {
  const result = createDatedPlanAssignment({
    schedule: data,
    planning,
    sequence: sequence(),
    classId: data.classes[0].id,
    originalDate,
    now,
    assignmentId,
    state,
  });
  if (!result.success) throw new Error(result.message);
  return result;
}

describe('dated plan immutable snapshots and bounded schema', () => {
  it('starts independently empty and captures all plan fields without mutating inputs or live counters', () => {
    const data = schedule(),
      source = sequence(),
      empty = createEmptyDatedSequencePlanning();
    const before = JSON.stringify({ data, source, empty });
    const result = createDatedPlanAssignment({
      schedule: data,
      planning: empty,
      sequence: source,
      classId: data.classes[0].id,
      originalDate: '2026-11-02',
      now,
      assignmentId: 'snapshot',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(JSON.stringify({ data, source, empty })).toBe(before);
    expect(result.assignment.sequenceSnapshot).toEqual(source);
    expect(result.assignment.sequenceSnapshot.steps[0]).toMatchObject({
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      customSpringOverride: '수업별 설정',
      instructorNote: '강사 메모',
      locked: true,
    });
    expect(result.assignment.sequenceSnapshot.steps[1].kind).toBe('rest');
    source.title = '나중에 바꾼 원본';
    source.steps[0].sets = 99;
    source.criteriaSnapshot!.availableEquipment!.push('reformer');
    expect(result.assignment.sequenceSnapshot.title).toBe('원본 수업');
    expect(result.assignment.sequenceSnapshot.steps[0].sets).toBe(2);
    expect(result.assignment.sequenceSnapshot.criteriaSnapshot?.availableEquipment).toEqual([
      'mat',
    ]);
    for (const value of [
      result.planning,
      result.planning.assignments,
      result.assignment,
      result.assignment.occurrenceSnapshot,
      result.assignment.sequenceSnapshot,
      result.assignment.sequenceSnapshot.steps,
      result.assignment.sequenceSnapshot.steps[0],
      result.assignment.sequenceSnapshot.criteriaSnapshot,
      result.assignment.sequenceSnapshot.criteriaSnapshot?.availableEquipment,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    expect(source.taughtCount).toBe(3);
    expect(empty.assignments).toHaveLength(0);
    expect(createEmptyDatedSequencePlanning()).not.toBe(empty);
  });

  it('keeps orphan references in validated backup data and makes semantic identity delimiter safe', () => {
    const value = assigned().assignment;
    expect(
      schema.parse({ assignments: [{ ...value, classId: 'unknown-class' }] }).assignments[0]
        .classId,
    ).toBe('unknown-class');
    expect(getDatedPlanKey('a@2026-11-02', '2026-11-09')).not.toBe(
      getDatedPlanKey('a', '2026-11-02@2026-11-09'),
    );
    expect(getDatedPlanKey('class@weekly', '2026-11-02')).toBe('["class@weekly","2026-11-02"]');
  });

  it('preserves exact historical source IDs and metadata limits supported by SavedSequence', () => {
    const data = schedule();
    for (const sourceUpdatedAt of ['', 'x'.repeat(20000)]) {
      const source = sequence();
      source.id = ` ${'x'.repeat(298)} `;
      source.updatedAt = sourceUpdatedAt;
      const result = createDatedPlanAssignment({
        schedule: data,
        sequence: source,
        classId: 'class@weekly',
        originalDate: '2026-11-02',
        now,
        assignmentId: 'historical-source',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.assignment.sourceSequenceId).toBe(source.id);
        expect(result.assignment.sequenceSnapshot.id).toBe(source.id);
        expect(result.assignment.sourceSequenceUpdatedAt).toBe(sourceUpdatedAt);
      }
    }
  });

  it('rejects malformed IDs, dates, states, snapshot aliases, duplicate keys and unsupported JSON without partial mutation', () => {
    const value = assigned().assignment;
    for (const patch of [
      { id: 'x'.repeat(201) },
      { id: '' },
      { originalDate: '2026-02-30' },
      { state: 'approved' },
      { createdAt: 'not-a-date' },
      { sourceSequenceId: 'wrong' },
      { sourceSequenceUpdatedAt: 'different' },
      { occurrenceSnapshot: { ...value.occurrenceSnapshot, endTime: '08:00' } },
      { sequenceSnapshot: { ...value.sequenceSnapshot, unsupported: () => 1 } },
    ])
      expect(schema.safeParse({ assignments: [{ ...value, ...patch }] }).success).toBe(false);
    expect(schema.safeParse({ assignments: [value, { ...value, id: 'other' }] }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({
        assignments: [value, { ...value, originalDate: '2026-11-04' }],
      }).success,
    ).toBe(false);
    expect(schema.safeParse({ assignments: [], unexpected: true }).success).toBe(false);
    const overLimit = schema.safeParse({
      assignments: Array(DATED_PLAN_LIMIT + 1).fill(value),
    });
    expect(overLimit.success).toBe(false);
    if (!overLimit.success)
      expect(
        overLimit.error.issues.some(
          (issue) => issue.code === 'too_big' && issue.path[0] === 'assignments',
        ),
      ).toBe(true);
  });

  it('never silently replaces an assigned occurrence or aliases a distinct occurrence ID', () => {
    const current = assigned();
    const before = JSON.stringify(current.planning);
    const repeated = createDatedPlanAssignment({
      schedule: schedule(),
      planning: current.planning,
      sequence: sequence(),
      classId: 'class@weekly',
      originalDate: '2026-11-02',
      now,
      assignmentId: 'different-id',
    });
    const alias = createDatedPlanAssignment({
      schedule: schedule(),
      planning: current.planning,
      sequence: sequence(),
      classId: 'class@weekly',
      originalDate: '2026-11-04',
      now,
      assignmentId: current.assignment.id,
    });
    expect(repeated.success).toBe(false);
    expect(alias.success).toBe(false);
    expect(JSON.stringify(current.planning)).toBe(before);
  });
});

describe('effective local occurrence resolution and organization state', () => {
  it.each([
    'normal',
    'cancel',
    'global-closure',
    'same-date-move',
    'move-in',
    'destination-closure',
    'far-move',
  ] as const)('matches shared calendar expansion exactly for %s', (kind) => {
    const data = schedule();
    let effectiveDate = '2026-11-02';
    if (kind === 'cancel')
      data.exceptions.push({
        id: 'cancel',
        kind: 'cancel',
        classId: 'class@weekly',
        originalDate: '2026-11-02',
        reason: '직접 취소',
      });
    if (kind === 'global-closure')
      data.exceptions.push({
        id: 'closed',
        kind: 'closed',
        date: effectiveDate,
        reason: '전체 휴무',
      });
    if (['same-date-move', 'move-in', 'destination-closure', 'far-move'].includes(kind)) {
      effectiveDate =
        kind === 'same-date-move'
          ? effectiveDate
          : kind === 'far-move'
            ? '2028-11-02'
            : '2026-11-03';
      data.exceptions.push({
        id: 'move',
        kind: 'reschedule',
        classId: 'class@weekly',
        originalDate: '2026-11-02',
        date: effectiveDate,
        startTime: '11:00',
        endTime: '11:50',
        locationId: 'other-place',
        reason: '직접 변경',
      });
      data.exceptions.push({
        id: 'old-place-closed',
        kind: 'closed',
        date: effectiveDate,
        locationId: 'mat-place',
        reason: '원래 장소만 휴무',
      });
      if (kind === 'destination-closure')
        data.exceptions.push({
          id: 'new-place-closed',
          kind: 'closed',
          date: effectiveDate,
          locationId: 'other-place',
          reason: '변경 장소 휴무',
        });
    }
    const shared = expandInstructorSchedule(data, effectiveDate, effectiveDate).find(
      (row) => row.classId === 'class@weekly' && row.originalDate === '2026-11-02',
    );
    const resolved = resolveDatedPlanOccurrence(data, 'class@weekly', '2026-11-02');
    expect(resolved.occurrence).toEqual(shared);
    expect(resolved.status).toBe(shared!.status);
  });

  it('matches the calendar destination across moved-in, same-date, cancellation and venue closure cases', () => {
    const data = schedule();
    data.exceptions.push({
      id: 'move',
      kind: 'reschedule',
      classId: 'class@weekly',
      originalDate: '2026-10-26',
      date: '2026-11-03',
      startTime: '10:00',
      endTime: '10:50',
      locationId: 'other-place',
      reason: '직접 변경',
    });
    const result = resolveDatedPlanOccurrence(data, 'class@weekly', '2026-10-26');
    const calendar = expandInstructorSchedule(data, '2026-11-03', '2026-11-03').find(
      (row) => row.originalDate === '2026-10-26',
    );
    expect(result.status).toBe('scheduled');
    expect(result.occurrence).toMatchObject(calendar!);
    expect(result.occurrence).toMatchObject({
      originalDate: '2026-10-26',
      date: '2026-11-03',
      locationId: 'other-place',
    });
    data.exceptions.push({
      id: 'old-place-closed',
      kind: 'closed',
      date: '2026-11-03',
      locationId: 'mat-place',
      reason: '',
    });
    expect(resolveDatedPlanOccurrence(data, 'class@weekly', '2026-10-26').status).toBe('scheduled');
    data.exceptions.push({
      id: 'new-place-closed',
      kind: 'closed',
      date: '2026-11-03',
      locationId: 'other-place',
      reason: '',
    });
    expect(resolveDatedPlanOccurrence(data, 'class@weekly', '2026-10-26').status).toBe('closed');
    const sameDay = schedule();
    sameDay.exceptions.push({
      id: 'same-day',
      kind: 'reschedule',
      classId: 'class@weekly',
      originalDate: '2026-11-02',
      date: '2026-11-02',
      startTime: '11:00',
      endTime: '11:50',
      locationId: 'other-place',
      reason: '',
    });
    expect(
      resolveDatedPlanOccurrence(sameDay, 'class@weekly', '2026-11-02').occurrence,
    ).toMatchObject({
      id: 'class@weekly@2026-11-02:rescheduled',
      originalDate: '2026-11-02',
      startTime: '11:00',
      locationId: 'other-place',
    });
    const cancel = schedule();
    cancel.exceptions.push({
      id: 'cancel',
      kind: 'cancel',
      classId: 'class@weekly',
      originalDate: '2026-11-02',
      reason: '',
    });
    expect(resolveDatedPlanOccurrence(cancel, 'class@weekly', '2026-11-02').status).toBe(
      'cancelled',
    );
    expect(resolveDatedPlanOccurrence(cancel, 'class@weekly', '2026-11-03').status).toBe('missing');
    expect(resolveDatedPlanOccurrence(cancel, 'missing', '2026-11-02').occurrence).toBeNull();
  });

  it('keeps two original occurrences distinct when a reschedule shares an actual class date', () => {
    const data = schedule();
    data.exceptions.push({
      id: 'move',
      kind: 'reschedule',
      classId: 'class@weekly',
      originalDate: '2026-11-02',
      date: '2026-11-04',
      startTime: '10:00',
      endTime: '10:50',
      reason: '',
    });
    const first = assigned(data, '2026-11-02');
    const second = assigned(data, '2026-11-04', first.planning);
    expect(second.planning.assignments).toHaveLength(2);
    expect(second.planning.assignments.map((item) => item.occurrenceSnapshot.date)).toEqual([
      '2026-11-04',
      '2026-11-04',
    ]);
    expect(
      new Set(
        second.planning.assignments.map((item) => getDatedPlanKey(item.classId, item.originalDate)),
      ).size,
    ).toBe(2);
  });

  it.each(['cancelled', 'closed', 'missing', 'context-drift'] as const)(
    'blocks new/prepared claims for %s effective context without rewriting the snapshot',
    (kind) => {
      const current = assigned();
      const data = schedule();
      if (kind === 'cancelled')
        data.exceptions.push({
          id: 'cancel',
          kind: 'cancel',
          classId: 'class@weekly',
          originalDate: '2026-11-02',
          reason: '',
        });
      if (kind === 'closed')
        data.exceptions.push({
          id: 'closed',
          kind: 'closed',
          date: '2026-11-02',
          reason: '',
        });
      if (kind === 'missing') data.classes = [];
      if (kind === 'context-drift') data.classes[0].locationId = 'other-place';
      const before = JSON.stringify(current.planning);
      expect(
        setDatedPlanState({
          schedule: data,
          planning: current.planning,
          assignmentId: current.assignment.id,
          state: 'prepared',
          now: later,
        }).success,
      ).toBe(false);
      if (kind !== 'context-drift')
        expect(
          createDatedPlanAssignment({
            schedule: data,
            sequence: sequence(),
            classId: 'class@weekly',
            originalDate: '2026-11-02',
            now,
            assignmentId: 'new',
          }).success,
        ).toBe(false);
      expect(JSON.stringify(current.planning)).toBe(before);
      expect(
        getDatedPlanWarnings({
          assignment: current.assignment,
          schedule: data,
          exercises: [exercise],
        }).length,
      ).toBeGreaterThan(0);
    },
  );

  it('changes only organizational state, rejects a stale edit, and can return an orphan to draft', () => {
    const current = assigned();
    const sourceBefore = JSON.stringify(sequence());
    const data = schedule();
    const scheduleBefore = JSON.stringify(data);
    const result = setDatedPlanState({
      schedule: data,
      planning: current.planning,
      assignmentId: current.assignment.id,
      state: 'prepared',
      now: later,
      expectedUpdatedAt: now,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.planning.assignments[0]).toEqual({
      ...current.assignment,
      state: 'prepared',
      updatedAt: later,
    });
    expect(JSON.stringify(sequence())).toBe(sourceBefore);
    expect(JSON.stringify(data)).toBe(scheduleBefore);
    expect(current.assignment.state).toBe('draft');
    expect(
      setDatedPlanState({
        schedule: data,
        planning: result.planning,
        assignmentId: current.assignment.id,
        state: 'draft',
        now: later,
        expectedUpdatedAt: now,
      }).success,
    ).toBe(false);
    data.classes = [];
    const draft = setDatedPlanState({
      schedule: data,
      planning: result.planning,
      assignmentId: current.assignment.id,
      state: 'draft',
      now: later,
    });
    expect(draft.success).toBe(true);
  });

  it('uses snapshot rest-inclusive time and the current exact venue inventory for warnings', () => {
    const current = assigned();
    const data = schedule();
    expect(
      getDatedPlanWarnings({
        assignment: current.assignment,
        schedule: data,
        exercises: [exercise],
      }),
    ).toEqual([]);
    data.classes[0].endTime = '09:48';
    data.classes[0].locationId = 'other-place';
    const warnings = getDatedPlanWarnings({
      assignment: current.assignment,
      schedule: data,
      exercises: [exercise],
    });
    expect(
      warnings.some((text) => text.includes('50분 (쉬는 시간 포함)') && text.includes('48분')),
    ).toBe(true);
    expect(warnings.some((text) => text.includes('장소 준비물 부족'))).toBe(true);
    expect(warnings.some((text) => text.includes('변경'))).toBe(true);
    expect(
      getDatedPlanWarnings({
        assignment: current.assignment,
        schedule: data,
        exercises: [],
      }).some((text) => text.includes('정보를 확인할 수 없습니다')),
    ).toBe(true);
    expect(current.assignment.occurrenceSnapshot.locationId).toBe('mat-place');
  });
});

describe('insert-only bounded next-week copy', () => {
  it('includes Sunday boundary moves in each seven-day window while retaining original Monday identity', () => {
    const data = schedule();
    data.exceptions.push(
      {
        id: 'source-sunday',
        kind: 'reschedule',
        classId: 'class@weekly',
        originalDate: '2026-11-02',
        date: '2026-11-08',
        startTime: '09:00',
        endTime: '09:50',
        reason: '일요일 이동',
      },
      {
        id: 'target-sunday',
        kind: 'reschedule',
        classId: 'class@weekly',
        originalDate: '2026-11-09',
        date: '2026-11-15',
        startTime: '10:00',
        endTime: '10:50',
        locationId: 'other-place',
        reason: '다음 일요일 이동',
      },
    );
    const current = assigned(data);
    const result = copyDatedPlanWeek({
      schedule: data,
      planning: current.planning,
      sourceStartDate: '2026-11-02',
      targetStartDate: '2026-11-09',
      now: later,
      createId: () => 'sunday-copy',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.added).toBe(1);
      expect(result.planning.assignments[1]).toMatchObject({
        originalDate: '2026-11-09',
        occurrenceSnapshot: { date: '2026-11-15', locationId: 'other-place' },
      });
    }
  });

  it('copies original recurrence identities, resolves target moves/venues, keeps existing prepared targets and resets copied state to draft', () => {
    const data = schedule();
    data.exceptions.push({
      id: 'move-next',
      kind: 'reschedule',
      classId: 'class@weekly',
      originalDate: '2026-11-11',
      date: '2026-11-12',
      startTime: '11:00',
      endTime: '11:50',
      locationId: 'other-place',
      reason: '',
    });
    const mon = assigned(data, '2026-11-02', undefined, 'source-mon', 'prepared');
    const wed = assigned(data, '2026-11-04', mon.planning, 'source-wed', 'prepared');
    const target = assigned(data, '2026-11-09', wed.planning, 'existing-target', 'prepared');
    const before = JSON.stringify(target.planning);
    const input = {
      schedule: data,
      planning: target.planning,
      sourceStartDate: '2026-11-02',
      targetStartDate: '2026-11-09',
    };
    const preview = previewDatedPlanWeekCopy(input);
    expect(preview.success).toBe(true);
    if (!preview.success) return;
    expect(preview.conflicts).toBe(1);
    expect(preview.skipped).toEqual([
      {
        key: getDatedPlanKey('class@weekly', '2026-11-09'),
        code: 'already-assigned',
      },
    ]);
    expect(preview.proposals).toHaveLength(1);
    expect(preview.proposals[0]).toMatchObject({
      originalDate: '2026-11-11',
      occurrenceSnapshot: {
        date: '2026-11-12',
        locationId: 'other-place',
        startTime: '11:00',
      },
    });
    const result = copyDatedPlanWeek({
      ...input,
      now: later,
      createId: () => 'copy-new',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.added).toBe(1);
    expect(result.conflicts).toBe(1);
    const copied = result.planning.assignments.find((item) => item.id === 'copy-new')!;
    expect(copied.state).toBe('draft');
    expect(copied.sequenceSnapshot).toEqual(wed.assignment.sequenceSnapshot);
    expect(copied.sequenceSnapshot).not.toBe(wed.assignment.sequenceSnapshot);
    expect(result.planning.assignments.find((item) => item.id === 'existing-target')).toEqual(
      target.assignment,
    );
    expect(JSON.stringify(target.planning)).toBe(before);
    expect(Object.isFrozen(preview.proposals[0].sequenceSnapshot.steps)).toBe(true);
  });

  it.each(['cancelled', 'closed', 'expired', 'once', 'moved-outside'] as const)(
    'reports %s next-week targets instead of inventing or hiding copies',
    (kind) => {
      const data = schedule();
      if (kind === 'once') {
        data.classes[0].recurrence = 'once';
        data.classes[0].startDate = '2026-11-02';
        data.classes[0].weekdays = [];
      }
      const current = assigned(data);
      if (kind === 'cancelled')
        data.exceptions.push({
          id: 'cancel',
          kind: 'cancel',
          classId: 'class@weekly',
          originalDate: '2026-11-09',
          reason: '',
        });
      if (kind === 'closed')
        data.exceptions.push({
          id: 'closed',
          kind: 'closed',
          date: '2026-11-09',
          locationId: 'mat-place',
          reason: '',
        });
      if (kind === 'expired') data.classes[0].untilDate = '2026-11-08';
      if (kind === 'moved-outside')
        data.exceptions.push({
          id: 'move',
          kind: 'reschedule',
          classId: 'class@weekly',
          originalDate: '2026-11-09',
          date: '2026-11-16',
          startTime: '09:00',
          endTime: '09:50',
          reason: '',
        });
      const result = copyDatedPlanWeek({
        schedule: data,
        planning: current.planning,
        sourceStartDate: '2026-11-02',
        targetStartDate: '2026-11-09',
        now: later,
        createId: () => 'never-created',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.added).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.planning).toEqual(current.planning);
      expect(result.skipped[0].code).toBe(
        kind === 'moved-outside'
          ? 'target-outside-week'
          : kind === 'once' || kind === 'expired'
            ? 'target-missing'
            : 'target-inactive',
      );
    },
  );

  it('shifts the original date rather than a moved visible date and never copies an inactive source', () => {
    const data = schedule();
    data.exceptions.push({
      id: 'source-move',
      kind: 'reschedule',
      classId: 'class@weekly',
      originalDate: '2026-11-02',
      date: '2026-11-03',
      startTime: '09:00',
      endTime: '09:50',
      reason: '',
    });
    const current = assigned(data);
    const input = {
      schedule: data,
      planning: current.planning,
      sourceStartDate: '2026-11-02',
      targetStartDate: '2026-11-09',
    };
    const preview = previewDatedPlanWeekCopy(input);
    expect(preview.success).toBe(true);
    if (preview.success) expect(preview.proposals[0].originalDate).toBe('2026-11-09');
    data.exceptions = [
      {
        id: 'cancel',
        kind: 'cancel',
        classId: 'class@weekly',
        originalDate: '2026-11-02',
        reason: '',
      },
    ];
    const cancelled = previewDatedPlanWeekCopy(input);
    expect(cancelled.success).toBe(true);
    if (cancelled.success) {
      expect(cancelled.proposals).toHaveLength(0);
      expect(cancelled.skipped[0].code).toBe('source-inactive');
    }
  });

  it('rechecks a stale preview against current assignments and rejects duplicate generated IDs atomically', () => {
    const data = schedule();
    const first = assigned(data);
    const two = assigned(data, '2026-11-04', first.planning);
    const input = {
      schedule: data,
      planning: two.planning,
      sourceStartDate: '2026-11-02',
      targetStartDate: '2026-11-09',
    };
    const preview = previewDatedPlanWeekCopy(input);
    expect(preview.success && preview.proposals.length).toBe(2);
    const changed = assigned(data, '2026-11-09', two.planning, 'newer-target', 'prepared');
    const copied = copyDatedPlanWeek({
      ...input,
      planning: changed.planning,
      now: later,
      createId: () => 'copy-wed',
    });
    expect(copied.success).toBe(true);
    if (copied.success) {
      expect(copied.added).toBe(1);
      expect(copied.conflicts).toBe(1);
      expect(copied.planning.assignments.find((item) => item.id === 'newer-target')).toEqual(
        changed.assignment,
      );
    }
    const before = JSON.stringify(two.planning);
    let calls = 0;
    const invalid = copyDatedPlanWeek({
      ...input,
      now: later,
      createId: () => (++calls === 1 ? 'unused-unique' : first.assignment.id),
    });
    expect(invalid.success).toBe(false);
    expect(JSON.stringify(two.planning)).toBe(before);
  });

  it('rejects unbounded or non-next-week requests and handles a year boundary as local dates', () => {
    const current = assigned();
    for (const [sourceStartDate, targetStartDate] of [
      ['2026-11-02', '2026-11-16'],
      ['2026-11-02', '2026-11-08'],
      ['2026-02-30', '2026-03-09'],
      ['2199-12-24', '2199-12-31'],
    ])
      expect(
        previewDatedPlanWeekCopy({
          schedule: schedule(),
          planning: current.planning,
          sourceStartDate,
          targetStartDate,
        }).success,
      ).toBe(false);
    const data = schedule();
    data.classes[0].startDate = '2026-12-28';
    data.classes[0].untilDate = '2027-01-11';
    const endYear = assigned(data, '2026-12-28');
    const result = copyDatedPlanWeek({
      schedule: data,
      planning: endYear.planning,
      sourceStartDate: '2026-12-28',
      targetStartDate: '2027-01-04',
      now: later,
      createId: () => 'new-year',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.planning.assignments[1].originalDate).toBe('2027-01-04');
  });
});

describe('backward-compatible atomic dated-plan recovery', () => {
  it('preserves local plans when older backups omit the field and keeps local semantic-key edits', () => {
    const local = assigned();
    expect(mergeDatedSequencePlanning(local.planning).planning).toEqual(local.planning);
    const imported = schema.parse({
      assignments: [
        {
          ...local.assignment,
          id: 'different-import-id',
          state: 'prepared',
          updatedAt: later,
        },
      ],
    });
    const merged = mergeDatedSequencePlanning(local.planning, imported);
    expect(merged).toMatchObject({ added: 0, conflicts: 1 });
    expect(merged.planning.assignments).toEqual([local.assignment]);
    expect(merged.conflictKeys).toEqual([
      getDatedPlanKey(local.assignment.classId, local.assignment.originalDate),
    ]);
    expect(mergeDatedSequencePlanning(local.planning, local.planning).conflicts).toBe(0);
  });

  it('adds independent/orphan snapshots but fails ID alias and malformed aggregates without mutating either input', () => {
    const local = assigned();
    const other = schema.parse({
      assignments: [
        {
          ...local.assignment,
          id: 'orphan-id',
          classId: 'missing-class',
          originalDate: '2026-11-04',
        },
      ],
    });
    const added = mergeDatedSequencePlanning(local.planning, other);
    expect(added.added).toBe(1);
    expect(added.planning.assignments[1].classId).toBe('missing-class');
    const before = JSON.stringify(local.planning);
    const alias = schema.parse({
      assignments: [{ ...local.assignment, originalDate: '2026-11-04' }],
    });
    expect(() => mergeDatedSequencePlanning(local.planning, alias)).toThrow('같은 ID');
    expect(() =>
      mergeDatedSequencePlanning(local.planning, {
        assignments: [local.assignment, local.assignment],
      }),
    ).toThrow();
    expect(JSON.stringify(local.planning)).toBe(before);
    expect(Object.isFrozen(added.planning.assignments[1].sequenceSnapshot.steps)).toBe(true);
  });
});
