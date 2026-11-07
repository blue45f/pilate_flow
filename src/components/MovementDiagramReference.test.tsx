import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { MovementDiagramReference } from './MovementDiagramReference';

afterEach(cleanup);
async function open(container: HTMLElement) {
  const details = container.querySelector('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle'));
  return screen.findByRole('region', { name: '참고 자세 정지 그림' });
}

it('offers only one static reference without changing the source, store or storage', async () => {
  const exercise = INITIAL_EXERCISES[0];
  const before = JSON.stringify(exercise);
  const store = usePilatesStore.getState();
  const storage = JSON.stringify(localStorage);
  const { container } = render(<MovementDiagramReference exercise={exercise} />);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  await open(container);
  expect(container.querySelectorAll('svg')).toHaveLength(1);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText(/정지 그림 한 장/)).toBeInTheDocument();
  expect(container.querySelector('svg')).toHaveAttribute('data-active-side', 'right');
  expect(screen.getByText(/수업안의 좌우 설정과 연결되지/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /재생/ })).not.toBeInTheDocument();
  expect(JSON.stringify(exercise)).toBe(before);
  expect(usePilatesStore.getState()).toBe(store);
  expect(JSON.stringify(localStorage)).toBe(storage);
});

it('does not borrow catalog diagrams for custom IDs or modified catalog apparatus', async () => {
  for (const exercise of [
    { ...INITIAL_EXERCISES[0], id: 'my-original-exercise' },
    { ...INITIAL_EXERCISES[0], apparatus: 'chair' as const },
  ]) {
    const { container, unmount } = render(<MovementDiagramReference exercise={exercise} />);
    await open(container);
    expect(screen.getByText(/일치하는 도해가 아직 없어요/)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    unmount();
  }
});

it('resets disclosure when the displayed exercise changes', async () => {
  const { container, rerender } = render(
    <MovementDiagramReference exercise={INITIAL_EXERCISES[0]} />,
  );
  await open(container);
  rerender(<MovementDiagramReference exercise={INITIAL_EXERCISES[1]} />);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  await open(container);
  expect(container.querySelectorAll('svg')).toHaveLength(1);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});


it('shows specific source comparison without promoting anatomical or professional approval', async () => {
  const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-clam')!;
  const { container } = render(<MovementDiagramReference exercise={exercise} />);
  await open(container);
  const summary = screen.getByText('출처 대조 기록');
  expect(summary.closest('details')).not.toHaveAttribute('open');
  expect(screen.getByText(/오픈 북의 팔·몸통 회전을 제거/)).toBeInTheDocument();
  expect(screen.getByText(/2D 좌표·가동범위/)).toBeInTheDocument();
  expect(screen.getByText('South Tees NHS · The clam')).toHaveAttribute('href', 'https://www.southtees.nhs.uk/resources/the-clam/');
  expect(container.querySelectorAll('svg')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: /재생/ })).not.toBeInTheDocument();
});
