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
  return stripUndefinedDeep({
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
    return cloneClassSnapshotToDraft(p1Snapshot, currentExercises, {
      sourceKind: 'history-snapshot',
      sourceId: log.id,
      sourceTaughtAt: log.taughtAt.slice(0, 10),
      now: options?.now,
    });
  }
  return null;
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
