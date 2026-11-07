# Track B Independent Verification Report — History Mobile First-Card Readability & Reuse Action Exposure (Round 4, 2026-11-07)

- **Repository / Working Directory**: `/home/antigravity/blue45f/pilate_flow`
- **Verified Branch**: `fix/history-first-card-round4-20261107`
- **Baseline Compared**: `main` (and Round 3 commit `ca38174` / Round 2 commit `606f7ad`)
- **Verification Date**: `2026-11-07`
- **Overall Verdict**: **PASS (All Round 4 requirements independently verified with honest viewport & unobstructed measurements)**

---

## 1. Git Branch & Strict File Ownership Verification

Executed:
```bash
git branch --show-current
git status --short
git diff --stat main
wc -l src/components/ClassBinderView.tsx src/components/ClassBinderView.css src/components/ClassBinderView.historyFlow.test.tsx
```

### Observed Output
- **Active branch**: `fix/history-first-card-round4-20261107`
- **`git status --short`**:
  - `M src/components/ClassBinderView.css`
  - `M src/components/ClassBinderView.historyFlow.test.tsx`
  - `M src/components/ClassBinderView.tsx`
  - `?? docs/history-first-card-round4-20261107/`
- **`git diff --stat main`**:
  - `src/components/ClassBinderView.css | 539 ++++++++++++++++++---`
  - `src/components/ClassBinderView.historyFlow.test.tsx | 119 +++++`
  - `src/components/ClassBinderView.tsx | 4 +-`
  - `3 files changed, 597 insertions(+), 65 deletions(-)`
- **Line counts (`wc -l`)**:
  - `src/components/ClassBinderView.tsx`: `1,595` lines
  - `src/components/ClassBinderView.css`: `581` lines
  - `src/components/ClassBinderView.historyFlow.test.tsx`: `885` lines
- **Protected / Non-Goal Files Confirmed Untouched (`0` changes)**:
  - `src/styles/**` (shared CSS): **0 files modified**
  - `src/store/**`: **0 files modified**
  - `src/schemas/**`, `src/types/**`: **0 files modified**
  - Routes, themes, `PackagePanel`, `package-panel`, `PackageDetail`: **0 files modified**

---

## 2. Source Code Diff & Minimal Change Footprint Audit

### 2.1 `src/components/ClassBinderView.tsx` (`+3 / -1` lines)
- Only changes the root wrapper class from:
  ```tsx
  <div className="teaching-collection">
  ```
  to:
  ```tsx
  <div
    className={`teaching-collection ${view === 'history' ? 'teaching-collection--history' : 'teaching-collection--saved'}`}
  >
  ```
- **Zero feature/record deletion**: All header elements (`수업 기록`, total count badge, `수업 그룹 추가` button), separation banner (`진행한 수업 · 당시 내용 보존`), search input (`수업 기록 검색`), group filter buttons, date exploration chips/toggles, and history card fields remain intact.
- **Zero silent selection resets**: Local state (`selectedGroupId`, `selectedDate`, `isDateNavExpanded`, `isMobileDateViewport`, `visibleHistoryCount`) and resize/expand/collapse handlers preserve active group and date selections across `320px <-> 390px` viewport changes.
- **Natural DOM & visual order preserved inside `.teaching-history-card`**:
  `time.teaching-history-date` (+ time-of-day, duration, group badge) → `h2` sequence title → `.teaching-card-stats` → `.teaching-rest-summary` → `.teaching-history-badges` → `.teaching-reflection` → `.teaching-history-exercises` → `.teaching-history-bottom` (`이력 다시 열기` + `이 수업 다시 계획`).

### 2.2 `src/components/ClassBinderView.css` (`581` lines total)
- All Round 4 vertical-density and horizontal-strip rules are strictly scoped under `.teaching-collection--history` (`@media (min-width: 641px)` and `@media (max-width: 640px)`), preventing any visual side effects on the Saved Sequences view (`.teaching-collection--saved`) or any other component.
- On mobile (`<= 640px`), `.teaching-collection--history` compacts:
  - `.teaching-page-header` to a single row (`44px` height, `min-height: 44px` on `수업 그룹 추가`),
  - `.teaching-separation-banner` to a single-line status bar (`22px` height),
  - `.teaching-collection-toolbar` to `47px` height,
  - `.teaching-group-filters` to a single-row horizontal scroll strip (`44px` height, `min-height: 44px` buttons),
  - `.teaching-date-nav.is-collapsed` to a single-row horizontal chip strip (`98px` total height for both 4 chips and 5 chips when an older date is pinned),
  - `.teaching-history-card` padding and typography so the entire first card (`208px` height on `320px`, `193px` height on `390px`) fits above the fixed `.bottom-nav` while keeping `min-height: 44px` on both `이력 다시 열기` and `이 수업 다시 계획`.

