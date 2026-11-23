import {
  APPARATUS_LABELS,
  POSITION_LABELS,
  PROP_LABELS,
} from '../data/pilatesCatalog';
import type {
  ApparatusType,
  BoxState,
  ClassBlockCategory,
  FootbarState,
  LayerMode,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { isRestStep } from './sequenceEngine';
import { inspectSensitiveHealthText } from './sensitiveHealthPrivacy';
import { isUnknownSpringSetup, resolveStepSetup } from './transitionSummary';

export type LessonFormatMode = 'private-1on1' | 'group-class';

export type ComfortGuardArea = 'wrist' | 'neck' | 'knee' | 'lower-back';

export type ExerciseLookupSource =
  | ReadonlyMap<string, PilatesExercise>
  | Record<string, PilatesExercise>
  | readonly PilatesExercise[];

export interface PrivateMemberProfile {
  /** 비식별 별칭만 사용 (예: '회원 A · 금요 2시 개인') */
  readonly alias: string;
  /** 오늘 수업의 운동 포커스 (예: '코어 안정과 편안한 어깨 움직임') */
  readonly focusGoal: string;
  /** 원탭 불편 부위 배려 선택 */
  readonly comfortGuards: readonly ComfortGuardArea[];
  /** 비식별·비의료 코칭 참고 메모 */
  readonly recentNotes?: string;
}

export interface ComfortGuardMeta {
  readonly id: ComfortGuardArea;
  readonly chipLabelKo: string;
  readonly shortKo: string;
  readonly comfortTipKo: string;
}

export const COMFORT_GUARD_ORDER: readonly ComfortGuardArea[] = [
  'wrist',
  'neck',
  'knee',
  'lower-back',
];

export const COMFORT_GUARD_META: Readonly<Record<ComfortGuardArea, ComfortGuardMeta>> = {
  wrist: {
    id: 'wrist',
    chipLabelKo: '손목 편하게',
    shortKo: '손목 배려',
    comfortTipKo:
      '손목 꺾임을 줄이기 위해 팔꿈치(전완) 지지나 패드·웨지를 활용하고, 중립 손목으로 편안하게 움직여 보세요.',
  },
  neck: {
    id: 'neck',
    chipLabelKo: '목 부담 ↓',
    shortKo: '목 배려',
    comfortTipKo:
      '머리를 헤드레스트나 작은 볼에 편하게 기대어 진행하고, 시선을 부드럽게 낮춰 목 앞쪽 긴장을 덜어 주세요.',
  },
  knee: {
    id: 'knee',
    chipLabelKo: '무릎 편하게',
    shortKo: '무릎 배려',
    comfortTipKo:
      '무릎 아래 도톰한 패드를 받치거나 굽힘 각도를 얕게 조절해 편안한 범위에서 움직여 보세요.',
  },
  'lower-back': {
    id: 'lower-back',
    chipLabelKo: '허리 지지',
    shortKo: '허리 배려',
    comfortTipKo:
      '허리가 과하게 꺾이지 않는 중립 범위로 가동 범위를 줄이고, 내쉬는 숨에 복부 중심으로 부드럽게 지지해 주세요.',
  },
};

export const SAFE_MEMBER_ALIAS_PRESETS: readonly string[] = [
  '회원 A · 금요 2시 개인',
  '회원 B · 오전 개인',
  '체험 회원 · 첫 1:1',
];

export const DEFAULT_PRIVATE_PROFILE: PrivateMemberProfile = {
  alias: '회원 A · 금요 2시 개인',
  focusGoal: '코어 안정과 편안한 호흡 리듬',
  comfortGuards: [],
  recentNotes: '',
};

const BARE_KOREAN_NAME_PATTERN =
  /^[김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용][가-힣]{1,2}$/;

const NON_IDENTIFYING_ALIAS_HINTS =
  /회원|체험|개인|오전|오후|저녁|월|화|수|목|금|토|일|시|반|그룹|초보|입문|A|B|C|D|\d/;

const PHONE_OR_CONTACT_PATTERN =
  /(?:\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b)|(?:\b\d{6}[-.\s]?[1-4]\d{6}\b)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)/gi;

const MEDICAL_CLAIM_TERMS_PATTERN =
  /의학적\s*진단|진단명|치료\s*효과|완치|처방전|교정\s*보장|병원\s*치료|재활\s*치료/gi;

export interface SanitizedPrivateProfileResult {
  readonly profile: PrivateMemberProfile;
  readonly hadSensitiveInput: boolean;
  readonly matchedCategories: readonly string[];
  readonly noticeKo: string | null;
}

function resolveExerciseMap(source: ExerciseLookupSource): ReadonlyMap<string, PilatesExercise> {
  if (source instanceof Map) {
    return source;
  }
  if (Array.isArray(source)) {
    const map = new Map<string, PilatesExercise>();
    for (const item of source) {
      map.set(item.id, item);
    }
    return map;
  }
  const map = new Map<string, PilatesExercise>();
  for (const [key, value] of Object.entries(source as Record<string, PilatesExercise>)) {
    if (value) {
      map.set(key, value);
    }
  }
  return map;
}

