import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_YOUTUBE_VIDEO_POOL } from '../data/exerciseYouTubeCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import { ExerciseAtlasView } from './ExerciseAtlasView';

const initial = usePilatesStore.getState();
const native = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-chest-lift')!;
const sourceOnly = INITIAL_EXERCISES.find((item) => item.id === 'expanded-mat-leg-pull-front')!;

beforeEach(() => {
  window.sessionStorage.clear();
  usePilatesStore.setState(
    {
      ...initial,
      exercises: [native, sourceOnly],
      activeSteps: [],
      exerciseBrowseScope: 'all',
      activeApparatus: 'mat',
      ownedEquipment: ['mat'],
      ownedProps: [],
      historyLogs: [],
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(initial, true);
  window.sessionStorage.clear();
});

describe('Atlas artwork and complete video collection', () => {
  it('opens the complete video collection by tab and unloads its player when returning to notes with the keyboard', () => {
    const { container } = render(
      <ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );
    const before = usePilatesStore.getState();
    const videoTab = screen.getByRole('tab', {
      name: `동작 영상 ${VERIFIED_YOUTUBE_VIDEO_POOL.length}`,
    });
    fireEvent.click(videoTab);
    expect(videoTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tabpanel', { name: `동작 영상 ${VERIFIED_YOUTUBE_VIDEO_POOL.length}` }),
    ).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /영상 열기$/ })[0]);
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    fireEvent.keyDown(videoTab, { key: 'Home' });
    expect(screen.getByRole('tab', { name: '동작 노트 2' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: '동작 노트 2' })).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
  });

  it('shows the same authored frame for native cards and a real video action instead of an unrelated pose for new movements', () => {
    const onOpen = vi.fn();
    render(<ExerciseAtlasView initialView="tools" onOpenYouTubePreview={onOpen} onOpenClipper={vi.fn()} />);
    const nativeCard = screen
      .getByRole('button', { name: `${native.nameKo} 상세 보기` })
      .closest('.movement-card')!;
    expect(nativeCard.querySelector('.exercise-motion-artwork img')).toHaveAttribute(
      'src',
      getExerciseArtworkFrame(native)!.src,
    );
    const sourceCard = screen
      .getByRole('button', { name: `${sourceOnly.nameKo} 상세 보기` })
      .closest('.movement-card')!;
    expect(sourceCard.querySelector('.exercise-motion-artwork')).toHaveAttribute(
      'data-match-scope',
      'source-video-only',
    );
    expect(sourceCard.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    expect(
      within(sourceCard as HTMLElement).queryByRole('button', { name: /기구학 도해 보기/ }),
    ).toBeNull();
    fireEvent.click(
      within(sourceCard as HTMLElement).getByRole('button', {
        name: `${sourceOnly.nameKo} 영상 보기`,
      }),
    );
    expect(onOpen).toHaveBeenLastCalledWith(sourceOnly);

    fireEvent.click(screen.getByRole('button', { name: `${sourceOnly.nameKo} 비교 담기` }));
    fireEvent.click(screen.getByRole('button', { name: `${native.nameKo} 비교 담기` }));
    const sourceComparison = screen.getByTestId(`atlas-compare-card-${sourceOnly.id}`);
    expect(sourceComparison.querySelectorAll('.atlas-compare-3d-frame')).toHaveLength(1);
    expect(sourceComparison).toHaveTextContent('제작자 영상으로 동작 확인');
    expect(sourceComparison.querySelector('[data-motion-phase]')).toBeNull();
    fireEvent.click(
      within(sourceComparison).getByRole('button', {
        name: `비교함에서 ${sourceOnly.nameKo} 영상 보기`,
      }),
    );
    expect(onOpen).toHaveBeenLastCalledWith(sourceOnly);
  });
});
