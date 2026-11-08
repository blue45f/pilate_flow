import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  SpineArticulationDiagramReference,
  SpineI7IntegrationExample,
} from '../components/SpineArticulationDiagramReference';
import {
  SpineArticulationDiagramSvg,
  SpineArticulationLegend,
  SpineArticulationTriptychSvg,
} from '../components/SpineArticulationDiagramSvg';
import {
  getSpineArticulationDiagramSpec,
  getSpineCatalogMovementVisualAssets,
  getSpineMovementDiagramCorrections,
  resolveSpineArticulationDiagramByExerciseId,
  SPINE_ARTICULATION_DIAGRAM_SPECS,
  SPINE_TRUTHFULNESS_METADATA,
  toSpineCatalogMovementVisualAsset,
  toSpineMovementDiagramCorrection,
  toSpineMovementPhaseDiagramProps,
  toSpineMovementTriptychDiagramProps,
  type RigJointMap,
  type SpineArticulationId,
  type SpineVertebraId,
  type VisualPhaseId,
} from '../data/spineArticulationDiagramData';

const SYNTHETIC_SPINE_FIXTURES = {
  expectedArchetypes: ['spine-roll-up', 'spine-roll-down', 'spine-stretch'] as const,
  expectedPhases: ['start', 'middle', 'end'] as const,
  expectedVertebrae: ['c7', 't4', 't8', 't12', 'l3', 's1'] as const,
  expectedRigJoints: [
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
  ] as const satisfies readonly (keyof RigJointMap)[],
  requiredExerciseMappings: [
    { exerciseId: 'ex-spine-01', archetypeId: 'spine-roll-up' },
    { exerciseId: 'original-mat-roll-up-prep', archetypeId: 'spine-roll-up' },
    { exerciseId: 'ex-spine-02', archetypeId: 'spine-roll-down' },
    { exerciseId: 'ex-spine-03', archetypeId: 'spine-stretch' },
    { exerciseId: 'original-mat-spine-stretch-forward', archetypeId: 'spine-stretch' },
  ] as const,
};

