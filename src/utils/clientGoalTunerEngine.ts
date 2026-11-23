import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import {
  WORLD_PILATES_BY_ID,
  WORLD_PILATES_EXERCISES,
  getExerciseAnatomyInsight,
  type WorldPilatesExercise,
} from '../data/worldPilatesRepertoire1000';
import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  LayerMode,
  PilatesExercise,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import { getExerciseArtworkFrame } from './exerciseArtworkCache';
import { isRestStep } from './sequenceEngine';

export type ClientGoalPresetId =
  | 'round-shoulder'
  | 'pelvic-balance'
  | 'prenatal-gentle'
  | 'senior-comfort'
  | 'core-glute-sculpt';

export interface ClientGoalPresetDefinition {
  readonly id: ClientGoalPresetId;
  readonly titleKo: string;
  readonly shortLabelKo: string;
  readonly summaryKo: string;
  readonly focusTagKo: string;
  readonly recommendedLayerNoteKo: string;
  readonly defaultLayerMode: LayerMode;
  readonly applyLayerToUnchangedSteps: LayerMode | null;
}

export const CLIENT_GOAL_NON_MEDICAL_NOTICE_KO =
  '강사님의 수업 구성 편의를 돕는 운동 강도·자세 조절 도구이며, 회원님의 컨디션과 움직임 범위는 현장에서 직접 확인해 주세요.';

export const CLIENT_GOAL_PRESETS: readonly ClientGoalPresetDefinition[] = [
  {
    id: 'round-shoulder',
    titleKo: '라운드 숄더 · 흉추 열기 집중',
    shortLabelKo: '라운드 숄더',
    summaryKo:
      '목과 앞어깨 부담이 쌓이기 쉬운 전방 굴곡 동작을 줄이고, 흉추 신전과 견갑 안정화 동작으로 바꿔요.',
    focusTagKo: '흉추 신전 · 견갑 안정',
    recommendedLayerNoteKo:
      '어깨를 귀에서 멀리 두고 흉추부터 부드럽게 열어 주는 큐잉으로 안내해 주세요.',
    defaultLayerMode: 'standard',
    applyLayerToUnchangedSteps: null,
  },
  {
    id: 'pelvic-balance',
    titleKo: '좌우 골반 밸런스 집중',
    shortLabelKo: '골반 밸런스',
    summaryKo:
      '양측 대칭 반복 비중이 높은 일부 구간을 편측 안정화와 중둔근 균형 동작으로 보강해요.',
    focusTagKo: '편측 안정 · 중둔근 균형',
    recommendedLayerNoteKo:
      '좌우 골반 높이가 틀어지지 않는 범위에서 양쪽 횟수를 고르게 진행해 주세요.',
    defaultLayerMode: 'standard',
    applyLayerToUnchangedSteps: null,
  },
  {
    id: 'prenatal-gentle',
    titleKo: '산전 · 저충격 부드러운 흐름',
    shortLabelKo: '산전 부드러운 흐름',
    summaryKo:
      '복압이 커지는 심부 굴곡·오랜 바로 누운 자세·역전·고강도 구간을 앉은 자세·옆으로 누운 자세·네발기기 저충격 동작으로 일괄 치환해요.',
    focusTagKo: '앉은·옆·네발 · 스프링 경량',
    recommendedLayerNoteKo:
      '호흡을 참지 않고 편안히 내쉬며, 저항 동작의 스프링은 가볍게 조절해 안정적으로 이어 가세요.',
    defaultLayerMode: 'easy',
    applyLayerToUnchangedSteps: 'easy',
  },
  {
    id: 'senior-comfort',
    titleKo: '시니어 · 관절 편안한 저강도',
    shortLabelKo: '시니어 저강도',
    summaryKo:
      '심화(2.0)·고부하 플랭크·역전·큰 신전 동작을 입문(1.0) 중심 안정 지지 동작으로 치환하고 난이도 레이어를 쉽게(easy) 전환해요.',
    focusTagKo: '입문 1.0 · 안정 지지 · easy',
    recommendedLayerNoteKo:
      '지지면이 안정적인 자세에서 편안한 움직임 범위로 천천히 반복해 주세요.',
    defaultLayerMode: 'easy',
    applyLayerToUnchangedSteps: 'easy',
  },
  {
    id: 'core-glute-sculpt',
    titleKo: '코어 · 힙업 탄탄한 집중',
    shortLabelKo: '코어 · 힙업 집중',
    summaryKo:
      '중립·저강도 비중이 높은 구간을 코어와 둔근을 탄탄하게 깨우는 시그니처 동작으로 업그레이드하고 심화(hard) 레이어를 제안해요.',
    focusTagKo: '코어 · 둔근 강화 · hard 제안',
    recommendedLayerNoteKo:
      '초반 예열은 그대로 유지하고, 메인 구간에서 심화(hard) 레이어를 선택해 탄탄한 자극을 만들어 보세요.',
    defaultLayerMode: 'hard',
    applyLayerToUnchangedSteps: 'hard',
  },
];

export function getClientGoalPreset(presetId: ClientGoalPresetId): ClientGoalPresetDefinition {
  return CLIENT_GOAL_PRESETS.find((item) => item.id === presetId) ?? CLIENT_GOAL_PRESETS[0]!;
}

export type ClientGoalStepStatus = 'safe' | 'swap-recommended' | 'layer-adjust';

export interface ClientGoalStepAssessment {
  readonly stepId: string;
  readonly order: number;
  readonly step: SequenceStep;
  readonly exercise: PilatesExercise;
  readonly status: ClientGoalStepStatus;
  readonly reasonKo: string;
  readonly recommendedLayer: LayerMode;
  readonly recommendedSpringOverride?: string;
}

