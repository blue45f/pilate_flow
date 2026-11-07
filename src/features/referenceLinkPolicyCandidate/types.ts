/**
 * Reference Link & Player Display Policy Candidate — Contract Types
 *
 * Ownership & Scope Boundary:
 * - Exclusive to `src/features/referenceLinkPolicyCandidate/**`.
 * - Owns ONLY the reference link normalization, deduplication, malicious scheme blocking,
 *   embed-vs-external-link separation, user-click autoplay prevention, and privacy query stripping
 *   contracts, plus local synthetic iframe fixture verification.
 * - Does NOT own anatomical evidence review (`motionEvidenceReview`), biomechanical validation,
 *   clinical suitability, or professional instructor certification.
 * - Existing catalog and video rendering paths remain strictly READ-ONLY.
 */

export const REFERENCE_LINK_POLICY_CANDIDATE_SCOPE = Object.freeze({
  featureId: 'referenceLinkPolicyCandidate',
  ownedDirectory: 'src/features/referenceLinkPolicyCandidate',
  status: 'pre-integration-candidate',
  existingCatalogAndRenderPathsReadOnly: true,
  sharedRoutesAndComponentsModified: false,
  ownsLinkAndPlayerDisplayContractOnly: true,
  ownsAnatomicalOrMotionEvidenceReview: false,
  performsBulkCrawlingOrVideoDownload: false,
  bypassesAccessControlsOr403: false,
  usesPaidOrExternalNetworkInTests: false,
} as const);

export type ReferenceLinkRejectionCode =
  | 'invalid-input-type'
  | 'empty-url'
  | 'max-length-exceeded'
  | 'control-characters'
  | 'malicious-scheme'
  | 'protocol-relative-or-relative'
  | 'malformed-url'
  | 'embedded-credentials'
  | 'disallowed-port'
  | 'private-or-local-host'
  | 'unauthorized-video-downloader'
  | 'paid-voice-api'
  | 'raw-media-binary'
  | 'invalid-youtube-target';

export type StrippedQueryCategory =
  | 'tracking'
  | 'session-or-share'
  | 'pii-key'
  | 'pii-value'
  | 'autoplay-override'
  | 'unsupported-youtube-param';

export interface StrippedQueryDiagnostic {
  readonly key: string;
  readonly category: StrippedQueryCategory;
  /** Raw query parameter values are never retained or echoed to prevent PII/token leakage. */
  readonly valueRedacted: true;
}

export type ReferenceDisplayMode =
  | 'embed-with-external-link'
  | 'external-link-only'
  | 'blocked';

export type ReferenceProviderKind =
  | 'youtube-video'
  | 'youtube-non-video'
  | 'external-web'
  | 'blocked';

export type ReferenceEmbedPolicyHint =
  | 'auto-detect'
  | 'youtube-nocookie-allowed'
  | 'external-link-only';

export interface NormalizeReferenceUrlOptions {
  readonly embedPolicy?: ReferenceEmbedPolicyHint;
  readonly startSec?: number | null;
  readonly endSec?: number | null;
  /**
   * When true, observation points or external website times are NOT converted into
   * seek query parameters (`t` / `start`). Defaults to false.
   */
  readonly forbidTimeSeekTransplant?: boolean;
}

export interface NormalizedReferenceLinkResult {
  readonly ok: boolean;
  readonly displayMode: ReferenceDisplayMode;
  readonly provider: ReferenceProviderKind;
  readonly hostname: string | null;
  readonly canonicalExternalUrl: string | null;
  readonly embedUrl: string | null;
  readonly localSyntheticFixtureUrl: string | null;
  readonly youtubeVideoId: string | null;
  readonly startSec: number | null;
  readonly endSec: number | null;
  readonly deduplicationKey: string | null;
  readonly videoLevelDeduplicationKey: string | null;
  readonly embedAllowed: boolean;
  readonly autoplayPrevented: true;
  readonly requiresExplicitUserClick: true;
  readonly externalLinkAlwaysProvided: boolean;
  readonly strippedQueryParams: readonly StrippedQueryDiagnostic[];
  readonly strippedQueryKeys: readonly string[];
  readonly hadAutoplayOverrideAttempt: boolean;
  readonly rejectionCode: ReferenceLinkRejectionCode | null;
  readonly reasonKo: string;
  readonly externalLinkLabelKo: string;
  readonly externalLinkRel: 'noopener noreferrer';
  readonly externalLinkTarget: '_blank';
  readonly iframeAllowAttr: 'encrypted-media; gyroscope; picture-in-picture';
  readonly iframeReferrerPolicy: 'strict-origin-when-cross-origin';
}

export type ReferenceSourceTier =
  | 'exact-source-snapshot'
  | 'direct-exercise-youtube'
  | 'verified-catalog-reference'
  | 'curated-youtube-pool'
  | 'motion-candidate-research'
  | 'course-reference-link-only'
  | 'public-education-portal'
  | 'custom-instructor-input';

export interface ReferenceLinkCandidateInput {
  readonly candidateId?: unknown;
  readonly title?: unknown;
  readonly publisher?: unknown;
  readonly url?: unknown;
  readonly tier?: ReferenceSourceTier;
  readonly region?: 'kr' | 'global' | null;
  readonly embedPolicy?: ReferenceEmbedPolicyHint;
  readonly startSec?: unknown;
  readonly endSec?: unknown;
  readonly isObservationTimestampOnly?: boolean;
  readonly rightsNoteKo?: unknown;
}

