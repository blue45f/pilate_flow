import { z } from 'zod';
import {
  KOREAN_VOICE_SPEED_OPTIONS,
  type CrediblePublicMediaSource,
  type EmbedResolution,
  type KoreanVoicePlaybackSpeed,
  type MediaComplianceAudit,
} from '../types/movementMediaGuidance';

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const FORBIDDEN_PAID_VOICE_TOKENS = [
  'elevenlabs.io',
  'api.elevenlabs.io',
  'texttospeech.googleapis.com',
  'api.openai.com/v1/audio/speech',
  'polly.',
  'amazonaws.com/polly',
  'naveropenapi.apigw.ntruss.com',
  'clova.ai',
  'typecast.ai',
  'tts.speech.microsoft.com',
  'play.ht',
  'murf.ai',
  'supertone',
] as const;

const FORBIDDEN_VIDEO_DOWNLOADER_TOKENS = [
  'y2mate',
  'savefrom',
  'ssyoutube',
  'ytmp3',
  'yt1s',
  'snaptube',
  'yt-dlp',
  'loader.to',
  'keepvid',
  '9xbuddy',
  'savemp3',
] as const;

const RAW_MEDIA_BINARY_PATH_PATTERN = /\.(?:mp4|webm|mkv|avi|mov|mp3|wav|m4a|ogg)(?:$|[?#&])/i;
const RAW_MEDIA_BINARY_QUERY_PATTERN =
  /(?:[?&](?:format|ext|type|container)=(?:mp4|webm|mkv|avi|mov|mp3|wav|m4a|ogg)\b|[?&]mime=(?:video|audio)(?:%2f|\/)|\.(?:mp4|webm|mkv|avi|mov|mp3|wav|m4a|ogg)\b)/i;

export const koreanVoiceSpeedSchema = z.union([
  z.literal(KOREAN_VOICE_SPEED_OPTIONS[0]),
  z.literal(KOREAN_VOICE_SPEED_OPTIONS[1]),
  z.literal(KOREAN_VOICE_SPEED_OPTIONS[2]),
  z.literal(KOREAN_VOICE_SPEED_OPTIONS[3]),
  z.literal(KOREAN_VOICE_SPEED_OPTIONS[4]),
]);

export function isValidKoreanVoiceSpeed(value: unknown): value is KoreanVoicePlaybackSpeed {
  return koreanVoiceSpeedSchema.safeParse(value).success;
}

export type ForbiddenMediaCategory =
  | 'paid-voice-api'
  | 'unauthorized-video-download'
  | 'redistributed-media-binary';

export interface ForbiddenMediaCheckResult {
  readonly forbidden: boolean;
  readonly reasonKo: string | null;
  readonly category: ForbiddenMediaCategory | null;
}

export function detectForbiddenPaidVoiceOrDownloadUrl(input: string): ForbiddenMediaCheckResult {
  if (typeof input !== 'string') {
    return { forbidden: false, reasonKo: null, category: null };
  }

  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return { forbidden: false, reasonKo: null, category: null };
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(normalized);
  } catch {
    decoded = normalized;
  }

  for (const token of FORBIDDEN_PAID_VOICE_TOKENS) {
    if (normalized.includes(token) || decoded.includes(token)) {
      return {
        forbidden: true,
        reasonKo:
          '유료 외부 음성합성(TTS) API는 사용할 수 없습니다. 브라우저·기기 내장 무료 한국어 음성(Web Speech API)만 허용됩니다.',
        category: 'paid-voice-api',
      };
    }
  }

  for (const token of FORBIDDEN_VIDEO_DOWNLOADER_TOKENS) {
    if (normalized.includes(token) || decoded.includes(token)) {
      return {
        forbidden: true,
        reasonKo:
          '비공식 영상 다운로더·추출기 경로는 저작권 및 플랫폼 이용약관 준수를 위해 차단됩니다.',
        category: 'unauthorized-video-download',
      };
    }
  }

  if (
    RAW_MEDIA_BINARY_PATH_PATTERN.test(normalized) ||
    RAW_MEDIA_BINARY_PATH_PATTERN.test(decoded) ||
    RAW_MEDIA_BINARY_QUERY_PATTERN.test(normalized) ||
    RAW_MEDIA_BINARY_QUERY_PATTERN.test(decoded)
  ) {
    return {
      forbidden: true,
      reasonKo:
        '원본 영상·음성 바이너리 파일(.mp4, .mp3 등)의 직접 호스팅·재배포는 허용되지 않습니다. 공식 플레이어 또는 외부 원본 링크만 사용하세요.',
      category: 'redistributed-media-binary',
    };
  }

  return {
    forbidden: false,
    reasonKo: null,
    category: null,
  };
}

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      return true;
    }
  }
  return false;
}

export function validateSafeExternalReferenceUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048 || hasControlCharacters(trimmed)) {
    return null;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  if (detectForbiddenPaidVoiceOrDownloadUrl(trimmed).forbidden) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || parsed.username || parsed.password) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

