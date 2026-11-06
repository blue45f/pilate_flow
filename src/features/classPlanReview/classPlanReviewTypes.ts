import type {
  ClassSequenceSnapshot,
  HierarchyPilatesExercise,
  HumanMovementDraft,
  MovementSnapshot,
  ReusableBlock,
  ReusableBlockItem,
} from '../../types/hierarchy';
import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
  StepSideMode,
} from '../../types/pilates';
import type { OfflineBlockPreset, OfflineClassPreset } from '../../types/classBlockPresets';
import type { ClassSectionRole } from '../../types/sequenceMotion';
import type { StepTimeEstimate } from '../../schemas/stepTimeEstimate';

/**
 * Finite upper bounds for defensive parsing of untrusted, corrupted, or extreme inputs.
 */
export const CLASS_PLAN_REVIEW_LIMITS = Object.freeze({
  MAX_ITEMS: 1000,
  MAX_NESTING_DEPTH: 16,
  MAX_TARGET_MINUTES: 300,
  MIN_TARGET_MINUTES: 1,
  MAX_ITEM_DURATION_MIN: 120,
  MAX_SUB_DURATION_SEC: 7200,
  MAX_REPETITIONS: 1000,
  MAX_SETS: 100,
});

/**
 * Epistemic & non-prescription boundary contract.
 * Explicitly guarantees that class plan review is a factual scheduling & timing check only,
 * never a medical/rehab prescription, physical load measurement, or safety guarantee.
 */
export interface ClassPlanReviewBoundary {
  readonly reviewScope: 'local-schedule-and-timing-facts';
  readonly exercisePrescriptionClaimed: false;
  readonly efficacyOrSafetyGuaranteed: false;
  readonly sideBalanceMeansSafety: false;
  readonly externalApiOrHealthDataUsed: false;
  readonly disclaimerKo: string;
}

export const DEFAULT_CLASS_PLAN_REVIEW_BOUNDARY: ClassPlanReviewBoundary = Object.freeze({
  reviewScope: 'local-schedule-and-timing-facts',
  exercisePrescriptionClaimed: false,
  efficacyOrSafetyGuaranteed: false,
  sideBalanceMeansSafety: false,
  externalApiOrHealthDataUsed: false,
  disclaimerKo:
    '이 검토 결과는 강사가 작성한 수업 시간·휴식·전환과 좌우 편성 기록을 사실대로 정리한 참고 자료이며, 운동 처방이나 신체적 효과·안전을 보증하지 않습니다.',
});

/**
 * Supported origin kinds for each normalized review item.
 */
export type ReviewItemSourceKind =
  | 'catalog-exercise'
  | 'human-draft'
  | 'name-only-draft'
  | 'reusable-block-item'
  | 'rest'
  | 'unknown-exercise';

/**
 * Duration availability state for an item.
 * - 'known': explicit finite positive duration was provided (or derived from a valid StepTimeEstimate when durationMin was omitted)
 * - 'unspecified': no duration was entered yet (never faked as 0 seconds)
 * - 'invalid': negative, NaN, Infinity, 0, or out-of-bounds duration was found
 */
export type ReviewItemDurationStatus = 'known' | 'unspecified' | 'invalid';

/**
 * Factual laterality state for an item.
 * - 'left': explicitly set to left only ('left')
 * - 'right': explicitly set to right only ('right')
 * - 'both-sequential': sequential left and right in one item ('left-then-right' or 'right-then-left', or catalog unilateral default with 2 sides)
 * - 'together': simultaneous bilateral ('together' or catalog non-unilateral default)
 * - 'unknown': side mode and unilateral metadata are both absent (e.g. name-only creative draft or unresolved exercise), or invalid sideMode
 * - 'not-applicable': rest step
 */
export type ReviewItemLateralityStatus =
  'left' | 'right' | 'both-sequential' | 'together' | 'unknown' | 'not-applicable';

/**
 * Minimal name-only or partial creative movement draft input.
 * Does NOT require blockCategory, anatomy, spinalPlanes, precautions, apparatus, or health info.
 */
