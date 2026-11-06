import { ChestLiftFigure } from './ChestLiftFigure';
import { PelvicCurlFigure } from './PelvicCurlFigure';
import { SeatedBandRowFigure } from './SeatedBandRowFigure';
import { TensionDraftFigure } from './TensionDraftFigure';
import { StandingSupportDraftFigure } from './StandingSupportDraftFigure';
import { useId } from 'react';
import { ApparatusDraftFigure } from './ApparatusDraftFigure';
import { QuadrupedDraftFigure } from './QuadrupedDraftFigure';
import { SupineDraftFigure } from './SupineDraftFigure';
import { LateralDraftFigure } from './LateralDraftFigure';
import { getHeelRaisePose } from '../models/heelRaise';
import { getClamPose, projectClamPoint } from '../models/clam';
import type { AnatomicalSide, MotionDraftId, Point2, Point3, ScreenPoint } from '../models/types';

export interface MotionDraftFigureProps {
  draftId: MotionDraftId;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
  label?: string;
}

const n = (value: number) => Math.round(value * 1000) / 1000;
const xy = (point: Point2) => `${n(point.x)} ${n(point.y)}`;
const path = (points: readonly Point2[]) =>
  points.map((point, index) => `${index ? 'L' : 'M'} ${xy(point)}`).join(' ');
const polyline = (points: readonly ScreenPoint[]) =>
  points.map((point) => point.map((value) => Number(value.toFixed(3))).join(',')).join(' ');
const sideKo = (side: AnatomicalSide) => (side === 'right' ? '오른쪽' : '왼쪽');

