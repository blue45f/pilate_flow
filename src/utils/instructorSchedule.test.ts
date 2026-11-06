import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { instructorScheduleSchema } from '../schemas/instructorScheduleSchema';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { InstructorScheduleData, InstructorScheduledClass } from '../types/instructorSchedule';
import {
  addScheduleDays,
  expandInstructorSchedule,
  findInstructorScheduleConflicts,
  formatScheduleTime,
  getSchedulePlanWarnings,
  scheduleWeekStart,
} from './instructorSchedule';

const item: InstructorScheduledClass = {
  id: 'weekly',
  title: '직접 입력한 수업',
  participantAlias: '반 별칭',
  locationId: 'place',
  startDate: '2026-11-02',
  untilDate: '2026-11-16',
  startTime: '09:00',
  endTime: '09:50',
  recurrence: 'weekly',
  weekdays: [1, 3],
  notes: '',
};
const data = (): InstructorScheduleData => ({
  locations: [
    { id: 'place', alias: '장소 별칭', equipmentIds: ['mat'], propIds: [], notes: '' },
    { id: 'other', alias: '다른 장소', equipmentIds: ['tower'], propIds: [], notes: '' },
  ],
  classes: [{ ...item }],
  exceptions: [],
});

describe('instructor schedule calendar and exceptions', () => {
  it('starts empty with independent arrays and validates calendar dates, slots, bounds and references', () => {
    const empty = createEmptyInstructorSchedule();
    expect(instructorScheduleSchema.parse(empty)).toEqual({
      locations: [],
      classes: [],
      exceptions: [],
    });
    empty.locations.push(data().locations[0]);
    expect(createEmptyInstructorSchedule().locations).toHaveLength(0);
    for (const patch of [
      { startDate: '2026-02-30' },
      { endTime: '08:59' },
      { startTime: '24:00' },
      { untilDate: '2026-11-01' },
      { untilDate: undefined },
      { weekdays: [] },
      { weekdays: [1, 1] },
      { locationId: 'missing' },
    ]) {
      const value = data();
      value.classes[0] = { ...item, ...patch };
      expect(instructorScheduleSchema.safeParse(value).success).toBe(false);
    }
  });

  it('uses local date arithmetic and displays midnight/noon with AM/PM', () => {
    expect(addScheduleDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addScheduleDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(scheduleWeekStart('2026-11-08')).toBe('2026-11-02');
    expect(formatScheduleTime('00:05')).toBe('오전 12:05');
    expect(formatScheduleTime('12:00')).toBe('오후 12:00');
    expect(formatScheduleTime('23:59')).toBe('오후 11:59');
  });

  it('expands only actual weekdays within inclusive recurrence bounds and once only once', () => {
    const value = data();
    value.classes.push({
      ...item,
      id: 'once',
      recurrence: 'once',
      startDate: '2026-11-05',
      weekdays: [],
      untilDate: undefined,
    });
    expect(
      expandInstructorSchedule(value, '2026-11-01', '2026-11-17').map((row) => [
        row.classId,
        row.date,
      ]),
    ).toEqual([
      ['weekly', '2026-11-02'],
      ['weekly', '2026-11-04'],
      ['once', '2026-11-05'],
      ['weekly', '2026-11-09'],
      ['weekly', '2026-11-11'],
      ['weekly', '2026-11-16'],
    ]);
  });

  it('keeps cancellations visible and applies location-specific and all-location closures', () => {
    const value = data();
    value.classes.push({ ...item, id: 'elsewhere', locationId: 'other' });
    value.exceptions = [
      {
        id: 'cancel',
        kind: 'cancel',
        classId: item.id,
        originalDate: '2026-11-02',
        reason: '직접 취소',
      },
      { id: 'closed', kind: 'closed', date: '2026-11-04', locationId: 'place', reason: '휴무' },
      { id: 'all', kind: 'closed', date: '2026-11-09', reason: '' },
    ];
    const rows = expandInstructorSchedule(value, '2026-11-02', '2026-11-09');
    expect(rows.find((r) => r.id === 'weekly@2026-11-02')?.status).toBe('cancelled');
    expect(rows.find((r) => r.id === 'weekly@2026-11-04')?.status).toBe('closed');
    expect(rows.find((r) => r.id === 'elsewhere@2026-11-04')?.status).toBe('scheduled');
    expect(rows.filter((r) => r.date === '2026-11-09').every((r) => r.status === 'closed')).toBe(
      true,
    );
  });

  it('moves a single occurrence from outside the viewed range without mutating the recurrence', () => {
    const value = data();
    value.exceptions.push({
      id: 'move',
      kind: 'reschedule',
      classId: item.id,
      originalDate: '2026-11-02',
      date: '2026-11-12',
      startTime: '13:00',
      endTime: '14:00',
      locationId: 'other',
      reason: '회차 변경',
    });
    const original = expandInstructorSchedule(value, '2026-11-02', '2026-11-02')[0];
    expect(original).toMatchObject({ status: 'moved', movedTo: '2026-11-12' });
    const moved = expandInstructorSchedule(value, '2026-11-12', '2026-11-12');
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({
      originalDate: '2026-11-02',
      date: '2026-11-12',
      startTime: '13:00',
      locationId: 'other',
      status: 'scheduled',
    });
    expect(value.classes[0]).toEqual(item);
    value.exceptions = [];
    expect(expandInstructorSchedule(value, '2026-11-02', '2026-11-02')[0].status).toBe('scheduled');
  });

  it('shows a same-day time move once and marks a moved-to-closed date unavailable', () => {
    const value = data();
    value.exceptions = [
      {
        id: 'move',
        kind: 'reschedule',
        classId: item.id,
        originalDate: '2026-11-02',
        date: '2026-11-02',
        startTime: '13:00',
        endTime: '14:00',
        reason: '',
      },
      { id: 'closed', kind: 'closed', date: '2026-11-02', reason: '휴무' },
    ];
    const rows = expandInstructorSchedule(value, '2026-11-02', '2026-11-02');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: 'closed',
      startTime: '13:00',
      movedFrom: '2026-11-02',
    });
  });

  it('rejects duplicate logical exceptions, impossible original dates and unknown exact apparatus', () => {
    const value = data();
    value.exceptions = [
      { id: 'a', kind: 'cancel', classId: item.id, originalDate: '2026-11-02', reason: '' },
      { id: 'b', kind: 'cancel', classId: item.id, originalDate: '2026-11-02', reason: '' },
    ];
    expect(instructorScheduleSchema.safeParse(value).success).toBe(false);
    value.exceptions = [
      { id: 'a', kind: 'cancel', classId: item.id, originalDate: '2026-11-03', reason: '' },
    ];
    expect(instructorScheduleSchema.safeParse(value).success).toBe(false);
    expect(
      instructorScheduleSchema.safeParse({
        ...data(),
        locations: [{ ...data().locations[0], equipmentIds: ['tower-chair'] }],
      }).success,
    ).toBe(false);
  });

  it('checks actual intervals across places, treats touching endpoints as adjacent and ignores inactive rows', () => {
    const value = data();
    value.classes.push(
      { ...item, id: 'overlap', locationId: 'other', startTime: '09:30', endTime: '10:20' },
      { ...item, id: 'adjacent', startTime: '10:20', endTime: '11:00' },
    );
    const rows = expandInstructorSchedule(value, '2026-11-02', '2026-11-02');
    expect(findInstructorScheduleConflicts(rows)).toEqual([
      {
        leftId: 'weekly@2026-11-02',
        rightId: 'overlap@2026-11-02',
        date: '2026-11-02',
        startTime: '09:30',
        endTime: '09:50',
      },
    ]);
    expect(
      findInstructorScheduleConflicts(rows.map((r) => ({ ...r, status: 'cancelled' as const }))),
    ).toEqual([]);
  });

  it('compares plan total including rests and exact apparatus/props without treating tower as cadillac', () => {
    const value = data();
    const exercise = {
      ...INITIAL_EXERCISES[0],
      id: 'exact',
      requiredEquipment: ['cadillac'],
      props: ['loop-band'] as const,
    };
    const sequence = {
      ...INITIAL_SAVED_SEQUENCES[0],
      id: 'linked',
      targetMinutes: 50,
      steps: [
        { ...INITIAL_SAVED_SEQUENCES[0].steps[0], exerciseId: exercise.id, durationMin: 45 },
        {
          ...INITIAL_SAVED_SEQUENCES[0].steps[0],
          stepId: 'rest',
          kind: 'rest' as const,
          exerciseId: '',
          durationMin: 5,
        },
      ],
    };
    const row = {
      ...expandInstructorSchedule(value, '2026-11-02', '2026-11-02')[0],
      locationId: 'other',
      linkSavedSequenceId: sequence.id,
    };
    const warnings = getSchedulePlanWarnings(
      row,
      value,
      [sequence],
      [{ ...exercise, props: [...exercise.props] }],
    );
    expect(warnings).toEqual(['장소 준비물 부족: 캐딜락, 루프 밴드']);
    expect(
      getSchedulePlanWarnings(
        { ...row, endTime: '09:45' },
        value,
        [sequence],
        [{ ...exercise, props: [...exercise.props] }],
      )[0],
    ).toContain('계획 50분 (쉬는 시간 포함) · 일정 45분: 5분 초과');
    expect(getSchedulePlanWarnings(row, value, [], [])).toEqual([
      '연결한 저장 시퀀스를 찾을 수 없습니다. 다시 선택해 주세요.',
    ]);
  });
});
