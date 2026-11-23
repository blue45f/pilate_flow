import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  POSITION_LABELS,
  PROP_LABELS,
  SPINAL_PLANE_LABELS,
} from '../data/pilatesCatalog';
import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  ClassGroupProfile,
  ClassHistoryLog,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  PropType,
  SavedSequence,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { getMovementKey, isRestStep } from './sequenceEngine';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Primary main blocks where repeating within 7 days is most noticeable to studio members. */
export const PRIMARY_MAIN_BLOCKS: ReadonlySet<ClassBlockCategory> = new Set<ClassBlockCategory>([
  'core',
  'lower-body',
  'upper-body',
  'plank',
  'extension',
]);

/** Secondary main blocks (alignment/transition pillars). */
export const SUPPORT_MAIN_BLOCKS: ReadonlySet<ClassBlockCategory> = new Set<ClassBlockCategory>([
  'footwork',
  'bridging',
  'feet-in-straps',
]);

/** Routine opening/closing blocks that instructors intentionally reuse without harsh blocking. */
export const ROUTINE_EXEMPT_BLOCKS: ReadonlySet<ClassBlockCategory> = new Set<ClassBlockCategory>([
  'warmup',
  'cooldown',
]);

const FOUR_SPINAL_PLANES: readonly SpinalPlane[] = ['flexion', 'extension', 'lateral', 'rotation'];

const COMPATIBLE_BLOCK_NEIGHBORS: Record<ClassBlockCategory, readonly ClassBlockCategory[]> = {
  warmup: ['cooldown', 'footwork'],
  footwork: ['lower-body', 'bridging'],
  bridging: ['lower-body', 'feet-in-straps', 'footwork'],
  core: ['plank', 'bridging', 'upper-body'],
  'upper-body': ['extension', 'core'],
  'lower-body': ['bridging', 'footwork', 'feet-in-straps'],
  plank: ['core', 'upper-body'],
  extension: ['upper-body', 'bridging'],
  'feet-in-straps': ['lower-body', 'bridging', 'cooldown'],
  cooldown: ['feet-in-straps', 'warmup'],
};

const HEAD_HEIGHT_TIER: Record<BodyPosition, 0 | 1 | 2> = {
  supine: 0,
  'side-lying': 0,
  prone: 0,
  quadruped: 1,
  seated: 1,
  kneeling: 1,
  standing: 2,
};

const POSITION_PROGRESSION_ORDER: Record<BodyPosition, number> = {
  supine: 0,
  'side-lying': 1,
  prone: 2,
  seated: 3,
  quadruped: 4,
  kneeling: 5,
  standing: 6,
};

const BOX_ORDER: Record<PilatesExercise['box'], number> = {
  none: 0,
  'short-box': 1,
  'long-box': 2,
};

export type FreshnessStatus = 'recent-duplicate' | 'variation-ready' | 'fresh';

export type BlockPriorityTier = 'primary-main' | 'support-main' | 'routine';

export interface FreshReplacementCandidate {
  exercise: PilatesExercise;
  matchScore: number;
  springDistance: number;
  daysSinceLastTaught: number | null;
  reasonKo: string;
}

export interface StepFreshnessDetail {
  stepIndex: number;
  stepId: string;
  exerciseId: string;
  exerciseNameKo: string;
  apparatus: ApparatusType;
  blockCategory: ClassBlockCategory;
  priorityTier: BlockPriorityTier;
  status: FreshnessStatus;
  isLocked: boolean;
  isRoutineExempt: boolean;
  shouldAutoReplace: boolean;
  daysSinceLastTaught: number | null;
  lastTaughtAt?: string;
  lastGroupName?: string;
  taughtCountIn4Weeks: number;
  reasonKo: string;
  variationSuggestionKo?: string;
  replacementCandidates: FreshReplacementCandidate[];
}

export interface SequenceFreshnessReport {
  groupId?: string;
  lookbackDays: number;
  recentWindowDays: number;
  variationWindowDays: number;
  analyzedLogCount: number;
  freshnessScore: number;
  summaryTier: 'fresh' | 'variation-advised' | 'overlap-heavy';
  summaryLabelKo: string;
  totalExerciseSteps: number;
  recentDuplicateCount: number;
  autoReplaceableDuplicateCount: number;
  variationReadyCount: number;
  freshCount: number;
  routineExemptCount: number;
  steps: StepFreshnessDetail[];
  duplicateSteps: StepFreshnessDetail[];
  variationReadySteps: StepFreshnessDetail[];
}

export interface AnalyzeFreshnessOptions {
  groupId?: string;
  referenceDate?: Date;
  catalogExercises?: readonly PilatesExercise[];
  recentWindowDays?: number;
  variationWindowDays?: number;
  lookbackDays?: number;
  maxCandidatesPerStep?: number;
  preferredProps?: readonly PropType[];
  includeRoutineBlocks?: boolean;
}

export interface StepReplacementDiff {
  stepIndex: number;
  stepId: string;
  fromExerciseId: string;
  fromNameKo: string;
  toExerciseId: string;
  toNameKo: string;
  apparatus: ApparatusType;
  blockCategory: ClassBlockCategory;
  fromSprings: string;
  toSprings: string;
  daysSinceLastTaught: number | null;
  reasonKo: string;
}

export interface SkippedRefreshStep {
  stepIndex: number;
  exerciseId: string;
  nameKo: string;
  reason: 'locked' | 'no-fresh-candidate';
  reasonKo: string;
}

export interface RefreshOverlappingOptions {
  groupId?: string;
  referenceDate?: Date;
  includeVariationReady?: boolean;
  preserveApparatus?: boolean;
  allowedApparatus?: readonly ApparatusType[];
  maxLevel?: DifficultyLevel;
  preferredProps?: readonly PropType[];
  recentWindowDays?: number;
  variationWindowDays?: number;
}

export interface RefreshOverlappingResult {
  steps: SequenceStep[];
  diffs: StepReplacementDiff[];
  replacedCount: number;
  preservedLockedCount: number;
  preservedRestCount: number;
  skippedSteps: SkippedRefreshStep[];
  beforeFreshnessScore: number;
  afterFreshnessScore: number;
  summaryKo: string;
}

export interface AnchorFirstSequenceInput {
  anchorExerciseIds: readonly string[];
  exercises: readonly PilatesExercise[];
  historyLogs: readonly ClassHistoryLog[];
  targetMinutes?: number;
  level?: DifficultyLevel;
  groupId?: string;
  apparatusScope?: ApparatusType | 'mixed' | 'anchor-match';
  preferredProps?: readonly PropType[];
  referenceDate?: Date;
}

export interface AnchorFirstSequenceResult {
  titleKo: string;
  subtitleKo: string;
  targetMinutes: number;
  level: DifficultyLevel;
  apparatus: ApparatusType | 'mixed';
  anchorExerciseIds: string[];
  anchorNamesKo: string[];
  anchorStepIds: string[];
  steps: SequenceStep[];
  coveredSpinalPlanes: SpinalPlane[];
  missingSpinalPlanes: SpinalPlane[];
  compensatoryCooldownReasonKo: string;
  freshness: SequenceFreshnessReport;
  flowOptimization: SmartFlowOptimizationResult;
  highlightsKo: string[];
}

export interface ForkLevelsInput {
  baseTitle: string;
  steps: readonly SequenceStep[];
  exercises: readonly PilatesExercise[];
  targetMinutes?: number;
  historyLogs?: readonly ClassHistoryLog[];
  referenceDate?: Date;
}

export interface LevelForkVariant {
  level: DifficultyLevel;
  badgeKo: string;
  shortLabelKo: string;
  titleKo: string;
  subtitleKo: string;
  defaultLayer: LayerMode;
  apparatus: ApparatusType | 'mixed';
  targetMinutes: number;
  steps: SequenceStep[];
  swappedCount: number;
  propEnhancedCount: number;
  changeSummaryKo: string[];
  savedSequenceDraft: Omit<SavedSequence, 'id'>;
}

export interface LevelForkBundle {
  baseTitle: string;
  forks: Record<DifficultyLevel, LevelForkVariant>;
  variants: LevelForkVariant[];
  summaryKo: string;
}

export interface WeeklyAutoPlanInput {
  groups: readonly ClassGroupProfile[];
  exercises: readonly PilatesExercise[];
  historyLogs: readonly ClassHistoryLog[];
  apparatus?: ApparatusType | 'mixed';
  ownedApparatus?: readonly ApparatusType[];
  targetMinutes?: number;
  referenceDate?: Date;
}

export interface WeeklyGroupClassDraft {
  groupId: string;
  groupName: string;
  scheduleLabel: string;
  level: DifficultyLevel;
  apparatus: ApparatusType | 'mixed';
  focusPreset: 'full-body' | 'core-sculpt' | 'glute-lower' | 'posture-upper' | 'mobility-rehab';
  focusLabelKo: string;
  titleKo: string;
  subtitleKo: string;
  targetMinutes: number;
  steps: SequenceStep[];
  freshnessScore: number;
  mainExerciseIds: string[];
  mainExerciseNamesKo: string[];
  coveredSpinalPlanes: SpinalPlane[];
  savedSequenceDraft: Omit<SavedSequence, 'id'>;
}

export interface WeeklyOverlapStats {
  totalClasses: number;
  totalUniqueMainExercises: number;
  crossClassMainOverlapCount: number;
  recentHistoryOverlapCount: number;
  averageFreshnessScore: number;
}

export interface WeeklyAutoPlanResult {
  plans: WeeklyGroupClassDraft[];
  stats: WeeklyOverlapStats;
  summaryKo: string;
}

export type FlowWarningType =
  | 'sudden-standing-transition'
  | 'consecutive-wrist-load'
  | 'consecutive-neck-load'
  | 'unwarmed-extension'
  | 'excessive-spring-changes';

export interface FlowSafetyWarning {
  type: FlowWarningType;
  severity: 'info' | 'warning';
  stepIndices: number[];
  messageKo: string;
}

export interface SmartFlowMetrics {
  springChanges: number;
  boxChanges: number;
  apparatusChanges: number;
  positionChanges: number;
  suddenStandingTransitions: number;
  maxConsecutiveWristSteps: number;
  maxConsecutiveWristMin: number;
  maxConsecutiveNeckSteps: number;
  maxConsecutiveNeckMin: number;
}

export interface SmartFlowOptions {
  preserveWarmupAndCooldown?: boolean;
  enforceWarmupBeforeHighExtension?: boolean;
}

export interface SmartFlowOptimizationResult {
  steps: SequenceStep[];
  changed: boolean;
  beforeScore: number;
  afterScore: number;
  beforeMetrics: SmartFlowMetrics;
  afterMetrics: SmartFlowMetrics;
  beforeWarnings: FlowSafetyWarning[];
  afterWarnings: FlowSafetyWarning[];
  resolvedWarningsCount: number;
  improvementsKo: string[];
}

interface ExerciseHistoryRecord {
  lastTaughtAt: string;
  lastGroupName: string;
  daysSinceLastTaught: number;
  taughtCountIn4Weeks: number;
}

function isStepLocked(step: SequenceStep): boolean {
  return Boolean(step.locked || (step as SequenceStep & { isLocked?: boolean }).isLocked);
}

function levelRank(level: DifficultyLevel): number {
  if (level === '1.0') return 1;
  if (level === '1.5') return 2;
  return 3;
}

function getBlockPriorityTier(category: ClassBlockCategory): BlockPriorityTier {
  if (PRIMARY_MAIN_BLOCKS.has(category)) return 'primary-main';
  if (ROUTINE_EXEMPT_BLOCKS.has(category)) return 'routine';
  return 'support-main';
}

function isCatalogEligible(exercise: PilatesExercise): boolean {
  if (!exercise || !exercise.id || !exercise.nameKo) return false;
  const extended = exercise as PilatesExercise & { humanDraftId?: string };
  if (extended.humanDraftId) return false;
  return true;
}

function buildExerciseMap(
  exercises: readonly PilatesExercise[] | ReadonlyMap<string, PilatesExercise>,
): Map<string, PilatesExercise> {
  if (!Array.isArray(exercises)) {
    const readonlyMap = exercises as ReadonlyMap<string, PilatesExercise>;
    return new Map(readonlyMap);
  }
  const map = new Map<string, PilatesExercise>();
  for (const ex of exercises) {
    if (ex?.id) map.set(ex.id, ex);
  }
  return map;
}

function toExerciseList(
  exercises: readonly PilatesExercise[] | ReadonlyMap<string, PilatesExercise>,
  catalogExercises?: readonly PilatesExercise[],
): PilatesExercise[] {
  if (catalogExercises && catalogExercises.length > 0) {
    return catalogExercises.filter(isCatalogEligible);
  }
  const list: PilatesExercise[] = Array.isArray(exercises)
    ? [...exercises]
    : [...(exercises as ReadonlyMap<string, PilatesExercise>).values()];
  return list.filter(isCatalogEligible);
}

/**
 * Parses Pilates spring notation (short codes like '2R 1B', '1R + 1Y', '1B', '1R or 1B',
 * Korean '빨강 2 파랑 1', or 'Bodyweight') into normalized Red-spring load units (1R = 1.0).
 */
