import {
  REFERENCE_LINK_POLICY_CANDIDATE_SCOPE,
  type DeduplicatedDuplicateDiagnostic,
  type EvaluatedReferenceLinkItem,
  type ExerciseReferenceLinkPolicyReport,
  type NormalizeReferenceUrlOptions,
  type NormalizedReferenceLinkResult,
  type ReferenceEmbedPolicyHint,
  type ReferenceLinkCandidateInput,
  type ReferenceLinkPolicyEvaluationOptions,
  type ReferenceLinkRejectionCode,
  type ReferenceSourceTier,
  type RejectedReferenceLinkDiagnostic,
  type StrippedQueryCategory,
  type StrippedQueryDiagnostic,
} from './types';

const MAX_URL_LENGTH = 2048;
const MAX_VIDEO_SECONDS = 24 * 3600;
const YOUTUBE_VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_WATCH_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
]);

const YOUTUBE_SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);

const YOUTUBE_NOCOOKIE_HOSTS = new Set([
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const ALL_YOUTUBE_HOSTS = new Set([
  ...YOUTUBE_WATCH_HOSTS,
  ...YOUTUBE_SHORT_HOSTS,
  ...YOUTUBE_NOCOOKIE_HOSTS,
]);

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
  'cobalt.tools',
] as const;

const RAW_MEDIA_BINARY_PATH_REGEX =
  /\.(?:mp4|webm|mkv|avi|mov|mp3|wav|m4a|ogg|flv|m3u8)(?:$|[?#&])/i;
const RAW_MEDIA_BINARY_QUERY_REGEX =
  /(?:[?&](?:format|ext|type|container)=(?:mp4|webm|mkv|avi|mov|mp3|wav|m4a|ogg|flv|m3u8)\b|[?&]mime=(?:video|audio)(?:%2f|\/)|\.(?:mp4|webm|mkv|avi|mov|mp3|wav|m4a|ogg|flv|m3u8)\b)/i;

const TRACKING_QUERY_KEYS = new Set([
  'gclid',
  'gclsrc',
  'dclid',
  'fbclid',
  'msclkid',
  'twclid',
  'ttclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'yclid',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  'mkt_tok',
  'vero_id',
  'oly_enc_id',
  'oly_anon_id',
  'rb_clickid',
  's_kwcid',
  'spm',
  'scm',
  'ref_src',
  'ref_url',
]);

const SESSION_OR_SHARE_QUERY_KEYS = new Set([
  'si',
  'feature',
  'pp',
  'ab_channel',
  'app',
  'persist_app',
  'attribution_link',
  'embeds_referring_euri',
  'embeds_referring_origin',
  'source_ve_path',
  'ved',
  'ei',
  'uact',
  'sxsrf',
  'opi',
  'session',
  'session_id',
  'sessionid',
  'phpsessid',
  'jsessionid',
  'sid',
  'client_id',
  'device_id',
]);

const PII_QUERY_KEYS = new Set([
  'email',
  'user_email',
  'u_email',
  'mail',
  'phone',
  'tel',
  'mobile',
  'name',
  'user_name',
  'username',
  'realname',
  'full_name',
  'user_id',
  'userid',
  'uid',
  'member_id',
  'student_id',
  'instructor_id',
  'account_id',
  'token',
  'access_token',
  'id_token',
  'refresh_token',
  'auth',
  'auth_token',
  'api_key',
  'apikey',
  'secret',
  'password',
  'passwd',
  'pwd',
  'ssn',
  'resident_id',
  'birth',
  'dob',
  'lat',
  'lng',
  'latitude',
  'longitude',
]);

const EMAIL_VALUE_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_VALUE_REGEX =
  /(?:^|[^\d])(?:01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}|\+\d{1,3}[-\s.]?\d{2,4}[-\s.]?\d{3,4}[-\s.]?\d{4})(?:$|[^\d])/;
const JWT_OR_SECRET_VALUE_REGEX =
  /(?:^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}$|bearer\s+[a-z0-9._~+/=-]{12,}|sk-[a-z0-9]{16,}|ghp_[a-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,})/i;

const TIER_PRIORITY: Readonly<Record<ReferenceSourceTier, number>> = Object.freeze({
  'exact-source-snapshot': 1,
  'direct-exercise-youtube': 2,
  'verified-catalog-reference': 3,
  'curated-youtube-pool': 4,
  'motion-candidate-research': 5,
  'course-reference-link-only': 6,
  'public-education-portal': 7,
  'custom-instructor-input': 8,
});

export const TIER_LABELS_KO: Readonly<Record<ReferenceSourceTier, string>> = Object.freeze({
  'exact-source-snapshot': '보존된 원출처 스냅샷',
  'direct-exercise-youtube': '동작 직접 연결 YouTube 참조',
  'verified-catalog-reference': '검증 출처 카탈로그',
  'curated-youtube-pool': '오엠베드(oEmbed) 확인 YouTube 풀',
  'motion-candidate-research': '별도 본문 사실 조사 출처',
  'course-reference-link-only': '수업 흐름 링크 전용 자료',
  'public-education-portal': '국내 공공 체육·건강 포털',
  'custom-instructor-input': '강사 직접 입력 링크',
});

function hasUnsafeControlOrFormatChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (
      code <= 0x1f ||
      (code >= 0x7f && code <= 0x9f) ||
      (code >= 0x200b && code <= 0x200d) ||
      code === 0xfeff ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
    ) {
      return true;
    }
  }
  return false;
}