export interface ClientGoalSwapProposal {
  readonly stepId: string;
  readonly order: number;
  readonly originalStep: SequenceStep;
  readonly originalExercise: PilatesExercise;
  readonly replacementExercise: WorldPilatesExercise;
  readonly reasonKo: string;
  readonly benefitKo: string;
  readonly sameApparatus: boolean;
  readonly sameBlockCategory: boolean;
  readonly recommendedLayer: LayerMode;
  readonly recommendedSpringOverride?: string;
  readonly springNoteKo?: string;
  readonly recommendedSideMode?: StepSideMode;
  readonly originalArtworkSrc: string | null;
  readonly replacementArtworkSrc: string | null;
  readonly defaultSelected: boolean;
}

export interface ClientGoalTuningAnalysis {
  readonly preset: ClientGoalPresetDefinition;
  readonly totalExerciseSteps: number;
  readonly restStepCount: number;
  readonly flaggedCount: number;
  readonly safeStepCount: number;
  readonly layerAdjustmentsCount: number;
  readonly safetyFitScore: number;
  readonly projectedFitScore: number;
  readonly summaryHeadlineKo: string;
  readonly stepAssessments: readonly ClientGoalStepAssessment[];
  readonly swaps: readonly ClientGoalSwapProposal[];
  readonly catalogPoolSize: number;
}

export type ExerciseLookupInput =
  | ReadonlyMap<string, PilatesExercise>
  | Readonly<Record<string, PilatesExercise>>;

export interface ApplyClientGoalTuningOptions {
  readonly applyLayerToUnchangedSteps?: LayerMode | null;
}

const PLAIN_POSITION_KO: Readonly<Record<BodyPosition, string>> = {
  supine: '누운 자세',
  prone: '엎드린 자세',
  'side-lying': '옆으로 누운 자세',
  seated: '앉은 자세',
  kneeling: '무릎 선 자세',
  standing: '선 자세',
  quadruped: '네발기기',
};

const NECK_FLEXION_RE =
  /헌드레드|체스트\s*리프트|컬|크리스|티저|롤\s*업|롤\s*오버|앱\s*프렙|넥\s*풀|더블\s*레그\s*스트레치|hundred|chest\s*lift|ab\s*prep|criss|teaser|roll\s*up|roll\s*over|neck\s*pull|double\s*leg\s*stretch|curl/i;

const FORWARD_ROUNDING_UPPER_RE =
  /푸쉬\s*업|푸시\s*업|허그\s*어\s*트리|체스트\s*프레스|push[\s-]*up|hug\s*a\s*tree|chest\s*press/i;

const THORACIC_OPENING_RE =
  /흉추|견갑|스완|체스트\s*익스팬션|로잉|풀링|다트|오픈|스파인\s*트위스트|머메이드|브레스트\s*스트로크|등\s*신전|능형근|승모근|후면|swan|chest\s*expansion|rowing|pulling|dart|thoracic|scapula|breast\s*stroke|mermaid|spine\s*twist|open/i;

const UNILATERAL_GLUTE_RE =
  /중둔근|외전|편측|싱글|원\s*레그|원\s*암|런지|스쿠터|클램|사이드\s*킥|사이드\s*레그|스플릿|glute\s*med|single[\s-]*leg|unilateral|one[\s-]*leg|lunge|scooter|clam|side[\s-]*kick|side[\s-]*leg|split/i;

const INVERSION_HIGH_PRESSURE_RE =
  /숏\s*스파인|롱\s*스파인|롤\s*오버|잭나이프|오버헤드|부메랑|코르크스크류|컨트롤\s*밸런스|핸드스탠드|티저|역전|헌드레드|체스트\s*리프트|크리스|더블\s*레그|롤\s*업|short\s*spine|long\s*spine|roll\s*over|jack\s*knife|overhead|boomerang|corkscrew|control\s*balance|handstand|teaser|inversion|hundred|chest\s*lift|criss|double\s*leg|roll\s*up/i;

const SENIOR_HIGH_LOAD_RE =
  /스완\s*다이브|숏\s*스파인|롱\s*스파인|롤\s*오버|잭나이프|티저|부메랑|코르크스크류|스네이크|스타|점프|플라이오|핸드스탠드|오버헤드|하이\s*브릿지|swan\s*dive|short\s*spine|long\s*spine|roll\s*over|jack\s*knife|teaser|boomerang|corkscrew|snake|star|jump|plyo|handstand|overhead|inversion/i;

const CORE_GLUTE_SCULPT_RE =
  /코어|복횡근|복사근|복부|둔근|대둔근|중둔근|힙|브릿지|스쿠터|런지|헌드레드|티저|플랭크|파이크|core|oblique|abdomin|glute|hip|bridge|scooter|lunge|hundred|teaser|plank|pike/i;

const PRENATAL_SAFE_POSITIONS: ReadonlySet<BodyPosition> = new Set([
  'seated',
  'side-lying',
  'quadruped',
  'kneeling',
  'standing',
]);

const PRENATAL_TOP_POSITIONS: ReadonlySet<BodyPosition> = new Set([
  'seated',
  'side-lying',
  'quadruped',
]);

function buildExerciseText(ex: PilatesExercise): string {
  return [ex.nameKo, ex.nameEn, ...ex.targetMuscles, ...ex.cues, ex.precautions]
    .filter(Boolean)
    .join(' ');
}

function lookupExercise(
  exercisesById: ExerciseLookupInput,
  exerciseId: string,
): PilatesExercise | undefined {
  if (exercisesById instanceof Map) {
    return exercisesById.get(exerciseId) ?? WORLD_PILATES_BY_ID.get(exerciseId);
  }
  const record = exercisesById as Readonly<Record<string, PilatesExercise>>;
  if (Object.hasOwn(record, exerciseId)) {
    return record[exerciseId];
  }
  return WORLD_PILATES_BY_ID.get(exerciseId);
}

