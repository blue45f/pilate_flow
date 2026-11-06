# Backup Compatibility Round-Trip & Rollback Nested Integrity Harness

Deterministic, bounded verification suite proving that:
1. **Scope A (Allowlist Compatibility & Semantic Preservation)**: The explicit-allowlist backup schema introduced in `40f97e7` preserves all supported user domain fields across `export -> parse -> inspect -> restore dry-run -> restore -> re-export`, including deleted custom exercises backed by inline snapshots, human movement drafts, reusable block metadata, teaching history snapshots, schedules, study state, dated sequence planning, equipment/apparatus/props, condition templates, and legacy `v0` / `v1` / `v3` backups.
2. **Scope B (Rollback Nested Integrity & Pre-Mutation Guards)**: Corrupted nested records inside `pilates-flow-backup-rollback-v1` (where top-level items have valid `id`/`stepId` strings but contain invalid inner field types, duplicate IDs/stepIds, dangling references, corrupted auxiliary fields, non-finite numbers, or `__proto__`/`constructor`/`prototype` keys) are rejected before mutating `localStorage`, the Zustand store, or existing history/photo references, while valid `v0`/`v1` rollback points and local-only domain fields remain recoverable.

---

## Reproduced & Resolved Defects (`C1`, `C2`, `R1`–`R7`)

