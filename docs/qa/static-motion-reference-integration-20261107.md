# Single static reference integration — 2026-11-07

Base: 03d3386. MotionCoverage's reviewed adapter is used by the actual individual movement detail modal, without replacing class playback.

## Scope and boundaries

- “참고 자세 그림” starts closed and resolves the full live exercise object, not only its ID.
- Shows exactly one app-authored still. Catalog assets have generated phase coordinates, but there is no verified real frame/motion provenance. Therefore no start/middle/end navigation, direction arrows, interpolation, timer or playback is exposed.
- Copy explicitly says one authored still, unverified phase frames, unverified anatomical accuracy/safety, not an exercise demonstration or actual 3D model.
- Reference side is fixed right with no mirroring and is explicitly not connected to class-plan side settings.
- Unknown/custom IDs and edited catalog apparatus do not inherit unrelated diagrams. No source/store/localStorage writes, network or narration occur.
- Closing removes the diagram subtree; changing exercise ID resets the disclosure. Existing class motion player and development harness are unchanged.

## Verification

- Focused tests: existing modal boundaries and new static reference tests (8 tests). Single SVG, no controls, custom ID, edited apparatus, source/store/storage preservation and exercise change reset covered.
- Actual app Chrome flows at 320, 390, 768 and 1440px; 320px reduced motion. Keyboard disclosure, 44px summary, no overflow, stable SVG across elapsed time, explicit side/mirror, close/reopen and localStorage unchanged.
- Browser script: scripts/qa/movement-diagram-reference-browser.cjs.
- Full final suite/type/lint/build/PWA/ledger results are recorded in completion. Earlier three-phase prototype validation was intentionally stopped when its unsupported phase-provenance implication was identified. That prototype is not the delivered UI.

No Gemini request, dependency installation, deployment, Safari or physical-device verification is included.

Final validation: 190 files / 2091 tests passed. TypeScript, full ESLint, production build, PWA and motion-ledger checks all exited 0. Production build browser flow also passed all four widths. Existing fast-refresh and bundle-size warnings remain. GitHub Pages source is gh-pages; main publication is not a Pages deployment.
