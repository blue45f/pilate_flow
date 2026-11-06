import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SequenceStep } from '../types/pilates';
import { createSequenceDrag, resolveSequenceDrop, type SequenceDragRect } from './sequenceDrag';

const rects: SequenceDragRect[] = ['a', 'b', 'c'].map((id, index) => ({
  id,
  left: 0,
  top: index * 110,
  width: 300,
  height: 100,
}));
const unlocked = new Set<string>();

describe('resolveSequenceDrop', () => {
  it.each([
    ['a', 20, 0, 0, 'a'],
    ['a', 20, 159, 0, 'a'],
    ['a', 20, 160, 1, 'b'],
    ['a', 20, 269, 1, 'b'],
    ['a', 20, 270, 2, 'c'],
    ['c', 20, 49, 0, 'a'],
    ['c', 20, 50, 1, 'b'],
    ['c', 20, 160, 2, 'c'],
  ])('resolves %s at (%i, %i) to slot %i', (source, x, y, index, targetId) => {
    expect(resolveSequenceDrop(rects, source, x, y, unlocked)).toEqual({
      index,
      targetId,
      blocked: false,
    });
  });

  it.each([
    [-25, 80],
    [325, 80],
    [20, -41],
    [20, 361],
  ])('rejects outside coordinates (%i, %i)', (x, y) => {
    expect(resolveSequenceDrop(rects, 'a', x, y, unlocked)).toBeNull();
  });

  it('handles an empty list, a missing source, and a single card', () => {
    expect(resolveSequenceDrop([], 'a', 20, 80, unlocked)).toBeNull();
    expect(resolveSequenceDrop(rects, 'missing', 20, 80, unlocked)).toBeNull();
    expect(resolveSequenceDrop(rects.slice(0, 1), 'a', 20, 80, unlocked)).toEqual({
      index: 0,
      targetId: 'a',
      blocked: false,
    });
  });

  it('rejects locked sources, targets, and barriers in either direction', () => {
    const locked = new Set(['b']);
    expect(resolveSequenceDrop(rects, 'a', 20, 280, locked)?.blocked).toBe(true);
    expect(resolveSequenceDrop(rects, 'c', 20, 20, locked)?.blocked).toBe(true);
    expect(resolveSequenceDrop(rects, 'a', 20, 180, locked)?.blocked).toBe(true);
    expect(resolveSequenceDrop(rects, 'b', 20, 180, locked)?.blocked).toBe(true);
    expect(resolveSequenceDrop(rects, 'a', 20, 80, locked)?.blocked).toBe(false);
    expect(resolveSequenceDrop(rects, 'c', 20, 280, locked)?.blocked).toBe(false);
  });

  it('uses each card midpoint for unequal heights and section-sized gaps', () => {
    const uneven = [
      { id: 'a', left: 0, top: 0, width: 300, height: 180 },
      { id: 'b', left: 0, top: 230, width: 300, height: 60 },
      { id: 'c', left: 0, top: 350, width: 300, height: 140 },
    ];
    expect(resolveSequenceDrop(uneven, 'a', 20, 259, unlocked)?.index).toBe(0);
    expect(resolveSequenceDrop(uneven, 'a', 20, 260, unlocked)?.index).toBe(1);
    expect(resolveSequenceDrop(uneven, 'a', 20, 420, unlocked)?.index).toBe(2);
  });
});

