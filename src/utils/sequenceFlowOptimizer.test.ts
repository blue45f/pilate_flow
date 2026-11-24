import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SequenceFlowTelemetryStrip } from '../components/SequenceFlowTelemetryStrip';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { optimizeSequenceTransitions } from './sequenceFlowAnalytics';

function makeExercise(
  overrides: Partial<PilatesExercise> & Pick<PilatesExercise, 'id' | 'nameKo'>,
): PilatesExercise {
  return {
    id: overrides.id,
    nameKo: overrides.nameKo,
    nameEn: overrides.nameEn ?? overrides.nameKo,
    apparatus: overrides.apparatus ?? 'reformer',
    props: overrides.props ?? ['none'],
    blockCategory: overrides.blockCategory ?? 'core',
    spinalPlanes: overrides.spinalPlanes ?? ['neutral'],
    bodyPosition: overrides.bodyPosition ?? 'supine',
    level: overrides.level ?? '1.5',
    defaultDurationMin: overrides.defaultDurationMin ?? 4,
    isUnilateral: overrides.isUnilateral ?? false,
    springs: overrides.springs ?? '1R 1B',
    box: overrides.box ?? 'none',
    footbar: overrides.footbar ?? 'high',
    headrest: overrides.headrest ?? 'flat',
    targetMuscles: overrides.targetMuscles ?? ['복횡근'],
    breathPattern: overrides.breathPattern ?? '들쉬고 내쉬기',
    cues: overrides.cues ?? ['골반 중립 유지'],
    precautions: overrides.precautions ?? '목 긴장 주의',
    layers: overrides.layers ?? { easy: '입문', standard: '표준', hard: '심화' },
    youtube: overrides.youtube ?? {
      videoId: '',
      channelName: '테스트',
      videoTitle: '',
      startSec: 0,
      url: '',
    },
    favoriteTag: overrides.favoriteTag ?? 'none',
  };
}

function makeStep(
  overrides: Partial<SequenceStep> & Pick<SequenceStep, 'stepId' | 'order' | 'blockCategory' | 'exerciseId'>,
): SequenceStep {
  return {
    stepId: overrides.stepId,
    order: overrides.order,
    blockCategory: overrides.blockCategory,
    exerciseId: overrides.exerciseId,
    durationMin: overrides.durationMin ?? 4,
    selectedLayer: overrides.selectedLayer ?? 'standard',
    customSpringOverride: overrides.customSpringOverride,
    footbarOverride: overrides.footbarOverride,
    headrestOverride: overrides.headrestOverride,
    boxOverride: overrides.boxOverride,
    locked: overrides.locked,
    kind: overrides.kind,
    transitionSec: overrides.transitionSec ?? 5,
  };
}

function toMap(list: readonly PilatesExercise[]): ReadonlyMap<string, PilatesExercise> {
  return new Map(list.map((ex) => [ex.id, ex]));
}

