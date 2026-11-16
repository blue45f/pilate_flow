import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset, type Point2D } from '../data/movementVisualRigCatalog';
import { PRACTITIONER_ATLAS_URL, PRACTITIONER_FOOT_ANCHORS } from '../utils/generatedPractitionerArt';
import { normalizeRigJointMap, resolveRigFoot } from '../utils/motionRigGeometry';
import { ApparatusIllustrationSvg } from './ApparatusStudioArtwork';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';

afterEach(cleanup);

const native = INITIAL_EXERCISES.filter((exercise) => getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable !== false);
const asset = getMovementVisualAsset(native[0].id)!;

describe('generated practitioner art on authored movement geometry', () => {
  it('renders one shared atlas and one practitioner for every authored phase without invalid transforms', () => {
    expect(native).toHaveLength(98);
    let frames = 0;
    for (const exercise of native) for (const phase of ['start', 'middle', 'end'] as const) {
      const markup = renderToStaticMarkup(<MovementPhaseDiagramSvg asset={getMovementVisualAsset(exercise.id)!} phase={phase} compact />);
      expect(markup, `${exercise.id}/${phase}`).not.toMatch(/NaN|Infinity/);
      expect(markup.match(/data-layer="generated-practitioner"/g)).toHaveLength(1);
      expect(markup.match(/data-generated-part="head"/g)).toHaveLength(1);
      expect(markup.split(PRACTITIONER_ATLAS_URL)).toHaveLength(2);
      expect(markup).toContain('data-artwork-origin="imagegen"');
      frames++;
    }
    expect(frames).toBe(294);
  }, 15000);

  it('shows a single complete silhouette and restores the whole authored fallback if the atlas fails', () => {
    const { container } = render(<MovementPhaseDiagramSvg asset={asset} phase="start" />);
    const texture = container.querySelector(`[href="${PRACTITIONER_ATLAS_URL}"]`)!;
    expect(container.querySelector('[data-layer="kinematic-figure"]')).not.toBeNull();
    fireEvent.load(texture);
    expect(container.querySelector('[data-layer="generated-practitioner"]')).toHaveAttribute('opacity', '1');
    expect(container.querySelector('[data-layer="kinematic-figure"]')).toHaveAttribute('opacity', '0');
    expect(container.querySelector('[data-segment="native-head"]')).toHaveAttribute('opacity', '0');
    expect(container.querySelector('[data-generated-depth="far"]')).not.toHaveAttribute('opacity');
    fireEvent.error(texture);
    expect(container.querySelector('[data-layer="generated-practitioner"]')).toBeNull();
    expect(container.querySelector('[data-layer="kinematic-figure"]')).toHaveAttribute('opacity', '1');
    expect(container.querySelector('[data-segment="native-head"]')).toHaveAttribute('opacity', '1');
  });

  it.each(['original-mat-bridge', 'original-reformer-parallel-footwork', 'original-chair-seated-breath', 'ex-lower-03'])(
    'keeps both painted soles on the authored contacts in static, transitional and mirrored %s frames',
    (id) => {
      const motion = getCatalogContinuousMotionAsset(id)!;
      const reference = motion.visualAsset.phases.start.joints;
      const cases = [
        // Authored catalog points use integer SVG coordinates; the moving
        // pedal is rendered to one decimal. Continuous poses retain precision.
        ...(['start', 'middle', 'end'] as const).map((phase) => ({ phase, spec: motion.visualAsset.phases[phase], supportTolerance: 0.551 })),
        ...[0.23, 0.5, 0.77].map((progress) => {
          const sample = motion.samplePose(progress);
          return { phase: sample.visualPhaseId, spec: sample.interpolatedPhaseSpec, supportTolerance: 0.051 };
        }),
      ];
      for (const { phase, spec, supportTolerance } of cases) for (const mirrored of [false, true]) {
        const candidate = { ...motion.visualAsset, phases: { ...motion.visualAsset.phases, [phase]: spec } };
        const svg = new DOMParser().parseFromString(renderToStaticMarkup(
          <MovementPhaseDiagramSvg asset={candidate} phase={phase} mirrored={mirrored} showAlignment={false} showDirection={false} showMuscles={false} showGhostStartPose={false} />,
        ), 'text/html').querySelector('svg')!;
        const joints = normalizeRigJointMap(spec.joints, reference);
        const feet = ['far', 'near'].map((side) => resolveRigFoot(joints, side as 'far' | 'near', reference));
        const glyphs = [...svg.querySelectorAll('[data-generated-part="foot"]')];
        expect(glyphs).toHaveLength(2);
        const paintedSoles: Array<Record<'heel' | 'toe', Point2D>> = [];
        for (let footIndex = 0; footIndex < 2; footIndex++) {
          const [a, b, c, d, e, f] = glyphs[footIndex].getAttribute('transform')!.slice(7, -1).split(' ').map(Number);
          const sole = {} as Record<'heel' | 'toe', Point2D>;
          for (const [landmarkIndex, joint] of [[1, 'heel'], [2, 'toe']] as const) {
            const source = PRACTITIONER_FOOT_ANCHORS[landmarkIndex];
            const expected = feet[footIndex][joint];
            sole[joint] = { x: a * source.x + c * source.y + e, y: b * source.x + d * source.y + f };
            expect(sole[joint].x, `${phase}/${mirrored}/${footIndex}/${joint} x`).toBeCloseTo(mirrored ? 320 - expected.x : expected.x, 2);
            expect(sole[joint].y, `${phase}/${mirrored}/${footIndex}/${joint} y`).toBeCloseTo(expected.y, 2);
          }
          paintedSoles.push(sole);
        }
        if (id === 'original-reformer-parallel-footwork') {
          const bar = svg.querySelector('[data-reformer-footbar-contact]')!;
          expect(paintedSoles[1].heel.x).toBeCloseTo(Number(bar.getAttribute('cx')), 2);
          expect(paintedSoles[1].heel.y).toBeCloseTo(Number(bar.getAttribute('cy')), 2);
        } else if (id === 'ex-lower-03') {
          const pedal = svg.querySelector('[data-chair-pedal="hinged"]')!;
          expect(Math.abs(paintedSoles[0].toe.x - Number(pedal.getAttribute('x2')))).toBeLessThan(supportTolerance);
          expect(Math.abs(paintedSoles[0].toe.y - Number(pedal.getAttribute('y2')))).toBeLessThan(supportTolerance);
        }
        for (let footIndex = id === 'ex-lower-03' ? 1 : 0; footIndex < 2; footIndex++) {
          const setupFoot = resolveRigFoot(normalizeRigJointMap(reference), footIndex === 0 ? 'far' : 'near', reference);
          for (const joint of ['heel', 'toe'] as const) {
            expect(paintedSoles[footIndex][joint].x).toBeCloseTo(mirrored ? 320 - setupFoot[joint].x : setupFoot[joint].x, 2);
            expect(paintedSoles[footIndex][joint].y).toBeCloseTo(setupFoot[joint].y, 2);
          }
        }
        expect(svg.getAttribute('data-anatomical-accuracy-assumed')).toBe('false');
        expect(svg.querySelector('[data-layer="pose-delta-ghost"]')).toBeNull();
      }
    },
  );

  it('does not attach generated anatomy to source-only or changed catalog identities', () => {
    const source = INITIAL_EXERCISES.find((exercise) => getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable === false)!;
    const sourceAsset = getMovementVisualAsset(source.id)!;
    const changedAsset = { ...asset, apparatus: asset.apparatus === 'chair' ? 'mat' as const : 'chair' as const };
    for (const candidate of [sourceAsset, changedAsset]) {
      const { container, unmount } = render(<MovementPhaseDiagramSvg asset={candidate} phase="start" />);
      expect(container.querySelector('[data-layer="generated-practitioner"]')).toBeNull();
      expect(container.querySelector('svg')).toHaveAttribute('data-native-motion-available', 'false');
      unmount();
    }
  });

  it('preserves tiny vector apparatus badges and falls back if a full equipment illustration fails', () => {
    const { container, rerender } = render(<ApparatusIllustrationSvg apparatus="reformer" compact />);
    expect(container.querySelector('image')).toBeNull();
    rerender(<ApparatusIllustrationSvg apparatus="reformer" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-artwork-origin', 'imagegen');
    const image = container.querySelector('image')!;
    expect(image).toHaveAttribute('href', '/images/motion-atlas-v3/equipment.webp');
    fireEvent.error(image);
    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelectorAll('path, rect, polygon').length).toBeGreaterThan(3);
  });

  it('applies real container sizing CSS only to outer diagrams, never to nested sprite viewports', () => {
    const style = document.createElement('style');
    style.textContent = [
      './LiveStageView.css', '../styles/motion-library.css', '../styles/studio.css', '../styles/mobile-subpages-user-first-v6.css', '../styles/connected-motion-study.css',
    ].map((file) => readFileSync(resolve(import.meta.dirname, file), 'utf8')).join('\n');
    document.head.append(style);
    try {
      const diagram = <MovementPhaseDiagramSvg asset={asset} phase="middle" compact />;
      const { container } = render(<>
        <div className="teaching-live-diagram-single">{diagram}</div>
        <div className="ml-pattern-tile-art">{diagram}</div>
        <div className="motion-library"><div className="movement-art-trigger">{diagram}</div></div>
        <div className="step-art">{diagram}</div>
        <div className="pf-p08-yt-mini-art">{diagram}</div>
        <div className="connected-motion-study"><div className="connected-study-figures"><figure>{diagram}</figure></div></div>
      </>);
      expect(container.querySelectorAll('svg.movement-phase-diagram-svg')).toHaveLength(6);
      expect(container.querySelectorAll('[data-layer="generated-practitioner"] svg').length).toBeGreaterThan(5);
      let sizingRules = 0;
      const inspect = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          if ('cssRules' in rule) inspect((rule as CSSGroupingRule).cssRules);
          if (!('selectorText' in rule)) continue;
          const css = rule as CSSStyleRule;
          if (!css.selectorText.includes('svg') || !['width', 'height', 'max-width', 'max-height'].some((property) => css.style.getPropertyValue(property))) continue;
          sizingRules++;
          for (const match of container.querySelectorAll(css.selectorText)) {
            expect(match.closest('[data-layer="generated-practitioner"]'), css.selectorText).toBeNull();
          }
        }
      };
      expect(style.sheet).not.toBeNull();
      inspect(style.sheet!.cssRules);
      expect(sizingRules).toBeGreaterThan(5);
    } finally { style.remove(); }
  });
});
