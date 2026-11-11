import type { StepSideMode } from '../types/pilates';

export function resolveAppliedSideMode(
  sides: 1 | 2,
  currentSideMode?: StepSideMode,
): StepSideMode {
  if (sides === 2) {
    return currentSideMode === 'right-then-left' ? 'right-then-left' : 'left-then-right';
  }
  return currentSideMode === 'left' || currentSideMode === 'right'
    ? currentSideMode
    : 'together';
}
