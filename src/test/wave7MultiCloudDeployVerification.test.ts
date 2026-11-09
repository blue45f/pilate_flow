import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { simulateClassEnergyCurve } from '../utils/classPacingSimulator';
import {
  CANONICAL_PRODUCTION_DEPLOY_SPEC,
  verifyCanonicalProductionConfig,
} from '../utils/deploymentEnvironmentMatrix';

describe('Wave 7 Canonical Production Deployment & Class Pacing Verification', () => {
  it('verifies the single canonical production environment (Firebase Hosting pilates-flow-atelier on main)', () => {
    const check = verifyCanonicalProductionConfig();
    expect(check.aligned).toBe(true);
    expect(check.site).toBe('pilates-flow-atelier');
    expect(check.projectId).toBe('deskcloud-fleet-auth');
    expect(check.productionUrl).toBe('https://pilates-flow-atelier.web.app');
    expect(check.branch).toBe('main');
    expect(CANONICAL_PRODUCTION_DEPLOY_SPEC.immutableAssetPath).toBe('/assets/**');
  });

  it('simulates class physiological RPE energy curve across warm-up, main, and cool-down phases', () => {
    const sample = INITIAL_SAVED_SEQUENCES[0]!;
    const exerciseMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
    const result = simulateClassEnergyCurve(sample.steps, exerciseMap);
    expect(result.points.length).toBe(sample.steps.length);
    expect(result.peakRpe).toBeGreaterThanOrEqual(result.avgRpe);
    expect(result.pacingVerdictKo).toContain('RPE');
  });
});
