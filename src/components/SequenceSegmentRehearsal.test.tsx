import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import { SequencePlanPreview } from './SequencePlanPreview';
import { SequenceSegmentRehearsal } from './SequenceSegmentRehearsal';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: ({ exerciseId, active }: { exerciseId: string; active: boolean }) => (
    <div data-testid="segment-motion" data-exercise-id={exerciseId} data-active={String(active)} />
  ),
}));

const original = usePilatesStore.getState();
const first = syntheticPlanningExercise('mat', 'lower-body');
const second = syntheticPlanningExercise('chair', 'cooldown');
const steps: SequenceStep[] = [
  {
    stepId: 'segment-first',
    order: 1,
    exerciseId: first.id,
    blockCategory: 'lower-body',
    durationMin: 61 / 60,
    explanationSec: 10,
    transitionSec: 10,
    sideMode: 'right-then-left',
    selectedLayer: 'standard',
    repetitions: 999,
    sets: 100,
  },
  {
    stepId: 'segment-second',
    order: 2,
    exerciseId: second.id,
    blockCategory: 'cooldown',
    durationMin: 59 / 60,
    selectedLayer: 'standard',
  },
];
let nowMs: number;
let hidden: boolean;
let reduced: boolean;
let preferenceListeners: Set<() => void>;

function advance(milliseconds: number, timerMs = 250) {
  nowMs += milliseconds;
  act(() => vi.advanceTimersByTime(timerMs));
}

function player() {
  return within(screen.getByRole('region', { name: '선택 구간 반복 연습' }));
}

function openSegment() {
  fireEvent.click(screen.getByRole('button', { name: '선택한 항목 반복 연습' }));
  return player();
}

function seek(time: number) {
  fireEvent.change(player().getByRole('slider', { name: '구간 반복 연습 위치' }), {
    target: { value: String(time) },
  });
}

