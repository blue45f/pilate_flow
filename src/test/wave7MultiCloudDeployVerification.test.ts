import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { simulateClassEnergyCurve } from '../utils/classPacingSimulator';
import {
  CANONICAL_PRODUCTION_DEPLOY_SPEC,
  type FirebaseJsonInput,
  type FirebasercInput,
  verifyCanonicalProductionConfig,
} from '../utils/deploymentEnvironmentMatrix';

function resolveRepoRoot(): string {
  let current = resolve(cwd());
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, 'firebase.json')) && existsSync(join(current, 'package.json'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(cwd());
}

const REPO_ROOT = resolveRepoRoot();

function resolveRepoPath(relativePath: string): string {
  return resolve(REPO_ROOT, relativePath.replace(/^\/+/, ''));
}

function readRepoText(relativePath: string): string {
  return readFileSync(resolveRepoPath(relativePath), 'utf8');
}

// Read only the plain mapping/scalar syntax used by this workflow. Unsupported
// YAML at a policy path fails instead of falling back to a guessed safe value.
function readWorkflowScalar(source: string, path: string[]): string {
  let lines = source.split(/\r?\n/);
  let value = '';
  for (const [depth, key] of path.entries()) {
    const content = lines.filter((line) => line.trim() && !line.trimStart().startsWith('#'));
    const indent = Math.min(...content.map((line) => line.length - line.trimStart().length));
    const matches = lines.flatMap((line, index) => {
      const match = /^( *)([A-Za-z_][\w-]*):(?:\s+(.*))?$/.exec(line);
      return match && match[1].length === indent && match[2] === key
        ? [{ index, value: match[3]?.trim() ?? '' }]
        : [];
    });
    if (matches.length !== 1) {
      throw new Error(`Missing, duplicate or unsupported workflow key: ${path.join('.')}`);
    }
    const entry = matches[0];
    const following = lines.slice(entry.index + 1);
    const boundary = following.findIndex(
      (line) => line.trim() && !line.trimStart().startsWith('#') &&
        line.length - line.trimStart().length <= indent,
    );
    lines = following.slice(0, boundary < 0 ? following.length : boundary);
    value = entry.value;
    if (depth < path.length - 1 && value !== '') {
      throw new Error(`Unsupported workflow mapping: ${path.slice(0, depth + 1).join('.')}`);
    }
  }
  return ['>', '>-', '|', '|-'].includes(value)
    ? lines.map((line) => line.trim()).join(' ').trim()
    : value;
}

type ConditionValue = string | boolean;
type ConditionContext = Readonly<Record<string, ConditionValue>>;

// This is deliberately not a general GitHub expression engine. It accepts only
// scalar equality clauses joined by &&; OR, calls and any unconsumed syntax fail.
function parseDeploymentCondition(source: string): Array<[string, string]> {
  let expression = source.trim();
  if (expression.startsWith('${{') && expression.endsWith('}}')) {
    expression = expression.slice(3, -2).trim();
  }
  const tokenPattern = /\s*(==|&&|'(?:[^']|'')*'|true\b|false\b|(?:github|inputs|needs|vars)(?:\.[A-Za-z_][\w-]*|\['[A-Za-z_][\w-]*'\])+)/y;
  const tokens: string[] = [];
  let position = 0;
  while (position < expression.length) {
    tokenPattern.lastIndex = position;
    const token = tokenPattern.exec(expression);
    if (!token) throw new Error('Unsupported deployment condition syntax');
    tokens.push(token[1]);
    position = tokenPattern.lastIndex;
  }
  if (tokens.length === 0 || (tokens.length + 1) % 4 !== 0) {
    throw new Error('Unsupported deployment condition syntax');
  }
  const clauses: Array<[string, string]> = [];
  for (let index = 0; index < tokens.length; index += 4) {
    const [left, operator, right, conjunction] = tokens.slice(index, index + 4);
    if (operator !== '==' || (conjunction !== undefined && conjunction !== '&&') ||
        [left, right].some((token) => token === '==' || token === '&&')) {
      throw new Error('Unsupported deployment condition syntax');
    }
    clauses.push([left, right]);
  }
  return clauses;
}

function conditionValue(token: string, context: ConditionContext): ConditionValue {
  if (token === 'true' || token === 'false') return token === 'true';
  if (token.startsWith("'")) return token.slice(1, -1).replace(/''/g, "'");
  const key = token.replace(/\['([A-Za-z_][\w-]*)'\]/g, '.$1');
  return Object.hasOwn(context, key) ? context[key] : '';
}

