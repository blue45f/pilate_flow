import { getVisibleWorkbenchButton, openWorkbenchAutomation, openAdvancedWorkbench } from './workbenchControls';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { MOTION_REFERENCE_COUNTS } from '../data/motionReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';
import { addScheduleDays, localScheduleDate } from '../utils/instructorSchedule';

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const production = JSON.stringify(INITIAL_EXERCISES);
const resize = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  fireEvent(window, new Event('resize'));
};
const props = { onOpenYouTubePreview: vi.fn(), onOpenClipper: vi.fn(), onOpenLogModal: vi.fn() };

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  resize(390);
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      activeSteps: [],
      activeTitle: '보존할 첫 수업',
      activeTargetMinutes: 50,
      exercises: INITIAL_EXERCISES,
      instructorSchedule: createEmptyInstructorSchedule(),
      datedSequencePlanning: undefined,
      historyLogs: [],
      savedSequences: [],
      draftCriteria: null,
      lastCriteria: null,
      generationError: null,
      saveFeedback: null,
      persistenceError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  usePilatesStore.setState(original, true);
  resize(originalWidth);
});

function expectCatalogBoundaries() {
  expect(JSON.stringify(INITIAL_EXERCISES)).toBe(production);
  expect(INITIAL_EXERCISES).toHaveLength(158);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  expect(MOTION_REFERENCE_COUNTS.authoredCatalogMotions).toBe(0);
  expect(MOTION_REFERENCE_COUNTS.expertApprovedMotions).toBe(0);
}

