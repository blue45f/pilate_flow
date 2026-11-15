import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePilatesStore as store } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from './planningFixtures';
import { DatedSequencePlanningDialog } from '../components/DatedSequencePlanningDialog';
import { InstructorScheduleView } from '../components/InstructorScheduleView';
import { LiveStageView } from '../components/LiveStageView';
import { getSequenceDurations } from '../utils/sequenceEngine';
import { getDatedPlanWarnings } from '../utils/datedSequencePlanning';
import type { SequenceStep } from '../types/pilates';
import type { InstructorScheduleData } from '../types/instructorSchedule';

const initial = store.getState();
const exercise = syntheticPlanningExercise('reformer', 'warmup', 'alpha', false);
const schedule: InstructorScheduleData = {
  locations: [
    {
      id: 'qa-venue-a',
      alias: '가상 A 리포머룸',
      equipmentIds: ['reformer'],
      propIds: [],
      notes: '합성 QA, 실제 장소 아님',
    },
    {
      id: 'qa-venue-b',
      alias: '가상 B 매트룸',
      equipmentIds: ['mat'],
      propIds: [],
      notes: '합성 QA, 실제 장소 아님',
    },
  ],
  classes: [
    {
      id: 'qa-class-a',
      title: '합성 A 60분',
      participantAlias: '',
      locationId: 'qa-venue-a',
      startDate: '2026-11-16',
      startTime: '10:00',
      endTime: '11:00',
      recurrence: 'once',
      weekdays: [],
      notes: '',
    },
    {
      id: 'qa-class-b',
      title: '합성 B 50분',
      participantAlias: '',
      locationId: 'qa-venue-b',
      startDate: '2026-11-17',
      startTime: '14:00',
      endTime: '14:50',
      recurrence: 'once',
      weekdays: [],
      notes: '',
    },
  ],
  exceptions: [],
};
const steps = [
  {
    stepId: 'qa-motion',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: 'warmup' as const,
    durationMin: 55,
    explanationSec: 0,
    transitionSec: 0,
    selectedLayer: 'standard' as const,
  },
  {
    stepId: 'qa-rest',
    kind: 'rest' as const,
    order: 2,
    exerciseId: '',
    blockCategory: 'cooldown' as const,
    durationMin: 5,
    selectedLayer: 'standard' as const,
  },
];
function seedAndCopy() {
  store.setState(
    {
      ...initial,
      exercises: [exercise],
      ownedApparatus: ['reformer', 'mat'],
      ownedEquipment: ['reformer', 'mat'],
      ownedProps: [],
      savedSequences: [],
      historyLogs: [],
      classGroups: [],
      conditionTemplates: [],
      instructorSchedule: structuredClone(schedule),
      datedSequencePlanning: undefined,
      activeTab: 'schedule',
      activeSequenceId: 'qa-original',
      activeTitle: '합성 원본 60분 (55+5)',
      activeSubtitle: '실제 운동이나 처방이 아닌 합성 QA',
      activeApparatus: 'reformer',
      activeLevel: '1.0',
      activeTargetMinutes: 60,
      activeTargetGroupId: '',
      activeSteps: structuredClone(steps),
      lastCriteria: null,
      draftCriteria: null,
      undoStack: [],
      persistenceError: null,
    },
    true,
  );
  const sourceId = store.getState().saveCurrentSequenceToBinder()!;
  const original = structuredClone(store.getState().savedSequences.find((s) => s.id === sourceId)!);
  expect(
    store.getState().assignSequenceToOccurrence({
      sequenceId: sourceId,
      classId: 'qa-class-a',
      originalDate: '2026-11-16',
      state: 'prepared',
    }).success,
  ).toBe(true);
  const copyId = store.getState().duplicateSavedSequence(sourceId)!;
  expect(copyId).not.toBe(sourceId);
  expect(
    store.getState().assignSequenceToOccurrence({
      sequenceId: copyId,
      classId: 'qa-class-b',
      originalDate: '2026-11-17',
      state: 'draft',
    }).success,
  ).toBe(true);
  return { sourceId, copyId, original };
}
function Planner() {
  const s = store();
  return (
    <DatedSequencePlanningDialog
      initialDate="2026-11-17"
      initialOccurrence={{ classId: 'qa-class-b', originalDate: '2026-11-17' }}
      onClose={() => {}}
      schedule={s.instructorSchedule}
      savedSequences={s.savedSequences}
      exercises={s.exercises}
      planning={s.datedSequencePlanning}
      onAssign={s.assignSequenceToOccurrence}
      onSetState={s.setDatedSequencePlanState}
      onPreviewWeekCopy={s.previewDatedSequencePlanWeekCopy}
      onCopyWeek={s.copyDatedSequencePlanWeek}
      onLoadDraft={s.loadDatedSequencePlanAsDraft}
      onReplaceSnapshot={s.replaceDatedSequencePlanSnapshot}
    />
  );
}
const bAssignment = () =>
  store.getState().datedSequencePlanning!.assignments.find((a) => a.classId === 'qa-class-b')!;