describe('optimizeSequenceTransitions', () => {
  it('eliminates spring ping-pong (1R1B -> 1R -> 1R1B becomes 1R1B -> 1R1B -> 1R) immutably', () => {
    const exercises = toMap([
      makeExercise({ id: 'ex-a', nameKo: '헌드레드 프렙', blockCategory: 'core', springs: '1R 1B' }),
      makeExercise({ id: 'ex-b', nameKo: '코디네이션', blockCategory: 'core', springs: '1R' }),
      makeExercise({ id: 'ex-c', nameKo: '롤백 프렙', blockCategory: 'core', springs: '1R 1B' }),
    ]);

    const steps: SequenceStep[] = [
      makeStep({ stepId: 's1', order: 1, blockCategory: 'core', exerciseId: 'ex-a' }),
      makeStep({ stepId: 's2', order: 2, blockCategory: 'core', exerciseId: 'ex-b' }),
      makeStep({ stepId: 's3', order: 3, blockCategory: 'core', exerciseId: 'ex-c' }),
    ];
    const snapshot = JSON.stringify(steps);

    const plan = optimizeSequenceTransitions(steps, exercises);

    expect(JSON.stringify(steps)).toBe(snapshot);
    expect(plan.canImprove).toBe(true);
    expect(plan.optimizedSteps.map((s) => s.stepId)).toEqual(['s1', 's3', 's2']);
    expect(plan.optimizedSteps.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(plan.springChangesSaved).toBe(1);
    expect(plan.savedTransitionSec).toBe(15);
    expect(plan.frictionDelta).toBeGreaterThan(0);
    expect(plan.afterFrictionScore).toBeLessThan(plan.beforeFrictionScore);
    expect(plan.movedCount).toBe(2);
    expect(plan.summaryKo).toContain('스프링 교체 -1회');

    // Strictly idempotent
    const secondPass = optimizeSequenceTransitions(plan.optimizedSteps, exercises);
    expect(secondPass.canImprove).toBe(false);
    expect(secondPass.movedCount).toBe(0);
    expect(secondPass.frictionDelta).toBe(0);
    expect(secondPass.savedTransitionSec).toBe(0);
    expect(secondPass.optimizedSteps.map((s) => s.stepId)).toEqual(['s1', 's3', 's2']);
  });

  it('eliminates non-contiguous box swaps (Short Box -> None -> Short Box) while anchoring to warmup & cooldown', () => {
    const exercises = toMap([
      makeExercise({
        id: 'ex-warm',
        nameKo: '펠빅 클락 호흡',
        blockCategory: 'warmup',
        springs: '2R 1B',
        box: 'none',
        footbar: 'high',
        bodyPosition: 'supine',
      }),
      makeExercise({
        id: 'ex-sb1',
        nameKo: '숏박스 라운드백',
        blockCategory: 'core',
        springs: '2R',
        box: 'short-box',
        footbar: 'down',
        bodyPosition: 'seated',
      }),
      makeExercise({
        id: 'ex-none',
        nameKo: '리포머 헌드레드',
        blockCategory: 'core',
        springs: '2R 1B',
        box: 'none',
        footbar: 'high',
        bodyPosition: 'supine',
      }),
      makeExercise({
        id: 'ex-sb2',
        nameKo: '숏박스 플랫백',
        blockCategory: 'core',
        springs: '2R',
        box: 'short-box',
        footbar: 'down',
        bodyPosition: 'seated',
      }),
      makeExercise({
        id: 'ex-cool',
        nameKo: '머메이드 스트레칭',
        blockCategory: 'cooldown',
        springs: '1B',
        box: 'none',
        footbar: 'high',
        bodyPosition: 'seated',
      }),
    ]);

    const steps: SequenceStep[] = [
      makeStep({ stepId: 'w1', order: 1, blockCategory: 'warmup', exerciseId: 'ex-warm' }),
      makeStep({ stepId: 'c1', order: 2, blockCategory: 'core', exerciseId: 'ex-sb1' }),
      makeStep({ stepId: 'c2', order: 3, blockCategory: 'core', exerciseId: 'ex-none' }),
      makeStep({ stepId: 'c3', order: 4, blockCategory: 'core', exerciseId: 'ex-sb2' }),
      makeStep({ stepId: 'cd1', order: 5, blockCategory: 'cooldown', exerciseId: 'ex-cool' }),
    ];

    const plan = optimizeSequenceTransitions(steps, exercises);

    expect(plan.canImprove).toBe(true);
    // Warmup stays first, cooldown stays last, and supine-none anchors directly after warmup before grouping both short-box steps
    expect(plan.optimizedSteps.map((s) => s.stepId)).toEqual(['w1', 'c2', 'c1', 'c3', 'cd1']);
    expect(plan.boxSwapsSaved).toBe(2);
    expect(plan.springChangesSaved).toBe(2);
    expect(plan.savedTransitionSec).toBe(50);
    expect(plan.afterAnalysis.boxSwapCount).toBe(2); // none -> short-box -> none
    expect(plan.beforeAnalysis.boxSwapCount).toBe(4); // none -> short-box -> none -> short-box -> none

    const secondPass = optimizeSequenceTransitions(plan.optimizedSteps, exercises);
    expect(secondPass.canImprove).toBe(false);
    expect(secondPass.movedCount).toBe(0);
  });

  it('strictly preserves blockCategory boundaries, warmup/cooldown runs, single-step blocks, rest, and locked steps', () => {
    const exercises = toMap([
      makeExercise({ id: 'w-a', nameKo: '호흡 1', blockCategory: 'warmup', springs: '2R' }),
      makeExercise({ id: 'w-b', nameKo: '호흡 2', blockCategory: 'warmup', springs: '1R' }),
      makeExercise({ id: 'w-c', nameKo: '호흡 3', blockCategory: 'warmup', springs: '2R' }),
      makeExercise({ id: 'fw-1', nameKo: '풋워크 1', blockCategory: 'footwork', springs: '3R' }),
      makeExercise({ id: 'lb-1', nameKo: '스쿠터', blockCategory: 'lower-body', springs: '1R' }),
      makeExercise({ id: 'fw-2', nameKo: '풋워크 2', blockCategory: 'footwork', springs: '3R' }),
      makeExercise({ id: 'cd-a', nameKo: '쿨다운 1', blockCategory: 'cooldown', springs: '1B' }),
      makeExercise({ id: 'cd-b', nameKo: '쿨다운 2', blockCategory: 'cooldown', springs: '1Y' }),
      makeExercise({ id: 'cd-c', nameKo: '쿨다운 3', blockCategory: 'cooldown', springs: '1B' }),
    ]);

    const steps: SequenceStep[] = [
      // Even though warmup has 2R -> 1R -> 2R ping-pong, warmup must NEVER be reordered
      makeStep({ stepId: 'w1', order: 1, blockCategory: 'warmup', exerciseId: 'w-a' }),
      makeStep({ stepId: 'w2', order: 2, blockCategory: 'warmup', exerciseId: 'w-b' }),
      makeStep({ stepId: 'w3', order: 3, blockCategory: 'warmup', exerciseId: 'w-c' }),
      // Non-contiguous single-step blocks separated by lower-body must NEVER merge across categories
      makeStep({ stepId: 'f1', order: 4, blockCategory: 'footwork', exerciseId: 'fw-1' }),
      makeStep({ stepId: 'l1', order: 5, blockCategory: 'lower-body', exerciseId: 'lb-1' }),
      makeStep({ stepId: 'f2', order: 6, blockCategory: 'footwork', exerciseId: 'fw-2' }),
      // Cooldown ping-pong must NEVER be reordered
      makeStep({ stepId: 'd1', order: 7, blockCategory: 'cooldown', exerciseId: 'cd-a' }),
      makeStep({ stepId: 'd2', order: 8, blockCategory: 'cooldown', exerciseId: 'cd-b' }),
      makeStep({ stepId: 'd3', order: 9, blockCategory: 'cooldown', exerciseId: 'cd-c' }),
    ];

    const plan = optimizeSequenceTransitions(steps, exercises);
    expect(plan.canImprove).toBe(false);
    expect(plan.movedCount).toBe(0);
    expect(plan.optimizedSteps.map((s) => s.stepId)).toEqual(steps.map((s) => s.stepId));

    // Locked step and rest step inside a core block must never move or be crossed
    const coreExercises = toMap([
      makeExercise({ id: 'c-1', nameKo: '코어 A', blockCategory: 'core', springs: '1R 1B' }),
      makeExercise({ id: 'c-2', nameKo: '코어 B', blockCategory: 'core', springs: '1R' }),
      makeExercise({ id: 'c-3', nameKo: '코어 C', blockCategory: 'core', springs: '1R 1B' }),
    ]);

    const withRestAndLocked: SequenceStep[] = [
      makeStep({ stepId: 'c1', order: 1, blockCategory: 'core', exerciseId: 'c-1' }),
      makeStep({ stepId: 'c2', order: 2, blockCategory: 'core', exerciseId: 'c-2', locked: true }),
      makeStep({ stepId: 'r1', order: 3, kind: 'rest', blockCategory: 'core', exerciseId: '' }),
      makeStep({ stepId: 'c3', order: 4, blockCategory: 'core', exerciseId: 'c-3' }),
    ];

    const lockedPlan = optimizeSequenceTransitions(withRestAndLocked, coreExercises);
    expect(lockedPlan.canImprove).toBe(false);
    expect(lockedPlan.optimizedSteps.map((s) => s.stepId)).toEqual(['c1', 'c2', 'r1', 'c3']);
  });

  it('never places high-RPE extension or inversion steps ahead of warmup or at index 0 without warmup', () => {
    const exercises = toMap([
      makeExercise({
        id: 'prep-neutral',
        nameKo: '중립 코어 프렙',
        blockCategory: 'core',
        spinalPlanes: ['neutral'],
        level: '1.0',
        springs: '2R',
      }),
      makeExercise({
        id: 'short-spine-inversion',
        nameKo: '숏 스파인 마사지',
        nameEn: 'Short Spine Massage',
        blockCategory: 'core',
        spinalPlanes: ['flexion', 'extension'],
        level: '2.0',
        springs: '1R 1B',
      }),
      makeExercise({
        id: 'core-2',
        nameKo: '코어 리치',
        blockCategory: 'core',
        spinalPlanes: ['flexion'],
        level: '1.5',
        springs: '1R 1B',
      }),
      makeExercise({
        id: 'warm-later',
        nameKo: '호흡 워밍업',
        blockCategory: 'warmup',
        spinalPlanes: ['neutral'],
        level: '1.0',
        springs: '1R 1B',
      }),
    ]);

    // Case 1: no warmup present — high-RPE inversion must not jump to index 0 ahead of neutral prep
    const noWarmupSteps: SequenceStep[] = [
      makeStep({ stepId: 's1', order: 1, blockCategory: 'core', exerciseId: 'prep-neutral' }),
      makeStep({
        stepId: 's2',
        order: 2,
        blockCategory: 'core',
        exerciseId: 'short-spine-inversion',
        selectedLayer: 'hard',
      }),
      makeStep({ stepId: 's3', order: 3, blockCategory: 'core', exerciseId: 'core-2' }),
    ];

    const noWarmupPlan = optimizeSequenceTransitions(noWarmupSteps, exercises);
    expect(noWarmupPlan.optimizedSteps[0]?.stepId).not.toBe('s2');

    // Case 2: warmup exists later — high-RPE inversion before warmup stays pinned
    const beforeWarmupSteps: SequenceStep[] = [
      makeStep({ stepId: 's1', order: 1, blockCategory: 'core', exerciseId: 'prep-neutral' }),
      makeStep({
        stepId: 's2',
        order: 2,
        blockCategory: 'core',
        exerciseId: 'short-spine-inversion',
        selectedLayer: 'hard',
      }),
      makeStep({ stepId: 'w1', order: 3, blockCategory: 'warmup', exerciseId: 'warm-later' }),
    ];

    const beforeWarmupPlan = optimizeSequenceTransitions(beforeWarmupSteps, exercises);
    expect(beforeWarmupPlan.optimizedSteps.map((s) => s.stepId)).toEqual(['s1', 's2', 'w1']);
    expect(beforeWarmupPlan.canImprove).toBe(false);
  });

  it('optimizes length-2 blocks when adjacent block boundaries reduce friction, and ignores already-optimal sequences', () => {
    const exercises = toMap([
      makeExercise({ id: 'w', nameKo: '워밍업', blockCategory: 'warmup', springs: '2R 1B', box: 'none' }),
      makeExercise({ id: 'c-box', nameKo: '숏박스 코어', blockCategory: 'core', springs: '2R', box: 'short-box' }),
      makeExercise({ id: 'c-none', nameKo: '매트 코어', blockCategory: 'core', springs: '2R 1B', box: 'none' }),
      makeExercise({ id: 'cd', nameKo: '숏박스 스트레칭', blockCategory: 'cooldown', springs: '2R', box: 'short-box' }),
    ]);

    const boundarySteps: SequenceStep[] = [
      makeStep({ stepId: 'w1', order: 1, blockCategory: 'warmup', exerciseId: 'w' }),
      makeStep({ stepId: 'c1', order: 2, blockCategory: 'core', exerciseId: 'c-box' }),
      makeStep({ stepId: 'c2', order: 3, blockCategory: 'core', exerciseId: 'c-none' }),
      makeStep({ stepId: 'cd1', order: 4, blockCategory: 'cooldown', exerciseId: 'cd' }),
    ];

    const plan = optimizeSequenceTransitions(boundarySteps, exercises);
    expect(plan.canImprove).toBe(true);
    expect(plan.optimizedSteps.map((s) => s.stepId)).toEqual(['w1', 'c2', 'c1', 'cd1']);
    expect(plan.boxSwapsSaved).toBe(2);
    expect(plan.springChangesSaved).toBe(2);

    // Already-optimal sequence returns canImprove: false
    const optimalPlan = optimizeSequenceTransitions(plan.optimizedSteps, exercises);
    expect(optimalPlan.canImprove).toBe(false);
    expect(optimalPlan.movedCount).toBe(0);
  });

  it('optimizes large blocks (> 8 steps) via heuristic NN + 2-opt and remains strictly idempotent', () => {
    const catalog: PilatesExercise[] = [];
    const steps: SequenceStep[] = [];
    for (let i = 0; i < 10; i += 1) {
      const isShortBox = i % 2 === 0;
      const exId = `large-core-${i}`;
      catalog.push(
        makeExercise({
          id: exId,
          nameKo: `코어 동작 ${i + 1}`,
          blockCategory: 'core',
          box: isShortBox ? 'short-box' : 'none',
          springs: isShortBox ? '2R' : '1R 1B',
          footbar: isShortBox ? 'down' : 'high',
          bodyPosition: isShortBox ? 'seated' : 'supine',
        }),
      );
      steps.push(
        makeStep({
          stepId: `step-${String(i).padStart(2, '0')}`,
          order: i + 1,
          blockCategory: 'core',
          exerciseId: exId,
        }),
      );
    }

    const exercises = toMap(catalog);
    const firstPass = optimizeSequenceTransitions(steps, exercises);

    expect(firstPass.canImprove).toBe(true);
    expect(firstPass.boxSwapsSaved).toBeGreaterThanOrEqual(7);
    expect(firstPass.afterAnalysis.boxSwapCount).toBe(1);
    expect(firstPass.afterAnalysis.springSwapCount).toBe(1);

    const secondPass = optimizeSequenceTransitions(firstPass.optimizedSteps, exercises);
    expect(secondPass.canImprove).toBe(false);
    expect(secondPass.movedCount).toBe(0);
    expect(secondPass.optimizedSteps.map((s) => s.stepId)).toEqual(
      firstPass.optimizedSteps.map((s) => s.stepId),
    );
  });

  it('renders the optimize action button and inline undo restoration cleanly in SequenceFlowTelemetryStrip', () => {
    const exercises = toMap([
      makeExercise({
        id: 'ex-warm',
        nameKo: '펠빅 클락 호흡',
        blockCategory: 'warmup',
        springs: '1R 1B',
        box: 'none',
      }),
      makeExercise({
        id: 'ex-sb1',
        nameKo: '숏박스 라운드백',
        blockCategory: 'core',
        springs: '2R',
        box: 'short-box',
        footbar: 'down',
        bodyPosition: 'seated',
      }),
      makeExercise({
        id: 'ex-none',
        nameKo: '리포머 헌드레드',
        blockCategory: 'core',
        springs: '1R 1B',
        box: 'none',
        footbar: 'high',
        bodyPosition: 'supine',
      }),
      makeExercise({
        id: 'ex-sb2',
        nameKo: '숏박스 트위스트',
        blockCategory: 'core',
        springs: '2R',
        box: 'short-box',
        footbar: 'down',
        bodyPosition: 'seated',
      }),
    ]);

    const initialSteps: SequenceStep[] = [
      makeStep({ stepId: 'w1', order: 1, blockCategory: 'warmup', exerciseId: 'ex-warm' }),
      makeStep({ stepId: 'c1', order: 2, blockCategory: 'core', exerciseId: 'ex-sb1' }),
      makeStep({ stepId: 'c2', order: 3, blockCategory: 'core', exerciseId: 'ex-none' }),
      makeStep({ stepId: 'c3', order: 4, blockCategory: 'core', exerciseId: 'ex-sb2' }),
    ];

    const onAppliedSpy = vi.fn();
    const onUndoSpy = vi.fn();

    const StatefulHarness: React.FC = () => {
      const [currentSteps, setCurrentSteps] = useState<SequenceStep[]>(initialSteps);
      const [, setHistory] = useState<SequenceStep[][]>([]);

      return React.createElement(
        'div',
        null,
        React.createElement(
          'output',
          { 'data-testid': 'current-order' },
          currentSteps.map((s) => s.stepId).join(','),
        ),
        React.createElement(SequenceFlowTelemetryStrip, {
          steps: currentSteps,
          exercisesById: exercises,
          onApplyTransitionBuffers: () => undefined,
          onApplyOptimizedOrder: (optimizedSteps, summaryKo) => {
            onAppliedSpy(optimizedSteps, summaryKo);
            setHistory((prev) => [...prev, currentSteps]);
            setCurrentSteps(optimizedSteps);
          },
          onUndoOptimizedOrder: () => {
            onUndoSpy();
            setHistory((prev) => {
              const previous = prev[prev.length - 1];
              if (previous) {
                setCurrentSteps(previous);
              }
              return prev.slice(0, -1);
            });
          },
        }),
      );
    };

    render(React.createElement(StatefulHarness));

    const optimizeBtn = screen.getByTestId('optimize-transition-order-btn');
    expect(optimizeBtn).toBeInTheDocument();
    expect(optimizeBtn.textContent).toMatch(/^동선 자동 묶기 \(마찰 -\d+ · -\d+초\)$/);
    expect(optimizeBtn.getAttribute('title')).toContain('블록 경계');
    expect(optimizeBtn.style.fontVariantNumeric).toBe('tabular-nums');
    expect(optimizeBtn.style.wordBreak).toBe('keep-all');
    expect(screen.queryByTestId('undo-optimized-order-btn')).not.toBeInTheDocument();

    // Apply optimization
    fireEvent.click(optimizeBtn);
    expect(onAppliedSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-order')).toHaveTextContent('w1,c2,c1,c3');

    // Optimize button disappears (already optimal) and inline undo button appears
    expect(screen.queryByTestId('optimize-transition-order-btn')).not.toBeInTheDocument();
    const undoBtn = screen.getByTestId('undo-optimized-order-btn');
    expect(undoBtn).toHaveTextContent('원래 순서로 되돌리기');

    // Click undo -> exact original order restored
    fireEvent.click(undoBtn);
    expect(onUndoSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('current-order')).toHaveTextContent('w1,c1,c2,c3');
    expect(screen.queryByTestId('undo-optimized-order-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('optimize-transition-order-btn')).toBeInTheDocument();
  });

  it('minimizes apparatus ping-pong within a block and supports fallback undo without onUndoOptimizedOrder', () => {
    const exercises = toMap([
      makeExercise({
        id: 'ref-1',
        nameKo: '리포머 스완 프렙',
        apparatus: 'reformer',
        blockCategory: 'upper-body',
        springs: '1R',
      }),
      makeExercise({
        id: 'mat-1',
        nameKo: '매트 암 써클',
        apparatus: 'mat',
        blockCategory: 'upper-body',
        springs: 'Bodyweight',
      }),
      makeExercise({
        id: 'ref-2',
        nameKo: '리포머 체스트 익스팬션',
        apparatus: 'reformer',
        blockCategory: 'upper-body',
        springs: '1R',
      }),
    ]);

    const initialSteps: SequenceStep[] = [
      makeStep({ stepId: 'u1', order: 1, blockCategory: 'upper-body', exerciseId: 'ref-1' }),
      makeStep({ stepId: 'u2', order: 2, blockCategory: 'upper-body', exerciseId: 'mat-1' }),
      makeStep({ stepId: 'u3', order: 3, blockCategory: 'upper-body', exerciseId: 'ref-2' }),
    ];

    const plan = optimizeSequenceTransitions(initialSteps, exercises);
    expect(plan.canImprove).toBe(true);
    expect(plan.optimizedSteps.map((s) => s.stepId)).toEqual(['u1', 'u3', 'u2']);
    expect(plan.beforeAnalysis.apparatusSwapCount).toBe(2);
    expect(plan.afterAnalysis.apparatusSwapCount).toBe(1);
    expect(plan.savedTransitionSec).toBe(25);

    // Fallback undo when only onApplyOptimizedOrder is supplied
    const FallbackHarness: React.FC = () => {
      const [currentSteps, setCurrentSteps] = useState<SequenceStep[]>(initialSteps);
      return React.createElement(
        'div',
        null,
        React.createElement(
          'output',
          { 'data-testid': 'fallback-order' },
          currentSteps.map((s) => s.stepId).join(','),
        ),
        React.createElement(SequenceFlowTelemetryStrip, {
          steps: currentSteps,
          exercisesById: exercises,
          onApplyOptimizedOrder: (nextSteps) => setCurrentSteps(nextSteps),
        }),
      );
    };

    render(React.createElement(FallbackHarness));
    fireEvent.click(screen.getByTestId('optimize-transition-order-btn'));
    expect(screen.getByTestId('fallback-order')).toHaveTextContent('u1,u3,u2');
    fireEvent.click(screen.getByTestId('undo-optimized-order-btn'));
    expect(screen.getByTestId('fallback-order')).toHaveTextContent('u1,u2,u3');
  });
});
