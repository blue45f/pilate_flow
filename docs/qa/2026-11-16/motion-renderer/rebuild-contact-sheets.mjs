/** Compare existing caches without generating new artwork or fetching assets.
 * Usage: node docs/qa/2026-11-16/motion-renderer/rebuild-contact-sheets.mjs /path/to/baseline-worktree
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

assert(process.argv[2], 'Pass the baseline worktree path.');
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const output = path.dirname(fileURLToPath(import.meta.url));
const baseline = path.resolve(process.argv[2]);
const require = createRequire(path.join(root, 'package.json'));
const sharp = require('sharp');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const baselineManifest = await readFile(path.join(baseline, 'src/data/exerciseArtworkManifest.json'));
const workingManifest = await readFile(path.join(root, 'src/data/exerciseArtworkManifest.json'));
const before = JSON.parse(baselineManifest);
const after = JSON.parse(workingManifest);
const atlas = await readFile(path.join(root, 'public/images/motion-atlas-v3/practitioner.webp'));
const baselineAtlas = await readFile(path.join(baseline, 'public/images/motion-atlas-v3/practitioner.webp'));
assert.equal(sha256(atlas), sha256(baselineAtlas), 'This comparison requires the same original atlas.');
const baselineCommit = execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const records = [];

for (const [id, title] of [
  ['original-mat-bridge', 'Mat bridge'],
  ['original-reformer-parallel-footwork', 'Parallel footwork'],
  ['original-chair-seated-breath', 'Chair seated breath'],
  ['ex-lower-03', 'Chair standing step-up / pedal'],
]) {
  const header = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="920"><rect width="1920" height="920" fill="#f7f8f3"/><g fill="#203a31" font-family="sans-serif"><text x="20" y="32" font-size="24" font-weight="bold">${title}</text><text x="20" y="83" font-size="17">BEFORE - main ${baselineCommit.slice(0, 7)}</text><text x="20" y="511" font-size="17">AFTER - existing atlas, updated renderer</text>${['START', 'MIDDLE', 'END'].map((label, i) => `<text x="${i * 640 + 320}" y="56" text-anchor="middle" font-size="16">${label}</text>`).join('')}</g></svg>`;
  const composition = [{ input: Buffer.from(header), left: 0, top: 0 }];
  const phases = {};
  for (const [index, phase] of ['start', 'middle', 'end'].entries()) {
    const beforeFrame = before.entries[id].phases[phase];
    const afterFrame = after.entries[id].phases[phase];
    const beforeBuffer = await readFile(path.join(baseline, 'public', beforeFrame.src));
    const afterBuffer = await readFile(path.join(root, 'public', afterFrame.src));
    assert.equal(sha256(beforeBuffer), beforeFrame.sha256);
    assert.equal(sha256(afterBuffer), afterFrame.sha256);
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
  baselineCommit,
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
