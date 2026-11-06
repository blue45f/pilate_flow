import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  PROP_LABELS,
} from '../data/pilatesCatalog';
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
  ResolvedTeachingHistoryStepView,
  ResolvedTeachingHistoryView,
  TeachingExerciseSnapshot,
  TeachingHistorySourceKind,
  TeachingProgramSnapshot,
  TeachingProgramSnapshotItem,
  TeachingProgramTimingSnapshot,
} from '../types/teachingHistorySnapshot';
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

export function createTeachingExerciseSnapshot(
  exercise: PilatesExercise,
): TeachingExerciseSnapshot {
  return {
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
  };
}

export function hasExerciseDriftedFromSnapshot(
  snapshot: TeachingExerciseSnapshot,
  current: PilatesExercise,
): boolean {
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
  const exerciseMap = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));
  const exercisesById: Record<string, TeachingExerciseSnapshot> = {};

  const normalizedSteps = input.steps.map((step, index) => ({
    ...structuredClone(step),
    order: index + 1,
  }));

  const items: TeachingProgramSnapshotItem[] = normalizedSteps.map((step, index) => {
    const rest = isRestStep(step);
    const exercise = rest ? undefined : exerciseMap.get(step.exerciseId);
    const exerciseSnapshot = exercise ? createTeachingExerciseSnapshot(exercise) : undefined;
    if (exerciseSnapshot) {
      exercisesById[exerciseSnapshot.id] = exerciseSnapshot;
    }

    const blockMeta = getBlockLabel(step.blockCategory);
    const classSection = getBlockSection(step.blockCategory);
    const timing = rest
      ? {
          totalSec: step.durationMin * 60,
          explanationSec: 0,
          transitionSec: 0,
          movementSec: step.durationMin * 60,
          perSideSec: 0,
          sides: 1 as const,
        }
      : getStepTiming(step, exercise);
    const effectiveSprings = rest
      ? ''
      : step.customSpringOverride?.trim() || exercise?.springs || '';

    return {
      order: index + 1,
      stepId: step.stepId,
      kind: rest ? 'rest' : 'exercise',
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
      selectedLayerDescription: rest ? '휴식 구간' : (exercise?.layers[step.selectedLayer] ?? ''),
      ...(step.customSpringOverride !== undefined
        ? { customSpringOverride: step.customSpringOverride }
        : {}),
      effectiveSprings,
      ...(step.repetitions !== undefined ? { repetitions: step.repetitions } : {}),
      ...(step.sets !== undefined ? { sets: step.sets } : {}),
      ...(step.sideMode ? { sideMode: step.sideMode } : {}),
      ...(step.instructorNote ? { instructorNote: step.instructorNote } : {}),
      ...(step.locked !== undefined ? { locked: step.locked } : {}),
      ...(exerciseSnapshot ? { exerciseSnapshot } : {}),
    };
  });

  const durations = getSequenceDurations(normalizedSteps);
  const actualDurationSec = input.actualDurationSec;
  const actualRestDurationSec = input.actualRestDurationSec;
  const actualExerciseDurationSec =
    actualDurationSec !== undefined
      ? Math.max(0, actualDurationSec - (actualRestDurationSec ?? 0))
      : undefined;

  const timing: TeachingProgramTimingSnapshot = {
    plannedTotalSec: durations.totalSec,
    plannedExerciseSec: durations.exerciseSec,
    plannedRestSec: durations.restSec,
    ...(actualDurationSec !== undefined ? { actualDurationSec } : {}),
    ...(actualRestDurationSec !== undefined ? { actualRestDurationSec } : {}),
    ...(actualExerciseDurationSec !== undefined ? { actualExerciseDurationSec } : {}),
  };

  return {
    snapshotVersion: 1,
    recordKind: 'completed-history',
    sourceKind: input.sourceKind,
    sourceSequenceId: input.sequenceId,
    sourceSequenceTitle: input.sequenceTitle,
    sourceSubtitle: input.sequenceSubtitle ?? '',
    taughtAt: input.taughtAt,
    capturedAt: input.capturedAt ?? input.taughtAt,
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
    items,
  };
}

