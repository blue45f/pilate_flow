import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Wave 15 Final Loop Engineer Convergence Gate', () => {
  it('enforces Korean IME composition guards across all remaining Enter/Escape input and dialog views', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    for (const rel of [
      'src/components/CourseReferenceBrowser.tsx',
      'src/components/RestPlanningControls.tsx',
      'src/components/RestStepCard.tsx',
      'src/components/ScheduleChangeScopePanel.tsx',
      'src/components/StudioInteractive3DViewport.tsx',
    ]) {
      const src = readFileSync(path.join(root, rel), 'utf8');
      expect(src).toMatch(/isImeComposing\(event\)|event\.isComposing/);
    }
  });
});
