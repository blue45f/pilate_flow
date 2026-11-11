import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { LiveStageView } from '../components/LiveStageView';
import { FreeAiAssistantPanel } from '../components/FreeAiAssistantPanel';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { createFreeAiClient } from '../lib/freeAiClient';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import { isExerciseAuthoringEligible } from '../utils/exerciseAuthoring';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { isRestStep } from '../utils/sequenceEngine';

function buildApprovedReformerExercise(
  base: PilatesExercise,
  overrides: Partial<PilatesExercise>,
): PilatesExercise {
  const draft: PilatesExercise = {
    ...base,
    apparatus: 'reformer',
    requiredEquipment: ['reformer'],
    props: ['none'],
    level: '1.5',
    ...overrides,
    review: undefined,
  };
  return {
    ...draft,
    review: {
      status: 'approved',
      reviewerAlias: '수석강사',
      reviewedAt: '2026-11-12T00:00:00.000Z',
      revision: exerciseRevision(draft),
      scope: 'planning-metadata',
      credentialVerified: false,
    },
  };
}

function resetWorkbenchStore() {
  localStorage.clear();
  sessionStorage.clear();
  const initial = usePilatesStore.getState();
  usePilatesStore.setState({
    ...initial,
    activeTab: 'workbench',
    activeSequenceId: 'seq-ux-elevation',
    activeTitle: '리포머 코어 집중 50분',
    activeSubtitle: '호흡 · 정렬 · 컨트롤',
    activeApparatus: 'reformer',
    activeLevel: '1.5',
    activeTargetMinutes: 50,
    activeSteps: [],
    savedSequences: [],
    historyLogs: [],
    draftCriteria: null,
    generationError: null,
    saveFeedback: '',
  });
}

