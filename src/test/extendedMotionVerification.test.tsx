import { createHash } from 'node:crypto';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExtendedMotionVerificationPanel } from '../components/ExtendedMotionVerificationPanel';
import { MotionDraftLabDialog } from '../components/MotionDraftLabDialog';
import { MotionDraftReviewWorksheet } from '../components/MotionDraftReviewWorksheet';
import extendedLedger from '../data/extendedMotionSourceLedger.json';
import {
  CLEARED_YOUTUBE_REPLACEMENT_AUDITS,
  CLEARED_YOUTUBE_VIDEO_REASONS,
  EXTENDED_CANDIDATE_JOINT_KEYS,
  EXTENDED_CANDIDATE_MOTION_MODELS,
  MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS,
  PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS,
  VERIFIED_REFERENCE_AUDIT_RECORDS,
  resolveExtendedCandidateMotionModel,
  resolveExtendedMotionSourceAudit,
  resolvePreviouslyUnboundMotionModelAudit,
  verifyExtendedMotionSourceLedgerIntegrity,
} from '../data/extendedMotionVerificationCatalog';
import { getMotionDraft } from '../data/motionDrafts';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { EXPANDED_MOVEMENTS } from '../data/expandedMovements';

const historicalExercises = INITIAL_EXERCISES.filter(
  (exercise) => !exercise.id.startsWith('expanded-'),
);

function sha256OfFactualRecord(record: unknown): string {
  return createHash('sha256').update(JSON.stringify(record), 'utf8').digest('hex');
}