function toWorldExercise(ex: PilatesExercise | WorldPilatesExercise): WorldPilatesExercise {
  const known = WORLD_PILATES_BY_ID.get(ex.id);
  if (known) {
    if (known === ex) return known;
    return {
      ...known,
      ...ex,
      anatomyInsight: known.anatomyInsight,
      tier: known.tier,
      parentArchetypeId: known.parentArchetypeId,
      schoolTag: known.schoolTag,
      variationKind: known.variationKind,
    };
  }
  if ('anatomyInsight' in ex && 'tier' in ex && 'parentArchetypeId' in ex) {
    return ex;
  }
  return {
    ...ex,
    anatomyInsight: getExerciseAnatomyInsight(ex),
    tier: 'atomic',
    parentArchetypeId: ex.id,
    schoolTag: 'korean-studio',
    variationKind: 'archetype',
  };
}

function resolveExerciseArtworkSrc(ex: PilatesExercise): string | null {
  const direct = getExerciseArtworkFrame(ex, 'middle')?.src;
  if (direct) return direct;
  const world = WORLD_PILATES_BY_ID.get(ex.id);
  if (world && world.parentArchetypeId !== ex.id) {
    const parent = WORLD_PILATES_BY_ID.get(world.parentArchetypeId);
    if (
      parent &&
      parent.apparatus === ex.apparatus &&
      parent.bodyPosition === ex.bodyPosition
    ) {
      return getExerciseArtworkFrame(parent, 'middle')?.src ?? null;
    }
  }
  return null;
}

function getArchetypeKey(ex: PilatesExercise): string {
  return WORLD_PILATES_BY_ID.get(ex.id)?.parentArchetypeId ?? ex.id;
}

/**
 * Biomechanically accurate spring guidance:
 * - On pushing/pulling resistance movements, lighter springs lower load.
 * - On kneeling/standing reformer carriage stabilization, springs provide assistance,
 *   so we keep stable medium tension instead of dropping to unstable feather tension.
 */
export function suggestSpringAdjustmentForPreset(
  rawSprings: string,
  apparatus: ApparatusType,
  bodyPosition: BodyPosition,
  blockCategory: ClassBlockCategory,
  presetId: ClientGoalPresetId,
): { readonly springOverride?: string; readonly springNoteKo?: string } {
  if (presetId !== 'prenatal-gentle' && presetId !== 'senior-comfort') {
    return {};
  }

  const trimmed = rawSprings.trim();
  if (
    !trimmed ||
    apparatus === 'mat' ||
    apparatus === 'barrel' ||
    /^(?:bodyweight|none|맨몸|매트|바렐|스프링\s*없음)/i.test(trimmed)
  ) {
    return {};
  }

  // On Reformer kneeling/standing balance work, springs assist carriage stability rather than adding leg resistance.
  const isCarriageSupportBalance =
    apparatus === 'reformer' &&
    (bodyPosition === 'kneeling' || bodyPosition === 'standing') &&
    (blockCategory === 'lower-body' || blockCategory === 'plank' || blockCategory === 'core');

  if (isCarriageSupportBalance) {
    if (/^1Y$/i.test(trimmed) || /^1B$/i.test(trimmed)) {
      return {
        springOverride: '1R',
        springNoteKo:
          '캐리지 흔들림을 줄이기 위해 지지 장력(1R)을 유지해 안정성을 확보해 주세요.',
      };
    }
    return {
      springNoteKo:
        '기구 균형 동작은 스프링이 지지 역할을 하므로 흔들림 없는 장력을 유지해 주세요.',
    };
  }

  if (apparatus === 'reformer') {
    const normalized = trimmed.replace(/\s+/g, ' ').toUpperCase();
    const lighterMap: Readonly<Record<string, string>> = {
      '3R 1B': '2R',
      '3R': '2R',
      '2R 2B': '1R 1B',
      '2R 1B': '1R 1B',
      '2R 1Y': '1R 1B',
      '2R': '1R 1B',
      '1R 1B': '1R',
      '1R 1Y': '1B',
      '1R': '1B',
    };
    const nextSpring = lighterMap[normalized];
    if (nextSpring) {
      return {
        springOverride: nextSpring,
        springNoteKo:
          presetId === 'prenatal-gentle'
            ? `산전 저충격 권장: 스프링을 가볍게(${trimmed} → ${nextSpring}) 낮춰 호흡을 편안히 유지하세요.`
            : `관절 편안한 저강도 권장: 저항 장력을 한 단계(${trimmed} → ${nextSpring}) 낮춰 진행해 보세요.`,
      };
    }
  }

  if (presetId === 'prenatal-gentle') {
    return {
      springNoteKo: '저항 구간은 반 단계 가볍게 조절해 복부 압력이 높아지지 않게 진행해 주세요.',
    };
  }
  return {};
}

function isNeckFlexionHeavy(ex: PilatesExercise): boolean {
  const text = buildExerciseText(ex);
  const hasFlexion = ex.spinalPlanes.includes('flexion');
  const hasExtension = ex.spinalPlanes.includes('extension');
  if (ex.bodyPosition === 'supine' && hasFlexion && !hasExtension) {
    if (ex.blockCategory === 'core' || NECK_FLEXION_RE.test(text)) {
      return true;
    }
  }
  if (ex.blockCategory === 'plank' && !hasExtension) {
    return true;
  }
  if (ex.blockCategory === 'upper-body' && !hasExtension && FORWARD_ROUNDING_UPPER_RE.test(text)) {
    return true;
  }
  if (ex.blockCategory === 'core' && hasFlexion && !hasExtension && !ex.spinalPlanes.includes('rotation')) {
    return true;
  }
  return false;
}

