import type { CSSProperties, ReactNode } from 'react';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import { ApparatusIllustrationSvg } from './ApparatusStudioArtwork';

export interface ExerciseMotionArtworkProps {
  exercise: PilatesExercise;
  phase?: VisualPhaseId;
  className?: string;
  decorative?: boolean;
  label?: string;
  style?: CSSProperties;
  'data-testid'?: string;
  /**
   * Opt-in only: on mouse hover, swap the static WebP frame for the live
   * continuous-motion thumbnail (CatalogMotionThumbnail, mouse-hover rAF
   * preview). At rest the static frame stays, so native artwork and its
   * provenance (img src, lazy loading, match scope) are preserved. Default
   * off so the 3-frame compare strip and the 218-exercise stills keep their
   * phase stills.
   */
  hoverPreview?: boolean;
}
type ArtworkScope =
  | 'catalog-authored-pattern'
  | 'representative-pattern'
  | 'source-video-only'
  | 'unmodeled-exercise'
  | 'pending-native-artwork'
  | 'unavailable-native-artwork';
interface SurfaceProps extends ExerciseMotionArtworkProps {
  frameLabel: string;
  scope: ArtworkScope;
  renderer: 'cached-native-image' | 'inline-native-svg' | 'apparatus-reference';
  children: ReactNode;
  badge?: { kind: string; title: string; description: string };
  busy?: boolean;
  onPointerEnter?: React.PointerEventHandler<HTMLSpanElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLSpanElement>;
}

/** Cached, deferred and neutral art share the same layout and accessible scope. */
export function ExerciseMotionArtworkSurface({
  exercise,
  phase = 'middle',
  className = '',
  decorative = true,
  style,
  'data-testid': testId,
  frameLabel,
  scope,
  renderer,
  children,
  badge,
  busy,
  onPointerEnter,
  onPointerLeave,
}: SurfaceProps) {
  const apparatusOnly = renderer === 'apparatus-reference';
  return (
    <span
      className={('exercise-motion-artwork ' + className).trim()}
      style={style}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      aria-hidden={decorative ? 'true' : undefined}
      aria-busy={busy || undefined}
      role={apparatusOnly && !decorative ? 'img' : undefined}
      aria-label={apparatusOnly && !decorative ? frameLabel : undefined}
      title={scope !== 'catalog-authored-pattern' ? frameLabel : undefined}
      data-testid={testId}
      data-exercise-id={exercise.id}
      data-motion-phase={apparatusOnly ? undefined : phase}
      data-match-scope={scope}
      data-motion-source={
        scope === 'source-video-only'
          ? 'creator-video-reference'
          : apparatusOnly
            ? 'apparatus-reference'
            : 'authored-kinematic-reference'
      }
      data-native-motion-available={!apparatusOnly}
      data-artwork-renderer={renderer}
      data-professional-review="unreviewed"
      data-anatomical-accuracy-assumed="false"
    >
      {children}
      {badge && (
        <span className="exercise-motion-artwork__label" data-artwork-label={badge.kind}>
          <strong>{badge.title}</strong>
          <span>{badge.description}</span>
        </span>
      )}
    </span>
  );
}

export function ApparatusExerciseArtwork({
  status,
  ...props
}: ExerciseMotionArtworkProps & {
  status: 'source-only' | 'unmodeled' | 'loading' | 'unavailable';
}) {
  const { exercise, label } = props;
  const apparatus = APPARATUS_LABELS[exercise.apparatus].ko;
  const presentation = {
    'source-only': {
      scope: 'source-video-only' as const,
      frameLabel: exercise.nameKo + ' · 영상으로 동작 확인 · 기구 안내 이미지',
      badge: { kind: 'source-video', title: '영상 참고', description: apparatus + ' · 기구 안내' },
    },
    unmodeled: {
      scope: 'unmodeled-exercise' as const,
      frameLabel: exercise.nameKo + ' · 전용 도해 없음 · ' + apparatus + ' 기구 안내 이미지',
      badge: {
        kind: 'apparatus-reference',
        title: '기구 안내',
        description: '수정한 동작 · 전용 도해 없음',
      },
    },
    loading: {
      scope: 'pending-native-artwork' as const,
      frameLabel: exercise.nameKo + ' · 동작 도해 불러오는 중 · ' + apparatus + ' 기구 안내 이미지',
      badge: { kind: 'loading', title: '불러오는 중', description: apparatus + ' · 기구 안내' },
    },
    unavailable: {
      scope: 'unavailable-native-artwork' as const,
      frameLabel:
        exercise.nameKo + ' · 동작 도해를 불러오지 못함 · ' + apparatus + ' 기구 안내 이미지',
      badge: {
        kind: 'unavailable',
        title: '기구 안내',
        description: '동작 도해를 불러오지 못했어요',
      },
    },
  }[status];
  return (
    <ExerciseMotionArtworkSurface
      {...props}
      {...presentation}
      frameLabel={label ?? presentation.frameLabel}
      renderer="apparatus-reference"
      busy={status === 'loading'}
    >
      <ApparatusIllustrationSvg apparatus={exercise.apparatus} />
    </ExerciseMotionArtworkSurface>
  );
}
