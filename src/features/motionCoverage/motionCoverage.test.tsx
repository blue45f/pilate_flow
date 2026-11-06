import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BATCH_VARIANTS } from '../../data/motionAuthoringBatch';
import { getMotionCandidateResearch } from '../../data/motionCandidateResearch';
import { MOTION_DRAFT_COMPARISONS } from '../../data/motionDraftIndex';
import { MOTION_DRAFTS } from '../../data/motionDrafts';
import { MOTION_PATTERN_REFERENCES } from '../../data/motionPatternReferences';
import {
  EXERCISE_MOTION_REFERENCES,
  MOTION_PROTOTYPES,
  MOTION_REFERENCE_COUNTS,
} from '../../data/motionReferences';
import {
  calculatePhaseJointDelta,
  getMovementVisualAsset,
  MOVEMENT_VISUAL_ASSETS,
  MOVEMENT_VISUAL_ASSET_MAP,
} from '../../data/movementVisualRigCatalog';
import { CATALOG_VISUAL_SOURCE_COMPARISONS } from '../../data/movementVisualSourceAudit';
import { ORIGINAL_MOVEMENTS } from '../../data/originalMovements';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { SUPINE_REACH_DEFINITION } from '../../data/supineReach';
import { getExerciseEvidence } from '../../utils/exerciseEvidence';
import {
  buildIntegrationCallSnapshot,
  evaluateMotionCandidateMatch,
  getMotionCoverageSummary,
  getReusedCatalogVisualAsset,
  inspectReusedPhaseKinematics,
  isCanonicalMotionReady,
  MotionCoverageEvidenceDlItems,
  MotionCoverageStatusBadge,
  MotionCoverageUnifiedViewer,
  resolveAllCatalogMotionCoverage,
  resolveMotionCoverage,
  resolvePatternReferencesForRenderer,
  resolveRenderableMotionDescriptor,
  resolveVisualAssetForRenderer,
  toAllPhaseDiagramProps,
  toExerciseEvidenceMotionOverlay,
  toExerciseEvidenceWithMotionCoverage,
  toMovementPhaseDiagramProps,
  toMovementTriptychProps,
  verifyZeroDuplicateVisualAssets,
} from './index';

