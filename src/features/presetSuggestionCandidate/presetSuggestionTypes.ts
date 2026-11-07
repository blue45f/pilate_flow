import type {
  OfflineBlockPreset,
  OfflineClassPreset,
  PresetThemeId,
} from '../../types/classBlockPresets';
import type {
  MovementSnapshot,
  ReusableBlock,
  ReusableBlockItem,
} from '../../types/hierarchy';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  ClassHistoryLog,
  ConditionTemplate,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  PropType,
  SavedSequence,
  SequenceStep,
  StepSideMode,
} from '../../types/pilates';
import type { ClassSectionRole } from '../../types/sequenceMotion';
import type { StepTimeEstimate } from '../../schemas/stepTimeEstimate';

/**
 * Explicit upper and lower bounds enforced by the preset suggestion candidate module.
 * Matches existing contracts in `docs/PRESETS_AND_CLASS_TIME_CONTRACT.md` and `sequenceEngine.ts`:
 * - Target class duration: 10–120 minutes (600–7,200 seconds)
 * - Per-step / per-block duration estimate: 30 seconds–20 minutes (30–1,200 seconds)
 * - Minimum pure movement duration per exercise step: 30 seconds (and >= 15 seconds per side when bilateral sequential)
 * - Minimum equipment-change transition allowance: 30 seconds (default 45 seconds when equipment changes, 15 seconds on same equipment)
 * - Maximum normalized items: 1,000
 * - Maximum nesting depth for containers: 16
 * - Maximum raw container/item nodes scanned: 10,000
 */
export const PRESET_SUGGESTION_LIMITS = Object.freeze({
  MAX_RAW_SCAN_NODES: 10_000,
  MAX_ITEMS: 1_000,
  MAX_NESTING_DEPTH: 16,
  MIN_TARGET_MINUTES: 10,
  MAX_TARGET_MINUTES: 120,
  MIN_STEP_TOTAL_SEC: 30,
  MAX_STEP_TOTAL_SEC: 1_200,
  MIN_MOVEMENT_SEC: 30,
  MIN_PER_SIDE_SEC: 15,
  MIN_ADJUSTABLE_STEP_FLOOR_SEC: 60,
  MIN_EQUIPMENT_CHANGE_TRANSITION_SEC: 30,
  DEFAULT_SAME_EQUIPMENT_TRANSITION_SEC: 15,
  DEFAULT_CHANGED_EQUIPMENT_TRANSITION_SEC: 45,
  DEFAULT_EXPLANATION_SEC: 20,
  MAX_SUGGESTION_CANDIDATES: 5,
  MAX_REPETITIONS: 1_000,
  MAX_SETS: 100,
});

/**
 * Epistemic, Non-AI, Non-Clinical, and Editable Draft Truthfulness Boundary.
 * Explicitly forbids claiming AI generation, clinical safety, medical/rehab efficacy,
 * anatomical verification completion, or newly invented exercises/evidence/angles.
 */
export interface PresetSuggestionTruthBoundary {
  readonly moduleScope: 'deterministic-catalog-preset-suggestion-candidate';
  readonly aiUsed: false;
  readonly isAiGenerated: false;
  readonly clinicalSafetyGuaranteed: false;
  readonly medicalOrRehabEfficacyClaimed: false;
  readonly anatomicalVerificationCompleted: false;
  readonly expertClinicalVerified: false;
  readonly newMovementInvented: false;
  readonly newEvidenceOrAngleInvented: false;
  readonly catalogIdsOnly: true;
  readonly isEditableDraft: true;
  readonly disclaimerKo: string;
}

export const DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY: PresetSuggestionTruthBoundary =
  Object.freeze({
    moduleScope: 'deterministic-catalog-preset-suggestion-candidate',
    aiUsed: false,
    isAiGenerated: false,
    clinicalSafetyGuaranteed: false,
    medicalOrRehabEfficacyClaimed: false,
    anatomicalVerificationCompleted: false,
    expertClinicalVerified: false,
    newMovementInvented: false,
    newEvidenceOrAngleInvented: false,
    catalogIdsOnly: true,
    isEditableDraft: true,
    disclaimerKo:
      '이 추천 결과는 AI 생성이나 임상·해부학 검증을 거친 처방이 아니며, 기존 카탈로그의 검증 가능한 동작 ID만 규칙 기반으로 조합한 편집용 초안입니다. 동작·근거·관절 각도를 새로 만들어내지 않으며, 수업 적용 전 강사가 대상자 상태와 기구 세팅·시간을 직접 확인하고 수정해야 합니다.',
  });

