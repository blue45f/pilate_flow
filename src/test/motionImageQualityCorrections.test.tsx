import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MovementPhaseDiagramSvg } from '../components/MovementPhaseDiagramSvg';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { MOTION_IMAGE_QUALITY_CORRECTIONS } from '../data/motionImageQualityCorrections';
import { getMovementVisualAsset, type CatalogMovementVisualAsset } from '../data/movementVisualRigCatalog';

function svgFor(asset: CatalogMovementVisualAsset, phase: 'start' | 'middle' | 'end', mirrored = false) {
  return new DOMParser().parseFromString(renderToStaticMarkup(
    <MovementPhaseDiagramSvg asset={asset} phase={phase} mirrored={mirrored} showAlignment={false} showDirection={false} showMuscles={false} showGhostStartPose={false} />,
  ), 'text/html').querySelector('svg')!;
}

describe('source-text motion image corrections', () => {
  it('shows a forward arm and opposite leg reach for swimming preparation, with a stable trunk and full return', () => {
    const swim = getMovementVisualAsset('original-mat-swimming-prep')!;
    const swan = getMovementVisualAsset('original-mat-swan-prep')!;
    expect(swim.archetypeId).toBe('mat-swimming-contralateral-prep');
    expect(swim.archetypeId).not.toBe(swan.archetypeId);
    const { start, middle, end } = swim.phases;
    expect(middle.joints.hand.x).toBeLessThan(middle.joints.shoulder.x - 50);
    expect(middle.joints.hand.y).toBeLessThan(start.joints.hand.y - 20);
    expect(middle.joints.farAnkle!.y).toBeLessThan(start.joints.farAnkle!.y - 20);
    for (const joint of ['head', 'neck', 'thoracic', 'lumbar', 'pelvis', 'ankle', 'farWrist'] as const) {
      expect(middle.joints[joint], `${joint} must remain supported/stable`).toEqual(start.joints[joint]);
    }
    expect(end.joints).toEqual(start.joints);
    expect(middle.movingJoints).toContain('farAnkle');
    expect(middle.movingJoints).not.toContain('ankle');
  });

  it('keeps both feet fixed and translates the supported body with the carriage throughout each footwork cycle', () => {
    for (const id of ['original-reformer-parallel-footwork', 'ex-footwork-01', 'ex-footwork-02', 'ex-kr-reformer-01']) {
      const motion = getCatalogContinuousMotionAsset(id)!;
      const initial = motion.samplePose(0);
      for (let frame = 0; frame <= 60; frame += 1) {
        const sample = motion.samplePose(frame / 60);
        for (const joint of ['heel', 'toe', 'ankle', 'farAnkle', 'farToe'] as const) {
          expect(sample.joints[joint], `${id}: no ${joint} slip at frame ${frame}`).toEqual(initial.joints[joint]);
        }
        const travel = sample.interpolatedPhaseSpec.apparatusState.carriageOffsetPx;
        for (const joint of ['head', 'shoulder', 'pelvis', 'hip'] as const) {
          expect(Math.abs(sample.joints[joint].x + travel - initial.joints[joint].x)).toBeLessThanOrEqual(0.11);
        }
      }
      expect(motion.samplePose(1).joints).toEqual(initial.joints);
    }
  });

  it('draws the moving cushion beneath the same body points and draws the heel on the fixed bar, including mirrored intermediate frames', () => {
    const motion = getCatalogContinuousMotionAsset('original-reformer-parallel-footwork')!;
    for (const mirrored of [false, true]) {
      let headOffset: number | undefined;
      for (const progress of [0, 0.27, 0.5, 0.73, 1]) {
        const sample = motion.samplePose(progress);
        const sampledAsset = {
          ...motion.visualAsset,
          phases: { ...motion.visualAsset.phases, [sample.visualPhaseId]: sample.interpolatedPhaseSpec },
        };
        const svg = svgFor(sampledAsset, sample.visualPhaseId, mirrored);
        const carriage = svg.querySelector('[data-reformer-carriage]')!;
        const footbar = svg.querySelector('[data-reformer-footbar-contact]')!;
        const px = (x: number) => mirrored ? 320 - x : x;
        expect(Number(footbar.getAttribute('cx'))).toBe(px(sample.joints.heel.x));
        expect(Number(footbar.getAttribute('cy'))).toBe(sample.joints.heel.y);
        const nextOffset = px(sample.joints.head.x) - Number(carriage.getAttribute('x'));
        if (headOffset === undefined) headOffset = nextOffset;
        expect(Math.abs(nextOffset - headOffset)).toBeLessThanOrEqual(0.11);
        expect(svg.getAttribute('viewBox')).toBe('0 0 320 200');
      }
    }
  });

  it('keeps the character head size fixed while interpolated chest and seated curls change trunk shape', () => {
    for (const id of ['original-mat-chest-lift', 'ex-core-02']) {
      const motion = getCatalogContinuousMotionAsset(id)!;
      const reference = svgFor(motion.visualAsset, 'start').querySelector('[data-segment="spine-torso"] ellipse')!;
      for (const progress of [0.13, 0.27, 0.41, 0.59, 0.73, 0.87]) {
        const sample = motion.samplePose(progress);
        const sampledAsset = {
          ...motion.visualAsset,
          phases: { ...motion.visualAsset.phases, [sample.visualPhaseId]: sample.interpolatedPhaseSpec },
        };
        const head = svgFor(sampledAsset, sample.visualPhaseId).querySelector('[data-segment="spine-torso"] ellipse')!;
        expect(head.getAttribute('rx'), `${id} head width at ${progress}`).toBe(reference.getAttribute('rx'));
        expect(head.getAttribute('ry'), `${id} head height at ${progress}`).toBe(reference.getAttribute('ry'));
      }
    }
  });

  it('retains the chest-lift/short-box isolation and makes the source-comparison limits explicit', () => {
    expect(getMovementVisualAsset('original-mat-chest-lift')!.archetypeId).toBe('mat-chest-lift-supported-head');
    expect(getMovementVisualAsset('ex-core-02')!.archetypeId).toBe('reformer-short-box-supported-roll-back');
    for (const [id, correction] of Object.entries(MOTION_IMAGE_QUALITY_CORRECTIONS)) {
      expect(correction.archetypeId).toBe(getMovementVisualAsset(id)!.archetypeId);
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.sources[0].url).toMatch(/^https:\/\//);
      expect(correction.limitationKo).toContain('자체 제작');
      expect(getMovementVisualAsset(id)!.anatomicalAccuracyAssumed).toBe(false);
    }
    expect(MOTION_IMAGE_QUALITY_CORRECTIONS['original-mat-chest-lift'].sources[0].url)
      .toBe('https://us.physitrack.com/home-exercise-video/pilates-chest-lift');
    expect(MOTION_IMAGE_QUALITY_CORRECTIONS['ex-core-02'].reviewedScopeKo).toContain('메타데이터');
  });
});
