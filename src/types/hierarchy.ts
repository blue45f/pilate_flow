import type {
  ApparatusType,
  BodyPosition,
  BoxState,
  ClassBlockCategory,
  DifficultyLevel,
  ExerciseLayers,
  FootbarState,
  HeadrestState,
  LayerMode,
  PilatesExercise,
  PropType,
  SequenceStep,
  SpinalPlane,
  StepSideMode,
} from './pilates';
import type { ClassSectionRole } from './sequenceMotion';

export interface HierarchyPilatesExercise extends PilatesExercise {
  defaultRepetitions?: number;
  defaultSets?: number;
  humanDraftId?: string;
  humanDraftRevision?: number;
}

declare module './pilates' {

  interface SequenceStep {
    blockInstanceId?: string;
    sourceBlockId?: string;
    sourceBlockVersion?: number;
    sourceBlockTitle?: string;
    blockInstanceDetached?: boolean;
    exerciseSnapshot?: MovementSnapshot;
    humanDraftId?: string;
    humanDraftRevision?: number;
  }

  interface SavedSequence {
    version?: number;
    sourceProvenance?: SequenceSourceProvenance;
    focusTags: readonly string[];
    taughtCount: number;
  }

  interface ClassHistoryLog {
    sequenceSnapshot?: ClassSequenceSnapshot;
    sourceProvenance?: SequenceSourceProvenance;
  }
}

/**
 * Epistemic & Safety Boundary Metadata
 * Distinguishes subjective instructor feel from objective efficacy or AI/expert safety guarantees.
 */
export interface MovementSafetyAndEfficacyBoundary {
  originType: 'instructor-created-draft' | 'catalog-reference';
  evaluationBasis: 'subjective-instructor-feel' | 'catalog-metadata';
  aiSafetyGuaranteed: false;
  objectiveEfficacyClaimed: false;
  expertVerified: false;
  disclaimerKo: string;
}

/**
 * Subjective Feel Log (직접 시도한 뒤 느낀 점 — 주관적 체감 기록)
 */
export interface SubjectiveFeelLog {
  id: string;
  recordedAt: string;
  feelNoteKo: string;
  perceivedIntensity?: 'gentle' | 'moderate' | 'challenging';
  cautionFeelKo?: string;
  evaluationBasis: 'subjective-instructor-feel';
  objectiveEfficacyClaimed: false;
  safetyGuaranteed: false;
  expertVerified: false;
}

/**
 * Draft Modification Log (직접 해본 뒤 기록하는 수정할 점)
 */
export interface DraftModificationLog {
  id: string;
  recordedAt: string;
  modificationPointKo: string;
  setupOrSpringChangeKo?: string;
  cueChangeKo?: string;
  appliedToRevision?: number;
}

/**
 * Draft Photo Reference (선택적 사진 참조 — 로컬/내부 참조 전용, 외부 AI 전송 금지)
 */
export interface DraftPhotoReference {
  id: string;
  localRefUri: string;
  captionKo?: string;
  angleTag?: 'setup' | 'start-pose' | 'end-pose' | 'modification';
  capturedAt: string;
  externalAiUploadAllowed: false;
}

/**
 * Human Movement Draft State Content (수정 이력 스냅샷 및 현재 상태 공통 필드)
 */
export interface HumanMovementDraftContent {
  ideaLine: string;
  workingNameKo?: string;
  apparatus?: ApparatusType;
  requiredEquipment?: readonly string[];
  props?: readonly PropType[];
  blockCategory?: ClassBlockCategory;
  sectionRole?: ClassSectionRole;
  level?: DifficultyLevel;
  defaultDurationMin?: number;
  defaultRepetitions?: number;
  defaultSets?: number;
  isUnilateral?: boolean;
  sideMode?: StepSideMode;
  springs?: string;
  box?: BoxState;
  footbar?: FootbarState;
  headrest?: HeadrestState;
  bodyPosition?: BodyPosition;
  spinalPlanes?: readonly SpinalPlane[];
  targetMuscles?: readonly string[];
  breathPattern?: string;
  cues?: readonly string[];
  precautions?: string;
  layers?: Partial<ExerciseLayers>;
  parentDraftId?: string;
  parentDraftRevision?: number;
  variantLabelKo?: string;
  feelLogs: readonly SubjectiveFeelLog[];
  modificationLogs: readonly DraftModificationLog[];
  photoReferences: readonly DraftPhotoReference[];
}