const frames = new Map<number, FrameRequestCallback>();
const sessions: ReturnType<typeof createSequenceDrag>[] = [];
let nextFrame = 0;
const flushFrames = () => {
  const queued = [...frames.entries()];
  frames.clear();
  queued.forEach(([, callback]) => callback(performance.now()));
};
const makeBoard = (options: { locked?: string[]; count?: number; reduced?: boolean } = {}) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: options.reduced ?? false })),
  );
  const count = options.count ?? 3;
  let steps: SequenceStep[] = Array.from({ length: count }, (_, index) => ({
    stepId: String.fromCharCode(97 + index),
    exerciseId: String.fromCharCode(97 + index),
    order: index + 1,
    blockCategory: 'warmup',
    durationMin: 2,
    selectedLayer: 'standard',
    locked: options.locked?.includes(String.fromCharCode(97 + index)),
  }));
  const root = document.createElement('div');
  root.className = 'vnext-shell';
  const list = document.createElement('div');
  list.className = 'flow-sections';
  root.append(list);
  document.body.append(root);
  const cards = steps.map((step, index) => {
    const card = document.createElement('div');
    card.dataset.orderStep = step.stepId;
    card.innerHTML =
      '<button id="order-handle-' + step.stepId + '">Move ' + step.stepId + '</button>';
    card.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: index * 110 - window.scrollY,
      left: 0,
      top: index * 110 - window.scrollY,
      width: 300,
      height: 100,
      right: 300,
      bottom: index * 110 + 100 - window.scrollY,
      toJSON: () => ({}),
    }));
    list.append(card);
    return card;
  });
  const onCommit = vi.fn();
  const onNotice = vi.fn();
  const start = (index = 0) => {
    const session = createSequenceDrag({
      card: cards[index],
      handle: cards[index].firstElementChild as HTMLElement,
      stepId: steps[index].stepId,
      label: steps[index].stepId,
      steps,
      getSteps: () => steps,
      startX: 20,
      startY: index * 110 + 80,
      onCommit,
      onNotice,
    });
    sessions.push(session);
    return session;
  };
  return {
    root,
    list,
    cards,
    start,
    onCommit,
    onNotice,
    replaceSteps: () => {
      steps = [...steps].reverse();
    },
  };
};

