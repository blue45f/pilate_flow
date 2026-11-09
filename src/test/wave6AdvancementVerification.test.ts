import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { generateInstructorVoiceScript } from '../utils/instructorVoiceScriptGenerator';
import {
  applyRecommendedLayersToSteps,
  buildMemberConditionLayerAdvice,
} from '../utils/memberConditionLayerAdvisor';
import {
  analyzeSequenceTransitionCost,
  suggestTransitionOptimizedOrder,
} from '../utils/transitionCostOptimizer';

describe('Wave 6 Advancement Verification (Epics 21–25)', () => {
  const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

  it('Epic 21: analyzes apparatus/posture/spring transition cost and preserves step count & locked steps on optimization', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const stepsWithLock = sample.steps.map((st, idx) =>
      idx === 0 ? { ...st, locked: true } : st,
    );
    const analysis = analyzeSequenceTransitionCost(stepsWithLock, exerciseMap);
    expect(analysis.totalCostScore).toBeGreaterThanOrEqual(analysis.optimizedCostScore);

    const optimized = suggestTransitionOptimizedOrder(stepsWithLock, exerciseMap);
    expect(optimized.length).toBe(stepsWithLock.length);
    expect(optimized[0]?.stepId).toBe(stepsWithLock[0]?.stepId);
  });

  it('Epic 22: generates a timecoded Korean instructor voice-cue teleprompter script', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const script = generateInstructorVoiceScript(sample.title, sample.steps, exerciseMap, {
      level: '1.5',
      reformerBrand: 'stott',
    });
    expect(script.segments.length).toBe(sample.steps.length);
    expect(script.fullTextKo).toContain(sample.title);
    expect(script.segments[0]?.startTimeLabel).toBe('00:00');
  });

  it('Epic 23: recommends safe Easy layers when pelvic tilt observations are active and applies them cleanly', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const advice = buildMemberConditionLayerAdvice(sample.steps, exerciseMap, {
      level: '1.5',
      planningGoals: ['mobility'],
      instructorObservations: ['anterior-pelvic-tilt'],
    });
    expect(advice.advices.length).toBeGreaterThan(0);
    const updated = applyRecommendedLayersToSteps(sample.steps, advice.advices);
    expect(updated.length).toBe(sample.steps.length);
  });
});
