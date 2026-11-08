/**
 * SPDX-License-Identifier: MIT
 * Track I2 — Pelvis & Hip 2D Diagram SVG Renderer
 *
 * Original authored 2D SVG schematics for the 7 Pelvis & Hip variants
 * (Mat Pelvic Curl, Mat Bridge, Mat Shoulder Bridge, Reformer Supported Bridge,
 * Reformer Bottom Lift / Hamstring Curl, Cadillac Tower Bar Shoulder Bridge,
 * Cadillac Table Bridge).
 * Not motion-capture or clinical measurement (anatomicalAccuracyAssumed: false).
 */

import React, { useId } from 'react';
import type {
  CatalogMovementVisualAsset,
  Point2D,
  VisualPhaseId,
} from '../data/movementVisualRigCatalog';
import {
  getPelvisHipApparatusGeometry,
  getPelvisHipVisualAsset,
} from '../data/pelvisHipDiagramData';
import { PELVIS_HIP_TRUTHFULNESS_METADATA } from '../data/pelvisHipProvenance';
import {
  computePelvisHipCollinearity,
  computePelvisHipEndSupportCheck,
  resolvePelvisHipVariantId,
  type PelvisHipApparatusGeometry,
} from '../models/pelvisHip2dModel';

export interface PelvisHipDiagramSvgProps {
  readonly variantId?: string;
  readonly asset?: CatalogMovementVisualAsset;
  readonly phase?: VisualPhaseId;
  readonly mirrored?: boolean;
  readonly showAlignment?: boolean;
  readonly showDirection?: boolean;
  readonly showMuscles?: boolean;
  readonly showTruthfulnessCaption?: boolean;
  readonly className?: string;
  readonly label?: string;
}

export interface PelvisHipTriptychSvgProps {
  readonly variantId?: string;
  readonly asset?: CatalogMovementVisualAsset;
  readonly selectedPhase?: VisualPhaseId;
  readonly onSelectPhase?: (phase: VisualPhaseId) => void;
  readonly mirrored?: boolean;
  readonly className?: string;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 200;

function mx(x: number, mirrored: boolean): number {
  const val = mirrored ? VIEWBOX_WIDTH - x : x;
  return Math.round(val * 10) / 10;
}

function mpt(pt: Point2D, mirrored: boolean): Point2D {
  return {
    x: mx(pt.x, mirrored),
    y: Math.round(pt.y * 10) / 10,
  };
}

function buildPolylinePoints(points: readonly Point2D[], mirrored: boolean): string {
  return points
    .map((pt) => {
      const mapped = mpt(pt, mirrored);
      return `${mapped.x},${mapped.y}`;
    })
    .join(' ');
}

function renderSpringCoilPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils = 5,
  amplitude = 3.0,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const nx = -dy / len;
  const ny = dx / len;
  const steps = coils * 2;
  let d = `M ${Math.round(x1 * 10) / 10} ${Math.round(y1 * 10) / 10}`;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const sign = i % 2 === 1 ? 1 : -1;
    const px = x1 + dx * t + nx * amplitude * sign;
    const py = y1 + dy * t + ny * amplitude * sign;
    d += ` L ${Math.round(px * 10) / 10} ${Math.round(py * 10) / 10}`;
  }
  d += ` L ${Math.round(x2 * 10) / 10} ${Math.round(y2 * 10) / 10}`;
  return d;
}

