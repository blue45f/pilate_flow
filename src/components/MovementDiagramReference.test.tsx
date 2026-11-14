import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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
  expect(container.querySelectorAll('svg.movement-phase-diagram-svg')).toHaveLength(1);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByText(/정지 그림 한 장/)).toBeInTheDocument();
  expect(container.querySelector('svg.movement-phase-diagram-svg')).toHaveAttribute('data-active-side', 'right');
  expect(screen.getByText(/수업안의 좌우 설정과 연결되지/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /재생/ })).not.toBeInTheDocument();
  expect(JSON.stringify(exercise)).toBe(before);
  expect(usePilatesStore.getState()).toBe(store);
  expect(JSON.stringify(localStorage)).toBe(storage);
});

it('keeps a custom ID on the generic reference fallback without borrowing a catalog diagram', async () => {
  const exercise = { ...INITIAL_EXERCISES[0], id: 'my-original-exercise' };
  const { container } = render(<MovementDiagramReference exercise={exercise} />);
  await open(container);
  expect(screen.getByText(/일치하는 도해가 아직 없어요/)).toBeInTheDocument();
  expect(container.querySelector('svg')).toBeNull();
  expect(screen.queryByTestId('unmodeled-motion-reference')).not.toBeInTheDocument();
  expect(screen.getByTestId('movement-diagram-fallback-disclosure')).not.toHaveAttribute('open');
});

it('shows an apparatus-only notice for a modified catalog apparatus without borrowing its authored pose', () => {
  const exercise = { ...INITIAL_EXERCISES[0], apparatus: 'chair' as const };
  const { container } = render(<MovementDiagramReference exercise={exercise} />);
  const details = container.querySelector('details')!;
  expect(screen.getByText('수정한 동작의 도해 안내')).toBeVisible();
  details.open = true;
  fireEvent(details, new Event('toggle'));

  const notice = screen.getByRole('region', { name: `${exercise.nameKo} 전용 도해 안내` });
  expect(notice).toBeVisible();
  expect(notice).toHaveAttribute('data-exercise-id', exercise.id);
  expect(notice).toHaveAttribute('data-match-scope', 'unmodeled-exercise');
  expect(notice).toHaveAttribute('data-native-motion-available', 'false');
  expect(within(notice).getByRole('img')).toHaveAccessibleName(
    `${exercise.nameKo} · 전용 도해 없음 · 운다 체어 기구 안내 이미지`,
  );
  expect(within(notice).getByText('기구 안내')).toBeVisible();
  expect(
    within(notice).getByText(/기구나 시작 자세가 변경되어 기존 도해를 표시하지 않습니다/),
  ).toBeVisible();
  expect(container.querySelectorAll('svg.pf-apparatus-illustration-svg')).toHaveLength(1);
  expect(notice.querySelector('svg')).toHaveClass('pf-apparatus-illustration-svg');
  expect(
    container.querySelector(
      '[data-layer="kinematic-figure"], [data-joint-node], .movement-phase-diagram-svg, img[src^="/motion-artwork-v2/"]',
    ),
  ).toBeNull();
  expect(screen.queryByRole('region', { name: '참고 자세 정지 그림' })).not.toBeInTheDocument();
  expect(screen.queryByTestId('movement-diagram-fallback-disclosure')).not.toBeInTheDocument();
  expect(screen.queryByText('출처 대조 기록')).not.toBeInTheDocument();
});

it('resets disclosure when the displayed exercise changes', async () => {
  const { container, rerender } = render(
    <MovementDiagramReference exercise={INITIAL_EXERCISES[0]} />,
  );
  await open(container);
  rerender(<MovementDiagramReference exercise={INITIAL_EXERCISES[1]} />);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  await open(container);
  expect(container.querySelectorAll('svg.movement-phase-diagram-svg')).toHaveLength(1);
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
  expect(container.querySelectorAll('svg.movement-phase-diagram-svg')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: /재생/ })).not.toBeInTheDocument();
});

it('provides matched source comparison records and specialized track diagram disclosures across all 98 catalog exercises', async () => {
  expect(INITIAL_EXERCISES).toHaveLength(158);
  for (const exercise of [
    INITIAL_EXERCISES.find((item) => item.id === 'original-reformer-supine-breath')!,
    INITIAL_EXERCISES.find((item) => item.id === 'original-reformer-parallel-footwork')!,
    INITIAL_EXERCISES.find((item) => item.id === 'original-reformer-supine-arm-press')!,
    INITIAL_EXERCISES.find((item) => item.id === 'original-barrel-supported-side-bend')!,
  ]) {
    const { container, unmount } = render(<MovementDiagramReference exercise={exercise} />);
    await open(container);
    expect(screen.getByText('출처 대조 기록')).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="movement-diagram-extended-verification-disclosure"]'),
    ).not.toBeNull();
    unmount();
  }
});