function expressionNumber(value: ConditionValue): number {
  if (typeof value === 'boolean' || value === '') return Number(value);
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'number' ? parsed : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function evaluateDeploymentCondition(source: string, context: ConditionContext): boolean {
  // Parse everything first: a false early clause must not hide unsupported syntax.
  return parseDeploymentCondition(source).every(([left, right]) => {
    const a = conditionValue(left, context);
    const b = conditionValue(right, context);
    if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase();
    if (typeof a === typeof b) return a === b;
    // GitHub equality coerces mixed scalar types to numbers; missing properties are ''.
    return expressionNumber(a) === expressionNumber(b);
  });
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
      const cleanAssetPath = v2Asset.replace(/^\/+/, '');
      expect(existsSync(resolveRepoPath(join('public', cleanAssetPath)))).toBe(true);
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
        firebaseJson: { hosting: { ...firebaseJson.hosting, public: 'build' } },
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
        firebaseJson: {
          hosting: {
            ...firebaseJson.hosting,
            headers: firebaseJson.hosting?.headers?.filter((rule) => rule.source !== '/'),
          },
        },
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

  it('evaluates the actual workflow input and deployment condition against the approval matrix', () => {
    const workflow = readRepoText('.github/workflows/deploy-production.yml');
    const inputPath = ['on', 'workflow_dispatch', 'inputs', 'deploy_to_production'];
    expect(readWorkflowScalar(workflow, [...inputPath, 'type'])).toBe('boolean');
    const defaultScalar = readWorkflowScalar(workflow, [...inputPath, 'default']);
    expect(defaultScalar).toBe('false');
    const defaultInput = defaultScalar === 'true';
    const jobPath = ['jobs', 'deploy-hosting'];
    expect(readWorkflowScalar(workflow, [...jobPath, 'needs'])).toBe('verify-and-build');
    const condition = readWorkflowScalar(workflow, [...jobPath, 'if']);
    const cases: Array<[string, string, string, boolean | undefined, string, boolean]> = [
      ['main push with legacy opt-in', 'push', 'refs/heads/main', true, 'success', false],
      ['PR with an apparent approval', 'pull_request', 'refs/heads/main', true, 'success', false],
      ['non-manual completion event', 'workflow_run', 'refs/heads/main', true, 'success', false],
      ['feature branch', 'workflow_dispatch', 'refs/heads/feature/test', true, 'success', false],
      ['tag named main', 'workflow_dispatch', 'refs/tags/main', true, 'success', false],
      ['omitted input uses YAML default', 'workflow_dispatch', 'refs/heads/main', undefined, 'success', false],
      ['explicit checks only', 'workflow_dispatch', 'refs/heads/main', false, 'success', false],
      ['failed verification', 'workflow_dispatch', 'refs/heads/main', true, 'failure', false],
      ['cancelled verification', 'workflow_dispatch', 'refs/heads/main', true, 'cancelled', false],
      ['skipped verification', 'workflow_dispatch', 'refs/heads/main', true, 'skipped', false],
      ['missing verification result', 'workflow_dispatch', 'refs/heads/main', true, '', false],
      ['approved and verified main', 'workflow_dispatch', 'refs/heads/main', true, 'success', true],
    ];
    for (const [name, event, ref, input, result, permitted] of cases) {
      const context: ConditionContext = {
        'github.event_name': event,
        'github.ref': ref,
        'inputs.deploy_to_production': input ?? defaultInput,
        'needs.verify-and-build.result': result,
        'vars.AUTO_DEPLOY_ON_MAIN_PUSH': 'true',
      };
      expect(evaluateDeploymentCondition(condition, context), name).toBe(permitted);
    }
  });

  it('fails closed when the actual deployment condition gains unsupported syntax', () => {
    const condition = readWorkflowScalar(
      readRepoText('.github/workflows/deploy-production.yml'),
      ['jobs', 'deploy-hosting', 'if'],
    );
    // An empty context makes the first clause false, exercising full parsing before evaluation.
    for (const suffix of [' || true', ' && always()', ' && inputs.deploy_to_production != false']) {
      expect(() => evaluateDeploymentCondition(`${condition}${suffix}`, {})).toThrow(
        'Unsupported deployment condition syntax',
      );
    }
  });

  it('enforces simplified package.json scripts, portable auth setup helpers, CI job separation, and canonical DEPLOYMENT.md guide', () => {
    const workflowYaml = readRepoText('.github/workflows/deploy-production.yml');
    const deploymentDoc = readRepoText('DEPLOYMENT.md');
    const envExample = readRepoText('.env.deploy.example');
    const pkgJson = JSON.parse(readRepoText('package.json')) as {
      scripts?: Record<string, string>;
    };
    const scripts = pkgJson.scripts ?? {};

    // Active CI, separated Node runner suites & canonical entry commands preserved
    expect(scripts['test']).toContain('src/booking-core/test/booking-engine.test.mjs');
    expect(scripts['test']).toContain('src/utils/recurrence/test/pilates-recurrence.test.mjs');
    expect(scripts['test']).toContain('vitest run');
    expect(scripts['verify:all']).toContain('pnpm test:deploy');
    expect(scripts['verify:all']).toContain('pnpm test');
    expect(scripts['build']).toBe(
      'node scripts/generate-exercise-artwork.mjs --check && tsc -b && vite build && node scripts/check-pwa-build.mjs',
    );
    expect(scripts['generate:motion-artwork']).toBe('node scripts/generate-exercise-artwork.mjs');
    expect(scripts['check:motion-artwork']).toBe(
      'node scripts/generate-exercise-artwork.mjs --check',
    );
    expect(scripts['deploy']).toBe('node scripts/deploy-universal.mjs');
    expect(scripts['deploy:doctor']).toBe('node scripts/deploy-universal.mjs --doctor');
    expect(scripts['deploy:auth']).toBe('node scripts/setup-deploy-auth.mjs');
    expect(scripts['deploy:auth:check']).toBe('node scripts/setup-deploy-auth.mjs --status');
    expect(scripts['deploy:check']).toBe('node scripts/deploy-universal.mjs --check-env');
    expect(scripts['deploy:verify']).toBe('node scripts/deploy-universal.mjs --verify-live');
    expect(scripts['deploy:rollback']).toBe('node scripts/deploy-universal.mjs --rollback');
    expect(scripts['deploy:cloud']).toBe('node scripts/deploy-cloud.mjs');
    expect(scripts['deploy:cloud:status']).toBe('node scripts/deploy-cloud.mjs --status');

    // Safe local env template exists without raw secrets
    expect(envExample).toContain('GOOGLE_APPLICATION_CREDENTIALS=');
    expect(envExample).toContain('FIREBASE_SERVICE_ACCOUNT=');
    expect(envExample).toContain('FIREBASE_TOKEN=');
    expect(envExample).toContain('GCP_WORKLOAD_IDENTITY_PROVIDER=');

    // Removed race-prone / sandbox-bypassing scripts
    expect(scripts['deploy:parallel']).toBeUndefined();
    expect(scripts['deploy:bootstrap']).toBeUndefined();

    // Workflow invariants + keyless OIDC WIF + multi-secret fallback + explicit manual deployment
    expect(workflowYaml).toContain('verify-and-build:');
    expect(workflowYaml).toContain('deploy-hosting:');
    expect(workflowYaml).toContain('needs: verify-and-build');
    expect(workflowYaml).toContain('cancel-in-progress: false');
    expect(workflowYaml).toContain('google-github-actions/auth@v2');
    expect(workflowYaml).toContain(
      `firebase-tools@${CANONICAL_PRODUCTION_DEPLOY_SPEC.firebaseToolsVersion}`,
    );
    expect(workflowYaml).toContain('FIREBASE_SERVICE_ACCOUNT_DESKCLOUD_FLEET_AUTH');
    expect(workflowYaml).toContain('FIREBASE_SERVICE_ACCOUNT_PILATES_FLOW_ATELIER');
    expect(workflowYaml).toContain('trap cleanup EXIT');
    expect(workflowYaml).toContain('exit 1');
    expect(workflowYaml).not.toContain('--token ');

    // Canonical deployment guide documents all lifecycle entry points & auth persistence guardrails
    for (const cmd of [
      'pnpm deploy:doctor',
      'pnpm deploy:auth',
      'pnpm verify:all',
      'pnpm build',
      'pnpm deploy:check',
      'pnpm deploy:verify',
      'pnpm run deploy',
      'pnpm deploy:rollback',
      'pnpm deploy:cloud',
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
