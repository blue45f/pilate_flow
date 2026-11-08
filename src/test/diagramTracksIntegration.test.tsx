import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { MovementDiagramReference } from '../components/MovementDiagramReference';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../components/MovementPhaseDiagramSvg';
import { MOVEMENT_DIAGRAM_CORRECTIONS } from '../data/movementDiagramCorrections';
import {
  calculatePhaseJointDelta,
  getMovementVisualAsset,
  MOVEMENT_VISUAL_ASSETS,
} from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';

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
  'ex-cooldown-01',
  'ex-kr-reformer-04',
] as const;

describe('Track I7 Shared Diagram Registry & Cross-Track Integration (I1–I8)', () => {
  it('resolves all Track I1–I6 and I8 movement IDs via getMovementVisualAsset and renders valid phase/triptych SVGs', () => {
    expect(MOVEMENT_VISUAL_ASSETS).toHaveLength(98);

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
        expect(svg.querySelectorAll('text')).toHaveLength(0);
        expect(svg.querySelectorAll('circle[data-joint-node]')).toHaveLength(7);
        if (phase !== 'start') {
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
      expect(correction.checkedAt).toBe('2026-11-06');
      expect(correction.reviewedScopeKo.trim().length).toBeGreaterThan(10);
      expect(correction.correctionKo.trim().length).toBeGreaterThan(10);
      expect(correction.limitationKo.trim().length).toBeGreaterThan(10);
      expect(correction.sources.length).toBeGreaterThanOrEqual(1);
      expect(correction.archetypeId).toBe(asset.archetypeId);
    }
  });

  it('renders MovementDiagramReference source-comparison disclosures across all 7 integrated tracks', () => {
    const representativeCatalogIds = [
      'original-mat-chest-lift', // I1 Spine
      'original-mat-bridge', // I2 Pelvis/Hip
      'ex-straps-02', // I3 Hip/Leg
      'ex-core-01', // I4 Core
      'original-mat-swan-prep', // I5 Extension
      'original-mat-forearm-plank', // I6 Shoulder Support
      'ex-cooldown-01', // I8 Rotation
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
});
