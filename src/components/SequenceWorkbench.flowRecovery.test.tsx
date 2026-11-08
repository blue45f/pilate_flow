import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INLINE_FINDER_QUERY_STORAGE_KEY,
  InlineExerciseFinder,
} from './InlineExerciseFinder';
import {
  SequenceWorkbench,
  WORKBENCH_PREP_RECOVERY_KEY,
} from './SequenceWorkbench';
import {
  STEP_INSPECTOR_DRAFT_STORAGE_KEY,
  StepBlockInspector,
} from './StepBlockInspector';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => <div data-testid="flow-recovery-motion-reference" />,
}));

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const warmupExercise = syntheticPlanningExercise('mat', 'warmup');
const coreExercise = syntheticPlanningExercise('mat', 'core', 'alpha', true);

const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  targetMinutes: 50,
  excludeDaysWindow: 0,
  defaultLayer: 'standard',
};

const sampleSteps: SequenceStep[] = [
  {
    stepId: 'step-hundred',
    order: 1,
    exerciseId: warmupExercise.id,
    blockCategory: 'warmup',
    durationMin: 4,
    explanationSec: 20,
    transitionSec: 0,
    selectedLayer: 'standard',
    repetitions: 8,
    sets: 2,
    instructorNote: '갈비뼈 닫기',
  },
  {
    stepId: 'step-core',
    order: 2,
    exerciseId: coreExercise.id,
    blockCategory: 'core',
    durationMin: 6,
    explanationSec: 20,
    transitionSec: 0,
    selectedLayer: 'standard',
    repetitions: 10,
    sets: 2,
    instructorNote: '골반 중립 유지',
  },
];