export function parseSpringLoadUnits(rawSprings?: string): number {
  const raw = (rawSprings ?? '').trim();
  if (!raw) return 0;
  if (/^(?:bodyweight|none|0(?:\.0+)?\s*springs?|맨몸|없음|무스프링)/i.test(raw)) {
    return 0;
  }

  // Handle alternative notation such as "1R or 1B" or "1R / 1B" by averaging options
  if (/\bor\b|또는|\//.test(raw)) {
    const parts = raw
      .split(/\bor\b|또는|\//i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const parsed = parts.map((part) => parseSpringLoadUnits(part));
      const sum = parsed.reduce((acc, value) => acc + value, 0);
      return Number((sum / parsed.length).toFixed(2));
    }
  }

  let total = 0;
  let matchedAny = false;

  const tokenSpecs: ReadonlyArray<{ rx: RegExp; weight: number }> = [
    { rx: /(\d+(?:\.\d+)?)\s*(?:G|Green)\b/gi, weight: 1.25 },
    { rx: /(?:초록|녹색|그린)\s*(\d+(?:\.\d+)?)?/gi, weight: 1.25 },
    { rx: /(\d+(?:\.\d+)?)\s*(?:R|Red)\b/gi, weight: 1.0 },
    { rx: /(?:빨강|적색|레드)\s*(\d+(?:\.\d+)?)?/gi, weight: 1.0 },
    { rx: /(\d+(?:\.\d+)?)\s*(?:B|Blue)\b/gi, weight: 0.5 },
    { rx: /(?:파랑|청색|블루)\s*(\d+(?:\.\d+)?)?/gi, weight: 0.5 },
    { rx: /(\d+(?:\.\d+)?)\s*(?:Y|Yellow)\b/gi, weight: 0.25 },
    { rx: /(?:노랑|황색|옐로우?)\s*(\d+(?:\.\d+)?)?/gi, weight: 0.25 },
    { rx: /(\d+(?:\.\d+)?)\s*(?:W|White)\b/gi, weight: 0.25 },
    { rx: /(?:하양|화이트|백색)\s*(\d+(?:\.\d+)?)?/gi, weight: 0.25 },
  ];

  for (const spec of tokenSpecs) {
    for (const match of raw.matchAll(spec.rx)) {
      matchedAny = true;
      const qty = match[1] !== undefined ? Number(match[1]) : 1;
      if (Number.isFinite(qty) && qty > 0) {
        total += qty * spec.weight;
      }
    }
  }

  if (!matchedAny) {
    const genericSprings = raw.match(/(\d+(?:\.\d+)?)\s*springs?/i);
    if (genericSprings?.[1]) {
      return Number((Number(genericSprings[1]) * 0.75).toFixed(2));
    }
    return 1.0;
  }

  return Number(total.toFixed(2));
}

function getEffectiveSprings(step: SequenceStep, exercise?: PilatesExercise): string {
  return (step.customSpringOverride?.trim() || exercise?.springs?.trim() || 'Bodyweight').trim();
}

function isWristLoadExercise(exercise: PilatesExercise): boolean {
  if (exercise.blockCategory === 'plank' || exercise.bodyPosition === 'quadruped') return true;
  const combined = `${exercise.nameKo} ${exercise.nameEn} ${exercise.precautions}`.toLowerCase();
  return /손목|플랭크|롱\s*스트레치|엘리펀트|네발|푸쉬|푸시|plank|elephant|quadruped|wrist/.test(
    combined,
  );
}

function isNeckLoadExercise(exercise: PilatesExercise): boolean {
  if (
    exercise.bodyPosition === 'supine' &&
    exercise.blockCategory === 'core' &&
    exercise.spinalPlanes.includes('flexion')
  ) {
    return true;
  }
  const combined = `${exercise.nameKo} ${exercise.nameEn} ${exercise.precautions}`.toLowerCase();
  return /경추|목\s*긴장|목\s*통증|컬업|헌드레드|체스트\s*리프트|크리스크로스|hundred|chest lift|curl-?up/.test(
    combined,
  );
}

function isHighLoadExtensionExercise(exercise: PilatesExercise): boolean {
  if (exercise.blockCategory === 'extension') return true;
  return exercise.level === '2.0' && exercise.spinalPlanes.includes('extension');
}

function computeMuscleOverlapRatio(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((m) => m.trim().toLowerCase()));
  const setB = new Set(b.map((m) => m.trim().toLowerCase()));
  let shared = 0;
  for (const item of setA) {
    if (setB.has(item)) shared += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? shared / union : 0;
}

function buildHistoryIndex(
  historyLogs: readonly ClassHistoryLog[],
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
  options: { groupId?: string; referenceDate: Date; lookbackDays: number },
): {
  byExerciseId: Map<string, ExerciseHistoryRecord>;
  byMovementKey: Map<string, ExerciseHistoryRecord>;
  analyzedLogCount: number;
} {
  const refMs = options.referenceDate.getTime();
  const byExerciseId = new Map<string, ExerciseHistoryRecord>();
  const byMovementKey = new Map<string, ExerciseHistoryRecord>();
  let analyzedLogCount = 0;

  const normalizedGroupId =
    options.groupId && options.groupId !== 'all' ? options.groupId.trim() : '';

  for (const log of historyLogs) {
    if (normalizedGroupId && log.groupId !== normalizedGroupId) continue;
    const logMs = new Date(log.taughtAt).getTime();
    if (!Number.isFinite(logMs) || logMs > refMs) continue;

    const daysAgo = Math.max(0, Math.floor((refMs - logMs) / MS_PER_DAY));
    if (daysAgo > options.lookbackDays) continue;

    analyzedLogCount += 1;

    const logExerciseIds = new Set<string>(log.exerciseIds);
    if (log.stepsSnapshot) {
      for (const snapStep of log.stepsSnapshot) {
        if (!isRestStep(snapStep) && snapStep.exerciseId) {
          logExerciseIds.add(snapStep.exerciseId);
        }
      }
    }

    for (const exId of logExerciseIds) {
      const prev = byExerciseId.get(exId);
      if (!prev) {
        byExerciseId.set(exId, {
          lastTaughtAt: log.taughtAt,
          lastGroupName: log.groupName,
          daysSinceLastTaught: daysAgo,
          taughtCountIn4Weeks: 1,
        });
      } else {
        const isMoreRecent = daysAgo < prev.daysSinceLastTaught;
        byExerciseId.set(exId, {
          lastTaughtAt: isMoreRecent ? log.taughtAt : prev.lastTaughtAt,
          lastGroupName: isMoreRecent ? log.groupName : prev.lastGroupName,
          daysSinceLastTaught: Math.min(prev.daysSinceLastTaught, daysAgo),
          taughtCountIn4Weeks: prev.taughtCountIn4Weeks + 1,
        });
      }

      const ex = exerciseMap.get(exId);
      if (ex) {
        const key = getMovementKey(ex);
        const prevKey = byMovementKey.get(key);
        if (!prevKey) {
          byMovementKey.set(key, {
            lastTaughtAt: log.taughtAt,
            lastGroupName: log.groupName,
            daysSinceLastTaught: daysAgo,
            taughtCountIn4Weeks: 1,
          });
        } else {
          const isMoreRecent = daysAgo < prevKey.daysSinceLastTaught;
          byMovementKey.set(key, {
            lastTaughtAt: isMoreRecent ? log.taughtAt : prevKey.lastTaughtAt,
            lastGroupName: isMoreRecent ? log.groupName : prevKey.lastGroupName,
            daysSinceLastTaught: Math.min(prevKey.daysSinceLastTaught, daysAgo),
            taughtCountIn4Weeks: prevKey.taughtCountIn4Weeks + 1,
          });
        }
      }
    }
  }

  return { byExerciseId, byMovementKey, analyzedLogCount };
}

function lookupHistoryRecord(
  exercise: PilatesExercise,
  index: {
    byExerciseId: ReadonlyMap<string, ExerciseHistoryRecord>;
    byMovementKey: ReadonlyMap<string, ExerciseHistoryRecord>;
  },
): ExerciseHistoryRecord | undefined {
  const direct = index.byExerciseId.get(exercise.id);
  const byKey = index.byMovementKey.get(getMovementKey(exercise));
  if (direct && byKey) {
    return direct.daysSinceLastTaught <= byKey.daysSinceLastTaught ? direct : byKey;
  }
  return direct ?? byKey;
}

function suggestVariationAdvice(step: SequenceStep, exercise: PilatesExercise): string {
  const hasProp = exercise.props.some((prop) => prop !== 'none') || Boolean(step.propOverride && step.propOverride !== 'none');
  if (step.selectedLayer === 'easy') {
    return '기본(Standard) 단계로 올리거나 미니볼·써클링을 더해 새로운 자극을 줄 수 있어요.';
  }
  if (!hasProp) {
    return '미니볼·써클링 등 소도구를 추가하거나 심화(Hard) 변주로 재사용해 보세요.';
  }
  if (step.selectedLayer === 'standard') {
    return '심화(Hard) 변주 또는 편측(한 다리·한 팔) 진행으로 느낌을 바꿀 수 있어요.';
  }
  return '템포를 천천히 조절하거나 반대쪽 시작 순서로 변주해 재사용해 보세요.';
}

function findFreshReplacementCandidates(input: {
  targetStep: SequenceStep;
  targetExercise: PilatesExercise;
  prevExercise?: PilatesExercise;
  nextExercise?: PilatesExercise;
  catalog: readonly PilatesExercise[];
  usedExerciseIds: ReadonlySet<string>;
  usedMovementKeys: ReadonlySet<string>;
  historyIndex: {
    byExerciseId: ReadonlyMap<string, ExerciseHistoryRecord>;
    byMovementKey: ReadonlyMap<string, ExerciseHistoryRecord>;
  };
  recentWindowDays: number;
  variationWindowDays: number;
  preserveApparatus: boolean;
  allowedApparatus?: ReadonlySet<ApparatusType>;
  maxLevel?: DifficultyLevel;
  preferredProps?: readonly PropType[];
  maxCandidates: number;
}): FreshReplacementCandidate[] {
  const {
    targetStep,
    targetExercise,
    prevExercise,
    nextExercise,
    catalog,
    usedExerciseIds,
    usedMovementKeys,
    historyIndex,
    recentWindowDays,
    variationWindowDays,
    preserveApparatus,
    allowedApparatus,
    maxLevel,
    preferredProps,
    maxCandidates,
  } = input;

  const originalSpringLoad = parseSpringLoadUnits(getEffectiveSprings(targetStep, targetExercise));
  const prevSpringLoad = prevExercise ? parseSpringLoadUnits(prevExercise.springs) : null;
  const nextSpringLoad = nextExercise ? parseSpringLoadUnits(nextExercise.springs) : null;
  const compatibleBlocks = new Set(COMPATIBLE_BLOCK_NEIGHBORS[targetExercise.blockCategory] ?? []);

  const baseCandidates = catalog.filter((cand) => {
    if (cand.id === targetExercise.id) return false;
    if (usedExerciseIds.has(cand.id)) return false;
    if (usedMovementKeys.has(getMovementKey(cand))) return false;
    if (allowedApparatus && !allowedApparatus.has(cand.apparatus)) return false;
    // Never replace a main block with warmup/cooldown or vice versa
    const targetIsRoutine = ROUTINE_EXEMPT_BLOCKS.has(targetExercise.blockCategory);
    const candIsRoutine = ROUTINE_EXEMPT_BLOCKS.has(cand.blockCategory);
    if (targetIsRoutine !== candIsRoutine) return false;
    const hist = lookupHistoryRecord(cand, historyIndex);
    if (hist && hist.daysSinceLastTaught <= recentWindowDays) return false;
    return true;
  });

  if (baseCandidates.length === 0) return [];

  const sameApparatusPool = baseCandidates.filter(
    (cand) => cand.apparatus === targetExercise.apparatus,
  );
  const workingPool =
    preserveApparatus && sameApparatusPool.length > 0 ? sameApparatusPool : baseCandidates;

  const scored = workingPool.map((cand): FreshReplacementCandidate => {
    const hist = lookupHistoryRecord(cand, historyIndex);
    const daysSince = hist ? hist.daysSinceLastTaught : null;
    const candSpringLoad = parseSpringLoadUnits(cand.springs);
    const springDistance = Number(Math.abs(candSpringLoad - originalSpringLoad).toFixed(2));

    let score = 40;
    const reasons: string[] = [];

    if (cand.apparatus === targetExercise.apparatus) {
      score += 30;
    }

    if (cand.blockCategory === targetExercise.blockCategory) {
      score += 36;
      const blockMeta = CANONICAL_BLOCKS.find((b) => b.category === cand.blockCategory);
      reasons.push(`같은 ${blockMeta ? blockMeta.nameKo.split('&')[0].trim() : cand.blockCategory} 구간`);
    } else if (compatibleBlocks.has(cand.blockCategory)) {
      score += 14;
    } else {
      score -= 12;
    }

    if (daysSince === null || daysSince > variationWindowDays) {
      score += 24;
      reasons.push(daysSince === null ? '최근 4주 미사용' : `${daysSince}일 전 사용(신선)`);
    } else {
      score += 8;
      reasons.push(`${daysSince}일 전 사용(변주 가능)`);
    }

    // Spring similarity & adjacent transition minimization
    if (cand.springs === targetExercise.springs) {
      score += 16;
      reasons.push(`스프링 ${cand.springs} 유지`);
    } else if (springDistance <= 0.5) {
      score += 11;
      reasons.push(`비슷한 스프링(${cand.springs})`);
    } else if (springDistance <= 1.0) {
      score += 4;
    } else {
      score -= Math.min(14, Math.round(springDistance * 4));
    }

    if (prevSpringLoad !== null && Math.abs(candSpringLoad - prevSpringLoad) <= 0.25) {
      score += 8;
    }
    if (nextSpringLoad !== null && Math.abs(candSpringLoad - nextSpringLoad) <= 0.25) {
      score += 6;
    }

    if (cand.box === targetExercise.box) {
      score += 10;
    }
    if (cand.bodyPosition === targetExercise.bodyPosition) {
      score += 7;
    }

    const effectiveMaxLevel = maxLevel ?? targetExercise.level;
    if (levelRank(cand.level) <= levelRank(effectiveMaxLevel)) {
      score += 10;
    } else {
      score -= 14;
    }

    const muscleOverlap = computeMuscleOverlapRatio(targetExercise.targetMuscles, cand.targetMuscles);
    score += Math.round(muscleOverlap * 12);

    if (
      preferredProps &&
      preferredProps.length > 0 &&
      cand.props.some((p) => p !== 'none' && preferredProps.includes(p))
    ) {
      score += 6;
    }

    const apparatusKo = APPARATUS_LABELS[cand.apparatus]?.ko ?? cand.apparatus;
    const reasonKo = `${apparatusKo} · ${reasons.slice(0, 3).join(' · ')}`;

    return {
      exercise: cand,
      matchScore: Math.max(1, Math.min(100, Math.round(score))),
      springDistance,
      daysSinceLastTaught: daysSince,
      reasonKo,
    };
  });

  scored.sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      a.springDistance - b.springDistance ||
      a.exercise.id.localeCompare(b.exercise.id),
  );

  // Deduplicate by movement key so candidates are genuinely distinct
  const seenKeys = new Set<string>();
  const unique: FreshReplacementCandidate[] = [];
  for (const item of scored) {
    const key = getMovementKey(item.exercise);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    unique.push(item);
    if (unique.length >= maxCandidates) break;
  }

  return unique;
}

