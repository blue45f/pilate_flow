import { APPARATUS_LABELS, POSITION_LABELS, PROP_LABELS, REFORMER_BRAND_META } from '../data/pilatesCatalog';
import { getExerciseEquipment } from '../data/equipmentCatalog';
import type {
  ApparatusType,
  BoxState,
  FootbarState,
  HeadrestState,
  PilatesExercise,
  PropType,
  ReformerBrand,
  SequenceStep,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { formatBrandSpringEquivalent } from './brandSpringConverter';
import { getMovementKey, isRestStep } from './sequenceEngine';
import { getSequenceStepClassSection } from './sequenceMotionBinding';

const BOX_LABELS_KO: Record<BoxState, string> = {
  none: '박스 없음',
  'short-box': '숏박스',
  'long-box': '롱박스',
};

const FOOTBAR_LABELS_KO: Record<FootbarState, string> = {
  none: '풋바 없음',
  down: '풋바 내림',
  low: '풋바 낮음',
  mid: '풋바 중간',
  high: '풋바 높음',
};

const HEADREST_LABELS_KO: Record<HeadrestState, string> = {
  flat: '헤드레스트 평평',
  up: '헤드레스트 올림',
  down: '헤드레스트 내림',
};

const RECOGNIZED_SPRING_PATTERN =
  /\b\d*(?:\.\d+)?\s*[RBYGW]\b|빨강|적색|파랑|청색|노랑|황색|초록|녹색|하양|백색|\b(?:red|blue|yellow|green|white|springs?|bodyweight)\b|무스프링|스프링\s*없음|래더\s*고정/i;

const EXPLICIT_UNKNOWN_SPRING_PATTERN =
  /기구별\s*설정|미확인|미지정|확인\s*필요|미상|알\s*수\s*없|unknown|unspecified|tbd/i;

/**
 * True when a spring text cannot be honestly mapped to a known setup and must be shown as '미확인'.
 * Never fabricates numeric load or default spring colors for unknown setup strings.
 */
export function isUnknownSpringSetup(
  rawSprings: string | undefined,
  apparatus?: ApparatusType | 'mixed',
): boolean {
  if (apparatus === 'mat' || apparatus === 'barrel') return false;
  const trimmed = (rawSprings ?? '').trim();
  if (!trimmed) return true;
  if (EXPLICIT_UNKNOWN_SPRING_PATTERN.test(trimmed)) return true;
  if (RECOGNIZED_SPRING_PATTERN.test(trimmed)) return false;
  return !Object.values(REFORMER_BRAND_META).some(
    (meta) => Object.prototype.hasOwnProperty.call(meta.springMapping, trimmed),
  );
}

export interface StepResolvedSetup {
  readonly apparatus: ApparatusType;
  readonly apparatusLabelKo: string;
  readonly springLabelKo: string;
  readonly springUnknown: boolean;
  readonly equipmentUnknown: boolean;
  readonly box: BoxState;
  readonly boxLabelKo: string;
  readonly footbar: FootbarState;
  readonly footbarLabelKo: string;
  readonly headrest: HeadrestState;
  readonly headrestLabelKo: string;
  readonly props: readonly PropType[];
  readonly propsLabelKo: string;
  readonly bodyPositionLabelKo: string;
  readonly unknownItemsKo: readonly string[];
}

export function resolveStepSetup(
  step: SequenceStep,
  exercise: PilatesExercise,
  brand: ReformerBrand,
): StepResolvedSetup {
  const equipmentInfo = getExerciseEquipment(exercise);
  const rawSpring = (step.customSpringOverride ?? exercise.springs ?? '').trim();
  const springUnknown = isUnknownSpringSetup(rawSpring, exercise.apparatus);
  const springLabelKo = springUnknown
    ? rawSpring && !EXPLICIT_UNKNOWN_SPRING_PATTERN.test(rawSpring)
      ? `${rawSpring} (세팅 미확인)`
      : '스프링 미확인'
    : step.customSpringOverride?.trim()
      ? formatBrandSpringEquivalent(step.customSpringOverride, brand, exercise.apparatus)
          .equivalentLabelKo
      : formatBrandSpringEquivalent(exercise.springs, brand, exercise.apparatus).equivalentLabelKo;

  const box = step.boxOverride ?? exercise.box;
  const footbar = step.footbarOverride ?? exercise.footbar;
  const headrest = step.headrestOverride ?? exercise.headrest;
  const activeProps =
    step.propOverride !== undefined
      ? step.propOverride === 'none'
        ? []
        : [step.propOverride]
      : exercise.props.filter((p) => p !== 'none');

  const propsLabelKo =
    activeProps.length > 0
      ? activeProps.map((p) => PROP_LABELS[p]?.ko ?? p).join(', ')
      : '소도구 없음';

  const unknownItemsKo: string[] = [];
  if (!equipmentInfo.requirementsKnown) unknownItemsKo.push('기구 요구사항 미확인');
  if (springUnknown) unknownItemsKo.push('스프링 미확인');

  return {
    apparatus: exercise.apparatus,
    apparatusLabelKo: APPARATUS_LABELS[exercise.apparatus].short,
    springLabelKo,
    springUnknown,
    equipmentUnknown: !equipmentInfo.requirementsKnown,
    box,
    boxLabelKo: BOX_LABELS_KO[box],
    footbar,
    footbarLabelKo: FOOTBAR_LABELS_KO[footbar],
    headrest,
    headrestLabelKo: HEADREST_LABELS_KO[headrest],
    props: activeProps,
    propsLabelKo,
    bodyPositionLabelKo: POSITION_LABELS[exercise.bodyPosition].ko.split(' ')[0] ?? exercise.bodyPosition,
    unknownItemsKo,
  };
}

export interface StepTransitionCue {
  readonly changes: readonly string[];
  readonly unknownNoticeKo: string | null;
  readonly hasChanges: boolean;
}

/**
 * Compares the current exercise step against the nearest preceding non-rest exercise step
 * so apparatus, prop, body position/direction, known setup, and '미확인' states are all visible.
 */
export function describeStepTransitionFromPrevious(
  steps: readonly SequenceStep[],
  stepIndex: number,
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  brand: ReformerBrand,
): StepTransitionCue | null {
  const step = steps[stepIndex];
  if (!step || isRestStep(step)) return null;
  const exercise = exercisesById.get(step.exerciseId);
  if (!exercise) {
    return {
      changes: [],
      unknownNoticeKo: '동작 세팅 미확인',
      hasChanges: true,
    };
  }
  const current = resolveStepSetup(step, exercise, brand);

  let prevStep: SequenceStep | undefined;
  let prevExercise: PilatesExercise | undefined;
  for (let i = stepIndex - 1; i >= 0; i -= 1) {
    const candidate = steps[i]!;
    if (isRestStep(candidate)) continue;
    prevStep = candidate;
    prevExercise = exercisesById.get(candidate.exerciseId);
    break;
  }

  if (!prevStep || !prevExercise) {
    return current.unknownItemsKo.length > 0
      ? {
          changes: [],
          unknownNoticeKo: `${current.unknownItemsKo.join(' · ')} (수업 전 현장 확인)`,
          hasChanges: true,
        }
      : null;
  }

  const previous = resolveStepSetup(prevStep, prevExercise, brand);
  const changes: string[] = [];

  if (previous.apparatus !== current.apparatus) {
    changes.push(`기구 ${previous.apparatusLabelKo} → ${current.apparatusLabelKo}`);
  }
  if (previous.box !== current.box) {
    changes.push(`${previous.boxLabelKo} → ${current.boxLabelKo}`);
  }
  if (
    current.apparatus === 'reformer' &&
    previous.apparatus === 'reformer' &&
    previous.footbar !== current.footbar
  ) {
    changes.push(`${previous.footbarLabelKo} → ${current.footbarLabelKo}`);
  }
  if (
    current.apparatus === 'reformer' &&
    previous.apparatus === 'reformer' &&
    previous.headrest !== current.headrest
  ) {
    changes.push(`${previous.headrestLabelKo} → ${current.headrestLabelKo}`);
  }
  if (prevExercise.bodyPosition !== exercise.bodyPosition) {
    changes.push(`자세 ${previous.bodyPositionLabelKo} → ${current.bodyPositionLabelKo}`);
  }
  if (previous.propsLabelKo !== current.propsLabelKo) {
    changes.push(`소도구 ${previous.propsLabelKo} → ${current.propsLabelKo}`);
  }
  const prevRawSpring = (prevStep.customSpringOverride ?? prevExercise.springs ?? '').trim();
  const currRawSpring = (step.customSpringOverride ?? exercise.springs ?? '').trim();
  if (!current.springUnknown && prevRawSpring !== currRawSpring) {
    changes.push(`스프링 ${current.springLabelKo}`);
  }

  const unknownNoticeKo =
    current.unknownItemsKo.length > 0
      ? `${current.unknownItemsKo.join(' · ')} (수업 전 현장 확인)`
      : null;

  if (changes.length === 0 && !unknownNoticeKo) return null;
  return {
    changes,
    unknownNoticeKo,
    hasChanges: true,
  };
}

export interface TransitionDiffRow {
  readonly position: number;
  readonly beforeStepId: string;
  readonly beforeTitleKo: string;
  readonly afterStepId: string;
  readonly afterTitleKo: string;
  readonly changed: boolean;
  readonly preservedReason?: 'locked' | 'rest' | 'section-boundary' | 'bilateral-pair';
}

export interface SafeTransitionOptimizationPlan {
  readonly beforeSteps: readonly SequenceStep[];
  readonly afterSteps: SequenceStep[];
  readonly beforeTransitionCount: number;
  readonly afterTransitionCount: number;
  readonly savedTransitionCount: number;
  readonly preservedLockedCount: number;
  readonly preservedRestCount: number;
  readonly preservedPairCount: number;
  readonly diffRows: readonly TransitionDiffRow[];
  /** Explicit non-safety disclaimer (PF-06: never claim reordering guarantees class safety). */
  readonly disclaimerKo: string;
}

function countTotalSetupShifts(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): number {
  let count = 0;
  let prevStep: SequenceStep | undefined;
  let prevEx: PilatesExercise | undefined;
  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exercisesById.get(step.exerciseId);
    if (!ex) continue;
    if (prevStep && prevEx) {
      if (prevEx.apparatus !== ex.apparatus) count += 1;
      if ((prevStep.boxOverride ?? prevEx.box) !== (step.boxOverride ?? ex.box)) count += 1;
      if (prevEx.bodyPosition !== ex.bodyPosition) count += 1;
      const pSpring = (prevStep.customSpringOverride ?? prevEx.springs ?? '').trim().toLowerCase();
      const cSpring = (step.customSpringOverride ?? ex.springs ?? '').trim().toLowerCase();
      if (
        pSpring &&
        cSpring &&
        !isUnknownSpringSetup(pSpring, prevEx.apparatus) &&
        !isUnknownSpringSetup(cSpring, ex.apparatus) &&
        pSpring !== cSpring
      ) {
        count += 1;
      }
    }
    prevStep = step;
    prevEx = ex;
  }
  return count;
}

