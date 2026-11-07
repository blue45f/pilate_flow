import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { REPO_ROOT, AUDIT_DIR } from './shared/semantic-audit-analyzer.mjs';

test('Track B Adversarial — Strict file ownership boundary holds (never touches CourseReferenceBrowser, Atlas, ClassBinderView, SequenceBuilder, App, or PackagePanel)', () => {
  const statusOut = execFileSync('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean);

  const allowedPrefixes = [
    'src/components/MovementPhaseDiagramSvg.tsx',
    'src/data/movementVisualRigCatalog.ts',
    'src/test/diagramApparatusContactRegression.test.tsx',
    'scripts/diagram-contact-audit-20261107/',
    'docs/diagram-contact-audit-20261107/',
    'docs/diagram-semantic-audit-round4-20261107/',
  ];

  for (const line of statusOut) {
    const filePart = line.trim().replace(/^[A-Z?]+\s+/, '').trim();
    assert.equal(
      allowedPrefixes.some((p) => filePart === p || filePart.startsWith(p)),
      true,
      `Forbidden file modification outside owned scope: ${line}`,
    );
    assert.equal(
      filePart.includes('PackagePanel') ||
        filePart.includes('package-panel') ||
        filePart.includes('PackageDetail') ||
        filePart.includes('CourseReferenceBrowser') ||
        filePart.includes('ExerciseAtlasView') ||
        filePart.includes('ClassBinderView') ||
        filePart.includes('SequenceBuilder') ||
        filePart.endsWith('App.tsx'),
      false,
      `Must never touch forbidden UI/store files: ${filePart}`,
    );
  }
});

test('Track B Adversarial — Truthfulness flags and verifiable-only public URLs hold across all 98 inventory records', () => {
  const jsonPath = path.join(
    AUDIT_DIR,
    'evidence/full-98-inventory-and-groups.json',
  );
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  assert.equal(data.summary.truthfulnessBoundary.anatomicalAccuracyAssumed, false);
  assert.equal(
    data.summary.truthfulnessBoundary.anatomicalVerificationCompleted,
    false,
  );
  assert.equal(
    data.summary.truthfulnessBoundary.expertVerificationCompleted,
    false,
  );
  assert.equal(data.summary.truthfulnessBoundary.professionalReviewCount, 0);
  assert.equal(data.summary.truthfulnessBoundary.verifiableUrlsOnlyRecorded, true);

  for (const item of data.inventory) {
    assert.equal(item.truthfulnessBoundary.anatomicalAccuracyAssumed, false);
    assert.equal(item.truthfulnessBoundary.anatomicalVerificationCompleted, false);
    assert.equal(item.truthfulnessBoundary.expertVerificationCompleted, false);
    assert.equal(item.truthfulnessBoundary.professionalReviewCount, 0);
    assert.ok(
      item.verifiablePublicSources.length >= 2,
      `Exercise ${item.exerciseId} must have at least 2 verifiable public URLs`,
    );
    for (const src of item.verifiablePublicSources) {
      assert.match(src.url, /^https:\/\//);
      assert.notEqual(
        src.verificationStatus,
        'blocked-by-sandbox-proxy-unverified',
      );
    }
  }

  // Verify Markdown report never claims clinical or anatomical verification is complete
  const mdPath = path.join(AUDIT_DIR, 'GROUP_INVENTORY_AND_MISMATCH_TABLE.md');
  const mdText = fs.readFileSync(mdPath, 'utf8');
  assert.equal(mdText.includes('anatomicalAccuracyAssumed: false'), true);
  assert.equal(mdText.includes('anatomicalVerificationCompleted: false'), true);
  assert.equal(mdText.includes('expertVerificationCompleted: false'), true);
});

test("Track B Adversarial — All audit .mjs files stay under 400 lines and pass syntax check", () => {
  const dirs = [AUDIT_DIR, path.join(AUDIT_DIR, "shared")];
  for (const d of dirs) {
    for (const entry of fs.readdirSync(d)) {
      if (!entry.endsWith(".mjs")) continue;
      const fullPath = path.join(d, entry);
      const lineCount = fs.readFileSync(fullPath, "utf8").split("\n").length;
      assert.ok(lineCount <= 400, `${entry} has ${lineCount} lines (> 400)`);
      execFileSync(process.execPath, ["--check", fullPath], { cwd: REPO_ROOT });
    }
  }
});
