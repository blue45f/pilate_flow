# Integrated verification — 2026-11-08

Source merge tested: cb6f48b2b9a9e001dd830fd6c91893cf148f86d0. This includes modal candidate 44980e and upstream main 3ea00fb (LiveStage design plus tracked-file secret check 535409b). Merge was conflict-free. This report and its artifacts are documentation-only additions; product source is unchanged from the tested merge.

## Passed

- Full Vitest: **224 files, 2,461 tests**, 249.38 seconds, clean worktree. Command: `TZ=Asia/Seoul node node_modules/vitest/vitest.mjs run --exclude src/features/classCueSheet/classCueSheetChromium.test.ts`. That Linux-path-specific Chromium/PDF test is excluded on this Mac and is not claimed passed.
- TypeScript, full lint (0 errors, 1 existing react-refresh warning in MotionAuthoringBatchFigure.tsx:241), production build, PWA 44 actual static files. Existing >500kB bundle warnings remain.
- Tracked-file secret check: 7 Node tests and scan pass; values never printed.
- Previous focused 27 tests and reference-based captures remain documented in README.md.

## Independent visible user flows

Fresh isolated Chrome contexts, synthetic plan/group/exercise only, external requests and service workers blocked. Actual App and complete CSS import chain. Four viewport sizes: 320×568, 390×844, 768×1024, 1440×1000. Reduced motion enabled.

Unlike the earlier modal-only harness, this independent pass clicks a **real visible saved-class entry**:
1. Start from a synthetic saved class in the actual saved-class page.
2. Click `이미 진행한 수업 기록하기`; Escape restores focus to that real trigger.
3. Reopen, choose calendar date 2026-11-06, fill two-line memo and rating 4, leave actual duration unrecorded.
4. Save, reload the app, use visible history navigation, compare serialized records/plans exactly, and reopen the saved history.
5. Return through visible saved navigation, open a class, start its actual timer, wait approximately 1.3 seconds, choose `종료 / 기록` then `검토하고 기록하기`.
6. Confirm the measured 1 second prefills the modal and taught movement is selected. Save and reload; exact serialized records remain equal, actualDurationSec 1, actualRestDurationSec 0, selected step preserved.

All 4 sizes passed. Footer is a separate area, content bottom equals footer top, Save is 44px high, actual hit target is unobscured, and modal horizontal overflow is 0. Screenshots and measured output are in `visible-flow/`.

The runner initially assumed history navigation persisted across reload and compared JS undefined properties against JSON storage. Those harness expectations were corrected: use the real history navigation and compare canonical serialized data. No product change was made for those two harness corrections.

Reproduce against a local Vite server using `PLAYWRIGHT_MODULE=/path/to/playwright CHROME_EXECUTABLE=/path/to/chrome BASE_URL=http://127.0.0.1:5194 OUT_DIR=/tmp/modal-visible-qa node docs/class-log-design-20261108/visible-flow.cjs`. The test-only fixture setup imports local source modules; this is not an operating-site or production-preview harness. Real user actions, not hidden controls or injected launchers, perform both modal entry flows.

## Limits and release boundary

This is Chrome desktop responsive emulation, not a real iPhone, Safari, Android keyboard or OS/browser zoom certification. No Google authentication, cloud backup, video playback or audio verification is claimed. The source date-only/snapshot/duplicate/persistence contracts are unchanged. No production deployment is part of this work; remote push and exact CI results are reported separately.
