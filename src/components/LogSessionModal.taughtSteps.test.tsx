import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveStageView } from './LiveStageView';
import { LogSessionModal, type TeachingLogContext } from './LogSessionModal';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';

const originalStore = usePilatesStore.getState();
const productionSnapshot = structuredClone(INITIAL_EXERCISES);

const warmupEx = syntheticPlanningExercise('mat', 'warmup', 'alpha');
const coreEx = syntheticPlanningExercise('mat', 'core', 'alpha');

const SEQUENCE_ID = 'qa-taught-steps-seq';
const DRAFT_KEY = `pf_log_session_draft_v1:${SEQUENCE_ID}`;

const BASE_STEPS: SequenceStep[] = [
  {
    stepId: 'taught-step-0',
    order: 1,
    exerciseId: warmupEx.id,
    blockCategory: 'warmup',
    durationMin: 233 / 60,
    explanationSec: 20,
    transitionSec: 0,
    selectedLayer: 'standard',
  },
  {
    stepId: 'taught-step-rest',
    order: 2,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 1,
    selectedLayer: 'standard',
  },
  {
    stepId: 'taught-step-1',
    order: 3,
    exerciseId: coreEx.id,
    blockCategory: 'core',
    durationMin: 317 / 60,
    explanationSec: 20,
    transitionSec: 15,
    selectedLayer: 'standard',
  },
];

function StageToLogHarness() {
  const [logModalState, setLogModalState] = useState<{
    sequenceId: string;
    context?: TeachingLogContext;
  } | null>(null);

  return (
    <>
      <LiveStageView
        onOpenLogModal={(sequenceId, context) => setLogModalState({ sequenceId, context })}
      />
      <LogSessionModal
        sequenceId={logModalState?.sequenceId ?? null}
        context={logModalState?.context}
        onClose={() => setLogModalState(null)}
      />
    </>
  );
}

