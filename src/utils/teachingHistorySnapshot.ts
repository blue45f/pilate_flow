import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  PROP_LABELS,
} from '../data/pilatesCatalog';
import type {
  ClassBlockSnapshot,
  ClassSequenceSnapshot,
  HierarchyPilatesExercise,
  HumanMovementDraft,
  MovementSnapshot,
  ReusableBlock,
  SequenceSourceProvenance,
} from '../types/hierarchy';
import type {
  ApparatusType,
  BoxState,
  ClassBlockCategory,
  ClassHistoryLog,
  LayerMode,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import type {
  BuildTeachingProgramSnapshotInput,
  ClassHistoryLogWithSnapshot,
  ResolveTeachingHistoryOptions,
  ResolvedTeachingHistoryStepView,
  ResolvedTeachingHistoryView,
  TeachingExerciseSnapshot,
  TeachingHistorySourceKind,
  TeachingProgramSnapshot,
  TeachingProgramSnapshotItem,
  TeachingProgramTimingSnapshot,
} from '../types/teachingHistorySnapshot';
import {
  backupRecoveryStateFingerprint,
  type RecoveryCurrentState,
  type RecoveryNextState,
} from './backupRecoveryInspection';
import { exerciseRevision, getExerciseReviewState } from './exerciseReview';
import {
  cloneClassSnapshotToDraft,
  createClassSequenceSnapshot,
  createHumanDraftMovementSnapshot,
  createMovementSnapshot,
} from './hierarchyModel';
import {
  formatSecondsToMMSS,
  getSequenceDurations,
  getStepTiming,
  isRestStep,
} from './sequenceEngine';

const BLOCK_LABEL_MAP: Record<ClassBlockCategory, { ko: string; en: string }> = Object.fromEntries(
  CANONICAL_BLOCKS.map((block) => [block.category, { ko: block.nameKo, en: block.nameEn }]),
) as Record<ClassBlockCategory, { ko: string; en: string }>;

const CLASS_SECTION_LABELS: Record<'opening' | 'main' | 'ending', { ko: string; en: string }> = {
  opening: { ko: '도입·예열', en: 'Opening' },
  main: { ko: '메인 시퀀스', en: 'Main Work' },
  ending: { ko: '정리·마무리', en: 'Ending' },
};

const LAYER_LABELS: Record<LayerMode, { ko: string; en: string }> = {
  easy: { ko: '가볍게', en: 'Easy' },
  standard: { ko: '기본', en: 'Standard' },
  hard: { ko: '도전', en: 'Hard' },
};

const BOX_LABELS: Record<BoxState, string> = {
  none: '없음',
  'long-box': '롱박스',
  'short-box': '숏박스',
};

function getBlockSection(category: ClassBlockCategory): 'opening' | 'main' | 'ending' {
  if (category === 'warmup' || category === 'footwork') return 'opening';
  if (category === 'feet-in-straps' || category === 'cooldown') return 'ending';
  return 'main';
}

function getBlockLabel(category: ClassBlockCategory): { ko: string; en: string } {
  return BLOCK_LABEL_MAP[category] ?? { ko: category, en: category };
}

/**
 * Removes keys with `undefined` values recursively so `strippedKeys` in `backupRecoveryInspection.ts`
 * and `discardsFields` in `backend/backupValidation.ts` see 0 discarded keys before/after JSON serialization.
 */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) {
        result[key] = stripUndefinedDeep(entry);
      }
    }
    return result as T;
  }
  return value;
}

export function movementSnapshotToTeachingExerciseSnapshot(
  movementSnap: MovementSnapshot,
  catalogEx?: PilatesExercise,
): TeachingExerciseSnapshot {
  const hierEx = catalogEx as HierarchyPilatesExercise | undefined;
  return stripUndefinedDeep({
    id: movementSnap.id,
    nameKo: movementSnap.nameKo,
    nameEn: movementSnap.nameEn,
    apparatus: movementSnap.apparatus,
    ...(movementSnap.requiredEquipment
      ? { requiredEquipment: [...movementSnap.requiredEquipment] }
      : {}),
    ...(movementSnap.movementFamily !== undefined
      ? { movementFamily: movementSnap.movementFamily }
      : {}),
    ...(catalogEx?.review ? { review: structuredClone(catalogEx.review) } : {}),
    ...(catalogEx?.sourceReference
      ? { sourceReference: structuredClone(catalogEx.sourceReference) }
      : {}),
    props: [...movementSnap.props],
    blockCategory: movementSnap.blockCategory,
    spinalPlanes: [...movementSnap.spinalPlanes],
    bodyPosition: movementSnap.bodyPosition,
    level: movementSnap.level,
    defaultDurationMin: movementSnap.defaultDurationMin,
    ...(movementSnap.defaultRepetitions !== undefined
      ? { defaultRepetitions: movementSnap.defaultRepetitions }
      : {}),
    ...(movementSnap.defaultSets !== undefined ? { defaultSets: movementSnap.defaultSets } : {}),
    isUnilateral: movementSnap.isUnilateral,
    springs: movementSnap.springs,
    box: movementSnap.box,
    footbar: movementSnap.footbar,
    headrest: movementSnap.headrest,
    targetMuscles: [...movementSnap.targetMuscles],
    breathPattern: movementSnap.breathPattern,
    cues: [...movementSnap.cues],
    precautions: movementSnap.precautions,
    layers: {
      easy: movementSnap.layers.easy,
      standard: movementSnap.layers.standard,
      hard: movementSnap.layers.hard,
    },
    youtube: catalogEx?.youtube
      ? structuredClone(catalogEx.youtube)
      : {
          videoId: 'local-draft-only',
          channelName: '스냅샷 보존 동작',
          videoTitle: movementSnap.nameKo,
          startSec: 0,
          url: 'https://www.youtube.com/watch?v=local-draft-only',
        },
    favoriteTag: catalogEx?.favoriteTag ?? 'none',
    ...(catalogEx?.tempo !== undefined ? { tempo: catalogEx.tempo } : {}),
    ...(catalogEx?.isCustom !== undefined
      ? { isCustom: catalogEx.isCustom }
      : movementSnap.sourceOrigin === 'human-created'
        ? { isCustom: true }
        : {}),
    ...(catalogEx?.createdAt !== undefined
      ? { createdAt: catalogEx.createdAt }
      : movementSnap.capturedAt
        ? { createdAt: movementSnap.capturedAt }
        : {}),
    ...(movementSnap.capturedAt ? { capturedAt: movementSnap.capturedAt } : {}),
    ...(movementSnap.sourceOrigin
      ? { sourceOrigin: movementSnap.sourceOrigin }
      : hierEx?.humanDraftId
        ? { sourceOrigin: 'human-created' as const }
        : { sourceOrigin: 'catalog' as const }),
    ...(movementSnap.humanDraftId ?? hierEx?.humanDraftId
      ? { humanDraftId: movementSnap.humanDraftId ?? hierEx?.humanDraftId }
      : {}),
    ...(movementSnap.humanDraftRevision !== undefined || hierEx?.humanDraftRevision !== undefined
      ? { humanDraftRevision: movementSnap.humanDraftRevision ?? hierEx?.humanDraftRevision }
      : {}),
    ...(movementSnap.ideaLineSnapshot !== undefined
      ? { ideaLineSnapshot: movementSnap.ideaLineSnapshot }
      : {}),
    ...(movementSnap.feelLogsSnapshot
      ? { feelLogsSnapshot: movementSnap.feelLogsSnapshot.map((item) => structuredClone(item)) }
      : {}),
    ...(movementSnap.modificationLogsSnapshot
      ? {
          modificationLogsSnapshot: movementSnap.modificationLogsSnapshot.map((item) =>
            structuredClone(item),
          ),
        }
      : {}),
    ...(movementSnap.photoReferencesSnapshot
      ? {
          photoReferencesSnapshot: movementSnap.photoReferencesSnapshot.map((item) =>
            structuredClone(item),
          ),
        }
      : {}),
    ...(movementSnap.safetyBoundarySnapshot
      ? { safetyBoundarySnapshot: structuredClone(movementSnap.safetyBoundarySnapshot) }
      : {}),
  });
}

export function createTeachingExerciseSnapshot(
  exercise: PilatesExercise,
  capturedAt?: string,
): TeachingExerciseSnapshot {
  const hierEx = exercise as HierarchyPilatesExercise;
  return stripUndefinedDeep({
    id: exercise.id,
    nameKo: exercise.nameKo,
    nameEn: exercise.nameEn,
    apparatus: exercise.apparatus,
    ...(exercise.requiredEquipment ? { requiredEquipment: [...exercise.requiredEquipment] } : {}),
    ...(exercise.movementFamily !== undefined ? { movementFamily: exercise.movementFamily } : {}),
    ...(exercise.review ? { review: structuredClone(exercise.review) } : {}),
    ...(exercise.sourceReference
      ? { sourceReference: structuredClone(exercise.sourceReference) }
      : {}),
    props: [...exercise.props],
    blockCategory: exercise.blockCategory,
    spinalPlanes: [...exercise.spinalPlanes],
    bodyPosition: exercise.bodyPosition,
    level: exercise.level,
    defaultDurationMin: exercise.defaultDurationMin,
    ...(hierEx.defaultRepetitions !== undefined
      ? { defaultRepetitions: hierEx.defaultRepetitions }
      : {}),
    ...(hierEx.defaultSets !== undefined ? { defaultSets: hierEx.defaultSets } : {}),
    isUnilateral: exercise.isUnilateral,
    springs: exercise.springs,
    box: exercise.box,
    footbar: exercise.footbar,
    headrest: exercise.headrest,
    targetMuscles: [...exercise.targetMuscles],
    breathPattern: exercise.breathPattern,
    cues: [...exercise.cues],
    precautions: exercise.precautions,
    layers: {
      easy: exercise.layers.easy,
      standard: exercise.layers.standard,
      hard: exercise.layers.hard,
    },
    youtube: structuredClone(exercise.youtube),
    favoriteTag: exercise.favoriteTag,
    ...(exercise.tempo !== undefined ? { tempo: exercise.tempo } : {}),
    ...(exercise.isCustom !== undefined ? { isCustom: exercise.isCustom } : {}),
    ...(exercise.createdAt !== undefined ? { createdAt: exercise.createdAt } : {}),
    ...(capturedAt ? { capturedAt } : {}),
    ...(hierEx.humanDraftId
      ? { sourceOrigin: 'human-created' as const, humanDraftId: hierEx.humanDraftId }
      : { sourceOrigin: 'catalog' as const }),
    ...(hierEx.humanDraftRevision !== undefined
      ? { humanDraftRevision: hierEx.humanDraftRevision }
      : {}),
  });
}

export function hasExerciseDriftedFromSnapshot(
  snapshot: TeachingExerciseSnapshot,
  current: PilatesExercise,
): boolean {
  const currentHier = current as HierarchyPilatesExercise;
  if (
    snapshot.nameKo !== current.nameKo ||
    snapshot.nameEn !== current.nameEn ||
    snapshot.apparatus !== current.apparatus ||
    snapshot.blockCategory !== current.blockCategory ||
    snapshot.bodyPosition !== current.bodyPosition ||
    snapshot.level !== current.level ||
    snapshot.defaultDurationMin !== current.defaultDurationMin ||
    snapshot.isUnilateral !== current.isUnilateral ||
    snapshot.springs !== current.springs ||
    snapshot.box !== current.box ||
    snapshot.footbar !== current.footbar ||
    snapshot.headrest !== current.headrest ||
    snapshot.breathPattern !== current.breathPattern ||
    snapshot.precautions !== current.precautions ||
    snapshot.layers.easy !== current.layers.easy ||
    snapshot.layers.standard !== current.layers.standard ||
    snapshot.layers.hard !== current.layers.hard
  ) {
    return true;
  }
  if (
    snapshot.humanDraftRevision !== undefined &&
    currentHier.humanDraftRevision !== undefined &&
    snapshot.humanDraftRevision !== currentHier.humanDraftRevision
  ) {
    return true;
  }
  if (
    snapshot.props.length !== current.props.length ||
    snapshot.props.some((prop, index) => prop !== current.props[index])
  ) {
    return true;
  }
  if (
    snapshot.cues.length !== current.cues.length ||
    snapshot.cues.some((cue, index) => cue !== current.cues[index])
  ) {
    return true;
  }
  return false;
}

