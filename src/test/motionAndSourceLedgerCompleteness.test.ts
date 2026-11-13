import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  BREATHING_PELVIC_CATALOG_EXERCISE_IDS,
  getBreathingPelvicDiagramCorrections,
  resolveBreathingPelvicDiagram,
} from '../data/breathingPelvicDiagramData';
import breathingPelvicSourceLedger from '../data/breathingPelvicSourceLedger.json';
import extendedMotionSourceLedger from '../data/extendedMotionSourceLedger.json';
import {
  CLEARED_YOUTUBE_REPLACEMENT_AUDITS,
  CLEARED_YOUTUBE_VIDEO_REASONS,
  EXTENDED_CANDIDATE_MOTION_MODELS,
  MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS,
  PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS,
  VERIFIED_REFERENCE_AUDIT_RECORDS,
  resolveExtendedCandidateMotionModel,
  resolveExtendedMotionSourceAudit,
  resolvePreviouslyUnboundMotionModelAudit,
  verifyExtendedMotionSourceLedgerIntegrity,
} from '../data/extendedMotionVerificationCatalog';
import {
  FOOTWORK_LOWER_CATALOG_EXERCISE_IDS,
  getFootworkLowerDiagramCorrections,
  resolveFootworkLowerDiagram,
} from '../data/footworkLowerDiagramData';
import footworkLowerSourceLedger from '../data/footworkLowerSourceLedger.json';
import {
  LATERAL_AND_APPARATUS_CATALOG_EXERCISE_IDS,
  getLateralAndApparatusDiagramCorrections,
  resolveLateralAndApparatusDiagram,
} from '../data/lateralAndApparatusDiagramData';
import lateralAndApparatusSourceLedger from '../data/lateralAndApparatusSourceLedger.json';
import { MOVEMENT_DIAGRAM_CORRECTIONS } from '../data/movementDiagramCorrections';
import { getMovementVisualAsset, MOVEMENT_VISUAL_ASSETS } from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  UPPER_BODY_ARM_CATALOG_EXERCISE_IDS,
  getUpperBodyArmDiagramCorrections,
  resolveUpperBodyArmDiagram,
} from '../data/upperBodyArmDiagramData';
import upperBodyArmSourceLedger from '../data/upperBodyArmSourceLedger.json';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import {
  getMotionCoverageSummary,
  resolveMotionCoverage,
} from '../features/motionCoverage/resolver';
import { TRACK_A_MAT_EVIDENCE_RECORDS } from '../features/motionEvidenceReview/trackAMatEvidence';
import { TRACK_B_APPARATUS_EVIDENCE_RECORDS } from '../features/motionEvidenceReview/trackBApparatusEvidence';
import { TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS } from '../features/motionEvidenceReview/trackCExtendedMatEvidence';
import { TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS } from '../features/motionEvidenceReview/trackDExtendedApparatusEvidence';
import {
  resolveMotionEvidenceReviewRecord,
  validateMotionEvidenceRecord,
} from '../features/motionEvidenceReview/validator';

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

function computeFactualRecordSha256(factualRecord: unknown): string {
  return createHash('sha256').update(JSON.stringify(factualRecord)).digest('hex');
}

