import { buildStoryboardTimeline } from '../utils/motionStoryboard';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import ledger from '../data/motionDraftSourceLedger.json';
import { MOTION_DRAFTS, getMotionDraft } from '../data/motionDrafts';
import { MOTION_DRAFT_IDS } from '../models/types';
import { getExerciseMotionReference, MOTION_REFERENCE_COUNTS } from '../data/motionReferences';

const sorted = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(sorted)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b, 'en'))
            .map(([key, item]) => [key, sorted(item)]),
        )
      : value;

describe('source facts and original proposal boundaries', () => {
  it('preserves eight factual records from seven URLs with exact content hashes and narrow populations', () => {
    expect(ledger.sources).toHaveLength(8);
    expect(new Set(ledger.sources.map((source) => source.url)).size).toBe(7);
    for (const source of ledger.sources) {
      expect(source.sourceChecked).toBe(true);
      expect(source.professionalMotionReviewCount).toBe(0);
      expect(source.generalAdultSuitabilityVerified).toBe(false);
      expect(source.intendedPopulationContext.generalAdultSuitabilityEstablished).toBe(false);
      expect(source.observedMediaTimestamps).toEqual([]);
      expect(source.rights.use).toBe('reference-only');
      const hash = createHash('sha256')
        .update(JSON.stringify(sorted(source.factualRecord)))
        .digest('hex');
      expect(hash).toBe(source.factualRecordSha256);
    }
  });

  it('requires explicit proposal IDs and never substitutes them for a catalog exercise or approval', () => {
    expect(new Set(MOTION_DRAFTS.map((draft) => draft.id))).toEqual(new Set(MOTION_DRAFT_IDS));
    expect(MOTION_DRAFTS).toHaveLength(17);
    for (const draft of MOTION_DRAFTS) {
      expect(getMotionDraft(draft.id)).toBe(draft);
      expect(getMotionDraft(draft.intendedExerciseId)).toBeNull();
      expect(draft.status).toBe('variant-proposal');
      expect(draft.professionalReviewCount).toBe(0);
      expect(draft.exactAssetReady).toBe(false);
      expect(draft.autoRecommendationEligible).toBe(false);
      expect(getExerciseMotionReference(draft.intendedExerciseId)?.asset).toBeNull();
    }
    expect(MOTION_REFERENCE_COUNTS.authoredCatalogMotions).toBe(0);
    expect(MOTION_REFERENCE_COUNTS.expertApprovedMotions).toBe(0);
  });

  it('retains the denied source as excluded evidence without converting it into a working reference', () => {
    expect(ledger.accessDenials).toHaveLength(1);
    const denied = JSON.stringify(ledger.accessDenials[0]);
    expect(denied).toContain('403');
    expect(ledger.sources.some((source) => denied.includes(source.url))).toBe(false);
    for (const draft of MOTION_DRAFTS.filter((item) =>
      ledger.patterns.some((pattern) => pattern.patternId === item.sourcePatternId),
    )) {
      expect(draft.sourceFactsCheckedAt).toBe(ledger.accessDateUtc);
      expect(
        draft.sources.every(
          (source) => !!source.sourceId && /^[a-f0-9]{64}$/.test(source.factualRecordSha256 ?? ''),
        ),
      ).toBe(true);
      expect(draft.unknown.length + draft.mismatched.length).toBeGreaterThan(0);
    }
  });
  it('uses the actual professional review field when guarding the unreviewed-only authoring tool', () => {
    const reviewed = { ...MOTION_DRAFTS[0], professionalReviewCount: 1 };
    expect(buildStoryboardTimeline([], [reviewed]).valid).toBe(false);
    expect(buildStoryboardTimeline([], [MOTION_DRAFTS[0]]).valid).toBe(true);
  });
});
