import type { VisualPhaseId } from '../../data/movementVisualRigCatalog';
import type {
  ApparatusType,
  BodyPosition,
  SpinalPlane,
} from '../../types/pilates';

export type EvidenceReviewTrackId =
  | 'track-a-mat'
  | 'track-b-apparatus'
  | 'track-c-extended-mat'
  | 'track-d-extended-apparatus';

export type EvidenceTrackId = EvidenceReviewTrackId;

export type EvidenceSourceAccessStatus =
  | 'verified-direct-fetch'
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

export interface EvidenceExerciseSummary {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly spinalPlanes: readonly SpinalPlane[];
}

export interface EvidenceMuscleAnalysis {
  readonly primaryMusclesKo: readonly string[];
  readonly synergistMusclesKo: readonly string[];
  readonly stabilizerMusclesKo: readonly string[];
  readonly lengthenedStructuresKo: readonly string[];
  readonly evidenceBasisKo: string;
}

export interface EvidenceCompensationItem {
  readonly compensationKo: string;
  readonly biomechanicalCauseKo: string;
  readonly cueCorrectionKo: string;
}

export interface EvidenceContraindicationItem {
  readonly conditionOrCautionKo: string;
  readonly modificationKo: string;
}

export interface EvidenceDiscrepancyCheckItem {
  readonly aspect: string;
  readonly catalogOrDraftStateKo: string;
  readonly evidenceStandardKo: string;
  readonly conservativeResolutionKo: string;
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
  readonly rankInTrack: number;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly spinalPlanes: readonly SpinalPlane[];
  readonly exercise?: EvidenceExerciseSummary;
  readonly sources: readonly EvidenceSourceCitation[];
  readonly phases: {
    readonly start: PhaseEvidenceSpec;
    readonly middle: PhaseEvidenceSpec;
    readonly end: PhaseEvidenceSpec;
  };
  readonly muscles?: EvidenceMuscleAnalysis;
  readonly commonCompensations?: readonly EvidenceCompensationItem[];
  readonly contraindicationsAndModifications?: readonly EvidenceContraindicationItem[];
  readonly discrepancyChecks?: readonly EvidenceDiscrepancyCheckItem[];
  readonly discrepancyAudit: EvidenceDiscrepancyAudit;
  readonly truthfulnessFlags: EvidenceTruthfulnessFlags;
  readonly honestLimitationSummaryKo?: string;
  readonly reviewedAtIso?: string;
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

export interface FullCatalogMotionEvidenceSuiteValidationReport
  extends MotionEvidenceSuiteValidationReport {
  readonly trackCCount: number;
  readonly trackDCount: number;
  readonly matRecordCount: number;
  readonly apparatusRecordCount: number;
  readonly catalogCoverageCount: number;
  readonly missingCatalogExerciseIds: readonly string[];
  readonly verifiedDirectSourceCoverageCount: number;
}
