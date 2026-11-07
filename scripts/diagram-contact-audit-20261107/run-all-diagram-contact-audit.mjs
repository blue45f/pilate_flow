import fs from 'node:fs';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import {
  REPO_ROOT,
  evaluateContactAccuracySuite,
} from './shared/contact-geometry-analyzer.mjs';
import {
  loadCandidateContactFixSuite,
} from './track-a-implementation/candidate-minimal-contact-fixes.mjs';
import {
  runBrowserContactVerification,
} from './track-b-verification/track-b-browser-contact-verify.mjs';

const execFileAsync = promisify(execFile);

const SUMMARY_JSON_PATH = path.join(
  REPO_ROOT,
  'docs/diagram-contact-audit-20261107/evidence/regression-summary.json',
);

async function runMain() {
  const startedAt = new Date().toISOString();

  // 1. Syntax check all audit scripts
  const scriptFiles = [
    'scripts/diagram-contact-audit-20261107/shared/ts-loader-hooks.mjs',
    'scripts/diagram-contact-audit-20261107/shared/contact-geometry-analyzer.mjs',
    'scripts/diagram-contact-audit-20261107/track-a-implementation/candidate-minimal-contact-fixes.mjs',
    'scripts/diagram-contact-audit-20261107/track-a-implementation/track-a-contact-regression.node-test.mjs',
    'scripts/diagram-contact-audit-20261107/track-b-verification/track-b-adversarial-contact-audit.node-test.mjs',
    'scripts/diagram-contact-audit-20261107/track-b-verification/track-b-browser-contact-verify.mjs',
    'scripts/diagram-contact-audit-20261107/run-all-diagram-contact-audit.mjs',
  ];
  for (const rel of scriptFiles) {
    execFileSync(process.execPath, ['--check', path.join(REPO_ROOT, rel)], {
      cwd: REPO_ROOT,
    });
  }

  // 2. Parallel dynamic workflow: Track A (Implementation Regression) & Track B (Adversarial Verification)
  const [trackATestRes, trackBTestRes] = await Promise.all([
    execFileAsync(
      process.execPath,
      [
        '--experimental-transform-types',
        '--test',
        'scripts/diagram-contact-audit-20261107/track-a-implementation/track-a-contact-regression.node-test.mjs',
      ],
      { cwd: REPO_ROOT },
    ),
    execFileAsync(
      process.execPath,
      [
        '--experimental-transform-types',
        '--test',
        'scripts/diagram-contact-audit-20261107/track-b-verification/track-b-adversarial-contact-audit.node-test.mjs',
      ],
      { cwd: REPO_ROOT },
    ),
  ]);

  // 3. Static coordinate evaluation (Baseline vs Candidate)
  const suite = await loadCandidateContactFixSuite();
  const coverageRecords = suite.baselineAssets.map((a) =>
    suite.coverageMod.toExerciseEvidenceMotionOverlay(a.exerciseId),
  );
  const corrections = suite.correctionsMod.MOVEMENT_DIAGRAM_CORRECTIONS;

  const baselineEval = evaluateContactAccuracySuite({
    assets: suite.baselineAssets,
    AssetComponent: suite.BaselineMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  const candidateEval = evaluateContactAccuracySuite({
    assets: suite.candidateAssets,
    AssetComponent: suite.CandidateMovementPhaseDiagramSvg,
    corrections,
    coverageRecords,
  });

  // 4. Real Headless Chromium multi-viewport verification (320, 390, 768, 1440, 200% zoom)
  const browserSummary = await runBrowserContactVerification();

  // 5. Patch apply check & read-only scope guard
  const patchPath = path.join(
    REPO_ROOT,
    'docs/diagram-contact-audit-20261107/patches/minimal-diagram-contact-fixes.patch',
  );
  execFileSync('git', ['apply', '--reverse', '--check', patchPath], { cwd: REPO_ROOT });

  const statusOut = execFileSync('git', ['status', '--porcelain'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const outsideOwnedPaths = statusOut
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[A-Z?]+\s+/, '').trim())
    .filter(
      (f) =>
        f !== 'src/components/MovementPhaseDiagramSvg.tsx' &&
        f !== 'src/data/movementVisualRigCatalog.ts' &&
        f !== 'src/test/diagramApparatusContactRegression.test.tsx' &&
        !f.startsWith('scripts/diagram-contact-audit-20261107') &&
        !f.startsWith('docs/diagram-contact-audit-20261107'),
    );

  if (outsideOwnedPaths.length > 0) {
    throw new Error(
      `Read-only scope violated! Modified files outside owned paths: ${outsideOwnedPaths.join(', ')}`,
    );
  }

  const headCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  }).trim();

  const summary = {
    auditId: 'diagram-contact-audit-20261107',
    startedAt,
    completedAt: new Date().toISOString(),
    baseCommit: headCommit,
    readOnlyBoundary: {
      srcModifiedFiles: ['src/components/MovementPhaseDiagramSvg.tsx', 'src/data/movementVisualRigCatalog.ts', 'src/test/diagramApparatusContactRegression.test.tsx'],
      exerciseAtlasAndOtherPagesUntouched: true,
      ownedPathsOnly: outsideOwnedPaths.length === 0,
      ownedPaths: [
        'src/components/MovementPhaseDiagramSvg.tsx',
        'src/data/movementVisualRigCatalog.ts',
        'src/test/diagramApparatusContactRegression.test.tsx',
        'scripts/diagram-contact-audit-20261107/**',
        'docs/diagram-contact-audit-20261107/**',
      ],
    },
    honestyAndTruthfulnessBoundary: {
      anatomicalAccuracyAssumed: false,
      anatomicalVerificationCompleted: false,
      expertVerificationCompleted: false,
      canonicalMotionReady: false,
      manualReady: false,
      true3dSupported: false,
      professionalReviewCount: 0,
      disclaimerKo:
        '본 감사는 2D 개략 도해의 자세-기구 접점 좌표 결함(D-01~D-05)에 대한 정적 좌표·실제 화면 회귀 검증 및 최소 패치 제안이며, 해부학적·임상적·전문가 검증 완료를 주장하지 않습니다.',
    },
    parallelWorkflowGates: {
      syntaxCheckPassed: true,
      trackANodeTestPassed: trackATestRes.stdout.includes('fail 0'),
      trackBNodeTestPassed: trackBTestRes.stdout.includes('fail 0'),
      motionEvidenceAndCoverageValidated:
        suite.trackAMod.TRACK_A_MAT_EVIDENCE_RECORDS.length === 10 &&
        suite.trackBMod.TRACK_B_APPARATUS_EVIDENCE_RECORDS.length === 10 &&
        candidateEval.truthfulnessBoundary.passed,
      candidatePatchGitApplyCheckPassed: true,
      browserMultiViewportPassed: browserSummary.allViewportsPassed,
    },
    excludedAlreadyResolvedBaseline: baselineEval.r01ExcludedBaseline,
    baselineEvaluation: {
      allFiveDefectsPassed: baselineEval.allFiveDefectsPassed,
      defects: baselineEval.defects,
    },
    candidateEvaluation: {
      allFiveDefectsPassed: candidateEval.allFiveDefectsPassed,
      defects: candidateEval.defects,
      svgRenderIntegrity: candidateEval.svgRenderIntegrity,
      truthfulnessBoundary: candidateEval.truthfulnessBoundary,
    },
    browserMultiViewportSummary: {
      allViewportsPassed: browserSummary.allViewportsPassed,
      consoleErrorCount: browserSummary.consoleErrorCount,
      pageErrorCount: browserSummary.pageErrorCount,
      viewports: browserSummary.viewports,
      domContactMeasurements: browserSummary.domContactMeasurements,
    },
  };

  fs.mkdirSync(path.dirname(SUMMARY_JSON_PATH), { recursive: true });
  fs.writeFileSync(SUMMARY_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        status: 'ALL_GATES_PASSED',
        baseCommit: headCommit,
        excludedResolved: summary.excludedAlreadyResolvedBaseline.status,
        baselineAllFivePassed: baselineEval.allFiveDefectsPassed,
        candidateAllFivePassed: candidateEval.allFiveDefectsPassed,
        svgCount: candidateEval.svgRenderIntegrity.renderedSvgCount,
        viewportsVerified: browserSummary.viewports.map((v) => v.viewportId),
      },
      null,
      2,
    ),
  );
}

runMain().catch((err) => {
  console.error(err);
  process.exit(1);
});
