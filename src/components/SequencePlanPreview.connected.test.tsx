import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { exerciseRevision } from '../utils/exerciseReview';
import { SequencePlanPreview } from './SequencePlanPreview';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: ({ active }: { active: boolean }) => (
    <div data-testid="independent-reference" data-active={String(active)} />
  ),
}));

const original = usePilatesStore.getState();
const exercise = {
  ...syntheticPlanningExercise('mat', 'warmup', 'alpha', false),
  id: 'original-mat-clam',
};
const step: SequenceStep = {
  stepId: 'preview-linked-qa',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: 'warmup',
  durationMin: 1,
  selectedLayer: 'standard',
  sideMode: 'left-then-right',
  explanationSec: 8,
  transitionSec: 8,
  motionStudy: createSequenceMotionStudyBinding(
    exercise.id,
    'existing-proposal',
    'side-lying-clam',
  ),
};
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    activeSteps: [step],
    exercises: [exercise],
    activeTargetMinutes: 1,
  }),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('connected study integrated with the class cursor', () => {
  it('lets pending plans inspect saved bindings and scrub while the existing review gate stays closed', () => {
    const before = usePilatesStore.getState();
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    const body = dialog.querySelector('.atelier-modal-body')!;
    const continuation = screen.getByRole('contentinfo', { name: '수업안 확인 후 다음 단계' });
    expect(body).not.toContainElement(continuation);
    expect(body.parentElement).toContainElement(continuation);
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '동작 흐름 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByTestId('independent-reference')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '동작 흐름 보기' }));
    expect(screen.getByRole('button', { name: '동작 흐름 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByTestId('independent-reference')).not.toBeInTheDocument();
    const view = () => screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
    expect(view()).toHaveAttribute('data-binding-status', 'matched');
    expect(view()).toHaveAttribute('data-motion-stage', 'setup');
    fireEvent.change(screen.getByRole('slider', { name: '수업 시간표 위치' }), {
      target: { value: '11' },
    });
    expect(view()).toHaveAttribute('data-motion-stage', 'main');
    expect(view()).toHaveAttribute('data-study-side', 'left');
    fireEvent.change(screen.getByRole('slider', { name: '수업 시간표 위치' }), {
      target: { value: '32' },
    });
    expect(view()).toHaveAttribute('data-study-side', 'right');
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    expect(screen.getByLabelText('수업 역할별 계획 시간')).toHaveTextContent(
      '준비운동01:00본운동00:00마무리00:00',
    );
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('uses the same gated parent clock, pauses on seek/view switch, and freezes a changed snapshot', () => {
    const approved = {
      ...exercise,
      review: {
        status: 'approved' as const,
        reviewerAlias: 'Synthetic QA reviewer',
        reviewedAt: '2026-11-05T12:00:00Z',
        scope: 'planning-metadata' as const,
        credentialVerified: false as const,
        revision: exerciseRevision(exercise),
      },
    };
    usePilatesStore.setState({ exercises: [approved] });
    const onClose = vi.fn();
    render(<SequencePlanPreview onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '동작 흐름 보기' }));
    expect(screen.queryByRole('button', { name: /도해.*재생/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 시작' }));
    expect(screen.getByRole('button', { name: '시간표 리허설 일시정지' })).toBeEnabled();
    fireEvent.change(screen.getByRole('slider', { name: '수업 시간표 위치' }), {
      target: { value: '12' },
    });
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '시간표 보기' }));
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(screen.getByTestId('independent-reference')).toHaveAttribute('data-active', 'true');
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 시작' }));
    expect(screen.getByTestId('independent-reference')).toHaveAttribute('data-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: '동작 흐름 보기' }));
    act(() => usePilatesStore.setState({ activeSteps: [{ ...step, durationMin: 2 }] }));
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    expect(screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' })).toHaveAttribute(
      'data-study-static',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '계획 미리보기 닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('advances the linked pose and side only with the synthetic reviewed plan parent clock, excluding paused and switched-view time', () => {
    vi.useFakeTimers();
    let nowMs = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const syntheticReviewed = {
      ...exercise,
      review: {
        status: 'approved' as const,
        reviewerAlias: 'Synthetic QA reviewer · test fixture only',
        reviewedAt: '2026-11-05T12:00:00Z',
        scope: 'planning-metadata' as const,
        credentialVerified: false as const,
        revision: exerciseRevision(exercise),
      },
    };
    usePilatesStore.setState({ exercises: [syntheticReviewed] });
    const before = usePilatesStore.getState();
    const advanceParentClock = (milliseconds: number) => {
      nowMs += milliseconds;
      // One published tick must sample the actual monotonic parent elapsed time.
      act(() => vi.advanceTimersByTime(250));
    };
    render(<SequencePlanPreview onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '동작 흐름 보기' }));
    const view = () => screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' });
    const cursor = () => screen.getByRole('slider', { name: '수업 시간표 위치' });
    const progress = () => Number(view().getAttribute('data-study-progress'));
    expect(cursor()).toHaveValue('0');
    expect(view()).toHaveAttribute('data-motion-stage', 'setup');
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 시작' }));
    advanceParentClock(11_000);
    expect(cursor()).toHaveValue('11');
    expect(view()).toHaveAttribute('data-motion-stage', 'main');
    expect(view()).toHaveAttribute('data-study-side', 'left');
    // The authored clam main stage is .12–.88. Teaching consumes 8 seconds first.
    expect(progress()).toBeCloseTo(0.405, 8);
    advanceParentClock(2_000);
    expect(cursor()).toHaveValue('13');
    expect(progress()).toBeCloseTo(0.595, 8);
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 일시정지' }));
    const pausedProgress = progress();
    advanceParentClock(20_000);
    expect(cursor()).toHaveValue('13');
    expect(progress()).toBe(pausedProgress);
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 시작' }));
    advanceParentClock(18_000);
    expect(cursor()).toHaveValue('31');
    expect(view()).toHaveAttribute('data-study-side', 'right');
    // The right segment starts at class second 30; paused wall time contributes nothing.
    expect(progress()).toBeCloseTo(0.215, 8);
    fireEvent.click(screen.getByRole('button', { name: '시간표 보기' }));
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(screen.getByTestId('independent-reference')).toHaveAttribute('data-active', 'true');
    advanceParentClock(10_000);
    expect(cursor()).toHaveValue('31');
    fireEvent.click(screen.getByRole('button', { name: '동작 흐름 보기' }));
    expect(view()).toHaveAttribute('data-study-side', 'right');
    expect(progress()).toBeCloseTo(0.215, 8);
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: '시간표 리허설 일시정지' }),
    ).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('keeps timeline budget and duplicate gates closed in linked mode even with valid saved assets', () => {
    usePilatesStore.setState({
      activeSteps: [step, { ...step, order: 2, stepId: 'duplicate-qa' }],
      activeTargetMinutes: 5,
    });
    render(<SequencePlanPreview onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '동작 흐름 보기' }));
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    expect(screen.getByText(/전체 계획 시간을 목표 수업 시간에/)).toBeInTheDocument();
    expect(screen.getByText(/같은 동작이 중복되어/)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '수업 시간에 연결한 동작 흐름' })).toHaveAttribute(
      'data-binding-status',
      'matched',
    );
  });
});
