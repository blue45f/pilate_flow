import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveStageView } from '../components/LiveStageView';
import { LogSessionModal } from '../components/LogSessionModal';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from './planningFixtures';
import type { SequenceStep } from '../types/pilates';

const original = usePilatesStore.getState();
const exercises = [
  syntheticPlanningExercise('mat', 'warmup'),
  syntheticPlanningExercise('mat', 'core'),
];
const steps: SequenceStep[] = exercises.map((exercise, index) => ({
  stepId: `teaching-step-${index}`,
  order: index + 1,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: index + 1,
  selectedLayer: 'standard',
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
  usePilatesStore.setState({
    ...original,
    activeSequenceId: 'teaching-draft',
    activeTitle: '진행 검증 수업',
    activeSteps: steps,
    historyLogs: [],
    exercises: [...INITIAL_EXERCISES, ...exercises],
    classGroups: INITIAL_CLASS_GROUPS,
    activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  usePilatesStore.setState(original);
});

const jumpWallClock = (seconds: number) =>
  act(() => {
    vi.setSystemTime(Date.now() + seconds * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
  });

describe('teaching timer and honest session records', () => {
  it.each(['pending', 'stale'] as const)(
    'permits valid %s material with an advisory and unchanged review records',
    (reviewState) => {
      const blocked =
        reviewState === 'pending'
          ? { ...exercises[0], review: undefined }
          : { ...exercises[0], springs: 'changed after review' };
      usePilatesStore.setState({ exercises: [blocked, exercises[1]] });
      render(<LiveStageView onOpenLogModal={vi.fn()} />);
      expect(screen.getByText(/미검토 계획 자료/)).toBeInTheDocument();
      expect(screen.getByRole('timer')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '수업 시작' })).toBeEnabled();
      expect(usePilatesStore.getState().exercises[0]).toEqual(blocked);
    },
  );
  it('blocks reviewed duplicate movements loaded from an existing class', () => {
    usePilatesStore.setState({
      activeSteps: [steps[0], { ...steps[0], stepId: 'duplicate-step', order: 2 }],
    });
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '중복 동작을 확인해 주세요' })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '수업 시작' })).not.toBeInTheDocument();
    expect(screen.queryByText(exercises[0].cues[0])).not.toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2);
  });
  it('requests screen wake lock only on user start and handles a denied request', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
    const request = vi.fn().mockRejectedValue(new Error('Screen lock unavailable'));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    try {
      render(<LiveStageView onOpenLogModal={vi.fn()} />);
      expect(request).not.toHaveBeenCalled();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
      });
      expect(request).toHaveBeenCalledWith('screen');
      expect(screen.getByText('화면 유지 요청을 사용할 수 없어요')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();
    } finally {
      if (descriptor) Object.defineProperty(navigator, 'wakeLock', descriptor);
      else Reflect.deleteProperty(navigator, 'wakeLock');
    }
  });
  it('uses absolute elapsed time after delayed ticks and excludes pauses', () => {
    const onLog = vi.fn();
    render(<LiveStageView onOpenLogModal={onLog} />);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jumpWallClock(17);
    expect(screen.getByRole('timer')).toHaveTextContent('00:43');
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    jumpWallClock(600);
    fireEvent.click(screen.getByRole('button', { name: '이어서 진행' }));
    jumpWallClock(3);
    expect(screen.getByRole('timer')).toHaveTextContent('00:40');
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    expect(onLog).toHaveBeenCalledWith(
      'teaching-draft',
      expect.objectContaining({ actualDurationSec: 20, taughtStepIds: ['teaching-step-0'] }),
    );
  });

  it('crosses multiple deadlines accurately only when automatic transitions are enabled', () => {
    const onLog = vi.fn();
    render(<LiveStageView onOpenLogModal={onLog} />);
    fireEvent.click(screen.getByLabelText('시간 종료 시 다음 동작'));
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jumpWallClock(150);
    expect(screen.getByRole('timer')).toHaveTextContent('00:30');
    jumpWallClock(300);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    expect(onLog).toHaveBeenCalledWith(
      'teaching-draft',
      expect.objectContaining({
        actualDurationSec: 180,
        taughtStepIds: ['teaching-step-0', 'teaching-step-1'],
      }),
    );
  });

  it('stops at one deadline by default and keeps an added minute in the teaching snapshot only', () => {
    const onLog = vi.fn();
    render(<LiveStageView onOpenLogModal={onLog} />);
    fireEvent.click(screen.getByRole('button', { name: '현재 동작 1분 추가' }));
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jumpWallClock(300);
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    expect(onLog).toHaveBeenCalledWith(
      'teaching-draft',
      expect.objectContaining({
        actualDurationSec: 120,
        stepsSnapshot: [expect.objectContaining({ durationMin: 2 }), expect.anything()],
      }),
    );
  });

  it('records the reviewed snapshot and selected taught movements with no invented reflection', () => {
    const onClose = vi.fn();
    render(
      <LogSessionModal
        sequenceId="teaching-draft"
        onClose={onClose}
        context={{
          actualDurationSec: 83,
          sequenceTitle: '검토한 수업',
          stepsSnapshot: steps,
          taughtStepIds: [steps[1].stepId],
        }}
      />,
    );
    expect(screen.getByLabelText('다음 수업을 위한 메모 (선택)')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: '수업 기록 저장' }));
    const log = usePilatesStore.getState().historyLogs[0];
    expect(log.sequenceTitle).toBe('검토한 수업');
    expect(log.actualDurationSec).toBe(83);
    expect(log.exerciseIds).toEqual([steps[1].exerciseId]);
    expect(log.stepsSnapshot).toEqual([{ ...steps[1], order: 1 }]);
    expect(log.instructorReflection).toBe('별도 메모 없음');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