export interface NameOnlyCreativeDraftInput {
  readonly id?: string;
  readonly itemId?: string;
  readonly stepId?: string;
  readonly nameKo?: string;
  readonly workingNameKo?: string;
  readonly ideaLine?: string;
  readonly title?: string;
  readonly kind?: 'exercise' | 'rest' | 'draft';
  readonly durationMin?: number | null;
  readonly explanationSec?: number | null;
  readonly transitionSec?: number | null;
  readonly repetitions?: number | null;
  readonly sets?: number | null;
  readonly sideMode?: StepSideMode | string | null;
  readonly isUnilateral?: boolean | null;
  readonly apparatus?: ApparatusType | string | null;
  readonly blockCategory?: ClassBlockCategory | string | null;
  readonly classSection?: ClassSectionRole | string | null;
  readonly selectedLayer?: LayerMode | string | null;
  readonly timeEstimate?: StepTimeEstimate | unknown;
  readonly exerciseId?: string;
  readonly humanDraftId?: string;
  readonly exerciseSnapshot?: MovementSnapshot;
  readonly instructorNote?: string;
}

/**
 * Nested block or group container accepted by the adapter.
 */
export interface NestedReviewContainerInput {
  readonly id?: string;
  readonly blockId?: string;
  readonly blockInstanceId?: string;
  readonly title?: string;
  readonly sectionRole?: ClassSectionRole;
  readonly items?: readonly unknown[];
  readonly steps?: readonly unknown[];
  readonly blocks?: readonly unknown[];
  readonly children?: readonly unknown[];
}

/**
 * Flexible input accepted by `adaptClassPlanForReview` and `reviewClassPlan`.
 */
export type ClassPlanReviewSourceInput =
  | SavedSequence
  | ClassSequenceSnapshot
  | OfflineClassPreset
  | ReusableBlock
  | OfflineBlockPreset
  | readonly (SequenceStep | ReusableBlockItem | NameOnlyCreativeDraftInput | unknown)[]
  | {
      readonly id?: string;
      readonly title?: string;
      readonly subtitle?: string;
      readonly targetMinutes?: number | null;
      readonly durationMinutes?: number | null;
      readonly durationMin?: number | null;
      readonly apparatus?: ApparatusType | 'mixed' | string;
      readonly level?: DifficultyLevel | string;
      readonly steps?: readonly unknown[];
      readonly items?: readonly unknown[];
      readonly blocks?: readonly unknown[];
      readonly exercises?: readonly (PilatesExercise | HierarchyPilatesExercise)[];
      readonly humanDrafts?: readonly HumanMovementDraft[];
      readonly exerciseSnapshots?: Readonly<Record<string, MovementSnapshot>>;
    };

export interface ClassPlanReviewOptions {
  readonly targetMinutes?: number | null;
  readonly exercises?: readonly (PilatesExercise | HierarchyPilatesExercise)[];
  readonly humanDrafts?: readonly HumanMovementDraft[];
  readonly maxItems?: number;
  readonly maxNestingDepth?: number;
}

/**
 * Diagnostic codes for adapter/input anomalies and review findings.
 */
export type ClassPlanReviewIssueCode =
  | 'empty-class-plan'
  | 'target-duration-unspecified'
  | 'target-duration-difference'
  | 'unspecified-item-duration'
  | 'invalid-item-duration'
  | 'invalid-sub-duration'
  | 'invalid-target-duration'
  | 'rest-duration-invalid'
  | 'rest-exceeds-target'
  | 'equipment-transition-short'
  | 'laterality-unpaired-side'
  | 'laterality-time-difference'
  | 'laterality-reps-or-sets-difference'
  | 'laterality-unilateral-together-mismatch'
  | 'laterality-unknown-items-present'
  | 'creative-draft-optional-fields-unset'
  | 'unknown-catalog-exercise'
  | 'invalid-repetition-or-set'
  | 'invalid-side-mode'
  | 'duplicate-or-missing-item-id'
  | 'circular-reference-detected'
  | 'max-nesting-depth-exceeded'
  | 'max-item-count-exceeded'
  | 'max-input-scan-exceeded'
  | 'malformed-item-skipped';

export type ClassPlanReviewIssueCategory =
  'timing' | 'laterality' | 'draft-info' | 'input-diagnostic';

export type ClassPlanReviewIssueSeverity = 'info' | 'notice' | 'warning' | 'diagnostic';

/**
 * Structured review issue linked to stable item IDs with easy-to-read Korean copy.
 */
