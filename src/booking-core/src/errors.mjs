/**
 * Structured domain error definitions for Pilates-flow booking core.
 * Zero external dependencies.
 */

export const ErrorCategory = Object.freeze({
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  CAPACITY: 'CAPACITY',
  DUPLICATE: 'DUPLICATE',
  WAITLIST: 'WAITLIST',
  MEMBERSHIP: 'MEMBERSHIP',
  TIME_BOUNDARY: 'TIME_BOUNDARY',
  IDEMPOTENCY: 'IDEMPOTENCY',
  STATE_CONFLICT: 'STATE_CONFLICT',
});

export const BookingErrorCode = Object.freeze({
  // Validation / Input (Aligned with pilates-flow/src/schemas/instructorScheduleSchema.ts)
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
  INVALID_SCHEDULE_DATE: 'INVALID_SCHEDULE_DATE',
  INVALID_SCHEDULE_TIME: 'INVALID_SCHEDULE_TIME',
  INVALID_TIME_ORDER: 'INVALID_TIME_ORDER',
  INVALID_CAPACITY: 'INVALID_CAPACITY',

  // Entity Lookup
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  MEMBERSHIP_NOT_FOUND: 'MEMBERSHIP_NOT_FOUND',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',

  // Session State & Capacity (Aligned with InstructorScheduleOccurrence.status: scheduled | cancelled | closed | moved)
  SESSION_CANCELLED: 'SESSION_CANCELLED',
  SESSION_CLOSED: 'SESSION_CLOSED',
  SESSION_MOVED: 'SESSION_MOVED',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  WAITLIST_DISABLED: 'WAITLIST_DISABLED',
  WAITLIST_FULL: 'WAITLIST_FULL',

  // Duplicate & Overlap
  DUPLICATE_SESSION_BOOKING: 'DUPLICATE_SESSION_BOOKING',
  OVERLAPPING_SESSION_BOOKING: 'OVERLAPPING_SESSION_BOOKING',
  REBOOK_AFTER_CANCEL_FORBIDDEN: 'REBOOK_AFTER_CANCEL_FORBIDDEN',

  // Membership & Credits
  MEMBERSHIP_OWNER_MISMATCH: 'MEMBERSHIP_OWNER_MISMATCH',
  MEMBERSHIP_INACTIVE: 'MEMBERSHIP_INACTIVE',
  MEMBERSHIP_NOT_YET_VALID: 'MEMBERSHIP_NOT_YET_VALID',
  MEMBERSHIP_EXPIRED: 'MEMBERSHIP_EXPIRED',
  MEMBERSHIP_EXPIRED_AT_SESSION_TIME: 'MEMBERSHIP_EXPIRED_AT_SESSION_TIME',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  APPARATUS_NOT_ALLOWED: 'APPARATUS_NOT_ALLOWED',
  DAILY_BOOKING_LIMIT_EXCEEDED: 'DAILY_BOOKING_LIMIT_EXCEEDED',
  WEEKLY_BOOKING_LIMIT_EXCEEDED: 'WEEKLY_BOOKING_LIMIT_EXCEEDED',

  // Time & Period Boundaries
  BOOKING_WINDOW_NOT_OPEN: 'BOOKING_WINDOW_NOT_OPEN',
  BOOKING_WINDOW_CLOSED: 'BOOKING_WINDOW_CLOSED',
  CANCELLATION_WINDOW_CLOSED: 'CANCELLATION_WINDOW_CLOSED',
  LATE_CANCELLATION_DENIED: 'LATE_CANCELLATION_DENIED',
  SESSION_ALREADY_STARTED: 'SESSION_ALREADY_STARTED',

  // State & Idempotency
  BOOKING_ALREADY_CANCELLED: 'BOOKING_ALREADY_CANCELLED',
  IDEMPOTENCY_KEY_CONFLICT: 'IDEMPOTENCY_KEY_CONFLICT',
  IDEMPOTENCY_KEY_REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
});

