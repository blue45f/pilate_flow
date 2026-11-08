import React, { useId, useMemo, useState } from 'react';
import {
  calculateCorePhaseJointDelta,
  CORE_ABDOMINAL_DIAGRAM_LIST,
  CORE_ABDOMINAL_DIAGRAM_SPECS,
  getCoreI7RegistryPatch,
  interpolateCorePhaseJoints,
  resolveCoreAbdominalDiagram,
  type CoreAbdominalDiagramSpec,
  type CoreCalloutLabelSpec,
  type CoreContactPointSpec,
  type CoreJointAxisSpec,
  type CoreMovementId,
} from '../data/coreAbdominalDiagrams';
import type {
  MovementDirectionVector,
  Point2D,
  RigJointMap,
  VisualPhaseId,
} from '../data/movementVisualRigCatalog';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
  type MovementPhaseDiagramSvgProps,
  type MovementTriptychDiagramSvgProps,
} from './MovementPhaseDiagramSvg';

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 200;
const MAT_Y = 148;

export interface CoreAbdominalPhaseSvgProps {
  readonly movementId: CoreMovementId | string;
  readonly phase: VisualPhaseId;
  readonly progress01?: number;
  readonly activeSide?: 'left' | 'right';
  readonly mirrored?: boolean;
  readonly showJointAxes?: boolean;
  readonly showContactPoints?: boolean;
  readonly showDirectionVectors?: boolean;
  readonly showMuscles?: boolean;
  readonly showLabels?: boolean;
  readonly showGhostStartPose?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
}

function mx(x: number, mirrored: boolean): number {
  const value = mirrored ? VIEWBOX_WIDTH - x : x;
  return Math.round(value * 10) / 10;
}

function mpt(pt: Point2D, mirrored: boolean): Point2D {
  return {
    x: mx(pt.x, mirrored),
    y: Math.round(pt.y * 10) / 10,
  };
}

function transformJointsForSideAndMirror(
  joints: RigJointMap,
  isUnilateral: boolean,
  activeSide: 'left' | 'right',
  mirrored: boolean,
): RigJointMap {
  const swapLegs = isUnilateral && activeSide === 'right';
  const source: RigJointMap = swapLegs
    ? {
        ...joints,
        hip: joints.farHip ?? joints.hip,
        knee: joints.farKnee ?? joints.knee,
        ankle: joints.farAnkle ?? joints.ankle,
        toe: joints.farToe ?? joints.toe,
        heel: joints.farAnkle
          ? { x: joints.farAnkle.x + 2, y: joints.farAnkle.y + 6 }
          : joints.heel,
        farHip: joints.hip,
        farKnee: joints.knee,
        farAnkle: joints.ankle,
        farToe: joints.toe,
      }
    : joints;

  return {
    head: mpt(source.head, mirrored),
    neck: mpt(source.neck, mirrored),
    shoulder: mpt(source.shoulder, mirrored),
    elbow: mpt(source.elbow, mirrored),
    wrist: mpt(source.wrist, mirrored),
    hand: mpt(source.hand, mirrored),
    thoracic: mpt(source.thoracic, mirrored),
    lumbar: mpt(source.lumbar, mirrored),
    pelvis: mpt(source.pelvis, mirrored),
    hip: mpt(source.hip, mirrored),
    knee: mpt(source.knee, mirrored),
    ankle: mpt(source.ankle, mirrored),
    heel: mpt(source.heel, mirrored),
    toe: mpt(source.toe, mirrored),
    farShoulder: source.farShoulder ? mpt(source.farShoulder, mirrored) : undefined,
    farElbow: source.farElbow ? mpt(source.farElbow, mirrored) : undefined,
    farWrist: source.farWrist ? mpt(source.farWrist, mirrored) : undefined,
    farHip: source.farHip ? mpt(source.farHip, mirrored) : undefined,
    farKnee: source.farKnee ? mpt(source.farKnee, mirrored) : undefined,
    farAnkle: source.farAnkle ? mpt(source.farAnkle, mirrored) : undefined,
    farToe: source.farToe ? mpt(source.farToe, mirrored) : undefined,
  };
}

