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
- Full TypeScript check: blocked by existing unavailable `firebase/app` and `firebase/auth` dependencies and related errors in `firebaseSession.ts`. No dependencies were installed or changed. Full build and full regression are not claimed.
- Headless Chrome launch terminated with SIGABRT; responsive visual/browser QA is **not completed**. HTML includes 320px-compatible single-column styling but this is not a measured visual pass.

Run the export contract test with:

`node --test scripts/qa/export-diagram-review.node-test.mjs`

Next work is movement-specific source reconciliation, phase-by-phase authoring, and qualified review. This exporter provides a reproducible view of the existing drafts and their limitations; it does not substitute for that work. No production deployment is performed.
