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

test('Track A — 98-exercise inventory & 44 post-fix coordinate-trajectory groups are complete and preserve prior resolved fixes', async () => {
  const analysis = await runSemanticAuditAnalysis();

  assert.equal(analysis.summary.totalExercisesAudited, 98);
  assert.equal(analysis.inventory.length, 98);
  assert.equal(analysis.summary.totalCoordinateGroups, 44);
  assert.equal(analysis.coordinateGroups.length, 44);

  const byId = new Map(analysis.inventory.map((i) => [i.exerciseId, i]));

  // Verify prior resolved fixes (R-01, D-01..D-05) remain intact
  assert.equal(byId.get('original-mat-clam').archetypeId, 'mat-clam-isolated');
  assert.equal(byId.get('original-mat-open-book').archetypeId, 'mat-open-book-isolated');
  assert.equal(byId.get('original-reformer-strap-frog').archetypeId, 'reformer-strap-frog-isolated');
  assert.equal(byId.get('ex-plank-01').archetypeId, 'reformer-plank-long-stretch-isolated');
  assert.equal(byId.get('ex-plank-02').archetypeId, 'chair-plank-pike-isolated');
  assert.equal(
    byId.get('original-barrel-standing-hip-extension').archetypeId,
    'barrel-standing-hip-extension-isolated',
  );
});

