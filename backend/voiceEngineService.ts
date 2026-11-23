import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { RouterContext, RouterResponse } from '@appdeploy/sdk';
import {
  detectByokOrSecretExposure,
  inspectPayloadForSensitiveHealth,
} from './freeAiService';

export const VOICE_MAX_TEXT_CHARS = 1200;
export const DEFAULT_VOICE_TIMEOUT_MS = 12_000;
export const DEFAULT_VOICE_CACHE_ENTRIES = 120;
export const DEFAULT_VOICE_MINUTE_LIMIT_PER_USER = 45;
export const DEFAULT_VOICE_MAX_CONCURRENT_PER_USER = 2;

export const OPENAI_TTS_ALLOWED_MODELS = [
  'gpt-4o-mini-tts',
  'tts-1',
  'tts-1-hd',
] as const;

export const OPENAI_TTS_ALLOWED_VOICES = [
  'coral',
  'sage',
  'nova',
  'shimmer',
  'alloy',
] as const;

export type OpenAiTtsVoice = (typeof OPENAI_TTS_ALLOWED_VOICES)[number];
export type VoiceEngineProviderId = 'openai' | 'elevenlabs' | 'deepgram' | 'none';
export type VoiceSynthesizeTone =
  | 'warm-intro'
  | 'setup'
  | 'cue'
  | 'breath'
  | 'tip'
  | 'quiz-prompt'
  | 'quiz-answer';

const voiceSynthesizeRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, '읽을 한국어 문장이 비어 있습니다.')
    .max(VOICE_MAX_TEXT_CHARS, `한 번에 최대 ${VOICE_MAX_TEXT_CHARS}자까지 합성할 수 있습니다.`),
  tone: z
    .enum(['warm-intro', 'setup', 'cue', 'breath', 'tip', 'quiz-prompt', 'quiz-answer'])
    .optional()
    .default('cue'),
  voice: z
    .enum(OPENAI_TTS_ALLOWED_VOICES)
    .optional(),
  speed: z.number().min(0.75).max(1.35).optional().default(1.0),
  expectedUserId: z.string().max(128).optional(),
});

export type VoiceSynthesizeRequest = z.infer<typeof voiceSynthesizeRequestSchema>;

export interface VoiceEngineStatus {
  readonly available: boolean;
  readonly provider: VoiceEngineProviderId;
  readonly voiceId: string | null;
  readonly model: string | null;
  readonly labelKo: string;
  readonly maxTextChars: number;
}

export interface VoiceSynthesizeResult {
  readonly audioBase64: string;
  readonly mimeType: 'audio/mpeg' | 'audio/wav';
  readonly provider: Exclude<VoiceEngineProviderId, 'none'>;
  readonly voiceId: string;
  readonly model: string;
  readonly cacheKey: string;
  readonly charCount: number;
  readonly cachedOnServer: boolean;
}

export type VoiceEngineErrorCode =
  | 'byok_forbidden'
  | 'sensitive_data_blocked'
  | 'invalid_request'
  | 'unconfigured'
  | 'rate_limited'
  | 'upstream_error';

export class VoiceEngineError extends Error {
  readonly code: VoiceEngineErrorCode;
  readonly status: number;

  constructor(code: VoiceEngineErrorCode, message: string, status: number) {
    super(message);
    this.name = 'VoiceEngineError';
    this.code = code;
    this.status = status;
  }
}

export interface ResolvedVoiceEngineConfig {
  readonly configured: boolean;
  readonly provider: VoiceEngineProviderId;
  readonly apiKey: string | null;
  readonly model: string | null;
  readonly defaultVoiceId: string | null;
  readonly labelKo: string;
  readonly timeoutMs: number;
}