const warnings = () =>
  getDatedPlanWarnings({
    assignment: bAssignment(),
    schedule: store.getState().instructorSchedule,
    exercises: store.getState().exercises,
  });
const header = () => document.querySelector('.teaching-stage-header')!;
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('QA external network forbidden'))),
  );
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  store.setState(initial, true);
  localStorage.clear();
  sessionStorage.clear();
});

it('bridges saved original -> cross-venue copy -> dated snapshot -> draft -> local recovery without changing original/date/total', async () => {
  const { sourceId, original } = seedAndCopy();
  const a = structuredClone(
    store.getState().datedSequencePlanning!.assignments.find((x) => x.classId === 'qa-class-a')!,
  );
  const b = structuredClone(bAssignment());
  expect(
    getSequenceDurations(JSON.parse(JSON.stringify(b.sequenceSnapshot.steps)) as SequenceStep[]),
  ).toEqual({
    totalSec: 3600,
    exerciseSec: 3300,
    restSec: 300,
  });
  expect(warnings().join(' ')).toMatch(/리포머/);
  expect(warnings().join(' ')).toMatch(/10분 초과/);
  const view = render(<Planner />);
  const detail = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
  expect(detail.getByText(/장소 준비물 부족: 리포머/)).toBeVisible();
  fireEvent.click(detail.getByRole('button', { name: '작업 사본으로 편집' }));
  const confirmation = within(screen.getByRole('group', { name: '작업 사본 열기 확인' }));
  expect(
    confirmation.getByText(
      /수업 진행 화면에 이 회차의 날짜·장소와 기구·시간 확인 사항을 표시합니다/,
    ),
  ).toBeVisible();
  expect(confirmation.getByText(/리포머/)).toBeVisible();
  fireEvent.click(confirmation.getByRole('button', { name: '새 작업 사본 열기 확인' }));
  view.unmount();
  const loaded = store.getState();
  expect(loaded.activeSequenceId).toMatch(/^draft-dated-/);
  expect(loaded.activeSteps).toEqual(b.sequenceSnapshot.steps);
  expect(loaded.activeSteps).not.toBe(b.sequenceSnapshot.steps);
  expect(getSequenceDurations(loaded.activeSteps)).toEqual({
    totalSec: 3600,
    exerciseSec: 3300,
    restSec: 300,
  });
  expect(loaded.savedSequences.find((x) => x.id === sourceId)).toEqual(original);
  expect(loaded.datedSequencePlanning!.assignments.find((x) => x.classId === 'qa-class-a')).toEqual(
    a,
  );
  expect(bAssignment()).toEqual(b);
  expect(loaded.historyLogs).toEqual([]);
  const savedCopy = structuredClone(loaded.savedSequences);
  const draftBefore = { id: loaded.activeSequenceId, steps: structuredClone(loaded.activeSteps) };
  await act(async () => {
    await store.persist.rehydrate();
  });
  expect(store.getState().savedSequences).toEqual(savedCopy);
  expect(store.getState().activeSequenceId).toBe(draftBefore.id);
  expect(store.getState().activeSteps).toEqual(draftBefore.steps);
  expect(bAssignment()).toEqual(b);
  expect(store.getState().activeScheduleContext).toMatchObject({
    locationId: 'qa-venue-b',
    date: '2026-11-17',
    draftSequenceId: store.getState().activeSequenceId,
  });
  expect(warnings().join(' ')).toMatch(/리포머/);
}, 30000);

