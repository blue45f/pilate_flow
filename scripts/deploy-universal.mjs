#!/usr/bin/env node
/**
 * Universal Multi-Cloud & Local Deployment Orchestrator (`scripts/deploy-universal.mjs`)
 *
 * Usage:
 *   node scripts/deploy-universal.mjs --check-env
 *   node scripts/deploy-universal.mjs --target=auto --parallel
 *   node scripts/deploy-universal.mjs --target=firebase,github --parallel
 *   node scripts/deploy-universal.mjs --target=vercel|netlify|cloudflare|local-preview
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);

const getFlagValue = (prefix, fallback) => {
  const found = args.find((a) => a.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1) : fallback;
};

const isCheckOnly = args.includes('--check-env');
const isDryRun = args.includes('--dry-run');
const skipBuild = args.includes('--skip-build');
const isParallel = args.includes('--parallel');
const requestedTarget = getFlagValue('--target', 'auto');

function hasBinary(binName) {
  try {
    execFileSync('which', [binName], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function detectEnvironmentReadiness() {
  const realHome = process.env.USER === 'hjunkim' ? '/Users/hjunkim' : homedir();
  const firebaseConfigPath = join(realHome, '.config', 'configstore', 'firebase-tools.json');
  const hasFirebaseCli = hasBinary('firebase');
  const hasFirebaseAuth =
    existsSync(firebaseConfigPath) || Boolean(process.env.FIREBASE_TOKEN);
  const hasGit = hasBinary('git');
  const hasVercel = hasBinary('vercel') || Boolean(process.env.VERCEL_TOKEN);
  const hasNetlify = hasBinary('netlify') || Boolean(process.env.NETLIFY_AUTH_TOKEN);
  const hasWrangler = hasBinary('wrangler') || Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasDocker = hasBinary('docker');

  return [
    {
      id: 'firebase',
      name: 'Firebase Hosting (pilates-flow-atelier)',
      ready: hasFirebaseCli && hasFirebaseAuth && existsSync(join(ROOT, 'firebase.json')),
      configPresent: existsSync(join(ROOT, 'firebase.json')),
      cmd: 'firebase',
      cmdArgs: ['deploy', '--only', 'hosting:pilates-flow-atelier', '--project', 'deskcloud-fleet-auth'],
    },
    {
      id: 'github',
      name: 'GitHub Main Single-Branch Push & Actions Pages',
      ready: hasGit && existsSync(join(ROOT, '.github/workflows/deploy-production.yml')),
      configPresent: existsSync(join(ROOT, '.github/workflows/deploy-production.yml')),
      cmd: 'git',
      cmdArgs: ['push', 'origin', 'main'],
    },
    {
      id: 'vercel',
      name: 'Vercel Edge Network',
      ready: hasVercel && existsSync(join(ROOT, 'vercel.json')),
      configPresent: existsSync(join(ROOT, 'vercel.json')),
      cmd: 'npx',
      cmdArgs: ['vercel', 'deploy', '--prod', '--yes'],
    },
    {
      id: 'netlify',
      name: 'Netlify CDN',
      ready: hasNetlify && existsSync(join(ROOT, 'netlify.toml')),
      configPresent: existsSync(join(ROOT, 'netlify.toml')),
      cmd: 'npx',
      cmdArgs: ['netlify-cli', 'deploy', '--prod', '--dir=dist'],
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Pages',
      ready: hasWrangler && existsSync(join(ROOT, 'wrangler.toml')),
      configPresent: existsSync(join(ROOT, 'wrangler.toml')),
      cmd: 'npx',
      cmdArgs: ['wrangler', 'pages', 'deploy', 'dist', '--project-name=pilates-flow-atelier'],
    },
    {
      id: 'docker',
      name: 'Docker / Nginx Self-Hosted Container',
      ready: hasDocker && existsSync(join(ROOT, 'nginx/default.conf')),
      configPresent: existsSync(join(ROOT, 'nginx/default.conf')),
      cmd: 'docker',
      cmdArgs: ['compose', 'up', '-d', '--build'],
    },
  ];
}

const readiness = detectEnvironmentReadiness();

if (isCheckOnly) {
  console.log(
    JSON.stringify(
      {
        mode: 'check-env',
        distBuilt: existsSync(join(ROOT, 'dist', 'index.html')),
        targets: readiness.map(({ id, name, ready, configPresent }) => ({
          id,
          name,
          ready,
          configPresent,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const selectedTargets =
  requestedTarget === 'auto'
    ? readiness.filter((t) => t.ready && (t.id === 'firebase' || t.id === 'github'))
    : requestedTarget === 'all'
      ? readiness.filter((t) => t.ready)
      : readiness.filter((t) =>
          requestedTarget
            .split(',')
            .map((s) => s.trim())
            .includes(t.id),
        );

if (!skipBuild && !isDryRun) {
  console.log('[deploy-universal] Building and verifying production PWA bundle...');
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

if (isDryRun) {
  console.log(
    JSON.stringify({
      mode: 'dry-run',
      parallel: isParallel,
      selectedTargets: selectedTargets.map((t) => ({
        id: t.id,
        command: `${t.cmd} ${t.cmdArgs.join(' ')}`,
      })),
    }),
  );
  process.exit(0);
}

const runTarget = (target) =>
  new Promise((resolvePromise, rejectPromise) => {
    const env = {
      ...process.env,
      HOME: process.env.USER === 'hjunkim' ? '/Users/hjunkim' : process.env.HOME,
    };
    console.log(`[deploy-universal] Starting target: ${target.name}`);
    const child = spawn(target.cmd, target.cmdArgs, {
      cwd: ROOT,
      env,
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[deploy-universal] Completed target: ${target.name}`);
        resolvePromise(target.id);
      } else {
        rejectPromise(new Error(`Target ${target.id} exited with code ${code}`));
      }
    });
  });

if ( isParallel ) {
  await Promise.all(selectedTargets.map((t) => runTarget(t)));
} else {
  for (const t of selectedTargets) {
    await runTarget(t);
  }
}