export function resolveTeachingHistoryView(
  rawLog: ClassHistoryLog,
  exercisesMap: Map<string, PilatesExercise>,
  savedSequences: SavedSequence[] = [],
): ResolvedTeachingHistoryView {
  const log = rawLog as ClassHistoryLogWithSnapshot;
  const snapshot = log.programSnapshot;
  const hasPreservedSnapshot = Boolean(snapshot && snapshot.items.length > 0);

  const modifiedExerciseIds = new Set<string>();
  const deletedExerciseIds = new Set<string>();
  const missingUnrecoverableExerciseIds = new Set<string>();

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

      const exSnap = item.exerciseSnapshot ?? snapshot.exercisesById[item.exerciseId];
      const liveEx = exercisesMap.get(item.exerciseId);

      const isCatalogDeleted = Boolean(exSnap && !liveEx);
      const isCatalogModified = Boolean(
        exSnap && liveEx && hasExerciseDriftedFromSnapshot(exSnap, liveEx),
      );
      const isMissingUnrecoverable = !exSnap && !liveEx;

      if (isCatalogDeleted) deletedExerciseIds.add(item.exerciseId);
      if (isCatalogModified) modifiedExerciseIds.add(item.exerciseId);
      if (isMissingUnrecoverable) missingUnrecoverableExerciseIds.add(item.exerciseId);

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
        ...(sourceEx ? { box: sourceEx.box, footbar: sourceEx.footbar, headrest: sourceEx.headrest } : {}),
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
        fromSnapshot: Boolean(exSnap),
        isCatalogModified,
        isCatalogDeleted,
        isMissingUnrecoverable,
      };
    });
  } else if (log.stepsSnapshot && log.stepsSnapshot.length > 0) {
    steps = log.stepsSnapshot.map((step, index) => {
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
          fromSnapshot: false,
          isCatalogModified: false,
          isCatalogDeleted: false,
          isMissingUnrecoverable: false,
        };
      }

      const liveEx = exercisesMap.get(step.exerciseId);
      if (!liveEx) {
        missingUnrecoverableExerciseIds.add(step.exerciseId);
      }
      const timing = getStepTiming(step, liveEx);

      return {
        order: step.order ?? index + 1,
        stepId: step.stepId,
        kind: 'exercise',
        exerciseId: step.exerciseId,
        nameKo: liveEx?.nameKo ?? '삭제된 동작',
        nameEn: liveEx?.nameEn ?? '',
        apparatus: liveEx?.apparatus ?? log.apparatus,
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
        selectedLayerDescription: liveEx?.layers[step.selectedLayer] ?? '',
        effectiveSprings: step.customSpringOverride?.trim() || liveEx?.springs || '',
        ...(liveEx ? { box: liveEx.box, footbar: liveEx.footbar, headrest: liveEx.headrest } : {}),
        props: liveEx ? [...liveEx.props] : [],
        cues: liveEx ? [...liveEx.cues] : [],
        precautions: liveEx?.precautions ?? '',
        breathPattern: liveEx?.breathPattern ?? '',
        isUnilateral: liveEx?.isUnilateral ?? false,
        ...(step.repetitions !== undefined ? { repetitions: step.repetitions } : {}),
        ...(step.sets !== undefined ? { sets: step.sets } : {}),
        ...(step.sideMode ? { sideMode: step.sideMode } : {}),
        ...(step.instructorNote ? { instructorNote: step.instructorNote } : {}),
        ...(step.locked !== undefined ? { locked: step.locked } : {}),
        fromSnapshot: false,
        isCatalogModified: false,
        isCatalogDeleted: false,
        isMissingUnrecoverable: !liveEx,
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

  for (const exerciseId of log.exerciseIds) {
    if (!exercisesMap.has(exerciseId)) {
      const hasSnap = Boolean(snapshot?.exercisesById[exerciseId]);
      if (hasSnap) {
        deletedExerciseIds.add(exerciseId);
      } else {
        missingUnrecoverableExerciseIds.add(exerciseId);
      }
    }
  }

  const durations =
    snapshot?.timing ??
    (() => {
      const computed = log.stepsSnapshot
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
      serializeStepsSignature(sourceSequence.steps) !== serializeStepsSignature(log.stepsSnapshot)
    ) {
      sourceSequenceStatus = 'modified';
    } else {
      sourceSequenceStatus = 'unchanged';
    }
  }

  const movementCount =
    log.stepsSnapshot !== undefined || snapshot !== undefined
      ? steps.filter((step) => step.kind === 'exercise').length
      : log.exerciseIds.length;
  const restCount = steps.filter((step) => step.kind === 'rest').length;

  return {
    logId: log.id,
    recordKind: 'completed-history',
    sourceKind,
    sourceSequenceId: log.sequenceId,
    sequenceTitle: snapshot?.sourceSequenceTitle || log.sequenceTitle,
    sourceSubtitle: snapshot?.sourceSubtitle ?? '',
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
    movementCount,
    restCount,
    hasPreservedSnapshot,
    hasCatalogDrift:
      modifiedExerciseIds.size > 0 ||
      deletedExerciseIds.size > 0 ||
      sourceSequenceStatus === 'modified' ||
      sourceSequenceStatus === 'deleted',
    modifiedExerciseIds: [...modifiedExerciseIds],
    deletedExerciseIds: [...deletedExerciseIds],
    missingUnrecoverableExerciseIds: [...missingUnrecoverableExerciseIds],
    sourceSequenceStatus,
    canCopyToNextClass: missingUnrecoverableExerciseIds.size === 0 && movementCount + restCount > 0,
  };
}

/**
 * Converts a preserved `TeachingExerciseSnapshot` back into a valid `PilatesExercise`
 * when a historical movement was later deleted from the live catalog and the instructor
 * copies the history record to create a next class.
 */
export function reconstructExerciseFromSnapshot(
  snapshot: TeachingExerciseSnapshot,
): PilatesExercise {
  return {
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
  };
}

/**
 * Attaches an immutable `TeachingProgramSnapshot` to a newly created `ClassHistoryLog` entry
 * in `historyLogs` without modifying the shared `usePilatesStore.ts` implementation.
 */
export function attachProgramSnapshotToHistoryLog(
  logId: string,
  programSnapshot: TeachingProgramSnapshot,
  setState: (
    updater: (state: { historyLogs: ClassHistoryLog[] }) => { historyLogs: ClassHistoryLog[] },
  ) => void,
): void {
  const cloned = structuredClone(programSnapshot);
  setState((state) => ({
    historyLogs: state.historyLogs.map((log) =>
      log.id === logId ? ({ ...log, programSnapshot: cloned } as ClassHistoryLog) : log,
    ),
  }));
}

/**
 * Restores any exercises that existed when the class was taught (`log.programSnapshot.exercisesById`)
 * but were later deleted from the live exercise catalog, so `loadHistoryIntoWorkbench` can copy the
 * historical program into a new draft without failing on missing catalog IDs.
 */
export function collectMissingSnapshotExercises(
  rawLog: ClassHistoryLog,
  currentExercises: PilatesExercise[],
): PilatesExercise[] {
  const log = rawLog as ClassHistoryLogWithSnapshot;
  const snapshot = log.programSnapshot;
  if (!snapshot) return [];
  const knownIds = new Set(currentExercises.map((exercise) => exercise.id));
  const missing: PilatesExercise[] = [];
  for (const [exerciseId, exSnap] of Object.entries(snapshot.exercisesById)) {
    if (!knownIds.has(exerciseId)) {
      missing.push(reconstructExerciseFromSnapshot(exSnap));
      knownIds.add(exerciseId);
    }
  }
  return missing;
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
  const headerLines = [
    `[진행 완료 수업 이력 스냅샷] ${view.sequenceTitle}`,
    `구분: 진행 완료 이력 (계획/템플릿과 분리된 불변 스냅샷)`,
    `진행 날짜: ${dateText} (${view.taughtAt})`,
    `대상 반: ${view.groupName} · 기구: ${apparatusLabel} · 레벨: Lv. ${view.level}`,
    `시간 스냅샷: ${plannedText} / ${actualText}`,
    `만족도·체감 강도: ${view.rating}점 · ${intensityLabel}`,
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

    return [
      `${num}. [${totalClock}] [${step.blockNameKo}] ${step.nameKo}${step.nameEn ? ` (${step.nameEn})` : ''} — ${step.selectedLayerLabelKo}`,
      `    - 시간 구성: 수행 ${formatSecondsToMMSS(step.movementSec)} · 설명 ${step.explanationSec}초 · 전환 ${step.transitionSec}초`,
      practiceText ? `    - 반복·세트: ${practiceText}` : null,
      setupText ? `    - 당시 기구 세팅: ${setupText}` : null,
      step.selectedLayerDescription ? `    - 당시 레이어 가이드: ${step.selectedLayerDescription}` : null,
      step.cues[0] ? `    - 당시 핵심 큐잉: ${step.cues[0]}` : null,
      step.instructorNote ? `    - 당시 강사 메모: ${step.instructorNote}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [...headerLines, ...stepLines].join('\n');
}