/**
 * 1. 3-tier freshness analysis & smart overlap scoring across the past 4 weeks of class history.
 * Prioritizes main workout blocks (core/lower-body/upper-body/plank/extension) while avoiding
 * overly aggressive blocking of routine warmup/cooldown breathing & stretching steps.
 */
export function analyzeSequenceFreshness(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[] | ReadonlyMap<string, PilatesExercise>,
  historyLogs: readonly ClassHistoryLog[],
  options: AnalyzeFreshnessOptions = {},
): SequenceFreshnessReport {
  const referenceDate = options.referenceDate ?? new Date();
  const recentWindowDays = options.recentWindowDays ?? 7;
  const variationWindowDays = options.variationWindowDays ?? 14;
  const lookbackDays = options.lookbackDays ?? 28;
  const maxCandidatesPerStep = options.maxCandidatesPerStep ?? 3;
  const includeRoutineBlocks = options.includeRoutineBlocks ?? false;

  const exerciseMap = buildExerciseMap(exercises);
  const catalog = toExerciseList(exercises, options.catalogExercises);
  for (const ex of catalog) {
    if (!exerciseMap.has(ex.id)) exerciseMap.set(ex.id, ex);
  }

  const historyIndex = buildHistoryIndex(historyLogs, exerciseMap, {
    groupId: options.groupId,
    referenceDate,
    lookbackDays,
  });

  const usedExerciseIds = new Set<string>();
  const usedMovementKeys = new Set<string>();
  for (const step of steps) {
    if (isRestStep(step)) continue;
    usedExerciseIds.add(step.exerciseId);
    const ex = exerciseMap.get(step.exerciseId);
    if (ex) usedMovementKeys.add(getMovementKey(ex));
  }

  const details: StepFreshnessDetail[] = [];
  let weightedFreshSum = 0;
  let totalWeight = 0;

  steps.forEach((step, stepIndex) => {
    if (isRestStep(step)) return;
    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) return;

    const effectiveBlock = step.blockCategory || exercise.blockCategory;
    const priorityTier = getBlockPriorityTier(effectiveBlock);
    const locked = isStepLocked(step);
    const record = lookupHistoryRecord(exercise, historyIndex);
    const daysSince = record ? record.daysSinceLastTaught : null;
    const taughtCount = record ? record.taughtCountIn4Weeks : 0;

    let status: FreshnessStatus = 'fresh';
    let isRoutineExempt = false;
    let shouldAutoReplace = false;
    let reasonKo = '최근 4주 동안 수업하지 않은 신선한 동작이에요.';
    let variationSuggestionKo: string | undefined;

    if (priorityTier === 'routine' && !includeRoutineBlocks) {
      // Warmup / Cooldown Pilates rule: do not harshly block routine breathing & stretching
      if (daysSince !== null && daysSince <= recentWindowDays) {
        isRoutineExempt = true;
        if (taughtCount >= 3) {
          status = 'variation-ready';
          reasonKo = `준비·마무리 동작이 최근 4주간 ${taughtCount}회 반복됐어요. 소도구만 살짝 바꿔도 좋아요.`;
          variationSuggestionKo = suggestVariationAdvice(step, exercise);
        } else {
          status = 'fresh';
          reasonKo = `준비·마무리 기본 동작(${daysSince === 0 ? '오늘' : `${daysSince}일 전`} 진행)이라 유지해도 자연스러워요.`;
        }
      } else if (daysSince !== null && daysSince <= variationWindowDays) {
        isRoutineExempt = true;
        status = 'fresh';
        reasonKo = `준비·마무리 동작(${daysSince}일 전 진행)으로 자연스럽게 이어갈 수 있어요.`;
      }
    } else if (daysSince !== null && daysSince <= recentWindowDays) {
      status = 'recent-duplicate';
      shouldAutoReplace = !locked;
      const dayLabel = daysSince === 0 ? '오늘' : `${daysSince}일 전`;
      reasonKo = locked
        ? `${dayLabel} 수업과 겹치지만 잠겨 있어 그대로 유지됩니다.`
        : `${dayLabel} 수업의 메인 구간과 겹쳐 새 동작으로 교체를 권장해요.`;
    } else if (daysSince !== null && daysSince <= variationWindowDays) {
      status = 'variation-ready';
      shouldAutoReplace = false;
      reasonKo = `${daysSince}일 전 수업한 동작이에요. 소도구나 난이도를 바꿔 재사용하면 좋아요.`;
      variationSuggestionKo = suggestVariationAdvice(step, exercise);
    } else if (daysSince !== null) {
      status = 'fresh';
      reasonKo = `${daysSince}일 이상 지나 다시 넣기 좋은 신선한 동작이에요.`;
    }

    const prevEx =
      stepIndex > 0 && !isRestStep(steps[stepIndex - 1])
        ? exerciseMap.get(steps[stepIndex - 1].exerciseId)
        : undefined;
    const nextEx =
      stepIndex + 1 < steps.length && !isRestStep(steps[stepIndex + 1])
        ? exerciseMap.get(steps[stepIndex + 1].exerciseId)
        : undefined;

    const replacementCandidates =
      status === 'recent-duplicate' || status === 'variation-ready'
        ? findFreshReplacementCandidates({
            targetStep: step,
            targetExercise: exercise,
            prevExercise: prevEx,
            nextExercise: nextEx,
            catalog,
            usedExerciseIds,
            usedMovementKeys,
            historyIndex,
            recentWindowDays,
            variationWindowDays,
            preserveApparatus: true,
            preferredProps: options.preferredProps,
            maxCandidates: maxCandidatesPerStep,
          })
        : [];

    const blockWeight =
      priorityTier === 'primary-main' ? 1.5 : priorityTier === 'support-main' ? 1.0 : 0.35;
    const stepFreshPoints =
      status === 'fresh'
        ? 100
        : status === 'variation-ready'
          ? 70
          : priorityTier === 'primary-main'
            ? 0
            : 15;

    weightedFreshSum += stepFreshPoints * blockWeight;
    totalWeight += blockWeight;

    details.push({
      stepIndex,
      stepId: step.stepId,
      exerciseId: exercise.id,
      exerciseNameKo: exercise.nameKo,
      apparatus: exercise.apparatus,
      blockCategory: effectiveBlock,
      priorityTier,
      status,
      isLocked: locked,
      isRoutineExempt,
      shouldAutoReplace,
      daysSinceLastTaught: daysSince,
      lastTaughtAt: record?.lastTaughtAt,
      lastGroupName: record?.lastGroupName,
      taughtCountIn4Weeks: taughtCount,
      reasonKo,
      variationSuggestionKo,
      replacementCandidates,
    });
  });

  const freshnessScore =
    totalWeight > 0 ? Math.max(0, Math.min(100, Math.round(weightedFreshSum / totalWeight))) : 100;

  const duplicateSteps = details.filter((d) => d.status === 'recent-duplicate');
  const variationReadySteps = details.filter((d) => d.status === 'variation-ready');
  const freshCount = details.filter((d) => d.status === 'fresh').length;
  const routineExemptCount = details.filter((d) => d.isRoutineExempt).length;
  const autoReplaceableDuplicateCount = duplicateSteps.filter((d) => d.shouldAutoReplace).length;

  const summaryTier: SequenceFreshnessReport['summaryTier'] =
    duplicateSteps.length === 0 && freshnessScore >= 85
      ? 'fresh'
      : duplicateSteps.length <= 1 && freshnessScore >= 65
        ? 'variation-advised'
        : 'overlap-heavy';

  const summaryLabelKo =
    duplicateSteps.length > 0
      ? `최근 7일 수업과 메인 동작 ${duplicateSteps.length}개가 겹쳐요`
      : variationReadySteps.length > 0
        ? `겹침은 없고, 변주 추천 동작 ${variationReadySteps.length}개가 있어요`
        : '이전 수업과 겹치지 않는 신선한 구성이에요';

  return {
    groupId: options.groupId,
    lookbackDays,
    recentWindowDays,
    variationWindowDays,
    analyzedLogCount: historyIndex.analyzedLogCount,
    freshnessScore,
    summaryTier,
    summaryLabelKo,
    totalExerciseSteps: details.length,
    recentDuplicateCount: duplicateSteps.length,
    autoReplaceableDuplicateCount,
    variationReadyCount: variationReadySteps.length,
    freshCount,
    routineExemptCount,
    steps: details,
    duplicateSteps,
    variationReadySteps,
  };
}

/**
 * 2. One-tap refresh of overlapping steps:
 * Strictly preserves locked steps and rest steps, replacing only overlapping exercises with fresh
 * alternatives matching the same apparatus, block/target region, and similar spring load.
 */
export function refreshOverlappingSteps(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  historyLogs: readonly ClassHistoryLog[],
  options: RefreshOverlappingOptions = {},
): RefreshOverlappingResult {
  const referenceDate = options.referenceDate ?? new Date();
  const recentWindowDays = options.recentWindowDays ?? 7;
  const variationWindowDays = options.variationWindowDays ?? 14;
  const preserveApparatus = options.preserveApparatus ?? true;
  const allowedApparatus =
    options.allowedApparatus && options.allowedApparatus.length > 0
      ? new Set<ApparatusType>(options.allowedApparatus)
      : undefined;

  const beforeReport = analyzeSequenceFreshness(steps, exercises, historyLogs, {
    groupId: options.groupId,
    referenceDate,
    recentWindowDays,
    variationWindowDays,
    preferredProps: options.preferredProps,
  });

  const exerciseMap = buildExerciseMap(exercises);
  const catalog = toExerciseList(exercises);
  const historyIndex = buildHistoryIndex(historyLogs, exerciseMap, {
    groupId: options.groupId,
    referenceDate,
    lookbackDays: 28,
  });

  const nextSteps: SequenceStep[] = steps.map((step) => ({ ...step }));
  const usedIds = new Set<string>();
  const usedKeys = new Set<string>();
  let preservedLockedCount = 0;
  let preservedRestCount = 0;

  for (const step of nextSteps) {
    if (isRestStep(step)) {
      preservedRestCount += 1;
      continue;
    }
    if (isStepLocked(step)) {
      preservedLockedCount += 1;
    }
    usedIds.add(step.exerciseId);
    const ex = exerciseMap.get(step.exerciseId);
    if (ex) usedKeys.add(getMovementKey(ex));
  }

  const targetDetails = beforeReport.steps
    .filter((detail) =>
      options.includeVariationReady
        ? detail.status === 'recent-duplicate' ||
          (detail.status === 'variation-ready' && detail.priorityTier !== 'routine')
        : detail.status === 'recent-duplicate',
    )
    .sort((a, b) => {
      const rankA = a.priorityTier === 'primary-main' ? 0 : 1;
      const rankB = b.priorityTier === 'primary-main' ? 0 : 1;
      return rankA - rankB || a.stepIndex - b.stepIndex;
    });

  const diffs: StepReplacementDiff[] = [];
  const skippedSteps: SkippedRefreshStep[] = [];

  for (const detail of targetDetails) {
    const step = nextSteps[detail.stepIndex];
    if (!step || isRestStep(step)) continue;

    if (isStepLocked(step)) {
      skippedSteps.push({
        stepIndex: detail.stepIndex,
        exerciseId: detail.exerciseId,
        nameKo: detail.exerciseNameKo,
        reason: 'locked',
        reasonKo: '잠긴 동작이라 교체하지 않고 그대로 두었어요.',
      });
      continue;
    }

    const origEx = exerciseMap.get(step.exerciseId);
    if (!origEx) continue;

    const prevEx =
      detail.stepIndex > 0 && !isRestStep(nextSteps[detail.stepIndex - 1])
        ? exerciseMap.get(nextSteps[detail.stepIndex - 1].exerciseId)
        : undefined;
    const nextEx =
      detail.stepIndex + 1 < nextSteps.length && !isRestStep(nextSteps[detail.stepIndex + 1])
        ? exerciseMap.get(nextSteps[detail.stepIndex + 1].exerciseId)
        : undefined;

    const candidates = findFreshReplacementCandidates({
      targetStep: step,
      targetExercise: origEx,
      prevExercise: prevEx,
      nextExercise: nextEx,
      catalog,
      usedExerciseIds: usedIds,
      usedMovementKeys: usedKeys,
      historyIndex,
      recentWindowDays,
      variationWindowDays,
      preserveApparatus,
      allowedApparatus,
      maxLevel: options.maxLevel,
      preferredProps: options.preferredProps,
      maxCandidates: 3,
    });

    const best = candidates[0];
    if (!best) {
      skippedSteps.push({
        stepIndex: detail.stepIndex,
        exerciseId: origEx.id,
        nameKo: origEx.nameKo,
        reason: 'no-fresh-candidate',
        reasonKo: '같은 조건으로 바로 바꿀 수 있는 미사용 동작이 부족해 유지했어요.',
      });
      continue;
    }

    const picked = best.exercise;
    usedIds.add(picked.id);
    usedKeys.add(getMovementKey(picked));

    const fromSprings = getEffectiveSprings(step, origEx);
    nextSteps[detail.stepIndex] = {
      ...step,
      exerciseId: picked.id,
      blockCategory: picked.blockCategory,
      customSpringOverride: undefined,
      footbarOverride: undefined,
      headrestOverride: undefined,
      boxOverride: undefined,
      motionStudy: undefined,
    };

    diffs.push({
      stepIndex: detail.stepIndex,
      stepId: step.stepId,
      fromExerciseId: origEx.id,
      fromNameKo: origEx.nameKo,
      toExerciseId: picked.id,
      toNameKo: picked.nameKo,
      apparatus: picked.apparatus,
      blockCategory: picked.blockCategory,
      fromSprings,
      toSprings: picked.springs,
      daysSinceLastTaught: detail.daysSinceLastTaught,
      reasonKo: best.reasonKo,
    });
  }

  const afterReport = analyzeSequenceFreshness(nextSteps, exercises, historyLogs, {
    groupId: options.groupId,
    referenceDate,
    recentWindowDays,
    variationWindowDays,
    preferredProps: options.preferredProps,
  });

  const summaryKo =
    diffs.length > 0
      ? `겹친 동작 ${diffs.length}개를 새 동작으로 바꿨어요 (신선도 ${beforeReport.freshnessScore}% → ${afterReport.freshnessScore}%)`
      : beforeReport.recentDuplicateCount === 0
        ? '최근 수업과 겹친 메인 동작이 없어 바로 진행해도 좋아요.'
        : '잠겨 있거나 대체 후보가 부족해 변경된 동작이 없어요.';

  return {
    steps: nextSteps,
    diffs,
    replacedCount: diffs.length,
    preservedLockedCount,
    preservedRestCount,
    skippedSteps,
    beforeFreshnessScore: beforeReport.freshnessScore,
    afterFreshnessScore: afterReport.freshnessScore,
    summaryKo,
  };
}

