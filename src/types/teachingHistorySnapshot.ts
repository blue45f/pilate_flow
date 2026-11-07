import type { StepTimeEstimate } from '../schemas/stepTimeEstimate';
import type { ClassSectionRole, SequenceMotionStudyBinding } from './sequenceMotion';
import type {
  ClassBlockSnapshot,
  ClassSequenceSnapshot,
  DraftModificationLog,
  DraftPhotoReference,
  HumanMovementDraft,
  MovementSafetyAndEfficacyBoundary,
  MovementSnapshot,
  ReusableBlock,
  SequenceSourceProvenance,
  SubjectiveFeelLog,
} from './hierarchy';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  BodyPosition,
  BoxState,
  ClassBlockCategory,
  ClassHistoryLog,
  DifficultyLevel,
  ExerciseLayers,
  ExerciseReview,
  ExerciseSourceReference,
  FavoriteTag,
  FootbarState,
  HeadrestState,
  LayerMode,
  PilatesExercise,
  PropType,
  SequenceStep,
  SpinalPlane,
  StepSideMode,
  WorkoutTempo,
  YouTubeClipRef,
} from './pilates';

/**
 * Explicit domain classification separating reusable plans/templates from
 * immutable completed teaching history records.
 */
export type TeachingRecordKind = 'plan-sequence' | 'condition-template' | 'completed-history';

/**
 * Origin of a completed class session at the time it was recorded.
 */
export type TeachingHistorySourceKind = 'saved-sequence' | 'active-draft';

/**
 * Immutable snapshot of a PilatesExercise or HumanMovementDraft at the exact time a class was taught.
 * Later mutations or deletions in the live exercise catalog or human draft repository must never alter this snapshot.
 */
export interface TeachingExerciseSnapshot {
  id: string;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType;
  requiredEquipment?: string[];
  movementFamily?: string;
  review?: ExerciseReview;
  sourceReference?: ExerciseSourceReference;
  props: PropType[];
  blockCategory: ClassBlockCategory;
  spinalPlanes: SpinalPlane[];
  bodyPosition: BodyPosition;
  level: DifficultyLevel;
  defaultDurationMin: number;
  defaultRepetitions?: number;
  defaultSets?: number;
  isUnilateral: boolean;
  springs: string;
  box: BoxState;
  footbar: FootbarState;
  headrest: HeadrestState;
  targetMuscles: string[];
  breathPattern: string;
  cues: string[];
  precautions: string;
  layers: ExerciseLayers;
  youtube: YouTubeClipRef;
  favoriteTag: FavoriteTag;
  tempo?: WorkoutTempo;
  isCustom?: boolean;
  createdAt?: string;
  capturedAt?: string;
  sourceOrigin?: 'catalog' | 'human-created';
  humanDraftId?: string;
  humanDraftRevision?: number;
  ideaLineSnapshot?: string;
  feelLogsSnapshot?: SubjectiveFeelLog[];
  modificationLogsSnapshot?: DraftModificationLog[];
  photoReferencesSnapshot?: DraftPhotoReference[];
  safetyBoundarySnapshot?: MovementSafetyAndEfficacyBoundary;
}

/**
 * Immutable snapshot of a single ordered step/block as taught in the completed class.
 */
export interface TeachingProgramSnapshotItem {
  order: number;
  stepId: string;
  kind: 'exercise' | 'rest';
  exerciseId: string;
  blockCategory: ClassBlockCategory;
  blockNameKo: string;
  blockNameEn: string;
  classSection: 'opening' | 'main' | 'ending';
  classSectionLabelKo: string;
  stepClassSection?: ClassSectionRole;
  timeEstimate?: StepTimeEstimate;
  motionStudy?: SequenceMotionStudyBinding;
  durationMin: number;
  explanationSec: number;
  transitionSec: number;
  movementSec: number;
  perSideSec?: number;
  selectedLayer: LayerMode;
  selectedLayerLabelKo: string;
  selectedLayerDescription: string;
  customSpringOverride?: string;
  effectiveSprings: string;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
  instructorNote?: string;
  locked?: boolean;
  blockInstanceId?: string;
  sourceBlockId?: string;
  sourceBlockVersion?: number;
  sourceBlockTitle?: string;
  blockInstanceDetached?: boolean;
  humanDraftId?: string;
  humanDraftRevision?: number;
  movementSnapshot?: MovementSnapshot;
  exerciseSnapshot?: TeachingExerciseSnapshot;
}

/**
 * Planned vs. actual timing preserved at the moment the class was completed.
 */
export interface TeachingProgramTimingSnapshot {
  plannedTotalSec: number;
  plannedExerciseSec: number;
  plannedRestSec: number;
  actualDurationSec?: number;
  actualRestDurationSec?: number;
  actualExerciseDurationSec?: number;
}

/**
 * Complete immutable program snapshot attached to a completed ClassHistoryLog.
 * Stored under `programSnapshot` on `ClassHistoryLog` (preserved by P1 `historySchema.passthrough()`).
 */
export interface TeachingProgramSnapshot {
  snapshotVersion: 1;
  recordKind: 'completed-history';
  sourceKind: TeachingHistorySourceKind;
  sourceSequenceId: string;
  sourceSequenceTitle: string;
  sourceSubtitle: string;
  sourceSequenceVersion?: number;
  sourceProvenance?: SequenceSourceProvenance;
  taughtAt: string;
  /** The date was entered without an observed class start time; preserve the ISO anchor. */
  dateOnly?: boolean;
  capturedAt: string;
  completionFingerprint: string;
  timing: TeachingProgramTimingSnapshot;
  exercisesById: Record<string, TeachingExerciseSnapshot>;
  blockSnapshots?: ClassBlockSnapshot[];
  sequenceSnapshot?: ClassSequenceSnapshot;
  items: TeachingProgramSnapshotItem[];
}