export function hasHumanDraftDriftedFromSnapshot(
  snapshot: TeachingExerciseSnapshot | undefined,
  stepHumanDraftRevision: number | undefined,
  liveDraft: HumanMovementDraft,
): boolean {
  const recordedRev = stepHumanDraftRevision ?? snapshot?.humanDraftRevision;
  if (recordedRev !== undefined && liveDraft.revision !== recordedRev) {
    return true;
  }
  if (snapshot) {
    const liveName = liveDraft.workingNameKo?.trim() || liveDraft.ideaLine.trim();
    if (snapshot.nameKo !== liveName) return true;
    if (snapshot.ideaLineSnapshot !== undefined && snapshot.ideaLineSnapshot !== liveDraft.ideaLine) {
      return true;
    }
    if (liveDraft.apparatus && snapshot.apparatus !== liveDraft.apparatus) return true;
    if (
      liveDraft.defaultDurationMin !== undefined &&
      snapshot.defaultDurationMin !== liveDraft.defaultDurationMin
    ) {
      return true;
    }
  }
  return false;
}

export function hasReusableBlockDriftedFromSnapshot(
  blockSnap: ClassBlockSnapshot,
  blockSteps: ReadonlyArray<{
    exerciseId: string;
    blockCategory: ClassBlockCategory;
    durationMin: number;
    selectedLayer: LayerMode;
    repetitions?: number;
    sets?: number;
    sideMode?: string;
  }>,
  liveBlock: ReusableBlock,
): boolean {
  if (blockSnap.detached) return true;
  if (liveBlock.version !== blockSnap.sourceBlockVersion) return true;
  if (liveBlock.title !== blockSnap.sourceBlockTitle) return true;
  if (liveBlock.items.length !== blockSteps.length) return true;
  const sortedItems = [...liveBlock.items].sort((a, b) => a.order - b.order);
  for (let idx = 0; idx < sortedItems.length; idx += 1) {
    const item = sortedItems[idx];
    const step = blockSteps[idx];
    if (
      item.exerciseId !== step.exerciseId ||
      item.blockCategory !== step.blockCategory ||
      item.durationMin !== step.durationMin ||
      item.selectedLayer !== step.selectedLayer ||
      (item.repetitions ?? undefined) !== (step.repetitions ?? undefined) ||
      (item.sets ?? undefined) !== (step.sets ?? undefined) ||
      (item.sideMode ?? undefined) !== (step.sideMode ?? undefined)
    ) {
      return true;
    }
  }
  return false;
}

export function serializeStepsSignature(steps: SequenceStep[] | undefined): string {
  if (!steps || steps.length === 0) return 'empty';
  return steps
    .map((step, index) => {
      const kind = isRestStep(step) ? 'rest' : 'exercise';
      const order = step.order ?? index + 1;
      return [
        order,
        kind,
        isRestStep(step) ? '' : step.exerciseId,
        step.blockCategory,
        step.durationMin,
        step.explanationSec ?? '',
        step.transitionSec ?? '',
        step.selectedLayer,
        step.customSpringOverride ?? '',
        step.repetitions ?? '',
        step.sets ?? '',
        step.sideMode ?? '',
        step.instructorNote ?? '',
        step.sourceBlockId ?? '',
        step.sourceBlockVersion ?? '',
        step.humanDraftRevision ?? '',
      ].join(':');
    })
    .join('|');
}

export function buildCompletionFingerprint(input: {
  sequenceId: string;
  groupId: string;
  taughtAt: string;
  steps?: SequenceStep[];
  actualDurationSec?: number;
  actualRestDurationSec?: number;
}): string {
  return [
    input.sequenceId,
    input.groupId,
    input.taughtAt,
    input.actualDurationSec ?? 'manual',
    input.actualRestDurationSec ?? 'none',
    serializeStepsSignature(input.steps),
  ].join('::');
}

export function findDuplicateCompletedHistoryLog(
  existingLogs: ClassHistoryLog[],
  candidate: {
    sequenceId: string;
    groupId: string;
    taughtAt: string;
    stepsSnapshot?: SequenceStep[];
    actualDurationSec?: number;
    actualRestDurationSec?: number;
  },
  options: { timeWindowMs?: number } = {},
): ClassHistoryLogWithSnapshot | null {
  const candidateSignature = serializeStepsSignature(candidate.stepsSnapshot);
  const candidateTime = Date.parse(candidate.taughtAt);
  const windowMs = options.timeWindowMs ?? 0;

  for (const rawLog of existingLogs) {
    const log = rawLog as ClassHistoryLogWithSnapshot;
    if (log.sequenceId !== candidate.sequenceId || log.groupId !== candidate.groupId) continue;
    if ((log.actualDurationSec ?? undefined) !== (candidate.actualDurationSec ?? undefined)) {
      continue;
    }
    if (
      (log.actualRestDurationSec ?? undefined) !== (candidate.actualRestDurationSec ?? undefined)
    ) {
      continue;
    }
    const existingSignature = serializeStepsSignature(log.stepsSnapshot);
    if (existingSignature !== candidateSignature) continue;

    if (log.taughtAt === candidate.taughtAt) {
      return log;
    }
    if (windowMs > 0 && Number.isFinite(candidateTime)) {
      const logTime = Date.parse(log.taughtAt);
      if (Number.isFinite(logTime) && Math.abs(candidateTime - logTime) <= windowMs) {
        return log;
      }
    }
  }

  return null;
}

export function buildTeachingProgramSnapshot(
  input: BuildTeachingProgramSnapshotInput,
): TeachingProgramSnapshot {
  const capturedAt = input.capturedAt ?? input.taughtAt;
  const exerciseMap = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
  const humanDraftMap = new Map((input.humanDrafts ?? []).map((draft) => [draft.id, draft]));
  const reusableBlockMap = new Map((input.reusableBlocks ?? []).map((block) => [block.id, block]));
  const exercisesById: Record<string, TeachingExerciseSnapshot> = {};
  const blockGroupMap = new Map<string, ClassBlockSnapshot>();

  const normalizedSteps = input.steps.map((step, index) =>
    stripUndefinedDeep({
      ...structuredClone(step),
      order: index + 1,
    }),
  );

  const items: TeachingProgramSnapshotItem[] = normalizedSteps.map((step, index) => {
    const rest = isRestStep(step);
    const catalogEx = rest ? undefined : exerciseMap.get(step.exerciseId);
    const candidateDraftId = rest
      ? undefined
      : (step.humanDraftId ?? step.exerciseSnapshot?.humanDraftId ?? step.exerciseId);
    const matchedDraft = candidateDraftId ? humanDraftMap.get(candidateDraftId) : undefined;

    let movementSnapshot: MovementSnapshot | undefined;
    let exerciseSnapshot: TeachingExerciseSnapshot | undefined;

    if (!rest) {
      if (matchedDraft) {
        movementSnapshot = stripUndefinedDeep(
          structuredClone(
            createHumanDraftMovementSnapshot(
              matchedDraft,
              {
                blockCategory: step.blockCategory,
                durationMin: step.durationMin,
                repetitions: step.repetitions,
                sets: step.sets,
                sideMode: step.sideMode,
                selectedLayer: step.selectedLayer,
                springs: step.customSpringOverride,
              },
              capturedAt,
            ),
          ),
        );
        exerciseSnapshot = movementSnapshotToTeachingExerciseSnapshot(movementSnapshot, catalogEx);
      } else if (step.exerciseSnapshot) {
        movementSnapshot = stripUndefinedDeep(structuredClone(step.exerciseSnapshot));
        exerciseSnapshot = movementSnapshotToTeachingExerciseSnapshot(movementSnapshot, catalogEx);
      } else if (catalogEx) {
        movementSnapshot = stripUndefinedDeep(
          structuredClone(createMovementSnapshot(catalogEx, capturedAt)),
        );
        exerciseSnapshot = createTeachingExerciseSnapshot(catalogEx, capturedAt);
      }

      if (exerciseSnapshot) {
        exercisesById[exerciseSnapshot.id] = exerciseSnapshot;
      }
    }

    const sourceBlock = step.sourceBlockId ? reusableBlockMap.get(step.sourceBlockId) : undefined;
    const blockInstanceId = step.blockInstanceId;
    const sourceBlockId = step.sourceBlockId ?? (blockInstanceId ? blockInstanceId : undefined);
    const sourceBlockVersion = step.sourceBlockVersion ?? sourceBlock?.version;
    const sourceBlockTitle = step.sourceBlockTitle ?? sourceBlock?.title;
    const blockInstanceDetached = step.blockInstanceDetached;

    if (!rest && blockInstanceId) {
      const existingBlock = blockGroupMap.get(blockInstanceId);
      if (existingBlock) {
        existingBlock.stepIds.push(step.stepId);
        if (blockInstanceDetached) {
          existingBlock.detached = true;
        }
      } else {
        blockGroupMap.set(blockInstanceId, {
          blockInstanceId,
          sourceBlockId: sourceBlockId ?? blockInstanceId,
          sourceBlockVersion: sourceBlockVersion ?? 1,
          sourceBlockTitle: sourceBlockTitle ?? '재사용 블록',
          detached: Boolean(blockInstanceDetached),
          stepIds: [step.stepId],
        });
      }
    }

    const blockMeta = getBlockLabel(step.blockCategory);
    const classSection = getBlockSection(step.blockCategory);
    const timingSourceEx = catalogEx ?? (exerciseSnapshot ? reconstructExerciseFromSnapshot(exerciseSnapshot) : undefined);
    const timing = rest
      ? {
          totalSec: step.durationMin * 60,
          explanationSec: 0,
          transitionSec: 0,
          movementSec: step.durationMin * 60,
          perSideSec: 0,
          sides: 1 as const,
        }
      : getStepTiming(step, timingSourceEx);
    const effectiveSprings = rest
      ? ''
      : step.customSpringOverride?.trim() || exerciseSnapshot?.springs || catalogEx?.springs || '';

    const recordedHumanDraftId =
      step.humanDraftId ?? movementSnapshot?.humanDraftId ?? exerciseSnapshot?.humanDraftId;
    const recordedHumanDraftRevision =
      step.humanDraftRevision ??
      movementSnapshot?.humanDraftRevision ??
      exerciseSnapshot?.humanDraftRevision;

    return stripUndefinedDeep({
      order: index + 1,
      stepId: step.stepId,
      kind: rest ? ('rest' as const) : ('exercise' as const),
      exerciseId: rest ? '' : step.exerciseId,
      blockCategory: step.blockCategory,
      blockNameKo: rest ? '휴식' : blockMeta.ko,
      blockNameEn: rest ? 'Rest' : blockMeta.en,
      classSection,
      classSectionLabelKo: CLASS_SECTION_LABELS[classSection].ko,
      durationMin: step.durationMin,
      explanationSec: timing.explanationSec,
      transitionSec: timing.transitionSec,
      movementSec: timing.movementSec,
      ...(timing.sides === 2 ? { perSideSec: timing.perSideSec } : {}),
      selectedLayer: step.selectedLayer,
      selectedLayerLabelKo: LAYER_LABELS[step.selectedLayer].ko,
      selectedLayerDescription: rest
        ? '휴식 구간'
        : (exerciseSnapshot?.layers[step.selectedLayer] ??
          catalogEx?.layers[step.selectedLayer] ??
          ''),
      ...(step.customSpringOverride !== undefined
        ? { customSpringOverride: step.customSpringOverride }
        : {}),
      effectiveSprings,
      ...(step.repetitions !== undefined ? { repetitions: step.repetitions } : {}),
      ...(step.sets !== undefined ? { sets: step.sets } : {}),
      ...(step.sideMode ? { sideMode: step.sideMode } : {}),
      ...(step.instructorNote ? { instructorNote: step.instructorNote } : {}),
      ...(step.locked !== undefined ? { locked: step.locked } : {}),
      ...(blockInstanceId ? { blockInstanceId } : {}),
      ...(sourceBlockId ? { sourceBlockId } : {}),
      ...(sourceBlockVersion !== undefined ? { sourceBlockVersion } : {}),
      ...(sourceBlockTitle ? { sourceBlockTitle } : {}),
      ...(blockInstanceDetached !== undefined ? { blockInstanceDetached } : {}),
      ...(recordedHumanDraftId ? { humanDraftId: recordedHumanDraftId } : {}),
      ...(recordedHumanDraftRevision !== undefined
        ? { humanDraftRevision: recordedHumanDraftRevision }
        : {}),
      ...(movementSnapshot ? { movementSnapshot } : {}),
      ...(exerciseSnapshot ? { exerciseSnapshot } : {}),
    });
  });

  const durations = getSequenceDurations(normalizedSteps);
  const actualDurationSec = input.actualDurationSec;
  const actualRestDurationSec = input.actualRestDurationSec;
  const actualExerciseDurationSec =
    actualDurationSec !== undefined
      ? Math.max(0, actualDurationSec - (actualRestDurationSec ?? 0))
      : undefined;

  const timing: TeachingProgramTimingSnapshot = stripUndefinedDeep({
    plannedTotalSec: durations.totalSec,
    plannedExerciseSec: durations.exerciseSec,
    plannedRestSec: durations.restSec,
    ...(actualDurationSec !== undefined ? { actualDurationSec } : {}),
    ...(actualRestDurationSec !== undefined ? { actualRestDurationSec } : {}),
    ...(actualExerciseDurationSec !== undefined ? { actualExerciseDurationSec } : {}),
  });

  // Build P1 ClassSequenceSnapshot when all exercises are resolvable
  let sequenceSnapshot: ClassSequenceSnapshot | undefined;
  try {
    const mergedExercises = [...input.exercises];
    const knownIds = new Set(mergedExercises.map((ex) => ex.id));
    for (const exSnap of Object.values(exercisesById)) {
      if (!knownIds.has(exSnap.id)) {
        mergedExercises.push(reconstructExerciseFromSnapshot(exSnap));
        knownIds.add(exSnap.id);
      }
    }
    const targetMinutes =
      input.targetMinutes ??
      input.criteriaSnapshot?.targetMinutes ??
      Math.max(10, Math.round(durations.totalSec / 60) || 50);
    const apparatus =
      input.apparatus ??
      input.criteriaSnapshot?.apparatus ??
      (Object.values(exercisesById)[0]?.apparatus ?? 'reformer');
    const level =
      input.level ??
      input.criteriaSnapshot?.level ??
      (Object.values(exercisesById)[0]?.level ?? '1.5');

    const rawClassSnapshot = createClassSequenceSnapshot(
      {
        id: input.sequenceId,
        title: input.sequenceTitle,
        subtitle: input.sequenceSubtitle ?? '',
        apparatus,
        level,
        targetMinutes,
        steps: normalizedSteps,
        version: input.sourceSequenceVersion ?? 1,
        updatedAt: input.sourceSequenceUpdatedAt,
        sourceProvenance: input.sourceProvenance,
        humanDrafts: input.humanDrafts,
      },
      mergedExercises,
      capturedAt,
      input.humanDrafts,
    );
    sequenceSnapshot = stripUndefinedDeep(structuredClone(rawClassSnapshot));
  } catch {
    sequenceSnapshot = undefined;
  }

  const blockSnapshots = [...blockGroupMap.values()].map((b) => stripUndefinedDeep(structuredClone(b)));

  return stripUndefinedDeep({
    snapshotVersion: 1,
    recordKind: 'completed-history',
    sourceKind: input.sourceKind,
    sourceSequenceId: input.sequenceId,
    sourceSequenceTitle: input.sequenceTitle,
    sourceSubtitle: input.sequenceSubtitle ?? '',
    ...(input.sourceSequenceVersion !== undefined
      ? { sourceSequenceVersion: input.sourceSequenceVersion }
      : {}),
    ...(input.sourceProvenance
      ? { sourceProvenance: stripUndefinedDeep(structuredClone(input.sourceProvenance)) }
      : {}),
    taughtAt: input.taughtAt,
    capturedAt,
    completionFingerprint: buildCompletionFingerprint({
      sequenceId: input.sequenceId,
      groupId: input.groupId,
      taughtAt: input.taughtAt,
      steps: normalizedSteps,
      actualDurationSec,
      actualRestDurationSec,
    }),
    timing,
    exercisesById,
    ...(blockSnapshots.length > 0 ? { blockSnapshots } : {}),
    ...(sequenceSnapshot ? { sequenceSnapshot } : {}),
    items,
  });
}

