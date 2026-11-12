import { useId } from 'react';
import type { BodyPosition } from '../types/pilates';
import { POSTURE_GUIDE } from '../data/postureAnatomyGuide';

const poses: Record<
  BodyPosition,
  { head: [number, number]; body: string; face: string; far?: string }
> = {
  supine: {
    head: [32, 74],
    body: 'M44 82 L94 82 L119 53 L148 85 M50 79 L71 86 L88 86',
    face: 'M27 65 L31 60 L35 65',
    far: 'M94 80 L113 48 L142 81',
  },
  prone: {
    head: [32, 75],
    body: 'M44 76 L95 80 L147 83 M51 78 L46 89 L27 89',
    face: 'M27 84 L31 89 L35 84',
    far: 'M94 76 L145 77',
  },
  'side-lying': {
    head: [32, 70],
    body: 'M43 78 L93 80 L119 86 L150 85 M50 78 L42 87 L26 87',
    face: 'M35 70 L41 70',
    far: 'M93 75 L121 77 L148 77',
  },
  seated: {
    head: [65, 22],
    body: 'M65 35 L67 75 L111 78 L148 85 M65 43 L81 63 L102 70',
    face: 'M74 22 L78 26 L73 28',
    far: 'M68 72 L110 72 L148 78',
  },
  kneeling: {
    head: [85, 18],
    body: 'M85 31 L84 63 L87 86 L127 87 M85 40 L67 61 L73 71',
    face: 'M76 18 L72 22 L77 24',
    far: 'M86 63 L94 81 L130 81',
  },
  standing: {
    head: [90, 16],
    body: 'M90 29 L90 59 L78 87 L68 87 M90 59 L105 87 L115 87 M90 36 L71 57 L70 70 M90 36 L109 57 L110 70',
    face: 'M87 17 L93 17',
  },
  quadruped: {
    head: [45, 45],
    body: 'M56 49 L105 49 L112 84 L141 86 M60 50 L59 85 L48 86',
    face: 'M41 52 L44 57 L48 53',
    far: 'M66 49 L67 81 L58 81 M106 49 L119 80 L145 81',
  },
};

/** A static orientation cue, never the exact start or finish of the selected exercise. */
export function BodyPositionFigure({
  position,
  decorative = false,
  className = '',
}: {
  position: BodyPosition;
  decorative?: boolean;
  className?: string;
}) {
  const id = useId();
  const pose = poses[position];
  if (!pose) return null;
  const guide = POSTURE_GUIDE[position];
  return (
    <svg
      className={`body-position-figure ${className}`}
      viewBox="0 0 180 110"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : id}
      focusable="false"
      fill="none"
    >
      <title id={id}>
        {`${guide.label}: ${guide.orientation}. 자세 방향 예시이며 실제 동작 시범이 아닙니다.`}
      </title>
      <path d="M17 95 H163" stroke="currentColor" strokeWidth="2" opacity=".2" />
      <g stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {pose.far && <path d={pose.far} strokeWidth="5" opacity=".28" />}
        <path d={pose.body} />
        <circle
          cx={pose.head[0]}
          cy={pose.head[1]}
          r="9"
          fill="var(--posture-paper, #f7f5ef)"
          strokeWidth="3"
        />
        <path d={pose.face} strokeWidth="2" />
      </g>
    </svg>
  );
}
