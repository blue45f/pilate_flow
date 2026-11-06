import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionDraftLabDialog } from '../components/MotionDraftLabDialog';
import { MotionDraftFigure } from '../components/MotionDraftFigure';
import { MOTION_DRAFTS } from '../data/motionDrafts';
import type { MotionDraftId } from '../models/types';

let serial = 0;
let callbacks: Map<number, FrameRequestCallback>;
let media: { matches: boolean };
let mediaListeners: Set<(event: MediaQueryListEvent) => void>;
let observers: {
  callback: IntersectionObserverCallback;
  observer: IntersectionObserver;
}[];
const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
beforeEach(() => {
  serial = 0;
  callbacks = new Map();
  media = { matches: false };
  mediaListeners = new Set();
  observers = [];
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => false,
  });
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
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        mediaListeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        mediaListeners.delete(listener),
    })),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        observers.push({
          callback,
          observer: this as unknown as IntersectionObserver,
        });
      }
      observe() {}
      disconnect() {}
      unobserve() {}
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
function frame(time: number) {
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(time));
  });
}
function staticPeak() {
  fireEvent.click(
    within(screen.getByRole('group', { name: '다섯 단계 정지 그림' })).getAllByRole('button')[2],
  );
}

describe('native React draft design lab', () => {
  it('is closed unless requested and shows exact proposal/support boundaries without changing metadata or fetching', () => {
    const before = JSON.stringify(MOTION_DRAFTS);
    const fetch = vi.spyOn(globalThis, 'fetch');
    const view = render(<MotionDraftLabDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<MotionDraftLabDialog open onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: '모션 변형 제안 검토' })).toHaveAttribute('open');
    expect(screen.getByText('전문가 검토 0건')).toBeInTheDocument();
    expect(screen.getByText('완성 자산 0건')).toBeInTheDocument();
    const selected = within(screen.getByRole('region', { name: '선택한 변형 제안' }));
    expect(
      within(document.querySelector('.mdl-evidence')!).getByText(/original-mat-ankle-reach/),
    ).toBeInTheDocument();
    expect(selected.getByText(/필라테스 체어가 아닙니다/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('일시정지');
    expect(screen.getByRole('combobox', { name: '도해 재생 속도' })).toHaveValue('1');
    expect(screen.getByRole('combobox', { name: '도해 재생 속도' })).toHaveAccessibleDescription(
      '시간·속도는 도해 표시용입니다. 실제 운동의 권장 속도·횟수·운동량이 아닙니다.',
    );
    expect(screen.getByRole('combobox', { name: '양쪽 함께 · 좌우 분리 없음' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: '양쪽 함께 · 좌우 분리 없음' })).toHaveValue(
      'together',
    );
    expect(callbacks.size).toBe(0);
    expect(screen.queryByRole('button', { name: /승인|수업 시작/ })).not.toBeInTheDocument();
    expect(document.querySelector('iframe,video,img')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(MOTION_DRAFTS)).toBe(before);
  });
  it('plays only explicitly, changes speed, pauses and terminates a single cycle', () => {
    render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('도해 재생 속도'), {
      target: { value: '0.5' },
    });
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(4000);
    expect(screen.getByRole('slider', { name: '도해 위치' })).toHaveValue('250');
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent('일시정지');
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }));
    fireEvent.change(screen.getByLabelText('도해 재생 속도'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(8000);
    expect(screen.getByRole('status')).toHaveTextContent('한 주기 종료');
    expect(callbacks.size).toBe(0);
  });
  it('keeps anatomy distinct from mirror and resets to a paused frame when proposal or side changes', () => {
    render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox', { name: '제작 초안 선택' }), {
      target: { value: 'side-lying-clam' },
    });
    staticPeak();
    expect(screen.getByRole('img')).toHaveAttribute('data-motion-draft-id', 'side-lying-clam');
    fireEvent.change(screen.getByLabelText('움직이는 위쪽 다리'), {
      target: { value: 'left' },
    });
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0');
    expect(screen.getByRole('img')).toHaveAttribute('data-active-side', 'left');
    fireEvent.click(screen.getByRole('checkbox', { name: '화면만 반전 · 몸의 좌우 유지' }));
    expect(screen.getByRole('img')).toHaveAttribute('data-active-side', 'left');
    expect(screen.getByRole('img')).toHaveAttribute('data-view-mirrored', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('일시정지');
    fireEvent.click(
      screen.getByText('출처·카탈로그 대조 · 일치·미확인·불일치', {
        selector: 'summary',
      }),
    );
    expect(screen.getByRole('heading', { name: '미확인' })).toBeInTheDocument();
    expect(
      within(document.querySelector('.mdl-evidence')!).getByText(
        /머리 베개 요구가 기존 소도구 목록에 없으므로/,
      ),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\//);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
  it('uses static frames in reduced motion and pauses on visibility, intersection and pagehide events', () => {
    media.matches = true;
    render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    staticPeak();
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0.51');
    expect(callbacks.size).toBe(0);
    act(() => {
      media.matches = false;
      mediaListeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    });
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(100);
    act(() => {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent('일시정지');
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    act(() => {
      const last = observers.at(-1)!;
      last.callback([{ isIntersecting: false } as IntersectionObserverEntry], last.observer);
    });
    expect(callbacks.size).toBe(0);
    act(() => {
      const last = observers.at(-1)!;
      last.callback([{ isIntersecting: true } as IntersectionObserverEntry], last.observer);
    });
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(callbacks.size).toBe(0);
  });
  it('closes natively before one callback, ignores queued old close events, restores focus, and cancels frames under StrictMode', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const view = render(
      <StrictMode>
        <MotionDraftLabDialog open onClose={onClose} />
      </StrictMode>,
    );
    const dialog = screen.getByRole('dialog');
    const first = screen.getByRole('button', { name: '모션 설계 검토 닫기' });
    const last = screen.getByRole('button', { name: '검토 도구 닫기' });
    const visibleRect = [{ width: 44, height: 44 }] as unknown as DOMRectList;
    vi.spyOn(first, 'getClientRects').mockReturnValue(visibleRect);
    vi.spyOn(last, 'getClientRects').mockReturnValue(visibleRect);
    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(first).toHaveFocus();
    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent(dialog, new Event('close'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(100);
    fireEvent.click(screen.getByRole('button', { name: '모션 설계 검토 닫기' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(0);
    expect(opener).toHaveFocus();
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    opener.remove();
  });
  it('pauses and closes when open becomes false and resets when the initial proposal changes', () => {
    const view = render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(100);
    view.rerender(<MotionDraftLabDialog open={false} onClose={vi.fn()} />);
    expect(callbacks.size).toBe(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<MotionDraftLabDialog open initialDraftId="side-lying-clam" onClose={vi.fn()} />);
    expect(screen.getByRole('img')).toHaveAttribute('data-motion-draft-id', 'side-lying-clam');
    expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0');
    expect(screen.getByRole('status')).toHaveTextContent('일시정지');
  });
  it('never substitutes a generic proposal for an unrecognized ID', () => {
    render(
      <MotionDraftLabDialog
        open
        initialDraftId={'original-mat-bridge' as MotionDraftId}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/선택한 변형 제안을 찾을 수 없습니다/)).toBeInTheDocument();
    expect(callbacks.size).toBe(0);
    cleanup();
    render(<MotionDraftFigure draftId={'unknown' as MotionDraftId} progress={0.5} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
  it('selects all distinct original proposals, keeps each side truthful and leaves canonical assets pending', () => {
    render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    const picker = screen.getByRole('combobox', { name: '제작 초안 선택' });
    expect(within(picker).getAllByRole('option')).toHaveLength(17);
    const ids = [
      'adult-supine-heel-slide',
      'supine-knee-fold',
      'side-lying-straight-leg-lift',
      'side-lying-open-book',
    ];
    const paths = new Set<string>();
    for (const id of ids) {
      fireEvent.change(picker, { target: { value: id } });
      expect(screen.getByRole('img')).toHaveAttribute('data-motion-draft-id', id);
      expect(screen.getByRole('img')).toHaveAttribute('data-progress', '0');
      const label = id.startsWith('side-lying') ? '위쪽에 놓인 몸의 쪽' : '움직이는 다리';
      fireEvent.change(screen.getByRole('combobox', { name: label }), {
        target: { value: 'left' },
      });
      staticPeak();
      expect(screen.getByRole('img')).toHaveAttribute('data-active-side', 'left');
      const svg = screen.getByRole('img');
      paths.add(
        [...svg.querySelectorAll('path,polyline,polygon')]
          .map((item) => item.getAttribute('d') ?? item.getAttribute('points'))
          .join('|'),
      );
      fireEvent.click(screen.getByRole('checkbox', { name: '화면만 반전 · 몸의 좌우 유지' }));
      expect(screen.getByRole('img')).toHaveAttribute('data-active-side', 'left');
      expect(screen.getByRole('img')).toHaveAttribute('data-view-mirrored', 'true');
      expect(screen.getByText('완성 자산 0건')).toBeInTheDocument();
      expect(callbacks.size).toBe(0);
    }
    expect(paths.size).toBe(4);
  });

  it('dispatches the four apparatus/quadruped variants with truthful side controls', () => {
    render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    const picker = screen.getByRole('combobox', { name: '제작 초안 선택' });
    const paths = new Set<string>();
    for (const draftId of [
      'quadruped-arm-slide',
      'quadruped-leg-slide',
      'reformer-parallel-footwork',
      'chair-seated-pedal-press',
    ]) {
      fireEvent.change(picker, { target: { value: draftId } });
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('data-motion-draft-id', draftId);
      expect(image).toHaveAttribute('data-progress', '0');
      if (draftId.startsWith('quadruped')) {
        fireEvent.change(
          screen.getByRole('combobox', {
            name: draftId === 'quadruped-arm-slide' ? '움직이는 팔' : '움직이는 다리',
          }),
          { target: { value: 'left' } },
        );
        expect(image).toHaveAttribute('data-active-side', 'left');
      } else
        expect(screen.getByRole('combobox', { name: '양쪽 함께 · 좌우 분리 없음' })).toBeDisabled();
      staticPeak();
      paths.add(
        [...image.querySelectorAll('path,polyline,polygon')]
          .map((e) => e.getAttribute('d') ?? e.getAttribute('points'))
          .join('|'),
      );
      fireEvent.click(screen.getByRole('checkbox', { name: '화면만 반전 · 몸의 좌우 유지' }));
      expect(image).toHaveAttribute('data-view-mirrored', 'true');
      expect(screen.getByText('완성 자산 0건')).toBeInTheDocument();
      expect(callbacks.size).toBe(0);
    }
    expect(paths.size).toBe(4);
  });

  it('stops the individual clock before opening composition and returns paused without class writes', () => {
    const before = JSON.stringify(MOTION_DRAFTS);
    render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(100);
    expect(callbacks.size).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '조합 미리보기' }));
    expect(callbacks.size).toBe(0);
    expect(screen.queryByRole('button', { name: '한 주기 재생' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: '추가할 미검토 제안' }), {
      target: { value: 'supine-knee-fold' },
    });
    fireEvent.click(screen.getByRole('button', { name: '모션 추가' }));
    expect(
      within(screen.getByRole('list', { name: '직접 구성한 표시 블록' })).getAllByRole('listitem'),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '개별 동작' }));
    expect(screen.getByRole('status')).toHaveTextContent('일시정지');
    expect(screen.getByRole('slider', { name: '도해 위치' })).toHaveValue('0');
    expect(callbacks.size).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '조합 미리보기' }));
    expect(
      within(screen.getByRole('list', { name: '직접 구성한 표시 블록' })).getAllByRole('listitem'),
    ).toHaveLength(1);
    expect(JSON.stringify(MOTION_DRAFTS)).toBe(before);
  });
});