| Defect ID | Scope | Root Cause | Minimal Fix | Corpus Case |
| --- | --- | --- | --- | --- |
| **C1** | Scope A (`src/utils/backupRecoveryInspection.ts`) | `hasInvalidHistorySnapshotExerciseRefs` and `importedSequences` step checks validated `exerciseId` only against top-level `knownExercises` (`exercises[]`). When a custom exercise was later deleted from `exercises[]`, history logs and saved sequences that preserved the exercise via inline snapshots (`programSnapshot.exercisesById`, `programSnapshot.items[i].exerciseSnapshot`/`movementSnapshot`, `sequenceSnapshot.exerciseSnapshots`, `stepsSnapshot[i].exerciseSnapshot`, or `step.exerciseSnapshot`) were falsely rejected with `missing_exercise`. | Collect all valid inline snapshot exercise IDs inside `hasInvalidHistorySnapshotExerciseRefs` and allow `step.exerciseSnapshot?.id === step.exerciseId` on `importedSequences`. | `CMP-DEL-001` |
| **C2** | Scope A (`src/utils/teachingHistorySnapshot.ts`) | `movementSnapshotToTeachingExerciseSnapshot`, `createTeachingExerciseSnapshot`, and `reconstructExerciseFromSnapshot` dropped human-draft variant and provenance fields (`parentDraftId`, `parentDraftRevision`, `variantLabelKo`, `capturedAt`, `sourceOrigin`, `ideaLineSnapshot`, `feelLogsSnapshot`, `modificationLogsSnapshot`, `photoReferencesSnapshot`, `safetyBoundarySnapshot`, `historicalExtension`), and `reconstructStepsSnapshotFromHistoryLog` dropped `blockInstanceDetached`, `classSection`, `motionStudy`, `futureStep`, and `historicalStepLabel`. | Preserve all provenance, human-draft, and step metadata fields across snapshot conversion, reconstruction, and history-to-draft cloning. | `CMP-SNAP-001` |
| **R1** | Scope B (`src/utils/teachingHistorySnapshot.ts`) | `inspectPersistedRollbackPoint` parsed raw JSON without `isSafeRollbackValueTree`, allowing `__proto__`, `constructor`, or `prototype` keys and excessive nesting (`> 24` depth) inside `preRestoreState`. | Enforce `isSafeRollbackValueTree(parsed)` and own-property access before inspecting or applying rollback points. | `RBK-PROTO-001` |
| **R2** | Scope B (`src/utils/teachingHistorySnapshot.ts`) | `isValidBackupPreRestoreDomainState` ignored `conditionTemplates`, `instructorSchedule`, `instructorStudyState`, `datedSequencePlanning`, `ownedEquipment`, `ownedApparatus`, `ownedProps`, `lastCriteria`, `draftCriteria`, and `movementIdeaDraftState`, and did not validate `activeSteps` (which use `stepId`, not `id`) or scalar workspace metadata (`activeTitle`, `activeApparatus`, `activeLevel`, `activeTargetMinutes`, `selectedGroupId`, `activeSourceSequenceId`, `activeSourceSequenceVersion`, `activeSourceProvenance`, `builderDraft`). | Validate all auxiliary domain fields, optional workspace fields, `activeSteps` via `stepSchema`, and `isValidMovementIdeaDraftState(state.movementIdeaDraftState)`. | `RBK-AUX-001` |
| **R3** | Scope B (`src/utils/teachingHistorySnapshot.ts`) | `hasValidEntityIds` only checked `typeof item.id === 'string' && item.id.trim().length > 0`, allowing corrupted nested fields inside `exercises`, `savedSequences`, `classGroups`, and `historyLogs`. | Validate every item in `exercises`, `savedSequences`, `classGroups`, and `historyLogs` with `exerciseSchema`, `sequenceSchema`, `groupSchema`, and `historySchema` via `.safeParse` (preserving original objects so local-only fields are not stripped). | `RBK-NEST-001`, `RBK-NEST-002`, `RBK-NEST-003`, `RBK-COMPAT-001` |
| **R4** | Scope B (`src/utils/teachingHistorySnapshot.ts`) | Duplicate `id` values across `exercises`, `savedSequences`, `classGroups`, `historyLogs`, or `conditionTemplates` and duplicate `stepId` values inside `sequence.steps`, `activeSteps`, or history snapshots were accepted in rollback payloads. | Enforce `hasUniqueRecordIds` and `hasDuplicateRollbackStepIds` across all rollback collections and nested step arrays. | `RBK-REF-001` |
| **R5** | Scope B (`src/utils/teachingHistorySnapshot.ts`) | Rollback validation did not check cross-record referential integrity (`sequence.steps` or `activeSteps` referencing missing `exerciseId` without matching inline `exerciseSnapshot`, or `historyLogs` referencing missing `groupId` or missing `exerciseId` without inline snapshot). | Enforce `hasValidRollbackHistoryRefs` and step exercise reference checks (allowing inline `exerciseSnapshot`) before accepting rollback state. | `RBK-REF-001` |
| **R6** | Scope B (`src/utils/teachingHistorySnapshot.ts`) | Persisted rollback envelope metadata (`version`, `restoredAt`, `addedCount`, `postRestoreStateFingerprint`) accepted empty strings, invalid dates, negative/float `addedCount`, or non-finite numbers. | Enforce strict envelope metadata validation (`version === 1` or legacy `undefined`, `Number.isFinite(Date.parse(restoredAt))`, non-negative integer `addedCount`, non-empty `postRestoreStateFingerprint`). | `RBK-AUX-001` |
| **R7** | Scope B (`src/utils/teachingHistorySnapshot.ts`) | `recordBackupRestoreRollbackPoint` and `getLatestBackupRollbackPoint` did not run `isValidBackupPreRestoreDomainState` on the in-memory `preRestoreState`, allowing programmatic callers with `NaN`/`Infinity` or corrupted nested state to poison `inMemoryBackupRollbackPoint`. | Gate `recordBackupRestoreRollbackPoint` and `getLatestBackupRollbackPoint` with `isValidBackupPreRestoreDomainState` and `isSafeRollbackValueTree`. | `RBK-PROTO-001` |

---

## Usage

Run the bounded CLI harness (executes Vitest suite + negative-control subprocess check):

```bash
node scripts/backup-compatibility-rollback.mjs
```

Save the JSON report to a file:

```bash
node scripts/backup-compatibility-rollback.mjs --output /tmp/compat-rollback-report.json
```

Simulate a forced negative-control failure (verifies non-zero exit code `1`):

```bash
node scripts/backup-compatibility-rollback.mjs --inject-negative-control
```
