# Class-log modal design verification · 2026-11-08

Base: 61bffde20c2af7a70fb0733807f69228eac7df10. Local isolated clone, no remote fetch, push or deployment.

The actual supplied three-device concept image was visually inspected before implementation. It is a proposal, not an application screenshot. Its useful hierarchy already largely existed. Changes are intentionally limited to the modal: a clearer plan summary with short visible plan/actual explanation, collapsible source/snapshot detail, private responsive layout, and a separate persistent footer. All capture, selected-step, date-only, duration (including zero), duplicate guard, creation and save behavior remain unchanged. Storage warning remains outside disclosure; submit errors sit with the footer actions.

## Actual evidence

All attached PNGs are newly captured from the complete local App and its CSS using synthetic data, isolated browser context, reduced-motion browser preference not required (no motion added), and external request blocking. No real user records used.

- `modal-before-390.png`: 390×844, initial scrollTop=0. Old sticky actions visibly cover the seconds field. Preserved baseline at 320×568, 768×1024 and 1440×1000 too.
- `modal-after-{320,390,768,1440}.png`: same viewport sizes, content scrollTop=0.
- `modal-bottom-{320,390,768,1440}.png`: content scrolled to bottom. Memo and privacy hint remain above separate footer.
- `modal-error-390.png`: non-native selected-movement validation visible alongside Save.
- `modal-long-title-320.png`: long synthetic title at 320×568. Subtitle can scroll without hiding title, close, or footer.

Pixels inspected at all four after widths, long-title320, bottom320 and error390. Parent independently inspected before390/after390/error390/bottom320. No pixel-perfect claim, Safari/device/OS zoom certification, or server-backup claim.

## Reproduce

Start local Vite at `http://127.0.0.1:5194`. Run `node docs/class-log-design-20261108/browser-check.cjs`. `PLAYWRIGHT_PATH` and `CHROMIUM_PATH` optionally override the supplied installed local paths. Browser screenshots write to `/tmp/modal-*.png`. Runner blocks requests outside this loopback origin. No browser installation or network fetch needed.

The runner seeds synthetic state and launches the actual App modal via an existing hidden control using DOM click. Native keyboard/focus checks use an injected visible QA launch button. This verifies modal rendering and focus behavior, NOT real user navigation to the modal. Parent will verify a visible Saved flow separately.

Browser checks passed: four viewport widths, no content horizontal overflow, content/footer geometric separation, visible buttons at least44px, deselection validation, explicit zero duration, group creation, rapid double click producing one log, deep equality of complete saved/reloaded JSON record, cancellation without record mutation, long title, keyboard trap, close/Escape and native focus return. JSON object-key order is intentionally ignored; values and structure compare exactly.

## Tests

- Focused final: 4 files, 27 tests passed (new presentation3 + existing teaching9 + program record8 + persistence7).
- TypeScript `tsc -b`: passed.
- ESLint: 0 errors; existing MotionAuthoringBatchFigure react-refresh warning remains.
- Build and PWA check: passed, 44 real static files; existing large chunk warnings remain.
- Aggregate on product tree: 222 files/2456 tests passed; one existing ownership audit failed solely because it asserts a clean source worktree while these owned files were uncommitted. The only excluded suite is `src/features/classCueSheet/classCueSheetChromium.test.ts` (Linux-specific executable paths on Mac). New3 test file was added after aggregate discovery and passed separately. Clean-commit audit rerun is recorded below after execution.

Unchanged browser semantics and broader regression assertions were not weakened. No shared dialog, global CSS, store, schema, backup/date utilities or other owner's files changed.

Clean committed-tree rerun: homeFirstUseRound4.audit.test.tsx passed all 4 tests. Thus the sole aggregate failure was the expected uncommitted-worktree audit, now resolved without changing its assertions. Parent owns the final merged aggregate run.
