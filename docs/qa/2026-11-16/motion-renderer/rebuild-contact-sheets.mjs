/** Compare existing caches without generating new artwork or fetching assets.
 * Usage: node docs/qa/2026-11-16/motion-renderer/rebuild-contact-sheets.mjs /path/to/baseline-worktree
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Content provenance for this dated comparison, not the supplied checkout's HEAD.
export const BASELINE_REFERENCE_COMMIT = '26d5c5f0ab2f120d3d924578695c7203f2c9bb27';
export const BASELINE_MANIFEST_SHA256 = 'a6511c38f90701ea28fedf969c6b0cbba80930222c848ba25f0bf98ea4826b72';
const EXERCISES = [
  ['original-mat-bridge', 'Mat bridge'],
  ['original-reformer-parallel-footwork', 'Parallel footwork'],
  ['original-chair-seated-breath', 'Chair seated breath'],
  ['ex-lower-03', 'Chair standing step-up / pedal'],
];
const PHASES = ['start', 'middle', 'end'];
const READ_SUBTREES = new Set([
  'src/data',
  'public/images/motion-atlas-v3',
  'public/motion-artwork-v2',
]);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export async function readWithin(worktreeRoot, subtree, filename) {
  assert(READ_SUBTREES.has(subtree), 'Unsupported input subtree.');
  assert(typeof filename === 'string' && /^[a-zA-Z0-9._-]+$/.test(filename)
    && filename !== '.' && filename !== '..', 'Expected a single input filename.');
  const canonicalRoot = await realpath(worktreeRoot);
  // Do not resolve the subtree into a new allowlist root: it may itself escape.
  const expectedDirectory = path.join(canonicalRoot, subtree);
  const file = await realpath(path.join(expectedDirectory, filename));
  const relative = path.relative(expectedDirectory, file);
  assert(relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative), 'Input escapes its expected subtree.');
  assert((await stat(file)).isFile(), 'Expected a regular input file.');
  return readFile(file);
}

export function verifyBaselineManifest(bytes) {
  assert.equal(sha256(bytes), BASELINE_MANIFEST_SHA256, 'Baseline manifest does not match the pinned reference.');
  return JSON.parse(bytes);
}

export async function readFrame(worktreeRoot, id, phase, frame) {
  assert(EXERCISES.some(([knownId]) => knownId === id), 'Unsupported comparison exercise.');
  assert(PHASES.includes(phase), 'Unsupported comparison phase.');
  assert(typeof frame?.sha256 === 'string' && /^[a-f0-9]{64}$/.test(frame.sha256), 'Invalid frame digest.');
  const filename = `${id}.${phase}.${frame.sha256.slice(0, 12)}.webp`;
  assert.equal(frame.src, `/motion-artwork-v2/${filename}`, 'Frame source does not match its identity and digest.');
  const bytes = await readWithin(worktreeRoot, 'public/motion-artwork-v2', filename);
  assert.equal(sha256(bytes), frame.sha256, 'Frame content does not match its digest.');
  return bytes;
}

async function main() {
  assert(process.argv.length === 3 && process.argv[2], 'Pass exactly one baseline worktree path.');
  const root = await realpath(fileURLToPath(new URL('../../../../', import.meta.url)));
  const output = path.dirname(fileURLToPath(import.meta.url));
  const baseline = await realpath(process.argv[2]);
  const baselineManifest = await readWithin(baseline, 'src/data', 'exerciseArtworkManifest.json');
  const before = verifyBaselineManifest(baselineManifest);
  const workingManifest = await readWithin(root, 'src/data', 'exerciseArtworkManifest.json');
  const after = JSON.parse(workingManifest);
  const atlas = await readWithin(root, 'public/images/motion-atlas-v3', 'practitioner.webp');
  const baselineAtlas = await readWithin(baseline, 'public/images/motion-atlas-v3', 'practitioner.webp');
  const referenceAtlas = before.sourceAssets.find(({ src }) => src === '/images/motion-atlas-v3/practitioner.webp');
  assert.equal(sha256(baselineAtlas), referenceAtlas.sha256, 'Baseline atlas does not match the pinned reference.');
  assert.equal(sha256(atlas), sha256(baselineAtlas), 'This comparison requires the same original atlas.');
  const require = createRequire(path.join(root, 'package.json'));
  const sharp = require('sharp');
  const baselineReferenceCommit = BASELINE_REFERENCE_COMMIT;
  const records = [];

  for (const [id, title] of EXERCISES) {
    const header = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="920"><rect width="1920" height="920" fill="#f7f8f3"/><g fill="#203a31" font-family="sans-serif"><text x="20" y="32" font-size="24" font-weight="bold">${title}</text><text x="20" y="83" font-size="17">BEFORE - main ${baselineReferenceCommit.slice(0, 7)}</text><text x="20" y="511" font-size="17">AFTER - existing atlas, updated renderer</text>${['START', 'MIDDLE', 'END'].map((label, i) => `<text x="${i * 640 + 320}" y="56" text-anchor="middle" font-size="16">${label}</text>`).join('')}</g></svg>`;
    const composition = [{ input: Buffer.from(header), left: 0, top: 0 }];
    const phases = {};
    for (const [index, phase] of PHASES.entries()) {
      const beforeFrame = before.entries[id].phases[phase];
      const afterFrame = after.entries[id].phases[phase];
      const beforeBuffer = await readFrame(baseline, id, phase, beforeFrame);
      const afterBuffer = await readFrame(root, id, phase, afterFrame);
      composition.push({ input: beforeBuffer, left: index * 640, top: 92 }, { input: afterBuffer, left: index * 640, top: 520 });
      phases[phase] = {
        before: { src: beforeFrame.src, sha256: sha256(beforeBuffer), bytes: beforeBuffer.length },
        after: { src: afterFrame.src, sha256: sha256(afterBuffer), bytes: afterBuffer.length },
      };
    }
    const buffer = await sharp({ create: { width: 1920, height: 920, channels: 3, background: '#f7f8f3' } }).composite(composition).webp({ lossless: true, effort: 6 }).toBuffer();
    const file = `${id}.before-after.webp`;
    await writeFile(path.join(output, file), buffer);
    records.push({ exerciseId: id, title, contactSheet: file, sha256: sha256(buffer), bytes: buffer.length, phases });
    process.stdout.write(`${file} ${buffer.length} bytes\n`);
  }

  await writeFile(path.join(output, 'contact-sheet-inputs.json'), JSON.stringify({
    baselineReferenceCommit,
    baselineManifestSha256: sha256(baselineManifest),
    workingManifestSha256: sha256(workingManifest),
    comparisonKind: 'committed-baseline-cache-vs-regenerated-working-cache',
    phaseOrder: ['start', 'middle', 'end'], rowOrder: ['before', 'after'],
    sourceFrameSize: { width: 640, height: 400 },
    originalAtlasUnchanged: true,
    practitionerAtlasSha256: sha256(atlas),
    anatomicalAccuracyAssumed: false,
    reviewScope: 'Rendering and authored-contact regression only; no professional anatomy review.',
    exercises: records,
  }, null, 2) + '\n');
}

const entrypoint = process.argv[1] ? await realpath(process.argv[1]).catch(() => undefined) : undefined;
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await main();
}
