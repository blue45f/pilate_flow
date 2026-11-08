import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  HipLegDiagramFigure,
  HipLegDiagramSvg,
  HipLegDiagramTriptychSvg,
} from '../components/hip-leg-diagram-figure';
import {
  getHipLegCatalogVisualAssets,
  getHipLegDiagramCorrections,
  HIP_LEG_CATALOG_ID_TO_MOVEMENT,
  HIP_LEG_DIAGRAM_DATA,
  HIP_LEG_I7_REGISTRY_BUNDLE,
  HIP_LEG_MOVEMENT_IDS,
  HIP_LEG_SIDE_KICK_CATALOG_IDS,
  HIP_LEG_SINGLE_LEG_CIRCLE_CATALOG_IDS,
  HIP_LEG_TRUTHFULNESS_METADATA,
  resolveHipLegCatalogVisualAsset,
  resolveHipLegDiagramCorrection,
} from '../data/hip-leg-diagram-data';
import type { RigJointMap, VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  getHipLegDiagramPose,
  HIP_LEG_SEGMENT_LENGTHS,
  mirrorHipLegPose,
  resolveHipLegMovementId,
  sampleHipLegTrajectory,
  verifyHipLegKinematicInvariants,
} from '../models/hip-leg-diagram-model';

const REQUIRED_JOINT_KEYS: readonly (keyof RigJointMap)[] = [
  'head',
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'hand',
  'thoracic',
  'lumbar',
  'pelvis',
  'hip',
  'knee',
  'ankle',
  'heel',
  'toe',
  'farShoulder',
  'farElbow',
  'farWrist',
  'farHip',
  'farKnee',
  'farAnkle',
  'farToe',
];