it('keeps an in-memory running teaching snapshot separate from a reopened draft and persists no teaching clock', () => {
  const { sourceId, original } = seedAndCopy();
  const b = bAssignment();
  expect(store.getState().loadDatedSequencePlanAsDraft(b.id, b.updatedAt).success).toBe(true);
  vi.useFakeTimers({
    toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  });
  vi.setSystemTime(new Date('2026-11-17T05:00:00Z'));
  const view = render(<LiveStageView onOpenLogModal={() => {}} />);
  expect(header()).toHaveTextContent('계획 60분');
  expect(header()).toHaveTextContent('계획 운동 55:00 · 휴식 05:00');
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('진행 대기');
  fireEvent.click(screen.getAllByRole('button', { name: '수업 시작' })[0]);
  act(() => vi.advanceTimersByTime(2200));
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('LIVE 진행 중');
  expect(header()).toHaveTextContent('타이머 진행 00:02');
  const runningTitle = header().querySelector('h1')!.textContent;
  // Deliberate direct store call checks component snapshot isolation; not a claim that UI permits this navigation.
  act(() => {
    const a = store
      .getState()
      .datedSequencePlanning!.assignments.find((x) => x.classId === 'qa-class-a')!;
    expect(store.getState().loadDatedSequencePlanAsDraft(a.id, a.updatedAt).success).toBe(true);
  });
  expect(header().querySelector('h1')!.textContent).toBe(runningTitle);
  expect(header()).toHaveTextContent('계획 운동 55:00 · 휴식 05:00');
  act(() => vi.advanceTimersByTime(1000));
  expect(header()).toHaveTextContent('타이머 진행 00:03');
  expect(store.getState().savedSequences.find((x) => x.id === sourceId)).toEqual(original);
  expect(store.getState().historyLogs).toEqual([]);
  const persisted = JSON.parse(localStorage.getItem(store.persist.getOptions().name!)!);
  expect(persisted.state).not.toHaveProperty('clock');
  expect(persisted.state).not.toHaveProperty('elapsedMs');
  view.unmount();
  render(<LiveStageView onOpenLogModal={() => {}} />);
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('진행 대기');
  expect(header()).toHaveTextContent('계획 운동 55:00 · 휴식 05:00');
  expect(document.querySelector('.teaching-stage')).toHaveTextContent('가상 A 리포머룸');
}, 30000);

it('rejects a stale venue/date binding without altering the currently open draft or either saved sequence', () => {
  seedAndCopy();
  const b = bAssignment();
  const before = structuredClone({
    steps: store.getState().activeSteps,
    id: store.getState().activeSequenceId,
    plans: store.getState().savedSequences,
    dated: store.getState().datedSequencePlanning,
  });
  const changed = structuredClone(store.getState().instructorSchedule);
  changed.classes.find((x) => x.id === 'qa-class-b')!.locationId = 'qa-venue-a';
  store.setState({ instructorSchedule: changed });
  expect(store.getState().loadDatedSequencePlanAsDraft(b.id, b.updatedAt).success).toBe(false);
  expect(store.getState().activeSteps).toEqual(before.steps);
  expect(store.getState().activeSequenceId).toBe(before.id);
  expect(store.getState().savedSequences).toEqual(before.plans);
  expect(store.getState().datedSequencePlanning).toEqual(before.dated);
});

it('keeps venue, date and current equipment/time warnings visible after Start now without blocking or starting the timer', () => {
  seedAndCopy();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-17T05:00:00Z'));
  function ScheduleToStage() {
    const tab = store((s) => s.activeTab);
    return tab === 'stage' ? (
      <LiveStageView onOpenLogModal={() => {}} />
    ) : (
      <InstructorScheduleView />
    );
  }
  render(<ScheduleToStage />);
  expect(screen.getAllByText(/장소 준비물 부족: 리포머/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/10분 초과/).length).toBeGreaterThan(0);
  const start = screen.getByRole('button', { name: '바로 수업 시작' });
  expect(start).toBeEnabled();
  fireEvent.click(start);
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('진행 대기');
  expect(header()).toHaveTextContent('계획 60분');
  expect(header()).toHaveTextContent('타이머 진행 00:00');
  expect(header()).toHaveTextContent('계획 운동 55:00 · 휴식 05:00');
  expect(screen.getByText(/장소 준비물 부족/)).toBeVisible();
  expect(
    screen.queryByText(/수업 진행 화면에 이 회차의 날짜·장소와 기구·시간 확인 사항을 표시합니다/),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/가상 B 매트룸/)).toBeVisible();
  expect(screen.getByRole('region', { name: '수업 장소와 일정' })).toHaveTextContent(
    '2026-11-17 · 14:00–14:50',
  );
  expect(screen.getByRole('region', { name: '수업 장소와 일정' })).toHaveTextContent('10분 초과');
  expect(store.getState().saveFeedback).toMatch(/확인 사항 2개/);
}, 30000);