export function resolveTeachingHistoryView(
  rawLog: ClassHistoryLog,
  exercisesMap: Map<string, PilatesExercise>,
  savedSequences: SavedSequence[] = [],
  options?: ResolveTeachingHistoryOptions,
): ResolvedTeachingHistoryView {
  const log = rawLog as ClassHistoryLogWithSnapshot;
  const snapshot = log.programSnapshot;
  const p1SequenceSnapshot = log.sequenceSnapshot ?? snapshot?.sequenceSnapshot;
  const hasPreservedSnapshot = Boolean(
    (snapshot && snapshot.items.length > 0) ||
      (p1SequenceSnapshot && p1SequenceSnapshot.steps.length > 0),
  );

  const reusableBlockMap = options?.reusableBlocks
    ? new Map(options.reusableBlocks.map((block) => [block.id, block]))
    : undefined;
  const humanDraftMap = options?.humanDrafts
    ? new Map(options.humanDrafts.map((draft) => [draft.id, draft]))
    : undefined;

  const modifiedExerciseIds = new Set<string>();
  const deletedExerciseIds = new Set<string>();
  const modifiedBlockIds = new Set<string>();
  const deletedBlockIds = new Set<string>();
  const modifiedHumanDraftIds = new Set<string>();
  const deletedHumanDraftIds = new Set<string>();
  const missingUnrecoverableExerciseIds = new Set<string>();

  // Resolve blockSnapshots from snapshot, P1 sequenceSnapshot, or step metadata
  const blockSnapshots: ClassBlockSnapshot[] = (() => {
    if (snapshot?.blockSnapshots && snapshot.blockSnapshots.length > 0) {
      return snapshot.blockSnapshots.map((b) => structuredClone(b));
    }
    if (p1SequenceSnapshot?.blockSnapshots && p1SequenceSnapshot.blockSnapshots.length > 0) {
      return p1SequenceSnapshot.blockSnapshots.map((b) => structuredClone(b));
    }
    const map = new Map<string, ClassBlockSnapshot>();
    const rawSteps = snapshot?.items ?? p1SequenceSnapshot?.steps ?? log.stepsSnapshot ?? [];
    for (const step of rawSteps) {
      if (!step.blockInstanceId) continue;
      const existing = map.get(step.blockInstanceId);
      if (existing) {
        existing.stepIds.push(step.stepId);
        if (step.blockInstanceDetached) existing.detached = true;
      } else {
        map.set(step.blockInstanceId, {
          blockInstanceId: step.blockInstanceId,
          sourceBlockId: step.sourceBlockId ?? step.blockInstanceId,
          sourceBlockVersion: step.sourceBlockVersion ?? 1,
          sourceBlockTitle: step.sourceBlockTitle ?? '재사용 블록',
          detached: Boolean(step.blockInstanceDetached),
          stepIds: [step.stepId],
        });
      }
    }
    return [...map.values()];
  })();

  const blockSnapshotByInstanceId = new Map(
    blockSnapshots.map((blockSnap) => [blockSnap.blockInstanceId, blockSnap]),
  );

  let steps: ResolvedTeachingHistoryStepView[] = [];

  if (snapshot && snapshot.items.length > 0) {
    steps = snapshot.items.map((item, index) => {
      if (item.kind === 'rest') {
        return {
          order: item.order ?? index + 1,
          stepId: item.stepId,
          kind: 'rest',
          exerciseId: '',
          nameKo: '휴식',
          nameEn: 'Rest',
          apparatus: log.apparatus,
          blockCategory: item.blockCategory,
          blockNameKo: '휴식',
          blockNameEn: 'Rest',
          classSection: item.classSection,
          classSectionLabelKo: item.classSectionLabelKo,
          durationMin: item.durationMin,
          explanationSec: 0,
          transitionSec: 0,
          movementSec: item.durationMin * 60,
          selectedLayer: item.selectedLayer,
          selectedLayerLabelKo: item.selectedLayerLabelKo,
          selectedLayerDescription: item.selectedLayerDescription,
          effectiveSprings: '',
          props: [],
          cues: [],
          precautions: '',
          breathPattern: '',
          isUnilateral: false,
          ...(item.instructorNote ? { instructorNote: item.instructorNote } : {}),
          ...(item.locked !== undefined ? { locked: item.locked } : {}),
          fromSnapshot: true,
          isCatalogModified: false,
          isCatalogDeleted: false,
          isMissingUnrecoverable: false,
        };
      }

      const p1MoveSnap =
        item.movementSnapshot ?? p1SequenceSnapshot?.exerciseSnapshots[item.exerciseId];
      const exSnap =
        item.exerciseSnapshot ??
        snapshot.exercisesById[item.exerciseId] ??
        (p1MoveSnap ? movementSnapshotToTeachingExerciseSnapshot(p1MoveSnap) : undefined);
      const liveEx = exercisesMap.get(item.exerciseId);

      const humanDraftId = item.humanDraftId ?? exSnap?.humanDraftId ?? p1MoveSnap?.humanDraftId;
      const humanDraftRevision =
        item.humanDraftRevision ?? exSnap?.humanDraftRevision ?? p1MoveSnap?.humanDraftRevision;
      const sourceOrigin =
        exSnap?.sourceOrigin ??
        p1MoveSnap?.sourceOrigin ??
        (humanDraftId ? 'human-created' : 'catalog');

      let isHumanDraftModified = false;
      let isHumanDraftDeleted = false;
      if (humanDraftId && humanDraftMap) {
        const liveDraft = humanDraftMap.get(humanDraftId);
        if (!liveDraft) {
          isHumanDraftDeleted = true;
          deletedHumanDraftIds.add(humanDraftId);
        } else if (hasHumanDraftDriftedFromSnapshot(exSnap, humanDraftRevision, liveDraft)) {
          isHumanDraftModified = true;
          modifiedHumanDraftIds.add(humanDraftId);
        }
      }

      const isCatalogDeleted = Boolean(exSnap && !liveEx && !isHumanDraftDeleted);
      const isCatalogModified = Boolean(
        (exSnap && liveEx && hasExerciseDriftedFromSnapshot(exSnap, liveEx)) ||
          isHumanDraftModified,
      );
      const isMissingUnrecoverable = !exSnap && !liveEx;

      if (isCatalogDeleted) deletedExerciseIds.add(item.exerciseId);
      if (isCatalogModified) modifiedExerciseIds.add(item.exerciseId);
      if (isMissingUnrecoverable) missingUnrecoverableExerciseIds.add(item.exerciseId);

      const blockSnap = item.blockInstanceId
        ? blockSnapshotByInstanceId.get(item.blockInstanceId)
        : undefined;
      const sourceBlockId = item.sourceBlockId ?? blockSnap?.sourceBlockId;
      const sourceBlockVersion = item.sourceBlockVersion ?? blockSnap?.sourceBlockVersion;
      const sourceBlockTitle = item.sourceBlockTitle ?? blockSnap?.sourceBlockTitle;
      const blockInstanceDetached = item.blockInstanceDetached ?? blockSnap?.detached;

      const sourceEx = exSnap ?? liveEx;
      return {
        order: item.order ?? index + 1,
        stepId: item.stepId,
        kind: 'exercise',
        exerciseId: item.exerciseId,
        nameKo: sourceEx?.nameKo ?? '삭제된 동작',
        nameEn: sourceEx?.nameEn ?? '',
        apparatus: sourceEx?.apparatus ?? log.apparatus,
        blockCategory: item.blockCategory,
        blockNameKo: item.blockNameKo || getBlockLabel(item.blockCategory).ko,
        blockNameEn: item.blockNameEn || getBlockLabel(item.blockCategory).en,
        classSection: item.classSection,
        classSectionLabelKo:
          item.classSectionLabelKo || CLASS_SECTION_LABELS[item.classSection].ko,
        durationMin: item.durationMin,
        explanationSec: item.explanationSec,
        transitionSec: item.transitionSec,
        movementSec: item.movementSec,
        ...(item.perSideSec !== undefined ? { perSideSec: item.perSideSec } : {}),
        selectedLayer: item.selectedLayer,
        selectedLayerLabelKo:
          item.selectedLayerLabelKo || LAYER_LABELS[item.selectedLayer].ko,
        selectedLayerDescription:
          item.selectedLayerDescription || sourceEx?.layers[item.selectedLayer] || '',
        effectiveSprings:
          item.effectiveSprings ||
          item.customSpringOverride ||
          sourceEx?.springs ||
          '',
        ...(sourceEx
          ? { box: sourceEx.box, footbar: sourceEx.footbar, headrest: sourceEx.headrest }
          : {}),
        props: sourceEx ? [...sourceEx.props] : [],
        cues: sourceEx ? [...sourceEx.cues] : [],
        precautions: sourceEx?.precautions ?? '',
        breathPattern: sourceEx?.breathPattern ?? '',
        isUnilateral: sourceEx?.isUnilateral ?? false,
        ...(item.repetitions !== undefined ? { repetitions: item.repetitions } : {}),
        ...(item.sets !== undefined ? { sets: item.sets } : {}),
        ...(item.sideMode ? { sideMode: item.sideMode } : {}),
        ...(item.instructorNote ? { instructorNote: item.instructorNote } : {}),
        ...(item.locked !== undefined ? { locked: item.locked } : {}),
        ...(item.blockInstanceId ? { blockInstanceId: item.blockInstanceId } : {}),
        ...(sourceBlockId ? { sourceBlockId } : {}),
        ...(sourceBlockVersion !== undefined ? { sourceBlockVersion } : {}),
        ...(sourceBlockTitle ? { sourceBlockTitle } : {}),
        ...(blockInstanceDetached !== undefined ? { blockInstanceDetached } : {}),
        ...(humanDraftId ? { humanDraftId } : {}),
        ...(humanDraftRevision !== undefined ? { humanDraftRevision } : {}),
        ...(sourceOrigin ? { sourceOrigin } : {}),
        ...(exSnap?.ideaLineSnapshot !== undefined
          ? { ideaLineSnapshot: exSnap.ideaLineSnapshot }
          : {}),
        ...(isHumanDraftModified ? { isHumanDraftModified: true } : {}),
        ...(isHumanDraftDeleted ? { isHumanDraftDeleted: true } : {}),
        fromSnapshot: Boolean(exSnap),
        isCatalogModified,
        isCatalogDeleted,
        isMissingUnrecoverable,
      };
    });
  } else if (
    (p1SequenceSnapshot && p1SequenceSnapshot.steps.length > 0) ||
    (log.stepsSnapshot && log.stepsSnapshot.length > 0)
  ) {
    const sourceSteps = p1SequenceSnapshot?.steps ?? log.stepsSnapshot ?? [];
    steps = sourceSteps.map((step, index) => {
      const rest = isRestStep(step);
      const classSection = getBlockSection(step.blockCategory);
      if (rest) {
        return {
          order: step.order ?? index + 1,
          stepId: step.stepId,
          kind: 'rest',
          exerciseId: '',
          nameKo: '휴식',
          nameEn: 'Rest',
          apparatus: log.apparatus,
          blockCategory: step.blockCategory,
          blockNameKo: '휴식',
          blockNameEn: 'Rest',
          classSection,
          classSectionLabelKo: CLASS_SECTION_LABELS[classSection].ko,
          durationMin: step.durationMin,
          explanationSec: 0,
          transitionSec: 0,
          movementSec: step.durationMin * 60,
          selectedLayer: step.selectedLayer,
          selectedLayerLabelKo: LAYER_LABELS[step.selectedLayer].ko,
          selectedLayerDescription: '휴식 구간',
          effectiveSprings: '',
          props: [],
          cues: [],
          precautions: '',
          breathPattern: '',
          isUnilateral: false,
          ...(step.instructorNote ? { instructorNote: step.instructorNote } : {}),
          ...(step.locked !== undefined ? { locked: step.locked } : {}),
          fromSnapshot: Boolean(p1SequenceSnapshot),
          isCatalogModified: false,
          isCatalogDeleted: false,
          isMissingUnrecoverable: false,
        };
      }

      const embeddedMoveSnap =
        step.exerciseSnapshot ?? p1SequenceSnapshot?.exerciseSnapshots[step.exerciseId];
      const liveEx = exercisesMap.get(step.exerciseId);
      const exSnap = embeddedMoveSnap
        ? movementSnapshotToTeachingExerciseSnapshot(embeddedMoveSnap, liveEx)
        : undefined;

      const humanDraftId = step.humanDraftId ?? exSnap?.humanDraftId;
      const humanDraftRevision = step.humanDraftRevision ?? exSnap?.humanDraftRevision;

      let isHumanDraftModified = false;
      let isHumanDraftDeleted = false;
      if (humanDraftId && humanDraftMap) {
        const liveDraft = humanDraftMap.get(humanDraftId);
        if (!liveDraft) {
          isHumanDraftDeleted = true;
          deletedHumanDraftIds.add(humanDraftId);
        } else if (hasHumanDraftDriftedFromSnapshot(exSnap, humanDraftRevision, liveDraft)) {
          isHumanDraftModified = true;
          modifiedHumanDraftIds.add(humanDraftId);
        }
      }

      const isCatalogDeleted = Boolean(exSnap && !liveEx && !isHumanDraftDeleted);
      const isCatalogModified = Boolean(
        (exSnap && liveEx && hasExerciseDriftedFromSnapshot(exSnap, liveEx)) ||
          isHumanDraftModified,
      );
      const isMissingUnrecoverable = !exSnap && !liveEx;

      if (isCatalogDeleted) deletedExerciseIds.add(step.exerciseId);
      if (isCatalogModified) modifiedExerciseIds.add(step.exerciseId);
      if (isMissingUnrecoverable) missingUnrecoverableExerciseIds.add(step.exerciseId);

      const sourceEx = exSnap ?? liveEx;
      const timing = getStepTiming(
        step,
        liveEx ?? (exSnap ? reconstructExerciseFromSnapshot(exSnap) : undefined),
      );
      const blockSnap = step.blockInstanceId
        ? blockSnapshotByInstanceId.get(step.blockInstanceId)
        : undefined;
      const sourceBlockId = step.sourceBlockId ?? blockSnap?.sourceBlockId;
      const sourceBlockVersion = step.sourceBlockVersion ?? blockSnap?.sourceBlockVersion;
      const sourceBlockTitle = step.sourceBlockTitle ?? blockSnap?.sourceBlockTitle;
      const blockInstanceDetached = step.blockInstanceDetached ?? blockSnap?.detached;

      return {
        order: step.order ?? index + 1,
        stepId: step.stepId,
        kind: 'exercise',
        exerciseId: step.exerciseId,
        nameKo: sourceEx?.nameKo ?? '삭제된 동작',
        nameEn: sourceEx?.nameEn ?? '',
        apparatus: sourceEx?.apparatus ?? log.apparatus,
        blockCategory: step.blockCategory,
        blockNameKo: getBlockLabel(step.blockCategory).ko,
        blockNameEn: getBlockLabel(step.blockCategory).en,
        classSection,
        classSectionLabelKo: CLASS_SECTION_LABELS[classSection].ko,
        durationMin: step.durationMin,
        explanationSec: timing.explanationSec,
        transitionSec: timing.transitionSec,
        movementSec: timing.movementSec,
        ...(timing.sides === 2 ? { perSideSec: timing.perSideSec } : {}),
        selectedLayer: step.selectedLayer,
        selectedLayerLabelKo: LAYER_LABELS[step.selectedLayer].ko,
        selectedLayerDescription: sourceEx?.layers[step.selectedLayer] ?? '',
        effectiveSprings: step.customSpringOverride?.trim() || sourceEx?.springs || '',
        ...(sourceEx
          ? { box: sourceEx.box, footbar: sourceEx.footbar, headrest: sourceEx.headrest }
          : {}),
        props: sourceEx ? [...sourceEx.props] : [],
        cues: sourceEx ? [...sourceEx.cues] : [],
        precautions: sourceEx?.precautions ?? '',
        breathPattern: sourceEx?.breathPattern ?? '',
        isUnilateral: sourceEx?.isUnilateral ?? false,
        ...(step.repetitions !== undefined ? { repetitions: step.repetitions } : {}),
        ...(step.sets !== undefined ? { sets: step.sets } : {}),
        ...(step.sideMode ? { sideMode: step.sideMode } : {}),
        ...(step.instructorNote ? { instructorNote: step.instructorNote } : {}),
        ...(step.locked !== undefined ? { locked: step.locked } : {}),
        ...(step.blockInstanceId ? { blockInstanceId: step.blockInstanceId } : {}),
        ...(sourceBlockId ? { sourceBlockId } : {}),
        ...(sourceBlockVersion !== undefined ? { sourceBlockVersion } : {}),
        ...(sourceBlockTitle ? { sourceBlockTitle } : {}),
        ...(blockInstanceDetached !== undefined ? { blockInstanceDetached } : {}),
        ...(humanDraftId ? { humanDraftId } : {}),
        ...(humanDraftRevision !== undefined ? { humanDraftRevision } : {}),
        ...(exSnap?.sourceOrigin ? { sourceOrigin: exSnap.sourceOrigin } : {}),
        ...(exSnap?.ideaLineSnapshot !== undefined
          ? { ideaLineSnapshot: exSnap.ideaLineSnapshot }
          : {}),
        ...(isHumanDraftModified ? { isHumanDraftModified: true } : {}),
        ...(isHumanDraftDeleted ? { isHumanDraftDeleted: true } : {}),
        fromSnapshot: Boolean(exSnap),
        isCatalogModified,
        isCatalogDeleted,
        isMissingUnrecoverable,
      };
    });
  } else {
    steps = log.exerciseIds.map((exerciseId, index) => {
      const liveEx = exercisesMap.get(exerciseId);
      if (!liveEx) {
        missingUnrecoverableExerciseIds.add(exerciseId);
      }
      const blockCategory = liveEx?.blockCategory ?? 'core';
      const classSection = getBlockSection(blockCategory);
      const durationMin = liveEx?.defaultDurationMin ?? 5;
      return {
        order: index + 1,
        stepId: `${log.id}-legacy-${index + 1}`,
        kind: 'exercise',
        exerciseId,
        nameKo: liveEx?.nameKo ?? '삭제된 동작',
        nameEn: liveEx?.nameEn ?? '',
        apparatus: liveEx?.apparatus ?? log.apparatus,
        blockCategory,
        blockNameKo: getBlockLabel(blockCategory).ko,
        blockNameEn: getBlockLabel(blockCategory).en,
        classSection,
        classSectionLabelKo: CLASS_SECTION_LABELS[classSection].ko,
        durationMin,
        explanationSec: 20,
        transitionSec: 15,
        movementSec: Math.max(0, durationMin * 60 - 35),
        selectedLayer: 'standard',
        selectedLayerLabelKo: LAYER_LABELS.standard.ko,
        selectedLayerDescription: liveEx?.layers.standard ?? '',
        effectiveSprings: liveEx?.springs ?? '',
        ...(liveEx ? { box: liveEx.box, footbar: liveEx.footbar, headrest: liveEx.headrest } : {}),
        props: liveEx ? [...liveEx.props] : [],
        cues: liveEx ? [...liveEx.cues] : [],
        precautions: liveEx?.precautions ?? '',
        breathPattern: liveEx?.breathPattern ?? '',
        isUnilateral: liveEx?.isUnilateral ?? false,
        fromSnapshot: false,
        isCatalogModified: false,
        isCatalogDeleted: false,
        isMissingUnrecoverable: !liveEx,
      };
    });
  }

  // Evaluate ReusableBlock template drift when blockSnapshots or options.reusableBlocks are present
  if (blockSnapshots.length > 0 && reusableBlockMap) {
    const blockDriftByInstance = new Map<
      string,
      { modified: boolean; deleted: boolean }
    >();
    for (const blockSnap of blockSnapshots) {
      const liveBlock = reusableBlockMap.get(blockSnap.sourceBlockId);
      const blockSteps = steps.filter(
        (step) => step.kind === 'exercise' && step.blockInstanceId === blockSnap.blockInstanceId,
      );
      if (!liveBlock) {
        deletedBlockIds.add(blockSnap.sourceBlockId);
        blockDriftByInstance.set(blockSnap.blockInstanceId, { modified: false, deleted: true });
      } else if (hasReusableBlockDriftedFromSnapshot(blockSnap, blockSteps, liveBlock)) {
        modifiedBlockIds.add(blockSnap.sourceBlockId);
        blockDriftByInstance.set(blockSnap.blockInstanceId, { modified: true, deleted: false });
      }
    }
    if (blockDriftByInstance.size > 0) {
      steps = steps.map((step) => {
        if (!step.blockInstanceId) return step;
        const drift = blockDriftByInstance.get(step.blockInstanceId);
        if (!drift) return step;
        return {
          ...step,
          ...(drift.modified ? { isBlockTemplateModified: true } : {}),
          ...(drift.deleted ? { isBlockTemplateDeleted: true } : {}),
        };
      });
    }
  }

  for (const exerciseId of log.exerciseIds) {
    if (!exercisesMap.has(exerciseId)) {
      const hasSnap = Boolean(
        snapshot?.exercisesById[exerciseId] ||
          p1SequenceSnapshot?.exerciseSnapshots[exerciseId] ||
          steps.some((s) => s.exerciseId === exerciseId && s.fromSnapshot),
      );
      if (hasSnap) {
        if (!deletedHumanDraftIds.has(exerciseId)) {
          deletedExerciseIds.add(exerciseId);
        }
      } else {
        missingUnrecoverableExerciseIds.add(exerciseId);
      }
    }
  }

  const durations =
    snapshot?.timing ??
    (() => {
      const computed = p1SequenceSnapshot?.timeBreakdown
        ? {
            totalSec: p1SequenceSnapshot.timeBreakdown.totalSec,
            exerciseSec:
              p1SequenceSnapshot.timeBreakdown.totalSec - p1SequenceSnapshot.timeBreakdown.restSec,
            restSec: p1SequenceSnapshot.timeBreakdown.restSec,
          }
        : log.stepsSnapshot
          ? getSequenceDurations(log.stepsSnapshot)
          : {
              totalSec: steps.reduce((sum, step) => sum + step.durationMin * 60, 0),
              exerciseSec: steps.reduce((sum, step) => sum + step.durationMin * 60, 0),
              restSec: 0,
            };
      const actualDurationSec = log.actualDurationSec;
      const actualRestDurationSec = log.actualRestDurationSec;
      return {
        plannedTotalSec: computed.totalSec,
        plannedExerciseSec: computed.exerciseSec,
        plannedRestSec: computed.restSec,
        ...(actualDurationSec !== undefined ? { actualDurationSec } : {}),
        ...(actualRestDurationSec !== undefined ? { actualRestDurationSec } : {}),
        ...(actualDurationSec !== undefined
          ? {
              actualExerciseDurationSec: Math.max(
                0,
                actualDurationSec - (actualRestDurationSec ?? 0),
              ),
            }
          : {}),
      };
    })();

  const sourceSequence = savedSequences.find((seq) => seq.id === log.sequenceId);
  const sourceKind: TeachingHistorySourceKind =
    snapshot?.sourceKind ?? (sourceSequence ? 'saved-sequence' : 'active-draft');

  let sourceSequenceStatus: 'unchanged' | 'modified' | 'deleted' | 'draft-origin' = 'draft-origin';
  if (sourceKind === 'saved-sequence' || sourceSequence) {
    if (!sourceSequence) {
      sourceSequenceStatus = 'deleted';
    } else if (
      sourceSequence.title !== log.sequenceTitle ||
      serializeStepsSignature(sourceSequence.steps) !==
        serializeStepsSignature(log.stepsSnapshot ?? p1SequenceSnapshot?.steps)
    ) {
      sourceSequenceStatus = 'modified';
    } else {
      sourceSequenceStatus = 'unchanged';
    }
  }

  const movementCount =
    log.stepsSnapshot !== undefined ||
    snapshot !== undefined ||
    p1SequenceSnapshot !== undefined
      ? steps.filter((step) => step.kind === 'exercise').length
      : log.exerciseIds.length;
  const restCount = steps.filter((step) => step.kind === 'rest').length;
  const sourceProvenance =
    log.sourceProvenance ??
    snapshot?.sourceProvenance ??
    p1SequenceSnapshot?.sourceProvenance;

  return {
    logId: log.id,
    recordKind: 'completed-history',
    sourceKind,
    sourceSequenceId: log.sequenceId,
    sequenceTitle:
      snapshot?.sourceSequenceTitle || p1SequenceSnapshot?.title || log.sequenceTitle,
    sourceSubtitle: snapshot?.sourceSubtitle ?? p1SequenceSnapshot?.subtitle ?? '',
    groupId: log.groupId,
    groupName: log.groupName,
    taughtAt: log.taughtAt,
    apparatus: log.apparatus,
    level: log.level,
    rating: log.rating,
    intensity: log.intensity,
    instructorReflection: log.instructorReflection,
    timing: durations,
    steps,
    blockSnapshots,
    movementCount,
    restCount,
    hasPreservedSnapshot,
    hasCatalogDrift:
      modifiedExerciseIds.size > 0 ||
      deletedExerciseIds.size > 0 ||
      modifiedBlockIds.size > 0 ||
      deletedBlockIds.size > 0 ||
      modifiedHumanDraftIds.size > 0 ||
      deletedHumanDraftIds.size > 0 ||
      sourceSequenceStatus === 'modified' ||
      sourceSequenceStatus === 'deleted',
    modifiedExerciseIds: [...modifiedExerciseIds],
    deletedExerciseIds: [...deletedExerciseIds],
    modifiedBlockIds: [...modifiedBlockIds],
    deletedBlockIds: [...deletedBlockIds],
    modifiedHumanDraftIds: [...modifiedHumanDraftIds],
    deletedHumanDraftIds: [...deletedHumanDraftIds],
    missingUnrecoverableExerciseIds: [...missingUnrecoverableExerciseIds],
    sourceSequenceStatus,
    ...(sourceProvenance ? { sourceProvenance } : {}),
    canCopyToNextClass: missingUnrecoverableExerciseIds.size === 0 && movementCount + restCount > 0,
  };
}

