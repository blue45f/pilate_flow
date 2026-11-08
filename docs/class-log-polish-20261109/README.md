# Class-log concept polish · 2026-11-09

## Scope

Follow-up to the class-log design already integrated in main. The local three-device concept image was visually inspected: 1599 × 984, SHA-256 `e35b0e3257be8b0a59adaa7c8df3ca98410e710a7184068a1890edee9a947d8b`. It is a design proposal with example inputs, not an operating product screenshot.

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

No deployment command was run. The repository workflow is a tracked-file secret scan; package.json exposes Firebase deployment as an explicit manual script. This observation does not prove the absence of separately configured hosting hooks. Exact remote integration and aggregate results are recorded separately by the integrating worker.