export function buildPermittedYouTubeNocookieEmbedUrl(
  videoId: string,
  startSec?: number | null,
  endSec?: number | null,
): string | null {
  if (typeof videoId !== 'string') return null;
  const trimmedId = videoId.trim();
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(trimmedId)) {
    return null;
  }

  const safeStart =
    typeof startSec === 'number' && Number.isFinite(startSec) && startSec > 0
      ? Math.floor(startSec)
      : 0;

  const params = new URLSearchParams();
  params.set('rel', '0');
  params.set('autoplay', '0');

  if (safeStart > 0) {
    params.set('start', String(safeStart));
  }

  if (typeof endSec === 'number' && Number.isFinite(endSec)) {
    const safeEnd = Math.floor(endSec);
    if (safeEnd > safeStart) {
      params.set('end', String(safeEnd));
    }
  }

  return `https://www.youtube-nocookie.com/embed/${trimmedId}?${params.toString()}`;
}

export function isPermittedEmbedUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || hasControlCharacters(trimmed)) return false;
  if (detectForbiddenPaidVoiceOrDownloadUrl(trimmed).forbidden) {
    return false;
  }
  if (/autoplay=(?!0(?:&|$))/i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname.toLowerCase() !== 'www.youtube-nocookie.com' ||
      parsed.username ||
      parsed.password ||
      parsed.port
    ) {
      return false;
    }

    const match = parsed.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})$/);
    if (!match) {
      return false;
    }

    const autoplayValues = parsed.searchParams.getAll('autoplay');
    const relValues = parsed.searchParams.getAll('rel');
    if (
      autoplayValues.length !== 1 ||
      autoplayValues[0] !== '0' ||
      relValues.length !== 1 ||
      relValues[0] !== '0'
    ) {
      return false;
    }

    for (const [key, val] of parsed.searchParams.entries()) {
      if (key === 'autoplay' || key === 'rel') continue;
      if (key === 'start' || key === 'end') {
        if (!/^\d+$/.test(val)) return false;
        continue;
      }
      return false;
    }

    const startParam = parsed.searchParams.get('start');
    const endParam = parsed.searchParams.get('end');
    if (startParam !== null && endParam !== null && Number(endParam) <= Number(startParam)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function resolvePermittedEmbed(
  source: Pick<
    CrediblePublicMediaSource,
    'provider' | 'embedPolicy' | 'youtubeVideoId' | 'url' | 'startSec' | 'endSec' | 'publisher'
  >,
): EmbedResolution {
  const validYoutubeId =
    typeof source.youtubeVideoId === 'string' &&
    YOUTUBE_VIDEO_ID_PATTERN.test(source.youtubeVideoId.trim())
      ? source.youtubeVideoId.trim()
      : null;

  const validatedUrl = validateSafeExternalReferenceUrl(source.url);
  const fallbackYoutubeWatchUrl = validYoutubeId
    ? `https://www.youtube.com/watch?v=${validYoutubeId}`
    : null;
  const externalOriginalUrl = validatedUrl ?? fallbackYoutubeWatchUrl ?? '';

  if (!externalOriginalUrl) {
    return Object.freeze({
      allowed: false,
      policy: 'invalid-or-blocked',
      embedUrl: null,
      externalOriginalUrl: '',
      externalLinkLabelKo: '유효한 원본 링크 없음',
      reasonKo: '유효하지 않거나 정책상 차단된 출처 URL이므로 임베드 및 외부 이동이 비활성화되었습니다.',
    });
  }

  if (
    source.provider === 'youtube' &&
    source.embedPolicy === 'youtube-nocookie-allowed' &&
    validYoutubeId
  ) {
    const embedUrl = buildPermittedYouTubeNocookieEmbedUrl(
      validYoutubeId,
      source.startSec,
      source.endSec,
    );
    if (embedUrl && isPermittedEmbedUrl(embedUrl)) {
      return Object.freeze({
        allowed: true,
        policy: 'youtube-nocookie-allowed',
        embedUrl,
        externalOriginalUrl,
        externalLinkLabelKo: 'YouTube 외부 원본 보기',
        reasonKo:
          '공식 YouTube 개인정보 보호 모드(youtube-nocookie) 수동 임베드 허용 · 외부 원본 링크 상시 제공',
      });
    }
  }

  return Object.freeze({
    allowed: false,
    policy: 'external-link-only',
    embedUrl: null,
    externalOriginalUrl,
    externalLinkLabelKo: '외부 원본 보기',
    reasonKo: '원본 링크 전용 출처(외부 임베드 비허용) · 새 창에서 외부 원본 보기로 확인하세요.',
  });
}

const FROZEN_COMPLIANCE_AUDIT: MediaComplianceAudit = Object.freeze({
  usesPaidVoiceApi: false,
  usesUnauthorizedVideoDownload: false,
  usesRedistributedMediaBinary: false,
  autoPlaysOnEntryOrSwitch: false,
  externalOriginalLinkAlwaysPresent: true,
});

export function createMediaComplianceAudit(): MediaComplianceAudit {
  return FROZEN_COMPLIANCE_AUDIT;
}
