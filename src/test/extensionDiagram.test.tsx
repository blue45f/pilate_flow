import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Point2D, VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  EXTENSION_DIAGRAM_AUDIT_RECORDS,
  EXTENSION_DIAGRAM_CORRECTIONS,
  EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  EXTENSION_PUBLIC_SOURCES,
} from '../data/extensionDiagramSources';
import {
  EXTENSION_ARCHETYPE_KEYS,
  EXTENSION_MOVEMENT_IDS,
  EXTENSION_MOVEMENT_SPECS,
  EXTENSION_VISUAL_ASSETS,
  getExtensionCatalogVisualAssets,
  getExtensionDiagramCorrections,
  getExtensionMovementSpec,
} from '../data/extensionMovementData';
import {
  buildHyperextendedLumbarCounterExample,
  evaluateExtensionPhasePose,
  SUPPORT_SURFACE_ANCHOR_Y,
  verifyExtensionMovementSpec,
  verifyExtensionPhaseAlignment,
} from '../models/extensionMovementModel';
import {
  ExtensionMovementDiagram,
  ExtensionMovementTriptych,
} from '../components/ExtensionMovementDiagram';
import { ExtensionDiagramIntegrationExamples } from '../components/ExtensionDiagramIntegrationExamples';

const PHASES: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

