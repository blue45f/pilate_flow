import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  REPO_ROOT,
  evaluateContactAccuracySuite,
  renderAndExtractPhaseGeometry,
  dist2D,
} from '../shared/contact-geometry-analyzer.mjs';
import {
  loadCandidateContactFixSuite,
} from '../track-a-implementation/candidate-minimal-contact-fixes.mjs';

describe('Track B — Independent Adversarial Contact Audit on Real App Renderer & Ownership Scope Guard', async () => {
  const suite = await loadCandidateContactFixSuite();
  const coverageRecords = suite.realAppAssets.map((a) =>
    suite.coverageMod.toExerciseEvidenceMotionOverlay(a.exerciseId),
  );
  const corrections = suite.correctionsMod.MOVEMENT_DIAGRAM_CORRECTIONS;

  const baselineReport = evaluateContactAccuracySuite({
    assets: suite.baselineAssets,
    AssetComponent: suite.BaselineMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  const realAppReport = evaluateContactAccuracySuite({
    assets: suite.realAppAssets,
    AssetComponent: suite.RealAppMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  it('1. confirms R-01 (Mat Clam & Open Book cross-leakage + shoulder connection) remains resolved on real app', () => {
    assert.equal(realAppReport.r01ExcludedBaseline.status, 'ALREADY_RESOLVED_ON_MAIN');
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.clamArchetypeId, 'mat-clam-isolated');
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.openBookArchetypeId, 'mat-open-book-isolated');
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.clamHandLeakPx, 0);
    assert.equal(realAppReport.r01ExcludedBaseline.metrics.openBookKneeLeakPx, 0);
    const correctionValues = Object.values(corrections);
    assert.equal(correctionValues.length, 2);
    for (const c of correctionValues) {
      assert.equal(c.professionalReviewCount, 0);
      assert.equal(c.sourceFrameMappings, 0);
    }
  });

  it('2. contrasts pre-fix 338e7bd baseline defects (D-01..D-05) against real app src/ fixes', () => {
    assert.equal(baselineReport.allFiveDefectsPassed, false);
    assert.equal(realAppReport.allFiveDefectsPassed, true);

    assert.equal(baselineReport.defects.D01.passed, false);
    assert.equal(realAppReport.defects.D01.passed, true);

    assert.equal(baselineReport.defects.D02.passed, false);
    assert.equal(realAppReport.defects.D02.passed, true);

    assert.equal(baselineReport.defects.D03.passed, false);
    assert.equal(realAppReport.defects.D03.passed, true);

    assert.equal(baselineReport.defects.D04.passed, false);
    assert.equal(realAppReport.defects.D04.passed, true);

    assert.equal(baselineReport.defects.D05.passed, false);
    assert.equal(realAppReport.defects.D05.passed, true);
  });

  it('3. verifies real app fixes preserve exact pose-apparatus contact geometry in both standard (mirrored=false) and mirrored (mirrored=true) views', () => {
    assert.equal(
      Object.is(suite.realAppAssets, suite.catalogMod.MOVEMENT_VISUAL_ASSETS),
      true,
    );
    assert.equal(
      Object.is(suite.RealAppMovementPhaseDiagramSvg, suite.svgMod.MovementPhaseDiagramSvg),
      true,
    );

    // D-02A Reformer plank mirrored contact check
    const refPlank = suite.catalogMod.getMovementVisualAsset('ex-plank-01');
    const refMir = renderAndExtractPhaseGeometry(
      suite.RealAppMovementPhaseDiagramSvg,
      refPlank,
      'start',
      true,
    );
    const mirFootbarTop = refMir.apparatusGeometry.footbar.top;
    const mirWrist = refMir.jointCircles.wrist;
    assert.ok(
      dist2D(mirWrist, mirFootbarTop) <= 6,
      `Mirrored Reformer plank wrist should be within 6px of mirrored footbarTop, got ${dist2D(mirWrist, mirFootbarTop)}`,
    );

    // D-02B Chair plank mirrored contact check
    for (const id of ['ex-plank-02', 'original-chair-incline-support', 'ex-kr-chair-01']) {
      const chairPlank = suite.catalogMod.getMovementVisualAsset(id);
      for (const phaseId of ['start', 'middle', 'end']) {
        const mir = renderAndExtractPhaseGeometry(
          suite.RealAppMovementPhaseDiagramSvg,
          chairPlank,
          phaseId,
          true,
        );
        assert.equal(Math.abs(mir.jointCircles.wrist.y - mir.apparatusGeometry.seat.y), 0);
        assert.ok(
          dist2D(mir.jointCircles.ankle, mir.apparatusGeometry.pedal.pedalTip) <= 8,
        );
      }
    }

    // D-04 Chair seated pedal footwork mirrored contact check
    for (const id of ['ex-footwork-03', 'original-chair-seated-footwork', 'original-chair-pedal-press']) {
      const chairFoot = suite.catalogMod.getMovementVisualAsset(id);
      if (!chairFoot) continue;
      const mirMid = renderAndExtractPhaseGeometry(
        suite.RealAppMovementPhaseDiagramSvg,
        chairFoot,
        'middle',
        true,
      );
      assert.ok(
        dist2D(mirMid.jointCircles.ankle, mirMid.apparatusGeometry.pedal.pedalTip) <= 6,
      );
    }

    // D-05 Standing barrel mirrored non-penetration & ladder contact check
    for (const id of ['original-barrel-standing-hip-extension', 'original-barrel-standing-side-reach']) {
      const barAsset = suite.catalogMod.getMovementVisualAsset(id);
      const mirMid = renderAndExtractPhaseGeometry(
        suite.RealAppMovementPhaseDiagramSvg,
        barAsset,
        'middle',
        true,
      );
      assert.ok(
        mirMid.jointCircles.hand.x >= mirMid.apparatusGeometry.ladder.minX &&
          mirMid.jointCircles.hand.x <= mirMid.apparatusGeometry.ladder.maxX,
      );
      assert.ok(
        mirMid.jointCircles.ankle.x < mirMid.apparatusGeometry.ladder.minX,
        'Mirrored extended leg must not cross mirrored ladder or dome',
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

  it('5. enforces strict file ownership boundary (never touches ExerciseAtlasView or other pages/routes/stores)', () => {
    const statusOut = execFileSync('git', ['status', '--porcelain'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const lines = statusOut
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const allowedPrefixes = [
      'src/components/MovementPhaseDiagramSvg.tsx',
      'src/data/movementVisualRigCatalog.ts',
      'src/test/diagramApparatusContactRegression.test.tsx',
      'scripts/diagram-contact-audit-20261107/',
      'docs/diagram-contact-audit-20261107/',
      'docs/diagram-semantic-audit-round4-20261107/',
    ];

    const outsideAllowed = lines.filter((line) => {
      const filePart = line.replace(/^[A-Z?]+\s+/, '').trim();
      return !allowedPrefixes.some(
        (prefix) => filePart === prefix || filePart.startsWith(prefix),
      );
    });
    assert.deepEqual(
      outsideAllowed,
      [],
      `Ownership boundary violated! Unexpected modified/untracked files: ${outsideAllowed.join(', ')}`,
    );
  });
});
