import { useId } from 'react';
import {
  getBatchPose,
  projectBatchPoint,
} from '../models/motionAuthoringBatch';
import type {
  BatchPoint,
  BatchSide,
  BatchVariantId,
} from '../models/motionAuthoringBatch';

export interface MotionAuthoringBatchFigureProps {
  variantId: BatchVariantId;
  progress: number;
  activeSide?: BatchSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}

const TITLES: Readonly<Record<BatchVariantId, string>> = {
  'chair-seated-bilateral-arm-raise-v1': '일반 의자에 앉아 양팔 올리기',
  'chair-seated-overhead-sidebend-v1': '일반 의자에 앉아 한 팔 위로 옆 기울이기',
  'prone-single-straight-leg-extension-v1': '엎드려 한 다리 뻗어 들기',
  'prone-forearm-chest-extension-v1': '엎드려 아래팔 지지 가슴 들기',
};

const PATTERN_DESCRIPTIONS: Readonly<Record<BatchVariantId, string>> = {
  'chair-seated-bilateral-arm-raise-v1':
    '의자에 앉은 몸통과 굽힌 두 다리를 두고 양팔이 어깨를 중심으로 함께 올라왔다 돌아옵니다.',
  'chair-seated-overhead-sidebend-v1':
    '의자에 앉은 골반 위에서 분절한 몸통이 선택한 해부학적 쪽으로 기울었다 돌아옵니다. 기울어지는 쪽의 반대 팔은 머리 위에 두고, 같은 쪽 팔은 허벅지 곁에 둡니다.',
  'prone-single-straight-leg-extension-v1':
    '엎드린 배치에서 선택한 해부학적 쪽의 편 다리가 고관절을 중심으로 들렸다 돌아옵니다. 반대 다리는 지지 배치를 유지합니다.',
  'prone-forearm-chest-extension-v1':
    '엎드린 배치에서 아래팔의 제작 지점을 지지면에 두고 분절한 몸통과 가슴이 들렸다 돌아옵니다.',
};

const n = (value: number) => Number(value.toFixed(3));