beforeEach(() => {
  // Count only rehearsal intervals; jsdom/React and persistence also schedule unrelated work.
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
    activeTitle: '합성 구간 연습 계획',
    activeSteps: steps,
    activeTargetMinutes: 2,
    exercises: [first, second],
  });
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('bounded selected planning timeline', () => {
  it('starts paused with all real phases and conserves class time, counts, exact motion identity and store state', () => {
    const before = usePilatesStore.getState();
    const storeChange = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(storeChange);
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const segment = openSegment();
    expect(segment.getByRole('combobox', { name: '반복 연습 구간' })).toHaveValue('whole');
    expect(
      segment
        .getAllByRole('option')
        .slice(0, 5)
        .map((option) => option.textContent),
    ).toEqual([
      '항목 전체 · 01:01',
      '설명 · 세팅 · 00:10',
      '수행 · 오른쪽 · 00:20.5',
      '수행 · 왼쪽 · 00:20.5',
      '다음 동작 전환 · 00:10',
    ]);
    expect(segment.getByLabelText('구간 연습 경과와 전체 예산')).toHaveTextContent('00:00/ 01:01');
    expect(segment.getByRole('status')).toHaveTextContent('반복 1 / 1 · 일시정지 · 설명 · 세팅');
    expect(vi.getTimerCount()).toBe(0);
    advance(500_000);
    expect(segment.getByRole('slider')).toHaveValue('0');
    fireEvent.change(segment.getByRole('combobox', { name: '구간 연습 반복 횟수' }), {
      target: { value: '3' },
    });
    expect(segment.getByRole('slider')).toHaveAttribute('max', '183');
    seek(183);
    fireEvent.click(segment.getByRole('button', { name: '구간 연습 처음으로' }));
    expect(screen.getByTestId('segment-motion')).toHaveAttribute('data-active', 'false');
    fireEvent.click(segment.getByRole('button', { name: '전체 시간표로 돌아가기' }));
    expect(screen.getByLabelText('미리보기 시간 구성')).toHaveTextContent('전체02:00');
    expect(screen.getByTestId('segment-motion')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('segment-motion')).toHaveAttribute('data-exercise-id', first.id);
    expect(usePilatesStore.getState()).toBe(before);
    expect(storeChange).not.toHaveBeenCalled();
    expect(storageWrite).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('uses half-open real phase and repeat boundaries and no current phase at the finite end', () => {
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const segment = openSegment();
    fireEvent.change(segment.getByRole('combobox', { name: '구간 연습 반복 횟수' }), {
      target: { value: '3' },
    });
    for (const [time, cycle, phase] of [
      [0, 1, '설명 · 세팅'],
      [9.5, 1, '설명 · 세팅'],
      [10, 1, '수행 · 오른쪽'],
      [30, 1, '수행 · 오른쪽'],
      [30.5, 1, '수행 · 왼쪽'],
      [50.5, 1, '수행 · 왼쪽'],
      [51, 1, '다음 동작 전환'],
      [60.5, 1, '다음 동작 전환'],
      [61, 2, '설명 · 세팅'],
      [91.5, 2, '수행 · 왼쪽'],
      [122, 3, '설명 · 세팅'],
      [182.5, 3, '다음 동작 전환'],
    ] as const) {
      seek(time);
      expect(segment.getByRole('status')).toHaveTextContent(
        `반복 ${cycle} / 3 · 일시정지 · ${phase}`,
      );
    }
    seek(30.5);
    expect(segment.getByLabelText('현재 연습 구간 예산')).toHaveTextContent(
      '현재 구간 예산 00:20.5 · 남은 구간 00:20.5',
    );
    seek(183);
    expect(segment.getByRole('status')).toHaveTextContent(
      '반복 3 / 3 · 반복 연습 끝 · 현재 구간 없음',
    );
    expect(segment.getByLabelText('현재 연습 구간 예산')).toHaveTextContent('남은 구간 00:00');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('repeats an explicitly selected half-second phase and stops without an extra cycle after a delayed tick', () => {
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const segment = openSegment();
    const model = buildSequenceSimulation(steps, [first, second], 2);
    fireEvent.change(segment.getByRole('combobox', { name: '반복 연습 구간' }), {
      target: { value: model.segments[2].id },
    });
    fireEvent.change(segment.getByRole('combobox', { name: '구간 연습 반복 횟수' }), {
      target: { value: '2' },
    });
    expect(segment.getByRole('slider')).toHaveAttribute('max', '41');
    expect(segment.getByRole('status')).toHaveTextContent('수행 · 왼쪽');
    seek(20.5);
    expect(segment.getByRole('status')).toHaveTextContent('반복 2 / 2 · 일시정지 · 수행 · 왼쪽');
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    advance(90_000);
    expect(segment.getByRole('slider')).toHaveValue('41');
    expect(segment.getByRole('status')).toHaveTextContent('반복 2 / 2 · 반복 연습 끝');
    expect(vi.getTimerCount()).toBe(0);
    advance(90_000);
    expect(segment.getByRole('slider')).toHaveValue('41');
  });

  it('resets on phase/repeat changes and pauses at the actual cursor on seek/speed changes', () => {
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const segment = openSegment();
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    advance(1_000);
    fireEvent.change(segment.getByRole('combobox', { name: '구간 연습 시간표 속도' }), {
      target: { value: '0.5' },
    });
    expect(segment.getByRole('slider')).toHaveValue('1');
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    advance(1_000);
    expect(segment.getByRole('slider')).toHaveValue('1.5');
    seek(20.5);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    fireEvent.change(segment.getByRole('combobox', { name: '구간 연습 반복 횟수' }), {
      target: { value: '2' },
    });
    expect(segment.getByRole('slider')).toHaveValue('0');
    expect(vi.getTimerCount()).toBe(0);
    seek(30);
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    fireEvent.change(segment.getByRole('combobox', { name: '반복 연습 구간' }), {
      target: { value: '0:3:transition' },
    });
    expect(segment.getByRole('slider')).toHaveValue('0');
    expect(segment.getByRole('slider')).toHaveAttribute('max', '20');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('allows only one clock and keeps the whole clock paused when exiting or selecting another step', () => {
    render(<SequencePlanPreview onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 시작' }));
    advance(1_000);
    expect(vi.getTimerCount()).toBe(1);
    const segment = openSegment();
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.queryByRole('button', { name: '시간표 리허설 시작' })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: '수업 시간표 위치' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '시간표 리허설 속도' })).not.toBeInTheDocument();
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    expect(vi.getTimerCount()).toBe(1);
    advance(1_000);
    expect(screen.getByLabelText('시간표 경과와 전체 시간')).toHaveTextContent('00:01');
    fireEvent.click(segment.getByRole('button', { name: '전체 시간표로 돌아가기' }));
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole('button', { name: '선택한 항목 반복 연습' })).toHaveFocus();
    advance(5_000);
    expect(screen.getByLabelText('시간표 경과와 전체 시간')).toHaveTextContent('00:01');
    const again = openSegment();
    expect(again.getByRole('slider')).toHaveValue('0');
    fireEvent.click(again.getByRole('button', { name: '구간 반복 연습 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 항목' }));
    expect(screen.queryByRole('region', { name: '선택 구간 반복 연습' })).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(screen.getByTestId('segment-motion')).toHaveAttribute('data-exercise-id', second.id);
  });

  it.each(['pending', 'stale', 'duplicate', 'wrong-time', 'missing'] as const)(
    'blocks automatic segment rehearsal for a %s full plan even when the selected item is approved',
    (state) => {
      let exercises: PilatesExercise[] = [first, second];
      let plan = steps;
      if (state === 'pending') exercises = [first, { ...second, review: undefined }];
      if (state === 'stale') exercises = [first, { ...second, cues: [...second.cues, 'changed'] }];
      if (state === 'duplicate') plan = [steps[0], { ...steps[1], exerciseId: first.id }];
      if (state === 'missing') exercises = [first];
      usePilatesStore.setState({
        activeSteps: plan,
        exercises,
        activeTargetMinutes: state === 'wrong-time' ? 3 : 2,
      });
      render(<SequencePlanPreview onClose={vi.fn()} />);
      const segment = openSegment();
      expect(segment.getByRole('button', { name: '구간 반복 연습 시작' })).toBeDisabled();
      fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
      expect(vi.getTimerCount()).toBe(0);
      seek(30.5);
      expect(segment.getByRole('status')).toHaveTextContent('수행 · 왼쪽');
      expect(screen.getByTestId('segment-motion')).toHaveAttribute('data-active', 'false');
    },
  );

  it.each(['plan', 'target', 'review', 'material', 'duplicate-record'] as const)(
    'pauses on a live %s change and retains only the frozen original for manual reading',
    (change) => {
      render(<SequencePlanPreview onClose={vi.fn()} />);
      const segment = openSegment();
      fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
      advance(1_000);
      act(() => {
        if (change === 'plan')
          usePilatesStore.setState({ activeSteps: [{ ...steps[0], durationMin: 2 }, steps[1]] });
        if (change === 'target') usePilatesStore.setState({ activeTargetMinutes: 3 });
        if (change === 'review')
          usePilatesStore.setState({ exercises: [first, { ...second, review: undefined }] });
        if (change === 'material')
          usePilatesStore.setState({ exercises: [first, { ...second, cues: ['Changed source'] }] });
        if (change === 'duplicate-record')
          usePilatesStore.setState({ exercises: [first, second, { ...first }] });
      });
      expect(vi.getTimerCount()).toBe(0);
      expect(segment.getByRole('button', { name: '구간 반복 연습 시작' })).toBeDisabled();
      expect(segment.getByRole('slider')).toHaveAttribute('max', '61');
      seek(30.5);
      expect(segment.getByRole('status')).toHaveTextContent('수행 · 왼쪽');
      expect(screen.getByText(/원본 계획 또는 검토 정보가 바뀌었습니다/)).toBeInTheDocument();
    },
  );

  it('preserves a selected rest budget without introducing exercise phases or motion', () => {
    usePilatesStore.setState({
      activeSteps: [steps[0], { ...steps[1], kind: 'rest', exerciseId: '' }],
    });
    render(<SequencePlanPreview onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '다음 항목' }));
    const segment = openSegment();
    expect(segment.getByRole('combobox', { name: '반복 연습 구간' })).toHaveTextContent(
      '항목 전체 · 00:59휴식 · 00:59',
    );
    expect(segment.getByRole('status')).toHaveTextContent('반복 1 / 1 · 일시정지 · 휴식');
    expect(segment.getByRole('slider')).toHaveAttribute('max', '59');
    expect(screen.queryByTestId('segment-motion')).not.toBeInTheDocument();
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    advance(59_000);
    expect(segment.getByRole('slider')).toHaveValue('59');
    expect(segment.getByRole('status')).toHaveTextContent('반복 연습 끝 · 현재 구간 없음');
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['visibility', 'pagehide', 'reduced-motion'] as const)(
    'cancels the segment clock for %s and never resumes on return',
    (guard) => {
      render(<SequencePlanPreview onClose={vi.fn()} />);
      const segment = openSegment();
      fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
      advance(1_000);
      act(() => {
        if (guard === 'visibility') {
          hidden = true;
          document.dispatchEvent(new Event('visibilitychange'));
        } else if (guard === 'pagehide') window.dispatchEvent(new Event('pagehide'));
        else {
          reduced = true;
          preferenceListeners.forEach((listener) => listener());
        }
      });
      expect(vi.getTimerCount()).toBe(0);
      act(() => {
        hidden = false;
        reduced = false;
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('pageshow'));
        preferenceListeners.forEach((listener) => listener());
      });
      advance(5_000);
      expect(segment.getByRole('slider')).toHaveValue('1');
      expect(segment.getByRole('status')).toHaveTextContent('일시정지');
    },
  );

  it.each(['close-button', 'native-close', 'cancel', 'unmount'] as const)(
    'cancels on %s even when onClose does not unmount the parent',
    (method) => {
      const onClose = vi.fn();
      const { unmount } = render(<SequencePlanPreview onClose={onClose} />);
      fireEvent.click(openSegment().getByRole('button', { name: '구간 반복 연습 시작' }));
      expect(vi.getTimerCount()).toBe(1);
      const dialog = screen.getByRole('dialog') as HTMLDialogElement;
      if (method === 'close-button')
        fireEvent.click(screen.getByRole('button', { name: '계획 미리보기 닫기' }));
      if (method === 'native-close') {
        dialog.close();
        fireEvent(dialog, new Event('close'));
      }
      if (method === 'cancel') fireEvent(dialog, new Event('cancel', { cancelable: true }));
      if (method === 'unmount') unmount();
      expect(vi.getTimerCount()).toBe(0);
      expect(preferenceListeners.size).toBe(method === 'unmount' ? 0 : 1);
      if (method !== 'unmount') expect(onClose).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['whole', 'segment'] as const)(
    'freezes the %s clock when its native host closes before close-event delivery',
    (mode) => {
      const onClose = vi.fn();
      const before = usePilatesStore.getState();
      const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
      const fetch = vi.spyOn(globalThis, 'fetch');
      render(<SequencePlanPreview onClose={onClose} />);
      const controls = mode === 'segment' ? openSegment() : screen;
      const playName = mode === 'segment' ? '구간 반복 연습 시작' : '시간표 리허설 시작';
      const sliderName = mode === 'segment' ? '구간 반복 연습 위치' : '수업 시간표 위치';
      fireEvent.click(controls.getByRole('button', { name: playName }));
      const slider = controls.getByRole('slider', { name: sliderName });
      advance(1_000);
      expect(slider).toHaveValue('1');
      const dialog = screen.getByRole('dialog') as HTMLDialogElement;
      // The existing jsdom close polyfill removes open without dispatching close.
      // Withhold that event intentionally: this is a resilience test, not an
      // observation that any real browser omitted a native close event.
      act(() => dialog.close());
      expect(dialog.open).toBe(false);
      expect(onClose).not.toHaveBeenCalled();
      advance(5_000);
      expect(slider).toHaveValue('1');
      expect(vi.getTimerCount()).toBe(0);
      act(() => dialog.showModal());
      advance(5_000);
      expect(slider).toHaveValue('1');
      expect(vi.getTimerCount()).toBe(0);
      fireEvent.click(controls.getByRole('button', { name: playName }));
      advance(250);
      expect(slider).toHaveValue('1.25');
      expect(vi.getTimerCount()).toBe(1);
      // A stale close event for a now-open dialog must not dismiss this run.
      fireEvent(dialog, new Event('close'));
      expect(onClose).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(1);
      act(() => dialog.close());
      fireEvent(dialog, new Event('close'));
      expect(vi.getTimerCount()).toBe(0);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(usePilatesStore.getState()).toBe(before);
      expect(storageWrite).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('keeps a connected standalone segment usable without a native dialog ancestor', () => {
    const model = buildSequenceSimulation(steps, [first, second], 2);
    const { unmount } = render(
      <SequenceSegmentRehearsal
        step={model.steps[0]}
        segments={model.segments}
        fullPlanCanRehearse={model.gate.canRehearse}
        sourceUnchanged
        onExit={vi.fn()}
      />,
    );
    const segment = player();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(segment.getByRole('button', { name: '구간 반복 연습 시작' }));
    advance(750);
    expect(segment.getByRole('slider')).toHaveValue('0.75');
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts manual under reduced motion and cleans one segment subscription under StrictMode', () => {
    reduced = true;
    const model = buildSequenceSimulation(steps, [first, second], 2);
    const { unmount } = render(
      <StrictMode>
        <SequenceSegmentRehearsal
          step={model.steps[0]}
          segments={model.segments}
          fullPlanCanRehearse={model.gate.canRehearse}
          sourceUnchanged
          onExit={vi.fn()}
        />
      </StrictMode>,
    );
    const segment = player();
    expect(segment.getAllByRole('option')).toHaveLength(12);
    expect(segment.getByRole('button', { name: '구간 반복 연습 시작' })).toBeDisabled();
    expect(preferenceListeners.size).toBe(1);
    seek(30.5);
    expect(segment.getByRole('status')).toHaveTextContent('수행 · 왼쪽');
    unmount();
    expect(preferenceListeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