describe('motionCoverage module — 98 catalog reuse, registry cross-check, draft vs continuous, projected-3d vs true-3d, and non-ready invariants', () => {
  it('cross-verifies all 98 catalog IDs against existing rig and motion reference registries', () => {
    expect(INITIAL_EXERCISES).toHaveLength(98);
    expect(ORIGINAL_MOVEMENTS).toHaveLength(60);
    expect(MOVEMENT_VISUAL_ASSETS).toHaveLength(98);
    expect(MOVEMENT_VISUAL_ASSET_MAP.size).toBe(98);
    expect(CATALOG_VISUAL_SOURCE_COMPARISONS).toHaveLength(98);
    expect(EXERCISE_MOTION_REFERENCES).toHaveLength(98);
    expect(MOTION_PROTOTYPES).toHaveLength(2);
    expect(MOTION_PATTERN_REFERENCES).toHaveLength(22);
    expect(MOTION_DRAFTS).toHaveLength(17);
    expect(MOTION_DRAFT_COMPARISONS).toHaveLength(17);
    expect(BATCH_VARIANTS).toHaveLength(4);
    expect(SUPINE_REACH_DEFINITION.id).toBe('supine-single-leg-reach-v1');
    expect(MOTION_REFERENCE_COUNTS.authoredCatalogMotions).toBe(0);
    expect(MOTION_REFERENCE_COUNTS.expertApprovedMotions).toBe(0);

    const allResolutions = resolveAllCatalogMotionCoverage();
    expect(allResolutions).toHaveLength(98);

    const summary = getMotionCoverageSummary();
    expect(summary.totalCatalogExercises).toBe(98);
    expect(summary.registryCrossCheck).toEqual({
      catalogExercisesCount: 98,
      originalMovementsCount: 60,
      movementVisualAssetsCount: 98,
      exerciseMotionReferencesCount: 98,
      motionPatternReferencesCount: 22,
      motionDraftsCount: 17,
      batchVariantsCount: 4,
      motionPrototypesCount: 2,
      professionalMotionReviewCount: 0,
    });

    expect(summary.primaryModeCounts['projected-3d']).toBe(20);
    expect(summary.primaryModeCounts['continuous-2d']).toBe(1);
    expect(summary.primaryModeCounts['three-phase-2d']).toBe(77);
    expect(summary.primaryModeCounts.missing).toBe(0);

    expect(summary.modeSupportCounts.projected3d).toBe(20);
    expect(summary.modeSupportCounts.continuous2d).toBe(1);
    expect(summary.modeSupportCounts.threePhase2d).toBe(98);
    expect(summary.modeSupportCounts.threePhase2dCatalogVerified).toBe(98);
    expect(summary.modeSupportCounts.threePhase2dReusedByIdentity).toBe(98);
    expect(summary.modeSupportCounts.duplicateAssetCount).toBe(0);
    expect(summary.modeSupportCounts.missing).toBe(0);

    // Non-negotiable global safety invariants
    expect(summary.canonicalReadyCount).toBe(0);
    expect(summary.canonicalContinuousReadyCount).toBe(0);
    expect(summary.true3dReadyCount).toBe(0);
    expect(summary.expertApprovedCount).toBe(0);
    expect(summary.anatomicalAccuracyAssumedCount).toBe(0);
    expect(summary.unauthoredResearchCandidateCount).toBe(2);
  });

  it('reuses the existing 98 2D poses directly by reference identity without creating duplicate assets', () => {
    const dedupAudit = verifyZeroDuplicateVisualAssets();
    expect(dedupAudit).toEqual({
      totalCatalogAssets: 98,
      reusedByIdentityCount: 98,
      duplicateAssetCount: 0,
    });

    for (const exercise of INITIAL_EXERCISES) {
      const canonicalRigAsset = getMovementVisualAsset(exercise.id);
      const mapRigAsset = MOVEMENT_VISUAL_ASSET_MAP.get(exercise.id);
      const reusedAsset = getReusedCatalogVisualAsset(exercise.id);
      const adapterAsset = resolveVisualAssetForRenderer(exercise.id);
      const resolution = resolveMotionCoverage(exercise.id);

      expect(canonicalRigAsset).not.toBeNull();
      // Strict === reference identity check: zero duplicate asset objects allocated
      expect(reusedAsset).toBe(canonicalRigAsset);
      expect(adapterAsset).toBe(canonicalRigAsset);
      expect(resolution.threePhase2d.asset).toBe(canonicalRigAsset);
      expect(resolution.threePhase2d.asset).toBe(mapRigAsset);
      expect(resolution.threePhase2d.reusesExistingCatalogAsset).toBe(true);
      expect(resolution.threePhase2d.sourceKind).toBe('catalog-rig-verified');

      const kinematics = inspectReusedPhaseKinematics(exercise.id);
      expect(kinematics).not.toBeNull();
      expect(kinematics?.asset).toBe(canonicalRigAsset);
      expect(kinematics?.reusesCanonicalAssetReference).toBe(true);
      expect(kinematics?.startToMiddleMaxDeltaPx).toBe(
        calculatePhaseJointDelta(canonicalRigAsset!).maxDeltaPx,
      );
      expect(kinematics?.startToMiddleMaxDeltaPx).toBeGreaterThan(0);
      expect(kinematics?.middleToEndMaxDeltaPx).toBeGreaterThan(0);
    }
  });

  it('distinguishes discrete 3-phase 2D vs continuous progress, and draft proposals vs canonical continuous', () => {
    // 1. All 98 canonical EXERCISE_MOTION_REFERENCES are `not_authored` with `asset: null`
    for (const motionRef of EXERCISE_MOTION_REFERENCES) {
      expect(motionRef.status).toBe('not_authored');
      expect(motionRef.asset).toBeNull();
      expect(motionRef.professionalReviewStatus).toBe('unreviewed');
    }

    // 2. Discrete 3-phase 2D (`ex-warmup-01` has only 3-phase 2D support)
    const discreteOnly = resolveMotionCoverage('ex-warmup-01');
    expect(discreteOnly.primaryMode).toBe('three-phase-2d');
    expect(discreteOnly.readinessState).toBe('three-phase-2d-schematic-only');
    expect(discreteOnly.threePhase2d.temporalKind).toBe('discrete-three-phase');
    expect(discreteOnly.threePhase2d.isContinuousPlayback).toBe(false);
    expect(discreteOnly.threePhase2d.isDraftProposal).toBe(false);
    expect(discreteOnly.threePhase2d.isCanonicalMotionAsset).toBe(false);
    expect(discreteOnly.threePhase2d.phaseCount).toBe(3);
    expect(discreteOnly.continuous2d.isContinuousPlayback).toBe(false);
    expect(discreteOnly.projected3d.isContinuousPlayback).toBe(false);

    // 3. Continuous 2D pattern-reference draft (`original-mat-ankle-reach` -> `supported-heel-raise`)
    const ankleReach = resolveMotionCoverage('original-mat-ankle-reach');
    expect(ankleReach.primaryMode).toBe('continuous-2d');
    expect(ankleReach.readinessState).toBe('related-pattern-draft-only');
    expect(ankleReach.continuous2d.supported).toBe(true);
    expect(ankleReach.continuous2d.sourceKind).toBe('pattern-reference-2d');
    expect(ankleReach.continuous2d.temporalKind).toBe('continuous-progress');
    expect(ankleReach.continuous2d.isContinuousPlayback).toBe(true);
    expect(ankleReach.continuous2d.isDraftProposal).toBe(true);
    expect(ankleReach.continuous2d.isCanonicalMotionAsset).toBe(false);
    expect(ankleReach.continuous2d.assetStatus).toBe('authored-unreviewed-draft');
    expect(ankleReach.continuous2d.relation).toBe('pattern-reference');
    expect(ankleReach.continuous2d.draftRig).toBe('ordinary-chair');
    expect(ankleReach.continuous2d.isPrototypeOnly).toBe(false);
    expect(ankleReach.safetyFlags.canonicalContinuousReady).toBe(false);

    // 4. Lab prototype 2D (`bridge-pattern`, `heel-slide` with `useScope: 'design_prototype_only'`)
    const bridgeDefault = resolveMotionCoverage('original-mat-bridge');
    expect(bridgeDefault.continuous2d.supported).toBe(false);
    expect(bridgeDefault.continuous2d.isContinuousPlayback).toBe(false);
    expect(bridgeDefault.continuous2d.isDraftProposal).toBe(true);
    expect(bridgeDefault.continuous2d.assetStatus).toBe('draft');
    expect(bridgeDefault.continuous2d.relation).toBe('design_prototype_only');

    const bridgeOptIn = resolveMotionCoverage('original-mat-bridge', {
      includeLabPrototypesInContinuous2d: true,
      preferMode: 'continuous-2d',
    });
    expect(bridgeOptIn.primaryMode).toBe('continuous-2d');
    expect(bridgeOptIn.readinessState).toBe('lab-prototype-only');
    expect(bridgeOptIn.continuous2d.supported).toBe(true);
    expect(bridgeOptIn.continuous2d.sourceKind).toBe('lab-prototype-2d');
    expect(bridgeOptIn.continuous2d.isContinuousPlayback).toBe(true);
    expect(bridgeOptIn.continuous2d.isDraftProposal).toBe(true);
    expect(bridgeOptIn.continuous2d.isCanonicalMotionAsset).toBe(false);
    expect(bridgeOptIn.continuous2d.isPrototypeOnly).toBe(true);
  });

  it('distinguishes projected-3d (oblique 3D-to-2D SVG projection) from true/real 3D engines', () => {
    const expectedProjected3dIds = [
      'original-mat-clam',
      'original-mat-heel-slide',
      'original-mat-knee-fold',
      'original-mat-side-leg-lift',
      'original-mat-open-book',
      'original-mat-quadruped-reach',
      'original-reformer-parallel-footwork',
      'original-chair-seated-pedal-press',
      'original-reformer-supine-arm-press',
      'original-cadillac-arm-spring-press',
      'original-barrel-standing-hip-extension',
      'original-barrel-standing-side-reach',
      'original-mat-band-row',
      'original-mat-chest-lift',
      'original-mat-bridge',
      'original-mat-seated-arm-reach',
      'original-mat-mermaid',
      'original-mat-swimming-prep',
      'original-mat-swan-prep',
      'original-mat-single-leg-stretch',
    ];

    for (const id of expectedProjected3dIds) {
      const res = resolveMotionCoverage(id);
      expect(res.primaryMode).toBe('projected-3d');
      expect(res.readinessState).toBe('related-pattern-draft-only');
      expect(res.projected3d.supported).toBe(true);
      expect(res.projected3d.temporalKind).toBe('continuous-progress');
      expect(res.projected3d.isContinuousPlayback).toBe(true);
      expect(res.projected3d.isDraftProposal).toBe(true);
      expect(res.projected3d.isCanonicalMotionAsset).toBe(false);
      expect(res.projected3d.assetStatus).toBe('authored-unreviewed-draft');
      expect(res.projected3d.relation).toBe('pattern-reference');

      // Projected-3D vs True 3D invariants
      expect(res.projected3d.projectionMethod).toBe('oblique-orthographic-3d-to-2d-svg');
      expect(res.projected3d.renderSurface).toBe('svg-2d');
      expect(res.projected3d.true3dSupported).toBe(false);
      expect(res.projected3d.webgl3dReady).toBe(false);
      expect(res.projected3d.interactive3dCameraSupported).toBe(false);
      expect(res.safetyFlags.true3dSupported).toBe(false);
      expect(res.safetyFlags.webgl3dReady).toBe(false);

      // Source-level mismatch notes from motionDrafts / motionAuthoringBatch / supineReach are preserved
      expect(res.projected3d.mismatchNotesKo.length).toBeGreaterThanOrEqual(3);

      const desc = resolveRenderableMotionDescriptor(id);
      expect(desc.mode).toBe('projected-3d');
      if (desc.mode === 'projected-3d') {
        expect(desc.projectionMethod).toBe('oblique-orthographic-3d-to-2d-svg');
        expect(desc.renderSurface).toBe('svg-2d');
        expect(desc.true3dSupported).toBe(false);
        expect(desc.webgl3dReady).toBe(false);
      }
    }

    // Quadruped reach links both arm-slide and leg-slide 3D drafts
    const quadruped = resolveMotionCoverage('original-mat-quadruped-reach');
    expect(quadruped.projected3d.variantIds).toEqual([
      'quadruped-arm-slide',
      'quadruped-leg-slide',
    ]);
  });

  it('strictly rejects unknown IDs, custom IDs, wrong apparatus (including ordinary-chair vs pilates-chair), wrong posture, and compound sequences', () => {
    // 1. Unknown and empty IDs
    for (const invalidId of ['unknown-exercise-999', 'non-existent-id', '', '   ', null, undefined]) {
      const res = resolveMotionCoverage(invalidId);
      expect(res.isCatalogExercise).toBe(false);
      expect(res.primaryMode).toBe('missing');
      expect(res.isMissing).toBe(true);
      expect(res.canonicalMotionReady).toBe(false);
      expect(res.readinessState).toBe('not-authored-missing');
      expect(res.supportedModes).toEqual([]);
      expect(res.safetyFlags.canonicalRecordExists).toBe(false);
      expect(toMovementPhaseDiagramProps(invalidId)).toBeNull();
      expect(toMovementTriptychProps(invalidId)).toBeNull();
      expect(resolveVisualAssetForRenderer(invalidId)).toBeNull();
      expect(resolvePatternReferencesForRenderer(invalidId)).toEqual([]);
    }

    // 2. Runtime custom / idea IDs
    for (const customId of ['idea-reformer-jump-99', 'ex-custom-12345']) {
      const customRes = resolveMotionCoverage(customId);
      expect(customRes.primaryMode).toBe('missing');
      expect(customRes.isMissing).toBe(true);
      expect(customRes.safetyFlags.canonicalRecordExists).toBe(false);
      expect(customRes.rejectedCandidates[0]?.reason).toBe('unverified-custom-exercise');
    }

    // 3. Cross-apparatus rejection: Reformer / Mat / Chair / Cadillac / Barrel
    expect(
      evaluateMotionCandidateMatch('original-mat-heel-slide', 'reformer-parallel-footwork')
        .rejection?.reason,
    ).toBe('apparatus-mismatch');
    expect(
      evaluateMotionCandidateMatch('ex-bridging-01', 'articulated-pelvic-curl').rejection?.reason,
    ).toBe('apparatus-mismatch');
    expect(
      evaluateMotionCandidateMatch('ex-bridging-02', 'bridge-pattern', {
        includeLabPrototypesInContinuous2d: true,
      }).rejection?.reason,
    ).toBe('apparatus-mismatch');

    // 4. Ordinary stationary chair (`ordinary-chair` on Mat) vs Pilates Wunda Chair (`pilates-chair` on Chair)
    const ordinaryChairHeelRaiseOnPilatesChair = evaluateMotionCandidateMatch(
      'original-chair-supported-calf-raise',
      'supported-heel-raise',
    );
    expect(ordinaryChairHeelRaiseOnPilatesChair.matched).toBe(false);
    expect(ordinaryChairHeelRaiseOnPilatesChair.rejection?.reason).toBe('apparatus-mismatch');
    expect(ordinaryChairHeelRaiseOnPilatesChair.rejection?.candidateDraftRig).toBe(
      'ordinary-chair',
    );

    const ordinaryChairArmRaiseOnPilatesChair = evaluateMotionCandidateMatch(
      'original-chair-seated-arm-arc',
      'chair-seated-bilateral-arm-raise-v1',
    );
    expect(ordinaryChairArmRaiseOnPilatesChair.matched).toBe(false);
    expect(ordinaryChairArmRaiseOnPilatesChair.rejection?.reason).toBe('apparatus-mismatch');
    expect(ordinaryChairArmRaiseOnPilatesChair.rejection?.candidateDraftRig).toBe(
      'ordinary-chair',
    );

    const pilatesChairPedalPress = resolveMotionCoverage('original-chair-seated-pedal-press');
    expect(pilatesChairPedalPress.projected3d.draftRigs).toEqual(['pilates-chair']);

    // 5. Wrong bodyPosition on same apparatus
    expect(
      evaluateMotionCandidateMatch('original-mat-swan-prep', 'supine-chest-lift').rejection
        ?.reason,
    ).toBe('body-position-mismatch');
    expect(
      evaluateMotionCandidateMatch('original-mat-heel-slide', 'supported-heel-raise').rejection
        ?.reason,
    ).toBe('body-position-mismatch');

    // 6. Compound studio sequence (`ex-*`) rejection even when apparatus & bodyPosition match
    const matSupineCompound = INITIAL_EXERCISES.find(
      (ex) =>
        ex.id.startsWith('ex-') &&
        ex.apparatus === 'mat' &&
        ex.bodyPosition === 'supine',
    )!;
    const compoundMatSupineOnAtomicPelvicCurl = evaluateMotionCandidateMatch(
      matSupineCompound.id,
      'articulated-pelvic-curl',
    );
    expect(compoundMatSupineOnAtomicPelvicCurl.matched).toBe(false);
    expect(compoundMatSupineOnAtomicPelvicCurl.rejection?.reason).toBe(
      'compound-sequence-mismatch',
    );

    const reformerSupineCompound = INITIAL_EXERCISES.find(
      (ex) =>
        ex.id.startsWith('ex-') &&
        ex.apparatus === 'reformer' &&
        ex.bodyPosition === 'supine',
    )!;
    const compoundFootworkOnAtomicReformer = evaluateMotionCandidateMatch(
      reformerSupineCompound.id,
      'reformer-parallel-footwork',
    );
    expect(compoundFootworkOnAtomicReformer.matched).toBe(false);
    expect(compoundFootworkOnAtomicReformer.rejection?.reason).toBe(
      'compound-sequence-mismatch',
    );

    // 7. Tampered PilatesExercise object input
    const canonicalBridge = INITIAL_EXERCISES.find((ex) => ex.id === 'original-mat-bridge')!;
    expect(
      resolveMotionCoverage({ ...canonicalBridge, apparatus: 'reformer' }).rejectedCandidates[0]
        ?.reason,
    ).toBe('apparatus-mismatch');
    expect(
      resolveMotionCoverage({ ...canonicalBridge, bodyPosition: 'prone' }).rejectedCandidates[0]
        ?.reason,
    ).toBe('body-position-mismatch');
  });

  it('never marks non-existent or unauthored motions as ready across all 98 IDs, V7 research candidates, and unknown inputs', () => {
    // 1. Check all 98 catalog IDs
    for (const exercise of INITIAL_EXERCISES) {
      const res = resolveMotionCoverage(exercise.id);
      const desc = resolveRenderableMotionDescriptor(exercise.id);
      expect(isCanonicalMotionReady(exercise.id)).toBe(false);
      expect(res.canonicalMotionReady).toBe(false);
      expect(desc.canonicalMotionReady).toBe(false);
      expect(desc.manualReady).toBe(false);
      expect(res.readinessState as string).not.toBe('ready');
      expect(desc.readinessState as string).not.toBe('ready');
      expect(res.safetyFlags.canonicalAssetReady).toBe(false);
      expect(res.safetyFlags.canonicalContinuousReady).toBe(false);
      expect(res.safetyFlags.exactCanonicalMatch).toBe(false);
      expect(res.safetyFlags.expertApproved).toBe(false);
      expect(res.safetyFlags.anatomicalAccuracyAssumed).toBe(false);
    }

    // 2. Check V7 unauthored research candidates (`prone-baby-swan`, `kneeling-forearm-plank`)
    const swanResearch = getMotionCandidateResearch('original-mat-swan-prep');
    const plankResearch = getMotionCandidateResearch('original-mat-forearm-plank');
    expect(swanResearch[0]?.candidateId).toBe('prone-baby-swan');
    expect(swanResearch[0]?.modelAuthored).toBe(false);
    expect(plankResearch[0]?.candidateId).toBe('kneeling-forearm-plank');
    expect(plankResearch[0]?.modelAuthored).toBe(false);

    const babySwanMatch = evaluateMotionCandidateMatch(
      'original-mat-swan-prep',
      'prone-baby-swan',
    );
    expect(babySwanMatch.matched).toBe(false);
    expect(babySwanMatch.resolvedMode).toBe('missing');
    expect(babySwanMatch.isCanonicalReady).toBe(false);
    expect(babySwanMatch.rejection?.reason).toBe('model-not-authored');

    const forearmPlankMatch = evaluateMotionCandidateMatch(
      'original-mat-forearm-plank',
      'kneeling-forearm-plank',
    );
    expect(forearmPlankMatch.matched).toBe(false);
    expect(forearmPlankMatch.resolvedMode).toBe('missing');
    expect(forearmPlankMatch.isCanonicalReady).toBe(false);
    expect(forearmPlankMatch.rejection?.reason).toBe('model-not-authored');

    const forearmPlankRes = resolveMotionCoverage('original-mat-forearm-plank');
    expect(forearmPlankRes.safetyFlags.hasUnauthoredResearchCandidate).toBe(true);
    expect(forearmPlankRes.safetyFlags.researchCandidateStatus).toBe('research_pending');
    expect(forearmPlankRes.researchCandidates[0]?.modelAuthored).toBe(false);
    expect(forearmPlankRes.researchCandidates[0]?.exactAssetReady).toBe(false);
  });

  it('connects cleanly with exerciseEvidence while preserving backward-compatibility and zero instruction leakage', () => {
    for (const exercise of INITIAL_EXERCISES) {
      const baseEvidence = getExerciseEvidence(exercise);
      const enhancedEvidence = toExerciseEvidenceWithMotionCoverage(exercise);
      const overlay = toExerciseEvidenceMotionOverlay(exercise);

      // Backward compatibility with existing ExerciseEvidence fields
      expect(enhancedEvidence.motion.status).toBe('not-authored');
      expect(enhancedEvidence.motion.label).toBe('모션 제작 대기');
      expect(enhancedEvidence.motion.professionallyApprovedCount).toBe(0);
      expect(enhancedEvidence.motion.unreviewedLabPrototypeCount).toBe(2);
      expect(enhancedEvidence.motion.professionalReviewStatus).toBe('unreviewed');
      expect(enhancedEvidence.planning.credentialVerified).toBe(false);
      expect(enhancedEvidence.motion.relatedProposals).toEqual(
        baseEvidence.motion.relatedProposals,
      );

      // Motion coverage overlay invariants
      expect(enhancedEvidence.motion.coverage).toEqual(overlay);
      expect(overlay.reusesExisting98PoseByIdentity).toBe(true);
      expect(overlay.discreteThreePhase2dSupported).toBe(true);
      expect(overlay.canonicalContinuousReady).toBe(false);
      expect(overlay.manualReady).toBe(false);
      expect(overlay.true3dSupported).toBe(false);
      expect(overlay.webgl3dReady).toBe(false);
      expect(overlay.anatomicalVerificationCompleted).toBe(false);
      expect(overlay.expertVerificationCompleted).toBe(false);

      // Must never leak raw exercise.springs or exercise.cues[0] into serialized evidence
      const serialized = JSON.stringify(enhancedEvidence);
      if (exercise.springs.trim().length > 4) {
        expect(serialized).not.toContain(exercise.springs);
      }
      if (exercise.cues[0] && exercise.cues[0].trim().length > 4) {
        expect(serialized).not.toContain(exercise.cues[0]);
      }
    }

    // Verify ExerciseEvidencePanel DL helper renders zero interactive controls and zero role="status"
    const sampleExercise = INITIAL_EXERCISES[0];
    const { container, unmount } = render(
      <dl>
        <MotionCoverageEvidenceDlItems exercise={sampleExercise} />
      </dl>,
    );
    expect(
      container.querySelector('button,input,textarea,select,iframe,img,video'),
    ).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByTestId('eep-motion-coverage-level')).toHaveAttribute(
      'data-manual-ready',
      'false',
    );
    expect(screen.getByTestId('eep-motion-coverage-level')).toHaveAttribute(
      'data-true-3d',
      'false',
    );
    unmount();
  });

  it('renders existing SVG diagram and pattern preview components cleanly via export adapters and integration examples', () => {
    const allPhases = toAllPhaseDiagramProps('ex-bridging-02');
    expect(allPhases).not.toBeNull();
    expect(allPhases?.start.phase).toBe('start');
    expect(allPhases?.middle.phase).toBe('middle');
    expect(allPhases?.end.phase).toBe('end');
    expect(allPhases?.middle.asset).toBe(getMovementVisualAsset('ex-bridging-02'));

    const snapshot = buildIntegrationCallSnapshot('ex-bridging-02');
    expect(snapshot.primaryMode).toBe('three-phase-2d');
    expect(snapshot.readinessState).toBe('three-phase-2d-schematic-only');
    expect(snapshot.canonicalMotionReady).toBe(false);
    expect(snapshot.manualReady).toBe(false);
    expect(snapshot.threePhaseSourceKind).toBe('catalog-rig-verified');
    expect(snapshot.reusesExistingCatalogAsset).toBe(true);
    expect(snapshot.hasMiddlePhaseProps).toBe(true);
    expect(snapshot.hasTriptychProps).toBe(true);

    const { unmount } = render(
      <div>
        <MotionCoverageStatusBadge exerciseOrId="ex-bridging-02" />
        <MotionCoverageUnifiedViewer exerciseOrId="ex-bridging-02" />
      </div>,
    );
    const badge2d = screen.getByTestId('motion-coverage-badge-ex-bridging-02');
    expect(badge2d).toHaveAttribute('data-motion-mode', 'three-phase-2d');
    expect(badge2d).toHaveAttribute('data-readiness-state', 'three-phase-2d-schematic-only');
    expect(badge2d).toHaveAttribute('data-canonical-ready', 'false');
    expect(badge2d).toHaveAttribute('data-manual-ready', 'false');
    expect(badge2d).toHaveAttribute('data-true-3d', 'false');
    unmount();

    const render3d = render(
      <MotionCoverageUnifiedViewer exerciseOrId="original-mat-chest-lift" />,
    );
    const viewer3d = screen.getByTestId('motion-coverage-unified-viewer');
    expect(viewer3d).toHaveAttribute('data-motion-mode', 'projected-3d');
    expect(viewer3d).toHaveAttribute('data-readiness-state', 'related-pattern-draft-only');
    expect(viewer3d).toHaveAttribute('data-canonical-ready', 'false');
    expect(viewer3d).toHaveAttribute('data-manual-ready', 'false');
    expect(viewer3d).toHaveAttribute('data-true-3d', 'false');
    expect(screen.getByTestId('motion-coverage-pattern-previews')).toBeInTheDocument();
    render3d.unmount();

    render(<MotionCoverageUnifiedViewer exerciseOrId="non-existent-id" />);
    const missingEl = screen.getByTestId('motion-coverage-missing-fallback');
    expect(missingEl).toHaveAttribute('data-readiness-state', 'not-authored-missing');
    expect(missingEl).toHaveAttribute('data-canonical-ready', 'false');
    expect(missingEl).toHaveAttribute('data-manual-ready', 'false');
    expect(missingEl).toHaveAttribute('data-true-3d', 'false');
  });
});
