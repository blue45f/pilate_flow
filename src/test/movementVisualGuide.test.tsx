import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../components/MovementPhaseDiagramSvg';
import {
  MovementDifferenceCompareView,
  MovementVisualGuideCard,
} from '../components/MovementVisualGuideCard';
import {
  buildMovementVisualAssetForExercise,
  calculatePhaseJointDelta,
  getMovementVisualAsset,
  MOVEMENT_VISUAL_ASSETS,
} from '../data/movementVisualRigCatalog';
import {
  CATALOG_VISUAL_SOURCE_COMPARISONS,
  compareCatalogMovements,
  CURATED_MOVEMENT_DIFFERENCE_PAIRS,
  evaluateVisualAssetIntegrity,
  getRecommendedComparisonPeers,
  getVisualSourceComparison,
} from '../data/movementVisualSourceAudit';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';

afterEach(() => {
  cleanup();
});

describe('Movement visual rig catalog & 98-exercise full coverage', () => {
  it('matches all 98 canonical catalog exercises with finite start/middle/end coordinates, alignment guides, movement vectors, and primary muscles', () => {
    expect(INITIAL_EXERCISES).toHaveLength(98);
    expect(MOVEMENT_VISUAL_ASSETS).toHaveLength(98);

    const seenIds = new Set<string>();
    for (const exercise of INITIAL_EXERCISES) {
      const asset = getMovementVisualAsset(exercise.id);
      expect(asset).not.toBeNull();
      expect(asset!.exerciseId).toBe(exercise.id);
      expect(asset!.nameKo).toBe(exercise.nameKo);
      expect(asset!.apparatus).toBe(exercise.apparatus);
      expect(asset!.bodyPosition).toBe(exercise.bodyPosition);
      expect(asset!.blockCategory).toBe(exercise.blockCategory);
      expect(asset!.anatomicalAccuracyAssumed).toBe(false);
      expect(asset!.productionMethod).toBe('free-authored-kinematic-svg-v1');
      expect(asset!.rightsStatus).toBe('original-app-authored-free-license');
      expect(asset!.mobileSummaryBulletsKo).toHaveLength(3);
      seenIds.add(exercise.id);

      for (const phaseId of ['start', 'middle', 'end'] as const) {
        const phase = asset!.phases[phaseId];
        expect(phase.phaseId).toBe(phaseId);
        expect(phase.shortTitleKo.trim().length).toBeGreaterThan(0);
        expect(phase.summaryKo.trim().length).toBeGreaterThan(0);
        expect(phase.breathCueKo.trim().length).toBeGreaterThan(0);
        expect(phase.fixedAnchors.length).toBeGreaterThan(0);
        expect(phase.movingJoints.length).toBeGreaterThan(0);
        expect(phase.alignments.length).toBeGreaterThan(0);
        expect(phase.directionVectors.length).toBeGreaterThan(0);

        for (const point of Object.values(phase.joints)) {
          if (!point) continue;
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(16);
          expect(point.x).toBeLessThanOrEqual(304);
          expect(point.y).toBeGreaterThanOrEqual(16);
          expect(point.y).toBeLessThanOrEqual(184);
        }
      }

      const delta = calculatePhaseJointDelta(asset!);
      expect(delta.maxDeltaPx).toBeGreaterThan(0);
      expect(delta.movedJoints.length).toBeGreaterThan(0);
      expect(delta.anchoredJoints.length).toBeGreaterThan(0);

      const roles = new Set(asset!.primaryMuscles.map((m) => m.role));
      expect(roles.has('primary')).toBe(true);
      expect(roles.has('stabilizer')).toBe(true);
      expect(asset!.primaryMuscles.length).toBeGreaterThanOrEqual(3);
    }
    expect(seenIds.size).toBe(98);
  });

  it('verifies static SVG movement-guide assets and SHA-256 manifest in public/images/movement-guides/', () => {
    const guidesDir = path.resolve(process.cwd(), 'public/images/movement-guides');
    const manifestRaw = readFileSync(path.join(guidesDir, 'MANIFEST.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw) as {
      schemaVersion: number;
      productionMethod: string;
      rightsStatus: string;
      anatomicalAccuracyAssumed: boolean;
      assets: {
        fileName: string;
        publicPath: string;
        apparatus: string;
        sha256: string;
        bytes: number;
        phasesDepicted: string[];
      }[];
    };

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.productionMethod).toBe('free-authored-kinematic-svg-v1');
    expect(manifest.rightsStatus).toBe('original-app-authored-free-license');
    expect(manifest.anatomicalAccuracyAssumed).toBe(false);
    expect(manifest.assets).toHaveLength(5);

    const licenseText = readFileSync(path.join(guidesDir, 'LICENSE.txt'), 'utf8');
    expect(licenseText).toContain('anatomicalAccuracyAssumed: false');

    for (const item of manifest.assets) {
      const fileBytes = readFileSync(path.join(guidesDir, item.fileName));
      const actualHash = createHash('sha256').update(fileBytes).digest('hex');
      expect(fileBytes.byteLength).toBe(item.bytes);
      expect(actualHash).toBe(item.sha256);
      expect(item.phasesDepicted).toEqual(['start', 'middle', 'end']);

      const svgText = fileBytes.toString('utf8');
      expect(svgText).toContain('viewBox="0 0 960 360"');
      expect(svgText).toContain('id="phase-start"');
      expect(svgText).toContain('id="phase-middle"');
      expect(svgText).toContain('id="phase-end"');
      expect(svgText).toContain('id="middle-start-ghost"');
    }
  });
});

