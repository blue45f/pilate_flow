import React, { useMemo } from 'react';
import { ArrowDownUp, CheckCircle2, Sparkles } from 'lucide-react';
import type { PilatesExercise, SequenceStep, SpinalPlane } from '../../types/pilates';
import { isRestStep } from '../../utils/sequenceEngine';
import { getSequenceStepClassSection } from '../../utils/sequenceMotionBinding';

export interface FlowCoachSummary {
  readonly springTransitions: number;
  readonly positionTransitions: number;
  readonly boxTransitions: number;
  readonly coveredPlanes: ReadonlySet<SpinalPlane>;
  readonly missingActionPlanes: readonly { readonly plane: SpinalPlane; readonly labelKo: string }[];
  readonly optimizedSteps: SequenceStep[];
  readonly savedTransitionsCount: number;
}

const ACTION_PLANE_LABELS: ReadonlyArray<{ readonly plane: SpinalPlane; readonly labelKo: string }> = [
  { plane: 'flexion', labelKo: '굴곡' },
  { plane: 'extension', labelKo: '신전' },
  { plane: 'lateral', labelKo: '측굴' },
  { plane: 'rotation', labelKo: '회전' },
];

function countSetupTransitions(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): { springTransitions: number; positionTransitions: number; boxTransitions: number } {
  let springTransitions = 0;
  let positionTransitions = 0;
  let boxTransitions = 0;
  let prevEx: PilatesExercise | undefined;
  let prevSpring = '';

  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exercisesById.get(step.exerciseId);
    if (!ex) continue;
    const curSpring = (step.customSpringOverride || ex.springs || '').trim().toLowerCase();
    if (prevEx) {
      if (curSpring && prevSpring && curSpring !== prevSpring) springTransitions += 1;
      if (ex.bodyPosition !== prevEx.bodyPosition) positionTransitions += 1;
      if (ex.box !== prevEx.box) boxTransitions += 1;
    }
    prevEx = ex;
    prevSpring = curSpring;
  }

  return { springTransitions, positionTransitions, boxTransitions };
}

export function analyzeAndOptimizeFlowSteps(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): FlowCoachSummary {
  const beforeCounts = countSetupTransitions(steps, exercisesById);
  const coveredPlanes = new Set<SpinalPlane>();

  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exercisesById.get(step.exerciseId);
    if (!ex) continue;
    for (const plane of ex.spinalPlanes) {
      coveredPlanes.add(plane);
    }
  }

  const missingActionPlanes = ACTION_PLANE_LABELS.filter(
    (item) => !coveredPlanes.has(item.plane),
  );

  // Build transition-minimized ordering for unlocked MAIN section exercise steps
  // while keeping warmup first, cooldown last, rest positions, and locked steps pinned.
  const copy = steps.map((st) => ({ ...st }));
  const movableMainIndices: number[] = [];
  for (let i = 0; i < copy.length; i += 1) {
    const st = copy[i]!;
    if (isRestStep(st) || st.locked) continue;
    const role = getSequenceStepClassSection(st);
    const normalizedSection = role === 'preparation' ? 'warmup' : role;
    if (normalizedSection === 'main') {
      movableMainIndices.push(i);
    }
  }

  if (movableMainIndices.length >= 3) {
    const pool = movableMainIndices.map((idx) => copy[idx]!);
    // Anchor from the step immediately preceding the first movable main index (if any)
    let prevAnchorEx: PilatesExercise | undefined;
    let prevAnchorSpring = '';
    for (let i = movableMainIndices[0]! - 1; i >= 0; i -= 1) {
      const candidate = copy[i]!;
      if (!isRestStep(candidate)) {
        prevAnchorEx = exercisesById.get(candidate.exerciseId);
        prevAnchorSpring = (candidate.customSpringOverride || prevAnchorEx?.springs || '')
          .trim()
          .toLowerCase();
        break;
      }
    }

    const orderedPool: SequenceStep[] = [];
    const remaining = [...pool];
    while (remaining.length > 0) {
      if (!prevAnchorEx) {
        const first = remaining.shift()!;
        orderedPool.push(first);
        prevAnchorEx = exercisesById.get(first.exerciseId);
        prevAnchorSpring = (first.customSpringOverride || prevAnchorEx?.springs || '')
          .trim()
          .toLowerCase();
        continue;
      }

      let bestIdx = 0;
      let bestCost = Number.POSITIVE_INFINITY;
      for (let r = 0; r < remaining.length; r += 1) {
        const cand = remaining[r]!;
        const candEx = exercisesById.get(cand.exerciseId);
        if (!candEx) continue;
        const candSpring = (cand.customSpringOverride || candEx.springs || '')
          .trim()
          .toLowerCase();
        let cost = 0;
        if (candEx.apparatus !== prevAnchorEx.apparatus) cost += 6;
        if (candEx.box !== prevAnchorEx.box) cost += 4;
        if (candEx.bodyPosition !== prevAnchorEx.bodyPosition) cost += 2;
        if (candSpring && prevAnchorSpring && candSpring !== prevAnchorSpring) cost += 1.5;
        if (cost < bestCost) {
          bestCost = cost;
          bestIdx = r;
        }
      }
      const chosen = remaining.splice(bestIdx, 1)[0]!;
      orderedPool.push(chosen);
      prevAnchorEx = exercisesById.get(chosen.exerciseId);
      prevAnchorSpring = (chosen.customSpringOverride || prevAnchorEx?.springs || '')
        .trim()
        .toLowerCase();
    }

    movableMainIndices.forEach((slotIdx, poolPos) => {
      copy[slotIdx] = orderedPool[poolPos]!;
    });
  }

  const normalizedOptimized = copy.map((st, idx) => ({ ...st, order: idx + 1 }));
  const afterCounts = countSetupTransitions(normalizedOptimized, exercisesById);
  const beforeTotal =
    beforeCounts.springTransitions +
    beforeCounts.positionTransitions +
    beforeCounts.boxTransitions;
  const afterTotal =
    afterCounts.springTransitions +
    afterCounts.positionTransitions +
    afterCounts.boxTransitions;
  const savedTransitionsCount = Math.max(0, beforeTotal - afterTotal);

  return {
    ...beforeCounts,
    coveredPlanes,
    missingActionPlanes,
    optimizedSteps: savedTransitionsCount > 0 ? normalizedOptimized : copy,
    savedTransitionsCount,
  };
}

