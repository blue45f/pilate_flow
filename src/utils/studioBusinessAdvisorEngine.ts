import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { ApparatusType, ClassHistoryLog, DifficultyLevel } from '../types/pilates';
import { inspectSensitiveHealthText } from './sensitiveHealthPrivacy';

export type ExerciseLevel = DifficultyLevel;
export type TimeBand = 'morning' | 'afternoon' | 'evening';
export type PreferredTimeBand = TimeBand | 'any';
export type BusinessAdvisorRoleMode = 'freelance' | 'solo-owner' | 'center-manager';

export interface ScheduledMakeupSlot {
  readonly slotId: string;
  readonly dateLabelKo: string;
  readonly timeLabel: string;
  readonly apparatus: ApparatusType;
  readonly level: ExerciseLevel;
  readonly roomLabelKo: string;
  readonly capacity: number;
  readonly bookedCount: number;
  readonly instructorAliasKo: string;
}

export interface StudioDailyBusinessInput {
  readonly historyLogs: readonly ClassHistoryLog[];
  readonly scheduledSessions: readonly ScheduledMakeupSlot[];
  readonly groupFeePerMemberKrw: number;
  readonly privateFeePerSessionKrw: number;
  readonly dailyRoomSlotCapacity: number;
  readonly avgGroupAttendance: number;
}

export interface StudioBusinessSummary {
  readonly dataSourceMode: 'recorded' | 'simulation';
  readonly dataSourceBadgeKo: string;
  readonly dailyEstimatedRevenueKrw: number;
  readonly weeklyEstimatedRevenueKrw: number;
  readonly monthlyProjectedRevenueKrw: number;
  readonly utilizationPct: number;
  readonly topApparatusKo: string;
  readonly peakTimeBandKo: string;
  readonly actionableBriefsKo: string[];
  readonly dailyBriefMessageKo: string;
}

export interface AbsenceRequest {
  readonly memberAliasKo: string;
  readonly originalApparatus: ApparatusType;
  readonly originalLevel: ExerciseLevel;
  readonly preferredTimeBand: PreferredTimeBand;
  readonly reasonKo?: string;
}

export interface MakeupRecommendation {
  readonly slot: ScheduledMakeupSlot;
  readonly matchScore: number;
  readonly remainingSeats: number;
  readonly matchReasonsKo: string[];
  readonly draftMessageKo: string;
}

export interface SanitizedAdvisorTextResult {
  readonly textKo: string;
  readonly wasSanitized: boolean;
  readonly noticeKo: string | null;
}

export const DEFAULT_BUSINESS_SETTINGS = {
  groupFeePerMemberKrw: 25_000,
  privateFeePerSessionKrw: 80_000,
  dailyRoomSlotCapacity: 6,
  avgGroupAttendance: 4,
} as const;

export const DEFAULT_WEEKLY_STUDIO_SLOTS: readonly ScheduledMakeupSlot[] = [
  {
    slotId: 'slot-mon-1000-reformer',
    dateLabelKo: '월요일',
    timeLabel: '10:00',
    apparatus: 'reformer',
    level: '1.0',
    roomLabelKo: '리포머 A룸',
    capacity: 6,
    bookedCount: 4,
    instructorAliasKo: '강사 A',
  },
  {
    slotId: 'slot-tue-1400-cadillac',
    dateLabelKo: '화요일',
    timeLabel: '14:00',
    apparatus: 'cadillac',
    level: '1.5',
    roomLabelKo: '캐딜락 콤비룸',
    capacity: 4,
    bookedCount: 2,
    instructorAliasKo: '강사 B',
  },
  {
    slotId: 'slot-tue-1900-reformer',
    dateLabelKo: '화요일',
    timeLabel: '19:00',
    apparatus: 'reformer',
    level: '1.5',
    roomLabelKo: '리포머 A룸',
    capacity: 6,
    bookedCount: 5,
    instructorAliasKo: '강사 A',
  },
  {
    slotId: 'slot-wed-1100-chair',
    dateLabelKo: '수요일',
    timeLabel: '11:00',
    apparatus: 'chair',
    level: '1.5',
    roomLabelKo: '체어·소도구룸',
    capacity: 6,
    bookedCount: 3,
    instructorAliasKo: '강사 C',
  },
  {
    slotId: 'slot-wed-1930-reformer-full',
    dateLabelKo: '수요일',
    timeLabel: '19:30',
    apparatus: 'reformer',
    level: '1.5',
    roomLabelKo: '리포머 A룸',
    capacity: 6,
    bookedCount: 6,
    instructorAliasKo: '강사 A',
  },
  {
    slotId: 'slot-thu-1530-mat',
    dateLabelKo: '목요일',
    timeLabel: '15:30',
    apparatus: 'mat',
    level: '1.0',
    roomLabelKo: '매트 스튜디오',
    capacity: 8,
    bookedCount: 5,
    instructorAliasKo: '강사 B',
  },
  {
    slotId: 'slot-fri-0930-cadillac',
    dateLabelKo: '금요일',
    timeLabel: '09:30',
    apparatus: 'cadillac',
    level: '2.0',
    roomLabelKo: '캐딜락 콤비룸',
    capacity: 4,
    bookedCount: 3,
    instructorAliasKo: '강사 A',
  },
  {
    slotId: 'slot-fri-2000-chair',
    dateLabelKo: '금요일',
    timeLabel: '20:00',
    apparatus: 'chair',
    level: '2.0',
    roomLabelKo: '체어·소도구룸',
    capacity: 6,
    bookedCount: 4,
    instructorAliasKo: '강사 C',
  },
];