/** Original SVG body volumes from authored geometry. No media, frames or mocap. */
export function MotionAuthoringBatchFigure({
  variantId,
  progress,
  activeSide = 'left',
  mirrored = false,
  className,
  label,
}: MotionAuthoringBatchFigureProps) {
  const id = useId();
  const pose = getBatchPose(variantId, progress, { activeSide, mirrored });
  const trunkWidth = variantId === 'prone-forearm-chest-extension-v1'
    ? { outer: 22, inner: 18 }
    : variantId === 'prone-single-straight-leg-extension-v1'
      ? { outer: 34, inner: 30 }
      : { outer: 47, inner: 41 };
  const project = (point: BatchPoint) =>
    projectBatchPoint(point, mirrored, pose.camera.id);
  const path = (vertices: readonly BatchPoint[]) =>
    vertices
      .map((point, index) => `${index ? 'L' : 'M'} ${project(point).map(n).join(' ')}`)
      .join(' ');
  const polygon = (vertices: readonly BatchPoint[]) =>
    vertices.map((point) => project(point).map(n).join(',')).join(' ');
  const mark = (point: BatchPoint) => {
    const [x, y] = project(point);
    return { cx: n(x), cy: n(y) };
  };

  const limb = (side: BatchSide, part: 'arm' | 'leg') => {
    const points = pose.limbs[side];
    const vertices = part === 'arm'
      ? [points.shoulder, points.elbow, points.hand]
      : [points.hip, points.knee, points.ankle];
    const contour = side === 'left' ? '#284c47' : '#705039';
    const fill = side === 'left' ? '#a5c4b5' : '#ddbea2';
    const thickness = part === 'arm' ? 16 : 23;
    return (
      <g
        key={`${side}-${part}`}
        data-anatomical-side={side}
        data-body-part={part}
        data-active={points.active}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path(vertices)} stroke={contour} strokeWidth={thickness + 3} />
        <path d={path(vertices)} stroke={fill} strokeWidth={thickness} />
        <path
          d={path(vertices)}
          stroke={contour}
          strokeWidth="2"
          strokeDasharray={side === 'right' ? '5 5' : undefined}
        />
        <circle
          {...mark(part === 'arm' ? points.elbow : points.knee)}
          r="3"
          fill="#fffdf7"
          stroke={contour}
          strokeWidth="1.5"
        />
        {part === 'leg' ? (
          <>
            <path
              d={path([points.heel, points.ankle, points.toe])}
              stroke={contour}
              strokeWidth="9"
            />
            <path
              d={path([points.heel, points.toe])}
              stroke={fill}
              strokeWidth="5"
              strokeDasharray={side === 'right' ? '5 4' : undefined}
            />
          </>
        ) : (
          <circle {...mark(points.hand)} r="5" fill={fill} stroke={contour} strokeWidth="1.5" />
        )}
      </g>
    );
  };

  const seat = pose.equipment.filter((item) => item.kind === 'chair-seat');
  const backdrop = pose.equipment.filter((item) => item.kind !== 'chair-seat');
  const equipment = (item: (typeof pose.equipment)[number]) => (
    <g key={item.id} data-equipment-id={item.id} data-equipment-kind={item.kind}>
      {item.kind === 'mat' || item.kind === 'chair-seat' ? (
        <polygon
          points={polygon(item.points)}
          fill={item.kind === 'mat' ? '#e7eddf' : '#e7d3b2'}
          stroke={item.kind === 'mat' ? '#8d9f80' : '#755e42'}
          strokeWidth={item.kind === 'chair-seat' ? 3 : 1.5}
          strokeLinejoin="round"
        />
      ) : (
        <path
          d={path(item.points)}
          stroke={item.kind === 'floor' ? '#a9b3a2' : '#755e42'}
          strokeWidth={item.kind === 'floor' ? 2 : 6}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </g>
  );

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 360"
      role="img"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      data-motion-variant-id={variantId}
      data-progress={pose.progress}
      data-phase-id={pose.phase.id}
      data-anatomical-active-side={activeSide}
      data-side-role={variantId === 'chair-seated-overhead-sidebend-v1' ? 'bend-direction' : pose.sideMode === 'unilateral' ? 'moving-leg' : 'together'}
      data-view-mirrored={mirrored}
      data-side-mode={pose.sideMode}
      data-proposal-status="variant-proposal"
      data-exact-asset-ready="false"
      data-professional-review-count="0"
    >
      <title id={`${id}-title`}>{label ?? `${TITLES[variantId]} · ${pose.phase.label} · 미검토 제작 초안`}</title>
      <desc id={`${id}-description`}>
        {PATTERN_DESCRIPTIONS[variantId]} 실선은 몸의 왼쪽, 점선은 몸의 오른쪽입니다.
        {mirrored ? ' 화면만 반전했으며 해부학적 좌우는 유지합니다.' : ' 화면 반전 없음.'}
        {' '}채운 원은 고정된 제작 접점, 빈 원과 짧은 점선은 지지면에서 해제된 제작 접점입니다.
        지지점의 위치와 몸의 비율·관절 범위는 저작 선택입니다. 실제 지지력·관절 역학이나 개인별
        적합성을 검증하지 않았습니다. 전문가 미검토, 안전성 미평가, 자동 추천 제외 상태입니다.
      </desc>
      <rect width="640" height="360" rx="16" fill="#fbfaf5" />
      <g data-scene-layer="equipment">{backdrop.map(equipment)}</g>
      <g data-scene-layer="far-limbs">{limb('right', 'leg')}{limb('right', 'arm')}</g>
      <g data-scene-layer="seat">{seat.map(equipment)}</g>
      <g data-body-part="segmented-trunk" strokeLinecap="round" strokeLinejoin="round">
        <path d={path(pose.trunk)} fill="none" stroke="#41685e" strokeWidth={trunkWidth.outer} />
        <path d={path(pose.trunk)} fill="none" stroke="#bdd1c2" strokeWidth={trunkWidth.inner} />
        <path d={path(pose.trunk)} fill="none" stroke="#41685e" strokeWidth="2.5" />
        {pose.trunk.slice(1, -1).map((point, index) => (
          <circle key={index} {...mark(point)} r="3" fill="#fbfaf5" stroke="#41685e" strokeWidth="1" />
        ))}
      </g>
      <g data-body-part="head-neck" fill="none" stroke="#78644b" strokeLinecap="round">
        <path d={path([pose.head.neck, pose.head.center])} strokeWidth="13" />
        <circle {...mark(pose.head.center)} r="18" fill="#efd5b4" strokeWidth="2" />
        <path d={path([pose.head.center, pose.head.nose])} strokeWidth="3" />
      </g>
      <g data-scene-layer="near-limbs">{limb('left', 'leg')}{limb('left', 'arm')}</g>
      <g data-scene-layer="authored-contact-markers">
        {pose.contacts.map((contact) => {
          const [anchorX, anchorY] = project(contact.anchorPoint);
          const released = contact.state === 'released';
          return (
            <g
              key={contact.id}
              data-contact-id={contact.id}
              data-anatomical-side={contact.side ?? 'center'}
              data-contact-target={contact.target}
              data-contact-state={contact.state}
              data-geometry-basis="authored-only"
            >
              <title>{`${contact.id} · ${contact.target} · ${released ? '제작 접점 해제' : '제작 접점 고정'}`}</title>
              {released && (
                <path
                  d={path([contact.anchorPoint, contact.bodyPoint])}
                  fill="none"
                  stroke="#9a502d"
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                />
              )}
              <rect
                x={n(anchorX - 4)}
                y={n(anchorY - 4)}
                width="8"
                height="8"
                rx="1"
                fill="#fbfaf5"
                stroke={released ? '#9a502d' : '#244d44'}
                strokeWidth="1.5"
              />
              <circle
                {...mark(contact.bodyPoint)}
                r="5"
                fill={released ? '#fbfaf5' : '#244d44'}
                stroke={released ? '#9a502d' : '#fbfaf5'}
                strokeWidth="2"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export { TITLES as BATCH_FIGURE_TITLES };
