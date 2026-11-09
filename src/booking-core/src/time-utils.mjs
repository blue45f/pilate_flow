/**
 * Pure timestamp, local schedule date/time validation, and period boundary utilities.
 * Directly implements `isScheduleDate`, `scheduleTimeSchema`, `scheduleWeekStart`, and
 * half-open interval conflict rules from `pilates-flow/src/schemas/instructorScheduleSchema.ts`
 * and `pilates-flow/src/utils/instructorSchedule.ts`.
 */

import { BookingErrorCode, PilatesBookingError } from './errors.mjs';

export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Matches `isScheduleDate` in `pilates-flow/src/schemas/instructorScheduleSchema.ts`.
 * @param {string} value
 * @returns {boolean}
 */
export function isScheduleDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2199) return false;
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Matches `scheduleTimeSchema` in `pilates-flow/src/schemas/instructorScheduleSchema.ts`.
 * @param {string} value
 * @returns {boolean}
 */
export function isScheduleTime(value) {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Converts a local schedule `(date: 'YYYY-MM-DD', time: 'HH:MM')` into epoch milliseconds
 * given a timezone offset in minutes (default +540 for KST).
 */
export function scheduleDateTimeToEpochMs(dateStr, timeStr, timezoneOffsetMinutes = 540) {
  if (!isScheduleDate(dateStr)) {
    throw new PilatesBookingError(BookingErrorCode.INVALID_SCHEDULE_DATE, {
      details: { date: dateStr },
    });
  }
  if (!isScheduleTime(timeStr)) {
    throw new PilatesBookingError(BookingErrorCode.INVALID_SCHEDULE_TIME, {
      details: { time: timeStr },
    });
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  return utcMs - timezoneOffsetMinutes * MS_PER_MINUTE;
}

/**
 * Parses an ISO string, Date, or epoch milliseconds into a validated epoch millisecond number.
 * @param {string | number | Date} value
 * @param {string} [fieldName]
 * @returns {number}
 */
export function toEpochMs(value, fieldName = 'timestamp') {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_TIMESTAMP, {
        details: { fieldName, value },
      });
    }
    return value;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    if (Number.isNaN(ms)) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_TIMESTAMP, {
        details: { fieldName, value: String(value) },
      });
    }
    return ms;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_TIMESTAMP, {
        details: { fieldName, value },
      });
    }
    return ms;
  }
  throw new PilatesBookingError(BookingErrorCode.INVALID_TIMESTAMP, {
    details: { fieldName, value },
  });
}

/**
 * Formats epoch milliseconds into an ISO-8601 UTC string.
 * @param {number} ms
 * @returns {string}
 */
export function toIsoString(ms) {
  return new Date(ms).toISOString();
}

/**
 * Checks half-open interval overlap: [startA, endA) and [startB, endB).
 * Directly matches `findInstructorScheduleConflicts` in `pilates-flow/src/utils/instructorSchedule.ts`:
 * Touching boundaries (endA === startB or endB === startA) do NOT overlap.
 * @param {number} startA
 * @param {number} endA
 * @param {number} startB
 * @param {number} endB
 * @returns {boolean}
 */
export function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * Computes the local calendar day key (YYYY-MM-DD) for a timestamp given a timezone offset in minutes.
 * @param {number} epochMs
 * @param {number} [timezoneOffsetMinutes=540] - Default +540 (Asia/Seoul, UTC+9)
 * @returns {string}
 */
export function getLocalDayKey(epochMs, timezoneOffsetMinutes = 540) {
  const shifted = new Date(epochMs + timezoneOffsetMinutes * MS_PER_MINUTE);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes the Monday-anchored week start date (`YYYY-MM-DD`), matching `scheduleWeekStart`
 * in `pilates-flow/src/utils/instructorSchedule.ts`.
 * @param {number} epochMs
 * @param {number} [timezoneOffsetMinutes=540]
 * @returns {string}
 */
export function getLocalWeekKey(epochMs, timezoneOffsetMinutes = 540) {
  const shifted = new Date(epochMs + timezoneOffsetMinutes * MS_PER_MINUTE);
  const dayOfWeek = (shifted.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - dayOfWeek)
  );
  const year = monday.getUTCFullYear();
  const month = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(monday.getUTCDate()).padStart(2, '0');
  return `WEEK-OF-${year}-${month}-${day}`;
}
