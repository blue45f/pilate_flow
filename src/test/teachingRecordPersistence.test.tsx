import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveStageView } from '../components/LiveStageView';
import { LogSessionModal, type TeachingLogContext } from '../components/LogSessionModal';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const productionIds = new Set(production.map((exercise) => exercise.id));
const exercises = [
  syntheticPlanningExercise('mat', 'warmup'),
  syntheticPlanningExercise('mat', 'cooldown'),
];
const title = 'V7 합성 기록 보존 검사 · 실제 수업 아님';
let sequenceId = 'v7-synthetic-record-draft';
const steps: SequenceStep[] = [
  {
    stepId: 'v7-opening',
    order: 1,
    exerciseId: exercises[0].id,
    blockCategory: 'warmup',
    durationMin: 2,
    selectedLayer: 'standard',
    locked: true,
  },
  {
    kind: 'rest',
    stepId: 'v7-break',
    order: 2,
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 5,
    selectedLayer: 'standard',
  },
  {
    stepId: 'v7-closing',
    order: 3,
    exerciseId: exercises[1].id,
    blockCategory: 'cooldown',
    durationMin: 3,
    selectedLayer: 'standard',
  },
];
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  targetMinutes: 10,
  restMinutes: 5,
  excludeDaysWindow: 0,
  defaultLayer: 'standard',
  targetGroupId: INITIAL_CLASS_GROUPS[0].id,
  planningGoals: ['strength'],
};
const context: TeachingLogContext = {
  actualDurationSec: 23,
  actualRestDurationSec: 3,
  sequenceTitle: title,
  stepsSnapshot: steps,
  taughtStepIds: steps.map((step) => step.stepId),
};

function Journey() {
  const [log, setLog] = useState<{
    id: string;
    context?: TeachingLogContext;
  } | null>(null);
  return (
    <>
      <LiveStageView onOpenLogModal={(id, next) => setLog({ id, context: next })} />
      <LogSessionModal
        sequenceId={log?.id ?? null}
        context={log?.context}
        onClose={() => setLog(null)}
      />
    </>
  );
}

