import type React from 'react';

import {
  PilatesScheduleAndMembershipSample,
  type MemberPassLedger,
  type PilatesMemberClassSlot,
} from '../PilatesScheduleAndMembershipSample';

const INSTANCE_A_PASS: MemberPassLedger = {
  passId: 'fixture_pass_a',
  passTitle: '기구 필라테스 10회권 (인스턴스 A)',
  participantAlias: '소나무회원A',
  remainingCount: 5,
  pendingReservedCount: 1,
  totalCount: 10,
  expiresAtIso: '2026-12-31',
};

const INSTANCE_B_PASS: MemberPassLedger = {
  passId: 'fixture_pass_b',
  passTitle: '기구 필라테스 8회권 (인스턴스 B)',
  participantAlias: '단풍회원B',
  remainingCount: 3,
  pendingReservedCount: 0,
  totalCount: 8,
  expiresAtIso: '2026-12-31',
};

const FIXTURE_SLOTS: readonly PilatesMemberClassSlot[] = [
  {
    id: 'slot_avail',
    classId: 'cls_01',
    date: '2026-11-12',
    startTime: '09:00',
    endTime: '09:50',
    title: '모닝 코어 리포머',
    locationAlias: '리포머 A룸',
    instructorAlias: '김서연 강사',
    equipmentLabels: ['리포머'],
    recommendedLayer: 'standard',
    occurrenceStatus: 'scheduled',
    currentEnrolled: 2,
    maxCapacity: 6,
    waitlistCount: 0,
    maxWaitlist: 2,
    freeCancelHoursBefore: 24,
    myState: 'NONE',
  },
  {
    id: 'slot_booked',
    classId: 'cls_02',
    date: '2026-11-12',
    startTime: '11:00',
    endTime: '11:50',
    title: '체형교정 캐딜락',
    locationAlias: '캐딜락 B룸',
    instructorAlias: '박지훈 강사',
    equipmentLabels: ['캐딜락'],
    recommendedLayer: 'easy',
    occurrenceStatus: 'scheduled',
    currentEnrolled: 2,
    maxCapacity: 2,
    waitlistCount: 0,
    maxWaitlist: 2,
    freeCancelHoursBefore: 24,
    myState: 'BOOKED',
  },
  {
    id: 'slot_waitlist',
    classId: 'cls_03',
    date: '2026-11-12',
    startTime: '19:00',
    endTime: '19:50',
    title: '이브닝 바렐 밸런스',
    locationAlias: '바렐 C룸',
    instructorAlias: '이하은 강사',
    equipmentLabels: ['바렐'],
    recommendedLayer: 'hard',
    occurrenceStatus: 'scheduled',
    currentEnrolled: 4,
    maxCapacity: 4,
    waitlistCount: 1,
    maxWaitlist: 3,
    freeCancelHoursBefore: 24,
    myState: 'NONE',
  },
];

export const PilatesKeyboardBrowserFixtureApp: React.FC = () => {
  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 24,
        padding: 24,
        backgroundColor: '#EFECE4',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <div data-testid="browser-fixture-instance-a">
        <PilatesScheduleAndMembershipSample
          pass={INSTANCE_A_PASS}
          slots={FIXTURE_SLOTS}
          selectedDate="2026-11-12"
        />
      </div>
      <div data-testid="browser-fixture-instance-b">
        <PilatesScheduleAndMembershipSample
          pass={INSTANCE_B_PASS}
          slots={FIXTURE_SLOTS}
          selectedDate="2026-11-12"
        />
      </div>
    </main>
  );
};
