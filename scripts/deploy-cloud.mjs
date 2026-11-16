#!/usr/bin/env node
/**
 * Cloud-Native GitHub Actions Deployment Trigger & Monitor (`scripts/deploy-cloud.mjs`)
 *
 * Enables 1-command production deployment & status inspection from cloud workspaces,
 * fresh clones, Codespaces, or git worktrees where local `.env.deploy.local` is absent:
 *   pnpm deploy:cloud              # Run quality checks and build on `main` without upload
 *   pnpm deploy:cloud --watch      # Run checks/build and watch that run
 *   pnpm deploy:cloud --deploy-to-production --watch # Explicitly approved production deploy
 *   pnpm deploy:cloud --build-only # Trigger CI quality gate + build without Hosting upload
 *   pnpm deploy:cloud --status     # Show latest CI runs, remote auth/WIF readiness & live status
 */
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FIREBASE_PROJECT,
  FIREBASE_SITE,
  LIVE_ORIGIN,
  ROOT,
  buildAugmentedEnv,
  resolveExecutable,
  verifyLiveDeployment,
} from './deploy-universal.mjs';
import { GITHUB_REPO_SLUG } from './setup-deploy-auth.mjs';

const MODULE_PATH = realpathSync(fileURLToPath(import.meta.url));
export const WORKFLOW_FILE = 'deploy-production.yml';
export const ALLOWED_CLOUD_FLAGS = new Set([
  '--help',
  '-h',
  '--status',
  '--watch',
  '--build-only',
  '--deploy-to-production',
]);

export function parseCloudDeployArgs(rawArgs = process.argv.slice(2)) {
  const unknown = rawArgs.filter((arg) => !ALLOWED_CLOUD_FLAGS.has(arg));
  if (unknown.length > 0) {
    throw new Error(
      `[deploy:cloud] 지원하지 않는 옵션입니다 (${unknown.join(', ')}). --help로 사용법을 확인하세요.`,
    );
  }
  const flags = new Set(rawArgs);
  if (
    flags.has('--status') &&
    (flags.has('--watch') || flags.has('--build-only') || flags.has('--deploy-to-production'))
  ) {
    throw new Error('[deploy:cloud] --status는 단독으로 실행하세요.');
  }
  if (flags.has('--build-only') && flags.has('--deploy-to-production')) {
    throw new Error('[deploy:cloud] --build-only와 --deploy-to-production은 함께 사용할 수 없습니다.');
  }
  return {
    help: flags.has('--help') || flags.has('--h') || flags.has('-h'),
    statusOnly: flags.has('--status'),
    watch: flags.has('--watch'),
    deployToProduction: flags.has('--deploy-to-production'),
  };
}

export function resolveReadyGhCli(
  execEnv,
  { rootDir = ROOT, resolveBin = resolveExecutable, execFile = execFileSync } = {},
) {
  const ghBin = resolveBin('gh', execEnv);
  if (!ghBin) {
    throw new Error(
      '[deploy:cloud] GitHub CLI(`gh`)를 찾을 수 없습니다. 클라우드 웹에서는 GitHub Actions → Run workflow(main)를 사용하세요. 운영 배포는 별도 승인 후 입력을 명시적으로 선택하세요.',
    );
  }
  try {
    execFile(ghBin, ['auth', 'status'], {
      cwd: rootDir,
      env: execEnv,
      stdio: 'ignore',
    });
  } catch {
    throw new Error(
      '[deploy:cloud] GitHub CLI(`gh`) 로그인이 필요합니다 (`gh auth login` 또는 `GH_TOKEN` 환경변수 설정).',
    );
  }
  return ghBin;
}

