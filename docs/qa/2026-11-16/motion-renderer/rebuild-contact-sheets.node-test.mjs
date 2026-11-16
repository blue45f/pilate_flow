import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { readFrame, readWithin, verifyBaselineManifest } from './rebuild-contact-sheets.mjs';

const frameDirectory = 'public/motion-artwork-v2';
const frameBytes = Buffer.from('isolated cached frame fixture');
const ids = [
  'original-mat-bridge',
  'original-reformer-parallel-footwork',
  'original-chair-seated-breath',
  'ex-lower-03',
];

async function fixture(t, rootName = 'baseline') {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'pilates-contact-boundary-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, rootName);
  await mkdir(root);
  return { root, temporary };
}

async function put(filename, bytes = frameBytes) {
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, bytes);
}

function frameFor(id = ids[0], phase = 'start', bytes = frameBytes) {
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return {
    src: `/motion-artwork-v2/${id}.${phase}.${sha256.slice(0, 12)}.webp`,
    sha256,
  };
}

function validationFailure(error) {
  assert.equal(error.code, 'ERR_ASSERTION', 'Reject invalid input before filesystem lookup');
  return true;
}

test('reads approved regular files with spaces and shell characters in the baseline directory', async (t) => {
  const { root } = await fixture(t, 'baseline ; echo marker $(not-a-command)');
  const targets = [
    ['src/data', 'exerciseArtworkManifest.json'],
    ['public/images/motion-atlas-v3', 'practitioner.webp'],
    [frameDirectory, 'fixture.webp'],
  ];
  await Promise.all(
    targets.map(async ([directory, filename]) => {
      await put(path.join(root, directory, filename));
      assert.deepEqual(await readWithin(root, directory, filename), frameBytes);
    }),
  );
});

test('rejects leaf-name traversal and unapproved subtrees before reading', async (t) => {
  const { root } = await fixture(t);
  await put(path.join(root, 'src/data', 'manifest.json'));
  await put(path.join(root, 'src', 'escaped.json'));
  const invalidFilenames = [
    '../escaped.json',
    String.raw`..\escaped.json`,
    path.join(root, 'src', 'escaped.json'),
    String.raw`C:\outside\escaped.json`,
    '.',
    '..',
    '',
  ];
  await Promise.all(
    invalidFilenames.map((filename) =>
      assert.rejects(readWithin(root, 'src/data', filename), validationFailure),
    ),
  );
  const invalidSubtrees = ['src', '../outside', 'public/motion-artwork-v2-other'];
  await Promise.all(
    invalidSubtrees.map((subtree) =>
      assert.rejects(readWithin(root, subtree, 'manifest.json'), validationFailure),
    ),
  );
});

test('rejects fixed manifest and atlas file symlinks that leave their allowed subtrees', async (t) => {
  const { root, temporary } = await fixture(t);
  const outside = path.join(temporary, 'outside-fixture');
  await put(outside);
  const targets = [
    ['src/data', 'exerciseArtworkManifest.json'],
    ['public/images/motion-atlas-v3', 'practitioner.webp'],
  ];
  await Promise.all(
    targets.map(async ([subtree, filename]) => {
      const directory = path.join(root, subtree);
      await mkdir(directory, { recursive: true });
      await symlink(outside, path.join(directory, filename), 'file');
      await assert.rejects(readWithin(root, subtree, filename), validationFailure);
    }),
  );
});

test('does not redefine the allowed subtree through an intermediate directory symlink', async (t) => {
  const { root, temporary } = await fixture(t);
  const outsideSource = path.join(temporary, 'outside-source');
  await put(path.join(outsideSource, 'data', 'exerciseArtworkManifest.json'));
  await symlink(outsideSource, path.join(root, 'src'), 'dir');
  await assert.rejects(
    readWithin(root, 'src/data', 'exerciseArtworkManifest.json'),
    validationFailure,
  );
});

test('keeps valid internal symlinks and canonical baseline aliases working', async (t) => {
  const { root, temporary } = await fixture(t);
  const directory = path.join(root, 'src/data');
  await put(path.join(directory, 'original.json'));
  await symlink('original.json', path.join(directory, 'alias.json'), 'file');
  const alias = path.join(temporary, 'baseline-alias');
  await symlink(root, alias, 'dir');
  assert.deepEqual(await readWithin(root, 'src/data', 'alias.json'), frameBytes);
  assert.deepEqual(await readWithin(alias, 'src/data', 'original.json'), frameBytes);
});

