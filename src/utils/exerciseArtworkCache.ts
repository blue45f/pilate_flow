import manifest from '../data/exerciseArtworkManifest.json';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import { WORLD_PILATES_BY_ID } from '../data/worldPilatesRepertoire1000';
import type { PilatesExercise } from '../types/pilates';

interface CachedArtworkEntry {
  apparatus: string;
  bodyPosition: string;
  archetypeId: string;
  phases: Record<
    VisualPhaseId,
    {
      src: string;
      sha256?: string;
      bytes?: number;
      labelKo?: string;
      svgSha256?: string;
      inputSha256?: string;
    }
  >;
}

const entries: Readonly<Record<string, CachedArtworkEntry>> = manifest.entries;

function resolveCanonicalArtworkEntry(
  exercise: Pick<PilatesExercise, 'id' | 'apparatus' | 'bodyPosition'>,
): CachedArtworkEntry | undefined {
  if (Object.hasOwn(entries, exercise.id)) {
    return entries[exercise.id];
  }
  const world = WORLD_PILATES_BY_ID.get(exercise.id);
  if (
    world &&
    world.tier === 'variation' &&
    world.parentArchetypeId &&
    Object.hasOwn(entries, world.parentArchetypeId)
  ) {
    return entries[world.parentArchetypeId];
  }
  return undefined;
}

export function hasDirectExerciseArtwork(
  exercise: Pick<PilatesExercise, 'id' | 'apparatus' | 'bodyPosition'>,
): boolean {
  const entry = Object.hasOwn(entries, exercise.id) ? entries[exercise.id] : undefined;
  return Boolean(
    entry && entry.apparatus === exercise.apparatus && entry.bodyPosition === exercise.bodyPosition,
  );
}

export function hasExerciseArtworkIdentityMismatch(
  exercise: Pick<PilatesExercise, 'id' | 'apparatus' | 'bodyPosition'>,
) {
  const entry = resolveCanonicalArtworkEntry(exercise);
  return Boolean(
    entry &&
    (entry.apparatus !== exercise.apparatus || entry.bodyPosition !== exercise.bodyPosition),
  );
}

/**
 * Resolves unified high-resolution Blender 5.3 Cycles 3D WebP frames:
 * - All 524 atomic representative movements (218 core + 306 world/fusion atomics) resolve directly.
 * - All 1,228 catalog variations resolve via their apparatus/posture-matched parent archetype.
 * - A changed apparatus/posture or an unmodeled custom movement never reuses an unrelated cached pose.
 */
export function getExerciseArtworkFrame(
  exercise: Pick<PilatesExercise, 'id' | 'apparatus' | 'bodyPosition'>,
  phase: VisualPhaseId = 'middle',
) {
  const entry = resolveCanonicalArtworkEntry(exercise);
  if (
    !entry ||
    entry.apparatus !== exercise.apparatus ||
    entry.bodyPosition !== exercise.bodyPosition
  )
    return undefined;
  return { ...entry.phases[phase], width: manifest.width, height: manifest.height };
}
