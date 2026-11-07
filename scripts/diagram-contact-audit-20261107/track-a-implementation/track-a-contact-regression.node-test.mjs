import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateContactAccuracySuite,
  renderAndExtractPhaseGeometry,
} from '../shared/contact-geometry-analyzer.mjs';
import {
  renderVNodeToMarkup,
  queryVNodes,
} from '../shared/ts-loader-hooks.mjs';
import {
  loadCandidateContactFixSuite,
} from './candidate-minimal-contact-fixes.mjs';

describe('Track A — Real App Minimal Contact Fixes & Full Diagram Regression Suite (D-01..D-05 + R-01 Exclusion)', async () => {
  const suite = await loadCandidateContactFixSuite();
  const coverageRecords = suite.realAppAssets.map((a) =>
    suite.coverageMod.toExerciseEvidenceMotionOverlay(a.exerciseId),
  );
  const corrections = suite.correctionsMod.MOVEMENT_DIAGRAM_CORRECTIONS;

  const realAppReport = evaluateContactAccuracySuite({
    assets: suite.realAppAssets,
    AssetComponent: suite.RealAppMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  it('0. verifies tests run directly against the real app exports (MovementPhaseDiagramSvg & MOVEMENT_VISUAL_ASSETS) without candidate wrappers', () => {
    assert.equal(
      Object.is(suite.realAppAssets, suite.catalogMod.MOVEMENT_VISUAL_ASSETS),
      true,
      'Must evaluate the real app MOVEMENT_VISUAL_ASSETS directly',
    );
    assert.equal(
      Object.is(
        suite.RealAppMovementPhaseDiagramSvg,
        suite.svgMod.MovementPhaseDiagramSvg,
      ),
      true,
      'Must evaluate the real app MovementPhaseDiagramSvg directly',
    );
    assert.equal(
      Object.is(
        suite.RealAppMovementTriptychDiagramSvg,
        suite.svgMod.MovementTriptychDiagramSvg,
      ),
      true,
      'Must evaluate the real app MovementTriptychDiagramSvg directly',
    );
  });

  it('R-01: excludes already-resolved Mat Clam & Open Book separation and preserves exact side-lying invariants', () => {
    assert.equal(realAppReport.r01ExcludedBaseline.status, 'ALREADY_RESOLVED_ON_MAIN');
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.clamHandLeakPx, 0);
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.clamThoracicLeakPx, 0);
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.openBookKneeLeakPx, 0);
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.clamZeroLenShoulderLine, false);
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.openBookShoulderBridgeRendered, true);

    const clam = suite.catalogMod.getMovementVisualAsset('original-mat-clam');
    const book = suite.catalogMod.getMovementVisualAsset('original-mat-open-book');
    assert.deepEqual(
      suite.catalogMod.calculatePhaseJointDelta(clam).movedJoints.map((i) => i.joint),
      ['knee'],
    );
    assert.deepEqual(clam.phases.end.joints, clam.phases.start.joints);
    assert.deepEqual(book.phases.end.joints, book.phases.start.joints);
  });

  it('D-01: fixes Reformer Strap Frog (original-reformer-strap-frog) end phase to return to flexed-knee Frog home position while preserving end pose-delta-vector', () => {
    const d01 = realAppReport.defects.D01;
    assert.equal(d01.passed, true);
    assert.equal(d01.archetypeId, 'reformer-strap-frog-isolated');
    assert.equal(d01.metrics.endAnkleDeltaYFromStartPx, 0);
    assert.ok(d01.metrics.startToEndAnkleDistPx <= 6);
    assert.ok(d01.metrics.startToEndKneeDistPx <= 6);
    assert.deepEqual(d01.metrics.endKnee, { x: 185, y: 90 });
    assert.deepEqual(d01.metrics.endAnkle, { x: 217, y: 74 });
    assert.deepEqual(d01.metrics.carriageOffsets, [6, 36, 6]);

    const frogAsset = suite.catalogMod.getMovementVisualAsset('original-reformer-strap-frog');
    const frogEndRender = renderAndExtractPhaseGeometry(
      suite.RealAppMovementPhaseDiagramSvg,
      frogAsset,
      'end',
      false,
    );
    const frogEndVectors = queryVNodes(
      frogEndRender.vnode,
      (n) => Boolean(n.props?.['data-pose-delta-vector']),
    );
    assert.ok(frogEndVectors.length >= 2, 'Frog end phase must render pose-delta-vector nodes');

    const legCircles = suite.catalogMod.getMovementVisualAsset('ex-straps-01');
    assert.equal(legCircles.archetypeId, 'supine-feet-in-straps');
    assert.deepEqual(legCircles.phases.end.joints.ankle, { x: 222, y: 40 });
  });

  it('D-02A & D-02B: fixes Reformer Plank (ex-plank-01) hand-footbar & foot-carriage contacts and Chair Plank seat/pedal contacts', () => {
    const d02 = realAppReport.defects.D02;
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
    const d03 = realAppReport.defects.D03;
    assert.equal(d03.passed, true);
    assert.equal(d03.totalCadillacExercises, 18);
    assert.equal(d03.nonZeroCadillacCount, 0);
    assert.deepEqual(d03.nonZeroCadillacExerciseIds, []);
  });

  it('D-04: aligns Wunda Chair pedal angular rotation with downward foot press (eliminating 50px gap)', () => {
    const d04 = realAppReport.defects.D04;
    assert.equal(d04.passed, true);
    for (const c of d04.checks) {
      assert.equal(c.sameDirection, true);
      assert.equal(c.footDeltaYPx, 32);
      assert.ok(c.pedalTipDeltaYPx > 25, `Expected pedalTipDeltaY > 25, got ${c.pedalTipDeltaYPx}`);
      assert.ok(
        c.middleAnkleToPedalTipDistPx <= 6,
        `Expected middle ankle-to-pedalTip <= 6px, got ${c.middleAnkleToPedalTipDistPx}`,
      );
      assert.ok(
        c.middleAnkleToPedalTipVerticalGapPx <= 4,
        `Expected middle vertical gap <= 4px, got ${c.middleAnkleToPedalTipVerticalGapPx}`,
      );
    }
  });

  it('D-05: eliminates standing Barrel lower-limb dome/ladder penetration and anchors hands on ladder rung', () => {
    const d05 = realAppReport.defects.D05;
    assert.equal(d05.passed, true);
    assert.equal(d05.nonStandingBarrelPreserved, true);
    for (const c of d05.checks) {
      assert.equal(c.passed, true, `Standing barrel ${c.exerciseId} failed check`);
      assert.equal(c.penetratingDomeJointCount, 0, `${c.exerciseId} still penetrates dome`);
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

  it('G-01 & G-02: renders all 294 phase SVGs + 294 mirrored SVGs + 196 Triptychs cleanly and preserves non-verified truthfulness boundaries', () => {
    assert.equal(realAppReport.allFiveDefectsPassed, true);
    assert.equal(realAppReport.svgRenderIntegrity.passed, true);
    assert.equal(realAppReport.svgRenderIntegrity.renderedSvgCount, 294);
    assert.equal(realAppReport.svgRenderIntegrity.invalidSvgCount, 0);

    let mirroredSvgCount = 0;
    let triptychCount = 0;
    for (const asset of suite.realAppAssets) {
      const delta = suite.catalogMod.calculatePhaseJointDelta(asset);
      assert.ok(delta.maxDeltaPx > 0, `Expected maxDeltaPx > 0 for ${asset.exerciseId}`);
      assert.ok(delta.movedJoints.length > 0);
      assert.ok(delta.anchoredJoints.length > 0);

      for (const mirrored of [false, true]) {
        const tripVNode = suite.RealAppMovementTriptychDiagramSvg({
          asset,
          activeSide: mirrored ? 'right' : 'left',
          mirrored,
        });
        const tripMarkup = renderVNodeToMarkup(tripVNode);
        assert.ok(tripMarkup.includes('data-testid="movement-triptych-diagram"'));
        assert.equal((tripMarkup.match(/viewBox="0 0 320 200"/g) || []).length, 3);
        triptychCount += 1;
      }

      for (const phaseId of ['start', 'middle', 'end']) {
        const gNorm = renderAndExtractPhaseGeometry(
          suite.RealAppMovementPhaseDiagramSvg,
          asset,
          phaseId,
          false,
        );
        const gMir = renderAndExtractPhaseGeometry(
          suite.RealAppMovementPhaseDiagramSvg,
          asset,
          phaseId,
          true,
        );
        assert.equal(gMir.markup.includes('<text'), false);
        for (const [jKey, ptNorm] of Object.entries(gNorm.jointCircles)) {
          const ptMir = gMir.jointCircles[jKey];
          assert.ok(Math.abs(ptNorm.x + ptMir.x - 320) <= 0.01);
          assert.ok(Math.abs(ptNorm.y - ptMir.y) <= 0.01);
        }
        if (
          phaseId !== 'start' &&
          asset.exerciseId !== 'original-mat-clam' &&
          asset.exerciseId !== 'original-mat-open-book'
        ) {
          const vectors = queryVNodes(
            gNorm.vnode,
            (n) => Boolean(n.props?.['data-pose-delta-vector']),
          );
          assert.ok(
            vectors.length > 0,
            `Expected pose-delta-vector in ${asset.exerciseId} ${phaseId}`,
          );
        }
        mirroredSvgCount += 1;
      }
    }
    assert.equal(mirroredSvgCount, 294);
    assert.equal(triptychCount, 196);

    assert.equal(realAppReport.truthfulnessBoundary.passed, true);
    assert.equal(realAppReport.truthfulnessBoundary.coverageRecordCount, 98);
    assert.equal(realAppReport.truthfulnessBoundary.violationCount, 0);
    assert.equal(realAppReport.truthfulnessBoundary.anatomicalVerificationCompleted, false);
    assert.equal(realAppReport.truthfulnessBoundary.expertVerificationCompleted, false);
  });
});