/**
 * Explicit issue / boundary / impossibility diagnostic codes.
 * Covers all 6 required families:
 * 1. Nested cycle / depth (`nested-cycle-detected`, `max-nesting-depth-exceeded`)
 * 2. Unknown / missing IDs (`unknown-exercise-id`, `unverifiable-catalog-exercise`, `unknown-equipment-id`)
 * 3. Unilateral timing (`unilateral-together-mismatch`, `unilateral-per-side-too-short`, `unilateral-split-imbalance`, `unilateral-time-estimate-mismatch`)
 * 4. Rest time (`rest-duration-invalid`, `rest-exceeds-or-equals-target`, `rest-leaves-insufficient-exercise-time`, `rest-step-malformed`)
 * 5. Upper bounds (`max-input-scan-exceeded`, `max-item-count-exceeded`, `step-duration-out-of-bounds`, `time-estimate-out-of-bounds`, `invalid-repetition-or-set`, `invalid-side-mode`, `malformed-item-skipped`, `duplicate-or-missing-step-id`)
 * 6. Target time impossible (`target-duration-out-of-bounds`, `locked-steps-exceed-target`, `all-steps-locked-time-mismatch`, `minimum-step-duration-exceeds-target`, `maximum-step-cap-cannot-reach-target`, `insufficient-verifiable-catalog-movements`)
 */
export type PresetSuggestionIssueCode =
  // 1. Nested cycle & container depth
  | 'nested-cycle-detected'
  | 'max-nesting-depth-exceeded'
  // 2. Missing / unknown / unverifiable IDs
  | 'unknown-exercise-id'
  | 'unverifiable-catalog-exercise'
  | 'unknown-equipment-id'
  // 3. Unilateral timing & balance
  | 'unilateral-together-mismatch'
  | 'unilateral-per-side-too-short'
  | 'unilateral-split-imbalance'
  | 'unilateral-time-estimate-mismatch'
  // 4. Rest time constraints
  | 'rest-duration-invalid'
  | 'rest-exceeds-or-equals-target'
  | 'rest-leaves-insufficient-exercise-time'
  | 'rest-step-malformed'
  // 5. Upper bounds & input hygiene
  | 'max-input-scan-exceeded'
  | 'max-item-count-exceeded'
  | 'step-duration-out-of-bounds'
  | 'time-estimate-out-of-bounds'
  | 'invalid-repetition-or-set'
  | 'invalid-side-mode'
  | 'malformed-item-skipped'
  | 'duplicate-or-missing-step-id'
  // 6. Target time impossibility conditions
  | 'target-duration-out-of-bounds'
  | 'locked-steps-exceed-target'
  | 'all-steps-locked-time-mismatch'
  | 'minimum-step-duration-exceeds-target'
  | 'maximum-step-cap-cannot-reach-target'
  | 'insufficient-verifiable-catalog-movements';

export type PresetSuggestionIssueCategory =
  | 'cycle-and-bounds'
  | 'unknown-id'
  | 'unilateral-timing'
  | 'rest-budget'
  | 'target-impossibility';

export type PresetSuggestionIssueSeverity = 'info' | 'notice' | 'warning' | 'blocking';

export interface PresetSuggestionIssue {
  readonly id: string;
  readonly code: PresetSuggestionIssueCode;
  readonly category: PresetSuggestionIssueCategory;
  readonly severity: PresetSuggestionIssueSeverity;
  readonly blocking: boolean;
  readonly stepIds: readonly string[];
  readonly stepIndices: readonly number[];
  readonly relatedExerciseIds: readonly string[];
  readonly titleKo: string;
  readonly messageKo: string;
  readonly detailKo?: string;
}

