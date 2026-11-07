import React, { useId } from 'react';
import {
  calculatePhaseJointDelta,
  type CatalogMovementVisualAsset,
  type JointAlignmentGuide,
  type MovementDirectionVector,
  type MuscleHighlightSpec,
  type PhasePoseSpec,
  type Point2D,
  type RigJointMap,
  type VisualPhaseId,
} from '../data/movementVisualRigCatalog';

export interface MovementPhaseDiagramSvgProps {
  asset: CatalogMovementVisualAsset;
  phase: VisualPhaseId;
  activeSide?: 'left' | 'right';
  mirrored?: boolean;
  showAlignment?: boolean;
  showDirection?: boolean;
  showMuscles?: boolean;
  showGhostStartPose?: boolean;
  compact?: boolean;
  className?: string;
  label?: string;
}

export interface MovementTriptychDiagramSvgProps {
  asset: CatalogMovementVisualAsset;
  selectedPhase?: VisualPhaseId;
  onSelectPhase?: (phase: VisualPhaseId) => void;
  activeSide?: 'left' | 'right';
  mirrored?: boolean;
  showAlignment?: boolean;
  showDirection?: boolean;
  showMuscles?: boolean;
  showGhostStartPose?: boolean;
  className?: string;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 200;

function mx(x: number, mirrored: boolean): number {
  const val = mirrored ? VIEWBOX_WIDTH - x : x;
  return Math.round(val * 10) / 10;
}

function my(y: number): number {
  return Math.round(y * 10) / 10;
}

function mpt(pt: Point2D, mirrored: boolean): Point2D {
  return {
    x: mx(pt.x, mirrored),
    y: my(pt.y),
  };
}

function buildPolylinePath(points: readonly Point2D[]): string {
  if (points.length === 0) return '';
  return points
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
    .join(' ');
}

function buildSmoothCurvePath(points: readonly Point2D[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  if (points.length === 3) {
    return `M ${points[0].x} ${points[0].y} Q ${points[1].x} ${points[1].y} ${points[2].x} ${points[2].y}`;
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

function getMusclePalette(role: MuscleHighlightSpec['role']): {
  stroke: string;
  glow: string;
  core: string;
} {
  switch (role) {
    case 'primary':
      return {
        stroke: '#c86d44',
        glow: 'rgba(200, 109, 68, 0.24)',
        core: 'rgba(200, 109, 68, 0.55)',
      };
    case 'stabilizer':
      return {
        stroke: '#2b6a58',
        glow: 'rgba(43, 106, 88, 0.22)',
        core: 'rgba(43, 106, 88, 0.5)',
      };
    case 'lengthening':
      return {
        stroke: '#b8893a',
        glow: 'rgba(184, 137, 58, 0.22)',
        core: 'rgba(184, 137, 58, 0.5)',
      };
  }
}

function renderSpringCoilPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils = 5,
  amplitude = 3.2,
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

function renderApparatusSupportLayer(
  asset: CatalogMovementVisualAsset,
  phaseSpec: PhasePoseSpec,
  mirrored: boolean,
): React.JSX.Element {
  const { apparatusState } = phaseSpec;
  const carriageShift = Math.round(apparatusState.carriageOffsetPx * 0.35);
  const springColor =
    apparatusState.springTensionLevel === 'high'
      ? '#9a4220'
      : apparatusState.springTensionLevel === 'medium'
        ? '#b87430'
        : '#3c6e5f';

  const p = (x: number, y: number) => mpt({ x, y }, mirrored);

  if (asset.apparatus === 'reformer') {
    const carriageStart = 38 + carriageShift;
    const carriageEnd = 216 + carriageShift;
    const cLeft = mx(carriageStart, mirrored);
    const cRight = mx(carriageEnd, mirrored);
    const cMinX = Math.min(cLeft, cRight);
    const cWidth = Math.max(24, Math.abs(cRight - cLeft));
    const shoulderX = mx(carriageStart + 36, mirrored);
    const headrestX1 = mx(carriageStart + 6, mirrored);
    const headrestX2 = mx(carriageStart + 28, mirrored);
    const footbarBase = p(280, 156);
    const footbarTop = p(266, 126);
    const pulleyPostBase = p(24, 156);
    const pulleyPostTop = p(24, 102);
    const springStart = p(carriageEnd, 151);
    const springEnd = p(278, 151);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="reformer"
        data-carriage-offset={apparatusState.carriageOffsetPx}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        {/* Floor baseline */}
        <line
          x1={12}
          y1={178}
          x2={308}
          y2={178}
          stroke="#d6cfc0"
          strokeWidth={1.5}
        />
        {/* Wooden frame rails */}
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
        {/* Frame legs */}
        <line
          x1={28}
          y1={165}
          x2={28}
          y2={178}
          stroke="#756046"
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        <line
          x1={292}
          y1={165}
          x2={292}
          y2={178}
          stroke="#756046"
          strokeWidth={3.5}
          strokeLinecap="round"
        />
        {/* Internal track rail */}
        <line
          x1={24}
          y1={151}
          x2={294}
          y2={151}
          stroke="#7a8b84"
          strokeWidth={2}
        />
        {/* Spring coil */}
        <path
          d={renderSpringCoilPath(
            springStart.x,
            springStart.y,
            springEnd.x,
            springEnd.y,
            6,
            3.2,
          )}
          fill="none"
          stroke={springColor}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Sliding carriage bed */}
        <rect
          x={cMinX}
          y={143}
          width={cWidth}
          height={9}
          rx={3}
          fill="#6e8c80"
          stroke="#2f564b"
          strokeWidth={1.5}
        />
        {/* Headrest incline */}
        <line
          x1={headrestX1}
          y1={139}
          x2={headrestX2}
          y2={143}
          stroke="#2f564b"
          strokeWidth={4}
          strokeLinecap="round"
        />
        {/* Shoulder rest block */}
        <rect
          x={shoulderX - 4}
          y={131}
          width={8}
          height={12}
          rx={2}
          fill="#43685d"
          stroke="#26473d"
          strokeWidth={1.2}
        />
        {/* Riser & pulley post */}
        <line
          x1={pulleyPostBase.x}
          y1={pulleyPostBase.y}
          x2={pulleyPostTop.x}
          y2={pulleyPostTop.y}
          stroke="#566b63"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <circle
          cx={pulleyPostTop.x}
          cy={pulleyPostTop.y}
          r={3.2}
          fill="#f7f5ef"
          stroke="#35584e"
          strokeWidth={1.5}
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
          r={4.2}
          fill="#26473d"
          stroke="#f7f5ef"
          strokeWidth={1.2}
        />
      </g>
    );
  }

  if (asset.apparatus === 'cadillac') {
    const leftPoleX = mx(26, mirrored);
    const rightPoleX = mx(294, mirrored);
    const ptbPivot = p(78, 22);
    const barEnd = p(
      96 + Math.round(carriageShift * 0.6),
      64 + Math.round(carriageShift * 0.25),
    );
    const springAnchor = p(26, 44);
    const handTarget = p(phaseSpec.joints.hand.x, phaseSpec.joints.hand.y);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="cadillac"
        data-carriage-offset={apparatusState.carriageOffsetPx}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        {/* Floor baseline */}
        <line
          x1={12}
          y1={182}
          x2={308}
          y2={182}
          stroke="#d6cfc0"
          strokeWidth={1.5}
        />
        {/* Cadillac upholstered table bed */}
        <rect
          x={22}
          y={145}
          width={276}
          height={10}
          rx={3}
          fill="#759186"
          stroke="#2f564b"
          strokeWidth={1.5}
        />
        <rect
          x={22}
          y={155}
          width={276}
          height={7}
          rx={2}
          fill="#d3bea0"
          stroke="#8a7254"
          strokeWidth={1.2}
        />
        {/* Table legs */}
        <line
          x1={34}
          y1={162}
          x2={34}
          y2={182}
          stroke="#6b5840"
          strokeWidth={3.2}
        />
        <line
          x1={286}
          y1={162}
          x2={286}
          y2={182}
          stroke="#6b5840"
          strokeWidth={3.2}
        />
        {/* Vertical tower poles & overhead canopy frame */}
        <line
          x1={leftPoleX}
          y1={22}
          x2={leftPoleX}
          y2={145}
          stroke="#5c7068"
          strokeWidth={3}
        />
        <line
          x1={rightPoleX}
          y1={22}
          x2={rightPoleX}
          y2={145}
          stroke="#5c7068"
          strokeWidth={3}
        />
        <line
          x1={24}
          y1={22}
          x2={296}
          y2={22}
          stroke="#495e56"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
        {/* Push-through / trapeze bar & tower spring */}
        <line
          x1={ptbPivot.x}
          y1={ptbPivot.y}
          x2={barEnd.x}
          y2={barEnd.y}
          stroke="#35584e"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <circle
          cx={barEnd.x}
          cy={barEnd.y}
          r={3.5}
          fill="#c86d44"
          stroke="#f7f5ef"
          strokeWidth={1}
        />
        <path
          d={renderSpringCoilPath(
            springAnchor.x,
            springAnchor.y,
            handTarget.x,
            handTarget.y,
            6,
            2.6,
          )}
          fill="none"
          stroke={springColor}
          strokeWidth={1.4}
          opacity={0.78}
        />
      </g>
    );
  }

  if (asset.apparatus === 'chair') {
    const boxLeft = mx(112, mirrored);
    const boxRight = mx(192, mirrored);
    const boxMinX = Math.min(boxLeft, boxRight);
    const boxW = Math.abs(boxRight - boxLeft);
    const hinge = p(188, 164);
    const angleRad = ((24 + apparatusState.pedalAngleDeg * 0.75) * Math.PI) / 180;
    const dirSign = mirrored ? -1 : 1;
    const pedalTip = {
      x: Math.round((hinge.x + dirSign * Math.cos(angleRad) * 54) * 10) / 10,
      y: Math.round((hinge.y - Math.sin(angleRad) * 54) * 10) / 10,
    };
    const springBase = p(148, 168);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="chair"
        data-pedal-angle={apparatusState.pedalAngleDeg}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <line
          x1={12}
          y1={178}
          x2={308}
          y2={178}
          stroke="#d6cfc0"
          strokeWidth={1.5}
        />
        {/* Wunda Chair wooden body */}
        <rect
          x={boxMinX}
          y={114}
          width={boxW}
          height={64}
          rx={4}
          fill="#d8c3a2"
          stroke="#7e6648"
          strokeWidth={1.6}
        />
        {/* Padded seat */}
        <rect
          x={boxMinX - 4}
          y={106}
          width={boxW + 8}
          height={9}
          rx={3}
          fill="#6e8c80"
          stroke="#2f564b"
          strokeWidth={1.5}
          data-chair-seat="fixed"
        />
        {/* Hinged pedal lever */}
        <line
          x1={hinge.x}
          y1={hinge.y}
          x2={pedalTip.x}
          y2={pedalTip.y}
          stroke="#35584e"
          strokeWidth={4}
          strokeLinecap="round"
          data-chair-pedal="hinged"
        />
        <circle
          cx={hinge.x}
          cy={hinge.y}
          r={3.2}
          fill="#f7f5ef"
          stroke="#35584e"
          strokeWidth={1.5}
        />
        <circle
          cx={pedalTip.x}
          cy={pedalTip.y}
          r={4}
          fill="#26473d"
          stroke="#f7f5ef"
          strokeWidth={1.2}
        />
        {/* Chair spring */}
        <path
          d={renderSpringCoilPath(
            springBase.x,
            springBase.y,
            pedalTip.x,
            pedalTip.y,
            5,
            2.8,
          )}
          fill="none"
          stroke={springColor}
          strokeWidth={1.6}
        />
      </g>
    );
  }

