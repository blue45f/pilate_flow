import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LiveStageView } from './LiveStageView';
import { usePilatesStore as store } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { teachingRecoveryKey } from '../utils/teachingSessionRecovery';
import * as accountStorage from '../lib/accountStorage';
import { getActiveWorkspaceOwner } from '../lib/accountStorage';

const initial = store.getState();
const e = syntheticPlanningExercise('mat', 'warmup', 'alpha', false);
const steps = [
  {
    stepId: 'recovery-motion',
    order: 1,
    exerciseId: e.id,
    blockCategory: 'warmup' as const,
    durationMin: 1,
    selectedLayer: 'standard' as const,
  },
  {
    stepId: 'recovery-rest',
    order: 2,
    kind: 'rest' as const,
    exerciseId: '',
    blockCategory: 'cooldown' as const,
    durationMin: 1,
    selectedLayer: 'standard' as const,
  },
];
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const key = () => teachingRecoveryKey(getActiveWorkspaceOwner(), 'recovery-qa');
const header = () => document.querySelector('.teaching-stage-header')!;
const wake = vi.fn(async () => ({ release: vi.fn(async () => {}), addEventListener: vi.fn() }));
const speak = vi.fn();
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.useFakeTimers({
    toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
  vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
  wake.mockClear();
  speak.mockClear();
  vi.stubGlobal(
    'speechSynthesis',
    Object.assign(new EventTarget(), { speak, cancel: vi.fn(), getVoices: () => [] }),
  );
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: wake } });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  store.setState(
    {
      ...initial,
      activeTab: 'stage',
      activeSequenceId: 'recovery-qa',
      activeTitle: '합성 중단 복구',
      activeTargetMinutes: 2,
      activeSteps: structuredClone(steps),
      exercises: [e],
      savedSequences: [],
      historyLogs: [],
      activeTargetGroupId: '',
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  store.setState(initial, true);
  sessionStorage.clear();
  localStorage.clear();
});
async function interrupt() {
  const view = render(<LiveStageView onOpenLogModal={() => {}} />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: '수업 시작' })[0]);
  });
  tick(5000);
  fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
  tick(2000);
  act(() => window.dispatchEvent(new Event('pagehide')));
  view.unmount();
  return view;
}
it('reproduces interruption then explicitly restores movement, elapsed/rest paused with no wall-time or automatic voice/wake', async () => {
  await interrupt();
  const saved = sessionStorage.getItem(key());
  expect(saved).not.toBeNull();
  const records = structuredClone(store.getState().historyLogs);
  tick(600000);
  wake.mockClear();
  speak.mockClear();
  render(<LiveStageView onOpenLogModal={() => {}} />);
  expect(screen.getByRole('region', { name: '중단된 수업 복구' })).toBeVisible();
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  fireEvent.click(screen.getByRole('button', { name: '중단 지점 복구' }));
  expect(header()).toHaveTextContent('타이머 진행 00:07');
  expect(header()).toHaveTextContent('타이머 운동 00:05 · 휴식 00:02');
  expect(screen.getByRole('timer')).toHaveTextContent('00:58');
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('일시정지');
  tick(5000);
  expect(header()).toHaveTextContent('타이머 진행 00:07');
  expect(wake).not.toHaveBeenCalled();
  expect(speak).not.toHaveBeenCalled();
  expect(store.getState().historyLogs).toEqual(records);
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: '이어서 진행' })[0]);
  });
  tick(1000);
  expect(header()).toHaveTextContent('타이머 진행 00:08');
});
it('requires an explicit recovery choice and clears only this pending session when discarded', async () => {
  await interrupt();
  render(<LiveStageView onOpenLogModal={() => {}} />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: '수업 시작' })[0]);
  });
  tick(2000);
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  fireEvent.click(screen.getByRole('button', { name: '중단 기록 버리고 새로 시작' }));
  expect(sessionStorage.getItem(key())).toBeNull();
  expect(screen.queryByRole('region', { name: '중단된 수업 복구' })).not.toBeInTheDocument();
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('진행 대기');
});
it('does not offer an old recovery for a changed draft and leaves completed history untouched', async () => {
  await interrupt();
  store.setState({ activeSteps: [{ ...steps[0], durationMin: 2 }, steps[1]] });
  render(<LiveStageView onOpenLogModal={() => {}} />);
  expect(screen.queryByRole('region', { name: '중단된 수업 복구' })).not.toBeInTheDocument();
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  expect(store.getState().historyLogs).toEqual([]);
});
it('explicit exit discards recovery, while cancelling the exit keeps it', async () => {
  render(<LiveStageView onOpenLogModal={() => {}} />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: '수업 시작' })[0]);
  });
  tick(3000);
  fireEvent.click(screen.getByRole('button', { name: '계획으로' }));
  fireEvent.click(screen.getByRole('button', { name: '수업 화면 유지' }));
  expect(sessionStorage.getItem(key())).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '계획으로' }));
  fireEvent.click(screen.getByRole('button', { name: '기록 없이 나가기' }));
  expect(sessionStorage.getItem(key())).toBeNull();
  cleanup();
  expect(sessionStorage.getItem(key())).toBeNull();
});

