#!/usr/bin/env node
/**
 * Track B Standalone Audit Runner
 * ("Gemini 4 Argon High, 다이나믹 워크플로우 2트랙 병렬 — Track B: 프롬프트 데이터 최소화·클라이언트 bundle에 비밀 미포함·provider 오류 UX 회귀 검사")
 *
 * 1. Performs a read-only static inspection of `dist/` and `src/**` for:
 *    - Zero API key literals or private keys
 *    - Zero server-only upstream provider endpoints / env guard tokens leaked into client bundle
 * 2. Executes the Track B Vitest suite (`privacy-bundle-ux-regression.test.tsx`)
 * 3. Prints a structured JSON + human-readable audit summary.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const TEST_REL_PATH =
  'scripts/free-ai-boundary-audit-20261107/track-b/privacy-bundle-ux-regression.test.tsx';

function collectFilesRecursively(dirPath) {
  if (!existsSync(dirPath)) return [];
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function runStaticBundleAndSourceScan() {
  const secretPatterns = [
    { id: 'google_api_key', regex: /\bAIza[0-9A-Za-z_-]{20,}\b/ },
    { id: 'openrouter_api_key', regex: /\bsk-or-v1-[0-9a-fA-F]{16,}\b/ },
    { id: 'openai_secret_key', regex: /\bsk-[0-9A-Za-z_-]{20,}\b/ },
    { id: 'github_token', regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[0-9A-Za-z]{20,}\b/ },
    { id: 'github_fine_grained_pat', regex: /\bgithub_pat_[0-9A-Za-z_]{20,}\b/ },
    { id: 'aws_access_key_id', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { id: 'pem_private_key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  ];

  const serverOnlyEndpointsAndTokens = [
    'https://generativelanguage.googleapis.com',
    'https://openrouter.ai/api/v1/chat/completions',
    'GEMINI_FREE_TIER_UNPAID_CONFIRMED',
    'x-goog-api-key',
  ];

  const distFiles = collectFilesRecursively(DIST_DIR).filter((file) =>
    /\.(html|js|css|json|webmanifest|txt)$/i.test(file),
  );
  const distJsFiles = distFiles.filter(
    (file) => file.includes(`${path.sep}assets${path.sep}`) && file.endsWith('.js'),
  );

  const distSecretFindings = [];
  const distLeakedServerTokenFindings = [];

  for (const file of distFiles) {
    if (statSync(file).size > 25 * 1024 * 1024) continue;
    const content = readFileSync(file, 'utf8');
    const rel = path.relative(REPO_ROOT, file);
    for (const { id, regex } of secretPatterns) {
      if (regex.test(content)) {
        distSecretFindings.push({ file: rel, pattern: id });
      }
    }
  }

  for (const jsFile of distJsFiles) {
    const content = readFileSync(jsFile, 'utf8');
    const rel = path.relative(REPO_ROOT, jsFile);
    for (const token of serverOnlyEndpointsAndTokens) {
      if (content.includes(token)) {
        distLeakedServerTokenFindings.push({ file: rel, token });
      }
    }
  }

  const trackedFiles = execFileSync('git', ['ls-files'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter((file) => file.length > 0 && !/\.(png|jpg|jpeg|webp|gif|tar\.gz|ico)$/i.test(file));

  const trackedSecretFindings = [];
  for (const relFile of trackedFiles) {
    const fullPath = path.join(REPO_ROOT, relFile);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath, 'utf8');
    for (const { id, regex } of secretPatterns) {
      if (regex.test(content)) {
        trackedSecretFindings.push({ file: relFile, pattern: id });
      }
    }
  }

  return {
    distPresent: existsSync(DIST_DIR),
    distScannedFileCount: distFiles.length,
    distJsBundleCount: distJsFiles.length,
    distJsBundles: distJsFiles.map((f) => path.relative(REPO_ROOT, f)),
    trackedScannedFileCount: trackedFiles.length,
    distSecretFindings,
    distLeakedServerTokenFindings,
    trackedSecretFindings,
    passed:
      existsSync(DIST_DIR) &&
      distFiles.length > 0 &&
      distJsFiles.length > 0 &&
      distSecretFindings.length === 0 &&
      distLeakedServerTokenFindings.length === 0 &&
      trackedSecretFindings.length === 0,
  };
}

function runVitestSuite() {
  const result = spawnSync('pnpm', ['vitest', 'run', TEST_REL_PATH], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return {
    exitCode: result.status ?? 1,
    passed: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

const staticScan = runStaticBundleAndSourceScan();
const vitestRun = runVitestSuite();

if (vitestRun.stdout) {
  process.stdout.write(vitestRun.stdout);
}
if (vitestRun.stderr) {
  process.stderr.write(vitestRun.stderr);
}

const summary = {
  track: 'Track B — Prompt Data Minimization, Client Bundle Zero-Secret & Provider Error UX Regression',
  timestamp: new Date().toISOString(),
  staticBundleAudit: {
    passed: staticScan.passed,
    distPresent: staticScan.distPresent,
    distScannedFileCount: staticScan.distScannedFileCount,
    distJsBundleCount: staticScan.distJsBundleCount,
    distJsBundles: staticScan.distJsBundles,
    trackedScannedFileCount: staticScan.trackedScannedFileCount,
    distSecretFindingsCount: staticScan.distSecretFindings.length,
    distLeakedServerTokenFindingsCount: staticScan.distLeakedServerTokenFindings.length,
    trackedSecretFindingsCount: staticScan.trackedSecretFindings.length,
  },
  vitestSuite: {
    testFile: TEST_REL_PATH,
    passed: vitestRun.passed,
    exitCode: vitestRun.exitCode,
  },
  regressionGuards: [
    {
      id: 'DEFECT-B1',
      severity: 'HIGH',
      title:
        'Selected payload minimization and complete pre-transport privacy guard',
      files: ['src/lib/freeAiClient.ts', 'src/components/FreeAiAssistantPanel.tsx'],
      verification: vitestRun.passed ? 'regression guards passed' : 'not verified',
    },
    {
      id: 'DEFECT-B2',
      severity: 'MEDIUM',
      title:
        'Nested array secret stripping and shared Korean sensitive-text detection',
      files: ['src/schemas/freeAiAssistantSchema.ts', 'src/utils/freeAiAssistantEngine.ts'],
      verification: vitestRun.passed ? 'regression guards passed' : 'not verified',
    },
    {
      id: 'DEFECT-B3',
      severity: 'MEDIUM',
      title:
        'Provider failure status, isolated tab feedback and paid-model local fallback',
      files: ['src/components/FreeAiAssistantPanel.tsx', 'src/lib/freeAiClient.ts'],
      verification: vitestRun.passed ? 'regression guards passed' : 'not verified',
    },
  ],
  overallAuditPassed: staticScan.passed && vitestRun.passed,
};

console.log('\n=== TRACK B AUDIT SUMMARY (JSON) ===');
console.log(JSON.stringify(summary, null, 2));

if (!summary.overallAuditPassed) {
  process.exit(1);
}
