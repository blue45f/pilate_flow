// @ts-check
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
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
  resolveKstTimeWindow,
  ruleMatchesKstDate,
  summarizeResourceConflicts,
  validateRecurrenceRule,
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
