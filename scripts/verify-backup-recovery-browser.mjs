#!/usr/bin/env node
/**
 * Reproducible Local Browser Regression Harness for Backup, Preflight, Restore, and Rollback.
 *
 * Scope A:
 *  - Viewports 320x694 and 390x844 in isolated headless Chromium (temporary profile + ephemeral preview server)
 *  - Real UI flow: Session Log Creation -> JSON Export -> Preflight Inspection -> Restore -> Page Reload -> Rollback
 *
 * Scope B:
 *  - Two independent tabs on the same origin: real cross-tab StorageEvent during preflight & before rollback
 *  - Stale-state defense: post-restore new session record, page reload, and double rollback (single-tab & cross-tab)
 *  - Rollback storage key (pilates-flow-backup-rollback-v1) fault tests with synthetic fixtures
 *    (corrupted JSON, legacy version 0, unsupported version 99, invalid preRestoreState shape, and QuotaExceededError write faults),
 *    explicitly distinguishing real browser behavior, synthetic fixture injection, and mocked Storage faults.
 */

import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, '..');
export const DEFAULT_FIXTURE_PATH = path.join(
  REPO_ROOT,
  'src/test/fixtures/backup-recovery/syntheticBackupFixtures.json',
);
export const BUILD_META_FILENAME = '.backup-harness-build-meta.json';

export class HarnessStageError extends Error {
  constructor(stage, message) {
    super(message);
    this.name = 'HarnessStageError';
    this.stage = stage;
  }
}

class StopAfterStepSignal extends Error {
  constructor(stepId) {
    super(`Stopped after step ${stepId}`);
    this.name = 'StopAfterStepSignal';
    this.stepId = stepId;
  }
}

const sha256Hex = (bufOrStr) => createHash('sha256').update(bufOrStr).digest('hex');

function requireArgValue(argv, index, flagName) {
  const next = argv[index + 1];
  if (next === undefined || next.startsWith('--')) {
    throw new HarnessStageError(
      'cli-arguments',
      `Missing value for CLI option ${flagName}`,
    );
  }
  return next;
}

function parsePositiveIntOption(rawVal, flagName) {
  const parsed = Number(rawVal);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HarnessStageError(
      'cli-arguments',
      `Invalid positive integer for ${flagName}: ${rawVal}`,
    );
  }
  return parsed;
}

export function parseArgs(argv) {
  const options = {
    outputPath: null,
    screenshotDir: null,
    fixturePath: DEFAULT_FIXTURE_PATH,
    sourceRoot: REPO_ROOT,
    noBuild: false,
    distDir: null,
    allowStaleDist: false,
    expectedSourceSha256: null,
    expectedArtifactSha256: null,
    prepareDistDir: null,
    chromiumBin: process.env.CHROMIUM_BIN || '/usr/bin/chromium',
    previewTimeoutMs: 20000,
    cdpTimeoutMs: 15000,
    injectAssertionFailure: null,
    stopAfterStep: null,
    simulatePreviewHang: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') {
      options.outputPath = path.resolve(requireArgValue(argv, i, '--output'));
      i += 1;
    } else if (arg === '--screenshot-dir') {
      options.screenshotDir = path.resolve(requireArgValue(argv, i, '--screenshot-dir'));
      i += 1;
    } else if (arg === '--fixture') {
      options.fixturePath = path.resolve(requireArgValue(argv, i, '--fixture'));
      i += 1;
    } else if (arg === '--source-root') {
      options.sourceRoot = path.resolve(requireArgValue(argv, i, '--source-root'));
      i += 1;
    } else if (arg === '--no-build') {
      options.noBuild = true;
    } else if (arg === '--dist-dir') {
      options.distDir = path.resolve(requireArgValue(argv, i, '--dist-dir'));
      i += 1;
    } else if (arg === '--allow-stale-dist') {
      options.allowStaleDist = true;
    } else if (arg === '--expected-source-sha256') {
      options.expectedSourceSha256 = requireArgValue(argv, i, '--expected-source-sha256').trim();
      i += 1;
    } else if (arg === '--expected-artifact-sha256') {
      options.expectedArtifactSha256 = requireArgValue(argv, i, '--expected-artifact-sha256').trim();
      i += 1;
    } else if (arg === '--prepare-dist') {
      options.prepareDistDir = path.resolve(requireArgValue(argv, i, '--prepare-dist'));
      i += 1;
    } else if (arg === '--chrome-bin') {
      options.chromiumBin = requireArgValue(argv, i, '--chrome-bin');
      i += 1;
    } else if (arg === '--preview-timeout-ms') {
      options.previewTimeoutMs = parsePositiveIntOption(
        requireArgValue(argv, i, '--preview-timeout-ms'),
        '--preview-timeout-ms',
      );
      i += 1;
    } else if (arg === '--cdp-timeout-ms') {
      options.cdpTimeoutMs = parsePositiveIntOption(
        requireArgValue(argv, i, '--cdp-timeout-ms'),
        '--cdp-timeout-ms',
      );
      i += 1;
    } else if (arg === '--inject-assertion-failure') {
      options.injectAssertionFailure = requireArgValue(argv, i, '--inject-assertion-failure');
      i += 1;
    } else if (arg === '--stop-after-step') {
      options.stopAfterStep = requireArgValue(argv, i, '--stop-after-step');
      i += 1;
    } else if (arg === '--simulate-preview-hang') {
      options.simulatePreviewHang = true;
    } else {
      throw new HarnessStageError(
        'cli-arguments',
        `Unknown or unsupported CLI argument: ${arg}`,
      );
    }
  }
  return options;
}

export function computeGitProvenance(repoRoot = REPO_ROOT) {
  const inspectedAt = new Date().toISOString();
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const headCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const headShort = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const porcelain = execFileSync(
      'git',
      ['status', '--porcelain', '--untracked-files=normal'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();
    const dirtyLines = porcelain ? porcelain.split('\n').filter(Boolean) : [];
    return {
      branch,
      headCommit,
      headShort,
      dirty: dirtyLines.length > 0,
      dirtyFileCount: dirtyLines.length,
      inspectedAt,
    };
  } catch {
    return {
      branch: 'unknown',
      headCommit: 'unknown',
      headShort: 'unknown',
      dirty: null,
      dirtyFileCount: null,
      inspectedAt,
    };
  }
}

function collectFilesRecursive(baseDir, relPrefix = '') {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const fullPath = path.join(baseDir, entry.name);
    const lstat = fs.lstatSync(fullPath);
    if (lstat.isSymbolicLink()) continue;
    if (lstat.isDirectory()) {
      results.push(...collectFilesRecursive(fullPath, relPath));
    } else if (lstat.isFile()) {
      results.push({ relPath, fullPath, lstat });
    }
  }
  return results;
}

export function computeSourceFingerprint(sourceRoot = REPO_ROOT) {
  const computedAt = new Date().toISOString();
  const rootFiles = [
    'index.html',
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'tsconfig.backend.json',
  ];
  const collected = [];
  for (const rel of rootFiles) {
    const full = path.join(sourceRoot, rel);
    if (fs.existsSync(full)) {
      const lstat = fs.lstatSync(full);
      if (lstat.isFile() && !lstat.isSymbolicLink()) {
        collected.push({ relPath: rel, fullPath: full, lstat });
      }
    }
  }
  const srcDir = path.join(sourceRoot, 'src');
  collected.push(...collectFilesRecursive(srcDir, 'src'));
  collected.sort((a, b) => a.relPath.localeCompare(b.relPath));

  const hash = createHash('sha256');
  let totalBytes = 0;
  let newestMtimeMs = 0;

  for (const item of collected) {
    const bytes = fs.readFileSync(item.fullPath);
    const fileSha = sha256Hex(bytes);
    hash.update(`${item.relPath}\0${fileSha}\n`);
    totalBytes += bytes.byteLength;
    if (item.lstat.mtimeMs > newestMtimeMs) {
      newestMtimeMs = item.lstat.mtimeMs;
    }
  }

  return {
    sha256: hash.digest('hex'),
    fileCount: collected.length,
    totalBytes,
    newestMtimeMs,
    newestMtimeIso: newestMtimeMs > 0 ? new Date(newestMtimeMs).toISOString() : null,
    computedAt,
  };
}

