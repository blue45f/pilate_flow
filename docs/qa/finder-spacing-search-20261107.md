# Finder spacing search — 2026-11-07

Base: a33b5a2. Actual Chrome reproduction at 390px: “골반시계” returned 0 cards while “골반 시계” returned 1. Users typing a natural compact name could not find and add an existing movement.

The finder now normalizes Unicode (NFKC), letter case and whitespace for each searchable field and each query token. Name spelling in the catalog and stored query are untouched. Every query token must still match a field; matching does not cross field boundaries. Existing apparatus/body/time/motion filters remain unchanged. No UI element, review gate, asset, data model or dependency was added.

Focused regression covers compact Korean, canonical decomposed Hangul, fullwidth English, nonmatching extra-token AND behavior and read-only search. Existing finder filter tests remain in the same suite.

Chrome actual app at 320/390/768/1440px covers the same inputs, zero-result behavior, unchanged storage while searching, then explicit add/save/reload of the found movement. No horizontal overflow. 390px screenshot inspected. Browser script: scripts/qa/finder-spacing-search-browser.cjs.

Final full suite/types/lint/build/PWA/ledger results are recorded in completion. No deployment, Gemini request, package installation, Safari or physical-device validation.

Final validation: 190 files / 2094 tests passed. TypeScript, full ESLint, production build/PWA and motion ledger all exited 0. Production-build search flow passed all four widths. Existing seven-width picker regression additionally passed focus, filter retention, nested-detail return, reorder/undo, save/reload and hidden-preview pause. Pages remains sourced from gh-pages, not main.
