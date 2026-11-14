import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCatalogContinuousMotionAsset,
  getCatalogContinuousMotionAsset,
} from '../data/catalogMotionAssets';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import type { PilatesExercise } from '../types/pilates';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { Studio3DMotionHeroCard } from './Studio3DMotionHeroCard';
import { MovementDiagramReference } from './MovementDiagramReference';
import { MovementDifferenceCompareView, MovementVisualGuideCard } from './MovementVisualGuideCard';
import { LiveStageKinematicDiagram } from './LiveStageKinematicDiagram';
import { MotionReferencePlayer } from './MotionReferencePlayer';
import { StudioInteractive3DViewport } from './StudioInteractive3DViewport';
import { MovementPhaseDiagramSvg, MovementTriptychDiagramSvg } from './MovementPhaseDiagramSvg';

const bridge = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-mat-bridge')!;
const changedIdentities: [string, PilatesExercise][] = [
  ['apparatus', { ...bridge, apparatus: 'chair' }],
  ['body position', { ...bridge, bodyPosition: 'standing' }],
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('edited catalogue motion identity', () => {
  it.each(changedIdentities)('rejects the original pose after an existing ID changes %s', (_, exercise) => {
    expect(getExerciseArtworkFrame(exercise)).toBeUndefined();
    expect(getCatalogContinuousMotionAsset(exercise)).toBeNull();
    expect(buildCatalogContinuousMotionAsset(exercise)).toBeNull();
    expect(getMovementVisualAsset(exercise)).toBeNull();

    const view = render(<ExerciseMotionArtwork exercise={exercise} decorative={false} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(/전용 도해 없음/);
    expect(view.container.firstElementChild).toHaveAttribute('data-match-scope', 'unmodeled-exercise');
    expect(view.container.firstElementChild).toHaveAttribute('data-native-motion-available', 'false');
    expect(view.container.firstElementChild).not.toHaveAttribute('data-motion-phase');
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    expect(view.container.querySelector('img[src^="/motion-artwork-v2/"]')).toBeNull();
    expect(screen.getByText('기구 안내')).toBeVisible();
    expect(screen.queryByText('영상 참고')).toBeNull();
  });

  it.each(changedIdentities)('does not offer playback or pose frames for a changed %s', (_, exercise) => {
    const view = render(<Studio3DMotionHeroCard exercise={exercise} compact />);
    const hero = screen.getByTestId('studio-3d-motion-hero-card');
    expect(hero).toHaveAttribute('data-match-scope', 'unmodeled-exercise');
    expect(hero).toHaveAttribute('data-motion-mode', 'apparatus-reference');
    expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();
    expect(screen.queryByRole('button', { name: '동작 재생' })).toBeNull();
    expect(screen.queryByRole('button', { name: '자세 프레임' })).toBeNull();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    expect(screen.queryByRole('link', { name: /제작자 동작 영상/ })).toBeNull();
  });

  it.each(changedIdentities)('keeps advanced references and live playback neutral for a changed %s', (_, exercise) => {
    const scheduleFrame = vi.spyOn(window, 'requestAnimationFrame');
    const view = render(<MovementVisualGuideCard exercise={exercise} />);
    expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();

    view.rerender(<MovementDiagramReference exercise={exercise} />);
    expect(screen.getByTestId('unmodeled-motion-reference')).toBeInTheDocument();
    expect(screen.getByText('수정한 동작의 도해 안내')).toBeVisible();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();

    view.rerender(<MovementDifferenceCompareView leftExercise={exercise} rightExercise={bridge} />);
    expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();

    view.rerender(<LiveStageKinematicDiagram exercise={exercise} running />);
    expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    view.rerender(<MotionReferencePlayer exercise={exercise} exerciseId={bridge.id} active />);
    expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();
    expect(screen.queryByRole('slider')).toBeNull();
    view.rerender(<StudioInteractive3DViewport exercise={exercise} />);
    expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();
    expect(view.container.querySelector('canvas')).toBeNull();
    expect(scheduleFrame).not.toHaveBeenCalled();
  });

  it.each(changedIdentities)('rejects raw drawing fallbacks with a changed %s', (_, exercise) => {
    const rawAsset = {
      ...getMovementVisualAsset(bridge)!,
      apparatus: exercise.apparatus,
      bodyPosition: exercise.bodyPosition,
    };
    const view = render(<MovementPhaseDiagramSvg asset={rawAsset} phase="middle" />);
    expect(screen.getByRole('img')).toHaveAccessibleName(/전용 도해 없음/);
    expect(screen.getByRole('img')).toHaveAttribute('data-native-motion-available', 'false');
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    view.rerender(<MovementTriptychDiagramSvg asset={rawAsset} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('retains authored catalogue artwork and identifies a new custom ID as a representative pattern', async () => {
    const renamed = { ...bridge, nameKo: '내 브리지 메모' };
    expect(getCatalogContinuousMotionAsset(renamed)).toBe(getCatalogContinuousMotionAsset(bridge));
    expect(getMovementVisualAsset(renamed)).toBe(getMovementVisualAsset(bridge));
    const view = render(<ExerciseMotionArtwork exercise={renamed} />);
    expect(view.container.firstElementChild).toHaveAttribute('data-artwork-renderer', 'cached-native-image');

    const custom = { ...bridge, id: 'custom-bridge-reference' };
    expect(getCatalogContinuousMotionAsset(custom)?.visualAsset.apparatus).toBe(custom.apparatus);
    view.rerender(<ExerciseMotionArtwork exercise={custom} />);
    await waitFor(() => expect(view.container.firstElementChild).toHaveAttribute('data-match-scope', 'representative-pattern'));
    expect(screen.getByText('대표 패턴')).toBeVisible();
  });

  it('preserves the expanded source-only guard independently of edited catalogue identities', () => {
    const sourceOnly = INITIAL_EXERCISES.find((exercise) => exercise.id === 'expanded-mat-leg-pull-front')!;
    const view = render(<Studio3DMotionHeroCard exercise={sourceOnly} compact />);
    expect(screen.getByTestId('studio-3d-motion-hero-card')).toHaveAttribute('data-match-scope', 'source-video-only');
    expect(screen.getByTestId('motion-source-reference')).toBeVisible();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    expect(screen.queryByTestId('unmodeled-motion-reference')).toBeNull();
    const editedSource = { ...sourceOnly, youtube: { ...sourceOnly.youtube, videoId: 'edited-video', url: 'https://www.youtube.com/watch?v=edited-video' } };
    view.rerender(<MotionReferencePlayer exercise={editedSource} exerciseId={sourceOnly.id} />);
    expect(screen.getByTestId('motion-source-reference')).toBeVisible();
    expect(screen.queryByRole('link', { name: /제작자 동작 영상/ })).toBeNull();
  });
});