export interface SequenceQuickFlowCoachStripProps {
  readonly steps: readonly SequenceStep[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly onApplyOptimizedSteps: (nextSteps: SequenceStep[], message: string) => void;
  readonly onOpenFinderForMissingPlane?: () => void;
}

export const SequenceQuickFlowCoachStrip: React.FC<SequenceQuickFlowCoachStripProps> = ({
  steps,
  exercisesById,
  onApplyOptimizedSteps,
  onOpenFinderForMissingPlane,
}) => {
  const analysis = useMemo(
    () => analyzeAndOptimizeFlowSteps(steps, exercisesById),
    [steps, exercisesById],
  );

  const exerciseCount = steps.filter((st) => !isRestStep(st)).length;
  if (exerciseCount < 2) return null;

  return (
    <div
      className="pf-quick-flow-coach"
      data-testid="sequence-quick-flow-coach"
      role="region"
      aria-label="시퀀스 전환 및 척추 움직임 균형 요약"
    >
      <div className="pf-quick-flow-coach__metrics">
        <span className="pf-quick-flow-coach__stat">
          스프링 전환 <strong>{analysis.springTransitions}회</strong>
        </span>
        <span className="pf-quick-flow-coach__stat">
          체위 전환 <strong>{analysis.positionTransitions}회</strong>
        </span>
        <span className="pf-quick-flow-coach__planes" aria-label="척추 4면 포함 현황">
          {ACTION_PLANE_LABELS.map((item) => {
            const active = analysis.coveredPlanes.has(item.plane);
            return (
              <span
                key={item.plane}
                className={`pf-plane-dot-chip ${active ? 'is-covered' : 'is-missing'}`}
              >
                {active ? '✓' : '·'} {item.labelKo}
              </span>
            );
          })}
        </span>
      </div>

      <div className="pf-quick-flow-coach__actions">
        {analysis.savedTransitionsCount > 0 ? (
          <button
            type="button"
            className="pf-quick-flow-coach__btn is-optimize"
            data-testid="quick-flow-optimize-transitions-btn"
            onClick={() =>
              onApplyOptimizedSteps(
                analysis.optimizedSteps,
                `본운동 순서를 기구·체위·스프링 흐름에 맞춰 정돈해 전환 ${analysis.savedTransitionsCount}회를 줄였어요. (준비·마무리·잠금 유지, 되돌리기 가능)`,
              )
            }
          >
            <ArrowDownUp size={13} aria-hidden="true" /> 전환 {analysis.savedTransitionsCount}회 줄이기 자동 정렬
          </button>
        ) : (
          <span className="pf-quick-flow-coach__ok">
            <CheckCircle2 size={13} aria-hidden="true" /> 기구·체위 전환 동선 최적
          </span>
        )}
        {analysis.missingActionPlanes.length > 0 && onOpenFinderForMissingPlane && (
          <button
            type="button"
            className="pf-quick-flow-coach__btn"
            data-testid="quick-flow-add-missing-plane-btn"
            onClick={onOpenFinderForMissingPlane}
          >
            <Sparkles size={13} aria-hidden="true" /> 미포함 면(
            {analysis.missingActionPlanes
              .slice(0, 2)
              .map((p) => p.labelKo)
              .join('·')}
            ) 보강 동작 찾기
          </button>
        )}
      </div>
    </div>
  );
};
