# Original supine schematic drafts

These two new, independent, unreviewed drafts are staged for the draft lab only:
`adult-supine-heel-slide` and `supine-knee-fold`. Their geometry and SVG primitives
were authored from scratch. At the original isolated authoring delivery, the old pediatric-source heel-slide schematic,
archives, active application and exact-motion registry were untouched. The parent has
since integrated these new files into the draft lab; the old schematic, archives
and exact-motion registry remain unchanged.
Neither new draft is an exact approved asset for a catalog exercise.

## Public facts consulted

Access date is **2026-11-04 UTC**. The `2026-11-05` directory name is the requested
artifact label, not a claim that access happened on that date. The authoritative
combined ledger is `../data/motionDraftSourceLedger.json`; `supine-source-facts.json`
contains the relevant unchanged factual records and their recorded hashes.

| Draft                                    | Primary public reference                                                                                                                                                                                                                                  | Verified factual scope                                                                                                                                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adult-reference heel slide               | [North Bristol NHS Trust, Post-operative Exercises DIEP Reconstruction](https://www.nbt.nhs.uk/our-services/a-z-services/breast-reconstruction/post-operative-exercises-diep-reconstruction), section 3; referenced exercise 1 for initial foot placement | Floor lying, knees bent, arms beside body; one leg stays still while the other slides out towards straight and returns. The natural lower-back curve and still pelvis are cues.                                               |
| Adult-reference heel slide corroboration | [Royal Marsden, Exercise and advice to help you recover after your abdominal operation](https://patientinfolibrary.royalmarsden.nhs.uk/document/download/1386), printed page 9 / physical page 11                                                         | Supine bent knees, initially flat slightly separated feet; heel travels forward along the floor and returns.                                                                                                                  |
| Bent-knee single-foot lift               | Same Royal Marsden document, printed page 8 / physical page 10, Single knee lifts                                                                                                                                                                         | Supine bent knees, initially flat slightly separated feet; one foot lifts from bed/floor with hip bending, then returns. This section specifies a 90-degree hip target and a five-second hold for its particular progression. |
| Naming/contact corroboration only        | [Torbay and South Devon NHS Foundation Trust, Stress urinary incontinence](https://www.torbayandsouthdevon.nhs.uk/uploads/25988.pdf?last-updated=20260902), physical page 4, Knee folds / Scissors                                                        | The single foot leaves the mat and returns. Its preceding flat-spine cue and the fold's neutral-pelvis cue remain an unresolved variant distinction.                                                                          |

These are clinical postoperative or condition-specific references. Adult context
is inferred from the clinical service and procedure; the inspected exercise
sections do not state an explicit adult age criterion. They do not establish
general adult fitness suitability. The Royal Marsden progression is from six
weeks after surgery unless the surgical team advises otherwise. Its dosage and
hold are source-specific context, not app instructions or preview timing.
No pregnancy-specific instructions were adopted.

## Chosen variant and support reconciliation

Both models start with two bent knees, separated feet, and one selected anatomical
leg. A cycle returns that selected leg to its start; it does not animate the other
leg or imply an alternation order. Side selection belongs to the parent player.

The heel slide follows the North Bristol bent-knee, one-leg-stationary floor
variant, corroborated by the Royal Marsden explicit heel-on-floor description.
The displayed mat substitutes for that floor surface. The authored rigid foot
also keeps the toe on the mat throughout; the sources establish the heel path,
not a complete measured foot/ankle trajectory. The knee straightens through a
fixed-length two-link construction. The pelvis, head and upper back keep their
support positions; only pelvis stability is an explicit North Bristol cue.
The torso does not simulate the natural spinal curve, and gives no flat-back cue.

The knee fold follows Royal Marsden's single-foot lift from a bent-knee start.
The bent active leg and foot rotate as a rigid display linkage about a fixed hip,
so both heel and toe leave the mat. The vertical-thigh/horizontal-shin endpoint
is an authored schematic arrangement compatible with the described hip target;
it is not an exact measured human pose. Constant knee bend and foot orientation
are drawing constraints, not source-established anatomical measurements.
The support leg, pelvis, head, upper back and arms stay still as explicit authoring
choices: that Royal Marsden subsection does not specify all of those contacts.
No Torbay spine setup has been merged into the chosen Royal Marsden variant.

Both drawings omit a pillow and show arms beside the body. North Bristol states
arms beside the body; the fold source does not. Direct head support, torso shape,
arm and hand locations, mat dimensions, all proportions, camera projection,
numeric limb lengths, easing and five-phase boundaries are authoring choices.
No source photo, diagram, video, video frame, motion capture or traced geometry
was viewed or copied for authoring. Reference text was consulted as facts only.

## Geometry and integration contract

`Point3` is the existing readonly tuple type. World coordinates are `x` from head
towards feet, `y` across the mat, and `z` above it. Mat height is `z = 0`.
Anatomical left has positive `y`; right has negative `y`. The camera is left-near.
`mirrored` reflects only projected horizontal coordinates about the 640-wide
viewBox; it never exchanges anatomical names, world points or contact states.

Integrate the four new source/test files at their same relative paths:

- `src/models/supineDrafts.ts`
- `src/models/supineDrafts.test.ts`
- `src/components/SupineDraftFigure.tsx`
- `src/components/SupineDraftFigure.test.tsx`

The model imports only existing shared types. It exports `SupineDraftId`,
`SupineDraftOptions`, `SupineLeg`, `SupineBody`, `SupineContact`, `SupineDraftPose`,
`SUPINE_PHASES` per independent draft ID, `SUPINE_DIMENSIONS`,
`SUPINE_MODEL_VERSION`, `getSupineDraftPose`, and `projectSupinePoint`.
Renderer props are `{ draftId, progress, activeSide?, mirrored?, className?, label? }`.
It uses a native `640 × 360` SVG and instance-unique accessible title/description IDs.
The module has no canonical exercise lookup, asset registration or playback clock.

`getSupineDraftPose(id, progress, { activeSide, mirrored })` rejects nonfinite
progress and invalid runtime IDs/options; finite progress clamps into `[0, 1]`.
It returns world body/leg points, explicit contacts, normalized progress, a phase,
selected and support sides, and camera metadata. Contact state `sliding` is a
translating mat-contact constraint; it is not a statement of instantaneous speed
during the turnaround phase. Start and finish world geometry and contacts match
exactly. The parent owns pause defaults, reduced motion, duration and reset rules.

The isolated harness's `node_modules` and `src/models/types.ts` are read-only
symlinks into the active application for dependency/type resolution. They are
not deliverables and must not be copied back. No shared types were modified.

## Rights and review

The new original software and original geometric/SVG primitives are provided
under `SUPINE-LICENSE.txt` (0BSD). This grant covers this project's original contribution
only. Public access is not permission to reproduce NHS or other third-party text,
illustrations, video, logos or other media. No such media is included. Factual
record hashes identify authored reference summaries; they are not hashes of a
source PDF, approval evidence or rendered-motion checksums.

Source checking, software mechanics and professional exercise review are separate.
Professional motion review count is zero, exact asset mappings remain absent,
and individual suitability is unverified. Tests establish implementation invariants
only. Parent integration and software/browser review are recorded in the root
`MOTION_BLOCKS_V2.md`; professional review remains separate work.
