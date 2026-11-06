/**
 * Movement Media Reference & Korean Voice Narration Contracts.
 *
 * Scope: Media-specific module types only.
 * Does NOT modify shared store, AI server, or global styles.
 */

export type PublicMediaPublisherType =
  | 'official-federation'
  | 'public-health-nhs'
  | 'public-institution-kr'
  | 'certified-instructor-channel'
  | 'education-foundation'
  | 'instructor-curated-reference';

export type PublicMediaProvider =
  | 'youtube'
  | 'official-website'
  | 'public-portal'
  | 'clinical-pdf';

export type MediaEmbedPolicy = 'youtube-nocookie-allowed' | 'external-link-only';

export type MediaMatchTier =
  | 'exact-source-snapshot'
  | 'verified-catalog-match'
  | 'clinical-pattern-source'
  | 'curated-youtube-reference'
  | 'public-education-portal';

export type EmbedPlaybackState =
  | 'idle'
  | 'loaded'
  | 'embed-blocked'
  | 'playback-failed';

export interface MediaComplianceAudit {
  readonly usesPaidVoiceApi: false;
  readonly usesUnauthorizedVideoDownload: false;
  readonly usesRedistributedMediaBinary: false;
  readonly autoPlaysOnEntryOrSwitch: false;
  readonly externalOriginalLinkAlwaysPresent: true;
}

export interface EmbedResolution {
  readonly allowed: boolean;
  readonly policy: MediaEmbedPolicy | 'invalid-or-blocked';
  /**
   * Only populated when allowed === true.
   * Must strictly use https://www.youtube-nocookie.com/embed/{videoId} with autoplay=0 and rel=0.
   */
  readonly embedUrl: string | null;
  /**
   * Always populated with a valid external http(s) URL so the user can open the original source
   * before loading, during playback, when embedding is disallowed, or when playback fails.
   */
  readonly externalOriginalUrl: string;
  readonly externalLinkLabelKo: string;
  readonly reasonKo: string;
}

export interface CrediblePublicMediaSource {
  readonly sourceId: string;
  readonly titleKo: string;
  readonly originalTitle: string;
  readonly publisher: string;
  readonly publisherType: PublicMediaPublisherType;
  readonly provider: PublicMediaProvider;
  readonly region: 'kr' | 'global';
  readonly languageLabelKo: string;
  readonly url: string;
  readonly embedPolicy: MediaEmbedPolicy;
  readonly youtubeVideoId: string | null;
  readonly startSec: number | null;
  readonly endSec: number | null;
  readonly observationPoints: readonly {
    readonly seconds: number;
    readonly note: string;
  }[];
  readonly verificationStatusLabelKo: string;
  readonly verifiedAt: string | null;
  readonly rightsNoteKo: string;
  readonly safetyDisclaimerKo: string;
}

export interface MovementMediaMatch {
  readonly matchId: string;
  readonly exerciseId: string;
  readonly matchTier: MediaMatchTier;
  readonly matchTierLabelKo: string;
  readonly matchReasonKo: string;
  /** Honest provenance boundary: references are not certified exact canonical demonstrations. */
  readonly isExactDemonstration: boolean;
  readonly source: CrediblePublicMediaSource;
  readonly embedResolution: EmbedResolution;
}

export interface MovementMediaBundle {
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly exerciseNameEn: string;
  readonly primaryMatch: MovementMediaMatch;
  readonly matches: readonly MovementMediaMatch[];
  readonly compliance: MediaComplianceAudit;
}

export type KoreanVoiceNarrationSection =
  | 'overview'
  | 'setup'
  | 'breath'
  | 'cues'
  | 'layers'
  | 'precautions';

export interface KoreanVoiceSegment {
  readonly id: string;
  readonly index: number;
  readonly section: KoreanVoiceNarrationSection;
  readonly labelKo: string;
  readonly textKo: string;
}

export interface KoreanVoiceScript {
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly summaryTitleKo: string;
  readonly fullTextKo: string;
  readonly segments: readonly KoreanVoiceSegment[];
  readonly estimatedDurationSec: number;
  readonly disclaimerKo: string;
}

export const KOREAN_VOICE_SPEED_OPTIONS = [0.75, 0.9, 1, 1.15, 1.25] as const;

export type KoreanVoicePlaybackSpeed = (typeof KOREAN_VOICE_SPEED_OPTIONS)[number];

export type KoreanVoicePlaybackStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'unsupported'
  | 'error';

export type MobileTtsPlatformCategory =
  | 'ios-safari-webkit'
  | 'android-chromium'
  | 'desktop-browser'
  | 'unsupported-env';

export type KoreanVoiceAvailabilityStatus =
  | 'korean-local-voice'
  | 'korean-network-voice'
  | 'os-default-ko-fallback'
  | 'voices-loading-async'
  | 'no-tts-engine';

export interface MobileTtsCapabilityReport {
  readonly speechSynthesisSupported: boolean;
  readonly utteranceSupported: boolean;
  readonly canAttemptSpeech: boolean;
  readonly platformCategory: MobileTtsPlatformCategory;
  readonly platformLabelKo: string;
  readonly koreanVoiceStatus: KoreanVoiceAvailabilityStatus;
  readonly selectedVoiceName: string | null;
  readonly selectedVoiceLang: string;
  readonly isLocalFreeDeviceVoice: boolean;
  readonly requiresUserGesture: boolean;
  readonly pauseResumeStrategy:
    | 'native-with-segment-recovery'
    | 'segment-restart-fallback'
    | 'text-only-fallback';
  readonly summaryLabelKo: string;
  readonly detailNoteKo: string;
}

export interface KoreanVoiceControllerState {
  readonly exerciseId: string;
  readonly status: KoreanVoicePlaybackStatus;
  readonly speed: KoreanVoicePlaybackSpeed;
  readonly activeSegmentIndex: number;
  readonly activeSection: KoreanVoiceNarrationSection | 'all';
  readonly errorMessageKo: string | null;
  readonly announcementKo: string;
  readonly capability: MobileTtsCapabilityReport;
}

export interface KoreanVoiceController {
  getState: () => KoreanVoiceControllerState;
  play: (section?: KoreanVoiceNarrationSection | 'all') => boolean;
  pause: () => void;
  resume: () => boolean;
  stop: (reasonKo?: string) => void;
  setSpeed: (speed: KoreanVoicePlaybackSpeed) => void;
  speakSegment: (segmentIndex: number) => boolean;
  refreshCapability: () => MobileTtsCapabilityReport;
  destroy: () => void;
}