function sanitizeCoachingText(
  raw: string | undefined,
  maxLength: number,
  categoriesOut: Set<string>,
): { value: string; flagged: boolean } {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) {
    return { value: '', flagged: false };
  }

  let working = trimmed;
  let flagged = false;

  if (PHONE_OR_CONTACT_PATTERN.test(working)) {
    flagged = true;
    categoriesOut.add('연락처·식별정보');
    working = working.replace(PHONE_OR_CONTACT_PATTERN, '').trim();
  }
  PHONE_OR_CONTACT_PATTERN.lastIndex = 0;

  if (MEDICAL_CLAIM_TERMS_PATTERN.test(working)) {
    flagged = true;
    categoriesOut.add('의료·진단 표현');
    working = working.replace(MEDICAL_CLAIM_TERMS_PATTERN, '운동 참고').trim();
  }
  MEDICAL_CLAIM_TERMS_PATTERN.lastIndex = 0;

  const inspection = inspectSensitiveHealthText(working);
  if (inspection.hasSensitiveData) {
    flagged = true;
    for (const cat of inspection.matchedCategories) {
      categoriesOut.add(cat);
    }
    working = inspection.sanitizedText.replace(/\[민감정보 제외\]/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  return {
    value: working.slice(0, maxLength).trim(),
    flagged,
  };
}

/**
 * Strips real names, phone numbers, emails, and sensitive medical text
 * so only non-identifying coaching aliases and movement goals remain.
 */
export function sanitizePrivateMemberProfile(
  input: Partial<PrivateMemberProfile> | null | undefined,
): SanitizedPrivateProfileResult {
  const categories = new Set<string>();
  let hadSensitiveInput = false;

  const rawAlias = (input?.alias ?? '').trim();
  let safeAlias = DEFAULT_PRIVATE_PROFILE.alias;

  if (rawAlias) {
    const bareNameMatch =
      BARE_KOREAN_NAME_PATTERN.test(rawAlias) && !NON_IDENTIFYING_ALIAS_HINTS.test(rawAlias);
    if (bareNameMatch) {
      hadSensitiveInput = true;
      categories.add('개인 실명');
      safeAlias = DEFAULT_PRIVATE_PROFILE.alias;
    } else {
      const cleaned = sanitizeCoachingText(rawAlias, 36, categories);
      if (cleaned.flagged) {
        hadSensitiveInput = true;
      }
      safeAlias = cleaned.value || DEFAULT_PRIVATE_PROFILE.alias;
    }
  }

  const cleanedGoal = sanitizeCoachingText(input?.focusGoal, 64, categories);
  if (cleanedGoal.flagged) hadSensitiveInput = true;

  const cleanedNotes = sanitizeCoachingText(input?.recentNotes, 140, categories);
  if (cleanedNotes.flagged) hadSensitiveInput = true;

  const validGuards = Array.from(
    new Set(
      (input?.comfortGuards ?? []).filter((g): g is ComfortGuardArea =>
        COMFORT_GUARD_ORDER.includes(g),
      ),
    ),
  );

  return {
    profile: {
      alias: safeAlias,
      focusGoal: cleanedGoal.value || DEFAULT_PRIVATE_PROFILE.focusGoal,
      comfortGuards: validGuards,
      recentNotes: cleanedNotes.value,
    },
    hadSensitiveInput,
    matchedCategories: Array.from(categories),
    noticeKo: hadSensitiveInput
      ? '실명·연락처·민감 건강정보는 저장하거나 공유하지 않아요. 비식별 별칭과 운동 표현으로 정리해 두었어요.'
      : null,
  };
}

const GUARD_PATTERNS: Readonly<Record<ComfortGuardArea, RegExp>> = {
  wrist:
    /손목|wrist|플랭크|plank|push[\s-]?up|푸시업|푸쉬업|네발|quadruped|long\s*stretch|롱\s*스트레치|elephant|엘리펀트|knee\s*stretch|니\s*스트레치|up\s*stretch|업\s*스트레치|side\s*plank|사이드\s*플랭크|control\s*front|컨트롤\s*프론트/i,
  neck:
    /hundred|헌드레드|chest\s*lift|체스트\s*리프트|ab\s*prep|컬\s*업|curl\s*up|roll[\s-]?up|롤\s*업|roll[\s-]?over|롤\s*오버|teaser|티저|short\s*spine|숏\s*스파인|jackknife|잭나이프|criss[\s-]?cross|크리스\s*크로스|overhead|오버헤드|corkscrew|코르크스크류|neck\s*pull|넥\s*풀/i,
  knee:
    /lunge|런지|scooter|스쿠터|squat|스쿼트|step[\s-]?up|스텝\s*업|split|스플릿|thigh\s*stretch|싸이\s*스트레치|camel|카멜|kneeling|닐링|knee\s*stretch|니\s*스트레치/i,
  'lower-back':
    /swan|스완|teaser|티저|double\s*leg|더블\s*레그|short\s*box|숏\s*박스|back\s*extension|백\s*익스텐션|swimming|스위밍|rocking|로킹|grasshopper|그래스호퍼|bridg|브릿지|브리지/i,
};

export function detectComfortGuardsForExercise(
  exercise: PilatesExercise,
  selectedGuards: readonly ComfortGuardArea[],
): ComfortGuardArea[] {
  if (selectedGuards.length === 0) return [];
  // Match against movement identity (names) and biomechanical structure,
  // avoiding false positives from generic relaxation cues (e.g., "목에 힘 빼기", "무릎 사이 미니볼").
  const titleText = `${exercise.nameKo} ${exercise.nameEn}`;

  const matched: ComfortGuardArea[] = [];

  for (const guard of selectedGuards) {
    if (guard === 'wrist') {
      if (
        exercise.bodyPosition === 'quadruped' ||
        exercise.blockCategory === 'plank' ||
        GUARD_PATTERNS.wrist.test(titleText)
      ) {
        matched.push('wrist');
      }
      continue;
    }

    if (guard === 'neck') {
      if (
        GUARD_PATTERNS.neck.test(titleText) ||
        (exercise.bodyPosition === 'supine' &&
          exercise.blockCategory === 'core' &&
          exercise.spinalPlanes.includes('flexion'))
      ) {
        matched.push('neck');
      }
      continue;
    }

    if (guard === 'knee') {
      if (
        exercise.bodyPosition === 'kneeling' ||
        exercise.bodyPosition === 'quadruped' ||
        GUARD_PATTERNS.knee.test(titleText)
      ) {
        matched.push('knee');
      }
      continue;
    }

    if (guard === 'lower-back') {
      if (
        exercise.bodyPosition === 'prone' ||
        exercise.blockCategory === 'extension' ||
        exercise.spinalPlanes.includes('extension') ||
        GUARD_PATTERNS['lower-back'].test(titleText)
      ) {
        matched.push('lower-back');
      }
    }
  }

  return matched;
}

export interface PrivateStepAlternative {
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly apparatusLabelKo: string;
  readonly reasonKo: string;
}

export interface PrivateStepAdaptation {
  readonly stepId: string;
  readonly order: number;
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly currentLayer: LayerMode;
  readonly recommendedLayer: LayerMode;
  readonly matchedGuards: readonly ComfortGuardArea[];
  readonly status: 'comfortable' | 'adapt-tip' | 'swap-suggested';
  readonly comfortTipKo: string;
  readonly suggestedAlternative?: PrivateStepAlternative;
}

export interface PrivateLessonPlanAdaptation {
  readonly sanitizedProfile: PrivateMemberProfile;
  readonly privacyNoticeKo: string | null;
  readonly stepAdaptations: readonly PrivateStepAdaptation[];
  readonly adaptedCount: number;
  readonly comfortableCount: number;
  readonly summaryKo: string;
}

function findGentlerAlternative(
  exercise: PilatesExercise,
  selectedGuards: readonly ComfortGuardArea[],
  usedExerciseIds: ReadonlySet<string>,
  allExercises: readonly PilatesExercise[],
): PrivateStepAlternative | undefined {
  if (allExercises.length === 0 || selectedGuards.length === 0) return undefined;

  const candidates = allExercises.filter((cand) => {
    if (cand.id === exercise.id || usedExerciseIds.has(cand.id)) return false;
    if (detectComfortGuardsForExercise(cand, selectedGuards).length > 0) return false;
    return cand.apparatus === exercise.apparatus || cand.apparatus === 'mat';
  });

  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const score = (c: PilatesExercise) =>
      (c.apparatus === exercise.apparatus ? 4 : 0) +
      (c.blockCategory === exercise.blockCategory ? 3 : 0) +
      (c.level === '1.0' ? 2 : c.level === '1.5' ? 1 : 0);
    return score(b) - score(a);
  });

  const best = candidates[0]!;
  const guardText = selectedGuards.map((g) => COMFORT_GUARD_META[g].shortKo).join('·');
  return {
    exerciseId: best.id,
    nameKo: best.nameKo,
    apparatusLabelKo: APPARATUS_LABELS[best.apparatus].short,
    reasonKo: `${guardText} 부담을 덜어주는 편안한 대체 움직임`,
  };
}

/**
 * Evaluates a sequence against a non-identifying 1:1 private lesson profile,
 * generating per-step comfort tips, gentle layer advice, and optional calmer alternatives.
 */
export function adaptSequenceForPrivateProfile(
  steps: readonly SequenceStep[],
  exercises: ExerciseLookupSource,
  rawProfile: Partial<PrivateMemberProfile>,
  alternativePool?: readonly PilatesExercise[],
): PrivateLessonPlanAdaptation {
  const sanitized = sanitizePrivateMemberProfile(rawProfile);
  const { profile } = sanitized;
  const exerciseMap = resolveExerciseMap(exercises);
  const pool = alternativePool ?? Array.from(exerciseMap.values());
  const usedIds = new Set(
    steps.filter((s) => !isRestStep(s)).map((s) => s.exerciseId),
  );

  const stepAdaptations: PrivateStepAdaptation[] = [];
  let exerciseOrder = 0;

  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exerciseMap.get(step.exerciseId);
    if (!ex) continue;
    exerciseOrder += 1;

    const matchedGuards = detectComfortGuardsForExercise(ex, profile.comfortGuards);
    const currentLayer = step.selectedLayer ?? 'standard';

    if (matchedGuards.length === 0) {
      stepAdaptations.push({
        stepId: step.stepId,
        order: exerciseOrder,
        exerciseId: ex.id,
        exerciseNameKo: ex.nameKo,
        currentLayer,
        recommendedLayer: currentLayer,
        matchedGuards: [],
        status: 'comfortable',
        comfortTipKo: '선택한 배려 부위에 큰 부담 없이 편안하게 진행하기 좋은 동작이에요.',
      });
      continue;
    }

    const combinedTips = matchedGuards
      .map((g) => COMFORT_GUARD_META[g].comfortTipKo)
      .slice(0, 2)
      .join(' ');
    const easyCue = ex.layers.easy?.trim();
    const comfortTipKo = easyCue
      ? `${combinedTips} (완화 팁: ${easyCue})`
      : combinedTips;

    const suggestedAlternative = findGentlerAlternative(
      ex,
      profile.comfortGuards,
      usedIds,
      pool,
    );
    const shouldSuggestSwap =
      Boolean(suggestedAlternative) && (matchedGuards.length >= 2 || ex.level === '2.0');

    stepAdaptations.push({
      stepId: step.stepId,
      order: exerciseOrder,
      exerciseId: ex.id,
      exerciseNameKo: ex.nameKo,
      currentLayer,
      recommendedLayer: 'easy',
      matchedGuards,
      status: shouldSuggestSwap ? 'swap-suggested' : 'adapt-tip',
      comfortTipKo,
      ...(suggestedAlternative ? { suggestedAlternative } : {}),
    });
  }

  const adaptedCount = stepAdaptations.filter((item) => item.matchedGuards.length > 0).length;
  const comfortableCount = stepAdaptations.length - adaptedCount;

  let summaryKo: string;
  if (stepAdaptations.length === 0) {
    summaryKo = '시퀀스에 동작을 추가하면 1:1 배려 팁을 바로 정리해 드려요.';
  } else if (profile.comfortGuards.length === 0) {
    summaryKo = `총 ${stepAdaptations.length}개 동작 구성 · 불편한 부위 칩을 누르면 편안한 조절 팁을 바로 보여드려요.`;
  } else if (adaptedCount === 0) {
    const guardLabels = profile.comfortGuards
      .map((g) => COMFORT_GUARD_META[g].chipLabelKo)
      .join(', ');
    summaryKo = `${guardLabels} 기준 · 현재 ${stepAdaptations.length}개 동작 모두 편안하게 진행할 수 있어요.`;
  } else {
    summaryKo = `총 ${stepAdaptations.length}개 중 ${adaptedCount}개 동작에 완화 조절 팁이 있어요.`;
  }

  return {
    sanitizedProfile: profile,
    privacyNoticeKo: sanitized.noticeKo,
    stepAdaptations,
    adaptedCount,
    comfortableCount,
    summaryKo,
  };
}

