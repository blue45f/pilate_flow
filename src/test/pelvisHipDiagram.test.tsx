import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  getPelvisHipApparatusGeometry,
  getPelvisHipCatalogVisualAssets,
  getPelvisHipDiagramCorrections,
  PELVIS_HIP_ARCHETYPE_IDS,
  PELVIS_HIP_VARIANT_IDS,
  resolvePelvisHipCatalogAsset,
  resolvePelvisHipDiagramCorrection,
} from '../data/pelvisHipDiagramData';
import {
  PELVIS_HIP_DEFECT_REMEDIATION_LEDGER,
  PELVIS_HIP_PROVENANCE_SOURCES,
  PELVIS_HIP_TRUTHFULNESS_METADATA,
} from '../data/pelvisHipProvenance';
import {
  computePelvisHipCollinearity,
  computePelvisHipEndSupportCheck,
  evaluatePelvisHipContinuousPose,
  PELVIS_HIP_KINEMATIC_BLUEPRINTS,
  validatePelvisHipVariantAsset,
} from '../models/pelvisHip2dModel';
import {
  PelvisHipDiagramSvg,
  PelvisHipTriptychSvg,
} from '../components/PelvisHipDiagramSvg';
import { PelvisHipIntegrationExamples } from '../components/PelvisHipIntegrationExamples';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';

