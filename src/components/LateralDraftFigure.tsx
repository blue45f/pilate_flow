import { useId } from "react";
import {
  getLateralDraftPose,
  projectLateralPoint,
} from "../models/lateralDrafts";
import type { LateralDraftId, LateralLeg } from "../models/lateralDrafts";
import type { AnatomicalSide, Point3, ScreenPoint } from "../models/types";

export interface LateralDraftFigureProps {
  draftId: LateralDraftId;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}
const n = (value: number) => Math.round(value * 1000) / 1000;
const points = (values: readonly ScreenPoint[]) =>
  values.map((p) => `${n(p[0])},${n(p[1])}`).join(" ");
const sideKo = (side: AnatomicalSide) => (side === "left" ? "왼쪽" : "오른쪽");

/** Native SVG drawn from this frame's original 3D rig; no embedded source media. */
export function LateralDraftFigure({
  draftId,
  progress,
  activeSide = "right",
  mirrored = false,
  className,
  label,
}: LateralDraftFigureProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const pose = getLateralDraftPose(draftId, progress, { activeSide, mirrored });
  const isLift = draftId === "side-lying-straight-leg-lift";
  const title = isLift ? "옆누움 편 다리 들기" : "옆누움 오픈 북";
  const project = (p: Point3) => projectLateralPoint(p, mirrored);
  const s = pose.screen;
  const top = pose.legs[activeSide];
  const bottom = pose.legs[pose.supportSide];
  const stroke = (p: readonly Point3[]) => points(p.map(project));
  const centerCircle = (
    p: Point3,
    radius: number,
    fill: string,
    color: string,
  ) => {
    const center = project(p);
    return (
      <circle
        cx={n(center[0])}
        cy={n(center[1])}
        r={radius}
        fill={fill}
        stroke={color}
        strokeWidth={1.5}
      />
    );
  };
  const legPoints = (leg: LateralLeg) => [leg.hip, leg.knee, leg.ankle];
  // Explicit tapered underside at mat z=0 makes lower-leg contact geometry visible.
  const lowerHull = [bottom.hip, bottom.knee, bottom.ankle]
    .map((p): Point3 => [p[0], p[1], p[2] * 2])
    .concat(
      [bottom.ankle, bottom.knee, bottom.hip].map((p): Point3 => [
        p[0],
        p[1],
        0,
      ]),
    );
  const lowerArm = pose.arms[pose.supportSide];
  const upperArm = pose.arms[activeSide];
  const rest = getLateralDraftPose(draftId, 0, { activeSide, mirrored });
  const torsoFaces = pose.torsoRings
    .slice(0, -1)
    .flatMap((ring, ringIndex) =>
      ring.map((point, index) => [
        point,
        ring[(index + 1) % ring.length],
        pose.torsoRings[ringIndex + 1][(index + 1) % ring.length],
        pose.torsoRings[ringIndex + 1][index],
      ]),
    );
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 360"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-motion-draft-id={draftId}
      data-progress={pose.progress}
      data-active-side={activeSide}
      data-view-mirrored={mirrored}
      data-model-version={pose.modelVersion}
    >
      <title id={titleId}>
        {label ??
          `${title} 제작 초안 · 위쪽 ${sideKo(activeSide)} · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descriptionId}>
        전문가 미검토 원본 도해입니다. 몸의 {sideKo(activeSide)}이 위쪽이고{" "}
        {sideKo(pose.supportSide)}이 아래쪽입니다.
        {isLift
          ? "위쪽 다리를 편 채 들고 지지 다리·골반·머리·팔은 고정한 기하 모델입니다."
          : "굽힌 다리·골반·아래 팔은 고정하고 위쪽 어깨와 흉곽·팔이 열리며 머리 방향이 팔을 따르는 기하 모델입니다. 개별 척추·견갑골·목 관절은 생략했습니다."}
        매트 위 머리 받침은 원문에 없는 제작 선택입니다. 화면 반전은 해부학적
        쪽을 바꾸지 않습니다. 도형·각도·시간은 제작 선택이며 운동 시범·안전성
        검증·승인된 동작 매핑이 아닙니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={24} y={29} fontSize={19} fontWeight={700}>
          {title}
        </text>
        <text x={24} y={51} fontSize={13} fill="#875641">
          제작 초안 · 전문가 미검토
        </text>
        <text x={616} y={29} textAnchor="end" fontSize={12}>
          위쪽 {sideKo(activeSide)} · 아래쪽 {sideKo(pose.supportSide)}
        </text>
        <text x={616} y={50} textAnchor="end" fontSize={11} fill="#586a60">
          {mirrored
            ? "화면 반전 켬 · 몸의 쪽 유지"
            : "고정 사선 시점 · 몸의 쪽 표시"}
        </text>
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        {pose.supports.map((support) => (
          <polygon
            key={support.id}
            data-support={support.id}
            points={stroke(support.corners)}
            fill={support.id === "mat" ? "#dbe4d9" : "#fffdf8"}
            stroke={support.id === "mat" ? "#b4c7b7" : "#b9baab"}
            strokeWidth={2}
          />
        ))}
        {pose.amount > 0 && (
          <polyline
            points={stroke(
              isLift
                ? [rest.world.topHip, rest.world.topKnee, rest.world.topAnkle]
                : [
                    rest.world.topShoulder,
                    rest.world.topElbow,
                    rest.world.topHand,
                  ],
            )}
            fill="none"
            stroke="#8b8b7d"
            strokeWidth={3}
            strokeDasharray="5 6"
            opacity={0.5}
          />
        )}
        <g data-anatomical-side={pose.supportSide} data-placement="bottom">
          <polygon
            points={stroke(lowerHull)}
            fill="#87a294"
            stroke="#466e62"
            strokeWidth={1.5}
          />
          <polyline
            points={stroke(legPoints(bottom))}
            fill="none"
            stroke="#466e62"
            strokeWidth={2}
            strokeDasharray="5 6"
          />
          <polyline
            points={stroke([bottom.heel, bottom.ankle, bottom.toe])}
            fill="none"
            stroke="#74978a"
            strokeWidth={14}
          />
          {centerCircle(bottom.heel, 8, "#74978a", "#466e62")}
          <polyline
            points={stroke([lowerArm.shoulder, lowerArm.elbow, lowerArm.hand])}
            fill="none"
            stroke="#b59680"
            strokeWidth={15}
          />
          <polyline
            points={stroke([lowerArm.shoulder, lowerArm.elbow, lowerArm.hand])}
            fill="none"
            stroke="#806855"
            strokeWidth={1.5}
            strokeDasharray="4 5"
          />
          {centerCircle(bottom.hip, 28, "#a6bba8", "#4b7566")}
          {centerCircle(lowerArm.shoulder, 28, "#a6bba8", "#4b7566")}
        </g>
        {torsoFaces.map((face, index) => (
          <polygon
            key={index}
            data-torso-face={index}
            points={stroke(face)}
            fill={index % 2 ? "#a6bba8" : "#bed0b9"}
            stroke="#5b7e6c"
            strokeWidth={1.2}
          />
        ))}
        <polyline
          points={stroke([pose.world.pelvisCenter, pose.world.chestCenter])}
          fill="none"
          stroke="#5a7a65"
          strokeWidth={2}
          strokeDasharray="3 5"
        />
        {centerCircle(pose.world.headCenter, 24, "#d4a891", "#916a56")}
        <line
          x1={n(s.headCenter[0])}
          y1={n(s.headCenter[1])}
          x2={n(s.nose[0])}
          y2={n(s.nose[1])}
          stroke="#916a56"
          strokeWidth={2}
        />
        {centerCircle(pose.world.nose, 3, "#875641", "#875641")}
        <g data-anatomical-side={activeSide} data-placement="top">
          <polyline
            points={stroke(legPoints(top))}
            fill="none"
            stroke="#c88666"
            strokeWidth={23}
          />
          <polyline
            points={stroke(legPoints(top))}
            fill="none"
            stroke="#875641"
            strokeWidth={2}
          />
          <polyline
            points={stroke([top.heel, top.ankle, top.toe])}
            fill="none"
            stroke="#c88666"
            strokeWidth={14}
          />
          {!isLift && centerCircle(top.knee, 14, "#c88666", "#875641")}
          <polyline
            points={stroke([upperArm.shoulder, upperArm.elbow, upperArm.hand])}
            fill="none"
            stroke="#d4a891"
            strokeWidth={16}
          />
          <polyline
            points={stroke([upperArm.shoulder, upperArm.elbow, upperArm.hand])}
            fill="none"
            stroke="#916a56"
            strokeWidth={1.5}
          />
          {isLift && centerCircle(upperArm.hand, 10, "#d4a891", "#916a56")}
          {[
            top.hip,
            top.knee,
            top.ankle,
            upperArm.shoulder,
            upperArm.elbow,
            upperArm.hand,
          ].map((p, index) => {
            const screen = project(p);
            return (
              <circle
                key={index}
                cx={n(screen[0])}
                cy={n(screen[1])}
                r={4}
                fill="#f7f5ef"
                stroke="#875641"
                strokeWidth={1.5}
              />
            );
          })}
        </g>
        {pose.contacts.map((contact) => {
          const screen = project(contact.point);
          return (
            <circle
              key={contact.id}
              data-contact={contact.id}
              data-contact-state={contact.state}
              data-contact-target={contact.target}
              cx={n(screen[0])}
              cy={n(screen[1])}
              r={3.5}
              fill={contact.state === "fixed" ? "#285b4c" : "#f7f5ef"}
              stroke={contact.state === "fixed" ? "#f7f5ef" : "#b57850"}
              strokeWidth={1.4}
            />
          );
        })}
      </g>
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={24} y={184} fontSize={11}>
          머리 받침
        </text>
        <text x={24} y={199} fontSize={10} fill="#76644f">
          제작 선택
        </text>
        <text x={616} y={81} textAnchor="end" fontSize={11}>
          {isLift ? "편 위쪽 다리만 들림" : "위쪽 어깨·가슴·팔 열림"}
        </text>
        <text x={616} y={97} textAnchor="end" fontSize={10} fill="#586a60">
          {isLift
            ? "아래 다리·골반·머리 지지 고정"
            : "무릎 지지 고정 · 손 바닥 접촉 없음"}
        </text>
        <text x={24} y={337} fontSize={13} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={616} y={337} textAnchor="end" fontSize={11} fill="#586a60">
          각도·시간은 제작 선택 · 운동 시범 아님
        </text>
      </g>
    </svg>
  );
}
