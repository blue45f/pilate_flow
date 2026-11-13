#!/usr/bin/env node
/**
 * One-Step Firebase Deployment Auth & GitHub Actions Secret Setup (`scripts/setup-deploy-auth.mjs`)
 *
 * Solves "forgotten auth on new machines / CI / non-interactive tools" without ever printing secrets:
 *   pnpm deploy:auth:check                   # Read-only status of local env files, CLI login & GitHub Secrets
 *   pnpm deploy:auth:local                   # Reuse saved auth / existing CLI login locally, without issuing credentials
 *   pnpm deploy:info                         # Local status only, no GitHub queries
 *   pnpm deploy:auth                         # Reuse saved auth before considering interactive login
 *   pnpm deploy:auth ./service-account.json  # Copies key to `.firebase/service-account.json` (0600) + updates `.env.deploy.local` + syncs GitHub Secret
 *   pnpm deploy:auth --from-env              # Persists FIREBASE_TOKEN / GOOGLE_APPLICATION_CREDENTIALS from shell env into `.env.deploy.local`
 *   pnpm deploy:auth --sync-github           # Pushes already-saved local `.env.deploy.local` / `.firebase/service-account.json` to GitHub Actions Secrets
 */
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  FIREBASE_PROJECT,
  FIREBASE_SITE,
  FIREBASE_TOOLS_PACKAGE,
  LIVE_ORIGIN,
  ROOT,
  buildAugmentedEnv,
  inspectCanonicalProductionReadiness,
  loadLocalDeployEnvMap,
  isPlaceholderCredentialValue,
  parseServiceAccountJsonString,
  resolveExecutable,
  resolveFirebaseAuth,
} from './deploy-universal.mjs';

const MODULE_PATH = realpathSync(fileURLToPath(import.meta.url));
export const GITHUB_REPO_SLUG = 'blue45f/pilate_flow';

export function localDeployMetadata(rootDir = ROOT) {
  return {
    DEPLOY_PROJECT_ROOT: rootDir,
    DEPLOY_ENV_FILE: join(rootDir, '.env.deploy.local'),
    DEPLOY_LAUNCHER: join(rootDir, 'scripts', 'deploy.sh'),
    DEPLOY_GUIDE: join(rootDir, 'DEPLOYMENT.md'),
    FIREBASE_PROJECT_ID: FIREBASE_PROJECT,
    FIREBASE_HOSTING_SITE: FIREBASE_SITE,
    FIREBASE_HOSTING_URL: LIVE_ORIGIN,
    DEPLOY_BRANCH: 'main',
    DEPLOY_REPOSITORY: `https://github.com/${GITHUB_REPO_SLUG}`,
    DEPLOY_NODE_BIN: process.execPath,
    DEPLOY_FIREBASE_TOOLS_PACKAGE: FIREBASE_TOOLS_PACKAGE,
  };
}

export function saveLocalDeployConfiguration(entries = {}, rootDir = ROOT) {
  const envFilePath = join(rootDir, '.env.deploy.local');
  upsertEnvFileEntries(envFilePath, { ...localDeployMetadata(rootDir), ...entries });
  return envFilePath;
}

/** Reuse a CLI session locally; never run login:ci or upload a credential. */
export function reuseExistingFirebaseLogin(
  rootDir = ROOT,
  { homeDir = homedir(), env = process.env } = {},
) {
  const configHome = env.XDG_CONFIG_HOME || join(homeDir, '.config');
  const sourceFile = join(configHome, 'configstore', 'firebase-tools.json');
  let config;
  try {
    config = JSON.parse(readFileSync(sourceFile, 'utf8'));
  } catch {
    throw new Error(
      '[deploy:auth] 재사용할 Firebase CLI 로그인을 찾지 못했습니다. 기존 JSON 파일 또는 --from-env --local-only를 사용하세요.',
    );
  }
  const token = config.tokens?.refresh_token;
  if (typeof token !== 'string' || !token.trim() || isPlaceholderCredentialValue(token)) {
    throw new Error('[deploy:auth] 기존 Firebase CLI 로그인에 재사용할 인증 토큰이 없습니다.');
  }
  const envFilePath = saveLocalDeployConfiguration({ FIREBASE_TOKEN: token.trim() }, rootDir);
  return { envFilePath, account: config.user?.email ?? null };
}

