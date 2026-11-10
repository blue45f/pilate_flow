// @ts-check

/**
 * KST(+09:00) Deterministic Clock & Calendar Utilities
 * - Pure standard library implementation (no external dependencies)
 * - Explicit +09:00 KST offset independent of host OS timezone
 * - Supports midnight boundary (00:00 start, 24:00 end, and cross-midnight 23:30 -> 00:20 next day)
 */

export const KST_OFFSET_MINUTES = 9 * 60;
export const KST_OFFSET_MS = KST_OFFSET_MINUTES * 60 * 1000;
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MAX_HARD_RANGE_DAYS = 3660;

export const KST_WEEKDAY_LABELS = Object.freeze(['일', '월', '화', '수', '목', '금', '토']);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_START_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIME_END_PATTERN = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const ISO_INSTANT_PATTERN =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Validates whether a string is a valid Gregorian YYYY-MM-DD calendar date between 1900-01-01 and 2199-12-31.
 * @param {unknown} value
 * @returns {value is string}
 */
export function isValidKstDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2199 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

/**
 * Validates start time `HH:mm` (`00:00` .. `23:59`).
 * @param {unknown} value
 * @returns {value is string}
 */
export function isValidStartTime(value) {
  return typeof value === 'string' && TIME_START_PATTERN.test(value);
}

/**
 * Validates end time `HH:mm` (`00:00` .. `24:00`).
 * `24:00` represents the exact midnight end boundary of the current day.
 * @param {unknown} value
 * @returns {value is string}
 */
export function isValidEndTime(value) {
  return typeof value === 'string' && TIME_END_PATTERN.test(value);
}

/**
 * Converts `HH:mm` (`00:00` .. `24:00`) to minutes from midnight (`0` .. `1440`).
 * @param {string} timeStr
 * @param {{ allow24End?: boolean }} [options]
 * @returns {number}
 */
