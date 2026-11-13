import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import ledger from '../data/motionCandidateResearchV7.json';
import {
  getMotionCandidateResearch,
  MOTION_CANDIDATE_RESEARCH_V7_ASSOCIATION,
} from '../data/motionCandidateResearch';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { MOTION_DRAFTS } from '../data/motionDrafts';
import { getMotionDraftComparisons } from '../data/motionDraftIndex';
import { getExerciseMotionReference, MOTION_REFERENCE_COUNTS } from '../data/motionReferences';

const IDS = ['original-mat-swan-prep', 'original-mat-forearm-plank'] as const;
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

describe('V7 research-only candidate associations', () => {
  it('preserves the frozen historical ledger bytes and keeps the full root base association separate', () => {
    const raw = readFileSync(resolve(process.cwd(), 'src/data/motionCandidateResearchV7.json'));
    expect(createHash('sha256').update(raw).digest('hex')).toBe(
      'a96737cd152bb0885f79ed8bfb68a3fd2391e74ec5af55d39a5f9e0201dc5501',
    );
    expect(ledger.baseHeadPrefixProvidedByParent).toBe('78ec179');
    expect(ledger.fullBaseHeadNotProvided).toBe(true);
    expect(ledger.gitHeadIndependentlyChecked).toBe(false);
    expect(MOTION_CANDIDATE_RESEARCH_V7_ASSOCIATION.baseHead).toBe(
      '78ec1797040620257a74b86df606c80d2898a69b',
    );
    expect(MOTION_CANDIDATE_RESEARCH_V7_ASSOCIATION.motionProposalsAdded).toBe(0);
    expect(MOTION_CANDIDATE_RESEARCH_V7_ASSOCIATION.professionalMotionReviewsAdded).toBe(0);
  });

  it('associates only the two exact existing canonical IDs, without coercing aliases or user input', () => {
    expect(IDS.map((id) => getMotionCandidateResearch(id).length)).toEqual([1, 1]);
    const toString = vi.fn(() => IDS[0]);
    for (const value of [
      undefined,
      null,
      0,
      { toString },
      '',
      'prone-baby-swan',
      'kneeling-forearm-plank',
      'original-mat-swan-prep ',
      ' original-mat-forearm-plank',
      'original-mat-bridge',
      'original-reformer-swan-prep',
      'ex-custom-own-swan-prep',
    ])
      expect(getMotionCandidateResearch(value)).toEqual([]);
    expect(toString).not.toHaveBeenCalled();
    expect(
      INITIAL_EXERCISES.filter((exercise) => getMotionCandidateResearch(exercise.id).length)
        .map((exercise) => exercise.id)
        .sort(),
    ).toEqual([...IDS].sort());
  });

  it('does not register models, proposals, expert reviews or canonical motion assets', () => {
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(MOTION_DRAFTS).toHaveLength(17);
    for (const id of IDS) {
      const [candidate] = getMotionCandidateResearch(id);
      expect(candidate).toMatchObject({
        exerciseId: id,
        status: 'research-only; no authored motion',
        canonicalAsset: null,
        professionalReviewCount: 0,
        autoRecommendationEligible: false,
        modelAuthored: false,
        exactAssetReady: false,
        exactSourceVariantMatched: false,
        sourceVariantReconciliationRequired: true,
        safetyAssessment: 'unassessed',
        playbackTimingEstablished: false,
      });
      expect(getMotionDraftComparisons(id)).toEqual([]);
      expect(MOTION_DRAFTS.some((draft) => draft.id === candidate.candidateId)).toBe(false);
      expect(getExerciseMotionReference(id)).toMatchObject({
        status: 'not_authored',
        asset: null,
        prototypeId: null,
        professionalReviewStatus: 'unreviewed',
        expertApproved: false,
      });
      for (const key of ['phases', 'durationMs', 'model', 'motionDraftId', 'reviewedAssetSha256'])
        expect(candidate).not.toHaveProperty(key);
    }
    expect(MOTION_REFERENCE_COUNTS.authoredCatalogMotions).toBe(0);
    expect(MOTION_REFERENCE_COUNTS.expertApprovedMotions).toBe(0);
  });

  it('retains per-record factual hashes and the actual source URL/date without treating hashes as reviews', () => {
    const expected = [
      [
        'basi-cjkelly-baby-swan-v1',
        'b9475ba454ce0ee185fc7b3b6133015454c31bd97cad55d11b11aaa1ed393e51',
      ],
      [
        'nth-optimise-elbow-knee-plank-v1',
        'b240f9375555cf74e99ecf36848d20ef01f4ca1c6f510d44916facadd9da7c65',
      ],
    ];
    for (const [index, id] of IDS.entries()) {
      const [candidate] = getMotionCandidateResearch(id);
      const source = ledger.sources.find((item) => item.sourceId === candidate.source.sourceId)!;
      expect([candidate.source.sourceId, candidate.source.factualRecordSha256]).toEqual(
        expected[index],
      );
      expect(
        createHash('sha256')
          .update(JSON.stringify(canonical(source.factualRecord)))
          .digest('hex'),
      ).toBe(candidate.source.factualRecordSha256);
      expect(candidate.source.url).toBe(source.url);
      expect(candidate.source.checkedAtUtc).toBe('2026-11-05T05:18:36Z');
      expect(candidate.source.sourceChecked).toBe(true);
      expect(candidate.source.factualRecordHashScope).toContain('factualRecord only');
      expect(candidate.professionalReviewCount).toBe(0);
    }
  });

  it('keeps the missing plank return and clinical dosage out of verified movement/playback timing', () => {
    const [plank] = getMotionCandidateResearch(IDS[1]);
    expect(plank.facts.find((fact) => fact.id === 'return')).toMatchObject({
      text: 'Not specified.',
      kind: 'source-unknown',
    });
    expect(plank.facts.find((fact) => fact.id === 'clinicalDosageContext')).toMatchObject({
      kind: 'clinical-context',
    });
    expect(plank.unknown.join(' ')).toContain('Descent/release sequence');
    expect(plank.authoringChoicesRequired.join(' ')).toContain('Descent');
    expect(plank.playbackTimingEstablished).toBe(false);
    expect(plank.source.population).toMatchObject({
      category: 'cancer prehabilitation patient home-exercise programme',
      generalAdultSuitabilityEstablished: false,
      individualSuitabilityEstablished: false,
      clinicalUseInferred: false,
    });
    expect(plank.source.population.contextLabelKo).toContain('암 치료 전');
    expect(plank.source.attributionNoteKo).toContain('physiotherapyexercises.com');
  });

  it('preserves the separate Swan preparation boundary and unknown continuous hand support', () => {
    const [swan] = getMotionCandidateResearch(IDS[0]);
    expect(swan.facts.find((fact) => fact.id === 'stageBoundary')?.text).toContain(
      'head-lift-and-lower preparation',
    );
    expect(swan.facts.find((fact) => fact.id === 'contacts-2')).toMatchObject({
      kind: 'source-unknown',
    });
    expect(swan.unknown.join(' ')).toContain('head-hand relationship');
    expect(swan.source.population.clinicalUseInferred).toBe(false);
    expect(swan.source.attributionNoteKo).toContain('By SecoSan');
  });

  it('retains reference-only rights and separates one reused URL from one newly audited URL', () => {
    const [swan, plank] = IDS.map((id) => getMotionCandidateResearch(id)[0]);
    expect(swan.source.lineage.urlStatus).toBe('reused-url');
    expect(plank.source.lineage.urlStatus).toBe('new-url-in-audited-inventory');
    for (const candidate of [swan, plank]) {
      expect(candidate.source.rights).toMatchObject({
        mode: 'reference-only',
        embedded: false,
        reuseLicenseEstablished: false,
        sourceMediaObserved: false,
        mediaTimestamps: [],
      });
      expect(candidate.source.lineage.independentCorroborationEstablished).toBe(false);
    }
  });

  it('does not expose development paths, raw inventory or historical workflow metadata to product callers', () => {
    const serialized = JSON.stringify(IDS.flatMap((id) => getMotionCandidateResearch(id)));
    expect(serialized).not.toMatch(
      /\/workspace\/|src\/data\/|inventoryScope|priorSourcesReadOrSearched|relatedPriorLedger|newFilesOnlyUnder|baseHeadPrefixProvidedByParent/,
    );
  });

  it('returns stable deeply frozen facts so callers cannot change another caller’s research or policy state', () => {
    const result = getMotionCandidateResearch(IDS[0]);
    const [candidate] = result;
    for (const object of [
      result,
      candidate,
      candidate.facts,
      candidate.facts[0],
      candidate.unknown,
      candidate.authoringChoicesRequired,
      candidate.source,
      candidate.source.population,
      candidate.source.rights,
      candidate.source.rights.mediaTimestamps,
      candidate.source.lineage,
    ])
      expect(Object.isFrozen(object)).toBe(true);
    expect(() => {
      (candidate as unknown as { modelAuthored: boolean }).modelAuthored = true;
    }).toThrow(TypeError);
    expect(getMotionCandidateResearch(IDS[0])).toBe(result);
    expect(getMotionCandidateResearch(IDS[0])[0].modelAuthored).toBe(false);
    expect(Object.isFrozen(getMotionCandidateResearch('missing'))).toBe(true);
  });
});
