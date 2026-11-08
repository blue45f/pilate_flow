# Independent verification — 2026-11-08

## Exact source and scope

Verified source commit: 2b2b19cf01701cf2ed4c3d5866ce80e6a7305d17. Later commits before this report contain documentation/evidence only; source-tree equality was checked. Only the history view presentation and its focused regression test changed. No production deployment occurred.

## Aggregate checks

- `TZ=Asia/Seoul node node_modules/vitest/vitest.mjs run --exclude src/features/classCueSheet/classCueSheetChromium.test.ts`: **223 files, 2,456 tests passed**, duration 263.46 s. The Linux-specific Chromium/PDF test was excluded on this Mac because its required executable paths are absent; it is not claimed passed. Log: `/tmp/pilates-history-design-full.log`.
- Independent full lint: **0 errors, 1 existing warning**, `MotionAuthoringBatchFigure.tsx:241:20`, `react-refresh/only-export-components`. Log: `/tmp/pilates-history-design-independent-lint.log`.
- Implementation worker separately passed TypeScript, focused 20 tests, production build and 43-file PWA verification. No source change followed these checks.

## Additional actual Chrome checks

Fresh isolated contexts using the actual App and full CSS chain, external requests and service workers blocked. Synthetic history only. Ordinary 12-movement record and long-title 24-movement record, each at 320×568 and 390×844, CSS zoom 1 and 2: **8 scenarios passed**.

- All document horizontal overflow measurements were zero.
- Primary actions remained scrollable into a visible area above bottom navigation; measured top was >=0 and bottom <=navigation top in all 8 cases. `elementFromPoint` confirmed the button was the actual hit target.
- Every scenario downloaded a TXT file from the detail dialog, checked the date-bearing filename and content including the saved memo, and kept serialized source history unchanged.
- Detail Escape/focus restoration, search/clear, keyboard disclosures, and copying 12/24 steps into a new workbench passed.
- Short-height captured action positions include the export feedback banner and must not be compared directly with initial first-screen captures. Scrolling is required at these heights; no universal above-the-fold claim.
- Pixels independently inspected for 390px ordinary record and 320px/200% zoom action target. At 200% text wraps heavily but remains available rather than truncated.

Machine-readable results and representative screenshots: `evidence/independent/`. Runners are execution-only files in `/tmp/pilates-history-short-{normal,interaction}-20261108.mjs`; they were not added to product source.

## Limits

CSS zoom is not a certification of browser toolbar or OS accessibility zoom. Actual iOS Safari was not exercised in this pass. The shared App header still overlaps at 320px/200% CSS zoom; this predates and is outside the history-only change. The first capture's short-screen bottom navigation may cover an action before scrolling, but the full action is reachable and clickable after scrolling. Original v4/v5 mockups were not available; comparison used prior repository captures and the actual current App, not those originals.

This validates the **history page only**, not completion of all application mockups. Existing app features, dates, durations, snapshots and backup formats were preserved. Remote main and external CI are reported separately after publication; no deployment is part of this work.