function inspectFlowMetricsAndWarnings(
  steps: readonly SequenceStep[],
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): { metrics: SmartFlowMetrics; warnings: FlowSafetyWarning[]; score: number } {
  let springChanges = 0;
  let boxChanges = 0;
  let apparatusChanges = 0;
  let positionChanges = 0;
  let suddenStandingTransitions = 0;

  let curWristSteps = 0;
  let curWristMin = 0;
  let maxConsecutiveWristSteps = 0;
  let maxConsecutiveWristMin = 0;

  let curNeckSteps = 0;
  let curNeckMin = 0;
  let maxConsecutiveNeckSteps = 0;
  let maxConsecutiveNeckMin = 0;

  const warnings: FlowSafetyWarning[] = [];
  const wristRunIndices: number[] = [];
  const neckRunIndices: number[] = [];

  let prevEx: PilatesExercise | null = null;
  let prevStep: SequenceStep | null = null;
  let prevStepIndex = -1;
  let sawRestSincePrev = false;
  let firstExerciseSeen = false;

  steps.forEach((step, idx) => {
    if (isRestStep(step)) {
      sawRestSincePrev = true;
      curWristSteps = 0;
      curWristMin = 0;
      wristRunIndices.length = 0;
      curNeckSteps = 0;
      curNeckMin = 0;
      neckRunIndices.length = 0;
      return;
    }

    const ex = exerciseMap.get(step.exerciseId);
    if (!ex) return;

    const dur = Math.max(0, Number.isFinite(step.durationMin) ? step.durationMin : 0);

    if (!firstExerciseSeen) {
      firstExerciseSeen = true;
      if (isHighLoadExtensionExercise(ex) && steps.filter((s) => !isRestStep(s)).length > 1) {
        warnings.push({
          type: 'unwarmed-extension',
          severity: 'warning',
          stepIndices: [idx],
          messageKo: `첫 동작 ‘${ex.nameKo}’이 신전 강도가 높은 동작이에요. 앞에 호흡·예열 워밍업을 두어 척추를 먼저 풀어주세요.`,
        });
      }
    }

    if (prevEx && prevStep) {
      if (prevEx.apparatus !== ex.apparatus) apparatusChanges += 1;
      if (prevEx.box !== ex.box) boxChanges += 1;
      if (getEffectiveSprings(prevStep, prevEx) !== getEffectiveSprings(step, ex)) {
        springChanges += 1;
      }
      if (prevEx.bodyPosition !== ex.bodyPosition) {
        positionChanges += 1;
      }

      // Sudden low-to-standing orthostatic jump without intermediate seated/kneeling/quadruped or rest
      if (
        !sawRestSincePrev &&
        (prevEx.bodyPosition === 'supine' || prevEx.bodyPosition === 'prone') &&
        ex.bodyPosition === 'standing'
      ) {
        suddenStandingTransitions += 1;
        warnings.push({
          type: 'sudden-standing-transition',
          severity: 'warning',
          stepIndices: [prevStepIndex, idx],
          messageKo: `${POSITION_LABELS[prevEx.bodyPosition].ko.split(' ')[0]} 자세(${prevEx.nameKo})에서 바로 서기(${ex.nameKo})로 넘어가요. 앉기·무릎서기를 사이에 두면 어지러움을 줄일 수 있어요.`,
        });
      }
    }

    if (isWristLoadExercise(ex)) {
      curWristSteps += 1;
      curWristMin += dur;
      wristRunIndices.push(idx);
      if (curWristSteps > maxConsecutiveWristSteps) maxConsecutiveWristSteps = curWristSteps;
      if (curWristMin > maxConsecutiveWristMin) maxConsecutiveWristMin = curWristMin;
      if (curWristSteps === 2 || (curWristSteps === 1 && curWristMin >= 8)) {
        warnings.push({
          type: 'consecutive-wrist-load',
          severity: 'warning',
          stepIndices: [...wristRunIndices],
          messageKo: `손목 지지 동작이 연속(${curWristSteps}개, ${Number(curWristMin.toFixed(1))}분)으로 이어져요. 중간에 누운 자세나 앉은 동작을 넣어 부담을 나눠주세요.`,
        });
      }
    } else {
      curWristSteps = 0;
      curWristMin = 0;
      wristRunIndices.length = 0;
    }

    if (isNeckLoadExercise(ex)) {
      curNeckSteps += 1;
      curNeckMin += dur;
      neckRunIndices.push(idx);
      if (curNeckSteps > maxConsecutiveNeckSteps) maxConsecutiveNeckSteps = curNeckSteps;
      if (curNeckMin > maxConsecutiveNeckMin) maxConsecutiveNeckMin = curNeckMin;
      if (curNeckSteps === 2 || (curNeckSteps === 1 && curNeckMin >= 9)) {
        warnings.push({
          type: 'consecutive-neck-load',
          severity: 'info',
          stepIndices: [...neckRunIndices],
          messageKo: `복부 컬업 등 목 긴장이 쌓이는 동작이 연속(${curNeckSteps}개) 배치됐어요. 중간에 다른 체위 동작으로 분산하면 편해요.`,
        });
      }
    } else {
      curNeckSteps = 0;
      curNeckMin = 0;
      neckRunIndices.length = 0;
    }

    prevEx = ex;
    prevStep = step;
    prevStepIndex = idx;
    sawRestSincePrev = false;
  });

  const nonRestCount = steps.filter((s) => !isRestStep(s)).length;
  if (nonRestCount >= 4 && springChanges > Math.max(4, Math.ceil(nonRestCount * 0.6))) {
    warnings.push({
      type: 'excessive-spring-changes',
      severity: 'info',
      stepIndices: [],
      messageKo: `스프링 교체가 ${springChanges}회로 잦아요. 비슷한 스프링 동작을 묶으면 수업 흐름이 매끄러워져요.`,
    });
  }

  const penalty =
    suddenStandingTransitions * 16 +
    Math.max(0, maxConsecutiveWristSteps - 1) * 14 +
    Math.max(0, maxConsecutiveNeckSteps - 1) * 10 +
    Math.max(0, springChanges - 3) * 4 +
    Math.max(0, boxChanges - 1) * 6 +
    apparatusChanges * 7 +
    warnings.filter((w) => w.type === 'unwarmed-extension').length * 15;

  const score = nonRestCount <= 1 ? 100 : Math.max(25, Math.min(100, 100 - penalty));

  return {
    metrics: {
      springChanges,
      boxChanges,
      apparatusChanges,
      positionChanges,
      suddenStandingTransitions,
      maxConsecutiveWristSteps,
      maxConsecutiveWristMin: Number(maxConsecutiveWristMin.toFixed(1)),
      maxConsecutiveNeckSteps,
      maxConsecutiveNeckMin: Number(maxConsecutiveNeckMin.toFixed(1)),
    },
    warnings,
    score,
  };
}

function evaluateSequenceFlowCost(
  steps: readonly SequenceStep[],
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): number {
  let cost = 0;
  let prevEx: PilatesExercise | null = null;
  let prevStep: SequenceStep | null = null;
  let sawRest = false;
  let wristRun = 0;
  let neckRun = 0;
  let prevHeightDir = 0;
  let exerciseIndex = 0;

  for (const step of steps) {
    if (isRestStep(step)) {
      sawRest = true;
      wristRun = 0;
      neckRun = 0;
      continue;
    }
    const ex = exerciseMap.get(step.exerciseId);
    if (!ex) continue;

    if (exerciseIndex === 0) {
      if (isHighLoadExtensionExercise(ex)) cost += 65;
      if (ex.bodyPosition === 'standing') cost += 20;
    }

    if (prevEx && prevStep) {
      if (prevEx.apparatus !== ex.apparatus) cost += 40;
      if (prevEx.box !== ex.box) cost += 28;

      const prevSpring = getEffectiveSprings(prevStep, prevEx);
      const currSpring = getEffectiveSprings(step, ex);
      if (prevSpring !== currSpring) {
        const delta = Math.abs(parseSpringLoadUnits(prevSpring) - parseSpringLoadUnits(currSpring));
        cost += 16 + Math.round(delta * 5);
      }

      if (prevEx.bodyPosition !== ex.bodyPosition) {
        cost += 6;
      }

      // Strongly penalize sudden supine/prone -> standing transitions
      if (
        !sawRest &&
        (prevEx.bodyPosition === 'supine' || prevEx.bodyPosition === 'prone') &&
        ex.bodyPosition === 'standing'
      ) {
        cost += 55;
      }

      // Encourage progressive supine -> seated/quadruped/kneeling -> standing flow (and smooth descent)
      const prevTier = HEAD_HEIGHT_TIER[prevEx.bodyPosition];
      const currTier = HEAD_HEIGHT_TIER[ex.bodyPosition];
      const tierDiff = currTier - prevTier;
      if (Math.abs(tierDiff) >= 2) {
        cost += 28;
      } else if (tierDiff !== 0) {
        const dir = tierDiff > 0 ? 1 : -1;
        if (prevHeightDir !== 0 && dir !== prevHeightDir) {
          cost += 14; // penalize up-down-up yo-yo
        }
        prevHeightDir = dir;
      }

      // Small preference for natural positional progression when costs tie
      if (
        POSITION_PROGRESSION_ORDER[ex.bodyPosition] <
          POSITION_PROGRESSION_ORDER[prevEx.bodyPosition] &&
        ex.blockCategory !== 'feet-in-straps' &&
        ex.blockCategory !== 'cooldown'
      ) {
        cost += 5;
      }
    }

    if (isWristLoadExercise(ex)) {
      wristRun += 1;
      if (wristRun >= 2) cost += 42 * (wristRun - 1);
    } else {
      wristRun = 0;
    }

    if (isNeckLoadExercise(ex)) {
      neckRun += 1;
      if (neckRun >= 2) cost += 34 * (neckRun - 1);
    } else {
      neckRun = 0;
    }

    prevEx = ex;
    prevStep = step;
    sawRest = false;
    exerciseIndex += 1;
  }

  return cost;
}

/**
 * 6. Smart biomechanical & setup flow optimizer:
 * Arranges unlocked main steps for smooth supine → seated/quadruped/kneeling → standing flow,
 * minimizes spring/box/apparatus changes, distributes consecutive wrist & neck loads,
 * and flags/resolves sudden supine/prone → standing transitions.
 */
