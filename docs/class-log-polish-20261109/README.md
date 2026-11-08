# Class-log concept polish · 2026-11-09

## Scope

Follow-up to the class-log design already integrated in main. The local three-device concept image was visually inspected: 1599 × 984, SHA-256 `e35b0e3257be8b0a59adaa7c8df3ca98410e710a7184068a1890edee9a947d8b`. The newly attached `(1)` file has different PNG bytes (RGBA encoding), but an independent RGBA pixel comparison confirmed exact visual equality: pixel SHA-256 `a3df3fac183344abfa139872828f2c4adf3513e7be44d303c0f78d012aefc8d7`. It is a design proposal with example inputs, not an operating product screenshot.

Changes are confined to `LogSessionModal.tsx`, its private CSS and its presentation tests:

- Separate the compact green planned-time badge from the plan/actual notice.
- Keep group creation immediately after its group select, before the date on mobile, with matching DOM and keyboard order.
- Put minute/second labels beside their inputs and simplify the duration container.
- Use a trailing disclosure chevron for the selected-movement section.
- Put the privacy guidance before the memo and associate it via `aria-describedby`.
- Align storage guidance and actions in one desktop footer row; retain stacked mobile actions and a separate scrolling content area.

The existing title, snapshot disclosure, duration guidance, storage warnings, draft recovery and validation remain. Shared dialogs/global styles and all state, snapshot, date-only, duplicate and persistence logic are unchanged. This is not a pixel-perfect reproduction: safety/record explanations and usable 44px targets are retained.

## Verification completed on the isolated candidate

- Five focused test files: 42 tests passed, including three new presentation/accessibility assertions.
- TypeScript passed. Full ESLint: zero errors, one existing react-refresh warning in `MotionAuthoringBatchFigure.tsx`.
- Production build and PWA check passed: 47 real static files. Existing large-chunk warnings remain.
- Motion-study ledger check and six Node tests passed. Secret check and seven Node tests passed.
- Chrome responsive QA at 320×568, 390×844, 768×1024 and 1440×1000: no horizontal overflow; persistent actions never cover content; visible buttons are at least 44px; movement validation, explicit zero duration, group creation, double-click protection, exact serialized save/reload, cancellation, Escape, focus trap/return and long titles passed.
- Real visible saved-class entry and timer-to-record flows passed at all four sizes. Date-only and blank duration semantics, multiline memo/rating, history reopening, exact saved/reloaded records and one-second timer duration were preserved.
- Actual pixels inspected at all four widths, narrow bottom scroll and long title/error states. The test browser uses only synthetic data and blocks external requests. This does not certify Safari, a physical phone, OS zoom, authentication or cloud backup.

The pnpm wrapper attempted dependency reconciliation because this isolated worktree reuses installed dependencies. It aborted before removing modules. No installation or module purge was allowed. Build and checks instead used the exact installed Node executables and scripts listed in package.json.

## Reproduce

Run the existing `docs/class-log-design-20261108/browser-check.cjs` and `visible-flow.cjs` against the candidate's local Vite server with their supported installed Playwright/Chrome overrides. For the first runner, adjust its loopback base URL to that server. The initial old baseline and later candidate must each be captured after restarting Vite if the environment cannot deliver filesystem watch events. For the final checks, Vite was restarted with polling enabled and the visible new badge/fields were verified in screenshots.

Representative current screenshots and visible-flow results accompany this report. No real user data, external content, source-image copy or raw environment values are included.

## Release boundary

No deployment command was run. The repository workflow is a tracked-file secret scan; package.json exposes Firebase deployment as an explicit manual script. The GitHub API also confirmed Pages uses the separate `gh-pages` branch (`legacy`, `/`), not `main`. Recent main pushes ran only the secret scan; the latest Pages deployment used a different gh-pages commit. Neither gh-pages nor Firebase deployment is changed here. Exact remote integration and aggregate results are recorded separately by the integrating worker.

## Integration checks

With upstream main `38ac8db` merged into candidate `8a2906b`, the entire unfiltered Vitest suite ran: 257 files, 2,715 tests; 256 files / 2,714 tests passed. The only failure is the existing `dynamicWorkflowFullCompletion.test.tsx:478` expectation that `ex-cooldown-01` has a rotation disclosure. The schedule worker independently reproduced that mismatch on the unchanged baseline and on upstream main. Neither that assertion nor the diagram mapping was changed. The real Chromium/PDF suite passed without exclusions.

The existing visible-flow runner now opens a saved card's optional More disclosure when necessary, so its actual record/timer entry works both before and after the independent saved-card simplification. All flow assertions remain.

### Final combined candidate

Source commit `2247ce0aaf00fa04a32d142b14d3efaf358372f5` includes the latest schedule main `6c6b371`. The entire unfiltered suite was repeated on this final product tree: **258 files / 2,724 tests; 257 files / 2,723 tests passed**, with only the same pre-existing rotation-disclosure expectation failure described above. Duration: 321.24 seconds. No tests were skipped or assertions weakened.

On this final source, TypeScript, full ESLint (zero errors and the same one warning), production build/PWA (47 static files), motion-ledger checks and secret checks passed again. Both complete class-log browser runners passed all four widths again, including validation, group creation, blank/zero/measured duration, repeated submit, draft/record persistence, Escape and focus return. A separate read-only browser pass against the saved-card candidate also passed all four widths through its visible More button; that candidate's integration is owned separately.

The only final footer adjustment replaced a `:has()` selector with a sibling selector, avoiding an unnecessary browser-support dependency. An independent reviewer found no material defects in the three source/test files and reran all eight presentation tests successfully.
