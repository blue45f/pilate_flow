import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MOTION_PATTERN_REFERENCES,
  getMotionPatternReferences,
} from '../data/motionPatternReferences';
import { EXERCISE_MOTION_REFERENCES } from '../data/motionReferences';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import { SUPINE_REACH_DEFINITION } from '../data/supineReach';
import { SUPINE_REACH_MODEL_VERSION } from '../models/supineReach';
import { MotionPatternPreview, MotionPatternThumbnail } from './MotionPatternPreview';
import { MotionPatternGallery } from './MotionPatternGallery';

let frames: Map<number, FrameRequestCallback>;
let hidden: boolean;
let reduced: boolean;
let onPreference: ((event: MediaQueryListEvent) => void) | undefined;
let onVisible: ((visible: boolean) => void) | undefined;
function frame(time: number) {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(time)));
}
beforeEach(() => {
  frames = new Map();
  hidden = false;
  reduced = false;
  onPreference = undefined;
  onVisible = undefined;
  let next = 0;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++next, callback);
    return next;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, callback: (event: MediaQueryListEvent) => void) => {
      onPreference = callback;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        onVisible = (isIntersecting) =>
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('authored pattern discovery boundaries', () => {
  it('combines 22 distinct authored variants without promoting any exact asset or approval', () => {
    expect(MOTION_PATTERN_REFERENCES).toHaveLength(22);
    expect(new Set(MOTION_PATTERN_REFERENCES.map((item) => item.variantId)).size).toBe(22);
    expect(
      MOTION_PATTERN_REFERENCES.filter((item) => item.family === 'existing-proposal'),
    ).toHaveLength(17);
    expect(
      MOTION_PATTERN_REFERENCES.filter((item) => item.family === 'authoring-batch'),
    ).toHaveLength(4);
    expect(MOTION_PATTERN_REFERENCES.filter((item) => item.family === 'supine-reach')).toHaveLength(
      1,
    );
    for (const item of MOTION_PATTERN_REFERENCES.filter(
      (item) => item.family === 'authoring-batch',
    )) {
      expect(item.assetVersion).toBe('original-motion-authoring-batch-1.0.0-draft');
      expect(item.assetSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(
      MOTION_PATTERN_REFERENCES.filter((item) => item.family === 'existing-proposal').every(
        (item) => item.assetVersion === null && item.assetSha256 === null,
      ),
    ).toBe(true);
    expect(
      new Set(MOTION_PATTERN_REFERENCES.flatMap((item) => item.intendedExerciseIds)).size,
    ).toBe(21);
    for (const reference of MOTION_PATTERN_REFERENCES) {
      expect(reference).toMatchObject({
        relation: 'pattern-reference',
        exactCanonicalMatch: false,
        professionalReviewStatus: 'unreviewed',
        professionalReviewCount: 0,
        autoRecommendationEligible: false,
      });
      expect(reference.equipment.length).toBeGreaterThan(0);
      expect(reference.context).toBeTruthy();
      expect(reference.definition.exactAssetReady).toBe(false);
      expect(reference.definition.professionalReviewCount).toBe(0);
    }
    expect(EXERCISE_MOTION_REFERENCES).toHaveLength(INITIAL_EXERCISES.length);
    expect(
      EXERCISE_MOTION_REFERENCES.every(
        (item) => item.asset === null && !item.expertApproved && item.prototypeId === null,
      ),
    ).toBe(true);
  });
  it('returns only explicit links, preserves both quadruped variants, and has no fallback', () => {
    expect(
      getMotionPatternReferences('original-mat-quadruped-reach').map((item) => item.variantId),
    ).toEqual(['quadruped-arm-slide', 'quadruped-leg-slide']);
    expect(getMotionPatternReferences('original-mat-mermaid')[0].variantId).toBe(
      'chair-seated-overhead-sidebend-v1',
    );
    expect(getMotionPatternReferences('original-mat-single-leg-stretch')).toEqual([
      expect.objectContaining({ family: 'supine-reach', variantId: SUPINE_REACH_DEFINITION.id }),
    ]);
    expect(getMotionPatternReferences('unknown-note')).toEqual([]);
    expect(getMotionPatternReferences('')).toEqual([]);
  });
  it('renders every thumbnail from its own asset and keeps the four batch geometries distinct', () => {
    const markup = MOTION_PATTERN_REFERENCES.map((reference) =>
      renderToStaticMarkup(<MotionPatternThumbnail reference={reference} />),
    );
    for (let index = 0; index < markup.length; index++) {
      expect(markup[index]).toContain(
        `data-motion-variant="${MOTION_PATTERN_REFERENCES[index].variantId}"`,
      );
      expect(markup[index]).toContain('<svg');
      expect(markup[index]).not.toContain('<img');
      expect(markup[index]).not.toMatch(/NaN|Infinity/);
    }
    const geometries = MOTION_PATTERN_REFERENCES.filter(
      (reference) => reference.family === 'authoring-batch',
    )
      .map((reference) => renderToStaticMarkup(<MotionPatternThumbnail reference={reference} />))
      .map((value) =>
        value.replace(
          /<title[^>]*>.*?<\/title>|<desc[^>]*>.*?<\/desc>|aria-labelledby="[^"]*"|id="[^"]*"|data-motion-variant="[^"]*"/g,
          '',
        ),
      );
    expect(new Set(geometries).size).toBe(4);
  });
  it('dispatches the isolated supine-reach thumbnail and preview without substituting a legacy or batch figure', () => {
    const reference = getMotionPatternReferences('original-mat-single-leg-stretch')[0];
    expect(reference).toMatchObject({
      family: 'supine-reach',
      variantId: 'supine-single-leg-reach-v1',
      assetVersion: SUPINE_REACH_MODEL_VERSION,
      exactCanonicalMatch: false,
      professionalReviewCount: 0,
    });
    expect(reference.definition).toBe(SUPINE_REACH_DEFINITION);
    const thumbnail = renderToStaticMarkup(<MotionPatternThumbnail reference={reference} />);
    expect(thumbnail).toContain('data-motion-family="supine-reach"');
    expect(thumbnail).toContain('data-motion-variant="supine-single-leg-reach-v1"');
    expect(thumbnail).toContain('data-variant-id="supine-single-leg-reach-v1"');
    expect(thumbnail).toContain(`data-model-version="${SUPINE_REACH_MODEL_VERSION}"`);
    expect(thumbnail).not.toContain('data-motion-draft-id=');
    expect(thumbnail).not.toContain('data-motion-variant-id=');
    expect(thumbnail).not.toMatch(/NaN|Infinity/);

    const { container } = render(<MotionPatternPreview reference={reference} />);
    expect(container.querySelector('.motion-pattern-preview')).toHaveAttribute(
      'data-motion-family',
      'supine-reach',
    );
    const figure = container.querySelector('svg[role="img"]');
    expect(figure).toHaveAttribute('data-variant-id', SUPINE_REACH_DEFINITION.id);
    expect(figure).toHaveAttribute('data-model-version', SUPINE_REACH_MODEL_VERSION);
    expect(figure).toHaveAttribute('data-phase', 'setup');
    expect(figure).toHaveAttribute('data-progress', '0');
    expect(figure).toHaveAttribute('data-exact-asset-ready', 'false');
    expect(figure).toHaveAttribute('data-professional-review-count', '0');
    expect(figure).not.toHaveAttribute('data-motion-draft-id');
    expect(figure).not.toHaveAttribute('data-motion-variant-id');
    expect(container.querySelector('.mpp-anatomy')).toHaveTextContent('두 겹 윤곽: 움직이는 다리.');
    expect(screen.getByLabelText('도해 위치')).toHaveValue('0');
    expect(screen.getByText('일시정지 · 자동 재생 없음')).toBeInTheDocument();
    expect(frames.size).toBe(0);
  });
  it('offers exactly three workbench studies, opens a selected real variant paused, and shows linked exercise cues/precautions and sequence insert', () => {
    const onViewAll = vi.fn();
    const onInsertExercise = vi.fn();
    const pelvicBridge = ORIGINAL_MOVEMENTS.find((item) => item.id === 'original-mat-bridge')!;
    render(<MotionPatternGallery onViewAll={onViewAll} onInsertExercise={onInsertExercise} />);
    expect(screen.getAllByRole('button', { name: /관련 패턴 초안 보기/ })).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: '모두 보기' }));
    expect(onViewAll).toHaveBeenCalledOnce();
    fireEvent.click(
      screen.getByRole('button', { name: '분절 골반 말기 · 저작 도해 관련 패턴 초안 보기' }),
    );
    frame(0);
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(screen.getByText('일시정지 · 자동 재생 없음')).toBeInTheDocument();
    expect(frames.size).toBe(0);

    const summary = screen.getByRole('region', {
      name: '연결 동작 설명·주의점 및 시퀀스 삽입',
    });
    expect(summary).toHaveTextContent(pelvicBridge.nameKo);
    expect(summary).toHaveTextContent('동작 설명·티칭 큐');
    expect(summary).toHaveTextContent('주의점·금기 사항');
    const insertButton = screen.getByRole('button', {
      name: '시퀀스에 바로 삽입',
    });
    expect(insertButton).toBeEnabled();
    fireEvent.click(insertButton);
    expect(onInsertExercise).toHaveBeenCalledExactlyOnceWith(pelvicBridge);

    fireEvent.click(screen.getByRole('button', { name: '모션 살펴보기 닫기' }));
    expect(screen.queryByRole('button', { name: '한 주기 재생' })).not.toBeInTheDocument();
  });
});