export function optimizeSequenceFlowSmart(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[] | ReadonlyMap<string, PilatesExercise>,
  options: SmartFlowOptions = {},
): SmartFlowOptimizationResult {
  const exerciseMap = buildExerciseMap(exercises);
  const preserveWarmupAndCooldown = options.preserveWarmupAndCooldown ?? true;
  const enforceWarmupBeforeHighExtension = options.enforceWarmupBeforeHighExtension ?? true;

  const before = inspectFlowMetricsAndWarnings(steps, exerciseMap);
  if (steps.length <= 2) {
    return {
      steps: steps.map((s) => ({ ...s })),
      changed: false,
      beforeScore: before.score,
      afterScore: before.score,
      beforeMetrics: before.metrics,
      afterMetrics: before.metrics,
      beforeWarnings: before.warnings,
      afterWarnings: before.warnings,
      resolvedWarningsCount: 0,
      improvementsKo: [],
    };
  }

  // Classify fixed vs movable indices
  // Locked steps, rest steps, and (optionally) warmup/cooldown steps stay anchored in their zones
  const working: SequenceStep[] = steps.map((s) => ({ ...s }));

  // First, ensure unlocked warmup steps are at the front and cooldown steps at the end
  // (without displacing locked or rest steps).
  const movableIndices: number[] = [];
  for (let i = 0; i < working.length; i += 1) {
    const st = working[i];
    if (isRestStep(st) || isStepLocked(st)) continue;
    movableIndices.push(i);
  }

  if (movableIndices.length <= 1) {
    return {
      steps: working,
      changed: false,
      beforeScore: before.score,
      afterScore: before.score,
      beforeMetrics: before.metrics,
      afterMetrics: before.metrics,
      beforeWarnings: before.warnings,
      afterWarnings: before.warnings,
      resolvedWarningsCount: 0,
      improvementsKo: [],
    };
  }

  const movableSteps = movableIndices.map((idx) => working[idx]);
  const warmups: SequenceStep[] = [];
  const mainPool: SequenceStep[] = [];
  const cooldowns: SequenceStep[] = [];

  for (const st of movableSteps) {
    const ex = exerciseMap.get(st.exerciseId);
    const cat = st.blockCategory || ex?.blockCategory;
    if (preserveWarmupAndCooldown && cat === 'warmup') {
      warmups.push(st);
    } else if (preserveWarmupAndCooldown && cat === 'cooldown') {
      cooldowns.push(st);
    } else {
      mainPool.push(st);
    }
  }

  // Helper to reconstruct full step array given an ordering of mainPool
  const assembleCandidate = (orderedMain: readonly SequenceStep[]): SequenceStep[] => {
    const combinedMovable = [...warmups, ...orderedMain, ...cooldowns];
    const out = working.map((s) => ({ ...s }));
    movableIndices.forEach((slotIdx, pos) => {
      out[slotIdx] = combinedMovable[pos];
    });
    return out;
  };

  // Seed initial main ordering with canonical physiological baseline (position tier + box + spring)
  const baselineMain = [...mainPool].sort((a, b) => {
    const exA = exerciseMap.get(a.exerciseId);
    const exB = exerciseMap.get(b.exerciseId);
    if (!exA || !exB) return 0;
    // Keep feet-in-straps near the end of main before cooldown
    const tailA = exA.blockCategory === 'feet-in-straps' ? 1 : 0;
    const tailB = exB.blockCategory === 'feet-in-straps' ? 1 : 0;
    if (tailA !== tailB) return tailA - tailB;

    // Keep high-load extension out of index 0 when warmups are absent
    if (enforceWarmupBeforeHighExtension && warmups.length === 0) {
      const extA = isHighLoadExtensionExercise(exA) ? 1 : 0;
      const extB = isHighLoadExtensionExercise(exB) ? 1 : 0;
      if (extA !== extB) return extA - extB;
    }

    const tierDiff = HEAD_HEIGHT_TIER[exA.bodyPosition] - HEAD_HEIGHT_TIER[exB.bodyPosition];
    if (tierDiff !== 0) return tierDiff;
    const posDiff =
      POSITION_PROGRESSION_ORDER[exA.bodyPosition] - POSITION_PROGRESSION_ORDER[exB.bodyPosition];
    if (posDiff !== 0) return posDiff;
    const boxDiff = BOX_ORDER[exA.box] - BOX_ORDER[exB.box];
    if (boxDiff !== 0) return boxDiff;
    return parseSpringLoadUnits(exB.springs) - parseSpringLoadUnits(exA.springs);
  });

  // Evaluate both current mainPool order and baselineMain, then run greedy + 2-opt + swap local search
  const candidatesToRefine: SequenceStep[][] = [[...mainPool], baselineMain];

  // Also add greedy nearest-neighbor start from each distinct starting element (up to 6 starts)
  const maxGreedyStarts = Math.min(mainPool.length, 6);
  for (let startIdx = 0; startIdx < maxGreedyStarts; startIdx += 1) {
    const remaining = [...baselineMain];
    const startItem = remaining.splice(startIdx, 1)[0];
    if (!startItem) continue;
    const built: SequenceStep[] = [startItem];
    while (remaining.length > 0) {
      let bestPickIdx = 0;
      let bestPickCost = Number.POSITIVE_INFINITY;
      for (let j = 0; j < remaining.length; j += 1) {
        const trial = [...built, remaining[j]];
        const partialSteps = [...warmups, ...trial];
        const trialCost = evaluateSequenceFlowCost(partialSteps, exerciseMap);
        if (trialCost < bestPickCost) {
          bestPickCost = trialCost;
          bestPickIdx = j;
        }
      }
      built.push(remaining.splice(bestPickIdx, 1)[0]);
    }
    candidatesToRefine.push(built);
  }

  let bestFull = assembleCandidate(mainPool);
  let bestCost = evaluateSequenceFlowCost(bestFull, exerciseMap);

  for (const seed of candidatesToRefine) {
    const current = [...seed];
    let currentCost = evaluateSequenceFlowCost(assembleCandidate(current), exerciseMap);

    // Local search: pairwise swaps & insertions until local optimum (fast & deterministic)
    let improved = true;
    let passes = 0;
    while (improved && passes < 12) {
      improved = false;
      passes += 1;

      for (let i = 0; i < current.length; i += 1) {
        for (let j = i + 1; j < current.length; j += 1) {
          // Try swapping i and j
          const swapped = [...current];
          [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
          const swapCost = evaluateSequenceFlowCost(assembleCandidate(swapped), exerciseMap);
          if (swapCost < currentCost) {
            current.splice(0, current.length, ...swapped);
            currentCost = swapCost;
            improved = true;
          }
        }
      }

      // Try single-item relocate
      for (let i = 0; i < current.length; i += 1) {
        for (let j = 0; j < current.length; j += 1) {
          if (i === j) continue;
          const moved = [...current];
          const [item] = moved.splice(i, 1);
          moved.splice(j, 0, item);
          const moveCost = evaluateSequenceFlowCost(assembleCandidate(moved), exerciseMap);
          if (moveCost < currentCost) {
            current.splice(0, current.length, ...moved);
            currentCost = moveCost;
            improved = true;
          }
        }
      }
    }

    if (currentCost < bestCost) {
      bestCost = currentCost;
      bestFull = assembleCandidate(current);
    }
  }

  const finalSteps = bestFull.map((step, idx) =>
    isRestStep(step) || isStepLocked(step) ? step : { ...step, order: idx + 1 },
  );

  const changed = finalSteps.some(
    (step, idx) =>
      step.stepId !== steps[idx]?.stepId || step.exerciseId !== steps[idx]?.exerciseId,
  );

  const after = inspectFlowMetricsAndWarnings(finalSteps, exerciseMap);
  const improvementsKo: string[] = [];

  if (after.metrics.suddenStandingTransitions < before.metrics.suddenStandingTransitions) {
    improvementsKo.push(
      `누움·엎드림에서 바로 기립하는 전환을 ${before.metrics.suddenStandingTransitions}회 → ${after.metrics.suddenStandingTransitions}회로 줄였어요.`,
    );
  }
  if (after.metrics.springChanges < before.metrics.springChanges) {
    improvementsKo.push(
      `스프링 변경 횟수를 ${before.metrics.springChanges}회 → ${after.metrics.springChanges}회로 줄였어요.`,
    );
  }
  if (after.metrics.maxConsecutiveWristSteps < before.metrics.maxConsecutiveWristSteps) {
    improvementsKo.push(
      `연속 손목 지지 구간을 ${before.metrics.maxConsecutiveWristSteps}개 → ${after.metrics.maxConsecutiveWristSteps}개로 분산했어요.`,
    );
  }
  if (after.metrics.maxConsecutiveNeckSteps < before.metrics.maxConsecutiveNeckSteps) {
    improvementsKo.push(
      `연속 목·컬업 구간을 ${before.metrics.maxConsecutiveNeckSteps}개 → ${after.metrics.maxConsecutiveNeckSteps}개로 분산했어요.`,
    );
  }
  if (changed && improvementsKo.length === 0) {
    improvementsKo.push('체위 흐름(누움→앉음→네발·무릎→서기)과 기구 세팅 동선을 정돈했어요.');
  }

  return {
    steps: finalSteps,
    changed,
    beforeScore: before.score,
    afterScore: after.score,
    beforeMetrics: before.metrics,
    afterMetrics: after.metrics,
    beforeWarnings: before.warnings,
    afterWarnings: after.warnings,
    resolvedWarningsCount: Math.max(0, before.warnings.length - after.warnings.length),
    improvementsKo,
  };
}

function allocateStepsToTargetMinutes(
  steps: readonly SequenceStep[],
  targetMinutes: number,
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): SequenceStep[] {
  const safeTarget = Math.max(15, Math.min(120, Math.round(targetMinutes)));
  const adjustable = steps
    .map((step, idx) => ({ step, idx }))
    .filter(({ step }) => !isRestStep(step) && !isStepLocked(step));

  const fixedMin = steps
    .filter((step) => isRestStep(step) || isStepLocked(step))
    .reduce((sum, step) => sum + step.durationMin, 0);

  if (adjustable.length === 0) return steps.map((s) => ({ ...s }));

  const remainingMin = Math.max(adjustable.length * 1.5, safeTarget - fixedMin);
  // Use half-minute units (0.5 min) so durations stay clean & human-readable (e.g., 4, 5, 5.5, 6)
  const targetHalfUnits = Math.round(remainingMin * 2);

  const weights = adjustable.map(({ step }) => {
    const ex = exercisesById.get(step.exerciseId);
    const cat = step.blockCategory || ex?.blockCategory;
    if (cat === 'warmup') return 4;
    if (cat === 'cooldown') return 3.5;
    if (cat === 'lower-body' || ex?.isUnilateral) return 7;
    return Math.max(3, ex?.defaultDurationMin ?? step.durationMin ?? 5);
  });

  const minHalfUnits = adjustable.map(({ step }) => {
    const cat = step.blockCategory;
    return cat === 'warmup' || cat === 'cooldown' ? 4 : 6; // >= 2 min warmup/cooldown, >= 3 min main
  });

  const minSum = minHalfUnits.reduce((acc, v) => acc + v, 0);
  const allocated: number[] = [...minHalfUnits];

  if (targetHalfUnits > minSum) {
    const spare = targetHalfUnits - minSum;
    const weightSum = weights.reduce((acc, v) => acc + v, 0);
    const exactExtras = weights.map((w, idx) => ({ idx, exact: (spare * w) / weightSum }));
    let distributed = 0;
    for (const item of exactExtras) {
      const whole = Math.floor(item.exact);
      allocated[item.idx] += whole;
      distributed += whole;
    }
    let leftover = spare - distributed;
    exactExtras.sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.idx - b.idx);
    for (const item of exactExtras) {
      if (leftover <= 0) break;
      allocated[item.idx] += 1;
      leftover -= 1;
    }
  } else if (targetHalfUnits < minSum) {
    // Tight budget (e.g. many steps in 30 min): distribute evenly in 0.5-min increments >= 2 half-units (1 min)
    const base = Math.max(2, Math.floor(targetHalfUnits / adjustable.length));
    for (let i = 0; i < allocated.length; i += 1) allocated[i] = base;
    let leftover = targetHalfUnits - base * adjustable.length;
    for (let i = 0; i < allocated.length && leftover > 0; i += 1) {
      allocated[i] += 1;
      leftover -= 1;
    }
  }

  const byIndex = new Map<number, number>();
  adjustable.forEach(({ idx }, i) => {
    byIndex.set(idx, Number((allocated[i] / 2).toFixed(1)));
  });

  let prevEx: PilatesExercise | undefined;
  return steps.map((step, idx) => {
    if (isRestStep(step)) return { ...step, order: idx + 1 };
    const ex = exercisesById.get(step.exerciseId);
    const transitionSec = !prevEx
      ? 0
      : ex && prevEx.apparatus !== ex.apparatus
        ? 30
        : ex && prevEx.box !== ex.box
          ? 20
          : 15;
    prevEx = ex;
    if (isStepLocked(step)) return { ...step, order: idx + 1 };
    return {
      ...step,
      order: idx + 1,
      durationMin: byIndex.get(idx) ?? step.durationMin,
      explanationSec: step.explanationSec ?? 20,
      transitionSec,
    };
  });
}

function desiredStepCountForDuration(targetMinutes: number): number {
  if (targetMinutes <= 30) return 6;
  if (targetMinutes <= 42) return 8;
  if (targetMinutes <= 54) return 10;
  return 11;
}

function pickCompensatoryPlanes(mainExercises: readonly PilatesExercise[]): {
  preferredPlanes: SpinalPlane[];
  reasonKo: string;
} {
  const counts: Record<SpinalPlane, number> = {
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
    neutral: 0,
  };
  for (const ex of mainExercises) {
    for (const plane of ex.spinalPlanes) {
      counts[plane] = (counts[plane] ?? 0) + 1;
    }
  }

  if (counts.extension > counts.flexion && counts.extension >= 2) {
    return {
      preferredPlanes: ['flexion', 'lateral'],
      reasonKo: '메인에 척추 신전(Extension) 비중이 높아 반대 평면인 굴곡·측굴 이완 쿨다운을 배치했어요.',
    };
  }
  if (counts.flexion > counts.extension && counts.flexion >= 2) {
    return {
      preferredPlanes: ['extension', 'lateral'],
      reasonKo: '메인에 척추 굴곡(Flexion) 비중이 높아 가슴·측면을 열어주는 보상 스트레칭으로 마무리해요.',
    };
  }
  if (counts.rotation >= 2 && counts.lateral === 0) {
    return {
      preferredPlanes: ['lateral', 'neutral'],
      reasonKo: '회전 동작 이후 척추 양옆 균형을 맞추는 측굴(Lateral) 쿨다운을 배치했어요.',
    };
  }
  return {
    preferredPlanes: ['lateral', 'flexion', 'extension'],
    reasonKo: '전신 메인 흐름을 부드럽게 가라앉히는 측굴·호흡 정리 쿨다운으로 마무리해요.',
  };
}

