import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { WORLD_PILATES_BY_ID, WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import {
  CLIENT_GOAL_NON_MEDICAL_NOTICE_KO,
  CLIENT_GOAL_PRESETS,
  analyzeSequenceForClientGoal,
  applyClientGoalTuning,
  suggestSpringAdjustmentForPreset,
} from '../utils/clientGoalTunerEngine';
import { ClientGoalSequenceTunerPanel } from './ClientGoalSequenceTunerPanel';

const originalStore = usePilatesStore.getState();

function findWorldExercise(predicate: (ex: PilatesExercise) => boolean, label: string): PilatesExercise {
  const found = WORLD_PILATES_EXERCISES.find(predicate);
  if (!found) {
    throw new Error(`Expected matching exercise in 1,752 catalog for: ${label}`);
  }
  return found;
}

const reformerWarmupSupine = findWorldExercise(
  (ex) =>
    ex.apparatus === 'reformer' &&
    ex.blockCategory === 'warmup' &&
    ex.bodyPosition === 'supine' &&
    ex.level === '1.0',
  'reformer supine warmup',
);

const reformerFootworkBilateral = findWorldExercise(
  (ex) =>
    ex.apparatus === 'reformer' &&
    ex.blockCategory === 'footwork' &&
    !ex.isUnilateral &&
    ex.bodyPosition === 'supine',
  'reformer bilateral footwork',
);

const reformerSupineCoreFlexion = findWorldExercise(
  (ex) =>
    ex.apparatus === 'reformer' &&
    ex.blockCategory === 'core' &&
    ex.bodyPosition === 'supine' &&
    ex.spinalPlanes.includes('flexion') &&
    !ex.spinalPlanes.includes('extension'),
  'reformer supine core flexion',
);

const reformerPlankHighLoad = findWorldExercise(
  (ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'plank',
  'reformer plank',
);

const reformerAdvancedMove = findWorldExercise(
  (ex) =>
    ex.apparatus === 'reformer' &&
    ex.level === '2.0' &&
    ex.id !== reformerPlankHighLoad.id &&
    ex.id !== reformerSupineCoreFlexion.id,
  'reformer level 2.0',
);

const reformerProneExtension = findWorldExercise(
  (ex) =>
    ex.apparatus === 'reformer' &&
    ex.blockCategory === 'extension' &&
    ex.bodyPosition === 'prone' &&
    ex.level !== '1.0',
  'reformer prone extension',
);

const reformerCooldown = findWorldExercise(
  (ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'cooldown',
  'reformer cooldown',
);

function buildSampleReformerSteps(): SequenceStep[] {
  return [
    {
      stepId: 'step-warmup',
      order: 1,
      blockCategory: reformerWarmupSupine.blockCategory,
      exerciseId: reformerWarmupSupine.id,
      durationMin: 4,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-footwork',
      order: 2,
      blockCategory: reformerFootworkBilateral.blockCategory,
      exerciseId: reformerFootworkBilateral.id,
      durationMin: 6,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-core-flexion',
      order: 3,
      blockCategory: reformerSupineCoreFlexion.blockCategory,
      exerciseId: reformerSupineCoreFlexion.id,
      durationMin: 6,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-plank',
      order: 4,
      blockCategory: reformerPlankHighLoad.blockCategory,
      exerciseId: reformerPlankHighLoad.id,
      durationMin: 5,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-advanced',
      order: 5,
      blockCategory: reformerAdvancedMove.blockCategory,
      exerciseId: reformerAdvancedMove.id,
      durationMin: 6,
      selectedLayer: 'hard',
    },
    {
      stepId: 'step-prone-ext',
      order: 6,
      blockCategory: reformerProneExtension.blockCategory,
      exerciseId: reformerProneExtension.id,
      durationMin: 5,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-rest',
      order: 7,
      kind: 'rest',
      blockCategory: 'cooldown',
      exerciseId: '',
      durationMin: 2,
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-cooldown',
      order: 8,
      blockCategory: reformerCooldown.blockCategory,
      exerciseId: reformerCooldown.id,
      durationMin: 4,
      selectedLayer: 'standard',
    },
  ];
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  usePilatesStore.setState(
    {
      ...originalStore,
      exercises: INITIAL_EXERCISES,
      activeSteps: buildSampleReformerSteps(),
      activeApparatus: 'reformer',
      activeLevel: '1.5',
      undoStack: [],
      redoStack: [],
      saveFeedback: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(originalStore, true);
});

describe('clientGoalTunerEngine', () => {
  it('exposes all 5 non-medical practical presets without clinical claim phrasing', () => {
    expect(CLIENT_GOAL_PRESETS).toHaveLength(5);
    const ids = CLIENT_GOAL_PRESETS.map((p) => p.id);
    expect(ids).toEqual([
      'round-shoulder',
      'pelvic-balance',
      'prenatal-gentle',
      'senior-comfort',
      'core-glute-sculpt',
    ]);

    for (const preset of CLIENT_GOAL_PRESETS) {
      const combined = `${preset.titleKo} ${preset.summaryKo} ${preset.recommendedLayerNoteKo}`;
      expect(combined).not.toMatch(/완치|진단|처방|치료\s*효과|교정\s*보장|디스크\s*치료/);
    }
  });

  it('prenatal-gentle replaces supine/prone/plank/2.0 steps with non-duplicate safe low-impact alternatives', () => {
    const steps = buildSampleReformerSteps();
    const analysis = analyzeSequenceForClientGoal(
      steps,
      WORLD_PILATES_BY_ID,
      'prenatal-gentle',
      WORLD_PILATES_EXERCISES,
    );

    expect(analysis.catalogPoolSize).toBe(WORLD_PILATES_EXERCISES.length);
    expect(analysis.swaps.length).toBeGreaterThanOrEqual(4);

    const swappedIds = new Set<string>();
    const safePositions = new Set(['seated', 'side-lying', 'quadruped', 'kneeling', 'standing']);

    for (const swap of analysis.swaps) {
      expect(safePositions.has(swap.replacementExercise.bodyPosition)).toBe(true);
      expect(swap.replacementExercise.level).not.toBe('2.0');
      expect(swap.replacementExercise.blockCategory).not.toBe('plank');
      expect(swap.recommendedLayer).toBe('easy');
      expect(swappedIds.has(swap.replacementExercise.id)).toBe(false);
      swappedIds.add(swap.replacementExercise.id);
    }

    // Applies cleanly and never touches rest step
    const nextSteps = applyClientGoalTuning(
      steps,
      analysis.swaps,
      analysis.swaps.map((s) => s.stepId),
      { applyLayerToUnchangedSteps: 'easy' },
    );

    const restStep = nextSteps.find((s) => s.stepId === 'step-rest')!;
    expect(restStep.kind).toBe('rest');
    expect(restStep.exerciseId).toBe('');

    for (const step of nextSteps) {
      if (step.kind === 'rest') continue;
      expect(step.selectedLayer).toBe('easy');
    }
  });

  it('senior-comfort replaces 2.0, plank, and prone higher-load extension with beginner 1.0 supported moves and easy layer', () => {
    const steps = buildSampleReformerSteps();
    const analysis = analyzeSequenceForClientGoal(
      steps,
      WORLD_PILATES_BY_ID,
      'senior-comfort',
      WORLD_PILATES_EXERCISES,
    );

    const swappedStepIds = analysis.swaps.map((s) => s.stepId);
    expect(swappedStepIds).toContain('step-plank');
    expect(swappedStepIds).toContain('step-advanced');
    expect(swappedStepIds).toContain('step-prone-ext');

    for (const swap of analysis.swaps) {
      expect(swap.replacementExercise.level).toBe('1.0');
      expect(swap.replacementExercise.blockCategory).not.toBe('plank');
      expect(swap.recommendedLayer).toBe('easy');
    }
  });

  it('round-shoulder swaps neck-straining anterior flexion & plank into thoracic-opening movements', () => {
    const steps = buildSampleReformerSteps();
    const analysis = analyzeSequenceForClientGoal(
      steps,
      WORLD_PILATES_BY_ID,
      'round-shoulder',
      WORLD_PILATES_EXERCISES,
    );

    const swappedStepIds = analysis.swaps.map((s) => s.stepId);
    expect(swappedStepIds).toContain('step-core-flexion');
    expect(swappedStepIds).toContain('step-plank');

    for (const swap of analysis.swaps) {
      const rep = swap.replacementExercise;
      const opensThoracic =
        rep.spinalPlanes.includes('extension') ||
        rep.spinalPlanes.includes('rotation') ||
        rep.anatomyInsight.anatomyVisualZone === 'shoulder' ||
        rep.anatomyInsight.anatomyVisualZone === 'spine';
      expect(opensThoracic).toBe(true);
    }
  });

  it('pelvic-balance upgrades bilateral lower/core blocks into unilateral pelvic-stability moves with sideMode', () => {
    const steps = buildSampleReformerSteps();
    const analysis = analyzeSequenceForClientGoal(
      steps,
      WORLD_PILATES_BY_ID,
      'pelvic-balance',
      WORLD_PILATES_EXERCISES,
    );

    expect(analysis.swaps.length).toBeGreaterThanOrEqual(2);
    for (const swap of analysis.swaps) {
      expect(
        swap.replacementExercise.isUnilateral ||
          swap.replacementExercise.bodyPosition === 'side-lying',
      ).toBe(true);
      if (swap.replacementExercise.isUnilateral) {
        expect(swap.recommendedSideMode).toBe('left-then-right');
      }
    }
  });

  it('core-glute-sculpt preserves opening warmup and closing cooldown while upgrading low-load middle steps with hard option', () => {
    const neutralMiddleMove = findWorldExercise(
      (ex) =>
        ex.apparatus === 'reformer' &&
        ex.level === '1.0' &&
        ex.blockCategory === 'feet-in-straps',
      'reformer neutral beginner feet-in-straps',
    );
    const steps: SequenceStep[] = [
      {
        stepId: 's-warm',
        order: 1,
        blockCategory: reformerWarmupSupine.blockCategory,
        exerciseId: reformerWarmupSupine.id,
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 's-mid-gentle',
        order: 2,
        blockCategory: neutralMiddleMove.blockCategory,
        exerciseId: neutralMiddleMove.id,
        durationMin: 5,
        selectedLayer: 'easy',
      },
      {
        stepId: 's-cool',
        order: 3,
        blockCategory: reformerCooldown.blockCategory,
        exerciseId: reformerCooldown.id,
        durationMin: 4,
        selectedLayer: 'standard',
      },
    ];

    const analysis = analyzeSequenceForClientGoal(
      steps,
      WORLD_PILATES_BY_ID,
      'core-glute-sculpt',
      WORLD_PILATES_EXERCISES,
    );

    const swappedStepIds = analysis.swaps.map((s) => s.stepId);
    expect(swappedStepIds).not.toContain('s-warm');
    expect(swappedStepIds).not.toContain('s-cool');
    expect(swappedStepIds).toContain('s-mid-gentle');
    expect(analysis.swaps[0]!.recommendedLayer).toBe('hard');
  });

  it('respects Pilates spring assistance vs resistance mechanics for prenatal and senior presets', () => {
    // Resistance work: lowers load (2R 1B -> 1R 1B)
    const resistanceRes = suggestSpringAdjustmentForPreset(
      '2R 1B',
      'reformer',
      'seated',
      'upper-body',
      'prenatal-gentle',
    );
    expect(resistanceRes.springOverride).toBe('1R 1B');

    // Carriage stability assistance work: upgrades feather spring 1Y -> supportive 1R
    const supportRes = suggestSpringAdjustmentForPreset(
      '1Y',
      'reformer',
      'kneeling',
      'lower-body',
      'senior-comfort',
    );
    expect(supportRes.springOverride).toBe('1R');
    expect(supportRes.springNoteKo).toContain('지지');
  });
});

describe('ClientGoalSequenceTunerPanel', () => {
  it('renders 5 presets, non-medical disclaimer, selective checkboxes, 1-tap apply to store with undoStack, and 1-tap undo', () => {
    const initialSteps = buildSampleReformerSteps();
    render(<ClientGoalSequenceTunerPanel initialPresetId="prenatal-gentle" />);

    expect(screen.getByTestId('client-goal-sequence-tuner-panel')).toBeVisible();
    expect(screen.getByTestId('goal-tuner-disclaimer')).toHaveTextContent(
      CLIENT_GOAL_NON_MEDICAL_NOTICE_KO,
    );

    // Switch to senior-comfort preset and verify swap cards render
    fireEvent.click(screen.getByTestId('goal-preset-senior-comfort'));
    expect(screen.getByTestId('goal-preset-senior-comfort')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const swapList = screen.getByTestId('goal-tuner-swap-list');
    const checkboxes = swapList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);

    const initialCount = checkboxes.length;
    const applyBtn = screen.getByTestId('goal-tuner-apply-btn');
    expect(applyBtn).toHaveTextContent(`선택한 ${initialCount}개 동작 일괄 안전 치환`);

    // Uncheck the first swap and confirm count decrements
    fireEvent.click(checkboxes[0]!);
    expect(applyBtn).toHaveTextContent(`선택한 ${initialCount - 1}개 동작 일괄 안전 치환`);

    // Apply tuning directly to Zustand store
    fireEvent.click(applyBtn);

    const afterApply = usePilatesStore.getState();
    expect(afterApply.undoStack).toHaveLength(1);
    expect(afterApply.activeSteps).not.toEqual(initialSteps);

    // Verify swapped World exercises were registered in store catalog
    const storeIds = new Set(afterApply.exercises.map((e) => e.id));
    for (const step of afterApply.activeSteps) {
      if (step.kind === 'rest') continue;
      if (step.exerciseId !== initialSteps.find((s) => s.stepId === step.stepId)?.exerciseId) {
        expect(storeIds.has(step.exerciseId)).toBe(true);
      }
    }

    // Verify 1-tap Undo button restores original steps cleanly
    const undoBtn = screen.getByTestId('goal-tuner-undo-btn');
    expect(undoBtn).toHaveTextContent('방금 변경 되돌리기');
    fireEvent.click(undoBtn);

    const afterUndo = usePilatesStore.getState();
    expect(afterUndo.activeSteps.map((s) => s.exerciseId)).toEqual(
      initialSteps.map((s) => s.exerciseId),
    );
    expect(afterUndo.undoStack).toHaveLength(0);
  });

  it('supports controlled onApplySteps and onClose callbacks', () => {
    const steps = buildSampleReformerSteps();
    const onApplySteps = vi.fn();
    const onClose = vi.fn();

    render(
      <ClientGoalSequenceTunerPanel
        steps={steps}
        exercises={WORLD_PILATES_EXERCISES}
        initialPresetId="round-shoulder"
        onApplySteps={onApplySteps}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByTestId('goal-tuner-apply-btn'));
    expect(onApplySteps).toHaveBeenCalledTimes(1);
    const [nextSteps, summaryKo] = onApplySteps.mock.calls[0] as [SequenceStep[], string];
    expect(nextSteps).toHaveLength(steps.length);
    expect(summaryKo).toContain('라운드 숄더');

    fireEvent.click(screen.getByRole('button', { name: '튜너 패널 닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
