import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, realpath, writeFile, cp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildMotionStudyLedger, canonicalJson, checkMotionStudyLedger, FINGERPRINT_SCOPE,
  LEDGER_PATH, ledgerBytes, writeMotionStudyLedger,
} from './generate-motion-study-ledger.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const current = buildMotionStudyLedger(ROOT);
const sourcePaths = [...new Set(current.entries.flatMap((entry) => entry.sourceFiles.map((file) => file.path)))];
async function fixture(t) {
  const root = await mkdtemp(path.join(await realpath(tmpdir()), 'motion-study-ledger-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const relative of sourcePaths) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await cp(path.join(ROOT, relative), path.join(root, relative));
  }
  return root;
}

test('checked ledger fingerprints 22 unique source identities and their actual relative source graph', async () => {
  assert.equal(current.entries.length, 22);
  assert.equal(new Set(current.entries.map((entry) => entry.sourceFingerprint)).size, 22);
  assert.equal(current.entries.filter((entry) => entry.family === 'existing-proposal').length, 17);
  assert.equal(current.entries.filter((entry) => entry.family === 'authoring-batch').length, 4);
  assert.equal(current.entries.filter((entry) => entry.family === 'supine-reach').length, 1);
  assert(!ledgerBytes(current).includes('generatedAt'));
  assert(!ledgerBytes(current).includes('assetSha256'));
  for (const entry of current.entries) {
    const { sourceFingerprint, ...payload } = entry;
    assert.equal(entry.fingerprintScope, FINGERPRINT_SCOPE);
    assert.match(sourceFingerprint, /^[a-f0-9]{64}$/);
    assert.equal(sourceFingerprint, hash(canonicalJson(payload)));
    assert.deepEqual(entry.sourceFiles.map((file) => file.path), entry.sourceFiles.map((file) => file.path).sort());
    for (const file of entry.sourceFiles) {
      assert.equal(file.sha256, hash(await readFile(path.join(ROOT, file.path))));
      assert(!file.path.includes('motionStudyLedger') && !file.path.endsWith('.css'));
    }
    assert(entry.sourceFiles.some((file) => file.path.startsWith('src/models/')));
    assert(entry.sourceFiles.some((file) => file.path.startsWith('src/components/')));
    assert(entry.sourceFiles.some((file) => file.path.startsWith('src/data/')));
  }
  assert(current.entries[0].sourceFiles.some((file) => file.path === 'src/models/types.ts'));
  assert(current.entries[0].sourceFiles.some((file) => file.path === 'src/data/motionSelectedV6SourceLedger.json'));
  assert(current.entries[0].sourceFiles.some((file) => file.path === 'src/models/chestLiftProvenance.ts'));
  assert.equal(await readFile(path.join(ROOT, LEDGER_PATH), 'utf8'), ledgerBytes(current));
  assert.equal(checkMotionStudyLedger(ROOT).entries, 22);
});

test('isolated new authoring preserves every old saved source fingerprint', async () => {
  const baseline = JSON.parse(await readFile(path.join(ROOT, 'src/test/fixtures/pre-supine-reach-fingerprints.json'), 'utf8'));
  assert.equal(baseline.entries.length, 21);
  for (const old of baseline.entries) {
    const entry = current.entries.find((item) => item.family === old.family && item.variantId === old.variantId);
    assert(entry, `Missing preserved identity: ${old.variantId}`);
    assert.equal(entry.sourceFingerprint, old.sourceFingerprint, `Old binding changed: ${old.variantId}`);
  }
  const isolated = current.entries.find((entry) => entry.family === 'supine-reach');
  assert(isolated.sourceFiles.some((file) => file.path === 'src/data/supineReachSource.json'));
  assert(isolated.sourceFiles.every((file) => !file.path.includes('motionPatternReferences') && !file.path.includes('motionStudyStages')));
});

test('changing the new model invalidates only the new identity, never old saved selections', async (t) => {
  const root = await fixture(t);
  const model = path.join(root, 'src/models/supineReach.ts');
  await writeFile(model, `${await readFile(model, 'utf8')}\n// fixture: new isolated source bytes changed\n`);
  const changed = buildMotionStudyLedger(root);
  for (const old of current.entries) {
    const entry = changed.entries.find((item) => item.family === old.family && item.variantId === old.variantId);
    assert.equal(entry.sourceFingerprint === old.sourceFingerprint, old.family !== 'supine-reach', old.variantId);
  }
});

test('check is deterministic and detects changed source bytes without overwriting the ledger', async (t) => {
  const root = await fixture(t);
  assert.throws(() => checkMotionStudyLedger(root), /ledger is missing/);
  await writeMotionStudyLedger(root);
  const before = await readFile(path.join(root, LEDGER_PATH));
  assert.equal(ledgerBytes(buildMotionStudyLedger(root)), before.toString('utf8'));
  const model = path.join(root, 'src/models/heelRaise.ts');
  await writeFile(model, `${await readFile(model, 'utf8')}\n// fixture: source bytes changed\n`);
  const changed = buildMotionStudyLedger(root);
  for (let index = 0; index < current.entries.length; index += 1) {
    assert.equal(changed.entries[index].sourceFingerprint === current.entries[index].sourceFingerprint, index >= 17);
  }
  assert.throws(() => checkMotionStudyLedger(root), /ledger is stale/);
  assert.deepEqual(await readFile(path.join(root, LEDGER_PATH)), before);
});

test('new relative model dependencies enter the graph; generated-ledger cycles fail closed', async (t) => {
  const root = await fixture(t);
  const model = path.join(root, 'src/models/heelRaise.ts');
  const original = await readFile(model, 'utf8');
  const extra = 'src/models/syntheticMotionSource.ts';
  await writeFile(path.join(root, extra), 'export const sourceFact = "fixture dependency";\n');
  await writeFile(model, `import { sourceFact } from './syntheticMotionSource';\nvoid sourceFact;\n${original}`);
  const graph = buildMotionStudyLedger(root);
  assert(graph.entries[0].sourceFiles.some((file) => file.path === extra));
  assert.notEqual(graph.entries[0].sourceFingerprint, current.entries[0].sourceFingerprint);
  await writeFile(path.join(root, LEDGER_PATH), ledgerBytes(current));
  await writeFile(model, `import '../data/motionStudyLedger.json';\n${original}`);
  assert.throws(() => buildMotionStudyLedger(root), /cannot be its own dependency/);
});

test('invalid phase bounds and source/output symlinks cannot produce a misleading ledger', async (t) => {
  const root = await fixture(t);
  const model = path.join(root, 'src/models/heelRaise.ts');
  const original = await readFile(model, 'utf8');
  await writeFile(model, original.replace('start: 0.12,', 'start: 0.13,'));
  assert.throws(() => buildMotionStudyLedger(root), /Phase gap\/overlap/);
  await writeFile(model, original);
  const outside = path.join(root, 'synthetic-outside.ts');
  await writeFile(outside, original);
  await rm(model);
  await symlink(outside, model);
  assert.throws(() => buildMotionStudyLedger(root), /Symlink source\/output rejected/);
  await rm(model);
  await writeFile(model, original);
  const outputTarget = path.join(root, 'preserved-output.txt');
  await writeFile(outputTarget, 'preserve');
  await symlink(outputTarget, path.join(root, LEDGER_PATH));
  await assert.rejects(writeMotionStudyLedger(root), /Symlink source\/output rejected/);
  assert.equal(await readFile(outputTarget, 'utf8'), 'preserve');
});
