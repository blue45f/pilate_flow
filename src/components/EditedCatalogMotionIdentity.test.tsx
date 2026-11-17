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

describe('edited catalogue motion identity with procedural 3D synthesis', () => {
  it.each(changedIdentities)(
    'rejects the cached supine pose after an existing ID changes %s and synthesizes a procedural 3D pose',
    async (_, exercise) => {
      expect(getExerciseArtworkFrame(exercise)).toBeUndefined();
      expect(getCatalogContinuousMotionAsset(exercise)).toBeNull();
      expect(buildCatalogContinuousMotionAsset(exercise)).toBeNull();
      expect(getMovementVisualAsset(exercise)).toBeNull();

      const view = render(<ExerciseMotionArtwork exercise={exercise} decorative={false} />);
      await waitFor(() =>
        expect(view.container.firstElementChild).toHaveAttribute(
          'data-match-scope',
          'representative-pattern',
        ),
      );
      expect(view.container.querySelector('img[src^="/motion-artwork-v2/"]')).toBeNull();
      expect(view.container.querySelector('svg[data-3d-projected="true"]')).not.toBeNull();
      expect(screen.getByText('대표 패턴')).toBeVisible();
    },
  );

  it.each(changedIdentities)(
    'synthesizes procedural 3D playback for a changed %s without claiming dedicated catalog review',
    (_, exercise) => {
      render(<Studio3DMotionHeroCard exercise={exercise} compact />);
      const hero = screen.getByTestId('studio-3d-motion-hero-card');
      expect(hero).toHaveAttribute('data-match-scope', 'representative-pattern');
      expect(hero).toHaveAttribute('data-3d-rig-scope', 'procedural-3d-synthesis');
      expect(screen.getByTestId('studio-motion-study-player')).toBeVisible();
      expect(screen.getByRole('button', { name: '3D 모션' })).toBeVisible();
      expect(screen.getByRole('button', { name: '3D 자세 프레임' })).toBeVisible();
      expect(screen.queryByRole('link', { name: /제작자 동작 영상/ })).toBeNull();
    },
  );

  it.each(changedIdentities)(
    'keeps legacy 2D clinical references neutral while upgrading live & 3D viewport to procedural 3D for a changed %s',
    (_, exercise) => {
      const scheduleFrame = vi.spyOn(window, 'requestAnimationFrame');
      const view = render(<MovementVisualGuideCard exercise={exercise} />);
      expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();
      expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();

      view.rerender(<MovementDiagramReference exercise={exercise} />);
      expect(screen.getByTestId('unmodeled-motion-reference')).toBeInTheDocument();
      expect(screen.getByText('수정한 동작의 도해 안내')).toBeVisible();

      view.rerender(
        <MovementDifferenceCompareView leftExercise={exercise} rightExercise={bridge} />,
      );
      expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();

      view.rerender(<MotionReferencePlayer exercise={exercise} exerciseId={bridge.id} active />);
      expect(screen.getByTestId('unmodeled-motion-reference')).toBeVisible();

      view.rerender(<LiveStageKinematicDiagram exercise={exercise} running={false} />);
      expect(screen.getByTestId('live-stage-kinematic-diagram')).toHaveAttribute(
        'data-3d-rig-scope',
        'procedural-3d-synthesis',
      );

      view.rerender(<StudioInteractive3DViewport exercise={exercise} />);
      expect(screen.getByTestId('studio-interactive-3d-viewport')).toHaveAttribute(
        'data-3d-rig-scope',
        'procedural-3d-synthesis',
      );
      expect(view.container.querySelector('canvas')).not.toBeNull();
      expect(scheduleFrame).not.toHaveBeenCalled();
    },
  );

  it.each(changedIdentities)(
    'rejects raw 2D drawing fallbacks with a changed %s',
    (_, exercise) => {
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
    },
  );

  it('retains dedicated 3D catalogue artwork and identifies a new custom ID as a procedural representative pattern', async () => {
    const renamed = { ...bridge, nameKo: '내 브리지 메모' };
    expect(getCatalogContinuousMotionAsset(renamed)).toBe(getCatalogContinuousMotionAsset(bridge));
    expect(getMovementVisualAsset(renamed)).toBe(getMovementVisualAsset(bridge));
    const view = render(<ExerciseMotionArtwork exercise={renamed} />);
    expect(view.container.firstElementChild).toHaveAttribute(
      'data-artwork-renderer',
      'cached-native-image',
    );

    const custom = { ...bridge, id: 'custom-bridge-reference' };
    expect(getCatalogContinuousMotionAsset(custom)?.visualAsset.apparatus).toBe(custom.apparatus);
    view.rerender(<ExerciseMotionArtwork exercise={custom} />);
    await waitFor(() =>
      expect(view.container.firstElementChild).toHaveAttribute(
        'data-match-scope',
        'representative-pattern',
      ),
    );
    expect(screen.getByText('대표 패턴')).toBeVisible();
  });

  it('reconstructs dedicated 3D motion for expanded movements while keeping MotionReferencePlayer guard intact', () => {
    const expanded = INITIAL_EXERCISES.find(
      (exercise) => exercise.id === 'expanded-mat-leg-pull-front',
    )!;
    const view = render(<Studio3DMotionHeroCard exercise={expanded} compact />);
    expect(screen.getByTestId('studio-3d-motion-hero-card')).toHaveAttribute(
      'data-match-scope',
      'catalog-authored-pattern',
    );
    expect(screen.getByTestId('studio-3d-motion-hero-card')).toHaveAttribute(
      'data-3d-rig-scope',
      'dedicated-3d-rig',
    );
    const editedSource = {
      ...expanded,
      youtube: {
        ...expanded.youtube,
        videoId: 'edited-video',
        url: 'https://www.youtube.com/watch?v=edited-video',
      },
    };
    view.rerender(<MotionReferencePlayer exercise={editedSource} exerciseId={expanded.id} />);
    expect(screen.getByTestId('motion-source-reference')).toBeVisible();
    expect(screen.queryByRole('link', { name: /제작자 동작 영상/ })).toBeNull();
  });
});
