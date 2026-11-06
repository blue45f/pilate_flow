# Sequence drag interaction review — 2026-11-06

The former implementation only outlined a target row. The new interaction keeps the approved card appearance and changes only the temporary drag presentation: a noninteractive copy follows the pointer, neighbouring rows make space, and a numbered insertion placeholder shows the pending position. Invalid destinations and locked barriers are marked before release.

The authoritative sequence is unchanged while dragging. One valid drop calls the existing stable-ID reorder action once; undo, metadata, review records and saved ordering are preserved. Release coordinates and the latest array are rechecked. Escape, pointer cancellation/capture loss, window blur, hidden document, resize and stale edits cancel the visual session. Only the handle captures touch gestures; ordinary body scrolling remains available.

Viewport-edge scrolling continues while the pointer is stationary. The original row anchors the geometry so live notices and browser scroll anchoring cannot shift the insertion marker. Reduced motion disables animated neighbouring transitions and the drop animation while retaining direct pointer tracking. Duplicate IDs, focusable controls and accessibility exposure are removed from the visual copy. Keyboard arrows and the existing up/down buttons remain available.

## Verified

- Full suite: 178 files / 1,966 tests passed. After the final layout-anchor correction, focused component/geometry/lifecycle coverage passed 43 tests, including a new notice-induced 64px layout-shift regression.
- TypeScript, ESLint (zero errors; existing refresh warning), production build and PWA verification of 40 static files passed.
- Actual Chrome at 320/390/768/1440px: pointer following, neighbour movement, insertion placeholder, Escape cancellation, stationary downward auto-scroll, drop and one-step undo. Screenshots captured during dragging and auto-scroll.
- Chrome touch emulation at 390px: native touch event drag, normal body swipe scrolling, upward auto-scroll and cancellation. This is browser touch emulation, not a physical phone or OS simulator test.
- The real UI flow of finding and adding three movements, keyboard/button ordering, save and reload passed at all four widths. Storage metadata/reopening is covered by component tests.
- Core palette, card dimensions and normal non-drag layout were preserved. No change was made to the workbench, store or movement data.

## Limits

Safari and physical-device drag behavior were not verified in this change. The optional desktop finder visibility and broader page-layout changes are separate work. No production deployment was performed by this validation task.

## Repeated keyboard movement follow-up

A further 390px check found that repeated ArrowDown could leave the focused handle outside the viewport. Pointer-drop focus intentionally preserves the scroll position, but keyboard and up/down button moves now reveal the destination with a 96px scroll margin for the mobile navigation. Five successive ArrowDown moves now keep the handle visible (y≈656–700px, navigation starts at 774px). A regression test distinguishes keyboard/button scrolling from pointer-drop no-jump behavior. This follow-up was completed before production deployment.