function renderPelvisHipApparatusLayer(
  geometry: PelvisHipApparatusGeometry,
  carriageOffsetPx: number,
  kneePt: Point2D,
  mirrored: boolean,
): React.JSX.Element {
  const p = (x: number, y: number) => mpt({ x, y }, mirrored);

  if (geometry.apparatus === 'mat') {
    const matLeft = Math.min(mx(22, mirrored), mx(298, mirrored));
    const footContact = mpt(geometry.footContactPoint, mirrored);
    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind={geometry.apparatusKind}
        data-support-surface-y={geometry.supportSurfaceY}
      >
        <line
          x1={12}
          y1={176}
          x2={308}
          y2={176}
          stroke="#d6cfc0"
          strokeWidth={1.4}
        />
        <rect
          x={matLeft}
          y={geometry.supportSurfaceY}
          width={276}
          height={8}
          rx={3}
          fill="#8aa699"
          stroke="#2f564b"
          strokeWidth={1.4}
          data-mat-surface="true"
        />
        <circle
          cx={footContact.x}
          cy={footContact.y}
          r={3.4}
          fill="#f4d58d"
          stroke="#705327"
          strokeWidth={1.2}
          data-foot-tripod-anchor="true"
        />
      </g>
    );
  }

  if (geometry.apparatus === 'reformer') {
    const carriageShift = Math.round(carriageOffsetPx * 0.4);
    const carriageStart = 38 + carriageShift;
    const carriageEnd = 216 + carriageShift;
    const cLeft = mx(carriageStart, mirrored);
    const cRight = mx(carriageEnd, mirrored);
    const cMinX = Math.min(cLeft, cRight);
    const cWidth = Math.max(24, Math.abs(cRight - cLeft));
    const shoulderX = mx((geometry.shoulderBlockX ?? 74) + carriageShift, mirrored);
    const headrestX1 = mx(carriageStart + 6, mirrored);
    const headrestX2 = mx(carriageStart + 28, mirrored);
    const stopperX = mx(38, mirrored);
    const footbarBase = p(280, 156);
    const footbarTop = mpt(geometry.footbarPoint ?? { x: 266, y: 126 }, mirrored);
    const springStart = p(carriageEnd, 151);
    const springEnd = p(278, 151);
    const mappedKnee = mpt(kneePt, mirrored);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind={geometry.apparatusKind}
        data-support-surface-y={geometry.supportSurfaceY}
        data-carriage-offset={carriageOffsetPx}
        data-carriage-stopper={geometry.carriageStopperChecked ? 'checked' : 'none'}
        data-headrest={geometry.headrestState}
      >
        <line x1={12} y1={178} x2={308} y2={178} stroke="#d6cfc0" strokeWidth={1.5} />
        <rect
          x={18}
          y={154}
          width={284}
          height={11}
          rx={3}
          fill="#d7c3a3"
          stroke="#8a7254"
          strokeWidth={1.4}
        />
        <line x1={24} y1={151} x2={294} y2={151} stroke="#7a8b84" strokeWidth={2} />
        <path
          d={renderSpringCoilPath(
            springStart.x,
            springStart.y,
            springEnd.x,
            springEnd.y,
            6,
            3.0,
          )}
          fill="none"
          stroke="#9a4220"
          strokeWidth={1.6}
        />
        {/* Home stopper block */}
        <rect
          x={stopperX - 2}
          y={141}
          width={4}
          height={13}
          rx={1}
          fill="#c86d44"
          data-home-stopper="true"
        />
        {/* Sliding carriage bed */}
        <rect
          x={cMinX}
          y={geometry.supportSurfaceY}
          width={cWidth}
          height={9}
          rx={3}
          fill="#6e8c80"
          stroke="#2f564b"
          strokeWidth={1.5}
          data-reformer-carriage="true"
        />
        {/* Flat headrest */}
        <line
          x1={headrestX1}
          y1={geometry.supportSurfaceY}
          x2={headrestX2}
          y2={geometry.supportSurfaceY}
          stroke="#26473d"
          strokeWidth={3.6}
          strokeLinecap="round"
          data-headrest-flat="true"
        />
        {/* Shoulder block */}
        <rect
          x={shoulderX - 4}
          y={131}
          width={8}
          height={12}
          rx={2}
          fill="#43685d"
          stroke="#26473d"
          strokeWidth={1.2}
          data-shoulder-block="true"
        />
        {/* Footbar strut & padded bar */}
        <line
          x1={footbarBase.x}
          y1={footbarBase.y}
          x2={footbarTop.x}
          y2={footbarTop.y}
          stroke="#36594f"
          strokeWidth={3.2}
          strokeLinecap="round"
        />
        <circle
          cx={footbarTop.x}
          cy={footbarTop.y}
          r={4.4}
          fill="#26473d"
          stroke="#f7f5ef"
          strokeWidth={1.2}
          data-reformer-footbar="true"
        />
        {geometry.hasMiniBallProp && (
          <circle
            cx={mappedKnee.x}
            cy={mappedKnee.y + 3}
            r={5.5}
            fill="rgba(200, 109, 68, 0.38)"
            stroke="#9a4220"
            strokeWidth={1.2}
            data-prop="mini-ball"
          />
        )}
      </g>
    );
  }

  // Cadillac: either Tower Bar Shoulder Bridge (`cadillac-tower-bar`) or Table Bridge (`cadillac-table-bridge`)
  const leftPoleX = mx(geometry.verticalPostX ?? 26, mirrored);
  const rightPoleX = mx(294, mirrored);
  const tableMinX = Math.min(mx(22, mirrored), mx(298, mirrored));

  if (geometry.hasAngledTowerBar) {
    const towerPivot = mpt(geometry.towerBarPivot ?? { x: 286, y: 145 }, mirrored);
    const towerTip = mpt(geometry.towerBarTip ?? { x: 240, y: 82 }, mirrored);
    const bottomSpringAnchor = p(294, 145);
    const safetyStrapTop = p(294, 42);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="cadillac-tower-bar"
        data-support-surface-y={geometry.supportSurfaceY}
        data-tower-bar="angled-foot-end"
        data-safety-strap={geometry.hasSafetyStrap ? 'attached' : 'none'}
        data-bottom-spring={geometry.hasBottomSpring ? 'true' : 'false'}
      >
        <line x1={12} y1={182} x2={308} y2={182} stroke="#d6cfc0" strokeWidth={1.5} />
        <rect
          x={tableMinX}
          y={geometry.supportSurfaceY}
          width={276}
          height={10}
          rx={3}
          fill="#759186"
          stroke="#2f564b"
          strokeWidth={1.5}
          data-cadillac-table="true"
        />
        <rect
          x={tableMinX}
          y={geometry.supportSurfaceY + 10}
          width={276}
          height={7}
          rx={2}
          fill="#d3bea0"
          stroke="#8a7254"
          strokeWidth={1.2}
        />
        <line x1={leftPoleX} y1={22} x2={leftPoleX} y2={145} stroke="#5c7068" strokeWidth={3} />
        <line x1={rightPoleX} y1={22} x2={rightPoleX} y2={145} stroke="#5c7068" strokeWidth={3} />
        <line x1={24} y1={22} x2={296} y2={22} stroke="#495e56" strokeWidth={3.4} />
        {/* Angled foot-end tower bar */}
        <line
          x1={towerPivot.x}
          y1={towerPivot.y}
          x2={towerTip.x}
          y2={towerTip.y}
          stroke="#26473d"
          strokeWidth={3.2}
          strokeLinecap="round"
          data-angled-tower-bar="true"
        />
        <circle
          cx={towerTip.x}
          cy={towerTip.y}
          r={4.2}
          fill="#c86d44"
          stroke="#f7f5ef"
          strokeWidth={1.2}
          data-tower-bar-tip="true"
        />
        {/* Bottom-sprung coil */}
        <path
          d={renderSpringCoilPath(
            bottomSpringAnchor.x,
            bottomSpringAnchor.y,
            towerTip.x,
            towerTip.y,
            6,
            2.8,
          )}
          fill="none"
          stroke="#9a4220"
          strokeWidth={1.5}
          data-bottom-spring-coil="true"
        />
        {/* Safety strap */}
        <line
          x1={safetyStrapTop.x}
          y1={safetyStrapTop.y}
          x2={towerTip.x}
          y2={towerTip.y}
          stroke="#6b5840"
          strokeWidth={1.4}
          strokeDasharray="3 2"
          data-safety-strap-line="true"
        />
      </g>
    );
  }

  // Cadillac Table Bridge (`cadillac-table-bridge`)
  const handGrip = p(34, 118);
  const footTableContact = mpt(geometry.footContactPoint, mirrored);

  return (
    <g
      data-layer="apparatus-support"
      data-apparatus-kind="cadillac-table-bridge"
      data-support-surface-y={geometry.supportSurfaceY}
      data-tabletop="horizontal"
      data-vertical-arm-posts="true"
    >
      <line x1={12} y1={182} x2={308} y2={182} stroke="#d6cfc0" strokeWidth={1.5} />
      <rect
        x={tableMinX}
        y={geometry.supportSurfaceY}
        width={276}
        height={10}
        rx={3}
        fill="#759186"
        stroke="#2f564b"
        strokeWidth={1.5}
        data-cadillac-table="true"
      />
      <rect
        x={tableMinX}
        y={geometry.supportSurfaceY + 10}
        width={276}
        height={7}
        rx={2}
        fill="#d3bea0"
        stroke="#8a7254"
        strokeWidth={1.2}
      />
      {/* Vertical upright arm posts */}
      <line
        x1={leftPoleX}
        y1={22}
        x2={leftPoleX}
        y2={145}
        stroke="#35584e"
        strokeWidth={3.8}
        data-upright-arm-post="head-end"
      />
      <line x1={rightPoleX} y1={22} x2={rightPoleX} y2={145} stroke="#5c7068" strokeWidth={3} />
      <line x1={24} y1={22} x2={296} y2={22} stroke="#495e56" strokeWidth={3.4} />
      <circle
        cx={handGrip.x}
        cy={handGrip.y}
        r={3.6}
        fill="#f4d58d"
        stroke="#705327"
        strokeWidth={1.2}
        data-vertical-post-grip="true"
      />
      <circle
        cx={footTableContact.x}
        cy={footTableContact.y}
        r={3.4}
        fill="#f4d58d"
        stroke="#705327"
        strokeWidth={1.2}
        data-table-foot-contact="true"
      />
    </g>
  );
}

