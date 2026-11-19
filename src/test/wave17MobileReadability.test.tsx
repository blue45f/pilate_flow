import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Wave 17 Small-Mobile Readability & Unslop Gate', () => {
  const root = path.resolve(import.meta.dirname, '../..');

  it('imports mobile-readability-unslop-v17.css as the final stylesheet in main.tsx and App.tsx', () => {
    for (const entry of ['src/main.tsx', 'src/App.tsx']) {
      const src = readFileSync(path.join(root, entry), 'utf8');
      const cssImports = [...src.matchAll(/^import\s+['"]([^'"]+\.css)['"];$/gm)].map(
        (m) => m[1],
      );
      expect(cssImports.at(-1)).toBe('./styles/mobile-readability-unslop-v17.css');
    }
  });

  it('enforces 16px iOS zoom-safe inputs, 44px touch targets, keep-all, tabular-nums, and reduced-motion', () => {
    const v17 = readFileSync(
      path.join(root, 'src/styles/mobile-readability-unslop-v17.css'),
      'utf8',
    );
    expect(v17).toContain('font-size: 16px !important');
    expect(v17).toContain('min-height: 44px !important');
    expect(v17).toContain('word-break: keep-all');
    expect(v17).toContain('font-variant-numeric: tabular-nums');
    expect(v17).toContain('env(safe-area-inset-bottom');
    expect(v17).toContain('@media (prefers-reduced-motion: reduce)');
    expect(v17).not.toMatch(/font-weight:\s*(?:[789]00|bold)\b/);
    expect(v17).not.toMatch(/font-style:\s*italic\b/);
  });

  it('removes sub-12px / sub-0.75rem unreadable font sizes from core mobile stylesheets', () => {
    for (const rel of [
      'src/styles/mobile-readability-unslop-v17.css',
      'src/styles/mobile-subpages-user-first-v6.css',
      'src/styles/mobile-first-atelier-v3.css',
      'src/components/LiveStageView.css',
    ]) {
      const css = readFileSync(path.join(root, rel), 'utf8');
      expect(css).not.toMatch(/font-size:\s*0\.(?:[0-6]\d|7[0-4])\s*rem\b/);
      expect(css).not.toMatch(/font-size:\s*(?:[6-9]|10|11)\s*px\b/);
    }
  });
});