function isUnilateralOrPelvicBalanced(ex: PilatesExercise): boolean {
  if (ex.isUnilateral) return true;
  if (ex.bodyPosition === 'side-lying') return true;
  const text = buildExerciseText(ex);
  return UNILATERAL_GLUTE_RE.test(text);
}

function isPrenatalUnsafe(ex: PilatesExercise): { unsafe: boolean; reasonKo: string } {
  const text = buildExerciseText(ex);
  if (ex.bodyPosition === 'prone') {
    return {
      unsafe: true,
      reasonKo:
        '복부가 기구·매트에 닿는 엎드린 자세 구간 → 네발기기나 앉은 자세의 부드러운 동작으로 대체 권장',
    };
  }
  if (INVERSION_HIGH_PRESSURE_RE.test(text)) {
    return {
      unsafe: true,
      reasonKo:
        '복부 압력이 높은 굴곡·역전 구간 → 옆으로 누운 자세나 앉은 자세의 저충격 동작으로 대체 권장',
    };
  }
  if (ex.bodyPosition === 'supine' && ex.spinalPlanes.includes('flexion')) {
    return {
      unsafe: true,
      reasonKo:
        '복부 압력이 높은 누운 굴곡 구간 → 옆으로 누운 부드러운 코어 동작으로 대체 권장',
    };
  }
  if (ex.bodyPosition === 'supine') {
    return {
      unsafe: true,
      reasonKo:
        '오래 바로 눕는 자세 구간 → 앉은 자세·옆으로 누운 자세·네발기기의 저충격 동작으로 대체 권장',
    };
  }
  if (ex.blockCategory === 'plank') {
    return {
      unsafe: true,
      reasonKo:
        '복압과 전신 지지 부하가 큰 플랭크 구간 → 네발기기·앉은 자세 안정 동작으로 대체 권장',
    };
  }
  if (ex.level === '2.0') {
    return {
      unsafe: true,
      reasonKo:
        '고강도 심화(2.0) 구간 → 호흡을 편안히 이어 갈 수 있는 입문 저충격 동작으로 대체 권장',
    };
  }
  return { unsafe: false, reasonKo: '앉은·옆·네발 저충격 흐름에 잘 맞아요.' };
}

function isSeniorUnsafe(ex: PilatesExercise): { unsafe: boolean; reasonKo: string } {
  const text = buildExerciseText(ex);
  if (ex.blockCategory === 'plank') {
    return {
      unsafe: true,
      reasonKo:
        '손목·어깨와 전신 부하가 큰 플랭크 구간 → 지지면이 안정적인 입문(1.0) 동작으로 대체 권장',
    };
  }
  if (SENIOR_HIGH_LOAD_RE.test(text)) {
    return {
      unsafe: true,
      reasonKo:
        '역전·큰 가동 범위 고부하 구간 → 관절 부담이 적은 입문(1.0) 안정 지지 동작으로 대체 권장',
    };
  }
  if (ex.level === '2.0') {
    return {
      unsafe: true,
      reasonKo:
        '심화(2.0) 난이도 구간 → 균형과 관절 편안함을 우선하는 입문(1.0) 동작으로 대체 권장',
    };
  }
  if (ex.blockCategory === 'extension' && ex.bodyPosition === 'prone' && ex.level !== '1.0') {
    return {
      unsafe: true,
      reasonKo:
        '허리 부담이 커지기 쉬운 엎드린 강한 신전 구간 → 부드러운 입문(1.0) 신전·가동성 동작으로 대체 권장',
    };
  }
  return { unsafe: false, reasonKo: '관절 부담이 적은 안정적인 구성이에요.' };
}

function isCoreGluteStrong(ex: WorldPilatesExercise): boolean {
  const zone = ex.anatomyInsight.anatomyVisualZone;
  const text = buildExerciseText(ex);
  if (
    (zone === 'core' || zone === 'glutes') &&
    (ex.level !== '1.0' ||
      ex.favoriteTag === 'burn-sculpt' ||
      ex.favoriteTag === 'signature' ||
      ex.blockCategory === 'core' ||
      ex.blockCategory === 'bridging' ||
      ex.blockCategory === 'lower-body' ||
      ex.blockCategory === 'plank')
  ) {
    return true;
  }
  return (
    (ex.blockCategory === 'core' || ex.blockCategory === 'plank') &&
    ex.level !== '1.0' &&
    CORE_GLUTE_SCULPT_RE.test(text)
  );
}

