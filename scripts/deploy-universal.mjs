#!/usr/bin/env node
/**
 * Canonical Production Deployment Orchestrator (`scripts/deploy-universal.mjs`)
 *
 * Single Canonical Target:
 *   - Branch: `main` (`origin/main`)
 *   - Hosting: Firebase Hosting (`pilates-flow-atelier` on project `deskcloud-fleet-auth`)
 *   - Live URL: https://pilates-flow-atelier.web.app
 *
 * Entry Modes:
 *   node scripts/deploy-universal.mjs --check-env     # Inspect config, git, dist & auth readiness (never prints secrets)
 *   node scripts/deploy-universal.mjs --verify-live   # Strictly verify live bundle hash, SW & all 4 Atelier V2 3D assets
 *   node scripts/deploy-universal.mjs                 # Lock, gate, build, snapshot, deploy to Firebase Hosting & verify live
 *   node scripts/deploy-universal.mjs --rollback      # Restore last verified release snapshot & redeploy to Firebase Hosting
 *   node scripts/deploy-universal.mjs --skip-build    # Re-verify existing dist/ integrity, deploy & verify live
 */
import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAtelierV2DistAssets, verifyPwaBuild } from './check-pwa-build.mjs';

const MODULE_PATH = realpathSync(fileURLToPath(import.meta.url));
export const ROOT = resolve(dirname(MODULE_PATH), '..');
export const LIVE_ORIGIN = 'https://pilates-flow-atelier.web.app';
export const FIREBASE_SITE = 'pilates-flow-atelier';
export const FIREBASE_PROJECT = 'deskcloud-fleet-auth';
export const FIREBASE_TOOLS_VERSION = '13.29.1';
export const FIREBASE_TOOLS_PACKAGE = `firebase-tools@${FIREBASE_TOOLS_VERSION}`;
export const ATELIER_V2_ASSET_PATHS = [
  '/images/atelier-v2/reformer-studio-3d.png',
  '/images/atelier-v2/cadillac-studio-3d.png',
  '/images/atelier-v2/chair-studio-3d.png',
  '/images/atelier-v2/barrel-studio-3d.png',
];
export const ALLOWED_CLI_FLAGS = new Set([
  '--check-env',
  '--verify-live',
  '--rollback',
  '--skip-build',
  '--auto-rollback',
  '--allow-dirty',
  '--allow-ambient-auth',
  '--allow-live-drift',
  '--help',
]);
const MAX_RELEASE_SNAPSHOTS = 5;

export function validateCliArgs(rawArgs = process.argv.slice(2)) {
  const unknown = rawArgs.filter((arg) => !ALLOWED_CLI_FLAGS.has(arg));
  if (unknown.length > 0) {
    throw new Error(
      `[deploy] Unsupported CLI flag(s): ${unknown.join(', ')}. Allowed flags: ${[...ALLOWED_CLI_FLAGS].join(', ')}`,
    );
  }
  const parsed = new Set(rawArgs);
  const modeCount =
    Number(parsed.has('--check-env')) +
    Number(parsed.has('--verify-live')) +
    Number(parsed.has('--rollback'));
  if (modeCount > 1) {
    throw new Error(
      '[deploy] Conflicting modes: combine only one of --check-env, --verify-live, or --rollback.',
    );
  }
  return parsed;
}

export function parseEnvFileSafe(filePath) {
  const map = {};
  if (!existsSync(filePath)) return map;
  try {
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && val) map[key] = val;
    }
  } catch {
    // Ignore unreadable files in restricted environments
  }
  return map;
}

export function discoverCandidateBinDirs(rootDir = ROOT, currentHome = homedir()) {
  const dirs = [
    join(rootDir, 'node_modules', '.bin'),
    join(currentHome, '.local', 'node', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ];

  const nvmVersionsDir = join(currentHome, '.nvm', 'versions', 'node');
  try {
    if (existsSync(nvmVersionsDir)) {
      const versions = readdirSync(nvmVersionsDir).sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true }),
      );
      for (const v of versions) {
        dirs.push(join(nvmVersionsDir, v, 'bin'));
      }
    }
  } catch {
    // Skip when ~/.nvm is outside accessible scope
  }

  return dirs.filter((dir) => {
    try {
      return existsSync(dir);
    } catch {
      return false;
    }
  });
}

