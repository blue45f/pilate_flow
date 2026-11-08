# History reading clarity — 2026-11-08

## Scope and evidence

Source commits: 9ca0b80, 2b2b19c, based on main 352dabd. Only the history presentation, its dedicated stylesheet, and a history regression test changed. Saved-class presentation, storage, backup, date resolution, copy, voice, and detailed-history modal logic are unchanged. No installation, remote push, deployment, or main integration was performed.

Reference pixels inspected: round5-mobile-390-100pct.png and round5-desktop-1440-100pct.png under ../history-zoom-clarity-round5-20261107/evidence/screenshots. Original v4/v5 mockups were not available and were not used.

All new screenshots render the actual App and its complete production CSS import chain through Vite on localhost:5268. Google Chrome, isolated Playwright contexts, external requests blocked, service workers blocked, synthetic records only. Viewports: 320, 390, 768, 1440 wide, each 900 high. Reduced motion enabled. CSS zoom 1 and 2 was used for the stress matrix; this is not an OS-level accessibility or browser-toolbar zoom certification.

## Design decisions

The old dedicated stylesheet imposed 12px text, 1.15 line-height, 1–4px spacing, a two-column card, nowrap and clipping. It hid restoration warnings on narrow cards. The replacement uses 20px/30px titles, 16px/27.2px memo text, 14px metadata, 44px minimum controls and a quiet single-column reading order.

Date groups carry the visible calendar date; each card retains its semantic time element for assistive technology. Actual recorded time and actual-versus-planned duration remain visible. Date-only records do not fabricate a time.

Search is always available. Date/group filters open on demand; active selection and clear-selection control remain outside the disclosure. Class composition, detailed timing, source badges and all movements remain in a native details disclosure. Memo, sample-data badge, source-drift warning, unavailable-movement warning and primary action remain outside it. User memo line breaks are preserved.

The source warning no longer inherits the global 200px flex basis, which had pushed actions downward in an early iteration. The global body minimum width is relaxed only while the history view exists, preventing a 640px document at 320px/200% zoom.

## Before/after comparison

evidence/before.json and after.json use the SAME 12 synthetic records as the old round5 seed. That inherited seed refers to missing exercise IDs: these captures demonstrate unavailable-movement presentation, not successful reuse.

At 390×900:
- Before: first card y270.8, actions y378.1, title 14px/16.1px, memo 12px.
- After: first card y461.4, actions y717.0, title 20px/30px, memo 16px.
- Both have zero document horizontal overflow.
- Tradeoff: fewer cards above the fold, but full titles/memos and the formerly hidden missing-movement warning are readable. The first intermediate redesign put actions at y814; collapsed filters brought them up by approximately 97px without shrinking text.

The separate valid-record fixtures are in evidence/interaction.json (24 movements, long title) and evidence/normal/interaction.json (12 movements, ordinary title). Both use a two-line memo and the same real application catalog exercise, plus explicit-time and unavailable-movement records.

At 390×900, valid normal primary action y679.2–723.2; long-title primary action y739.2–783.2. The bottom navigation begins around y824 in these screenshots, so both are fully above it AT THIS HEIGHT. Do not generalize that to 390×844 or 320×568: short heights and long content require scrolling. At 320×900, normal action y747.9–791.9; long-title action y777.9–821.9 is near the bottom navigation.

All eight size/zoom combinations had zero document horizontal overflow and minimum 44px physical button height. At 200%, long text wraps substantially and actions require scrolling. qa-action-* screenshots show the actions after scrolling. No information is truncated to claim an above-the-fold win.

## Verification

Passed on final source:
- ClassBinderView.historyFlow: 11 tests, including new disclosure/visible-action structure coverage.
- LogSessionModal.dateOnly: 9 tests.
- TypeScript build.
- Full eslint . (no output, success).
- Vite production build and PWA verification: 43 real static files, manifest and PNG icons. Existing >500kB chunk warning remains.

Actual browser checks, on all four viewport widths:
- Native filter disclosure and composition disclosure via keyboard Enter.
- 24/12 movement pills retained when composition opens.
- Date-only metadata hides time; explicit local midnight remains 00:00 in Asia/Seoul.
- Missing movements disable reuse and retain their visible explanation.
- Detail modal opens via Enter, dismisses with Escape, and restores trigger focus.
- Tab advances to a button with visible focus outline.
- Empty search removes cards; clear search restores them.
- Copy produces 24/12 workbench steps, navigates to workbench, and leaves serialized source history unchanged.
- Source history also remains unchanged after search, disclosure and zoom.
- Reduced-motion contexts, isolated storage and blocked external traffic.

Pixels directly inspected: before-390, after-390, after-1440, normal/qa-390-1x, qa-action-1440-1x, qa-action-390-2x, qa-action-320-2x, plus the original reference screenshots.

## Limits and follow-up

Full regression is being run independently by the parent against 2b2b19c; its final result belongs in the independent verification report. The Linux-only classCueSheetChromium test was not run on this Mac. Text export was preserved but not newly clicked in this browser pass; existing focused/full tests provide the regression evidence where applicable.

At 320px/200% CSS zoom, the shared app-header logo and new-movement control overlap. The history body and actions reflow without horizontal overflow, but this screenshot must not be reported as a complete whole-app zoom pass. Shared header redesign is outside this history-only change.

Short-height navigation occlusion requires separate review. No claim of first-action visibility at every height is made.

Execution-only runners are preserved outside the checkout at /tmp/history-reading-runners-20261108. They were not committed; historical fixture extraction and Mac-specific executable paths are not production code. Evidence contains synthetic data only.
