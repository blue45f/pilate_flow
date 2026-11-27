import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ExerciseVideoStudyMoments } from './ExerciseVideoStudyMoments';

it('opens only documented moments inside the selected interval and identifies their source', () => {
  const { rerender } = render(
    <dl>
      <ExerciseVideoStudyMoments videoId="3GBwBBt63Xw" startSec={140} endSec={243} />
    </dl>,
  );
  expect(screen.getByText('제작자가 나눈 구간')).toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link')).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=3GBwBBt63Xw&t=147s',
  );
  rerender(
    <dl>
      <ExerciseVideoStudyMoments videoId="M2Y9FWJYO0k" />
    </dl>,
  );
  expect(screen.getByText('자동 자막에서 확인한 설명')).toBeInTheDocument();
  rerender(
    <dl>
      <ExerciseVideoStudyMoments videoId="unknown" />
    </dl>,
  );
  expect(screen.queryByRole('link')).toBeNull();
});
