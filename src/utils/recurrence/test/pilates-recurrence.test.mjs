// @ts-check
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  MAX_HARD_RANGE_DAYS,
  addKstDays,
  createDeterministicKstClock,
  detectScheduleConflicts,
  diffKstDays,
  epochMsToKstParts,
  expandKstDateRange,
  expandPilatesSchedule,
  getElapsedWeeksSinceAnchor,
  getKstWeekday,
  getKstWeekOfMonth,
  getKstWeekStart,
  isValidKstDate,
  kstDateToEpochMs,
  parseKstInstantToEpochMs,
  resolveKstTimeWindow,
  ruleMatchesKstDate,
  summarizeResourceConflicts,
  validateRecurrenceRule,
  validateScheduleExceptions,
} from '../src/index.mjs';
import { createVirtualTimetableFixture } from './fixtures.mjs';

describe('1. KST Calendar & Deterministic Clock', () => {
  test('T01: validates Gregorian KST calendar dates including leap years and century bounds', () => {
    assert.equal(isValidKstDate('2026-11-09'), true);
    assert.equal(isValidKstDate('2028-02-29'), true);
    assert.equal(isValidKstDate('2026-02-29'), false);
    assert.equal(isValidKstDate('2026-04-31'), false);
    assert.equal(isValidKstDate('1899-12-31'), false);
    assert.equal(isValidKstDate('2200-01-01'), false);
    assert.equal(isValidKstDate('2026/11/09'), false);
  });

  test('T02: converts KST midnight to exact UTC-9h epoch ms independent of host timezone', () => {
    const expectedUtcMs = Date.UTC(2026, 10, 8, 15, 0, 0, 0);
    const actualMs = kstDateToEpochMs('2026-11-09', 0);
    assert.equal(actualMs, expectedUtcMs);

    const parts = epochMsToKstParts(actualMs);
    assert.equal(parts.date, '2026-11-09');
    assert.equal(parts.time, '00:00');
    assert.equal(parts.isoKst, '2026-11-09T00:00:00+09:00');
    assert.equal(parts.weekday, 1);
    assert.equal(parts.weekdayLabelKo, '월');
  });

  test('T03: deterministic KST clock supports fixed initialization, advancing, and resetting', () => {
    const clock = createDeterministicKstClock('2026-11-09T23:50:00+09:00');
    assert.equal(clock.todayKstDate(), '2026-11-09');
    assert.equal(clock.currentKstTime(), '23:50');

    clock.advance({ minutes: 15 });
    assert.equal(clock.todayKstDate(), '2026-11-10');
    assert.equal(clock.currentKstTime(), '00:05');
    assert.equal(clock.nowKstIso(), '2026-11-10T00:05:00+09:00');

    clock.setNow('2026-11-15T14:30:00+09:00');
    assert.equal(clock.todayKstDate(), '2026-11-15');
    assert.equal(clock.currentKstTime(), '14:30');
  });

  test('T04: expands KST date ranges across month/year boundaries and enforces maxDays limit', () => {
    const yearCross = expandKstDateRange('2026-12-30', '2027-01-02');
    assert.deepEqual(yearCross, ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    assert.equal(diffKstDays('2026-12-30', '2027-01-02'), 3);
    assert.equal(addKstDays('2028-02-28', 1), '2028-02-29');

    assert.throws(
      () => expandKstDateRange('2026-11-10', '2026-11-09'),
      /Invalid KST date range/,
    );
    assert.throws(
      () => expandKstDateRange('2026-01-01', '2027-02-01', { maxDays: 370 }),
      /exceeds maximum allowed days/,
    );
  });

  test('T05: calculates KST Monday/Sunday week starts and elapsed weeks accurately', () => {
    assert.equal(getKstWeekday('2026-11-08'), 0);
    assert.equal(getKstWeekStart('2026-11-08', 1), '2026-11-02');
    assert.equal(getKstWeekStart('2026-11-08', 0), '2026-11-08');

    assert.equal(getElapsedWeeksSinceAnchor('2026-11-03', '2026-11-05', 1), 0);
    assert.equal(getElapsedWeeksSinceAnchor('2026-11-03', '2026-11-10', 1), 1);
    assert.equal(getElapsedWeeksSinceAnchor('2026-11-03', '2026-11-17', 1), 2);
  });

  test('T06: computes KST week-of-month in both weekday-ordinal and calendar-week modes', () => {
    assert.equal(getKstWeekOfMonth('2026-11-07', { mode: 'weekday-ordinal' }), 1);
    assert.equal(getKstWeekOfMonth('2026-11-14', { mode: 'weekday-ordinal' }), 2);
    assert.equal(getKstWeekOfMonth('2026-11-21', { mode: 'weekday-ordinal' }), 3);
    assert.equal(getKstWeekOfMonth('2026-11-28', { mode: 'weekday-ordinal' }), 4);

    assert.equal(getKstWeekOfMonth('2026-11-01', { mode: 'calendar-week', weekStartsOn: 1 }), 1);
    assert.equal(getKstWeekOfMonth('2026-11-02', { mode: 'calendar-week', weekStartsOn: 1 }), 2);
  });
});

describe('2. Weekly / Bi-Weekly / Nth-Week-of-Month Recurrence Expansion', () => {
  test('T07: expands standard weekly classes (Mon/Wed/Fri) within inclusive startDate..untilDate', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      rangeStart: '2026-11-01',
      rangeEnd: '2026-11-08',
      holidays: [],
      exceptions: [],
    });
    assert.deepEqual(
      rows.map((r) => [r.date, r.weekday, r.startTime, r.endTime]),
      [
        ['2026-11-02', 1, '09:00', '09:50'],
        ['2026-11-04', 3, '09:00', '09:50'],
        ['2026-11-06', 5, '09:00', '09:50'],
      ],
    );
  });

  test('T08: expands bi-weekly classes (intervalWeeks: 2) skipping odd elapsed weeks', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[1]],
      rangeStart: '2026-11-01',
      rangeEnd: '2026-11-30',
      holidays: [],
      exceptions: [],
    });
    assert.deepEqual(
      rows.map((r) => r.date),
      ['2026-11-03', '2026-11-05', '2026-11-17', '2026-11-19'],
    );
  });

  test('T09: expands monthly Nth weekday classes (weeksOfMonth: [2, 4]) accurately', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[2]],
      rangeStart: '2026-11-01',
      rangeEnd: '2026-11-30',
      holidays: [],
      exceptions: [],
    });
    assert.deepEqual(
      rows.map((r) => [r.date, r.weekOfMonthOrdinal]),
      [
        ['2026-11-14', 2],
        ['2026-11-28', 4],
      ],
    );
  });

  test('T10: expands one-off (recurrence: once) classes only on startDate', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'cls-intro-once',
          title: '신규 기구 오리엔테이션',
          instructorId: 'inst-kim',
          roomId: 'room-private-c',
          startDate: '2026-11-05',
          startTime: '16:00',
          endTime: '16:50',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      rangeStart: '2026-11-01',
      rangeEnd: '2026-11-15',
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].date, '2026-11-05');
    assert.equal(rows[0].id, 'cls-intro-once@2026-11-05');
  });

  test('T11: respects rule-level excludeDates array during expansion', () => {
    const fixture = createVirtualTimetableFixture();
    const ruleWithExcludes = {
      ...fixture.classes[0],
      excludeDates: ['2026-11-04', '2026-11-09'],
    };
    assert.equal(ruleMatchesKstDate(ruleWithExcludes, '2026-11-02'), true);
    assert.equal(ruleMatchesKstDate(ruleWithExcludes, '2026-11-04'), false);
    assert.equal(ruleMatchesKstDate(ruleWithExcludes, '2026-11-09'), false);
  });

  test('T12: classifies occurrences as past, ongoing, or upcoming using deterministic KST clock', () => {
    const clock = createDeterministicKstClock('2026-11-04T09:25:00+09:00');
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      clock,
    });
    assert.deepEqual(
      rows.map((r) => [r.date, r.temporalStatus]),
      [
        ['2026-11-02', 'past'],
        ['2026-11-04', 'ongoing'],
        ['2026-11-06', 'upcoming'],
      ],
    );
  });
});

