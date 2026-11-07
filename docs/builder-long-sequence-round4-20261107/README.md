# Builder Long Sequence (80-Step Mixed) Round 4 Verification Report (`2026-11-07`)

## 1. Scope & File Ownership Boundaries
- **Branch**: `feat/builder-long-sequence-round4-20261107` (branched from `origin/main` `ca38174`)
- **Owned Files Modified**:
  - [`src/components/SequenceOrderCard.tsx`](../../src/components/SequenceOrderCard.tsx)
  - [`src/components/SequenceWorkbench.tsx`](../../src/components/SequenceWorkbench.tsx)
  - [`src/styles/sequence-composition.css`](../../src/styles/sequence-composition.css)
  - [`src/components/SequenceOrderCard.test.tsx`](../../src/components/SequenceOrderCard.test.tsx)
  - [`src/components/SequenceWorkbench.classSection.test.tsx`](../../src/components/SequenceWorkbench.classSection.test.tsx)
  - `docs/builder-long-sequence-round4-20261107/**`
- **Strictly Untouched (Zero Diff)**:
  - `PackagePanel` / `package-panel` / `PackageDetail`
  - Home / History (`ClassBinderView.tsx`) / Atlas (`ExerciseAtlasView.tsx`)
  - Shared Store (`src/store/usePilatesStore.ts`), Schemas, Routes (`src/App.tsx`), Themes, and `src/utils/sequenceDrag.ts`

---

## 2. Diagnosed Defects in 80-Step Mixed Sequence (`80동작/휴식/블록 혼합`) & Minimal Fixes

