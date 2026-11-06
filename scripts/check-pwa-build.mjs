import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'dist');
const source = readFileSync(path.join(root, 'sw.js'), 'utf8');
const match = source.match(/const ASSETS = (\[.*\]);/);
assert.ok(match, 'Service worker must expose its static asset inventory');
const assets = JSON.parse(match[1]);
assert.equal(new Set(assets).size, assets.length, 'Duplicate precache entries');
for (const url of assets) {
  assert.match(
    url,
    /^\/(?:index\.html|icons\/[a-z0-9-]+\.png|assets\/[A-Za-z0-9_.-]+\.(?:js|css))$/,
  );
  const file = path.join(root, url);
  assert.ok(existsSync(file), `Precache file missing: ${url}`);
  assert.ok(readFileSync(file).length > 0, `Precache file empty: ${url}`);
}
for (const file of readdirSync(path.join(root, 'assets'))) {
  if (/\.(js|css)$/.test(file))
    assert.ok(assets.includes(`/assets/${file}`), `Uncached build module: ${file}`);
}
const manifest = JSON.parse(readFileSync(path.join(root, 'site.webmanifest'), 'utf8'));
assert.equal(manifest.id, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const bytes = readFileSync(path.join(root, icon.src));
  assert.equal(
    bytes.subarray(0, 8).toString('hex'),
    '89504e470d0a1a0a',
    `PNG expected: ${icon.src}`,
  );
  assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
}
assert.ok(existsSync(path.join(root, 'icons/apple-touch-icon.png')));
console.log(`PWA build verified: ${assets.length} real static files, manifest and PNG icons.`);
