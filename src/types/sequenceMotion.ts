/** A teacher's role for the whole class, separate from an asset's movement phases. */
export type ClassSectionRole = 'preparation' | 'main' | 'cooldown';

/** A source identity only. It grants no review, eligibility, cadence, or side settings. */
export interface SequenceMotionStudyBinding {
  version: number;
  family: string;
  variantId: string;
  sourceFingerprint: string;
  /** Imported future metadata is retained without interpreting or granting it authority. */
  [key: string]: unknown;
}

export type SequenceMotionStudyBindingStatus =
  'matched' | 'stale' | 'unsupported' | 'unrelated' | 'unbound';