it('clears recovery only after the requested matching record is appended, not while its form may be cancelled', async () => {
  const openLog = vi.fn();
  render(<LiveStageView onOpenLogModal={openLog} />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: '수업 시작' })[0]);
  });
  tick(3000);
  fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
  fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
  expect(openLog).toHaveBeenCalled();
  expect(sessionStorage.getItem(key())).not.toBeNull();
  const context = openLog.mock.calls[0][1];
  const history = {
    id: 'synthetic-completed',
    sequenceId: 'recovery-qa',
    sequenceTitle: '합성 중단 복구',
    groupId: '',
    groupName: '',
    taughtAt: new Date().toISOString(),
    apparatus: 'mat' as const,
    level: '1.0' as const,
    exerciseIds: [e.id],
    rating: 3 as const,
    intensity: 'moderate' as const,
    instructorReflection: '합성 테스트',
    actualDurationSec: context.actualDurationSec,
    actualRestDurationSec: context.actualRestDurationSec,
    stepsSnapshot: context.stepsSnapshot,
  };
  act(() => store.setState({ historyLogs: [history] }));
  expect(sessionStorage.getItem(key())).toBeNull();
  cleanup();
  expect(sessionStorage.getItem(key())).toBeNull();
  expect(store.getState().historyLogs).toEqual([history]);
});
it('does not write the mounted old account session into a new account or recover it there', async () => {
  let owner: string | null = 'synthetic-a';
  vi.spyOn(accountStorage, 'getActiveWorkspaceOwner').mockImplementation(() => owner);
  const oldKey = teachingRecoveryKey(owner, 'recovery-qa');
  const view = render(<LiveStageView onOpenLogModal={() => {}} />);
  await act(async () => {
    fireEvent.click(screen.getAllByRole('button', { name: '수업 시작' })[0]);
  });
  tick(3000);
  const before = sessionStorage.getItem(oldKey);
  expect(before).not.toBeNull();
  owner = 'synthetic-b';
  act(() => store.setState({ activeTitle: '합성 다른 계정' }));
  tick(3000);
  view.unmount();
  expect(sessionStorage.getItem(oldKey)).toBe(before);
  expect(sessionStorage.getItem(teachingRecoveryKey(owner, 'recovery-qa'))).toBeNull();
  render(<LiveStageView onOpenLogModal={() => {}} />);
  expect(screen.queryByRole('region', { name: '중단된 수업 복구' })).not.toBeInTheDocument();
});

it('keeps a deliberately selected rest step even before the timer has started', () => {
  const view = render(<LiveStageView onOpenLogModal={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
  act(() => window.dispatchEvent(new Event('pagehide')));
  view.unmount();
  render(<LiveStageView onOpenLogModal={() => {}} />);
  expect(screen.getByRole('region', { name: '중단된 수업 복구' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '중단 지점 복구' }));
  expect(screen.getByRole('timer')).toHaveTextContent('01:00');
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  expect(document.querySelector('.teaching-stage')).toHaveTextContent('휴식');
  const recovered = JSON.parse(sessionStorage.getItem(key())!);
  expect(recovered.clock.index).toBe(1);
  expect(recovered.clock.elapsedMs).toBe(0);
  tick(5000);
  expect(screen.getByRole('timer')).toHaveTextContent('01:00');
  expect(wake).not.toHaveBeenCalled();
  expect(speak).not.toHaveBeenCalled();
});

it.each(['종료 / 기록', '계획으로'])(
  'requires a recovery decision before %s can offer a zero-time record or discard the checkpoint',
  async (button) => {
    await interrupt();
    const saved = sessionStorage.getItem(key());
    const openLog = vi.fn();
    render(<LiveStageView onOpenLogModal={openLog} />);
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(screen.queryByRole('button', { name: '검토하고 기록하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '종료 내용 검토' })).not.toBeInTheDocument();
    expect(openLog).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(key())).toBe(saved);
    expect(store.getState().historyLogs).toEqual([]);
    expect(screen.getByText('중단 지점을 복구하거나 새로 시작을 선택해 주세요.')).toHaveAttribute('role', 'status');
  },
);