/**
 * 3. Anchor-first auto-completion:
 * Given 1~2 core exercises the instructor definitely wants to teach, automatically builds
 * a balanced 30/40/50/60-min class around them (warm-up -> main with 4-plane balance & flow ->
 * compensatory cooldown) while avoiding overlaps with recent class history.
 */
export function buildAnchorFirstSequence(input: AnchorFirstSequenceInput): AnchorFirstSequenceResult {
  const catalog = toExerciseList(input.exercises);
  const exerciseMap = buildExerciseMap(catalog);
  const referenceDate = input.referenceDate ?? new Date();
  const targetMinutes = Math.max(20, Math.min(90, Math.round(input.targetMinutes ?? 50)));

  const uniqueAnchorIds = [...new Set(input.anchorExerciseIds.filter((id) => exerciseMap.has(id)))].slice(
    0,
    2,
  );
  if (uniqueAnchorIds.length === 0) {
    throw new Error('기준이 될 메인 동작을 1개 이상 선택해 주세요.');
  }

  const anchors = uniqueAnchorIds.map((id) => exerciseMap.get(id)!);
  const targetLevel: DifficultyLevel =
    input.level ??
    anchors.reduce<DifficultyLevel>(
      (maxLv, ex) => (levelRank(ex.level) > levelRank(maxLv) ? ex.level : maxLv),
      '1.0',
    );

  const anchorApparatusSet = new Set<ApparatusType>(anchors.map((a) => a.apparatus));
  const scope = input.apparatusScope ?? 'anchor-match';
  const preferredApparatusSet: Set<ApparatusType> | null =
    scope === 'mixed'
      ? null
      : scope === 'anchor-match'
        ? anchorApparatusSet
        : new Set<ApparatusType>([scope, ...anchorApparatusSet]);

  const historyIndex = buildHistoryIndex(input.historyLogs, exerciseMap, {
    groupId: input.groupId,
    referenceDate,
    lookbackDays: 28,
  });

  const usedIds = new Set<string>(anchors.map((a) => a.id));
  const usedKeys = new Set<string>(anchors.map((a) => getMovementKey(a)));
  const coveredPlanes = new Set<SpinalPlane>(anchors.flatMap((a) => a.spinalPlanes));
  const anchorAvgSpring =
    anchors.reduce((sum, a) => sum + parseSpringLoadUnits(a.springs), 0) / anchors.length;

  const selectCandidate = (opts: {
    allowedCategories: readonly ClassBlockCategory[];
    preferredCategories?: readonly ClassBlockCategory[];
    preferredPlanes?: readonly SpinalPlane[];
    allowAnyCategoryFallback?: boolean;
    preferFresh?: boolean;
    requireNonHighExtension?: boolean;
    lastSelected?: PilatesExercise;
  }): PilatesExercise | undefined => {
    const filterPool = (
      strictApparatus: boolean,
      strictCategory: boolean,
      avoidRecent7d: boolean,
    ): PilatesExercise[] =>
      catalog.filter((cand) => {
        if (usedIds.has(cand.id) || usedKeys.has(getMovementKey(cand))) return false;
        if (strictApparatus && preferredApparatusSet && !preferredApparatusSet.has(cand.apparatus)) {
          return false;
        }
        if (strictCategory && !opts.allowedCategories.includes(cand.blockCategory)) return false;
        if (opts.requireNonHighExtension && isHighLoadExtensionExercise(cand)) return false;
        if (avoidRecent7d && opts.preferFresh !== false && !ROUTINE_EXEMPT_BLOCKS.has(cand.blockCategory)) {
          const hist = lookupHistoryRecord(cand, historyIndex);
          if (hist && hist.daysSinceLastTaught <= 7) return false;
        }
        return true;
      });

    let pool = filterPool(true, true, true);
    if (pool.length === 0) pool = filterPool(false, true, true);
    if (pool.length === 0 && opts.allowAnyCategoryFallback) pool = filterPool(true, false, true);
    if (pool.length === 0 && opts.allowAnyCategoryFallback) pool = filterPool(false, false, true);
    // Only fall back to recent 7-day history if no fresh candidate exists at all
    if (pool.length === 0) pool = filterPool(true, true, false);
    if (pool.length === 0) pool = filterPool(false, true, false);
    if (pool.length === 0 && opts.allowAnyCategoryFallback) pool = filterPool(true, false, false);
    if (pool.length === 0 && opts.allowAnyCategoryFallback) pool = filterPool(false, false, false);
    if (pool.length === 0) return undefined;

    const missingPlanes = FOUR_SPINAL_PLANES.filter((p) => !coveredPlanes.has(p));

    const scored = pool.map((cand) => {
      let score = 50;
      const hist = lookupHistoryRecord(cand, historyIndex);
      const isRoutine = ROUTINE_EXEMPT_BLOCKS.has(cand.blockCategory);

      if (preferredApparatusSet?.has(cand.apparatus)) score += 32;
      if (opts.preferredCategories?.includes(cand.blockCategory)) score += 22;

      if (opts.preferFresh !== false) {
        if (!hist || hist.daysSinceLastTaught > 14) {
          score += isRoutine ? 8 : 38;
        } else if (hist.daysSinceLastTaught > 7) {
          score += isRoutine ? 4 : 12;
        } else {
          // Strong penalty for recent 7-day duplicate on main blocks
          score -= isRoutine ? 4 : 95;
        }
      }

      if (levelRank(cand.level) <= levelRank(targetLevel)) {
        score += cand.level === targetLevel ? 14 : 9;
      } else {
        score -= 24;
      }

      // Boost candidates covering missing spinal planes
      const planesToMatch =
        opts.preferredPlanes && opts.preferredPlanes.length > 0
          ? opts.preferredPlanes
          : missingPlanes;
      const matchedPlaneCount = cand.spinalPlanes.filter((p) => planesToMatch.includes(p)).length;
      score += matchedPlaneCount * 22;

      // Smooth spring & setup flow with anchor / previous exercise
      const springRef = opts.lastSelected
        ? parseSpringLoadUnits(opts.lastSelected.springs)
        : anchorAvgSpring;
      const springDelta = Math.abs(parseSpringLoadUnits(cand.springs) - springRef);
      score += Math.max(-10, 12 - Math.round(springDelta * 5));

      if (opts.lastSelected && cand.box === opts.lastSelected.box) score += 8;
      if (
        input.preferredProps &&
        input.preferredProps.length > 0 &&
        cand.props.some((p) => p !== 'none' && input.preferredProps!.includes(p))
      ) {
        score += 7;
      }

      return { cand, score };
    });

    scored.sort((a, b) => b.score - a.score || a.cand.id.localeCompare(b.cand.id));
    const picked = scored[0]?.cand;
    if (picked) {
      usedIds.add(picked.id);
      usedKeys.add(getMovementKey(picked));
      for (const plane of picked.spinalPlanes) coveredPlanes.add(plane);
    }
    return picked;
  };

  // 1. Warm-up (always placed first unless an anchor is already warmup)
  const warmupExercises: PilatesExercise[] = [];
  const mainExercises: PilatesExercise[] = [];
  const cooldownExercises: PilatesExercise[] = [];

  for (const anchor of anchors) {
    if (anchor.blockCategory === 'warmup') warmupExercises.push(anchor);
    else if (anchor.blockCategory === 'cooldown') cooldownExercises.push(anchor);
    else mainExercises.push(anchor);
  }

  if (warmupExercises.length === 0) {
    const warmupPick = selectCandidate({
      allowedCategories: ['warmup'],
      requireNonHighExtension: true,
    });
    if (warmupPick) warmupExercises.push(warmupPick);
  }

  // 2. Main workout blocks (fill around anchor(s) to target count)
  const desiredTotal = desiredStepCountForDuration(targetMinutes);
  const desiredMainCount = Math.max(mainExercises.length, desiredTotal - 2);

  const canonicalMainOrder: ClassBlockCategory[] = [
    'footwork',
    'bridging',
    'core',
    'upper-body',
    'lower-body',
    'plank',
    'extension',
    'feet-in-straps',
  ];

  // If any anchor is a high-load extension, ensure at least one preparatory footwork/bridging step exists
  const hasHighExtensionAnchor = anchors.some(isHighLoadExtensionExercise);
  if (
    hasHighExtensionAnchor &&
    !mainExercises.some((ex) => ex.blockCategory === 'footwork' || ex.blockCategory === 'bridging')
  ) {
    const prepPick = selectCandidate({
      allowedCategories: ['footwork', 'bridging'],
      preferredCategories: ['footwork', 'bridging'],
      requireNonHighExtension: true,
      lastSelected: warmupExercises[0],
    });
    if (prepPick) mainExercises.unshift(prepPick);
  }

  const usedMainCategories = new Set<ClassBlockCategory>(mainExercises.map((e) => e.blockCategory));
  let guard = 0;
  while (mainExercises.length < desiredMainCount && guard < 24) {
    guard += 1;
    const missingBlocks = canonicalMainOrder.filter((cat) => !usedMainCategories.has(cat));
    const missingPlanes = FOUR_SPINAL_PLANES.filter((p) => !coveredPlanes.has(p));

    const nextPick = selectCandidate({
      allowedCategories: missingBlocks.length > 0 ? missingBlocks : canonicalMainOrder,
      preferredCategories: missingBlocks.slice(0, 3),
      preferredPlanes: missingPlanes,
      allowAnyCategoryFallback: true,
      lastSelected: mainExercises.at(-1) ?? warmupExercises[0],
    });
    if (!nextPick) break;
    mainExercises.push(nextPick);
    usedMainCategories.add(nextPick.blockCategory);
  }

  // 3. Compensatory Cooldown (opposite spinal plane of main emphasis)
  const { preferredPlanes: cooldownPlanes, reasonKo: compensatoryCooldownReasonKo } =
    pickCompensatoryPlanes(mainExercises);

  if (cooldownExercises.length === 0) {
    const cooldownPick =
      selectCandidate({
        allowedCategories: ['cooldown'],
        preferredPlanes: cooldownPlanes,
        lastSelected: mainExercises.at(-1),
      }) ??
      selectCandidate({
        allowedCategories: ['feet-in-straps', 'warmup'],
        preferredPlanes: cooldownPlanes,
        lastSelected: mainExercises.at(-1),
      });
    if (cooldownPick) cooldownExercises.push(cooldownPick);
  }

  const defaultLayer: LayerMode =
    targetLevel === '1.0' ? 'easy' : targetLevel === '2.0' ? 'hard' : 'standard';

  const anchorIdSet = new Set(uniqueAnchorIds);
  const rawOrdered = [...warmupExercises, ...mainExercises, ...cooldownExercises];
  const rawSteps: SequenceStep[] = rawOrdered.map((ex, idx) => ({
    kind: 'exercise',
    stepId: `anchor-auto-${idx + 1}-${ex.id}`,
    order: idx + 1,
    blockCategory: ex.blockCategory,
    exerciseId: ex.id,
    durationMin: ex.defaultDurationMin || 5,
    selectedLayer:
      ex.blockCategory === 'warmup' || ex.blockCategory === 'cooldown'
        ? defaultLayer === 'hard'
          ? 'standard'
          : defaultLayer
        : defaultLayer,
    explanationSec: targetLevel === '1.0' ? 25 : 20,
    transitionSec: idx === 0 ? 0 : 15,
    instructorNote: anchorIdSet.has(ex.id) ? '오늘 수업의 핵심 메인 동작' : undefined,
  }));

  // 4. Smart flow optimization (preserves warmup first, cooldown last, checks transitions & joint loads)
  const flowOptimization = optimizeSequenceFlowSmart(rawSteps, exerciseMap, {
    preserveWarmupAndCooldown: true,
    enforceWarmupBeforeHighExtension: true,
  });

  // 5. Fit durations cleanly to exact targetMinutes
  const fittedSteps = allocateStepsToTargetMinutes(
    flowOptimization.steps,
    targetMinutes,
    exerciseMap,
  );

  const freshness = analyzeSequenceFreshness(fittedSteps, catalog, input.historyLogs, {
    groupId: input.groupId,
    referenceDate,
    preferredProps: input.preferredProps,
  });

  const finalPlanes = new Set<SpinalPlane>();
  const finalApparatusSet = new Set<ApparatusType>();
  for (const st of fittedSteps) {
    const ex = exerciseMap.get(st.exerciseId);
    if (!ex) continue;
    finalApparatusSet.add(ex.apparatus);
    for (const p of ex.spinalPlanes) finalPlanes.add(p);
  }

  const coveredSpinalPlanes = FOUR_SPINAL_PLANES.filter((p) => finalPlanes.has(p));
  const missingSpinalPlanes = FOUR_SPINAL_PLANES.filter((p) => !finalPlanes.has(p));
  const resolvedApparatus: ApparatusType | 'mixed' =
    finalApparatusSet.size === 1 ? [...finalApparatusSet][0] : 'mixed';

  const anchorNamesKo = anchors.map((a) => a.nameKo);
  const anchorStepIds = fittedSteps
    .filter((st) => anchorIdSet.has(st.exerciseId))
    .map((st) => st.stepId);

  const shortAnchorTitle = anchorNamesKo[0].split('&')[0].trim().slice(0, 20);
  const apparatusLabel =
    resolvedApparatus === 'mixed' ? '복합 기구' : APPARATUS_LABELS[resolvedApparatus].ko;

  const titleKo = `${shortAnchorTitle} 중심 · ${apparatusLabel} ${targetMinutes}분`;
  const subtitleKo = `${anchorNamesKo.join(' + ')} 앞뒤로 예열·4방향 균형·보상 쿨다운을 자동 연결했어요`;

  const highlightsKo: string[] = [
    `핵심 동작 ${anchorNamesKo.length}개 중심으로 총 ${fittedSteps.length}개 스텝(${targetMinutes}분) 완성`,
    `척추 움직임 ${coveredSpinalPlanes.length}/4평면(${coveredSpinalPlanes.map((p) => SPINAL_PLANE_LABELS[p].ko.split(' ')[0]).join('·') || '중립'}) 균형 배치`,
    `이전 수업 신선도 ${freshness.freshnessScore}% · 흐름 점수 ${flowOptimization.afterScore}점`,
    compensatoryCooldownReasonKo,
  ];

  return {
    titleKo,
    subtitleKo,
    targetMinutes,
    level: targetLevel,
    apparatus: resolvedApparatus,
    anchorExerciseIds: uniqueAnchorIds,
    anchorNamesKo,
    anchorStepIds,
    steps: fittedSteps,
    coveredSpinalPlanes,
    missingSpinalPlanes,
    compensatoryCooldownReasonKo,
    freshness,
    flowOptimization,
    highlightsKo,
  };
}

