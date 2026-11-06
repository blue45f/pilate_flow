import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MOTION_PATTERN_REFERENCES,
  type MotionPatternReference,
} from '../data/motionPatternReferences';
import { getBatchPose } from '../models/motionAuthoringBatch';
import { getPelvicCurlPose } from '../models/pelvicCurl';
import { getMotionPatternPhaseContext } from '../utils/motionPatternPhaseContext';
import * as studyStages from '../utils/motionStudyStages';

const annotatedIds = [
  'chair-seated-overhead-sidebend-v1',
  'prone-forearm-chest-extension-v1',
  'articulated-pelvic-curl',
  'supine-single-leg-reach-v1',
] as const;

function referenceFor(variantId: string): Readonly<MotionPatternReference> {
  const reference = MOTION_PATTERN_REFERENCES.find((item) => item.variantId === variantId);
  if (!reference) throw new Error(`Missing related-pattern fixture: ${variantId}`);
  return reference;
}

function phaseLabel(phase: { label: string; labelKo?: string }): string {
  return phase.labelKo ?? phase.label;
}

afterEach(() => vi.restoreAllMocks());

describe('source-bound authored phase context', () => {
  it.each(MOTION_PATTERN_REFERENCES)(
    'keeps $variantId phase labels, declared behavior and half-open boundaries',
    (reference) => {
      const entry = studyStages.getMotionStudyEntry(reference.family, reference.variantId)!;
      expect(entry).not.toBeNull();
      for (const [index, phase] of reference.definition.phases.entries()) {
        for (const progress of [phase.start, phase.sample, phase.end - 1e-8]) {
          expect(getMotionPatternPhaseContext(reference, progress)).toMatchObject({
            phaseId: phase.id,
            phaseLabel: phaseLabel(phase),
            displayBehavior: phase.displayBehavior ?? 'unknown',
            basis: 'authored-model',
            sourceFingerprint: entry.sourceFingerprint,
          });
        }
        const next = reference.definition.phases[index + 1];
        expect(getMotionPatternPhaseContext(reference, phase.end)?.phaseId).toBe(
          next?.id ?? 'finish',
        );
      }
      expect(getMotionPatternPhaseContext(reference, 0)?.phaseId).toBe('setup');
      expect(getMotionPatternPhaseContext(reference, 1)?.phaseId).toBe('finish');
      expect(getMotionPatternPhaseContext(reference, -3)).toEqual(
        getMotionPatternPhaseContext(reference, 0),
      );
      expect(getMotionPatternPhaseContext(reference, 4)).toEqual(
        getMotionPatternPhaseContext(reference, 1),
      );
      for (const progress of [NaN, Infinity, -Infinity]) {
        expect(getMotionPatternPhaseContext(reference, progress)).toBeNull();
      }
    },
  );

  it('rejects unknown or inconsistent identity instead of borrowing another context', () => {
    const reference = referenceFor('chair-seated-overhead-sidebend-v1');
    const invalid = [
      { ...reference, family: 'unknown-family' },
      { ...reference, variantId: 'unknown-variant' },
      { ...reference, family: 'existing-proposal' },
      { ...reference, definition: { ...reference.definition, id: 'unknown-definition' } },
    ];
    for (const value of invalid) {
      expect(
        getMotionPatternPhaseContext(value as unknown as MotionPatternReference, 0),
      ).toBeNull();
    }
  });

  it('authors phase details for four variants and leaves eighteen explicitly unwritten', () => {
    expect(MOTION_PATTERN_REFERENCES).toHaveLength(22);
    const available: string[] = [];
    const unwritten: string[] = [];
    for (const reference of MOTION_PATTERN_REFERENCES) {
      for (const phase of reference.definition.phases) {
        const context = getMotionPatternPhaseContext(reference, phase.sample)!;
        expect(context.cycleSupportSummary).toBe(
          reference.definition.supportSummary ?? reference.definition.supportNote,
        );
        expect(context.sourceContext).toBe(reference.context);
        if (annotatedIds.some((id) => id === reference.variantId)) {
          expect(context.detailStatus).toBe('available');
          expect(context.poseSummaryKo).toEqual(expect.any(String));
          expect(context.contactChangeKo).toEqual(expect.any(String));
          expect(context.poseSummaryKo?.trim()).not.toBe('');
          expect(context.contactChangeKo?.trim()).not.toBe('');
          expect(context.qualifications.every((item) => typeof item === 'string')).toBe(true);
        } else {
          expect(context.detailStatus).toBe('not_authored');
          expect(context.poseSummaryKo).toBeUndefined();
          expect(context.contactChangeKo).toBeUndefined();
          expect(context.qualifications).toEqual([]);
        }
      }
      const context = getMotionPatternPhaseContext(reference, 0)!;
      (context.detailStatus === 'available' ? available : unwritten).push(reference.variantId);
    }
    expect(available.sort()).toEqual([...annotatedIds].sort());
    expect(unwritten).toHaveLength(18);

    // Stationary geometry does not fill in a missing declaration from the source model.
    const undeclared = MOTION_PATTERN_REFERENCES.filter((reference) =>
      reference.definition.phases.every((phase) => phase.displayBehavior === undefined),
    );
    expect(undeclared).toHaveLength(14);
    for (const reference of undeclared) {
      for (const phase of reference.definition.phases) {
        expect(getMotionPatternPhaseContext(reference, phase.sample)?.displayBehavior).toBe('unknown');
      }
    }
  });

  it.each([0, 1])(
    'describes the actual raised-arm, raised-chest and resting-curve poses at progress %s',
    (progress) => {
      const chair = referenceFor('chair-seated-overhead-sidebend-v1');
      const chairContext = getMotionPatternPhaseContext(chair, progress)!;
      expect(chairContext.poseSummaryKo).toContain('반대쪽 팔');
      expect(chairContext.poseSummaryKo).toContain('위');
      for (const activeSide of ['left', 'right'] as const) {
        const opposite = activeSide === 'left' ? 'right' : 'left';
        const pose = getBatchPose('chair-seated-overhead-sidebend-v1', progress, { activeSide });
        expect(pose.limbs[opposite].hand[2]).toBeGreaterThan(pose.limbs[opposite].shoulder[2]);
        expect(pose.contacts.some((contact) => contact.id.includes('hand'))).toBe(false);
      }

      const prone = referenceFor('prone-forearm-chest-extension-v1');
      const proneContext = getMotionPatternPhaseContext(prone, progress)!;
      expect(proneContext.poseSummaryKo).toContain('머리');
      expect(proneContext.poseSummaryKo).toContain('가슴');
      expect(proneContext.poseSummaryKo).toContain('들린');
      const pronePose = getBatchPose('prone-forearm-chest-extension-v1', progress);
      expect(pronePose.limbs.left.shoulder[2]).toBeGreaterThan(0);
      expect(pronePose.head.nose[2]).toBeGreaterThan(0);
      expect(pronePose.contacts.some((contact) => /head|forehead/.test(contact.id))).toBe(false);

      const pelvic = referenceFor('articulated-pelvic-curl');
      const pelvicContext = getMotionPatternPhaseContext(pelvic, progress)!;
      expect(pelvicContext.poseSummaryKo).toContain('허리 곡선');
      expect([
        pelvicContext.poseSummaryKo,
        pelvicContext.contactChangeKo,
        ...pelvicContext.qualifications,
      ].join(' ')).toContain('모든 척추');
      expect(
        getPelvicCurlPose(progress).contacts.find((contact) => contact.id === 'spine-2-mat')?.state,
      ).toBe('released');
    },
  );

  it.each(annotatedIds)('suppresses old %s details when the live ledger fingerprint changes', (variantId) => {
    const reference = referenceFor(variantId);
    const originalLookup = studyStages.getMotionStudyEntry;
    const originalEntry = originalLookup(reference.family, reference.variantId)!;
    const changedFingerprint = originalEntry.sourceFingerprint === 'f'.repeat(64)
      ? 'e'.repeat(64)
      : 'f'.repeat(64);
    expect(getMotionPatternPhaseContext(reference, 0)?.detailStatus).toBe('available');
    vi.spyOn(studyStages, 'getMotionStudyEntry').mockImplementation((family, id) => {
      const entry = originalLookup(family, id);
      return family === reference.family && id === reference.variantId && entry
        ? { ...entry, sourceFingerprint: changedFingerprint }
        : entry;
    });
    for (const phase of reference.definition.phases) {
      const context = getMotionPatternPhaseContext(reference, phase.sample)!;
      expect(context.detailStatus).toBe('stale');
      expect(context.phaseId).toBe(phase.id);
      expect(context.phaseLabel).toBe(phaseLabel(phase));
      expect(context.displayBehavior).toBe(phase.displayBehavior ?? 'unknown');
      expect(context.poseSummaryKo).toBeUndefined();
      expect(context.contactChangeKo).toBeUndefined();
      expect(context.qualifications).toEqual([]);
    }
  });

  it('does not mutate any of the twenty-one definitions, identities or review boundaries', () => {
    const before = JSON.stringify({
      references: MOTION_PATTERN_REFERENCES,
      ledger: studyStages.MOTION_STUDY_ENTRIES,
    });
    for (const reference of MOTION_PATTERN_REFERENCES) {
      for (const phase of reference.definition.phases) {
        getMotionPatternPhaseContext(reference, phase.sample);
      }
      expect(reference).toMatchObject({
        relation: 'pattern-reference',
        exactCanonicalMatch: false,
        professionalReviewStatus: 'unreviewed',
        professionalReviewCount: 0,
        assetStatus: 'authored-unreviewed-draft',
        autoRecommendationEligible: false,
      });
      expect(reference.definition).toMatchObject({
        status: 'variant-proposal',
        professionalReviewCount: 0,
        exactAssetReady: false,
        autoRecommendationEligible: false,
      });
    }
    expect(JSON.stringify({
      references: MOTION_PATTERN_REFERENCES,
      ledger: studyStages.MOTION_STUDY_ENTRIES,
    })).toBe(before);
  });
});
