import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Apparatus3dRigPreviewCard } from '../components/Apparatus3dRigPreviewCard';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';

describe('Parallel Track 4 — Visual Showcase Mockup & 3D Rig Motion Accessibility', () => {
  it('매트 수업에서 선택한 동작의 단계별 그림과 상세 화면을 연결한다', () => {
    const exercise = INITIAL_EXERCISES.find((item) => item.apparatus === 'mat')!;
    const open = vi.fn();
    const { container } = render(
      <Apparatus3dRigPreviewCard
        apparatus={exercise.apparatus}
        bodyPosition={exercise.bodyPosition}
        exercise={exercise}
        onOpenExercise={open}
      />,
    );
    expect(screen.queryByRole('group', { name: '보는 방향' })).toBeNull();
    const starting = container.querySelector('img[data-phase="start"]');
    expect(starting).toHaveAttribute('data-exercise-id', exercise.id);
    const startSrc = starting?.getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: '움직인 자세' }));
    const middle = container.querySelector('img[data-phase="middle"]');
    expect(middle).toHaveAttribute('data-exercise-id', exercise.id);
    expect(middle?.getAttribute('src')).not.toBe(startSrc);
    fireEvent.click(screen.getByRole('button', { name: '자세히 보기' }));
    expect(open).toHaveBeenCalledWith(exercise);
  });

  it('ships 06-parallel-full-suite-showcase.html and renders motion-safe Korean guide note in Apparatus3dRigPreviewCard', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'docs/design-system-mockups/06-parallel-full-suite-showcase.html',
        ),
      ),
    ).toBe(true);

    render(
      <Apparatus3dRigPreviewCard
        apparatus="reformer"
        bodyPosition="supine"
        springsLabel="1R 1B"
        exerciseTitleKo="풋워크"
      />,
    );

    expect(screen.getByTestId('apparatus-3d-rig-preview')).toBeInTheDocument();
    expect(screen.getByTestId('rig-3d-motion-safe-note')).toBeInTheDocument();
  });
});
