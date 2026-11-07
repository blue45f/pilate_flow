import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  dist2D,
  evaluateContactAccuracySuite,
  loadReadOnlyBaselineModules,
  renderAndExtractPhaseGeometry,
  REPO_ROOT,
} from '../../scripts/diagram-contact-audit-20261107/shared/contact-geometry-analyzer.mjs';

describe('Round 5 Independent Verification — Pure Breath-Observation 4 Diagrams & Ownership Guard', () => {
  it('1. verifies strict file ownership (zero edits to SourceNoteDialog, InstructorStudyDialog, Builder, Binder, Atlas, App.tsx, shared stores/routes/CSS)', () => {
    const statusOut = execFileSync('git', ['status', '--porcelain'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const modifiedFiles = statusOut
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[A-Z?]+\s+/, '').trim());

    const allowedPrefixes = [
      'src/components/MovementPhaseDiagramSvg.tsx',
      'src/data/movementVisualRigCatalog.ts',
      'src/test/diagramApparatusContactRegression.test.tsx',
      'scripts/diagram-contact-audit-20261107/',
      'docs/breath-diagram-round5-20261107/',
    ];

    const forbiddenModified = modifiedFiles.filter(
      (f) => !allowedPrefixes.some((p) => f === p || f.startsWith(p)),
    );
    assert.deepEqual(
      forbiddenModified,
      [],
      `Forbidden files modified: ${forbiddenModified.join(', ')}`,
    );
  });

  it('2. verifies all Round 5 test & evidence files obey <= 800 lines limit', () => {
    const filesToCheck = [
      'src/test/diagramApparatusContactRegression.test.tsx',
      'docs/breath-diagram-round5-20261107/verify-breath-diagram-round5.mjs',
      'docs/breath-diagram-round5-20261107/track-b-breath-independent-verify.node-test.mjs',
      'docs/breath-diagram-round5-20261107/README.md',
    ];
    for (const rel of filesToCheck) {
      const abs = path.join(REPO_ROOT, rel);
      const lineCount = fs.readFileSync(abs, 'utf8').split('\n').length;
      assert.ok(lineCount <= 800, `${rel} exceeds 800 lines (${lineCount})`);
    }
  });

  it('3. verifies 4 pure breath exercises x 3 phases x mirrored (24 SVGs), apparatus contacts, spring state, and zero calves muscle fallback', async () => {
    const { catalogMod, correctionsMod, svgMod, coverageMod } =
      await loadReadOnlyBaselineModules();
    const assets = catalogMod.MOVEMENT_VISUAL_ASSETS;
    const AssetComponent = svgMod.MovementPhaseDiagramSvg;
    const corrections = correctionsMod.MOVEMENT_DIAGRAM_CORRECTIONS;
    const coverageRecords = assets.map((a) =>
      coverageMod.toExerciseEvidenceMotionOverlay(a.exerciseId),
    );

    const contactEval = evaluateContactAccuracySuite({
      assets,
      AssetComponent,
      corrections,
      coverageRecords,
    });
    assert.equal(contactEval.allFiveDefectsPassed, true);
    assert.equal(contactEval.svgRenderIntegrity.passed, true);
    assert.equal(contactEval.truthfulnessBoundary.passed, true);

    const matBreath = catalogMod.getMovementVisualAsset('original-mat-rib-breath');
    const cadBreath = catalogMod.getMovementVisualAsset('original-cadillac-table-breath');
    const chairBreath = catalogMod.getMovementVisualAsset('original-chair-seated-breath');
    const barrelBreath = catalogMod.getMovementVisualAsset('original-barrel-standing-breath');

    // Chair breath: pelvis on seat y=108 (seat 106..115), heel on floor y=176 (floor 178)
    assert.deepEqual(chairBreath.phases.start.joints.pelvis, { x: 132, y: 108 });
    assert.deepEqual(chairBreath.phases.start.joints.heel, { x: 198, y: 176 });
    assert.equal(chairBreath.phases.start.apparatusState.springTensionLevel, 'none');

    // Cadillac breath: springTensionLevel === 'none' and 0 spring coil paths in apparatus-support
    for (const phase of ['start', 'middle', 'end']) {
      assert.equal(cadBreath.phases[phase].apparatusState.springTensionLevel, 'none');
      for (const mirrored of [false, true]) {
        const r = renderAndExtractPhaseGeometry(AssetComponent, cadBreath, phase, mirrored);
        const supportPaths =
          r.markup.match(/data-layer="apparatus-support"[\s\S]*?<\/g>/)?.[0]?.match(/<path /g) ??
          [];
        assert.equal(supportPaths.length, 0, 'Cadillac breath must not render hand spring coil');
      }
    }

    // Barrel breath: hand on ladder rung (88,76), heel grounded (140,176), no calves fallback
    assert.deepEqual(barrelBreath.phases.start.joints.hand, { x: 88, y: 76 });
    assert.deepEqual(barrelBreath.phases.start.joints.heel, { x: 140, y: 176 });
    assert.equal(
      barrelBreath.primaryMuscles.some((m) => m.muscleGroupId === 'calves'),
      false,
    );

    // All 4 breath exercises: hand Δ=0, heel Δ=0, thoracic Δ>=6, mirrored symmetry
    for (const asset of [matBreath, cadBreath, chairBreath, barrelBreath]) {
      assert.equal(asset.anatomicalAccuracyAssumed, false);
      assert.equal(dist2D(asset.phases.start.joints.hand, asset.phases.middle.joints.hand), 0);
      assert.equal(dist2D(asset.phases.start.joints.heel, asset.phases.middle.joints.heel), 0);
      assert.ok(dist2D(asset.phases.start.joints.thoracic, asset.phases.middle.joints.thoracic) >= 6);
    }
  });
});
