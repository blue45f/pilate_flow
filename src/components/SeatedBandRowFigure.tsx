/** SPDX-License-Identifier: MIT. Original SVG primitives; no source artwork or frames. */
import { useId } from 'react';
import {
  getSeatedBandRowPose,
  projectSeatedBandRowPoint,
  SEATED_BAND_ROW_DRAFT_ID,
} from '../models/seatedBandRow';
import type { AnatomicalSide, Point3 } from '../models/types';

export interface SeatedBandRowFigureProps {
  draftId?: typeof SEATED_BAND_ROW_DRAFT_ID;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}
const n = (value: number) => Number(value.toFixed(3));

/** Native, accessible, pure sampled figure; the shared player owns its clock. */
export function SeatedBandRowFigure({
  draftId = SEATED_BAND_ROW_DRAFT_ID,
  progress,
  activeSide = 'right',
  mirrored = false,
  className,
  label,
}: SeatedBandRowFigureProps) {
  const id = useId(),
    titleId = `${id}-title`,
    descriptionId = `${id}-description`;
  if (draftId !== SEATED_BAND_ROW_DRAFT_ID) throw new TypeError('unknown seated band-row draft');
  const pose = getSeatedBandRowPose(progress, { activeSide, mirrored });
  const project = (p: Point3) => projectSeatedBandRowPoint(p, mirrored);
  const points = (values: readonly Point3[]) =>
    values.map((value) => project(value).map(n).join(',')).join(' ');
  const line = (values: readonly Point3[], color: string, width: number, dash?: string) => (
    <polyline
      points={points(values)}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeDasharray={dash}
    />
  );
  const circle = (p: Point3, radius: number, fill: string, stroke = '#466e62') => {
    const [x, y] = project(p);
    return <circle cx={n(x)} cy={n(y)} r={radius} fill={fill} stroke={stroke} strokeWidth={1.4} />;
  };
  const side = (anatomicalSide: AnatomicalSide) => {
    const arm = pose.arms[anatomicalSide],
      leg = pose.legs[anatomicalSide];
    const color = anatomicalSide === 'left' ? '#6d9687' : '#c78b6e';
    const outline = anatomicalSide === 'left' ? '#376d62' : '#985e43';
    const dash = anatomicalSide === 'right' ? '5 4' : undefined;
    return (
      <g key={anatomicalSide} data-anatomical-side={anatomicalSide} data-limb-role="bilateral">
        {line([leg.hip, leg.knee, leg.ankle], color, 18)}
        {line([leg.hip, leg.knee, leg.ankle], outline, 2, dash)}
        <polygon
          points={points([
            [319, leg.heel[1], 0],
            [333, leg.heel[1], 0],
            [333, leg.heel[1], 60],
            [319, leg.heel[1], 64],
          ])}
          fill={color}
          stroke={outline}
          strokeWidth={1.6}
          strokeDasharray={dash}
        />
        {line([arm.shoulder, arm.elbow, arm.hand], '#d8aa8d', 12)}
        {line([arm.shoulder, arm.elbow, arm.hand], outline, 2.2, dash)}
        {[leg.hip, leg.knee, leg.ankle, arm.shoulder, arm.elbow].map((p, i) => (
          <g key={i}>{circle(p, 3.3, '#fbf6eb', outline)}</g>
        ))}
        {circle(arm.hand, 5.2, '#dfb694', outline)}
      </g>
    );
  };
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
        {label ?? `바닥에 앉아 긴 밴드 로우 · 원본 제작 초안 · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descriptionId}>
        전문가 검토 0인 원본 절차 도해입니다. 공개 본문의 바닥 앉기, 앞으로 뻗은 다리, 발바닥을
        두르는 긴 탄력 밴드와 양손의 끝 잡기, 양팔꿈치 굽힘과 팔 펴기만 참고했습니다. 일반 의자
        변형을 합치지 않았습니다. 밴드를 발에 두르는 경로는 폐쇄형 루프 제품의 확인이 아닙니다. 발
        자세와 발바닥 패치, 골반과 뒤꿈치의 고정 지지, 몸통 고정, 팔꿈치와 손의 경로, 밴드 형상과
        표시 시간은 저작 선택입니다. 실선은 몸의 왼쪽, 점선은 오른쪽이며 화면 반전은 해부학적 쪽이나
        양팔 동작을 바꾸지 않습니다. 밴드 힘·장력·안전 설정과 개인 적합성은 검증하지 않았습니다.
        정확한 카탈로그 애셋이나 자동 대체용이 아닙니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui,sans-serif" fill="#254d45">
        <text x={22} y={27} fontSize={18} fontWeight={700}>
          바닥 앉기 · 긴 밴드 로우
        </text>
        <text x={22} y={49} fontSize={12} fill="#875641">
          원본 제작 초안 · 전문가 검토 0 · 양팔 함께
        </text>
        <text x={616} y={49} textAnchor="end" fontSize={11}>
          {mirrored ? '화면만 반전' : '고정 사선 시점'}
        </text>
      </g>
      <polygon
        points={points(pose.floor.corners)}
        fill="#e6e4da"
        stroke="#bbc4b8"
        strokeWidth={1.5}
      />
      <g strokeLinecap="round" strokeLinejoin="round">
        {side('right')}
        <polygon
          points={points([pose.torso[0], pose.torso[1], pose.torso[5], pose.torso[4]])}
          fill="#5b8171"
          stroke="#355f51"
          strokeWidth={1.7}
        />
        <polygon
          points={points([pose.torso[4], pose.torso[5], pose.torso[6], pose.torso[7]])}
          fill="#7a9b89"
          stroke="#355f51"
          strokeWidth={1.7}
        />
        {line([pose.world.shoulderCenter, pose.world.neck, pose.world.headCenter], '#d8aa8d', 13)}
        <ellipse
          cx={n(head[0])}
          cy={n(head[1])}
          rx={17}
          ry={20}
          fill="#dfb694"
          stroke="#91684d"
          strokeWidth={1.5}
        />
        {circle([143, 0, 223], 1.7, '#4d473b', '#4d473b')}
        {side('left')}
        <g
          data-band-kind={pose.band.kind}
          data-band-product-construction="unspecified"
          data-band-force="not-modeled"
        >
          {line(pose.band.points, '#b7924a', 7)}
          {line(pose.band.points, '#805e2c', 1.4)}
        </g>
        {pose.contacts.map((contact) => (
          <g
            key={contact.id}
            data-contact-id={contact.id}
            data-contact-role={contact.role}
            data-contact-side={contact.anatomicalSide}
            data-contact-state={contact.state}
            data-contact-evidence={contact.evidence}
          >
            {circle(contact.point, 3, '#f7e9b3', '#8c6e2f')}
          </g>
        ))}
      </g>
      <g fontFamily="system-ui,sans-serif" fill="#476859">
        <text x={22} y={76} fontSize={11}>
          바닥 지지·접촉 패치는 저작 선택 · 밴드 유형/장력 미확인
        </text>
        <text x={22} y={324} fontSize={12} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={22} y={344} fontSize={11}>
          단위 없는 치수·경로·시간 · 힘/저항 미모델링 · 정확 매핑 0
        </text>
      </g>
    </svg>
  );
}
