import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../components/MovementPhaseDiagramSvg';
import {
  calculatePhaseJointDelta,
  getMovementVisualAsset,
  MOVEMENT_VISUAL_ASSETS,
} from '../data/movementVisualRigCatalog';

function parseSvgFromMarkup(markup: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(markup, 'text/html');
  const svg = doc.querySelector('svg');
  if (!svg) {
    throw new Error('Expected <svg> element in rendered markup');
  }
  return svg;
}

describe('2D diagram pose-apparatus contact regression (D-01..D-05 + mirrored symmetry)', () => {
  it('D-01: returns original-reformer-strap-frog end phase to flexed-knee Frog home position while preserving end pose-delta-vector', () => {
    const frog = getMovementVisualAsset('original-reformer-strap-frog')!;
    expect(frog).not.toBeNull();
    expect(frog.archetypeId).toBe('reformer-strap-frog-isolated');
    expect(frog.anatomicalAccuracyAssumed).toBe(false);

    const startAnkle = frog.phases.start.joints.ankle;
    const endAnkle = frog.phases.end.joints.ankle;
    const startKnee = frog.phases.start.joints.knee;
    const endKnee = frog.phases.end.joints.knee;

    expect(endAnkle.y).toBe(startAnkle.y);
    expect(Math.hypot(endAnkle.x - startAnkle.x, endAnkle.y - startAnkle.y)).toBeLessThanOrEqual(6);
    expect(Math.hypot(endKnee.x - startKnee.x, endKnee.y - startKnee.y)).toBeLessThanOrEqual(6);
    expect([
      frog.phases.start.apparatusState.carriageOffsetPx,
      frog.phases.middle.apparatusState.carriageOffsetPx,
      frog.phases.end.apparatusState.carriageOffsetPx,
    ]).toEqual([6, 36, 6]);

    const endSvg = parseSvgFromMarkup(
      renderToStaticMarkup(<MovementPhaseDiagramSvg asset={frog} phase="end" />),
    );
    expect(endSvg.querySelectorAll('[data-pose-delta-vector]').length).toBeGreaterThan(0);

    // Ensure Leg Circles (ex-straps-01) retains its circular arc end phase
    const legCircles = getMovementVisualAsset('ex-straps-01')!;
    expect(legCircles.archetypeId).toBe('supine-feet-in-straps');
    expect(legCircles.phases.end.joints.ankle).toEqual({ x: 222, y: 40 });
  });

  it('D-02A & D-02B: anchors Reformer Plank hands on footbar / feet on carriage and Chair Plank hands on seat / feet on pedal', () => {
    const reformerPlank = getMovementVisualAsset('ex-plank-01')!;
    expect(reformerPlank.archetypeId).toBe('reformer-plank-long-stretch-isolated');
    expect(reformerPlank.phases.start.joints.wrist).toEqual({ x: 262, y: 126 });
    expect(reformerPlank.phases.start.joints.hand).toEqual({ x: 268, y: 126 });
    expect(reformerPlank.phases.start.joints.ankle).toEqual({ x: 80, y: 138 });
    expect(reformerPlank.phases.middle.joints.ankle).toEqual({ x: 114, y: 138 });
    expect(reformerPlank.phases.end.joints.ankle).toEqual({ x: 84, y: 138 });

    for (const id of ['ex-plank-02', 'original-chair-incline-support', 'ex-kr-chair-01'] as const) {
      const chairPlank = getMovementVisualAsset(id)!;
      expect(chairPlank.archetypeId).toBe('chair-plank-pike-isolated');
      expect(chairPlank.phases.start.joints.wrist).toEqual({ x: 132, y: 106 });
      expect(chairPlank.phases.start.joints.hand).toEqual({ x: 124, y: 106 });
      expect(chairPlank.phases.start.joints.ankle).toEqual({ x: 216, y: 156 });
      expect(chairPlank.phases.middle.joints.ankle).toEqual({ x: 208, y: 134 });
      expect(chairPlank.phases.end.joints.ankle).toEqual({ x: 216, y: 159 });
    }
  });

  it('D-03: keeps carriageOffsetPx at 0 across all 18 Cadillac stationary table exercises', () => {
    const cadillacAssets = MOVEMENT_VISUAL_ASSETS.filter((a) => a.apparatus === 'cadillac');
    expect(cadillacAssets).toHaveLength(18);
    for (const asset of cadillacAssets) {
      expect(asset.phases.start.apparatusState.carriageOffsetPx).toBe(0);
      expect(asset.phases.middle.apparatusState.carriageOffsetPx).toBe(0);
      expect(asset.phases.end.apparatusState.carriageOffsetPx).toBe(0);
    }
  });

  it('D-04: rotates Wunda Chair pedal downward with foot press in both standard and mirrored views', () => {
    const chairFootwork = getMovementVisualAsset('ex-footwork-03')!;
    for (const mirrored of [false, true]) {
      const startSvg = parseSvgFromMarkup(
        renderToStaticMarkup(
          <MovementPhaseDiagramSvg asset={chairFootwork} phase="start" mirrored={mirrored} />,
        ),
      );
      const middleSvg = parseSvgFromMarkup(
        renderToStaticMarkup(
          <MovementPhaseDiagramSvg asset={chairFootwork} phase="middle" mirrored={mirrored} />,
        ),
      );
      const startPedal = startSvg.querySelector('line[data-chair-pedal="hinged"]')!;
      const middlePedal = middleSvg.querySelector('line[data-chair-pedal="hinged"]')!;
      const middleAnkle = middleSvg.querySelector('circle[data-joint-node="ankle"]')!;

      const startTipY = Number(startPedal.getAttribute('y2'));
      const middleTipX = Number(middlePedal.getAttribute('x2'));
      const middleTipY = Number(middlePedal.getAttribute('y2'));
      const ankleX = Number(middleAnkle.getAttribute('cx'));
      const ankleY = Number(middleAnkle.getAttribute('cy'));

      expect(middleTipY).toBeGreaterThan(startTipY + 25);
      expect(Math.hypot(ankleX - middleTipX, ankleY - middleTipY)).toBeLessThanOrEqual(6);
    }
  });

  it('D-05: prevents standing Barrel lower-limb penetration of dome/ladder and anchors hands on ladder rung', () => {
    const hipExt = getMovementVisualAsset('original-barrel-standing-hip-extension')!;
    expect(hipExt.archetypeId).toBe('barrel-standing-hip-extension-isolated');
    expect(hipExt.phases.start.joints.hand).toEqual({ x: 88, y: 76 });
    expect(hipExt.phases.middle.joints.hand).toEqual({ x: 88, y: 76 });
    expect(hipExt.phases.middle.joints.farAnkle).toEqual({ x: 138, y: 172 });
    expect(hipExt.phases.middle.joints.ankle).toEqual({ x: 222, y: 148 });
    expect(calculatePhaseJointDelta(hipExt).maxDeltaPx).toBeGreaterThan(0);

    const sideReach = getMovementVisualAsset('original-barrel-standing-side-reach')!;
    expect(sideReach.archetypeId).toBe('barrel-standing-side-reach-isolated');
    expect(sideReach.phases.start.joints.hand).toEqual({ x: 88, y: 76 });
    expect(sideReach.phases.middle.joints.hand).toEqual({ x: 88, y: 76 });
    expect(sideReach.phases.middle.joints.farAnkle).toEqual({ x: 138, y: 172 });
    expect(sideReach.phases.middle.joints.ankle).toEqual({ x: 228, y: 118 });
    expect(calculatePhaseJointDelta(sideReach).maxDeltaPx).toBeGreaterThan(0);

    for (const asset of [hipExt, sideReach]) {
      const triptychMarkup = renderToStaticMarkup(
        <MovementTriptychDiagramSvg asset={asset} />,
      );
      expect(triptychMarkup).toContain('data-testid="movement-triptych-diagram"');
    }
  });
});

