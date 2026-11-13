import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceWorkbench, WORKBENCH_PREP_RECOVERY_KEY } from '../components/SequenceWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';

const initialState = usePilatesStore.getState();

function seedDraft(durationMin = 3) {
  const exercise = initialState.exercises.find((item) => item.apparatus === 'mat')!;
  const step: SequenceStep = {
    stepId: 'editor-focus-step',
    exerciseId: exercise.id,
    order: 1,
    blockCategory: exercise.blockCategory,
    durationMin,
    selectedLayer: 'standard',
    instructorNote: '',
  };
  usePilatesStore.setState({
    activeSequenceId: 'editor-focus-draft',
    activeTitle: '편집 상태 확인',
    activeApparatus: 'mat',
    activeTargetMinutes: 50,
    activeSteps: [step],
    undoStack: [],
    savedSequences: [],
    historyLogs: [],
    generationError: null,
    saveFeedback: '',
    draftCriteria: null,
    lastCriteria: null,
  });
  return { exercise, step };
}

function renderWorkbench() {
  return render(
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  usePilatesStore.setState(initialState, true);
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(initialState, true);
  sessionStorage.clear();
});

describe('Workbench editing state and time feedback', () => {
  it('highlights the visible editor after recovering a stale selection stage', () => {
    seedDraft();
    sessionStorage.setItem(
      WORKBENCH_PREP_RECOVERY_KEY,
      JSON.stringify({
        sequenceId: 'editor-focus-draft',
        activeStep: 'finder',
        workflowStep: 'select',
        finderOpen: false,
      }),
    );

    renderWorkbench();

    const stepper = screen.getByRole('group', { name: '수업 제작 단계' });
    expect(within(stepper).getByRole('button', { name: /순서·시간 확인/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(within(stepper).getByRole('button', { name: /동작 담기/ })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByRole('region', { name: '오늘의 시퀀스' })).toBeVisible();
    expect(screen.getByTestId('workbench-step-flow-summary')).toHaveTextContent('30초 단위');
  });

  it('shows target fulfillment, preserves half minutes and reports the duration restored by undo', () => {
    seedDraft();
    renderWorkbench();

    const progress = screen.getByRole('progressbar', { name: '목표 시간 충족' });
    expect(progress).toHaveAttribute('aria-valuemax', '3000');
    expect(progress).toHaveAttribute('aria-valuenow', '180');
    expect(progress.firstElementChild).toHaveStyle({ width: '6%' });

    fireEvent.click(screen.getByRole('button', { name: '1번 동작 30초 늘리기' }));
    expect(progress).toHaveAttribute('aria-valuenow', '210');
    expect(progress).toHaveAttribute('aria-valuetext', '현재 03:30 / 목표 50:00');
    expect(screen.getByText('46:30 부족')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps[0]?.durationMin).toBe(3);
    expect(screen.getByRole('status', { name: '수업 구성 상태 안내' })).toHaveTextContent(
      '마지막 변경을 되돌렸어요. 현재 1개 항목 · 03:00입니다.',
    );
  });

  it('caps the progress track at the target while explicitly retaining the excess time', () => {
    seedDraft(60);
    renderWorkbench();

    const progress = screen.getByRole('progressbar', { name: '목표 시간 충족' });
    expect(progress).toHaveAttribute('aria-valuenow', '3000');
    expect(progress.firstElementChild).toHaveStyle({ width: '100%' });
    expect(progress).toHaveAttribute('aria-valuetext', '현재 60:00 / 목표 50:00 · 10:00 초과');
    expect(screen.getByText('10:00 초과')).toBeVisible();
  });

  it('keeps practice options available on demand and disables them when the movement is locked', () => {
    seedDraft();
    renderWorkbench();

    const options = screen.getByText('횟수·좌우', { selector: 'summary' }).closest('details')!;
    expect(options).not.toHaveAttribute('open');
    fireEvent.click(within(options).getByText('횟수·좌우'));
    const tenReps = within(options).getByRole('button', { name: '1번 동작 10회 반복' });
    fireEvent.click(tenReps);
    expect(usePilatesStore.getState().activeSteps[0]?.repetitions).toBe(10);

    fireEvent.click(screen.getByRole('button', { name: '1번 동작 잠금' }));
    expect(tenReps).toBeDisabled();
    expect(screen.getByRole('button', { name: '1번 동작 교체' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '1번 동작 30초 늘리기' })).toBeDisabled();
  });
});
