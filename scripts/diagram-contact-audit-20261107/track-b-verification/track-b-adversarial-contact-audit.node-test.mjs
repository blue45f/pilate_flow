import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  REPO_ROOT,
  evaluateContactAccuracySuite,
  renderAndExtractPhaseGeometry,
} from '../shared/contact-geometry-analyzer.mjs';
import {
  loadCandidateContactFixSuite,
} from '../track-a-implementation/candidate-minimal-contact-fixes.mjs';

describe('Track B — Independent Adversarial Contact Audit & Read-Only Scope Guard', async () => {
  const suite = await loadCandidateContactFixSuite();
  const coverageRecords = suite.baselineAssets.map((a) =>
    suite.coverageMod.toExerciseEvidenceMotionOverlay(a.exerciseId),
  );
  const corrections = suite.correctionsMod.MOVEMENT_DIAGRAM_CORRECTIONS;

  const baselineReport = evaluateContactAccuracySuite({
    assets: suite.baselineAssets,
    AssetComponent: suite.BaselineMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  const candidateReport = evaluateContactAccuracySuite({
    assets: suite.candidateAssets,
    AssetComponent: suite.CandidateMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  it('1. confirms R-01 (Mat Clam & Open Book cross-leakage + shoulder connection) is already resolved on main', () => {
    assert.equal(baselineReport.r01ExcludedBaseline.status, 'ALREADY_RESOLVED_ON_MAIN');
    assert.equal(baselineReport.r01ExcludedBaseline.metrics.clamArchetypeId, 'mat-clam-isolated');
    assert.equal(baselineReport.r01ExcludedBaseline.metrics.openBookArchetypeId, 'mat-open-book-isolated');
    assert.equal(baselineReport.r01ExcludedBaseline.metrics.clamHandLeakPx, 0);
    assert.equal(baselineReport.r01ExcludedBaseline.metrics.openBookKneeLeakPx, 0);
    const correctionValues = Object.values(corrections);
    assert.equal(correctionValues.length, 2);
    for (const c of correctionValues) {
      assert.equal(c.professionalReviewCount, 0);
      assert.equal(c.sourceFrameMappings, 0);
    }
  });

  it('2. reproduces all 5 unresolved pose-apparatus contact defects (D-01..D-05) on read-only main with exact coordinates', () => {
    assert.equal(baselineReport.allFiveDefectsPassed, false);

    // D-01 reproduction
    const bD01 = baselineReport.defects.D01;
    assert.equal(bD01.passed, false);
    assert.deepEqual(bD01.metrics.startAnkle, { x: 214, y: 74 });
    assert.deepEqual(bD01.metrics.endAnkle, { x: 222, y: 40 });
    assert.equal(bD01.metrics.endAnkleDeltaYFromStartPx, -34);

    // D-02 reproduction
    const bD02 = baselineReport.defects.D02;
    assert.equal(bD02.passed, false);
    assert.equal(bD02.reformerPlank.handOnFootbarSide, false);
    assert.ok(bD02.reformerPlank.handToFootbarDistPx > 170);
    for (const cp of bD02.chairPlanks) {
      assert.equal(cp.passed, false);
      assert.equal(cp.handSeatVerticalGapPx, 42);
      assert.ok(cp.startAnkleToPedalTipDistPx > 40);
    }

    // D-03 reproduction
    const bD03 = baselineReport.defects.D03;
    assert.equal(bD03.passed, false);
    assert.equal(bD03.totalCadillacExercises, 18);
    assert.equal(bD03.nonZeroCadillacCount, 15);

    // D-04 reproduction
    const bD04 = baselineReport.defects.D04;
    assert.equal(bD04.passed, false);
    for (const c of bD04.checks) {
      assert.equal(c.sameDirection, false);
      assert.equal(c.footDeltaYPx, 32);
      assert.equal(c.pedalTipDeltaYPx, -15);
      assert.equal(c.middleAnkleToPedalTipVerticalGapPx, 46);
      assert.equal(c.middleHeelToPedalTipVerticalGapPx, 50);
    }

    // D-05 reproduction
    const bD05 = baselineReport.defects.D05;
    assert.equal(bD05.passed, false);
    const hipExt = bD05.checks.find(
      (c) => c.exerciseId === 'original-barrel-standing-hip-extension',
    );
    assert.ok(hipExt.penetratingDomeJointCount >= 9);
    assert.ok(hipExt.ladderCrossingCount >= 2);
    assert.equal(hipExt.handDistToLadderStartPx, 132);
    assert.equal(hipExt.handDistToLadderMiddlePx, 146);
  });

  it('3. verifies candidate minimal fixes resolve D-01..D-05 in both standard and mirrored (unilateral) views', () => {
    assert.equal(candidateReport.allFiveDefectsPassed, true);

    // Check mirrored symmetry for unilateral / apparatus contact targets
    const targetIds = [
      'original-reformer-strap-frog',
      'ex-plank-01',
      'ex-plank-02',
      'original-cadillac-arm-spring-press',
      'original-chair-seated-pedal-press',
      'original-barrel-standing-hip-extension',
    ];
    for (const id of targetIds) {
      const asset = suite.candidateAssets.find((a) => a.exerciseId === id);
      const normal = renderAndExtractPhaseGeometry(
        suite.CandidateMovementPhaseDiagramSvg,
        asset,
        'middle',
        false,
      );
      const mirrored = renderAndExtractPhaseGeometry(
        suite.CandidateMovementPhaseDiagramSvg,
        asset,
        'middle',
        true,
      );
      assert.equal(
        normal.jointCircles.ankle.x + mirrored.jointCircles.ankle.x,
        320,
        `Mirrored ankle.x sum should be 320 for ${id}`,
      );
      assert.equal(
        normal.jointCircles.hand.x + mirrored.jointCircles.hand.x,
        320,
        `Mirrored hand.x sum should be 320 for ${id}`,
      );
    }
  });

  it('4. preserves existing motionEvidenceReview packs (Track A Mat Top 10 & Track B Apparatus Top 10)', () => {
    const matRecords = suite.trackAMod.TRACK_A_MAT_EVIDENCE_RECORDS;
    const appRecords = suite.trackBMod.TRACK_B_APPARATUS_EVIDENCE_RECORDS;

    assert.equal(matRecords.length, 10);
    assert.equal(appRecords.length, 10);
    for (const rec of [...matRecords, ...appRecords]) {
      assert.equal(rec.truthfulnessFlags.anatomicalVerificationCompleted, false);
      assert.equal(rec.truthfulnessFlags.expertVerificationCompleted, false);
      assert.equal(rec.truthfulnessFlags.canonicalMotionReady, false);
    }
  });

  it('5. verifies unified diff patch applies cleanly via git apply --check and read-only scope is intact', () => {
    const patchPath = path.join(
      REPO_ROOT,
      'docs/diagram-contact-audit-20261107/patches/minimal-diagram-contact-fixes.patch',
    );
    execFileSync('git', ['apply', '--check', patchPath], { cwd: REPO_ROOT });

    const statusOut = execFileSync('git', ['status', '--porcelain'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const lines = statusOut
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const outsideAllowed = lines.filter((line) => {
      const filePart = line.slice(3).trim();
      return (
        !filePart.startsWith('scripts/diagram-contact-audit-20261107') &&
        !filePart.startsWith('docs/diagram-contact-audit-20261107')
      );
    });
    assert.deepEqual(
      outsideAllowed,
      [],
      `Read-only boundary violated! Unexpected modified/untracked files: ${outsideAllowed.join(', ')}`,
    );
  });
});