function assessStepForPreset(
  step: SequenceStep,
  exercise: WorldPilatesExercise,
  presetId: ClientGoalPresetId,
  indexInNonRest: number,
  totalNonRest: number,
  bilateralSwappedSoFar: number,
): { status: ClientGoalStepStatus; reasonKo: string } {
  switch (presetId) {
    case 'round-shoulder': {
      if (isNeckFlexionHeavy(exercise)) {
        return {
          status: 'swap-recommended',
          reasonKo:
            exercise.blockCategory === 'plank'
              ? '어깨 전방 말림과 상체 긴장이 커지기 쉬운 플랭크 구간 → 흉추를 열고 견갑을 안정시키는 동작으로 대체 권장'
              : '목과 앞어깨 긴장이 쌓이기 쉬운 전방 굴곡 구간 → 흉추 신전·견갑 안정화 동작으로 대체 권장',
        };
      }
      return {
        status: 'safe',
        reasonKo: '흉추 열기·어깨 정렬 흐름에 무리 없이 잘 맞아요.',
      };
    }

    case 'pelvic-balance': {
      const isWarmupOrCooldown =
        exercise.blockCategory === 'warmup' || exercise.blockCategory === 'cooldown';
      if (isUnilateralOrPelvicBalanced(exercise)) {
        return {
          status: 'safe',
          reasonKo: '이미 좌우 편측 균형과 중둔근 조절을 돕는 구성이에요.',
        };
      }
      const isTargetBlock =
        exercise.blockCategory === 'lower-body' ||
        exercise.blockCategory === 'bridging' ||
        exercise.blockCategory === 'feet-in-straps' ||
        exercise.blockCategory === 'footwork' ||
        exercise.blockCategory === 'core';
      const maxSwaps = Math.max(2, Math.ceil(totalNonRest * 0.55));
      if (!isWarmupOrCooldown && isTargetBlock && bilateralSwappedSoFar < maxSwaps) {
        return {
          status: 'swap-recommended',
          reasonKo:
            '양측 대칭 반복 비중이 높은 구간 → 좌우 골반 안정과 중둔근 균형을 깨우는 편측 동작으로 보강 권장',
        };
      }
      return {
        status: 'safe',
        reasonKo: '수업 전체 흐름에서 대칭 균형을 유지하는 보조 구간이에요.',
      };
    }

    case 'prenatal-gentle': {
      const check = isPrenatalUnsafe(exercise);
      if (check.unsafe) {
        return { status: 'swap-recommended', reasonKo: check.reasonKo };
      }
      if (step.selectedLayer !== 'easy') {
        return {
          status: 'layer-adjust',
          reasonKo: '자세는 저충격에 적합하며, 난이도 레이어를 쉽게(easy) 낮추면 더 편안해요.',
        };
      }
      return { status: 'safe', reasonKo: check.reasonKo };
    }

    case 'senior-comfort': {
      const check = isSeniorUnsafe(exercise);
      if (check.unsafe) {
        return { status: 'swap-recommended', reasonKo: check.reasonKo };
      }
      if (step.selectedLayer !== 'easy') {
        return {
          status: 'layer-adjust',
          reasonKo: '안정적인 동작이며, 난이도 레이어를 쉽게(easy)로 맞추면 관절 부담이 더 줄어들어요.',
        };
      }
      return { status: 'safe', reasonKo: check.reasonKo };
    }

    case 'core-glute-sculpt': {
      // Preserve opening warm-up (warm-up prerequisite before high-RPE work) and closing cooldown
      const isOpeningWarmup = indexInNonRest === 0 && exercise.blockCategory === 'warmup';
      const isClosingCooldown =
        indexInNonRest === totalNonRest - 1 &&
        totalNonRest > 1 &&
        exercise.blockCategory === 'cooldown';
      if (isOpeningWarmup) {
        return {
          status: 'safe',
          reasonKo: '본 운동 전 호흡과 코어를 깨우는 필수 예열 구간으로 유지해요.',
        };
      }
      if (isClosingCooldown) {
        return {
          status: 'safe',
          reasonKo: '수업 후 근육을 정리하는 마무리 스트레칭 구간으로 유지해요.',
        };
      }

      const neutralOnly =
        exercise.spinalPlanes.length === 1 && exercise.spinalPlanes[0] === 'neutral';
      const lowLoadExtraBlock =
        exercise.blockCategory === 'warmup' ||
        exercise.blockCategory === 'cooldown' ||
        exercise.blockCategory === 'feet-in-straps';
      const nonCoreGluteBeginner =
        exercise.level === '1.0' &&
        exercise.anatomyInsight.anatomyVisualZone !== 'core' &&
        exercise.anatomyInsight.anatomyVisualZone !== 'glutes';

      if (lowLoadExtraBlock || (neutralOnly && !isCoreGluteStrong(exercise)) || nonCoreGluteBeginner) {
        return {
          status: 'swap-recommended',
          reasonKo:
            '중립·저강도 비중이 높은 구간 → 코어 중심과 둔근 수축을 탄탄하게 채우는 시그니처 동작으로 업그레이드 권장',
        };
      }
      if (step.selectedLayer !== 'hard') {
        return {
          status: 'layer-adjust',
          reasonKo: '코어·힙업 방향에 잘 맞으며, 심화(hard) 레이어를 제안해 자극을 높일 수 있어요.',
        };
      }
      return {
        status: 'safe',
        reasonKo: '코어와 둔근을 탄탄하게 자극하는 구성이에요.',
      };
    }
  }
}

