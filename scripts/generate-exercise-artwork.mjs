/** Cache the live renderer's authored poses as SVG images for inexpensive list/print rendering. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = path.join(ROOT, 'public/motion-artwork-v2');
const MANIFEST = path.join(ROOT, 'src/data/exerciseArtworkManifest.json');
const PHASES = ['start', 'middle', 'end'];
const LABELS = { start: '시작 자세', middle: '정점 자세', end: '종료 자세' };
const checkOnly = process.argv.includes('--check');
assert(
  process.argv.slice(2).every((arg) => arg === '--check'),
  'Use --check or no arguments.',
);

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
  let totalBytes = 0;
  let frames = 0;
  const outputFiles = new Set();
  if (!checkOnly) await mkdir(OUTPUT, { recursive: true });
  for (const exercise of INITIAL_EXERCISES) {
    // Exact source videos do not establish authored frame geometry.
    if (getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable === false) continue;
    assert.match(exercise.id, /^[a-zA-Z0-9_-]+$/);
    const asset = getMovementVisualAsset(exercise.id);
    assert(asset, `Missing authored pattern for ${exercise.id}`);
    const motion = getCatalogContinuousMotionAsset(exercise);
    const phases = {};
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
          label: `${exercise.nameKo} · ${labelKo} · 계획용 동작 도해`,
        }),
      );
      assert(svg.startsWith('<svg'), `Expected standalone SVG for ${exercise.id}/${phase}`);
      assert(!/NaN|Infinity/.test(svg), `Non-finite geometry for ${exercise.id}/${phase}`);
      assert(
        !/<(?:script|foreignObject)\b|(?:href|src)="https?:/i.test(svg),
        'Artwork must be self-contained.',
      );
      const sha256 = createHash('sha256').update(svg).digest('hex');
      const file = `${exercise.id}.${phase}.${sha256.slice(0, 12)}.svg`;
      outputFiles.add(file);
      const bytes = Buffer.byteLength(svg);
      const target = path.join(OUTPUT, file);
      if (checkOnly) {
        assert.equal(
          await readFile(target, 'utf8'),
          svg,
          `Stale artwork: ${file}; run pnpm generate:motion-artwork`,
        );
      } else {
        await writeFile(target, svg);
      }
      phases[phase] = { src: `/motion-artwork-v2/${file}`, sha256, bytes, labelKo };
      totalBytes += bytes;
      frames++;
    }
    entries[exercise.id] = {
      apparatus: exercise.apparatus,
      bodyPosition: exercise.bodyPosition,
      archetypeId: asset.archetypeId,
      phases,
    };
  }
  const manifest = {
    schemaVersion: 1,
    renderer: 'MovementPhaseDiagramSvg',
    width: 320,
    height: 200,
    purpose: 'same-model-static-thumbnail-cache',
    professionalReviewVerified: false,
    sourceFrameMappingVerified: false,
    entries,
  };
  const serialized = JSON.stringify(manifest, null, 2) + '\n';
  if (checkOnly)
    assert.equal(
      await readFile(MANIFEST, 'utf8'),
      serialized,
      'Stale artwork manifest; run pnpm generate:motion-artwork',
    );
  else await writeFile(MANIFEST, serialized);
  // Only remove files owned by this generator, after the complete new manifest
  // is written. Other user assets in the directory are never touched.
  if (!checkOnly)
    for (const file of await readdir(OUTPUT)) {
      if (
        /^[a-zA-Z0-9_-]+\.(start|middle|end)\.[a-f0-9]{12}\.svg$/.test(file) &&
        !outputFiles.has(file)
      ) {
        await unlink(path.join(OUTPUT, file));
      }
    }
  console.log(
    JSON.stringify({
      status: checkOnly ? 'verified' : 'generated',
      exercises: Object.keys(entries).length,
      frames,
      totalBytes,
    }),
  );
} finally {
  await server.close();
}
