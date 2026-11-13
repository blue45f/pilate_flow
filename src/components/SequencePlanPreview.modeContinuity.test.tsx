import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { MOTION_PATTERN_REFERENCES } from '../data/motionPatternReferences';
import { getExerciseMotionReference } from '../data/motionReferences';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import { SequencePlanPreview } from './SequencePlanPreview';

// Use the actual preview, connected figure, independent player, model and rehearsal clocks.
const original = usePilatesStore.getState();
const catalogSnapshot = structuredClone(INITIAL_EXERCISES);
const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-clam')!;
const steps: SequenceStep[] = [
  {
    stepId: 'mode-continuity-before',
    order: 1,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'warmup',
    durationMin: 20 / 60,
    selectedLayer: 'standard',
  },
  {
    stepId: 'mode-continuity-linked',
    order: 2,
    exerciseId: exercise.id,
    blockCategory: exercise.blockCategory,
    durationMin: 61 / 60,
    explanationSec: 10,
    transitionSec: 10,
    sideMode: 'left-then-right',
    selectedLayer: 'standard',
    motionStudy: createSequenceMotionStudyBinding(
      exercise.id,
      'existing-proposal',
      'side-lying-clam',
    ),
  },
  {
    stepId: 'mode-continuity-after',
    order: 3,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'cooldown',
    durationMin: 39 / 60,
    selectedLayer: 'standard',
  },
];
const model = buildSequenceSimulation(steps, INITIAL_EXERCISES, 2);
const rightPhase = model.segments.find(
  (segment) => segment.stepIndex === 1 && segment.kind === 'movement' && segment.sideIndex === 1,
)!;
const localCursor = rightPhase.durationSec + 3.5;
let nowMs: number;
let before: ReturnType<typeof usePilatesStore.getState>;
let storeChange: ReturnType<typeof vi.fn>;
let storageWrite: MockInstance<typeof Storage.prototype.setItem>;
let unsubscribe: () => void;

function advance(milliseconds: number) {
  nowMs += milliseconds;
  act(() => vi.advanceTimersByTime(milliseconds));
}

function openConfiguredLoop(mode: 'connected' | 'timeline') {
  render(<SequencePlanPreview onClose={vi.fn()} />);
  if (mode === 'timeline') fireEvent.click(screen.getByRole('button', { name: '시간표 보기' }));
  fireEvent.click(screen.getByRole('button', { name: '다음 항목' }));
  const parentRange = screen.getByRole('slider', { name: '수업 시간표 위치' });
  expect(parentRange).toHaveValue(String(model.steps[1].startSec));
  expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '선택한 항목 반복 연습' }));
  const loop = screen.getByRole('region', { name: '선택 구간 반복 연습' });
  const controls = within(loop);
  fireEvent.change(controls.getByRole('combobox', { name: '반복 연습 구간' }), {
    target: { value: rightPhase.id },
  });
  fireEvent.change(controls.getByRole('combobox', { name: '구간 연습 반복 횟수' }), {
    target: { value: '2' },
  });
  fireEvent.change(controls.getByRole('combobox', { name: '구간 연습 시간표 속도' }), {
    target: { value: '0.5' },
  });
  fireEvent.change(controls.getByRole('slider', { name: '구간 반복 연습 위치' }), {
    target: { value: String(localCursor) },
  });
  return { loop, parentRange };
}

function expectConfiguredLoop(loop: HTMLElement) {
  expect(loop).toBeInTheDocument();
  expect(screen.getByRole('region', { name: '선택 구간 반복 연습' })).toBe(loop);
  const controls = within(loop);
  expect(controls.getByRole('combobox', { name: '반복 연습 구간' })).toHaveValue(rightPhase.id);
  expect(controls.getByRole('combobox', { name: '구간 연습 반복 횟수' })).toHaveValue('2');
  expect(controls.getByRole('combobox', { name: '구간 연습 시간표 속도' })).toHaveValue('0.5');
  expect(controls.getByRole('slider', { name: '구간 반복 연습 위치' })).toHaveValue(
    String(localCursor),
  );
  expect(controls.getByRole('status')).toHaveTextContent('반복 2 / 2 · 일시정지 · 수행 · 오른쪽');
  expect(controls.getByRole('button', { name: '구간 반복 연습 시작' })).toBeEnabled();
}

