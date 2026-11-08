// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BreathingPelvicDiagramFigure } from '../components/BreathingPelvicDiagramFigure';
import { FootworkLowerDiagramFigure } from '../components/FootworkLowerDiagramFigure';
import {
  BREATHING_PELVIC_CATALOG_EXERCISE_IDS,
  BREATHING_PELVIC_DIAGRAM_IDS,
  BREATHING_PELVIC_DIAGRAM_SPECS,
  BREATHING_PELVIC_SOURCE_LEDGER,
  getBreathingPelvicCatalogVisualAssets,
  getBreathingPelvicDiagramCorrections,
  resolveBreathingPelvicDiagram,
} from '../data/breathingPelvicDiagramData';
import {
  FOOTWORK_LOWER_CATALOG_EXERCISE_IDS,
  FOOTWORK_LOWER_DIAGRAM_IDS,
  FOOTWORK_LOWER_DIAGRAM_SPECS,
  FOOTWORK_LOWER_SOURCE_LEDGER,
  getFootworkLowerCatalogVisualAssets,
  getFootworkLowerDiagramCorrections,
  resolveFootworkLowerDiagram,
} from '../data/footworkLowerDiagramData';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';

afterEach(() => {
  cleanup();
});

describe('Track I9 — Breathing, Centering & Pelvic Clock/Rock 2D Diagrams', () => {
  it('verifies breathingPelvicSourceLedger.json schema, SHA-256 hashes, and truthfulness metadata', () => {
    expect(BREATHING_PELVIC_SOURCE_LEDGER.trackId).toBe('I9-breathing-pelvic-centering');
    expect(BREATHING_PELVIC_SOURCE_LEDGER.checkedAt).toBe('2026-11-08');
    expect(BREATHING_PELVIC_SOURCE_LEDGER.scopeNoteKo.length).toBeGreaterThan(20);
    expect(BREATHING_PELVIC_SOURCE_LEDGER.truthfulness.anatomicalAccuracyAssumed).toBe(false);
    expect(BREATHING_PELVIC_SOURCE_LEDGER.truthfulness.professionalReviewCount).toBe(0);
    expect(BREATHING_PELVIC_SOURCE_LEDGER.truthfulness.sourceFrameMappings).toBe(0);

    for (const diagramId of BREATHING_PELVIC_DIAGRAM_IDS) {
      const entry = BREATHING_PELVIC_SOURCE_LEDGER.entries[diagramId];
      expect(entry).toBeDefined();
      expect(entry.movementId).toBe(diagramId);
      expect(entry.checkedAt).toBe('2026-11-08');
      expect(entry.sources.length).toBeGreaterThanOrEqual(2);
      for (const src of entry.sources) {
        expect(src.checkedAt).toBe('2026-11-08');
        expect(src.url).toMatch(/^https:\/\//);
      }

      const expectedSha = createHash('sha256')
        .update(JSON.stringify(entry.factualRecord))
        .digest('hex');
      expect(entry.factualRecordSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.factualRecordSha256).toBe(expectedSha);
    }
  });

  it('resolves all 3 diagram IDs and all 10 catalog exercise IDs with source-compared-draft verification', () => {
    expect(BREATHING_PELVIC_DIAGRAM_IDS).toHaveLength(3);
    expect(BREATHING_PELVIC_CATALOG_EXERCISE_IDS).toHaveLength(10);

    for (const diagramId of BREATHING_PELVIC_DIAGRAM_IDS) {
      const spec = resolveBreathingPelvicDiagram(diagramId);
      expect(spec).not.toBeNull();
      expect(spec?.id).toBe(diagramId);
      expect(spec?.asset.verification).toEqual({
        anatomicalAccuracyAssumed: false,
        status: 'source-compared-draft',
        reviewerVerificationRequired: true,
        clinicalSafetyGuaranteed: false,
      });
    }

    const assets = getBreathingPelvicCatalogVisualAssets();
    for (const exerciseId of BREATHING_PELVIC_CATALOG_EXERCISE_IDS) {
      const spec = resolveBreathingPelvicDiagram(exerciseId);
      expect(spec).not.toBeNull();
      expect(spec?.catalogExerciseIds).toContain(exerciseId);

      const asset = assets[exerciseId];
      expect(asset).toBeDefined();
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(asset.verification).toEqual({
        anatomicalAccuracyAssumed: false,
        status: 'source-compared-draft',
        reviewerVerificationRequired: true,
        clinicalSafetyGuaranteed: false,
      });
    }

    expect(
      BREATHING_PELVIC_DIAGRAM_SPECS['breathing-supine-diaphragmatic'].kinematicMetrics
        .sacralAnchorY,
    ).toBe(144);
    expect(
      BREATHING_PELVIC_DIAGRAM_SPECS['pelvic-clock-and-imprint-rock'].kinematicMetrics
        .pelvicTiltRangeDeg,
    ).toEqual([8, 12]);
  });

  it('returns MovementDiagramCorrection entries for all 3 diagram IDs and 10 catalog exercise IDs with matching archetypeIds', () => {
    const corrections = getBreathingPelvicDiagramCorrections();

    for (const id of [...BREATHING_PELVIC_DIAGRAM_IDS, ...BREATHING_PELVIC_CATALOG_EXERCISE_IDS]) {
      const corr = corrections[id];
      expect(corr).toBeDefined();
      expect(corr.checkedAt).toBe('2026-11-08');
      expect(corr.professionalReviewCount).toBe(0);
      expect(corr.sourceFrameMappings).toBe(0);
      expect(corr.reviewedScopeKo.length).toBeGreaterThan(15);
      expect(corr.correctionKo.length).toBeGreaterThan(15);
      expect(corr.limitationKo.length).toBeGreaterThan(15);
      expect(corr.sources.length).toBeGreaterThanOrEqual(2);

      const spec = resolveBreathingPelvicDiagram(id)!;
      const expectedArchetype =
        getMovementVisualAsset(id)?.archetypeId ?? spec.archetypeId;
      expect(corr.archetypeId).toBe(expectedArchetype);
    }
  });

  it('renders BreathingPelvicDiagramFigure with 3-phase SVG, triptych, and keyboard tab navigation', () => {
    render(<BreathingPelvicDiagramFigure exerciseId="original-mat-pelvic-clock" initialPhase="middle" />);

    const figure = screen.getByTestId('breathing-pelvic-diagram-figure');
    expect(figure.getAttribute('data-active-diagram-id')).toBe('pelvic-clock-and-imprint-rock');
    expect(figure.getAttribute('data-active-phase')).toBe('middle');

    const activeSvg = screen.getByTestId(
      'breathing-pelvic-phase-svg-pelvic-clock-and-imprint-rock-middle',
    );
    expect(activeSvg.getAttribute('viewBox')).toBe('0 0 320 200');

    const phaseTabMiddle = screen.getByTestId('breathing-pelvic-phase-tab-middle');
    expect(phaseTabMiddle.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(phaseTabMiddle, { key: 'ArrowRight' });
    expect(figure.getAttribute('data-active-phase')).toBe('end');

    const phaseTabEnd = screen.getByTestId('breathing-pelvic-phase-tab-end');
    fireEvent.keyDown(phaseTabEnd, { key: 'Home' });
    expect(figure.getAttribute('data-active-phase')).toBe('start');

    const movementTabSupine = screen.getByTestId(
      'breathing-pelvic-movement-tab-breathing-supine-diaphragmatic',
    );
    fireEvent.click(movementTabSupine);
    expect(figure.getAttribute('data-active-diagram-id')).toBe('breathing-supine-diaphragmatic');

    const disclosure = screen.getByTestId('breathing-pelvic-source-disclosure');
    expect(within(disclosure).getByText(/anatomicalAccuracyAssumed: false/i)).toBeTruthy();
  });
});

describe('Track I10 — Footwork, Ankle, Chair Pedal & Standing Lower-Body 2D Diagrams', () => {
  it('verifies footworkLowerSourceLedger.json schema, SHA-256 hashes, and truthfulness metadata', () => {
    expect(FOOTWORK_LOWER_SOURCE_LEDGER.trackId).toBe(
      'I10-footwork-ankle-pedal-standing-lower',
    );
    expect(FOOTWORK_LOWER_SOURCE_LEDGER.checkedAt).toBe('2026-11-08');
    expect(FOOTWORK_LOWER_SOURCE_LEDGER.scopeNoteKo.length).toBeGreaterThan(20);
    expect(FOOTWORK_LOWER_SOURCE_LEDGER.truthfulness.anatomicalAccuracyAssumed).toBe(false);
    expect(FOOTWORK_LOWER_SOURCE_LEDGER.truthfulness.professionalReviewCount).toBe(0);
    expect(FOOTWORK_LOWER_SOURCE_LEDGER.truthfulness.sourceFrameMappings).toBe(0);

    for (const diagramId of FOOTWORK_LOWER_DIAGRAM_IDS) {
      const entry = FOOTWORK_LOWER_SOURCE_LEDGER.entries[diagramId];
      expect(entry).toBeDefined();
      expect(entry.movementId).toBe(diagramId);
      expect(entry.checkedAt).toBe('2026-11-08');
      expect(entry.sources.length).toBeGreaterThanOrEqual(2);
      for (const src of entry.sources) {
        expect(src.checkedAt).toBe('2026-11-08');
        expect(src.url).toMatch(/^https:\/\//);
      }

      const expectedSha = createHash('sha256')
        .update(JSON.stringify(entry.factualRecord))
        .digest('hex');
      expect(entry.factualRecordSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.factualRecordSha256).toBe(expectedSha);
    }
  });

  it('resolves all 4 diagram IDs and all 21 catalog exercise IDs with source-compared-draft verification', () => {
    expect(FOOTWORK_LOWER_DIAGRAM_IDS).toHaveLength(4);
    expect(FOOTWORK_LOWER_CATALOG_EXERCISE_IDS).toHaveLength(21);

    for (const diagramId of FOOTWORK_LOWER_DIAGRAM_IDS) {
      const spec = resolveFootworkLowerDiagram(diagramId);
      expect(spec).not.toBeNull();
      expect(spec?.id).toBe(diagramId);
      expect(spec?.asset.verification).toEqual({
        anatomicalAccuracyAssumed: false,
        status: 'source-compared-draft',
        reviewerVerificationRequired: true,
        clinicalSafetyGuaranteed: false,
      });
    }

    const assets = getFootworkLowerCatalogVisualAssets();
    for (const exerciseId of FOOTWORK_LOWER_CATALOG_EXERCISE_IDS) {
      const spec = resolveFootworkLowerDiagram(exerciseId);
      expect(spec).not.toBeNull();
      expect(spec?.catalogExerciseIds).toContain(exerciseId);

      const asset = assets[exerciseId];
      expect(asset).toBeDefined();
      expect(asset.anatomicalAccuracyAssumed).toBe(false);
      expect(asset.verification).toEqual({
        anatomicalAccuracyAssumed: false,
        status: 'source-compared-draft',
        reviewerVerificationRequired: true,
        clinicalSafetyGuaranteed: false,
      });
    }

    expect(
      FOOTWORK_LOWER_DIAGRAM_SPECS['reformer-footwork-and-strap-frog'].catalogExerciseIds,
    ).toHaveLength(6);
    expect(
      FOOTWORK_LOWER_DIAGRAM_SPECS['ankle-plantar-dorsiflexion-articulation'].catalogExerciseIds,
    ).toHaveLength(4);
    expect(
      FOOTWORK_LOWER_DIAGRAM_SPECS['chair-pedal-press-and-calf-raise'].catalogExerciseIds,
    ).toHaveLength(4);
    expect(
      FOOTWORK_LOWER_DIAGRAM_SPECS['standing-lunge-splits-and-hip-abduction'].catalogExerciseIds,
    ).toHaveLength(7);
  });

  it('returns MovementDiagramCorrection entries for all 4 diagram IDs and 21 catalog exercise IDs with matching archetypeIds', () => {
    const corrections = getFootworkLowerDiagramCorrections();

    for (const id of [...FOOTWORK_LOWER_DIAGRAM_IDS, ...FOOTWORK_LOWER_CATALOG_EXERCISE_IDS]) {
      const corr = corrections[id];
      expect(corr).toBeDefined();
      expect(corr.checkedAt).toBe('2026-11-08');
      expect(corr.professionalReviewCount).toBe(0);
      expect(corr.sourceFrameMappings).toBe(0);
      expect(corr.reviewedScopeKo.length).toBeGreaterThan(15);
      expect(corr.correctionKo.length).toBeGreaterThan(15);
      expect(corr.limitationKo.length).toBeGreaterThan(15);
      expect(corr.sources.length).toBeGreaterThanOrEqual(2);

      const spec = resolveFootworkLowerDiagram(id)!;
      const expectedArchetype =
        getMovementVisualAsset(id)?.archetypeId ?? spec.archetypeId;
      expect(corr.archetypeId).toBe(expectedArchetype);
    }
  });

  it('renders FootworkLowerDiagramFigure with 3-phase SVG, apparatus geometry, triptych, and keyboard tab navigation', () => {
    render(<FootworkLowerDiagramFigure exerciseId="ex-lower-01" initialPhase="middle" />);

    const figure = screen.getByTestId('footwork-lower-diagram-figure');
    expect(figure.getAttribute('data-active-diagram-id')).toBe(
      'standing-lunge-splits-and-hip-abduction',
    );
    expect(figure.getAttribute('data-active-phase')).toBe('middle');

    const activeSvg = screen.getByTestId(
      'footwork-lower-phase-svg-standing-lunge-splits-and-hip-abduction-middle',
    );
    expect(activeSvg.getAttribute('viewBox')).toBe('0 0 320 200');

    const phaseTabMiddle = screen.getByTestId('footwork-lower-phase-tab-middle');
    fireEvent.keyDown(phaseTabMiddle, { key: 'ArrowLeft' });
    expect(figure.getAttribute('data-active-phase')).toBe('start');

    const movementTabChair = screen.getByTestId(
      'footwork-lower-movement-tab-chair-pedal-press-and-calf-raise',
    );
    fireEvent.click(movementTabChair);
    expect(figure.getAttribute('data-active-diagram-id')).toBe('chair-pedal-press-and-calf-raise');

    const disclosure = screen.getByTestId('footwork-lower-source-disclosure');
    expect(within(disclosure).getByText(/anatomicalAccuracyAssumed: false/i)).toBeTruthy();
  });
});
