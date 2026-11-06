import { describe, expect, it } from 'vitest';
import { MOTION_DRAFT_COMPARISONS, getMotionDraftComparisons } from '../data/motionDraftIndex';
import { MOTION_DRAFT_IDS } from '../models/types';
import { MOTION_DRAFTS, getMotionDraft } from '../data/motionDrafts';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import { getExerciseMotionReference } from '../data/motionReferences';

describe('proposal discovery index never maps canonical assets', () => {
  it('covers each authored proposal once with the same exact intended comparison ID', () => {
    expect(MOTION_DRAFT_COMPARISONS).toHaveLength(17);
    expect([...new Set(MOTION_DRAFT_COMPARISONS.map((entry) => entry.id))].sort()).toEqual(
      [...MOTION_DRAFT_IDS].sort(),
    );
    for (const entry of MOTION_DRAFT_COMPARISONS) {
      const proposal = MOTION_DRAFTS.find((draft) => draft.id === entry.id)!;
      expect(proposal.intendedExerciseId).toBe(entry.intendedExerciseId);
      expect(entry.status).toBe('unreviewed-comparison-only');
      expect(ORIGINAL_MOVEMENTS.some((exercise) => exercise.id === entry.intendedExerciseId)).toBe(
        true,
      );
      expect(getMotionDraft(entry.intendedExerciseId)).toBeNull();
      const canonical = getExerciseMotionReference(entry.intendedExerciseId)!;
      expect(canonical.status).toBe('not_authored');
      expect(canonical.asset).toBeNull();
    }
  });
  it('keeps two quadruped variants under one comparison identity without inflating catalog coverage', () => {
    expect(
      getMotionDraftComparisons('original-mat-quadruped-reach').map((entry) => entry.id),
    ).toEqual(['quadruped-arm-slide', 'quadruped-leg-slide']);
    expect(new Set(MOTION_DRAFT_COMPARISONS.map((entry) => entry.intendedExerciseId)).size).toBe(
      16,
    );
    expect(getMotionDraftComparisons('quadruped-arm-slide')).toEqual([]);
    expect(getMotionDraftComparisons('unknown')).toEqual([]);
  });
});
