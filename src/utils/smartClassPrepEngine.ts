import { APPARATUS_LABELS, CANONICAL_BLOCKS } from '../data/pilatesCatalog';

const PLAIN_POSITION_KO: Readonly<Record<BodyPosition, string>> = {
  supine: '누운 자세',
  prone: '엎드린 자세',
  'side-lying': '옆으로 누운 자세',
  seated: '앉은 자세',
  kneeling: '무릎 선 자세',
  standing: '선 자세',
  quadruped: '네발기기',
};
import { getExerciseEquipment } from '../data/equipmentCatalog';
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
  ClassHistoryLog,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { getMovementKey, isRestStep } from './sequenceEngine';

export type FourSpinalPlane = 'flexion' | 'extension' | 'lateral' | 'rotation';

export interface SpinalPlaneBalanceItem {
  readonly plane: FourSpinalPlane;
  readonly labelKo: string;
  readonly count: number;
  readonly ratioPercent: number;
  readonly covered: boolean;
}

export interface MissingBlockItem {
  readonly category: ClassBlockCategory;
  readonly labelKo: string;
}

export interface SmartCoachRecommendation {
  readonly exercise: WorldPilatesExercise;
  readonly score: number;
  readonly sameApparatus: boolean;
  readonly zeroSpringChange: boolean;
  readonly sameBodyPosition: boolean;
  readonly unusedInRecent3: boolean;
  readonly fillsMissingPlane: FourSpinalPlane | null;
  readonly fillsMissingBlock: ClassBlockCategory | null;
  readonly badgesKo: readonly string[];
  readonly reasonKo: string;
}

export interface SmartClassPrepInput {
  readonly activeSteps: readonly SequenceStep[];
  readonly historyLogs: readonly ClassHistoryLog[];
  readonly catalog?: readonly PilatesExercise[];
  readonly activeApparatus?: ApparatusType | 'mixed';
  readonly activeLevel?: DifficultyLevel;
  readonly targetGroupId?: string;
  readonly ownedEquipment?: readonly string[];
  readonly ownedProps?: readonly PropType[];
  readonly limit?: number;
}

export interface SmartClassPrepAnalysis {
  readonly analyzedStepCount: number;
  readonly plannedMinutes: number;
  readonly catalogSize: number;
  readonly recentClassesAnalyzed: number;
  readonly recentUsedExerciseCount: number;
  readonly repeatedFromRecent3Count: number;
  readonly targetApparatus: ApparatusType | 'mixed';
  readonly anchorExercise: PilatesExercise | null;
  readonly anchorSpring: string | null;
  readonly anchorBodyPosition: BodyPosition | null;
  readonly spinalBalance: readonly SpinalPlaneBalanceItem[];
  readonly coveredPlaneCount: number;
  readonly missingPlanes: readonly FourSpinalPlane[];
  readonly missingKeyBlocks: readonly MissingBlockItem[];
  readonly diagnosisHeadlineKo: string;
  readonly warmupPrereqNoticeKo: string | null;
  readonly recommendations: readonly SmartCoachRecommendation[];
}

const FOUR_PLANES: readonly { readonly plane: FourSpinalPlane; readonly labelKo: string }[] = [
  { plane: 'flexion', labelKo: '굴곡' },
  { plane: 'extension', labelKo: '신전' },
  { plane: 'lateral', labelKo: '측굴' },
  { plane: 'rotation', labelKo: '회전' },
];

const PLANE_LABEL_KO: Readonly<Record<FourSpinalPlane, string>> = {
  flexion: '굴곡',
  extension: '신전',
  lateral: '측굴',
  rotation: '회전',
};

const KEY_CLASS_BLOCKS: readonly {
  readonly category: ClassBlockCategory;
  readonly labelKo: string;
  readonly equivalents?: readonly ClassBlockCategory[];
}[] = [
  { category: 'warmup', labelKo: '워밍업 · 호흡', equivalents: ['warmup', 'footwork'] },
  { category: 'core', labelKo: '코어 · 복부' },
  { category: 'extension', labelKo: '척추 신전 · 후면' },
  { category: 'lower-body', labelKo: '하체 · 둔근', equivalents: ['lower-body', 'bridging'] },
  { category: 'cooldown', labelKo: '마무리 · 쿨다운', equivalents: ['cooldown', 'feet-in-straps'] },
];