function scoreCandidateForPreset(
  candidate: WorldPilatesExercise,
  original: WorldPilatesExercise,
  presetId: ClientGoalPresetId,
  usedArchetypes: ReadonlySet<string>,
): { score: number; benefitKo: string } | null {
  const text = buildExerciseText(candidate);
  const sameApparatus = candidate.apparatus === original.apparatus;
  const sameBlock = candidate.blockCategory === original.blockCategory;
  const hasArtwork = Boolean(resolveExerciseArtworkSrc(candidate));
  let score = 0;

  if (sameApparatus) {
    score += 48;
  } else if (candidate.apparatus === 'mat') {
    score += 10;
  }

  if (!usedArchetypes.has(candidate.parentArchetypeId)) {
    score += 12;
  }
  if (hasArtwork) {
    score += 6;
  }

  switch (presetId) {
    case 'round-shoulder': {
      if (isNeckFlexionHeavy(candidate) || candidate.blockCategory === 'plank') return null;
      const hasExtension = candidate.spinalPlanes.includes('extension');
      const hasRotation = candidate.spinalPlanes.includes('rotation');
      const zone = candidate.anatomyInsight.anatomyVisualZone;
      const keywordMatch = THORACIC_OPENING_RE.test(text);
      if (!hasExtension && !hasRotation && zone !== 'shoulder' && zone !== 'spine' && !keywordMatch) {
        return null;
      }
      if (hasExtension) score += 28;
      if (hasRotation) score += 14;
      if (zone === 'shoulder' || zone === 'spine') score += 16;
      if (keywordMatch) score += 18;
      if (sameBlock) score += 10;
      else if (
        candidate.blockCategory === 'extension' ||
        candidate.blockCategory === 'upper-body' ||
        candidate.blockCategory === 'cooldown'
      ) {
        score += 12;
      }
      if (candidate.level === original.level) score += 6;
      else if (candidate.level !== '2.0') score += 4;

      const benefitKo = hasExtension
        ? `${APPARATUS_LABELS[candidate.apparatus].short}에서 흉추를 부드럽게 펴고 견갑 후면을 안정시켜요.`
        : `${APPARATUS_LABELS[candidate.apparatus].short}에서 목 부담 없이 상체 가동성과 어깨 정렬을 열어요.`;
      return { score, benefitKo };
    }

    case 'pelvic-balance': {
      const unilateralMatch = candidate.isUnilateral || UNILATERAL_GLUTE_RE.test(text);
      const sideLyingMatch = candidate.bodyPosition === 'side-lying';
      if (!unilateralMatch && !sideLyingMatch) return null;
      if (candidate.blockCategory === 'warmup' || candidate.blockCategory === 'cooldown') return null;

      if (candidate.isUnilateral) score += 28;
      if (sideLyingMatch) score += 16;
      if (UNILATERAL_GLUTE_RE.test(text)) score += 20;
      if (
        candidate.anatomyInsight.anatomyVisualZone === 'glutes' ||
        candidate.anatomyInsight.anatomyVisualZone === 'hip'
      ) {
        score += 16;
      }
      if (sameBlock) score += 18;
      else if (
        candidate.blockCategory === 'lower-body' ||
        candidate.blockCategory === 'bridging' ||
        candidate.blockCategory === 'footwork' ||
        candidate.blockCategory === 'feet-in-straps'
      ) {
        score += 10;
      }
      if (candidate.level === original.level) score += 6;

      return {
        score,
        benefitKo: `좌우를 나눠 진행하며 골반 수평 유지와 중둔근 균형을 촘촘하게 보강해요.`,
      };
    }

    case 'prenatal-gentle': {
      if (!PRENATAL_SAFE_POSITIONS.has(candidate.bodyPosition)) return null;
      if (candidate.level === '2.0') return null;
      if (candidate.blockCategory === 'plank') return null;
      if (INVERSION_HIGH_PRESSURE_RE.test(text)) return null;
      if (candidate.blockCategory === 'core' && candidate.spinalPlanes.includes('flexion')) {
        return null;
      }

      if (PRENATAL_TOP_POSITIONS.has(candidate.bodyPosition)) score += 28;
      else score += 10;

      if (candidate.level === '1.0') score += 20;
      if (sameBlock) score += 16;
      else if (
        candidate.blockCategory === 'warmup' ||
        candidate.blockCategory === 'upper-body' ||
        candidate.blockCategory === 'lower-body' ||
        candidate.blockCategory === 'cooldown'
      ) {
        score += 8;
      }
      if (candidate.variationKind === 'regression-supported' || candidate.tier === 'atomic') {
        score += 8;
      }

      const posKo = PLAIN_POSITION_KO[candidate.bodyPosition];
      return {
        score,
        benefitKo: `${posKo} 기반 저충격 동작으로 복부 압력을 낮추고 호흡 흐름을 편안하게 지켜요.`,
      };
    }

    case 'senior-comfort': {
      if (candidate.level === '2.0') return null;
      if (candidate.blockCategory === 'plank') return null;
      if (SENIOR_HIGH_LOAD_RE.test(text)) return null;
      if (
        candidate.blockCategory === 'extension' &&
        candidate.bodyPosition === 'prone' &&
        candidate.level !== '1.0'
      ) {
        return null;
      }

      if (candidate.level === '1.0') score += 32;
      if (candidate.variationKind === 'regression-supported') score += 14;
      else if (candidate.tier === 'atomic') score += 8;
      if (
        candidate.bodyPosition === 'seated' ||
        candidate.bodyPosition === 'supine' ||
        candidate.bodyPosition === 'side-lying'
      ) {
        score += 12;
      }
      if (sameBlock) score += 16;
      else if (
        candidate.blockCategory === 'footwork' ||
        candidate.blockCategory === 'bridging' ||
        candidate.blockCategory === 'upper-body' ||
        candidate.blockCategory === 'lower-body' ||
        candidate.blockCategory === 'cooldown'
      ) {
        score += 8;
      }

      const posKo = PLAIN_POSITION_KO[candidate.bodyPosition];
      return {
        score,
        benefitKo: `입문(1.0) ${posKo} 지지 구성으로 관절 부담을 줄이고 안정적인 움직임을 도와요.`,
      };
    }

    case 'core-glute-sculpt': {
      const zone = candidate.anatomyInsight.anatomyVisualZone;
      const isSculptBlock =
        candidate.blockCategory === 'core' ||
        candidate.blockCategory === 'bridging' ||
        candidate.blockCategory === 'lower-body' ||
        candidate.blockCategory === 'plank';
      if (zone !== 'core' && zone !== 'glutes' && !isSculptBlock) return null;
      if (candidate.blockCategory === 'warmup' || candidate.blockCategory === 'cooldown') return null;

      if (zone === 'core' || zone === 'glutes') score += 26;
      if (isSculptBlock) score += 16;
      if (candidate.favoriteTag === 'burn-sculpt' || candidate.favoriteTag === 'signature') {
        score += 16;
      }
      if (candidate.level === '1.5') score += 14;
      else if (candidate.level === '2.0') score += 12;
      else score += 4;
      if (CORE_GLUTE_SCULPT_RE.test(text)) score += 10;
      if (sameBlock) score += 8;

      const focusLabel = zone === 'glutes' ? '둔근·하체 후면' : '심부 코어·복부';
      return {
        score,
        benefitKo: `${focusLabel} 자극을 또렷하게 채워 탄탄한 수업 밀도를 완성해요.`,
      };
    }
  }
}

