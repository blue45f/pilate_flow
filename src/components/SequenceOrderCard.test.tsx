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
const pointer = (
  element: HTMLElement,
  type: string,
  x = 20,
  y = 80,
  pointerId = 1,
  pointerType = 'mouse',
) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
    isPrimary: { value: pointerId === 1 },
  });
  fireEvent(element, event);
};
function Board() {
  const items = usePilatesStore((state) => state.activeSteps);
  return (
    <div className="flow-sections" data-sequence-order-list>
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
    </div>
  );
}
const rect = (top: number, height = 100) => ({
  x: 0,
  y: top,
  left: 0,
  top,
  width: 300,
  height,
  right: 300,
  bottom: top + height,
  toJSON: () => ({}),
});
const cards = () => [...document.querySelectorAll<HTMLElement>('.flow-sections [data-order-step]')];
beforeEach(() => {
  usePilatesStore.setState(
    { ...original, activeSteps: structuredClone(steps), undoStack: [] },
    true,
  );
  notice.mockClear();
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const card = this.closest<HTMLElement>('[data-order-step]');
    if (card) return rect(Math.max(0, cards().indexOf(card)) * 110);
    if (this.matches('.flow-sections')) return rect(0, Math.max(0, cards().length * 110 - 10));
    return rect(0);
  });
  document.elementFromPoint = vi.fn(
    (x: number, y: number) =>
      cards().find((card) => {
        const box = card.getBoundingClientRect();
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      }) ?? null,
  );
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  // The global setup clears pending RAF timers before this cleanup, so also remove
  // completed-drop clones appended outside React's render container.
  document
    .querySelectorAll('.sequence-drag-overlay, .sequence-drop-indicator')
    .forEach((node) => node.remove());
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});
const order = () => usePilatesStore.getState().activeSteps.map((step) => step.stepId);
const handle = (id = 'a') =>
  screen.getByRole('button', { name: `${id} 순서 이동 · 위아래 방향키 또는 드래그` });

describe('pointer and accessible sequence ordering', () => {
  it.each(['mouse', 'touch'])(
    'commits a %s pointer drag only on release with one undo entry',
    (pointerType) => {
      render(<Board />);
      pointer(handle(), 'pointerdown', 20, 80, 1, pointerType);
      pointer(handle(), 'pointermove', 20, 280, 1, pointerType);
      expect(order()).toEqual(['a', 'b', 'c']);
      expect(usePilatesStore.getState().undoStack).toHaveLength(0);
      pointer(handle(), 'pointerup', 20, 280, 1, pointerType);
      expect(order()).toEqual(['b', 'c', 'a']);
      expect(usePilatesStore.getState().undoStack).toHaveLength(1);
      act(() => usePilatesStore.getState().undoSequence());
      expect(order()).toEqual(['a', 'b', 'c']);
    },
  );
  it.each(['pointercancel', 'lostpointercapture'])('does not reorder on %s', (type) => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), type);
    pointer(handle(), 'pointerup', 20, 280);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    expect(document.querySelector('[data-drag-over]')).toBeNull();
  });
  it('cancels with Escape and ignores movement below the activation threshold', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    fireEvent.keyDown(handle(), { key: 'Escape' });
    pointer(handle(), 'pointerup', 20, 280);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 23, 83);
    pointer(handle(), 'pointerup', 23, 83);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });
  it('preserves locked barriers and disables unavailable button alternatives', () => {
    usePilatesStore.setState({
      activeSteps: steps.map((s) => ({ ...s, locked: s.stepId === 'b' })),
    });
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), 'pointerup', 20, 280);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'a 아래로 이동' })).toBeDisabled();
    expect(handle('b')).toBeDisabled();
  });
  it('supports keyboard and explicit up/down controls with stable IDs', () => {
    render(<Board />);
    fireEvent.keyDown(handle(), { key: 'ArrowDown' });
    expect(order()).toEqual(['b', 'a', 'c']);
    fireEvent.keyDown(handle(), { key: 'ArrowUp' });
    expect(order()).toEqual(['a', 'b', 'c']);
    fireEvent.click(screen.getByRole('button', { name: 'a 아래로 이동' }));
    expect(order()).toEqual(['b', 'a', 'c']);
    fireEvent.click(screen.getByRole('button', { name: 'a 위로 이동' }));
    expect(order()).toEqual(['a', 'b', 'c']);
  });
});

