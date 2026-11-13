#!/usr/bin/env node
// Reuse this checkout's deployment auth from IDEs and other local apps.
import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FIREBASE_PROJECT,
  FIREBASE_SITE,
  FIREBASE_TOOLS_PACKAGE,
  ROOT,
  buildAugmentedEnv,
  firebaseCliEnvironment,
  prepareAuthExecutionEnv,
  resolveExecutable,
  resolveFirebaseAuth,
} from './deploy-universal.mjs';

export function canonicalFirebaseArgs(rawArgs) {
  const args = rawArgs[0] === '--' ? rawArgs.slice(1) : [...rawArgs];
  const readCommands = new Set([
    'projects:list',
    'hosting:sites:list',
    'hosting:channel:list',
    'apps:list',
    '--version',
    '--help',
    '-h',
  ]);
  if (!readCommands.has(args[0])) {
    throw new Error(
      '[firebase:local] 이 실행기는 Firebase 조회용입니다. 운영 배포는 pnpm run deploy를 사용하세요.',
    );
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--token' || arg.startsWith('--token=')) {
      throw new Error(
        '[firebase:local] 인증은 로컬 env에서 자동으로 읽습니다. --token 인자는 사용하지 마세요.',
      );
    }
    if (arg === '--project' || arg === '-P') {
      if (args[index + 1] !== FIREBASE_PROJECT) {
        throw new Error(
          '[firebase:local] 이 실행기는 기존 deskcloud-fleet-auth 프로젝트 전용입니다.',
        );
      }
      index += 1;
    } else if (arg.startsWith('--project=') || (arg.startsWith('-P') && arg.length > 2)) {
      const project = arg.startsWith('--project=') ? arg.slice(10) : arg.slice(2);
      if (project !== FIREBASE_PROJECT) {
        throw new Error(
          '[firebase:local] 이 실행기는 기존 deskcloud-fleet-auth 프로젝트 전용입니다.',
        );
      }
    }
  }
  return [...args, '--project', FIREBASE_PROJECT];
}

export function prepareLocalFirebaseCli(
  rawArgs,
  { rootDir = ROOT, env = process.env, resolveBin = resolveExecutable } = {},
) {
  const args = canonicalFirebaseArgs(rawArgs);
  const baseEnv = buildAugmentedEnv({}, rootDir, env);
  const auth = resolveFirebaseAuth({ rootDir, env: baseEnv, allowAmbientAuth: true });
  if (!auth.ready) {
    throw new Error(
      '[firebase:local] 로컬 배포 인증이 없습니다. pnpm deploy:auth:local을 먼저 실행하세요.',
    );
  }
  const prepared = prepareAuthExecutionEnv(auth);
  try {
    const childEnv = firebaseCliEnvironment(
      buildAugmentedEnv(prepared.extraEnv, rootDir, baseEnv),
      prepared.extraEnv,
      rootDir,
    );
    const firebase = resolveBin('firebase', childEnv);
    const npx = firebase ? null : resolveBin('npx', childEnv);
    if (!firebase && !npx) {
      throw new Error(
        '[firebase:local] npx를 찾지 못했습니다. scripts/deploy.sh --firebase로 실행하거나 Node.js 설치를 확인하세요.',
      );
    }
    return {
      command: firebase || npx,
      args: [...(firebase ? [] : ['--yes', FIREBASE_TOOLS_PACKAGE]), ...args, '--non-interactive'],
      env: childEnv,
      cwd: rootDir,
      cleanup: prepared.cleanup,
    };
  } catch (error) {
    prepared.cleanup();
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || (args.length === 1 && ['--help', '-h'].includes(args[0]))) {
    console.log(
      [
        '로컬 Firebase 실행기: 기존 인증을 자동으로 읽으며 비밀값을 출력하지 않습니다.',
        `대상: ${FIREBASE_PROJECT} / ${FIREBASE_SITE}`,
        '사용법: pnpm firebase:local <Firebase 명령>',
        '조회 예: pnpm firebase:local hosting:sites:list',
        '다른 앱: bash /절대경로/pilates-flow/scripts/deploy.sh --firebase hosting:sites:list',
        '운영 배포: pnpm run deploy (빌드·스냅샷·운영 검증 포함)',
      ].join('\n'),
    );
    return;
  }
  const invocation = prepareLocalFirebaseCli(args);
  try {
    const code = await new Promise((resolve, reject) => {
      const child = spawn(invocation.command, invocation.args, {
        cwd: invocation.cwd,
        env: invocation.env,
        stdio: 'inherit',
      });
      const forwardSignal = (signal) => child.kill(signal);
      const onInt = () => forwardSignal('SIGINT');
      const onTerm = () => forwardSignal('SIGTERM');
      process.on('SIGINT', onInt);
      process.on('SIGTERM', onTerm);
      const removeHandlers = () => {
        process.off('SIGINT', onInt);
        process.off('SIGTERM', onTerm);
      };
      child.once('error', () => {
        removeHandlers();
        reject(new Error('[firebase:local] Firebase CLI를 시작하지 못했습니다.'));
      });
      child.once('close', (exitCode, signal) => {
        removeHandlers();
        resolve(exitCode ?? (signal === 'SIGINT' ? 130 : 143));
      });
    });
    process.exitCode = code;
  } finally {
    invocation.cleanup();
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    // Only our fixed diagnostics may reach the terminal, never argv or subprocess errors.
    console.error(
      error instanceof Error && error.message.startsWith('[firebase:local]')
        ? error.message
        : '[firebase:local] 실행하지 못했습니다. 로컬 인증과 Node.js 설치를 확인하세요.',
    );
    process.exitCode = 1;
  });
}