describe('Anatomical accuracy non-assumption, source comparison, and pre/post-review distinction', () => {
  it('never assumes anatomical accuracy and quarantines AI-generated raster or unlicensed assets', () => {
    const aiRasterCheck = evaluateVisualAssetIntegrity({
      productionMethod: 'ai-generated-raster',
      hasReliableSourceComparison: true,
    });
    expect(aiRasterCheck.anatomicalAccuracyAssumed).toBe(false);
    expect(aiRasterCheck.integrityPassed).toBe(false);
    expect(aiRasterCheck.canRepresentMovementTechnique).toBe(false);
    expect(aiRasterCheck.quarantineReasonKo).toContain('생성 이미지는 해부학적·운동학적 정확성을 추정할 수 없어');

    const assumedTrueCheck = evaluateVisualAssetIntegrity({
      productionMethod: 'free-authored-kinematic-svg-v1',
      anatomicalAccuracyAssumed: true,
      hasReliableSourceComparison: true,
    });
    expect(assumedTrueCheck.anatomicalAccuracyAssumed).toBe(false);
    expect(assumedTrueCheck.integrityPassed).toBe(false);
    expect(assumedTrueCheck.canRepresentMovementTechnique).toBe(false);

    const validAuthoredCheck = evaluateVisualAssetIntegrity({
      productionMethod: 'free-authored-kinematic-svg-v1',
      anatomicalAccuracyAssumed: false,
      hasReliableSourceComparison: true,
    });
    expect(validAuthoredCheck.anatomicalAccuracyAssumed).toBe(false);
    expect(validAuthoredCheck.integrityPassed).toBe(true);
    expect(validAuthoredCheck.canRepresentMovementTechnique).toBe(true);
  });

  it('distinguishes pre-review, post-review (instructor-reviewed), and stale recheck states across the catalog', () => {
    expect(CATALOG_VISUAL_SOURCE_COMPARISONS).toHaveLength(98);

    const sampleExercise = INITIAL_EXERCISES[0];
    const preReviewAudit = getVisualSourceComparison(sampleExercise);
    expect(preReviewAudit.isPostReview).toBe(false);
    expect(preReviewAudit.reviewStage).toBe('source-compared-pre-review');
    expect(preReviewAudit.anatomicalAccuracyAssumed).toBe(false);
    expect(preReviewAudit.professionalMotionReviewCount).toBe(0);
    expect(preReviewAudit.matchedReliableSources.length).toBeGreaterThan(0);
    expect(preReviewAudit.preToPostReviewChecklistKo).toHaveLength(4);

    const approvedExercise: PilatesExercise = {
      ...sampleExercise,
      review: {
        status: 'approved',
        scope: 'planning-metadata',
        credentialVerified: false,
        reviewerAlias: '김원장',
        reviewedAt: '2026-11-06T08:00:00.000Z',
        revision: exerciseRevision(sampleExercise),
      },
    };
    const postReviewAudit = getVisualSourceComparison(approvedExercise);
    expect(postReviewAudit.reviewStage).toBe('instructor-reviewed');
    expect(postReviewAudit.isPostReview).toBe(true);
    expect(postReviewAudit.reviewBadgeKo).toContain('검토 후');
    expect(postReviewAudit.professionalMotionReviewCount).toBe(0);

    const staleExercise: PilatesExercise = {
      ...approvedExercise,
      cues: [...sampleExercise.cues, '수정된 큐잉으로 인한 재검토 필요 상태'],
    };
    const staleAudit = getVisualSourceComparison(staleExercise);
    expect(staleAudit.reviewStage).toBe('stale-recheck-required');
    expect(staleAudit.isPostReview).toBe(false);
    expect(staleAudit.reviewBadgeKo).toContain('재검토 필요');
  });

  it('compares movement differences across 7 dimensions for all 20 curated pairs and arbitrary catalog pairs', () => {
    expect(CURATED_MOVEMENT_DIFFERENCE_PAIRS.length).toBeGreaterThanOrEqual(20);
    for (const pair of CURATED_MOVEMENT_DIFFERENCE_PAIRS) {
      expect(pair.dimensions).toHaveLength(7);
      expect(pair.dimensions.map((d) => d.dimensionKey)).toEqual([
        'start-pose',
        'middle-peak-pose',
        'end-return-pose',
        'joint-alignment',
        'movement-direction',
        'primary-muscles',
        'apparatus-support',
      ]);
      expect(pair.teachingDistinctionTipKo.trim().length).toBeGreaterThan(0);
    }

    const peers = getRecommendedComparisonPeers('original-mat-bridge');
    expect(peers.length).toBeGreaterThanOrEqual(2);
    const dynamicComparison = compareCatalogMovements(INITIAL_EXERCISES[0], peers[0]);
    expect(dynamicComparison.dimensions).toHaveLength(7);
  });
});