describe('Track I2: Pelvis & Hip 2D Diagrams (Pelvic Curl & Bridge Family)', () => {
  const catalogAssets = getPelvisHipCatalogVisualAssets();
  const diagramCorrections = getPelvisHipDiagramCorrections();
  const phases: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

  it('exports all 7 Pelvis & Hip variants and 3 archetype keys for Track I7 integration', () => {
    expect(PELVIS_HIP_VARIANT_IDS).toEqual([
      'pelvis-mat-pelvic-curl',
      'original-mat-bridge',
      'pelvis-mat-shoulder-bridge',
      'original-reformer-supported-bridge',
      'ex-bridging-01',
      'ex-bridging-02',
      'original-cadillac-table-bridge',
    ]);
    expect(PELVIS_HIP_ARCHETYPE_IDS).toEqual([
      'pelvis-bridging',
      'pelvis-curl',
      'shoulder-bridge',
    ]);

    for (const id of [...PELVIS_HIP_VARIANT_IDS, ...PELVIS_HIP_ARCHETYPE_IDS]) {
      const asset = catalogAssets[id];
      const correction = diagramCorrections[id];
      expect(asset).toBeDefined();
      expect(correction).toBeDefined();
      expect(correction.archetypeId).toBe(asset.archetypeId);
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.sources.length).toBeGreaterThan(0);
    }
  });

  it('renders all 7 variants across all 3 phases (start, middle, end) in SVG', () => {
    for (const variantId of PELVIS_HIP_VARIANT_IDS) {
      for (const phase of phases) {
        const { unmount } = render(
          <PelvisHipDiagramSvg variantId={variantId} phase={phase} />,
        );
        const svg = screen.getByRole('img');
        expect(svg.getAttribute('data-variant-id')).toBe(variantId);
        expect(svg.getAttribute('data-phase')).toBe(phase);
        expect(svg.getAttribute('data-anatomical-accuracy-assumed')).toBe('false');
        expect(svg.getAttribute('data-professional-review-count')).toBe('0');
        expect(svg.getAttribute('data-motion-capture-backed')).toBe('false');
        unmount();
      }
    }
  });

  it('fixes the legacy end-phase floating spine defect by returning thoracic, lumbar, and pelvis to the support surface (y >= 140)', () => {
    for (const variantId of PELVIS_HIP_VARIANT_IDS) {
      const asset = catalogAssets[variantId];
      const geometry = getPelvisHipApparatusGeometry(variantId);
      const endJoints = asset.phases.end.joints;
      const supportReport = computePelvisHipEndSupportCheck(
        endJoints,
        geometry.supportSurfaceY,
      );

      // Verify thoracic (141..143), lumbar (141..143), pelvis (143..144) are grounded and not floating at 126..138
      expect(endJoints.thoracic.y).toBeGreaterThanOrEqual(141);
      expect(endJoints.thoracic.y).toBeLessThanOrEqual(143);
      expect(endJoints.lumbar.y).toBeGreaterThanOrEqual(141);
      expect(endJoints.lumbar.y).toBeLessThanOrEqual(143);
      expect(endJoints.pelvis.y).toBeGreaterThanOrEqual(143);
      expect(endJoints.pelvis.y).toBeLessThanOrEqual(144);

      expect(supportReport.legacyFloatingDefectResolved).toBe(true);
      expect(supportReport.isGroundedOnSupport).toBe(true);
      expect(geometry.pelvisTiltDegByPhase[2]).toBe(0);
    }
  });

  it('enforces collinear diagonal shoulder-hip-knee alignment without rib flare in the middle phase across all 7 variants', () => {
    for (const variantId of PELVIS_HIP_VARIANT_IDS) {
      const asset = catalogAssets[variantId];
      const middleJoints = asset.phases.middle.joints;
      const collinearity = computePelvisHipCollinearity(middleJoints);

      expect(collinearity.isCollinear).toBe(true);
      expect(collinearity.angularDeviationDeg).toBeLessThanOrEqual(1.5);
      expect(collinearity.hipPerpendicularDistancePx).toBeLessThanOrEqual(2.0);
      expect(collinearity.hasRibFlare).toBe(false);

      const validation = validatePelvisHipVariantAsset(asset);
      expect(validation.isValid).toBe(true);
    }
  });

  it('differentiates Mat Pelvic Curl, Mat Bridge, and Mat Shoulder Bridge (single-leg extension)', () => {
    const pelvicCurlGeo = getPelvisHipApparatusGeometry('pelvis-mat-pelvic-curl');
    const matBridgeGeo = getPelvisHipApparatusGeometry('original-mat-bridge');
    const shoulderBridgeGeo = getPelvisHipApparatusGeometry('pelvis-mat-shoulder-bridge');

    // Pelvic Curl leads with higher initial posterior imprint tilt (8° -> 22° -> 0°)
    expect(pelvicCurlGeo.pelvisTiltDegByPhase).toEqual([8, 22, 0]);
    expect(matBridgeGeo.pelvisTiltDegByPhase).toEqual([0, 18, 0]);

    // Mat Shoulder Bridge has unilateral single-leg extension in middle phase while farAnkle stays on the mat
    expect(shoulderBridgeGeo.isSingleLegExtension).toBe(true);
    const shoulderBridgeMid = catalogAssets['pelvis-mat-shoulder-bridge'].phases.middle.joints;
    expect(shoulderBridgeMid.ankle.y).toBeLessThan(75);
    expect(shoulderBridgeMid.toe.y).toBeLessThan(65);
    expect(shoulderBridgeMid.farAnkle?.y).toBe(146);
  });

  it('differentiates Reformer Supported Bridge vs Reformer Bottom Lift / Hamstring Curl with footbar contact and stopper checks', () => {
    const supportedGeo = getPelvisHipApparatusGeometry(
      'original-reformer-supported-bridge',
    );
    const bottomLiftGeo = getPelvisHipApparatusGeometry('ex-bridging-01');

    expect(supportedGeo.apparatus).toBe('reformer');
    expect(supportedGeo.hasFootbar).toBe(true);
    expect(supportedGeo.headrestState).toBe('flat');
    expect(supportedGeo.carriageStopperChecked).toBe(true);
    expect(supportedGeo.footContactPoint).toEqual({ x: 266, y: 126 });
    expect(supportedGeo.carriageOffsetsPx).toEqual([0, 2, 0]);
    expect(supportedGeo.hasMiniBallProp).toBe(false);

    expect(bottomLiftGeo.apparatus).toBe('reformer');
    expect(bottomLiftGeo.hasFootbar).toBe(true);
    expect(bottomLiftGeo.headrestState).toBe('flat');
    expect(bottomLiftGeo.carriageStopperChecked).toBe(true);
    expect(bottomLiftGeo.carriageOffsetsPx).toEqual([0, 18, 0]);
    expect(bottomLiftGeo.hasMiniBallProp).toBe(true);

    const supportedStart =
      catalogAssets['original-reformer-supported-bridge'].phases.start.joints;
    expect(supportedStart.heel).toEqual({ x: 266, y: 126 });
  });

  it('differentiates Cadillac Tower Bar Shoulder Bridge vs Cadillac Table Bridge apparatus geometries', () => {
    const towerBarGeo = getPelvisHipApparatusGeometry('ex-bridging-02');
    const tableBridgeGeo = getPelvisHipApparatusGeometry(
      'original-cadillac-table-bridge',
    );

    // Cadillac Tower Bar Bridge: angled foot-end tower bar, bottom spring, safety strap, elevated feet
    expect(towerBarGeo.hasAngledTowerBar).toBe(true);
    expect(towerBarGeo.hasSafetyStrap).toBe(true);
    expect(towerBarGeo.hasBottomSpring).toBe(true);
    expect(towerBarGeo.hasVerticalArmPosts).toBe(false);
    const towerMid = catalogAssets['ex-bridging-02'].phases.middle.joints;
    expect(towerMid.ankle.y).toBeLessThanOrEqual(88);
    expect(towerMid.knee.y).toBeLessThan(70);

    // Cadillac Table Bridge: horizontal tabletop foot support, vertical arm posts gripped by hands, no springs
    expect(tableBridgeGeo.hasAngledTowerBar).toBe(false);
    expect(tableBridgeGeo.hasSafetyStrap).toBe(false);
    expect(tableBridgeGeo.hasBottomSpring).toBe(false);
    expect(tableBridgeGeo.hasVerticalArmPosts).toBe(true);
    const tableMid =
      catalogAssets['original-cadillac-table-bridge'].phases.middle.joints;
    expect(tableMid.heel.y).toBe(144);
    expect(tableMid.hand).toEqual({ x: 34, y: 118 });
    expect(
      catalogAssets['original-cadillac-table-bridge'].phases.middle.apparatusState
        .springTensionLevel,
    ).toBe('none');
  });

  it('verifies all 6 public educational/clinical references and non-medical truthfulness metadata', () => {
    expect(PELVIS_HIP_PROVENANCE_SOURCES).toHaveLength(6);
    for (const source of PELVIS_HIP_PROVENANCE_SOURCES) {
      expect(source.url.startsWith('https://')).toBe(true);
      expect(source.rightsPolicy).toBe('link-only-no-media-copy');
      expect(source.applicableVariantIds.length).toBeGreaterThan(0);
    }

    expect(PELVIS_HIP_TRUTHFULNESS_METADATA.professionalReviewCount).toBe(0);
    expect(PELVIS_HIP_TRUTHFULNESS_METADATA.sourceFrameMappings).toBe(0);
    expect(PELVIS_HIP_TRUTHFULNESS_METADATA.anatomicalAccuracyAssumed).toBe(false);
    expect(PELVIS_HIP_TRUTHFULNESS_METADATA.motionCaptureBacked).toBe(false);
    expect(PELVIS_HIP_TRUTHFULNESS_METADATA.medicalOrTherapeuticGuarantee).toBe(false);
    expect(PELVIS_HIP_DEFECT_REMEDIATION_LEDGER).toHaveLength(4);
  });

  it('evaluates continuous 2D poses and renders triptych & integration examples cleanly', () => {
    const startPose = evaluatePelvisHipContinuousPose('pelvis-mat-pelvic-curl', 0);
    const midPose = evaluatePelvisHipContinuousPose('pelvis-mat-pelvic-curl', 0.5);
    const endPose = evaluatePelvisHipContinuousPose('pelvis-mat-pelvic-curl', 1);

    expect(startPose.nearestPhase).toBe('start');
    expect(midPose.nearestPhase).toBe('middle');
    expect(midPose.collinearity.isCollinear).toBe(true);
    expect(endPose.nearestPhase).toBe('end');
    expect(endPose.supportCheck.isGroundedOnSupport).toBe(true);
    expect(endPose.pelvisTiltDeg).toBe(0);
    expect(Object.keys(PELVIS_HIP_KINEMATIC_BLUEPRINTS)).toHaveLength(7);

    expect(resolvePelvisHipCatalogAsset('pelvis-curl')?.exerciseId).toBe('pelvis-curl');
    expect(resolvePelvisHipDiagramCorrection('pelvis-bridging')?.professionalReviewCount).toBe(0);

    const { unmount } = render(<PelvisHipIntegrationExamples />);
    expect(screen.getByTestId('pelvis-hip-disclaimer')).toBeTruthy();

    const cadillacBtn = screen.getByRole('button', {
      name: /캐딜락 테이블 브리지/,
    });
    fireEvent.click(cadillacBtn);
    expect(screen.getByTestId('pelvis-hip-selected-detail')).toBeTruthy();
    unmount();

    const triptychRender = render(
      <PelvisHipTriptychSvg variantId="ex-bridging-02" selectedPhase="end" />,
    );
    const figures = triptychRender.container.querySelectorAll('[data-triptych-phase] > svg');
    expect(figures).toHaveLength(3);
    expect(Array.from(figures, (figure) => figure.getAttribute('data-phase'))).toEqual(['start', 'middle', 'end']);
    triptychRender.unmount();
  });
});
