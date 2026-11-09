/**
 * Configurable domain policy defaults and validation for Pilates-flow booking engine.
 *
 * Aligns with existing `pilates-flow` rules read from:
 * - `src/types/pilates.ts`: ApparatusType ('reformer' | 'cadillac' | 'chair' | 'barrel' | 'mat'),
 *   ClassGroupProfile.type ('group' | 'private'), 50-minute class standard.
 * - `src/types/instructorSchedule.ts`, `src/schemas/instructorScheduleSchema.ts`,
 *   `src/utils/instructorSchedule.ts`: occurrence status ('scheduled' | 'cancelled' | 'closed' | 'moved'),
 *   half-open interval overlap [startTime, endTime), Monday-anchored week start (`scheduleWeekStart`).
 * - `BACKEND.md` & `backend/backupService.ts`: stable requestId/idempotencyKey + payload fingerprint reconciliation.
 *
 * Member booking capacity, waitlist promotion, credit deduction/refund, and booking/cancellation time
 * windows are absent from the instructor-only `pilates-flow` codebase and are explicitly parameterized here.
 */

export const VALID_APPARATUS_TYPES = Object.freeze([
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
]);

export function normalizeApparatusType(value) {
  if (typeof value !== 'string') return 'reformer';
  return value.trim().toLowerCase();
}

export const WaitlistCreditPolicy = Object.freeze({
  /** Deduct 1 credit when entering the waitlist; refund immediately if cancelled while waitlisted. */
  HOLD_ON_WAITLIST: 'HOLD_ON_WAITLIST',
  /** Do not deduct credit on waitlist entry; deduct 1 credit only when promoted to CONFIRMED. */
  CHARGE_ON_PROMOTION: 'CHARGE_ON_PROMOTION',
});

export const LateCancelPolicy = Object.freeze({
  /** Allow cancellation after free-cancel deadline, but forfeit (do not refund) the deducted credit. */
  FORFEIT_CREDIT: 'FORFEIT_CREDIT',
  /** Allow cancellation after free-cancel deadline and still refund credit (lenient studio policy). */
  REFUND_CREDIT: 'REFUND_CREDIT',
  /** Reject cancellation attempts after free-cancel deadline with LATE_CANCELLATION_DENIED. */
  REJECT_LATE_CANCEL: 'REJECT_LATE_CANCEL',
});

export const DEFAULT_BOOKING_POLICY = Object.freeze({
  /** How many hours before session start bookings open (default: 168h = 7 days). null disables lower bound. */
  bookingOpenHoursBeforeStart: 168,
  /** How many minutes before session start bookings close (default: 30m). 0 means up to session start. */
  bookingCloseMinutesBeforeStart: 30,
  /** How many minutes before session start free cancellation (with credit refund) ends (default: 1440m = 24h). */
  freeCancelMinutesBeforeStart: 1440,
  /** How many minutes before session start any member cancellation is blocked (default: 0m = session start). */
  cancelCutoffMinutesBeforeStart: 0,
  /** Whether waitlisting is enabled when confirmed seats reach capacity. */
  enableWaitlist: true,
  /** Default waitlist capacity if not explicitly set on the session. */
  defaultWaitlistCapacity: 5,
  /** Credit deduction strategy for waitlisted bookings. */
  waitlistCreditPolicy: WaitlistCreditPolicy.HOLD_ON_WAITLIST,
  /** Whether cancelling a CONFIRMED booking automatically promotes the #1 eligible waitlisted booking. */
  autoPromoteFromWaitlist: true,
  /** Minimum minutes before session start required for automatic waitlist promotion (default: 60m). */
  promotionCutoffMinutesBeforeStart: 60,
  /** How late cancellations (between freeCancelMinutesBeforeStart and cancelCutoffMinutesBeforeStart) are handled. */
  lateCancelPolicy: LateCancelPolicy.FORFEIT_CREDIT,
  /** Whether to block booking a session that overlaps in time with another active booking for the same member. */
  preventOverlappingSessions: true,
  /** Whether overlapping check also includes WAITLISTED bookings (true) or only CONFIRMED bookings (false). */
  includeWaitlistedInOverlapCheck: true,
  /** Whether a member who cancelled a session can book that same session again later. */
  allowRebookAfterCancel: true,
  /** Verify that membership is valid not only at request time, but also at the session start timestamp. */
  checkMembershipValidAtSessionStart: true,
  /** Require idempotencyKey on all mutating requests. */
  requireIdempotencyKey: false,
  /** Timezone offset in minutes for daily/weekly limit bucketing (default: +540 for Asia/Seoul KST). */
  timezoneOffsetMinutes: 540,
});

/**
 * Merges user-provided policy overrides with DEFAULT_BOOKING_POLICY.
 * @param {Partial<typeof DEFAULT_BOOKING_POLICY>} [overrides]
 */
export function createBookingPolicy(overrides = {}) {
  return Object.freeze({
    ...DEFAULT_BOOKING_POLICY,
    ...overrides,
  });
}