/**
 * Specific mathematical/domain reason why the requested target duration cannot be met.
 */
export type TargetTimeImpossibilityReason =
  | 'target-duration-out-of-bounds'
  | 'unknown-equipment-id'
  | 'rest-duration-invalid'
  | 'rest-exceeds-or-equals-target'
  | 'rest-leaves-insufficient-exercise-time'
  | 'locked-step-has-unknown-or-incompatible-exercise'
  | 'locked-steps-exceed-target'
  | 'all-steps-locked-time-mismatch'
  | 'minimum-step-duration-exceeds-target'
  | 'maximum-step-cap-cannot-reach-target'
  | 'insufficient-verifiable-catalog-movements';

export interface TargetFeasibilityReport {
  readonly feasible: boolean;
  readonly impossibilityReasons: readonly TargetTimeImpossibilityReason[];
  readonly targetMinutes: number | null;
  readonly targetSec: number | null;
  readonly requestedRestSec: number;
  readonly seedRestSec: number;
  readonly totalRestSec: number;
  readonly lockedExerciseSec: number;
  readonly remainingAdjustableExerciseSec: number | null;
  readonly minRequiredExerciseSec: number;
  readonly maxAchievableExerciseSec: number;
  readonly minAchievableTotalSec: number;
  readonly maxAchievableTotalSec: number;
  readonly eligibleExerciseCount: number;
  readonly uniqueMovementFamilyCount: number;
  readonly minRequiredMovementCount: number;
  readonly headlineKo: string;
}

/**
 * Flexible seed step / nested block input accepted when the instructor wants to
 * validate or preserve existing/locked steps or nested blocks while requesting suggestions.
 */
export interface SeedStepOrContainerInput {
  readonly stepId?: string;
  readonly itemId?: string;
  readonly id?: string;
  readonly kind?: 'exercise' | 'rest' | string;
  readonly exerciseId?: string;
  readonly blockCategory?: ClassBlockCategory | string;
  readonly classSection?: ClassSectionRole | string;
  readonly durationMin?: number | null;
  readonly explanationSec?: number | null;
  readonly transitionSec?: number | null;
  readonly repetitions?: number | null;
  readonly sets?: number | null;
  readonly sideMode?: StepSideMode | string | null;
  readonly selectedLayer?: LayerMode | string | null;
  readonly customSpringOverride?: string;
  readonly instructorNote?: string;
  readonly locked?: boolean;
  readonly timeEstimate?: StepTimeEstimate | unknown;
  readonly exerciseSnapshot?: MovementSnapshot;
  readonly steps?: readonly unknown[];
  readonly items?: readonly unknown[];
  readonly blocks?: readonly unknown[];
  readonly children?: readonly unknown[];
}

export interface NormalizedSeedStep {
  readonly stepId: string;
  readonly stepIdWasGenerated: boolean;
  readonly index: number;
  readonly order: number;
  readonly kind: 'exercise' | 'rest';
  readonly exerciseId: string;
  readonly exerciseResolved: boolean;
  readonly blockCategory: ClassBlockCategory;
  readonly classSection: ClassSectionRole;
  readonly durationStatus: 'known' | 'unspecified' | 'invalid';
  readonly durationMin: number;
  readonly totalSec: number;
  readonly movementSec: number;
  readonly perSideSec: number;
  readonly sides: 1 | 2;
  readonly explanationSec: number;
  readonly transitionSec: number;
  readonly repetitions?: number;
  readonly sets?: number;
  readonly sideMode?: StepSideMode;
  readonly selectedLayer: LayerMode;
  readonly customSpringOverride?: string;
  readonly instructorNote?: string;
  readonly locked: boolean;
  readonly usedTimeEstimate: boolean;
  readonly rawDurationMin?: unknown;
  readonly rawRepetitions?: unknown;
  readonly rawSets?: unknown;
  readonly rawSideMode?: unknown;
  readonly issueCodes: readonly PresetSuggestionIssueCode[];
}

