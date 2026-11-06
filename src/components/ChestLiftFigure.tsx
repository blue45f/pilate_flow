import { useId } from 'react';
import {
  CHEST_LIFT_DRAFT_ID,
  CHEST_LIFT_PARAMS,
  getChestLiftPose,
  projectChestLiftPoint,
} from '../models/chestLift';
import type { AnatomicalSide, Point3 } from '../models/types';

export interface ChestLiftFigureProps {
  draftId: typeof CHEST_LIFT_DRAFT_ID;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}

const number = (value: number) => Number(value.toFixed(3));
const sides = ['right', 'left'] as const;

/** New articulated Chest Lift SVG only. Playback and catalog registration stay in the parent. */
export function ChestLiftFigure({
  draftId,
  progress,
  activeSide = 'right',
  mirrored = false,
  className,
  label,
}: ChestLiftFigureProps) {
  const id = useId();
  if (draftId !== CHEST_LIFT_DRAFT_ID) throw new TypeError('Unknown Chest Lift proposal ID.');
  const pose = getChestLiftPose(progress, { activeSide, mirrored });
  const { width, height } = CHEST_LIFT_PARAMS.projection;
  const project = (point: Point3) => projectChestLiftPoint(point, mirrored);
  const points = (vertices: readonly Point3[]) =>
    vertices.map((point) => project(point).map(number).join(',')).join(' ');
  const line = (vertices: readonly Point3[]) =>
    vertices
      .map((point, index) => `${index ? 'L' : 'M'} ${project(point).map(number).join(' ')}`)
      .join(' ');
  const mark = (point: Point3) => ({
    cx: number(project(point)[0]),
    cy: number(project(point)[1]),
  });
  const head = pose.head;
  const leftHand = project(pose.arms.left.handPatch);
  const rightHand = project(pose.arms.right.handPatch);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={`${id}-title ${id}-description`}
      className={className}
      data-motion-draft-id={draftId}
      data-model-version={pose.modelVersion}
      data-progress={pose.progress}
      data-active-side={activeSide}
      data-view-mirrored={mirrored}
      data-side-mode="bilateral"
      data-proposal-status="variant-proposal"
      data-source-feet-flat-established="false"
      data-source-pelvis-fixed-established="false"
      data-exact-asset-ready="false"
      data-professional-review-count="0"
    >
      <title id={`${id}-title`}>{label ?? '체스트 리프트 · 손으로 머리를 받친 미검토 도해'}</title>
      <desc id={`${id}-description`}>
        무릎을 굽히고 두 다리를 모은 누운 배치에서 머리·목·가슴이 분절되어 움직입니다. 양손은 머리
        뒤의 제작 접점을 따라가며 팔꿈치와 손목이 움직입니다. 견갑 하단 표시는 매트에서 떨어지는
        출처의 정성적 설명을 위한 제작 지점입니다. 발바닥 접촉과 골반 고정은 원문에서 확인되지
        않았습니다. 모든 수치·관절·지지 패치는 제작 선택입니다. 호흡·머리 압력·안전성이나 개인
        적합성을 측정하지 않았습니다. 완성 자산 0건, 전문가 검토 0건입니다.
      </desc>
      <rect width={width} height={height} rx="12" fill="#fcfbf7" />
      <g data-contact-surface="mat" data-geometry-basis="authored-only">
        <polygon
          points={points(pose.matCorners)}
          fill="#e6eddf"
          stroke="#bacbb0"
          strokeWidth="1.5"
        />
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" data-body-part="paired-bent-legs">
        {sides.map((side) => {
          const leg = pose.legs[side];
          return (
            <g
              key={side}
              data-anatomical-side={side}
              data-leg-setup="bent-paired"
              data-foot-contact-evidence="authored-only"
            >
              <path
                d={line([leg.hip, leg.knee, leg.ankle])}
                stroke={side === 'left' ? '#88a47b' : '#ba9c82'}
                strokeWidth="18"
                opacity="0.8"
              />
              <path
                d={line([leg.hip, leg.knee, leg.ankle])}
                stroke={side === 'left' ? '#285b4c' : '#8b684c'}
                strokeWidth="3"
                strokeDasharray={side === 'right' ? '6 4' : undefined}
              />
              <path
                d={line([leg.heel, leg.ankle, leg.toe])}
                stroke={side === 'left' ? '#285b4c' : '#8b684c'}
                strokeWidth="8"
              />
              <circle {...mark(leg.knee)} r="4" fill="#fcfbf7" stroke="#52694a" strokeWidth="1.5" />
            </g>
          );
        })}
      </g>
      <g data-body-part="articulated-trunk" data-geometry-basis="authored-only">
        {pose.torsoRings.slice(1).flatMap((ring, index) =>
          ring.map((point, vertex) => {
            const previous = pose.torsoRings[index];
            const nextVertex = (vertex + 1) % ring.length;
            return (
              <polygon
                key={`${index}-${vertex}`}
                points={points([previous[vertex], point, ring[nextVertex], previous[nextVertex]])}
                fill={index % 2 ? '#b7c9aa' : '#d3dec8'}
                stroke="#6d8661"
                strokeWidth="0.6"
                opacity="0.9"
              />
            );
          }),
        )}
        <path
          d={line(pose.spine.points)}
          fill="none"
          stroke="#526c49"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          data-spine-chain="articulated"
        />
        {pose.spine.points.map((point, index) => (
          <circle
            key={index}
            {...mark(point)}
            r="2.4"
            fill="#fcfbf7"
            stroke="#526c49"
            strokeWidth="1"
          />
        ))}
      </g>
      <g data-body-part="scapular-inferior-landmarks" data-geometry-basis="authored-only">
        {sides.map((side) => {
          const tip = pose.scapularInferiorTips[side];
          const contactState = tip[2] <= 1e-9 ? 'grounded' : 'released';
          return (
            <circle
              key={side}
              {...mark(tip)}
              r="4"
              fill={contactState === 'grounded' ? '#b49867' : '#c57856'}
              stroke="#7b5c3f"
              strokeWidth="1"
              data-anatomical-side={side}
              data-scapular-contact={contactState}
            />
          );
        })}
      </g>
      <g data-body-part="independent-head-neck">
        <path
          d={line([pose.spine.upperThorax, pose.spine.neckMid, pose.spine.occiput])}
          fill="none"
          stroke="#9a876a"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon points={points(head.outline)} fill="#eee1ce" stroke="#8c785d" strokeWidth="2" />
        <path
          d={line([head.eye, head.nose, head.chin])}
          fill="none"
          stroke="#795e45"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle {...mark(head.eye)} r="2" fill="#52634a" />
      </g>
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-body-part="head-following-hand-support"
      >
        {sides.map((side) => {
          const arm = pose.arms[side];
          const color = side === 'left' ? '#285b4c' : '#8b684c';
          return (
            <g
              key={side}
              data-anatomical-side={side}
              data-hand-support="head-following-authored-patch"
            >
              <path
                d={line([arm.shoulder, arm.elbow, arm.wrist])}
                stroke={side === 'left' ? '#89a57b' : '#bca187'}
                strokeWidth="11"
              />
              <path
                d={line([arm.shoulder, arm.elbow, arm.wrist])}
                stroke={color}
                strokeWidth="2.4"
                strokeDasharray={side === 'right' ? '6 4' : undefined}
              />
              <circle
                {...mark(arm.elbow)}
                r="3.5"
                fill="#fcfbf7"
                stroke={color}
                strokeWidth="1.5"
              />
              <path d={line([arm.wrist, arm.handPatch])} stroke={color} strokeWidth="5" />
              <circle
                {...mark(arm.handPatch)}
                r="3.3"
                fill="#eee1ce"
                stroke={color}
                strokeWidth="1.5"
                data-contact-patch="occipital-hand"
                data-geometry-basis="authored-only"
              />
            </g>
          );
        })}
        {[0, 1, 2].map((index) => (
          <path
            key={index}
            d={`M ${number(leftHand[0] - 2)} ${number(leftHand[1] + index * 2)} Q ${number((leftHand[0] + rightHand[0]) / 2)} ${number((leftHand[1] + rightHand[1]) / 2 - 3 + index * 2)} ${number(rightHand[0] + 2)} ${number(rightHand[1] + (2 - index) * 2)}`}
            stroke="#8b6c50"
            strokeWidth="1.2"
            data-finger-interlace="authored-strokes"
          />
        ))}
      </g>
      <g data-body-part="authored-contact-markers">
        {pose.contacts
          .filter((contact) => contact.state !== 'released')
          .map((contact) => (
            <circle
              key={contact.id}
              {...mark(contact.point)}
              r="2"
              fill="#ac8c5d"
              opacity="0.8"
              data-contact-id={contact.id}
              data-contact-state={contact.state}
              data-geometry-basis={contact.geometryBasis}
            />
          ))}
      </g>
      <text
        x="18"
        y="25"
        fill="#31583e"
        fontFamily="system-ui, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        체스트 리프트 · 미검토 원본 도해
      </text>
      <text x="18" y={height - 34} fill="#796042" fontFamily="system-ui, sans-serif" fontSize="13">
        발 지지·골반 고정·접점·각도: 제작 선택
      </text>
      <text x="18" y={height - 14} fill="#64735d" fontFamily="system-ui, sans-serif" fontSize="13">
        실선 왼쪽 · 점선 오른쪽 | 완성 0 · 전문가 0
      </text>
    </svg>
  );
}
