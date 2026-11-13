import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getMovementProvenance } from '../data/movementProvenance';
import { getExerciseEvidence } from '../utils/exerciseEvidence';
import {
  CATALOG_CONTINUOUS_MOTION_ASSETS,
  getCatalogContinuousMotionAsset,
} from '../data/catalogMotionAssets';
import { MotionReferencePlayer } from '../components/MotionReferencePlayer';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { InlineExerciseFinder } from '../components/InlineExerciseFinder';
import { EXPANDED_MOVEMENTS, getExpandedMovementSource } from '../data/expandedMovements';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { resolveMotionCoverage } from '../features/motionCoverage';

afterEach(() => {
  cleanup();
});

const FORBIDDEN_UNVERIFIED_OR_PENDING_LABELS = [
  '출처 미검증',
  '모션 제작 대기',
  '정확한 모션 애셋 제작 대기',
  '모션 도해 준비 중',
  '도해 준비 중',
  'MOTION STUDY PENDING',
  '관련 도해는 아직 없어요',
  '아직 연결된 도해가 없어요',
] as const;

const historicalExercises = INITIAL_EXERCISES.filter(
  (exercise) => !exercise.id.startsWith('expanded-'),
);

describe('historical diagram availability and honest source-only presentation for expanded movements', () => {
  it('preserves the historical diagram assets and evidence while retaining internal registries for the full catalog', () => {
    expect(INITIAL_EXERCISES).toHaveLength(historicalExercises.length + EXPANDED_MOVEMENTS.length);
    expect(CATALOG_CONTINUOUS_MOTION_ASSETS).toHaveLength(INITIAL_EXERCISES.length);

    for (const exercise of historicalExercises) {
      const provenance = getMovementProvenance(exercise);
      const evidence = getExerciseEvidence(exercise);
      const motionAsset = getCatalogContinuousMotionAsset(exercise);

      expect(motionAsset).not.toBeNull();
      expect(motionAsset!.exerciseId).toBe(exercise.id);
      expect(motionAsset!.phases).toHaveLength(5);
      expect(motionAsset!.factualRecordSha256).toMatch(/^[0-9a-f]{64}$/);

      // Sample continuous pose across all 5 phases
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        const snapshot = motionAsset!.samplePose(p);
        expect(snapshot.phase.id).toBeTruthy();
        expect(Number.isFinite(snapshot.joints.head.x)).toBe(true);
        expect(Number.isFinite(snapshot.joints.pelvis.y)).toBe(true);
      }

      const serialized = JSON.stringify({ provenance, evidence });
      for (const forbidden of FORBIDDEN_UNVERIFIED_OR_PENDING_LABELS) {
        expect(serialized).not.toContain(forbidden);
      }
    }
  });

  it('does not treat expanded creator metadata or internal fallback poses as authored motion', () => {
    for (const exercise of EXPANDED_MOVEMENTS) {
      const source = getExpandedMovementSource(exercise)!;
      const binding = getExpandedMovementVisualBinding(exercise)!;
      const evidence = getExerciseEvidence(exercise);
      const motionAsset = getCatalogContinuousMotionAsset(exercise)!;
      const coverage = resolveMotionCoverage(exercise);
      expect(binding.nativeMotionAvailable).toBe(false);
      expect(binding.presentation).toBe('creator-video-only');
      expect(coverage.primaryMode).toBe('missing');
      expect(coverage.canonicalMotionReady).toBe(false);
      expect(coverage.threePhase2d.asset).toBeNull();
      expect(coverage.safetyFlags.canonicalRecordExists).toBe(true);
      expect(coverage.safetyFlags.canonicalAssetReady).toBe(false);
      expect(motionAsset.factualRecordSha256).toBe('');
      expect(motionAsset.auditCheckedAt).toBe('2026-11-13');
      expect(evidence.motion.status).toBe('not-authored');
      expect(evidence.motion.catalogMapped).toBe(true);
      expect(evidence.motion.canonicalRecordExists).toBe(true);
      expect(evidence.motion.label).toContain('전용 도해 준비 중');
      expect(evidence.motion.label).not.toContain('대조 완료');
      expect(evidence.motion.relatedProposals).toEqual([]);
      expect(evidence.source.kind).toBe('creator-metadata');
      expect(evidence.source.checkedAt).toBe('2026-11-13');
      expect(evidence.source.description).toContain('전체 재생');
      expect(evidence.source.exactIntervalsConfirmed).toBe(false);
      expect(evidence.source.professionalReviewStatus).toBe('unreviewed');
      expect(evidence.links.some((link) => link.href === source.sourceUrl)).toBe(true);
      expect(evidence.links.some((link) => link.href.includes(`watch?v=${source.videoId}`))).toBe(
        true,
      );
    }
  });

  it('renders interactive SVG players for historical apparatus examples with no obsolete pending placeholders', () => {
    const sampleExercises = [
      INITIAL_EXERCISES.find((ex) => ex.apparatus === 'mat')!,
      INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer')!,
      INITIAL_EXERCISES.find((ex) => ex.apparatus === 'cadillac')!,
      INITIAL_EXERCISES.find((ex) => ex.apparatus === 'chair')!,
      INITIAL_EXERCISES.find((ex) => ex.apparatus === 'barrel')!,
      ...INITIAL_EXERCISES.filter((ex) => ex.id.startsWith('ex-')).slice(0, 4),
    ];

    for (const ex of sampleExercises) {
      const { container, unmount } = render(<MotionReferencePlayer exerciseId={ex.id} />);
      expect(container.querySelector('svg[role="img"]')).not.toBeNull();
      expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
      const text = container.textContent ?? '';
      for (const forbidden of FORBIDDEN_UNVERIFIED_OR_PENDING_LABELS) {
        expect(text).not.toContain(forbidden);
      }
      unmount();
    }
  });

  it('shows creator sources instead of a fabricated native motion player for expanded apparatus examples', () => {
    for (const apparatus of ['mat', 'reformer', 'cadillac', 'chair', 'barrel'] as const) {
      const exercise = EXPANDED_MOVEMENTS.find((item) => item.apparatus === apparatus)!;
      const { container, unmount } = render(<MotionReferencePlayer exerciseId={exercise.id} />);
      expect(container.querySelector('svg[role="img"]')).toBeNull();
      expect(screen.queryByRole('button', { name: '한 주기 재생' })).toBeNull();
      expect(container.textContent).toContain('제작자 영상');
      unmount();
    }
  });

  it('renders ExerciseAtlasView and InlineExerciseFinder with SVG thumbnails and zero unverified/pending strings', () => {
    const { container: atlasContainer, unmount: unmountAtlas } = render(
      <ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );
    const atlasText = atlasContainer.textContent ?? '';
    for (const forbidden of FORBIDDEN_UNVERIFIED_OR_PENDING_LABELS) {
      expect(atlasText).not.toContain(forbidden);
    }
    // Open direct preview on an exercise without pattern drafts
    fireEvent.change(screen.getByRole('searchbox', { name: '동작 검색' }), {
      target: { value: '누워서 호흡 관찰' },
    });
    const previewButtons = screen.getAllByRole('button', {
      name: /누워서 호흡 관찰 기구학 도해 보기/,
    });
    fireEvent.click(previewButtons[0]);
    expect(screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' })).toBeInTheDocument();
    unmountAtlas();

    const { container: finderContainer, unmount: unmountFinder } = render(
      <InlineExerciseFinder onOpenExercise={vi.fn()} />,
    );
    const finderText = finderContainer.textContent ?? '';
    for (const forbidden of FORBIDDEN_UNVERIFIED_OR_PENDING_LABELS) {
      expect(finderText).not.toContain(forbidden);
    }
    unmountFinder();
  });
});