describe('clear next action without changing class-readiness gates', { timeout: 15000 }, () => {
  it('gives the real zero-approved empty draft one movement-selection action and keeps optional calendar/rest context collapsed', () => {
    const before = usePilatesStore.getState();
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const fetch = vi.spyOn(globalThis, 'fetch');
    render(<SequenceWorkbench {...props} />);
    expect(screen.queryByRole('button', { name: '직접 편집' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '자동 구성' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작하기' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('heading', { name: '어떤 수업을 준비할까요?' })).toBeVisible();
    expect(screen.getByRole('button', { name: '동작 추가' })).toBeVisible();
    expect(screen.queryByText(/내 검토 기록 0개/)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '시퀀스 제목' })).not.toBeInTheDocument();
    expect(screen.queryByText('첫 동작을 추가해 주세요')).not.toBeInTheDocument();
    expect(screen.queryByText('50분 부족')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '잠그지 않은 동작 다시 만들기' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '50분에 맞추기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '사본 저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '시퀀스 미리보기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /수업 시작/ })).not.toBeInTheDocument();
    expect(getVisibleWorkbenchButton('2 수업 구성')).toBeDisabled();
    expect(getVisibleWorkbenchButton('3 미리보기')).toBeDisabled();
    const calendar = screen.getByText('일정 확인·추가', { selector: 'summary' });
    expect(calendar.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('다가오는 수업 일정이 없어요')).not.toBeVisible();
    fireEvent.click(calendar);
    expect(screen.getByText('다가오는 수업 일정이 없어요')).toBeVisible();
    expect(screen.getByRole('button', { name: '일정 추가' })).toBeInTheDocument();
    fireEvent.click(calendar);
    const advanced = screen
      .getByText('자동 구성·휴식 먼저 넣기', { selector: 'summary' })
      .closest('details')!;
    expect(advanced).not.toHaveAttribute('open');
    const rest = screen.getByText('휴식 추가', { selector: 'summary span' }).closest('details')!;
    expect(rest).not.toHaveAttribute('open');
    expect(rest).not.toBeVisible();
    expect(usePilatesStore.getState()).toBe(before);
    expect(storage).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expectCatalogBoundaries();
  });

  it('lets an instructor begin with an explicit rest block from the collapsed optional tools', () => {
    const before = usePilatesStore.getState();
    render(<SequenceWorkbench {...props} />);
    const advanced = screen.getByText('자동 구성·휴식 먼저 넣기', { selector: 'summary' });
    expect(advanced.closest('details')).not.toHaveAttribute('open');
    openWorkbenchAutomation();
    const rest = screen.getByText('휴식 추가', { selector: 'summary span' }).closest('details')!;
    fireEvent.click(within(rest).getByText('휴식 추가', { selector: 'summary span' }));
    fireEvent.change(within(rest).getByLabelText('추가할 휴식 시간 · 분'), {
      target: { value: '2.5' },
    });
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(within(rest).getByRole('button', { name: '이 위치에 휴식 넣기' }));

    const after = usePilatesStore.getState();
    expect(after.activeSteps).toHaveLength(1);
    expect(after.activeSteps[0]).toMatchObject({ kind: 'rest', exerciseId: '', durationMin: 2.5 });
    expect(screen.getByRole('article', { name: '1번 휴식' })).toHaveTextContent('02:30');
    expect(after.activeTab).toBe('workbench');
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.activeTargetMinutes).toBe(before.activeTargetMinutes);
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.exercises).toBe(before.exercises);

    fireEvent.click(getVisibleWorkbenchButton('3 미리보기'));
    const preview = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    expect(within(preview).getByRole('button', { name: '수업 시작' })).toBeDisabled();
    expectCatalogBoundaries();
  });

  it('keeps a real upcoming class visible above preparation controls without loading or changing the draft', () => {
    usePilatesStore.setState({
      instructorSchedule: {
        locations: [
          {
            id: 'v11-room',
            alias: '보존할 실제 일정 별칭',
            equipmentIds: ['mat'],
            propIds: [],
            notes: '',
          },
        ],
        classes: [
          {
            id: 'v11-next',
            title: '합성 다음 수업',
            participantAlias: '합성 반',
            locationId: 'v11-room',
            startDate: addScheduleDays(localScheduleDate(), 1),
            startTime: '11:00',
            endTime: '11:50',
            recurrence: 'once',
            weekdays: [],
            notes: '',
          },
        ],
        exceptions: [],
      },
    });
    const before = usePilatesStore.getState();
    render(<SequenceWorkbench {...props} />);
    const banner = screen.getByRole('region', { name: '다음 수업' });
    expect(within(banner).getByRole('heading', { name: '합성 다음 수업' })).toBeVisible();
    expect(banner.closest('details')).toBeNull();
    fireEvent.click(screen.getByText('추가 도구 · 휴식·기구 안내·AI', { selector: 'summary' }));
    fireEvent.click(screen.getByText('수업 준비 순서', { selector: 'summary' }));
    const preparation = screen.getByRole('navigation', { name: '수업 준비 순서' });
    expect(
      banner.compareDocumentPosition(preparation) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText('일정 확인·추가', { selector: 'summary' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(within(banner).getByRole('button', { name: /합성 다음 수업 일정 보기/ }));
    expect(usePilatesStore.getState().activeTab).toBe('schedule');
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().activeTitle).toBe(before.activeTitle);
    expect(usePilatesStore.getState().activeTargetMinutes).toBe(before.activeTargetMinutes);
    expectCatalogBoundaries();
  });

  it('opens and focuses the inline desktop picker while preserving the draft and applying its chosen conditions', () => {
    resize(1440);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    const before = usePilatesStore.getState();
    render(<SequenceWorkbench {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '동작 추가' }));
    expect(
      screen.getByRole('searchbox', { name: '동작 이름 또는 등록된 부위 태그 검색' }),
    ).toHaveFocus();
    const after = usePilatesStore.getState();
    expect(screen.getByTestId('wizard-step2-page')).toBeVisible();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.activeTargetMinutes).toBe(before.activeTargetMinutes);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.draftCriteria?.targetMinutes).toBe(before.activeTargetMinutes);
    expect(after.draftCriteria?.availableEquipment).toEqual([before.activeApparatus]);
    expectCatalogBoundaries();
  });

  it('preserves App-owned direct mode through contextual mobile selection and normal library navigation', async () => {
    const synthetic = syntheticPlanningExercise('mat', 'warmup');
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, synthetic] });
    const before = usePilatesStore.getState();
    render(<App />);
    await openAdvancedWorkbench();
    fireEvent.click(screen.getByRole('button', { name: '동작 추가' }));
    const pickerPage = screen.getByTestId('wizard-step2-page');
    expect(pickerPage).toBeVisible();
    const finder = within(pickerPage);
    const search = finder.getByRole('searchbox', {
      name: '동작 이름 또는 등록된 부위 태그 검색',
    });
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    fireEvent.change(search, { target: { value: synthetic.nameKo } });
    fireEvent.click(finder.getByRole('button', { name: `${synthetic.nameKo} 수업안에 추가` }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    fireEvent.click(screen.getByTestId('wizard-to-step3-btn'));
    expect(screen.queryByTestId('wizard-step2-page')).not.toBeInTheDocument();
    expect(getVisibleWorkbenchButton('직접 편집')).toHaveAttribute('aria-pressed', 'true');
    expect(getVisibleWorkbenchButton('2 수업 구성')).toHaveAttribute('aria-current', 'step');
    const after = usePilatesStore.getState();
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.activeTargetMinutes).toBe(before.activeTargetMinutes);
    expect(after.draftCriteria?.targetMinutes).toBe(before.activeTargetMinutes);
    expect(after.draftCriteria?.availableEquipment).toEqual([before.activeApparatus]);
    expect(after.exercises).toBe(before.exercises);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.undoStack.at(-1)).toMatchObject({
      activeSteps: before.activeSteps,
      activeTitle: before.activeTitle,
      activeTargetMinutes: before.activeTargetMinutes,
    });
    expect(screen.getByRole('button', { name: '시퀀스 미리보기' })).toBeEnabled();
    fireEvent.click(getVisibleWorkbenchButton('3 미리보기'));
    const preview = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    expect(within(preview).getByRole('button', { name: '수업 시작' })).toBeEnabled();
    fireEvent.click(within(preview).getByRole('button', { name: '편집으로 돌아가기' }));
    // An explicitly selected automatic mode survives the same normal navigation too.
    fireEvent.click(getVisibleWorkbenchButton('자동 구성'));
    fireEvent.click(
      within(screen.getByRole('navigation', { name: '모바일 주 메뉴' })).getByRole('button', {
        name: '동작',
      }),
    );
    expect(usePilatesStore.getState().activeTab).toBe('atlas');
    // App lazy-loads the library; allow its module to commit before continuing the journey.
    await within(screen.getByRole('main')).findByRole(
      'searchbox',
      { name: '동작 검색' },
      { timeout: 5000 },
    );
    fireEvent.click(
      within(screen.getByRole('navigation', { name: '모바일 주 메뉴' })).getByRole('button', {
        name: '작성',
      }),
    );
    await openAdvancedWorkbench();
    expect(getVisibleWorkbenchButton('자동 구성')).toHaveAttribute('aria-pressed', 'true');
    expect(usePilatesStore.getState().activeSteps).toBe(after.activeSteps);
    expectCatalogBoundaries();
  }, 30000);

  it('keeps nonempty defaults and supports a controlled mode without changing locked blocks, timing or review state', () => {
    const pending = INITIAL_EXERCISES.find((exercise) => exercise.apparatus === 'mat')!;
    const step: SequenceStep = {
      stepId: 'v11-existing-locked',
      order: 1,
      exerciseId: pending.id,
      blockCategory: 'warmup',
      selectedLayer: 'standard',
      durationMin: 50,
      locked: true,
      instructorNote: '그대로 보존할 수업 메모',
    };
    usePilatesStore.setState({ activeSteps: [step] });
    const before = usePilatesStore.getState();
    const change = vi.fn();
    const view = render(<SequenceWorkbench {...props} />);
    expect(getVisibleWorkbenchButton('자동 구성')).toHaveAttribute('aria-pressed', 'true');
    expect(getVisibleWorkbenchButton('잠그지 않은 동작 다시 만들기')).toBeInTheDocument();
    fireEvent.click(getVisibleWorkbenchButton('3 미리보기'));
    const preview = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    expect(within(preview).getByRole('button', { name: '사본 저장' })).toBeInTheDocument();
    expect(within(preview).getByRole('button', { name: '수업 시작' })).toBeEnabled();
    fireEvent.click(within(preview).getByRole('button', { name: '편집으로 돌아가기' }));
    view.rerender(
      <SequenceWorkbench {...props} planningMode="manual" onPlanningModeChange={change} />,
    );
    fireEvent.click(getVisibleWorkbenchButton('자동 구성'));
    expect(change).toHaveBeenCalledWith('auto');
    expect(getVisibleWorkbenchButton('직접 편집')).toHaveAttribute('aria-pressed', 'true');
    view.rerender(
      <SequenceWorkbench {...props} planningMode="auto" onPlanningModeChange={change} />,
    );
    expect(getVisibleWorkbenchButton('자동 구성')).toHaveAttribute('aria-pressed', 'true');
    expect(usePilatesStore.getState()).toBe(before);
    expect(usePilatesStore.getState().activeSteps[0]).toBe(step);
    expectCatalogBoundaries();
  });
});
