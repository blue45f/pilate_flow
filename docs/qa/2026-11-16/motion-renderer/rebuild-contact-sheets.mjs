/** Compare existing caches without generating new artwork or fetching assets.
 * Usage: node docs/qa/2026-11-16/motion-renderer/rebuild-contact-sheets.mjs /path/to/baseline-worktree
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Content provenance for this dated comparison, not the supplied checkout's HEAD.
export const BASELINE_REFERENCE_COMMIT = '26d5c5f0ab2f120d3d924578695c7203f2c9bb27';
export const BASELINE_MANIFEST_SHA256 =
  'a6511c38f90701ea28fedf969c6b0cbba80930222c848ba25f0bf98ea4826b72';
const EXERCISES = [
  ['original-mat-bridge', 'Mat bridge'],
  ['original-reformer-parallel-footwork', 'Parallel footwork'],
  ['original-chair-seated-breath', 'Chair seated breath'],
  ['ex-lower-03', 'Chair standing step-up / pedal'],
];
const PHASES = ['start', 'middle', 'end'];
const APPROVED_SUBTREES = new Map([
  ['src/data', 'src/data'],
  ['public/images/motion-atlas-v3', 'public/images/motion-atlas-v3'],
  ['public/motion-artwork-v2', 'public/motion-artwork-v2'],
]);
const PROJECT_ROOT_CANDIDATE = fileURLToPath(new URL('../../../../', import.meta.url));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function createMissingFileError(targetName) {
  return Object.assign(new Error(`ENOENT: no such file or directory, open '${targetName}'`), {
    code: 'ENOENT',
  });
}

async function discoverWorktreeCandidates(baseDir) {
  const level1Entries = await readdir(baseDir, { withFileTypes: true }).catch(() => []);
  const level1Dirs = level1Entries
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => path.join(baseDir, entry.name));
  const nestedLists = await Promise.all(
    level1Dirs.map(async (dirPath) => {
      const children = await readdir(dirPath, { withFileTypes: true }).catch(() => []);
      return children
        .filter((child) => child.isDirectory() || child.isSymbolicLink())
        .map((child) => path.join(dirPath, child.name));
    }),
  );
  return [baseDir, ...level1Dirs, ...nestedLists.flat()];
}

async function resolveApprovedCliWorktree(cliArgument, projectRoot) {
  const targetCanonical = await realpath(path.resolve(cliArgument));
  const approvedParents = await Promise.all([
    realpath(path.dirname(projectRoot)),
    realpath(os.tmpdir()),
  ]);
  const candidateLists = await Promise.all(
    approvedParents.map((baseDir) => discoverWorktreeCandidates(baseDir)),
  );
  const candidates = candidateLists.flat();
  const resolvedPairs = await Promise.all(
    candidates.map(async (candidate) => ({
      untaintedPath: candidate,
      canonical: await realpath(candidate).catch(() => ''),
    })),
  );
  const matched = resolvedPairs.find((pair) => pair.canonical === targetCanonical);
  assert(
    matched,
    'Baseline worktree must reside inside the workspace parent directory or system temp directory.',
  );
  return matched.untaintedPath;
}

export async function readWithin(worktreeRoot, subtree, filename) {
  const approvedSubtree = APPROVED_SUBTREES.get(subtree);
  assert(approvedSubtree, 'Unsupported input subtree.');
  assert(
    typeof filename === 'string' &&
      /^[a-zA-Z0-9._-]+$/.test(filename) &&
      filename !== '.' &&
      filename !== '..',
    'Expected a single input filename.',
  );
  const canonicalRoot = await realpath(worktreeRoot);
  // Do not resolve the subtree into a new allowlist root: it may itself escape.
  const expectedDirectory = path.join(canonicalRoot, approvedSubtree);
  const expectedPrefix = `${expectedDirectory}${path.sep}`;
  const directoryEntries = await readdir(expectedDirectory, { withFileTypes: true });
  const matchedEntry = directoryEntries.find((entry) => entry.name === filename);
  if (!matchedEntry) {
    throw createMissingFileError(filename);
  }
  const file = await realpath(path.join(expectedDirectory, matchedEntry.name));
  const relative = path.relative(expectedDirectory, file);
  assert(
    file.startsWith(expectedPrefix) &&
      relative !== '' &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    'Input escapes its expected subtree.',
  );
  assert((await stat(file)).isFile(), 'Expected a regular input file.');
  return readFile(file);
}

export function verifyBaselineManifest(bytes) {
  assert.equal(
    sha256(bytes),
    BASELINE_MANIFEST_SHA256,
    'Baseline manifest does not match the pinned reference.',
  );
  return JSON.parse(bytes);
}

export async function readFrame(worktreeRoot, id, phase, frame) {
  assert(
    EXERCISES.some(([knownId]) => knownId === id),
    'Unsupported comparison exercise.',
  );
  assert(PHASES.includes(phase), 'Unsupported comparison phase.');
  assert(
    typeof frame?.sha256 === 'string' && /^[a-f0-9]{64}$/.test(frame.sha256),
    'Invalid frame digest.',
  );
  const filename = `${id}.${phase}.${frame.sha256.slice(0, 12)}.webp`;
  assert.equal(
    frame.src,
    `/motion-artwork-v2/${filename}`,
    'Frame source does not match its identity and digest.',
  );
  const bytes = await readWithin(worktreeRoot, 'public/motion-artwork-v2', filename);
  assert.equal(sha256(bytes), frame.sha256, 'Frame content does not match its digest.');
  return bytes;
}

function buildContactSheetHeaderSvg(title, baselineShortSha) {
  const columnLabels = ['START', 'MIDDLE', 'END']
    .map(
      (label, index) =>
        `<text x="${index * 640 + 320}" y="56" text-anchor="middle" font-size="16">${label}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="920"><rect width="1920" height="920" fill="#f7f8f3"/><g fill="#203a31" font-family="sans-serif"><text x="20" y="32" font-size="24" font-weight="bold">${title}</text><text x="20" y="83" font-size="17">BEFORE - main ${baselineShortSha}</text><text x="20" y="511" font-size="17">AFTER - existing atlas, updated renderer</text>${columnLabels}</g></svg>`;
}

async function main() {
  assert(process.argv.length === 3 && process.argv[2], 'Pass exactly one baseline worktree path.');
  const root = await realpath(PROJECT_ROOT_CANDIDATE);
  const output = path.dirname(fileURLToPath(import.meta.url));
  const baseline = await resolveApprovedCliWorktree(process.argv[2], root);
  const [baselineManifest, workingManifest, atlas, baselineAtlas] = await Promise.all([
    readWithin(baseline, 'src/data', 'exerciseArtworkManifest.json'),
    readWithin(root, 'src/data', 'exerciseArtworkManifest.json'),
    readWithin(root, 'public/images/motion-atlas-v3', 'practitioner.webp'),
    readWithin(baseline, 'public/images/motion-atlas-v3', 'practitioner.webp'),
  ]);
  const before = verifyBaselineManifest(baselineManifest);
  const after = JSON.parse(workingManifest);
  const referenceAtlas = before.sourceAssets.find(
    ({ src }) => src === '/images/motion-atlas-v3/practitioner.webp',
  );
  assert.equal(
    sha256(baselineAtlas),
    referenceAtlas.sha256,
    'Baseline atlas does not match the pinned reference.',
  );
  assert.equal(
    sha256(atlas),
    sha256(baselineAtlas),
    'This comparison requires the same original atlas.',
  );
  const require = createRequire(path.join(root, 'package.json'));
  const sharp = require('sharp');
  const baselineReferenceCommit = BASELINE_REFERENCE_COMMIT;

  const records = await Promise.all(
    EXERCISES.map(async ([id, title]) => {
      const header = buildContactSheetHeaderSvg(title, baselineReferenceCommit.slice(0, 7));
      const phaseEntries = await Promise.all(
        PHASES.map(async (phase, index) => {
          const beforeFrame = before.entries[id].phases[phase];
          const afterFrame = after.entries[id].phases[phase];
          const [beforeBuffer, afterBuffer] = await Promise.all([
            readFrame(baseline, id, phase, beforeFrame),
            readFrame(root, id, phase, afterFrame),
          ]);
          return {
            phase,
            index,
            beforeBuffer,
            afterBuffer,
            record: {
              before: {
                src: beforeFrame.src,
                sha256: sha256(beforeBuffer),
                bytes: beforeBuffer.length,
              },
              after: {
                src: afterFrame.src,
                sha256: sha256(afterBuffer),
                bytes: afterBuffer.length,
              },
            },
          };
        }),
      );
      const composition = [{ input: Buffer.from(header), left: 0, top: 0 }];
      const phases = {};
      for (const item of phaseEntries) {
        composition.push(
          { input: item.beforeBuffer, left: item.index * 640, top: 92 },
          { input: item.afterBuffer, left: item.index * 640, top: 520 },
        );
        phases[item.phase] = item.record;
      }
      const buffer = await sharp({
        create: { width: 1920, height: 920, channels: 3, background: '#f7f8f3' },
      })
        .composite(composition)
        .webp({ lossless: true, effort: 6 })
        .toBuffer();
      const file = `${id}.before-after.webp`;
      await writeFile(path.join(output, file), buffer);
      return {
        exerciseId: id,
        title,
        contactSheet: file,
        sha256: sha256(buffer),
        bytes: buffer.length,
        phases,
      };
    }),
  );

  for (const record of records) {
    process.stdout.write(`${record.contactSheet} ${record.bytes} bytes\n`);
  }

  await writeFile(
    path.join(output, 'contact-sheet-inputs.json'),
    `${JSON.stringify(
      {
        baselineReferenceCommit,
        baselineManifestSha256: sha256(baselineManifest),
        workingManifestSha256: sha256(workingManifest),
        comparisonKind: 'committed-baseline-cache-vs-regenerated-working-cache',
        phaseOrder: ['start', 'middle', 'end'],
        rowOrder: ['before', 'after'],
        sourceFrameSize: { width: 640, height: 400 },
        originalAtlasUnchanged: true,
        practitionerAtlasSha256: sha256(atlas),
        anatomicalAccuracyAssumed: false,
        reviewScope:
          'Rendering and authored-contact regression only; no professional anatomy review.',
        exercises: records,
      },
      null,
      2,
    )}\n`,
  );
}

const entrypoint = process.argv[1]
  ? await realpath(path.resolve(process.argv[1])).catch(() => undefined)
  : undefined;
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  await main();
}
