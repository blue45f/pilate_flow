// @ts-check

import {
  addKstDays,
  createDeterministicKstClock,
  expandKstDateRange,
  getElapsedWeeksSinceAnchor,
  getKstWeekday,
  getKstWeekOfMonth,
  isValidEndTime,
  isValidKstDate,
  isValidStartTime,
  resolveKstTimeWindow,
} from './kstCalendar.mjs';

/**
 * Validates a Pilates recurrence schedule rule definition.
 * Excludes any booking/membership logic by design.
 * @param {Record<string, any>} rule
 */
export function validateRecurrenceRule(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new TypeError('Schedule rule must be an object.');
  }
  if (typeof rule.id !== 'string' || !rule.id.trim()) {
    throw new TypeError('Schedule rule requires a non-empty string "id".');
  }
  if (typeof rule.title !== 'string' || !rule.title.trim()) {
    throw new TypeError(`Schedule rule "${rule.id}" requires a non-empty "title".`);
  }
  if (typeof rule.instructorId !== 'string' || !rule.instructorId.trim()) {
    throw new TypeError(`Schedule rule "${rule.id}" requires a non-empty "instructorId".`);
  }
  if (typeof rule.roomId !== 'string' || !rule.roomId.trim()) {
    throw new TypeError(`Schedule rule "${rule.id}" requires a non-empty "roomId".`);
  }
  if (!isValidKstDate(rule.startDate)) {
    throw new RangeError(`Schedule rule "${rule.id}" has invalid startDate "${String(rule.startDate)}".`);
  }
  if (rule.untilDate !== undefined && !isValidKstDate(rule.untilDate)) {
    throw new RangeError(`Schedule rule "${rule.id}" has invalid untilDate "${String(rule.untilDate)}".`);
  }
  if (rule.untilDate !== undefined && rule.untilDate < rule.startDate) {
    throw new RangeError(
      `Schedule rule "${rule.id}" untilDate ("${rule.untilDate}") cannot precede startDate ("${rule.startDate}").`,
    );
  }
  if (!isValidStartTime(rule.startTime)) {
    throw new RangeError(`Schedule rule "${rule.id}" has invalid startTime "${String(rule.startTime)}".`);
  }
  if (!isValidEndTime(rule.endTime)) {
    throw new RangeError(`Schedule rule "${rule.id}" has invalid endTime "${String(rule.endTime)}".`);
  }

  const recurrence = rule.recurrence ?? 'weekly';
  if (recurrence !== 'once' && recurrence !== 'weekly') {
    throw new RangeError(`Schedule rule "${rule.id}" has unsupported recurrence "${String(recurrence)}".`);
  }

  if (recurrence === 'weekly') {
    if (!Array.isArray(rule.weekdays) || rule.weekdays.length === 0) {
      throw new RangeError(`Weekly schedule rule "${rule.id}" requires a non-empty "weekdays" array.`);
    }
    const seenWeekdays = new Set();
    for (const day of rule.weekdays) {
      if (!Number.isInteger(day) || day < 0 || day > 6) {
        throw new RangeError(`Schedule rule "${rule.id}" has invalid weekday "${String(day)}" (expected 0..6).`);
      }
      if (seenWeekdays.has(day)) {
        throw new RangeError(`Schedule rule "${rule.id}" has duplicate weekday "${day}".`);
      }
      seenWeekdays.add(day);
    }

    if (rule.intervalWeeks !== undefined) {
      if (!Number.isInteger(rule.intervalWeeks) || rule.intervalWeeks < 1 || rule.intervalWeeks > 52) {
        throw new RangeError(`Schedule rule "${rule.id}" has invalid intervalWeeks "${String(rule.intervalWeeks)}".`);
      }
    }

    if (rule.weeksOfMonth !== undefined) {
      if (!Array.isArray(rule.weeksOfMonth) || rule.weeksOfMonth.length === 0) {
        throw new RangeError(`Schedule rule "${rule.id}" weeksOfMonth must be a non-empty array when provided.`);
      }
      const seenWeeks = new Set();
      for (const weekNum of rule.weeksOfMonth) {
        if (!Number.isInteger(weekNum) || weekNum < 1 || weekNum > 6) {
          throw new RangeError(`Schedule rule "${rule.id}" has invalid weekOfMonth "${String(weekNum)}" (expected 1..6).`);
        }
        if (seenWeeks.has(weekNum)) {
          throw new RangeError(`Schedule rule "${rule.id}" has duplicate weekOfMonth "${weekNum}".`);
        }
        seenWeeks.add(weekNum);
      }
    }
  }

  resolveKstTimeWindow(rule.startDate, rule.startTime, rule.endTime, {
    allowCrossMidnight: rule.allowCrossMidnight ?? true,
  });
}