/**
 * Converts a preserved `TeachingExerciseSnapshot` back into a valid `HierarchyPilatesExercise`
 * when a historical movement was later deleted from the live catalog or originated from a
 * `HumanMovementDraft`, and the instructor copies the history record to create a next class.
 */
export function reconstructExerciseFromSnapshot(
  snapshot: TeachingExerciseSnapshot,
): HierarchyPilatesExercise {
  const base: HierarchyPilatesExercise = stripUndefinedDeep({
    id: snapshot.id,
    nameKo: snapshot.nameKo,
    nameEn: snapshot.nameEn,
    apparatus: snapshot.apparatus,
    ...(snapshot.requiredEquipment ? { requiredEquipment: [...snapshot.requiredEquipment] } : {}),
    ...(snapshot.movementFamily !== undefined ? { movementFamily: snapshot.movementFamily } : {}),
    ...(snapshot.review ? { review: structuredClone(snapshot.review) } : {}),
    ...(snapshot.sourceReference
      ? { sourceReference: structuredClone(snapshot.sourceReference) }
      : {}),
    props: [...snapshot.props],
    blockCategory: snapshot.blockCategory,
    spinalPlanes: [...snapshot.spinalPlanes],
    bodyPosition: snapshot.bodyPosition,
    level: snapshot.level,
    defaultDurationMin: snapshot.defaultDurationMin,
    ...(snapshot.defaultRepetitions !== undefined
      ? { defaultRepetitions: snapshot.defaultRepetitions }
      : {}),
    ...(snapshot.defaultSets !== undefined ? { defaultSets: snapshot.defaultSets } : {}),
    isUnilateral: snapshot.isUnilateral,
    springs: snapshot.springs,
    box: snapshot.box,
    footbar: snapshot.footbar,
    headrest: snapshot.headrest,
    targetMuscles: [...snapshot.targetMuscles],
    breathPattern: snapshot.breathPattern,
    cues: [...snapshot.cues],
    precautions: snapshot.precautions,
    layers: {
      easy: snapshot.layers.easy,
      standard: snapshot.layers.standard,
      hard: snapshot.layers.hard,
    },
    youtube: structuredClone(snapshot.youtube),
    favoriteTag: snapshot.favoriteTag,
    ...(snapshot.tempo !== undefined ? { tempo: snapshot.tempo } : {}),
    ...(snapshot.isCustom !== undefined ? { isCustom: snapshot.isCustom } : {}),
    ...(snapshot.createdAt !== undefined ? { createdAt: snapshot.createdAt } : {}),
    ...(snapshot.humanDraftId ? { humanDraftId: snapshot.humanDraftId } : {}),
    ...(snapshot.humanDraftRevision !== undefined
      ? { humanDraftRevision: snapshot.humanDraftRevision }
      : {}),
  });

  if (snapshot.review?.status === 'approved') {
    const fallbackReviewedAt =
      snapshot.review.reviewedAt && !Number.isNaN(Date.parse(snapshot.review.reviewedAt))
        ? snapshot.review.reviewedAt
        : snapshot.createdAt && !Number.isNaN(Date.parse(snapshot.createdAt))
          ? snapshot.createdAt
          : '2026-03-01T00:00:00.000Z';
    base.review = {
      status: 'approved',
      reviewerAlias:
        snapshot.review.reviewerAlias?.trim() || '과거 수업 완료 기록 스냅샷 복원',
      reviewedAt: fallbackReviewedAt,
      revision: exerciseRevision(base),
      scope: 'planning-metadata',
      credentialVerified: false,
    };
  }

  return base;
}

