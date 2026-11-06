/** SPDX-License-Identifier: MIT. Original native SVG, not reproduced source media. */
import { useId } from 'react';
import {
  getPelvicCurlPose,
  PELVIC_CURL_DRAFT_ID,
  projectPelvicCurlPoint,
} from '../models/pelvicCurl';
import type { AnatomicalSide, Point3 } from '../models/types';

export interface PelvicCurlFigureProps {
  draftId?: typeof PELVIC_CURL_DRAFT_ID;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}
const n = (value: number) => Number(value.toFixed(3));

/** Pure sampled figure; no clock or playback effect is owned here. */
export function PelvicCurlFigure({
  draftId = PELVIC_CURL_DRAFT_ID,
  progress,
  activeSide = 'right',
  mirrored = false,
  className,
  label,
}: PelvicCurlFigureProps) {
  const id = useId(),
    titleId = `${id}-title`,
    descriptionId = `${id}-description`;
  if (draftId !== PELVIC_CURL_DRAFT_ID) throw new TypeError('unknown pelvic-curl draft');
  const pose = getPelvicCurlPose(progress, { activeSide, mirrored });
  const project = (point: Point3) => projectPelvicCurlPoint(point, mirrored);
  const points = (values: readonly Point3[]) =>
    values.map((point) => project(point).map(n).join(',')).join(' ');
  const shiftSide = (values: readonly Point3[], y: number): Point3[] =>
    values.map((point): Point3 => [point[0], y, point[2]]);
  const line = (values: readonly Point3[], color: string, width: number, dash?: string) => (
    <polyline
      points={points(values)}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );
  const circle = (point: Point3, radius: number, fill: string, stroke = '#446c5c') => {
    const p = project(point);
    return (
      <circle cx={n(p[0])} cy={n(p[1])} r={radius} fill={fill} stroke={stroke} strokeWidth={1.4} />
    );
  };
  const limb = (side: AnatomicalSide, part: 'arm' | 'leg') => {
    const arm = pose.arms[side],
      leg = pose.legs[side];
    const color = side === 'left' ? '#769c8a' : '#c88e70';
    const outline = side === 'left' ? '#365f50' : '#925d43';
    const dash = side === 'right' ? '5 4' : undefined;
    const joints =
      part === 'arm' ? [arm.shoulder, arm.elbow, arm.hand] : [leg.hip, leg.knee, leg.ankle];
    return (
      <g
        key={`${side}-${part}`}
        data-anatomical-side={side}
        data-limb-role="bilateral"
        data-limb-part={part}
      >
        {line(joints, part === 'arm' ? '#d9ae90' : color, part === 'arm' ? 11 : 18)}
        {line(joints, outline, 2, dash)}
        {part === 'leg' && (
          <polygon
            points={points([
              [382, leg.heel[1], 0],
              [432, leg.heel[1], 0],
              [430, leg.heel[1], 12],
              [398, leg.heel[1], 24],
            ])}
            fill={color}
            stroke={outline}
            strokeWidth={1.5}
            strokeDasharray={dash}
          />
        )}
        {joints.map((point, index) => (
          <g key={index}>{circle(point, 3, '#faf4e7', outline)}</g>
        ))}
      </g>
    );
  };
  const upperFar = shiftSide(pose.spine.upperProfile, -24),
    upperNear = shiftSide(pose.spine.upperProfile, 24);
  const lowerNear = shiftSide(pose.spine.lowerProfile, 24);
  const head = project(pose.world.headCenter);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 640 360"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-motion-draft-id={pose.draftId}
      data-progress={pose.progress}
      data-active-side={activeSide}
      data-view-mirrored={mirrored}
      data-model-version={pose.modelVersion}
      data-side-mode="bilateral"
      data-phase-id={pose.phase.id}
      data-display-behavior={pose.phase.displayBehavior}
    >
      <title id={titleId}>
        {label ?? `분절 골반 말아 올리기 · 원본 제작 초안 · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descriptionId}>
        전문가 검토 0인 원본 절차 도해입니다. BASI 본문의 무릎 굽힘, 좌골 너비 정도의 무릎과 뒤꿈치,
        매트를 누르는 긴 팔, 골반 말림 뒤 척추를 차례로 올리고 가슴 쪽부터 내려오는 설명을
        참고했습니다. 네 개의 길이 유지 척추 링크와 다리 IK는 원본 수학적 근사이며 실제 척추뼈
        관찰이나 검증된 숄더 브릿지가 아닙니다. 머리·어깨·손·발의 고정 매트 패치와 발 자세, 최초
        허리 곡선과 접촉 해제 순서, 골반 경로와 꼭대기 선 맞춤·높이·각도·시간은 저작 선택입니다.
        원문은 발바닥 전체 접촉이나 정확한 지지 지도를 명시하지 않습니다. 실선은 몸의 왼쪽, 점선은
        오른쪽이며 화면 반전은 해부학적 쪽을 바꾸지 않습니다. 양다리가 함께 움직입니다. 접촉
        압력·힘·개인 적합성·안전성과 정확 카탈로그 매핑은 확인하지 않았습니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui,sans-serif" fill="#254d45">
        <text x={22} y={27} fontSize={18} fontWeight={700}>
          척추 링크 · 골반 말아 올리기
        </text>
        <text x={22} y={49} fontSize={12} fill="#875641">
          원본 제작 초안 · 전문가 검토 0 · 양쪽 함께
        </text>
        <text x={616} y={49} textAnchor="end" fontSize={11}>
          {mirrored ? '화면만 반전' : '고정 사선 시점'}
        </text>
        <text x={22} y={75} fontSize={11}>
          고정 발/손/머리 접점과 척추 분절은 저작 근사 · 힘/압력 미모델링
        </text>
      </g>
      <polygon
        points={points(pose.mat.corners)}
        fill="#e2e4d9"
        stroke="#b5c1b2"
        strokeWidth={1.5}
      />
      <g strokeLinecap="round" strokeLinejoin="round">
        {limb('right', 'arm')}
        {limb('right', 'leg')}
        <polygon
          points={points([...upperFar, ...[...upperNear].reverse()])}
          fill="#87a18e"
          stroke="#456c59"
          strokeWidth={1.5}
        />
        <polygon
          points={points([...upperNear, ...[...lowerNear].reverse()])}
          fill="#779b86"
          stroke="#365f4c"
          strokeWidth={1.6}
        />
        {line([pose.world.headCenter, pose.world.neck, pose.world.upperBack], '#d9ae90', 13)}
        <ellipse
          cx={n(head[0])}
          cy={n(head[1])}
          rx={20}
          ry={21}
          fill="#dfb795"
          stroke="#91684e"
          strokeWidth={1.5}
        />
        {circle([89, 0, 41], 1.6, '#574d40', '#574d40')}
        {limb('left', 'leg')}
        {limb('left', 'arm')}
        <g data-spine-interpretation={pose.spine.interpretation}>
          {line(pose.spine.joints, '#365b50', 2.5)}
          {pose.spine.joints.map((point, index) => (
            <g key={index} data-spine-node={index}>
              {circle(point, 3.7, '#edf2d9')}
            </g>
          ))}
        </g>
        {line(pose.pelvisAxis, '#a96e49', 3)}
        {pose.contacts.map((contact) => (
          <g
            key={contact.id}
            data-contact-id={contact.id}
            data-contact-role={contact.role}
            data-contact-side={contact.anatomicalSide ?? 'center'}
            data-contact-state={contact.state}
            data-contact-evidence={contact.evidence}
          >
            {contact.state === 'released' &&
              line([contact.point, contact.targetPoint], '#9f9981', 1, '3 3')}
            {circle(
              contact.point,
              2.8,
              contact.state === 'released' ? '#f7f5ef' : '#f1d993',
              '#8b7442',
            )}
          </g>
        ))}
      </g>
      <g fontFamily="system-ui,sans-serif" fill="#476859">
        <text x={22} y={325} fontSize={12} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={22} y={345} fontSize={11}>
          단위 없는 기하·표시 시간 · 원문 변형 대조 필요 · 정확 애셋 0
        </text>
      </g>
    </svg>
  );
}
