import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../components/MovementPhaseDiagramSvg';
import {
  RotationDraftFigure,
  RotationPhaseTriptych,
} from '../components/RotationDraftFigure';
import rotationSourceFacts from '../data/rotationSourceFacts.json';
import {
  getRotationDiagramCorrection,
  getRotationI7IntegrationBundle,
  getRotationVisualAsset,
  getRotationVisualAssetByCatalogExerciseId,
  ROTATION_CATALOG_EXERCISE_BINDINGS,
  ROTATION_DIAGRAM_CORRECTIONS,
  ROTATION_PATTERN_REFERENCES,
  ROTATION_VISUAL_ASSETS,
} from '../data/rotationDiagramData';
import {
  isRotationDiagramExercise,
  resolveRotationDiagramCandidate,
  toRotationMovementPhaseDiagramProps,
  toRotationMovementTriptychProps,
} from '../features/rotationDiagramCandidate/rotationDiagramAdapters';
import {
  getRotationDiscretePose,
  getRotationDraftPose,
  getRotationKinematicTelemetry,
  resolveRotationMovementId,
  projectRotationPoint,
  ROTATION_MOVEMENT_IDS,
} from '../models/rotationDrafts';

describe('Track I8 Pilates Rotation 2D Diagrams (Saw, Spine Twist, Criss-Cross)', () => {
  it('enforces truthfulness disclosures and bounded public text source comparisons', () => {
    expect(rotationSourceFacts.anatomicalAccuracyAssumed).toBe(false);
    expect(rotationSourceFacts.professionalReviewCount).toBe(0);
    expect(rotationSourceFacts.sourceFrameMappings).toBe(0);
    expect(rotationSourceFacts.rights.sourceMediaCopied).toBe(false);
    expect(rotationSourceFacts.rights.sourceMediaTraced).toBe(false);
    expect(rotationSourceFacts.sources.length).toBeGreaterThanOrEqual(3);

    for (const movementId of ROTATION_MOVEMENT_IDS) {
      const pose = getRotationDiscretePose(movementId, 'middle');
      expect(pose.provenance.anatomicalAccuracyAssumed).toBe(false);
      expect(pose.provenance.professionalReviewCount).toBe(0);
      expect(pose.provenance.sourceFrameMappings).toBe(0);
      expect(pose.provenance.sourceMediaCopiedOrTraced).toBe(false);
    }
  });

  it('preserves stationary sit-bone and pelvis anchor invariance (pelvisShiftMm === 0) and equal heel X in Spine Twist', () => {
    const samples = [0, 0.15, 0.28, 0.5, 0.78, 1];
    for (const movementId of ROTATION_MOVEMENT_IDS) {
      const startPose = getRotationDraftPose(movementId, 0);
      for (const p of samples) {
        const pose = getRotationDraftPose(movementId, p);
        const telemetry = getRotationKinematicTelemetry(pose);
        expect(telemetry.pelvisShiftMm).toBe(0);
        expect(telemetry.sitBoneLiftMm).toBe(0);
        expect(pose.world.pelvis).toEqual(startPose.world.pelvis);
        expect(pose.world.leftSitBone).toEqual(startPose.world.leftSitBone);
        expect(pose.world.rightSitBone).toEqual(startPose.world.rightSitBone);
        expect(pose.joints2D.pelvis).toEqual(startPose.joints2D.pelvis);

        if (movementId === 'rotation-mat-spine-twist') {
          expect(telemetry.heelAlignmentDeltaMm).toBe(0);
          expect(telemetry.leftHeelX).toBe(telemetry.rightHeelX);
          expect(pose.world.leftHeel[0]).toBe(pose.world.rightHeel[0]);
          // Pure vertical axis: crown X matches pelvis X (zero backward C-curve roll-back)
          expect(pose.joints2D.head.x).toBe(pose.joints2D.pelvis.x);
          expect(telemetry.coronalArmLockDeg).toBe(180);
          expect(telemetry.independentArmSwingDeg).toBe(0);
          expect(telemetry.gazeSternumCouplingDeg).toBe(0);
        }
      }
    }
  });

  it('produces genuine 2D bilateral shoulder foreshortening (shoulderSpan2D < restShoulderSpan) as yawDeg increases', () => {
    for (const movementId of ROTATION_MOVEMENT_IDS) {
      for (const activeSide of ['right', 'left'] as const) {
        const startTel = getRotationKinematicTelemetry(movementId, 'start', { activeSide });
        const midTel = getRotationKinematicTelemetry(movementId, 'middle', { activeSide });
        const endTel = getRotationKinematicTelemetry(movementId, 'end', { activeSide });

        expect(startTel.yawDeg).toBe(0);
        expect(startTel.shoulderSpan2D).toBe(startTel.restShoulderSpan);

        expect(midTel.yawDeg).toBeGreaterThan(35);
        expect(midTel.shoulderSpan2D).toBeLessThan(midTel.restShoulderSpan);
        expect(midTel.foreshorteningRatio).toBeLessThan(0.85);

        // End phase represents controlled unwinding / restack transition before full return
        expect(endTel.yawDeg).toBeGreaterThan(0);
        expect(endTel.yawDeg).toBeLessThan(midTel.yawDeg);
        expect(endTel.shoulderSpan2D).toBeGreaterThan(midTel.shoulderSpan2D);
        expect(endTel.shoulderSpan2D).toBeLessThan(startTel.restShoulderSpan);
      }
    }
  });

  it('distinguishes Saw, Spine Twist, and Criss-Cross authored schematic kinematics', () => {
    const sawMid = getRotationDiscretePose('rotation-mat-saw', 'middle');
    const sawEnd = getRotationDiscretePose('rotation-mat-saw', 'end');
    expect(sawMid.telemetry.yawDeg).toBeGreaterThan(35);
    expect(sawMid.telemetry.flexionPitchDeg).toBeGreaterThan(25);
    // Front hand reaches past opposite foot X while rear hand reaches backward
    expect(sawMid.joints2D.hand.x).toBeGreaterThanOrEqual(sawMid.joints2D.toe.x);
    expect(sawMid.joints2D.farWrist!.x).toBeLessThan(sawMid.joints2D.pelvis.x);
    // In return/end phase, spine restacks faster than rotation unwinds
    expect(sawEnd.telemetry.flexionPitchDeg).toBeLessThan(sawMid.telemetry.flexionPitchDeg * 0.35);

    const twistMid = getRotationDiscretePose('rotation-mat-spine-twist', 'middle');
    expect(twistMid.telemetry.flexionPitchDeg).toBe(0);
    expect(twistMid.telemetry.heelAlignmentDeltaMm).toBe(0);

    const crissMid = getRotationDiscretePose('rotation-mat-criss-cross', 'middle');
    const crissEnd = getRotationDiscretePose('rotation-mat-criss-cross', 'end');
    expect(crissMid.telemetry.elbowSpanDeg).toBeGreaterThanOrEqual(165);
    expect(crissMid.telemetry.curlHeightMm).toBeGreaterThan(60);
    expect(crissMid.telemetry.extendedLegAngleDeg).toBe(45);
    expect(crissMid.telemetry.tabletopKneeAngleDeg).toBe(90);
    // Transition across center maintains upper thoracic curl height
    expect(crissEnd.telemetry.curlHeightMm).toBeGreaterThan(60);

    // Direct 3D-to-2D projection mirror symmetry check
    const unmirrored = projectRotationPoint([128, 12, 90], false);
    const mirrored = projectRotationPoint([128, 12, 90], { mirrored: true, viewportWidth: 320 });
    expect(unmirrored[0] + mirrored[0]).toBe(320);
    expect(unmirrored[1]).toBe(mirrored[1]);
  });

  it('renders RotationDraftFigure and RotationPhaseTriptych with required SVG indicator layers', () => {
    const { container } = render(
      <div>
        <RotationDraftFigure movementId="rotation-mat-saw" phase="middle" showProvenance />
        <RotationPhaseTriptych movementId="rotation-mat-criss-cross" activePhase="middle" />
      </div>,
    );

    expect(container.querySelector('[data-rotation-axis="twist-then-hinge-axis"]')).not.toBeNull();
    expect(container.querySelector('[data-pelvis-anchor="v-sit-opposite-sitbone-lock"]')).not.toBeNull();
    expect(container.querySelector('[data-gaze-vector="sternum-coupled"]')).not.toBeNull();
    expect(container.querySelector('[data-ribcage-scapula="coronal-foreshortening"]')).not.toBeNull();
    expect(container.querySelector('[data-transition-pose]')).not.toBeNull();
    expect(container.querySelector('[data-rotation-provenance="true"]')).not.toBeNull();

    const endButton = screen.getByRole('button', { name: /끝·전환 자세/ });
    fireEvent.click(endButton);
    expect(endButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not attach a mat rotation diagram to different equipment, postures or a whole series', () => {
    const excludedIds = ["ex-core-02", "original-chair-seated-spine-twist", "original-cadillac-seated-rotation", "ex-cooldown-01", "ex-warmup-02", "ex-core-03", "ex-kr-reformer-04", "original-barrel-standing-rotation", "original-mat-open-book", "seated-roll-back-spine-twist"];
    for (const id of [...excludedIds, 'unknown-exercise']) {
      expect(resolveRotationMovementId(id)).toBeNull();
      expect(isRotationDiagramExercise(id)).toBe(false);
      expect(getRotationVisualAssetByCatalogExerciseId(id)).toBeNull();
      expect(getRotationDiagramCorrection(id)).toBeNull();
      expect(resolveRotationDiagramCandidate(id)).toBeNull();
      expect(toRotationMovementPhaseDiagramProps(id)).toBeNull();
      expect(toRotationMovementTriptychProps(id)).toBeNull();
    }
  });

  it('keeps raised Criss-Cross feet out of fixed contact anchors and avoids numeric angle prescriptions', () => {
    for (const phase of ['start', 'middle', 'end'] as const) {
      const pose = getRotationVisualAsset('rotation-mat-criss-cross').phases[phase];
      expect(pose.fixedAnchors.map((anchor) => anchor.joint)).toEqual(['pelvis']);
      expect(pose.movingJoints).toContain('heel');
      expect(pose.alignments.every((guide) => guide.targetAngleDeg === undefined)).toBe(true);
    }
  });

  it('keeps actual source comparison dates and does not present a source-record hash as an asset hash', () => {
    for (const reference of ROTATION_PATTERN_REFERENCES) expect(reference.assetSha256).toBeNull();
    for (const id of ROTATION_MOVEMENT_IDS) {
      const correction = getRotationDiagramCorrection(id)!;
      expect(correction.checkedAt).toBe(rotationSourceFacts.checkedAtUtc);
      expect(correction.sources[0].url).toContain('pilatesology.com/pilatesology-encyclopedia-');
      expect(correction.reviewedScopeKo).not.toMatch(/#14|#16|1945.*Criss/);
    }
    expect(rotationSourceFacts.sources.every((source) => !('factualRecordSha256' in source))).toBe(true);
  });

  it('exports ROTATION_VISUAL_ASSETS, ROTATION_DIAGRAM_CORRECTIONS, and getRotationI7IntegrationBundle compatible with shared contracts', () => {
    const requiredIds = [
      'rotation-mat-saw',
      'rotation-mat-spine-twist',
      'rotation-mat-criss-cross',
      'seated-rotation',
      'original-mat-spine-twist',
      'ex-rotation-01',
      'original-mat-saw',
      'ex-rotation-02',
      'original-mat-criss-cross',
      'ex-rotation-03',
    ];

    const bundle = getRotationI7IntegrationBundle();
    expect(bundle.trackId).toBe('I8-rotation');
    expect(bundle.truthfulness.anatomicalAccuracyAssumed).toBe(false);
    expect(bundle.truthfulness.professionalReviewCount).toBe(0);
    expect(bundle.truthfulness.sourceFrameMappings).toBe(0);
    expect(ROTATION_PATTERN_REFERENCES).toHaveLength(3);

    for (const id of requiredIds) {
      expect(isRotationDiagramExercise(id)).toBe(true);
      expect(ROTATION_CATALOG_EXERCISE_BINDINGS[id]).toBeDefined();

      const asset = ROTATION_VISUAL_ASSETS[id];
      const correction = ROTATION_DIAGRAM_CORRECTIONS[id];
      expect(asset).toBeDefined();
      expect(correction).toBeDefined();
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.archetypeId).toBe(asset.archetypeId);
      expect(getRotationVisualAssetByCatalogExerciseId(id)).toBe(asset);
      expect(getRotationDiagramCorrection(id)).toBe(correction);

      // Verify 2D shoulder span foreshortening directly inside CatalogMovementVisualAsset phases
      const startShoulders = asset.phases.start.joints;
      const middleShoulders = asset.phases.middle.joints;
      const startSpan = Math.hypot(
        startShoulders.shoulder.x - startShoulders.farShoulder!.x,
        startShoulders.shoulder.y - startShoulders.farShoulder!.y,
      );
      const middleSpan = Math.hypot(
        middleShoulders.shoulder.x - middleShoulders.farShoulder!.x,
        middleShoulders.shoulder.y - middleShoulders.farShoulder!.y,
      );
      expect(middleSpan).toBeLessThan(startSpan);
      expect(middleShoulders.pelvis).toEqual(startShoulders.pelvis);

      const candidate = resolveRotationDiagramCandidate(id, 'middle');
      expect(candidate).not.toBeNull();
      expect(candidate!.truthfulness.anatomicalAccuracyAssumed).toBe(false);
    }

    // Render shared MovementPhaseDiagramSvg and MovementTriptychDiagramSvg with rotation asset
    const phaseProps = toRotationMovementPhaseDiagramProps('rotation-mat-spine-twist', 'middle');
    const triptychProps = toRotationMovementTriptychProps('rotation-mat-saw');
    expect(phaseProps).not.toBeNull();
    expect(triptychProps).not.toBeNull();

    const { container } = render(
      <div>
        <MovementPhaseDiagramSvg {...phaseProps!} />
        <MovementTriptychDiagramSvg
          asset={getRotationVisualAsset('rotation-mat-criss-cross')}
          selectedPhase="middle"
        />
      </div>,
    );
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(4);
  });
});
