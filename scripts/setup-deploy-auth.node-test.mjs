import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseEnvFileSafe } from './deploy-universal.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

function isolatedAuthCli(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pf-local-auth-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'scripts'));
  for (const name of ['setup-deploy-auth.mjs', 'deploy-universal.mjs', 'check-pwa-build.mjs']) {
    copyFileSync(path.join(scriptsDir, name), path.join(root, 'scripts', name));
  }
  const configHome = path.join(root, 'config');
  mkdirSync(path.join(configHome, 'configstore'), { recursive: true });
  const bin = path.join(root, 'bin');
  mkdirSync(bin);
  const ghMarker = path.join(root, 'unexpected-github-call');
  writeFileSync(path.join(bin, 'gh'), `#!/bin/sh\nprintf called > '${ghMarker}'\nexit 1\n`);
  chmodSync(path.join(bin, 'gh'), 0o755);
  const env = {
    PATH: `${bin}${path.delimiter}${path.dirname(process.execPath)}${path.delimiter}/usr/bin${path.delimiter}/bin`,
    HOME: root,
    XDG_CONFIG_HOME: configHome,
    NO_UPDATE_NOTIFIER: '1',
  };
  return {
    root,
    configHome,
    ghMarker,
    configFile: path.join(configHome, 'configstore', 'firebase-tools.json'),
    run: (args, extraEnv = {}) =>
      spawnSync(process.execPath, [path.join(root, 'scripts', 'setup-deploy-auth.mjs'), ...args], {
        cwd: root,
        env: { ...env, ...extraEnv },
        encoding: 'utf8',
        timeout: 20000,
      }),
    runInteractive: (args) =>
      spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          'Object.defineProperty(process.stdin, "isTTY", { value: true });' +
            'Object.defineProperty(process.stdout, "isTTY", { value: true });' +
            'const { pathToFileURL } = await import("node:url");' +
            'await import(pathToFileURL(process.argv[1]).href);',
          path.join(root, 'scripts', 'setup-deploy-auth.mjs'),
          ...args,
        ],
        { cwd: root, env, encoding: 'utf8', timeout: 20000 },
      ),
  };
}

test('interactive local-only setup persists an ambient CLI session for later non-interactive apps', (t) => {
  const fixture = isolatedAuthCli(t);
  const existingToken = 'interactive-existing-session-for-isolated-test';
  const config = JSON.stringify({ tokens: { refresh_token: existingToken } });
  // The resolver's default home cache must not be mistaken for persisted project auth.
  const defaultConfigDir = path.join(fixture.root, '.config', 'configstore');
  mkdirSync(defaultConfigDir, { recursive: true });
  writeFileSync(path.join(defaultConfigDir, 'firebase-tools.json'), config);
  writeFileSync(fixture.configFile, config);

  const result = fixture.runInteractive(['--reuse-login', '--local-only']);
  assert.equal(result.status, 0, result.stderr);
  const envPath = path.join(fixture.root, '.env.deploy.local');
  assert.equal(parseEnvFileSafe(envPath).FIREBASE_TOKEN, existingToken);
  assert.equal(`${result.stdout}${result.stderr}`.includes(existingToken), false);
  assert.equal(existsSync(fixture.ghMarker), false);
  const nextApp = fixture.run(['--status', '--local-only']);
  assert.equal(nextApp.status, 0, nextApp.stderr);
  assert.match(nextApp.stdout, /file:\.env\.deploy\.local\(FIREBASE_TOKEN\)/);
});

test('local-only setup reuses an existing session without exposing its value or contacting GitHub', (t) => {
  const fixture = isolatedAuthCli(t);
  const existingToken = 'existing-session-for-isolated-deployment-test';
  writeFileSync(
    fixture.configFile,
    JSON.stringify({
      user: { email: 'deploy@example.invalid' },
      tokens: { refresh_token: existingToken },
    }),
  );
  const result = fixture.run(['--reuse-login', '--local-only']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(fixture.ghMarker), false);
  assert.equal(`${result.stdout}${result.stderr}`.includes(existingToken), false);
  const envPath = path.join(fixture.root, '.env.deploy.local');
  const saved = parseEnvFileSafe(envPath);
  assert.equal(saved.FIREBASE_TOKEN, existingToken);
  assert.equal(saved.FIREBASE_PROJECT_ID, 'deskcloud-fleet-auth');
  assert.equal(saved.FIREBASE_HOSTING_SITE, 'pilates-flow-atelier');
  assert.equal(statSync(envPath).mode & 0o777, 0o600);

  // A later app must retain the working local credential even when the CLI session changes.
  writeFileSync(
    fixture.configFile,
    JSON.stringify({ tokens: { refresh_token: 'another-session' } }),
  );
  const repeated = fixture.run(['--reuse-login', '--local-only']);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(parseEnvFileSafe(envPath).FIREBASE_TOKEN, existingToken);
  assert.equal(existsSync(fixture.ghMarker), false);
});

test('local-only setup without existing authentication fails without creating credentials', (t) => {
  const fixture = isolatedAuthCli(t);
  const result = fixture.run(['--reuse-login', '--local-only']);
  assert.equal(result.status, 1);
  assert.equal(existsSync(path.join(fixture.root, '.env.deploy.local')), false);
  assert.equal(existsSync(fixture.ghMarker), false);
});

