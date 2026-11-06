import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import { SequencePlanPreview } from './SequencePlanPreview';
import { SequenceSegmentRehearsal } from './SequenceSegmentRehearsal';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: ({ active }: { active: boolean }) => (
    <div data-testid="independent-reference" data-active={String(active)} />
  ),
}));

const original = usePilatesStore.getState();
const exercise = {
  ...syntheticPlanningExercise('mat', 'lower-body', 'alpha', false),
  id: 'original-mat-clam',
};
const steps: SequenceStep[] = [
  {
    stepId: 'segment-study-rest-before',
    order: 1,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'warmup',
    durationMin: 20 / 60,
    selectedLayer: 'standard',
  },
  {
    stepId: 'segment-study-linked',
    order: 2,
    exerciseId: exercise.id,
    blockCategory: 'lower-body',
    durationMin: 61 / 60,
    explanationSec: 10,
    transitionSec: 10,
    sideMode: 'left-then-right',
    selectedLayer: 'standard',
    repetitions: 999,
    sets: 100,
    motionStudy: createSequenceMotionStudyBinding(
      exercise.id,
      'existing-proposal',
      'side-lying-clam',
    ),
  },
  {
    stepId: 'segment-study-rest-after',
    order: 3,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'cooldown',
    durationMin: 39 / 60,
    selectedLayer: 'standard',
  },
];
const model = buildSequenceSimulation(steps, [exercise], 2);
const phases = model.segments.filter((segment) => segment.stepIndex === 1);
let nowMs: number;
let hidden: boolean;
let reduced: boolean;
let preferenceListeners: Set<() => void>;

const segment = () => within(screen.getByRole('region', { name: '선택 구간 반복 연습' }));
const view = () => segment().getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
const progress = () => Number(view().getAttribute('data-study-progress'));
const seek = (seconds: number) =>
  fireEvent.change(segment().getByRole('slider'), { target: { value: String(seconds) } });
const repeatTwice = () =>
  fireEvent.change(segment().getByRole('combobox', { name: '구간 연습 반복 횟수' }), {
    target: { value: '2' },
  });

function openLinkedSegment() {
  render(<SequencePlanPreview onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '다음 항목' }));
  fireEvent.click(screen.getByRole('button', { name: '선택한 항목 반복 연습' }));
}

function useSyntheticReviewedFixture() {
  // Planning-metadata eligibility is confined to this synthetic fixture; no asset is reviewed.
  usePilatesStore.setState({
    exercises: [
      {
        ...exercise,
        review: {
          status: 'approved',
          scope: 'planning-metadata',
          credentialVerified: false,
          reviewerAlias: 'Synthetic QA reviewer · test only',
          reviewedAt: '2026-11-05T12:00:00Z',
          revision: exerciseRevision(exercise),
        },
      },
    ],
  });
}

