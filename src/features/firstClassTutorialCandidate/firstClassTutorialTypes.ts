/**
 * Public TypeScript contracts for the isolated First Class 3-Step Visual Tutorial Candidate.
 *
 * Scope boundary:
 * - Isolated integration candidate under `src/features/firstClassTutorialCandidate/**`.
 * - Does not connect to production routes, stores, or persistence by itself.
 * - Replaces/upgrades the text-only guide in `InstructorStudyDialog` (`mode === 'guide'`)
 *   or serves as an optional collapsible visual guide in `SequenceWorkbench` (`workbench-welcome`)
 *   via props contracts only.
 * - Never enforces a mandatory tour or exercise review gate.
 */

export type FirstClassTutorialStepId =
  | 'new-movement'
  | 'block-composition'
  | 'save-class';

export type FirstClassTutorialTaskId =
  | 'first-class:new-movement'
  | 'first-class:block-compose'
  | 'first-class:save-class';

export type LegacyInstructorTutorialTaskId =
  | 'conditions'
  | 'compose'
  | 'rehearse'
  | 'teach-record';

export type FirstClassTutorialVisibilityState = 'open' | 'skipped' | 'dismissed';

export type FirstClassTutorialIllustrationKind =
  | 'new-movement-sketch'
  | 'block-composition-sketch'
  | 'save-class-sketch';

export interface FirstClassTutorialStepSpec {
  readonly stepNumber: 1 | 2 | 3;
  readonly id: FirstClassTutorialStepId;
  readonly taskId: FirstClassTutorialTaskId;
  readonly legacyTaskIds: readonly LegacyInstructorTutorialTaskId[];
  readonly badgeKo: string;
  readonly shortTabLabelKo: string;
  readonly titleKo: string;
  readonly summaryKo: string;
  readonly bulletsKo: readonly [string, string, string];
  readonly realUiPathKo: string;
  readonly actionButtonLabelKo: string;
  readonly illustrationKind: FirstClassTutorialIllustrationKind;
  readonly illustrationAltKo: string;
  readonly illustrationCaptionKo: string;
  readonly nonGateNoticeKo: string;
}

export interface FirstClassTutorialDiagnosticNote {
  readonly code:
    | 'INVALID_SOURCE_ROOT'
    | 'SCAN_LIMIT_REACHED'
    | 'MALFORMED_STEP_SKIPPED'
    | 'MALFORMED_IDEA_SKIPPED'
    | 'MALFORMED_BLOCK_SKIPPED'
    | 'MALFORMED_SAVED_SEQUENCE_SKIPPED'
    | 'MALFORMED_TASK_ID_SKIPPED'
    | 'INVALID_TARGET_MINUTES';
  readonly messageKo: string;
  readonly sampleValueSummary?: string;
}

export interface FirstClassTutorialContextOptions {
  readonly maxScanItems?: number;
  readonly maxNormalizedItems?: number;
  readonly includeLegacyTaskMappings?: boolean;
}

export interface FirstClassTutorialContextSummary {
  readonly titleKo: string;
  readonly targetMinutes: number | null;
  readonly targetMinutesStatus: 'known' | 'unspecified' | 'invalid';
  readonly exerciseStepCount: number;
  readonly restStepCount: number;
  readonly ideaDraftCount: number;
  readonly reusableBlockCount: number;
  readonly savedSequenceCount: number;
  readonly completedStepIds: readonly FirstClassTutorialStepId[];
  readonly normalizedTaskIds: readonly string[];
  readonly suggestedStepId: FirstClassTutorialStepId;
  readonly suggestedReasonKo: string;
  readonly isPartialContext: boolean;
  readonly diagnostics: readonly FirstClassTutorialDiagnosticNote[];
  readonly boundary: {
    readonly isReadOnly: true;
    readonly isMandatoryTour: false;
    readonly requiresReviewApproval: false;
    readonly mutatesStoreOrStorage: false;
    readonly clinicalOrAnatomicalApproval: false;
  };
}

export interface FirstClassTutorialCandidateProps {
  /** Optional untrusted or typed context snapshot from parent (never mutated or frozen). */
  readonly source?: unknown;
  /** Optional pre-computed context summary from `resolveFirstClassTutorialContext`. */
  readonly summary?: FirstClassTutorialContextSummary;
  /** Optional options when normalizing `source`. */
  readonly options?: FirstClassTutorialContextOptions;
  /** Optional override for completed tutorial task IDs (`InstructorStudyState.completedTutorialTaskIds`). */
  readonly completedTaskIds?: readonly string[];
  /** Optional initial step ID override; defaults to `summary.suggestedStepId` or `'new-movement'`. */
  readonly initialStepId?: FirstClassTutorialStepId;
  /** Optional controlled step ID. */
  readonly activeStepId?: FirstClassTutorialStepId;
  /** Optional initial visibility state (`'open' | 'skipped' | 'dismissed'`). */
  readonly initialVisibility?: FirstClassTutorialVisibilityState;
  /** Optional controlled visibility state. */
  readonly visibility?: FirstClassTutorialVisibilityState;
  /** Optional explicit reduced-motion override for deterministic testing and accessibility. */
  readonly preferReducedMotion?: boolean;
  /** Layout presentation mode: inline workbench card or study dialog guide panel. */
  readonly variant?: 'inline-card' | 'study-guide-panel';
  /** Optional custom heading text. */
  readonly titleOverride?: string;
  /** Optional additional CSS class name. */
  readonly className?: string;
  /** Callback fired when the user selects a tutorial step via tab, prev/next, or keyboard. */
  readonly onStepChange?: (stepId: FirstClassTutorialStepId, stepIndex: number) => void;
  /** Callback fired when the user clicks "건너뛰기" (Skip without forcing completion). */
  readonly onSkip?: (fromStepId: FirstClassTutorialStepId) => void;
  /** Callback fired when the user clicks "닫기" (Dismiss/collapse tutorial). */
  readonly onDismiss?: (fromStepId: FirstClassTutorialStepId) => void;
  /** Callback fired when the user clicks "다시보기" or "처음부터 보기" (Reopen tutorial). */
  readonly onReopen?: (toStepId: FirstClassTutorialStepId) => void;
  /**
   * Optional personal usage self-check callback compatible with
   * `InstructorStudyDialogProps.onTutorialTaskChange(taskId, completed)`.
   */
  readonly onTaskToggle?: (
    taskId: FirstClassTutorialTaskId,
    completed: boolean,
    stepId: FirstClassTutorialStepId,
  ) => void;
  /**
   * Optional non-blocking shortcut callback for the current step
   * (e.g. opening `MovementIdeaSheet`, focusing block arrangement, or focusing sequence save).
   */
  readonly onStepAction?: (stepId: FirstClassTutorialStepId) => void;
  /**
   * Optional callback to return to the workbench when rendered inside `InstructorStudyDialog`.
   */
  readonly onReturnToWorkbench?: () => void;
}

export interface FirstClassTutorialFixturePreset {
  readonly id: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly source: unknown;
  readonly initialVisibility?: FirstClassTutorialVisibilityState;
}
