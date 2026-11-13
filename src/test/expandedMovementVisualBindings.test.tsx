import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MovementPhaseDiagramSvg, MovementTriptychDiagramSvg } from '../components/MovementPhaseDiagramSvg';
import { EXPANDED_MOVEMENTS, getExpandedMovementSource } from '../data/expandedMovements';
import { EXPANDED_MOVEMENT_VISUAL_BINDINGS, getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';

describe('expanded movement image eligibility', () => {
  it('requires a named-action binding instead of treating a broad body-position fallback as an exact motion', () => {
    expect(Object.keys(EXPANDED_MOVEMENT_VISUAL_BINDINGS)).toHaveLength(EXPANDED_MOVEMENTS.length);
    for (const exercise of EXPANDED_MOVEMENTS) {
      const binding = getExpandedMovementVisualBinding(exercise)!;
      const source = getExpandedMovementSource(exercise)!;
      expect(binding.nativeMotionAvailable, exercise.id).toBe(false);
      expect(binding.presentation).toBe('creator-video-only');
      expect(binding.sourceUrl).toBe(source.sourceUrl);
      expect(binding.videoId).toBe(exercise.youtube.videoId);
      expect(binding.missingPoseFeatureKo).not.toBe('동작별 자세와 기구 접촉');
      expect(binding.missingPoseFeatureKo.length).toBeGreaterThan(12);
    }
  });

  it('prevents direct static SVG callers from rendering fallback anatomy for every new movement', () => {
    for (const exercise of EXPANDED_MOVEMENTS) {
      const asset = getMovementVisualAsset(exercise)!;
      const markup = renderToStaticMarkup(<MovementPhaseDiagramSvg asset={asset} phase="middle" />);
      expect(markup, exercise.id).toContain('data-native-motion-available="false"');
      expect(markup).toContain('creator-video-only');
      expect(markup).not.toContain('data-joint-node');
      expect(markup).not.toContain('data-limb-depth');
      expect(markup).not.toContain('data-archetype-id');
    }
  });

  it('does not invent a three-phase sequence or generic motion delta in a direct triptych', () => {
    const asset = getMovementVisualAsset('expanded-mat-leg-pull-front')!;
    const markup = renderToStaticMarkup(<MovementTriptychDiagramSvg asset={asset} />);
    expect(markup).toContain('제작자 동작 설명 열기');
    expect(markup).not.toContain('data-triptych-phase');
    expect(markup).not.toContain('단계 흐름');
    expect(markup).not.toContain('스완');
  });

  it('keeps future expanded IDs source-only and invalidates source metadata on local edits', () => {
    expect(getExpandedMovementVisualBinding('expanded-mat-future-movement')?.nativeMotionAvailable).toBe(false);
    expect(getExpandedMovementVisualBinding('original-mat-chest-lift')).toBeUndefined();
    const original = EXPANDED_MOVEMENTS[0];
    for (const changed of [
      { ...original, apparatus: 'chair' as const },
      { ...original, youtube: { ...original.youtube, videoId: 'abcdefghijk', url: 'https://www.youtube.com/watch?v=abcdefghijk' } },
    ]) {
      const binding = getExpandedMovementVisualBinding(changed)!;
      expect(binding.nativeMotionAvailable).toBe(false);
      expect(binding.sourceUrl).toBeUndefined();
      expect(binding.videoId).toBeUndefined();
    }
  });
});
