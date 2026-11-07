export {
  REFERENCE_LINK_POLICY_CANDIDATE_SCOPE,
  type CatalogSampleAuditSummary,
  type DeduplicatedDuplicateDiagnostic,
  type EvaluatedReferenceLinkItem,
  type ExerciseReferenceLinkPolicyReport,
  type NormalizeReferenceUrlOptions,
  type NormalizedReferenceLinkResult,
  type ReferenceDisplayMode,
  type ReferenceEmbedPolicyHint,
  type ReferenceLinkCandidateInput,
  type ReferenceLinkPolicyEvaluationOptions,
  type ReferenceLinkRejectionCode,
  type ReferencePlayerDisplaySnapshot,
  type ReferencePlayerLifecycleState,
  type ReferencePlayerRuntimeFailureKind,
  type ReferenceProviderKind,
  type ReferenceSourceTier,
  type RejectedReferenceLinkDiagnostic,
  type StrippedQueryCategory,
  type StrippedQueryDiagnostic,
  type SyntheticIframeFixtureDescriptor,
} from './types';

export {
  TIER_LABELS_KO,
  buildLocalSyntheticIframeFixtureUrl,
  evaluateReferenceLinkCandidates,
  isStrictNoAutoplayEmbedUrl,
  normalizeReferenceUrlPolicy,
  parseYouTubeTimeParamSeconds,
} from './urlPolicyEngine';

export {
  createReferencePlayerDisplayController,
  type ReferencePlayerControllerOptions,
  type ReferencePlayerDisplayController,
  type RequestEmbedLoadAction,
} from './playerDisplayContract';

export {
  SYNTHETIC_POLICY_FIXTURE_PRESETS,
  auditExistingPublicUrlSamples,
  buildExerciseReferenceCandidateList,
  resolveExerciseReferenceLinkPolicyReport,
  type ResolveExerciseReferencePolicyOptions,
  type SyntheticPolicyFixturePreset,
} from './catalogSampleAudit';

export {
  ReferenceLinkPolicyFixtureHarness,
  ReferenceLinkPolicyPreview,
  type ReferenceLinkPolicyPreviewProps,
  type ReferencePolicyFilterTab,
} from './ReferenceLinkPolicyPreview';
