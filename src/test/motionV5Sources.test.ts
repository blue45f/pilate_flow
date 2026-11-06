import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import ledger from '../data/motionSelectedV5SourceLedger.json';
import { FLOOR_SEATED_BAND_ROW_PROPOSAL } from '../data/motionDraftV5';
import { MOTION_DRAFTS, getMotionDraft } from '../data/motionDrafts';
import { MOTION_DRAFT_COMPARISONS, getMotionDraftComparisons } from '../data/motionDraftIndex';
import { getExerciseMotionReference, MOTION_REFERENCE_COUNTS } from '../data/motionReferences';
import { getSeatedBandRowPose, SEATED_BAND_ROW_PHASES } from '../models/seatedBandRow';
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;

describe('V5 source facts and original band-row remain distinct from exact assets', () => {
  it('keeps V5 band-row evidence with seventeen proposals and sixteen comparison identities with no canonical asset grant', () => {
    expect(MOTION_DRAFTS).toHaveLength(17);
    expect(new Set(MOTION_DRAFTS.map((d) => d.id)).size).toBe(17);
    expect(new Set(MOTION_DRAFT_COMPARISONS.map((d) => d.intendedExerciseId)).size).toBe(16);
    expect(getMotionDraftComparisons('original-mat-band-row').map((d) => d.id)).toEqual([
      'floor-seated-band-row',
    ]);
    expect(getMotionDraft('original-mat-band-row')).toBeNull();
    expect(getExerciseMotionReference('original-mat-band-row')).toMatchObject({
      status: 'not_authored',
      asset: null,
    });
    expect(MOTION_REFERENCE_COUNTS.authoredCatalogMotions).toBe(0);
    expect(MOTION_REFERENCE_COUNTS.expertApprovedMotions).toBe(0);
  });
  it('retains factual-record-only hashes and distinguishes publication review from motion review', () => {
    for (const source of ledger.sources) {
      expect(
        createHash('sha256')
          .update(JSON.stringify(canonical(source.factualRecord)))
          .digest('hex'),
      ).toBe(source.factualRecordSha256);
      expect(source.sourceChecked).toBe(true);
      expect(source.mediaTimestamps).toEqual([]);
      expect(source.professionalReviewCount).toBe(0);
      expect(source.rights.sourceMediaObserved).toBe(false);
      expect(source.rights.mediaCopied).toBe(false);
    }
    const draft = FLOOR_SEATED_BAND_ROW_PROPOSAL;
    expect(draft.sources.map((s) => s.sourceId)).toEqual(['harvard-floor-seated-band-row-v1']);
    expect(draft.sources[0].context).toContain('편집 검토와 이 모션의 전문 검토는 별개');
    expect(draft).toMatchObject({
      professionalReviewCount: 0,
      exactAssetReady: false,
      autoRecommendationEligible: false,
      exactSourceVariantMatched: false,
      sourceVariantReconciliationRequired: true,
    });
    expect(draft.variantRequirements?.some((r) => r.id === 'long-elastic-band-unspecified')).toBe(
      true,
    );
    expect(draft.mismatched.join(' ')).toContain('폐쇄형 루프 밴드');
  });
  it('preserves V5 chest research lineage without turning later authored comparisons into exact assets', () => {
    expect(ledger.patterns).toHaveLength(2);
    expect(getMotionDraftComparisons('original-mat-chest-lift').map((entry) => entry.id)).toEqual([
      'supine-chest-lift',
    ]);
    expect(getExerciseMotionReference('original-mat-chest-lift')).toMatchObject({
      status: 'not_authored',
      asset: null,
    });
  });
  it('ties explicit display holds to the actual authored rig instead of phase-name inference', () => {
    for (const phase of SEATED_BAND_ROW_PHASES) {
      const first = getSeatedBandRowPose(phase.start + (phase.end - phase.start) * 0.25).world;
      const last = getSeatedBandRowPose(phase.start + (phase.end - phase.start) * 0.75).world;
      if (phase.displayBehavior === 'hold') expect(last).toEqual(first);
      else {
        expect(phase.displayBehavior).toBe('move');
        expect(last).not.toEqual(first);
      }
    }
  });
});