describe('Track I1 — Spine Articulation 2D Diagrams (Roll Up, Roll Down, Spine Stretch)', () => {
  it('defines all 3 archetypes with 3 phases, 6-point spine chain, and full RigJointMap joints', () => {
    for (const archetypeId of SYNTHETIC_SPINE_FIXTURES.expectedArchetypes) {
      const spec = getSpineArticulationDiagramSpec(archetypeId);
      expect(spec.archetypeId).toBe(archetypeId);
      expect(spec.matBaselineY).toBe(144);
      expect(spec.sources.length).toBeGreaterThanOrEqual(3);

      for (const phaseId of SYNTHETIC_SPINE_FIXTURES.expectedPhases) {
        const phase = spec.phases[phaseId];
        expect(phase.phaseId).toBe(phaseId);
        expect(phase.spinePoints).toHaveLength(6);

        for (const vId of SYNTHETIC_SPINE_FIXTURES.expectedVertebrae) {
          const pt = phase.spineChain[vId as SpineVertebraId];
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        }

        for (const jointKey of SYNTHETIC_SPINE_FIXTURES.expectedRigJoints) {
          const jointPt = phase.joints[jointKey];
          expect(jointPt).toBeDefined();
          expect(Number.isFinite(jointPt.x)).toBe(true);
          expect(Number.isFinite(jointPt.y)).toBe(true);
        }
      }
    }
  });

  it('enforces spine-roll-up geometric invariants: fixed lower-body mat anchor, sequential peel, and parallel arms C-curve', () => {
    const spec = SPINE_ARTICULATION_DIAGRAM_SPECS['spine-roll-up'];
    const { start, middle, end } = spec.phases;

    // Fixed lower-body heel/ankle/knee/hip anchor across start, middle, end
    expect(start.joints.heel).toEqual({ x: 268, y: 144 });
    expect(middle.joints.heel).toEqual(start.joints.heel);
    expect(end.joints.heel).toEqual(start.joints.heel);
    expect(middle.joints.ankle).toEqual(start.joints.ankle);
    expect(end.joints.ankle).toEqual(start.joints.ankle);
    expect(middle.joints.knee).toEqual(start.joints.knee);
    expect(end.joints.knee).toEqual(start.joints.knee);
    expect(middle.joints.hip).toEqual(start.joints.hip);
    expect(end.joints.hip).toEqual(start.joints.hip);

    // Start: supine spine resting near mat y = 144
    expect(start.spineChain.c7.y).toBeGreaterThanOrEqual(136);
    expect(start.spineChain.s1.y).toBeGreaterThanOrEqual(138);

    // Middle: sequential cervical -> thoracic peel off mat while lumbar/sacrum anchor
    expect(middle.spineChain.c7.y).toBeLessThan(middle.spineChain.t4.y);
    expect(middle.spineChain.t4.y).toBeLessThan(middle.spineChain.t8.y);
    expect(middle.spineChain.t8.y).toBeLessThan(middle.spineChain.t12.y);
    expect(middle.spineChain.t12.y).toBeLessThan(middle.spineChain.l3.y);
    expect(middle.spineChain.l3.y).toBeLessThan(middle.spineChain.s1.y);

    // End: hollow C-curve forward reach with arms parallel to floor (y = 76) and head not collapsed onto thighs
    expect(end.joints.shoulder.y).toBe(76);
    expect(end.joints.elbow.y).toBe(76);
    expect(end.joints.wrist.y).toBe(76);
    expect(end.joints.hand.y).toBe(76);
    expect(end.joints.head.y).toBeLessThan(end.joints.knee.y - 50);
    expect(end.spineChain.l3.x).toBeLessThan(end.spineChain.s1.x);
    expect(end.spineChain.c7.x).toBeGreaterThan(end.spineChain.t8.x);
  });

  it('enforces spine-roll-down geometric invariants: tall seated start -> sacral curl middle -> sequential roll down end with fixed foot anchor', () => {
    const spec = SPINE_ARTICULATION_DIAGRAM_SPECS['spine-roll-down'];
    const { start, middle, end } = spec.phases;

    // Fixed foot/heel/knee/hip anchor across start, middle, end
    expect(start.joints.heel).toEqual({ x: 258, y: 144 });
    expect(middle.joints.heel).toEqual(start.joints.heel);
    expect(end.joints.heel).toEqual(start.joints.heel);
    expect(middle.joints.ankle).toEqual(start.joints.ankle);
    expect(end.joints.ankle).toEqual(start.joints.ankle);
    expect(middle.joints.knee).toEqual(start.joints.knee);
    expect(end.joints.knee).toEqual(start.joints.knee);
    expect(middle.joints.hip).toEqual(start.joints.hip);
    expect(end.joints.hip).toEqual(start.joints.hip);

    // Start: tall seated vertical spine stack
    expect(start.spineChain.c7.y).toBeLessThan(start.spineChain.t4.y);
    expect(start.spineChain.t4.y).toBeLessThan(start.spineChain.t8.y);
    expect(start.spineChain.t8.y).toBeLessThan(start.spineChain.t12.y);
    expect(start.spineChain.t12.y).toBeLessThan(start.spineChain.l3.y);
    expect(start.spineChain.l3.y).toBeLessThan(start.spineChain.s1.y);

    // Middle: posterior pelvic tilt (sacral curl) moves lumbar posteriorly and downward toward mat
    expect(middle.spineChain.l3.x).toBeLessThan(start.spineChain.l3.x);
    expect(middle.spineChain.l3.y).toBeGreaterThan(start.spineChain.l3.y);

    // End: sequential roll down imprints sacrum, lumbar, and lower thoracic toward mat y = 144
    expect(end.spineChain.s1.y).toBeGreaterThanOrEqual(142);
    expect(end.spineChain.l3.y).toBeGreaterThanOrEqual(140);
    expect(end.spineChain.t12.y).toBeGreaterThan(middle.spineChain.t12.y);
    expect(end.spineChain.t8.y).toBeGreaterThan(middle.spineChain.t8.y);
  });

  it('enforces spine-stretch geometric invariants: imaginary vertical wall (x = 58), fixed sacrum/heels, and forward C-curve peel', () => {
    const spec = SPINE_ARTICULATION_DIAGRAM_SPECS['spine-stretch'];
    const { start, middle, end } = spec.phases;

    expect(spec.wallPlumbLineX).toBe(58);

    // Fixed lower-body and sacrum wall anchor across start, middle, end
    expect(start.spineChain.s1).toEqual({ x: 58, y: 138 });
    expect(middle.spineChain.s1).toEqual({ x: 58, y: 138 });
    expect(end.spineChain.s1).toEqual({ x: 58, y: 138 });
    expect(middle.joints.heel).toEqual(start.joints.heel);
    expect(end.joints.heel).toEqual(start.joints.heel);
    expect(middle.joints.knee).toEqual(start.joints.knee);
    expect(end.joints.knee).toEqual(start.joints.knee);
    expect(middle.joints.pelvis).toEqual(start.joints.pelvis);
    expect(end.joints.pelvis).toEqual(start.joints.pelvis);

    // Start: all 6 vertebral landmarks stacked vertically on imaginary wall x = 58
    for (const vId of SYNTHETIC_SPINE_FIXTURES.expectedVertebrae) {
      expect(start.spineChain[vId].x).toBe(58);
    }

    // Middle: cervical & upper thoracic peel forward off x = 58 while s1 & l3 stay against the wall
    expect(middle.spineChain.c7.x).toBeGreaterThan(middle.spineChain.t4.x);
    expect(middle.spineChain.t4.x).toBeGreaterThan(middle.spineChain.t8.x);
    expect(middle.spineChain.t8.x).toBeGreaterThan(middle.spineChain.t12.x);
    expect(middle.spineChain.l3.x).toBeLessThanOrEqual(62);

    // End: deep forward C-curve crown & hands reaching forward while s1 remains at x = 58
    expect(end.spineChain.c7.x).toBeGreaterThan(middle.spineChain.c7.x);
    expect(end.joints.hand.x).toBeGreaterThan(middle.joints.hand.x);
    expect(middle.joints.hand.x).toBeGreaterThan(start.joints.hand.x);
    expect(end.spineChain.s1.x).toBe(58);
  });

  it('verifies truthfulness metadata and I7 adapter outputs for catalog visual assets and diagram corrections', () => {
    expect(SPINE_TRUTHFULNESS_METADATA.anatomicalAccuracyAssumed).toBe(false);
    expect(SPINE_TRUTHFULNESS_METADATA.clinicallyValidated).toBe(false);
    expect(SPINE_TRUTHFULNESS_METADATA.peerReviewedBiomechanicalCapture).toBe(false);
    expect(SPINE_TRUTHFULNESS_METADATA.professionalReviewCount).toBe(0);
    expect(SPINE_TRUTHFULNESS_METADATA.sourceFrameMappings).toBe(0);
    expect(SPINE_TRUTHFULNESS_METADATA.nonMedicalNoticeKo).toContain('의학적 진단');

    const visualAssets = getSpineCatalogMovementVisualAssets();
    const corrections = getSpineMovementDiagramCorrections();

    for (const { exerciseId, archetypeId } of SYNTHETIC_SPINE_FIXTURES.requiredExerciseMappings) {
      const resolvedSpec = resolveSpineArticulationDiagramByExerciseId(exerciseId);
      expect(resolvedSpec?.archetypeId).toBe(archetypeId);

      const asset = visualAssets[exerciseId];
      expect(asset).toBeDefined();
      expect(asset.exerciseId).toBe(exerciseId);
      expect(asset.archetypeId).toBe(archetypeId);
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(asset.productionMethod).toBe('free-authored-kinematic-svg-v1');
      expect(asset.rightsStatus).toBe('original-app-authored-free-license');

      const singleAsset = toSpineCatalogMovementVisualAsset(exerciseId, exerciseId);
      expect(singleAsset?.archetypeId).toBe(archetypeId);

      const correction = corrections[exerciseId];
      expect(correction).toBeDefined();
      expect(correction.archetypeId).toBe(archetypeId);
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.sources.length).toBeGreaterThanOrEqual(3);

      const singleCorrection = toSpineMovementDiagramCorrection(exerciseId);
      expect(singleCorrection?.archetypeId).toBe(archetypeId);

      const phaseProps = toSpineMovementPhaseDiagramProps(exerciseId, 'middle');
      expect(phaseProps?.asset.archetypeId).toBe(archetypeId);
      expect(phaseProps?.phase).toBe('middle');

      const triptychProps = toSpineMovementTriptychDiagramProps(exerciseId, 'end');
      expect(triptychProps?.asset.archetypeId).toBe(archetypeId);
      expect(triptychProps?.selectedPhase).toBe('end');
    }
  });

  it('renders SpineArticulationDiagramReference with interactive 3-phase tabs, 3-up strip, wall plumb line, source links, and non-medical notice', () => {
    render(<SpineArticulationDiagramReference movementId="spine-roll-up" initialPhase="start" />);

    expect(screen.getByTestId('spine-articulation-diagram-reference')).toHaveAttribute(
      'data-archetype-id',
      'spine-roll-up',
    );
    expect(screen.getByTestId('spine-svg-spine-roll-up-start')).toBeInTheDocument();

    // All 6 vertebral nodes rendered in primary SVG and readout chips
    for (const vId of SYNTHETIC_SPINE_FIXTURES.expectedVertebrae) {
      expect(screen.getByTestId(`spine-chip-${vId}`)).toBeInTheDocument();
    }

    // Switch phase tab to middle and end
    const middleTab = screen.getByTestId('spine-phase-tab-middle');
    fireEvent.click(middleTab);
    expect(screen.getByTestId('spine-svg-spine-roll-up-middle')).toBeInTheDocument();

    const endTriptychBtn = screen.getByTestId('spine-triptych-phase-end');
    fireEvent.click(endTriptychBtn);
    expect(screen.getByTestId('spine-svg-spine-roll-up-end')).toBeInTheDocument();

    // Switch archetype to Spine Stretch and verify imaginary wall plumb line (x = 58)
    const stretchTab = screen.getByTestId('spine-archetype-tab-spine-stretch');
    fireEvent.click(stretchTab);
    expect(screen.getByTestId('spine-wall-plumb-pill')).toHaveTextContent('x=58');
    expect(screen.getAllByTestId('spine-wall-plumb-line').length).toBeGreaterThan(0);

    // Verify public instructional source links and non-medical notice
    const sourceList = screen.getByTestId('spine-source-list');
    expect(sourceList.querySelectorAll('a').length).toBeGreaterThanOrEqual(3);

    const nonMedicalFooter = screen.getByTestId('spine-non-medical-notice');
    expect(nonMedicalFooter).toHaveTextContent('의학적 진단');
  });

  it('renders standalone SpineArticulationDiagramSvg, SpineArticulationTriptychSvg, SpineArticulationLegend, and SpineI7IntegrationExample', () => {
    const phases: readonly VisualPhaseId[] = ['start', 'middle', 'end'];
    const archetypes: readonly SpineArticulationId[] = [
      'spine-roll-up',
      'spine-roll-down',
      'spine-stretch',
    ];

    for (const archetypeId of archetypes) {
      for (const phase of phases) {
        const { unmount } = render(
          <SpineArticulationDiagramSvg
            movementId={archetypeId}
            phase={phase}
            mirrored={phase === 'end'}
          />,
        );
        expect(screen.getByTestId(`spine-svg-${archetypeId}-${phase}`)).toBeInTheDocument();
        expect(screen.getByTestId('spine-joint-axes')).toBeInTheDocument();
        expect(screen.getByTestId('spine-joint-axis-cervical')).toBeInTheDocument();
        expect(screen.getByTestId('spine-joint-axis-lumbar')).toBeInTheDocument();
        expect(screen.getByTestId('spine-joint-axis-pelvis')).toBeInTheDocument();
        expect(screen.getByTestId('spine-bilateral-far-limbs')).toBeInTheDocument();
        unmount();
      }
    }

    const { unmount: unmountTriptych } = render(
      <SpineArticulationTriptychSvg movementId="ex-spine-02" selectedPhase="middle" />,
    );
    expect(screen.getByTestId('spine-triptych-spine-roll-down')).toBeInTheDocument();
    unmountTriptych();

    const { unmount: unmountLegend } = render(<SpineArticulationLegend />);
    const legend = screen.getByTestId('spine-articulation-legend');
    expect(legend).toBeInTheDocument();
    expect(legend.querySelectorAll('.spine-legend-item')).toHaveLength(6);
    unmountLegend();

    render(<SpineI7IntegrationExample exerciseId="original-mat-spine-stretch-forward" />);
    expect(screen.getByTestId('spine-i7-integration-example')).toBeInTheDocument();
  });
});
