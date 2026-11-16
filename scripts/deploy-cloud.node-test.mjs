import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  WORKFLOW_FILE,
  inspectCloudDeployReadiness,
  parseCloudDeployArgs,
  triggerCloudDeployment,
} from './deploy-cloud.mjs';

test('parseCloudDeployArgs validates supported flags and rejects conflicting or unknown options', () => {
  assert.deepEqual(parseCloudDeployArgs([]), {
    help: false,
    statusOnly: false,
    watch: false,
    deployToProduction: false,
  });
  assert.deepEqual(parseCloudDeployArgs(['--watch']), {
    help: false,
    statusOnly: false,
    watch: true,
    deployToProduction: false,
  });
  assert.deepEqual(parseCloudDeployArgs(['--build-only']), {
    help: false,
    statusOnly: false,
    watch: false,
    deployToProduction: false,
  });
  assert.deepEqual(parseCloudDeployArgs(['--status']), {
    help: false,
    statusOnly: true,
    watch: false,
    deployToProduction: false,
  });
  assert.equal(parseCloudDeployArgs(['--deploy-to-production']).deployToProduction, true);
  assert.equal(parseCloudDeployArgs(['--deploy-to-production', '--watch']).deployToProduction, true);
  assert.throws(() => parseCloudDeployArgs(['--unknown']), /지원하지 않는 옵션/);
  assert.throws(
    () => parseCloudDeployArgs(['--status', '--deploy-to-production']),
    /단독으로 실행/,
  );
  assert.throws(
    () => parseCloudDeployArgs(['--build-only', '--deploy-to-production']),
    /함께 사용할 수 없습니다/,
  );
  assert.throws(() => parseCloudDeployArgs(['--status', '--watch']), /단독으로 실행/);
});

test('inspectCloudDeployReadiness detects both Keyless OIDC WIF and Firebase Secrets without touching local .env', () => {
  const status = inspectCloudDeployReadiness(
    { PATH: '/usr/bin' },
    {
      resolveBin: (name) => (name === 'gh' ? '/mock/gh' : null),
      execFile: (_bin, args) => {
        if (args[0] === 'auth') return '';
        if (args[0] === 'secret') {
          return 'FIREBASE_SERVICE_ACCOUNT\t2026-11-16T04:53:00Z\nFIREBASE_TOKEN\t2026-11-16T04:53:01Z\n';
        }
        if (args[0] === 'variable') {
          return JSON.stringify([
            {
              name: 'GCP_WORKLOAD_IDENTITY_PROVIDER',
              value: 'projects/123/locations/global/workloadIdentityPools/pool/providers/oidc',
            },
            {
              name: 'GCP_SERVICE_ACCOUNT_EMAIL',
              value: 'ci-deploy@example.iam.gserviceaccount.com',
            },
            { name: 'AUTO_DEPLOY_ON_MAIN_PUSH', value: 'true' },
          ]);
        }
        if (args[0] === 'run') {
          return JSON.stringify([
            {
              databaseId: 9001,
              status: 'completed',
              conclusion: 'success',
              event: 'push',
              headBranch: 'main',
              createdAt: '2026-11-16T04:55:00Z',
            },
          ]);
        }
        throw new Error(`Unexpected gh args: ${args.join(' ')}`);
      },
    },
  );

  assert.equal(status.cloudAuthReady, true);
  assert.equal(status.wifConfigured, true);
  assert.equal(status.autoDeployOnMainPush, null);
  assert.deepEqual(status.configuredFirebaseSecrets, [
    'FIREBASE_SERVICE_ACCOUNT',
    'FIREBASE_TOKEN',
  ]);
  assert.equal(status.recentRuns.length, 1);
});

test('triggerCloudDeployment dispatches deploy-production.yml on main without any local Firebase env', async () => {
  const recordedCalls = [];
  const result = await triggerCloudDeployment(
    { deployToProduction: true, watch: false },
    {
      env: { PATH: '/usr/bin' },
      resolveBin: (name) => (name === 'gh' ? '/mock/gh' : null),
      execFile: (_bin, args) => {
        recordedCalls.push(args);
        if (args[0] === 'auth') return '';
        if (args[0] === 'secret') return 'FIREBASE_SERVICE_ACCOUNT\t2026-11-16T04:53:00Z\n';
        if (args[0] === 'variable') return '[]';
        if (args[0] === 'run') return '[]';
        if (args[0] === 'workflow') return '';
        throw new Error(`Unexpected gh args: ${args.join(' ')}`);
      },
    },
  );

  assert.equal(result.triggered, true);
  const dispatchCall = recordedCalls.find((args) => args[0] === 'workflow');
  assert.deepEqual(dispatchCall, [
    'workflow',
    'run',
    WORKFLOW_FILE,
    '--repo',
    'blue45f/pilate_flow',
    '--ref',
    'main',
    '-f',
    'deploy_to_production=true',
  ]);
});

test('triggerCloudDeployment blocks live dispatch when neither WIF nor Firebase Secrets exist on GitHub', async () => {
  await assert.rejects(
    triggerCloudDeployment(
      { deployToProduction: true, watch: false },
      {
        env: { PATH: '/usr/bin' },
        resolveBin: (name) => (name === 'gh' ? '/mock/gh' : null),
        execFile: (_bin, args) => {
          if (args[0] === 'auth') return '';
          if (args[0] === 'secret') return '';
          if (args[0] === 'variable') return '[]';
          if (args[0] === 'run') return '[]';
          return '';
        },
      },
    ),
    /Firebase 배포 인증이 아직 설정되지 않았습니다/,
  );
});

test('default dispatch requests checks/build only even without Firebase credentials', async () => {
  const calls = [];
  await triggerCloudDeployment(undefined, {
    env: { PATH: '/usr/bin' },
    resolveBin: (name) => (name === 'gh' ? '/mock/gh' : null),
    execFile: (_bin, args) => {
      calls.push(args);
      if (args[0] === 'auth' || args[0] === 'secret' || args[0] === 'workflow') return '';
      if (args[0] === 'variable' || args[0] === 'run') return '[]';
      throw new Error(`Unexpected gh args: ${args.join(' ')}`);
    },
  });
  const dispatch = calls.find((args) => args[0] === 'workflow');
  assert.ok(dispatch);
  assert.equal(dispatch.at(-1), 'deploy_to_production=false');
});

test('non-boolean production requests fail before any external command', async () => {
  let called = false;
  await assert.rejects(
    triggerCloudDeployment({ deployToProduction: 'false' }, {
      execFile: () => { called = true; throw new Error('must not run'); },
    }),
    /boolean이어야 합니다/,
  );
  assert.equal(called, false);
});
