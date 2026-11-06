import { useId } from 'react';
import { getSupineReachPose, projectSupineReachPoint } from '../models/supineReach';
import type { SupineReachPoint, SupineReachSide } from '../models/supineReach';

export interface SupineReachFigureProps {
  progress: number;
  activeSide?: SupineReachSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}

const round = (value: number) => Number(value.toFixed(3));
const drawOrder = ['right', 'left'] as const;

/** Original SVG only; the parent owns time, pauses, progress and side changes. */
export function SupineReachFigure({
  progress,
  activeSide = 'left',
  mirrored = false,
  className,
  label,
}: SupineReachFigureProps) {
  const id = useId();
  const pose = getSupineReachPose(progress, { activeSide, mirrored });
  const activeLabel = pose.activeSide === 'left' ? '해부학적 왼쪽' : '해부학적 오른쪽';
  const retainedLabel = pose.retainedSide === 'left' ? '해부학적 왼쪽' : '해부학적 오른쪽';
  const project = (point: SupineReachPoint) => projectSupineReachPoint(point, mirrored);
  const points = (vertices: readonly SupineReachPoint[]) =>
    vertices.map((point) => project(point).map(round).join(',')).join(' ');
  const line = (vertices: readonly SupineReachPoint[]) =>
    vertices
      .map((point, index) => `${index ? 'L' : 'M'} ${project(point).map(round).join(' ')}`)
      .join(' ');
  const mark = (point: SupineReachPoint) => ({
    cx: round(project(point)[0]),
    cy: round(project(point)[1]),
  });
  const directionPath = pose.trajectory.directionPoints;
  const directionPosition = pose.trajectory.direction === 'return' ? 1 - pose.amount : pose.amount;
  const directionIndex = Math.round(directionPosition * Math.max(0, directionPath.length - 1));
  const directionStart = Math.max(0, Math.min(directionPath.length - 6, directionIndex - 2));
  const arrowPoints = directionPath.slice(directionStart, directionStart + 6);

  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      className={className}
      data-motion-family={pose.family}
      data-variant-id={pose.variantId}
      data-model-version={pose.modelVersion}
      data-progress={pose.progress}
      data-motion-amount={pose.amount}
      data-phase={pose.phase.id}
      data-phase-behavior={pose.phase.displayBehavior}
      data-active-side={pose.activeSide}
      data-retained-side={pose.retainedSide}
      data-view-mirrored={pose.mirrored}
      data-scope="one-sided-extension-return-subset"
      data-playback-owner="parent"
      data-proposal-status={pose.proposalStatus}
      data-exact-asset-ready="false"
      data-exact-source-variant-matched="false"
      data-professional-review-count="0"
    >
      <title id={`${id}-title`}>{label ?? '누운 자세 한 다리 뻗기 · 미검토 원본 도해'}</title>
      <desc id={`${id}-description`}>
        표제 범위: 한쪽 다리를 뻗고 같은 다리를 되돌리는 부분만 표시합니다. 한쪽 다리 뻗기 패턴에서
        파생한 저작 변형이며, 반대 다리와 양손을 고정한 채 같은 다리를 되돌리는 구성은 출처의 연속
        구간을 그대로 재현한 것이 아닙니다. 선택한 {activeLabel} 다리가 움직이고, {retainedLabel}{' '}
        무릎은 테이블톱 배치에 남아 양손이 그 무릎 위의 저작 접점을 따릅니다. 머리와 가슴은 준비부터
        마무리까지 이미 든 상태입니다. 다리 교대, 손 옮기기, 가슴 들기에 들어가거나 내려오기, 누워
        쉬는 마무리는 이 도해의 범위 밖입니다. 실선은 해부학적 왼쪽, 점선은 해부학적 오른쪽이며
        선택한 다리나 화면 반전과 관계없이 같습니다. 두 겹 윤곽은 색상과 관계없이 선택한 다리를
        구분하며, 도해 밖의 범례가 그 뜻을 설명합니다. 흐린 곡선은 이 모델에서 계산한 움직이는 발목
        경로입니다. 방향 표시는 뻗기와 되돌리기 구간에만 있습니다. 골반과 아래 몸통의 매트 접점은
        고정한 저작 선택이며, 머리·가슴·양발은 매트 지지를 받지 않습니다. 모든 몸 경로·접점·수치
        각도·시간은 저작자가 선택했으며 검증되지 않았습니다. 압력 측정, 안전성·개인 적합성 평가,
        출처 자산과의 정확한 일치 또는 전문가 승인을 뜻하지 않습니다. 출처와 정확히 일치하는 변형은
        확인하지 않았습니다. 정확 자산 0건, 전문가 검토 0건입니다.
      </desc>
      {pose.trajectory.direction && (
        <defs>
          <marker
            id={`${id}-direction`}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 1 1 L 7 4 L 1 7" fill="none" stroke="#374c53" strokeWidth="1.6" />
          </marker>
        </defs>
      )}
      <rect width="640" height="360" rx="12" fill="#fbfaf6" />
      <polygon
        points={points(pose.equipment.mat.corners)}
        fill="#e4ebe2"
        stroke="#a9bbaa"
        strokeWidth="1.5"
        data-equipment="mat"
        data-plane-z="0"
      />
      <path
        d={line(pose.trajectory.points)}
        fill="none"
        stroke="#526773"
        strokeWidth="1.5"
        strokeDasharray="2 4"
        opacity="0.4"
        data-trajectory="active-ankle"
        data-geometry-basis="model-derived"
      />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" data-body-part="legs">
        {drawOrder.map((side) => {
          const leg = pose.legs[side];
          const active = side === pose.activeSide;
          const color = side === 'left' ? '#315f67' : '#705340';
          const limbPath = line([leg.hip, leg.knee, leg.ankle]);
          return (
            <g
              key={side}
              data-anatomical-side={side}
              data-limb-role={active ? 'active' : 'retained'}
              data-side-style={side === 'left' ? 'solid' : 'dashed'}
              data-mat-support="none"
            >
              {active && (
                <path d={limbPath} stroke="#26343a" strokeWidth="22" data-active-outline="double" />
              )}
              <path
                d={limbPath}
                stroke={side === 'left' ? '#a9c3c8' : '#cfb7a2'}
                strokeWidth="17"
              />
              <path
                d={limbPath}
                stroke={color}
                strokeWidth={active ? 3.8 : 2.5}
                strokeDasharray={side === 'right' ? '7 4' : undefined}
                data-anatomical-line={side}
              />
              <path
                d={line([leg.heel, leg.ankle, leg.toe])}
                stroke={side === 'left' ? '#a9c3c8' : '#cfb7a2'}
                strokeWidth="10"
              />
              <path
                d={line([leg.heel, leg.ankle, leg.toe])}
                stroke={color}
                strokeWidth="2.5"
                strokeDasharray={side === 'right' ? '7 4' : undefined}
                data-anatomical-line={side}
                data-body-part="foot"
              />
              <circle
                {...mark(leg.knee)}
                r={active ? 6 : 4}
                fill="#fbfaf6"
                stroke={color}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <circle {...mark(leg.ankle)} r="3" fill="#fbfaf6" stroke={color} strokeWidth="1.5" />
            </g>
          );
        })}
      </g>
      <g
        data-body-part="fixed-curled-trunk"
        data-mat-support="pelvis-and-lower-trunk-authored-patches"
        data-geometry-basis="authored-only"
      >
        {pose.body.torsoRings.slice(1).flatMap((ring, index) =>
          ring.map((point, vertex) => {
            const previous = pose.body.torsoRings[index];
            const next = (vertex + 1) % ring.length;
            return (
              <polygon
                key={`${index}-${vertex}`}
                points={points([previous[vertex], point, ring[next], previous[next]])}
                fill={index % 2 ? '#c4d3cf' : '#dce5df'}
                stroke="#718e84"
                strokeWidth="0.6"
              />
            );
          }),
        )}
        <path
          d={line(pose.body.spine)}
          fill="none"
          stroke="#54776e"
          strokeWidth="2.5"
          strokeLinecap="round"
          data-spine-chain="fixed-six-link"
        />
      </g>
      <g data-body-part="already-raised-head" data-mat-support="none">
        <path
          d={line(pose.body.spine.slice(5))}
          fill="none"
          stroke="#a18b73"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <polygon
          points={points(pose.body.head.outline)}
          fill="#efdfc9"
          stroke="#8d765d"
          strokeWidth="2"
        />
        <path
          d={line([pose.body.head.eye, pose.body.head.nose, pose.body.head.chin])}
          fill="none"
          stroke="#80654d"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle {...mark(pose.body.head.eye)} r="2" fill="#435f61" />
      </g>
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-body-part="both-hands-retained-knee"
      >
        {drawOrder.map((side) => {
          const arm = pose.arms[side];
          const color = side === 'left' ? '#315f67' : '#705340';
          return (
            <g
              key={side}
              data-anatomical-side={side}
              data-side-style={side === 'left' ? 'solid' : 'dashed'}
              data-hand-contact="retained-knee-top"
              data-target-side={pose.retainedSide}
            >
              <path
                d={line([arm.shoulder, arm.elbow, arm.wrist])}
                stroke={side === 'left' ? '#a9c3c8' : '#cfb7a2'}
                strokeWidth="10"
              />
              <path
                d={line([arm.shoulder, arm.elbow, arm.wrist])}
                stroke={color}
                strokeWidth="2.4"
                strokeDasharray={side === 'right' ? '7 4' : undefined}
                data-anatomical-line={side}
              />
              <circle {...mark(arm.elbow)} r="3" fill="#fbfaf6" stroke={color} strokeWidth="1.4" />
              <ellipse
                {...mark(arm.handPatch)}
                rx="6"
                ry="4"
                fill="#efdfc9"
                stroke={color}
                strokeWidth="1.7"
                data-hand-patch={side}
                data-contact-surface="retained-knee"
              />
            </g>
          );
        })}
      </g>
      <g data-body-part="authored-contact-patches">
        {pose.contacts
          .filter((contact) => contact.surface !== 'none')
          .map((contact) => (
            <circle
              key={contact.id}
              {...mark(contact.point)}
              r={contact.surface === 'mat' ? 4 : 2}
              fill={contact.surface === 'mat' ? '#a18354' : '#fbfaf6'}
              stroke="#68583f"
              strokeWidth="1.1"
              data-contact-id={contact.id}
              data-contact-state={contact.state}
              data-contact-surface={contact.surface}
              data-target-side={contact.targetSide}
              data-geometry-basis={contact.geometryBasis}
            />
          ))}
      </g>
      {pose.trajectory.direction && (
        <path
          d={line(arrowPoints)}
          fill="none"
          stroke="#374c53"
          strokeWidth="1.8"
          markerEnd={`url(#${id}-direction)`}
          data-motion-direction={pose.trajectory.direction}
          data-direction-landmark="active-ankle"
        />
      )}
    </svg>
  );
}
