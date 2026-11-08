import type { SequenceStep } from '../types/pilates';
import type { ClassSectionRole, SequenceMotionStudyBindingStatus } from '../types/sequenceMotion';
import type { AnatomicalSide } from '../models/types';
import { getMotionStudyEntry, getMotionStudyPhase, getMotionStudyStage } from './motionStudyStages';
import type { MotionStudyEntry, MotionStudyPhase, MotionStudyStage } from './motionStudyStages';
import {
  assessSequenceMotionStudyBinding,
  getSequenceStepClassSection,
} from './sequenceMotionBinding';
import type { SequenceSimulation, SimulationPosition } from './sequenceSimulation';
import { isRestStep } from './sequenceEngine';

/** An illustrative display cycle only. It is never a prescribed repetition or cadence. */
export const CONNECTED_STUDY_DISPLAY_CYCLE_SEC = 8;

export const CONNECTED_CLASS_SECTION_LABELS: Readonly<Record<ClassSectionRole, string>> = {
  preparation: '준비운동',
  main: '본운동',
  cooldown: '마무리',
};

export interface ConnectedClassSection {
  readonly role: ClassSectionRole;
  readonly label: string;
  readonly durationSec: number;
  readonly stepIndices: readonly number[];
}

/** Each complete step budget, including its teaching, transition and rest, is counted once. */
export function buildConnectedClassSections(
  steps: readonly SequenceStep[],
  model: SequenceSimulation,
): readonly ConnectedClassSection[] {
  const roles: readonly ClassSectionRole[] = ['preparation', 'main', 'cooldown'];
  return roles.map((role) => {
    const stepIndices = steps.flatMap((step, index) =>
      getSequenceStepClassSection(step, steps) === role ? [index] : [],
    );
    const durationSec = stepIndices.reduce((sum, index) => {
      const duration = model.steps[index]?.durationSec;
      return (
        sum +
        (typeof duration === 'number' && Number.isFinite(duration) && duration > 0 ? duration : 0)
      );
    }, 0);
    return Object.freeze({
      role,
      label: CONNECTED_CLASS_SECTION_LABELS[role],
      durationSec,
      stepIndices: Object.freeze(stepIndices),
    });
  });
}

export type ConnectedStudySide = AnatomicalSide | 'both' | 'unknown';
export type ConnectedStudyKind = 'study' | 'rest' | 'transition' | 'unavailable' | 'empty';

export interface ConnectedMotionStudyState {
  readonly kind: ConnectedStudyKind;
  readonly bindingStatus: SequenceMotionStudyBindingStatus;
  readonly stepIndex: number | null;
  readonly nextStepIndex?: number;
  readonly section: ClassSectionRole;
  readonly entry?: MotionStudyEntry;
  readonly progress: number;
  readonly phase?: MotionStudyPhase;
  readonly stage?: MotionStudyStage;
  readonly side: ConnectedStudySide;
  readonly anatomicalSide?: AnatomicalSide;
  readonly static: boolean;
  readonly reason?: string;
}

export interface ResolveConnectedMotionStudyOptions {
  readonly model: SequenceSimulation;
  readonly position: SimulationPosition;
  readonly steps: readonly SequenceStep[];
  /** Manual selection remains available even when the plan's rehearsal gate is closed. */
  readonly selectedIndex?: number | null;
  readonly reducedMotion?: boolean;
  /** Host/source availability, independent of whether the parent clock is paused. */
  readonly active?: boolean;
}

const UNAVAILABLE_REASONS: Readonly<Record<SequenceMotionStudyBindingStatus, string>> = {
  matched: '연결한 도식의 제작 정보를 확인해 주세요.',
  unbound: '저장된 동작 도식 연결이 없습니다. 항목 편집에서 관련 도식을 선택해 주세요.',
  stale: '연결한 도식의 원본이 바뀌었습니다. 항목 편집에서 다시 확인해 주세요.',
  unsupported: '이 버전의 도식 연결을 표시할 수 없습니다.',
  unrelated: '이 도식은 선택한 동작의 관련 패턴으로 연결되어 있지 않습니다.',
};

function sideFromLabel(label?: string): ConnectedStudySide | undefined {
  if (label === '왼쪽') return 'left';
  if (label === '오른쪽') return 'right';
  if (label === '양쪽 함께' || label === '함께') return 'both';
  if (label === '첫 번째 쪽' || label === '반대쪽') return 'unknown';
  return undefined;
}

function selectedSide(
  step: SequenceStep,
  model: SequenceSimulation,
  index: number,
  position: SimulationPosition,
): ConnectedStudySide {
  const segmentSide =
    position.stepIndex === index ? sideFromLabel(position.segment?.sideLabel) : undefined;
  if (segmentSide) return segmentSide;
  switch (step.sideMode) {
    case 'left':
      return 'left';
    case 'right':
      return 'right';
    case 'together':
      return 'both';
    case 'left-then-right':
      return position.status === 'complete' && index === model.steps.length - 1 ? 'right' : 'left';
    case 'right-then-left':
      return position.status === 'complete' && index === model.steps.length - 1 ? 'left' : 'right';
    default:
      return sideFromLabel(model.steps[index]?.sideLabels[0]) ?? 'unknown';
  }
}

