import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { getMovementVisualAsset } from '../../data/movementVisualRigCatalog';
import {
  ALL_MOTION_EVIDENCE_REVIEW_RECORDS,
  FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS,
  TRACK_A_MAT_EVIDENCE_RECORDS,
  TRACK_B_APPARATUS_EVIDENCE_RECORDS,
  TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS,
  TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS,
  resolveMotionEvidenceReviewRecord,
  validateFullCatalogMotionEvidenceSuite,
  validateMotionEvidenceRecord,
  validateMotionEvidenceSuite,
} from './index';
import type { MotionEvidenceReviewRecord } from './types';

const historicalExercises = INITIAL_EXERCISES.filter(
  (exercise) => !exercise.id.startsWith('expanded-'),
);
// Historical targets stay unchanged when the current diagram receives a dedicated rig.
// These mismatches require a new review; they are not new approvals of the corrected poses.
const staleTargets: Record<string, { historical: string; current: string }> = {
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

function expectCurrentRecordValidation(record: MotionEvidenceReviewRecord) {
  const result = validateMotionEvidenceRecord(record);
  const staleTarget = staleTargets[record.exerciseId];
  expect(result.valid, record.exerciseId).toBe(!staleTarget);
  if (staleTarget) {
    expect(record.discrepancyAudit.targetVisualAssetId).toBe(staleTarget.historical);
    expect(getMovementVisualAsset(record.exerciseId)?.archetypeId).toBe(staleTarget.current);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({
      exerciseId: record.exerciseId,
      code: 'discrepancy-target-id-mismatch',
      fieldPath: 'discrepancyAudit.targetVisualAssetId',
    });
  } else {
    expect(result.issues).toEqual([]);
  }
  return result;
}

describe('motionEvidenceReview — historical evidence and current target validation', () => {
  it('preserves the 20 Track A/B records and reports the corrected chest-lift target as stale', () => {
    const report = validateMotionEvidenceSuite();

    expect(report.valid).toBe(false);
    expect(report.totalRecords).toBe(20);
    expect(report.trackACount).toBe(10);
    expect(report.trackBCount).toBe(10);
    expect(report.zeroTrackIdOverlap).toBe(true);
    expect(report.issueCount).toBe(1);
    expect(report.issues[0]).toMatchObject({
      exerciseId: 'original-mat-chest-lift',
      code: 'discrepancy-target-id-mismatch',
      fieldPath: 'discrepancyAudit.targetVisualAssetId',
    });
    expect(ALL_MOTION_EVIDENCE_REVIEW_RECORDS).toHaveLength(20);
  });

  it('ensures Track A contains 10 unique Mat exercises and Track B contains 10 unique Apparatus exercises across Reformer, Cadillac, Chair, and Barrel', () => {
    const trackAIds = new Set(TRACK_A_MAT_EVIDENCE_RECORDS.map((r) => r.exerciseId));
    const trackBIds = new Set(TRACK_B_APPARATUS_EVIDENCE_RECORDS.map((r) => r.exerciseId));

    expect(trackAIds.size).toBe(10);
    expect(trackBIds.size).toBe(10);

    for (const record of TRACK_A_MAT_EVIDENCE_RECORDS) {
      expect(record.track).toBe('track-a-mat');
      expect(record.apparatus).toBe('mat');
      expect(trackBIds.has(record.exerciseId)).toBe(false);
    }

    const apparatusFamilies = new Set(TRACK_B_APPARATUS_EVIDENCE_RECORDS.map((r) => r.apparatus));
    expect(apparatusFamilies.has('mat')).toBe(false);
    expect(apparatusFamilies.has('reformer')).toBe(true);
    expect(apparatusFamilies.has('cadillac')).toBe(true);
    expect(apparatusFamilies.has('chair')).toBe(true);
    expect(apparatusFamilies.has('barrel')).toBe(true);
  });

  it('tracks source verification vs sandbox proxy restriction counts honestly without hiding blocked URLs', () => {
    const report = validateMotionEvidenceSuite();

    expect(
      report.fullyVerifiedSourceExerciseCount + report.partiallyOrProxyRestrictedExerciseCount,
    ).toBe(20);
    expect(report.fullyVerifiedSourceExerciseCount).toBeGreaterThan(0);
    expect(report.partiallyOrProxyRestrictedExerciseCount).toBeGreaterThan(0);

    for (const record of ALL_MOTION_EVIDENCE_REVIEW_RECORDS) {
      const result = report.resultsByExerciseId[record.exerciseId];
      expect(result).toBeDefined();
      expect(result).toEqual(expectCurrentRecordValidation(record));
      expect(result.hasVerifiedDirectSource).toBe(true);
      expect(result.hasSandboxBlockedSourceOnly).toBe(false);
    }
  });

  it('detects unknown catalog exercise IDs (unknown-catalog-id)', () => {
    const base = TRACK_A_MAT_EVIDENCE_RECORDS[0];
    const invalidRecord: MotionEvidenceReviewRecord = {
      ...base,
      exerciseId: 'non-existent-pilates-id-999',
    };

    const result = validateMotionEvidenceRecord(invalidRecord);
    expect(result.valid).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain('unknown-catalog-id');
  });

  it('detects duplicate IDs within a track and ID overlap across Track A and Track B', () => {
    const matRecord = TRACK_A_MAT_EVIDENCE_RECORDS[0];
    const reportWithDuplicatesAndOverlap = validateMotionEvidenceSuite(
      [matRecord, matRecord],
      [
        {
          ...matRecord,
          track: 'track-b-apparatus',
        },
      ],
    );

    expect(reportWithDuplicatesAndOverlap.valid).toBe(false);
    expect(reportWithDuplicatesAndOverlap.zeroTrackIdOverlap).toBe(false);
    const codes = reportWithDuplicatesAndOverlap.issues.map((i) => i.code);
    expect(codes).toContain('duplicate-exercise-id');
    expect(codes).toContain('track-id-overlap');
    expect(codes).toContain('track-category-mismatch');
  });

  it('detects apparatus and bodyPosition mismatches against catalog and visual rig assets', () => {
    const matBridge = TRACK_A_MAT_EVIDENCE_RECORDS[0];
    const wrongApparatusAndPosition: MotionEvidenceReviewRecord = {
      ...matBridge,
      apparatus: 'reformer',
      bodyPosition: 'prone',
    };

    const result = validateMotionEvidenceRecord(wrongApparatusAndPosition);
    expect(result.valid).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('track-category-mismatch');
    expect(codes).toContain('apparatus-mismatch');
    expect(codes).toContain('body-position-mismatch');
  });

  it('detects missing or non-HTTPS source URLs and invalid rights policy', () => {
    const base = TRACK_B_APPARATUS_EVIDENCE_RECORDS[0];
    const badSourceRecord: MotionEvidenceReviewRecord = {
      ...base,
      sources: [
        {
          ...base.sources[0],
          directUrl: 'http://insecure-example.org/pilates',
          rightsPolicy: 'downloaded-image' as unknown as 'link-only-no-download',
        },
      ],
    };

    const result = validateMotionEvidenceRecord(badSourceRecord);
    expect(result.valid).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('missing-or-invalid-source-url');
    expect(codes).toContain('invalid-source-rights-policy');
  });

  it('detects missing start/middle/end phase evidence and missing biomechanical fields', () => {
    const base = TRACK_A_MAT_EVIDENCE_RECORDS[1];
    const missingPhaseAndField: MotionEvidenceReviewRecord = {
      ...base,
      phases: {
        ...base.phases,
        start: {
          ...base.phases.start,
          postureAndTransitionKo: '   ',
        },
        middle: {
          ...base.phases.middle,
          jointDirectionsKo: [],
          supportPointsKo: [''],
          breathingKo: '',
        },
      },
    };

    const result = validateMotionEvidenceRecord(missingPhaseAndField);
    expect(result.valid).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('missing-phase-evidence');
    expect(codes).toContain('missing-biomechanical-field');
  });

  it('detects discrepancy target ID mismatches and epistemic category mismatches', () => {
    const base = TRACK_A_MAT_EVIDENCE_RECORDS[6]; // original-mat-clam
    const badDiscrepancyRecord: MotionEvidenceReviewRecord = {
      ...base,
      discrepancyAudit: {
        targetVisualAssetId: 'wrong-archetype-id',
        targetPatternVariantIds: ['wrong-pattern-variant-id'],
        facts: [
          {
            category: 'inference',
            targetId: 'unrelated-target-id',
            summaryKo: '사실 배열에 추론 카테고리와 잘못된 타겟 ID를 넣음',
          },
        ],
        inferences: [],
        unverifiedOrMismatched: [],
        diagramTeamRecommendationsKo: [],
      },
    };

    const result = validateMotionEvidenceRecord(badDiscrepancyRecord);
    expect(result.valid).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('discrepancy-target-id-mismatch');
    expect(codes).toContain('epistemic-category-mismatch');
  });

  it('detects fabricated numeric joint angles, EMG percentages, medical safety guarantees, and false ready/verified flags', () => {
    const base = TRACK_B_APPARATUS_EVIDENCE_RECORDS[7]; // original-chair-seated-pedal-press
    const fabricatedRecord: MotionEvidenceReviewRecord = {
      ...base,
      phases: {
        ...base.phases,
        middle: {
          ...base.phases.middle,
          postureAndTransitionKo:
            '무릎을 정확히 90° 굴곡하여 대퇴사두근 EMG 85% 활성화를 달성하고 허리 부상 방지 보장 효과를 얻습니다.',
        },
      },
      truthfulnessFlags: {
        ...base.truthfulnessFlags,
        canonicalMotionReady: true,
        manualReady: true,
        true3dSupported: true,
        anatomicalVerificationCompleted: true,
        expertVerificationCompleted: true,
      },
    };

    const result = validateMotionEvidenceRecord(fabricatedRecord);
    expect(result.valid).toBe(false);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain('unsupported-numeric-angle-or-medical-claim');
    expect(codes).toContain('false-ready-or-verified-claim');
  });

  it('keeps Track C/D within the historical cohort and flags changed rig targets without rewriting their reviews', () => {
    const catalogById = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

    expect(TRACK_A_MAT_EVIDENCE_RECORDS.length + TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS.length).toBe(
      historicalExercises.filter((ex) => ex.apparatus === 'mat').length,
    );

    expect(
      TRACK_B_APPARATUS_EVIDENCE_RECORDS.length +
        TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS.length,
    ).toBe(historicalExercises.filter((ex) => ex.apparatus !== 'mat').length);

    for (const [idx, record] of TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS.entries()) {
      expect(record.track).toBe('track-c-extended-mat');
      expect(record.rankInTrack).toBe(idx + 1);
      expect(record.apparatus).toBe('mat');
      const catalogEx = catalogById.get(record.exerciseId);
      expect(catalogEx).toBeDefined();
      expect(record.nameKo).toBe(catalogEx!.nameKo);
      expect(record.nameEn).toBe(catalogEx!.nameEn);
      expect(record.bodyPosition).toBe(catalogEx!.bodyPosition);
      expect(record.spinalPlanes).toEqual(catalogEx!.spinalPlanes);
      expect(record.sources.length).toBeGreaterThanOrEqual(2);
      expect(record.muscles?.primaryMusclesKo.length).toBeGreaterThan(0);
      expect(record.commonCompensations?.length).toBeGreaterThanOrEqual(2);
      expect(record.contraindicationsAndModifications?.length).toBeGreaterThanOrEqual(1);
      expect(record.discrepancyChecks?.length).toBeGreaterThanOrEqual(2);
      expect(record.reviewedAtIso).toBe('2026-11-08');

      const res = expectCurrentRecordValidation(record);
      expect(res.hasVerifiedDirectSource).toBe(true);
    }

    for (const [idx, record] of TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS.entries()) {
      expect(record.track).toBe('track-d-extended-apparatus');
      expect(record.rankInTrack).toBe(idx + 1);
      expect(record.apparatus).not.toBe('mat');
      const catalogEx = catalogById.get(record.exerciseId);
      expect(catalogEx).toBeDefined();
      expect(record.nameKo).toBe(catalogEx!.nameKo);
      expect(record.nameEn).toBe(catalogEx!.nameEn);
      expect(record.bodyPosition).toBe(catalogEx!.bodyPosition);
      expect(record.spinalPlanes).toEqual(catalogEx!.spinalPlanes);
      expect(record.sources.length).toBeGreaterThanOrEqual(2);
      expect(record.muscles?.primaryMusclesKo.length).toBeGreaterThan(0);
      expect(record.commonCompensations?.length).toBeGreaterThanOrEqual(2);
      expect(record.contraindicationsAndModifications?.length).toBeGreaterThanOrEqual(1);
      expect(record.discrepancyChecks?.length).toBeGreaterThanOrEqual(2);
      expect(record.reviewedAtIso).toBe('2026-11-08');

      const res = expectCurrentRecordValidation(record);
      expect(res.hasVerifiedDirectSource).toBe(true);
    }
  });

  it('preserves the 98 historical reviews while exposing 12 changed targets and 60 unreviewed additions', () => {
    expect(FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS).toHaveLength(98);
    expect(historicalExercises).toHaveLength(98);
    const before = JSON.stringify(FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS);

    const fullReport = validateFullCatalogMotionEvidenceSuite();
    expect(fullReport.valid).toBe(false);
    expect(fullReport.totalRecords).toBe(98);
    expect(fullReport.catalogCoverageCount).toBe(98);
    expect(fullReport.missingCatalogExerciseIds).toEqual(
      INITIAL_EXERCISES.filter((exercise) => exercise.id.startsWith('expanded-')).map(
        (exercise) => exercise.id,
      ),
    );
    expect(fullReport.missingCatalogExerciseIds).toHaveLength(60);
    expect(fullReport.zeroTrackIdOverlap).toBe(true);
    expect(fullReport.verifiedDirectSourceCoverageCount).toBe(98);
    expect(Object.keys(staleTargets)).toHaveLength(12);
    expect(fullReport.issueCount).toBe(12);
    expect(
      fullReport.issues.map(({ exerciseId, code, fieldPath }) => ({ exerciseId, code, fieldPath })),
    ).toEqual(
      Object.keys(staleTargets).map((exerciseId) => ({
        exerciseId,
        code: 'discrepancy-target-id-mismatch',
        fieldPath: 'discrepancyAudit.targetVisualAssetId',
      })),
    );
    expect(
      Object.values(fullReport.resultsByExerciseId).filter((result) => result.valid),
    ).toHaveLength(86);

    // A pose correction under the same target ID does not fabricate a target mismatch.
    // Target validation alone still does not constitute a review of its new geometry.
    const standingRollDown = resolveMotionEvidenceReviewRecord('ex-cooldown-02')!;
    expect(standingRollDown.discrepancyAudit.targetVisualAssetId).toBe(
      'standing-roll-down-centering',
    );
    expect(getMovementVisualAsset('ex-cooldown-02')?.archetypeId).toBe(
      'standing-roll-down-centering',
    );
    expect(fullReport.resultsByExerciseId['ex-cooldown-02'].valid).toBe(true);
    expect(standingRollDown.truthfulnessFlags.expertVerificationCompleted).toBe(false);
    expect(standingRollDown.truthfulnessFlags.anatomicalVerificationCompleted).toBe(false);

    for (const exercise of INITIAL_EXERCISES) {
      const resolved = resolveMotionEvidenceReviewRecord(exercise.id);
      if (exercise.id.startsWith('expanded-')) {
        expect(resolved).toBeUndefined();
        continue;
      }
      expect(resolved).toBeDefined();
      expect(resolved?.exerciseId).toBe(exercise.id);
      expect(resolved?.apparatus).toBe(exercise.apparatus);
      expect(resolved?.bodyPosition).toBe(exercise.bodyPosition);
      expectCurrentRecordValidation(resolved!);
    }

    expect(resolveMotionEvidenceReviewRecord('unknown-id-404')).toBeUndefined();
    expect(JSON.stringify(FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS)).toBe(before);
  });
});