function safeDecodeOnce(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeForSchemeInspection(raw: string): string {
  const htmlEntityDecoded = raw.replace(
    /&#(?:x([0-9a-f]+)|(\d+));?/gi,
    (_, hex: string | undefined, dec: string | undefined) => {
      const code = hex ? Number.parseInt(hex, 16) : Number.parseInt(dec ?? '0', 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : '';
    },
  );
  const once = safeDecodeOnce(htmlEntityDecoded);
  const twice = safeDecodeOnce(once);
  let out = '';
  for (let i = 0; i < twice.length; i += 1) {
    const code = twice.charCodeAt(i);
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f) || /\s/.test(twice[i])) {
      continue;
    }
    out += twice[i];
  }
  return out.toLowerCase();
}

const MALICIOUS_OR_DISALLOWED_SCHEME_PREFIX_REGEX =
  /^(?:javascript|data|vbscript|file|blob|about|chrome|edge|view-source|intent|ws|wss|ftp|sftp|mailto|tel|sms|geo|market|itms-apps|web\+a-z0-9):/i;

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '::' ||
    host === '0:0:0:0:0:0:0:1'
  ) {
    return true;
  }

  // Reject all raw IPv6 literals (including loopback ::1, link-local fe80::, unique-local fc00::/fd00::, and IPv4-mapped ::ffff:7f00:1)
  if (host.includes(':')) {
    return true;
  }

  // IPv4 check
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some((n) => n < 0 || n > 255)) return true;
    const [a, b] = octets;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return true;
    }
    return true; // Reject raw IPv4 literals for public reference links
  }

  // Reject single-label hostnames without a public TLD dot
  if (!host.includes('.')) {
    return true;
  }

  return false;
}