---

## 3. Independent Execution of Verification Commands

All four required verification commands were executed independently in `/home/antigravity/blue45f/pilate_flow`:

1. **TypeScript project build check**:
   ```bash
   npx tsc -b
   ```
   - **Result**: Exit code `0` (`0` errors).

2. **ESLint verification**:
   ```bash
   npx eslint src/components/ClassBinderView.tsx src/components/ClassBinderView.historyFlow.test.tsx docs/history-first-card-round4-20261107/verify-first-card-round4.mjs
   ```
   - **Result**: Exit code `0` (`0` errors, `0` warnings).

3. **Vitest regression & scale audit under `TZ=UTC`**:
   ```bash
   TZ=UTC npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx
   ```
   - **Result**: Exit code `0` — `2 passed` test files, `11 passed (11)` tests (`ClassBinderView.historyFlow.test.tsx`: 9 tests including Round 4 `320px`/`390px` scoping, DOM order, resize state retention, and primary reuse action test; `historyScaleUsability.audit.test.tsx`: 2 tests covering 100 and 1,000 accumulated records, KST/UTC midnight boundaries, `12:00`/`00:00` time preservation, pagination, and deleted-exercise guards).

4. **Vitest regression & scale audit under `TZ=Asia/Seoul`**:
   ```bash
   TZ=Asia/Seoul npx vitest run src/components/ClassBinderView.historyFlow.test.tsx docs/history-scale-audit-20261107/historyScaleUsability.audit.test.tsx
   ```
   - **Result**: Exit code `0` — `2 passed` test files, `11 passed (11)` tests.

---

## 4. Metrics & Visual Screenshot Evidence Audit

Inspected [`docs/history-first-card-round4-20261107/evidence/round4-first-card-metrics.json`](./evidence/round4-first-card-metrics.json) and visually inspected the captured Chromium (`156.0.8078.79`) screenshots in [`docs/history-first-card-round4-20261107/evidence/screenshots/`](./evidence/screenshots/).

### 4.1 Mobile `320×694` & `390×844` Before (Round 3 `ca38174`) vs. After (Round 4)

| Metric (`scale1000`, `100%` zoom) | `320×694` Round 3 (`ca38174`) | `320×694` Round 4 (Verified) | `390×844` Round 3 (`ca38174`) | `390×844` Round 4 (Verified) |
| :--- | :---: | :---: | :---: | :---: |
| Viewport Height / Unobstructed Bottom (`bottomNavTopPx`) | `694px` / `618px` | **`694px` / `618px`** | `844px` / `768px` | **`844px` / `768px`** |
| Header / Banner / Toolbar / Group / DateNav Heights | `164 / 72 / 80 / 230 / 156px` | **`44 / 22 / 47 / 44 / 98px`** | `150 / 66 / 76 / 206 / 156px` | **`44 / 22 / 47 / 44 / 98px`** |
| `firstCardTopPx` → `firstCardBottomPx` | `841px` → `1253px` (offscreen) | **`364px` → `572px`** (`208px` height) | `812px` → `1180px` | **`364px` → `556px`** (`193px` height) |
| `cardVisibleHeightViewportPx` | `0px` (`0%`) | **`208px` (`100%`)** | `32px` (`8.7%`) | **`192px` (`100%`)** |
| `cardVisibleHeightUnobstructedPx` (above `.bottom-nav`) | `0px` (`0%`) | **`208px` (`100%`)** | `0px` (`0%`) | **`192px` (`100%`)** |
| First Card Date (`<time>`) Visible Unobstructed | `false` | **`true` (`373px..391px`)** | `false` | **`true` (`373px..391px`)** |
| First Card Title (`<h2>`) Visible Unobstructed | `false` | **`true` (`395px..427px`)** | `false` | **`true` (`395px..411px`)** |
| Primary Reuse Action (`이 수업 다시 계획`) Visible Unobstructed | `false` | **`true` (`521px..565px <= 618px`)** | `false` | **`true` (`505px..549px <= 768px`)** |
| Reopen Action (`이력 다시 열기`) Visible Unobstructed | `false` | **`true` (`565px <= 618px`)** | `false` | **`true` (`549px <= 768px`)** |
| `scrollNeededForPrimaryReusePx` | `635px` | **`0px`** | `412px` | **`0px`** |
| Touch Target Min Height / Horizontal Overflow | `44px` / `0px` | **`44px` / `0px`** | `44px` / `0px` | **`44px` / `0px`** |