describe('native lab transitions into per-motion segment rehearsal', () => {
  it('owns one clock across whole/segment/whole, keeps exact selected fractions and returns focus without data writes', () => {
    const store = vi.spyOn(Storage.prototype, 'setItem');
    const fetch = vi.spyOn(globalThis, 'fetch');
    const before = JSON.stringify(MOTION_DRAFTS);
    render(<MotionDraftLabDialog open onClose={vi.fn()} initialDraftId="side-lying-clam" />);
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(300);
    expect(callbacks.size).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '선택 구간 연습 열기' }));
    const segment = screen.getByRole('region', { name: '모션 구간 연습' });
    expect(segment).toHaveFocus();
    expect(screen.queryByRole('button', { name: '한 주기 재생' })).toBeNull();
    expect(callbacks.size).toBe(0);
    fireEvent.change(within(segment).getByLabelText('시작 단계'), { target: { value: '1' } });
    fireEvent.change(within(segment).getByLabelText('끝 단계'), { target: { value: '1' } });
    const selected = MOTION_DRAFTS.find((draft) => draft.id === 'side-lying-clam')!;
    expect(screen.getByRole('img')).toHaveAttribute(
      'data-progress',
      String(selected.phases[1].start),
    );
    fireEvent.click(within(segment).getByRole('button', { name: '구간 재생' }));
    expect(callbacks.size).toBe(1);
    for (let time = 0; time <= 3000; time += 500) frame(time);
    expect(within(segment).getByRole('status')).toHaveTextContent('선택 구간 끝');
    expect(screen.getByRole('img')).toHaveAttribute(
      'data-progress',
      String(selected.phases[1].end),
    );
    expect(callbacks.size).toBe(0);
    fireEvent.click(within(segment).getByRole('button', { name: '개별 동작으로 돌아가기' }));
    expect(screen.getByRole('group', { name: '개별 모션 도해' })).toHaveFocus();
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(callbacks.size).toBe(0);
    expect(store).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(MOTION_DRAFTS)).toBe(before);
  });

  it('pauses source/side/mirror and parent-mode transitions, then unmounts every pending segment frame on close', () => {
    const onClose = vi.fn();
    const view = render(
      <MotionDraftLabDialog open onClose={onClose} initialDraftId="side-lying-clam" />,
    );
    fireEvent.click(screen.getByRole('button', { name: '선택 구간 연습 열기' }));
    let segment = screen.getByRole('region', { name: '모션 구간 연습' });
    fireEvent.click(within(segment).getByRole('button', { name: '구간 재생' }));
    frame(0);
    frame(500);
    expect(callbacks.size).toBe(1);
    fireEvent.change(screen.getByLabelText('움직이는 위쪽 다리'), { target: { value: 'left' } });
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('img')).toHaveAttribute('data-active-side', 'left');
    fireEvent.click(screen.getByLabelText('화면만 반전 · 몸의 좌우 유지'));
    expect(screen.getByRole('img')).toHaveAttribute('data-view-mirrored', 'true');
    fireEvent.change(screen.getByLabelText('제작 초안 선택'), {
      target: { value: 'supine-knee-fold' },
    });
    expect(callbacks.size).toBe(0);
    expect(screen.getByRole('img')).toHaveAttribute('data-motion-draft-id', 'supine-knee-fold');
    fireEvent.click(screen.getByText('이 제안의 검토 자료'));
    expect(
      within(screen.getByRole('region', { name: '선택한 제안의 검토 자료' })).getByText(
        'supine-knee-fold',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '조합 미리보기' }));
    expect(callbacks.size).toBe(0);
    expect(screen.queryByRole('region', { name: '모션 구간 연습' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '개별 동작' }));
    segment = screen.getByRole('region', { name: '모션 구간 연습' });
    expect(callbacks.size).toBe(0);
    fireEvent.click(within(segment).getByRole('button', { name: '구간 재생' }));
    frame(0);
    frame(500);
    fireEvent.click(screen.getByRole('button', { name: '모션 설계 검토 닫기' }));
    view.rerender(<MotionDraftLabDialog open={false} onClose={onClose} />);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(0);
  });
});
