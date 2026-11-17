import { useMemo } from 'react';
import {
  hasDedicated3DExerciseRig,
  PHASE_3D_RAW_T,
  sampleUniversal3DExerciseRig,
} from '../data/universal3dExerciseRigs';
import { MOTION_STUDIO_MATERIALS } from '../utils/motionStudioMaterials';
import { projectStudio3DSceneForSvg } from '../utils/realtimeStudio3dEngine';
import {
  ExerciseMotionArtworkSurface,
  type ExerciseMotionArtworkProps,
} from './ExerciseMotionArtworkSurface';

/**
 * Loaded on cache miss (custom exercises, edited apparatus/bodyPosition exercises, or failed WebP cache).
 * Synthesizes a deterministic 3D scene directly from `universal3dExerciseRigs` + `projectStudio3DSceneForSvg`.
 */
export default function NativeExerciseMotionArtwork({
  phase = 'middle',
  ...props
}: ExerciseMotionArtworkProps) {
  const { exercise, label, decorative = true } = props;
  const dedicated = hasDedicated3DExerciseRig(exercise);
  const rawT = PHASE_3D_RAW_T[phase];
  const rigSample = useMemo(() => sampleUniversal3DExerciseRig(exercise, rawT), [exercise, rawT]);
  const projected = useMemo(
    () => projectStudio3DSceneForSvg(exercise, rawT, 640, 400),
    [exercise, rawT],
  );

  const phaseLabel =
    phase === 'start' ? '시작 자세' : phase === 'middle' ? '정점 자세' : '종료 자세';
  const frameLabel =
    label ??
    `${exercise.nameKo} · ${phaseLabel} · ${dedicated ? '3D 동작 도해' : '절차적 3D 동작 재구성'}`;

  return (
    <ExerciseMotionArtworkSurface
      {...props}
      phase={phase}
      frameLabel={frameLabel}
      scope={dedicated ? 'catalog-authored-pattern' : 'representative-pattern'}
      renderer="inline-native-svg"
      badge={
        dedicated
          ? undefined
          : {
              kind: 'representative-pattern',
              title: '대표 패턴',
              description: rigSample.poseFeatureKo,
            }
      }
    >
      <svg
        className="movement-phase-diagram-svg pf-projected-3d-artwork"
        viewBox="0 0 640 400"
        width="640"
        height="400"
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : frameLabel}
        aria-hidden={decorative ? 'true' : undefined}
        data-exercise-id={exercise.id}
        data-phase={phase}
        data-3d-projected="true"
        data-3d-rig-scope={rigSample.rigScope}
      >
        <defs>
          <linearGradient id={`pf-3d-bg-${exercise.id}-${phase}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F7F4EC" />
            <stop offset="62%" stopColor={MOTION_STUDIO_MATERIALS.horizon} />
            <stop offset="100%" stopColor={MOTION_STUDIO_MATERIALS.floor} />
          </linearGradient>
        </defs>
        <rect width="640" height="400" fill={`url(#pf-3d-bg-${exercise.id}-${phase})`} />
        <g data-layer="contact-shadows">
          {projected.shadows.map((sh, idx) => (
            <ellipse
              key={idx}
              cx={sh.cx}
              cy={sh.cy}
              rx={sh.rx}
              ry={sh.ry}
              fill="rgba(24, 44, 36, 0.08)"
            />
          ))}
        </g>
        <g data-layer="kinematic-figure" data-segment="spine-torso">
          {projected.elements.map((el, idx) =>
            el.kind === 'path' ? (
              <path
                key={idx}
                d={el.d}
                fill={el.fill ?? 'none'}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : el.kind === 'polygon' ? (
              <polygon
                key={idx}
                points={el.points}
                fill={el.fill}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                strokeLinejoin="round"
              />
            ) : (
              <line
                key={idx}
                x1={el.x1}
                y1={el.y1}
                x2={el.x2}
                y2={el.y2}
                stroke={el.stroke}
                strokeWidth={el.strokeWidth}
                strokeLinecap="round"
              />
            ),
          )}
        </g>
      </svg>
    </ExerciseMotionArtworkSurface>
  );
}
