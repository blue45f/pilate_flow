# Beginner guide flow — 2026-11-07

Base: 346f04d. Reviewed the current welcome/sequence screen, existing personal-study guide and responsive-studio design audit. The existing guide described reviewed movements and review conditions as prerequisites despite optional-review authoring, and the help entry opened the more complex movement-study mode before the guide.

## Changes

- Help entry opens the four-step usage guide first; movement-study remains one tab away.
- Each existing tutorial ID is preserved (conditions, compose, rehearse, teach-record). Personal completion/bookmark/cue settings remain intact.
- Short descriptions, three concrete instructions per step, and decorative existing Lucide icons use the established neutral/teal UI and 44px controls. No automatic tour, popover, timer, account setup or extra main-screen chrome.
- Guidance uses actual controls: movement selection, optional idea memo, drag or up/down order, save, sequence preview, explicit rehearsal start, and class recording. Review is optional; no anatomical/safety validation is implied.
- “내 수업 구성으로 가기” uses App's existing guarded changeTab route, not direct store navigation. It closes help, restores the workspace heading focus, and preserves the active-class exit guard.

## Verification

- Guide callback tests verify explicit-only navigation, no automatic tutorial completion or review actions.
- App regression verifies that returning from help during an active class keeps the stage and opens its existing exit confirmation; steps/history/study state unchanged.
- Chrome actual app at 320/390/768/1440px: help starts in guide, all four stages visible, three instructions each, no horizontal overflow, keyboard return and workspace heading focus. Existing draft, history and learning state preserved.
- 390px screenshot visually inspected. Browser script: scripts/qa/beginner-guide-browser.cjs.
- Full final suite, types, lint, build, PWA and ledger results are in the completion report.

No deployment, Gemini request, new dependency, Safari or physical-device validation.

Final validation: 190 files / 2093 tests passed. TypeScript, full ESLint, production build, PWA and motion ledger all exited 0. The production build also passed four-width browser checks. Existing refresh-export and bundle-size warnings remain. Pages source stays gh-pages, not main.