describe('3. Holiday Exclusion & Scoped Holiday Rules', () => {
  test('T13: skips studio-wide holiday dates by default and optionally emits status="holiday" when includeHolidayRows=true', () => {
    const fixture = createVirtualTimetableFixture();
    const withoutHolidayRow = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      holidays: ['2026-11-04'],
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      includeHolidayRows: false,
    });
    assert.deepEqual(
      withoutHolidayRow.map((r) => r.date),
      ['2026-11-02', '2026-11-06'],
    );

    const withHolidayRow = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      holidays: [{ date: '2026-11-04', name: '스튜디오 정기 휴관일', mode: 'skip' }],
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      includeHolidayRows: true,
    });
    const nov4 = withHolidayRow.find((r) => r.date === '2026-11-04');
    assert.ok(nov4);
    assert.equal(nov4.status, 'holiday');
    assert.equal(nov4.reason, '스튜디오 정기 휴관일');
  });

  test('T14: scopes room-specific and instructor-specific holidays without affecting other rooms/instructors', () => {
    const classes = [
      {
        id: 'cls-room-a',
        title: 'A룸 수업',
        instructorId: 'inst-kim',
        roomId: 'room-reformer-a',
        startDate: '2026-11-11',
        untilDate: '2026-11-11',
        startTime: '10:00',
        endTime: '10:50',
        recurrence: 'weekly',
        weekdays: [3],
      },
      {
        id: 'cls-room-b',
        title: 'B룸 수업',
        instructorId: 'inst-park',
        roomId: 'room-cadillac-b',
        startDate: '2026-11-11',
        untilDate: '2026-11-11',
        startTime: '10:00',
        endTime: '10:50',
        recurrence: 'weekly',
        weekdays: [3],
      },
    ];
    const rows = expandPilatesSchedule({
      classes,
      holidays: [
        {
          date: '2026-11-11',
          name: 'A룸 기구 점검',
          roomIds: ['room-reformer-a'],
          mode: 'skip',
        },
      ],
      rangeStart: '2026-11-11',
      rangeEnd: '2026-11-11',
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].classId, 'cls-room-b');
    assert.equal(rows[0].status, 'scheduled');
  });
});

describe('4. Exception Schedules (Cancel, Reschedule, Override, Closed, Extra)', () => {
  test('T15: marks cancelled occurrences as status="cancelled" and omits them when includeInactive=false', () => {
    const fixture = createVirtualTimetableFixture();
    const exceptions = [
      {
        id: 'ex-cancel-1',
        kind: 'cancel',
        classId: 'cls-morning-reformer',
        originalDate: '2026-11-04',
        reason: '강사 컨디션 난조로 휴강',
      },
    ];
    const allRows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      exceptions,
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      includeInactive: true,
    });
    const cancelledRow = allRows.find((r) => r.date === '2026-11-04');
    assert.equal(cancelledRow?.status, 'cancelled');
    assert.equal(cancelledRow?.reason, '강사 컨디션 난조로 휴강');

    const activeOnly = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      exceptions,
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      includeInactive: false,
    });
    assert.deepEqual(
      activeOnly.map((r) => r.date),
      ['2026-11-02', '2026-11-06'],
    );
  });

  test('T16: reschedules an occurrence to another date/time/room/instructor while preserving originalDate identity', () => {
    const fixture = createVirtualTimetableFixture();
    const exceptions = [
      {
        id: 'ex-move-1',
        kind: 'reschedule',
        classId: 'cls-morning-reformer',
        originalDate: '2026-11-02',
        date: '2026-11-03',
        startTime: '19:00',
        endTime: '19:50',
        roomId: 'room-cadillac-b',
        instructorId: 'inst-park',
        reason: '화요일 저녁 보강 이동',
      },
    ];
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      exceptions,
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-04',
    });

    const originalMarker = rows.find((r) => r.id === 'cls-morning-reformer@2026-11-02');
    assert.equal(originalMarker?.status, 'moved');
    assert.equal(originalMarker?.movedTo, '2026-11-03');

    const movedRow = rows.find((r) => r.id === 'cls-morning-reformer@2026-11-02:rescheduled');
    assert.ok(movedRow);
    assert.equal(movedRow.status, 'scheduled');
    assert.equal(movedRow.originalDate, '2026-11-02');
    assert.equal(movedRow.date, '2026-11-03');
    assert.equal(movedRow.startTime, '19:00');
    assert.equal(movedRow.roomId, 'room-cadillac-b');
    assert.equal(movedRow.instructorId, 'inst-park');
    assert.equal(movedRow.movedFrom, '2026-11-02');
  });

  test('T17: brings a rescheduled session from outside [rangeStart, rangeEnd] into the viewed range', () => {
    const fixture = createVirtualTimetableFixture();
    const exceptions = [
      {
        id: 'ex-outside-in',
        kind: 'reschedule',
        classId: 'cls-morning-reformer',
        originalDate: '2026-11-02',
        date: '2026-11-10',
        startTime: '15:00',
        endTime: '15:50',
        reason: '다음 주 화요일로 이월',
      },
    ];
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      exceptions,
      rangeStart: '2026-11-10',
      rangeEnd: '2026-11-12',
    });
    const movedIn = rows.find((r) => r.originalDate === '2026-11-02');
    assert.ok(movedIn);
    assert.equal(movedIn.date, '2026-11-10');
    assert.equal(movedIn.status, 'scheduled');
  });

  test('T18: same-day time/instructor override emits a single updated occurrence without duplicate moved stub', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      exceptions: [
        {
          id: 'ex-sameday-sub',
          kind: 'override',
          classId: 'cls-morning-reformer',
          originalDate: '2026-11-02',
          date: '2026-11-02',
          startTime: '10:00',
          endTime: '10:50',
          instructorId: 'inst-lee',
          reason: '대강 및 1시간 순연',
        },
      ],
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-02',
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'scheduled');
    assert.equal(rows[0].startTime, '10:00');
    assert.equal(rows[0].instructorId, 'inst-lee');
  });

  test('T19: marks rescheduled occurrence as closed if target date/room is closed, and supports extra sessions', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      exceptions: [
        {
          id: 'ex-move-to-closed',
          kind: 'reschedule',
          classId: 'cls-morning-reformer',
          originalDate: '2026-11-02',
          date: '2026-11-05',
          startTime: '11:00',
          endTime: '11:50',
          reason: '목요일로 이동 시도',
        },
        {
          id: 'ex-closed-nov5',
          kind: 'closed',
          date: '2026-11-05',
          roomId: 'room-reformer-a',
          reason: 'A룸 긴급 보수',
        },
        {
          id: 'ex-extra-1',
          kind: 'extra',
          date: '2026-11-05',
          title: '원장 특별 오픈클래스',
          instructorId: 'inst-lee',
          roomId: 'room-private-c',
          startTime: '18:00',
          endTime: '18:50',
          reason: '특강 추가',
        },
      ],
      rangeStart: '2026-11-05',
      rangeEnd: '2026-11-05',
    });
    assert.equal(rows.length, 2);
    const closedMoved = rows.find((r) => r.classId === 'cls-morning-reformer');
    const extraClass = rows.find((r) => r.id === 'extra:ex-extra-1@2026-11-05');
    assert.equal(closedMoved?.status, 'closed');
    assert.equal(extraClass?.status, 'scheduled');
    assert.equal(extraClass?.title, '원장 특별 오픈클래스');
  });
});

