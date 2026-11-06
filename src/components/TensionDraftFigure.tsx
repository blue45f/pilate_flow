/** SPDX-License-Identifier: 0BSD. Original native SVG primitives, not traced media. */
import { useId } from "react";
import {
  getTensionDraftPose,
  projectTensionPoint,
} from "../models/tensionDrafts";
import type { TensionDraftId } from "../models/tensionDrafts";
import type { AnatomicalSide, Point3, ScreenPoint } from "../models/types";
export interface TensionDraftFigureProps {
  draftId: TensionDraftId;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}
const n = (v: number) => Number(v.toFixed(3));
const polyline = (p: readonly ScreenPoint[]) =>
  p.map((v) => v.map(n).join(",")).join(" ");
export function TensionDraftFigure({
  draftId,
  progress,
  activeSide = "right",
  mirrored = false,
  className,
  label,
}: TensionDraftFigureProps) {
  const instance = useId(),
    titleId = `${instance}-title`,
    descId = `${instance}-desc`,
    pose = getTensionDraftPose(draftId, progress, { activeSide, mirrored }),
    { body, arms, legs, equipment, contacts } = pose.world;
  const project = (p: Point3) => projectTensionPoint(p, mirrored),
    points = (p: readonly Point3[]) => polyline(p.map(project)),
    reformer = equipment.kind === "reformer",
    title = reformer
      ? "리포머 수파인 스트랩 암 프레스"
      : "캐딜락 수파인 암 스프링 프레스";
  const line = (
    p: readonly Point3[],
    color: string,
    width: number,
    dash?: string,
  ) => (
    <polyline
      points={points(p)}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );
  const limb = (side: AnatomicalSide, part: "arm" | "leg") => {
    const color = side === "left" ? "#376d62" : "#a45b43",
      fill = side === "left" ? "#8bac9e" : "#d49a79",
      dash = side === "right" ? "5 5" : undefined,
      a = arms[side],
      leg = legs[side],
      bone =
        part === "arm"
          ? [a.shoulder, a.elbow, a.hand]
          : [leg.hip, leg.knee, leg.ankle];
    return (
      <g
        key={`${side}-${part}`}
        data-anatomical-side={side}
        data-limb-part={part}
        data-limb-role="bilateral"
        stroke={color}
        fill="none"
      >
        {line(bone, fill, part === "arm" ? 12 : 19)}
        {line(bone, color, 2.3, dash)}
        {part === "leg" && (
          <>
            {line([leg.heel, leg.ankle, leg.toe], fill, 9)}
            {line([leg.heel, leg.toe], color, 2, dash)}
          </>
        )}
        {bone.map((p, i) => {
          const s = project(p);
          return (
            <circle
              key={i}
              cx={n(s[0])}
              cy={n(s[1])}
              r={i === 1 ? 4 : 3}
              fill="#fcfaf5"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
    );
  };
  const rigging = (side: AnatomicalSide) => {
    if (equipment.kind === "reformer") {
      const r = equipment.lines[side],
        p = project(r.pulley),
        a = project(r.carriageAnchor);
      return (
        <g
          data-rigging-side={side}
          data-rigging="rope"
          data-geometric-length={r.geometricLength}
        >
          {r.segments.map((segment, i) => (
            <g key={i}>{line(segment, "#8a6e45", 2.5)}</g>
          ))}
          <circle
            cx={n(p[0])}
            cy={n(p[1])}
            r={6}
            fill="#f7f5ef"
            stroke="#586e64"
            strokeWidth={2}
          />
          <circle cx={n(p[0])} cy={n(p[1])} r={1.5} fill="#586e64" />
          {line(
            [
              [
                r.carriageAnchor[0],
                side === "left" ? 58 : -58,
                equipment.carriage.origin[2],
              ],
              r.carriageAnchor,
            ],
            "#586e64",
            3,
          )}
          <circle cx={n(a[0])} cy={n(a[1])} r={3} fill="#586e64" />
        </g>
      );
    }
    const spring = equipment.lines[side],
      a = project(spring.anchor);
    return (
      <g
        data-rigging-side={side}
        data-rigging="visual-spring"
        data-visual-spring-length={spring.visualLength}
      >
        {line(spring.coil, "#8a6e45", 2)}
        <circle
          cx={n(a[0])}
          cy={n(a[1])}
          r={4}
          fill="#f7f5ef"
          stroke="#586e64"
          strokeWidth={2}
        />
      </g>
    );
  };
  const head = project(body.headCenter),
    hip = body.pelvisCenter,
    shoulder = body.shoulderCenter;
  const torso: readonly Point3[] = [
    [shoulder[0] - 18, -30, shoulder[2]],
    [hip[0] + 12, -24, hip[2]],
    [hip[0] + 12, 24, hip[2]],
    [shoulder[0] - 18, 30, shoulder[2]],
  ];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 640 360"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-motion-draft-id={draftId}
      data-progress={pose.progress}
      data-active-side={activeSide}
      data-view-mirrored={mirrored}
      data-side-mode="bilateral"
    >
      <title id={titleId}>
        {label ?? `${title} · 원본 제작 초안 · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descId}>
        전문가 검토 0인 원본 절차 도해입니다. 양팔이 함께 움직입니다. 실선은
        몸의 왼쪽, 점선은 몸의 오른쪽이며 화면 반전은 해부학적 쪽을 바꾸지
        않습니다.
        {reformer
          ? "발목 사이에 볼을 둔 테이블탑 원문 변형이며 기존 발 지지·도구 없음 계획과 다른 제안입니다. 볼 종류·크기·압력은 확인하지 않았습니다. 양손 핸들, 고정 점 풀리, 캐리지 부착점을 잇는 길이 고정 제약은 제작 선택이며 측정된 로프나 캐리지 궤적이 아닙니다. 머리·등·골반 지지는 캐리지와 함께 이동합니다."
          : "고정 캐딜락 테이블 위에 무릎을 굽혀 발을 지지한 준비 변형입니다. 고정 앵커와 양손 핸들 사이 스프링의 시각적 길이만 변합니다. 준비 동작의 팔꿈치 굽힘을 유지한 전체 손 궤적은 제작 선택이며 헌드레드나 머리 들기 동작을 합치지 않았습니다."}
        관절·장비 치수·각도·지지 세부·시간은 단위 없는 제작 선택입니다.
        힘·저항·설정·제조사 규격·안전 조건은 모델링하지 않았습니다. 정확한 운동
        자산이나 자동 대체용이 아닙니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui,sans-serif" fill="#254d45">
        <text x={24} y={28} fontSize={18} fontWeight={700}>
          {title}
        </text>
        <text x={24} y={50} fontSize={13} fill="#875641">
          원본 제작 초안 · 전문가 검토 0 · 양쪽 함께
        </text>
        <text x={616} y={50} textAnchor="end" fontSize={11}>
          {mirrored ? "화면 반전 · 해부학적 쪽 유지" : "고정 사선 시점"}
        </text>
        <text x={24} y={73} fontSize={12}>
          실선: 몸의 왼쪽 · 점선: 몸의 오른쪽
        </text>
        <text x={24} y={99} fontSize={12}>
          {reformer
            ? "머리·등·골반: 캐리지와 함께 이동"
            : "머리·등·골반·발: 테이블 지지 고정"}
        </text>
        <text x={616} y={99} textAnchor="end" fontSize={12}>
          {reformer ? "볼: 종류·크기 미확인" : "스프링: 시각적 길이만 표시"}
        </text>
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        {equipment.kind === "reformer" ? (
          <g data-equipment="reformer">
            <polygon
              points={points(equipment.frame)}
              fill="#bda17b"
              stroke="#806f59"
              strokeWidth={2}
            />
            {equipment.rails.map((rail, i) => (
              <g key={i}>{line(rail, "#657d73", 4)}</g>
            ))}
            {(["right", "left"] as const).map((side) => (
              <g key={side}>
                {line(
                  [
                    [55, side === "left" ? 62 : -62, 34],
                    equipment.pulleys[side],
                  ],
                  "#657d73",
                  4,
                )}
              </g>
            ))}
            <g
              data-carriage="moving"
              data-carriage-displacement={equipment.carriage.displacement}
            >
              <polygon
                points={points(equipment.carriage.deck)}
                fill="#82988e"
                stroke="#355f54"
                strokeWidth={3}
              />
              <polygon
                points={points(equipment.carriage.headrest)}
                fill="#b5c2b7"
                stroke="#586e64"
                strokeWidth={2}
              />
            </g>
          </g>
        ) : (
          <g data-equipment="cadillac">
            {equipment.frame.uprights.map((post, i) => (
              <g key={i}>{line(post, "#81958b", 4)}</g>
            ))}
            {line(
              [...equipment.frame.top, equipment.frame.top[0]],
              "#81958b",
              4,
            )}
            {equipment.table.corners.map((p, i) => (
              <g key={i}>{line([[p[0], p[1], 0], p], "#a98d6e", 7)}</g>
            ))}
            <polygon
              points={points(equipment.table.corners)}
              fill="#82988e"
              stroke="#355f54"
              strokeWidth={3}
              data-table="fixed"
            />
          </g>
        )}
        {rigging("right")}
        {limb("right", "leg")}
        {limb("right", "arm")}
        {line([body.headCenter, body.neck, body.shoulderCenter], "#c49c83", 12)}
        <polygon
          points={points(torso)}
          fill="#a6bba8"
          stroke="#4b7566"
          strokeWidth={2}
        />
        <ellipse
          cx={n(head[0])}
          cy={n(head[1])}
          rx={22}
          ry={16.28}
          fill="#d4ad94"
          stroke="#916a56"
          strokeWidth={2}
        />
        {equipment.kind === "reformer" &&
          (() => {
            const b = project(equipment.ball.center);
            return (
              <g
                data-ball-kind="generic-unspecified-ball"
                data-ball-source-size-verified="false"
              >
                <ellipse
                  cx={n(b[0])}
                  cy={n(b[1])}
                  rx={14}
                  ry={11}
                  fill="#d8b66b"
                  stroke="#8d7441"
                  strokeWidth={2}
                />
                <path
                  d={`M ${n(b[0] - 9)} ${n(b[1] - 5)} Q ${n(b[0])} ${n(b[1])} ${n(b[0] + 9)} ${n(b[1] - 5)}`}
                  fill="none"
                  stroke="#a3884a"
                  strokeWidth={1.2}
                />
              </g>
            );
          })()}
        {limb("left", "leg")}
        {rigging("left")}
        {limb("left", "arm")}
        {contacts.map((contact) => {
          const p = project(contact.point);
          return (
            <circle
              key={contact.id}
              cx={n(p[0])}
              cy={n(p[1])}
              r={contact.target === "handle-grip" ? 5 : 3.5}
              fill={contact.target === "ankle-ball" ? "#8d7441" : "#254d45"}
              stroke="#fcfaf5"
              strokeWidth={1.5}
              data-contact-id={contact.id}
              data-contact-target={contact.target}
              data-contact-frame={contact.frame}
            />
          );
        })}
      </g>
      <g fontFamily="system-ui,sans-serif" fill="#254d45">
        <text x={24} y={340} fontSize={12} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={616} y={340} textAnchor="end" fontSize={11}>
          힘·저항·설정 미모델링 · 수치·시간은 제작 선택
        </text>
        <text x={24} y={319} fontSize={11}>
          {reformer
            ? "기존 발 지지·도구 없음 계획과 다른 볼 변형"
            : "무릎 굽힘 · 발 지지 · 전체 팔 경로는 제작 선택"}
        </text>
      </g>
    </svg>
  );
}
