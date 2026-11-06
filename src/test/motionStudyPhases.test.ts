import { describe, expect, it } from 'vitest';
import { MOTION_DRAFTS } from '../data/motionDrafts';
import { BATCH_VARIANTS } from '../data/motionAuthoringBatch';
import { SUPINE_REACH_DEFINITION } from '../data/supineReach';
import { getHeelRaisePose } from '../models/heelRaise';
import { getClamPose } from '../models/clam';
import { getSupineDraftPose } from '../models/supineDrafts';
import { getLateralDraftPose } from '../models/lateralDrafts';
import { getQuadrupedDraftPose } from '../models/quadrupedDrafts';
import { getApparatusDraftPose } from '../models/apparatusDrafts';
import { getTensionDraftPose } from '../models/tensionDrafts';
import { getStandingSupportDraftPose } from '../models/standingSupportDrafts';
import { getSeatedBandRowPose } from '../models/seatedBandRow';
import { getChestLiftPose } from '../models/chestLift';
import { getPelvicCurlPose } from '../models/pelvicCurl';
import { getBatchPose } from '../models/motionAuthoringBatch';
import { getSupineReachPose } from '../models/supineReach';
import {
  MOTION_STUDY_ENTRIES,
  getMotionStudyEntry,
  getMotionStudyPhase,
  getMotionStudyStage,
} from '../utils/motionStudyStages';

type PoseOptions = { activeSide: 'left' | 'right'; mirrored: boolean };
type PoseGetter = (progress: number, options: PoseOptions) => unknown;

// Source models belong in this audit test, never in the lightweight domain resolver.
const poses: Readonly<Record<string, PoseGetter>> = {
  'supported-heel-raise': getHeelRaisePose,
  'side-lying-clam': getClamPose,
  'adult-supine-heel-slide': (p, o) => getSupineDraftPose('adult-supine-heel-slide', p, o),
  'supine-knee-fold': (p, o) => getSupineDraftPose('supine-knee-fold', p, o),
  'side-lying-straight-leg-lift': (p, o) => getLateralDraftPose('side-lying-straight-leg-lift', p, o),
  'side-lying-open-book': (p, o) => getLateralDraftPose('side-lying-open-book', p, o),
  'quadruped-arm-slide': (p, o) => getQuadrupedDraftPose('quadruped-arm-slide', p, o),
  'quadruped-leg-slide': (p, o) => getQuadrupedDraftPose('quadruped-leg-slide', p, o),
  'reformer-parallel-footwork': (p, o) => getApparatusDraftPose('reformer-parallel-footwork', p, o),
  'chair-seated-pedal-press': (p, o) => getApparatusDraftPose('chair-seated-pedal-press', p, o),
  'reformer-supine-strap-arm-press': (p, o) => getTensionDraftPose('reformer-supine-strap-arm-press', p, o),
  'cadillac-supine-arm-spring-press': (p, o) => getTensionDraftPose('cadillac-supine-arm-spring-press', p, o),
  'ladder-supported-hip-extension-slide': (p, o) => getStandingSupportDraftPose('ladder-supported-hip-extension-slide', p, o),
  'ladder-supported-side-leg-slide': (p, o) => getStandingSupportDraftPose('ladder-supported-side-leg-slide', p, o),
  'floor-seated-band-row': getSeatedBandRowPose,
  'supine-chest-lift': getChestLiftPose,
  'articulated-pelvic-curl': getPelvicCurlPose,
  'chair-seated-bilateral-arm-raise-v1': (p, o) => getBatchPose('chair-seated-bilateral-arm-raise-v1', p, o),
  'chair-seated-overhead-sidebend-v1': (p, o) => getBatchPose('chair-seated-overhead-sidebend-v1', p, o),
  'prone-single-straight-leg-extension-v1': (p, o) => getBatchPose('prone-single-straight-leg-extension-v1', p, o),
  'prone-forearm-chest-extension-v1': (p, o) => getBatchPose('prone-forearm-chest-extension-v1', p, o),
  'supine-single-leg-reach-v1': getSupineReachPose,
};

