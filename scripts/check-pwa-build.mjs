import assert from 'node:assert/strict';
import { readFileSync, realpathSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = realpathSync(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(path.dirname(modulePath));

export const ATELIER_V2_REQUIRED_IMAGES = [
  'images/atelier-v2/reformer-studio-3d.png',
  'images/atelier-v2/cadillac-studio-3d.png',
  'images/atelier-v2/chair-studio-3d.png',
  'images/atelier-v2/barrel-studio-3d.png',
];

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

function resolveApprovedBuildRoot(outputDirectory = 'dist') {
  const candidate = path.resolve(projectRoot, outputDirectory);
  assertInside(projectRoot, candidate);
  const root = realpathSync(candidate);
  assertInside(projectRoot, root);
  assert.ok(statSync(root).isDirectory(), 'PWA build root must be a directory');
  return root;
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
  const root = resolveApprovedBuildRoot(outputDirectory);
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

  const shellExtrasMatch = source.match(/const SHELL_EXTRAS = (\[.*\]);/);
  if (shellExtrasMatch) {
    const shellExtras = JSON.parse(shellExtrasMatch[1]);
    assert.ok(Array.isArray(shellExtras), 'SHELL_EXTRAS inventory must be an array');
    assert.equal(new Set(shellExtras).size, shellExtras.length, 'Duplicate SHELL_EXTRAS entries');
    for (const url of shellExtras) {
      assert.ok(!assets.includes(url), `SHELL_EXTRAS overlaps ASSETS: ${url}`);
      assert.match(
        url,
        /^\/(?:site\.webmanifest|favicon\.svg|images\/movement-guides\/[a-z0-9-]+\.svg)$/,
      );
      assert.ok(
        readFileSync(buildFile(root, url.slice(1))).length > 0,
        `SHELL_EXTRAS file empty: ${url}`,
      );
    }
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

/** Verify all Atelier V2 3D PNG assets and entry bundle references exist in production dist. */
export function verifyAtelierV2DistAssets(outputDirectory = 'dist') {
  const root = resolveApprovedBuildRoot(outputDirectory);
  for (const relPath of ATELIER_V2_REQUIRED_IMAGES) {
    const file = buildFile(root, relPath);
    const bytes = readFileSync(file);
    assert.ok(bytes.length >= 24, `Atelier V2 PNG truncated: ${relPath}`);
    assert.equal(
      bytes.subarray(0, 8).toString('hex'),
      '89504e470d0a1a0a',
      `PNG signature expected for ${relPath}`,
    );
    assert.ok(
      bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0,
      `Invalid PNG dimensions for ${relPath}`,
    );
  }

  const indexHtml = readFileSync(buildFile(root, 'index.html'), 'utf8');
  const entryMatch = indexHtml.match(/(?:\.|)\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  assert.ok(entryMatch, 'Production index.html must reference a hashed entry JS bundle');
  buildFile(root, `assets/${entryMatch[1]}`);

  const assetDirectory = realpathSync(path.join(root, 'assets'));
  assertInside(root, assetDirectory);
  const jsChunks = readdirSync(assetDirectory).filter((file) => file.endsWith('.js'));
  const hasV2Reference = jsChunks.some((file) =>
    readFileSync(buildFile(root, `assets/${file}`), 'utf8').includes(
      '/images/atelier-v2/reformer-studio-3d.png',
    ),
  );
  assert.ok(
    hasV2Reference,
    `Stale entry bundle detected (${entryMatch[1]} and chunks lack Atelier V2 asset references)`,
  );
  return ATELIER_V2_REQUIRED_IMAGES.length;
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
  const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  let sameCheckoutCwd = false;
  try {
    sameCheckoutCwd = realpathSync(process.cwd()) === projectRoot;
  } catch {
    sameCheckoutCwd = false;
  }
  const validCliTarget =
    positionalArgs.length === 0 ||
    (sameCheckoutCwd && positionalArgs.length === 1 && positionalArgs[0] === 'dist');
  if (!validCliTarget) {
    console.error('Only this checkout’s dist is supported');
    process.exit(1);
  }
  // Never turn a CLI argument into a filesystem path outside this checkout.
  const count = verifyPwaBuild('dist');
  const v2Count = verifyAtelierV2DistAssets('dist');
  console.log(
    `PWA build verified: ${count} real static files, ${v2Count} Atelier V2 PNG assets, manifest, PNG icons, and 0 circular JS chunks.`,
  );
}