describe('5. Midnight Boundaries & Cross-Midnight Sessions', () => {
  test('T20: handles 00:00 start boundary and 24:00 end boundary on KST dates accurately', () => {
    const startMidnight = resolveKstTimeWindow('2026-11-09', '00:00', '00:50');
    assert.equal(startMidnight.touchesMidnightStart, true);
    assert.equal(startMidnight.touchesMidnightEnd, false);
    assert.equal(startMidnight.crossesMidnight, false);
    assert.equal(startMidnight.startDate, '2026-11-09');
    assert.equal(startMidnight.endDate, '2026-11-09');
    assert.equal(startMidnight.durationMinutes, 50);

    const endMidnight = resolveKstTimeWindow('2026-11-09', '23:10', '24:00');
    assert.equal(endMidnight.touchesMidnightStart, false);
    assert.equal(endMidnight.touchesMidnightEnd, true);
    assert.equal(endMidnight.crossesMidnight, false);
    assert.equal(endMidnight.startDate, '2026-11-09');
    assert.equal(endMidnight.endDate, '2026-11-10');
    assert.equal(endMidnight.normalizedEndTime, '00:00');
    assert.equal(endMidnight.endKstIso, '2026-11-10T00:00:00+09:00');
    assert.equal(endMidnight.durationMinutes, 50);
  });

  test('T21: resolves cross-midnight classes (23:30 -> 00:20 next day) and spills over from previous day into rangeStart', () => {
    const lateRule = {
      id: 'cls-night-stretch',
      title: '심야 릴랙스 필라테스',
      instructorId: 'inst-kim',
      roomId: 'room-reformer-a',
      startDate: '2026-11-01',
      untilDate: '2026-11-30',
      startTime: '23:30',
      endTime: '00:20',
      recurrence: 'weekly',
      weekdays: [1],
    };

    const rowsWithSpillover = expandPilatesSchedule({
      classes: [lateRule],
      rangeStart: '2026-11-03',
      rangeEnd: '2026-11-03',
      includeCrossMidnightSpillover: true,
    });
    assert.equal(rowsWithSpillover.length, 1);
    assert.equal(rowsWithSpillover[0].date, '2026-11-02');
    assert.equal(rowsWithSpillover[0].endDate, '2026-11-03');
    assert.equal(rowsWithSpillover[0].crossesMidnight, true);
    assert.equal(rowsWithSpillover[0].durationMinutes, 50);

    const rowsWithoutSpillover = expandPilatesSchedule({
      classes: [lateRule],
      rangeStart: '2026-11-03',
      rangeEnd: '2026-11-03',
      includeCrossMidnightSpillover: false,
    });
    assert.equal(rowsWithoutSpillover.length, 0);
  });
});

describe('6. Instructor & Room Overlap Conflict Detection', () => {
  test('T22: detects instructor-only, room-only, and simultaneous instructor-and-room overlaps', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'c1',
          title: '수업 1',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:00',
          endTime: '09:50',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'c2-same-inst-diff-room',
          title: '수업 2 (강사 중복)',
          instructorId: 'inst-kim',
          roomId: 'room-cadillac-b',
          startDate: '2026-11-09',
          startTime: '09:30',
          endTime: '10:20',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'c3-diff-inst-same-room',
          title: '수업 3 (룸 중복)',
          instructorId: 'inst-park',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:40',
          endTime: '10:30',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'c4-both-same',
          title: '수업 4 (강사+룸 모두 중복)',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:10',
          endTime: '09:45',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      rangeStart: '2026-11-09',
      rangeEnd: '2026-11-09',
    });

    const conflicts = detectScheduleConflicts(rows);
    const pairTypes = new Map(conflicts.map((c) => [`${c.leftClassId}|${c.rightClassId}`, c.type]));

    assert.equal(pairTypes.get('c1|c2-same-inst-diff-room'), 'instructor');
    assert.equal(pairTypes.get('c1|c3-diff-inst-same-room'), 'room');
    assert.equal(pairTypes.get('c1|c4-both-same'), 'instructor-and-room');

    const summary = summarizeResourceConflicts(rows);
    assert.ok(summary.totalConflicts >= 3);
    assert.ok(summary.byInstructor['inst-kim'].length >= 2);
    assert.ok(summary.byRoom['room-reformer-a'].length >= 2);
  });

  test('T23: detects cross-midnight overlap between Day N 23:30..00:20 and Day N+1 00:00..00:50', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'late-mon',
          title: '월요일 심야반',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '23:30',
          endTime: '00:20',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'early-tue',
          title: '화요일 자정반',
          instructorId: 'inst-kim',
          roomId: 'room-cadillac-b',
          startDate: '2026-11-10',
          startTime: '00:00',
          endTime: '00:50',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      rangeStart: '2026-11-10',
      rangeEnd: '2026-11-10',
      includeCrossMidnightSpillover: true,
    });

    const conflicts = detectScheduleConflicts(rows);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].type, 'instructor');
    assert.equal(conflicts[0].overlapDate, '2026-11-10');
    assert.equal(conflicts[0].overlapStartTime, '00:00');
    assert.equal(conflicts[0].overlapEndTime, '00:20');
    assert.equal(conflicts[0].overlapMinutes, 20);
  });

  test('T24: treats touching boundaries (09:50->09:50 and 24:00->00:00) as non-overlapping unless turnaround buffer is set', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'slot-1',
          title: '1교시',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:00',
          endTime: '09:50',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'slot-2',
          title: '2교시 (연속)',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:50',
          endTime: '10:40',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'slot-midnight-end',
          title: '자정 종료반',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '23:10',
          endTime: '24:00',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'slot-midnight-start',
          title: '자정 시작반',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-10',
          startTime: '00:00',
          endTime: '00:50',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      rangeStart: '2026-11-09',
      rangeEnd: '2026-11-10',
    });

    assert.deepEqual(detectScheduleConflicts(rows), []);

    const bufferConflicts = detectScheduleConflicts(rows, {
      instructorBufferMinutes: 10,
      roomBufferMinutes: 10,
    });
    assert.equal(bufferConflicts.length, 2);
    assert.equal(bufferConflicts[0].kind, 'buffer');
    assert.equal(bufferConflicts[0].gapMinutes, 0);
    assert.equal(bufferConflicts[1].kind, 'buffer');
  });

  test('T25: ignores cancelled, closed, moved, and holiday rows during conflict detection', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'base-class',
          title: '정규반',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '10:00',
          endTime: '10:50',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'cancelled-overlap',
          title: '취소된 중복반',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '10:00',
          endTime: '10:50',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      exceptions: [
        {
          id: 'ex-cancel-overlap',
          kind: 'cancel',
          classId: 'cancelled-overlap',
          originalDate: '2026-11-09',
          reason: '중복 개설 취소',
        },
      ],
      rangeStart: '2026-11-09',
      rangeEnd: '2026-11-09',
    });

    assert.equal(rows.length, 2);
    assert.deepEqual(detectScheduleConflicts(rows), []);
  });
});

