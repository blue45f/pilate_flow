#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const testRelativePath =
  'scripts/free-ai-boundary-audit-20261107/track-a/quota-fallback-survival.test.tsx';

const runResult = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', testRelativePath, '--reporter=json'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: 'true',
    },
  },
);

const rawStdout = (runResult.stdout || '').trim();
const jsonStart = rawStdout.indexOf('{');
const jsonEnd = rawStdout.lastIndexOf('}');

if (jsonStart === -1 || jsonEnd === -1) {
  console.error('Failed to parse Vitest JSON output.');
  if (rawStdout) console.error(rawStdout);
  if (runResult.stderr) console.error(runResult.stderr);
  process.exit(runResult.status ?? 1);
}

const report = JSON.parse(rawStdout.slice(jsonStart, jsonEnd + 1));
const assertions = (report.testResults ?? []).flatMap((suite) =>
  (suite.assertionResults ?? []).map((item) => ({
    category: item.ancestorTitles?.slice(1).join(' > ') || 'Track A',
    title: item.title,
    status: item.status === 'passed' ? 'PASS' : 'FAIL',
    durationMs: Math.round(item.duration ?? 0),
  })),
);

const summary = {
  track: 'Track A — Free Quota Exhaustion / 429 / 401 / Timeout / Offline Boundary & Studio Survival',
  testFile: testRelativePath,
  success: Boolean(report.success) && runResult.status === 0,
  numTotalTests: report.numTotalTests ?? assertions.length,
  numPassedTests: report.numPassedTests ?? assertions.filter((a) => a.status === 'PASS').length,
  numFailedTests: report.numFailedTests ?? assertions.filter((a) => a.status === 'FAIL').length,
  reproducedDefects: ['DEFECT-A1', 'DEFECT-A2', 'DEFECT-A3', 'DEFECT-A4'],
  assertions,
};

console.log('=== Track A Boundary Audit Summary ===');
console.table(
  assertions.map((a, idx) => ({
    '#': idx + 1,
    Status: a.status,
    Category: a.category.slice(0, 48),
    Test: a.title.slice(0, 68),
    'Time(ms)': a.durationMs,
  })),
);
console.log(JSON.stringify(summary, null, 2));

process.exit(summary.success ? 0 : 1);
