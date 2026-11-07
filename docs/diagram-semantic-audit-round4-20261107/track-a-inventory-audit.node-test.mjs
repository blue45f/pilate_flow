import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  REPO_ROOT,
  AUDIT_DIR,
  runSemanticAuditAnalysis,
} from './shared/semantic-audit-analyzer.mjs';

test('Track A — 98-exercise inventory & 28 coordinate-trajectory groups are complete and exclude prior resolved defects', async () => {
  const analysis = await runSemanticAuditAnalysis();

  assert.equal(analysis.summary.totalExercisesAudited, 98);
  assert.equal(analysis.inventory.length, 98);
  assert.equal(analysis.summary.totalCoordinateGroups, 28);
  assert.equal(analysis.coordinateGroups.length, 28);
  assert.equal(analysis.summary.sharedCoordinateGroupsCount, 21);
  assert.equal(analysis.summary.singletonCoordinateGroupsCount, 7);

  // Verify prior resolved fixes (R-01, D-01..D-05) are isolated or excluded from residual semantic mismatch defects
  const mismatchedIds = new Set(
    analysis.inventory
      .filter((i) => i.semanticClassification === 'residual-semantic-mismatch')
      .map((i) => i.exerciseId),
  );

  for (const resolvedId of [
    'original-mat-clam',
    'original-mat-open-book',
    'original-reformer-strap-frog',
    'ex-plank-01',
    'original-chair-incline-support',
    'ex-plank-02',
    'ex-kr-chair-01',
    'original-cadillac-arm-spring-press',
    'ex-bridging-02',
    'original-chair-seated-pedal-press',
    'original-chair-alternating-pedal',
    'ex-footwork-03',
    'original-barrel-standing-hip-extension',
  ]) {
    assert.equal(
      mismatchedIds.has(resolvedId),
      false,
      `Already-resolved exercise ${resolvedId} must not be re-reported as a residual mismatch`,
    );
  }
});

test('Track A — Quantitative joint-delta proofs hold for top residual semantic mismatches SM-01..SM-08', async () => {
  const analysis = await runSemanticAuditAnalysis();
  const byId = new Map(analysis.inventory.map((i) => [i.exerciseId, i]));

  // SM-01: Chair Seated Pelvic Rock & Breath have 0px pelvis delta and 80.5px hand rowing delta
  const chairPelvicRock = byId.get('original-chair-seated-pelvic-rock');
  assert.equal(chairPelvicRock.archetypeId, 'seated-row-arm-arc');
  assert.equal(chairPelvicRock.jointDeltas.pelvis.maxPhaseDist, 0);
  assert.equal(chairPelvicRock.jointDeltas.hand.dist_sm, 80.5);
  assert.equal(chairPelvicRock.jointDeltas.hand.maxPhaseDist, 103.2);

  // SM-02: Barrel/Chair Supported Calf Raise swings hand 50.5px into air; Cadillac Standing Punch rises 14.6px onto tiptoes
  const barrelAnkle = byId.get('original-barrel-supported-ankle');
  assert.equal(barrelAnkle.archetypeId, 'standing-ankle-calf-upper-reach');
  assert.equal(barrelAnkle.jointDeltas.hand.dist_sm, 50.5);
  const cadillacPunch = byId.get('ex-upper-03');
  assert.equal(cadillacPunch.jointDeltas.heel.dist_sm, 14.6);

  // SM-03: Mat Pelvic Clock & Rib Breath have 0px pelvis delta and 64.1px overhead arm arc
  const matPelvicClock = byId.get('original-mat-pelvic-clock');
  assert.equal(matPelvicClock.archetypeId, 'supine-breath-pelvic-clock');
  assert.equal(matPelvicClock.jointDeltas.pelvis.dist_sm, 6.3);
  assert.equal(matPelvicClock.jointDeltas.hand.dist_sm, 64.1);
  assert.equal(matPelvicClock.jointDeltas.hand.maxPhaseDist, 129.3);

  // SM-04: Chair Sit-to-Stand kicks one leg 65.5px backward with pelvis height flat (118->120)
  const chairSitToStand = byId.get('original-chair-sit-to-stand');
  assert.equal(chairSitToStand.archetypeId, 'standing-scooter-lunge-splits');
  assert.equal(chairSitToStand.jointDeltas.ankle.maxPhaseDist, 65.5);
  assert.equal(chairSitToStand.jointDeltas.pelvis.dy_sm, 2);

  // SM-05: Cadillac Roll-Down Bar Cat Stretch keeps spine rigid (thoracic Δ2.8px) while pulling hands 118.3px behind hips
  const catStretch = byId.get('ex-warmup-02');
  assert.equal(catStretch.archetypeId, 'kneeling-chest-expansion-triceps');
  assert.equal(catStretch.jointDeltas.thoracic.maxPhaseDist, 2.8);
  assert.equal(catStretch.jointDeltas.hand.maxPhaseDist, 118.3);

  // SM-06: Chair/Cadillac Seated Spine Twist leans backward 56.4px into C-curve roll-back
  const chairTwist = byId.get('original-chair-seated-spine-twist');
  assert.equal(chairTwist.archetypeId, 'seated-roll-back-spine-twist');
  assert.equal(chairTwist.jointDeltas.head.maxPhaseDist, 56.4);

  // SM-07: Barrel Standing Side Stretch & Side-Lying Side Bend sit on floor in Z-Sit (pelvis.y: 138, knee.y: 148)
  const barrelStandingSide = byId.get('original-barrel-standing-side-stretch');
  assert.equal(barrelStandingSide.bodyPosition, 'standing');
  assert.equal(barrelStandingSide.jointDeltas.pelvis.start.y, 138);
  assert.equal(barrelStandingSide.jointDeltas.knee.start.y, 148);

  // SM-08: Chair Seated Knee Lift pushes knee DOWNWARD +34px (y: 98 -> 132) instead of lifting
  const chairKneeLift = byId.get('original-chair-seated-knee-lift');
  assert.equal(chairKneeLift.archetypeId, 'chair-seated-pedal-footwork');
  assert.equal(chairKneeLift.jointDeltas.knee.dy_sm, 34);
});

test('Track A — Minimal follow-up differentiation proposal patch passes git apply --check cleanly', () => {
  const patchPath = path.join(
    AUDIT_DIR,
    'patches/minimal-semantic-differentiation-proposal.patch',
  );
  assert.equal(fs.existsSync(patchPath), true);
  execFileSync('git', ['apply', '--check', patchPath], { cwd: REPO_ROOT });
});
