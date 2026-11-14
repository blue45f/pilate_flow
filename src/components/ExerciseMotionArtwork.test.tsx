import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { usePilatesStore } from '../store/usePilatesStore';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import type { SequenceStep } from '../types/pilates';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { ExerciseThumbnailBadge } from './ExerciseThumbnailBadge';
import { InlineExerciseFinder } from './InlineExerciseFinder';
import { OnePageVisual3DCueSheet } from './OnePageVisual3DCueSheet';
import { StudioCommandPalette } from './StudioCommandPalette';
import { VisualSequenceFilmstrip } from './VisualFlowComponents';

const bridge = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-mat-bridge')!;
const footwork = INITIAL_EXERCISES.find((exercise) => exercise.id === 'ex-footwork-01')!;
const beforeStore = usePilatesStore.getState();
const steps: SequenceStep[] = [bridge, footwork].map((exercise, index) => ({
  stepId: `artwork-step-${index}`,
  exerciseId: exercise.id,
  order: index + 1,
  blockCategory: exercise.blockCategory,
  durationMin: 3,
  selectedLayer: 'standard',
}));

beforeEach(() => {
  window.localStorage.clear();
  usePilatesStore.setState({
    exercises: [bridge, footwork],
    activeSteps: [],
    activeSequenceId: undefined,
  });
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(beforeStore, true);
  vi.restoreAllMocks();
});

