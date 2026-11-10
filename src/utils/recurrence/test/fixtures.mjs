// @ts-check

/**
 * Virtual Fixtures for Pilates Weekly Recurrence Timetable Expansion Tests
 * - 100% synthetic studio rooms, instructors, weekly rules, holidays, and exceptions
 * - Contains zero personal data or external dependencies
 * - Excludes booking/membership logic
 */

export const VIRTUAL_STUDIO_ROOMS = Object.freeze([
  Object.freeze({
    id: 'room-reformer-a',
    alias: '리포머 A룸 (6:1)',
    equipmentIds: Object.freeze(['reformer', 'chair']),
    propIds: Object.freeze(['magic-circle', 'foam-roller']),
    notes: '메인 그룹 리포머 룸',
  }),
  Object.freeze({
    id: 'room-cadillac-b',
    alias: '캐딜락/바렐 B룸 (2:1)',
    equipmentIds: Object.freeze(['cadillac', 'barrel']),
    propIds: Object.freeze(['mini-ball', 'theraband']),
    notes: '듀엣 집중 케어 룸',
  }),
  Object.freeze({
    id: 'room-private-c',
    alias: '프라이빗 C룸 (1:1)',
    equipmentIds: Object.freeze(['reformer', 'cadillac', 'chair', 'barrel', 'mat']),
    propIds: Object.freeze(['bosu', 'toning-ball']),
    notes: '개인 레슨 전용 룸',
  }),
]);

export const VIRTUAL_INSTRUCTORS = Object.freeze([
  Object.freeze({ id: 'inst-kim', alias: '김서연 강사' }),
  Object.freeze({ id: 'inst-park', alias: '박지훈 강사' }),
  Object.freeze({ id: 'inst-lee', alias: '이하은 강사' }),
]);

export const VIRTUAL_KST_HOLIDAYS_2026_NOV = Object.freeze([
  Object.freeze({
    date: '2026-11-04',
    name: '스튜디오 정기 소독/점검 휴관일',
    mode: 'skip',
  }),
  Object.freeze({
    date: '2026-11-11',
    name: '리포머 A룸 스프링 교체 점검',
    roomIds: ['room-reformer-a'],
    mode: 'closed',
  }),
]);

/**
 * Creates a fresh deep copy of virtual schedule fixtures for isolated test runs.
 */
export function createVirtualTimetableFixture() {
  return {
    fixedNowKst: '2026-11-09T09:30:00+09:00',
    rooms: VIRTUAL_STUDIO_ROOMS.map((room) => ({
      ...room,
      equipmentIds: [...room.equipmentIds],
      propIds: [...room.propIds],
    })),
    instructors: VIRTUAL_INSTRUCTORS.map((inst) => ({ ...inst })),
    classes: [
      {
        id: 'cls-morning-reformer',
        title: '모닝 코어 리포머 50분',
        instructorId: 'inst-kim',
        roomId: 'room-reformer-a',
        startDate: '2026-11-02',
        untilDate: '2026-11-30',
        startTime: '09:00',
        endTime: '09:50',
        recurrence: 'weekly',
        weekdays: [1, 3, 5],
        notes: '오전 정규 그룹반',
      },
      {
        id: 'cls-biweekly-duet',
        title: '격주 듀엣 체형교정',
        instructorId: 'inst-park',
        roomId: 'room-cadillac-b',
        startDate: '2026-11-03',
        untilDate: '2026-11-30',
        startTime: '14:00',
        endTime: '14:50',
        recurrence: 'weekly',
        weekdays: [2, 4],
        intervalWeeks: 2,
        notes: '1·3주차 격주 운영',
      },
      {
        id: 'cls-monthly-2nd-4th-sat',
        title: '토요 심화 스파인 모빌리티',
        instructorId: 'inst-lee',
        roomId: 'room-private-c',
        startDate: '2026-11-01',
        untilDate: '2026-11-30',
        startTime: '11:00',
        endTime: '11:50',
        recurrence: 'weekly',
        weekdays: [6],
        weeksOfMonth: [2, 4],
        weekOfMonthMode: 'weekday-ordinal',
        notes: '매월 2·4째주 토요일 특강',
      },
    ],
    holidays: VIRTUAL_KST_HOLIDAYS_2026_NOV.map((h) => ({
      ...h,
      ...('roomIds' in h && h.roomIds ? { roomIds: [...h.roomIds] } : {}),
    })),
    exceptions: [],
  };
}
