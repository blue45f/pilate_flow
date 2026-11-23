import type { ReactNode } from 'react';
import type { DifficultyLevel, PilatesExercise, PropType, SequenceStep } from '../types/pilates';

export type AnatomyVisualZone = 'core' | 'glutes' | 'spine' | 'shoulder' | 'lateral' | 'hip';

export interface ExerciseAnatomyInsightData {
  readonly agonistsKo: readonly string[];
  readonly stabilizersKo: readonly string[];
  readonly benefitsKo: readonly string[];
  readonly springMechanicsKo: string;
  readonly commonFaultsKo: readonly { readonly fault: string; readonly fixCue: string }[];
  readonly anatomyVisualZone: AnatomyVisualZone;
  readonly setupBasicsKo?: string;
  readonly breathBasicsKo?: string;
}

export interface ZeroTransitionRecommendation {
  readonly exercise: PilatesExercise;
  readonly reasonKo: string;
  readonly keepsPosition: boolean;
  readonly keepsSpring: boolean;
}

export interface GoldenComboItem {
  readonly id: string;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly durationMin: number;
  readonly apparatus: PilatesExercise['apparatus'];
  readonly level: DifficultyLevel;
  readonly exercises: readonly PilatesExercise[];
  readonly flowNoteKo: string;
}

export type PlanBConstraint = 'wrist' | 'neck' | 'knee' | 'easier' | 'harder';

export type QuickRemixModifier =
  | 'standard'
  | 'single-leg'
  | 'pulse'
  | 'isometric-hold'
  | 'slow-tempo';

export interface StudioTrackAdapters {
  /** Hook for repertoire-1000: override anatomy insight derivation */
  getExerciseAnatomyInsight?: (exercise: PilatesExercise) => ExerciseAnatomyInsightData | null;
  /** Hook for repertoire-1000: override zero-transition next recommender */
  recommendZeroTransitionNext?: (
    currentExercise: PilatesExercise | undefined,
    pool: readonly PilatesExercise[],
    existingIds: ReadonlySet<string>,
  ) => readonly ZeroTransitionRecommendation[] | null;
  /** Hook for repertoire-1000: supply curated golden 10-min combos */
  getGoldenCombos?: (
    apparatus: PilatesExercise['apparatus'] | 'mixed',
    pool: readonly PilatesExercise[],
  ) => readonly GoldenComboItem[] | null;
  /** Hook for repertoire-1000: override 10-sec variation remix generator */
  remixExerciseVariation?: (
    baseExercise: PilatesExercise,
    options: { prop?: PropType; modifier?: QuickRemixModifier },
  ) => PilatesExercise | null;
  /** Hook for repertoire-1000: override live Plan-B alternative recommender */
  findPlanBAlternative?: (
    exercise: PilatesExercise,
    constraint: PlanBConstraint,
    pool: readonly PilatesExercise[],
  ) => readonly PilatesExercise[] | null;
  /** Hook for voice-engine: render lightweight speak button on exercise detail/anatomy card */
  renderNaturalVoiceSpeakButton?: (props: {
    exercise: PilatesExercise;
    compact?: boolean;
  }) => ReactNode;
  /** Hook for voice-engine: render audio rehearsal modal trigger in workbench / live stage */
  renderSequenceAudioRehearsalTrigger?: (props: {
    title: string;
    steps: readonly SequenceStep[];
    exercises: readonly PilatesExercise[];
    compact?: boolean;
  }) => ReactNode;
  /** Hook for lesson-mode-studio: render 1:1 vs group switch slot in workbench */
  renderLessonModeSlot?: (props: {
    steps: readonly SequenceStep[];
    exercises: readonly PilatesExercise[];
  }) => ReactNode;
}

let registeredAdapters: StudioTrackAdapters = {};

/**
 * Allows parallel feature modules (1,000+ repertoire engine, neural voice engine,
 * lesson-mode studio) to plug into the mobile Unslop instructor UI cleanly.
 */
export function registerStudioTrackAdapters(patch: Partial<StudioTrackAdapters>): void {
  registeredAdapters = { ...registeredAdapters, ...patch };
}

export function getStudioTrackAdapters(): Readonly<StudioTrackAdapters> {
  return registeredAdapters;
}

export function resetStudioTrackAdaptersForTests(): void {
  registeredAdapters = {};
}
