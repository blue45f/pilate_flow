import { memo, useEffect, useState, type ComponentType } from 'react';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import {
  getExerciseArtworkFrame,
  hasExerciseArtworkIdentityMismatch,
} from '../utils/exerciseArtworkCache';
import {
  getLoadedNativeExerciseArtwork,
  loadNativeExerciseArtwork,
} from '../utils/lazyExerciseArtwork';
import {
  ApparatusExerciseArtwork,
  ExerciseMotionArtworkSurface,
  type ExerciseMotionArtworkProps,
} from './ExerciseMotionArtworkSurface';
import '../styles/exercise-motion-artwork.css';

export type { ExerciseMotionArtworkProps } from './ExerciseMotionArtworkSurface';

function DeferredNativeArtwork(props: ExerciseMotionArtworkProps) {
  const [loaded, setLoaded] = useState<{
    component: ComponentType<ExerciseMotionArtworkProps> | null;
    failed: boolean;
  }>(() => ({ component: getLoadedNativeExerciseArtwork()?.default ?? null, failed: false }));
  useEffect(() => {
    if (loaded.component) return;
    let active = true;
    loadNativeExerciseArtwork().then(
      (module) => {
        if (active) setLoaded({ component: module.default, failed: false });
      },
      () => {
        if (active) setLoaded({ component: null, failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [loaded.component]);
  const NativeArtwork = loaded.component;
  return NativeArtwork ? (
    <NativeArtwork {...props} />
  ) : (
    <ApparatusExerciseArtwork {...props} status={loaded.failed ? 'unavailable' : 'loading'} />
  );
}

/** Cache hits never initialize the motion engine or the native SVG renderer. */
export const ExerciseMotionArtwork = memo(function ExerciseMotionArtwork({
  phase = 'middle',
  decorative = true,
  ...props
}: ExerciseMotionArtworkProps) {
  const { exercise, label } = props;
  const sourceOnly = getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable === false;
  const cachedFrame = sourceOnly ? undefined : getExerciseArtworkFrame(exercise, phase);
  const [failedFrameSrc, setFailedFrameSrc] = useState<string | null>(null);
  const artworkProps = { ...props, phase, decorative };
  if (sourceOnly || hasExerciseArtworkIdentityMismatch(exercise))
    return (
      <ApparatusExerciseArtwork
        {...artworkProps}
        status={sourceOnly ? 'source-only' : 'unmodeled'}
      />
    );
  if (cachedFrame && cachedFrame.src !== failedFrameSrc) {
    const phaseLabel =
      cachedFrame.labelKo ??
      (phase === 'start' ? '시작 자세' : phase === 'middle' ? '정점 자세' : '종료 자세');
    const frameLabel = label ?? exercise.nameKo + ' · ' + phaseLabel + ' · 계획용 동작 도해';
    return (
      <ExerciseMotionArtworkSurface
        {...artworkProps}
        frameLabel={frameLabel}
        scope="catalog-authored-pattern"
        renderer="cached-native-image"
      >
        <img
          className="movement-phase-diagram-svg"
          src={cachedFrame.src}
          alt={decorative ? '' : frameLabel}
          width={cachedFrame.width}
          height={cachedFrame.height}
          loading="lazy"
          decoding="async"
          data-exercise-id={exercise.id}
          data-phase={phase}
          onError={() => setFailedFrameSrc(cachedFrame.src)}
        />
      </ExerciseMotionArtworkSurface>
    );
  }
  return <DeferredNativeArtwork {...artworkProps} />;
});
