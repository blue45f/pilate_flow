import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceOrderCard } from './SequenceOrderCard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';

/**
 * Round 5 (R5-01 ~ R5-04) Isolated Regression Suite
 * Note on R5-03 WebKit/Safari: Real WebKit/Safari browser runtime execution remains
 * UNVERIFIED (미검증) in the Debian 12 sandbox (Chromium/jsdom only). These unit tests
 * verify the DOM/event/zoom-fallback contracts in jsdom without claiming Safari runtime execution.
 */

const original = usePilatesStore.getState();
const notice = vi.fn();

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

const pointer = (
  element: HTMLElement,
  type: string,
  x = 20,
  y = 80,
  pointerId = 1,
  pointerType = 'touch',
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

const rect = (top: number, height = 100, width = 300) => ({
  x: 0,
  y: top,
  left: 0,
  top,
  width,
  height,
  right: width,
  bottom: top + height,
  toJSON: () => ({}),
});

const cards = () => [...document.querySelectorAll<HTMLElement>('.flow-sections [data-order-step]')];
const handle = (label: string) =>
  screen.getByRole('button', { name: `${label} 순서 이동 · 위아래 방향키 또는 드래그` });

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

describe('Round 5 (R5-01 ~ R5-04) cross-input and stress regression suite', () => {
  beforeEach(() => {
    usePilatesStore.setState(
      { ...original, activeSteps: build80Steps(), undoStack: [] },
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
    document
      .querySelectorAll('.sequence-drag-overlay, .sequence-drop-indicator')
      .forEach((node) => node.remove());
    document.documentElement.style.zoom = '';
    usePilatesStore.setState(original, true);
    vi.restoreAllMocks();
  });

  it('R5-01: clears crossed section header translate and unblocks subsequent drag when screen rotation (resize) cancels an active drag', () => {
    render(<SectionedBoard />);
    const handle14 = handle('14번 move-14');
    const y14 = 13 * 110 + 50;
    const y12 = 11 * 110 + 20;

    pointer(handle14, 'pointerdown', 20, y14, 1, 'touch');
    pointer(handle14, 'pointermove', 20, y12, 1, 'touch');

    const c14BlockHeader = document
      .querySelector('[data-order-step="move-14"]')
      ?.closest('.pf-sequence-block')
      ?.querySelector<HTMLElement>('.pf-sequence-block__header');
    expect(c14BlockHeader?.style.translate).toContain('110px');

    // Simulate screen rotation (window resize) mid-drag before pointerup/pointercancel
    window.dispatchEvent(new Event('resize'));
    pointer(handle14, 'pointermove', 20, y12 - 5, 1, 'touch');

    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    expect(c14BlockHeader?.style.translate).toBe('');

    // Verify a subsequent drag on the same card starts cleanly without needing pointercancel
    pointer(handle14, 'pointerdown', 20, y14, 2, 'touch');
    pointer(handle14, 'pointermove', 20, y12, 2, 'touch');
    expect(document.querySelector('.sequence-drag-overlay')).not.toBeNull();
    pointer(handle14, 'pointercancel', 20, y12, 2, 'touch');
  });

  it('R5-02: scales the newest active drag overlay at 200% CSS zoom even while a retiring drop-return overlay clone remains in DOM', () => {
    document.documentElement.style.zoom = '2';
    render(<SectionedBoard />);

    // Simulate a retiring drop-return overlay clone from a drag that finished < 160ms ago
    const retiringOverlay = document.createElement('div');
    retiringOverlay.className = 'sequence-drag-overlay';
    retiringOverlay.style.width = '150px';
    document.querySelector('.pf-sequence-block__body')?.appendChild(retiringOverlay);

    const handle1 = handle('1번 move-1');
    pointer(handle1, 'pointerdown', 20, 40, 1, 'touch');
    pointer(handle1, 'pointermove', 20, 160, 1, 'touch');

    const overlays = document.querySelectorAll<HTMLElement>('.sequence-drag-overlay');
    expect(overlays.length).toBe(2);
    const activeOverlay = overlays[overlays.length - 1];
    expect(activeOverlay.style.width).toBe('150px');

    pointer(handle1, 'pointercancel', 20, 160, 1, 'touch');
  });

  it('R5-03: cancels an active touch drag on window Escape even when focus is not on the handle and supports rect/offsetWidth zoom ratio fallback', () => {
    render(<SectionedBoard />);
    const handle14 = handle('14번 move-14');
    const y14 = 13 * 110 + 50;
    const y12 = 11 * 110 + 20;

    pointer(handle14, 'pointerdown', 20, y14, 1, 'touch');
    pointer(handle14, 'pointermove', 20, y12, 1, 'touch');
    expect(document.querySelector('.sequence-drag-overlay')).not.toBeNull();

    // Simulate iPadOS/touch environment where button does not retain keyboard focus during touch
    handle14.blur();
    fireEvent.keyDown(window, { key: 'Escape' });
    pointer(handle14, 'pointermove', 20, y12 - 4, 1, 'touch');

    expect(document.querySelector('.sequence-drag-overlay')).toBeNull();
    expect(document.querySelector('.sequence-drop-indicator')).toBeNull();
    expect(
      usePilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'move-14'),
    ).toBe(13);

    // Also verify rectZoom fallback when offsetWidth is half of getBoundingClientRect().width (zoom 2x without currentCSSZoom)
    const card1 = document.querySelector<HTMLElement>('[data-order-step="move-1"]')!;
    Object.defineProperty(card1, 'offsetWidth', { configurable: true, value: 150 });
    const handle1 = handle('1번 move-1');
    pointer(handle1, 'pointerdown', 20, 40, 3, 'touch');
    pointer(handle1, 'pointermove', 20, 160, 3, 'touch');
    const overlay = document.querySelector<HTMLElement>('.sequence-drag-overlay');
    expect(overlay?.style.width).toBe('150px');
    pointer(handle1, 'pointercancel', 20, 160, 3, 'touch');
  });

  it('R5-04: advances 5 positions on 5 rapid synchronous ArrowDown key repeats before React frame commit', () => {
    render(<SectionedBoard />);
    const handle1 = handle('1번 move-1');

    act(() => {
      for (let i = 0; i < 5; i += 1) {
        handle1.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
        );
      }
    });

    expect(
      usePilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'move-1'),
    ).toBe(5);
  });
});
