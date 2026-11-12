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

function r1(val: number): number {
  return Math.round(val * 10) / 10;
}

function mx(x: number, mirrored: boolean): number {
  const val = mirrored ? VIEWBOX_WIDTH - x : x;
  return r1(val);
}

function my(y: number): number {
  return r1(y);
}

function mpt(pt: Point2D, mirrored: boolean): Point2D {
  return {
    x: mx(pt.x, mirrored),
    y: my(pt.y),
  };
}

function lerpSubPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: r1(a.x + (b.x - a.x) * t),
    y: r1(a.y + (b.y - a.y) * t),
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
    const midX = r1((curr.x + next.x) / 2);
    const midY = r1((curr.y + next.y) / 2);
    d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/**
 * Builds a smooth tapered anatomical silhouette around a multi-point limb/torso chain,
 * supporting anatomical muscle-belly swells (quadriceps/gastrocnemius/deltoid/ribcage).
 */
function buildTaperedChainSilhouettePath(
  points: readonly Point2D[],
  radii: readonly number[],
): string {
  if (points.length < 2) return '';
  const n = points.length;
  const leftSide: Point2D[] = [];
  const rightSide: Point2D[] = [];

  for (let i = 0; i < n; i += 1) {
    const prev = points[Math.max(0, i - 1)];
    const curr = points[i];
    const next = points[Math.min(n - 1, i + 1)];
    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty);
    if (len < 0.01) {
      tx = 1;
      ty = 0;
    } else {
      tx /= len;
      ty /= len;
    }
    const nx = -ty;
    const ny = tx;
    const rad = radii[Math.min(i, radii.length - 1)] ?? 4;
    leftSide.push({ x: r1(curr.x + nx * rad), y: r1(curr.y + ny * rad) });
    rightSide.push({ x: r1(curr.x - nx * rad), y: r1(curr.y - ny * rad) });
  }

  const rStart = radii[0] ?? 4;
  const rEnd = radii[Math.min(n - 1, radii.length - 1)] ?? 3;
  const startLeft = leftSide[0];
  const endRight = rightSide[n - 1];

  const forwardCurve = buildSmoothCurvePath(leftSide).replace(/^M [^ ]+ [^ ]+/, '');
  const reverseRight = [...rightSide].reverse();
  const backwardCurve = buildSmoothCurvePath(reverseRight).replace(/^M [^ ]+ [^ ]+/, '');

  return [
    `M ${startLeft.x} ${startLeft.y}`,
    forwardCurve,
    `A ${r1(rEnd)} ${r1(rEnd)} 0 0 0 ${endRight.x} ${endRight.y}`,
    backwardCurve,
    `A ${r1(rStart)} ${r1(rStart)} 0 0 0 ${startLeft.x} ${startLeft.y}`,
    'Z',
  ].join(' ');
}

function buildAnatomicalLimbProfile(
  proximal: Point2D,
  mid: Point2D,
  distal: Point2D,
  radii5: readonly [number, number, number, number, number],
): string {
  const upperBelly = lerpSubPoint(proximal, mid, 0.44);
  const lowerBelly = lerpSubPoint(mid, distal, 0.38);
  return buildTaperedChainSilhouettePath(
    [proximal, upperBelly, mid, lowerBelly, distal],
    radii5,
  );
}