function hasExplicitPortInAuthority(rawUrl: string): boolean {
  const match = rawUrl.match(/^https?:\/\/([^/?#]+)/i);
  if (!match) return false;
  const authority = match[1];
  const hostPort = authority.includes('@') ? authority.split('@').pop()! : authority;
  if (hostPort.startsWith('[')) {
    const closeIdx = hostPort.indexOf(']');
    if (closeIdx === -1) return false;
    return hostPort.slice(closeIdx + 1).startsWith(':');
  }
  return /:\d+$/.test(hostPort);
}

function classifyQueryKeyToStrip(
  rawKey: string,
  rawValue: string,
): StrippedQueryCategory | null {
  const key = rawKey.trim().toLowerCase();
  if (!key) return null;

  if (key === 'autoplay') {
    const val = rawValue.trim().toLowerCase();
    return val === '0' ? 'session-or-share' : 'autoplay-override';
  }

  if (key.startsWith('utm_') || TRACKING_QUERY_KEYS.has(key)) {
    return 'tracking';
  }

  if (SESSION_OR_SHARE_QUERY_KEYS.has(key)) {
    return 'session-or-share';
  }

  if (PII_QUERY_KEYS.has(key)) {
    return 'pii-key';
  }

  const trimmedVal = rawValue.trim();
  if (
    trimmedVal &&
    (EMAIL_VALUE_REGEX.test(trimmedVal) ||
      PHONE_VALUE_REGEX.test(trimmedVal) ||
      JWT_OR_SECRET_VALUE_REGEX.test(trimmedVal))
  ) {
    return 'pii-value';
  }

  return null;
}

export function parseYouTubeTimeParamSeconds(raw: unknown): number | null {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return null;
    const floored = Math.floor(raw);
    return floored <= MAX_VIDEO_SECONDS ? floored : null;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  if (/^\d+$/.test(text)) {
    const sec = Number.parseInt(text, 10);
    return sec >= 0 && sec <= MAX_VIDEO_SECONDS ? sec : null;
  }

  const hmsMatch = text.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)$/);
  if (hmsMatch && (hmsMatch[1] || hmsMatch[2] || hmsMatch[3])) {
    const h = hmsMatch[1] ? Number.parseInt(hmsMatch[1], 10) : 0;
    const m = hmsMatch[2] ? Number.parseInt(hmsMatch[2], 10) : 0;
    const s = hmsMatch[3] ? Number.parseInt(hmsMatch[3], 10) : 0;
    const total = h * 3600 + m * 60 + s;
    return total >= 0 && total <= MAX_VIDEO_SECONDS ? total : null;
  }

  return null;
}

function buildRejectedResult(
  rejectionCode: ReferenceLinkRejectionCode,
  reasonKo: string,
  strippedQueryParams: readonly StrippedQueryDiagnostic[] = [],
  hadAutoplayOverrideAttempt = false,
): NormalizedReferenceLinkResult {
  const frozenParams = Object.freeze(
    strippedQueryParams.map((item) => Object.freeze({ ...item })),
  );
  const frozenKeys = Object.freeze(
    Array.from(new Set(frozenParams.map((item) => item.key))),
  );
  return Object.freeze({
    ok: false,
    displayMode: 'blocked',
    provider: 'blocked',
    hostname: null,
    canonicalExternalUrl: null,
    embedUrl: null,
    localSyntheticFixtureUrl: null,
    youtubeVideoId: null,
    startSec: null,
    endSec: null,
    deduplicationKey: null,
    videoLevelDeduplicationKey: null,
    embedAllowed: false,
    autoplayPrevented: true,
    requiresExplicitUserClick: true,
    externalLinkAlwaysProvided: false,
    strippedQueryParams: frozenParams,
    strippedQueryKeys: frozenKeys,
    hadAutoplayOverrideAttempt,
    rejectionCode,
    reasonKo,
    externalLinkLabelKo: '차단된 링크 (열기 불가)',
    externalLinkRel: 'noopener noreferrer',
    externalLinkTarget: '_blank',
    iframeAllowAttr: 'encrypted-media; gyroscope; picture-in-picture',
    iframeReferrerPolicy: 'strict-origin-when-cross-origin',
  });
}

export function buildLocalSyntheticIframeFixtureUrl(
  videoId: string,
  startSec = 0,
  endSec: number | null = null,
): string {
  const params = new URLSearchParams();
  params.set('videoId', videoId);
  params.set('rel', '0');
  params.set('autoplay', '0');
  if (startSec > 0) {
    params.set('start', String(startSec));
  }
  if (typeof endSec === 'number' && endSec > startSec) {
    params.set('end', String(endSec));
  }
  return `/src/features/referenceLinkPolicyCandidate/syntheticEmbedFrame.html?${params.toString()}`;
}

export function normalizeReferenceUrlPolicy(
  rawInput: unknown,
  options: NormalizeReferenceUrlOptions = {},
): NormalizedReferenceLinkResult {
  if (typeof rawInput !== 'string') {
    return buildRejectedResult(
      'invalid-input-type',
      '문자열 형식의 URL 입력만 허용됩니다.',
    );
  }

  if (hasUnsafeControlOrFormatChars(rawInput)) {
    return buildRejectedResult(
      'control-characters',
      '제어 문자 또는 양방향 유니코드 조작 문자가 포함된 URL은 보안 정책상 차단됩니다.',
    );
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return buildRejectedResult('empty-url', '비어 있는 URL은 사용할 수 없습니다.');
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return buildRejectedResult(
      'max-length-exceeded',
      `URL 길이가 허용 한도(${MAX_URL_LENGTH}자)를 초과하여 차단되었습니다.`,
    );
  }

  if (trimmed.startsWith('//') || trimmed.startsWith('/') || trimmed.startsWith('.')) {
    return buildRejectedResult(
      'protocol-relative-or-relative',
      '프로토콜 상대 경로(//)나 로컬 상대 경로는 외부 참고 링크로 허용되지 않습니다.',
    );
  }

  const schemeNormalized = normalizeForSchemeInspection(trimmed);
  if (
    MALICIOUS_OR_DISALLOWED_SCHEME_PREFIX_REGEX.test(schemeNormalized) ||
    (!/^https?:\/\//i.test(trimmed) && /^[a-z][a-z0-9+.-]*:/i.test(trimmed))
  ) {
    return buildRejectedResult(
      'malicious-scheme',
      '허용되지 않거나 위험한 프로토콜 스킴(javascript:, data:, file:, blob: 등)이 감지되어 차단되었습니다.',
    );
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return buildRejectedResult(
      'malformed-url',
      '명시적인 http:// 또는 https:// 스킴으로 시작하는 유효한 URL이어야 합니다.',
    );
  }

  const lowerTrimmed = trimmed.toLowerCase();
  const decodedLower = safeDecodeOnce(lowerTrimmed);

  for (const token of FORBIDDEN_PAID_VOICE_TOKENS) {
    if (lowerTrimmed.includes(token) || decodedLower.includes(token)) {
      return buildRejectedResult(
        'paid-voice-api',
        '유료 외부 음성합성(TTS) API 경로는 정책상 차단됩니다.',
      );
    }
  }

  for (const token of FORBIDDEN_VIDEO_DOWNLOADER_TOKENS) {
    if (lowerTrimmed.includes(token) || decodedLower.includes(token)) {
      return buildRejectedResult(
        'unauthorized-video-downloader',
        '비공식 영상 추출기·다운로더 도메인은 저작권 및 약관 준수를 위해 차단됩니다.',
      );
    }
  }

  if (
    RAW_MEDIA_BINARY_PATH_REGEX.test(lowerTrimmed) ||
    RAW_MEDIA_BINARY_PATH_REGEX.test(decodedLower) ||
    RAW_MEDIA_BINARY_QUERY_REGEX.test(lowerTrimmed) ||
    RAW_MEDIA_BINARY_QUERY_REGEX.test(decodedLower)
  ) {
    return buildRejectedResult(
      'raw-media-binary',
      '원본 영상·음성 바이너리 파일(.mp4, .webm, .mp3 등) 직접 다운로드·호스팅 경로는 차단됩니다.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return buildRejectedResult('malformed-url', '구문이 손상된 URL입니다.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return buildRejectedResult(
      'malicious-scheme',
      'http: 또는 https: 이외의 프로토콜은 허용되지 않습니다.',
    );
  }

  if (parsed.username || parsed.password) {
    return buildRejectedResult(
      'embedded-credentials',
      '자격 증명(username:password)이 포함된 URL은 보안상 차단됩니다.',
    );
  }

  if (parsed.port || hasExplicitPortInAuthority(trimmed)) {
    return buildRejectedResult(
      'disallowed-port',
      '비표준 또는 명시적 포트 번호가 포함된 URL은 허용되지 않습니다.',
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateOrLocalHostname(hostname)) {
    return buildRejectedResult(
      'private-or-local-host',
      '로컬호스트·사설 IP·내부망 주소는 공개 참고 자료 링크로 사용할 수 없습니다.',
    );
  }

  const strippedDiagnostics: StrippedQueryDiagnostic[] = [];
  let hadAutoplayOverrideAttempt = false;

  // Check if host is a YouTube host
  if (ALL_YOUTUBE_HOSTS.has(hostname)) {
    let videoId: string | null = null;
    let isNonVideoYoutubePage = false;

    if (YOUTUBE_SHORT_HOSTS.has(hostname)) {
      const m = parsed.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
      if (!m) {
        return buildRejectedResult(
          'invalid-youtube-target',
          '유효한 11자리 YouTube 영상 ID가 없는 단축 링크입니다.',
        );
      }
      videoId = m[1];
    } else if (YOUTUBE_NOCOOKIE_HOSTS.has(hostname)) {
      const m = parsed.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})\/?$/);
      if (!m) {
        return buildRejectedResult(
          'invalid-youtube-target',
          '유효한 11자리 YouTube 영상 ID가 없는 임베드 링크입니다.',
        );
      }
      videoId = m[1];
    } else {
      // youtube.com / www.youtube.com / m.youtube.com / music.youtube.com
      if (parsed.pathname === '/watch') {
        const rawV = parsed.searchParams.get('v');
        if (!rawV || !YOUTUBE_VIDEO_ID_REGEX.test(rawV)) {
          return buildRejectedResult(
            'invalid-youtube-target',
            'YouTube watch 링크에 유효한 11자리 영상 ID(v 파라미터)가 없습니다.',
          );
        }
        videoId = rawV;
      } else {
        const pathMatch = parsed.pathname.match(
          /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/,
        );
        if (pathMatch) {
          videoId = pathMatch[1];
        } else if (/^\/(?:shorts|embed|live)(?:\/|$)/i.test(parsed.pathname)) {
          return buildRejectedResult(
            'invalid-youtube-target',
            'YouTube shorts/embed/live 경로에 유효한 11자리 영상 ID가 없습니다.',
          );
        } else if (
          /^\/(?:@[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]+|c\/[A-Za-z0-9_.-]+|user\/[A-Za-z0-9_.-]+|playlist|results|[A-Za-z0-9_.-]{3,80})\/?$/.test(
            parsed.pathname,
          )
        ) {
          isNonVideoYoutubePage = true;
        } else {
          return buildRejectedResult(
            'invalid-youtube-target',
            '단일 11자리 영상 ID를 확인할 수 없는 YouTube 경로입니다.',
          );
        }
      }
    }

    if (isNonVideoYoutubePage) {
      const retainedParams = new URLSearchParams();
      for (const [key, val] of parsed.searchParams.entries()) {
        const stripCategory = classifyQueryKeyToStrip(key, val);
        if (stripCategory) {
          if (stripCategory === 'autoplay-override') hadAutoplayOverrideAttempt = true;
          strippedDiagnostics.push({ key, category: stripCategory, valueRedacted: true });
        } else if (key === 'list' || key === 'search_query') {
          retainedParams.append(key, val);
        } else {
          strippedDiagnostics.push({
            key,
            category: 'unsupported-youtube-param',
            valueRedacted: true,
          });
        }
      }
      const querySuffix = retainedParams.toString() ? `?${retainedParams.toString()}` : '';
      const canonicalExternalUrl = `https://www.youtube.com${parsed.pathname.replace(/\/+$/, '')}${querySuffix}`;
      const frozenParams = Object.freeze(
        strippedDiagnostics.map((d) => Object.freeze({ ...d })),
      );
      const frozenKeys = Object.freeze(
        Array.from(new Set(frozenParams.map((d) => d.key))),
      );

      return Object.freeze({
        ok: true,
        displayMode: 'external-link-only',
        provider: 'youtube-non-video',
        hostname: 'www.youtube.com',
        canonicalExternalUrl,
        embedUrl: null,
        localSyntheticFixtureUrl: null,
        youtubeVideoId: null,
        startSec: null,
        endSec: null,
        deduplicationKey: `web::${canonicalExternalUrl.toLowerCase()}`,
        videoLevelDeduplicationKey: `web::${canonicalExternalUrl.toLowerCase()}`,
        embedAllowed: false,
        autoplayPrevented: true,
        requiresExplicitUserClick: true,
        externalLinkAlwaysProvided: true,
        strippedQueryParams: frozenParams,
        strippedQueryKeys: frozenKeys,
        hadAutoplayOverrideAttempt,
        rejectionCode: null,
        reasonKo:
          '개별 11자리 영상이 아닌 YouTube 채널·재생목록·검색 페이지이므로 인라인 임베드 없이 외부 링크로만 분리합니다.',
        externalLinkLabelKo: 'YouTube 외부 페이지 열기',
        externalLinkRel: 'noopener noreferrer',
        externalLinkTarget: '_blank',
        iframeAllowAttr: 'encrypted-media; gyroscope; picture-in-picture',
        iframeReferrerPolicy: 'strict-origin-when-cross-origin',
      });
    }

    // Valid 11-char YouTube videoId
    const validVideoId = videoId!;
    let queryStartSec: number | null = null;
    let queryEndSec: number | null = null;

    for (const [key, val] of parsed.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'v' && parsed.pathname === '/watch') {
        continue;
      }
      if (lowerKey === 'rel' && val === '0') {
        continue;
      }
      const stripCategory = classifyQueryKeyToStrip(key, val);
      if (stripCategory) {
        if (stripCategory === 'autoplay-override') {
          hadAutoplayOverrideAttempt = true;
        }
        strippedDiagnostics.push({ key, category: stripCategory, valueRedacted: true });
        continue;
      }

      if ((lowerKey === 't' || lowerKey === 'start') && !options.forbidTimeSeekTransplant) {
        const parsedSec = parseYouTubeTimeParamSeconds(val);
        if (parsedSec !== null && parsedSec > 0) {
          queryStartSec = parsedSec;
        } else if (parsedSec === null) {
          strippedDiagnostics.push({
            key,
            category: 'unsupported-youtube-param',
            valueRedacted: true,
          });
        }
        continue;
      }

      if (lowerKey === 'end' && !options.forbidTimeSeekTransplant) {
        const parsedEnd = parseYouTubeTimeParamSeconds(val);
        if (parsedEnd !== null && parsedEnd > 0) {
          queryEndSec = parsedEnd;
        } else {
          strippedDiagnostics.push({
            key,
            category: 'unsupported-youtube-param',
            valueRedacted: true,
          });
        }
        continue;
      }

      strippedDiagnostics.push({
        key,
        category: 'unsupported-youtube-param',
        valueRedacted: true,
      });
    }

    const explicitStart = options.forbidTimeSeekTransplant
      ? null
      : parseYouTubeTimeParamSeconds(options.startSec);
    const explicitEnd = options.forbidTimeSeekTransplant
      ? null
      : parseYouTubeTimeParamSeconds(options.endSec);

    const resolvedStart =
      explicitStart !== null && explicitStart > 0
        ? explicitStart
        : queryStartSec !== null && queryStartSec > 0
          ? queryStartSec
          : null;

    const rawEnd = explicitEnd ?? queryEndSec;
    const resolvedEnd =
      rawEnd !== null && rawEnd > (resolvedStart ?? 0) ? rawEnd : null;

    const watchTimeSuffix = resolvedStart !== null ? `&t=${resolvedStart}s` : '';
    const canonicalExternalUrl = `https://www.youtube.com/watch?v=${validVideoId}${watchTimeSuffix}`;

    const embedAllowed = options.embedPolicy !== 'external-link-only';
    const embedParams = new URLSearchParams();
    embedParams.set('rel', '0');
    embedParams.set('autoplay', '0');
    if (resolvedStart !== null) {
      embedParams.set('start', String(resolvedStart));
    }
    if (resolvedEnd !== null) {
      embedParams.set('end', String(resolvedEnd));
    }

    const embedUrl = embedAllowed
      ? `https://www.youtube-nocookie.com/embed/${validVideoId}?${embedParams.toString()}`
      : null;

    const localSyntheticFixtureUrl = embedAllowed
      ? buildLocalSyntheticIframeFixtureUrl(
          validVideoId,
          resolvedStart ?? 0,
          resolvedEnd,
        )
      : null;

    const deduplicationKey = `youtube::${validVideoId}::${resolvedStart ?? 0}::${resolvedEnd ?? ''}`;
    const videoLevelDeduplicationKey = `youtube::${validVideoId}`;

    const frozenParams = Object.freeze(
      strippedDiagnostics.map((d) => Object.freeze({ ...d })),
    );
    const frozenKeys = Object.freeze(
      Array.from(new Set(frozenParams.map((d) => d.key))),
    );

    return Object.freeze({
      ok: true,
      displayMode: embedAllowed ? 'embed-with-external-link' : 'external-link-only',
      provider: 'youtube-video',
      hostname: 'www.youtube.com',
      canonicalExternalUrl,
      embedUrl,
      localSyntheticFixtureUrl,
      youtubeVideoId: validVideoId,
      startSec: resolvedStart,
      endSec: resolvedEnd,
      deduplicationKey,
      videoLevelDeduplicationKey,
      embedAllowed,
      autoplayPrevented: true,
      requiresExplicitUserClick: true,
      externalLinkAlwaysProvided: true,
      strippedQueryParams: frozenParams,
      strippedQueryKeys: frozenKeys,
      hadAutoplayOverrideAttempt,
      rejectionCode: null,
      reasonKo: embedAllowed
        ? '공식 YouTube 개인정보 강화 모드(youtube-nocookie, autoplay=0, rel=0) 수동 클릭 후 임베드 허용 · 외부 원본 링크 상시 제공'
        : '출처 권리·정책(link-only)에 따라 인라인 임베드를 분리하고 외부 원본 링크로만 제공합니다.',
      externalLinkLabelKo: 'YouTube 외부 원본 보기',
      externalLinkRel: 'noopener noreferrer',
      externalLinkTarget: '_blank',
      iframeAllowAttr: 'encrypted-media; gyroscope; picture-in-picture',
      iframeReferrerPolicy: 'strict-origin-when-cross-origin',
    });
  }

  // Non-YouTube external HTTP/HTTPS reference URL
  const cleanParams = new URLSearchParams();
  for (const [key, val] of parsed.searchParams.entries()) {
    const stripCategory = classifyQueryKeyToStrip(key, val);
    if (stripCategory) {
      if (stripCategory === 'autoplay-override') {
        hadAutoplayOverrideAttempt = true;
      }
      strippedDiagnostics.push({ key, category: stripCategory, valueRedacted: true });
      continue;
    }
    const lowerKey = key.toLowerCase();
    if (
      options.forbidTimeSeekTransplant &&
      (lowerKey === 't' || lowerKey === 'start' || lowerKey === 'end')
    ) {
      strippedDiagnostics.push({
        key,
        category: 'session-or-share',
        valueRedacted: true,
      });
      continue;
    }
    cleanParams.append(key, val);
  }

  const collapsedPathname = parsed.pathname.replace(/\/{2,}/g, '/') || '/';
  const dedupPathname =
    collapsedPathname === '/' ? '' : collapsedPathname.replace(/\/+$/, '');
  const queryString = cleanParams.toString();
  const canonicalExternalUrl = `${parsed.protocol}//${hostname}${collapsedPathname}${
    queryString ? `?${queryString}` : ''
  }`;
  const dedupTarget = `${hostname}${dedupPathname}${
    queryString ? `?${queryString}` : ''
  }`.toLowerCase();

  const frozenParams = Object.freeze(
    strippedDiagnostics.map((d) => Object.freeze({ ...d })),
  );
  const frozenKeys = Object.freeze(
    Array.from(new Set(frozenParams.map((d) => d.key))),
  );

  return Object.freeze({
    ok: true,
    displayMode: 'external-link-only',
    provider: 'external-web',
    hostname,
    canonicalExternalUrl,
    embedUrl: null,
    localSyntheticFixtureUrl: null,
    youtubeVideoId: null,
    startSec: null,
    endSec: null,
    deduplicationKey: `web::${dedupTarget}`,
    videoLevelDeduplicationKey: `web::${dedupTarget}`,
    embedAllowed: false,
    autoplayPrevented: true,
    requiresExplicitUserClick: true,
    externalLinkAlwaysProvided: true,
    strippedQueryParams: frozenParams,
    strippedQueryKeys: frozenKeys,
    hadAutoplayOverrideAttempt,
    rejectionCode: null,
    reasonKo:
      '공식 웹사이트·교육 포털·문서 출처는 인라인 iframe 임베드를 지원하지 않으며 외부 원본 링크로만 안전하게 분리합니다.',
    externalLinkLabelKo: '외부 원본 출처 열기',
    externalLinkRel: 'noopener noreferrer',
    externalLinkTarget: '_blank',
    iframeAllowAttr: 'encrypted-media; gyroscope; picture-in-picture',
    iframeReferrerPolicy: 'strict-origin-when-cross-origin',
  });
}

export function isStrictNoAutoplayEmbedUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  if (hasUnsafeControlOrFormatChars(url)) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return false;
  if (/autoplay=(?!0(?:&|$))/i.test(trimmed)) return false;

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
    if (!/^\/embed\/([A-Za-z0-9_-]{11})$/.test(parsed.pathname)) {
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
        const num = Number.parseInt(val, 10);
        if (num < 0 || num > MAX_VIDEO_SECONDS) return false;
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

function safeShortString(value: unknown, fallback: string, maxLen = 200): string {
  if (typeof value !== 'string') return fallback;
  let cleaned = '';
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    cleaned += code <= 0x1f || (code >= 0x7f && code <= 0x9f) ? ' ' : value[i];
  }
  const trimmed = cleaned.trim();
  return trimmed ? trimmed.slice(0, maxLen) : fallback;
}

function safeTier(value: unknown): ReferenceSourceTier {
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(TIER_PRIORITY, value)) {
    return value as ReferenceSourceTier;
  }
  return 'custom-instructor-input';
}

function safeEmbedPolicy(
  value: unknown,
  tier: ReferenceSourceTier,
): ReferenceEmbedPolicyHint {
  if (
    tier === 'course-reference-link-only' ||
    tier === 'public-education-portal' ||
    tier === 'motion-candidate-research'
  ) {
    return 'external-link-only';
  }
  if (
    value === 'youtube-nocookie-allowed' ||
    value === 'external-link-only' ||
    value === 'auto-detect'
  ) {
    return value;
  }
  return 'auto-detect';
}

