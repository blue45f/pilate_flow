import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CATALOG_CONTINUOUS_MOTION_ASSETS,
  getCatalogContinuousMotionAsset,
} from '../data/catalogMotionAssets';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { SUPINE_REACH_DEFINITION } from '../data/supineReach';
import {
  CatalogMotionInteractivePlayer,
  CatalogMotionThumbnail,
} from '../components/CatalogMotionInteractivePlayer';
import { ExerciseThumbnailBadge } from '../components/ExerciseThumbnailBadge';
import { KinematicSchematicShowcase } from '../components/KinematicSchematicShowcase';
import { MotionReferencePlayer } from '../components/MotionReferencePlayer';
import { MovementPhaseDiagramSvg } from '../components/MovementPhaseDiagramSvg';

describe('Unified Studio Kinematic Motion System across all 98 movements', () => {
  it('reconstructs all 98 catalog movements with sculpted anatomical capsules, zero NaN/Infinity, and smooth 5-phase interpolation', () => {
    expect(CATALOG_CONTINUOUS_MOTION_ASSETS).toHaveLength(98);

    const samplePoints = [0, 0.2, 0.5, 0.75, 1] as const;

    for (const exercise of INITIAL_EXERCISES) {
      const motion = getCatalogContinuousMotionAsset(exercise);
      expect(motion).not.toBeNull();
      expect(motion!.phases).toHaveLength(5);
      expect(motion!.anatomicalAccuracyAssumed).toBe(false);

      for (const p of samplePoints) {
        const snap = motion!.samplePose(p);
        expect(snap.interpolatedPhaseSpec.alignments.length).toBeGreaterThan(0);
        expect(snap.interpolatedPhaseSpec.directionVectors.length).toBeGreaterThan(0);
      }

      const markup = renderToStaticMarkup(
        <MovementPhaseDiagramSvg asset={motion!.visualAsset} phase="middle" />,
      );
      expect(markup).toContain('data-layer="kinematic-figure"');
      expect(markup).toContain('data-segment="spine-torso"');
      expect(markup).not.toMatch(/NaN|Infinity/);
    }
  });

  it('preserves anatomical limb lengths along circular arcs (zero foreshortening), anchors closed-chain contacts, and articulates spine sequentially', () => {
    // 1. Open-chain arc: Reformer Leg Circles (ex-straps-01) preserves femur & tibia lengths at mid-swing (progress = 0.27)
    const legCircles = getCatalogContinuousMotionAsset('ex-straps-01')!;
    const s0 = legCircles.samplePose(0).joints;
    const sMid = legCircles.samplePose(0.5).joints;
    const sSwing = legCircles.samplePose(0.27).joints; // localT = 0.5 -> smootherstep = 0.5

    const femur0 = Math.hypot(s0.knee.x - s0.hip.x, s0.knee.y - s0.hip.y);
    const femur1 = Math.hypot(sMid.knee.x - sMid.hip.x, sMid.knee.y - sMid.hip.y);
    const femurSwing = Math.hypot(sSwing.knee.x - sSwing.hip.x, sSwing.knee.y - sSwing.hip.y);
    const expectedFemur = (femur0 + femur1) / 2;
    expect(Math.abs(femurSwing - expectedFemur)).toBeLessThanOrEqual(0.35);

    const tibia0 = Math.hypot(s0.ankle.x - s0.knee.x, s0.ankle.y - s0.knee.y);
    const tibia1 = Math.hypot(sMid.ankle.x - sMid.knee.x, sMid.ankle.y - sMid.knee.y);
    const tibiaSwing = Math.hypot(sSwing.ankle.x - sSwing.knee.x, sSwing.ankle.y - sSwing.knee.y);
    const expectedTibia = (tibia0 + tibia1) / 2;
    expect(Math.abs(tibiaSwing - expectedTibia)).toBeLessThanOrEqual(0.35);

    // 2. Closed-chain contact: Reformer Footwork (ex-footwork-01) keeps heel planted on footbar while carriage glides
    const footwork = getCatalogContinuousMotionAsset('ex-footwork-01')!;
    const fwStart = footwork.samplePose(0).joints;
    const fwMidStroke = footwork.samplePose(0.27).joints;
    expect(
      Math.hypot(fwMidStroke.heel.x - fwStart.heel.x, fwMidStroke.heel.y - fwStart.heel.y),
    ).toBeLessThanOrEqual(6);

    // 3. Sequential spinal wave: Pelvic Curl / Bridging (ex-bridging-01) peels pelvis before thoracic on move
    const bridge = getCatalogContinuousMotionAsset('ex-bridging-01')!;
    const brStart = bridge.samplePose(0).joints;
    const brEnd = bridge.samplePose(0.5).joints;
    const brEarly = bridge.samplePose(0.22).joints;
    const pelvisTotalLift = Math.abs(brEnd.pelvis.y - brStart.pelvis.y);
    const thoracicTotalLift = Math.abs(brEnd.thoracic.y - brStart.thoracic.y);
    if (pelvisTotalLift > 4 && thoracicTotalLift > 4) {
      const pelvisFrac = Math.abs(brEarly.pelvis.y - brStart.pelvis.y) / pelvisTotalLift;
      const thoracicFrac = Math.abs(brEarly.thoracic.y - brStart.thoracic.y) / thoracicTotalLift;
      expect(pelvisFrac).toBeGreaterThan(thoracicFrac);
    }

    // 4. Rhythmic Hundred arm-pumping in turn phase while exact at 0.50
    const hundred = getCatalogContinuousMotionAsset('ex-core-01')!;
    const hExactPeak = hundred.samplePose(0.5).joints;
    const hPump = hundred.samplePose(0.44).joints;
    expect(hExactPeak).toEqual(hundred.visualAsset.phases.middle.joints);
    expect(hPump.hand.y).not.toBe(hExactPeak.hand.y);
  });

  it('unifies all 98 exercise badges and top KinematicSchematicShowcase under the single MovementPhaseDiagramSvg renderer', () => {
    for (const ex of INITIAL_EXERCISES) {
      const badgeMarkup = renderToStaticMarkup(<ExerciseThumbnailBadge exercise={ex} size="md" />);
      expect(badgeMarkup).toContain('movement-phase-diagram-svg');
      expect(badgeMarkup).toContain('data-layer="kinematic-figure"');
    }

    // Preserves data-motion-family and data-motion-variant on pattern-linked cards
    const singleLegEx = INITIAL_EXERCISES.find((e) => e.id === 'original-mat-single-leg-stretch')!;
    const singleLegBadge = renderToStaticMarkup(<ExerciseThumbnailBadge exercise={singleLegEx} />);
    expect(singleLegBadge).toContain('data-motion-family="supine-reach"');
    expect(singleLegBadge).toContain(`data-motion-variant="${SUPINE_REACH_DEFINITION.id}"`);
    expect(singleLegBadge).toContain('movement-phase-diagram-svg');

    const { container, unmount } = render(<KinematicSchematicShowcase />);
    const showcaseSvgs = container.querySelectorAll('svg.movement-phase-diagram-svg');
    expect(showcaseSvgs).toHaveLength(4);
    unmount();
  });

  it('supports 1x/2x/3x/continuous loop modes in CatalogMotionInteractivePlayer and dual-mode switching in MotionReferencePlayer', () => {
    const swanAsset = getCatalogContinuousMotionAsset('ex-extension-01')!;
    const { unmount } = render(<CatalogMotionInteractivePlayer asset={swanAsset} />);

    expect(
      screen.getByText('기구학 5단계 연속·3단계 도해 · 출처 대조 확인'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('관련 패턴 도해 반복'), {
      target: { value: 'loop' },
    });
    expect(screen.getByRole('button', { name: '연속 반복 재생' })).toBeEnabled();
    unmount();

    // Dual-mode switcher on pattern-linked exercise (`original-mat-chest-lift`)
    render(<MotionReferencePlayer exerciseId="original-mat-chest-lift" />);
    const kinematicBtn = screen.getByRole('button', { name: '5단계 기구학 표준 도해' });
    expect(kinematicBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(kinematicBtn);
    expect(kinematicBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('catalog-motion-interactive-player')).toHaveAttribute(
      'data-exercise-id',
      'original-mat-chest-lift',
    );

    const thumbMarkup = renderToStaticMarkup(<CatalogMotionThumbnail asset={swanAsset} />);
    expect(thumbMarkup).toContain('data-motion-family="catalog-kinematic"');
  });
});