const jump = (seconds: number) =>
  act(() => {
    vi.setSystemTime(Date.now() + seconds * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
const form = () => within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
const submit = () => fireEvent.click(form().getByRole('button', { name: '수업 기록 저장' }));
const renderLog = (onClose = vi.fn()) => {
  render(<LogSessionModal sequenceId={sequenceId} context={context} onClose={onClose} />);
  return onClose;
};

describe('teaching record persistence and retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        activeTab: 'stage',
        activeSequenceId: sequenceId,
        activeTitle: title,
        activeSubtitle: '',
        activeSteps: structuredClone(steps),
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 10,
        activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
        exercises: [...INITIAL_EXERCISES, ...exercises],
        classGroups: INITIAL_CLASS_GROUPS,
        historyLogs: [],
        savedSequences: [],
        draftCriteria: structuredClone(criteria),
        lastCriteria: structuredClone(criteria),
        ownedApparatus: ['mat'],
        ownedEquipment: ['mat'],
        ownedProps: [],
        generationError: null,
        saveFeedback: null,
        undoStack: [],
      },
      true,
    );
    sequenceId = usePilatesStore.getState().saveCurrentSequenceToBinder();
  });
  afterEach(() => {
    cleanup();
    expect(INITIAL_EXERCISES).toEqual(production);
    expect(
      usePilatesStore.getState().exercises.filter((exercise) => productionIds.has(exercise.id)),
    ).toEqual(production);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    vi.useRealTimers();
    vi.restoreAllMocks();
    usePilatesStore.setState(original, true);
    localStorage.clear();
  });

  it('records a session rest reaching the original target while keeping original planning conditions', () => {
    const before = usePilatesStore.getState();
    const saved = structuredClone(before.savedSequences);
    render(<Journey />);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jump(10);
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    const rest = within(screen.getByRole('region', { name: '현재 휴식' }));
    fireEvent.click(rest.getByRole('button', { name: '일시정지' }));
    for (let index = 0; index < 5; index += 1)
      fireEvent.click(rest.getByRole('button', { name: '현재 휴식 1분 추가' }));
    expect(rest.getByRole('timer')).toHaveTextContent('10:00');
    fireEvent.click(rest.getByRole('button', { name: '이어서 진행' }));
    jump(5);
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    expect(form().getByRole('checkbox', { name: '휴식 10:00' })).toBeChecked();
    expect(form().getByRole('checkbox', { name: exercises[1].nameKo })).not.toBeChecked();
    submit();
    const after = usePilatesStore.getState();
    expect(after.historyLogs).toHaveLength(1);
    expect(after.historyLogs[0]).toMatchObject({
      actualDurationSec: 15,
      actualRestDurationSec: 5,
      exerciseIds: [exercises[0].id],
      stepsSnapshot: [steps[0], { ...steps[1], durationMin: 10 }],
      criteriaSnapshot: {
        targetMinutes: 10,
        restMinutes: 5,
        planningGoals: ['strength'],
      },
    });
    expect(after.historyLogs[0].criteriaSnapshot?.instructorObservations).toBeUndefined();
    expect(after.activeSteps).toEqual(steps);
    expect(after.savedSequences[0].steps).toEqual(saved[0].steps);
    expect(after.savedSequences[0].criteriaSnapshot).toEqual(saved[0].criteriaSnapshot);
    expect(after.savedSequences[0].taughtCount).toBe(saved[0].taughtCount + 1);
    expect(after.activeTab).toBe('history');
    expect(screen.queryByRole('dialog', { name: '수업 기록 남기기' })).not.toBeInTheDocument();
  });

  it('keeps original rest preparation conditions when only one performed movement is selected', () => {
    renderLog();
    fireEvent.click(form().getByRole('checkbox', { name: '휴식 05:00' }));
    fireEvent.click(form().getByRole('checkbox', { name: exercises[1].nameKo }));
    submit();
    const log = usePilatesStore.getState().historyLogs[0];
    expect(log.stepsSnapshot).toEqual([steps[0]]);
    expect(log.exerciseIds).toEqual([exercises[0].id]);
    expect(log.criteriaSnapshot).toMatchObject({
      targetMinutes: 10,
      restMinutes: 5,
    });
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
  });

  it('retains all form input after actual store rejection and saves exactly once on retry', () => {
    usePilatesStore.setState({
      logClassSession: (payload) =>
        original.logClassSession({
          ...payload,
          criteriaSnapshot: { ...criteria, restMinutes: 10 },
        }),
    });
    const onClose = renderLog();
    fireEvent.change(form().getByRole('combobox', { name: '수업 그룹 *' }), {
      target: { value: INITIAL_CLASS_GROUPS[1].id },
    });
    fireEvent.change(form().getByLabelText('수업 일자 *'), {
      target: { value: '2026-11-03' },
    });
    fireEvent.change(form().getByRole('combobox', { name: '강사가 느낀 강도' }), {
      target: { value: 'relaxed' },
    });
    fireEvent.change(form().getByRole('combobox', { name: '강사의 수업 평가' }), {
      target: { value: '4' },
    });
    fireEvent.change(form().getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' }), {
      target: { value: 'V7 합성 재시도 메모 · 실제 수업 아님' },
    });
    fireEvent.click(form().getByRole('checkbox', { name: exercises[1].nameKo }));
    const saved = structuredClone(usePilatesStore.getState().savedSequences);
    submit();
    expect(onClose).not.toHaveBeenCalled();
    expect(form().getByRole('alert')).toHaveTextContent(/휴식/);
    expect(form().getByRole('button', { name: '수업 기록 저장' })).toBeEnabled();
    expect(form().getByRole('combobox', { name: '수업 그룹 *' })).toHaveValue(
      INITIAL_CLASS_GROUPS[1].id,
    );
    expect(form().getByLabelText('수업 일자 *')).toHaveValue('2026-11-03');
    expect(form().getByRole('combobox', { name: '강사가 느낀 강도' })).toHaveValue('relaxed');
    expect(form().getByRole('combobox', { name: '강사의 수업 평가' })).toHaveValue('4');
    expect(form().getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' })).toHaveValue(
      'V7 합성 재시도 메모 · 실제 수업 아님',
    );
    expect(form().getByRole('spinbutton', { name: '분' })).toHaveValue(0);
    expect(form().getByRole('spinbutton', { name: '초' })).toHaveValue(23);
    expect(form().getByRole('checkbox', { name: exercises[1].nameKo })).not.toBeChecked();
    expect(usePilatesStore.getState().historyLogs).toEqual([]);
    expect(usePilatesStore.getState().savedSequences).toEqual(saved);
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    act(() => usePilatesStore.setState({ logClassSession: original.logClassSession }));
    submit();
    expect(onClose).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    expect(usePilatesStore.getState().generationError).toBeNull();
    expect(usePilatesStore.getState().historyLogs[0]).toMatchObject({
      groupId: INITIAL_CLASS_GROUPS[1].id,
      intensity: 'relaxed',
      rating: 4,
      instructorReflection: 'V7 합성 재시도 메모 · 실제 수업 아님',
      stepsSnapshot: [steps[0], steps[1]],
    });
  });

  it.each(['different-sequence', 'reused-id'] as const)(
    'does not accept an unrelated or nonunique inserted row: %s',
    (failure) => {
      if (failure === 'reused-id') {
        original.logClassSession({
          sequenceId,
          groupId: INITIAL_CLASS_GROUPS[0].id,
          taughtAt: '2026-11-03T12:00:00.000Z',
          rating: 3,
          intensity: 'moderate',
          instructorReflection: '합성 이전 기록',
        });
      }
      usePilatesStore.setState({
        logClassSession: (payload) => {
          original.logClassSession({
            ...payload,
            sequenceId: failure === 'different-sequence' ? 'other-sequence' : sequenceId,
          });
          if (failure === 'reused-id')
            usePilatesStore.setState((state) => ({
              historyLogs: state.historyLogs.map((log, index) =>
                index === 0 ? { ...log, id: state.historyLogs[1].id } : log,
              ),
            }));
        },
      });
      const onClose = renderLog();
      submit();
      expect(onClose).not.toHaveBeenCalled();
      expect(form().getByRole('alert')).toBeInTheDocument();
      expect(form().getByRole('button', { name: '수업 기록 저장' })).toBeEnabled();
      expect(usePilatesStore.getState().activeTab).toBe('stage');
    },
  );

  it('finds the matching new row independently of ordering and later active sequence identity', () => {
    original.logClassSession({
      sequenceId,
      groupId: INITIAL_CLASS_GROUPS[0].id,
      taughtAt: '2026-11-03T12:00:00.000Z',
      rating: 3,
      intensity: 'moderate',
      instructorReflection: '합성 이전 기록',
    });
    usePilatesStore.setState({
      logClassSession: (payload) => {
        original.logClassSession(payload);
        usePilatesStore.setState((state) => ({
          historyLogs: [...state.historyLogs].reverse(),
        }));
      },
    });
    const onClose = renderLog();
    act(() =>
      usePilatesStore.setState({
        activeSequenceId: 'another-current-draft',
        activeTitle: '별도 현재 초안',
        activeSteps: [],
      }),
    );
    submit();
    expect(onClose).toHaveBeenCalledOnce();
    const after = usePilatesStore.getState();
    expect(after.historyLogs).toHaveLength(2);
    expect(after.historyLogs[1]).toMatchObject({
      sequenceId,
      sequenceTitle: title,
      stepsSnapshot: steps,
      criteriaSnapshot: { targetMinutes: 10, restMinutes: 5 },
    });
    expect(after.activeSequenceId).toBe('another-current-draft');
    expect(after.activeTitle).toBe('별도 현재 초안');
    expect(after.activeSteps).toEqual([]);
  });

  it('allows retry after a throwing save action without discarding entered reflection', () => {
    usePilatesStore.setState({
      logClassSession: () => {
        throw new Error('Synthetic save failure');
      },
    });
    const onClose = renderLog();
    fireEvent.change(form().getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' }), {
      target: { value: '합성 예외 뒤 보존할 메모' },
    });
    submit();
    expect(onClose).not.toHaveBeenCalled();
    expect(form().getByRole('alert')).toHaveTextContent(/저장하지 못했습니다/);
    expect(form().getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' })).toHaveValue(
      '합성 예외 뒤 보존할 메모',
    );
    expect(form().getByRole('button', { name: '수업 기록 저장' })).toBeEnabled();
    act(() => usePilatesStore.setState({ logClassSession: original.logClassSession }));
    submit();
    expect(onClose).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
  });
});