export interface ClassPlanReviewIssue {
  readonly id: string;
  readonly code: ClassPlanReviewIssueCode;
  readonly category: ClassPlanReviewIssueCategory;
  readonly severity: ClassPlanReviewIssueSeverity;
  /** Stable item IDs (`stepId` / `itemId` / fallback ID) associated with this finding. */
  readonly itemIds: readonly string[];
  /** Zero-based indices in `normalizedPlan.items` associated with this finding. */
  readonly itemIndices: readonly number[];
  readonly titleKo: string;
  readonly messageKo: string;
  readonly factualDetailKo?: string;
}

/**
 * Normalized single item produced by the read-only adapter and enriched by the analyzer.
 */
export interface NormalizedClassReviewItem {
  /** Stable item identifier (`stepId`, `itemId`, `draft.id`, or deterministic fallback). */
  readonly itemId: string;
  /** Whether the original item had a valid unique ID or required a deterministic fallback. */
  readonly itemIdWasGenerated: boolean;
  readonly index: number;
  readonly order: number;
  readonly kind: 'exercise' | 'rest';
  readonly sourceKind: ReviewItemSourceKind;
  readonly displayNameKo: string;
  readonly exerciseId?: string;
  readonly humanDraftId?: string;
  readonly blockInstanceId?: string;
  readonly sourceBlockId?: string;
  readonly sourceBlockTitle?: string;
  readonly sectionRole?: ClassSectionRole;
  readonly blockCategory?: ClassBlockCategory;
  readonly apparatus?: ApparatusType;
  readonly isNameOnlyDraft: boolean;
  readonly isHumanCreated: boolean;

  // --- Raw & Normalized Timing ---
  readonly durationStatus: ReviewItemDurationStatus;
  readonly rawDurationMin: unknown;
  /** Known total seconds for this item, or `null` when durationStatus !== 'known'. Never faked as 0! */
  readonly knownTotalSec: number | null;
  readonly knownMovementSec: number | null;
  readonly knownExplanationSec: number | null;
  readonly knownTransitionSec: number | null;
  readonly knownRestSec: number | null;
  readonly knownPerSideSec: number | null;
  readonly usedTimeEstimateFallback: boolean;

  // --- Repetitions & Sets ---
  readonly repetitions: number | null;
  readonly sets: number | null;
  readonly hasInvalidRepetitionOrSet: boolean;
  readonly rawRepetitions: unknown;
  readonly rawSets: unknown;

  // --- Laterality ---
  readonly lateralityStatus: ReviewItemLateralityStatus;
  readonly sideMode?: StepSideMode;
  readonly rawSideMode: unknown;
  readonly isUnilateral: boolean | null;
  readonly sideLabelsKo: readonly string[];
  readonly movementKey: string;

  // --- Diagnostics specific to this item ---
  readonly itemIssueCodes: readonly ClassPlanReviewIssueCode[];
}

/**
 * Normalized read-only class plan representation produced by the adapter.
 */
export interface NormalizedClassReviewPlan {
  readonly planId: string;
  readonly title: string;
  readonly sourceModelKind:
    | 'saved-sequence'
    | 'class-snapshot'
    | 'class-preset'
    | 'reusable-block'
    | 'step-array'
    | 'composite-object'
    | 'corrupted-input';
  readonly targetMinutes: number | null;
  readonly targetDurationStatus: 'known' | 'unspecified' | 'invalid';
  readonly rawTargetMinutes: unknown;
  readonly items: readonly NormalizedClassReviewItem[];
  readonly adapterIssues: readonly ClassPlanReviewIssue[];
  readonly stats: {
    readonly totalRawItemsSeen: number;
    readonly scannedInputCount: number;
    readonly truncatedByScanLimit: boolean;
    readonly normalizedItemCount: number;
    readonly skippedMalformedCount: number;
    readonly truncatedByMaxItems: boolean;
    readonly maxDepthReached: number;
    readonly circularReferenceCount: number;
  };
}

/**
 * Complete timing summary distinguishing known totals from unspecified/invalid items.
 */
export interface ClassPlanTimeReviewSummary {
  /** Sum of known item durations in seconds (movement + explanation + transition + rest). */
  readonly knownTotalSec: number;
  readonly knownTotalMinutes: number;
  readonly knownExerciseSec: number;
  readonly knownMovementSec: number;
  readonly knownExplanationSec: number;
  readonly knownTransitionSec: number;
  readonly knownRestSec: number;

