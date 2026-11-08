import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { scanText, scanTrackedFiles } from './check-secrets.mjs';

const googleExample = () => 'AI' + 'za' + 'x'.repeat(35);
const script = fileURLToPath(new URL('./check-secrets.mjs', import.meta.url));

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'pilates-secret-check-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    run(root, (name, text) => {
      mkdirSync(dirname(join(root, name)), { recursive: true });
      writeFileSync(join(root, name), text);
      execFileSync('git', ['add', '--', name], { cwd: root });
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('identifies provider-shaped values with metadata only', () => {
  const examples = [
    ['google-api-key', googleExample()],
    ['github-token', 'gh' + 'p_' + 'x'.repeat(36)],
    ['github-fine-grained-token', 'github_' + 'pat_' + 'x'.repeat(82)],
    ['openai-api-key', 'sk' + '-proj-' + 'x'.repeat(64)],
    ['aws-access-key-id', 'AK' + 'IA' + 'X'.repeat(16)],
    ['jwt-token', ['ey' + 'J' + 'x'.repeat(10), 'x'.repeat(12), 'x'.repeat(24)].join('.')],
    ['private-key', '-----BEGIN PRIVATE' + ' KEY-----'],
  ];
  for (const [rule, value] of examples) {
    const result = scanText('example.ts', `safe\nvalue = '${value}'`);
    assert.deepEqual(result, [{ file: 'example.ts', line: 2, rule }]);
    assert.equal(JSON.stringify(result).includes(value), false);
  }
});

test('allows placeholders and runtime Firebase config references', () => {
  assert.deepEqual(
    scanText(
      'config.ts',
      'apiKey: config.apiKey; fetch("/__/firebase/init.json"); YOUR_GOOGLE_API_KEY',
    ),
    [],
  );
  assert.deepEqual(scanText('config.ts', 'AI' + 'za' + 'x'.repeat(34)), []);
  assert.deepEqual(scanText('config.ts', 'AI' + 'za' + 'x'.repeat(36)), []);
});

test('scans tracked tests, docs, and hidden config without exclusions', () => {
  fixture((root, add) => {
    for (const name of ['src/config.ts', 'src/test/config.test.ts', 'docs/setup.md', '.settings']) {
      add(name, googleExample());
    }
    writeFileSync(join(root, 'untracked.txt'), googleExample());
    assert.equal(scanTrackedFiles(root).length, 4);
  });
});

test('handles staged files, deleted paths, binary files, and symlinks safely', () => {
  fixture((root, add) => {
    add('safe.txt', 'no credentials');
    add('deleted.txt', 'safe');
    rmSync(join(root, 'deleted.txt'));
    add('binary.dat', Buffer.from([0, 1, 2, 255]));
    symlinkSync('/not/a/readable/path', join(root, 'link'));
    execFileSync('git', ['add', 'link'], { cwd: root });
    assert.deepEqual(scanTrackedFiles(root), []);
  });
});

test('CLI fails without printing values, including values in file names', () => {
  fixture((root, add) => {
    const value = googleExample();
    add(`src/test/${value}.test.ts`, `const key = '${value}';`);
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /google-api-key/);
    assert.equal((result.stdout + result.stderr).includes(value), false);
  });
});

test('CLI succeeds for a clean tracked tree', () => {
  fixture((root, add) => {
    add('safe.ts', 'const key = config.apiKey;');
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /check passed/);
  });
});

test('CLI fails closed with a safe diagnostic outside a repository', () => {
  const root = mkdtempSync(join(tmpdir(), 'pilates-not-a-repo-'));
  try {
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /could not inspect tracked files/);
    assert.equal(result.stderr.includes('Error:'), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
