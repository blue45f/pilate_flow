import type { VisualPhaseId } from '../../data/movementVisualRigCatalog';
import type {
  ApparatusType,
  BodyPosition,
  SpinalPlane,
} from '../../types/pilates';

export type EvidenceReviewTrackId = 'track-a-mat' | 'track-b-apparatus';

export type EvidenceSourceAccessStatus =
  | 'verified-in-repo-source-ledger'
  | 'verified-via-public-search-snippet'
  | 'blocked-by-sandbox-proxy-unverified';

export type EvidenceSourceCategory =
  | 'nhs-hospital-leaflet'
  | 'public-health-institution'
  | 'pilates-curriculum-reference'
  | 'classical-primary-reference'
  | 'educational-clinical-guide';

export interface EvidenceSourceCitation {
  readonly sourceId: string;
  readonly title: string;
  readonly publisher: string;
  readonly directUrl: string;
  readonly sourceCategory: EvidenceSourceCategory;
  readonly accessStatus: EvidenceSourceAccessStatus;
  readonly accessNoteKo: string;
  readonly rightsPolicy: 'link-only-no-download';
}

export interface PhaseEvidenceSpec {
  readonly phaseId: VisualPhaseId;
  readonly postureAndTransitionKo: string;
  readonly jointDirectionsKo: readonly string[];
  readonly supportPointsKo: readonly string[];
  readonly apparatusInteractionKo: string;
  readonly breathingKo: string;
}

export type EpistemicCategory = 'fact' | 'inference' | 'unverified';

export interface EpistemicStatement {
  readonly category: EpistemicCategory;
  readonly targetId: string;
  readonly summaryKo: string;
}

export interface EvidenceDiscrepancyAudit {
  readonly targetVisualAssetId: string;
  readonly targetPatternVariantIds: readonly string[];
  readonly facts: readonly EpistemicStatement[];
  readonly inferences: readonly EpistemicStatement[];
  readonly unverifiedOrMismatched: readonly EpistemicStatement[];
  readonly diagramTeamRecommendationsKo: readonly string[];
}

export interface EvidenceTruthfulnessFlags {
  readonly canonicalMotionReady: boolean;
  readonly manualReady: boolean;
  readonly true3dSupported: boolean;
  readonly anatomicalVerificationCompleted: boolean;
  readonly expertVerificationCompleted: boolean;
  readonly containsUnverifiedNumericAngleClaim: boolean;
  readonly containsUnverifiedEmgMuscleClaim: boolean;
  readonly containsMedicalSafetyGuarantee: boolean;
}

export interface MotionEvidenceReviewRecord {
  readonly exerciseId: string;
  readonly track: EvidenceReviewTrackId;
  readonly rankInTrack: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly spinalPlanes: readonly SpinalPlane[];
  readonly sources: readonly EvidenceSourceCitation[];
  readonly phases: {
    readonly start: PhaseEvidenceSpec;
    readonly middle: PhaseEvidenceSpec;
    readonly end: PhaseEvidenceSpec;
  };
  readonly discrepancyAudit: EvidenceDiscrepancyAudit;
  readonly truthfulnessFlags: EvidenceTruthfulnessFlags;
}

export type MotionEvidenceValidationIssueCode =
  | 'unknown-catalog-id'
  | 'duplicate-exercise-id'
  | 'track-id-overlap'
  | 'track-category-mismatch'
  | 'apparatus-mismatch'
  | 'body-position-mismatch'
  | 'missing-or-invalid-source-url'
  | 'invalid-source-rights-policy'
  | 'missing-phase-evidence'
  | 'missing-biomechanical-field'
  | 'discrepancy-target-id-mismatch'
  | 'epistemic-category-mismatch'
  | 'unsupported-numeric-angle-or-medical-claim'
  | 'false-ready-or-verified-claim';

export interface MotionEvidenceValidationIssue {
  readonly code: MotionEvidenceValidationIssueCode;
  readonly exerciseId: string;
  readonly track: EvidenceReviewTrackId;
  readonly fieldPath: string;
  readonly messageKo: string;
}

export interface MotionEvidenceRecordValidationResult {
  readonly exerciseId: string;
  readonly track: EvidenceReviewTrackId;
  readonly valid: boolean;
  readonly hasVerifiedDirectSource: boolean;
  readonly hasSandboxBlockedSourceOnly: boolean;
  readonly issues: readonly MotionEvidenceValidationIssue[];
}

export interface MotionEvidenceSuiteValidationReport {
  readonly valid: boolean;
  readonly totalRecords: number;
  readonly trackACount: number;
  readonly trackBCount: number;
  readonly zeroTrackIdOverlap: boolean;
  readonly fullyVerifiedSourceExerciseCount: number;
  readonly partiallyOrProxyRestrictedExerciseCount: number;
  readonly issueCount: number;
  readonly issues: readonly MotionEvidenceValidationIssue[];
  readonly resultsByExerciseId: Readonly<
    Record<string, MotionEvidenceRecordValidationResult>
  >;
}
