import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { CoreAbdominalDiagramFigure } from '../components/CoreAbdominalDiagramFigure';
import { MovementDiagramReference } from '../components/MovementDiagramReference';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../components/MovementPhaseDiagramSvg';
import { MovementVisualGuideCard } from '../components/MovementVisualGuideCard';
import { SpineArticulationDiagramReference } from '../components/SpineArticulationDiagramReference';
import { MOVEMENT_DIAGRAM_CORRECTIONS } from '../data/movementDiagramCorrections';
import {
  calculatePhaseJointDelta,
  getMovementVisualAsset,
  MOVEMENT_VISUAL_ASSETS,
} from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';

afterEach(() => {
  cleanup();
});

const TRACK_STANDALONE_AND_CATALOG_IDS = [
  // Track I1 Spine Articulation
  'spine-roll-up',
  'spine-roll-down',
  'spine-stretch',
  'original-mat-roll-up-prep',
  'original-mat-chest-lift',
  'ex-cooldown-02',
  'original-cadillac-seated-roll-back',
  'original-mat-spine-stretch-forward',
  'original-barrel-seated-spine-reach',
  // Track I2 Pelvis & Hip
  'pelvis-mat-pelvic-curl',
  'original-mat-bridge',
  'pelvis-mat-shoulder-bridge',
  'original-reformer-supported-bridge',
  'ex-bridging-01',
  'ex-bridging-02',
  'original-cadillac-table-bridge',
  // Track I3 Hip & Leg
  'hip-leg-single-leg-circle',
  'hip-leg-side-kick',
  'ex-straps-02',
  'ex-kr-cadillac-02',
  'ex-lower-04',
  // Track I4 Core Abdominal
  'core-hundred',
  'core-single-leg-stretch',
  'core-double-leg-stretch',
  'ex-core-01',
  'original-mat-hundred-prep',
  'original-mat-single-leg-stretch',
  'ex-core-02',
  'ex-core-03',
  // Track I5 Extension
  'original-mat-swan-prep',
  'original-mat-swimming-prep',
  'extension-mat-swimming-alternating',
  'original-reformer-box-swan-prep',
  'ex-extension-01',
  'original-cadillac-prone-back-reach',
  'original-barrel-supported-swan',
  'ex-extension-02',
  // Track I6 Shoulder Support
  'shoulder-support-push-up',
  'shoulder-support-leg-pull-front',
  'plank-support',
  'original-mat-plank-prep',
  'original-mat-forearm-plank',
  // Track I8 Rotation
  'rotation-mat-saw',
  'rotation-mat-spine-twist',
  'rotation-mat-criss-cross',
  'original-mat-spine-twist',
  'ex-rotation-01',
  'original-mat-saw',
  'original-mat-criss-cross',
] as const;

