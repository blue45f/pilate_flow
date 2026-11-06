import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import apparatus from '../data/motionApparatusSourceLedger.json';
import quadruped from '../data/motionQuadrupedSourceLedger.json';
import { MOTION_DRAFTS } from '../data/motionDrafts';

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const hash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
describe('apparatus and quadruped primary factual records remain separate from authored assets', () => {
  it('preserves four apparatus factual records and their recorded content hashes', () => {
    expect(apparatus.sources).toHaveLength(4);
    for (const source of apparatus.sources) {
      expect(hash(source.factualRecord)).toBe(source.factualRecordSha256);
      expect(source.sourceChecked).toBe(true);
      expect(source.professionalReviewCount).toBe(0);
      expect(source.generalAdultSuitabilityVerified).toBe(false);
      expect(source.observedMediaTimestamps).toEqual([]);
      expect(source.rights.sourceMediaReused).toBe(false);
      expect(source.rights.embedUsed).toBe(false);
    }
  });
  it('preserves all five quadruped records, including mixed-stage and population boundaries', () => {
    expect(quadruped.source_facts).toHaveLength(5);
    for (const record of quadruped.source_facts) {
      const { factual_record_sha256, ...facts } = record;
      expect(hash(facts)).toBe(factual_record_sha256);
      expect(record.not_established.length).toBeGreaterThan(0);
    }
    expect(hash(quadruped.source_facts)).toBe(quadruped.factual_records_sha256);
    expect(quadruped.boundary.expert_reviews).toBe(0);
    expect(quadruped.boundary.approvals).toBe(0);
    expect(quadruped.boundary.media_downloads).toBe(0);
  });
  it('requires each of four new proposals to expose its exact primary factual identity without granting approval', () => {
    const ids = [
      'quadruped-arm-slide',
      'quadruped-leg-slide',
      'reformer-parallel-footwork',
      'chair-seated-pedal-press',
    ];
    const drafts = MOTION_DRAFTS.filter((item) => ids.includes(item.id));
    expect(drafts).toHaveLength(4);
    const sourceHashes = new Map([
      ...apparatus.sources.map(
        (item) => [item.sourceId, item.factualRecordSha256] as const,
      ),
      ...quadruped.source_facts.map(
        (item) => [item.id, item.factual_record_sha256] as const,
      ),
    ]);
    for (const draft of drafts) {
      expect(draft.sources.length).toBeGreaterThan(0);
      for (const source of draft.sources)
        expect(source.factualRecordSha256).toBe(
          sourceHashes.get(source.sourceId!),
        );
      expect(draft.professionalReviewCount).toBe(0);
      expect(draft.exactAssetReady).toBe(false);
      expect(draft.autoRecommendationEligible).toBe(false);
      expect(draft.unknown.length).toBeGreaterThan(0);
    }
  });
});
