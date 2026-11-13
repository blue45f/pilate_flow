import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';

// Encoding only: never resize, synthesize, retouch, or change a pose pixel.
// Regenerate with ImageMagick + libwebp; CI verifies the committed hashes without them.
const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, 'public/motion-studio3d');
const manifestPath = resolve(root, 'src/data/motionFrameManifest.json');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = (await readdir(directory)).filter((name) => /^[a-z0-9-]+-(start|mid|peak)\.png$/.test(name)).sort();
const options = { encoding: 'buffer', maxBuffer: 12 * 1024 * 1024, env: { ...process.env, MAGICK_THREAD_LIMIT: '1' } };

function assertLosslessWebp(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length);
  let lossless = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const tag = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    assert.ok(offset + 8 + length <= bytes.length, 'Invalid WebP chunk');
    assert.notEqual(tag, 'VP8 ', 'Lossy motion frames are not permitted');
    if (tag === 'VP8L') lossless = true;
    offset += 8 + length + (length % 2);
  }
  assert.ok(lossless, 'Expected a lossless WebP image');
}

if (process.argv.includes('--check')) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.deepEqual(manifest.frames.map((entry) => entry.source.split('/').at(-1)), files);
  for (const entry of manifest.frames) {
    assert.match(entry.source, /^\/motion-studio3d\/[a-z0-9-]+-(start|mid|peak)\.png$/);
    assert.equal(entry.optimized, entry.source.replace(/\.png$/, '.webp'));
    const source = await readFile(resolve(root, `public${entry.source}`));
    const optimized = await readFile(resolve(root, `public${entry.optimized}`));
    assert.equal(sha(source), entry.sourceSha256, entry.source);
    assert.equal(sha(optimized), entry.optimizedSha256, entry.optimized);
    assert.equal(source.length, entry.sourceBytes);
    assert.equal(optimized.length, entry.optimizedBytes);
    assert.equal(source.readUInt32BE(16), entry.width);
    assert.equal(source.readUInt32BE(20), entry.height);
    assert.equal(entry.identicalPixels, true);
    assert.match(entry.rgbaSha256, /^[a-f0-9]{64}$/);
    assertLosslessWebp(optimized);
  }
  console.log(`Verified ${manifest.frames.length} lossless motion frames against their source and encoded hashes.`);
} else {
  let cursor = 0;
  const entries = new Array(files.length);
  async function worker() {
    while (cursor < files.length) {
      const index = cursor++;
      const filename = files[index];
      const sourcePath = resolve(directory, filename);
      const outputPath = sourcePath.replace(/\.png$/, '.webp');
      const source = await readFile(sourcePath);
      await run('magick', [sourcePath, '-define', 'webp:lossless=true', '-define', 'webp:method=6', outputPath], options);
      const optimized = await readFile(outputPath);
      assertLosslessWebp(optimized);
      const [before, after] = await Promise.all([
        run('magick', [sourcePath, '-depth', '8', 'rgba:-'], options),
        run('magick', [outputPath, '-depth', '8', 'rgba:-'], options),
      ]);
      assert.equal(sha(before.stdout), sha(after.stdout), `Pixel mismatch: ${filename}`);
      assert.ok(optimized.length < source.length, `Encoding did not save bytes: ${filename}`);
      entries[index] = {
        source: `/motion-studio3d/${filename}`,
        optimized: `/motion-studio3d/${filename.replace(/\.png$/, '.webp')}`,
        width: source.readUInt32BE(16), height: source.readUInt32BE(20),
        sourceBytes: source.length, optimizedBytes: optimized.length,
        sourceSha256: sha(source), optimizedSha256: sha(optimized),
        rgbaSha256: sha(before.stdout), identicalPixels: true,
      };
      if ((index + 1) % 12 === 0) console.log(`Encoded and compared ${index + 1}/${files.length} frames.`);
    }
  }
  await Promise.all([worker(), worker()]);
  await writeFile(manifestPath, `${JSON.stringify({ version: 1, method: 'lossless-webp', frames: entries }, null, 2)}\n`);
  const totals = entries.reduce((sum, frame) => ({ source: sum.source + frame.sourceBytes, optimized: sum.optimized + frame.optimizedBytes }), { source: 0, optimized: 0 });
  console.log(JSON.stringify({ frames: entries.length, ...totals, savedPercent: Number(((1 - totals.optimized / totals.source) * 100).toFixed(2)) }));
}