  if (asset.apparatus === 'barrel') {
    const arcLeft = p(68, 174);
    const arcPeak1 = p(76, 102);
    const arcPeak2 = p(164, 102);
    const arcRight = p(174, 174);
    const ladderFrontX = mx(222, mirrored);
    const ladderBackX = mx(256, mirrored);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="barrel"
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <line
          x1={12}
          y1={178}
          x2={308}
          y2={178}
          stroke="#d6cfc0"
          strokeWidth={1.5}
        />
        {/* Curved barrel dome */}
        <path
          d={`M ${arcLeft.x} ${arcLeft.y} C ${arcPeak1.x} ${arcPeak1.y} ${arcPeak2.x} ${arcPeak2.y} ${arcRight.x} ${arcRight.y} Z`}
          fill="#779388"
          fillOpacity={0.28}
          stroke="#2f564b"
          strokeWidth={2.2}
        />
        {/* Barrel wooden base frame */}
        <line
          x1={arcLeft.x}
          y1={174}
          x2={ladderBackX}
          y2={174}
          stroke="#7e6648"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Ladder uprights & rungs */}
        <line
          x1={ladderFrontX}
          y1={56}
          x2={ladderFrontX}
          y2={176}
          stroke="#7e6648"
          strokeWidth={2.6}
        />
        <line
          x1={ladderBackX}
          y1={46}
          x2={ladderBackX}
          y2={176}
          stroke="#7e6648"
          strokeWidth={2.6}
        />
        {[66, 88, 110, 132, 154].map((ry) => (
          <line
            key={ry}
            x1={ladderFrontX}
            y1={ry}
            x2={ladderBackX}
            y2={ry - 6}
            stroke="#594730"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  }

  // Default: 'mat'
  const propCenter = p(
    Math.round((phaseSpec.joints.hand.x + phaseSpec.joints.knee.x) / 2),
    Math.round((phaseSpec.joints.hand.y + phaseSpec.joints.knee.y) / 2),
  );

  return (
    <g
      data-layer="apparatus-support"
      data-apparatus-kind="mat"
      data-prop-active={apparatusState.propPositionKo ? 'true' : 'false'}
    >
      <line
        x1={12}
        y1={176}
        x2={308}
        y2={176}
        stroke="#d6cfc0"
        strokeWidth={1.2}
      />
      {/* Cushioned Pilates mat */}
      <rect
        x={20}
        y={148}
        width={280}
        height={8}
        rx={4}
        fill="#7c968b"
        fillOpacity={0.42}
        stroke="#35584e"
        strokeWidth={1.6}
      />
      <line
        x1={32}
        y1={152}
        x2={288}
        y2={152}
        stroke="#2f564b"
        strokeWidth={0.8}
        strokeDasharray="6 4"
        opacity={0.55}
      />
      {apparatusState.propPositionKo ? (
        <circle
          cx={propCenter.x}
          cy={propCenter.y}
          r={11}
          fill="rgba(200, 109, 68, 0.12)"
          stroke="#b86b35"
          strokeWidth={1.6}
          strokeDasharray="3 2"
        />
      ) : null}
    </g>
  );
}

function renderPoseDeltaGhostLayer(
  startJoints: RigJointMap,
  currentJoints: RigJointMap,
  mirrored: boolean,
): React.JSX.Element {
  const s = (k: keyof RigJointMap): Point2D =>
    mpt(startJoints[k] ?? startJoints.pelvis, mirrored);
  const c = (k: keyof RigJointMap): Point2D =>
    mpt(currentJoints[k] ?? currentJoints.pelvis, mirrored);

  const spinePts = [s('pelvis'), s('lumbar'), s('thoracic'), s('neck'), s('head')];
  const armPts = [s('shoulder'), s('elbow'), s('wrist'), s('hand')];
  const legPts = [s('hip'), s('knee'), s('ankle'), s('heel'), s('toe')];
  const headPt = s('head');

  const trackedJoints: (keyof RigJointMap)[] = [
    'head',
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
    'toe',
  ];

  const movedVectors = trackedJoints
    .map((joint) => {
      const fromPt = s(joint);
      const toPt = c(joint);
      const dist = Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y);
      return { joint, fromPt, toPt, dist };
    })
    .filter((item) => item.dist >= 3);

  return (
    <g data-layer="pose-delta-ghost">
      <g
        data-ghost-pose="start"
        stroke="#7a8c80"
        strokeDasharray="3 3"
        fill="none"
        opacity={0.46}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={buildSmoothCurvePath(spinePts)} strokeWidth={2.4} />
        <path d={buildPolylinePath(armPts)} strokeWidth={2} />
        <path d={buildPolylinePath(legPts)} strokeWidth={2.2} />
        <circle cx={headPt.x} cy={headPt.y} r={7.5} strokeWidth={1.6} />
      </g>
      {movedVectors.map(({ joint, fromPt, toPt }) => (
        <g key={`delta-${joint}`} data-pose-delta-vector={joint}>
          <line
            x1={fromPt.x}
            y1={fromPt.y}
            x2={toPt.x}
            y2={toPt.y}
            stroke="#9a4220"
            strokeWidth={1.15}
            strokeDasharray="2 2"
            opacity={0.62}
          />
          <circle
            cx={fromPt.x}
            cy={fromPt.y}
            r={2}
            fill="#7a8c80"
            opacity={0.65}
          />
        </g>
      ))}
    </g>
  );
}

function renderPrimaryMusclesLayer(
  asset: CatalogMovementVisualAsset,
  phaseSpec: PhasePoseSpec,
  phase: VisualPhaseId,
  mirrored: boolean,
): React.JSX.Element {
  const activeMuscles = asset.primaryMuscles.filter((m) =>
    m.activePhases.includes(phase),
  );
  const musclesToRender =
    activeMuscles.length > 0 ? activeMuscles : asset.primaryMuscles;

  return (
    <g data-layer="primary-muscles">
      {musclesToRender.map((muscle) => {
        const palette = getMusclePalette(muscle.role);
        const pts = muscle.anchorJoints
          .map((jKey) => phaseSpec.joints[jKey])
          .filter((pt): pt is Point2D => Boolean(pt))
          .map((pt) => mpt(pt, mirrored));

        if (pts.length === 0) return null;
        const pathD = buildSmoothCurvePath(pts);
        const midPt = pts[Math.floor(pts.length / 2)];

        return (
          <g
            key={`${muscle.muscleGroupId}-${muscle.role}`}
            data-muscle-group={muscle.muscleGroupId}
            data-muscle-role={muscle.role}
          >
            <path
              d={pathD}
              fill="none"
              stroke={palette.glow}
              strokeWidth={muscle.role === 'primary' ? 14 : 11}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke={palette.core}
              strokeWidth={muscle.role === 'primary' ? 5.5 : 4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={muscle.role === 'lengthening' ? '4 3' : undefined}
            />
            <circle
              cx={midPt.x}
              cy={midPt.y}
              r={muscle.role === 'primary' ? 4.2 : 3.2}
              fill={palette.stroke}
              fillOpacity={0.35}
              stroke={palette.stroke}
              strokeWidth={1.2}
            />
          </g>
        );
      })}
    </g>
  );
}

function renderKinematicFigureLayer(
  phaseSpec: PhasePoseSpec,
  activeSide: 'left' | 'right',
  mirrored: boolean,
  showShoulderConnection = false,
): React.JSX.Element {
  const { joints } = phaseSpec;
  const nearSide = activeSide;
  const farSide: 'left' | 'right' = activeSide === 'right' ? 'left' : 'right';

  const j = (k: keyof RigJointMap): Point2D =>
    mpt(joints[k] ?? joints.pelvis, mirrored);

  // Far / contralateral limb coordinates (use authored far* joints or subtle depth offset)
  const farHipPt = joints.farHip
    ? mpt(joints.farHip, mirrored)
    : { x: j('hip').x - 3, y: j('hip').y - 3 };
  const farKneePt = joints.farKnee
    ? mpt(joints.farKnee, mirrored)
    : { x: j('knee').x - 4, y: j('knee').y - 4 };
  const farAnklePt = joints.farAnkle
    ? mpt(joints.farAnkle, mirrored)
    : { x: j('ankle').x - 4, y: j('ankle').y - 3 };
  const farToePt = joints.farToe
    ? mpt(joints.farToe, mirrored)
    : { x: j('toe').x - 4, y: j('toe').y - 3 };

  const farShoulderPt = joints.farShoulder
    ? mpt(joints.farShoulder, mirrored)
    : { x: j('shoulder').x - 3, y: j('shoulder').y - 3 };
  const farElbowPt = joints.farElbow
    ? mpt(joints.farElbow, mirrored)
    : { x: j('elbow').x - 4, y: j('elbow').y - 3 };
  const farWristPt = joints.farWrist
    ? mpt(joints.farWrist, mirrored)
    : { x: j('wrist').x - 4, y: j('wrist').y - 3 };

  const spinePts = [
    j('pelvis'),
    j('lumbar'),
    j('thoracic'),
    j('neck'),
    j('head'),
  ];
  const nearLegPts = [j('hip'), j('knee'), j('ankle')];
  const nearFootPts = [j('ankle'), j('heel'), j('toe'), j('ankle')];
  const nearArmPts = [j('shoulder'), j('elbow'), j('wrist'), j('hand')];

  const headPt = j('head');
  const neckPt = j('neck');
  const headDx = headPt.x - neckPt.x;
  const headDy = headPt.y - neckPt.y;
  const headLen = Math.hypot(headDx, headDy) || 1;
  const gazeTip: Point2D = {
    x: Math.round((headPt.x + (headDx / headLen) * 11) * 10) / 10,
    y: Math.round((headPt.y + (headDy / headLen) * 11) * 10) / 10,
  };

  return (
    <g
      data-layer="kinematic-figure"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Contralateral / Far Side Limbs (dashed) */}
      <g
        data-anatomical-side={farSide}
        data-limb-depth="far"
        fill="none"
        stroke="#5d766d"
        strokeDasharray="5 4"
        opacity={0.72}
      >
        <path
          d={buildPolylinePath([farHipPt, farKneePt, farAnklePt, farToePt])}
          strokeWidth={2.4}
        />
        <path
          d={buildPolylinePath([farShoulderPt, farElbowPt, farWristPt])}
          strokeWidth={2.1}
        />
      </g>

      {showShoulderConnection && (
        <path
          data-segment="schematic-shoulder-connection"
          d={buildPolylinePath([j('neck'), j('shoulder'), j('thoracic')])}
          stroke="#1c3f36"
          strokeWidth={2.4}
          fill="none"
        />
      )}
      {/* Articulated Spine & Torso Silhouette */}
      <g data-segment="spine-torso" fill="none">
        <path
          d={buildSmoothCurvePath([
            j('pelvis'),
            j('lumbar'),
            j('thoracic'),
            j('neck'),
          ])}
          stroke="#d8c5b0"
          strokeWidth={13}
          opacity={0.55}
        />
        <path
          d={buildSmoothCurvePath(spinePts)}
          stroke="#1c3f36"
          strokeWidth={3.4}
        />
        {(['pelvis', 'lumbar', 'thoracic', 'neck'] as const).map((vKey) => {
          const pt = j(vKey);
          return (
            <circle
              key={vKey}
              cx={pt.x}
              cy={pt.y}
              r={vKey === 'pelvis' ? 4.2 : 2.8}
              fill="#f7f5ef"
              stroke="#1c3f36"
              strokeWidth={1.6}
            />
          );
        })}
        {/* Head & Gaze vector */}
        <line
          x1={headPt.x}
          y1={headPt.y}
          x2={gazeTip.x}
          y2={gazeTip.y}
          stroke="#1c3f36"
          strokeWidth={2}
        />
        <circle
          cx={headPt.x}
          cy={headPt.y}
          r={8.5}
          fill="#efe6d8"
          stroke="#1c3f36"
          strokeWidth={2.2}
        />
      </g>

      {/* Near / Active Side Limbs (solid + double volume outline) */}
      <g data-anatomical-side={nearSide} data-limb-depth="near" fill="none">
        {/* Lower limb volume & bone axis */}
        <path
          d={buildPolylinePath(nearLegPts)}
          stroke="#dfb69b"
          strokeWidth={8.5}
          opacity={0.65}
        />
        <path
          d={buildPolylinePath(nearLegPts)}
          stroke="#21463c"
          strokeWidth={3}
        />
        <path
          d={buildPolylinePath(nearFootPts)}
          fill="rgba(223, 182, 155, 0.45)"
          stroke="#21463c"
          strokeWidth={2.2}
        />

        {/* Upper limb volume & bone axis */}
        <path
          d={buildPolylinePath(nearArmPts)}
          stroke="#dfb69b"
          strokeWidth={6.5}
          opacity={0.65}
        />
        <path
          d={buildPolylinePath(nearArmPts)}
          stroke="#8c472b"
          strokeWidth={2.7}
        />

        {/* Articulated joint nodes */}
        {(
          ['shoulder', 'elbow', 'wrist', 'hand', 'hip', 'knee', 'ankle'] as const
        ).map((jointKey) => {
          const pt = j(jointKey);
          const isMajor =
            jointKey === 'shoulder' ||
            jointKey === 'hip' ||
            jointKey === 'knee';
          return (
            <circle
              key={jointKey}
              data-joint-node={jointKey}
              cx={pt.x}
              cy={pt.y}
              r={isMajor ? 3.4 : 2.5}
              fill="#fcfaf5"
              stroke="#1c3f36"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
    </g>
  );
}

function renderAlignmentGuideItem(
  guide: JointAlignmentGuide,
  mirrored: boolean,
): React.JSX.Element {
  const from = mpt(guide.from, mirrored);
  const to = mpt(guide.to, mirrored);
  const midX = Math.round(((from.x + to.x) / 2) * 10) / 10;
  const midY = Math.round(((from.y + to.y) / 2) * 10) / 10;

  return (
    <g
      key={guide.id}
      data-alignment-id={guide.id}
      data-alignment-kind={guide.kind}
    >
      {guide.kind === 'neutral-zone' ? (
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="rgba(37, 75, 41, 0.18)"
          strokeWidth={9}
          strokeLinecap="round"
        />
      ) : null}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={guide.kind === 'anchor-lock' ? '#254b29' : '#173d34'}
        strokeWidth={1.6}
        strokeDasharray={
          guide.kind === 'plumb-line'
            ? '2 3'
            : guide.kind === 'axis-line'
              ? '5 3'
              : '4 2'
        }
      />
      <circle cx={from.x} cy={from.y} r={2.2} fill="#173d34" />
      <circle cx={to.x} cy={to.y} r={2.2} fill="#173d34" />
      {guide.kind === 'angle-arc' ? (
        <circle
          cx={midX}
          cy={midY}
          r={9}
          fill="none"
          stroke="#173d34"
          strokeWidth={1.2}
          strokeDasharray="3 2"
        />
      ) : null}
    </g>
  );
}

function renderJointAlignmentLayer(
  phaseSpec: PhasePoseSpec,
  mirrored: boolean,
): React.JSX.Element {
  return (
    <g data-layer="joint-alignment">
      {phaseSpec.alignments.map((guide) =>
        renderAlignmentGuideItem(guide, mirrored),
      )}
      {/* Fixed Anchor Locks */}
      {phaseSpec.fixedAnchors.map((anchor) => {
        const pt = mpt(anchor.point, mirrored);
        return (
          <g
            key={`anchor-${anchor.joint}`}
            data-fixed-anchor={anchor.joint}
          >
            <rect
              x={pt.x - 4.5}
              y={pt.y - 4.5}
              width={9}
              height={9}
              rx={1.8}
              fill="#f7f5ef"
              stroke="#173d34"
              strokeWidth={1.7}
            />
            <circle cx={pt.x} cy={pt.y} r={1.8} fill="#173d34" />
          </g>
        );
      })}
      {/* Moving Joint Highlights */}
      {phaseSpec.movingJoints.map((jointKey) => {
        const rawPt = phaseSpec.joints[jointKey];
        if (!rawPt) return null;
        const pt = mpt(rawPt, mirrored);
        return (
          <circle
            key={`moving-${jointKey}`}
            data-moving-joint={jointKey}
            cx={pt.x}
            cy={pt.y}
            r={5.8}
            fill="none"
            stroke="#c86d44"
            strokeWidth={1.3}
            strokeDasharray="2.5 2"
          />
        );
      })}
    </g>
  );
}

function renderMovementDirectionLayer(
  vectors: readonly MovementDirectionVector[],
  mirrored: boolean,
  arrowExcursionId: string,
  arrowControlId: string,
): React.JSX.Element {
  return (
    <g data-layer="movement-direction">
      {vectors.map((vec) => {
        const pts = vec.points.map((pt) => mpt(pt, mirrored));
        if (pts.length < 2) return null;
        const d = buildSmoothCurvePath(pts);
        const isControlOrLengthen =
          vec.kind === 'return-control' || vec.kind === 'axial-lengthening';
        const color = isControlOrLengthen ? '#1f5c4d' : '#9a4220';
        const markerId = isControlOrLengthen
          ? arrowControlId
          : arrowExcursionId;
        const startPt = pts[0];

        return (
          <g
            key={vec.id}
            data-vector-id={vec.id}
            data-vector-kind={vec.kind}
          >
            <path
              d={d}
              fill="none"
              stroke="#f7f5ef"
              strokeWidth={4.4}
              strokeLinecap="round"
              opacity={0.82}
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={2.3}
              strokeLinecap="round"
              strokeDasharray={
                vec.kind === 'axial-lengthening' ? '4 2.5' : undefined
              }
              markerEnd={`url(#${markerId})`}
            />
            <circle
              cx={startPt.x}
              cy={startPt.y}
              r={2.5}
              fill="#f7f5ef"
              stroke={color}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </g>
  );
}

const PHASE_SHORT_BADGE: Record<VisualPhaseId, string> = {
  start: '시작',
  middle: '중간',
  end: '끝',
};

export function MovementPhaseDiagramSvg({
  asset,
  phase,
  activeSide = 'right',
  mirrored = false,
  showAlignment = true,
  showDirection = true,
  showMuscles = true,
  showGhostStartPose = true,
  compact = false,
  className = '',
  label,
}: MovementPhaseDiagramSvgProps): React.JSX.Element {
  const rawUid = useId().replace(/:/g, '');
  const titleId = `mpd-title-${rawUid}`;
  const descId = `mpd-desc-${rawUid}`;
  const arrowExcursionId = `mpd-arrow-excursion-${rawUid}`;
  const arrowControlId = `mpd-arrow-control-${rawUid}`;

  const phaseSpec = asset.phases[phase];
  const activeMuscleLabels = asset.primaryMuscles
    .filter((m) => m.activePhases.includes(phase))
    .map((m) => `${m.labelKo}(${m.roleLabelKo})`)
    .join(', ');

  const accessibleTitle =
    label ??
    `${asset.nameKo} (${asset.nameEn}) · ${phaseSpec.badgeKo} · ${phaseSpec.shortTitleKo}`;

  const accessibleDesc = [
    phaseSpec.summaryKo,
    `호흡 큐: ${phaseSpec.breathCueKo}.`,
    `지지면: ${phaseSpec.apparatusState.supportSurfaceKo}.`,
    activeMuscleLabels ? `활성 타겟 근육: ${activeMuscleLabels}.` : '',
    asset.licenseLabelKo,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={`movement-phase-diagram-svg ${className}`.trim()}
      data-exercise-id={asset.exerciseId}
      data-phase={phase}
      data-archetype-id={asset.archetypeId}
      data-apparatus={asset.apparatus}
      data-body-position={asset.bodyPosition}
      data-active-side={activeSide}
      data-view-mirrored={String(mirrored)}
      data-production-method={asset.productionMethod}
      data-anatomical-accuracy-assumed="false"
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        borderRadius: compact ? '10px' : '14px',
      }}
    >
      <title id={titleId}>{accessibleTitle}</title>
      <desc id={descId}>{accessibleDesc}</desc>

      <defs>
        <marker
          id={arrowExcursionId}
          viewBox="0 0 10 10"
          refX={7}
          refY={5}
          markerWidth={5.5}
          markerHeight={5.5}
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#9a4220" />
        </marker>
        <marker
          id={arrowControlId}
          viewBox="0 0 10 10"
          refX={7}
          refY={5}
          markerWidth={5.5}
          markerHeight={5.5}
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#1f5c4d" />
        </marker>
      </defs>

      {/* Studio Background & Subtle Calibration Grid */}
      <rect
        x={0.5}
        y={0.5}
        width={VIEWBOX_WIDTH - 1}
        height={VIEWBOX_HEIGHT - 1}
        rx={compact ? 10 : 14}
        fill="#f7f5ef"
        stroke="#dfd8ca"
        strokeWidth={1}
      />
      <g stroke="#ebe5d8" strokeWidth={0.75} aria-hidden="true">
        <line x1={16} y1={52} x2={304} y2={52} />
        <line x1={16} y1={100} x2={304} y2={100} />
        <line x1={160} y1={14} x2={160} y2={186} strokeDasharray="3 3" />
      </g>

      {/* 1. Apparatus & Support Surface */}
      {renderApparatusSupportLayer(asset, phaseSpec, mirrored)}

      {/* 2. Pose Delta Ghost Layer (Start vs Middle/End reference) */}
      {showGhostStartPose && phase !== 'start'
        ? renderPoseDeltaGhostLayer(
            asset.phases.start.joints,
            phaseSpec.joints,
            mirrored,
          )
        : null}

      {/* 3. Primary Muscle Highlight Layer */}
      {showMuscles
        ? renderPrimaryMusclesLayer(asset, phaseSpec, phase, mirrored)
        : null}

      {/* 4. Multi-Joint Human Figure Layer */}
      {renderKinematicFigureLayer(phaseSpec, activeSide, mirrored, asset.archetypeId === 'mat-clam-isolated' || asset.archetypeId === 'mat-open-book-isolated')}

      {/* 5. Joint Alignment Layer */}
      {showAlignment ? renderJointAlignmentLayer(phaseSpec, mirrored) : null}

      {/* 6. Movement Direction Vector Layer */}
      {showDirection
        ? renderMovementDirectionLayer(
            phaseSpec.directionVectors,
            mirrored,
            arrowExcursionId,
            arrowControlId,
          )
        : null}
    </svg>
  );
}

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

export function MovementTriptychDiagramSvg({
  asset,
  selectedPhase = 'middle',
  onSelectPhase,
  activeSide = 'right',
  mirrored = false,
  showAlignment = true,
  showDirection = true,
  showMuscles = true,
  showGhostStartPose = true,
  className = '',
}: MovementTriptychDiagramSvgProps): React.JSX.Element {
  const deltaInfo = calculatePhaseJointDelta(asset);

  return (
    <div
      className={`movement-triptych-diagram ${className}`.trim()}
      data-testid="movement-triptych-diagram"
      data-triptych-exercise-id={asset.exerciseId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Step Flow Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '10px',
          background: '#f2eee4',
          border: '1px solid #e2dacb',
          fontSize: '0.8rem',
          color: '#254b3f',
        }}
      >
        <span style={{ fontWeight: 700 }}>
          단계 흐름: 시작 → 중간 → 끝 ({asset.archetypeTitleKo})
        </span>
        <span style={{ color: '#6b5b4b', fontSize: '0.76rem' }}>
          최대 관절 변위 Δ{deltaInfo.maxDeltaPx}px · 가동 관절{' '}
          {deltaInfo.movedJoints.length}개
        </span>
      </div>

      {/* Responsive 3-Panel Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '10px',
        }}
      >
        {PHASE_ORDER.map((phaseId, idx) => {
          const spec = asset.phases[phaseId];
          const isSelected = selectedPhase === phaseId;
          return (
            <div
              key={phaseId}
              data-triptych-panel={phaseId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                borderRadius: '12px',
                background: isSelected ? '#fcfaf5' : '#f5f1e8',
                border: isSelected
                  ? '2px solid #2b6a58'
                  : '1px solid #dfd8ca',
                boxShadow: isSelected
                  ? '0 4px 12px rgba(28, 63, 54, 0.08)'
                  : 'none',
              }}
            >
              <button
                type="button"
                onClick={() => onSelectPhase?.(phaseId)}
                aria-pressed={isSelected}
                data-triptych-phase={phaseId}
                style={{
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: isSelected
                    ? '1px solid #2b6a58'
                    : '1px solid #d8d0c0',
                  background: isSelected ? '#2b6a58' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#1f3f37',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textAlign: 'left',
                  cursor: onSelectPhase ? 'pointer' : 'default',
                }}
              >
                <span>
                  {idx + 1}. {PHASE_SHORT_BADGE[phaseId]} · {spec.shortTitleKo}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    background: isSelected
                      ? 'rgba(255, 255, 255, 0.2)'
                      : '#eee8dc',
                    color: isSelected ? '#ffffff' : '#5a4d3f',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {phaseId.toUpperCase()}
                </span>
              </button>

              <MovementPhaseDiagramSvg
                asset={asset}
                phase={phaseId}
                activeSide={activeSide}
                mirrored={mirrored}
                showAlignment={showAlignment}
                showDirection={showDirection}
                showMuscles={showMuscles}
                showGhostStartPose={showGhostStartPose}
                compact
              />

              <div
                style={{
                  fontSize: '0.76rem',
                  lineHeight: 1.4,
                  color: '#3f4f49',
                  padding: '2px 4px',
                }}
              >
                <div style={{ fontWeight: 600, color: '#8c472b' }}>
                  {spec.breathCueKo}
                </div>
                <div style={{ marginTop: '2px' }}>{spec.summaryKo}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