export interface NormalizedPresetSuggestionInput {
  readonly apparatus: ApparatusType | 'mixed';
  readonly apparatusValid: boolean;
  readonly availableEquipment: readonly string[];
  readonly unknownEquipmentIds: readonly string[];
  readonly theme: PresetThemeId;
  readonly themeValid: boolean;
  readonly focusPreset: AutoGenerateCriteria['focusPreset'];
  readonly level: DifficultyLevel;
  readonly levelValid: boolean;
  readonly targetMinutes: number | null;
  readonly targetDurationStatus: 'known' | 'unspecified' | 'invalid';
  readonly restMinutes: number;
  readonly restStatus: 'none' | 'valid' | 'invalid';
  readonly preferredProps: readonly PropType[];
  readonly defaultLayer: LayerMode;
  readonly excludeDaysWindow: number;
  readonly targetGroupId?: string;
  readonly maxCandidates: number;
  readonly seedSteps: readonly NormalizedSeedStep[];
  readonly isPartialSeedScan: boolean;
  readonly rawNodesScanned: number;
  readonly maxDepthObserved: number;
  readonly cycleDetectedCount: number;
  readonly depthExceededCount: number;
  readonly itemLimitExceededCount: number;
  readonly scanLimitExceeded: boolean;
  readonly skippedMalformedCount: number;
  readonly unknownExerciseIds: readonly string[];
  readonly unverifiableExerciseIds: readonly string[];
  readonly adapterIssues: readonly PresetSuggestionIssue[];
  readonly rawTargetMinutes?: unknown;
  readonly rawRestMinutes?: unknown;
  readonly rawApparatus?: unknown;
  readonly rawTheme?: unknown;
}

/**
 * User/caller request for deterministic preset suggestions.
 */
export interface PresetSuggestionRequest {
  readonly apparatus?: ApparatusType | 'mixed' | string;
  readonly ownedApparatus?: readonly ApparatusType[];
  readonly availableEquipment?: readonly string[];
  readonly theme?: PresetThemeId | string;
  readonly focusPreset?: AutoGenerateCriteria['focusPreset'];
  readonly targetMinutes?: number | null;
  readonly restMinutes?: number | null;
  readonly level?: DifficultyLevel | string;
  readonly preferredProps?: readonly PropType[];
  readonly defaultLayer?: LayerMode;
  readonly excludeDaysWindow?: number;
  readonly targetGroupId?: string;
  readonly historyLogs?: readonly ClassHistoryLog[];
  readonly referenceDateIso?: string;
  /** Optional existing/seed plan, steps, or nested blocks to inspect or retain locked steps from. */
  readonly seedPlan?:
    | SavedSequence
    | OfflineClassPreset
    | ReusableBlock
    | OfflineBlockPreset
    | readonly (SequenceStep | ReusableBlockItem | SeedStepOrContainerInput | unknown)[]
    | {
        readonly steps?: readonly unknown[];
        readonly items?: readonly unknown[];
        readonly blocks?: readonly unknown[];
        readonly children?: readonly unknown[];
      };
  /** Optional custom exercise catalog (defaults to `INITIAL_EXERCISES`). */
  readonly exercises?: readonly PilatesExercise[];
  /** Optional custom offline class presets (defaults to `OFFLINE_CLASS_PRESETS`). */
  readonly classPresets?: readonly OfflineClassPreset[];
  /** Optional custom offline block presets (defaults to `OFFLINE_BLOCK_PRESETS`). */
  readonly blockPresets?: readonly OfflineBlockPreset[];
  readonly maxCandidates?: number;
  readonly maxItems?: number;
  readonly maxNestingDepth?: number;
  readonly maxRawScanNodes?: number;
}

/**
 * Origin tier of a deterministic preset suggestion candidate:
 * - 'offline-class-preset-exact': Direct match from `OFFLINE_CLASS_PRESETS` (exact apparatus, theme, and duration)
 * - 'offline-class-preset-adapted': Deterministic duration/rest adaptation of a matching `OFFLINE_CLASS_PRESETS` template
 * - 'offline-block-preset-assembly': Deterministic assembly of `preparation` + `main` + `cooldown` blocks from `OFFLINE_BLOCK_PRESETS`
 * - 'catalog-deterministic-composition': Deterministic rule-based composition from verifiable `INITIAL_EXERCISES` catalog IDs
 */
