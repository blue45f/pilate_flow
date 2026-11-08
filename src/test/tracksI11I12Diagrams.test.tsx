import { createHash } from 'node:crypto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LateralAndApparatusDiagramFigure } from '../components/LateralAndApparatusDiagramFigure';
import { UpperBodyArmDiagramFigure } from '../components/UpperBodyArmDiagramFigure';
import {
  getLateralAndApparatusDiagramCorrections,
  LATERAL_AND_APPARATUS_CATALOG_EXERCISE_IDS,
  LATERAL_AND_APPARATUS_DIAGRAM_IDS,
  LATERAL_AND_APPARATUS_SOURCE_LEDGER,
  resolveLateralAndApparatusDiagram,
} from '../data/lateralAndApparatusDiagramData';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  getUpperBodyArmDiagramCorrections,
  resolveUpperBodyArmDiagram,
  UPPER_BODY_ARM_CATALOG_EXERCISE_IDS,
  UPPER_BODY_ARM_DIAGRAM_IDS,
  UPPER_BODY_ARM_SOURCE_LEDGER,
} from '../data/upperBodyArmDiagramData';

afterEach(() => {
  cleanup();
});

const TRACK_I11_EXPECTED_GROUPS: Readonly<Record<string, readonly string[]>> = {
  'supine-and-standing-strap-press': [
    'original-reformer-supine-arm-press',
    'original-cadillac-arm-spring-press',
    'original-barrel-supported-arm-reach',
    'ex-upper-01',
    'ex-kr-reformer-03',
  ],
  'seated-row-and-band-retraction': [
    'original-reformer-seated-row',
    'original-mat-band-row',
    'ex-upper-02',
    'ex-global-reformer-03',
  ],
  'kneeling-chest-expansion-and-chair-arm-arc': [
    'original-chair-seated-arm-arc',
    'original-mat-seated-arm-reach',
    'original-chair-seated-back-reach',
    'ex-upper-03',
  ],
};

const TRACK_I12_EXPECTED_GROUPS: Readonly<Record<string, readonly string[]>> = {
  'lateral-mermaid-and-barrel-side-bend': [
    'original-barrel-supported-side-bend',
    'original-barrel-standing-side-stretch',
    'original-cadillac-seated-side-reach',
    'original-chair-seated-mermaid',
    'original-mat-mermaid',
    'ex-cooldown-01',
    'ex-kr-barrel-01',
  ],
  'apparatus-and-side-lying-thoracic-rotation': [
    'original-barrel-standing-rotation',
    'original-chair-seated-spine-twist',
    'original-cadillac-seated-rotation',
    'original-mat-open-book',
  ],
  'supine-tabletop-knee-fold-and-reverse-curl': [
    'original-mat-heel-slide',
    'original-cadillac-table-knee-fold',
    'original-chair-seated-knee-lift',
    'original-mat-knee-fold',
    'ex-core-04',
    'ex-kr-reformer-04',
  ],
  'quadruped-and-apparatus-plank-pike': [
    'original-cadillac-quadruped-slide',
    'original-chair-incline-support',
    'original-mat-quadruped-reach',
    'ex-plank-01',
    'ex-plank-02',
    'ex-kr-chair-01',
  ],
};