function buildArcPath(
  center: Point2D,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
  mirrored: boolean,
): string {
  const sDeg = mirrored ? 180 - endAngleDeg : startAngleDeg;
  const eDeg = mirrored ? 180 - startAngleDeg : endAngleDeg;
  const startRad = (sDeg * Math.PI) / 180;
  const endRad = (eDeg * Math.PI) / 180;
  const x1 = Math.round((center.x + radius * Math.cos(startRad)) * 10) / 10;
  const y1 = Math.round((center.y + radius * Math.sin(startRad)) * 10) / 10;
  const x2 = Math.round((center.x + radius * Math.cos(endRad)) * 10) / 10;
  const y2 = Math.round((center.y + radius * Math.sin(endRad)) * 10) / 10;
  const largeArc = Math.abs(eDeg - sDeg) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function buildCurvePath(points: readonly Point2D[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  return `M ${points[0].x} ${points[0].y} Q ${points[1].x} ${points[1].y} ${points[2].x} ${points[2].y}`;
}

function renderContactMarker(
  cp: CoreContactPointSpec,
  mirrored: boolean,
): React.ReactNode {
  const p = mpt(cp.point, mirrored);
  if (cp.state === 'anchored-mat') {
    return (
      <g
        key={cp.id}
        data-testid={`core-contact-${cp.id}`}
        data-contact-state={cp.state}
      >
        <circle
          cx={p.x}
          cy={p.y}
          r={6.5}
          fill="rgba(31, 111, 84, 0.16)"
          stroke="#1f6f54"
          strokeWidth={1.5}
        />
        <circle cx={p.x} cy={p.y} r={2.8} fill="#1f6f54" />
      </g>
    );
  }
  if (cp.state === 'hand-shin-clasp') {
    return (
      <g
        key={cp.id}
        data-testid={`core-contact-${cp.id}`}
        data-contact-state={cp.state}
      >
        <circle
          cx={p.x}
          cy={p.y}
          r={7}
          fill="rgba(200, 109, 45, 0.2)"
          stroke="#c86d2d"
          strokeWidth={1.8}
          strokeDasharray="3 1.5"
        />
        <circle cx={p.x} cy={p.y} r={3} fill="#c86d2d" />
      </g>
    );
  }
  if (cp.state === 'scapular-tip-hinge') {
    return (
      <g
        key={cp.id}
        data-testid={`core-contact-${cp.id}`}
        data-contact-state={cp.state}
      >
        <polygon
          points={`${p.x},${p.y - 5.5} ${p.x + 5.5},${p.y} ${p.x},${p.y + 5.5} ${p.x - 5.5},${p.y}`}
          fill="rgba(15, 118, 110, 0.22)"
          stroke="#0f766e"
          strokeWidth={1.5}
        />
      </g>
    );
  }
  return (
    <g
      key={cp.id}
      data-testid={`core-contact-${cp.id}`}
      data-contact-state={cp.state}
    >
      <circle
        cx={p.x}
        cy={p.y}
        r={5}
        fill="rgba(71, 85, 105, 0.12)"
        stroke="#475569"
        strokeWidth={1.2}
        strokeDasharray="2 2"
      />
    </g>
  );
}

export const CoreAbdominalPhaseSvg: React.FC<CoreAbdominalPhaseSvgProps> = ({
  movementId,
  phase,
  progress01,
  activeSide = 'left',
  mirrored = false,
  showJointAxes = true,
  showContactPoints = true,
  showDirectionVectors = true,
  showMuscles = true,
  showLabels = true,
  showGhostStartPose = true,
  compact = false,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const spec: CoreAbdominalDiagramSpec =
    resolveCoreAbdominalDiagram(movementId) ?? CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'];
  const phaseDetail = spec.phaseDetails[phase];

  const rawJoints = useMemo(() => {
    if (typeof progress01 === 'number' && Number.isFinite(progress01)) {
      return interpolateCorePhaseJoints(spec, progress01);
    }
    return phaseDetail.poseSpec.joints;
  }, [spec, phaseDetail, progress01]);

  const joints = useMemo(
    () =>
      transformJointsForSideAndMirror(
        rawJoints,
        spec.catalogVisualAsset.isUnilateral,
        activeSide,
        mirrored,
      ),
    [rawJoints, spec.catalogVisualAsset.isUnilateral, activeSide, mirrored],
  );

  const ghostJoints = useMemo(
    () =>
      transformJointsForSideAndMirror(
        spec.phaseDetails.start.poseSpec.joints,
        spec.catalogVisualAsset.isUnilateral,
        activeSide,
        mirrored,
      ),
    [spec, activeSide, mirrored],
  );

  const arrowMarkerId = `core-arrow-${uid}`;
  const pumpMarkerId = `core-pump-${uid}`;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label={`${spec.nameKo} (${spec.nameEn}) - ${phaseDetail.poseSpec.badgeKo} 2D 도해`}
      data-testid={`core-phase-svg-${spec.coreId}-${phase}`}
      data-core-id={spec.coreId}
      data-phase={phase}
      data-active-side={activeSide}
      data-mirrored={String(mirrored)}
      className={`w-full h-auto select-none rounded-xl border border-stone-200/90 bg-[#faf7f2] ${className}`}
    >
      <defs>
        <marker
          id={arrowMarkerId}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5.5"
          markerHeight="5.5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#b45309" />
        </marker>
        <marker
          id={pumpMarkerId}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#1d4ed8" />
        </marker>
      </defs>

      {/* Background Reference Grid & Studio Mat */}
      <g data-testid="core-studio-mat-layer">
        <line
          x1={16}
          y1={68}
          x2={304}
          y2={68}
          stroke="#e7e0d6"
          strokeWidth={0.75}
          strokeDasharray="3 3"
        />
        <line
          x1={16}
          y1={108}
          x2={304}
          y2={108}
          stroke="#e7e0d6"
          strokeWidth={0.75}
          strokeDasharray="3 3"
        />
        <rect
          x={20}
          y={MAT_Y}
          width={280}
          height={8}
          rx={4}
          fill="#d6ccc2"
          stroke="#a89f91"
          strokeWidth={1}
        />
        <rect
          x={mx(96, mirrored) < mx(164, mirrored) ? mx(96, mirrored) : mx(164, mirrored)}
          y={MAT_Y - 3}
          width={68}
          height={6}
          rx={3}
          fill="rgba(31, 111, 84, 0.25)"
          stroke="#1f6f54"
          strokeWidth={1}
        />
      </g>

      {/* Optional Start Pose Ghost Overlay */}
      {showGhostStartPose && phase !== 'start' && (
        <g
          data-testid="core-ghost-start-pose"
          opacity={0.34}
          stroke="#64748b"
          strokeDasharray="2.5 2.5"
          fill="none"
        >
          <path
            d={`M ${ghostJoints.head.x} ${ghostJoints.head.y} L ${ghostJoints.neck.x} ${ghostJoints.neck.y} L ${ghostJoints.shoulder.x} ${ghostJoints.shoulder.y} L ${ghostJoints.thoracic.x} ${ghostJoints.thoracic.y} L ${ghostJoints.lumbar.x} ${ghostJoints.lumbar.y} L ${ghostJoints.pelvis.x} ${ghostJoints.pelvis.y}`}
            strokeWidth={3}
          />
          <path
            d={`M ${ghostJoints.hip.x} ${ghostJoints.hip.y} L ${ghostJoints.knee.x} ${ghostJoints.knee.y} L ${ghostJoints.ankle.x} ${ghostJoints.ankle.y} L ${ghostJoints.toe.x} ${ghostJoints.toe.y}`}
            strokeWidth={2.5}
          />
          <path
            d={`M ${ghostJoints.shoulder.x} ${ghostJoints.shoulder.y} L ${ghostJoints.elbow.x} ${ghostJoints.elbow.y} L ${ghostJoints.wrist.x} ${ghostJoints.wrist.y} L ${ghostJoints.hand.x} ${ghostJoints.hand.y}`}
            strokeWidth={2}
          />
        </g>
      )}

      {/* Muscle Activation Highlights */}
      {showMuscles && (
        <g data-testid="core-muscle-layer">
          <path
            d={`M ${joints.thoracic.x} ${joints.thoracic.y} Q ${joints.lumbar.x} ${joints.lumbar.y - 10} ${joints.pelvis.x} ${joints.pelvis.y}`}
            stroke="rgba(43, 106, 88, 0.35)"
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={`M ${joints.shoulder.x} ${joints.shoulder.y} Q ${joints.thoracic.x + (mirrored ? -8 : 8)} ${joints.thoracic.y - 12} ${joints.pelvis.x} ${joints.pelvis.y - 4}`}
            stroke="rgba(200, 109, 68, 0.42)"
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
          <line
            x1={joints.hip.x}
            y1={joints.hip.y}
            x2={joints.knee.x}
            y2={joints.knee.y}
            stroke="rgba(43, 106, 88, 0.28)"
            strokeWidth={9}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Far-Side Contralateral Limb Layer */}
      <g data-testid="core-far-limbs-layer" opacity={0.62}>
        {joints.farHip && joints.farKnee && joints.farAnkle && joints.farToe && (
          <>
            <path
              d={`M ${joints.farHip.x} ${joints.farHip.y} L ${joints.farKnee.x} ${joints.farKnee.y} L ${joints.farAnkle.x} ${joints.farAnkle.y} L ${joints.farToe.x} ${joints.farToe.y}`}
              stroke="#6b7280"
              strokeWidth={5.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx={joints.farKnee.x} cy={joints.farKnee.y} r={3} fill="#4b5563" />
            <circle cx={joints.farAnkle.x} cy={joints.farAnkle.y} r={2.5} fill="#4b5563" />
          </>
        )}
        {joints.farShoulder && joints.farElbow && joints.farWrist && (
          <path
            d={`M ${joints.farShoulder.x} ${joints.farShoulder.y} L ${joints.farElbow.x} ${joints.farElbow.y} L ${joints.farWrist.x} ${joints.farWrist.y}`}
            stroke="#6b7280"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </g>

      {/* Primary Near-Side Anatomical Silhouette */}
      <g data-testid="core-near-body-layer">
        <path
          d={`M ${joints.shoulder.x} ${joints.shoulder.y} Q ${joints.thoracic.x} ${joints.thoracic.y} ${joints.lumbar.x} ${joints.lumbar.y} L ${joints.pelvis.x} ${joints.pelvis.y}`}
          stroke="#1e293b"
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line
          x1={joints.shoulder.x}
          y1={joints.shoulder.y}
          x2={joints.neck.x}
          y2={joints.neck.y}
          stroke="#1e293b"
          strokeWidth={5.5}
          strokeLinecap="round"
        />
        <circle
          cx={joints.head.x}
          cy={joints.head.y}
          r={10.5}
          fill="#f8fafc"
          stroke="#1e293b"
          strokeWidth={3}
        />
        <line
          x1={joints.head.x + (mirrored ? -4 : 4)}
          y1={joints.head.y + 2}
          x2={joints.head.x + (mirrored ? -11 : 11)}
          y2={joints.head.y + 6}
          stroke="#0f766e"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <path
          d={`M ${joints.hip.x} ${joints.hip.y} L ${joints.knee.x} ${joints.knee.y} L ${joints.ankle.x} ${joints.ankle.y}`}
          stroke="#0f172a"
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d={`M ${joints.ankle.x} ${joints.ankle.y} L ${joints.heel.x} ${joints.heel.y} L ${joints.toe.x} ${joints.toe.y} Z`}
          fill="#0f172a"
          stroke="#0f172a"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <path
          d={`M ${joints.shoulder.x} ${joints.shoulder.y} L ${joints.elbow.x} ${joints.elbow.y} L ${joints.wrist.x} ${joints.wrist.y} L ${joints.hand.x} ${joints.hand.y}`}
          stroke="#334155"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {(
          ['shoulder', 'thoracic', 'lumbar', 'pelvis', 'hip', 'knee', 'ankle', 'wrist', 'hand'] as const
        ).map((key) => {
          const p = joints[key];
          return (
            <circle
              key={key}
              cx={p.x}
              cy={p.y}
              r={2.8}
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth={1.5}
            />
          );
        })}
      </g>

      {/* Movement-Specific Biomechanical Overlay */}
      <g data-testid={`core-special-overlay-${phaseDetail.specialOverlayKind}`}>
        {phaseDetail.specialOverlayKind === 'hundred-pump-oscillation' && (
          <>
            <line
              x1={joints.shoulder.x}
              y1={joints.shoulder.y}
              x2={joints.hand.x}
              y2={joints.hand.y - 12}
              stroke="#1d4ed8"
              strokeWidth={1.4}
              strokeDasharray="2.5 2"
            />
            <line
              x1={joints.shoulder.x}
              y1={joints.shoulder.y}
              x2={joints.hand.x}
              y2={joints.hand.y + 8}
              stroke="#1d4ed8"
              strokeWidth={1.4}
              strokeDasharray="2.5 2"
            />
            <path
              d={`M ${joints.hand.x + (mirrored ? -8 : 8)} ${joints.hand.y - 13} L ${joints.hand.x + (mirrored ? -8 : 8)} ${joints.hand.y + 9}`}
              stroke="#1d4ed8"
              strokeWidth={1.8}
              markerStart={`url(#${pumpMarkerId})`}
              markerEnd={`url(#${pumpMarkerId})`}
            />
          </>
        )}

        {(phaseDetail.specialOverlayKind === 'sls-shin-clasp-prep' ||
          phaseDetail.specialOverlayKind === 'sls-reciprocal-scissors' ||
          phaseDetail.specialOverlayKind === 'sls-switch-return' ||
          phaseDetail.specialOverlayKind === 'dls-compact-shin-hug' ||
          phaseDetail.specialOverlayKind === 'dls-wide-arm-circle-return') && (
          <line
            x1={joints.wrist.x}
            y1={joints.wrist.y}
            x2={joints.hand.x}
            y2={joints.hand.y}
            stroke="#c86d2d"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}

        {phaseDetail.specialOverlayKind === 'dls-opposing-overhead-reach' && (
          <line
            x1={joints.hand.x}
            y1={joints.hand.y}
            x2={joints.toe.x}
            y2={joints.toe.y}
            stroke="#b45309"
            strokeWidth={1.3}
            strokeDasharray="4 3"
          />
        )}

        {phaseDetail.specialOverlayKind === 'dls-wide-arm-circle-return' && (
          <path
            d={`M ${mx(24, mirrored)} 58 Q ${mx(88, mirrored)} 138 ${joints.hand.x} ${joints.hand.y}`}
            stroke="#1d4ed8"
            strokeWidth={1.8}
            strokeDasharray="3.5 2.5"
            fill="none"
            markerEnd={`url(#${pumpMarkerId})`}
          />
        )}
      </g>

      {/* Joint Axes Layer */}
      {showJointAxes && (
        <g data-testid="core-joint-axes-layer">
          {phaseDetail.jointAxes.map((axis: CoreJointAxisSpec) => {
            const center = mpt(axis.pivot, mirrored);
            const arcD = buildArcPath(
              center,
              axis.radiusPx,
              axis.startAngleDeg,
              axis.endAngleDeg,
              mirrored,
            );
            return (
              <g key={axis.id} data-testid={`core-axis-${axis.id}`}>
                <path
                  d={arcD}
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  fill="none"
                />
                <circle
                  cx={center.x}
                  cy={center.y}
                  r={3.2}
                  fill="#1d4ed8"
                />
                {!compact && (
                  <text
                    x={center.x + (mirrored ? -8 : 8)}
                    y={center.y - 8}
                    fontSize={7.5}
                    fontWeight={700}
                    fill="#1e3a8a"
                  >
                    {axis.nominalAngleText}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* Contact Points Layer */}
      {showContactPoints && (
        <g data-testid="core-contact-points-layer">
          {phaseDetail.contactPoints.map((cp: CoreContactPointSpec) =>
            renderContactMarker(cp, mirrored),
          )}
        </g>
      )}

      {/* Movement Direction Vectors Layer */}
      {showDirectionVectors && (
        <g data-testid="core-direction-vectors-layer">
          {phaseDetail.poseSpec.directionVectors.map((vec: MovementDirectionVector) => {
            const pts = vec.points.map((p) => mpt(p, mirrored));
            const d = buildCurvePath(pts);
            return (
              <path
                key={vec.id}
                data-testid={`core-vector-${vec.id}`}
                d={d}
                stroke="#b45309"
                strokeWidth={2.2}
                fill="none"
                markerEnd={`url(#${arrowMarkerId})`}
              />
            );
          })}
        </g>
      )}

      {/* Callout Labels Layer */}
      {showLabels && !compact && (
        <g data-testid="core-callout-labels-layer">
          {phaseDetail.calloutLabels.map((lbl: CoreCalloutLabelSpec) => {
            const anchor = mpt(lbl.anchorPoint, mirrored);
            const box = mpt(lbl.labelBoxPoint, mirrored);
            const boxX = mirrored ? Math.max(8, box.x - 118) : box.x;
            const strokeColor =
              lbl.tone === 'anchor'
                ? '#1f6f54'
                : lbl.tone === 'axis'
                  ? '#1d4ed8'
                  : '#b45309';

            return (
              <g key={lbl.id} data-testid={`core-label-${lbl.id}`}>
                <line
                  x1={anchor.x}
                  y1={anchor.y}
                  x2={boxX + 12}
                  y2={box.y}
                  stroke={strokeColor}
                  strokeWidth={0.9}
                  strokeDasharray="2 2"
                />
                <rect
                  x={boxX}
                  y={box.y - 10}
                  width={126}
                  height={lbl.subtextKo ? 22 : 14}
                  rx={4}
                  fill="rgba(255, 255, 255, 0.92)"
                  stroke={strokeColor}
                  strokeWidth={0.9}
                />
                <text
                  x={boxX + 5}
                  y={box.y - 0.5}
                  fontSize={7.4}
                  fontWeight={700}
                  fill="#1c1917"
                >
                  {lbl.textKo}
                </text>
                {lbl.subtextKo && (
                  <text
                    x={boxX + 5}
                    y={box.y + 8.5}
                    fontSize={6.5}
                    fill="#57534e"
                  >
                    {lbl.subtextKo}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
};

export interface CoreAbdominalTriptychFigureProps {
  readonly initialMovementId?: CoreMovementId | string;
  readonly initialPhase?: VisualPhaseId;
  readonly allowMovementSwitch?: boolean;
  readonly className?: string;
}

const PHASES: readonly VisualPhaseId[] = ['start', 'middle', 'end'] as const;

export const CoreAbdominalTriptychFigure: React.FC<
  CoreAbdominalTriptychFigureProps
> = ({
  initialMovementId = 'core-hundred',
  initialPhase = 'middle',
  allowMovementSwitch = true,
  className = '',
}) => {
  const initialSpec =
    resolveCoreAbdominalDiagram(initialMovementId) ??
    CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'];

  const [selectedCoreId, setSelectedCoreId] = useState<CoreMovementId>(
    initialSpec.coreId,
  );
  const [selectedPhase, setSelectedPhase] = useState<VisualPhaseId>(initialPhase);
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [showJointAxes, setShowJointAxes] = useState<boolean>(true);
  const [showContactPoints, setShowContactPoints] = useState<boolean>(true);
  const [showDirectionVectors, setShowDirectionVectors] = useState<boolean>(true);
  const [showMuscles, setShowMuscles] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showGhostStartPose, setShowGhostStartPose] = useState<boolean>(true);

  const spec = CORE_ABDOMINAL_DIAGRAM_SPECS[selectedCoreId];
  const focusedDetail = spec.phaseDetails[selectedPhase];
  const startToMiddleDelta = useMemo(
    () => calculateCorePhaseJointDelta(spec, 'start', 'middle'),
    [spec],
  );
  const middleToEndDelta = useMemo(
    () => calculateCorePhaseJointDelta(spec, 'middle', 'end'),
    [spec],
  );

  return (
    <section
      aria-label={`${spec.nameKo} (${spec.nameEn}) 복부 안정 2D 도해`}
      data-testid={`core-triptych-figure-${spec.coreId}`}
      className={`rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 shadow-sm space-y-5 text-stone-800 ${className}`}
    >
      {/* Header & Movement Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-stone-200 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <span>I4 복부 안정 2D 도해</span>
            <span>·</span>
            <span>{spec.seriesBadgeKo}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">
            {spec.nameKo}{' '}
            <span className="text-sm font-medium text-stone-500">
              ({spec.nameEn} · ID: {spec.primaryExerciseId})
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            {spec.summaryKo}
          </p>
        </div>

        {allowMovementSwitch && (
          <div
            role="tablist"
            aria-label="복부 안정 동작 선택"
            className="flex flex-wrap gap-1.5"
          >
            {CORE_ABDOMINAL_DIAGRAM_LIST.map((item) => {
              const active = item.coreId === selectedCoreId;
              return (
                <button
                  key={item.coreId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`core-switch-${item.coreId}`}
                  onClick={() => setSelectedCoreId(item.coreId)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {item.orderIndex}. {item.nameKo}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls Bar: Side, Mirror, Layer Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3 border border-stone-200/80 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-stone-700 mr-1">기준 측/반전:</span>
          <button
            type="button"
            data-testid="core-toggle-side"
            onClick={() =>
              setActiveSide((prev) => (prev === 'left' ? 'right' : 'left'))
            }
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-100"
          >
            {activeSide === 'left' ? '좌측 기준 (Left)' : '우측 기준 (Right)'}
          </button>
          <button
            type="button"
            data-testid="core-toggle-mirror"
            aria-pressed={mirrored}
            onClick={() => setMirrored((prev) => !prev)}
            className={`rounded-md border px-2.5 py-1 font-medium ${
              mirrored
                ? 'border-amber-600 bg-amber-50 text-amber-900'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            좌우 미러링 {mirrored ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['axes', '관절축', showJointAxes, setShowJointAxes],
              ['contacts', '접촉점', showContactPoints, setShowContactPoints],
              ['vectors', '방향 벡터', showDirectionVectors, setShowDirectionVectors],
              ['muscles', '근육 활성', showMuscles, setShowMuscles],
              ['labels', '레이블', showLabels, setShowLabels],
              ['ghost', '시작 고스트', showGhostStartPose, setShowGhostStartPose],
            ] as const
          ).map(([key, label, value, setter]) => (
            <button
              key={key}
              type="button"
              data-testid={`core-layer-toggle-${key}`}
              aria-pressed={value}
              onClick={() => setter((prev: boolean) => !prev)}
              className={`rounded-md px-2 py-1 font-medium border ${
                value
                  ? 'border-stone-800 bg-stone-800 text-white'
                  : 'border-stone-300 bg-white text-stone-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Phase Triptych Grid (Start / Middle / End) */}
      <div
        data-testid="core-triptych-grid"
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {PHASES.map((phaseKey) => {
          const detail = spec.phaseDetails[phaseKey];
          const isSelected = selectedPhase === phaseKey;
          return (
            <article
              key={phaseKey}
              data-testid={`core-phase-card-${phaseKey}`}
              onClick={() => setSelectedPhase(phaseKey)}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                isSelected
                  ? 'border-stone-900 bg-stone-50/90 ring-2 ring-stone-900/15'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center rounded-md bg-stone-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {detail.poseSpec.badgeKo}
                </span>
                <span className="text-[11px] font-medium text-stone-500">
                  축 {detail.jointAxes.length} · 접촉 {detail.contactPoints.length}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 mb-2">
                {detail.poseSpec.shortTitleKo}
              </h3>

              <CoreAbdominalPhaseSvg
                movementId={spec.coreId}
                phase={phaseKey}
                activeSide={activeSide}
                mirrored={mirrored}
                showJointAxes={showJointAxes}
                showContactPoints={showContactPoints}
                showDirectionVectors={showDirectionVectors}
                showMuscles={showMuscles}
                showLabels={showLabels}
                showGhostStartPose={showGhostStartPose}
              />

              <p className="mt-2.5 text-xs text-stone-600 leading-relaxed">
                {detail.poseSpec.summaryKo}
              </p>
              <div className="mt-2 rounded-lg bg-amber-50/80 border border-amber-200/80 px-2.5 py-1.5 text-[11px] font-medium text-amber-900">
                호흡 큐: {detail.poseSpec.breathCueKo}
              </div>
            </article>
          );
        })}
      </div>

      {/* Focused Phase Verification: Joint Axes & Contact Points */}
      <div
        data-testid="core-focused-verification-panel"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 rounded-xl border border-stone-200 bg-stone-50/70 p-4"
      >
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            [{focusedDetail.poseSpec.badgeKo}] 관절축 검증 ({focusedDetail.jointAxes.length}개)
          </h4>
          <ul className="space-y-2 text-xs">
            {focusedDetail.jointAxes.map((axis) => (
              <li
                key={axis.id}
                className="rounded-lg border border-stone-200 bg-white p-2.5"
              >
                <div className="flex items-center justify-between font-semibold text-blue-900">
                  <span>{axis.labelKo}</span>
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-800">
                    {axis.nominalAngleText} · {axis.planeKo}
                  </span>
                </div>
                <p className="mt-1 text-stone-600">{axis.biomechanicalRuleKo}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            [{focusedDetail.poseSpec.badgeKo}] 접촉점·앵커 검증 ({focusedDetail.contactPoints.length}개)
          </h4>
          <ul className="space-y-2 text-xs">
            {focusedDetail.contactPoints.map((cp) => (
              <li
                key={cp.id}
                className="rounded-lg border border-stone-200 bg-white p-2.5"
              >
                <div className="flex items-center justify-between font-semibold text-emerald-900">
                  <span>{cp.labelKo}</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-800">
                    {cp.surfaceKo} ({cp.point.x}, {cp.point.y})
                  </span>
                </div>
                <p className="mt-1 text-stone-600">{cp.verificationRuleKo}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Kinematic Delta & Audit Defect Resolution */}
      <div className="rounded-xl border border-stone-200 bg-white p-3.5 text-xs space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-stone-800">
          <span>동작 단계별 변위 요약 및 감사 교정 내역</span>
          <span className="text-stone-500">
            Start→Middle 총 변위 {startToMiddleDelta.totalDisplacementPx}px (손 {startToMiddleDelta.handDeltaPx}px · 발목 {startToMiddleDelta.ankleDeltaPx}px · 요추 흔들림 {startToMiddleDelta.lumbarAnchorDriftPx}px) / Middle→End {middleToEndDelta.totalDisplacementPx}px
          </span>
        </div>
        <p className="text-stone-600">{spec.resolvedAuditDefectKo}</p>
      </div>

      {/* Legend Panel */}
      <div
        data-testid="core-diagram-legend"
        className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2.5"
      >
        <h4 className="text-xs font-bold text-stone-800">
          도해 범례 (관절축 · 접촉점 · 이동 방향 · 근육 활성 · 시작 고스트)
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {spec.legendItems.map((item) => (
            <div
              key={item.id}
              data-testid={`core-legend-item-${item.id}`}
              className="rounded-lg border border-stone-200 bg-white p-2.5 space-y-1"
            >
              <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.colorHex }}
                />
                <span>{item.symbolKo}</span>
              </div>
              <div className="font-medium text-stone-800">{item.labelKo}</div>
              <p className="text-[11px] text-stone-500 leading-snug">
                {item.descriptionKo}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Public Evidence Sources & Non-Medical Disclaimer */}
      <footer
        data-testid="core-evidence-footer"
        className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3 text-xs"
      >
        <div className="space-y-1.5">
          <h4 className="font-bold text-stone-800">
            검증된 공개 근거 출처 (Public Biomechanical & Curriculum References)
          </h4>
          <ul className="space-y-1.5">
            {spec.evidenceSources.map((src) => (
              <li
                key={src.sourceId}
                data-testid={`core-source-${src.sourceId}`}
                className="rounded-lg border border-stone-200 bg-white p-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-stone-900">
                    {src.organization} — {src.title}
                  </span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline font-medium hover:text-blue-900"
                  >
                    원문 출처 링크
                  </a>
                </div>
                <p className="mt-1 text-[11px] text-stone-600">
                  검증 항목: {src.verifiedClaimsKo.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div
          data-testid="core-non-medical-disclaimer"
          className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[11px] text-amber-950 leading-relaxed"
        >
          <strong>비의료·비진단 안내:</strong> {spec.governance.nonMedicalDisclaimerKo}
        </div>
      </footer>
    </section>
  );
};

export function toCorePhaseDiagramProps(
  movementIdOrExerciseId: string,
  phase: VisualPhaseId = 'middle',
  overrides?: Partial<Omit<MovementPhaseDiagramSvgProps, 'asset' | 'phase'>>,
): MovementPhaseDiagramSvgProps {
  const spec =
    resolveCoreAbdominalDiagram(movementIdOrExerciseId) ??
    CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'];
  return {
    asset: spec.catalogVisualAsset,
    phase,
    showAlignment: true,
    showDirection: true,
    showMuscles: true,
    showGhostStartPose: true,
    ...overrides,
  };
}

export function toCoreTriptychDiagramProps(
  movementIdOrExerciseId: string,
  overrides?: Partial<Omit<MovementTriptychDiagramSvgProps, 'asset'>>,
): MovementTriptychDiagramSvgProps {
  const spec =
    resolveCoreAbdominalDiagram(movementIdOrExerciseId) ??
    CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'];
  return {
    asset: spec.catalogVisualAsset,
    selectedPhase: 'middle',
    showAlignment: true,
    showDirection: true,
    showMuscles: true,
    showGhostStartPose: true,
    ...overrides,
  };
}

export const CoreAbdominalI7IntegrationPreview: React.FC = () => {
  const patch = useMemo(() => getCoreI7RegistryPatch(), []);
  return (
    <div
      data-testid="core-i7-integration-preview"
      className="space-y-8 p-4 bg-stone-100 rounded-2xl"
    >
      {CORE_ABDOMINAL_DIAGRAM_LIST.map((spec) => (
        <div key={spec.coreId} className="space-y-3">
          <CoreAbdominalTriptychFigure
            initialMovementId={spec.coreId}
            allowMovementSwitch={false}
          />
          <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
            <div className="text-xs font-semibold text-stone-700">
              I7 공용 렌더러 호환 검증 (MovementTriptychDiagramSvg · {spec.primaryExerciseId})
            </div>
            <MovementTriptychDiagramSvg
              {...toCoreTriptychDiagramProps(spec.primaryExerciseId)}
            />
          </div>
        </div>
      ))}
      <div className="hidden" data-testid="core-i7-patch-count">
        {Object.keys(patch.byCatalogExerciseId).length}
      </div>
    </div>
  );
};

export default CoreAbdominalTriptychFigure;
