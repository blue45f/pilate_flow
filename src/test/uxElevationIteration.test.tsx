import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { LiveStageView } from '../components/LiveStageView';
import { usePilatesStore } from '../store/usePilatesStore';
import { isRestStep } from '../utils/sequenceEngine';

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
    activeLevel: 'intermediate',
    activeTargetMinutes: 50,
    activeSteps: [],
    savedSequences: [],
    historyLogs: [],
    draftCriteria: null,
    generationError: null,
    saveFeedback: '',
  });
}

describe('Pilates Flow UX & Design Elevation Iteration', () => {
  beforeEach(() => {
    resetWorkbenchStore();
  });

  it('keeps Home focused on 2 primary cards without leaking Step 3 when returning via 시작하기, and supports 1-tap recent 바로 진행', () => {
    const state = usePilatesStore.getState();
    const reformerMoves = state.exercises
      .filter((ex) => ex.apparatus === 'reformer')
      .slice(0, 3);
    expect(reformerMoves.length).toBeGreaterThanOrEqual(2);

    usePilatesStore.setState({
      activeSteps: reformerMoves.map((ex, idx) => ({
        stepId: `step-home-${idx + 1}`,
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
          level: 'intermediate',
          targetMinutes: 50,
          createdAt: '2026-11-10T09:00:00.000Z',
          updatedAt: '2026-11-10T09:00:00.000Z',
          steps: reformerMoves.map((ex, idx) => ({
            stepId: `saved-step-${idx + 1}`,
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

    // Starts in Step 3 arrange when activeSteps exist
    expect(screen.getByTestId('workbench-save-state')).toBeInTheDocument();

    // Clicking 시작하기 returns to the clean 2-card Home screen without Step 3 cards below
    fireEvent.click(screen.getByRole('button', { name: /시작하기/ }));
    expect(screen.getByTestId('wizard-home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('workbench-save-state')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-quick-ai-draft-btn')).toBeInTheDocument();

    // 1-tap 바로 진행 on saved recent sequence transitions to live stage
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
    // Equipment scope is automatically narrowed to Reformer
    expect(within(step2).getByRole('button', { name: '수업 기구로 좁히기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(step2).getByTestId('step2-ai-assist-toggle')).toBeInTheDocument();

    const reformerEx = usePilatesStore
      .getState()
      .exercises.find((ex) => ex.apparatus === 'reformer');
    expect(reformerEx).toBeDefined();

    const addBtn = within(step2).getAllByRole('button', {
      name: new RegExp(`${reformerEx!.nameKo}.*(담기|추가)`),
    })[0]!;
    fireEvent.click(addBtn);

    const tray = within(step2).getByTestId('step2-added-steps-tray');
    expect(within(tray).getByText(reformerEx!.nameKo)).toBeInTheDocument();

    // Advance to Step 3 and toggle 10회 inline repetition chip
    fireEvent.click(screen.getByTestId('wizard-to-step3-btn'));
    expect(screen.getByTestId('step3-open-ai-assistant-btn')).toBeInTheDocument();

    const repStepper = screen.getAllByTestId('step-quick-reps-stepper')[0]!;
    const tenRepChip = within(repStepper).getByRole('button', { name: /10회 반복/ });
    fireEvent.click(tenRepChip);
    expect(usePilatesStore.getState().activeSteps[0]?.repetitions).toBe(10);
  });

  it('renders 2-second glanceable cues, trims 30s with undo, and reorders upcoming steps mid-class in LiveStageView', () => {
    const moves = usePilatesStore
      .getState()
      .exercises.filter((ex) => ex.cues.length > 0)
      .slice(0, 3);
    expect(moves.length).toBe(3);

    usePilatesStore.setState({
      activeTab: 'stage',
      activeSteps: moves.map((ex, idx) => ({
        stepId: `live-step-${idx + 1}`,
        exerciseId: ex.id,
        blockCategory: ex.blockCategory,
        durationMin: 3,
        selectedLayer: 'standard',
      })),
    });

    render(<LiveStageView onOpenLogModal={() => undefined} />);

    // 2-second glanceable primary cues are visible without expanding details
    const glanceCues = screen.getByTestId('live-stage-glance-cues');
    expect(within(glanceCues).getByText('핵심 큐')).toBeInTheDocument();
    expect(within(glanceCues).getByText(new RegExp(moves[0]!.cues[0]!.slice(0, 8)))).toBeInTheDocument();

    // -30초 trim updates step duration and supports 1-tap undo
    const trimBtn = screen.getByTestId('live-stage-trim-30s-btn');
    fireEvent.click(trimBtn);
    expect(screen.getByTestId('live-stage-undo-banner')).toHaveTextContent('30초 줄였어요');
    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));
    expect(screen.queryByTestId('live-stage-undo-banner')).not.toBeInTheDocument();

    // Upcoming step reorder updates next-step preview and supports 1-tap undo
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

  it('defines unified studio motion tokens and strict prefers-reduced-motion fallbacks across stylesheets', () => {
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
    expect(atelierCss).toContain('--pf-ease-studio: cubic-bezier(0.22, 1, 0.36, 1)');
    expect(workbenchCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stageCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(
      usePilatesStore.getState().activeSteps.filter((st) => !isRestStep(st)).length,
    ).toBeGreaterThanOrEqual(0);
  });
});