function buildUnifiedPool(
  unifiedPool: readonly PilatesExercise[],
  exercisesById: ExerciseLookupInput,
): readonly WorldPilatesExercise[] {
  const seen = new Set<string>();
  const out: WorldPilatesExercise[] = [];

  for (const ex of unifiedPool) {
    if (seen.has(ex.id)) continue;
    seen.add(ex.id);
    out.push(toWorldExercise(ex));
  }

  if (exercisesById instanceof Map) {
    for (const ex of exercisesById.values()) {
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      out.push(toWorldExercise(ex));
    }
  } else {
    for (const ex of Object.values(exercisesById)) {
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      out.push(toWorldExercise(ex));
    }
  }

  return out;
}

export function analyzeSequenceForClientGoal(
  steps: readonly SequenceStep[],
  exercisesById: ExerciseLookupInput,
  presetId: ClientGoalPresetId,
  unifiedPool: readonly PilatesExercise[] = WORLD_PILATES_EXERCISES,
): ClientGoalTuningAnalysis {
  const preset = getClientGoalPreset(presetId);
  const pool = buildUnifiedPool(unifiedPool, exercisesById);

  const nonRestEntries: Array<{ step: SequenceStep; exercise: WorldPilatesExercise }> = [];
  let restStepCount = 0;

  for (const step of steps) {
    if (isRestStep(step)) {
      restStepCount += 1;
      continue;
    }
    const found = lookupExercise(exercisesById, step.exerciseId);
    if (!found) continue;
    nonRestEntries.push({ step, exercise: toWorldExercise(found) });
  }

  const usedExerciseIds = new Set<string>(nonRestEntries.map((item) => item.exercise.id));
  const usedArchetypes = new Set<string>(
    nonRestEntries.map((item) => getArchetypeKey(item.exercise)),
  );

  const stepAssessments: ClientGoalStepAssessment[] = [];
  const swaps: ClientGoalSwapProposal[] = [];
  let bilateralSwappedCount = 0;
  let layerAdjustmentsCount = 0;

  for (let i = 0; i < nonRestEntries.length; i += 1) {
    const { step, exercise } = nonRestEntries[i]!;
    const assessment = assessStepForPreset(
      step,
      exercise,
      presetId,
      i,
      nonRestEntries.length,
      bilateralSwappedCount,
    );

    if (assessment.status === 'layer-adjust') {
      layerAdjustmentsCount += 1;
    }

    const springHintForExisting = suggestSpringAdjustmentForPreset(
      step.customSpringOverride || exercise.springs,
      exercise.apparatus,
      exercise.bodyPosition,
      exercise.blockCategory,
      presetId,
    );

    stepAssessments.push({
      stepId: step.stepId,
      order: step.order,
      step,
      exercise,
      status: assessment.status,
      reasonKo: assessment.reasonKo,
      recommendedLayer:
        assessment.status === 'safe' ? step.selectedLayer : preset.defaultLayerMode,
      recommendedSpringOverride: springHintForExisting.springOverride,
    });

    if (assessment.status !== 'swap-recommended') {
      continue;
    }

    // Find best non-duplicate Plan B replacement across unified 1,752 pool
    let bestCandidate: WorldPilatesExercise | null = null;
    let bestScore = -Infinity;
    let bestBenefitKo = '';

    for (const candidate of pool) {
      if (candidate.id === exercise.id) continue;
      if (usedExerciseIds.has(candidate.id)) continue;

      const scored = scoreCandidateForPreset(candidate, exercise, presetId, usedArchetypes);
      if (!scored) continue;

      if (scored.score > bestScore) {
        bestScore = scored.score;
        bestCandidate = candidate;
        bestBenefitKo = scored.benefitKo;
      }
    }

    if (!bestCandidate) {
      continue;
    }

    usedExerciseIds.add(bestCandidate.id);
    usedArchetypes.add(bestCandidate.parentArchetypeId);
    if (presetId === 'pelvic-balance') {
      bilateralSwappedCount += 1;
    }

    const springGuide = suggestSpringAdjustmentForPreset(
      bestCandidate.springs,
      bestCandidate.apparatus,
      bestCandidate.bodyPosition,
      bestCandidate.blockCategory,
      presetId,
    );

    swaps.push({
      stepId: step.stepId,
      order: step.order,
      originalStep: step,
      originalExercise: exercise,
      replacementExercise: bestCandidate,
      reasonKo: assessment.reasonKo,
      benefitKo: bestBenefitKo,
      sameApparatus: bestCandidate.apparatus === exercise.apparatus,
      sameBlockCategory: bestCandidate.blockCategory === exercise.blockCategory,
      recommendedLayer: preset.defaultLayerMode,
      recommendedSpringOverride: springGuide.springOverride,
      springNoteKo: springGuide.springNoteKo,
      recommendedSideMode:
        presetId === 'pelvic-balance' && bestCandidate.isUnilateral
          ? 'left-then-right'
          : undefined,
      originalArtworkSrc: resolveExerciseArtworkSrc(exercise),
      replacementArtworkSrc: resolveExerciseArtworkSrc(bestCandidate),
      defaultSelected: true,
    });
  }

  const totalExerciseSteps = nonRestEntries.length;
  const flaggedCount = swaps.length;
  const safeStepCount = Math.max(0, totalExerciseSteps - flaggedCount);

  const safetyFitScore =
    totalExerciseSteps === 0
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((safeStepCount - layerAdjustmentsCount * 0.25) / totalExerciseSteps) * 100,
            ),
          ),
        );

  const projectedFitScore =
    totalExerciseSteps === 0
      ? 100
      : Math.min(100, Math.max(safetyFitScore, Math.round(((safeStepCount + flaggedCount) / totalExerciseSteps) * 100)));

  let summaryHeadlineKo: string;
  if (totalExerciseSteps === 0) {
    summaryHeadlineKo = '현재 시퀀스에 동작이 없어요. 동작을 추가하면 맞춤 치환을 바로 분석해 드려요.';
  } else if (flaggedCount > 0) {
    summaryHeadlineKo = `총 ${totalExerciseSteps}개 동작 중 ${flaggedCount}개 구간을 ‘${preset.shortLabelKo}’ 맞춤 동작으로 바꾸면 더 안정적으로 진행할 수 있어요.`;
  } else if (layerAdjustmentsCount > 0) {
    const layerNameKo =
      preset.defaultLayerMode === 'easy'
        ? '쉽게(easy)'
        : preset.defaultLayerMode === 'hard'
          ? '심화(hard)'
          : '기본(standard)';
    summaryHeadlineKo = `동작 구성은 이미 잘 맞아요. ${layerAdjustmentsCount}개 동작의 난이도 레이어만 ${layerNameKo}로 맞추면 바로 수업할 수 있어요.`;
  } else {
    summaryHeadlineKo = `현재 시퀀스(${totalExerciseSteps}개 동작)는 ‘${preset.shortLabelKo}’ 기준에 이미 잘 맞아요.`;
  }

  return {
    preset,
    totalExerciseSteps,
    restStepCount,
    flaggedCount,
    safeStepCount,
    layerAdjustmentsCount,
    safetyFitScore,
    projectedFitScore,
    summaryHeadlineKo,
    stepAssessments,
    swaps,
    catalogPoolSize: pool.length,
  };
}

