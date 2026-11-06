/** SPDX-License-Identifier: 0BSD. Original native SVG; no imported source media. */
import { useId } from "react";
import {
  getApparatusDraftPose,
  projectApparatusPoint,
} from "../models/apparatusDrafts";
import type { ApparatusDraftId } from "../models/apparatusDrafts";
import type { AnatomicalSide, Point3, ScreenPoint } from "../models/types";
export interface ApparatusDraftFigureProps {
  draftId: ApparatusDraftId;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}
const round = (n: number) => Number(n.toFixed(3));
const polyline = (p: readonly ScreenPoint[]) =>
  p.map((v) => v.map(round).join(",")).join(" ");
export function ApparatusDraftFigure({
  draftId,
  progress,
  activeSide = "right",
  mirrored = false,
  className,
  label,
}: ApparatusDraftFigureProps) {
  const instance = useId(),
    titleId = `${instance}-title`,
    descId = `${instance}-desc`;
  const pose = getApparatusDraftPose(draftId, progress, {
      activeSide,
      mirrored,
    }),
    { body, legs, equipment, contacts } = pose.world;
  const project = (p: Point3) => projectApparatusPoint(p, mirrored),
    points = (p: readonly Point3[]) => polyline(p.map(project));
  const reformer = equipment.kind === "reformer",
    title = reformer
      ? "리포머 평행 뒤꿈치 풋워크"
      : "필라테스 체어 앉은 페달 프레스";
  const line = (
    p: readonly Point3[],
    stroke: string,
    width: number,
    dash?: string,
  ) => (
    <polyline
      points={points(p)}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );
  const arm = (side: AnatomicalSide) =>
    line(
      side === "left"
        ? [body.leftShoulder, body.leftElbow, body.leftHand]
        : [body.rightShoulder, body.rightElbow, body.rightHand],
      "#c49c83",
      10,
    );
  const leg = (side: AnatomicalSide) => {
    const limb = legs[side],
      color = side === "left" ? "#376d62" : "#a45b43",
      fill = side === "left" ? "#8bac9e" : "#d49a79",
      dash = side === "right" ? "5 5" : undefined;
    return (
      <g
        key={side}
        data-anatomical-side={side}
        data-limb-role="bilateral"
        stroke={color}
        fill="none"
      >
        {line([limb.hip, limb.knee, limb.ankle], fill, 19)}
        {line([limb.hip, limb.knee, limb.ankle], color, 2.5, dash)}
        {line([limb.heel, limb.ankle, limb.toe], fill, 10)}
        {line([limb.heel, limb.toe], color, 2.5, dash)}
        {[limb.hip, limb.knee, limb.ankle].map((point, i) => {
          const [x, y] = project(point);
          return (
            <circle
              key={i}
              cx={round(x)}
              cy={round(y)}
              r={i === 1 ? 4.5 : 3}
              fill="#fcfaf5"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
    );
  };
  const torso: readonly Point3[] = reformer
    ? [
        [body.shoulderCenter[0] - 20, -28, body.shoulderCenter[2]],
        [body.pelvisCenter[0] + 12, -24, body.pelvisCenter[2]],
        [body.pelvisCenter[0] + 12, 24, body.pelvisCenter[2]],
        [body.shoulderCenter[0] - 20, 28, body.shoulderCenter[2]],
      ]
    : [
        [body.shoulderCenter[0] - 17, -22, body.shoulderCenter[2] + 5],
        [body.shoulderCenter[0] + 17, -22, body.shoulderCenter[2] + 5],
        [body.pelvisCenter[0] + 15, 22, body.pelvisCenter[2]],
        [body.pelvisCenter[0] - 19, 22, body.pelvisCenter[2]],
      ];
  const head = project(body.headCenter);
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
        전문가 미검토 원본 절차 도해입니다. 양쪽 다리가 함께 움직입니다. 실선은
        몸의 왼쪽, 점선은 몸의 오른쪽이며 화면 반전은 해부학적 쪽을 바꾸지
        않습니다.
        {reformer
          ? "양 뒤꿈치는 고정 풋바에 접촉합니다. 머리·등·골반 지지는 캐리지와 함께 이동합니다."
          : "일반 의자가 아닌 필라테스 체어입니다. 양 뒤꿈치는 고정 힌지 주위로 회전하는 한 장의 페달에 접촉하고 양 좌골은 좌면 지지를 유지합니다."}
        머리·팔·장비 치수·각도·시간·세부 지지는 제작 선택입니다. 스프링
        힘·설정·제조사별 구조와 안전 조건은 모델링하지 않습니다. 정확한 운동
        자산·안전성 승인·자동 대체용이 아닙니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui,sans-serif" fill="#254d45">
        <text x={24} y={28} fontSize={19} fontWeight={700}>
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
        <text x={616} y={73} textAnchor="end" fontSize={12}>
          {reformer ? "뒤꿈치 → 풋바 고정 접촉" : "뒤꿈치 → 회전 페달 접촉"}
        </text>
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        {line(
          [
            [48, -70, 0],
            [567, -70, 0],
            [567, 70, 0],
            [48, 70, 0],
            [48, -70, 0],
          ],
          "#d5d9cb",
          2,
        )}
        {equipment.kind === "reformer" ? (
          <g data-apparatus="reformer">
            <polygon
              points={points(equipment.frameCorners)}
              fill="#ba9f7a"
              stroke="#806f59"
              strokeWidth={2}
            />
            {equipment.railEnds.map((rail, i) => (
              <g key={i}>{line(rail, "#677e7a", 5)}</g>
            ))}
            {equipment.footbar.struts.map((strut, i) => (
              <g key={i}>{line(strut, "#5a716d", 7)}</g>
            ))}
            <g
              data-carriage="moving"
              data-carriage-displacement={round(
                equipment.carriage.displacement,
              )}
            >
              <polygon
                points={points(equipment.carriage.deck)}
                fill="#768e87"
                stroke="#355f54"
                strokeWidth={3}
              />
              <polygon
                points={points(equipment.carriage.headrest)}
                fill="#aebbb1"
                stroke="#516c60"
                strokeWidth={2}
              />
              {equipment.carriage.shoulderBlocks.map((block, i) => (
                <polygon
                  key={i}
                  points={points(block)}
                  fill="#4b6a60"
                  stroke="#355f54"
                  strokeWidth={2}
                />
              ))}
            </g>
            {line(equipment.footbar.railEnds, "#325d51", 8)}
          </g>
        ) : (
          <g data-apparatus="pilates-chair" data-ordinary-chair="false">
            <polygon
              points={points([
                equipment.frameCorners[0],
                equipment.frameCorners[1],
                equipment.seat.corners[1],
                equipment.seat.corners[0],
              ])}
              fill="#bf9f77"
              stroke="#806f59"
              strokeWidth={2}
            />
            <polygon
              points={points([
                equipment.frameCorners[1],
                equipment.frameCorners[2],
                equipment.seat.corners[2],
                equipment.seat.corners[1],
              ])}
              fill="#aa8963"
              stroke="#806f59"
              strokeWidth={2}
            />
            <polygon
              points={points(equipment.seat.corners)}
              fill="#6e8c81"
              stroke="#355f54"
              strokeWidth={3}
              data-chair-seat="fixed"
            />
            <polygon
              points={points(equipment.pedal.corners)}
              fill="#b4c4b9"
              stroke="#355f54"
              strokeWidth={3}
              data-chair-pedal="hinged"
              data-pedal-angle={equipment.pedal.angle}
            />
            {line(
              [
                [equipment.pedal.hinge[0], -54, equipment.pedal.hinge[2]],
                [equipment.pedal.hinge[0], 54, equipment.pedal.hinge[2]],
              ],
              "#355f54",
              6,
            )}
            {[-54, 54].map((y) => {
              const p = project([
                equipment.pedal.hinge[0],
                y,
                equipment.pedal.hinge[2],
              ]);
              return (
                <circle
                  key={y}
                  cx={round(p[0])}
                  cy={round(p[1])}
                  r={5}
                  fill="#fcfaf5"
                  stroke="#355f54"
                  strokeWidth={2}
                />
              );
            })}
          </g>
        )}
        {arm("right")}
        {leg("right")}
        {line([body.shoulderCenter, body.neck, body.headCenter], "#c49c83", 12)}
        <polygon
          points={points(torso)}
          fill="#a6bba8"
          stroke="#4b7566"
          strokeWidth={2}
        />
        {arm("left")}
        <ellipse
          cx={round(head[0])}
          cy={round(head[1])}
          rx={21}
          ry={16.72}
          fill="#d4ad94"
          stroke="#916a56"
          strokeWidth={2}
        />
        {leg("left")}
        {contacts.map((contact) => {
          const p = project(contact.point);
          return (
            <circle
              key={contact.id}
              data-contact-id={contact.id}
              data-contact-target={contact.target}
              data-contact-frame={contact.frame}
              cx={round(p[0])}
              cy={round(p[1])}
              r={4}
              fill="#254d45"
              stroke="#fcfaf5"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
      <g fontFamily="system-ui,sans-serif" fill="#254d45" fontSize={12}>
        <text x={24} y={100}>
          {reformer
            ? "머리·등·골반: 캐리지와 함께 이동"
            : "양 좌골: 좌면 지지 고정"}
        </text>
        {!reformer && (
          <text x={24} y={121}>
            한 장의 페달 · 힌지 위치 고정
          </text>
        )}
        <text x={24} y={340} fontSize={13} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={616} y={340} textAnchor="end" fontSize={11}>
          스프링 힘·설정 미모델링 · 수치·시간은 제작 선택
        </text>
      </g>
    </svg>
  );
}