function inferSequenceApparatus(
  steps: readonly SequenceStep[],
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): ApparatusType | 'mixed' {
  const set = new Set<ApparatusType>();
  for (const st of steps) {
    if (isRestStep(st)) continue;
    const ex = exerciseMap.get(st.exerciseId);
    if (ex) set.add(ex.apparatus);
  }
  if (set.size === 1) return [...set][0];
  return set.size === 0 ? 'reformer' : 'mixed';
}

function buildSingleLevelFork(input: {
  baseTitle: string;
  baseSteps: readonly SequenceStep[];
  targetLevel: DifficultyLevel;
  catalog: readonly PilatesExercise[];
  exerciseMap: ReadonlyMap<string, PilatesExercise>;
  targetMinutes: number;
  nowIso: string;
}): LevelForkVariant {
  const { baseTitle, baseSteps, targetLevel, catalog, exerciseMap, targetMinutes, nowIso } = input;

  const defaultLayer: LayerMode =
    targetLevel === '1.0' ? 'easy' : targetLevel === '2.0' ? 'hard' : 'standard';

  const badgeKo =
    targetLevel === '1.0'
      ? '초급 · 입문 (1.0)'
      : targetLevel === '1.5'
        ? '중급 · 기본 (1.5)'
        : '심화 · 챌린지 (2.0)';

  const shortLabelKo =
    targetLevel === '1.0' ? '입문 1.0' : targetLevel === '1.5' ? '중급 1.5' : '심화 2.0';

  const usedIds = new Set<string>();
  const usedKeys = new Set<string>();
  for (const st of baseSteps) {
    if (!isRestStep(st) && isStepLocked(st)) {
      usedIds.add(st.exerciseId);
      const ex = exerciseMap.get(st.exerciseId);
      if (ex) usedKeys.add(getMovementKey(ex));
    }
  }

  let swappedCount = 0;
  let propEnhancedCount = 0;
  const changeSummaryKo: string[] = [];

  const forkedSteps: SequenceStep[] = baseSteps.map((step, idx) => {
    if (isRestStep(step)) {
      return { ...step, stepId: `fork-${targetLevel}-rest-${idx + 1}`, order: idx + 1 };
    }

    const origEx = exerciseMap.get(step.exerciseId);
    if (!origEx) {
      return { ...step, stepId: `fork-${targetLevel}-${idx + 1}`, order: idx + 1, selectedLayer: defaultLayer };
    }

    const locked = isStepLocked(step);
    const isRoutine = ROUTINE_EXEMPT_BLOCKS.has(origEx.blockCategory);
    let chosenEx = origEx;
    let propOverride = step.propOverride;
    let noteParts: string[] = [];

    if (!locked && !isRoutine) {
      if (targetLevel === '1.0' && levelRank(origEx.level) > 1) {
        // Downgrade high-difficulty exercises to Lv 1.0 (or 1.5) equivalent on same apparatus & block
        const easierPool = catalog.filter(
          (cand) =>
            cand.id !== origEx.id &&
            !usedIds.has(cand.id) &&
            !usedKeys.has(getMovementKey(cand)) &&
            cand.apparatus === origEx.apparatus &&
            cand.blockCategory === origEx.blockCategory &&
            levelRank(cand.level) < levelRank(origEx.level),
        );
        easierPool.sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.id.localeCompare(b.id));
        if (easierPool[0]) {
          chosenEx = easierPool[0];
          swappedCount += 1;
          changeSummaryKo.push(`${origEx.nameKo} → ${chosenEx.nameKo} (입문 완화)`);
        } else {
          noteParts.push(`완화 큐: ${origEx.layers.easy}`);
        }
      } else if (targetLevel === '2.0') {
        // Upgrade Lv 1.0 or bilateral main steps toward Lv 2.0 / unilateral / prop-challenged variations
        const harderPool = catalog.filter(
          (cand) =>
            cand.id !== origEx.id &&
            !usedIds.has(cand.id) &&
            !usedKeys.has(getMovementKey(cand)) &&
            cand.apparatus === origEx.apparatus &&
            cand.blockCategory === origEx.blockCategory &&
            (levelRank(cand.level) > levelRank(origEx.level) ||
              (cand.isUnilateral && !origEx.isUnilateral)),
        );
        harderPool.sort(
          (a, b) =>
            levelRank(b.level) - levelRank(a.level) ||
            Number(b.isUnilateral) - Number(a.isUnilateral) ||
            a.id.localeCompare(b.id),
        );
        if (harderPool[0] && levelRank(origEx.level) < 3) {
          chosenEx = harderPool[0];
          swappedCount += 1;
          changeSummaryKo.push(
            `${origEx.nameKo} → ${chosenEx.nameKo} (${chosenEx.isUnilateral ? '편측 심화' : '난이도 상향'})`,
          );
        } else {
          // Add challenge prop when none is set
          const hasProp = chosenEx.props.some((p) => p !== 'none') || Boolean(propOverride && propOverride !== 'none');
          if (!hasProp) {
            propOverride =
              chosenEx.blockCategory === 'core' || chosenEx.blockCategory === 'lower-body'
                ? 'magic-circle'
                : 'mini-ball';
            propEnhancedCount += 1;
            noteParts.push(`${PROP_LABELS[propOverride].ko} 추가 심화`);
          }
          noteParts.push(`심화 큐: ${chosenEx.layers.hard}`);
        }
      }
    }

    // Ensure uniqueness across non-locked steps
    usedIds.add(chosenEx.id);
    usedKeys.add(getMovementKey(chosenEx));

    const effectiveLayer: LayerMode =
      isRoutine && defaultLayer === 'hard' ? 'standard' : defaultLayer;

    if (targetLevel === '1.0' && noteParts.length === 0) {
      noteParts = [chosenEx.layers.easy];
    } else if (targetLevel === '1.5' && step.instructorNote) {
      noteParts = [step.instructorNote];
    }

    const explanationSec = targetLevel === '1.0' ? 30 : targetLevel === '2.0' ? 15 : 20;
    const repetitions = targetLevel === '1.0' ? 8 : targetLevel === '2.0' ? 12 : 10;

    return {
      ...step,
      stepId: `fork-${targetLevel}-${idx + 1}-${chosenEx.id}`,
      order: idx + 1,
      exerciseId: chosenEx.id,
      blockCategory: chosenEx.blockCategory,
      selectedLayer: locked ? step.selectedLayer : effectiveLayer,
      propOverride: locked ? step.propOverride : propOverride,
      explanationSec: locked ? step.explanationSec : explanationSec,
      repetitions: locked ? step.repetitions : repetitions,
      customSpringOverride: chosenEx.id !== origEx.id ? undefined : step.customSpringOverride,
      motionStudy: chosenEx.id !== origEx.id ? undefined : step.motionStudy,
      instructorNote: locked
        ? step.instructorNote
        : noteParts.filter(Boolean).join(' · ').slice(0, 140) || step.instructorNote,
    };
  });

  if (changeSummaryKo.length === 0) {
    if (targetLevel === '1.0') {
      changeSummaryKo.push('전 구간 이지(Easy) 완화 변주 · 설명 시간 30초로 여유 있게 배정');
    } else if (targetLevel === '1.5') {
      changeSummaryKo.push('기본 흐름을 그대로 유지한 표준 중급(Standard) 10회 템포');
    } else {
      changeSummaryKo.push(
        propEnhancedCount > 0
          ? `소도구 챌린지 ${propEnhancedCount}곳 추가 · 하드(Hard) 12회 템포 적용`
          : '전 메인 구간 하드(Hard) 챌린지 레이어 · 12회 템포 적용',
      );
    }
  }

  const apparatus = inferSequenceApparatus(forkedSteps, exerciseMap);
  const cleanBase = baseTitle.replace(/\s*\((?:입문|중급|심화)[^)]*\)\s*$/g, '').trim() || '맞춤 시퀀스';
  const titleKo = `${cleanBase} (${shortLabelKo})`;
  const subtitleKo =
    targetLevel === '1.0'
      ? `입문 회원 맞춤 · 완화 동작 ${swappedCount}건 반영 · 넉넉한 설명 템포`
      : targetLevel === '1.5'
        ? '중급 표준 밸런스 · 원안 구성과 호흡 리듬 유지'
        : `심화 챌린지 · 상향 동작 ${swappedCount}건 · 소도구 변주 ${propEnhancedCount}건`;

  const savedSequenceDraft: Omit<SavedSequence, 'id'> = {
    title: titleKo,
    subtitle: subtitleKo,
    apparatus,
    level: targetLevel,
    focusTags: [shortLabelKo, '자동 난이도 분기'],
    targetMinutes,
    steps: forkedSteps,
    createdAt: nowIso,
    updatedAt: nowIso,
    taughtCount: 0,
  };

  return {
    level: targetLevel,
    badgeKo,
    shortLabelKo,
    titleKo,
    subtitleKo,
    defaultLayer,
    apparatus,
    targetMinutes,
    steps: forkedSteps,
    swappedCount,
    propEnhancedCount,
    changeSummaryKo: changeSummaryKo.slice(0, 4),
    savedSequenceDraft,
  };
}

/**
 * 4. Multi-level fork:
 * Forks 1 sequence simultaneously into 3 level-tailored studio classes:
 * 1.0 (입문·완화) / 1.5 (중급·기본) / 2.0 (심화·편측/소도구).
 */
export function forkSequenceAcrossLevels(input: ForkLevelsInput): LevelForkBundle {
  const catalog = toExerciseList(input.exercises);
  const exerciseMap = buildExerciseMap(catalog);
  const nowIso = (input.referenceDate ?? new Date()).toISOString();
  const baseMinutes =
    input.targetMinutes ??
    Math.max(
      20,
      Math.round(input.steps.reduce((sum, st) => sum + (Number.isFinite(st.durationMin) ? st.durationMin : 0), 0)) ||
        50,
    );

  const levels: readonly DifficultyLevel[] = ['1.0', '1.5', '2.0'];
  const variants = levels.map((targetLevel) =>
    buildSingleLevelFork({
      baseTitle: input.baseTitle,
      baseSteps: input.steps,
      targetLevel,
      catalog,
      exerciseMap,
      targetMinutes: baseMinutes,
      nowIso,
    }),
  );

  const forks: Record<DifficultyLevel, LevelForkVariant> = {
    '1.0': variants[0],
    '1.5': variants[1],
    '2.0': variants[2],
  };

  return {
    baseTitle: input.baseTitle,
    forks,
    variants,
    summaryKo: `‘${input.baseTitle}’ 시퀀스를 입문(1.0)·중급(1.5)·심화(2.0) 3개 반 맞춤 버전으로 복제했어요.`,
  };
}

const WEEKLY_FOCUS_ROTATION: ReadonlyArray<{
  preset: WeeklyGroupClassDraft['focusPreset'];
  labelKo: string;
  boostBlocks: readonly ClassBlockCategory[];
}> = [
  { preset: 'full-body', labelKo: '전신 밸런스', boostBlocks: ['footwork', 'core', 'lower-body', 'upper-body'] },
  { preset: 'glute-lower', labelKo: '힙·하체 탄력', boostBlocks: ['lower-body', 'bridging', 'footwork'] },
  { preset: 'core-sculpt', labelKo: '딥코어 집중', boostBlocks: ['core', 'plank', 'bridging'] },
  { preset: 'posture-upper', labelKo: '상체·흉추 정렬', boostBlocks: ['upper-body', 'extension', 'plank'] },
  { preset: 'mobility-rehab', labelKo: '유연·가동성 회복', boostBlocks: ['feet-in-straps', 'bridging', 'extension'] },
];