describe('MovementPhaseDiagramSvg & MovementVisualGuideCard rendering and mobile readability', () => {
  it('renders zero internal SVG <text> nodes for mobile 320px / 200% zoom safety while preserving all 6 semantic layers and anatomical left/right sides', () => {
    const exercise = INITIAL_EXERCISES.find((item) => item.id === 'ex-footwork-01')!;
    const asset = buildMovementVisualAssetForExercise(exercise);

    for (const phase of ['start', 'middle', 'end'] as const) {
      for (const mirrored of [false, true]) {
        const markup = renderToStaticMarkup(
          <MovementPhaseDiagramSvg
            asset={asset}
            phase={phase}
            activeSide="left"
            mirrored={mirrored}
          />,
        );
        const doc = new DOMParser().parseFromString(markup, 'text/html');
        const svg = doc.querySelector('svg')!;
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('viewBox')).toBe('0 0 320 200');
        expect(svg.getAttribute('data-exercise-id')).toBe(exercise.id);
        expect(svg.getAttribute('data-phase')).toBe(phase);
        expect(svg.getAttribute('data-view-mirrored')).toBe(String(mirrored));
        expect(svg.getAttribute('data-anatomical-accuracy-assumed')).toBe('false');
        expect(svg.querySelectorAll('text')).toHaveLength(0);
        expect(svg.querySelector('title')?.textContent?.trim().length).toBeGreaterThan(0);
        expect(svg.querySelector('desc')?.textContent?.trim().length).toBeGreaterThan(0);

        expect(svg.querySelector('[data-layer="apparatus-support"]')).not.toBeNull();
        expect(svg.querySelector('[data-layer="primary-muscles"]')).not.toBeNull();
        expect(svg.querySelector('[data-layer="kinematic-figure"]')).not.toBeNull();
        expect(svg.querySelector('[data-layer="joint-alignment"]')).not.toBeNull();
        expect(svg.querySelector('[data-layer="movement-direction"]')).not.toBeNull();

        if (phase !== 'start') {
          expect(svg.querySelector('[data-layer="pose-delta-ghost"]')).not.toBeNull();
          expect(svg.querySelectorAll('[data-pose-delta-vector]').length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('renders MovementVisualGuideCard with 44px mobile touch controls, layer toggles, pre/post review states, and movement difference comparison', () => {
    const preReviewExercise = INITIAL_EXERCISES.find(
      (item) => item.id === 'original-mat-chest-lift',
    )!;
    const { rerender } = render(<MovementVisualGuideCard exercise={preReviewExercise} />);

    const card = screen.getByTestId('movement-visual-guide-card');
    expect(card).toHaveAttribute('data-exercise-id', preReviewExercise.id);
    expect(card).toHaveAttribute('data-review-stage', 'source-compared-pre-review');
    expect(card).toHaveAttribute('data-is-post-review', 'false');
    expect(card).toHaveAttribute('data-anatomical-accuracy-assumed', 'false');

    // Verify all 4 detail panels exist and are readable
    expect(screen.getByTestId('visual-panel-phases')).toBeInTheDocument();
    expect(screen.getByTestId('visual-panel-alignments')).toBeInTheDocument();
    expect(screen.getByTestId('visual-panel-directions')).toBeInTheDocument();
    expect(screen.getByTestId('visual-panel-muscles')).toBeInTheDocument();

    // Verify 44px touch target minimum height on mode tabs and layer toggle buttons
    const modeTabs = within(
      screen.getByRole('tablist', { name: '동작 시각 자료 보기 방식' }),
    ).getAllByRole('tab');
    expect(modeTabs).toHaveLength(3);
    for (const tab of modeTabs) {
      expect((tab as HTMLElement).style.minHeight).toBe('44px');
    }

    const layerButtons = within(
      screen.getByRole('group', { name: '시각 도해 표시 레이어' }),
    ).getAllByRole('button');
    expect(layerButtons.length).toBeGreaterThanOrEqual(6);
    for (const btn of layerButtons) {
      expect((btn as HTMLElement).style.minHeight).toBe('44px');
    }

    // Toggle alignment layer off and back on
    const alignmentBtn = screen.getByRole('button', { name: /관절 정렬선/ });
    expect(alignmentBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(alignmentBtn);
    expect(alignmentBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(alignmentBtn);
    expect(alignmentBtn).toHaveAttribute('aria-pressed', 'true');

    // Switch to single-phase focus mode and select start/middle/end
    fireEvent.click(screen.getByRole('tab', { name: /단계별 확대 보기/ }));
    expect(screen.getByTestId('single-phase-focus-container')).toBeInTheDocument();

    // Switch to difference comparison mode
    fireEvent.click(screen.getByRole('tab', { name: /유사 동작과 차이 비교/ }));
    const compareView = screen.getByTestId('movement-difference-compare-view');
    expect(compareView).toBeInTheDocument();
    expect(compareView.querySelectorAll('[data-dimension-key]')).toHaveLength(7);

    // Rerender with post-review approved exercise
    const approvedExercise: PilatesExercise = {
      ...preReviewExercise,
      review: {
        status: 'approved',
        scope: 'planning-metadata',
        credentialVerified: false,
        reviewerAlias: '박강사',
        reviewedAt: '2026-11-06T09:00:00.000Z',
        revision: exerciseRevision(preReviewExercise),
      },
    };
    rerender(<MovementVisualGuideCard exercise={approvedExercise} />);
    expect(screen.getByTestId('movement-visual-guide-card')).toHaveAttribute(
      'data-review-stage',
      'instructor-reviewed',
    );
    expect(screen.getByTestId('movement-visual-guide-card')).toHaveAttribute(
      'data-is-post-review',
      'true',
    );

    // Rerender with quarantined AI-generated raster override
    rerender(
      <MovementVisualGuideCard
        exercise={preReviewExercise}
        overrideAssetSource={{ productionMethod: 'ai-generated-raster' }}
      />,
    );
    expect(screen.getByTestId('visual-integrity-quarantine-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('visual-diagram-viewport')).toBeNull();
  });

  it('renders standalone MovementTriptychDiagramSvg and MovementDifferenceCompareView cleanly', () => {
    const left = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-heel-slide')!;
    const right = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-knee-fold')!;
    const asset = buildMovementVisualAssetForExercise(left);

    const { unmount } = render(<MovementTriptychDiagramSvg asset={asset} selectedPhase="middle" />);
    expect(screen.getByTestId('movement-triptych-diagram')).toBeInTheDocument();
    unmount();

    render(<MovementDifferenceCompareView leftExercise={left} rightExercise={right} />);
    expect(screen.getByTestId('movement-difference-compare-view')).toHaveTextContent(
      '매트 힐 슬라이드 vs 매트 니 폴드',
    );
  });
});
