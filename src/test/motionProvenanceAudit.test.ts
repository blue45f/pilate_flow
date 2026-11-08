import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import coreAbdominalLedger from '../data/coreAbdominalSourceLedger.json';
import { COURSE_REFERENCES } from '../data/courseReferences';
import {
  EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  EXTENSION_PUBLIC_SOURCES,
} from '../data/extensionDiagramSources';
import {
  getRelatedYouTubeVideosForMotion,
  VERIFIED_YOUTUBE_VIDEO_POOL,
} from '../data/exerciseYouTubeCatalog';
import hipLegSources from '../data/hip-leg-diagram-sources.json';
import apparatusLedger from '../data/motionApparatusSourceLedger.json';
import {
  BATCH_SOURCE_FACTS,
  BATCH_VARIANTS,
} from '../data/motionAuthoringBatch';
import batchIntegrity from '../data/motionAuthoringBatchIntegrity.json';
import {
  getMotionCandidateResearch,
  MOTION_CANDIDATE_RESEARCH_V7_ASSOCIATION,
} from '../data/motionCandidateResearch';
import candidateLedgerV7 from '../data/motionCandidateResearchV7.json';
import { MOTION_DRAFT_COMPARISONS } from '../data/motionDraftIndex';
import { getMotionDraft, MOTION_DRAFTS } from '../data/motionDrafts';
import draftLedger from '../data/motionDraftSourceLedger.json';
import {
  getMotionPatternReferences,
  MOTION_PATTERN_REFERENCES,
} from '../data/motionPatternReferences';
import quadrupedLedger from '../data/motionQuadrupedSourceLedger.json';
import {
  EXERCISE_MOTION_REFERENCES,
  getExerciseMotionReference,
  MOTION_REFERENCE_COUNTS,
} from '../data/motionReferences';
import reviewManifest from '../data/motionReviewSourceManifest.json';
import selectedV5Ledger from '../data/motionSelectedV5SourceLedger.json';
import selectedV6Ledger from '../data/motionSelectedV6SourceLedger.json';
import standingLedger from '../data/motionStandingSourceLedger.json';
import studyLedger from '../data/motionStudyLedger.json';
import tensionLedger from '../data/motionTensionSourceLedger.json';
import { MOVEMENT_DIAGRAM_CORRECTIONS } from '../data/movementDiagramCorrections';
import { getMovementProvenance, getMovementVideoLink } from '../data/movementProvenance';
import {
  MOVEMENT_VISUAL_ASSETS,
  getMovementVisualAsset,
} from '../data/movementVisualRigCatalog';
import {
  CATALOG_VISUAL_SOURCE_COMPARISONS,
  getVisualSourceComparison,
} from '../data/movementVisualSourceAudit';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import {
  PELVIS_HIP_PROVENANCE_SOURCES,
  PELVIS_HIP_TRUTHFULNESS_METADATA,
} from '../data/pelvisHipProvenance';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { PUBLIC_REFERENCES } from '../data/publicReferences';
import { ROTATION_PATTERN_REFERENCES } from '../data/rotationDiagramData';
import rotationSourceFacts from '../data/rotationSourceFacts.json';
import shoulderSupportLedger from '../data/shoulderSupportSourceLedger.json';
import { SPINE_TRUTHFULNESS_METADATA } from '../data/spineArticulationDiagramData';
import { SUPINE_REACH_DEFINITION } from '../data/supineReach';
import supineReachSource from '../data/supineReachSource.json';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { runMotionCoverageCatalogSweep } from '../features/motionCoverage/catalogSweep';
import {
  getMotionCoverageSummary,
  resolveMotionCoverage,
} from '../features/motionCoverage/index';
import { CHEST_LIFT_PROVENANCE } from '../models/chestLiftProvenance';
import { PELVIC_CURL_PROVENANCE } from '../models/pelvicCurl';
import type { PilatesExercise } from '../types/pilates';
import { getExerciseEvidence } from '../utils/exerciseEvidence';
import { DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY } from '../utils/humanMovementCreation';
import { getMotionReviewSourceFacts } from '../utils/motionReviewSourceFacts';
import { getMotionDraftReviewWorksheet } from '../utils/motionReviewWorksheet';
import { resolveMovementMediaBundle } from '../utils/movementMediaMatcher';
import { syntheticPlanningExercise } from './planningFixtures';

