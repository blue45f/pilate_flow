import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CONVERGED_MOBILE_CSS_FILES = [
  'src/styles/mobile-readability-unslop-v17.css',
  'src/styles/mobile-subpages-user-first-v6.css',
  'src/styles/mobile-first-atelier-v3.css',
  'src/components/LiveStageView.css',
  'src/styles/library.css',
  'src/styles/studio.css',
  'src/styles/teaching.css',
  'src/styles/motion-library.css',
  'src/styles/atelier-luxury-v2.css',
  'src/styles/flow-atlas.css',
  'src/styles/atelier-calm-luxury-polish.css',
  'src/styles/member-booking.css',
  'src/components/SequenceWorkbench.usability.css',
  'src/styles/workbench-vnext.css',
  'src/styles/atelier-vnext.css',
  'src/styles/flow-studio.css',
  'src/styles/pf-motion-studio.css',
] as const;

describe('Wave 18 Whole-Cascade Mobile Readability Convergence Gate', () => {
  const root = path.resolve(import.meta.dirname, '../..');

  it('enforces >= 12px / >= 0.75rem readability floor and zero positive tracking across all 17 core stylesheets', () => {
    for (const rel of CONVERGED_MOBILE_CSS_FILES) {
      const css = readFileSync(path.join(root, rel), 'utf8');
      expect(css, `${rel} contains sub-0.75rem font`).not.toMatch(
        /font-size:\s*0\.(?:[0-6]\d|7[0-4])\s*rem\b/,
      );
      expect(css, `${rel} contains sub-12px font`).not.toMatch(
        /font-size:\s*(?:[6-9]|10|11)\s*px\b/,
      );
      expect(css, `${rel} contains positive tracking >= 0.04em`).not.toMatch(
        /letter-spacing:\s*0?\.(?:0[4-9]|[1-9]\d*)\s*em\b/,
      );
    }
  });
});