export type PresetCandidateSourceTier =
  | 'offline-class-preset-exact'
  | 'offline-class-preset-adapted'
  | 'offline-block-preset-assembly'
  | 'catalog-deterministic-composition';

export interface CandidateStepTimingDetail {
  readonly stepId: string;
  readonly order: number;
  readonly kind: 'exercise' | 'rest';
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly apparatus?: ApparatusType;
  readonly blockCategory: ClassBlockCategory;
  readonly classSection: ClassSectionRole;
  readonly isUnilateral: boolean;
  readonly sideMode?: StepSideMode;
  readonly sideLabelsKo: readonly string[];
  readonly sides: 1 | 2;
  readonly totalSec: number;
  readonly movementSec: number;
  readonly perSideSec: number;
  readonly explanationSec: number;
  readonly transitionSec: number;
  readonly restSec: number;
  readonly durationMin: number;
  readonly locked: boolean;
}

export interface CandidateTimeSummary {
  readonly targetMinutes: number;
  readonly targetSec: number;
  readonly totalSec: number;
  readonly totalMinutes: number;
  readonly exerciseSec: number;
  readonly restSec: number;
  readonly movementSec: number;
  readonly explanationSec: number;
  readonly transitionSec: number;
  readonly deltaSec: number;
  readonly exactTargetMatch: boolean;
  readonly minStepTotalSec: number;
  readonly maxStepTotalSec: number;
  readonly minMovementSec: number;
  readonly withinStepDurationBounds: boolean;
}

export interface CandidateUnilateralSummary {
  readonly unilateralBalanced: boolean;
  readonly unilateralExerciseStepCount: number;
  readonly sequentialBothStepCount: number;
  readonly splitLeftStepCount: number;
  readonly splitRightStepCount: number;
  readonly bilateralTogetherStepCount: number;
  readonly leftTotalSec: number;
  readonly rightTotalSec: number;
  readonly leftRightDiffSec: number;
  readonly minPerSideSec: number | null;
  readonly imbalancedExerciseIds: readonly string[];
  readonly unilateralTogetherMismatchIds: readonly string[];
  readonly summaryKo: string;
}

export interface PresetSuggestionCandidate {
  readonly candidateId: string;
  readonly rank: number;
  readonly matchScore: number;
  readonly sourceTier: PresetCandidateSourceTier;
  readonly sourceTierLabelKo: string;
  readonly sourcePresetId?: string;
  readonly sourceBlockPresetIds: readonly string[];
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly rationaleKo: string;
  readonly editingGuideKo: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly requiredEquipment: readonly string[];
  readonly recommendedProps: readonly PropType[];
  readonly theme: PresetThemeId;
  readonly themeLabelKo: string;
  readonly focusPreset: AutoGenerateCriteria['focusPreset'];
  readonly level: DifficultyLevel;
  readonly targetMinutes: number;
  readonly restMinutes: number;
  readonly transitionScore: number;
  readonly verifiedExerciseIds: readonly string[];
  readonly steps: readonly SequenceStep[];
  readonly stepDetails: readonly CandidateStepTimingDetail[];
  readonly timing: CandidateTimeSummary;
  readonly unilateral: CandidateUnilateralSummary;
  readonly sequenceDraft: SavedSequence;
  readonly conditionTemplate: ConditionTemplate;
  readonly truthBoundary: PresetSuggestionTruthBoundary;
}

export interface PresetSuggestionResult {
  readonly status: 'ready' | 'blocked';
  readonly statusHeadlineKo: string;
  readonly normalizedInput: NormalizedPresetSuggestionInput;
  readonly feasibility: TargetFeasibilityReport;
  readonly candidates: readonly PresetSuggestionCandidate[];
  readonly recommendedCandidate: PresetSuggestionCandidate | null;
  readonly issues: readonly PresetSuggestionIssue[];
  readonly blockingIssues: readonly PresetSuggestionIssue[];
  readonly warningIssues: readonly PresetSuggestionIssue[];
  readonly truthBoundary: PresetSuggestionTruthBoundary;
}