/**
 * Attaches an immutable `TeachingProgramSnapshot` (and its P1 `ClassSequenceSnapshot`) to a newly
 * created `ClassHistoryLog` entry in `historyLogs` without modifying the shared `usePilatesStore.ts`.
 */
export function attachProgramSnapshotToHistoryLog(
  logId: string,
  programSnapshot: TeachingProgramSnapshot,
  setState: (
    updater: (state: { historyLogs: ClassHistoryLog[] }) => { historyLogs: ClassHistoryLog[] },
  ) => void,
): void {
  const cloned = stripUndefinedDeep(structuredClone(programSnapshot));
  setState((state) => ({
    historyLogs: state.historyLogs.map((log) =>
      log.id === logId
        ? ({
            ...log,
            programSnapshot: cloned,
            ...(cloned.sequenceSnapshot
              ? { sequenceSnapshot: structuredClone(cloned.sequenceSnapshot) }
              : {}),
            ...(cloned.sourceProvenance
              ? { sourceProvenance: structuredClone(cloned.sourceProvenance) }
              : {}),
          } as ClassHistoryLog)
        : log,
    ),
  }));
}

/**
 * Restores any exercises that existed when the class was taught (`log.programSnapshot.exercisesById`,
 * `log.sequenceSnapshot.exerciseSnapshots`, or embedded step snapshots) but were later deleted from
 * the live exercise catalog or created as `HumanMovementDraft`s, so `loadHistoryIntoWorkbench` and
 * P1 backup inspection can copy/validate the historical program without failing on missing IDs.
 */