/** Native React SVG primitives from the frozen authored geometry; no source-media embedding. */
export function MotionDraftFigure({
  draftId,
  progress,
  activeSide = 'right',
  mirrored = false,
  className,
  label,
}: MotionDraftFigureProps) {
  const id = useId();
  if (draftId === 'supine-chest-lift')
    return (
      <ChestLiftFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (draftId === 'articulated-pelvic-curl')
    return (
      <PelvicCurlFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (draftId === 'floor-seated-band-row')
    return (
      <SeatedBandRowFigure
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (
    draftId === 'reformer-supine-strap-arm-press' ||
    draftId === 'cadillac-supine-arm-spring-press'
  )
    return (
      <TensionDraftFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (
    draftId === 'ladder-supported-hip-extension-slide' ||
    draftId === 'ladder-supported-side-leg-slide'
  )
    return (
      <StandingSupportDraftFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (draftId === 'reformer-parallel-footwork' || draftId === 'chair-seated-pedal-press')
    return (
      <ApparatusDraftFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (draftId === 'quadruped-arm-slide' || draftId === 'quadruped-leg-slide')
    return (
      <QuadrupedDraftFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (draftId === 'adult-supine-heel-slide' || draftId === 'supine-knee-fold')
    return (
      <SupineDraftFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  if (draftId === 'side-lying-straight-leg-lift' || draftId === 'side-lying-open-book')
    return (
      <LateralDraftFigure
        draftId={draftId}
        progress={progress}
        activeSide={activeSide}
        mirrored={mirrored}
        className={className}
        label={label}
      />
    );
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  if (draftId === 'supported-heel-raise') {
    const pose = getHeelRaisePose(progress, { mirrored });
    const { left, right } = pose.limbs;
    const limb = (side: AnatomicalSide) => {
      const leg = pose.limbs[side];
      const color = side === 'left' ? '#285b4c' : '#9a7259';
      const dash = side === 'right' ? '6 4' : undefined;
      return (
        <g
          key={side}
          data-anatomical-side={side}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={path([leg.hip, leg.knee, leg.ankle])} strokeWidth={14} opacity={0.72} />
          <path d={path([leg.hip, leg.knee, leg.ankle])} strokeWidth={3} strokeDasharray={dash} />
          <path d={path([leg.shoulder, leg.elbow, leg.hand])} strokeWidth={9} opacity={0.65} />
          <path
            d={path([leg.shoulder, leg.elbow, leg.hand])}
            strokeWidth={2.5}
            strokeDasharray={dash}
          />
          <path d={path([leg.heel, leg.ankle, leg.forefoot])} strokeWidth={6} />
          <path
            d={path([leg.heel, leg.forefoot, leg.toe])}
            strokeWidth={4}
            strokeDasharray={dash}
          />
          <circle cx={n(leg.knee.x)} cy={n(leg.knee.y)} r={3.5} fill="#fcfaf5" strokeWidth={1.5} />
          <circle
            cx={n(leg.hand.x)}
            cy={n(leg.hand.y)}
            r={4}
            fill="#285b4c"
            stroke="#fcfaf5"
            strokeWidth={1.5}
          />
          <circle
            cx={n(leg.forefoot.x)}
            cy={n(leg.forefoot.y)}
            r={4}
            fill="#285b4c"
            stroke="#fcfaf5"
            strokeWidth={1.5}
          />
          <circle
            cx={n(leg.heel.x)}
            cy={n(leg.heel.y)}
            r={4}
            fill={pose.q === 0 ? '#285b4c' : '#c17c52'}
            stroke="#fcfaf5"
            strokeWidth={1.5}
          />
        </g>
      );
    };
    return (
      <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 640 360"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-motion-draft-id={draftId}
        data-progress={progress}
      >
        <title id={titleId}>
          {label ?? `양측 지지 뒤꿈치 들기 제작 초안 · ${pose.phase.label}`}
        </title>
        <desc id={descriptionId}>
          전문가 미검토 원본 도해입니다. 일반 의자는 필라테스 체어가 아닙니다. 실선은 몸의 왼쪽,
          점선은 몸의 오른쪽이며 화면 반전은 이 이름을 바꾸지 않습니다. 각도·비율은 제작 선택이고
          운동 시범이 아닙니다.
        </desc>
        <rect width={640} height={360} rx={16} fill="#f5f3eb" />
        <text x={24} y={30} fill="#6a725f" fontFamily="sans-serif" fontSize={13}>
          제작 초안 · 전문가 미검토 · 양쪽 함께
        </text>
        <g transform={mirrored ? 'translate(640 0) scale(-1 1)' : undefined}>
          <path d="M 150 326 L 430 326 L 488 318 L 208 318 Z" fill="#e1e6d9" />
          <path
            d="M 335 170 L 351 162 L 411 162 L 395 170 Z"
            fill="#b99b75"
            stroke="#85735d"
            strokeWidth={2}
          />
          <path
            d="M 395 170 L 395 326 M 411 162 L 411 318 M 395 250 L 451 250 L 467 242 L 411 242 Z M 451 250 L 451 326 M 467 242 L 467 318"
            fill="none"
            stroke="#a48c6d"
            strokeWidth={6}
            strokeLinejoin="round"
          />
          {limb('right')}
          <path
            d={`${path([left.shoulder, right.shoulder, right.hip, left.hip])} Z`}
            fill="#cedbc9"
            stroke="#6b826d"
            strokeWidth={2}
          />
          {limb('left')}
          <path
            d={`M ${n(pose.head.center.x)} ${n(pose.head.center.y + 14)} L ${n((left.shoulder.x + right.shoulder.x) / 2)} ${n((left.shoulder.y + right.shoulder.y) / 2)}`}
            stroke="#84997e"
            strokeWidth={8}
          />
          <circle
            cx={n(pose.head.center.x)}
            cy={n(pose.head.center.y)}
            r={15}
            fill="#dfc6aa"
            stroke="#7d826e"
            strokeWidth={2}
          />
          <path
            d={`M ${n(pose.head.center.x + 13)} ${n(pose.head.center.y - 4)} l 7 5 -7 3`}
            fill="#dfc6aa"
            stroke="#7d826e"
            strokeWidth={1.5}
          />
        </g>
        <g fontFamily="sans-serif" fontSize={12} fill="#586653">
          <text x={24} y={327}>
            실선: 몸의 왼쪽
          </text>
          <text x={24} y={345}>
            점선: 몸의 오른쪽
          </text>
          <text x={466} y={60}>
            손: 지지물 접촉
          </text>
          <text x={466} y={79}>
            앞발: 바닥 접촉
          </text>
          <text x={466} y={98}>
            뒤꿈치: {pose.q === 0 ? '바닥 접촉' : '바닥에서 떨어짐'}
          </text>
        </g>
      </svg>
    );
  }
  if (draftId !== 'side-lying-clam') return <p>선택한 모션 변형 제안이 없습니다.</p>;
  const pose = getClamPose(progress, { activeSide, mirrored });
  const project = (point: Point3) => projectClamPoint(point, mirrored);
  const s = pose.screen;
  const mat = (
    [
      [55, -55, 0],
      [553, -55, 0],
      [553, 130, 0],
      [55, 130, 0],
    ] as const
  ).map(project);
  const pillow = (
    [
      [89, -24, 18],
      [158, -24, 18],
      [158, 28, 18],
      [89, 28, 18],
    ] as const
  ).map(project);
  const torso = (
    [
      [169, 0, 65],
      [211, 0, 73],
      [302, 0, 73],
      [321, 0, 51],
      [316, 0, 18],
      [300, 0, 0],
      [280, 0, 5],
      [192, 0, 0],
      [166, 0, 20],
    ] as const
  ).map(project);
  const leader = project([480, 0, 12]);
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 360"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-motion-draft-id={draftId}
      data-progress={progress}
      data-active-side={activeSide}
      data-view-mirrored={mirrored}
    >
      <title id={titleId}>
        {label ?? `사이드 클램 제작 초안 · 위쪽 ${sideKo(activeSide)} · ${pose.phaseLabelKo}`}
      </title>
      <desc id={descriptionId}>
        전문가 미검토 원본 도해입니다. 머리 베개·골반·발뒤꿈치 접촉을 고정한 단순 기하 모델입니다.
        몸의 {sideKo(activeSide)}이 위쪽이고 {sideKo(pose.supportSide)}이 아래쪽입니다. 화면
        반전으로 해부학적 쪽을 바꾸지 않습니다. 운동 시범이나 안전성 검증이 아닙니다.
      </desc>
      <rect width={640} height={360} rx={18} fill="#f7f5ef" />
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={24} y={29} fontSize={20} fontWeight={700}>
          사이드 클램
        </text>
        <text x={24} y={52} fontSize={14} fill="#875641">
          제작 초안 · 전문가 미검토
        </text>
        <text x={616} y={29} textAnchor="end" fontSize={13}>
          위쪽 {sideKo(activeSide)} · 아래쪽 {sideKo(pose.supportSide)}
        </text>
        <text x={616} y={52} textAnchor="end" fontSize={12} fill="#586a60">
          {mirrored ? '화면 반전 켬 · 해부학적 쪽 유지' : '고정 사선 시점 · 해부학적 쪽 표시'}
        </text>
      </g>
      <g strokeLinecap="round" strokeLinejoin="round">
        <polygon points={polyline(mat)} fill="#dbe4d9" stroke="#b4c7b7" strokeWidth={2} />
        <polygon points={polyline(pillow)} fill="#fffdf8" stroke="#b9baab" strokeWidth={2} />
        <polyline
          points={polyline([s.bottomHip, s.bottomKnee, s.bottomHeel])}
          fill="none"
          stroke="#74978a"
          strokeWidth={24}
        />
        <polyline
          points={polyline([s.bottomHip, s.bottomKnee, s.bottomHeel])}
          fill="none"
          stroke="#466e62"
          strokeWidth={2}
          strokeDasharray="5 6"
        />
        <polyline
          points={polyline([s.bottomHeel, s.bottomToe])}
          fill="none"
          stroke="#74978a"
          strokeWidth={16}
        />
        <polyline
          points={polyline([project([145, 0, 44]), project([188, 0, 40])])}
          fill="none"
          stroke="#d4a891"
          strokeWidth={16}
        />
        <polygon points={polyline(torso)} fill="#a6bba8" stroke="#4b7566" strokeWidth={2} />
        <polyline
          points={polyline([s.shoulder, s.elbow, s.hand])}
          fill="none"
          stroke="#d4a891"
          strokeWidth={16}
        />
        <circle
          cx={n(s.headCenter[0])}
          cy={n(s.headCenter[1])}
          r={28}
          fill="#d4a891"
          stroke="#916a56"
          strokeWidth={2}
        />
        <polyline
          points={polyline([s.topHip, s.topKnee, s.topHeel])}
          fill="none"
          stroke="#c88666"
          strokeWidth={23}
        />
        <polyline
          points={polyline([s.topHip, s.topKnee, s.topHeel])}
          fill="none"
          stroke="#875641"
          strokeWidth={2}
        />
        <polyline
          points={polyline([s.topHeel, s.topToe])}
          fill="none"
          stroke="#c88666"
          strokeWidth={15}
        />
        {[s.topHip, s.topKnee, s.topHeel].map((point, index) => (
          <circle
            key={index}
            cx={n(point[0])}
            cy={n(point[1])}
            r={index === 2 ? 5 : 6}
            fill="#f7f5ef"
            stroke="#875641"
            strokeWidth={2}
          />
        ))}
        <circle
          cx={n(leader[0])}
          cy={n(leader[1])}
          r={12}
          fill="none"
          stroke="#254d45"
          strokeWidth={1.5}
        />
        <line
          x1={n(leader[0])}
          y1={n(leader[1] - 12)}
          x2={mirrored ? 119 : 521}
          y2={224}
          stroke="#466e62"
          strokeWidth={1.5}
        />
      </g>
      <g fontFamily="system-ui, sans-serif" fill="#254d45">
        <text x={mirrored ? 29 : 611} y={218} textAnchor={mirrored ? 'start' : 'end'} fontSize={13}>
          발뒤꿈치 접촉 고정
        </text>
        <text x={24} y={336} fontSize={14} fontWeight={600}>
          {pose.phaseLabelKo}
        </text>
        <text x={616} y={336} textAnchor="end" fontSize={12} fill="#586a60">
          도형·각도는 제작 선택 · 운동 시범 아님
        </text>
      </g>
    </svg>
  );
}
