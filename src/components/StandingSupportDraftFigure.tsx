import { useId } from "react";
import {
  getStandingSupportDraftPose,
  projectStandingSupportPoint,
} from "../models/standingSupportDrafts";
import type {
  StandingSupportDraftId,
  StandingSupportSide,
} from "../models/standingSupportDrafts";
import type { Point3 } from "../models/types";

export interface StandingSupportDraftFigureProps {
  draftId: StandingSupportDraftId;
  progress: number;
  activeSide?: StandingSupportSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}
const n = (v: number) => Math.round(v * 1000) / 1000;
const sideKo = (s: StandingSupportSide) => (s === "left" ? "왼쪽" : "오른쪽");

/** Original SVG primitives only; pure sampled frame, no playback clock. */
export function StandingSupportDraftFigure({
  draftId,
  progress,
  activeSide = "right",
  mirrored = false,
  className,
  label,
}: StandingSupportDraftFigureProps) {
  const unique = useId();
  const titleId = `${unique}-title`;
  const descriptionId = `${unique}-description`;
  const pose = getStandingSupportDraftPose(draftId, progress, {
    activeSide,
    mirrored,
  });
  const posterior = pose.path === "posterior";
  const title = posterior ? "래더 지지 뒤 슬라이드" : "래더 지지 옆 슬라이드";
  const project = (p: Point3) => projectStandingSupportPoint(p, mirrored);
  const poly = (p: readonly Point3[]) =>
    p
      .map(project)
      .map((s) => `${n(s[0])},${n(s[1])}`)
      .join(" ");
  const circle = (
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
        strokeWidth={1.4}
      />
    );
  };
  const limb = (side: StandingSupportSide) => {
    const leg = pose.legs[side];
    const arm = pose.arms[side];
    const color = side === activeSide ? "#c88666" : "#78998b";
    const outline = side === activeSide ? "#875641" : "#466e62";
    const dash = side === "right" ? "5 5" : undefined;
    return (
      <g
        key={side}
        data-anatomical-side={side}
        data-leg-active={side === activeSide}
      >
        <polyline
          points={poly([leg.hip, leg.knee, leg.ankle])}
          fill="none"
          stroke={color}
          strokeWidth={17}
        />
        <polyline
          points={poly([leg.hip, leg.knee, leg.ankle])}
          fill="none"
          stroke={outline}
          strokeWidth={1.8}
          strokeDasharray={dash}
        />
        <polyline
          points={poly([leg.heel, leg.ankle, leg.toe])}
          fill="none"
          stroke={color}
          strokeWidth={8}
        />
        {circle(leg.heel, 8, color, outline)}
        {circle(leg.toe, 4, color, outline)}
        <polyline
          points={poly([arm.shoulder, arm.elbow, arm.hand])}
          fill="none"
          stroke="#d4a891"
          strokeWidth={12}
        />
        <polyline
          points={poly([arm.shoulder, arm.elbow, arm.hand])}
          fill="none"
          stroke="#916a56"
          strokeWidth={1.6}
          strokeDasharray={dash}
        />
        {circle(arm.hand, 4, "#d4a891", "#916a56")}
        {[leg.hip, leg.knee, leg.ankle, arm.shoulder, arm.elbow].map(
          (point, index) => {
            const p = project(point);
            return (
              <circle
                key={index}
                cx={n(p[0])}
                cy={n(p[1])}
                r={3}
                fill="#f7f5ef"
                stroke={outline}
                strokeWidth={1.3}
              />
            );
          },
        )}
      </g>
    );
  };
  const app = pose.apparatus;
  const t = pose.torso;
  const face = (indices: readonly number[]) => indices.map((index) => t[index]);
  const startToe = getStandingSupportDraftPose(draftId, 0, { activeSide }).legs[
    activeSide
  ].toe;
  const toe = pose.legs[activeSide].toe;
  const head = pose.screen.headCenter;
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
          `${title} 제작 초안 · ${sideKo(activeSide)} 다리 · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descriptionId}>
        전문가 미검토 원본 래더 바렐 구조와 서 있는 사람 도해입니다. 일반 고정
        지지를 잡는 NHS 동작을 래더 가로봉 지지로 바꾼 저작 변형이며 정확한 출처
        변형과의 일치는 미확인입니다.
        {posterior
          ? "움직이는 발은 몸 뒤쪽으로 미끄러집니다."
          : "움직이는 발은 해당 해부학적 쪽의 바깥 방향으로 미끄러집니다."}
        선택한 발끝과 뒤꿈치 접점은 바닥에 유지되고 반대발과 양손의 래더 접점은
        고정됩니다. 바렐 곡면에 몸이 닿지 않습니다. 고정 몸통·골반, 작은 무릎
        굽힘, 손·발 접점과 관절 경로는 뼈 길이를 유지하기 위한 제작 선택입니다.
        해부학적 {sideKo(activeSide)}이 움직이며 화면 반전은 몸의 쪽을 바꾸지
        않습니다. 치수·강도·세팅·힘·승하차·개인 안전성은 검증하거나 보장하지
        않습니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={24} y={28} fontSize={19} fontWeight={700}>
          {title}
        </text>
        <text x={24} y={50} fontSize={11} fill="#875641">
          일반 지지 동작을 래더로 바꾼 저작 변형 · 전문가 미검토
        </text>
        <text x={616} y={28} textAnchor="end" fontSize={12}>
          {sideKo(activeSide)} 다리 이동
        </text>
        <text x={616} y={49} textAnchor="end" fontSize={11} fill="#586a60">
          {mirrored
            ? "화면 반전 켬 · 몸의 쪽 유지"
            : "몸의 왼쪽 실선 · 오른쪽 점선"}
        </text>
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        <polygon
          data-support="floor"
          points={poly(pose.floor.corners)}
          fill="#e3e9df"
          stroke="#c5d2c2"
          strokeWidth={1.5}
        />
        <g
          data-apparatus-kind={app.kind}
          data-barrel-body-contact="false"
          data-apparatus-strength-assessed="false"
        >
          <polygon
            points={poly(app.baseFloorPoints)}
            fill="#bda47e"
            stroke="#826d52"
            strokeWidth={1.4}
          />
          <polygon
            points={poly(app.baseCorners)}
            fill="#dbc49e"
            stroke="#99815d"
            strokeWidth={1.5}
          />
          <polygon
            points={poly([
              app.baseCorners[2],
              app.baseCorners[3],
              app.baseFloorPoints[3],
              app.baseFloorPoints[2],
            ])}
            fill="#bda47e"
            stroke="#99815d"
            strokeWidth={1.3}
          />
          {app.rails.map((rail, index) => (
            <polyline
              key={index}
              points={poly(rail)}
              fill="none"
              stroke="#8e7759"
              strokeWidth={6}
            />
          ))}
          {app.barrelSupports.map((support, index) => (
            <polyline
              key={index}
              points={poly(support)}
              fill="none"
              stroke="#a78a62"
              strokeWidth={7}
            />
          ))}
          <polygon
            points={poly([...app.barrelBackArc, ...app.barrelBackBottom])}
            fill="#c3aa82"
            stroke="#8d7758"
            strokeWidth={2}
          />
          {app.barrelBackArc.slice(0, -1).map((point, index) => (
            <polygon
              key={index}
              points={poly([
                point,
                app.barrelBackArc[index + 1],
                app.barrelFrontArc[index + 1],
                app.barrelFrontArc[index],
              ])}
              fill={index % 2 ? "#697d70" : "#748779"}
              stroke="#52695b"
              strokeWidth={0.4}
            />
          ))}
          <polygon
            points={poly([...app.barrelFrontArc, ...app.barrelFrontBottom])}
            fill="#cfb58d"
            stroke="#8d7758"
            strokeWidth={2}
          />
          <polyline
            points={poly(app.barrelFrontArc)}
            fill="none"
            stroke="#52695b"
            strokeWidth={5}
          />
          {app.uprights.map((upright, index) => (
            <polyline
              key={index}
              points={poly(upright)}
              fill="none"
              stroke="#ac8b60"
              strokeWidth={10}
            />
          ))}
          {app.rungs.map((rung) => (
            <polyline
              key={rung.id}
              data-apparatus-rung={rung.id}
              data-rung-selected={rung.selected}
              points={poly([rung.start, rung.end])}
              fill="none"
              stroke={rung.selected ? "#755b3a" : "#b69a70"}
              strokeWidth={8}
            />
          ))}
        </g>
        {pose.amount > 0 && (
          <polyline
            data-active-floor-path={pose.path}
            points={poly([
              [startToe[0], startToe[1], 0],
              [toe[0], toe[1], 0],
            ])}
            fill="none"
            stroke="#aa7451"
            strokeWidth={3}
            strokeDasharray="3 4"
          />
        )}
        {limb("left")}
        <polygon
          points={poly(face([0, 1, 2, 3]))}
          fill="#b4c9ae"
          stroke="#4b7566"
          strokeWidth={1.4}
        />
        <polygon
          points={poly(face([4, 5, 6, 7]))}
          fill="#a3bfa1"
          stroke="#4b7566"
          strokeWidth={1.4}
        />
        <polygon
          points={poly(face([1, 5, 6, 2]))}
          fill="#c4d5bd"
          stroke="#4b7566"
          strokeWidth={1.3}
        />
        <polyline
          points={poly([
            pose.world.pelvisCenter,
            pose.world.chestCenter,
            pose.world.neck,
          ])}
          fill="none"
          stroke="#4b7566"
          strokeWidth={2}
          strokeDasharray="3 5"
        />
        <polyline
          points={poly([pose.world.neck, pose.world.headCenter])}
          fill="none"
          stroke="#d4a891"
          strokeWidth={12}
        />
        <circle
          cx={n(head[0])}
          cy={n(head[1])}
          r={18}
          fill="#d4a891"
          stroke="#916a56"
          strokeWidth={1.8}
        />
        <polyline
          points={poly([pose.world.headCenter, pose.world.nose])}
          fill="none"
          stroke="#916a56"
          strokeWidth={2}
        />
        {limb("right")}
        {pose.contacts.map((contact) => {
          const p = project(contact.point);
          return (
            <circle
              key={contact.id}
              data-contact={contact.id}
              data-contact-target={contact.target}
              data-contact-state={contact.state}
              data-contact-evidence={contact.evidence}
              cx={n(p[0])}
              cy={n(p[1])}
              r={3.2}
              fill={contact.state === "sliding" ? "#b77850" : "#285b4c"}
              stroke="#f7f5ef"
              strokeWidth={1.3}
            />
          );
        })}
      </g>
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={24} y={80} fontSize={11}>
          양손: 선택한 래더 가로봉 접점
        </text>
        <text x={24} y={97} fontSize={11} fill="#586a60">
          바렐 곡면: 몸 접촉 없음
        </text>
        <text x={616} y={348} textAnchor="end" fontSize={10} fill="#586a60">
          접점·고정·범위·시간·기구 치수는 제작 선택
        </text>
        <text x={24} y={348} fontSize={12} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
      </g>
    </svg>
  );
}
