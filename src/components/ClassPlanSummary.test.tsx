import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { SequenceStep } from '../types/pilates';
import { usePilatesStore } from '../store/usePilatesStore';
import { ClassPlanSummary } from './ClassPlanSummary';

afterEach(cleanup);
const steps: SequenceStep[] = [
  {
    stepId: 'summary-one',
    order: 0,
    exerciseId: INITIAL_EXERCISES[0].id,
    blockCategory: 'warmup',
    durationMin: 5,
    selectedLayer: 'standard',
    sideMode: 'left',
  },
];
const props = { title: '읽기 전용 수업', steps, exercises: INITIAL_EXERCISES, targetMinutes: 5 };

it('stays closed by default and only reads the supplied plan when explicitly opened', async () => {
  const before = JSON.stringify(props);
  const store = usePilatesStore.getState();
  const storage = JSON.stringify(localStorage);
  const { container } = render(<ClassPlanSummary {...props} />);
  expect(screen.queryByRole('region', { name: '수업안 편성 요약' })).not.toBeInTheDocument();
  const details = container.querySelector('details')!;
  details.open = true;
  fireEvent(details, new Event('toggle'));
  await screen.findByRole('region', { name: '수업안 편성 요약' });
  expect(screen.getByText(/확인하지 않아도 저장하거나/)).toBeInTheDocument();
  expect(screen.getByText('계획 시간')).toBeInTheDocument();
  expect(screen.getByText('좌우 편성')).toBeInTheDocument();
  expect(screen.getByText(/왼쪽 1개/)).toBeInTheDocument();
  expect(screen.queryByText(/균등하게 편성/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  details.open = false;
  fireEvent(details, new Event('toggle'));
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: '수업안 편성 요약' })).not.toBeInTheDocument(),
  );
  expect(JSON.stringify(props)).toBe(before);
  expect(usePilatesStore.getState()).toBe(store);
  expect(JSON.stringify(localStorage)).toBe(storage);
});
