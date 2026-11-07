# Mat clam / open-book: source comparison and limited correction

Reviewed 2026-11-06. This record describes a **source-text comparison and correction of unintended motion**, not professional anatomical approval. It does not change exercise approval, safety, recommendation eligibility, media rights, or canonical motion readiness.

## Problem confirmed in existing code

`original-mat-clam` and `original-mat-open-book` both used `side-lying-clam-open-book`. Its middle pose simultaneously moved the upper knee and the arm/trunk. Its labels, vectors, and summaries described the two different movements together. This cannot accurately describe either isolated movement.

## Sources actually read

1. Cambridge University Hospitals, [General stability exercises](https://www.cuh.nhs.uk/patient-information/general-stability-exercises1/), “Hip / Bottom exercises (clam shell)”, document 32224, version 3, approved 10 July 2024. Text specifies side-lying with bent knees, ankles kept together, the top knee raised and returned, with the hips/body not rolling backward. This supports removing open-book arm/trunk rotation from the mat clam diagram. It does not provide measured pixel coordinates, individualized range, or a Pilates certification.
2. South Tees Hospitals, [The clam](https://www.southtees.nhs.uk/resources/the-clam/), updated 3 April 2024. Text independently describes head support, bent hips/knees, heels together, upper knee opening and controlled return, without rolling the hips backward. This corroborates the separation of the clam movement. Head-support geometry remains to be improved; no source media was copied.
3. Physitrack, [Thoracic rotations in side lying (open book), version 3](https://na.physitrack.com/home-exercise-video/thoracic-rotations-in-side-lying-%2528open-book%2529---version-3). Text identifies mat/no equipment, a supported side-lying setup with bent knees and arms together, and upward/outward upper-arm rotation without forcing the shoulder. It supports distinguishing arm/trunk opening from the clam's knee opening. The page does not establish an exact return frame; return-to-start is explicitly the app's existing authored plan. No video frames were observed and no timestamp evidence is claimed.

4. HQPT / MedBridge, [Open Book, page 2](https://hqpt.com/wp-content/uploads/2022/04/Yard-work-cool-down.pdf#page=2), prepared by Heather Asti, printed 20 April 2022. The text specifies side-lying with both legs bent, arms forward, upper-arm/trunk rotation, knees kept together and arm return. This directly supports removal of the clam knee-opening from open book and corroborates the return described by the app. This is a care exercise handout, not a universal class prescription. Images were not copied.

All are research links only. No photographs, video, traced contours, or external coordinates are embedded or redistributed. Clinical patient-leaflet context does not establish suitability for every user or class.

## Changes actually made

Only the two named mat IDs receive separated blueprints. Other IDs retain their previous blueprints.

- Clam: upper knee moves; head, arm, trunk, pelvis and ankle coordinates remain at the setup pose. End returns exactly to setup.
- Open book: upper-body motion remains in the author's existing projection; hip and knee coordinates remain at setup rather than performing the clam opening. End returns exactly to setup, as a return supported by the HQPT text, not a verified source frame.
- Phase names, descriptions, moving joints, fixed anchors, direction vectors and delta summaries now distinguish the two exercises.
- Visual inspection revealed the original renderer inferred the lower arm from the moving upper arm and left its shoulder disconnected. These two diagrams now explicitly retain the lower-arm setup coordinates and render a schematic shoulder-to-trunk connection. The line is a connectivity cue, not a measured scapula or clavicle.
- The two app references include a collapsed source-comparison record with exact source links and the limits of the correction.
- No autoplay or new playback behavior. No anatomical/professional review counter is increased.

## What remains unverified

The original coordinates, limb lengths in 3D, view-dependent foreshortening, joint angles, ROM, shoulder/scapular behavior, exact arm path, head/pillow contact, and muscle overlays are not professionally validated. Existing muscle overlays remain authoring hypotheses and are disabled in the ordinary reference view/export. This patch removes a demonstrated cross-movement mismatch; it does **not** claim a fully accurate or clinically safe demonstration. Source statements about precise setup (including pillow support and knee angle) are not fully represented by this inherited projection.

The NHS ordinary-chair sit-to-stand source was investigated but rejected as exact evidence for the Pilates-chair catalog entry because apparatus/setup equivalence is not established. That diagram remains unchanged and unverified.

## Verification

Final validation on 2026-11-07, integrated with main `da06641`:

- Full regression: 191 files / 2,101 tests passed. TypeScript passed. Full ESLint passed with one existing React-refresh warning outside this change.
- Production build/PWA, frozen motion ledger check and 7 Node tests passed. Production bundle size warnings remain; no deployment was performed.
- Export comparison against the previous gallery: only the six SVGs for these two movements changed; all other 288 SVG byte hashes and 96 pose-sequence signatures remained identical.
- Actual Chrome app QA: 320/390/1440px for both movements (six cases) passed. The diagram and source record begin collapsed, links/content correspond to the current exercise, the static SVG count remains one, there are no playback controls, and no document overflow was measured. Closing and opening the other exercise resets disclosure state. localStorage was unchanged; browser QA did not separately compare the entire in-memory store.
- Final 1440px three-phase screenshots were visually inspected for stationary clam arms/trunk, stationary open-book knees/lower arm, and the connected shoulder line. A 390px actual-app screenshot was also inspected. This is visual/software verification of the limited correction, not anatomical certification or observed-source-frame matching.
- Existing warning, professional-review count zero, canonical-motion status and no-autoplay behavior are preserved.

The regression tests assert distinct geometry, stationary nonmoving joints, return-to-start, and unchanged anatomical status. No deployment is authorized by this record.
