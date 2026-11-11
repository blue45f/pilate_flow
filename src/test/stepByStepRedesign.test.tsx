import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { LiveStageView } from '../components/LiveStageView';
import { ClassBinderView } from '../components/ClassBinderView';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { FreeAiAssistantPanel } from '../components/FreeAiAssistantPanel';
import { usePilatesStore } from '../store/usePilatesStore';
import { createDefaultFreeAiStatus } from '../lib/freeAiClient';

const initialStoreState = usePilatesStore.getState();

beforeEach(() => {
  usePilatesStore.setState(initialStoreState, true);
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(initialStoreState, true);
  vi.restoreAllMocks();
});

describe('Step-by-step guided flow & design mockup alignment upgrades', () => {
  it('renders Step 0 clean 2-card choice frame, interactive 5-tab stepper, and quick duration chips without mutating store on mount', () => {
    usePilatesStore.setState({
      activeSteps: [],
      activeTargetMinutes: 50,
      draftCriteria: null,
      lastCriteria: null,
      generationError: null,
    });
    const beforeMount = usePilatesStore.getState().activeTargetMinutes;

    render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    expect(usePilatesStore.getState().activeTargetMinutes).toBe(beforeMount);

    const stepHeader = screen.getByTestId('workbench-step-flow-header');
    expect(stepHeader).toBeVisible();
    expect(within(stepHeader).getByRole('button', { name: /시작하기/ })).toBeVisible();
    expect(within(stepHeader).getByRole('button', { name: /수업 기본/ })).toBeVisible();
    expect(within(stepHeader).getByRole('button', { name: /동작 담기/ })).toBeVisible();
    expect(within(stepHeader).getByRole('button', { name: /순서·시간 확인/ })).toBeDisabled();
    expect(within(stepHeader).getByRole('button', { name: /미리보기·진행/ })).toBeDisabled();

    expect(screen.getByTestId('wizard-home-page')).toBeVisible();

    const quickBar = screen.getByTestId('step1-quick-duration-chips');
    const btn30 = within(quickBar).getByRole('button', { name: '30분' });
    expect(btn30).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(btn30);
    expect(usePilatesStore.getState().activeTargetMinutes).toBe(30);
    expect(within(quickBar).getByRole('button', { name: '30분' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('transitions across isolated pages: 시작하기 -> 1. 수업 기본 -> 2. 동작 담기 (inline catalog) -> 3. 순서·시간 확인', () => {
    usePilatesStore.setState({
      activeSteps: [],
      activeTargetMinutes: 50,
      ownedEquipment: ['reformer', 'mat', 'chair'],
      ownedApparatus: ['reformer', 'mat', 'chair'],
      draftCriteria: null,
      lastCriteria: null,
      generationError: null,
    });

    render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    // 0 -> 1. 수업 기본 전용 페이지
    fireEvent.click(screen.getByTestId('wizard-start-step1-btn'));
    const step1Page = screen.getByTestId('wizard-step1-page');
    expect(step1Page).toBeVisible();
    expect(screen.queryByTestId('wizard-home-page')).toBeNull();
    expect(screen.queryByRole('region', { name: '오늘의 시퀀스' })).toBeNull();

    fireEvent.click(within(step1Page).getByRole('button', { name: '60분' }));
    expect(usePilatesStore.getState().activeTargetMinutes).toBe(60);
    fireEvent.click(within(step1Page).getByRole('button', { name: '리포머' }));
    expect(usePilatesStore.getState().activeApparatus).toBe('reformer');

    // 1 -> 2. 동작 담기 전용 페이지 (인라인 카탈로그)
    fireEvent.click(screen.getByTestId('wizard-to-step2-btn'));
    const step2Page = screen.getByTestId('wizard-step2-page');
    expect(step2Page).toBeVisible();
    expect(screen.queryByTestId('wizard-step1-page')).toBeNull();

    const toStep3Btn = screen.getByTestId('wizard-to-step3-btn');
    expect(toStep3Btn).toBeDisabled();

    // Add first eligible Reformer exercise directly inside Step 2 page
    const reformerEx = usePilatesStore
      .getState()
      .exercises.find(
        (ex) => ex.apparatus === 'reformer' && ex.props.every((p) => p === 'none'),
      )!;
    const addBtn = within(step2Page).getByRole('button', {
      name: new RegExp(`${reformerEx.nameKo}.*(담기|추가)`),
    });
    fireEvent.click(addBtn);
    expect(usePilatesStore.getState().activeSteps.length).toBe(1);
    expect(screen.getByTestId('wizard-step2-page')).toBeVisible();
    expect(screen.getByTestId('wizard-to-step3-btn')).toBeEnabled();

    // 2 -> 3. 순서·시간 확인 전용 페이지
    fireEvent.click(screen.getByTestId('wizard-to-step3-btn'));
    expect(screen.queryByTestId('wizard-step2-page')).toBeNull();
    expect(screen.getByRole('region', { name: '오늘의 시퀀스' })).toBeVisible();
  });

  it('provides inline -0.5분 / +0.5분 quick duration steppers on Step 3 exercise rows with undo support', () => {
    const firstEx = usePilatesStore.getState().exercises[0]!;
    usePilatesStore.setState({
      activeTitle: '단계형 테스트 수업',
      activeTargetMinutes: 50,
      activeSteps: [
        {
          stepId: 'step-inline-1',
          order: 1,
          exerciseId: firstEx.id,
          blockCategory: firstEx.blockCategory,
          durationMin: 4,
          selectedLayer: 'standard',
          instructorNote: '',
        },
      ],
      undoStack: [],
    });

    render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );

    const plusBtn = screen.getByRole('button', { name: '1번 동작 30초 늘리기' });
    const minusBtn = screen.getByRole('button', { name: '1번 동작 30초 줄이기' });
    expect(plusBtn).toBeVisible();
    expect(minusBtn).toBeVisible();

    fireEvent.click(plusBtn);
    expect(usePilatesStore.getState().activeSteps[0]?.durationMin).toBe(4.5);

    fireEvent.click(minusBtn);
    expect(usePilatesStore.getState().activeSteps[0]?.durationMin).toBe(4);

    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps[0]?.durationMin).toBe(4.5);
  });

  it('shows glanceable breath callout, tactile spring pills, and inline next-step preview in LiveStageView', () => {
    const [ex1, ex2] = usePilatesStore.getState().exercises;
    usePilatesStore.setState({
      activeTitle: '라이브 스테이지 검증',
      activeTargetMinutes: 30,
      activeSteps: [
        {
          stepId: 'live-1',
          order: 1,
          exerciseId: ex1!.id,
          blockCategory: ex1!.blockCategory,
          durationMin: 5,
          selectedLayer: 'standard',
          instructorNote: '',
        },
        {
          stepId: 'live-2',
          order: 2,
          exerciseId: ex2!.id,
          blockCategory: ex2!.blockCategory,
          durationMin: 5,
          selectedLayer: 'standard',
          instructorNote: '',
          customSpringOverride: '1 Red · 1 Blue',
        },
      ],
    });

    render(<LiveStageView onOpenLogModal={vi.fn()} />);

    expect(screen.getByTestId('live-stage-breath-callout')).toBeVisible();

    const nextPreview = screen.getByTestId('live-stage-inline-next-preview');
    expect(nextPreview).toBeVisible();
    expect(within(nextPreview).getByText(ex2!.nameKo)).toBeVisible();
    expect(within(nextPreview).getByText(/1 Red · 1 Blue/)).toBeVisible();

    const cueSummary = screen.getByText('티칭 큐와 메모', { selector: 'summary' });
    fireEvent.click(cueSummary);
    const cueSection = cueSummary.closest('details');
    expect(cueSection).toHaveAttribute('open');
    const cueList = within(cueSection!).getByRole('list');
    expect(within(cueList).getByText(ex1!.cues[0]!)).toBeVisible();
  });

  it('renders the 5-phase continuous kinematic Reformer schematic showcase inside ExerciseAtlasView', () => {
    render(
      <ExerciseAtlasView
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
      />,
    );

    const showcase = screen.getByTestId('kinematic-schematic-showcase');
    expect(showcase).toBeVisible();
    expect(within(showcase).getByText('리포머 풋워크')).toBeVisible();
    expect(within(showcase).getByText('펠빅 컬 · 브릿징')).toBeVisible();
    expect(within(showcase).getByText('헌드레드')).toBeVisible();
    expect(within(showcase).getByText('롱박스 스완')).toBeVisible();

    const phaseBtns = within(showcase).getAllByRole('button', { name: '3 정점' });
    fireEvent.click(phaseBtns[0]!);
    expect(phaseBtns[0]!).toHaveAttribute('aria-pressed', 'true');
  });

  it('duplicates and opens a saved sequence in 1 tap from ClassBinderView while keeping original intact', () => {
    const saved = usePilatesStore.getState().savedSequences[0]!;
    const initialCount = usePilatesStore.getState().savedSequences.length;
    usePilatesStore.setState({
      activeSteps: [],
      activeTab: 'binder',
    });

    render(<ClassBinderView onOpenLogModal={vi.fn()} />);

    const copyOpenBtn = screen.getByRole('button', {
      name: `${saved.title} 사본으로 열기`,
    });
    expect(copyOpenBtn).toBeVisible();
    fireEvent.click(copyOpenBtn);

    const nextState = usePilatesStore.getState();
    expect(nextState.savedSequences.length).toBe(initialCount + 1);
    expect(nextState.activeTitle).toBe(`${saved.title} (복사)`);
    expect(nextState.activeSequenceId).not.toBe(saved.id);
  });

  it('displays clear non-alarming local-mode guidance and user-registered key badge in FreeAiAssistantPanel', async () => {
    const unconfiguredStatus = {
      ...createDefaultFreeAiStatus(),
      enabled: false,
      reason: 'unconfigured' as const,
      keySource: 'none' as const,
    };
    const mockClient = {
      getQuotaStatus: () => unconfiguredStatus,
      refreshQuotaStatus: async () => unconfiguredStatus,
      requestClassDraft: vi.fn(),
      requestMovementIdea: vi.fn(),
      requestSequenceCompose: vi.fn(),
      requestMovementSearch: vi.fn(),
      clearCache: vi.fn(),
    };

    const { unmount } = render(
      <FreeAiAssistantPanel
        exercises={usePilatesStore.getState().exercises.slice(0, 4)}
        conditionTemplates={[]}
        client={mockClient}
      />,
    );

    const note = await screen.findByTestId('free-ai-unconfigured-note');
    expect(note).toHaveTextContent(
      '서버 AI 키 미설정 · 기기 내 조건 추천과 직접 편집은 그대로 사용할 수 있어요.',
    );
    unmount();

    const userKeyReadyStatus = {
      ...createDefaultFreeAiStatus(),
      provider: 'openai' as const,
      model: 'gpt-4o-mini',
      enabled: true,
      exhausted: false,
      reason: 'ready' as const,
      keySource: 'user-registered' as const,
      minuteRemaining: 10,
      dailyRemaining: 45,
    };
    const userKeyClient = {
      ...mockClient,
      getQuotaStatus: () => userKeyReadyStatus,
      refreshQuotaStatus: async () => userKeyReadyStatus,
    };

    render(
      <FreeAiAssistantPanel
        exercises={usePilatesStore.getState().exercises.slice(0, 4)}
        conditionTemplates={[]}
        client={userKeyClient}
      />,
    );

    expect(await screen.findByText('사용자 등록 키 우선 연결됨')).toBeVisible();
  });
});