/** Persist shell-only credentials as well as already-saved local credentials. */
export function reuseLocalDeploymentAuth(rootDir = ROOT, env = process.env) {
  const homeDir = env.HOME || homedir();
  // Saving reusable project auth must not treat an interactive ambient login as
  // already persisted: the next IDE/app may run without a TTY or that cache.
  const local = resolveFirebaseAuth({
    rootDir,
    env: {},
    homeDir,
    isInteractive: false,
    allowAmbientAuth: false,
  });
  if (local.ready) {
    saveLocalDeployConfiguration({}, rootDir);
    return { source: local.source };
  }
  const explicit = resolveFirebaseAuth({
    rootDir,
    env,
    homeDir,
    isInteractive: false,
    allowAmbientAuth: false,
  });
  if (explicit.ready && explicit.source.startsWith('env:')) {
    const entries = explicit.extraEnv.GOOGLE_APPLICATION_CREDENTIALS
      ? { GOOGLE_APPLICATION_CREDENTIALS: explicit.extraEnv.GOOGLE_APPLICATION_CREDENTIALS }
      : explicit.inlineServiceAccountJson
        ? { FIREBASE_SERVICE_ACCOUNT: explicit.inlineServiceAccountJson }
        : { FIREBASE_TOKEN: explicit.extraEnv.FIREBASE_TOKEN };
    saveLocalDeployConfiguration(entries, rootDir);
    return { source: explicit.source };
  }
  const ambient = resolveFirebaseAuth({
    rootDir,
    env,
    homeDir,
    allowAmbientAuth: true,
  });
  if (ambient.extraEnv.GOOGLE_APPLICATION_CREDENTIALS) {
    saveLocalDeployConfiguration(
      {
        GOOGLE_APPLICATION_CREDENTIALS: ambient.extraEnv.GOOGLE_APPLICATION_CREDENTIALS,
      },
      rootDir,
    );
    return { source: ambient.source };
  }
  const saved = reuseExistingFirebaseLogin(rootDir, { env, homeDir });
  return { source: 'existing-firebase-cli-login', account: saved.account };
}

/**
 * Safely upsert key-value pairs into a local `.env` file with 0600 permissions while preserving comments & unrelated keys.
 */
export function upsertEnvFileEntries(envFilePath, entries) {
  const existingLines = existsSync(envFilePath)
    ? readFileSync(envFilePath, 'utf8').split(/\r?\n/)
    : [
        '# Pilates Flow Atelier — 로컬 전용 배포 인증 파일 (.env.deploy.local)',
        '# 이 파일은 .gitignore(*.local, .env.*)에 의해 Git 커밋에서 항상 제외됩니다.',
        '',
      ];

  const remainingKeys = new Set(Object.keys(entries));
  const updatedLines = existingLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) return line;
    const key = line.slice(0, eqIndex).trim();
    if (!Object.prototype.hasOwnProperty.call(entries, key)) return line;
    remainingKeys.delete(key);
    const rawVal = String(entries[key] ?? '');
    return `${key}=${formatEnvValue(rawVal)}`;
  });

  for (const key of remainingKeys) {
    const rawVal = String(entries[key] ?? '');
    updatedLines.push(`${key}=${formatEnvValue(rawVal)}`);
  }

  const normalized = updatedLines.join('\n').replace(/\n+$/, '\n');
  writeFileSync(envFilePath, normalized, { encoding: 'utf8', mode: 0o600 });
  try {
    chmodSync(envFilePath, 0o600);
  } catch {
    // Windows / restricted FS best-effort
  }
}