| ID | Defect in 80-Step Mixed Sequence | Root Cause | Minimal Fix in Owned Builder Files | Before (`ca38174`) | After |
|---|---|---|---|---|---|
| **R4-01** | **Upward Cross-Section Drag Header Overlap**: Dragging card `13` (first card of `WARM-UP 준비 02:00` section) upward across `RestStepCard` `12` (`height: 264px`) to slot `11` shifted `RestStepCard` `12` down to `350..614px`, while `WARM-UP 준비 02:00` header remained at `457..481px` right on top of the shifted rest card. | `sequenceDrag.ts` only shifted headers for `i < from` when `element.parentElement !== sourceCard?.parentElement` and reset `header.style.transform` on every `tick()` before forcing layout via `getBoundingClientRect()`. | In [`SequenceOrderCard.tsx`](../../src/components/SequenceOrderCard.tsx), `syncActiveDragDom()` applies `header.style.translate = "0px <shift>px"` for all crossed section headers (`to <= k - 1 && k <= from` on upward drag, `from < k && k <= to` on downward drag) and clears on drop/cancel. | `warmHeader2: 457..481px` overlaps `c12: 350..614px` (`upwardCrossSectionOverlap: true`) | `warmHeader2: 618..642px` cleanly below `c12: 350..614px` (`upwardCrossSectionOverlap: false`) |
| **R4-02** | **Last-Child Card Margin Jump (`+10px`)**: Starting a drag on the last card in any `.pf-sequence-block__body` (e.g., card `11` before a Rest block) caused all 68 subsequent cards to jump down by `10px`. | Appending `.sequence-drag-overlay` inside `.pf-sequence-block__body` made the last `.sequence-order-card` no longer match `:last-child`, re-applying `margin-bottom: 10px` after `rects` was measured. | In [`sequence-composition.css`](../../src/styles/sequence-composition.css), added `.pf-sequence-block__body > .sequence-order-card:nth-last-child(2):has(+ .sequence-drag-overlay) { margin-bottom: 0; }`. | `lastChildMarginJumpPx: 10px` | `lastChildMarginJumpPx: 0..1px` (subpixel rounding only) |
| **R4-03** | **200% CSS Zoom (`zoom: 2`) Drag Overlay & Drop Indicator Double-Scaling**: At `200%` zoom, `.sequence-drag-overlay` and `.sequence-drop-indicator` rendered at `2×` card width (`516px` vs `258px` on `390px` viewport) and `2×` left offset (`132px` vs `66px`). | `getBoundingClientRect()` returns zoomed viewport pixels (`2×`), which were assigned as CSS `px` inside `html { zoom: 2 }` and multiplied by `2` a second time. | In [`SequenceOrderCard.tsx`](../../src/components/SequenceOrderCard.tsx), `syncActiveDragDom()` normalizes `overlay`, `indicator`, and card/header transform `px` values by `1 / zoomFactor` when `zoomFactor !== 1`. | `overlayWidthDiffPx: 258px`, `indicatorWidthDiffPx: 258px`, `overlayLeftDiffPx: 66px` | `overlayWidthDiffPx: 0px`, `indicatorWidthDiffPx: 0px`, `overlayLeftDiffPx: 0px` |
| **R4-04** | **Screen Reader Order Announcements & Undo Silence**: (1) Drag-start instruction (`이동 중...`) was immediately overwritten in the same event turn by same-slot `1번째 위치...`. (2) Drop/keyboard commit did not announce the new 1-based target slot (`N번째 위치`). (3) Clicking `되돌리기` (Undo) called `setNotice('')`, wiping out the live region (`undoAnnouncement: null`). (4) `[data-plan-feedback]` lacked explicit `aria-live="polite"` and `aria-atomic="true"`. | Synchronous batching of `begin()` + `draw()` notices; missing target index lookup in `move()`; `setNotice('')` in Undo button handler. | Updated [`SequenceOrderCard.tsx`](../../src/components/SequenceOrderCard.tsx) and [`SequenceWorkbench.tsx`](../../src/components/SequenceWorkbench.tsx) to preserve drag-start notice, announce `${nextIndex + 1}번째 위치로 바꿨어요`, announce Undo completion, push undo snapshot on reusable block insertion, and set `aria-live="polite" aria-atomic="true"`. | `commitIncludesNewPosition: false`, `undoAnnouncement: null`, `liveRegionAriaLive: null` | `commitIncludesNewPosition: true` (`8번째 위치로`), `undoAnnouncement: "이전 순서로 되돌렸어요. 현재 총 80개 항목입니다."`, `liveRegionAriaLive: "polite"` |
| **R4-05** | **Reduced Motion (`prefers-reduced-motion: reduce`)**: Ensure immediate card/header/overlay/indicator movement with zero animation delay. | `.sequence-drag-overlay`, `.sequence-drop-indicator`, and `.pf-sequence-block__header` needed explicit `!important` transition/animation suppression in `sequence-composition.css`. | Added explicit `@media (prefers-reduced-motion: reduce)` rules with `transition: none !important; animation: none !important;` in [`sequence-composition.css`](../../src/styles/sequence-composition.css). | `movedImmediatelyAtZeroMs: true` | `movedImmediatelyAtZeroMs: true` (`174px` at `0ms`, `overlayRemovedImmediately: true`) |

---

## 3. Real Browser Viewport & 200% Zoom Matrix (`80 Steps = 76 Movements/Blocks + 4 Rests`)

Verified in headless Chromium (`Chromium 156.0.8078.79`) via [`verify-builder-long-sequence-round4.mjs`](./verify-builder-long-sequence-round4.mjs). Raw JSON evidence is stored in [`evidence/before-metrics.json`](./evidence/before-metrics.json) and [`evidence/after-metrics.json`](./evidence/after-metrics.json).

