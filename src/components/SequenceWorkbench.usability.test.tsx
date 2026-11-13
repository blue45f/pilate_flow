import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SequenceWorkbench } from './SequenceWorkbench';
import { BLANK_DRAFT_STARTER_OPTIONS } from '../data/classBlockPresets';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { SYNTHETIC_APPROVED_EXERCISES } from '../test/planningFixtures';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  openWorkbenchBlockMemo,
  openWorkbenchConditions,
  closeWorkbenchConditions,
} from '../test/workbenchControls';
import type { ClassGroupProfile, ClassHistoryLog, SequenceStep } from '../types/pilates';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => <div data-testid="usability-motion-reference" />,
}));

const originalState = usePilatesStore.getState();
const initialCatalogSnapshot = structuredClone(INITIAL_EXERCISES);

// These cases cover several complete dialog/save/reload journeys in one test.
const JOURNEY_TIMEOUT_MS = 20_000;

const noopHandlers = () => ({
  onOpenYouTubePreview: vi.fn(),
  onOpenClipper: vi.fn(),
  onOpenLogModal: vi.fn(),
  onOpenInventory: vi.fn(),
});

const motionCapableReformerExercise = INITIAL_EXERCISES.find(
  (exercise) =>
    exercise.apparatus === 'reformer' &&
    Number(exercise.level) <= 1 &&
    getMotionPatternReferences(exercise.id).length > 0,
)!;

const syntheticReformerExercises = SYNTHETIC_APPROVED_EXERCISES.filter(
  (exercise) =>
    exercise.apparatus === 'reformer' &&
    Number(exercise.level) <= 1 &&
    isExerciseAutoEligible(exercise),
);

function setViewportWidth(width: number) {
  act(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    fireEvent(window, new Event('resize'));
  });
}

function makeReformerSteps(count: number, durationMin = 10): SequenceStep[] {
  return syntheticReformerExercises.slice(0, count).map((exercise, index) => ({
    stepId: `qa-usability-step-${index + 1}`,
    order: index + 1,
    blockCategory: exercise.blockCategory,
    exerciseId: exercise.id,
    durationMin,
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: index === 0 ? 0 : 15,
  }));
}

function makeMotionCapableSteps(): SequenceStep[] {
  const firstStep: SequenceStep = {
    stepId: 'qa-motion-step-1',
    order: 1,
    blockCategory: motionCapableReformerExercise.blockCategory,
    exerciseId: motionCapableReformerExercise.id,
    durationMin: 10,
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: 0,
  };
  const restSteps: SequenceStep[] = syntheticReformerExercises
    .slice(0, 3)
    .map((exercise, idx) => ({
      stepId: `qa-motion-step-${idx + 2}`,
      order: idx + 2,
      blockCategory: exercise.blockCategory,
      exerciseId: exercise.id,
      durationMin: 12,
      selectedLayer: 'standard',
      explanationSec: 20,
      transitionSec: 15,
    }));
  return [firstStep, ...restSteps];
}