export function PelvisHipDiagramSvg({
  variantId,
  asset,
  phase = 'middle',
  mirrored = false,
  showAlignment = true,
  showDirection = true,
  showMuscles = true,
  showTruthfulnessCaption = true,
  className,
  label,
}: PelvisHipDiagramSvgProps): React.JSX.Element {
  const uid = useId();
  const resolvedAsset = asset ?? getPelvisHipVisualAsset(variantId ?? 'original-mat-bridge');
  const resolvedVariantId = resolvePelvisHipVariantId(
    variantId ?? resolvedAsset.exerciseId,
  );
  const geometry = getPelvisHipApparatusGeometry(resolvedVariantId);
  const phaseSpec = resolvedAsset.phases[phase];
  const { joints } = phaseSpec;

  const collinearity = computePelvisHipCollinearity(joints);
  const endSupport = computePelvisHipEndSupportCheck(joints, geometry.supportSurfaceY);

  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const spineChain: readonly Point2D[] = [
    joints.head,
    joints.neck,
    joints.shoulder,
    joints.thoracic,
    joints.lumbar,
    joints.pelvis,
    joints.hip,
  ];
  const armChain: readonly Point2D[] = [
    joints.shoulder,
    joints.elbow,
    joints.wrist,
    joints.hand,
  ];
  const nearLegChain: readonly Point2D[] = [
    joints.hip,
    joints.knee,
    joints.ankle,
    joints.heel,
    joints.toe,
  ];
  const farLegChain: readonly Point2D[] | null =
    joints.farKnee && joints.farAnkle
      ? [
          joints.farHip ?? joints.hip,
          joints.farKnee,
          joints.farAnkle,
          joints.farToe ?? joints.toe,
        ]
      : null;

  const headPt = mpt(joints.head, mirrored);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className={className}
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-variant-id={resolvedVariantId}
      data-exercise-id={resolvedAsset.exerciseId}
      data-archetype-id={resolvedAsset.archetypeId}
      data-phase={phase}
      data-apparatus={resolvedAsset.apparatus}
      data-apparatus-kind={geometry.apparatusKind}
      data-single-leg-extension={geometry.isSingleLegExtension ? 'true' : 'false'}
      data-collinear={collinearity.isCollinear ? 'true' : 'false'}
      data-rib-flare={collinearity.hasRibFlare ? 'true' : 'false'}
      data-end-support-grounded={endSupport.isGroundedOnSupport ? 'true' : 'false'}
      data-anatomical-accuracy-assumed="false"
      data-professional-review-count={PELVIS_HIP_TRUTHFULNESS_METADATA.professionalReviewCount}
      data-source-frame-mappings={PELVIS_HIP_TRUTHFULNESS_METADATA.sourceFrameMappings}
      data-motion-capture-backed="false"
    >
      <title id={titleId}>
        {label ??
          `${resolvedAsset.nameKo} · ${phaseSpec.badgeKo} · 자체 제작 2D 참고 도해 (해부학 미검증)`}
      </title>
      <desc id={descId}>
        {`${phaseSpec.summaryKo} ${PELVIS_HIP_TRUTHFULNESS_METADATA.disclaimerKo}`}
      </desc>

      <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} rx={10} fill="#f7f5ef" />

      {/* Apparatus layer */}
      {renderPelvisHipApparatusLayer(
        geometry,
        phaseSpec.apparatusState.carriageOffsetPx,
        joints.knee,
        mirrored,
      )}

      {/* Alignment guides */}
      {showAlignment && (
        <g data-layer="alignment-guides">
          {phaseSpec.alignments.map((guide) => {
            const from = mpt(guide.from, mirrored);
            const to = mpt(guide.to, mirrored);
            return (
              <line
                key={guide.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#2b6a58"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                data-guide-id={guide.id}
                data-guide-kind={guide.kind}
              />
            );
          })}
        </g>
      )}

      {/* Far leg (supporting leg in single-leg Shoulder Bridge) */}
      {farLegChain && (
        <g
          data-layer="far-leg"
          data-support-leg={geometry.isSingleLegExtension ? 'grounded' : 'paired'}
        >
          <polyline
            points={buildPolylinePoints(farLegChain, mirrored)}
            fill="none"
            stroke="#5a7d6f"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={geometry.isSingleLegExtension ? '4 2' : undefined}
          />
        </g>
      )}

      {/* Muscle highlights */}
      {showMuscles && (
        <g data-layer="muscle-highlights">
          {resolvedAsset.primaryMuscles
            .filter((m) => m.activePhases.includes(phase))
            .map((muscle) => {
              const pts = muscle.anchorJoints
                .map((k) => joints[k])
                .filter((ptVal): ptVal is Point2D => Boolean(ptVal));
              if (pts.length < 2) return null;
              return (
                <polyline
                  key={muscle.muscleGroupId}
                  points={buildPolylinePoints(pts, mirrored)}
                  fill="none"
                  stroke={muscle.role === 'primary' ? 'rgba(200,109,68,0.34)' : 'rgba(43,106,88,0.28)'}
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  data-muscle-group={muscle.muscleGroupId}
                />
              );
            })}
        </g>
      )}

      {/* Spine & Pelvis chain */}
      <g
        data-layer="spine-pelvis-chain"
        data-thoracic-y={joints.thoracic.y}
        data-lumbar-y={joints.lumbar.y}
        data-pelvis-y={joints.pelvis.y}
      >
        <polyline
          points={buildPolylinePoints(spineChain, mirrored)}
          fill="none"
          stroke="#254d45"
          strokeWidth={5.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Near / Working leg */}
      <g
        data-layer="near-leg"
        data-working-leg={geometry.isSingleLegExtension ? 'single-leg-extension' : 'bilateral'}
      >
        <polyline
          points={buildPolylinePoints(nearLegChain, mirrored)}
          fill="none"
          stroke="#c86d44"
          strokeWidth={4.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Arm chain */}
      <g data-layer="arm-chain">
        <polyline
          points={buildPolylinePoints(armChain, mirrored)}
          fill="none"
          stroke="#8a5a3c"
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Head */}
      <circle
        cx={headPt.x}
        cy={headPt.y - 4}
        r={7.5}
        fill="#e5c2a3"
        stroke="#6e4b35"
        strokeWidth={1.5}
        data-joint="head"
      />

      {/* Key Joint Nodes */}
      {(['shoulder', 'thoracic', 'lumbar', 'pelvis', 'hip', 'knee', 'ankle', 'heel', 'hand'] as const).map(
        (jointKey) => {
          const ptVal = mpt(joints[jointKey], mirrored);
          return (
            <circle
              key={jointKey}
              cx={ptVal.x}
              cy={ptVal.y}
              r={jointKey === 'pelvis' || jointKey === 'hip' ? 3.2 : 2.5}
              fill="#faf4e7"
              stroke="#254d45"
              strokeWidth={1.3}
              data-joint={jointKey}
              data-joint-x={joints[jointKey].x}
              data-joint-y={joints[jointKey].y}
            />
          );
        },
      )}

      {/* Direction vectors */}
      {showDirection && (
        <g data-layer="direction-vectors">
          {phaseSpec.directionVectors.map((vec) => (
            <polyline
              key={vec.id}
              points={buildPolylinePoints(vec.points, mirrored)}
              fill="none"
              stroke="#b85d2e"
              strokeWidth={1.8}
              strokeDasharray="2 2"
              data-vector-id={vec.id}
              data-vector-kind={vec.kind}
            />
          ))}
        </g>
      )}

      {/* Fixed anchors */}
      <g data-layer="fixed-anchors">
        {phaseSpec.fixedAnchors.map((anchor) => {
          const ptVal = mpt(anchor.point, mirrored);
          return (
            <circle
              key={anchor.joint}
              cx={ptVal.x}
              cy={ptVal.y}
              r={4.2}
              fill="none"
              stroke="#c86d44"
              strokeWidth={1.2}
              data-fixed-anchor={anchor.joint}
            />
          );
        })}
      </g>

      {/* Header & Truthfulness Caption */}
      {showTruthfulnessCaption && (
        <g data-layer="truthfulness-disclaimer" fontFamily="system-ui, sans-serif">
          <text x={12} y={16} fontSize={8.5} fontWeight={700} fill="#254d45">
            {`${resolvedAsset.nameKo} · ${phaseSpec.shortTitleKo}`}
          </text>
          <text x={12} y={194} fontSize={7} fill="#6c6a61">
            자체 제작 2D 개략도 · 해부학·임상 실측 아님 (전문 감수 0 · 프레임 매핑 0 · 비의료 참고용)
          </text>
        </g>
      )}
    </svg>
  );
}

export function PelvisHipTriptychSvg({
  variantId,
  asset,
  selectedPhase = 'middle',
  onSelectPhase,
  mirrored = false,
  className,
}: PelvisHipTriptychSvgProps): React.JSX.Element {
  const resolvedAsset = asset ?? getPelvisHipVisualAsset(variantId ?? 'original-mat-bridge');
  const phases: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

  return (
    <div
      className={className}
      data-component="pelvis-hip-triptych"
      data-exercise-id={resolvedAsset.exerciseId}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '12px',
        }}
      >
        {phases.map((phaseId) => {
          const isSelected = selectedPhase === phaseId;
          return (
            <div
              key={phaseId}
              data-triptych-phase={phaseId}
              data-selected={isSelected ? 'true' : 'false'}
              onClick={() => onSelectPhase?.(phaseId)}
              style={{
                border: isSelected ? '2px solid #254d45' : '1px solid #d6cfc0',
                borderRadius: '8px',
                padding: '6px',
                background: '#faf8f2',
                cursor: onSelectPhase ? 'pointer' : 'default',
              }}
            >
              <PelvisHipDiagramSvg
                asset={resolvedAsset}
                variantId={resolvedAsset.exerciseId}
                phase={phaseId}
                mirrored={mirrored}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
