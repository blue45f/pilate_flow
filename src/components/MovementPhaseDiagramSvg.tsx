import React, { useId, useState } from 'react';
import { GeneratedPractitionerFigure } from './GeneratedPractitionerFigure';
import { isPractitionerAtlasReady } from '../utils/generatedPractitionerArt';
import '../styles/movement-studio.css';
import { MOTION_STUDIO_MATERIALS as MATERIAL } from '../utils/motionStudioMaterials';
import {
  normalizeRigJointMap,
  resolveChairPedalTip,
  resolveRigFoot,
  resolveRigHand,
  resolveRigHeadFrame,
} from '../utils/motionRigGeometry';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import {
  calculatePhaseJointDelta,
  getMovementVisualAsset,
  hasCatalogMotionIdentityMismatch,
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
const STUDIO_COLORS = {
  surface: MATERIAL.surface,
  horizon: MATERIAL.horizon,
  floor: MATERIAL.floor,
  border: MATERIAL.border,
  guide: MATERIAL.guide,
  ink: MATERIAL.ink,
  farInk: MATERIAL.clothFar,
  skinFarInk: MATERIAL.skinShade,
} as const;

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
  return points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
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
  return buildTaperedChainSilhouettePath([proximal, upperBelly, mid, lowerBelly, distal], radii5);
}

/** A rounded heel, sole and toe, with an ankle opening. The authored contact
 * points stay unchanged; unlike the old ankle–heel–toe triangle this contour
 * remains a foot when all three joints are almost collinear.
 */
function buildStudioFootPath(ankle: Point2D, heel: Point2D, toe: Point2D, scale: number): string {
  const length = Math.hypot(toe.x - heel.x, toe.y - heel.y) || 1;
  const ux = (toe.x - heel.x) / length;
  const uy = (toe.y - heel.y) / length;
  const sign = -uy * (ankle.x - heel.x) + ux * (ankle.y - heel.y) >= 0 ? 1 : -1;
  const nx = -uy * sign;
  const ny = ux * sign;
  const offset = (pt: Point2D, along: number, up: number): Point2D => ({
    x: r1(pt.x + ux * along * scale + nx * up * scale),
    y: r1(pt.y + uy * along * scale + ny * up * scale),
  });
  const aBack = offset(ankle, -2.6, 0);
  const aFront = offset(ankle, 2.6, 0);
  const arch = offset(lerpSubPoint(heel, toe, 0.55), 0, 3.1);
  const toeTop = offset(toe, 0, 1.5);
  const toeTip = offset(toe, 1.7, 0);
  const toeSole = offset(toe, 0, -1.3);
  const heelSole = offset(heel, -0.7, -1.7);
  const heelBack = offset(heel, -2.1, 0.8);
  return `M ${aBack.x} ${aBack.y} L ${aFront.x} ${aFront.y} Q ${arch.x} ${arch.y} ${toeTop.x} ${toeTop.y} Q ${toeTip.x} ${toeTip.y} ${toeSole.x} ${toeSole.y} L ${heelSole.x} ${heelSole.y} Q ${heelBack.x} ${heelBack.y} ${aBack.x} ${aBack.y} Z`;
}

/** Derive contour proportions once from setup, never from the animated phase.
 * The same person keeps the same head and limb thickness throughout a cycle.
 */
function getStudioFigureScale(asset: CatalogMovementVisualAsset): number {
  // Continuous playback replaces one phase with an interpolated sample. Keep
  // character proportions tied to the original setup, not that changing sample.
  const reference = getMovementVisualAsset(asset.exerciseId) ?? asset;
  const { pelvis, lumbar, thoracic, neck } = reference.phases.start.joints;
  const trunkLength =
    Math.hypot(pelvis.x - lumbar.x, pelvis.y - lumbar.y) +
    Math.hypot(lumbar.x - thoracic.x, lumbar.y - thoracic.y) +
    Math.hypot(thoracic.x - neck.x, thoracic.y - neck.y);
  return Math.max(0.94, Math.min(1.2, trunkLength / 82));
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
  farLegId: string;
  farSkinId: string;
  hairId: string;
  sockId: string;
}

