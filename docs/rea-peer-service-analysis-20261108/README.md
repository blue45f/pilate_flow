# REA Peer-Service Reverse Engineering & Sequence Flow Telemetry Architecture (`2026-11-08`)

## 1. Investigation Scope & REA Evidence Ledger

This investigation used the **REA (`reverse-engineer-anything`)** MCP provider (`rea-cdp-browser` v2, `rea-analysis-view` v1) connected to an unattended Chrome DevTools Protocol (CDP) instance (`http://127.0.0.1:9223`, `Chrome/156.0.8078.81`, protocol `1.3`) alongside static application graph reconstruction (`analyze_javascript_application`) of our local `/Users/hjunkim/WebstormProjects/pilates-flow/src` tree.

### Captured REA Evidence Records

| Operation | Target / Scope | REA Evidence ID | Parent Evidence ID | Artifact / Manifest SHA-256 | Authority & Confidence |
| --- | --- | --- | --- | --- | --- |
| `analyze_javascript_application` (`inspect_analysis_view` summary) | `/Users/hjunkim/WebstormProjects/pilates-flow/src` (552 relevant files, 512 parsed JS/TSX files, 1,053,111 AST nodes, 7,254 findings) | `ev_cb6588fb5474169b2e297f3118e990507e304e82f52e67065a5f4b9cfb400815` | `ev_050bbbeec791b11b50b8a2df911916373d18f7ff90e2abb3256163e37539fab0` | `16cb919a8be7a1a63308431e256564632f01e8e34c13e44ee9897f3aea8f2806` | `shipped-artifact` / `derived` |
| `list_browser_targets` | `http://127.0.0.1:9223` (3 active HTTP(S) peer targets) | `ev_8285bbb4a846fd7391ae08278c760f4dbfa333ae7512300dea5a79ee3ae074de` | — | — | `external-service` / `observed` |
| `inspect_web_page` | `https://www.pilatesanytime.com/pilates-exercises` (`target_id`: `B98D6FBDD8A299FF2640066D5F76D12A`) | `ev_aeb5eab3d38095a578ed1fd00a48129d41ccc17ba1b9f304a9cb71febe2db57a` | — | Inline script `3c85bb7f5e4f5eaf701c65e580d4a218389285513d864cb60246287369760e2c` (`8,567 B`) | `external-service` / `observed` |
| `analyze_web_bundle` (summary & `javascript-routes` sources) | `https://www.pilatesanytime.com/pilates-exercises` (`target_id`: `B98D6FBDD8A299FF2640066D5F76D12A`) | `ev_cf528d72db4a47042405e0cf2a8e5814a14305afe8eaecf4ffd88f6157b199c6` / `ev_c1cafa60318a336f877d8d33155879f1945655a59b3db205d565742fa6a4573f` | `ev_e79d83275f457319938e9a1ead29dacee9d3d2d3ceba5a05bdd4081b6aeb489f` | `a3b9e3d570f1de01101f7e21fe431e588af874425b7383ef778be1075cc093af` | `external-service` / `derived` |
| `inspect_web_page` | `https://www.pilatesanytime.com/` (`target_id`: `D60A7267507276BD378D3D937FD102BE`) | `ev_a84bd20551e4fae0655c36a774e12665200a5287be90d0ae94cf368e1a7207e6` | — | `header_js-dist.js` `7076ede39c6cdccf2a83acda028a104ddcf97d6aa5b5812d2554a7ebaf3bc301` | `external-service` / `observed` |
| `inspect_web_page` | `https://www.merrithew.com/` (`target_id`: `B2431E0F40E3F95AD81C5CACA9D17B4B`) | `ev_01ad7d0aa8d3a17f5578ef422411e6748445f85cfd921306ad8cc274ce728bb0` | — | `ScriptResource.axd` `66b804e7a96a87c11e1dd74ea04ac2285df5ad9043f48046c3e5000114d39b1c` (`102,801 B`) | `external-service` / `observed` |
| `analyze_web_bundle` (summary & `javascript-routes` sources) | `https://www.merrithew.com/` (`target_id`: `B2431E0F40E3F95AD81C5CACA9D17B4B`) | `ev_debfb0f75016ac46c45bef6c200691b152f60f4077e643eb36aa906426806cc3` / `ev_f3af3f7539b1cb1597748246602fc11c50a5519532f54be44cb2096308e29a13` | `ev_664b3b5e394d335322556b83f28621abf2825f52039eab452a9acff47d5a017c` | `4a4ed98f2b37582b16081d88620a87bdb9c1d6a343fcde633ab0a98337d9af3b` | `external-service` / `derived` |