describe('Track I7 Shared Diagram Registry & Cross-Track Integration (I1–I8)', () => {
  it('resolves all Track I1–I6 and I8 movement IDs via getMovementVisualAsset and renders valid phase/triptych SVGs', () => {
    expect(MOVEMENT_VISUAL_ASSETS).toHaveLength(INITIAL_EXERCISES.length);

    for (const id of TRACK_STANDALONE_AND_CATALOG_IDS) {
      const asset = getMovementVisualAsset(id);
      expect(asset, `Missing visual asset for ${id}`).not.toBeNull();
      expect(asset!.anatomicalAccuracyAssumed).toBe(false);
      expect(asset!.productionMethod).toBe('free-authored-kinematic-svg-v1');
      expect(asset!.rightsStatus).toBe('original-app-authored-free-license');
      expect(calculatePhaseJointDelta(asset!).maxDeltaPx).toBeGreaterThan(0);

      for (const phase of ['start', 'middle', 'end'] as const) {
        const markup = renderToStaticMarkup(
          <MovementPhaseDiagramSvg asset={asset!} phase={phase} />,
        );
        const doc = new DOMParser().parseFromString(markup, 'text/html');
        const svg = doc.querySelector('svg')!;
        expect(svg).not.toBeNull();
        for (const label of svg.querySelectorAll('text')) {
          expect(label.closest('[data-prop-placement="setup-reference"]')).not.toBeNull();
          expect(label.textContent).toBe('도구 참고');
        }
        expect(svg.querySelectorAll('circle[data-joint-node]')).toHaveLength(7);
        // A kneeling forearm support is a hold with a small breathing change,
        // not a large push-up. Its support contacts have separate regressions.
        if (phase !== 'start' && id !== 'original-mat-forearm-plank') {
          expect(
            svg.querySelectorAll('[data-pose-delta-vector]').length,
            `Expected pose-delta-vector on ${id} phase=${phase}`,
          ).toBeGreaterThan(0);
        }
      }

      const triptychMarkup = renderToStaticMarkup(<MovementTriptychDiagramSvg asset={asset!} />);
      expect(triptychMarkup).toContain('data-testid="movement-triptych-diagram"');
    }
  });

  it('registers MovementDiagramCorrection entries for all integrated tracks with truthfulness metadata and matching archetypeIds', () => {
    for (const id of TRACK_STANDALONE_AND_CATALOG_IDS) {
      const correction = MOVEMENT_DIAGRAM_CORRECTIONS[id];
      const asset = getMovementVisualAsset(id)!;
      expect(correction, `Missing correction for ${id}`).toBeDefined();
      expect(correction.professionalReviewCount).toBe(0);
      expect(correction.sourceFrameMappings).toBe(0);
      expect(correction.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(correction.reviewedScopeKo.trim().length).toBeGreaterThan(10);
      expect(correction.correctionKo.trim().length).toBeGreaterThan(10);
      expect(correction.limitationKo.trim().length).toBeGreaterThan(10);
      expect(correction.sources.length).toBeGreaterThanOrEqual(1);
      expect(correction.archetypeId).toBe(asset.archetypeId);
    }
  });

  it('does not offer standalone mat rotation details for equipment variants or a whole series', () => {
    const mismatchedIds = ['ex-core-02', 'ex-core-03', 'ex-cooldown-01', 'ex-warmup-02', 'ex-kr-reformer-04', 'original-mat-open-book', 'original-chair-seated-spine-twist', 'original-cadillac-seated-rotation', 'original-barrel-standing-rotation'];
    for (const exerciseId of mismatchedIds) {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === exerciseId)!;
      expect(exercise, `Missing catalog exercise ${exerciseId}`).toBeDefined();
      const { unmount } = render(<MovementDiagramReference exercise={exercise} />);
      const details = screen.getByText('참고 자세 그림').closest('details')!;
      details.open = true;
      fireEvent(details, new Event('toggle'));
      expect(screen.queryByText('흉추 회전·골반 고정 3단계 상세 도해 보기')).not.toBeInTheDocument();
      unmount();
    }
  });

  it('renders source-comparison disclosures for matching catalog representatives', () => {
    const representativeCatalogIds = [
      'original-mat-chest-lift', // I1 Spine
      'original-mat-bridge', // I2 Pelvis/Hip
      'ex-straps-02', // I3 Hip/Leg
      'ex-core-01', // I4 Core
      'original-mat-swan-prep', // I5 Extension
      'original-mat-forearm-plank', // I6 Shoulder Support
    ] as const;

    for (const exerciseId of representativeCatalogIds) {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === exerciseId)!;
      expect(exercise, `Missing catalog exercise ${exerciseId}`).toBeDefined();

      const { unmount } = render(<MovementDiagramReference exercise={exercise} />);
      const summary = screen.getByText('참고 자세 그림');
      const details = summary.closest('details')!;
      details.open = true;
      fireEvent(details, new Event('toggle'));

      const region = screen.getByRole('region', { name: '참고 자세 정지 그림' });
      expect(within(region).getByText('출처 대조 기록')).toBeInTheDocument();
      const links = within(region).getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(1);
      unmount();
    }
  });

  it('mounts matching specialized diagram components lazily when their disclosures are opened', () => {
    const trackDisclosures = [
      {
        exerciseId: 'original-cadillac-seated-roll-back',
        disclosureTestId: 'movement-diagram-spine-disclosure',
        mountedTestId: 'spine-articulation-diagram-reference',
      },
      {
        exerciseId: 'original-mat-bridge',
        disclosureTestId: 'movement-diagram-pelvis-disclosure',
        mountedTestId: 'pelvis-hip-integration-examples',
      },
      {
        exerciseId: 'ex-straps-02',
        disclosureTestId: 'movement-diagram-hip-leg-disclosure',
        mountedTestId: 'hip-leg-diagram-figure',
      },
      {
        exerciseId: 'ex-core-01',
        disclosureTestId: 'movement-diagram-core-disclosure',
        mountedTestId: 'core-abdominal-diagram-figure',
      },
      {
        exerciseId: 'original-mat-swan-prep',
        disclosureTestId: 'movement-diagram-extension-disclosure',
        mountedTestId: 'extension-movement-triptych',
      },
    ] as const;

    for (const { exerciseId, disclosureTestId, mountedTestId } of trackDisclosures) {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === exerciseId)!;
      expect(exercise, `Missing catalog exercise ${exerciseId}`).toBeDefined();

      const { unmount } = render(<MovementDiagramReference exercise={exercise} />);
      const outerDetails = screen.getByText('참고 자세 그림').closest('details')!;
      outerDetails.open = true;
      fireEvent(outerDetails, new Event('toggle'));

      const trackDetails = screen.getByTestId(disclosureTestId) as HTMLDetailsElement;
      expect(screen.queryByTestId(mountedTestId)).not.toBeInTheDocument();

      trackDetails.open = true;
      fireEvent(trackDetails, new Event('toggle'));

      expect(screen.getByTestId(mountedTestId)).toBeInTheDocument();
      unmount();
    }
  });

  it('does not offer seated roll-back or hand push-up details for differently supported catalog exercises', () => {
    for (const [id, disclosure] of [
      ['ex-cooldown-02', 'movement-diagram-spine-disclosure'],
      ['original-mat-forearm-plank', 'movement-diagram-shoulder-disclosure'],
    ] as const) {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === id)!;
      const { unmount } = render(<MovementDiagramReference exercise={exercise} />);
      const details = screen.getByText('참고 자세 그림').closest('details')!;
      details.open = true;
      fireEvent(details, new Event('toggle'));
      expect(screen.queryByTestId(disclosure)).not.toBeInTheDocument();
      unmount();
    }
  });

  it('renders truthful unmapped message and provides lazy fallback MovementVisualGuideCard disclosure for custom exercises', () => {
    const baseExercise = INITIAL_EXERCISES[0];
    const customExercise: PilatesExercise = {
      ...baseExercise,
      id: 'ex-custom-own-test-01',
      nameKo: '사용자 커스텀 리포머 동작',
      nameEn: 'Custom Reformer Exercise',
    };

    render(<MovementDiagramReference exercise={customExercise} />);
    const outerDetails = screen.getByText('참고 자세 그림').closest('details')!;
    outerDetails.open = true;
    fireEvent(outerDetails, new Event('toggle'));

    expect(
      screen.getByText('이 동작과 일치하는 도해가 아직 없어요. 다른 동작의 그림으로 대신하지 않아요.'),
    ).toBeInTheDocument();

    const fallbackDetails = screen.getByTestId(
      'movement-diagram-fallback-disclosure',
    ) as HTMLDetailsElement;
    expect(screen.queryByTestId('movement-visual-guide-card')).not.toBeInTheDocument();

    fallbackDetails.open = true;
    fireEvent(fallbackDetails, new Event('toggle'));

    expect(screen.getByTestId('movement-visual-guide-card')).toBeInTheDocument();
  });

  it('supports WAI-ARIA tablist keyboard navigation (ArrowRight, ArrowLeft, Home, End, roving tabIndex) across diagram components', () => {
    const exercise = INITIAL_EXERCISES[0];
    const { unmount: unmountGuide } = render(<MovementVisualGuideCard exercise={exercise} />);

    const stripTab = screen.getByTestId('view-mode-tab-three-phase-strip');
    const singleTab = screen.getByTestId('view-mode-tab-single-phase-focus');
    const compareTab = screen.getByTestId('view-mode-tab-difference-compare');

    expect(stripTab).toHaveAttribute('tabindex', '0');
    expect(singleTab).toHaveAttribute('tabindex', '-1');
    expect(compareTab).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(stripTab, { key: 'ArrowRight' });
    expect(singleTab).toHaveAttribute('aria-selected', 'true');
    expect(singleTab).toHaveAttribute('tabindex', '0');
    expect(document.activeElement).toBe(singleTab);

    fireEvent.keyDown(singleTab, { key: 'End' });
    expect(compareTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(compareTab);

    fireEvent.keyDown(compareTab, { key: 'Home' });
    expect(stripTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(stripTab);

    fireEvent.keyDown(stripTab, { key: 'ArrowLeft' });
    expect(compareTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(compareTab);

    unmountGuide();

    const { unmount: unmountSpine } = render(<SpineArticulationDiagramReference />);
    const rollUpTab = screen.getByTestId('spine-archetype-tab-spine-roll-up');
    const rollDownTab = screen.getByTestId('spine-archetype-tab-spine-roll-down');
    const stretchTab = screen.getByTestId('spine-archetype-tab-spine-stretch');

    expect(rollUpTab).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(rollUpTab, { key: 'ArrowRight' });
    expect(rollDownTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(rollDownTab);

    fireEvent.keyDown(rollDownTab, { key: 'End' });
    expect(stretchTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(stretchTab);

    const spineStartTab = screen.getByTestId('spine-phase-tab-start');
    const spineMiddleTab = screen.getByTestId('spine-phase-tab-middle');
    const spineEndTab = screen.getByTestId('spine-phase-tab-end');

    fireEvent.keyDown(spineStartTab, { key: 'ArrowRight' });
    expect(spineMiddleTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(spineMiddleTab);

    fireEvent.keyDown(spineMiddleTab, { key: 'ArrowLeft' });
    expect(spineStartTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(spineStartTab);

    fireEvent.keyDown(spineStartTab, { key: 'End' });
    expect(spineEndTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(spineEndTab);

    unmountSpine();

    const { unmount: unmountCore } = render(<CoreAbdominalDiagramFigure />);
    const hundredTab = screen.getByTestId('core-movement-tab-core-hundred');
    const slsTab = screen.getByTestId('core-movement-tab-core-single-leg-stretch');
    const dlsTab = screen.getByTestId('core-movement-tab-core-double-leg-stretch');

    expect(hundredTab).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(hundredTab, { key: 'ArrowRight' });
    expect(slsTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(slsTab);

    fireEvent.keyDown(slsTab, { key: 'End' });
    expect(dlsTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(dlsTab);

    fireEvent.keyDown(dlsTab, { key: 'Home' });
    expect(hundredTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(hundredTab);

    const coreStartTab = screen.getByTestId('core-phase-tab-start');
    const coreMiddleTab = screen.getByTestId('core-phase-tab-middle');
    const coreEndTab = screen.getByTestId('core-phase-tab-end');

    expect(coreMiddleTab).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(coreMiddleTab, { key: 'ArrowRight' });
    expect(coreEndTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(coreEndTab);

    fireEvent.keyDown(coreEndTab, { key: 'Home' });
    expect(coreStartTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(coreStartTab);

    unmountCore();
  });
});
