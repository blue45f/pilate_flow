import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveStageView } from '../components/LiveStageView';
import { LogSessionModal, type TeachingLogContext } from '../components/LogSessionModal';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { getSequenceDurations } from '../utils/sequenceEngine';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const productionIds = new Set(production.map((exercise) => exercise.id));
const exercises = [
  syntheticPlanningExercise('mat', 'warmup'),
  syntheticPlanningExercise('mat', 'core'),
];
const steps: SequenceStep[] = [
  {
    stepId: 'qa-rest-opening',
    order: 1,
    exerciseId: exercises[0].id,
    blockCategory: exercises[0].blockCategory,
    durationMin: 2,
    selectedLayer: 'standard',
  },
  {
    kind: 'rest',
    stepId: 'qa-rest-break',
    order: 2,
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 5,
    selectedLayer: 'standard',
    instructorNote: '합성 QA 휴식 메모 · 실제 수업용 아님',
    locked: true,
  },
  {
    stepId: 'qa-rest-closing',
    order: 3,
    exerciseId: exercises[1].id,
    blockCategory: exercises[1].blockCategory,
    durationMin: 3,
    selectedLayer: 'easy',
  },
];
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 0,
  targetMinutes: 10,
  restMinutes: 5,
  targetGroupId: INITIAL_CLASS_GROUPS[0].id,
  defaultLayer: 'standard',
};