beforeEach(() => {
  // Fake only interval delivery and monotonic time; keep the production clock and model.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  nowMs = 10_000;
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  usePilatesStore.setState({
    ...original,
    activeTitle: '합성 QA · 표시 방식 선택 중 보존할 미검토 계획',
    activeSteps: structuredClone(steps),
    activeTargetMinutes: 2,
    exercises: INITIAL_EXERCISES,
    undoStack: [],
    savedSequences: [],
    historyLogs: [],
    generationError: null,
    saveFeedback: null,
    persistenceError: null,
  });
  before = usePilatesStore.getState();
  storeChange = vi.fn();
  unsubscribe = usePilatesStore.subscribe(storeChange);
  storageWrite = vi.spyOn(Storage.prototype, 'setItem');
});

afterEach(() => {
  cleanup();
  try {
    expect(usePilatesStore.getState()).toBe(before);
    expect(storeChange).not.toHaveBeenCalled();
    expect(storageWrite).not.toHaveBeenCalled();
    expect(INITIAL_EXERCISES).toEqual(catalogSnapshot);
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(getExerciseMotionReference(exercise.id)).toMatchObject({
      asset: null,
      expertApproved: false,
    });
    expect(MOTION_PATTERN_REFERENCES.every((item) => item.professionalReviewCount === 0)).toBe(
      true,
    );
  } finally {
    unsubscribe();
    usePilatesStore.setState(original, true);
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

describe('selected preview mode preserves manual loop context', () => {
  it('keeps the pending right-side loop, repeat, speed and projection when connected mode is selected again', () => {
    const { loop, parentRange } = openConfiguredLoop('connected');
    expectConfiguredLoop(loop);
    const study = within(loop).getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
    expect(study).toHaveAttribute('data-study-side', 'right');
    expect(study.querySelector('figure')).toHaveAttribute('data-study-anatomical-side', 'right');
    expect(study).toHaveTextContent('전문가 미검토 · 0명');
    const progress = study.getAttribute('data-study-progress');
    const mode = screen.getByRole('button', { name: '동작 흐름 보기' });
    expect(mode).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mode);
    expectConfiguredLoop(loop);
    expect(within(loop).getByRole('region', { name: '수업 시간에 연결한 동작 흐름' })).toBe(study);
    expect(study).toHaveAttribute('data-study-side', 'right');
    expect(study).toHaveAttribute('data-study-progress', progress);
    advance(5_000);
    expectConfiguredLoop(loop);
    expect(parentRange).toHaveValue(String(model.steps[1].startSec));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the same timeline loop and its independent reference inactive when timeline mode is selected again', () => {
    const { loop, parentRange } = openConfiguredLoop('timeline');
    expectConfiguredLoop(loop);
    const independent = screen.getByRole('region', { name: '관련 패턴 모션 초안' });
    expect(within(independent).getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    const mode = screen.getByRole('button', { name: '시간표 보기' });
    expect(mode).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mode);
    expectConfiguredLoop(loop);
    expect(within(independent).getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    advance(5_000);
    expectConfiguredLoop(loop);
    expect(parentRange).toHaveValue(String(model.steps[1].startSec));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('still exits the local loop and retains the paused parent cursor for a genuine mode change', () => {
    openConfiguredLoop('connected');
    fireEvent.click(screen.getByRole('button', { name: '시간표 보기' }));
    expect(screen.queryByRole('region', { name: '선택 구간 반복 연습' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시간표 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const parentRange = screen.getByRole('slider', { name: '수업 시간표 위치' });
    expect(parentRange).toHaveValue(String(model.steps[1].startSec));
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(screen.getByLabelText('시간표 경과와 전체 시간')).toHaveTextContent('일시정지');
    advance(5_000);
    expect(parentRange).toHaveValue(String(model.steps[1].startSec));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('still exits the loop and seeks the next real item paused when Next item is chosen', () => {
    openConfiguredLoop('connected');
    fireEvent.click(screen.getByRole('button', { name: '다음 항목' }));
    expect(screen.queryByRole('region', { name: '선택 구간 반복 연습' })).not.toBeInTheDocument();
    const parentRange = screen.getByRole('slider', { name: '수업 시간표 위치' });
    expect(parentRange).toHaveValue(String(model.steps[2].startSec));
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(screen.getByLabelText('시간표 경과와 전체 시간')).toHaveTextContent('일시정지');
    expect(screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' })).toHaveAttribute(
      'data-study-kind',
      'rest',
    );
    advance(5_000);
    expect(parentRange).toHaveValue(String(model.steps[2].startSec));
    expect(vi.getTimerCount()).toBe(0);
  });
});
