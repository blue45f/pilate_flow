import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createControllableStaticServer } from './controllable-static-server.mjs';

async function fixture(t, trailingSeparator = false) {
  const parent = mkdtempSync(path.join(os.tmpdir(), 'pilates-qa-server-boundary-'));
  const dist = path.join(parent, 'dist');
  const sibling = path.join(parent, 'dist-canary');
  mkdirSync(dist);
  mkdirSync(sibling);
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(path.join(dist, 'index.html'), 'synthetic index');
  writeFileSync(path.join(dist, 'assets', 'app.js'), 'synthetic JavaScript');
  writeFileSync(path.join(sibling, 'canary.txt'), 'synthetic outside canary');
  const server = createControllableStaticServer(dist + (trailingSeparator ? path.sep : ''));
  const port = await server.listen();
  t.after(async () => {
    await server.close();
    rmSync(parent, { recursive: true, force: true });
  });
  return { server, port, dist, sibling };
}

function request(port, target) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: target, agent: false }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    req.setTimeout(3000, () => req.destroy(new Error('local fixture request timed out')));
    req.on('error', reject);
  });
}

test('serves root, queried assets and original cache/MIME headers', async t => {
  const { port } = await fixture(t);
  const home = await request(port, '/');
  assert.equal(home.status, 200);
  assert.equal(home.body, 'synthetic index');
  assert.equal(home.headers['cache-control'], 'no-cache');
  const asset = await request(port, '/assets/app.js?revision=synthetic');
  assert.equal(asset.status, 200);
  assert.equal(asset.headers['content-type'], 'application/javascript; charset=utf-8');
});

test('returns 404 for absent files and directories without exposing paths', async t => {
  const { port } = await fixture(t);
  const responses = await Promise.all(['/missing', '/assets/'].map(target => request(port, target)));
  responses.forEach(response => {
    assert.equal(response.status, 404);
    assert.equal(response.body, 'Not found');
  });
});

test('blocks encoded traversal into a sibling with the same directory prefix', async t => {
  const { port } = await fixture(t);
  const response = await request(port, '/%2e%2e%2fdist-canary%2fcanary.txt');
  assert.equal(response.status, 404);
  assert.equal(response.body, 'Not found');
});

test('does not double decode traversal paths', async t => {
  const { port } = await fixture(t);
  const response = await request(port, '/%252e%252e%252fdist-canary%252fcanary.txt');
  assert.equal(response.status, 404);
});

test('blocks outside file and directory symlinks', async t => {
  const { port, dist, sibling } = await fixture(t);
  symlinkSync(path.join(sibling, 'canary.txt'), path.join(dist, 'outside.txt'));
  symlinkSync(sibling, path.join(dist, 'outside-dir'));
  const responses = await Promise.all(['/outside.txt', '/outside-dir/canary.txt'].map(target => request(port, target)));
  responses.forEach(response => {
    assert.equal(response.status, 404);
    assert.equal(response.body, 'Not found');
  });
});

test('preserves symlinks to files contained in the served root', async t => {
  const { port, dist } = await fixture(t);
  symlinkSync(path.join(dist, 'assets', 'app.js'), path.join(dist, 'inside.js'));
  const response = await request(port, '/inside.js');
  assert.equal(response.status, 200);
  assert.equal(response.body, 'synthetic JavaScript');
});

test('malformed encoding and null bytes return 400 without killing the server', async t => {
  const { port } = await fixture(t);
  const responses = await Promise.all(['/%E0%A4%A', '/%00'].map(target => request(port, target)));
  responses.forEach(response => {
    assert.equal(response.status, 400);
    assert.equal(response.body, 'Bad request');
  });
  assert.equal((await request(port, '/')).status, 200);
});

test('preserves offline rejection and later online recovery', async t => {
  const { server, port } = await fixture(t);
  server.setOffline(true);
  await assert.rejects(request(port, '/'));
  server.setOffline(false);
  assert.equal((await request(port, '/')).status, 200);
});

test('accepts a trailing separator and continues to read current build files', async t => {
  const { port, dist } = await fixture(t, true);
  assert.equal((await request(port, '/')).body, 'synthetic index');
  writeFileSync(path.join(dist, 'index.html'), 'synthetic updated index');
  assert.equal((await request(port, '/')).body, 'synthetic updated index');
});