describe('7. Validation & Error Boundaries', () => {
  test('T26: rejects malformed rules, duplicate weekdays, invalid exception targets, and disabled cross-midnight', () => {
    assert.throws(
      () =>
        validateRecurrenceRule({
          id: 'bad-weekday',
          title: '오류 수업',
          instructorId: 'inst-kim',
          roomId: 'room-a',
          startDate: '2026-11-01',
          startTime: '09:00',
          endTime: '09:50',
          recurrence: 'weekly',
          weekdays: [1, 1],
        }),
      /duplicate weekday/,
    );

    assert.throws(
      () =>
        validateRecurrenceRule({
          id: 'no-cross-midnight',
          title: '자정 넘김 금지 수업',
          instructorId: 'inst-kim',
          roomId: 'room-a',
          startDate: '2026-11-01',
          startTime: '23:30',
          endTime: '00:20',
          allowCrossMidnight: false,
          recurrence: 'once',
          weekdays: [],
        }),
      /cross-midnight is disabled/,
    );

    const fixture = createVirtualTimetableFixture();
    assert.throws(
      () =>
        expandPilatesSchedule({
          classes: [fixture.classes[0]],
          exceptions: [
            {
              id: 'ex-wrong-day',
              kind: 'cancel',
              classId: 'cls-morning-reformer',
              originalDate: '2026-11-03',
              reason: '잘못된 날짜 지정',
            },
          ],
          rangeStart: '2026-11-01',
          rangeEnd: '2026-11-07',
        }),
      /does not occur/,
    );
  });

  test('T27: guarantees input immutability and deterministic output ordering across repeated runs', () => {
    const fixture = createVirtualTimetableFixture();
    const snapshotBefore = JSON.stringify(fixture);
    const clock = createDeterministicKstClock(fixture.fixedNowKst);

    const run1 = expandPilatesSchedule({
      classes: fixture.classes,
      holidays: fixture.holidays,
      exceptions: fixture.exceptions,
      rangeStart: '2026-11-01',
      rangeEnd: '2026-11-30',
      clock,
    });
    const run2 = expandPilatesSchedule({
      classes: fixture.classes,
      holidays: fixture.holidays,
      exceptions: fixture.exceptions,
      rangeStart: '2026-11-01',
      rangeEnd: '2026-11-30',
      clock,
    });

    assert.equal(JSON.stringify(fixture), snapshotBefore);
    assert.deepEqual(run1, run2);
  });
});

describe('8. KST Month-End, Leap-Year, Year-End & Cross-Midnight Regressions', () => {
  test('T28: handles century/4-year leap-year boundaries and expands Feb 28..Mar 1 accurately', () => {
    assert.equal(isValidKstDate('1900-02-29'), false);
    assert.equal(isValidKstDate('2000-02-29'), true);
    assert.equal(isValidKstDate('2024-02-29'), true);
    assert.equal(isValidKstDate('2026-02-29'), false);
    assert.equal(isValidKstDate('2028-02-29'), true);
    assert.equal(isValidKstDate('2100-02-29'), false);

    // 2028-02-28 (Mon), 2028-02-29 (Tue), 2028-03-01 (Wed)
    const leapRows = expandPilatesSchedule({
      classes: [
        {
          id: 'cls-leap-night',
          title: '윤년 심야 리포머',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2028-02-28',
          untilDate: '2028-03-01',
          startTime: '23:30',
          endTime: '00:20',
          recurrence: 'weekly',
          weekdays: [1, 2, 3],
        },
      ],
      rangeStart: '2028-02-28',
      rangeEnd: '2028-03-01',
    });

    assert.deepEqual(
      leapRows.map((r) => [r.date, r.endDate, r.weekOfMonthOrdinal]),
      [
        ['2028-02-28', '2028-02-29', 4],
        ['2028-02-29', '2028-03-01', 5],
        ['2028-03-01', '2028-03-02', 1],
      ],
    );

    // Non-leap 2026-02-28 (Sat) -> 2026-03-01 (Sun)
    const nonLeapWin = resolveKstTimeWindow('2026-02-28', '23:30', '00:20');
    assert.equal(nonLeapWin.endDate, '2026-03-01');
    assert.equal(nonLeapWin.endKstIso, '2026-03-01T00:20:00+09:00');
  });

  test('T29: preserves year-end cross-midnight spillover (2026-12-31 -> 2027-01-01) and bi-weekly cadence across New Year', () => {
    const classes = [
      {
        id: 'cls-nye-late',
        title: '연말 심야 스트레칭',
        instructorId: 'inst-kim',
        roomId: 'room-reformer-a',
        startDate: '2026-12-01',
        untilDate: '2027-01-31',
        startTime: '23:30',
        endTime: '00:20',
        recurrence: 'weekly',
        weekdays: [4], // 2026-12-31 is Thursday
      },
      {
        id: 'cls-biweekly-newyear',
        title: '연말연시 격주 캐딜락',
        instructorId: 'inst-park',
        roomId: 'room-cadillac-b',
        startDate: '2026-12-28', // Monday of week spanning 2026-12-28..2027-01-03
        untilDate: '2027-01-20',
        startTime: '10:00',
        endTime: '10:50',
        recurrence: 'weekly',
        weekdays: [1, 6], // Mon, Sat
        intervalWeeks: 2,
      },
    ];

    // Query starting 2027-01-01: 2026-12-31 23:30->00:20 spills into 2027-01-01 even when 2027-01-01 is a holiday
    const janRows = expandPilatesSchedule({
      classes,
      holidays: ['2027-01-01'],
      rangeStart: '2027-01-01',
      rangeEnd: '2027-01-18',
      includeCrossMidnightSpillover: true,
    });

    assert.deepEqual(
      janRows.map((r) => [r.id, r.date, r.endDate]),
      [
        ['cls-nye-late@2026-12-31', '2026-12-31', '2027-01-01'],
        ['cls-biweekly-newyear@2027-01-02', '2027-01-02', '2027-01-02'],
        ['cls-nye-late@2027-01-07', '2027-01-07', '2027-01-08'],
        ['cls-biweekly-newyear@2027-01-11', '2027-01-11', '2027-01-11'],
        ['cls-nye-late@2027-01-14', '2027-01-14', '2027-01-15'],
        ['cls-biweekly-newyear@2027-01-16', '2027-01-16', '2027-01-16'],
      ],
    );
  });

  test('T30: prevents closed/holiday/cancelled or exact-24:00 lookback sessions on (rangeStart - 1) from leaking into rangeStart', () => {
    const classes = [
      {
        id: 'cls-regular-24end',
        title: '24시 정각 종료반',
        instructorId: 'inst-kim',
        roomId: 'room-reformer-a',
        startDate: '2026-11-09',
        untilDate: '2026-11-09',
        startTime: '23:10',
        endTime: '24:00', // Ends at 2026-11-10T00:00:00+09:00 -> 0 minutes inside Nov 10
        recurrence: 'weekly',
        weekdays: [1],
      },
      {
        id: 'cls-resched-closed-lookback',
        title: '전날 심야 이동 후 휴무반',
        instructorId: 'inst-park',
        roomId: 'room-cadillac-b',
        startDate: '2026-11-09',
        untilDate: '2026-11-09',
        startTime: '10:00',
        endTime: '10:50',
        recurrence: 'weekly',
        weekdays: [1],
      },
    ];

    const rows = expandPilatesSchedule({
      classes,
      exceptions: [
        {
          id: 'ex-move-late-mon',
          kind: 'override',
          classId: 'cls-resched-closed-lookback',
          originalDate: '2026-11-09',
          date: '2026-11-09',
          startTime: '23:30',
          endTime: '00:20',
          reason: '심야 시간 변경',
        },
        {
          id: 'ex-extra-late-mon',
          kind: 'extra',
          date: '2026-11-09',
          title: '전날 심야 특강',
          instructorId: 'inst-lee',
          roomId: 'room-private-c',
          startTime: '23:40',
          endTime: '00:30',
          reason: '심야 특강',
        },
        {
          id: 'ex-close-all-mon',
          kind: 'closed',
          date: '2026-11-09',
          reason: '월요일 전관 정전 휴무',
        },
      ],
      rangeStart: '2026-11-10',
      rangeEnd: '2026-11-10',
      includeInactive: true,
      includeCrossMidnightSpillover: true,
    });

    assert.deepEqual(rows, []);
  });

  test('T31: parseKstInstantToEpochMs & deterministic clock reject rolled-over invalid dates and honor explicit UTC/offset timestamps', () => {
    assert.throws(() => parseKstInstantToEpochMs('2026-02-29'), /Invalid KST date/);
    assert.throws(() => parseKstInstantToEpochMs('2026-02-29T09:00:00+09:00'), /Invalid calendar date/);
    assert.throws(() => parseKstInstantToEpochMs('2026-04-31T09:00:00Z'), /Invalid calendar date/);
    assert.throws(() => parseKstInstantToEpochMs('2026/02/31'), /Invalid ISO\/KST timestamp/);
    assert.throws(() => parseKstInstantToEpochMs('1899-12-31'), /Invalid KST date/);

    const utcMidnightClock = createDeterministicKstClock('2026-11-09T00:00:00Z');
    assert.equal(utcMidnightClock.nowKstIso(), '2026-11-09T09:00:00+09:00');
    assert.throws(() => utcMidnightClock.advance({ minutes: Number.NaN }), /finite/);
  });
});