---

## 2. Observations, Inferences, and Unknowns

### 2.1 Observations (Directly Established by REA Evidence)

1. **Pilates Anytime Exercise & Sequence Catalog (`ev_aeb5eab3d38095a578ed1fd00a48129d41ccc17ba1b9f304a9cb71febe2db57a`, `ev_c1cafa60318a336f877d8d33155879f1945655a59b3db205d565742fa6a4573f`)**:
   - **DOM & Accessibility Tree**: `2,616` DOM nodes and `1,201` accessibility nodes on `/pilates-exercises` (`2,983` DOM nodes and `1,007` accessibility nodes on `/` in `ev_a84bd20551e4fae0655c36a774e12665200a5287be90d0ae94cf368e1a7207e6`).
   - **Apparatus & Level Facet Tabs**: Accessibility tree exposes explicit apparatus tabs (`role="tab"`, `name="Mat"`, `name="Reformer"`) paired with difficulty filter pills (`button:All`, `button:Beginner`, `button:Intermediate`, `button:Advanced`).
   - **Compact Exercise Telemetry Cards**: Every exercise link encodes structured metadata directly in its accessible label: Exercise Title + Instructor + Difficulty Badge + Duration in minutes + Lineage/Method + Apparatus (e.g., `"Bicycles Meredith Rogers Advanced 4 min BASI Pilates® Mat"`, `"Control Balance Meredith Rogers Advanced 5 min BASI Pilates® Mat"`, `"Leg Pull Back Ashley Hoffman Intermediate 1 min Power Pilates® Mat"`).
   - **Accessibility & Media Player Persistence**: `localStorage` keys observed on `https://www.pilatesanytime.com` (`values_redacted: true`): `["jwplayer.bandwidthEstimate", "jwplayerLocalId", "uw-icon-locales", "uw-uid", "uw-tunings-checksum", "uw-tunings"]`, paired with a top-level `region:Quick Accessibility Options` (`button:Skip to main content`, `button:Enable accessibility for low vision`).
   - **Client Bundle Inventory**: 9 same-origin script sources (`source_manifest_sha256`: `a3b9e3d570f1de01101f7e21fe431e588af874425b7383ef778be1075cc093af`), including `header_js-dist.js?v=TECH2086` (`sha256: 7076ede39c6cdccf2a83acda028a104ddcf97d6aa5b5812d2554a7ebaf3bc301`), `footer_js-dist.js?v=2730` (`sha256: 96cc75534d669d312abc378417506cd87a9607169adaa5bdf610ff0ae76eb980`), `bootstrap.min.js` (`sha256: 65678e805584bad30494cd1bb0bf2989d20bbdffdf9edc82449d125d7810eba2`), and `jquery.mobile.custom.min.js` (`sha256: 7cb4efd75d841420c32a07f5880f53c1b59a78a2ca21e4c805a6a10c0f1ad429`).