function renderApparatusSupportLayer(
  asset: CatalogMovementVisualAsset,
  phaseSpec: PhasePoseSpec,
  mirrored: boolean,
  grads: StudioGradientIds,
): React.JSX.Element {
  const { apparatusState } = phaseSpec;
  const isFixedFootbarFootwork =
    asset.archetypeId === 'reformer-supine-footwork' ||
    asset.archetypeId === 'reformer-side-lying-footbar-press';
  // In footwork the body travels away from the fixed bar. Match that translation
  // exactly; the previous positive 0.35 scale slid the cushion under the body.
  const carriageShift = isFixedFootbarFootwork
    ? -apparatusState.carriageOffsetPx
    : Math.round(apparatusState.carriageOffsetPx * 0.35);
  const springColor =
    apparatusState.springTensionLevel === 'high'
      ? '#bf5a41'
      : apparatusState.springTensionLevel === 'medium'
        ? '#b87430'
        : '#356859';

  const p = (x: number, y: number) => mpt({ x, y }, mirrored);

  if (asset.apparatus === 'reformer') {
    const carriageStart = (isFixedFootbarFootwork ? 58 : 38) + carriageShift;
    const carriageEnd = (isFixedFootbarFootwork ? 226 : 216) + carriageShift;
    const cLeft = mx(carriageStart, mirrored);
    const cRight = mx(carriageEnd, mirrored);
    const cMinX = Math.min(cLeft, cRight);
    const cWidth = Math.max(24, Math.abs(cRight - cLeft));
    const shoulderX = mx(carriageStart + (isFixedFootbarFootwork ? 57 : 36), mirrored);
    const headrestX1 = mx(carriageStart + (isFixedFootbarFootwork ? 12 : 6), mirrored);
    const headrestX2 = mx(carriageStart + (isFixedFootbarFootwork ? 44 : 28), mirrored);
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
      asset.exerciseId === 'ex-lower-04' ||
      /strap|hundred|frog|circle|row|arm-press|supine-arm|backstroke|pulling/i.test(
        `${asset.archetypeId} ${asset.exerciseId}`,
      );
    const strapUsesFeet =
      asset.exerciseId === 'ex-lower-04' ||
      /feet-in-straps|strap-frog|circle|lower-lift/i.test(
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
        <ellipse cx={160} cy={179} rx={144} ry={3.8} fill="#1c342b" fillOpacity={0.08} />
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
          data-reformer-carriage="moving-support"
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
            data-attachment="reformer-strap"
            data-attachment-target={strapUsesFeet ? 'ankle' : 'hand'}
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

        {asset.archetypeId === 'reformer-short-box-supported-roll-back' && (
          <path
            data-attachment="short-box-foot-restraint"
            d={`M ${mx(280, mirrored)} 151 L ${mx(phaseSpec.joints.ankle.x + 6, mirrored)} ${my(phaseSpec.joints.ankle.y - 4)} Q ${mx(phaseSpec.joints.ankle.x - 5, mirrored)} ${my(phaseSpec.joints.ankle.y - 7)} ${mx(phaseSpec.joints.ankle.x - 6, mirrored)} ${my(phaseSpec.joints.ankle.y + 3)}`}
            fill="none"
            stroke="#436b62"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
        )}

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
          data-reformer-footbar-contact="fixed"
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
    const barEnd = p(96 + Math.round(carriageShift * 0.6), 64 + Math.round(carriageShift * 0.25));
    const springAnchor = p(26, 44);
    const springUsesFeet =
      asset.blockCategory === 'feet-in-straps' ||
      /feet-in-straps|leg-spring|strap-frog/.test(asset.archetypeId);
    const springJoint = springUsesFeet ? phaseSpec.joints.ankle : phaseSpec.joints.hand;
    const springTarget = p(springJoint.x, springJoint.y);

    // STRICT INVARIANT: Zero <path> elements inside Cadillac apparatus-support when springTensionLevel === 'none'
    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="cadillac"
        data-carriage-offset={apparatusState.carriageOffsetPx}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <ellipse cx={160} cy={183} rx={142} ry={3.4} fill="#1c342b" fillOpacity={0.08} />
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
          <g>
            <path
              data-attachment="cadillac-spring"
              data-attachment-target={springUsesFeet ? 'ankle' : 'hand'}
              d={renderSpringCoilPath(
                springAnchor.x,
                springAnchor.y,
                springTarget.x,
                springTarget.y,
                6,
                2.6,
              )}
              fill="none"
              stroke={springColor}
              strokeWidth={1.5}
              opacity={0.82}
            />
            {springUsesFeet && (
              <ellipse
                data-attachment="foot-loop"
                cx={springTarget.x}
                cy={springTarget.y}
                rx={3.5}
                ry={5.5}
                fill="none"
                stroke="#436b62"
                strokeWidth={1.8}
              />
            )}
          </g>
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
    const pedalTip = mpt(resolveChairPedalTip(apparatusState.pedalAngleDeg), mirrored);
    const springBase = p(148, 168);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="chair"
        data-pedal-angle={apparatusState.pedalAngleDeg}
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <ellipse cx={160} cy={179} rx={96} ry={3.4} fill="#1c342b" fillOpacity={0.09} />
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
    const supportedSwan = asset.bodyPosition === 'prone' &&
      (asset.exerciseId === 'original-barrel-supported-swan' || asset.exerciseId === 'ex-extension-02');
    const arcLeft = isStandingBarrel ? p(18, 174) : p(68, 174);
    const arcPeak1 = isStandingBarrel ? p(24, 106) : p(76, supportedSwan ? 94 : 102);
    const arcPeak2 = isStandingBarrel ? p(64, 106) : p(164, supportedSwan ? 94 : 102);
    const arcRight = isStandingBarrel ? p(70, 174) : p(174, 174);
    const ladderFrontX = mx(isStandingBarrel ? 76 : 222, mirrored);
    const ladderBackX = mx(isStandingBarrel ? 96 : 256, mirrored);

    return (
      <g
        data-layer="apparatus-support"
        data-apparatus-kind="barrel"
        data-spring-tension={apparatusState.springTensionLevel}
      >
        <ellipse cx={154} cy={179} rx={126} ry={3.5} fill="#1c342b" fillOpacity={0.08} />
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

  // Standing exercises use the floor; a mat must not cut across the lower legs.
  const standing = asset.bodyPosition === 'standing';

  return (
    <g
      data-layer="apparatus-support"
      data-apparatus-kind="mat"
      data-prop-active={apparatusState.propPositionKo ? 'true' : 'false'}
    >
      <ellipse
        cx={160}
        cy={asset.bodyPosition === 'standing' ? 177 : 157.5}
        rx={asset.bodyPosition === 'standing' ? 34 : 138}
        ry={3.2}
        fill="#1c342b"
        fillOpacity={0.08}
      />
      <line x1={12} y1={176} x2={308} y2={176} stroke="#d5cec0" strokeWidth={1.2} />
      {!standing && (
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
      )}
      {!standing && (
        <line
          x1={28}
          y1={149.8}
          x2={292}
          y2={149.8}
          stroke="rgba(255, 253, 248, 0.52)"
          strokeWidth={0.9}
        />
      )}
    </g>
  );
}

function renderExerciseProps(
  asset: CatalogMovementVisualAsset,
  phaseSpec: PhasePoseSpec,
  mirrored: boolean,
): React.JSX.Element | null {
  const props = asset.props ?? [];
  if (!props.some((prop) => prop !== 'none')) return null;
  const { joints } = phaseSpec;
  const point = (p: Point2D) => mpt(p, mirrored);
  if (props.includes('theraband') && asset.exerciseId === 'original-mat-band-row') {
    const hand = point(joints.hand);
    const farHand = point(resolveRigHand(joints, 'far'));
    const foot = point(joints.toe);
    const farFoot = point(resolveRigFoot(joints, 'far', asset.phases.start.joints).toe);
    return (
      <g data-prop-model="theraband" data-prop-placement="feet-to-hands">
        <path
          d={`M ${hand.x} ${hand.y} L ${foot.x} ${foot.y} Q ${mx(joints.toe.x + 8, mirrored)} ${foot.y + 6} ${farFoot.x} ${farFoot.y} L ${farHand.x} ${farHand.y}`}
          fill="none"
          stroke="#ad6548"
          strokeWidth={2.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${hand.x} ${hand.y} L ${foot.x} ${foot.y}`}
          fill="none"
          stroke="#e1b797"
          strokeWidth={0.8}
        />
      </g>
    );
  }
  if (props.includes('foam-roller') && asset.exerciseId === 'ex-warmup-03') {
    const left = Math.min(joints.head.x - 6, joints.pelvis.x + 12);
    const right = Math.max(joints.head.x - 6, joints.pelvis.x + 12);
    const x = Math.min(mx(left, mirrored), mx(right, mirrored));
    return (
      <g data-prop-model="foam-roller" data-prop-placement="longitudinal-spine">
        <rect
          x={x}
          y={132}
          width={right - left}
          height={15}
          rx={7.5}
          fill="#6b8781"
          stroke="#36564e"
          strokeWidth={1.2}
        />
        <line
          x1={x + 8}
          y1={135.5}
          x2={x + right - left - 8}
          y2={135.5}
          stroke="#b6c6b7"
          strokeWidth={1.2}
        />
        <ellipse
          cx={mx(right - 4, mirrored)}
          cy={139.5}
          rx={4}
          ry={7}
          fill="#52736a"
          stroke="#36564e"
          strokeWidth={1}
        />
      </g>
    );
  }
  // Optional props without an authored contact model remain a clearly separate
  // setup reference; never invent a pressure point on the moving body.
  if (props.includes('magic-circle')) {
    return (
      <g
        data-prop-model="magic-circle"
        data-prop-placement="setup-reference"
        aria-label="매직서클 도구 참고"
      >
        <ellipse
          cx={mx(286, mirrored)}
          cy={32}
          rx={13}
          ry={17}
          fill="none"
          stroke="#436b62"
          strokeWidth={2.8}
        />
        <rect x={mx(286, mirrored) - 3} y={13} width={6} height={5} rx={1.7} fill="#a96e4b" />
        <rect x={mx(286, mirrored) - 3} y={46} width={6} height={5} rx={1.7} fill="#a96e4b" />
        <text x={mx(286, mirrored)} y={62} textAnchor="middle" fontSize={7} fill="#53675d">
          도구 참고
        </text>
      </g>
    );
  }
  if (props.includes('mini-ball')) {
    return (
      <g
        data-prop-model="mini-ball"
        data-prop-placement="setup-reference"
        aria-label="미니볼 도구 참고"
      >
        <circle
          cx={mx(286, mirrored)}
          cy={30}
          r={12}
          fill="#bf775c"
          stroke="#8e513a"
          strokeWidth={1.2}
        />
        <ellipse cx={mx(283, mirrored)} cy={26} rx={5} ry={3} fill="#efc9ac" opacity={0.6} />
        <text x={mx(286, mirrored)} y={53} textAnchor="middle" fontSize={7} fill="#53675d">
          도구 참고
        </text>
      </g>
    );
  }
  return null;
}

function renderPoseDeltaGhostLayer(
  startJoints: RigJointMap,
  currentJoints: RigJointMap,
  mirrored: boolean,
  compact: boolean,
  fallbackReferenceJoints?: RigJointMap,
): React.JSX.Element {
  const s = (k: keyof RigJointMap): Point2D => mpt(startJoints[k] ?? startJoints.pelvis, mirrored);
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

        const normalShiftPx = occurrenceIdx === 0 ? 0 : occurrenceIdx % 2 === 1 ? 3.5 : -3.5;
        const midFraction = occurrenceIdx === 0 ? 0.5 : occurrenceIdx % 2 === 1 ? 0.36 : 0.64;

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
                compact ? (muscle.role === 'primary' ? 8 : 6) : muscle.role === 'primary' ? 12 : 9
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
  showStructure = true,
  figureScale = 1,
  referenceJoints?: RigJointMap,
  showNativeHead = true,
): React.JSX.Element {
  const { joints } = phaseSpec;
  const nearSide = activeSide;
  const farSide: 'left' | 'right' = activeSide === 'right' ? 'left' : 'right';

  const j = (k: keyof RigJointMap): Point2D => mpt(joints[k] ?? joints.pelvis, mirrored);
  const nearFoot = resolveRigFoot(joints, 'near', referenceJoints);
  const farFoot = resolveRigFoot(joints, 'far', referenceJoints);
  const rawFallback = (joint: Point2D, dx: number, dy: number): Point2D =>
    mpt({ x: joint.x + dx, y: joint.y + dy }, mirrored);

  const authoredFarHipPt = joints.farHip
    ? mpt(joints.farHip, mirrored)
    : rawFallback(joints.hip, -3, -3);
  const authoredFarKneePt = joints.farKnee
    ? mpt(joints.farKnee, mirrored)
    : rawFallback(joints.knee, -4, -4);
  const authoredFarAnklePt = mpt(farFoot.ankle, mirrored);
  const authoredFarToePt = mpt(farFoot.toe, mirrored);
  const authoredFarHeelPt = mpt(farFoot.heel, mirrored);

  const authoredFarShoulderPt = joints.farShoulder
    ? mpt(joints.farShoulder, mirrored)
    : rawFallback(joints.shoulder, -3, -3);
  const authoredFarElbowPt = joints.farElbow
    ? mpt(joints.farElbow, mirrored)
    : rawFallback(joints.elbow, -4, -3);
  const authoredFarWristPt = joints.farWrist
    ? mpt(joints.farWrist, mirrored)
    : rawFallback(joints.wrist, -4, -3);
  const authoredFarHandPt = mpt(resolveRigHand(joints, 'far'), mirrored);

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
  const nearHeelPt = isSwappedSide ? authoredFarHeelPt : mpt(nearFoot.heel, mirrored);
  const nearShoulderPt = isSwappedSide ? authoredFarShoulderPt : j('shoulder');
  const nearElbowPt = isSwappedSide ? authoredFarElbowPt : j('elbow');
  const nearWristPt = isSwappedSide ? authoredFarWristPt : j('wrist');
  const nearHandPt = isSwappedSide ? authoredFarHandPt : j('hand');
  const farHandPt = isSwappedSide ? j('hand') : authoredFarHandPt;

  const spinePts = [j('pelvis'), j('lumbar'), j('thoracic'), j('neck'), j('head')];
  const torsoPts = [
    j('pelvis'),
    lerpSubPoint(j('pelvis'), j('lumbar'), 0.55),
    j('lumbar'),
    j('thoracic'),
    lerpSubPoint(farShoulderPt, nearShoulderPt, 0.5),
    j('neck'),
  ];
  const nearLegPts = [nearHipPt, nearKneePt, nearAnklePt];
  const farHeelPt = isSwappedSide ? mpt(nearFoot.heel, mirrored) : authoredFarHeelPt;
  const nearArmPts = [nearShoulderPt, nearElbowPt, nearWristPt, nearHandPt];

  const headPt = j('head');
  const neckPt = j('neck');
  const headFrame = resolveRigHeadFrame(joints, referenceJoints ?? joints);
  const ux = headFrame.headAxis.x * (mirrored ? -1 : 1);
  const uy = headFrame.headAxis.y;
  const chosenNormal = { x: headFrame.faceAxis.x * (mirrored ? -1 : 1), y: headFrame.faceAxis.y };

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
    x: r1(headPt.x + (-chosenNormal.x * 9 + ux * 6.5) * figureScale),
    y: r1(headPt.y + (-chosenNormal.y * 9 + uy * 6.5) * figureScale),
  };
  // The scalp follows the existing head orientation; no head/joint positions change.
  const headOffset = (up: number, front: number): Point2D => ({
    x: r1(headPt.x + (ux * up + chosenNormal.x * front) * figureScale),
    y: r1(headPt.y + (uy * up + chosenNormal.y * front) * figureScale),
  });
  const hairTop = headOffset(11.3, 2.6);
  const hairCrown = headOffset(13, -6);
  const hairBack = headOffset(1, -9.7);
  const hairNape = headOffset(-7.7, -5.2);
  const hairPart = headOffset(3, -1.8);
  const hairPath = `M ${hairTop.x} ${hairTop.y} Q ${hairCrown.x} ${hairCrown.y} ${hairBack.x} ${hairBack.y} Q ${hairNape.x} ${hairNape.y} ${hairNape.x} ${hairNape.y} Q ${hairPart.x} ${hairPart.y} ${hairTop.x} ${hairTop.y} Z`;

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

  const scaled = (radii: readonly number[]) => radii.map((radius) => radius * figureScale);
  const torsoCapsuleD = buildTaperedChainSilhouettePath(
    torsoPts,
    scaled([11.6, 11.8, 8.8, 11.5, 9.2, 4.2]),
  );
  const pelvisGirdleBridgeD = buildTaperedChainSilhouettePath(
    [farHipPt, j('pelvis'), nearHipPt],
    scaled([8.2, 11.8, 9]),
  );
  const shoulderYokeBridgeD = buildTaperedChainSilhouettePath(
    [farShoulderPt, lerpSubPoint(farShoulderPt, nearShoulderPt, 0.5), nearShoulderPt],
    scaled([5, 6.4, 5.8]),
  );
  const neckCylinderD = buildTaperedChainSilhouettePath(
    [lerpSubPoint(nearShoulderPt, neckPt, 0.35), neckPt, lerpSubPoint(neckPt, headPt, 0.68)],
    scaled([5.3, 4.2, 4.1]),
  );
  const farLegCapsuleD = buildAnatomicalLimbProfile(
    farHipPt,
    farKneePt,
    farAnklePt,
    scaled([7.1, 7.6, 4.7, 5.4, 3.1]) as [number, number, number, number, number],
  );
  const farArmCapsuleD = buildAnatomicalLimbProfile(
    farShoulderPt,
    farElbowPt,
    farWristPt,
    scaled([4.9, 4.7, 3.4, 3.5, 2.5]) as [number, number, number, number, number],
  );
  const nearLegCapsuleD = buildAnatomicalLimbProfile(
    nearHipPt,
    nearKneePt,
    nearAnklePt,
    scaled([8.2, 8.7, 5.2, 6.1, 3.5]) as [number, number, number, number, number],
  );
  const nearArmCapsuleD = buildTaperedChainSilhouettePath(
    [
      nearShoulderPt,
      lerpSubPoint(nearShoulderPt, nearElbowPt, 0.45),
      nearElbowPt,
      lerpSubPoint(nearElbowPt, nearWristPt, 0.42),
      nearWristPt,
    ],
    scaled([5.8, 5.5, 4.1, 4, 2.8]),
  );
  const nearPalmD = buildTaperedChainSilhouettePath(
    [nearWristPt, lerpSubPoint(nearWristPt, nearHandPt, 0.5), nearHandPt],
    scaled([2.7, 3.25, 1.65]),
  );

  return (
    <g data-layer="kinematic-figure" strokeLinecap="round" strokeLinejoin="round">
      {/* Contralateral / Far Side Limbs (soft depth perspective) */}
      <g
        data-anatomical-side={farSide}
        data-limb-depth="far"
        fill="none"
        stroke={STUDIO_COLORS.farInk}
      >
        <path
          d={farLegCapsuleD}
          fill={`url(#${grads.farLegId})`}
          stroke={STUDIO_COLORS.farInk}
          strokeWidth={0.7}
        />
        <path
          d={farArmCapsuleD}
          fill={`url(#${grads.farSkinId})`}
          stroke={STUDIO_COLORS.skinFarInk}
          strokeWidth={0.65}
        />
        <path
          data-segment="foot-contour"
          data-foot-ankle={`${farAnklePt.x},${farAnklePt.y}`}
          data-foot-heel={`${farHeelPt.x},${farHeelPt.y}`}
          data-foot-toe={`${farToePt.x},${farToePt.y}`}
          d={buildStudioFootPath(farAnklePt, farHeelPt, farToePt, figureScale * 0.9)}
          fill={`url(#${grads.sockId})`}
          stroke={STUDIO_COLORS.farInk}
          strokeWidth={0.7}
        />
        <path
          data-segment="palm-contour"
          d={buildTaperedChainSilhouettePath(
            [farWristPt, lerpSubPoint(farWristPt, farHandPt, 0.5), farHandPt],
            scaled([2.4, 2.8, 1.5]),
          )}
          fill={`url(#${grads.farSkinId})`}
          stroke={STUDIO_COLORS.skinFarInk}
          strokeWidth={0.6}
        />
        <path
          data-structure-line="far-leg"
          opacity={showStructure ? 1 : 0}
          d={buildPolylinePath([farHipPt, farKneePt, farAnklePt, farToePt])}
          strokeWidth={1.35}
          strokeDasharray="4 3.5"
          strokeOpacity={0.7}
        />
        <path
          data-structure-line="far-arm"
          opacity={showStructure ? 1 : 0}
          d={buildPolylinePath([farShoulderPt, farElbowPt, farWristPt])}
          strokeWidth={1.2}
          strokeDasharray="4 3.5"
          strokeOpacity={0.65}
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
          stroke={MATERIAL.skinShade}
          strokeWidth={0.75}
        />
        <path
          data-segment="pelvis-girdle-bridge"
          d={pelvisGirdleBridgeD}
          fill={`url(#${grads.torsoId})`}
          stroke={MATERIAL.clothShade}
          strokeWidth={0.75}
        />
        <path
          data-segment="shoulder-yoke-bridge"
          d={shoulderYokeBridgeD}
          fill={`url(#${grads.torsoId})`}
          stroke={MATERIAL.clothShade}
          strokeWidth={0.75}
        />
        <path
          d={torsoCapsuleD}
          fill={`url(#${grads.torsoId})`}
          stroke={MATERIAL.clothShade}
          strokeWidth={0.85}
        />
        <path
          data-structure-line="spine"
          opacity={showStructure ? 1 : 0}
          d={buildSmoothCurvePath(spinePts)}
          stroke="#e6efe6"
          strokeWidth={1}
          strokeOpacity={0.3}
        />

        {/* Studio low-bun & warm-skin head silhouette */}
        <g data-segment="native-head" opacity={showNativeHead ? 1 : 0}>
        <circle
          cx={bunPt.x}
          cy={bunPt.y}
          r={4.2 * figureScale}
          fill={`url(#${grads.hairId})`}
          stroke={MATERIAL.hairShade}
          strokeWidth={0.65}
        />
        <ellipse
          cx={headPt.x}
          cy={headPt.y}
          rx={9.6 * figureScale}
          ry={11.8 * figureScale}
          transform={`rotate(${r1((Math.atan2(uy, ux) * 180) / Math.PI + 90)} ${headPt.x} ${headPt.y})`}
          fill={`url(#${grads.skinId})`}
          stroke={MATERIAL.skinShade}
          strokeWidth={0.85}
        />
        <path
          data-segment="hair-profile"
          d={hairPath}
          fill={`url(#${grads.hairId})`}
          stroke={MATERIAL.hairShade}
          strokeWidth={0.45}
        />
        <line
          data-segment="head-gaze"
          x1={gazeStart.x}
          y1={gazeStart.y}
          x2={gazeTip.x}
          y2={gazeTip.y}
          stroke={MATERIAL.skinShade}
          strokeWidth={0.8}
          strokeOpacity={0.7}
        />
        <circle
          cx={r1(headPt.x + chosenNormal.x * 3.8)}
          cy={r1(headPt.y + chosenNormal.y * 3.8)}
          r={0.65}
          fill={MATERIAL.hair}
        />
        </g>
      </g>

      {/* Near / Active Side Limbs (sage-emerald studio leggings + natural warm-skin arm & foot) */}
      <g data-anatomical-side={nearSide} data-limb-depth="near" fill="none">
        {/* STRICT INVARIANT: First path in near-limb group represents nearLegPts */}
        <path
          d={nearLegCapsuleD}
          fill={`url(#${grads.nearLegId})`}
          stroke={MATERIAL.clothShade}
          strokeWidth={0.9}
        />
        <path
          d={buildPolylinePath(nearLegPts)}
          data-structure-line="near-leg"
          opacity={showStructure ? 1 : 0}
          stroke="#e6efe6"
          strokeWidth={1}
          strokeOpacity={0.24}
        />
        <path
          data-segment="foot-contour"
          data-foot-ankle={`${nearAnklePt.x},${nearAnklePt.y}`}
          data-foot-heel={`${nearHeelPt.x},${nearHeelPt.y}`}
          data-foot-toe={`${nearToePt.x},${nearToePt.y}`}
          d={buildStudioFootPath(nearAnklePt, nearHeelPt, nearToePt, figureScale)}
          fill={`url(#${grads.sockId})`}
          stroke="#93a28e"
          strokeWidth={0.85}
        />

        <path
          d={nearArmCapsuleD}
          fill={`url(#${grads.skinId})`}
          stroke={MATERIAL.skinShade}
          strokeWidth={0.8}
        />
        <path
          data-segment="palm-contour"
          d={nearPalmD}
          fill={`url(#${grads.skinId})`}
          stroke={MATERIAL.skinShade}
          strokeWidth={0.6}
        />
        <path
          d={buildPolylinePath(nearArmPts)}
          data-structure-line="near-arm"
          opacity={showStructure ? 1 : 0}
          stroke={MATERIAL.skinShade}
          strokeWidth={0.85}
          strokeOpacity={0.26}
        />

        {/* 7 Canonical Articulated Joint Micro-Pins (subtle studio precision markers) */}
        {(['shoulder', 'elbow', 'wrist', 'hand', 'hip', 'knee', 'ankle'] as const).map(
          (jointKey) => {
            const pt = activeJointCoords[jointKey];
            const isMajor = jointKey === 'shoulder' || jointKey === 'hip' || jointKey === 'knee';
            return (
              <circle
                key={jointKey}
                data-joint-node={jointKey}
                opacity={showStructure ? 0.75 : 0}
                aria-hidden="true"
                cx={pt.x}
                cy={pt.y}
                r={isMajor ? 2.1 : 1.65}
                fill={STUDIO_COLORS.surface}
                fillOpacity={0.82}
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
          guide.kind === 'plumb-line' ? '2 3' : guide.kind === 'axis-line' ? '5 3' : '4 2'
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
  const [atlasReady, setAtlasReady] = useState(() => typeof window === 'undefined' || isPractitionerAtlasReady());
  const [atlasFailed, setAtlasFailed] = useState(false);
  const titleId = `mpd-title-${rawUid}`;
  const descId = `mpd-desc-${rawUid}`;
  const visualBinding = getExpandedMovementVisualBinding(asset.exerciseId);
  const sourceOnly = visualBinding?.nativeMotionAvailable === false;
  const identityMismatch = hasCatalogMotionIdentityMismatch({
    id: asset.exerciseId, apparatus: asset.apparatus, bodyPosition: asset.bodyPosition,
  });
  if (sourceOnly || identityMismatch) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={`movement-phase-diagram-svg ${className}`.trim()}
        data-exercise-id={asset.exerciseId}
        data-native-motion-available="false"
        data-motion-source={sourceOnly ? 'creator-video-only' : 'unmodeled-exercise'}
        data-anatomical-accuracy-assumed="false"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          aspectRatio: '8 / 5',
          borderRadius: compact ? '10px' : '14px',
        }}
      >
        <title id={titleId}>{`${asset.nameKo} · ${sourceOnly ? '제작자 영상 참고' : '전용 도해 없음'}`}</title>
        <desc id={descId}>{sourceOnly ? visualBinding.reasonKo : '기구나 시작 자세가 변경되어 기존 도해를 표시하지 않습니다.'}</desc>
        <rect
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          rx="14"
          fill={MATERIAL.surface}
          stroke={MATERIAL.border}
        />
        <circle cx="160" cy="78" r="26" fill={MATERIAL.floor} />
        {sourceOnly ? <path d="M154 66 L173 78 L154 90 Z" fill={MATERIAL.ink} /> : (
          <g stroke={MATERIAL.ink} strokeWidth="3" strokeLinecap="round">
            <path d="M160 77 L160 89" />
            <circle cx="160" cy="67" r="1" />
          </g>
        )}
        <text
          x="160"
          y="126"
          textAnchor="middle"
          fill={MATERIAL.ink}
          fontSize="13"
          fontFamily="sans-serif"
          fontWeight="600"
        >
          {sourceOnly ? '제작자 영상으로 확인' : '전용 자세 그림 없음'}
        </text>
        <text
          x="160"
          y="149"
          textAnchor="middle"
          fill={MATERIAL.ink}
          fontSize="10"
          fontFamily="sans-serif"
          opacity="0.72"
        >
          {sourceOnly ? '동작별 자세 그림 준비 중' : '변경한 기구·자세의 자료를 확인해 주세요'}
        </text>
      </svg>
    );
  }
  const arrowExcursionId = `mpd-arrow-excursion-${rawUid}`;
  const arrowControlId = `mpd-arrow-control-${rawUid}`;
  const bgGradId = `mpd-bg-${rawUid}`;
  const studioLightId = `mpd-light-${rawUid}`;
  const grads: StudioGradientIds = {
    oakId: `mpd-oak-${rawUid}`,
    upholsteryId: `mpd-upholstery-${rawUid}`,
    torsoId: `mpd-torso-${rawUid}`,
    nearLegId: `mpd-nleg-${rawUid}`,
    skinId: `mpd-skin-${rawUid}`,
    farLegId: `mpd-fleg-${rawUid}`,
    farSkinId: `mpd-fskin-${rawUid}`,
    hairId: `mpd-hair-${rawUid}`,
    sockId: `mpd-sock-${rawUid}`,
  };

  const authoredPhase = asset.phases[phase];
  const referenceJoints = getMovementVisualAsset(asset.exerciseId)?.phases.start.joints ?? asset.phases.start.joints;
  const phaseSpec: PhasePoseSpec = {
    ...authoredPhase,
    joints: normalizeRigJointMap(
      authoredPhase.joints,
      referenceJoints,
    ),
  };
  const activeMuscleLabels = asset.primaryMuscles
    .filter((m) => m.activePhases.includes(phase))
    .map((m) => `${m.labelKo}(${m.roleLabelKo})`)
    .join(', ');

  const accessibleTitle =
    label ?? `${asset.nameKo} (${asset.nameEn}) · ${phaseSpec.badgeKo} · ${phaseSpec.shortTitleKo}`;

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
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
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
      data-visual-theme="studio"
      data-material-system="atelier-v2"
      data-detail-level={compact ? 'preview' : showAlignment ? 'guided' : 'clean'}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        aspectRatio: '8 / 5',
        borderRadius: compact ? '10px' : '14px',
      }}
    >
      <title id={titleId}>{accessibleTitle}</title>
      <desc id={descId}>{accessibleDesc}</desc>

      <defs>
        <linearGradient id={bgGradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="200">
          <stop offset="0%" stopColor={STUDIO_COLORS.surface} />
          <stop offset="68%" stopColor={STUDIO_COLORS.horizon} />
          <stop offset="100%" stopColor={STUDIO_COLORS.floor} />
        </linearGradient>
        <linearGradient
          id={grads.oakId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="100"
          x2="0"
          y2="180"
        >
          <stop offset="0%" stopColor={MATERIAL.oakLight} />
          <stop offset="48%" stopColor={MATERIAL.oak} />
          <stop offset="100%" stopColor={MATERIAL.oakShade} />
        </linearGradient>
        <linearGradient id={grads.upholsteryId} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={MATERIAL.upholsteryLight} />
          <stop offset="32%" stopColor={MATERIAL.upholstery} />
          <stop offset="100%" stopColor={MATERIAL.upholsteryShade} />
        </linearGradient>
        <linearGradient id={grads.torsoId} x1="0.05" y1="0" x2="0.9" y2="0.9">
          <stop offset="0%" stopColor={MATERIAL.clothHighlight} />
          <stop offset="22%" stopColor={MATERIAL.clothLight} />
          <stop offset="55%" stopColor={MATERIAL.cloth} />
          <stop offset="100%" stopColor={MATERIAL.clothShade} />
        </linearGradient>
        <linearGradient id={grads.nearLegId} x1="0.08" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor={MATERIAL.clothHighlight} />
          <stop offset="24%" stopColor={MATERIAL.clothLight} />
          <stop offset="58%" stopColor={MATERIAL.cloth} />
          <stop offset="100%" stopColor={MATERIAL.clothShade} />
        </linearGradient>
        <linearGradient id={grads.farLegId} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={MATERIAL.clothFarLight} />
          <stop offset="100%" stopColor={MATERIAL.clothFar} />
        </linearGradient>
        <radialGradient id={grads.skinId} cx="0.3" cy="0.24" r="0.9">
          <stop offset="0%" stopColor={MATERIAL.skinHighlight} />
          <stop offset="38%" stopColor={MATERIAL.skinLight} />
          <stop offset="76%" stopColor={MATERIAL.skin} />
          <stop offset="100%" stopColor={MATERIAL.skinShade} />
        </radialGradient>
        <linearGradient id={grads.farSkinId} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={MATERIAL.skinLight} />
          <stop offset="100%" stopColor={MATERIAL.skinFar} />
        </linearGradient>
        <radialGradient id={grads.hairId} cx="0.3" cy="0.22" r="0.85">
          <stop offset="0%" stopColor={MATERIAL.hairLight} />
          <stop offset="50%" stopColor={MATERIAL.hair} />
          <stop offset="100%" stopColor={MATERIAL.hairShade} />
        </radialGradient>
        <linearGradient id={grads.sockId} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#fffef8" />
          <stop offset="100%" stopColor="#dce3d8" />
        </linearGradient>
        <radialGradient id={studioLightId} cx="0.25" cy="0.18" r="0.86">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.76" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
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
        stroke={STUDIO_COLORS.border}
        strokeWidth={1}
      />
      <rect
        x={1}
        y={1}
        width={VIEWBOX_WIDTH - 2}
        height={VIEWBOX_HEIGHT - 2}
        rx={compact ? 10 : 14}
        fill={`url(#${studioLightId})`}
        aria-hidden="true"
      />
      <g
        stroke={STUDIO_COLORS.guide}
        strokeWidth={compact ? 0.45 : 0.65}
        opacity={showAlignment ? (compact ? 0.1 : 0.25) : 0}
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
            stroke={STUDIO_COLORS.border}
            strokeWidth={0.9}
          />
          <circle cx={21.5} cy={13.8} r={2.9} fill="#1f4d3f" stroke="#1f4d3f" strokeWidth={0.9} />
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
      {renderExerciseProps(asset, phaseSpec, mirrored)}

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

      {/* 3. Sculpted Studio Practitioner Human Figure Layer */}
      {renderKinematicFigureLayer(
        phaseSpec,
        activeSide,
        mirrored,
        grads,
        asset.archetypeId === 'mat-clam-isolated' || asset.archetypeId === 'mat-open-book-isolated',
        showAlignment && !compact,
        getStudioFigureScale(asset),
        referenceJoints,
        !atlasReady || atlasFailed,
      )}
      {!atlasFailed && <GeneratedPractitionerFigure
        joints={phaseSpec.joints}
        referenceJoints={referenceJoints}
        activeSide={activeSide}
        mirrored={mirrored}
        scale={getStudioFigureScale(asset)}
        id={`mpd-generated-${rawUid}`}
        ready={atlasReady}
        onLoad={() => setAtlasReady(true)}
        onError={() => setAtlasFailed(true)}
      />}

      {/* 4. Translucent muscle overlay stays visible above the opaque clothing. */}
      {showMuscles ? renderPrimaryMusclesLayer(asset, phaseSpec, phase, mirrored, compact) : null}

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
  const visualBinding = getExpandedMovementVisualBinding(asset.exerciseId);
  const sourceOnly = visualBinding?.nativeMotionAvailable === false;
  const identityMismatch = hasCatalogMotionIdentityMismatch({
    id: asset.exerciseId, apparatus: asset.apparatus, bodyPosition: asset.bodyPosition,
  });
  if (sourceOnly || identityMismatch) {
    return (
      <section
        className={`movement-triptych-diagram ${className}`.trim()}
        data-native-motion-available="false"
        aria-label={`${asset.nameKo} ${sourceOnly ? '제작자 영상 참고' : '전용 도해 없음'}`}
      >
        <MovementPhaseDiagramSvg asset={asset} phase="start" compact />
        <p>{sourceOnly ? visualBinding.reasonKo : '기구나 시작 자세가 변경되어 기존 도해를 표시하지 않습니다.'}</p>
        {sourceOnly && visualBinding.sourceUrl ? (
          <a href={visualBinding.sourceUrl} target="_blank" rel="noreferrer">
            제작자 동작 설명 열기
          </a>
        ) : null}
      </section>
    );
  }
  const deltaInfo = calculatePhaseJointDelta(asset);

  return (
    <div
      className={`movement-triptych-diagram ${className}`.trim()}
      data-testid="movement-triptych-diagram"
      data-triptych-exercise-id={asset.exerciseId}
      data-visual-theme="studio"
    >
      <div className="movement-triptych-heading">
        <strong>단계 흐름: 시작 → 중간 → 끝 ({asset.archetypeTitleKo})</strong>
        <span>같은 구도와 크기로 자세를 비교해 보세요.</span>
      </div>

      <div className="movement-triptych-grid">
        {PHASE_ORDER.map((phaseId, idx) => {
          const spec = asset.phases[phaseId];
          const isSelected = selectedPhase === phaseId;
          const phaseLabel = (
            <>
              <span className="movement-triptych-phase-number" aria-hidden="true">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="movement-triptych-phase-label">
                <strong>{PHASE_SHORT_BADGE[phaseId]}</strong>
                <span>{spec.shortTitleKo}</span>
              </span>
            </>
          );
          return (
            <div
              key={phaseId}
              className="movement-triptych-panel"
              data-triptych-panel={phaseId}
              data-selected={isSelected}
            >
              {onSelectPhase ? (
                <button
                  type="button"
                  className="movement-triptych-phase-heading"
                  onClick={() => onSelectPhase(phaseId)}
                  aria-pressed={isSelected}
                  data-triptych-phase={phaseId}
                >
                  {phaseLabel}
                </button>
              ) : (
                <div className="movement-triptych-phase-heading" data-triptych-phase={phaseId}>
                  {phaseLabel}
                </div>
              )}

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

              <div className="movement-triptych-caption">
                <strong>{spec.breathCueKo}</strong>
                <p>{spec.summaryKo}</p>
              </div>
            </div>
          );
        })}
      </div>
      <details className="movement-triptych-metadata">
        <summary>도해 정보</summary>
        <p>
          최대 관절 변위 Δ{deltaInfo.maxDeltaPx}px · 가동 관절 {deltaInfo.movedJoints.length}개
        </p>
      </details>
    </div>
  );
}
