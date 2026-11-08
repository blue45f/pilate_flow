import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  calculateCorePhaseJointDelta,
  CORE_ABDOMINAL_DIAGRAM_LIST,
  CORE_ABDOMINAL_DIAGRAM_SPECS,
  CORE_DIAGRAM_LEGEND_ITEMS,
  CORE_MOVEMENT_IDS,
  CORE_MOVEMENT_VISUAL_ASSETS,
  getCoreI7RegistryPatch,
  interpolateCorePhaseJoints,
  resolveCoreAbdominalDiagram,
  resolveCoreMovementVisualAsset,
} from '../data/coreAbdominalDiagrams';
import {
  CoreAbdominalI7IntegrationPreview,
  CoreAbdominalPhaseSvg,
  CoreAbdominalTriptychFigure,
  toCorePhaseDiagramProps,
  toCoreTriptychDiagramProps,
} from './CoreAbdominalDiagramFigure';

describe('I4 Core Abdominal Stability 2D Diagrams — Data & Biomechanical Contracts', () => {
  it('defines all three required movements (The Hundred, Single Leg Stretch, Double Leg Stretch) with complete start/middle/end phases', () => {
    expect(CORE_MOVEMENT_IDS).toEqual([
      'core-hundred',
      'core-single-leg-stretch',
      'core-double-leg-stretch',
    ]);
    expect(CORE_ABDOMINAL_DIAGRAM_LIST).toHaveLength(3);
    expect(CORE_MOVEMENT_VISUAL_ASSETS).toHaveLength(3);

    for (const spec of CORE_ABDOMINAL_DIAGRAM_LIST) {
      for (const phase of ['start', 'middle', 'end'] as const) {
        const detail = spec.phaseDetails[phase];
        expect(detail.phaseId).toBe(phase);
        expect(detail.jointAxes.length).toBeGreaterThanOrEqual(1);
        expect(detail.contactPoints.length).toBeGreaterThanOrEqual(3);
        expect(detail.calloutLabels.length).toBeGreaterThanOrEqual(3);
        expect(detail.poseSpec.directionVectors.length).toBeGreaterThanOrEqual(1);

        // Coordinate bounds inside 320x200 viewBox
        for (const pt of Object.values(detail.poseSpec.joints)) {
          if (pt) {
            expect(pt.x).toBeGreaterThanOrEqual(16);
            expect(pt.x).toBeLessThanOrEqual(304);
            expect(pt.y).toBeGreaterThanOrEqual(16);
            expect(pt.y).toBeLessThanOrEqual(184);
          }
        }
      }
    }
  });

  it('strictly differentiates the kinematic signatures of Hundred, Single Leg Stretch, and Double Leg Stretch', () => {
    const hundred = CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'];
    const sls = CORE_ABDOMINAL_DIAGRAM_SPECS['core-single-leg-stretch'];
    const dls = CORE_ABDOMINAL_DIAGRAM_SPECS['core-double-leg-stretch'];

    // 1. The Hundred: start in 90/90 tabletop (knee.y=96, ankle.y=96), middle in 45° bilateral extension (ankle: 248,68) with low horizontal pumping arms (hand: 172,134)
    expect(hundred.phaseDetails.start.poseSpec.joints.knee.y).toBe(
      hundred.phaseDetails.start.poseSpec.joints.ankle.y,
    );
    expect(hundred.phaseDetails.middle.poseSpec.joints.ankle.x).toBeGreaterThan(240);
    expect(hundred.phaseDetails.middle.poseSpec.joints.ankle.y).toBeLessThan(75);
    expect(hundred.phaseDetails.middle.poseSpec.joints.hand.y).toBeGreaterThan(125);

    // 2. Single Leg Stretch: hands clasp the flexed near shin/knee (hand: 164,98; wrist: 138,90), NOT pumping near the floor, while contralateral farLeg extends to 45° (farAnkle: 252,68)
    const slsMid = sls.phaseDetails.middle.poseSpec.joints;
    expect(slsMid.hand.y).toBeLessThan(105);
    expect(Math.hypot(slsMid.wrist.x - slsMid.knee.x, slsMid.wrist.y - slsMid.knee.y)).toBeLessThan(12);
    expect(slsMid.farAnkle?.x).toBeGreaterThan(245);
    expect(slsMid.farAnkle?.y).toBeLessThan(75);
    expect(slsMid.farAnkle!.x - slsMid.knee.x).toBeGreaterThan(100);

    // 3. Double Leg Stretch: start clasps shins (hand: 172,102), middle reaches arms overhead by ears (hand: 24,58) AND legs to 45° diagonal (toe: 264,60) while keeping head/shoulders curled up (head.y=96, lumbar.y=145), end circles arms back to shins (hand: 174,102)
    const dlsStart = dls.phaseDetails.start.poseSpec.joints;
    const dlsMid = dls.phaseDetails.middle.poseSpec.joints;
    const dlsEnd = dls.phaseDetails.end.poseSpec.joints;

    expect(dlsStart.hand.x).toBeGreaterThan(165);
    expect(dlsMid.hand.x).toBeLessThan(35);
    expect(dlsMid.hand.y).toBeLessThan(65);
    expect(dlsMid.toe.x).toBeGreaterThan(255);
    // Upper body curl height and lumbar mat contact remain locked during middle phase
    expect(Math.abs(dlsMid.head.y - dlsStart.head.y)).toBeLessThanOrEqual(4);
    expect(dlsMid.lumbar.y).toBe(dlsStart.lumbar.y);
    expect(dlsEnd.hand.x).toBeGreaterThan(165);
  });

  it('verifies public evidence sources with valid HTTPS links and non-medical governance flags', () => {
    expect(CORE_DIAGRAM_LEGEND_ITEMS.length).toBeGreaterThanOrEqual(6);

    for (const spec of CORE_ABDOMINAL_DIAGRAM_LIST) {
      expect(spec.governance.anatomicalAccuracyAssumed).toBe(false);
      expect(spec.governance.professionalReviewCount).toBe(0);
      expect(spec.governance.exactAssetReady).toBe(false);
      expect(spec.governance.containsMedicalDiagnosis).toBe(false);
      expect(spec.governance.containsTreatmentEfficacyClaim).toBe(false);
      expect(spec.governance.nonMedicalDisclaimerKo).toContain('의학적 진단·처방·치료 효과를 보증하지 않습니다');

      expect(spec.evidenceSources.length).toBeGreaterThanOrEqual(3);
      for (const src of spec.evidenceSources) {
        expect(src.url).toMatch(/^https:\/\//);
        expect(src.verifiedClaimsKo.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('I4 Core Abdominal Stability 2D Diagrams — SVG & Interactive Component Suite', () => {
  it('resolves exercises by both coreId and catalog exerciseId and provides a clean I7 registry patch', () => {
    expect(resolveCoreAbdominalDiagram('ex-core-01')?.coreId).toBe('core-hundred');
    expect(
      resolveCoreAbdominalDiagram('original-mat-single-leg-stretch')?.coreId,
    ).toBe('core-single-leg-stretch');
    expect(resolveCoreAbdominalDiagram('ex-core-03')?.coreId).toBe(
      'core-double-leg-stretch',
    );
    expect(resolveCoreAbdominalDiagram('unknown-exercise')).toBeNull();
    expect(resolveCoreMovementVisualAsset('ex-core-01')?.archetypeId).toBe(
      'core-hundred-2d-v1',
    );

    const patch = getCoreI7RegistryPatch();
    expect(patch.ownerTrack).toBe('I4');
    expect(Object.keys(patch.byCatalogExerciseId)).toEqual([
      'ex-core-01',
      'original-mat-single-leg-stretch',
      'ex-core-03',
    ]);

    // Continuous interpolation boundary check
    const dls = CORE_ABDOMINAL_DIAGRAM_SPECS['core-double-leg-stretch'];
    const atStart = interpolateCorePhaseJoints(dls, 0);
    const atMid = interpolateCorePhaseJoints(dls, 0.5);
    const atEnd = interpolateCorePhaseJoints(dls, 1);
    expect(atStart.hand).toEqual(dls.phaseDetails.start.poseSpec.joints.hand);
    expect(atMid.hand).toEqual(dls.phaseDetails.middle.poseSpec.joints.hand);
    expect(atEnd.hand).toEqual(dls.phaseDetails.end.poseSpec.joints.hand);

    const delta = calculateCorePhaseJointDelta(dls, 'start', 'middle');
    expect(delta.handDeltaPx).toBeGreaterThan(140);
    expect(delta.lumbarAnchorDriftPx).toBe(0);
    expect(delta.pelvisAnchorDriftPx).toBe(0);
  });

  it('renders CoreAbdominalTriptychFigure across all 3 movements and supports side, mirror, and layer toggles', () => {
    render(<CoreAbdominalTriptychFigure initialMovementId="core-hundred" />);

    expect(
      screen.getByTestId('core-triptych-figure-core-hundred'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('core-phase-svg-core-hundred-start'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('core-phase-svg-core-hundred-middle'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('core-phase-svg-core-hundred-end'),
    ).toBeInTheDocument();

    // Switch to Single Leg Stretch
    fireEvent.click(screen.getByTestId('core-switch-core-single-leg-stretch'));
    expect(
      screen.getByTestId('core-triptych-figure-core-single-leg-stretch'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('core-phase-svg-core-single-leg-stretch-middle'),
    ).toHaveAttribute('data-active-side', 'left');

    // Toggle active side (left -> right) and mirror (false -> true)
    fireEvent.click(screen.getByTestId('core-toggle-side'));
    expect(
      screen.getByTestId('core-phase-svg-core-single-leg-stretch-middle'),
    ).toHaveAttribute('data-active-side', 'right');

    fireEvent.click(screen.getByTestId('core-toggle-mirror'));
    expect(
      screen.getByTestId('core-phase-svg-core-single-leg-stretch-middle'),
    ).toHaveAttribute('data-mirrored', 'true');

    // Switch to Double Leg Stretch
    fireEvent.click(screen.getByTestId('core-switch-core-double-leg-stretch'));
    expect(
      screen.getByTestId('core-triptych-figure-core-double-leg-stretch'),
    ).toBeInTheDocument();

    // Verify legend, public sources, and non-medical disclaimer render
    const legend = screen.getByTestId('core-diagram-legend');
    expect(within(legend).getByText(/매트 고정 접촉점/)).toBeInTheDocument();
    expect(within(legend).getByText(/손-정강이\/무릎 접촉점/)).toBeInTheDocument();

    const disclaimer = screen.getByTestId('core-non-medical-disclaimer');
    expect(disclaimer).toHaveTextContent(
      '의학적 진단·처방·치료 효과를 보증하지 않습니다',
    );

    // Layer toggle hides/shows joint axes
    fireEvent.click(screen.getByTestId('core-layer-toggle-axes'));
    expect(screen.queryAllByTestId('core-joint-axes-layer')).toHaveLength(0);
  });

  it('renders standalone CoreAbdominalPhaseSvg and CoreAbdominalI7IntegrationPreview without errors', () => {
    const phaseProps = toCorePhaseDiagramProps('original-mat-single-leg-stretch', 'middle');
    const triptychProps = toCoreTriptychDiagramProps('ex-core-03');
    expect(phaseProps.asset.exerciseId).toBe('original-mat-single-leg-stretch');
    expect(triptychProps.asset.exerciseId).toBe('ex-core-03');

    render(
      <div>
        <CoreAbdominalPhaseSvg
          movementId="core-double-leg-stretch"
          phase="middle"
          progress01={0.5}
        />
        <CoreAbdominalI7IntegrationPreview />
      </div>,
    );

    expect(screen.getByTestId('core-i7-integration-preview')).toBeInTheDocument();
    expect(screen.getByTestId('core-i7-patch-count')).toHaveTextContent('3');
  });
});
