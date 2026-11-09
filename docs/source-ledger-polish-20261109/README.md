# Source ledger reading hierarchy

Local-only change from 74001d4, isolated from the existing workbench/rig polish branch. No push, merge, deployment, network repository access or user browser session was used.

The actual ExtendedMotionVerificationPanel was rendered with the repository's Swan Prep catalog entry and semantic tokens in a temporary isolated Vite fixture. Baseline at 320px was 1,299px tall; after the change the complete fixture fits within 900px. This is component-level browser evidence, not a full application journey or clinical verification.

- Three equal phase controls replace three vertically stacked buttons; accessible names, roving focus, phase selection and geometry are unchanged.
- Native details/summary folds the source records and hashes; review boundaries and the statement of zero professional/external clinical approvals remain visible outside it.
- Scoped brand slider/link colors, consistent line height, visible focus rings and wrapping preserve the ivory/forest design contract.
- Chromium: 320/390/768/1440px, 100%/200% root text size, no horizontal document overflow, >=44px phase targets, Home/End/ArrowLeft keyboard changes, slider Home, and two disclosure open/close cycles passed with reduced motion enabled.
- Before/after pixels were inspected at 320px. No source data, hashes, anatomical model, review gates, saved data or external services were changed.

The normal pnpm verify:all entry attempted an automatic dependency install against the shared node_modules symlink and aborted without a TTY. Dependencies were not reinstalled or purged. Equivalent constituent commands were run directly against existing executables; see final validation status in the task report.

Validation completed: focused Vitest 2 files/4 tests passed; focused ESLint passed; whole-repository ESLint exited 0 with two existing warnings; Vite production bundling and PWA build check passed. TypeScript failed in three untouched files: aiSequenceSafetyVerifier.ts:67 (readonly array), instructorVoiceScriptGenerator.ts:69 (balanced key), memberConditionLayerAdvisor.ts:60 (abdominal category). Therefore the aggregate release gate is not green and this branch is not claimed release-ready.

To reproduce the isolated browser fixture locally, copy ledger-preview.html and ledger-preview.tsx from this folder to the checkout root, run Vite on 127.0.0.1:5286, and run capture.cjs or verify-browser.cjs using an existing Playwright/Chrome installation. The scripts contain the verified local Mac paths used for this run. Move the temporary root fixture files back out of the checkout before lint/build; they are not application routes.

Full test run: 284 files, 2,858 tests; 282 files / 2,855 tests passed and three assertions failed in two files because that first run saw an uncommitted source change and no dist build yet. These are test setup preconditions, not ignored failures. The two affected files were rerun after the local commit and completed build; consult the retained recheck log for exact results. A single clean full-suite pass is not claimed.