describe('9. Range Endpoint Inclusivity & Non-Duplication / Non-Omission Regressions', () => {
  test('T32: includes exact boundary occurrences on rangeStart, rangeEnd, startDate===untilDate,open-ended untilDate, and century bounds', () => {
    const singleDayRange = expandKstDateRange('2026-11-09', '2026-11-09');
    assert.deepEqual(singleDayRange, ['2026-11-09']);

    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'cls-ends-on-rangestart',
          title: '조회 시작일 종료반',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-02',
          untilDate: '2026-11-09', // equals rangeStart
          startTime: '00:00',
          endTime: '00:50',
          recurrence: 'weekly',
          weekdays: [1],
        },
        {
          id: 'cls-starts-on-rangeend',
          title: '조회 종료일 시작반',
          instructorId: 'inst-park',
          roomId: 'room-cadillac-b',
          startDate: '2026-11-15', // equals rangeEnd
          untilDate: '2026-11-30',
          startTime: '23:10',
          endTime: '24:00',
          recurrence: 'weekly',
          weekdays: [0],
        },
        {
          id: 'cls-open-ended',
          title: '무기한 수요일 정규반',
          instructorId: 'inst-lee',
          roomId: 'room-private-c',
          startDate: '2026-11-01',
          // untilDate omitted intentionally
          startTime: '12:00',
          endTime: '12:50',
          recurrence: 'weekly',
          weekdays: [3],
        },
      ],
      rangeStart: '2026-11-09',
      rangeEnd: '2026-11-15',
    });

    assert.deepEqual(
      rows.map((r) => [r.id, r.date]),
      [
        ['cls-ends-on-rangestart@2026-11-09', '2026-11-09'],
        ['cls-open-ended@2026-11-11', '2026-11-11'],
        ['cls-starts-on-rangeend@2026-11-15', '2026-11-15'],
      ],
    );

    // Extreme century bounds 1900-01-01 and 2199-12-31 must not fail lookback or cross-midnight
    const minBoundRows = expandPilatesSchedule({
      classes: [
        {
          id: 'cls-1900',
          title: '1900 첫날 수업',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '1900-01-01',
          untilDate: '1900-01-01',
          startTime: '09:00',
          endTime: '09:50',
          recurrence: 'weekly',
          weekdays: [1],
        },
      ],
      rangeStart: '1900-01-01',
      rangeEnd: '1900-01-01',
      includeCrossMidnightSpillover: true,
    });
    assert.equal(minBoundRows.length, 1);

    const maxBoundRows = expandPilatesSchedule({
      classes: [
        {
          id: 'cls-2199',
          title: '2199 마지막 심야 수업',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2199-12-31',
          untilDate: '2199-12-31',
          startTime: '23:30',
          endTime: '00:20',
          recurrence: 'weekly',
          weekdays: [2],
        },
      ],
      rangeStart: '2199-12-31',
      rangeEnd: '2199-12-31',
    });
    assert.equal(maxBoundRows.length, 1);
    assert.equal(maxBoundRows[0].endDate, '2200-01-01');
  });

  test('T33: partition regression — full-range expansion equals concatenation of disjoint sub-ranges with zero duplicates or omissions', () => {
    const fixture = createVirtualTimetableFixture();
    const classes = fixture.classes.map((c) => ({ ...c, untilDate: '2026-12-31' }));
    const exceptions = [
      {
        id: 'ex-1',
        kind: 'cancel',
        classId: 'cls-morning-reformer',
        originalDate: '2026-11-16',
        reason: '개인 사정 취소',
      },
      {
        id: 'ex-2',
        kind: 'reschedule',
        classId: 'cls-biweekly-duet',
        originalDate: '2026-11-19',
        date: '2026-12-02',
        startTime: '15:00',
        endTime: '15:50',
        reason: '12월 첫째주 보강 이동',
      },
      {
        id: 'ex-3',
        kind: 'override',
        classId: 'cls-morning-reformer',
        originalDate: '2026-12-07',
        date: '2026-12-07',
        startTime: '10:30',
        endTime: '11:20',
        instructorId: 'inst-lee',
        reason: '당일 시간 변경',
      },
      {
        id: 'ex-4',
        kind: 'extra',
        date: '2026-12-24',
        title: '크리스마스 이브 특강',
        instructorId: 'inst-kim',
        roomId: 'room-private-c',
        startTime: '19:00',
        endTime: '19:50',
        reason: '연말 이벤트',
      },
    ];
    const holidays = [...fixture.holidays, '2026-12-25'];
    const clock = createDeterministicKstClock('2026-11-15T12:00:00+09:00');

    const fullRows = expandPilatesSchedule({
      classes,
      exceptions,
      holidays,
      rangeStart: '2026-11-01',
      rangeEnd: '2026-12-31',
      clock,
      includeCrossMidnightSpillover: false,
    });

    // Unique ID invariant: zero duplicate occurrence IDs
    const uniqueIds = new Set(fullRows.map((r) => r.id));
    assert.equal(uniqueIds.size, fullRows.length);

    // Partition into 4 disjoint windows covering [2026-11-01 .. 2026-12-31]
    const windows = [
      ['2026-11-01', '2026-11-15'],
      ['2026-11-16', '2026-11-30'],
      ['2026-12-01', '2026-12-15'],
      ['2026-12-16', '2026-12-31'],
    ];
    const partitionedRows = windows.flatMap(([s, e]) =>
      expandPilatesSchedule({
        classes,
        exceptions,
        holidays,
        rangeStart: s,
        rangeEnd: e,
        clock,
        includeCrossMidnightSpillover: false,
      }),
    );

    assert.deepEqual(partitionedRows, fullRows);
  });

  test('T34: preserves both regular and rescheduled occurrences when moved onto another regular class date or moved off a holiday', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]], // Mon(Nov 2), Wed(Nov 4), Fri(Nov 6) 09:00..09:50
      holidays: ['2026-11-04'], // Wednesday is a holiday
      exceptions: [
        // Move Monday Nov 2 onto Friday Nov 6 (which already has a regular 09:00..09:50 class!)
        {
          id: 'ex-mon-to-fri',
          kind: 'reschedule',
          classId: 'cls-morning-reformer',
          originalDate: '2026-11-02',
          date: '2026-11-06',
          startTime: '14:00',
          endTime: '14:50',
          reason: '금요일 오후 보강',
        },
        // Move Wednesday Nov 4 (a holiday!) onto Thursday Nov 5 so it is not omitted
        {
          id: 'ex-holiday-makeup',
          kind: 'reschedule',
          classId: 'cls-morning-reformer',
          originalDate: '2026-11-04',
          date: '2026-11-05',
          startTime: '09:00',
          endTime: '09:50',
          reason: '휴관일 목요일 대체 수업',
        },
      ],
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      includeInactive: false,
    });

    assert.deepEqual(
      rows.map((r) => [r.id, r.date, r.startTime, r.status]),
      [
        ['cls-morning-reformer@2026-11-04:rescheduled', '2026-11-05', '09:00', 'scheduled'],
        ['cls-morning-reformer@2026-11-06', '2026-11-06', '09:00', 'scheduled'],
        ['cls-morning-reformer@2026-11-02:rescheduled', '2026-11-06', '14:00', 'scheduled'],
      ],
    );
  });
});

