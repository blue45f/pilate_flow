/**
 * Comprehensive automated test suite for Pilates-flow booking core domain engine.
 * Uses Node.js built-in test runner (node:test) and strict assertions (node:assert/strict).
 * Zero external dependencies, zero external DB, virtual fixtures only.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BookingErrorCode,
  BookingStatus,
  createVirtualStudioFixtures,
  ErrorCategory,
  isScheduleDate,
  isScheduleTime,
  LateCancelPolicy,
  MembershipStatus,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  PilatesBookingEngine,
  PilatesBookingError,
  SessionStatus,
  toEpochMs,
  toIsoString,
  WaitlistCreditPolicy,
} from '../src/index.mjs';

function createEngineWithFixtures(policyOverrides = {}) {
  const fixtures = createVirtualStudioFixtures();
  return new PilatesBookingEngine({
    policy: policyOverrides,
    members: fixtures.members,
    memberships: fixtures.memberships,
    sessions: fixtures.sessions,
  });
}

describe('Pilates-flow Booking Core Domain Suite (45 Boundary, Failure & App-Rule Alignment Tests)', () => {
  // =========================================================================
  // 1. 예약 정원(Capacity) 및 대기열 진입/거부 (T01 ~ T06)
  // =========================================================================
  describe('1. 예약 정원(Capacity) 및 대기열 전환', () => {
    it('T01: 정원 여유 시 예약 즉시 CONFIRMED 확정 및 회원권 1회 차감·원장 기록', () => {
      const engine = createEngineWithFixtures();
      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, true);
      assert.equal(res.data.booking.status, BookingStatus.CONFIRMED);
      assert.equal(res.data.booking.waitlistPosition, null);
      assert.equal(res.data.membership.remainingCredits, 9);
      assert.equal(res.data.sessionSummary.confirmedCount, 1);
      assert.equal(res.data.sessionSummary.remainingSeats, 1);
      assert.equal(res.data.ledgerEntry.delta, -1);
      assert.equal(res.data.ledgerEntry.reason, 'BOOKING_CONFIRMED');
    });

    it('T02: 정원 마지막 좌석(2/2) 경계에서 CONFIRMED 확정 및 remainingSeats 0 전환', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const res2 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });

      assert.equal(res2.booking.status, BookingStatus.CONFIRMED);
      assert.equal(res2.sessionSummary.confirmedCount, 2);
      assert.equal(res2.sessionSummary.remainingSeats, 0);
      assert.equal(res2.sessionSummary.waitlistCount, 0);
    });

    it('T03: 정원 마감 직후 요청 시 WAITLISTED 1순번 자동 배정 및 HOLD_ON_WAITLIST 차감', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });

      const res3 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });

      assert.equal(res3.booking.status, BookingStatus.WAITLISTED);
      assert.equal(res3.booking.waitlistPosition, 1);
      assert.equal(res3.booking.creditDeducted, true);
      assert.equal(res3.membership.remainingCredits, 4);
      assert.equal(res3.ledgerEntry.reason, 'WAITLIST_HOLD');
    });

    it('T04: 대기 정원(waitlistCapacity=2)까지 모두 찬 상태에서 추가 예약 시 WAITLIST_FULL 거부', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_04',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_04_single_credit',
        requestedAt: '2026-11-10T09:03:00.000Z',
      });

      const res5 = engine.bookSession({
        memberId: 'mem_virtual_05',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_05_active',
        requestedAt: '2026-11-10T09:04:00.000Z',
      });

      assert.equal(res5.ok, false);
      assert.equal(res5.error.code, BookingErrorCode.WAITLIST_FULL);
      assert.equal(res5.error.category, ErrorCategory.WAITLIST);
      assert.equal(engine.getMembershipSummary('pass_05_active').remainingCredits, 4);
    });

    it('T05: 정원 마감 상태에서 요청자가 allowWaitlist: false 지정 시 CAPACITY_EXCEEDED 거부', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });

      const res = engine.bookSession({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
        allowWaitlist: false,
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.CAPACITY_EXCEEDED);
      assert.equal(engine.getMembershipSummary('pass_03_active').remainingCredits, 5);
    });

    it('T06: 대기 비활성화 수업(sess_no_waitlist) 정원 초과 시 WAITLIST_DISABLED 거부', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_no_waitlist',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const res = engine.bookSession({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_no_waitlist',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:05:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.WAITLIST_DISABLED);
    });
  });

  // =========================================================================
  // 2. 중복 예약 및 시간 겹침 경계 (T07 ~ T12)
  // =========================================================================
  describe('2. 중복 예약(Duplicate) 및 시간대 겹침(Overlap) 경계', () => {
    it('T07: 동일 회원이 이미 CONFIRMED인 동일 세션을 중복 예약 시 DUPLICATE_SESSION_BOOKING 거부', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const dup = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:05:00.000Z',
      });

      assert.equal(dup.ok, false);
      assert.equal(dup.error.code, BookingErrorCode.DUPLICATE_SESSION_BOOKING);
      assert.equal(engine.getMembershipSummary('pass_01_active').remainingCredits, 9);
    });

    it('T08: 동일 회원이 이미 WAITLISTED인 동일 세션을 중복 예약 시 DUPLICATE_SESSION_BOOKING 거부', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });

      const dupWait = engine.bookSession({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:03:00.000Z',
      });

      assert.equal(dupWait.ok, false);
      assert.equal(dupWait.error.code, BookingErrorCode.DUPLICATE_SESSION_BOOKING);
    });

    it('T09: 동시간대 일부 겹치는 다른 수업([10:00,10:50) vs [10:30,11:20)) 예약 시 OVERLAPPING_SESSION_BOOKING 거부', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const overlap = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_overlap',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:05:00.000Z',
      });

      assert.equal(overlap.ok, false);
      assert.equal(overlap.error.code, BookingErrorCode.OVERLAPPING_SESSION_BOOKING);
      assert.equal(overlap.error.details.conflictingSessionId, 'sess_reformer_small');
    });

    it('T10: 앞 수업 종료 시각과 뒤 수업 시작 시각이 정확히 일치(10:50 === 10:50)하는 연속 수업은 정상 허용', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const adjacent = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_adjacent',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:05:00.000Z',
      });

      assert.equal(adjacent.ok, true);
      assert.equal(adjacent.data.booking.status, BookingStatus.CONFIRMED);
      assert.equal(adjacent.data.membership.remainingCredits, 8);
    });

    it('T11: 취소 완료(CANCELLED)된 동일 수업은 기본 정책(allowRebookAfterCancel: true)에서 재예약 허용', () => {
      const engine = createEngineWithFixtures();
      const first = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      engine.cancelBookingOrThrow({
        bookingId: first.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T12:00:00.000Z',
      });

      const rebook = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T13:00:00.000Z',
      });

      assert.equal(rebook.ok, true);
      assert.equal(rebook.data.booking.status, BookingStatus.CONFIRMED);
      assert.equal(rebook.data.membership.remainingCredits, 9);
    });

    it('T12: 정책상 취소 후 재예약 금지(allowRebookAfterCancel: false) 설정 시 REBOOK_AFTER_CANCEL_FORBIDDEN 거부', () => {
      const engine = createEngineWithFixtures({ allowRebookAfterCancel: false });
      const first = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      engine.cancelBookingOrThrow({
        bookingId: first.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T12:00:00.000Z',
      });

      const rebook = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T13:00:00.000Z',
      });

      assert.equal(rebook.ok, false);
      assert.equal(rebook.error.code, BookingErrorCode.REBOOK_AFTER_CANCEL_FORBIDDEN);
    });
  });

  // =========================================================================
  // 3. 대기순번 관리 및 취소 후 자동 승급 (T13 ~ T18)
  // =========================================================================
  describe('3. 대기순번(Waitlist Position) 재정렬 및 취소 후 자동 승급(Promotion)', () => {
    it('T13: 대기자(1, 2, 3번) 중 중간 대기자(2번) 취소 시 3번이 2번으로 당겨지고 보류 횟수 즉시 복구', () => {
      const engine = createEngineWithFixtures({ defaultWaitlistCapacity: 5 });
      engine.registerSession({
        id: 'sess_wait_3',
        startsAt: '2026-11-12T10:00:00.000Z',
        endsAt: '2026-11-12T10:50:00.000Z',
        capacity: 1,
        waitlistCapacity: 3,
      });

      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_wait_3',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      const w1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_wait_3',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });
      const w2 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_wait_3',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });
      const w3 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_05',
        sessionId: 'sess_wait_3',
        membershipId: 'pass_05_active',
        requestedAt: '2026-11-10T09:03:00.000Z',
      });

      assert.equal(w1.booking.waitlistPosition, 1);
      assert.equal(w2.booking.waitlistPosition, 2);
      assert.equal(w3.booking.waitlistPosition, 3);

      const cancelW2 = engine.cancelBookingOrThrow({
        bookingId: w2.booking.id,
        memberId: 'mem_virtual_03',
        cancelledAt: '2026-11-10T10:00:00.000Z',
      });

      assert.equal(cancelW2.cancelledBooking.creditRefunded, true);
      assert.equal(cancelW2.membership.remainingCredits, 5);
      const roster = cancelW2.sessionSummary;
      assert.equal(roster.waitlistCount, 2);
      assert.equal(roster.waitlisted[0].id, w1.booking.id);
      assert.equal(roster.waitlisted[0].waitlistPosition, 1);
      assert.equal(roster.waitlisted[1].id, w3.booking.id);
      assert.equal(roster.waitlisted[1].waitlistPosition, 2);
    });

    it('T14: 확정자 취소 시 대기 1순위가 자동으로 CONFIRMED 승급되고 대기 2순위가 1순위로 재정렬', () => {
      const engine = createEngineWithFixtures();
      const c1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });
      const w1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });
      const w2 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_05',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_05_active',
        requestedAt: '2026-11-10T09:03:00.000Z',
      });

      const cancelRes = engine.cancelBookingOrThrow({
        bookingId: c1.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T11:00:00.000Z',
      });

      assert.ok(cancelRes.promotedBooking);
      assert.equal(cancelRes.promotedBooking.id, w1.booking.id);
      assert.equal(cancelRes.promotedBooking.status, BookingStatus.CONFIRMED);
      assert.equal(cancelRes.promotedBooking.waitlistPosition, null);
      assert.equal(cancelRes.promotedBooking.promotedAt, '2026-11-10T11:00:00.000Z');
      assert.equal(cancelRes.sessionSummary.confirmedCount, 2);
      assert.equal(cancelRes.sessionSummary.waitlistCount, 1);
      assert.equal(cancelRes.sessionSummary.waitlisted[0].id, w2.booking.id);
      assert.equal(cancelRes.sessionSummary.waitlisted[0].waitlistPosition, 1);
    });

    it('T15: CHARGE_ON_PROMOTION 정책에서 대기 진입 시 0회 차감, 승급 시점에 정확히 1회 차감', () => {
      const engine = createEngineWithFixtures({
        waitlistCreditPolicy: WaitlistCreditPolicy.CHARGE_ON_PROMOTION,
      });

      const c1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });

      const w1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });

      assert.equal(w1.booking.status, BookingStatus.WAITLISTED);
      assert.equal(w1.booking.creditDeducted, false);
      assert.equal(w1.membership.remainingCredits, 5);

      const cancelRes = engine.cancelBookingOrThrow({
        bookingId: c1.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T11:00:00.000Z',
      });

      assert.equal(cancelRes.promotedBooking.id, w1.booking.id);
      assert.equal(cancelRes.promotedBooking.creditDeducted, true);
      assert.equal(cancelRes.promotionLedgerEntry.delta, -1);
      assert.equal(cancelRes.promotionLedgerEntry.reason, 'WAITLIST_PROMOTED');
      assert.equal(engine.getMembershipSummary('pass_03_active').remainingCredits, 4);
    });

    it('T16: CHARGE_ON_PROMOTION 정책에서 대기 1순위가 승급 시점에 잔여 횟수 0회면 건너뛰고 대기 2순위를 승급', () => {
      const engine = createEngineWithFixtures({
        waitlistCreditPolicy: WaitlistCreditPolicy.CHARGE_ON_PROMOTION,
      });

      const c1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });

      const w1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_04',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_04_single_credit',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });
      const w2 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_05',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_05_active',
        requestedAt: '2026-11-10T09:03:00.000Z',
      });

      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_04',
        sessionId: 'sess_reformer_adjacent',
        membershipId: 'pass_04_single_credit',
        requestedAt: '2026-11-10T09:10:00.000Z',
      });
      assert.equal(engine.getMembershipSummary('pass_04_single_credit').remainingCredits, 0);

      const cancelRes = engine.cancelBookingOrThrow({
        bookingId: c1.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T11:00:00.000Z',
      });

      assert.equal(cancelRes.skippedPromotions.length, 1);
      assert.equal(cancelRes.skippedPromotions[0].bookingId, w1.booking.id);
      assert.equal(cancelRes.skippedPromotions[0].reason, BookingErrorCode.INSUFFICIENT_CREDITS);
      assert.equal(cancelRes.promotedBooking.id, w2.booking.id);
      assert.equal(cancelRes.promotedBooking.memberId, 'mem_virtual_05');
    });

    it('T17: 대기 1순위의 회원권이 승급 시점에 PAUSED(일시정지) 상태이면 건너뛰고 대기 2순위 승급', () => {
      const engine = createEngineWithFixtures();
      const c1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });
      const w1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });
      const w2 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_05',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_05_active',
        requestedAt: '2026-11-10T09:03:00.000Z',
      });

      engine.memberships.get('pass_03_active').status = MembershipStatus.PAUSED;

      const cancelRes = engine.cancelBookingOrThrow({
        bookingId: c1.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T11:00:00.000Z',
      });

      assert.equal(cancelRes.skippedPromotions.length, 1);
      assert.equal(cancelRes.skippedPromotions[0].bookingId, w1.booking.id);
      assert.equal(cancelRes.skippedPromotions[0].reason, BookingErrorCode.MEMBERSHIP_INACTIVE);
      assert.equal(cancelRes.promotedBooking.id, w2.booking.id);
    });

    it('T18: 자동 승급 마감 시각(수업 시작 60분 전) 이후에 확정자가 취소하면 대기열 자동 승급 미실행', () => {
      const engine = createEngineWithFixtures({
        promotionCutoffMinutesBeforeStart: 60,
      });
      const c1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });
      const w1 = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });

      const cancelRes = engine.cancelBookingOrThrow({
        bookingId: c1.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-12T09:30:00.000Z',
      });

      assert.equal(cancelRes.promotedBooking, null);
      assert.equal(cancelRes.sessionSummary.confirmedCount, 1);
      assert.equal(cancelRes.sessionSummary.waitlistCount, 1);
      assert.equal(cancelRes.sessionSummary.waitlisted[0].id, w1.booking.id);
    });
  });

  // =========================================================================
  // 4. 회원권 남은 횟수, 자격, 만료 및 복구 경계 (T19 ~ T26)
  // =========================================================================
  describe('4. 회원권 잔여 횟수(Credits), 만료(Expiration) 및 이용 제한 경계', () => {
    it('T19: 잔여 횟수 0회(pass_01_zero_credit) 회원권으로 예약 시 INSUFFICIENT_CREDITS 거부', () => {
      const engine = createEngineWithFixtures();
      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_zero_credit',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.INSUFFICIENT_CREDITS);
    });

    it('T20: 일시정지(pass_01_paused) 상태인 회원권으로 예약 시 MEMBERSHIP_INACTIVE 거부', () => {
      const engine = createEngineWithFixtures();
      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_paused',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.MEMBERSHIP_INACTIVE);
    });

    it('T21: 타인 명의의 회원권(memberId 불일치)으로 예약 시 MEMBERSHIP_OWNER_MISMATCH 거부', () => {
      const engine = createEngineWithFixtures();
      const res = engine.bookSession({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.MEMBERSHIP_OWNER_MISMATCH);
    });

    it('T22: 기구 제한 회원권(reformer 전용)으로 cadillac 수업 예약 시 APPARATUS_NOT_ALLOWED 거부', () => {
      const engine = createEngineWithFixtures();
      const res = engine.bookSession({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_overlap',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.APPARATUS_NOT_ALLOWED);
    });

    it('T23: 회원권 validFrom 경계 — 수업 시작이 validFrom 1ms 전이면 거부, 정확히 validFrom이면 허용', () => {
      const engine = createEngineWithFixtures({ bookingOpenHoursBeforeStart: null });
      const validFromMs = toEpochMs('2026-11-15T00:00:00.000Z');

      engine.registerSession({
        id: 'sess_before_valid_from',
        startsAt: toIsoString(validFromMs - 1),
        endsAt: toIsoString(validFromMs + 50 * MS_PER_MINUTE),
        capacity: 2,
      });
      engine.registerSession({
        id: 'sess_exact_valid_from',
        startsAt: toIsoString(validFromMs),
        endsAt: toIsoString(validFromMs + 50 * MS_PER_MINUTE),
        capacity: 2,
      });

      const resBefore = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_before_valid_from',
        membershipId: 'pass_01_future',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(resBefore.ok, false);
      assert.equal(resBefore.error.code, BookingErrorCode.MEMBERSHIP_NOT_YET_VALID);

      const resExact = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_exact_valid_from',
        membershipId: 'pass_01_future',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(resExact.ok, true);
    });

    it('T24: 회원권 expiresAt 요청 시점 경계 — expiresAt 정각(0ms) 요청은 허용, 1ms 후 요청은 MEMBERSHIP_EXPIRED 거부', () => {
      const engine = createEngineWithFixtures({
        checkMembershipValidAtSessionStart: false,
        bookingCloseMinutesBeforeStart: 0,
      });
      const expiresAtMs = toEpochMs('2026-11-10T12:00:00.000Z');

      const resAfter = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_expired',
        requestedAt: toIsoString(expiresAtMs + 1),
      });
      assert.equal(resAfter.ok, false);
      assert.equal(resAfter.error.code, BookingErrorCode.MEMBERSHIP_EXPIRED);

      const resExact = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_expired',
        requestedAt: toIsoString(expiresAtMs),
      });
      assert.equal(resExact.ok, true);
    });

    it('T25: 요청 시점엔 유효하나 수업 시작 시각이 회원권 expiresAt보다 1ms 늦으면 MEMBERSHIP_EXPIRED_AT_SESSION_TIME 거부', () => {
      const engine = createEngineWithFixtures({ bookingOpenHoursBeforeStart: null });
      const expiresAtMs = toEpochMs('2026-11-10T12:00:00.000Z');

      engine.registerSession({
        id: 'sess_at_expiry_exact',
        startsAt: toIsoString(expiresAtMs),
        endsAt: toIsoString(expiresAtMs + 50 * MS_PER_MINUTE),
        capacity: 2,
      });
      engine.registerSession({
        id: 'sess_after_expiry_1ms',
        startsAt: toIsoString(expiresAtMs + 1),
        endsAt: toIsoString(expiresAtMs + 50 * MS_PER_MINUTE),
        capacity: 2,
      });

      const resLateSession = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_after_expiry_1ms',
        membershipId: 'pass_01_expired',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(resLateSession.ok, false);
      assert.equal(
        resLateSession.error.code,
        BookingErrorCode.MEMBERSHIP_EXPIRED_AT_SESSION_TIME
      );

      const resExactSession = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_at_expiry_exact',
        membershipId: 'pass_01_expired',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(resExactSession.ok, true);
    });

    it('T26: 일일 예약 한도(dailyBookingLimit) 및 주간 예약 한도(weeklyBookingLimit, 월요일 시작 주간 기준) 초과 시 거부', () => {
      const engine = createEngineWithFixtures({ bookingOpenHoursBeforeStart: null });
      engine.registerSession({
        id: 'sess_day1_b',
        apparatus: 'reformer',
        startsAt: '2026-11-12T13:00:00.000Z',
        endsAt: '2026-11-12T13:50:00.000Z',
        capacity: 3,
      });

      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const dailyExceed = engine.bookSession({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_day1_b',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:05:00.000Z',
      });
      assert.equal(dailyExceed.ok, false);
      assert.equal(dailyExceed.error.code, BookingErrorCode.DAILY_BOOKING_LIMIT_EXCEEDED);

      engine.registerMembership({
        id: 'pass_weekly_1',
        memberId: 'mem_virtual_03',
        totalCredits: 10,
        remainingCredits: 10,
        validFrom: '2026-11-01T00:00:00.000Z',
        expiresAt: '2026-11-30T23:59:59.999Z',
        weeklyBookingLimit: 1,
      });

      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_weekly_1',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const weeklyExceed = engine.bookSession({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_no_waitlist',
        membershipId: 'pass_weekly_1',
        requestedAt: '2026-11-10T09:05:00.000Z',
      });
      assert.equal(weeklyExceed.ok, false);
      assert.equal(weeklyExceed.error.code, BookingErrorCode.WEEKLY_BOOKING_LIMIT_EXCEEDED);
    });
  });

  // =========================================================================
  // 5. 예약/취소 시간 창 경계 및 패널티 정책 (T27 ~ T32)
  // =========================================================================
  describe('5. 예약 오픈/마감 및 무료 취소/지각 취소 시간 경계', () => {
    it('T27: 예약 오픈 시간(수업 168시간 전) 경계 — 오픈 1ms 전은 BOOKING_WINDOW_NOT_OPEN, 정각은 허용', () => {
      const engine = createEngineWithFixtures({ bookingOpenHoursBeforeStart: 168 });
      const startsAtMs = toEpochMs('2026-11-12T10:00:00.000Z');
      const openBoundaryMs = startsAtMs - 168 * MS_PER_HOUR;

      const tooEarly = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: toIsoString(openBoundaryMs - 1),
      });
      assert.equal(tooEarly.ok, false);
      assert.equal(tooEarly.error.code, BookingErrorCode.BOOKING_WINDOW_NOT_OPEN);

      const exactOpen = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: toIsoString(openBoundaryMs),
      });
      assert.equal(exactOpen.ok, true);
    });

    it('T28: 예약 마감 시간(수업 30분 전) 경계 — 마감 정각은 허용, 마감 1ms 후는 BOOKING_WINDOW_CLOSED 거부', () => {
      const engine = createEngineWithFixtures({ bookingCloseMinutesBeforeStart: 30 });
      const startsAtMs = toEpochMs('2026-11-12T10:00:00.000Z');
      const closeBoundaryMs = startsAtMs - 30 * MS_PER_MINUTE;

      const exactClose = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: toIsoString(closeBoundaryMs),
      });
      assert.equal(exactClose.ok, true);

      const afterClose = engine.bookSession({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: toIsoString(closeBoundaryMs + 1),
      });
      assert.equal(afterClose.ok, false);
      assert.equal(afterClose.error.code, BookingErrorCode.BOOKING_WINDOW_CLOSED);
    });

    it('T29: 이미 시작된 수업(requestedAt >= session.startsAt) 예약 시도 시 SESSION_ALREADY_STARTED 거부', () => {
      const engine = createEngineWithFixtures({ bookingCloseMinutesBeforeStart: 0 });
      const startsAtMs = toEpochMs('2026-11-12T10:00:00.000Z');

      const atStart = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: toIsoString(startsAtMs),
      });
      assert.equal(atStart.ok, false);
      assert.equal(atStart.error.code, BookingErrorCode.SESSION_ALREADY_STARTED);
    });

    it('T30: 무료 취소 마감(수업 24시간 전) 정각(0ms) 취소 시 페널티 없이 횟수 100% 복구', () => {
      const engine = createEngineWithFixtures({ freeCancelMinutesBeforeStart: 1440 });
      const startsAtMs = toEpochMs('2026-11-12T10:00:00.000Z');
      const freeCancelBoundaryMs = startsAtMs - 1440 * MS_PER_MINUTE;

      const bk = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(bk.membership.remainingCredits, 9);

      const cancelExact = engine.cancelBookingOrThrow({
        bookingId: bk.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: toIsoString(freeCancelBoundaryMs),
      });

      assert.equal(cancelExact.cancelledBooking.creditRefunded, true);
      assert.equal(cancelExact.cancelledBooking.lateCancelPenalty, false);
      assert.equal(cancelExact.membership.remainingCredits, 10);
      assert.equal(cancelExact.refundLedgerEntry.delta, 1);
    });

    it('T31: 무료 취소 마감 1ms 경과 후 취소 시 FORFEIT_CREDIT 정책에 따라 예약은 취소되나 횟수는 미복구', () => {
      const engine = createEngineWithFixtures({
        freeCancelMinutesBeforeStart: 1440,
        lateCancelPolicy: LateCancelPolicy.FORFEIT_CREDIT,
      });
      const startsAtMs = toEpochMs('2026-11-12T10:00:00.000Z');
      const freeCancelBoundaryMs = startsAtMs - 1440 * MS_PER_MINUTE;

      const bk = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const cancelLate = engine.cancelBookingOrThrow({
        bookingId: bk.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: toIsoString(freeCancelBoundaryMs + 1),
      });

      assert.equal(cancelLate.cancelledBooking.status, BookingStatus.CANCELLED);
      assert.equal(cancelLate.cancelledBooking.creditRefunded, false);
      assert.equal(cancelLate.cancelledBooking.lateCancelPenalty, true);
      assert.equal(cancelLate.membership.remainingCredits, 9);
      assert.equal(cancelLate.refundLedgerEntry, null);
    });

    it('T32: 지각 취소 거부 정책(REJECT_LATE_CANCEL) 및 수업 시작 후 취소(CANCELLATION_WINDOW_CLOSED) 거부', () => {
      const engineRejectLate = createEngineWithFixtures({
        freeCancelMinutesBeforeStart: 1440,
        lateCancelPolicy: LateCancelPolicy.REJECT_LATE_CANCEL,
      });
      const startsAtMs = toEpochMs('2026-11-12T10:00:00.000Z');
      const freeCancelBoundaryMs = startsAtMs - 1440 * MS_PER_MINUTE;

      const bk = engineRejectLate.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const lateAttempt = engineRejectLate.cancelBooking({
        bookingId: bk.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: toIsoString(freeCancelBoundaryMs + 1),
      });
      assert.equal(lateAttempt.ok, false);
      assert.equal(lateAttempt.error.code, BookingErrorCode.LATE_CANCELLATION_DENIED);

      const afterStartAttempt = engineRejectLate.cancelBooking({
        bookingId: bk.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: toIsoString(startsAtMs),
      });
      assert.equal(afterStartAttempt.ok, false);
      assert.equal(afterStartAttempt.error.code, BookingErrorCode.CANCELLATION_WINDOW_CLOSED);
    });
  });

  // =========================================================================
  // 6. 반복 요청의 중복 차감/환불 방지 및 오류 구조 검증 (T33 ~ T40)
  // =========================================================================
  describe('6. 멱등성(Idempotency) 중복 차감/환불 방지 및 오류 구조 검증', () => {
    it('T33: 동일 idempotencyKey로 예약 요청을 3회 반복 호출해도 횟수는 단 1회만 차감되고 동일 예약 반환', () => {
      const engine = createEngineWithFixtures();
      const req = {
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
        idempotencyKey: 'idem_book_001',
      };

      const r1 = engine.bookSession(req);
      const r2 = engine.bookSession(req);
      const r3 = engine.bookSession(req);

      assert.equal(r1.ok, true);
      assert.equal(r1.idempotentReplay, false);
      assert.equal(r2.ok, true);
      assert.equal(r2.idempotentReplay, true);
      assert.equal(r3.ok, true);
      assert.equal(r3.idempotentReplay, true);

      assert.equal(r1.data.booking.id, r2.data.booking.id);
      assert.equal(r2.data.booking.id, r3.data.booking.id);
      assert.equal(engine.getMembershipSummary('pass_01_active').remainingCredits, 9);
      assert.equal(engine.getCreditLedger('pass_01_active').length, 1);
    });

    it('T34: 동일 idempotencyKey로 취소 요청을 반복 호출해도 횟수는 단 1회만 복구되며 중복 환불 방지', () => {
      const engine = createEngineWithFixtures();
      const bk = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      const cancelReq = {
        bookingId: bk.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T10:00:00.000Z',
        idempotencyKey: 'idem_cancel_001',
      };

      const c1 = engine.cancelBooking(cancelReq);
      const c2 = engine.cancelBooking(cancelReq);

      assert.equal(c1.ok, true);
      assert.equal(c1.idempotentReplay, false);
      assert.equal(c2.ok, true);
      assert.equal(c2.idempotentReplay, true);
      assert.equal(engine.getMembershipSummary('pass_01_active').remainingCredits, 10);
      assert.equal(engine.getCreditLedger('pass_01_active').length, 2);
    });

    it('T35: idempotencyKey 없이 이미 취소된 예약을 재취소 시도할 경우 BOOKING_ALREADY_CANCELLED 거부 및 중복 환불 차단', () => {
      const engine = createEngineWithFixtures();
      const bk = engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      engine.cancelBookingOrThrow({
        bookingId: bk.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T10:00:00.000Z',
      });

      const secondCancel = engine.cancelBooking({
        bookingId: bk.booking.id,
        memberId: 'mem_virtual_01',
        cancelledAt: '2026-11-10T10:05:00.000Z',
      });

      assert.equal(secondCancel.ok, false);
      assert.equal(secondCancel.error.code, BookingErrorCode.BOOKING_ALREADY_CANCELLED);
      assert.equal(engine.getMembershipSummary('pass_01_active').remainingCredits, 10);
    });

    it('T36: 동일한 idempotencyKey를 다른 세션이나 다른 회원 요청에 재사용하면 IDEMPOTENCY_KEY_CONFLICT 거부', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
        idempotencyKey: 'idem_shared_key',
      });

      const conflict = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_adjacent',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
        idempotencyKey: 'idem_shared_key',
      });

      assert.equal(conflict.ok, false);
      assert.equal(conflict.error.code, BookingErrorCode.IDEMPOTENCY_KEY_CONFLICT);
      assert.equal(conflict.error.category, ErrorCategory.IDEMPOTENCY);
      assert.equal(engine.getMembershipSummary('pass_01_active').remainingCredits, 9);
    });

    it('T37: requireIdempotencyKey: true 정책 활성화 시 idempotencyKey 누락 요청은 IDEMPOTENCY_KEY_REQUIRED 거부', () => {
      const engine = createEngineWithFixtures({ requireIdempotencyKey: true });
      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.IDEMPOTENCY_KEY_REQUIRED);
    });

    it('T38: 스튜디오 사유 폐강(cancelSessionByStudio) 시 무료 취소 마감 이후라도 전원 100% 환불 및 멱등성 보장', () => {
      const engine = createEngineWithFixtures();
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_02',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_02_active',
        requestedAt: '2026-11-10T09:01:00.000Z',
      });
      engine.bookSessionOrThrow({
        memberId: 'mem_virtual_03',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_03_active',
        requestedAt: '2026-11-10T09:02:00.000Z',
      });

      const studioCancelReq = {
        sessionId: 'sess_reformer_small',
        cancelledAt: '2026-11-12T09:00:00.000Z',
        reason: 'INSTRUCTOR_EMERGENCY',
        idempotencyKey: 'idem_studio_cancel_01',
      };
      const c1 = engine.cancelSessionByStudio(studioCancelReq);
      const c2 = engine.cancelSessionByStudio(studioCancelReq);

      assert.equal(c1.ok, true);
      assert.equal(c1.idempotentReplay, false);
      assert.equal(c2.ok, true);
      assert.equal(c2.idempotentReplay, true);
      assert.equal(c1.data.affectedBookings.length, 3);
      assert.equal(c1.data.refundLedgerEntries.length, 3);
      assert.equal(engine.getMembershipSummary('pass_01_active').remainingCredits, 10);
      assert.equal(engine.getMembershipSummary('pass_02_active').remainingCredits, 3);
      assert.equal(engine.getMembershipSummary('pass_03_active').remainingCredits, 5);
    });

    it('T39: 비활성/미존재 엔티티, 폐강 세션 예약, 잘못된 정원·타임스탬프 입력 시 정확한 오류 코드 반환', () => {
      const engine = createEngineWithFixtures();

      const rInactiveMember = engine.bookSession({
        memberId: 'mem_virtual_inactive',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(rInactiveMember.error.code, BookingErrorCode.MEMBER_NOT_FOUND);

      const rNoSession = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_unknown',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(rNoSession.error.code, BookingErrorCode.SESSION_NOT_FOUND);

      const rCancelledSession = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_cancelled_class',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });
      assert.equal(rCancelledSession.error.code, BookingErrorCode.SESSION_CANCELLED);

      const rBadTime = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_active',
        requestedAt: 'not-a-valid-timestamp',
      });
      assert.equal(rBadTime.error.code, BookingErrorCode.INVALID_TIMESTAMP);

      assert.throws(
        () =>
          engine.registerSession({
            id: 'sess_bad_cap',
            startsAt: '2026-11-12T10:00:00.000Z',
            endsAt: '2026-11-12T10:50:00.000Z',
            capacity: 0,
          }),
        (err) =>
          err instanceof PilatesBookingError &&
          err.code === BookingErrorCode.INVALID_CAPACITY
      );
    });

    it('T40: 모든 도메인 오류가 표준 구조(code, category, httpStatus, retryable, message, details)를 준수하는지 검증', () => {
      const engine = createEngineWithFixtures();
      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'sess_reformer_small',
        membershipId: 'pass_01_zero_credit',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      const errObj = res.error;
      assert.equal(typeof errObj.name, 'string');
      assert.equal(errObj.code, BookingErrorCode.INSUFFICIENT_CREDITS);
      assert.equal(errObj.category, ErrorCategory.MEMBERSHIP);
      assert.equal(errObj.httpStatus, 422);
      assert.equal(errObj.retryable, false);
      assert.equal(typeof errObj.message, 'string');
      assert.ok(errObj.message.length > 0);
      assert.equal(errObj.details.membershipId, 'pass_01_zero_credit');
      assert.equal(errObj.details.remainingCredits, 0);
    });
  });

  // =========================================================================
  // 7. 원본 pilates-flow 스키마 및 스케줄 규칙 일치 검증 (T41 ~ T45)
  // =========================================================================
  describe('7. 원본 pilates-flow 스케줄(InstructorScheduleOccurrence) 규칙 호환 검증', () => {
    it('T41: pilates-flow InstructorScheduleOccurrence 형식(date, startTime, endTime, status="scheduled") 직접 등록 및 예약', () => {
      const engine = createEngineWithFixtures();
      engine.registerSession({
        id: 'cls_reformer_am@2026-11-12',
        classId: 'cls_reformer_am',
        originalDate: '2026-11-12',
        date: '2026-11-12',
        startTime: '19:00',
        endTime: '19:50',
        locationId: 'loc_atelier_1',
        title: '저녁 리포머 시퀀스',
        participantAlias: '이하은 강사',
        apparatus: 'reformer',
        capacity: 3,
        status: 'scheduled',
      });

      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'cls_reformer_am@2026-11-12',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, true);
      assert.equal(res.data.booking.status, BookingStatus.CONFIRMED);
    });

    it('T42: pilates-flow 휴무(status="closed") 회차 예약 시도 시 SESSION_CLOSED 거부', () => {
      const engine = createEngineWithFixtures();
      engine.registerSession({
        id: 'cls_reformer_am@2026-11-13',
        date: '2026-11-13',
        startTime: '10:00',
        endTime: '10:50',
        status: 'closed',
        reason: '센터 정기 점검 휴무',
        capacity: 4,
      });

      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'cls_reformer_am@2026-11-13',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.SESSION_CLOSED);
    });

    it('T43: pilates-flow 일정 변경 원본(status="moved") 회차 예약 시도 시 SESSION_MOVED 및 movedTo 안내 반환', () => {
      const engine = createEngineWithFixtures();
      engine.registerSession({
        id: 'cls_reformer_am@2026-11-14',
        date: '2026-11-14',
        startTime: '10:00',
        endTime: '10:50',
        status: 'moved',
        movedTo: '2026-11-15',
        reason: '강사 일정 조정',
        capacity: 4,
      });

      const res = engine.bookSession({
        memberId: 'mem_virtual_01',
        sessionId: 'cls_reformer_am@2026-11-14',
        membershipId: 'pass_01_active',
        requestedAt: '2026-11-10T09:00:00.000Z',
      });

      assert.equal(res.ok, false);
      assert.equal(res.error.code, BookingErrorCode.SESSION_MOVED);
      assert.equal(res.error.details.movedTo, '2026-11-15');
    });

    it('T44: pilates-flow instructorScheduleSchema 날짜(1900~2199, 달력 유효성) 및 시각(HH:MM) 검증 일치', () => {
      assert.equal(isScheduleDate('2026-11-10'), true);
      assert.equal(isScheduleDate('2026-02-29'), false); // 2026 is not a leap year
      assert.equal(isScheduleDate('1899-12-31'), false);
      assert.equal(isScheduleDate('2200-01-01'), false);
      assert.equal(isScheduleTime('09:50'), true);
      assert.equal(isScheduleTime('24:00'), false);

      const engine = createEngineWithFixtures();
      assert.throws(
        () =>
          engine.registerSession({
            id: 'sess_bad_date',
            date: '2026-02-30',
            startTime: '10:00',
            endTime: '10:50',
            capacity: 2,
          }),
        (err) => err.code === BookingErrorCode.INVALID_SCHEDULE_DATE
      );
    });

    it('T45: pilates-flow instructorScheduledClassSchema 종료 시각 역전(endTime <= startTime) 시 INVALID_TIME_ORDER 거부', () => {
      const engine = createEngineWithFixtures();
      assert.throws(
        () =>
          engine.registerSession({
            id: 'sess_reverse_time',
            date: '2026-11-12',
            startTime: '11:00',
            endTime: '10:50',
            capacity: 2,
          }),
        (err) =>
          err instanceof PilatesBookingError &&
          err.code === BookingErrorCode.INVALID_TIME_ORDER
      );
    });
  });

  it('T46: seeding an explicit booking ID (bk_0001) advances _bookingSeq so subsequent bookings get bk_0002 without overwriting bk_0001', () => {
    const fixtures = createVirtualStudioFixtures();
    const engine = new PilatesBookingEngine({
      ...fixtures,
      bookings: [
        {
          id: 'bk_0001',
          memberId: 'mem_virtual_01',
          membershipId: 'pass_01_active',
          sessionId: 'sess_reformer_small',
          requestedAt: '2026-11-10T09:00:00.000Z',
        },
      ],
    });

    const second = engine.bookSession({
      memberId: 'mem_virtual_02',
      membershipId: 'pass_02_active',
      sessionId: 'sess_reformer_small',
      requestedAt: '2026-11-10T10:00:00.000Z',
    });

    assert.equal(second.ok, true);
    assert.equal(second.data.booking.id, 'bk_0002');
    assert.equal(second.data.sessionSummary.confirmedCount, 2);
    assert.equal(second.data.sessionSummary.remainingSeats, 0);
    assert.notEqual(engine.getBooking('bk_0001'), null);
    assert.equal(engine.getBooking('bk_0001').memberId, 'mem_virtual_01');
    assert.equal(engine.getBooking('bk_0002').memberId, 'mem_virtual_02');
  });

  it('T47: seeding booking IDs above Number.MAX_SAFE_INTEGER (bk_9007199254740992) strictly advances sequence without infinite loop or collision', () => {
    const fixtures = createVirtualStudioFixtures();
    const engine = new PilatesBookingEngine({
      ...fixtures,
      bookings: [
        {
          id: 'bk_9007199254740992',
          memberId: 'mem_virtual_01',
          membershipId: 'pass_01_active',
          sessionId: 'sess_reformer_small',
          requestedAt: '2026-11-10T09:00:00.000Z',
        },
      ],
    });

    const nextBooking = engine.bookSession({
      memberId: 'mem_virtual_02',
      membershipId: 'pass_02_active',
      sessionId: 'sess_reformer_small',
      requestedAt: '2026-11-10T10:00:00.000Z',
    });

    assert.equal(nextBooking.ok, true);
    assert.equal(nextBooking.data.booking.id, 'bk_9007199254740993');
    assert.equal(nextBooking.data.sessionSummary.confirmedCount, 2);
    assert.equal(engine.getBooking('bk_9007199254740992').memberId, 'mem_virtual_01');
    assert.equal(engine.getBooking('bk_9007199254740993').memberId, 'mem_virtual_02');

    const waitlistedBooking = engine.bookSession({
      memberId: 'mem_virtual_03',
      membershipId: 'pass_03_active',
      sessionId: 'sess_reformer_small',
      requestedAt: '2026-11-10T10:05:00.000Z',
    });
    assert.equal(waitlistedBooking.ok, true);
    assert.equal(waitlistedBooking.data.booking.id, 'bk_9007199254740994');
  });

  it('T48: seeding MAX_SAFE_INTEGER (bk_9007199254740991) transitions to bk_9007199254740992 and rejects duplicate seed IDs', () => {
    const fixtures = createVirtualStudioFixtures();
    const engine = new PilatesBookingEngine({
      ...fixtures,
      bookings: [
        {
          id: 'bk_9007199254740991',
          memberId: 'mem_virtual_01',
          membershipId: 'pass_01_active',
          sessionId: 'sess_reformer_small',
          requestedAt: '2026-11-10T09:00:00.000Z',
        },
      ],
    });

    const nextBooking = engine.bookSession({
      memberId: 'mem_virtual_02',
      membershipId: 'pass_02_active',
      sessionId: 'sess_reformer_small',
      requestedAt: '2026-11-10T10:00:00.000Z',
    });
    assert.equal(nextBooking.ok, true);
    assert.equal(nextBooking.data.booking.id, 'bk_9007199254740992');

    assert.throws(
      () =>
        new PilatesBookingEngine({
          ...fixtures,
          bookings: [
            {
              id: 'bk_9007199254740992',
              memberId: 'mem_virtual_01',
              membershipId: 'pass_01_active',
              sessionId: 'sess_reformer_small',
              requestedAt: '2026-11-10T09:00:00.000Z',
            },
            {
              id: 'bk_9007199254740992',
              memberId: 'mem_virtual_02',
              membershipId: 'pass_02_active',
              sessionId: 'sess_reformer_small',
              requestedAt: '2026-11-10T09:05:00.000Z',
            },
          ],
        }),
      (err) =>
        err instanceof PilatesBookingError &&
        err.code === BookingErrorCode.INVALID_INPUT
    );
  });

});
