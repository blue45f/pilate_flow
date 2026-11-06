import type {
  CatalogMovementVisualAsset,
  PhasePoseSpec,
  VisualPhaseId,
} from '../../data/movementVisualRigCatalog';
import type {
  VisualAssetIntegrityCheck,
  VisualSourceComparisonRecord,
} from '../../data/movementVisualSourceAudit';
import type { MotionDraftRig } from '../../data/motionDraftIndex';
import type { MotionPatternReference } from '../../data/motionPatternReferences';
import type {
  ExerciseMotionReference,
  MotionPrototypeReference,
} from '../../data/motionReferences';
import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  PilatesExercise,
  SpinalPlane,
} from '../../types/pilates';

/**
 * Canonical motion support modes evaluated by the motionCoverage resolver.
 * - 'projected-3d': Procedural 3D coordinates (Point3 / BatchPoint / SupineReachPoint) projected
 *   onto a 2D SVG plane via oblique orthographic projection (NOT true WebGL/scene-graph 3D).
 * - 'continuous-2d': Procedural 2D planar (Point2 / MotionPoint) continuous progress ∈ [0, 1] draft.
 * - 'three-phase-2d': Existing 98-exercise discrete 3-phase (start / middle / end) 2D kinematic rig
 *   reused directly from MOVEMENT_VISUAL_ASSETS without creating duplicate assets.
 * - 'missing': No verified motion data available (unknown ID, unverified custom item, or rejected mismatch).
 */
export type MotionSupportMode = 'three-phase-2d' | 'continuous-2d' | 'projected-3d' | 'missing';

/**
 * Explicit readiness state discriminator.
 * Notice that `'ready'` is intentionally excluded: in the current repository state,
 * `EXERCISE_MOTION_REFERENCES` has 0 authored/expert-approved canonical motion assets,
 * so no exercise or candidate may ever be reported as canonical motion `'ready'`.
 */
export type MotionReadinessState =
  | 'related-pattern-draft-only'
  | 'lab-prototype-only'
  | 'three-phase-2d-schematic-only'
  | 'research-pending-no-model'
  | 'not-authored-missing';

export type ThreePhase2dSourceKind = 'catalog-rig-verified';

export type Continuous2dSourceKind = 'pattern-reference-2d' | 'lab-prototype-2d';

export type Projected3dSourceKind =
  'existing-proposal-3d' | 'authoring-batch-3d' | 'supine-reach-3d';

export type MotionCandidateRejectionReason =
  | 'unknown-exercise-id'
  | 'unverified-custom-exercise'
  | 'apparatus-mismatch'
  | 'body-position-mismatch'
  | 'direction-or-plane-mismatch'
  | 'prop-or-rig-mismatch'
  | 'compound-sequence-mismatch'
  | 'not-in-intended-exercise-ids'
  | 'model-not-authored'
  | 'missing-source-evidence'
  | 'catalog-metadata-mismatch';

/**
 * Non-negotiable safety, review, and 3D truthfulness flags.
 * - `EXERCISE_MOTION_REFERENCES` has 0 authored/expert-approved canonical assets.
 * - All 22 `MOTION_PATTERN_REFERENCES` are unreviewed pattern-reference drafts (`exactCanonicalMatch: false`).
 * - All 3D drafts use oblique orthographic 2D SVG projection (`true3dSupported: false`, `webgl3dReady: false`).
 */
export interface MotionSafetyAndReviewFlags {
  readonly canonicalRecordExists: boolean;
  readonly canonicalAssetReady: false;
  readonly canonicalContinuousReady: false;
  readonly exactCanonicalMatch: false;
  readonly anatomicalAccuracyAssumed: false;
  readonly expertApproved: false;
  readonly true3dSupported: false;
  readonly webgl3dReady: false;
  readonly interactive3dCameraSupported: false;
  readonly professionalReviewStatus: 'unreviewed';
  readonly professionalMotionReviewCount: 0;
  readonly canonicalMotionStatus: ExerciseMotionReference['status'];
  readonly researchCandidateStatus: 'research_pending' | 'none';
  readonly hasUnauthoredResearchCandidate: boolean;
}

export interface RejectedMotionCandidate {
  readonly candidateId: string;
  readonly candidateKind:
    | 'pattern-reference'
    | 'lab-prototype'
    | 'research-candidate'
    | 'baseline-2d-archetype'
    | 'exercise-input';
  readonly reason: MotionCandidateRejectionReason;
  readonly expectedApparatus?: ApparatusType;
  readonly candidateApparatus?: ApparatusType | string;
  readonly expectedBodyPosition?: BodyPosition;
  readonly candidateBodyPosition?: BodyPosition | string;
  readonly candidateDraftRig?: MotionDraftRig;
  readonly detailKo: string;
}

export interface UnauthoredResearchCandidateInfo {
  readonly candidateId: string;
  readonly intendedExerciseId: string;
  readonly title: string;
  readonly modelAuthored: false;
  readonly exactAssetReady: false;
  readonly status: string;
  readonly reasonKo: string;
}

export interface ThreePhase2dSupportDetail {
  readonly supported: boolean;
  readonly sourceKind: ThreePhase2dSourceKind | null;
  readonly temporalKind: 'discrete-three-phase';
  readonly isContinuousPlayback: false;
  readonly isDraftProposal: false;
  readonly isCanonicalMotionAsset: false;
  readonly reusesExistingCatalogAsset: boolean;
  readonly phaseCount: 3;
  readonly asset: CatalogMovementVisualAsset | null;
  readonly baselineArchetypeId: string | null;
  readonly effectiveArchetypeId: string | null;
  readonly hadBaselineMismatch: boolean;
  readonly baselineMismatchReasonKo: string | null;
  readonly sourceComparison: VisualSourceComparisonRecord | null;
  readonly integrityCheck: VisualAssetIntegrityCheck | null;
}

