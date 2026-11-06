# On-demand movement picker review — 2026-11-06

## Scope and design

This follow-up is separate from the 7b9c6b4 drag release. The normal workbench now shows the sequence, current time, save and a visible “동작 더 담기” entry. The movement picker opens only on request at every width, reusing the existing mobile dialog. The desktop properties rail appears only for a selected movement. Closing, reopening and resizing retain the same picker instance, search and filter state. No catalog, review record, step metadata, persistence action or teaching eligibility was changed.

The approved v4 desktop/mobile concept was inspected directly, as were the prior and current 390/1440px application captures with the same three movements and 850px height. Neutral canvas, white surfaces, ink text, teal actions, compact section headers and accessible reorder alternatives are retained. The concept’s explanatory drawings and example values were not imported as movement evidence. This is not a claim of pixel-identical reproduction.

Compared with the immediate 7b9c6b4 baseline, the 1440px sequence gains the space previously occupied by the always-visible finder (832px → 1176px). Its first-card vertical position and height remain unchanged. At 390px the new immediately visible add entry costs one control row: the first card moves from about y510 to y554. The card and its 44px reorder alternatives remain above the fixed bottom navigation. This deliberately keeps the useful add entry visible rather than requiring a scroll to the bottom.

## Interaction contract

- One finder instance mounts after the first request, never two responsive copies.
- Desktop search receives focus after mounting, only on explicit opening. Mobile does not automatically summon the software keyboard.
- Escape, close and return dismiss the picker. A delayed old close event cannot dismiss a newly reopened picker.
- Source details retain the existing native dialog stack and restore the originating control. Closing the picker does not take focus from another open dialog.
- Default layout has one column, including the 1100–1199px range where older style rules previously reserved an unused rail.
- Selected-item properties, their draft cache and mobile sheet behavior are unchanged.

## Validation

- Final full suite: **178 files / 1,971 tests passed**.
- TypeScript, production build and all 40 PWA asset checks passed.
- ESLint: zero errors and one pre-existing React fast-refresh warning. The existing large-bundle build warning remains.
- Motion ledger source check and six ledger tests passed.
- The seven-width picker journey passed against the final production build, not only the development server.
- The existing pointer drag/insert/cancel/auto-scroll/undo/save/reload journey passed again at 320/390/768/1440px against that production build, with native Chrome touch emulation at 390px.
- Motion-preview selection was retained and hidden playback paused on close/reopen at 390/1440px.
- Browser testing exposed Chrome's native search-field Escape behavior: it cleared the query without closing the dialog. The workbench now handles Escape from its search field as a close action, preserves the query, and has a regression test for it.

Actual Chrome, isolated temporary contexts at 320/390/768/1100/1150/1200/1440px:

- Hidden default picker, explicit opening and desktop search focus.
- Source detail and return, including a resize while details are open.
- Preserved search/filter state on close, reopen and viewport changes.
- Thirty keyboard Tab transitions contained in the picker, Escape and return focus.
- No unused desktop column or horizontal document overflow.
- Selected-item editing without an always-visible finder.
- Add three movements, keyboard reorder, one-step undo, save and reload with stable saved order.

Short-height Chrome at 320/390/768 × 500px:

- Close and return actions remain inside the viewport and pass center-point hit tests.
- Both actions retain at least 44px targets.
- Add, return, reopen, Escape and outline focus pass.

Reproducible browser runner: scripts/qa/workbench-picker-browser.cjs. It accepts BASE_URL and OUT_DIR, plus PLAYWRIGHT_MODULE when Playwright is available at a separate installed path. It uses a fresh browser context and synthetic data, never the user's browser profile.

## Limits

Chrome touch support and reduced available height are browser emulation, not a physical-device, OS keyboard or Safari validation. No new SDK or browser package was installed. Safari interaction was not run in this follow-up. The previously verified drag production release is independent; this report alone does not establish deployment of the picker change.