export function buildClientGoalTuningSummaryKo(
  preset: ClientGoalPresetDefinition,
  appliedSwapCount: number,
  layerAdjustedCount: number,
): string {
  if (appliedSwapCount > 0 && layerAdjustedCount > 0) {
    const layerLabel =
      preset.defaultLayerMode === 'easy'
        ? '쉽게(easy)'
        : preset.defaultLayerMode === 'hard'
          ? '심화(hard)'
          : '기본';
    return `‘${preset.shortLabelKo}’ 기준으로 ${appliedSwapCount}개 동작을 안전 치환하고 ${layerAdjustedCount}개 동작 레이어를 ${layerLabel}로 맞췄어요.`;
  }
  if (appliedSwapCount > 0) {
    return `‘${preset.shortLabelKo}’ 기준으로 ${appliedSwapCount}개 동작을 맞춤 치환했어요.`;
  }
  if (layerAdjustedCount > 0) {
    const layerLabel =
      preset.defaultLayerMode === 'easy'
        ? '쉽게(easy)'
        : preset.defaultLayerMode === 'hard'
          ? '심화(hard)'
          : '기본';
    return `‘${preset.shortLabelKo}’ 기준으로 ${layerAdjustedCount}개 동작의 난이도 레이어를 ${layerLabel}로 전환했어요.`;
  }
  return `‘${preset.shortLabelKo}’ 변경 항목이 선택되지 않았어요.`;
}

export function applyClientGoalTuning(
  steps: readonly SequenceStep[],
  swaps: readonly ClientGoalSwapProposal[],
  selectedStepIds: readonly string[] | ReadonlySet<string>,
  options?: ApplyClientGoalTuningOptions,
): SequenceStep[] {
  const selectedSet =
    selectedStepIds instanceof Set ? selectedStepIds : new Set<string>(selectedStepIds);
  const swapsByStepId = new Map<string, ClientGoalSwapProposal>();
  for (const swap of swaps) {
    if (selectedSet.has(swap.stepId)) {
      swapsByStepId.set(swap.stepId, swap);
    }
  }

  const unchangedLayer = options?.applyLayerToUnchangedSteps ?? null;

  return steps.map((step, index) => {
    const cloned = structuredClone(step);
    cloned.order = index + 1;

    if (isRestStep(cloned)) {
      return cloned;
    }

    const swap = swapsByStepId.get(cloned.stepId);
    if (swap) {
      cloned.exerciseId = swap.replacementExercise.id;
      cloned.blockCategory = swap.replacementExercise.blockCategory;
      cloned.selectedLayer = swap.recommendedLayer;

      if (swap.recommendedSpringOverride) {
        cloned.customSpringOverride = swap.recommendedSpringOverride;
      } else {
        delete cloned.customSpringOverride;
      }

      if (swap.recommendedSideMode) {
        cloned.sideMode = swap.recommendedSideMode;
      }

      // Clear stale hardware/motion bindings from the previous exercise
      delete cloned.motionStudy;
      delete cloned.footbarOverride;
      delete cloned.headrestOverride;
      delete cloned.boxOverride;
      delete cloned.propOverride;

      if (swap.springNoteKo) {
        cloned.instructorNote = cloned.instructorNote
          ? `${cloned.instructorNote} · ${swap.springNoteKo}`
          : swap.springNoteKo;
      }

      return cloned;
    }

    if (unchangedLayer && cloned.selectedLayer !== unchangedLayer) {
      cloned.selectedLayer = unchangedLayer;
    }

    return cloned;
  });
}