export function collectMissingSnapshotExercises(
  rawLog: ClassHistoryLog,
  currentExercises: PilatesExercise[],
): PilatesExercise[] {
  const log = rawLog as ClassHistoryLogWithSnapshot;
  const knownIds = new Set(currentExercises.map((exercise) => exercise.id));
  const missing: PilatesExercise[] = [];

  const snapshot = log.programSnapshot;
  if (snapshot) {
    for (const [exerciseId, exSnap] of Object.entries(snapshot.exercisesById)) {
      if (!knownIds.has(exerciseId)) {
        missing.push(reconstructExerciseFromSnapshot(exSnap));
        knownIds.add(exerciseId);
      }
    }
    for (const item of snapshot.items) {
      if (item.kind === 'exercise' && item.exerciseId && !knownIds.has(item.exerciseId)) {
        if (item.exerciseSnapshot) {
          missing.push(reconstructExerciseFromSnapshot(item.exerciseSnapshot));
          knownIds.add(item.exerciseId);
        } else if (item.movementSnapshot) {
          missing.push(
            reconstructExerciseFromSnapshot(
              movementSnapshotToTeachingExerciseSnapshot(item.movementSnapshot),
            ),
          );
          knownIds.add(item.exerciseId);
        }
      }
    }
  }

  const p1SequenceSnapshot = log.sequenceSnapshot ?? snapshot?.sequenceSnapshot;
  if (p1SequenceSnapshot) {
    for (const [exerciseId, moveSnap] of Object.entries(p1SequenceSnapshot.exerciseSnapshots)) {
      if (!knownIds.has(exerciseId)) {
        missing.push(
          reconstructExerciseFromSnapshot(movementSnapshotToTeachingExerciseSnapshot(moveSnap)),
        );
        knownIds.add(exerciseId);
      }
    }
  }

  if (log.stepsSnapshot) {
    for (const step of log.stepsSnapshot) {
      if (!isRestStep(step) && step.exerciseId && !knownIds.has(step.exerciseId)) {
        if (step.exerciseSnapshot) {
          missing.push(
            reconstructExerciseFromSnapshot(
              movementSnapshotToTeachingExerciseSnapshot(step.exerciseSnapshot),
            ),
          );
          knownIds.add(step.exerciseId);
        }
      }
    }
  }

  return missing;
}

/**
 * Reconstructs `SequenceStep[]` from `programSnapshot.items` or `sequenceSnapshot.steps`
 * when a `ClassHistoryLog` was stored without `stepsSnapshot`.
 */
export function reconstructStepsSnapshotFromHistoryLog(
  rawLog: ClassHistoryLog,
): SequenceStep[] | null {
  if (rawLog.stepsSnapshot && rawLog.stepsSnapshot.length > 0) {
    return null;
  }
  const log = rawLog as ClassHistoryLogWithSnapshot;
  const programSnapshot = log.programSnapshot;
  if (programSnapshot && programSnapshot.items.length > 0) {
    return programSnapshot.items.map((item, idx) => {
      if (item.kind === 'rest') {
        return stripUndefinedDeep({
          stepId: item.stepId || `hist-step-${idx + 1}`,
          order: item.order ?? idx + 1,
          kind: 'rest' as const,
          blockCategory: item.blockCategory,
          exerciseId: '',
          durationMin: item.durationMin,
          selectedLayer: item.selectedLayer,
          locked: item.locked,
          instructorNote: item.instructorNote,
          explanationSec: item.explanationSec,
          transitionSec: item.transitionSec,
        });
      }
      return stripUndefinedDeep({
        stepId: item.stepId || `hist-step-${idx + 1}`,
        order: item.order ?? idx + 1,
        kind: 'exercise' as const,
        blockCategory: item.blockCategory,
        exerciseId: item.exerciseId,
        durationMin: item.durationMin,
        selectedLayer: item.selectedLayer,
        locked: item.locked,
        customSpringOverride: item.customSpringOverride,
        instructorNote: item.instructorNote,
        repetitions: item.repetitions,
        sets: item.sets,
        sideMode: item.sideMode,
        explanationSec: item.explanationSec,
        transitionSec: item.transitionSec,
        blockInstanceId: item.blockInstanceId,
        sourceBlockId: item.sourceBlockId,
        sourceBlockVersion: item.sourceBlockVersion,
        sourceBlockTitle: item.sourceBlockTitle,
        exerciseSnapshot: item.movementSnapshot
          ? structuredClone(item.movementSnapshot)
          : undefined,
        humanDraftId: item.humanDraftId,
        humanDraftRevision: item.humanDraftRevision,
      });
    });
  }

  const p1SequenceSnapshot = log.sequenceSnapshot ?? programSnapshot?.sequenceSnapshot;
  if (p1SequenceSnapshot && p1SequenceSnapshot.steps.length > 0) {
    return p1SequenceSnapshot.steps.map((step, idx) =>
      stripUndefinedDeep({
        stepId: step.stepId || `hist-step-${idx + 1}`,
        order: step.order ?? idx + 1,
        kind: step.kind,
        blockCategory: step.blockCategory,
        exerciseId: step.exerciseId,
        durationMin: step.durationMin,
        selectedLayer: step.selectedLayer,
        locked: step.locked,
        customSpringOverride: step.customSpringOverride,
        instructorNote: step.instructorNote,
        repetitions: step.repetitions,
        sets: step.sets,
        sideMode: step.sideMode,
        explanationSec: step.explanationSec,
        transitionSec: step.transitionSec,
        blockInstanceId: step.blockInstanceId,
        sourceBlockId: step.sourceBlockId,
        sourceBlockVersion: step.sourceBlockVersion,
        sourceBlockTitle: step.sourceBlockTitle,
        exerciseSnapshot: step.exerciseSnapshot
          ? structuredClone(step.exerciseSnapshot)
          : undefined,
        humanDraftId: step.humanDraftId,
        humanDraftRevision: step.humanDraftRevision,
      }),
    );
  }

  return null;
}

/**
 * Identifies exercises referenced in `rawLog` that still exist in `currentExercises`
 * by ID, but whose live attributes have drifted from the historical snapshot.
 */
export function collectDriftedSnapshotExercises(
  rawLog: ClassHistoryLog,
  currentExercises: PilatesExercise[],
): Map<string, { reconstructed: HierarchyPilatesExercise; movementSnapshot: MovementSnapshot }> {
  const log = rawLog as ClassHistoryLogWithSnapshot;
  const currentById = new Map(currentExercises.map((ex) => [ex.id, ex]));
  const drifted = new Map<
    string,
    { reconstructed: HierarchyPilatesExercise; movementSnapshot: MovementSnapshot }
  >();

  const snapshot = log.programSnapshot;
  const p1SequenceSnapshot = log.sequenceSnapshot ?? snapshot?.sequenceSnapshot;

  const inspectPair = (
    exerciseId: string,
    exSnap: TeachingExerciseSnapshot,
    moveSnap?: MovementSnapshot,
  ) => {
    if (drifted.has(exerciseId)) return;
    const liveEx = currentById.get(exerciseId);
    if (!liveEx) return;
    if (!hasExerciseDriftedFromSnapshot(exSnap, liveEx)) return;
    const reconstructed = reconstructExerciseFromSnapshot(exSnap);
    const resolvedMoveSnap =
      moveSnap ??
      p1SequenceSnapshot?.exerciseSnapshots[exerciseId] ??
      createMovementSnapshot(reconstructed);
    drifted.set(exerciseId, {
      reconstructed,
      movementSnapshot: structuredClone(resolvedMoveSnap),
    });
  };

  if (snapshot) {
    for (const [exerciseId, exSnap] of Object.entries(snapshot.exercisesById)) {
      const itemMoveSnap = snapshot.items.find(
        (it) => it.kind === 'exercise' && it.exerciseId === exerciseId,
      )?.movementSnapshot;
      inspectPair(exerciseId, exSnap, itemMoveSnap);
    }
    for (const item of snapshot.items) {
      if (item.kind === 'exercise' && item.exerciseId) {
        if (item.exerciseSnapshot) {
          inspectPair(item.exerciseId, item.exerciseSnapshot, item.movementSnapshot);
        } else if (item.movementSnapshot) {
          inspectPair(
            item.exerciseId,
            movementSnapshotToTeachingExerciseSnapshot(item.movementSnapshot),
            item.movementSnapshot,
          );
        }
      }
    }
  }

  if (p1SequenceSnapshot) {
    for (const [exerciseId, moveSnap] of Object.entries(p1SequenceSnapshot.exerciseSnapshots)) {
      inspectPair(exerciseId, movementSnapshotToTeachingExerciseSnapshot(moveSnap), moveSnap);
    }
  }

  return drifted;
}

export interface WorkbenchHistoryCopyStoreSlice {
  exercises: PilatesExercise[];
  historyLogs: ClassHistoryLog[];
  activeSteps: SequenceStep[];
  activeSequenceId: string;
  generationError: string | null;
  loadHistoryIntoWorkbench: (logId: string) => void;
}

/**
 * Safely copies a completed history record into the workbench as a new class draft:
 * 1. If no exercises were deleted/modified and `stepsSnapshot` exists, delegates directly to
 *    `loadHistoryIntoWorkbench` with zero extra `setState` mutations.
 * 2. If exercises were deleted or modified, or `stepsSnapshot` was omitted, restores missing
 *    exercises and historical criteria atomically, rolling back completely if `loadHistoryIntoWorkbench`
 *    rejects the copy, and preserving the live catalog for existing modified exercises.
 */
export function copyHistoryLogIntoWorkbenchSafely<T extends WorkbenchHistoryCopyStoreSlice>(
  logId: string,
  storeApi: {
    getState: () => T;
    setState: (updater: (state: T) => Partial<T> | T) => void;
  },
): { ok: boolean } {
  const before = storeApi.getState();
  const targetLog = before.historyLogs.find((item) => item.id === logId);
  if (!targetLog) {
    before.loadHistoryIntoWorkbench(logId);
    return { ok: false };
  }

  const missingSnapshots = collectMissingSnapshotExercises(targetLog, before.exercises);
  const driftedMap = collectDriftedSnapshotExercises(targetLog, before.exercises);
  const reconstructedSteps = reconstructStepsSnapshotFromHistoryLog(targetLog);

  if (missingSnapshots.length === 0 && driftedMap.size === 0 && !reconstructedSteps) {
    try {
      before.loadHistoryIntoWorkbench(logId);
    } catch {
      return { ok: false };
    }
    const after = storeApi.getState();
    return {
      ok: after.generationError === null && after.activeSequenceId !== before.activeSequenceId,
    };
  }

  const previousExercises = before.exercises;
  const previousHistoryLogs = before.historyLogs;
  const previousActiveSequenceId = before.activeSequenceId;

  const tempExercises = [
    ...before.exercises.map((ex) => driftedMap.get(ex.id)?.reconstructed ?? ex),
    ...missingSnapshots,
  ];
  const tempHistoryLogs = reconstructedSteps
    ? before.historyLogs.map((log) =>
        log.id === logId ? { ...log, stepsSnapshot: reconstructedSteps } : log,
      )
    : before.historyLogs;

  try {
    storeApi.setState((state) => ({
      ...state,
      exercises: tempExercises,
      historyLogs: tempHistoryLogs,
    }));

    storeApi.getState().loadHistoryIntoWorkbench(logId);
  } catch {
    try {
      storeApi.setState((state) => ({
        ...state,
        exercises: previousExercises,
        historyLogs: previousHistoryLogs,
      }));
    } catch {
      // Ignore secondary rollback error
    }
    return { ok: false };
  }

  const afterLoad = storeApi.getState();

  const succeeded =
    afterLoad.generationError === null &&
    afterLoad.activeSequenceId !== previousActiveSequenceId;

  if (!succeeded) {
    storeApi.setState((state) => ({
      ...state,
      exercises: previousExercises,
      historyLogs: previousHistoryLogs,
    }));
    return { ok: false };
  }

  const finalExercises =
    missingSnapshots.length > 0
      ? [...previousExercises, ...missingSnapshots]
      : previousExercises;

  if (
    finalExercises !== afterLoad.exercises ||
    previousHistoryLogs !== afterLoad.historyLogs
  ) {
    storeApi.setState((state) => ({
      ...state,
      exercises: finalExercises,
      historyLogs: previousHistoryLogs,
    }));
  }

  return { ok: true };
}