/** Actual Stage-to-log handoff without application navigation or mocked callbacks. */
function RestTeachingJourney() {
  const [log, setLog] = useState<{ id: string; context?: TeachingLogContext } | null>(null);
  return (
    <>
      <LiveStageView onOpenLogModal={(id, context) => setLog({ id, context })} />
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
const endAndOpenLog = () => {
  fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
  fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
  return within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
};

describe('rest teaching and actual history journeys', { timeout: 60000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T12:00:00Z'));
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        exercises: [...INITIAL_EXERCISES, ...exercises],
        activeSequenceId: 'qa-rest-teaching-draft',
        activeTitle: '합성 QA 휴식 포함 수업 · 실제 수업용 아님',
        activeSubtitle: '',
        activeSteps: structuredClone(steps),
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 10,
        activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
        classGroups: INITIAL_CLASS_GROUPS,
        historyLogs: [],
        savedSequences: [],
        draftCriteria: criteria,
        lastCriteria: criteria,
        ownedApparatus: ['mat'],
        ownedEquipment: ['mat'],
        ownedProps: [],
        undoStack: [],
      },
      true,
    );
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

  it('pauses measured rest, skips only its unspent time and records a session-only extension without changing the plan', () => {
    const plan = structuredClone(usePilatesStore.getState().activeSteps);
    render(<RestTeachingJourney />);
    expect(getSequenceDurations(plan)).toEqual({ totalSec: 600, exerciseSec: 300, restSec: 300 });
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jump(10);
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    const rest = within(screen.getByRole('region', { name: '현재 휴식' }));
    expect(rest.getByRole('timer')).toHaveTextContent('05:00');
    expect(rest.queryByText('지금 전할 큐')).not.toBeInTheDocument();
    expect(rest.queryByText(exercises[0].cues[0])).not.toBeInTheDocument();
    expect(rest.queryByText(exercises[0].springs)).not.toBeInTheDocument();
    expect(rest.queryByText(/한쪽|수행 ·|설명 \d|전환 \d/)).not.toBeInTheDocument();
    jump(7);
    fireEvent.click(rest.getByRole('button', { name: '일시정지' }));
    jump(90);
    expect(rest.getByRole('timer')).toHaveTextContent('04:53');
    fireEvent.click(rest.getByRole('button', { name: '현재 휴식 1분 추가' }));
    expect(rest.getByRole('timer')).toHaveTextContent('05:53');
    expect(usePilatesStore.getState().activeSteps).toEqual(plan);
    fireEvent.click(rest.getByRole('button', { name: '휴식 건너뛰기' }));
    expect(screen.getByRole('timer')).toHaveTextContent('03:00');
    expect(screen.getByRole('button', { name: '이어서 진행' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이어서 진행' }));
    jump(8);
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    const confirmation = within(screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' }));
    expect(confirmation.getByText('00:25')).toBeInTheDocument();
    jump(100);
    expect(confirmation.getByText('00:25')).toBeInTheDocument();
    fireEvent.click(confirmation.getByRole('button', { name: '계속 확인하기' }));
    expect(screen.getByRole('button', { name: '이어서 진행' })).toBeInTheDocument();
    const form = endAndOpenLog();
    expect(form.getByText(/타이머에서 진행된 휴식 00:07/)).toBeInTheDocument();
    expect(form.getByRole('checkbox', { name: '휴식 06:00' })).toBeChecked();
    expect(form.getByRole('spinbutton', { name: '분' })).toHaveValue(0);
    expect(form.getByRole('spinbutton', { name: '초' })).toHaveValue(25);
    fireEvent.click(form.getByRole('button', { name: '수업 기록 저장' }));
    const logged = usePilatesStore.getState().historyLogs[0];
    expect(logged.actualDurationSec).toBe(25);
    expect(logged.actualRestDurationSec).toBe(7);
    expect(logged.exerciseIds).toEqual(exercises.map((exercise) => exercise.id));
    expect(logged.exerciseIds).not.toContain('');
    expect(logged.stepsSnapshot?.find((step) => step.kind === 'rest')).toEqual({
      ...steps[1],
      durationMin: 6,
    });
    expect(usePilatesStore.getState().activeSteps).toEqual(plan);
    const backup = usePilatesStore.getState().exportBackup();
    act(() => usePilatesStore.setState({ historyLogs: [] }));
    act(() => expect(usePilatesStore.getState().restoreBackup(backup).success).toBe(true));
    expect(usePilatesStore.getState().historyLogs).toContainEqual(logged);
    expect(usePilatesStore.getState().activeSteps).toEqual(plan);
  });

  it('automatically crosses a full rest, then rejects a manually shortened total below the measured rest', () => {
    render(<RestTeachingJourney />);
    fireEvent.click(screen.getByRole('checkbox', { name: '시간 종료 시 다음 동작' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jump(435);
    expect(screen.getByRole('region', { name: '현재 동작' })).toHaveTextContent(
      exercises[1].nameKo,
    );
    expect(screen.getByRole('timer')).toHaveTextContent('02:45');
    const form = endAndOpenLog();
    expect(form.getByRole('spinbutton', { name: '분' })).toHaveValue(7);
    expect(form.getByRole('spinbutton', { name: '초' })).toHaveValue(15);
    expect(form.getByRole('checkbox', { name: '휴식 05:00' })).toBeChecked();
    fireEvent.change(form.getByRole('spinbutton', { name: '분' }), { target: { value: '4' } });
    fireEvent.change(form.getByRole('spinbutton', { name: '초' }), { target: { value: '59' } });
    fireEvent.click(form.getByRole('button', { name: '수업 기록 저장' }));
    expect(form.getByRole('alert')).toHaveTextContent(/휴식 시간보다 짧을 수 없습니다/);
    expect(usePilatesStore.getState().historyLogs).toEqual([]);
    fireEvent.change(form.getByRole('spinbutton', { name: '분' }), { target: { value: '7' } });
    fireEvent.change(form.getByRole('spinbutton', { name: '초' }), { target: { value: '15' } });
    fireEvent.click(form.getByRole('button', { name: '수업 기록 저장' }));
    expect(usePilatesStore.getState().historyLogs[0]).toMatchObject({
      actualDurationSec: 435,
      actualRestDurationSec: 300,
      exerciseIds: exercises.map((exercise) => exercise.id),
      stepsSnapshot: steps,
    });
  });

  it('stops at the first exercise boundary by default and does not count overshoot as rest', () => {
    const onLog = vi.fn();
    render(<LiveStageView onOpenLogModal={onLog} />);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jump(150);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(screen.getByRole('region', { name: '현재 동작' })).toHaveTextContent(
      exercises[0].nameKo,
    );
    expect(screen.getByRole('button', { name: '현재 동작 다시 시작' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    expect(screen.getByRole('region', { name: '현재 휴식' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('05:00');
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    expect(onLog).toHaveBeenCalledWith(
      'qa-rest-teaching-draft',
      expect.objectContaining({
        actualDurationSec: 120,
        actualRestDurationSec: 0,
        taughtStepIds: [steps[0].stepId],
      }),
    );
  });

  it('ends from a partially completed final rest without adding confirmation time or inventing another movement', () => {
    usePilatesStore.setState({ activeSteps: structuredClone(steps.slice(0, 2)) });
    render(<RestTeachingJourney />);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jump(10);
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    jump(5);
    fireEvent.click(screen.getByRole('button', { name: '휴식 건너뛰기' }));
    const confirmation = within(screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' }));
    expect(confirmation.getByText('00:15')).toBeInTheDocument();
    jump(100);
    expect(confirmation.getByText('00:15')).toBeInTheDocument();
    fireEvent.click(confirmation.getByRole('button', { name: '계속 확인하기' }));
    expect(screen.getByRole('region', { name: '현재 휴식' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('04:55');
    expect(screen.getByRole('button', { name: '이어서 진행' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '휴식 건너뛰기' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    const form = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    expect(form.getByRole('checkbox', { name: '휴식 05:00' })).toBeChecked();
    fireEvent.click(form.getByRole('button', { name: '수업 기록 저장' }));
    expect(usePilatesStore.getState().historyLogs[0]).toMatchObject({
      actualDurationSec: 15,
      actualRestDurationSec: 5,
      exerciseIds: [exercises[0].id],
      stepsSnapshot: steps.slice(0, 2),
    });
  });

  it('does not invent actual rest time for a manual record and cannot save rest as the only taught motion', () => {
    const { unmount } = render(
      <LogSessionModal sequenceId="qa-rest-teaching-draft" onClose={vi.fn()} />,
    );
    let form = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    expect(form.getByRole('spinbutton', { name: '분' })).toHaveValue(null);
    expect(form.queryByText(/타이머에서 진행된 휴식/)).not.toBeInTheDocument();
    fireEvent.click(form.getByText(/실제로 진행한 동작 확인/));
    for (const exercise of exercises)
      fireEvent.click(form.getByRole('checkbox', { name: exercise.nameKo }));
    expect(form.getByRole('checkbox', { name: '휴식 05:00' })).toBeChecked();
    fireEvent.click(form.getByRole('button', { name: '수업 기록 저장' }));
    expect(form.getByRole('alert')).toHaveTextContent(/실제로 진행한 동작을 하나 이상/);
    expect(usePilatesStore.getState().historyLogs).toEqual([]);
    unmount();
    render(<LogSessionModal sequenceId="qa-rest-teaching-draft" onClose={vi.fn()} />);
    form = within(screen.getByRole('dialog', { name: '수업 기록 남기기' }));
    fireEvent.click(form.getByRole('button', { name: '수업 기록 저장' }));
    const logged = usePilatesStore.getState().historyLogs[0];
    expect(logged.actualDurationSec).toBeUndefined();
    expect(logged.actualRestDurationSec).toBeUndefined();
    expect(logged.stepsSnapshot).toEqual(steps);
    expect(logged.exerciseIds).toEqual(exercises.map((exercise) => exercise.id));
  });

  it('keeps rests outside movement review/duplicate counts without allowing an unreviewed movement or a rest-only class', () => {
    usePilatesStore.setState({
      exercises: [...INITIAL_EXERCISES, { ...exercises[0], review: undefined }, exercises[1]],
    });
    const { unmount } = render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('region', { name: '수업 검토 필요' })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    unmount();
    usePilatesStore.setState({ activeSteps: [steps[1]] });
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '진행할 동작이 없어요' })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});