it('retains context when saving the same work copy, clears it for a different plan, and restores it with undo', () => {
  const { sourceId } = seedAndCopy();
  const b = bAssignment();
  store.getState().loadDatedSequencePlanAsDraft(b.id, b.updatedAt);
  const savedId = store.getState().saveCurrentSequenceToBinder();
  expect(store.getState().activeScheduleContext?.draftSequenceId).toBe(savedId);
  const context = structuredClone(store.getState().activeScheduleContext);
  store.getState().loadSequenceIntoWorkbench(sourceId);
  expect(store.getState().activeScheduleContext).toBeUndefined();
  store.getState().undoSequence();
  expect(store.getState().activeScheduleContext).toEqual(context);
  store.getState().startBlankSequence();
  expect(store.getState().activeScheduleContext).toBeUndefined();
});

it('recalculates unresolved duration warnings from edited draft steps without mutating either saved plan', () => {
  seedAndCopy();
  const b = bAssignment();
  store.getState().loadDatedSequencePlanAsDraft(b.id, b.updatedAt);
  const before = structuredClone(store.getState().savedSequences);
  store.setState({
    activeSteps: store
      .getState()
      .activeSteps.map((s, i) => (i === 0 ? { ...s, durationMin: 45 } : s)),
  });
  render(<LiveStageView onOpenLogModal={() => {}} />);
  expect(screen.getByRole('region', { name: '수업 장소와 일정' })).toHaveTextContent(
    '가상 B 매트룸',
  );
  expect(screen.getByRole('region', { name: '수업 장소와 일정' })).not.toHaveTextContent(
    '10분 초과',
  );
  expect(screen.getByRole('region', { name: '수업 장소와 일정' })).toHaveTextContent(
    '장소 준비물 부족: 리포머',
  );
  expect(header()).toHaveTextContent('계획 50분');
  expect(store.getState().savedSequences).toEqual(before);
  expect(bAssignment().sequenceSnapshot.steps[0].durationMin).toBe(55);
});

it('ignores invalid or other-draft persisted venue context while retaining valid old workspace data', () => {
  seedAndCopy();
  const current = store.getState();
  const merge = store.persist.getOptions().merge!;
  const snapshot = store.persist.getOptions().partialize!(current) as Record<string, unknown>;
  const malformed = merge(
    {
      ...snapshot,
      activeScheduleContext: { draftSequenceId: current.activeSequenceId, date: 'not-a-date' },
    },
    current,
  );
  expect(malformed.activeScheduleContext).toBeUndefined();
  expect(malformed.activeSteps).toEqual(current.activeSteps);
  const old = merge(snapshot, current);
  expect(old.savedSequences).toEqual(current.savedSequences);
  expect(old.activeScheduleContext).toBeUndefined();
  const b = bAssignment();
  current.loadDatedSequencePlanAsDraft(b.id, b.updatedAt);
  const s = store.getState();
  const wrong = merge(
    {
      ...(store.persist.getOptions().partialize!(s) as Record<string, unknown>),
      activeSequenceId: 'different-draft',
    },
    s,
  );
  expect(wrong.activeScheduleContext).toBeUndefined();
});

it('does not silently relabel an already-open draft when its source schedule moves to another venue', () => {
  seedAndCopy();
  const b = bAssignment();
  store.getState().loadDatedSequencePlanAsDraft(b.id, b.updatedAt);
  const moved = structuredClone(store.getState().instructorSchedule);
  moved.classes.find((x) => x.id === 'qa-class-b')!.locationId = 'qa-venue-a';
  store.setState({ instructorSchedule: moved });
  render(<LiveStageView onOpenLogModal={() => {}} />);
  const context = screen.getByRole('region', { name: '수업 장소와 일정' });
  expect(context).toHaveTextContent('가상 B 매트룸');
  expect(context).toHaveTextContent('가져온 뒤 날짜·시간·장소가 변경');
  expect(context).toHaveTextContent('장소 준비물 부족: 리포머');
  expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('진행 대기');
});
