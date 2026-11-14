import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { PRACTITIONER_ATLAS_URL } from '../utils/generatedPractitionerArt';
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

  it('keeps an authored fallback and restores its head if the shared image fails', () => {
    const { container } = render(<MovementPhaseDiagramSvg asset={asset} phase="start" />);
    const texture = container.querySelector(`[href="${PRACTITIONER_ATLAS_URL}"]`)!;
    expect(container.querySelector('[data-layer="kinematic-figure"]')).not.toBeNull();
    fireEvent.load(texture);
    expect(container.querySelector('[data-layer="generated-practitioner"]')).toHaveAttribute('opacity', '1');
    expect(container.querySelector('[data-segment="native-head"]')).toHaveAttribute('opacity', '0');
    fireEvent.error(texture);
    expect(container.querySelector('[data-layer="generated-practitioner"]')).toBeNull();
    expect(container.querySelector('[data-segment="native-head"]')).toHaveAttribute('opacity', '1');
  });

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
