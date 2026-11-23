import {
  STUDIO_NEURAL_VOICE_MODEL,
  STUDIO_NEURAL_VOICE_PERSONA_KO,
  getStudioNeuralClipAudioUrl,
  getStudioNeuralExerciseAudioUrl,
} from '../data/studioNeuralVoiceManifest';
import { WORLD_PILATES_BY_ID } from '../data/worldPilatesRepertoire1000';

export const STUDIO_NEURAL_VOICE_LABEL_KO = STUDIO_NEURAL_VOICE_PERSONA_KO;
export const STUDIO_NEURAL_VOICE_ENGINE_ID = STUDIO_NEURAL_VOICE_MODEL;

export type StudioNeuralClipId =
  | 'rehearsal-welcome'
  | 'breath-inhale-exhale'
  | 'quiz-prompt-next'
  | 'rehearsal-complete';

export interface ResolvedStudioNeuralAudio {
  readonly url: string;
  readonly resolvedId: string;
  readonly isArchetypeFallback: boolean;
}

/**
 * Resolves a pre-mastered Korean Studio Neural AI MP3 (`ko-KR-SunHiNeural`, -16 LUFS)
 * for any exercise in the 1,752 unified library:
 * - Exact match across all 524 canonical exercises (158 core + 60 studio + 306 global/fusion)
 * - Automatic archetype match (`parentArchetypeId`) for all 1,228 variation entries
 */
export function resolveStudioNeuralExerciseAudio(
  exerciseId: string | undefined | null,
): ResolvedStudioNeuralAudio | null {
  if (!exerciseId) return null;

  const exactUrl = getStudioNeuralExerciseAudioUrl(exerciseId);
  if (exactUrl) {
    return { url: exactUrl, resolvedId: exerciseId, isArchetypeFallback: false };
  }

  const worldEntry = WORLD_PILATES_BY_ID.get(exerciseId);
  const parentId = worldEntry?.parentArchetypeId;
  if (parentId) {
    const parentUrl = getStudioNeuralExerciseAudioUrl(parentId);
    if (parentUrl) {
      return { url: parentUrl, resolvedId: parentId, isArchetypeFallback: true };
    }
  }

  return null;
}

export function resolveStudioNeuralClipAudio(clipId: StudioNeuralClipId): string | null {
  return getStudioNeuralClipAudioUrl(clipId);
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
