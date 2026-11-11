import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ledger from '../data/motionStudyLedger.json';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import {
  STEP_INSPECTOR_DRAFT_STORAGE_KEY,
  StepBlockInspector,
} from './StepBlockInspector';
import type { StepInspectorDraftCache } from './StepBlockInspector';

vi.mock('./MotionPatternPreview', () => ({
  MotionPatternThumbnail: () => <span data-testid="usability-study-thumbnail" />,
  MotionPatternPreview: ({
    reference,
    active,
  }: {
    reference: { family: string; variantId: string };
    active: boolean;
  }) => (
    <div
      data-testid="usability-selected-study-preview"
      data-family={reference.family}
      data-variant={reference.variantId}
      data-active={String(active)}
    />
  ),
}));

const originalState = usePilatesStore.getState();
const initialCatalogSnapshot = structuredClone(INITIAL_EXERCISES);
const originalInnerWidth = window.innerWidth;

const ledgerEntry = ledger.entries.find((item) => item.intendedExerciseIds.length > 0)!;
const firstExercise = {
  ...syntheticPlanningExercise('reformer', 'core', 'alpha', true),
  id: ledgerEntry.intendedExerciseIds[0],
  isUnilateral: true,
};
const secondExercise = {
  ...syntheticPlanningExercise('reformer', 'lower-body', 'beta', true),
  isUnilateral: false,
};
const motionReference = getMotionPatternReferences(firstExercise.id).find(
  (item) => item.family === ledgerEntry.family && item.variantId === ledgerEntry.variantId,
)!;
const expectedBinding = createSequenceMotionStudyBinding(
  firstExercise.id,
  ledgerEntry.family,
  ledgerEntry.variantId,
)!;

const stepOne: SequenceStep = {
  stepId: 'qa-usability-inspector-step-1',
  exerciseId: firstExercise.id,
  order: 1,
  blockCategory: 'core',
  durationMin: 4,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
};

const stepTwo: SequenceStep = {
  stepId: 'qa-usability-inspector-step-2',
  exerciseId: secondExercise.id,
  order: 2,
  blockCategory: 'lower-body',
  durationMin: 5,
  explanationSec: 0,
  transitionSec: 15,
  selectedLayer: 'easy',
  repetitions: 10,
  sets: 2,
  sideMode: 'together',
  instructorNote: '2번 동작 기존 메모',
};

function setViewportWidth(width: number) {
  act(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    fireEvent(window, new Event('resize'));
  });
}