const VOICE_TONE_INSTRUCTIONS: Readonly<Record<VoiceSynthesizeTone, string>> = {
  'warm-intro':
    'Speak warm, friendly, natural Korean like a seasoned Pilates instructor welcoming a fellow teacher before class. Unhurried pacing, gentle smile in voice, clear Korean articulation.',
  setup:
    'Speak clear, calm, grounded Korean like a warm Pilates instructor guiding apparatus setup (springs, footbar, headrest). Slight natural pause between each setup item so the listener can visualize it easily.',
  breath:
    'Speak softly and calmly in Korean with soothing, spacious breathing cadence. Slow down slightly on inhale and exhale cues so the listener feels relaxed and centered.',
  cue:
    'Speak natural, attentive, encouraging Korean Pilates teaching cues. Clear consonants, conversational tone, gentle emphasis on posture and alignment words, never stiff or robotic.',
  tip:
    'Speak warmly and reassuringly in Korean, sharing one practical studio coaching tip like a helpful mentor.',
  'quiz-prompt':
    'Speak engaging, lively yet calm Korean like a friendly audio quiz host helping an instructor recall their next Pilates exercise on their commute.',
  'quiz-answer':
    'Speak bright, affirming, crystal-clear Korean announcing the correct exercise name and spring setting so it sticks in memory.',
};

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolves server-only neural voice synthesis credentials from environment variables.
 * Never reads browser-exposed VITE_* variables.
 */
export function resolveVoiceEngineConfig(
  env: Record<string, string | undefined> = process.env,
): ResolvedVoiceEngineConfig {
  const preferred = normalizeEnvValue(env.VOICE_ENGINE_PROVIDER)?.toLowerCase() ?? 'auto';
  const openaiKey = normalizeEnvValue(env.OPENAI_API_KEY);
  const elevenLabsKey = normalizeEnvValue(env.ELEVENLABS_API_KEY);
  const deepgramKey = normalizeEnvValue(env.DEEPGRAM_API_KEY);

  const timeoutRaw = Number.parseInt(env.VOICE_ENGINE_TIMEOUT_MS ?? '', 10);
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw >= 2000 && timeoutRaw <= 30_000
      ? timeoutRaw
      : DEFAULT_VOICE_TIMEOUT_MS;

  const tryOpenAi = (): ResolvedVoiceEngineConfig | null => {
    if (!openaiKey) return null;
    const requestedModel = normalizeEnvValue(env.OPENAI_TTS_MODEL) ?? 'gpt-4o-mini-tts';
    const model = (OPENAI_TTS_ALLOWED_MODELS as readonly string[]).includes(requestedModel)
      ? requestedModel
      : 'gpt-4o-mini-tts';
    const requestedVoice = normalizeEnvValue(env.OPENAI_TTS_VOICE) ?? 'coral';
    const defaultVoiceId = (OPENAI_TTS_ALLOWED_VOICES as readonly string[]).includes(requestedVoice)
      ? requestedVoice
      : 'coral';
    return {
      configured: true,
      provider: 'openai',
      apiKey: openaiKey,
      model,
      defaultVoiceId,
      labelKo: '스튜디오 자연 음성',
      timeoutMs,
    };
  };

  const tryElevenLabs = (): ResolvedVoiceEngineConfig | null => {
    if (!elevenLabsKey) return null;
    return {
      configured: true,
      provider: 'elevenlabs',
      apiKey: elevenLabsKey,
      model: normalizeEnvValue(env.ELEVENLABS_TTS_MODEL) ?? 'eleven_multilingual_v2',
      defaultVoiceId: normalizeEnvValue(env.ELEVENLABS_VOICE_ID) ?? '21m00Tcm4TlvDq8ikWAM',
      labelKo: '스튜디오 자연 음성',
      timeoutMs,
    };
  };

  const tryDeepgram = (): ResolvedVoiceEngineConfig | null => {
    if (!deepgramKey) return null;
    return {
      configured: true,
      provider: 'deepgram',
      apiKey: deepgramKey,
      model: normalizeEnvValue(env.DEEPGRAM_TTS_MODEL) ?? 'aura-2-thalia-en',
      defaultVoiceId: normalizeEnvValue(env.DEEPGRAM_TTS_MODEL) ?? 'aura-2-thalia-en',
      labelKo: '스튜디오 자연 음성',
      timeoutMs,
    };
  };

  const order: Array<() => ResolvedVoiceEngineConfig | null> =
    preferred === 'elevenlabs'
      ? [tryElevenLabs, tryOpenAi, tryDeepgram]
      : preferred === 'deepgram'
        ? [tryDeepgram, tryOpenAi, tryElevenLabs]
        : [tryOpenAi, tryElevenLabs, tryDeepgram];

  for (const resolver of order) {
    const config = resolver();
    if (config) return config;
  }

  return {
    configured: false,
    provider: 'none',
    apiKey: null,
    model: null,
    defaultVoiceId: null,
    labelKo: '기기 내장 강사 음성',
    timeoutMs,
  };
}

