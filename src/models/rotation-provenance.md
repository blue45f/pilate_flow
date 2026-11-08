# Original Pilates Rotation 2D Schematic Provenance (`rotation-mat-saw`, `rotation-mat-spine-twist`, `rotation-mat-criss-cross`)

## 1. Authorship, Clean-Room Synthesis & License

- **License**: `CC0-1.0 OR MIT` (original authored TypeScript models, 3D-to-2D orthographic axial rotation projection, and native SVG schematics only).
- **Truthfulness Disclosures**:
  - `anatomicalAccuracyAssumed: false`
  - `professionalReviewStatus: 'unreviewed'`
  - `professionalReviewCount: 0`
  - `sourceFrameMappings: 0`
  - `sourceMediaCopiedOrTraced: false`
  - `medicalOrTherapeuticGuarantee: false`
- All 3D coordinates, 2D projected joint positions, ribcage cylinder yaw/pitch angles, bilateral shoulder foreshortening ratios, and phase fractions are clean-room mathematical constructions created for instructional planning visualization. They are not motion-capture recordings, clinical biomechanical measurements, or frame traces.

## 2. Verified Public References

1. **Joseph H. Pilates & William J. Miller (1945, US Public Domain)** — *Return to Life Through Contrology*, J.J. Augustin, New York ([Internet Archive](https://archive.org/details/returntolifethro00pila)):
   - **Exercise #11: The Saw** — Wide V-sit on the mat with arms abducted to shoulder height; axial torso rotation precedes diagonal forward flexion so the little finger slices past the outside of the opposite little toe while both sit-bones remain anchored on the mat.
   - **Exercise #14: The Spine Twist** — Long sitting with legs straight and pressed together, ankles dorsiflexed, and arms extended laterally in a T-position; pure vertical-axis rotation of the ribcage and head as a unit without pelvic shift or independent arm swing.
   - **Exercise #16: The Criss-Cross** — Supine thoracic curl with hands behind the occiput and elbows wide; oblique rotation brings the armpit/anterior ribcage toward the opposite bent tabletop knee while the other leg extends diagonally at 45° and the pelvis remains level on the mat.
2. **Cambridge University Hospitals NHS Foundation Trust (CUH NHS)** — [Pilates: exercises and principles](https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/):
   - Seated thoracic rotation guidance: equal weight across both sit-bones (`pelvisShiftMm === 0`), axial elongation through the crown prior to rotation, and head/gaze aligned with the sternum.
3. **Merrithew / STOTT PILATES** — [Exercise of the Month: Spine Twist & Rotational Biomechanics](https://www.merrithew.com/blog/post/2018-05-15/exercise-of-the-month-spine-twist):
   - Arms remain in the coronal/scapular plane of the ribcage during Spine Twist (preventing isolated shoulder adduction), opposite sit-bone heavy anchoring and internal rotation of the posterior arm during Saw, and wide elbows with rib-to-hip oblique sling activation during Criss-Cross.

## 3. Five-Point Kinematic Differentiation Ledger

| Movement ID | 1. Rotation Axis (`data-rotation-axis`) | 2. Pelvis Anchor (`data-pelvis-anchor`) | 3. Gaze Vector (`data-gaze-vector`) | 4. Ribcage & Scapula (`data-ribcage-scapula`) | 5. Transition Pose (`data-transition-pose`) |
|---|---|---|---|---|---|
| `rotation-mat-saw` | Vertical axial twist first, then oblique flexion hinge toward opposite foot | Wide V-sit bilateral sit-bone lock; opposite sit-bone 100% grounded (`pelvisShiftMm === 0`) | Tracks sternum on twist, then angles down toward rear hip / inner knee | Front pinky slices past opposite 5th toe; rear arm internally rotates & extends back | Restack spine vertically while rotated before untwisting to center |
| `rotation-mat-spine-twist` | Pure vertical crown-to-sacrum plumb axis (`0°` sagittal lean) | Long-sitting legs pressed together, dorsiflexed ankles, zero heel shift (`leftHeel.x === rightHeel.x`, `pelvisShiftMm === 0`) | Horizontal gaze coupled strictly to sternum normal vector | 180° T-arms locked in ribcage coronal plane; 2D shoulder span foreshortens (`shoulderSpan2D < restShoulderSpan`) | Axial elongation (growing taller) while unwinding lower-to-upper ribs |
| `rotation-mat-criss-cross` | Upper thoracic curl + oblique axial twist above imprinted lumbar spine | Level sacrum & bilateral ASIS horizontal mat imprint (`pelvisShiftMm === 0`) | Oblique gaze past outside of bent tabletop knee / toward rear elbow | Wide elbows (`168°` span, no elbow pulling); armpit/ribcage rotates toward opposite 90° tabletop knee while extending other leg at 45° | Maintain upper thoracic curl height across center switch before lowering |
