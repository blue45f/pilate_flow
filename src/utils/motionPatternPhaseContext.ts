import { MOTION_PHASE_CONTEXT_NOTES } from '../data/motionPhaseContextNotes';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import type { DraftPhase } from '../models/types';
import { getMotionStudyEntry } from './motionStudyStages';
import type { MotionStudyPhaseId } from './motionStudyStages';

export interface MotionPatternPhaseContext {
  readonly phaseId: MotionStudyPhaseId;
  readonly phaseLabel: string;
  /** Existing authored declaration only; absent declarations stay unknown. */
  readonly displayBehavior: 'hold' | 'move' | 'unknown';
  readonly detailStatus: 'available' | 'not_authored' | 'stale';
  readonly poseSummaryKo?: string;
  readonly contactChangeKo?: string;
  readonly qualifications: readonly string[];
  readonly cycleSupportSummary: string;
  readonly sourceContext: string;
  readonly basis: 'authored-model';
  /** Current ledger identity, never a reviewed asset or source-match approval. */
  readonly sourceFingerprint: string;
}

/**
 * Read-only phase context for an explicit authored identity. Current source phase labels and
 * behavior remain available when extra annotations are absent or their inspected hash is stale.
 * Finite progress clamps to 0..1; intervals are half-open except the final endpoint.
 */
export function getMotionPatternPhaseContext(
  reference: Readonly<MotionPatternReference>,
  progress: number,
): MotionPatternPhaseContext | null {
  if (!reference || !Number.isFinite(progress)) return null;
  const entry = getMotionStudyEntry(reference.family, reference.variantId);
  if (!entry || reference.definition?.id !== reference.variantId) return null;
  const clamped = Math.max(0, Math.min(1, progress));
  const phases: readonly DraftPhase[] = reference.definition.phases;
  const phase = phases.find(
    (item) => clamped >= item.start && (clamped < item.end || (clamped === 1 && item.end === 1)),
  );
  if (!phase) return null;

  const notes = MOTION_PHASE_CONTEXT_NOTES.find(
    (item) => item.family === reference.family && item.variantId === reference.variantId,
  );
  const detailStatus = !notes
    ? 'not_authored'
    : notes.expectedSourceFingerprint === entry.sourceFingerprint
      ? 'available'
      : 'stale';
  const detail = detailStatus === 'available' ? notes?.phases[phase.id] : undefined;

  return {
    phaseId: phase.id,
    phaseLabel: phase.labelKo ?? phase.label,
    displayBehavior: phase.displayBehavior ?? 'unknown',
    detailStatus,
    ...(detail
      ? { poseSummaryKo: detail.poseSummaryKo, contactChangeKo: detail.contactChangeKo }
      : {}),
    qualifications: detail?.qualifications ?? [],
    cycleSupportSummary: reference.definition.supportSummary ?? reference.definition.supportNote,
    sourceContext: reference.context,
    basis: 'authored-model',
    sourceFingerprint: entry.sourceFingerprint,
  };
}