function formatEnvValue(val) {
  if (!val) return '';
  if (/[\s#"']/.test(val)) {
    return JSON.stringify(val);
  }
  return val;
}

/**
 * Validate and copy a Firebase/GCP service account JSON file into `.firebase/service-account.json` (0600)
 * and register `GOOGLE_APPLICATION_CREDENTIALS=.firebase/service-account.json` in `.env.deploy.local`.
 */
export function importServiceAccountFile(sourceFilePath, rootDir = ROOT) {
  const absSource = resolve(sourceFilePath);
  if (!existsSync(absSource)) {
    throw new Error(`[deploy:auth] 서비스 계정 파일을 찾을 수 없습니다: ${absSource}`);
  }
  const raw = readFileSync(absSource, 'utf8');
  const parsed = parseServiceAccountJsonString(raw);
  if (!parsed) {
    throw new Error(
      '[deploy:auth] 유효한 Google Cloud / Firebase 서비스 계정 JSON 형식이 아닙니다 ("type": "service_account" 및 "private_key" 필요).',
    );
  }

  const firebaseDir = join(rootDir, '.firebase');
  mkdirSync(firebaseDir, { recursive: true, mode: 0o700 });
  const targetRel = '.firebase/service-account.json';
  const targetAbs = join(rootDir, targetRel);
  if (resolve(absSource) !== resolve(targetAbs)) {
    copyFileSync(absSource, targetAbs);
  }
  try {
    chmodSync(targetAbs, 0o600);
  } catch {
    // Best effort
  }

  const envLocalPath = join(rootDir, '.env.deploy.local');
  saveLocalDeployConfiguration(
    {
      GOOGLE_APPLICATION_CREDENTIALS: targetRel,
    },
    rootDir,
  );

  return {
    projectId: parsed.project_id ?? null,
    targetRel,
    envFilePath: envLocalPath,
    rawJson: raw,
  };
}

function inspectGitHubSecretsStatus(execEnv, rootDir = ROOT) {
  const ghBin = resolveExecutable('gh', execEnv);
  if (!ghBin) {
    return { ghInstalled: false, ghAuthenticated: false, configuredSecrets: [] };
  }
  try {
    execFileSync(ghBin, ['auth', 'status'], {
      cwd: rootDir,
      env: execEnv,
      stdio: 'ignore',
    });
  } catch {
    return { ghInstalled: true, ghAuthenticated: false, configuredSecrets: [] };
  }

  try {
    const out = execFileSync(ghBin, ['secret', 'list', '--repo', GITHUB_REPO_SLUG], {
      cwd: rootDir,
      env: execEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const names = out
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean);
    return { ghInstalled: true, ghAuthenticated: true, configuredSecrets: names };
  } catch {
    return { ghInstalled: true, ghAuthenticated: true, configuredSecrets: [] };
  }
}

function pushGitHubSecret(ghBin, secretName, secretValue, execEnv, rootDir = ROOT) {
  execFileSync(ghBin, ['secret', 'set', secretName, '--repo', GITHUB_REPO_SLUG], {
    cwd: rootDir,
    env: execEnv,
    input: secretValue,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

function syncCredentialsToGitHubActions(
  { serviceAccountJson = '', firebaseToken = '' },
  execEnv,
  rootDir = ROOT,
) {
  if (serviceAccountJson) {
    const parsed = parseServiceAccountJsonString(serviceAccountJson);
    if (!parsed) {
      throw new Error(
        '[deploy:auth] GitHub Actions에는 유효한 service_account JSON만 등록할 수 있습니다. gcloud 사용자 ADC는 로컬 전용 ADC이므로 업로드하지 않습니다. 기존 서비스 계정 JSON 또는 Firebase 토큰을 사용하세요.',
      );
    }
    serviceAccountJson = parsed.normalizedJson;
  }
  const ghBin = resolveExecutable('gh', execEnv);
  if (!ghBin) {
    console.log(
      [
        '',
        'ℹ️ GitHub CLI(`gh`)가 설치되어 있지 않아 GitHub Actions 시크릿 자동 등록은 건너뛰었습니다.',
        `   수동 등록 경로: https://github.com/${GITHUB_REPO_SLUG}/settings/secrets/actions`,
        '   등록할 Secret 이름: `FIREBASE_SERVICE_ACCOUNT` (권장) 또는 `FIREBASE_TOKEN`',
      ].join('\n'),
    );
    return false;
  }

  try {
    execFileSync(ghBin, ['auth', 'status'], { cwd: rootDir, env: execEnv, stdio: 'ignore' });
  } catch {
    console.log(
      [
        '',
        'ℹ️ GitHub CLI(`gh`) 로그인이 되어 있지 않아 원격 시크릿 자동 등록을 건너뛰었습니다.',
        '   `gh auth login` 후 `pnpm deploy:auth --sync-github` 를 실행하면 자동 등록됩니다.',
        `   또는 웹에서 등록: https://github.com/${GITHUB_REPO_SLUG}/settings/secrets/actions`,
      ].join('\n'),
    );
    return false;
  }

  if (serviceAccountJson) {
    pushGitHubSecret(ghBin, 'FIREBASE_SERVICE_ACCOUNT', serviceAccountJson, execEnv, rootDir);
    console.log(
      `✅ GitHub Actions 시크릿 등록 완료: FIREBASE_SERVICE_ACCOUNT (${GITHUB_REPO_SLUG})`,
    );
    return true;
  }
  if (firebaseToken) {
    pushGitHubSecret(ghBin, 'FIREBASE_TOKEN', firebaseToken, execEnv, rootDir);
    console.log(`✅ GitHub Actions 시크릿 등록 완료: FIREBASE_TOKEN (${GITHUB_REPO_SLUG})`);
    return true;
  }
  return false;
}

function extractCiTokenFromOutput(combinedOutput) {
  const cleaned = combinedOutput.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  const match = cleaned.match(/\b(1\/\/[A-Za-z0-9_-]{20,})\b/);
  return match ? match[1] : null;
}

function runInteractiveFirebaseLoginCi(execEnv, rootDir = ROOT) {
  const firebaseBin = resolveExecutable('firebase', execEnv);
  const npxBin = resolveExecutable('npx', execEnv);
  const cmd = firebaseBin || npxBin;
  const args = firebaseBin ? ['login:ci'] : ['--yes', FIREBASE_TOOLS_PACKAGE, 'login:ci'];

  if (!cmd) {
    throw new Error('[deploy:auth] `firebase` 또는 `npx` 실행 파일을 찾을 수 없습니다.');
  }

  return new Promise((resolvePromise, rejectPromise) => {
    console.log(
      `\n🔐 브라우저에서 Firebase 계정(${FIREBASE_PROJECT} / ${FIREBASE_SITE}) 로그인을 완료해 주세요...\n`,
    );
    let capturedStdout = '';
    const child = spawn(cmd, args, {
      cwd: rootDir,
      env: execEnv,
      stdio: ['inherit', 'pipe', 'inherit'],
    });
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      capturedStdout += text;
      const masked = text.replace(/\b1\/\/[A-Za-z0-9_-]{20,}\b/g, '1//[SAVED_TO_ENV_DEPLOY_LOCAL]');
      process.stdout.write(masked);
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(new Error(`[deploy:auth] firebase login:ci 종료 코드: ${code}`));
        return;
      }
      const token = extractCiTokenFromOutput(capturedStdout);
      if (!token) {
        rejectPromise(
          new Error(
            '[deploy:auth] 로그인 출력에서 Firebase CI 토큰(1//...)을 감지하지 못했습니다.',
          ),
        );
        return;
      }
      resolvePromise(token);
    });
  });
}

export function printAuthStatus(rootDir = ROOT, { localOnly = false } = {}) {
  const execEnv = buildAugmentedEnv({}, rootDir);
  const readiness = inspectCanonicalProductionReadiness({
    rootDir,
    env: execEnv,
    allowAmbientAuth: true,
  });
  const nonInteractiveReadiness = inspectCanonicalProductionReadiness({
    rootDir,
    env: execEnv,
    allowAmbientAuth: false,
  });
  const localEnv = loadLocalDeployEnvMap(rootDir);
  const autoSaExists = existsSync(join(rootDir, '.firebase', 'service-account.json'));
  const ghStatus = localOnly
    ? { skipped: true, configuredSecrets: [] }
    : inspectGitHubSecretsStatus(execEnv, rootDir);
  const firebaseSecretNames = [
    'FIREBASE_SERVICE_ACCOUNT',
    'FIREBASE_SERVICE_ACCOUNT_PILATES_FLOW_ATELIER',
    'FIREBASE_SERVICE_ACCOUNT_DESKCLOUD_FLEET_AUTH',
    'GCP_SA_KEY',
    'FIREBASE_TOKEN',
  ];
  const matchedGhSecrets = ghStatus.configuredSecrets.filter((name) =>
    firebaseSecretNames.includes(name),
  );

  console.log('=== Pilates Flow 배포 인증 점검 (비밀값 미출력) ===');
  console.log(`• 대상 호스팅: ${FIREBASE_SITE} (프로젝트: ${FIREBASE_PROJECT})`);
  console.log(
    `• 로컬 비대화형 인증(.env.deploy.local / 서비스계정): ${nonInteractiveReadiness.firebaseAuthReady ? `준비됨 ✅ (${nonInteractiveReadiness.firebaseAuthSource})` : '미설정 ⚠️'}`,
  );
  console.log(
    `• 대화형 터미널 인증(firebase login 포함): ${readiness.firebaseAuthReady ? `준비됨 ✅ (${readiness.firebaseAuthSource})` : '미설정 ⚠️'}`,
  );
  console.log(`• .firebase/service-account.json 파일: ${autoSaExists ? '존재함 ✅' : '없음'}`);
  console.log(
    `• 로컬 env 키 감지 여부: GOOGLE_APPLICATION_CREDENTIALS=${Boolean(localEnv.values.GOOGLE_APPLICATION_CREDENTIALS)}, FIREBASE_SERVICE_ACCOUNT=${Boolean(localEnv.values.FIREBASE_SERVICE_ACCOUNT)}, FIREBASE_TOKEN=${Boolean(localEnv.values.FIREBASE_TOKEN)}`,
  );
  if (ghStatus.skipped) {
    console.log('• GitHub Actions 시크릿: 조회 생략 (로컬 전용 점검)');
  } else if (!ghStatus.ghInstalled) {
    console.log('• GitHub Actions 시크릿: 미검증 (`gh` CLI 미설치)');
  } else if (!ghStatus.ghAuthenticated) {
    console.log('• GitHub Actions 시크릿: 미검증 (`gh auth login` 필요)');
  } else {
    console.log(
      `• GitHub Actions 시크릿(${GITHUB_REPO_SLUG}): ${matchedGhSecrets.length > 0 ? `등록됨 ✅ (${matchedGhSecrets.join(', ')})` : '미등록 ⚠️'}`,
    );
  }
  console.log('');
  if (!nonInteractiveReadiness.firebaseAuthReady) {
    console.log('👉 권장 1회 설정 명령 (터미널에서 실행):');
    console.log(
      '   pnpm deploy:auth:local                    # 기존 Firebase CLI 로그인 재사용 · 로컬에만 저장',
    );
    console.log(
      '   pnpm deploy:auth ./service-account.json --local-only  # 기존 JSON 파일을 로컬에만 등록',
    );
  } else {
    console.log('👉 이제 어떤 터미널이나 AI 에이전트에서도 `pnpm run deploy` 한 줄로 즉시 배포됩니다.');
  }
}

async function runAuthCli() {
  const rawArgs = process.argv.slice(2);
  const supportedFlags = new Set([
    '--help',
    '-h',
    '--status',
    '--service-account',
    '--from-env',
    '--sync-github',
    '--local-only',
    '--reuse-login',
  ]);
  for (const arg of rawArgs) {
    if (arg.startsWith('-') && !supportedFlags.has(arg)) {
      throw new Error('[deploy:auth] 지원하지 않는 옵션입니다. --help로 사용법을 확인하세요.');
    }
  }
  const localOnly = rawArgs.includes('--local-only');
  if (localOnly && rawArgs.includes('--sync-github')) {
    throw new Error('[deploy:auth] --local-only와 --sync-github는 함께 사용할 수 없습니다.');
  }
  const exclusiveModes = ['--status', '--reuse-login', '--from-env', '--sync-github'];
  if (exclusiveModes.filter((flag) => rawArgs.includes(flag)).length > 1) {
    throw new Error(
      '[deploy:auth] 인증 작업 옵션은 한 번에 하나만 사용하세요. --help로 사용법을 확인하세요.',
    );
  }
  const saFlagIdx = rawArgs.indexOf('--service-account');
  if (saFlagIdx >= 0 && (!rawArgs[saFlagIdx + 1] || rawArgs[saFlagIdx + 1].startsWith('-'))) {
    throw new Error('[deploy:auth] --service-account 뒤에 기존 JSON 파일 경로가 필요합니다.');
  }
  const positionalArgs = rawArgs.filter((arg) => !arg.startsWith('-'));
  if (positionalArgs.length > 1 || positionalArgs.some((arg) => !arg.endsWith('.json'))) {
    throw new Error('[deploy:auth] 기존 서비스 계정 JSON 파일 하나만 지정할 수 있습니다.');
  }
  if (positionalArgs.length && exclusiveModes.some((flag) => rawArgs.includes(flag))) {
    throw new Error('[deploy:auth] JSON 파일 등록과 다른 인증 작업은 따로 실행하세요.');
  }
  const execEnv = buildAugmentedEnv({}, ROOT);
  const syncIfRequested = (credentials) =>
    localOnly ? false : syncCredentialsToGitHubActions(credentials, execEnv, ROOT);
  const showStatus = () => printAuthStatus(ROOT, { localOnly });

  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    console.log(
      [
        '사용법: pnpm deploy:auth [옵션 또는 서비스계정.json 경로]',
        '  --status                       로컬 env 및 GitHub Actions 인증 준비 상태 확인',
        '  --local-only                   GitHub 조회·업로드 없이 로컬에만 저장/점검',
        '  --reuse-login                  기존 Firebase CLI 로그인 재사용 (새 토큰 발급 없음)',
        '  <path/to/service-account.json> 서비스 계정 JSON을 .firebase/service-account.json 및 .env.deploy.local에 등록',
        '  --from-env                     현재 셸의 FIREBASE_TOKEN / GOOGLE_APPLICATION_CREDENTIALS를 .env.deploy.local에 저장',
        '  --sync-github                  로컬에 저장된 배포 인증을 GitHub Actions 시크릿에도 동기화',
        '  (인자 없음)                     저장된 인증이 있으면 재사용; 없을 때만 대화형 로그인',
      ].join('\n'),
    );
    return;
  }

  if (rawArgs.includes('--status')) {
    showStatus();
    return;
  }

  if (rawArgs.includes('--reuse-login')) {
    const saved = reuseLocalDeploymentAuth(ROOT, execEnv);
    console.log(
      `✅ 기존 인증을 로컬에서 재사용하도록 정리했습니다 (${saved.source}). 새 토큰은 발급하지 않았습니다.`,
    );
    showStatus();
    return;
  }

  const positionalJson = rawArgs.find((arg) => !arg.startsWith('-') && arg.endsWith('.json'));
  const saInputPath =
    saFlagIdx >= 0 && rawArgs[saFlagIdx + 1] ? rawArgs[saFlagIdx + 1] : positionalJson;

  if (saInputPath) {
    const imported = importServiceAccountFile(saInputPath, ROOT);
    console.log(
      `✅ 서비스 계정 등록 완료: ${imported.targetRel} 및 .env.deploy.local 업데이트됨 (project_id=${imported.projectId ?? 'unknown'})`,
    );
    syncIfRequested({ serviceAccountJson: imported.rawJson });
    showStatus();
    return;
  }

  if (rawArgs.includes('--from-env')) {
    const updates = {};
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const imported = importServiceAccountFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, ROOT);
      syncIfRequested({ serviceAccountJson: imported.rawJson });
      showStatus();
      return;
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const parsed = parseServiceAccountJsonString(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (!parsed) {
        throw new Error(
          '[deploy:auth] FIREBASE_SERVICE_ACCOUNT 환경변수가 올바른 서비스 계정 JSON/Base64가 아닙니다.',
        );
      }
      updates.FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    } else if (process.env.FIREBASE_TOKEN) {
      updates.FIREBASE_TOKEN = process.env.FIREBASE_TOKEN.trim();
    } else {
      throw new Error(
        '[deploy:auth] 현재 셸 환경변수에 GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT, FIREBASE_TOKEN 중 아무것도 설정되어 있지 않습니다.',
      );
    }
    saveLocalDeployConfiguration(updates, ROOT);
    console.log('✅ 현재 셸 환경변수를 .env.deploy.local (0600)에 저장했습니다.');
    syncIfRequested({
      serviceAccountJson: updates.FIREBASE_SERVICE_ACCOUNT ?? '',
      firebaseToken: updates.FIREBASE_TOKEN ?? '',
    });
    showStatus();
    return;
  }

  if (rawArgs.includes('--sync-github')) {
    const localEnv = loadLocalDeployEnvMap(ROOT);
    const autoSaPath = join(ROOT, '.firebase', 'service-account.json');
    const configuredGac = localEnv.values.GOOGLE_APPLICATION_CREDENTIALS
      ? resolve(ROOT, localEnv.values.GOOGLE_APPLICATION_CREDENTIALS)
      : existsSync(autoSaPath)
        ? autoSaPath
        : '';

    if (configuredGac && existsSync(configuredGac)) {
      const rawJson = readFileSync(configuredGac, 'utf8');
      syncCredentialsToGitHubActions({ serviceAccountJson: rawJson }, execEnv, ROOT);
      return;
    }
    if (localEnv.values.FIREBASE_SERVICE_ACCOUNT) {
      syncCredentialsToGitHubActions(
        { serviceAccountJson: localEnv.values.FIREBASE_SERVICE_ACCOUNT },
        execEnv,
        ROOT,
      );
      return;
    }
    if (localEnv.values.FIREBASE_TOKEN) {
      syncCredentialsToGitHubActions(
        { firebaseToken: localEnv.values.FIREBASE_TOKEN },
        execEnv,
        ROOT,
      );
      return;
    }
    throw new Error(
      '[deploy:auth] 로컬(.env.deploy.local 또는 .firebase/service-account.json)에 저장된 인증 정보가 없습니다. 먼저 `pnpm deploy:auth` 를 실행해 주세요.',
    );
  }

  const currentAuth = resolveFirebaseAuth({ rootDir: ROOT, env: execEnv, allowAmbientAuth: true });
  if (currentAuth.ready) {
    reuseLocalDeploymentAuth(ROOT, execEnv);
    console.log('✅ 기존 로컬 인증을 재사용합니다. 새 로그인이나 GitHub 변경은 없습니다.');
    showStatus();
    return;
  }

  if (localOnly) {
    throw new Error(
      '[deploy:auth] 로컬 인증이 없습니다. pnpm deploy:auth:local 또는 기존 JSON 파일과 --local-only를 사용하세요.',
    );
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    showStatus();
    throw new Error(
      '[deploy:auth] 비대화형 셸에서는 브라우저 로그인을 띄울 수 없습니다. 일반 터미널에서 `pnpm deploy:auth` 또는 `pnpm deploy:auth ./service-account.json` 을 1회 실행해 주세요.',
    );
  }

  const token = await runInteractiveFirebaseLoginCi(execEnv, ROOT);
  saveLocalDeployConfiguration({
    FIREBASE_TOKEN: token,
  });
  console.log(
    '\n✅ `.env.deploy.local` (권한 0600, Git 제외)에 FIREBASE_TOKEN이 영구 저장되었습니다.',
  );
  syncCredentialsToGitHubActions({ firebaseToken: token }, execEnv, ROOT);
  printAuthStatus(ROOT);
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === MODULE_PATH;
  } catch {
    return false;
  }
})();

if (isMain) {
  runAuthCli().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
