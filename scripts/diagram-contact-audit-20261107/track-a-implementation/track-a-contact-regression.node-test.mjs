import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateContactAccuracySuite,
  dist2D,
} from '../shared/contact-geometry-analyzer.mjs';
import {
  loadCandidateContactFixSuite,
} from './candidate-minimal-contact-fixes.mjs';

describe('Track A — Candidate Minimal Contact Fixes & Regression Suite (D-01..D-05 + R-01 Exclusion)', async () => {
  const suite = await loadCandidateContactFixSuite();
  const coverageRecords = suite.candidateAssets.map((a) =>
    suite.coverageMod.toExerciseEvidenceMotionOverlay(a.exerciseId),
  );
  const corrections = suite.correctionsMod.MOVEMENT_DIAGRAM_CORRECTIONS;

  const candidateReport = evaluateContactAccuracySuite({
    assets: suite.candidateAssets,
    AssetComponent: suite.CandidateMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  it('R-01: excludes already-resolved Mat Clam & Open Book separation and preserves exact reference identity', () => {
    assert.equal(candidateReport.r01ExcludedBaseline.status, 'ALREADY_RESOLVED_ON_MAIN');
    assert.equal(candidateReport.r01ExcludedBaseline.metrics.clamHandLeakPx, 0);
    assert.equal(candidateReport.r01ExcludedBaseline.metrics.clamThoracicLeakPx, 0);
    assert.equal(candidateReport.r01ExcludedBaseline.metrics.openBookKneeLeakPx, 0);
    assert.equal(candidateReport.r01ExcludedBaseline.metrics.clamZeroLenShoulderLine, false);
    assert.equal(candidateReport.r01ExcludedBaseline.metrics.openBookShoulderBridgeRendered, true);

    const baseClam = suite.baselineAssets.find((a) => a.exerciseId === 'original-mat-clam');
    const candClam = suite.candidateAssets.find((a) => a.exerciseId === 'original-mat-clam');
    const baseOpenBook = suite.baselineAssets.find((a) => a.exerciseId === 'original-mat-open-book');
    const candOpenBook = suite.candidateAssets.find((a) => a.exerciseId === 'original-mat-open-book');

    assert.equal(Object.is(baseClam, candClam), true, 'Clam asset must not be re-implemented');
    assert.equal(Object.is(baseOpenBook, candOpenBook), true, 'Open Book asset must not be re-implemented');
  });

  it('D-01: fixes Reformer Strap Frog (original-reformer-strap-frog) end phase to return to flexed-knee Frog start pose', () => {
    const d01 = candidateReport.defects.D01;
    assert.equal(d01.passed, true);
    assert.equal(d01.archetypeId, 'reformer-strap-frog-isolated');
    assert.equal(d01.metrics.startToEndAnkleDistPx, 0);
    assert.equal(d01.metrics.startToEndKneeDistPx, 0);
    assert.deepEqual(d01.metrics.endKnee, { x: 182, y: 92 });
    assert.deepEqual(d01.metrics.endAnkle, { x: 214, y: 74 });
    assert.deepEqual(d01.metrics.carriageOffsets, [6, 36, 6]);

    // Ensure Leg Circles (ex-straps-01) keeps its circular arc end phase untouched
    const legCircles = suite.candidateAssets.find((a) => a.exerciseId === 'ex-straps-01');
    assert.equal(legCircles.archetypeId, 'supine-feet-in-straps');
    assert.deepEqual(legCircles.phases.end.joints.ankle, { x: 222, y: 40 });
  });

  it('D-02: fixes Reformer Plank (ex-plank-01) hand-footbar & foot-carriage contacts and Chair Plank seat/pedal contacts', () => {
    const d02 = candidateReport.defects.D02;
    assert.equal(d02.passed, true);
    assert.equal(d02.reformerPlank.archetypeId, 'reformer-plank-long-stretch-isolated');
    assert.ok(
      d02.reformerPlank.handToFootbarDistPx <= 4,
      `Expected hand within 4px of footbarTop, got ${d02.reformerPlank.handToFootbarDistPx}`,
    );
    assert.equal(d02.reformerPlank.handOnFootbarSide, true);
    assert.equal(d02.reformerPlank.ankleOnCarriageStart, true);
    assert.equal(d02.reformerPlank.ankleOnCarriageMiddle, true);

    for (const cp of d02.chairPlanks) {
      assert.equal(cp.passed, true, `Chair plank ${cp.exerciseId} failed contact check`);
      assert.equal(cp.handSeatVerticalGapPx, 0);
      assert.equal(cp.handWithinSeatX, true);
      assert.ok(cp.startAnkleToPedalTipDistPx <= 8);
      assert.ok(cp.middleAnkleToPedalTipDistPx <= 8);
      assert.ok(cp.endAnkleToPedalTipDistPx <= 8);
    }
  });

  it('D-03: zeroes carriageOffsetPx across all 18 Cadillac stationary table exercises (54 phases)', () => {
    const d03 = candidateReport.defects.D03;
    assert.equal(d03.passed, true);
    assert.equal(d03.totalCadillacExercises, 18);
    assert.equal(d03.nonZeroCadillacCount, 0);
    assert.deepEqual(d03.nonZeroCadillacExerciseIds, []);
  });

  it('D-04: aligns Wunda Chair pedal angular rotation with downward foot press (eliminating 50px gap)', () => {
    const d04 = candidateReport.defects.D04;
    assert.equal(d04.passed, true);
    for (const c of d04.checks) {
      assert.equal(c.sameDirection, true);
      assert.equal(c.footDeltaYPx, 32);
      assert.ok(c.pedalTipDeltaYPx > 25, `Expected pedalTipDeltaY > 25, got ${c.pedalTipDeltaYPx}`);
      assert.ok(
        c.middleAnkleToPedalTipVerticalGapPx <= 3,
        `Expected ankle-pedal vertical gap <= 3px, got ${c.middleAnkleToPedalTipVerticalGapPx}`,
      );
      assert.ok(
        c.middleHeelToPedalTipVerticalGapPx <= 3,
        `Expected heel-pedal vertical gap <= 3px, got ${c.middleHeelToPedalTipVerticalGapPx}`,
      );
    }
  });

  it('D-05: eliminates Ladder Barrel standing dome/ladder penetration and anchors hands on ladder rungs', () => {
    const d05 = candidateReport.defects.D05;
    assert.equal(d05.passed, true);
    assert.equal(d05.standingBarrelCount, 7);
    assert.equal(d05.nonStandingBarrelPreserved, true);
    for (const c of d05.checks) {
      assert.equal(c.penetratingDomeJointCount, 0, `${c.exerciseId} still penetrates barrel dome`);
      assert.equal(c.ladderCrossingCount, 0, `${c.exerciseId} still crosses ladder frame`);
      if (
        c.exerciseId === 'original-barrel-standing-hip-extension' ||
        c.exerciseId === 'original-barrel-standing-side-reach'
      ) {
        assert.equal(c.handDistToLadderStartPx, 0);
        assert.equal(c.handDistToLadderMiddlePx, 0);
        assert.deepEqual(c.startHand, { x: 88, y: 76 });
      }
    }
  });

  it('G-01 & G-02: renders all 294 SVGs cleanly and preserves all non-verified truthfulness boundaries', () => {
    assert.equal(candidateReport.allFiveDefectsPassed, true);
    assert.equal(candidateReport.svgRenderIntegrity.passed, true);
    assert.equal(candidateReport.svgRenderIntegrity.renderedSvgCount, 294);
    assert.equal(candidateReport.svgRenderIntegrity.invalidSvgCount, 0);

    assert.equal(candidateReport.truthfulnessBoundary.passed, true);
    assert.equal(candidateReport.truthfulnessBoundary.coverageRecordCount, 98);
    assert.equal(candidateReport.truthfulnessBoundary.violationCount, 0);
    assert.equal(candidateReport.truthfulnessBoundary.anatomicalVerificationCompleted, false);
    assert.equal(candidateReport.truthfulnessBoundary.expertVerificationCompleted, false);
  });
});