describe('Extended Motion Source Ledger & Verification Catalog', () => {
  it('resolves all 8 matCatalogIdsWithoutExistingProposals and interpolates cleanly across progress = 0, 0.25, 0.5, 0.75, 1', () => {
    expect(MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS).toHaveLength(8);
    expect(EXTENDED_CANDIDATE_MOTION_MODELS).toHaveLength(8);

    const sampleProgressPoints = [0, 0.25, 0.5, 0.75, 1] as const;

    for (const exerciseId of MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS) {
      const model = resolveExtendedCandidateMotionModel(exerciseId);
      expect(model).not.toBeNull();
      expect(model!.exerciseId).toBe(exerciseId);
      expect(model!.anatomicalAccuracyAssumed).toBe(false);
      expect(model!.professionalReviewCount).toBe(0);
      expect(model!.sources.length).toBeGreaterThanOrEqual(2);
      expect(model!.factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);

      // Also resolves by candidateId
      const byCandidate = resolveExtendedCandidateMotionModel(model!.candidateId);
      expect(byCandidate).toBe(model);

      for (const p of sampleProgressPoints) {
        const snapshot = model!.samplePose(p);
        expect(snapshot.progress).toBeCloseTo(p, 4);
        expect(snapshot.supportAnchors.length).toBeGreaterThan(0);
        expect(snapshot.vectorArrows.length).toBeGreaterThan(0);

        for (const jointKey of EXTENDED_CANDIDATE_JOINT_KEYS) {
          const pt = snapshot.joints[jointKey];
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        }
      }
    }
  });

  it('verifies exact 64-hex SHA-256 hashes for all 8 candidate models, 9 previously unbound models, 5 cleared YouTube audits, and 30 VERIFIED_REFERENCES', () => {
    const integrity = verifyExtendedMotionSourceLedgerIntegrity();
    expect(integrity.valid).toBe(true);
    expect(integrity.errors).toEqual([]);
    expect(integrity.candidateMatMotionModelsCount).toBe(8);
    expect(integrity.previouslyUnboundMotionModelsCount).toBe(9);
    expect(integrity.clearedYoutubeReplacementAuditsCount).toBe(5);
    expect(integrity.totalAuditedReferences).toBe(30);
    expect(integrity.officialSourceCheckedCount).toBe(18);
    expect(integrity.partialPlaybackCheckedCount).toBe(3);
    expect(integrity.koreanCandidateCount).toBe(9);
    expect(integrity.unverifiedRemainderCount).toBe(0);
    expect(integrity.professionalReviewCount).toBe(0);
    expect(integrity.anatomicalAccuracyAssumed).toBe(false);

    // Recompute exact SHA-256 on raw JSON factualRecord for all 8 candidate models
    for (const entry of extendedLedger.candidateMatMotionModels) {
      expect(entry.factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(sha256OfFactualRecord(entry.factualRecord)).toBe(entry.factualRecordSha256);
    }

    // All 9 previously unbound models
    const expectedUnboundIds = [
      'supported-heel-raise',
      'side-lying-clam',
      'side-lying-straight-leg-lift',
      'side-lying-open-book',
      'supine-single-leg-reach-v1',
      'mat-pelvic-curl-bridge-v1',
      'mat-chest-lift-abdominal-prep-v1',
      'mat-single-knee-to-chest-fold-v1',
      'mat-prone-thoracic-extension-prep-v1',
    ];
    expect(PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS.map((m) => m.modelId)).toEqual(
      expectedUnboundIds,
    );
    for (const entry of extendedLedger.previouslyUnboundMotionModels) {
      expect(entry.factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(sha256OfFactualRecord(entry.factualRecord)).toBe(entry.factualRecordSha256);
      expect(resolvePreviouslyUnboundMotionModelAudit(entry.modelId)).not.toBeNull();
    }

    // All 5 cleared YouTube replacement audits
    const expectedClearedIds = [
      'ex-warmup-01',
      'ex-footwork-02',
      'ex-cooldown-02',
      'ex-core-04',
      'ex-lower-04',
    ];
    expect(CLEARED_YOUTUBE_REPLACEMENT_AUDITS.map((c) => c.exerciseId)).toEqual(expectedClearedIds);
    for (const entry of extendedLedger.clearedYoutubeReplacementAudits) {
      expect(entry.factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(sha256OfFactualRecord(entry.factualRecord)).toBe(entry.factualRecordSha256);
      expect(entry.clearedReasonKo).toBe(CLEARED_YOUTUBE_VIDEO_REASONS[entry.exerciseId]);
    }

    // All 30 VERIFIED_REFERENCES
    expect(VERIFIED_REFERENCES).toHaveLength(30);
    expect(VERIFIED_REFERENCE_AUDIT_RECORDS).toHaveLength(30);
    for (const ref of VERIFIED_REFERENCES) {
      const record = extendedLedger.verifiedReferenceAuditRecords.find(
        (r) => r.referenceId === ref.id,
      );
      expect(record).toBeDefined();
      expect(record!.checkedAt).toBe('2026-11-08');
      expect(record!.originalVerificationStatus).toBe(ref.verificationStatus);
      expect(record!.auditConclusionStatus).toBe(
        'source-metadata-and-biomechanical-scope-verified',
      );
      expect(record!.factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(sha256OfFactualRecord(record!.factualRecord)).toBe(record!.factualRecordSha256);
    }

    // These hashes cover the historical cohort, not newly linked creator metadata.
    expect(historicalExercises).toHaveLength(98);
    for (const exercise of historicalExercises) {
      const bundle = resolveExtendedMotionSourceAudit(exercise.id);
      expect(bundle.sha256IntegrityVerified).toBe(true);
      expect(bundle.primaryFactualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(bundle.anatomicalAccuracyAssumed).toBe(false);
      expect(bundle.professionalReviewCount).toBe(0);
    }
  });

  it('keeps expanded creator metadata separate from the historical factual ledger and motion review', () => {
    for (const exercise of EXPANDED_MOVEMENTS) {
      const bundle = resolveExtendedMotionSourceAudit(exercise);
      expect(bundle.exerciseFoundInCatalog).toBe(true);
      expect(bundle.checkedAt).toBe('2026-11-13');
      expect(bundle.primaryFactualRecordSha256).toBe('');
      expect(bundle.sha256IntegrityVerified).toBe(false);
      expect(bundle.candidateMatMotionModel).toBeNull();
      expect(bundle.previouslyUnboundMotionModel).toBeNull();
      expect(bundle.clearedYoutubeReplacementAudit).toBeNull();
      expect(bundle.verifiedReferenceAuditRecord).toBeNull();
      expect(bundle.verifiedReferencePublicEntry).toBeNull();
      expect(bundle.anatomicalAccuracyAssumed).toBe(false);
      expect(bundle.professionalReviewCount).toBe(0);
      expect(bundle.verificationBoundaryNoticeKo).toContain('메타데이터 확인');
      expect(bundle.verificationBoundaryNoticeKo).toContain('검수 미완료');
    }
  });

  it('renders ExtendedMotionVerificationPanel with interactive 3-Phase + Continuous Scrubber SVG for original-mat-swan-prep (prone-baby-swan) and original-mat-forearm-plank (kneeling-forearm-plank)', () => {
    const swanExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'original-mat-swan-prep')!;
    const { unmount } = render(<ExtendedMotionVerificationPanel exercise={swanExercise} />);

    const panel = screen.getByTestId('extended-motion-verification-panel');
    expect(panel).toBeInTheDocument();

    const svg = within(panel).getByTestId('extended-candidate-motion-svg');
    expect(svg).toHaveAttribute('data-candidate-id', 'prone-baby-swan');
    expect(svg).toHaveAttribute('data-exercise-id', 'original-mat-swan-prep');
    expect(svg).toHaveAttribute('data-phase-id', 'middle');

    // Range scrubber updates continuous progress
    const rangeInput = within(panel).getByLabelText('연속 동작 진행률 조절');
    fireEvent.change(rangeInput, { target: { value: '0' } });
    expect(svg).toHaveAttribute('data-phase-id', 'start');
    expect(svg).toHaveAttribute('data-progress', '0');

    // Keyboard WAI-ARIA tab navigation (ArrowRight -> middle, End -> end, Home -> start)
    const tabs = within(panel).getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(svg).toHaveAttribute('data-phase-id', 'middle');
    fireEvent.keyDown(tabs[1], { key: 'End' });
    expect(svg).toHaveAttribute('data-phase-id', 'end');
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(svg).toHaveAttribute('data-phase-id', 'start');

    unmount();

    // Render original-mat-forearm-plank (kneeling-forearm-plank)
    const plankExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'original-mat-forearm-plank')!;
    render(<ExtendedMotionVerificationPanel exercise={plankExercise} />);
    const plankSvg = screen.getByTestId('extended-candidate-motion-svg');
    expect(plankSvg).toHaveAttribute('data-candidate-id', 'kneeling-forearm-plank');
    expect(plankSvg).toHaveAttribute('data-exercise-id', 'original-mat-forearm-plank');
  });

  it('renders ExtendedMotionVerificationPanel source audit summary for ex-kr-reformer-01 (kr-01) and ex-warmup-01 (cleared YouTube replacement audit)', () => {
    const krExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-kr-reformer-01')!;
    const { unmount } = render(<ExtendedMotionVerificationPanel exercise={krExercise} />);

    const summary = screen.getByTestId('extended-source-audit-summary');
    expect(summary).toHaveTextContent('kr-01');
    expect(summary).toHaveTextContent('korean-candidate');
    expect(summary).toHaveTextContent('source-metadata-and-biomechanical-scope-verified');
    expect(screen.getByTestId('extended-verification-boundary-notice')).toHaveTextContent(
      '전문의·외부 임상 승인 0건 · 해부학적 정밀성 가정 안 함',
    );

    unmount();

    const clearedExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-warmup-01')!;
    render(<ExtendedMotionVerificationPanel exercise={clearedExercise} />);
    const clearedCard = screen.getByTestId('cleared-youtube-replacement-audit-card');
    expect(clearedCard).toHaveTextContent('K56Z12XNQ5c');
    expect(clearedCard).toHaveTextContent('sr-01');
  });

  it('renders supplementary unbound model audit in MotionDraftReviewWorksheet and extended 8 candidate models section in MotionDraftLabDialog', () => {
    const heelDraft = getMotionDraft('supported-heel-raise')!;
    const { unmount } = render(<MotionDraftReviewWorksheet draft={heelDraft} />);
    fireEvent.click(screen.getByText('이 제안의 검토 자료'));
    const auditBox = screen.getByTestId('extended-unbound-model-audit');
    expect(auditBox).toBeVisible();
    expect(
      within(auditBox).getByRole('heading', { name: '확장 출처 대장 보완 검증 기록 (별도 원장)' }),
    ).toBeVisible();
    expect(auditBox).toHaveTextContent('전문가 모션 검토 0건');
    expect(auditBox).toHaveTextContent(
      resolvePreviouslyUnboundMotionModelAudit('supported-heel-raise')!.factualRecordSha256,
    );
    unmount();

    // Render MotionDraftLabDialog and inspect the 8 candidate models section
    render(<MotionDraftLabDialog open onClose={vi.fn()} />);
    const labSection = screen.getByTestId('extended-candidate-models-lab-section');
    expect(labSection).toHaveTextContent(
      '매트 미완 후보 8종 연속·3단계 모션 스터디 대조 (확장 카탈로그)',
    );
    const select = within(labSection).getByTestId('extended-candidate-select');
    expect(within(select).getAllByRole('option')).toHaveLength(8);

    fireEvent.change(select, { target: { value: 'kneeling-forearm-plank' } });
    const candidateSvg = within(labSection).getByTestId('extended-lab-candidate-svg');
    expect(candidateSvg).toHaveAttribute('data-candidate-id', 'kneeling-forearm-plank');
    expect(candidateSvg).toHaveAttribute('data-exercise-id', 'original-mat-forearm-plank');

    const range = within(labSection).getByTestId('extended-candidate-progress-range');
    fireEvent.change(range, { target: { value: '100' } });
    expect(candidateSvg).toHaveAttribute('data-phase-id', 'end');
    expect(candidateSvg).toHaveAttribute('data-progress', '1');
  });
});