  /** Target duration in seconds (`null` when targetMinutes is unspecified or invalid). */
  readonly targetSec: number | null;
  readonly targetMinutes: number | null;
  readonly targetDurationStatus: 'known' | 'unspecified' | 'invalid';

  /**
   * Difference between knownTotalSec and targetSec (`knownTotalSec - targetSec`),
   * or `null` if targetSec is unspecified/invalid.
   */
  readonly knownDeltaSec: number | null;
  /** True only when target is known, all items have known durations, and |knownDeltaSec| === 0. */
  readonly exactTargetMatch: boolean;
  /** True when time is unspecified/invalid or input structure was omitted, truncated or could not be traversed. */
  readonly isPartialTotal: boolean;

  readonly knownTimeItemCount: number;
  readonly unspecifiedTimeItemCount: number;
  readonly unspecifiedTimeItemIds: readonly string[];
  readonly invalidTimeItemCount: number;
  readonly invalidTimeItemIds: readonly string[];

  readonly sectionKnownSec: {
    readonly preparationSec: number;
    readonly mainSec: number;
    readonly cooldownSec: number;
    readonly restSec: number;
    readonly unspecifiedSectionSec: number;
  };

  /** Easy-to-read Korean summary of total time, target comparison, and missing time items. */
  readonly headlineKo: string;
  readonly detailNoteKo: string;
}

/**
 * Factual comparison of a movement group that has split left/right items.
 */
export interface LateralityMovementGroupComparison {
  readonly movementKey: string;
  readonly displayNameKo: string;
  readonly leftItemIds: readonly string[];
  readonly rightItemIds: readonly string[];
  readonly leftCount: number;
  readonly rightCount: number;
  readonly knownLeftMovementSec: number;
  readonly knownRightMovementSec: number;
  readonly hasUnspecifiedTimeOnLeftOrRight: boolean;
  readonly countMatched: boolean;
  readonly timeMatched: boolean;
  readonly repsAndSetsMatched: boolean;
  readonly statusSummaryKo: string;
}

/**
 * Factual summary of left/right/both/unknown organization across the class plan.
 * Strictly avoids arbitrary classification or claiming that equal time means physical safety.
 */
export interface ClassPlanLateralityReviewSummary {
  readonly explicitLeftItemCount: number;
  readonly explicitRightItemCount: number;
  readonly bothSequentialItemCount: number;
  readonly togetherItemCount: number;
  readonly unknownLateralityItemCount: number;
  readonly unknownLateralityItemIds: readonly string[];
  readonly unilateralTogetherMismatchItemIds: readonly string[];

  /** Known movement seconds by factual side assignment. */
  readonly knownLeftMovementSec: number;
  readonly knownRightMovementSec: number;
  readonly knownTogetherMovementSec: number;
  readonly knownUnknownSideMovementSec: number;
  /** Difference `knownLeftMovementSec - knownRightMovementSec` across explicit sides. */
  readonly knownLeftRightDiffSec: number;

  readonly splitMovementComparisons: readonly LateralityMovementGroupComparison[];
  readonly unpairedLeftItemIds: readonly string[];
  readonly unpairedRightItemIds: readonly string[];
  readonly imbalancedMovementGroupKeys: readonly string[];

  readonly headlineKo: string;
  readonly cautionNoteKo: string;
}

/**
 * Parity check result against existing read-only sequence timing utilities.
 */
export interface ExistingUtilityParityCheck {
  readonly checked: boolean;
  readonly stepTimingMatches: boolean;
  readonly sequenceDurationsMatches: boolean;
  readonly planInsightsSidesMatches: boolean;
}

/**
 * Top-level immutable review report returned by `reviewClassPlan`.
 */
export interface ClassPlanReviewReport {
  readonly boundary: ClassPlanReviewBoundary;
  readonly plan: NormalizedClassReviewPlan;
  readonly timing: ClassPlanTimeReviewSummary;
  readonly laterality: ClassPlanLateralityReviewSummary;
  readonly issues: readonly ClassPlanReviewIssue[];
  readonly counts: {
    readonly totalItems: number;
    readonly exerciseItems: number;
    readonly restItems: number;
    readonly creativeDraftItems: number;
    readonly nameOnlyDraftItems: number;
    readonly issueCount: number;
  };
  readonly parity: ExistingUtilityParityCheck;
  readonly summaryHeadlineKo: string;
}