function getMusclePalette(role: MuscleHighlightSpec['role']): {
  stroke: string;
  glow: string;
  core: string;
} {
  switch (role) {
    case 'primary':
      return {
        stroke: '#bf5a41',
        glow: 'rgba(191, 90, 65, 0.16)',
        core: 'rgba(191, 90, 65, 0.42)',
      };
    case 'stabilizer':
      return {
        stroke: '#2c6653',
        glow: 'rgba(44, 102, 83, 0.14)',
        core: 'rgba(44, 102, 83, 0.36)',
      };
    case 'lengthening':
      return {
        stroke: '#b58435',
        glow: 'rgba(181, 132, 53, 0.14)',
        core: 'rgba(181, 132, 53, 0.38)',
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
  let d = `M ${r1(x1)} ${r1(y1)}`;
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const sign = i % 2 === 1 ? 1 : -1;
    const px = x1 + dx * t + nx * amplitude * sign;
    const py = y1 + dy * t + ny * amplitude * sign;
    d += ` L ${r1(px)} ${r1(py)}`;
  }
  d += ` L ${r1(x2)} ${r1(y2)}`;
  return d;
}

interface StudioGradientIds {
  oakId: string;
  upholsteryId: string;
  torsoId: string;
  nearLegId: string;
  skinId: string;
}

function renderApparatusSupportLayer(
  asset: CatalogMovementVisualAsset,
  phaseSpec: PhasePoseSpec,
  mirrored: boolean,
  grads: StudioGradientIds,
): React.JSX.Element {
  const { apparatusState } = phaseSpec;
  const carriageShift = Math.round(apparatusState.carriageOffsetPx * 0.35);
  const springColor =
    apparatusState.springTensionLevel === 'high'
      ? '#bf5a41'
      : apparatusState.springTensionLevel === 'medium'
        ? '#b87430'
        : '#356859';

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

    const surfaceText = `${apparatusState.supportSurfaceKo} ${apparatusState.propPositionKo ?? ''}`;
    const hasSittingBox =
      /박스|롱박스|쇼트박스|box/i.test(surfaceText) ||
      /box|swan|teaser|pulling-straps|backstroke/i.test(asset.archetypeId);
    const boxLeftRaw = carriageStart + 58;
    const boxRightRaw = carriageStart + 146;
    const boxMinX = Math.min(mx(boxLeftRaw, mirrored), mx(boxRightRaw, mirrored));
    const boxWidth = Math.abs(mx(boxRightRaw, mirrored) - mx(boxLeftRaw, mirrored));

    const usesPulleyStraps =
      /strap|hundred|frog|circle|row|arm-press|supine-arm|backstroke|pulling/i.test(
        `${asset.archetypeId} ${asset.exerciseId}`,
      );
    const strapUsesFeet = /feet-in-straps|strap-frog|circle|lower-lift/i.test(
      `${asset.archetypeId} ${asset.exerciseId}`,
    );
    const strapTarget = strapUsesFeet
      ? p(phaseSpec.joints.ankle.x, phaseSpec.joints.ankle.y)
      : p(phaseSpec.joints.hand.x, phaseSpec.joints.hand.y);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="reformer"
        data-carriage-offset={apparatusState.carriageOffsetPx}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <ellipse cx={160} cy={179} rx={144} ry={3.8} fill="rgba(28, 52, 43, 0.08)" />
        <line x1={12} y1={178} x2={308} y2={178} stroke="#d5cec0" strokeWidth={1.4} />

        <rect
          x={25}
          y={164}
          width={9}
          height={14}
          rx={2}
          fill="#9d774c"
          stroke="#755634"
          strokeWidth={1}
        />
        <rect
          x={286}
          y={164}
          width={9}
          height={14}
          rx={2}
          fill="#9d774c"
          stroke="#755634"
          strokeWidth={1}
        />
        <rect
          x={18}
          y={153.5}
          width={284}
          height={11.5}
          rx={3.5}
          fill={`url(#${grads.oakId})`}
          stroke="#87633b"
          strokeWidth={1.4}
        />
        <line
          x1={22}
          y1={155.8}
          x2={298}
          y2={155.8}
          stroke="rgba(255, 250, 240, 0.65)"
          strokeWidth={1.1}
        />

        <line x1={24} y1={150.8} x2={294} y2={150.8} stroke="#788882" strokeWidth={2.2} />
        <circle cx={cMinX + 14} cy={151.5} r={2.1} fill="#4c5d56" />
        <circle cx={cMinX + Math.max(18, cWidth - 14)} cy={151.5} r={2.1} fill="#4c5d56" />

        <path
          d={renderSpringCoilPath(springStart.x, springStart.y, springEnd.x, springEnd.y, 7, 3.2)}
          fill="none"
          stroke={springColor}
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <rect
          x={cMinX}
          y={142}
          width={cWidth}
          height={9.8}
          rx={3.5}
          fill={`url(#${grads.upholsteryId})`}
          stroke="#24443a"
          strokeWidth={1.5}
        />
        <line
          x1={cMinX + 4}
          y1={144.2}
          x2={cMinX + Math.max(8, cWidth - 4)}
          y2={144.2}
          stroke="rgba(245, 247, 242, 0.44)"
          strokeWidth={1}
        />

        {hasSittingBox ? (
          <g data-reformer-accessory="sitting-box">
            <rect
              x={boxMinX}
              y={123}
              width={boxWidth}
              height={19}
              rx={3.5}
              fill={`url(#${grads.upholsteryId})`}
              stroke="#2c443c"
              strokeWidth={1.3}
            />
            <line
              x1={boxMinX + 4}
              y1={125.5}
              x2={boxMinX + Math.max(8, boxWidth - 4)}
              y2={125.5}
              stroke="rgba(255, 252, 245, 0.38)"
              strokeWidth={1}
            />
          </g>
        ) : null}

        <line
          x1={headrestX1}
          y1={138.8}
          x2={headrestX2}
          y2={142.8}
          stroke="#2b4c41"
          strokeWidth={4.4}
          strokeLinecap="round"
        />
        <rect
          x={shoulderX - 4}
          y={130.5}
          width={8}
          height={12}
          rx={2.2}
          fill="#355449"
          stroke="#1f3b32"
          strokeWidth={1.2}
        />

        <line
          x1={pulleyPostBase.x}
          y1={pulleyPostBase.y}
          x2={pulleyPostTop.x}
          y2={pulleyPostTop.y}
          stroke="#6b5235"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          cx={pulleyPostTop.x}
          cy={pulleyPostTop.y}
          r={3.4}
          fill="#fcfaf5"
          stroke="#2f5247"
          strokeWidth={1.5}
        />
        {usesPulleyStraps ? (
          <line
            x1={pulleyPostTop.x}
            y1={pulleyPostTop.y}
            x2={strapTarget.x}
            y2={strapTarget.y}
            stroke="#38658e"
            strokeWidth={1.35}
            strokeDasharray="3 2"
            opacity={0.76}
          />
        ) : null}

        <line
          x1={footbarBase.x}
          y1={footbarBase.y}
          x2={footbarTop.x}
          y2={footbarTop.y}
          stroke="#354b44"
          strokeWidth={3.6}
          strokeLinecap="round"
        />
        <circle
          cx={footbarTop.x}
          cy={footbarTop.y}
          r={4.5}
          fill="#223b33"
          stroke="#fcfaf5"
          strokeWidth={1.3}
        />
      </g>
    );
  }

  if (asset.apparatus === 'cadillac') {
    const leftPoleX = mx(26, mirrored);
    const rightPoleX = mx(294, mirrored);
    const ptbPivot = p(78, 27);
    const barEnd = p(
      96 + Math.round(carriageShift * 0.6),
      64 + Math.round(carriageShift * 0.25),
    );
    const springAnchor = p(26, 44);
    const handTarget = p(phaseSpec.joints.hand.x, phaseSpec.joints.hand.y);

    // STRICT INVARIANT: Zero <path> elements inside Cadillac apparatus-support when springTensionLevel === 'none'
    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="cadillac"
        data-carriage-offset={apparatusState.carriageOffsetPx}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <ellipse cx={160} cy={183} rx={142} ry={3.4} fill="rgba(28, 52, 43, 0.08)" />
        <line x1={12} y1={182} x2={308} y2={182} stroke="#d5cec0" strokeWidth={1.5} />

        <rect
          x={31}
          y={162}
          width={7}
          height={20}
          rx={1.5}
          fill="#8f6b43"
          stroke="#6b4f30"
          strokeWidth={1}
        />
        <rect
          x={282}
          y={162}
          width={7}
          height={20}
          rx={1.5}
          fill="#8f6b43"
          stroke="#6b4f30"
          strokeWidth={1}
        />

        <rect
          x={22}
          y={144.5}
          width={276}
          height={10.5}
          rx={3.2}
          fill={`url(#${grads.upholsteryId})`}
          stroke="#26473d"
          strokeWidth={1.5}
        />
        <line
          x1={26}
          y1={146.8}
          x2={294}
          y2={146.8}
          stroke="rgba(250, 250, 245, 0.42)"
          strokeWidth={1}
        />
        <rect
          x={22}
          y={155}
          width={276}
          height={8}
          rx={2.2}
          fill={`url(#${grads.oakId})`}
          stroke="#87633b"
          strokeWidth={1.3}
        />

        <line x1={leftPoleX} y1={27} x2={leftPoleX} y2={145} stroke="#63766f" strokeWidth={3.2} />
        <line x1={rightPoleX} y1={27} x2={rightPoleX} y2={145} stroke="#63766f" strokeWidth={3.2} />
        <line
          x1={24}
          y1={27}
          x2={296}
          y2={27}
          stroke="#4b5f58"
          strokeWidth={3.6}
          strokeLinecap="round"
        />
        <circle cx={leftPoleX} cy={27} r={2.8} fill="#dce3df" stroke="#394d46" strokeWidth={1.2} />
        <circle cx={rightPoleX} cy={27} r={2.8} fill="#dce3df" stroke="#394d46" strokeWidth={1.2} />

        <line
          x1={ptbPivot.x}
          y1={ptbPivot.y}
          x2={barEnd.x}
          y2={barEnd.y}
          stroke="#35584e"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <circle
          cx={barEnd.x}
          cy={barEnd.y}
          r={3.8}
          fill="#bf5a41"
          stroke="#fcfaf5"
          strokeWidth={1.1}
        />
        {apparatusState.springTensionLevel !== 'none' ? (
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
            strokeWidth={1.5}
            opacity={0.82}
          />
        ) : null}
      </g>
    );
  }

  if (asset.apparatus === 'chair') {
    const boxLeft = mx(112, mirrored);
    const boxRight = mx(192, mirrored);
    const boxMinX = Math.min(boxLeft, boxRight);
    const boxW = Math.abs(boxRight - boxLeft);
    const hinge = p(168, 164);
    const angleRad = ((40 - apparatusState.pedalAngleDeg * 1.3) * Math.PI) / 180;
    const dirSign = mirrored ? -1 : 1;
    const pedalTip = {
      x: r1(hinge.x + dirSign * Math.cos(angleRad) * 50),
      y: r1(hinge.y - Math.sin(angleRad) * 50),
    };
    const springBase = p(148, 168);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="chair"
        data-pedal-angle={apparatusState.pedalAngleDeg}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <ellipse cx={160} cy={179} rx={96} ry={3.4} fill="rgba(28, 52, 43, 0.09)" />
        <line x1={12} y1={178} x2={308} y2={178} stroke="#d5cec0" strokeWidth={1.5} />

        <rect
          x={boxMinX}
          y={114}
          width={boxW}
          height={64}
          rx={4.5}
          fill={`url(#${grads.oakId})`}
          stroke="#7e5b36"
          strokeWidth={1.6}
        />
        <rect
          x={boxMinX + 7}
          y={121}
          width={Math.max(12, boxW - 14)}
          height={49}
          rx={3}
          fill="#dfc09a"
          stroke="#a58158"
          strokeWidth={1}
        />

        <rect
          x={boxMinX - 4}
          y={105.5}
          width={boxW + 8}
          height={9.5}
          rx={3.2}
          fill={`url(#${grads.upholsteryId})`}
          stroke="#24443a"
          strokeWidth={1.5}
          data-chair-seat="fixed"
        />
        <line
          x1={boxMinX}
          y1={107.8}
          x2={boxMinX + boxW}
          y2={107.8}
          stroke="rgba(250, 250, 245, 0.42)"
          strokeWidth={1}
        />
        <line
          x1={mx(144, mirrored)}
          y1={106}
          x2={mx(144, mirrored)}
          y2={78}
          stroke="#4b5f58"
          strokeWidth={2.8}
          strokeLinecap="round"
          data-chair-handle="post"
        />
        <rect
          x={mx(144, mirrored) - 6}
          y={75}
          width={12}
          height={5.5}
          rx={2.6}
          fill="#26473d"
          stroke="#fcfaf5"
          strokeWidth={0.9}
          data-chair-handle="grip"
        />

        <path
          d={renderSpringCoilPath(springBase.x, springBase.y, pedalTip.x, pedalTip.y, 5, 2.8)}
          fill="none"
          stroke={springColor}
          strokeWidth={1.7}
        />

        <line
          x1={hinge.x}
          y1={hinge.y}
          x2={pedalTip.x}
          y2={pedalTip.y}
          stroke="#2d4f44"
          strokeWidth={4.4}
          strokeLinecap="round"
          data-chair-pedal="hinged"
        />
        <circle
          cx={hinge.x}
          cy={hinge.y}
          r={3.4}
          fill="#fcfaf5"
          stroke="#2d4f44"
          strokeWidth={1.5}
        />
        <circle
          cx={pedalTip.x}
          cy={pedalTip.y}
          r={4.2}
          fill="#1f3b32"
          stroke="#fcfaf5"
          strokeWidth={1.2}
        />
      </g>
    );
  }

  if (asset.apparatus === 'barrel') {
    const isStandingBarrel = asset.bodyPosition === 'standing';
    const arcLeft = isStandingBarrel ? p(18, 174) : p(68, 174);
    const arcPeak1 = isStandingBarrel ? p(24, 106) : p(76, 102);
    const arcPeak2 = isStandingBarrel ? p(64, 106) : p(164, 102);
    const arcRight = isStandingBarrel ? p(70, 174) : p(174, 174);
    const ladderFrontX = mx(isStandingBarrel ? 76 : 222, mirrored);
    const ladderBackX = mx(isStandingBarrel ? 96 : 256, mirrored);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="barrel"
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <ellipse cx={154} cy={179} rx={126} ry={3.5} fill="rgba(28, 52, 43, 0.08)" />
        <line x1={12} y1={178} x2={308} y2={178} stroke="#d5cec0" strokeWidth={1.5} />

        <path
          d={`M ${arcLeft.x} ${arcLeft.y} C ${arcPeak1.x} ${arcPeak1.y} ${arcPeak2.x} ${arcPeak2.y} ${arcRight.x} ${arcRight.y} Z`}
          fill={`url(#${grads.upholsteryId})`}
          fillOpacity={0.38}
          stroke="#27493e"
          strokeWidth={2.4}
        />
        <path
          d={`M ${r1(arcLeft.x * 0.85 + arcRight.x * 0.15)} ${arcLeft.y} C ${arcPeak1.x} ${arcPeak1.y + 12} ${arcPeak2.x} ${arcPeak2.y + 12} ${r1(arcRight.x * 0.85 + arcLeft.x * 0.15)} ${arcRight.y} Z`}
          fill={`url(#${grads.oakId})`}
          fillOpacity={0.52}
          stroke="#87633b"
          strokeWidth={1.2}
        />

        <line
          x1={arcLeft.x}
          y1={174}
          x2={ladderBackX}
          y2={174}
          stroke="#87633b"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
        <line
          x1={ladderFrontX}
          y1={54}
          x2={ladderFrontX}
          y2={176}
          stroke="#9c754a"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <line
          x1={ladderBackX}
          y1={44}
          x2={ladderBackX}
          y2={176}
          stroke="#7e5b36"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {[66, 88, 110, 132, 154].map((ry) => (
          <line
            key={ry}
            x1={ladderFrontX}
            y1={ry}
            x2={ladderBackX}
            y2={ry - 6}
            stroke="#59422a"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  }

  // Default: Studio Mat
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
      <ellipse cx={160} cy={157.5} rx={138} ry={3.2} fill="rgba(28, 52, 43, 0.08)" />
      <line x1={12} y1={176} x2={308} y2={176} stroke="#d5cec0" strokeWidth={1.2} />
      <rect
        x={20}
        y={147.5}
        width={280}
        height={8.5}
        rx={4.2}
        fill={`url(#${grads.upholsteryId})`}
        fillOpacity={0.58}
        stroke="#2c5044"
        strokeWidth={1.6}
      />
      <line
        x1={28}
        y1={149.8}
        x2={292}
        y2={149.8}
        stroke="rgba(255, 253, 248, 0.52)"
        strokeWidth={0.9}
      />
      {apparatusState.propPositionKo ? (
        <circle
          cx={propCenter.x}
          cy={propCenter.y}
          r={11}
          fill="rgba(191, 90, 65, 0.12)"
          stroke="#bf5a41"
          strokeWidth={1.7}
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
  compact: boolean,
  fallbackReferenceJoints?: RigJointMap,
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

  let movedVectors = trackedJoints
    .map((joint) => {
      const fromPt = s(joint);
      const toPt = c(joint);
      const dist = Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y);
      return { joint, fromPt, toPt, dist };
    })
    .filter((item) => item.dist >= 3);

  if (movedVectors.length === 0 && fallbackReferenceJoints) {
    const f = (k: keyof RigJointMap): Point2D =>
      mpt(fallbackReferenceJoints[k] ?? fallbackReferenceJoints.pelvis, mirrored);
    movedVectors = trackedJoints
      .map((joint) => {
        const fromPt = f(joint);
        const toPt = c(joint);
        const dist = Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y);
        return { joint, fromPt, toPt, dist };
      })
      .filter((item) => item.dist >= 3);
  }

  return (
    <g data-layer="pose-delta-ghost" opacity={compact ? 0.34 : 0.65}>
      <g
        data-ghost-pose="start"
        stroke="#7a8c82"
        strokeDasharray="3 3"
        fill="none"
        opacity={0.36}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={buildSmoothCurvePath(spinePts)} strokeWidth={1.8} />
        <path d={buildPolylinePath(armPts)} strokeWidth={1.5} />
        <path d={buildPolylinePath(legPts)} strokeWidth={1.7} />
        <circle cx={headPt.x} cy={headPt.y} r={7.2} strokeWidth={1.2} />
      </g>
      {movedVectors.map(({ joint, fromPt, toPt }) => (
        <g key={`delta-${joint}`} data-pose-delta-vector={joint}>
          <line
            x1={fromPt.x}
            y1={fromPt.y}
            x2={toPt.x}
            y2={toPt.y}
            stroke="#bf5a41"
            strokeWidth={compact ? 0.8 : 1}
            strokeDasharray="2 2.5"
            opacity={0.44}
          />
          <circle cx={fromPt.x} cy={fromPt.y} r={1.4} fill="#7a8c82" opacity={0.48} />
        </g>
      ))}
    </g>
  );
}

function interpolateAlongPolyline(pts: readonly Point2D[], fraction: number): Point2D {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  const clamped = Math.max(0.15, Math.min(0.85, fraction));
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLengths.push(len);
    totalLen += len;
  }
  if (totalLen <= 0.001) return pts[0];
  const targetDist = totalLen * clamped;
  let accum = 0;
  for (let i = 0; i < segLengths.length; i += 1) {
    const segLen = segLengths[i];
    if (accum + segLen >= targetDist || i === segLengths.length - 1) {
      const localT = segLen > 0.001 ? (targetDist - accum) / segLen : 0.5;
      return {
        x: r1(pts[i].x + (pts[i + 1].x - pts[i].x) * localT),
        y: r1(pts[i].y + (pts[i + 1].y - pts[i].y) * localT),
      };
    }
    accum += segLen;
  }
  return pts[Math.floor(pts.length / 2)];
}

function offsetPolylineNormal(pts: readonly Point2D[], offsetPx: number): Point2D[] {
  if (pts.length < 2 || Math.abs(offsetPx) < 0.01) return [...pts];
  const first = pts[0];
  const last = pts[pts.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return pts.map((pt) => ({
    x: r1(pt.x + nx * offsetPx),
    y: r1(pt.y + ny * offsetPx),
  }));
}

function renderPrimaryMusclesLayer(
  asset: CatalogMovementVisualAsset,
  phaseSpec: PhasePoseSpec,
  phase: VisualPhaseId,
  mirrored: boolean,
  compact: boolean,
): React.JSX.Element {
  const activeMuscles = asset.primaryMuscles.filter((m) => m.activePhases.includes(phase));
  const musclesToRender = activeMuscles.length > 0 ? activeMuscles : asset.primaryMuscles;

  const signatureCounts = new Map<string, number>();

  return (
    <g data-layer="primary-muscles" opacity={compact ? 0.42 : 0.76}>
      {musclesToRender.map((muscle) => {
        const palette = getMusclePalette(muscle.role);
        const rawPts = muscle.anchorJoints
          .map((jKey) => phaseSpec.joints[jKey])
          .filter((pt): pt is Point2D => Boolean(pt))
          .map((pt) => mpt(pt, mirrored));

        if (rawPts.length === 0) return null;

        const sig = muscle.anchorJoints.join('-');
        const occurrenceIdx = signatureCounts.get(sig) ?? 0;
        signatureCounts.set(sig, occurrenceIdx + 1);

        const normalShiftPx =
          occurrenceIdx === 0 ? 0 : occurrenceIdx % 2 === 1 ? 3.5 : -3.5;
        const midFraction =
          occurrenceIdx === 0 ? 0.5 : occurrenceIdx % 2 === 1 ? 0.36 : 0.64;

        const pts = offsetPolylineNormal(rawPts, normalShiftPx);
        const pathD = buildSmoothCurvePath(pts);
        const midPt = interpolateAlongPolyline(pts, midFraction);

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
              strokeWidth={
                compact
                  ? muscle.role === 'primary'
                    ? 8
                    : 6
                  : muscle.role === 'primary'
                    ? 12
                    : 9
              }
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke={palette.core}
              strokeWidth={
                compact
                  ? muscle.role === 'primary'
                    ? 2.6
                    : 2
                  : muscle.role === 'primary'
                    ? 3.8
                    : 2.8
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={muscle.role === 'lengthening' ? '4 3' : undefined}
            />
            {!compact && (
              <circle
                cx={midPt.x}
                cy={midPt.y}
                r={muscle.role === 'primary' ? 2.8 : 2.2}
                fill={palette.stroke}
                fillOpacity={0.3}
                stroke={palette.stroke}
                strokeWidth={0.95}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Editorial Studio Practitioner Renderer:
 * Cohesive tailored sage-emerald Pilates bodysuit/leggings + warm natural skin tones,
 * sculpted muscle-belly silhouettes, neat studio hair-bun profile, and subtle internal precision pins.
 */
function renderKinematicFigureLayer(
  phaseSpec: PhasePoseSpec,
  activeSide: 'left' | 'right',
  mirrored: boolean,
  grads: StudioGradientIds,
  showShoulderConnection = false,
): React.JSX.Element {
  const { joints } = phaseSpec;
  const nearSide = activeSide;
  const farSide: 'left' | 'right' = activeSide === 'right' ? 'left' : 'right';

  const j = (k: keyof RigJointMap): Point2D => mpt(joints[k] ?? joints.pelvis, mirrored);

  const authoredFarHipPt = joints.farHip
    ? mpt(joints.farHip, mirrored)
    : { x: r1(j('hip').x - 3), y: r1(j('hip').y - 3) };
  const authoredFarKneePt = joints.farKnee
    ? mpt(joints.farKnee, mirrored)
    : { x: r1(j('knee').x - 4), y: r1(j('knee').y - 4) };
  const authoredFarAnklePt = joints.farAnkle
    ? mpt(joints.farAnkle, mirrored)
    : { x: r1(j('ankle').x - 4), y: r1(j('ankle').y - 3) };
  const authoredFarToePt = joints.farToe
    ? mpt(joints.farToe, mirrored)
    : { x: r1(j('toe').x - 4), y: r1(j('toe').y - 3) };

  const authoredFarShoulderPt = joints.farShoulder
    ? mpt(joints.farShoulder, mirrored)
    : { x: r1(j('shoulder').x - 3), y: r1(j('shoulder').y - 3) };
  const authoredFarElbowPt = joints.farElbow
    ? mpt(joints.farElbow, mirrored)
    : { x: r1(j('elbow').x - 4), y: r1(j('elbow').y - 3) };
  const authoredFarWristPt = joints.farWrist
    ? mpt(joints.farWrist, mirrored)
    : { x: r1(j('wrist').x - 4), y: r1(j('wrist').y - 3) };

  const isSwappedSide = activeSide === 'left';
  const farHipPt = isSwappedSide ? j('hip') : authoredFarHipPt;
  const farKneePt = isSwappedSide ? j('knee') : authoredFarKneePt;
  const farAnklePt = isSwappedSide ? j('ankle') : authoredFarAnklePt;
  const farToePt = isSwappedSide ? j('toe') : authoredFarToePt;
  const farShoulderPt = isSwappedSide ? j('shoulder') : authoredFarShoulderPt;
  const farElbowPt = isSwappedSide ? j('elbow') : authoredFarElbowPt;
  const farWristPt = isSwappedSide ? j('wrist') : authoredFarWristPt;

  const nearHipPt = isSwappedSide ? authoredFarHipPt : j('hip');
  const nearKneePt = isSwappedSide ? authoredFarKneePt : j('knee');
  const nearAnklePt = isSwappedSide ? authoredFarAnklePt : j('ankle');
  const nearToePt = isSwappedSide ? authoredFarToePt : j('toe');
  const nearHeelPt = isSwappedSide
    ? {
        x: r1(nearAnklePt.x + (j('heel').x - j('ankle').x)),
        y: r1(nearAnklePt.y + (j('heel').y - j('ankle').y)),
      }
    : j('heel');
  const nearShoulderPt = isSwappedSide ? authoredFarShoulderPt : j('shoulder');
  const nearElbowPt = isSwappedSide ? authoredFarElbowPt : j('elbow');
  const nearWristPt = isSwappedSide ? authoredFarWristPt : j('wrist');
  const nearHandPt = isSwappedSide
    ? {
        x: r1(nearWristPt.x + (j('hand').x - j('wrist').x)),
        y: r1(nearWristPt.y + (j('hand').y - j('wrist').y)),
      }
    : j('hand');

  const spinePts = [j('pelvis'), j('lumbar'), j('thoracic'), j('neck'), j('head')];
  const torsoPts = [
    j('pelvis'),
    lerpSubPoint(j('pelvis'), j('lumbar'), 0.55),
    j('lumbar'),
    j('thoracic'),
    j('neck'),
  ];
  const nearLegPts = [nearHipPt, nearKneePt, nearAnklePt];
  const nearFootPts = [nearAnklePt, nearHeelPt, nearToePt, nearAnklePt];
  const nearArmPts = [nearShoulderPt, nearElbowPt, nearWristPt, nearHandPt];

  const headPt = j('head');
  const neckPt = j('neck');
  const headDx = headPt.x - neckPt.x;
  const headDy = headPt.y - neckPt.y;
  const headLen = Math.hypot(headDx, headDy) || 1;
  const ux = headDx / headLen;
  const uy = headDy / headLen;
  const n1 = { x: -uy, y: ux };
  const n2 = { x: uy, y: -ux };
  const antHint =
    Math.abs(headDy) >= Math.abs(headDx)
      ? {
          x:
            j('toe').x - j('heel').x ||
            j('hand').x - j('shoulder').x ||
            (mirrored ? -1 : 1),
          y: 0,
        }
      : j('wrist').y > j('shoulder').y + 8 || j('toe').y > j('heel').y + 2
        ? { x: 0, y: 1 }
        : { x: 0, y: -1 };
  const chosenNormal =
    n1.x * antHint.x + n1.y * antHint.y >= n2.x * antHint.x + n2.y * antHint.y ? n1 : n2;

  // Subtle anterior facial contour cue inside head silhouette (replaces external protruding stick)
  const gazeStart: Point2D = {
    x: r1(headPt.x + chosenNormal.x * 2.4),
    y: r1(headPt.y + chosenNormal.y * 2.4),
  };
  const gazeTip: Point2D = {
    x: r1(headPt.x + chosenNormal.x * 7.8),
    y: r1(headPt.y + chosenNormal.y * 7.8),
  };
  const bunPt: Point2D = {
    x: r1(headPt.x - chosenNormal.x * 6.8 + ux * 4.5),
    y: r1(headPt.y - chosenNormal.y * 6.8 + uy * 4.5),
  };

  const activeJointCoords: Record<
    'shoulder' | 'elbow' | 'wrist' | 'hand' | 'hip' | 'knee' | 'ankle',
    Point2D
  > = {
    shoulder: nearShoulderPt,
    elbow: nearElbowPt,
    wrist: nearWristPt,
    hand: nearHandPt,
    hip: nearHipPt,
    knee: nearKneePt,
    ankle: nearAnklePt,
  };

  const torsoCapsuleD = buildTaperedChainSilhouettePath(torsoPts, [8.8, 7.6, 7.0, 9.0, 5.0]);
  const pelvisGirdleBridgeD = buildTaperedChainSilhouettePath(
    [farHipPt, j('pelvis'), nearHipPt],
    [6.2, 8.6, 7.2],
  );
  const shoulderYokeBridgeD = buildTaperedChainSilhouettePath(
    [farShoulderPt, j('neck'), j('thoracic'), nearShoulderPt],
    [4.3, 5.0, 7.8, 5.1],
  );
  const neckCylinderD = buildTaperedChainSilhouettePath(
    [
      lerpSubPoint(j('thoracic'), neckPt, 0.58),
      neckPt,
      lerpSubPoint(neckPt, headPt, 0.68),
    ],
    [5.2, 3.8, 3.4],
  );
  const farLegCapsuleD = buildAnatomicalLimbProfile(
    farHipPt,
    farKneePt,
    farAnklePt,
    [5.8, 6.0, 4.2, 4.5, 2.7],
  );
  const farArmCapsuleD = buildAnatomicalLimbProfile(
    farShoulderPt,
    farElbowPt,
    farWristPt,
    [4.0, 3.9, 3.0, 2.9, 2.2],
  );
  const nearLegCapsuleD = buildAnatomicalLimbProfile(
    nearHipPt,
    nearKneePt,
    nearAnklePt,
    [7.0, 7.3, 5.0, 5.4, 3.1],
  );
  const nearArmCapsuleD = buildTaperedChainSilhouettePath(
    [
      nearShoulderPt,
      lerpSubPoint(nearShoulderPt, nearElbowPt, 0.45),
      nearElbowPt,
      lerpSubPoint(nearElbowPt, nearWristPt, 0.42),
      nearWristPt,
      nearHandPt,
    ],
    [5.2, 4.8, 3.7, 3.5, 2.6, 2.2],
  );

  return (
    <g data-layer="kinematic-figure" strokeLinecap="round" strokeLinejoin="round">
      {/* Contralateral / Far Side Limbs (soft depth perspective) */}
      <g
        data-anatomical-side={farSide}
        data-limb-depth="far"
        fill="none"
        stroke="#4f6b60"
        opacity={0.78}
      >
        <path d={farLegCapsuleD} fill="#89a396" fillOpacity={0.74} stroke="#5d786b" strokeWidth={0.9} />
        <path d={farArmCapsuleD} fill="#e2c6ae" fillOpacity={0.78} stroke="#9c7960" strokeWidth={0.85} />
        <path
          d={buildPolylinePath([farHipPt, farKneePt, farAnklePt, farToePt])}
          strokeWidth={1.35}
          strokeDasharray="4 3.5"
          strokeOpacity={0.48}
        />
        <path
          d={buildPolylinePath([farShoulderPt, farElbowPt, farWristPt])}
          strokeWidth={1.2}
          strokeDasharray="4 3.5"
          strokeOpacity={0.45}
        />
      </g>

      {showShoulderConnection && (
        <path
          data-segment="schematic-shoulder-connection"
          d={buildPolylinePath([j('neck'), nearShoulderPt, j('thoracic')])}
          stroke="#26473b"
          strokeWidth={2.2}
          strokeOpacity={0.65}
          fill="none"
        />
      )}

      {/* Sculpted Connected Studio Bodysuit Torso, Girdle Bridges, Graceful Neck & Hair-Bun Cranium */}
      <g data-segment="spine-torso" fill="none">
        <path
          data-segment="neck-bridge"
          d={neckCylinderD}
          fill={`url(#${grads.skinId})`}
          stroke="#5c4333"
          strokeWidth={1.05}
        />
        <path
          data-segment="pelvis-girdle-bridge"
          d={pelvisGirdleBridgeD}
          fill={`url(#${grads.torsoId})`}
          stroke="#1f3e32"
          strokeWidth={1.15}
        />
        <path
          data-segment="shoulder-yoke-bridge"
          d={shoulderYokeBridgeD}
          fill={`url(#${grads.torsoId})`}
          stroke="#1f3e32"
          strokeWidth={1.15}
        />
        <path
          d={torsoCapsuleD}
          fill={`url(#${grads.torsoId})`}
          stroke="#1f3e32"
          strokeWidth={1.35}
        />
        <path
          d={buildSmoothCurvePath(spinePts)}
          stroke="#dce8e1"
          strokeWidth={1.35}
          strokeOpacity={0.42}
        />

        {/* Studio low-bun & warm-skin head silhouette */}
        <circle
          cx={bunPt.x}
          cy={bunPt.y}
          r={3.9}
          fill="#233830"
          stroke="#192b24"
          strokeWidth={1}
        />
        <circle
          cx={headPt.x}
          cy={headPt.y}
          r={8.8}
          fill={`url(#${grads.skinId})`}
          stroke="#2b453c"
          strokeWidth={1.55}
        />
        <line
          data-segment="head-gaze"
          x1={gazeStart.x}
          y1={gazeStart.y}
          x2={gazeTip.x}
          y2={gazeTip.y}
          stroke="#2b453c"
          strokeWidth={1.3}
          strokeOpacity={0.55}
        />
        <circle
          cx={r1(headPt.x + chosenNormal.x * 3.8)}
          cy={r1(headPt.y + chosenNormal.y * 3.8)}
          r={1.15}
          fill="#233830"
        />
      </g>

      {/* Near / Active Side Limbs (sage-emerald studio leggings + natural warm-skin arm & foot) */}
      <g data-anatomical-side={nearSide} data-limb-depth="near" fill="none">
        {/* STRICT INVARIANT: First path in near-limb group represents nearLegPts */}
        <path
          d={nearLegCapsuleD}
          fill={`url(#${grads.nearLegId})`}
          stroke="#1d3b30"
          strokeWidth={1.35}
        />
        <path
          d={buildPolylinePath(nearLegPts)}
          stroke="#dce8e1"
          strokeWidth={1.25}
          strokeOpacity={0.34}
        />
        <path
          d={buildPolylinePath(nearFootPts)}
          fill={`url(#${grads.skinId})`}
          stroke="#4c3a2d"
          strokeWidth={1.35}
        />

        <path
          d={nearArmCapsuleD}
          fill={`url(#${grads.skinId})`}
          stroke="#6b4b37"
          strokeWidth={1.25}
        />
        <path
          d={buildPolylinePath(nearArmPts)}
          stroke="#6b4b37"
          strokeWidth={1.15}
          strokeOpacity={0.26}
        />

        {/* 7 Canonical Articulated Joint Micro-Pins (subtle studio precision markers) */}
        {(['shoulder', 'elbow', 'wrist', 'hand', 'hip', 'knee', 'ankle'] as const).map(
          (jointKey) => {
            const pt = activeJointCoords[jointKey];
            const isMajor =
              jointKey === 'shoulder' || jointKey === 'hip' || jointKey === 'knee';
            return (
              <circle
                key={jointKey}
                data-joint-node={jointKey}
                cx={pt.x}
                cy={pt.y}
                r={isMajor ? 2.1 : 1.65}
                fill="#fcfaf5"
                fillOpacity={0.58}
                stroke={
                  jointKey === 'shoulder' ||
                  jointKey === 'elbow' ||
                  jointKey === 'wrist' ||
                  jointKey === 'hand'
                    ? '#6b4b37'
                    : '#1d3b30'
                }
                strokeOpacity={0.62}
                strokeWidth={1.05}
              />
            );
          },
        )}
      </g>
    </g>
  );
}

function buildAngleArcSvgPath(from: Point2D, to: Point2D, targetAngleDeg = 90): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const r = 9;
  const baseAngle = Math.atan2(to.y - from.y, to.x - from.x);
  const clampedDeg = Math.max(30, Math.min(180, targetAngleDeg));
  const halfSpanRad = ((clampedDeg * Math.PI) / 180) * 0.5;
  const startAngle = baseAngle - halfSpanRad;
  const endAngle = baseAngle + halfSpanRad;
  const sx = r1(midX + Math.cos(startAngle) * r);
  const sy = r1(midY + Math.sin(startAngle) * r);
  const ex = r1(midX + Math.cos(endAngle) * r);
  const ey = r1(midY + Math.sin(endAngle) * r);
  const r1x = r1(midX + Math.cos(startAngle) * 3.5);
  const r1y = r1(midY + Math.sin(startAngle) * 3.5);
  const r2x = r1(midX + Math.cos(endAngle) * 3.5);
  const r2y = r1(midY + Math.sin(endAngle) * 3.5);
  const largeArc = clampedDeg > 180 ? 1 : 0;
  return `M ${r1x} ${r1y} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} L ${r2x} ${r2y}`;
}

function renderAlignmentGuideItem(
  guide: JointAlignmentGuide,
  mirrored: boolean,
  compact: boolean,
): React.JSX.Element {
  const from = mpt(guide.from, mirrored);
  const to = mpt(guide.to, mirrored);

  return (
    <g key={guide.id} data-alignment-id={guide.id} data-alignment-kind={guide.kind}>
      {guide.kind === 'neutral-zone' ? (
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="rgba(43, 106, 88, 0.12)"
          strokeWidth={compact ? 5.5 : 8}
          strokeLinecap="round"
        />
      ) : null}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={guide.kind === 'anchor-lock' ? '#254b29' : '#1f4d3f'}
        strokeWidth={compact ? 0.95 : 1.25}
        strokeDasharray={
          guide.kind === 'plumb-line'
            ? '2 3'
            : guide.kind === 'axis-line'
              ? '5 3'
              : '4 2'
        }
      />
      <circle cx={from.x} cy={from.y} r={compact ? 1.4 : 1.8} fill="#1f4d3f" />
      <circle cx={to.x} cy={to.y} r={compact ? 1.4 : 1.8} fill="#1f4d3f" />
      {guide.kind === 'angle-arc' ? (
        <path
          data-angle-arc={guide.targetAngleDeg ?? 90}
          d={buildAngleArcSvgPath(from, to, guide.targetAngleDeg ?? 90)}
          fill="none"
          stroke="#1f4d3f"
          strokeWidth={compact ? 0.95 : 1.15}
          strokeDasharray="3 2"
        />
      ) : null}
    </g>
  );
}

function renderJointAlignmentLayer(
  phaseSpec: PhasePoseSpec,
  mirrored: boolean,
  compact: boolean,
): React.JSX.Element {
  return (
    <g data-layer="joint-alignment" opacity={compact ? 0.36 : 0.72}>
      {phaseSpec.alignments.map((guide) => renderAlignmentGuideItem(guide, mirrored, compact))}
      {phaseSpec.fixedAnchors.map((anchor) => {
        const pt = mpt(anchor.point, mirrored);
        const half = compact ? 2.8 : 3.8;
        return (
          <g key={`anchor-${anchor.joint}`} data-fixed-anchor={anchor.joint}>
            <rect
              x={pt.x - half}
              y={pt.y - half}
              width={half * 2}
              height={half * 2}
              rx={1.6}
              fill="#fcfaf5"
              fillOpacity={0.85}
              stroke="#1a3b32"
              strokeWidth={compact ? 1.05 : 1.35}
            />
            <circle cx={pt.x} cy={pt.y} r={compact ? 1.1 : 1.4} fill="#1a3b32" />
          </g>
        );
      })}
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
            r={compact ? 4.2 : 5.2}
            fill="none"
            stroke="#bf5a41"
            strokeWidth={compact ? 0.9 : 1.15}
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
  compact: boolean,
): React.JSX.Element {
  return (
    <g data-layer="movement-direction">
      {vectors.map((vec) => {
        const pts = vec.points.map((pt) => mpt(pt, mirrored));
        if (pts.length < 2) return null;
        const d = buildSmoothCurvePath(pts);
        const isControlOrLengthen =
          vec.kind === 'return-control' || vec.kind === 'axial-lengthening';
        const color = isControlOrLengthen ? '#1f5c4d' : '#bf5a41';
        const markerId = isControlOrLengthen ? arrowControlId : arrowExcursionId;
        const startPt = pts[0];

        return (
          <g key={vec.id} data-vector-id={vec.id} data-vector-kind={vec.kind}>
            <path
              d={d}
              fill="none"
              stroke="#fcfaf5"
              strokeWidth={compact ? 3.4 : 4.2}
              strokeLinecap="round"
              opacity={0.86}
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={compact ? 1.95 : 2.25}
              strokeLinecap="round"
              strokeDasharray={vec.kind === 'axial-lengthening' ? '4 2.5' : undefined}
              markerEnd={`url(#${markerId})`}
            />
            <circle
              cx={startPt.x}
              cy={startPt.y}
              r={compact ? 1.9 : 2.3}
              fill="#fcfaf5"
              stroke={color}
              strokeWidth={1.35}
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
  const bgGradId = `mpd-bg-${rawUid}`;
  const grads: StudioGradientIds = {
    oakId: `mpd-oak-${rawUid}`,
    upholsteryId: `mpd-upholstery-${rawUid}`,
    torsoId: `mpd-torso-${rawUid}`,
    nearLegId: `mpd-nleg-${rawUid}`,
    skinId: `mpd-skin-${rawUid}`,
  };

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
        <linearGradient id={bgGradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="200">
          <stop offset="0%" stopColor="#fdfcf8" />
          <stop offset="65%" stopColor="#f8f5ec" />
          <stop offset="100%" stopColor="#efe9dc" />
        </linearGradient>
        <linearGradient id={grads.oakId} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="180">
          <stop offset="0%" stopColor="#d8b489" />
          <stop offset="100%" stopColor="#b5895a" />
        </linearGradient>
        <linearGradient id={grads.upholsteryId} gradientUnits="userSpaceOnUse" x1="0" y1="96" x2="0" y2="168">
          <stop offset="0%" stopColor="#58776a" />
          <stop offset="100%" stopColor="#3b564b" />
        </linearGradient>
        <linearGradient id={grads.torsoId} gradientUnits="userSpaceOnUse" x1="40" y1="24" x2="220" y2="165">
          <stop offset="0%" stopColor="#496f60" />
          <stop offset="100%" stopColor="#2f5144" />
        </linearGradient>
        <linearGradient id={grads.nearLegId} gradientUnits="userSpaceOnUse" x1="80" y1="40" x2="280" y2="175">
          <stop offset="0%" stopColor="#395e4f" />
          <stop offset="100%" stopColor="#244337" />
        </linearGradient>
        <linearGradient id={grads.skinId} gradientUnits="userSpaceOnUse" x1="40" y1="18" x2="260" y2="170">
          <stop offset="0%" stopColor="#f0d7c2" />
          <stop offset="100%" stopColor="#dfb99d" />
        </linearGradient>
        <marker
          id={arrowExcursionId}
          viewBox="0 0 10 10"
          refX={7}
          refY={5}
          markerWidth={5.5}
          markerHeight={5.5}
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#bf5a41" />
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

      {/* Studio Background & Subtle Architectural Horizon Grid */}
      <rect
        x={0.5}
        y={0.5}
        width={VIEWBOX_WIDTH - 1}
        height={VIEWBOX_HEIGHT - 1}
        rx={compact ? 10 : 14}
        fill={`url(#${bgGradId})`}
        stroke="#dcd4c3"
        strokeWidth={1}
      />
      <g
        stroke="#e8e1d2"
        strokeWidth={compact ? 0.45 : 0.65}
        opacity={compact ? 0.48 : 0.85}
        aria-hidden="true"
      >
        <line x1={16} y1={52} x2={304} y2={52} />
        <line x1={16} y1={100} x2={304} y2={100} />
        <line x1={160} y1={14} x2={160} y2={186} strokeDasharray="3 3" />
      </g>
      {!compact && (
        <g aria-hidden="true" data-layer="studio-phase-pill" data-phase-indicator={phase}>
          <rect
            x={12}
            y={6.5}
            width={48}
            height={14.5}
            rx={7.2}
            fill="rgba(255, 253, 248, 0.96)"
            stroke="#d5cdbc"
            strokeWidth={0.9}
          />
          <circle
            cx={21.5}
            cy={13.8}
            r={2.9}
            fill="#1f4d3f"
            stroke="#1f4d3f"
            strokeWidth={0.9}
          />
          <polygon
            points="35.2,10.5 38.5,13.8 35.2,17.1 31.9,13.8"
            fill={phase === 'middle' || phase === 'end' ? '#bf5a41' : '#fcfaf5'}
            stroke={phase === 'middle' || phase === 'end' ? '#bf5a41' : '#9aa89f'}
            strokeWidth={0.95}
          />
          <rect
            x={45.6}
            y={10.8}
            width={6}
            height={6}
            rx={1.3}
            fill={phase === 'end' ? '#1f4d3f' : '#fcfaf5'}
            stroke={phase === 'end' ? '#1f4d3f' : '#9aa89f'}
            strokeWidth={0.95}
          />
        </g>
      )}

      {/* 1. Apparatus & Support Surface */}
      {renderApparatusSupportLayer(asset, phaseSpec, mirrored, grads)}

      {/* 2. Pose Delta Ghost Layer */}
      {showGhostStartPose && phase !== 'start'
        ? renderPoseDeltaGhostLayer(
            asset.phases.start.joints,
            phaseSpec.joints,
            mirrored,
            compact,
            phase === 'end' ? asset.phases.middle.joints : undefined,
          )
        : null}

      {/* 3. Primary Muscle Highlight Layer */}
      {showMuscles ? renderPrimaryMusclesLayer(asset, phaseSpec, phase, mirrored, compact) : null}

      {/* 4. Sculpted Studio Practitioner Human Figure Layer */}
      {renderKinematicFigureLayer(
        phaseSpec,
        activeSide,
        mirrored,
        grads,
        asset.archetypeId === 'mat-clam-isolated' || asset.archetypeId === 'mat-open-book-isolated',
      )}

      {/* 5. Joint Alignment Layer */}
      {showAlignment ? renderJointAlignmentLayer(phaseSpec, mirrored, compact) : null}

      {/* 6. Movement Direction Vector Layer */}
      {showDirection
        ? renderMovementDirectionLayer(
            phaseSpec.directionVectors,
            mirrored,
            arrowExcursionId,
            arrowControlId,
            compact,
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
          최대 관절 변위 Δ{deltaInfo.maxDeltaPx}px · 가동 관절 {deltaInfo.movedJoints.length}개
        </span>
      </div>

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
                border: isSelected ? '2px solid #2b6a58' : '1px solid #dfd8ca',
                boxShadow: isSelected ? '0 4px 12px rgba(28, 63, 54, 0.08)' : 'none',
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
                  border: isSelected ? '1px solid #2b6a58' : '1px solid #d8d0c0',
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
                    background: isSelected ? 'rgba(255, 255, 255, 0.2)' : '#eee8dc',
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
                <div style={{ fontWeight: 600, color: '#8c472b' }}>{spec.breathCueKo}</div>
                <div style={{ marginTop: '2px' }}>{spec.summaryKo}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
