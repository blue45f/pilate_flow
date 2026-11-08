export type {
  EpistemicCategory,
  EpistemicStatement,
  EvidenceCompensationItem,
  EvidenceContraindicationItem,
  EvidenceDiscrepancyAudit,
  EvidenceDiscrepancyCheckItem,
  EvidenceExerciseSummary,
  EvidenceMuscleAnalysis,
  EvidenceReviewTrackId,
  EvidenceSourceAccessStatus,
  EvidenceSourceCategory,
  EvidenceSourceCitation,
  EvidenceTrackId,
  EvidenceTruthfulnessFlags,
  FullCatalogMotionEvidenceSuiteValidationReport,
  MotionEvidenceRecordValidationResult,
  MotionEvidenceReviewRecord,
  MotionEvidenceSuiteValidationReport,
  MotionEvidenceValidationIssue,
  MotionEvidenceValidationIssueCode,
  PhaseEvidenceSpec,
} from './types';

export {
  HONEST_DEFAULT_TRUTHFULNESS_FLAGS,
  TRACK_A_MAT_EVIDENCE_RECORDS,
} from './trackAMatEvidence';

export { TRACK_B_APPARATUS_EVIDENCE_RECORDS } from './trackBApparatusEvidence';

export { TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS } from './trackCExtendedMatEvidence';

export { TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS } from './trackDExtendedApparatusEvidence';

export {
  FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS,
  resolveMotionEvidenceReviewRecord,
  validateFullCatalogMotionEvidenceSuite,
  validateMotionEvidenceRecord,
  validateMotionEvidenceSuite,
} from './validator';

import { TRACK_A_MAT_EVIDENCE_RECORDS } from './trackAMatEvidence';
import { TRACK_B_APPARATUS_EVIDENCE_RECORDS } from './trackBApparatusEvidence';
import type { MotionEvidenceReviewRecord } from './types';

export const ALL_MOTION_EVIDENCE_REVIEW_RECORDS: readonly MotionEvidenceReviewRecord[] =
  [...TRACK_A_MAT_EVIDENCE_RECORDS, ...TRACK_B_APPARATUS_EVIDENCE_RECORDS];
