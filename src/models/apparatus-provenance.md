# Original apparatus schematic provenance

This record accompanies `src/models/apparatusDrafts.ts`,
`src/models/reformerFootwork.ts`, `src/models/chairPedalPress.ts`,
`src/models/apparatusGeometry.ts` and
`src/components/ApparatusDraftFigure.tsx` in the integrated source tree.
The original software grant is `src/models/apparatus-LICENSE.txt`.
These are separate original, unreviewed procedural drafts, not exact exercise
assets, approved instruction, manufacturer setup advice or automatic substitutes.

During authoring on **2026-11-04 UTC**, this owner's writes were confined to
`/workspace/pilates-motion-blocks-v3-2026-11-05/apparatus/`. The parent supplied
baseline main `c8a7937`; this owner did not run Git or edit the active project,
shared types, existing source, previous apparatus work, archives, global tools,
home directories or Library. Other owners' active work is outside this statement.
The `2026-11-05` artifact name is not a source-access date.

## Checked public facts

The research owner's authoritatively checked record is intended to integrate as
`src/data/motionApparatusSourceLedger.json`. The relevant unchanged factual
records are also included in `src/models/apparatus-source-facts.json`.
Its hashes identify original authored factual summaries, not source-document
bytes, rendered motion, source permission or professional approval.

| Independent draft            | Source and locator                                                                                                                                                                                                                                   | Facts retained                                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reformer-parallel-footwork` | [Merrithew, At Home Reformer Challenge: Week 2 Legs](https://www.merrithew.com/blog/post/2020-05-15/at-home-reformer-challenge-week-2-legs), Bianca Bolissian, 2020-05-15, section 1 Second Position Parallel                                        | Supine on carriage, heels on footbar, parallel at hip distance; carriage moves out as knees extend and returns.                                                            |
| Reformer topology            | [Balanced Body, Guide to the Pilates Reformer](https://www.pilates.com/ultimate-guide-to-the-pilates-reformer/)                                                                                                                                      | Cushioned carriage travels on frame tracks/rails; footbar supports hands/feet for pushing the carriage. This is general structure, not measured footwork geometry.         |
| `chair-seated-pedal-press`   | [Balanced Body The CORE, Circuit Training in Pilates: Find, Feel, and Discover](https://thecore.pilates.com/pilates-cross-training-reformer-exo-chair-sequencing/), Meghan Uhl, 2026-08-07, Connect the Upper Body to the Center (text lines 99–102) | Seated EXO Chair, both heels on pedal, simple leg pumps; both sit bones supported evenly on seat with balanced pelvis and lengthened spine.                                |
| Chair topology               | [Balanced Body public Chair manual sample](https://s3.amazonaws.com/s3.pilates.com/resources/store/book-samples/bk7002_chair_sample.pdf), printed page 5 / physical page 3                                                                           | Chair has a seat and hinged foot pedal, with spring attachments; feet or hands can push the pedal. The sample does not contain the full Double Leg Pumps instruction page. |

Stable source IDs are `merrithew-reformer-second-position-parallel-v1`,
`bb-reformer-apparatus-anatomy-v1`,
`bb-core-chair-seated-double-heel-pumps-v1` and
`bb-chair-manual-sample-apparatus-anatomy-v1`. Access was 2026-11-04 UTC.
These public professional/manufacturer descriptions do not establish every
individual's suitability or validate this authored geometry.

No source photograph, diagram, video frame, video, audio, traced geometry,
captured motion or private code was imported. Only publicly inspected text
facts were paraphrased. No media reproduction permission is asserted.

## Exact chosen variants and independent authoring choices

The reformer draft uses the **parallel heel** variant only. It does not merge
Merrithew's separate forefoot/lower-lift variation. Both heels stay at fixed
footbar anchors while the carriage travels longitudinally and both knees extend
and bend. Pelvis, back and head support anchors translate rigidly with the
carriage; shoulders, head and arms share that displacement. The footbar is fixed
for this drawing. Headrest, shoulder blocks, exact body contact surfaces, arm
placement, heel/ankle/toe geometry, carriage height, rail layout, range and
proportions are independently authored assumptions, not observed source data.
The knee extension endpoint leaves a geometric bend; it is not a measured
clinical range or a claim about locking/hyperextension.

The chair draft uses **seated bilateral heel pumps on a single Pilates-chair
pedal**. It is not an ordinary chair. Both sit-bone anchors remain on the fixed
seat; the two heels remain at fixed local anchors on one pedal. The pedal rotates
about a fixed widthwise hinge. Feet rotate with that authored pedal rig and both
knees adapt through fixed-length linkages. The hinge topology is source-backed;
its pivot, radius, board size, start/end angles, heel offsets, foot orientation,
return path and closed preview cycle are authoring choices. The public seated
paragraph does not define a complete press/return trajectory. The torso and arms
are held fixed as an explicit drawing choice; hands are not represented as a
source-established support. No alternate/split pedal or Magic Circle progression
is combined with this variant. The source's EXO description does not prove an
exact generic catalog equipment match or a manufacturer's actual dimensions.

Both legs are bilateral. `activeSide` retains its anatomical input in metadata
but does not select a moving leg or change either limb's geometry. The parent
may hide its unilateral side control for these two drafts. The body left is
positive world `y`, right negative `y`; these names survive mirroring.

All numbers are unitless drawing choices, including limb lengths, coordinate
locations, joint angles, camera projection, supports, display ranges, easing and
five-phase timing. World `x` is longitudinal head→feet for the supine rig and
rear→front for the seated chair, `y` is width, `z` is height; floor is `z=0`.
Projection-only mirroring reflects horizontal SVG coordinates about width 640.
The SVG is original mathematics and native primitives, not a traced image.

**Springs, spring forces, resistance, spring settings, loading, friction, inertia,
locking systems, straps, equipment adjustment, manufacturer-specific mechanisms,
equipment tolerances, setup procedures and safety conditions are not modeled.**
No spring or equipment setting is recommended. The closed paths are kinematic
schematics; they do not simulate how forces produce the movement. The parent
owns paused defaults, preview duration, reduced motion and resets.

## Registry and review boundary

Related catalog IDs for human review are `original-reformer-parallel-footwork`
and `original-chair-seated-pedal-press`. No mapping is implemented here. The model
accepts its own two independent draft IDs only and rejects canonical exercise
IDs. Every pose explicitly reports professional review count 0, `exactAsset:
false` and `autoSubstitution: false`. Source checking and software invariants are
separate from professional review, individual suitability or safety validation.

Tests check finite poses, fixed leg and foot segment lengths, both heel contacts,
rigid carriage/body/support translation, fixed chair seat/pelvis and hinge,
constant pedal radius/board geometry, side identity, projection-only mirror,
five phases, continuity and exact cycle closure. Renderer checks verify SVG
metadata, accessible unique IDs, anatomical/contact labels and absence of copied
media. Browser/visual review and parent integration are separate pending work.

Only the original project contribution receives the accompanying 0BSD grant.
Public source access does not license third-party text, photographs, video,
illustrations, trademarks, logos or manufacturer material.
