import React, { useId } from 'react';
import {
  getSpineArticulationDiagramSpec,
  resolveSpineArticulationDiagramByExerciseId,
  type Point2D,
  type SpineArticulationDiagramSpec,
  type SpineArticulationId,
  type SpineArticulationPhaseSpec,
  type VisualPhaseId,
} from '../data/spineArticulationDiagramData';

export interface SpineArticulationDiagramSvgProps {
  spec?: SpineArticulationDiagramSpec;
  movementId?: SpineArticulationId | string;
  phase: VisualPhaseId;
  mirrored?: boolean;
  showAlignment?: boolean;
  showDirection?: boolean;
  showVertebraLabels?: boolean;
  showGhostStartPose?: boolean;
  showJointAxes?: boolean;
  compact?: boolean;
  className?: string;
  label?: string;
}

export interface SpineArticulationTriptychSvgProps {
  spec?: SpineArticulationDiagramSpec;
  movementId?: SpineArticulationId | string;
  selectedPhase?: VisualPhaseId;
  onSelectPhase?: (phase: VisualPhaseId) => void;
  mirrored?: boolean;
  showAlignment?: boolean;
  showDirection?: boolean;
  showVertebraLabels?: boolean;
  showGhostStartPose?: boolean;
  showJointAxes?: boolean;
  className?: string;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 188;

function mirrorX(x: number, mirrored: boolean): number {
  const value = mirrored ? VIEWBOX_WIDTH - x : x;
  return Math.round(value * 10) / 10;
}

function mirrorPoint(pt: Point2D, mirrored: boolean): Point2D {
  return {
    x: mirrorX(pt.x, mirrored),
    y: Math.round(pt.y * 10) / 10,
  };
}

function buildSmoothCurvePath(points: readonly Point2D[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = Math.round(((curr.x + next.x) / 2) * 10) / 10;
    const midY = Math.round(((curr.y + next.y) / 2) * 10) / 10;
    d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function resolveSpec(
  spec?: SpineArticulationDiagramSpec,
  movementId?: SpineArticulationId | string,
): SpineArticulationDiagramSpec {
  if (spec) return spec;
  if (movementId) {
    const resolved = resolveSpineArticulationDiagramByExerciseId(movementId);
    if (resolved) return resolved;
  }
  return getSpineArticulationDiagramSpec('spine-roll-up');
}

export function SpineArticulationDiagramSvg({
  spec: propSpec,
  movementId,
  phase,
  mirrored = false,
  showAlignment = true,
  showDirection = true,
  showVertebraLabels = true,
  showGhostStartPose = true,
  showJointAxes = true,
  compact = false,
  className,
  label,
}: SpineArticulationDiagramSvgProps): React.JSX.Element {
  const uid = useId().replace(/:/g, '');
  const spec = resolveSpec(propSpec, movementId);
  const phaseSpec: SpineArticulationPhaseSpec = spec.phases[phase];
  const startSpec: SpineArticulationPhaseSpec = spec.phases.start;

  const p = (pt: Point2D) => mirrorPoint(pt, mirrored);
  const j = phaseSpec.joints;

  const spinePts = phaseSpec.spinePoints.map((sp) => ({
    ...sp,
    mirroredPoint: p(sp.point),
  }));
  const spineCurveD = buildSmoothCurvePath(spinePts.map((sp) => sp.mirroredPoint));

  const startSpinePts = startSpec.spinePoints.map((sp) => p(sp.point));
  const startSpineCurveD = buildSmoothCurvePath(startSpinePts);

  const headPt = p(j.head);
  const neckPt = p(j.neck);
  const shoulderPt = p(j.shoulder);
  const elbowPt = p(j.elbow);
  const wristPt = p(j.wrist);
  const handPt = p(j.hand);
  const pelvisPt = p(j.pelvis);
  const hipPt = p(j.hip);
  const kneePt = p(j.knee);
  const anklePt = p(j.ankle);
  const heelPt = p(j.heel);
  const toePt = p(j.toe);

  const farShoulderPt = j.farShoulder ? p(j.farShoulder) : { x: shoulderPt.x - 3, y: shoulderPt.y - 3 };
  const farElbowPt = j.farElbow ? p(j.farElbow) : { x: elbowPt.x - 4, y: elbowPt.y - 3 };
  const farWristPt = j.farWrist ? p(j.farWrist) : { x: wristPt.x - 4, y: wristPt.y - 3 };
  const farHipPt = j.farHip ? p(j.farHip) : { x: hipPt.x - 3, y: hipPt.y - 3 };
  const farKneePt = j.farKnee ? p(j.farKnee) : { x: kneePt.x - 4, y: kneePt.y - 3 };
  const farAnklePt = j.farAnkle ? p(j.farAnkle) : { x: anklePt.x - 4, y: anklePt.y - 3 };
  const farToePt = j.farToe ? p(j.farToe) : { x: toePt.x - 4, y: toePt.y - 3 };

  const jointAxes = [
    {
      id: 'cervical',
      labelKo: '경추 분절축(C7)',
      pt: p(phaseSpec.spineChain.c7),
      r: 7.5,
    },
    {
      id: 'lumbar',
      labelKo: '요추 스쿱축(L3)',
      pt: p(phaseSpec.spineChain.l3),
      r: 8.5,
    },
    {
      id: 'pelvis',
      labelKo: '골반·고관절 중심축',
      pt: pelvisPt,
      r: 9,
    },
  ] as const;

  const wallX =
    spec.wallPlumbLineX !== null ? mirrorX(spec.wallPlumbLineX, mirrored) : null;

  const accessibleLabel =
    label ??
    `${spec.nameKo} · ${phaseSpec.badgeKo} · ${phaseSpec.shortTitleKo} (비의료 참고 도해)`;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-label={accessibleLabel}
      className={['spine-articulation-svg', compact ? 'is-compact' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-testid={
        compact
          ? `spine-triptych-svg-${spec.archetypeId}-${phase}`
          : `spine-svg-${spec.archetypeId}-${phase}`
      }
      data-archetype-id={spec.archetypeId}
      data-phase-id={phase}
      data-mat-baseline-y={spec.matBaselineY}
      data-wall-plumb-x={spec.wallPlumbLineX ?? 'none'}
    >
      <defs>
        <marker
          id={`spine-arrow-${uid}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#b85a32" />
        </marker>
      </defs>

      {/* Background */}
      <rect
        x={0}
        y={0}
        width={VIEWBOX_WIDTH}
        height={VIEWBOX_HEIGHT}
        rx={12}
        fill="#f7faf8"
      />

      {/* Mat horizontal anchor surface (y = 144) */}
      <g data-layer="mat-surface" data-testid="spine-mat-surface">
        <rect
          x={20}
          y={spec.matBaselineY}
          width={280}
          height={8}
          rx={3}
          fill="#d7e2dc"
          stroke="#6b887b"
          strokeWidth={1.2}
        />
        <line
          x1={16}
          y1={spec.matBaselineY}
          x2={304}
          y2={spec.matBaselineY}
          stroke="#355e50"
          strokeWidth={1.6}
        />
        {!compact && (
          <text
            x={298}
            y={spec.matBaselineY + 18}
            textAnchor="end"
            fontSize={8.5}
            fill="#47665b"
          >
            매트 기준면 (y={spec.matBaselineY})
          </text>
        )}
      </g>

      {/* Imaginary vertical wall plumb line (x = 58 for Spine Stretch) */}
      {wallX !== null && (
        <g
          data-layer="wall-plumb-line"
          data-testid="spine-wall-plumb-line"
          data-wall-x={wallX}
        >
          <rect
            x={mirrored ? wallX : wallX - 8}
            y={18}
            width={8}
            height={spec.matBaselineY - 18}
            fill="rgba(53, 94, 80, 0.1)"
          />
          <line
            x1={wallX}
            y1={18}
            x2={wallX}
            y2={spec.matBaselineY}
            stroke="#24594c"
            strokeWidth={1.8}
            strokeDasharray="4 3"
          />
          {!compact && (
            <text
              x={wallX + (mirrored ? -6 : 6)}
              y={42}
              textAnchor={mirrored ? 'end' : 'start'}
              fontSize={8}
              fontWeight={600}
              fill="#24594c"
              stroke="#f7faf8"
              strokeWidth={2.5}
              paintOrder="stroke"
            >
              가상 수직벽 (x={spec.wallPlumbLineX})
            </text>
          )}
        </g>
      )}

      {/* Ghost start spine chain for phase delta visibility */}
      {showGhostStartPose && phase !== 'start' && (
        <g
          data-layer="ghost-start-pose"
          data-testid="spine-ghost-start-pose"
          opacity={0.35}
        >
          <path
            d={startSpineCurveD}
            fill="none"
            stroke="#7f968d"
            strokeWidth={3}
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
          {startSpinePts.map((pt, idx) => (
            <circle
              key={`ghost-pt-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={2.4}
              fill="#7f968d"
            />
          ))}
        </g>
      )}

      {/* Alignment guides */}
      {showAlignment &&
        phaseSpec.alignments.map((guide) => {
          const from = p(guide.from);
          const to = p(guide.to);
          return (
            <g
              key={guide.id}
              data-layer="alignment-guide"
              data-guide-kind={guide.kind}
            >
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#3a7d6b"
                strokeWidth={1.3}
                strokeDasharray="3 2.5"
              />
            </g>
          );
        })}

      {/* Bilateral far-side limbs (dashed background leg & arm) */}
      <g
        data-layer="bilateral-far-limbs"
        data-testid="spine-bilateral-far-limbs"
        opacity={0.52}
      >
        <path
          d={`M ${farHipPt.x} ${farHipPt.y} L ${farKneePt.x} ${farKneePt.y} L ${farAnklePt.x} ${farAnklePt.y} L ${farToePt.x} ${farToePt.y}`}
          fill="none"
          stroke="#6b887b"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3.5 2.5"
        />
        <path
          d={`M ${farShoulderPt.x} ${farShoulderPt.y} L ${farElbowPt.x} ${farElbowPt.y} L ${farWristPt.x} ${farWristPt.y}`}
          fill="none"
          stroke="#6b887b"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3.5 2.5"
        />
      </g>

      {/* Lower body limb segments (Hip -> Knee -> Ankle -> Heel -> Toe) */}
      <g data-layer="lower-body-chain">
        <path
          d={`M ${pelvisPt.x} ${pelvisPt.y} L ${hipPt.x} ${hipPt.y} L ${kneePt.x} ${kneePt.y} L ${anklePt.x} ${anklePt.y} L ${heelPt.x} ${heelPt.y} L ${toePt.x} ${toePt.y}`}
          fill="none"
          stroke="#48655a"
          strokeWidth={4.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[hipPt, kneePt, anklePt, heelPt, toePt].map((pt, idx) => (
          <circle
            key={`lower-joint-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={3.1}
            fill="#ffffff"
            stroke="#355248"
            strokeWidth={1.6}
          />
        ))}
      </g>

      {/* Upper limb segment (Shoulder -> Elbow -> Wrist -> Hand) */}
      <g data-layer="upper-limb-chain">
        <path
          d={`M ${shoulderPt.x} ${shoulderPt.y} L ${elbowPt.x} ${elbowPt.y} L ${wristPt.x} ${wristPt.y} L ${handPt.x} ${handPt.y}`}
          fill="none"
          stroke="#59756b"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[shoulderPt, elbowPt, wristPt, handPt].map((pt, idx) => (
          <circle
            key={`upper-joint-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r={2.6}
            fill="#ffffff"
            stroke="#48655a"
            strokeWidth={1.4}
          />
        ))}
      </g>

      {/* 6-Point Spine Articulation Chain (c7 -> t4 -> t8 -> t12 -> l3 -> s1) */}
      <g data-layer="spine-articulation-chain" data-testid="spine-vertebral-chain">
        {/* Glow halo behind C-curve */}
        <path
          d={spineCurveD}
          fill="none"
          stroke="rgba(200, 109, 68, 0.24)"
          strokeWidth={9}
          strokeLinecap="round"
        />
        {/* Main articulated vertebral curve */}
        <path
          d={spineCurveD}
          fill="none"
          stroke="#c86d44"
          strokeWidth={4.4}
          strokeLinecap="round"
          data-testid="spine-c-curve-path"
        />
        {/* Neck to Head connector */}
        <line
          x1={neckPt.x}
          y1={neckPt.y}
          x2={headPt.x}
          y2={headPt.y}
          stroke="#c86d44"
          strokeWidth={3.2}
          strokeLinecap="round"
        />
        {/* Head cranium circle */}
        <circle
          cx={headPt.x}
          cy={headPt.y}
          r={8.5}
          fill="#fdf6f0"
          stroke="#9e4923"
          strokeWidth={2}
          data-testid="spine-head-node"
        />

        {/* Individual 6 Vertebral Landmarks: C7, T4, T8, T12, L3, S1 */}
        {spinePts.map((sp) => {
          const isAnchored = sp.matContact || sp.wallContact;
          return (
            <g
              key={sp.id}
              data-testid={`vertebra-node-${sp.id}`}
              data-vertebra-id={sp.id}
              data-x={sp.point.x}
              data-y={sp.point.y}
              data-mat-contact={String(sp.matContact)}
              data-wall-contact={String(sp.wallContact)}
            >
              <circle
                cx={sp.mirroredPoint.x}
                cy={sp.mirroredPoint.y}
                r={isAnchored ? 4.3 : 3.8}
                fill={isAnchored ? '#24594c' : '#fff8f3'}
                stroke={isAnchored ? '#ffffff' : '#b85a32'}
                strokeWidth={1.8}
              />
              {showVertebraLabels && !compact && (
                <text
                  x={sp.mirroredPoint.x}
                  y={sp.mirroredPoint.y - 7}
                  textAnchor="middle"
                  fontSize={7.5}
                  fontWeight={700}
                  fill="#5a2f18"
                  stroke="#f7faf8"
                  strokeWidth={2}
                  paintOrder="stroke"
                >
                  {sp.segmentLabel}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Rotational Joint Axes (Cervical C7, Lumbar L3 Scoop, Pelvis Pivot) */}
      {showJointAxes && (
        <g data-layer="joint-axes" data-testid="spine-joint-axes">
          {jointAxes.map((axis) => (
            <g
              key={axis.id}
              data-testid={`spine-joint-axis-${axis.id}`}
              data-axis-id={axis.id}
              data-axis-label={axis.labelKo}
            >
              <circle
                cx={axis.pt.x}
                cy={axis.pt.y}
                r={axis.r}
                fill="rgba(109, 40, 217, 0.06)"
                stroke="#6d28d9"
                strokeWidth={1.1}
                strokeDasharray="2.2 1.8"
              />
              <circle
                cx={axis.pt.x}
                cy={axis.pt.y}
                r={1.7}
                fill="#6d28d9"
              />
            </g>
          ))}
        </g>
      )}

      {/* Fixed Anchor Locks (Heel / Hip / Pelvis) */}
      <g data-layer="fixed-anchors">
        {phaseSpec.fixedAnchors.map((anchor) => {
          const pt = p(anchor.point);
          return (
            <g
              key={anchor.joint}
              data-testid={`fixed-anchor-${anchor.joint}`}
              data-joint={anchor.joint}
              data-x={anchor.point.x}
              data-y={anchor.point.y}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={6.2}
                fill="none"
                stroke="#1d5c4b"
                strokeWidth={1.6}
                strokeDasharray="2 1.5"
              />
              <polygon
                points={`${pt.x},${pt.y + 4} ${pt.x - 4.5},${pt.y + 11} ${pt.x + 4.5},${pt.y + 11}`}
                fill="#1d5c4b"
              />
            </g>
          );
        })}
      </g>

      {/* Direction Vectors (Articulation & Opposition Arrows) */}
      {showDirection &&
        phaseSpec.directionVectors.map((vec) => {
          const pts = vec.points.map((pt) => p(pt));
          const pathD = buildSmoothCurvePath(pts);
          const lastPt = pts[pts.length - 1];
          const minY = Math.min(...pts.map((pt) => pt.y));
          return (
            <g
              key={vec.id}
              data-layer="direction-vector"
              data-vector-kind={vec.kind}
            >
              <path
                d={pathD}
                fill="none"
                stroke="#b85a32"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                markerEnd={`url(#spine-arrow-${uid})`}
              />
              {!compact && lastPt && (
                <text
                  x={lastPt.x}
                  y={Math.max(38, minY - 11)}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={600}
                  fill="#9e4923"
                  stroke="#f7faf8"
                  strokeWidth={2.8}
                  paintOrder="stroke"
                >
                  {vec.labelKo}
                </text>
              )}
            </g>
          );
        })}

      {/* Phase header badge inside SVG */}
      <g data-layer="phase-caption">
        <rect
          x={12}
          y={10}
          width={compact ? 116 : 196}
          height={20}
          rx={6}
          fill="rgba(255, 255, 255, 0.9)"
          stroke="#d5e0db"
          strokeWidth={1}
        />
        <text
          x={20}
          y={23}
          fontSize={9}
          fontWeight={700}
          fill="#20483d"
        >
          {compact ? phaseSpec.phaseId.toUpperCase() : phaseSpec.shortTitleKo}
        </text>
      </g>
    </svg>
  );
}

export function SpineArticulationTriptychSvg({
  spec: propSpec,
  movementId,
  selectedPhase = 'middle',
  onSelectPhase,
  mirrored = false,
  showAlignment = true,
  showDirection = true,
  showVertebraLabels = false,
  showGhostStartPose = true,
  showJointAxes = true,
  className,
}: SpineArticulationTriptychSvgProps): React.JSX.Element {
  const spec = resolveSpec(propSpec, movementId);
  const phases: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

  return (
    <div
      className={['spine-triptych-strip', className ?? ''].filter(Boolean).join(' ')}
      data-testid={`spine-triptych-${spec.archetypeId}`}
      role="group"
      aria-label={`${spec.nameKo} 3단계(시작·중간·끝) 연속 비교 도해`}
    >
      {phases.map((phaseId) => {
        const phaseSpec = spec.phases[phaseId];
        const isSelected = selectedPhase === phaseId;
        return (
          <button
            key={phaseId}
            type="button"
            className={`spine-triptych-card ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onSelectPhase?.(phaseId)}
            aria-pressed={isSelected}
            data-testid={`spine-triptych-phase-${phaseId}`}
          >
            <div className="spine-triptych-card-header">
              <span className="spine-triptych-phase-badge">{phaseSpec.badgeKo}</span>
              <strong className="spine-triptych-phase-title">{phaseSpec.shortTitleKo}</strong>
            </div>
            <div className="spine-triptych-svg-wrap">
              <SpineArticulationDiagramSvg
                spec={spec}
                phase={phaseId}
                mirrored={mirrored}
                showAlignment={showAlignment}
                showDirection={showDirection}
                showVertebraLabels={showVertebraLabels}
                showGhostStartPose={showGhostStartPose}
                showJointAxes={showJointAxes}
                compact
              />
            </div>
            <p className="spine-triptych-focus">{phaseSpec.articulationFocusKo}</p>
          </button>
        );
      })}
    </div>
  );
}

export function SpineArticulationLegend(): React.JSX.Element {
  return (
    <div
      className="spine-articulation-legend"
      data-testid="spine-articulation-legend"
      aria-label="척추 분절 도해 기호 범례"
    >
      <span className="spine-legend-item">
        <span className="spine-legend-dot is-vertebra" aria-hidden="true" />
        6분절 척추 체인 (C7·T4·T8·T12·L3·S1)
      </span>
      <span className="spine-legend-item">
        <span className="spine-legend-dot is-anchored" aria-hidden="true" />
        매트/가상 수직벽 접지·고정 앵커
      </span>
      <span className="spine-legend-item">
        <span className="spine-legend-dot is-axis" aria-hidden="true" />
        관절축 (경추 C7 · 요추 L3 · 골반 회전 중심)
      </span>
      <span className="spine-legend-item">
        <span className="spine-legend-line is-vector" aria-hidden="true" />
        분절 박리(Peel) · 양방향 대조(Opposition) 궤적
      </span>
      <span className="spine-legend-item">
        <span className="spine-legend-line is-wall" aria-hidden="true" />
        매트 수평면(y=144) · 가상 수직벽(x=58)
      </span>
      <span className="spine-legend-item">
        <span className="spine-legend-line is-bilateral" aria-hidden="true" />
        근위 사지(실선) · 원위 사지(점선)
      </span>
    </div>
  );
}
