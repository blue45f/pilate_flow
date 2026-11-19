import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Wave 19 Mobile UI/UX Simplification & Korean Typography Gate', () => {
  const root = path.resolve(import.meta.dirname, '../..');
  const css = readFileSync(
    path.join(root, 'src/styles/mobile-readability-unslop-v17.css'),
    'utf8',
  );

  it('hides desktop-only keyboard shortcut hints on mobile and coarse pointer devices', () => {
    expect(css).toContain('.composition-keyboard-hint');
    expect(css).toContain('@media (pointer: coarse)');
  });

  it('enforces Korean Hangul body line-height (1.65), negative tracking (-0.01em), and keep-all', () => {
    expect(css).toContain('line-height: 1.65 !important');
    expect(css).toContain('letter-spacing: -0.01em !important');
    expect(css).toContain('word-break: keep-all');
  });

  it('converts wizard & view-mode bars into single-row scrollable rails and flattens nested bordered cards', () => {
    expect(css).toContain('.pf-step-wizard-stepper');
    expect(css).toContain('.pf-seq-view-switcher');
    expect(css).toContain('scroll-snap-type: x proximity');
    expect(css).toContain('border: none !important');
  });

  it('enforces touch-action: manipulation, overscroll-behavior-x: none, and sage tap highlight on mobile', () => {
    expect(css).toContain('touch-action: manipulation');
    expect(css).toContain('overscroll-behavior-x: none');
    expect(css).toContain('-webkit-tap-highlight-color');
  });

  it('hardens mobile tables against horizontal overflow with tabular-nums', () => {
    expect(css).toContain('main#main-content table');
    expect(css).toContain('dialog[open] table');
    expect(css).toContain('font-variant-numeric: tabular-nums');
  });
});
