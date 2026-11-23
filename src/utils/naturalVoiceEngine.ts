import { api } from '@appdeploy/client';
import { movementMediaSessionCoordinator } from './koreanVoiceNarration';
import type {
  BreathChimeKind,
  NaturalVoiceSegment,
  NaturalVoiceTone,
} from './naturalVoiceScriptBuilder';

export const NATURAL_VOICE_CACHE_DB_NAME = 'pf_natural_voice_cache_v1';
export const NATURAL_VOICE_CACHE_STORE = 'audio_clips';
export const NATURAL_VOICE_MAX_CACHED_CLIPS = 120;

export const NATURAL_VOICE_SPEED_OPTIONS = [0.8, 0.9, 1, 1.1, 1.2] as const;
export type NaturalVoiceSpeed = (typeof NATURAL_VOICE_SPEED_OPTIONS)[number];

export const BREATH_CHIME_FREQUENCIES_HZ = {
  inhale: 432,
  exhale: 396,
  bell: 432,
  quizTick: 330,
  quizReveal: 528,
} as const;

export type NaturalVoiceTier = 'cloud-neural' | 'device-enhanced' | 'text-only';
export type NaturalVoiceStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'unsupported'
  | 'error';
export type BreathPacerPhase = 'idle' | 'inhale' | 'hold' | 'exhale';
export type CloudVoicePreset = 'coral' | 'sage' | 'nova';

export interface NaturalVoiceCloudSynthesizePayload {
  readonly text: string;
  readonly tone: NaturalVoiceTone;
  readonly voice?: CloudVoicePreset;
  readonly speed?: number;
}

export interface NaturalVoiceCloudSynthesizeResult {
  readonly audioBytes: ArrayBuffer;
  readonly mimeType: 'audio/mpeg' | 'audio/wav';
  readonly provider: 'openai' | 'elevenlabs' | 'deepgram';
  readonly voiceId: string;
  readonly model?: string;
}

export interface CachedAudioClip {
  readonly cacheKey: string;
  readonly mimeType: 'audio/mpeg' | 'audio/wav';
  readonly bytes: ArrayBuffer;
  readonly provider: 'openai' | 'elevenlabs' | 'deepgram';
  readonly voiceId: string;
  readonly createdAt: number;
  readonly lastAccessedAt: number;
}

export interface NaturalVoiceAudioCache {
  get: (cacheKey: string) => Promise<CachedAudioClip | null>;
  put: (clip: Omit<CachedAudioClip, 'createdAt' | 'lastAccessedAt'>) => Promise<void>;
  count: () => Promise<number>;
  clear: () => Promise<void>;
}

export interface RankedKoreanVoice {
  readonly voice: SpeechSynthesisVoice;
  readonly score: number;
  readonly qualityTier: 'enhanced' | 'standard';
  readonly qualityLabelKo: string;
}

export interface ProsodyClause {
  readonly textKo: string;
  readonly rate: number;
  readonly pitch: number;
  readonly pauseAfterMs: number;
}

export interface NaturalVoiceControllerState {
  readonly sessionId: string;
  readonly status: NaturalVoiceStatus;
  readonly activeTier: NaturalVoiceTier;
  readonly voiceQualityLabelKo: string;
  readonly selectedVoiceName: string | null;
  readonly cacheHitCount: number;
  readonly activeSegmentIndex: number;
  readonly totalSegments: number;
  readonly progressRatio: number;
  readonly speed: NaturalVoiceSpeed;
  readonly breathChimesEnabled: boolean;
  readonly preferCloud: boolean;
  readonly quizCountdownRemainingSec: number | null;
  readonly breathPhase: BreathPacerPhase;
  readonly currentSegment: NaturalVoiceSegment | null;
  readonly errorMessageKo: string | null;
  readonly announcementKo: string;
}

export interface NaturalVoiceControllerEnv {
  readonly speechSynthesis?: SpeechSynthesis | null;
  readonly SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance | null;
  readonly AudioContextCtor?: typeof AudioContext | null;
  readonly indexedDB?: IDBFactory | null;
  readonly audioCache?: NaturalVoiceAudioCache | null;
  readonly synthesizeCloud?:
    | ((payload: NaturalVoiceCloudSynthesizePayload) => Promise<NaturalVoiceCloudSynthesizeResult | null>)
    | null;
  readonly createAudioElement?: ((objectUrl: string) => HTMLAudioElement) | null;
  readonly mediaSession?: MediaSession | null;
  readonly enableCloud?: boolean;
}

export interface CreateNaturalVoiceControllerOptions {
  readonly sessionId: string;
  readonly titleKo?: string;
  readonly segments: readonly NaturalVoiceSegment[];
  readonly initialSpeed?: NaturalVoiceSpeed;
  readonly voicePreset?: CloudVoicePreset;
  readonly preferCloud?: boolean;
  readonly breathChimesEnabled?: boolean;
  readonly onStateChange?: (state: NaturalVoiceControllerState) => void;
  readonly env?: NaturalVoiceControllerEnv;
}

export interface NaturalVoiceController {
  getState: () => NaturalVoiceControllerState;
  play: (startIndex?: number) => boolean;
  pause: () => void;
  resume: () => boolean;
  stop: (reasonKo?: string) => void;
  next: () => boolean;
  previous: () => boolean;
  jumpTo: (segmentIndex: number) => boolean;
  setSpeed: (speed: NaturalVoiceSpeed) => void;
  setBreathChimesEnabled: (enabled: boolean) => void;
  setPreferCloud: (enabled: boolean) => void;
  destroy: () => void;
}

