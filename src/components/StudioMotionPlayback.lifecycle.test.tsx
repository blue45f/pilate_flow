import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { renderRealtimeStudio3DFrame } from '../utils/realtimeStudio3dEngine';
import {
  CatalogMotionInteractivePlayer,
  CatalogMotionThumbnail,
} from './CatalogMotionInteractivePlayer';
import { MotionPatternThumbnail } from './MotionPatternPreview';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { LiveStageKinematicDiagram } from './LiveStageKinematicDiagram';
import { Studio3DMotionHeroCard } from './Studio3DMotionHeroCard';
import { StudioInteractive3DViewport } from './StudioInteractive3DViewport';

vi.mock('../utils/realtimeStudio3dEngine', () => ({
  renderRealtimeStudio3DFrame: vi.fn(() => ({
    signatureId: 'reformer-footwork',
    activeZonesCount: 1,
    springStretchPct: 0,
  })),
  STUDIO_3D_CAMERA_PRESETS: [
    { id: 'quarter', labelKo: '기본 각도', yawDeg: -34, pitchDeg: 21, zoom: 1.04 },
    { id: 'side', labelKo: '옆면', yawDeg: 0, pitchDeg: 5, zoom: 1.1 },
  ],
}));

const first = INITIAL_EXERCISES.find((exercise) => exercise.id === 'ex-footwork-01')!;
const second = INITIAL_EXERCISES.find((exercise) => exercise.id === 'ex-bridging-01')!;
const firstAsset = getCatalogContinuousMotionAsset(first)!;
const secondAsset = getCatalogContinuousMotionAsset(second)!;
const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
let clock = 0;
let nextFrame = 1;
let frames = new Map<number, FrameRequestCallback>();
let reduced = false;
let preferenceListeners = new Set<(event: MediaQueryListEvent) => void>();
let observers: Array<{
  callback: IntersectionObserverCallback;
  targets: Set<Element>;
  instance: IntersectionObserver;
}> = [];
let resizeCallbacks: ResizeObserverCallback[] = [];

function frame(delta = 16) {
  clock += delta;
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(clock)));
}
function visibility(visible: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: !visible });
  fireEvent(document, new Event('visibilitychange'));
}
function intersection(target: Element, visible: boolean) {
  act(() => {
    for (const observer of observers) {
      if (!observer.targets.has(target)) continue;
      observer.callback(
        [
          {
            target,
            isIntersecting: visible,
            intersectionRatio: visible ? 1 : 0,
            time: clock,
            rootBounds: null,
            boundingClientRect: new DOMRect(),
            intersectionRect: new DOMRect(),
          },
        ],
        observer.instance,
      );
    }
  });
}
function preference(matches: boolean) {
  reduced = matches;
  act(() =>
    preferenceListeners.forEach((listener) => listener({ matches } as MediaQueryListEvent)),
  );
}

beforeEach(() => {
  clock = 0;
  nextFrame = 1;
  frames = new Map();
  reduced = false;
  preferenceListeners = new Set();
  observers = [];
  resizeCallbacks = [];
  vi.mocked(renderRealtimeStudio3DFrame).mockClear();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        preferenceListeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        preferenceListeners.delete(listener),
    }),
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    frames.delete(id);
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    save: vi.fn(),
    scale: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal(
    'IntersectionObserver',
    class implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '0px';
      readonly thresholds = [0.01];
      readonly targets = new Set<Element>();
      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback, targets: this.targets, instance: this });
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallbacks.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden);
  else Reflect.deleteProperty(document, 'hidden');
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  else Reflect.deleteProperty(window, 'matchMedia');
});

