import { memo, useEffect, useState, type ComponentType } from 'react';
import { hasDedicated3DExerciseRig } from '../data/universal3dExerciseRigs';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getExerciseArtworkFrame, hasDirectExerciseArtwork } from '../utils/exerciseArtworkCache';
import {
  getLoadedNativeExerciseArtwork,
  loadNativeExerciseArtwork,
} from '../utils/lazyExerciseArtwork';
import { CatalogMotionThumbnail } from './CatalogMotionInteractivePlayer';
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
 * - With hoverPreview (atlas cards), a native catalog motion swaps the static
 *   WebP frame for the live continuous-motion thumbnail while the mouse hovers
 *   the card; at rest the static frame stays. All other mounts keep the stills
 *   above.
 */
export const ExerciseMotionArtwork = memo(function ExerciseMotionArtwork({
  phase = 'middle',
  decorative = true,
  ...props
}: ExerciseMotionArtworkProps) {
  const { exercise, label, hoverPreview } = props;
  const cachedFrame = getExerciseArtworkFrame(exercise, phase);
  const [failedFrameSrc, setFailedFrameSrc] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const artworkProps = { ...props, phase, decorative };

  // Live hover preview (atlas cards only, via hoverPreview): the parent owns
  // the hover state. At rest the static WebP frame stays, preserving native
  // artwork and its provenance; on mouse hover the live continuous-motion
  // thumbnail mounts with autoStart (it mounts under an already-hovering
  // pointer, so its own pointerenter may never fire). Expanded/crawled
  // motions (nativeMotionAvailable === false) keep the WebP frame.
  const motionAsset = hoverPreview ? getCatalogContinuousMotionAsset(exercise.id) : undefined;
  const nativeUnavailable =
    getExpandedMovementVisualBinding(exercise.id)?.nativeMotionAvailable === false;
  const canLivePreview = Boolean(hoverPreview && motionAsset && !nativeUnavailable);

  const handlePointerEnter = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    if (canLivePreview) setHovered(true);
  };
  const handlePointerLeave = () => {
    setHovered(false);
  };

  if (canLivePreview && hovered && motionAsset) {
    return (
      <ExerciseMotionArtworkSurface
        {...artworkProps}
        frameLabel={label ?? `${exercise.nameKo} · 연속 모션 도해 · 마우스를 올리면 재생`}
        scope="catalog-authored-pattern"
        renderer="inline-native-svg"
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <CatalogMotionThumbnail asset={motionAsset} autoStart />
      </ExerciseMotionArtworkSurface>
    );
  }

  if (cachedFrame && cachedFrame.src !== failedFrameSrc) {
    const direct = hasDirectExerciseArtwork(exercise);
    const dedicated = direct || hasDedicated3DExerciseRig(exercise);
    const phaseLabel =
      cachedFrame.labelKo ??
      (phase === 'start' ? '시작 자세' : phase === 'middle' ? '정점 자세' : '종료 자세');
    const frameLabel = label ?? `${exercise.nameKo} · ${phaseLabel} · ${direct ? '3D 동작 도해' : '기본 동작 정지 그림'}`;
    return (
      <ExerciseMotionArtworkSurface
        {...artworkProps}
        frameLabel={frameLabel}
        scope={dedicated ? 'catalog-authored-pattern' : 'representative-pattern'}
        renderer="cached-native-image"
        onPointerEnter={canLivePreview ? handlePointerEnter : undefined}
        onPointerLeave={canLivePreview ? handlePointerLeave : undefined}
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