/**
 * Extended ClassHistoryLog type carrying the immutable `programSnapshot` and P1 `sequenceSnapshot` payloads.
 * Compatible with shared `ClassHistoryLog` and P1 `historySchema.passthrough()`.
 */
export type ClassHistoryLogWithSnapshot = ClassHistoryLog & {
  programSnapshot?: TeachingProgramSnapshot;
  sequenceSnapshot?: ClassSequenceSnapshot;
  sourceProvenance?: SequenceSourceProvenance;
};

/**
 * Payload passed to `usePilatesStore.getState().logClassSession(...)` enriched with `programSnapshot`.
 */
export type CompletedHistoryLogPayload = Omit<ClassHistoryLog, 'id'> & {
  programSnapshot?: TeachingProgramSnapshot;
  sequenceSnapshot?: ClassSequenceSnapshot;
};

export interface BuildTeachingProgramSnapshotInput {
  sequenceId: string;
  sequenceTitle: string;
  sequenceSubtitle?: string;
  sourceKind: TeachingHistorySourceKind;
  sourceSequenceVersion?: number;
  sourceSequenceUpdatedAt?: string;
  sourceProvenance?: SequenceSourceProvenance;
  apparatus?: ApparatusType | 'mixed';
  level?: DifficultyLevel;
  targetMinutes?: number;
  taughtAt: string;
  capturedAt?: string;
  groupId: string;
  steps: SequenceStep[];
  exercises: PilatesExercise[];
  humanDrafts?: readonly HumanMovementDraft[];
  reusableBlocks?: readonly ReusableBlock[];
  actualDurationSec?: number;
  actualRestDurationSec?: number;
  criteriaSnapshot?: AutoGenerateCriteria;
}

export interface ResolveTeachingHistoryOptions {
  reusableBlocks?: readonly ReusableBlock[];
  humanDrafts?: readonly HumanMovementDraft[];
}

export interface ResolvedTeachingHistoryStepView {
  order: number;
  stepId: string;
  kind: 'exercise' | 'rest';
  exerciseId: string;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType | 'mixed';
  blockCategory: ClassBlockCategory;
  blockNameKo: string;
  blockNameEn: string;
  classSection: 'opening' | 'main' | 'ending';
  classSectionLabelKo: string;
  durationMin: number;
  explanationSec: number;
  transitionSec: number;
  movementSec: number;
  perSideSec?: number;
  selectedLayer: LayerMode;
  selectedLayerLabelKo: string;
  selectedLayerDescription: string;
  effectiveSprings: string;
  box?: BoxState;
  footbar?: FootbarState;
  headrest?: HeadrestState;
  props: PropType[];
  cues: string[];
  precautions: string;
  breathPattern: string;
  isUnilateral: boolean;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
  instructorNote?: string;
  locked?: boolean;
  blockInstanceId?: string;
  sourceBlockId?: string;
  sourceBlockVersion?: number;
  sourceBlockTitle?: string;
  blockInstanceDetached?: boolean;
  isBlockTemplateModified?: boolean;
  isBlockTemplateDeleted?: boolean;
  humanDraftId?: string;
  humanDraftRevision?: number;
  sourceOrigin?: 'catalog' | 'human-created';
  ideaLineSnapshot?: string;
  isHumanDraftModified?: boolean;
  isHumanDraftDeleted?: boolean;
  /** True when the exercise snapshot was preserved at completion time. */
  fromSnapshot: boolean;
  /** True when the live catalog exercise was later modified compared to the taught snapshot. */
  isCatalogModified: boolean;
  /** True when the live catalog exercise was later deleted, but snapshot is preserved. */
  isCatalogDeleted: boolean;
  /** True only when a legacy log has neither a snapshot nor a live catalog exercise. */
  isMissingUnrecoverable: boolean;
}

export interface ResolvedTeachingHistoryView {
  logId: string;
  recordKind: 'completed-history';
  sourceKind: TeachingHistorySourceKind;
  sourceSequenceId: string;
  sequenceTitle: string;
  sourceSubtitle: string;
  groupId: string;
  groupName: string;
  taughtAt: string;
  dateOnly?: boolean;
  apparatus: ApparatusType | 'mixed';
  level: DifficultyLevel;
  rating: 1 | 2 | 3 | 4 | 5;
  intensity: 'relaxed' | 'moderate' | 'intense';
  instructorReflection: string;
  timing: TeachingProgramTimingSnapshot;
  steps: ResolvedTeachingHistoryStepView[];
  blockSnapshots: ClassBlockSnapshot[];
  movementCount: number;
  restCount: number;
  hasPreservedSnapshot: boolean;
  hasCatalogDrift: boolean;
  modifiedExerciseIds: string[];
  deletedExerciseIds: string[];
  modifiedBlockIds: string[];
  deletedBlockIds: string[];
  modifiedHumanDraftIds: string[];
  deletedHumanDraftIds: string[];
  missingUnrecoverableExerciseIds: string[];
  sourceSequenceStatus: 'unchanged' | 'modified' | 'deleted' | 'draft-origin';
  sourceProvenance?: SequenceSourceProvenance;
  canCopyToNextClass: boolean;
}