describe('10. Duplicate Exceptions & Holidays Precedence Regressions', () => {
  test('T35: deduplicates duplicate holidays without emitting duplicate rows and prioritizes mode="closed" over mode="skip"', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]],
      holidays: [
        '2026-11-04',
        '2026-11-04', // Exact string duplicate
        { date: '2026-11-06', name: '일반 휴일', mode: 'skip' },
        {
          date: '2026-11-06',
          name: 'A룸 시설 폐쇄',
          roomIds: ['room-reformer-a'],
          mode: 'closed', // Appears AFTER skip, must still take precedence
        },
      ],
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      includeHolidayRows: true,
    });

    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((r) => [r.date, r.status, r.reason]),
      [
        ['2026-11-02', 'scheduled', undefined],
        ['2026-11-04', 'holiday', '공휴일/휴관일'],
        ['2026-11-06', 'closed', 'A룸 시설 폐쇄'],
      ],
    );
  });

  test('T36: enforces consistent precedence (targeted exception > closed exception > holiday) across regular, rescheduled, and extra sessions', () => {
    const fixture = createVirtualTimetableFixture();
    const rows = expandPilatesSchedule({
      classes: [fixture.classes[0]], // Nov 2, Nov 4, Nov 6
      holidays: [
        { date: '2026-11-02', name: '공휴일 A', mode: 'skip' },
        { date: '2026-11-04', name: '공휴일 B', mode: 'skip' },
        { date: '2026-11-06', name: '전관 보수 폐쇄일', mode: 'closed' },
      ],
      exceptions: [
        // Explicit cancel on a skip-holiday must emit 'cancelled'
        {
          id: 'ex-cancel-on-holiday',
          kind: 'cancel',
          classId: 'cls-morning-reformer',
          originalDate: '2026-11-02',
          reason: '명시적 휴강 공지',
        },
        // Explicit closed exception on a skip-holiday must emit 'closed' (not disappear as 'skip')
        {
          id: 'ex-closed-on-holiday',
          kind: 'closed',
          date: '2026-11-04',
          reason: '명시적 센터 임시휴무',
        },
        // Extra session on a mode='closed' holiday is marked closed
        {
          id: 'ex-extra-on-closed-holiday',
          kind: 'extra',
          date: '2026-11-06',
          title: '특강 개설 시도',
          instructorId: 'inst-lee',
          roomId: 'room-private-c',
          startTime: '13:00',
          endTime: '13:50',
          reason: '특강',
        },
      ],
      rangeStart: '2026-11-02',
      rangeEnd: '2026-11-06',
      includeHolidayRows: false,
      includeInactive: true,
    });

    assert.deepEqual(
      rows.map((r) => [r.id, r.status, r.reason]),
      [
        ['cls-morning-reformer@2026-11-02', 'cancelled', '명시적 휴강 공지'],
        ['cls-morning-reformer@2026-11-04', 'closed', '명시적 센터 임시휴무'],
        ['cls-morning-reformer@2026-11-06', 'closed', '전관 보수 폐쇄일'],
        ['extra:ex-extra-on-closed-holiday@2026-11-06', 'closed', '전관 보수 폐쇄일'],
      ],
    );
  });

  test('T37: rejects duplicate targeted/closed exceptions, empty-string wildcard spoofing, conflicting roomId/locationId, and invalid holidays/excludeDates', () => {
    const fixture = createVirtualTimetableFixture();
    const ruleMap = new Map([[fixture.classes[0].id, fixture.classes[0]]]);

    // Cancel + reschedule on same classId@originalDate
    assert.throws(
      () =>
        validateScheduleExceptions(
          [
            {
              id: 'e1',
              kind: 'cancel',
              classId: 'cls-morning-reformer',
              originalDate: '2026-11-02',
              reason: '',
            },
            {
              id: 'e2',
              kind: 'reschedule',
              classId: 'cls-morning-reformer',
              originalDate: '2026-11-02',
              date: '2026-11-03',
              startTime: '10:00',
              endTime: '10:50',
              reason: '',
            },
          ],
          ruleMap,
        ),
      /Duplicate exception targeting/,
    );

    // Duplicate closed exception
    assert.throws(
      () =>
        validateScheduleExceptions(
          [
            { id: 'c1', kind: 'closed', date: '2026-11-05', roomId: 'room-a', reason: '' },
            { id: 'c2', kind: 'closed', date: '2026-11-05', locationId: 'room-a', reason: '' },
          ],
          ruleMap,
        ),
      /Duplicate closed exception/,
    );

    // Empty-string roomId/instructorId spoofing
    assert.throws(
      () =>
        validateScheduleExceptions(
          [{ id: 'c-empty', kind: 'closed', date: '2026-11-05', roomId: '', reason: '' }],
          ruleMap,
        ),
      /non-empty string/,
    );

    // Conflicting roomId and locationId
    assert.throws(
      () =>
        validateScheduleExceptions(
          [
            {
              id: 'c-mismatch',
              kind: 'closed',
              date: '2026-11-05',
              roomId: 'room-a',
              locationId: 'room-b',
              reason: '',
            },
          ],
          ruleMap,
        ),
      /conflicting roomId/,
    );

    // Invalid excludeDate or duplicate excludeDate on rule
    assert.throws(
      () => validateRecurrenceRule({ ...fixture.classes[0], excludeDates: ['2026-02-30'] }),
      /invalid excludeDate/,
    );
    assert.throws(
      () =>
        validateRecurrenceRule({
          ...fixture.classes[0],
          excludeDates: ['2026-11-04', '2026-11-04'],
        }),
      /duplicate excludeDate/,
    );

    // Invalid holiday mode or empty roomIds
    assert.throws(
      () =>
        expandPilatesSchedule({
          classes: [fixture.classes[0]],
          holidays: [{ date: '2026-11-04', mode: 'invalid' }],
          rangeStart: '2026-11-02',
          rangeEnd: '2026-11-06',
        }),
      /Invalid holiday mode/,
    );
    assert.throws(
      () =>
        expandPilatesSchedule({
          classes: [fixture.classes[0]],
          holidays: [{ date: '2026-11-04', roomIds: [] }],
          rangeStart: '2026-11-02',
          rangeEnd: '2026-11-06',
        }),
      /non-empty array/,
    );
  });
});