2. **Merrithew / STOTT PILATES Equipment & Training Portal (`ev_01ad7d0aa8d3a17f5578ef422411e6748445f85cfd921306ad8cc274ce728bb0`, `ev_f3af3f7539b1cb1597748246602fc11c50a5519532f54be44cb2096308e29a13`)**:
   - **DOM & Accessibility Tree**: `4,281` DOM nodes and `1,136` accessibility nodes.
   - **Studio & Rehab Segmentation**: Top-level vertical segmentation links (`Boutique Studios`, `Fitness Clubs`, `Hospitality & Wellness`, `Rehab & Healthcare`) and hardware configuration entrypoints (`FIND YOUR REFORMER`, `PRECISION EQUIPMENT. PROVEN AT SCALE.`).
   - **Search & Client Bundle Architecture**: 18 same-origin script sources (`source_manifest_sha256`: `4a4ed98f2b37582b16081d88620a87bdb9c1d6a343fcde633ab0a98337d9af3b`), featuring `swiftype.min.js?v=1.14` (`sha256: 1941cce50b7dc809622e15d7a2f630b8629a2cdc22ecaa6b59eb4344f1217f83`) with `data-swiftype-index` attributes for faceted equipment/exercise indexing, and `slick.2.0.min.js` (`sha256: d45d991391876d717ca9b187b17d8dfe0e6f45c7f0d1956c758da1e9d4f82fbe`) exposing `region:carousel`.

3. **Local Pilates Flow Application Graph (`ev_cb6588fb5474169b2e297f3118e990507e304e82f52e67065a5f4b9cfb400815`, parent `ev_050bbbeec791b11b50b8a2df911916373d18f7ff90e2abb3256163e37539fab0`)**:
   - **Static Inventory**: `552` relevant files (`9,484,619` text bytes read), `512` parsed TypeScript/JavaScript modules (`0` parse failures), `1,053,111` visited AST nodes, and `7,254` static findings (`call-flow`: `5,165` retained relations; `data-flow`: `87,800` retained relations; `closure`: `12,308` retained relations; `object-flow`: `11,373` retained relations).
   - **Feature Concentration**: `features/classCueSheet/*` and `features/classPlanReview/*` carry high static relationship density (exceeding per-file parent result expansion budgets while retaining complete static facts on each file node), whereas real-time **step-to-step hardware transition friction** (`box`, `footbar`, `headrest`, `springs`, `bodyPosition`), **spinal plane wave progression**, **unilateral pacing verification**, and **one-click transition buffer optimization** were not yet extracted into a dedicated, reusable workbench telemetry strip.

### 2.2 Inferences (Bounded Architectural Synthesis)

- **Why Peer Services Surface Duration + Level + Apparatus Inline**: On `pilatesanytime.com/pilates-exercises`, instructors scanning exercises need immediate visibility into apparatus mode (`Mat` vs `Reformer`), level (`Beginner`/`Intermediate`/`Advanced`), and minute allocation (`1 min` to `5 min`) without opening a modal.
- **Why Studio Instructors Need Hardware Setup Diffs & Transition Buffers**: Unlike consumer VOD portals that deliver pre-edited single-apparatus videos, live Korean studio instructors teaching 50-minute Reformer/Cadillac/Chair sequences face physical setup bottlenecks:
  - Non-contiguous `long-box` / `short-box` placement or removing/re-installing boxes mid-flow causes 20–35 seconds of dead studio time.
  - Footbar (`high` → `low` → `down`), headrest (`up` → `flat` for bridging safety), and spring (`2R 1B` → `1R` → `1B`) transitions require explicit buffer time (`transitionSec`) and visual diff callouts.
  - Unilateral exercises (`isUnilateral: true`) require balanced left/right side allocation (`sideMode: 'left-then-right' | 'right-then-left'`) and at least `20s` of net movement time per side after subtracting `explanationSec` and `transitionSec`.

### 2.3 Unknowns & Limitations

