import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import {
  buildStepBreathingCadence,
  summarizeSequenceBreathingCadence,
} from '../utils/breathingCadenceEngine';
import {
  formatSequenceAsPortableJson,
  importPortableSequenceToSavedSequence,
} from '../utils/portableSequenceExport';
import { convertSpringTensionAcrossBrands } from '../utils/springTensionMatrix';

describe('Wave 5 Advancement Verification (Epics 16–20)', () => {
  it('Epic 16: imports a portable JSON sequence package into a fresh SavedSequence with non-colliding ID', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const rawJson = formatSequenceAsPortableJson(sample);
    const imported = importPortableSequenceToSavedSequence(rawJson, '2026-11-09T15:00:00.000Z');
    expect(imported).not.toBeNull();
    expect(imported?.id).not.toBe(sample.id);
    expect(imported?.id.startsWith('seq-imported-')).toBe(true);
    expect(imported?.title).toBe(sample.title);
    expect(imported?.steps.length).toBe(sample.steps.length);
  });

  it('Epic 17: synthesizes breathing cadence cues and total breath cycles per sequence', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
    const firstStep = sample.steps[0]!;
    const stepCue = buildStepBreathingCadence(
      firstStep,
      exerciseMap.get(firstStep.exerciseId),
      '1.5',
    );
    expect(stepCue.estimatedCycles).toBeGreaterThan(0);
    expect(stepCue.tempoRatio).toMatch(/^\d+:\d+:\d+$/);

    const summary = summarizeSequenceBreathingCadence(sample.steps, exerciseMap, '1.5');
    expect(summary.cues.length).toBe(sample.steps.length);
    expect(summary.totalEstimatedBreathCycles).toBeGreaterThan(sample.steps.length);
  });

  it('Epic 18: translates reformer spring prescriptions across Balanced Body, Stott, and Classical brands', () => {
    const heavy = convertSpringTensionAcrossBrands('빨강 2 · 파랑 1');
    expect(heavy.normalizedLoadUnits).toBe(2.5);
    expect(heavy.tier).toBe('heavy');
    expect(heavy.equivalentsByBrand.stott).toContain('2.5 Red');

    const light = convertSpringTensionAcrossBrands('파랑 1');
    expect(light.normalizedLoadUnits).toBe(0.5);
    expect(light.tier).toBe('light');
    expect(light.equivalentsByBrand.classical).toContain('1 Light');
  });
});
