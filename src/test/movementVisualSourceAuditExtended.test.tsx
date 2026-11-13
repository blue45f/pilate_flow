import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MovementVisualGuideCard } from '../components/MovementVisualGuideCard';
import {
  CLEARED_YOUTUBE_REPLACEMENT_AUDITS,
  MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS,
  resolveExtendedMotionSourceAudit,
} from '../data/extendedMotionVerificationCatalog';
import {
  CATALOG_VISUAL_SOURCE_COMPARISONS,
  getVisualSourceComparison,
} from '../data/movementVisualSourceAudit';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { EXPANDED_MOVEMENTS, getExpandedMovementSource } from '../data/expandedMovements';

const historicalExercises = INITIAL_EXERCISES.filter(
  (exercise) => !exercise.id.startsWith('expanded-'),
);

afterEach(() => {
  cleanup();
});

describe('movementVisualSourceAuditExtended — historical audit and expanded source metadata boundaries', () => {
  it('preserves the historical cohort hashes and review boundaries without extending that audit to new catalog entries', () => {
    expect(historicalExercises).toHaveLength(98);
    expect(INITIAL_EXERCISES).toHaveLength(historicalExercises.length + EXPANDED_MOVEMENTS.length);
    expect(CATALOG_VISUAL_SOURCE_COMPARISONS).toHaveLength(INITIAL_EXERCISES.length);

    const clearedIds = new Set(CLEARED_YOUTUBE_REPLACEMENT_AUDITS.map((item) => item.exerciseId));
    const candidateMatIds = new Set<string>(MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS);

    for (const exercise of historicalExercises) {
      const record = getVisualSourceComparison(exercise);
      expect(record.anatomicalAccuracyAssumed).toBe(false);
      expect(record.professionalMotionReviewCount).toBe(0);
      expect(record.extendedAuditSummary).toBeDefined();

      const {
        factualRecordSha256,
        sourceVerificationCategoryKo,
        hasClearedYoutubeReplacementAudit,
        hasExtendedCandidateMotionModel,
        auditCheckedAt,
      } = record.extendedAuditSummary;

      expect(factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(sourceVerificationCategoryKo.trim().length).toBeGreaterThan(0);
      expect(auditCheckedAt).toBe('2026-11-08');
      const directAudit = resolveExtendedMotionSourceAudit(record.exerciseId);
      expect(hasClearedYoutubeReplacementAudit).toBe(clearedIds.has(record.exerciseId));
      expect(hasExtendedCandidateMotionModel).toBe(Boolean(directAudit.candidateMatMotionModel));
      if (candidateMatIds.has(record.exerciseId)) {
        expect(hasExtendedCandidateMotionModel).toBe(true);
      }
      expect(factualRecordSha256).toBe(directAudit.primaryFactualRecordSha256);
    }
  });

  it('exposes the checked creator metadata for expanded movements without a historical motion hash or review record', () => {
    for (const exercise of EXPANDED_MOVEMENTS) {
      const source = getExpandedMovementSource(exercise)!;
      const record = getVisualSourceComparison(exercise);
      const directAudit = resolveExtendedMotionSourceAudit(exercise);

      expect(source).toBeDefined();
      expect(record.reviewStage).toBe('unreviewed-draft');
      expect(record.anatomicalAccuracyAssumed).toBe(false);
      expect(record.professionalMotionReviewCount).toBe(0);
      expect(record.extendedAuditSummary).toMatchObject({
        factualRecordSha256: '',
        hasClearedYoutubeReplacementAudit: false,
        hasExtendedCandidateMotionModel: false,
        auditCheckedAt: '2026-11-13',
      });
      expect(record.extendedAuditSummary.sourceVerificationCategoryKo).toContain('메타데이터');
      expect(record.matchedReliableSources.map((item) => item.url)).toEqual([
        source.sourceUrl,
        `https://www.youtube.com/watch?v=${source.videoId}`,
      ]);
      expect(directAudit.sha256IntegrityVerified).toBe(false);
      expect(directAudit.primaryFactualRecordSha256).toBe('');
      expect(directAudit.candidateMatMotionModel).toBeNull();
      expect(directAudit.previouslyUnboundMotionModel).toBeNull();
      expect(directAudit.clearedYoutubeReplacementAudit).toBeNull();
      expect(directAudit.verifiedReferenceAuditRecord).toBeNull();
      expect(directAudit.verifiedReferencePublicEntry).toBeNull();
    }
  });

  it('renders data-testid="visual-guide-extended-audit-strip" in MovementVisualGuideCard for Mat, Reformer, Korean candidate (ex-kr-reformer-01), and cleared YouTube (ex-warmup-01) exercises', () => {
    const matExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'original-mat-swan-prep')!;
    const reformerExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
    const koreanCandidateExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-kr-reformer-01')!;
    const clearedYoutubeExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-warmup-01')!;

    // 1. Mat exercise (with extended candidate motion model)
    const { rerender } = render(<MovementVisualGuideCard exercise={matExercise} />);
    const matComparison = getVisualSourceComparison(matExercise);
    let strip = screen.getByTestId('visual-guide-extended-audit-strip');
    expect(strip).toBeInTheDocument();
    expect(strip).toHaveAttribute(
      'data-factual-record-sha256',
      matComparison.extendedAuditSummary.factualRecordSha256,
    );
    expect(strip).toHaveAttribute('data-has-candidate-motion-model', 'true');
    expect(strip).toHaveAttribute('data-has-cleared-youtube-audit', 'false');
    expect(strip).toHaveTextContent(
      '공식·학술·임상 출처 본문 및 생체역학 범위 대조 기록 (전문가 검증 전)',
    );
    expect(strip).toHaveTextContent('대조 기준일: 2026-11-08');
    expect(strip).toHaveTextContent(
      '전문가 모션 검수 0건 · 해부학적 정밀성 가정 안 함 (해시·연결은 원장 무결성 확인용)',
    );
    expect(strip).toHaveTextContent(
      matComparison.extendedAuditSummary.factualRecordSha256.slice(0, 12),
    );

    // 2. Reformer exercise
    rerender(<MovementVisualGuideCard exercise={reformerExercise} />);
    const reformerComparison = getVisualSourceComparison(reformerExercise);
    strip = screen.getByTestId('visual-guide-extended-audit-strip');
    expect(strip).toHaveAttribute(
      'data-factual-record-sha256',
      reformerComparison.extendedAuditSummary.factualRecordSha256,
    );
    expect(strip).toHaveTextContent(
      '공식·학술·임상 출처 본문 및 생체역학 범위 대조 기록 (전문가 검증 전)',
    );
    expect(strip).toHaveTextContent('대조 기준일: 2026-11-08');

    // 3. Korean candidate exercise (ex-kr-reformer-01)
    rerender(<MovementVisualGuideCard exercise={koreanCandidateExercise} />);
    const krComparison = getVisualSourceComparison(koreanCandidateExercise);
    strip = screen.getByTestId('visual-guide-extended-audit-strip');
    expect(strip).toHaveAttribute(
      'data-factual-record-sha256',
      krComparison.extendedAuditSummary.factualRecordSha256,
    );
    expect(strip).toHaveTextContent(
      '국내 교육기관 후보 자료 메타데이터·역학 범위 대조 기록 (전문가 검증 전)',
    );
    expect(strip).toHaveTextContent('대조 기준일: 2026-11-08');
    expect(strip).toHaveTextContent(
      '전문가 모션 검수 0건 · 해부학적 정밀성 가정 안 함 (해시·연결은 원장 무결성 확인용)',
    );

    // 4. Cleared YouTube exercise (ex-warmup-01)
    rerender(<MovementVisualGuideCard exercise={clearedYoutubeExercise} />);
    const clearedComparison = getVisualSourceComparison(clearedYoutubeExercise);
    strip = screen.getByTestId('visual-guide-extended-audit-strip');
    expect(strip).toHaveAttribute(
      'data-factual-record-sha256',
      clearedComparison.extendedAuditSummary.factualRecordSha256,
    );
    expect(strip).toHaveAttribute('data-has-cleared-youtube-audit', 'true');
    expect(strip).toHaveTextContent(
      '레거시 미검증 링크 제거 후 공공·공식 대체 출처 대조 기록 (전문가 검증 전)',
    );
    expect(strip).toHaveTextContent('대조 기준일: 2026-11-08');
    expect(strip).toHaveTextContent(
      clearedComparison.extendedAuditSummary.factualRecordSha256.slice(0, 12),
    );
  });
});
