import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { InlineExerciseFinder } from '../components/InlineExerciseFinder';
import { FreeAiAssistantPanel } from '../components/FreeAiAssistantPanel';
import { LiveStageView } from '../components/LiveStageView';
import { createFreeAiClient } from '../lib/freeAiClient';
import { stepSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import { isExerciseAuthoringEligible } from '../utils/exerciseAuthoring';

describe('First-Time Instructor Simplification, Empty/Error Recovery & Save/Restore', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    const initial = usePilatesStore.getState();
    usePilatesStore.setState({
      ...initial,
      activeTab: 'workbench',
      activeSequenceId: 'seq-recovery-test',
      activeTitle: '첫 수업 완성 흐름 검증',
      activeSubtitle: '',
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
  });

  it('provides 1-tap starter draft in Step 2 empty state and 1-tap saved-version restore in Step 3', () => {
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
    fireEvent.click(screen.getByTestId('wizard-to-step2-btn'));

    // Empty Step 2 shows starter guidance & 1-tap starter fill button
    expect(screen.getByTestId('step2-empty-starter-bar')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('step2-quick-starter-btn'));
    expect(usePilatesStore.getState().activeSteps.length).toBeGreaterThan(0);

    // Save current sequence, then edit title -> dirty state shows 1-tap restore button
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('저장됨');

    const originalTitle = usePilatesStore.getState().activeTitle;
    fireEvent.change(screen.getByRole('textbox', { name: '시퀀스 제목' }), {
      target: { value: '임시 변경 제목' },
    });
    expect(screen.getByTestId('workbench-save-state')).toHaveTextContent('변경사항 있음');

    const restoreBtn = screen.getByTestId('workbench-restore-saved-btn');
    fireEvent.click(restoreBtn);
    expect(usePilatesStore.getState().activeTitle).toBe(originalTitle);
  });

  it('clears query on Escape and offers 1-tap equipment unscope in InlineExerciseFinder empty state', () => {
    render(
      <InlineExerciseFinder
        active
        autoNarrowToClassEquipment
        classEquipment={['reformer']}
        onOpenExercise={() => undefined}
      />,
    );

    const input = screen.getByRole('searchbox', { name: /동작 이름 또는 등록된 부위 태그 검색/ });
    fireEvent.change(input, { target: { value: '존재하지않는희귀동작999' } });
    expect(screen.getByTestId('ief-empty-unscope-equipment-btn')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
  });

  it('shows actionable starter & finder recovery buttons in FreeAiAssistantPanel when 0 reviewed exercises exist', async () => {
    const fillStarterSpy = vi.fn();
    const openFinderSpy = vi.fn();
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
          statusMessageKo: '로컬 추천 모드',
          renewal: null,
        }),
        postAssist: vi.fn().mockRejectedValue(new Error('unconfigured')),
      },
    });

    render(
      <FreeAiAssistantPanel
        exercises={usePilatesStore.getState().exercises.map((ex) => ({ ...ex, review: undefined }))}
        reusableBlocks={[]}
        conditionTemplates={[]}
        client={unconfiguredClient}
        onFillStarterSequence={fillStarterSpy}
        onOpenExerciseFinder={openFinderSpy}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '조건으로 초안 만들기' })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));

    const recoveryBox = await screen.findByTestId('free-ai-empty-recovery');
    expect(recoveryBox).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('free-ai-fill-starter-btn'));
    expect(fillStarterSpy).toHaveBeenCalledTimes(1);
  });

  it('preserves positive sequential stepSchema order (1..N) after mid-class step reorder and ships 07 spec', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'docs/design-system-mockups/07-first-time-flow-and-recovery-spec.html',
        ),
      ),
    ).toBe(true);

    const moves = usePilatesStore
      .getState()
      .exercises.filter((ex) => ex.cues.length > 0 && isExerciseAuthoringEligible(ex))
      .slice(0, 3);
    const initialSteps = moves.map((ex, idx) => ({
      stepId: `ord-${idx + 1}`,
      order: idx + 1,
      exerciseId: ex.id,
      blockCategory: ex.blockCategory,
      durationMin: 3,
      selectedLayer: 'standard' as const,
    }));
    expect(initialSteps.every((st) => stepSchema.safeParse(st).success)).toBe(true);

    usePilatesStore.setState({ activeTab: 'stage', activeSteps: initialSteps });
    render(<LiveStageView onOpenLogModal={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: '3번 순서 위로 이동' }));
    expect(screen.getByTestId('live-stage-inline-next-preview')).toHaveTextContent(
      moves[2]!.nameKo,
    );
  });
});
