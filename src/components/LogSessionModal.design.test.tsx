import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LogSessionModal } from './LogSessionModal';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
const original = usePilatesStore.getState();
beforeEach(() => {
  const exercise = syntheticPlanningExercise('mat', 'warmup');
  usePilatesStore.setState({
    ...original,
    activeSequenceId: 'qa-modal',
    activeTitle: '합성 수업',
    exercises: [exercise],
    historyLogs: [],
    activeSteps: [
      {
        stepId: 'qa-step',
        exerciseId: exercise.id,
        order: 1,
        durationMin: 4,
        selectedLayer: 'standard',
        blockCategory: 'warmup',
      },
    ],
  });
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original);
});
it('discloses provenance without hiding the plan/actual note or storage warning', () => {
  usePilatesStore.setState({ persistenceError: '합성 저장소 경고' });
  render(<LogSessionModal sequenceId="qa-modal" onClose={vi.fn()} />);
  expect(screen.getByText('완료 이력 보관 방식').closest('details')).not.toHaveAttribute('open');
  expect(
    screen.getByText('계획 시간과 실제 진행 시간은 별도로 보관됩니다.').closest('details'),
  ).toBeNull();
  expect(screen.getByText(/브라우저 저장소 경고/).closest('details')).toBeNull();
});
it('places submit validation beside persistent actions, outside scrollable content', () => {
  render(<LogSessionModal sequenceId="qa-modal" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.submit(screen.getByRole('button', { name: '수업 기록 저장' }).closest('form')!);
  const alert = screen.getByRole('alert');
  expect(alert.closest('.class-log-footer')).not.toBeNull();
  expect(alert.closest('.class-log-content')).toBeNull();
  expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
});
it('keeps optional duration blank and cancellation does not log a session', () => {
  const close = vi.fn();
  render(<LogSessionModal sequenceId="qa-modal" onClose={close} />);
  expect(screen.getByRole('spinbutton', { name: '분' })).toHaveValue(null);
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(close).toHaveBeenCalledOnce();
  expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
});
