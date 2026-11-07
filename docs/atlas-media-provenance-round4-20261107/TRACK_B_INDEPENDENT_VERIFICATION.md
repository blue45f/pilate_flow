# Track B Independent Verification Report (`docs/atlas-media-provenance-round4-20261107`)

- **Verifier Role**: `Independent Media Provenance QA Verifier` (Subagent ID: `7b7aed1c43a771cc365f849d3fe9d795`)
- **Verified At (UTC)**: `2026-11-07T12:03:01Z`
- **Target Scope**: `docs/atlas-media-provenance-round4-20261107/**`
- **App / Source / Data / Diagram Code Modified**: **`0 files` (`git status --short` clean outside `docs/atlas-media-provenance-round4-20261107/`)**

---

## 1. Deliverables & Strict Read-Only / Zero-Code-Modification Compliance

| Check Item | Verification Result | Evidence |
| :--- | :---: | :--- |
| **Zero Code Modification (`src/**`)** | **PASS (100%)** | `git status --short` shows only `docs/atlas-media-provenance-round4-20261107/`. Zero tracked files modified (`0 files modified in src/**`). |
| **[`movements-98-media-mapping.csv`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/movements-98-media-mapping.csv)** | **PASS (100%)** | Confirmed `1` header line + `98` movement rows = **`99` non-empty lines** (`25,547 bytes`, trailing newline at line 100). |
| **[`media-provenance-ledger.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/media-provenance-ledger.json)** | **PASS (100%)** | Valid JSON (`9,381 lines`, `339,160 bytes`). Contains all 98 movements, 5 apparatus summaries, 11 duplicate direct-YouTube groups, 5 duplicate `VERIFIED_REFERENCES` URL pairs, and apparatus-stratified sample probes. |
| **[`url-http-oembed-probes.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/url-http-oembed-probes.json)** | **PASS (100%)** | Valid JSON (`2,378 lines`, `106,509 bytes`). Contains 125 probe entries (`113` unique URLs) and 22 distinct direct-YouTube oEmbed comparisons. |
| **[`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json)** | **PASS (100%)** | Valid JSON (`377 lines`, `12,392 bytes`). Contains DOM/layout measurements across `320px`, `390px`, `768px`, `1440px`, and `200%` zoom. |
| **`screenshots/*.png` (9 files)** | **PASS (100%)** | All 9 PNG files exist and are valid 8-bit RGB non-interlaced PNGs: `long-source-desktop-1440.png` (`2880×1800`), `long-source-desktop-1440-zoom200.png` (`2880×1800`), `long-source-tablet-768.png` (`1536×2048`), `long-source-mobile-390.png` (`780×1688`), `long-source-mobile-320.png` (`640×1280`), `long-source-mobile-320-zoom200.png` (`640×1280`), `mobile-320-unsaved-review-close-guard.png` (`640×1280`), `mobile-390-broken-thumbnail-gallery.png` (`780×1688`), `mobile-390-embed-restricted-external-fallback.png` (`780×1688`). |

---

## 2. Completeness of 98-Movement Mapping Across All 5 Apparatus

Cross-checked [`movements-98-media-mapping.csv`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/movements-98-media-mapping.csv) and [`media-provenance-ledger.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/media-provenance-ledger.json) against `INITIAL_EXERCISES` ([`src/data/pilatesCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts) + [`src/data/originalMovements.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/originalMovements.ts)):

| Apparatus | Total Movements | Original (`original-*`, no direct video) | Legacy (`ex-*`, direct YouTube ID) | In `verifiedPilatesYouTubeCatalog.json` | Not in Verified Pool (Unrelated Video) | Exact oEmbed Title Match | Motion Pattern Drafts (`motionPatternReferences`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`mat`** | **22** | 18 | 4 | 1 | 3 | 1 | 15 |
| **`reformer`** | **30** | 8 | 22 | 10 | 12 | 3 | 2 |
| **`cadillac`** | **18** | 12 | 6 | 4 | 2 | 1 | 1 |
| **`chair`** | **16** | 12 | 4 | 1 | 3 | 0 | 1 |
| **`barrel`** | **12** | 10 | 2 | 1 | 1 | 0 | 2 |
| **Total** | **98** | **60** | **38** | **17** | **21** | **5** | **21** |

- All 60 `original-*` movements have empty direct `videoId`/`url`, and 58/60 receive 1–8 curated videos from `getRelatedYouTubeVideosForExercise` while 2/60 (`#47` `original-chair-incline-support`, `#51` `original-chair-seated-back-reach`) receive `0`.
- All 38 `ex-*` legacy movements use only **22 distinct YouTube `videoId`s**, with **11 `videoId`s shared across 27 movements**.

---

## 3. Source-Code Cross-Check of Prioritized Defects (`DEF-MEDIA-01` .. `DEF-DATA-08`)

Every line reference and technical claim in [`README.md`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/README.md) Section 6 was cross-checked directly against `src/**`:

| Defect ID | Verification Status | Source File & Line Verification |
| :--- | :---: | :--- |
| **`DEF-MEDIA-01`** | **CONFIRMED 100% ACCURATE** | - [`src/data/pilatesCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/pilatesCatalog.ts#L256-L1400): Confirmed 38 `ex-*` entries share 11 duplicate `videoId`s across 27 movements, with 21 movements (9 `videoId`s) pointing to unrelated meditation/yoga/fitness videos (`inpok4MKVLM` = Goodful 5-Min Meditation, `v7AYKMP6rOE` = Yoga With Adriene, `g_tea8ZNk5A` = Mady Morrison Stretch, `1f8yoFFdkcY` = Pamela Reif Ab Workout, etc.) and 6 movements (`K56Z12XNQ5c`, `C2HX2pNbUCM`) mapping Move With Nicole mat workouts to Reformer/Cadillac exercises under mismatched channel names (`Balanced Body Education`, `Flow With Mira`, `Lesley Logan`).<br>- [`src/data/exerciseYouTubeCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/exerciseYouTubeCatalog.ts#L177-L195): Confirmed `getRelatedYouTubeVideosForExercise` unconditionally prepends `exercise.youtube.videoId` to `results` before curated pool filtering. |
| **`DEF-MEDIA-02`** | **CONFIRMED & RECONCILED** | - [`src/models/quadrupedDrafts.ts`](file:///home/antigravity/blue45f/pilate_flow/src/models/quadrupedDrafts.ts#L83) (`quadruped-arm-slide`, `quadruped-leg-slide`) references `https://www.bodyharmonics.com/arm-leg-reach/` which returned `HTTP 503` at `2026-11-07T11:52:26.417Z`, and `chair-seated-pedal-press` ([`src/data/motionApparatusSourceLedger.json`](file:///home/antigravity/blue45f/pilate_flow/src/data/motionApparatusSourceLedger.json)) references `https://thecore.pilates.com/pilates-cross-training-reformer-exo-chair-sequencing/` which also returned `HTTP 503` at `2026-11-07T11:52:28.677Z`. Reconciled in `README.md` alongside the synthetic `404` probe (`chelwest.nhs.uk`). |
| **`DEF-UI-03`** | **CONFIRMED 100% ACCURATE** | - [`src/components/ExerciseYouTubeGallery.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/ExerciseYouTubeGallery.tsx#L254-L270): Line 260 renders `<img src={video.thumbnailUrl} alt="" loading="lazy" className="eyg-thumb-img" />` with no `onError` handler or fallback state.<br>- [`src/styles/exercise-youtube-gallery.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/exercise-youtube-gallery.css#L186-L205): `.eyg-thumb-button` and `.eyg-thumb-img` have no fallback styling when `naturalWidth === 0`. |
| **`DEF-UI-04`** | **CONFIRMED 100% ACCURATE** | - [`src/styles/movement-media-guidance.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/movement-media-guidance.css#L121-L134): `.movement-media-guidance-panel .mmg-badge` sets `white-space: nowrap;` at line 133, causing `.mmg-badge--info` (`294px`) to overflow `.atelier-modal-body` (`clientWidth: 296px`, card content `245px`) by `+49px` (`scrollWidth: 345px`) at `320×640` (`100%`).<br>- [`src/styles/exercise-youtube-gallery.css`](file:///home/antigravity/blue45f/pilate_flow/src/styles/exercise-youtube-gallery.css#L41-L167): `.eyg-filter-pills` and `.eyg-grid` (`repeat(auto-fill, minmax(215px, 1fr))`) cause `+209px` horizontal overflow (`scrollWidth: 345px` vs `clientWidth: 136px`) at `320×640 @ 200% zoom`. |
| **`DEF-UI-05`** | **CONFIRMED 100% ACCURATE** | - [`src/components/LightDismissDialog.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/LightDismissDialog.tsx#L52-L129) and [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx#L1615-L1662): `<dialog>` handles `close`, `cancel`, `click`, and `keydown`, but neither pushes a browser history entry nor registers a `popstate` listener, leaving the modal open when `history.back()` is triggered on mobile. |
| **`DEF-UI-06`** | **CONFIRMED 100% ACCURATE** | - [`src/components/YouTubeClipModal.tsx`](file:///home/antigravity/blue45f/pilate_flow/src/components/YouTubeClipModal.tsx#L758-L796): Lines 762–766 call `normalizeReferenceUrlPolicy(rawLink, { startSec: safeStart, endSec: safeEnd })` without forwarding `exercise.youtube.embedRestricted`, and lines 789–793 render the `YouTube 영상 불러오기` button even when `embedRestricted === true`. |
| **`DEF-DATA-07`** | **CONFIRMED 100% ACCURATE** | - [`src/data/exerciseYouTubeCatalog.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/exerciseYouTubeCatalog.ts#L74-L78): `AUDITED_TITLE_REQUIREMENTS` regexes for `'incline-support'` and `'seated-back-reach'` filter out all Chair candidates in `verifiedPilatesYouTubeCatalog.json`, returning `0` gallery items for `#47` and `#51`. |
| **`DEF-DATA-08`** | **CONFIRMED 100% ACCURATE** | - [`src/data/verifiedReferences.ts`](file:///home/antigravity/blue45f/pilate_flow/src/data/verifiedReferences.ts): Confirmed 5 duplicate URL pairs (`mv-02`/`mv-03`, `mv-06`/`mv-07`, `mv-08`/`mv-09`, `mv-11`/`mv-12`, `mv-14`/`mv-15`) across 30 entries (25 unique URLs), and confirmed Merrithew 2018–2019 blog posts return `404` to `HEAD` requests while serving `200 OK` on `GET` requests. |

---

## 4. Browser QA Evidence Verification (`320px`, `390px`, `768px`, `1440px`, `200%` Zoom)

All 4 browser QA scenarios in [`browser-qa-metrics.json`](file:///home/antigravity/blue45f/pilate_flow/docs/atlas-media-provenance-round4-20261107/browser-qa-metrics.json) and `screenshots/*.png` are verified and reproducible:
- **Scenario 1 (Broken Thumbnail Image)**: Confirmed `naturalWidth: 0`, `naturalHeight: 0`, `anyFallbackRendered: false` on `.eyg-thumb-img` at `390×844` (`screenshots/mobile-390-broken-thumbnail-gallery.png`).
- **Scenario 2 (Embed Restricted & Manual Autoplay Policy)**: Confirmed `iframeCountOnInitialOpen: 0`, `youtube-nocookie.com` with `autoplay=0` and `allow="encrypted-media; gyroscope; picture-in-picture"` after manual click, lower `MovementMediaGuidancePanel` external-link fallback working, and upper hero `.movement-detail-media` ignoring `embedRestricted: true` (`screenshots/mobile-390-embed-restricted-external-fallback.png`).
- **Scenario 3 (Responsive & 200% Zoom Long Source Names)**:
  - `320×640 @ 100%`: `+49px` modal body overflow (`345px` vs `296px`) due to `.mmg-badge` `white-space: nowrap` (`screenshots/long-source-mobile-320.png`).
  - `390×844 @ 100%`: `0px` overflow (`366px` vs `366px`, `screenshots/long-source-mobile-390.png`).
  - `768×1024 @ 100%`: `0px` overflow (`734px` vs `734px`, `screenshots/long-source-tablet-768.png`).
  - `1440×900 @ 100%`: `0px` overflow (`898px` vs `898px`, `screenshots/long-source-desktop-1440.png`).
  - `1440×900 @ 200% zoom`: `0px` overflow (`686px` vs `686px`, `screenshots/long-source-desktop-1440-zoom200.png`).
  - `320×640 @ 200% zoom`: `+209px` modal body overflow (`345px` vs `136px`) due to `.eyg-grid` `minmax(215px, 1fr)` and `.eyg-filter-pills` (`screenshots/long-source-mobile-320-zoom200.png`).
- **Scenario 4 (Mobile Back & Unsaved Review Guard)**: Close button (`passed: true`), Escape key (`passed: true`), unsaved review close guard (`dialogKeptOpenOnUnsavedCloseAttempt: true`, `closedAfterExplicitDiscard: true`, `screenshots/mobile-320-unsaved-review-close-guard.png`), and hardware/browser Back `popstate` defect (`modalPushedHistoryEntry: false`, `dialogStillOpenAfterHistoryBack: true`).