- **Visual confirmation**:
  - [`round4-scale-1000-mobile-320.png`](./evidence/screenshots/round4-scale-1000-mobile-320.png): Shows the entire first card (`2026년 11월 7일 09:05`, `심야 개인 레슨 흉추 가동성 플로우 (UTC 00:05)`, stats, rest summary, badges, reflection, exercises, `이력 다시 열기`, and `이 수업 다시 계획`) plus the header of the second card above the bottom navigation bar.
  - [`round4-scale-1000-mobile-390.png`](./evidence/screenshots/round4-scale-1000-mobile-390.png): Shows both the entire first card and nearly the entire second card (including the second card's action buttons) above the bottom navigation bar.

### 4.2 Tablet `768×1024` & Desktop `1440×900` (`100%` Zoom)
- **Tablet `768×1024`** ([`round4-scale-1000-tablet-768.png`](./evidence/screenshots/round4-scale-1000-tablet-768.png)):
  - Retains the desktop/tablet 13-chip default (`전체 날짜` + 12 recent dates, `dateNavHeightPx = 256px`).
  - `firstCardTopPx = 691px`, `firstCardBottomPx = 1000px`, `cardVisibleHeightViewportPx = 309px (100%)`, `cardVisibleHeightUnobstructedPx = 257px` (above `.bottom-nav` at `948px`).
  - First card date (`706..730px`) and title (`737..758px`) are 100% visible unobstructed (`true`).
  - Primary reuse button (`943..987px`) is inside the `1024px` viewport (`primaryReuseActionVisibleInViewport = true`) and overlaps the fixed `.bottom-nav` (`948px`) by `39px`, which is honestly reported as `primaryReuseActionVisibleUnobstructed = false`, `scrollNeededForPrimaryReusePx = 39px`.
- **Desktop `1440×900`** ([`round4-scale-1000-desktop-1440.png`](./evidence/screenshots/round4-scale-1000-desktop-1440.png)):
  - Retains 13 date chips (`dateNavHeightPx = 156px`, `0.17` of viewport).
  - `firstCardTopPx = 552px`, `firstCardBottomPx = 832px`, `cardVisibleHeightViewportPx = 280px (100%)`, `cardVisibleHeightUnobstructedPx = 280px (100%)`.
  - Date (`568..592px`), title (`598..620px`), `이력 다시 열기`, and `이 수업 다시 계획` (`775..819px <= 900px`) are all 100% visible unobstructed (`scrollNeededForPrimaryReusePx = 0px`).

### 4.3 Separate Readability-First Evaluation of `200%` Zoom
- **`Mobile 390×844 @ 200%`** ([`round4-scale-1000-mobile-390-zoom200.png`](./evidence/screenshots/round4-scale-1000-mobile-390-zoom200.png)):
  - `docOverflowPx = 0`, `maxCardOverflowPx = 0`, `touchTargetMinHeightPx = 88px` (`44px × 2`).
  - `firstCardTopPx = 727px`, `firstCardBottomPx = 1144px`, `unobstructedBottomPx = 1234px`, `cardVisibleHeightUnobstructedPx = 417px (100%)`.
  - Date (`true`), Title (`true`), and Primary Reuse Action (`1042..1130px <= 1234px`, `true`) are all visible unobstructed with `scrollNeededForPrimaryReusePx = 0px`.
  - **Verdict**: **PASS (Readability + Zero-Scroll First Card Exposure achieved simultaneously)**.
- **`Desktop 1440×900 @ 200%`** ([`round4-scale-1000-desktop-1440-zoom200.png`](./evidence/screenshots/round4-scale-1000-desktop-1440-zoom200.png)):
  - `docOverflowPx = 0`, `maxCardOverflowPx = 0`, `touchTargetMinHeightPx = 88px` (`44px × 2`).
  - Because Desktop preserves all 6 group filter pills and 13 date chips at 200% physical scale (`88px` min-height per chip row) for readability without forced truncation or hiding, `groupFiltersHeightPx = 305px` and `dateNavHeightPx = 812px`, placing `firstCardTopPx` at `1945px` (`cardVisibleHeightUnobstructedPx = 0px`, `scrollNeededForPrimaryReusePx = 2968px`).
  - **Verdict**: **PASS (Honest Separate Readability-First Judgment — zero overflow and full 200% legibility preserved; scrolling required to reach cards on 900px-tall desktop viewport at 200% zoom)**.
