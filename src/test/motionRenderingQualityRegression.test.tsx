import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MovementPhaseDiagramSvg } from '../components/MovementPhaseDiagramSvg';
import { getMovementVisualAsset, type VisualPhaseId } from '../data/movementVisualRigCatalog';

const affectedFootIds = [
  'original-cadillac-table-ankle',
  'original-mat-heel-slide',
  'original-cadillac-table-knee-fold',
  'original-mat-knee-fold',
  'original-mat-side-leg-lift',
  'ex-kr-reformer-04',
];
const phases: VisualPhaseId[] = ['start', 'middle', 'end'];

function diagram(id: string, phase: VisualPhaseId, mirrored = false, activeSide: 'left' | 'right' = 'right') {
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(<MovementPhaseDiagramSvg
    asset={getMovementVisualAsset(id)!} phase={phase} mirrored={mirrored}
    activeSide={activeSide} showAlignment={false} showGhostStartPose={false}
  />);
  return node;
}
function point(value: string | null) {
  return value!.split(',').map(Number);
}

describe('rendered motion quality regressions', () => {
  it.each(affectedFootIds)('%s keeps both feet attached to their own ankles in every static view', (id) => {
    for (const phase of phases) for (const mirrored of [false, true]) for (const side of ['left', 'right'] as const) {
      const feet = diagram(id, phase, mirrored, side).querySelectorAll('[data-segment="foot-contour"]');
      expect(feet).toHaveLength(2);
      for (const foot of feet) {
        const [ax, ay] = point(foot.getAttribute('data-foot-ankle'));
        const [hx, hy] = point(foot.getAttribute('data-foot-heel'));
        const [tx, ty] = point(foot.getAttribute('data-foot-toe'));
        expect(Math.hypot(tx - ax, ty - ay), `${id}/${phase}/${side}`).toBeLessThan(32);
        expect(Math.hypot(hx - ax, hy - ay), `${id}/${phase}/${side}`).toBeLessThan(18);
        expect(foot.getAttribute('d')).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('mirrors each complete foot, including a derived far heel, without changing its shape', () => {
    const normal = diagram('original-mat-knee-fold', 'middle').querySelectorAll('[data-segment="foot-contour"]');
    const mirror = diagram('original-mat-knee-fold', 'middle', true).querySelectorAll('[data-segment="foot-contour"]');
    for (let index = 0; index < 2; index++) for (const attr of ['data-foot-ankle', 'data-foot-heel', 'data-foot-toe']) {
      const [x, y] = point(normal[index].getAttribute(attr));
      const [mx, my] = point(mirror[index].getAttribute(attr));
      expect(x + mx).toBeCloseTo(320, 1);
      expect(y).toBeCloseTo(my, 1);
    }
  });

  it.each(['ex-straps-02', 'ex-kr-cadillac-02'])('%s connects leg springs to the elevated ankle', (id) => {
    const asset = getMovementVisualAsset(id)!;
    for (const phase of phases) {
      const spring = diagram(id, phase).querySelector('[data-attachment="cadillac-spring"]');
      const { x, y } = asset.phases[phase].joints.ankle;
      expect(spring).toHaveAttribute('data-attachment-target', 'ankle');
      expect(spring!.getAttribute('d')).toMatch(new RegExp(`L ${x} ${y}$`));
    }
  });

  it('uses an ankle attachment for the side-lying reformer strap', () => {
    const strap = diagram('ex-lower-04', 'middle').querySelector('[data-attachment="reformer-strap"]');
    expect(strap).toHaveAttribute('data-attachment-target', 'ankle');
    const ankle = getMovementVisualAsset('ex-lower-04')!.phases.middle.joints.ankle;
    expect(Number(strap!.getAttribute('x2'))).toBe(ankle.x);
    expect(Number(strap!.getAttribute('y2'))).toBe(ankle.y);
  });

  it('renders a band anchored around the feet and a longitudinal roller under the spine', () => {
    const band = diagram('original-mat-band-row', 'middle');
    expect(band.querySelector('[data-prop-model="theraband"]')).toHaveAttribute('data-prop-placement', 'feet-to-hands');
    const roller = diagram('ex-warmup-03', 'middle');
    expect(roller.querySelector('[data-prop-model="foam-roller"]')).toHaveAttribute('data-prop-placement', 'longitudinal-spine');
    expect(roller.querySelector('[data-layer="apparatus-support"] circle[stroke-dasharray]')).toBeNull();
  });

  it('does not draw a mat across the legs of a standing roll-down', () => {
    const support = diagram('ex-cooldown-02', 'middle').querySelector('[data-layer="apparatus-support"]');
    expect(support!.querySelector('rect[y="147.5"]')).toBeNull();
  });
});