export function computeArtifactFingerprint(distDir) {
  const computedAt = new Date().toISOString();
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (!distDir || !fs.existsSync(distDir) || !fs.existsSync(indexHtmlPath)) {
    return {
      exists: false,
      validBundle: false,
      missingAssets: ['index.html'],
      sha256: null,
      fileCount: 0,
      totalBytes: 0,
      indexMtimeMs: null,
      indexMtimeIso: null,
      newestMtimeMs: null,
      newestMtimeIso: null,
      oldestMtimeMs: null,
      buildMeta: null,
      embeddedSourceSha256: null,
      computedAt,
    };
  }

  const indexStat = fs.lstatSync(indexHtmlPath);
  if (!indexStat.isFile() || indexStat.isSymbolicLink()) {
    return {
      exists: false,
      validBundle: false,
      missingAssets: ['index.html'],
      sha256: null,
      fileCount: 0,
      totalBytes: 0,
      indexMtimeMs: null,
      indexMtimeIso: null,
      newestMtimeMs: null,
      newestMtimeIso: null,
      oldestMtimeMs: null,
      buildMeta: null,
      embeddedSourceSha256: null,
      computedAt,
    };
  }

  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  const assetRefs = [
    ...indexHtmlContent.matchAll(/(?:src|href)=["'](?:\.?\/)?(assets\/[^"'?#]+)["']/g),
  ].map((m) => m[1]);
  const missingAssets = [];
  for (const ref of assetRefs) {
    const assetFull = path.join(distDir, ref);
    if (!fs.existsSync(assetFull)) {
      missingAssets.push(ref);
    }
  }

  const allFiles = collectFilesRecursive(distDir, '').filter(
    (item) => item.relPath !== BUILD_META_FILENAME,
  );
  allFiles.sort((a, b) => a.relPath.localeCompare(b.relPath));

  const hash = createHash('sha256');
  let totalBytes = 0;
  let newestMtimeMs = 0;
  let oldestMtimeMs = Number.POSITIVE_INFINITY;

  for (const item of allFiles) {
    const bytes = fs.readFileSync(item.fullPath);
    const fileSha = sha256Hex(bytes);
    hash.update(`${item.relPath}\0${fileSha}\n`);
    totalBytes += bytes.byteLength;
    if (item.lstat.mtimeMs > newestMtimeMs) newestMtimeMs = item.lstat.mtimeMs;
    if (item.lstat.mtimeMs < oldestMtimeMs) oldestMtimeMs = item.lstat.mtimeMs;
  }

  let buildMeta = null;
  const metaPath = path.join(distDir, BUILD_META_FILENAME);
  if (fs.existsSync(metaPath)) {
    try {
      buildMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {
      buildMeta = { parseError: true };
    }
  }

  const hasAssetBundle = assetRefs.length > 0 && missingAssets.length === 0;

  return {
    exists: true,
    validBundle: hasAssetBundle,
    missingAssets,
    sha256: hash.digest('hex'),
    fileCount: allFiles.length,
    totalBytes,
    indexMtimeMs: indexStat.mtimeMs,
    indexMtimeIso: new Date(indexStat.mtimeMs).toISOString(),
    newestMtimeMs: newestMtimeMs > 0 ? newestMtimeMs : null,
    newestMtimeIso: newestMtimeMs > 0 ? new Date(newestMtimeMs).toISOString() : null,
    oldestMtimeMs: Number.isFinite(oldestMtimeMs) ? oldestMtimeMs : null,
    buildMeta,
    embeddedSourceSha256:
      buildMeta && typeof buildMeta.sourceSha256 === 'string' ? buildMeta.sourceSha256 : null,
    computedAt,
  };
}

export function verifyArtifactFreshness({
  sourceFp,
  artifactFp,
  buildMode,
  allowStaleDist = false,
  expectedSourceSha256 = null,
  expectedArtifactSha256 = null,
}) {
  const verifiedAt = new Date().toISOString();

  if (!sourceFp || sourceFp.fileCount === 0) {
    return {
      ok: false,
      status: 'missing-source-tree',
      matchesCurrentSource: false,
      verifiedAt,
      reason: 'Source tree is missing or empty; cannot compute source fingerprint.',
    };
  }

  if (!artifactFp?.exists || !artifactFp?.validBundle) {
    return {
      ok: false,
      status: 'missing-or-incomplete-artifact',
      matchesCurrentSource: false,
      verifiedAt,
      reason: `Build artifact is missing or incomplete (missingAssets=${JSON.stringify(artifactFp?.missingAssets ?? [])}).`,
    };
  }

  if (expectedSourceSha256 && expectedSourceSha256 !== sourceFp.sha256) {
    return {
      ok: false,
      status: 'expected-source-fingerprint-mismatch',
      matchesCurrentSource: false,
      verifiedAt,
      reason: `Current source fingerprint (${sourceFp.sha256}) does not match expected (${expectedSourceSha256}).`,
    };
  }

  if (expectedArtifactSha256 && expectedArtifactSha256 !== artifactFp.sha256) {
    return {
      ok: false,
      status: 'expected-artifact-fingerprint-mismatch',
      matchesCurrentSource: false,
      verifiedAt,
      reason: `Artifact fingerprint (${artifactFp.sha256}) does not match expected (${expectedArtifactSha256}).`,
    };
  }

  if (artifactFp.buildMeta?.parseError) {
    return {
      ok: Boolean(allowStaleDist),
      status: 'corrupted-build-meta',
      matchesCurrentSource: false,
      verifiedAt,
      reason: `Corrupted ${BUILD_META_FILENAME} in artifact directory.`,
    };
  }

  if (artifactFp.buildMeta) {
    if (artifactFp.buildMeta.sourceSha256 !== sourceFp.sha256) {
      return {
        ok: Boolean(allowStaleDist),
        status: 'stale-source-fingerprint-mismatch',
        matchesCurrentSource: false,
        verifiedAt,
        reason: `Stale build artifact detected: artifact was built from source ${artifactFp.buildMeta.sourceSha256}, but current source is ${sourceFp.sha256}.`,
      };
    }
    if (
      artifactFp.buildMeta.artifactSha256 &&
      artifactFp.buildMeta.artifactSha256 !== artifactFp.sha256
    ) {
      return {
        ok: Boolean(allowStaleDist),
        status: 'artifact-tampered-after-build',
        matchesCurrentSource: false,
        verifiedAt,
        reason: `Artifact files were modified after build: manifest expected ${artifactFp.buildMeta.artifactSha256}, actual ${artifactFp.sha256}.`,
      };
    }
  }

  if (
    typeof sourceFp.newestMtimeMs === 'number' &&
    typeof artifactFp.indexMtimeMs === 'number' &&
    sourceFp.newestMtimeMs > artifactFp.indexMtimeMs + 1
  ) {
    return {
      ok: Boolean(allowStaleDist),
      status: 'stale-source-newer-than-artifact',
      matchesCurrentSource: false,
      verifiedAt,
      reason: `Stale build artifact detected: newest source mtime (${sourceFp.newestMtimeIso}) is newer than artifact index.html mtime (${artifactFp.indexMtimeIso}).`,
    };
  }

  if (artifactFp.buildMeta?.sourceSha256 === sourceFp.sha256) {
    return {
      ok: true,
      status:
        buildMode === 'isolated-fresh-build'
          ? 'verified-fresh-isolated-build'
          : 'verified-fresh-manifest',
      matchesCurrentSource: true,
      verifiedAt,
      reason: null,
    };
  }

  if (expectedArtifactSha256 && expectedArtifactSha256 === artifactFp.sha256) {
    return {
      ok: true,
      status: 'verified-by-expected-artifact-sha256',
      matchesCurrentSource: true,
      verifiedAt,
      reason: null,
    };
  }

  return {
    ok: Boolean(allowStaleDist),
    status: 'unpinned-artifact-missing-build-meta',
    matchesCurrentSource: false,
    verifiedAt,
    reason:
      `--no-build target lacks ${BUILD_META_FILENAME} and no --expected-artifact-sha256 was provided; ` +
      `refusing to trust unpinned build directory without --allow-stale-dist.`,
  };
}

export function buildIsolatedArtifact({
  sourceRoot = REPO_ROOT,
  outDir,
  gitProvenance = null,
}) {
  const sourceFp = computeSourceFingerprint(sourceRoot);
  if (sourceFp.fileCount === 0) {
    throw new HarnessStageError(
      'isolated-build',
      `Cannot build from empty or missing sourceRoot: ${sourceRoot}`,
    );
  }
  fs.mkdirSync(outDir, { recursive: true });
  try {
    execFileSync(
      'pnpm',
      ['exec', 'vite', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'],
      {
        cwd: sourceRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr).trim() : '';
    const msg = error instanceof Error ? error.message : String(error);
    throw new HarnessStageError(
      'isolated-build',
      `Isolated Vite build failed: ${stderr || msg}`,
    );
  }

  const initialArtifactFp = computeArtifactFingerprint(outDir);
  if (!initialArtifactFp.exists || !initialArtifactFp.validBundle) {
    throw new HarnessStageError(
      'isolated-build',
      `Isolated build did not produce a valid bundle in ${outDir}`,
    );
  }

  const prov = gitProvenance || computeGitProvenance(sourceRoot);
  const buildMeta = {
    schemaVersion: 1,
    sourceSha256: sourceFp.sha256,
    artifactSha256: initialArtifactFp.sha256,
    gitBranch: prov.branch,
    gitHeadCommit: prov.headCommit,
    gitDirty: prov.dirty,
    builtAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(outDir, BUILD_META_FILENAME),
    JSON.stringify(buildMeta, null, 2),
  );

  const finalArtifactFp = computeArtifactFingerprint(outDir);
  return {
    sourceFp,
    artifactFp: finalArtifactFp,
    buildMeta,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number' || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function terminateOwnedProcess(proc) {
  if (!proc || !proc.pid || proc.pid === process.pid) return true;
  const pid = proc.pid;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Already exited
    }
  }
  const waitStart = Date.now();
  while (Date.now() - waitStart < 150) {
    if (proc.exitCode !== null || proc.signalCode !== null || !isPidAlive(pid)) {
      return true;
    }
    await sleep(25);
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Ignore
    }
  }
  const killStart = Date.now();
  while (Date.now() - killStart < 250) {
    if (proc.exitCode !== null || proc.signalCode !== null || !isPidAlive(pid)) {
      return true;
    }
    await sleep(25);
  }
  return !isPidAlive(pid);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHttp(url, timeoutMs = 20000, trackedProc = null, stage = 'preview-start') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (trackedProc?.spawnError) {
      throw new HarnessStageError(
        stage,
        `Process failed to spawn for ${url}: ${trackedProc.spawnError.message}`,
      );
    }
    if (
      trackedProc &&
      (trackedProc.exitCode !== null || trackedProc.signalCode !== null)
    ) {
      throw new HarnessStageError(
        stage,
        `Process exited prematurely before ${url} became ready (exitCode=${trackedProc.exitCode}, signal=${trackedProc.signalCode})`,
      );
    }
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
    } catch {
      // Wait until ready
    }
    await sleep(100);
  }
  throw new HarnessStageError(stage, `Timed out after ${timeoutMs}ms waiting for ${url}`);
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  async ready() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Eval error: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description || ''}`,
      );
    }
    return res.result.value;
  }

  async screenshot(outPath) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
    return outPath;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // Ignore close errors
    }
  }
}

async function waitForCondition(cdp, predicateExpr, timeoutMs = 8000, label = predicateExpr) {
  const start = Date.now();
  let lastVal;
  while (Date.now() - start < timeoutMs) {
    lastVal = await cdp.eval(predicateExpr);
    if (lastVal) return lastVal;
    await sleep(100);
  }
  throw new Error(`Condition timeout (${label}): lastVal=${JSON.stringify(lastVal)}`);
}

async function readAppSnapshot(cdp, importedSequenceId) {
  return cdp.eval(`(() => {
    const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
    const rollbackRaw = localStorage.getItem('pilates-flow-backup-rollback-v1');
    const parsed = raw ? JSON.parse(raw) : null;
    const state = parsed?.state ?? parsed ?? {};
    const statusTexts = [...document.querySelectorAll('[role="status"], [role="alert"]')]
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
    const rollbackBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('복원 이전 상태로 되돌리기'),
    );
    const applyBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('이 내용으로 복원 적용'),
    );
    const reexamineBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('현재 자료로 다시 검토'),
    );
    return {
      savedSequencesCount: (state.savedSequences || []).length,
      hasImportedSeq: (state.savedSequences || []).some((s) => s.id === ${JSON.stringify(importedSequenceId)}),
      historyLogsCount: (state.historyLogs || []).length,
      latestHistoryHasProgramSnapshot: Boolean(state.historyLogs?.[0]?.programSnapshot),
      rollbackRawPresent: Boolean(rollbackRaw),
      rollbackBtnVisible: Boolean(rollbackBtn),
      applyBtnVisible: Boolean(applyBtn),
      applyBtnDisabled: applyBtn ? Boolean(applyBtn.disabled) : null,
      reexamineBtnVisible: Boolean(reexamineBtn),
      preflightVisible: Boolean(document.querySelector('[aria-label="복구 전 확인"]')),
      statusTexts,
    };
  })()`);
}

async function openSettingsModal(cdp) {
  await cdp.eval(`(() => {
    const dialog = document.querySelector('dialog[open]');
    if (dialog && dialog.textContent?.includes('백업 불러오기')) return true;
    const btn = document.querySelector('button[aria-label="데이터 백업과 사용 안내"]');
    if (btn) btn.click();
    return Boolean(btn);
  })()`);
  await waitForCondition(
    cdp,
    `Boolean([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('백업 불러오기')))`,
    5000,
    'Settings modal open with 백업 불러오기 button',
  );
}

async function closeOpenDialogs(cdp) {
  await cdp.eval(`(() => {
    const openDialogs = [...document.querySelectorAll('dialog[open]')];
    for (const dlg of openDialogs) {
      const closeBtn = [...dlg.querySelectorAll('button')].find(
        (b) =>
          b.getAttribute('aria-label')?.includes('닫기') ||
          b.textContent?.trim() === '닫기',
      );
      if (closeBtn) closeBtn.click();
      else dlg.close?.();
    }
  })()`);
  await sleep(150);
}

async function selectBackupFileInSettings(cdp, backupFilePath) {
  await openSettingsModal(cdp);
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: 'input[type="file"][aria-label="백업 JSON 파일 선택"]',
  });
  if (!nodeId) {
    throw new Error('Could not find input[type="file"][aria-label="백업 JSON 파일 선택"]');
  }
  await cdp.send('DOM.setFileInputFiles', {
    nodeId,
    files: [],
  });
  await cdp.send('DOM.setFileInputFiles', {
    nodeId,
    files: [backupFilePath],
  });
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="복구 전 확인"]'))`,
    6000,
    'Preflight section [aria-label="복구 전 확인"] visible',
  );
}

