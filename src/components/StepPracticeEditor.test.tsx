import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { StepPracticeEditor } from './StepPracticeEditor';

const original = usePilatesStore.getState();
const movement: SequenceStep = {
  stepId: 'qa-practice-step',
  exerciseId: original.exercises[0].id,
  order: 1,
  blockCategory: 'core',
  durationMin: 4.5,
  explanationSec: 20,
  transitionSec: 15,
  selectedLayer: 'standard',
};

beforeEach(() => {
  usePilatesStore.setState({ ...original, activeSteps: [{ ...movement }], undoStack: [] }, true);
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('teacher-entered repetitions and side choices', () => {
  it('commits both fields only on explicit apply and leaves the entire duration unchanged', () => {
    const { rerender } = render(<StepPracticeEditor index={0} step={movement} />);
    fireEvent.change(screen.getByLabelText('강사가 정한 횟수'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('수행할 쪽'), { target: { value: 'right-then-left' } });
    fireEvent.blur(screen.getByLabelText('강사가 정한 횟수'));
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(movement);
    fireEvent.click(screen.getByRole('button', { name: '횟수·좌우 적용' }));
    const changed = usePilatesStore.getState().activeSteps[0];
    expect(changed).toEqual({ ...movement, repetitions: 12, sideMode: 'right-then-left' });
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<StepPracticeEditor index={0} step={changed} />);
    fireEvent.change(screen.getByLabelText('강사가 정한 횟수'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('수행할 쪽'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '횟수·좌우 적용' }));
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(movement);
    expect(Object.hasOwn(usePilatesStore.getState().activeSteps[0], 'repetitions')).toBe(false);
    expect(Object.hasOwn(usePilatesStore.getState().activeSteps[0], 'sideMode')).toBe(false);
  });

  it('rejects an invalid count atomically without committing the edited side', () => {
    const initial: SequenceStep = { ...movement, repetitions: 8, sideMode: 'left' };
    usePilatesStore.setState({ activeSteps: [initial] });
    render(<StepPracticeEditor index={0} step={initial} />);
    fireEvent.change(screen.getByLabelText('강사가 정한 횟수'), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText('수행할 쪽'), { target: { value: 'right' } });
    fireEvent.click(screen.getByRole('button', { name: '횟수·좌우 적용' }));
    expect(screen.getByRole('alert')).toHaveTextContent('정수');
    expect(usePilatesStore.getState().activeSteps[0]).toBe(initial);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('강사가 정한 횟수'), { target: { value: '1001' } });
    fireEvent.click(screen.getByRole('button', { name: '횟수·좌우 적용' }));
    expect(usePilatesStore.getState().activeSteps[0]).toBe(initial);
  });

  it('disables a locked movement and hides all exercise controls for a rest', () => {
    const locked = { ...movement, locked: true };
    usePilatesStore.setState({ activeSteps: [locked] });
    const { rerender } = render(<StepPracticeEditor index={0} step={locked} />);
    expect(screen.getByLabelText('강사가 정한 횟수')).toBeDisabled();
    expect(screen.getByLabelText('수행할 쪽')).toBeDisabled();
    expect(screen.getByRole('button', { name: '횟수·좌우 적용' })).toBeDisabled();
    const rest: SequenceStep = { ...movement, kind: 'rest', exerciseId: '' };
    rerender(<StepPracticeEditor index={0} step={rest} />);
    expect(screen.queryByLabelText('강사가 정한 횟수')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('수행할 쪽')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps[0]).toBe(locked);
  });

  it('does not apply to another item if a stale index now points at a different step', () => {
    render(<StepPracticeEditor index={0} step={movement} />);
    fireEvent.change(screen.getByLabelText('강사가 정한 횟수'), { target: { value: '10' } });
    const other = { ...movement, stepId: 'qa-other-current-item' };
    usePilatesStore.setState({ activeSteps: [other] });
    fireEvent.click(screen.getByRole('button', { name: '횟수·좌우 적용' }));
    expect(screen.getByRole('alert')).toHaveTextContent('동작 순서가 바뀌었습니다');
    expect(usePilatesStore.getState().activeSteps[0]).toBe(other);
  });
});