/**
 * Clones a completed `ClassHistoryLog` (via its preserved P1 `ClassSequenceSnapshot` or `TeachingProgramSnapshot`)
 * into an independent next-class draft with full `SequenceSourceProvenance` (`kind: 'history-snapshot'`).
 */
export function cloneTeachingHistoryToNextClassDraft(
  rawLog: ClassHistoryLog,
  currentExercises: readonly HierarchyPilatesExercise[],
  options?: { now?: string },
): {
  title: string;
  subtitle: string;
  apparatus: ClassHistoryLog['apparatus'];
  level: ClassHistoryLog['level'];
  targetMinutes: number;
  steps: SequenceStep[];
  restoredExercises: HierarchyPilatesExercise[];
  sourceProvenance: SequenceSourceProvenance;
} | null {
  const log = rawLog as ClassHistoryLogWithSnapshot;
  const p1Snapshot = log.sequenceSnapshot ?? log.programSnapshot?.sequenceSnapshot;
  if (p1Snapshot) {
    const cloned = cloneClassSnapshotToDraft(p1Snapshot, currentExercises, {
      sourceKind: 'history-snapshot',
      sourceId: log.id,
      sourceTaughtAt: log.taughtAt.slice(0, 10),
      now: options?.now,
    });
    return {
      ...cloned,
      restoredExercises: cloned.restoredExercises.map((ex) => {
        if (ex.review?.status !== 'approved' || getExerciseReviewState(ex) === 'approved') {
          return ex;
        }
        return {
          ...ex,
          review: {
            ...ex.review,
            revision: exerciseRevision(ex),
          },
        };
      }),
    };
  }

  const fallbackSteps =
    reconstructStepsSnapshotFromHistoryLog(rawLog) ??
    (rawLog.stepsSnapshot && rawLog.stepsSnapshot.length > 0
      ? structuredClone(rawLog.stepsSnapshot)
      : null);
  if (!fallbackSteps || fallbackSteps.length === 0) {
    return null;
  }

  const restoredExercises = collectMissingSnapshotExercises(
    rawLog,
    currentExercises as PilatesExercise[],
  ) as HierarchyPilatesExercise[];
  const now = options?.now ?? new Date().toISOString();
  const targetMinutes =
    rawLog.criteriaSnapshot?.targetMinutes ??
    Math.max(
      20,
      Math.round(fallbackSteps.reduce((sum, step) => sum + step.durationMin, 0)),
    );

  return {
    title: rawLog.sequenceTitle,
    subtitle: '지난 수업 완료 스냅샷에서 복제한 새 수업 초안',
    apparatus: rawLog.apparatus,
    level: rawLog.level,
    targetMinutes,
    steps: fallbackSteps,
    restoredExercises,
    sourceProvenance: {
      kind: 'history-snapshot',
      sourceId: rawLog.id,
      sourceTitle: rawLog.sequenceTitle,
      sourceTaughtAt: rawLog.taughtAt.slice(0, 10),
      clonedAt: now,
      summaryKo: `${rawLog.sequenceTitle} (${rawLog.taughtAt.slice(0, 10)}) 완료 기록에서 복사`,
    },
  };
}

export type BackupPreRestoreDomainState = RecoveryNextState;

export interface BackupRestoreRollbackPoint {
  version?: 0 | 1;
  id: string;
  capturedAt: string;
  addedCount: number;
  postRestoreStateFingerprint: string;
  postRestoreStorageFingerprint: string | null;
  preRestoreState: BackupPreRestoreDomainState;
}

export const BACKUP_ROLLBACK_STORAGE_KEY = 'pilates-flow-backup-rollback-v1';
export const BACKUP_ROLLBACK_SCHEMA_VERSION = 1;
const MAIN_RECOVERY_STORAGE_KEY = 'pilates-flow-atelier-storage-v3';

export type PersistedRollbackInvalidReason =
  | 'empty'
  | 'corrupted-json'
  | 'unsupported-version'
  | 'invalid-shape';

export type PersistedRollbackPointInspection =
  | {
      valid: true;
      version: 0 | 1;
      point: BackupRestoreRollbackPoint;
    }
  | {
      valid: false;
      reason: PersistedRollbackInvalidReason;
      version?: number;
      point: null;
    };

export type BackupRollbackFailureReason =
  | 'no-rollback-point'
  | 'post-restore-modified'
  | 'storage-changed'
  | 'storage-unavailable';

let latestBackupRollbackPoint: BackupRestoreRollbackPoint | null = null;
let latestRollbackPersistedToDisk = false;

function isValidBackupPreRestoreDomainState(
  value: unknown,
): value is BackupPreRestoreDomainState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.exercises) &&
    Array.isArray(candidate.savedSequences) &&
    Array.isArray(candidate.classGroups) &&
    Array.isArray(candidate.historyLogs) &&
    Array.isArray(candidate.conditionTemplates) &&
    Boolean(
      candidate.instructorSchedule &&
        typeof candidate.instructorSchedule === 'object' &&
        !Array.isArray(candidate.instructorSchedule),
    ) &&
    Array.isArray(candidate.ownedEquipment) &&
    Array.isArray(candidate.ownedApparatus) &&
    Array.isArray(candidate.ownedProps)
  );
}

export function inspectPersistedRollbackPoint(
  raw: string | null,
): PersistedRollbackPointInspection {
  if (raw === null || raw.trim().length === 0) {
    return { valid: false, reason: 'empty', point: null };
  }
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(raw);
  } catch {
    return { valid: false, reason: 'corrupted-json', point: null };
  }
  if (!parsedUnknown || typeof parsedUnknown !== 'object' || Array.isArray(parsedUnknown)) {
    return { valid: false, reason: 'invalid-shape', point: null };
  }
  const parsed = parsedUnknown as Record<string, unknown>;
  if (parsed.version !== undefined) {
    if (
      typeof parsed.version !== 'number' ||
      !Number.isInteger(parsed.version) ||
      (parsed.version !== 0 && parsed.version !== 1)
    ) {
      return {
        valid: false,
        reason: 'unsupported-version',
        version: typeof parsed.version === 'number' ? parsed.version : undefined,
        point: null,
      };
    }
  }
  if (
    typeof parsed.id !== 'string' ||
    parsed.id.trim().length === 0 ||
    typeof parsed.postRestoreStateFingerprint !== 'string' ||
    parsed.postRestoreStateFingerprint.trim().length === 0 ||
    (parsed.postRestoreStorageFingerprint !== null &&
      parsed.postRestoreStorageFingerprint !== undefined &&
      typeof parsed.postRestoreStorageFingerprint !== 'string') ||
    !isValidBackupPreRestoreDomainState(parsed.preRestoreState)
  ) {
    return { valid: false, reason: 'invalid-shape', point: null };
  }
  const pre = parsed.preRestoreState;
  const resolvedVersion: 0 | 1 = parsed.version === 0 ? 0 : 1;
  return {
    valid: true,
    version: resolvedVersion,
    point: {
      version: resolvedVersion,
      id: parsed.id,
      capturedAt: typeof parsed.capturedAt === 'string' ? parsed.capturedAt : '',
      addedCount: typeof parsed.addedCount === 'number' ? parsed.addedCount : 0,
      postRestoreStateFingerprint: parsed.postRestoreStateFingerprint,
      postRestoreStorageFingerprint:
        typeof parsed.postRestoreStorageFingerprint === 'string'
          ? parsed.postRestoreStorageFingerprint
          : null,
      preRestoreState: {
        exercises: pre.exercises,
        savedSequences: pre.savedSequences,
        classGroups: pre.classGroups,
        historyLogs: pre.historyLogs,
        conditionTemplates: pre.conditionTemplates,
        instructorSchedule: pre.instructorSchedule,
        instructorStudyState: pre.instructorStudyState,
        datedSequencePlanning: pre.datedSequencePlanning,
        ownedEquipment: pre.ownedEquipment,
        ownedApparatus: pre.ownedApparatus,
        ownedProps: pre.ownedProps,
        lastCriteria: pre.lastCriteria ?? null,
        draftCriteria: pre.draftCriteria ?? null,
      },
    },
  };
}

function persistRollbackPointToStorage(point: BackupRestoreRollbackPoint | null): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    if (point === null) {
      window.localStorage.removeItem(BACKUP_ROLLBACK_STORAGE_KEY);
      return true;
    }
    if (point.postRestoreStorageFingerprint !== null) {
      window.localStorage.setItem(
        BACKUP_ROLLBACK_STORAGE_KEY,
        JSON.stringify({
          version: point.version ?? BACKUP_ROLLBACK_SCHEMA_VERSION,
          ...point,
        }),
      );
      return true;
    }
    return false;
  } catch {
    // Ignore storage quota or security errors for auxiliary rollback cache; in-memory rollback point stays intact
    return false;
  }
}

function readRollbackPointFromStorage(): BackupRestoreRollbackPoint | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(BACKUP_ROLLBACK_STORAGE_KEY);
    const inspection = inspectPersistedRollbackPoint(raw);
    if (!inspection.valid) return null;
    if (
      inspection.point.postRestoreStorageFingerprint !== null &&
      window.localStorage.getItem(MAIN_RECOVERY_STORAGE_KEY) === null
    ) {
      return null;
    }
    return inspection.point;
  } catch {
    return null;
  }
}

export function resetInMemoryBackupRollbackPointForTest(): void {
  latestBackupRollbackPoint = null;
  latestRollbackPersistedToDisk = false;
}

export function captureBackupPreRestoreState(
  state: BackupPreRestoreDomainState,
): BackupPreRestoreDomainState {
  return {
    exercises: state.exercises,
    savedSequences: state.savedSequences,
    classGroups: state.classGroups,
    historyLogs: state.historyLogs,
    conditionTemplates: state.conditionTemplates,
    instructorSchedule: state.instructorSchedule,
    instructorStudyState: state.instructorStudyState,
    datedSequencePlanning: state.datedSequencePlanning,
    ownedEquipment: state.ownedEquipment,
    ownedApparatus: state.ownedApparatus,
    ownedProps: state.ownedProps,
    lastCriteria: state.lastCriteria,
    draftCriteria: state.draftCriteria,
  };
}

