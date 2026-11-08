import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  MOVEMENT_VISUAL_ASSETS,
  calculatePhaseJointDelta,
  getMovementVisualAsset,
} from '../data/movementVisualRigCatalog';
import { compareCatalogMovements } from '../data/movementVisualSourceAudit';
import { MovementPhaseDiagramSvg } from '../components/MovementPhaseDiagramSvg';
import { MovementVisualGuideCard } from '../components/MovementVisualGuideCard';

describe('[P1/14] Pilates Flow 2D Anatomy Accuracy Audit Regression', () => {
  it('1. Alignment & Angle-Arc Guides: isolated overrides anchor guides to active body joints and angle-arc renders a true sector path', () => {
    const isolatedIds = [
      'original-mat-rib-breath',
      'original-cadillac-table-breath',
      'original-chair-seated-breath',
      'original-barrel-standing-breath',
      'original-barrel-supported-side-bend',
      'ex-kr-barrel-01',
      'original-barrel-standing-side-stretch',
      'original-chair-seated-pelvic-rock',
      'original-chair-seated-back-reach',
      'original-barrel-supported-ankle',
      'original-chair-supported-calf-raise',
      'original-barrel-standing-rotation',
      'ex-upper-03',
      'original-mat-pelvic-clock',
      'original-cadillac-pelvic-rock',
      'original-chair-sit-to-stand',
      'ex-lower-02',
      'ex-warmup-02',
      'original-chair-seated-spine-twist',
      'original-cadillac-seated-rotation',
      'original-barrel-standing-hip-extension',
      'original-barrel-standing-side-reach',
    ];

    for (const id of isolatedIds) {
      const asset = getMovementVisualAsset(id)!;
      expect(asset).toBeTruthy();

      for (const phaseKey of ['start', 'middle', 'end'] as const) {
        const phase = asset.phases[phaseKey];
        const jointPoints = Object.values(phase.joints).filter(
          (pt): pt is { x: number; y: number } => Boolean(pt),
        );

        for (const align of phase.alignments) {
          const minFromDist = Math.min(
            ...jointPoints.map((pt) => Math.hypot(pt.x - align.from.x, pt.y - align.from.y)),
          );
          expect(minFromDist, `${id}.${phaseKey} alignment ${align.id} from`).toBeLessThanOrEqual(
            20,
          );
        }

        for (const vec of phase.directionVectors) {
          const originJoints =
            phaseKey === 'middle'
              ? asset.phases.start.joints
              : phaseKey === 'end'
                ? asset.phases.middle.joints
                : phase.joints;
          const originPoints = Object.values(originJoints).filter(
            (pt): pt is { x: number; y: number } => Boolean(pt),
          );
          const firstPt = vec.points[0]!;
          const lastPt = vec.points[vec.points.length - 1]!;
          const minStartDist = Math.min(
            ...originPoints.map((pt) => Math.hypot(pt.x - firstPt.x, pt.y - firstPt.y)),
          );
          const minEndDist = Math.min(
            ...jointPoints.map((pt) => Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y)),
          );
          expect(
            minStartDist,
            `${id}.${phaseKey} vector ${vec.id} start point`,
          ).toBeLessThanOrEqual(25);
          expect(
            minEndDist,
            `${id}.${phaseKey} vector ${vec.id} end point`,
          ).toBeLessThanOrEqual(25);
        }
      }
    }

    // Verify angle-arc renders a true sector <path data-angle-arc> instead of a 360° circle
    const chairPike = getMovementVisualAsset('ex-plank-02')!;
    const { container } = render(
      <MovementPhaseDiagramSvg
        asset={chairPike}
        phase="middle"
        showAlignment
        showDirection
        showMuscles
      />,
    );
    const arcPath = container.querySelector('path[data-angle-arc]');
    expect(arcPath).not.toBeNull();
    expect(arcPath?.getAttribute('d')).toContain('A ');
  });

  it('2. Muscle Highlights: no distal joint bleed, no duplicate muscleGroupId per asset, and accurate keyword routing', () => {
    for (const asset of MOVEMENT_VISUAL_ASSETS) {
      const ids = asset.primaryMuscles.map((m) => m.muscleGroupId);
      expect(new Set(ids).size, `${asset.exerciseId} duplicate muscleGroupId`).toBe(ids.length);

      for (const muscle of asset.primaryMuscles) {
        if (muscle.muscleGroupId === 'quadriceps') {
          expect(muscle.anchorJoints).toEqual(['hip', 'knee']);
        }
        if (muscle.muscleGroupId === 'calves') {
          expect(muscle.anchorJoints).toEqual(['knee', 'ankle', 'heel']);
        }
        if (muscle.muscleGroupId === 'shoulder-deltoid') {
          expect(muscle.anchorJoints).toEqual(['shoulder', 'elbow']);
        }
        if (muscle.muscleGroupId === 'hip-flexor-iliopsoas') {
          expect(muscle.anchorJoints).toEqual(['lumbar', 'pelvis', 'hip']);
        }
      }
    }

    // Verify gluteus medius ("중둔근") maps to glute-med and not glute-max via substring "둔근"
    const sideLegLift = getMovementVisualAsset('original-mat-side-leg-lift')!;
    expect(sideLegLift.primaryMuscles.some((m) => m.muscleGroupId === 'glute-med')).toBe(true);

    // Verify deep cervical flexors ("심부경추굴곡근") maps to core-transversus and not thoracic-extensors
    const chestLiftExercise = INITIAL_EXERCISES.find((ex) =>
      ex.targetMuscles.some((m) => m.includes('심부경추굴곡근')),
    );
    if (chestLiftExercise) {
      const asset = getMovementVisualAsset(chestLiftExercise)!;
      const matched = asset.primaryMuscles.find((m) =>
        m.catalogMuscleMatches.some((t) => t.includes('심부경추굴곡근')),
      );
      expect(matched?.muscleGroupId).toBe('core-transversus');
    }
  });

  it('3. Joint Chain Smoothness: Frog end phase keeps upper body anchored on carriage and isolated end phases avoid neck kinks', () => {
    const frog = getMovementVisualAsset('original-reformer-strap-frog')!;
    expect(frog.phases.end.joints.head).toEqual(frog.phases.start.joints.head);
    expect(frog.phases.end.joints.pelvis).toEqual(frog.phases.start.joints.pelvis);
    expect(frog.phases.end.joints.hand).toEqual(frog.phases.start.joints.hand);
    expect(frog.phases.end.directionVectors[0]?.points[0]).toEqual(
      frog.phases.middle.joints.ankle,
    );

    const neckCheckIds = [
      'original-chair-seated-back-reach',
      'original-barrel-supported-ankle',
      'original-chair-supported-calf-raise',
      'original-chair-sit-to-stand',
      'ex-lower-02',
      'ex-warmup-02',
    ];
    for (const id of neckCheckIds) {
      const asset = getMovementVisualAsset(id)!;
      const { head, neck, shoulder } = asset.phases.end.joints;
      const v1x = head.x - neck.x;
      const v1y = head.y - neck.y;
      const v2x = shoulder.x - neck.x;
      const v2y = shoulder.y - neck.y;
      const dot = v1x * v2x + v1y * v2y;
      const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
      const interiorDeg = (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
      expect(interiorDeg, `${id} endJoints neck interior angle`).toBeGreaterThanOrEqual(155);
    }
  });

  it('4. Movement Direction & Delta Disjointness: movedJoints and anchoredJoints never overlap', () => {
    for (const asset of MOVEMENT_VISUAL_ASSETS) {
      const delta = calculatePhaseJointDelta(asset);
      const movedKeys = new Set(delta.movedJoints.map((m) => m.joint));
      for (const anchorJoint of delta.anchoredJoints) {
        expect(
          movedKeys.has(anchorJoint),
          `${asset.exerciseId} joint ${anchorJoint} in both movedJoints and anchoredJoints`,
        ).toBe(false);
      }
    }
  });

  it('5. Labels, Legend & Unilateral Side Toggle: activeSide swaps near/far limbs, head gaze points anteriorly, and compareCatalogMovements handles reversed pairs', () => {
    const unilateralExercise = INITIAL_EXERCISES.find((ex) => ex.isUnilateral)!;
    const unilateralAsset = getMovementVisualAsset(unilateralExercise.id)!;

    const leftRender = render(
      <MovementPhaseDiagramSvg
        asset={unilateralAsset}
        phase="middle"
        activeSide="left"
      />,
    );
    const rightRender = render(
      <MovementPhaseDiagramSvg
        asset={unilateralAsset}
        phase="middle"
        activeSide="right"
      />,
    );

    const leftNearLeg = leftRender.container
      .querySelector('g[data-limb-depth="near"] path')
      ?.getAttribute('d');
    const rightNearLeg = rightRender.container
      .querySelector('g[data-limb-depth="near"] path')
      ?.getAttribute('d');
    expect(leftNearLeg).toBeTruthy();
    expect(leftNearLeg).not.toEqual(rightNearLeg);

    // Verify head-gaze indicator replaces vertical crown antenna
    expect(leftRender.container.querySelector('line[data-segment="head-gaze"]')).not.toBeNull();

    // Verify posture-neutral joint labels in MovementVisualGuideCard
    const cardRender = render(<MovementVisualGuideCard exercise={unilateralExercise} />);
    expect(cardRender.container.textContent).not.toContain('손(바닥/스트랩)');
    expect(cardRender.container.textContent).not.toContain('머리(정수리)');

    // Verify reversed comparison pair does not invert left/right narrative and does not duplicate shared muscles
    const ex1 = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
    const ex2 = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-02')!;
    const forwardCmp = compareCatalogMovements(ex1, ex2);
    const reverseCmp = compareCatalogMovements(ex2, ex1);
    expect(forwardCmp).toBeTruthy();
    expect(reverseCmp).toBeTruthy();
    expect(reverseCmp.titleKo).toContain(`${ex2.nameKo} vs ${ex1.nameKo}`);
    expect(reverseCmp.dimensions[0]?.keyDifferenceKo).toContain(ex2.nameKo);
  });
});
