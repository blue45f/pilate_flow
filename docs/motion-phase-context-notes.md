# Phase context notes

`getMotionPatternPhaseContext(reference, progress)` resolves the selected authored phase using the explicit family/variant identity and the existing definition's intervals, label and declared display behavior. Finite progress is clamped to `0..1`; phase intervals are half-open, with `1` assigned to finish. Unknown identities and non-finite progress return `null`.

All 21 existing references retain their current phase label, cycle support summary and source context. Fourteen older definitions still have no declared display behavior; their value remains `unknown`. Eighteen references have `detailStatus: not_authored` for the additional phase explanations. This does not change their existing authored asset status.

The three annotation sets in `src/data/motionPhaseContextNotes.ts` describe inspected local geometry:

- `chair-seated-overhead-sidebend-v1`: the opposite arm is already overhead at setup and finish; the lower hand never becomes a chair contact. Evidence: `src/models/motionAuthoringBatch.ts`, `seatedPose` arm branches and contact construction.
- `prone-forearm-chest-extension-v1`: the head/chest are already above the mat at setup and finish; pelvis, forearm/hand and forefoot constraints persist. Evidence: `src/models/motionAuthoringBatch.ts`, `pronePose` shoulder/head and contact construction. Abdominal surface contact and pressure are not modeled.
- `articulated-pelvic-curl`: setup and finish retain an authored lumbar curve and a released `spine-2-mat` patch. Contact changes during move/return must not be simplified to all patches always touching or always released. Evidence: `src/models/pelvicCurl.ts`, `PELVIC_CURL_DRAWING_PARAMETERS.restSpineAngles`, `makeSpine`, and `contact` state construction.

Each set persists the inspected `motionStudyLedger.json` source fingerprint. If that entry's fingerprint changes, `detailStatus` becomes `stale` and the resolver omits all old pose/contact annotations and qualifications. Current phase and cycle context remain available. Inspect the changed model before replacing an expected fingerprint. The browser comparison relies on the generated ledger's freshness; the existing ledger generator/check remains responsible for matching that ledger to source bytes.

These notes provide phase-level changes across an interval, not measured contact states at every instant. The basis is `authored-model`; no annotation grants source-video matching, exact source-variant matching, clinical suitability, pressure validation, professional review, or recommendation eligibility. They do not describe getting into/out of posture, class warmup/cooldown, or a prescribed hold. The existing source/review worksheet remains the place for source records and review export.
