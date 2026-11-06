import { useId } from "react";
import { getSupineDraftPose, projectSupinePoint } from "../models/supineDrafts";
import type { SupineDraftId } from "../models/supineDrafts";
import type { AnatomicalSide, Point3, ScreenPoint } from "../models/types";

export interface SupineDraftFigureProps {
  draftId: SupineDraftId;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}

const round = (value: number) => Number(value.toFixed(3));
const polyline = (points: readonly ScreenPoint[]) =>
  points.map((point) => point.map(round).join(",")).join(" ");
const sideKo = (side: AnatomicalSide) => (side === "right" ? "오른쪽" : "왼쪽");

/** SPDX-License-Identifier: 0BSD. Original SVG primitives; no source media. */
export function SupineDraftFigure({
  draftId,
  progress,
  activeSide = "right",
  mirrored = false,
  className,
  label,
}: SupineDraftFigureProps) {
  const instanceId = useId();
  const titleId = `${instanceId}-title`;
  const descriptionId = `${instanceId}-description`;
  const pose = getSupineDraftPose(draftId, progress, { activeSide, mirrored });
  const { body, legs } = pose.world;
  const project = (point: Point3) => projectSupinePoint(point, mirrored);
  const points = (world: readonly Point3[]) => polyline(world.map(project));
  const isSlide = draftId === "adult-supine-heel-slide";
  const title = isSlide ? "누워서 힐 슬라이드" : "한쪽 니 폴드";
  const activeFootIsLifted = !isSlide && pose.amount > 0;
  const mat: readonly Point3[] = [
    [65, -82, 0],
    [545, -82, 0],
    [545, 82, 0],
    [65, 82, 0],
  ];
  const torso: readonly Point3[] = [
    [165, -30, 30],
    [310, -23, 30],
    [316, 23, 30],
    [165, 30, 30],
  ];
  const arm = (side: AnatomicalSide) => {
    const shoulder = side === "left" ? body.leftShoulder : body.rightShoulder;
    const elbow = side === "left" ? body.leftElbow : body.rightElbow;
    const hand = side === "left" ? body.leftHand : body.rightHand;
    return (
      <polyline
        points={points([shoulder, elbow, hand])}
        fill="none"
        stroke="#c49c83"
        strokeWidth={12}
      />
    );
  };
  const limb = (side: AnatomicalSide) => {
    const leg = legs[side];
    const active = leg.role === "active";
    const color = active ? "#a95b3d" : "#376d62";
    const fill = active ? "#d49a77" : "#88aca0";
    const dash = active ? undefined : "5 5";
    const jointPoints = [leg.hip, leg.knee, leg.ankle].map(project);
    return (
      <g
        key={side}
        data-anatomical-side={side}
        data-limb-role={leg.role}
        fill="none"
        stroke={color}
      >
        <polyline
          points={polyline(jointPoints)}
          stroke={fill}
          strokeWidth={21}
        />
        <polyline
          points={polyline(jointPoints)}
          strokeWidth={2.5}
          strokeDasharray={dash}
        />
        <polyline
          points={points([leg.heel, leg.ankle, leg.toe])}
          stroke={fill}
          strokeWidth={10}
        />
        <polyline
          points={points([leg.heel, leg.toe])}
          strokeWidth={3}
          strokeDasharray={dash}
        />
        {jointPoints.map(([x, y], index) => (
          <circle
            key={index}
            cx={round(x)}
            cy={round(y)}
            r={index === 1 ? 5 : 3.5}
            fill="#fcfaf5"
            strokeWidth={1.5}
          />
        ))}
      </g>
    );
  };
  const head = project(body.headCenter);
  const heel = legs[activeSide].heel;
  const heelScreen = project(heel);
  const heelShadow = project([heel[0], heel[1], 0]);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 640 360"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-motion-draft-id={draftId}
      data-progress={pose.progress}
      data-active-side={activeSide}
      data-view-mirrored={mirrored}
    >
      <title id={titleId}>
        {label ?? `${title} · 제작 초안 · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descriptionId}>
        전문가 미검토 원본 도해입니다. 수술 후 회복 자료의 동작 사실을
        참고했으며 일반 성인의 적합성이나 정확한 운동 자산으로 승인되지
        않았습니다. 몸의 {sideKo(activeSide)}만 움직이고 몸의{" "}
        {sideKo(pose.supportSide)}
        다리는 고정됩니다. 실선은 움직이는 다리, 점선은 지지 다리입니다.
        {isSlide
          ? "선택한 뒤꿈치는 매트 위에서 미끄러졌다 돌아옵니다."
          : "선택한 발의 뒤꿈치와 발끝이 함께 매트에서 떨어졌다 돌아옵니다."}
        머리·등·골반의 지지 위치와 양팔은 제작상 고정한 단순 모델입니다. 화면
        반전은 해부학적 쪽을 바꾸지 않습니다. 각도·비율·시간은 제작 선택입니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={24} y={29} fontSize={20} fontWeight={700}>
          {title}
        </text>
        <text x={24} y={51} fontSize={13} fill="#875641">
          원본 제작 초안 · 전문가 미검토
        </text>
        <text x={616} y={29} textAnchor="end" fontSize={13}>
          움직임: 몸의 {sideKo(activeSide)}
        </text>
        <text x={616} y={51} textAnchor="end" fontSize={12}>
          {mirrored
            ? "화면 반전 켬 · 해부학적 쪽 유지"
            : "고정 사선 시점 · 해부학적 쪽 표시"}
        </text>
        <text x={24} y={79} fontSize={12}>
          실선: 몸의 {sideKo(activeSide)} · 점선: 몸의{" "}
          {sideKo(pose.supportSide)}
        </text>
        <text x={24} y={101} fontSize={12}>
          머리·등·골반: 지지 위치 고정
        </text>
        <text
          x={616}
          y={79}
          textAnchor="end"
          fontSize={12}
          data-active-contact-label="true"
        >
          {activeFootIsLifted
            ? "선택한 발: 매트에서 떨어짐"
            : "선택한 뒤꿈치: 매트 접촉"}
        </text>
        <text x={616} y={101} textAnchor="end" fontSize={12}>
          반대쪽 발: 매트 접촉 고정
        </text>
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        <polygon
          points={points(mat)}
          fill="#dbe4d9"
          stroke="#b2c4b4"
          strokeWidth={2}
        />
        {arm("right")}
        {limb("right")}
        <polyline
          points={points([body.headCenter, body.neck, body.shoulderCenter])}
          fill="none"
          stroke="#c49c83"
          strokeWidth={14}
        />
        <polygon
          points={points(torso)}
          fill="#a6bba8"
          stroke="#4b7566"
          strokeWidth={2}
        />
        {arm("left")}
        <circle
          cx={round(head[0])}
          cy={round(head[1])}
          r={24}
          fill="#d4ad94"
          stroke="#916a56"
          strokeWidth={2}
        />
        <path
          d={`M ${round(head[0] - (mirrored ? -12 : 12))} ${round(head[1] - 13)} q ${mirrored ? -8 : 8} -8 ${mirrored ? -15 : 15} 0`}
          fill="none"
          stroke="#916a56"
          strokeWidth={1.5}
        />
        {limb("left")}
        {activeFootIsLifted && (
          <g data-lift-guide="true" stroke="#a95b3d" fill="none">
            <line
              x1={round(heelShadow[0])}
              y1={round(heelShadow[1])}
              x2={round(heelScreen[0])}
              y2={round(heelScreen[1])}
              strokeWidth={1.5}
              strokeDasharray="3 4"
            />
            <ellipse
              cx={round(heelShadow[0])}
              cy={round(heelShadow[1])}
              rx={8}
              ry={3}
              strokeWidth={1.5}
            />
          </g>
        )}
        {pose.contacts
          .filter((contact) => contact.side !== null)
          .map((contact) => {
            const [x, y] = project(contact.point);
            return (
              <circle
                key={contact.id}
                data-contact-id={contact.id}
                data-contact-state={contact.state}
                cx={round(x)}
                cy={round(y)}
                r={4}
                fill={contact.state === "lifted" ? "#f7f5ef" : "#254d45"}
                stroke={contact.state === "lifted" ? "#a95b3d" : "#f7f5ef"}
                strokeWidth={1.5}
              />
            );
          })}
      </g>
      <g fontFamily="system-ui, sans-serif" fontSize={12} fill="#254d45">
        {(["right", "left"] as const).map((side) => {
          const knee = project(legs[side].knee);
          return (
            <text
              key={side}
              x={round(knee[0])}
              y={round(knee[1] - 16)}
              textAnchor="middle"
              data-leg-label={side}
            >
              몸의 {sideKo(side)} · {side === activeSide ? "움직임" : "고정"}
            </text>
          );
        })}
        <text x={24} y={340} fontSize={13} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={616} y={340} textAnchor="end" fontSize={11}>
          도형·시간은 제작 선택 · 운동 시범 아님
        </text>
      </g>
    </svg>
  );
}