const TIME_BAND_LABELS_KO: Readonly<Record<TimeBand, string>> = {
  morning: '오전 (06~12시)',
  afternoon: '오후 (12~18시)',
  evening: '저녁 (18~22시)',
};

const LEVEL_RANK: Readonly<Record<ExerciseLevel, number>> = {
  '1.0': 0,
  '1.5': 1,
  '2.0': 2,
};

const MEDICAL_CLAIM_WORDS =
  /치료|완치|진단|처방|교정\s*보장|통증\s*제거|통증\s*완치|디스크\s*치료|재활\s*치료/i;

const SAFE_CLASS_BAND_SEGMENT =
  /(?:월|화|수|목|금|토|일|주말|평일|오전|오후|저녁|점심|새벽|심화|입문|기초|중급|그룹|개인|리포머|캐딜락|체어|바렐|매트)[가-힣·\d\s]{0,8}반/g;

export function formatKrw(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `${safe.toLocaleString('ko-KR')}원`;
}

export function getApparatusLabelKo(apparatus: ApparatusType | 'mixed'): string {
  if (apparatus === 'mixed') return '콤비·복합 기구';
  return APPARATUS_LABELS[apparatus]?.ko ?? apparatus;
}

export function getTimeBandLabelKo(band: TimeBand): string {
  return TIME_BAND_LABELS_KO[band];
}

export function classifyHourToTimeBand(hour: number): TimeBand {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function classifySlotTimeBand(timeLabel: string): TimeBand {
  const match = timeLabel.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (match) {
    const hour = Number(match[1]);
    if (Number.isFinite(hour)) {
      return classifyHourToTimeBand(hour);
    }
  }
  if (/오전|아침|새벽/.test(timeLabel)) return 'morning';
  if (/저녁|야간|밤/.test(timeLabel)) return 'evening';
  return 'afternoon';
}

function classifyHistoryLogTimeBand(log: ClassHistoryLog): TimeBand {
  const isoMatch = log.taughtAt.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    const hour = Number(isoMatch[1]);
    if (Number.isFinite(hour)) {
      return classifyHourToTimeBand(hour);
    }
  }
  if (/오전|아침|새벽/.test(log.groupName)) return 'morning';
  if (/저녁|야간|밤/.test(log.groupName)) return 'evening';
  return 'afternoon';
}

function extractDateKeyFromTaughtAt(taughtAt: string, fallbackIndex: number): string {
  const isoDate = taughtAt.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];
  const parsed = Date.parse(taughtAt);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return `unknown-day-${fallbackIndex}`;
}

function isPrivateHistoryLog(log: ClassHistoryLog): boolean {
  const combined = `${log.groupId} ${log.groupName} ${log.sequenceTitle}`;
  return /(?:개인|프라이빗|1\s*:\s*1|\bprivate\b)/i.test(combined);
}