const canonicalJson = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonicalJson)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, item]) => [key, canonicalJson(item)]),
        )
      : value;

const sha256Json = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalJson(value)))
    .digest('hex');

function collectFilesRecursively(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('[P7/추가14] Pilates Flow motion provenance audit (read-only & synthetic data verification)', () => {
  it('1. distinguishes movement schematics from P2 3D mesh/texture assets and confirms zero mocap/3D binary files', () => {
    expect(DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY).toMatchObject({
      originType: 'instructor-created-draft',
      evaluationBasis: 'subjective-instructor-feel',
      aiSafetyGuaranteed: false,
      objectiveEfficacyClaimed: false,
      expertVerified: false,
    });
    const summary = getMotionCoverageSummary();
    expect(summary.true3dReadyCount).toBe(0);
    expect(summary.canonicalReadyCount).toBe(0);
    expect(summary.expertApprovedCount).toBe(0);
    expect(summary.anatomicalAccuracyAssumedCount).toBe(0);
    for (const variant of BATCH_VARIANTS) {
      expect(variant).toMatchObject({
        license: '0BSD',
        sourceMediaReused: false,
        sourceMediaTraced: false,
        motionCaptureUsed: false,
        professionalReviewCount: 0,
        exactAssetReady: false,
      });
    }
    expect(batchIntegrity.assets).toHaveLength(4);
    expect(PELVIS_HIP_TRUTHFULNESS_METADATA).toMatchObject({
      anatomicalAccuracyAssumed: false,
      motionCaptureBacked: false,
      medicalOrTherapeuticGuarantee: false,
      professionalReviewCount: 0,
    });
    expect(SPINE_TRUTHFULNESS_METADATA).toMatchObject({
      anatomicalAccuracyAssumed: false,
      clinicallyValidated: false,
      peerReviewedBiomechanicalCapture: false,
      containsMedicalDiagnosisOrGuarantee: false,
      professionalReviewCount: 0,
    });
    expect(EXTENSION_MEDICAL_AND_REVIEW_POLICY).toMatchObject({
      anatomicalAccuracyAssumed: false,
      medicalDiagnosisProhibited: true,
      therapeuticEffectGuaranteeProhibited: true,
      professionalReviewCount: 0,
    });
    expect(coreAbdominalLedger.truthfulness).toMatchObject({
      anatomicalAccuracyAssumed: false,
      medicalDiagnosisProhibited: true,
      therapeuticEffectGuaranteeProhibited: true,
      professionalReviewCount: 0,
    });
    expect(hipLegSources.truthfulnessMetadata).toMatchObject({
      anatomicalAccuracyAssumed: false,
      motionCaptureUsed: false,
      clinicalDiagnosisOrTreatmentGuaranteed: false,
      professionalReviewCount: 0,
    });
    expect(rotationSourceFacts.rights).toMatchObject({
      motionCaptureUsed: false,
      anatomicalAccuracyAssumed: false,
      professionalReviewCount: 0,
    });
    expect(shoulderSupportLedger).toMatchObject({
      anatomicalAccuracyAssumed: false,
      externalMediaCopiedOrTraced: false,
      professionalReviewCount: 0,
    });

    const rootDir = process.cwd();
    const scannedFiles = [
      ...collectFilesRecursively(path.join(rootDir, 'src')),
      ...collectFilesRecursively(path.join(rootDir, 'public')),
    ];
    const forbidden3dOrMocapExts = new Set([
      '.bvh',
      '.c3d',
      '.fbx',
      '.gltf',
      '.glb',
      '.obj',
      '.dae',
      '.usd',
      '.usdz',
    ]);
    const foundBinaryAssets = scannedFiles.filter((filePath) =>
      forbidden3dOrMocapExts.has(path.extname(filePath).toLowerCase()),
    );
    expect(foundBinaryAssets).toEqual([]);
  });

  it('2. verifies permissive software/schematic licenses and non-endorsement disclosures across all model license files', () => {
    const rootDir = process.cwd();
    const licensePaths = [
      'src/models/LATERAL-LICENSE.txt',
      'src/models/QUADRUPED-LICENSE.txt',
      'src/models/SUPINE-LICENSE.txt',
      'src/models/apparatus-LICENSE.txt',
      'src/models/pelvic-curl-LICENSE.txt',
      'src/models/seated-band-row-LICENSE.txt',
      'src/models/standing-support-LICENSE.txt',
      'src/models/tension-LICENSE.txt',
      'src/models/rotation-LICENSE.txt',
      'src/models/shoulder-support-LICENSE.txt',
      'public/images/movement-guides/LICENSE.txt',
    ];

    for (const relPath of licensePaths) {
      const fullPath = path.join(rootDir, relPath);
      expect(existsSync(fullPath), `Missing license file: ${relPath}`).toBe(true);
      const content = readFileSync(fullPath, 'utf8');
      expect(content.length).toBeGreaterThan(100);
      expect(/MIT|0BSD|BSD Zero Clause|CC0-1\.0|CC-BY-4\.0/.test(content)).toBe(true);
    }

    expect(CHEST_LIFT_PROVENANCE.originalCodeLicense).toContain('MIT');
    expect(PELVIC_CURL_PROVENANCE.license).toContain('MIT');
    expect(BATCH_VARIANTS.every((v) => v.license === '0BSD')).toBe(true);
  });

  it('3. audits movement data, reference videos, and SHA-256 factual ledgers without mutating catalog state', () => {
    const beforeExercises = JSON.stringify(INITIAL_EXERCISES);
    const beforeRefs = JSON.stringify(VERIFIED_REFERENCES);

    const legacyExercises = INITIAL_EXERCISES.filter((ex) => ex.id.startsWith('ex-'));
    expect(ORIGINAL_MOVEMENTS).toHaveLength(60);
    expect(legacyExercises).toHaveLength(38);
    expect(INITIAL_EXERCISES).toHaveLength(98);
    expect(MOVEMENT_VISUAL_ASSETS).toHaveLength(98);
    expect(CATALOG_VISUAL_SOURCE_COMPARISONS).toHaveLength(98);
    expect(Object.keys(EXERCISE_MOTION_REFERENCES)).toHaveLength(98);
    expect(MOTION_REFERENCE_COUNTS).toEqual({
      catalogExercises: 98,
      authoredCatalogMotions: 0,
      expertApprovedMotions: 0,
      labPrototypes: 2,
    });

    expect(VERIFIED_REFERENCES).toHaveLength(30);
    expect(
      VERIFIED_REFERENCES.filter((ref) => ref.verificationStatus === 'official-source-checked'),
    ).toHaveLength(18);
    expect(
      VERIFIED_REFERENCES.filter((ref) => ref.verificationStatus === 'partial-playback-checked'),
    ).toHaveLength(3);
    expect(
      VERIFIED_REFERENCES.filter((ref) => ref.verificationStatus === 'korean-candidate'),
    ).toHaveLength(9);
    expect(
      VERIFIED_REFERENCES.filter((ref) => (ref.observationPoints?.length ?? 0) > 0).map(
        (ref) => ref.id,
      ),
    ).toEqual(['mv-01', 'mv-02', 'mv-03']);
    expect(new Set(VERIFIED_REFERENCES.map((ref) => ref.url)).size).toBe(25);

    expect(VERIFIED_YOUTUBE_VIDEO_POOL).toHaveLength(141);
    expect(VERIFIED_YOUTUBE_VIDEO_POOL.filter((item) => item.region === 'kr')).toHaveLength(76);
    expect(VERIFIED_YOUTUBE_VIDEO_POOL.filter((item) => item.region === 'global')).toHaveLength(65);
    expect(COURSE_REFERENCES.length).toBeGreaterThanOrEqual(30);
    expect(PUBLIC_REFERENCES).toHaveLength(3);
    expect(MOTION_CANDIDATE_RESEARCH_V7_ASSOCIATION.canonicalAssetMappingsAdded).toBe(0);
    expect(getMotionCandidateResearch('original-mat-swan-prep')).toHaveLength(1);
    expect(getMotionCandidateResearch('original-mat-forearm-plank')).toHaveLength(1);
    expect(candidateLedgerV7.sources).toHaveLength(2);
    expect(candidateLedgerV7.counts.matCatalogIdsWithoutExistingProposals).toBe(8);
    expect(PELVIS_HIP_PROVENANCE_SOURCES).toHaveLength(6);
    expect(EXTENSION_PUBLIC_SOURCES).toHaveLength(6);
    expect(Object.keys(MOVEMENT_DIAGRAM_CORRECTIONS).length).toBeGreaterThanOrEqual(45);

    for (const ledger of [
      draftLedger,
      apparatusLedger,
      tensionLedger,
      selectedV5Ledger,
      selectedV6Ledger,
    ]) {
      for (const source of ledger.sources) {
        expect(sha256Json(source.factualRecord)).toBe(source.factualRecordSha256);
      }
    }
    for (const record of [
      ...quadrupedLedger.source_facts,
      ...standingLedger.source_factual_records,
    ]) {
      const { factual_record_sha256, ...rest } = record;
      expect(sha256Json(rest)).toBe(factual_record_sha256);
    }

    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(beforeExercises);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(beforeRefs);
  });

  it('4. reproduces Top 5 provenance & name-mapping findings using read-only and synthetic data probes', () => {
    // [Priority 1] Unbound source references in MOTION_DRAFTS (supported-heel-raise, side-lying-clam)
    // and non-imported supineReachSource.json / BATCH_SOURCE_FACTS in getMotionReviewSourceFacts
    const unboundDraftIds = MOTION_DRAFTS.filter((draft) =>
      getMotionReviewSourceFacts(draft).some((fact) => fact.binding === 'unbound-reference'),
    ).map((draft) => draft.id);
    expect(unboundDraftIds).toEqual(['supported-heel-raise', 'side-lying-clam']);

    const boundDraftIds = MOTION_DRAFTS.filter((draft) =>
      getMotionReviewSourceFacts(draft).every((fact) => fact.binding === 'linked-factual-record'),
    ).map((draft) => draft.id);
    expect(boundDraftIds).toHaveLength(15);

    const heelRaiseDraft = getMotionDraft('supported-heel-raise')!;
    expect(heelRaiseDraft.sources[0].sourceId).toBeUndefined();
    expect(heelRaiseDraft.sources[0].factualRecordSha256).toBeUndefined();

    // Synthetic probe: passing supineReachSource.sourceId or BATCH_SOURCE_FACTS[0].id into getMotionReviewSourceFacts
    const syntheticSupineDraft = {
      ...getMotionDraft('supine-chest-lift')!,
      sources: [
        {
          label: supineReachSource.title,
          url: supineReachSource.url,
          sourceId: supineReachSource.sourceId,
          factualRecordSha256: sha256Json(supineReachSource.facts),
        },
        {
          label: BATCH_SOURCE_FACTS[0].title,
          url: BATCH_SOURCE_FACTS[0].url,
          sourceId: BATCH_SOURCE_FACTS[0].id,
          factualRecordSha256: sha256Json(BATCH_SOURCE_FACTS[0]),
        },
      ],
    };
    const syntheticFacts = getMotionReviewSourceFacts(syntheticSupineDraft);
    expect(syntheticFacts.map((item) => item.binding)).toEqual([
      'unbound-reference',
      'unbound-reference',
    ]);

    // [Priority 2] Asymmetry across motion registries (17 vs 22 vs 98) + Track I6/I8 hash/manifest gaps
    expect(reviewManifest.entries).toHaveLength(17);
    expect(studyLedger.entries).toHaveLength(22);
    expect(MOTION_PATTERN_REFERENCES).toHaveLength(22);
    expect(MOTION_DRAFT_COMPARISONS).toHaveLength(17);
    expect(BATCH_VARIANTS).toHaveLength(4);
    expect(SUPINE_REACH_DEFINITION.id).toBe('supine-single-leg-reach-v1');

    // Track I8: a source-record checksum is not a geometry checksum.
    for (const rotRef of ROTATION_PATTERN_REFERENCES) {
      expect(rotRef.assetSha256).toBeNull();
    }
    expect(rotationSourceFacts.sources.every((source) => !('factualRecordSha256' in source))).toBe(true);
    expect(rotationSourceFacts.sources.every((source) => source.verification === 'public-text-checked')).toBe(true);

    // Track I6 Shoulder Support: 2 static guide SVGs exist on disk outside MANIFEST.json (which has 5 apparatus guides)
    const rootDir = process.cwd();
    const mainSvgManifest = JSON.parse(
      readFileSync(path.join(rootDir, 'public/images/movement-guides/MANIFEST.json'), 'utf8'),
    ) as { assets: { fileName: string }[] };
    const manifestedFileNames = new Set(mainSvgManifest.assets.map((item) => item.fileName));
    expect(manifestedFileNames.has('shoulder-support-push-up-guide.svg')).toBe(false);
    expect(manifestedFileNames.has('shoulder-support-leg-pull-front-guide.svg')).toBe(false);
    expect(
      existsSync(
        path.join(rootDir, 'public/images/movement-guides/shoulder-support-push-up-guide.svg'),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          rootDir,
          'public/images/movement-guides/shoulder-support-leg-pull-front-guide.svg',
        ),
      ),
    ).toBe(true);

    // [Priority 3] Legacy provenance prefix classification vs Round 5 cleared YouTube notes in getExerciseEvidence
    const legacyExercises = INITIAL_EXERCISES.filter((ex) => ex.id.startsWith('ex-'));
    const clearedLegacyExercises = legacyExercises.filter(
      (ex) => !ex.youtube.url && !ex.youtube.videoId,
    );
    expect(clearedLegacyExercises.map((ex) => ex.id)).toEqual([
      'ex-warmup-01',
      'ex-footwork-02',
      'ex-cooldown-02',
      'ex-core-04',
      'ex-lower-04',
    ]);
    for (const ex of clearedLegacyExercises) {
      expect(ex.youtube.channelName).toBe('자료 미확인');
      expect(ex.youtube.note).toContain('자료 미확인');
      const prov = getMovementProvenance(ex);
      expect(prov.kind).toBe('legacy');
      expect(getMovementVideoLink(ex)).toBeNull();
      const ev = getExerciseEvidence(ex);
      expect(ev.source.kind).toBe('none');
      expect(ev.source.label).toBe('외부 출처 미등록');
      expect(ev.links).toEqual([]);
    }

    // Synthetic probe: custom vs legacy prefix with identical verified note
    const syntheticClearedLegacy: PilatesExercise = {
      ...syntheticPlanningExercise('mat', 'core', 'alpha', false),
      id: 'ex-synthetic-cleared-01',
      isCustom: false,
      youtube: {
        videoId: '',
        url: '',
        channelName: '자료 미확인',
        videoTitle: '합성 미확인 영상',
        startSec: 0,
        note: '합성 oEmbed 미확인 사유 메모',
      },
    };
    const syntheticEv = getExerciseEvidence(syntheticClearedLegacy);
    expect(syntheticEv.provenance.kind).toBe('legacy');
    expect(syntheticEv.source.kind).toBe('none');
    expect(JSON.stringify(syntheticEv.source)).not.toContain('합성 oEmbed 미확인 사유 메모');

    // [Priority 4] Heuristic category/family fallback in selectVerifiedReferencesForExercise & resolveMotionCoverage
    const coverageSweep = runMotionCoverageCatalogSweep();
    expect(coverageSweep.totalCatalogCount).toBe(98);
    expect(coverageSweep.true3dSupportedTrueCount).toBe(0);
    expect(coverageSweep.canonicalMotionReadyTrueCount).toBe(0);
    expect(coverageSweep.manualReadyTrueCount).toBe(0);
    expect(coverageSweep.controllerDestroyedCleanly).toBe(true);

    const openBookCoverage = resolveMotionCoverage('original-mat-open-book');
    expect(openBookCoverage.primaryMode).toBe('projected-3d');
    expect(openBookCoverage.safetyFlags.true3dSupported).toBe(false);

    const mermaidCoverage = resolveMotionCoverage('original-mat-mermaid');
    expect(mermaidCoverage.primaryMode).toBe('projected-3d');
    expect(mermaidCoverage.safetyFlags.true3dSupported).toBe(false);

    const ribBreathCoverage = resolveMotionCoverage('original-mat-rib-breath');
    expect(ribBreathCoverage.primaryMode).toBe('three-phase-2d');
    expect(ribBreathCoverage.safetyFlags.true3dSupported).toBe(false);

    // Synthetic exercise with no exact title match still receives 3 category-level VERIFIED_REFERENCES
    const syntheticUnmappedMat: PilatesExercise = {
      ...syntheticPlanningExercise('mat', 'warmup', 'beta', false),
      id: 'ex-synthetic-unmapped-mat',
      nameKo: '존재하지 않는 합성 매트 동작',
      nameEn: 'Nonexistent Synthetic Mat Movement',
    };
    const matchedComparison = getVisualSourceComparison(syntheticUnmappedMat);
    expect(matchedComparison.matchedReliableSources.length).toBeGreaterThanOrEqual(3);
    expect(matchedComparison.matchedReliableSources.map((s) => s.id)).toEqual(
      expect.arrayContaining(['kr-08', 'kr-09', 'kr-02']),
    );
    expect(matchedComparison.anatomicalAccuracyAssumed).toBe(false);
    expect(matchedComparison.professionalMotionReviewCount).toBe(0);

    const mediaBundle = resolveMovementMediaBundle(syntheticUnmappedMat);
    expect(mediaBundle.primaryMatch.matchTier).toBeDefined();
    expect(mediaBundle.matches.length).toBeGreaterThanOrEqual(1);
    const chestLiftPatternRef = MOTION_PATTERN_REFERENCES.find(
      (ref) => ref.variantId === 'supine-chest-lift',
    )!;
    expect(getRelatedYouTubeVideosForMotion(chestLiftPatternRef).length).toBeGreaterThan(0);

    // [Priority 5] Identifier slug vs apparatus mismatch on ex-global-reformer-02
    const globalReformer02 = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-global-reformer-02')!;
    expect(globalReformer02).toBeDefined();
    expect(globalReformer02.id).toContain('reformer');
    expect(globalReformer02.apparatus).toBe('mat');
    expect(globalReformer02.nameKo).toContain('Flow with Mira');
    expect(getExerciseMotionReference('ex-global-reformer-02')?.exerciseId).toBe(
      'ex-global-reformer-02',
    );
    expect(getMovementVisualAsset('ex-global-reformer-02')?.apparatus).toBe('mat');
    expect(getMotionPatternReferences('ex-global-reformer-02')).toEqual([]);
    expect(
      getMotionDraftReviewWorksheet(getMotionDraft('supine-chest-lift')!).unavailableReason,
    ).toBeNull();
  });
});