export function evaluateReferenceLinkCandidates(
  subjectIdInput: unknown,
  subjectTitleInput: unknown,
  rawCandidates: unknown,
  options: ReferenceLinkPolicyEvaluationOptions = {},
): ExerciseReferenceLinkPolicyReport {
  const subjectId = safeShortString(subjectIdInput, 'unknown-subject', 120);
  const subjectTitleKo = safeShortString(subjectTitleInput, '동작 참고 링크 후보', 160);
  const maxScan =
    typeof options.maxScanItems === 'number' && options.maxScanItems > 0
      ? Math.min(5000, Math.floor(options.maxScanItems))
      : 500;
  const maxNormalized =
    typeof options.maxNormalizedItems === 'number' && options.maxNormalizedItems > 0
      ? Math.min(1000, Math.floor(options.maxNormalizedItems))
      : 100;
  const dedupByVideoIdOnly = Boolean(options.deduplicateByVideoIdRegardlessOfStart);

  const list = Array.isArray(rawCandidates) ? rawCandidates : [];
  const scanTruncated = list.length > maxScan;
  const sliceCount = Math.min(list.length, maxScan);

  interface PendingEvaluated {
    itemId: string;
    titleKo: string;
    publisherKo: string;
    tier: ReferenceSourceTier;
    tierPriority: number;
    region: 'kr' | 'global' | null;
    rightsNoteKo: string;
    normalized: NormalizedReferenceLinkResult;
    mergedDuplicateIds: string[];
  }

  const pendingList: PendingEvaluated[] = [];
  const rejectedDiagnostics: RejectedReferenceLinkDiagnostic[] = [];
  const deduplicatedDiagnostics: DeduplicatedDuplicateDiagnostic[] = [];
  const seenItemIds = new Set<string>();

  let strippedPrivacyQueryTotalCount = 0;
  let autoplayOverrideBlockedCount = 0;

  for (let idx = 0; idx < sliceCount; idx += 1) {
    const rawEntry = list[idx];
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
      rejectedDiagnostics.push(
        Object.freeze({
          itemId: `candidate-${idx + 1}`,
          titleKo: `잘못된 후보 항목 #${idx + 1}`,
          tier: 'custom-instructor-input',
          rejectionCode: 'invalid-input-type',
          reasonKo: '후보 항목이 객체 형식이 아니어서 제외되었습니다.',
          strippedQueryKeys: Object.freeze([]),
        }),
      );
      continue;
    }

    const candidate = rawEntry as ReferenceLinkCandidateInput;
    const baseId = safeShortString(candidate.candidateId, `candidate-${idx + 1}`, 120);
    let uniqueId = baseId;
    let suffix = 2;
    while (seenItemIds.has(uniqueId)) {
      uniqueId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    seenItemIds.add(uniqueId);

    const tier = safeTier(candidate.tier);
    const titleKo = safeShortString(candidate.title, `참고 링크 #${idx + 1}`, 200);
    const publisherKo = safeShortString(candidate.publisher, '발행처 미기재', 160);
    const region =
      candidate.region === 'kr' || candidate.region === 'global' ? candidate.region : null;
    const rightsNoteKo = safeShortString(
      candidate.rightsNoteKo,
      '원본 링크 참조 · 영상 파일 다운로드·무단 재배포 금지',
      300,
    );
    const embedPolicy = safeEmbedPolicy(candidate.embedPolicy, tier);
    const forbidTimeSeekTransplant = Boolean(candidate.isObservationTimestampOnly);

    const normalized = normalizeReferenceUrlPolicy(candidate.url, {
      embedPolicy,
      startSec:
        typeof candidate.startSec === 'number' && Number.isFinite(candidate.startSec)
          ? candidate.startSec
          : null,
      endSec:
        typeof candidate.endSec === 'number' && Number.isFinite(candidate.endSec)
          ? candidate.endSec
          : null,
      forbidTimeSeekTransplant,
    });

    strippedPrivacyQueryTotalCount += normalized.strippedQueryKeys.length;
    if (normalized.hadAutoplayOverrideAttempt) {
      autoplayOverrideBlockedCount += 1;
    }

    if (!normalized.ok || !normalized.canonicalExternalUrl) {
      rejectedDiagnostics.push(
        Object.freeze({
          itemId: uniqueId,
          titleKo,
          tier,
          rejectionCode: normalized.rejectionCode ?? 'malformed-url',
          reasonKo: normalized.reasonKo,
          strippedQueryKeys: normalized.strippedQueryKeys,
        }),
      );
      continue;
    }

    pendingList.push({
      itemId: uniqueId,
      titleKo,
      publisherKo,
      tier,
      tierPriority: TIER_PRIORITY[tier],
      region,
      rightsNoteKo,
      normalized,
      mergedDuplicateIds: [],
    });
  }

  // Sort by tierPriority ascending, preserving original order within the same tier
  const orderedPending = pendingList
    .map((entry, originalIndex) => ({ entry, originalIndex }))
    .sort(
      (a, b) =>
        a.entry.tierPriority - b.entry.tierPriority || a.originalIndex - b.originalIndex,
    )
    .map((wrapped) => wrapped.entry);

  const dedupMap = new Map<string, PendingEvaluated>();
  const deduplicatedList: PendingEvaluated[] = [];

  for (const item of orderedPending) {
    const key = dedupByVideoIdOnly
      ? (item.normalized.videoLevelDeduplicationKey ?? item.normalized.deduplicationKey!)
      : item.normalized.deduplicationKey!;

    const existing = dedupMap.get(key);
    if (existing) {
      existing.mergedDuplicateIds.push(item.itemId);
      deduplicatedDiagnostics.push(
        Object.freeze({
          droppedItemId: item.itemId,
          keptItemId: existing.itemId,
          deduplicationKey: key,
          reasonKo: `정규화 후 동일 대상(${key})으로 확인되어 상위 출처 항목(${existing.itemId})으로 병합되었습니다.`,
        }),
      );
      continue;
    }

    if (deduplicatedList.length >= maxNormalized) {
      break;
    }

    dedupMap.set(key, item);
    deduplicatedList.push(item);
  }

  const acceptedItems: EvaluatedReferenceLinkItem[] = deduplicatedList.map((item) =>
    Object.freeze({
      itemId: item.itemId,
      titleKo: item.titleKo,
      publisherKo: item.publisherKo,
      tier: item.tier,
      tierLabelKo: TIER_LABELS_KO[item.tier],
      region: item.region,
      rightsNoteKo: item.rightsNoteKo,
      normalized: item.normalized,
      mergedDuplicateIds: Object.freeze([...item.mergedDuplicateIds]),
      mergedDuplicateCount: item.mergedDuplicateIds.length,
    }),
  );

  const embedCapableItems = acceptedItems.filter(
    (item) =>
      item.normalized.displayMode === 'embed-with-external-link' &&
      item.normalized.embedAllowed &&
      Boolean(item.normalized.embedUrl),
  );

  const externalLinkOnlyItems = acceptedItems.filter(
    (item) => item.normalized.displayMode === 'external-link-only',
  );

  const allAcceptedHaveExternalLink = acceptedItems.every(
    (item) =>
      item.normalized.externalLinkAlwaysProvided &&
      typeof item.normalized.canonicalExternalUrl === 'string' &&
      item.normalized.canonicalExternalUrl.startsWith('http'),
  );

  return Object.freeze({
    subjectId,
    subjectTitleKo,
    evaluatedAtStatus: 'pre-integration-candidate',
    scope: REFERENCE_LINK_POLICY_CANDIDATE_SCOPE,
    totalScannedCount: sliceCount,
    scanTruncated,
    acceptedItems: Object.freeze(acceptedItems),
    embedCapableItems: Object.freeze(embedCapableItems),
    externalLinkOnlyItems: Object.freeze(externalLinkOnlyItems),
    rejectedDiagnostics: Object.freeze(rejectedDiagnostics),
    deduplicatedDiagnostics: Object.freeze(deduplicatedDiagnostics),
    summary: Object.freeze({
      acceptedCount: acceptedItems.length,
      embedCapableCount: embedCapableItems.length,
      externalLinkOnlyCount: externalLinkOnlyItems.length,
      rejectedCount: rejectedDiagnostics.length,
      deduplicatedCount: deduplicatedDiagnostics.length,
      strippedPrivacyQueryTotalCount,
      autoplayOverrideBlockedCount,
      allAcceptedHaveExternalLink,
      anyAutoplayAllowed: false,
    }),
  });
}
