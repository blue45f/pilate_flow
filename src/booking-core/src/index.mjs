/**
 * Public API entrypoint for gemini-pilates-booking-core.
 */

export {
  BookingStatus,
  MembershipStatus,
  PilatesBookingEngine,
  SessionStatus,
} from './booking-engine.mjs';

export {
  BookingErrorCode,
  ErrorCategory,
  PilatesBookingError,
} from './errors.mjs';

export {
  createBookingPolicy,
  DEFAULT_BOOKING_POLICY,
  LateCancelPolicy,
  normalizeApparatusType,
  VALID_APPARATUS_TYPES,
  WaitlistCreditPolicy,
} from './config.mjs';

export {
  getLocalDayKey,
  getLocalWeekKey,
  intervalsOverlap,
  isScheduleDate,
  isScheduleTime,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  scheduleDateTimeToEpochMs,
  toEpochMs,
  toIsoString,
} from './time-utils.mjs';

export {
  BASE_REFERENCE_TIME,
  createVirtualStudioFixtures,
} from './fixtures.mjs';