export function computeVoiceCacheKey(params: {
  provider: string;
  model: string;
  voiceId: string;
  tone: VoiceSynthesizeTone;
  speed: number;
  text: string;
}): string {
  const speedBucket = Math.round(params.speed * 20) / 20;
  return createHash('sha256')
    .update(
      JSON.stringify({
        v: 1,
        provider: params.provider,
        model: params.model,
        voiceId: params.voiceId,
        tone: params.tone,
        speed: speedBucket,
        text: params.text.trim(),
      }),
    )
    .digest('hex');
}

export interface VoiceEngineServiceOptions {
  readonly env?: Record<string, string | undefined>;
  readonly fetchFn?: typeof fetch;
  readonly now?: () => number;
  readonly maxCacheEntries?: number;
  readonly minuteLimitPerUser?: number;
  readonly maxConcurrentPerUser?: number;
}

interface ServerCachedAudio {
  readonly audioBase64: string;
  readonly mimeType: 'audio/mpeg' | 'audio/wav';
  readonly provider: Exclude<VoiceEngineProviderId, 'none'>;
  readonly voiceId: string;
  readonly model: string;
  readonly charCount: number;
}

export interface VoiceEngineService {
  getStatus: () => VoiceEngineStatus;
  synthesize: (userId: string, rawBody: unknown) => Promise<VoiceSynthesizeResult>;
}

