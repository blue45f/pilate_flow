#!/usr/bin/env node
/**
 * Canonical Production Deployment Orchestrator (`scripts/deploy-universal.mjs`)
 *
 * Single Canonical Target:
 *   - Branch: `main` (`origin/main`)
 *   - Hosting: Firebase Hosting (`pilates-flow-atelier` on project `deskcloud-fleet-auth`)
 *   - Live URL: https://pilates-flow-atelier.web.app
 *
 * Modes:
 *   node scripts/deploy-universal.mjs --check-env     # Inspect config, CLI & auth readiness (never prints secrets)
 *   node scripts/deploy-universal.mjs --verify-live   # Verify live bundle & 3D assets on https://pilates-flow-atelier.web.app
 *   node scripts/deploy-universal.mjs --bootstrap     # Set up standalone Node + firebase-tools in gitignored .deploy-runtime/
 *   node scripts/deploy-universal.mjs                 # Build, verify PWA, deploy to Firebase Hosting & verify live URL
 *   node scripts/deploy-universal.mjs --parallel      # Build once, push origin/main & deploy Firebase Hosting in parallel, then verify live URL
 *   node scripts/deploy-universal.mjs --skip-build    # Deploy existing dist/ & verify live URL
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LIVE_ORIGIN = 'https://pilates-flow-atelier.web.app';
const FIREBASE_SITE = 'pilates-flow-atelier';
const FIREBASE_PROJECT = 'deskcloud-fleet-auth';
const V2_CANARY_PATH = '/images/atelier-v2/reformer-studio-3d.png';

const args = new Set(process.argv.slice(2));
const isCheckOnly = args.has('--check-env');
const isVerifyLiveOnly = args.has('--verify-live');
const isBootstrap = args.has('--bootstrap');
const skipBuild = args.has('--skip-build');
const isParallel = args.has('--parallel');

function getRealUserHome() {
  if (process.env.USER === 'hjunkim') return '/Users/hjunkim';
  return homedir();
}

function parseEnvFileSafe(filePath) {
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

function discoverCandidateBinDirs() {
  const realHome = getRealUserHome();
  const dirs = [
    join(ROOT, '.deploy-runtime', 'node', 'bin'),
    join(ROOT, '.deploy-runtime', 'node_modules', '.bin'),
    join(ROOT, 'node_modules', '.bin'),
    join(homedir(), '.local', 'node', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ];

  const nvmVersionsDir = join(realHome, '.nvm', 'versions', 'node');
  try {
    if (existsSync(nvmVersionsDir)) {
      const versions = readdirSync(nvmVersionsDir)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
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

function buildAugmentedEnv(extraEnv = {}) {
  const candidateDirs = discoverCandidateBinDirs();
  const currentPath = process.env.PATH || '/usr/bin:/bin:/usr/sbin:/sbin';
  const mergedPath = [...new Set([...candidateDirs, ...currentPath.split(':')])].join(':');
  return {
    ...process.env,
    PATH: mergedPath,
    ...extraEnv,
  };
}

function resolveExecutable(binName, env) {
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

function resolveFirebaseAuth() {
  const deployEnv = parseEnvFileSafe(join(ROOT, '.env.deploy.local'));
  const tokenFromEnv = process.env.FIREBASE_TOKEN || deployEnv.FIREBASE_TOKEN || '';
  if (tokenFromEnv) {
    return {
      ready: true,
      source: process.env.FIREBASE_TOKEN ? 'env:FIREBASE_TOKEN' : 'file:.env.deploy.local(FIREBASE_TOKEN)',
      extraArgs: ['--token', tokenFromEnv],
      extraEnv: {},
    };
  }

  const gacFromEnv =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || deployEnv.GOOGLE_APPLICATION_CREDENTIALS || '';
  if (gacFromEnv && existsSync(gacFromEnv)) {
    return {
      ready: true,
      source: 'file:GOOGLE_APPLICATION_CREDENTIALS',
      extraArgs: [],
      extraEnv: { GOOGLE_APPLICATION_CREDENTIALS: gacFromEnv },
    };
  }

  const realHome = getRealUserHome();
  const homeFirebaseToolsJson = join(realHome, '.config', 'configstore', 'firebase-tools.json');
  try {
    if (existsSync(homeFirebaseToolsJson)) {
      return {
        ready: true,
        source: 'home:~/.config/configstore/firebase-tools.json',
        extraArgs: [],
        extraEnv: { HOME: realHome, XDG_CONFIG_HOME: join(realHome, '.config') },
      };
    }
  } catch {
    // Skip when ~/.config is outside accessible scope
  }

  return {
    ready: false,
    source: 'none',
    extraArgs: [],
    extraEnv: {},
  };
}

function inspectCanonicalProductionReadiness() {
  const env = buildAugmentedEnv();
  const firebaseJsonPath = join(ROOT, 'firebase.json');
  const firebasercPath = join(ROOT, '.firebaserc');

  const firebaseJson = existsSync(firebaseJsonPath)
    ? JSON.parse(readFileSync(firebaseJsonPath, 'utf8'))
    : null;
  const firebaserc = existsSync(firebasercPath)
    ? JSON.parse(readFileSync(firebasercPath, 'utf8'))
    : null;

  const site = firebaseJson?.hosting?.site ?? null;
  const projectId = firebaserc?.projects?.default ?? null;
  const hasImmutableAssetsHeader = Boolean(
    firebaseJson?.hosting?.headers?.some((h) => h.source === '/assets/**'),
  );

  const firebaseBin = resolveExecutable('firebase', env);
  const npxBin = resolveExecutable('npx', env);
  const auth = resolveFirebaseAuth();

  return {
    canonicalTarget: 'firebase-hosting',
    site,
    projectId,
    productionUrl: LIVE_ORIGIN,
    branch: 'main',
    configValid:
      site === FIREBASE_SITE &&
      projectId === FIREBASE_PROJECT &&
      hasImmutableAssetsHeader,
    nodeExecutable: process.execPath,
    distBuilt: existsSync(join(ROOT, 'dist', 'index.html')),
    distHasAtelierV2Assets: existsSync(join(ROOT, 'dist', V2_CANARY_PATH.slice(1))),
    firebaseCliInstalled: Boolean(firebaseBin),
    firebaseExecutable: firebaseBin ?? (npxBin ? `${npxBin} firebase-tools` : null),
    firebaseAuthReady: auth.ready,
    firebaseAuthSource: auth.source,
  };
}

function extractEntryScriptAsset(html) {
  const match = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  return match ? match[0] : null;
}

async function verifyLiveDeployment() {
  const localIndexPath = join(ROOT, 'dist', 'index.html');
  const localHtml = existsSync(localIndexPath) ? readFileSync(localIndexPath, 'utf8') : '';
  const localEntryJs = extractEntryScriptAsset(localHtml);

  const indexRes = await fetch(`${LIVE_ORIGIN}/index.html?ts=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
  });
  const liveHtml = await indexRes.text();
  const liveEntryJs = extractEntryScriptAsset(liveHtml);

  const canaryRes = await fetch(`${LIVE_ORIGIN}${V2_CANARY_PATH}?ts=${Date.now()}`, {
    method: 'HEAD',
    headers: { 'Cache-Control': 'no-cache' },
  });
  const canaryContentType = canaryRes.headers.get('content-type') || '';
  const v2AssetLive = canaryRes.ok && canaryContentType.includes('image/png');

  const bundleMatchesLocalDist = Boolean(localEntryJs && liveEntryJs && localEntryJs === liveEntryJs);

  const summary = {
    liveOrigin: LIVE_ORIGIN,
    httpStatus: indexRes.status,
    lastModified: indexRes.headers.get('last-modified'),
    liveEntryJs,
    localDistEntryJs: localEntryJs,
    bundleMatchesLocalDist,
    v2Studio3dAssetsLive: v2AssetLive,
    v2CanaryContentType: canaryContentType,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!indexRes.ok || !v2AssetLive) {
    process.exitCode = 2;
  }
  return summary;
}

function bootstrapLocalRuntime() {
  const runtimeDir = join(ROOT, '.deploy-runtime');
  const nodeBinDir = join(runtimeDir, 'node', 'bin');

  mkdirSync(nodeBinDir, { recursive: true, mode: 0o700 });
  chmodSync(runtimeDir, 0o700);

  const destNode = join(nodeBinDir, 'node');
  copyFileSync(process.execPath, destNode);
  chmodSync(destNode, 0o755);

  const env = buildAugmentedEnv();
  const npmBin = resolveExecutable('npm', env);
  let installedFirebaseTools = existsSync(
    join(runtimeDir, 'node_modules', '.bin', 'firebase'),
  );
  if (!installedFirebaseTools && npmBin) {
    console.log('[deploy:bootstrap] Installing local firebase-tools into .deploy-runtime/...');
    execFileSync(
      npmBin,
      ['install', '--prefix', runtimeDir, '--no-audit', '--no-fund', 'firebase-tools'],
      { cwd: ROOT, env, stdio: 'inherit' },
    );
    installedFirebaseTools = existsSync(
      join(runtimeDir, 'node_modules', '.bin', 'firebase'),
    );
  }

  console.log(
    JSON.stringify(
      {
        bootstrapped: true,
        runtimeDir: '.deploy-runtime/ (gitignored)',
        nodeCopied: existsSync(destNode),
        firebaseToolsReady: installedFirebaseTools,
      },
      null,
      2,
    ),
  );
}

function runNodeScript(scriptArgs, env) {
  execFileSync(process.execPath, scriptArgs, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  });
}

function runSpawnStep(label, cmd, cmdArgs, env) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`[deploy] Starting: ${label}`);
    const child = spawn(cmd, cmdArgs, { cwd: ROOT, env, stdio: 'inherit' });
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

const status = inspectCanonicalProductionReadiness();

if (!status.configValid) {
  console.error('[deploy] Invalid canonical production configuration:', status);
  process.exit(1);
}

if (isCheckOnly) {
  console.log(JSON.stringify(status, null, 2));
  process.exit(0);
}

if (isBootstrap) {
  bootstrapLocalRuntime();
  process.exit(0);
}

if (isVerifyLiveOnly) {
  await verifyLiveDeployment();
  process.exit(process.exitCode ?? 0);
}

const auth = resolveFirebaseAuth();
if (!auth.ready) {
  console.error(
    '[deploy] Firebase authentication not found. Run `firebase login` once or configure FIREBASE_TOKEN.',
  );
  process.exit(1);
}

const execEnv = buildAugmentedEnv(auth.extraEnv);

if (!skipBuild) {
  console.log('[deploy] Running secret guard, TypeScript check, Vite build & PWA verification...');
  runNodeScript(['scripts/check-secrets.mjs'], execEnv);
  runNodeScript(['./node_modules/typescript/bin/tsc', '-b'], execEnv);
  runNodeScript(['./node_modules/vite/bin/vite.js', 'build'], execEnv);
  runNodeScript(['scripts/check-pwa-build.mjs'], execEnv);
}

const firebaseBin = resolveExecutable('firebase', execEnv);
const localRuntimeFirebaseJs = join(
  ROOT,
  '.deploy-runtime',
  'node_modules',
  'firebase-tools',
  'lib',
  'bin',
  'firebase.js',
);
const npxBin = resolveExecutable('npx', execEnv);

const baseFirebaseArgs = [
  'deploy',
  '--only',
  `hosting:${FIREBASE_SITE}`,
  '--project',
  FIREBASE_PROJECT,
  ...auth.extraArgs,
];

let deployCmd = null;
let deployArgs = [];
if (existsSync(localRuntimeFirebaseJs)) {
  deployCmd = process.execPath;
  deployArgs = [localRuntimeFirebaseJs, ...baseFirebaseArgs];
} else if (firebaseBin) {
  deployCmd = firebaseBin;
  deployArgs = baseFirebaseArgs;
} else if (npxBin) {
  deployCmd = npxBin;
  deployArgs = ['--yes', 'firebase-tools', ...baseFirebaseArgs];
} else {
  console.error('[deploy] Neither `firebase` CLI nor `npx` could be resolved in PATH.');
  process.exit(1);
}

if (isParallel) {
  await Promise.all([
    runSpawnStep('GitHub origin/main Push', 'git', ['push', 'origin', 'main'], execEnv),
    runSpawnStep(`Firebase Hosting (${FIREBASE_SITE})`, deployCmd, deployArgs, execEnv),
  ]);
} else {
  await runSpawnStep(`Firebase Hosting (${FIREBASE_SITE})`, deployCmd, deployArgs, execEnv);
}

console.log('[deploy] Verifying live production response...');
await verifyLiveDeployment();