export function recordBackupRestoreRollbackPoint(input: {
  preRestoreState: BackupPreRestoreDomainState;
  addedCount: number | undefined;
  postRestoreStateFingerprint: string;
  postRestoreStorageFingerprint: string | null;
  now?: string;
}): BackupRestoreRollbackPoint {
  const point: BackupRestoreRollbackPoint = {
    version: BACKUP_ROLLBACK_SCHEMA_VERSION,
    id: `rollback-${Date.now()}`,
    capturedAt: input.now ?? new Date().toISOString(),
    addedCount: input.addedCount ?? 0,
    postRestoreStateFingerprint: input.postRestoreStateFingerprint,
    postRestoreStorageFingerprint: input.postRestoreStorageFingerprint,
    preRestoreState: input.preRestoreState,
  };
  latestBackupRollbackPoint = point;
  latestRollbackPersistedToDisk = persistRollbackPointToStorage(point);
  return point;
}

export function getLatestBackupRollbackPoint(): BackupRestoreRollbackPoint | null {
  if (latestBackupRollbackPoint) {
    if (
      latestRollbackPersistedToDisk &&
      typeof window !== 'undefined' &&
      window.localStorage &&
      window.localStorage.getItem(BACKUP_ROLLBACK_STORAGE_KEY) === null
    ) {
      latestBackupRollbackPoint = null;
      latestRollbackPersistedToDisk = false;
      return null;
    }
    return latestBackupRollbackPoint;
  }
  const hydrated = readRollbackPointFromStorage();
  if (hydrated) {
    latestBackupRollbackPoint = hydrated;
    latestRollbackPersistedToDisk = true;
  }
  return latestBackupRollbackPoint;
}

export function clearBackupRestoreRollbackPoint(): void {
  latestBackupRollbackPoint = null;
  latestRollbackPersistedToDisk = false;
  persistRollbackPointToStorage(null);
}

function computePersistedStorageFingerprint(
  raw: string | null,
): { ok: true; fingerprint: string } | { ok: false; code: 'storage_invalid' } {
  if (raw === null) return { ok: true, fingerprint: 'missing' };
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      !('version' in value) ||
      ((value as { version?: unknown }).version !== 0 &&
        (value as { version?: unknown }).version !== 3) ||
      !('state' in value) ||
      !(value as { state?: unknown }).state ||
      typeof (value as { state?: unknown }).state !== 'object' ||
      Array.isArray((value as { state?: unknown }).state)
    ) {
      return { ok: false, code: 'storage_invalid' };
    }
    const state: Record<string, unknown> = {
      ...((value as { state: Record<string, unknown> }).state ?? {}),
    };
    if (
      typeof state.activeTab === 'string' &&
      ['workbench', 'atlas', 'binder', 'history', 'stage', 'schedule'].includes(state.activeTab)
    ) {
      delete state.activeTab;
    }
    if (
      typeof state.themeMode === 'string' &&
      ['system', 'light', 'dark'].includes(state.themeMode)
    ) {
      delete state.themeMode;
    }
    const normalize = (item: unknown): unknown => {
      if (typeof item === 'number' && !Number.isFinite(item)) {
        throw new Error('non-finite persisted number');
      }
      if (Array.isArray(item)) return item.map(normalize);
      if (item !== null && typeof item === 'object') {
        const object = item as Record<string, unknown>;
        return Object.fromEntries(
          Object.keys(object)
            .sort()
            .map((key) => [key, normalize(object[key])]),
        );
      }
      return item;
    };
    return {
      ok: true,
      fingerprint: JSON.stringify(normalize({ ...(value as Record<string, unknown>), state })),
    };
  } catch {
    return { ok: false, code: 'storage_invalid' };
  }
}

export function rollbackLatestBackupRestore<
  T extends RecoveryCurrentState & {
    ownedApparatus: ApparatusType[];
    saveFeedback: string | null;
    generationError: string | null;
  },
>(storeApi: {
  getState: () => T;
  setState: (partial: Partial<T>) => void;
  checkStorage?: (
    expectedFingerprint?: string | null,
  ) => { ok: boolean; code?: string; message?: string };
}): { success: boolean; reason?: BackupRollbackFailureReason; message: string } {
  const point = getLatestBackupRollbackPoint();
  if (!point) {
    return {
      success: false,
      reason: 'no-rollback-point',
      message: '되돌릴 수 있는 최근 백업 복원 기록이 없습니다.',
    };
  }

  const current = storeApi.getState();
  const currentFingerprint = backupRecoveryStateFingerprint(current);
  if (currentFingerprint !== point.postRestoreStateFingerprint) {
    return {
      success: false,
      reason: 'post-restore-modified',
      message:
        '복원 이후 추가 변경이 발생해 자동 되돌리기를 중단했습니다. 현재 데이터를 먼저 백업으로 내보내 주세요.',
    };
  }

  if (storeApi.checkStorage) {
    if (point.postRestoreStorageFingerprint !== null) {
      const disk = storeApi.checkStorage(point.postRestoreStorageFingerprint);
      if (!disk.ok) {
        if (disk.code === 'storage_unavailable') {
          let rawDisk: string | null = null;
          let canReadDisk = false;
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              rawDisk = window.localStorage.getItem('pilates-flow-atelier-storage-v3');
              canReadDisk = true;
            }
          } catch {
            canReadDisk = false;
          }
          if (!canReadDisk) {
            return {
              success: false,
              reason: 'storage-unavailable',
              message:
                disk.message ??
                '다른 탭 변경 또는 브라우저 저장소 상태 문제로 자동 되돌리기를 중단했습니다.',
            };
          }
          const directFp = computePersistedStorageFingerprint(rawDisk);
          if (!directFp.ok || directFp.fingerprint !== point.postRestoreStorageFingerprint) {
            return {
              success: false,
              reason: 'storage-changed',
              message:
                '다른 탭 또는 창에서 브라우저 저장 자료가 바뀌어 복원을 적용하지 않았습니다. 현재 작업을 내보내 보관하고, 다른 탭의 자료를 확인한 뒤 새로 열어 주세요. 자동으로 합치거나 덮어쓰지 않았습니다.',
            };
          }
        } else {
          return {
            success: false,
            reason: 'storage-changed',
            message:
              disk.message ??
              '다른 탭 변경 또는 브라우저 저장소 상태 문제로 자동 되돌리기를 중단했습니다.',
          };
        }
      }
    } else {
      const disk = storeApi.checkStorage();
      if (!disk.ok && disk.code === 'storage_changed') {
        return {
          success: false,
          reason: 'storage-changed',
          message:
            disk.message ??
            '다른 탭에서 브라우저 저장 자료가 바뀌어 자동 되돌리기를 중단했습니다.',
        };
      }
    }
  }

  try {
    storeApi.setState({
      ...point.preRestoreState,
      saveFeedback: '백업 복원 이전 상태로 되돌렸습니다.',
      generationError: null,
    } as unknown as Partial<T>);
  } catch {
    return {
      success: false,
      reason: 'storage-unavailable',
      message:
        '브라우저 저장소 기록 중 오류가 발생하여 복원 이전 상태로 되돌리지 못했습니다.',
    };
  }

  if (storeApi.checkStorage && point.postRestoreStorageFingerprint !== null) {
    const postDisk = storeApi.checkStorage();
    if (!postDisk.ok) {
      try {
        storeApi.setState(current);
      } catch {
        // Ignore secondary revert failure
      }
      return {
        success: false,
        reason: 'storage-unavailable',
        message:
          postDisk.message ??
          '브라우저 저장소 용량 부족 또는 쓰기 오류로 되돌리기를 완료하지 못했습니다.',
      };
    }
  }

  clearBackupRestoreRollbackPoint();

  return {
    success: true,
    message: '백업 복원 이전 상태로 되돌렸습니다.',
  };
}

export function formatTeachingHistorySnapshotText(view: ResolvedTeachingHistoryView): string {
  const dateText = view.taughtAt.slice(0, 10);
  const intensityLabel =
    view.intensity === 'relaxed'
      ? '여유롭게'
      : view.intensity === 'moderate'
        ? '적당하게'
        : '집중해서';
  const plannedText = [
    `계획 총 ${formatSecondsToMMSS(view.timing.plannedTotalSec)}`,
    view.timing.plannedRestSec > 0
      ? `동작·설명·전환 ${formatSecondsToMMSS(view.timing.plannedExerciseSec)} · 휴식 ${formatSecondsToMMSS(view.timing.plannedRestSec)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const actualText =
    view.timing.actualDurationSec !== undefined
      ? [
          `실제 진행 ${formatSecondsToMMSS(view.timing.actualDurationSec)}`,
          view.timing.actualRestDurationSec !== undefined && view.timing.actualRestDurationSec > 0
            ? `실제 휴식 ${formatSecondsToMMSS(view.timing.actualRestDurationSec)}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '실제 진행 시간 수동 미입력';

  const apparatusLabel =
    view.apparatus === 'mixed' ? '여러 기구' : APPARATUS_LABELS[view.apparatus].ko;
  const blockSummaryLine =
    view.blockSnapshots.length > 0
      ? `포함된 재사용 블록 스냅샷: ${view.blockSnapshots
          .map((b) => `${b.sourceBlockTitle} (v${b.sourceBlockVersion}${b.detached ? ' · 개별 조정' : ''})`)
          .join(', ')}`
      : null;

  const headerLines = [
    `[진행 완료 수업 이력 스냅샷] ${view.sequenceTitle}`,
    `구분: 진행 완료 이력 (계획/템플릿과 분리된 불변 스냅샷)`,
    `진행 날짜: ${dateText} (${view.taughtAt})`,
    `대상 반: ${view.groupName} · 기구: ${apparatusLabel} · 레벨: Lv. ${view.level}`,
    `시간 스냅샷: ${plannedText} / ${actualText}`,
    `만족도·체감 강도: ${view.rating}점 · ${intensityLabel}`,
    blockSummaryLine,
    view.instructorReflection ? `강사 회고: ${view.instructorReflection}` : null,
    '',
    '[당시 진행한 블록·동작·순서·시간]',
  ].filter((line): line is string => line !== null);

  const stepLines = view.steps.map((step, index) => {
    const num = String(index + 1).padStart(2, '0');
    const totalClock = formatSecondsToMMSS(step.durationMin * 60);
    if (step.kind === 'rest') {
      return [
        `${num}. [${totalClock}] 휴식 (${step.classSectionLabelKo})`,
        step.instructorNote ? `    - 메모: ${step.instructorNote}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    }

    const propText = step.props
      .filter((prop) => prop !== 'none')
      .map((prop) => PROP_LABELS[prop].ko)
      .join(', ');
    const practiceText =
      step.repetitions !== undefined && step.sets !== undefined
        ? `${step.sideMode === 'left-then-right' || step.sideMode === 'right-then-left' ? '편측 교대 ' : ''}${step.repetitions}회 × ${step.sets}세트`
        : null;
    const setupText = [
      step.effectiveSprings ? `스프링 ${step.effectiveSprings}` : null,
      step.box ? `박스 ${BOX_LABELS[step.box]}` : null,
      propText ? `소도구 ${propText}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const blockBadge = step.sourceBlockTitle
      ? `[${step.blockNameKo} · 블록: ${step.sourceBlockTitle} v${step.sourceBlockVersion ?? 1}]`
      : `[${step.blockNameKo}]`;

    return [
      `${num}. [${totalClock}] ${blockBadge} ${step.nameKo}${step.nameEn ? ` (${step.nameEn})` : ''} — ${step.selectedLayerLabelKo}`,
      `    - 시간 구성: 수행 ${formatSecondsToMMSS(step.movementSec)} · 설명 ${step.explanationSec}초 · 전환 ${step.transitionSec}초`,
      practiceText ? `    - 반복·세트: ${practiceText}` : null,
      setupText ? `    - 당시 기구 세팅: ${setupText}` : null,
      step.selectedLayerDescription
        ? `    - 당시 레이어 가이드: ${step.selectedLayerDescription}`
        : null,
      step.cues[0] ? `    - 당시 핵심 큐잉: ${step.cues[0]}` : null,
      step.instructorNote ? `    - 당시 강사 메모: ${step.instructorNote}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [...headerLines, ...stepLines].join('\n');
}