beforeEach(() => {
  frames.clear();
  nextFrame = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  vi.stubGlobal('scrollY', 0);
});
afterEach(() => {
  sessions.splice(0).forEach((session) => session.cancel());
  frames.clear();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('sequence drag lifecycle', () => {
  it('does not activate or allocate an overlay below the movement threshold', () => {
    const board = makeBoard();
    const session = board.start();
    session.move(23, 83);
    expect(session.isActive()).toBe(false);
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    session.finish(23, 83);
    expect(board.onCommit).not.toHaveBeenCalled();
    expect(board.onNotice).not.toHaveBeenCalled();
  });

  it('creates a pointer-following inaccessible clone and restores previous inline styles on cancellation', () => {
    const board = makeBoard();
    board.cards[1].style.transform = 'scale(1)';
    board.cards[1].style.transition = 'opacity 1s';
    const session = board.start();
    session.move(50, 280);
    const overlay = document.querySelector<HTMLElement>('.sequence-drag-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay).toHaveAttribute('inert');
    expect(overlay).not.toHaveAttribute('data-order-step');
    expect(overlay?.querySelector('[id]')).toBeNull();
    expect(overlay?.style.pointerEvents).toBe('none');
    expect(overlay?.style.transform).toBe('translate3d(30px, 200px, 0)');
    expect(board.cards[1].style.transform).toBe('translateY(-110px)');
    expect(session.isActive()).toBe(true);
    session.cancel();
    expect(session.isActive()).toBe(false);
    expect(board.cards[1].style.transform).toBe('scale(1)');
    expect(board.cards[1].style.transition).toBe('opacity 1s');
    expect(document.querySelector('.sequence-drag-overlay, .sequence-drop-indicator')).toBeNull();
    expect(
      document.querySelector('[data-drag-source], [data-drag-over], [data-drag-session]'),
    ).toBeNull();
    expect(board.onCommit).not.toHaveBeenCalled();
  });

  it('rechecks the final coordinate and commits at most once', () => {
    const board = makeBoard();
    const session = board.start();
    session.move(20, 280);
    expect(board.onCommit).not.toHaveBeenCalled();
    session.finish(20, 190);
    session.finish(20, 280);
    expect(board.onCommit).toHaveBeenCalledTimes(1);
    expect(board.onCommit).toHaveBeenCalledWith('b');
    flushFrames();
    expect(document.querySelector('.sequence-drag-overlay, .sequence-drop-indicator')).toBeNull();
  });

  it('preserves the order on no-op and outside-list drops', () => {
    const board = makeBoard();
    const session = board.start();
    session.move(20, 280);
    session.finish(20, 80);
    expect(board.onCommit).not.toHaveBeenCalled();
    const next = board.start();
    next.move(20, 280);
    next.finish(600, 280);
    expect(board.onCommit).not.toHaveBeenCalled();
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
  });

  it('shows invalid feedback and no insertion preview when crossing a locked card', () => {
    const board = makeBoard({ locked: ['b'] });
    const session = board.start();
    session.move(20, 280);
    expect(document.querySelector('.sequence-drag-overlay')).toHaveAttribute(
      'data-drag-blocked',
      'true',
    );
    expect(document.querySelector('.sequence-drop-indicator')).toHaveAttribute('hidden');
    expect(document.querySelector('.sequence-drag-status')).toHaveTextContent('잠긴 항목');
    expect(board.cards.every((card) => card.style.transform === '')).toBe(true);
    session.finish(20, 280);
    expect(board.onCommit).not.toHaveBeenCalled();
  });

  it.each(['move', 'finish'] as const)(
    'cancels stale input before %s without committing',
    (method) => {
      const board = makeBoard();
      const session = board.start();
      session.move(20, 280);
      board.replaceSteps();
      session[method](20, 280);
      expect(session.isActive()).toBe(false);
      expect(board.onCommit).not.toHaveBeenCalled();
      expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    },
  );

  it.each(['blur', 'visibilitychange'])('cleans up an interrupted session on %s', (type) => {
    const board = makeBoard();
    const session = board.start();
    session.move(20, 280);
    if (type === 'visibilitychange') {
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event(type));
    } else window.dispatchEvent(new Event(type));
    expect(session.isActive()).toBe(false);
    expect(document.querySelector('.sequence-drag-overlay, .sequence-drop-indicator')).toBeNull();
    expect(board.onCommit).not.toHaveBeenCalled();
  });

  it('cancels the older session when another drag begins', () => {
    const board = makeBoard();
    const first = board.start();
    first.move(20, 280);
    const second = board.start(2);
    expect(first.isActive()).toBe(false);
    second.move(20, 20);
    expect(document.querySelectorAll('.sequence-drag-overlay')).toHaveLength(1);
    first.finish(20, 280);
    expect(board.onCommit).not.toHaveBeenCalled();
    second.finish(20, 20);
    expect(board.onCommit).toHaveBeenCalledExactlyOnceWith('a');
    flushFrames();
  });

  it('respects reduced motion for preview transitions and cleans the drop overlay', () => {
    const board = makeBoard({ reduced: true });
    const session = board.start();
    session.move(20, 280);
    expect(board.cards.every((card) => card.style.transition === 'none')).toBe(true);
    session.finish(20, 280);
    flushFrames();
    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    expect(board.cards.every((card) => card.style.transition === '')).toBe(true);
  });

  it('auto-scrolls at the viewport edge while the pointer is stationary and stops after cancellation', () => {
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2000);
    const board = makeBoard({ count: 10 });
    const session = board.start();
    session.move(20, window.innerHeight - 20);
    flushFrames();
    expect(window.scrollBy).toHaveBeenCalledWith(0, expect.any(Number));
    expect(vi.mocked(window.scrollBy).mock.calls[0][1]).toBeGreaterThan(0);
    session.cancel();
    vi.mocked(window.scrollBy).mockClear();
    flushFrames();
    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it('anchors insertion geometry to the live source after a notice shifts the list without scrolling', () => {
    const board = makeBoard();
    // begin() measures the rows before announcing. A taller notice then moves
    // the actual list down while scrollY stays unchanged.
    board.onNotice.mockImplementationOnce(() => {
      board.cards.forEach((card) => {
        const beforeNotice = card.getBoundingClientRect();
        vi.mocked(card.getBoundingClientRect).mockImplementation(() => ({
          ...beforeNotice,
          y: beforeNotice.y + 64,
          top: beforeNotice.top + 64,
          bottom: beforeNotice.bottom + 64,
        }));
      });
    });
    const session = board.start();
    session.move(20, 280);
    expect(window.scrollY).toBe(0);
    expect(document.querySelector<HTMLElement>('.sequence-drop-indicator')?.style.top).toBe(
      '174px',
    );
    expect(document.querySelector('.sequence-drop-indicator')).toHaveTextContent('2번째 위치');
    expect(board.cards[1].style.transform).toBe('translateY(-110px)');
    expect(board.cards[2].style.transform).toBe('');
    expect(board.onCommit).not.toHaveBeenCalled();
    session.finish(20, 280);
    expect(board.onCommit).toHaveBeenCalledExactlyOnceWith('b');
    flushFrames();
    expect(document.querySelector('.sequence-drag-overlay, .sequence-drop-indicator')).toBeNull();
  });

  it('keeps insertion coordinates aligned after the page scrolls', () => {
    const board = makeBoard();
    const session = board.start();
    session.move(20, 190);
    vi.stubGlobal('scrollY', 110);
    session.finish(20, 190);
    expect(board.onCommit).toHaveBeenCalledExactlyOnceWith('c');
    flushFrames();
  });
});
