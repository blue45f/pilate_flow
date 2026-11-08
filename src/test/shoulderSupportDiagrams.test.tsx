import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ShoulderSupportDiagramFigure,
  ShoulderSupportIntegrationDemo,
  ShoulderSupportTriptychDiagram,
} from '../components/ShoulderSupportDiagramFigure';
import {
  getShoulderSupportRegistryIntegrationPayload,
  resolveShoulderSupportDiagramForExercise,
  SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS,
  SHOULDER_SUPPORT_TARGET_EXERCISE_IDS,
  SHOULDER_SUPPORT_VISUAL_ASSETS,
} from '../data/shoulderSupportDiagrams';
import sourceLedger from '../data/shoulderSupportSourceLedger.json';
import {
  getShoulderSupportDraftPose,
  projectShoulderSupportPoint,
  SHOULDER_SUPPORT_LINE_IDS,
  SHOULDER_SUPPORT_MOVEMENT_IDS,
  SHOULDER_SUPPORT_PHASES,
  solveTwoLinkIK,
} from '../models/shoulderSupportDrafts';

describe('Track I6 — Shoulder Support 2D Diagrams (Push Up & Leg Pull Front)', () => {
  it('validates license and source ledger truthfulness metadata', () => {
    const licensePath = path.resolve(
      process.cwd(),
      'src/models/shoulder-support-LICENSE.txt',
    );
    expect(fs.existsSync(licensePath)).toBe(true);
    const licenseText = fs.readFileSync(licensePath, 'utf8');
    expect(licenseText).toContain('SPDX-License-Identifier: MIT');
    expect(licenseText).toContain('anatomicalAccuracyAssumed: false');
    expect(licenseText).toContain('professionalReviewCount: 0');
    expect(licenseText).toContain('sourceFrameMappings: 0');

    expect(sourceLedger.anatomicalAccuracyAssumed).toBe(false);
    expect(sourceLedger.professionalReviewCount).toBe(0);
    expect(sourceLedger.sourceFrameMappings).toBe(0);
    expect(sourceLedger.exactAssetReady).toBe(false);
    expect(sourceLedger.safetyAssessment).toBe('unassessed');

    for (const movementId of SHOULDER_SUPPORT_MOVEMENT_IDS) {
      const entry = sourceLedger.movements[movementId];
      expect(entry.anatomicalAccuracyAssumed).toBe(false);
      expect(entry.professionalReviewCount).toBe(0);
      expect(entry.sourceFrameMappings).toBe(0);
      expect(entry.sources.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('preserves exact two-link IK segment lengths and bone length invariance across all phases', () => {
    const ik = solveTwoLinkIK({ x: 0, y: 0.56 }, { x: 0, y: 0.02 }, 0.28, 0.26, 'posterior');
    expect(ik.reachable).toBe(true);
    expect(ik.actualLength1).toBeCloseTo(0.28, 9);
    expect(ik.actualLength2).toBeCloseTo(0.26, 9);

    for (const movementId of SHOULDER_SUPPORT_MOVEMENT_IDS) {
      const startPose = getShoulderSupportDraftPose(movementId, 'start');
      const middlePose = getShoulderSupportDraftPose(movementId, 'middle');
      const endPose = getShoulderSupportDraftPose(movementId, 'end');
      const continuousPoses = SHOULDER_SUPPORT_PHASES.map((phase) =>
        getShoulderSupportDraftPose(movementId, phase.id),
      );
      const samplePoses = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1].map((p) =>
        getShoulderSupportDraftPose(movementId, p),
      );

      // Hold invariance during setup [0, 0.15] and finish [0.85, 1.0]
      const p0 = getShoulderSupportDraftPose(movementId, 0);
      const p10 = getShoulderSupportDraftPose(movementId, 0.1);
      const p90 = getShoulderSupportDraftPose(movementId, 0.9);
      const p100 = getShoulderSupportDraftPose(movementId, 1);
      expect(p0.worldJoints.shoulder.y).toBeCloseTo(p10.worldJoints.shoulder.y, 9);
      expect(p90.worldJoints.shoulder.y).toBeCloseTo(p100.worldJoints.shoulder.y, 9);
      expect(p0.worldJoints.ankle.y).toBeCloseTo(p100.worldJoints.ankle.y, 9);

      for (const pose of [
        startPose,
        middlePose,
        endPose,
        ...continuousPoses,
        ...samplePoses,
      ]) {
        expect(pose.armIK.reachable).toBe(true);
        expect(pose.metrics.segmentLengthsM.upperArm).toBeCloseTo(
          startPose.metrics.segmentLengthsM.upperArm,
          8,
        );
        expect(pose.metrics.segmentLengthsM.forearm).toBeCloseTo(
          startPose.metrics.segmentLengthsM.forearm,
          8,
        );
        expect(pose.metrics.segmentLengthsM.neck).toBeCloseTo(
          startPose.metrics.segmentLengthsM.neck,
          8,
        );
        expect(pose.metrics.segmentLengthsM.trunk).toBeCloseTo(
          startPose.metrics.segmentLengthsM.trunk,
          8,
        );
        expect(pose.metrics.segmentLengthsM.thigh).toBeCloseTo(
          startPose.metrics.segmentLengthsM.thigh,
          8,
        );
        expect(pose.metrics.segmentLengthsM.shank).toBeCloseTo(
          startPose.metrics.segmentLengthsM.shank,
          8,
        );
        expect(pose.metrics.segmentLengthsPx.upperArm).toBeCloseTo(
          startPose.metrics.segmentLengthsPx.upperArm,
          6,
        );
        expect(pose.metrics.segmentLengthsPx.forearm).toBeCloseTo(
          startPose.metrics.segmentLengthsPx.forearm,
          6,
        );
      }
    }
  });

  it('enforces the 3 biomechanical support alignment invariants for Push Up and Leg Pull Front', () => {
    const pushUpStart = getShoulderSupportDraftPose('shoulder-support-push-up', 'start');
    const pushUpMiddle = getShoulderSupportDraftPose('shoulder-support-push-up', 'middle');
    const pushUpEnd = getShoulderSupportDraftPose('shoulder-support-push-up', 'end');

    // 1. All 3 alignment lines exist and remain within tolerance
    for (const pose of [pushUpStart, pushUpMiddle, pushUpEnd]) {
      expect(pose.supportLines.map((l) => l.id)).toEqual(SHOULDER_SUPPORT_LINE_IDS);
      for (const lineId of SHOULDER_SUPPORT_LINE_IDS) {
        expect(pose.supportLineMap[lineId].withinTolerance).toBe(true);
      }
      // Serratus anterior / scapular protraction without winging or thoracic collapse
      expect(pose.metrics.scapularProtractionIntegrity).toBe(true);
      expect(pose.metrics.scapularWingingOffsetM).toBe(0);
      expect(pose.metrics.thoracicCollapseM).toBe(0);
      // Straight plank line with zero lumbar sag
      expect(pose.metrics.plankCollinear).toBe(true);
      expect(pose.metrics.pelvicLineDeviationM).toBeLessThanOrEqual(1e-6);
      expect(pose.metrics.lumbarSagM).toBe(0);
    }

    // Push-up start/end: vertical wrist stack under shoulder
    expect(pushUpStart.metrics.wristShoulderHorizontalOffsetM).toBeCloseTo(0, 6);
    expect(pushUpEnd.metrics.wristShoulderHorizontalOffsetM).toBeCloseTo(0, 6);

    // Push-up middle: controlled tricep elbow bend tracking posteriorly toward ribs
    expect(pushUpMiddle.worldJoints.elbow.x).toBeGreaterThan(
      pushUpMiddle.worldJoints.shoulder.x,
    );
    expect(pushUpMiddle.worldJoints.shoulder.y).toBeLessThan(
      pushUpStart.worldJoints.shoulder.y,
    );
    expect(pushUpMiddle.jointAxes.elbowInteriorAngleDeg).toBeLessThan(120);
    expect(pushUpMiddle.jointAxes.elbowInteriorAngleDeg).toBeGreaterThan(45);

    // Leg Pull Front invariants
    const legPullStart = getShoulderSupportDraftPose(
      'shoulder-support-leg-pull-front',
      'start',
    );
    const legPullMiddle = getShoulderSupportDraftPose(
      'shoulder-support-leg-pull-front',
      'middle',
    );
    const legPullEnd = getShoulderSupportDraftPose('shoulder-support-leg-pull-front', 'end');

    for (const pose of [legPullStart, legPullMiddle, legPullEnd]) {
      expect(pose.metrics.wristShoulderHorizontalOffsetM).toBeCloseTo(0, 6);
      expect(pose.metrics.scapularProtractionIntegrity).toBe(true);
      expect(pose.metrics.plankCollinear).toBe(true);
      expect(pose.metrics.pelvicLineDeviationM).toBeLessThanOrEqual(1e-6);
      expect(pose.metrics.lumbarSagM).toBe(0);
    }

    // Single-leg hip extension lift in [15°, 22°] above plank line in middle phase
    expect(legPullMiddle.metrics.activeLegLiftDeg).toBeGreaterThanOrEqual(15);
    expect(legPullMiddle.metrics.activeLegLiftDeg).toBeLessThanOrEqual(22);
    expect(legPullMiddle.worldJoints.ankle.y).toBeGreaterThan(
      legPullStart.worldJoints.ankle.y,
    );
    expect(legPullMiddle.jointAxes.ankleReachAngleDeg).toBeGreaterThan(95);

    // Projection mirror invariance check
    const unmirrored = projectShoulderSupportPoint({ x: 0.4, y: 0.3 }, { mirrored: false });
    const mirrored = projectShoulderSupportPoint({ x: 0.4, y: 0.3 }, { mirrored: true });
    expect(unmirrored.x + mirrored.x).toBeCloseTo(320, 6);
    expect(unmirrored.y).toBeCloseTo(mirrored.y, 6);
  });

  it('exposes complete registry integration payload for all 7 target exercise IDs', () => {
    const payload = getShoulderSupportRegistryIntegrationPayload();
    for (const exerciseId of SHOULDER_SUPPORT_TARGET_EXERCISE_IDS) {
      expect(payload.assets[exerciseId]).toBeDefined();
      expect(payload.corrections[exerciseId]).toBeDefined();

      const asset = SHOULDER_SUPPORT_VISUAL_ASSETS[exerciseId];
      const correction = SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS[exerciseId];
      expect(asset.exerciseId).toBe(exerciseId);
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(correction.archetypeId).toBe(asset.archetypeId);
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);

      const resolved = resolveShoulderSupportDiagramForExercise(exerciseId);
      expect(resolved).not.toBeNull();
      expect(resolved?.asset.exerciseId).toBe(exerciseId);
    }
    expect(resolveShoulderSupportDiagramForExercise('unknown-exercise-id')).toBeNull();
  });

  it('verifies static SVG guide files exist and contain all 3 phases and support lines', () => {
    const svgFiles = [
      'public/images/movement-guides/shoulder-support-push-up-guide.svg',
      'public/images/movement-guides/shoulder-support-leg-pull-front-guide.svg',
    ];

    for (const relPath of svgFiles) {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const svgContent = fs.readFileSync(fullPath, 'utf8');
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('id="phase-start"');
      expect(svgContent).toContain('id="phase-middle"');
      expect(svgContent).toContain('id="phase-end"');
      for (const lineId of SHOULDER_SUPPORT_LINE_IDS) {
        expect(svgContent).toContain(`data-support-line="${lineId}"`);
      }
      expect(svgContent).toContain('data-anatomical-accuracy-assumed="false"');
    }
  });

  it('renders ShoulderSupportDiagramFigure, ShoulderSupportTriptychDiagram, legend, source links, and ShoulderSupportIntegrationDemo cleanly', () => {
    const { container } = render(
      <div>
        <ShoulderSupportDiagramFigure
          movementId="shoulder-support-push-up"
          phase="middle"
        />
        <ShoulderSupportTriptychDiagram
          movementId="shoulder-support-leg-pull-front"
          initialPhase="middle"
        />
      </div>,
    );

    const figures = container.querySelectorAll(
      '[data-testid="shoulder-support-diagram-figure"]',
    );
    expect(figures.length).toBe(4);

    for (const lineId of SHOULDER_SUPPORT_LINE_IDS) {
      const lineNode = container.querySelector(`[data-support-line="${lineId}"]`);
      expect(lineNode).not.toBeNull();
      expect(lineNode?.getAttribute('data-within-tolerance')).toBe('true');
    }

    const legend = container.querySelector('[data-testid="shoulder-support-legend"]');
    expect(legend).not.toBeNull();
    expect(legend?.textContent).toContain('손목 수직 지지선');
    expect(legend?.textContent).toContain('견갑 전인·밀착 지지선');
    expect(legend?.textContent).toContain('골반·체간 플랭크 지지선');
    for (const lineId of SHOULDER_SUPPORT_LINE_IDS) {
      expect(legend?.textContent).toContain(lineId);
    }

    const sourcesBlock = container.querySelector('[data-testid="shoulder-support-sources"]');
    expect(sourcesBlock).not.toBeNull();
    const sourceLinks = sourcesBlock?.querySelectorAll('a[href^="https://"]') ?? [];
    expect(sourceLinks.length).toBeGreaterThanOrEqual(3);

    const startBtn = screen.getByRole('button', {
      name: /시작 자세.*프런트 서포트 수직 지지/,
    });
    fireEvent.click(startBtn);
    expect(startBtn.getAttribute('aria-pressed')).toBe('true');

    const demo = render(<ShoulderSupportIntegrationDemo />);
    const demoTriptychs = demo.container.querySelectorAll(
      '[data-testid="shoulder-support-triptych-diagram"]',
    );
    expect(demoTriptychs.length).toBe(2);
  });
});
