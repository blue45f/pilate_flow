import {
  DEFAULT_STUDIO_VOICE_PERSONA,
  STUDIO_NEURAL_VOICE_MODEL,
  STUDIO_NEURAL_VOICE_PERSONA_KO,
  STUDIO_VOICE_PERSONAS,
  getStudioNeuralClipAudioUrl,
  getStudioNeuralExerciseAudioUrl,
  type StudioVoicePersonaId,
  type StudioVoicePersonaMeta,
} from '../data/studioNeuralVoiceManifest';
import { WORLD_PILATES_BY_ID } from '../data/worldPilatesRepertoire1000';

export type { StudioVoicePersonaId, StudioVoicePersonaMeta };
export { DEFAULT_STUDIO_VOICE_PERSONA, STUDIO_VOICE_PERSONAS };

export const STUDIO_NEURAL_VOICE_LABEL_KO = STUDIO_NEURAL_VOICE_PERSONA_KO;
export const STUDIO_NEURAL_VOICE_ENGINE_ID = STUDIO_NEURAL_VOICE_MODEL;
export const STUDIO_VOICE_PERSONA_STORAGE_KEY = 'pf_studio_voice_persona_v1';

export type StudioNeuralClipId =
  | 'rehearsal-welcome'
  | 'breath-inhale-exhale'
  | 'quiz-prompt-next'
  | 'rehearsal-complete'
  | 'briefing-welcome'
  | 'briefing-next-class'
  | 'briefing-complete';

export interface ResolvedStudioNeuralAudio {
  readonly url: string;
  readonly resolvedId: string;
  readonly personaUsed: StudioVoicePersonaId;
  readonly personaLabelKo: string;
  readonly modelId: string;
  readonly isArchetypeFallback: boolean;
}

const personaListeners = new Set<(persona: StudioVoicePersonaId) => void>();
let inMemoryPersona: StudioVoicePersonaId | null = null;

function isValidPersona(raw: unknown): raw is StudioVoicePersonaId {
  return raw === 'seoyeon' || raw === 'hyunsu';
}

export function getPreferredStudioVoicePersona(): StudioVoicePersonaId {
  if (inMemoryPersona) return inMemoryPersona;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STUDIO_VOICE_PERSONA_STORAGE_KEY);
      if (isValidPersona(saved)) {
        inMemoryPersona = saved;
        return saved;
      }
    }
  } catch {
    // Ignore storage read errors in private/restricted browsers
  }
  return DEFAULT_STUDIO_VOICE_PERSONA;
}

export function setPreferredStudioVoicePersona(persona: StudioVoicePersonaId): void {
  const safe: StudioVoicePersonaId = isValidPersona(persona)
    ? persona
    : DEFAULT_STUDIO_VOICE_PERSONA;
  inMemoryPersona = safe;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STUDIO_VOICE_PERSONA_STORAGE_KEY, safe);
    }
  } catch {
    // Ignore storage write errors
  }
  for (const listener of personaListeners) {
    try {
      listener(safe);
    } catch {
      // Ignore subscriber error
    }
  }
}

export function subscribeStudioVoicePersona(
  listener: (persona: StudioVoicePersonaId) => void,
): () => void {
  personaListeners.add(listener);
  return () => {
    personaListeners.delete(listener);
  };
}

export function getStudioVoicePersonaMeta(
  persona: StudioVoicePersonaId = getPreferredStudioVoicePersona(),
): StudioVoicePersonaMeta {
  return STUDIO_VOICE_PERSONAS[persona] ?? STUDIO_VOICE_PERSONAS[DEFAULT_STUDIO_VOICE_PERSONA];
}

/**
 * Resolves a pre-mastered Korean Studio Neural AI MP3 (-16 LUFS) for any exercise in the
 * 1,752 unified library:
 * - Checks the requested persona (`seoyeon` 524종 or `hyunsu` 218종) first, then archetype
 *   (`parentArchetypeId`), then falls back seamlessly to `seoyeon` so 100% of 1,752 entries play AI audio.
 */
export function resolveStudioNeuralExerciseAudio(
  exerciseId: string | undefined | null,
  persona: StudioVoicePersonaId = getPreferredStudioVoicePersona(),
): ResolvedStudioNeuralAudio | null {
  if (!exerciseId) return null;

  const exactUrl = getStudioNeuralExerciseAudioUrl(exerciseId, persona);
  if (exactUrl) {
    const usedPersona: StudioVoicePersonaId = exactUrl.includes('/hyunsu/') ? 'hyunsu' : 'seoyeon';
    const meta = STUDIO_VOICE_PERSONAS[usedPersona];
    return {
      url: exactUrl,
      resolvedId: exerciseId,
      personaUsed: usedPersona,
      personaLabelKo: meta.labelKo,
      modelId: meta.modelId,
      isArchetypeFallback: false,
    };
  }

  const worldEntry = WORLD_PILATES_BY_ID.get(exerciseId);
  const parentId = worldEntry?.parentArchetypeId;
  if (parentId) {
    const parentUrl = getStudioNeuralExerciseAudioUrl(parentId, persona);
    if (parentUrl) {
      const usedPersona: StudioVoicePersonaId = parentUrl.includes('/hyunsu/')
        ? 'hyunsu'
        : 'seoyeon';
      const meta = STUDIO_VOICE_PERSONAS[usedPersona];
      return {
        url: parentUrl,
        resolvedId: parentId,
        personaUsed: usedPersona,
        personaLabelKo: meta.labelKo,
        modelId: meta.modelId,
        isArchetypeFallback: true,
      };
    }
  }

  return null;
}

export function resolveStudioNeuralClipAudio(
  clipId: StudioNeuralClipId,
  persona: StudioVoicePersonaId = getPreferredStudioVoicePersona(),
): {
  readonly url: string;
  readonly personaUsed: StudioVoicePersonaId;
  readonly personaLabelKo: string;
  readonly modelId: string;
} | null {
  const url = getStudioNeuralClipAudioUrl(clipId, persona);
  if (!url) return null;
  const usedPersona: StudioVoicePersonaId = url.includes('/hyunsu/') ? 'hyunsu' : 'seoyeon';
  const meta = STUDIO_VOICE_PERSONAS[usedPersona];
  return {
    url,
    personaUsed: usedPersona,
    personaLabelKo: meta.labelKo,
    modelId: meta.modelId,
  };
}

/**
 * Fetches same-origin pre-mastered studio neural MP3 bytes safely,
 * rejecting SPA HTML fallback responses (`text/html`) and truncated payloads.
 */
export async function fetchStudioNeuralAudioBytes(
  url: string,
  fetchFn: typeof fetch | undefined = typeof fetch === 'function' ? fetch : undefined,
): Promise<ArrayBuffer | null> {
  if (!fetchFn || !url.startsWith('/audio/')) return null;
  try {
    const response = await fetchFn(url, { cache: 'force-cache' });
    if (!response.ok) return null;
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (/text\/html|application\/json/i.test(contentType)) {
      return null;
    }
    const bytes = await response.arrayBuffer();
    if (!bytes || bytes.byteLength < 1024) return null;
    return bytes;
  } catch {
    return null;
  }
}
