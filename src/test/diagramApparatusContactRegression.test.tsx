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
    for (const id of [
      'original-barrel-standing-hip-extension',
      'original-barrel-standing-side-reach',
    ] as const) {
      const barrelStanding = getMovementVisualAsset(id)!;
      expect(barrelStanding.archetypeId).toBe('barrel-standing-hip-extension-isolated');
      expect(barrelStanding.phases.start.joints.hand).toEqual({ x: 88, y: 76 });
      expect(barrelStanding.phases.middle.joints.hand).toEqual({ x: 88, y: 76 });
      expect(barrelStanding.phases.middle.joints.farAnkle).toEqual({ x: 138, y: 172 });
      expect(barrelStanding.phases.middle.joints.ankle).toEqual({ x: 222, y: 148 });
      expect(calculatePhaseJointDelta(barrelStanding).maxDeltaPx).toBeGreaterThan(0);

      const triptychMarkup = renderToStaticMarkup(
        <MovementTriptychDiagramSvg asset={barrelStanding} />,
      );
      expect(triptychMarkup).toContain('data-testid="movement-triptych-diagram"');
    }
  });
});
