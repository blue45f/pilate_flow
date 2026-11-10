import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SavedSequence, SequenceStep } from '../types/pilates';
import { formatScheduleDate } from '../utils/instructorSchedule';
import { InstructorScheduleView } from './InstructorScheduleView';

const originalState = usePilatesStore.getState();
const frozenProductionCatalog = structuredClone(INITIAL_EXERCISES);

const syntheticWarmup = syntheticPlanningExercise('reformer', 'warmup', 'alpha');
const syntheticCore = syntheticPlanningExercise('reformer', 'core', 'alpha');
const syntheticCooldown = syntheticPlanningExercise('reformer', 'cooldown', 'alpha');

const validSteps: SequenceStep[] = [
  {
    stepId: 'qa-prep-step-1',
    order: 1,
    blockCategory: 'warmup',
    exerciseId: syntheticWarmup.id,
    durationMin: 15,
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: 15,
  },
  {
    stepId: 'qa-prep-step-2',
    order: 2,
    blockCategory: 'core',
    exerciseId: syntheticCore.id,
    durationMin: 20,
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: 15,
  },
  {
    stepId: 'qa-prep-step-3',
    order: 3,
    blockCategory: 'cooldown',
    exerciseId: syntheticCooldown.id,
    durationMin: 15,
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: 0,
  },
];

const validSavedSequence: SavedSequence = {
  id: 'qa-prep-reformer-50',
  title: '합성 QA 리포머 50분 시퀀스',
  subtitle: '합성 검증용 · 실제 수업 자료 아님',
  apparatus: 'reformer',
  level: '1.0',
  focusTags: ['합성 QA'],
  targetMinutes: 50,
  steps: validSteps,
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  taughtCount: 0,
};

const brokenSavedSequence: SavedSequence = {
  ...validSavedSequence,
  id: 'qa-prep-missing-exercise-seq',
  title: '합성 QA 동작 누락 시퀀스',
  steps: [
    {
      stepId: 'qa-missing-step-1',
      order: 1,
      blockCategory: 'core',
      exerciseId: 'non-existent-exercise-id',
      durationMin: 50,
      selectedLayer: 'standard',
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...originalState,
      activeTab: 'schedule',
      activeSequenceId: 'qa-active-prior-draft',
      activeTitle: '보존해야 할 기존 작업대 초안',
      activeSubtitle: '실행 취소 복구 확인용',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      activeSteps: [],
      undoStack: [],
      exercises: [
        ...INITIAL_EXERCISES,
        syntheticWarmup,
        syntheticCore,
        syntheticCooldown,
      ],
      savedSequences: [
        structuredClone(validSavedSequence),
        structuredClone(brokenSavedSequence),
      ],
      instructorSchedule: {
        locations: [
          {
            id: 'qa-reformer-room',
            alias: '합성 QA 리포머 룸',
            equipmentIds: ['reformer', 'mat'],
            propIds: [],
            notes: '',
          },
        ],
        classes: [
          {
            id: 'qa-wed-ready',
            title: '수요 오전 리포머반',
            participantAlias: '소그룹 A',
            locationId: 'qa-reformer-room',
            startDate: '2026-11-04',
            startTime: '09:00',
            endTime: '09:50',
            recurrence: 'once',
            weekdays: [],
            notes: '',
          },
          {
            id: 'qa-wed-unplanned',
            title: '수요 점심 미지정반',
            participantAlias: '개인 레슨',
            locationId: 'qa-reformer-room',
            startDate: '2026-11-04',
            startTime: '11:00',
            endTime: '11:50',
            recurrence: 'once',
            weekdays: [],
            notes: '',
          },
          {
            id: 'qa-wed-draft',
            title: '수요 오후 사본반',
            participantAlias: '소그룹 B',
            locationId: 'qa-reformer-room',
            startDate: '2026-11-04',
            startTime: '14:00',
            endTime: '14:50',
            recurrence: 'once',
            weekdays: [],
            notes: '',
          },
          {
            id: 'qa-fri-linked',
            title: '금요 연결 시퀀스반',
            participantAlias: '듀엣반',
            locationId: 'qa-reformer-room',
            startDate: '2026-11-06',
            startTime: '10:00',
            endTime: '10:50',
            recurrence: 'once',
            weekdays: [],
            linkSavedSequenceId: validSavedSequence.id,
            notes: '',
          },
        ],
        exceptions: [],
      },
      datedSequencePlanning: undefined,
      generationError: null,
      saveFeedback: null,
    },
    true,
  );

  const store = usePilatesStore.getState();
  const readyAssigned = store.assignSequenceToOccurrence({
    sequenceId: validSavedSequence.id,
    classId: 'qa-wed-ready',
    originalDate: '2026-11-04',
  });
  expect(readyAssigned.success).toBe(true);
  const readyAssignment = usePilatesStore
    .getState()
    .datedSequencePlanning!.assignments.find(
      (item) => item.classId === 'qa-wed-ready',
    )!;
  expect(
    usePilatesStore
      .getState()
      .setDatedSequencePlanState(
        readyAssignment.id,
        'prepared',
        readyAssignment.updatedAt,
      ).success,
  ).toBe(true);

  const draftAssigned = usePilatesStore.getState().assignSequenceToOccurrence({
    sequenceId: validSavedSequence.id,
    classId: 'qa-wed-draft',
    originalDate: '2026-11-04',
  });
  expect(draftAssigned.success).toBe(true);
});

