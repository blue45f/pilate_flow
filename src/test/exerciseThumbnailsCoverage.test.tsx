import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getStudioVerifiedGuidance } from '../data/clinicalVerificationLibrary';
import { ExerciseThumbnailBadge } from '../components/ExerciseThumbnailBadge';
import { ApparatusIconBadge } from '../components/ApparatusStudioArtwork';
import { StudioClinicalBriefCard } from '../components/StudioClinicalBriefCard';

afterEach(() => {
  cleanup();
});

describe('Exercise thumbnails, apparatus studio icons, and separated apparatus/block reference templates', () => {
  it('separates exercise note springs/breathing from apparatus/block reference templates for all 98 catalog exercises without claiming individual cross-verification', () => {
    expect(INITIAL_EXERCISES.length).toBeGreaterThanOrEqual(98);
    for (const exercise of INITIAL_EXERCISES) {
      const guidance = getStudioVerifiedGuidance(exercise);
      expect(guidance.verificationBadgeKo).toBe('기구·구간 공통 참고 · 원문 확인 필요');
      expect(guidance.verificationBadgeKo).not.toContain('교차 검증 완료');
      expect(guidance.verificationTier).toBe('apparatus-block-template');
      expect(guidance.exerciseNote.springsKo).toBe(exercise.springs.trim() || null);
      expect(guidance.exerciseNote.breathPatternKo).toBe(exercise.breathPattern.trim() || null);
      expect(guidance.springAndSetupStandardKo.length).toBeGreaterThan(5);
      expect(guidance.biomechanicalFocusKo.length).toBeGreaterThan(5);
      expect(guidance.breathingCadenceKo.length).toBeGreaterThan(5);
      if (guidance.exerciseNote.hasSpecificSprings && guidance.exerciseNote.springsKo) {
        expect(guidance.springAndSetupStandardKo).not.toContain(guidance.exerciseNote.springsKo);
      }
      expect(guidance.primaryVideo.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(guidance.secondaryVideo.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
      expect(guidance.literature.url).toMatch(/^https:\/\//);
    }
  });

  it('renders ExerciseThumbnailBadge (single & 3-phase strip), ApparatusIconBadge, and separated note vs template boxes across all apparatus types', () => {
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
      const briefCard = screen.getByTestId('studio-clinical-brief-card');
      expect(briefCard).toHaveTextContent('기구·구간 공통 참고 · 원문 확인 필요');
      expect(briefCard).not.toHaveTextContent('교차 검증 완료');
      expect(within(briefCard).getByTestId('brief-exercise-note-box')).toBeInTheDocument();
      expect(within(briefCard).getByTestId('brief-apparatus-template-box')).toBeInTheDocument();
      unmount();
    }
  });
});