describe('Round 4 semantic differentiation regression (SM-01..SM-08 + ambiguous-evidence non-modification)', () => {
  it('SM-08A: separates Chair Seated Knee Lift (upward knee flexion, stationary pedal) from Seated Pedal Press (downward pedal extension)', () => {
    const kneeLift = getMovementVisualAsset('original-chair-seated-knee-lift')!;
    const pedalPress = getMovementVisualAsset('original-chair-seated-pedal-press')!;

    expect(kneeLift.archetypeId).toBe('chair-seated-knee-lift-isolated');
    expect(pedalPress.archetypeId).toBe('chair-seated-pedal-footwork');

    // Knee lift elevates the working knee and ankle upward (negative dy) with stationary pedal (0 deg)
    expect(kneeLift.phases.middle.joints.knee.y - kneeLift.phases.start.joints.knee.y).toBeLessThan(-30);
    expect(kneeLift.phases.middle.joints.ankle.y - kneeLift.phases.start.joints.ankle.y).toBeLessThan(-35);
    expect([
      kneeLift.phases.start.apparatusState.pedalAngleDeg,
      kneeLift.phases.middle.apparatusState.pedalAngleDeg,
      kneeLift.phases.end.apparatusState.pedalAngleDeg,
    ]).toEqual([0, 0, 0]);
    expect(kneeLift.phases.middle.joints.farAnkle).toEqual({ x: 184, y: 172 });

    // Pedal press pushes the working knee and ankle downward (positive dy) with downward pedal rotation
    expect(pedalPress.phases.middle.joints.knee.y - pedalPress.phases.start.joints.knee.y).toBeGreaterThan(25);
    expect(pedalPress.phases.middle.joints.ankle.y - pedalPress.phases.start.joints.ankle.y).toBeGreaterThan(25);
    expect([
      pedalPress.phases.start.apparatusState.pedalAngleDeg,
      pedalPress.phases.middle.apparatusState.pedalAngleDeg,
      pedalPress.phases.end.apparatusState.pedalAngleDeg,
    ]).toEqual([8, 36, 12]);
  });

  it('SM-08B: separates Barrel Standing Side Reach (upright torso, straight-knee lateral abduction) from Standing Hip Extension (flexed-knee posterior kick)', () => {
    const sideReach = getMovementVisualAsset('original-barrel-standing-side-reach')!;
    const hipExt = getMovementVisualAsset('original-barrel-standing-hip-extension')!;

    expect(sideReach.archetypeId).toBe('barrel-standing-side-reach-isolated');
    expect(hipExt.archetypeId).toBe('barrel-standing-hip-extension-isolated');

    // Side reach maintains upright shoulder/head and elevates straight leg higher laterally
    expect(sideReach.phases.middle.joints.shoulder).toEqual({ x: 140, y: 70 });
    expect(sideReach.phases.middle.joints.knee).toEqual({ x: 184, y: 126 });
    expect(sideReach.phases.middle.joints.ankle).toEqual({ x: 228, y: 118 });
    expect(hipExt.phases.middle.joints.knee).toEqual({ x: 184, y: 138 });
    expect(hipExt.phases.middle.joints.ankle).toEqual({ x: 222, y: 148 });
    expect(sideReach.phases.middle.joints.ankle.y).toBeLessThan(hipExt.phases.middle.joints.ankle.y - 25);
  });

  it('SM-07A & SM-07B: separates Barrel side-lying side bend (pelvis on dome + feet on ladder) and standing side stretch from floor Z-sit', () => {
    const zSit = MOVEMENT_VISUAL_ASSETS.find((a) => a.archetypeId === 'lateral-mermaid-side-bend')!;
    expect(zSit).toBeDefined();
    expect(zSit.phases.start.joints.pelvis).toEqual({ x: 148, y: 138 });

    for (const id of ['original-barrel-supported-side-bend', 'ex-kr-barrel-01'] as const) {
      const barrelSideLying = getMovementVisualAsset(id)!;
      expect(barrelSideLying.archetypeId).toBe('barrel-side-lying-side-bend-isolated');
      // Lateral pelvis rests on Barrel dome apex (x=126, y=116) and feet hook on right ladder rungs (x=228..248)
      expect(barrelSideLying.phases.start.joints.pelvis).toEqual({ x: 126, y: 116 });
      expect(barrelSideLying.phases.middle.joints.pelvis).toEqual({ x: 126, y: 116 });
      expect(barrelSideLying.phases.start.joints.ankle).toEqual({ x: 228, y: 132 });
      expect(barrelSideLying.phases.start.joints.farAnkle).toEqual({ x: 242, y: 142 });
      // Upper torso lifts from side-lying into lateral flexion (head.y: 88 -> 32)
      expect(barrelSideLying.phases.middle.joints.head.y).toBeLessThan(
        barrelSideLying.phases.start.joints.head.y - 50,
      );
    }

    const barrelStandingStretch = getMovementVisualAsset('original-barrel-standing-side-stretch')!;
    expect(barrelStandingStretch.archetypeId).toBe('barrel-standing-side-stretch-isolated');
    // Upright standing on both feet (ankle y=170, pelvis y=122) clear of barrel dome and ladder
    expect(barrelStandingStretch.phases.start.joints.ankle).toEqual({ x: 148, y: 170 });
    expect(barrelStandingStretch.phases.start.joints.pelvis).toEqual({ x: 148, y: 122 });
    expect(barrelStandingStretch.phases.middle.joints.hand.x).toBeLessThan(
      barrelStandingStretch.phases.start.joints.hand.x - 80,
    );
  });

  it('SM-01..SM-06: separates clear-evidence Chair/Cadillac/Reformer/Barrel/Mat exercises from shared multi-exercise rigs', () => {
    // SM-01: Chair pelvic rock & back reach vs Seated Row
    const chairPelvicRock = getMovementVisualAsset('original-chair-seated-pelvic-rock')!;
    const chairBackReach = getMovementVisualAsset('original-chair-seated-back-reach')!;
    expect(chairPelvicRock.archetypeId).toBe('chair-seated-pelvic-rock-isolated');
    expect(chairPelvicRock.phases.start.joints.hand).toEqual(
      chairPelvicRock.phases.middle.joints.hand,
    );
    expect(chairPelvicRock.phases.middle.joints.lumbar.x).toBeLessThan(
      chairPelvicRock.phases.start.joints.lumbar.x,
    );
    expect(chairBackReach.archetypeId).toBe('chair-seated-back-reach-isolated');
    expect(chairBackReach.phases.middle.joints.thoracic.y).toBeLessThan(
      chairBackReach.phases.start.joints.thoracic.y,
    );

    // SM-02: Supported calf raises & grounded standing rotations/punches
    const barrelAnkle = getMovementVisualAsset('original-barrel-supported-ankle')!;
    expect(barrelAnkle.archetypeId).toBe('barrel-supported-ankle-isolated');
    expect(barrelAnkle.phases.middle.joints.hand).toEqual({ x: 88, y: 76 });
    expect(barrelAnkle.phases.middle.joints.heel.y).toBeLessThan(
      barrelAnkle.phases.start.joints.heel.y,
    );

    const chairCalf = getMovementVisualAsset('original-chair-supported-calf-raise')!;
    expect(chairCalf.archetypeId).toBe('chair-supported-calf-raise-isolated');
    expect(chairCalf.phases.middle.joints.hand).toEqual({ x: 116, y: 106 });
    expect(chairCalf.phases.middle.joints.heel.y).toBeLessThan(chairCalf.phases.start.joints.heel.y);

    const barrelRot = getMovementVisualAsset('original-barrel-standing-rotation')!;
    expect(barrelRot.archetypeId).toBe('barrel-standing-rotation-isolated');
    expect(barrelRot.phases.middle.joints.heel).toEqual(barrelRot.phases.start.joints.heel);

    const cadillacPunch = getMovementVisualAsset('ex-upper-03')!;
    expect(cadillacPunch.archetypeId).toBe('cadillac-standing-punch-press-isolated');
    expect(cadillacPunch.phases.middle.joints.heel).toEqual(cadillacPunch.phases.start.joints.heel);
    expect(cadillacPunch.phases.middle.joints.hand.x).toBeGreaterThan(
      cadillacPunch.phases.start.joints.hand.x + 40,
    );

    // SM-03: Supine pelvic clock (stationary arms on mat/table) vs supine arm arc
    for (const id of ['original-mat-pelvic-clock', 'original-cadillac-pelvic-rock'] as const) {
      const pelvicClock = getMovementVisualAsset(id)!;
      expect(pelvicClock.archetypeId).toBe('supine-pelvic-clock-isolated');
      expect(pelvicClock.phases.middle.joints.hand).toEqual(pelvicClock.phases.start.joints.hand);
      expect(pelvicClock.phases.middle.joints.lumbar.y).not.toBe(
        pelvicClock.phases.start.joints.lumbar.y,
      );
    }

    // SM-04: Chair sit-to-stand & Reformer standing side splits vs Scooter
    const sitToStand = getMovementVisualAsset('original-chair-sit-to-stand')!;
    expect(sitToStand.archetypeId).toBe('chair-sit-to-stand-isolated');
    expect(sitToStand.phases.start.joints.pelvis).toEqual({ x: 136, y: 108 });
    expect(sitToStand.phases.middle.joints.pelvis).toEqual({ x: 178, y: 102 });
    expect(sitToStand.phases.middle.joints.ankle).toEqual(sitToStand.phases.start.joints.ankle);

    const sideSplits = getMovementVisualAsset('ex-lower-02')!;
    expect(sideSplits.archetypeId).toBe('reformer-standing-side-splits-isolated');
    expect(sideSplits.phases.middle.joints.farAnkle).toEqual({ x: 214, y: 138 });
    expect(sideSplits.phases.middle.joints.ankle.x).toBeLessThan(
      sideSplits.phases.start.joints.ankle.x - 45,
    );
    expect(sideSplits.phases.middle.apparatusState.carriageOffsetPx).toBe(42);

    // SM-05: Cadillac kneeling cat stretch (anterior C-curve spinal flexion)
    const catStretch = getMovementVisualAsset('ex-warmup-02')!;
    expect(catStretch.archetypeId).toBe('cadillac-kneeling-cat-stretch-isolated');
    expect(catStretch.phases.middle.joints.head.x).toBeGreaterThan(
      catStretch.phases.start.joints.head.x + 40,
    );
    expect(catStretch.phases.middle.joints.hand.x).toBeGreaterThan(
      catStretch.phases.start.joints.hand.x + 25,
    );

    // SM-06: Upright seated spine twist / rotation (vertical spine x=136 without backward roll-back)
    const chairTwist = getMovementVisualAsset('original-chair-seated-spine-twist')!;
    const cadillacTwist = getMovementVisualAsset('original-cadillac-seated-rotation')!;
    expect(chairTwist.archetypeId).toBe('chair-seated-spine-twist-isolated');
    expect(cadillacTwist.archetypeId).toBe('cadillac-seated-rotation-isolated');
    for (const twist of [chairTwist, cadillacTwist]) {
      expect(twist.phases.middle.joints.head.x).toBe(twist.phases.start.joints.head.x);
      expect(twist.phases.middle.joints.lumbar.x).toBe(twist.phases.start.joints.lumbar.x);
      expect(twist.phases.middle.joints.pelvis.x).toBe(twist.phases.start.joints.pelvis.x);
    }
  });

  it('resolves Round 5 pure breath-observation semantic, contact, spring, and muscle-fallback defects across 4 exercises x 3 phases x mirrored', () => {
    const matBreath = getMovementVisualAsset('original-mat-rib-breath')!;
    const cadillacBreath = getMovementVisualAsset('original-cadillac-table-breath')!;
    const chairBreath = getMovementVisualAsset('original-chair-seated-breath')!;
    const barrelBreath = getMovementVisualAsset('original-barrel-standing-breath')!;

    expect(matBreath.archetypeId).toBe('mat-supine-rib-breath-isolated');
    expect(cadillacBreath.archetypeId).toBe('cadillac-table-breath-isolated');
    expect(chairBreath.archetypeId).toBe('chair-seated-breath-isolated');
    expect(barrelBreath.archetypeId).toBe('barrel-standing-breath-isolated');

    // 1. Chair Seated Breath: pelvis on seat (y=108 within seat 106..115, not 138), heels on floor (y=176 near floor 178, not 148), stationary hands/heels (Δ0px)
    for (const phase of ['start', 'middle', 'end'] as const) {
      expect(chairBreath.phases[phase].joints.pelvis).toEqual({ x: 132, y: 108 });
      expect(chairBreath.phases[phase].joints.heel).toEqual({ x: 198, y: 176 });
      expect(chairBreath.phases[phase].joints.hand).toEqual({ x: 148, y: 96 });
      expect(chairBreath.phases[phase].apparatusState.pedalAngleDeg).toBe(0);
      expect(chairBreath.phases[phase].apparatusState.springTensionLevel).toBe('none');
    }

    // 2. Cadillac Table Breath: springTensionLevel === 'none' and NO hand-connected spring coil path rendered
    for (const phase of ['start', 'middle', 'end'] as const) {
      expect(cadillacBreath.phases[phase].apparatusState.springTensionLevel).toBe('none');
      expect(cadillacBreath.phases[phase].joints.pelvis).toEqual({ x: 182, y: 140 });
      expect(cadillacBreath.phases[phase].joints.heel).toEqual({ x: 248, y: 145 });
      expect(cadillacBreath.phases[phase].joints.hand).toEqual({ x: 146, y: 132 });
      for (const mirrored of [false, true]) {
        const svg = parseSvgFromMarkup(
          renderToStaticMarkup(
            <MovementPhaseDiagramSvg asset={cadillacBreath} phase={phase} mirrored={mirrored} />,
          ),
        );
        const supportPaths = svg.querySelectorAll('g[data-layer="apparatus-support"] path');
        expect(supportPaths.length).toBe(0);
      }
    }

    // 3. Barrel Standing Breath: hand on top ladder rung (88,76 within ladder x:76..96, Δ0px), heel grounded on floor (140,176, Δ0px), NO calves muscle fallback
    for (const phase of ['start', 'middle', 'end'] as const) {
      expect(barrelBreath.phases[phase].joints.hand).toEqual({ x: 88, y: 76 });
      expect(barrelBreath.phases[phase].joints.heel).toEqual({ x: 140, y: 176 });
    }
    const barrelMuscleIds = barrelBreath.primaryMuscles.map((m) => m.muscleGroupId);
    expect(barrelMuscleIds).not.toContain('calves');
    expect(barrelMuscleIds).not.toContain('shoulder-deltoid');
    expect(barrelMuscleIds).toContain('core-transversus');

    // 4. All 4 pure breath exercises: zero arm/leg excursion (hand Δ0, heel Δ0), separated support posture vs breath observation, and valid mirrored rendering
    for (const breathAsset of [matBreath, cadillacBreath, chairBreath, barrelBreath]) {
      expect(breathAsset.anatomicalAccuracyAssumed).toBe(false);
      expect(breathAsset.phases.start.summaryKo).toContain('지지 자세');
      expect(breathAsset.phases.middle.summaryKo).toContain('호흡 관찰');
      expect(breathAsset.phases.end.summaryKo).toContain('호흡 관찰');
      expect(
        Math.hypot(
          breathAsset.phases.middle.joints.hand.x - breathAsset.phases.start.joints.hand.x,
          breathAsset.phases.middle.joints.hand.y - breathAsset.phases.start.joints.hand.y,
        ),
      ).toBe(0);
      expect(
        Math.hypot(
          breathAsset.phases.middle.joints.heel.x - breathAsset.phases.start.joints.heel.x,
          breathAsset.phases.middle.joints.heel.y - breathAsset.phases.start.joints.heel.y,
        ),
      ).toBe(0);
      expect(
        Math.hypot(
          breathAsset.phases.middle.joints.thoracic.x - breathAsset.phases.start.joints.thoracic.x,
          breathAsset.phases.middle.joints.thoracic.y - breathAsset.phases.start.joints.thoracic.y,
        ),
      ).toBeGreaterThanOrEqual(6);

      for (const phase of ['start', 'middle', 'end'] as const) {
        for (const mirrored of [false, true]) {
          const svg = parseSvgFromMarkup(
            renderToStaticMarkup(
              <MovementPhaseDiagramSvg asset={breathAsset} phase={phase} mirrored={mirrored} />,
            ),
          );
          expect(svg.querySelectorAll('circle[data-joint-node]').length).toBe(7);
          if (phase !== 'start') {
            expect(svg.querySelectorAll('[data-pose-delta-vector]').length).toBeGreaterThan(0);
          }
        }
      }
    }

    // 5. Full 98-exercise muscle fallback & 294 SVG regression
    expect(MOVEMENT_VISUAL_ASSETS).toHaveLength(98);
    for (const asset of MOVEMENT_VISUAL_ASSETS) {
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(calculatePhaseJointDelta(asset).maxDeltaPx).toBeGreaterThan(0);
      for (const phase of ['start', 'middle', 'end'] as const) {
        const svg = parseSvgFromMarkup(
          renderToStaticMarkup(<MovementPhaseDiagramSvg asset={asset} phase={phase} />),
        );
        expect(svg.querySelectorAll('circle[data-joint-node]').length).toBe(7);
        if (
          phase !== 'start' &&
          asset.exerciseId !== 'original-mat-clam' &&
          asset.exerciseId !== 'original-mat-open-book'
        ) {
          expect(svg.querySelectorAll('[data-pose-delta-vector]').length).toBeGreaterThan(0);
        }
      }
    }
  });
});