export interface EvaluatedReferenceLinkItem {
  readonly itemId: string;
  readonly titleKo: string;
  readonly publisherKo: string;
  readonly tier: ReferenceSourceTier;
  readonly tierLabelKo: string;
  readonly region: 'kr' | 'global' | null;
  readonly rightsNoteKo: string;
  readonly normalized: NormalizedReferenceLinkResult;
  readonly mergedDuplicateIds: readonly string[];
  readonly mergedDuplicateCount: number;
}

export interface RejectedReferenceLinkDiagnostic {
  readonly itemId: string;
  readonly titleKo: string;
  readonly tier: ReferenceSourceTier;
  readonly rejectionCode: ReferenceLinkRejectionCode;
  readonly reasonKo: string;
  readonly strippedQueryKeys: readonly string[];
}

export interface DeduplicatedDuplicateDiagnostic {
  readonly droppedItemId: string;
  readonly keptItemId: string;
  readonly deduplicationKey: string;
  readonly reasonKo: string;
}

export interface ReferenceLinkPolicyEvaluationOptions {
  readonly maxScanItems?: number;
  readonly maxNormalizedItems?: number;
  readonly deduplicateByVideoIdRegardlessOfStart?: boolean;
}

export interface ExerciseReferenceLinkPolicyReport {
  readonly subjectId: string;
  readonly subjectTitleKo: string;
  readonly evaluatedAtStatus: 'pre-integration-candidate';
  readonly scope: typeof REFERENCE_LINK_POLICY_CANDIDATE_SCOPE;
  readonly totalScannedCount: number;
  readonly scanTruncated: boolean;
  readonly acceptedItems: readonly EvaluatedReferenceLinkItem[];
  readonly embedCapableItems: readonly EvaluatedReferenceLinkItem[];
  readonly externalLinkOnlyItems: readonly EvaluatedReferenceLinkItem[];
  readonly rejectedDiagnostics: readonly RejectedReferenceLinkDiagnostic[];
  readonly deduplicatedDiagnostics: readonly DeduplicatedDuplicateDiagnostic[];
  readonly summary: {
    readonly acceptedCount: number;
    readonly embedCapableCount: number;
    readonly externalLinkOnlyCount: number;
    readonly rejectedCount: number;
    readonly deduplicatedCount: number;
    readonly strippedPrivacyQueryTotalCount: number;
    readonly autoplayOverrideBlockedCount: number;
    readonly allAcceptedHaveExternalLink: boolean;
    readonly anyAutoplayAllowed: false;
  };
}

export type ReferencePlayerLifecycleState =
  | 'idle-unmounted'
  | 'loaded-manual'
  | 'fallback-external-only'
  | 'blocked-url';

export type ReferencePlayerRuntimeFailureKind =
  | 'embed-blocked-by-publisher'
  | 'playback-network-or-media-error'
  | 'unsupported-embed-policy';

export interface SyntheticIframeFixtureDescriptor {
  readonly mode: 'local-synthetic-fixture' | 'production-nocookie';
  readonly iframeSrc: string;
  readonly canonicalEmbedUrl: string;
  readonly videoId: string;
  readonly startSec: number;
  readonly endSec: number | null;
  readonly autoplayParam: '0';
  readonly relParam: '0';
  readonly allowAttribute: 'encrypted-media; gyroscope; picture-in-picture';
  readonly referrerPolicy: 'strict-origin-when-cross-origin';
  readonly sandboxAttribute: 'allow-scripts allow-same-origin allow-presentation';
  readonly externalOriginalUrl: string;
}

export interface ReferencePlayerDisplaySnapshot {
  readonly subjectId: string;
  readonly activeItemId: string | null;
  readonly state: ReferencePlayerLifecycleState;
  readonly iframeMounted: boolean;
  readonly userClickVerified: boolean;
  readonly failureKind: ReferencePlayerRuntimeFailureKind | null;
  readonly statusNoticeKo: string;
  readonly effectiveDisplayMode: ReferenceDisplayMode;
  readonly canonicalExternalUrl: string | null;
  readonly externalLinkLabelKo: string;
  readonly syntheticIframe: SyntheticIframeFixtureDescriptor | null;
}

export interface CatalogSampleAuditSummary {
  readonly auditedInMemoryOnly: true;
  readonly networkRequestsMade: 0;
  readonly videosDownloaded: 0;
  readonly accessBlocksBypassed: 0;
  readonly exercisesCount: number;
  readonly verifiedReferencesCount: number;
  readonly verifiedWebsiteOnlyCount: number;
  readonly verifiedYoutubeCandidateCount: number;
  readonly publicPortalReferencesCount: number;
  readonly courseReferencesCount: number;
  readonly curatedYoutubePoolCount: number;
  readonly motionCandidateResearchCount: number;
  readonly allSamplesPassSchemeCheck: boolean;
  readonly allWebsitesAndPortalsSeparatedAsExternalOnly: boolean;
  readonly allYoutubeEmbedsEnforceNoAutoplayAndNocookie: boolean;
  readonly observationPointsNeverTransplantedAsSeekParams: boolean;
}
