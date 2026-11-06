import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { getExerciseMotionReference } from '../data/motionReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { SequencePlanPreview } from './SequencePlanPreview';

const original = usePilatesStore.getState();
const catalogSnapshot = JSON.stringify(INITIAL_EXERCISES);
const canonical = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-mat-bridge')!;
const step: SequenceStep = {
  stepId: 'related-motion-pending-bridge',
  order: 1,
  exerciseId: canonical.id,
  blockCategory: canonical.blockCategory,
  durationMin: 10,
  selectedLayer: 'standard',
  instructorNote: '검토 전 단계 메모는 표시하지 않아야 합니다.',
};
let frames: Map<number, FrameRequestCallback>;
let reduced: boolean;
let preferenceListeners: Set<(event: MediaQueryListEvent) => void>;
let unsubscribeStore: () => void;
let storeChange: ReturnType<typeof vi.fn>;
let storageWrite: MockInstance<typeof Storage.prototype.setItem>;

function frame(time: number) {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((callback) => callback(time)));
}

function setReducedMotion(matches: boolean) {
  act(() => {
    reduced = matches;
    preferenceListeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
  });
}

function renderPreview() {
  const onStart = vi.fn();
  render(
    <SequencePlanPreview
      onClose={vi.fn()}
      onStart={onStart}
      canStartClass={false}
      startReadiness="동작 검토가 필요합니다."
    />,
  );
  const related = screen.getByRole('region', { name: '관련 패턴 모션 초안' });
  return { related, player: within(related), onStart };
}

function expectUnchanged(before: ReturnType<typeof usePilatesStore.getState>) {
  expect(usePilatesStore.getState()).toBe(before);
  expect(storeChange).not.toHaveBeenCalled();
  expect(storageWrite).not.toHaveBeenCalled();
  expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
  expect(JSON.stringify(INITIAL_EXERCISES)).toBe(catalogSnapshot);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  expect(getExerciseMotionReference(canonical.id)).toMatchObject({
    asset: null,
    prototypeId: null,
    expertApproved: false,
  });
}

beforeEach(() => {
  frames = new Map();
  reduced = false;
  preferenceListeners = new Set();
  let nextFrame = 0;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => {
      preferenceListeners.add(listener);
    },
    removeEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => {
      preferenceListeners.delete(listener);
    },
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      activeTitle: '검토 전 원본 브릿지 계획',
      activeTargetMinutes: 10,
      activeSteps: [step],
      exercises: INITIAL_EXERCISES,
      historyLogs: [],
      savedSequences: [],
      generationError: null,
      persistenceError: null,
      saveFeedback: null,
    },
    true,
  );
  storeChange = vi.fn();
  unsubscribeStore = usePilatesStore.subscribe(storeChange);
  storageWrite = vi.spyOn(Storage.prototype, 'setItem');
});

afterEach(() => {
  cleanup();
  unsubscribeStore();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('actual related-pattern playback within a pending plan preview', () => {
  it('plays one explicitly related authored cycle while teaching and timeline playback remain gated', () => {
    expect(canonical).toBeDefined();
    expect(isExerciseAutoEligible(canonical)).toBe(false);
    expect(
      getMotionPatternReferences(canonical.id).map((reference) => reference.variantId),
    ).toContain('articulated-pelvic-curl');
    const before = usePilatesStore.getState();
    const { related, player, onStart } = renderPreview();

    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeDisabled();
    expect(screen.queryByText(canonical.cues[0])).not.toBeInTheDocument();
    expect(screen.queryByText(step.instructorNote!)).not.toBeInTheDocument();
    expect(
      screen.getByText('도식은 시간표와 별도로 재생하며 실제 수행 시간·횟수를 뜻하지 않습니다.'),
    ).toBeVisible();
    expect(related).toHaveAttribute('data-exact-motion-status', 'not_authored');
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('0');
    const initialGeometry = related.querySelector('svg')!.innerHTML;
    expect(frames.size).toBe(0);

    fireEvent.click(player.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(4000);
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('500');
    expect(related.querySelector('svg')!.innerHTML).not.toBe(initialGeometry);
    frame(8000);
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('1000');
    expect(player.getByRole('status')).toHaveTextContent('한 주기 끝 · 일시정지');
    expect(frames.size).toBe(0);
    frame(16000);
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('1000');
    expect(onStart).not.toHaveBeenCalled();
    expectUnchanged(before);
  });

  it('pauses the actual related player during segment rehearsal and returns without auto-resuming', () => {
    const before = usePilatesStore.getState();
    const { player } = renderPreview();
    fireEvent.click(player.getByRole('button', { name: '한 주기 재생' }));
    frame(0);
    frame(2000);
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('250');
    expect(frames.size).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: '선택한 항목 반복 연습' }));
    const segment = screen.getByRole('region', { name: '선택 구간 반복 연습' });
    expect(within(segment).getByRole('button', { name: '구간 반복 연습 시작' })).toBeEnabled();
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('250');
    expect(frames.size).toBe(0);

    fireEvent.click(within(segment).getByRole('button', { name: '전체 시간표로 돌아가기' }));
    expect(screen.queryByRole('region', { name: '선택 구간 반복 연습' })).not.toBeInTheDocument();
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(player.getByRole('status')).toHaveTextContent('일시정지 · 자동 재생 없음');
    frame(4000);
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('250');
    expect(frames.size).toBe(0);
    expectUnchanged(before);
  });

  it('keeps reduced-motion and static phases usable without enabling autoplay or changing the plan', () => {
    reduced = true;
    const before = usePilatesStore.getState();
    const { player } = renderPreview();
    const still = player.getByRole('checkbox', { name: '정지 화면만 보기' });
    expect(still).toBeChecked();
    expect(still).toBeDisabled();
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    const turn = getMotionPatternReferences(canonical.id)[0].definition.phases.find(
      (phase) => phase.id === 'turn',
    )!;
    fireEvent.click(
      player.getByRole('button', { name: 'labelKo' in turn ? turn.labelKo : turn.label }),
    );
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue(
      String(Math.round(turn.sample * 1000)),
    );
    expect(frames.size).toBe(0);

    setReducedMotion(false);
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(frames.size).toBe(0);
    fireEvent.click(player.getByRole('button', { name: '한 주기 재생' }));
    expect(frames.size).toBe(1);
    fireEvent.click(player.getByRole('checkbox', { name: '정지 화면만 보기' }));
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    expect(frames.size).toBe(0);
    fireEvent.change(player.getByRole('slider', { name: '도해 위치' }), {
      target: { value: '777' },
    });
    expect(player.getByRole('slider', { name: '도해 위치' })).toHaveValue('777');
    fireEvent.click(player.getByRole('checkbox', { name: '정지 화면만 보기' }));
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(frames.size).toBe(0);
    fireEvent.click(player.getByRole('button', { name: '한 주기 재생' }));
    setReducedMotion(true);
    expect(player.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    expect(frames.size).toBe(0);
    expectUnchanged(before);
  });
});
