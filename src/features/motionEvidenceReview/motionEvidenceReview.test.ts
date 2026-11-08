import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
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

describe('motionEvidenceReview — 3-Track Evidence & Validator Suite', () => {
  it('validates all 10 Track A (Mat) and 10 Track B (Apparatus) records with zero issues and zero ID overlap', () => {
    const report = validateMotionEvidenceSuite();

    expect(report.valid).toBe(true);
    expect(report.totalRecords).toBe(20);
    expect(report.trackACount).toBe(10);
    expect(report.trackBCount).toBe(10);
    expect(report.zeroTrackIdOverlap).toBe(true);
    expect(report.issueCount).toBe(0);
    expect(report.issues).toEqual([]);
    expect(ALL_MOTION_EVIDENCE_REVIEW_RECORDS).toHaveLength(20);
  });

  it('ensures Track A contains 10 unique Mat exercises and Track B contains 10 unique Apparatus exercises across Reformer, Cadillac, Chair, and Barrel', () => {
    const trackAIds = new Set(
      TRACK_A_MAT_EVIDENCE_RECORDS.map((r) => r.exerciseId),
    );
    const trackBIds = new Set(
      TRACK_B_APPARATUS_EVIDENCE_RECORDS.map((r) => r.exerciseId),
    );

    expect(trackAIds.size).toBe(10);
    expect(trackBIds.size).toBe(10);

    for (const record of TRACK_A_MAT_EVIDENCE_RECORDS) {
      expect(record.track).toBe('track-a-mat');
      expect(record.apparatus).toBe('mat');
      expect(trackBIds.has(record.exerciseId)).toBe(false);
    }

    const apparatusFamilies = new Set(
      TRACK_B_APPARATUS_EVIDENCE_RECORDS.map((r) => r.apparatus),
    );
    expect(apparatusFamilies.has('mat')).toBe(false);
    expect(apparatusFamilies.has('reformer')).toBe(true);
    expect(apparatusFamilies.has('cadillac')).toBe(true);
    expect(apparatusFamilies.has('chair')).toBe(true);
    expect(apparatusFamilies.has('barrel')).toBe(true);
  });

  it('tracks source verification vs sandbox proxy restriction counts honestly without hiding blocked URLs', () => {
    const report = validateMotionEvidenceSuite();

    expect(
      report.fullyVerifiedSourceExerciseCount +
        report.partiallyOrProxyRestrictedExerciseCount,
    ).toBe(20);
    expect(report.fullyVerifiedSourceExerciseCount).toBeGreaterThan(0);
    expect(report.partiallyOrProxyRestrictedExerciseCount).toBeGreaterThan(0);

    for (const record of ALL_MOTION_EVIDENCE_REVIEW_RECORDS) {
      const result = report.resultsByExerciseId[record.exerciseId];
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
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
          rightsPolicy:
            'downloaded-image' as unknown as 'link-only-no-download',
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

  it('validates all Track C extended Mat records and Track D extended Apparatus records with rich biomechanical fields and zero issues', () => {
    const catalogById = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

    expect(
      TRACK_A_MAT_EVIDENCE_RECORDS.length +
        TRACK_C_EXTENDED_MAT_EVIDENCE_RECORDS.length,
    ).toBe(INITIAL_EXERCISES.filter((ex) => ex.apparatus === 'mat').length);

    expect(
      TRACK_B_APPARATUS_EVIDENCE_RECORDS.length +
        TRACK_D_EXTENDED_APPARATUS_EVIDENCE_RECORDS.length,
    ).toBe(INITIAL_EXERCISES.filter((ex) => ex.apparatus !== 'mat').length);

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
      expect(
        record.contraindicationsAndModifications?.length,
      ).toBeGreaterThanOrEqual(1);
      expect(record.discrepancyChecks?.length).toBeGreaterThanOrEqual(2);
      expect(record.reviewedAtIso).toBe('2026-11-08');

      const res = validateMotionEvidenceRecord(record);
      expect(res.valid).toBe(true);
      expect(res.issues).toEqual([]);
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
      expect(
        record.contraindicationsAndModifications?.length,
      ).toBeGreaterThanOrEqual(1);
      expect(record.discrepancyChecks?.length).toBeGreaterThanOrEqual(2);
      expect(record.reviewedAtIso).toBe('2026-11-08');

      const res = validateMotionEvidenceRecord(record);
      expect(res.valid).toBe(true);
      expect(res.issues).toEqual([]);
      expect(res.hasVerifiedDirectSource).toBe(true);
    }
  });

  it('validates all 98 catalog exercises in FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS via validateFullCatalogMotionEvidenceSuite and resolves each via resolveMotionEvidenceReviewRecord', () => {
    expect(FULL_CATALOG_MOTION_EVIDENCE_REVIEW_RECORDS).toHaveLength(98);

    const fullReport = validateFullCatalogMotionEvidenceSuite();
    expect(fullReport.valid).toBe(true);
    expect(fullReport.totalRecords).toBe(98);
    expect(fullReport.catalogCoverageCount).toBe(98);
    expect(fullReport.missingCatalogExerciseIds).toEqual([]);
    expect(fullReport.zeroTrackIdOverlap).toBe(true);
    expect(fullReport.verifiedDirectSourceCoverageCount).toBe(98);
    expect(fullReport.issueCount).toBe(0);
    expect(fullReport.issues).toEqual([]);

    for (const exercise of INITIAL_EXERCISES) {
      const resolved = resolveMotionEvidenceReviewRecord(exercise.id);
      expect(resolved).toBeDefined();
      expect(resolved?.exerciseId).toBe(exercise.id);
      expect(resolved?.apparatus).toBe(exercise.apparatus);
      expect(resolved?.bodyPosition).toBe(exercise.bodyPosition);
    }

    expect(resolveMotionEvidenceReviewRecord('unknown-id-404')).toBeUndefined();
  });
});
