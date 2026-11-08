# Equipment discovery scope

The library, inline movement finder, public references, and course-link browser now share a locally persisted discovery scope: **owned** (default) or **all**.

## Behavior

- Settings and the library's inventory editor update the same equipment and prop arrays. In owned scope, changes immediately recompute the visible results.
- Every required equipment ID and real prop must be owned. Cadillac does not substitute for Tower, and a match on one item does not satisfy a multi-equipment movement.
- A movement without props does not require owning the special `none` marker.
- Empty or incomplete equipment metadata is not treated as equipment-free. The current model requires a mat for mat movements. An empty owned inventory therefore produces an explained empty state rather than silently displaying everything.
- Public references with unconfirmed complete requirements, including the current whole-course link catalog, are excluded in owned scope. An explicit all-equipment control remains available.
- Local name/tag/equipment/time filters intersect the shared scope. Resetting those local conditions does not change the scope. Explicit “all movements/references” empty-state recovery clears the local conditions and switches to all.
- Scope changes propagate between mounted surfaces and persist across navigation and browser reloads. All scope remains an explicit user choice even when inventory changes.
- Class equipment narrowing remains separate. Neither discovery filtering nor scope changes edits class conditions, saved sequences, review evidence, ownership, or active steps.
- Inline search now recognizes recorded equipment and prop labels as well as names and body tags. Pagination restarts when inventory or scope changes.

## Validation

- Nine integration tests cover settings checkbox changes, exact subtypes, multi-equipment/prop requirements, local resets, remounts, empty inventory, public references, course links, paging, prop-name search, and persistence migration.
- Existing unrestricted-browsing tests now request all scope explicitly. The class-finder regression verifies owned-first behavior and separate class narrowing.
- Real headless Chrome checks used a fresh temporary profile and synthetic local state. At 320, 390, and 1440 px, the scope controls had no horizontal overflow and were at least 44 px high. Scope survived reload, empty inventory recovered to all, and the workbench finder inherited the library selection. The 390 px screenshot was visually inspected.
- Build/type check/PWA verification, lint (one pre-existing Fast Refresh warning), motion-study checks, and secret checks passed. Final combined-suite validation is performed with the equipment-card changes before integration; no deployment is part of this feature.