/**
 * Ensures member aliases stay non-identifying and free of sensitive health terms,
 * while preserving safe class-band aliases such as "수요 오전반 회원 A".
 */
export function sanitizeAdvisorAliasKo(rawAlias?: string): SanitizedAdvisorTextResult {
  const trimmed = (rawAlias ?? '').trim();
  if (!trimmed) {
    return { textKo: '수업 회원 A', wasSanitized: false, noticeKo: null };
  }

  // Mask benign class-band prefixes (e.g., "오전반", "오후반") before running surname-based PII regex
  // so terms like "오전반 회원" do not false-positive as surname "오".
  const inspectionTarget = trimmed.replace(SAFE_CLASS_BAND_SEGMENT, '[수업반]');
  const inspection = inspectSensitiveHealthText(inspectionTarget);

  if (inspection.hasSensitiveData || MEDICAL_CLAIM_WORDS.test(trimmed)) {
    return {
      textKo: '수업 회원 A',
      wasSanitized: true,
      noticeKo:
        '실명·연락처 또는 민감 건강 표현은 비식별 별칭(예: 수요 오전반 회원 A)으로 자동 정리했어요.',
    };
  }

  const withoutPhoneDigits = trimmed.replace(/\d{3,4}[-\s]?\d{4}/g, '').trim();
  if (!withoutPhoneDigits) {
    return {
      textKo: '수업 회원 A',
      wasSanitized: true,
      noticeKo: '연락처 형태 숫자를 제외하고 비식별 별칭으로 정리했어요.',
    };
  }

  return {
    textKo: withoutPhoneDigits.slice(0, 28),
    wasSanitized: false,
    noticeKo: null,
  };
}

function sanitizeOptionalReasonKo(rawReason?: string): string | null {
  const trimmed = (rawReason ?? '').trim();
  if (!trimmed) return null;
  const inspectionTarget = trimmed.replace(SAFE_CLASS_BAND_SEGMENT, '[수업반]');
  const inspection = inspectSensitiveHealthText(inspectionTarget);
  if (inspection.hasSensitiveData || MEDICAL_CLAIM_WORDS.test(trimmed)) {
    return '개인 일정 조정';
  }
  return trimmed.slice(0, 40);
}

