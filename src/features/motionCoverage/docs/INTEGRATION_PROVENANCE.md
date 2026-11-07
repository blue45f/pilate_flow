# Completed source snapshot and integration scope

The original 20-file Gemini working-tree snapshot was downloaded using the official File Viewer Download path. The reported branch was `feat/motion-coverage-preview-harness-modularization`, reported commit `9caab81` (after `67a6809` and `27d376b`). Git-object equality with that commit is **not verified**; this is a source snapshot, not a proven cherry-pick.

Original archive SHA-256: `ff7867ea42afe9ae643ddbf6de524a8a02b25b184fad2cc3295346b0a22b3910`.
The original archive and extracted snapshot are preserved separately from this edited integration copy. Two initially misdownloaded files were corrected before staging: `previewHarnessSelectors.ts` (216 lines, SHA-256 `2513cd992d3ba157be11f4a12fa69b4eb838fedbcc6001221a0cd5c3978fa883`) and `verifyMotionCoverageBrowser.mjs` (784 lines, SHA-256 `ec27476db55624692558372040eb7d7fc79fbd72ec7fbebe0602604467ddc43f`). All original 20 files passed byte-length and SHA-256 checks against the corrected download manifest.

Independent baseline on main `29a6edb6cbdb4f53523e1c64fff35f6890768ba4`: 3 feature test files, **19 tests passed**, and `tsc -b` passed. The previous self-reported 54-test total has not been reproduced as this feature's test count.

This module provides verified motion coverage resolution and adapters. Safe non-recursive adapters (`toMovementPhaseDiagramProps`, `resolveMotionCoverage`, `resolveVisualAssetForRenderer`, `MotionCoverageEvidenceDlItems`) are connected to `MovementDiagramReference.tsx`, `MovementVisualGuideCard.tsx`, and `ExerciseEvidencePanel.tsx`. It does not replace `ConnectedMotionStudy`, whose cursor, anatomical side and mirroring remain parent-controlled. The inspector figures use their default anatomical side and orientation; they must not be presented as the selected side of a class plan.

Integration changes enforce explicit playback, reduced-motion stills, live host guards, stale-frame cancellation and options synchronization. Edited catalog facts cannot inherit unchanged catalog verification. Review status remains optional and does not gate class authoring. No canonical asset, expert review, anatomical validation or true 3D capability is granted.

Do not apply Patch 1 from the historical integration proposal: adding coverage to `getExerciseEvidence` creates a recursive dependency through `getVisualSourceComparison`. The safe boundary is an external wrapper or separate UI composition (`MotionCoverageEvidenceDlItems`), which has been applied without modifying `getExerciseEvidence`.

## Independent integration verification

Verified on 2026-11-06 UTC using the existing local dependencies and installed Google Chrome, without package installation or external requests:

- Focused regression: **95 tests in 9 files passed**, including **26 tests in 4 motionCoverage files** plus the existing MotionPatternPreview, MotionReferencePlayer, ConnectedMotionStudy, ExerciseEvidencePanel and exerciseEvidence suites.
- `tsc -b --pretty false` and feature-scoped ESLint passed. Full-project test/build verification remains the parent integration step.
- Isolated Playwright/Chrome run: **10 checks passed, 0 failed, 0 skipped**. The 98-entry catalog sweep found 77 discrete-only, 1 continuous-2D and 20 projected-3D entries, all with canonical/manual/true-3D readiness false.
- Actual DOM and keyboard checks covered 320px and 390px widths, zero horizontal overflow, minimum 44px controls, native versus stage keyboard behavior, both full 8-second repeat cycles and stop at the endpoint. Four viewport screenshots were captured and representative 320px discrete and 390px projected views were visually reviewed.
- Lifecycle checks covered runtime reduced motion, pagehide/pageshow without automatic resume, inactive/hidden/offscreen/detached hosts, changed resolve options, and three mount/unmount cycles with zero remaining frame handles. Unit checks cover canceled callbacks, reserved IDs, edited catalog facts and no persistence/network writes.

This is desktop headless Chrome with viewport emulation, not physical mobile testing, clinical/anatomical validation, or approval of the underlying motion illustrations. Production routing and class side/mirror synchronization remain unchanged and out of scope.