function phaseSample(entry: MotionStudyEntry, id: 'setup' | 'main' | 'finish'): number {
  if (id !== 'main') {
    const phase = entry.phases.find((item) => item.id === id);
    if (phase) return phase.sample;
  }
  const stage = entry.stages.find((item) => item.id === id);
  if (id === 'main' && stage) {
    const phase =
      entry.phases.find(
        (item) => item.id === 'turn' && item.sample >= stage.start && item.sample < stage.end,
      ) ??
      entry.phases.find(
        (item) =>
          item.displayBehavior === 'move' && item.sample >= stage.start && item.sample < stage.end,
      );
    return phase?.sample ?? (stage.start + stage.end) / 2;
  }
  return id === 'finish' ? 1 : (stage?.start ?? 0);
}

/**
 * Pure projection of the parent's frozen timeline. This function never starts a clock or grants
 * rehearsal eligibility. Only a saved, matched binding can return an authored figure asset.
 */
export function resolveConnectedMotionStudy({
  model,
  position,
  steps,
  selectedIndex,
  reducedMotion = false,
  active = true,
}: ResolveConnectedMotionStudyOptions): ConnectedMotionStudyState {
  const index =
    selectedIndex ?? position.stepIndex ?? (position.status === 'complete' ? steps.length - 1 : 0);
  const step = steps[index];
  const base = {
    bindingStatus: 'unbound' as SequenceMotionStudyBindingStatus,
    stepIndex: step ? index : null,
    section: step ? getSequenceStepClassSection(step, steps) : ('main' as ClassSectionRole),
    progress: 0,
    side: step ? selectedSide(step, model, index, position) : ('unknown' as ConnectedStudySide),
    static: true,
  };
  if (!step || position.status === 'empty') return { ...base, kind: 'empty' };
  if (isRestStep(step)) return { ...base, kind: 'rest' };

  const segment =
    position.stepIndex === index
      ? position.segment
      : (model.segments.find((item) => item.stepIndex === index) ?? null);
  if (segment?.kind === 'transition') {
    const next = index + 1;
    return { ...base, kind: 'transition', ...(next < steps.length ? { nextStepIndex: next } : {}) };
  }
  const bindingStatus = assessSequenceMotionStudyBinding(step.exerciseId, step.motionStudy);
  if (segment?.kind === 'unavailable') {
    return {
      ...base,
      kind: 'unavailable',
      bindingStatus,
      reason: '이 항목의 동작 정보를 확인해 주세요.',
    };
  }
  if (bindingStatus !== 'matched' || !step.motionStudy) {
    return {
      ...base,
      kind: 'unavailable',
      bindingStatus,
      reason: UNAVAILABLE_REASONS[bindingStatus],
    };
  }
  const entry = getMotionStudyEntry(step.motionStudy.family, step.motionStudy.variantId);
  if (!entry) {
    return {
      ...base,
      kind: 'unavailable',
      bindingStatus: 'unsupported',
      reason: UNAVAILABLE_REASONS.unsupported,
    };
  }
  const main = entry.stages.find((stage) => stage.id === 'main');
  const isManualDifferentStep =
    selectedIndex !== undefined &&
    selectedIndex !== null &&
    position.stepIndex !== index &&
    !(position.status === 'complete' && index === steps.length - 1);
  const complete = position.status === 'complete' && !isManualDifferentStep;
  const teaching = segment?.kind === 'teaching' || isManualDifferentStep;
  const movement = segment?.kind === 'movement' && !isManualDifferentStep;
  const staticOnly =
    reducedMotion ||
    !active ||
    (base.side === 'both' && entry.sideMode !== 'bilateral') ||
    (entry.sideMode === 'bilateral' && (base.side === 'left' || base.side === 'right')) ||
    base.side === 'unknown';
  let progress = complete ? phaseSample(entry, 'finish') : phaseSample(entry, 'setup');
  if (!complete && !teaching && movement && main) {
    const elapsed =
      position.stepIndex === index && Number.isFinite(position.elapsedInSegmentSec)
        ? Math.max(0, position.elapsedInSegmentSec)
        : 0;
    progress = staticOnly
      ? phaseSample(entry, 'main')
      : main.start +
        (main.end - main.start) *
          ((elapsed % CONNECTED_STUDY_DISPLAY_CYCLE_SEC) / CONNECTED_STUDY_DISPLAY_CYCLE_SEC);
  }
  const phase = getMotionStudyPhase(entry, progress) ?? undefined;
  const stage = getMotionStudyStage(entry, progress) ?? undefined;
  const anatomicalSide = base.side === 'left' || base.side === 'right' ? base.side : undefined;
  return {
    ...base,
    kind: 'study',
    bindingStatus,
    entry,
    progress,
    ...(phase ? { phase } : {}),
    ...(stage ? { stage } : {}),
    ...(anatomicalSide ? { anatomicalSide } : {}),
    static: complete || teaching || !movement || staticOnly,
  };
}
