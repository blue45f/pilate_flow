/**
 * Synthetic, privacy-safe virtual fixtures for Pilates-flow booking engine tests.
 * Uses purely fictional studio members, memberships, and sessions (no real customer PII or external DB).
 */

import { MembershipStatus, SessionStatus } from './booking-engine.mjs';

export const BASE_REFERENCE_TIME = '2026-11-10T09:00:00.000Z';

/**
 * Creates a fresh set of virtual studio fixtures anchored around November 2026.
 * Apparatus values match `ApparatusType` ('reformer' | 'cadillac' | 'chair' | 'barrel' | 'mat')
 * in `pilates-flow/src/types/pilates.ts`.
 */
export function createVirtualStudioFixtures() {
  const members = [
    { id: 'mem_virtual_01', name: '김서연 (Virtual Member 01)', tier: 'VIP', active: true },
    { id: 'mem_virtual_02', name: '박지훈 (Virtual Member 02)', tier: 'STANDARD', active: true },
    { id: 'mem_virtual_03', name: '최유진 (Virtual Member 03)', tier: 'STANDARD', active: true },
    { id: 'mem_virtual_04', name: '정민수 (Virtual Member 04)', tier: 'STANDARD', active: true },
    { id: 'mem_virtual_05', name: '한소희 (Virtual Member 05)', tier: 'STANDARD', active: true },
    { id: 'mem_virtual_inactive', name: '비활성회원 (Virtual Inactive)', tier: 'STANDARD', active: false },
  ];

  const memberships = [
    {
      id: 'pass_01_active',
      memberId: 'mem_virtual_01',
      planName: '기구 필라테스 20회권',
      totalCredits: 20,
      remainingCredits: 10,
      validFrom: '2026-11-01T00:00:00.000Z',
      expiresAt: '2026-11-30T23:59:59.999Z',
      status: MembershipStatus.ACTIVE,
      allowedApparatus: ['reformer', 'cadillac', 'chair', 'barrel'],
      dailyBookingLimit: 2,
      weeklyBookingLimit: 5,
    },
    {
      id: 'pass_02_active',
      memberId: 'mem_virtual_02',
      planName: '리포머 집중 10회권',
      totalCredits: 10,
      remainingCredits: 3,
      validFrom: '2026-11-01T00:00:00.000Z',
      expiresAt: '2026-11-30T23:59:59.999Z',
      status: MembershipStatus.ACTIVE,
      allowedApparatus: ['reformer'],
      dailyBookingLimit: 1,
      weeklyBookingLimit: 3,
    },
    {
      id: 'pass_03_active',
      memberId: 'mem_virtual_03',
      planName: '올어라운드 15회권',
      totalCredits: 15,
      remainingCredits: 5,
      validFrom: '2026-11-01T00:00:00.000Z',
      expiresAt: '2026-11-30T23:59:59.999Z',
      status: MembershipStatus.ACTIVE,
      allowedApparatus: null,
      dailyBookingLimit: null,
      weeklyBookingLimit: null,
    },
    {
      id: 'pass_04_single_credit',
      memberId: 'mem_virtual_04',
      planName: '원데이 잔여 1회권',
      totalCredits: 5,
      remainingCredits: 1,
      validFrom: '2026-11-01T00:00:00.000Z',
      expiresAt: '2026-11-30T23:59:59.999Z',
      status: MembershipStatus.ACTIVE,
      allowedApparatus: null,
      dailyBookingLimit: null,
      weeklyBookingLimit: null,
    },
    {
      id: 'pass_05_active',
      memberId: 'mem_virtual_05',
      planName: '올어라운드 10회권',
      totalCredits: 10,
      remainingCredits: 4,
      validFrom: '2026-11-01T00:00:00.000Z',
      expiresAt: '2026-11-30T23:59:59.999Z',
      status: MembershipStatus.ACTIVE,
      allowedApparatus: null,
      dailyBookingLimit: null,
      weeklyBookingLimit: null,
    },
    {
      id: 'pass_01_zero_credit',
      memberId: 'mem_virtual_01',
      planName: '소진된 10회권',
      totalCredits: 10,
      remainingCredits: 0,
      validFrom: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-12-31T23:59:59.999Z',
      status: MembershipStatus.ACTIVE,
    },
    {
      id: 'pass_01_expired',
      memberId: 'mem_virtual_01',
      planName: '지난달 만료 회원권',
      totalCredits: 10,
      remainingCredits: 4,
      validFrom: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-11-10T12:00:00.000Z',
      status: MembershipStatus.ACTIVE,
    },
    {
      id: 'pass_01_paused',
      memberId: 'mem_virtual_01',
      planName: '홀딩(일시정지) 회원권',
      totalCredits: 10,
      remainingCredits: 6,
      validFrom: '2026-11-01T00:00:00.000Z',
      expiresAt: '2026-12-31T23:59:59.999Z',
      status: MembershipStatus.PAUSED,
    },
    {
      id: 'pass_01_future',
      memberId: 'mem_virtual_01',
      planName: '12월 개시 예정 회원권',
      totalCredits: 10,
      remainingCredits: 10,
      validFrom: '2026-11-15T00:00:00.000Z',
      expiresAt: '2026-12-31T23:59:59.999Z',
      status: MembershipStatus.ACTIVE,
    },
  ];

  const sessions = [
    {
      id: 'sess_reformer_small',
      title: '오전 리포머 코어 (2:1 소그룹)',
      instructorName: '이하은 원장',
      apparatus: 'reformer',
      classType: 'group',
      startsAt: '2026-11-12T10:00:00.000Z',
      endsAt: '2026-11-12T10:50:00.000Z',
      capacity: 2,
      waitlistCapacity: 2,
      allowWaitlist: true,
      status: SessionStatus.SCHEDULED,
    },
    {
      id: 'sess_reformer_overlap',
      title: '오전 캐딜락 모빌리티 (동시간 겹침)',
      instructorName: '박소율 강사',
      apparatus: 'cadillac',
      classType: 'group',
      startsAt: '2026-11-12T10:30:00.000Z',
      endsAt: '2026-11-12T11:20:00.000Z',
      capacity: 4,
      waitlistCapacity: 2,
      allowWaitlist: true,
      status: SessionStatus.SCHEDULED,
    },
    {
      id: 'sess_reformer_adjacent',
      title: '오전 체어 밸런스 (연속 수업 10:50 시작)',
      instructorName: '박소율 강사',
      apparatus: 'chair',
      classType: 'group',
      startsAt: '2026-11-12T10:50:00.000Z',
      endsAt: '2026-11-12T11:40:00.000Z',
      capacity: 4,
      waitlistCapacity: 2,
      allowWaitlist: true,
      status: SessionStatus.SCHEDULED,
    },
    {
      id: 'sess_no_waitlist',
      title: '프라이빗 1:1 레슨 (대기 불가)',
      instructorName: '이하은 원장',
      apparatus: 'reformer',
      classType: 'private',
      startsAt: '2026-11-13T14:00:00.000Z',
      endsAt: '2026-11-13T14:50:00.000Z',
      capacity: 1,
      waitlistCapacity: 0,
      allowWaitlist: false,
      status: SessionStatus.SCHEDULED,
    },
    {
      id: 'sess_cancelled_class',
      title: '폐강된 배럴 클래스',
      instructorName: '최수아 강사',
      apparatus: 'barrel',
      classType: 'group',
      startsAt: '2026-11-14T18:00:00.000Z',
      endsAt: '2026-11-14T18:50:00.000Z',
      capacity: 4,
      waitlistCapacity: 2,
      allowWaitlist: true,
      status: SessionStatus.CANCELLED,
    },
  ];

  return {
    members,
    memberships,
    sessions,
  };
}