describe('LogSessionModal taughtStepIds selection & draft recovery contracts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T09:00:00.000Z'));
    window.localStorage.clear();
    window.sessionStorage.clear();

    usePilatesStore.setState(
      {
        ...originalStore,
        activeTab: 'stage',
        activeSequenceId: SEQUENCE_ID,
        activeTitle: '오전 매트 흐름',
        activeSubtitle: '',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 10,
        activeTargetGroupId: INITIAL_CLASS_GROUPS[0]!.id,
        activeSteps: structuredClone(BASE_STEPS),
        exercises: [...INITIAL_EXERCISES, warmupEx, coreEx],
        classGroups: INITIAL_CLASS_GROUPS,
        savedSequences: [],
        historyLogs: [],
        persistenceError: null,
        generationError: null,
        saveFeedback: null,
      },
      true,
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    expect(INITIAL_EXERCISES).toEqual(productionSnapshot);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    usePilatesStore.setState(originalStore, true);
  });

  it('pre-selects all planned steps by default when context or taughtStepIds is undefined', () => {
    const onClose = vi.fn();
    const { unmount } = render(<LogSessionModal sequenceId={SEQUENCE_ID} onClose={onClose} />);

    let dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    const detailsWhenNoContext = dialog
      .getByText(/실제로 진행한 동작 확인/)
      .closest('details')!;
    expect(detailsWhenNoContext).not.toHaveAttribute('open');
    expect(detailsWhenNoContext).toHaveTextContent('실제로 진행한 동작 확인 · 2 / 2개');
    expect(
      dialog.getByText('계획에 있는 동작이 선택되어 있어요. 실제로 진행한 동작만 남겨 주세요.'),
    ).toBeInTheDocument();

    const checkboxesNoContext = dialog.getAllByRole('checkbox');
    expect(checkboxesNoContext).toHaveLength(3);
    for (const box of checkboxesNoContext) {
      expect(box).toBeChecked();
    }
    unmount();

    render(
      <LogSessionModal
        sequenceId={SEQUENCE_ID}
        onClose={onClose}
        context={{
          stepsSnapshot: structuredClone(BASE_STEPS),
          sequenceTitle: '수동 기록 수업',
        }}
      />,
    );
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    const detailsWhenUndefined = dialog
      .getByText(/실제로 진행한 동작 확인/)
      .closest('details')!;
    expect(detailsWhenUndefined).not.toHaveAttribute('open');
    for (const box of dialog.getAllByRole('checkbox')) {
      expect(box).toBeChecked();
    }

    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    const savedLog = usePilatesStore.getState().historyLogs[0]!;
    expect(savedLog.stepsSnapshot).toHaveLength(3);
    expect(savedLog.stepsSnapshot?.map((step) => step.stepId)).toEqual([
      'taught-step-0',
      'taught-step-rest',
      'taught-step-1',
    ]);
  });

  it('selects only matching taught steps when taughtStepIds is a non-empty array and ignores unknown IDs', () => {
    const onClose = vi.fn();
    render(
      <LogSessionModal
        sequenceId={SEQUENCE_ID}
        onClose={onClose}
        context={{
          actualDurationSec: 185,
          actualRestDurationSec: 0,
          stepsSnapshot: structuredClone(BASE_STEPS),
          sequenceTitle: '부분 타이머 진행 수업',
          taughtStepIds: ['taught-step-1', 'stale-nonexistent-step'],
        }}
      />,
    );

    const dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    const stepDetails = dialog.getByText(/실제로 진행한 동작 확인/).closest('details')!;
    expect(stepDetails).toHaveAttribute('open');
    expect(stepDetails).toHaveTextContent('실제로 진행한 동작 확인 · 1 / 2개');
    expect(
      dialog.getByText('진행한 동작만 선택해 주세요. 타이머를 사용한 동작을 먼저 선택해 두었습니다.'),
    ).toBeInTheDocument();

    expect(dialog.getByRole('checkbox', { name: warmupEx.nameKo })).not.toBeChecked();
    expect(dialog.getByRole('checkbox', { name: '휴식 01:00' })).not.toBeChecked();
    expect(dialog.getByRole('checkbox', { name: coreEx.nameKo })).toBeChecked();

    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    const savedLog = usePilatesStore.getState().historyLogs[0]!;
    expect(savedLog.actualDurationSec).toBe(185);
    expect(savedLog.exerciseIds).toEqual([coreEx.id]);
    expect(savedLog.stepsSnapshot).toEqual([{ ...BASE_STEPS[2]!, order: 1 }]);
  });

  it('starts with zero selected steps when taughtStepIds is empty, requires manual movement selection, and preserves paused Stage +1m snapshot without mutating activeSteps', () => {
    const planBefore = structuredClone(usePilatesStore.getState().activeSteps);
    render(<StageToLogHarness />);

    // Paused Stage entry (0s elapsed): add +1m to Step 0, move to Step 1, then finish & open log modal
    fireEvent.click(screen.getByRole('button', { name: '현재 동작 1분 추가' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(planBefore);
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));

    const dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    const stepDetails = dialog.getByText(/실제로 진행한 동작 확인/).closest('details')!;
    expect(stepDetails).toHaveAttribute('open');
    expect(stepDetails).toHaveTextContent('실제로 진행한 동작 확인 · 0 / 2개');

    const checkboxes = dialog.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
    for (const box of checkboxes) {
      expect(box).not.toBeChecked();
    }

    // Cannot save when zero movements (or only rest) are selected
    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('실제로 진행한 동작을 하나 이상 선택해 주세요.');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);

    fireEvent.click(dialog.getByRole('checkbox', { name: '휴식 01:00' }));
    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('실제로 진행한 동작을 하나 이상 선택해 주세요.');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    // Uncheck rest again to verify exact Step 0 manual selection contract
    fireEvent.click(dialog.getByRole('checkbox', { name: '휴식 01:00' }));

    // Manually check first movement (checkbox[0]), enter 51m 12s (3072s), and save
    fireEvent.click(checkboxes[0]!);
    expect(checkboxes[0]).toBeChecked();
    expect(stepDetails).toHaveTextContent('실제로 진행한 동작 확인 · 1 / 2개');

    fireEvent.change(dialog.getByRole('spinbutton', { name: '분' }), {
      target: { value: '51' },
    });
    fireEvent.change(dialog.getByRole('spinbutton', { name: '초' }), {
      target: { value: '12' },
    });
    fireEvent.change(dialog.getByRole('textbox', { name: /다음 수업을 위한 메모/ }), {
      target: { value: '일시정지 진입 후 1분 추가 검증' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));

    const savedLog = usePilatesStore.getState().historyLogs[0]!;
    expect(savedLog.sequenceTitle).toBe('오전 매트 흐름');
    expect(savedLog.actualDurationSec).toBe(3072);
    expect(savedLog.stepsSnapshot).toHaveLength(1);
    expect(savedLog.stepsSnapshot?.[0]?.stepId).toBe('taught-step-0');
    expect(savedLog.stepsSnapshot?.[0]?.durationMin).toBe(planBefore[0]!.durationMin + 1);
    expect(usePilatesStore.getState().activeSteps).toEqual(planBefore);
  });

  it('restores a valid saved sessionStorage draft selection over taughtStepIds and falls back cleanly when saved draft has no valid movement', () => {
    const emptyTimerContext: TeachingLogContext = {
      actualDurationSec: 0,
      actualRestDurationSec: 0,
      stepsSnapshot: structuredClone(BASE_STEPS),
      sequenceTitle: '초안 복원 검증 수업',
      taughtStepIds: [],
    };

    // 1. Open with taughtStepIds: [], manually check coreEx & write reflection -> persists valid draft
    const firstClose = vi.fn();
    const firstRender = render(
      <LogSessionModal
        sequenceId={SEQUENCE_ID}
        onClose={firstClose}
        context={emptyTimerContext}
      />,
    );
    let dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    expect(dialog.getByRole('checkbox', { name: coreEx.nameKo })).not.toBeChecked();

    fireEvent.click(dialog.getByRole('checkbox', { name: coreEx.nameKo }));
    fireEvent.change(dialog.getByLabelText('다음 수업을 위한 메모 (선택)'), {
      target: { value: '수동 선택한 코어 동작 초안 복원' },
    });
    expect(window.sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();

    fireEvent.click(dialog.getByRole('button', { name: '취소' }));
    expect(firstClose).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    // Reopen with taughtStepIds: [] -> valid saved draft selection ('taught-step-1') wins over empty taughtStepIds
    const secondClose = vi.fn();
    const secondRender = render(
      <LogSessionModal
        sequenceId={SEQUENCE_ID}
        onClose={secondClose}
        context={emptyTimerContext}
      />,
    );
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    expect(screen.getByTestId('log-session-draft-restored')).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: warmupEx.nameKo })).not.toBeChecked();
    expect(dialog.getByRole('checkbox', { name: coreEx.nameKo })).toBeChecked();
    expect(dialog.getByLabelText('다음 수업을 위한 메모 (선택)')).toHaveValue(
      '수동 선택한 코어 동작 초안 복원',
    );

    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(secondClose).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().historyLogs[0]?.exerciseIds).toEqual([coreEx.id]);
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    secondRender.unmount();

    // 2. Seed invalid/rest-only draft in sessionStorage -> falls back cleanly to taughtStepIds: [] (0 checked)
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        selectedStepIds: ['taught-step-rest', 'deleted-step-id'],
        reflection: '휴식만 남은 무효 선택 초안',
      }),
    );
    const thirdRender = render(
      <LogSessionModal
        sequenceId={SEQUENCE_ID}
        onClose={vi.fn()}
        context={emptyTimerContext}
      />,
    );
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    for (const box of dialog.getAllByRole('checkbox')) {
      expect(box).not.toBeChecked();
    }
    thirdRender.unmount();

    // And when taughtStepIds is undefined, invalid/rest-only draft falls back cleanly to full snapshot selection
    render(<LogSessionModal sequenceId={SEQUENCE_ID} onClose={vi.fn()} />);
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    for (const box of dialog.getAllByRole('checkbox')) {
      expect(box).toBeChecked();
    }
  });
});