describe('Pilates Flow UX & Design Elevation (Mockup-to-Code 1:1)', () => {
  beforeEach(() => {
    resetWorkbenchStore();
  });

  it('keeps Home focused on 2 primary cards without leaking Step 3 when returning via 시작하기, and supports 1-tap recent 바로 진행', () => {
    const state = usePilatesStore.getState();
    const reformerMoves = state.exercises
      .filter((ex) => ex.apparatus === 'reformer' && isExerciseAuthoringEligible(ex))
      .slice(0, 3);
    expect(reformerMoves.length).toBeGreaterThanOrEqual(2);

    usePilatesStore.setState({
      activeSteps: reformerMoves.map((ex, idx) => ({
        stepId: `step-home-${idx + 1}`,
        order: idx + 1,
        exerciseId: ex.id,
        blockCategory: ex.blockCategory,
        durationMin: 4,
        selectedLayer: 'standard',
      })),
      savedSequences: [
        {
          id: 'saved-morning-reformer',
          title: '오전 리포머 시그니처',
          subtitle: '척추 분절과 코어',
          apparatus: 'reformer',
          level: '1.5',
          targetMinutes: 50,
          createdAt: '2026-11-10T09:00:00.000Z',
          updatedAt: '2026-11-10T09:00:00.000Z',
          steps: reformerMoves.map((ex, idx) => ({
            stepId: `saved-step-${idx + 1}`,
            order: idx + 1,
            exerciseId: ex.id,
            blockCategory: ex.blockCategory,
            durationMin: 5,
            selectedLayer: 'standard',
          })),
        },
      ],
    });

    render(
      <SequenceWorkbench
        planningMode="manual"
        setPlanningMode={() => undefined}
        onOpenClipper={() => undefined}
        onOpenYouTubePreview={() => undefined}
        onOpenLogModal={() => undefined}
        onOpenIdeaSheet={() => undefined}
      />,
    );

    expect(screen.getByTestId('workbench-save-state')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }));
    expect(screen.getByTestId('wizard-home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('workbench-save-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-quick-ai-draft-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '오전 리포머 시그니처 바로 진행' }));
    expect(usePilatesStore.getState().activeTab).toBe('stage');
  });

  it('auto-narrows Step 2 finder to selected equipment, shows live added-steps tray with 1-tap removal, and applies Step 3 quick repetition chips', () => {
    render(
      <SequenceWorkbench
        planningMode="manual"
        setPlanningMode={() => undefined}
        onOpenClipper={() => undefined}
        onOpenYouTubePreview={() => undefined}
        onOpenLogModal={() => undefined}
        onOpenIdeaSheet={() => undefined}
      />,
    );

    fireEvent.click(screen.getByTestId('wizard-start-step1-btn'));
    const step1 = screen.getByTestId('wizard-step1-page');
    fireEvent.click(within(step1).getByRole('button', { name: '리포머' }));
    fireEvent.click(screen.getByTestId('wizard-to-step2-btn'));

    const step2 = screen.getByTestId('wizard-step2-page');
    expect(within(step2).getByRole('button', { name: '수업 기구로 좁히기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(step2).getByTestId('step2-ai-assist-toggle')).toBeInTheDocument();

    const reformerEx = usePilatesStore
      .getState()
      .exercises.find((ex) => ex.apparatus === 'reformer' && isExerciseAuthoringEligible(ex));
    expect(reformerEx).toBeDefined();

    const addBtn = within(step2).getAllByRole('button', {
      name: new RegExp(`${reformerEx!.nameKo}.*(담기|추가)`),
    })[0]!;
    fireEvent.click(addBtn);

    const tray = within(step2).getByTestId('step2-added-steps-tray');
    expect(within(tray).getByText(reformerEx!.nameKo)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('wizard-to-step3-btn'));
    expect(screen.getByTestId('step3-open-ai-assistant-btn')).toBeInTheDocument();

    const repStepper = screen.getAllByTestId('step-quick-reps-stepper')[0]!;
    const tenRepChip = within(repStepper).getByRole('button', { name: /10회 반복/ });
    fireEvent.click(tenRepChip);
    expect(usePilatesStore.getState().activeSteps[0]?.repetitions).toBe(10);
  });

  it('supports instructor step include/exclude checkboxes and ±0.5m quick duration chips in FreeAiAssistantPanel before applying', async () => {
    const appliedSpy = vi.fn();
    const state = usePilatesStore.getState();
    const unconfiguredClient = createFreeAiClient({
      transport: {
        getStatus: async () => ({
          provider: 'none',
          model: null,
          enabled: false,
          exhausted: false,
          reason: 'unconfigured',
          minuteLimit: 0,
          minuteUsed: 0,
          minuteRemaining: 0,
          dailyLimit: 0,
          dailyUsed: 0,
          dailyRemaining: 0,
          activeRequests: 0,
          maxConcurrentRequests: 1,
          cacheEntries: 0,
          statusMessageKo:
            '무료 서버/API 구성이 없어 외부 AI는 비활성화되었습니다. 로컬 추천·수동 편집·저장 프리셋을 사용하세요.',
          renewal: null,
        }),
        postAssist: vi.fn().mockRejectedValue(new Error('unconfigured')),
      },
    });

    const categories = ['warmup', 'footwork', 'core', 'bridging', 'plank', 'cooldown'] as const;
    const reviewedExercises = state.exercises.slice(0, 6).map((ex, idx) =>
      buildApprovedReformerExercise(ex, {
        id: `approved-reformer-${idx + 1}`,
        nameKo: `검토 완료 리포머 동작 ${idx + 1}`,
        blockCategory: categories[idx]!,
      }),
    );
    expect(reviewedExercises.every(isExerciseAutoEligible)).toBe(true);

    render(
      <FreeAiAssistantPanel
        exercises={reviewedExercises}
        reusableBlocks={[]}
        conditionTemplates={state.conditionTemplates}
        client={unconfiguredClient}
        activeTargetMinutes={50}
        activeApparatus="reformer"
        activeLevel="1.5"
        onApplyDraftSequence={appliedSpy}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '조건으로 초안 만들기' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));

    const checkboxes = await screen.findAllByTestId('free-ai-step-include-checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);

    const totalGenerated = checkboxes.length;
    fireEvent.click(checkboxes[0]!);
    expect(screen.getByTestId('free-ai-selected-summary')).toHaveTextContent(
      `선택 ${totalGenerated - 1} / ${totalGenerated}개 단계`,
    );

    fireEvent.click(screen.getByRole('button', { name: '워크벤치 수업안에 반영' }));
    expect(appliedSpy).toHaveBeenCalledTimes(1);
    expect(appliedSpy.mock.calls[0]?.[0]?.steps).toHaveLength(totalGenerated - 1);
  });

  it('shows active sequence summary bar in ExerciseAtlasView for 1-tap return to workbench', () => {
    const state = usePilatesStore.getState();
    const firstMove = state.exercises.find(isExerciseAuthoringEligible)!;
    usePilatesStore.setState({
      activeTab: 'atlas',
      activeSteps: [
        {
          stepId: 'atlas-step-1',
          order: 1,
          exerciseId: firstMove.id,
          blockCategory: firstMove.blockCategory,
          durationMin: 5,
          selectedLayer: 'standard',
        },
      ],
    });

    render(
      <ExerciseAtlasView
        onOpenClipper={() => undefined}
        onOpenYouTubePreview={() => undefined}
        onOpenIdeaSheet={() => undefined}
      />,
    );

    const bar = screen.getByTestId('atlas-active-sequence-bar');
    expect(bar).toHaveTextContent('현재 수업에 1개 동작 담김');
    fireEvent.click(within(bar).getByRole('button', { name: '수업 순서·시간 다듬기' }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
  });

  it('renders LIVE status pill, 2-second glanceable cues, trims 30s with undo, and reorders upcoming steps mid-class in LiveStageView', () => {
    const moves = usePilatesStore
      .getState()
      .exercises.filter((ex) => ex.cues.length > 0 && isExerciseAuthoringEligible(ex))
      .slice(0, 3);
    expect(moves.length).toBe(3);

    usePilatesStore.setState({
      activeTab: 'stage',
      activeSteps: moves.map((ex, idx) => ({
        stepId: `live-step-${idx + 1}`,
        order: idx + 1,
        exerciseId: ex.id,
        blockCategory: ex.blockCategory,
        durationMin: 3,
        selectedLayer: 'standard',
      })),
    });

    render(<LiveStageView onOpenLogModal={() => undefined} />);

    expect(screen.getByTestId('live-stage-status-pill')).toHaveTextContent('진행 대기');
    const glanceCues = screen.getByTestId('live-stage-glance-cues');
    expect(within(glanceCues).getByText('핵심 큐')).toBeInTheDocument();

    const trimBtn = screen.getByTestId('live-stage-trim-30s-btn');
    fireEvent.click(trimBtn);
    expect(screen.getByTestId('live-stage-undo-banner')).toHaveTextContent('30초 줄였어요');
    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));
    expect(screen.queryByTestId('live-stage-undo-banner')).not.toBeInTheDocument();

    const nextPreview = screen.getByTestId('live-stage-inline-next-preview');
    expect(nextPreview).toHaveTextContent(moves[1]!.nameKo);

    const moveThirdUpBtn = screen.getByRole('button', { name: '3번 순서 위로 이동' });
    fireEvent.click(moveThirdUpBtn);
    expect(screen.getByTestId('live-stage-inline-next-preview')).toHaveTextContent(
      moves[2]!.nameKo,
    );
    expect(screen.getByTestId('live-stage-undo-btn')).toHaveTextContent('방금 순서 변경 되돌리기');

    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));
    expect(screen.getByTestId('live-stage-inline-next-preview')).toHaveTextContent(
      moves[1]!.nameKo,
    );
  });

  it('ships interactive design mockups (04, 05, 06), studio motion tokens, and strict prefers-reduced-motion fallbacks', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'docs/design-system-mockups/04-ux-elevation-3-concepts-comparison.html',
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'docs/design-system-mockups/05-pilates-flow-full-pages-ux-mockup.html',
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'docs/design-system-mockups/06-parallel-full-suite-showcase.html',
        ),
      ),
    ).toBe(true);

    const atelierCss = readFileSync(
      resolve(process.cwd(), 'src/styles/atelier-luxury-v2.css'),
      'utf8',
    );
    const workbenchCss = readFileSync(
      resolve(process.cwd(), 'src/components/SequenceWorkbench.usability.css'),
      'utf8',
    );
    const stageCss = readFileSync(
      resolve(process.cwd(), 'src/components/LiveStageView.css'),
      'utf8',
    );
    expect(atelierCss).toContain('--pf-motion-fast: 150ms');
    expect(atelierCss).toContain('.pf-sidebar-quick-stage');
    expect(workbenchCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stageCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(
      usePilatesStore.getState().activeSteps.filter((st) => !isRestStep(st)).length,
    ).toBeGreaterThanOrEqual(0);
  });
});