function advance(milliseconds: number) {
  nowMs += milliseconds;
  act(() => vi.advanceTimersByTime(250));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  nowMs = 10_000;
  hidden = false;
  reduced = false;
  preferenceListeners = new Set();
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    hidden ? 'hidden' : 'visible',
  );
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_event: string, listener: () => void) => preferenceListeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) =>
      preferenceListeners.delete(listener),
  }));
  usePilatesStore.setState({
    ...original,
    activeTitle: 'Synthetic saved-reference segment QA',
    activeSteps: steps,
    activeTargetMinutes: 2,
    exercises: [exercise],
  });
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('saved reference projected from the selected segment clock', () => {
  it('manually projects a pending item at its absolute class offset through both sides and whole-item repeats without writes', () => {
    const before = usePilatesStore.getState();
    const storeChange = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(storeChange);
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    openLinkedSegment();
    expect(segment().getByRole('button', { name: '구간 반복 연습 시작' })).toBeEnabled();
    expect(segment().getByText(/저장한 관련 도해를 이 연습 시간에 연결/)).toBeInTheDocument();
    expect(segment().queryByText(/모션 자동 재생 없음/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('independent-reference')).not.toBeInTheDocument();
    expect(view()).toHaveAttribute('data-binding-status', 'matched');
    repeatTwice();
    for (const [time, kind, stage, side] of [
      [0, 'study', 'setup', 'left'],
      [9.5, 'study', 'setup', 'left'],
      [10, 'study', 'main', 'left'],
      [30, 'study', 'main', 'left'],
      [30.5, 'study', 'main', 'right'],
      [50.5, 'study', 'main', 'right'],
      [51, 'transition', undefined, undefined],
      [61, 'study', 'setup', 'left'],
      [71, 'study', 'main', 'left'],
      [91.5, 'study', 'main', 'right'],
    ] as const) {
      seek(time);
      expect(view()).toHaveAttribute('data-study-kind', kind);
      if (stage) expect(view()).toHaveAttribute('data-motion-stage', stage);
      if (side) expect(view()).toHaveAttribute('data-study-side', side);
    }
    seek(122);
    expect(segment().getByLabelText('선택 구간 연결 도해 상태')).toHaveTextContent(
      '선택 구간 연습 끝',
    );
    expect(
      segment().queryByRole('region', { name: '수업 시간에 연결한 동작 흐름' }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('시간표 경과와 전체 시간')).toHaveTextContent('00:20');
    expect(vi.getTimerCount()).toBe(0);
    expect(usePilatesStore.getState()).toBe(before);
    expect(storeChange).not.toHaveBeenCalled();
    expect(storageWrite).not.toHaveBeenCalled();
    unsubscribe();
  });

  it.each([
    [0, 'study', 'setup', undefined],
    [1, 'study', 'main', 'left'],
    [2, 'study', 'main', 'right'],
    [3, 'transition', undefined, undefined],
  ] as const)(
    'repeats phase %s and ends locally without entering the following phase or item',
    (index, kind, stage, side) => {
      openLinkedSegment();
      const phase = phases[index];
      fireEvent.change(segment().getByRole('combobox', { name: '반복 연습 구간' }), {
        target: { value: phase.id },
      });
      repeatTwice();
      expect(view()).toHaveAttribute('data-study-kind', kind);
      if (stage) expect(view()).toHaveAttribute('data-motion-stage', stage);
      if (side) expect(view()).toHaveAttribute('data-study-side', side);
      const initialProgress = progress();
      seek(phase.durationSec - 0.5);
      expect(view()).toHaveAttribute('data-study-kind', kind);
      if (side) expect(view()).toHaveAttribute('data-study-side', side);
      seek(phase.durationSec);
      expect(progress()).toBe(initialProgress);
      expect(segment().getByRole('status')).toHaveTextContent('반복 2 / 2');
      seek(phase.durationSec * 2);
      expect(segment().getByLabelText('선택 구간 연결 도해 상태')).toHaveTextContent(
        '선택 구간 연습 끝',
      );
      expect(
        segment().queryByRole('region', { name: '수업 시간에 연결한 동작 흐름' }),
      ).not.toBeInTheDocument();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('keeps a repeated rest neutral and stops before the next saved exercise', () => {
    render(<SequencePlanPreview onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '선택한 항목 반복 연습' }));
    repeatTwice();
    for (const time of [0, 19.5, 20, 39.5]) {
      seek(time);
      expect(view()).toHaveAttribute('data-study-kind', 'rest');
      expect(view().querySelector('svg[aria-label]')).toBeNull();
    }
    seek(40);
    expect(segment().getByLabelText('선택 구간 연결 도해 상태')).toHaveTextContent(
      '선택 구간 연습 끝',
    );
    expect(
      segment().queryByRole('region', { name: '수업 시간에 연결한 동작 흐름' }),
    ).not.toBeInTheDocument();
  });

  it('advances the saved reference with one synthetic eligible segment clock, pauses on seek and speed change, and exits with the class clock paused', () => {
    useSyntheticReviewedFixture();
    const before = usePilatesStore.getState();
    openLinkedSegment();
    fireEvent.click(segment().getByRole('button', { name: '구간 반복 연습 시작' }));
    expect(vi.getTimerCount()).toBe(1);
    advance(12_000);
    expect(view()).toHaveAttribute('data-study-side', 'left');
    expect(progress()).toBeCloseTo(0.31, 8);
    seek(30.5);
    expect(view()).toHaveAttribute('data-study-side', 'right');
    expect(progress()).toBeCloseTo(0.12, 8);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(segment().getByRole('button', { name: '구간 반복 연습 시작' }));
    advance(1_000);
    fireEvent.change(segment().getByRole('combobox', { name: '구간 연습 시간표 속도' }), {
      target: { value: '0.5' },
    });
    expect(segment().getByRole('slider')).toHaveValue('31.5');
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(segment().getByRole('button', { name: '구간 반복 연습 시작' }));
    advance(1_000);
    expect(segment().getByRole('slider')).toHaveValue('32');
    expect(progress()).toBeCloseTo(0.2625, 8);
    advance(90_000);
    expect(segment().getByRole('slider')).toHaveValue('61');
    expect(segment().getByLabelText('선택 구간 연결 도해 상태')).toHaveTextContent(
      '선택 구간 연습 끝',
    );
    expect(
      segment().queryByRole('region', { name: '수업 시간에 연결한 동작 흐름' }),
    ).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(segment().getByRole('button', { name: '전체 시간표로 돌아가기' }));
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole('button', { name: '선택한 항목 반복 연습' })).toHaveFocus();
    advance(30_000);
    expect(screen.getByRole('slider', { name: '수업 시간표 위치' })).toHaveValue('20');
    expect(usePilatesStore.getState()).toBe(before);
  });

  it.each(['visibility', 'pagehide', 'reduced-motion', 'source-change'] as const)(
    'pauses the projected segment for %s and never resumes automatically',
    (guard) => {
      useSyntheticReviewedFixture();
      openLinkedSegment();
      seek(12);
      fireEvent.click(segment().getByRole('button', { name: '구간 반복 연습 시작' }));
      advance(1_000);
      act(() => {
        if (guard === 'visibility') {
          hidden = true;
          document.dispatchEvent(new Event('visibilitychange'));
        } else if (guard === 'pagehide') window.dispatchEvent(new Event('pagehide'));
        else if (guard === 'reduced-motion') {
          reduced = true;
          preferenceListeners.forEach((listener) => listener());
        } else usePilatesStore.setState({ activeTitle: 'Changed outside frozen rehearsal' });
      });
      expect(vi.getTimerCount()).toBe(0);
      if (guard === 'reduced-motion' || guard === 'source-change')
        expect(view()).toHaveAttribute('data-study-static', 'true');
      act(() => {
        hidden = false;
        reduced = false;
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('pageshow'));
        preferenceListeners.forEach((listener) => listener());
      });
      const pausedProgress = progress();
      advance(30_000);
      expect(segment().getByRole('slider')).toHaveValue('13');
      expect(progress()).toBe(pausedProgress);
      expect(segment().getByRole('status')).toHaveTextContent('일시정지');
      expect(screen.getByLabelText('시간표 경과와 전체 시간')).toHaveTextContent('00:20');
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('passes null to a pure projection when its selected span is invalid', () => {
    const renderProjection = vi.fn(() => <p>Invalid projection fallback</p>);
    render(
      <SequenceSegmentRehearsal
        step={model.steps[1]}
        segments={[]}
        fullPlanCanRehearse
        sourceUnchanged
        onExit={vi.fn()}
        renderProjection={renderProjection}
      />,
    );
    expect(renderProjection).toHaveBeenLastCalledWith(null);
    seek(30.5);
    expect(renderProjection).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('Invalid projection fallback')).toBeInTheDocument();
    expect(segment().getByRole('button', { name: '구간 반복 연습 시작' })).toBeDisabled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
