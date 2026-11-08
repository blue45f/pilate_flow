# Rotation diagram reference: Saw, Spine Twist, Criss-Cross

## Source comparison completed on 2026-11-08

The public Mat / Tips text on the three Pilatesology exercise pages was read and compared with the high-level movement cues. BASI Pilates' classical 34-exercise list was used only to correct historical numbering: Saw is 11, Spine Twist is 19, and Criss-Cross is not in that list. See `src/data/rotationSourceFacts.json` for exact URLs, scope and limitations.

No source video frames, photographs or motion capture were used. Source-page text review does not establish that every authored joint coordinate is anatomically exact. The external pages' licensing is not covered by this repository's code license. Unsupported source dates, hashes and book-attribution claims have been removed.

## Movement matching

The three canonical `rotation-mat-*` IDs and explicit matching mat aliases resolve to these diagrams. Reformer Mermaid, Short Box, Reformer Coordination, Cadillac Cat, the Ab Series of Five, side-lying Open Book, chair/Cadillac/barrel variants and the combined roll-back/twist archetype do not resolve to a standalone mat rotation diagram. They require their own posture, equipment or sequence representation.

```tsx
const phaseProps = toRotationMovementPhaseDiagramProps('original-mat-spine-twist', 'middle');
const triptychProps = toRotationMovementTriptychProps('rotation-mat-saw');
```

The catalog adapters return `null` for unmatched IDs. This batch does not certify the fallback diagrams or other tracks for those exercises.

## Authored schematic assumptions

- Joint coordinates, rotation angles, gaze coupling, phase timing and fixed anchor positions are illustration parameters, not measured human values or prescribed range-of-motion targets.
- Model tests check finite poses, left/right projection, numeric invariants and rendering. They do not validate clinical accuracy or individual safety.
- The Criss-Cross heel moves in space. It is not a floor-contact anchor. Its exact leg height is not prescribed by the source text.
- `assetSha256: null` means no geometry checksum was generated. A source-record hash must not be presented as an asset hash.
- Muscle overlays are simplified and are not measured activation maps. The unsupported claim that the raised extended leg establishes passive iliopsoas stretching was removed.

`anatomicalAccuracyAssumed: false`, `professionalReviewCount: 0` and `sourceFrameMappings: 0` remain truthful metadata. Professional approval is not a prerequisite for shipping this bounded source-comparison improvement. The diagrams do not diagnose, prescribe treatment or guarantee safe movement for an individual. Move within a comfortable range and stop if pain occurs.
