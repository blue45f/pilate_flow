import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BUILD_META_FILENAME,
  REPO_ROOT,
  buildIsolatedArtifact,
  computeArtifactFingerprint,
  computeGitProvenance,
  computeSourceFingerprint,
  parseArgs,
  verifyArtifactFreshness,
} from './verify-backup-recovery-browser.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HARNESS_SCRIPT = path.join(__dirname, 'verify-backup-recovery-browser.mjs');

function runHarnessCli(args, timeoutMs = 45000) {
  const res = spawnSync(process.execPath, [HARNESS_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  let stdoutReport = null;
  const trimmedStdout = (res.stdout || '').trim();
  if (trimmedStdout) {
    const jsonStart = trimmedStdout.indexOf('{');
    if (jsonStart >= 0) {
      try {
        stdoutReport = JSON.parse(trimmedStdout.slice(jsonStart));
      } catch {
        stdoutReport = null;
      }
    }
  }
  return {
    status: res.status,
    signal: res.signal,
    stdout: res.stdout,
    stderr: res.stderr,
    report: stdoutReport,
  };
}

function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number' || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    if (fs.existsSync(`/proc/${pid}/stat`)) {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      if (/\)\s+Z\s+/.test(stat)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

let sharedTempRoot = null;
let pinnedFreshDistDir = null;
let pinnedArtifactInfo = null;

test.before(() => {
  sharedTempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-harness-nodetest-'));
  pinnedFreshDistDir = path.join(sharedTempRoot, 'pinned-fresh-dist');
  pinnedArtifactInfo = buildIsolatedArtifact({
    sourceRoot: REPO_ROOT,
    outDir: pinnedFreshDistDir,
  });
});

test.after(() => {
  if (sharedTempRoot && fs.existsSync(sharedTempRoot)) {
    fs.rmSync(sharedTempRoot, { recursive: true, force: true });
  }
});

test('Scope A1: reproduces legacy buildIfMissing stale-dist hazard in a temp fixture and verifies --no-build rejects stale/tampered/missing artifacts', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(sharedTempRoot, 'stale-repro-'));
  const fakeSrcDir = path.join(fixtureRoot, 'src');
  const fakeDistDir = path.join(fixtureRoot, 'dist');
  fs.mkdirSync(fakeSrcDir, { recursive: true });
  fs.mkdirSync(path.join(fakeDistDir, 'assets'), { recursive: true });

  // 1) Create v1 source and v1 dist artifact
  const indexHtmlPath = path.join(fixtureRoot, 'index.html');
  const sourceFilePath = path.join(fakeSrcDir, 'appVersion.ts');
  fs.writeFileSync(indexHtmlPath, '<!doctype html><html><body></body></html>\n');
  fs.writeFileSync(sourceFilePath, 'export const APP_VERSION = "v1";\n');

  const distIndexPath = path.join(fakeDistDir, 'index.html');
  const distAssetPath = path.join(fakeDistDir, 'assets/index-v1.js');
  fs.writeFileSync(
    distIndexPath,
    '<!doctype html><html><head><script type="module" src="/assets/index-v1.js"></script></head><body></body></html>\n',
  );
  fs.writeFileSync(distAssetPath, 'console.log("compiled-v1");\n');

  const sourceFpV1 = computeSourceFingerprint(fixtureRoot);
  const artifactFpV1BeforeMeta = computeArtifactFingerprint(fakeDistDir);
  fs.writeFileSync(
    path.join(fakeDistDir, BUILD_META_FILENAME),
    JSON.stringify(
      {
        schemaVersion: 1,
        sourceSha256: sourceFpV1.sha256,
        artifactSha256: artifactFpV1BeforeMeta.sha256,
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  const artifactFpV1 = computeArtifactFingerprint(fakeDistDir);

  // Verify v1 artifact matches v1 source
  const freshV1 = verifyArtifactFreshness({
    sourceFp: sourceFpV1,
    artifactFp: artifactFpV1,
    buildMode: 'no-build',
  });
  assert.equal(freshV1.ok, true);
  assert.equal(freshV1.matchesCurrentSource, true);

  // 2) Mutate source to v2 while leaving v1 dist/index.html in place
  const futureTime = new Date(Date.now() + 5000);
  fs.writeFileSync(sourceFilePath, 'export const APP_VERSION = "v2-modified-after-dist";\n');
  fs.utimesSync(sourceFilePath, futureTime, futureTime);

  // Reproduce why legacy `if (!fs.existsSync(distIndex))` was defective:
  const legacyWouldRebuild = !fs.existsSync(distIndexPath);
  assert.equal(
    legacyWouldRebuild,
    false,
    'Legacy buildIfMissing check skips building when stale dist/index.html exists',
  );

  // Verify hardened freshness check catches the stale artifact against v2 source
  const sourceFpV2 = computeSourceFingerprint(fixtureRoot);
  assert.notEqual(sourceFpV2.sha256, sourceFpV1.sha256);

  const staleCheckWithMeta = verifyArtifactFreshness({
    sourceFp: sourceFpV2,
    artifactFp: artifactFpV1,
    buildMode: 'no-build',
  });
  assert.equal(staleCheckWithMeta.ok, false);
  assert.equal(staleCheckWithMeta.matchesCurrentSource, false);
  assert.equal(staleCheckWithMeta.status, 'stale-source-fingerprint-mismatch');

  // 3) CLI --no-build with stale dist against v2 source Root must exit non-zero and record stage='build-freshness'
  const staleReportPath = path.join(fixtureRoot, 'stale-report.json');
  const cliStale = runHarnessCli([
    '--no-build',
    '--source-root',
    fixtureRoot,
    '--dist-dir',
    fakeDistDir,
    '--output',
    staleReportPath,
  ]);
  assert.notEqual(cliStale.status, 0);
  assert.equal(cliStale.report?.status, 'fail');
  assert.equal(cliStale.report?.failureStage, 'build-freshness');
  assert.equal(cliStale.report?.provenance?.freshness?.matchesCurrentSource, false);
  assert.equal(cliStale.report?.provenance?.sourceFingerprint?.sha256, sourceFpV2.sha256);
  assert.equal(cliStale.report?.provenance?.artifactFingerprint?.sha256, artifactFpV1.sha256);
  assert.equal(fs.existsSync(staleReportPath), true);

  // 4) Even if build-meta is absent, newer source mtime or unpinned artifact is rejected in --no-build
  fs.rmSync(path.join(fakeDistDir, BUILD_META_FILENAME), { force: true });
  const cliUnpinnedStale = runHarnessCli([
    '--no-build',
    '--source-root',
    fixtureRoot,
    '--dist-dir',
    fakeDistDir,
  ]);
  assert.notEqual(cliUnpinnedStale.status, 0);
  assert.equal(cliUnpinnedStale.report?.status, 'fail');
  assert.equal(cliUnpinnedStale.report?.failureStage, 'build-freshness');
  assert.equal(cliUnpinnedStale.report?.provenance?.freshness?.matchesCurrentSource, false);

  // 5) Tampering with a compiled JS asset after build is rejected
  const tamperedDistDir = path.join(fixtureRoot, 'tampered-dist');
  fs.cpSync(pinnedFreshDistDir, tamperedDistDir, { recursive: true });
  const assetsDir = path.join(tamperedDistDir, 'assets');
  const jsAsset = fs.readdirSync(assetsDir).find((f) => f.endsWith('.js'));
  assert.ok(jsAsset, 'Expected compiled JS asset in pinned dist');
  fs.appendFileSync(path.join(assetsDir, jsAsset), '\n// tampered bytes\n');

  const cliTampered = runHarnessCli(['--no-build', '--dist-dir', tamperedDistDir]);
  assert.notEqual(cliTampered.status, 0);
  assert.equal(cliTampered.report?.status, 'fail');
  assert.equal(cliTampered.report?.failureStage, 'build-freshness');
  assert.equal(cliTampered.report?.provenance?.freshness?.status, 'artifact-tampered-after-build');
});

test('Scope A2: default execution builds an isolated fresh artifact matching current source without touching shared dist/ and records safe provenance', () => {
  const sharedDistPath = path.join(REPO_ROOT, 'dist');
  const beforeSharedDist = computeArtifactFingerprint(sharedDistPath);
  const reportPath = path.join(sharedTempRoot, 'isolated-fresh-build-report.json');

  const res = runHarnessCli(
    [
      '--stop-after-step',
      'scopeA-320x694-1-create-session-log',
      '--output',
      reportPath,
    ],
    60000,
  );

  assert.equal(res.status, 0, `Expected exit 0, stderr=${res.stderr}`);
  assert.equal(res.report?.status, 'pass');
  assert.equal(res.report?.provenance?.buildMode, 'isolated-fresh-build');
  assert.equal(res.report?.provenance?.freshness?.ok, true);
  assert.equal(res.report?.provenance?.freshness?.matchesCurrentSource, true);
  assert.equal(
    res.report?.provenance?.sourceFingerprint?.sha256,
    pinnedArtifactInfo.sourceFp.sha256,
  );
  assert.equal(
    res.report?.provenance?.artifactFingerprint?.embeddedSourceSha256,
    pinnedArtifactInfo.sourceFp.sha256,
  );

  // Provenance records branch/head/dirty without leaking environment secrets
  const gitProv = computeGitProvenance(REPO_ROOT);
  assert.equal(res.report?.provenance?.branch, gitProv.branch);
  assert.equal(res.report?.provenance?.headCommit, gitProv.headCommit);
  assert.equal(typeof res.report?.provenance?.dirty, 'boolean');

  // Shared dist/ was never overwritten or deleted
  const afterSharedDist = computeArtifactFingerprint(sharedDistPath);
  assert.equal(res.report?.isolation?.sharedDistUntouched, true);
  assert.equal(beforeSharedDist.exists, afterSharedDist.exists);
  assert.equal(beforeSharedDist.sha256, afterSharedDist.sha256);
  assert.equal(beforeSharedDist.indexMtimeMs, afterSharedDist.indexMtimeMs);
  assert.equal(res.report?.isolation?.ephemeralProfileCleanedUp, true);
  assert.equal(res.report?.isolation?.previewProcessCleanedUp, true);
  assert.equal(res.report?.isolation?.browserProcessCleanedUp, true);
});

test('Scope B1 (Negative Control — Intentional Assertion Failure): exits non-zero, records stage and cause, and preserves valid PNG failure capture after temp cleanup', () => {
  const reportPath = path.join(sharedTempRoot, 'neg-assertion-failure-report.json');
  const res = runHarnessCli([
    '--no-build',
    '--dist-dir',
    pinnedFreshDistDir,
    '--inject-assertion-failure',
    'scopeA-320x694-1-create-session-log',
    '--output',
    reportPath,
  ]);

  assert.notEqual(res.status, 0, 'Intentional assertion failure must not exit 0');
  assert.equal(fs.existsSync(reportPath), true, 'Report file must be written on assertion failure');
  const fileReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  assert.equal(fileReport.status, 'fail');
  assert.equal(fileReport.failureStage, 'step-assertion');
  assert.match(fileReport.failureReason, /Injected negative-control assertion failure/);
  assert.equal(fileReport.summary.failed, 1);

  const failedStep = fileReport.steps.find(
    (s) => s.id === 'scopeA-320x694-1-create-session-log',
  );
  assert.ok(failedStep, 'Failed step must be recorded in report.steps');
  assert.equal(failedStep.status, 'fail');
  assert.equal(failedStep.stage, 'step-assertion');
  assert.ok(failedStep.failureCapturePath, 'failureCapturePath must be recorded');
  assert.equal(
    failedStep.failureCapturePreserved,
    true,
    'failureCapturePreserved must be true after tempRoot cleanup',
  );
  assert.equal(
    fs.existsSync(failedStep.failureCapturePath),
    true,
    'Failure capture PNG must still exist on disk after harness exits',
  );

  const pngBytes = fs.readFileSync(failedStep.failureCapturePath);
  assert.ok(pngBytes.byteLength > 100, 'Failure capture PNG must be non-empty');
  assert.equal(
    pngBytes.subarray(0, 8).toString('hex'),
    '89504e470d0a1a0a',
    'Failure capture must have valid PNG magic header',
  );

  assert.equal(fileReport.isolation.ephemeralProfileCleanedUp, true);
  assert.equal(fileReport.isolation.previewProcessCleanedUp, true);
  assert.equal(fileReport.isolation.browserProcessCleanedUp, true);
  assert.equal(isPidAlive(fileReport.isolation.ownedPids.previewPid), false);
  assert.equal(isPidAlive(fileReport.isolation.ownedPids.chromePid), false);
});

test('Scope B2 (Negative Control — Invalid CLI Arguments & Corrupted/Missing Fixture): fails closed with non-zero exit and stage classification', () => {
  // 2a: Unknown CLI argument
  assert.throws(() => parseArgs(['--unknown-flag']), {
    name: 'HarnessStageError',
    stage: 'cli-arguments',
  });
  const badFlagReportPath = path.join(sharedTempRoot, 'neg-bad-flag-report.json');
  const badFlagRes = runHarnessCli(['--output', badFlagReportPath, '--unknown-flag']);
  assert.notEqual(badFlagRes.status, 0);
  assert.equal(badFlagRes.report?.status, 'fail');
  assert.equal(badFlagRes.report?.failureStage, 'cli-arguments');
  assert.equal(fs.existsSync(badFlagReportPath), true);

  // 2b: Missing value for option
  const missingValRes = runHarnessCli(['--output']);
  assert.notEqual(missingValRes.status, 0);
  assert.equal(missingValRes.report?.status, 'fail');
  assert.equal(missingValRes.report?.failureStage, 'cli-arguments');

  // 2c: Corrupted JSON fixture
  const corruptedFixturePath = path.join(sharedTempRoot, 'corrupted-fixture.json');
  fs.writeFileSync(corruptedFixturePath, '{"incomingBackupV3": { broken json');
  const badFixtureReportPath = path.join(sharedTempRoot, 'neg-bad-fixture-report.json');
  const badFixtureRes = runHarnessCli([
    '--no-build',
    '--dist-dir',
    pinnedFreshDistDir,
    '--fixture',
    corruptedFixturePath,
    '--output',
    badFixtureReportPath,
  ]);
  assert.notEqual(badFixtureRes.status, 0);
  assert.equal(badFixtureRes.report?.status, 'fail');
  assert.equal(badFixtureRes.report?.failureStage, 'fixture-load');
  assert.equal(badFixtureRes.report?.isolation?.ephemeralProfileCleanedUp, true);
  assert.equal(fs.existsSync(badFixtureReportPath), true);
});

test('Scope B3 (Negative Control — Chromium Launch Failure): exits non-zero with browser-launch stage and cleans up preview server', () => {
  const reportPath = path.join(sharedTempRoot, 'neg-browser-launch-report.json');
  const res = runHarnessCli([
    '--no-build',
    '--dist-dir',
    pinnedFreshDistDir,
    '--chrome-bin',
    path.join(sharedTempRoot, 'nonexistent-chromium-binary'),
    '--cdp-timeout-ms',
    '1500',
    '--output',
    reportPath,
  ]);

  assert.notEqual(res.status, 0);
  assert.equal(res.report?.status, 'fail');
  assert.equal(res.report?.failureStage, 'browser-launch');
  assert.equal(res.report?.isolation?.ephemeralProfileCleanedUp, true);
  assert.equal(res.report?.isolation?.previewProcessCleanedUp, true);
  assert.equal(isPidAlive(res.report?.isolation?.ownedPids?.previewPid), false);
});

test('Scope B4 (Negative Control — Preview Server Start Timeout/Failure): exits non-zero with preview-start stage and cleans up spawned process', () => {
  const reportPath = path.join(sharedTempRoot, 'neg-preview-timeout-report.json');
  const res = runHarnessCli([
    '--no-build',
    '--dist-dir',
    pinnedFreshDistDir,
    '--simulate-preview-hang',
    '--preview-timeout-ms',
    '250',
    '--output',
    reportPath,
  ]);

  assert.notEqual(res.status, 0);
  assert.equal(res.report?.status, 'fail');
  assert.equal(res.report?.failureStage, 'preview-start');
  assert.match(res.report?.failureReason || '', /Timed out after 250ms/);
  assert.equal(res.report?.isolation?.ephemeralProfileCleanedUp, true);
  assert.equal(res.report?.isolation?.previewProcessCleanedUp, true);
  assert.equal(isPidAlive(res.report?.isolation?.ownedPids?.previewPid), false);
});

test('Scope B5 (Negative Control — Output Path Write Failure): fails closed with report-output-write stage instead of hiding failure as exit 0', () => {
  const blockerFile = path.join(sharedTempRoot, 'regular-file-not-a-directory');
  fs.writeFileSync(blockerFile, 'blocker');
  const unwritableOutputPath = path.join(blockerFile, 'nested', 'report.json');

  const res = runHarnessCli([
    '--no-build',
    '--dist-dir',
    pinnedFreshDistDir,
    '--stop-after-step',
    'scopeA-320x694-1-create-session-log',
    '--output',
    unwritableOutputPath,
  ]);

  assert.notEqual(res.status, 0, 'Output write failure must not exit 0');
  assert.equal(res.report?.status, 'fail');
  assert.equal(res.report?.failureStage, 'report-output-write');
  assert.ok(res.report?.outputWriteError, 'outputWriteError must be populated');
  assert.equal(res.report?.isolation?.ephemeralProfileCleanedUp, true);
  assert.equal(res.report?.isolation?.previewProcessCleanedUp, true);
  assert.equal(res.report?.isolation?.browserProcessCleanedUp, true);
});

test('Scope B6 (Signal Interruption & External Session Process Safety): SIGTERM cleans up only owned PIDs/tempRoot and leaves other session processes untouched', async () => {
  // Spawn an independent process representing another session's server/worker
  const otherSessionProc = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
    detached: true,
  });
  const otherPid = otherSessionProc.pid;
  assert.equal(isPidAlive(otherPid), true);

  const signalReportPath = path.join(sharedTempRoot, 'neg-sigterm-report.json');
  try {
    const harnessChild = spawn(
      process.execPath,
      [
        HARNESS_SCRIPT,
        '--no-build',
        '--dist-dir',
        pinnedFreshDistDir,
        '--simulate-preview-hang',
        '--preview-timeout-ms',
        '15000',
        '--output',
        signalReportPath,
      ],
      {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    // Wait briefly for the harness to enter preview wait and spawn its preview child
    await new Promise((resolve) => setTimeout(resolve, 400));
    harnessChild.kill('SIGTERM');

    const exitResult = await new Promise((resolve) => {
      let stdout = '';
      harnessChild.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });
      harnessChild.on('close', (code, signal) => {
        resolve({ code, signal, stdout });
      });
    });

    assert.notEqual(exitResult.code, 0, 'SIGTERM-interrupted harness must not exit 0');
    assert.equal(fs.existsSync(signalReportPath), true, 'Signal report should be written');
    const sigReport = JSON.parse(fs.readFileSync(signalReportPath, 'utf8'));
    assert.equal(sigReport.status, 'fail');
    assert.equal(sigReport.failureStage, 'signal-interrupted');
    assert.equal(sigReport.interruptedBySignal, 'SIGTERM');
    assert.equal(sigReport.isolation.ephemeralProfileCleanedUp, true);
    assert.equal(isPidAlive(sigReport.isolation.ownedPids.previewPid), false);

    // Verify the unrelated session's process is 100% alive and untouched!
    assert.equal(
      isPidAlive(otherPid),
      true,
      'Unrelated session process must never be terminated by harness cleanup',
    );
  } finally {
    try {
      process.kill(-otherPid, 'SIGKILL');
    } catch {
      try {
        otherSessionProc.kill('SIGKILL');
      } catch {
        // Ignore
      }
    }
  }
});