describe('drag preview and interruption regressions', () => {
  it('follows the pointer with an inaccessible clone and shifts the surrounding cards', () => {
    const { unmount } = render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 50, 280);
    const overlay = document.querySelector<HTMLElement>('.sequence-drag-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay).toHaveAttribute('inert');
    expect(overlay?.querySelector('[id]')).toBeNull();
    expect(overlay?.style.transform).toBe('translate3d(30px, 200px, 0)');
    expect(document.querySelector('[data-order-step="a"]')).toHaveAttribute('data-drag-source');
    expect(document.querySelector<HTMLElement>('[data-order-step="b"]')?.style.transform).toBe(
      'translateY(-110px)',
    );
    expect(document.querySelector<HTMLElement>('[data-order-step="c"]')?.style.transform).toBe(
      'translateY(-110px)',
    );
    expect(document.querySelector('.sequence-drop-indicator')).toHaveTextContent('3번째 위치');
    unmount();
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    expect(document.querySelector('.sequence-drop-indicator')).toBeNull();
    expect(order()).toEqual(['a', 'b', 'c']);
  });

  it('recalculates the destination from pointerup rather than the last move', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), 'pointerup', 20, 190);
    expect(order()).toEqual(['b', 'a', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
  });

  it('cancels a release outside the list even after a valid preview', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), 'pointerup', 450, 280);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    expect(
      document.querySelector('[data-drag-source], [data-drag-over], [data-drag-session]'),
    ).toBeNull();
    expect(cards().every((card) => card.style.transform === '')).toBe(true);
  });

  it('visibly rejects crossing a locked barrier before committing', () => {
    usePilatesStore.setState({
      activeSteps: steps.map((step) => ({ ...step, locked: step.stepId === 'b' })),
    });
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    expect(document.querySelector('.sequence-drag-overlay')).toHaveAttribute(
      'data-drag-blocked',
      'true',
    );
    expect(document.querySelector('.sequence-drop-indicator')).toHaveAttribute('hidden');
    expect(document.querySelector('.sequence-drag-status')).toHaveTextContent('잠긴 항목');
    expect(cards().every((card) => card.style.transform === '')).toBe(true);
    pointer(handle(), 'pointerup', 20, 280);
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('cancels a stale session without undoing a newer edit', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    act(() => {
      usePilatesStore.getState().reorderStep('b', 'c');
    });
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), 'pointerup', 20, 280);
    expect(order()).toEqual(['a', 'c', 'b']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    expect(notice).toHaveBeenCalledWith(expect.stringContaining('취소'));
  });

  it('ignores another pointer without committing the primary drag', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280, 2, 'touch');
    pointer(handle(), 'pointerup', 20, 280, 2, 'touch');
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), 'pointerup', 20, 280);
    expect(order()).toEqual(['b', 'c', 'a']);
  });

  it('preserves the committed order and metadata when saving and reopening the binder', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), 'pointerup', 20, 280);
    const committed = structuredClone(usePilatesStore.getState().activeSteps);
    let savedId = '';
    act(() => {
      savedId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    });
    expect(
      usePilatesStore.getState().savedSequences.find((entry) => entry.id === savedId)?.steps,
    ).toEqual(committed);
    act(() => {
      usePilatesStore.setState({ activeSteps: [] });
    });
    act(() => {
      usePilatesStore.getState().loadSequenceIntoWorkbench(savedId);
    });
    expect(usePilatesStore.getState().activeSteps).toEqual(committed);
    expect(order()).toEqual(['b', 'c', 'a']);
  });
});

it('reveals keyboard and button destinations without jumping on pointer drop', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scroll,
  });
  try {
    render(<Board />);
    fireEvent.keyDown(handle(), { key: 'ArrowDown' });
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    scroll.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'a 위로 이동' }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(scroll).toHaveBeenCalledOnce();
    scroll.mockClear();
    pointer(handle(), 'pointerdown', 20, 80);
    pointer(handle(), 'pointermove', 20, 280);
    pointer(handle(), 'pointerup', 20, 280);
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(order()).toEqual(['b', 'c', 'a']);
    expect(scroll).not.toHaveBeenCalled();
  } finally {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', descriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
  }
});

