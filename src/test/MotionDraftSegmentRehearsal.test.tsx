import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionDraftSegmentRehearsal } from '../components/MotionDraftSegmentRehearsal';
import type { MotionDraftSegmentRehearsalProps } from '../components/MotionDraftSegmentRehearsal';
import { getMotionDraft } from '../data/motionDrafts';
import type { MotionDraftDefinition } from '../data/motionDrafts';

const selectedDraft = getMotionDraft('supine-knee-fold');
if (!selectedDraft) throw new Error('The rehearsal fixture is missing.');
const draft: MotionDraftDefinition = selectedDraft;
let callbacks: Map<number, FrameRequestCallback>;
let serial: number;
let hidden: boolean;
let media: { matches: boolean };
let mediaListeners: Set<(event: MediaQueryListEvent) => void>;
let intersection: IntersectionObserverCallback;
const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');

beforeEach(() => {
  callbacks = new Map();
  serial = 0;
  hidden = false;
  media = { matches: false };
  mediaListeners = new Set();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      callbacks.set(++serial, callback);
      return serial;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => callbacks.delete(id)),
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return media.matches;
      },
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        mediaListeners.add(listener),
      removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        mediaListeners.delete(listener),
    })),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden);
  else Reflect.deleteProperty(document, 'hidden');
});
function frame(timestamp: number) {
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(timestamp));
  });
}
function advance(from: number, to: number) {
  for (let timestamp = from + 500; timestamp < to; timestamp += 500) frame(timestamp);
  frame(to);
}
function mount(props: Partial<MotionDraftSegmentRehearsalProps> = {}) {
  return render(
    <MotionDraftSegmentRehearsal
      draft={draft}
      active
      activeSide="right"
      mirrored={false}
      onExit={vi.fn()}
      {...props}
    />,
  );
}
function openSettings() {
  const details = screen.getByText('시간·반복·속도 설정').closest('details')!;
  if (!details.open) fireEvent.click(within(details).getByText('시간·반복·속도 설정'));
}
function selectMove(repetitions = '1') {
  fireEvent.change(screen.getByLabelText('시작 단계'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('끝 단계'), { target: { value: '1' } });
  openSettings();
  fireEvent.change(screen.getByLabelText('전체 한 주기 표시 초 (2–30)'), {
    target: { value: '10' },
  });
  fireEvent.change(screen.getByLabelText('선택 구간 표시 반복'), {
    target: { value: repetitions },
  });
}
function play() {
  fireEvent.click(screen.getByRole('button', { name: '구간 재생' }));
}
function geometry() {
  return [...screen.getByRole('img').querySelectorAll('path,polyline,polygon,circle,line,ellipse')]
    .map((element) =>
      [...element.attributes]
        .filter((attribute) =>
          ['d', 'points', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2'].includes(attribute.name),
        )
        .map((attribute) => `${attribute.name}=${attribute.value}`)
        .join(';'),
    )
    .join('|');
}

describe('isolated finite motion segment rehearsal', () => {
  it('starts paused and animates the actual Figure within original phase fractions, cuts intermediate repeats and holds the exact finite end', () => {
    const before = JSON.stringify(draft);
    const fetch = vi.spyOn(globalThis, 'fetch');
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const storage = [
      vi.spyOn(Storage.prototype, 'getItem'),
      vi.spyOn(Storage.prototype, 'setItem'),
      vi.spyOn(Storage.prototype, 'removeItem'),
      vi.spyOn(Storage.prototype, 'clear'),
    ];
    mount();
    const region = screen.getByRole('region', { name: '모션 구간 연습' });
    region.focus();
    expect(region).toHaveFocus();
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent('자동 재생 없음');
    expect(
      screen.getByText('완성 자산 0건 · 전문가 검토 0건 · 자동 추천 제외'),
    ).toBeInTheDocument();
    selectMove('2');
    expect(screen.getByLabelText('구간 표시 시간')).toHaveTextContent(
      '선택 구간 3초 × 2회 = 전체 표시 6초',
    );
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.12');
    const initialGeometry = geometry();
    play();
    frame(0);
    advance(0, 1500);
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.27');
    expect(geometry()).not.toBe(initialGeometry);
    expect(callbacks.size).toBe(1);
    advance(1500, 3000);
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.12');
    expect(geometry()).toBe(initialGeometry);
    expect(screen.getByLabelText('구간 표시 위치 정보')).toHaveTextContent('2 / 2번째 표시');
    expect(screen.getByRole('status')).toHaveTextContent('구간 재생 중');
    advance(3000, 6000);
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.42');
    expect(screen.getByRole('status')).toHaveTextContent('선택 구간 끝');
    expect(callbacks.size).toBe(0);
    const finalGeometry = geometry();
    frame(50_000);
    expect(geometry()).toBe(finalGeometry);
    expect(screen.getByRole('slider')).toHaveValue('6');
    expect(fetch).not.toHaveBeenCalled();
    expect(xhr).not.toHaveBeenCalled();
    storage.forEach((method) => expect(method).not.toHaveBeenCalled());
    expect(JSON.stringify(draft)).toBe(before);
  });

  it('pauses and resets configuration, side, mirror and source-definition changes while equal snapshots keep one RAF', () => {
    const view = mount();
    selectMove();
    play();
    frame(0);
    frame(500);
    view.rerender(
      <MotionDraftSegmentRehearsal
        draft={{ ...draft }}
        active
        activeSide="right"
        mirrored={false}
        onExit={vi.fn()}
      />,
    );
    expect(callbacks.size).toBe(1);
    expect(screen.getByRole('status')).toHaveTextContent('구간 재생 중');
    fireEvent.change(screen.getByLabelText('구간 표시 속도'), { target: { value: '0.5' } });
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('slider')).toHaveValue('0');
    play();
    frame(10_000);
    frame(11_000);
    expect(screen.getByRole('slider')).toHaveValue('0.5');
    view.rerender(
      <MotionDraftSegmentRehearsal
        draft={draft}
        active
        activeSide="left"
        mirrored
        onExit={vi.fn()}
      />,
    );
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('slider')).toHaveValue('0');
    expect(screen.getByRole('img')).toHaveAttribute('data-active-side', 'left');
    expect(screen.getByRole('img')).toHaveAttribute('data-view-mirrored', 'true');
    play();
    frame(20_000);
    frame(20_500);
    view.rerender(
      <MotionDraftSegmentRehearsal
        draft={{
          ...draft,
          supportNote: '변경된 지지·출처 정의',
          sources: draft.sources.map((source) => ({ ...source, context: '새 확인 문맥' })),
        }}
        active
        activeSide="left"
        mirrored
        onExit={vi.fn()}
      />,
    );
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('slider')).toHaveValue('0');
    fireEvent.change(screen.getByLabelText('끝 단계'), { target: { value: '0' } });
    expect(screen.getByLabelText('시작 단계')).toHaveValue('0');
    expect(screen.getByRole('slider')).toHaveValue('0');
    fireEvent.change(screen.getByLabelText('전체 한 주기 표시 초 (2–30)'), {
      target: { value: '' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('2~30초');
    expect(screen.getByRole('button', { name: '구간 재생' })).toBeDisabled();
  });

  it('preserves the last drawn position after a native-frame delay and requires explicit resume without catchup', () => {
    mount();
    selectMove('3');
    play();
    frame(0);
    frame(1000);
    const prior = geometry();
    frame(2001);
    expect(screen.getByRole('status')).toHaveTextContent('화면 갱신이 지연되어 멈췄습니다');
    expect(screen.getByRole('slider')).toHaveValue('1');
    expect(geometry()).toBe(prior);
    expect(callbacks.size).toBe(0);
    frame(90_000);
    expect(screen.getByRole('slider')).toHaveValue('1');
    play();
    frame(100_000);
    expect(screen.getByRole('slider')).toHaveValue('1');
    frame(100_500);
    expect(screen.getByRole('slider')).toHaveValue('1.5');
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.27');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent('일시정지');
  });

  it('uses explicit hold metadata only and keeps manual start/middle/end available in reduced motion', () => {
    media.matches = true;
    const view = mount();
    selectMove('2');
    expect(screen.queryByText(/정적 유지 구간/)).toBeNull();
    expect(screen.getByText(/정지 유지가 포함될 수 있습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '구간 재생' })).toBeDisabled();
    const controls = within(screen.getByRole('group', { name: '선택 구간 정지 단계' }));
    fireEvent.click(controls.getByRole('button', { name: '중간' }));
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.27');
    fireEvent.click(controls.getByRole('button', { name: '끝' }));
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.42');
    fireEvent.click(controls.getByRole('button', { name: '시작' }));
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.12');
    const holdDraft: MotionDraftDefinition = {
      ...draft,
      phases: draft.phases.map((phase) => ({
        ...phase,
        displayBehavior: phase.id === 'turn' ? 'hold' : 'unknown',
      })),
    };
    view.rerender(
      <MotionDraftSegmentRehearsal
        draft={holdDraft}
        active
        activeSide="right"
        mirrored={false}
        onExit={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('시작 단계'), { target: { value: '2' } });
    expect(screen.getByLabelText('끝 단계')).toHaveValue('2');
    expect(screen.getByText(/정적 유지 구간/)).toBeInTheDocument();
    expect(callbacks.size).toBe(0);
  });

  it('inherits visibility, offscreen, reduced-motion, native-dialog and inactive guards, and cancels exit/unmount work', () => {
    const onExit = vi.fn();
    const view = render(
      <StrictMode>
        <dialog open>
          <MotionDraftSegmentRehearsal
            draft={draft}
            active
            activeSide="right"
            mirrored={false}
            onExit={onExit}
          />
        </dialog>
      </StrictMode>,
    );
    play();
    act(() => {
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(callbacks.size).toBe(0);
    hidden = false;
    play();
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(callbacks.size).toBe(0);
    play();
    act(() =>
      intersection(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(callbacks.size).toBe(0);
    play();
    expect(callbacks.size).toBe(0);
    act(() =>
      intersection(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(callbacks.size).toBe(0);
    play();
    act(() => {
      media.matches = true;
      mediaListeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });
    expect(callbacks.size).toBe(0);
    act(() => {
      media.matches = false;
      mediaListeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    });
    expect(callbacks.size).toBe(0);
    play();
    frame(0);
    const dialog = screen.getByRole('dialog');
    dialog.removeAttribute('open');
    frame(500);
    expect(callbacks.size).toBe(0);
    dialog.setAttribute('open', '');
    fireEvent.click(screen.getByRole('button', { name: '개별 동작으로 돌아가기' }));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(0);
    view.rerender(
      <StrictMode>
        <dialog open>
          <MotionDraftSegmentRehearsal
            draft={draft}
            active={false}
            activeSide="right"
            mirrored={false}
            onExit={onExit}
          />
        </dialog>
      </StrictMode>,
    );
    expect(screen.getByRole('button', { name: '구간 재생' })).toBeDisabled();
    view.rerender(
      <StrictMode>
        <dialog open>
          <MotionDraftSegmentRehearsal
            draft={draft}
            active
            activeSide="right"
            mirrored={false}
            onExit={onExit}
          />
        </dialog>
      </StrictMode>,
    );
    play();
    expect(callbacks.size).toBe(1);
    view.unmount();
    expect(callbacks.size).toBe(0);
    expect(mediaListeners.size).toBe(0);
  });

  it('rejects broken phase definitions without rendering a guessed Figure or scheduling work', () => {
    mount({
      draft: {
        ...draft,
        phases: draft.phases.map((phase, index) =>
          index === 1 ? { ...phase, start: phase.start + 0.01 } : phase,
        ),
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('빈틈이나 겹침 없이');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('button', { name: '구간 재생' })).toBeDisabled();
    expect(callbacks.size).toBe(0);
  });
});
