#!/usr/bin/env node
/**
 * Canonical Production Deployment Orchestrator (`scripts/deploy-universal.mjs`)
 *
 * Single Canonical Target:
 *   - Branch: `main` (`origin/main`)
 *   - Hosting: Firebase Hosting (`pilates-flow-atelier` on project `deskcloud-fleet-auth`)
 *   - Live URL: https://pilates-flow-atelier.web.app
 *
 * Usage:
 *   pnpm deploy:check      # Check production configuration & credential readiness
 *   pnpm deploy            # Build, verify PWA & deploy to Firebase Hosting
 *   pnpm deploy:parallel   # Build once, then push origin/main & deploy Firebase Hosting in parallel
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);

const isCheckOnly = args.includes('--check-env');
const skipBuild = args.includes('--skip-build');
const isParallel = args.includes('--parallel');

function hasBinary(binName) {
  try {
    execFileSync('which', [binName], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function inspectCanonicalProductionReadiness() {
  const realHome = process.env.USER === 'hjunkim' ? '/Users/hjunkim' : homedir();
  const firebaseConfigPath = join(realHome, '.config', 'configstore', 'firebase-tools.json');
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
  const hasFirebaseCli = hasBinary('firebase');
  const hasFirebaseAuth =
    existsSync(firebaseConfigPath) ||
    Boolean(process.env.FIREBASE_TOKEN) ||
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);

  return {
    canonicalTarget: 'firebase-hosting',
    site,
    projectId,
    productionUrl: 'https://pilates-flow-atelier.web.app',
    branch: 'main',
    configValid:
      site === 'pilates-flow-atelier' &&
      projectId === 'deskcloud-fleet-auth' &&
      hasImmutableAssetsHeader,
    distBuilt: existsSync(join(ROOT, 'dist', 'index.html')),
    firebaseCliInstalled: hasFirebaseCli,
    firebaseAuthReady: hasFirebaseAuth,
  };
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

if (!skipBuild) {
  console.log('[deploy] Building and verifying production PWA bundle...');
  execFileSync('node', ['./node_modules/typescript/bin/tsc', '-b'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  execFileSync('node', ['./node_modules/vite/bin/vite.js', 'build'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  execFileSync('node', ['scripts/check-pwa-build.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

const runStep = (label, cmd, cmdArgs) =>
  new Promise((resolvePromise, rejectPromise) => {
    const env = {
      ...process.env,
      HOME: process.env.USER === 'hjunkim' ? '/Users/hjunkim' : process.env.HOME,
    };
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

if (isParallel) {
  await Promise.all([
    runStep('GitHub origin/main Push', 'git', ['push', 'origin', 'main']),
    runStep('Firebase Hosting (pilates-flow-atelier)', 'firebase', [
      'deploy',
      '--only',
      'hosting:pilates-flow-atelier',
      '--project',
      'deskcloud-fleet-auth',
    ]),
  ]);
} else {
  await runStep('Firebase Hosting (pilates-flow-atelier)', 'firebase', [
    'deploy',
    '--only',
    'hosting:pilates-flow-atelier',
    '--project',
    'deskcloud-fleet-auth',
  ]);
}