describe('shared motion playback lifecycle', () => {
  it('starts Orbit paused at setup, seeks through the return phase, and redraws a paused resized canvas', () => {
    render(<StudioInteractive3DViewport exercise={first} />);
    expect(frames.size).toBe(0);
    expect(screen.getByRole('button', { name: '3D 모션 재생' })).toBeEnabled();
    const slider = screen.getByRole('slider', { name: '3D 동작 진행 구간 스크러버' });
    expect(slider).toHaveValue('0');
    fireEvent.change(slider, { target: { value: '70' } });
    expect(slider).toHaveAttribute('aria-valuetext', '70퍼센트 · 복귀');
    expect(vi.mocked(renderRealtimeStudio3DFrame).mock.lastCall?.[0].phaseT).toBeCloseTo(0.6);
    const canvas = screen.getByTestId('studio-interactive-3d-viewport').querySelector('canvas')!;
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 500 },
    });
    act(() => resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver)));
    expect(vi.mocked(renderRealtimeStudio3DFrame).mock.lastCall?.[0]).toMatchObject({
      width: 800,
      height: 500,
    });
    expect(frames.size).toBe(0);
  });

  it.each(['orbit', 'catalog'] as const)(
    'pauses %s when offscreen, hidden or reduced-motion, requiring explicit replay',
    (kind) => {
      const view = render(
        kind === 'orbit' ? (
          <StudioInteractive3DViewport exercise={first} />
        ) : (
          <CatalogMotionInteractivePlayer asset={firstAsset} />
        ),
      );
      const region = screen.getByTestId(
        kind === 'orbit' ? 'studio-interactive-3d-viewport' : 'catalog-motion-interactive-player',
      );
      const play = screen.getByRole('button', {
        name: kind === 'orbit' ? '3D 모션 재생' : '한 주기 재생',
      });
      fireEvent.click(play);
      frame();
      frame(48);
      expect(frames.size).toBe(1);
      intersection(region, false);
      expect(frames.size).toBe(0);
      expect(play).toBeDisabled();
      intersection(region, true);
      expect(play).toBeEnabled();
      expect(frames.size).toBe(0);
      fireEvent.click(play);
      expect(frames.size).toBe(1);
      visibility(false);
      visibility(true);
      expect(frames.size).toBe(0);
      fireEvent.click(play);
      preference(true);
      expect(play).toBeDisabled();
      expect(frames.size).toBe(0);
      preference(false);
      expect(frames.size).toBe(0);
      fireEvent.click(play);
      expect(frames.size).toBe(1);
      view.unmount();
      expect(frames.size).toBe(0);
    },
  );

  it.each(['orbit', 'catalog'] as const)(
    'resets %s controls and playback when the exercise identity changes',
    (kind) => {
      const view = render(
        kind === 'orbit' ? (
          <StudioInteractive3DViewport exercise={first} />
        ) : (
          <CatalogMotionInteractivePlayer asset={firstAsset} />
        ),
      );
      fireEvent.change(screen.getByRole('slider'), {
        target: { value: kind === 'orbit' ? '70' : '700' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: kind === 'orbit' ? '3D 모션 재생' : '한 주기 재생' }),
      );
      expect(frames.size).toBe(1);
      view.rerender(
        kind === 'orbit' ? (
          <StudioInteractive3DViewport exercise={second} />
        ) : (
          <CatalogMotionInteractivePlayer asset={secondAsset} />
        ),
      );
      expect(screen.getByRole('slider')).toHaveValue('0');
      expect(frames.size).toBe(0);
      expect(
        screen.getByRole('button', { name: kind === 'orbit' ? '3D 모션 재생' : '한 주기 재생' }),
      ).toBeEnabled();
    },
  );

  it('shows one coherent motion figure, mounts illustrations only on demand, and resets a changed exercise', () => {
    const view = render(<Studio3DMotionHeroCard exercise={first} />);
    let card = screen.getByTestId('studio-3d-motion-hero-card');
    expect(card).toHaveAttribute('data-motion-mode', 'motion');
    expect(within(card).getByTestId('studio-motion-study-player')).toBeVisible();
    expect(card.querySelectorAll('.mpp-figure > svg')).toHaveLength(1);
    expect(card.querySelectorAll('img')).toHaveLength(0);
    expect(card.querySelectorAll('canvas')).toHaveLength(0);
    expect(frames.size).toBe(0);
    const modes = within(card).getByRole('group', { name: '동작 보기 방식' });
    fireEvent.click(within(card).getByRole('button', { name: '모션 재생' }));
    frame();
    frame(64);
    expect(frames.size).toBe(1);
    fireEvent.click(within(modes).getByRole('button', { name: '자세 프레임' }));
    expect(frames.size).toBe(0);
    expect(within(card).queryByTestId('studio-motion-study-player')).toBeNull();
    expect(card.querySelectorAll('.pf-native-posture-stage .exercise-motion-artwork')).toHaveLength(
      1,
    );
    expect(card.querySelector('img')?.getAttribute('src')).toMatch(
      /^\/motion-artwork-v2\/.+\.svg$/,
    );
    expect(
      within(card).getByRole('group', { name: '자세 프레임 단계 보기' }).querySelectorAll('button'),
    ).toHaveLength(3);
    fireEvent.click(within(card).getByRole('button', { name: '세 자세 나란히 보기' }));
    expect(card).toHaveAttribute('data-motion-mode', 'compare');
    expect(card.querySelectorAll('.pf-native-posture-stage .exercise-motion-artwork')).toHaveLength(
      3,
    );
    expect(
      [...card.querySelectorAll('.pf-native-posture-stage [data-motion-phase]')].map((element) =>
        element.getAttribute('data-motion-phase'),
      ),
    ).toEqual(['start', 'middle', 'end']);
    expect(within(modes).queryByRole('button', { name: '360° 각도' })).toBeNull();
    expect(card.querySelectorAll('canvas')).toHaveLength(0);
    view.rerender(<Studio3DMotionHeroCard exercise={second} />);
    card = screen.getByTestId('studio-3d-motion-hero-card');
    expect(card).toHaveAttribute('data-motion-mode', 'motion');
    expect(within(card).getByRole('slider')).toHaveValue('0');
    expect(frames.size).toBe(0);
  });

  it('supports precise paused frame steps, keyboard steps, phase stops and slow playback', () => {
    render(<CatalogMotionInteractivePlayer asset={firstAsset} presentation="studio" />);
    const region = screen.getByTestId('studio-motion-study-player');
    const slider = within(region).getByRole('slider');
    const previous = within(region).getByRole('button', { name: '이전 프레임' });
    expect(previous).toBeDisabled();
    fireEvent.click(within(region).getByRole('button', { name: '다음 프레임' }));
    expect(Number(region.getAttribute('data-motion-progress'))).toBeCloseTo(1 / 480);
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(Number(region.getAttribute('data-motion-progress'))).toBeCloseTo(2 / 480);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(Number(region.getAttribute('data-motion-progress'))).toBeCloseTo(1 / 480);
    expect(frames.size).toBe(0);
    fireEvent.click(within(region).getByRole('button', { name: firstAsset.phases[2].labelKo }));
    expect(Number(region.getAttribute('data-motion-progress'))).toBe(firstAsset.phases[2].sample);
    fireEvent.click(within(region).getByRole('button', { name: '관련 패턴 처음으로' }));
    fireEvent.change(within(region).getByLabelText('관련 패턴 도해 속도'), {
      target: { value: '0.25' },
    });
    fireEvent.click(within(region).getByRole('button', { name: '모션 재생' }));
    frame();
    frame(1000);
    expect(Number(region.getAttribute('data-motion-progress'))).toBeCloseTo(0.03125);
    fireEvent.click(previous);
    expect(frames.size).toBe(0);
    expect(region).toHaveAttribute('data-motion-playing', 'false');
  });

  it('finishes all requested repeats after a long frame and keeps loop playback continuous', () => {
    render(<CatalogMotionInteractivePlayer asset={firstAsset} presentation="studio" />);
    const region = screen.getByTestId('studio-motion-study-player');
    const repeat = within(region).getByLabelText('관련 패턴 도해 반복');
    fireEvent.change(repeat, { target: { value: '3' } });
    fireEvent.click(within(region).getByRole('button', { name: '모션 재생' }));
    frame();
    frame(26000);
    expect(region).toHaveAttribute('data-motion-progress', '1');
    expect(region).toHaveAttribute('data-motion-playing', 'false');
    expect(within(region).getByRole('status')).toHaveTextContent('반복 재생 끝 (3회)');
    fireEvent.change(repeat, { target: { value: 'loop' } });
    fireEvent.click(within(region).getByRole('button', { name: '모션 재생' }));
    frame();
    frame(18000);
    expect(Number(region.getAttribute('data-motion-progress'))).toBeCloseTo(0.25);
    expect(region).toHaveAttribute('data-motion-playing', 'true');
    expect(frames.size).toBe(1);
  });

  it('keeps reduced-motion frame inspection available and makes optional figure layers explicit', () => {
    reduced = true;
    render(<CatalogMotionInteractivePlayer asset={firstAsset} presentation="studio" />);
    const region = screen.getByTestId('studio-motion-study-player');
    expect(within(region).getByRole('button', { name: '모션 재생' })).toBeDisabled();
    fireEvent.click(within(region).getByRole('button', { name: '다음 프레임' }));
    expect(Number(region.getAttribute('data-motion-progress'))).toBeGreaterThan(0);
    expect(frames.size).toBe(0);
    expect(within(region).getByRole('checkbox', { name: '정렬·방향 가이드' })).not.toBeChecked();
    expect(within(region).getByRole('checkbox', { name: '근육 표시' })).not.toBeChecked();
    expect(within(region).getByRole('checkbox', { name: '시작 자세 겹쳐 보기' })).not.toBeChecked();
    fireEvent.click(within(region).getByRole('checkbox', { name: '화면만 좌우 반전' }));
    expect(region.querySelector('.mpp-figure svg')).toHaveAttribute('data-view-mirrored', 'true');
    fireEvent.click(within(region).getByRole('button', { name: '시작·정점·종료 한눈에 비교' }));
    const stills = within(region).getByLabelText('시작·중간·끝 3단계 정지 도해');
    expect(stills.querySelectorAll('svg')).toHaveLength(3);
    const endFrameButton = within(stills).getAllByRole('button')[2];
    expect(endFrameButton).toHaveTextContent(`${firstAsset.endPoseLabelKo} 보기`);
    fireEvent.click(endFrameButton);
    expect(Number(region.getAttribute('data-motion-progress'))).toBeCloseTo(
      firstAsset.authoredEndProgress,
    );
    expect(endFrameButton).toHaveAttribute('aria-pressed', 'true');
    expect(frames.size).toBe(0);
  });

  it('names a representative pattern instead of presenting it as the selected exercise', () => {
    const custom = { ...first, id: 'custom-reformer-unmodeled-exercise', nameKo: '신규 동작' };
    render(<Studio3DMotionHeroCard exercise={custom} />);
    const region = screen.getByTestId('studio-motion-study-player');
    expect(region).toHaveAttribute('data-match-scope', 'representative-pattern');
    expect(within(region).getByRole('heading')).toHaveTextContent(
      getCatalogContinuousMotionAsset(custom)!.visualAsset.archetypeTitleKo,
    );
    expect(within(region).getByRole('heading')).not.toHaveTextContent('신규 동작');
    expect(region).toHaveTextContent('이 동작의 세부 수행은 연결 영상에서 확인하세요.');
  });

  it('offers the actual source for an expanded movement without mounting a mismatched pose or playback controls', () => {
    const expanded = INITIAL_EXERCISES.find(
      (exercise) => exercise.id === 'expanded-mat-leg-pull-front',
    )!;
    const view = render(<Studio3DMotionHeroCard exercise={expanded} />);
    const card = screen.getByTestId('studio-3d-motion-hero-card');
    expect(card).toHaveAttribute('data-motion-mode', 'source-video');
    expect(card).toHaveAttribute('data-match-scope', 'source-video-only');
    expect(within(card).getByTestId('motion-source-reference')).toBeVisible();
    expect(within(card).getByRole('link', { name: '제작자 동작 영상 보기' })).toHaveAttribute(
      'href',
      'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-leg-pull-front/',
    );
    expect(within(card).queryByRole('group', { name: '동작 보기 방식' })).toBeNull();
    expect(within(card).queryByRole('slider')).toBeNull();
    expect(card.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    expect(card.querySelector('canvas')).toBeNull();
    expect(frames.size).toBe(0);
    view.rerender(
      <CatalogMotionInteractivePlayer asset={getCatalogContinuousMotionAsset(expanded)!} />,
    );
    expect(screen.getByTestId('motion-source-reference')).toBeVisible();
    expect(screen.queryByTestId('catalog-motion-interactive-player')).toBeNull();
    expect(frames.size).toBe(0);
    view.rerender(<StudioInteractive3DViewport exercise={expanded} />);
    expect(screen.getByTestId('motion-source-reference')).toBeVisible();
    expect(view.container.querySelector('canvas')).toBeNull();
    expect(frames.size).toBe(0);
  });

  it.each(['catalog', 'legacy'] as const)(
    'suspends %s hover previews when offscreen or motion preference changes',
    (kind) => {
      const reference = getMotionPatternReferences('original-mat-bridge')[0];
      const view = render(
        kind === 'catalog' ? (
          <CatalogMotionThumbnail asset={firstAsset} />
        ) : (
          <MotionPatternThumbnail reference={reference} />
        ),
      );
      const thumbnail = view.container.firstElementChild!;
      fireEvent.pointerEnter(thumbnail, { pointerType: 'mouse' });
      frame();
      frame(48);
      expect(frames.size).toBe(1);
      intersection(thumbnail, false);
      expect(frames.size).toBe(0);
      intersection(thumbnail, true);
      expect(frames.size).toBe(0);
      fireEvent.pointerEnter(thumbnail, { pointerType: 'mouse' });
      expect(frames.size).toBe(1);
      preference(true);
      expect(frames.size).toBe(0);
      expect(thumbnail).not.toHaveClass('is-hover-playing');
    },
  );

  it('suspends a live diagram without losing its pose and resumes when the running class becomes visible', () => {
    const view = render(
      <LiveStageKinematicDiagram exercise={first} running stepProgressRatio={0.6} />,
    );
    const region = screen.getByTestId('live-stage-kinematic-diagram');
    frame();
    frame(64);
    const progress = Number(region.getAttribute('data-motion-progress'));
    expect(progress).toBeGreaterThan(0);
    visibility(false);
    expect(region).toHaveAttribute('data-motion-playing', 'false');
    expect(frames.size).toBe(0);
    visibility(true);
    expect(region).toHaveAttribute('data-motion-playing', 'true');
    frame();
    expect(Number(region.getAttribute('data-motion-progress'))).toBe(progress);
    frame(32);
    expect(Number(region.getAttribute('data-motion-progress'))).toBeGreaterThan(progress);
    const resumedProgress = region.getAttribute('data-motion-progress');
    view.rerender(
      <LiveStageKinematicDiagram exercise={first} running={false} stepProgressRatio={0.6} />,
    );
    expect(region).toHaveAttribute('data-motion-progress', resumedProgress!);
    expect(frames.size).toBe(0);
    visibility(false);
    visibility(true);
    expect(frames.size).toBe(0);
  });
});
