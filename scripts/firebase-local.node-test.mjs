import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { canonicalFirebaseArgs, prepareLocalFirebaseCli } from './firebase-local.mjs';
import { firebaseCliEnvironment } from './deploy-universal.mjs';

test('local Firebase launcher keeps the canonical project and refuses credentials in argv', () => {
  assert.deepEqual(canonicalFirebaseArgs(['--', 'hosting:sites:list']), [
    'hosting:sites:list',
    '--project',
    'deskcloud-fleet-auth',
  ]);
  for (const args of [
    ['projects:delete', 'another-project'],
    ['deploy'],
    ['hosting:sites:list', '--project', 'another-project'],
    ['hosting:sites:list', '--project=another-project'],
    ['hosting:sites:list', '-Panother-project'],
    ['hosting:sites:list', '--token', 'do-not-echo-this-value'],
    ['hosting:sites:list', '--token=do-not-echo-this-value'],
  ]) {
    assert.throws(
      () => canonicalFirebaseArgs(args),
      (error) => {
        assert.equal(error.message.includes('do-not-echo-this-value'), false);
        return true;
      },
    );
  }
});

test('another app can reuse local auth from an unrelated working directory without a token in argv', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pf-firebase-launcher-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const token = 'saved-session-for-launcher-test';
  writeFileSync(path.join(root, '.env.deploy.local'), `FIREBASE_TOKEN=${token}\n`);
  const invocation = prepareLocalFirebaseCli(['hosting:sites:list'], {
    rootDir: root,
    env: { PATH: '/usr/bin:/bin', HOME: root },
    resolveBin: (name) => (name === 'npx' ? '/test/npx' : null),
  });
  try {
    assert.equal(invocation.cwd, root);
    assert.equal(invocation.env.FIREBASE_TOKEN, token);
    assert.equal(invocation.env.XDG_CONFIG_HOME, path.join(root, '.firebase', 'cli-config'));
    assert.equal(
      invocation.args.some((arg) => arg.includes(token)),
      false,
    );
    assert.deepEqual(invocation.args.slice(0, 3), [
      '--yes',
      'firebase-tools@13.29.1',
      'hosting:sites:list',
    ]);
  } finally {
    invocation.cleanup();
  }
});

test('CLI config isolation preserves ambient login and explicit caller config paths', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pf-cli-config-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.equal(firebaseCliEnvironment({ PATH: '/usr/bin' }, {}, root).XDG_CONFIG_HOME, undefined);
  assert.equal(existsSync(path.join(root, '.firebase')), false);
  const configured = firebaseCliEnvironment(
    { FIREBASE_TOKEN: 'existing-session', XDG_CONFIG_HOME: '/caller-config' },
    { FIREBASE_TOKEN: 'existing-session' },
    root,
  );
  assert.equal(configured.XDG_CONFIG_HOME, '/caller-config');
  assert.equal(existsSync(path.join(root, '.firebase')), false);
});

test('an invalid ambient credential path cannot shadow a working local token', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pf-cli-stale-env-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, '.env.deploy.local'), 'FIREBASE_TOKEN=saved-working-session\n');
  const invocation = prepareLocalFirebaseCli(['hosting:sites:list'], {
    rootDir: root,
    env: {
      PATH: '/usr/bin:/bin',
      HOME: root,
      GOOGLE_APPLICATION_CREDENTIALS: path.join(root, 'missing.json'),
    },
    resolveBin: (name) => (name === 'npx' ? '/test/npx' : null),
  });
  try {
    assert.equal(invocation.env.FIREBASE_TOKEN, 'saved-working-session');
    assert.equal(invocation.env.GOOGLE_APPLICATION_CREDENTIALS, undefined);
  } finally {
    invocation.cleanup();
  }
});

test('ignored placeholder tokens cannot hide an ambient Firebase login', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pf-cli-ambient-env-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = firebaseCliEnvironment({ FIREBASE_TOKEN: '<your-token>' }, {}, root);
  assert.equal(env.FIREBASE_TOKEN, undefined);
  assert.equal(env.XDG_CONFIG_HOME, undefined);
});

test('service account selection clears an ambient legacy token and cleans its temporary file', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pf-firebase-sa-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const invocation = prepareLocalFirebaseCli(['hosting:sites:list'], {
    rootDir: root,
    env: {
      PATH: '/usr/bin:/bin',
      HOME: root,
      FIREBASE_TOKEN: 'ambient-legacy-session',
      FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
        type: 'service_account',
        client_email: 'deploy@example.invalid',
        private_key: 'synthetic-key',
      }),
    },
    resolveBin: (name) => (name === 'npx' ? '/test/npx' : null),
  });
  const credentialFile = invocation.env.GOOGLE_APPLICATION_CREDENTIALS;
  assert.ok(existsSync(credentialFile));
  assert.equal(invocation.env.FIREBASE_TOKEN, undefined);
  invocation.cleanup();
  assert.equal(existsSync(credentialFile), false);
});

test('a missing CLI releases temporary inline credentials before returning an error', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pf-firebase-no-cli-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let credentialFile;
  assert.throws(() =>
    prepareLocalFirebaseCli(['hosting:sites:list'], {
      rootDir: root,
      env: {
        PATH: '/usr/bin:/bin',
        HOME: root,
        FIREBASE_SERVICE_ACCOUNT: JSON.stringify({
          type: 'service_account',
          client_email: 'deploy@example.invalid',
          private_key: 'synthetic-key',
        }),
      },
      resolveBin: (_name, env) => {
        credentialFile = env.GOOGLE_APPLICATION_CREDENTIALS;
        return null;
      },
    }),
  );
  assert.equal(existsSync(credentialFile), false);
});