afterEach(() => {
  cleanup();
  expect(INITIAL_EXERCISES).toEqual(frozenProductionCatalog);
  usePilatesStore.setState(originalState, true);
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('InstructorScheduleView date -> class preparation & start flow', () => {
  it('jumps from an empty day to the next scheduled class day in the week with focus handoff and zero store mutation', () => {
    const beforeSchedule = structuredClone(
      usePilatesStore.getState().instructorSchedule,
    );
    const beforePlanning = structuredClone(
      usePilatesStore.getState().datedSequencePlanning,
    );

    render(<InstructorScheduleView today="2026-11-03" />);

    expect(screen.getByText('등록한 수업이 없습니다.')).toBeVisible();
    const jumpBtn = screen.getByTestId('schedule-jump-scheduled-day');
    expect(jumpBtn).toHaveTextContent(
      `이번 주 수업 있는 날 보기 · ${formatScheduleDate('2026-11-04')} (3회)`,
    );

    fireEvent.click(jumpBtn);

    const dayHeading = screen.getByRole('heading', {
      level: 2,
      name: formatScheduleDate('2026-11-04'),
    });
    expect(dayHeading).toHaveFocus();
    expect(
      screen.getByRole('article', { name: /수요 오전 리포머반/ }),
    ).toBeVisible();
    expect(usePilatesStore.getState().instructorSchedule).toEqual(beforeSchedule);
    expect(usePilatesStore.getState().datedSequencePlanning).toEqual(
      beforePlanning,
    );
  });

  it('summarizes readiness counts, supports keyboard roving filter, and jumps focus to the next unready class while respecting prefers-reduced-motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollSpy,
    });

    render(<InstructorScheduleView today="2026-11-04" />);

    // Preserves week strip aria-label contract while surfacing day readiness state
    const wedStripBtn = screen.getByRole('button', {
      name: `${formatScheduleDate('2026-11-04')} 예정 3회`,
    });
    expect(wedStripBtn).toHaveAttribute('data-prep-day-state', 'needs-prep');
    const friStripBtn = screen.getByRole('button', {
      name: `${formatScheduleDate('2026-11-06')} 예정 1회`,
    });
    expect(friStripBtn).toHaveAttribute('data-prep-day-state', 'ready');

    const prepBar = screen.getByTestId('schedule-prep-bar');
    expect(prepBar).toHaveTextContent('준비 완료 1회 · 준비 필요 2회');

    // Jump to earliest class needing prep (11:00 unplanned class)
    fireEvent.click(screen.getByTestId('schedule-jump-next-prep'));
    const unplannedCard = screen.getByRole('article', {
      name: /수요 점심 미지정반/,
    });
    expect(unplannedCard).toHaveAttribute('data-prep-highlighted', 'true');
    expect(
      within(unplannedCard).getByRole('button', { name: '날짜별 계획' }),
    ).toHaveFocus();
    expect(scrollSpy).toHaveBeenCalledWith({
      behavior: 'instant',
      block: 'nearest',
    });

    // Keyboard roving navigation on prep filter group
    const filterGroup = screen.getByRole('group', {
      name: '수업 준비 상태 필터',
    });
    const allBtn = within(filterGroup).getByRole('button', {
      name: '전체 예정 (3)',
    });
    const needsPrepBtn = within(filterGroup).getByRole('button', {
      name: '준비 필요 (2)',
    });

    allBtn.focus();
    fireEvent.keyDown(allBtn, { key: 'ArrowRight' });
    expect(needsPrepBtn).toHaveFocus();
    expect(needsPrepBtn).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('article', { name: /수요 오전 리포머반/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: /수요 점심 미지정반/ }),
    ).toBeVisible();
    expect(
      screen.getByRole('article', { name: /수요 오후 사본반/ }),
    ).toBeVisible();

    // Switching to Friday resets filter to "all"; filtering on an all-ready day shows clear status
    fireEvent.click(friStripBtn);
    expect(
      screen.getByRole('article', { name: /금요 연결 시퀀스반/ }),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole('button', { name: '준비 필요 (0)' }),
    );
    const filteredEmpty = screen.getByTestId('schedule-day-filtered-empty');
    expect(filteredEmpty).toHaveTextContent(
      '이 날짜의 예정 수업 1회는 모두 준비 완료 상태입니다.',
    );
    expect(
      screen.queryByText('등록한 수업이 없습니다.'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(filteredEmpty).getByRole('button', { name: '전체 수업 보기' }),
    );
    expect(
      screen.getByRole('article', { name: /금요 연결 시퀀스반/ }),
    ).toBeVisible();
  });

  it('toggles occurrence ready state in 1 tap and opens an independent workbench copy without touching saved sequences or history', () => {
    const savedBefore = structuredClone(
      usePilatesStore.getState().savedSequences,
    );
    const historyBefore = structuredClone(
      usePilatesStore.getState().historyLogs,
    );
    const wedReadyBefore = structuredClone(
      usePilatesStore
        .getState()
        .datedSequencePlanning!.assignments.find(
          (item) => item.classId === 'qa-wed-ready',
        )!,
    );

    render(<InstructorScheduleView today="2026-11-04" />);

    const draftCard = screen.getByRole('article', { name: /수요 오후 사본반/ });
    expect(within(draftCard).getByText('사본 준비 전')).toBeVisible();

    // 1-tap toggle draft -> prepared
    fireEvent.click(
      within(draftCard).getByRole('button', { name: '준비 완료 표시' }),
    );
    expect(within(draftCard).getByText('준비 완료')).toBeVisible();
    expect(
      within(draftCard).getByText(
        `날짜별 계획: ${validSavedSequence.title} · 준비 표시`,
      ),
    ).toBeVisible();

    // 1-tap toggle prepared -> draft
    fireEvent.click(
      within(draftCard).getByRole('button', { name: '준비 표시 해제' }),
    );
    expect(within(draftCard).getByText('사본 준비 전')).toBeVisible();

    // Other occurrence remained untouched
    expect(
      usePilatesStore
        .getState()
        .datedSequencePlanning!.assignments.find(
          (item) => item.classId === 'qa-wed-ready',
        ),
    ).toEqual(wedReadyBefore);

    // 1-tap open occurrence snapshot into Workbench as an independent draft
    const planningBeforeOpen = structuredClone(
      usePilatesStore.getState().datedSequencePlanning,
    );
    fireEvent.click(
      within(draftCard).getByRole('button', { name: '회차 사본으로 준비' }),
    );

    const after = usePilatesStore.getState();
    expect(after.activeTab).toBe('workbench');
    expect(after.activeSequenceId).toMatch(/^draft-dated-/);
    expect(after.activeTitle).toBe(validSavedSequence.title);
    expect(after.undoStack.at(-1)?.activeTitle).toBe(
      '보존해야 할 기존 작업대 초안',
    );
    expect(after.savedSequences).toEqual(savedBefore);
    expect(after.historyLogs).toEqual(historyBefore);
    expect(after.datedSequencePlanning).toEqual(planningBeforeOpen);
  });

  it('starts LiveStage directly only when the sequence passes rehearsal eligibility and guards moved or broken plans', () => {
    const state = usePilatesStore.getState();
    usePilatesStore.setState({
      instructorSchedule: {
        ...state.instructorSchedule,
        classes: [
          ...state.instructorSchedule.classes,
          {
            id: 'qa-fri-broken',
            title: '금요 동작 누락반',
            participantAlias: '',
            locationId: 'qa-reformer-room',
            startDate: '2026-11-06',
            startTime: '13:00',
            endTime: '13:50',
            recurrence: 'once',
            weekdays: [],
            linkSavedSequenceId: brokenSavedSequence.id,
            notes: '',
          },
        ],
        exceptions: [
          {
            id: 'qa-move-wed-draft',
            kind: 'reschedule',
            classId: 'qa-wed-draft',
            originalDate: '2026-11-04',
            date: '2026-11-06',
            startTime: '16:00',
            endTime: '16:50',
            locationId: 'qa-reformer-room',
            reason: '회차 시간 변경',
          },
        ],
      },
    });

    render(<InstructorScheduleView today="2026-11-06" />);

    // 1) Valid linked sequence offers 1-tap Stage start
    const validLinkedCard = screen.getByRole('article', {
      name: /금요 연결 시퀀스반/,
    });
    const startBtn = within(validLinkedCard).getByRole('button', {
      name: '바로 수업 시작',
    });
    expect(startBtn).toBeVisible();

    // 2) Broken sequence with missing exercise withholds Stage start
    const brokenCard = screen.getByRole('article', {
      name: /금요 동작 누락반/,
    });
    expect(
      within(brokenCard).queryByRole('button', { name: '바로 수업 시작' }),
    ).not.toBeInTheDocument();

    // 3) Moved dated occurrence with stale context withholds direct draft/stage and guides to 날짜별 계획
    const movedCard = screen.getByRole('article', {
      name: /수요 오후 사본반/,
    });
    expect(within(movedCard).getByText('점검 필요')).toBeVisible();
    expect(
      within(movedCard).queryByRole('button', { name: '회차 사본으로 준비' }),
    ).not.toBeInTheDocument();
    expect(
      within(movedCard).queryByRole('button', { name: '바로 수업 시작' }),
    ).not.toBeInTheDocument();
    expect(
      within(movedCard).getByRole('button', { name: '날짜별 계획' }),
    ).toHaveClass('btn-primary');

    // Trigger valid Stage start and verify tab transition + loaded sequence
    fireEvent.click(startBtn);
    const after = usePilatesStore.getState();
    expect(after.activeTab).toBe('stage');
    expect(after.activeSequenceId).toBe(validSavedSequence.id);
    expect(after.activeSteps).toHaveLength(validSteps.length);
  });

  it('enforces >=44x44px touch targets, focus-visible rings, mobile breakpoints, and prefers-reduced-motion in CSS', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/components/InstructorScheduleView.css'),
      'utf8',
    );
    expect(css).toContain('min-height: 44px;');
    expect(css).toContain('min-width: 44px;');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (max-width: 420px)');
    expect(css).toContain('.schedule-prep-bar');
    expect(css).toContain('.schedule-prep-zone');
    expect(css).toContain('.schedule-prep-actions');
  });
});
