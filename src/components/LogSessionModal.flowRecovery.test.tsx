import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { ClassGroupProfile, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { LogSessionModal, type TeachingLogContext } from './LogSessionModal';

const originalStore = usePilatesStore.getState();
const catalogSnapshot = structuredClone(INITIAL_EXERCISES);

const warmupEx = syntheticPlanningExercise('mat', 'warmup', 'alpha');
const coreEx = syntheticPlanningExercise('mat', 'core', 'beta');

const SYNTH_GROUPS: ClassGroupProfile[] = [
  {
    id: 'synth-log-group-a',
    name: '합성 오전 그룹',
    type: 'group',
    defaultLevel: '1.0',
    scheduleLabel: '월·수 10:00',
    notes: '',
  },
  {
    id: 'synth-log-group-b',
    name: '합성 저녁 그룹',
    type: 'group',
    defaultLevel: '1.5',
    scheduleLabel: '화·목 19:00',
    notes: '',
  },
];

const SEQUENCE_ID = 'synth-flow-recovery-seq';
const DRAFT_KEY = `pf_log_session_draft_v1:${SEQUENCE_ID}`;

const PLAN_STEPS: SequenceStep[] = [
  {
    stepId: 'flow-step-warmup',
    order: 1,
    exerciseId: warmupEx.id,
    blockCategory: 'warmup',
    durationMin: 3,
    explanationSec: 20,
    transitionSec: 0,
    selectedLayer: 'standard',
  },
  {
    stepId: 'flow-step-rest',
    order: 2,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 1,
    selectedLayer: 'standard',
  },
  {
    stepId: 'flow-step-core',
    order: 3,
    exerciseId: coreEx.id,
    blockCategory: 'core',
    durationMin: 4,
    explanationSec: 20,
    transitionSec: 15,
    selectedLayer: 'standard',
  },
];

describe('LogSessionModal draft recovery & performed movement selection invariants', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T10:00:00.000Z'));
    window.localStorage.clear();
    window.sessionStorage.clear();

    usePilatesStore.setState(
      {
        ...originalStore,
        activeTab: 'workbench',
        activeSequenceId: SEQUENCE_ID,
        activeTitle: '합성 매트 기록 시퀀스',
        activeSubtitle: '',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 8,
        activeTargetGroupId: SYNTH_GROUPS[0]!.id,
        activeSteps: structuredClone(PLAN_STEPS),
        exercises: [...INITIAL_EXERCISES, warmupEx, coreEx],
        classGroups: structuredClone(SYNTH_GROUPS),
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
    expect(INITIAL_EXERCISES).toEqual(catalogSnapshot);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    usePilatesStore.setState(originalStore, true);
  });

  it('distinguishes an explicitly cleared empty selection ([]) from an omitted selectedStepIds field across reopen and taughtStepIds=[]', () => {
    expect(warmupEx.id).not.toBe(coreEx.id);
    expect(isExerciseAutoEligible(warmupEx)).toBe(true);
    expect(isExerciseAutoEligible(coreEx)).toBe(true);

    const firstClose = vi.fn();
    const firstView = render(<LogSessionModal sequenceId={SEQUENCE_ID} onClose={firstClose} />);
    let dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));

    // Open step details, clear all planned items explicitly, and edit group/date/time/reflection
    fireEvent.click(dialog.getByText(/실제로 진행한 동작 확인/));
    fireEvent.click(dialog.getByRole('button', { name: '전체 해제' }));

    for (const checkbox of dialog.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }

    fireEvent.change(dialog.getByLabelText('수업 그룹 *'), {
      target: { value: SYNTH_GROUPS[1]!.id },
    });
    fireEvent.change(dialog.getByLabelText('수업 일자 *'), {
      target: { value: '2026-11-08' },
    });
    fireEvent.change(dialog.getByRole('spinbutton', { name: '분' }), {
      target: { value: '7' },
    });
    fireEvent.change(dialog.getByRole('spinbutton', { name: '초' }), {
      target: { value: '30' },
    });
    fireEvent.change(dialog.getByLabelText('다음 수업을 위한 메모 (선택)'), {
      target: { value: '합성 회고 메모 · 전체 해제 상태 보존 확인' },
    });

    const savedDraft = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY)!);
    expect(savedDraft.selectedStepIds).toEqual([]);

    fireEvent.click(dialog.getByRole('button', { name: '취소' }));
    expect(firstClose).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    firstView.unmount();

    // 1) Reopen without context -> explicit [] must stay 0 selected (NOT revert to full selection!)
    // and step details auto-expands so the user can immediately recover.
    const secondView = render(<LogSessionModal sequenceId={SEQUENCE_ID} onClose={vi.fn()} />);
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));

    expect(screen.getByTestId('log-session-draft-restored')).toBeInTheDocument();
    const stepDetails = dialog.getByText(/실제로 진행한 동작 확인/).closest('details')!;
    expect(stepDetails).toHaveAttribute('open');
    expect(stepDetails).toHaveTextContent('실제로 진행한 동작 확인 · 0 / 2개');
    for (const checkbox of dialog.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
    expect(dialog.getByLabelText('수업 그룹 *')).toHaveValue(SYNTH_GROUPS[1]!.id);
    expect(dialog.getByLabelText('수업 일자 *')).toHaveValue('2026-11-08');
    expect(dialog.getByRole('spinbutton', { name: '분' })).toHaveValue(7);
    expect(dialog.getByRole('spinbutton', { name: '초' })).toHaveValue(30);
    expect(dialog.getByLabelText('다음 수업을 위한 메모 (선택)')).toHaveValue(
      '합성 회고 메모 · 전체 해제 상태 보존 확인',
    );
    secondView.unmount();

    // 2) Omitted selectedStepIds (unspecified) vs context.taughtStepIds = [] vs undefined
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        reflection: '동작 선택 필드가 생략된 초안',
      }),
    );

    const emptyTaughtContext: TeachingLogContext = {
      stepsSnapshot: structuredClone(PLAN_STEPS),
      taughtStepIds: [],
    };
    const thirdView = render(
      <LogSessionModal
        sequenceId={SEQUENCE_ID}
        onClose={vi.fn()}
        context={emptyTaughtContext}
      />,
    );
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    for (const checkbox of dialog.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }
    thirdView.unmount();

    // When both selectedStepIds AND context.taughtStepIds are omitted, defaults to full plan
    render(<LogSessionModal sequenceId={SEQUENCE_ID} onClose={vi.fn()} />);
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    for (const checkbox of dialog.getAllByRole('checkbox')) {
      expect(checkbox).toBeChecked();
    }
  });

  it('preserves empty/partial selection across step round-trips, focuses offending controls on validation errors without auto-selecting, and recovers cleanly', () => {
    const onClose = vi.fn();
    render(
      <LogSessionModal
        sequenceId={SEQUENCE_ID}
        onClose={onClose}
        context={{
          actualRestDurationSec: 60,
          stepsSnapshot: structuredClone(PLAN_STEPS),
          taughtStepIds: [],
        }}
      />,
    );

    const dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));

    // Mutate live store while modal is open -> modal's open-time snapshot must stay immutable
    act(() => {
      usePilatesStore.setState({
        activeTitle: '나중에 바뀐 시퀀스 제목',
        activeSteps: [],
      });
    });

    // Step round-trip (1 -> 2 -> 3 -> 1) must NOT auto-select any movement
    fireEvent.click(dialog.getByRole('button', { name: '2 진행 동작 점검' }));
    fireEvent.click(dialog.getByRole('button', { name: '3 강도·피드백 메모' }));
    fireEvent.click(dialog.getByRole('button', { name: '1 그룹·시간 확인' }));
    for (const checkbox of dialog.getAllByRole('checkbox')) {
      expect(checkbox).not.toBeChecked();
    }

    // Collapse step details manually, then submit with 0 movements -> opens Step 2 & focuses first movement checkbox without auto-checking
    fireEvent.click(dialog.getByText(/실제로 진행한 동작 확인/));
    const stepDetails = dialog.getByText(/실제로 진행한 동작 확인/).closest('details')!;
    expect(stepDetails).not.toHaveAttribute('open');

    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    act(() => {
      vi.advanceTimersByTime(32);
    });

    expect(dialog.getByRole('alert')).toHaveTextContent(
      '실제로 진행한 동작을 하나 이상 선택해 주세요.',
    );
    expect(stepDetails).toHaveAttribute('open');
    const warmupCheckbox = dialog.getByRole('checkbox', { name: warmupEx.nameKo });
    expect(warmupCheckbox).toHaveFocus();
    expect(warmupCheckbox).not.toBeChecked();

    // Enter invalid total duration shorter than measured rest (0m 30s < 60s rest) -> focuses minutes spinbutton
    fireEvent.change(dialog.getByRole('spinbutton', { name: '분' }), {
      target: { value: '0' },
    });
    fireEvent.change(dialog.getByRole('spinbutton', { name: '초' }), {
      target: { value: '30' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    act(() => {
      vi.advanceTimersByTime(32);
    });

    expect(dialog.getByRole('alert')).toHaveTextContent(
      '전체 진행 시간은 타이머에 기록된 휴식 시간보다 짧을 수 없습니다.',
    );
    expect(dialog.getByRole('spinbutton', { name: '분' })).toHaveFocus();
    expect(dialog.getByRole('spinbutton', { name: '분' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );

    // Fix duration and use explicit 1-click '계획 항목 전체 선택' (uses open-time snapshot, not empty live store!)
    fireEvent.change(dialog.getByRole('spinbutton', { name: '분' }), {
      target: { value: '8' },
    });
    expect(dialog.getByRole('spinbutton', { name: '분' })).not.toHaveAttribute('aria-invalid');

    fireEvent.click(dialog.getByRole('button', { name: '계획 항목 전체 선택' }));
    expect(stepDetails).toHaveTextContent('실제로 진행한 동작 확인 · 2 / 2개');
    for (const checkbox of dialog.getAllByRole('checkbox')) {
      expect(checkbox).toBeChecked();
    }

    // Explicit save succeeds once and clears draft; duplicate identical submission is blocked
    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    expect(usePilatesStore.getState().historyLogs[0]?.sequenceTitle).toBe('합성 매트 기록 시퀀스');
    expect(usePilatesStore.getState().historyLogs[0]?.stepsSnapshot).toHaveLength(3);
    expect(window.sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('filters unknown step IDs from saved drafts while blocking duplicate completion logs', () => {
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        selectedStepIds: ['flow-step-core', 'removed-step-999'],
        taughtDate: '2026-11-09',
        minutes: '6',
        seconds: '0',
        rating: 4,
        intensity: 'moderate',
        reflection: '유효 ID만 복원된 수업 기록',
      }),
    );

    const firstClose = vi.fn();
    const firstRender = render(
      <LogSessionModal sequenceId={SEQUENCE_ID} onClose={firstClose} />,
    );
    let dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));

    expect(dialog.getByRole('checkbox', { name: warmupEx.nameKo })).not.toBeChecked();
    expect(dialog.getByRole('checkbox', { name: '휴식 01:00' })).not.toBeChecked();
    expect(dialog.getByRole('checkbox', { name: coreEx.nameKo })).toBeChecked();

    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));
    expect(firstClose).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    expect(usePilatesStore.getState().historyLogs[0]?.exerciseIds).toEqual([coreEx.id]);
    firstRender.unmount();

    // Attempt to save the exact same completion log again -> duplicate guard blocks second insert
    window.sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        selectedStepIds: ['flow-step-core'],
        taughtDate: '2026-11-09',
        minutes: '6',
        seconds: '0',
        rating: 4,
        intensity: 'moderate',
        reflection: '유효 ID만 복원된 수업 기록',
      }),
    );

    const secondClose = vi.fn();
    render(<LogSessionModal sequenceId={SEQUENCE_ID} onClose={secondClose} />);
    dialog = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    fireEvent.click(dialog.getByRole('button', { name: '수업 기록 저장' }));

    expect(secondClose).not.toHaveBeenCalled();
    expect(dialog.getByRole('alert')).toHaveTextContent(
      '이미 동일한 수업 완료 이력이 기록되어 있습니다.',
    );
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
  });
});
