import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ledger from '../data/motionSelectedV6SourceLedger.json';
import previous from '../data/motionSelectedV5SourceLedger.json';
import { MAT_V6_PROPOSALS } from '../data/motionDraftV6';
import { MOTION_DRAFTS } from '../data/motionDrafts';
import { getMotionDraftComparisons } from '../data/motionDraftIndex';
import { getExerciseMotionReference, MOTION_REFERENCE_COUNTS } from '../data/motionReferences';
import { MotionDraftFigure } from '../components/MotionDraftFigure';
import { CHEST_LIFT_PROVENANCE } from '../models/chestLiftProvenance';
import { PELVIC_CURL_PROVENANCE } from '../models/pelvicCurl';

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

describe('V6 factual lineage and independently authored mat comparisons', () => {
  it('counts two patterns on one reused URL without inventing additional source or review coverage', () => {
    expect(ledger.sources).toHaveLength(2);
    expect(new Set(ledger.sources.map((source) => source.url)).size).toBe(1);
    expect(ledger.counts.newUniqueSourceUrls).toBe(0);
    for (const source of ledger.sources) {
      expect(
        createHash('sha256')
          .update(JSON.stringify(canonical(source.factualRecord)))
          .digest('hex'),
      ).toBe(source.factualRecordSha256);
      expect(source.sourceChecked).toBe(true);
      expect(source.professionalReviewCount).toBe(0);
      expect(source.exactMotionMappingCount).toBe(0);
      expect(source.mediaTimestamps).toEqual([]);
      expect(source.sourceMediaObserved).toBe(false);
      expect(source.sourceMediaCopied).toBe(false);
      expect(source.sourceMediaTraced).toBe(false);
      expect(source.rights.reuseLicenseEstablished).toBe(false);
      expect(source.articleBylineObserved).toContain('CJ Kelly');
      expect(source.footerAuthorLabelObserved).toBe('By SecoSan');
    }
    const chest = ledger.sources.find(
      (source) => source.sourceId === 'basi-cjkelly-chest-lift-v1',
    )!;
    expect(chest.factualRecord).toEqual(
      previous.sources.find((source) => source.sourceId === chest.sourceId)!.factualRecord,
    );
  });
  it('registers seventeen explicit draft identities while canonical mat entries remain unavailable', () => {
    expect(MOTION_DRAFTS).toHaveLength(17);
    for (const draft of MAT_V6_PROPOSALS) {
      expect(getMotionDraftComparisons(draft.intendedExerciseId).map((item) => item.id)).toEqual([
        draft.id,
      ]);
      expect(draft).toMatchObject({
        exactAssetReady: false,
        professionalReviewCount: 0,
        autoRecommendationEligible: false,
        exactSourceVariantMatched: false,
        sourceVariantReconciliationRequired: true,
      });
      expect(getExerciseMotionReference(draft.intendedExerciseId)).toMatchObject({
        status: 'not_authored',
        asset: null,
      });
      expect(draft.variantRequirements?.every((item) => item.basis === 'mixed')).toBe(true);
    }
    expect(MOTION_REFERENCE_COUNTS.authoredCatalogMotions).toBe(0);
    expect(MOTION_REFERENCE_COUNTS.expertApprovedMotions).toBe(0);
  });
  it('ties source-record hashes to each own model and keeps the chest pattern/draft IDs distinct', () => {
    for (const provenance of [CHEST_LIFT_PROVENANCE, PELVIC_CURL_PROVENANCE]) {
      expect(
        ledger.sources.find((record) => record.sourceId === provenance.sourceId)
          ?.factualRecordSha256,
      ).toBe(provenance.factualRecordSha256);
      expect(provenance.professionalReviewCount).toBe(0);
      expect(provenance.exactSourceVariantMatched).toBe(false);
    }
    expect(CHEST_LIFT_PROVENANCE.authoredDraftId).toBe('supine-chest-lift');
    expect(CHEST_LIFT_PROVENANCE.ledgerPatternId).toBe('mat-chest-lift');
    expect(CHEST_LIFT_PROVENANCE.feetFlatSourceEstablished).toBe(false);
    expect(CHEST_LIFT_PROVENANCE.fullPelvisFixationSourceEstablished).toBe(false);
    expect(MAT_V6_PROPOSALS[0].unknown.join(' ')).toContain('시선 지시');
    expect(MAT_V6_PROPOSALS[1].mismatched.join(' ')).toContain('이전 2D 브리지');
  });
  it.each(['supine-chest-lift', 'articulated-pelvic-curl'] as const)(
    'dispatches %s to its own changing SVG without importing media or substituting a catalog asset',
    (draftId) => {
      const start = renderToStaticMarkup(<MotionDraftFigure draftId={draftId} progress={0} />);
      const middle = renderToStaticMarkup(<MotionDraftFigure draftId={draftId} progress={0.5} />);
      expect(start).toContain(`data-motion-draft-id="${draftId}"`);
      expect(middle).toContain(`data-motion-draft-id="${draftId}"`);
      expect(start).not.toEqual(middle);
      expect(start).not.toMatch(/<(?:video|image|iframe)\b/);
      expect(start).not.toContain('floor-seated-band-row');
    },
  );
});