const CLIENT_SENSITIVE_PATTERNS: readonly RegExp[] = [
  /(?:\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b)/,
  /(?:\b\d{6}[-.\s]?[1-4]\d{6}\b)/,
  /(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)/,
  /디스크|추간판\s*탈출|척추관\s*협착|협착증|골절|파열|병원\s*진단|의사\s*소견|처방전|수술|시술|임산부|임신\s*\d*주|회원\s*실명|환자\s*이름/i,
];

/**
 * Checks whether custom instructor text contains sensitive personal or clinical info
 * so it is never sent to external cloud voice synthesis.
 */
export function containsSensitivePersonalInfo(text: string): boolean {
  if (!text) return false;
  return CLIENT_SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function fnv1a32(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Computes a deterministic cache key for IndexedDB audio storage (`pf_natural_voice_cache_v1`).
 */
export function buildNaturalVoiceCacheKey(params: {
  readonly textKo: string;
  readonly tone: NaturalVoiceTone;
  readonly voicePreset: CloudVoicePreset;
  readonly speed: number;
}): string {
  const speedBucket = (Math.round(params.speed * 20) / 20).toFixed(2);
  const raw = `v1|${params.voicePreset}|${params.tone}|${speedBucket}|${params.textKo.trim()}`;
  return `nv-${fnv1a32(raw, 0x811c9dc5)}${fnv1a32(`${raw.length}:${raw}`, 0x9e3779b1)}`;
}

/**
 * Creates a persistent IndexedDB audio clip cache (`pf_natural_voice_cache_v1`)
 * with an instant 0ms hot in-memory mirror and graceful fallback when IndexedDB is unavailable.
 */
export function createNaturalVoiceAudioCache(
  idbFactory?: IDBFactory | null,
): NaturalVoiceAudioCache {
  const memoryMirror = new Map<string, CachedAudioClip>();
  const resolvedIdb =
    idbFactory !== undefined
      ? idbFactory
      : typeof indexedDB !== 'undefined'
        ? indexedDB
        : null;

  let dbPromise: Promise<IDBDatabase | null> | null = null;

  function openDb(): Promise<IDBDatabase | null> {
    if (!resolvedIdb) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const request = resolvedIdb.open(NATURAL_VOICE_CACHE_DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(NATURAL_VOICE_CACHE_STORE)) {
            const store = db.createObjectStore(NATURAL_VOICE_CACHE_STORE, {
              keyPath: 'cacheKey',
            });
            store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return dbPromise;
  }

  function rememberInMemory(clip: CachedAudioClip): void {
    if (memoryMirror.has(clip.cacheKey)) {
      memoryMirror.delete(clip.cacheKey);
    }
    memoryMirror.set(clip.cacheKey, clip);
    while (memoryMirror.size > NATURAL_VOICE_MAX_CACHED_CLIPS) {
      const oldest = memoryMirror.keys().next().value;
      if (oldest === undefined) break;
      memoryMirror.delete(oldest);
    }
  }

  return {
    async get(cacheKey: string): Promise<CachedAudioClip | null> {
      const hot = memoryMirror.get(cacheKey);
      if (hot) {
        const touched: CachedAudioClip = { ...hot, lastAccessedAt: Date.now() };
        rememberInMemory(touched);
        return touched;
      }

      const db = await openDb();
      if (!db) return null;

      return new Promise((resolve) => {
        try {
          const tx = db.transaction(NATURAL_VOICE_CACHE_STORE, 'readwrite');
          const store = tx.objectStore(NATURAL_VOICE_CACHE_STORE);
          const req = store.get(cacheKey);
          req.onsuccess = () => {
            const result = req.result as CachedAudioClip | undefined;
            if (!result || !(result.bytes instanceof ArrayBuffer || ArrayBuffer.isView(result.bytes))) {
              resolve(null);
              return;
            }
            const bytes =
              result.bytes instanceof ArrayBuffer
                ? result.bytes
                : (result.bytes as Uint8Array).slice().buffer;
            const touched: CachedAudioClip = {
              ...result,
              bytes,
              lastAccessedAt: Date.now(),
            };
            rememberInMemory(touched);
            try {
              store.put(touched);
            } catch {
              // Ignore touch update error
            }
            resolve(touched);
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    },

    async put(clip): Promise<void> {
      const now = Date.now();
      const entry: CachedAudioClip = {
        ...clip,
        createdAt: now,
        lastAccessedAt: now,
      };
      rememberInMemory(entry);

      const db = await openDb();
      if (!db) return;

      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(NATURAL_VOICE_CACHE_STORE, 'readwrite');
          const store = tx.objectStore(NATURAL_VOICE_CACHE_STORE);
          store.put(entry);

          const countReq = store.count();
          countReq.onsuccess = () => {
            const total = countReq.result;
            if (total <= NATURAL_VOICE_MAX_CACHED_CLIPS) return;
            const excess = total - NATURAL_VOICE_MAX_CACHED_CLIPS;
            const index = store.index('lastAccessedAt');
            let removed = 0;
            const cursorReq = index.openCursor();
            cursorReq.onsuccess = () => {
              const cursor = cursorReq.result;
              if (cursor && removed < excess) {
                cursor.delete();
                removed += 1;
                cursor.continue();
              }
            };
          };

          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    },

    async count(): Promise<number> {
      const db = await openDb();
      if (!db) return memoryMirror.size;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(NATURAL_VOICE_CACHE_STORE, 'readonly');
          const req = tx.objectStore(NATURAL_VOICE_CACHE_STORE).count();
          req.onsuccess = () => resolve(Math.max(req.result, memoryMirror.size));
          req.onerror = () => resolve(memoryMirror.size);
        } catch {
          resolve(memoryMirror.size);
        }
      });
    },

    async clear(): Promise<void> {
      memoryMirror.clear();
      const db = await openDb();
      if (!db) return;
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(NATURAL_VOICE_CACHE_STORE, 'readwrite');
          tx.objectStore(NATURAL_VOICE_CACHE_STORE).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    },
  };
}

function normalizeLang(lang: string | undefined | null): string {
  return (lang ?? '').replace(/_/g, '-').trim().toLowerCase();
}

/**
 * Ranks available Korean Web Speech voices by naturalness, prioritizing Apple Enhanced/Premium,
 * Microsoft/Edge Natural/Neural (`SunHi`, `InJoon`), `Google 한국의`, `Yuna`, and `Sora`.
 */
export function rankKoreanNaturalVoices(
  voices: readonly SpeechSynthesisVoice[],
  options?: { readonly localOnly?: boolean },
): RankedKoreanVoice[] {
  if (!Array.isArray(voices)) return [];
  const localOnly = options?.localOnly ?? false;

  const korean = voices.filter((voice) => {
    const lang = normalizeLang(voice.lang);
    if (!/^ko(?:-|$)/.test(lang)) return false;
    if (localOnly && voice.localService !== true) return false;
    return true;
  });

  const ranked = korean.map((voice): RankedKoreanVoice => {
    const name = (voice.name ?? '').trim();
    const lang = normalizeLang(voice.lang);
    let score = 40;
    let enhanced = false;

    if (/(?:premium|enhanced|고품질|향상)/i.test(name)) {
      score += 80;
      enhanced = true;
    }
    if (/(?:natural|neural|sunhi|injoon|hyunsu|bongjin|gookmin|jimin|seohyeon|soonbok|yujin)/i.test(name)) {
      score += 70;
      enhanced = true;
    }
    if (/(?:google\s*한국|google\s*korean)/i.test(name)) {
      score += 55;
      enhanced = true;
    }
    if (/\b(?:yuna|sora|minsu|jian|유나|소라)\b/i.test(name)) {
      score += 35;
    }
    if (/compact|espeak|festival/i.test(name)) {
      score -= 20;
    }
    if (lang === 'ko-kr') {
      score += 12;
    }
    if (voice.localService) {
      score += 8;
    }

    return {
      voice,
      score,
      qualityTier: enhanced ? 'enhanced' : 'standard',
      qualityLabelKo: enhanced ? '자연스러운 강사 음성' : '기기 강사 음성',
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

export function selectNaturalKoreanVoice(
  voices: readonly SpeechSynthesisVoice[],
  options?: { readonly localOnly?: boolean },
): RankedKoreanVoice | null {
  return rankKoreanNaturalVoices(voices, options)[0] ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Splits a natural voice segment into breathable short clauses with subtle rate (0.94..1.02)
 * and pitch (0.98..1.04) prosody contours so on-device playback reads with human rhythm.
 */
export function splitIntoProsodyClauses(
  segment: NaturalVoiceSegment,
  userSpeed: number = 1,
): ProsodyClause[] {
  const text = segment.textKo.trim();
  if (!text) return [];

  // Split by sentence punctuation first
  const rawSentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const clauses: string[] = [];
  for (const sentence of rawSentences) {
    if (sentence.length <= 52) {
      clauses.push(sentence);
      continue;
    }
    // Split longer sentences along natural Korean breath commas
    const parts = sentence.split(/,\s+/).map((p) => p.trim()).filter(Boolean);
    let buffer = '';
    for (const part of parts) {
      if (!buffer) {
        buffer = part;
      } else if (`${buffer}, ${part}`.length <= 54) {
        buffer = `${buffer}, ${part}`;
      } else {
        clauses.push(buffer);
        buffer = part;
      }
    }
    if (buffer) clauses.push(buffer);
  }

  const baseRateScale = clamp(segment.prosody.rateScale, 0.94, 1.02);
  const basePitch = clamp(segment.prosody.pitch, 0.98, 1.04);

  return clauses.map((clauseText, idx) => {
    const isLast = idx === clauses.length - 1;
    const isFirst = idx === 0;
    const rateScale = isLast
      ? clamp(baseRateScale - 0.02, 0.94, 1.02)
      : isFirst
        ? baseRateScale
        : clamp(baseRateScale + 0.01, 0.94, 1.02);
    const pitch = isLast
      ? clamp(basePitch - 0.01, 0.98, 1.04)
      : basePitch;
    const pauseAfterMs = isLast
      ? clamp(segment.pauseMs, 350, 850)
      : clamp(Math.round(segment.pauseMs * 0.42), 180, 340);

    return {
      textKo: clauseText,
      rate: Number(clamp(userSpeed * rateScale, 0.7, 1.4).toFixed(3)),
      pitch: Number(pitch.toFixed(3)),
      pauseAfterMs,
    };
  });
}

export interface StudioBreathAudioSynth {
  playChime: (kind: BreathChimeKind) => boolean;
  close: () => void;
}

/**
 * Synthesizes warm, gentle Pilates breathing chimes (432Hz inhale / 396Hz exhale soft sine tones)
 * via Web Audio API without external audio assets.
 */
export function createStudioBreathAudioSynth(
  AudioContextCtor?: typeof AudioContext | null,
): StudioBreathAudioSynth {
  let ctx: AudioContext | null = null;

  function resolveCtor(): typeof AudioContext | null {
    if (AudioContextCtor !== undefined) {
      return AudioContextCtor;
    }
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  }

  function ensureContext(): AudioContext | null {
    if (ctx && ctx.state !== 'closed') return ctx;
    const Ctor = resolveCtor();
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      return ctx;
    } catch {
      return null;
    }
  }

  function scheduleSoftTone(
    audioCtx: AudioContext,
    freqHz: number,
    startOffsetSec: number,
    attackSec: number,
    decaySec: number,
    peakGain: number,
    harmonicGain = 0,
  ): void {
    const startAt = audioCtx.currentTime + startOffsetSec;
    const endAt = startAt + attackSec + decaySec;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freqHz, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peakGain), startAt + attackSec);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startAt);
    osc.stop(endAt + 0.02);

    if (harmonicGain > 0) {
      const overtone = audioCtx.createOscillator();
      const overtoneGain = audioCtx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(freqHz * 2, startAt);
      overtoneGain.gain.setValueAtTime(0.0001, startAt);
      overtoneGain.gain.exponentialRampToValueAtTime(harmonicGain, startAt + attackSec);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, endAt);
      overtone.connect(overtoneGain);
      overtoneGain.connect(audioCtx.destination);
      overtone.start(startAt);
      overtone.stop(endAt + 0.02);
    }
  }

  return {
    playChime(kind: BreathChimeKind): boolean {
      if (kind === 'none') return false;
      const audioCtx = ensureContext();
      if (!audioCtx) return false;
      try {
        if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
          void audioCtx.resume().catch(() => undefined);
        }
        if (kind === 'inhale') {
          scheduleSoftTone(audioCtx, BREATH_CHIME_FREQUENCIES_HZ.inhale, 0, 0.16, 0.54, 0.075, 0.014);
          return true;
        }
        if (kind === 'exhale') {
          scheduleSoftTone(audioCtx, BREATH_CHIME_FREQUENCIES_HZ.exhale, 0, 0.14, 0.68, 0.07, 0.01);
          return true;
        }
        if (kind === 'bell') {
          scheduleSoftTone(audioCtx, BREATH_CHIME_FREQUENCIES_HZ.bell, 0, 0.04, 0.45, 0.06, 0.018);
          return true;
        }
        if (kind === 'quiz-tick') {
          scheduleSoftTone(audioCtx, BREATH_CHIME_FREQUENCIES_HZ.quizTick, 0, 0.02, 0.14, 0.045, 0);
          return true;
        }
        if (kind === 'quiz-reveal') {
          scheduleSoftTone(audioCtx, BREATH_CHIME_FREQUENCIES_HZ.exhale, 0, 0.03, 0.24, 0.055, 0);
          scheduleSoftTone(
            audioCtx,
            BREATH_CHIME_FREQUENCIES_HZ.quizReveal,
            0.12,
            0.04,
            0.42,
            0.065,
            0.012,
          );
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    close(): void {
      if (ctx && ctx.state !== 'closed' && typeof ctx.close === 'function') {
        void ctx.close().catch(() => undefined);
      }
      ctx = null;
    },
  };
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Default Tier-1 cloud synthesis client calling POST /api/studio/voice/synthesize via @appdeploy/client.
 * Gracefully returns null when backend voice API is not connected so playback drops straight to Tier 2.
 */
async function defaultCloudVoiceSynthesize(
  payload: NaturalVoiceCloudSynthesizePayload,
): Promise<NaturalVoiceCloudSynthesizeResult | null> {
  try {
    const response = await api.post('/api/studio/voice/synthesize', payload);
    const data =
      response && typeof response === 'object' && 'data' in response
        ? (response as { data: unknown }).data
        : response;
    if (!data || typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    if (typeof record.audioBase64 !== 'string' || record.audioBase64.length === 0) {
      return null;
    }
    const mimeType = record.mimeType === 'audio/wav' ? 'audio/wav' : 'audio/mpeg';
    const provider =
      record.provider === 'elevenlabs' || record.provider === 'deepgram'
        ? record.provider
        : 'openai';
    const voiceId = typeof record.voiceId === 'string' ? record.voiceId : 'coral';
    const model = typeof record.model === 'string' ? record.model : undefined;
    return {
      audioBytes: base64ToArrayBuffer(record.audioBase64),
      mimeType,
      provider,
      voiceId,
      model,
    };
  } catch {
    return null;
  }
}

function normalizeNaturalSpeed(speed: number | undefined): NaturalVoiceSpeed {
  if (
    typeof speed === 'number' &&
    (NATURAL_VOICE_SPEED_OPTIONS as readonly number[]).includes(speed)
  ) {
    return speed as NaturalVoiceSpeed;
  }
  return 1;
}

function resolveSpeechSynthesis(env?: NaturalVoiceControllerEnv): SpeechSynthesis | null {
  if (env && 'speechSynthesis' in env) return env.speechSynthesis ?? null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis ?? null;
  }
  return null;
}

function resolveUtteranceCtor(
  env?: NaturalVoiceControllerEnv,
): typeof SpeechSynthesisUtterance | null {
  if (env && 'SpeechSynthesisUtterance' in env) return env.SpeechSynthesisUtterance ?? null;
  if (typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window) {
    return window.SpeechSynthesisUtterance ?? null;
  }
  return null;
}

function resolveMediaSession(env?: NaturalVoiceControllerEnv): MediaSession | null {
  if (env && 'mediaSession' in env) return env.mediaSession ?? null;
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    return navigator.mediaSession ?? null;
  }
  return null;
}

let sharedDefaultAudioCache: NaturalVoiceAudioCache | null = null;
function getDefaultAudioCache(): NaturalVoiceAudioCache {
  if (!sharedDefaultAudioCache) {
    sharedDefaultAudioCache = createNaturalVoiceAudioCache();
  }
  return sharedDefaultAudioCache;
}

/**
 * Synchronously computes the initial voice controller state for a segment playlist
 * without starting any audio playback or side effects (React 19 render-safe).
 */
export function inspectInitialNaturalVoiceState(
  options: Omit<CreateNaturalVoiceControllerOptions, 'onStateChange'>,
): NaturalVoiceControllerState {
  const { sessionId, segments, env } = options;
  const synth = resolveSpeechSynthesis(env);
  const utteranceCtor = resolveUtteranceCtor(env);
  let initialVoice: RankedKoreanVoice | null = null;
  if (synth && typeof synth.getVoices === 'function') {
    try {
      initialVoice = selectNaturalKoreanVoice(synth.getVoices() ?? []);
    } catch {
      initialVoice = null;
    }
  }
  const hasSpeechSupport = Boolean(synth && utteranceCtor && initialVoice);
  const cloudEnabled =
    env?.enableCloud === false
      ? false
      : env && 'synthesizeCloud' in env
        ? Boolean(env.synthesizeCloud)
        : true;
  const canTryCloud = Boolean(cloudEnabled && (options.preferCloud ?? true));

  return {
    sessionId,
    status: hasSpeechSupport || canTryCloud ? 'idle' : 'unsupported',
    activeTier: canTryCloud ? 'cloud-neural' : hasSpeechSupport ? 'device-enhanced' : 'text-only',
    voiceQualityLabelKo: canTryCloud
      ? '스튜디오 자연 음성'
      : initialVoice?.qualityLabelKo ?? '화면 대본 모드',
    selectedVoiceName: initialVoice?.voice.name ?? null,
    cacheHitCount: 0,
    activeSegmentIndex: 0,
    totalSegments: segments.length,
    progressRatio: 0,
    speed: normalizeNaturalSpeed(options.initialSpeed),
    breathChimesEnabled: options.breathChimesEnabled ?? true,
    preferCloud: options.preferCloud ?? true,
    quizCountdownRemainingSec: null,
    breathPhase: 'idle',
    currentSegment: segments[0] ?? null,
    errorMessageKo:
      hasSpeechSupport || canTryCloud
        ? null
        : '현재 기기에서 한국어 음성을 찾지 못했어요. 아래 강사 대본으로 바로 확인하실 수 있어요.',
    announcementKo: '강사 음성 준비 완료',
  };
}

/**
 * Multi-tier natural Korean voice controller:
 * - Tier 1: Cloud Neural Studio Voice (/api/studio/voice/synthesize) + IndexedDB (`pf_natural_voice_cache_v1`)
 * - Tier 2: Enhanced On-Device Korean Voice + Prosody Clause Pacing + Web Audio Breath Chimes (432Hz/396Hz)
 * - Earphone / Lock-screen MediaSession integration & movementMediaSessionCoordinator isolation.
 * Never auto-plays on creation.
 */
export function createNaturalVoiceController(
  options: CreateNaturalVoiceControllerOptions,
): NaturalVoiceController {
  const {
    sessionId,
    titleKo = '필라테스 강사 음성 안내',
    segments,
    voicePreset = 'coral',
    onStateChange,
    env,
  } = options;

  const audioCache = env?.audioCache ?? (env?.indexedDB !== undefined ? createNaturalVoiceAudioCache(env.indexedDB) : getDefaultAudioCache());
  const cloudSynthesizer =
    env?.enableCloud === false
      ? null
      : env && 'synthesizeCloud' in env
        ? env.synthesizeCloud ?? null
        : defaultCloudVoiceSynthesize;
  const breathSynth = createStudioBreathAudioSynth(env?.AudioContextCtor);
  const canTryCloud = Boolean(cloudSynthesizer && (options.preferCloud ?? true));

  let state: NaturalVoiceControllerState = inspectInitialNaturalVoiceState(options);

  let destroyed = false;
  let playbackRunId = 0;
  let cloudDisabledForSession = false;
  let ownsSpeech = false;
  let activeAudio: HTMLAudioElement | null = null;
  let activeObjectUrl: string | null = null;
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  function emit(patch: Partial<NaturalVoiceControllerState>): void {
    state = { ...state, ...patch };
    onStateChange?.(state);
  }

  function clearAllTimers(): void {
    for (const timer of pendingTimers) {
      clearTimeout(timer);
    }
    pendingTimers.clear();
  }

  function scheduleTimer(ms: number, runId: number, fn: () => void): void {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer);
      if (destroyed || runId !== playbackRunId) return;
      fn();
    }, Math.max(0, ms));
    pendingTimers.add(timer);
  }

  function stopAudioElement(): void {
    if (activeAudio) {
      try {
        activeAudio.onended = null;
        activeAudio.onerror = null;
        activeAudio.pause();
      } catch {
        // Ignore audio element stop errors
      }
      activeAudio = null;
    }
    if (activeObjectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(activeObjectUrl);
      } catch {
        // Ignore revoke errors
      }
      activeObjectUrl = null;
    }
  }

  function stopDeviceSpeech(): void {
    if (!ownsSpeech) return;
    ownsSpeech = false;
    const synth = resolveSpeechSynthesis(env);
    if (!synth || typeof synth.cancel !== 'function') return;
    try {
      synth.cancel();
    } catch {
      // Ignore cancel errors
    }
  }

  function stopActivePlaybackResources(): void {
    clearAllTimers();
    stopAudioElement();
    stopDeviceSpeech();
  }

  function syncMediaSession(segment: NaturalVoiceSegment | null, playbackState: 'playing' | 'paused' | 'none'): void {
    const mediaSession = resolveMediaSession(env);
    if (!mediaSession) return;
    try {
      mediaSession.playbackState = playbackState;
      if (segment && typeof MediaMetadata !== 'undefined') {
        mediaSession.metadata = new MediaMetadata({
          title: segment.exerciseNameKo ?? segment.labelKo,
          artist: titleKo,
          album: 'Pilates Flow 강사 음성 리허설',
        });
      }
      if (typeof mediaSession.setActionHandler === 'function') {
        if (playbackState === 'none') {
          mediaSession.setActionHandler('play', null);
          mediaSession.setActionHandler('pause', null);
          mediaSession.setActionHandler('nexttrack', null);
          mediaSession.setActionHandler('previoustrack', null);
          mediaSession.setActionHandler('stop', null);
        } else {
          mediaSession.setActionHandler('play', () => {
            if (state.status === 'paused') controller.resume();
            else controller.play(state.activeSegmentIndex);
          });
          mediaSession.setActionHandler('pause', () => controller.pause());
          mediaSession.setActionHandler('nexttrack', () => {
            controller.next();
          });
          mediaSession.setActionHandler('previoustrack', () => {
            controller.previous();
          });
          mediaSession.setActionHandler('stop', () => controller.stop());
        }
      }
    } catch {
      // MediaSession is progressive enhancement; ignore unsupported platform errors
    }
  }

  function playAudioBytes(
    audioBytes: ArrayBuffer,
    mimeType: 'audio/mpeg' | 'audio/wav',
    speed: number,
    runId: number,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (destroyed || runId !== playbackRunId) {
        resolve(false);
        return;
      }
      try {
        const blob = new Blob([audioBytes], { type: mimeType });
        const url =
          typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
            ? URL.createObjectURL(blob)
            : `data:${mimeType};base64,`;
        activeObjectUrl = url.startsWith('blob:') ? url : null;

        const audio =
          env?.createAudioElement
            ? env.createAudioElement(url)
            : typeof Audio !== 'undefined'
              ? new Audio(url)
              : null;

        if (!audio) {
          resolve(false);
          return;
        }
        activeAudio = audio;
        audio.playbackRate = speed;

        audio.onended = () => {
          stopAudioElement();
          resolve(true);
        };
        audio.onerror = () => {
          stopAudioElement();
          resolve(false);
        };

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.catch(() => {
            stopAudioElement();
            resolve(false);
          });
        }
      } catch {
        stopAudioElement();
        resolve(false);
      }
    });
  }

  function speakSegmentOnDevice(segment: NaturalVoiceSegment, runId: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (destroyed || runId !== playbackRunId) {
        resolve(false);
        return;
      }
      const synth = resolveSpeechSynthesis(env);
      const UtteranceCtor = resolveUtteranceCtor(env);
      if (!synth || !UtteranceCtor) {
        resolve(false);
        return;
      }

      let rankedVoice: RankedKoreanVoice | null = null;
      try {
        rankedVoice = selectNaturalKoreanVoice(synth.getVoices?.() ?? []);
      } catch {
        rankedVoice = null;
      }

      if (!rankedVoice) {
        resolve(false);
        return;
      }

      emit({
        activeTier: 'device-enhanced',
        voiceQualityLabelKo: rankedVoice.qualityLabelKo,
        selectedVoiceName: rankedVoice.voice.name || '한국어 강사 음성',
      });

      const clauses = splitIntoProsodyClauses(segment, state.speed);
      if (clauses.length === 0) {
        resolve(true);
        return;
      }

      let clauseIndex = 0;

      const speakNextClause = () => {
        if (destroyed || runId !== playbackRunId || state.status !== 'playing') {
          resolve(false);
          return;
        }
        if (clauseIndex >= clauses.length) {
          ownsSpeech = false;
          resolve(true);
          return;
        }

        const clause = clauses[clauseIndex];
        try {
          const utterance = new UtteranceCtor(clause.textKo);
          utterance.voice = rankedVoice!.voice;
          utterance.lang = rankedVoice!.voice.lang || 'ko-KR';
          utterance.rate = clause.rate;
          utterance.pitch = clause.pitch;

          utterance.onend = () => {
            if (destroyed || runId !== playbackRunId || state.status !== 'playing') {
              resolve(false);
              return;
            }
            clauseIndex += 1;
            if (clauseIndex >= clauses.length) {
              ownsSpeech = false;
              resolve(true);
            } else {
              scheduleTimer(clause.pauseAfterMs, runId, speakNextClause);
            }
          };

          utterance.onerror = (event: SpeechSynthesisErrorEvent | { error?: string }) => {
            if (destroyed || runId !== playbackRunId) {
              resolve(false);
              return;
            }
            const code = (event && 'error' in event ? event.error : '') ?? '';
            if (code === 'canceled' || code === 'interrupted') {
              resolve(false);
              return;
            }
            ownsSpeech = false;
            resolve(false);
          };

          ownsSpeech = true;
          synth.speak(utterance);
        } catch {
          ownsSpeech = false;
          resolve(false);
        }
      };

      speakNextClause();
    });
  }

  function runQuizCountdownThenAdvance(
    countdownSec: number,
    nextIndex: number,
    runId: number,
  ): void {
    let remaining = Math.max(1, Math.round(countdownSec));

    const tick = () => {
      if (destroyed || runId !== playbackRunId || state.status !== 'playing') return;
      if (remaining <= 0) {
        emit({ quizCountdownRemainingSec: null });
        void playSegmentAt(nextIndex, runId);
        return;
      }
      emit({
        quizCountdownRemainingSec: remaining,
        announcementKo: `정답 공개 ${remaining}초 전`,
      });
      if (state.breathChimesEnabled) {
        breathSynth.playChime('quiz-tick');
      }
      remaining -= 1;
      scheduleTimer(1000, runId, tick);
    };

    tick();
  }

  async function tryCloudPlayback(
    segment: NaturalVoiceSegment,
    runId: number,
  ): Promise<'played' | 'fallback'> {
    if (
      !state.preferCloud ||
      !cloudSynthesizer ||
      cloudDisabledForSession ||
      containsSensitivePersonalInfo(segment.textKo)
    ) {
      return 'fallback';
    }

    const cacheKey = buildNaturalVoiceCacheKey({
      textKo: segment.textKo,
      tone: segment.tone,
      voicePreset,
      speed: state.speed,
    });

    const cached = await audioCache.get(cacheKey);
    if (destroyed || runId !== playbackRunId) return 'fallback';

    if (cached) {
      emit({
        status: 'playing',
        activeTier: 'cloud-neural',
        voiceQualityLabelKo: '스튜디오 자연 음성',
        selectedVoiceName: `${cached.provider}:${cached.voiceId}`,
        cacheHitCount: state.cacheHitCount + 1,
      });
      const ok = await playAudioBytes(cached.bytes, cached.mimeType, 1, runId);
      return ok ? 'played' : 'fallback';
    }

    emit({ status: 'loading', announcementKo: '스튜디오 자연 음성을 준비하고 있어요.' });

    const synthesized = await cloudSynthesizer({
      text: segment.textKo,
      tone: segment.tone,
      voice: voicePreset,
      speed: state.speed,
    });

    if (destroyed || runId !== playbackRunId) return 'fallback';

    if (!synthesized || synthesized.audioBytes.byteLength === 0) {
      cloudDisabledForSession = true;
      return 'fallback';
    }

    await audioCache.put({
      cacheKey,
      mimeType: synthesized.mimeType,
      bytes: synthesized.audioBytes,
      provider: synthesized.provider,
      voiceId: synthesized.voiceId,
    });

    if (destroyed || runId !== playbackRunId) return 'fallback';

    emit({
      status: 'playing',
      activeTier: 'cloud-neural',
      voiceQualityLabelKo: '스튜디오 자연 음성',
      selectedVoiceName: `${synthesized.provider}:${synthesized.voiceId}`,
    });

    const ok = await playAudioBytes(synthesized.audioBytes, synthesized.mimeType, 1, runId);
    return ok ? 'played' : 'fallback';
  }

  async function playSegmentAt(index: number, runId: number): Promise<void> {
    if (destroyed || runId !== playbackRunId) return;

    if (index < 0 || index >= segments.length) {
      stopActivePlaybackResources();
      syncMediaSession(null, 'none');
      emit({
        status: 'completed',
        progressRatio: 1,
        quizCountdownRemainingSec: null,
        breathPhase: 'idle',
        announcementKo: '음성 설명을 모두 마쳤어요.',
      });
      return;
    }

    const segment = segments[index];
    const progressRatio = segments.length > 0 ? Number((index / segments.length).toFixed(3)) : 0;
    const breathPhase: BreathPacerPhase =
      segment.prosody.breathChime === 'inhale'
        ? 'inhale'
        : segment.prosody.breathChime === 'exhale'
          ? 'exhale'
          : 'idle';

    emit({
      status: 'playing',
      activeSegmentIndex: index,
      currentSegment: segment,
      progressRatio,
      quizCountdownRemainingSec: null,
      breathPhase,
      errorMessageKo: null,
      announcementKo: `${segment.labelKo} 재생 중`,
    });
    syncMediaSession(segment, 'playing');

    if (
      state.breathChimesEnabled &&
      segment.prosody.breathChime !== 'none' &&
      segment.prosody.breathChime !== 'quiz-tick'
    ) {
      breathSynth.playChime(segment.prosody.breathChime);
    }

    // Tier 1: Cloud Neural + IndexedDB Cache
    const cloudOutcome = await tryCloudPlayback(segment, runId);
    if (destroyed || runId !== playbackRunId) return;

    let spokenOk = cloudOutcome === 'played';

    // Tier 2: Enhanced On-Device Korean Voice + Prosody Rhythm
    if (!spokenOk) {
      emit({ status: 'playing' });
      spokenOk = await speakSegmentOnDevice(segment, runId);
      if (destroyed || runId !== playbackRunId) return;
    }

    if (!spokenOk) {
      syncMediaSession(null, 'none');
      emit({
        status: 'unsupported',
        activeTier: 'text-only',
        voiceQualityLabelKo: '화면 대본 모드',
        breathPhase: 'idle',
        quizCountdownRemainingSec: null,
        errorMessageKo:
          '이 기기에서 한국어 음성을 재생할 수 없어요. 아래 강사 대본으로 전체 내용을 확인해 주세요.',
        announcementKo: '음성 재생 미지원 — 화면 대본을 확인해 주세요.',
      });
      return;
    }

    // After finishing the segment, either run quiz countdown or breathe (pauseMs) before next segment
    const nextIndex = index + 1;
    if (segment.tone === 'quiz-prompt' && (segment.countdownSec ?? 0) > 0) {
      runQuizCountdownThenAdvance(segment.countdownSec ?? 3, nextIndex, runId);
      return;
    }

    if (nextIndex >= segments.length) {
      scheduleTimer(Math.min(350, segment.pauseMs), runId, () => {
        void playSegmentAt(nextIndex, runId);
      });
      return;
    }

    scheduleTimer(segment.pauseMs, runId, () => {
      void playSegmentAt(nextIndex, runId);
    });
  }

  const unregisterSession = movementMediaSessionCoordinator.registerActiveSession(sessionId, {
    stopVoice: (reason) => {
      controller.stop(reason ?? '다른 동작 음성으로 전환되어 정지했어요.');
    },
  });

  const controller: NaturalVoiceController = {
    getState(): NaturalVoiceControllerState {
      return state;
    },

    play(startIndex = 0): boolean {
      if (destroyed || segments.length === 0) return false;
      const safeIndex = clamp(Math.floor(startIndex), 0, segments.length - 1);
      movementMediaSessionCoordinator.notifyMovementActivated(sessionId);

      playbackRunId += 1;
      const runId = playbackRunId;
      stopActivePlaybackResources();

      void playSegmentAt(safeIndex, runId);
      return true;
    },

    pause(): void {
      if (destroyed || (state.status !== 'playing' && state.status !== 'loading')) return;
      playbackRunId += 1;
      stopActivePlaybackResources();
      syncMediaSession(state.currentSegment, 'paused');
      emit({
        status: 'paused',
        quizCountdownRemainingSec: null,
        breathPhase: 'idle',
        announcementKo: '일시정지했어요. 버튼을 누르면 이 구간부터 이어서 들려드려요.',
      });
    },

    resume(): boolean {
      if (destroyed || state.status !== 'paused' || segments.length === 0) return false;
      movementMediaSessionCoordinator.notifyMovementActivated(sessionId);
      playbackRunId += 1;
      const runId = playbackRunId;
      stopActivePlaybackResources();
      void playSegmentAt(state.activeSegmentIndex, runId);
      return true;
    },

    stop(reasonKo?: string): void {
      if (destroyed) return;
      playbackRunId += 1;
      stopActivePlaybackResources();
      syncMediaSession(null, 'none');
      const nextStatus: NaturalVoiceStatus =
        state.activeTier === 'text-only' && !canTryCloud ? 'unsupported' : 'idle';
      emit({
        status: nextStatus,
        activeSegmentIndex: 0,
        currentSegment: segments[0] ?? null,
        progressRatio: 0,
        quizCountdownRemainingSec: null,
        breathPhase: 'idle',
        announcementKo: reasonKo ?? '음성 재생을 멈췄어요.',
      });
    },

    next(): boolean {
      if (destroyed || segments.length === 0) return false;
      const target = Math.min(segments.length - 1, state.activeSegmentIndex + 1);
      if (state.status === 'playing' || state.status === 'loading') {
        return controller.play(target);
      }
      emit({
        activeSegmentIndex: target,
        currentSegment: segments[target] ?? null,
        progressRatio: Number((target / segments.length).toFixed(3)),
        quizCountdownRemainingSec: null,
      });
      return true;
    },

    previous(): boolean {
      if (destroyed || segments.length === 0) return false;
      const target = Math.max(0, state.activeSegmentIndex - 1);
      if (state.status === 'playing' || state.status === 'loading') {
        return controller.play(target);
      }
      emit({
        activeSegmentIndex: target,
        currentSegment: segments[target] ?? null,
        progressRatio: Number((target / segments.length).toFixed(3)),
        quizCountdownRemainingSec: null,
      });
      return true;
    },

    jumpTo(segmentIndex: number): boolean {
      if (
        destroyed ||
        !Number.isInteger(segmentIndex) ||
        segmentIndex < 0 ||
        segmentIndex >= segments.length
      ) {
        return false;
      }
      return controller.play(segmentIndex);
    },

    setSpeed(speed: NaturalVoiceSpeed): void {
      if (destroyed) return;
      const nextSpeed = normalizeNaturalSpeed(speed);
      const wasActive = state.status === 'playing' || state.status === 'loading';
      emit({
        speed: nextSpeed,
        announcementKo: `재생 속도를 ${nextSpeed}배속으로 바꿨어요.`,
      });
      if (wasActive) {
        controller.play(state.activeSegmentIndex);
      }
    },

    setBreathChimesEnabled(enabled: boolean): void {
      if (destroyed) return;
      emit({
        breathChimesEnabled: enabled,
        announcementKo: enabled ? '호흡 알림음을 켰어요.' : '호흡 알림음을 껐어요.',
      });
    },

    setPreferCloud(enabled: boolean): void {
      if (destroyed) return;
      if (enabled) {
        cloudDisabledForSession = false;
      }
      emit({
        preferCloud: enabled,
      });
    },

    destroy(): void {
      if (destroyed) return;
      playbackRunId += 1;
      stopActivePlaybackResources();
      syncMediaSession(null, 'none');
      breathSynth.close();
      unregisterSession();
      destroyed = true;
    },
  };

  return controller;
}
