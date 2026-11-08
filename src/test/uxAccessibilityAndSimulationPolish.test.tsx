import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PfTabs } from '../design-system';
import { LightDismissDialog } from '../components/LightDismissDialog';
import { LiveStageView } from '../components/LiveStageView';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import { stepSchema } from '../schemas/cloudBackupSchema';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { exerciseRevision } from '../utils/exerciseReview';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';

const initialStoreState = usePilatesStore.getState();

afterEach(() => {
  cleanup();
  usePilatesStore.setState(initialStoreState, true);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function parseHexToLinearRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').slice(0, 6);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return [toLinear(r), toLinear(g), toLinear(b)];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexToLinearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = relativeLuminance(foregroundHex);
  const l2 = relativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('UX accessibility and simulation polish regressions', () => {
  it('moves PfTabs focus by exactly 1 tab on ArrowRight/ArrowLeft when keyDown originates on a tab trigger', () => {
    const items = [
      { id: 'tab-0', label: '탭 0' },
      { id: 'tab-1', label: '탭 1' },
      { id: 'tab-2', label: '탭 2' },
      { id: 'tab-3', label: '탭 3' },
    ] as const;

    function ControlledTabs() {
      const [active, setActive] = useState<(typeof items)[number]['id']>('tab-0');
      return (
        <PfTabs
          ariaLabel="키보드 탭 검증"
          semantics="tablist"
          items={items}
          value={active}
          onChange={setActive}
        />
      );
    }

    render(<ControlledTabs />);
    const tablist = screen.getByRole('tablist', { name: '키보드 탭 검증' });
    const tab0 = within(tablist).getByRole('tab', { name: '탭 0' });
    const tab1 = within(tablist).getByRole('tab', { name: '탭 1' });
    const tab2 = within(tablist).getByRole('tab', { name: '탭 2' });
    const tab3 = within(tablist).getByRole('tab', { name: '탭 3' });

    act(() => {
      tab0.focus();
    });
    expect(document.activeElement).toBe(tab0);

    fireEvent.keyDown(tab0, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab1);
    expect(tab1).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab2);
    expect(tab2).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tab2, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab3);
    expect(tab3).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(tab3, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab2);
    expect(tab2).toHaveAttribute('aria-selected', 'true');
  });

  it('restores keyboard focus to the opener button when LightDismissDialog closes and unmounts', () => {
    function ModalHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            모달 열기 트리거
          </button>
          {open && (
            <LightDismissDialog
              open={open}
              title="포커스 복원 검증 모달"
              onClose={() => setOpen(false)}
            >
              <p>모달 본문</p>
            </LightDismissDialog>
          )}
        </div>
      );
    }

    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: '모달 열기 트리거' });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '포커스 복원 검증 모달' });
    const closeBtn = within(dialog).getByRole('button', { name: '닫기' });
    closeBtn.focus();
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: '포커스 복원 검증 모달' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('avoids IEEE-754 floating-point false target-mismatch in buildSequenceSimulation and false rejection in stepSchema', () => {
    const baseExercise = structuredClone(INITIAL_EXERCISES[0]) as PilatesExercise;
    const approvedExercise: PilatesExercise = {
      ...baseExercise,
      id: 'qa-ieee754-exercise',
      review: {
        status: 'approved',
        reviewerAlias: 'QA',
        reviewedAt: '2026-11-08T00:00:00Z',
        revision: '',
        scope: 'planning-metadata',
        credentialVerified: false,
      },
    };
    approvedExercise.review!.revision = exerciseRevision(approvedExercise);

    for (const totalSeconds of [29, 58, 115, 250]) {
      const durationMin = totalSeconds / 60;
      const step: SequenceStep = {
        stepId: `step-${totalSeconds}`,
        order: 1,
        blockCategory: approvedExercise.blockCategory,
        exerciseId: approvedExercise.id,
        durationMin,
        selectedLayer: 'standard',
        explanationSec: 10,
        transitionSec: 5,
      };

      const sim = buildSequenceSimulation([step], [approvedExercise], durationMin);
      expect(sim.totals.totalSec).toBe(totalSeconds);
      expect(sim.targetSec).toBe(totalSeconds);
      expect(sim.deltaSec).toBe(0);
      expect(sim.gate.reasons.some((r) => r.code === 'target-mismatch')).toBe(false);
    }

    for (const allocatedSec of [31, 61, 62, 125, 245, 250, 254, 490, 500]) {
      const durationMin = allocatedSec / 60;
      const validBoundaryStep = {
        stepId: `boundary-${allocatedSec}`,
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-1',
        durationMin,
        selectedLayer: 'standard',
        explanationSec: allocatedSec - 10,
        transitionSec: 10,
      };
      expect(stepSchema.safeParse(validBoundaryStep).success).toBe(true);

      const exceedingStep = {
        ...validBoundaryStep,
        transitionSec: 11,
      };
      expect(stepSchema.safeParse(exceedingStep).success).toBe(false);
    }
  });

  it('enforces WCAG AA contrast ratios and prefers-reduced-motion blocks across audited stylesheets', () => {
    const teachingCss = readFileSync(resolve(process.cwd(), 'src/styles/teaching.css'), 'utf8');
    const motionLibraryCss = readFileSync(
      resolve(process.cwd(), 'src/styles/motion-library.css'),
      'utf8',
    );
    const galleryCss = readFileSync(
      resolve(process.cwd(), 'src/styles/motion-pattern-gallery.css'),
      'utf8',
    );
    const previewCss = readFileSync(
      resolve(process.cwd(), 'src/styles/motion-pattern-preview.css'),
      'utf8',
    );
    const mediaGuidanceCss = readFileSync(
      resolve(process.cwd(), 'src/styles/movement-media-guidance.css'),
      'utf8',
    );
    const aiCopilotCss = readFileSync(resolve(process.cwd(), 'src/styles/ai-copilot.css'), 'utf8');

    const youtubeGalleryCss = readFileSync(
      resolve(process.cwd(), 'src/styles/exercise-youtube-gallery.css'),
      'utf8',
    );
    const finderCss = readFileSync(
      resolve(process.cwd(), 'src/styles/inline-exercise-finder.css'),
      'utf8',
    );
    const nextClassBannerCss = readFileSync(
      resolve(process.cwd(), 'src/styles/next-class-banner.css'),
      'utf8',
    );

    // 1. Focus indicator >= 3.0:1 in teaching.css, inline-exercise-finder.css, and next-class-banner.css
    expect(teachingCss).toContain('outline: 3px solid #2d5a4c;');
    expect(contrastRatio('#2d5a4c', '#f7f5ef')).toBeGreaterThanOrEqual(3.0);
    expect(finderCss).toContain('outline-color: #fffdf7;');
    expect(contrastRatio('#fffdf7', '#254d45')).toBeGreaterThanOrEqual(3.0);
    expect(nextClassBannerCss).toContain('outline: 3px solid #fffdf7;');
    expect(nextClassBannerCss).toContain('outline: 3px solid #173d34;');
    expect(contrastRatio('#173d34', '#f7f5ef')).toBeGreaterThanOrEqual(3.0);

    // 2. Text contrast >= 4.5:1 in motion-library.css and motion-pattern-gallery.css
    for (const legacyLowContrast of [
      '#828b78',
      '#758272',
      '#79806e',
      '#75806d',
      '#78886d',
      '#78816f',
      '#7b806f',
    ]) {
      expect(motionLibraryCss).not.toContain(legacyLowContrast);
      expect(galleryCss).not.toContain(legacyLowContrast);
    }
    expect(contrastRatio('#4f594b', '#f7f5ef')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#4f594b', '#fffcf6')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#4a5446', '#e7ece3')).toBeGreaterThanOrEqual(4.5);

    // 3. @media (prefers-reduced-motion: reduce) present in all 5 stylesheets
    for (const cssContent of [
      previewCss,
      galleryCss,
      mediaGuidanceCss,
      aiCopilotCss,
      youtubeGalleryCss,
    ]) {
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toContain('transition: none !important;');
    }
    expect(galleryCss).toContain('transform: none !important;');
    expect(youtubeGalleryCss).toContain('transform: none !important;');
  });

  it('keeps MovementIdeaSheet photo input keyboard-focusable, avoids nesting buttons inside label, and links ARIA validation/segment labels', async () => {
    const { MovementIdeaSheet } = await import('../components/MovementIdeaSheet');
    const { MovementMediaGuidancePanel } = await import('../components/MovementMediaGuidancePanel');
    const { RestStepCard } = await import('../components/RestStepCard');
    const { RestBudgetControl } = await import('../components/RestPlanningControls');

    // 1. MovementIdeaSheet: photo input is not [hidden] and quick feeling chips are not nested inside a <label>
    const { unmount: unmountIdea } = render(
      <MovementIdeaSheet open onClose={() => {}} />,
    );
    const dialog = screen.getByRole('dialog');
    const fileInput = within(dialog).getByLabelText('참고 사진 선택');
    expect(fileInput).not.toHaveAttribute('hidden');
    expect(fileInput).toHaveClass('sr-only');

    const chipButton = within(dialog).getByRole('button', { name: '+ 호흡 연결이 자연스러움' });
    expect(chipButton.closest('label')).toBeNull();
    unmountIdea();

    // 2. MovementMediaGuidancePanel: unique accessible names on segment buttons and aria-controls on script toggle
    const { unmount: unmountMedia } = render(
      <MovementMediaGuidancePanel exercise={INITIAL_EXERCISES[0]} />,
    );
    const scriptToggle = screen.getByTestId('toggle-voice-script-btn');
    const scriptPanel = screen.getByTestId('voice-script-text');
    expect(scriptToggle).toHaveAttribute('aria-controls', scriptPanel.getAttribute('id'));

    const segmentBtn0 = screen.getByTestId('speak-segment-btn-0');
    const segmentBtn1 = screen.getByTestId('speak-segment-btn-1');
    expect(segmentBtn0.getAttribute('aria-label')).toMatch(/^1\..*구간 듣기$/);
    expect(segmentBtn1.getAttribute('aria-label')).toMatch(/^2\..*구간 듣기$/);
    expect(segmentBtn0.getAttribute('aria-label')).not.toBe(
      segmentBtn1.getAttribute('aria-label'),
    );
    unmountMedia();

    // 3. RestStepCard & RestBudgetControl: aria-invalid and aria-describedby on out-of-range input
    const restStep: SequenceStep = {
      stepId: 'rest-a11y-1',
      order: 1,
      kind: 'rest',
      blockCategory: 'warmup',
      exerciseId: 'rest',
      durationMin: 5,
      selectedLayer: 'standard',
      explanationSec: 0,
      transitionSec: 0,
    };
    render(
      <div>
        <RestStepCard
          step={restStep}
          index={0}
          lastIndex={0}
          onToggleLock={() => {}}
          onMove={() => {}}
          onRemove={() => {}}
          onSetDuration={() => ({ success: true, message: '' })}
        />
        <RestBudgetControl minutes={5} totalMinutes={50} onChange={() => {}} />
      </div>,
    );

    const restInput = screen.getByLabelText('1번 휴식 시간 · 분');
    fireEvent.change(restInput, { target: { value: '0' } });
    expect(restInput).toHaveAttribute('aria-invalid', 'true');
    const restErrorId = restInput.getAttribute('aria-describedby');
    expect(restErrorId).toBeTruthy();
    expect(document.getElementById(restErrorId!)).toHaveTextContent(
      '휴식 시간을 0.5–120분 사이로 입력해 주세요.',
    );

    fireEvent.click(screen.getByRole('button', { name: '직접 지정' }));
    const budgetInput = screen.getByLabelText('자동 휴식 직접 지정 · 분');
    fireEvent.change(budgetInput, { target: { value: '60' } });
    expect(budgetInput).toHaveAttribute('aria-invalid', 'true');
    const budgetErrorId = budgetInput.getAttribute('aria-describedby');
    expect(budgetErrorId).toBeTruthy();
    expect(document.getElementById(budgetErrorId!)).toHaveTextContent(
      '휴식은 0분 이상, 전체 수업 시간보다 짧게 입력해 주세요.',
    );
  });

  it('caps LiveStageView +1분 추가 at stepSchema 120-min limit, preserves movement phase at completion when transitionSec is 0, and rounds IEEE-754 step durations consistently', () => {
    vi.useFakeTimers();
    const baseExercise = structuredClone(INITIAL_EXERCISES[0]) as PilatesExercise;
    const steps: SequenceStep[] = [
      {
        stepId: 'stage-zero-transition',
        order: 1,
        blockCategory: baseExercise.blockCategory,
        exerciseId: baseExercise.id,
        durationMin: 120,
        selectedLayer: 'standard',
        explanationSec: 10,
        transitionSec: 0,
      },
      {
        stepId: 'stage-float-250s',
        order: 2,
        blockCategory: baseExercise.blockCategory,
        exerciseId: baseExercise.id,
        durationMin: 250 / 60,
        selectedLayer: 'standard',
        explanationSec: 10,
        transitionSec: 10,
      },
    ];

    usePilatesStore.setState({
      ...initialStoreState,
      activeSequenceId: 'seq-sim-polish',
      activeTitle: '시뮬레이션 경계 검증',
      activeSteps: steps,
      activeTargetMinutes: 124,
      exercises: [baseExercise],
    });

    render(<LiveStageView onOpenLogModal={vi.fn()} />);

    // 1. Clicking +1분 추가 at durationMin=120 must not exceed stepSchema max(120) or unmount the timer UI
    fireEvent.click(screen.getByRole('button', { name: '현재 동작 1분 추가' }));
    expect(
      screen.queryByRole('heading', { name: '수업 항목 정보를 확인해 주세요' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('120:00');

    // 2. Next-panel and outline must display 04:10 (not 04:09 from Math.floor((250/60)*60))
    expect(screen.getByText(/전체 04:10/)).toBeInTheDocument();
    expect(screen.getByText('04:10')).toBeInTheDocument();

    // 3. When transitionSec === 0 and the step finishes (remainingMs === 0), phase stays on movement instead of '다음 동작 전환'
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    act(() => {
      vi.advanceTimersByTime(120 * 60 * 1000 + 500);
    });
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    const statusBadge = document.querySelector('.teaching-timer-status');
    expect(statusBadge).toHaveTextContent('항목 시간 완료');
    expect(statusBadge).not.toHaveTextContent('다음 동작 전환');
  });
});