describe.each([
  'supine-knee-fold',
  'chair-seated-overhead-sidebend-v1',
  'supine-single-leg-reach-v1',
] as const)('inline %s playback', (variantId) => {
  const reference = MOTION_PATTERN_REFERENCES.find((item) => item.variantId === variantId)!;
  it('starts paused, changes speed, plays one cycle and does not loop', () => {
    render(<MotionPatternPreview reference={reference} />);
    expect(frames.size).toBe(0);
    expect(screen.getByLabelText('도해 위치')).toHaveValue('0');
    fireEvent.change(screen.getByLabelText('관련 패턴 도해 속도'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(8000);
    expect(screen.getByLabelText('도해 위치')).toHaveValue('500');
    frame(16000);
    expect(screen.getByLabelText('도해 위치')).toHaveValue('1000');
    expect(frames.size).toBe(0);
    expect(screen.getByText('한 주기 끝 · 일시정지')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('관련 패턴 도해 반복'), { target: { value: '2' } });
    expect(screen.getByLabelText('도해 위치')).toHaveValue('0');
    expect(screen.getByText('일시정지 · 2회 반복 설정 · 자동 재생 없음')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('관련 패턴 도해 속도'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: '2회 반복 재생' }));
    frame(0);
    frame(8000);
    expect(screen.getByText('도해 반복 재생 중 (2 / 2회)')).toBeInTheDocument();
    frame(16000);
    expect(screen.getByText('반복 재생 끝 (2회) · 일시정지')).toBeInTheDocument();
    expect(frames.size).toBe(0);
  });
  it.each([2, 3] as const)(
    'keeps the %i-repeat play label accurate through playback and interruptions',
    (repeatCount) => {
      const { rerender } = render(<MotionPatternPreview reference={reference} />);
      const repeat = screen.getByLabelText('관련 패턴 도해 반복');
      const playLabel = `${repeatCount}회 반복 재생`;
      const playButton = () => screen.getByRole('button', { name: playLabel });

      fireEvent.change(repeat, { target: { value: String(repeatCount) } });
      expect(playButton()).toBeEnabled();
      expect(screen.queryByRole('button', { name: '한 주기 재생' })).not.toBeInTheDocument();
      expect(frames.size).toBe(0);

      fireEvent.click(playButton());
      expect(screen.getByRole('button', { name: '일시정지' })).toBeEnabled();
      frame(0);
      frame(4000);
      fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
      expect(playButton()).toBeEnabled();
      expect(screen.getByLabelText('도해 위치')).toHaveValue('500');
      expect(frames.size).toBe(0);

      fireEvent.click(playButton());
      frame(5000);
      frame(9000);
      expect(screen.getByRole('button', { name: '일시정지' })).toBeEnabled();
      expect(screen.getByText(`도해 반복 재생 중 (2 / ${repeatCount}회)`)).toBeInTheDocument();

      const otherCount = repeatCount === 2 ? 3 : 2;
      fireEvent.change(repeat, { target: { value: String(otherCount) } });
      expect(screen.getByRole('button', { name: `${otherCount}회 반복 재생` })).toBeEnabled();
      expect(screen.getByLabelText('도해 위치')).toHaveValue('0');
      expect(frames.size).toBe(0);
      fireEvent.change(repeat, { target: { value: String(repeatCount) } });
      fireEvent.click(playButton());
      frame(0);
      frame(repeatCount * 8000);
      expect(screen.getByText(`반복 재생 끝 (${repeatCount}회) · 일시정지`)).toBeInTheDocument();
      expect(playButton()).toBeEnabled();
      expect(frames.size).toBe(0);

      fireEvent.click(screen.getByRole('button', { name: '관련 패턴 처음으로' }));
      expect(playButton()).toBeEnabled();
      expect(screen.getByLabelText('도해 위치')).toHaveValue('0');
      fireEvent.change(repeat, { target: { value: '1' } });
      expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
      fireEvent.change(repeat, { target: { value: String(repeatCount) } });
      expect(playButton()).toBeEnabled();

      fireEvent.click(screen.getByLabelText('정지 화면만 보기'));
      expect(playButton()).toBeDisabled();
      fireEvent.click(screen.getByLabelText('정지 화면만 보기'));
      expect(playButton()).toBeEnabled();
      rerender(<MotionPatternPreview reference={reference} active={false} />);
      expect(playButton()).toBeDisabled();
      rerender(<MotionPatternPreview reference={reference} />);
      expect(playButton()).toBeEnabled();
      act(() => {
        reduced = true;
        onPreference?.({ matches: true } as MediaQueryListEvent);
      });
      expect(playButton()).toBeDisabled();
      act(() => {
        reduced = false;
        onPreference?.({ matches: false } as MediaQueryListEvent);
      });
      expect(playButton()).toBeEnabled();
      expect(frames.size).toBe(0);
    },
  );
  it('supports static phases and separates anatomical side from mirroring', () => {
    render(<MotionPatternPreview reference={reference} />);
    expect(screen.getByRole('button', { name: '이전 도해 단계' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '다음 도해 단계' }));
    expect(screen.getByLabelText('도해 위치')).toHaveValue(
      String(Math.round(reference.definition.phases[1].sample * 1000)),
    );
    fireEvent.click(screen.getByRole('button', { name: '이전 도해 단계' }));
    expect(screen.getByLabelText('도해 위치')).toHaveValue(
      String(Math.round(reference.definition.phases[0].sample * 1000)),
    );
    fireEvent.click(screen.getByLabelText('정지 화면만 보기'));
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    const turn = reference.definition.phases.find((item) => item.id === 'turn')!;
    fireEvent.click(
      screen.getByRole('button', { name: 'labelKo' in turn ? turn.labelKo : turn.label }),
    );
    expect(screen.getByLabelText('도해 위치')).toHaveValue(String(Math.round(turn.sample * 1000)));
    fireEvent.change(screen.getByLabelText('관련 패턴 해부학적 쪽'), {
      target: { value: 'right' },
    });
    expect(screen.getByLabelText('도해 위치')).toHaveValue('0');
    fireEvent.click(screen.getByLabelText('화면만 좌우 반전'));
    expect(screen.getByLabelText('관련 패턴 해부학적 쪽')).toHaveValue('right');
    expect(document.querySelector('.mpp-anatomy')).toHaveTextContent(
      variantId === 'supine-knee-fold'
        ? '실선: 몸의 오른쪽 · 점선: 몸의 왼쪽'
        : '실선: 몸의 왼쪽 · 점선: 몸의 오른쪽',
    );
    if (variantId === 'supine-single-leg-reach-v1') {
      expect(document.querySelector('.mpp-anatomy')).toHaveTextContent(
        '두 겹 윤곽: 움직이는 다리.',
      );
      const figure = document.querySelector('svg[data-motion-family="supine-reach"]')!;
      expect(figure).toHaveAttribute('data-active-side', 'right');
      expect(figure).toHaveAttribute('data-retained-side', 'left');
      expect(figure).toHaveAttribute('data-view-mirrored', 'true');
      expect(figure.querySelector('[data-limb-role="active"]')).toHaveAttribute(
        'data-anatomical-side',
        'right',
      );
      expect(figure.querySelector('[data-limb-role="retained"]')).toHaveAttribute(
        'data-anatomical-side',
        'left',
      );
      const leftLines = figure.querySelectorAll('[data-anatomical-line="left"]');
      const rightLines = figure.querySelectorAll('[data-anatomical-line="right"]');
      expect(leftLines.length).toBeGreaterThan(0);
      expect(rightLines.length).toBeGreaterThan(0);
      leftLines.forEach((line) => expect(line).not.toHaveAttribute('stroke-dasharray'));
      rightLines.forEach((line) => expect(line).toHaveAttribute('stroke-dasharray', '7 4'));
    } else {
      expect(document.querySelector('.mpp-anatomy')).not.toHaveTextContent('두 겹 윤곽');
    }
    expect(frames.size).toBe(0);
  });
  it('pauses when inactive, hidden, offscreen, reduced-motion or unmounted and never auto-resumes', () => {
    const { rerender, unmount } = render(<MotionPatternPreview reference={reference} />);
    const play = () => fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    play();
    expect(frames.size).toBe(1);
    rerender(<MotionPatternPreview reference={reference} active={false} />);
    expect(frames.size).toBe(0);
    rerender(<MotionPatternPreview reference={reference} />);
    expect(frames.size).toBe(0);
    play();
    hidden = true;
    fireEvent(document, new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    hidden = false;
    fireEvent(document, new Event('visibilitychange'));
    expect(frames.size).toBe(0);
    play();
    act(() => onVisible?.(false));
    expect(frames.size).toBe(0);
    act(() => onVisible?.(true));
    expect(frames.size).toBe(0);
    play();
    act(() => {
      reduced = true;
      onPreference?.({ matches: true } as MediaQueryListEvent);
    });
    expect(frames.size).toBe(0);
    expect(screen.getByLabelText('정지 화면만 보기')).toBeChecked();
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    act(() => {
      reduced = false;
      onPreference?.({ matches: false } as MediaQueryListEvent);
    });
    expect(frames.size).toBe(0);
    play();
    unmount();
    expect(frames.size).toBe(0);
  });
});
