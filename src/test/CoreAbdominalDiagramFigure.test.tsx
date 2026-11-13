import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CoreAbdominalDiagramFigure,
  CoreAbdominalI7IntegrationPreview,
  CoreAbdominalPhaseSvg,
  CoreAbdominalTriptychFigure,
} from '../components/CoreAbdominalDiagramFigure';
import {
  CORE_ABDOMINAL_DIAGRAM_IDS,
  CORE_ABDOMINAL_DIAGRAM_SPECS,
  CORE_ABDOMINAL_SOURCE_LEDGER,
  computeFemurScissorSplitDeg,
  computeHipLegExtensionDeg,
  computeShoulderArmElevationDeg,
  getCoreI7RegistryPatch,
  resolveCoreAbdominalDiagram,
  resolveCoreMovementVisualAsset,
} from '../data/coreAbdominalDiagrams';
import { getMovementVisualAsset, type VisualPhaseId } from '../data/movementVisualRigCatalog';

const PHASES: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

describe('Track I4 · Core Abdominal 2D Diagrams (Hundred, Single Leg Stretch, Double Leg Stretch)', () => {
  it('defines distinct joint coordinates across core-hundred, core-single-leg-stretch, and core-double-leg-stretch in every phase', () => {
    const hundred = CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'].asset;
    const singleLeg = CORE_ABDOMINAL_DIAGRAM_SPECS['core-single-leg-stretch'].asset;
    const doubleLeg = CORE_ABDOMINAL_DIAGRAM_SPECS['core-double-leg-stretch'].asset;

    for (const phase of PHASES) {
      const hJoints = hundred.phases[phase].joints;
      const sJoints = singleLeg.phases[phase].joints;
      const dJoints = doubleLeg.phases[phase].joints;

      expect(JSON.stringify(hJoints)).not.toBe(JSON.stringify(sJoints));
      expect(JSON.stringify(hJoints)).not.toBe(JSON.stringify(dJoints));
      expect(JSON.stringify(sJoints)).not.toBe(JSON.stringify(dJoints));
    }

    // Start phase: Hundred hovers arms at hip level (y=128) with 90° tabletop knees,
    // Single Leg clasps one drawn-in shin (hand y=98) while extending the far leg,
    // Double Leg tucks both knees into chest (knee x=134, farKnee x=130).
    expect(hundred.phases.start.joints.hand.y).toBeGreaterThan(
      singleLeg.phases.start.joints.hand.y + 20,
    );
    expect(singleLeg.phases.start.joints.farAnkle?.x).toBeGreaterThan(
      doubleLeg.phases.start.joints.farAnkle!.x + 50,
    );

    // Middle phase: Double Leg reaches arms overhead (hand.x = 24), whereas Hundred pumps at hip level (hand.x = 172)
    expect(doubleLeg.phases.middle.joints.hand.x).toBeLessThan(40);
    expect(hundred.phases.middle.joints.hand.x).toBeGreaterThan(160);
  });

  it('maintains lumbar and pelvis mat anchor stability (y >= 142) and constant scapular curl height across all phases', () => {
    for (const id of CORE_ABDOMINAL_DIAGRAM_IDS) {
      const spec = CORE_ABDOMINAL_DIAGRAM_SPECS[id];
      for (const phase of PHASES) {
        const { lumbar, pelvis, thoracic } = spec.asset.phases[phase].joints;
        expect(lumbar.y).toBeGreaterThanOrEqual(142);
        expect(lumbar.y).toBeLessThanOrEqual(145);
        expect(pelvis.y).toBeGreaterThanOrEqual(142);
        expect(pelvis.y).toBeLessThanOrEqual(145);
        expect(thoracic.y).toBeGreaterThanOrEqual(135);
        expect(thoracic.y).toBeLessThanOrEqual(136);
      }
    }
  });

  it('verifies Hundred biomechanics: 90° tabletop start, 45° diagonal leg extension, and vertical arm pump [0,-14]..[0,14]', () => {
    const spec = CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'];
    const startJoints = spec.asset.phases.start.joints;
    const middleJoints = spec.asset.phases.middle.joints;

    // Tabletop 90° knee angle: vertical femur (x=162) and horizontal tibia (y=96)
    expect(startJoints.knee.x).toBe(startJoints.hip.x);
    expect(startJoints.ankle.y).toBe(startJoints.knee.y);

    // Middle 45° diagonal leg reach
    expect(computeHipLegExtensionDeg(middleJoints)).toBe(45);

    // Vertical arm pump vector [0, -14] to [0, 14] around middle hand (172, 134)
    expect(spec.kinematicMetrics.armPumpDeltaRangeY).toEqual([-14, 14]);
    const pumpVec = spec.asset.phases.middle.directionVectors.find(
      (v) => v.id === 'vec-hundred-vertical-pump',
    );
    expect(pumpVec).toBeDefined();
    expect(pumpVec?.points[0].y).toBe(middleJoints.hand.y - 14);
    expect(pumpVec?.points[2].y).toBe(middleJoints.hand.y + 14);
  });

  it('verifies Single Leg Stretch biomechanics: 78° scissor split in start & end and hand-shin clasp proximity', () => {
    const spec = CORE_ABDOMINAL_DIAGRAM_SPECS['core-single-leg-stretch'];
    const startJoints = spec.asset.phases.start.joints;
    const endJoints = spec.asset.phases.end.joints;

    expect(computeFemurScissorSplitDeg(startJoints)).toBe(78);
    expect(computeFemurScissorSplitDeg(endJoints)).toBe(78);

    // Hand clasps the drawn-in shin/ankle in start and end
    const startHandToAnkleDist = Math.hypot(
      startJoints.hand.x - startJoints.ankle.x,
      startJoints.hand.y - startJoints.ankle.y,
    );
    expect(startHandToAnkleDist).toBeLessThan(15);

    // End phase extends the near leg at 45° diagonal while drawing far leg into chest
    expect(computeHipLegExtensionDeg(endJoints)).toBe(45);
  });

  it('verifies Double Leg Stretch biomechanics: compact tucked ball start, 135° overhead arm + 45° diagonal leg opposition middle, and wide circular arm sweep end', () => {
    const spec = CORE_ABDOMINAL_DIAGRAM_SPECS['core-double-leg-stretch'];
    const startJoints = spec.asset.phases.start.joints;
    const middleJoints = spec.asset.phases.middle.joints;
    const endJoints = spec.asset.phases.end.joints;

    // Start tucked ball: hands at shins/ankles, tailbone anchored at y=143
    expect(startJoints.pelvis.y).toBe(143);
    expect(
      Math.hypot(
        startJoints.hand.x - startJoints.ankle.x,
        startJoints.hand.y - startJoints.ankle.y,
      ),
    ).toBeLessThan(10);

    // Middle opposition reach: 135° overhead arms + 45° diagonal legs, thoracic curl y=135 & lumbar y=143
    expect(computeShoulderArmElevationDeg(middleJoints)).toBe(135);
    expect(computeHipLegExtensionDeg(middleJoints)).toBe(45);
    expect(middleJoints.thoracic.y).toBe(135);
    expect(middleJoints.lumbar.y).toBe(143);

    // End wide circular arm sweep (elbow sweeps wide downward y=138, farElbow sweeps upward y=84)
    expect(endJoints.elbow.y).toBeGreaterThan(startJoints.elbow.y + 20);
    expect(endJoints.farElbow?.y).toBeLessThan(startJoints.farElbow!.y - 15);
  });

  it('verifies getCoreI7RegistryPatch() contract and exercise ID resolvers', () => {
    const patch = getCoreI7RegistryPatch();

    const expectedIds = [
      'ex-core-01',
      'original-mat-hundred-prep',
      'core-hundred',
      'original-mat-single-leg-stretch',
      'core-single-leg-stretch',
      'ex-core-03',
      'original-mat-double-leg-stretch',
      'core-double-leg-stretch',
    ];

    for (const id of expectedIds) {
      expect(patch.assets[id]).toBeDefined();
      expect(patch.assets[id].exerciseId).toBe(id);
      expect(patch.assets[id].anatomicalAccuracyAssumed).toBe(false);
      expect(patch.corrections[id]).toBeDefined();
      expect(patch.corrections[id].professionalReviewCount).toBe(0);
      expect(patch.corrections[id].sourceFrameMappings).toBe(0);
      expect(patch.corrections[id].sources.length).toBeGreaterThanOrEqual(2);
      expect(resolveCoreAbdominalDiagram(id)).not.toBeNull();
      expect(resolveCoreMovementVisualAsset(id)?.exerciseId).toBe(id);
    }

    // Short-box abdominals are seated on a Reformer and must not resolve to a
    // supine single-leg stretch or inherit that movement's correction record.
    expect(patch.assets['ex-core-02']).toBeUndefined();
    expect(patch.corrections['ex-core-02']).toBeUndefined();
    expect(patch.byCatalogExerciseId['ex-core-02']).toBeUndefined();
    expect(resolveCoreAbdominalDiagram('ex-core-02')).toBeNull();
    expect(resolveCoreMovementVisualAsset('ex-core-02')).toBeNull();
    const shortBox = getMovementVisualAsset('ex-core-02');
    expect(shortBox).toMatchObject({
      apparatus: 'reformer',
      bodyPosition: 'seated',
      archetypeId: 'reformer-short-box-supported-roll-back',
      anatomicalAccuracyAssumed: false,
    });
    expect(shortBox!.phases.start.joints).not.toEqual(
      CORE_ABDOMINAL_DIAGRAM_SPECS['core-single-leg-stretch'].asset.phases.start.joints,
    );

    expect(CORE_ABDOMINAL_SOURCE_LEDGER.truthfulness.anatomicalAccuracyAssumed).toBe(false);
    expect(CORE_ABDOMINAL_SOURCE_LEDGER.truthfulness.professionalReviewCount).toBe(0);
    expect(CORE_ABDOMINAL_SOURCE_LEDGER.truthfulness.sourceFrameMappings).toBe(0);
  });

  it('renders CoreAbdominalDiagramFigure with movement tabs, phase tabs, 3-up comparison strip, overlays, and truthfulness disclosures', () => {
    render(<CoreAbdominalDiagramFigure initialDiagramId="core-hundred" initialPhase="middle" />);

    expect(screen.getByTestId('core-abdominal-diagram-figure')).toBeTruthy();
    expect(screen.getByTestId('core-three-up-comparison-strip')).toBeTruthy();
    expect(screen.getByTestId('core-source-truthfulness-disclosure').textContent).toContain(
      'anatomicalAccuracyAssumed: false',
    );

    // Switch to Single Leg Stretch
    fireEvent.click(screen.getByTestId('core-movement-tab-core-single-leg-stretch'));
    expect(screen.getByTestId('core-triptych-core-single-leg-stretch')).toBeTruthy();
    expect(screen.getByTestId('core-kinematic-metrics-bar').textContent).toContain('78°');

    // Switch to Double Leg Stretch and test phase tab
    fireEvent.click(screen.getByTestId('core-movement-tab-core-double-leg-stretch'));
    fireEvent.click(screen.getByTestId('core-phase-tab-end'));
    expect(screen.getByTestId('core-triptych-core-double-leg-stretch')).toBeTruthy();

    // Toggle trajectory overlay and lumbar anchor guide
    const trajectoryCheckbox = screen.getByTestId('toggle-trajectory-overlay');
    fireEvent.click(trajectoryCheckbox);
    expect(screen.queryByTestId('trajectory-overlay-core-double-leg-stretch-end')).toBeNull();

    // Standalone subcomponents render cleanly
    const { unmount } = render(
      <>
        <CoreAbdominalPhaseSvg diagramId="core-hundred" phase="start" />
        <CoreAbdominalTriptychFigure diagramId="core-single-leg-stretch" />
        <CoreAbdominalI7IntegrationPreview exerciseId="ex-core-03" phase="middle" />
      </>,
    );
    unmount();
  });
});
