import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BATCH_IDS, BATCH_PHASES } from '../models/motionAuthoringBatch';
import { MotionAuthoringBatchFigure } from './MotionAuthoringBatchFigure';
import { MotionAuthoringBatchPlayer } from './MotionAuthoringBatchPlayer';

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let preferenceChange: ((event: MediaQueryListEvent) => void) | undefined;
let media: MediaQueryList;

beforeEach(() => {
  frames = new Map();
  nextFrame = 0;
  preferenceChange = undefined;
  media = {
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_name: string, callback: EventListener) => {
      preferenceChange = callback as unknown as (event: MediaQueryListEvent) => void;
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

function frame(time: number) {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((callback) => callback(time)));
}

describe('new authored batch figure', () => {
  it('renders four separate finite geometry scenes with explicit draft status and contact semantics', () => {
    const scenes = BATCH_IDS.map((variantId) => {
      const { container, unmount } = render(
        <MotionAuthoringBatchFigure variantId={variantId} progress={0.5} />,
      );
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('data-exact-asset-ready')).toBe('false');
      expect(svg.getAttribute('data-professional-review-count')).toBe('0');
      expect(svg.getAttribute('viewBox')).toBe('0 0 640 360');
      expect(svg.querySelector('title')?.textContent).toContain('미검토 제작 초안');
      expect(svg.querySelectorAll('[data-contact-id]').length).toBeGreaterThan(0);
      expect(svg.querySelectorAll('[data-contact-state="fixed"]').length).toBeGreaterThan(0);
      const geometry = [...svg.querySelectorAll('path, polygon, circle')]
        .map((node) => [...node.attributes].map((attribute) => `${attribute.name}:${attribute.value}`).join('|'))
        .join(';');
      expect(geometry).not.toMatch(/NaN|Infinity/);
      unmount();
      return geometry;
    });
    expect(new Set(scenes).size).toBe(4);
  });

  it('keeps anatomical identity when only the screen is mirrored', () => {
    const { container, rerender } = render(
      <MotionAuthoringBatchFigure variantId="prone-single-straight-leg-extension-v1" progress={0.5} activeSide="right" />,
    );
    const before = [...container.querySelectorAll('[data-contact-id]')]
      .map((node) => [node.getAttribute('data-contact-id'), node.getAttribute('data-anatomical-side'), node.getAttribute('data-contact-state')]);
    const originalLeg = container.querySelector('[data-anatomical-side="right"][data-body-part="leg"] path')?.getAttribute('d');
    rerender(<MotionAuthoringBatchFigure variantId="prone-single-straight-leg-extension-v1" progress={0.5} activeSide="right" mirrored />);
    expect(container.querySelector('svg')?.getAttribute('data-anatomical-active-side')).toBe('right');
    expect(container.querySelector('svg')?.getAttribute('data-view-mirrored')).toBe('true');
    expect(container.querySelector('[data-anatomical-side="right"][data-body-part="leg"] path')?.getAttribute('d')).not.toBe(originalLeg);
    expect([...container.querySelectorAll('[data-contact-id]')]
      .map((node) => [node.getAttribute('data-contact-id'), node.getAttribute('data-anatomical-side'), node.getAttribute('data-contact-state')])).toEqual(before);
  });
});

describe('new authored batch player', () => {
  it('starts paused, plays exactly one cycle and offers independently reachable static phases', () => {
    const variantId = 'chair-seated-bilateral-arm-raise-v1';
    const { container } = render(<MotionAuthoringBatchPlayer variantId={variantId} />);
    expect(frames.size).toBe(0);
    expect(screen.getByRole('status').textContent).toContain('자동 재생하지 않습니다');
    fireEvent.change(screen.getByRole('combobox', { name: '새 모션 도해 속도' }), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(8000);
    expect(Number(container.querySelector('svg')?.getAttribute('data-progress'))).toBeCloseTo(0.5);
    frame(16000);
    expect(container.querySelector('svg')?.getAttribute('data-progress')).toBe('1');
    expect(frames.size).toBe(0);
    expect(screen.getByRole('status').textContent).toContain('한 주기 재생을 마쳤습니다');
    const phase = BATCH_PHASES[variantId][2];
    fireEvent.click(screen.getByRole('button', { name: phase.label }));
    expect(Number(container.querySelector('svg')?.getAttribute('data-progress'))).toBe(phase.sample);
    expect(frames.size).toBe(0);
  });

  it('pauses and disables playback when reduced motion changes while static phases stay usable', () => {
    const variantId = 'prone-forearm-chest-extension-v1';
    const { container } = render(<MotionAuthoringBatchPlayer variantId={variantId} />);
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    expect(frames.size).toBe(1);
    act(() => preferenceChange?.({ matches: true } as MediaQueryListEvent));
    expect((screen.getByRole('button', { name: '한 주기 재생' }) as HTMLButtonElement).disabled).toBe(true);
    expect(frames.size).toBe(0);
    const phase = BATCH_PHASES[variantId][2];
    fireEvent.click(screen.getByRole('button', { name: phase.label }));
    expect(Number(container.querySelector('svg')?.getAttribute('data-progress'))).toBe(phase.sample);
    expect(screen.getByRole('status').textContent).toContain('동작 줄이기');
  });

  it('separates body side and screen mirror controls and pauses when inactive or hidden', () => {
    const variantId = 'prone-single-straight-leg-extension-v1';
    const { container, rerender } = render(<MotionAuthoringBatchPlayer variantId={variantId} />);
    fireEvent.change(screen.getByRole('combobox', { name: '새 모션 해부학적 쪽' }), { target: { value: 'right' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '화면만 반전 · 몸의 좌우 유지' }));
    expect(container.querySelector('svg')?.getAttribute('data-anatomical-active-side')).toBe('right');
    expect(container.querySelector('svg')?.getAttribute('data-view-mirrored')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    rerender(<MotionAuthoringBatchPlayer variantId={variantId} active={false} />);
    expect(frames.size).toBe(0);
    expect((screen.getByRole('button', { name: '한 주기 재생' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<MotionAuthoringBatchPlayer variantId={variantId} active />);
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    fireEvent(document, new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    expect(screen.getByRole('status').textContent).toContain('일시정지 상태');
  });
});
