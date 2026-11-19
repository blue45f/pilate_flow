import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LiveStageView } from './LiveStageView';
import { usePilatesStore as store } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import * as accountStorage from '../lib/accountStorage';
import {
  teachingDraftFingerprint,
  teachingRecoveryKey,
  writeTeachingRecovery,
} from '../utils/teachingSessionRecovery';

const initial = store.getState();
const exercise = syntheticPlanningExercise('mat', 'warmup', 'alpha', false);
const steps = [
  {
    stepId: 'shared-step',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: 'warmup' as const,
    durationMin: 1,
    selectedLayer: 'standard' as const,
  },
];
let owner: string | null = 'synthetic-a';
const context = (label: string) => ({
  draftSequenceId: 'shared-id',
  classId: 'synthetic-class',
  originalDate: '2026-11-15',
  date: '2026-11-15',
  startTime: '10:00',
  endTime: '10:50',
  locationId: label,
  locationAlias: label,
  classTitle: `${label} 회차`,
});
const synth = Object.assign(new EventTarget(), {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: () => [
    { voiceURI: 'local-ko', name: 'local', lang: 'ko-KR', localService: true, default: true },
  ],
});
class FakeUtterance {
  constructor(public text: string) {}
}
const wake = vi.fn(async () => ({ release: vi.fn(async () => {}), addEventListener: vi.fn() }));
// Mirrors App's store subscription and owner-key boundary. Tests real LiveStage state/effects,
// not the authentication provider UI or real device speech engine.
function OwnerBoundary({ keyed = true }: { keyed?: boolean }) {
  const state = store();
  return state.activeTab === 'stage' ? (
    <LiveStageView
      key={keyed ? (accountStorage.getActiveWorkspaceOwner() ?? 'guest') : 'unkeyed'}
      onOpenLogModal={() => {}}
    />
  ) : null;
}
const header = () => document.querySelector('.teaching-stage-header')!;
const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
beforeEach(() => {
  sessionStorage.clear();
  owner = 'synthetic-a';
  vi.spyOn(accountStorage, 'getActiveWorkspaceOwner').mockImplementation(() => owner);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
  synth.speak.mockClear();
  synth.cancel.mockClear();
  wake.mockClear();
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: wake } });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  store.setState(
    {
      ...initial,
      activeTab: 'stage',
      activeSequenceId: 'shared-id',
      activeTitle: 'A private title',
      activeSteps: structuredClone(steps),
      activeScheduleContext: context('A private venue'),
      exercises: [exercise],
      historyLogs: [],
      savedSequences: [],
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
});
async function startA() {
  fireEvent.click(screen.getByRole('button', { name: '음성 안내 켜기' }));
  await act(async () => fireEvent.click(screen.getAllByRole('button', { name: '수업 시작' })[0]));
  tick(3000);
  expect(synth.speak).toHaveBeenCalled();
  expect(header()).toHaveTextContent('타이머 진행 00:03');
}
function switchB() {
  // accountStorage's real switch sets tabOwner before a synchronous full store commit.
  owner = 'synthetic-b';
  act(() =>
    store.setState({
      activeTab: 'stage',
      activeTitle: 'B fresh title',
      activeScheduleContext: context('B fresh venue'),
      activeSteps: structuredClone(steps),
    }),
  );
}
it('documents the unkeyed baseline: same-tab account switch retains the old captured session', async () => {
  render(<OwnerBoundary keyed={false} />);
  await startA();
  switchB();
  expect(header()).toHaveTextContent('A private title');
  expect(header()).toHaveTextContent('타이머 진행 00:03');
});
it('owner remount removes A title/venue/clock/voice and restores only B recovery explicitly paused', async () => {
  const bContext = context('B fresh venue');
  const bKey = teachingRecoveryKey('synthetic-b', 'shared-id');
  expect(
    writeTeachingRecovery(bKey, {
      version: 1,
      fingerprint: teachingDraftFingerprint('shared-id', 'B fresh title', steps, bContext),
      savedAt: Date.now(),
      steps: structuredClone(steps),
      clock: { index: 0, remainingMs: 51000, elapsedMs: 9000, elapsedByStep: { 0: 9000 } },
    }),
  ).toBe(true);
  render(<OwnerBoundary />);
  await startA();
  const aKey = teachingRecoveryKey('synthetic-a', 'shared-id');
  const aSnapshot = sessionStorage.getItem(aKey);
  expect(aSnapshot).not.toBeNull();
  synth.speak.mockClear();
  synth.cancel.mockClear();
  wake.mockClear();
  switchB();
  expect(document.body).not.toHaveTextContent('A private title');
  expect(document.body).not.toHaveTextContent('A private venue');
  expect(header()).toHaveTextContent('B fresh title');
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  expect(screen.getByRole('region', { name: '수업 장소와 일정' })).toHaveTextContent(
    'B fresh venue',
  );
  expect(synth.cancel).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '음성 안내 켜기' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  expect(screen.getByRole('region', { name: '중단된 수업 복구' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '중단 지점 복구' }));
  expect(header()).toHaveTextContent('타이머 진행 00:09');
  expect(screen.getByRole('timer')).toHaveTextContent('00:51');
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('일시정지');
  tick(5000);
  expect(header()).toHaveTextContent('타이머 진행 00:09');
  expect(synth.speak).not.toHaveBeenCalled();
  expect(wake).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(aKey)).toBe(aSnapshot);
  expect(store.getState().historyLogs).toEqual([]);
});
