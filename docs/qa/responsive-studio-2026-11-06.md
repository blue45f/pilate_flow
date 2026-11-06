# Responsive studio redesign review — 2026-11-06

## Decision and design reference

The original cream/forest desktop and mobile concept and its mobile-first implementation notes were compared with the running application. The main problem was hierarchy, not missing decoration: a large editorial welcome area, duplicate quick navigation, several nested borders and long summaries pushed the editable sequence below the first screen.

The new desktop/mobile concept uses a light neutral canvas, white surfaces, ink text and teal actions. It preserves the Flow Atelier identity while making the sequence the main work surface. A combined desktop/mobile concept was presented before implementation. This is a coherent shell and workbench redesign, not a claim of pixel-identical reproduction of the original concept.

Design practices applied: primary-action hierarchy, shared spacing and color roles, aligned input/action rows, progressive disclosure, semantic controls, visible focus, 44px composition controls and reduced-motion behavior.

## Changes and preserved behavior

- One persistent navigation surface per breakpoint. Duplicate quick-menu row removed; creation remains available in the header and the existing creation flows.
- Compact header, class title and Save on one row, neutral section headers and one border per movement card.
- Time breakdown, editing mode, navigation guidance and automatic-generation controls remain available in initially closed details sections. Current duration, target mismatch, material status, undo and direct manipulation stay visible.
- Mobile up/down controls remain visible for every movement. This intentionally takes more vertical space than the concept's selected-row-only treatment, but avoids requiring drag or discovering a hidden menu.
- The decorative welcome image is not displayed in this layout. Its file and all movement images, source videos, motion notes and review metadata are preserved.
- Optional review does not become a gate. The footer now describes the same authoring contract as the application. No content is relabeled as reviewed and no health, safety or efficacy assurance is introduced.
- Storage and account labels use ordinary language instead of P1/P3 implementation identifiers. Storage failure stays an alert. A signed-in account without server backup is explicitly shown as not connected to account backup. A healthy local store is not described as proof of successful saving or synchronization.
- Library, schedule, saved plans, history and idea capture retain their functions. Schedule arrows and tablet bottom navigation use consistent 44px controls. Mobile fields use 16px text to avoid iOS focus zoom.

## Reproducible visual comparison

Chrome, clean temporary browser contexts, three identical mat movements, same order and 850px viewport height:

| Width  | Before: first card y / height | After: first card y / height |
| ------ | ----------------------------- | ---------------------------- |
| 390px  | 972.64px / 189.48px           | 510.25px / 143px             |
| 1440px | 1011.94px / 175.80px          | 560.89px / 136px             |

The final integrated layout also preserves the new preset-entry button above the conditions. The comparison used the same three movements: 누워서 호흡 관찰, 골반 시계, 서서 발목 움직임. Screenshots are actual application renders, not the design illustration. The source figures remain explanatory drafts, not verified exercise demonstrations.

## Verification coverage

- Chrome at 320, 390, 768 and 1440px: add three unreviewed valid movements, arrow reorder, keyboard reorder, undo, save, reload, time fitting and preview start availability. Desktop pointer drag also tested. No review records created, no horizontal document overflow, composition controls at least 44px.
- Chrome at the same four widths: empty workbench, movement library, schedule, saved plans, history and idea dialog inspected. No horizontal document overflow and no visible button below 24px found by the geometry scan.
- Short-height Chrome windows (320/390/768 × 500px): idea entry, 16px field font, 25 Tab transitions contained in the dialog, saving a personal draft, Escape dismissal and focus restoration passed. This simulates limited available space; it is not an OS keyboard test.
- Empty-state regression discovered visually: an inherited mobile grid-column rule could leave an implicit second column after removing the decorative image. Explicit child grid placement fixed it; Chrome and actual iOS Safari were recaptured.
- Integrated teaching screen: high-contrast panel, heading and button colors checked at all four Chrome widths; corrected a white-panel/bright-text conflict and verified no horizontal overflow.
- Installed iOS 27 Simulator, actual Mobile Safari: first-page render, layout, bottom navigation and primary actions visually checked. Simulator was controlled by app-specific simctl operations, not general desktop coordinate clicks, and shut down after this check.
- Before latest-main integration: full Vitest 170 files / 1809 tests passed, latest workbench subset 24 tests passed, storage/account copy protection added with 18 new cases and related three-file / 24-case run passed. TypeScript and production build passed. Lint had zero errors and one pre-existing React refresh warning. Final integrated totals are recorded below.

## Explicit limits

No claim is made that every feature on every page has been manually exercised. Safari editing, drag, save/reload and keyboard appearance were not exercised in the simulator render check. Desktop Safari automation was unavailable without changing its remote-automation setting, and no such setting was changed. Playwright WebKit was not installed or represented as Safari. Prior Android authoring verification belongs to the earlier authoring patch, not this final redesign. Physical phones and tablets were not tested. No SDK was installed, this validation did not deploy to production, and no real user data was used in the temporary browser contexts.

## Final integrated verification

Integrated the PWA installation/update work, offline preset and timing work, and the Hosting cleanUrls navigation fix (2e4d60e), without restoring the superseded repository history.

- Full Vitest: **177 files, 1,929 tests passed**. The subsequent study-help wording correction passed its focused four tests. That correction preserves the study recall behavior and clarifies that adding or composing a class does not require a review record.
- TypeScript, production build, static PWA asset verification and motion-source ledger verification passed. PWA verification covered 40 emitted files; ledger checks covered 22 source identities plus six Node tests.
- ESLint: zero errors, one existing React fast-refresh warning. Vite retained its existing large-chunk warning.
- Final integrated Chrome: 320/390/768/1440px authoring, alternative reordering, undo, save/reload, preview, class entry and high-contrast checks passed. Short-height dialog focus/keyboard/save checks passed.
- Independent review confirmed keyboard access to all four collapsed workbench sections, no horizontal overflow, and current-state validation in an already-open preview. Both first-load and repeat-entry study-dialog focus/restoration passed at all four widths.
- Production build served with an actual 301 `/index.html` → `/` response: offline reload passed at 390 and 1440px. The old redirected-cache failure was not reproduced with the fixed worker.
- Two-tab production update: new worker waited, no forced page reload, draft sentinel preserved, and old caches removed only after all old tabs closed.

HTTPS behavior after release remains a separate deployment verification; localhost redirect tests are not described as an operating-site deployment check.