export type DraftRevisionChangeType =
  | 'initial-idea'
  | 'idea-updated'
  | 'feel-added'
  | 'modification-added'
  | 'photo-added'
  | 'metadata-refined'
  | 'variant-updated'
  | 'variant-branched'
  | 'restored-revision';

export interface DraftRevisionEntry {
  revision: number;
  parentRevision?: number;
  savedAt: string;
  changeType: DraftRevisionChangeType;
  summaryKo: string;
  contentSnapshot: HumanMovementDraftContent;
}

export type HumanDraftCompletenessStage = 'idea-only' | 'practiced-recorded' | 'class-ready';

/**
 * Human-Created Incomplete Movement Draft (사람이 만든 미완성 새 동작 초안)
 * Only `ideaLine` is required to save; classification, anatomy, equipment, duration, and L/R are all optional.
 */
export interface HumanMovementDraft extends HumanMovementDraftContent {
  id: string;
  sourceOrigin: 'human-created';
  completenessStage: HumanDraftCompletenessStage;
  revision: number;
  revisionHistory: readonly DraftRevisionEntry[];
  safetyBoundary: MovementSafetyAndEfficacyBoundary;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deferred Stage Readiness Evaluation (후속 단계별 안내 및 수업 연결 검증)
 */
export type DraftUsageStage = 'idea-save' | 'block-link' | 'sequence-link' | 'class-confirm';

export interface DraftClassLinkOverrides {
  workingNameKo?: string;
  apparatus?: ApparatusType;
  sectionRole?: ClassSectionRole;
  blockCategory?: ClassBlockCategory;
  level?: DifficultyLevel;
  durationMin?: number;
  repetitions?: number;
  sets?: number;
  isUnilateral?: boolean;
  sideMode?: StepSideMode;
  selectedLayer?: LayerMode;
  springs?: string;
  instructorNote?: string;
}

export interface DraftStageReadinessResult {
  stage: DraftUsageStage;
  canSaveIdeaDraft: true;
  canLinkDirectly: boolean;
  canLinkWithFallbacks: boolean;
  missingRecommendedFields: Array<'apparatus' | 'durationMin' | 'sectionRole' | 'sideMode'>;
  guidanceNoticesKo: string[];
  resolvedExercise: {
    id: string;
    nameKo: string;
    apparatus: ApparatusType;
    sectionRole: ClassSectionRole;
    blockCategory: ClassBlockCategory;
    level: DifficultyLevel;
    durationMin: number;
    repetitions?: number;
    sets?: number;
    isUnilateral: boolean;
    sideMode: StepSideMode;
    selectedLayer: LayerMode;
  };
  safetyBoundary: MovementSafetyAndEfficacyBoundary;
}

/**
 * Preserved Unsaved Input State on Failure (저장·검증·스토리지 실패 시 입력 보존 계약)
 */
export interface PreservedCreationInputState {
  draftId?: string;
  ideaLine?: string;
  workingNameKo?: string;
  pendingFeelNoteKo?: string;
  pendingModificationPointKo?: string;
  pendingPhotoUri?: string;
  pendingOverrides?: DraftClassLinkOverrides;
  failedAt: string;
  reasonKo: string;
}

/**
 * Tier 1: Movement (동작) — Normalized unit summary & immutable snapshot
 */
export interface MovementUnitSummary {
  id: string;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType;
  requiredEquipment: string[];
  defaultDurationMin: number;
  defaultRepetitions: number;
  defaultSets: number;
  isUnilateral: boolean;
  level: DifficultyLevel;
  blockCategory: ClassBlockCategory;
  sectionRole: ClassSectionRole;
  props: PropType[];
  springs: string;
  isApproved: boolean;
  sourceOrigin?: 'catalog' | 'human-created';
  humanDraftRevision?: number;
}

export interface MovementSnapshot {
  id: string;
  nameKo: string;
  nameEn: string;
  apparatus: ApparatusType;
  requiredEquipment?: readonly string[];
  movementFamily?: string;
  blockCategory: ClassBlockCategory;
  level: DifficultyLevel;
  defaultDurationMin: number;
  defaultRepetitions?: number;
  defaultSets?: number;
  isUnilateral: boolean;
  springs: string;
  box: BoxState;
  footbar: FootbarState;
  headrest: HeadrestState;
  props: readonly PropType[];
  spinalPlanes: readonly SpinalPlane[];
  bodyPosition: BodyPosition;
  targetMuscles: readonly string[];
  breathPattern: string;
  cues: readonly string[];
  precautions: string;
  layers: ExerciseLayers;
  capturedAt: string;
  sourceOrigin?: 'catalog' | 'human-created';
  humanDraftId?: string;
  humanDraftRevision?: number;
  parentDraftId?: string;
  parentDraftRevision?: number;
  variantLabelKo?: string;
  ideaLineSnapshot?: string;
  feelLogsSnapshot?: readonly SubjectiveFeelLog[];
  modificationLogsSnapshot?: readonly DraftModificationLog[];
  photoReferencesSnapshot?: readonly DraftPhotoReference[];
  safetyBoundarySnapshot?: MovementSafetyAndEfficacyBoundary;
}

/**
 * Tier 2: Reusable Block (재사용 블록) — Multi-movement ordered template & sequence instance metadata
 */
export interface ReusableBlockItem {
  itemId: string;
  order: number;
  exerciseId: string;
  blockCategory: ClassBlockCategory;
  durationMin: number;
  explanationSec?: number;
  transitionSec?: number;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
  selectedLayer: LayerMode;
  customSpringOverride?: string;
  instructorNote?: string;
  exerciseSnapshot?: MovementSnapshot;
  humanDraftId?: string;
  humanDraftRevision?: number;
}

export interface ReusableBlock {
  id: string;
  title: string;
  description?: string;
  sectionRole: ClassSectionRole;
  apparatus: ApparatusType | 'mixed';
  level: DifficultyLevel;
  items: ReusableBlockItem[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceBlockInstanceMeta {
  blockInstanceId?: string;
  sourceBlockId?: string;
  sourceBlockVersion?: number;
  sourceBlockTitle?: string;
  blockInstanceDetached?: boolean;
  exerciseSnapshot?: MovementSnapshot;
  humanDraftId?: string;
  humanDraftRevision?: number;
}

/**
 * Tier 3: Sequence (시퀀스) — Timing breakdown, apparatus transition, & multi-rule validation
 */
export interface SequenceSectionBreakdown {
  preparationSec: number;
  mainSec: number;
  cooldownSec: number;
  restSec: number;
}

export interface ApparatusTransitionDetail {
  fromStepIndex: number;
  toStepIndex: number;
  fromExerciseId: string;
  toExerciseId: string;
  apparatusChanged: boolean;
  equipmentChanged: boolean;
  boxChanged: boolean;
  springChanged: boolean;
  positionChanged: boolean;
  recommendedTransitionSec: number;
  configuredTransitionSec: number;
}

export interface SequenceTimeBreakdown {
  movementSec: number;
  explanationSec: number;
  transitionSec: number;
  restSec: number;
  exerciseSec: number;
  totalSec: number;
  totalMinutes: number;
  targetSec: number;
  targetMinutes: number;
  deltaSec: number;
  recommendedAdditionalTransitionSec: number;
  effectiveTotalWithRecommendedTransitionSec: number;
  sectionDurations: SequenceSectionBreakdown;
  transitions: ApparatusTransitionDetail[];
}

export type SequenceValidationCategory =
  | 'timing'
  | 'side-balance'
  | 'difficulty-flow'
  | 'duplicate'
  | 'equipment-constraint'
  | 'personal-constraint'
  | 'draft-readiness';

export type SequenceValidationSeverity = 'error' | 'warning';

export interface SequenceValidationIssue {
  code:
    | 'empty-sequence'
    | 'unknown-exercise'
    | 'target-duration-mismatch'
    | 'rest-budget-exceeded'
    | 'transition-underbudgeted'
    | 'unilateral-missing-pair'
    | 'unilateral-duration-imbalance'
    | 'unilateral-reps-imbalance'
    | 'unilateral-bilateral-mode-mismatch'
    | 'missing-preparation'
    | 'missing-cooldown'
    | 'section-order-inverted'
    | 'warmup-difficulty-spike'
    | 'cooldown-difficulty-high'
    | 'abrupt-level-jump'
    | 'level-exceeds-target'
    | 'duplicate-movement'
    | 'equipment-mismatch'
    | 'equipment-coverage-missing'
    | 'prop-mismatch'
    | 'local-precaution-warning'
    | 'draft-metadata-guidance';
  category: SequenceValidationCategory;
  severity: SequenceValidationSeverity;
  messageKo: string;
  stepIndices: number[];
  exerciseIds?: string[];
  fixable: boolean;
}

export interface LocalPersonalConstraint {
  avoidSpinalPlanes?: SpinalPlane[];
  avoidBodyPositions?: BodyPosition[];
  precautionKeywords?: string[];
  maxLevel?: DifficultyLevel;
  preferEasyLayer?: boolean;
}

export interface SequenceValidationReport {
  valid: boolean;
  canConfirmClass: boolean;
  timeBreakdown: SequenceTimeBreakdown;
  issues: SequenceValidationIssue[];
  sideBalanceSummary: {
    unilateralStepCount: number;
    balancedCount: number;
    unpairedLeftIds: string[];
    unpairedRightIds: string[];
    imbalancedExerciseIds: string[];
  };
  difficultyFlowSummary: {
    hasPreparation: boolean;
    hasMain: boolean;
    hasCooldown: boolean;
    sectionOrderValid: boolean;
    preparationAvgScore: number;
    mainAvgScore: number;
    cooldownAvgScore: number;
  };
  duplicateExerciseIds: string[];
  violatedEquipmentIds: string[];
}

/**
 * Tier 4: Class / Lesson (수업) — Immutable version snapshot & clone provenance
 */
export type SequenceProvenanceKind =
  | 'history-snapshot'
  | 'dated-plan-snapshot'
  | 'saved-sequence-clone'
  | 'ai-draft'
  | 'manual';

export interface SequenceSourceProvenance {
  kind: SequenceProvenanceKind;
  sourceId: string;
  sourceTitle: string;
  sourceSequenceId?: string;
  sourceVersion?: number;
  sourceUpdatedAt?: string;
  sourceTaughtAt?: string;
  clonedAt: string;
  summaryKo: string;
}

export interface ClassBlockSnapshot {
  blockInstanceId: string;
  sourceBlockId: string;
  sourceBlockVersion: number;
  sourceBlockTitle: string;
  detached: boolean;
  stepIds: string[];
}

export interface ClassSequenceSnapshot {
  snapshotId: string;
  capturedAt: string;
  sourceSequenceId: string;
  sourceSequenceVersion: number;
  sourceSequenceUpdatedAt?: string;
  title: string;
  subtitle: string;
  apparatus: ApparatusType | 'mixed';
  level: DifficultyLevel;
  targetMinutes: number;
  steps: SequenceStep[];
  exerciseSnapshots: Record<string, MovementSnapshot>;
  blockSnapshots: ClassBlockSnapshot[];
  timeBreakdown: {
    movementSec: number;
    explanationSec: number;
    transitionSec: number;
    restSec: number;
    totalSec: number;
  };
  sourceProvenance?: SequenceSourceProvenance;
}
