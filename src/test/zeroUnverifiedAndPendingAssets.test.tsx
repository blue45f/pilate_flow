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

describe('zero unverified source exposure and 98/98 authored continuous & 3-phase kinematic motion assets', () => {
  it('verifies all 98 catalog exercises have authored continuous 5-phase & 3-phase kinematic motion assets and zero unverified/pending labels in provenance or evidence', () => {
    expect(INITIAL_EXERCISES).toHaveLength(98);
    expect(CATALOG_CONTINUOUS_MOTION_ASSETS).toHaveLength(98);

    for (const exercise of INITIAL_EXERCISES) {
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

  it('renders interactive SVG motion players for every catalog exercise in MotionReferencePlayer with zero pending placeholders', () => {
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

  it('renders ExerciseAtlasView and InlineExerciseFinder with SVG thumbnails and zero unverified/pending strings', () => {
    const { container: atlasContainer, unmount: unmountAtlas } = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
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
