import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceOrderCard } from './SequenceOrderCard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';

const original = usePilatesStore.getState();
const steps: SequenceStep[] = ['a', 'b', 'c'].map((stepId, index) => ({
  stepId,
  exerciseId: stepId,
  order: index + 1,
  blockCategory: 'warmup',
  durationMin: 2,
  selectedLayer: 'standard',
}));
const notice = vi.fn();
const pointer = (element: HTMLElement, type: string, x = 0, y = 0) => {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  fireEvent(element, event);
};
function Board() {
  const items = usePilatesStore((state) => state.activeSteps);
  return (
    <>
      {items.map((step, index) => (
        <SequenceOrderCard
          key={step.stepId}
          step={step}
          index={index}
          label={step.stepId}
          onNotice={notice}
        >
          <p>{step.stepId}</p>
        </SequenceOrderCard>
      ))}
    </>
  );
}
beforeEach(() => {
  usePilatesStore.setState(
    { ...original, activeSteps: structuredClone(steps), undoStack: [] },
    true,
  );
  notice.mockClear();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
  document.elementFromPoint = vi.fn(() => document.querySelector('[data-order-step="c"]'));
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});
const order = () => usePilatesStore.getState().activeSteps.map((step) => step.stepId);
const handle = () =>
  screen.getByRole('button', { name: 'a 순서 이동 · 위아래 방향키 또는 드래그' });

describe('pointer and accessible sequence ordering', () => {
  it('commits mouse or touch pointer drag on release and one undo restores the complete order', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 50, 50);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(document.querySelector('[data-order-step="c"]')).toHaveAttribute(
      'data-drag-over',
      'true',
    );
    pointer(handle(), 'pointerup', 50, 50);
    expect(order()).toEqual(['b', 'c', 'a']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    act(() => usePilatesStore.getState().undoSequence());
    expect(order()).toEqual(['a', 'b', 'c']);
  });
  it.each(['pointercancel', 'lostpointercapture'])('does not reorder on %s', (type) => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 50, 50);
    pointer(handle(), type);
    pointer(handle(), 'pointerup', 50, 50);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    expect(document.querySelector('[data-drag-over]')).toBeNull();
  });
  it('cancels with Escape and ignores a tap without a drag', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 50, 50);
    fireEvent.keyDown(handle(), { key: 'Escape' });
    pointer(handle(), 'pointerup', 50, 50);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointerup');
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });
  it('preserves locked barriers and exposes keyboard/button alternatives', () => {
    usePilatesStore.setState({
      activeSteps: steps.map((s) => ({ ...s, locked: s.stepId === 'b' })),
    });
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 50, 50);
    pointer(handle(), 'pointerup', 50, 50);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(screen.getByRole('button', { name: 'a 아래로 이동' })).toBeDisabled();
    expect(notice).toHaveBeenCalledWith('잠긴 항목의 위치는 유지합니다.');
  });
});