const ADJACENT_POSITIONS: Readonly<Record<BodyPosition, readonly BodyPosition[]>> = {
  supine: ['supine', 'side-lying', 'seated'],
  'side-lying': ['side-lying', 'supine', 'prone', 'kneeling'],
  prone: ['prone', 'quadruped', 'side-lying', 'kneeling'],
  quadruped: ['quadruped', 'kneeling', 'prone'],
  kneeling: ['kneeling', 'quadruped', 'seated', 'standing'],
  seated: ['seated', 'supine', 'kneeling'],
  standing: ['standing', 'kneeling'],
};

const BLOCK_ORDER_INDEX: Readonly<Record<ClassBlockCategory, number>> = Object.fromEntries(
  CANONICAL_BLOCKS.map((item, idx) => [item.category, idx]),
) as Record<ClassBlockCategory, number>;

const BODYWEIGHT_SPRING_RE = /^(?:$|bodyweight|맨몸|매트\s*체중\s*저항|바렐\s*지지\s*체중\s*저항|스프링\s*없음)$/i;

export function normalizeSpringSignature(raw?: string | null): string {
  const cleaned = (raw ?? '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (BODYWEIGHT_SPRING_RE.test(cleaned)) return 'bodyweight';
  return cleaned.toLowerCase();
}

function levelRank(level: DifficultyLevel): number {
  return level === '1.0' ? 1 : level === '1.5' ? 2 : 3;
}

function toWorldExercise(ex: PilatesExercise | WorldPilatesExercise): WorldPilatesExercise {
  const known = WORLD_PILATES_BY_ID.get(ex.id);
  if (known) {
    // Preserve any user-edited favoriteTag/springs/notes from store while attaching world metadata
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
  if ('anatomyInsight' in ex && 'tier' in ex) return ex;
  return {
    ...ex,
    anatomyInsight: getExerciseAnatomyInsight(ex),
    tier: 'atomic',
    parentArchetypeId: ex.id,
    schoolTag: 'korean-studio',
    variationKind: 'archetype',
  };
}

function buildUnifiedWorldPool(catalog?: readonly PilatesExercise[]): {
  readonly pool: readonly WorldPilatesExercise[];
  readonly byId: ReadonlyMap<string, WorldPilatesExercise>;
} {
  const byId = new Map<string, WorldPilatesExercise>();
  const pool: WorldPilatesExercise[] = [];

  if (catalog) {
    for (const item of catalog) {
      if (byId.has(item.id)) continue;
      const wrapped = toWorldExercise(item);
      byId.set(wrapped.id, wrapped);
      pool.push(wrapped);
    }
  }
  for (const worldEx of WORLD_PILATES_EXERCISES) {
    if (byId.has(worldEx.id)) continue;
    byId.set(worldEx.id, worldEx);
    pool.push(worldEx);
  }
  return { pool, byId };
}

function isSpinalFourPlane(plane: SpinalPlane): plane is FourSpinalPlane {
  return plane === 'flexion' || plane === 'extension' || plane === 'lateral' || plane === 'rotation';
}

function formatSpringLabel(raw?: string | null): string {
  const normalized = normalizeSpringSignature(raw);
  if (normalized === 'bodyweight') return '맨몸';
  return (raw ?? '').trim();
}

/**
 * Analyzes the active class sequence, the most recent 3 history logs, and the
 * unified 1,752-movement Pilates repertoire to compute real 4-plane spinal balance
 * and top-4 low-transition, non-repeating next movement recommendations.
 */
export function analyzeSmartClassPrep(input: SmartClassPrepInput): SmartClassPrepAnalysis {
  const {
    activeSteps,
    historyLogs,
    catalog,
    activeApparatus = 'reformer',
    activeLevel = '2.0',
    targetGroupId,
    ownedEquipment,
    ownedProps,
    limit = 4,
  } = input;

  const { pool, byId } = buildUnifiedWorldPool(catalog);

  // 1. Inspect up to the 3 most recent taught classes (scoped by group if specified)
  const scopedLogs = (
    targetGroupId && targetGroupId !== 'all'
      ? historyLogs.filter((log) => log.groupId === targetGroupId)
      : historyLogs
  )
    .slice()
    .sort((a, b) => b.taughtAt.localeCompare(a.taughtAt))
    .slice(0, 3);

  const recent3Ids = new Set<string>();
  for (const log of scopedLogs) {
    for (const id of log.exerciseIds) {
      if (id) recent3Ids.add(id);
    }
    if (log.stepsSnapshot) {
      for (const step of log.stepsSnapshot) {
        if (!isRestStep(step) && step.exerciseId) recent3Ids.add(step.exerciseId);
      }
    }
  }

  // 2. Analyze active sequence steps (non-rest movements)
  const activeMovementSteps = activeSteps.filter((step) => !isRestStep(step) && Boolean(step.exerciseId));
  const plannedMinutes = Math.round(
    activeSteps.reduce((acc, step) => acc + (Number.isFinite(step.durationMin) ? step.durationMin : 0), 0),
  );

  const planeCounts: Record<FourSpinalPlane, number> = {
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
  };
  const presentBlocks = new Set<ClassBlockCategory>();
  const activeExerciseIds = new Set<string>();
  const activeMovementKeys = new Set<string>();
  const activeArchetypeIds = new Set<string>();
  let repeatedFromRecent3Count = 0;

  const resolvedActiveExercises: WorldPilatesExercise[] = [];
  for (const step of activeMovementSteps) {
    activeExerciseIds.add(step.exerciseId);
    if (recent3Ids.has(step.exerciseId)) repeatedFromRecent3Count += 1;
    const ex = byId.get(step.exerciseId);
    if (!ex) continue;
    resolvedActiveExercises.push(ex);
    presentBlocks.add(step.blockCategory || ex.blockCategory);
    activeMovementKeys.add(getMovementKey(ex));
    activeArchetypeIds.add(ex.parentArchetypeId);

    const uniquePlanes = new Set<FourSpinalPlane>();
    for (const plane of ex.spinalPlanes) {
      if (isSpinalFourPlane(plane)) uniquePlanes.add(plane);
    }
    for (const plane of uniquePlanes) {
      planeCounts[plane] += 1;
    }
  }

  const totalPlaneHits =
    planeCounts.flexion + planeCounts.extension + planeCounts.lateral + planeCounts.rotation;

  const spinalBalance: SpinalPlaneBalanceItem[] = FOUR_PLANES.map(({ plane, labelKo }) => {
    const count = planeCounts[plane];
    return {
      plane,
      labelKo,
      count,
      ratioPercent: totalPlaneHits > 0 ? Math.round((count / totalPlaneHits) * 100) : 0,
      covered: count > 0,
    };
  });

  const missingPlanes: FourSpinalPlane[] = spinalBalance
    .filter((item) => !item.covered)
    .map((item) => item.plane);
  const coveredPlaneCount = 4 - missingPlanes.length;

  const missingKeyBlocks: MissingBlockItem[] = KEY_CLASS_BLOCKS.filter((block) => {
    const allowed = block.equivalents ?? [block.category];
    return !allowed.some((cat) => presentBlocks.has(cat));
  }).map(({ category, labelKo }) => ({ category, labelKo }));

  // Warm-up prerequisite check (non-medical coaching safety reminder)
  const hasWarmupOpening = presentBlocks.has('warmup') || presentBlocks.has('footwork');
  const hasHighIntensityExtensionOrPlank = resolvedActiveExercises.some(
    (ex) =>
      (ex.blockCategory === 'extension' ||
        ex.blockCategory === 'plank' ||
        ex.spinalPlanes.includes('extension')) &&
      ex.level === '2.0',
  );
  const warmupPrereqNoticeKo =
    resolvedActiveExercises.length > 0 && !hasWarmupOpening && hasHighIntensityExtensionOrPlank
      ? '고강도 신전·플랭크 동작 앞에 워밍업(호흡·풋워크)이 비어 있어요. 가벼운 예열 동작을 먼저 배치해 관절과 호흡을 열어주세요.'
      : null;

  // 3. Identify anchor context from the last active step
  const anchorStep = activeMovementSteps.at(-1) ?? null;
  const anchorExercise = anchorStep ? (byId.get(anchorStep.exerciseId) ?? null) : null;
  const anchorSpring = anchorStep
    ? anchorStep.customSpringOverride?.trim() || anchorExercise?.springs || null
    : null;
  const anchorSpringSig = anchorSpring ? normalizeSpringSignature(anchorSpring) : null;
  const anchorBodyPosition = anchorExercise?.bodyPosition ?? null;

  const preferredApparatus: ApparatusType | null =
    activeApparatus !== 'mixed'
      ? activeApparatus
      : anchorExercise?.apparatus ?? null;

  const maxLevelRank = levelRank(activeLevel);
  const missingPlaneSet = new Set<FourSpinalPlane>(missingPlanes);
  const missingBlockSet = new Set<ClassBlockCategory>(missingKeyBlocks.map((b) => b.category));
  const anchorBlockOrder = anchorExercise ? BLOCK_ORDER_INDEX[anchorExercise.blockCategory] : -1;

  // 4. Score candidates from unified 1,752 catalog
  interface ScoredCandidate {
    readonly exercise: WorldPilatesExercise;
    readonly score: number;
    readonly sameApparatus: boolean;
    readonly zeroSpringChange: boolean;
    readonly sameBodyPosition: boolean;
    readonly unusedInRecent3: boolean;
    readonly fillsMissingPlane: FourSpinalPlane | null;
    readonly fillsMissingBlock: ClassBlockCategory | null;
  }

  const ownedEqSet = ownedEquipment && ownedEquipment.length > 0 ? new Set(ownedEquipment) : null;
  const ownedPropSet = ownedProps && ownedProps.length > 0 ? new Set(ownedProps) : null;

  const scored: ScoredCandidate[] = [];

  for (const cand of pool) {
    if (activeExerciseIds.has(cand.id)) continue;
    // Avoid exact same movement family already in sequence (appendExerciseToSequence rejects family duplicates)
    if (activeMovementKeys.has(getMovementKey(cand))) continue;

    // Respect owned equipment & props when provided so 1-tap add succeeds cleanly
    const eqMeta = getExerciseEquipment(cand);
    if (ownedEqSet && !eqMeta.requiredEquipment.every((id) => ownedEqSet.has(id))) {
      continue;
    }
    if (ownedPropSet && !eqMeta.requiredProps.every((prop) => ownedPropSet.has(prop))) {
      continue;
    }

    const candLevelRank = levelRank(cand.level);
    // Keep within active level ceiling so store append validation passes
    if (candLevelRank > maxLevelRank) continue;

    const sameApparatus = preferredApparatus ? cand.apparatus === preferredApparatus : true;
    // If the class is fixed to a single apparatus, keep recommendations strictly on that apparatus
    if (activeApparatus !== 'mixed' && !sameApparatus) continue;

    const candSpringSig = normalizeSpringSignature(cand.springs);
    const zeroSpringChange = anchorExercise
      ? cand.apparatus === anchorExercise.apparatus &&
        (cand.apparatus === 'mat' ||
          cand.apparatus === 'barrel' ||
          (anchorSpringSig !== null && candSpringSig === anchorSpringSig))
      : cand.apparatus === 'mat' || cand.apparatus === 'barrel';

    const sameBodyPosition = anchorBodyPosition ? cand.bodyPosition === anchorBodyPosition : false;
    const adjacentBodyPosition =
      anchorBodyPosition !== null &&
      !sameBodyPosition &&
      ADJACENT_POSITIONS[anchorBodyPosition].includes(cand.bodyPosition);

    const unusedInRecent3 = !recent3Ids.has(cand.id);

    const matchedMissingPlane =
      cand.spinalPlanes.find((p): p is FourSpinalPlane => isSpinalFourPlane(p) && missingPlaneSet.has(p)) ??
      null;

    const matchedMissingBlock = missingBlockSet.has(cand.blockCategory) ? cand.blockCategory : null;

    let score = 0;

    if (sameApparatus) score += 90;
    else score -= 40;

    if (zeroSpringChange) score += 85;
    if (sameBodyPosition) score += 72;
    else if (adjacentBodyPosition) score += 22;

    if (unusedInRecent3) score += 70;
    else score -= 140;

    if (matchedMissingPlane) {
      score += 48;
      // Extra boost if it covers multiple missing planes
      const missingCovered = cand.spinalPlanes.filter(
        (p): p is FourSpinalPlane => isSpinalFourPlane(p) && missingPlaneSet.has(p),
      ).length;
      if (missingCovered > 1) score += 14;
    }

    if (matchedMissingBlock) score += 28;

    // Same box setup on reformer avoids extra hardware transition
    if (anchorExercise && cand.apparatus === 'reformer' && cand.box === anchorExercise.box) {
      score += 18;
    }

    // Sequence flow progression bonus
    if (activeMovementSteps.length === 0) {
      if (cand.blockCategory === 'warmup' || cand.blockCategory === 'footwork') {
        score += 55;
      }
      if (cand.level === '2.0' && (cand.blockCategory === 'extension' || cand.blockCategory === 'plank')) {
        score -= 50;
      }
    } else {
      const candBlockOrder = BLOCK_ORDER_INDEX[cand.blockCategory];
      if (candBlockOrder >= anchorBlockOrder && candBlockOrder <= anchorBlockOrder + 3) {
        score += 16;
      }
      if (!hasWarmupOpening && (cand.blockCategory === 'warmup' || cand.blockCategory === 'footwork')) {
        score += 36;
      }
      if (!hasWarmupOpening && cand.level === '2.0' && cand.blockCategory === 'extension') {
        score -= 45;
      }
    }

    // Prefer fresh archetypes over repeating same parent family
    if (activeArchetypeIds.has(cand.parentArchetypeId)) {
      score -= 35;
    }

    // Slight preference for atomic canonical movements when scores tie
    if (cand.tier === 'atomic') score += 8;

    scored.push({
      exercise: cand,
      score,
      sameApparatus,
      zeroSpringChange,
      sameBodyPosition,
      unusedInRecent3,
      fillsMissingPlane: matchedMissingPlane,
      fillsMissingBlock: matchedMissingBlock,
    });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.unusedInRecent3) - Number(a.unusedInRecent3) ||
      Number(b.zeroSpringChange) - Number(a.zeroSpringChange) ||
      Number(b.sameBodyPosition) - Number(a.sameBodyPosition) ||
      a.exercise.id.localeCompare(b.exercise.id),
  );

  // 5. Pick Top-N with archetype & plane diversity so the 4 cards feel curated
  const safeLimit = Math.max(1, Math.min(8, Math.floor(limit)));
  const selected: ScoredCandidate[] = [];
  const usedArchetypes = new Set<string>();
  const usedMovementKeys = new Set<string>();

  // Pass A: distinct parent archetype & distinct movement key
  for (const item of scored) {
    if (selected.length >= safeLimit) break;
    const mKey = getMovementKey(item.exercise);
    if (usedArchetypes.has(item.exercise.parentArchetypeId) || usedMovementKeys.has(mKey)) {
      continue;
    }
    selected.push(item);
    usedArchetypes.add(item.exercise.parentArchetypeId);
    usedMovementKeys.add(mKey);
  }

  // Pass B: fallback if strict diversity yielded fewer than safeLimit
  if (selected.length < safeLimit) {
    const selectedIds = new Set(selected.map((s) => s.exercise.id));
    for (const item of scored) {
      if (selected.length >= safeLimit) break;
      if (selectedIds.has(item.exercise.id)) continue;
      selected.push(item);
      selectedIds.add(item.exercise.id);
    }
  }

  const recommendations: SmartCoachRecommendation[] = selected.map((item) => {
    const badgesKo: string[] = [];
    if (item.zeroSpringChange && anchorExercise) badgesKo.push('스프링 변경 0회');
    if (item.sameBodyPosition && anchorExercise) badgesKo.push('같은 자세 연결');
    if (item.unusedInRecent3 && scopedLogs.length > 0) badgesKo.push('최근 3회 미사용');
    else if (item.unusedInRecent3 && scopedLogs.length === 0) badgesKo.push('신규 추천');
    if (item.fillsMissingPlane) badgesKo.push(`${PLANE_LABEL_KO[item.fillsMissingPlane]} 보완`);

    const posKo = PLAIN_POSITION_KO[item.exercise.bodyPosition] ?? '기본 자세';
    const springText = formatSpringLabel(item.exercise.springs);
    let reasonKo: string;

    if (!anchorExercise) {
      const planeSuffix = item.fillsMissingPlane
        ? ` · ${PLANE_LABEL_KO[item.fillsMissingPlane]} 구간 시작`
        : '';
      reasonKo = `${APPARATUS_LABELS[item.exercise.apparatus].short} ${posKo}(${springText})에서 무리 없이 수업을 여는 추천 동작${planeSuffix}`;
    } else if (item.zeroSpringChange && item.sameBodyPosition) {
      reasonKo = item.fillsMissingPlane
        ? `${springText} 스프링·${posKo} 그대로 이어가며 부족한 ${PLANE_LABEL_KO[item.fillsMissingPlane]} 움직임을 채워요.`
        : `${springText} 스프링과 ${posKo} 자세를 바꾸지 않고 흐름을 매끄럽게 이어가요.`;
    } else if (item.zeroSpringChange) {
      reasonKo = item.fillsMissingPlane
        ? `${springText} 스프링 변경 없이 ${PLANE_LABEL_KO[item.fillsMissingPlane]} 균형을 보완할 수 있어요.`
        : `현재 ${springText} 세팅을 유지한 채 다음 구간으로 부드럽게 전환해요.`;
    } else if (item.sameBodyPosition) {
      reasonKo = item.fillsMissingPlane
        ? `${posKo} 자세를 유지하면서 부족한 ${PLANE_LABEL_KO[item.fillsMissingPlane]} 구간을 자연스럽게 채워요.`
        : `같은 ${posKo} 자세에서 이어져 회원 동선 부담이 적어요.`;
    } else if (item.fillsMissingPlane) {
      reasonKo = `현재 수업에서 비어 있는 척추 ${PLANE_LABEL_KO[item.fillsMissingPlane]} 움직임을 균형 있게 채워줘요.`;
    } else {
      reasonKo = `${APPARATUS_LABELS[item.exercise.apparatus].short} 수업 흐름에 맞춰 최근 기록과 겹치지 않는 새 자극을 더해요.`;
    }

    return {
      exercise: item.exercise,
      score: item.score,
      sameApparatus: item.sameApparatus,
      zeroSpringChange: item.zeroSpringChange,
      sameBodyPosition: item.sameBodyPosition,
      unusedInRecent3: item.unusedInRecent3,
      fillsMissingPlane: item.fillsMissingPlane,
      fillsMissingBlock: item.fillsMissingBlock,
      badgesKo: badgesKo.slice(0, 4),
      reasonKo,
    };
  });

  // 6. Honest diagnosis headline based strictly on real calculated counts
  let diagnosisHeadlineKo: string;
  if (activeMovementSteps.length === 0) {
    diagnosisHeadlineKo =
      scopedLogs.length > 0
        ? `아직 담긴 동작이 없어요. 최근 ${scopedLogs.length}회 수업과 겹치지 않는 시작 동작 ${recommendations.length}가지를 골랐어요.`
        : `아직 담긴 동작이 없어요. ${APPARATUS_LABELS[preferredApparatus ?? 'reformer'].short} 수업을 부드럽게 여는 추천 동작 ${recommendations.length}가지예요.`;
  } else if (missingPlanes.length > 0) {
    const missingLabel = missingPlanes.map((p) => PLANE_LABEL_KO[p]).join('·');
    diagnosisHeadlineKo = `척추 4면 중 ${coveredPlaneCount}면 포함 · ${missingLabel} 구간을 보완하면 균형이 맞춰져요.`;
  } else {
    diagnosisHeadlineKo =
      repeatedFromRecent3Count > 0
        ? `척추 4면 균형이 고르게 갖춰졌어요. 최근 수업과 겹친 ${repeatedFromRecent3Count}개 외 신선한 연결 동작을 추천해요.`
        : `척추 4면 균형이 고르게 갖춰졌어요. 스프링·자세 전환 부담이 적은 다음 동작을 골랐어요.`;
  }

  return {
    analyzedStepCount: activeMovementSteps.length,
    plannedMinutes,
    catalogSize: pool.length,
    recentClassesAnalyzed: scopedLogs.length,
    recentUsedExerciseCount: recent3Ids.size,
    repeatedFromRecent3Count,
    targetApparatus: activeApparatus,
    anchorExercise,
    anchorSpring,
    anchorBodyPosition,
    spinalBalance,
    coveredPlaneCount,
    missingPlanes,
    missingKeyBlocks,
    diagnosisHeadlineKo,
    warmupPrereqNoticeKo,
    recommendations,
  };
}
