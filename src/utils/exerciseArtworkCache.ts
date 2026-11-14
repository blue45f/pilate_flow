import manifest from '../data/exerciseArtworkManifest.json';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import type { PilatesExercise } from '../types/pilates';

interface CachedArtworkEntry {
  apparatus: string;
  bodyPosition: string;
  archetypeId: string;
  phases: Record<
    VisualPhaseId,
    {
      src: string;
      sha256: string;
      bytes: number;
      labelKo?: string;
      svgSha256?: string;
      inputSha256?: string;
    }
  >;
}

const entries: Readonly<Record<string, CachedArtworkEntry>> = manifest.entries;

export function hasExerciseArtworkIdentityMismatch(
  exercise: Pick<PilatesExercise, 'id' | 'apparatus' | 'bodyPosition'>,
) {
  const entry = Object.hasOwn(entries, exercise.id) ? entries[exercise.id] : undefined;
  return Boolean(
    entry &&
    (entry.apparatus !== exercise.apparatus || entry.bodyPosition !== exercise.bodyPosition),
  );
}

/** A changed apparatus/posture or an unmodeled movement must never reuse an unrelated cached pose. */
export function getExerciseArtworkFrame(
  exercise: Pick<PilatesExercise, 'id' | 'apparatus' | 'bodyPosition'>,
  phase: VisualPhaseId = 'middle',
) {
  const entry = Object.hasOwn(entries, exercise.id) ? entries[exercise.id] : undefined;
  if (
    !entry ||
    entry.apparatus !== exercise.apparatus ||
    entry.bodyPosition !== exercise.bodyPosition
  )
    return undefined;
  return { ...entry.phases[phase], width: manifest.width, height: manifest.height };
}
