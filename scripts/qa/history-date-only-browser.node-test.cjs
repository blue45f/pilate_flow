const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePreviewUrl, buildScenarios, runSequentially, readRevision } = require('./history-date-only-browser.cjs');

test('keeps all four viewports in both original timezones', () => {
  assert.deepEqual(buildScenarios(), [
    { timezoneId: 'Asia/Seoul', width: 320 }, { timezoneId: 'Asia/Seoul', width: 390 },
    { timezoneId: 'Asia/Seoul', width: 768 }, { timezoneId: 'Asia/Seoul', width: 1440 },
    { timezoneId: 'UTC', width: 320 }, { timezoneId: 'UTC', width: 390 },
    { timezoneId: 'UTC', width: 768 }, { timezoneId: 'UTC', width: 1440 },
  ]);
});

test('accepts only explicit local HTTP(S) previews without credentials', () => {
  assert.equal(normalizePreviewUrl('http://127.0.0.1:5264/').origin, 'http://127.0.0.1:5264');
  assert.equal(normalizePreviewUrl('https://localhost:5264/').hostname, 'localhost');
  assert.equal(normalizePreviewUrl('http://[::1]:5264/').hostname, '[::1]');
  [
    'https://pilates-flow-atelier.web.app/', 'https://localhost.example.com/',
    'file://localhost/tmp/app', 'ftp://127.0.0.1/', 'http://user:pass@localhost/',
  ].forEach(value => assert.throws(() => normalizePreviewUrl(value), /local isolated/));
});

test('scenario execution is sequential and ordered, without parallel contexts', async () => {
  const events = [];
  let active = 0;
  const results = await runSequentially([1, 2, 3], async value => {
    assert.equal(active, 0);
    active += 1;
    events.push('start-' + value);
    await Promise.resolve();
    events.push('end-' + value);
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(results, [2, 4, 6]);
  assert.deepEqual(events, ['start-1', 'end-1', 'start-2', 'end-2', 'start-3', 'end-3']);
});

test('a failed scenario rejects and prevents later scenarios from running', async () => {
  const visited = [];
  await assert.rejects(runSequentially([1, 2, 3], async value => {
    visited.push(value);
    if (value === 2) throw new Error('intentional negative control');
    return value;
  }), /intentional negative control/);
  assert.deepEqual(visited, [1, 2]);
});

test('empty scenario input completes without executing a callback', async () => {
  const result = await runSequentially([], () => assert.fail('must not execute'));
  assert.deepEqual(result, []);
});

test('revision lookup does not inherit caller PATH or GIT_DIR', () => {
  const expected = readRevision();
  assert.match(expected, /^[0-9a-f]{40}$/);
  const previousPath = process.env.PATH;
  const previousGitDir = process.env.GIT_DIR;
  try {
    process.env.PATH = '/nonexistent-date-only-negative-control';
    process.env.GIT_DIR = '/nonexistent-date-only-git-dir';
    assert.equal(readRevision(), expected);
  } finally {
    if (previousPath === undefined) delete process.env.PATH;
    else process.env.PATH = previousPath;
    if (previousGitDir === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previousGitDir;
  }
});
