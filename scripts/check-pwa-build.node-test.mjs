import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import {
  ATELIER_V2_REQUIRED_IMAGES,
  verifyAtelierV2DistAssets,
  verifyPwaBuild,
} from './check-pwa-build.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const script = fileURLToPath(new URL('./check-pwa-build.mjs', import.meta.url));

function makePngBytes(width = 192, height = 192) {
  const png = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  return png;
}

function fixture(t, parent = projectRoot) {
  const root = mkdtempSync(path.join(parent, '.pwa-check-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'assets'));
  mkdirSync(path.join(root, 'icons'));
  mkdirSync(path.join(root, 'images', 'atelier-v2'), { recursive: true });
  writeFileSync(
    path.join(root, 'index.html'),
    '<html><script type="module" src="./assets/index-Test1234.js"></script></html>',
  );
  writeFileSync(
    path.join(root, 'assets/index-Test1234.js'),
    'export const hero = "/images/atelier-v2/reformer-studio-3d.png";',
  );
  const png = makePngBytes(192, 192);
  writeFileSync(path.join(root, 'icons/app-192.png'), png);
  writeFileSync(path.join(root, 'icons/apple-touch-icon.png'), png);
  for (const relImage of ATELIER_V2_REQUIRED_IMAGES) {
    writeFileSync(path.join(root, relImage), makePngBytes(1024, 1024));
  }
  const assets = ['/index.html', '/assets/index-Test1234.js', '/icons/app-192.png'];
  writeFileSync(path.join(root, 'sw.js'), `const ASSETS = ${JSON.stringify(assets)};`);
  const manifest = {
    id: '/',
    scope: '/',
    start_url: '/',
    display: 'standalone',
    icons: [{ src: '/icons/app-192.png', sizes: '192x192' }],
  };
  writeFileSync(path.join(root, 'site.webmanifest'), JSON.stringify(manifest));
  return { root, manifest, assets };
}

test('accepts absolute and checkout-relative build directories', (t) => {
  const { root } = fixture(t);
  assert.equal(verifyPwaBuild(root), 3);
  assert.equal(verifyPwaBuild(path.relative(projectRoot, root)), 3);
  assert.equal(verifyAtelierV2DistAssets(root), 4);
});

test('CLI rejects directory overrides from another working directory', (t) => {
  const { root } = fixture(t);
  for (const argument of [root, path.relative(projectRoot, root), '../dist', 'dist/../dist', '']) {
    const result = spawnSync(process.execPath, [script, argument], {
      cwd: os.tmpdir(),
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Only this checkout’s dist is supported/);
    assert.doesNotMatch(result.stdout, /PWA build verified/);
  }
});

test('symlink and directory-alias entrypoints cannot skip CLI validation', (t) => {
  const { root } = fixture(t);
  const fileLink = path.join(root, 'entry.mjs');
  const directoryLink = path.join(root, 'scripts-alias');
  symlinkSync(script, fileLink);
  symlinkSync(path.dirname(script), directoryLink);
  for (const entry of [fileLink, path.join(directoryLink, path.basename(script))]) {
    for (const flags of [[], ['--preserve-symlinks-main']]) {
      const result = spawnSync(process.execPath, [...flags, entry, '../dist'], {
        cwd: os.tmpdir(),
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Only this checkout’s dist is supported/);
      assert.doesNotMatch(result.stdout, /PWA build verified/);
    }
  }
});

test('import-only callers with virtual entrypoints do not execute the CLI', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `process.argv[1] = 'nonexistent-virtual-entrypoint'; await import(${JSON.stringify(new URL('./check-pwa-build.mjs', import.meta.url).href)});`,
    ],
    { cwd: os.tmpdir(), encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('rejects an outside build root even when its build files are otherwise valid', (t) => {
  const { root } = fixture(t, os.tmpdir());
  assert.throws(() => verifyPwaBuild(root), /approved directory/);
  assert.throws(() => verifyPwaBuild(path.relative(projectRoot, root)), /approved directory/);
  assert.throws(() => verifyPwaBuild(projectRoot), /approved directory/);
});

test('rejects a build-root symlink to an outside directory', (t) => {
  const outside = fixture(t, os.tmpdir());
  const inside = fixture(t);
  const link = path.join(inside.root, 'outside-root');
  symlinkSync(outside.root, link);
  assert.throws(() => verifyPwaBuild(link), /approved directory/);
});

for (const file of ['sw.js', 'site.webmanifest', 'assets/index-Test1234.js', 'icons/app-192.png']) {
  test(`rejects an escaping symlink for ${file}`, (t) => {
    const inside = fixture(t);
    const outside = fixture(t, os.tmpdir());
    rmSync(path.join(inside.root, file));
    symlinkSync(path.join(outside.root, file), path.join(inside.root, file));
    assert.throws(() => verifyPwaBuild(inside.root), /approved directory/);
  });
}

test('rejects an escaping assets-directory symlink', (t) => {
  const inside = fixture(t);
  const outside = fixture(t, os.tmpdir());
  inside.assets.splice(1, 1);
  writeFileSync(
    path.join(inside.root, 'sw.js'),
    `const ASSETS = ${JSON.stringify(inside.assets)};`,
  );
  rmSync(path.join(inside.root, 'assets'), { recursive: true });
  symlinkSync(path.join(outside.root, 'assets'), path.join(inside.root, 'assets'));
  assert.throws(() => verifyPwaBuild(inside.root), /approved directory/);
});

for (const src of [
  '../outside.png',
  '/outside.png',
  'icons/../../outside.png',
  'icons/../app-192.png',
  'https://example.test/icon.png',
]) {
  test(`rejects unapproved manifest icon path ${src}`, (t) => {
    const { root, manifest } = fixture(t);
    manifest.icons[0].src = src;
    writeFileSync(path.join(root, 'site.webmanifest'), JSON.stringify(manifest));
    assert.throws(() => verifyPwaBuild(root), /did not match/);
  });
}

test('preserves the duplicate and missing precache guards', (t) => {
  const { root, assets } = fixture(t);
  writeFileSync(
    path.join(root, 'sw.js'),
    `const ASSETS = ${JSON.stringify([...assets, assets[0]])};`,
  );
  assert.throws(() => verifyPwaBuild(root), /Duplicate precache/);
  writeFileSync(path.join(root, 'sw.js'), `const ASSETS = ${JSON.stringify(assets)};`);
  rmSync(path.join(root, 'assets/index-Test1234.js'));
  assert.throws(() => verifyPwaBuild(root), /ENOENT/);
});

test('validates SHELL_EXTRAS when present and rejects missing Atelier V2 assets or stale bundles', (t) => {
  const { root, assets } = fixture(t);
  writeFileSync(path.join(root, 'favicon.svg'), '<svg></svg>');
  writeFileSync(
    path.join(root, 'sw.js'),
    `const ASSETS = ${JSON.stringify(assets)};\nconst SHELL_EXTRAS = ["/site.webmanifest","/favicon.svg"];`,
  );
  assert.equal(verifyPwaBuild(root), 3);

  writeFileSync(path.join(root, 'assets/index-Test1234.js'), 'export const oldBuild = true;');
  assert.throws(() => verifyAtelierV2DistAssets(root), /Stale entry bundle detected/);

  writeFileSync(
    path.join(root, 'assets/index-Test1234.js'),
    'export const hero = "/images/atelier-v2/reformer-studio-3d.png";',
  );
  rmSync(path.join(root, 'images/atelier-v2/barrel-studio-3d.png'));
  assert.throws(() => verifyAtelierV2DistAssets(root), /ENOENT/);
});

test('allows exactly the two shared motion atlases in shell extras', (t) => {
  const { root, assets } = fixture(t);
  mkdirSync(path.join(root, 'images', 'motion-atlas-v3'), { recursive: true });
  const extras = [
    '/images/motion-atlas-v3/practitioner.webp',
    '/images/motion-atlas-v3/equipment.webp',
  ];
  for (const file of extras) writeFileSync(path.join(root, file), 'local-bitmap');
  writeFileSync(
    path.join(root, 'sw.js'),
    'const ASSETS = ' +
      JSON.stringify(assets) +
      ';\nconst SHELL_EXTRAS = ' +
      JSON.stringify(extras) +
      ';',
  );
  assert.equal(verifyPwaBuild(root), 3);
  const unknown = '/images/motion-atlas-v3/unapproved.webp';
  writeFileSync(path.join(root, unknown), 'local-bitmap');
  writeFileSync(
    path.join(root, 'sw.js'),
    'const ASSETS = ' +
      JSON.stringify(assets) +
      ';\nconst SHELL_EXTRAS = ' +
      JSON.stringify([...extras, unknown]) +
      ';',
  );
  assert.throws(() => verifyPwaBuild(root), /did not match/);
});
