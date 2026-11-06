import ledger from '../data/motionStudyLedger.json';

export type MotionStudyFamily = 'existing-proposal' | 'authoring-batch' | 'supine-reach';
export type MotionStudyPhaseId = 'setup' | 'move' | 'turn' | 'return' | 'finish';
export type MotionStudyStageId = 'setup' | 'main' | 'finish';
export interface MotionStudyPhase {
  readonly id: MotionStudyPhaseId;
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly sample: number;
  /** Original source metadata; absent declarations remain unknown. No hold prescription. */
  readonly displayBehavior: 'hold' | 'move' | 'unknown';
}
export interface MotionStudyStage {
  readonly id: MotionStudyStageId;
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly phaseIds: readonly MotionStudyPhaseId[];
}
export interface MotionStudyEntry {
  readonly family: MotionStudyFamily;
  readonly variantId: string;
  readonly intendedExerciseIds: readonly string[];
  readonly title: string;
  readonly sideMode: 'bilateral' | 'unilateral';
  /** Source identity only. This value is never a reviewed asset SHA or exact-match grant. */
  readonly sourceFingerprint: string;
  readonly fingerprintScope: 'authored-source-bundle-sha256-v1';
  readonly sourceFiles: readonly { readonly path: string; readonly sha256: string }[];
  readonly phases: readonly MotionStudyPhase[];
  readonly stages: readonly MotionStudyStage[];
}

/** Lightweight generated data only: no model, renderer, registry, player or catalog import. */
export const MOTION_STUDY_ENTRIES: readonly MotionStudyEntry[] =
  ledger.entries as readonly MotionStudyEntry[];

export function getMotionStudyEntry(family: string, variantId: string): MotionStudyEntry | null {
  return MOTION_STUDY_ENTRIES.find((entry) => entry.family === family && entry.variantId === variantId) ?? null;
}

function intervalAt<T extends { readonly start: number; readonly end: number }>(
  intervals: readonly T[], progress: number,
): T | null {
  if (!Number.isFinite(progress)) return null;
  const clamped = Math.max(0, Math.min(1, progress));
  return intervals.find((interval) => clamped >= interval.start
    && (clamped < interval.end || clamped === 1 && interval.end === 1)) ?? null;
}

/** Half-open local intervals; progress 1 belongs to finish. Not a class section lookup. */
export function getMotionStudyPhase(entry: MotionStudyEntry, progress: number): MotionStudyPhase | null {
  return intervalAt(entry.phases, progress);
}

/** setup/finish are established authored poses; main includes move, turn and return. */
export function getMotionStudyStage(entry: MotionStudyEntry, progress: number): MotionStudyStage | null {
  return intervalAt(entry.stages, progress);
}
