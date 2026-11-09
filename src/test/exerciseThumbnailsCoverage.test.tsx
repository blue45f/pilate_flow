import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getStudioVerifiedGuidance } from '../data/clinicalVerificationLibrary';
import { ExerciseThumbnailBadge } from '../components/ExerciseThumbnailBadge';
import { ApparatusIconBadge } from '../components/ApparatusStudioArtwork';
import { StudioClinicalBriefCard } from '../components/StudioClinicalBriefCard';

afterEach(() => {
  cleanup();
});

describe('Exercise thumbnails, apparatus studio icons, and cross-verified clinical guidance', () => {
  it('provides cross-verified clinical literature and YouTube guidance for all 98 catalog exercises', () => {
    expect(INITIAL_EXERCISES.length).toBeGreaterThanOrEqual(98);
    for (const exercise of INITIAL_EXERCISES) {
      const guidance = getStudioVerifiedGuidance(exercise);
      expect(guidance.verificationBadgeKo).toBe('교차 검증 완료 · 스튜디오 실전 가이드');
      expect(guidance.springAndSetupStandardKo.length).toBeGreaterThan(5);
      expect(guidance.biomechanicalFocusKo.length).toBeGreaterThan(5);
      expect(guidance.breathingCadenceKo.length).toBeGreaterThan(5);
      expect(guidance.primaryVideo.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(guidance.secondaryVideo.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(guidance.literature.url).toMatch(/^https:\/\//);
    }
  });

  it('renders ExerciseThumbnailBadge (single & 3-phase strip) and ApparatusIconBadge across all apparatus types', () => {
    const sampleByApparatus = ['mat', 'reformer', 'cadillac', 'chair', 'barrel'].map(
      (app) => INITIAL_EXERCISES.find((ex) => ex.apparatus === app)!,
    );

    for (const exercise of sampleByApparatus) {
      const { unmount } = render(
        <div>
          <ApparatusIconBadge
            apparatus={exercise.apparatus}
            bodyPosition={exercise.bodyPosition}
            size="sm"
            showLabel
          />
          <ExerciseThumbnailBadge exercise={exercise} showPhaseStrip />
          <StudioClinicalBriefCard exercise={exercise} />
        </div>,
      );

      expect(screen.getByTestId('apparatus-icon-badge')).toBeInTheDocument();
      expect(screen.getByTestId('exercise-thumbnail-phase-strip')).toBeInTheDocument();
      expect(screen.getByTestId('studio-clinical-brief-card')).toHaveTextContent(
        '교차 검증 완료 · 스튜디오 실전 가이드',
      );
      unmount();
    }
  });
});