describe('Track I5: Extension 2D Diagrams (Swan & Swimming Family)', () => {
  it('verifies all 8 Extension movement specs across all 3 phases (24 poses) with 0 violations and valid bounds', () => {
    expect(EXTENSION_MOVEMENT_IDS).toHaveLength(8);

    for (const movementId of EXTENSION_MOVEMENT_IDS) {
      const spec = getExtensionMovementSpec(movementId);
      const report = verifyExtensionMovementSpec(spec);

      expect(report.passed).toBe(true);
      expect(report.isValid).toBe(true);
      expect(report.violations).toEqual([]);
      expect(report.pelvicAnchorVerticalDriftPx).toBe(0);
      expect(report.pelvicCarriageSyncDriftPx).toBe(0);

      for (const phaseId of PHASES) {
        const phaseReport = report.phaseReports[phaseId];
        expect(phaseReport.passed).toBe(true);
        expect(phaseReport.pubicAnchorContactValid).toBe(true);
        expect(phaseReport.noLumbarHingeCompression).toBe(true);
        expect(phaseReport.cervicalThoracicContinuityValid).toBe(true);
        expect(phaseReport.axialElongationValid).toBe(true);
        expect(phaseReport.lengthOverHeightValid).toBe(true);

        const joints = spec.phases[phaseId].joints;
        for (const pt of Object.values(joints) as (Point2D | undefined)[]) {
          if (!pt) continue;
          expect(pt.x).toBeGreaterThanOrEqual(16);
          expect(pt.x).toBeLessThanOrEqual(304);
          expect(pt.y).toBeGreaterThanOrEqual(16);
          expect(pt.y).toBeLessThanOrEqual(184);
        }
      }

      // Verify end phase has >= 4px delta from start so [data-pose-delta-vector] renders
      const startJoints = spec.phases.start.joints;
      const endJoints = spec.phases.end.joints;
      const maxEndDelta = Math.max(
        Math.hypot(endJoints.head.x - startJoints.head.x, endJoints.head.y - startJoints.head.y),
        Math.hypot(endJoints.hand.x - startJoints.hand.x, endJoints.hand.y - startJoints.hand.y),
        Math.hypot(
          endJoints.thoracic.x - startJoints.thoracic.x,
          endJoints.thoracic.y - startJoints.thoracic.y,
        ),
        Math.hypot(endJoints.toe.x - startJoints.toe.x, endJoints.toe.y - startJoints.toe.y),
      );
      expect(maxEndDelta).toBeGreaterThanOrEqual(4);
    }
  });

  it('detects biomechanical violations on buildHyperextendedLumbarCounterExample across all 8 movements', () => {
    for (const movementId of EXTENSION_MOVEMENT_IDS) {
      const spec = EXTENSION_MOVEMENT_SPECS[movementId];
      const counterPose = buildHyperextendedLumbarCounterExample(spec.phases.middle);
      const report = verifyExtensionPhaseAlignment(counterPose, {
        supportSurface: spec.supportSurface,
        family: spec.family,
      });

      expect(report.passed).toBe(false);
      expect(report.isValid).toBe(false);
      expect(report.pubicAnchorContactValid).toBe(false);
      expect(report.noLumbarHingeCompression).toBe(false);
      expect(report.cervicalThoracicContinuityValid).toBe(false);
      if (spec.family === 'swimming') {
        expect(report.lengthOverHeightValid).toBe(false);
      }
      expect(report.violations.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('differentiates apparatus support surfaces, pubic anchors, carriage travel, and Swimming vs Swan kinematics', () => {
    // 1) Mat Swan Prep: forearms/hands & ankles stay anchored on mat (y=144..146), no Pulling Straps rear sweep
    const matSwan = EXTENSION_MOVEMENT_SPECS['original-mat-swan-prep'];
    expect(matSwan.supportSurface).toBe('mat');
    expect(matSwan.phases.middle.joints.pelvis).toEqual({ x: 144, y: SUPPORT_SURFACE_ANCHOR_Y.mat });
    expect(matSwan.phases.middle.joints.hand).toEqual(matSwan.phases.start.joints.hand);
    expect(matSwan.phases.middle.joints.elbow).toEqual(matSwan.phases.start.joints.elbow);
    expect(matSwan.phases.middle.joints.ankle).toEqual(matSwan.phases.start.joints.ankle);

    // 2) Mat Swimming Prep: contralateral horizontal reach > 1.5x vertical lift, supporting limbs anchored on mat
    const swimPrep = EXTENSION_MOVEMENT_SPECS['original-mat-swimming-prep'];
    const swimPrepMidReport = verifyExtensionPhaseAlignment(swimPrep.phases.middle);
    expect(swimPrep.family).toBe('swimming');
    expect(swimPrepMidReport.armHorizontalReachPx).toBe(66);
    expect(swimPrepMidReport.armVerticalLiftPx).toBe(27);
    expect(swimPrepMidReport.legHorizontalReachPx).toBe(95);
    expect(swimPrepMidReport.legVerticalLiftPx).toBe(17);
    expect(swimPrep.phases.middle.joints.farWrist?.y).toBe(146);
    expect(swimPrep.phases.middle.joints.farAnkle?.y).toBe(146);

    // 3) Mat Swimming Alternating: reciprocal diagonal flutter A <-> B with stationary pelvis (144, 144)
    const swimAlt = EXTENSION_MOVEMENT_SPECS['extension-mat-swimming-alternating'];
    expect(swimAlt.phases.start.joints.pelvis).toEqual({ x: 144, y: 144 });
    expect(swimAlt.phases.middle.joints.pelvis).toEqual({ x: 144, y: 144 });
    expect(swimAlt.phases.end.joints.pelvis).toEqual({ x: 144, y: 144 });
    // In middle (Diagonal A), near hand is higher (smaller y) than farWrist; in end (Diagonal B), farWrist is higher than near hand
    expect(swimAlt.phases.middle.joints.hand.y).toBeLessThan(
      swimAlt.phases.middle.joints.farWrist!.y,
    );
    expect(swimAlt.phases.end.joints.farWrist!.y).toBeLessThan(
      swimAlt.phases.end.joints.hand.y,
    );
    expect(swimAlt.phases.middle.joints.toe.y).toBeLessThan(
      swimAlt.phases.middle.joints.farToe!.y,
    );
    expect(swimAlt.phases.end.joints.farToe!.y).toBeLessThan(
      swimAlt.phases.end.joints.toe.y,
    );

    // 4) Reformer Long Box Swan Prep vs 5) Reformer Pulling Straps (ex-extension-01)
    const boxSwanPrep = EXTENSION_MOVEMENT_SPECS['original-reformer-box-swan-prep'];
    const pullingStraps = EXTENSION_MOVEMENT_SPECS['ex-extension-01'];
    expect(boxSwanPrep.phases.middle.joints.pelvis.y).toBe(116);
    expect(boxSwanPrep.phases.middle.apparatusState.carriageOffsetPx).toBe(0);
    expect(pullingStraps.phases.start.joints.pelvis).toEqual({ x: 148, y: 116 });
    expect(pullingStraps.phases.middle.apparatusState.carriageOffsetPx).toBe(16);
    expect(pullingStraps.phases.middle.joints.pelvis).toEqual({ x: 164, y: 116 });
    expect(pullingStraps.phases.middle.joints.hand.x).toBeGreaterThan(150);

    // 6) Cadillac Prone Back Reach: fixed table y=142, carriageOffsetPx=0
    const cadillacSwan = EXTENSION_MOVEMENT_SPECS['original-cadillac-prone-back-reach'];
    expect(cadillacSwan.supportSurface).toBe('cadillac-table');
    expect(cadillacSwan.phases.middle.joints.pelvis).toEqual({ x: 146, y: 142 });
    expect(cadillacSwan.phases.middle.apparatusState.carriageOffsetPx).toBe(0);

    // 7) Ladder Barrel Supported Swan vs 8) Ladder Barrel Full Swan (ex-extension-02)
    const barrelPrep = EXTENSION_MOVEMENT_SPECS['original-barrel-supported-swan'];
    const barrelFull = EXTENSION_MOVEMENT_SPECS['ex-extension-02'];
    expect(barrelPrep.phases.middle.joints.pelvis).toEqual({ x: 132, y: 104 });
    expect(barrelPrep.phases.middle.joints.ankle).toEqual({ x: 228, y: 132 });
    expect(barrelFull.phases.middle.joints.pelvis).toEqual({ x: 132, y: 104 });
    expect(barrelFull.phases.middle.joints.ankle).toEqual({ x: 228, y: 132 });
    // Full Swan reaches higher overhead V-position than supported prep
    expect(barrelFull.phases.middle.joints.hand.y).toBeLessThan(
      barrelPrep.phases.middle.joints.hand.y,
    );
  });

  it('exports getExtensionCatalogVisualAssets, getExtensionDiagramCorrections, and truthfulness metadata', () => {
    const assets = getExtensionCatalogVisualAssets();
    const corrections = getExtensionDiagramCorrections();

    expect(EXTENSION_MEDICAL_AND_REVIEW_POLICY.anatomicalAccuracyAssumed).toBe(false);
    expect(EXTENSION_MEDICAL_AND_REVIEW_POLICY.professionalReviewCount).toBe(0);
    expect(EXTENSION_MEDICAL_AND_REVIEW_POLICY.sourceFrameMappings).toBe(0);
    expect(EXTENSION_MEDICAL_AND_REVIEW_POLICY.medicalDiagnosisProhibited).toBe(true);
    expect(EXTENSION_PUBLIC_SOURCES.length).toBeGreaterThanOrEqual(6);

    for (const key of [...EXTENSION_MOVEMENT_IDS, ...EXTENSION_ARCHETYPE_KEYS]) {
      const asset = assets[key];
      const correction = corrections[key];
      expect(asset).toBeDefined();
      expect(correction).toBeDefined();
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.archetypeId).toBe(asset.archetypeId);
      expect(correction.sources.length).toBeGreaterThan(0);
    }

    expect(Object.keys(EXTENSION_VISUAL_ASSETS)).toEqual([...EXTENSION_MOVEMENT_IDS]);
    expect(Object.keys(EXTENSION_DIAGRAM_AUDIT_RECORDS)).toEqual([...EXTENSION_MOVEMENT_IDS]);
    expect(EXTENSION_DIAGRAM_CORRECTIONS['prone-extension'].archetypeId).toBe(
      'mat-swan-prep-isolated',
    );
    expect(EXTENSION_DIAGRAM_CORRECTIONS.swimming.archetypeId).toBe(
      'mat-swimming-prep-isolated',
    );
  });

  it('renders all 24 poses in ExtensionMovementDiagram with pose delta vectors and interactive integration examples', () => {
    for (const movementId of EXTENSION_MOVEMENT_IDS) {
      for (const phaseId of PHASES) {
        const { container, unmount } = render(
          <ExtensionMovementDiagram movementId={movementId} phase={phaseId} />,
        );
        const figure = container.querySelector('[data-component="extension-movement-diagram"]');
        expect(figure).not.toBeNull();
        expect(figure?.getAttribute('data-alignment-passed')).toBe('true');
        expect(
          container.querySelector('[data-extension-support-surface]'),
        ).not.toBeNull();
        expect(
          container.querySelector('[data-layer="extension-thoracic-lumbar-corridor"]'),
        ).not.toBeNull();

        if (phaseId !== 'start') {
          expect(
            container.querySelectorAll('[data-pose-delta-vector]').length,
          ).toBeGreaterThan(0);
        }
        unmount();
      }
    }

    // Evaluate continuous progress & unilateral left-side swap
    const interpPose = evaluateExtensionPhasePose(
      EXTENSION_MOVEMENT_SPECS['original-mat-swimming-prep'],
      { progress: 0.5, activeSide: 'left', mirrored: true },
    );
    expect(interpPose.joints.pelvis.y).toBe(144);

    // Render Triptych and Integration Examples
    const { container, unmount } = render(
      <div>
        <ExtensionMovementTriptych
          movementId="ex-extension-01"
          selectedPhase="middle"
        />
        <ExtensionDiagramIntegrationExamples initialMovementId="original-mat-swimming-prep" />
      </div>,
    );

    expect(screen.getByTestId('extension-policy-notice')).toBeTruthy();
    expect(screen.getByTestId('extension-diagram-legend')).toBeTruthy();
    const counterBtn = screen.getByTestId('toggle-counter-example');
    fireEvent.click(counterBtn);
    expect(
      container.querySelector('[data-counter-example="true"][data-alignment-passed="false"]'),
    ).not.toBeNull();

    const sideBtn = screen.getByTestId('toggle-active-side');
    fireEvent.click(sideBtn);
    unmount();
  });
});