async function fetchWithTimeout(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createVoiceEngineService(
  options: VoiceEngineServiceOptions = {},
): VoiceEngineService {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const now = options.now ?? (() => Date.now());
  const maxCacheEntries = options.maxCacheEntries ?? DEFAULT_VOICE_CACHE_ENTRIES;
  const minuteLimitPerUser =
    options.minuteLimitPerUser ?? DEFAULT_VOICE_MINUTE_LIMIT_PER_USER;
  const maxConcurrentPerUser =
    options.maxConcurrentPerUser ?? DEFAULT_VOICE_MAX_CONCURRENT_PER_USER;

  const cache = new Map<string, ServerCachedAudio>();
  const userRequestTimestamps = new Map<string, number[]>();
  const userInFlight = new Map<string, number>();

  function getConfig(): ResolvedVoiceEngineConfig {
    return resolveVoiceEngineConfig(options.env ?? process.env);
  }

  function rememberCache(cacheKey: string, entry: ServerCachedAudio): void {
    if (cache.has(cacheKey)) {
      cache.delete(cacheKey);
    }
    cache.set(cacheKey, entry);
    while (cache.size > maxCacheEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) break;
      cache.delete(oldestKey);
    }
  }

  function enforceRateLimit(userId: string): void {
    const currentMs = now();
    const cutoff = currentMs - 60_000;
    const recent = (userRequestTimestamps.get(userId) ?? []).filter((ts) => ts > cutoff);
    if (recent.length >= minuteLimitPerUser) {
      throw new VoiceEngineError(
        'rate_limited',
        '잠시 음성 요청이 많았습니다. 기기 강사 음성으로 이어서 들으시거나 1분 뒤 다시 시도해 주세요.',
        429,
      );
    }
    recent.push(currentMs);
    userRequestTimestamps.set(userId, recent);
  }

  async function synthesizeOpenAi(
    config: ResolvedVoiceEngineConfig,
    req: VoiceSynthesizeRequest,
  ): Promise<{ audioBytes: Uint8Array; mimeType: 'audio/mpeg'; voiceId: string; model: string }> {
    const voiceId = req.voice ?? (config.defaultVoiceId as OpenAiTtsVoice) ?? 'coral';
    const model = config.model ?? 'gpt-4o-mini-tts';
    const body: Record<string, unknown> = {
      model,
      voice: voiceId,
      input: req.text,
      response_format: 'mp3',
      speed: req.speed,
    };
    if (model === 'gpt-4o-mini-tts') {
      body.instructions = VOICE_TONE_INSTRUCTIONS[req.tone];
    }

    const response = await fetchWithTimeout(
      fetchFn,
      'https://api.openai.com/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      config.timeoutMs,
    );

    if (!response.ok) {
      throw new VoiceEngineError(
        'upstream_error',
        '스튜디오 자연 음성 합성에 일시적인 지연이 발생했습니다. 기기 강사 음성으로 자동 전환합니다.',
        response.status === 429 ? 429 : 503,
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new VoiceEngineError(
        'upstream_error',
        '음성 오디오 데이터를 받지 못했습니다. 기기 강사 음성으로 전환합니다.',
        503,
      );
    }
    return {
      audioBytes: new Uint8Array(buffer),
      mimeType: 'audio/mpeg',
      voiceId,
      model,
    };
  }

  async function synthesizeElevenLabs(
    config: ResolvedVoiceEngineConfig,
    req: VoiceSynthesizeRequest,
  ): Promise<{ audioBytes: Uint8Array; mimeType: 'audio/mpeg'; voiceId: string; model: string }> {
    const voiceId = config.defaultVoiceId ?? '21m00Tcm4TlvDq8ikWAM';
    const model = config.model ?? 'eleven_multilingual_v2';
    const response = await fetchWithTimeout(
      fetchFn,
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': config.apiKey ?? '',
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: req.text,
          model_id: model,
          voice_settings: {
            stability: req.tone === 'breath' ? 0.72 : 0.62,
            similarity_boost: 0.78,
            style: req.tone === 'quiz-prompt' ? 0.35 : 0.22,
            use_speaker_boost: true,
          },
        }),
      },
      config.timeoutMs,
    );

    if (!response.ok) {
      throw new VoiceEngineError(
        'upstream_error',
        '스튜디오 자연 음성 합성에 일시적인 지연이 발생했습니다. 기기 강사 음성으로 자동 전환합니다.',
        response.status === 429 ? 429 : 503,
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new VoiceEngineError(
        'upstream_error',
        '음성 오디오 데이터를 받지 못했습니다. 기기 강사 음성으로 전환합니다.',
        503,
      );
    }
    return {
      audioBytes: new Uint8Array(buffer),
      mimeType: 'audio/mpeg',
      voiceId,
      model,
    };
  }

  async function synthesizeDeepgram(
    config: ResolvedVoiceEngineConfig,
    req: VoiceSynthesizeRequest,
  ): Promise<{ audioBytes: Uint8Array; mimeType: 'audio/mpeg'; voiceId: string; model: string }> {
    const model = config.model ?? 'aura-2-thalia-en';
    const response = await fetchWithTimeout(
      fetchFn,
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: req.text }),
      },
      config.timeoutMs,
    );

    if (!response.ok) {
      throw new VoiceEngineError(
        'upstream_error',
        '스튜디오 자연 음성 합성에 일시적인 지연이 발생했습니다. 기기 강사 음성으로 자동 전환합니다.',
        response.status === 429 ? 429 : 503,
      );
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new VoiceEngineError(
        'upstream_error',
        '음성 오디오 데이터를 받지 못했습니다. 기기 강사 음성으로 전환합니다.',
        503,
      );
    }
    return {
      audioBytes: new Uint8Array(buffer),
      mimeType: 'audio/mpeg',
      voiceId: model,
      model,
    };
  }

  return {
    getStatus(): VoiceEngineStatus {
      const config = getConfig();
      return {
        available: config.configured,
        provider: config.provider,
        voiceId: config.defaultVoiceId,
        model: config.model,
        labelKo: config.labelKo,
        maxTextChars: VOICE_MAX_TEXT_CHARS,
      };
    },

    async synthesize(userId: string, rawBody: unknown): Promise<VoiceSynthesizeResult> {
      const secretCheck = detectByokOrSecretExposure(rawBody);
      if (!secretCheck.safe) {
        throw new VoiceEngineError(
          'byok_forbidden',
          secretCheck.violations[0] ?? '사용자 API 키 입력은 허용되지 않습니다.',
          400,
        );
      }

      const parsed = voiceSynthesizeRequestSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new VoiceEngineError(
          'invalid_request',
          parsed.error.issues[0]?.message ?? '음성 합성 요청 형식이 올바르지 않습니다.',
          400,
        );
      }
      const req = parsed.data;

      const sensitiveCheck = inspectPayloadForSensitiveHealth({ text: req.text });
      if (sensitiveCheck.hasSensitiveData) {
        throw new VoiceEngineError(
          'sensitive_data_blocked',
          '개인 식별 정보나 민감한 건강 기록이 포함된 문장은 외부 음성 서버로 전송하지 않습니다. 기기 내 음성을 이용해 주세요.',
          400,
        );
      }

      const config = getConfig();
      if (!config.configured || config.provider === 'none' || !config.apiKey) {
        throw new VoiceEngineError(
          'unconfigured',
          '서버 자연 음성 키가 설정되어 있지 않습니다. 기기 내 강사 음성으로 재생합니다.',
          503,
        );
      }

      const effectiveVoiceId =
        config.provider === 'openai'
          ? (req.voice ?? config.defaultVoiceId ?? 'coral')
          : (config.defaultVoiceId ?? 'default');
      const effectiveModel = config.model ?? 'gpt-4o-mini-tts';

      const cacheKey = computeVoiceCacheKey({
        provider: config.provider,
        model: effectiveModel,
        voiceId: effectiveVoiceId,
        tone: req.tone,
        speed: req.speed,
        text: req.text,
      });

      const cached = cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          cacheKey,
          cachedOnServer: true,
        };
      }

      enforceRateLimit(userId);

      const activeCount = userInFlight.get(userId) ?? 0;
      if (activeCount >= maxConcurrentPerUser) {
        throw new VoiceEngineError(
          'rate_limited',
          '이전 음성 합성이 진행 중입니다. 잠시 후 다시 시도해 주세요.',
          429,
        );
      }
      userInFlight.set(userId, activeCount + 1);

      try {
        const result =
          config.provider === 'openai'
            ? await synthesizeOpenAi(config, req)
            : config.provider === 'elevenlabs'
              ? await synthesizeElevenLabs(config, req)
              : await synthesizeDeepgram(config, req);

        const audioBase64 = Buffer.from(result.audioBytes).toString('base64');
        const cachedEntry: ServerCachedAudio = {
          audioBase64,
          mimeType: result.mimeType,
          provider: config.provider,
          voiceId: result.voiceId,
          model: result.model,
          charCount: req.text.length,
        };
        rememberCache(cacheKey, cachedEntry);

        return {
          ...cachedEntry,
          cacheKey,
          cachedOnServer: false,
        };
      } catch (cause) {
        if (cause instanceof VoiceEngineError) throw cause;
        throw new VoiceEngineError(
          'upstream_error',
          '스튜디오 자연 음성을 불러오지 못했습니다. 기기 강사 음성으로 이어서 들려드릴게요.',
          503,
        );
      } finally {
        const remaining = (userInFlight.get(userId) ?? 1) - 1;
        if (remaining <= 0) {
          userInFlight.delete(userId);
        } else {
          userInFlight.set(userId, remaining);
        }
      }
    },
  };
}