function pickTopKey<K extends string>(counts: ReadonlyMap<K, number>): K | null {
  let bestKey: K | null = null;
  let bestWeight = -1;
  for (const [key, weight] of counts.entries()) {
    if (weight > bestWeight) {
      bestKey = key;
      bestWeight = weight;
    }
  }
  return bestWeight > 0 ? bestKey : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildActionableBriefsKo(params: {
  dataSourceMode: 'recorded' | 'simulation';
  utilizationPct: number;
  topApparatusKo: string;
  peakTimeBandKo: string;
  openSeatCount: number;
}): string[] {
  const { dataSourceMode, utilizationPct, topApparatusKo, peakTimeBandKo, openSeatCount } = params;

  const brief1 =
    utilizationPct < 55
      ? `현재 가동률이 ${utilizationPct}%입니다. 비피크 시간대에 소규모 체험 클래스나 보강 전용 슬롯을 열어 빈 룸 시간을 먼저 채워 보세요.`
      : utilizationPct < 80
        ? `가동률이 ${utilizationPct}%로 안정 구간입니다. 잔여 1~2석 수업 중심으로 기존 회원 보강·지인 체험을 안내해 80%대 안착을 노려 보세요.`
        : `가동률이 ${utilizationPct}%로 매우 높습니다. ${peakTimeBandKo} 대기 알림을 운영하고 추가 증설이나 1:1 집중 레슨 전환을 검토해 보세요.`;

  const brief2 =
    topApparatusKo === '데이터 없음'
      ? '주간 시간표 슬롯이나 완료된 수업 기록을 추가하면 인기 기구와 시간대별 편성 제안을 바로 받아볼 수 있습니다.'
      : `가장 수요가 높은 기구는 ${topApparatusKo}입니다. 인기 시간대 쏠림을 줄이려면 인접 기구 체험 루틴을 교차 배치해 잔여석(${openSeatCount}석)을 고르게 채워 보세요.`;

  const brief3 =
    dataSourceMode === 'simulation'
      ? '지금 수치는 예시 시뮬레이션 기준입니다. 수업을 마친 뒤 진행 기록을 1건 이상 저장하면 실제 스튜디오 기록 기준 분석으로 자동 전환됩니다.'
      : `${peakTimeBandKo} 결석이 생기면 결석 보강 추천 탭에서 잔여석 슬롯을 바로 안내해 수강권 소진율과 재등록 흐름을 지켜 보세요.`;

  return [brief1, brief2, brief3];
}

export function computeStudioBusinessSummary(
  input: StudioDailyBusinessInput,
): StudioBusinessSummary {
  const groupFee = Number.isFinite(input.groupFeePerMemberKrw)
    ? Math.max(0, input.groupFeePerMemberKrw)
    : 0;
  const privateFee = Number.isFinite(input.privateFeePerSessionKrw)
    ? Math.max(0, input.privateFeePerSessionKrw)
    : 0;
  const dailySlotCap = Number.isFinite(input.dailyRoomSlotCapacity)
    ? Math.max(1, Math.round(input.dailyRoomSlotCapacity))
    : 1;
  const avgAttendance = Number.isFinite(input.avgGroupAttendance)
    ? Math.max(0, input.avgGroupAttendance)
    : 0;

  const hasRecordedLogs = input.historyLogs.length > 0;
  const dataSourceMode: 'recorded' | 'simulation' = hasRecordedLogs ? 'recorded' : 'simulation';
  const dataSourceBadgeKo = hasRecordedLogs ? '실제 수업 기록 기준' : '예시 시뮬레이션 기준';

  const openSeatCount = input.scheduledSessions.reduce(
    (sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount),
    0,
  );

  let dailyEstimatedRevenueKrw = 0;
  let weeklyEstimatedRevenueKrw = 0;
  let monthlyProjectedRevenueKrw = 0;
  let utilizationPct = 0;
  let topApparatusKo = '데이터 없음';
  let peakTimeBandKo = '데이터 없음';

  if (hasRecordedLogs) {
    const uniqueDays = new Set<string>();
    const apparatusCounts = new Map<ApparatusType | 'mixed', number>();
    const timeBandCounts = new Map<TimeBand, number>();
    let totalRecordedRevenue = 0;

    input.historyLogs.forEach((log, index) => {
      uniqueDays.add(extractDateKeyFromTaughtAt(log.taughtAt, index));
      apparatusCounts.set(log.apparatus, (apparatusCounts.get(log.apparatus) ?? 0) + 1);
      const band = classifyHistoryLogTimeBand(log);
      timeBandCounts.set(band, (timeBandCounts.get(band) ?? 0) + 1);

      if (isPrivateHistoryLog(log)) {
        totalRecordedRevenue += privateFee;
      } else {
        totalRecordedRevenue += groupFee * avgAttendance;
      }
    });

    const activeDays = Math.max(1, uniqueDays.size);
    const avgDailySessions = input.historyLogs.length / activeDays;

    dailyEstimatedRevenueKrw = Math.round(totalRecordedRevenue / activeDays);
    weeklyEstimatedRevenueKrw = Math.round(dailyEstimatedRevenueKrw * 6);
    monthlyProjectedRevenueKrw = Math.round(weeklyEstimatedRevenueKrw * 4);
    utilizationPct = clamp(Math.round((avgDailySessions / dailySlotCap) * 100), 0, 100);

    const topApparatus = pickTopKey(apparatusCounts);
    const topBand = pickTopKey(timeBandCounts);
    topApparatusKo = topApparatus ? getApparatusLabelKo(topApparatus) : '데이터 없음';
    peakTimeBandKo = topBand ? getTimeBandLabelKo(topBand) : '데이터 없음';
  } else if (input.scheduledSessions.length > 0) {
    const uniqueDayLabels = new Set<string>();
    const apparatusWeights = new Map<ApparatusType, number>();
    const timeBandWeights = new Map<TimeBand, number>();

    let totalCapacity = 0;
    let totalBooked = 0;
    let groupSlotBookedSum = 0;
    let activeGroupSlotCount = 0;

    for (const slot of input.scheduledSessions) {
      const safeCapacity = Math.max(0, slot.capacity);
      const safeBooked = clamp(slot.bookedCount, 0, safeCapacity);
      uniqueDayLabels.add(slot.dateLabelKo.trim() || slot.slotId);
      totalCapacity += safeCapacity;
      totalBooked += safeBooked;

      if (safeCapacity > 1 && safeBooked > 0) {
        groupSlotBookedSum += safeBooked;
        activeGroupSlotCount += 1;
      }

      const weight = safeBooked > 0 ? safeBooked : 1;
      apparatusWeights.set(slot.apparatus, (apparatusWeights.get(slot.apparatus) ?? 0) + weight);
      const band = classifySlotTimeBand(slot.timeLabel);
      timeBandWeights.set(band, (timeBandWeights.get(band) ?? 0) + weight);
    }

    const baselineAvgGroupBooked =
      activeGroupSlotCount > 0 ? groupSlotBookedSum / activeGroupSlotCount : 0;
    const attendanceScale =
      baselineAvgGroupBooked > 0 ? avgAttendance / baselineAvgGroupBooked : 0;

    let weeklyRawRevenue = 0;
    for (const slot of input.scheduledSessions) {
      const safeCapacity = Math.max(0, slot.capacity);
      const safeBooked = clamp(slot.bookedCount, 0, safeCapacity);
      if (safeBooked <= 0) continue;

      if (safeCapacity <= 1) {
        weeklyRawRevenue += privateFee;
      } else {
        const effectiveAttendees = clamp(safeBooked * attendanceScale, 0, safeCapacity);
        weeklyRawRevenue += effectiveAttendees * groupFee;
      }
    }

    const operatingDays = Math.max(1, uniqueDayLabels.size);
    dailyEstimatedRevenueKrw = Math.round(weeklyRawRevenue / operatingDays);
    weeklyEstimatedRevenueKrw = Math.round(weeklyRawRevenue);
    monthlyProjectedRevenueKrw = Math.round(weeklyRawRevenue * 4);

    if (totalBooked <= 0 || totalCapacity <= 0) {
      utilizationPct = 0;
    } else {
      const seatFillPct = (totalBooked / totalCapacity) * 100;
      const dailyRoomLoadPct = Math.min(
        100,
        ((input.scheduledSessions.length / operatingDays) / dailySlotCap) * 100,
      );
      utilizationPct = clamp(Math.round(seatFillPct * 0.7 + dailyRoomLoadPct * 0.3), 0, 100);
    }

    const topApparatus = pickTopKey(apparatusWeights);
    const topBand = pickTopKey(timeBandWeights);
    topApparatusKo = topApparatus ? getApparatusLabelKo(topApparatus) : '데이터 없음';
    peakTimeBandKo = topBand ? getTimeBandLabelKo(topBand) : '데이터 없음';
  }

  const actionableBriefsKo = buildActionableBriefsKo({
    dataSourceMode,
    utilizationPct,
    topApparatusKo,
    peakTimeBandKo,
    openSeatCount,
  });

  const sourceFootnoteKo =
    dataSourceMode === 'simulation'
      ? '※ 로컬 수업 기록이 없어 예시 시간표 기준으로 산출한 시뮬레이션 수치입니다.'
      : `※ 로컬 수업 기록 ${input.historyLogs.length}건과 설정 단가를 반영한 추정치입니다.`;

  const dailyBriefMessageKo = [
    `[스튜디오 일일 경영 브리핑 · ${dataSourceBadgeKo}]`,
    `• 예상 매출: 일 ${formatKrw(dailyEstimatedRevenueKrw)} / 주 ${formatKrw(weeklyEstimatedRevenueKrw)} / 월 ${formatKrw(monthlyProjectedRevenueKrw)}`,
    `• 룸 가동률: ${utilizationPct}% (인기 기구: ${topApparatusKo} · 피크 시간대: ${peakTimeBandKo})`,
    '• 오늘의 운영 제안:',
    ...actionableBriefsKo.map((brief, idx) => `  ${idx + 1}. ${brief}`),
    sourceFootnoteKo,
  ].join('\n');

  return {
    dataSourceMode,
    dataSourceBadgeKo,
    dailyEstimatedRevenueKrw,
    weeklyEstimatedRevenueKrw,
    monthlyProjectedRevenueKrw,
    utilizationPct,
    topApparatusKo,
    peakTimeBandKo,
    actionableBriefsKo,
    dailyBriefMessageKo,
  };
}

export function recommendMakeupSlots(
  request: AbsenceRequest,
  slots: readonly ScheduledMakeupSlot[],
): MakeupRecommendation[] {
  const sanitizedAlias = sanitizeAdvisorAliasKo(request.memberAliasKo).textKo;
  const sanitizedReason = sanitizeOptionalReasonKo(request.reasonKo);
  const originalApparatusKo = getApparatusLabelKo(request.originalApparatus);

  const scored: MakeupRecommendation[] = [];

  for (const slot of slots) {
    const remainingSeats = slot.capacity - slot.bookedCount;
    if (remainingSeats <= 0) {
      continue;
    }

    let matchScore = 0;
    const matchReasonsKo: string[] = [];
    const slotApparatusKo = getApparatusLabelKo(slot.apparatus);
    const slotBand = classifySlotTimeBand(slot.timeLabel);
    const slotBandLabelKo = getTimeBandLabelKo(slotBand);

    // 1. 기구 일치 (+45)
    if (slot.apparatus === request.originalApparatus) {
      matchScore += 45;
      matchReasonsKo.push(`원 수업과 동일한 ${slotApparatusKo} 기구 (+45점)`);
    }

    // 2. 난이도 일치/인접 (일치 +30, 인접 +18)
    const levelDiff = Math.abs(LEVEL_RANK[slot.level] - LEVEL_RANK[request.originalLevel]);
    if (levelDiff === 0) {
      matchScore += 30;
      matchReasonsKo.push(`난이도 정확히 일치 (Lv ${slot.level}, +30점)`);
    } else if (levelDiff === 1) {
      matchScore += 18;
      matchReasonsKo.push(
        `인접 난이도 (Lv ${request.originalLevel} → Lv ${slot.level}, +18점)`,
      );
    }

    // 3. 선호 시간대 일치 (+15)
    if (request.preferredTimeBand === 'any') {
      matchScore += 15;
      matchReasonsKo.push(`희망 시간대 무관 조건 충족 (${slotBandLabelKo}, +15점)`);
    } else if (slotBand === request.preferredTimeBand) {
      matchScore += 15;
      matchReasonsKo.push(`희망 시간대 일치 (${slotBandLabelKo}, +15점)`);
    }

    // 4. 여유 좌석 보너스 (2석 이상 +10, 1석 +5)
    if (remainingSeats >= 2) {
      matchScore += 10;
      matchReasonsKo.push(`여유 좌석 ${remainingSeats}석 확보 (+10점)`);
    } else {
      matchScore += 5;
      matchReasonsKo.push('잔여 1석 즉시 배정 가능 (+5점)');
    }

    const reasonClause = sanitizedReason ? ` (${sanitizedReason} 사유 확인)` : '';
    const highlightSummary = matchReasonsKo
      .slice(0, 2)
      .map((item) => item.replace(/\s*\(\+\d+점\)/g, ''))
      .join(' · ');

    const draftMessageKo = [
      `안녕하세요, ${sanitizedAlias}님.`,
      `결석하신 ${originalApparatusKo}(Lv ${request.originalLevel}) 수업의 보강 가능 일정을 안내드립니다.${reasonClause}`,
      '',
      `• 추천 보강: ${slot.dateLabelKo} ${slot.timeLabel} · ${slotApparatusKo} (Lv ${slot.level})`,
      `• 진행 공간: ${slot.roomLabelKo} (담당 ${slot.instructorAliasKo} · 잔여 ${remainingSeats}석)`,
      `• 추천 포인트: ${highlightSummary}`,
      '',
      '참여를 원하시면 편하신 시간에 답장해 주세요. 자리 먼저 배정해 두겠습니다.',
    ].join('\n');

    scored.push({
      slot,
      matchScore,
      remainingSeats,
      matchReasonsKo,
      draftMessageKo,
    });
  }

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.remainingSeats !== a.remainingSeats) return b.remainingSeats - a.remainingSeats;
    return a.slot.slotId.localeCompare(b.slot.slotId);
  });

  return scored.slice(0, 3);
}
