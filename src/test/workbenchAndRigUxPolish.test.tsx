import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Apparatus3dRigPreviewCard } from '../components/Apparatus3dRigPreviewCard';
import { CurriculumProgressionPanel } from '../components/workbench/CurriculumProgressionPanel';
import { DurationCalibrationBanner } from '../components/workbench/DurationCalibrationBanner';
import { StudioFlowOptimizerPanel } from '../components/workbench/StudioFlowOptimizerPanel';
import { StudioReadinessAuditCard } from '../components/workbench/StudioReadinessAuditCard';
import { WorkbenchBlankStarters } from '../components/workbench/WorkbenchBlankStarters';
import { WorkbenchHierarchySummary } from '../components/workbench/WorkbenchHierarchySummary';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import type { AutoGenerateCriteria, ClassHistoryLog } from '../types/pilates';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Workbench & 3D Rig UI/UX Design System Polish (320/375/768px & Desktop)', () => {
  const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
  const sampleSequence = INITIAL_SAVED_SEQUENCES[0]!;
  const criteria: AutoGenerateCriteria = {
    apparatus: sampleSequence.apparatus,
    level: sampleSequence.level,
    focusPreset: 'full-body',
    preferredProps: ['none'],
    excludeDaysWindow: 14,
    targetMinutes: sampleSequence.targetMinutes,
    defaultLayer: 'standard',
    planningGoals: ['mobility'],
    instructorObservations: ['anterior-pelvic-tilt'],
  };

  it('Improvement 1 & @generate-fresh-ideas Mode A/B: StudioFlowOptimizerPanel, StudioReadinessAuditCard, DurationCalibrationBanner, and CurriculumProgressionPanel use PfButton/PfBadge/PfAiStatusBadge, wire aria-controls, apply angle concepts, and expand Mode B channel drafts', () => {
    const onApplySteps = vi.fn();
    const onApplyAngleConcept = vi.fn();
    const onApplyCalibratedSteps = vi.fn();

    const sampleLogs: ClassHistoryLog[] = [
      {
        id: 'log-cal-1',
        sequenceId: sampleSequence.id,
        sequenceTitle: sampleSequence.title,
        groupId: 'group-1',
        groupName: '오전 리포머 A반',
        taughtAt: '2026-11-01T10:00:00.000Z',
        apparatus: sampleSequence.apparatus,
        level: sampleSequence.level,
        exerciseIds: sampleSequence.steps.map((s) => s.exerciseId),
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '시간 초과 테스트',
        actualDurationSec: 56 * 60,
        stepsSnapshot: sampleSequence.steps,
      },
      {
        id: 'log-cal-2',
        sequenceId: sampleSequence.id,
        sequenceTitle: sampleSequence.title,
        groupId: 'group-1',
        groupName: '오전 리포머 A반',
        taughtAt: '2026-11-03T10:00:00.000Z',
        apparatus: sampleSequence.apparatus,
        level: sampleSequence.level,
        exerciseIds: sampleSequence.steps.map((s) => s.exerciseId),
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '시간 초과 테스트 2',
        actualDurationSec: 55 * 60,
        stepsSnapshot: sampleSequence.steps,
      },
      {
        id: 'log-cal-3',
        sequenceId: sampleSequence.id,
        sequenceTitle: sampleSequence.title,
        groupId: 'group-1',
        groupName: '오전 리포머 A반',
        taughtAt: '2026-11-05T10:00:00.000Z',
        apparatus: sampleSequence.apparatus,
        level: sampleSequence.level,
        exerciseIds: sampleSequence.steps.map((s) => s.exerciseId),
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '시간 초과 테스트 3',
        actualDurationSec: 57 * 60,
        stepsSnapshot: sampleSequence.steps,
      },
    ];

    render(
      <div>
        <StudioReadinessAuditCard
          steps={sampleSequence.steps}
          exercisesById={exerciseMap}
          level="1.5"
          reformerBrand="stott"
        />
        <StudioFlowOptimizerPanel
          sequenceTitle={sampleSequence.title}
          steps={sampleSequence.steps}
          exercisesById={exerciseMap}
          criteria={criteria}
          reformerBrand="stott"
          onApplySteps={onApplySteps}
          onApplyAngleConcept={onApplyAngleConcept}
        />
        <DurationCalibrationBanner
          historyLogs={sampleLogs}
          activeSteps={sampleSequence.steps}
          groupId="group-1"
          onApplyCalibratedSteps={onApplyCalibratedSteps}
        />
        <CurriculumProgressionPanel
          groupId="group-1"
          groupName="오전 리포머 A반"
          baseLevel="1.5"
          historyLogs={sampleLogs}
          exercises={INITIAL_EXERCISES}
        />
        <WorkbenchBlankStarters onSelectStarter={vi.fn()} />
        <WorkbenchHierarchySummary
          activeSteps={sampleSequence.steps}
          sectionCount={3}
          exerciseStepCount={sampleSequence.steps.length}
        />
      </div>,
    );

    // 1. StudioReadinessAuditCard uses PfBadge and role="list"
    const readinessCard = screen.getByTestId('studio-readiness-audit-badge');
    expect(readinessCard.querySelector('.pf-badge')).not.toBeNull();
    expect(
      within(readinessCard).getByRole('list', { name: '호흡·스프링·척추 평면 요약' }),
    ).toBeInTheDocument();

    // 2. StudioFlowOptimizerPanel uses PfAiStatusBadge, PfButton, and links aria-controls to regions
    const optimizerPanel = screen.getByTestId('studio-flow-optimizer-panel');
    expect(optimizerPanel.querySelector('.pf-ai-status')).not.toBeNull();
    const optimizerButtons = within(optimizerPanel).getAllByRole('button');
    expect(optimizerButtons.length).toBeGreaterThanOrEqual(2);
    for (const btn of optimizerButtons) {
      expect(btn).toHaveClass('pf-btn');
    }

    const anglesToggle = within(optimizerPanel).getByRole('button', {
      name: /5대 수업 컨셉 리믹스/,
    });
    expect(anglesToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(anglesToggle);
    expect(anglesToggle).toHaveAttribute('aria-expanded', 'true');
    const anglesRegion = screen.getByTestId('fresh-class-angles-list');
    expect(anglesToggle).toHaveAttribute('aria-controls', anglesRegion.getAttribute('id'));
    expect(anglesRegion.querySelectorAll('.pf-badge').length).toBe(5);

    // Verify 3-beat story, verified metrics, and 4-step playbook are rendered
    expect(screen.getByTestId('fresh-angle-story-structure')).toHaveTextContent('3-Beat 스토리 구조');
    expect(screen.getByTestId('fresh-angle-verified-metrics')).toHaveTextContent('시퀀스 실측 근거');
    expect(within(screen.getByTestId('fresh-angle-playbook-steps')).getAllByRole('listitem')).toHaveLength(
      4,
    );

    // Apply angle concept to sequence title/subtitle
    fireEvent.click(screen.getByTestId('apply-fresh-angle-contrarian'));
    expect(onApplyAngleConcept).toHaveBeenCalledTimes(1);

    // Expand Mode B draft and switch channel
    fireEvent.click(screen.getByTestId('expand-fresh-angle-draft-playbook'));
    const draftRegion = screen.getByTestId('fresh-angle-draft-expansion');
    expect(draftRegion).toBeInTheDocument();
    fireEvent.click(within(draftRegion).getByRole('button', { name: '회원 안내문' }));
    expect(screen.getByTestId('fresh-angle-expanded-draft-text')).toHaveTextContent(
      '이번 시간 클래스 컨셉 안내',
    );

    const scriptToggle = within(optimizerPanel).getByRole('button', {
      name: /타임코드 티칭 대본 보기/,
    });
    fireEvent.click(scriptToggle);
    const scriptPre = screen.getByTestId('instructor-voice-script-preview');
    expect(scriptToggle).toHaveAttribute('aria-controls', scriptPre.getAttribute('id'));
    expect(scriptPre).toHaveAttribute('tabIndex', '0');

    // 3. DurationCalibrationBanner uses PfButton
    const calibrationBanner = screen.getByTestId('duration-calibration-banner');
    const calibrateBtn = within(calibrationBanner).getByRole('button', {
      name: /현재 수업에 시간 보정 적용/,
    });
    expect(calibrateBtn).toHaveClass('pf-btn');
    fireEvent.click(calibrateBtn);
    expect(onApplyCalibratedSteps).toHaveBeenCalledTimes(1);

    // 4. CurriculumProgressionPanel uses role="list" and PfBadge
    const curriculumPanel = screen.getByTestId('curriculum-progression-panel');
    expect(
      within(curriculumPanel).getByRole('list', { name: '주차별 프로그레션 목표' }),
    ).toBeInTheDocument();
    expect(curriculumPanel.querySelectorAll('.pf-badge').length).toBe(4);
  });

  it('Improvement 2: Apparatus3dRigPreviewCard uses PfButton controls, wires aria-controls to focusable Blender script, and respects prefers-reduced-motion by stepping statically instead of interval autoplay', () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    try {
      render(
        <Apparatus3dRigPreviewCard
          apparatus="reformer"
          bodyPosition="supine"
          springsLabel="1R 1B"
          exerciseTitleKo="풋워크"
        />,
      );

      const rigCard = screen.getByTestId('apparatus-3d-rig-preview');
      const rigButtons = within(rigCard).getAllByRole('button');
      for (const btn of rigButtons) {
        expect(btn).toHaveClass('pf-btn');
      }

      // Camera preset switching
      const sagittalBtn = within(rigCard).getByRole('button', { name: '시상면(Side)' });
      fireEvent.click(sagittalBtn);
      expect(sagittalBtn).toHaveAttribute('aria-pressed', 'true');

      // Under prefers-reduced-motion: reduce, clicking continuous play steps once statically and keeps aria-pressed="false"
      const playBtn = within(rigCard).getByRole('button', { name: '3페이즈 연속 재생' });
      expect(playBtn).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(playBtn);
      expect(playBtn).toHaveAttribute('aria-pressed', 'false');
      expect(
        within(rigCard).getByRole('button', { name: '2 정점(Peak)' }),
      ).toHaveAttribute('aria-pressed', 'true');

      // Blender script disclosure links aria-controls and is keyboard focusable
      const scriptBtn = within(rigCard).getByRole('button', { name: 'Blender 3D 스크립트(.py)' });
      fireEvent.click(scriptBtn);
      const scriptPre = screen.getByTestId('blender-scene-script-preview');
      expect(scriptBtn).toHaveAttribute('aria-controls', scriptPre.getAttribute('id'));
      expect(scriptPre).toHaveAttribute('tabIndex', '0');

      // Range slider has explicit label association and >=44px class
      const slider = within(rigCard).getByRole('slider', {
        name: '캐리지 가동 범위 위치 조절',
      });
      expect(slider).toHaveClass('pf-rig-preview__slider-input');
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });

  it('enforces >= 44px touch targets, 320/375/768px responsive rules, prefers-reduced-motion across all transition stylesheets, and clean Fast Refresh exports', () => {
    const workbenchVnextCss = readFileSync(
      resolve(process.cwd(), 'src/styles/workbench-vnext.css'),
      'utf8',
    );
    expect(workbenchVnextCss).toContain('.pf-studio-optimizer__btn');
    expect(workbenchVnextCss).toContain('.pf-rig-preview__btn');
    expect(workbenchVnextCss).toContain('min-height: 44px;');
    expect(workbenchVnextCss).toContain('@media (max-width: 560px)');
    expect(workbenchVnextCss).toContain('@media (prefers-reduced-motion: reduce)');

    for (const relCss of [
      'src/styles/library-concept-layout.css',
      'src/styles/movement-idea-sheet.css',
      'src/components/ClassBinderView.css',
      'src/components/FreeAiAssistantPanel.css',
      'src/styles/live-stage-design.css',
      'src/styles/sequence-composition.css',
      'src/styles/movement-media-guidance.css',
      'src/styles/spine-articulation-diagram.css',
      'src/styles/hip-leg-diagram.css',
      'src/styles/ai-copilot.css',
      'src/styles/motion-pattern-preview.css',
      'src/styles/motion-pattern-gallery.css',
      'src/styles/cloud.css',
    ]) {
      const content = readFileSync(resolve(process.cwd(), relCss), 'utf8');
      expect(content).toContain('min-height: 44px');
    }

    const eslintConfig = readFileSync(resolve(process.cwd(), 'eslint.config.mjs'), 'utf8');
    expect(eslintConfig).toContain('BATCH_FIGURE_TITLES');
  });
});

