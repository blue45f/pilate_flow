/** Cache 3D rendered poses as self-contained WebP images; preserves SVG/atlas helpers for unit tests. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createServer } from 'vite';
import { sampleBlenderExercisePose } from './blender/exercise-pose.mjs';

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT), '..');
const OUTPUT = path.join(ROOT, 'public/motion-artwork-v2');
const MANIFEST = path.join(ROOT, 'src/data/exerciseArtworkManifest.json');
const PHASES = ['start', 'middle', 'end'];
const LABELS = { start: '시작 자세', middle: '정점 자세', end: '종료 자세' };
export const PRACTITIONER_ATLAS_URL = '/images/motion-atlas-v3/practitioner.webp';
export const RASTER_SETTINGS = Object.freeze({
  pipeline: 'blender-cycles-3d-flagship-v5',
  width: 960,
  height: 600,
  density: 144,
  resize: { fit: 'fill', kernel: 'lanczos3' },
  webp: { quality: 90, alphaQuality: 100, lossless: false, effort: 6 },
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

export function getBlenderFrameFingerprint(pose, phase) {
  // Blender frames the camera around the whole sequence of three poses.
  const svgSha256 = sha256(JSON.stringify({ pose, phase }));
  const renderer = pose.phases[phase].rolldownBar
    ? 'BlenderCycles3DStudio-v5-rollbar-960x600'
    : 'BlenderCycles3DStudio-v5-atelier-960x600';
  const inputSha256 = sha256(
    JSON.stringify({ renderer, svgSha256, settings: RASTER_SETTINGS, encoder: ENCODER_VERSIONS }),
  );
  return { svgSha256, inputSha256 };
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

/** Catch a camera outside the cyclorama even when the blank frame has a valid hash. */
export async function verifyArtworkSubject(buffer, label) {
  const luminance = await sharp(buffer).resize(64, 40).removeAlpha().greyscale().raw().toBuffer();
  assert(Math.max(...luminance) - Math.min(...luminance) >= 12, 'Empty studio frame: ' + label);
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

export async function generateExerciseArtwork({
  checkOnly = false,
  rawPngDir = '',
  changedOnly = false,
} = {}) {
  const atlasBuffer = await readFile(path.join(ROOT, 'public', PRACTITIONER_ATLAS_URL));
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
    const { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } = await server.ssrLoadModule(
      '/src/data/globalCrawledRepertoirePack.ts',
    );
    const { WORLD_PILATES_EXERCISES, WORLD_PILATES_BY_ID } = await server.ssrLoadModule(
      '/src/data/worldPilatesRepertoire1000.ts',
    );
    const { getCatalogContinuousMotionAsset } = await server.ssrLoadModule(
      '/src/data/catalogMotionAssets/index.ts',
    );
    const { FEATURED_VARIATION_3D_IDS, PHASE_3D_RAW_T, sampleUniversal3DExerciseRig } =
      await server.ssrLoadModule('/src/data/universal3dExerciseRigs.ts');

    const coreExercises = [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
    const coreIdSet = new Set(coreExercises.map((item) => item.id));
    const worldAtomics = WORLD_PILATES_EXERCISES.filter(
      (item) => item.tier === 'atomic' && !coreIdSet.has(item.id),
    );
    const seenIds = new Set([...coreIdSet, ...worldAtomics.map((item) => item.id)]);
    const featuredVariations = FEATURED_VARIATION_3D_IDS.map((id) =>
      WORLD_PILATES_BY_ID.get(id),
    ).filter((item) => item && !seenIds.has(item.id));
    const allExercises = [...coreExercises, ...worldAtomics, ...featuredVariations];
    const canonical = JSON.parse(
      await readFile(path.join(ROOT, 'scripts/blender/poses_studio_canonical_620.json'), 'utf8'),
    );
    const poseById = new Map(canonical.map((pose) => [pose.id, pose]));
    assert.equal(poseById.size, allExercises.length, 'Unexpected Blender exercise count.');
    assert.equal(poseById.size, canonical.length, 'Duplicate Blender exercise ID.');

    const entries = {};
    const jobs = [];
    const outputFiles = new Set();
    let totalBytes = 0;
    let frames = 0;
    let rasterizedFrames = 0;
    if (!checkOnly) await mkdir(OUTPUT, { recursive: true });

    for (const exercise of allExercises) {
      assert.match(exercise.id, /^[a-zA-Z0-9_-]+$/);
      const isExpandedOrCrawled =
        exercise.id.startsWith('expanded-') ||
        exercise.id.startsWith('crawled-') ||
        exercise.id.startsWith('world-');
      const motion = isExpandedOrCrawled ? null : getCatalogContinuousMotionAsset(exercise);
      const pose = sampleBlenderExercisePose(exercise, PHASE_3D_RAW_T, sampleUniversal3DExerciseRig);
      assert.deepEqual(pose, poseById.get(exercise.id), 'Stale Blender pose export: ' + exercise.id);
      const phases = Object.fromEntries(PHASES.map((phase) => [phase, null]));

      for (const phase of PHASES) {
        const labelKo = phase === 'end' ? (motion?.endPoseLabelKo ?? LABELS.end) : LABELS[phase];
        const { svgSha256, inputSha256 } = getBlenderFrameFingerprint(pose, phase);

        jobs.push(async () => {
          const priorFrame = previous?.entries?.[exercise.id]?.phases?.[phase];
          const matchingInput =
            previous?.schemaVersion === 3 &&
            priorFrame?.inputSha256 === inputSha256 &&
            priorFrame?.svgSha256 === svgSha256 &&
            (!rawPngDir || changedOnly);
          let buffer;
          let reused = false;

          if (checkOnly || matchingInput) {
            try {
              assert(
                matchingInput,
                'Stale 3D artwork input: ' +
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
              await verifyArtworkSubject(buffer, exercise.id + '/' + phase);
              reused = true;
            } catch (error) {
              if (checkOnly) throw error;
              buffer = undefined;
            }
          }

          if (!buffer) {
            assert(
              rawPngDir,
              `Missing raw 3D PNG directory (--raw-png-dir) to encode ${exercise.id}/${phase}`,
            );
            const pngPath = path.join(rawPngDir, `${exercise.id}.${phase}.png`);
            const pngBuf = await readFile(pngPath);
            buffer = await sharp(pngBuf)
              .resize(RASTER_SETTINGS.width, RASTER_SETTINGS.height, RASTER_SETTINGS.resize)
              .webp(RASTER_SETTINGS.webp)
              .toBuffer();
            await verifyArtworkSubject(buffer, exercise.id + '/' + phase);
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
            svgSha256,
            inputSha256,
          };
          totalBytes += buffer.length;
          frames++;
        });
      }

      entries[exercise.id] = {
        apparatus: exercise.apparatus,
        bodyPosition: exercise.bodyPosition,
        archetypeId: pose.rigId,
        phases,
      };
    }

    await runArtworkJobs(jobs);
    const manifest = {
      schemaVersion: 3,
      renderer: 'BlenderCycles3DStudio',
      width: RASTER_SETTINGS.width,
      height: RASTER_SETTINGS.height,
      format: 'webp',
      purpose: 'same-model-3d-studio-thumbnail-cache',
      professionalReviewVerified: false,
      sourceFrameMappingVerified: false,
      rasterization: { ...RASTER_SETTINGS, encoder: ENCODER_VERSIONS },
      sourceAssets: sourceAssetManifest,
      entries,
    };
    const serialized = JSON.stringify(manifest, null, 2) + '\n';
    if (checkOnly) {
      assert.equal(
        await readFile(MANIFEST, 'utf8'),
        serialized,
        'Stale artwork manifest; run pnpm generate:motion-artwork',
      );
    } else {
      await writeFile(MANIFEST + '.tmp', serialized);
      await rename(MANIFEST + '.tmp', MANIFEST);
      for (const file of await readdir(OUTPUT)) {
        if (
          /^[a-zA-Z0-9_-]+\.(start|middle|end)\.[a-f0-9]{12}\.(?:svg|webp)(?:\.tmp)?$/.test(file) &&
          !outputFiles.has(file)
        ) {
          await unlink(path.join(OUTPUT, file));
        }
      }
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
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const rawIdx = args.indexOf('--raw-png-dir');
  const rawPngDir = rawIdx >= 0 ? args[rawIdx + 1] : '';
  await generateExerciseArtwork({
    checkOnly,
    rawPngDir,
    changedOnly: args.includes('--changed-only'),
  });
}