describe('shared exercise artwork across planning surfaces', () => {
  it('uses renderer-generated WebP cache frames with the same model and distinct phase sources', () => {
    const view = render(
      <ExerciseMotionArtwork exercise={bridge} phase="start" decorative={false} />,
    );
    const sources: string[] = [];
    for (const phase of ['start', 'middle', 'end'] as const) {
      view.rerender(<ExerciseMotionArtwork exercise={bridge} phase={phase} decorative={false} />);
      const art = screen.getByRole('img');
      const frame = getExerciseArtworkFrame(bridge, phase)!;
      expect(art).toHaveAttribute('src', frame.src);
      expect(art).toHaveAttribute('data-exercise-id', bridge.id);
      expect(art).toHaveAttribute('data-phase', phase);
      expect(art).toHaveAttribute('width', '640');
      expect(art).toHaveAttribute('height', '400');
      expect(art).toHaveAttribute('loading', 'lazy');
      expect(art).toHaveAttribute('decoding', 'async');
      expect(frame.src).toMatch(/^\/motion-artwork-v2\/.+\.webp$/);
      sources.push(frame.src);
    }
    expect(new Set(sources).size).toBe(3);
    expect(view.container.querySelector('svg')).toBeNull();
    expect(view.container.firstElementChild).toHaveAttribute(
      'data-professional-review',
      'unreviewed',
    );
    expect(view.container.firstElementChild).toHaveAttribute(
      'data-artwork-renderer',
      'cached-native-image',
    );
  });

  it('falls back to the same native model when a cached image cannot load', async () => {
    const view = render(
      <ExerciseMotionArtwork exercise={bridge} phase="middle" decorative={false} />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(view.container.querySelector('img')).toBeNull();
    await waitFor(() => expect(screen.getByRole('img')).toHaveAttribute('data-phase', 'middle'));
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).not.toBeNull();
    expect(view.container.firstElementChild).toHaveAttribute(
      'data-artwork-renderer',
      'inline-native-svg',
    );
    expect(view.container.querySelector('[data-layer="movement-direction"]')).toBeNull();
    view.rerender(<ExerciseMotionArtwork exercise={bridge} phase="end" decorative={false} />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      getExerciseArtworkFrame(bridge, 'end')!.src,
    );
  });

  it('keeps decorative artwork silent and identifies an unmodeled exercise as a representative pattern', async () => {
    const custom = { ...footwork, id: 'custom-reformer-pattern', nameKo: '새 수업 동작' };
    const view = render(<ExerciseMotionArtwork exercise={custom} />);
    expect(screen.queryByRole('img')).toBeNull();
    await waitFor(() =>
      expect(view.container.firstElementChild).toHaveAttribute(
        'data-match-scope',
        'representative-pattern',
      ),
    );
    expect(screen.getByText('대표 패턴')).toBeVisible();
    expect(
      screen.getByText(getCatalogContinuousMotionAsset(custom)!.visualAsset.archetypeTitleKo),
    ).toBeVisible();
    view.rerender(<ExerciseMotionArtwork exercise={custom} decorative={false} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      `${getCatalogContinuousMotionAsset(custom)!.visualAsset.archetypeTitleKo} · 정점 자세 · 대표 패턴 참고`,
    );
  });

  it('shows a neutral apparatus and visible video label when an expanded movement has no authored pose', () => {
    const expanded = INITIAL_EXERCISES.find(
      (exercise) => exercise.id === 'expanded-mat-leg-pull-front',
    )!;
    const view = render(<ExerciseMotionArtwork exercise={expanded} decorative={false} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      `${expanded.nameKo} · 영상으로 동작 확인 · 기구 안내 이미지`,
    );
    expect(view.container.firstElementChild).toHaveAttribute(
      'data-match-scope',
      'source-video-only',
    );
    expect(view.container.firstElementChild).not.toHaveAttribute('data-motion-phase');
    expect(screen.getByText('영상 참고')).toBeVisible();
    expect(view.container.querySelector('.pf-apparatus-illustration-svg')).not.toBeNull();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
  });

  it('renders distinct exercise identities in the class filmstrip using one static figure per step', () => {
    const view = render(<VisualSequenceFilmstrip steps={steps} exercises={[bridge, footwork]} />);
    const frames = view.container.querySelectorAll('.exercise-motion-artwork');
    expect([...frames].map((frame) => frame.getAttribute('data-exercise-id'))).toEqual([
      bridge.id,
      footwork.id,
    ]);
    expect(view.container.querySelectorAll('.movement-phase-diagram-svg')).toHaveLength(2);
    expect(view.container.querySelectorAll('img[src^="/motion-artwork-v2/"]')).toHaveLength(2);
  });

  it('uses the same cached mini badge and does not invent a phase strip for source-only movements', () => {
    const view = render(<ExerciseThumbnailBadge exercise={bridge} showPhaseStrip />);
    expect(view.container.querySelectorAll('.exercise-motion-artwork')).toHaveLength(3);
    expect(view.container.querySelectorAll('img[src^="/motion-artwork-v2/"]')).toHaveLength(3);
    const expanded = INITIAL_EXERCISES.find(
      (exercise) => exercise.id === 'expanded-mat-leg-pull-front',
    )!;
    view.rerender(<ExerciseThumbnailBadge exercise={expanded} showPhaseStrip />);
    expect(
      view.container.querySelector('[data-testid="exercise-thumbnail-phase-strip"]'),
    ).toBeNull();
    expect(view.container.querySelectorAll('.exercise-motion-artwork')).toHaveLength(1);
    expect(screen.getByText('영상 참고')).toBeVisible();
    expect(view.container.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
  });

  it('prints each cue-sheet row with the same exercise art instead of an apparatus-family image', () => {
    render(
      <OnePageVisual3DCueSheet
        title="공통 동작 도해"
        apparatus="mixed"
        level="1.0"
        steps={steps}
        exercises={[bridge, footwork]}
        showPrintButton={false}
      />,
    );
    const rows = screen.getAllByTestId('visual-1p-cuesheet-row');
    expect(rows).toHaveLength(2);
    rows.forEach((row, index) => {
      expect(row.querySelector('.exercise-motion-artwork')).toHaveAttribute(
        'data-exercise-id',
        steps[index].exerciseId,
      );
      expect(row.querySelector('img')).toHaveAttribute(
        'src',
        getExerciseArtworkFrame([bridge, footwork][index], 'middle')!.src,
      );
    });
  });

  it('uses the same native figure for finder result cards', () => {
    const view = render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    const thumbnails = view.container.querySelectorAll('.ief-studio3d-thumb');
    expect(thumbnails.length).toBeGreaterThan(0);
    thumbnails.forEach((thumbnail) => {
      expect(thumbnail).toHaveClass('exercise-motion-artwork');
      expect(thumbnail.querySelector('svg')).toBeNull();
      expect(thumbnail.querySelector('img')?.getAttribute('src')).toMatch(
        /^\/motion-artwork-v2\/.+\.webp$/,
      );
    });
  });

  it('keeps quick-search exercise previews on the same model without changing action names', () => {
    render(
      <StudioCommandPalette
        open
        onClose={vi.fn()}
        onNavigateTab={vi.fn()}
        onLoadSequence={vi.fn()}
        onSwitchPortalRole={vi.fn()}
        onInspectExercise3D={vi.fn()}
        onOpenNewIdea={vi.fn()}
        canStartLiveStage={false}
      />,
    );
    const row = screen.getByTestId(`cmdk-ex-${footwork.id}`);
    expect(row.querySelector('.pf-cmdk-exercise-thumb')).toHaveClass('exercise-motion-artwork');
    expect(row.querySelector('.exercise-motion-artwork')).toHaveAttribute(
      'data-exercise-id',
      footwork.id,
    );
    expect(within(row).getAllByRole('button').length).toBeGreaterThan(0);
  });
});