describe('Motion & Source Ledger Completeness Verification (2026-11-08)', () => {
  it('verifies 64-hex factualRecordSha256 checksums across all 4 newly created track source ledgers and extendedMotionSourceLedger.json', () => {
    // 1. Track I9: breathingPelvicSourceLedger.json
    expect(breathingPelvicSourceLedger.trackId).toBe('I9-breathing-pelvic-centering');
    expect(breathingPelvicSourceLedger.truthfulness.anatomicalAccuracyAssumed).toBe(false);
    expect(breathingPelvicSourceLedger.truthfulness.professionalReviewCount).toBe(0);
    const i9Entries = Object.values(breathingPelvicSourceLedger.entries);
    const i9Reviews = Object.values(breathingPelvicSourceLedger.movementReviews);
    expect(i9Entries).toHaveLength(3);
    expect(i9Reviews).toHaveLength(3);
    for (const entry of [...i9Entries, ...i9Reviews]) {
      expect(entry.factualRecordSha256).toMatch(SHA256_HEX_RE);
      expect(computeFactualRecordSha256(entry.factualRecord)).toBe(entry.factualRecordSha256);
      expect(entry.professionalReviewCount).toBe(0);
    }

    // 2. Track I10: footworkLowerSourceLedger.json
    expect(footworkLowerSourceLedger.trackId).toBe('I10-footwork-ankle-pedal-standing-lower');
    expect(footworkLowerSourceLedger.truthfulness.anatomicalAccuracyAssumed).toBe(false);
    expect(footworkLowerSourceLedger.truthfulness.professionalReviewCount).toBe(0);
    const i10Entries = Object.values(footworkLowerSourceLedger.entries);
    const i10Reviews = Object.values(footworkLowerSourceLedger.movementReviews);
    expect(i10Entries).toHaveLength(4);
    expect(i10Reviews).toHaveLength(4);
    for (const entry of [...i10Entries, ...i10Reviews]) {
      expect(entry.factualRecordSha256).toMatch(SHA256_HEX_RE);
      expect(computeFactualRecordSha256(entry.factualRecord)).toBe(entry.factualRecordSha256);
      expect(entry.professionalReviewCount).toBe(0);
    }

    // 3. Track I11: upperBodyArmSourceLedger.json
    expect(upperBodyArmSourceLedger.trackId).toBe('I11-upper-body-strap-row-arm-arc');
    expect(upperBodyArmSourceLedger.anatomicalAccuracyAssumed).toBe(false);
    expect(upperBodyArmSourceLedger.professionalReviewCount).toBe(0);
    expect(upperBodyArmSourceLedger.entries).toHaveLength(3);
    for (const entry of upperBodyArmSourceLedger.entries) {
      expect(entry.factualRecordSha256).toMatch(SHA256_HEX_RE);
      expect(computeFactualRecordSha256(entry.factualRecord)).toBe(entry.factualRecordSha256);
      expect(entry.anatomicalAccuracyAssumed).toBe(false);
      expect(entry.professionalReviewCount).toBe(0);
    }

    // 4. Track I12: lateralAndApparatusSourceLedger.json
    expect(lateralAndApparatusSourceLedger.trackId).toBe('I12-lateral-rotation-tabletop-plank');
    expect(lateralAndApparatusSourceLedger.anatomicalAccuracyAssumed).toBe(false);
    expect(lateralAndApparatusSourceLedger.professionalReviewCount).toBe(0);
    expect(lateralAndApparatusSourceLedger.entries).toHaveLength(4);
    for (const entry of lateralAndApparatusSourceLedger.entries) {
      expect(entry.factualRecordSha256).toMatch(SHA256_HEX_RE);
      expect(computeFactualRecordSha256(entry.factualRecord)).toBe(entry.factualRecordSha256);
      expect(entry.anatomicalAccuracyAssumed).toBe(false);
      expect(entry.professionalReviewCount).toBe(0);
    }

    // 5. extendedMotionSourceLedger.json (all 4 sections = 52 entries total)
    const allExtendedEntries = [
      ...extendedMotionSourceLedger.candidateMatMotionModels,
      ...extendedMotionSourceLedger.previouslyUnboundMotionModels,
      ...extendedMotionSourceLedger.clearedYoutubeReplacementAudits,
      ...extendedMotionSourceLedger.verifiedReferenceAuditRecords,
    ];
    expect(allExtendedEntries).toHaveLength(52);
    for (const entry of allExtendedEntries) {
      expect(entry.factualRecordSha256).toMatch(SHA256_HEX_RE);
      expect(computeFactualRecordSha256(entry.factualRecord)).toBe(entry.factualRecordSha256);
      expect(entry.anatomicalAccuracyAssumed).toBe(false);
      expect(entry.professionalReviewCount).toBe(0);
    }
  });

  it('verifies verifyExtendedMotionSourceLedgerIntegrity() returns valid: true and exact truthfulness/audit counts', () => {
    const report = verifyExtendedMotionSourceLedgerIntegrity();

    expect(report.valid).toBe(true);
    expect(report.allSha256HashesValid).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.totalAuditedReferences).toBe(30);
    expect(report.officialSourceCheckedCount).toBe(18);
    expect(report.partialPlaybackCheckedCount).toBe(3);
    expect(report.koreanCandidateCount).toBe(9);
    expect(report.candidateMatMotionModelsCount).toBe(8);
    expect(report.previouslyUnboundMotionModelsCount).toBe(9);
    expect(report.clearedYoutubeReplacementAuditsCount).toBe(5);
    expect(report.unverifiedRemainderCount).toBe(0);
    expect(report.professionalReviewCount).toBe(0);
    expect(report.anatomicalAccuracyAssumed).toBe(false);
  });

  it('verifies 100% coverage in extendedMotionSourceLedger.json for all 30 VERIFIED_REFERENCES, 5 cleared YouTube exercises, 8 matCatalogIdsWithoutExistingProposals, and 9 previously unbound models', () => {
    // 1. All 30 VERIFIED_REFERENCES (18 official-source-checked, 3 partial-playback-checked, 9 korean-candidate)
    expect(VERIFIED_REFERENCES).toHaveLength(30);
    expect(VERIFIED_REFERENCE_AUDIT_RECORDS).toHaveLength(30);

    const statusCounts = {
      'official-source-checked': 0,
      'partial-playback-checked': 0,
      'korean-candidate': 0,
    };

    for (const ref of VERIFIED_REFERENCES) {
      statusCounts[ref.verificationStatus] += 1;
      const ledgerRecord = extendedMotionSourceLedger.verifiedReferenceAuditRecords.find(
        (item) => item.referenceId === ref.id,
      );
      expect(ledgerRecord, `Missing ledger audit record for ${ref.id}`).toBeDefined();
      expect(ledgerRecord!.originalVerificationStatus).toBe(ref.verificationStatus);
      expect(ledgerRecord!.auditConclusionStatus).toBe(
        'source-metadata-and-biomechanical-scope-verified',
      );
      expect(ledgerRecord!.url).toBe(ref.url);
      expect(ledgerRecord!.anatomicalAccuracyAssumed).toBe(false);
      expect(ledgerRecord!.professionalReviewCount).toBe(0);
      expect(computeFactualRecordSha256(ledgerRecord!.factualRecord)).toBe(
        ledgerRecord!.factualRecordSha256,
      );
    }

    expect(statusCounts['official-source-checked']).toBe(18);
    expect(statusCounts['partial-playback-checked']).toBe(3);
    expect(statusCounts['korean-candidate']).toBe(9);

    // 2. All 5 cleared YouTube exercises
    const expectedClearedExerciseIds = [
      'ex-warmup-01',
      'ex-footwork-02',
      'ex-cooldown-02',
      'ex-core-04',
      'ex-lower-04',
    ] as const;

    expect(CLEARED_YOUTUBE_REPLACEMENT_AUDITS).toHaveLength(5);
    for (const exId of expectedClearedExerciseIds) {
      const clearedEntry = extendedMotionSourceLedger.clearedYoutubeReplacementAudits.find(
        (item) => item.exerciseId === exId,
      );
      expect(clearedEntry, `Missing cleared YouTube audit for ${exId}`).toBeDefined();
      expect(clearedEntry!.clearedReasonKo).toBe(CLEARED_YOUTUBE_VIDEO_REASONS[exId]);
      expect(clearedEntry!.replacementReferences.length).toBeGreaterThanOrEqual(2);
      expect(clearedEntry!.anatomicalAccuracyAssumed).toBe(false);
      expect(clearedEntry!.professionalReviewCount).toBe(0);
      expect(computeFactualRecordSha256(clearedEntry!.factualRecord)).toBe(
        clearedEntry!.factualRecordSha256,
      );
    }

    // 3. All 8 matCatalogIdsWithoutExistingProposals (including prone-baby-swan & kneeling-forearm-plank)
    const expectedMatGapIds = [
      'original-mat-swan-prep',
      'original-mat-forearm-plank',
      'original-mat-rib-breath',
      'original-mat-pelvic-clock',
      'original-mat-single-leg-stretch',
      'original-mat-swimming-prep',
      'original-mat-side-leg-lift',
      'original-mat-spine-twist',
    ] as const;

    expect(MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS).toEqual(expectedMatGapIds);
    expect(EXTENDED_CANDIDATE_MOTION_MODELS).toHaveLength(8);

    for (const matId of expectedMatGapIds) {
      const ledgerCandidate = extendedMotionSourceLedger.candidateMatMotionModels.find(
        (item) => item.exerciseId === matId,
      );
      expect(ledgerCandidate, `Missing candidate Mat motion model for ${matId}`).toBeDefined();
      expect(ledgerCandidate!.sources.length).toBeGreaterThanOrEqual(2);
      expect(computeFactualRecordSha256(ledgerCandidate!.factualRecord)).toBe(
        ledgerCandidate!.factualRecordSha256,
      );

      const resolvedModel = resolveExtendedCandidateMotionModel(matId);
      expect(resolvedModel).not.toBeNull();
      expect(resolvedModel!.factualRecordSha256).toBe(ledgerCandidate!.factualRecordSha256);
    }

    expect(resolveExtendedCandidateMotionModel('prone-baby-swan')?.exerciseId).toBe(
      'original-mat-swan-prep',
    );
    expect(resolveExtendedCandidateMotionModel('kneeling-forearm-plank')?.exerciseId).toBe(
      'original-mat-forearm-plank',
    );

    // 4. All 9 previously unbound continuous/batch models
    const expectedUnboundModelIds = [
      'supported-heel-raise',
      'side-lying-clam',
      'side-lying-straight-leg-lift',
      'side-lying-open-book',
      'supine-single-leg-reach-v1',
      'mat-pelvic-curl-bridge-v1',
      'mat-chest-lift-abdominal-prep-v1',
      'mat-single-knee-to-chest-fold-v1',
      'mat-prone-thoracic-extension-prep-v1',
    ] as const;

    expect(PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS).toHaveLength(9);
    for (const modelId of expectedUnboundModelIds) {
      const ledgerUnbound = extendedMotionSourceLedger.previouslyUnboundMotionModels.find(
        (item) => item.modelId === modelId,
      );
      expect(ledgerUnbound, `Missing previously unbound model ${modelId}`).toBeDefined();
      expect(ledgerUnbound!.sources.length).toBeGreaterThanOrEqual(2);
      expect(computeFactualRecordSha256(ledgerUnbound!.factualRecord)).toBe(
        ledgerUnbound!.factualRecordSha256,
      );

      const resolvedAudit = resolvePreviouslyUnboundMotionModelAudit(modelId);
      expect(resolvedAudit).not.toBeNull();
      expect(resolvedAudit!.factualRecordSha256).toBe(ledgerUnbound!.factualRecordSha256);
    }
  });

  it('preserves historical I1–I12 evidence and exposes changed target bindings without reviewing newly added movements', () => {
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(MOVEMENT_VISUAL_ASSETS).toHaveLength(INITIAL_EXERCISES.length);

    // Combine Tracks I1–I8 (MOVEMENT_DIAGRAM_CORRECTIONS) + Tracks I9–I12 diagram corrections
    const combinedDiagramCorrections = {
      ...MOVEMENT_DIAGRAM_CORRECTIONS,
      ...getBreathingPelvicDiagramCorrections(),
      ...getFootworkLowerDiagramCorrections(),
      ...getUpperBodyArmDiagramCorrections(),
      ...getLateralAndApparatusDiagramCorrections(),
    };

    expect(BREATHING_PELVIC_CATALOG_EXERCISE_IDS).toHaveLength(10);
    expect(FOOTWORK_LOWER_CATALOG_EXERCISE_IDS).toHaveLength(21);
    expect(UPPER_BODY_ARM_CATALOG_EXERCISE_IDS).toHaveLength(13);
    expect(LATERAL_AND_APPARATUS_CATALOG_EXERCISE_IDS).toHaveLength(23);

    // Historical biomechanical records cover the original 98; source-linked additions
    // have their own metadata ledger and must not inherit these older reviews.
    for (const ex of INITIAL_EXERCISES.filter((exercise) => !exercise.id.startsWith('expanded-'))) {
      const correction = combinedDiagramCorrections[ex.id];
      expect(correction, `Missing I1–I12 diagram correction for ${ex.id}`).toBeDefined();
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.sources.length).toBeGreaterThan(0);

      const auditBundle = resolveExtendedMotionSourceAudit(ex.id);
      expect(auditBundle.sha256IntegrityVerified).toBe(true);
      expect(auditBundle.anatomicalAccuracyAssumed).toBe(false);
      expect(auditBundle.professionalReviewCount).toBe(0);

      const coverage = resolveMotionCoverage(ex.id);
      expect(coverage.safetyFlags.anatomicalAccuracyAssumed).toBe(false);
      expect(coverage.safetyFlags.professionalMotionReviewCount).toBe(0);
      expect(coverage.canonicalMotionReady).toBe(false);
      expect(coverage.safetyFlags.true3dSupported).toBe(false);
    }

    const summary = getMotionCoverageSummary();
    expect(summary.totalCatalogExercises).toBe(INITIAL_EXERCISES.length);
    expect(summary.canonicalReadyCount).toBe(0);
    expect(summary.true3dReadyCount).toBe(0);
    expect(summary.expertApprovedCount).toBe(0);
    expect(summary.anatomicalAccuracyAssumedCount).toBe(0);

    // Verify Track I9–I12 resolvers for their respective catalog IDs
    for (const id of BREATHING_PELVIC_CATALOG_EXERCISE_IDS) {
      expect(resolveBreathingPelvicDiagram(id)).not.toBeNull();
    }
    for (const id of FOOTWORK_LOWER_CATALOG_EXERCISE_IDS) {
      expect(resolveFootworkLowerDiagram(id)).not.toBeNull();
    }
    for (const id of UPPER_BODY_ARM_CATALOG_EXERCISE_IDS) {
      expect(resolveUpperBodyArmDiagram(id)).not.toBeNull();
    }
    for (const id of LATERAL_AND_APPARATUS_CATALOG_EXERCISE_IDS) {
      expect(resolveLateralAndApparatusDiagram(id)).not.toBeNull();
    }

    // Verify Full 98-exercise Biomechanical & Source Discrepancy Review (10 + 10 + 12 + 66 = 98)
    expect(TRACK_A_MAT_EVIDENCE_RECORDS).toHaveLength(10);
    expect(TRACK_B_APPARATUS_EVIDENCE_RECORDS).toHaveLength(10);
    expect(TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS).toHaveLength(12);
    expect(TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS).toHaveLength(66);

    const allEvidenceRecords = [
      ...TRACK_A_MAT_EVIDENCE_RECORDS,
      ...TRACK_B_APPARATUS_EVIDENCE_RECORDS,
      ...TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS,
      ...TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS,
    ];
    expect(allEvidenceRecords).toHaveLength(98);

    const coveredExerciseIds = new Set<string>();
    // Retain the original review targets and explicitly expose their current rig mismatch.
    const staleEvidenceTargets: Record<string, { historical: string; current: string }> = {
      'original-mat-chest-lift': {
        historical: 'supine-chest-lift-curl',
        current: 'mat-chest-lift-supported-head',
      },
      'original-mat-forearm-plank': {
        historical: 'plank-long-stretch-chair-pike',
        current: 'mat-kneeling-forearm-support',
      },
      'original-mat-swimming-prep': {
        historical: 'prone-swan-pulling-straps-swimming',
        current: 'mat-swimming-contralateral-prep',
      },
      'ex-warmup-03': {
        historical: 'supine-breath-pelvic-clock',
        current: 'mat-longitudinal-roller-arm-arc',
      },
      'original-barrel-supported-arm-reach': {
        historical: 'standing-ankle-calf-upper-reach',
        current: 'barrel-one-hand-supported-arm-reach',
      },
      'original-reformer-side-lying-press': {
        historical: 'side-lying-leg-press-sweep',
        current: 'reformer-side-lying-footbar-press',
      },
      'original-chair-incline-support': {
        historical: 'chair-plank-pike-isolated',
        current: 'chair-fixed-seat-incline-support',
      },
      'ex-core-02': {
        historical: 'seated-roll-back-spine-twist',
        current: 'reformer-short-box-supported-roll-back',
      },
      'ex-upper-01': {
        historical: 'kneeling-chest-expansion-triceps',
        current: 'reformer-kneeling-supported-arm-press',
      },
      'ex-lower-03': {
        historical: 'standing-scooter-lunge-splits',
        current: 'chair-seat-pedal-step-up',
      },
      'ex-kr-reformer-03': {
        historical: 'kneeling-chest-expansion-triceps',
        current: 'reformer-kneeling-supported-arm-press',
      },
      'ex-global-reformer-03': {
        historical: 'kneeling-chest-expansion-triceps',
        current: 'reformer-kneeling-supported-arm-press',
      },
    };
    expect(Object.keys(staleEvidenceTargets)).toHaveLength(12);
    const foundStaleIds: string[] = [];
    for (const record of allEvidenceRecords) {
      expect(coveredExerciseIds.has(record.exerciseId)).toBe(false);
      coveredExerciseIds.add(record.exerciseId);

      const validation = validateMotionEvidenceRecord(record);
      const staleTarget = staleEvidenceTargets[record.exerciseId];
      expect(validation.valid, `Current target validation for ${record.exerciseId}`).toBe(
        !staleTarget,
      );
      if (staleTarget) {
        foundStaleIds.push(record.exerciseId);
        expect(record.discrepancyAudit.targetVisualAssetId).toBe(staleTarget.historical);
        expect(getMovementVisualAsset(record.exerciseId)?.archetypeId).toBe(staleTarget.current);
        expect(validation.issues).toHaveLength(1);
        expect(validation.issues[0]).toMatchObject({
          exerciseId: record.exerciseId,
          code: 'discrepancy-target-id-mismatch',
          fieldPath: 'discrepancyAudit.targetVisualAssetId',
        });
      } else {
        expect(validation.issues).toEqual([]);
      }
      expect(record.truthfulnessFlags.canonicalMotionReady).toBe(false);
      expect(record.truthfulnessFlags.manualReady).toBe(false);
      expect(record.truthfulnessFlags.true3dSupported).toBe(false);
      expect(record.truthfulnessFlags.anatomicalVerificationCompleted).toBe(false);
      expect(record.truthfulnessFlags.expertVerificationCompleted).toBe(false);
    }

    expect(coveredExerciseIds.size).toBe(98);
    expect(foundStaleIds).toEqual(Object.keys(staleEvidenceTargets));
    for (const ex of INITIAL_EXERCISES) {
      expect(coveredExerciseIds.has(ex.id)).toBe(!ex.id.startsWith('expanded-'));
      if (ex.id.startsWith('expanded-')) {
        expect(resolveMotionEvidenceReviewRecord(ex.id)).toBeUndefined();
        const sourceOnly = resolveExtendedMotionSourceAudit(ex);
        expect(sourceOnly.checkedAt).toBe('2026-11-13');
        expect(sourceOnly.primaryFactualRecordSha256).toBe('');
        expect(sourceOnly.sha256IntegrityVerified).toBe(false);
        expect(sourceOnly.verifiedReferenceAuditRecord).toBeNull();
        expect(sourceOnly.candidateMatMotionModel).toBeNull();
        expect(resolveMotionCoverage(ex).canonicalMotionReady).toBe(false);
        expect(resolveMotionCoverage(ex).primaryMode).toBe('missing');
      }
    }
  });
});