test('conflicting or mistyped auth options fail before any credential is saved', (t) => {
  const fixture = isolatedAuthCli(t);
  for (const args of [['--local-only', '--sync-github'], ['--sync-githbu']]) {
    const result = fixture.run(args);
    assert.equal(result.status, 1);
    assert.equal(existsSync(path.join(fixture.root, '.env.deploy.local')), false);
    assert.equal(existsSync(fixture.ghMarker), false);
  }
});

test('shell-only credentials are saved for the next app without a CLI login or GitHub call', (t) => {
  const fixture = isolatedAuthCli(t);
  const existingToken = 'shell-session-for-isolated-deployment-test';
  const result = fixture.run(['--reuse-login', '--local-only'], { FIREBASE_TOKEN: existingToken });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    parseEnvFileSafe(path.join(fixture.root, '.env.deploy.local')).FIREBASE_TOKEN,
    existingToken,
  );
  assert.equal(`${result.stdout}${result.stderr}`.includes(existingToken), false);
  assert.equal(existsSync(fixture.ghMarker), false);
  const nextApp = fixture.run(['--status', '--local-only']);
  assert.equal(nextApp.status, 0, nextApp.stderr);
  assert.match(nextApp.stdout, /file:\.env\.deploy\.local\(FIREBASE_TOKEN\)/);
});

test('an existing gcloud ADC path is reusable locally without exporting its private fields', (t) => {
  const fixture = isolatedAuthCli(t);
  const adcDir = path.join(fixture.configHome, 'gcloud');
  mkdirSync(adcDir);
  const adcPath = path.join(adcDir, 'application_default_credentials.json');
  const refreshToken = 'existing-adc-session-for-isolated-test';
  writeFileSync(adcPath, JSON.stringify({ type: 'authorized_user', refresh_token: refreshToken }));
  const result = fixture.run(['--reuse-login', '--local-only']);
  assert.equal(result.status, 0, result.stderr);
  const saved = parseEnvFileSafe(path.join(fixture.root, '.env.deploy.local'));
  assert.equal(saved.GOOGLE_APPLICATION_CREDENTIALS, adcPath);
  assert.equal(saved.FIREBASE_TOKEN, undefined);
  assert.equal(`${result.stdout}${result.stderr}`.includes(refreshToken), false);
  assert.equal(existsSync(fixture.ghMarker), false);
});

test('GitHub sync refuses a local-only user ADC before contacting GitHub', (t) => {
  const fixture = isolatedAuthCli(t);
  const refreshToken = 'local-only-adc-session-must-not-reach-github';
  const adcPath = path.join(fixture.root, 'user-adc.json');
  writeFileSync(adcPath, JSON.stringify({ type: 'authorized_user', refresh_token: refreshToken }));
  const envPath = path.join(fixture.root, '.env.deploy.local');
  const envContent = `GOOGLE_APPLICATION_CREDENTIALS=${adcPath}\n`;
  writeFileSync(envPath, envContent);

  const result = fixture.run(['--sync-github']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /service_account JSON/);
  assert.match(result.stderr, /로컬 전용 ADC/);
  assert.equal(`${result.stdout}${result.stderr}`.includes(refreshToken), false);
  assert.equal(existsSync(fixture.ghMarker), false);
  assert.equal(readFileSync(envPath, 'utf8'), envContent);
});

test('GitHub sync normalizes a valid service account before uploading its secret', (t) => {
  const fixture = isolatedAuthCli(t);
  const serviceAccount = {
    type: 'service_account',
    client_email: 'deploy@example.invalid',
    private_key: 'synthetic-private-key-for-sync-test',
  };
  const accountPath = path.join(fixture.root, 'service-account.json');
  writeFileSync(accountPath, JSON.stringify(serviceAccount, null, 2));
  writeFileSync(
    path.join(fixture.root, '.env.deploy.local'),
    `GOOGLE_APPLICATION_CREDENTIALS=${accountPath}\n`,
  );
  const ghBin = path.join(fixture.root, 'bin', 'gh');
  writeFileSync(
    ghBin,
    '#!/bin/sh\n' +
      'if [ "$1" = auth ] && [ "$2" = status ]; then exit 0; fi\n' +
      'if [ "$1" = secret ] && [ "$2" = set ] && [ "$3" = FIREBASE_SERVICE_ACCOUNT ]; then\n' +
      `  cat > '${fixture.ghMarker}'\n` +
      '  exit 0\n' +
      'fi\nexit 1\n',
  );
  chmodSync(ghBin, 0o755);

  const result = fixture.run(['--sync-github']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(fixture.ghMarker, 'utf8'), JSON.stringify(serviceAccount));
  assert.equal(`${result.stdout}${result.stderr}`.includes(serviceAccount.private_key), false);
});

test('bare setup reuses saved authentication instead of starting login or uploading it', (t) => {
  const fixture = isolatedAuthCli(t);
  const envPath = path.join(fixture.root, '.env.deploy.local');
  writeFileSync(envPath, 'FIREBASE_TOKEN=already-saved-session\n');
  const result = fixture.run(['--local-only']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(fixture.ghMarker), false);
  assert.equal(
    readFileSync(envPath, 'utf8').includes('FIREBASE_PROJECT_ID=deskcloud-fleet-auth'),
    true,
  );
  assert.equal(result.stdout.includes('already-saved-session'), false);
});
