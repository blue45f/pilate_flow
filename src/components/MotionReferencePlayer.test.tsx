import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXERCISE_MOTION_REFERENCES } from '../data/motionReferences';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { MotionReferencePlayer } from './MotionReferencePlayer';

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let hidden: boolean;
let reduced: boolean;
let preferenceChanged: ((event: MediaQueryListEvent) => void) | null;
let visibilityChanged: ((visible: boolean) => void) | null;

function sampleFrame(now: number) {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => {
    callbacks.forEach((callback) => callback(now));
  });
}

beforeEach(() => {
  frames = new Map();
  nextFrame = 1;
  hidden = false;
  reduced = false;
  preferenceChanged = null;
  visibilityChanged = null;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      frames.delete(id);
    }),
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return reduced;
      },
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_name: string, callback: (event: MediaQueryListEvent) => void) => {
        preferenceChanged = callback;
      },
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        visibilityChanged = (visible) =>
          callback(
            [{ isIntersecting: visible } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('isolated motion reference player', () => {
  it('keeps all 98 exact assets pending while directly exposing explicit related drafts', () => {
    expect(EXERCISE_MOTION_REFERENCES).toHaveLength(98);
    for (const reference of EXERCISE_MOTION_REFERENCES) {
      expect(reference.asset).toBeNull();
      expect(reference.prototypeId).toBeNull();
      expect(reference.expertApproved).toBe(false);
    }
    const { container, rerender } = render(
      <MotionReferencePlayer
        exerciseId={
          EXERCISE_MOTION_REFERENCES.find(
            (item) => !getMotionPatternReferences(item.exerciseId).length,
          )!.exerciseId
        }
      />,
    );
    expect(
      screen.getByText('기구학 5단계 연속·3단계 도해 · 출처 대조 확인'),
    ).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    rerender(<MotionReferencePlayer exerciseId="original-mat-bridge" mode="prototype-lab" />);
    expect(screen.getByRole('region', { name: '관련 패턴 모션 초안' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '분절 골반 말기 · 저작 도해' })).toBeInTheDocument();
    expect(container.querySelector('[data-exact-canonical-match="false"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(screen.getByText('일시정지 · 자동 재생 없음')).toBeInTheDocument();
    expect(frames.size).toBe(0);
  });

  it('does not turn an unknown ID or a rest step into a motion', () => {
    const { container, rerender } = render(
      <MotionReferencePlayer exerciseId="unknown-custom-note" />,
    );
    expect(screen.getByText('커스텀 도해 가이드')).toBeInTheDocument();
    rerender(<MotionReferencePlayer kind="rest" exerciseId="" mode="prototype-lab" />);
    expect(container).toBeEmptyDOMElement();
    expect(frames.size).toBe(0);
  });

  it('starts the explicit two-prototype lab paused and presents its provenance honestly', () => {
    render(<MotionReferencePlayer mode="prototype-lab" />);
    expect(screen.getByRole('button', { name: '모션 한 번 재생' })).toBeEnabled();
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('0');
    expect(
      screen
        .getAllByRole('option')
        .filter((option) =>
          ['bridge-pattern', 'heel-slide'].includes((option as HTMLOptionElement).value),
        ),
    ).toHaveLength(2);
    expect(screen.getByText(/브릿지 패턴의 기획 도해이며 숄더 브릿지/)).toBeInTheDocument();
    expect(screen.getByText('원본 모델 파일 SHA-256')).toBeInTheDocument();
    expect(
      screen.getByText('100dc3f7014fbe9ced6f2af1c755ba6f385e4351e64e009f1df66176a9eaf3c9'),
    ).toBeInTheDocument();
    expect(frames.size).toBe(0);
  });

  it('plays one cycle, ends without a loop and replays only after another click', () => {
    render(<MotionReferencePlayer mode="prototype-lab" />);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    sampleFrame(0);
    sampleFrame(3250);
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('500');
    sampleFrame(6500);
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('1000');
    expect(screen.getByRole('button', { name: '모션 한 번 재생' })).toBeInTheDocument();
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('0');
  });

  it('retains the requested scrub position when pausing and provides static stages', () => {
    render(<MotionReferencePlayer mode="prototype-lab" />);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    sampleFrame(100);
    sampleFrame(1000);
    fireEvent.change(screen.getByLabelText('모션 미리보기 위치'), { target: { value: '666' } });
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('666');
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '전환 자세 보기' }));
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('530');
    fireEvent.click(screen.getByRole('button', { name: '끝 자세 보기' }));
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('1000');
    fireEvent.click(screen.getByRole('button', { name: '시작 자세 보기' }));
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('0');
  });

  it('changes preview speed without treating it as exercise duration', () => {
    render(<MotionReferencePlayer mode="prototype-lab" />);
    fireEvent.change(screen.getByLabelText('모션 미리보기 속도'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    sampleFrame(0);
    sampleFrame(6500);
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('500');
    expect(screen.getByText(/한 주기 6.5초는 미리보기 시간/)).toBeInTheDocument();
  });

  it('separates anatomical side from drawing mirroring and resets each change paused', () => {
    const { container } = render(<MotionReferencePlayer mode="prototype-lab" />);
    fireEvent.change(screen.getByLabelText('독립 모션 시안 선택'), {
      target: { value: 'heel-slide' },
    });
    expect(screen.getByText(/소아 물리치료 자료를 참고한 기획 도해/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    sampleFrame(0);
    sampleFrame(500);
    fireEvent.click(screen.getByRole('button', { name: '해부학적 오른쪽' }));
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('0');
    expect(frames.size).toBe(0);
    expect(container.querySelector('[data-anatomical-side="right"]')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(container.querySelector('[data-anatomical-side="left"]')).toHaveAttribute(
      'data-active',
      'false',
    );
    fireEvent.click(screen.getByLabelText('화면만 좌우 반전'));
    expect(screen.getByRole('button', { name: '해부학적 오른쪽' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.querySelector('[data-view-mirrored]')).toHaveAttribute(
      'data-view-mirrored',
      'true',
    );
    expect(container.querySelector('[data-anatomical-side="right"]')).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  it('cancels animation on clip change, inactive props and unmount', () => {
    const { rerender, unmount } = render(<MotionReferencePlayer mode="prototype-lab" />);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    expect(frames.size).toBe(1);
    fireEvent.change(screen.getByLabelText('독립 모션 시안 선택'), {
      target: { value: 'heel-slide' },
    });
    expect(frames.size).toBe(0);
    expect(screen.getByLabelText('모션 미리보기 위치')).toHaveValue('0');
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    rerender(<MotionReferencePlayer mode="prototype-lab" active={false} />);
    expect(frames.size).toBe(0);
    expect(screen.getByRole('button', { name: '모션 한 번 재생' })).toBeDisabled();
    rerender(<MotionReferencePlayer mode="prototype-lab" active />);
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    unmount();
    expect(frames.size).toBe(0);
  });

  it('provides reduced-motion/static fallbacks and never auto-resumes', () => {
    reduced = true;
    render(<MotionReferencePlayer mode="prototype-lab" />);
    expect(screen.getByRole('button', { name: '모션 한 번 재생' })).toBeDisabled();
    expect(screen.getByLabelText('정지 화면만 보기')).toBeChecked();
    act(() => {
      reduced = false;
      preferenceChanged?.({ matches: false } as MediaQueryListEvent);
    });
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    act(() => {
      reduced = true;
      preferenceChanged?.({ matches: true } as MediaQueryListEvent);
    });
    expect(frames.size).toBe(0);
    expect(screen.getByRole('button', { name: '모션 한 번 재생' })).toBeDisabled();
  });

  it('stops in hidden tabs and outside the viewport without restarting on return', () => {
    render(<MotionReferencePlayer mode="prototype-lab" />);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    hidden = true;
    fireEvent(document, new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    hidden = false;
    fireEvent(document, new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '모션 한 번 재생' }));
    act(() => visibilityChanged?.(false));
    expect(frames.size).toBe(0);
    act(() => visibilityChanged?.(true));
    expect(frames.size).toBe(0);
  });
});
