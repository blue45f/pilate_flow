import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PfTabs } from '../design-system';
import { LightDismissDialog } from '../components/LightDismissDialog';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import { stepSchema } from '../schemas/cloudBackupSchema';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { exerciseRevision } from '../utils/exerciseReview';
import type { PilatesExercise, SequenceStep } from '../types/pilates';

afterEach(() => {
  cleanup();
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

    // 1. Focus indicator >= 3.0:1 in teaching.css
    expect(teachingCss).toContain('outline: 3px solid #2d5a4c;');
    expect(contrastRatio('#2d5a4c', '#f7f5ef')).toBeGreaterThanOrEqual(3.0);

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

    // 3. @media (prefers-reduced-motion: reduce) present in all 4 stylesheets
    for (const cssContent of [previewCss, galleryCss, mediaGuidanceCss, aiCopilotCss]) {
      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toContain('transition: none !important;');
    }
    expect(galleryCss).toContain('transform: none !important;');
  });
});
