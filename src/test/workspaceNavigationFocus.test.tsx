import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';
import type { SequenceStep } from '../types/pilates';

const scheduleModule = vi.hoisted(() => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { ready, release };
});
vi.mock('../components/InstructorScheduleView', async () => {
  // Keep the actual React.lazy import unresolved across all navigation frames.
  await scheduleModule.ready;
  return {
    InstructorScheduleView: () => (
      <section aria-label="강사 일정">
        <h1 id="workspace-main-heading" tabIndex={-1}>
          강사 일정
        </h1>
      </section>
    ),
  };
});

const original = usePilatesStore.getState();
const catalogBefore = structuredClone(INITIAL_EXERCISES);
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha');
const sequenceId = 'qa-v12-lazy-focus';
const steps: SequenceStep[] = [
  {
    stepId: 'qa-v12-lazy-exercise',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: 'core',
    durationMin: 10,
    selectedLayer: 'standard',
    locked: true,
  },
  {
    stepId: 'qa-v12-lazy-rest',
    order: 2,
    exerciseId: '',
    kind: 'rest',
    blockCategory: 'core',
    durationMin: 1,
    selectedLayer: 'standard',
    locked: true,
  },
];
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-11-05T08:00:00Z'));
  frames.clear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id)),
  );
  localStorage.clear();
  usePilatesStore.setState({
    ...original,
    activeTab: 'stage',
    activeSequenceId: sequenceId,
    activeTitle: 'V12 합성 지연 화면 포커스 검사 · 실제 수업 아님',
    activeSubtitle: '',
    activeApparatus: 'mat',
    activeLevel: '1.0',
    activeTargetMinutes: 11,
    activeTargetGroupId: 'qa-v12-lazy-group',
    activeSteps: structuredClone(steps),
    exercises: [...INITIAL_EXERCISES, exercise],
    savedSequences: [],
    historyLogs: [],
    undoStack: [],
    classGroups: [
      {
        id: 'qa-v12-lazy-group',
        name: '합성 포커스 검사 반',
        type: 'group',
        defaultLevel: '1.0',
        scheduleLabel: '',
        notes: '',
      },
    ],
    instructorSchedule: { locations: [], classes: [], exceptions: [] },
    draftCriteria: {
      apparatus: 'mat',
      level: '1.0',
      focusPreset: 'full-body',
      availableEquipment: ['mat'],
      preferredProps: [],
      excludeDaysWindow: 0,
      targetGroupId: 'qa-v12-lazy-group',
      targetMinutes: 11,
      restMinutes: 1,
      defaultLayer: 'standard',
    },
    lastCriteria: null,
    ownedEquipment: ['mat'],
    ownedApparatus: ['mat'],
    ownedProps: [],
    generationError: null,
    persistenceError: null,
    saveFeedback: null,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  frames.clear();
  expect(INITIAL_EXERCISES).toEqual(catalogBefore);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  usePilatesStore.setState(original, true);
  localStorage.clear();
});
function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
}
function jump(seconds: number) {
  act(() => {
    vi.setSystemTime(Date.now() + seconds * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
function clickSchedule() {
  const button = within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', {
    name: '강사 일정',
  });
  // fireEvent does not perform the browser's normal clicked-button focus.
  button.focus();
  fireEvent.click(button);
}

describe('workspace heading focus follows committed lazy navigation', () => {
  it('focuses first-loaded Schedule after a pending Stage record navigation, without replaying or editing the class', async () => {
    render(<App />);
    await screen.findByRole('timer');
    flushFrames();
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    jump(2);
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    jump(2);
    const before = usePilatesStore.getState();
    clickSchedule();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).getByRole('button', {
        name: '종료 내용 검토',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' })).getByRole('button', {
        name: '검토하고 기록하기',
      }),
    );
    const form = await screen.findByRole('dialog', { name: '수업 기록 남기기' });
    fireEvent.change(within(form).getByLabelText('다음 수업을 위한 메모 (선택)'), {
      target: { value: 'V12 합성 포커스 검사 · 실제 수업 아님' },
    });
    fireEvent.click(within(form).getByRole('button', { name: '수업 기록 저장' }));
    await screen.findByText('작업 공간을 열고 있어요…');
    // The native failure's timing: every early navigation frame runs while the
    // first Schedule module is still missing. No priming or timeout can fix it.
    flushFrames();
    expect(screen.queryByRole('heading', { name: '강사 일정' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().activeTab).toBe('schedule');
    await act(async () => {
      scheduleModule.release();
      await scheduleModule.ready;
    });
    const heading = await screen.findByRole('heading', { name: '강사 일정' });
    flushFrames();
    expect(document.activeElement === heading).toBe(true);
    const after = usePilatesStore.getState();
    expect(after.historyLogs).toHaveLength(1);
    expect(after.historyLogs[0]).toMatchObject({
      sequenceId,
      actualDurationSec: 4,
      actualRestDurationSec: 2,
      instructorReflection: 'V12 합성 포커스 검사 · 실제 수업 아님',
    });
    expect(
      after.historyLogs[0].stepsSnapshot?.reduce((sum, step) => sum + step.durationMin * 60, 0),
    ).toBe(660);
    expect(after.activeSteps).toBe(before.activeSteps);
    // Recording maps Binder usage metadata even when this fixture has no saved
    // Binder rows; preserve plan contents rather than requiring array identity.
    expect(after.savedSequences).toStrictEqual(before.savedSequences);
    expect(screen.queryByRole('dialog', { name: '수업 기록 남기기' })).not.toBeInTheDocument();
  });

  it('cancels a departed tab frame and ignores even a delivered stale callback', async () => {
    render(<App />);
    await screen.findByRole('timer');
    flushFrames();
    clickSchedule();
    await screen.findByRole('heading', { name: '강사 일정' });
    const stale = [...frames.values()];
    const canceled = vi.mocked(cancelAnimationFrame);
    fireEvent.click(screen.getByRole('link', { name: 'Flow Atelier 계획으로' }));
    const heading = document.getElementById('workspace-main-heading');
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    act(() => stale.forEach((callback) => callback(0)));
    expect(focus).not.toHaveBeenCalled();
    expect(canceled).toHaveBeenCalled();
    flushFrames();
    expect(document.activeElement === heading).toBe(true);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
  });

  it('still focuses the heading when the instructor explicitly chooses the current tab', async () => {
    render(<App />);
    await screen.findByRole('timer');
    flushFrames();
    clickSchedule();
    const heading = await screen.findByRole('heading', { name: '강사 일정' });
    flushFrames();
    const focus = vi.spyOn(heading, 'focus');
    clickSchedule();
    flushFrames();
    expect(document.activeElement === heading).toBe(true);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
  });
});
