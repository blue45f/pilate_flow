import { describe, expect, it } from 'vitest';
import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type { ClassHistoryLog } from '../types/pilates';
import {
  computeStudioBusinessSummary,
  DEFAULT_BUSINESS_SETTINGS,
  DEFAULT_WEEKLY_STUDIO_SLOTS,
  recommendMakeupSlots,
  sanitizeAdvisorAliasKo,
} from './studioBusinessAdvisorEngine';
import type { ScheduledMakeupSlot } from './studioBusinessAdvisorEngine';

function createSampleLog(overrides: Partial<ClassHistoryLog>): ClassHistoryLog {
  return {
    id: 'log-custom',
    sequenceId: 'seq-1',
    sequenceTitle: '리포머 밸런스 50분',
    groupId: 'grp-am',
    groupName: '화·목 오전반',
    taughtAt: '2026-11-10T10:00:00.000Z',
    apparatus: 'reformer',
    level: '1.5',
    exerciseIds: ['ex-warmup-01'],
    rating: 5,
    intensity: 'moderate',
    instructorReflection: '호흡 안정화 진행',
    ...overrides,
  };
}

describe('studioBusinessAdvisorEngine', () => {
  it('1. DEFAULT_WEEKLY_STUDIO_SLOTS는 리포머·체어·캐딜락·매트와 오전/오후/저녁을 포함한 현실적인 8개 슬롯이다', () => {
    expect(DEFAULT_WEEKLY_STUDIO_SLOTS).toHaveLength(8);

    const apparatuses = new Set(DEFAULT_WEEKLY_STUDIO_SLOTS.map((s) => s.apparatus));
    expect(apparatuses).toEqual(new Set(['reformer', 'chair', 'cadillac', 'mat']));

    const hours = DEFAULT_WEEKLY_STUDIO_SLOTS.map((s) => Number(s.timeLabel.split(':')[0]));
    expect(hours.some((h) => h < 12)).toBe(true);
    expect(hours.some((h) => h >= 12 && h < 18)).toBe(true);
    expect(hours.some((h) => h >= 18)).toBe(true);

    const openSlots = DEFAULT_WEEKLY_STUDIO_SLOTS.filter((s) => s.capacity - s.bookedCount > 0);
    const fullSlots = DEFAULT_WEEKLY_STUDIO_SLOTS.filter((s) => s.capacity - s.bookedCount === 0);
    expect(openSlots.length).toBeGreaterThanOrEqual(6);
    expect(fullSlots.length).toBe(1);
  });

  it('2. historyLogs가 비어 있으면 예시 시뮬레이션 기준 배지와 정직한 시뮬레이션 지표를 반환한다', () => {
    const summary = computeStudioBusinessSummary({
      historyLogs: [],
      scheduledSessions: DEFAULT_WEEKLY_STUDIO_SLOTS,
      ...DEFAULT_BUSINESS_SETTINGS,
    });

    expect(summary.dataSourceMode).toBe('simulation');
    expect(summary.dataSourceBadgeKo).toBe('예시 시뮬레이션 기준');
    expect(summary.dailyEstimatedRevenueKrw).toBeGreaterThan(0);
    expect(summary.weeklyEstimatedRevenueKrw).toBeGreaterThanOrEqual(
      summary.dailyEstimatedRevenueKrw,
    );
    expect(summary.monthlyProjectedRevenueKrw).toBeGreaterThanOrEqual(
      summary.weeklyEstimatedRevenueKrw,
    );
    expect(summary.utilizationPct).toBeGreaterThan(0);
    expect(summary.utilizationPct).toBeLessThanOrEqual(100);
    expect(summary.topApparatusKo).toBe('리포머');
    expect(summary.actionableBriefsKo).toHaveLength(3);
    expect(summary.dailyBriefMessageKo).toContain('예시 시뮬레이션 기준');
    expect(summary.dailyBriefMessageKo).toContain('시뮬레이션 수치');
  });

  it('3. 실제 historyLogs가 있으면 실제 수업 기록 기준으로 그룹·개인 매출과 피크 시간대·가동률을 계산한다', () => {
    const recordedLogs: ClassHistoryLog[] = [
      createSampleLog({
        id: 'l-1',
        groupId: 'grp-mon-am',
        groupName: '월수 오전반',
        taughtAt: '2026-11-10T10:00:00.000Z',
        apparatus: 'cadillac',
      }),
      createSampleLog({
        id: 'l-2',
        groupId: 'grp-mon-ev',
        groupName: '월수 저녁반',
        taughtAt: '2026-11-10T19:00:00.000Z',
        apparatus: 'cadillac',
      }),
      createSampleLog({
        id: 'l-3',
        groupId: 'grp-private-01',
        groupName: '개인 01',
        sequenceTitle: '1:1 캐딜락 맞춤 수업',
        taughtAt: '2026-11-10T19:30:00.000Z',
        apparatus: 'reformer',
      }),
    ];

    const summary = computeStudioBusinessSummary({
      historyLogs: recordedLogs,
      scheduledSessions: DEFAULT_WEEKLY_STUDIO_SLOTS,
      groupFeePerMemberKrw: 30_000,
      privateFeePerSessionKrw: 90_000,
      dailyRoomSlotCapacity: 6,
      avgGroupAttendance: 5,
    });

    // 2 group sessions (2 * 30,000 * 5 = 300,000) + 1 private session (90,000) on 1 active day
    expect(summary.dataSourceMode).toBe('recorded');
    expect(summary.dataSourceBadgeKo).toBe('실제 수업 기록 기준');
    expect(summary.dailyEstimatedRevenueKrw).toBe(390_000);
    expect(summary.weeklyEstimatedRevenueKrw).toBe(2_340_000);
    expect(summary.monthlyProjectedRevenueKrw).toBe(9_360_000);
    expect(summary.utilizationPct).toBe(50); // 3 sessions / 6 daily slots
    expect(summary.topApparatusKo).toBe('캐딜락');
    expect(summary.peakTimeBandKo).toBe('저녁 (18~22시)');
    expect(summary.actionableBriefsKo).toHaveLength(3);
    expect(summary.dailyBriefMessageKo).toContain('실제 수업 기록 기준');
    expect(summary.dailyBriefMessageKo).toContain('3건');
  });

  it('4. INITIAL_HISTORY_LOGS와 경계값(0건·음수·초과 가동률)을 안전하게 처리한다', () => {
    const withCatalog = computeStudioBusinessSummary({
      historyLogs: INITIAL_HISTORY_LOGS,
      scheduledSessions: DEFAULT_WEEKLY_STUDIO_SLOTS,
      ...DEFAULT_BUSINESS_SETTINGS,
    });
    expect(withCatalog.dataSourceMode).toBe('recorded');
    expect(withCatalog.topApparatusKo).toBe('리포머');
    expect(withCatalog.peakTimeBandKo).toBe('오전 (06~12시)');

    const emptyAll = computeStudioBusinessSummary({
      historyLogs: [],
      scheduledSessions: [],
      groupFeePerMemberKrw: -5000,
      privateFeePerSessionKrw: Number.NaN,
      dailyRoomSlotCapacity: 0,
      avgGroupAttendance: -2,
    });
    expect(emptyAll.dataSourceMode).toBe('simulation');
    expect(emptyAll.dailyEstimatedRevenueKrw).toBe(0);
    expect(emptyAll.weeklyEstimatedRevenueKrw).toBe(0);
    expect(emptyAll.monthlyProjectedRevenueKrw).toBe(0);
    expect(emptyAll.utilizationPct).toBe(0);
    expect(emptyAll.actionableBriefsKo).toHaveLength(3);

    // Over-capacity sessions clamp cleanly to 100%
    const overloaded = computeStudioBusinessSummary({
      historyLogs: [
        createSampleLog({ id: 'o1', taughtAt: '2026-11-11T09:00:00.000Z' }),
        createSampleLog({ id: 'o2', taughtAt: '2026-11-11T10:00:00.000Z' }),
        createSampleLog({ id: 'o3', taughtAt: '2026-11-11T11:00:00.000Z' }),
      ],
      scheduledSessions: [],
      groupFeePerMemberKrw: 25_000,
      privateFeePerSessionKrw: 80_000,
      dailyRoomSlotCapacity: 2,
      avgGroupAttendance: 4,
    });
    expect(overloaded.utilizationPct).toBe(100);
  });

  it('5. recommendMakeupSlots는 잔여석 0인 슬롯을 제외하고 가중치(기구+45, 난이도+30/18, 시간대+15, 좌석+10/5)로 TOP 3를 추천한다', () => {
    const slots: ScheduledMakeupSlot[] = [
      {
        slotId: 'full-perfect',
        dateLabelKo: '수요일',
        timeLabel: '19:30',
        apparatus: 'reformer',
        level: '1.5',
        roomLabelKo: '리포머 A룸',
        capacity: 6,
        bookedCount: 6, // 0 remaining -> MUST be filtered out
        instructorAliasKo: '강사 A',
      },
      {
        slotId: 'perfect-open-2',
        dateLabelKo: '목요일',
        timeLabel: '19:00',
        apparatus: 'reformer',
        level: '1.5',
        roomLabelKo: '리포머 A룸',
        capacity: 6,
        bookedCount: 4, // 2 remaining -> 45 + 30 + 15 + 10 = 100
        instructorAliasKo: '강사 A',
      },
      {
        slotId: 'same-app-adj-level-open-1',
        dateLabelKo: '금요일',
        timeLabel: '19:00',
        apparatus: 'reformer',
        level: '1.0',
        roomLabelKo: '리포머 B룸',
        capacity: 6,
        bookedCount: 5, // 1 remaining -> 45 + 18 + 15 + 5 = 83
        instructorAliasKo: '강사 B',
      },
      {
        slotId: 'diff-app-same-level-evening',
        dateLabelKo: '금요일',
        timeLabel: '20:00',
        apparatus: 'chair',
        level: '1.5',
        roomLabelKo: '체어룸',
        capacity: 6,
        bookedCount: 3, // 3 remaining -> 0 + 30 + 15 + 10 = 55
        instructorAliasKo: '강사 C',
      },
      {
        slotId: 'lowest-match',
        dateLabelKo: '월요일',
        timeLabel: '09:30',
        apparatus: 'mat',
        level: '2.0',
        roomLabelKo: '매트룸',
        capacity: 8,
        bookedCount: 7, // 1 remaining -> 0 + 18 + 0 + 5 = 23
        instructorAliasKo: '강사 C',
      },
    ];

    const recs = recommendMakeupSlots(
      {
        memberAliasKo: '수요 오전반 회원 A',
        originalApparatus: 'reformer',
        originalLevel: '1.5',
        preferredTimeBand: 'evening',
        reasonKo: '개인 일정',
      },
      slots,
    );

    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.slot.slotId)).toEqual([
      'perfect-open-2',
      'same-app-adj-level-open-1',
      'diff-app-same-level-evening',
    ]);
    expect(recs[0]?.matchScore).toBe(100);
    expect(recs[0]?.remainingSeats).toBe(2);
    expect(recs[1]?.matchScore).toBe(83);
    expect(recs[1]?.remainingSeats).toBe(1);
    expect(recs[2]?.matchScore).toBe(55);

    // Full slot never appears
    expect(recs.some((r) => r.slot.slotId === 'full-perfect')).toBe(false);

    // Draft message contains natural Korean copy with sanitized alias
    expect(recs[0]?.draftMessageKo).toContain('수요 오전반 회원 A님');
    expect(recs[0]?.draftMessageKo).toContain('목요일 19:00');
    expect(recs[0]?.draftMessageKo).toContain('개인 일정');
  });

  it('6. 비식별 별칭은 안전하게 유지하고 실명·연락처·질환 표현은 안내 문구에서 자동 차단한다', () => {
    const safeAlias = sanitizeAdvisorAliasKo('수요 오전반 회원 A');
    expect(safeAlias.wasSanitized).toBe(false);
    expect(safeAlias.textKo).toBe('수요 오전반 회원 A');

    const safeAfternoon = sanitizeAdvisorAliasKo('화목 오후반 회원 B');
    expect(safeAfternoon.wasSanitized).toBe(false);
    expect(safeAfternoon.textKo).toBe('화목 오후반 회원 B');

    const unsafePii = sanitizeAdvisorAliasKo('김철수 회원 010-9876-5432 디스크');
    expect(unsafePii.wasSanitized).toBe(true);
    expect(unsafePii.textKo).toBe('수업 회원 A');

    const recs = recommendMakeupSlots(
      {
        memberAliasKo: '박영희님 010-1234-5678',
        originalApparatus: 'chair',
        originalLevel: '2.0',
        preferredTimeBand: 'evening',
        reasonKo: '허리 디스크 병원 진단',
      },
      DEFAULT_WEEKLY_STUDIO_SLOTS,
    );
    expect(recs[0]?.draftMessageKo).not.toContain('박영희');
    expect(recs[0]?.draftMessageKo).not.toContain('010-1234-5678');
    expect(recs[0]?.draftMessageKo).not.toContain('디스크');
    expect(recs[0]?.draftMessageKo).toContain('수업 회원 A님');
  });

  it('7. 모든 슬롯이 만석이면 빈 추천 배열을 반환한다', () => {
    const allFull = DEFAULT_WEEKLY_STUDIO_SLOTS.map((slot) => ({
      ...slot,
      bookedCount: slot.capacity,
    }));
    const recs = recommendMakeupSlots(
      {
        memberAliasKo: '주말반 회원 C',
        originalApparatus: 'reformer',
        originalLevel: '1.5',
        preferredTimeBand: 'any',
      },
      allFull,
    );
    expect(recs).toEqual([]);
  });
});
