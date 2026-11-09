/**
 * Core domain engine for Pilates-flow class booking, waitlist management,
 * automatic promotion, membership credit ledger, period boundaries, and idempotency.
 * Pure JavaScript (Node >= 18 ESM), zero external dependencies.
 */

import { BookingErrorCode, PilatesBookingError } from './errors.mjs';
import {
  createBookingPolicy,
  LateCancelPolicy,
  normalizeApparatusType,
  WaitlistCreditPolicy,
} from './config.mjs';
import {
  getLocalDayKey,
  getLocalWeekKey,
  intervalsOverlap,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  scheduleDateTimeToEpochMs,
  toEpochMs,
  toIsoString,
} from './time-utils.mjs';

export const BookingStatus = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  WAITLISTED: 'WAITLISTED',
  CANCELLED: 'CANCELLED',
});

export const MembershipStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
});

/**
 * Matches `InstructorScheduleOccurrence['status']` in `pilates-flow/src/types/instructorSchedule.ts`
 * (supports both lowercase `'scheduled' | 'cancelled' | 'closed' | 'moved'` and uppercase aliases).
 */
export const SessionStatus = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED',
  MOVED: 'MOVED',
});

function normalizeSessionStatus(status) {
  if (!status || typeof status !== 'string') return SessionStatus.SCHEDULED;
  const upper = status.trim().toUpperCase();
  if (upper === 'CANCELLED') return SessionStatus.CANCELLED;
  if (upper === 'CLOSED') return SessionStatus.CLOSED;
  if (upper === 'MOVED') return SessionStatus.MOVED;
  return SessionStatus.SCHEDULED;
}

function cloneDeep(value) {
  return structuredClone(value);
}

export class PilatesBookingEngine {
  /**
   * @param {object} [options]
   * @param {Partial<import('./config.mjs').DEFAULT_BOOKING_POLICY>} [options.policy]
   * @param {Array<object>} [options.members]
   * @param {Array<object>} [options.memberships]
   * @param {Array<object>} [options.sessions]
   * @param {Array<object>} [options.bookings]
   */
  constructor(options = {}) {
    this.policy = createBookingPolicy(options.policy || {});
    this.members = new Map();
    this.memberships = new Map();
    this.sessions = new Map();
    this.bookings = new Map();
    this.creditLedger = [];
    this.idempotencyStore = new Map();
    this._bookingSeq = 1;
    this._ledgerSeq = 1;

    for (const m of options.members || []) {
      this.registerMember(m);
    }
    for (const ms of options.memberships || []) {
      this.registerMembership(ms);
    }
    for (const s of options.sessions || []) {
      this.registerSession(s);
    }
    for (const b of options.bookings || []) {
      this._seedBooking(b);
    }
  }