export interface Continuous2dSupportDetail {
  readonly supported: boolean;
  readonly sourceKind: Continuous2dSourceKind | null;
  readonly temporalKind: 'continuous-progress';
  readonly isContinuousPlayback: boolean;
  readonly isDraftProposal: boolean;
  readonly isCanonicalMotionAsset: false;
  readonly assetStatus: 'authored-unreviewed-draft' | 'draft' | 'not_authored';
  readonly relation: 'pattern-reference' | 'design_prototype_only' | 'none';
  readonly draftRig: MotionDraftRig | null;
  readonly patternReferences: readonly MotionPatternReference[];
  readonly labPrototype: MotionPrototypeReference | null;
  readonly variantId: string | null;
  readonly modelPath: string | null;
  readonly rendererComponent: string | null;
  readonly isPrototypeOnly: boolean;
  readonly mismatchNotesKo: readonly string[];
}

export interface Projected3dSupportDetail {
  readonly supported: boolean;
  readonly sourceKind: Projected3dSourceKind | null;
  readonly temporalKind: 'continuous-progress';
  readonly isContinuousPlayback: boolean;
  readonly isDraftProposal: boolean;
  readonly isCanonicalMotionAsset: false;
  readonly assetStatus: 'authored-unreviewed-draft' | 'not_authored';
  readonly relation: 'pattern-reference' | 'none';
  readonly projectionMethod: 'oblique-orthographic-3d-to-2d-svg' | null;
  readonly renderSurface: 'svg-2d' | null;
  readonly true3dSupported: false;
  readonly webgl3dReady: false;
  readonly interactive3dCameraSupported: false;
  readonly draftRigs: readonly MotionDraftRig[];
  readonly patternReferences: readonly MotionPatternReference[];
  readonly variantIds: readonly string[];
  readonly modelPaths: readonly string[];
  readonly rendererComponents: readonly string[];
  readonly mismatchNotesKo: readonly string[];
}

export interface MotionCoverageResolution {
  readonly exerciseId: string;
  readonly isCatalogExercise: boolean;
  readonly exercise: PilatesExercise | null;
  readonly apparatus: ApparatusType | null;
  readonly bodyPosition: BodyPosition | null;
  readonly blockCategory: ClassBlockCategory | null;
  readonly spinalPlanes: readonly SpinalPlane[];
  /**
   * Highest-tier verified motion support mode, or 'missing' if no verified support exists.
   * Priority order: 'projected-3d' -> 'continuous-2d' -> 'three-phase-2d' -> 'missing'
   */
  readonly primaryMode: MotionSupportMode;
  /**
   * All verified support modes available for this exercise ID.
   * Empty when primaryMode === 'missing'.
   */
  readonly supportedModes: readonly MotionSupportMode[];
  /**
   * Convenience map of each mode's boolean availability.
   */
  readonly modeMatrix: Readonly<Record<Exclude<MotionSupportMode, 'missing'>, boolean>>;
  readonly isMissing: boolean;
  /**
   * Always false: no canonical motion asset in `EXERCISE_MOTION_REFERENCES` is authored/ready.
   */
  readonly canonicalMotionReady: false;
  readonly readinessState: MotionReadinessState;
  readonly threePhase2d: ThreePhase2dSupportDetail;
  readonly continuous2d: Continuous2dSupportDetail;
  readonly projected3d: Projected3dSupportDetail;
  readonly researchCandidates: readonly UnauthoredResearchCandidateInfo[];
  readonly rejectedCandidates: readonly RejectedMotionCandidate[];
  readonly safetyFlags: MotionSafetyAndReviewFlags;
  readonly evidenceSummaryKo: string;
}

export interface ResolveMotionCoverageOptions {
  /**
   * When true (default: false), lab-only 2D prototypes (`bridge-pattern`, `heel-slide` with
   * `exerciseId: null` and `useScope: 'design_prototype_only'`) are allowed to activate `continuous2d`
   * for their exact apparatus/posture/direction catalog counterparts (`original-mat-bridge`,
   * `original-mat-heel-slide`). Even when false, `labPrototype` metadata is attached for inspection.
   */
  readonly includeLabPrototypesInContinuous2d?: boolean;
  /**
   * Optional preferred mode when selecting `primaryMode` among verified `supportedModes`.
   */
  readonly preferMode?: Exclude<MotionSupportMode, 'missing'>;
}

export interface CandidateMatchEvaluation {
  readonly matched: boolean;
  readonly exerciseId: string;
  readonly candidateId: string;
  readonly resolvedMode: MotionSupportMode;
  readonly isDraftProposal: boolean;
  readonly isCanonicalReady: false;
  readonly true3dSupported: false;
  readonly rejection: RejectedMotionCandidate | null;
  readonly safetyFlags: MotionSafetyAndReviewFlags;
}

export type {
  CatalogMovementVisualAsset,
  PhasePoseSpec,
  VisualPhaseId,
  VisualAssetIntegrityCheck,
  VisualSourceComparisonRecord,
  MotionDraftRig,
  MotionPatternReference,
  MotionPrototypeReference,
  ExerciseMotionReference,
};