const sources = [
  ...MOTION_DRAFTS.map((source) => ({ family: 'existing-proposal' as const, source })),
  ...BATCH_VARIANTS.map((source) => ({ family: 'authoring-batch' as const, source })),
  { family: 'supine-reach' as const, source: SUPINE_REACH_DEFINITION },
];
const phaseIds = ['setup', 'move', 'turn', 'return', 'finish'];

/** Compare all authored geometry, screen projections and contacts without clock/phase labels. */
function withoutTimeline(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutTimeline);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !['progress', 'phase', 'phaseId', 'phaseLabelKo'].includes(key))
      .map(([key, child]) => [key, withoutTimeline(child)]));
  }
  return value;
}

function allNumbersFinite(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allNumbersFinite);
  return value === null || typeof value !== 'object'
    || Object.values(value).every(allNumbersFinite);
}

describe('authored study phase metadata, without exercise validation', () => {
  it('covers the preserved 17 proposals, four batch variants and one isolated supine reach', () => {
    expect(MOTION_STUDY_ENTRIES).toHaveLength(22);
    expect(MOTION_STUDY_ENTRIES.filter((entry) => entry.family === 'existing-proposal')).toHaveLength(17);
    expect(MOTION_STUDY_ENTRIES.filter((entry) => entry.family === 'authoring-batch')).toHaveLength(4);
    expect(MOTION_STUDY_ENTRIES.filter((entry) => entry.family === 'supine-reach')).toHaveLength(1);
    expect(new Set(MOTION_STUDY_ENTRIES.map((entry) => `${entry.family}:${entry.variantId}`)).size).toBe(22);
    expect(MOTION_STUDY_ENTRIES.map((entry) => entry.variantId).sort()).toEqual(Object.keys(poses).sort());
    expect(getMotionStudyEntry('existing-proposal', 'unknown')).toBeNull();
    expect(getMotionStudyEntry('unknown', sources[0].source.id)).toBeNull();
    expect(getMotionStudyEntry('authoring-batch', sources[0].source.id)).toBeNull();
  });

  it.each(sources)('preserves $source.id source intervals and local stage grouping', ({ family, source }) => {
    const entry = getMotionStudyEntry(family, source.id)!;
    expect(entry).not.toBeNull();
    expect(entry.intendedExerciseIds).toEqual([source.intendedExerciseId]);
    expect(entry.phases).toEqual(source.phases.map((phase) => ({
      id: phase.id,
      label: phase.label,
      start: phase.start,
      end: phase.end,
      sample: phase.sample,
      displayBehavior: phase.displayBehavior ?? 'unknown',
    })));
    expect(entry.phases.map((phase) => phase.id)).toEqual(phaseIds);
    expect(entry.phases[0].start).toBe(0);
    expect(entry.phases.at(-1)!.end).toBe(1);
    for (const [index, phase] of entry.phases.entries()) {
      expect([phase.start, phase.end, phase.sample].every(Number.isFinite)).toBe(true);
      expect(phase.start).toBeLessThan(phase.end);
      expect(phase.sample).toBeGreaterThanOrEqual(phase.start);
      expect(phase.sample).toBeLessThanOrEqual(phase.end);
      if (index > 0) expect(phase.start).toBe(entry.phases[index - 1].end);
      expect(getMotionStudyPhase(entry, phase.start)?.id).toBe(phase.id);
      expect(getMotionStudyPhase(entry, phase.end - 1e-8)?.id).toBe(phase.id);
    }
    expect(entry.stages.map((stage) => stage.id)).toEqual(['setup', 'main', 'finish']);
    expect(entry.stages.map((stage) => stage.phaseIds)).toEqual([
      ['setup'], ['move', 'turn', 'return'], ['finish'],
    ]);
    expect(entry.stages.map((stage) => [stage.start, stage.end])).toEqual([
      [0, entry.phases[0].end],
      [entry.phases[1].start, entry.phases[3].end],
      [entry.phases[4].start, 1],
    ]);
    for (const stage of entry.stages) {
      expect(getMotionStudyStage(entry, stage.start)?.id).toBe(stage.id);
      expect(getMotionStudyStage(entry, stage.end - 1e-8)?.id).toBe(stage.id);
    }
    for (const phase of entry.phases) {
      const expected = phase.id === 'setup' || phase.id === 'finish' ? phase.id : 'main';
      expect(getMotionStudyStage(entry, (phase.start + phase.end) / 2)?.id).toBe(expected);
    }
    expect(getMotionStudyPhase(entry, 1)?.id).toBe('finish');
    expect(getMotionStudyStage(entry, 1)?.id).toBe('finish');
    expect(getMotionStudyPhase(entry, -1)?.id).toBe('setup');
    expect(getMotionStudyStage(entry, 2)?.id).toBe('finish');
    for (const invalid of [NaN, Infinity, -Infinity]) {
      expect(getMotionStudyPhase(entry, invalid)).toBeNull();
      expect(getMotionStudyStage(entry, invalid)).toBeNull();
    }
  });

  it.each(MOTION_STUDY_ENTRIES)('audits $variantId authored hold interiors and finite boundary poses', (entry) => {
    const pose = poses[entry.variantId];
    for (const activeSide of ['left', 'right'] as const) {
      for (const mirrored of [false, true]) {
        const options = { activeSide, mirrored };
        for (const phase of entry.phases) {
          expect(allNumbersFinite(pose(phase.start, options))).toBe(true);
          expect(allNumbersFinite(pose(phase.end, options))).toBe(true);
          if (['setup', 'turn', 'finish'].includes(phase.id)) {
            const early = phase.start + (phase.end - phase.start) * 0.15;
            const late = phase.start + (phase.end - phase.start) * 0.85;
            // This source audit does not turn absent displayBehavior metadata into a hold prescription.
            expect(withoutTimeline(pose(early, options))).toEqual(withoutTimeline(pose(late, options)));
          }
        }
        expect(withoutTimeline(pose(0, options))).toEqual(withoutTimeline(pose(1, options)));
      }
    }
  });

  it('keeps established-pose qualifications visible in the source geometry audit', () => {
    for (const progress of [0, 1]) {
      const sidebend = getBatchPose('chair-seated-overhead-sidebend-v1', progress, { activeSide: 'right' });
      expect(sidebend.limbs.left.hand[2]).toBeGreaterThan(sidebend.limbs.left.shoulder[2]);
      expect(sidebend.contacts.some((contact) => contact.id.includes('hand'))).toBe(false);
      const prone = getBatchPose('prone-forearm-chest-extension-v1', progress);
      expect(prone.limbs.left.shoulder[2]).toBeGreaterThan(0);
      expect(prone.head.nose[2]).toBeGreaterThan(0);
      expect(getPelvicCurlPose(progress).contacts.find((contact) => contact.id === 'spine-2-mat')?.state).toBe('released');
      const reach = getSupineReachPose(progress, { activeSide: 'left' });
      expect(reach.body.head.center[2]).toBeGreaterThan(0);
      expect(reach.contacts.filter((contact) => contact.surface === 'mat').map((contact) => contact.bodyPart).sort())
        .toEqual(['lower-trunk', 'pelvis']);
      expect(reach.contacts.filter((contact) => contact.bodyPart === 'hand').every((contact) => contact.targetSide === 'right'))
        .toBe(true);
      expect(reach.contacts.filter((contact) => contact.bodyPart === 'foot').every((contact) => contact.state === 'not-supported'))
        .toBe(true);
    }
  });
});
