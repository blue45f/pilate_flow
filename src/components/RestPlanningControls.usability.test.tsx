import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RestBudgetControl } from './RestPlanningControls';
import { SequenceWorkbench } from './SequenceWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';

const originalState = usePilatesStore.getState();
const originalInnerWidth = window.innerWidth;

const warmupAlpha = syntheticPlanningExercise('mat', 'warmup', 'alpha');
const coreAlpha = syntheticPlanningExercise('mat', 'core', 'alpha');
const cooldownBeta = syntheticPlanningExercise('mat', 'cooldown', 'beta');

const baseCriteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 0,
  targetMinutes: 50,
  defaultLayer: 'standard',
  restMinutes: 0,
};

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

function createInitialSteps(): SequenceStep[] {
  return [
    {
      stepId: 'rest-anchor-warmup',
      order: 1,
      exerciseId: warmupAlpha.id,
      blockCategory: 'warmup',
      durationMin: 15,
      selectedLayer: 'standard',
    },
    {
      stepId: 'rest-anchor-core',
      order: 2,
      exerciseId: coreAlpha.id,
      blockCategory: 'core',
      durationMin: 15,
      selectedLayer: 'standard',
    },
    {
      stepId: 'rest-anchor-cooldown',
      order: 3,
      exerciseId: cooldownBeta.id,
      blockCategory: 'cooldown',
      durationMin: 10,
      selectedLayer: 'standard',
    },
  ];
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
  usePilatesStore.setState(
    {
      ...originalState,
      exercises: [warmupAlpha, coreAlpha, cooldownBeta],
      activeSequenceId: 'qa-rest-usability-seq',
      activeTitle: '합성 휴식 동선 검증 수업',
      activeSubtitle: '',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      activeSteps: createInitialSteps(),
      ownedApparatus: ['mat'],
      ownedEquipment: ['mat'],
      ownedProps: [],
      draftCriteria: structuredClone(baseCriteria),
      lastCriteria: null,
      generationError: null,
      saveFeedback: null,
      persistenceError: null,
      undoStack: [],
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(originalState, true);
  setViewportWidth(originalInnerWidth);
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('RestPlanningControls and RestStepCard usability and anchor safety', () => {
  it('tracks the selected stepId anchor across step reordering and preserves start/end select contracts at 320px', () => {
    setViewportWidth(320);
    renderWorkbench();

    fireEvent.click(screen.getByText('휴식 추가', { selector: 'summary span' }));
    const durationInput = screen.getByLabelText('추가할 휴식 시간 · 분');
    const placementSelect = screen.getByLabelText('휴식 넣을 위치');

    fireEvent.change(durationInput, { target: { value: '2.5' } });
    fireEvent.change(placementSelect, { target: { value: '0' } });
    expect(placementSelect).toHaveValue('0');

    const preview = screen.getByTestId('rest-insert-preview');
    expect(preview).toHaveTextContent(`1번 ${warmupAlpha.nameKo} 뒤`);
    expect(preview).toHaveTextContent('+02:30');
    expect(preview).toHaveTextContent('40:00 → 42:30');

    // Reorder step 0 ('rest-anchor-warmup') down to index 1 before inserting rest
    act(() => {
      usePilatesStore.getState().moveStep(0, 'down');
    });
    expect(usePilatesStore.getState().activeSteps.map((s) => s.stepId)).toEqual([
      'rest-anchor-core',
      'rest-anchor-warmup',
      'rest-anchor-cooldown',
    ]);

    // Select value tracks the anchor stepId to its new index ('1'), not stale index '0'
    expect(placementSelect).toHaveValue('1');
    expect(preview).toHaveTextContent(`2번 ${warmupAlpha.nameKo} 뒤`);

    fireEvent.click(screen.getByRole('button', { name: '이 위치에 휴식 넣기' }));

    const afterAnchorInsert = usePilatesStore.getState().activeSteps;
    expect(afterAnchorInsert).toHaveLength(4);
    expect(afterAnchorInsert[1]?.stepId).toBe('rest-anchor-warmup');
    expect(isRestStep(afterAnchorInsert[2]!)).toBe(true);
    expect(afterAnchorInsert[2]?.durationMin).toBe(2.5);
    expect(afterAnchorInsert[3]?.stepId).toBe('rest-anchor-cooldown');

    // Verify '-1' (맨 앞) and 'end' (맨 뒤) select contracts remain intact
    fireEvent.change(durationInput, { target: { value: '1' } });
    fireEvent.change(placementSelect, { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: '이 위치에 휴식 넣기' }));
    expect(isRestStep(usePilatesStore.getState().activeSteps[0]!)).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0]?.durationMin).toBe(1);

    fireEvent.change(placementSelect, { target: { value: 'end' } });
    fireEvent.click(screen.getByRole('button', { name: '이 위치에 휴식 넣기' }));
    const finalSteps = usePilatesStore.getState().activeSteps;
    expect(isRestStep(finalSteps.at(-1)!)).toBe(true);
    expect(finalSteps.at(-1)?.durationMin).toBe(1);
  });

  it('blocks insertion and requires explicit reselection when the chosen anchor step is deleted', () => {
    setViewportWidth(390);
    renderWorkbench();

    fireEvent.click(screen.getByText('휴식 추가', { selector: 'summary span' }));
    const placementSelect = screen.getByLabelText('휴식 넣을 위치');

    // Choose '2번 coreAlpha 뒤' (index '1')
    fireEvent.change(placementSelect, { target: { value: '1' } });
    expect(placementSelect).toHaveValue('1');

    // Delete the anchor step ('rest-anchor-core') before clicking insert
    act(() => {
      usePilatesStore.getState().removeStep(1);
    });
    const stepsAfterDelete = usePilatesStore.getState().activeSteps;
    expect(stepsAfterDelete.map((s) => s.stepId)).toEqual([
      'rest-anchor-warmup',
      'rest-anchor-cooldown',
    ]);

    // Must not silently adopt index 1 ('cooldownBeta') or 'end'
    expect(placementSelect).toHaveValue('__missing_anchor__');
    expect(placementSelect).toHaveAttribute('aria-invalid', 'true');
    const missingRecovery = screen.getByTestId('rest-missing-anchor-recovery');
    expect(missingRecovery).toHaveTextContent(coreAlpha.nameKo);
    expect(missingRecovery).toHaveTextContent('자동 배치하지 않았습니다');

    // Clicking insert while anchor is missing focuses the placement select and leaves steps untouched
    fireEvent.click(screen.getByRole('button', { name: '이 위치에 휴식 넣기' }));
    expect(usePilatesStore.getState().activeSteps).toBe(stepsAfterDelete);
    expect(placementSelect).toHaveFocus();

    // Explicit reselection via quick recovery button restores valid state and allows insertion
    fireEvent.click(within(missingRecovery).getByRole('button', { name: '맨 뒤로 선택' }));
    expect(placementSelect).toHaveValue('end');
    expect(placementSelect).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByTestId('rest-missing-anchor-recovery')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '이 위치에 휴식 넣기' }));
    const afterRecoveredInsert = usePilatesStore.getState().activeSteps;
    expect(afterRecoveredInsert).toHaveLength(3);
    expect(isRestStep(afterRecoveredInsert[2]!)).toBe(true);
    expect(afterRecoveredInsert[2]?.durationMin).toBe(5);
  });

  it('handles empty, zero, decimal, and total-budget boundaries with error focus and original-value recovery', () => {
    const parentKeyDown = vi.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <SequenceWorkbench
          onOpenYouTubePreview={vi.fn()}
          onOpenClipper={vi.fn()}
          onOpenLogModal={vi.fn()}
        />
      </div>,
    );

    const restSummary = screen.getByText('휴식 추가', { selector: 'summary span' });
    fireEvent.click(restSummary);
    const insertDetails = restSummary.closest('details');
    if (!insertDetails) {
      throw new Error('Expected rest-insert-control details element');
    }
    const insertControl = within(insertDetails);
    const insertDurationInput = insertControl.getByLabelText('추가할 휴식 시간 · 분');
    const insertBtn = insertControl.getByRole('button', { name: '이 위치에 휴식 넣기' });

    // Empty and 0 boundaries focus the input and offer original value recovery without setting store alert
    fireEvent.change(insertDurationInput, { target: { value: '' } });
    fireEvent.click(insertBtn);
    expect(insertDurationInput).toHaveAttribute('aria-invalid', 'true');
    expect(insertDurationInput).toHaveFocus();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(3);
    expect(screen.queryByRole('alert', { name: '수업 구성 오류 안내' })).toBeNull();

    fireEvent.change(insertDurationInput, { target: { value: '0' } });
    fireEvent.click(insertBtn);
    expect(insertDurationInput).toHaveAttribute('aria-invalid', 'true');
    expect(insertControl.getByRole('status')).toHaveTextContent(
      '휴식 시간을 0.5–120분 사이로 입력해 주세요.',
    );

    fireEvent.click(insertControl.getByRole('button', { name: '원래 값(5분) 복구' }));
    expect(insertDurationInput).toHaveValue(5);
    expect(insertDurationInput).not.toHaveAttribute('aria-invalid');
    expect(insertDurationInput).toHaveFocus();
    expect(insertControl.queryByRole('status')).toBeNull();

    // Valid minimum decimal 0.5 inserts cleanly and updates committed baseline to 0.5
    fireEvent.change(insertDurationInput, { target: { value: '0.5' } });
    fireEvent.click(insertBtn);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(4);
    expect(usePilatesStore.getState().activeSteps[3]?.durationMin).toBe(0.5);

    // Total class budget overflow (50m target -> 50m rest rejected by store) surfaces both top alert and inline status
    fireEvent.change(insertDurationInput, { target: { value: '50' } });
    fireEvent.click(insertBtn);
    expect(insertDurationInput).toHaveAttribute('aria-invalid', 'true');
    expect(insertDurationInput).toHaveFocus();

    const expectedBudgetErrorText =
      '휴식 합계는 전체 수업 시간보다 작아야 합니다. 휴식을 줄이거나 수업 시간을 늘려 주세요.';
    const topInsertAlert = screen.getByRole('alert', { name: '수업 구성 오류 안내' });
    expect(topInsertAlert).toBeVisible();
    expect(topInsertAlert).toHaveTextContent(expectedBudgetErrorText);

    const inlineInsertStatus = insertControl.getByRole('status');
    expect(inlineInsertStatus).toBeVisible();
    expect(inlineInsertStatus).toHaveAttribute(
      'id',
      insertDurationInput.getAttribute('aria-describedby'),
    );
    expect(inlineInsertStatus).toHaveTextContent(expectedBudgetErrorText);

    parentKeyDown.mockClear();
    fireEvent.keyDown(insertDurationInput, { key: 'Escape' });
    expect(insertDurationInput).toHaveValue(0.5);
    expect(insertDurationInput).not.toHaveAttribute('aria-invalid');
    expect(insertControl.queryByRole('status')).toBeNull();
    expect(parentKeyDown).not.toHaveBeenCalled();

    // RestStepCard immediate decimal update, invalid/overflow recovery, Escape restoration, lock, and undo
    const restCard = within(screen.getByRole('article', { name: '4번 휴식' }));
    const cardSpinbutton = restCard.getByRole('spinbutton', { name: '4번 휴식 시간 · 분' });

    fireEvent.change(cardSpinbutton, { target: { value: '1.5' } });
    expect(usePilatesStore.getState().activeSteps[3]?.durationMin).toBe(1.5);
    expect(restCard.getByText('01:30')).toBeVisible();
    expect(screen.queryByRole('alert', { name: '수업 구성 오류 안내' })).toBeNull();

    fireEvent.change(cardSpinbutton, { target: { value: '0' } });
    expect(cardSpinbutton).toHaveAttribute('aria-invalid', 'true');
    expect(usePilatesStore.getState().activeSteps[3]?.durationMin).toBe(1.5);
    expect(restCard.getByRole('status')).toHaveTextContent(
      '휴식 시간을 0.5–120분 사이로 입력해 주세요.',
    );

    fireEvent.click(restCard.getByRole('button', { name: '원래 시간(1.5분) 복구' }));
    expect(cardSpinbutton).toHaveValue(1.5);
    expect(cardSpinbutton).not.toHaveAttribute('aria-invalid');
    expect(cardSpinbutton).toHaveFocus();
    expect(restCard.queryByRole('status')).toBeNull();

    fireEvent.change(cardSpinbutton, { target: { value: '50' } });
    expect(cardSpinbutton).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert', { name: '수업 구성 오류 안내' })).toHaveTextContent(
      expectedBudgetErrorText,
    );
    const cardErrorStatus = restCard.getByRole('status');
    expect(cardErrorStatus).toHaveAttribute('id', cardSpinbutton.getAttribute('aria-describedby'));
    expect(cardErrorStatus).toHaveTextContent(expectedBudgetErrorText);

    parentKeyDown.mockClear();
    fireEvent.keyDown(cardSpinbutton, { key: 'Escape' });
    expect(cardSpinbutton).toHaveValue(1.5);
    expect(cardSpinbutton).not.toHaveAttribute('aria-invalid');
    expect(restCard.queryByRole('status')).toBeNull();
    expect(parentKeyDown).not.toHaveBeenCalled();

    fireEvent.click(restCard.getByRole('button', { name: '4번 휴식 잠금' }));
    expect(cardSpinbutton).toBeDisabled();
    expect(restCard.getByText('잠금됨')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(cardSpinbutton).not.toBeDisabled();
    expect(cardSpinbutton).toHaveValue(1.5);

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps[3]?.durationMin).toBe(0.5);
    expect(cardSpinbutton).toHaveValue(0.5);
  });

  it('improves locked rest reading and one-tap unlock-to-edit while preserving fit, undo, budget separation, and rehearsal contracts', () => {
    setViewportWidth(390);
    act(() => {
      usePilatesStore.getState().addRestStep(5, 0);
    });

    const onBudgetChange = vi.fn();
    render(
      <>
        <RestBudgetControl minutes={5} totalMinutes={50} onChange={onBudgetChange} />
        <SequenceWorkbench
          onOpenYouTubePreview={vi.fn()}
          onOpenClipper={vi.fn()}
          onOpenLogModal={vi.fn()}
        />
      </>,
    );

    // RestBudgetControl custom input error & restore stays separate from manual RestStepCard items
    fireEvent.click(screen.getByRole('button', { name: '직접 지정' }));
    const budgetInput = screen.getByLabelText('자동 휴식 직접 지정 · 분');
    fireEvent.change(budgetInput, { target: { value: '50' } });
    expect(budgetInput).toHaveAttribute('aria-invalid', 'true');
    expect(onBudgetChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '원래 값(5분) 복구' }));
    expect(budgetInput).toHaveValue(5);
    expect(budgetInput).not.toHaveAttribute('aria-invalid');

    const restCard = within(screen.getByRole('article', { name: '2번 휴식' }));
    expect(restCard.queryByText(/큐|검토 필요|스프링/)).toBeNull();

    // Lock the rest card
    fireEvent.click(restCard.getByRole('button', { name: '2번 휴식 잠금' }));
    expect(restCard.getByText('잠금됨')).toBeVisible();
    expect(restCard.getByTestId('rest-step-locked-bar')).toHaveTextContent(
      '잠근 휴식(5분 고정)의 시간과 위치를 유지합니다.',
    );
    const cardSpinbutton = restCard.getByRole('spinbutton', { name: '2번 휴식 시간 · 분' });
    expect(cardSpinbutton).toBeDisabled();
    expect(restCard.getByRole('button', { name: '2번 휴식 위로' })).toBeDisabled();
    expect(restCard.getByRole('button', { name: '2번 휴식 아래로' })).toBeDisabled();
    expect(restCard.getByRole('button', { name: '2번 휴식 삭제' })).toBeDisabled();

    // Fitting active duration to 50 minutes keeps the locked 5-minute rest intact
    fireEvent.click(screen.getByRole('button', { name: '50분에 맞추기' }));
    const fittedSteps = usePilatesStore.getState().activeSteps;
    expect(fittedSteps[1]?.durationMin).toBe(5);
    expect(getSequenceDurations(fittedSteps)).toEqual({
      totalSec: 3000,
      exerciseSec: 2700,
      restSec: 300,
    });

    // One-tap '잠금 풀고 시간 수정' unlocks and focuses the duration input immediately
    fireEvent.click(restCard.getByRole('button', { name: '잠금 풀고 시간 수정' }));
    expect(cardSpinbutton).not.toBeDisabled();
    expect(cardSpinbutton).toHaveFocus();

    fireEvent.change(cardSpinbutton, { target: { value: '3.5' } });
    expect(usePilatesStore.getState().activeSteps[1]?.durationMin).toBe(3.5);

    // Undo restores the previous step duration cleanly without stale errors, and simulation remains valid
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps[1]?.durationMin).toBe(5);

    const state = usePilatesStore.getState();
    const simulation = buildSequenceSimulation(
      state.activeSteps,
      state.exercises,
      state.activeTargetMinutes,
    );
    expect(simulation.gate.canRehearse).toBe(true);
    expect(simulation.totals.restSec).toBe(300);
  });
});
