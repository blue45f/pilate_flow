import React from 'react';
import type { PilatesExercise } from '../types/pilates';
import {
  WORLD_PILATES_BY_ID,
  WORLD_PILATES_EXERCISES,
  getExerciseAnatomyInsight,
} from '../data/worldPilatesRepertoire1000';
import {
  GOLDEN_MICRO_FLOW_COMBOS,
  findPlanBAlternative,
  recommendZeroTransitionNext,
  remixExerciseVariation,
  type RemixModifier,
} from './composableHierarchyEngine';
import {
  registerStudioTrackAdapters,
  type GoldenComboItem,
  type QuickRemixModifier,
} from './studioTrackSlots';
import {
  SequenceAudioRehearsalTriggerWidget,
  StudioVoiceSpeakSlotWidget,
  WorkbenchLessonAndAutoSlotWidget,
} from '../components/StudioTrackSlotWidgets';
import { usePilatesStore } from '../store/usePilatesStore';

let initialized = false;

/**
 * Ensures any referenced world-repertoire exercises exist in the Zustand store
 * before inserting combos/recommendations into the active sequence.
 */
export function ensureWorldExercisesInStore(exercises: readonly PilatesExercise[]): void {
  const store = usePilatesStore.getState();
  const existing = new Set(store.exercises.map((item) => item.id));
  const missing: PilatesExercise[] = [];
  for (const item of exercises) {
    if (!existing.has(item.id)) {
      missing.push(structuredClone(item));
      existing.add(item.id);
    }
  }
  if (missing.length > 0) {
    usePilatesStore.setState((prev) => ({
      exercises: [...prev.exercises, ...missing],
    }));
  }
}

function mapQuickRemixModifier(modifier?: QuickRemixModifier): RemixModifier | undefined {
  switch (modifier) {
    case 'single-leg':
      return 'single-leg';
    case 'pulse':
      return 'pulse';
    case 'isometric-hold':
      return 'hold';
    case 'slow-tempo':
      return 'easier';
    default:
      return undefined;
  }
}

function buildCombinedPool(pool: readonly PilatesExercise[]): readonly PilatesExercise[] {
  const seen = new Set(pool.map((item) => item.id));
  const merged: PilatesExercise[] = [...pool];
  for (const worldEx of WORLD_PILATES_EXERCISES) {
    if (!seen.has(worldEx.id)) {
      merged.push(worldEx);
      seen.add(worldEx.id);
    }
  }
  return merged;
}

/**
 * Registers all parallel swarm engines (1,752+ repertoire, neural voice & audio rehearsal,
 * 1:1/group lesson modes, smart auto-pilot & on-device alignment mirror) into the unified UI slots.
 */
export function initAllStudioTrackAdapters(): void {
  if (initialized) return;
  initialized = true;

  registerStudioTrackAdapters({
    getExerciseAnatomyInsight: (exercise) => {
      const insight = getExerciseAnatomyInsight(exercise);
      return {
        agonistsKo: insight.agonistsKo,
        stabilizersKo: insight.stabilizersKo,
        benefitsKo: insight.benefitsKo,
        springMechanicsKo: insight.springMechanicsKo,
        commonFaultsKo: insight.commonFaultsKo,
        anatomyVisualZone: insight.anatomyVisualZone,
      };
    },

    recommendZeroTransitionNext: (currentExercise, pool, existingIds) => {
      if (!currentExercise) return null;
      const combined = buildCombinedPool(pool);
      const recs = recommendZeroTransitionNext(
        currentExercise,
        combined,
        Array.from(existingIds),
        3,
      );
      if (recs.length === 0) return null;
      return recs.map((rec) => ({
        exercise: rec.exercise,
        reasonKo: rec.reasonKo,
        keepsPosition: rec.samePosition,
        keepsSpring: rec.sameSpring,
      }));
    },

    getGoldenCombos: (apparatus, pool) => {
      const localMap = new Map(pool.map((ex) => [ex.id, ex]));
      const ordered =
        apparatus === 'mixed'
          ? GOLDEN_MICRO_FLOW_COMBOS
          : [
              ...GOLDEN_MICRO_FLOW_COMBOS.filter((c) => c.apparatus === apparatus),
              ...GOLDEN_MICRO_FLOW_COMBOS.filter((c) => c.apparatus !== apparatus),
            ];

      const items: GoldenComboItem[] = [];
      for (const combo of ordered) {
        const resolvedExercises: PilatesExercise[] = [];
        for (const id of combo.exerciseIds) {
          const found = localMap.get(id) ?? WORLD_PILATES_BY_ID.get(id);
          if (found) resolvedExercises.push(found);
        }
        if (resolvedExercises.length >= 2) {
          items.push({
            id: combo.id,
            titleKo: combo.titleKo,
            subtitleKo: combo.subtitleKo,
            durationMin: combo.targetMinutes,
            apparatus: combo.apparatus,
            level: combo.level,
            exercises: resolvedExercises,
            flowNoteKo: combo.transitionSummaryKo,
          });
        }
        if (items.length >= 4) break;
      }
      return items;
    },

    remixExerciseVariation: (baseExercise, options) => {
      const mappedMod = mapQuickRemixModifier(options.modifier);
      if ((!options.prop || options.prop === 'none') && !mappedMod) {
        return null;
      }
      return remixExerciseVariation(baseExercise, {
        ...(options.prop && options.prop !== 'none' ? { prop: options.prop } : {}),
        ...(mappedMod ? { modifier: mappedMod } : {}),
      });
    },

    findPlanBAlternative: (exercise, constraint, pool) => {
      const combined = buildCombinedPool(pool);
      const result = findPlanBAlternative(exercise, constraint, combined, 3);
      return result.alternatives.map((item) => item.exercise);
    },

    renderNaturalVoiceSpeakButton: ({ exercise, compact }) =>
      React.createElement(StudioVoiceSpeakSlotWidget, { exercise, compact }),

    renderSequenceAudioRehearsalTrigger: ({ title, steps, exercises, compact }) =>
      React.createElement(SequenceAudioRehearsalTriggerWidget, {
        title,
        steps,
        exercises,
        compact,
      }),

    renderLessonModeSlot: ({ steps, exercises }) =>
      React.createElement(WorkbenchLessonAndAutoSlotWidget, { steps, exercises }),
  });
}