describe('Track I3 — Hip & Leg 2D Kinematic Diagrams (Single Leg Circle & Side Kick)', () => {
  it('enforces 241-sample rigid segment-length invariance (< 1e-6 drift) and pelvis/heel anchoring across both movements', () => {
    for (const movementId of HIP_LEG_MOVEMENT_IDS) {
      for (const activeSide of ['left', 'right'] as const) {
        for (const mirrored of [false, true] as const) {
          const report = verifyHipLegKinematicInvariants(movementId, 241, {
            activeSide,
            mirrored,
          });
          expect(report.movementId).toBe(movementId);
          expect(report.sampleCount).toBe(241);
          expect(report.maxFemurDriftPx).toBeLessThan(1e-6);
          expect(report.maxTibiaDriftPx).toBeLessThan(1e-6);
          expect(report.maxFootDriftPx).toBeLessThan(1e-6);
          expect(report.maxSupportFemurDriftPx).toBeLessThan(1e-6);
          expect(report.maxSupportTibiaDriftPx).toBeLessThan(1e-6);
          expect(report.maxSupportFootDriftPx).toBeLessThan(1e-6);
          expect(report.maxOverallSegmentDriftPx).toBeLessThan(1e-6);
          expect(report.maxPelvisDriftPx).toBeLessThan(1e-6);
          expect(report.pelvisDriftMm).toBe(0);
          expect(report.maxSupportHeelDriftPx).toBeLessThan(1e-6);
          expect(report.supportHeelY).toBeCloseTo(HIP_LEG_SEGMENT_LENGTHS.matSurfaceY, 9);
          expect(report.earShoulderHipCollinearAllSamples).toBe(true);
          expect(report.earShoulderHipMaxDeviationPx).toBeLessThan(1e-6);
          expect(report.invariantPassed).toBe(true);
        }
      }
    }
  });

  it('verifies Single Leg Circle vs Side Kick biomechanical trajectories and bilateral stroke rules', () => {
    const slcStart = getHipLegDiagramPose('hip-leg-single-leg-circle', 'start');
    const slcMid = getHipLegDiagramPose('hip-leg-single-leg-circle', 'rotation');
    const slcEnd = getHipLegDiagramPose('hip-leg-single-leg-circle', 'end');

    expect(slcStart.workingLeg.thighAngleDeg).toBeCloseTo(-90, 6);
    expect(slcMid.workingLeg.thighAngleDeg).toBeCloseTo(-38, 6);
    expect(slcEnd.workingLeg.thighAngleDeg).toBeCloseTo(-78, 6);
    expect(slcStart.supportLeg.heel.y).toBe(144);
    expect(slcMid.supportLeg.heel.y).toBe(144);
    expect(slcEnd.supportLeg.heel.y).toBe(144);
    expect(slcMid.invariants.circumductionAzimuthDeg).toBe(180);
    expect(slcEnd.invariants.circumductionAzimuthDeg).toBe(360);

    const skStart = getHipLegDiagramPose('hip-leg-side-kick', 'start');
    const skMid = getHipLegDiagramPose('hip-leg-side-kick', 'middle');
    const skEnd = getHipLegDiagramPose('hip-leg-side-kick', 'end');

    expect(skStart.workingLeg.thighAngleDeg).toBeCloseTo(-2, 6);
    expect(skMid.workingLeg.thighAngleDeg).toBeCloseTo(-40, 6);
    expect(skEnd.workingLeg.thighAngleDeg).toBeCloseTo(14, 6);
    expect(skStart.workingLeg.ankleFlexionState).toBe('dorsiflexion');
    expect(skMid.workingLeg.ankleFlexionState).toBe('dorsiflexion');
    expect(skEnd.workingLeg.ankleFlexionState).toBe('plantarflexion');
    expect(skStart.invariants.pelvisStacked).toBe(true);
    expect(skMid.invariants.supportHeelX).toBeCloseTo(skStart.invariants.supportHeelX, 9);
    expect(skEnd.invariants.supportHeelX).toBeCloseTo(skStart.invariants.supportHeelX, 9);

    // Left limb is always solid and right limb is always dashed even when mirrored
    const mirroredLeftWorking = mirrorHipLegPose(slcStart);
    expect(mirroredLeftWorking.workingLeg.anatomicalSide).toBe('left');
    expect(mirroredLeftWorking.workingLeg.strokeStyle).toBe('solid');
    expect(mirroredLeftWorking.supportLeg.anatomicalSide).toBe('right');
    expect(mirroredLeftWorking.supportLeg.strokeStyle).toBe('dashed');

    const rightWorking = getHipLegDiagramPose('hip-leg-side-kick', 'middle', {
      activeSide: 'right',
      mirrored: true,
    });
    expect(rightWorking.workingLeg.anatomicalSide).toBe('right');
    expect(rightWorking.workingLeg.strokeStyle).toBe('dashed');
    expect(rightWorking.supportLeg.anatomicalSide).toBe('left');
    expect(rightWorking.supportLeg.strokeStyle).toBe('solid');

    const trajectory = sampleHipLegTrajectory('ex-hip-01');
    expect(trajectory).toHaveLength(241);
    expect(resolveHipLegMovementId('원 레그 서클')).toBe('hip-leg-single-leg-circle');
    expect(resolveHipLegMovementId('옆으로 누워 다리 들기')).toBe('hip-leg-side-kick');
  });

  it('exports complete CatalogMovementVisualAsset and MovementDiagramCorrection records for all 15 related catalog IDs', () => {
    const assets = getHipLegCatalogVisualAssets();
    const corrections = getHipLegDiagramCorrections();
    const allExpectedIds = [
      ...HIP_LEG_SINGLE_LEG_CIRCLE_CATALOG_IDS,
      ...HIP_LEG_SIDE_KICK_CATALOG_IDS,
    ];

    expect(allExpectedIds).toHaveLength(15);
    expect(Object.keys(HIP_LEG_CATALOG_ID_TO_MOVEMENT)).toHaveLength(15);

    for (const id of allExpectedIds) {
      const asset = assets[id];
      const correction = corrections[id];
      expect(asset).toBeDefined();
      expect(correction).toBeDefined();
      expect(asset.exerciseId).toBe(id);
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(asset.productionMethod).toBe('free-authored-kinematic-svg-v1');
      expect(asset.rightsStatus).toBe('original-app-authored-free-license');
      expect(asset.primaryMuscles.length).toBeGreaterThanOrEqual(3);

      const roles = new Set(asset.primaryMuscles.map((m) => m.role));
      expect(roles.has('primary')).toBe(true);
      expect(roles.has('stabilizer')).toBe(true);

      for (const phaseId of ['start', 'middle', 'end'] as const satisfies readonly VisualPhaseId[]) {
        const phaseSpec = asset.phases[phaseId];
        expect(phaseSpec.phaseId).toBe(phaseId);
        for (const jointKey of REQUIRED_JOINT_KEYS) {
          const pt = phaseSpec.joints[jointKey];
          expect(pt).toBeDefined();
          expect(pt!.x).toBeGreaterThanOrEqual(16);
          expect(pt!.x).toBeLessThanOrEqual(304);
          expect(pt!.y).toBeGreaterThanOrEqual(16);
          expect(pt!.y).toBeLessThanOrEqual(184);
        }
      }

      expect(correction.archetypeId).toBe(asset.archetypeId);
      expect(correction.checkedAt).toBe('2026-11-06');
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.sources.length).toBeGreaterThanOrEqual(3);
    }

    expect(HIP_LEG_I7_REGISTRY_BUNDLE.trackId).toBe('I3');
    expect(HIP_LEG_I7_REGISTRY_BUNDLE.truthfulnessMetadata.anatomicalAccuracyAssumed).toBe(false);
    expect(resolveHipLegCatalogVisualAsset('ex-straps-01')?.apparatus).toBe('reformer');
    expect(resolveHipLegCatalogVisualAsset('ex-straps-02')?.apparatus).toBe('cadillac');
    expect(resolveHipLegCatalogVisualAsset('ex-lower-04')?.apparatus).toBe('reformer');
    expect(resolveHipLegCatalogVisualAsset('original-cadillac-side-leg-reach')?.apparatus).toBe(
      'cadillac',
    );
    expect(resolveHipLegDiagramCorrection('ex-hip-02')?.archetypeId).toBe('side-lying-leg-lift');
  });

  it('validates static 1120x560 SVG guides and hip-leg-manifest.json metadata', () => {
    const manifestPath = resolve(
      process.cwd(),
      'public/images/movement-guides/hip-leg-manifest.json',
    );
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      trackId: string;
      anatomicalAccuracyAssumed: boolean;
      professionalReviewCount: number;
      sourceFrameMappings: number;
      assets: Array<{
        movementId: string;
        fileName: string;
        viewBox: string;
        width: number;
        height: number;
        sha256: string;
        bytes: number;
        anatomicalAccuracyAssumed: boolean;
        professionalReviewCount: number;
        sourceFrameMappings: number;
        phasesDepicted: string[];
      }>;
    };

    expect(manifest.trackId).toBe('I3');
    expect(manifest.anatomicalAccuracyAssumed).toBe(false);
    expect(manifest.professionalReviewCount).toBe(0);
    expect(manifest.sourceFrameMappings).toBe(0);
    expect(manifest.assets).toHaveLength(2);

    for (const entry of manifest.assets) {
      const svgPath = resolve(process.cwd(), 'public/images/movement-guides', entry.fileName);
      const buffer = readFileSync(svgPath);
      const svgText = buffer.toString('utf8');
      const computedSha = createHash('sha256').update(buffer).digest('hex');

      expect(entry.viewBox).toBe('0 0 1120 560');
      expect(entry.width).toBe(1120);
      expect(entry.height).toBe(560);
      expect(entry.anatomicalAccuracyAssumed).toBe(false);
      expect(entry.professionalReviewCount).toBe(0);
      expect(entry.sourceFrameMappings).toBe(0);
      expect(entry.phasesDepicted).toEqual(['start', 'middle', 'end']);
      expect(buffer.length).toBe(entry.bytes);
      expect(computedSha).toBe(entry.sha256);

      expect(svgText).toContain('viewBox="0 0 1120 560"');
      expect(svgText).toContain('width="1120"');
      expect(svgText).toContain('height="560"');
      expect(svgText).toContain('id="phase-start"');
      expect(svgText).toContain('id="phase-middle"');
      expect(svgText).toContain('id="phase-end"');
      expect(svgText).toContain('data-element="pelvis-anchor"');
      expect(svgText).toContain('data-element="leg-trajectory-arc"');
      expect(svgText).toContain('data-anatomical-accuracy-assumed="false"');
    }
  });

  it('renders HipLegDiagramFigure with 3-phase selector, continuous scrub, pelvis anchor callout, and truthfulness disclosures', () => {
    render(<HipLegDiagramFigure movementId="hip-leg-single-leg-circle" initialPhase="start" />);

    const figure = screen.getByTestId('hip-leg-diagram-figure');
    expect(figure).toHaveAttribute('data-movement-id', 'hip-leg-single-leg-circle');
    expect(figure).toHaveAttribute('data-phase', 'start');
    expect(figure).toHaveAttribute('data-anatomical-accuracy-assumed', 'false');

    const primarySvg = screen.getByTestId('hip-leg-primary-svg');
    expect(primarySvg).toHaveAttribute('data-stage-key', 'start');
    expect(primarySvg).toHaveAttribute('data-pelvis-drift-mm', '0');

    // Switch phase to middle -> end
    fireEvent.click(screen.getByTestId('hip-leg-phase-tab-middle'));
    expect(figure).toHaveAttribute('data-phase', 'middle');
    expect(primarySvg).toHaveAttribute('data-stage-key', 'rotation');

    fireEvent.click(screen.getByTestId('hip-leg-phase-tab-end'));
    expect(figure).toHaveAttribute('data-phase', 'end');
    expect(primarySvg).toHaveAttribute('data-stage-key', 'end');

    // Continuous scrub slider
    const slider = screen.getByTestId('hip-leg-progress-slider');
    fireEvent.change(slider, { target: { value: '0.25' } });
    expect(screen.getByTestId('hip-leg-progress-readout').textContent).toContain('t = 0.25');

    // Switch movement to Side Kick
    fireEvent.click(screen.getByTestId('hip-leg-movement-tab-hip-leg-side-kick'));
    expect(figure).toHaveAttribute('data-movement-id', 'hip-leg-side-kick');
    expect(screen.getByTestId('hip-leg-pelvis-anchor-callout').textContent).toContain(
      'pelvisDriftMm = 0mm',
    );

    // Side & mirror toggles preserve bilateral stroke rule
    fireEvent.click(screen.getByTestId('hip-leg-side-toggle'));
    expect(primarySvg).toHaveAttribute('data-active-side', 'right');
    fireEvent.click(screen.getByTestId('hip-leg-mirror-toggle'));
    expect(primarySvg).toHaveAttribute('data-mirrored', 'true');
    expect(primarySvg).toHaveAttribute('data-left-limb-stroke', 'solid');
    expect(primarySvg).toHaveAttribute('data-right-limb-stroke', 'dashed');

    // Disclosures & source links
    expect(screen.getByTestId('hip-leg-truthfulness-disclosure').textContent).toContain(
      HIP_LEG_TRUTHFULNESS_METADATA.nonMedicalDisclosureKo,
    );
    expect(screen.getByTestId('hip-leg-sources-list').querySelectorAll('li').length).toBe(
      HIP_LEG_DIAGRAM_DATA['hip-leg-side-kick'].sources.length,
    );

    // Standalone SVG & Triptych subcomponents
    const standalone = render(
      <HipLegDiagramSvg movementId="hip-leg-side-kick" phaseOrProgress="middle" />,
    );
    expect(standalone.getByTestId('hip-leg-svg-hip-leg-side-kick-middle')).toBeInTheDocument();
    standalone.unmount();

    const triptych = render(
      <HipLegDiagramTriptychSvg movementId="hip-leg-single-leg-circle" selectedPhase="middle" />,
    );
    expect(
      triptych.getByTestId('hip-leg-triptych-svg-hip-leg-single-leg-circle-start'),
    ).toBeInTheDocument();
    triptych.unmount();
  });
});
