# Motion study source ledger and local stage audit

This development-only ledger records 21 authored, unreviewed variants: 17 existing proposals and four authoring-batch variants. It adds no asset, source-match approval, professional review or recommendation eligibility. The 98 canonical exact-asset fields and expert review count remain unchanged. No deployment was performed.

## Reproduce and consume

From the repository root:

```sh
node scripts/generate-motion-study-ledger.mjs --check
node --test scripts/generate-motion-study-ledger.node-test.mjs
node node_modules/vitest/vitest.mjs run src/test/motionStudyPhases.test.ts
```

The generator defaults to `--check`. After deliberately reviewing source changes, regenerate with `node scripts/generate-motion-study-ledger.mjs --write`. A failed check never overwrites the ledger. The output has no generated timestamp, and the same source bytes produce the same output.

`src/data/motionStudyLedger.json` has `{schemaVersion:1, fingerprintScope, entries}`. Each entry contains `family`, `variantId`, `intendedExerciseIds`, `title`, `sideMode`, `sourceFingerprint`, `fingerprintScope`, `sourceFiles:[{path,sha256}]`, five phases and three stages. Family plus variant ID identifies the authored renderer route. Unknown family/variant pairs remain unresolved.

`src/utils/motionStudyStages.ts` imports only the generated JSON. It exports `MotionStudyEntry`, `MotionStudyPhase`, `MotionStudyStage`, `MOTION_STUDY_ENTRIES`, `getMotionStudyEntry(family,variantId)`, `getMotionStudyPhase(entry,progress)` and `getMotionStudyStage(entry,progress)`. Lookups return `null` for unknown identities or non-finite progress. Finite progress is clamped to `0..1`; intervals are half-open except that progress `1` belongs to finish.

## Fingerprint scope

`sourceFingerprint` is SHA-256 under `authored-source-bundle-sha256-v1`. It hashes compact UTF-8 JSON with recursively sorted object keys for `{family,variantId,intendedExerciseIds,title,sideMode,fingerprintScope,sourceFiles,phases,stages}`. Array order is preserved. Per-file hashes use original bytes, and source file paths are sorted. Stable family and variant identity prevent variants sharing a source bundle from sharing a fingerprint.

The source bundle conservatively follows the actual relative import graph of each family: model geometry, relevant model types, authored definitions, SVG renderers and source-fact/provenance dependencies. Existing proposals include the aggregate definition/dispatcher and explicit identity/comparison/provenance roots (41 distinct files). The batch includes its definition, model and renderer (three files). Shared source changes can stale every binding in the same family. Generated ledgers, external packages, compiled assets, controls/player code and external CSS/layout are excluded. Renderer-owned inline SVG geometry/style attributes are included. This source/geometry scope does not claim to fingerprint the complete displayed page. The generator refuses dynamic module dependencies, unknown external modules, symlinked source/output paths, missing dependencies and generated-ledger dependency cycles.

The first 17 variants retain their separate `reviewedAssetSha256: null` in the older review-source manifest. The four pre-existing `assetSha256` values below remain separate and unchanged; the new ledger never substitutes its fingerprint for them:

| Batch variant | Existing asset SHA-256 |
| --- | --- |
| `chair-seated-bilateral-arm-raise-v1` | `947d026c6d6feffc68903a6e710cd02e9265a20b1b50051204273f7dea0d9336` |
| `chair-seated-overhead-sidebend-v1` | `754550261cdfd7b4a5c264e7e834a946f4b91bad5afeb36b772eb6a97ad4446a` |
| `prone-single-straight-leg-extension-v1` | `a6f7604604be8145370c93f3498c5d48775b391f09f9d94a54686604a5e19e08` |
| `prone-forearm-chest-extension-v1` | `3742de457aa8b248a5c4243882d66d800d31314df89b5c53b58b709bb26976d1` |

## Local phase and stage findings

All 21 source sequences have finite, ordered, contiguous coverage of `0..1` in `setup → move → turn → return → finish` order. The stage grouping preserves the source intervals: setup contains setup, main contains move/turn/return, and finish contains finish. These are local authored motion stages. They do not describe class warmup/cooldown, getting into/out of position, a prescribed hold, dosage or exercise suitability.

| Source variants | Phase boundaries | Source display behavior |
| --- | --- | --- |
| `supported-heel-raise` | `0 / .12 / .46 / .56 / .92 / 1` | Absent; ledger preserves `unknown` |
| `side-lying-clam`, `adult-supine-heel-slide`, `supine-knee-fold`, `side-lying-straight-leg-lift`, `side-lying-open-book`, `quadruped-arm-slide`, `quadruped-leg-slide`, `reformer-parallel-footwork`, `chair-seated-pedal-press`, `reformer-supine-strap-arm-press`, `cadillac-supine-arm-spring-press`, `ladder-supported-hip-extension-slide`, `ladder-supported-side-leg-slide` | `0 / .12 / .42 / .58 / .88 / 1` | Absent; ledger preserves `unknown` |
| `floor-seated-band-row`, `supine-chest-lift`, `articulated-pelvic-curl`, all four batch variants | `0 / .12 / .42 / .58 / .88 / 1` | Source declares `hold / move / hold / move / hold` |

Read-only source inspection and dynamic pose checkpoints found stationary geometry and contacts inside every setup, turn and finish interval. Boundary selection follows the source phase transitions. These checkpoints assess authored phase consistency; they do not validate a human movement, biomechanics, safety, source-video match or expert accuracy. No model/renderer change was justified by this audit, and all prior source/artifact bytes were preserved.

Concrete qualifications that stage text must preserve:

- Five slide variants (`adult-supine-heel-slide`, both quadruped slides and both ladder-supported slides) can retain a `sliding` contact mode while stationary in turn. The mode permits translation; it is not instantaneous velocity. `src/models/supineDrafts.ts` explicitly documents this distinction.
- `chair-seated-overhead-sidebend-v1` begins and finishes with the opposite arm overhead. Its lower hand is free and is not a chair contact (`src/models/motionAuthoringBatch.ts`, seated pose arm branches).
- `prone-forearm-chest-extension-v1` begins and finishes with head/chest already above the mat. Its setup/finish do not depict resting the head down; forearm/pelvis/foot constraints persist (`src/models/motionAuthoringBatch.ts`, prone pose branches).
- `articulated-pelvic-curl` retains an authored resting curve, including released `spine-2-mat` contact in setup/finish. Finish must not claim all spine links contact the mat (`src/models/pelvicCurl.ts`, spine/contact construction).

Fourteen older variants still lack declared `displayBehavior` metadata. The ledger preserves all 70 such phase fields as `unknown`, despite the observed stationary checkpoints. Clinical suitability, expert review, precise source-variant reconciliation, real contact pressure and source-video timing remain unverified.