const ERROR_METADATA = Object.freeze({
  [BookingErrorCode.INVALID_INPUT]: {
    category: ErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    defaultMessage: '요청 입력값이 유효하지 않습니다.',
  },
  [BookingErrorCode.INVALID_TIMESTAMP]: {
    category: ErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    defaultMessage: '유효하지 않은 날짜/시간 형식입니다.',
  },
  [BookingErrorCode.INVALID_SCHEDULE_DATE]: {
    category: ErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    defaultMessage: '올바른 날짜를 선택해 주세요.',
  },
  [BookingErrorCode.INVALID_SCHEDULE_TIME]: {
    category: ErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    defaultMessage: '올바른 시각을 선택해 주세요.',
  },
  [BookingErrorCode.INVALID_TIME_ORDER]: {
    category: ErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    defaultMessage: '종료 시각은 시작보다 늦어야 합니다. 자정을 넘는 수업은 나누어 입력해 주세요.',
  },
  [BookingErrorCode.INVALID_CAPACITY]: {
    category: ErrorCategory.VALIDATION,
    httpStatus: 400,
    retryable: false,
    defaultMessage: '수업 정원 또는 대기 정원 설정이 유효하지 않습니다.',
  },
  [BookingErrorCode.MEMBER_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    httpStatus: 404,
    retryable: false,
    defaultMessage: '회원 정보를 찾을 수 없습니다.',
  },
  [BookingErrorCode.SESSION_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    httpStatus: 404,
    retryable: false,
    defaultMessage: '수업 세션 정보를 찾을 수 없습니다.',
  },
  [BookingErrorCode.MEMBERSHIP_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    httpStatus: 404,
    retryable: false,
    defaultMessage: '회원권 정보를 찾을 수 없습니다.',
  },
  [BookingErrorCode.BOOKING_NOT_FOUND]: {
    category: ErrorCategory.NOT_FOUND,
    httpStatus: 404,
    retryable: false,
    defaultMessage: '예약 내역을 찾을 수 없습니다.',
  },
  [BookingErrorCode.SESSION_CANCELLED]: {
    category: ErrorCategory.STATE_CONFLICT,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '폐강되었거나 취소된 수업 세션입니다.',
  },
  [BookingErrorCode.SESSION_CLOSED]: {
    category: ErrorCategory.STATE_CONFLICT,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '센터 휴무(closed)로 지정된 수업 회차입니다.',
  },
  [BookingErrorCode.SESSION_MOVED]: {
    category: ErrorCategory.STATE_CONFLICT,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '다른 일시로 일정 변경(moved)된 원본 회차입니다. 변경된 회차로 예약해 주세요.',
  },
  [BookingErrorCode.CAPACITY_EXCEEDED]: {
    category: ErrorCategory.CAPACITY,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '수업 정원이 마감되었습니다.',
  },
  [BookingErrorCode.WAITLIST_DISABLED]: {
    category: ErrorCategory.WAITLIST,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '정원이 마감되었으며 대기 예약이 비활성화되어 있습니다.',
  },
  [BookingErrorCode.WAITLIST_FULL]: {
    category: ErrorCategory.WAITLIST,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '수업 정원 및 대기 정원이 모두 마감되었습니다.',
  },
  [BookingErrorCode.DUPLICATE_SESSION_BOOKING]: {
    category: ErrorCategory.DUPLICATE,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '동일한 수업에 이미 활성 예약 또는 대기 내역이 존재합니다.',
  },
  [BookingErrorCode.OVERLAPPING_SESSION_BOOKING]: {
    category: ErrorCategory.DUPLICATE,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '동일 시간대에 겹치는 다른 수업 예약이 이미 존재합니다.',
  },
  [BookingErrorCode.REBOOK_AFTER_CANCEL_FORBIDDEN]: {
    category: ErrorCategory.DUPLICATE,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '정책상 취소한 동일 수업은 재예약할 수 없습니다.',
  },
  [BookingErrorCode.MEMBERSHIP_OWNER_MISMATCH]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 403,
    retryable: false,
    defaultMessage: '회원권 소유자와 예약 요청 회원이 일치하지 않습니다.',
  },
  [BookingErrorCode.MEMBERSHIP_INACTIVE]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 403,
    retryable: false,
    defaultMessage: '일시정지(홀딩) 또는 비활성 상태인 회원권입니다.',
  },
  [BookingErrorCode.MEMBERSHIP_NOT_YET_VALID]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '회원권 유효 시작일 이전의 수업은 예약할 수 없습니다.',
  },
  [BookingErrorCode.MEMBERSHIP_EXPIRED]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '요청 시점에 이미 만료된 회원권입니다.',
  },
  [BookingErrorCode.MEMBERSHIP_EXPIRED_AT_SESSION_TIME]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '수업 시작 시점이 회원권 만료일 이후여서 예약할 수 없습니다.',
  },
  [BookingErrorCode.INSUFFICIENT_CREDITS]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '회원권의 잔여 횟수가 부족합니다.',
  },
  [BookingErrorCode.APPARATUS_NOT_ALLOWED]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 403,
    retryable: false,
    defaultMessage: '해당 회원권으로 이용할 수 없는 기구/수업 유형입니다.',
  },
  [BookingErrorCode.DAILY_BOOKING_LIMIT_EXCEEDED]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '1일 최대 예약 가능 횟수를 초과했습니다.',
  },
  [BookingErrorCode.WEEKLY_BOOKING_LIMIT_EXCEEDED]: {
    category: ErrorCategory.MEMBERSHIP,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '주간 최대 예약 가능 횟수를 초과했습니다.',
  },
  [BookingErrorCode.BOOKING_WINDOW_NOT_OPEN]: {
    category: ErrorCategory.TIME_BOUNDARY,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '아직 예약 오픈 시간이 되지 않았습니다.',
  },
  [BookingErrorCode.BOOKING_WINDOW_CLOSED]: {
    category: ErrorCategory.TIME_BOUNDARY,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '수업 예약 마감 시간이 지났습니다.',
  },
  [BookingErrorCode.CANCELLATION_WINDOW_CLOSED]: {
    category: ErrorCategory.TIME_BOUNDARY,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '취소 가능 마감 시간이 지나 예약을 취소할 수 없습니다.',
  },
  [BookingErrorCode.LATE_CANCELLATION_DENIED]: {
    category: ErrorCategory.TIME_BOUNDARY,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '무료 취소 마감 시간이 지나 정책상 취소가 불가합니다.',
  },
  [BookingErrorCode.SESSION_ALREADY_STARTED]: {
    category: ErrorCategory.TIME_CONFLICT || ErrorCategory.TIME_BOUNDARY,
    httpStatus: 422,
    retryable: false,
    defaultMessage: '이미 시작되었거나 종료된 수업입니다.',
  },
  [BookingErrorCode.BOOKING_ALREADY_CANCELLED]: {
    category: ErrorCategory.STATE_CONFLICT,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '이미 취소 처리된 예약입니다.',
  },
  [BookingErrorCode.IDEMPOTENCY_KEY_CONFLICT]: {
    category: ErrorCategory.IDEMPOTENCY,
    httpStatus: 409,
    retryable: false,
    defaultMessage: '동일한 멱등성 키(idempotencyKey)가 서로 다른 요청 본문으로 재사용되었습니다.',
  },
  [BookingErrorCode.IDEMPOTENCY_KEY_REQUIRED]: {
    category: ErrorCategory.IDEMPOTENCY,
    httpStatus: 400,
    retryable: false,
    defaultMessage: '정책상 멱등성 키(idempotencyKey) 입력이 필수입니다.',
  },
});

export class PilatesBookingError extends Error {
  /**
   * @param {string} code - One of BookingErrorCode
   * @param {object} [options]
   * @param {string} [options.message]
   * @param {object} [options.details]
   */
  constructor(code, options = {}) {
    const meta = ERROR_METADATA[code] || {
      category: ErrorCategory.VALIDATION,
      httpStatus: 400,
      retryable: false,
      defaultMessage: '알 수 없는 예약 도메인 오류가 발생했습니다.',
    };
    const message = options.message || meta.defaultMessage;
    super(message);
    this.name = 'PilatesBookingError';
    this.code = code;
    this.category = meta.category;
    this.httpStatus = meta.httpStatus;
    this.retryable = meta.retryable;
    this.details = Object.freeze({ ...(options.details || {}) });
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      message: this.message,
      details: this.details,
    };
  }
}