function inferGroupApparatus(
  group: ClassGroupProfile,
  explicitApparatus: ApparatusType | 'mixed' | undefined,
  ownedApparatus: readonly ApparatusType[] | undefined,
): ApparatusType | 'mixed' {
  if (explicitApparatus) return explicitApparatus;
  const pref = group.planningPreferences?.conditions?.apparatus;
  if (pref) return pref;
  const text = `${group.name} ${group.scheduleLabel} ${group.notes}`.toLowerCase();
  if (/캐딜락|cadillac/.test(text)) return 'cadillac';
  if (/체어|chair/.test(text)) return 'chair';
  if (/바렐|barrel/.test(text)) return 'barrel';
  if (/매트|mat/.test(text)) return 'mat';
  if (/리포머|reformer/.test(text)) return 'reformer';
  if (ownedApparatus && ownedApparatus.length === 1) return ownedApparatus[0];
  return ownedApparatus && ownedApparatus.length > 0 ? 'mixed' : 'reformer';
}

/**
 * 5. Weekly conflict-free auto planner:
 * Generates tailored weekly class drafts for every registered ClassGroupProfile,
 * preventing main-block overlaps both with each group's recent history AND across other classes
 * scheduled in the same week.
 */
export function generateWeeklyAutoPlan(input: WeeklyAutoPlanInput): WeeklyAutoPlanResult {
  const catalog = toExerciseList(input.exercises);
  const exerciseMap = buildExerciseMap(catalog);
  const referenceDate = input.referenceDate ?? new Date();
  const nowIso = referenceDate.toISOString();

  if (input.groups.length === 0 || catalog.length === 0) {
    return {
      plans: [],
      stats: {
        totalClasses: 0,
        totalUniqueMainExercises: 0,
        crossClassMainOverlapCount: 0,
        recentHistoryOverlapCount: 0,
        averageFreshnessScore: 100,
      },
      summaryKo: '등록된 반이나 동작 목록이 없어 주간 초안을 만들지 못했어요.',
    };
  }

  const weeklyReservedMainIds = new Set<string>();
  const weeklyReservedMainKeys = new Set<string>();
  const plans: WeeklyGroupClassDraft[] = [];

  const ownedSet =
    input.ownedApparatus && input.ownedApparatus.length > 0
      ? new Set<ApparatusType>(input.ownedApparatus)
      : null;

  input.groups.forEach((group, groupIndex) => {
    const groupTargetMinutes =
      group.planningPreferences?.conditions?.targetMinutes ?? input.targetMinutes ?? 50;
    const groupLevel = group.defaultLevel ?? '1.5';
    const focusInfo = WEEKLY_FOCUS_ROTATION[groupIndex % WEEKLY_FOCUS_ROTATION.length];
    const groupApparatus = inferGroupApparatus(group, input.apparatus, input.ownedApparatus);

    const groupHistoryIndex = buildHistoryIndex(input.historyLogs, exerciseMap, {
      groupId: group.id,
      referenceDate,
      lookbackDays: 28,
    });
    const studioHistoryIndex = buildHistoryIndex(input.historyLogs, exerciseMap, {
      referenceDate,
      lookbackDays: 28,
    });

    const usedIdsThisClass = new Set<string>();
    const usedKeysThisClass = new Set<string>();
    const coveredPlanes = new Set<SpinalPlane>();

    const pickForWeeklyClass = (
      allowedBlocks: readonly ClassBlockCategory[],
      isMainBlock: boolean,
      lastPicked?: PilatesExercise,
    ): PilatesExercise | undefined => {
      const getCandidates = (
        strictApparatus: boolean,
        strictBlock: boolean,
        strictFreshAndUnreserved: boolean,
      ): PilatesExercise[] =>
        catalog.filter((cand) => {
          if (usedIdsThisClass.has(cand.id) || usedKeysThisClass.has(getMovementKey(cand))) {
            return false;
          }
          if (ownedSet && !ownedSet.has(cand.apparatus)) return false;
          if (strictApparatus && groupApparatus !== 'mixed' && cand.apparatus !== groupApparatus) {
            return false;
          }
          if (strictBlock && !allowedBlocks.includes(cand.blockCategory)) return false;
          if (isMainBlock && ROUTINE_EXEMPT_BLOCKS.has(cand.blockCategory)) return false;
          if (strictFreshAndUnreserved && isMainBlock) {
            const key = getMovementKey(cand);
            if (weeklyReservedMainIds.has(cand.id) || weeklyReservedMainKeys.has(key)) {
              return false;
            }
            const groupHist = lookupHistoryRecord(cand, groupHistoryIndex);
            if (groupHist && groupHist.daysSinceLastTaught <= 7) {
              return false;
            }
          }
          return true;
        });

      let pool = getCandidates(true, true, true);
      if (pool.length === 0) pool = getCandidates(true, false, true);
      if (pool.length === 0) pool = getCandidates(false, true, true);
      if (pool.length === 0) pool = getCandidates(false, false, true);
      // Only relax weekly/history uniqueness if entire catalog has no unreserved fresh main exercises left
      if (pool.length === 0) pool = getCandidates(true, true, false);
      if (pool.length === 0) pool = getCandidates(true, false, false);
      if (pool.length === 0) pool = getCandidates(false, true, false);
      if (pool.length === 0) pool = getCandidates(false, false, false);
      if (pool.length === 0) return undefined;

      const missingPlanes = FOUR_SPINAL_PLANES.filter((p) => !coveredPlanes.has(p));

      const scored = pool.map((cand) => {
        let score = 50;
        const key = getMovementKey(cand);
        const groupHist = lookupHistoryRecord(cand, groupHistoryIndex);
        const studioHist = lookupHistoryRecord(cand, studioHistoryIndex);

        if (isMainBlock) {
          // Strongest priority: zero overlap with other classes this week AND this group's recent 7 days
          if (weeklyReservedMainIds.has(cand.id) || weeklyReservedMainKeys.has(key)) {
            score -= 220;
          }
          if (groupHist && groupHist.daysSinceLastTaught <= 7) {
            score -= 190;
          } else if (groupHist && groupHist.daysSinceLastTaught <= 14) {
            score -= 30;
          } else {
            score += 28;
          }
          if (studioHist && studioHist.daysSinceLastTaught <= 7) {
            score -= 25;
          }
        } else {
          // Warmup/cooldown: gentle preference for variety without harsh penalties
          if (!groupHist || groupHist.daysSinceLastTaught > 7) score += 8;
        }

        if (groupApparatus !== 'mixed' && cand.apparatus === groupApparatus) score += 28;
        if (focusInfo.boostBlocks.includes(cand.blockCategory)) score += 14;
        if (levelRank(cand.level) <= levelRank(groupLevel)) {
          score += cand.level === groupLevel ? 18 : 10;
        } else {
          score -= 35;
        }

        const matchedPlanes = cand.spinalPlanes.filter((p) => missingPlanes.includes(p)).length;
        score += matchedPlanes * 16;

        if (lastPicked) {
          const springDiff = Math.abs(
            parseSpringLoadUnits(cand.springs) - parseSpringLoadUnits(lastPicked.springs),
          );
          score += Math.max(-8, 10 - Math.round(springDiff * 4));
          if (cand.box === lastPicked.box) score += 6;
        }

        return { cand, score };
      });

      scored.sort((a, b) => b.score - a.score || a.cand.id.localeCompare(b.cand.id));
      const chosen = scored[0]?.cand;
      if (chosen) {
        usedIdsThisClass.add(chosen.id);
        usedKeysThisClass.add(getMovementKey(chosen));
        for (const plane of chosen.spinalPlanes) coveredPlanes.add(plane);
      }
      return chosen;
    };

    const classExercises: PilatesExercise[] = [];
    const warmup = pickForWeeklyClass(['warmup'], false);
    if (warmup) classExercises.push(warmup);

    const desiredTotal = desiredStepCountForDuration(groupTargetMinutes);
    const desiredMain = Math.max(4, desiredTotal - 2);
    const mainBlockPlan: ClassBlockCategory[] = [
      'footwork',
      'bridging',
      'core',
      'upper-body',
      'lower-body',
      'plank',
      'extension',
      'feet-in-straps',
    ];

    for (let i = 0; i < desiredMain; i += 1) {
      const preferredBlock = mainBlockPlan[i % mainBlockPlan.length];
      const pick = pickForWeeklyClass([preferredBlock], true, classExercises.at(-1));
      if (!pick) break;
      classExercises.push(pick);
    }

    const cooldown =
      pickForWeeklyClass(['cooldown'], false, classExercises.at(-1)) ??
      pickForWeeklyClass(['feet-in-straps'], false, classExercises.at(-1));
    if (cooldown) classExercises.push(cooldown);

    const defaultLayer: LayerMode =
      groupLevel === '1.0' ? 'easy' : groupLevel === '2.0' ? 'hard' : 'standard';

    const rawSteps: SequenceStep[] = classExercises.map((ex, idx) => ({
      kind: 'exercise',
      stepId: `weekly-${group.id}-${idx + 1}-${ex.id}`,
      order: idx + 1,
      blockCategory: ex.blockCategory,
      exerciseId: ex.id,
      durationMin: ex.defaultDurationMin || 5,
      selectedLayer:
        ROUTINE_EXEMPT_BLOCKS.has(ex.blockCategory) && defaultLayer === 'hard'
          ? 'standard'
          : defaultLayer,
      explanationSec: groupLevel === '1.0' ? 25 : 20,
      transitionSec: idx === 0 ? 0 : 15,
    }));

    const optimized = optimizeSequenceFlowSmart(rawSteps, exerciseMap, {
      preserveWarmupAndCooldown: true,
      enforceWarmupBeforeHighExtension: true,
    });
    const fitted = allocateStepsToTargetMinutes(optimized.steps, groupTargetMinutes, exerciseMap);

    const freshness = analyzeSequenceFreshness(fitted, catalog, input.historyLogs, {
      groupId: group.id,
      referenceDate,
    });

    // Register primary main exercises into the rolling weekly reservation set
    const mainSteps = fitted.filter((st) => {
      const ex = exerciseMap.get(st.exerciseId);
      return ex && PRIMARY_MAIN_BLOCKS.has(ex.blockCategory);
    });
    const mainExerciseIds = mainSteps.map((st) => st.exerciseId);
    const mainExerciseNamesKo = mainSteps
      .map((st) => exerciseMap.get(st.exerciseId)?.nameKo ?? '')
      .filter(Boolean);

    for (const st of fitted) {
      const ex = exerciseMap.get(st.exerciseId);
      if (!ex || ROUTINE_EXEMPT_BLOCKS.has(ex.blockCategory)) continue;
      weeklyReservedMainIds.add(ex.id);
      weeklyReservedMainKeys.add(getMovementKey(ex));
    }

    const resolvedApparatus = inferSequenceApparatus(fitted, exerciseMap);
    const coveredSpinalPlanes = FOUR_SPINAL_PLANES.filter((p) => coveredPlanes.has(p));
    const titleKo = `${group.name} · ${focusInfo.labelKo} ${groupTargetMinutes}분`;
    const subtitleKo = `${group.scheduleLabel || '정기 수업'} · Lv ${groupLevel} · 주간 무중복 자동 편성`;

    const savedSequenceDraft: Omit<SavedSequence, 'id'> = {
      title: titleKo,
      subtitle: subtitleKo,
      apparatus: resolvedApparatus,
      level: groupLevel,
      focusTags: [group.name, focusInfo.labelKo, '주간 무중복'],
      targetMinutes: groupTargetMinutes,
      steps: fitted,
      createdAt: nowIso,
      updatedAt: nowIso,
      taughtCount: 0,
    };

    plans.push({
      groupId: group.id,
      groupName: group.name,
      scheduleLabel: group.scheduleLabel,
      level: groupLevel,
      apparatus: resolvedApparatus,
      focusPreset: focusInfo.preset,
      focusLabelKo: focusInfo.labelKo,
      titleKo,
      subtitleKo,
      targetMinutes: groupTargetMinutes,
      steps: fitted,
      freshnessScore: freshness.freshnessScore,
      mainExerciseIds,
      mainExerciseNamesKo,
      coveredSpinalPlanes,
      savedSequenceDraft,
    });
  });

  // Audit cross-class main exercise overlap across the generated week
  const seenMainCounts = new Map<string, number>();
  let recentHistoryOverlapCount = 0;

  for (const plan of plans) {
    const groupFresh = analyzeSequenceFreshness(plan.steps, catalog, input.historyLogs, {
      groupId: plan.groupId,
      referenceDate,
    });
    recentHistoryOverlapCount += groupFresh.duplicateSteps.filter(
      (d) => d.priorityTier === 'primary-main',
    ).length;

    for (const exId of plan.mainExerciseIds) {
      seenMainCounts.set(exId, (seenMainCounts.get(exId) ?? 0) + 1);
    }
  }

  let crossClassMainOverlapCount = 0;
  for (const count of seenMainCounts.values()) {
    if (count > 1) crossClassMainOverlapCount += count - 1;
  }

  const averageFreshnessScore =
    plans.length > 0
      ? Math.round(plans.reduce((sum, p) => sum + p.freshnessScore, 0) / plans.length)
      : 100;

  const stats: WeeklyOverlapStats = {
    totalClasses: plans.length,
    totalUniqueMainExercises: seenMainCounts.size,
    crossClassMainOverlapCount,
    recentHistoryOverlapCount,
    averageFreshnessScore,
  };

  const summaryKo =
    crossClassMainOverlapCount === 0 && recentHistoryOverlapCount === 0
      ? `${plans.length}개 반 주간 초안을 메인 동작 겹침 0건(평균 신선도 ${averageFreshnessScore}%)으로 완성했어요.`
      : `${plans.length}개 반 주간 초안을 만들었어요 (고유 메인 동작 ${seenMainCounts.size}개 · 평균 신선도 ${averageFreshnessScore}%).`;

  return {
    plans,
    stats,
    summaryKo,
  };
}
