import { memo, useEffect, useState, type ComponentType } from 'react';
import { hasDedicated3DExerciseRig } from '../data/universal3dExerciseRigs';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
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

/**
 * Renders True 3D posture artwork for every exercise:
 * - All 218 dedicated catalog & global repertoire exercises load cached 640x400 Blender 5.2 Cycles 3D WebP frames.
 * - Custom or user-edited exercises synthesize a procedural 3D posture matching their current apparatus & body position.
 */
export const ExerciseMotionArtwork = memo(function ExerciseMotionArtwork({
  phase = 'middle',
  decorative = true,
  ...props
}: ExerciseMotionArtworkProps) {
  const { exercise, label } = props;
  const cachedFrame = getExerciseArtworkFrame(exercise, phase);
  const [failedFrameSrc, setFailedFrameSrc] = useState<string | null>(null);
  const artworkProps = { ...props, phase, decorative };

  if (cachedFrame && cachedFrame.src !== failedFrameSrc) {
    const dedicated = hasDedicated3DExerciseRig(exercise);
    const phaseLabel =
      cachedFrame.labelKo ??
      (phase === 'start' ? '시작 자세' : phase === 'middle' ? '정점 자세' : '종료 자세');
    const frameLabel = label ?? `${exercise.nameKo} · ${phaseLabel} · 3D 동작 도해`;
    return (
      <ExerciseMotionArtworkSurface
        {...artworkProps}
        frameLabel={frameLabel}
        scope={dedicated ? 'catalog-authored-pattern' : 'representative-pattern'}
        renderer="cached-native-image"
      >
        <img
          className="movement-phase-diagram-svg pf-3d-rendered-artwork"
          src={cachedFrame.src}
          alt={decorative ? '' : frameLabel}
          width={cachedFrame.width}
          height={cachedFrame.height}
          loading="lazy"
          decoding="async"
          data-exercise-id={exercise.id}
          data-phase={phase}
          data-3d-rendered="true"
          onError={() => setFailedFrameSrc(cachedFrame.src)}
        />
      </ExerciseMotionArtworkSurface>
    );
  }
  return <DeferredNativeArtwork {...artworkProps} />;
});
