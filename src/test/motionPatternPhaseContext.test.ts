import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MOTION_PATTERN_REFERENCES,
  type MotionPatternReference,
} from '../data/motionPatternReferences';
import { getBatchPose } from '../models/motionAuthoringBatch';
import { getChestLiftPose } from '../models/chestLift';
import { getHeelRaisePose } from '../models/heelRaise';
import { getLateralDraftPose } from '../models/lateralDrafts';
import { getPelvicCurlPose } from '../models/pelvicCurl';
import { getSeatedBandRowPose } from '../models/seatedBandRow';
import { getSupineDraftPose } from '../models/supineDrafts';
import { getMotionPatternPhaseContext } from '../utils/motionPatternPhaseContext';
import * as studyStages from '../utils/motionStudyStages';

const annotatedIds = [
  'supported-heel-raise',
  'side-lying-clam',
  'adult-supine-heel-slide',
  'supine-knee-fold',
  'side-lying-straight-leg-lift',
  'side-lying-open-book',
  'quadruped-arm-slide',
  'reformer-parallel-footwork',
  'chair-seated-pedal-press',
  'reformer-supine-strap-arm-press',
  'cadillac-supine-arm-spring-press',
  'ladder-supported-hip-extension-slide',
  'ladder-supported-side-leg-slide',
  'chair-seated-bilateral-arm-raise-v1',
  'chair-seated-overhead-sidebend-v1',
  'prone-single-straight-leg-extension-v1',
  'prone-forearm-chest-extension-v1',
  'articulated-pelvic-curl',
  'supine-chest-lift',
  'floor-seated-band-row',
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

  it('authors phase details for twenty-one variants and leaves one explicitly unwritten', () => {
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
    expect(unwritten).toEqual(['quadruped-leg-slide']);

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

      const bilateralChair = referenceFor('chair-seated-bilateral-arm-raise-v1');
      const bilateralChairContext = getMotionPatternPhaseContext(bilateralChair, progress)!;
      expect(bilateralChairContext.poseSummaryKo).toContain('양팔');
      const bilateralChairPose = getBatchPose('chair-seated-bilateral-arm-raise-v1', progress);
      expect(bilateralChairPose.limbs.left.hand[2]).toBeLessThan(
        bilateralChairPose.limbs.left.shoulder[2],
      );
      expect(bilateralChairPose.contacts.some((contact) => contact.id.includes('hand'))).toBe(false);

      const proneLeg = referenceFor('prone-single-straight-leg-extension-v1');
      const proneLegContext = getMotionPatternPhaseContext(proneLeg, progress)!;
      expect(proneLegContext.contactChangeKo).toContain('앞발');
      expect(
        getBatchPose('prone-single-straight-leg-extension-v1', progress, { activeSide: 'right' })
          .contacts.find((contact) => contact.id === 'right-forefoot')?.state,
      ).toBe('fixed');
      expect(
        getBatchPose('prone-single-straight-leg-extension-v1', 0.5, { activeSide: 'right' })
          .contacts.find((contact) => contact.id === 'right-forefoot')?.state,
      ).toBe('released');

      const chestLift = referenceFor('supine-chest-lift');
      const chestLiftContext = getMotionPatternPhaseContext(chestLift, progress)!;
      expect(chestLiftContext.poseSummaryKo).toContain('뒤통수');
      expect(chestLiftContext.contactChangeKo).toContain('견갑 하각');
      expect(
        getChestLiftPose(progress).contacts.filter(
          (contact) => contact.sourceNamedSupport === 'scapula-mat',
        ).every((contact) => contact.state === 'grounded'),
      ).toBe(true);
      expect(
        getChestLiftPose(0.5).contacts.filter(
          (contact) => contact.sourceNamedSupport === 'scapula-mat',
        ).every((contact) => contact.state === 'released'),
      ).toBe(true);

      const bandRow = referenceFor('floor-seated-band-row');
      const bandRowContext = getMotionPatternPhaseContext(bandRow, progress)!;
      expect(bandRowContext.poseSummaryKo).toContain('바닥');
      expect(bandRowContext.contactChangeKo).toContain('밴드');
      expect(getSeatedBandRowPose(progress).band.force).toBe('not-modeled');

      const heelRaise = referenceFor('supported-heel-raise');
      const heelRaiseContext = getMotionPatternPhaseContext(heelRaise, progress)!;
      expect(heelRaiseContext.contactChangeKo).toContain('뒤꿈치');
      expect(
        getHeelRaisePose(progress).contacts.find((contact) => contact.id === 'left-heel')?.state,
      ).toBe('grounded');
      expect(
        getHeelRaisePose(0.51).contacts.find((contact) => contact.id === 'left-heel')?.state,
      ).toBe('released');

      const kneeFold = referenceFor('supine-knee-fold');
      const kneeFoldContext = getMotionPatternPhaseContext(kneeFold, progress)!;
      expect(kneeFoldContext.contactChangeKo).toContain('뒤꿈치·발끝');
      expect(
        getSupineDraftPose('supine-knee-fold', progress, { activeSide: 'right' }).contacts.find(
          (contact) => contact.id === 'right-heel',
        )?.state,
      ).toBe('fixed');
      expect(
        getSupineDraftPose('supine-knee-fold', 0.51, { activeSide: 'right' }).contacts.find(
          (contact) => contact.id === 'right-heel',
        )?.state,
      ).toBe('lifted');

      const sideLegLift = referenceFor('side-lying-straight-leg-lift');
      const sideLegLiftContext = getMotionPatternPhaseContext(sideLegLift, progress)!;
      expect(sideLegLiftContext.poseSummaryKo).toContain('머리 받침');
      expect(
        getLateralDraftPose('side-lying-straight-leg-lift', progress).supports.find(
          (support) => support.id === 'head-pad',
        )?.sourceRequirement,
      ).toBe('authoring-choice');
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
