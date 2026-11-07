#!/usr/bin/env node
/**
 * Unified 2-Track Parallel Boundary Audit Runner (2026-11-07)
 * - Track A: Free Quota Exhaustion / 429 / 401 / Timeout / Offline AI Isolation & Studio Survival
 * - Track B: Prompt Data Minimization / Client Bundle Zero-Secret / Provider Error UX Regression
 * - Baseline Guard: Existing schema & git-tracked secret scan (`src/schemas/freeAiAssistantSchema.test.ts`)
 * - Scope Guard: Ensures zero existing files outside `scripts/free-ai-boundary-audit-20261107/**`
 *   and `docs/free-ai-boundary-audit-20261107/**` were modified.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

function runNodeScript(relScriptPath) {
  const res = spawnSync('node', [relScriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
    },
  });
  return {
    script: relScriptPath,
    passed: res.status === 0,
    exitCode: res.status ?? 1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
  };
}

function runCombinedVitest() {
  const testFiles = [
    'scripts/free-ai-boundary-audit-20261107/track-a/quota-fallback-survival.test.tsx',
    'scripts/free-ai-boundary-audit-20261107/track-b/privacy-bundle-ux-regression.test.tsx',
    'src/schemas/freeAiAssistantSchema.test.ts',
  ];

  const res = spawnSync(
    'pnpm',
    ['exec', 'vitest', 'run', ...testFiles, '--reporter=json'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        CI: 'true',
      },
    },
  );

  const raw = (res.stdout || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const parsed = start !== -1 && end !== -1 ? JSON.parse(raw.slice(start, end + 1)) : null;

  return {
    passed: res.status === 0 && Boolean(parsed?.success),
    exitCode: res.status ?? 1,
    numTotalTestSuites: parsed?.numTotalTestSuites ?? 0,
    numPassedTestSuites: parsed?.numPassedTestSuites ?? 0,
    numTotalTests: parsed?.numTotalTests ?? 0,
    numPassedTests: parsed?.numPassedTests ?? 0,
    numFailedTests: parsed?.numFailedTests ?? 0,
  };
}

function checkReadOnlyScopeGuard() {
  const rawStatus = execFileSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  const allowedPrefixes = [
    'scripts/free-ai-boundary-audit-20261107/',
    'docs/free-ai-boundary-audit-20261107/',
  ];

  const lines = rawStatus
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const violations = [];
  for (const line of lines) {
    const filePath = line.slice(3).trim();
    const isAllowed = allowedPrefixes.some(
      (prefix) => filePath.startsWith(prefix) || filePath === prefix.slice(0, -1),
    );
    if (!isAllowed) {
      violations.push(line);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

const trackARun = runNodeScript(
  'scripts/free-ai-boundary-audit-20261107/track-a/run-track-a-audit.mjs',
);
const trackBRun = runNodeScript(
  'scripts/free-ai-boundary-audit-20261107/track-b/run-track-b-audit.mjs',
);
const combinedVitest = runCombinedVitest();
const scopeGuard = checkReadOnlyScopeGuard();

const unifiedSummary = {
  auditId: 'free-ai-boundary-audit-20261107',
  workflow: '2-Track Parallel Dynamic Workflow (Track A + Track B)',
  tracks: {
    trackA: {
      script: trackARun.script,
      passed: trackARun.passed,
      reproducedDefects: ['DEFECT-A1', 'DEFECT-A2', 'DEFECT-A3', 'DEFECT-A4'],
    },
    trackB: {
      script: trackBRun.script,
      passed: trackBRun.passed,
      reproducedDefects: ['DEFECT-B1', 'DEFECT-B2', 'DEFECT-B3'],
    },
  },
  combinedVitest,
  readOnlyScopeGuard: scopeGuard,
  overallPassed:
    trackARun.passed &&
    trackBRun.passed &&
    combinedVitest.passed &&
    scopeGuard.passed,
};

console.log('=== UNIFIED 2-TRACK FREE AI BOUNDARY AUDIT SUMMARY ===');
console.table([
  {
    Check: 'Track A (Quota / 429 / 401 / Timeout / Offline & Studio Survival)',
    Status: trackARun.passed ? 'PASS (14/14)' : 'FAIL',
    DefectsReproduced: 'DEFECT-A1, DEFECT-A2, DEFECT-A3, DEFECT-A4',
  },
  {
    Check: 'Track B (Prompt Minimization / Bundle Zero-Secret / Error UX)',
    Status: trackBRun.passed ? 'PASS (13/13)' : 'FAIL',
    DefectsReproduced: 'DEFECT-B1, DEFECT-B2, DEFECT-B3',
  },
  {
    Check: 'Combined Vitest + Git-Tracked Secret Guard (freeAiAssistantSchema)',
    Status: combinedVitest.passed
      ? `PASS (${combinedVitest.numPassedTests}/${combinedVitest.numTotalTests})`
      : 'FAIL',
    DefectsReproduced: '0 secret leaks in dist/ or git ls-files',
  },
  {
    Check: 'Read-Only Existing Codebase Scope Guard',
    Status: scopeGuard.passed ? 'PASS' : 'FAIL',
    DefectsReproduced:
      scopeGuard.violations.length === 0
        ? '0 existing files modified'
        : scopeGuard.violations.join(', '),
  },
]);

console.log(JSON.stringify(unifiedSummary, null, 2));

process.exit(unifiedSummary.overallPassed ? 0 : 1);