/**
 * Applies 'easy' layer to unlocked exercise steps that matched comfort guards.
 * Never mutates locked steps or rest steps.
 */
export function applyPrivateAdaptationsToSteps(
  steps: readonly SequenceStep[],
  adaptation: PrivateLessonPlanAdaptation,
): SequenceStep[] {
  const recommendedByStepId = new Map<string, LayerMode>();
  for (const item of adaptation.stepAdaptations) {
    if (item.matchedGuards.length > 0) {
      recommendedByStepId.set(item.stepId, item.recommendedLayer);
    }
  }

  return steps.map((step) => {
    if (isRestStep(step) || step.locked) return step;
    const nextLayer = recommendedByStepId.get(step.stepId);
    if (!nextLayer || nextLayer === step.selectedLayer) return step;
    return { ...step, selectedLayer: nextLayer };
  });
}

/* ==========================================================================
   Post-Class Instructor-Member Recap Card (1:1 Private Communication)
   ========================================================================== */

export type DynamicSpinalPlane = Exclude<SpinalPlane, 'neutral'>;

export interface SpinalPlaneBalanceItem {
  readonly plane: DynamicSpinalPlane;
  readonly shortLabelKo: string;
  readonly fullLabelKo: string;
  readonly count: number;
  readonly ratioPercent: number;
  readonly covered: boolean;
}

export interface MemberRecapHighlightMove {
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly apparatusLabelKo: string;
  readonly praiseNoteKo: string;
}

export interface MemberRecapHomeTip {
  readonly titleKo: string;
  readonly durationKo: string;
  readonly cueKo: string;
}

export interface MemberRecapCardData {
  readonly memberAlias: string;
  readonly sessionDateLabelKo: string;
  readonly sequenceTitleKo: string;
  readonly totalMinutes: number;
  readonly primaryApparatusLabelKo: string;
  readonly todayFocusKo: string;
  readonly comfortSummaryKo: string | null;
  readonly spinalBalance: readonly SpinalPlaneBalanceItem[];
  readonly coveredPlaneCount: number;
  readonly spinalBalanceNoteKo: string;
  readonly highlightMoves: readonly MemberRecapHighlightMove[];
  readonly homeCareTips: readonly MemberRecapHomeTip[];
  readonly closingNoteKo: string;
  readonly coachingDisclaimerKo: string;
  readonly kakaoShareText: string;
}

const FOUR_SPINAL_PLANES: ReadonlyArray<{
  readonly plane: DynamicSpinalPlane;
  readonly shortLabelKo: string;
  readonly fullLabelKo: string;
}> = [
  { plane: 'flexion', shortLabelKo: '굴곡', fullLabelKo: '굴곡 (앞으로 말기)' },
  { plane: 'extension', shortLabelKo: '신전', fullLabelKo: '신전 (가슴 열기)' },
  { plane: 'lateral', shortLabelKo: '측굴', fullLabelKo: '측굴 (옆선 늘리기)' },
  { plane: 'rotation', shortLabelKo: '회전', fullLabelKo: '회전 (몸통 비틀기)' },
];

const BLOCK_PRAISE_KO: Readonly<Record<ClassBlockCategory, string>> = {
  warmup: '호흡 리듬을 차분히 맞추며 몸의 긴장을 부드럽게 풀어내셨어요.',
  footwork: '발끝부터 고관절까지 정렬을 흔들림 없이 유지하며 리듬을 잘 맞추셨어요.',
  bridging: '척추를 하나씩 부드럽게 움직이며 뒤쪽 라인 연결 감각이 좋았어요.',
  core: '내쉬는 호흡과 함께 몸통 중심을 안정적으로 잘 잡아주셨어요.',
  'upper-body': '어깨 힘을 편안히 내려두고 등과 팔의 협응 흐름을 깔끔하게 이어가셨어요.',
  'lower-body': '지지 발과 골반 수평을 침착하게 유지하며 균형 있게 움직이셨어요.',
  plank: '머리부터 발끝까지 길어지는 감각을 유지하며 중심을 잘 지켜내셨어요.',
  extension: '가슴 앞쪽을 시원하게 열며 편안한 신전 움직임을 만들어내셨어요.',
  'feet-in-straps': '고관절 긴장을 내려두고 다리 움직임을 여유롭게 조절하셨어요.',
  cooldown: '깊은 흉곽 호흡과 함께 마무리를 편안하게 정리하셨어요.',
};

interface HomeCareTipTemplate extends MemberRecapHomeTip {
  readonly id: string;
  readonly themes: readonly ('core' | 'lower' | 'upper' | 'spine' | 'calm')[];
  readonly avoidGuards: readonly ComfortGuardArea[];
}

const HOME_CARE_TIP_LIBRARY: readonly HomeCareTipTemplate[] = [
  {
    id: 'supine-3d-breath',
    titleKo: '누워서 3D 갈비뼈 호흡 정리',
    durationKo: '1분 30초 · 6호흡',
    cueKo: '코로 마실 때 옆구리와 등 쪽 갈비뼈를 부드럽게 넓히고, 입으로 길게 내쉬며 어깨 긴장을 내려놓아요.',
    themes: ['core', 'spine', 'calm'],
    avoidGuards: [],
  },
  {
    id: 'pelvic-clock',
    titleKo: '골반 시계 12시-6시 부드러운 흔들기',
    durationKo: '1분 30초 · 8회',
    cueKo: '무릎을 세우고 누운 상태에서 힘주지 말고, 호흡에 맞춰 허리 아래 공간을 가볍게 굴려 주세요.',
    themes: ['core', 'lower', 'spine'],
    avoidGuards: [],
  },
  {
    id: 'open-book',
    titleKo: '옆으로 누워 오픈 북(가슴 열기) 스트레칭',
    durationKo: '좌·우 각 45초 (1분 30초)',
    cueKo: '양 무릎을 포갠 채 시선과 팔을 천장 너머로 천천히 열어 윗등과 어깨 앞쪽을 시원하게 펼쳐요.',
    themes: ['upper', 'spine'],
    avoidGuards: [],
  },
  {
    id: 'figure-4-glute',
    titleKo: '누워서 숫자 4(Figure-4) 엉덩이 이완',
    durationKo: '좌·우 각 45초 (1분 30초)',
    cueKo: '한쪽 발목을 반대 허벅지에 가볍게 얹고, 날숨마다 엉덩이 바깥쪽 긴장을 부드럽게 풀어 주세요.',
    themes: ['lower', 'calm'],
    avoidGuards: [],
  },
  {
    id: 'knee-sway',
    titleKo: '누워서 양 무릎 좌우 흔들기 이완',
    durationKo: '1분 30초 · 좌우 6회',
    cueKo: '양팔을 편하게 펼치고 두 무릎을 좌우로 작게 넘기며 허리와 옆구리 주변을 부드럽게 풀어 주세요.',
    themes: ['spine', 'calm', 'lower'],
    avoidGuards: [],
  },
  {
    id: 'seated-shoulder-sweep',
    titleKo: '앉아서 쇄골 열기 & 어깨 원 그리기',
    durationKo: '1분 30초 · 8회',
    cueKo: '의자나 매트에 편히 앉아 숨을 들이쉬며 어깨를 부드럽게 들어 올렸다가, 내쉬며 뒤아래로 넓게 내려요.',
    themes: ['upper', 'calm'],
    avoidGuards: [],
  },
  {
    id: 'quadruped-cat-cow',
    titleKo: '네발기기 캣-카우 척추 물결 스트레칭',
    durationKo: '1분 30초 · 6회',
    cueKo: '손바닥으로 바닥을 가볍게 밀며 등을 둥글게 말았다가, 숨을 마시며 가슴을 정면으로 길게 펼쳐요.',
    themes: ['spine', 'upper'],
    avoidGuards: ['wrist', 'knee'],
  },
];

