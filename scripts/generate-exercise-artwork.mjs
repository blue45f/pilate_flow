/** Cache authored poses as self-contained images; interactive SVGs retain their shared atlas URL. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { createServer } from 'vite';

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), '..');
const OUTPUT = path.join(ROOT, 'public/motion-artwork-v2');
const MANIFEST = path.join(ROOT, 'src/data/exerciseArtworkManifest.json');
const PHASES = ['start', 'middle', 'end'];
const LABELS = { start: '시작 자세', middle: '정점 자세', end: '종료 자세' };
export const PRACTITIONER_ATLAS_URL = '/images/motion-atlas-v3/practitioner.webp';
export const RASTER_SETTINGS = Object.freeze({
  pipeline: 'sharp-svg-atlas-webp-v1',
  width: 640,
  height: 400,
  density: 144,
  resize: { fit: 'fill', kernel: 'lanczos3' },
  webp: { quality: 88, alphaQuality: 100, lossless: false, effort: 6 },
});
export const ENCODER_VERSIONS = Object.freeze({
  sharp: sharp.versions.sharp,
  vips: sharp.versions.vips,
  webp: sharp.versions.webp,
  rsvg: sharp.versions.rsvg,
  cairo: sharp.versions.cairo,
  pixman: sharp.versions.pixman,
  png: sharp.versions.png,
});
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const assetMetadata = (src, asset) => ({
  src,
  sha256: sha256(asset.sourceBuffer ?? asset.buffer),
  bytes: (asset.sourceBuffer ?? asset.buffer).length,
  embeddedMimeType: asset.mimeType,
  embeddedSha256: sha256(asset.buffer),
});

/** Only registered local bitmaps may be inlined. Rendering never fetches a remote resource. */
export function embedLocalArtworkAssets(svg, sourceAssets) {
  assert(svg.startsWith('<svg'), 'Expected a standalone SVG.');
  assert(!/NaN|Infinity/.test(svg), 'Non-finite artwork geometry.');
  assert(
    !/<(?:script|foreignObject)\b|<!DOCTYPE|<!ENTITY|\bon[a-z]+\s*=|@import/i.test(svg),
    'Artwork must contain only static SVG geometry.',
  );
  const embedded = svg.replace(
    /\b(xlink:href|href|src)\s*=\s*(["'])(.*?)\2/gi,
    (_attribute, name, quote, reference) => {
      if (reference.startsWith('#')) return name + '=' + quote + reference + quote;
      const asset = sourceAssets.get(reference);
      if (asset) {
        assert.match(asset.mimeType, /^image\/(?:webp|png)$/);
        return (
          name +
          '=' +
          quote +
          'data:' +
          asset.mimeType +
          ';base64,' +
          asset.buffer.toString('base64') +
          quote
        );
      }
      assert.match(
        reference,
        /^data:image\/(?:webp|png);base64,[A-Za-z0-9+/=]+$/,
        'Unregistered or external artwork reference: ' + reference,
      );
      return name + '=' + quote + reference + quote;
    },
  );
  for (const match of embedded.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi))
    assert(match[2].startsWith('#'), 'External CSS artwork reference: ' + match[2]);
  return embedded;
}

export function getArtworkInputFingerprint(svg, sourceAssets, settings = RASTER_SETTINGS) {
  const svgSha256 = sha256(svg);
  const assets = [...sourceAssets].map(([src, asset]) => assetMetadata(src, asset));
  return {
    svgSha256,
    inputSha256: sha256(JSON.stringify({ svgSha256, assets, settings, encoder: ENCODER_VERSIONS })),
  };
}

export async function rasterizeArtwork(svg, sourceAssets, settings = RASTER_SETTINGS) {
  return sharp(Buffer.from(embedLocalArtworkAssets(svg, sourceAssets)), {
    density: settings.density,
  })
    .resize(settings.width, settings.height, settings.resize)
    .webp(settings.webp)
    .toBuffer();
}

/** Validate stored bytes without rerasterizing all frames during each build. */
export async function verifyArtworkBytes(buffer, frame, settings = RASTER_SETTINGS) {
  assert.equal(buffer.length, frame.bytes, 'Artwork byte count mismatch.');
  assert.equal(sha256(buffer), frame.sha256, 'Artwork content hash mismatch.');
  const metadata = await sharp(buffer).metadata();
  assert.equal(metadata.format, 'webp', 'Artwork must be a WebP image.');
  assert.equal(metadata.width, settings.width, 'Artwork width mismatch.');
  assert.equal(metadata.height, settings.height, 'Artwork height mismatch.');
  assert.equal(metadata.pages ?? 1, 1, 'Artwork cache must be a static image.');
}

/** Bound native memory; drain started jobs before reporting a failure. */
export async function runArtworkJobs(jobs, concurrency = 4) {
  assert(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4);
  let cursor = 0;
  let failed = false;
  let failure;
  const worker = async () => {
    while (!failed) {
      const index = cursor++;
      if (index >= jobs.length) return;
      try {
        await jobs[index]();
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  if (failed) throw failure;
}

export async function generateExerciseArtwork({ checkOnly = false } = {}) {
  const atlasBuffer = await readFile(path.join(ROOT, 'public', PRACTITIONER_ATLAS_URL));
  // The pinned librsvg cannot reliably decode embedded WebP. Convert once for bake only.
  const embeddedAtlas = await sharp(atlasBuffer).png({ compressionLevel: 9 }).toBuffer();
  const sourceAssets = new Map([
    [
      PRACTITIONER_ATLAS_URL,
      {
        mimeType: 'image/png',
        buffer: embeddedAtlas,
        sourceBuffer: atlasBuffer,
      },
    ],
  ]);
  const sourceAssetManifest = [...sourceAssets].map(([src, asset]) => assetMetadata(src, asset));
  let previous;
  try {
    previous = JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch (error) {
    if (checkOnly || error.code !== 'ENOENT') throw error;
  }
  const server = await createServer({
    root: ROOT,
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, watch: null },
    esbuild: { jsx: 'automatic' },
    logLevel: 'error',
  });
  try {
    const { INITIAL_EXERCISES } = await server.ssrLoadModule('/src/data/pilatesCatalog.ts');
    const { getMovementVisualAsset } = await server.ssrLoadModule(
      '/src/data/movementVisualRigCatalog.ts',
    );
    const { getCatalogContinuousMotionAsset } = await server.ssrLoadModule(
      '/src/data/catalogMotionAssets/index.ts',
    );
    const { getExpandedMovementVisualBinding } = await server.ssrLoadModule(
      '/src/data/expandedMovementVisualBindings.ts',
    );
    const { MovementPhaseDiagramSvg } = await server.ssrLoadModule(
      '/src/components/MovementPhaseDiagramSvg.tsx',
    );
    const entries = {};
    const jobs = [];
    const outputFiles = new Set();
    let totalBytes = 0;
    let frames = 0;
    let rasterizedFrames = 0;
    if (!checkOnly) await mkdir(OUTPUT, { recursive: true });
    for (const exercise of INITIAL_EXERCISES) {
      // Source videos alone never establish authored geometry.
      if (getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable === false) continue;
      assert.match(exercise.id, /^[a-zA-Z0-9_-]+$/);
      const asset = getMovementVisualAsset(exercise.id);
      assert(asset, 'Missing authored pattern for ' + exercise.id);
      const motion = getCatalogContinuousMotionAsset(exercise);
      // Reserve authored ordering before asynchronous completion.
      const phases = Object.fromEntries(PHASES.map((phase) => [phase, null]));
      for (const phase of PHASES) {
        const labelKo = phase === 'end' ? (motion?.endPoseLabelKo ?? LABELS.end) : LABELS[phase];
        const svg = renderToStaticMarkup(
          createElement(MovementPhaseDiagramSvg, {
            asset,
            phase,
            compact: true,
            showAlignment: false,
            showDirection: false,
            showMuscles: false,
            showGhostStartPose: false,
            label: exercise.nameKo + ' · ' + labelKo + ' · 계획용 동작 도해',
          }),
        );
        assert(
          svg.includes(PRACTITIONER_ATLAS_URL),
          'Complete the practitioner renderer before caching ' + exercise.id + '/' + phase,
        );
        jobs.push(async () => {
          embedLocalArtworkAssets(svg, sourceAssets);
          const fingerprint = getArtworkInputFingerprint(svg, sourceAssets);
          const priorFrame = previous?.entries?.[exercise.id]?.phases?.[phase];
          const matchingInput =
            previous?.schemaVersion === 2 &&
            priorFrame?.inputSha256 === fingerprint.inputSha256 &&
            priorFrame?.svgSha256 === fingerprint.svgSha256;
          let buffer;
          let reused = false;
          if (checkOnly || matchingInput) {
            try {
              assert(
                matchingInput,
                'Stale artwork input: ' +
                  exercise.id +
                  '/' +
                  phase +
                  '; run pnpm generate:motion-artwork',
              );
              assert.match(priorFrame.sha256, /^[a-f0-9]{64}$/);
              const file =
                exercise.id + '.' + phase + '.' + priorFrame.sha256.slice(0, 12) + '.webp';
              assert.equal(
                priorFrame.src,
                '/motion-artwork-v2/' + file,
                'Unexpected artwork cache path.',
              );
              buffer = await readFile(path.join(OUTPUT, file));
              await verifyArtworkBytes(buffer, priorFrame);
              reused = true;
            } catch (error) {
              if (checkOnly) throw error;
              buffer = undefined;
            }
          }
          if (!buffer) {
            buffer = await rasterizeArtwork(svg, sourceAssets);
            rasterizedFrames++;
          }
          const hash = sha256(buffer);
          const file = exercise.id + '.' + phase + '.' + hash.slice(0, 12) + '.webp';
          outputFiles.add(file);
          if (!checkOnly && !reused) {
            await writeFile(path.join(OUTPUT, file + '.tmp'), buffer);
            await rename(path.join(OUTPUT, file + '.tmp'), path.join(OUTPUT, file));
          }
          phases[phase] = {
            src: '/motion-artwork-v2/' + file,
            sha256: hash,
            bytes: buffer.length,
            labelKo,
            ...fingerprint,
          };
          totalBytes += buffer.length;
          frames++;
          if (!checkOnly && frames % 25 === 0) {
            console.log(JSON.stringify({ status: 'rendering', frames, totalFrames: jobs.length, rasterizedFrames, totalBytes }));
          }
        });
      }
      entries[exercise.id] = {
        apparatus: exercise.apparatus,
        bodyPosition: exercise.bodyPosition,
        archetypeId: asset.archetypeId,
        phases,
      };
    }
    // Keep the active manifest and its files until every job has succeeded.
    await runArtworkJobs(jobs);
    const manifest = {
      schemaVersion: 2,
      renderer: 'MovementPhaseDiagramSvg',
      width: RASTER_SETTINGS.width,
      height: RASTER_SETTINGS.height,
      format: 'webp',
      purpose: 'same-model-static-thumbnail-cache',
      professionalReviewVerified: false,
      sourceFrameMappingVerified: false,
      rasterization: { ...RASTER_SETTINGS, encoder: ENCODER_VERSIONS },
      sourceAssets: sourceAssetManifest,
      entries,
    };
    const serialized = JSON.stringify(manifest, null, 2) + '\n';
    if (checkOnly)
      assert.equal(
        await readFile(MANIFEST, 'utf8'),
        serialized,
        'Stale artwork manifest; run pnpm generate:motion-artwork',
      );
    else {
      await writeFile(MANIFEST + '.tmp', serialized);
      await rename(MANIFEST + '.tmp', MANIFEST);
      for (const file of await readdir(OUTPUT))
        if (
          /^[a-zA-Z0-9_-]+\.(start|middle|end)\.[a-f0-9]{12}\.(?:svg|webp)(?:\.tmp)?$/.test(file) &&
          !outputFiles.has(file)
        )
          await unlink(path.join(OUTPUT, file));
    }
    console.log(
      JSON.stringify({
        status: checkOnly ? 'verified' : 'generated',
        exercises: Object.keys(entries).length,
        frames,
        rasterizedFrames,
        format: 'webp',
        width: RASTER_SETTINGS.width,
        height: RASTER_SETTINGS.height,
        totalBytes,
      }),
    );
  } finally {
    await server.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT) {
  assert(
    process.argv.slice(2).every((arg) => arg === '--check'),
    'Use --check or no arguments.',
  );
  await generateExerciseArtwork({ checkOnly: process.argv.includes('--check') });
}
