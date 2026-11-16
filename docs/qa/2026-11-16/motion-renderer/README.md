# Existing-atlas motion renderer review — 2026-11-16

## Scope and baseline

This change refines how the existing practitioner atlas is attached to the authored motion rig. The baseline is main commit `26d5c5f0ab2f120d3d924578695c7203f2c9bb27`. No new image generation, paid service, new artwork source, motion-capture input, or production data was used.

The original practitioner atlas remains byte-for-byte identical: SHA-256 `9cc00a49a1ff29846bbd209399cd4bed060f615ff4b6304fb90aa32a2f18b078` (73,944 bytes). The joint catalog, apparatus coordinates, motion sampler, provenance classifications, and source-only fallback rules are unchanged.

## Rendering changes

- Show the full vector figure only while the atlas is unavailable. Previously, its opaque body and joint contours remained under the textured figure, creating pale rings and a second silhouette. An image failure still restores the complete vector fallback.
- Assign torso texture positions by setup-pose arc length, retaining those material positions during motion. A small triangle overlap closes raster seams. The collar meets the existing neck cutout, and the final cloth section tapers beneath the thigh.
- Use the existing hip panel only as a narrow connector behind the torso and thigh. A large circular patch was rejected during review; the final version follows the actual connection direction and avoids a round surface overlay.
- Map the sock's painted heel and toe to their authored contacts. The cuff keeps a small height above a nearly flat ankle/sole triangle, with its orientation derived from setup. This avoids a collapsed or abruptly inverted sock while preserving the two sole anchors.
- Use opaque depth shading for the far limbs instead of reducing their opacity. Catalog motion thumbnails and the catalog reference player start with comparison trails off; the existing trail checkbox now also controls the reference triptych.

## Representative visual review

Each contact sheet contains the baseline above the changed renderer, with **start, middle, end** from left to right. The constituent frames retain their native 640 × 400 size. The sheet uses lossless WebP composition and does not retouch either image.

| Motion | Review focus | Contact sheet |
| --- | --- | --- |
| Mat bridge | Hip connection through lift and return; planted soles; single silhouette | [Before / after](original-mat-bridge.before-after.webp) |
| Parallel footwork | Neck/waist continuity, fixed footbar contact, supported body following the carriage | [Before / after](original-reformer-parallel-footwork.before-after.webp) |
| Chair seated breath | Seated waist/thigh connection, stable feet, small torso change | [Before / after](original-chair-seated-breath.before-after.webp) |
| Chair standing step-up / pedal | Fixed front foot, moving rear pedal contact, consistent orientation | [Before / after](ex-lower-03.before-after.webp) |

The final intermediate samples were inspected by both the renderer author and the integrating reviewer. The large circular hip patch and straight torso cut were reduced before the renderer was frozen. The contact sheets are rendering evidence, not motion-capture or anatomy validation. Interactive desktop/mobile review is recorded separately by the integration owner.

## Regression evidence

The focused final run passed **47 tests across 5 files**. ESLint passed for all seven modified renderer, player, utility, and regression files.

The actual final run output is preserved in [focused-47-tool-stdout.log](focused-47-tool-stdout.log), with its execution command, source identifiers, checksum, and scan result in [focused-47-tool-stdout.provenance.json](focused-47-tool-stdout.provenance.json). The original command was not redirected to a shell log file. The complete, untruncated `output` field still available in the execution tool result (session `39492`, completion chunk `de595a`, exit code `0`) was copied directly and verbatim; this is the whole captured stdout field, not an excerpt. No tests were rerun to create this record. It preserves the tool-captured text rather than claiming recovery of an unavailable original terminal byte stream.

The source tool stdout and saved UTF-8 file have the same SHA-256: `bc4fff8537367d63ce632077a1f787f90871bbfd9678b4cf428ce0a45aa66070` (**3,548 bytes**, including the captured leading/trailing newlines). The repository's `scripts/check-secrets.mjs#scanText` credential-shape scan found **0 findings** in the complete captured stdout before saving; no redactions were applied.

The executed command was:

```sh
pnpm exec vitest run \
  src/utils/generatedPractitionerArt.test.ts \
  src/components/GeneratedPractitionerFigure.test.tsx \
  src/components/StudioMotionPlayback.lifecycle.test.tsx \
  src/test/motionImageQualityCorrections.test.tsx \
  src/test/motionRenderingQualityRegression.test.tsx
```

Coverage includes:

- All **98 native motions × 3 authored phases** render one shared atlas/practitioner without non-finite transforms.
- The four representative motions are checked at the authored start/middle/end and continuous progress 0.23, 0.50, and 0.77, in both mirror states: **48 rendered cases**. Both painted sole landmarks are mapped to the authored heel/toe positions; the planted feet remain stationary.
- Footwork's painted heel meets the rendered fixed footbar. The chair step-up's rear painted toe follows the rendered moving pedal. The chair comparison accounts for the catalog's whole-unit static coordinate rounding (at most 0.551 SVG units including display rounding); continuous samples use a 0.051-unit tolerance. The art-to-authored-anchor test itself remains within 0.005 SVG units.
- Torso material coordinates remain fixed during deformation; the endpoint taper preserves the upper torso width and is monotonic. The sock does not collapse or invert when an ankle approaches or slightly crosses its sole line.
- The existing dense face-orientation check samples 1,000 steps in each of 98 continuous cycles. Setup foot triangles were additionally inspected: **0 collinear near/far feet** in the native catalog.
- Reduced-motion, pause/seek, background/offscreen suspension, reset on exercise change, requested repeat behavior, and explicit comparison trails retain their lifecycle behavior.
- Image failure restores the full vector figure; source-only or identity-mismatched exercises do not acquire generated anatomy.

## Cache and evidence reproduction

The cache retains 98 native motions and 294 static WebP frames at 640 × 400 with the existing encoder settings. `professionalReviewVerified` and `sourceFrameMappingVerified` remain `false`; rendered diagrams retain `data-anatomical-accuracy-assumed="false"`.

The final bake rasterized all 294 frames, and the subsequent integrity check passed without rerasterizing. The output directory contains exactly 294 files. Total frame bytes changed from **2,768,078 to 2,689,722**, a reduction of **78,356 bytes (2.83%)**. All 12 representative cached frames are byte-for-byte identical to the final reviewed SSR previews. The source-atlas manifest metadata is unchanged from the baseline.

```sh
pnpm generate:motion-artwork
pnpm check:motion-artwork
node docs/qa/2026-11-16/motion-renderer/rebuild-contact-sheets.mjs /path/to/untouched-baseline-worktree
```

[contact-sheet-inputs.json](contact-sheet-inputs.json) records the baseline commit, source-atlas hash, frame input hashes, and composed-sheet hashes. The reproduction script reads existing cache files and verifies their manifest hashes; it does not generate new artwork or use a browser.

## Limits

These remain stylized, authored two-dimensional planning diagrams. Body proportions are simplified, some seat/mat silhouettes still overlap the body, and a small garment or joint seam may remain in bent poses. Passing anchor tests does not establish anatomical accuracy or validate all visible surface contacts. No expert review, medical validation, source-video frame matching, or full three-dimensional contact reconstruction was performed or claimed. This review does not authorize a deployment.