- **Peer Bundle Route Coverage**: Both `pilatesanytime.com` (`ev_cf528d72db4a47042405e0cf2a8e5814a14305afe8eaecf4ffd88f6157b199c6`) and `merrithew.com` (`ev_debfb0f75016ac46c45bef6c200691b152f60f4077e643eb36aa906426806cc3`) rely on server-rendered HTML anchors and CMS routing (`Sitefinity` / custom PHP-JS bundles) rather than client-side SPA routers; static `javascript-routes` pattern count is `0` on the inspected landing bundles, and authenticated member-only sequence builder routes remain unobserved.
- **Unresolved Third Target (`balancedbody.com`)**: `https://www.balancedbody.com` returned `net::ERR_NAME_NOT_RESOLVED` in the local DNS environment during capture; consequently, no CDP or bundle claims are made for `balancedbody.com`.
- **Static vs Runtime Boundary**: Per REA guidelines, static AST findings in `ev_cb6588fb5474169b2e297f3118e990507e304e82f52e67065a5f4b9cfb400815` (`42,710` semantic unknowns, `657` application graph unknowns) do not prove runtime execution paths without test/browser verification.

---

## 3. Internalized Capabilities in Pilates Flow

Based on the peer service findings and our local codebase architecture, we designed and implemented four cohesive modules:

1. **Sequence Flow Analytics Engine ([`sequenceFlowAnalytics.ts`](file:///Users/hjunkim/WebstormProjects/pilates-flow/src/utils/sequenceFlowAnalytics.ts))**:
   - **Apparatus & Hardware Transition Friction Analysis**: Inspects every consecutive exercise step for changes in `apparatus`, `box` (`none` / `long-box` / `short-box`), `footbar` (`high` / `mid` / `low` / `down` / `none`), `headrest` (`up` / `flat` / `down`), `springs` (respecting `customSpringOverride`), and `bodyPosition`. Computes `transitionFrictionScore` (`0..100`) and `flowReadinessScore` (`0..100`), counts `springSwapCount`, `boxSwapCount`, `footbarSwapCount`, `headrestSwapCount`, and `bodyPositionSwitchCount`, and detects non-contiguous box/apparatus ping-ponging to emit actionable Korean coaching tips (`setupOptimizationTipsKo`).
   - **Spinal Plane & Biomechanical Wave Curve**: Generates per-step wave points (`intensityScore`, `primaryPlane`, `recommendedTransitionSec`, `netPracticeSec`) and overall spinal plane percentages (`flexion`, `extension`, `lateral`, `rotation`, `neutral`), plus biomechanical warnings (e.g., `>= 3` consecutive flexion-dominant steps without thoracic extension counter-balance, bridging with `headrest: 'up'`, or missing warm-up/cool-down blocks).
   - **Unilateral Symmetry & Pacing Check**: Audits `isUnilateral` exercises for single-side bias (`sideMode === 'left' || sideMode === 'right'`) and flags unilateral steps where net practice time per side (`(durationSec - explanationSec - transitionSec) / 2`) falls below `20s`.
   - **Immutable Smart Transition Buffer Optimizer (`buildOptimizedTransitionSteps`)**: Pure helper that returns a new `SequenceStep[]` with minimum recommended `transitionSec` (`>= 15s` on spring/position/footbar swaps, `>= 25s` on box/apparatus swaps) without mutating the caller's array.

2. **Interactive Sequence Flow Telemetry Strip ([`SequenceFlowTelemetryStrip.tsx`](file:///Users/hjunkim/WebstormProjects/pilates-flow/src/components/SequenceFlowTelemetryStrip.tsx) & [`sequence-flow-telemetry.css`](file:///Users/hjunkim/WebstormProjects/pilates-flow/src/styles/sequence-flow-telemetry.css))**:
   - Atelier-styled summary strip displaying **Flow Readiness Score (`0..100`)**, **Hardware Swap Counters**, **Spinal Plane Distribution Pills**, and a decorative **SVG Biomechanical Intensity & Plane Wave Sparkline** (`aria-hidden="true"`) paired with an accessible screen-reader/expandable step diff inspector.
   - Includes a `min-height: 44px`, WCAG AA contrast-compliant, keyboard-accessible one-click action button (`권장 전환 여유시간 자동 반영`) wired to `onApplyTransitionBuffers`.