describe('11. Instructor & Room Exact Touching Boundaries & Buffer Regressions', () => {
  test('T38: handles post-midnight (00:10->00:10) and year-end (24:00->00:00) touching boundaries cleanly', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'nye-cross',
          title: '연말 심야반',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-12-31',
          startTime: '23:20',
          endTime: '00:10', // Ends 2027-01-01 00:10
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'nyd-after-cross',
          title: '새해 첫 새벽반',
          instructorId: 'inst-kim',
          roomId: 'room-cadillac-b',
          startDate: '2027-01-01',
          startTime: '00:10', // Starts 2027-01-01 00:10 (exact touch)
          endTime: '01:00',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      rangeStart: '2027-01-01',
      rangeEnd: '2027-01-01',
      includeCrossMidnightSpillover: true,
    });

    assert.equal(rows.length, 2);
    assert.deepEqual(detectScheduleConflicts(rows), []);

    const with1MinBuffer = detectScheduleConflicts(rows, { instructorBufferMinutes: 1 });
    assert.equal(with1MinBuffer.length, 1);
    assert.equal(with1MinBuffer[0].type, 'instructor');
    assert.equal(with1MinBuffer[0].kind, 'buffer');
    assert.equal(with1MinBuffer[0].gapMinutes, 0);
    assert.equal(with1MinBuffer[0].overlapDate, '2027-01-01');
    assert.equal(with1MinBuffer[0].overlapStartTime, '00:10');
    assert.equal(with1MinBuffer[0].overlapEndTime, '00:10');
  });

  test('T39: enforces exact turnaround buffer threshold (gap === buffer vs buffer - 1) and asymmetric instructor/room buffers', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 'b1',
          title: '오전 1부',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:00',
          endTime: '09:50',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 'b2',
          title: '오전 2부 (10분 간격)',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '10:00', // Exact 10-min gap from 09:50
          endTime: '10:50',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      rangeStart: '2026-11-09',
      rangeEnd: '2026-11-09',
    });

    // Exact 10-min gap satisfies a 10-min buffer -> zero conflicts
    assert.deepEqual(
      detectScheduleConflicts(rows, {
        instructorBufferMinutes: 10,
        roomBufferMinutes: 10,
      }),
      [],
    );

    // Asymmetric buffer: instructor needs 15m (violated), room needs 10m (satisfied) -> type='instructor' only
    const instOnly = detectScheduleConflicts(rows, {
      instructorBufferMinutes: 15,
      roomBufferMinutes: 10,
    });
    assert.equal(instOnly.length, 1);
    assert.equal(instOnly[0].type, 'instructor');
    assert.equal(instOnly[0].kind, 'buffer');
    assert.equal(instOnly[0].instructorId, 'inst-kim');
    assert.equal(instOnly[0].roomId, null);
    assert.equal(instOnly[0].gapMinutes, 10);
    assert.equal(instOnly[0].overlapStartTime, '09:50');
    assert.equal(instOnly[0].overlapEndTime, '10:00');

    // Asymmetric buffer: instructor needs 5m (satisfied), room needs 11m (violated) -> type='room' only
    const roomOnly = detectScheduleConflicts(rows, {
      instructorBufferMinutes: 5,
      roomBufferMinutes: 11,
    });
    assert.equal(roomOnly.length, 1);
    assert.equal(roomOnly[0].type, 'room');
    assert.equal(roomOnly[0].instructorId, null);
    assert.equal(roomOnly[0].roomId, 'room-reformer-a');
  });

  test('T40: detects 1-minute overlap and ignores simultaneous sessions with distinct instructors and distinct rooms', () => {
    const rows = expandPilatesSchedule({
      classes: [
        {
          id: 's1',
          title: 'A룸 김강사',
          instructorId: 'inst-kim',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:00',
          endTime: '09:50',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 's2-independent',
          title: 'B룸 박강사 (동시간 독립 운영)',
          instructorId: 'inst-park',
          roomId: 'room-cadillac-b',
          startDate: '2026-11-09',
          startTime: '09:00',
          endTime: '09:50',
          recurrence: 'once',
          weekdays: [],
        },
        {
          id: 's3-1min-overlap',
          title: 'A룸 이강사 (1분 겹침)',
          instructorId: 'inst-lee',
          roomId: 'room-reformer-a',
          startDate: '2026-11-09',
          startTime: '09:49',
          endTime: '10:39',
          recurrence: 'once',
          weekdays: [],
        },
      ],
      rangeStart: '2026-11-09',
      rangeEnd: '2026-11-09',
    });

    const conflicts = detectScheduleConflicts(rows, {
      instructorBufferMinutes: 20,
      roomBufferMinutes: 20,
    });
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].leftClassId, 's1');
    assert.equal(conflicts[0].rightClassId, 's3-1min-overlap');
    assert.equal(conflicts[0].type, 'room');
    assert.equal(conflicts[0].kind, 'overlap');
    assert.equal(conflicts[0].overlapMinutes, 1);
    assert.equal(conflicts[0].overlapStartTime, '09:49');
    assert.equal(conflicts[0].overlapEndTime, '09:50');
  });
});

describe('12. Invalid Dates, Empty/Inverted Ranges & Large-Input Termination Guarantees', () => {
  test('T41: rejects empty/inverted ranges, zero-duration slots, invalid 24:00 start, and NaN/negative buffers or maxDays', () => {
    assert.throws(() => expandKstDateRange('', ''), /Invalid KST date range/);
    assert.throws(
      () =>
        expandPilatesSchedule({
          classes: [],
          rangeStart: '2026-11-10',
          rangeEnd: '2026-11-09',
        }),
      /Invalid KST date range/,
    );
    assert.throws(
      () => expandKstDateRange('2026-11-01', '2026-11-05', { maxDays: 0 }),
      /Invalid maxDays/,
    );
    assert.throws(
      () => expandKstDateRange('2026-11-01', '2026-11-05', { maxDays: Number.NaN }),
      /Invalid maxDays/,
    );
    assert.throws(
      () =>
        expandKstDateRange('2026-11-01', '2026-11-05', { maxDays: MAX_HARD_RANGE_DAYS + 1 }),
      /Invalid maxDays/,
    );
    assert.throws(() => resolveKstTimeWindow('2026-11-09', '09:00', '09:00'), /cannot be identical/);
    assert.throws(() => resolveKstTimeWindow('2026-11-09', '24:00', '00:50'), /Invalid time format/);
    assert.throws(
      () => detectScheduleConflicts([], { instructorBufferMinutes: -1 }),
      /Buffer minutes/,
    );
    assert.throws(
      () => detectScheduleConflicts([], { roomBufferMinutes: Number.NaN }),
      /Buffer minutes/,
    );
  });

  test('T42: returns an empty array cleanly for empty class lists or ranges with zero matching occurrences', () => {
    assert.deepEqual(
      expandPilatesSchedule({
        classes: [],
        rangeStart: '2026-11-01',
        rangeEnd: '2026-11-30',
      }),
      [],
    );

    const fixture = createVirtualTimetableFixture();
    // Query Sunday 2026-11-08 only for Mon/Wed/Fri class -> empty array
    assert.deepEqual(
      expandPilatesSchedule({
        classes: [fixture.classes[0]],
        rangeStart: '2026-11-08',
        rangeEnd: '2026-11-08',
      }),
      [],
    );
  });

  test('T43: enforces O(1) oversized range rejection and fast deterministic termination on large 365-day / 120-rule studio workloads', () => {
    assert.throws(
      () =>
        expandPilatesSchedule({
          classes: [],
          rangeStart: '1900-01-01',
          rangeEnd: '2199-12-31',
        }),
      /exceeds maximum allowed days/,
    );

    // Build synthetic 120 weekly rules across 12 instructors & 12 rooms over 365 days (~18,000 occurrences)
    const classes = [];
    for (let slot = 0; slot < 10; slot += 1) {
      const startHour = String(7 + slot).padStart(2, '0');
      for (let r = 0; r < 12; r += 1) {
        classes.push({
          id: `bulk-cls-${slot}-${r}`,
          title: `대규모 테스트반 ${slot}-${r}`,
          instructorId: `inst-${r}`,
          roomId: `room-${r}`,
          startDate: '2026-01-01',
          untilDate: '2026-12-31',
          startTime: `${startHour}:00`,
          endTime: `${startHour}:50`,
          recurrence: 'weekly',
          weekdays: [1, 3, 5],
        });
      }
    }

    const holidays = ['2026-01-01', '2026-03-01', '2026-05-05', '2026-08-15', '2026-10-03', '2026-12-25'];
    const exceptions = [
      {
        id: 'bulk-closed-1',
        kind: 'closed',
        date: '2026-06-06',
        reason: '현충일 센터 점검',
      },
      {
        id: 'bulk-overlap-extra',
        kind: 'extra',
        date: '2026-07-06', // Monday
        title: '겹침 탐지 검증 특강',
        instructorId: 'inst-0',
        roomId: 'room-0',
        startTime: '07:20',
        endTime: '08:10',
        reason: '강사+룸 동시 충돌 유도',
      },
    ];

    const startedAt = performance.now();
    const rows = expandPilatesSchedule({
      classes,
      holidays,
      exceptions,
      rangeStart: '2026-01-01',
      rangeEnd: '2026-12-31',
      clock: createDeterministicKstClock('2026-06-15T12:00:00+09:00'),
    });
    const summary = summarizeResourceConflicts(rows, {
      instructorBufferMinutes: 5,
      roomBufferMinutes: 5,
    });
    const elapsedMs = performance.now() - startedAt;

    assert.ok(rows.length > 18000, `Expected >18,000 occurrences, got ${rows.length}`);
    assert.equal(summary.totalConflicts, 2); // Overlaps 07:00..07:50 AND 08:00..08:50 for inst-0 / room-0
    assert.ok(elapsedMs < 1500, `Expected fast termination (<1500ms), took ${elapsedMs.toFixed(1)}ms`);
  });
});