export function parseTimeMinutes(timeStr, options = {}) {
  const allow24End = options.allow24End ?? false;
  const valid = allow24End ? isValidEndTime(timeStr) : isValidStartTime(timeStr);
  if (!valid) {
    throw new TypeError(`Invalid time format: "${String(timeStr)}"`);
  }
  if (timeStr === '24:00') return 1440;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Formats minutes (`0` .. `1440`) back into `HH:mm`.
 * @param {number} totalMinutes
 * @param {{ preserve24End?: boolean }} [options]
 * @returns {string}
 */
export function formatTimeMinutes(totalMinutes, options = {}) {
  if (!Number.isInteger(totalMinutes) || totalMinutes < 0) {
    throw new RangeError(`Invalid minutes value: ${totalMinutes}`);
  }
  if (totalMinutes === 1440 && options.preserve24End) {
    return '24:00';
  }
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Converts a KST date (`YYYY-MM-DD`) and minutes from KST midnight (`00:00`) into a UTC epoch timestamp (ms).
 * Because KST is UTC+09:00 with no DST, `YYYY-MM-DDT00:00:00+09:00` is `Date.UTC(Y, M-1, D) - 9h`.
 * @param {string} dateStr
 * @param {number} [minutesFromMidnight=0]
 * @returns {number}
 */
export function kstDateToEpochMs(dateStr, minutesFromMidnight = 0) {
  if (!isValidKstDate(dateStr)) {
    throw new TypeError(`Invalid KST date: "${String(dateStr)}"`);
  }
  if (!Number.isFinite(minutesFromMidnight)) {
    throw new TypeError(`Invalid minutes offset: ${String(minutesFromMidnight)}`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const kstMidnightUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - KST_OFFSET_MS;
  return kstMidnightUtcMs + minutesFromMidnight * MS_PER_MINUTE;
}

/**
 * Decomposes a UTC epoch timestamp (ms) into KST calendar components.
 * @param {number} epochMs
 * @returns {{
 *   date: string,
 *   time: string,
 *   isoKst: string,
 *   year: number,
 *   month: number,
 *   day: number,
 *   hours: number,
 *   minutes: number,
 *   seconds: number,
 *   weekday: number,
 *   weekdayLabelKo: string
 * }}
 */
export function epochMsToKstParts(epochMs) {
  if (!Number.isFinite(epochMs)) {
    throw new TypeError(`Invalid epochMs: ${String(epochMs)}`);
  }
  const shifted = new Date(epochMs + KST_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const seconds = shifted.getUTCSeconds();
  const weekday = shifted.getUTCDay();

  const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const secStr = String(seconds).padStart(2, '0');
  const isoKst = `${date}T${time}:${secStr}+09:00`;

  return {
    date,
    time,
    isoKst,
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    weekday,
    weekdayLabelKo: KST_WEEKDAY_LABELS[weekday],
  };
}

/**
 * Adds a signed number of calendar days to a KST date (`YYYY-MM-DD`).
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
export function addKstDays(dateStr, days) {
  if (!isValidKstDate(dateStr)) {
    throw new TypeError(`Invalid KST date: "${String(dateStr)}"`);
  }
  if (!Number.isInteger(days)) {
    throw new TypeError(`Days delta must be an integer: ${String(days)}`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${String(shifted.getUTCFullYear()).padStart(4, '0')}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Computes the day difference (`endDate - startDate`) in whole KST calendar days.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
export function diffKstDays(startDate, endDate) {
  if (!isValidKstDate(startDate) || !isValidKstDate(endDate)) {
    throw new TypeError(`Invalid KST date in diffKstDays("${startDate}", "${endDate}")`);
  }
  const [y1, m1, d1] = startDate.split('-').map(Number);
  const [y2, m2, d2] = endDate.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / MS_PER_DAY);
}

/**
 * Returns the KST weekday (`0` = Sunday .. `6` = Saturday) for a `YYYY-MM-DD` date.
 * @param {string} dateStr
 * @returns {number}
 */
export function getKstWeekday(dateStr) {
  if (!isValidKstDate(dateStr)) {
    throw new TypeError(`Invalid KST date: "${String(dateStr)}"`);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Returns the Monday-anchored week start (`YYYY-MM-DD`) in KST (or Sunday-anchored if `weekStartsOn = 0`).
 * Default is Monday (`1`) matching Pilates studio weekly timetable conventions.
 * @param {string} dateStr
 * @param {0 | 1} [weekStartsOn=1]
 * @returns {string}
 */
export function getKstWeekStart(dateStr, weekStartsOn = 1) {
  if (weekStartsOn !== 0 && weekStartsOn !== 1) {
    throw new RangeError(`Invalid weekStartsOn: "${String(weekStartsOn)}" (expected 0 or 1).`);
  }
  const weekday = getKstWeekday(dateStr);
  const offset = weekStartsOn === 1 ? (weekday + 6) % 7 : weekday;
  return addKstDays(dateStr, -offset);
}

/**
 * Computes the 1-based week of the month (`1` .. `6`) for a given KST date.
 * Two modes are supported:
 * - `'weekday-ordinal'` (default): Nth occurrence of that weekday in the month (e.g., 2nd & 4th Wednesday).
 * - `'calendar-week'`: Calendar row index within the month (anchored on Monday by default).
 * @param {string} dateStr
 * @param {{ mode?: 'weekday-ordinal' | 'calendar-week', weekStartsOn?: 0 | 1 }} [options]
 * @returns {number}
 */
export function getKstWeekOfMonth(dateStr, options = {}) {
  if (!isValidKstDate(dateStr)) {
    throw new TypeError(`Invalid KST date: "${String(dateStr)}"`);
  }
  const mode = options.mode ?? 'weekday-ordinal';
  if (mode !== 'weekday-ordinal' && mode !== 'calendar-week') {
    throw new RangeError(`Invalid weekOfMonth mode: "${String(mode)}"`);
  }
  const dayOfMonth = Number(dateStr.slice(8, 10));
  if (mode === 'weekday-ordinal') {
    return Math.floor((dayOfMonth - 1) / 7) + 1;
  }
  const weekStartsOn = options.weekStartsOn ?? 1;
  if (weekStartsOn !== 0 && weekStartsOn !== 1) {
    throw new RangeError(`Invalid weekStartsOn: "${String(weekStartsOn)}" (expected 0 or 1).`);
  }
  const firstOfMonth = `${dateStr.slice(0, 7)}-01`;
  const firstWeekday = getKstWeekday(firstOfMonth);
  const leadingOffset = weekStartsOn === 1 ? (firstWeekday + 6) % 7 : firstWeekday;
  return Math.floor((dayOfMonth - 1 + leadingOffset) / 7) + 1;
}

/**
 * Computes the 0-based week index elapsed since `anchorDate` (using week-start alignment).
 * Useful for bi-weekly (`intervalWeeks: 2`) or N-week rotation schedules.
 * @param {string} anchorDate
 * @param {string} targetDate
 * @param {0 | 1} [weekStartsOn=1]
 * @returns {number}
 */
export function getElapsedWeeksSinceAnchor(anchorDate, targetDate, weekStartsOn = 1) {
  const anchorWeekStart = getKstWeekStart(anchorDate, weekStartsOn);
  const targetWeekStart = getKstWeekStart(targetDate, weekStartsOn);
  const diffDays = diffKstDays(anchorWeekStart, targetWeekStart);
  return Math.floor(diffDays / 7);
}

/**
 * Generates an inclusive KST date list `[startDate .. endDate]` with a safety cap (default 370 days).
 * @param {string} startDate
 * @param {string} endDate
 * @param {{ maxDays?: number }} [options]
 * @returns {string[]}
 */
export function expandKstDateRange(startDate, endDate, options = {}) {
  const maxDays = options.maxDays ?? 370;
  if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > MAX_HARD_RANGE_DAYS) {
    throw new RangeError(
      `Invalid maxDays option: ${String(maxDays)} (expected integer 1..${MAX_HARD_RANGE_DAYS}).`,
    );
  }
  if (!isValidKstDate(startDate) || !isValidKstDate(endDate) || endDate < startDate) {
    throw new RangeError(
      `Invalid KST date range: startDate="${String(startDate)}", endDate="${String(endDate)}"`,
    );
  }
  const totalDays = diffKstDays(startDate, endDate) + 1;
  if (totalDays > maxDays) {
    throw new RangeError(`KST date range exceeds maximum allowed days (${totalDays} > ${maxDays}).`);
  }
  const dates = [];
  for (let i = 0; i < totalDays; i += 1) {
    dates.push(addKstDays(startDate, i));
  }
  return dates;
}

/**
 * Resolves a class time window on `baseDate` (KST) into exact start/end epoch timestamps and calendar bounds.
 * Supports:
 * 1. Standard same-day intervals (`09:00` -> `09:50`).
 * 2. Exact midnight boundaries (`00:00` -> `00:50`, or `23:10` -> `24:00` which ends at `00:00` of `baseDate + 1`).
 * 3. Cross-midnight intervals (`23:30` -> `00:20` when `allowCrossMidnight: true` or `endTime < startTime`),
 *    ending on `baseDate + 1` at `00:20` KST.
 *
 * @param {string} baseDate
 * @param {string} startTime
 * @param {string} endTime
 * @param {{ allowCrossMidnight?: boolean }} [options]
 * @returns {{
 *   startDate: string,
 *   endDate: string,
 *   startTime: string,
 *   endTime: string,
 *   normalizedEndTime: string,
 *   startEpochMs: number,
 *   endEpochMs: number,
 *   startKstIso: string,
 *   endKstIso: string,
 *   durationMinutes: number,
 *   crossesMidnight: boolean,
 *   touchesMidnightStart: boolean,
 *   touchesMidnightEnd: boolean
 * }}
 */
export function resolveKstTimeWindow(baseDate, startTime, endTime, options = {}) {
  if (!isValidKstDate(baseDate)) {
    throw new TypeError(`Invalid baseDate: "${String(baseDate)}"`);
  }
  const allowCrossMidnight = options.allowCrossMidnight ?? true;
  const startMin = parseTimeMinutes(startTime, { allow24End: false });
  const rawEndMin = parseTimeMinutes(endTime, { allow24End: true });

  let effectiveEndMin = rawEndMin;
  let crossesMidnight = false;

  if (rawEndMin === startMin) {
    throw new RangeError(
      `Class startTime and endTime cannot be identical ("${startTime}" -> "${endTime}").`,
    );
  }

  if (rawEndMin < startMin) {
    if (!allowCrossMidnight) {
      throw new RangeError(
        `endTime ("${endTime}") is earlier than startTime ("${startTime}") and cross-midnight is disabled.`,
      );
    }
    effectiveEndMin = rawEndMin + 1440;
    crossesMidnight = true;
  }

  const touchesMidnightStart = startMin === 0;
  const touchesMidnightEnd = effectiveEndMin === 1440;
  const endDate = effectiveEndMin >= 1440 ? addKstDays(baseDate, 1) : baseDate;
  const normalizedEndTime = formatTimeMinutes(effectiveEndMin % 1440);
  const startEpochMs = kstDateToEpochMs(baseDate, startMin);
  const endEpochMs = kstDateToEpochMs(baseDate, effectiveEndMin);
  const durationMinutes = effectiveEndMin - startMin;

  return {
    startDate: baseDate,
    endDate,
    startTime,
    endTime,
    normalizedEndTime,
    startEpochMs,
    endEpochMs,
    startKstIso: epochMsToKstParts(startEpochMs).isoKst,
    endKstIso: epochMsToKstParts(endEpochMs).isoKst,
    durationMinutes,
    crossesMidnight,
    touchesMidnightStart,
    touchesMidnightEnd,
  };
}

/**
 * Parses an ISO-8601 timestamp or KST `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` string into UTC epoch milliseconds.
 * If no timezone offset is present, interprets the string in KST (+09:00).
 * Strictly validates Gregorian calendar dates so invalid dates (e.g. `2026-02-29` or `2026/02/31`) never silently roll over.
 * @param {string | number | Date} input
 * @returns {number}
 */
export function parseKstInstantToEpochMs(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new TypeError(`Invalid epoch number: ${input}`);
    return input;
  }
  if (input instanceof Date) {
    const ms = input.getTime();
    if (Number.isNaN(ms)) throw new TypeError('Invalid Date instance');
    return ms;
  }
  if (typeof input !== 'string') {
    throw new TypeError(`Unsupported clock instant input: ${String(input)}`);
  }
  const trimmed = input.trim();
  if (DATE_PATTERN.test(trimmed)) {
    if (!isValidKstDate(trimmed)) {
      throw new RangeError(`Invalid KST date: "${trimmed}"`);
    }
    return kstDateToEpochMs(trimmed, 0);
  }

  const match = ISO_INSTANT_PATTERN.exec(trimmed);
  if (!match) {
    throw new TypeError(`Invalid ISO/KST timestamp: "${trimmed}"`);
  }

  const [, datePart, hourStr, minStr, secStr = '0', msStr = '0', tzPart] = match;
  if (!isValidKstDate(datePart)) {
    throw new RangeError(`Invalid calendar date in timestamp: "${trimmed}"`);
  }

  const hours = Number(hourStr);
  const minutes = Number(minStr);
  const seconds = Number(secStr);
  const millis = Number(msStr.padEnd(3, '0'));

  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new RangeError(`Invalid clock time in timestamp: "${trimmed}"`);
  }

  let offsetMinutes = KST_OFFSET_MINUTES;
  if (tzPart === 'Z') {
    offsetMinutes = 0;
  } else if (tzPart) {
    const sign = tzPart.startsWith('-') ? -1 : 1;
    const tzHours = Number(tzPart.slice(1, 3));
    const tzMinutes = Number(tzPart.slice(4, 6));
    if (tzHours > 23 || tzMinutes > 59) {
      throw new RangeError(`Invalid timezone offset in timestamp: "${trimmed}"`);
    }
    offsetMinutes = sign * (tzHours * 60 + tzMinutes);
  }

  const [year, month, day] = datePart.split('-').map(Number);
  return (
    Date.UTC(year, month - 1, day, hours, minutes, seconds, millis) -
    offsetMinutes * MS_PER_MINUTE
  );
}

/**
 * Creates a deterministic KST clock for reproducible testing and temporal classification
 * (`past`, `ongoing`, `upcoming` relative to the deterministic clock).
 * @param {string | number | Date} initialInstant
 */
export function createDeterministicKstClock(initialInstant = '2026-11-09T09:00:00+09:00') {
  let currentEpochMs = parseKstInstantToEpochMs(initialInstant);

  return {
    /** @returns {number} */
    nowEpochMs() {
      return currentEpochMs;
    },
    /** @returns {string} */
    nowKstIso() {
      return epochMsToKstParts(currentEpochMs).isoKst;
    },
    /** @returns {string} */
    todayKstDate() {
      return epochMsToKstParts(currentEpochMs).date;
    },
    /** @returns {string} */
    currentKstTime() {
      return epochMsToKstParts(currentEpochMs).time;
    },
    /**
     * @param {string | number | Date} nextInstant
     */
    setNow(nextInstant) {
      currentEpochMs = parseKstInstantToEpochMs(nextInstant);
      return this.nowKstIso();
    },
    /**
     * @param {{ days?: number, hours?: number, minutes?: number, seconds?: number }} delta
     */
    advance(delta = {}) {
      const days = delta.days ?? 0;
      const hours = delta.hours ?? 0;
      const minutes = delta.minutes ?? 0;
      const seconds = delta.seconds ?? 0;
      if (
        !Number.isFinite(days) ||
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        !Number.isFinite(seconds)
      ) {
        throw new TypeError('Clock advance delta fields must be finite numbers.');
      }
      const deltaMs =
        days * MS_PER_DAY +
        hours * 60 * MS_PER_MINUTE +
        minutes * MS_PER_MINUTE +
        seconds * 1000;
      currentEpochMs += deltaMs;
      return this.nowKstIso();
    },
  };
}