function createNoStoreJsonResponse(data: unknown, statusCode: number): RouterResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store',
    },
    body: JSON.stringify(data),
  };
}

export function createVoiceEngineRoutes(service: VoiceEngineService): {
  'GET /api/studio/voice/status': (context?: Partial<RouterContext>) => Promise<RouterResponse>;
  'POST /api/studio/voice/synthesize': (context?: Partial<RouterContext>) => Promise<RouterResponse>;
} {
  return {
    'GET /api/studio/voice/status': async (context = {}) => {
      if (context.query) {
        const queryCheck = detectByokOrSecretExposure(context.query);
        if (!queryCheck.safe) {
          return createNoStoreJsonResponse(
            {
              error: 'byok_forbidden',
              message: queryCheck.violations[0] ?? '사용자 API 키 입력은 허용되지 않습니다.',
            },
            400,
          );
        }
      }
      return createNoStoreJsonResponse(service.getStatus(), 200);
    },

    'POST /api/studio/voice/synthesize': async (context = {}) => {
      const userId = context.user?.userId ?? 'anonymous-instructor';
      try {
        if (context.query) {
          const queryCheck = detectByokOrSecretExposure(context.query);
          if (!queryCheck.safe) {
            throw new VoiceEngineError(
              'byok_forbidden',
              queryCheck.violations[0] ?? '사용자 API 키 입력은 허용되지 않습니다.',
              400,
            );
          }
        }
        const synthesized = await service.synthesize(userId, context.body);
        return createNoStoreJsonResponse(synthesized, 200);
      } catch (cause) {
        if (cause instanceof VoiceEngineError) {
          return createNoStoreJsonResponse(
            {
              error: cause.code,
              code: cause.code,
              message: cause.message,
            },
            cause.status,
          );
        }
        return createNoStoreJsonResponse(
          {
            error: 'upstream_error',
            code: 'upstream_error',
            message: '스튜디오 자연 음성을 불러오지 못했습니다. 기기 강사 음성을 이용해 주세요.',
          },
          503,
        );
      }
    },
  };
}
