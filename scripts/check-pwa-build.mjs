import assert from 'node:assert/strict';
import { readFileSync, realpathSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = realpathSync(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(path.dirname(modulePath));

function assertInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  assert.ok(
    relative &&
      !path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`),
    'PWA build paths must stay inside their approved directory',
  );
}

function buildFile(root, relative) {
  const candidate = path.resolve(root, relative);
  assertInside(root, candidate);
  const real = realpathSync(candidate);
  assertInside(root, real);
  assert.ok(statSync(real).isFile(), 'PWA build input must be a regular file');
  return real;
}

export function assertNoCircularJsChunks(assetDirectory) {
  const jsFiles = readdirSync(assetDirectory).filter((file) => file.endsWith('.js'));
  const graph = new Map();
  for (const file of jsFiles) {
    const code = readFileSync(path.join(assetDirectory, file), 'utf8');
    const imports = [...code.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)].map((m) => m[1]);
    graph.set(file, imports);
  }
  const cycles = [];
  for (const [fileA, importsA] of graph.entries()) {
    for (const fileB of importsA) {
      const importsB = graph.get(fileB) ?? [];
      if (importsB.includes(fileA) && fileA < fileB) {
        cycles.push(`${fileA} <-> ${fileB}`);
      }
    }
  }
  assert.equal(
    cycles.length,
    0,
    `Circular JS chunk dependency detected (causes runtime TDZ blank screen): ${cycles.join(', ')}`,
  );
}

/** Inspect only a build directory in this checkout, including after symlink resolution. */
export function verifyPwaBuild(outputDirectory = 'dist') {
  const candidate = path.resolve(projectRoot, outputDirectory);
  assertInside(projectRoot, candidate);
  const root = realpathSync(candidate);
  assertInside(projectRoot, root);
  assert.ok(statSync(root).isDirectory(), 'PWA build root must be a directory');
  const source = readFileSync(buildFile(root, 'sw.js'), 'utf8');
  const match = source.match(/const ASSETS = (\[.*\]);/);
  assert.ok(match, 'Service worker must expose its static asset inventory');
  const assets = JSON.parse(match[1]);
  assert.ok(Array.isArray(assets), 'Precache inventory must be an array');
  assert.equal(new Set(assets).size, assets.length, 'Duplicate precache entries');
  for (const url of assets) {
    assert.match(
      url,
      /^\/(?:index\.html|icons\/[a-z0-9-]+\.png|assets\/[A-Za-z0-9_.-]+\.(?:js|css))$/,
    );
    assert.ok(
      readFileSync(buildFile(root, url.slice(1))).length > 0,
      `Precache file empty: ${url}`,
    );
  }
  const assetDirectory = realpathSync(path.join(root, 'assets'));
  assertInside(root, assetDirectory);
  assert.ok(statSync(assetDirectory).isDirectory(), 'PWA assets must be a directory');
  for (const file of readdirSync(assetDirectory)) {
    if (/\.(js|css)$/.test(file))
      assert.ok(assets.includes(`/assets/${file}`), `Uncached build module: ${file}`);
  }
  assertNoCircularJsChunks(assetDirectory);
  const manifest = JSON.parse(readFileSync(buildFile(root, 'site.webmanifest'), 'utf8'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(Array.isArray(manifest.icons), 'Manifest icons must be an array');
  for (const icon of manifest.icons) {
    assert.match(icon.src, /^\/?icons\/[a-z0-9-]+\.png$/);
    const bytes = readFileSync(buildFile(root, icon.src.replace(/^\//, '')));
    assert.equal(
      bytes.subarray(0, 8).toString('hex'),
      '89504e470d0a1a0a',
      `PNG expected: ${icon.src}`,
    );
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
  }
  buildFile(root, 'icons/apple-touch-icon.png');
  return assets.length;
}

function isCliEntryPoint() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === modulePath;
  } catch {
    // Import-only callers may use a virtual or missing entrypoint.
    return false;
  }
}

if (isCliEntryPoint()) {
  assert.ok(
    process.argv.length <= 3 && (process.argv[2] === undefined || process.argv[2] === 'dist'),
    'Usage: node scripts/check-pwa-build.mjs [dist]. Only this checkout’s dist is supported.',
  );
  // The production build always emits dist. Never turn a CLI argument into a filesystem path.
  const count = verifyPwaBuild();
  console.log(`PWA build verified: ${count} real static files, manifest, PNG icons, and 0 circular JS chunks.`);
}
