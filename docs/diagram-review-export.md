# Offline diagram draft review export

This is a review artifact generator, not a new movement renderer or anatomical validation system. It does not change catalog data, pose coordinates, application behavior, playback, stored plans, or review status. It is separate from the `motionEvidenceReview` work.

## Generate

With the repository's existing dependencies available:

`node scripts/qa/export-diagram-review.mjs [existing-parent-directory]`

The script allocates a fresh private directory and prints its location. Open `index.html` locally. No HTTP server, external image requests, scripts, autoplay, account, or paid service is required. Only an explicit click opens an external research link. Do not place private reviewer notes into a public repository.

The output contains:

- All 98 existing catalog drafts, each rendered as three standalone SVGs (294 total).
- A responsive static HTML review sheet with a movement index.
- A JSON manifest with each file's byte count/SHA-256, source-research candidates, shared-coordinate peers, and explicit missing review items.
- An unverified warning embedded visibly into each SVG, including when separated from the HTML page.

The source URLs are existing heuristic research associations, not newly verified citations or frame matches. No source media is downloaded, copied, or traced. The author-defined `start`, `middle`, and `end` labels are not claims that actual exercise phases were observed. Alignment, muscle, direction, and ghost overlays are disabled. Anatomical side remains right and the view is not mirrored.

## Baseline findings (bfbd816)

98 entries render 294 SVGs but contain only **23 distinct three-phase joint-coordinate sets**. **96 of 98 exercises share identical joint-coordinate sequences with another exercise.** These counts concern joint coordinates, not every apparatus/rendering property. Conversely, coordinate uniqueness does not establish correctness.

Exact canonical motion verified: **0**. Anatomical validation: **0**. Exact source frame mappings established by this export: **0**. Rendering success and file integrity must not be presented as exercise completion or teaching approval.

## Verification on 2026-11-06

- Export end-to-end Node test passed: all 294 SVGs, unique IDs, finite coordinates, warning text, safe static markup, coordinate peer groups, and manifest byte/hash checks.
- Existing visual guide, diagram reference, and coverage regression tests: 19/19 passed across three files.
- Targeted ESLint: passed.
- Initial TypeScript check failed because the original local dependency installation omitted Firebase. Reused an existing offline installation with an identical lockfile (SHA-256 `c5b1b912976626b35f34e61b94f1f5d2f14276ae593ea576dc3617ee245e5bb9`) without changing/installing dependencies. Final TypeScript, full ESLint (one pre-existing React-refresh warning), production build/PWA, frozen motion ledger and 7 Node tests passed. Full Vitest regression: 190 files / 2,096 tests passed against the integration with main `7b26d57`.
- Initial local headless Chrome launch failed with SIGABRT. Independent Chrome verification subsequently passed at 320/390/1440px: all 294 images loaded with nonzero natural width and no document horizontal overflow. First-section screenshots at 390/1440px were visually checked for mobile stacked/desktop three-column layout and explicit unverified warnings. This is rendering QA, not exercise or anatomical validation.

Run the export contract test with:

`node --test scripts/qa/export-diagram-review.node-test.mjs`

Next work is movement-specific source reconciliation, phase-by-phase authoring, and qualified review. This exporter provides a reproducible view of the existing drafts and their limitations; it does not substitute for that work. No production deployment is performed.
