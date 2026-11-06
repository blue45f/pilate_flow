import { useId } from "react";
import {
  getQuadrupedDraftPose,
  projectQuadrupedPoint,
} from "../models/quadrupedDrafts";
import type {
  QuadrupedDraftId,
  QuadrupedSide,
} from "../models/quadrupedDrafts";
import type { Point3 } from "../models/types";

export interface QuadrupedDraftFigureProps {
  draftId: QuadrupedDraftId;
  progress: number;
  activeSide?: QuadrupedSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}
const n = (value: number) => Math.round(value * 1000) / 1000;
const sideKo = (side: QuadrupedSide) => (side === "left" ? "왼쪽" : "오른쪽");

/** Deterministic native SVG. Playback clocks and controls belong to the parent. */
export function QuadrupedDraftFigure({
  draftId,
  progress,
  activeSide = "right",
  mirrored = false,
  className,
  label,
}: QuadrupedDraftFigureProps) {
  const unique = useId();
  const titleId = `${unique}-title`;
  const descriptionId = `${unique}-description`;
  const pose = getQuadrupedDraftPose(draftId, progress, {
    activeSide,
    mirrored,
  });
  const isArm = pose.activeLimb === "arm";
  const title = isArm ? "네발기기 한 팔 슬라이드" : "네발기기 한 다리 슬라이드";
  const project = (p: Point3) => projectQuadrupedPoint(p, mirrored);
  const poly = (p: readonly Point3[]) =>
    p
      .map(project)
      .map((point) => `${n(point[0])},${n(point[1])}`)
      .join(" ");
  const joint = (
    point: Point3,
    radius: number,
    fill: string,
    stroke: string,
  ) => {
    const p = project(point);
    return (
      <circle
        cx={n(p[0])}
        cy={n(p[1])}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    );
  };
  const limb = (side: QuadrupedSide) => {
    const l = pose.limbs[side];
    const active = side === activeSide;
    const color = active ? "#c88666" : "#78998b";
    const outline = active ? "#875641" : "#466e62";
    const dash = side === "right" ? "5 5" : undefined;
    return (
      <g key={side} data-anatomical-side={side} data-limb-active={active}>
        <polyline
          points={poly([l.hip, l.knee, l.ankle])}
          fill="none"
          stroke={color}
          strokeWidth={20}
        />
        <polyline
          points={poly([l.hip, l.knee, l.ankle])}
          fill="none"
          stroke={outline}
          strokeWidth={2}
          strokeDasharray={dash}
        />
        {joint(l.knee, 12, color, outline)}
        <polyline
          points={poly([l.ankle, l.heel, l.toe])}
          fill="none"
          stroke={color}
          strokeWidth={8}
        />
        {joint(l.toe, 4, color, outline)}
        <polyline
          points={poly([l.shoulder, l.elbow, l.hand])}
          fill="none"
          stroke={color}
          strokeWidth={14}
        />
        <polyline
          points={poly([l.shoulder, l.elbow, l.hand])}
          fill="none"
          stroke={outline}
          strokeWidth={2}
          strokeDasharray={dash}
        />
        {joint(l.hand, 8, "#d4a891", outline)}
        {[l.shoulder, l.elbow, l.hip, l.knee, l.ankle].map((p, index) => {
          const screen = project(p);
          return (
            <circle
              key={index}
              cx={n(screen[0])}
              cy={n(screen[1])}
              r={3.5}
              fill="#f7f5ef"
              stroke={outline}
              strokeWidth={1.4}
            />
          );
        })}
      </g>
    );
  };
  const rest = getQuadrupedDraftPose(draftId, 0, { activeSide, mirrored })
    .limbs[activeSide];
  const knee = pose.contacts.find(
    (contact) =>
      contact.anatomicalSide === activeSide && contact.patch === "knee",
  )!;
  const kneePoint = project(knee.point);
  const kneeMat = project(knee.targetPoint);
  const torso = pose.torso;
  const face = (indices: readonly number[]) =>
    indices.map((index) => torso[index]);
  const head = pose.screen.headCenter;
  const nose = pose.screen.nose;
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
          `${title} 제작 초안 · ${sideKo(activeSide)} ${isArm ? "팔" : "다리"} · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descriptionId}>
        네발기기 팔·다리 리치라는 같은 기존 동작과 비교할 두 변형 중 하나인
        전문가 미검토 저작 도해입니다.
        {isArm
          ? "조금 굽힌 팔꿈치에서 한 손바닥 접점이 매트를 따라 앞으로 움직이고 다른 손과 양 무릎은 고정됩니다."
          : "한 발가락 접점이 매트를 따라 뒤로 움직이며 같은 쪽 무릎 지지는 해제됩니다. 양손과 반대 무릎은 고정됩니다."}
        정확한 접촉 부위와 나머지 지지점·몸통의 완전 고정은 출처의 관찰값이 아닌
        제작 선택입니다. 해부학적 {sideKo(activeSide)}이 움직이며 화면 반전은
        몸의 쪽을 바꾸지 않습니다. 뼈 길이를 유지하는 단순 기하이며
        동역학·힘·균형·안전성 검증과 승인된 동작 매핑은 아닙니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={24} y={28} fontSize={18} fontWeight={700}>
          {title}
        </text>
        <text x={24} y={49} fontSize={12} fill="#875641">
          같은 동작의 변형 제안 · 전문가 미검토
        </text>
        <text x={616} y={28} textAnchor="end" fontSize={12}>
          {sideKo(activeSide)} {isArm ? "팔" : "다리"} 이동
        </text>
        <text x={616} y={49} textAnchor="end" fontSize={11} fill="#586a60">
          {mirrored
            ? "화면 반전 켬 · 몸의 쪽 유지"
            : "몸의 왼쪽 실선 · 오른쪽 점선"}
        </text>
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        <polygon
          data-support="mat"
          points={poly(pose.support.corners)}
          fill="#dbe4d9"
          stroke="#b4c7b7"
          strokeWidth={2}
        />
        {pose.amount > 0 && (
          <polyline
            points={poly(
              isArm
                ? [rest.shoulder, rest.elbow, rest.hand]
                : [rest.hip, rest.knee, rest.ankle, rest.toe],
            )}
            fill="none"
            stroke="#8d8d7b"
            strokeWidth={3}
            strokeDasharray="4 6"
            opacity={0.45}
          />
        )}
        {limb("left")}
        <polygon
          points={poly(face([0, 1, 2, 3]))}
          fill="#9eb7a2"
          stroke="#4b7566"
          strokeWidth={1.5}
        />
        <polygon
          points={poly(face([1, 5, 6, 2]))}
          fill="#c2d3bc"
          stroke="#4b7566"
          strokeWidth={1.5}
        />
        <polygon
          points={poly(face([4, 5, 6, 7]))}
          fill="#aec4ac"
          stroke="#4b7566"
          strokeWidth={1.5}
        />
        <polyline
          points={poly([
            pose.world.neck,
            pose.world.shoulderCenter,
            pose.world.pelvisCenter,
          ])}
          fill="none"
          stroke="#4b7566"
          strokeWidth={2}
          strokeDasharray="3 5"
        />
        <polyline
          points={poly([pose.world.headCenter, pose.world.neck])}
          fill="none"
          stroke="#d4a891"
          strokeWidth={16}
        />
        <circle
          cx={n(head[0])}
          cy={n(head[1])}
          r={18}
          fill="#d4a891"
          stroke="#916a56"
          strokeWidth={2}
        />
        <line
          x1={n(head[0] - (mirrored ? -10 : 10))}
          y1={n(head[1] + 4)}
          x2={n(nose[0])}
          y2={n(nose[1])}
          stroke="#916a56"
          strokeWidth={2}
        />
        {limb("right")}
        {knee.state === "released" && (
          <g data-knee-support="released">
            <line
              x1={n(kneePoint[0])}
              y1={n(kneePoint[1])}
              x2={n(kneeMat[0])}
              y2={n(kneeMat[1])}
              stroke="#a16b49"
              strokeWidth={1.3}
              strokeDasharray="3 4"
            />
            <circle
              cx={n(kneeMat[0])}
              cy={n(kneeMat[1])}
              r={5}
              fill="none"
              stroke="#a16b49"
              strokeWidth={1.3}
            />
          </g>
        )}
        {pose.contacts.map((contact) => {
          const screen = project(contact.point);
          return (
            <circle
              key={contact.id}
              data-contact={contact.id}
              data-contact-state={contact.state}
              data-contact-evidence={contact.evidence}
              cx={n(screen[0])}
              cy={n(screen[1])}
              r={3.5}
              fill={
                contact.state === "released"
                  ? "#f7f5ef"
                  : contact.state === "sliding"
                    ? "#b77850"
                    : "#285b4c"
              }
              stroke={contact.state === "released" ? "#b77850" : "#f7f5ef"}
              strokeWidth={1.4}
            />
          );
        })}
      </g>
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={616} y={82} textAnchor="end" fontSize={12}>
          {isArm
            ? "선택한 손바닥 접점: 매트 슬라이드"
            : "선택한 발가락 접점: 매트 슬라이드"}
        </text>
        <text x={616} y={100} textAnchor="end" fontSize={11} fill="#586a60">
          {isArm
            ? "다른 손·양 무릎 고정: 제작 선택"
            : `움직이는 쪽 무릎: ${knee.state === "released" ? "매트 지지 해제" : "매트 지지"}`}
        </text>
        <text x={24} y={348} fontSize={12} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={616} y={348} textAnchor="end" fontSize={10} fill="#586a60">
          접점·고정·범위·시간은 제작 선택
        </text>
      </g>
    </svg>
  );
}
