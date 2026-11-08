import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function sha256File(relPath) {
  const absPath = path.join(REPO_ROOT, relPath);
  const buf = fs.readFileSync(absPath);
  return {
    exists: true,
    bytes: buf.byteLength,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
}

describe('[P2/추가14] Pilates Flow 3D Asset License & Provenance Audit (Read-Only & Synthetic Verification)', () => {
  it('1. confirms zero binary 3D mesh files (.glb/.gltf/.fbx/.obj) and zero WebGL/Three.js runtime dependencies', () => {
    const pkg = readJson('package.json');
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    for (const forbidden3dPkg of ['three', '@react-three/fiber', '@react-three/drei', 'babylonjs']) {
      assert.equal(
        forbidden3dPkg in allDeps,
        false,
        `Unexpected 3D engine dependency: ${forbidden3dPkg}`,
      );
    }

    const binary3dExts = new Set(['.glb', '.gltf', '.fbx', '.obj', '.dae', '.stl', '.usdz']);
    const foundBinary3d = [];
    function walk(dirRel) {
      const absDir = path.join(REPO_ROOT, dirRel);
      for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          continue;
        }
        const childRel = path.posix.join(dirRel, entry.name);
        if (entry.isDirectory()) {
          walk(childRel);
        } else if (binary3dExts.has(path.extname(entry.name).toLowerCase())) {
          foundBinary3d.push(childRel);
        }
      }
    }
    walk('src');
    walk('public');
    assert.deepEqual(foundBinary3d, []);

    const coverageTypes = fs.readFileSync(
      path.join(REPO_ROOT, 'src/features/motionCoverage/types.ts'),
      'utf8',
    );
    assert.match(coverageTypes, /readonly true3dSupported: false;/);
    assert.match(coverageTypes, /readonly webgl3dReady: false;/);
  });

  it('2. verifies all procedural 3D/2D model files and standalone license notices without modifying any tracked assets', () => {
    const studyLedger = readJson('src/data/motionStudyLedger.json');
    assert.equal(studyLedger.entries.length, 22);
    for (const entry of studyLedger.entries) {
      assert.ok(entry.sourceFiles.length >= 2, `Expected >=2 sourceFiles for ${entry.variantId}`);
      for (const f of entry.sourceFiles) {
        const actual = sha256File(f.path);
        assert.equal(
          actual.sha256,
          f.sha256,
          `SHA-256 mismatch for ${entry.variantId} file ${f.path}`,
        );
      }
    }

    const modelLicenseFiles = [
      'src/models/SUPINE-LICENSE.txt',
      'src/models/LATERAL-LICENSE.txt',
      'src/models/QUADRUPED-LICENSE.txt',
      'src/models/apparatus-LICENSE.txt',
      'src/models/tension-LICENSE.txt',
      'src/models/standing-support-LICENSE.txt',
      'src/models/seated-band-row-LICENSE.txt',
      'src/models/pelvic-curl-LICENSE.txt',
      'src/models/rotation-LICENSE.txt',
      'src/models/shoulder-support-LICENSE.txt',
      'src/test/fixtures/motion-models/LICENSE.txt',
      'public/images/movement-guides/LICENSE.txt',
    ];
    for (const rel of modelLicenseFiles) {
      assert.equal(fs.existsSync(path.join(REPO_ROOT, rel)), true, `Expected license file ${rel}`);
    }

    // Verify documented omissions (reported accurately without altering source files)
    assert.equal(
      fs.existsSync(path.join(REPO_ROOT, 'src/models/chest-lift-LICENSE.txt')),
      false,
      'supine-chest-lift declares MIT in chestLiftProvenance.ts but lacks standalone chest-lift-LICENSE.txt',
    );
    const chestLiftProv = fs.readFileSync(
      path.join(REPO_ROOT, 'src/models/chestLiftProvenance.ts'),
      'utf8',
    );
    assert.match(chestLiftProv, /originalCodeLicense:\s*'MIT; external publisher works excluded'/);

    assert.equal(
      fs.existsSync(path.join(REPO_ROOT, 'src/models/supine-reach-LICENSE.txt')),
      false,
      'supine-single-leg-reach-v1 lacks a standalone license file',
    );
    const supineReachSource = readJson('src/data/supineReachSource.json');
    assert.equal('codeLicense' in supineReachSource, false);
    assert.equal('license' in supineReachSource, false);

    // Lab-only motionReferenceSource.json references a licensingFileSha256 whose file is absent
    const motionRefSource = readJson('src/data/motionReferenceSource.json');
    assert.equal(
      motionRefSource.licensingFileSha256,
      'fc0c89776986ca7a11527071b18e848aa0ea0a0a45c7a369beed0b1017287d17',
    );
  });

  it('3. verifies raster texture provenance & unverified (미확인) license status without replacing or uploading assets', () => {
    const studioWebp = sha256File('public/images/atelier-studio.webp');
    const ringPng = sha256File('public/images/atelier-ring-still-life.png');
    const reformerPng = sha256File('public/images/atelier-reformer-still-life.png');

    assert.equal(studioWebp.bytes, 106018);
    assert.equal(
      studioWebp.sha256,
      '826b6876f95da2e4b4cefd82288ad5912a3e0cda52d8580a62e2099d164f7bce',
    );

    assert.equal(ringPng.bytes, 2100353);
    assert.equal(
      ringPng.sha256,
      '5da8d4e903f3c098e7eb81f42f4a3403fcd66875d2e74da89c2af79b8e2a35f6',
    );

    assert.equal(reformerPng.bytes, 2178463);
    assert.equal(
      reformerPng.sha256,
      '08738f19dac08bfb0da865aee5cdd23fcb6a4d89c752b8e7db21d65d0f1586c7',
    );

    const atelierProvenance = readJson('src/styles/atelier-v2-asset-provenance.json');
    assert.equal(
      atelierProvenance.appAssetPath,
      'public/images/atelier-reformer-still-life.png',
    );
    assert.equal(atelierProvenance.sha256, reformerPng.sha256);
    assert.equal('license' in atelierProvenance, false);

    const provenanceJsonText = JSON.stringify(atelierProvenance);
    assert.equal(provenanceJsonText.includes('atelier-studio.webp'), false);
    assert.equal(provenanceJsonText.includes('atelier-ring-still-life.png'), false);
  });

  it('4. reproduces unbound source-fact bindings on 4 models and verifies synthetic source-fact binding resolution in memory', () => {
    const draftSourceLedger = readJson('src/data/motionDraftSourceLedger.json');
    const ledgerById = new Map(
      draftSourceLedger.sources.map((entry) => [entry.sourceId, entry]),
    );

    // Pure synthetic mirror of src/utils/motionReviewSourceFacts.ts binding predicate
    function evaluateSyntheticSourceBinding(sourceItem) {
      const record = sourceItem.sourceId ? ledgerById.get(sourceItem.sourceId) : undefined;
      const linked = Boolean(
        record &&
          sourceItem.sourceId &&
          sourceItem.factualRecordSha256 &&
          record.factualRecordSha256 === sourceItem.factualRecordSha256 &&
          record.url === sourceItem.url,
      );
      return {
        binding: linked ? 'linked-factual-record' : 'unbound-reference',
        sourceChecked: linked ? Boolean(record.sourceChecked) : null,
        factualRecordSha256: linked ? record.factualRecordSha256 : null,
      };
    }

    // 1) Actual shape in lateralDrafts.ts (omits sourceId & factualRecordSha256 inside sources[])
    const currentLateralSource = {
      label: 'RUH Bath · Lateral Hip Pain · Side Lying Hip Abduction (p.10)',
      url: 'https://www.ruh.nhs.uk/patients/services/physiotherapy/documents/PHY067_Lateral_hip_pain.pdf',
    };
    assert.deepEqual(evaluateSyntheticSourceBinding(currentLateralSource), {
      binding: 'unbound-reference',
      sourceChecked: null,
      factualRecordSha256: null,
    });

    // 2) Synthetic bound shape using existing checked record in motionDraftSourceLedger.json
    const ruhRecord = ledgerById.get('ruh-lateral-hip-side-abduction-v1');
    assert.ok(ruhRecord, 'Expected ruh-lateral-hip-side-abduction-v1 in motionDraftSourceLedger.json');
    const syntheticBoundLateralSource = {
      ...currentLateralSource,
      sourceId: ruhRecord.sourceId,
      factualRecordSha256: ruhRecord.factualRecordSha256,
    };
    assert.deepEqual(evaluateSyntheticSourceBinding(syntheticBoundLateralSource), {
      binding: 'linked-factual-record',
      sourceChecked: true,
      factualRecordSha256: 'fa7d7a99fddf19b1d6cf005742f4b45d3d12dcba1e2001f2fb78d12855c57994',
    });
  });

  it('5. verifies redistribution manifest omissions across PUBLIC_EXPORT_MANIFEST.json, motionReviewSourceManifest.json, and motionAuthoringBatchIntegrity.json', () => {
    const publicExportManifest = readJson('PUBLIC_EXPORT_MANIFEST.json');
    const exportedPaths = new Set(
      (publicExportManifest.files ?? []).map((f) => f.path ?? f),
    );

    const movementGuideFiles = fs
      .readdirSync(path.join(REPO_ROOT, 'public/images/movement-guides'))
      .map((name) => `public/images/movement-guides/${name}`);
    assert.ok(movementGuideFiles.length >= 7);
    for (const guideFile of movementGuideFiles) {
      assert.equal(
        exportedPaths.has(guideFile),
        false,
        `Confirmed omission of ${guideFile} from PUBLIC_EXPORT_MANIFEST.json`,
      );
    }

    const reviewManifest = readJson('src/data/motionReviewSourceManifest.json');
    const studyLedger = readJson('src/data/motionStudyLedger.json');
    assert.equal(reviewManifest.entries.length, 17);
    assert.equal(studyLedger.entries.length, 22);

    const reviewIds = new Set(reviewManifest.entries.map((e) => e.draftId));
    const omittedFromReviewManifest = studyLedger.entries
      .map((e) => e.variantId)
      .filter((id) => !reviewIds.has(id));
    assert.deepEqual(omittedFromReviewManifest, [
      'chair-seated-bilateral-arm-raise-v1',
      'chair-seated-overhead-sidebend-v1',
      'prone-single-straight-leg-extension-v1',
      'prone-forearm-chest-extension-v1',
      'supine-single-leg-reach-v1',
    ]);

    const batchIntegrity = readJson('src/data/motionAuthoringBatchIntegrity.json');
    assert.equal(
      batchIntegrity.manifestSource,
      'motion-assets/evidence/motion-authoring-manifest.json',
    );
    assert.equal(
      fs.existsSync(path.join(REPO_ROOT, batchIntegrity.manifestSource)),
      false,
      'Confirmed external manifestSource is not present in repository',
    );
  });
});