describe('SequenceWorkbench next-action clarity and mistake recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setViewportWidth(390);
    const defaultGroupId = originalState.classGroups[0]?.id ?? 'group-a';
    usePilatesStore.setState(
      {
        ...originalState,
        activeTab: 'workbench',
        exercises: [...INITIAL_EXERCISES, ...SYNTHETIC_APPROVED_EXERCISES],
        activeSequenceId: 'qa-usability-draft',
        activeTitle: '합성 리포머 초안',
        activeSubtitle: '수업 구성 사용성 검증',
        activeApparatus: 'reformer',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        activeTargetGroupId: defaultGroupId,
        ownedApparatus: ['mat', 'reformer', 'chair'],
        ownedEquipment: ['mat', 'reformer', 'chair'],
        ownedProps: ['mini-ball'],
        lastCriteria: {
          apparatus: 'reformer',
          ownedApparatus: ['reformer'],
          availableEquipment: ['reformer'],
          level: '1.0',
          targetMinutes: 50,
          focusPreset: 'full-body',
          preferredProps: ['none'],
          excludeDaysWindow: 14,
          targetGroupId: defaultGroupId,
          defaultLayer: 'standard',
        },
        draftCriteria: {
          apparatus: 'reformer',
          ownedApparatus: ['reformer'],
          availableEquipment: ['reformer'],
          level: '1.0',
          targetMinutes: 50,
          focusPreset: 'full-body',
          preferredProps: ['none'],
          excludeDaysWindow: 14,
          targetGroupId: defaultGroupId,
          defaultLayer: 'standard',
        },
        activeSteps: [],
        savedSequences: [],
        historyLogs: [],
        conditionTemplates: [],
        generationError: null,
        saveFeedback: '',
        undoStack: [],
      },
      true,
    );
  });

  afterEach(() => {
    cleanup();
    setViewportWidth(1024);
    usePilatesStore.setState(originalState, true);
    vi.restoreAllMocks();
    expect(INITIAL_EXERCISES).toEqual(initialCatalogSnapshot);
  });

  it('preserves unsaved memo, time estimate, role, and motion study across replace-cancel and conditions round-trips on 390px and 1440px viewports', async () => {
    expect(motionCapableReformerExercise).toBeDefined();
    const motionRef = getMotionPatternReferences(motionCapableReformerExercise.id)[0]!;
    expect(motionRef).toBeDefined();

    const steps = makeMotionCapableSteps();
    usePilatesStore.setState({ activeSteps: steps });

    render(<SequenceWorkbench {...noopHandlers()} />);

    const memoInspector = openWorkbenchBlockMemo(0);

    // 1. Unsaved role (classSection) edit
    const roleSelect = memoInspector.getByRole('combobox', { name: '수업에서의 역할' });
    fireEvent.change(roleSelect, { target: { value: 'cooldown' } });

    // 2. Unsaved time estimate & calculated duration edit
    const estimateSummary = memoInspector.getByText('반복·유지·호흡으로 시간 계산', {
      selector: 'summary',
    });
    const estimateDetails = estimateSummary.closest('details')!;
    if (!estimateDetails.open) {
      fireEvent.click(estimateSummary);
    }
    fireEvent.change(
      within(estimateDetails).getByRole('spinbutton', { name: '계산용 횟수 · 한 세트마다' }),
      { target: { value: '10' } },
    );
    fireEvent.change(
      within(estimateDetails).getByRole('spinbutton', { name: '계산용 세트 · 한쪽마다' }),
      { target: { value: '2' } },
    );
    fireEvent.change(
      within(estimateDetails).getByRole('spinbutton', { name: '한 회 움직임 · 초' }),
      { target: { value: '6' } },
    );
    fireEvent.click(
      within(estimateDetails).getByRole('button', { name: '계산값을 편집란에 넣기' }),
    );
    const calculatedDurationValue = memoInspector.getByRole<HTMLInputElement>('spinbutton', {
      name: '블록 총시간 · 분',
    }).value;
    expect(Number(calculatedDurationValue)).not.toBe(steps[0]!.durationMin);

    // 3. Unsaved memo & spring override edit
    fireEvent.change(
      memoInspector.getByRole('textbox', { name: '이번 수업 스프링 설정 · 직접 확인' }),
      { target: { value: '2R 1B 미저장 확인' } },
    );
    fireEvent.change(memoInspector.getByRole('textbox', { name: '이번 수업 티칭 메모' }), {
      target: { value: '취소 후에도 유지되어야 하는 미적용 티칭 메모' },
    });

    // 4. Unsaved motion study selection
    const motionSummary = memoInspector.getByText(/수업 모션 연결/);
    const motionDetails = motionSummary.closest('details')!;
    if (!motionDetails.open) {
      motionDetails.open = true;
      fireEvent(motionDetails, new Event('toggle'));
    }
    const motionRadio = memoInspector.getByRole('radio', {
      name: `${motionRef.title} 수업 모션으로 선택`,
    });
    fireEvent.click(motionRadio);
    expect(motionRadio).toBeChecked();

    // Confirm none of the 4 edits mutated store before clicking 변경 적용
    expect(usePilatesStore.getState().activeSteps[0]?.classSection).toBeUndefined();
    expect(usePilatesStore.getState().activeSteps[0]?.timeEstimate).toBeUndefined();
    expect(usePilatesStore.getState().activeSteps[0]?.instructorNote).toBeUndefined();
    expect(usePilatesStore.getState().activeSteps[0]?.motionStudy).toBeUndefined();

    // Open replace dialog on 390px -> mobile sheet suspends without wiping draft cache
    fireEvent.click(memoInspector.getByRole('button', { name: '동작 교체' }));
    const replaceDialog = await screen.findByRole('dialog', { name: '이 동작만 교체' });
    expect(screen.queryByRole('dialog', { name: '동작 블록 편집' })).not.toBeInTheDocument();

    const searchInput = within(replaceDialog).getByRole('textbox', { name: '교체할 동작 검색' });
    fireEvent.change(searchInput, { target: { value: '존재하지않는합성검색어999' } });
    expect(within(replaceDialog).getByText('조건에 맞는 교체 동작이 없어요')).toBeInTheDocument();

    fireEvent.click(within(replaceDialog).getByRole('button', { name: '검색어 지우기' }));
    expect(searchInput).toHaveValue('');
    expect(replaceDialog.querySelectorAll('.replacement-item').length).toBeGreaterThan(0);

    // Cancel on 390px -> inspector sheet reopens with ALL 4 unsaved draft dimensions intact
    fireEvent.click(within(replaceDialog).getByRole('button', { name: '블록 편집으로 돌아가기' }));
    expect(screen.queryByRole('dialog', { name: '이 동작만 교체' })).not.toBeInTheDocument();

    const reopenedSheet = await screen.findByRole('dialog', { name: '동작 블록 편집' });
    expect(
      within(reopenedSheet).getByRole('combobox', { name: '수업에서의 역할' }),
    ).toHaveValue('cooldown');
    expect(
      within(reopenedSheet).getByRole('spinbutton', { name: '블록 총시간 · 분' }),
    ).toHaveValue(Number(calculatedDurationValue));
    expect(
      within(reopenedSheet).getByRole('textbox', { name: '이번 수업 스프링 설정 · 직접 확인' }),
    ).toHaveValue('2R 1B 미저장 확인');
    expect(
      within(reopenedSheet).getByRole('textbox', { name: '이번 수업 티칭 메모' }),
    ).toHaveValue('취소 후에도 유지되어야 하는 미적용 티칭 메모');
    expect(
      within(reopenedSheet).getByRole('radio', { name: `${motionRef.title} 수업 모션으로 선택` }),
    ).toBeChecked();

    // Conditions modal round-trip on 390px also preserves all 4 unsaved draft dimensions
    openWorkbenchConditions();
    expect(screen.queryByRole('dialog', { name: '동작 블록 편집' })).not.toBeInTheDocument();
    closeWorkbenchConditions();
    const afterConditionsSheet = await screen.findByRole('dialog', { name: '동작 블록 편집' });
    expect(
      within(afterConditionsSheet).getByRole('combobox', { name: '수업에서의 역할' }),
    ).toHaveValue('cooldown');
    expect(
      within(afterConditionsSheet).getByRole('spinbutton', { name: '블록 총시간 · 분' }),
    ).toHaveValue(Number(calculatedDurationValue));
    expect(
      within(afterConditionsSheet).getByRole('textbox', { name: '이번 수업 티칭 메모' }),
    ).toHaveValue('취소 후에도 유지되어야 하는 미적용 티칭 메모');
    expect(
      within(afterConditionsSheet).getByRole('radio', {
        name: `${motionRef.title} 수업 모션으로 선택`,
      }),
    ).toBeChecked();

    // Switch to wide desktop (1440px): open replace and cancel again -> all 4 unsaved values stay intact
    setViewportWidth(1440);
    const desktopInspector = screen.getByRole('complementary', { name: '선택 동작 속성' });
    fireEvent.click(within(desktopInspector).getByRole('button', { name: '동작 교체' }));
    const desktopCancelDialog = await screen.findByRole('dialog', { name: '이 동작만 교체' });
    fireEvent.click(
      within(desktopCancelDialog).getByRole('button', { name: '블록 편집으로 돌아가기' }),
    );

    expect(
      within(desktopInspector).getByRole('combobox', { name: '수업에서의 역할' }),
    ).toHaveValue('cooldown');
    expect(
      within(desktopInspector).getByRole('spinbutton', { name: '블록 총시간 · 분' }),
    ).toHaveValue(Number(calculatedDurationValue));
    expect(
      within(desktopInspector).getByRole('textbox', { name: '이번 수업 티칭 메모' }),
    ).toHaveValue('취소 후에도 유지되어야 하는 미적용 티칭 메모');
    expect(
      within(desktopInspector).getByRole('radio', {
        name: `${motionRef.title} 수업 모션으로 선택`,
      }),
    ).toBeChecked();

    // Apply edits, reopen inspector, confirm replacement, verify named status announcement & 1-tap undo
    fireEvent.click(within(desktopInspector).getByRole('button', { name: '변경 적용' }));
    const appliedStep = structuredClone(usePilatesStore.getState().activeSteps[0]!);
    expect(appliedStep.classSection).toBe('cooldown');
    expect(appliedStep.timeEstimate).toBeDefined();
    expect(appliedStep.instructorNote).toBe('취소 후에도 유지되어야 하는 미적용 티칭 메모');
    expect(appliedStep.motionStudy?.variantId).toBe(motionRef.variantId);

    fireEvent.click(screen.getByRole('button', { name: '1번 동작 블록 편집' }));
    const reopenedDesktopInspector = screen.getByRole('complementary', { name: '선택 동작 속성' });
    fireEvent.click(within(reopenedDesktopInspector).getByRole('button', { name: '동작 교체' }));
    const desktopReplaceDialog = await screen.findByRole('dialog', { name: '이 동작만 교체' });
    const firstCandidate =
      desktopReplaceDialog.querySelector<HTMLButtonElement>('.replacement-item')!;
    fireEvent.click(firstCandidate);

    expect(usePilatesStore.getState().activeSteps[0]!.exerciseId).not.toBe(steps[0]!.exerciseId);
    expect(screen.getByRole('status', { name: '수업 구성 상태 안내' })).toHaveTextContent(
      /교체했어요.*되돌리기/,
    );

    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(appliedStep);
  }, JOURNEY_TIMEOUT_MS);

  it('guards duplicate clicks and preserves lossless undo across blank canvas starter, quick-start recipe, 새 수업 만들기, and keyboard Ctrl/Cmd+Z', () => {
    // Explicit synthetic eligibility check for Reformer Lv.1.0 quick-start recipe generation
    expect(syntheticReformerExercises.some((ex) => ex.blockCategory === 'warmup')).toBe(true);
    expect(syntheticReformerExercises.some((ex) => ex.blockCategory === 'cooldown')).toBe(true);
    expect(syntheticReformerExercises.length).toBeGreaterThanOrEqual(4);

    // Explicit blank-class-sequence canvas starter in WorkbenchBlankStarters (first 4 items)
    const blankCanvasStarter = BLANK_DRAFT_STARTER_OPTIONS.slice(0, 4).find(
      (item) =>
        item.id === 'starter-blank-class-sequence-canvas' &&
        item.starterKind === 'blank-class-sequence' &&
        item.includeSectionFrameSteps === false,
    )!;
    expect(blankCanvasStarter).toBeDefined();

    const initialSteps = makeReformerSteps(3, 12);
    usePilatesStore.setState({
      activeTitle: '기존 준비 수업',
      activeSteps: initialSteps,
      undoStack: [],
    });

    const { unmount } = render(<SequenceWorkbench {...noopHandlers()} />);

    const flowBar = screen.getByRole('region', { name: '새 수업 및 최근 수업 전환' });
    fireEvent.click(within(flowBar).getByRole('button', { name: /새 수업 만들기/ }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(
      screen.queryByRole('dialog', { name: '수업에 넣을 동작 고르기' }),
    ).not.toBeInTheDocument();

    const emptyUndoBtn = screen.getByRole('button', { name: '되돌리기' });
    expect(emptyUndoBtn).toHaveClass('workbench-empty-undo-btn');

    // 1. Open optional templates, then create a blank canvas without duplicate snapshots.
    const templatesSummary = screen.getByText('수업 템플릿으로 시작하기', { selector: 'summary' });
    expect(templatesSummary.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(templatesSummary);
    const starterGroup = screen.getByRole('group', { name: '빈 초안 빠른 시작' });
    expect(starterGroup).toBeVisible();
    const blankCanvasBtn = within(starterGroup).getByRole('button', {
      name: blankCanvasStarter.titleKo,
    });
    fireEvent.click(blankCanvasBtn);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
    expect(usePilatesStore.getState().activeTitle).toBe(blankCanvasStarter.titleKo);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);

    // Clicking the same blank canvas starter again does not push a duplicate undo snapshot
    fireEvent.click(blankCanvasBtn);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);

    // 2. Open optional recipes and populate the class from synthetic Reformer Lv.1.0 fixtures.
    fireEvent.click(screen.getByText('원클릭 추천 클래스 레시피 열기 (선택)', { selector: 'summary' }));
    const quickStartRegion = screen.getByRole('region', { name: '원클릭 추천 클래스 갤러리' });
    expect(quickStartRegion).toBeVisible();
    fireEvent.click(
      within(quickStartRegion).getByRole('button', {
        name: '30분 점심 순환 익스프레스 바로 시작',
      }),
    );
    const recipeStepsCount = usePilatesStore.getState().activeSteps.length;
    expect(recipeStepsCount).toBeGreaterThan(0);
    expect(usePilatesStore.getState().undoStack).toHaveLength(3);

    // Re-clicking the identical quick-start recipe from the disclosure is deduplicated
    const quickRecipeSummary = screen.getByText('원클릭 추천 클래스 레시피 열기 (선택)', {
      selector: 'summary',
    });
    fireEvent.click(quickRecipeSummary);
    fireEvent.click(screen.getByRole('button', { name: '30분 점심 순환 익스프레스 바로 시작' }));
    expect(usePilatesStore.getState().undoStack).toHaveLength(3);

    // Ctrl+Z while focused inside title input is ignored so native text editing stays untouched
    const titleInput = screen.getByRole('textbox', { name: '시퀀스 제목' });
    titleInput.focus();
    fireEvent.keyDown(titleInput, { key: 'z', ctrlKey: true });
    expect(usePilatesStore.getState().undoStack).toHaveLength(3);

    // Ctrl+Z / Cmd+Z outside inputs undoes recipe -> blank canvas -> empty reset -> original 3-step class
    titleInput.blur();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
    expect(usePilatesStore.getState().activeTitle).toBe(blankCanvasStarter.titleKo);

    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
    expect(usePilatesStore.getState().activeTitle).toBe('새 수업 시퀀스');

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(usePilatesStore.getState().activeSteps).toHaveLength(initialSteps.length);
    expect(usePilatesStore.getState().activeTitle).toBe('기존 준비 수업');

    unmount();
  }, JOURNEY_TIMEOUT_MS);

  it('captures lossless undo snapshots and blocks cumulative duration inflation on repeated calibration clicks', () => {
    const mixedExercises = [
      SYNTHETIC_APPROVED_EXERCISES.find(
        (ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'warmup',
      )!,
      SYNTHETIC_APPROVED_EXERCISES.find(
        (ex) => ex.apparatus === 'chair' && Number(ex.level) <= 1,
      )!,
      SYNTHETIC_APPROVED_EXERCISES.find(
        (ex) => ex.apparatus === 'mat' && ex.blockCategory === 'cooldown',
      )!,
    ];
    const baseSteps: SequenceStep[] = mixedExercises.map((exercise, index) => ({
      stepId: `qa-calib-step-${index + 1}`,
      order: index + 1,
      blockCategory: exercise.blockCategory,
      exerciseId: exercise.id,
      durationMin: 10,
      selectedLayer: 'standard',
      explanationSec: 15,
      transitionSec: 0,
    }));
    const groupId = usePilatesStore.getState().classGroups[0]?.id ?? 'all';
    const recentLogs: ClassHistoryLog[] = [1, 2, 3].map((idx) => ({
      id: `qa-custom-calib-log-${idx}`,
      sequenceId: 'qa-seq',
      sequenceTitle: '합성 보정 기록',
      groupId,
      groupName: '오전반',
      taughtAt: `2026-04-0${idx}T10:00:00.000Z`,
      apparatus: 'mixed',
      level: '1.0',
      exerciseIds: mixedExercises.map((ex) => ex.id),
      stepsSnapshot: structuredClone(baseSteps),
      actualDurationSec: 2400,
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '합성 보정 기록',
    }));

    usePilatesStore.setState({
      activeApparatus: 'mixed',
      activeSteps: baseSteps,
      historyLogs: recentLogs,
      undoStack: [],
    });

    render(<SequenceWorkbench {...noopHandlers()} />);

    const flowSummary = screen.getByText('기구 전환·움직임 균형·3D 기구 점검 (선택)', {
      selector: 'summary',
    });
    const flowDetails = flowSummary.closest('details')!;
    if (!flowDetails.open) {
      flowDetails.open = true;
      fireEvent(flowDetails, new Event('toggle'));
    }

    const targetBtn = screen.getByRole('button', { name: /^현재 수업에 시간 보정 적용/ });
    fireEvent.click(targetBtn);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    const calibratedOnceSteps = structuredClone(usePilatesStore.getState().activeSteps);
    expect(calibratedOnceSteps).not.toEqual(baseSteps);

    // Repeated click on already-calibrated steps blocks cumulative +delta inflation and preserves 1-step undo
    fireEvent.click(targetBtn);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps).toEqual(calibratedOnceSteps);

    // Undo restores exact pre-calibration steps, after which calibration can be applied cleanly again
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(baseSteps);
  });

  it('surfaces contextual inline time-fit actions, blocking readiness step jump, and keeps 수업 시작 confined to preview', () => {
    setViewportWidth(360);
    const singleShortStep = makeReformerSteps(1, 8);
    usePilatesStore.setState({
      activeSteps: singleShortStep,
      activeTargetMinutes: 50,
    });

    render(<SequenceWorkbench {...noopHandlers()} />);

    expect(screen.queryByRole('button', { name: /수업 시작/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '동작 추가해 채우기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '동작 추가해 채우기' }));
    expect(screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' })).getByRole('button', {
        name: '닫기',
      }),
    );

    act(() => {
      usePilatesStore.setState({ activeSteps: makeReformerSteps(4, 8) });
    });
    const autoFitChip = screen.getByRole('button', { name: '목표 시간 자동 맞춤' });
    fireEvent.click(autoFitChip);
    expect(screen.getByText('시간이 딱 맞아요')).toBeInTheDocument();

    for (let idx = 1; idx <= 4; idx += 1) {
      fireEvent.click(screen.getByRole('button', { name: `${idx}번 동작 잠금` }));
    }
    const conditions = openWorkbenchConditions();
    fireEvent.click(conditions.getByRole('button', { name: /^60/ }));
    closeWorkbenchConditions();

    const unlockGuideChip = screen.getByRole('button', { name: '잠금 확인 후 조정' });
    fireEvent.click(unlockGuideChip);
    expect(document.activeElement).toHaveAttribute('aria-label', '1번 동작 잠금 해제');

    act(() => {
      usePilatesStore.setState({
        activeSteps: [
          ...makeReformerSteps(1, 20),
          {
            stepId: 'qa-broken-step-2',
            order: 2,
            blockCategory: 'core',
            exerciseId: 'missing-synthetic-exercise-id',
            durationMin: 10,
            selectedLayer: 'standard',
          },
        ],
      });
    });
    expect(document.getElementById('start-class-readiness')).toHaveTextContent('2번 항목');
    expect(screen.getByRole('button', { name: '2번 항목 확인' })).toBeInTheDocument();
  }, JOURNEY_TIMEOUT_MS);

  it('never skips saving when any SequenceStep detail (classSection, bilateral sideMode, timeEstimate, motionStudy, practice/note) or criteria/targetGroup changes, and preserves all fields across checkpoints and reload', () => {
    const steps = makeMotionCapableSteps();
    const motionRef = getMotionPatternReferences(motionCapableReformerExercise.id)[0]!;
    const secondGroup: ClassGroupProfile = {
      id: 'qa-group-evening',
      name: '저녁 집중반',
      type: 'group',
      defaultLevel: '1.5',
      scheduleLabel: '화·목 19:00',
      notes: '합성 검증 반',
    };
    usePilatesStore.setState({
      activeSteps: steps,
      classGroups: [...usePilatesStore.getState().classGroups, secondGroup],
    });

    render(<SequenceWorkbench {...noopHandlers()} />);

    const clickSave = () =>
      fireEvent.click(
        within(screen.getByRole('region', { name: '오늘의 시퀀스' })).getByRole('button', {
          name: '저장',
        }),
      );

    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');
    clickSave();
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
    const savedId = usePilatesStore.getState().activeSequenceId;

    // Identical double-click on 저장 and 사본 저장 is safely deduplicated
    clickSave();
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
    const saveCopyBtn = screen.getByRole('button', { name: '사본 저장' });
    fireEvent.click(saveCopyBtn);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(2);
    fireEvent.click(saveCopyBtn);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(2);

    act(() => {
      usePilatesStore.getState().loadSequenceIntoWorkbench(savedId);
    });
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');

    // 1. Edit ONLY classSection on Step 0 -> flips to 변경사항 있음 and persists
    let inspector = openWorkbenchBlockMemo(0);
    fireEvent.change(inspector.getByRole('combobox', { name: '수업에서의 역할' }), {
      target: { value: 'preparation' },
    });
    fireEvent.click(inspector.getByRole('button', { name: '변경 적용' }));
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');
    clickSave();
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');

    // 2. Edit bilateral timeEstimate (sides = 2) + right-then-left sideMode + spring + note on Step 0,
    // verifying sideMode at every checkpoint (right after apply -> save -> motionStudy -> conditions -> reload)
    inspector = openWorkbenchBlockMemo(0);
    fireEvent.change(inspector.getByRole('combobox', { name: '수행할 쪽' }), {
      target: { value: 'right-then-left' },
    });
    const estimateSummary = inspector.getByText('반복·유지·호흡으로 시간 계산', {
      selector: 'summary',
    });
    const estimateDetails = estimateSummary.closest('details')!;
    if (!estimateDetails.open) fireEvent.click(estimateSummary);
    fireEvent.change(within(estimateDetails).getByRole('combobox', { name: '계산할 쪽' }), {
      target: { value: '2' },
    });
    fireEvent.change(
      within(estimateDetails).getByRole('spinbutton', { name: '계산용 횟수 · 한 세트마다' }),
      { target: { value: '8' } },
    );
    fireEvent.change(
      within(estimateDetails).getByRole('spinbutton', { name: '계산용 세트 · 한쪽마다' }),
      { target: { value: '3' } },
    );
    fireEvent.change(
      within(estimateDetails).getByRole('spinbutton', { name: '한 회 움직임 · 초' }),
      { target: { value: '5' } },
    );
    fireEvent.click(
      within(estimateDetails).getByRole('button', { name: '계산값을 편집란에 넣기' }),
    );
    expect(inspector.getByRole('combobox', { name: '수행할 쪽' })).toHaveValue('right-then-left');
    fireEvent.change(
      inspector.getByRole('textbox', { name: '이번 수업 스프링 설정 · 직접 확인' }),
      { target: { value: '1R 1B 검증' } },
    );
    fireEvent.change(inspector.getByRole('textbox', { name: '이번 수업 티칭 메모' }), {
      target: { value: '세부 필드 저장 보존 검증 메모' },
    });
    fireEvent.click(inspector.getByRole('button', { name: '변경 적용' }));
    expect(usePilatesStore.getState().activeSteps[0]?.sideMode).toBe('right-then-left');
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');
    clickSave();
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');
    const savedOriginal = usePilatesStore
      .getState()
      .savedSequences.find((sequence) => sequence.id === savedId);
    expect(savedOriginal).toBeDefined();
    expect(savedOriginal?.steps[0]?.sideMode).toBe('right-then-left');

    // 3. Independent Step 1 practice options (left-then-right + repetitions + sets without StepTimeEstimateEditor)
    const step2Inspector = openWorkbenchBlockMemo(1);
    fireEvent.change(step2Inspector.getByRole('combobox', { name: '수행할 쪽' }), {
      target: { value: 'left-then-right' },
    });
    fireEvent.change(step2Inspector.getByRole('spinbutton', { name: '강사가 정한 횟수' }), {
      target: { value: '12' } },
    );
    fireEvent.change(step2Inspector.getByRole('spinbutton', { name: '강사가 정한 세트' }), {
      target: { value: '2' } },
    );
    fireEvent.click(step2Inspector.getByRole('button', { name: '변경 적용' }));
    expect(usePilatesStore.getState().activeSteps[1]?.sideMode).toBe('left-then-right');
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');
    clickSave();
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');

    // 4. Edit ONLY motionStudy on Step 0 -> confirms motionStudy never alters sideMode and triggers dirty -> save
    inspector = openWorkbenchBlockMemo(0);
    const motionSummary = inspector.getByText(/수업 모션 연결/);
    const motionDetails = motionSummary.closest('details')!;
    if (!motionDetails.open) {
      motionDetails.open = true;
      fireEvent(motionDetails, new Event('toggle'));
    }
    fireEvent.click(
      inspector.getByRole('radio', { name: `${motionRef.title} 수업 모션으로 선택` }),
    );
    fireEvent.click(inspector.getByRole('button', { name: '변경 적용' }));
    expect(usePilatesStore.getState().activeSteps[0]?.sideMode).toBe('right-then-left');
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');
    clickSave();
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');

    // 5. Edit ONLY conditions (focusPreset, planningGoals, instructorObservations, preferredProps) without touching steps
    const condDialog = openWorkbenchConditions();
    fireEvent.click(condDialog.getByRole('button', { name: '코어' }));
    const advSummary = condDialog.getByText(/소도구·반복 회피 설정/);
    const advDetails = advSummary.closest('details')!;
    if (!advDetails.open) fireEvent.click(advSummary);
    fireEvent.click(condDialog.getByRole('button', { name: '미니볼' }));
    fireEvent.click(condDialog.getByRole('checkbox', { name: '골반 움직임 인지·조절' }));
    fireEvent.click(condDialog.getByRole('checkbox', { name: '전방경사 관찰' }));
    closeWorkbenchConditions();
    expect(usePilatesStore.getState().activeSteps[0]?.sideMode).toBe('right-then-left');
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');
    clickSave();
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');

    // 6. Update activeTargetGroupId directly -> syncs to criteriaSnapshot, marks dirty, and persists on save
    act(() => {
      usePilatesStore.getState().setActiveTargetGroupId(secondGroup.id);
    });
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');
    clickSave();
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');

    // 7. Clear draft via 새 수업 만들기 and reopen saved sequence -> every step detail & criteriaSnapshot field survives
    const flowBar = screen.getByRole('region', { name: '새 수업 및 최근 수업 전환' });
    fireEvent.click(within(flowBar).getByRole('button', { name: /새 수업 만들기/ }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);

    act(() => {
      usePilatesStore.getState().loadSequenceIntoWorkbench(savedId);
    });
    const reloaded = usePilatesStore.getState();
    expect(reloaded.activeSteps[0]?.classSection).toBe('preparation');
    expect(reloaded.activeSteps[0]?.sideMode).toBe('right-then-left');
    expect(reloaded.activeSteps[0]?.customSpringOverride).toBe('1R 1B 검증');
    expect(reloaded.activeSteps[0]?.timeEstimate).toMatchObject({
      sides: 2,
      repetitions: 8,
      sets: 3,
      secondsPerRep: 5,
    });
    expect(reloaded.activeSteps[0]?.instructorNote).toBe('세부 필드 저장 보존 검증 메모');
    expect(reloaded.activeSteps[0]?.motionStudy?.variantId).toBe(motionRef.variantId);
    expect(reloaded.activeSteps[1]?.sideMode).toBe('left-then-right');
    expect(reloaded.activeSteps[1]?.repetitions).toBe(12);
    expect(reloaded.activeSteps[1]?.sets).toBe(2);
    expect(reloaded.draftCriteria).toMatchObject({
      focusPreset: 'core-sculpt',
      planningGoals: ['pelvic-control'],
      instructorObservations: ['anterior-pelvic-tilt'],
      targetGroupId: secondGroup.id,
    });
    expect(reloaded.draftCriteria?.preferredProps).toContain('mini-ball');
  }, JOURNEY_TIMEOUT_MS);

  it('enforces >=44px touch targets, :focus-visible rings, mobile breakpoints, and prefers-reduced-motion in SequenceWorkbench.usability.css', () => {
    const cssPath = resolve(process.cwd(), 'src/components/SequenceWorkbench.usability.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('min-height: 44px');
    expect(css).toContain('min-width: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 480px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
