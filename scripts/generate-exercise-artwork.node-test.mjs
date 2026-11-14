import assert from 'node:assert/strict';
import { test } from 'node:test';
import sharp from 'sharp';
import {
  embedLocalArtworkAssets,
  getArtworkInputFingerprint,
  rasterizeArtwork,
  RASTER_SETTINGS,
  runArtworkJobs,
  sha256,
  verifyArtworkBytes,
} from './generate-exercise-artwork.mjs';

const source = '/images/motion-atlas-v3/practitioner.webp';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><defs><image id="atlas" href="' +
  source +
  '" width="320" height="200"/></defs><use href="#atlas"/></svg>';
const assets = async () =>
  new Map([
    [
      source,
      {
        mimeType: 'image/png',
        buffer: await sharp({ create: { width: 2, height: 2, channels: 4, background: '#cc5533' } })
          .png()
          .toBuffer(),
        sourceBuffer: Buffer.from('original-webp-bytes'),
      },
    ],
  ]);

test('inlines registered bitmap references, preserving internal use and rejecting external input', async () => {
  const registered = await assets();
  const result = embedLocalArtworkAssets(svg, registered);
  assert.match(result, /href="data:image\/png;base64,/);
  assert.match(result, /href="#atlas"/);
  assert(!result.includes(source));
  for (const reference of [
    'https://example.com/a.png',
    'file:///tmp/a.png',
    '/unregistered.webp',
    'data:image/svg+xml;base64,PHN2Zz4=',
  ])
    assert.throws(() => embedLocalArtworkAssets(svg.replace(source, reference), registered));
  for (const forbidden of [
    '<script/>',
    '<foreignObject/>',
    '<g onload="x"/>',
    '<style>@import "remote";</style>',
    '<rect fill="url(https://example.com/a)"/>',
  ])
    assert.throws(() =>
      embedLocalArtworkAssets(svg.replace('</svg>', forbidden + '</svg>'), registered),
    );
});

test('fingerprints geometry, original and embedded assets, settings and encoder input', async () => {
  const registered = await assets();
  const baseline = getArtworkInputFingerprint(svg, registered);
  assert.notEqual(
    getArtworkInputFingerprint(svg.replace('width="320"', 'width="319"'), registered).inputSha256,
    baseline.inputSha256,
  );
  const changedOriginal = new Map([
    [source, { ...registered.get(source), sourceBuffer: Buffer.from('new-original') }],
  ]);
  assert.notEqual(
    getArtworkInputFingerprint(svg, changedOriginal).inputSha256,
    baseline.inputSha256,
  );
  const changedPixels = new Map([
    [source, { ...registered.get(source), buffer: Buffer.from('new-pixels') }],
  ]);
  assert.notEqual(getArtworkInputFingerprint(svg, changedPixels).inputSha256, baseline.inputSha256);
  assert.notEqual(
    getArtworkInputFingerprint(svg, registered, { ...RASTER_SETTINGS, width: 320 }).inputSha256,
    baseline.inputSha256,
  );
  assert.equal(getArtworkInputFingerprint(svg, registered).svgSha256, sha256(svg));
});

test('renders the embedded PNG through SVG use into deterministic visible 640x400 WebP', async () => {
  const registered = await assets();
  const first = await rasterizeArtwork(svg, registered);
  assert.deepEqual(await rasterizeArtwork(svg, registered), first);
  const meta = await sharp(first).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 640);
  assert.equal(meta.height, 400);
  const { data } = await sharp(first).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const center = (200 * 640 + 320) * 3;
  assert(data[center] > 180 && data[center + 1] < 110 && data[center + 2] < 90);
});

test('rejects corrupted bytes, wrong dimensions and a non-WebP image', async () => {
  const buffer = await rasterizeArtwork(svg, await assets());
  const frame = { bytes: buffer.length, sha256: sha256(buffer) };
  await verifyArtworkBytes(buffer, frame);
  await assert.rejects(
    verifyArtworkBytes(buffer, { ...frame, bytes: frame.bytes + 1 }),
    /byte count/,
  );
  await assert.rejects(
    verifyArtworkBytes(buffer, { ...frame, sha256: '0'.repeat(64) }),
    /content hash/,
  );
  await assert.rejects(
    verifyArtworkBytes(buffer, frame, { ...RASTER_SETTINGS, width: 321 }),
    /width/,
  );
  const png = await sharp(buffer).png().toBuffer();
  await assert.rejects(verifyArtworkBytes(png, { bytes: png.length, sha256: sha256(png) }), /WebP/);
});

test('bounds active work to four and allows authored result ordering', async () => {
  let active = 0;
  let peak = 0;
  const results = Array(11);
  await runArtworkJobs(
    results.fill(null).map((_, index) => async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setImmediate(resolve));
      results[index] = index;
      active--;
    }),
  );
  assert.equal(peak, 4);
  assert.deepEqual(
    results,
    Array.from({ length: 11 }, (_, index) => index),
  );
});

test('drains started writes and stops launching jobs after a worker failure', async () => {
  const started = [];
  const finished = [];
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const run = runArtworkJobs(
    Array.from({ length: 8 }, (_, index) => async () => {
      started.push(index);
      if (index === 0) throw new Error('write failed');
      await gate;
      finished.push(index);
    }),
  );
  const failure = assert.rejects(run, /write failed/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, [0, 1, 2, 3]);
  release();
  await failure;
  assert.deepEqual(finished.sort(), [1, 2, 3]);
});