describe('13. Mutable excludeDates Cache-Coherency Regressions', () => {
  test('T44: ruleMatchesKstDate reflects in-place push, pop, same-length replacement, and truncation without call-history dependence', () => {
    const excludeDates = ['2026-11-11'];
    const rule = {
      id: 'cls-mutable-excludes',
      title: '변경 가능 제외일 검증반',
      instructorId: 'inst-kim',
      roomId: 'room-reformer-a',
      startDate: '2026-11-09',
      untilDate: '2026-11-15',
      startTime: '09:00',
      endTime: '09:50',
      recurrence: 'weekly',
      weekdays: [2, 3], // 2026-11-10 (Tue), 2026-11-11 (Wed)
      excludeDates,
    };

    // Initial call
    assert.equal(ruleMatchesKstDate(rule, '2026-11-10'), true);
    assert.equal(ruleMatchesKstDate(rule, '2026-11-11'), false);

    // 1. Exact reproducer: in-place push on the same array reference
    excludeDates.push('2026-11-10');
    const freshAfterPush = { ...rule, excludeDates: [...excludeDates] };
    assert.equal(ruleMatchesKstDate(rule, '2026-11-10'), false);
    assert.equal(
      ruleMatchesKstDate(rule, '2026-11-10'),
      ruleMatchesKstDate(freshAfterPush, '2026-11-10'),
    );

    // 2. In-place deletion (pop)
    excludeDates.pop();
    assert.equal(ruleMatchesKstDate(rule, '2026-11-10'), true);
    assert.equal(ruleMatchesKstDate(rule, '2026-11-11'), false);

    // 3. Same-length element replacement (length stays 1: ['2026-11-11'] -> ['2026-11-10'])
    excludeDates[0] = '2026-11-10';
    const freshAfterReplace = { ...rule, excludeDates: [...excludeDates] };
    assert.equal(excludeDates.length, 1);
    assert.equal(ruleMatchesKstDate(rule, '2026-11-10'), false);
    assert.equal(ruleMatchesKstDate(rule, '2026-11-11'), true);
    assert.equal(
      ruleMatchesKstDate(rule, '2026-11-10'),
      ruleMatchesKstDate(freshAfterReplace, '2026-11-10'),
    );
    assert.equal(
      ruleMatchesKstDate(rule, '2026-11-11'),
      ruleMatchesKstDate(freshAfterReplace, '2026-11-11'),
    );

    // 4. In-place truncation (length = 0)
    excludeDates.length = 0;
    assert.equal(ruleMatchesKstDate(rule, '2026-11-10'), true);
    assert.equal(ruleMatchesKstDate(rule, '2026-11-11'), true);
  });

  test('T45: expandPilatesSchedule and validateScheduleExceptions stay independent of call history across in-place excludeDates mutations', () => {
    const excludeDates = ['2026-11-11'];
    const rule = {
      id: 'cls-mutable-expand',
      title: '확장 캐시 무결성 검증반',
      instructorId: 'inst-kim',
      roomId: 'room-reformer-a',
      startDate: '2026-11-09',
      untilDate: '2026-11-15',
      startTime: '10:00',
      endTime: '10:50',
      recurrence: 'weekly',
      weekdays: [2, 3], // Tue Nov 10, Wed Nov 11
      excludeDates,
    };

    const runWithSameRef = () =>
      expandPilatesSchedule({
        classes: [rule],
        rangeStart: '2026-11-09',
        rangeEnd: '2026-11-15',
      }).map((r) => r.date);

    const runWithFreshClone = () =>
      expandPilatesSchedule({
        classes: [{ ...rule, excludeDates: [...excludeDates] }],
        rangeStart: '2026-11-09',
        rangeEnd: '2026-11-15',
      }).map((r) => r.date);

    // Step 1: Initial ['2026-11-11'] -> only '2026-11-10' scheduled
    assert.deepEqual(runWithSameRef(), ['2026-11-10']);
    assert.deepEqual(runWithSameRef(), runWithFreshClone());

    // Step 2: Mutate in-place via push -> both excluded
    excludeDates.push('2026-11-10');
    assert.deepEqual(runWithSameRef(), []);
    assert.deepEqual(runWithSameRef(), runWithFreshClone());

    // Step 3: Mutate in-place via splice + same-length replacement -> ['2026-11-10']
    excludeDates.splice(1, 1); // back to ['2026-11-11']
    assert.deepEqual(runWithSameRef(), ['2026-11-10']);
    excludeDates[0] = '2026-11-10'; // same length (1), different date
    assert.deepEqual(runWithSameRef(), ['2026-11-11']);
    assert.deepEqual(runWithSameRef(), runWithFreshClone());

    // validateScheduleExceptions must also honor the mutated excludeDates immediately
    const ruleMap = new Map([[rule.id, rule]]);
    assert.throws(
      () =>
        validateScheduleExceptions(
          [
            {
              id: 'ex-excluded-tue',
              kind: 'cancel',
              classId: rule.id,
              originalDate: '2026-11-10',
              reason: '제외된 날짜 예외 지정 불가',
            },
          ],
          ruleMap,
        ),
      /does not occur/,
    );
    assert.doesNotThrow(() =>
      validateScheduleExceptions(
        [
          {
            id: 'ex-valid-wed',
            kind: 'cancel',
            classId: rule.id,
            originalDate: '2026-11-11',
            reason: '정상 회차 취소',
          },
        ],
        ruleMap,
      ),
    );
  });
});