async function recordCompletedSessionViaUI(cdp) {
  await closeOpenDialogs(cdp);
  await cdp.eval(`(() => {
    const binderBtn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent && el.textContent.trim() === '내 수업',
    );
    if (binderBtn) binderBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('이미 진행한 수업 기록하기')))`,
    5000,
    'Binder button 이미 진행한 수업 기록하기 visible',
  );
  await cdp.eval(`(() => {
    const logBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('이미 진행한 수업 기록하기'),
    );
    if (logBtn) logBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('수업 기록 저장')))`,
    5000,
    'LogSessionModal dialog open with 수업 기록 저장 button',
  );
  await cdp.eval(`(() => {
    const saveBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('수업 기록 저장'),
    );
    if (saveBtn) saveBtn.click();
  })()`);
  await sleep(350);
}

function attachProcessErrorTracking(proc) {
  proc.spawnError = null;
  proc.on('error', (err) => {
    proc.spawnError = err;
  });
  return proc;
}

export async function runHarness(rawArgv = process.argv.slice(2)) {
  const startedAtIso = new Date().toISOString();
  const startedAtMs = Date.now();

  const sharedDistPath = path.join(REPO_ROOT, 'dist');
  const sharedDistBefore = computeArtifactFingerprint(sharedDistPath);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pilates-backup-regression-'));
  const profileDir = path.join(tempRoot, 'chrome-profile');
  const tempFixtureDir = path.join(tempRoot, 'fixtures');
  const isolatedDistDir = path.join(tempRoot, 'dist-isolated');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(tempFixtureDir, { recursive: true });

  // Pre-scan --output so even CLI argument errors can write a failure report to the requested path
  let preScannedOutputPath = null;
  for (let i = 0; i < rawArgv.length; i += 1) {
    if (rawArgv[i] === '--output' && rawArgv[i + 1] && !rawArgv[i + 1].startsWith('--')) {
      preScannedOutputPath = path.resolve(rawArgv[i + 1]);
      break;
    }
  }

  let options = { outputPath: preScannedOutputPath };
  let failureCaptureDir = null;
  const steps = [];
  let browserVersion = 'unknown';
  let previewProc = null;
  let chromeProc = null;
  let tabA = null;
  let tabB = null;
  let baseUrl = null;
  let failureStage = null;
  let failureReason = null;
  let interruptedBySignal = null;
  let stoppedEarlyAfterStep = null;

  let gitProvenance = computeGitProvenance(REPO_ROOT);
  let sourceFp = null;
  let artifactFp = null;
  let freshness = null;
  let buildMode = 'isolated-fresh-build';

  const onSignal = (sig) => {
    if (interruptedBySignal) return;
    interruptedBySignal = sig;
    failureStage = 'signal-interrupted';
    failureReason = `Harness interrupted by signal ${sig}`;
    process.exitCode = sig === 'SIGINT' ? 130 : 143;
    if (tabB) tabB.close();
    if (tabA) tabA.close();
    if (chromeProc?.pid) {
      try {
        process.kill(-chromeProc.pid, 'SIGKILL');
      } catch {
        try {
          chromeProc.kill('SIGKILL');
        } catch {
          // Ignore
        }
      }
    }
    if (previewProc?.pid) {
      try {
        process.kill(-previewProc.pid, 'SIGKILL');
      } catch {
        try {
          previewProc.kill('SIGKILL');
        } catch {
          // Ignore
        }
      }
    }
  };

  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  function resolveFailureCaptureDir() {
    if (failureCaptureDir) return failureCaptureDir;
    if (options?.screenshotDir) {
      const resolved = path.resolve(options.screenshotDir);
      // Never place failure captures inside tempRoot which gets deleted in finally
      if (resolved === tempRoot || resolved.startsWith(`${tempRoot}${path.sep}`)) {
        failureCaptureDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'pilates-backup-failure-captures-'),
        );
      } else {
        failureCaptureDir = resolved;
      }
    } else if (options?.outputPath) {
      const baseName =
        path.basename(options.outputPath, path.extname(options.outputPath)) || 'report';
      failureCaptureDir = path.join(path.dirname(options.outputPath), `${baseName}-captures`);
    } else {
      failureCaptureDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'pilates-backup-failure-captures-'),
      );
    }
    return failureCaptureDir;
  }

  async function runStep({ id, scope, viewport, name, mode }, fn) {
    const stepStart = Date.now();
    try {
      const details = await fn();
      if (options?.injectAssertionFailure === id) {
        throw new HarnessStageError(
          'step-assertion',
          `Injected negative-control assertion failure at step ${id}`,
        );
      }
      steps.push({
        id,
        scope,
        viewport,
        name,
        mode,
        status: 'pass',
        durationMs: Date.now() - stepStart,
        details: details ?? {},
        failureCapturePath: null,
        failureCapturePreserved: false,
      });
      if (options?.stopAfterStep === id) {
        throw new StopAfterStepSignal(id);
      }
    } catch (error) {
      if (error instanceof StopAfterStepSignal) {
        throw error;
      }
      let capturePath = null;
      if (tabA) {
        try {
          const capDir = resolveFailureCaptureDir();
          capturePath = path.join(capDir, `${id}-failure.png`);
          await tabA.screenshot(capturePath);
        } catch {
          capturePath = null;
        }
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      steps.push({
        id,
        scope,
        viewport,
        name,
        mode,
        status: 'fail',
        durationMs: Date.now() - stepStart,
        stage: error instanceof HarnessStageError ? error.stage : 'step-assertion',
        error: errMsg,
        failureCapturePath: capturePath,
        failureCapturePreserved: Boolean(capturePath && fs.existsSync(capturePath)),
      });
      throw new HarnessStageError('step-assertion', errMsg);
    }
  }

  try {
    options = parseArgs(rawArgv);
    gitProvenance = computeGitProvenance(options.sourceRoot);

    if (options.prepareDistDir) {
      const prepared = buildIsolatedArtifact({
        sourceRoot: options.sourceRoot,
        outDir: options.prepareDistDir,
        gitProvenance,
      });
      return {
        prepared: true,
        distDir: options.prepareDistDir,
        sourceFingerprint: prepared.sourceFp,
        artifactFingerprint: prepared.artifactFp,
      };
    }

    if (!fs.existsSync(options.fixturePath)) {
      throw new HarnessStageError(
        'fixture-load',
        `Missing synthetic fixture file: ${options.fixturePath}`,
      );
    }
    let syntheticFixtures;
    try {
      syntheticFixtures = JSON.parse(fs.readFileSync(options.fixturePath, 'utf8'));
    } catch (err) {
      throw new HarnessStageError(
        'fixture-load',
        `Invalid JSON in fixture file (${options.fixturePath}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const importedSequenceId = syntheticFixtures?.incomingBackupV3?.data?.savedSequences?.[0]?.id;
    if (!importedSequenceId || !syntheticFixtures?.rollbackKeyFaultFixtures) {
      throw new HarnessStageError(
        'fixture-load',
        `Fixture file (${options.fixturePath}) is missing required incomingBackupV3 or rollbackKeyFaultFixtures structure`,
      );
    }

    let targetDistDir;
    if (options.noBuild) {
      buildMode = 'no-build';
      targetDistDir = options.distDir || path.join(options.sourceRoot, 'dist');
      sourceFp = computeSourceFingerprint(options.sourceRoot);
      artifactFp = computeArtifactFingerprint(targetDistDir);
      freshness = verifyArtifactFreshness({
        sourceFp,
        artifactFp,
        buildMode,
        allowStaleDist: options.allowStaleDist,
        expectedSourceSha256: options.expectedSourceSha256,
        expectedArtifactSha256: options.expectedArtifactSha256,
      });
      if (!freshness.ok) {
        throw new HarnessStageError('build-freshness', freshness.reason);
      }
    } else {
      buildMode = 'isolated-fresh-build';
      targetDistDir = isolatedDistDir;
      const built = buildIsolatedArtifact({
        sourceRoot: options.sourceRoot,
        outDir: targetDistDir,
        gitProvenance,
      });
      sourceFp = built.sourceFp;
      artifactFp = built.artifactFp;
      freshness = verifyArtifactFreshness({
        sourceFp,
        artifactFp,
        buildMode,
        allowStaleDist: false,
        expectedSourceSha256: options.expectedSourceSha256,
        expectedArtifactSha256: options.expectedArtifactSha256,
      });
      if (!freshness.ok) {
        throw new HarnessStageError('build-freshness', freshness.reason);
      }
    }

    const previewPort = await getFreePort();
    const cdpPort = await getFreePort();
    baseUrl = `http://127.0.0.1:${previewPort}/`;

    if (options.simulatePreviewHang) {
      previewProc = attachProcessErrorTracking(
        spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
          cwd: REPO_ROOT,
          stdio: 'ignore',
          detached: true,
        }),
      );
    } else {
      previewProc = attachProcessErrorTracking(
        spawn(
          'pnpm',
          [
            'exec',
            'vite',
            'preview',
            '--outDir',
            targetDistDir,
            '--host',
            '127.0.0.1',
            '--port',
            String(previewPort),
            '--strictPort',
          ],
          {
            cwd: REPO_ROOT,
            stdio: 'ignore',
            detached: true,
          },
        ),
      );
    }
    await waitForHttp(baseUrl, options.previewTimeoutMs, previewProc, 'preview-start');

    chromeProc = attachProcessErrorTracking(
      spawn(
        options.chromiumBin,
        [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          `--user-data-dir=${profileDir}`,
          `--remote-debugging-port=${cdpPort}`,
          'about:blank',
        ],
        {
          stdio: 'ignore',
          detached: true,
        },
      ),
    );

    const versionInfoJson = await waitForHttp(
      `http://127.0.0.1:${cdpPort}/json/version`,
      options.cdpTimeoutMs,
      chromeProc,
      'browser-launch',
    );
    const versionInfo = JSON.parse(versionInfoJson);
    browserVersion = versionInfo.Browser || 'Chromium';

    const targetsJson = await waitForHttp(
      `http://127.0.0.1:${cdpPort}/json/list`,
      options.cdpTimeoutMs,
      chromeProc,
      'browser-launch',
    );
    const targets = JSON.parse(targetsJson);
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) {
      throw new HarnessStageError('browser-launch', 'No page target found in headless Chromium');
    }

    tabA = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await tabA.ready();
    await tabA.send('Page.enable');
    await tabA.send('Runtime.enable');
    await tabA.send('DOM.enable');

    // =========================================================================
    // SCOPE A: 320x694 and 390x844 Full Real UI Flow
    // Session Log Creation -> JSON Export -> Preflight -> Restore -> Reload -> Rollback
    // =========================================================================
    const viewports = [
      { label: '320x694', width: 320, height: 694 },
      { label: '390x844', width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await tabA.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true,
      });

      await tabA.send('Page.navigate', { url: baseUrl });
      await sleep(900);
      await tabA.eval(`localStorage.clear(); true;`);
      await tabA.send('Page.reload', { ignoreCache: true });
      await waitForCondition(
        tabA,
        `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
        8000,
        `App ready at ${vp.label}`,
      );

      let exportedPayload = null;
      const vpBackupFile = path.join(tempFixtureDir, `synthetic-backup-${vp.label}.json`);

      await runStep(
        {
          id: `scopeA-${vp.label}-1-create-session-log`,
          scope: 'A',
          viewport: vp.label,
          name: '수업 기록 생성 (Session Log Creation via UI)',
          mode: 'real-browser',
        },
        async () => {
          const before = await readAppSnapshot(tabA, importedSequenceId);
          if (before.historyLogsCount !== 0) {
            throw new Error(`Expected initial historyLogsCount=0, got ${before.historyLogsCount}`);
          }
          await recordCompletedSessionViaUI(tabA);
          const after = await readAppSnapshot(tabA, importedSequenceId);
          if (after.historyLogsCount !== 1 || !after.latestHistoryHasProgramSnapshot) {
            throw new Error(
              `Expected 1 completed history log with programSnapshot, got ${JSON.stringify(after)}`,
            );
          }
          return {
            beforeHistoryLogsCount: before.historyLogsCount,
            afterHistoryLogsCount: after.historyLogsCount,
            latestHistoryHasProgramSnapshot: after.latestHistoryHasProgramSnapshot,
          };
        },
      );

      await runStep(
        {
          id: `scopeA-${vp.label}-2-export-backup-json`,
          scope: 'A',
          viewport: vp.label,
          name: 'JSON 내보내기 (Backup JSON Export via UI)',
          mode: 'real-browser',
        },
        async () => {
          await openSettingsModal(tabA);
          await tabA.eval(`(() => {
            window.__lastExportedBackupPromise = null;
            const origCreateObjectURL = URL.createObjectURL.bind(URL);
            URL.createObjectURL = function(blob) {
              if (blob && typeof blob.text === 'function') {
                window.__lastExportedBackupPromise = blob.text();
              }
              return origCreateObjectURL(blob);
            };
            const exportBtn = [...document.querySelectorAll('button')].find((b) =>
              b.textContent?.includes('전체 백업'),
            );
            if (!exportBtn) throw new Error('Missing 전체 백업 button');
            exportBtn.click();
          })()`);
          const exportedRaw = await tabA.eval(`window.__lastExportedBackupPromise`);
          if (!exportedRaw || typeof exportedRaw !== 'string') {
            throw new Error('Failed to capture exported JSON payload from 전체 백업');
          }
          exportedPayload = JSON.parse(exportedRaw);
          if (
            exportedPayload.format !== 'pilates-flow-atelier' ||
            exportedPayload.version !== 3 ||
            !Array.isArray(exportedPayload.data?.historyLogs) ||
            exportedPayload.data.historyLogs.length !== 1 ||
            !exportedPayload.data.historyLogs[0].programSnapshot
          ) {
            throw new Error('Exported JSON payload failed schema/snapshot verification');
          }
          return {
            format: exportedPayload.format,
            version: exportedPayload.version,
            exportedSequencesCount: exportedPayload.data.savedSequences.length,
            exportedHistoryLogsCount: exportedPayload.data.historyLogs.length,
          };
        },
      );

      await runStep(
        {
          id: `scopeA-${vp.label}-3-preflight-inspection`,
          scope: 'A',
          viewport: vp.label,
          name: '사전검사 (Read-Only Preflight Inspection)',
          mode: 'real-browser+synthetic-fixture',
        },
        async () => {
          const baseSeq = exportedPayload.data.savedSequences[0];
          const baseLog = exportedPayload.data.historyLogs[0];
          const fixtureSeq = syntheticFixtures.incomingBackupV3.data.savedSequences[0];
          const fixtureLog = syntheticFixtures.incomingBackupV3.data.historyLogs[0];
          const mergedBackup = {
            format: 'pilates-flow-atelier',
            version: 3,
            exportedAt: syntheticFixtures.incomingBackupV3.exportedAt,
            data: {
              ...exportedPayload.data,
              savedSequences: [
                {
                  ...baseSeq,
                  title: '백업 안의 중복 ID 시퀀스 (충돌 보존 대상)',
                  updatedAt: '2026-11-05T10:25:00.000Z',
                },
                ...exportedPayload.data.savedSequences.slice(1),
                {
                  ...baseSeq,
                  ...fixtureSeq,
                  steps: baseSeq.steps,
                },
              ],
              historyLogs: [
                ...exportedPayload.data.historyLogs,
                {
                  ...baseLog,
                  ...fixtureLog,
                },
              ],
            },
          };
          fs.writeFileSync(vpBackupFile, JSON.stringify(mergedBackup, null, 2));
          await selectBackupFileInSettings(tabA, vpBackupFile);
          const snap = await readAppSnapshot(tabA, importedSequenceId);
          const preflightText = await tabA.eval(
            `document.querySelector('[aria-label="복구 전 확인"]')?.innerText || ''`,
          );
          if (
            !snap.preflightVisible ||
            !snap.applyBtnVisible ||
            snap.hasImportedSeq ||
            !preflightText.includes('충돌·되돌리기 안내')
          ) {
            throw new Error(`Preflight check failed: ${JSON.stringify({ snap, preflightText })}`);
          }
          if (options.screenshotDir) {
            await tabA.screenshot(
              path.join(options.screenshotDir, `scopeA_${vp.label}_1_preflight.png`),
            );
          }
          return {
            preflightVisible: snap.preflightVisible,
            hasImportedSeqBeforeApply: snap.hasImportedSeq,
            hasConflictAndRollbackGuidance: preflightText.includes('충돌·되돌리기 안내'),
          };
        },
      );

      await runStep(
        {
          id: `scopeA-${vp.label}-4-restore-apply`,
          scope: 'A',
          viewport: vp.label,
          name: '복원 적용 (Restore Apply)',
          mode: 'real-browser+synthetic-fixture',
        },
        async () => {
          await tabA.eval(`(() => {
            const btn = [...document.querySelectorAll('button')].find((b) =>
              b.textContent?.includes('이 내용으로 복원 적용'),
            );
            if (btn) btn.click();
          })()`);
          await waitForCondition(
            tabA,
            `Boolean(document.querySelector('[data-testid="recovery-rollback-bar"]'))`,
            5000,
            'Rollback bar visible after restore',
          );
          const snap = await readAppSnapshot(tabA, importedSequenceId);
          if (
            !snap.hasImportedSeq ||
            snap.historyLogsCount !== 2 ||
            !snap.rollbackBtnVisible ||
            !snap.rollbackRawPresent
          ) {
            throw new Error(`Restore apply verification failed: ${JSON.stringify(snap)}`);
          }
          if (options.screenshotDir) {
            await tabA.screenshot(
              path.join(options.screenshotDir, `scopeA_${vp.label}_2_restored.png`),
            );
          }
          return {
            hasImportedSeq: snap.hasImportedSeq,
            historyLogsCount: snap.historyLogsCount,
            rollbackBtnVisible: snap.rollbackBtnVisible,
            rollbackPersistedInStorage: snap.rollbackRawPresent,
          };
        },
      );

      await runStep(
        {
          id: `scopeA-${vp.label}-5-page-reload`,
          scope: 'A',
          viewport: vp.label,
          name: '새로고침 후 복원·롤백 포인트 유지 (Page Reload Persistence)',
          mode: 'real-browser',
        },
        async () => {
          await tabA.send('Page.reload', { ignoreCache: true });
          await waitForCondition(
            tabA,
            `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
            8000,
            'Page reloaded',
          );
          await openSettingsModal(tabA);
          const snap = await readAppSnapshot(tabA, importedSequenceId);
          if (!snap.hasImportedSeq || snap.historyLogsCount !== 2 || !snap.rollbackBtnVisible) {
            throw new Error(`Reload persistence verification failed: ${JSON.stringify(snap)}`);
          }
          if (options.screenshotDir) {
            await tabA.screenshot(
              path.join(options.screenshotDir, `scopeA_${vp.label}_3_reloaded.png`),
            );
          }
          return {
            hasImportedSeqAfterReload: snap.hasImportedSeq,
            historyLogsCountAfterReload: snap.historyLogsCount,
            rollbackBtnVisibleAfterReload: snap.rollbackBtnVisible,
          };
        },
      );

      await runStep(
        {
          id: `scopeA-${vp.label}-6-rollback-previous-state`,
          scope: 'A',
          viewport: vp.label,
          name: '이전 상태로 되돌리기 (Rollback to Pre-Restore State)',
          mode: 'real-browser',
        },
        async () => {
          await tabA.eval(`(() => {
            const btn = [...document.querySelectorAll('button')].find((b) =>
              b.textContent?.includes('복원 이전 상태로 되돌리기'),
            );
            if (btn) btn.click();
          })()`);
          await waitForCondition(
            tabA,
            `!document.querySelector('[data-testid="recovery-rollback-bar"]')`,
            5000,
            'Rollback bar dismissed after rollback',
          );
          const snap = await readAppSnapshot(tabA, importedSequenceId);
          if (
            snap.hasImportedSeq ||
            snap.historyLogsCount !== 1 ||
            snap.rollbackBtnVisible ||
            snap.rollbackRawPresent ||
            !snap.statusTexts.some((t) => t.includes('백업 복원 이전 상태로 되돌렸습니다.'))
          ) {
            throw new Error(`Rollback verification failed: ${JSON.stringify(snap)}`);
          }
          if (options.screenshotDir) {
            await tabA.screenshot(
              path.join(options.screenshotDir, `scopeA_${vp.label}_4_rolled_back.png`),
            );
          }
          return {
            hasImportedSeqAfterRollback: snap.hasImportedSeq,
            preservedPreRestoreHistoryLogsCount: snap.historyLogsCount,
            rollbackBtnVisibleAfterRollback: snap.rollbackBtnVisible,
            statusTexts: snap.statusTexts,
          };
        },
      );
    }

    // =========================================================================
    // SCOPE B: Multi-Tab Real StorageEvent, Post-Restore New Record / Reload /
    // Double Rollback Stale-State Defense, and Rollback Key Fault Injection
    // =========================================================================
    const scopeBBackupFile = path.join(tempFixtureDir, 'synthetic-backup-390x844.json');

    // Create a second independent tab on the same origin sharing the same browser context
    const { targetId: tabBTargetId } = await tabA.send('Target.createTarget', {
      url: baseUrl,
    });
    const updatedTargetsJson = await waitForHttp(`http://127.0.0.1:${cdpPort}/json/list`, 5000);
    const updatedTargets = JSON.parse(updatedTargetsJson);
    const tabBTarget = updatedTargets.find((t) => t.id === tabBTargetId);
    if (!tabBTarget) {
      throw new Error('Failed to attach to second browser tab (Tab B)');
    }
    tabB = new CDPClient(tabBTarget.webSocketDebuggerUrl);
    await tabB.ready();
    await tabB.send('Page.enable');
    await tabB.send('Runtime.enable');
    await tabB.send('DOM.enable');
    await waitForCondition(
      tabB,
      `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
      8000,
      'Tab B loaded on same origin',
    );

    await runStep(
      {
        id: 'scopeB-1-multi-tab-storage-event-during-preflight',
        scope: 'B',
        viewport: '390x844',
        name: '동일 origin 두 독립 탭 실제 storage 이벤트 방어 (Cross-Tab StorageEvent During Preflight)',
        mode: 'real-browser',
      },
      async () => {
        await selectBackupFileInSettings(tabA, scopeBBackupFile);
        const beforeEvent = await readAppSnapshot(tabA, importedSequenceId);
        if (beforeEvent.applyBtnDisabled !== false) {
          throw new Error('Expected Apply button to be enabled before cross-tab storage change');
        }

        // In Tab B (independent tab, same origin), mutate localStorage to trigger a real native StorageEvent in Tab A
        await tabB.eval(`(() => {
          const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
          const parsed = JSON.parse(raw);
          const state = parsed.state ?? parsed;
          state.savedSequences = [
            ...(state.savedSequences || []),
            {
              ...(state.savedSequences[0] || {}),
              id: 'seq-tab-b-preflight-change',
              title: '탭 B에서 추가한 시퀀스',
            },
          ];
          localStorage.setItem('pilates-flow-atelier-storage-v3', JSON.stringify(parsed));
          return true;
        })()`);

        await waitForCondition(
          tabA,
          `Boolean([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('현재 자료로 다시 검토')))`,
          5000,
          'Tab A received real cross-tab StorageEvent and showed 현재 자료로 다시 검토',
        );

        const afterEvent = await readAppSnapshot(tabA, importedSequenceId);
        if (
          afterEvent.applyBtnDisabled !== true ||
          !afterEvent.reexamineBtnVisible ||
          !afterEvent.statusTexts.some((t) =>
            t.includes('다른 탭'),
          )
        ) {
          throw new Error(
            `Tab A failed to block apply after Tab B StorageEvent: ${JSON.stringify(afterEvent)}`,
          );
        }

        // Clean up Tab B's extra sequence and cancel preflight in Tab A
        await tabB.eval(`(() => {
          const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
          const parsed = JSON.parse(raw);
          const state = parsed.state ?? parsed;
          state.savedSequences = (state.savedSequences || []).filter(
            (s) => s.id !== 'seq-tab-b-preflight-change',
          );
          localStorage.setItem('pilates-flow-atelier-storage-v3', JSON.stringify(parsed));
        })()`);
        await waitForCondition(
          tabA,
          `!localStorage.getItem('pilates-flow-atelier-storage-v3')?.includes('seq-tab-b-preflight-change')`,
          5000,
          'Tab A received cleanup localStorage update from Tab B',
        );
        await tabA.eval(`(() => {
          const cancelBtn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 취소'),
          );
          if (cancelBtn) cancelBtn.click();
        })()`);
        return {
          applyBtnDisabledOnCrossTabWrite: afterEvent.applyBtnDisabled,
          reexamineBtnVisible: afterEvent.reexamineBtnVisible,
          alertMessages: afterEvent.statusTexts,
        };
      },
    );

    await runStep(
      {
        id: 'scopeB-2-multi-tab-storage-change-blocks-stale-rollback',
        scope: 'B',
        viewport: '390x844',
        name: '복원 후 다른 탭 변경 시 오래된 롤백 차단 (Cross-Tab Change Blocks Stale Rollback)',
        mode: 'real-browser',
      },
      async () => {
        await selectBackupFileInSettings(tabA, scopeBBackupFile);
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('이 내용으로 복원 적용'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('[data-testid="recovery-rollback-bar"]'))`,
          5000,
          'Rollback bar visible in Tab A',
        );

        // Wait for Tab B to see Tab A's restore before Tab B mutates storage
        await waitForCondition(
          tabB,
          `Boolean(localStorage.getItem('pilates-flow-atelier-storage-v3')?.includes(${JSON.stringify(importedSequenceId)}))`,
          5000,
          'Tab B received Tab A restore in localStorage',
        );

        // Tab B writes a new sequence to localStorage after Tab A's restore
        await tabB.eval(`(() => {
          const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
          const parsed = JSON.parse(raw);
          const state = parsed.state ?? parsed;
          state.savedSequences = [
            ...(state.savedSequences || []),
            {
              ...(state.savedSequences[0] || {}),
              id: 'seq-tab-b-post-restore',
              title: '복원 후 탭 B에서 저장한 수업',
            },
          ];
          localStorage.setItem('pilates-flow-atelier-storage-v3', JSON.stringify(parsed));
          return true;
        })()`);

        await waitForCondition(
          tabA,
          `Boolean(localStorage.getItem('pilates-flow-atelier-storage-v3')?.includes('seq-tab-b-post-restore'))`,
          5000,
          'Tab A received Tab B post-restore localStorage update',
        );

        // Tab A attempts to roll back — must be blocked because Tab B modified storage
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 이전 상태로 되돌리기'),
          );
          if (btn) btn.click();
        })()`);
        await sleep(200);

        const snap = await readAppSnapshot(tabA, importedSequenceId);
        const tabBSeqPreserved = await tabB.eval(`(() => {
          const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
          const parsed = JSON.parse(raw);
          const state = parsed.state ?? parsed;
          return (state.savedSequences || []).some((s) => s.id === 'seq-tab-b-post-restore');
        })()`);

        if (
          !tabBSeqPreserved ||
          !snap.statusTexts.some((t) =>
            t.includes('다른 탭'),
          )
        ) {
          throw new Error(
            `Cross-tab stale rollback was not blocked: ${JSON.stringify({
              snap,
              tabBSeqPreserved,
            })}`,
          );
        }

        return {
          tabBDataPreserved: tabBSeqPreserved,
          statusTexts: snap.statusTexts,
        };
      },
    );

    await runStep(
      {
        id: 'scopeB-3-post-restore-new-record-reload-and-double-rollback',
        scope: 'B',
        viewport: '390x844',
        name: '복원 후 새 기록·새로고침·두 번 롤백 stale-state 방어 (Post-Restore New Record, Reload, & Double Rollback Defense)',
        mode: 'real-browser',
      },
      async () => {
        // Reset to clean state and create 1 initial session log
        await tabA.eval(`localStorage.clear(); true;`);
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Tab A reset',
        );
        await recordCompletedSessionViaUI(tabA);

        // Apply backup restore in Tab A
        await selectBackupFileInSettings(tabA, scopeBBackupFile);
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('이 내용으로 복원 적용'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('[data-testid="recovery-rollback-bar"]'))`,
          5000,
          'Rollback bar visible after restore',
        );
        const beforeNewLogSnap = await readAppSnapshot(tabA, importedSequenceId);
        const expectedCountAfterNewLog = beforeNewLogSnap.historyLogsCount + 1;

        // 1) Create a NEW session log after restore in Tab A via real UI
        await closeOpenDialogs(tabA);
        await tabA.eval(`(() => {
          const binderBtn = [...document.querySelectorAll('button')].find(
            (el) => el.textContent && el.textContent.trim() === '내 수업',
          );
          if (binderBtn) binderBtn.click();
        })()`);
        await waitForCondition(
          tabA,
          `Boolean([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('이미 진행한 수업 기록하기')))`,
          5000,
          'Binder open for post-restore session log',
        );
        await tabA.eval(`(() => {
          const logBtns = [...document.querySelectorAll('button')].filter((b) =>
            b.textContent?.includes('이미 진행한 수업 기록하기'),
          );
          // Click the last log button (for the imported sequence) so it is a distinct completed session
          const targetBtn = logBtns[logBtns.length - 1];
          if (targetBtn) targetBtn.click();
        })()`);
        await waitForCondition(
          tabA,
          `Boolean([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('수업 기록 저장')))`,
          5000,
          'LogSessionModal open for imported sequence',
        );
        await tabA.eval(`(() => {
          const dateInput = document.querySelector('input[type="date"]');
          if (dateInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value',
            )?.set;
            nativeSetter?.call(dateInput, '2026-11-04');
            dateInput.dispatchEvent(new Event('input', { bubbles: true }));
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const saveBtn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('수업 기록 저장'),
          );
          if (saveBtn) saveBtn.click();
        })()`);
        await sleep(350);

        const afterNewLog = await readAppSnapshot(tabA, importedSequenceId);
        if (afterNewLog.historyLogsCount !== expectedCountAfterNewLog) {
          throw new Error(
            `Expected ${expectedCountAfterNewLog} history logs after post-restore session log, got ${afterNewLog.historyLogsCount}`,
          );
        }

        // Open Settings and click Rollback — must be blocked because a new session log was added after restore
        await openSettingsModal(tabA);
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 이전 상태로 되돌리기'),
          );
          if (btn) btn.click();
        })()`);
        await sleep(200);

        const afterBlockedRollback = await readAppSnapshot(tabA, importedSequenceId);
        if (
          afterBlockedRollback.historyLogsCount !== expectedCountAfterNewLog ||
          !afterBlockedRollback.statusTexts.some((t) =>
            t.includes('복원 이후 추가 변경이 발생해 자동 되돌리기를 중단했습니다'),
          )
        ) {
          throw new Error(
            `Post-restore new session record was not protected from rollback: ${JSON.stringify(afterBlockedRollback)}`,
          );
        }

        // 2) Reload page — stale rollback button must not be shown after reload when state has diverged
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Reloaded after post-restore modification',
        );
        await openSettingsModal(tabA);
        const afterReloadStaleCheck = await readAppSnapshot(tabA, importedSequenceId);
        if (
          afterReloadStaleCheck.rollbackBtnVisible ||
          afterReloadStaleCheck.historyLogsCount !== expectedCountAfterNewLog
        ) {
          throw new Error(
            `Expected stale rollback button to be hidden after reload: ${JSON.stringify(afterReloadStaleCheck)}`,
          );
        }

        // 3) Double rollback test across Tab A and Tab B
        await tabA.eval(`localStorage.clear(); true;`);
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Tab A clean for double rollback test',
        );
        await selectBackupFileInSettings(tabA, scopeBBackupFile);
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('이 내용으로 복원 적용'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('[data-testid="recovery-rollback-bar"]'))`,
          5000,
          'Rollback bar visible in Tab A for double-rollback test',
        );
        await waitForCondition(
          tabB,
          `Boolean(localStorage.getItem('pilates-flow-backup-rollback-v1'))`,
          5000,
          'Tab B received rollback key in localStorage',
        );

        // Reload Tab B and open Settings so Tab B ALSO hydrates the rollback button from localStorage
        await tabB.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabB,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Tab B reloaded with rollback point',
        );
        await openSettingsModal(tabB);
        const tabBBefore = await readAppSnapshot(tabB, importedSequenceId);
        if (!tabBBefore.rollbackBtnVisible) {
          throw new Error('Expected Tab B to hydrate rollback button before Tab A rolls back');
        }

        // First rollback in Tab A -> succeeds and removes rollback button in Tab A
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 이전 상태로 되돌리기'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `!document.querySelector('[data-testid="recovery-rollback-bar"]')`,
          5000,
          'First rollback in Tab A succeeded',
        );
        const tabAAfterFirstRollback = await readAppSnapshot(tabA, importedSequenceId);
        await waitForCondition(
          tabB,
          `!localStorage.getItem('pilates-flow-backup-rollback-v1')`,
          5000,
          'Tab B received rollback key removal from Tab A',
        );

        // Second rollback attempt in Tab B (stale rollback button still mounted in Tab B) -> must be blocked
        await tabB.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 이전 상태로 되돌리기'),
          );
          if (btn) btn.click();
        })()`);
        await sleep(200);
        const tabBAfterSecondRollback = await readAppSnapshot(tabB, importedSequenceId);
        if (
          !tabBAfterSecondRollback.statusTexts.some(
            (t) =>
              t.includes('되돌릴 수 있는 최근 백업 복원 기록이 없습니다') ||
              t.includes('다른 탭'),
          )
        ) {
          throw new Error(
            `Second rollback in Tab B did not report blocked status: ${JSON.stringify(tabBAfterSecondRollback)}`,
          );
        }

        return {
          postRestoreNewRecordHistoryLogsCount: afterBlockedRollback.historyLogsCount,
          staleRollbackHiddenAfterReload: !afterReloadStaleCheck.rollbackBtnVisible,
          firstRollbackRemovedImportedSeq: !tabAAfterFirstRollback.hasImportedSeq,
          secondRollbackBlockedStatus: tabBAfterSecondRollback.statusTexts,
        };
      },
    );

    await runStep(
      {
        id: 'scopeB-4-rollback-key-synthetic-fault-fixtures',
        scope: 'B',
        viewport: '390x844',
        name: '새 롤백 키 손상 JSON·구버전(v0)·미지원 버전(v99)·부분 누락 검증 (Rollback Key Synthetic Fault Fixtures)',
        mode: 'real-browser+synthetic-fixture',
      },
      async () => {
        // Establish a clean post-restore state and capture its valid rollback payload
        await tabA.eval(`localStorage.clear(); true;`);
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Tab A clean for rollback key fixture tests',
        );
        await selectBackupFileInSettings(tabA, scopeBBackupFile);
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('이 내용으로 복원 적용'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('[data-testid="recovery-rollback-bar"]'))`,
          5000,
          'Valid rollback payload created',
        );
        const validRollbackRaw = await tabA.eval(
          `localStorage.getItem('pilates-flow-backup-rollback-v1')`,
        );
        const validRollbackObj = JSON.parse(validRollbackRaw);
        const faultFixtures = syntheticFixtures.rollbackKeyFaultFixtures;

        // 1) Corrupted JSON in pilates-flow-backup-rollback-v1
        await tabA.eval(
          `localStorage.setItem('pilates-flow-backup-rollback-v1', ${JSON.stringify(faultFixtures.corruptedJsonRaw)})`,
        );
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Reloaded with corrupted rollback JSON',
        );
        await openSettingsModal(tabA);
        const corruptedSnap = await readAppSnapshot(tabA, importedSequenceId);
        if (corruptedSnap.rollbackBtnVisible || !corruptedSnap.hasImportedSeq) {
          throw new Error(`Corrupted rollback JSON check failed: ${JSON.stringify(corruptedSnap)}`);
        }

        // 2) Unsupported version 99 in pilates-flow-backup-rollback-v1
        const unsupportedPayload = {
          ...validRollbackObj,
          ...faultFixtures.unsupportedVersion99Template,
        };
        await tabA.eval(
          `localStorage.setItem('pilates-flow-backup-rollback-v1', ${JSON.stringify(JSON.stringify(unsupportedPayload))})`,
        );
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Reloaded with unsupported v99 rollback payload',
        );
        await openSettingsModal(tabA);
        const unsupportedSnap = await readAppSnapshot(tabA, importedSequenceId);
        if (unsupportedSnap.rollbackBtnVisible || !unsupportedSnap.hasImportedSeq) {
          throw new Error(
            `Unsupported v99 rollback payload check failed: ${JSON.stringify(unsupportedSnap)}`,
          );
        }

        // 3) Invalid preRestoreState shape in pilates-flow-backup-rollback-v1
        const invalidShapePayload = {
          ...validRollbackObj,
          ...faultFixtures.invalidPreRestoreShapeTemplate,
        };
        await tabA.eval(
          `localStorage.setItem('pilates-flow-backup-rollback-v1', ${JSON.stringify(JSON.stringify(invalidShapePayload))})`,
        );
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Reloaded with invalid preRestoreState shape',
        );
        await openSettingsModal(tabA);
        const invalidShapeSnap = await readAppSnapshot(tabA, importedSequenceId);
        if (invalidShapeSnap.rollbackBtnVisible || !invalidShapeSnap.hasImportedSeq) {
          throw new Error(
            `Invalid preRestoreState shape check failed: ${JSON.stringify(invalidShapeSnap)}`,
          );
        }

        // 4) Legacy version 0 in pilates-flow-backup-rollback-v1 -> valid rollback point is preserved and rolls back!
        const legacyV0Payload = {
          ...validRollbackObj,
          ...faultFixtures.legacyVersion0Template,
        };
        await tabA.eval(
          `localStorage.setItem('pilates-flow-backup-rollback-v1', ${JSON.stringify(JSON.stringify(legacyV0Payload))})`,
        );
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Reloaded with legacy v0 rollback payload',
        );
        await openSettingsModal(tabA);
        const legacyBeforeClick = await readAppSnapshot(tabA, importedSequenceId);
        if (!legacyBeforeClick.rollbackBtnVisible) {
          throw new Error('Legacy v0 valid rollback point was lost on reload');
        }
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 이전 상태로 되돌리기'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `!document.querySelector('[data-testid="recovery-rollback-bar"]')`,
          5000,
          'Legacy v0 rollback completed',
        );
        const legacyAfterClick = await readAppSnapshot(tabA, importedSequenceId);
        if (legacyAfterClick.hasImportedSeq || legacyAfterClick.rollbackBtnVisible) {
          throw new Error(`Legacy v0 rollback execution failed: ${JSON.stringify(legacyAfterClick)}`);
        }

        return {
          corruptedJsonIgnoredSafely: !corruptedSnap.rollbackBtnVisible,
          unsupportedV99IgnoredSafely: !unsupportedSnap.rollbackBtnVisible,
          invalidShapeIgnoredSafely: !invalidShapeSnap.rollbackBtnVisible,
          legacyV0HydratedAndRolledBack:
            legacyBeforeClick.rollbackBtnVisible && !legacyAfterClick.hasImportedSeq,
        };
      },
    );

    await runStep(
      {
        id: 'scopeB-5-rollback-write-failure-mock-fault-injection',
        scope: 'B',
        viewport: '390x844',
        name: '롤백 키 및 메인 저장소 쓰기 실패(QuotaExceededError) 주입 시 원본·유효 롤백 포인트 보존 (Mocked Write Fault Injection)',
        mode: 'real-browser+mock-injected',
      },
      async () => {
        await tabA.eval(`localStorage.clear(); true;`);
        await tabA.send('Page.reload', { ignoreCache: true });
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('button[aria-label="데이터 백업과 사용 안내"]'))`,
          8000,
          'Tab A clean for write fault injection test',
        );

        // 1) Inject QuotaExceededError specifically on writing pilates-flow-backup-rollback-v1 during restore
        await tabA.eval(`(() => {
          window.__origSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function(key, value) {
            if (key === 'pilates-flow-backup-rollback-v1') {
              throw new DOMException('QuotaExceededError', 'QuotaExceededError');
            }
            return window.__origSetItem.call(this, key, value);
          };
        })()`);

        await selectBackupFileInSettings(tabA, scopeBBackupFile);
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('이 내용으로 복원 적용'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `Boolean(document.querySelector('[data-testid="recovery-rollback-bar"]'))`,
          5000,
          'In-memory rollback bar still visible despite rollback key QuotaExceededError',
        );
        const afterRollbackKeyQuotaFail = await readAppSnapshot(tabA, importedSequenceId);
        if (
          !afterRollbackKeyQuotaFail.hasImportedSeq ||
          afterRollbackKeyQuotaFail.rollbackRawPresent ||
          !afterRollbackKeyQuotaFail.rollbackBtnVisible
        ) {
          throw new Error(
            `Expected in-memory rollback point to survive rollback key write failure: ${JSON.stringify(afterRollbackKeyQuotaFail)}`,
          );
        }

        // 2) Inject QuotaExceededError on main storage key during rollback click -> rollback point must NOT be lost!
        await tabA.eval(`(() => {
          Storage.prototype.setItem = function(key, value) {
            if (key === 'pilates-flow-atelier-storage-v3') {
              throw new DOMException('QuotaExceededError', 'QuotaExceededError');
            }
            return window.__origSetItem.call(this, key, value);
          };
        })()`);

        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 이전 상태로 되돌리기'),
          );
          if (btn) btn.click();
        })()`);
        await sleep(200);
        const afterMainQuotaFailOnRollback = await readAppSnapshot(tabA, importedSequenceId);
        if (!afterMainQuotaFailOnRollback.rollbackBtnVisible) {
          throw new Error(
            'Valid rollback point was lost when main storage write failed during rollback',
          );
        }

        // 3) Restore normal Storage.prototype.setItem and retry rollback -> must succeed!
        await tabA.eval(`(() => {
          if (window.__origSetItem) {
            Storage.prototype.setItem = window.__origSetItem;
            delete window.__origSetItem;
          }
        })()`);
        await tabA.eval(`(() => {
          const btn = [...document.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('복원 이전 상태로 되돌리기'),
          );
          if (btn) btn.click();
        })()`);
        await waitForCondition(
          tabA,
          `!document.querySelector('[data-testid="recovery-rollback-bar"]')`,
          5000,
          'Rollback retry succeeded after clearing QuotaExceededError fault',
        );
        const afterRetrySuccess = await readAppSnapshot(tabA, importedSequenceId);
        if (afterRetrySuccess.hasImportedSeq || afterRetrySuccess.rollbackBtnVisible) {
          throw new Error(
            `Rollback retry after write fault failed: ${JSON.stringify(afterRetrySuccess)}`,
          );
        }

        return {
          inMemoryRollbackSurvivedRollbackKeyQuotaError:
            afterRollbackKeyQuotaFail.rollbackBtnVisible &&
            !afterRollbackKeyQuotaFail.rollbackRawPresent,
          validRollbackPointPreservedOnMainStorageQuotaError:
            afterMainQuotaFailOnRollback.rollbackBtnVisible,
          retryRollbackSucceededAfterFaultCleared: !afterRetrySuccess.hasImportedSeq,
        };
      },
    );
  } catch (error) {
    if (error instanceof StopAfterStepSignal) {
      stoppedEarlyAfterStep = error.stepId;
    } else {
      process.exitCode = interruptedBySignal
        ? interruptedBySignal === 'SIGINT'
          ? 130
          : 143
        : 1;
      failureStage =
        failureStage || (error instanceof HarnessStageError ? error.stage : 'unexpected-error');
      failureReason =
        failureReason || (error instanceof Error ? error.message : String(error));
      console.error('[verify-backup-recovery-browser] Regression failure:', error);
    }
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);

    if (tabB) tabB.close();
    if (tabA) tabA.close();

    const previewPid = previewProc?.pid ?? null;
    const chromePid = chromeProc?.pid ?? null;

    const browserProcessCleanedUp = await terminateOwnedProcess(chromeProc);
    const previewProcessCleanedUp = await terminateOwnedProcess(previewProc);

    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
    const ephemeralProfileCleanedUp = !fs.existsSync(tempRoot);

    for (const step of steps) {
      if (step.failureCapturePath) {
        const exists = fs.existsSync(step.failureCapturePath);
        step.failureCapturePreserved = exists;
        if (!exists) {
          failureStage = failureStage || 'capture-preservation';
          failureReason =
            failureReason ||
            `Failure capture was deleted or missing before report write: ${step.failureCapturePath}`;
          process.exitCode = 1;
        }
      } else {
        step.failureCapturePreserved = false;
      }
    }

    const sharedDistAfter = computeArtifactFingerprint(sharedDistPath);
    const sharedDistUntouched =
      sharedDistBefore.exists === sharedDistAfter.exists &&
      sharedDistBefore.sha256 === sharedDistAfter.sha256 &&
      sharedDistBefore.indexMtimeMs === sharedDistAfter.indexMtimeMs;

    const completedAtIso = new Date().toISOString();
    const durationMs = Date.now() - startedAtMs;
    const passed = steps.filter((s) => s.status === 'pass').length;
    const failed = steps.filter((s) => s.status === 'fail').length;
    const skipped = steps.filter((s) => s.status === 'skip').length;

    if (!options?.prepareDistDir) {
      const hasFailure = Boolean(
        failureStage || interruptedBySignal || failed > 0 || passed === 0,
      );
      if (hasFailure && !failureStage) {
        failureStage = failed > 0 ? 'step-assertion' : 'no-steps-executed';
      }
      if (hasFailure) {
        process.exitCode = process.exitCode || 1;
      }

      const report = {
        harness: 'verify-backup-recovery-browser',
        status: hasFailure ? 'fail' : 'pass',
        failureStage: hasFailure ? failureStage : null,
        failureReason: hasFailure ? failureReason : null,
        interruptedBySignal,
        stoppedEarlyAfterStep,
        browserVersion,
        startedAt: startedAtIso,
        completedAt: completedAtIso,
        durationMs,
        provenance: {
          branch: gitProvenance.branch,
          headCommit: gitProvenance.headCommit,
          headShort: gitProvenance.headShort,
          dirty: gitProvenance.dirty,
          dirtyFileCount: gitProvenance.dirtyFileCount,
          inspectedAt: gitProvenance.inspectedAt,
          buildMode,
          sourceFingerprint: sourceFp
            ? {
                sha256: sourceFp.sha256,
                fileCount: sourceFp.fileCount,
                totalBytes: sourceFp.totalBytes,
                newestMtimeIso: sourceFp.newestMtimeIso,
                computedAt: sourceFp.computedAt,
              }
            : null,
          artifactFingerprint: artifactFp
            ? {
                exists: artifactFp.exists,
                validBundle: artifactFp.validBundle,
                sha256: artifactFp.sha256,
                fileCount: artifactFp.fileCount,
                totalBytes: artifactFp.totalBytes,
                indexMtimeIso: artifactFp.indexMtimeIso,
                newestMtimeIso: artifactFp.newestMtimeIso,
                embeddedSourceSha256: artifactFp.embeddedSourceSha256,
                computedAt: artifactFp.computedAt,
              }
            : null,
          freshness,
        },
        isolation: {
          ephemeralPreviewOrigin: baseUrl,
          ephemeralProfileCleanedUp,
          previewProcessCleanedUp,
          browserProcessCleanedUp,
          ownedPids: {
            previewPid,
            chromePid,
          },
          usedUserProfile: false,
          usedProductionData: false,
          sharedDistUntouched,
        },
        summary: {
          total: steps.length,
          passed,
          failed,
          skipped,
        },
        steps,
        outputWriteError: null,
      };

      if (options?.outputPath) {
        try {
          fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
          fs.writeFileSync(options.outputPath, JSON.stringify(report, null, 2));
        } catch (writeErr) {
          const writeMsg = writeErr instanceof Error ? writeErr.message : String(writeErr);
          report.status = 'fail';
          report.failureStage = report.failureStage || 'report-output-write';
          report.failureReason =
            report.failureReason ||
            `Failed to write report output to ${options.outputPath}: ${writeMsg}`;
          report.outputWriteError = writeMsg;
          process.exitCode = 1;
        }
      }

      console.log(JSON.stringify(report, null, 2));
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await runHarness(process.argv.slice(2));
}