function formatKoreanDateLabel(isoDate?: string): string {
  const clean = (isoDate ?? '').trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${y}.${m}.${d}`;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
}

function detectSessionTheme(
  resolvedItems: ReadonlyArray<{ step: SequenceStep; exercise: PilatesExercise }>,
  focusGoal: string,
): 'core' | 'lower' | 'upper' | 'spine' {
  const hay = `${focusGoal} ${resolvedItems.map((r) => r.exercise.nameKo).join(' ')}`;
  if (/하체|둔근|엉덩이|런지|풋워크|다리/.test(hay)) return 'lower';
  if (/상체|어깨|흉추|등|팔|가슴/.test(hay)) return 'upper';
  if (/척추|분절|유연|스트레칭|이완/.test(hay)) return 'spine';

  const blockCounts = new Map<ClassBlockCategory, number>();
  for (const { exercise } of resolvedItems) {
    blockCounts.set(exercise.blockCategory, (blockCounts.get(exercise.blockCategory) ?? 0) + 1);
  }
  const lowerScore =
    (blockCounts.get('footwork') ?? 0) +
    (blockCounts.get('lower-body') ?? 0) +
    (blockCounts.get('bridging') ?? 0);
  const upperScore = (blockCounts.get('upper-body') ?? 0) + (blockCounts.get('extension') ?? 0);
  const coreScore = (blockCounts.get('core') ?? 0) + (blockCounts.get('plank') ?? 0);

  if (lowerScore >= upperScore && lowerScore >= coreScore && lowerScore > 0) return 'lower';
  if (upperScore >= coreScore && upperScore > 0) return 'upper';
  return 'core';
}

function pickTwoHomeCareTips(
  theme: 'core' | 'lower' | 'upper' | 'spine',
  comfortGuards: readonly ComfortGuardArea[],
): MemberRecapHomeTip[] {
  const guardSet = new Set(comfortGuards);
  const safeTips = HOME_CARE_TIP_LIBRARY.filter(
    (tip) => !tip.avoidGuards.some((g) => guardSet.has(g)),
  );

  const scored = [...safeTips].sort((a, b) => {
    const aMatch = a.themes.includes(theme) ? 2 : a.themes.includes('calm') ? 1 : 0;
    const bMatch = b.themes.includes(theme) ? 2 : b.themes.includes('calm') ? 1 : 0;
    return bMatch - aMatch;
  });

  return scored.slice(0, 2).map(({ titleKo, durationKo, cueKo }) => ({
    titleKo,
    durationKo,
    cueKo,
  }));
}

function pickTwoHighlightMoves(
  resolvedItems: ReadonlyArray<{ step: SequenceStep; exercise: PilatesExercise }>,
  highlightStepIds?: readonly string[],
): MemberRecapHighlightMove[] {
  if (resolvedItems.length === 0) return [];

  const chosen: Array<{ step: SequenceStep; exercise: PilatesExercise }> = [];
  const usedIds = new Set<string>();

  if (highlightStepIds && highlightStepIds.length > 0) {
    for (const stepId of highlightStepIds) {
      const found = resolvedItems.find((item) => item.step.stepId === stepId);
      if (found && !usedIds.has(found.exercise.id)) {
        chosen.push(found);
        usedIds.add(found.exercise.id);
        if (chosen.length >= 2) break;
      }
    }
  }

  // Prefer main-body moves from distinct blocks so the 2 highlights feel thoughtful
  const ranked = [...resolvedItems].sort((a, b) => {
    const weight = (cat: ClassBlockCategory) =>
      cat === 'warmup' || cat === 'cooldown' ? 1 : 3;
    return weight(b.exercise.blockCategory) - weight(a.exercise.blockCategory);
  });

  const usedBlocks = new Set(chosen.map((c) => c.exercise.blockCategory));
  for (const candidate of ranked) {
    if (chosen.length >= 2) break;
    if (usedIds.has(candidate.exercise.id)) continue;
    if (chosen.length === 1 && usedBlocks.has(candidate.exercise.blockCategory) && ranked.length > 2) {
      continue;
    }
    chosen.push(candidate);
    usedIds.add(candidate.exercise.id);
    usedBlocks.add(candidate.exercise.blockCategory);
  }

  for (const candidate of ranked) {
    if (chosen.length >= 2) break;
    if (usedIds.has(candidate.exercise.id)) continue;
    chosen.push(candidate);
    usedIds.add(candidate.exercise.id);
  }

  return chosen.slice(0, 2).map(({ exercise }) => ({
    exerciseId: exercise.id,
    nameKo: exercise.nameKo,
    apparatusLabelKo: APPARATUS_LABELS[exercise.apparatus].short,
    praiseNoteKo: BLOCK_PRAISE_KO[exercise.blockCategory],
  }));
}

export function formatMemberRecapKakaoText(
  card: Omit<MemberRecapCardData, 'kakaoShareText'>,
): string {
  const planesSummary = card.spinalBalance
    .map((item) => `${item.shortLabelKo} ${item.covered ? '●' : '○'}`)
    .join(' · ');

  const highlightsBlock =
    card.highlightMoves.length > 0
      ? card.highlightMoves
          .map((m, idx) => `${idx + 1}. ${m.nameKo} (${m.apparatusLabelKo})\n   - ${m.praiseNoteKo}`)
          .join('\n')
      : '- 오늘 수업의 기본 호흡과 중심 정렬을 차분하게 익히셨어요.';

  const homeTipsBlock = card.homeCareTips
    .map((tip, idx) => `${idx + 1}. ${tip.titleKo} (${tip.durationKo})\n   - ${tip.cueKo}`)
    .join('\n');

  const lines = [
    `[오늘의 필라테스 리캡 · ${card.sessionDateLabelKo}]`,
    `${card.memberAlias} · ${card.primaryApparatusLabelKo} ${card.totalMinutes}분`,
    '',
    `■ 오늘의 핵심 포커스`,
    `- ${card.todayFocusKo}`,
    ...(card.comfortSummaryKo ? [`- 배려 포인트: ${card.comfortSummaryKo}`] : []),
    '',
    `■ 척추 4평면 밸런스 (${card.coveredPlaneCount}/4 방향)`,
    `- ${planesSummary}`,
    `- ${card.spinalBalanceNoteKo}`,
    '',
    `■ 오늘 특히 잘 따라온 동작`,
    highlightsBlock,
    '',
    `■ 집에서 3분 매트 홈케어 참고`,
    homeTipsBlock,
    '',
    card.closingNoteKo,
    `※ ${card.coachingDisclaimerKo}`,
  ];

  return lines.join('\n');
}

export interface BuildMemberRecapParams {
  readonly steps: readonly SequenceStep[];
  readonly exercises: ExerciseLookupSource;
  readonly profile: Partial<PrivateMemberProfile>;
  readonly sequenceTitle?: string;
  readonly sessionDateIso?: string;
  readonly highlightStepIds?: readonly string[];
}

/**
 * Builds privacy-safe, non-medical post-class instructor-to-member communication recap card data.
 */
export function buildMemberRecapCard(params: BuildMemberRecapParams): MemberRecapCardData {
  const { steps, exercises, sequenceTitle, sessionDateIso, highlightStepIds } = params;
  const { profile } = sanitizePrivateMemberProfile(params.profile);
  const exerciseMap = resolveExerciseMap(exercises);

  const resolvedItems: Array<{ step: SequenceStep; exercise: PilatesExercise }> = [];
  let totalMinutes = 0;

  for (const step of steps) {
    totalMinutes += step.durationMin;
    if (isRestStep(step)) continue;
    const exercise = exerciseMap.get(step.exerciseId);
    if (exercise) {
      resolvedItems.push({ step, exercise });
    }
  }

  // Primary apparatus
  const apparatusCounts = new Map<ApparatusType, number>();
  for (const { exercise } of resolvedItems) {
    apparatusCounts.set(exercise.apparatus, (apparatusCounts.get(exercise.apparatus) ?? 0) + 1);
  }
  const topApparatus = Array.from(apparatusCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  const primaryApparatusLabelKo = topApparatus ? APPARATUS_LABELS[topApparatus].ko : '필라테스';

  // 4 spinal planes balance
  const planeCounts: Record<DynamicSpinalPlane, number> = {
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
  };
  for (const { exercise } of resolvedItems) {
    for (const p of exercise.spinalPlanes) {
      if (p === 'flexion' || p === 'extension' || p === 'lateral' || p === 'rotation') {
        planeCounts[p] += 1;
      }
    }
  }
  const maxPlaneCount = Math.max(1, ...Object.values(planeCounts));
  const spinalBalance: SpinalPlaneBalanceItem[] = FOUR_SPINAL_PLANES.map(
    ({ plane, shortLabelKo, fullLabelKo }) => {
      const count = planeCounts[plane];
      return {
        plane,
        shortLabelKo,
        fullLabelKo,
        count,
        ratioPercent: count === 0 ? 0 : Math.max(24, Math.round((count / maxPlaneCount) * 100)),
        covered: count > 0,
      };
    },
  );
  const coveredPlaneCount = spinalBalance.filter((p) => p.covered).length;
  const missingNames = spinalBalance.filter((p) => !p.covered).map((p) => p.shortLabelKo);
  const coveredNames = spinalBalance.filter((p) => p.covered).map((p) => p.shortLabelKo);

  let spinalBalanceNoteKo: string;
  if (resolvedItems.length === 0) {
    spinalBalanceNoteKo = '동작을 담으면 척추 4방향 움직임 균형이 자동으로 정리돼요.';
  } else if (coveredPlaneCount === 4) {
    spinalBalanceNoteKo = '굴곡·신전·측굴·회전 4가지 척추 움직임을 고르게 담아 균형 있게 움직였어요.';
  } else if (coveredPlaneCount >= 2) {
    spinalBalanceNoteKo = `${coveredNames.join('·')} 중심으로 움직였고, 다음 수업에 ${missingNames.join('·')} 움직임을 더해보면 좋아요.`;
  } else if (coveredPlaneCount === 1) {
    spinalBalanceNoteKo = `오늘은 ${coveredNames[0]} 움직임에 집중했어요. 다음엔 다른 방향 움직임도 함께 열어볼게요.`;
  } else {
    spinalBalanceNoteKo = '중립 척추 안정화와 호흡 중심의 편안한 기본 정렬을 다졌어요.';
  }

  const comfortSummaryKo =
    profile.comfortGuards.length > 0
      ? `${profile.comfortGuards.map((g) => COMFORT_GUARD_META[g].chipLabelKo).join(' · ')} 중심으로 편안한 범위 선택`
      : null;

  const theme = detectSessionTheme(resolvedItems, profile.focusGoal);
  const highlightMoves = pickTwoHighlightMoves(resolvedItems, highlightStepIds);
  const homeCareTips = pickTwoHomeCareTips(theme, profile.comfortGuards);

  const baseCard: Omit<MemberRecapCardData, 'kakaoShareText'> = {
    memberAlias: profile.alias,
    sessionDateLabelKo: formatKoreanDateLabel(sessionDateIso),
    sequenceTitleKo: (sequenceTitle ?? '').trim() || `${primaryApparatusLabelKo} 1:1 맞춤 레슨`,
    totalMinutes: totalMinutes || 50,
    primaryApparatusLabelKo,
    todayFocusKo: profile.focusGoal,
    comfortSummaryKo,
    spinalBalance,
    coveredPlaneCount,
    spinalBalanceNoteKo,
    highlightMoves,
    homeCareTips,
    closingNoteKo: '오늘도 호흡에 집중하며 차분하게 움직여 주셔서 감사해요. 다음 수업에서 뵐게요!',
    coachingDisclaimerKo:
      '운동 코칭 및 홈케어 스트레칭 참고 안내이며 의학적 진단이나 치료를 대신하지 않아요.',
  };

  return {
    ...baseCard,
    kakaoShareText: formatMemberRecapKakaoText(baseCard),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTextLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word.length > maxCharsPerLine ? word.slice(0, maxCharsPerLine) : word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines.slice(0, maxLines);
}

/**
 * Renders a crisp, print- and mobile-share-ready 1-page botanical linen SVG card (720×960)
 * using zero external network assets so it works 100% offline.
 */
export function renderMemberRecapCardSvg(card: MemberRecapCardData): string {
  const fontStack =
    "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";

  const focusLines = wrapTextLines(card.todayFocusKo, 34, 2);
  const balanceNoteLines = wrapTextLines(card.spinalBalanceNoteKo, 38, 2);

  const planeBarsSvg = card.spinalBalance
    .map((item, idx) => {
      const colX = 64 + idx * 150;
      const barWidth = 132;
      const fillWidth = item.covered ? Math.max(24, Math.round((barWidth * item.ratioPercent) / 100)) : 0;
      return `
      <g transform="translate(${colX}, 338)">
        <text x="0" y="0" font-size="15" font-weight="600" fill="#1E3129" font-family="${fontStack}">${escapeXml(item.shortLabelKo)}</text>
        <text x="${barWidth}" y="0" text-anchor="end" font-size="14" font-weight="500" fill="${item.covered ? '#355441' : '#7B7266'}" font-family="${fontStack}">${item.count}회</text>
        <rect x="0" y="10" width="${barWidth}" height="10" rx="5" fill="#EFE9DF" />
        ${fillWidth > 0 ? `<rect x="0" y="10" width="${fillWidth}" height="10" rx="5" fill="#355441" />` : ''}
      </g>`;
    })
    .join('');

  const highlightSvg = card.highlightMoves
    .slice(0, 2)
    .map((move, idx) => {
      const y = 470 + idx * 82;
      const praiseLines = wrapTextLines(move.praiseNoteKo, 38, 2);
      return `
      <g transform="translate(64, ${y})">
        <rect x="0" y="0" width="592" height="70" rx="12" fill="#F3F5EE" />
        <rect x="14" y="14" width="26" height="26" rx="6" fill="#355441" />
        <text x="27" y="32" text-anchor="middle" font-size="14" font-weight="600" fill="#FFFEF9" font-family="${fontStack}">${idx + 1}</text>
        <text x="52" y="30" font-size="17" font-weight="600" fill="#1E3129" font-family="${fontStack}">${escapeXml(move.nameKo.slice(0, 28))}</text>
        <text x="576" y="29" text-anchor="end" font-size="13" font-weight="500" fill="#355441" font-family="${fontStack}">${escapeXml(move.apparatusLabelKo)}</text>
        <text x="52" y="54" font-size="14" font-weight="400" fill="#5E554A" font-family="${fontStack}">${escapeXml(praiseLines[0] ?? '')}</text>
      </g>`;
    })
    .join('');

  const homeTipsSvg = card.homeCareTips
    .slice(0, 2)
    .map((tip, idx) => {
      const y = 682 + idx * 88;
      const cueLines = wrapTextLines(tip.cueKo, 40, 2);
      return `
      <g transform="translate(64, ${y})">
        <rect x="0" y="0" width="592" height="76" rx="12" fill="#FAF8F4" />
        <text x="18" y="27" font-size="16" font-weight="600" fill="#1E3129" font-family="${fontStack}">${idx + 1}. ${escapeXml(tip.titleKo)}</text>
        <text x="574" y="27" text-anchor="end" font-size="13" font-weight="600" fill="#355441" font-family="${fontStack}">${escapeXml(tip.durationKo)}</text>
        <text x="18" y="50" font-size="13" font-weight="400" fill="#5E554A" font-family="${fontStack}">${escapeXml(cueLines[0] ?? '')}</text>
        ${cueLines[1] ? `<text x="18" y="67" font-size="13" font-weight="400" fill="#5E554A" font-family="${fontStack}">${escapeXml(cueLines[1])}</text>` : ''}
      </g>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960" role="img" aria-label="${escapeXml(`${card.memberAlias} 필라테스 수업 리캡 카드`)}">
  <rect width="720" height="960" fill="#FAF8F4" />
  <rect x="32" y="32" width="656" height="896" rx="20" fill="#FFFFFF" stroke="#E3E8DD" stroke-width="1.5" />

  <!-- Top Studio Header -->
  <rect x="64" y="64" width="142" height="28" rx="6" fill="#E4EADF" />
  <text x="135" y="83" text-anchor="middle" font-size="13" font-weight="600" fill="#355441" font-family="${fontStack}">오늘의 1:1 수업 리캡</text>
  <text x="656" y="83" text-anchor="end" font-size="14" font-weight="500" fill="#5E554A" font-family="${fontStack}">${escapeXml(card.sessionDateLabelKo)} · ${card.totalMinutes}분</text>

  <text x="64" y="134" font-size="28" font-weight="600" fill="#1E3129" font-family="${fontStack}">${escapeXml(card.memberAlias)}</text>
  <text x="64" y="162" font-size="15" font-weight="400" fill="#5E554A" font-family="${fontStack}">${escapeXml(`${card.sequenceTitleKo} · ${card.primaryApparatusLabelKo}`)}</text>
  <line x1="64" y1="184" x2="656" y2="184" stroke="#E3E8DD" stroke-width="1" />

  <!-- Today's Focus -->
  <text x="64" y="212" font-size="14" font-weight="600" fill="#355441" font-family="${fontStack}">오늘의 핵심 포커스</text>
  <text x="64" y="238" font-size="18" font-weight="600" fill="#1E3129" font-family="${fontStack}">${escapeXml(focusLines[0] ?? card.todayFocusKo)}</text>
  ${focusLines[1] ? `<text x="64" y="260" font-size="18" font-weight="600" fill="#1E3129" font-family="${fontStack}">${escapeXml(focusLines[1])}</text>` : ''}
  ${card.comfortSummaryKo ? `<text x="64" y="${focusLines[1] ? 284 : 264}" font-size="13" font-weight="500" fill="#526358" font-family="${fontStack}">배려 포인트: ${escapeXml(card.comfortSummaryKo)}</text>` : ''}

  <!-- 4 Spinal Planes Balance -->
  <text x="64" y="316" font-size="14" font-weight="600" fill="#355441" font-family="${fontStack}">척추 4평면 밸런스 (${card.coveredPlaneCount}/4)</text>
  ${planeBarsSvg}
  <text x="64" y="388" font-size="14" font-weight="400" fill="#5E554A" font-family="${fontStack}">${escapeXml(balanceNoteLines[0] ?? '')}</text>
  ${balanceNoteLines[1] ? `<text x="64" y="408" font-size="14" font-weight="400" fill="#5E554A" font-family="${fontStack}">${escapeXml(balanceNoteLines[1])}</text>` : ''}
  <line x1="64" y1="426" x2="656" y2="426" stroke="#E3E8DD" stroke-width="1" />

  <!-- Highlight Moves -->
  <text x="64" y="454" font-size="15" font-weight="600" fill="#355441" font-family="${fontStack}">오늘 잘 따라온 동작 2가지</text>
  ${highlightSvg}

  <!-- 3-Minute Home Care Tips -->
  <text x="64" y="664" font-size="15" font-weight="600" fill="#355441" font-family="${fontStack}">집에서 3분 매트 홈케어 참고</text>
  ${homeTipsSvg}

  <!-- Footer Coaching Note -->
  <line x1="64" y1="876" x2="656" y2="876" stroke="#E3E8DD" stroke-width="1" />
  <text x="64" y="904" font-size="12" font-weight="400" fill="#7B7266" font-family="${fontStack}">${escapeXml(card.coachingDisclaimerKo)}</text>
</svg>`;
}

/**
 * Exports the 1-page recap card as PNG via offscreen Canvas, cleanly falling back to SVG download
 * when Canvas rasterization is unavailable. Runs 100% locally in-browser.
 */
export async function downloadMemberRecapCardImage(
  card: MemberRecapCardData,
  fileNameBase = 'pilates-lesson-recap',
): Promise<{ readonly format: 'png' | 'svg'; readonly filename: string }> {
  const svgMarkup = renderMemberRecapCardSvg(card);
  const safeBase = fileNameBase.replace(/[^a-zA-Z0-9_-]/g, '-');

  const triggerDownload = (href: string, filename: string) => {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const downloadSvgFallback = (): { readonly format: 'svg'; readonly filename: string } => {
    const filename = `${safeBase}.svg`;
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      if (typeof URL.revokeObjectURL === 'function') {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
    return { format: 'svg', filename };
  };

  if (
    typeof document === 'undefined' ||
    typeof Image === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return downloadSvgFallback();
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return downloadSvgFallback();
    }

    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const pngDataUrl = await new Promise<string | null>((resolve) => {
      const img = new Image();
      const timeoutId = setTimeout(() => resolve(null), 1500);
      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          ctx.fillStyle = '#FAF8F4';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(null);
      };
      img.src = svgUrl;
    });

    if (typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(svgUrl);
    }

    if (pngDataUrl && pngDataUrl.startsWith('data:image/png')) {
      const filename = `${safeBase}.png`;
      triggerDownload(pngDataUrl, filename);
      return { format: 'png', filename };
    }
  } catch {
    // Fall back to crisp vector SVG card download
  }

  return downloadSvgFallback();
}

/* ==========================================================================
   Group 6:1 Mode — 3-Tier Simultaneous Layering Cue Sheet
   ========================================================================== */

export interface GroupLayeringRow {
  readonly stepId: string;
  readonly order: number;
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly apparatusLabelKo: string;
  readonly springCode: string;
  readonly durationMin: number;
  readonly selectedLayer: LayerMode;
  readonly tiers: {
    readonly easy: string;
    readonly standard: string;
    readonly hard: string;
  };
  readonly quickCoachCueKo: string;
}

export interface GroupLayeringMatrix {
  readonly classSize: number;
  readonly rows: readonly GroupLayeringRow[];
  readonly summaryKo: string;
  readonly copyableCueSheetText: string;
}

function getEffectiveSpringCode(step: SequenceStep, exercise: PilatesExercise): string {
  const raw = (step.customSpringOverride ?? exercise.springs ?? '').trim();
  if (!raw) {
    return exercise.apparatus === 'mat' || exercise.apparatus === 'barrel' ? '맨몸' : '현장 세팅';
  }
  if (isUnknownSpringSetup(raw, exercise.apparatus)) {
    return '현장 세팅';
  }
  return raw;
}

/**
 * Generates a simultaneous 3-tier cue sheet ([완화(초보) · 기본 · 심화]) for 6:1 group instruction.
 */
export function buildGroupLayeringMatrix(
  steps: readonly SequenceStep[],
  exercises: ExerciseLookupSource,
  options?: { readonly classSize?: number; readonly brand?: ReformerBrand },
): GroupLayeringMatrix {
  const classSize = Math.max(2, Math.min(20, Math.round(options?.classSize ?? 6)));
  const brand = options?.brand ?? 'intopilates';
  const exerciseMap = resolveExerciseMap(exercises);

  const rows: GroupLayeringRow[] = [];
  let order = 0;

  for (const step of steps) {
    if (isRestStep(step)) continue;
    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) continue;
    order += 1;

    const resolved = resolveStepSetup(step, exercise, brand);
    const springCode = resolved.springUnknown
      ? '현장 세팅'
      : getEffectiveSpringCode(step, exercise);

    const easy =
      exercise.layers.easy?.trim() ||
      '가동 범위를 줄이고 지지 면적을 넓혀 호흡 리듬에 먼저 집중해요.';
    const standard =
      exercise.layers.standard?.trim() ||
      '기본 정렬과 호흡 템포에 맞춰 좌우 균형 있게 반복해요.';
    const hard =
      exercise.layers.hard?.trim() ||
      '정점에서 2초 멈춤 또는 한쪽 지지 변형으로 중심 조절을 높여요.';

    rows.push({
      stepId: step.stepId,
      order,
      exerciseId: exercise.id,
      exerciseNameKo: exercise.nameKo,
      apparatusLabelKo: APPARATUS_LABELS[exercise.apparatus].short,
      springCode,
      durationMin: step.durationMin,
      selectedLayer: step.selectedLayer ?? 'standard',
      tiers: { easy, standard, hard },
      quickCoachCueKo: exercise.cues[0]?.trim() || standard,
    });
  }

  const copyableCueSheetText =
    rows.length === 0
      ? `${classSize}:1 그룹 3단계 큐 시트 — 동작을 추가하면 자동으로 채워집니다.`
      : [
          `[${classSize}:1 그룹 레슨 · 3단계 동시 레이어링 큐 시트]`,
          ...rows.map((row) =>
            [
              `${String(row.order).padStart(2, '0')}. ${row.exerciseNameKo} (${row.apparatusLabelKo} · ${row.springCode} · ${row.durationMin}분)`,
              `   - 완화(초보): ${row.tiers.easy}`,
              `   - 기본: ${row.tiers.standard}`,
              `   - 심화: ${row.tiers.hard}`,
            ].join('\n'),
          ),
        ].join('\n\n');

  const summaryKo =
    rows.length > 0
      ? `${classSize}:1 그룹 기준 ${rows.length}개 동작의 완화·기본·심화 3단계 동시 큐가 준비되었어요.`
      : '시퀀스에 동작을 담으면 그룹 3단계 동시 큐 시트가 자동으로 정리돼요.';

  return {
    classSize,
    rows,
    summaryKo,
    copyableCueSheetText,
  };
}

/* ==========================================================================
   Group 6:1 Mode — Transition & Spring Bottleneck Diagnostics
   ========================================================================== */

export interface GroupStepTransitionItem {
  readonly stepId: string;
  readonly order: number;
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly springCode: string;
  readonly apparatus: ApparatusType;
  readonly box: BoxState;
  readonly footbar: FootbarState;
  readonly springChanged: boolean;
  readonly boxChanged: boolean;
  readonly apparatusChanged: boolean;
  readonly positionChanged: boolean;
  readonly footbarChanged: boolean;
  readonly propChanged: boolean;
  readonly changedItemsKo: readonly string[];
  readonly estimatedGroupSec: number;
  readonly status: 'keep-flow' | 'smooth' | 'watch' | 'bottleneck';
  readonly coachTipKo: string;
}

export interface SpringKeepStreak {
  readonly startOrder: number;
  readonly endOrder: number;
  readonly stepIds: readonly string[];
  readonly exerciseNamesKo: readonly string[];
  readonly springCode: string;
  readonly apparatusLabelKo: string;
  readonly stepCount: number;
  readonly totalMinutes: number;
  readonly labelKo: string;
}

export interface GroupFlowTransitionAnalysis {
  readonly classSize: number;
  readonly exerciseCount: number;
  readonly springChangeCount: number;
  readonly boxChangeCount: number;
  readonly apparatusChangeCount: number;
  readonly positionChangeCount: number;
  readonly totalEstimatedTransitionSec: number;
  readonly totalEstimatedTransitionLabelKo: string;
  readonly bottleneckCount: number;
  readonly keepFlowStepCount: number;
  readonly springKeepStreaks: readonly SpringKeepStreak[];
  readonly longestSpringKeepStreak: SpringKeepStreak | null;
  readonly transitions: readonly GroupStepTransitionItem[];
  readonly summaryKo: string;
  readonly groupFlowTipsKo: readonly string[];
}

function formatDurationSecondsKo(totalSec: number): string {
  const safe = Math.max(0, Math.round(totalSec));
  if (safe === 0) return '0초';
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  if (min === 0) return `${sec}초`;
  if (sec === 0) return `${min}분`;
  return `${min}분 ${sec}초`;
}

function normalizePropSignature(step: SequenceStep, exercise: PilatesExercise): string {
  if (step.propOverride !== undefined) {
    return step.propOverride === 'none' ? '' : PROP_LABELS[step.propOverride]?.ko ?? step.propOverride;
  }
  return exercise.props
    .filter((p) => p !== 'none')
    .map((p) => PROP_LABELS[p]?.ko ?? p)
    .sort()
    .join(',');
}

/**
 * Diagnoses simultaneous 6:1 group flow transitions (spring/box/apparatus/position swaps),
 * estimates realistic multi-member transition seconds, and highlights "spring-keep" streaks.
 */
export function analyzeGroupFlowTransitions(
  steps: readonly SequenceStep[],
  exercises: ExerciseLookupSource,
  options?: { readonly classSize?: number },
): GroupFlowTransitionAnalysis {
  const classSize = Math.max(2, Math.min(20, Math.round(options?.classSize ?? 6)));
  const extraMembers = Math.max(0, classSize - 4);
  const exerciseMap = resolveExerciseMap(exercises);

  const items: Array<{
    step: SequenceStep;
    exercise: PilatesExercise;
    order: number;
    springCode: string;
    box: BoxState;
    footbar: FootbarState;
    propSig: string;
  }> = [];

  let order = 0;
  for (const step of steps) {
    if (isRestStep(step)) continue;
    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) continue;
    order += 1;
    items.push({
      step,
      exercise,
      order,
      springCode: getEffectiveSpringCode(step, exercise),
      box: step.boxOverride ?? exercise.box,
      footbar: step.footbarOverride ?? exercise.footbar,
      propSig: normalizePropSignature(step, exercise),
    });
  }

  let springChangeCount = 0;
  let boxChangeCount = 0;
  let apparatusChangeCount = 0;
  let positionChangeCount = 0;
  let totalEstimatedTransitionSec = 0;
  let bottleneckCount = 0;
  let keepFlowStepCount = 0;

  const transitions: GroupStepTransitionItem[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const curr = items[i]!;
    const prev = i > 0 ? items[i - 1]! : null;

    if (!prev) {
      keepFlowStepCount += 1;
      transitions.push({
        stepId: curr.step.stepId,
        order: curr.order,
        exerciseId: curr.exercise.id,
        exerciseNameKo: curr.exercise.nameKo,
        springCode: curr.springCode,
        apparatus: curr.exercise.apparatus,
        box: curr.box,
        footbar: curr.footbar,
        springChanged: false,
        boxChanged: false,
        apparatusChanged: false,
        positionChanged: false,
        footbarChanged: false,
        propChanged: false,
        changedItemsKo: [],
        estimatedGroupSec: 0,
        status: 'keep-flow',
        coachTipKo: '수업 시작 세팅 · 회원 입장 전 미리 세팅해 두면 바로 출발할 수 있어요.',
      });
      continue;
    }

    const apparatusChanged = prev.exercise.apparatus !== curr.exercise.apparatus;
    const boxChanged = prev.box !== curr.box;
    const springChanged =
      prev.springCode.toLowerCase() !== curr.springCode.toLowerCase() &&
      curr.springCode !== '현장 세팅';
    const footbarChanged =
      curr.exercise.apparatus === 'reformer' &&
      prev.exercise.apparatus === 'reformer' &&
      prev.footbar !== curr.footbar;
    const positionChanged = prev.exercise.bodyPosition !== curr.exercise.bodyPosition;
    const propChanged = prev.propSig !== curr.propSig;

    if (apparatusChanged) apparatusChangeCount += 1;
    if (boxChanged) boxChangeCount += 1;
    if (springChanged) springChangeCount += 1;
    if (positionChanged) positionChangeCount += 1;

    const changedItemsKo: string[] = [];
    if (apparatusChanged) {
      changedItemsKo.push(
        `기구 이동 (${APPARATUS_LABELS[prev.exercise.apparatus].short}→${APPARATUS_LABELS[curr.exercise.apparatus].short})`,
      );
    }
    if (boxChanged) {
      changedItemsKo.push(
        curr.box === 'none' ? '박스 내리기' : curr.box === 'short-box' ? '숏박스 올리기' : '롱박스 올리기',
      );
    }
    if (springChanged) {
      changedItemsKo.push(`스프링 ${curr.springCode}`);
    }
    if (footbarChanged) {
      changedItemsKo.push('풋바 각도 조절');
    }
    if (positionChanged) {
      const nextPos = POSITION_LABELS[curr.exercise.bodyPosition].ko.split(' ')[0] ?? curr.exercise.bodyPosition;
      changedItemsKo.push(`자세 전환 (${nextPos})`);
    }
    if (propChanged && curr.propSig) {
      changedItemsKo.push(`소도구 (${curr.propSig})`);
    }

    // Realistic simultaneous 6-member group transition timing (seconds)
    let rawSec = 0;
    if (apparatusChanged) rawSec += 45 + extraMembers * 5;
    if (boxChanged) rawSec += 35 + extraMembers * 4;
    if (springChanged) rawSec += 18 + extraMembers * 2;
    if (footbarChanged) rawSec += 10 + extraMembers;
    if (positionChanged) rawSec += 10 + extraMembers;
    if (propChanged) rawSec += 8;

    // Slight overlap when multiple changes happen together; realistic ceiling 95s per step
    const changeCount = [
      apparatusChanged,
      boxChanged,
      springChanged,
      footbarChanged,
      positionChanged,
      propChanged,
    ].filter(Boolean).length;
    const overlapFactor = changeCount >= 3 ? 0.85 : changeCount === 2 ? 0.92 : 1;
    const estimatedGroupSec = Math.min(95, Math.round(rawSec * overlapFactor));
    totalEstimatedTransitionSec += estimatedGroupSec;

    let status: GroupStepTransitionItem['status'];
    let coachTipKo: string;

    if (!springChanged && !boxChanged && !apparatusChanged) {
      status = 'keep-flow';
      keepFlowStepCount += 1;
      coachTipKo =
        estimatedGroupSec === 0
          ? '스프링·자세 그대로! 끊김 없이 바로 이어가세요.'
          : '스프링 그대로 유지 구간 · 호흡을 이어가며 자세만 가볍게 바꿔요.';
    } else if (estimatedGroupSec >= 40 || (boxChanged && springChanged) || apparatusChanged) {
      status = 'bottleneck';
      bottleneckCount += 1;
      coachTipKo = apparatusChanged
        ? `${classSize}명 기구 이동 구간 · 직전 동작 마무리 20초 전에 다음 기구와 세팅을 먼저 안내해 주세요.`
        : boxChanged
          ? `${classSize}명 박스 전환 구간 · 박스를 올린 뒤 스프링 확인까지 한 번에 구령하면 흐름이 깔끔해요.`
          : `${classSize}명 동시 세팅 변경 · 한 가지씩 순서대로 안내하고 모두 바꾼 뒤 출발해요.`;
    } else if (estimatedGroupSec >= 24) {
      status = 'watch';
      coachTipKo = `스프링(${curr.springCode}) 변경 구간 · 캐리지 정지 확인 후 천천히 걸어주세요.`;
    } else {
      status = 'smooth';
      coachTipKo = `빠른 전환 가능 · 스프링 ${curr.springCode}으로 가볍게 조절 후 이어가요.`;
    }

    transitions.push({
      stepId: curr.step.stepId,
      order: curr.order,
      exerciseId: curr.exercise.id,
      exerciseNameKo: curr.exercise.nameKo,
      springCode: curr.springCode,
      apparatus: curr.exercise.apparatus,
      box: curr.box,
      footbar: curr.footbar,
      springChanged,
      boxChanged,
      apparatusChanged,
      positionChanged,
      footbarChanged,
      propChanged,
      changedItemsKo,
      estimatedGroupSec,
      status,
      coachTipKo,
    });
  }

  // Highlight "스프링 그대로 유지 구간" (consecutive runs >= 2 with same apparatus & spring)
  const springKeepStreaks: SpringKeepStreak[] = [];
  let runStart = 0;
  while (runStart < items.length) {
    const startItem = items[runStart]!;
    let runEnd = runStart;
    while (
      runEnd + 1 < items.length &&
      items[runEnd + 1]!.exercise.apparatus === startItem.exercise.apparatus &&
      items[runEnd + 1]!.springCode.toLowerCase() === startItem.springCode.toLowerCase() &&
      items[runEnd + 1]!.box === startItem.box
    ) {
      runEnd += 1;
    }

    const slice = items.slice(runStart, runEnd + 1);
    if (slice.length >= 2) {
      const totalMinutes = slice.reduce((acc, s) => acc + s.step.durationMin, 0);
      const apparatusLabelKo = APPARATUS_LABELS[startItem.exercise.apparatus].short;
      springKeepStreaks.push({
        startOrder: slice[0]!.order,
        endOrder: slice[slice.length - 1]!.order,
        stepIds: slice.map((s) => s.step.stepId),
        exerciseNamesKo: slice.map((s) => s.exercise.nameKo),
        springCode: startItem.springCode,
        apparatusLabelKo,
        stepCount: slice.length,
        totalMinutes,
        labelKo: `${slice[0]!.order}~${slice[slice.length - 1]!.order}번 · ${startItem.springCode} 스프링 유지 (${slice.length}동작 · ${totalMinutes}분)`,
      });
    }

    runStart = runEnd + 1;
  }

  const longestSpringKeepStreak =
    springKeepStreaks.length > 0
      ? [...springKeepStreaks].sort((a, b) => b.stepCount - a.stepCount || b.totalMinutes - a.totalMinutes)[0]!
      : null;

  const groupFlowTipsKo: string[] = [];
  if (longestSpringKeepStreak) {
    groupFlowTipsKo.push(
      `${longestSpringKeepStreak.startOrder}~${longestSpringKeepStreak.endOrder}번(${longestSpringKeepStreak.springCode})은 스프링 변경 없이 ${longestSpringKeepStreak.stepCount}개 동작을 매끄럽게 이어갈 수 있어요.`,
    );
  }
  if (boxChangeCount > 0) {
    groupFlowTipsKo.push(
      `박스 세팅 변경이 ${boxChangeCount}회 있어요. ${classSize}명이 동시에 옮길 때 20초 전 예고 큐를 주면 대기 시간이 줄어요.`,
    );
  }
  if (springChangeCount >= 4) {
    groupFlowTipsKo.push(
      `스프링 변경이 ${springChangeCount}회로 다소 잦아요. 같은 스프링 동작을 나란히 묶어두면 ${classSize}:1 흐름이 한결 여유로워져요.`,
    );
  } else if (items.length >= 2 && bottleneckCount === 0) {
    groupFlowTipsKo.push(
      `큰 전환 병목 없이 ${classSize}:1 그룹 수업 템포를 안정적으로 끌어가기 좋은 구성이에요.`,
    );
  }

  const totalEstimatedTransitionLabelKo = formatDurationSecondsKo(totalEstimatedTransitionSec);
  const summaryKo =
    items.length === 0
      ? '동작을 추가하면 그룹 스프링 변경 횟수와 전환 흐름을 바로 정리해 드려요.'
      : `${classSize}:1 기준 스프링 변경 ${springChangeCount}회 · 예상 전환 약 ${totalEstimatedTransitionLabelKo}${
          longestSpringKeepStreak
            ? ` · 최대 ${longestSpringKeepStreak.stepCount}동작 스프링 유지`
            : ''
        }`;

  return {
    classSize,
    exerciseCount: items.length,
    springChangeCount,
    boxChangeCount,
    apparatusChangeCount,
    positionChangeCount,
    totalEstimatedTransitionSec,
    totalEstimatedTransitionLabelKo,
    bottleneckCount,
    keepFlowStepCount,
    springKeepStreaks,
    longestSpringKeepStreak,
    transitions,
    summaryKo,
    groupFlowTipsKo,
  };
}
