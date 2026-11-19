import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(process.cwd(), 'src');

function collectCssFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectCssFiles(full));
    } else if (entry.endsWith('.css')) {
      results.push(full);
    }
  }
  return results.sort();
}

function stripCommentsAndPrintMedia(css: string): string {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let out = '';
  let idx = 0;
  while (idx < withoutComments.length) {
    const rest = withoutComments.slice(idx);
    const match = rest.match(/@media\s+print\b[^{]*\{/);
    if (!match || match.index === undefined) {
      out += rest;
      break;
    }
    out += rest.slice(0, match.index);
    let cursor = idx + match.index + match[0].length;
    let depth = 1;
    while (cursor < withoutComments.length && depth > 0) {
      if (withoutComments[cursor] === '{') depth += 1;
      else if (withoutComments[cursor] === '}') depth -= 1;
      cursor += 1;
    }
    idx = cursor;
  }
  return out;
}

describe('Wave 18 — Repo-Wide Mobile Readability & Unslop CSS Convergence', () => {
  const allCssFiles = collectCssFiles(SRC_ROOT);

  it('enforces >= 13px / 0.8125rem screen font floor across all src CSS files', () => {
    const violations: string[] = [];
    for (const fp of allCssFiles) {
      const rel = path.relative(SRC_ROOT, fp);
      const code = stripCommentsAndPrintMedia(readFileSync(fp, 'utf8'));
      for (const m of code.matchAll(/font-size\s*:\s*([0-9.]+)\s*px\b/gi)) {
        const val = Number(m[1]);
        if (val > 0 && val < 13) violations.push(`${rel}: ${m[0]}`);
      }
      for (const m of code.matchAll(/font-size\s*:\s*([0-9.]+)\s*rem\b/gi)) {
        const val = Number(m[1]);
        if (val > 0 && val < 0.8125) violations.push(`${rel}: ${m[0]}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('eliminates heavy Korean weights (>= 700), italic, uppercase, wide positive tracking, and transition:all across all src CSS files', () => {
    const violations: string[] = [];
    for (const fp of allCssFiles) {
      const rel = path.relative(SRC_ROOT, fp);
      const code = stripCommentsAndPrintMedia(readFileSync(fp, 'utf8'));
      if (/font-weight\s*:\s*(?:700|800|900|bold)\b/i.test(code)) {
        violations.push(`${rel}: font-weight >= 700`);
      }
      if (/font-style\s*:\s*italic\b/i.test(code)) {
        violations.push(`${rel}: font-style italic`);
      }
      if (/text-transform\s*:\s*uppercase\b/i.test(code)) {
        violations.push(`${rel}: text-transform uppercase`);
      }
      if (/transition\s*:\s*all\b/i.test(code)) {
        violations.push(`${rel}: transition: all`);
      }
      if (/letter-spacing\s*:\s*(?:0\.0[3-9][0-9]*|0\.[1-9][0-9]*|[1-9][0-9]*(?:\.[0-9]+)?)(?:em|rem|px)\b/i.test(code)) {
        violations.push(`${rel}: wide positive letter-spacing`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps full-surface mobile dialog fit, nested radii, and focus-visible rings in the final mobile readability layer', () => {
    const v17 = readFileSync(path.join(SRC_ROOT, 'styles/mobile-readability-unslop-v17.css'), 'utf8');
    expect(v17).toContain("html #root dialog[open]");
    expect(v17).toContain("max-width: calc(100vw - 16px) !important");
    expect(v17).toContain(':focus-visible');
    expect(v17).toContain('border-radius: 6px !important');
  });
});
