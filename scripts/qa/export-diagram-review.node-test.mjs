import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { exportDiagramReview } from './export-diagram-review.mjs';

test('exports every draft phase with truthful review status, local files and byte integrity', async () => {
  const { output, summary } = await exportDiagramReview();
  try {
    const manifest = JSON.parse(await readFile(path.join(output, 'manifest.json'), 'utf8'));
    assert.equal(summary.catalogExercises, 98);
    assert.equal(summary.exportedSvgFiles, 294);
    assert.equal(summary.exactCanonicalMotionVerified, 0);
    assert.equal(summary.anatomyVerified, 0);
    assert.equal(summary.sourceFrameMappings, 0);
    assert.equal(new Set(manifest.rows.map((row) => row.exerciseId)).size, 98);
    assert.equal((await readdir(path.join(output, 'diagrams'))).length, 294);
    assert.equal((await stat(output)).mode & 0o077, 0);
    for (const row of manifest.rows) {
      assert.equal(row.phases.length, 3);
      assert.equal(row.canonicalMotionReady, false);
      assert.equal(row.anatomicalAccuracyVerified, false);
      assert.equal(row.professionalReviewCount, 0);
      for (const phase of row.phases) {
        assert.equal(phase.exactSourceFrame, null);
        const svg = await readFile(path.join(output, phase.file), 'utf8');
        assert.match(svg, /<svg/);
        assert.match(svg, /미검증 공용 패턴 초안/);
        assert.doesNotMatch(svg, /<script|<animate|<image|NaN|Infinity/);
      }
    }
    for (const file of manifest.files) {
      const bytes = await readFile(path.join(output, file.path));
      assert.equal(bytes.length, file.bytes);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
    }
    const html = await readFile(path.join(output, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /<script|<iframe|<video|<audio|autoplay|src="https?:/);
    assert.equal((html.match(/<figure>/g) ?? []).length, 294);
    assert.equal(new Set(manifest.rows.map((row) => row.poseSignatureSha256)).size, summary.uniqueThreePhaseJointSets);
    for (const row of manifest.rows) {
      assert.deepEqual(row.identicalPoseExerciseIds.sort(), manifest.rows.filter((peer) => peer.exerciseId !== row.exerciseId && peer.poseSignatureSha256 === row.poseSignatureSha256).map((peer) => peer.exerciseId).sort());
    }
  } finally { await rm(output, { recursive: true }); }
});