test('rejects missing files and directory inputs', async (t) => {
  const { root } = await fixture(t);
  await mkdir(path.join(root, 'src/data/not-a-file'), { recursive: true });
  await assert.rejects(readWithin(root, 'src/data', 'missing.json'), { code: 'ENOENT' });
  await assert.rejects(readWithin(root, 'src/data', 'not-a-file'), validationFailure);
});

test('reads all twelve representative id and phase combinations with matching digests', async (t) => {
  const { root } = await fixture(t);
  const pairs = ids.flatMap((id) => ['start', 'middle', 'end'].map((phase) => [id, phase]));
  await Promise.all(
    pairs.map(async ([id, phase]) => {
      const frame = frameFor(id, phase);
      await put(path.join(root, 'public', frame.src));
      assert.deepEqual(await readFrame(root, id, phase, frame), frameBytes);
    }),
  );
});

test('rejects traversal, unrelated paths, unsupported identities and malformed frame metadata', async (t) => {
  const { root, temporary } = await fixture(t);
  const frame = frameFor();
  await put(path.join(root, 'public', frame.src));
  const outside = path.join(temporary, 'outside.webp');
  await put(outside);
  const cases = [
    [ids[0], 'start', { ...frame, src: '../../outside.webp' }],
    [ids[0], 'start', { ...frame, src: outside }],
    [ids[0], 'start', { ...frame, src: String.raw`C:\outside\fixture.webp` }],
    [ids[0], 'start', { ...frame, src: frame.src.replace('/motion-artwork-v2/', '/images/') }],
    [ids[1], 'start', frame],
    ['unreviewed-movement', 'start', frame],
    [ids[0], 'peak', frame],
    [ids[0], 'end', frame],
    [ids[0], 'start', { ...frame, sha256: '0'.repeat(64) }],
    [ids[0], 'start', { ...frame, sha256: 'z'.repeat(64) }],
    [ids[0], 'start', { ...frame, sha256: frame.sha256.slice(0, 12) }],
    [ids[0], 'start', null],
  ];
  await Promise.all(
    cases.map(([id, phase, candidate]) =>
      assert.rejects(readFrame(root, id, phase, candidate), validationFailure),
    ),
  );
});

test('rejects a frame whose file bytes differ from the declared digest', async (t) => {
  const { root } = await fixture(t);
  const frame = frameFor();
  await put(path.join(root, 'public', frame.src), Buffer.from('changed frame bytes'));
  await assert.rejects(readFrame(root, ids[0], 'start', frame), validationFailure);
});

test('rejects an otherwise valid frame file symlink outside the cache directory', async (t) => {
  const { root, temporary } = await fixture(t);
  const frame = frameFor();
  const outside = path.join(temporary, 'outside.webp');
  await put(outside);
  await mkdir(path.join(root, frameDirectory), { recursive: true });
  await symlink(outside, path.join(root, 'public', frame.src), 'file');
  await assert.rejects(readFrame(root, ids[0], 'start', frame), validationFailure);
});

test('rejects cache-directory links outside the root or into a prefix-sharing sibling', async (t) => {
  await Promise.all(
    ['outside', 'prefix-sibling'].map((targetKind) =>
      t.test(targetKind, async (child) => {
        const { root, temporary } = await fixture(child);
        const frame = frameFor();
        const destination =
          targetKind === 'outside'
            ? path.join(temporary, 'outside-frames')
            : path.join(root, 'public/motion-artwork-v2-other');
        await put(path.join(destination, path.basename(frame.src)));
        await mkdir(path.join(root, 'public'), { recursive: true });
        await symlink(destination, path.join(root, frameDirectory), 'dir');
        await assert.rejects(readFrame(root, ids[0], 'start', frame), validationFailure);
      }),
    ),
  );
});

test('rejects an altered baseline manifest before attempting to parse its JSON', async () => {
  await Promise.all(
    [Buffer.from('{invalid JSON'), Buffer.from('{"entries":{}}')].map((bytes) =>
      assert.rejects(
        async () => verifyBaselineManifest(bytes),
        (error) => {
          validationFailure(error);
          assert.match(error.message, /baseline|manifest|sha|hash/i);
          assert.equal(error instanceof SyntaxError, false);
          return true;
        },
      ),
    ),
  );
});
