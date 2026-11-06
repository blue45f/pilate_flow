import type React from 'react';
import type { VisualPhaseId } from '../../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { PilatesExercise } from '../../types/pilates';
import type { MotionPoint } from '../../utils/motionReferenceModel';
import {
  resolveRenderableMotionDescriptor,
  toExerciseEvidenceMotionOverlay,
  type ExerciseEvidenceMotionCoverageOverlay,
  type RenderableMotionDescriptor,
} from './adapters';
import type { MotionSupportMode, ResolveMotionCoverageOptions } from './types';

export type PreviewHarnessModeFilter = 'all' | MotionSupportMode;

export interface CatalogDescriptorEntry {
  readonly index: number;
  readonly exercise: PilatesExercise;
  readonly descriptor: RenderableMotionDescriptor;
}

export type MotionModeCountMap = Readonly<Record<MotionSupportMode, number>>;

export const MISSING_FIXTURE_EXERCISE_ID = 'unknown-nonexistent-id-999' as const;

export const TOUCH_BUTTON_STYLE: React.CSSProperties = {
  minHeight: '44px',
  minWidth: '44px',
  padding: '8px 12px',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontSize: '0.875rem',
  lineHeight: 1.25,
  borderRadius: '8px',
  border: '1px solid rgba(40, 54, 48, 0.25)',
  background: '#f8faf8',
  color: '#1b2621',
  cursor: 'pointer',
  maxWidth: '100%',
  wordBreak: 'keep-all',
};

export const ACTIVE_TOUCH_BUTTON_STYLE: React.CSSProperties = {
  ...TOUCH_BUTTON_STYLE,
  background: '#1f4d3b',
  color: '#ffffff',
  border: '1px solid #1f4d3b',
  fontWeight: 600,
};

export const TOUCH_SELECT_STYLE: React.CSSProperties = {
  minHeight: '44px',
  minWidth: '44px',
  width: '100%',
  maxWidth: '100%',
  padding: '8px 10px',
  boxSizing: 'border-box',
  fontSize: '0.875rem',
  borderRadius: '8px',
  border: '1px solid rgba(40, 54, 48, 0.28)',
  background: '#ffffff',
  color: '#1b2621',
};

const INTERACTIVE_DESCENDANT_SELECTOR =
  'button, input, select, textarea, a, summary, [role="button"], [role="slider"], [role="spinbutton"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="option"], [role="listbox"], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/**
 * Pure SVG path builder for 2D motion points.
 */
export function pointsToSvgPath(points: readonly MotionPoint[]): string {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

/**
 * Pure guard that determines whether a keyboard event originated inside a native or
 * ARIA interactive descendant control (`<input type="range">`, `<button>`, `<select>`, etc.)
 * rather than on the stage container itself (`currentTarget`).
 */
export function isInteractiveControlTarget(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
): boolean {
  if (!target || target === currentTarget) return false;
  if (typeof Element !== 'undefined' && target instanceof Element) {
    const matched = target.closest(INTERACTIVE_DESCENDANT_SELECTOR);
    return Boolean(matched && matched !== currentTarget);
  }
  return true;
}

/**
 * Merges caller `ResolveMotionCoverageOptions` with the local lab-prototype opt-in state.
 */
export function mergePreviewResolveOptions(
  baseOptions: ResolveMotionCoverageOptions | undefined,
  includeLabPrototypesInContinuous2d: boolean,
): ResolveMotionCoverageOptions {
  return {
    ...baseOptions,
    includeLabPrototypesInContinuous2d,
  };
}

/**
 * Builds the 98-item catalog descriptor table for the current resolution options.
 */
export function buildCatalogDescriptorEntries(
  resolveOptions: ResolveMotionCoverageOptions,
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): readonly CatalogDescriptorEntry[] {
  return exercises.map((exercise, index) => ({
    index,
    exercise,
    descriptor: resolveRenderableMotionDescriptor(exercise, resolveOptions),
  }));
}

/**
 * Filters catalog descriptor entries by support mode (`'all'` or a specific `MotionSupportMode`).
 */
export function filterCatalogDescriptorEntries(
  entries: readonly CatalogDescriptorEntry[],
  modeFilter: PreviewHarnessModeFilter,
): readonly CatalogDescriptorEntry[] {
  if (modeFilter === 'all') return entries;
  return entries.filter((item) => item.descriptor.mode === modeFilter);
}

/**
 * Computes exact counts per `MotionSupportMode` across the catalog descriptor list.
 */
export function computeCatalogModeCounts(
  entries: readonly CatalogDescriptorEntry[],
): MotionModeCountMap {
  const counts: Record<MotionSupportMode, number> = {
    'three-phase-2d': 0,
    'continuous-2d': 0,
    'projected-3d': 0,
    missing: 0,
  };
  for (const item of entries) {
    counts[item.descriptor.mode] += 1;
  }
  return Object.freeze(counts);
}

/**
 * Finds the active catalog descriptor entry matching `exerciseId`, or `null` for non-catalog fixtures.
 */
export function findActiveCatalogEntry(
  entries: readonly CatalogDescriptorEntry[],
  exerciseId: string,
): CatalogDescriptorEntry | null {
  return entries.find((item) => item.exercise.id === exerciseId) ?? null;
}

/**
 * Finds the 0-based index of `exerciseId` within the currently filtered catalog list (`-1` if absent).
 */
export function findFilteredCatalogIndex(
  filteredEntries: readonly CatalogDescriptorEntry[],
  exerciseId: string,
): number {
  return filteredEntries.findIndex((item) => item.exercise.id === exerciseId);
}

/**
 * Pure wrap-around index selector for previous/next catalog exercise navigation.
 */
export function getAdjacentFilteredExerciseId(
  filteredEntries: readonly CatalogDescriptorEntry[],
  currentFilteredIndex: number,
  direction: 'prev' | 'next',
): string | null {
  if (filteredEntries.length === 0) return null;
  if (direction === 'prev') {
    const prevIdx =
      currentFilteredIndex <= 0 ? filteredEntries.length - 1 : currentFilteredIndex - 1;
    return filteredEntries[prevIdx]?.exercise.id ?? null;
  }
  const nextIdx =
    currentFilteredIndex < 0 || currentFilteredIndex >= filteredEntries.length - 1
      ? 0
      : currentFilteredIndex + 1;
  return filteredEntries[nextIdx]?.exercise.id ?? null;
}

/**
 * Resolves the truthfulness & verification overlay for the active catalog entry or arbitrary exercise ID.
 */
export function resolvePreviewEvidenceOverlay(
  activeCatalogEntry: CatalogDescriptorEntry | null,
  exerciseId: string,
  resolveOptions: ResolveMotionCoverageOptions,
): ExerciseEvidenceMotionCoverageOverlay {
  return activeCatalogEntry
    ? toExerciseEvidenceMotionOverlay(activeCatalogEntry.exercise, resolveOptions)
    : toExerciseEvidenceMotionOverlay(exerciseId, resolveOptions);
}

/**
 * Returns the Korean button label for a discrete 3-phase step (`'start' | 'middle' | 'end'`).
 */
export function getDiscretePhaseButtonLabelKo(phaseId: VisualPhaseId): string {
  if (phaseId === 'start') return '1. 시작(준비)';
  if (phaseId === 'middle') return '2. 중간(전개)';
  return '3. 끝(복귀)';
}
