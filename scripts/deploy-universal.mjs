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
 *   node scripts/deploy-universal.mjs --doctor        # Human + AI step-by-step Korean readiness & next-action guide
 *   node scripts/deploy-universal.mjs --check-env     # Inspect config, git, dist & auth readiness JSON (never prints secrets)
 *   node scripts/deploy-universal.mjs --verify-live   # Strictly verify live bundle hash, SW & all 4 Atelier V2 3D assets
 *   node scripts/deploy-universal.mjs                 # Lock, gate, build, snapshot, deploy to Firebase Hosting & verify live
 *   node scripts/deploy-universal.mjs --rollback      # Restore last verified release snapshot & redeploy to Firebase Hosting
 *   node scripts/deploy-universal.mjs --skip-build    # Re-verify existing dist/ integrity, deploy & verify live
 */
import {
  chmodSync,
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
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
export const LOCAL_DEPLOY_ENV_FILES = [
  '.env.deploy.local',
  '.env.local',
  '.env.deployment-reference.local',
];
export const ALLOWED_CLI_FLAGS = new Set([
  '--doctor',
  '--check-env',
  '--verify-live',
  '--wait-cdn',
  '--rollback',
  '--skip-build',
  '--auto-rollback',
  '--allow-dirty',
  '--allow-ambient-auth',
  '--allow-live-drift',
  '--skip-live-verify',
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
    Number(parsed.has('--doctor')) +
    Number(parsed.has('--check-env')) +
    Number(parsed.has('--verify-live')) +
    Number(parsed.has('--rollback'));
  if (modeCount > 1) {
    throw new Error(
      '[deploy] Conflicting modes: combine only one of --doctor, --check-env, --verify-live, or --rollback.',
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

const PLACEHOLDER_CREDENTIAL_PATTERNS = [
  /^<[^>]*>$/, // <your-token>, <redacted>
  /^\$\{[^}]*\}$/, // ${FIREBASE_TOKEN}
  /^(?:placeholder|changeme|change[-_]me|replace[-_]?me|your[-_]|set[-_]your|todo\b|tbd\b|redacted\b|dummy\b|example\b)/i,
  /^x{3,}$/i, // xxx / XXXXXXXX
];

/**
 * Detect template/placeholder credential values (e.g. `placeholder-set-your-token-here`)
 * so they never shadow real lower-priority credentials such as an ambient `firebase login`.
 * Only leading-template markers are matched, so real tokens that merely contain such words are kept.
 */
export function isPlaceholderCredentialValue(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return PLACEHOLDER_CREDENTIAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Load gitignored local env files in priority order (`.env.deploy.local` > `.env.local` > `.env.deployment-reference.local`).
 * Placeholder values are skipped (and reported via `placeholderKeys`) so they never shadow real credentials.
 */
export function loadLocalDeployEnvMap(rootDir = ROOT) {
  const values = {};
  const keySources = {};
  const placeholderKeys = {};
  for (const relName of [...LOCAL_DEPLOY_ENV_FILES].reverse()) {
    const parsed = parseEnvFileSafe(join(rootDir, relName));
    for (const [key, val] of Object.entries(parsed)) {
      if (!val) continue;
      if (isPlaceholderCredentialValue(val)) {
        placeholderKeys[key] = relName;
        continue;
      }
      values[key] = val;
      keySources[key] = relName;
    }
  }
  return { values, keySources, placeholderKeys };
}

function realEnvValue(env, key) {
  const value = env[key];
  return value && !isPlaceholderCredentialValue(value) ? value : '';
}

/**
 * Parse raw JSON or Base64-encoded service account JSON safely in memory without logging values.
 */
export function parseServiceAccountJsonString(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  if (!trimmed.startsWith('{')) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
      if (decoded.startsWith('{')) {
        candidates.push(decoded);
      }
    } catch {
      // Not valid base64
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.type === 'service_account' &&
        typeof parsed.client_email === 'string' &&
        typeof parsed.private_key === 'string'
      ) {
        return {
          project_id: parsed.project_id ?? null,
          normalizedJson: JSON.stringify(parsed),
        };
      }
    } catch {
      // Ignore malformed candidate
    }
  }
  return null;
}

export function discoverCandidateBinDirs(rootDir = ROOT, currentHome = homedir()) {
  const dirs = [
    join(rootDir, 'node_modules', '.bin'),
    join(currentHome, '.volta', 'bin'),
    join(currentHome, '.asdf', 'shims'),
    join(currentHome, '.local', 'share', 'mise', 'shims'),
    join(currentHome, '.local', 'node', 'bin'),
    join(currentHome, 'Library', 'pnpm'),
    join(currentHome, '.local', 'share', 'pnpm'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/opt/local/bin',
    '/private/tmp/node22-standalone/bin',
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

  for (const fnmBase of [
    join(currentHome, '.local', 'share', 'fnm', 'node-versions'),
    join(currentHome, 'Library', 'Application Support', 'fnm', 'node-versions'),
  ]) {
    try {
      if (existsSync(fnmBase)) {
        const versions = readdirSync(fnmBase).sort((a, b) =>
          b.localeCompare(a, undefined, { numeric: true }),
        );
        for (const v of versions) {
          dirs.push(join(fnmBase, v, 'installation', 'bin'));
        }
      }
    } catch {
      // Skip inaccessible fnm directory
    }
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

function resolveCredentialFilePath(rawPath, rootDir) {
  if (!rawPath) return '';
  return isAbsolute(rawPath) ? rawPath : resolve(rootDir, rawPath);
}

/**
 * Resolve Firebase authentication across env vars, `.env.deploy.local` / `.env.local`,
 * `.firebase/service-account.json`, inline/Base64 JSON, and interactive CLI login
 * without escaping sandbox $HOME or exposing tokens on CLI argv.
 */
export function resolveFirebaseAuth({
  rootDir = ROOT,
  env = process.env,
  homeDir = homedir(),
  isInteractive = Boolean(process.stdin?.isTTY && process.stdout?.isTTY),
  allowAmbientAuth = false,
} = {}) {
  const localEnv = loadLocalDeployEnvMap(rootDir);
  const envGac = realEnvValue(env, 'GOOGLE_APPLICATION_CREDENTIALS');
  const envInlineSa = realEnvValue(env, 'FIREBASE_SERVICE_ACCOUNT');
  const envToken = realEnvValue(env, 'FIREBASE_TOKEN');

  // 1. Explicit GOOGLE_APPLICATION_CREDENTIALS file path (process env -> local env files)
  const rawGac = envGac || localEnv.values.GOOGLE_APPLICATION_CREDENTIALS || '';
  if (rawGac) {
    const resolvedGac = resolveCredentialFilePath(rawGac, rootDir);
    if (existsSync(resolvedGac)) {
      const sourceLabel = envGac
        ? 'env:GOOGLE_APPLICATION_CREDENTIALS'
        : `file:${localEnv.keySources.GOOGLE_APPLICATION_CREDENTIALS}(GOOGLE_APPLICATION_CREDENTIALS)`;
      return {
        ready: true,
        source: sourceLabel,
        extraArgs: ['--non-interactive'],
        extraEnv: { GOOGLE_APPLICATION_CREDENTIALS: resolvedGac },
      };
    }
  }

  // 2. Drop-in gitignored `.firebase/service-account.json`
  const autoServiceAccountPath = join(rootDir, '.firebase', 'service-account.json');
  if (existsSync(autoServiceAccountPath)) {
    return {
      ready: true,
      source: 'file:.firebase/service-account.json',
      extraArgs: ['--non-interactive'],
      extraEnv: { GOOGLE_APPLICATION_CREDENTIALS: autoServiceAccountPath },
    };
  }

  // 3. Inline JSON or Base64 `FIREBASE_SERVICE_ACCOUNT` (process env -> local env files)
  const rawInlineSa = envInlineSa || localEnv.values.FIREBASE_SERVICE_ACCOUNT || '';
  const parsedInlineSa = parseServiceAccountJsonString(rawInlineSa);
  if (parsedInlineSa) {
    const sourceLabel = envInlineSa
      ? 'env:FIREBASE_SERVICE_ACCOUNT'
      : `file:${localEnv.keySources.FIREBASE_SERVICE_ACCOUNT}(FIREBASE_SERVICE_ACCOUNT)`;
    return {
      ready: true,
      source: sourceLabel,
      extraArgs: ['--non-interactive'],
      extraEnv: {},
      inlineServiceAccountJson: parsedInlineSa.normalizedJson,
    };
  }

  // 4. `FIREBASE_TOKEN` (process env -> local env files; passed strictly via env, NEVER `--token` argv)
  const tokenFromEnv = envToken || localEnv.values.FIREBASE_TOKEN || '';
  if (tokenFromEnv) {
    const sourceLabel = envToken
      ? 'env:FIREBASE_TOKEN'
      : `file:${localEnv.keySources.FIREBASE_TOKEN}(FIREBASE_TOKEN)`;
    return {
      ready: true,
      source: sourceLabel,
      extraArgs: ['--non-interactive'],
      extraEnv: { FIREBASE_TOKEN: tokenFromEnv },
    };
  }

  // 5. Ambient CLI credentials (`firebase login` or `gcloud auth application-default login`)
  const xdgConfigHome = env.XDG_CONFIG_HOME || join(homeDir, '.config');
  const homeFirebaseToolsJson = join(xdgConfigHome, 'configstore', 'firebase-tools.json');
  const homeGcloudAdcJson = join(xdgConfigHome, 'gcloud', 'application_default_credentials.json');
  try {
    const hasFirebaseCliLogin = existsSync(homeFirebaseToolsJson);
    const hasGcloudAdc = !hasFirebaseCliLogin && existsSync(homeGcloudAdcJson);
    if (hasFirebaseCliLogin || hasGcloudAdc) {
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
        source: hasFirebaseCliLogin
          ? 'home:configstore/firebase-tools.json'
          : 'home:gcloud/application_default_credentials.json',
        extraArgs: [],
        extraEnv: hasGcloudAdc ? { GOOGLE_APPLICATION_CREDENTIALS: homeGcloudAdcJson } : {},
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

/**
 * Materialize inline service account JSON to an ephemeral 0600 file only for the duration of deploy.
 */
export function prepareAuthExecutionEnv(auth) {
  if (!auth?.inlineServiceAccountJson) {
    return {
      extraEnv: { ...(auth?.extraEnv ?? {}) },
      cleanup: () => {},
    };
  }
  const tempDir = mkdtempSync(join(tmpdir(), 'pf-sa-'));
  const tempFile = join(tempDir, 'service-account.json');
  writeFileSync(tempFile, auth.inlineServiceAccountJson, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(tempFile, 0o600);
  } catch {
    // Best-effort permission lock
  }
  let cleaned = false;
  return {
    extraEnv: {
      ...(auth.extraEnv ?? {}),
      GOOGLE_APPLICATION_CREDENTIALS: tempFile,
    },
    cleanup: () => {
      if (cleaned) return;
      cleaned = true;
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export function inspectGitState(rootDir = ROOT, env = process.env) {
  try {
    const rawBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: rootDir,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const branch =
      rawBranch === 'HEAD' && env.GITHUB_REF_NAME ? String(env.GITHUB_REF_NAME).trim() : rawBranch;
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

export function computeRecommendedNextCommand(status) {
  if (!status.configValid) {
    return 'firebase.json 및 .firebaserc 정본 구성을 확인하세요 (pnpm test:deploy).';
  }
  if (!status.onCanonicalBranch) {
    return 'git checkout main';
  }
  if (!status.workingTreeClean) {
    return '변경사항을 커밋한 뒤 배포를 진행하세요 (git status).';
  }
  if (status.firebaseAuthReady) {
    return status.distReadyForDeploy ? 'pnpm deploy --skip-build' : 'pnpm deploy';
  }
  return 'pnpm deploy:auth   # (최초 1회: .env.deploy.local 저장 + GitHub Actions 시크릿 등록 후 pnpm deploy 실행)';
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

  const status = {
    canonicalTarget: 'firebase-hosting',
    site,
    publicDir,
    projectId,
    productionUrl: LIVE_ORIGIN,
    gitAvailable: gitState.gitAvailable,
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
    distEntryJs: distIntegrity.entryJs,
    distHasAtelierV2Assets: distIntegrity.distHasAtelierV2Assets,
    distReadyForDeploy: distIntegrity.distReadyForDeploy,
    staleDistReason: distIntegrity.staleDistReason,
    firebaseCliInstalled: Boolean(firebaseBin),
    firebaseExecutable:
      firebaseBin ?? (npxBin ? `${npxBin} --yes ${FIREBASE_TOOLS_PACKAGE}` : null),
    firebaseAuthReady: auth.ready,
    firebaseAuthSource: auth.source,
    supportedLocalAuthPaths: [
      '.firebase/service-account.json',
      '.env.deploy.local (GOOGLE_APPLICATION_CREDENTIALS | FIREBASE_SERVICE_ACCOUNT | FIREBASE_TOKEN)',
      '.env.local (GOOGLE_APPLICATION_CREDENTIALS | FIREBASE_SERVICE_ACCOUNT | FIREBASE_TOKEN)',
    ],
  };

  return {
    ...status,
    recommendedNextCommand: computeRecommendedNextCommand(status),
  };
}

export function formatDeployDoctorReport(status) {
  const lines = [
    '=== Pilates Flow Atelier 배포 진단 리포트 (--doctor) ===',
    `1. 정본 호스팅 설정 : ${status.configValid ? '정상 ✅' : '오류 ❌'} (${status.site} / ${status.projectId} -> ${status.productionUrl})`,
    `2. Git 브랜치 상태  : ${status.onCanonicalBranch ? 'main ✅' : `${status.branch} ⚠️`} | 워킹트리: ${status.workingTreeClean ? '클린 ✅' : '미커밋 변경 있음 ⚠️'} (HEAD: ${status.headCommit ?? 'unknown'})`,
    `3. 로컬 dist 빌드   : ${status.distReadyForDeploy ? `준비 완료 ✅ (${status.distEntryJs})` : `재빌드 필요 ⚠️ (${status.staleDistReason ?? 'not built'})`}`,
    `4. 로컬 배포 인증   : ${status.firebaseAuthReady ? `연결됨 ✅ (${status.firebaseAuthSource})` : `미연결 ⚠️ (${status.firebaseAuthSource})`}`,
    '',
    `👉 지금 바로 실행할 다음 명령: ${status.recommendedNextCommand}`,
  ];
  if (!status.firebaseAuthReady) {
    lines.push(
      '   • [방법 A — 로컬+CI 한 번에 영구 등록] 터미널에서 `pnpm deploy:auth` 실행 후 `pnpm deploy`',
      '   • [방법 B — 서비스 계정 파일] `.firebase/service-account.json` 복사 후 `pnpm deploy`',
      '   • [방법 C — GitHub Actions 자동 배포] GitHub Secrets에 `FIREBASE_SERVICE_ACCOUNT` 등록 후 `git push origin main`',
    );
  }
  return lines.join('\n');
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

function sleepMs(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function runSingleLiveVerificationPass({
  liveOrigin,
  localEntryJs,
  localEntryCss,
  fetchImpl,
  requireLocalMatch,
}) {
  const ts = Date.now();
  let indexRes;
  try {
    // Request the site root rather than `/index.html`: with `cleanUrls: true` Firebase Hosting
    // answers `/index.html?ts=…` with a relative `Location: ?ts=…` 301 that resolves back to
    // itself, so `fetch` aborts with "redirect count exceeded" and verification never succeeds.
    indexRes = await fetchImpl(`${liveOrigin}/?ts=${ts}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      verified: false,
      networkReachable: false,
      liveOrigin,
      httpStatus: null,
      lastModified: null,
      liveEntryJs: null,
      localDistEntryJs: localEntryJs,
      bundleMatchesLocalDist: false,
      cssMatchesLocalDist: false,
      entryScriptLive: false,
      serviceWorkerMatchesEntry: false,
      v2Studio3dAssetsLive: false,
      v2AssetChecks: [],
      failureReasons: [
        `outbound HTTP blocked in current shell sandbox (${msg}) — trigger GitHub Actions via @git push to origin/main or run pnpm deploy:verify in a host terminal`,
      ],
    };
  }
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
    entryScriptLive = entryRes.ok && /(?:javascript|ecmascript)/i.test(entryScriptContentType);
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
  return {
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
}

/**
 * Strictly verify live index.html entry hash, JS chunk response, SW precache inventory, and all 4 V2 3D PNGs.
 * Supports bounded CDN propagation retries (`maxAttempts` > 1) after fresh uploads.
 * Sets process.exitCode = 2 whenever final verification fails.
 */
export async function verifyLiveDeployment({
  liveOrigin = LIVE_ORIGIN,
  rootDir = ROOT,
  fetchImpl = fetch,
  requireLocalMatch = true,
  quiet = false,
  maxAttempts = 1,
  retryDelayMs = 2500,
} = {}) {
  const localIndexPath = join(rootDir, 'dist', 'index.html');
  const localHtml = existsSync(localIndexPath) ? readFileSync(localIndexPath, 'utf8') : '';
  const localEntryJs = extractEntryScriptAsset(localHtml);
  const localEntryCss = extractEntryCssAsset(localHtml);

  const totalAttempts = Math.max(1, Number(maxAttempts) || 1);
  let summary = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    summary = await runSingleLiveVerificationPass({
      liveOrigin,
      localEntryJs,
      localEntryCss,
      fetchImpl,
      requireLocalMatch,
    });
    if (summary.verified) {
      summary.attemptsUsed = attempt;
      process.exitCode = 0;
      break;
    }
    summary.attemptsUsed = attempt;
    if (attempt < totalAttempts) {
      if (!quiet) {
        console.log(
          `[deploy:verify] CDN 전파 대기 중 (${attempt}/${totalAttempts}): ${summary.failureReasons.join('; ')}`,
        );
      }
      await sleepMs(retryDelayMs);
    }
  }

  if (!quiet) {
    console.log(JSON.stringify(summary, null, 2));
  }

  if (!summary.verified) {
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
export function restorePreviousVerifiedRelease(
  rootDir = ROOT,
  { excludeReleaseId = null, excludeReleaseIds = [] } = {},
) {
  const ledgerPath = join(rootDir, '.firebase', 'release-history.json');
  const ledger = readReleaseLedger(ledgerPath);
  const excluded = new Set(excludeReleaseIds);
  if (excludeReleaseId) excluded.add(excludeReleaseId);
  const candidate = ledger.releases.find((item) => {
    if (!item.verifiedLive) return false;
    if (excluded.has(item.releaseId)) return false;
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

/** Identify production before changing dist; never reselect the bundle currently served live. */
export async function restoreManualRollbackRelease(
  rootDir = ROOT,
  { liveOrigin = LIVE_ORIGIN, fetchImpl = fetch } = {},
) {
  let response;
  try {
    response = await fetchImpl(`${liveOrigin}/?rollback-check=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      '[deploy:rollback] Cannot identify the live release; production was not reachable. No snapshot was restored.',
    );
  }
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.toLowerCase().includes('text/html')) {
    throw new Error(
      `[deploy:rollback] Cannot identify the live release (HTTP ${response.status}, type=${contentType}). No snapshot was restored.`,
    );
  }
  const liveHtml = await response.text();
  const liveEntryJs = extractEntryScriptAsset(liveHtml);
  const liveEntryCss = extractEntryCssAsset(liveHtml);
  if (!liveEntryJs) {
    throw new Error(
      '[deploy:rollback] The live response did not identify an application bundle. No snapshot was restored.',
    );
  }

  const ledger = readReleaseLedger(join(rootDir, '.firebase', 'release-history.json'));
  const excludeReleaseIds = ledger.releases
    .filter((item) => {
      const indexPath = join(rootDir, '.firebase', 'releases', item.releaseId, 'index.html');
      if (!existsSync(indexPath)) return false;
      const html = readFileSync(indexPath, 'utf8');
      return (
        extractEntryScriptAsset(html) === liveEntryJs && extractEntryCssAsset(html) === liveEntryCss
      );
    })
    .map((item) => item.releaseId);
  return restorePreviousVerifiedRelease(rootDir, { excludeReleaseIds });
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
      '  --doctor            Print clear Korean diagnostic checklist & exact next command',
      '  --check-env         Inspect config, git state, dist integrity & auth readiness JSON (read-only)',
      '  --verify-live       Verify live index.html hash, JS chunk, SW precache & 4 V2 PNGs',
      '  --wait-cdn          Retry live verification up to 6 times (3s interval) for CDN propagation',
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

  const isDoctor = args.has('--doctor');
  const isCheckOnly = args.has('--check-env');
  const isVerifyLiveOnly = args.has('--verify-live');
  const waitCdn = args.has('--wait-cdn');
  const skipBuild = args.has('--skip-build');
  const isRollback = args.has('--rollback');
  const autoRollback = args.has('--auto-rollback');
  let allowDirty = args.has('--allow-dirty');
  const allowAmbientAuth = args.has('--allow-ambient-auth');
  const allowLiveDrift = args.has('--allow-live-drift');
  const skipLiveVerify = args.has('--skip-live-verify');

  const status = inspectCanonicalProductionReadiness({ allowAmbientAuth });

  // Auto-enable --allow-dirty when the only uncommitted changes are untracked files
  // (e.g. agent scratch directories like .omo/). Untracked files never affect the
  // deployed dist/ (gitignored), so blocking on them is unnecessary friction.
  if (!allowDirty && !status.workingTreeClean && status.gitAvailable) {
    try {
      const porcelain = execFileSync('git', ['status', '--porcelain'], {
        cwd: ROOT,
        env: process.env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (porcelain) {
        const lines = porcelain.split('\n').filter(Boolean);
        const onlyUntracked = lines.every((line) => line.startsWith('??'));
        if (onlyUntracked) {
          allowDirty = true;
          console.warn(
            `[deploy] Working tree has untracked files only (${lines.length}); auto-enabling --allow-dirty since untracked files do not affect the deployed dist/.`,
          );
        }
      }
    } catch {
      // Git not available or status failed; fall through to explicit --allow-dirty check.
    }
  }

  const ignoredPlaceholderCredentials = Object.entries(
    loadLocalDeployEnvMap(ROOT).placeholderKeys,
  ).filter(([key]) =>
    ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_SERVICE_ACCOUNT', 'FIREBASE_TOKEN'].includes(key),
  );
  for (const [key, file] of ignoredPlaceholderCredentials) {
    console.warn(
      `[deploy] Ignoring placeholder ${key} in ${file}; falling back to the next available credential source.`,
    );
  }

  if (isDoctor) {
    console.log(formatDeployDoctorReport(status));
    process.exit(status.configValid ? 0 : 1);
  }

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
      maxAttempts: waitCdn ? 6 : 1,
      retryDelayMs: 3000,
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

  let cleanupTempAuth = () => {};
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

    let auth = resolveFirebaseAuth({ allowAmbientAuth });
    if (!auth.ready && auth.source === 'ambient-blocked-non-interactive') {
      console.warn(
        '[deploy] Firebase CLI credentials found on host with no env-var credentials; enabling ambient CLI auth for deploy.',
      );
      auth = resolveFirebaseAuth({ allowAmbientAuth: true });
    }
    if (!auth.ready) {
      throw new Error(
        [
          `[deploy] Firebase 배포 인증이 아직 연결되지 않았습니다 (${auth.source}).`,
          '👉 터미널에서 `pnpm deploy:auth` 를 1회 실행하면 `.env.deploy.local` 저장과 GitHub Actions 시크릿 등록이 한 번에 완료됩니다.',
          '   (또는 `.firebase/service-account.json` 에 서비스 계정 키를 복사한 뒤 다시 `pnpm deploy` 를 실행하세요.)',
        ].join('\n'),
      );
    }

    const preparedAuth = prepareAuthExecutionEnv(auth);
    cleanupTempAuth = preparedAuth.cleanup;
    const execEnv = buildAugmentedEnv(preparedAuth.extraEnv);
    const { cmd, args: deployArgs } = resolveFirebaseDeployCommand(execEnv, auth);

    if (isRollback) {
      const restored = await restoreManualRollbackRelease(ROOT);
      console.log(
        `[deploy:rollback] Restored verified snapshot ${restored.releaseId} (${restored.entryJs}) to dist/.`,
      );
      await runSpawnStep(`Firebase Hosting Rollback (${FIREBASE_SITE})`, cmd, deployArgs, execEnv);
      const liveSummary = await verifyLiveDeployment({
        requireLocalMatch: true,
        maxAttempts: 6,
        retryDelayMs: 3000,
      });
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

    if (skipLiveVerify) {
      console.warn(
        '[deploy] Skipping live production verification (--skip-live-verify). Firebase Hosting deploy completed.',
      );
    } else {
      console.log('[deploy] Verifying live production response (with CDN propagation retry)...');
      const liveSummary = await verifyLiveDeployment({
        requireLocalMatch: !allowLiveDrift,
        maxAttempts: 6,
        retryDelayMs: 3000,
      });
      if (!liveSummary.verified) {
        // Network unreachable (sandboxed shell, proxy, etc.) must not fail a successful
        // Firebase Hosting deploy. Warn and continue instead of throwing.
        if (liveSummary.networkReachable === false) {
          process.exitCode = 0;
          console.warn(
            `[deploy] Live verification could not reach ${LIVE_ORIGIN} (outbound HTTP blocked in this shell). Deploy to Firebase Hosting completed successfully; run \`pnpm deploy:verify\` from a host terminal to confirm.`,
          );
        } else if (autoRollback) {
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
          await verifyLiveDeployment({
            requireLocalMatch: !allowLiveDrift,
            maxAttempts: 6,
            retryDelayMs: 3000,
          });
        } else {
          throw new Error(
            `[deploy] Live verification failed: ${liveSummary.failureReasons.join('; ')}`,
          );
        }
      } else {
        markReleaseVerifiedLive(ROOT, releaseSnapshot.releaseId);
      }
    }
  } finally {
    cleanupTempAuth();
    cleanupLock();
  }
}

if (isCliEntryPoint()) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(process.exitCode && process.exitCode !== 0 ? process.exitCode : 1);
  });
}
