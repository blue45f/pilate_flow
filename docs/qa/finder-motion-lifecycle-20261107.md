# Finder motion lifecycle verification — 2026-11-07

Base: ae4175c. No production deployment performed.

The retained movement finder now passes its visible state to the existing motion preview controller. Closing the finder pauses playback; reopening preserves search and preview state without restarting playback. No sequence, saved-program, or catalog data is changed.

Validation:
- Full Vitest: 188 files, 2089 tests passed (2026-11-07 03:05–03:08 KST).
- Type check, ESLint, production build, PWA verification, motion ledger integrity: passed. Existing fast-refresh export warning and bundle-size warning remain.
- Chrome headless browser regression: 320, 390, 768, 1100, 1150, 1200, 1440px passed. Includes reduced-motion, explicit playback, close/reopen without autoplay, preserved filters, nested detail return/focus, keyboard focus trapping, inspector, keyboard reorder/undo, save/reload, and horizontal overflow.
- The initial browser run incorrectly selected unmapped “골반 시계” to open a motion preview. The corrected regression uses mapped “서서 발목 움직임”. Actual mobile thumbnail is visible (390px: 86 × 126px); no CSS restoration was needed or applied.
- Safari, physical devices, and production were not tested in this change.

Browser command (existing local Playwright installation required):

    PLAYWRIGHT_MODULE=<existing-playwright-module> BASE_URL=http://127.0.0.1:5263 OUT_DIR=<output-directory> node scripts/qa/workbench-picker-browser.cjs

Unit regression: src/components/InlineExerciseFinder.test.tsx.