export function inspectCloudDeployReadiness(
  execEnv,
  { rootDir = ROOT, resolveBin = resolveExecutable, execFile = execFileSync } = {},
) {
  const ghBin = resolveReadyGhCli(execEnv, { rootDir, resolveBin, execFile });

  let secretNames = [];
  try {
    const out = execFile(ghBin, ['secret', 'list', '--repo', GITHUB_REPO_SLUG], {
      cwd: rootDir,
      env: execEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    secretNames = out
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean);
  } catch {
    secretNames = [];
  }

  const variables = {};
  try {
    const out = execFile(
      ghBin,
      ['variable', 'list', '--repo', GITHUB_REPO_SLUG, '--json', 'name,value'],
      {
        cwd: rootDir,
        env: execEnv,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    for (const item of JSON.parse(out)) {
      if (item?.name) variables[item.name] = String(item.value ?? '');
    }
  } catch {
    // Ignore when variable listing is unavailable
  }

  let recentRuns = [];
  try {
    const out = execFile(
      ghBin,
      [
        'run',
        'list',
        '--repo',
        GITHUB_REPO_SLUG,
        '--workflow',
        WORKFLOW_FILE,
        '--limit',
        '5',
        '--json',
        'databaseId,status,conclusion,event,headBranch,createdAt,url',
      ],
      {
        cwd: rootDir,
        env: execEnv,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    recentRuns = JSON.parse(out);
  } catch {
    recentRuns = [];
  }

  const firebaseSecrets = secretNames.filter((name) =>
    [
      'FIREBASE_SERVICE_ACCOUNT',
      'FIREBASE_SERVICE_ACCOUNT_PILATES_FLOW_ATELIER',
      'FIREBASE_SERVICE_ACCOUNT_DESKCLOUD_FLEET_AUTH',
      'GCP_SA_KEY',
      'FIREBASE_TOKEN',
    ].includes(name),
  );
  const wifConfigured = Boolean(
    variables.GCP_WORKLOAD_IDENTITY_PROVIDER && variables.GCP_SERVICE_ACCOUNT_EMAIL,
  );
  // Variables alone cannot verify which workflow policy is deployed remotely.
  const autoDeployOnMainPush = null;

  return {
    repository: GITHUB_REPO_SLUG,
    workflow: WORKFLOW_FILE,
    project: FIREBASE_PROJECT,
    site: FIREBASE_SITE,
    liveOrigin: LIVE_ORIGIN,
    cloudAuthReady: wifConfigured || firebaseSecrets.length > 0,
    wifConfigured,
    configuredFirebaseSecrets: firebaseSecrets,
    autoDeployOnMainPush,
    recentRuns,
  };
}

function sleepMs(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export async function triggerCloudDeployment(
  { deployToProduction = false, watch = false } = {},
  {
    rootDir = ROOT,
    env = process.env,
    resolveBin = resolveExecutable,
    execFile = execFileSync,
  } = {},
) {
  if (typeof deployToProduction !== 'boolean') {
    throw new TypeError('[deploy:cloud] deployToProduction은 boolean이어야 합니다.');
  }
  const execEnv = buildAugmentedEnv({}, rootDir, env);
  const readiness = inspectCloudDeployReadiness(execEnv, { rootDir, resolveBin, execFile });
  if (deployToProduction && !readiness.cloudAuthReady) {
    throw new Error(
      [
        `[deploy:cloud] 원격 GitHub Actions(${GITHUB_REPO_SLUG})에 Firebase 배포 인증이 아직 설정되지 않았습니다.`,
        '👉 로컬 인증이 있는 환경에서 `pnpm deploy:auth --sync-github`를 1회 실행하거나 GitHub Secrets에 `FIREBASE_SERVICE_ACCOUNT`를 추가하세요.',
      ].join('\n'),
    );
  }

  const ghBin = resolveReadyGhCli(execEnv, { rootDir, resolveBin, execFile });
  const dispatchStartedAt = Date.now();
  execFile(
    ghBin,
    [
      'workflow',
      'run',
      WORKFLOW_FILE,
      '--repo',
      GITHUB_REPO_SLUG,
      '--ref',
      'main',
      '-f',
      `deploy_to_production=${deployToProduction ? 'true' : 'false'}`,
    ],
    {
      cwd: rootDir,
      env: execEnv,
      stdio: 'inherit',
    },
  );

  console.log(
    `✅ GitHub Actions 클라우드 워크플로를 실행했습니다 (${GITHUB_REPO_SLUG} · ref=main · deploy_to_production=${deployToProduction}).`,
  );
  console.log(`   실행 목록: https://github.com/${GITHUB_REPO_SLUG}/actions/workflows/${WORKFLOW_FILE}`);

  if (!watch) {
    return { triggered: true, watched: false, runId: null };
  }

  let matchedRun = null;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await sleepMs(3000);
    const updated = inspectCloudDeployReadiness(execEnv, { rootDir, resolveBin, execFile });
    matchedRun = updated.recentRuns.find((run) => {
      if (run.event !== 'workflow_dispatch') return false;
      const createdMs = Date.parse(run.createdAt || '');
      return Number.isFinite(createdMs) && createdMs >= dispatchStartedAt - 15000;
    });
    if (matchedRun?.databaseId) break;
  }

  if (!matchedRun?.databaseId) {
    console.warn(
      '[deploy:cloud] 방금 생성된 실행 ID를 아직 조회하지 못했습니다. 위 Actions 링크에서 진행 상태를 확인하세요.',
    );
    return { triggered: true, watched: false, runId: null };
  }

  console.log(`⏳ 워크플로 실행 스트리밍 중 (Run #${matchedRun.databaseId}): ${matchedRun.url ?? ''}`);
  execFile(
    ghBin,
    ['run', 'watch', String(matchedRun.databaseId), '--repo', GITHUB_REPO_SLUG, '--exit-status'],
    {
      cwd: rootDir,
      env: execEnv,
      stdio: 'inherit',
    },
  );

  if (deployToProduction) {
    console.log('🌐 운영 URL 응답 및 에셋 무결성을 확인합니다...');
    const liveSummary = await verifyLiveDeployment({
      requireLocalMatch: false,
      maxAttempts: 6,
      retryDelayMs: 3000,
    });
    if (!liveSummary.verified && liveSummary.networkReachable !== false) {
      throw new Error(
        `[deploy:cloud] 운영 URL 검증 실패: ${liveSummary.failureReasons.join('; ')}`,
      );
    }
  }

  return { triggered: true, watched: true, runId: matchedRun.databaseId };
}

function printHelp() {
  console.log(
    [
      '사용법: pnpm deploy:cloud [옵션]',
      '  (인자 없음)    GitHub Actions(main) 품질 검증/빌드만 실행 (운영 업로드 없음)',
      '  --watch       선택한 검증/빌드 또는 배포 실행이 끝날 때까지 대기',
      '  --deploy-to-production  별도 승인한 운영 배포를 명시적으로 요청 (--watch 병행 가능)',
      '  --build-only  운영 업로드 없이 원격 품질 게이트 및 프로덕션 번들 빌드만 실행',
      '  --status      원격 GitHub Secrets/WIF 준비 상태 및 최근 CI 실행 이력 조회',
    ].join('\n'),
  );
}

async function runCli() {
  const parsed = parseCloudDeployArgs(process.argv.slice(2));
  if (parsed.help) {
    printHelp();
    return;
  }
  const execEnv = buildAugmentedEnv({}, ROOT);
  if (parsed.statusOnly) {
    const status = inspectCloudDeployReadiness(execEnv);
    console.log('=== Pilates Flow 클라우드 배포 준비 상태 (로컬 .env 불필요 · 비밀값 미출력) ===');
    console.log(`• 대상 저장소 / 브랜치 : ${status.repository} (main)`);
    console.log(`• 대상 Firebase 호스팅 : ${status.site} (${status.project} -> ${status.liveOrigin})`);
    console.log(
      `• Keyless OIDC (WIF)  : ${status.wifConfigured ? '변수 등록됨 (유효성은 별도 확인)' : '미설정'}`,
    );
    console.log(
      `• GitHub 시크릿 인증  : ${status.configuredFirebaseSecrets.length > 0 ? `등록됨 ✅ (${status.configuredFirebaseSecrets.join(', ')})` : '미등록 ⚠️'}`,
    );
    console.log(
      '• 이 코드의 배포 정책 : 수동 명시 요청 (원격 workflow 적용 여부는 별도 확인)',
    );
    if (status.recentRuns.length > 0) {
      console.log('• 최근 워크플로 실행  :');
      for (const run of status.recentRuns.slice(0, 3)) {
        console.log(
          `  - #${run.databaseId} [${run.event}] ${run.status}/${run.conclusion ?? 'running'} (${run.createdAt})`,
        );
      }
    }
    return;
  }

  await triggerCloudDeployment({
    deployToProduction: parsed.deployToProduction,
    watch: parsed.watch,
  });
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
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
