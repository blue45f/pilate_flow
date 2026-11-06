# Direct composition authoring

## User-facing contract

- Add, create, combine, save, and rehearse a valid movement without completing an instructor review. Local automatic composition can also use valid unreviewed movements matching the selected criteria.
- Keep review records and source evidence intact. Adding or saving never manufactures an approval. A material edit leaves the old review as historical evidence and naturally makes it stale; a fork does not inherit approval.
- A missing source, invalid duration, duplicate instance identity, or incompatible selected equipment remains a real data problem. Permission to author is not a safety or effectiveness endorsement.
- Keep source/evidence and optional review details accessible through disclosures. Existing videos and other assets are preserved.
- External AI response validation and provider restrictions remain a separate contract; this change does not enable a paid provider or weaken those checks.

## Reordering and recovery

Every movement and rest has a stable instance ID. A pointer drag changes the order once on release. A cancelled pointer, lost capture, Escape, or a tap does not commit. Up/down buttons and arrow keys provide equivalent actions. A locked row remains in its original position; neither dragging nor buttons may cross that locked position. Each order or removal action creates one undo snapshot. Removing the last row is reversible.

The four row actions have equal widths, consistent baselines, and at least 44 px touch targets at 320 px. Focus returns to the moved row. Changes are announced through the existing status message. Motion is disabled when reduced motion is requested.

## Class voice boundary

A valid unreviewed plan may use the timer and optional local Korean title/time narration. Unreviewed breathing content is not narrated. If the current title or breathing source changes, any current utterance is cancelled; the update does not speak automatically. Explicit enable/start, stop/hidden cancellation, no duplicate announcements, and local-only Korean voice rules remain unchanged.

## Verification and design comparison

The original Atelier mobile concept and the later motion-sequence/block-editor concept were inspected. This focused patch preserves the existing cream/forest palette, cards, sidebar, and navigation. It brings explicit add controls, aligned order actions, spacing, and optional disclosures closer to the intended simple workflow. It does not claim exact concept fidelity: the current mobile shell still has more navigation and summary content before the sequence than the compact concept.

Accessibility review used keyboard equivalence, visible focus, 44 px controls, progressive disclosure, and reduced-motion guidance. Browser tests exercise 320, 390, 768, and 1440 px layouts: unreviewed addition, reorder, undo, save, preview availability, reload persistence, no horizontal overflow, and unchanged review counts. Desktop pointer dragging was verified separately, not inferred from a unit test.

The installed Android AVD was tested in actual Chrome at 412 px: three unreviewed additions, native touch reorder/undo, save, reload, and no horizontal overflow. Gboard was in a floating input-toolbar mode; this is not evidence of a docked keyboard resize test. iOS Simulator and physical phones were not verified for this patch. No SDK was installed. Viewport emulation and actual emulator evidence are kept separate. No operating deployment is included.
