import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { simulateClassEnergyCurve } from '../utils/classPacingSimulator';
import {
  MULTI_CLOUD_DEPLOY_MATRIX,
  resolveDynamicDeployTargets,
  verifyMultiCloudConfigAlignment,
} from '../utils/deploymentEnvironmentMatrix';

describe('Wave 7 Multi-Cloud Deployment & Class Pacing Verification (Epics 26–30)', () => {
  it('Epic 26: verifies all 7 cloud and local deployment targets share consistent dist output, SPA fallback, and PWA no-cache rules', () => {
    const alignment = verifyMultiCloudConfigAlignment();
    expect(alignment.aligned).toBe(true);
    expect(alignment.targetCount).toBe(7);
    expect(alignment.consistentOutputDir).toBe(true);
    expect(alignment.consistentSpaFallback).toBe(true);
    expect(alignment.consistentPwaNoCache).toBe(true);
  });

  it('Epic 27 & 28: resolves dynamic deploy targets for auto, all, and comma-separated cloud lists', () => {
    const autoTargets = resolveDynamicDeployTargets('auto', [
      'firebase-hosting',
      'github-pages',
    ]);
    expect(autoTargets.map((t) => t.id)).toEqual(['firebase-hosting', 'github-pages']);

    const allTargets = resolveDynamicDeployTargets('all', []);
    expect(allTargets.length).toBe(MULTI_CLOUD_DEPLOY_MATRIX.length);

    const customTargets = resolveDynamicDeployTargets('vercel,cloudflare', []);
    expect(customTargets.map((t) => t.id)).toEqual(['vercel', 'cloudflare-pages']);
  });

  it('Epic 29: simulates class physiological RPE energy curve across warm-up, main, and cool-down phases', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
    const result = simulateClassEnergyCurve(sample.steps, exerciseMap);
    expect(result.points.length).toBe(sample.steps.length);
    expect(result.peakRpe).toBeGreaterThanOrEqual(result.avgRpe);
    expect(result.pacingVerdictKo).toContain('RPE');
  });
});