test('Track A — Quantitative joint-delta proofs hold for separated SM-01..SM-08 clear-evidence exercises', async () => {
  const analysis = await runSemanticAuditAnalysis();
  const byId = new Map(analysis.inventory.map((i) => [i.exerciseId, i]));

  // SM-01: Chair Seated Pelvic Rock & Back Reach separated from Seated Row
  const chairPelvicRock = byId.get('original-chair-seated-pelvic-rock');
  assert.equal(chairPelvicRock.archetypeId, 'chair-seated-pelvic-rock-isolated');
  assert.equal(chairPelvicRock.jointDeltas.hand.maxPhaseDist, 0);
  assert.ok(chairPelvicRock.jointDeltas.lumbar.maxPhaseDist > 10);

  const chairBackReach = byId.get('original-chair-seated-back-reach');
  assert.equal(chairBackReach.archetypeId, 'chair-seated-back-reach-isolated');
  assert.ok(chairBackReach.jointDeltas.thoracic.dy_sm < -5);

  // SM-02: Supported calf raises keep hands anchored; standing rotation & punch keep heels grounded
  const barrelAnkle = byId.get('original-barrel-supported-ankle');
  assert.equal(barrelAnkle.archetypeId, 'barrel-supported-ankle-isolated');
  assert.equal(barrelAnkle.jointDeltas.hand.maxPhaseDist, 0);
  assert.ok(barrelAnkle.jointDeltas.heel.dy_sm < -10);

  const chairCalf = byId.get('original-chair-supported-calf-raise');
  assert.equal(chairCalf.archetypeId, 'chair-supported-calf-raise-isolated');
  assert.equal(chairCalf.jointDeltas.hand.maxPhaseDist, 0);
  assert.ok(chairCalf.jointDeltas.heel.dy_sm < -10);

  const barrelRot = byId.get('original-barrel-standing-rotation');
  assert.equal(barrelRot.archetypeId, 'barrel-standing-rotation-isolated');
  assert.equal(barrelRot.jointDeltas.heel.maxPhaseDist, 0);

  const cadillacPunch = byId.get('ex-upper-03');
  assert.equal(cadillacPunch.archetypeId, 'cadillac-standing-punch-press-isolated');
  assert.equal(cadillacPunch.jointDeltas.heel.maxPhaseDist, 0);
  assert.ok(cadillacPunch.jointDeltas.hand.dx_sm > 40);

  // SM-03: Mat Pelvic Clock & Cadillac Pelvic Rock keep hands stationary on mat/table
  const matPelvicClock = byId.get('original-mat-pelvic-clock');
  const cadillacPelvicRock = byId.get('original-cadillac-pelvic-rock');
  assert.equal(matPelvicClock.archetypeId, 'supine-pelvic-clock-isolated');
  assert.equal(cadillacPelvicRock.archetypeId, 'supine-pelvic-clock-isolated');
  assert.equal(matPelvicClock.jointDeltas.hand.maxPhaseDist, 0);
  assert.ok(matPelvicClock.jointDeltas.lumbar.maxPhaseDist > 5);

  // SM-04: Chair Sit-to-Stand rises from seat with grounded feet; Reformer Side Splits abducts laterally
  const chairSitToStand = byId.get('original-chair-sit-to-stand');
  assert.equal(chairSitToStand.archetypeId, 'chair-sit-to-stand-isolated');
  assert.equal(chairSitToStand.jointDeltas.ankle.maxPhaseDist, 0);
  assert.ok(chairSitToStand.jointDeltas.pelvis.maxPhaseDist > 35);

  const sideSplits = byId.get('ex-lower-02');
  assert.equal(sideSplits.archetypeId, 'reformer-standing-side-splits-isolated');
  assert.ok(sideSplits.jointDeltas.ankle.dx_sm < -45);
  assert.deepEqual(sideSplits.carriageOffsets, [4, 42, 10]);

  // SM-05: Cadillac Roll-Down Bar Cat Stretch articulates spine into anterior C-curve flexion
  const catStretch = byId.get('ex-warmup-02');
  assert.equal(catStretch.archetypeId, 'cadillac-kneeling-cat-stretch-isolated');
  assert.ok(catStretch.jointDeltas.head.dx_sm > 40);
  assert.ok(catStretch.jointDeltas.thoracic.maxPhaseDist > 15);

  // SM-06: Chair/Cadillac Seated Spine Twist maintains vertical spine plumb line (zero backward roll-back)
  const chairTwist = byId.get('original-chair-seated-spine-twist');
  const cadillacTwist = byId.get('original-cadillac-seated-rotation');
  assert.equal(chairTwist.archetypeId, 'chair-seated-spine-twist-isolated');
  assert.equal(cadillacTwist.archetypeId, 'cadillac-seated-rotation-isolated');
  assert.equal(chairTwist.jointDeltas.head.dx_sm, 0);
  assert.equal(cadillacTwist.jointDeltas.head.dx_sm, 0);

  // SM-07A & SM-07B: Barrel side-lying side bend (pelvis on dome + feet on ladder) & standing side stretch separated from Z-Sit
  for (const id of ['original-barrel-supported-side-bend', 'ex-kr-barrel-01']) {
    const barrelSideBend = byId.get(id);
    assert.equal(barrelSideBend.archetypeId, 'barrel-side-lying-side-bend-isolated');
    assert.deepEqual(barrelSideBend.jointDeltas.pelvis.start, { x: 126, y: 116 });
    assert.deepEqual(barrelSideBend.jointDeltas.ankle.start, { x: 228, y: 132 });
    assert.ok(barrelSideBend.jointDeltas.head.dy_sm < -50);
  }
  const barrelStandingSide = byId.get('original-barrel-standing-side-stretch');
  assert.equal(barrelStandingSide.archetypeId, 'barrel-standing-side-stretch-isolated');
  assert.deepEqual(barrelStandingSide.jointDeltas.pelvis.start, { x: 148, y: 122 });
  assert.deepEqual(barrelStandingSide.jointDeltas.ankle.start, { x: 148, y: 170 });

  // SM-08A & SM-08B: Chair Seated Knee Lift (upward dy = -38px, pedal [0,0,0]) & Barrel Standing Side Reach (straight-knee abduction)
  const chairKneeLift = byId.get('original-chair-seated-knee-lift');
  assert.equal(chairKneeLift.archetypeId, 'chair-seated-knee-lift-isolated');
  assert.equal(chairKneeLift.jointDeltas.knee.dy_sm, -38);
  assert.deepEqual(chairKneeLift.pedalAngles, [0, 0, 0]);

  const barrelSideReach = byId.get('original-barrel-standing-side-reach');
  assert.equal(barrelSideReach.archetypeId, 'barrel-standing-side-reach-isolated');
  assert.deepEqual(barrelSideReach.jointDeltas.ankle.middle, { x: 228, y: 118 });
});

test('Track A — Ambiguous-evidence breath-observation exercises remain unmodified & unverified', async () => {
  const analysis = await runSemanticAuditAnalysis();
  const byId = new Map(analysis.inventory.map((i) => [i.exerciseId, i]));

  assert.equal(byId.get('original-mat-rib-breath').archetypeId, 'supine-breath-pelvic-clock');
  assert.equal(byId.get('original-cadillac-table-breath').archetypeId, 'supine-breath-pelvic-clock');
  assert.equal(byId.get('original-chair-seated-breath').archetypeId, 'seated-row-arm-arc');
  assert.equal(
    byId.get('original-barrel-standing-breath').archetypeId,
    'standing-ankle-calf-upper-reach',
  );
  for (const id of [
    'original-mat-rib-breath',
    'original-cadillac-table-breath',
    'original-chair-seated-breath',
    'original-barrel-standing-breath',
  ]) {
    assert.equal(byId.get(id).truthfulnessBoundary.anatomicalAccuracyAssumed, false);
    assert.equal(byId.get(id).truthfulnessBoundary.expertVerificationCompleted, false);
  }
});

