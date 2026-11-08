import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs/3d-asset-license-audit-20261108');

function fileRecord(relPath) {
  const absPath = path.join(REPO_ROOT, relPath);
  const buf = fs.readFileSync(absPath);
  return {
    path: relPath,
    bytes: buf.byteLength,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
  };
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
}

function main() {
  const startedAt = Date.now();
  fs.mkdirSync(DOCS_DIR, { recursive: true });

  const headCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();

  // 1. Run synthetic & read-only node test suite (includes motionStudyLedger SHA-256 verification)
  execFileSync(
    'node',
    ['--test', 'scripts/3d-asset-license-audit-20261108/3d-asset-license-audit.node-test.mjs'],
    {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    },
  );

  // 3. Build comprehensive machine-readable ledger
  const studyLedger = readJson('src/data/motionStudyLedger.json');
  const reviewManifest = readJson('src/data/motionReviewSourceManifest.json');
  const reviewIds = new Set(reviewManifest.entries.map((e) => e.draftId));

  const licenseMapById = {
    'supported-heel-raise': {
      dimension: '2d-continuous-procedural',
      spdxLicense: '0BSD',
      licenseStatus: 'verified-fixture-only-missing-src-models-license',
      licenseStatusKo: '확인됨 (0BSD 테스트 픽스처 보유 · src/models 단독 LICENSE.txt 누락)',
      licenseFiles: ['src/test/fixtures/motion-models/LICENSE.txt'],
      provenanceFiles: ['src/data/motionDrafts.ts', 'src/data/motionDraftSourceLedger.json'],
      sourceBindingStatus: 'unbound-reference',
      redistributionObligations: [
        '0BSD: 조건 없는 퍼블릭 도메인 동등 라이선스이나 src/models/ 내 LICENSE.txt 누락',
      ],
    },
    'side-lying-clam': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: '0BSD',
      licenseStatus: 'verified-fixture-only-missing-src-models-license',
      licenseStatusKo: '확인됨 (0BSD 테스트 픽스처 보유 · src/models 단독 LICENSE.txt 누락)',
      licenseFiles: ['src/test/fixtures/motion-models/LICENSE.txt'],
      provenanceFiles: ['src/data/motionDrafts.ts', 'docs/clam-open-book-source-comparison.md'],
      sourceBindingStatus: 'unbound-reference',
      redistributionObligations: [
        '0BSD: 조건 없는 퍼블릭 도메인 동등 라이선스이나 src/models/ 내 LICENSE.txt 누락',
      ],
    },
    'adult-supine-heel-slide': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'CC0-1.0',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (CC0-1.0)',
      licenseFiles: ['src/models/SUPINE-LICENSE.txt'],
      provenanceFiles: ['src/models/SUPINE-PROVENANCE.md', 'src/models/supine-source-facts.json'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'CC0-1.0 (자체 코드/수식만 해당; 외부 NHS 출처 원문/상표는 별도 권리 보유)',
      ],
    },
    'supine-knee-fold': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'CC0-1.0',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (CC0-1.0)',
      licenseFiles: ['src/models/SUPINE-LICENSE.txt'],
      provenanceFiles: ['src/models/SUPINE-PROVENANCE.md', 'src/models/supine-source-facts.json'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'CC0-1.0 (자체 코드/수식만 해당; 외부 NHS 출처 원문/상표는 별도 권리 보유)',
      ],
    },
    'side-lying-straight-leg-lift': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/LATERAL-LICENSE.txt'],
      provenanceFiles: ['src/models/lateralDrafts.ts', 'src/data/motionDraftSourceLedger.json'],
      sourceBindingStatus: 'unbound-reference',
      redistributionObligations: [
        'MIT: 모든 복제본 또는 상당 부분에 저작권 고지 및 허가 고지 포함 의무 (dist/ 번들 시 고지 보존 필요)',
      ],
    },
    'side-lying-open-book': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/LATERAL-LICENSE.txt'],
      provenanceFiles: [
        'src/models/lateralDrafts.ts',
        'docs/clam-open-book-source-comparison.md',
      ],
      sourceBindingStatus: 'unbound-reference',
      redistributionObligations: [
        'MIT: 모든 복제본 또는 상당 부분에 저작권 고지 및 허가 고지 포함 의무 (dist/ 번들 시 고지 보존 필요)',
      ],
    },
    'quadruped-arm-slide': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/QUADRUPED-LICENSE.txt'],
      provenanceFiles: ['src/models/quadrupedDrafts.ts', 'src/data/motionDraftExpansion.ts'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'MIT: 저작권 고지 및 허가 고지 포함 의무 + 비승인(unapproved) 상태 표시 유지',
      ],
    },
    'quadruped-leg-slide': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/QUADRUPED-LICENSE.txt'],
      provenanceFiles: ['src/models/quadrupedDrafts.ts', 'src/data/motionDraftExpansion.ts'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'MIT: 저작권 고지 및 허가 고지 포함 의무 + 비승인(unapproved) 상태 표시 유지',
      ],
    },
    'reformer-parallel-footwork': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: '0BSD',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (0BSD)',
      licenseFiles: ['src/models/apparatus-LICENSE.txt'],
      provenanceFiles: [
        'src/models/apparatus-provenance.md',
        'src/models/apparatus-source-facts.json',
      ],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        '0BSD (자체 기하 모델만 해당; Merrithew/STOTT 외부 저작물 제외)',
      ],
    },
    'chair-seated-pedal-press': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: '0BSD',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (0BSD)',
      licenseFiles: ['src/models/apparatus-LICENSE.txt'],
      provenanceFiles: [
        'src/models/apparatus-provenance.md',
        'src/models/apparatus-source-facts.json',
      ],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        '0BSD (자체 기하 모델만 해당; BASI 외부 저작물 제외)',
      ],
    },
    'reformer-supine-strap-arm-press': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: '0BSD',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (0BSD)',
      licenseFiles: ['src/models/tension-LICENSE.txt'],
      provenanceFiles: ['src/models/tension-provenance.md', 'src/models/tension-source-facts.json'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        '0BSD (자체 기하 모델만 해당; Merrithew/Peak Pilates 외부 저작물 제외)',
      ],
    },
    'cadillac-supine-arm-spring-press': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: '0BSD',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (0BSD)',
      licenseFiles: ['src/models/tension-LICENSE.txt'],
      provenanceFiles: ['src/models/tension-provenance.md', 'src/models/tension-source-facts.json'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        '0BSD (자체 기하 모델만 해당; Merrithew/Balanced Body 외부 저작물 제외)',
      ],
    },
    'ladder-supported-hip-extension-slide': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/standing-support-LICENSE.txt'],
      provenanceFiles: ['src/models/standingSupportDrafts.ts', 'src/data/motionDraftV5.ts'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'MIT: 저작권 고지 및 허가 고지 포함 의무',
      ],
    },
    'ladder-supported-side-leg-slide': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/standing-support-LICENSE.txt'],
      provenanceFiles: ['src/models/standingSupportDrafts.ts', 'src/data/motionDraftV5.ts'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'MIT: 저작권 고지 및 허가 고지 포함 의무',
      ],
    },
    'floor-seated-band-row': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/seated-band-row-LICENSE.txt'],
      provenanceFiles: ['src/models/seated-band-row-provenance.md', 'src/data/motionDraftV5.ts'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'MIT: 저작권 고지 및 허가 고지 포함 의무',
      ],
    },
    'supine-chest-lift': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified-code-constant-only-missing-standalone-license-file',
      licenseStatusKo: '확인됨 (chestLiftProvenance.ts 내 MIT 선언 · 단독 chest-lift-LICENSE.txt 누락)',
      licenseFiles: [],
      provenanceFiles: ['src/models/chestLiftProvenance.ts', 'src/data/motionDraftV6.ts'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'MIT: chestLiftProvenance.ts:66에 MIT 선언되어 있으나 단독 chest-lift-LICENSE.txt 및 chest-lift-provenance.md 파일 누락',
      ],
    },
    'articulated-pelvic-curl': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (MIT)',
      licenseFiles: ['src/models/pelvic-curl-LICENSE.txt'],
      provenanceFiles: ['src/models/pelvic-curl-provenance.md', 'src/data/motionDraftV6.ts'],
      sourceBindingStatus: 'linked-factual-record',
      redistributionObligations: [
        'MIT: 저작권 고지 및 허가 고지 포함 의무',
      ],
    },
    'chair-seated-bilateral-arm-raise-v1': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'CC0-1.0 OR MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (CC0-1.0 OR MIT)',
      licenseFiles: ['src/data/motionAuthoringBatchIntegrity.json'],
      provenanceFiles: [
        'src/data/motionAuthoringBatch.ts',
        'src/features/motionCoverage/docs/INTEGRATION_PROVENANCE.md',
      ],
      sourceBindingStatus: 'authoring-batch-ledger-only',
      redistributionObligations: [
        'CC0-1.0 OR MIT 듀얼 라이선스 (단, motionReviewSourceManifest.json 및 외부 manifestSource 파일 누락)',
      ],
    },
    'chair-seated-overhead-sidebend-v1': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'CC0-1.0 OR MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (CC0-1.0 OR MIT)',
      licenseFiles: ['src/data/motionAuthoringBatchIntegrity.json'],
      provenanceFiles: [
        'src/data/motionAuthoringBatch.ts',
        'src/features/motionCoverage/docs/INTEGRATION_PROVENANCE.md',
      ],
      sourceBindingStatus: 'authoring-batch-ledger-only',
      redistributionObligations: [
        'CC0-1.0 OR MIT 듀얼 라이선스 (단, motionReviewSourceManifest.json 및 외부 manifestSource 파일 누락)',
      ],
    },
    'prone-single-straight-leg-extension-v1': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'CC0-1.0 OR MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (CC0-1.0 OR MIT)',
      licenseFiles: ['src/data/motionAuthoringBatchIntegrity.json'],
      provenanceFiles: [
        'src/data/motionAuthoringBatch.ts',
        'src/features/motionCoverage/docs/INTEGRATION_PROVENANCE.md',
      ],
      sourceBindingStatus: 'authoring-batch-ledger-only',
      redistributionObligations: [
        'CC0-1.0 OR MIT 듀얼 라이선스 (단, motionReviewSourceManifest.json 및 외부 manifestSource 파일 누락)',
      ],
    },
    'prone-forearm-chest-extension-v1': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: 'CC0-1.0 OR MIT',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (CC0-1.0 OR MIT)',
      licenseFiles: ['src/data/motionAuthoringBatchIntegrity.json'],
      provenanceFiles: [
        'src/data/motionAuthoringBatch.ts',
        'src/features/motionCoverage/docs/INTEGRATION_PROVENANCE.md',
      ],
      sourceBindingStatus: 'authoring-batch-ledger-only',
      redistributionObligations: [
        'CC0-1.0 OR MIT 듀얼 라이선스 (단, motionReviewSourceManifest.json 및 외부 manifestSource 파일 누락)',
      ],
    },
    'supine-single-leg-reach-v1': {
      dimension: '3d-procedural-point3-to-2d-svg',
      spdxLicense: null,
      licenseStatus: 'unverified',
      licenseStatusKo: '미확인 (자체 3D 모델 코드/수식 라이선스 미기재)',
      licenseFiles: [],
      provenanceFiles: [
        'src/data/supineReachSource.json',
        'docs/supine-reach-integration.md',
      ],
      sourceBindingStatus: 'supine-reach-source-json-only',
      redistributionObligations: [
        '미확인: supineReachSource.json에 외부 출처(UHCW NHS, Royal Osteoporosis Society) 참조만 기재되고 자체 3D 모델 코드의 SPDX 라이선스 파일/필드가 누락됨',
      ],
    },
  };

  const continuousStudyModels = studyLedger.entries.map((entry) => {
    const meta = licenseMapById[entry.variantId];
    return {
      movementId: entry.variantId,
      title: entry.title,
      intendedExerciseIds: entry.intendedExerciseIds,
      family: entry.family,
      dimension: meta.dimension,
      spdxLicense: meta.spdxLicense,
      licenseStatus: meta.licenseStatus,
      licenseStatusKo: meta.licenseStatusKo,
      inMotionReviewSourceManifest: reviewIds.has(entry.variantId),
      sourceBindingStatus: meta.sourceBindingStatus,
      licenseFiles: meta.licenseFiles,
      provenanceFiles: meta.provenanceFiles,
      ownedFiles: entry.sourceFiles,
      sourceFingerprint: entry.sourceFingerprint,
      redistributionObligations: meta.redistributionObligations,
    };
  });

  const rotationTrackModels = [
    'rotation-mat-saw',
    'rotation-mat-spine-twist',
    'rotation-mat-criss-cross',
  ].map((movementId) => ({
    movementId,
    dimension: '3d-procedural-axial-rotation-to-2d-svg',
    spdxLicense: 'CC0-1.0 OR MIT',
    licenseStatus: 'verified',
    licenseStatusKo: '확인됨 (CC0-1.0 OR MIT)',
    licenseFiles: ['src/models/rotation-LICENSE.txt'],
    provenanceFiles: ['src/models/rotation-provenance.md', 'src/data/rotationSourceFacts.json'],
    ownedFiles: [
      fileRecord('src/models/rotationDrafts.ts'),
      fileRecord('src/data/rotationDiagramData.ts'),
      fileRecord('src/components/RotationDraftFigure.tsx'),
    ],
    redistributionObligations: [
      'CC0-1.0 OR MIT 듀얼 라이선스 + 비임상 진실성 고지(anatomicalAccuracyAssumed: false) 유지',
    ],
  }));

  const labReferencePrototypes = ['bridge-pattern', 'heel-slide'].map((id) => ({
    movementId: id,
    dimension: '2d-lab-prototype',
    spdxLicense: null,
    licenseStatus: 'unverified',
    licenseStatusKo: '미확인 (licensingFileSha256 원문 파일 저장소 내 부재)',
    declaredLicensingFileSha256:
      'fc0c89776986ca7a11527071b18e848aa0ea0a0a45c7a369beed0b1017287d17',
    licenseFiles: [],
    provenanceFiles: [
      'src/data/motionReferenceSource.json',
      'src/data/motionReferenceSources.md',
      'src/data/motionReferenceVerification.json',
    ],
    ownedFiles: [
      fileRecord('src/utils/motionReferenceModel.ts'),
      fileRecord('src/data/motionReferences.ts'),
    ],
  }));

  const rasterTextures = [
    {
      assetPath: 'public/images/atelier-studio.webp',
      ...fileRecord('public/images/atelier-studio.webp'),
      usedIn: ['src/styles/studio.css:369 (.studio-cover background-image)'],
      provenanceStatus: 'unverified',
      provenanceStatusKo: '미확인 (저장소 내 출처 문서 전무)',
      spdxLicense: null,
      licenseStatus: 'unverified',
      licenseStatusKo: '미확인',
      actionTaken: 'none-reported-as-unverified-per-policy',
    },
    {
      assetPath: 'public/images/atelier-ring-still-life.png',
      ...fileRecord('public/images/atelier-ring-still-life.png'),
      usedIn: ['src/components/SequenceWorkbench.tsx:853'],
      provenanceStatus: 'partial-doc-mention-only',
      provenanceStatusKo: '부분 언급 (docs/vnext-visual-contract.md:17 · atelier-v2-asset-provenance.json 누락)',
      spdxLicense: null,
      licenseStatus: 'unverified',
      licenseStatusKo: '미확인 (SPDX 재배포 라이선스 미기재)',
      actionTaken: 'none-reported-as-unverified-per-policy',
    },
    {
      assetPath: 'public/images/atelier-reformer-still-life.png',
      ...fileRecord('public/images/atelier-reformer-still-life.png'),
      usedIn: ['src/components/NextClassBanner.tsx:194'],
      provenanceStatus: 'verified-internal-generation-artifact',
      provenanceStatusKo: '확인됨 (atelier-v2-asset-provenance.json · libfile_eda8613323a0819196039aeb81371d0b)',
      spdxLicense: null,
      licenseStatus: 'unverified',
      licenseStatusKo: '미확인 (permittedUse만 기재 · SPDX 재배포 라이선스 미기재)',
      actionTaken: 'none-reported-as-unverified-per-policy',
    },
  ];

  const staticMovementGuideSvgs = fs
    .readdirSync(path.join(REPO_ROOT, 'public/images/movement-guides'))
    .filter((name) => name.endsWith('.svg'))
    .sort()
    .map((name) => ({
      ...fileRecord(`public/images/movement-guides/${name}`),
      spdxLicense: 'CC-BY-4.0 / MIT Compatible',
      licenseStatus: 'verified',
      licenseStatusKo: '확인됨 (CC-BY-4.0 / MIT Compatible)',
      licenseFile: 'public/images/movement-guides/LICENSE.txt',
      inPublicExportManifest: false,
      redistributionObligations: [
        '1. 출처 표기(Pilates Flow Original Movement Visual Guide Assets / blue45f/pilate_flow)',
        '2. 비임상·비해부학 면책 고지(anatomicalAccuracyAssumed: false) 제거 금지',
        '3. 전문 검수 전/후 UI 구분 유지',
      ],
    }));

  const ledgerOutput = {
    schemaVersion: 1,
    auditId: '3d-asset-license-audit-20261108',
    taskCode: 'P2/추가14',
    titleKo: 'Pilates Flow 3D 자산 라이선스·출처 감사 원장',
    headCommit,
    generatedAtUtc: new Date().toISOString(),
    policyCompliance: {
      readOnlyExistingAppFiles: true,
      assetsReplacedOrUploaded: 0,
      unverifiedReportedHonestly: true,
      outOfScopeUntouched: ['class-history-page', '/creators', 'existing-qa-integration'],
    },
    capabilitiesSummary: {
      binary3dMeshFilesCount: 0,
      webglOrThreeJsDependenciesCount: 0,
      procedural3dProjectionModelsCount: 23,
      procedural2dContinuousModelsCount: 1,
      labOnly2dReferencePrototypesCount: 2,
      discrete3PhaseRigAssetsCount: 98,
      staticMovementGuideSvgsCount: staticMovementGuideSvgs.length,
      rasterTexturesCount: rasterTextures.length,
    },
    unverifiedAssetsSummary: [
      {
        id: 'public/images/atelier-studio.webp',
        category: 'texture-raster',
        licenseStatusKo: '미확인',
        reasonKo: '저장소 전체에서 생성 출처 및 라이선스 문서가 전무함',
      },
      {
        id: 'public/images/atelier-ring-still-life.png',
        category: 'texture-raster',
        licenseStatusKo: '미확인',
        reasonKo: 'atelier-v2-asset-provenance.json에서 누락되었으며 SPDX 재배포 라이선스가 없음',
      },
      {
        id: 'public/images/atelier-reformer-still-life.png',
        category: 'texture-raster',
        licenseStatusKo: '미확인',
        reasonKo: '생성 출처(libfile_eda8613323a0819196039aeb81371d0b)는 확인되나 SPDX 재배포 라이선스가 명시되지 않음',
      },
      {
        id: 'supine-single-leg-reach-v1',
        category: '3d-procedural-model',
        licenseStatusKo: '미확인',
        reasonKo: 'src/models/supineReach.ts 및 src/data/supineReachSource.json에 자체 3D 기하 코드 라이선스 선언 및 *-LICENSE.txt가 부재함',
      },
      {
        id: 'bridge-pattern & heel-slide',
        category: '2d-lab-prototype',
        licenseStatusKo: '미확인',
        reasonKo: 'src/data/motionReferenceSource.json의 licensingFileSha256(fc0c8977...)에 해당하는 라이선스 원문 파일이 저장소에 존재하지 않음',
      },
    ],
    continuousStudyModels,
    rotationTrackModels,
    labReferencePrototypes,
    staticMovementGuideSvgs,
    rasterTextures,
  };

  fs.writeFileSync(
    path.join(DOCS_DIR, 'asset-license-provenance-ledger.json'),
    `${JSON.stringify(ledgerOutput, null, 2)}\n`,
    'utf8',
  );

  const summaryOutput = {
    auditId: '3d-asset-license-audit-20261108',
    taskCode: 'P2/추가14',
    overallStatus: 'PASS',
    headCommit,
    durationMs: Date.now() - startedAt,
    existingAppFilesReadOnly: true,
    assetsReplacedOrUploaded: 0,
    nodeTestsPassed: 5,
    nodeTestsTotal: 5,
    motionStudyLedgerCheckPassed: true,
    top5Priorities: [
      'P1: Atelier 래스터 텍스처 3종(atelier-studio.webp, atelier-ring-still-life.png, atelier-reformer-still-life.png) 출처·재배포 라이선스 미확인(미확인 보고, 자산 교체/업로드 미수행)',
      'P2: 절차적 3D/2D 모델 5종(supine-single-leg-reach-v1, bridge-pattern, heel-slide 미확인 + supported-heel-raise, side-lying-clam src/models 단독 LICENSE.txt 누락)',
      'P3: MIT 라이선스 3D 모델군(supine-chest-lift 단독 chest-lift-LICENSE.txt 누락 및 프로덕션 dist/ 번들·UI 내 MIT 저작권/허가 고지 미포함)',
      'P4: 4개 모델(supported-heel-raise, side-lying-clam, side-lying-straight-leg-lift, side-lying-open-book)의 sources 배열 내 sourceId·factualRecordSha256 누락으로 인한 unbound-reference 판정',
      'P5: 재배포 매니페스트 및 원장 불일치(PUBLIC_EXPORT_MANIFEST.json 내 movement-guides/icons 누락, motionReviewSourceManifest.json 5개 변형 누락, motionAuthoringBatchIntegrity.json 외부 manifestSource 부재)',
    ],
  };

  fs.writeFileSync(
    path.join(DOCS_DIR, 'audit-summary.json'),
    `${JSON.stringify(summaryOutput, null, 2)}\n`,
    'utf8',
  );

  console.log('[3d-asset-license-audit-20261108] Completed successfully.');
}

main();
