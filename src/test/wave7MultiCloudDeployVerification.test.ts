import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { simulateClassEnergyCurve } from '../utils/classPacingSimulator';
import {
  CANONICAL_PRODUCTION_DEPLOY_SPEC,
  type FirebaseJsonInput,
  type FirebasercInput,
  verifyCanonicalProductionConfig,
} from '../utils/deploymentEnvironmentMatrix';

function readRepoText(relativePath: string): string {
  const fileUrl = new URL(`../../${relativePath}`, import.meta.url);
  return readFileSync(fileURLToPath(fileUrl), 'utf8');
}

describe('Wave 7 Canonical Production Deployment & Class Pacing Verification', () => {
  it('verifies actual firebase.json and .firebaserc against the canonical production spec', () => {
    const firebaseJson = JSON.parse(readRepoText('firebase.json')) as FirebaseJsonInput;
    const firebaserc = JSON.parse(readRepoText('.firebaserc')) as FirebasercInput;

    const check = verifyCanonicalProductionConfig({
      firebaseJson,
      firebaserc,
      branch: 'main',
    });
    expect(check.aligned).toBe(true);
    expect(check.site).toBe('pilates-flow-atelier');
    expect(check.projectId).toBe('deskcloud-fleet-auth');
    expect(check.productionUrl).toBe('https://pilates-flow-atelier.web.app');
    expect(check.branch).toBe('main');
    expect(check.consistentOutputDir).toBe(true);
    expect(check.consistentSpaFallback).toBe(true);
    expect(check.consistentImmutableAssets).toBe(true);
    expect(check.consistentPwaNoCache).toBe(true);

    for (const v2Asset of CANONICAL_PRODUCTION_DEPLOY_SPEC.atelierV2AssetPaths) {
      const publicAssetUrl = new URL(`../../public${v2Asset}`, import.meta.url);
      expect(existsSync(fileURLToPath(publicAssetUrl))).toBe(true);
    }
  });

  it('rejects tampered hosting site, output directory, or missing no-cache headers', () => {
    const firebaseJson = JSON.parse(readRepoText('firebase.json')) as FirebaseJsonInput;
    const firebaserc = JSON.parse(readRepoText('.firebaserc')) as FirebasercInput;

    expect(
      verifyCanonicalProductionConfig({
        firebaseJson: { hosting: { ...firebaseJson.hosting, site: 'wrong-site' } },
        firebaserc,
      }).aligned,
    ).toBe(false);

    expect(
      verifyCanonicalProductionConfig({
        firebaseJson: { hosting: { ...firebaseJson.hosting, headers: [] } },
        firebaserc,
      }).aligned,
    ).toBe(false);

    expect(
      verifyCanonicalProductionConfig({
        firebaseJson,
        firebaserc,
        branch: 'feature/experimental',
      }).aligned,
    ).toBe(false);
  });

  it('enforces simplified package.json scripts, CI job separation, and canonical DEPLOYMENT.md guide', () => {
    const workflowYaml = readRepoText('.github/workflows/deploy-production.yml');
    const deploymentDoc = readRepoText('DEPLOYMENT.md');
    const pkgJson = JSON.parse(readRepoText('package.json')) as {
      scripts?: Record<string, string>;
    };
    const scripts = pkgJson.scripts ?? {};

    // Active CI & canonical entry commands preserved
    expect(scripts['verify:all']).toContain('pnpm test:deploy');
    expect(scripts['build']).toBe('tsc -b && vite build && node scripts/check-pwa-build.mjs');
    expect(scripts['deploy']).toBe('node scripts/deploy-universal.mjs');
    expect(scripts['deploy:check']).toBe('node scripts/deploy-universal.mjs --check-env');
    expect(scripts['deploy:verify']).toBe('node scripts/deploy-universal.mjs --verify-live');
    expect(scripts['deploy:rollback']).toBe('node scripts/deploy-universal.mjs --rollback');

    // Removed race-prone / sandbox-bypassing scripts
    expect(scripts['deploy:parallel']).toBeUndefined();
    expect(scripts['deploy:bootstrap']).toBeUndefined();

    // Workflow invariants
    expect(workflowYaml).toContain('verify-and-build:');
    expect(workflowYaml).toContain('deploy-hosting:');
    expect(workflowYaml).toContain('needs: verify-and-build');
    expect(workflowYaml).toContain('cancel-in-progress: false');
    expect(workflowYaml).toContain(
      `firebase-tools@${CANONICAL_PRODUCTION_DEPLOY_SPEC.firebaseToolsVersion}`,
    );
    expect(workflowYaml).toContain('trap cleanup EXIT');
    expect(workflowYaml).toContain('exit 1');
    expect(workflowYaml).not.toContain('--token ');

    // Canonical deployment guide documents all 5 lifecycle entry points & guardrails
    for (const cmd of [
      'pnpm verify:all',
      'pnpm build',
      'pnpm deploy:check',
      'pnpm deploy:verify',
      'pnpm deploy',
      'pnpm deploy:rollback',
    ]) {
      expect(deploymentDoc).toContain(cmd);
    }
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