describe('80-step mixed sequence touch drag, cross-section headers, zoom200, and announcements', () => {
  const build80Steps = (): SequenceStep[] =>
    Array.from({ length: 80 }, (_, idx) => {
      const isRest = idx === 12 || idx === 32 || idx === 52 || idx === 68;
      return {
        stepId: isRest ? `rest-${idx + 1}` : `move-${idx + 1}`,
        exerciseId: isRest ? '__rest__' : `ex-${(idx % 8) + 1}`,
        kind: isRest ? 'rest' : 'exercise',
        order: idx + 1,
        blockCategory: idx < 15 ? 'warmup' : idx < 70 ? 'extension' : 'cooldown',
        durationMin: 1,
        selectedLayer: 'standard',
      };
    });

  function SectionedBoard() {
    const items = usePilatesStore((state) => state.activeSteps);
    const runs: { phase: string; entries: { step: SequenceStep; index: number }[] }[] = [];
    items.forEach((step, index) => {
      const phase = step.kind === 'rest' ? 'rest' : (step.blockCategory ?? 'main');
      const prev = runs.at(-1);
      if (prev && prev.phase === phase) prev.entries.push({ step, index });
      else runs.push({ phase, entries: [{ step, index }] });
    });
    return (
      <div className="flow-sections" data-sequence-order-list>
        {runs.map((run, rIdx) => (
          <section key={`${run.phase}-${rIdx}`} className="pf-sequence-block">
            <header className="pf-sequence-block__header">{run.phase}</header>
            <div className="pf-sequence-block__body">
              {run.entries.map(({ step, index }) => (
                <SequenceOrderCard
                  key={step.stepId}
                  step={step}
                  index={index}
                  label={`${index + 1}번 ${step.stepId}`}
                  onNotice={notice}
                >
                  <p>{step.stepId}</p>
                </SequenceOrderCard>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  it('shifts crossed section headers during upward touch drag across a rest card in an 80-step sequence and announces committed target position', () => {
    usePilatesStore.setState({ activeSteps: build80Steps(), undoStack: [] });
    render(<SectionedBoard />);
    expect(cards()).toHaveLength(80);

    // Card 13 (move-14) is the first card of the warmup section after rest-13 (index 12)
    const handle14 = handle('14번 move-14');
    const y14 = 13 * 110 + 50;
    const y12 = 11 * 110 + 20;

    pointer(handle14, 'pointerdown', 20, y14, 1, 'touch');
    // Initial move within same slot preserves drag-start announcement
    pointer(handle14, 'pointermove', 20, y14 - 12, 1, 'touch');
    expect(notice).toHaveBeenLastCalledWith(
      expect.stringContaining('14번 move-14 이동 중. 놓을 위치로 끌어 주세요.'),
    );

    // Drag upward across rest-13 (index 12) to move-12 (index 11)
    pointer(handle14, 'pointermove', 20, y12, 1, 'touch');
    const c14BlockHeader = document
      .querySelector('[data-order-step="move-14"]')
      ?.closest('.pf-sequence-block')
      ?.querySelector<HTMLElement>('.pf-sequence-block__header');
    expect(c14BlockHeader?.style.translate || c14BlockHeader?.style.transform).toContain('110px');

    pointer(handle14, 'pointerup', 20, y12, 1, 'touch');
    expect(c14BlockHeader?.style.translate).toBe('');
    expect(usePilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'move-14')).toBe(
      11,
    );
    expect(notice).toHaveBeenLastCalledWith(
      '14번 move-14 순서를 12번째 위치로 바꿨어요. 되돌릴 수 있습니다. 전체 80개 중 12번째입니다.',
    );
  });

  it('scales drag overlay, drop indicator, and card transforms when CSS zoom is 200%', () => {
    document.documentElement.style.zoom = '2';
    try {
      render(<Board />);
      pointer(handle(), 'pointerdown', 20, 80, 1, 'touch');
      pointer(handle(), 'pointermove', 40, 280, 1, 'touch');
      const overlay = document.querySelector<HTMLElement>('.sequence-drag-overlay');
      const indicator = document.querySelector<HTMLElement>('.sequence-drop-indicator');
      const cardB = document.querySelector<HTMLElement>('[data-order-step="b"]');
      expect(overlay?.style.width).toBe('150px');
      expect(indicator?.style.width).toBe('150px');
      expect(cardB?.style.transform).toBe('translateY(-55px)');
      pointer(handle(), 'pointercancel', 40, 280, 1, 'touch');
    } finally {
      document.documentElement.style.zoom = '';
    }
  });
});

describe('long sequence keyboard and removal continuity', () => {
  it('announces the new absolute position and exposes keyboard help', () => {
    render(<Board />);
    expect(handle()).toHaveAccessibleDescription(expect.stringContaining('전체 3개 중 1번째'));
    expect(handle()).toHaveAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown Home End Escape');
    fireEvent.keyDown(handle(), { key: 'End' });
    expect(order()).toEqual(['b', 'c', 'a']);
    expect(notice).toHaveBeenLastCalledWith(expect.stringContaining('전체 3개 중 3번째'));
    expect(handle()).toHaveAccessibleDescription(expect.stringContaining('전체 3개 중 3번째'));
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    fireEvent.keyDown(handle(), { key: 'End' });
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    fireEvent.keyDown(handle(), { key: 'Home' });
    expect(order()).toEqual(['a', 'b', 'c']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);
  });

  it('keeps Home/End within the current unlocked run', () => {
    usePilatesStore.setState({
      activeSteps: ['a', 'b', 'c', 'd', 'e', 'f'].map((stepId, index) => ({
        ...steps[0],
        stepId,
        exerciseId: stepId,
        order: index + 1,
        locked: stepId === 'b' || stepId === 'f',
      })),
    });
    render(<Board />);
    fireEvent.keyDown(handle('d'), { key: 'Home' });
    expect(order()).toEqual(['a', 'b', 'd', 'c', 'e', 'f']);
    fireEvent.keyDown(handle('d'), { key: 'End' });
    expect(order()).toEqual(['a', 'b', 'c', 'e', 'd', 'f']);
    fireEvent.keyDown(handle('a'), { key: 'End' });
    expect(order()).toEqual(['a', 'b', 'c', 'e', 'd', 'f']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);
  });

  it('cancels a pointer preview before an End shortcut and commits only once', () => {
    render(<Board />);
    pointer(handle(), 'pointerdown');
    pointer(handle(), 'pointermove', 20, 180);
    fireEvent.keyDown(handle(), { key: 'End' });
    pointer(handle(), 'pointerup', 20, 180);
    expect(order()).toEqual(['b', 'c', 'a']);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
  });

  it.each([
    ['b', 'c'],
    ['c', 'b'],
  ])('focuses the nearest remaining row after removing %s', async (removed, next) => {
    render(<Board />);
    const remove = screen.getByRole('button', { name: `${removed} 수업안에서 빼기` });
    remove.focus();
    fireEvent.click(remove);
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(handle(next)).toHaveFocus();
    expect(order()).not.toContain(removed);
    expect(notice).toHaveBeenLastCalledWith(expect.stringContaining('2개 남았습니다'));
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
  });

  it('returns to the first action after the last row is removed', async () => {
    usePilatesStore.setState({ activeSteps: [steps[0]] });
    render(
      <>
        <button className="workbench-first-action">동작 고르기</button>
        <Board />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'a 수업안에서 빼기' }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(screen.getByRole('button', { name: '동작 고르기' })).toHaveFocus();
    expect(order()).toEqual([]);
  });

  it('does not steal focus from a newer action after removal', async () => {
    render(
      <>
        <button>다른 작업</button>
        <Board />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'a 수업안에서 빼기' }));
    screen.getByRole('button', { name: '다른 작업' }).focus();
    await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    expect(screen.getByRole('button', { name: '다른 작업' })).toHaveFocus();
  });
});

it('leaves browser modified navigation shortcuts alone', () => {
  render(<Board />);
  fireEvent.keyDown(handle(), { key: 'End', ctrlKey: true });
  fireEvent.keyDown(handle(), { key: 'ArrowDown', metaKey: true });
  expect(order()).toEqual(['a', 'b', 'c']);
  expect(usePilatesStore.getState().undoStack).toHaveLength(0);
});