export function buildAugmentedEnv(extraEnv = {}, rootDir = ROOT, baseEnv = process.env) {
  const currentHome = baseEnv.HOME || homedir();
  const candidateDirs = discoverCandidateBinDirs(rootDir, currentHome);
  const currentPath = baseEnv.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
  const mergedPath = [...new Set([...candidateDirs, ...currentPath.split(':')])].join(':');
  return {
    ...baseEnv,
    PATH: mergedPath,
    ...extraEnv,
  };
}

export function resolveExecutable(binName, env) {
  const searchDirs = (env.PATH || '').split(':').filter(Boolean);
  for (const dir of searchDirs) {
    const full = join(dir, binName);
    try {
      if (existsSync(full)) {
        execFileSync(full, ['--version'], { env, stdio: 'ignore' });
        return full;
      }
    } catch {
      // Skip inaccessible binary
    }
  }
  return null;
}

/**
 * Resolve Firebase authentication without escaping sandbox $HOME or exposing tokens on CLI argv.
 */
export function resolveFirebaseAuth({
  rootDir = ROOT,
  env = process.env,
  homeDir = homedir(),
  isInteractive = Boolean(process.stdin?.isTTY && process.stdout?.isTTY),
  allowAmbientAuth = false,
} = {}) {
  const deployEnv = parseEnvFileSafe(join(rootDir, '.env.deploy.local'));

  const gacFromEnv =
    env.GOOGLE_APPLICATION_CREDENTIALS || deployEnv.GOOGLE_APPLICATION_CREDENTIALS || '';
  if (gacFromEnv && existsSync(gacFromEnv)) {
    return {
      ready: true,
      source: 'file:GOOGLE_APPLICATION_CREDENTIALS',
      extraArgs: ['--non-interactive'],
      extraEnv: { GOOGLE_APPLICATION_CREDENTIALS: gacFromEnv },
    };
  }

  const tokenFromEnv = env.FIREBASE_TOKEN || deployEnv.FIREBASE_TOKEN || '';
  if (tokenFromEnv) {
    return {
      ready: true,
      source: env.FIREBASE_TOKEN ? 'env:FIREBASE_TOKEN' : 'file:.env.deploy.local(FIREBASE_TOKEN)',
      extraArgs: ['--non-interactive'],
      extraEnv: { FIREBASE_TOKEN: tokenFromEnv },
    };
  }

  const xdgConfigHome = env.XDG_CONFIG_HOME || join(homeDir, '.config');
  const homeFirebaseToolsJson = join(xdgConfigHome, 'configstore', 'firebase-tools.json');
  try {
    if (existsSync(homeFirebaseToolsJson)) {
      if (!isInteractive && !allowAmbientAuth) {
        return {
          ready: false,
          source: 'ambient-blocked-non-interactive',
          extraArgs: [],
          extraEnv: {},
        };
      }
      return {
        ready: true,
        source: 'home:configstore/firebase-tools.json',
        extraArgs: [],
        extraEnv: {},
      };
    }
  } catch {
    // Skip when configstore is outside accessible scope
  }

  return {
    ready: false,
    source: 'none',
    extraArgs: [],
    extraEnv: {},
  };
}