  registerMember(member) {
    if (!member || typeof member.id !== 'string' || !member.id.trim()) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { field: 'member.id' },
      });
    }
    const record = {
      id: member.id,
      name: member.name || member.id,
      active: member.active !== false,
      tier: member.tier || 'STANDARD',
    };
    this.members.set(record.id, record);
    return cloneDeep(record);
  }

  registerMembership(membership) {
    if (!membership || typeof membership.id !== 'string' || !membership.id.trim()) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { field: 'membership.id' },
      });
    }
    if (!membership.memberId || typeof membership.memberId !== 'string') {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { field: 'membership.memberId' },
      });
    }
    const validFromMs = toEpochMs(membership.validFrom, 'membership.validFrom');
    const expiresAtMs = toEpochMs(membership.expiresAt, 'membership.expiresAt');
    if (expiresAtMs < validFromMs) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        message: '회원권 만료일(expiresAt)은 시작일(validFrom)보다 빠를 수 없습니다.',
        details: {
          membershipId: membership.id,
          validFrom: toIsoString(validFromMs),
          expiresAt: toIsoString(expiresAtMs),
        },
      });
    }
    const totalCredits = Number(membership.totalCredits);
    const remainingCredits = Number(
      membership.remainingCredits ?? membership.totalCredits
    );
    if (
      !Number.isInteger(totalCredits) ||
      totalCredits < 0 ||
      !Number.isInteger(remainingCredits) ||
      remainingCredits < 0 ||
      remainingCredits > totalCredits
    ) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        message: '회원권 총 횟수 및 잔여 횟수는 0 이상의 정수여야 하며 잔여 횟수는 총 횟수를 초과할 수 없습니다.',
        details: {
          membershipId: membership.id,
          totalCredits,
          remainingCredits,
        },
      });
    }

    const record = {
      id: membership.id,
      memberId: membership.memberId,
      planName: membership.planName || 'Pilates Standard Pass',
      totalCredits,
      remainingCredits,
      validFrom: toIsoString(validFromMs),
      validFromMs,
      expiresAt: toIsoString(expiresAtMs),
      expiresAtMs,
      status: membership.status || MembershipStatus.ACTIVE,
      allowedApparatus: Array.isArray(membership.allowedApparatus)
        ? membership.allowedApparatus.map(normalizeApparatusType)
        : null,
      dailyBookingLimit:
        typeof membership.dailyBookingLimit === 'number'
          ? membership.dailyBookingLimit
          : null,
      weeklyBookingLimit:
        typeof membership.weeklyBookingLimit === 'number'
          ? membership.weeklyBookingLimit
          : null,
    };
    this.memberships.set(record.id, record);
    return cloneDeep(record);
  }

  /**
   * Registers a session either from ISO timestamps (`startsAt`, `endsAt`) OR directly from
   * a `pilates-flow` `InstructorScheduleOccurrence` (`date`, `startTime`, `endTime`, `status`).
   */
  registerSession(session) {
    if (!session || typeof session.id !== 'string' || !session.id.trim()) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { field: 'session.id' },
      });
    }

    let startsAtMs;
    let endsAtMs;
    if (session.date && session.startTime && session.endTime) {
      // Matches `instructorScheduledClassSchema` in `pilates-flow/src/schemas/instructorScheduleSchema.ts`
      startsAtMs = scheduleDateTimeToEpochMs(
        session.date,
        session.startTime,
        this.policy.timezoneOffsetMinutes
      );
      endsAtMs = scheduleDateTimeToEpochMs(
        session.date,
        session.endTime,
        this.policy.timezoneOffsetMinutes
      );
      if (session.endTime <= session.startTime) {
        throw new PilatesBookingError(BookingErrorCode.INVALID_TIME_ORDER, {
          details: {
            sessionId: session.id,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
          },
        });
      }
    } else {
      startsAtMs = toEpochMs(session.startsAt, 'session.startsAt');
      endsAtMs = toEpochMs(session.endsAt, 'session.endsAt');
      if (endsAtMs <= startsAtMs) {
        throw new PilatesBookingError(BookingErrorCode.INVALID_TIME_ORDER, {
          details: {
            sessionId: session.id,
            startsAt: toIsoString(startsAtMs),
            endsAt: toIsoString(endsAtMs),
          },
        });
      }
    }

    const classType = session.classType || (session.capacity === 1 ? 'private' : 'group');
    const capacity = Number(session.capacity ?? (classType === 'private' ? 1 : 4));
    const waitlistCapacity = Number(
      session.waitlistCapacity ?? this.policy.defaultWaitlistCapacity
    );
    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      !Number.isInteger(waitlistCapacity) ||
      waitlistCapacity < 0
    ) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_CAPACITY, {
        details: { sessionId: session.id, capacity, waitlistCapacity },
      });
    }

    const record = {
      id: session.id,
      classId: session.classId || session.id,
      title: session.title || 'Reformer Flow',
      instructorName: session.instructorName || session.participantAlias || 'Instructor',
      locationId: session.locationId || 'loc_default',
      apparatus: normalizeApparatusType(session.apparatus || 'reformer'),
      classType,
      startsAt: toIsoString(startsAtMs),
      startsAtMs,
      endsAt: toIsoString(endsAtMs),
      endsAtMs,
      capacity,
      waitlistCapacity,
      allowWaitlist:
        typeof session.allowWaitlist === 'boolean'
          ? session.allowWaitlist
          : this.policy.enableWaitlist,
      status: normalizeSessionStatus(session.status),
      movedTo: session.movedTo || null,
      reason: session.reason || null,
    };
    this.sessions.set(record.id, record);
    return cloneDeep(record);
  }

  _nextBookingId() {
    while (true) {
      let seqValue;
      if (typeof this._bookingSeq === 'bigint') {
        seqValue = this._bookingSeq;
        this._bookingSeq = seqValue + 1n;
      } else if (
        Number.isSafeInteger(this._bookingSeq) &&
        this._bookingSeq < Number.MAX_SAFE_INTEGER
      ) {
        seqValue = this._bookingSeq;
        this._bookingSeq += 1;
      } else {
        seqValue = BigInt(this._bookingSeq);
        this._bookingSeq = seqValue + 1n;
      }
      const candidate = `bk_${String(seqValue).padStart(4, '0')}`;
      if (!this.bookings.has(candidate)) {
        return candidate;
      }
    }
  }

  _advanceBookingSeqFromId(id) {
    if (typeof id !== 'string') return;
    const match = /^bk_(\d+)$/.exec(id.trim());
    if (!match) return;
    const parsedBigInt = BigInt(match[1]);
    const nextBigInt = parsedBigInt + 1n;
    const maxSafeBigInt = BigInt(Number.MAX_SAFE_INTEGER);

    if (
      typeof this._bookingSeq === 'number' &&
      parsedBigInt < maxSafeBigInt &&
      nextBigInt <= maxSafeBigInt
    ) {
      const seqNum = Number(parsedBigInt);
      if (
        Number.isSafeInteger(seqNum) &&
        Number.isSafeInteger(seqNum + 1) &&
        seqNum >= this._bookingSeq
      ) {
        this._bookingSeq = seqNum + 1;
      }
      return;
    }

    const currentBigInt =
      typeof this._bookingSeq === 'bigint'
        ? this._bookingSeq
        : BigInt(this._bookingSeq);
    if (nextBigInt > currentBigInt) {
      this._bookingSeq = nextBigInt;
    }
  }

  _seedBooking(booking) {
    if (!booking || typeof booking !== 'object') {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { field: 'booking' },
      });
    }
    let id;
    if (typeof booking.id === 'string' && booking.id.trim()) {
      id = booking.id.trim();
      if (this.bookings.has(id)) {
        throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
          message: `중복된 초기 예약 ID(${id})는 등록할 수 없습니다.`,
          details: { field: 'booking.id', bookingId: id },
        });
      }
      this._advanceBookingSeqFromId(id);
    } else {
      id = this._nextBookingId();
    }
    const requestedAtMs = toEpochMs(booking.requestedAt || Date.now(), 'booking.requestedAt');
    const record = {
      id,
      sessionId: booking.sessionId,
      memberId: booking.memberId,
      membershipId: booking.membershipId,
      status: booking.status || BookingStatus.CONFIRMED,
      waitlistPosition: booking.waitlistPosition ?? null,
      creditDeducted: Boolean(booking.creditDeducted ?? true),
      creditRefunded: Boolean(booking.creditRefunded ?? false),
      lateCancelPenalty: Boolean(booking.lateCancelPenalty ?? false),
      requestedAt: toIsoString(requestedAtMs),
      requestedAtMs,
      confirmedAt:
        booking.confirmedAt ||
        (booking.status === BookingStatus.CONFIRMED ? toIsoString(requestedAtMs) : null),
      promotedAt: booking.promotedAt || null,
      cancelledAt: booking.cancelledAt || null,
      cancelReason: booking.cancelReason || null,
      idempotencyKey: booking.idempotencyKey || null,
    };
    this.bookings.set(record.id, record);
  }

  _recordLedgerEntry({
    membershipId,
    memberId,
    bookingId,
    sessionId,
    delta,
    balanceAfter,
    reason,
    occurredAtMs,
    idempotencyKey = null,
  }) {
    const entry = {
      id: `ldg_${String(this._ledgerSeq++).padStart(4, '0')}`,
      membershipId,
      memberId,
      bookingId,
      sessionId,
      delta,
      balanceAfter,
      reason,
      occurredAt: toIsoString(occurredAtMs),
      occurredAtMs,
      idempotencyKey,
    };
    this.creditLedger.push(entry);
    return entry;
  }

  _checkIdempotency(operation, idempotencyKey, fingerprintPayload) {
    if (
      this.policy.requireIdempotencyKey &&
      (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim())
    ) {
      throw new PilatesBookingError(BookingErrorCode.IDEMPOTENCY_KEY_REQUIRED, {
        details: { operation },
      });
    }
    if (!idempotencyKey) {
      return null;
    }
    const fingerprint = JSON.stringify({ operation, ...fingerprintPayload });
    const existing = this.idempotencyStore.get(idempotencyKey);
    if (!existing) {
      return { idempotencyKey, fingerprint, cachedResult: null };
    }
    if (existing.fingerprint !== fingerprint) {
      throw new PilatesBookingError(BookingErrorCode.IDEMPOTENCY_KEY_CONFLICT, {
        details: {
          idempotencyKey,
          operation,
          previousOperation: existing.operation,
        },
      });
    }
    return {
      idempotencyKey,
      fingerprint,
      cachedResult: cloneDeep(existing.result),
    };
  }

  _saveIdempotency(idempotencyKey, operation, fingerprint, result) {
    if (!idempotencyKey) return;
    this.idempotencyStore.set(idempotencyKey, {
      operation,
      fingerprint,
      result: cloneDeep(result),
    });
  }

  _getSessionBookings(sessionId) {
    const list = [];
    for (const b of this.bookings.values()) {
      if (b.sessionId === sessionId) {
        list.push(b);
      }
    }
    return list;
  }

  _getConfirmedBookings(sessionId) {
    return this._getSessionBookings(sessionId).filter(
      (b) => b.status === BookingStatus.CONFIRMED
    );
  }

  _getWaitlistedBookings(sessionId) {
    return this._getSessionBookings(sessionId)
      .filter((b) => b.status === BookingStatus.WAITLISTED)
      .sort((a, b) => {
        if (a.waitlistPosition !== b.waitlistPosition) {
          return (a.waitlistPosition ?? 999999) - (b.waitlistPosition ?? 999999);
        }
        return a.requestedAtMs - b.requestedAtMs;
      });
  }

  _reindexWaitlist(sessionId) {
    const waitlisted = this._getWaitlistedBookings(sessionId);
    waitlisted.forEach((booking, idx) => {
      booking.waitlistPosition = idx + 1;
    });
    return waitlisted;
  }

  /**
   * Validates membership eligibility for a given session and timestamp.
   */
  _validateMembershipForSession(
    membership,
    memberId,
    session,
    requestedAtMs,
    requireImmediateCredit = true
  ) {
    if (membership.memberId !== memberId) {
      throw new PilatesBookingError(BookingErrorCode.MEMBERSHIP_OWNER_MISMATCH, {
        details: {
          membershipId: membership.id,
          ownerMemberId: membership.memberId,
          requestedMemberId: memberId,
        },
      });
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new PilatesBookingError(BookingErrorCode.MEMBERSHIP_INACTIVE, {
        details: {
          membershipId: membership.id,
          status: membership.status,
        },
      });
    }

    if (requestedAtMs > membership.expiresAtMs) {
      throw new PilatesBookingError(BookingErrorCode.MEMBERSHIP_EXPIRED, {
        details: {
          membershipId: membership.id,
          requestedAt: toIsoString(requestedAtMs),
          expiresAt: membership.expiresAt,
        },
      });
    }

    if (session.startsAtMs < membership.validFromMs) {
      throw new PilatesBookingError(BookingErrorCode.MEMBERSHIP_NOT_YET_VALID, {
        details: {
          membershipId: membership.id,
          sessionStartsAt: session.startsAt,
          validFrom: membership.validFrom,
        },
      });
    }

    if (
      this.policy.checkMembershipValidAtSessionStart &&
      session.startsAtMs > membership.expiresAtMs
    ) {
      throw new PilatesBookingError(
        BookingErrorCode.MEMBERSHIP_EXPIRED_AT_SESSION_TIME,
        {
          details: {
            membershipId: membership.id,
            sessionStartsAt: session.startsAt,
            expiresAt: membership.expiresAt,
          },
        }
      );
    }

    if (
      Array.isArray(membership.allowedApparatus) &&
      membership.allowedApparatus.length > 0 &&
      !membership.allowedApparatus.includes(normalizeApparatusType(session.apparatus))
    ) {
      throw new PilatesBookingError(BookingErrorCode.APPARATUS_NOT_ALLOWED, {
        details: {
          membershipId: membership.id,
          sessionApparatus: session.apparatus,
          allowedApparatus: membership.allowedApparatus,
        },
      });
    }

    if (requireImmediateCredit && membership.remainingCredits < 1) {
      throw new PilatesBookingError(BookingErrorCode.INSUFFICIENT_CREDITS, {
        details: {
          membershipId: membership.id,
          remainingCredits: membership.remainingCredits,
        },
      });
    }
  }

  /**
   * Validates daily and weekly booking limits for the member/membership.
   */
  _validatePeriodicBookingLimits(membership, memberId, targetSession) {
    if (
      membership.dailyBookingLimit === null &&
      membership.weeklyBookingLimit === null
    ) {
      return;
    }

    const tz = this.policy.timezoneOffsetMinutes;
    const targetDayKey = getLocalDayKey(targetSession.startsAtMs, tz);
    const targetWeekKey = getLocalWeekKey(targetSession.startsAtMs, tz);

    let sameDayCount = 0;
    let sameWeekCount = 0;

    for (const b of this.bookings.values()) {
      if (b.memberId !== memberId) continue;
      if (
        b.status !== BookingStatus.CONFIRMED &&
        b.status !== BookingStatus.WAITLISTED
      ) {
        continue;
      }
      const bookedSession = this.sessions.get(b.sessionId);
      if (!bookedSession || bookedSession.status !== SessionStatus.SCHEDULED) continue;

      if (getLocalDayKey(bookedSession.startsAtMs, tz) === targetDayKey) {
        sameDayCount += 1;
      }
      if (getLocalWeekKey(bookedSession.startsAtMs, tz) === targetWeekKey) {
        sameWeekCount += 1;
      }
    }

    if (
      membership.dailyBookingLimit !== null &&
      sameDayCount >= membership.dailyBookingLimit
    ) {
      throw new PilatesBookingError(
        BookingErrorCode.DAILY_BOOKING_LIMIT_EXCEEDED,
        {
          details: {
            memberId,
            membershipId: membership.id,
            dailyBookingLimit: membership.dailyBookingLimit,
            currentDayBookings: sameDayCount,
            dayKey: targetDayKey,
          },
        }
      );
    }

    if (
      membership.weeklyBookingLimit !== null &&
      sameWeekCount >= membership.weeklyBookingLimit
    ) {
      throw new PilatesBookingError(
        BookingErrorCode.WEEKLY_BOOKING_LIMIT_EXCEEDED,
        {
          details: {
            memberId,
            membershipId: membership.id,
            weeklyBookingLimit: membership.weeklyBookingLimit,
            currentWeekBookings: sameWeekCount,
            weekKey: targetWeekKey,
          },
        }
      );
    }
  }

  /**
   * Creates a booking (CONFIRMED or WAITLISTED) or throws PilatesBookingError.
   */
  bookSessionOrThrow(request) {
    if (!request || typeof request !== 'object') {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT);
    }
    const {
      memberId,
      sessionId,
      membershipId,
      requestedAt,
      allowWaitlist = true,
      idempotencyKey = null,
    } = request;

    if (!memberId || !sessionId || !membershipId) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { memberId, sessionId, membershipId },
      });
    }

    const idemCheck = this._checkIdempotency('BOOK_SESSION', idempotencyKey, {
      memberId,
      sessionId,
      membershipId,
      allowWaitlist: Boolean(allowWaitlist),
    });
    if (idemCheck && idemCheck.cachedResult) {
      return {
        ...idemCheck.cachedResult,
        idempotentReplay: true,
      };
    }

    const requestedAtMs = toEpochMs(requestedAt, 'requestedAt');

    const member = this.members.get(memberId);
    if (!member || !member.active) {
      throw new PilatesBookingError(BookingErrorCode.MEMBER_NOT_FOUND, {
        details: { memberId },
      });
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_NOT_FOUND, {
        details: { sessionId },
      });
    }
    if (session.status === SessionStatus.CANCELLED) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_CANCELLED, {
        details: { sessionId, reason: session.reason },
      });
    }
    if (session.status === SessionStatus.CLOSED) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_CLOSED, {
        details: { sessionId, reason: session.reason },
      });
    }
    if (session.status === SessionStatus.MOVED) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_MOVED, {
        details: { sessionId, movedTo: session.movedTo, reason: session.reason },
      });
    }

    const membership = this.memberships.get(membershipId);
    if (!membership) {
      throw new PilatesBookingError(BookingErrorCode.MEMBERSHIP_NOT_FOUND, {
        details: { membershipId },
      });
    }

    // 1. Validate session booking time window boundaries
    if (requestedAtMs >= session.startsAtMs) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_ALREADY_STARTED, {
        details: {
          sessionId,
          requestedAt: toIsoString(requestedAtMs),
          sessionStartsAt: session.startsAt,
        },
      });
    }

    if (this.policy.bookingOpenHoursBeforeStart !== null) {
      const openBoundaryMs =
        session.startsAtMs -
        this.policy.bookingOpenHoursBeforeStart * MS_PER_HOUR;
      if (requestedAtMs < openBoundaryMs) {
        throw new PilatesBookingError(BookingErrorCode.BOOKING_WINDOW_NOT_OPEN, {
          details: {
            sessionId,
            requestedAt: toIsoString(requestedAtMs),
            bookingOpensAt: toIsoString(openBoundaryMs),
            sessionStartsAt: session.startsAt,
          },
        });
      }
    }

    if (this.policy.bookingCloseMinutesBeforeStart !== null) {
      const closeBoundaryMs =
        session.startsAtMs -
        this.policy.bookingCloseMinutesBeforeStart * MS_PER_MINUTE;
      if (requestedAtMs > closeBoundaryMs) {
        throw new PilatesBookingError(BookingErrorCode.BOOKING_WINDOW_CLOSED, {
          details: {
            sessionId,
            requestedAt: toIsoString(requestedAtMs),
            bookingClosesAt: toIsoString(closeBoundaryMs),
            sessionStartsAt: session.startsAt,
          },
        });
      }
    }

    // 2. Duplicate & overlapping session checks for this member
    for (const existing of this.bookings.values()) {
      if (existing.memberId !== memberId) continue;

      if (existing.sessionId === sessionId) {
        if (
          existing.status === BookingStatus.CONFIRMED ||
          existing.status === BookingStatus.WAITLISTED
        ) {
          throw new PilatesBookingError(
            BookingErrorCode.DUPLICATE_SESSION_BOOKING,
            {
              details: {
                memberId,
                sessionId,
                existingBookingId: existing.id,
                existingStatus: existing.status,
              },
            }
          );
        }
        if (
          existing.status === BookingStatus.CANCELLED &&
          !this.policy.allowRebookAfterCancel
        ) {
          throw new PilatesBookingError(
            BookingErrorCode.REBOOK_AFTER_CANCEL_FORBIDDEN,
            {
              details: {
                memberId,
                sessionId,
                cancelledBookingId: existing.id,
              },
            }
          );
        }
      } else if (this.policy.preventOverlappingSessions) {
        const isConfirmed = existing.status === BookingStatus.CONFIRMED;
        const isWaitlisted =
          this.policy.includeWaitlistedInOverlapCheck &&
          existing.status === BookingStatus.WAITLISTED;
        if (isConfirmed || isWaitlisted) {
          const otherSession = this.sessions.get(existing.sessionId);
          // Matches `findInstructorScheduleConflicts` in `pilates-flow/src/utils/instructorSchedule.ts`:
          // Only active `SCHEDULED` sessions conflict on half-open `[startsAt, endsAt)`.
          if (
            otherSession &&
            otherSession.status === SessionStatus.SCHEDULED &&
            intervalsOverlap(
              session.startsAtMs,
              session.endsAtMs,
              otherSession.startsAtMs,
              otherSession.endsAtMs
            )
          ) {
            throw new PilatesBookingError(
              BookingErrorCode.OVERLAPPING_SESSION_BOOKING,
              {
                details: {
                  memberId,
                  sessionId,
                  conflictingSessionId: otherSession.id,
                  conflictingBookingId: existing.id,
                  conflictingStartsAt: otherSession.startsAt,
                  conflictingEndsAt: otherSession.endsAt,
                },
              }
            );
          }
        }
      }
    }

    // 3. Membership validity & credit checks
    this._validateMembershipForSession(
      membership,
      memberId,
      session,
      requestedAtMs,
      true
    );
    this._validatePeriodicBookingLimits(membership, memberId, session);

    // 4. Capacity vs Waitlist evaluation
    const confirmedBookings = this._getConfirmedBookings(sessionId);
    const waitlistedBookings = this._getWaitlistedBookings(sessionId);

    let targetStatus;
    let waitlistPosition = null;
    let shouldDeductCreditNow = false;
    let ledgerReason = null;

    if (confirmedBookings.length < session.capacity) {
      targetStatus = BookingStatus.CONFIRMED;
      shouldDeductCreditNow = true;
      ledgerReason = 'BOOKING_CONFIRMED';
    } else {
      if (!session.allowWaitlist || !this.policy.enableWaitlist) {
        throw new PilatesBookingError(BookingErrorCode.WAITLIST_DISABLED, {
          details: {
            sessionId,
            capacity: session.capacity,
            confirmedCount: confirmedBookings.length,
          },
        });
      }
      if (!allowWaitlist) {
        throw new PilatesBookingError(BookingErrorCode.CAPACITY_EXCEEDED, {
          details: {
            sessionId,
            capacity: session.capacity,
            confirmedCount: confirmedBookings.length,
          },
        });
      }
      if (waitlistedBookings.length >= session.waitlistCapacity) {
        throw new PilatesBookingError(BookingErrorCode.WAITLIST_FULL, {
          details: {
            sessionId,
            capacity: session.capacity,
            waitlistCapacity: session.waitlistCapacity,
            waitlistCount: waitlistedBookings.length,
          },
        });
      }
      targetStatus = BookingStatus.WAITLISTED;
      waitlistPosition = waitlistedBookings.length + 1;
      shouldDeductCreditNow =
        this.policy.waitlistCreditPolicy ===
        WaitlistCreditPolicy.HOLD_ON_WAITLIST;
      ledgerReason = 'WAITLIST_HOLD';
    }

    // 5. Apply credit deduction if required now
    const bookingId = this._nextBookingId();
    let ledgerEntry = null;
    if (shouldDeductCreditNow) {
      membership.remainingCredits -= 1;
      ledgerEntry = this._recordLedgerEntry({
        membershipId: membership.id,
        memberId,
        bookingId,
        sessionId,
        delta: -1,
        balanceAfter: membership.remainingCredits,
        reason: ledgerReason,
        occurredAtMs: requestedAtMs,
        idempotencyKey,
      });
    }

    const bookingRecord = {
      id: bookingId,
      sessionId,
      memberId,
      membershipId: membership.id,
      status: targetStatus,
      waitlistPosition,
      creditDeducted: shouldDeductCreditNow,
      creditRefunded: false,
      lateCancelPenalty: false,
      requestedAt: toIsoString(requestedAtMs),
      requestedAtMs,
      confirmedAt:
        targetStatus === BookingStatus.CONFIRMED
          ? toIsoString(requestedAtMs)
          : null,
      promotedAt: null,
      cancelledAt: null,
      cancelReason: null,
      idempotencyKey,
    };

    this.bookings.set(bookingRecord.id, bookingRecord);

    const response = {
      booking: cloneDeep(bookingRecord),
      membership: {
        id: membership.id,
        remainingCredits: membership.remainingCredits,
        totalCredits: membership.totalCredits,
      },
      sessionSummary: this.getSessionRoster(sessionId),
      ledgerEntry: ledgerEntry ? cloneDeep(ledgerEntry) : null,
      idempotentReplay: false,
    };

    if (idemCheck) {
      this._saveIdempotency(
        idempotencyKey,
        'BOOK_SESSION',
        idemCheck.fingerprint,
        response
      );
    }

    return response;
  }

  bookSession(request) {
    try {
      const data = this.bookSessionOrThrow(request);
      return {
        ok: true,
        idempotentReplay: Boolean(data.idempotentReplay),
        data,
        error: null,
      };
    } catch (err) {
      if (err instanceof PilatesBookingError) {
        return {
          ok: false,
          idempotentReplay: false,
          data: null,
          error: err.toJSON(),
        };
      }
      throw err;
    }
  }

  /**
   * Cancels an existing booking, processes credit refund/penalty rules,
   * compacts waitlist positions, and automatically promotes the #1 eligible waitlisted booking.
   */
  cancelBookingOrThrow(request) {
    if (!request || typeof request !== 'object') {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT);
    }
    const {
      bookingId,
      memberId = null,
      cancelledAt,
      reason = 'MEMBER_REQUESTED',
      idempotencyKey = null,
    } = request;

    if (!bookingId) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { field: 'bookingId' },
      });
    }

    const idemCheck = this._checkIdempotency('CANCEL_BOOKING', idempotencyKey, {
      bookingId,
      memberId,
      reason,
    });
    if (idemCheck && idemCheck.cachedResult) {
      return {
        ...idemCheck.cachedResult,
        idempotentReplay: true,
      };
    }

    const cancelledAtMs = toEpochMs(cancelledAt, 'cancelledAt');
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new PilatesBookingError(BookingErrorCode.BOOKING_NOT_FOUND, {
        details: { bookingId },
      });
    }

    if (memberId && booking.memberId !== memberId) {
      throw new PilatesBookingError(BookingErrorCode.MEMBERSHIP_OWNER_MISMATCH, {
        message: '예약자 본인의 예약만 취소할 수 있습니다.',
        details: {
          bookingId,
          bookingMemberId: booking.memberId,
          requestedMemberId: memberId,
        },
      });
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new PilatesBookingError(BookingErrorCode.BOOKING_ALREADY_CANCELLED, {
        details: {
          bookingId,
          cancelledAt: booking.cancelledAt,
        },
      });
    }

    const session = this.sessions.get(booking.sessionId);
    if (!session) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_NOT_FOUND, {
        details: { sessionId: booking.sessionId },
      });
    }

    const membership = this.memberships.get(booking.membershipId);

    // 1. Validate cancellation cutoff boundary
    const cancelCutoffMs =
      session.startsAtMs -
      this.policy.cancelCutoffMinutesBeforeStart * MS_PER_MINUTE;
    if (cancelledAtMs >= cancelCutoffMs) {
      throw new PilatesBookingError(
        BookingErrorCode.CANCELLATION_WINDOW_CLOSED,
        {
          details: {
            bookingId,
            sessionId: session.id,
            cancelledAt: toIsoString(cancelledAtMs),
            cancelCutoffAt: toIsoString(cancelCutoffMs),
            sessionStartsAt: session.startsAt,
          },
        }
      );
    }

    const previousStatus = booking.status;
    const freeCancelDeadlineMs =
      session.startsAtMs -
      this.policy.freeCancelMinutesBeforeStart * MS_PER_MINUTE;
    const isWithinFreeCancelWindow = cancelledAtMs <= freeCancelDeadlineMs;

    // 2. Evaluate credit refund vs late-cancel penalty
    let shouldRefundCredit = false;
    let lateCancelPenalty = false;

    if (previousStatus === BookingStatus.WAITLISTED) {
      shouldRefundCredit = Boolean(booking.creditDeducted);
      lateCancelPenalty = false;
    } else if (previousStatus === BookingStatus.CONFIRMED) {
      if (isWithinFreeCancelWindow) {
        shouldRefundCredit = Boolean(booking.creditDeducted);
        lateCancelPenalty = false;
      } else {
        if (this.policy.lateCancelPolicy === LateCancelPolicy.REJECT_LATE_CANCEL) {
          throw new PilatesBookingError(
            BookingErrorCode.LATE_CANCELLATION_DENIED,
            {
              details: {
                bookingId,
                sessionId: session.id,
                cancelledAt: toIsoString(cancelledAtMs),
                freeCancelDeadlineAt: toIsoString(freeCancelDeadlineMs),
              },
            }
          );
        } else if (
          this.policy.lateCancelPolicy === LateCancelPolicy.FORFEIT_CREDIT
        ) {
          shouldRefundCredit = false;
          lateCancelPenalty = true;
        } else if (
          this.policy.lateCancelPolicy === LateCancelPolicy.REFUND_CREDIT
        ) {
          shouldRefundCredit = Boolean(booking.creditDeducted);
          lateCancelPenalty = false;
        }
      }
    }

    let refundLedgerEntry = null;
    if (shouldRefundCredit && membership && !booking.creditRefunded) {
      membership.remainingCredits = Math.min(
        membership.totalCredits,
        membership.remainingCredits + 1
      );
      booking.creditRefunded = true;
      refundLedgerEntry = this._recordLedgerEntry({
        membershipId: membership.id,
        memberId: booking.memberId,
        bookingId: booking.id,
        sessionId: session.id,
        delta: +1,
        balanceAfter: membership.remainingCredits,
        reason: 'BOOKING_CANCEL_REFUND',
        occurredAtMs: cancelledAtMs,
        idempotencyKey,
      });
    }

    booking.status = BookingStatus.CANCELLED;
    booking.waitlistPosition = null;
    booking.lateCancelPenalty = lateCancelPenalty;
    booking.cancelledAt = toIsoString(cancelledAtMs);
    booking.cancelReason = reason;

    // 3. Re-index waitlist & promote #1 eligible waitlisted candidate if a CONFIRMED seat opened
    let promotedBooking = null;
    let promotionLedgerEntry = null;
    const skippedPromotions = [];

    if (previousStatus === BookingStatus.WAITLISTED) {
      this._reindexWaitlist(session.id);
    } else if (previousStatus === BookingStatus.CONFIRMED) {
      const promotionCutoffMs =
        session.startsAtMs -
        this.policy.promotionCutoffMinutesBeforeStart * MS_PER_MINUTE;
      const canPromoteByTime = cancelledAtMs <= promotionCutoffMs;

      if (
        this.policy.autoPromoteFromWaitlist &&
        canPromoteByTime &&
        this._getConfirmedBookings(session.id).length < session.capacity
      ) {
        const candidates = this._getWaitlistedBookings(session.id);
        for (const candidate of candidates) {
          const candMembership = this.memberships.get(candidate.membershipId);
          const candMember = this.members.get(candidate.memberId);

          const skipReason = this._checkPromotionEligibility(
            candidate,
            candMember,
            candMembership,
            session,
            cancelledAtMs
          );

          if (skipReason) {
            skippedPromotions.push({
              bookingId: candidate.id,
              memberId: candidate.memberId,
              membershipId: candidate.membershipId,
              previousWaitlistPosition: candidate.waitlistPosition,
              reason: skipReason,
            });
            continue;
          }

          if (!candidate.creditDeducted && candMembership) {
            candMembership.remainingCredits -= 1;
            candidate.creditDeducted = true;
            promotionLedgerEntry = this._recordLedgerEntry({
              membershipId: candMembership.id,
              memberId: candidate.memberId,
              bookingId: candidate.id,
              sessionId: session.id,
              delta: -1,
              balanceAfter: candMembership.remainingCredits,
              reason: 'WAITLIST_PROMOTED',
              occurredAtMs: cancelledAtMs,
              idempotencyKey,
            });
          }

          candidate.status = BookingStatus.CONFIRMED;
          candidate.waitlistPosition = null;
          candidate.confirmedAt = toIsoString(cancelledAtMs);
          candidate.promotedAt = toIsoString(cancelledAtMs);
          promotedBooking = cloneDeep(candidate);
          break;
        }
      }

      this._reindexWaitlist(session.id);
    }

    const response = {
      cancelledBooking: cloneDeep(booking),
      membership: membership
        ? {
            id: membership.id,
            remainingCredits: membership.remainingCredits,
            totalCredits: membership.totalCredits,
          }
        : null,
      refundLedgerEntry: refundLedgerEntry
        ? cloneDeep(refundLedgerEntry)
        : null,
      promotedBooking,
      promotionLedgerEntry: promotionLedgerEntry
        ? cloneDeep(promotionLedgerEntry)
        : null,
      skippedPromotions,
      sessionSummary: this.getSessionRoster(session.id),
      idempotentReplay: false,
    };

    if (idemCheck) {
      this._saveIdempotency(
        idempotencyKey,
        'CANCEL_BOOKING',
        idemCheck.fingerprint,
        response
      );
    }

    return response;
  }

  cancelBooking(request) {
    try {
      const data = this.cancelBookingOrThrow(request);
      return {
        ok: true,
        idempotentReplay: Boolean(data.idempotentReplay),
        data,
        error: null,
      };
    } catch (err) {
      if (err instanceof PilatesBookingError) {
        return {
          ok: false,
          idempotentReplay: false,
          data: null,
          error: err.toJSON(),
        };
      }
      throw err;
    }
  }

  _checkPromotionEligibility(
    candidateBooking,
    candMember,
    candMembership,
    session,
    promotedAtMs
  ) {
    if (!candMember || !candMember.active) {
      return BookingErrorCode.MEMBER_NOT_FOUND;
    }
    if (!candMembership) {
      return BookingErrorCode.MEMBERSHIP_NOT_FOUND;
    }
    if (candMembership.status !== MembershipStatus.ACTIVE) {
      return BookingErrorCode.MEMBERSHIP_INACTIVE;
    }
    if (promotedAtMs > candMembership.expiresAtMs) {
      return BookingErrorCode.MEMBERSHIP_EXPIRED;
    }
    if (
      this.policy.checkMembershipValidAtSessionStart &&
      session.startsAtMs > candMembership.expiresAtMs
    ) {
      return BookingErrorCode.MEMBERSHIP_EXPIRED_AT_SESSION_TIME;
    }
    if (!candidateBooking.creditDeducted && candMembership.remainingCredits < 1) {
      return BookingErrorCode.INSUFFICIENT_CREDITS;
    }
    return null;
  }

  /**
   * Cancels an entire class session by studio/instructor decision and refunds all deducted credits
   * regardless of the late-cancel window.
   */
  cancelSessionByStudioOrThrow({
    sessionId,
    cancelledAt,
    reason = 'STUDIO_CANCELLED',
    idempotencyKey = null,
  }) {
    if (!sessionId) {
      throw new PilatesBookingError(BookingErrorCode.INVALID_INPUT, {
        details: { field: 'sessionId' },
      });
    }

    const idemCheck = this._checkIdempotency('CANCEL_SESSION_BY_STUDIO', idempotencyKey, {
      sessionId,
      reason,
    });
    if (idemCheck && idemCheck.cachedResult) {
      return {
        ...idemCheck.cachedResult,
        idempotentReplay: true,
      };
    }

    const cancelledAtMs = toEpochMs(cancelledAt, 'cancelledAt');
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_NOT_FOUND, {
        details: { sessionId },
      });
    }
    if (session.status === SessionStatus.CANCELLED) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_CANCELLED, {
        details: { sessionId },
      });
    }

    session.status = SessionStatus.CANCELLED;
    session.reason = reason;
    const affectedBookings = [];
    const refundLedgerEntries = [];

    for (const booking of this._getSessionBookings(sessionId)) {
      if (booking.status === BookingStatus.CANCELLED) continue;

      if (booking.creditDeducted && !booking.creditRefunded) {
        const ms = this.memberships.get(booking.membershipId);
        if (ms) {
          ms.remainingCredits = Math.min(
            ms.totalCredits,
            ms.remainingCredits + 1
          );
          booking.creditRefunded = true;
          const entry = this._recordLedgerEntry({
            membershipId: ms.id,
            memberId: booking.memberId,
            bookingId: booking.id,
            sessionId: session.id,
            delta: +1,
            balanceAfter: ms.remainingCredits,
            reason: 'STUDIO_CANCEL_REFUND',
            occurredAtMs: cancelledAtMs,
            idempotencyKey,
          });
          refundLedgerEntries.push(cloneDeep(entry));
        }
      }

      booking.status = BookingStatus.CANCELLED;
      booking.waitlistPosition = null;
      booking.lateCancelPenalty = false;
      booking.cancelledAt = toIsoString(cancelledAtMs);
      booking.cancelReason = reason;
      affectedBookings.push(cloneDeep(booking));
    }

    const response = {
      session: cloneDeep(session),
      affectedBookings,
      refundLedgerEntries,
      idempotentReplay: false,
    };

    if (idemCheck) {
      this._saveIdempotency(
        idempotencyKey,
        'CANCEL_SESSION_BY_STUDIO',
        idemCheck.fingerprint,
        response
      );
    }

    return response;
  }

  cancelSessionByStudio(request) {
    try {
      const data = this.cancelSessionByStudioOrThrow(request);
      return {
        ok: true,
        idempotentReplay: Boolean(data.idempotentReplay),
        data,
        error: null,
      };
    } catch (err) {
      if (err instanceof PilatesBookingError) {
        return {
          ok: false,
          idempotentReplay: false,
          data: null,
          error: err.toJSON(),
        };
      }
      throw err;
    }
  }

  getSessionRoster(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new PilatesBookingError(BookingErrorCode.SESSION_NOT_FOUND, {
        details: { sessionId },
      });
    }
    const confirmed = this._getConfirmedBookings(sessionId).map((b) =>
      cloneDeep(b)
    );
    const waitlisted = this._getWaitlistedBookings(sessionId).map((b) =>
      cloneDeep(b)
    );
    return {
      sessionId: session.id,
      status: session.status,
      capacity: session.capacity,
      confirmedCount: confirmed.length,
      remainingSeats: Math.max(0, session.capacity - confirmed.length),
      waitlistCapacity: session.waitlistCapacity,
      waitlistCount: waitlisted.length,
      remainingWaitlistSlots: Math.max(
        0,
        session.waitlistCapacity - waitlisted.length
      ),
      confirmed,
      waitlisted,
    };
  }

  getMembershipSummary(membershipId, asOf = null) {
    const ms = this.memberships.get(membershipId);
    if (!ms) {
      throw new PilatesBookingError(BookingErrorCode.MEMBERSHIP_NOT_FOUND, {
        details: { membershipId },
      });
    }
    const asOfMs = asOf !== null ? toEpochMs(asOf, 'asOf') : null;
    let effectiveStatus = ms.status;
    if (
      asOfMs !== null &&
      effectiveStatus === MembershipStatus.ACTIVE &&
      asOfMs > ms.expiresAtMs
    ) {
      effectiveStatus = MembershipStatus.EXPIRED;
    }
    return {
      ...cloneDeep(ms),
      effectiveStatus,
      isExhausted: ms.remainingCredits === 0,
      ledger: this.getCreditLedger(membershipId),
    };
  }

  getCreditLedger(membershipId = null) {
    return this.creditLedger
      .filter((entry) => !membershipId || entry.membershipId === membershipId)
      .map((entry) => cloneDeep(entry));
  }

  getBooking(bookingId) {
    const b = this.bookings.get(bookingId);
    return b ? cloneDeep(b) : null;
  }
}
