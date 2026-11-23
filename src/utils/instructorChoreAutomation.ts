import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  SPINAL_PLANE_LABELS,
} from '../data/pilatesCatalog';
import type {
  ApparatusType,
  ClassBlockCategory,
  ClassHistoryLog,
  PilatesExercise,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { inspectSensitiveHealthText } from './sensitiveHealthPrivacy';
import { isRestStep } from './sequenceEngine';
import {
  extractStepRequiredResources,
  getStudioResourceLabelKo,
} from './studioPropAllocator';
import type { TimeSlotResourceConflictReport } from './studioPropAllocator';

const MEDICAL_CLAIM_WORDS =
  /치료|완치|진단|처방|교정\s*보장|통증\s*제거|통증\s*완치|디스크\s*치료|재활\s*치료/gi;

export interface SanitizedAliasResult {
  readonly aliasKo: string;
  readonly wasSanitized: boolean;
  readonly noticeKo: string | null;
}

/**
 * Ensures member labels stay non-identifying and free of sensitive health terms
 * (no real names, phone numbers, emails, or clinical diagnoses).
 */
export function sanitizeMemberAliasKo(rawAlias?: string): SanitizedAliasResult {
  const trimmed = (rawAlias ?? '').trim();
  if (!trimmed) {
    return { aliasKo: '회원님', wasSanitized: false, noticeKo: null };
  }

  const inspection = inspectSensitiveHealthText(trimmed);
  if (inspection.hasSensitiveData || MEDICAL_CLAIM_WORDS.test(trimmed)) {
    return {
      aliasKo: '수업 회원님',
      wasSanitized: true,
      noticeKo:
        '실명·연락처나 민감한 건강 표현은 비식별 별칭(예: 금요 2시 반, 회원 A)으로 자동 정리했어요.',
    };
  }

  // Strip stray digits shaped like phone fragments or resident numbers
  const compact = trimmed.replace(/\d{3,4}[-\s]?\d{4}/g, '').trim();
  if (!compact) {
    return {
      aliasKo: '수업 회원님',
      wasSanitized: true,
      noticeKo: '연락처 형태 숫자를 제외하고 기본 호칭으로 바꿨어요.',
    };
  }

  return {
    aliasKo: compact.slice(0, 24),
    wasSanitized: false,
    noticeKo: null,
  };
}

export interface PostClassFollowUpInput {
  readonly memberAliasKo?: string;
  readonly classTitleKo: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly nextClassHintKo?: string;
  readonly tone?: 'warm' | 'concise';
}

export interface PostClassFollowUpDraft {
  readonly sanitizedAliasKo: string;
  readonly privacyNoticeKo: string | null;
  readonly todayFocusSummaryKo: string;
  readonly highlightMovementsKo: readonly string[];
  readonly homeCareTipsKo: readonly [string, string];
  readonly nextClassPreviewKo: string;
  readonly kakaoCopyTextKo: string;
}

const HOME_CARE_TIPS_BY_PLANE: Readonly<Record<SpinalPlane, readonly [string, string]>> = {
  neutral: [
    '흉곽 호흡 3분: 무릎을 세우고 누워 코로 4초 마시며 옆갈비뼈를 넓히고, 입으로 6초 길게 내쉬며 복부 중심을 가볍게 모아 주세요.',
    '골반 시계 풀기: 허리를 바닥에 부드럽게 붙였다 떼는 작은 움직임을 8회 반복해 허리 주변 긴장을 풀어 주세요.',
  ],
  flexion: [
    '벽 등 펴기 1분: 벽에 뒤통수와 등을 가볍게 기대고 팔을 천천히 올렸다 내리며 굽었던 가슴 앞쪽을 열어 주세요.',
    '무릎 끌어안기 호흡: 누워서 양 무릎을 가슴 쪽으로 편하게 안고 5번 깊게 숨 쉬며 등과 골반을 이완해 주세요.',
  ],
  extension: [
    '아기 자세(Rest Position) 90초: 무릎을 벌리고 상체를 앞으로 숙여 이마를 매트에 대고 등 뒤쪽을 길게 늘려 주세요.',
    '고양이 등 말기 6회: 네발기기 자세에서 내쉬는 숨마다 배꼽을 부드럽게 당겨 허리와 등 라인을 편안하게 정리해 주세요.',
  ],
  lateral: [
    '앉아서 옆구리 늘리기: 한 손을 바닥에 짚고 반대 팔을 귀 옆으로 길게 뻗어 좌우 30초씩 갈비뼈 사이 호흡을 느껴 주세요.',
    '흉곽 횡격막 호흡: 양손을 옆갈비뼈에 얹고 마시는 숨에 손바닥이 양옆으로 밀리는 감각을 6회 천천히 확인해 주세요.',
  ],
  rotation: [
    '누워서 무릎 좌우 넘기기: 양팔을 옆으로 펼치고 두 무릎을 천천히 좌우로 기울여 허리와 흉추를 가볍게 풀어 주세요.',
    '오픈북 스트레칭: 옆으로 누워 위쪽 팔을 천천히 열어 시선과 함께 흉추 회전을 좌우 5회씩 가볍게 이어가 주세요.',
  ],
};

function getApparatusDisplayKo(apparatus: ApparatusType | 'mixed'): string {
  return apparatus === 'mixed' ? '복합 기구' : APPARATUS_LABELS[apparatus].ko;
}

export function generatePostClassFollowUpDraft(
  input: PostClassFollowUpInput,
): PostClassFollowUpDraft {
  const {
    memberAliasKo,
    classTitleKo,
    apparatus,
    steps,
    exercises,
    nextClassHintKo,
    tone = 'warm',
  } = input;

  const aliasResult = sanitizeMemberAliasKo(memberAliasKo);
  const exerciseMap = new Map(exercises.map((ex) => [ex.id, ex]));

  const resolvedExercises: PilatesExercise[] = [];
  const blockCounts = new Map<ClassBlockCategory, number>();
  const planeCounts = new Map<SpinalPlane, number>();
  const muscleCounts = new Map<string, number>();

  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exerciseMap.get(step.exerciseId);
    if (!ex) continue;
    resolvedExercises.push(ex);
    blockCounts.set(step.blockCategory, (blockCounts.get(step.blockCategory) ?? 0) + 1);
    for (const plane of ex.spinalPlanes) {
      planeCounts.set(plane, (planeCounts.get(plane) ?? 0) + 1);
    }
    for (const muscle of ex.targetMuscles) {
      muscleCounts.set(muscle, (muscleCounts.get(muscle) ?? 0) + 1);
    }
  }

  const topMuscles = [...muscleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const dominantPlane: SpinalPlane =
    [...planeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';

  const highlightMovementsKo = resolvedExercises
    .filter((ex) => ex.blockCategory !== 'warmup' && ex.blockCategory !== 'cooldown')
    .slice(0, 3)
    .map((ex) => ex.nameKo);

  const fallbackHighlights =
    highlightMovementsKo.length > 0
      ? highlightMovementsKo
      : resolvedExercises.slice(0, 2).map((ex) => ex.nameKo);

  const apparatusKo = getApparatusDisplayKo(apparatus);
  const totalMinutes = steps.reduce((sum, step) => sum + step.durationMin, 0) || 50;

  const todayFocusSummaryKo =
    topMuscles.length > 0
      ? `오늘은 ${apparatusKo} 중심으로 ${topMuscles.join('·')} 연결과 호흡 리듬을 집중해서 움직였어요 (${totalMinutes}분).`
      : `오늘은 ${apparatusKo} 기본 정렬과 호흡 리듬을 차근차근 익히는 시간으로 진행했어요 (${totalMinutes}분).`;

  const homeCareTipsKo = HOME_CARE_TIPS_BY_PLANE[dominantPlane];

  const cleanNextHint = (nextClassHintKo ?? '').replace(MEDICAL_CLAIM_WORDS, '').trim();
  const nextClassPreviewKo = cleanNextHint
    ? cleanNextHint
    : dominantPlane === 'extension'
      ? '다음 수업에서는 복부 중심 조절과 부드러운 옆구리·회전 움직임을 균형 있게 이어갈 예정이에요.'
      : '다음 수업에서는 오늘 익힌 호흡과 정렬 감각을 바탕으로 한 단계 더 매끄러운 전신 연결을 준비할게요.';

  const greetingAlias = aliasResult.aliasKo.endsWith('님')
    ? aliasResult.aliasKo
    : `${aliasResult.aliasKo}님`;

  const movementLine =
    fallbackHighlights.length > 0
      ? `• 오늘 핵심 동작: ${fallbackHighlights.join(', ')}`
      : `• 진행 수업: ${classTitleKo || `${apparatusKo} 밸런스 수업`}`;

  const kakaoCopyTextKo =
    tone === 'concise'
      ? [
          `${greetingAlias}, 오늘 수업 수고 많으셨어요!`,
          '',
          `[오늘 수업 요약]`,
          `• ${todayFocusSummaryKo}`,
          movementLine,
          '',
          `[집에서 3분 스트레칭 · 호흡 팁]`,
          `1) ${homeCareTipsKo[0]}`,
          `2) ${homeCareTipsKo[1]}`,
          '',
          `[다음 수업 예고]`,
          `• ${nextClassPreviewKo}`,
          '',
          '물 충분히 드시고 편안한 하루 보내세요 :)',
        ].join('\n')
      : [
          `안녕하세요 ${greetingAlias} :) 오늘 '${classTitleKo || `${apparatusKo} 수업`}' 끝까지 집중해서 함께해 주셔서 감사해요.`,
          '',
          `🌿 오늘의 움직임 요약`,
          `• ${todayFocusSummaryKo}`,
          movementLine,
          '',
          `🏡 집에서 3분만 따라 해보는 호흡·스트레칭`,
          `1) ${homeCareTipsKo[0]}`,
          `2) ${homeCareTipsKo[1]}`,
          '',
          `✨ 다음 수업 예고`,
          `${nextClassPreviewKo}`,
          '',
          '수업 후에는 따뜻한 물 한 잔 챙겨 드시고, 움직임이 뻐근한 곳이 있으면 다음 시간에 편하게 말씀해 주세요 :)',
        ].join('\n');

  return {
    sanitizedAliasKo: aliasResult.aliasKo,
    privacyNoticeKo: aliasResult.noticeKo,
    todayFocusSummaryKo,
    highlightMovementsKo: fallbackHighlights,
    homeCareTipsKo,
    nextClassPreviewKo,
    kakaoCopyTextKo,
  };
}

export type StudioFaqTemplateId =
  | 'attire-socks'
  | 'parking-arrival'
  | 'cancel-reschedule'
  | 'first-class-prep'
  | 'post-class-recovery';

export interface StudioFaqQuickTemplate {
  readonly id: StudioFaqTemplateId;
  readonly categoryKo: string;
  readonly titleKo: string;
  readonly shortHintKo: string;
  readonly bodyKo: string;
}

export const STUDIO_FAQ_QUICK_TEMPLATES: readonly StudioFaqQuickTemplate[] = [
  {
    id: 'attire-socks',
    categoryKo: '준비물',
    titleKo: '복장 · 논슬립 양말 안내',
    shortHintKo: '운동복 · 토삭스 · 머리끈',
    bodyKo: [
      '안녕하세요 회원님 :) 편안하고 안전한 수업을 위해 복장 안내드려요.',
      '• 상·하의: 움직임과 정렬이 잘 보이는 신축성 좋은 운동복(지퍼·단추 장식이 없는 옷을 추천해요)',
      '• 양말: 기구 위 미끄럼 방지를 위해 논슬립(토삭스) 필라테스 양말을 꼭 착용해 주세요.',
      '• 기타: 긴 머리는 묶을 머리끈, 개인 물병(텀블러)을 챙겨 오시면 좋아요.',
    ].join('\n'),
  },
  {
    id: 'parking-arrival',
    categoryKo: '방문',
    titleKo: '주차 · 도착 시간 안내',
    shortHintKo: '10분 전 도착 · 주차 등록',
    bodyKo: [
      '안녕하세요 회원님 :) 스튜디오 방문 및 주차 안내드립니다.',
      '• 도착 시간: 환복과 기구 세팅을 위해 수업 시작 10분 전까지 여유 있게 도착해 주세요.',
      '• 주차 안내: 건물 지하 주차장 이용 가능하며, 수업 전후 데스크(또는 강사)에게 차량 번호 뒤 4자리를 알려주시면 무료 주차를 등록해 드려요.',
      '• 늦으실 경우 수업 흐름과 안전을 위해 시작 10분 이후에는 입장이 제한될 수 있는 점 양해 부탁드립니다.',
    ].join('\n'),
  },
  {
    id: 'cancel-reschedule',
    categoryKo: '규정',
    titleKo: '예약 변경 · 취소 규정 안내',
    shortHintKo: '24시간 전 변경 가능',
    bodyKo: [
      '안녕하세요 회원님 :) 원활한 수업 운영을 위한 예약 변경·취소 규정 안내드립니다.',
      '• 변경·취소 마감: 수업 시작 24시간 전까지 자유롭게 변경 또는 취소하실 수 있어요.',
      '• 당일 취소·노쇼: 마감 시간 이후 취소하시거나 불참하실 경우 대기 회원님 배정이 어려워 수강권 1회가 정상 차감됩니다.',
      '• 갑작스러운 일정 변동이 생기면 가능한 한 빨리 메시지 남겨주시면 안내 도와드릴게요 :)',
    ].join('\n'),
  },
  {
    id: 'first-class-prep',
    categoryKo: '첫 수업',
    titleKo: '첫 수업 준비 · 사전 체크',
    shortHintKo: '식사 시간 · 컨디션 공유',
    bodyKo: [
      '첫 필라테스 수업을 환영해요 회원님 :) 오시기 전 두 가지만 가볍게 참고해 주세요.',
      '• 식사: 호흡과 복부 움직임이 편안하도록 수업 1~2시간 전 가볍게 식사하시는 것을 권장해요.',
      '• 컨디션 공유: 평소 움직일 때 뻐근하거나 부담을 느끼는 부위(손목·목·무릎·허리 등)가 있으시면 시작 전 미리 알려주세요. 편안한 범위와 완화 동작으로 맞춰 안내해 드릴게요.',
      '편한 마음으로 오셔서 기분 좋게 움직여 봐요!',
    ].join('\n'),
  },
  {
    id: 'post-class-recovery',
    categoryKo: '회복 팁',
    titleKo: '수업 후 뻐근함 · 회복 가이드',
    shortHintKo: '수분 · 온수 샤워 · 호흡',
    bodyKo: [
      '오늘 수업 후 평소 안 쓰던 속근육이 뻐근하게 느껴지실 수 있어요 :)',
      '• 수분 보충: 따뜻한 물을 조금씩 자주 드시면 근육 피로 회복에 도움이 돼요.',
      '• 가벼운 이완: 잠들기 전 따뜻한 샤워 후 2~3분 정도 천천히 흉곽 호흡과 가벼운 스트레칭을 해보세요.',
      '• 만약 근육 피로감이 아니라 날카로운 불편감이 계속된다면 무리하지 마시고 전문가 상담을 받아보시길 권해드려요.',
    ].join('\n'),
  },
] as const;

export function renderFaqTemplateText(
  templateId: StudioFaqTemplateId,
  options?: {
    readonly studioNameKo?: string;
    readonly cancelHours?: number;
  },
): string {
  const found = STUDIO_FAQ_QUICK_TEMPLATES.find((item) => item.id === templateId);
  if (!found) return '';

  let text = found.bodyKo;
  if (options?.studioNameKo?.trim()) {
    const safeName = options.studioNameKo.trim().slice(0, 28);
    text = `[${safeName}]\n${text}`;
  }
  if (
    templateId === 'cancel-reschedule' &&
    typeof options?.cancelHours === 'number' &&
    Number.isFinite(options.cancelHours) &&
    options.cancelHours > 0
  ) {
    text = text.replace('24시간 전까지', `${Math.floor(options.cancelHours)}시간 전까지`);
  }
  return text;
}

export interface MonthlySpinalPlaneShare {
  readonly plane: SpinalPlane;
  readonly labelKo: string;
  readonly count: number;
  readonly sharePct: number;
}

export interface GoldenPatternEntry {
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly apparatusLabelKo: string;
  readonly blockLabelKo: string;
  readonly usedCount: number;
  readonly avgRating: number;
}

export interface MonthlyInstructorGrowthReport {
  readonly periodLabelKo: string;
  readonly totalSessions: number;
  readonly averageRating: number;
  readonly fiveStarSessionCount: number;
  readonly spinalPlaneShares: readonly MonthlySpinalPlaneShare[];
  readonly imbalanceAlertKo: string | null;
  readonly goldenPatterns: readonly GoldenPatternEntry[];
  readonly fiveStarHighlightsKo: readonly string[];
  readonly copyableSummaryKo: string;
}

export interface BuildMonthlyReportInput {
  readonly historyLogs: readonly ClassHistoryLog[];
  readonly exercises: readonly PilatesExercise[];
  /** Optional YYYY-MM filter. When omitted, analyzes all provided logs cleanly. */
  readonly targetMonth?: string;
}

const FOUR_PLANES_ORDER: readonly SpinalPlane[] = [
  'neutral',
  'flexion',
  'extension',
  'lateral',
  'rotation',
];

export function buildMonthlyInstructorGrowthReport(
  input: BuildMonthlyReportInput,
): MonthlyInstructorGrowthReport {
  const { historyLogs, exercises, targetMonth } = input;
  const exerciseMap = new Map(exercises.map((ex) => [ex.id, ex]));

  const filteredLogs = targetMonth
    ? historyLogs.filter((log) => log.taughtAt.slice(0, 7) === targetMonth)
    : [...historyLogs];

  const periodLabelKo = targetMonth
    ? `${targetMonth.slice(0, 4)}년 ${Number(targetMonth.slice(5, 7))}월 수업 리포트`
    : '최근 수업 밸런스 리포트';

  if (filteredLogs.length === 0) {
    return {
      periodLabelKo,
      totalSessions: 0,
      averageRating: 0,
      fiveStarSessionCount: 0,
      spinalPlaneShares: FOUR_PLANES_ORDER.map((plane) => ({
        plane,
        labelKo: SPINAL_PLANE_LABELS[plane].ko,
        count: 0,
        sharePct: 0,
      })),
      imbalanceAlertKo: null,
      goldenPatterns: [],
      fiveStarHighlightsKo: [
        '아직 기록된 수업이 없어요. 수업을 마치고 평점과 회고를 남기면 인기 패턴이 자동으로 쌓여요.',
      ],
      copyableSummaryKo: `[${periodLabelKo}]\n기록된 수업이 아직 없어요. 첫 수업을 완료하면 밸런스 요약이 자동으로 생성됩니다.`,
    };
  }

  const planeCounts: Record<SpinalPlane, number> = {
    neutral: 0,
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
  };

  const exerciseStats = new Map<
    string,
    { count: number; ratingSum: number; fiveStarCount: number }
  >();
  const fiveStarApparatus = new Map<ApparatusType | 'mixed', number>();
  const fiveStarIntensities = new Map<ClassHistoryLog['intensity'], number>();
  const fiveStarBlocks = new Map<ClassBlockCategory, number>();

  let ratingSum = 0;
  let fiveStarSessionCount = 0;
  let fiveStarMovementSum = 0;

  for (const log of filteredLogs) {
    ratingSum += log.rating;
    const isFiveStar = log.rating === 5;
    if (isFiveStar) {
      fiveStarSessionCount += 1;
      fiveStarApparatus.set(log.apparatus, (fiveStarApparatus.get(log.apparatus) ?? 0) + 1);
      fiveStarIntensities.set(log.intensity, (fiveStarIntensities.get(log.intensity) ?? 0) + 1);
      fiveStarMovementSum += log.exerciseIds.length;
    }

    const uniqueIdsInSession = [...new Set(log.exerciseIds)];
    for (const exId of uniqueIdsInSession) {
      const ex = exerciseMap.get(exId);
      const stat = exerciseStats.get(exId) ?? { count: 0, ratingSum: 0, fiveStarCount: 0 };
      stat.count += 1;
      stat.ratingSum += log.rating;
      if (isFiveStar) stat.fiveStarCount += 1;
      exerciseStats.set(exId, stat);

      if (ex) {
        for (const plane of ex.spinalPlanes) {
          planeCounts[plane] = (planeCounts[plane] ?? 0) + 1;
        }
        if (isFiveStar) {
          fiveStarBlocks.set(ex.blockCategory, (fiveStarBlocks.get(ex.blockCategory) ?? 0) + 1);
        }
      }
    }
  }

  const totalPlaneHits = FOUR_PLANES_ORDER.reduce((sum, plane) => sum + planeCounts[plane], 0);
  const spinalPlaneShares: MonthlySpinalPlaneShare[] = FOUR_PLANES_ORDER.map((plane) => ({
    plane,
    labelKo: SPINAL_PLANE_LABELS[plane].ko,
    count: planeCounts[plane],
    sharePct: totalPlaneHits > 0 ? Math.round((planeCounts[plane] / totalPlaneHits) * 100) : 0,
  }));

  // Check 4 dynamic spinal planes (flexion, extension, lateral, rotation) for under-representation
  const dynamicShares = spinalPlaneShares.filter((item) => item.plane !== 'neutral');
  const lowestDynamic = [...dynamicShares].sort((a, b) => a.sharePct - b.sharePct)[0];
  let imbalanceAlertKo: string | null = null;
  if (totalPlaneHits > 0 && lowestDynamic && lowestDynamic.sharePct < 12) {
    const tipByPlane: Record<Exclude<SpinalPlane, 'neutral'>, string> = {
      lateral: '마무리 블록에 머메이드나 사이드 밴드 1동작을 넣어 보시면 옆구리 흐름이 한결 풍성해져요.',
      rotation: '상체·쿨다운 구간에 스파인 트위스트나 오픈북을 1개 더하면 흉추 회전 밸런스가 좋아져요.',
      extension: '충분한 워밍업 뒤 흉추 신전(스완·풀링 스트랩) 1동작을 배치해 등 뒤쪽 밸런스를 맞춰 보세요.',
      flexion: '호흡 예열 직후 롤다운·헌드레드 계열 분절 동작을 넣으면 복부 연결감이 살아나요.',
    };
    const planeKey = lowestDynamic.plane as Exclude<SpinalPlane, 'neutral'>;
    imbalanceAlertKo = `척추 움직임 중 '${lowestDynamic.labelKo}' 비중이 ${lowestDynamic.sharePct}%로 가장 적었어요. ${tipByPlane[planeKey]}`;
  }

  const goldenPatterns: GoldenPatternEntry[] = [...exerciseStats.entries()]
    .map(([exerciseId, stat]) => {
      const ex = exerciseMap.get(exerciseId);
      if (!ex) return null;
      const blockLabelKo =
        CANONICAL_BLOCKS.find((b) => b.category === ex.blockCategory)?.nameKo ?? ex.blockCategory;
      return {
        exerciseId,
        nameKo: ex.nameKo,
        apparatusLabelKo: APPARATUS_LABELS[ex.apparatus].short,
        blockLabelKo,
        usedCount: stat.count,
        avgRating: Number((stat.ratingSum / stat.count).toFixed(1)),
      };
    })
    .filter((entry): entry is GoldenPatternEntry => entry !== null)
    .sort((a, b) => b.usedCount - a.usedCount || b.avgRating - a.avgRating)
    .slice(0, 4);

  const intensityLabels: Record<ClassHistoryLog['intensity'], string> = {
    relaxed: '편안한 회복 페이스',
    moderate: '안정적인 중강도 흐름',
    intense: '탄탄한 고강도 자극',
  };

  const fiveStarHighlightsKo: string[] = [];
  if (fiveStarSessionCount > 0) {
    const topApparatus = [...fiveStarApparatus.entries()].sort((a, b) => b[1] - a[1])[0];
    const topIntensity = [...fiveStarIntensities.entries()].sort((a, b) => b[1] - a[1])[0];
    const topBlock = [...fiveStarBlocks.entries()].sort((a, b) => b[1] - a[1])[0];
    const avgMovements = Math.round(fiveStarMovementSum / fiveStarSessionCount);

    if (topApparatus) {
      fiveStarHighlightsKo.push(
        `평점 5점 수업 ${fiveStarSessionCount}건 중 '${getApparatusDisplayKo(topApparatus[0])}' 구성이 가장 반응이 좋았어요 (${topApparatus[1]}회).`,
      );
    }
    if (topIntensity) {
      fiveStarHighlightsKo.push(
        `평균 ${avgMovements}개 동작 · '${intensityLabels[topIntensity[0]]}' 리듬일 때 만족도가 높았어요.`,
      );
    }
    if (topBlock) {
      const blockName =
        CANONICAL_BLOCKS.find((b) => b.category === topBlock[0])?.nameKo ?? topBlock[0];
      fiveStarHighlightsKo.push(
        `회원 반응이 좋았던 핵심 구간은 '${blockName}' 블록이었어요.`,
      );
    }
  } else {
    fiveStarHighlightsKo.push(
      '아직 평점 5점 기록이 없어요. 만족도가 높았던 수업을 별점 5점으로 표시하면 황금 공식이 정리돼요.',
    );
  }

  const averageRating = Number((ratingSum / filteredLogs.length).toFixed(1));
  const copyableSummaryKo = [
    `[${periodLabelKo}]`,
    `• 진행 수업: ${filteredLogs.length}회 · 평균 평점 ${averageRating}점 (5점 ${fiveStarSessionCount}회)`,
    `• 척추 움직임 비중: ${spinalPlaneShares.map((s) => `${s.labelKo.split(' ')[0]} ${s.sharePct}%`).join(' / ')}`,
    imbalanceAlertKo ? `• 밸런스 팁: ${imbalanceAlertKo}` : '• 밸런스 팁: 4방향 척추 움직임이 고르게 들어갔어요.',
    goldenPatterns.length > 0
      ? `• 자주 쓴 황금 패턴: ${goldenPatterns.slice(0, 3).map((g) => `${g.nameKo}(${g.usedCount}회)`).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    periodLabelKo,
    totalSessions: filteredLogs.length,
    averageRating,
    fiveStarSessionCount,
    spinalPlaneShares,
    imbalanceAlertKo,
    goldenPatterns,
    fiveStarHighlightsKo,
    copyableSummaryKo,
  };
}

export interface SubInstructorHandoffInput {
  readonly classTitleKo: string;
  readonly roomNameKo: string;
  readonly slotLabelKo: string;
  readonly headcount: number;
  readonly apparatus: ApparatusType | 'mixed';
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly conflictReport?: TimeSlotResourceConflictReport;
  readonly specialNoteKo?: string;
}

export interface SubInstructorHandoffBrief {
  readonly headlineKo: string;
  readonly checklistKo: readonly string[];
  readonly copyTextKo: string;
}

/**
 * Generates a 3-minute substitute-instructor handoff brief (center-manager mode).
 * Strips any personal/medical info automatically so only safe operational cues are shared.
 */
export function buildSubInstructorHandoffBrief(
  input: SubInstructorHandoffInput,
): SubInstructorHandoffBrief {
  const {
    classTitleKo,
    roomNameKo,
    slotLabelKo,
    headcount,
    apparatus,
    steps,
    exercises,
    conflictReport,
    specialNoteKo,
  } = input;

  const exerciseMap = new Map(exercises.map((ex) => [ex.id, ex]));
  const activeSteps = steps.filter((step) => !isRestStep(step));
  const firstStep = activeSteps[0];
  const firstExercise = firstStep ? exerciseMap.get(firstStep.exerciseId) : undefined;
  const openingSpring = firstStep?.customSpringOverride ?? firstExercise?.springs ?? '1R 1B';

  const propSet = new Set<string>();
  for (const step of activeSteps) {
    const ex = exerciseMap.get(step.exerciseId);
    for (const resourceId of extractStepRequiredResources(step, ex)) {
      propSet.add(`${getStudioResourceLabelKo(resourceId)} ${headcount}개`);
    }
  }
  const propSummary = propSet.size > 0 ? [...propSet].join(', ') : '별도 소도구 없음 (기구·맨몸 진행)';

  const flowPreview = activeSteps
    .slice(0, 5)
    .map((step, idx) => {
      const ex = exerciseMap.get(step.exerciseId);
      const spring = step.customSpringOverride ?? ex?.springs ?? '';
      return `${idx + 1}) ${ex?.nameKo ?? step.exerciseId} (${step.durationMin}분${spring ? ` · ${spring}` : ''})`;
    });

  const safeNoteCheck = specialNoteKo ? inspectSensitiveHealthText(specialNoteKo) : null;
  const cleanNote =
    safeNoteCheck && safeNoteCheck.hasSensitiveData
      ? safeNoteCheck.sanitizedText
      : (specialNoteKo ?? '').replace(MEDICAL_CLAIM_WORDS, '').trim();

  const checklistKo: string[] = [
    `첫 세팅: ${roomNameKo} (${getApparatusDisplayKo(apparatus)} ${headcount}명) · 시작 스프링 ${openingSpring}`,
    `준비 교보재: ${propSummary}`,
    conflictReport?.hasAnyConflict
      ? `동시간대 주의: ${conflictReport.summaryHeadlineKo}`
      : '동시간대 교보재 충돌 없음 (바로 세팅 가능)',
  ];
  if (cleanNote) {
    checklistKo.push(`현장 참고: ${cleanNote}`);
  }

  const headlineKo = `${slotLabelKo} · ${roomNameKo} (${headcount}명) 3분 대강 인수인계`;
  const copyTextKo = [
    `[대강 3분 인수인계 · ${classTitleKo || `${getApparatusDisplayKo(apparatus)} 수업`}]`,
    `• 시간/룸: ${slotLabelKo} · ${roomNameKo} (정원 ${headcount}명)`,
    `• 시작 세팅: ${openingSpring} / 준비 교보재: ${propSummary}`,
    conflictReport?.hasAnyConflict
      ? `• 교보재 안내: ${conflictReport.summaryHeadlineKo}`
      : '• 교보재 안내: 동시간대 겹침 없이 여유 있게 세팅 가능합니다.',
    '',
    '[핵심 흐름 미리보기]',
    ...(flowPreview.length > 0 ? flowPreview : ['• 기본 워밍업 → 풋워크 → 코어 → 마무리 스트레칭']),
    activeSteps.length > 5 ? `... 외 ${activeSteps.length - 5}개 동작` : '',
    cleanNote ? `\n[현장 메모]\n• ${cleanNote}` : '',
    '\n대강 맡아주셔서 감사해요! 편안한 수업 진행 되시길 바랍니다 :)',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    headlineKo,
    checklistKo,
    copyTextKo,
  };
}