describe('Track I11 & Track I12 — Upper-Body Arm & Lateral/Apparatus 2D Diagrams', () => {
  it('verifies Track I11 source ledger SHA-256 hashes, truthfulness invariants, and all 13 catalog exercise mappings', () => {
    expect(UPPER_BODY_ARM_SOURCE_LEDGER.trackId).toBe('I11-upper-body-strap-row-arm-arc');
    expect(UPPER_BODY_ARM_SOURCE_LEDGER.checkedAt).toBe('2026-11-08');
    expect(UPPER_BODY_ARM_SOURCE_LEDGER.anatomicalAccuracyAssumed).toBe(false);
    expect(UPPER_BODY_ARM_SOURCE_LEDGER.professionalReviewCount).toBe(0);
    expect(UPPER_BODY_ARM_SOURCE_LEDGER.sourceFrameMappings).toBe(0);
    expect(UPPER_BODY_ARM_SOURCE_LEDGER.entries).toHaveLength(3);
    expect(UPPER_BODY_ARM_CATALOG_EXERCISE_IDS).toHaveLength(13);

    for (const entry of UPPER_BODY_ARM_SOURCE_LEDGER.entries) {
      expect(entry.anatomicalAccuracyAssumed).toBe(false);
      expect(entry.professionalReviewCount).toBe(0);
      expect(entry.sourceFrameMappings).toBe(0);
      expect(entry.factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      const computedSha = createHash('sha256')
        .update(JSON.stringify(entry.factualRecord))
        .digest('hex');
      expect(computedSha).toBe(entry.factualRecordSha256);
    }

    const corrections = getUpperBodyArmDiagramCorrections();

    for (const diagramId of UPPER_BODY_ARM_DIAGRAM_IDS) {
      const spec = resolveUpperBodyArmDiagram(diagramId);
      expect(spec).not.toBeNull();
      expect(spec!.id).toBe(diagramId);
      expect(spec!.asset.anatomicalAccuracyAssumed).toBe(false);
      expect(spec!.mappedExerciseIds).toEqual(TRACK_I11_EXPECTED_GROUPS[diagramId]);
      expect(corrections[diagramId]).toBeDefined();
      expect(corrections[diagramId].professionalReviewCount).toBe(0);
      expect(corrections[diagramId].sourceFrameMappings).toBe(0);

      for (const exerciseId of TRACK_I11_EXPECTED_GROUPS[diagramId]) {
        const catalogEx = INITIAL_EXERCISES.find((e) => e.id === exerciseId);
        expect(catalogEx, `Missing catalog exercise ${exerciseId}`).toBeDefined();
        const resolved = resolveUpperBodyArmDiagram(exerciseId);
        expect(resolved).not.toBeNull();
        expect(resolved!.id).toBe(diagramId);

        const correction = corrections[exerciseId];
        expect(correction, `Missing correction for ${exerciseId}`).toBeDefined();
        expect(correction.professionalReviewCount).toBe(0);
        expect(correction.sourceFrameMappings).toBe(0);
        expect(correction.checkedAt).toBe('2026-11-08');
        expect(correction.sources.length).toBeGreaterThanOrEqual(2);

        const catalogAsset = getMovementVisualAsset(exerciseId);
        expect(correction.archetypeId).toBe(catalogAsset?.archetypeId ?? spec!.archetypeId);
      }
    }
  });

  it('verifies Track I12 source ledger SHA-256 hashes, truthfulness invariants, and all 23 catalog exercise mappings', () => {
    expect(LATERAL_AND_APPARATUS_SOURCE_LEDGER.trackId).toBe(
      'I12-lateral-rotation-tabletop-plank',
    );
    expect(LATERAL_AND_APPARATUS_SOURCE_LEDGER.checkedAt).toBe('2026-11-08');
    expect(LATERAL_AND_APPARATUS_SOURCE_LEDGER.anatomicalAccuracyAssumed).toBe(false);
    expect(LATERAL_AND_APPARATUS_SOURCE_LEDGER.professionalReviewCount).toBe(0);
    expect(LATERAL_AND_APPARATUS_SOURCE_LEDGER.sourceFrameMappings).toBe(0);
    expect(LATERAL_AND_APPARATUS_SOURCE_LEDGER.entries).toHaveLength(4);
    expect(LATERAL_AND_APPARATUS_CATALOG_EXERCISE_IDS).toHaveLength(23);

    for (const entry of LATERAL_AND_APPARATUS_SOURCE_LEDGER.entries) {
      expect(entry.anatomicalAccuracyAssumed).toBe(false);
      expect(entry.professionalReviewCount).toBe(0);
      expect(entry.sourceFrameMappings).toBe(0);
      expect(entry.factualRecordSha256).toMatch(/^[a-f0-9]{64}$/);
      const computedSha = createHash('sha256')
        .update(JSON.stringify(entry.factualRecord))
        .digest('hex');
      expect(computedSha).toBe(entry.factualRecordSha256);
    }

    const corrections = getLateralAndApparatusDiagramCorrections();

    for (const diagramId of LATERAL_AND_APPARATUS_DIAGRAM_IDS) {
      const spec = resolveLateralAndApparatusDiagram(diagramId);
      expect(spec).not.toBeNull();
      expect(spec!.id).toBe(diagramId);
      expect(spec!.asset.anatomicalAccuracyAssumed).toBe(false);
      expect(spec!.mappedExerciseIds).toEqual(TRACK_I12_EXPECTED_GROUPS[diagramId]);
      expect(corrections[diagramId]).toBeDefined();
      expect(corrections[diagramId].professionalReviewCount).toBe(0);
      expect(corrections[diagramId].sourceFrameMappings).toBe(0);

      for (const exerciseId of TRACK_I12_EXPECTED_GROUPS[diagramId]) {
        const catalogEx = INITIAL_EXERCISES.find((e) => e.id === exerciseId);
        expect(catalogEx, `Missing catalog exercise ${exerciseId}`).toBeDefined();
        const resolved = resolveLateralAndApparatusDiagram(exerciseId);
        expect(resolved).not.toBeNull();
        expect(resolved!.id).toBe(diagramId);

        const correction = corrections[exerciseId];
        expect(correction, `Missing correction for ${exerciseId}`).toBeDefined();
        expect(correction.professionalReviewCount).toBe(0);
        expect(correction.sourceFrameMappings).toBe(0);
        expect(correction.checkedAt).toBe('2026-11-08');
        expect(correction.sources.length).toBeGreaterThanOrEqual(2);

        const catalogAsset = getMovementVisualAsset(exerciseId);
        expect(correction.archetypeId).toBe(catalogAsset?.archetypeId ?? spec!.archetypeId);
      }
    }
  });

  it('renders UpperBodyArmDiagramFigure and supports phase/group switching via click and keyboard (ArrowRight, ArrowLeft, Home, End)', () => {
    render(
      <UpperBodyArmDiagramFigure
        exerciseId="original-reformer-seated-row"
        initialPhase="middle"
      />,
    );

    const figure = screen.getByTestId('upper-body-arm-diagram-figure');
    expect(figure).toBeInTheDocument();
    expect(figure).toHaveAttribute('data-diagram-id', 'seated-row-and-band-retraction');
    expect(figure).toHaveAttribute('data-phase', 'middle');
    expect(figure).toHaveAttribute('data-anatomical-accuracy-assumed', 'false');
    expect(figure).toHaveAttribute('data-professional-review-count', '0');

    // Verify 3-phase SVGs and vector arrows are rendered
    for (const phase of ['start', 'middle', 'end'] as const) {
      expect(
        screen.getByTestId(
          `upper-body-arm-phase-svg-seated-row-and-band-retraction-${phase}`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`upper-body-vectors-seated-row-and-band-retraction-${phase}`),
      ).toBeInTheDocument();
    }

    // Phase switching via click and keyboard
    const startTab = screen.getByTestId('upper-body-phase-tab-start');
    const middleTab = screen.getByTestId('upper-body-phase-tab-middle');
    const endTab = screen.getByTestId('upper-body-phase-tab-end');

    fireEvent.click(startTab);
    expect(figure).toHaveAttribute('data-phase', 'start');
    expect(startTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(startTab, { key: 'ArrowRight' });
    expect(figure).toHaveAttribute('data-phase', 'middle');
    expect(middleTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(middleTab, { key: 'End' });
    expect(figure).toHaveAttribute('data-phase', 'end');
    expect(endTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(endTab, { key: 'Home' });
    expect(figure).toHaveAttribute('data-phase', 'start');

    fireEvent.keyDown(startTab, { key: 'ArrowLeft' });
    expect(figure).toHaveAttribute('data-phase', 'end');

    // Group tablist keyboard navigation
    const rowGroupTab = screen.getByTestId(
      'upper-body-group-tab-seated-row-and-band-retraction',
    );
    fireEvent.keyDown(rowGroupTab, { key: 'ArrowRight' });
    expect(figure).toHaveAttribute(
      'data-diagram-id',
      'kneeling-chest-expansion-and-chair-arm-arc',
    );

    const sourceSummary = screen.getByTestId('upper-body-source-verification-summary');
    expect(sourceSummary).toHaveTextContent('anatomicalAccuracyAssumed: false');
    expect(sourceSummary).toHaveTextContent('professionalReviewCount: 0');
  });

  it('renders LateralAndApparatusDiagramFigure and supports phase/group switching via click and keyboard (ArrowRight, ArrowLeft, Home, End)', () => {
    render(
      <LateralAndApparatusDiagramFigure
        exerciseId="original-mat-open-book"
        initialPhase="middle"
      />,
    );

    const figure = screen.getByTestId('lateral-apparatus-diagram-figure');
    expect(figure).toBeInTheDocument();
    expect(figure).toHaveAttribute(
      'data-diagram-id',
      'apparatus-and-side-lying-thoracic-rotation',
    );
    expect(figure).toHaveAttribute('data-phase', 'middle');
    expect(figure).toHaveAttribute('data-anatomical-accuracy-assumed', 'false');
    expect(figure).toHaveAttribute('data-professional-review-count', '0');

    // Verify 3-phase SVGs are rendered
    for (const phase of ['start', 'middle', 'end'] as const) {
      expect(
        screen.getByTestId(
          `lateral-apparatus-phase-svg-apparatus-and-side-lying-thoracic-rotation-${phase}`,
        ),
      ).toBeInTheDocument();
    }

    // Phase switching via click and keyboard
    const startTab = screen.getByTestId('lateral-apparatus-phase-tab-start');
    const middleTab = screen.getByTestId('lateral-apparatus-phase-tab-middle');
    const endTab = screen.getByTestId('lateral-apparatus-phase-tab-end');

    fireEvent.click(startTab);
    expect(figure).toHaveAttribute('data-phase', 'start');

    fireEvent.keyDown(startTab, { key: 'ArrowRight' });
    expect(figure).toHaveAttribute('data-phase', 'middle');
    expect(middleTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(middleTab, { key: 'End' });
    expect(figure).toHaveAttribute('data-phase', 'end');
    expect(endTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(endTab, { key: 'Home' });
    expect(figure).toHaveAttribute('data-phase', 'start');

    fireEvent.keyDown(startTab, { key: 'ArrowLeft' });
    expect(figure).toHaveAttribute('data-phase', 'end');

    // Group tablist keyboard navigation
    const rotGroupTab = screen.getByTestId(
      'lateral-apparatus-group-tab-apparatus-and-side-lying-thoracic-rotation',
    );
    fireEvent.keyDown(rotGroupTab, { key: 'ArrowRight' });
    expect(figure).toHaveAttribute(
      'data-diagram-id',
      'supine-tabletop-knee-fold-and-reverse-curl',
    );

    const sourceSummary = screen.getByTestId('lateral-apparatus-source-verification-summary');
    expect(sourceSummary).toHaveTextContent('anatomicalAccuracyAssumed: false');
    expect(sourceSummary).toHaveTextContent('professionalReviewCount: 0');
  });
});