function isComplementarySidePair(
  first: SequenceStep,
  second: SequenceStep,
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): boolean {
  if (isRestStep(first) || isRestStep(second)) return false;
  const exA = exercisesById.get(first.exerciseId);
  const exB = exercisesById.get(second.exerciseId);
  if (!exA || !exB) return false;
  const sameMovement = first.exerciseId === second.exerciseId || getMovementKey(exA) === getMovementKey(exB);
  if (!sameMovement) return false;
  const pairSides =
    (first.sideMode === 'left' && second.sideMode === 'right') ||
    (first.sideMode === 'right' && second.sideMode === 'left');
  return pairSides;
}

/**
 * Builds a transition-reducing step order proposal while strictly preserving:
 * 1. Locked steps (`step.locked === true`) at their exact indices
 * 2. Rest steps (`isRestStep(step)`) at their exact indices
 * 3. Class sections (`preparation`, `main`, `cooldown`) — warmup/preparation and cooldown stay in their sections
 * 4. Adjacent unilateral L/R pairs (`left` + `right` or `right` + `left` of the same movement)
 *
 * Never modifies durations or claims safe class execution.
 */
export function buildSafeTransitionOptimization(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): SafeTransitionOptimizationPlan {
  const clone = steps.map((s) => ({ ...s }));
  const beforeTransitionCount = countTotalSetupShifts(clone, exercisesById);
  const preservedLockedCount = clone.filter((s) => Boolean(s.locked)).length;
  const preservedRestCount = clone.filter((s) => isRestStep(s)).length;

  // Identify adjacent complementary L/R pairs within the same section so they never split
  const pairedIndices = new Set<number>();
  let preservedPairCount = 0;
  for (let i = 0; i < clone.length - 1; i += 1) {
    if (pairedIndices.has(i)) continue;
    const first = clone[i]!;
    const second = clone[i + 1]!;
    const secA = getSequenceStepClassSection(first, clone);
    const secB = getSequenceStepClassSection(second, clone);
    if (secA === secB && isComplementarySidePair(first, second, exercisesById)) {
      pairedIndices.add(i);
      pairedIndices.add(i + 1);
      preservedPairCount += 1;
    }
  }

  // Optimize only unlocked, non-rest units within the 'main' section, keeping preparation & cooldown untouched
  type MovableUnit = { readonly steps: SequenceStep[]; readonly slotIndices: number[] };
  const mainUnits: MovableUnit[] = [];
  let cursor = 0;
  while (cursor < clone.length) {
    const st = clone[cursor]!;
    const role: ClassSectionRole = getSequenceStepClassSection(st, clone);
    if (role !== 'main' || st.locked || isRestStep(st)) {
      cursor += 1;
      continue;
    }
    if (
      cursor + 1 < clone.length &&
      pairedIndices.has(cursor) &&
      pairedIndices.has(cursor + 1) &&
      !clone[cursor + 1]!.locked &&
      !isRestStep(clone[cursor + 1]!) &&
      getSequenceStepClassSection(clone[cursor + 1]!, clone) === 'main'
    ) {
      mainUnits.push({
        steps: [st, clone[cursor + 1]!],
        slotIndices: [cursor, cursor + 1],
      });
      cursor += 2;
      continue;
    }
    if (pairedIndices.has(cursor)) {
      // Paired with a locked step — keep pinned!
      cursor += 1;
      continue;
    }
    mainUnits.push({
      steps: [st],
      slotIndices: [cursor],
    });
    cursor += 1;
  }

  // Only contiguous single-slot or adjacent-pair slots of matching total length can be permuted safely
  const totalSlots = mainUnits.flatMap((u) => u.slotIndices);
  const hasContiguousPairWithNonContiguousSlots =
    mainUnits.some((u) => u.steps.length === 2) &&
    totalSlots.some((idx, pos) => pos > 0 && idx !== totalSlots[pos - 1]! + 1);

  if (mainUnits.length >= 2 && !hasContiguousPairWithNonContiguousSlots) {
    let anchorStep: SequenceStep | undefined;
    let anchorEx: PilatesExercise | undefined;
    for (let i = totalSlots[0]! - 1; i >= 0; i -= 1) {
      const cand = clone[i]!;
      if (!isRestStep(cand)) {
        anchorStep = cand;
        anchorEx = exercisesById.get(cand.exerciseId);
        break;
      }
    }

    const remaining = [...mainUnits];
    const orderedSteps: SequenceStep[] = [];
    while (remaining.length > 0) {
      if (!anchorEx || !anchorStep) {
        const first = remaining.shift()!;
        orderedSteps.push(...first.steps);
        anchorStep = first.steps.at(-1);
        anchorEx = anchorStep ? exercisesById.get(anchorStep.exerciseId) : undefined;
        continue;
      }
      let bestIdx = 0;
      let bestCost = Number.POSITIVE_INFINITY;
      for (let r = 0; r < remaining.length; r += 1) {
        const candFirst = remaining[r]!.steps[0]!;
        const candEx = exercisesById.get(candFirst.exerciseId);
        if (!candEx) continue;
        let cost = 0;
        if (candEx.apparatus !== anchorEx.apparatus) cost += 6;
        if ((candFirst.boxOverride ?? candEx.box) !== (anchorStep.boxOverride ?? anchorEx.box)) {
          cost += 4;
        }
        if (candEx.bodyPosition !== anchorEx.bodyPosition) cost += 2;
        const aSpring = (anchorStep.customSpringOverride ?? anchorEx.springs ?? '')
          .trim()
          .toLowerCase();
        const cSpring = (candFirst.customSpringOverride ?? candEx.springs ?? '')
          .trim()
          .toLowerCase();
        if (
          aSpring &&
          cSpring &&
          !isUnknownSpringSetup(aSpring, anchorEx.apparatus) &&
          !isUnknownSpringSetup(cSpring, candEx.apparatus) &&
          aSpring !== cSpring
        ) {
          cost += 1.5;
        }
        if (cost < bestCost) {
          bestCost = cost;
          bestIdx = r;
        }
      }
      const chosen = remaining.splice(bestIdx, 1)[0]!;
      orderedSteps.push(...chosen.steps);
      anchorStep = chosen.steps.at(-1);
      anchorEx = anchorStep ? exercisesById.get(anchorStep.exerciseId) : undefined;
    }

    if (orderedSteps.length === totalSlots.length) {
      totalSlots.forEach((slotIdx, pos) => {
        clone[slotIdx] = orderedSteps[pos]!;
      });
    }
  }

  const afterTransitionCount = countTotalSetupShifts(clone, exercisesById);
  const savedTransitionCount = Math.max(0, beforeTransitionCount - afterTransitionCount);
  const finalSteps =
    savedTransitionCount > 0
      ? clone.map((st, idx) => (st.locked ? st : { ...st, order: idx + 1 }))
      : steps.map((st) => (st.locked ? st : { ...st }));

  const titleOf = (st: SequenceStep) =>
    isRestStep(st) ? '휴식' : (exercisesById.get(st.exerciseId)?.nameKo ?? '동작');

  const diffRows: TransitionDiffRow[] = steps.map((beforeStep, idx) => {
    const afterStep = finalSteps[idx]!;
    const role = getSequenceStepClassSection(beforeStep, steps);
    const preservedReason: TransitionDiffRow['preservedReason'] = beforeStep.locked
      ? 'locked'
      : isRestStep(beforeStep)
        ? 'rest'
        : role !== 'main'
          ? 'section-boundary'
          : pairedIndices.has(idx)
            ? 'bilateral-pair'
            : undefined;
    return {
      position: idx + 1,
      beforeStepId: beforeStep.stepId,
      beforeTitleKo: titleOf(beforeStep),
      afterStepId: afterStep.stepId,
      afterTitleKo: titleOf(afterStep),
      changed: beforeStep.stepId !== afterStep.stepId,
      ...(preservedReason ? { preservedReason } : {}),
    };
  });

  return {
    beforeSteps: steps,
    afterSteps: finalSteps,
    beforeTransitionCount,
    afterTransitionCount: savedTransitionCount > 0 ? afterTransitionCount : beforeTransitionCount,
    savedTransitionCount,
    preservedLockedCount,
    preservedRestCount,
    preservedPairCount,
    diffRows,
    disclaimerKo:
      '기구·박스·체위 전환 횟수만 줄이는 순서 제안이며, 수업의 의학적 안전성이나 회원 적합성을 보장하지 않습니다.',
  };
}