function changeField(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function openCalculator() {
  const summary = screen.getByText('반복·유지·호흡으로 시간 계산', { selector: 'summary' });
  const details = summary.closest('details');
  if (details && !details.open) {
    fireEvent.click(summary);
  }
}

function selectMotionStudy() {
  const region = screen.getByRole('region', { name: '수업에 저장할 모션 초안' });
  const details = region.querySelector('details');
  if (details && !details.open) {
    fireEvent.click(details.querySelector('summary')!);
  }
  fireEvent.click(
    within(region).getByRole('radio', { name: `${motionReference.title} 수업 모션으로 선택` }),
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setViewportWidth(390);
  usePilatesStore.setState(
    {
      ...originalState,
      exercises: [
        ...INITIAL_EXERCISES.filter(
          (item) => item.id !== firstExercise.id && item.id !== secondExercise.id,
        ),
        firstExercise,
        secondExercise,
      ],
      activeSteps: structuredClone([stepOne, stepTwo]),
      undoStack: [],
      generationError: null,
      saveFeedback: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
  setViewportWidth(originalInnerWidth);
  usePilatesStore.setState(originalState, true);
  vi.restoreAllMocks();
  expect(INITIAL_EXERCISES).toEqual(initialCatalogSnapshot);
});

describe('StepBlockInspector end-to-end detail -> calculation -> draft -> apply usability', () => {
  it('guides side mismatch in detail -> calculation -> draft -> apply, detaches stale timeEstimate only when upper calculated fields diverge, and deduplicates repeated Apply clicks', () => {
    const onClose = vi.fn();
    function Harness() {
      const currentStep = usePilatesStore((state) => state.activeSteps[0]!);
      return (
        <StepBlockInspector
          index={0}
          step={currentStep}
          onClose={onClose}
          onReplace={vi.fn()}
          onOpenExercise={vi.fn()}
        />
      );
    }

    render(<Harness />);

    // 1. Detail input first: instructor sets bilateral order + counts + role + motion study
    changeField('수업에서의 역할', 'main');
    changeField('강사가 정한 횟수', '8');
    changeField('강사가 정한 세트', '2');
    changeField('수행할 쪽', 'right-then-left');
    selectMotionStudy();

    // 2. Open calculator -> immediately warns that upper 'right-then-left'(2배) != calculator '1배'
    openCalculator();
    expect(screen.getByTestId('ste-side-mismatch-notice')).toHaveTextContent(
      '현재 수행할 쪽(오른쪽부터 양쪽)과 계산할 쪽(1배)이 다릅니다.',
    );

    // Pull upper draft into calculator, enter cadence, inspect preview, and transfer to draft
    fireEvent.click(screen.getByTestId('ste-sync-from-draft'));
    expect(screen.queryByTestId('ste-side-mismatch-notice')).not.toBeInTheDocument();
    changeField('한 회 움직임 · 초', '3');
    // 2 sides * 2 sets * 8 reps * 3s = 96s + 20s + 10s = 126s (02:06 = 2.1 min)
    expect(screen.getByText('가정 총시간 02:06')).toBeInTheDocument();
    expect(screen.getByTestId('ste-apply-preview')).toHaveTextContent('04:00 → 02:06');
    expect(screen.getByTestId('ste-apply-preview')).toHaveTextContent('오른쪽부터 양쪽 유지');

    fireEvent.click(screen.getByRole('button', { name: '계산값을 편집란에 넣기' }));
    expect(screen.getByLabelText('블록 총시간 · 분')).toHaveValue(2.1);
    expect(screen.getByLabelText('수행할 쪽')).toHaveValue('right-then-left');

    // Store is untouched until 변경 적용; pending summary shows exact scope
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(stepOne);
    const pendingSummary = screen.getByTestId('step-inspector-pending-summary');
    expect(pendingSummary).toHaveTextContent('총시간');
    expect(pendingSummary).toHaveTextContent('시간 계산 가정');
    expect(pendingSummary).toHaveTextContent('수업 모션 연결');

    // Editing note or switching bilateral order to left-then-right (still 2배) keeps timeEstimate attached!
    changeField('이번 수업 티칭 메모', '양측 순서 전환 후에도 계산 가정 유지');
    changeField('수행할 쪽', 'left-then-right');
    expect(
      screen.queryByTestId('step-inspector-estimate-detached'),
    ).not.toBeInTheDocument();
    expect(pendingSummary).toHaveTextContent('시간 계산 가정');

    // Manually clearing 강사가 정한 횟수 back to blank ('미지정') detaches stale timeEstimate cleanly
    changeField('강사가 정한 횟수', '');
    expect(screen.getByTestId('step-inspector-estimate-detached')).toHaveTextContent(
      '상단 시간·횟수·좌우를 직접 수정해 이전 계산 가정 연결을 해제했습니다.',
    );
    expect(pendingSummary).not.toHaveTextContent('시간 계산 가정');

    // Re-apply calculator values -> restores count=8 and re-attaches timeEstimate
    fireEvent.click(screen.getByRole('button', { name: '계산값을 편집란에 넣기' }));
    expect(
      screen.queryByTestId('step-inspector-estimate-detached'),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(8);

    // Commit via 변경 적용 -> exactly 1 undoStack snapshot; repeated click when mounted does not duplicate undo or error
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      durationMin: 2.1,
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      classSection: 'main',
      instructorNote: '양측 순서 전환 후에도 계산 가정 유지',
      motionStudy: expectedBinding,
      timeEstimate: expect.objectContaining({ sides: 2, repetitions: 8, sets: 2, secondsPerRep: 3 }),
    });

    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);

    // Undo restores exact original stepOne
    act(() => {
      usePilatesStore.getState().undoSequence();
    });
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(stepOne);
  });

  it('previews timing conflicts before submit and restores only timing in one tap while preserving counts, role, memo, and motionStudy', () => {
    const onClose = vi.fn();
    render(
      <StepBlockInspector
        index={0}
        step={usePilatesStore.getState().activeSteps[0]!}
        onClose={onClose}
        onReplace={vi.fn()}
        onOpenExercise={vi.fn()}
      />,
    );

    changeField('수업에서의 역할', 'preparation');
    changeField('강사가 정한 횟수', '12');
    changeField('이번 수업 티칭 메모', '시간 복구 후에도 남아야 하는 메모');
    selectMotionStudy();

    // Enter conflicting timing (30s total vs 25s teaching + 15s transition = 40s)
    changeField('블록 총시간 · 분', '0.5');
    changeField('티칭 · 초', '25');
    changeField('전환 · 초', '15');

    // Pre-submit inline conflict notice appears WITHOUT stealing role="alert"
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const timingPreview = screen.getByTestId('step-inspector-draft-timing');
    expect(timingPreview).toHaveTextContent(
      '티칭(25초)·전환(15초) 합계(40초)가 블록 총시간(00:30)을 초과합니다.',
    );
    expect(screen.getByLabelText('티칭 · 초')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('전환 · 초')).toHaveAttribute('aria-invalid', 'true');

    // Trying to submit still surfaces the canonical role="alert" store message without losing draft
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(screen.getByRole('alert')).toHaveTextContent('설명·전환 시간의 합계');
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);

    // 1-tap 시간만 원래 값으로 복구 restores timing & clears alert while keeping role, count, memo, and motionStudy
    fireEvent.click(screen.getByTestId('step-inspector-restore-timing'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-inspector-draft-timing')).not.toBeInTheDocument();
    expect(screen.getByLabelText('블록 총시간 · 분')).toHaveValue(4);
    expect(screen.getByLabelText('티칭 · 초')).toHaveValue(20);
    expect(screen.getByLabelText('전환 · 초')).toHaveValue(10);
    expect(screen.getByLabelText('수업에서의 역할')).toHaveValue('preparation');
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(12);
    expect(screen.getByLabelText('이번 수업 티칭 메모')).toHaveValue(
      '시간 복구 후에도 남아야 하는 메모',
    );
    expect(screen.getByTestId('usability-selected-study-preview')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      durationMin: 4,
      explanationSec: 20,
      transitionSec: 10,
      classSection: 'preparation',
      repetitions: 12,
      instructorNote: '시간 복구 후에도 남아야 하는 메모',
      motionStudy: expectedBinding,
    });
  });

  it('isolates draft state across direct step prop switches (다른 동작 이동) and replace round-trips on 320px and 390px without leaking motionStudy or using sessionStorage.setItem', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const draftByStepId = new Map<string, StepInspectorDraftCache>();

    setViewportWidth(320);
    const { rerender, unmount } = render(
      <StepBlockInspector
        index={0}
        step={usePilatesStore.getState().activeSteps[0]!}
        onClose={vi.fn()}
        onReplace={vi.fn()}
        onOpenExercise={vi.fn()}
        loadDraft={() => draftByStepId.get('qa-usability-inspector-step-1') ?? null}
        onDraftChange={(cache) => {
          draftByStepId.set(cache.stepId, cache);
        }}
      />,
    );

    changeField('강사가 정한 횟수', '15');
    changeField('이번 수업 티칭 메모', '1번 동작 전용 미저장 메모');
    selectMotionStudy();
    expect(screen.getByTestId('usability-selected-study-preview')).toBeInTheDocument();

    // Switch directly to Step 2 without unmounting parent wrapper (다른 동작 이동) at 390px
    setViewportWidth(390);
    rerender(
      <StepBlockInspector
        index={1}
        step={usePilatesStore.getState().activeSteps[1]!}
        onClose={vi.fn()}
        onReplace={vi.fn()}
        onOpenExercise={vi.fn()}
        loadDraft={() => draftByStepId.get('qa-usability-inspector-step-2') ?? null}
        onDraftChange={(cache) => {
          draftByStepId.set(cache.stepId, cache);
        }}
      />,
    );

    // Step 2 displays its own clean values (including explicit 0 explanationSec!) and zero leaked motionStudy
    expect(screen.getByTestId('step-inspector-quick-badge')).toHaveTextContent('동작 블록 · 02');
    expect(screen.getByLabelText('블록 총시간 · 분')).toHaveValue(5);
    expect(screen.getByLabelText('티칭 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('전환 · 초')).toHaveValue(15);
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(10);
    expect(screen.getByLabelText('수행할 쪽')).toHaveValue('together');
    expect(screen.getByLabelText('이번 수업 티칭 메모')).toHaveValue('2번 동작 기존 메모');
    expect(screen.queryByTestId('usability-selected-study-preview')).not.toBeInTheDocument();

    // Return to Step 1 -> restores Step 1's unsaved draft & motionStudy cleanly!
    rerender(
      <StepBlockInspector
        index={0}
        step={usePilatesStore.getState().activeSteps[0]!}
        onClose={vi.fn()}
        onReplace={vi.fn()}
        onOpenExercise={vi.fn()}
        loadDraft={() => draftByStepId.get('qa-usability-inspector-step-1') ?? null}
        onDraftChange={(cache) => {
          draftByStepId.set(cache.stepId, cache);
        }}
      />,
    );
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(15);
    expect(screen.getByLabelText('이번 수업 티칭 메모')).toHaveValue('1번 동작 전용 미저장 메모');
    expect(screen.getByTestId('usability-selected-study-preview')).toBeInTheDocument();

    // Reset draft clears calculator & draft cleanly and announces polite status
    fireEvent.click(screen.getByTestId('step-inspector-reset-draft'));
    expect(
      screen.getByText('수정한 입력값을 적용 전 상태로 되돌렸습니다.'),
    ).toHaveAttribute('role', 'status');
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(null);
    expect(window.sessionStorage.getItem(STEP_INSPECTOR_DRAFT_STORAGE_KEY)).toBeNull();

    // Confirm sessionStorage draft writes never called Storage.prototype.setItem directly
    const sessionDraftSetCalls = setItemSpy.mock.calls.filter(
      ([key]) => key === STEP_INSPECTOR_DRAFT_STORAGE_KEY,
    );
    expect(sessionDraftSetCalls).toHaveLength(0);
    unmount();
  });

  it('enforces >=44px touch targets, :focus-visible outlines, 320px/480px mobile rules, and prefers-reduced-motion in step-inspector.css', () => {
    const cssPath = resolve(process.cwd(), 'src/styles/step-inspector.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('min-height: 44px');
    expect(css).toContain('min-width: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 480px)');
    expect(css).toContain('@media (max-width: 359px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