/**
 * Checks whether `rule` naturally occurs on `dateStr` (KST) before holidays or exceptions.
 * @param {Record<string, any>} rule
 * @param {string} dateStr
 * @returns {boolean}
 */
export function ruleMatchesKstDate(rule, dateStr) {
  if (!isValidKstDate(dateStr)) return false;
  const recurrence = rule.recurrence ?? 'weekly';
  if (recurrence === 'once') {
    return rule.startDate === dateStr;
  }

  if (dateStr < rule.startDate) return false;
  if (rule.untilDate && dateStr > rule.untilDate) return false;

  if (Array.isArray(rule.excludeDates) && rule.excludeDates.includes(dateStr)) {
    return false;
  }

  const weekday = getKstWeekday(dateStr);
  if (!rule.weekdays.includes(weekday)) return false;

  const weekStartsOn = rule.weekStartsOn ?? 1;
  const intervalWeeks = rule.intervalWeeks ?? 1;
  if (intervalWeeks > 1) {
    const elapsedWeeks = getElapsedWeeksSinceAnchor(rule.startDate, dateStr, weekStartsOn);
    if (elapsedWeeks < 0 || elapsedWeeks % intervalWeeks !== 0) {
      return false;
    }
  }

  if (Array.isArray(rule.weeksOfMonth) && rule.weeksOfMonth.length > 0) {
    const weekOfMonthMode = rule.weekOfMonthMode ?? 'weekday-ordinal';
    const weekOfMonth = getKstWeekOfMonth(dateStr, {
      mode: weekOfMonthMode,
      weekStartsOn,
    });
    if (!rule.weeksOfMonth.includes(weekOfMonth)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalizes holiday definitions into a lookup helper.
 * @param {readonly (string | Record<string, any>)[]} [holidays]
 */
function buildHolidayMatcher(holidays = []) {
  const entries = [];
  for (const item of holidays) {
    if (typeof item === 'string') {
      if (!isValidKstDate(item)) {
        throw new RangeError(`Invalid holiday date: "${item}"`);
      }
      entries.push({
        date: item,
        name: '공휴일/휴관일',
        mode: 'skip',
      });
    } else if (item && typeof item === 'object') {
      if (!isValidKstDate(item.date)) {
        throw new RangeError(`Invalid holiday date: "${String(item.date)}"`);
      }
      entries.push({
        date: item.date,
        name: item.name ?? item.reason ?? '공휴일/휴관일',
        roomIds: Array.isArray(item.roomIds) ? item.roomIds : undefined,
        instructorIds: Array.isArray(item.instructorIds) ? item.instructorIds : undefined,
        mode: item.mode ?? 'skip',
      });
    }
  }

  return function matchHoliday(dateStr, roomId, instructorId) {
    return entries.find((entry) => {
      if (entry.date !== dateStr) return false;
      const roomMatch = !entry.roomIds || entry.roomIds.includes(roomId);
      const instructorMatch = !entry.instructorIds || entry.instructorIds.includes(instructorId);
      return roomMatch && instructorMatch;
    });
  };
}

/**
 * Classifies an occurrence's temporal state relative to a deterministic clock instant.
 * @param {number} startEpochMs
 * @param {number} endEpochMs
 * @param {number} nowEpochMs
 * @returns {'past' | 'ongoing' | 'upcoming'}
 */
export function classifyTemporalStatus(startEpochMs, endEpochMs, nowEpochMs) {
  if (nowEpochMs < startEpochMs) return 'upcoming';
  if (nowEpochMs < endEpochMs) return 'ongoing';
  return 'past';
}

/**
 * Validates exceptions array and ensures no duplicate exception targets or malformed dates/times.
 * @param {readonly Record<string, any>[]} exceptions
 * @param {Map<string, Record<string, any>>} ruleMap
 */
export function validateScheduleExceptions(exceptions = [], ruleMap = new Map()) {
  const seenKeys = new Set();
  const seenIds = new Set();

  for (const ex of exceptions) {
    if (!ex || typeof ex !== 'object') {
      throw new TypeError('Schedule exception must be an object.');
    }
    if (typeof ex.id !== 'string' || !ex.id.trim()) {
      throw new TypeError('Schedule exception requires a non-empty "id".');
    }
    if (seenIds.has(ex.id)) {
      throw new RangeError(`Duplicate exception id "${ex.id}".`);
    }
    seenIds.add(ex.id);

    if (ex.kind === 'closed') {
      if (!isValidKstDate(ex.date)) {
        throw new RangeError(`Closed exception "${ex.id}" has invalid date "${String(ex.date)}".`);
      }
      const key = `closed:${ex.date}:${ex.roomId ?? ex.locationId ?? '*'}:${ex.instructorId ?? '*'}`;
      if (seenKeys.has(key)) {
        throw new RangeError(`Duplicate closed exception for key "${key}".`);
      }
      seenKeys.add(key);
      continue;
    }

    if (ex.kind === 'extra') {
      if (!isValidKstDate(ex.date)) {
        throw new RangeError(`Extra exception "${ex.id}" has invalid date "${String(ex.date)}".`);
      }
      if (typeof ex.instructorId !== 'string' || !ex.instructorId.trim()) {
        throw new TypeError(`Extra exception "${ex.id}" requires "instructorId".`);
      }
      if (typeof ex.roomId !== 'string' || !ex.roomId.trim()) {
        throw new TypeError(`Extra exception "${ex.id}" requires "roomId".`);
      }
      resolveKstTimeWindow(ex.date, ex.startTime, ex.endTime, {
        allowCrossMidnight: ex.allowCrossMidnight ?? true,
      });
      continue;
    }

    if (ex.kind === 'cancel' || ex.kind === 'reschedule' || ex.kind === 'override') {
      if (typeof ex.classId !== 'string' || !ex.classId.trim()) {
        throw new TypeError(`Exception "${ex.id}" requires "classId".`);
      }
      if (!isValidKstDate(ex.originalDate)) {
        throw new RangeError(`Exception "${ex.id}" has invalid originalDate "${String(ex.originalDate)}".`);
      }
      const baseRule = ruleMap.get(ex.classId);
      if (!baseRule) {
        throw new RangeError(`Exception "${ex.id}" references unknown classId "${ex.classId}".`);
      }
      if (!ruleMatchesKstDate(baseRule, ex.originalDate)) {
        throw new RangeError(
          `Exception "${ex.id}" targets originalDate "${ex.originalDate}" where class "${ex.classId}" does not occur.`,
        );
      }
      const key = `target:${ex.classId}@${ex.originalDate}`;
      if (seenKeys.has(key)) {
        throw new RangeError(`Duplicate exception targeting "${key}".`);
      }
      seenKeys.add(key);

      if (ex.kind === 'reschedule' || ex.kind === 'override') {
        const targetDate = ex.date ?? ex.originalDate;
        const targetStartTime = ex.startTime ?? baseRule.startTime;
        const targetEndTime = ex.endTime ?? baseRule.endTime;
        if (!isValidKstDate(targetDate)) {
          throw new RangeError(`Exception "${ex.id}" has invalid target date "${String(targetDate)}".`);
        }
        resolveKstTimeWindow(targetDate, targetStartTime, targetEndTime, {
          allowCrossMidnight: ex.allowCrossMidnight ?? baseRule.allowCrossMidnight ?? true,
        });
      }
      continue;
    }

    throw new RangeError(`Unsupported exception kind "${String(ex.kind)}" in exception "${ex.id}".`);
  }
}

/**
 * Expands weekly and one-off Pilates classes across a KST date range `[rangeStart, rangeEnd]`.
 *
 * @param {{
 *   classes: readonly Record<string, any>[],
 *   exceptions?: readonly Record<string, any>[],
 *   holidays?: readonly (string | Record<string, any>)[],
 *   rangeStart: string,
 *   rangeEnd: string,
 *   clock?: { nowEpochMs(): number },
 *   includeInactive?: boolean,
 *   includeHolidayRows?: boolean,
 *   includeCrossMidnightSpillover?: boolean
 * }} input
 */
export function expandPilatesSchedule(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('expandPilatesSchedule requires an options object.');
  }

  const {
    classes = [],
    exceptions = [],
    holidays = [],
    rangeStart,
    rangeEnd,
    clock = createDeterministicKstClock(),
    includeInactive = true,
    includeHolidayRows = false,
    includeCrossMidnightSpillover = true,
  } = input;

  const datesInRange = expandKstDateRange(rangeStart, rangeEnd);
  const rangeStartEpochMs = resolveKstTimeWindow(rangeStart, '00:00', '00:01').startEpochMs;
  const rangeEndEpochMs = resolveKstTimeWindow(rangeEnd, '23:59', '24:00').endEpochMs;

  const scanDates = includeCrossMidnightSpillover
    ? [addKstDays(rangeStart, -1), ...datesInRange]
    : datesInRange;

  const ruleMap = new Map();
  for (const rule of classes) {
    validateRecurrenceRule(rule);
    if (ruleMap.has(rule.id)) {
      throw new RangeError(`Duplicate class rule id "${rule.id}".`);
    }
    ruleMap.set(rule.id, rule);
  }

  validateScheduleExceptions(exceptions, ruleMap);
  const matchHoliday = buildHolidayMatcher(holidays);
  const nowEpochMs = clock.nowEpochMs();

  const targetedExceptions = new Map();
  const closedExceptions = [];
  const extraExceptions = [];

  for (const ex of exceptions) {
    if (ex.kind === 'closed') {
      closedExceptions.push(ex);
    } else if (ex.kind === 'extra') {
      extraExceptions.push(ex);
    } else {
      targetedExceptions.set(`${ex.classId}@${ex.originalDate}`, ex);
    }
  }

  const findClosure = (dateStr, roomId, instructorId) =>
    closedExceptions.find((item) => {
      if (item.date !== dateStr) return false;
      const targetRoom = item.roomId ?? item.locationId;
      const roomOk = !targetRoom || targetRoom === roomId;
      const instructorOk = !item.instructorId || item.instructorId === instructorId;
      return roomOk && instructorOk;
    });

  const createOccurrenceRow = (params) => {
    const window = resolveKstTimeWindow(params.date, params.startTime, params.endTime, {
      allowCrossMidnight: params.allowCrossMidnight ?? true,
    });
    return {
      id: params.id,
      classId: params.classId,
      title: params.title,
      instructorId: params.instructorId,
      roomId: params.roomId,
      locationId: params.roomId,
      originalDate: params.originalDate,
      date: params.date,
      endDate: window.endDate,
      startTime: params.startTime,
      endTime: params.endTime,
      normalizedEndTime: window.normalizedEndTime,
      startEpochMs: window.startEpochMs,
      endEpochMs: window.endEpochMs,
      startKstIso: window.startKstIso,
      endKstIso: window.endKstIso,
      durationMinutes: window.durationMinutes,
      crossesMidnight: window.crossesMidnight,
      touchesMidnightStart: window.touchesMidnightStart,
      touchesMidnightEnd: window.touchesMidnightEnd,
      weekday: getKstWeekday(params.date),
      weekOfMonthOrdinal: getKstWeekOfMonth(params.date, { mode: 'weekday-ordinal' }),
      status: params.status,
      temporalStatus: classifyTemporalStatus(window.startEpochMs, window.endEpochMs, nowEpochMs),
      ...(params.movedFrom ? { movedFrom: params.movedFrom } : {}),
      ...(params.movedTo ? { movedTo: params.movedTo } : {}),
      ...(params.reason !== undefined ? { reason: params.reason } : {}),
      ...(params.exceptionId ? { exceptionId: params.exceptionId } : {}),
      ...(params.linkSavedSequenceId ? { linkSavedSequenceId: params.linkSavedSequenceId } : {}),
      notes: params.notes ?? '',
    };
  };

  /** @type {any[]} */
  const occurrences = [];

  for (const rule of classes) {
    for (const scanDate of scanDates) {
      if (!ruleMatchesKstDate(rule, scanDate)) continue;
      const isLookbackDate = scanDate < rangeStart;
      const occurrenceKey = `${rule.id}@${scanDate}`;
      const exception = targetedExceptions.get(occurrenceKey);

      if (exception && (exception.kind === 'reschedule' || exception.kind === 'override')) {
        const targetDate = exception.date ?? scanDate;
        if (!isLookbackDate && targetDate !== scanDate && includeInactive) {
          occurrences.push(
            createOccurrenceRow({
              id: occurrenceKey,
              classId: rule.id,
              title: rule.title,
              instructorId: rule.instructorId,
              roomId: rule.roomId,
              originalDate: scanDate,
              date: scanDate,
              startTime: rule.startTime,
              endTime: rule.endTime,
              allowCrossMidnight: rule.allowCrossMidnight,
              status: 'moved',
              movedTo: targetDate,
              reason: exception.reason,
              exceptionId: exception.id,
              linkSavedSequenceId: rule.linkSavedSequenceId,
              notes: rule.notes,
            }),
          );
        }
        continue;
      }

      if (exception && exception.kind === 'cancel') {
        if (!isLookbackDate && includeInactive) {
          occurrences.push(
            createOccurrenceRow({
              id: occurrenceKey,
              classId: rule.id,
              title: rule.title,
              instructorId: rule.instructorId,
              roomId: rule.roomId,
              originalDate: scanDate,
              date: scanDate,
              startTime: rule.startTime,
              endTime: rule.endTime,
              allowCrossMidnight: rule.allowCrossMidnight,
              status: 'cancelled',
              reason: exception.reason,
              exceptionId: exception.id,
              linkSavedSequenceId: rule.linkSavedSequenceId,
              notes: rule.notes,
            }),
          );
        }
        continue;
      }

      const matchedHoliday = matchHoliday(scanDate, rule.roomId, rule.instructorId);
      if (matchedHoliday) {
        if (!isLookbackDate && (includeHolidayRows || matchedHoliday.mode === 'closed') && includeInactive) {
          occurrences.push(
            createOccurrenceRow({
              id: occurrenceKey,
              classId: rule.id,
              title: rule.title,
              instructorId: rule.instructorId,
              roomId: rule.roomId,
              originalDate: scanDate,
              date: scanDate,
              startTime: rule.startTime,
              endTime: rule.endTime,
              allowCrossMidnight: rule.allowCrossMidnight,
              status: matchedHoliday.mode === 'closed' ? 'closed' : 'holiday',
              reason: matchedHoliday.name,
              linkSavedSequenceId: rule.linkSavedSequenceId,
              notes: rule.notes,
            }),
          );
        }
        continue;
      }

      const closure = findClosure(scanDate, rule.roomId, rule.instructorId);
      if (closure) {
        if (!isLookbackDate && includeInactive) {
          occurrences.push(
            createOccurrenceRow({
              id: occurrenceKey,
              classId: rule.id,
              title: rule.title,
              instructorId: rule.instructorId,
              roomId: rule.roomId,
              originalDate: scanDate,
              date: scanDate,
              startTime: rule.startTime,
              endTime: rule.endTime,
              allowCrossMidnight: rule.allowCrossMidnight,
              status: 'closed',
              reason: closure.reason,
              exceptionId: closure.id,
              linkSavedSequenceId: rule.linkSavedSequenceId,
              notes: rule.notes,
            }),
          );
        }
        continue;
      }

      const row = createOccurrenceRow({
        id: occurrenceKey,
        classId: rule.id,
        title: rule.title,
        instructorId: rule.instructorId,
        roomId: rule.roomId,
        originalDate: scanDate,
        date: scanDate,
        startTime: rule.startTime,
        endTime: rule.endTime,
        allowCrossMidnight: rule.allowCrossMidnight,
        status: 'scheduled',
        linkSavedSequenceId: rule.linkSavedSequenceId,
        notes: rule.notes,
      });

      if (isLookbackDate) {
        if (row.endEpochMs > rangeStartEpochMs) {
          occurrences.push(row);
        }
      } else {
        occurrences.push(row);
      }
    }
  }

  for (const ex of exceptions) {
    if (ex.kind !== 'reschedule' && ex.kind !== 'override') continue;
    const rule = ruleMap.get(ex.classId);
    if (!rule) continue;

    const targetDate = ex.date ?? ex.originalDate;
    const targetStartTime = ex.startTime ?? rule.startTime;
    const targetEndTime = ex.endTime ?? rule.endTime;
    const targetInstructorId = ex.instructorId ?? rule.instructorId;
    const targetRoomId = ex.roomId ?? ex.locationId ?? rule.roomId;
    const targetTitle = ex.title ?? rule.title;

    const candidateRow = createOccurrenceRow({
      id:
        targetDate === ex.originalDate
          ? `${rule.id}@${ex.originalDate}`
          : `${rule.id}@${ex.originalDate}:rescheduled`,
      classId: rule.id,
      title: targetTitle,
      instructorId: targetInstructorId,
      roomId: targetRoomId,
      originalDate: ex.originalDate,
      date: targetDate,
      startTime: targetStartTime,
      endTime: targetEndTime,
      allowCrossMidnight: ex.allowCrossMidnight ?? rule.allowCrossMidnight,
      status: 'scheduled',
      movedFrom: ex.originalDate,
      reason: ex.reason,
      exceptionId: ex.id,
      linkSavedSequenceId: ex.linkSavedSequenceId ?? rule.linkSavedSequenceId,
      notes: ex.notes ?? rule.notes,
    });

    const inDateWindow = targetDate >= rangeStart && targetDate <= rangeEnd;
    const spillsIntoWindow =
      includeCrossMidnightSpillover &&
      targetDate === addKstDays(rangeStart, -1) &&
      candidateRow.endEpochMs > rangeStartEpochMs &&
      candidateRow.startEpochMs < rangeEndEpochMs;

    if (!inDateWindow && !spillsIntoWindow) continue;

    const holidayOnTarget = matchHoliday(targetDate, targetRoomId, targetInstructorId);
    const closureOnTarget = findClosure(targetDate, targetRoomId, targetInstructorId);

    if (closureOnTarget) {
      if (includeInactive) {
        occurrences.push({
          ...candidateRow,
          status: 'closed',
          reason: closureOnTarget.reason || candidateRow.reason,
        });
      }
    } else if (holidayOnTarget) {
      if (includeInactive && (includeHolidayRows || holidayOnTarget.mode === 'closed')) {
        occurrences.push({
          ...candidateRow,
          status: holidayOnTarget.mode === 'closed' ? 'closed' : 'holiday',
          reason: holidayOnTarget.name,
        });
      }
    } else {
      occurrences.push(candidateRow);
    }
  }

  for (const ex of extraExceptions) {
    const candidateRow = createOccurrenceRow({
      id: `extra:${ex.id}@${ex.date}`,
      classId: ex.classId ?? `extra:${ex.id}`,
      title: ex.title ?? '보강/특강 수업',
      instructorId: ex.instructorId,
      roomId: ex.roomId,
      originalDate: ex.date,
      date: ex.date,
      startTime: ex.startTime,
      endTime: ex.endTime,
      allowCrossMidnight: ex.allowCrossMidnight ?? true,
      status: 'scheduled',
      reason: ex.reason,
      exceptionId: ex.id,
      linkSavedSequenceId: ex.linkSavedSequenceId,
      notes: ex.notes,
    });

    const inDateWindow = ex.date >= rangeStart && ex.date <= rangeEnd;
    const spillsIntoWindow =
      includeCrossMidnightSpillover &&
      ex.date === addKstDays(rangeStart, -1) &&
      candidateRow.endEpochMs > rangeStartEpochMs;

    if (!inDateWindow && !spillsIntoWindow) continue;

    const closureOnTarget = findClosure(ex.date, ex.roomId, ex.instructorId);
    if (closureOnTarget) {
      if (includeInactive) {
        occurrences.push({
          ...candidateRow,
          status: 'closed',
          reason: closureOnTarget.reason,
        });
      }
    } else {
      occurrences.push(candidateRow);
    }
  }

  return occurrences.sort(
    (a, b) =>
      a.startEpochMs - b.startEpochMs ||
      a.endEpochMs - b.endEpochMs ||
      a.date.localeCompare(b.date) ||
      a.id.localeCompare(b.id),
  );
}
