import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { ExerciseMotionArtworkProps } from './ExerciseMotionArtworkSurface';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';

const loader = vi.hoisted(() => ({ ready: vi.fn(), load: vi.fn() }));
vi.mock('../utils/lazyExerciseArtwork', () => ({
  getLoadedNativeExerciseArtwork: loader.ready,
  loadNativeExerciseArtwork: loader.load,
}));
const known = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!;
const custom = { ...known, id: 'custom-artwork-movement' };
const Native = ({ exercise, phase }: ExerciseMotionArtworkProps) => (
  <svg role="img" aria-label={exercise.nameKo} data-exercise-id={exercise.id} data-phase={phase} />
);

beforeEach(() => {
  loader.ready.mockReset().mockReturnValue(null);
  loader.load.mockReset();
});
afterEach(cleanup);

describe('deferred native artwork lifecycle', () => {
  it('keeps cache hits and source-only movements out of the native loader', () => {
    const view = render(<ExerciseMotionArtwork exercise={known} />);
    expect(view.container.querySelector('img[src^="/motion-artwork-v2/"]')).not.toBeNull();
    expect(loader.load).not.toHaveBeenCalled();
    const sourceOnly = INITIAL_EXERCISES.find((item) => item.id === 'expanded-mat-leg-pull-front')!;
    view.rerender(<ExerciseMotionArtwork exercise={sourceOnly} />);
    expect(screen.getByText('영상 참고')).toBeInTheDocument();
    expect(loader.load).not.toHaveBeenCalled();
    view.rerender(<ExerciseMotionArtwork exercise={{ ...known, apparatus: 'chair' }} />);
    expect(screen.getByText('수정한 동작 · 전용 도해 없음')).toBeInTheDocument();
    expect(loader.load).not.toHaveBeenCalled();
  });

  it('shows an honest loading state after a cache failure and reveals the native frame when ready', async () => {
    let finish!: (module: { default: typeof Native }) => void;
    loader.load.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(
      <ExerciseMotionArtwork exercise={known} phase="middle" decorative={false} />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(view.container.firstElementChild).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('불러오는 중')).toBeInTheDocument();
    await act(async () => {
      finish({ default: Native });
    });
    expect(screen.getByRole('img')).toHaveAttribute('data-phase', 'middle');
    expect(screen.queryByText('불러오는 중')).toBeNull();
  });

  it('keeps the neutral fallback after a failed import', async () => {
    loader.load.mockRejectedValue(new Error('offline'));
    const view = render(<ExerciseMotionArtwork exercise={custom} />);
    await screen.findByText('동작 도해를 불러오지 못했어요');
    expect(view.container.firstElementChild).toHaveAttribute(
      'data-match-scope',
      'unavailable-native-artwork',
    );
    expect(view.container.firstElementChild).not.toHaveAttribute('aria-busy');
    expect(loader.load).toHaveBeenCalledTimes(1);
  });

  it('uses an already prepared renderer immediately on another mount', async () => {
    loader.ready.mockReturnValue({ default: Native });
    const view = render(<ExerciseMotionArtwork exercise={custom} decorative={false} />);
    expect(screen.getByRole('img')).toHaveAttribute('data-exercise-id', custom.id);
    expect(screen.queryByText('불러오는 중')).toBeNull();
    await waitFor(() => expect(loader.load).not.toHaveBeenCalled());
    view.unmount();
    render(
      <ExerciseMotionArtwork
        exercise={{ ...custom, id: 'second-custom-artwork' }}
        decorative={false}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('data-exercise-id', 'second-custom-artwork');
    expect(loader.load).not.toHaveBeenCalled();
  });
});