describe('Wave1-1 Home Workbench Flow & Mid-Flow Recovery', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    usePilatesStore.setState(
      {
        ...original,
        activeTab: 'workbench',
        activeSequenceId: 'flow-recovery-plan',
        activeTitle: '호흡·코어 기초 수업',
        activeSteps: sampleSteps,
        activeTargetMinutes: 50,
        activeApparatus: 'mat',
        activeLevel: '1.0',
        exercises: [warmupExercise, coreExercise],
        draftCriteria: criteria,
        lastCriteria: null,
        ownedEquipment: ['mat'],
        ownedApparatus: ['mat'],
        ownedProps: [],
        savedSequences: [],
        historyLogs: [],
        undoStack: [],
      },
      true,
    );
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalWidth,
    });
    usePilatesStore.setState(original, true);
  });

  it('renders mobile step navigation bar with >=44px touch height, keep-all wrapping, and step transitions', () => {
    render(
      <SequenceWorkbench
        onOpenClipper={vi.fn()}
        onOpenYouTubePreview={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    const stepBar = screen.getByTestId('workbench-mobile-step-bar');
    expect(stepBar).toHaveAttribute('aria-label', '수업 준비 단계 이동');
    expect(stepBar.style.wordBreak).toBe('keep-all');

    const prevBtn = screen.getByTestId('workbench-step-prev');
    const nextBtn = screen.getByTestId('workbench-step-next');

    expect(prevBtn).toHaveTextContent('이전 단계: 동작 고르기');
    expect(nextBtn).toHaveTextContent('다음 단계: 수업 구성 확인');
    expect(prevBtn.style.minHeight).toBe('44px');
    expect(nextBtn.style.minHeight).toBe('44px');
    expect(prevBtn.style.wordBreak).toBe('keep-all');
    expect(nextBtn.style.wordBreak).toBe('keep-all');

    // Initial state with activeSteps is step 2 ('arrange') when sessionStorage is empty
    expect(nextBtn).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('workbench-current-step-guide')).toHaveTextContent(
      '현재 2단계: 수업 구성 확인',
    );

    // Switch back to step 1 ('select') via previous step button
    fireEvent.click(prevBtn);
    expect(prevBtn).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('workbench-current-step-guide')).toHaveTextContent(
      '현재 1단계: 동작 고르기',
    );

    const savedSelect = JSON.parse(
      window.sessionStorage.getItem(WORKBENCH_PREP_RECOVERY_KEY) ?? '{}',
    );
    expect(savedSelect.workflowStep).toBe('select');
    expect(savedSelect.activeStep).toBe('finder');

    // Switch forward to step 2 ('arrange') via next step button
    fireEvent.click(nextBtn);
    expect(nextBtn).toHaveAttribute('aria-current', 'step');
    const savedArrange = JSON.parse(
      window.sessionStorage.getItem(WORKBENCH_PREP_RECOVERY_KEY) ?? '{}',
    );
    expect(savedArrange.workflowStep).toBe('arrange');
    expect(savedArrange.activeStep).toBe('arrange');
  });

  it('recovers active mobile workbench step and conditions modal state across unmount/remount', () => {
    const firstRender = render(
      <SequenceWorkbench
        onOpenClipper={vi.fn()}
        onOpenYouTubePreview={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    // Move to step 1 and open conditions dialog at step 2 ('2 사용할 기구')
    fireEvent.click(screen.getByTestId('workbench-step-prev'));
    const conditionsButtons = screen.getAllByRole('button', { name: /수업 조건/ });
    fireEvent.click(conditionsButtons[0]);

    const equipmentTab = screen.getByRole('button', { name: '2 사용할 기구' });
    fireEvent.click(equipmentTab);

    const savedRecovery = JSON.parse(
      window.sessionStorage.getItem(WORKBENCH_PREP_RECOVERY_KEY) ?? '{}',
    );
    expect(savedRecovery.workflowStep).toBe('select');
    expect(savedRecovery.conditionsOpen).toBe(true);
    expect(savedRecovery.conditionStep).toBe(2);

    // Simulate switching workspace tab / unmounting and remounting
    firstRender.unmount();

    render(
      <SequenceWorkbench
        onOpenClipper={vi.fn()}
        onOpenYouTubePreview={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    expect(screen.getByTestId('workbench-step-prev')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: '2 사용할 기구' })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('recovers open step block inspector and in-progress note edits across tab switches and narrow mobile viewports', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 360,
    });

    const firstRender = render(
      <SequenceWorkbench
        onOpenClipper={vi.fn()}
        onOpenYouTubePreview={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    // Open step inspector for first step
    const stepEditBtn = screen.getByRole('button', { name: '1번 동작 블록 편집' });
    fireEvent.click(stepEditBtn);

    const topSummary = screen.getByTestId('step-inspector-top-summary');
    expect(within(topSummary).getByTestId('step-inspector-current-label')).toHaveTextContent(
      '현재 편집 중인 블록',
    );
    expect(within(topSummary).getByTestId('step-inspector-quick-badge')).toHaveTextContent(
      '동작 블록 · 01',
    );

    const noteTextarea = screen.getByLabelText('이번 수업 티칭 메모');
    fireEvent.change(noteTextarea, {
      target: { value: '임산부 회원 호흡 템포 천천히 안내' },
    });

    const savedRecovery = JSON.parse(
      window.sessionStorage.getItem(WORKBENCH_PREP_RECOVERY_KEY) ?? '{}',
    );
    expect(savedRecovery.previewStep).toBe('step-hundred');
    expect(savedRecovery.inspectorDraft?.draft?.note).toBe(
      '임산부 회원 호흡 템포 천천히 안내',
    );

    // Unmount and remount to simulate mid-flow tab switch / reload
    firstRender.unmount();

    render(
      <SequenceWorkbench
        onOpenClipper={vi.fn()}
        onOpenYouTubePreview={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    expect(screen.getByTestId('step-inspector-current-label')).toHaveTextContent(
      '현재 편집 중인 블록',
    );
    expect(screen.getByLabelText('이번 수업 티칭 메모')).toHaveValue(
      '임산부 회원 호흡 템포 천천히 안내',
    );
  });

  it('persists non-empty inline finder search query across remounts and resets search+filters in one click on 0 results', () => {
    const firstFinder = render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: warmupExercise.nameKo } });
    expect(window.sessionStorage.getItem(INLINE_FINDER_QUERY_STORAGE_KEY)).toBe(
      warmupExercise.nameKo,
    );

    // Unmount and remount InlineExerciseFinder
    firstFinder.unmount();

    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);

    const restoredInput = screen.getByRole('searchbox');
    expect(restoredInput).toHaveValue(warmupExercise.nameKo);

    // Enter a query that yields 0 results
    fireEvent.change(restoredInput, { target: { value: '존재하지않는초장문동작이름검색어' } });
    expect(screen.getByText('조건에 맞는 동작이 없어요')).toBeInTheDocument();

    const resetBtn = screen.getByTestId('ief-empty-reset-btn');
    expect(resetBtn).toHaveTextContent('검색·필터 초기화');
    expect(resetBtn.style.minHeight).toBe('44px');

    fireEvent.click(resetBtn);
    expect(restoredInput).toHaveValue('');
    expect(window.sessionStorage.getItem(INLINE_FINDER_QUERY_STORAGE_KEY)).toBeNull();
    expect(screen.queryByText('조건에 맞는 동작이 없어요')).not.toBeInTheDocument();
  });

  it('preserves StepBlockInspector in-progress edits on 320px/360px/390px viewports with clear top summary', () => {
    for (const width of [320, 360, 390]) {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      });
      const step = usePilatesStore.getState().activeSteps[0];
      const { unmount } = render(
        <StepBlockInspector
          index={0}
          step={step}
          onClose={vi.fn()}
          onOpenExercise={vi.fn()}
          onReplace={vi.fn()}
        />,
      );

      expect(screen.getByTestId('step-inspector-current-label')).toHaveTextContent(
        '현재 편집 중인 블록',
      );
      expect(screen.getByTestId('step-inspector-step-order-badge')).toHaveTextContent('1/2단계');

      const memoField = screen.getByLabelText('이번 수업 티칭 메모');
      fireEvent.change(memoField, { target: { value: `${width}px 메모 유지 확인` } });
      expect(screen.getByTestId('step-inspector-dirty-badge')).toHaveTextContent(
        '작성 중 메모·설정 보관됨',
      );
      expect(window.sessionStorage.getItem(STEP_INSPECTOR_DRAFT_STORAGE_KEY)).toContain(
        `${width}px 메모 유지 확인`,
      );

      unmount();
    }
  });
});