export function inspectGitState(rootDir = ROOT, env = process.env) {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: rootDir,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const headCommit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: rootDir,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const porcelain = execFileSync('git', ['status', '--porcelain'], {
      cwd: rootDir,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return {
      gitAvailable: true,
      branch,
      headCommit,
      onCanonicalBranch: branch === 'main',
      workingTreeClean: porcelain.length === 0,
    };
  } catch {
    return {
      gitAvailable: false,
      branch: null,
      headCommit: null,
      onCanonicalBranch: false,
      workingTreeClean: false,
    };
  }
}

export function extractEntryScriptAsset(html) {
  const match = html.match(/(?:\.|)\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  return match ? `/assets/${match[1]}` : null;
}

export function extractEntryCssAsset(html) {
  const match = html.match(/(?:\.|)\/assets\/(index-[A-Za-z0-9_-]+\.css)/);
  return match ? `/assets/${match[1]}` : null;
}

export function inspectLocalDistIntegrity(rootDir = ROOT) {
  const indexHtmlPath = join(rootDir, 'dist', 'index.html');
  const distBuilt = existsSync(indexHtmlPath);
  const missingV2Assets = ATELIER_V2_ASSET_PATHS.filter(
    (assetPath) => !existsSync(join(rootDir, 'dist', assetPath.slice(1))),
  );
  const distHasAtelierV2Assets = distBuilt && missingV2Assets.length === 0;

  let entryJs = null;
  let entryBundleReferencesV2 = false;
  if (distBuilt) {
    try {
      const html = readFileSync(indexHtmlPath, 'utf8');
      entryJs = extractEntryScriptAsset(html);
      if (entryJs && existsSync(join(rootDir, 'dist', entryJs.slice(1)))) {
        const assetsDir = join(rootDir, 'dist', 'assets');
        const jsFiles = existsSync(assetsDir)
          ? readdirSync(assetsDir).filter((file) => file.endsWith('.js'))
          : [];
        entryBundleReferencesV2 = jsFiles.some((file) =>
          readFileSync(join(assetsDir, file), 'utf8').includes(ATELIER_V2_ASSET_PATHS[0]),
        );
      }
    } catch {
      entryBundleReferencesV2 = false;
    }
  }

  const distReadyForDeploy = Boolean(
    distBuilt && distHasAtelierV2Assets && entryJs && entryBundleReferencesV2,
  );

  return {
    distBuilt,
    entryJs,
    distHasAtelierV2Assets,
    missingV2Assets,
    entryBundleReferencesV2,
    distReadyForDeploy,
    staleDistReason: !distBuilt
      ? 'dist/index.html is missing; run `pnpm build`.'
      : !distHasAtelierV2Assets || !entryBundleReferencesV2
        ? 'dist/ predates Atelier V2 3D assets or lacks V2 bundle references; run `pnpm build`.'
        : null,
  };
}

export function inspectCanonicalProductionReadiness({
  rootDir = ROOT,
  env = process.env,
  allowAmbientAuth = false,
} = {}) {
  const augmentedEnv = buildAugmentedEnv({}, rootDir, env);
  const firebaseJsonPath = join(rootDir, 'firebase.json');
  const firebasercPath = join(rootDir, '.firebaserc');

  const firebaseJson = existsSync(firebaseJsonPath)
    ? JSON.parse(readFileSync(firebaseJsonPath, 'utf8'))
    : null;
  const firebaserc = existsSync(firebasercPath)
    ? JSON.parse(readFileSync(firebasercPath, 'utf8'))
    : null;

  const site = firebaseJson?.hosting?.site ?? null;
  const publicDir = firebaseJson?.hosting?.public ?? null;
  const projectId = firebaserc?.projects?.default ?? null;
  const headers = Array.isArray(firebaseJson?.hosting?.headers)
    ? firebaseJson.hosting.headers
    : [];
  const hasImmutableAssetsHeader = headers.some(
    (h) =>
      h.source === '/assets/**' &&
      Array.isArray(h.headers) &&
      h.headers.some(
        (item) => item.key === 'Cache-Control' && String(item.value).includes('immutable'),
      ),
  );
  const noCacheSources = ['/sw.js', '/index.html', '/site.webmanifest'];
  const hasNoCacheShellHeaders = noCacheSources.every((src) =>
    headers.some(
      (h) =>
        h.source === src &&
        Array.isArray(h.headers) &&
        h.headers.some(
          (item) => item.key === 'Cache-Control' && String(item.value).includes('no-cache'),
        ),
    ),
  );

  const firebaseBin = resolveExecutable('firebase', augmentedEnv);
  const npxBin = resolveExecutable('npx', augmentedEnv);
  const auth = resolveFirebaseAuth({ rootDir, env: augmentedEnv, allowAmbientAuth });
  const gitState = inspectGitState(rootDir, augmentedEnv);
  const distIntegrity = inspectLocalDistIntegrity(rootDir);

  return {
    canonicalTarget: 'firebase-hosting',
    site,
    publicDir,
    projectId,
    productionUrl: LIVE_ORIGIN,
    branch: gitState.branch ?? 'unknown',
    headCommit: gitState.headCommit,
    onCanonicalBranch: gitState.onCanonicalBranch,
    workingTreeClean: gitState.workingTreeClean,
    configValid:
      site === FIREBASE_SITE &&
      publicDir === 'dist' &&
      projectId === FIREBASE_PROJECT &&
      hasImmutableAssetsHeader &&
      hasNoCacheShellHeaders,
    nodeExecutable: process.execPath,
    distBuilt: distIntegrity.distBuilt,
    distHasAtelierV2Assets: distIntegrity.distHasAtelierV2Assets,
    distReadyForDeploy: distIntegrity.distReadyForDeploy,
    staleDistReason: distIntegrity.staleDistReason,
    firebaseCliInstalled: Boolean(firebaseBin),
    firebaseExecutable:
      firebaseBin ?? (npxBin ? `${npxBin} --yes ${FIREBASE_TOOLS_PACKAGE}` : null),
    firebaseAuthReady: auth.ready,
    firebaseAuthSource: auth.source,
  };
}

async function probeAssetHeadOrGet(url, fetchImpl) {
  const headRes = await fetchImpl(url, {
    method: 'HEAD',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  if (headRes.status !== 405) return headRes;
  return fetchImpl(url, {
    method: 'GET',
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
}

/**
 * Strictly verify live index.html entry hash, JS chunk response, SW precache inventory, and all 4 V2 3D PNGs.
 * Sets process.exitCode = 2 whenever any check fails (including bundleMatchesLocalDist === false).
 */
export async function verifyLiveDeployment({
  liveOrigin = LIVE_ORIGIN,
  rootDir = ROOT,
  fetchImpl = fetch,
  requireLocalMatch = true,
  quiet = false,
} = {}) {
  const ts = Date.now();
  const localIndexPath = join(rootDir, 'dist', 'index.html');
  const localHtml = existsSync(localIndexPath) ? readFileSync(localIndexPath, 'utf8') : '';
  const localEntryJs = extractEntryScriptAsset(localHtml);
  const localEntryCss = extractEntryCssAsset(localHtml);

  const indexRes = await fetchImpl(`${liveOrigin}/index.html?ts=${ts}`, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  const indexContentType = indexRes.headers.get('content-type') || '';
  const liveHtml = indexRes.ok ? await indexRes.text() : '';
  const liveEntryJs = extractEntryScriptAsset(liveHtml);
  const liveEntryCss = extractEntryCssAsset(liveHtml);

  const bundleMatchesLocalDist = Boolean(
    localEntryJs && liveEntryJs && localEntryJs === liveEntryJs,
  );
  const cssMatchesLocalDist = Boolean(
    !localEntryCss || (liveEntryCss && localEntryCss === liveEntryCss),
  );

  let entryScriptLive = false;
  let entryScriptContentType = '';
  if (liveEntryJs) {
    const entryRes = await probeAssetHeadOrGet(`${liveOrigin}${liveEntryJs}?ts=${ts}`, fetchImpl);
    entryScriptContentType = entryRes.headers.get('content-type') || '';
    entryScriptLive =
      entryRes.ok && /(?:javascript|ecmascript)/i.test(entryScriptContentType);
  }

  let serviceWorkerMatchesEntry = false;
  const swRes = await fetchImpl(`${liveOrigin}/sw.js?ts=${ts}`, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  const swContentType = swRes.headers.get('content-type') || '';
  if (swRes.ok && /(?:javascript|ecmascript)/i.test(swContentType) && liveEntryJs) {
    const swText = await swRes.text();
    const swAssetsMatch = swText.match(/const ASSETS = (\[.*\]);/);
    if (swAssetsMatch) {
      try {
        const swAssets = JSON.parse(swAssetsMatch[1]);
        serviceWorkerMatchesEntry = Array.isArray(swAssets) && swAssets.includes(liveEntryJs);
      } catch {
        serviceWorkerMatchesEntry = false;
      }
    }
  }

  const v2AssetChecks = await Promise.all(
    ATELIER_V2_ASSET_PATHS.map(async (assetPath) => {
      const res = await probeAssetHeadOrGet(`${liveOrigin}${assetPath}?ts=${ts}`, fetchImpl);
      const contentType = res.headers.get('content-type') || '';
      return {
        assetPath,
        httpStatus: res.status,
        contentType,
        live: res.ok && contentType.toLowerCase().includes('image/png'),
      };
    }),
  );
  const v2Studio3dAssetsLive = v2AssetChecks.every((item) => item.live);

  const failureReasons = [];
  if (!indexRes.ok || !indexContentType.toLowerCase().includes('text/html')) {
    failureReasons.push(
      `index.html check failed (status=${indexRes.status}, type=${indexContentType})`,
    );
  }
  if (!liveEntryJs) {
    failureReasons.push('live index.html did not expose an /assets/index-*.js bundle');
  }
  if (requireLocalMatch && !localEntryJs) {
    failureReasons.push('local dist/index.html is missing or lacks an entry bundle hash');
  }
  if (requireLocalMatch && localEntryJs && liveEntryJs && !bundleMatchesLocalDist) {
    failureReasons.push(
      `live bundle (${liveEntryJs}) does not match local dist (${localEntryJs})`,
    );
  }
  if (requireLocalMatch && localEntryCss && !cssMatchesLocalDist) {
    failureReasons.push(
      `live CSS (${liveEntryCss ?? 'none'}) does not match local dist (${localEntryCss})`,
    );
  }
  if (!entryScriptLive) {
    failureReasons.push(
      `entry JS (${liveEntryJs ?? 'none'}) is not serving valid JavaScript (type=${entryScriptContentType})`,
    );
  }
  if (!serviceWorkerMatchesEntry) {
    failureReasons.push('live /sw.js precache inventory does not contain liveEntryJs');
  }
  if (!v2Studio3dAssetsLive) {
    const failedPaths = v2AssetChecks.filter((c) => !c.live).map((c) => c.assetPath);
    failureReasons.push(`missing or non-PNG Atelier V2 assets: ${failedPaths.join(', ')}`);
  }

  const verified = failureReasons.length === 0;

  const summary = {
    verified,
    liveOrigin,
    httpStatus: indexRes.status,
    lastModified: indexRes.headers.get('last-modified'),
    liveEntryJs,
    localDistEntryJs: localEntryJs,
    bundleMatchesLocalDist,
    cssMatchesLocalDist,
    entryScriptLive,
    serviceWorkerMatchesEntry,
    v2Studio3dAssetsLive,
    v2AssetChecks,
    failureReasons,
  };

  if (!quiet) {
    console.log(JSON.stringify(summary, null, 2));
  }

  if (!verified) {
    process.exitCode = 2;
  }
  return summary;
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

/**
 * Acquire an exclusive local deployment lockfile to prevent overlapping local deployments.
 */
export function acquireDeployLock(
  lockPath = join(ROOT, '.firebase', 'deploy.lock'),
  metadata = {},
) {
  mkdirSync(dirname(lockPath), { recursive: true, mode: 0o700 });
  const payload = JSON.stringify(
    {
      pid: process.pid,
      startedAt: new Date().toISOString(),
      ...metadata,
    },
    null,
    2,
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(lockPath, 'wx', 0o600);
      writeFileSync(fd, payload, 'utf8');
      closeSync(fd);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        try {
          if (existsSync(lockPath)) unlinkSync(lockPath);
        } catch {
          // Best-effort lock cleanup
        }
      };
      return { lockPath, release };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      let existing = null;
      try {
        existing = JSON.parse(readFileSync(lockPath, 'utf8'));
      } catch {
        existing = null;
      }
      if (existing?.pid && isPidAlive(existing.pid)) {
        throw new Error(
          `Another local deployment is already running (PID ${existing.pid}, started ${existing.startedAt ?? 'unknown'}).`,
        );
      }
      try {
        unlinkSync(lockPath);
      } catch {
        throw new Error(`Unable to clear stale deployment lock at ${lockPath}`);
      }
    }
  }
  throw new Error(`Failed to acquire deployment lock at ${lockPath}`);
}

function readReleaseLedger(ledgerPath) {
  if (!existsSync(ledgerPath)) return { releases: [] };
  try {
    const parsed = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    return Array.isArray(parsed?.releases) ? parsed : { releases: [] };
  } catch {
    return { releases: [] };
  }
}

/**
 * Snapshot a verified dist/ build into .firebase/releases/ before deployment so `--rollback` can restore it.
 */
export function snapshotVerifiedRelease(rootDir = ROOT, { gitCommit = null } = {}) {
  verifyPwaBuild(join(rootDir, 'dist'));
  verifyAtelierV2DistAssets(join(rootDir, 'dist'));

  const distDir = join(rootDir, 'dist');
  const html = readFileSync(join(distDir, 'index.html'), 'utf8');
  const entryJs = extractEntryScriptAsset(html);
  const hashSlug = (entryJs ?? 'bundle').replace(/[^A-Za-z0-9_-]/g, '_');
  const releaseId = `${Date.now()}-${hashSlug}`;

  const releasesRoot = join(rootDir, '.firebase', 'releases');
  const snapshotDir = join(releasesRoot, releaseId);
  mkdirSync(releasesRoot, { recursive: true, mode: 0o700 });
  cpSync(distDir, snapshotDir, { recursive: true });

  const ledgerPath = join(rootDir, '.firebase', 'release-history.json');
  const ledger = readReleaseLedger(ledgerPath);
  const entry = {
    releaseId,
    createdAt: new Date().toISOString(),
    gitCommit,
    entryJs,
    snapshotDir: `.firebase/releases/${releaseId}`,
    verifiedLive: false,
  };
  ledger.releases.unshift(entry);

  while (ledger.releases.length > MAX_RELEASE_SNAPSHOTS) {
    const evicted = ledger.releases.pop();
    if (evicted?.releaseId) {
      rmSync(join(releasesRoot, evicted.releaseId), { recursive: true, force: true });
    }
  }
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', { mode: 0o600 });
  return entry;
}

export function markReleaseVerifiedLive(rootDir = ROOT, releaseId) {
  const ledgerPath = join(rootDir, '.firebase', 'release-history.json');
  const ledger = readReleaseLedger(ledgerPath);
  const found = ledger.releases.find((item) => item.releaseId === releaseId);
  if (found) {
    found.verifiedLive = true;
    found.verifiedAt = new Date().toISOString();
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n', { mode: 0o600 });
  }
}

/**
 * Restore the most recent known-good verified release snapshot into dist/ for rollback deployment.
 */
export function restorePreviousVerifiedRelease(rootDir = ROOT, { excludeReleaseId = null } = {}) {
  const ledgerPath = join(rootDir, '.firebase', 'release-history.json');
  const ledger = readReleaseLedger(ledgerPath);
  const candidate = ledger.releases.find((item) => {
    if (!item.verifiedLive) return false;
    if (excludeReleaseId && item.releaseId === excludeReleaseId) return false;
    const absSnapshot = join(rootDir, '.firebase', 'releases', item.releaseId);
    return existsSync(join(absSnapshot, 'index.html'));
  });

  if (!candidate) {
    throw new Error(
      'No verified local release snapshot available in .firebase/release-history.json for rollback.',
    );
  }

  const snapshotAbs = join(rootDir, '.firebase', 'releases', candidate.releaseId);
  const stagingDir = join(rootDir, '.firebase', `rollback-staging-${Date.now()}`);
  cpSync(snapshotAbs, stagingDir, { recursive: true });

  const distDir = join(rootDir, 'dist');
  rmSync(distDir, { recursive: true, force: true });
  cpSync(stagingDir, distDir, { recursive: true });
  rmSync(stagingDir, { recursive: true, force: true });

  verifyPwaBuild(distDir);
  verifyAtelierV2DistAssets(distDir);
  return candidate;
}

function runNodeScript(scriptArgs, env, rootDir = ROOT) {
  execFileSync(process.execPath, scriptArgs, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
}

function runSpawnStep(label, cmd, cmdArgs, env, rootDir = ROOT) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`[deploy] Starting: ${label}`);
    const child = spawn(cmd, cmdArgs, { cwd: rootDir, env, stdio: 'inherit' });
    child.on('error', (err) => rejectPromise(err));
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[deploy] Completed: ${label}`);
        resolvePromise(label);
      } else {
        rejectPromise(new Error(`${label} failed with exit code ${code}`));
      }
    });
  });
}

function resolveFirebaseDeployCommand(execEnv, auth) {
  const firebaseBin = resolveExecutable('firebase', execEnv);
  const npxBin = resolveExecutable('npx', execEnv);

  const baseFirebaseArgs = [
    'deploy',
    '--only',
    `hosting:${FIREBASE_SITE}`,
    '--project',
    FIREBASE_PROJECT,
    ...auth.extraArgs,
  ];

  if (firebaseBin) {
    return { cmd: firebaseBin, args: baseFirebaseArgs };
  }
  if (npxBin) {
    return { cmd: npxBin, args: ['--yes', FIREBASE_TOOLS_PACKAGE, ...baseFirebaseArgs] };
  }
  throw new Error('[deploy] Neither `firebase` CLI nor `npx` could be resolved in PATH.');
}

function isCliEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === MODULE_PATH;
  } catch {
    return false;
  }
}

function printHelp() {
  console.log(
    [
      'Usage: node scripts/deploy-universal.mjs [flag]',
      '  (no flags)          Verify, build dist/, snapshot, deploy to Firebase Hosting & verify live',
      '  --check-env         Inspect config, git state, dist integrity & auth readiness (read-only)',
      '  --verify-live       Verify live index.html hash, JS chunk, SW precache & 4 V2 PNGs',
      '  --rollback          Restore last verified snapshot from .firebase/releases/ & redeploy',
      '  --skip-build        Re-verify pre-built dist/ without running tsc/vite, then deploy',
      '  --auto-rollback     Automatically redeploy previous verified snapshot if --verify-live fails',
    ].join('\n'),
  );
}

async function runCli() {
  const args = validateCliArgs(process.argv.slice(2));
  if (args.has('--help')) {
    printHelp();
    process.exit(0);
  }

  const isCheckOnly = args.has('--check-env');
  const isVerifyLiveOnly = args.has('--verify-live');
  const skipBuild = args.has('--skip-build');
  const isRollback = args.has('--rollback');
  const autoRollback = args.has('--auto-rollback');
  const allowDirty = args.has('--allow-dirty');
  const allowAmbientAuth = args.has('--allow-ambient-auth');
  const allowLiveDrift = args.has('--allow-live-drift');

  const status = inspectCanonicalProductionReadiness({ allowAmbientAuth });

  if (!status.configValid) {
    console.error('[deploy] Invalid canonical production configuration:', status);
    process.exit(1);
  }

  if (isCheckOnly) {
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
  }

  if (isVerifyLiveOnly) {
    const summary = await verifyLiveDeployment({
      requireLocalMatch: !allowLiveDrift,
    });
    process.exit(summary.verified ? 0 : 2);
  }

  const lock = acquireDeployLock(join(ROOT, '.firebase', 'deploy.lock'), {
    mode: isRollback ? 'rollback' : 'deploy',
  });
  const cleanupLock = () => lock.release();
  process.on('exit', cleanupLock);
  process.on('SIGINT', () => {
    cleanupLock();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    cleanupLock();
    process.exit(143);
  });

  try {
    if (!status.onCanonicalBranch) {
      throw new Error(
        `[deploy] Refusing to deploy from branch "${status.branch}". Switch to canonical "main" first.`,
      );
    }
    if (!status.workingTreeClean && !allowDirty) {
      throw new Error(
        '[deploy] Working tree has uncommitted changes. Commit or stash changes before deploying (or pass --allow-dirty).',
      );
    }

    const auth = resolveFirebaseAuth({ allowAmbientAuth });
    if (!auth.ready) {
      throw new Error(
        `[deploy] Firebase authentication unavailable (${auth.source}). Configure GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_TOKEN, or run interactively.`,
      );
    }
    const execEnv = buildAugmentedEnv(auth.extraEnv);
    const { cmd, args: deployArgs } = resolveFirebaseDeployCommand(execEnv, auth);

    if (isRollback) {
      const restored = restorePreviousVerifiedRelease(ROOT);
      console.log(
        `[deploy:rollback] Restored verified snapshot ${restored.releaseId} (${restored.entryJs}) to dist/.`,
      );
      await runSpawnStep(`Firebase Hosting Rollback (${FIREBASE_SITE})`, cmd, deployArgs, execEnv);
      const liveSummary = await verifyLiveDeployment({ requireLocalMatch: true });
      if (!liveSummary.verified) {
        throw new Error(
          `[deploy:rollback] Post-rollback verification failed: ${liveSummary.failureReasons.join('; ')}`,
        );
      }
      return;
    }

    if (!skipBuild) {
      console.log(
        '[deploy] Running secret guard, motion-study ledger check, TypeScript check, Vite build & PWA/V2 verification...',
      );
      runNodeScript(['scripts/check-secrets.mjs'], execEnv);
      runNodeScript(['scripts/generate-motion-study-ledger.mjs', '--check'], execEnv);
      runNodeScript(['./node_modules/typescript/bin/tsc', '-b'], execEnv);
      runNodeScript(['./node_modules/vite/bin/vite.js', 'build'], execEnv);
      runNodeScript(['scripts/check-pwa-build.mjs'], execEnv);
    } else {
      console.log('[deploy] Verifying pre-built dist/ integrity (--skip-build)...');
      verifyPwaBuild('dist');
      verifyAtelierV2DistAssets('dist');
    }

    const releaseSnapshot = snapshotVerifiedRelease(ROOT, { gitCommit: status.headCommit });
    await runSpawnStep(`Firebase Hosting (${FIREBASE_SITE})`, cmd, deployArgs, execEnv);

    console.log('[deploy] Verifying live production response...');
    const liveSummary = await verifyLiveDeployment({ requireLocalMatch: true });
    if (!liveSummary.verified) {
      if (autoRollback) {
        console.error(
          '[deploy] Live verification failed; attempting automatic rollback to previous verified snapshot...',
        );
        const restored = restorePreviousVerifiedRelease(ROOT, {
          excludeReleaseId: releaseSnapshot.releaseId,
        });
        console.log(`[deploy] Rolling back to ${restored.releaseId} (${restored.entryJs})...`);
        await runSpawnStep(
          `Firebase Hosting Auto-Rollback (${FIREBASE_SITE})`,
          cmd,
          deployArgs,
          execEnv,
        );
        await verifyLiveDeployment({ requireLocalMatch: true });
      }
      throw new Error(
        `[deploy] Live verification failed: ${liveSummary.failureReasons.join('; ')}`,
      );
    }

    markReleaseVerifiedLive(ROOT, releaseSnapshot.releaseId);
  } finally {
    cleanupLock();
  }
}

if (isCliEntryPoint()) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(process.exitCode && process.exitCode !== 0 ? process.exitCode : 1);
  });
}