| Viewport | Zoom | Total Steps / Rests / Sections | Horizontal Overflow (`px`) | Card Width (`px`) | Before Overlay / Indicator Width (`px`) | After Overlay / Indicator Width (`px`) | After Width & Left Diff (`px`) | Indicator Overlaps Shifted Card |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `320×640` | `100%` | `80 / 4 / 11` | `0` | `266` | `266 / 266` | `266 / 266` | `0 / 0` | `false` |
| `390×844` | `100%` | `80 / 4 / 11` | `0` | `324` | `324 / 324` | `324 / 324` | `0 / 0` | `false` |
| `768×1024` | `100%` | `80 / 4 / 11` | `0` | `690` | `690 / 690` | `690 / 690` | `0 / 0` | `false` |
| `1440×900` | `100%` | `80 / 4 / 11` | `0` | `1123` | `1123 / 1123` | `1123 / 1123` | `0 / 0` | `false` |
| `320×640` | `200%` | `80 / 4 / 11` | `0` | `212` | `424 / 424` (Mismatch `212px`) | `212 / 212` | `0 / 0` | `false` |
| `390×844` | `200%` | `80 / 4 / 11` | `0` | `258` | `516 / 516` (Mismatch `258px`) | `258 / 258` | `0 / 0` | `false` |
| `768×1024` | `200%` | `80 / 4 / 11` | `0` | `612` | `1224 / 1224` (Mismatch `612px`) | `612 / 612` | `0 / 0` | `false` |
| `1440×900` | `200%` | `80 / 4 / 11` | `0` | `821` | `1642 / 1642` (Mismatch `821px`) | `821 / 821` | `0 / 0` | `false` |

---

## 4. Long-Sequence Auto-Scroll, Cancel/Undo, and Screen Reader Order Guidance

| Scenario | Before (`ca38174`) | After |
|---|---|---|
| **Drag Start Announcement (`[data-plan-feedback]`)** | Overwritten in same frame by `1번째 위치. 놓으면 순서가 바뀝니다.` | `"1번 캐리지 호흡 & 암 아크 이동 중. 놓을 위치로 끌어 주세요. Escape 키로 취소할 수 있습니다."` |
| **Off-Screen Auto-Scroll Downward (`390×844`, `y = 755`)** | `+510px` (`indicator: 7번째 위치`) | `+480px`..`+540px` (`indicator: 7번째 위치` / `8번째 위치`, `targetSlotAnnouncement` updated live) |
| **Off-Screen Auto-Scroll Upward (`390×844`, `y = 28`)** | `-113px` | `-187px`..`-198px` |
| **Drop Commit Announcement** | `"1번 캐리지 호흡 & 암 아크 순서를 바꿨어요. 되돌릴 수 있습니다."` (no target slot index) | `"1번 캐리지 호흡 & 암 아크 순서를 8번째 위치로 바꿨어요. 되돌릴 수 있습니다."` |
| **Escape / PointerCancel During Drag** | `"순서 이동을 취소했어요. 원래 순서를 유지합니다."` | `"순서 이동을 취소했어요. 원래 순서를 유지합니다."` (`orderUnchangedAfterCancel: true`) |
| **Undo (`되돌리기`) Button Announcement** | `null` (cleared live region via `setNotice('')`) | `"이전 순서로 되돌렸어요. 현재 총 80개 항목입니다."` (`indexAfterUndo: 0`, `role="status" aria-live="polite"`) |

---

## 5. Before / After Visual Evidence Screenshots
- [`screenshots/before-390-upward-cross-section.png`](./screenshots/before-390-upward-cross-section.png) vs [`screenshots/after-390-upward-cross-section.png`](./screenshots/after-390-upward-cross-section.png)
- [`screenshots/before-390-zoom200-drag.png`](./screenshots/before-390-zoom200-drag.png) vs [`screenshots/after-390-zoom200-drag.png`](./screenshots/after-390-zoom200-drag.png)
- [`screenshots/after-mobile-320.png`](./screenshots/after-mobile-320.png), [`screenshots/after-mobile-390.png`](./screenshots/after-mobile-390.png), [`screenshots/after-tablet-768.png`](./screenshots/after-tablet-768.png), [`screenshots/after-desktop-1440.png`](./screenshots/after-desktop-1440.png), [`screenshots/after-mobile-390-zoom200.png`](./screenshots/after-mobile-390-zoom200.png)
