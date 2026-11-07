#!/usr/bin/env node
/**
 * Deterministic Bounded Runner for Backup & Teaching History Input Boundary Corpus
 *
 * Imports and executes the synthetic boundary corpus (`src/test/fixtures/backup-recovery/backupInputBoundaryCorpus.json`)
 * against the real backup/history inspection, normalization, restore, and rollback functions via Vitest (`src/test/backupInputBoundaries.test.ts`).
 *
 * Separates outcomes strictly into:
 * - `PASS_ENFORCED_GUARD`: Enforced boundary rejections, legacy conversions, and round-trip idempotence.
 * - `REPRODUCED_DEFECT`: Reproduced runtime boundary gaps (D1..D6) documented with failing/reproducing fixtures and unapplied patch proposals.
 * - `PASS_NEGATIVE_CONTROL`: Self negative controls proving simulated mutation/pollution/partial-write failures are caught.
 * - `ENV_LIMIT`: Environment constraints (if any).
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const CORPUS_PATH = path.join(
  REPO_ROOT,
  'src/test/fixtures/backup-recovery/backupInputBoundaryCorpus.json',
);
const TEST_FILE_REL = 'src/test/backupInputBoundaries.test.ts';

function sha256File(filePath) {
  const bytes = fs.readFileSync(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

function parseArgs(argv) {
  const options = {
    outputPath: null,
    failOnReproducedDefects: false,
    injectNegativeControl: false,
    verifyNegativeControl: true,
    quiet: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --output <path>');
      }
      options.outputPath = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--fail-on-reproduced-defects') {
      options.failOnReproducedDefects = true;
    } else if (arg === '--inject-negative-control') {
      options.injectNegativeControl = true;
      options.verifyNegativeControl = false;
    } else if (arg === '--no-verify-negative-control') {
      options.verifyNegativeControl = false;
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  return options;
}

function getGitProvenance() {
  const branchRes = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const headRes = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const statusRes = spawnSync('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  const statusLines = (statusRes.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const productRuntimeModified = statusLines.some((line) => {
    const file = line.slice(3).trim();
    return (
      file.startsWith('src/') &&
      !file.startsWith('src/test/') &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('.test.tsx')
    );
  });

  return {
    branch: (branchRes.stdout || '').trim() || 'unknown',
    headSha: (headRes.stdout || '').trim() || 'unknown',
    dirty: statusLines.length > 0,
    productRuntimeModified,
  };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`[backup-input-boundaries] CLI argument error: ${err.message}`);
    process.exit(2);
  }

  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(`[backup-input-boundaries] Missing corpus file: ${CORPUS_PATH}`);
    process.exit(2);
  }

  const corpusRaw = fs.readFileSync(CORPUS_PATH, 'utf8');
  const corpus = JSON.parse(corpusRaw);
  const corpusSha256 = sha256File(CORPUS_PATH);
  const testFileSha256 = sha256File(path.join(REPO_ROOT, TEST_FILE_REL));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilates-backup-boundaries-'));
  const vitestJsonPath = path.join(tempDir, 'vitest-report.json');

  const startHeapMb = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
  const startTimeMs = Date.now();

  try {
    const env = {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=512`.trim(),
    };
    if (options.failOnReproducedDefects) {
      env.BACKUP_BOUNDARY_FAIL_ON_DEFECTS = '1';
    }
    if (options.injectNegativeControl) {
      env.BACKUP_BOUNDARY_INJECT_NEGATIVE_CONTROL = '1';
    }

    const vitestProc = spawnSync(
      'pnpm',
      ['exec', 'vitest', 'run', TEST_FILE_REL, '--reporter=json', `--outputFile=${vitestJsonPath}`],
      {
        cwd: REPO_ROOT,
        env,
        encoding: 'utf8',
        timeout: corpus.bounds.maxSuiteDurationMs,
      },
    );

    const elapsedMs = Date.now() - startTimeMs;
    const endHeapMb = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
    const heapDeltaMb = Math.max(0, Math.round((endHeapMb - startHeapMb) * 100) / 100);

    let vitestReport = null;
    if (fs.existsSync(vitestJsonPath)) {
      vitestReport = JSON.parse(fs.readFileSync(vitestJsonPath, 'utf8'));
    }

    const assertionResults =
      vitestReport?.testResults?.flatMap((suite) => suite.assertionResults || []) || [];

    const caseResults = corpus.cases.map((corpusCase) => {
      const matchedAssertion = assertionResults.find((a) =>
        (a.title || a.fullName || '').includes(corpusCase.id),
      );
      const passedInVitest = matchedAssertion?.status === 'passed';
      const durationMs = matchedAssertion?.duration ?? 0;

      return {
        id: corpusCase.id,
        category: corpusCase.category,
        title: corpusCase.title,
        target: corpusCase.target,
        classification: corpusCase.expectedClassification,
        defectId: corpusCase.defectId || null,
        resolvedDefectId: corpusCase.resolvedDefectId || null,
        expectedOutcome: corpusCase.expectedOutcome,
        actualOutcome: corpusCase.actualOutcome || corpusCase.expectedOutcome,
        vitestStatus: matchedAssertion?.status || 'missing',
        durationMs,
        withinDurationBound: durationMs <= corpus.bounds.maxCaseDurationMs,
        verified: passedInVitest && durationMs <= corpus.bounds.maxCaseDurationMs,
      };
    });

    // Optional negative-control subprocess verification
    let negativeControlSubprocessVerified = null;
    if (options.verifyNegativeControl && !options.injectNegativeControl) {
      const negProc = spawnSync(
        process.execPath,
        [__filename, '--inject-negative-control', '--quiet'],
        {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          timeout: corpus.bounds.maxSuiteDurationMs,
        },
      );
      negativeControlSubprocessVerified = {
        exitedNonZero: negProc.status !== 0 && negProc.status !== null,
        exitCode: negProc.status,
      };
    }

    const enforcedGuards = caseResults.filter(
      (c) => c.classification === 'PASS_ENFORCED_GUARD',
    );
    const reproducedDefects = caseResults.filter(
      (c) => c.classification === 'REPRODUCED_DEFECT',
    );
    const resolvedDefects = caseResults.filter((c) => Boolean(c.resolvedDefectId));
    const negativeControls = caseResults.filter(
      (c) => c.classification === 'PASS_NEGATIVE_CONTROL',
    );

    const allCasesVerified = caseResults.every((c) => c.verified);
    const negativeControlOk =
      negativeControlSubprocessVerified === null ||
      negativeControlSubprocessVerified.exitedNonZero;
    const withinResourceBounds =
      elapsedMs <= corpus.bounds.maxSuiteDurationMs &&
      heapDeltaMb <= corpus.bounds.maxRunnerHeapDeltaMb;
    const reproducedDefectsCheckOk =
      !options.failOnReproducedDefects || reproducedDefects.length === 0;

    const overallStatus =
      vitestProc.status === 0 &&
      allCasesVerified &&
      negativeControlOk &&
      withinResourceBounds &&
      reproducedDefectsCheckOk
        ? 'PASS'
        : 'FAIL';

    const summaryReport = {
      status: overallStatus,
      executedAt: new Date().toISOString(),
      corpusId: corpus.corpusId,
      corpusSeed: corpus.corpusSeed,
      corpusSha256,
      testFileSha256,
      gitProvenance: getGitProvenance(),
      bounds: corpus.bounds,
      metrics: {
        elapsedMs,
        runnerHeapDeltaMb: heapDeltaMb,
        totalCorpusCases: corpus.cases.length,
        enforcedGuardsPassed: enforcedGuards.filter((c) => c.verified).length,
        enforcedGuardsTotal: enforcedGuards.length,
        reproducedDefectsDocumented: reproducedDefects.filter((c) => c.verified).length,
        reproducedDefectsTotal: reproducedDefects.length,
        resolvedDefectsVerified: resolvedDefects.filter((c) => c.verified).length,
        resolvedDefectsTotal: resolvedDefects.length,
        negativeControlsPassed: negativeControls.filter((c) => c.verified).length,
        negativeControlsTotal: negativeControls.length,
        envLimitsCount: 0,
      },
      negativeControlSubprocessVerified,
      reproducedDefectsSummary: reproducedDefects.map((d) => ({
        id: d.id,
        defectId: d.defectId,
        title: d.title,
        expectedOutcome: d.expectedOutcome,
        actualOutcome: d.actualOutcome,
        reproducedAndVerified: d.verified,
      })),
      resolvedDefectsSummary: resolvedDefects.map((d) => ({
        id: d.id,
        resolvedDefectId: d.resolvedDefectId,
        title: d.title,
        expectedOutcome: d.expectedOutcome,
        verified: d.verified,
      })),
      cases: caseResults,
    };

    if (options.outputPath) {
      fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
      fs.writeFileSync(options.outputPath, `${JSON.stringify(summaryReport, null, 2)}\n`, 'utf8');
    }

    if (!options.quiet) {
      console.log(JSON.stringify(summaryReport, null, 2));
    }

    if (overallStatus !== 'PASS') {
      process.exit(1);
    }
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors on temp dir
    }
  }
}

main();
