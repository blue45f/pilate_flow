# Deterministic Backup & Teaching History Input Boundary Corpus & Runner

This suite provides a **deterministic synthetic fixture corpus**, a **Vitest boundary regression suite**, and a **bounded CLI runner** that directly import and test the real backup/history inspection, legacy conversion, normalization, restore, and rollback functions across all enforced input boundaries (`D1`–`D6` resolved).

- **Synthetic Corpus**: `src/test/fixtures/backup-recovery/backupInputBoundaryCorpus.json`
- **Vitest Suite**: `src/test/backupInputBoundaries.test.ts`
- **Bounded CLI Runner**: `scripts/backup-input-boundaries.mjs`
- **Corpus Seed**: `pilates-backup-boundary-seed-20261106-v1`
- **Total Boundary Cases**: `27` (`26` `PASS_ENFORCED_GUARD` including `6` resolved `D1`–`D6` guards, `0` `REPRODUCED_DEFECT`, `1` `PASS_NEGATIVE_CONTROL`, `0` `ENV_LIMIT`)

---

## 1. Finite Resource & Safety Upper Bounds

All generated payloads and executions are strictly bounded to prevent OOM or unbounded fuzzing:

| Bound | Limit | Purpose |
| :--- | :--- | :--- |
| `maxPayloadBytes` | `15,000,000` bytes (15 MB) | Product `MAX_LOCAL_BACKUP_BYTES` UTF-8 ceiling |
| `maxOversizeTestBytes` | `15,000,128` bytes | Finite upper bound for `too_large` rejection test (`BND-LIM-001`) |
| `maxGeneratedStringBytes` | `262,144` bytes (256 KB) | Finite ceiling for long-string boundary tests (`BND-LIM-002`, `BND-LIM-004`) |
| `maxGeneratedArrayLength` | `2,000` items | Finite ceiling for large-array boundary tests (`BND-LIM-003`, `BND-LIM-004`) |
| `maxGeneratedNestingDepth` | `128` levels | Finite ceiling for deep JSON nesting tests (`BND-LIM-004`, `MAX_BACKUP_JSON_DEPTH = 64`) |
| `maxCaseDurationMs` | `5,000` ms | Per-case execution timeout |
| `maxSuiteDurationMs` | `30,000` ms | Whole-suite execution timeout |
| `maxRunnerHeapDeltaMb` | `256` MB | Runner heap delta ceiling (`--max-old-space-size=512`) |

Every rejected boundary test verifies **four safety invariants**:
1. **Zero Input Mutation**: SHA-256 of the raw JSON input string before and after inspection/restore is identical.
2. **Zero `current` State Mutation**: Canonical SHA-256 fingerprint of the `current` state passed to `inspectBackupRecovery` is unchanged.
3. **Zero Partial Storage or Store Writes**: `usePilatesStore.getState()`, `localStorage['pilates-flow-atelier-storage-v3']`, and `localStorage['pilates-flow-backup-rollback-v1']` are unchanged after a rejected `restoreBackup(raw)`.
4. **Zero Global `Object.prototype` Pollution**: `Object.getOwnPropertyNames(Object.prototype)` and `({}).polluted` remain untouched.

---

## 2. Reproducible Commands

```bash
# 1. Run the Vitest boundary regression suite directly
pnpm exec vitest run src/test/backupInputBoundaries.test.ts

# 2. Run the bounded CLI runner with strict zero-reproduced-defects enforcement and negative-control subprocess verification
node scripts/backup-input-boundaries.mjs --fail-on-reproduced-defects

# 3. Verify that an injected boundary invariant failure exits non-zero (exit code 1)
node scripts/backup-input-boundaries.mjs --inject-negative-control
```

---

## 3. Enforced Runtime Boundary Fixes (`D1`–`D6`)

All six boundary defects (`D1`–`D6`) reproduced in `ad11a4d` are resolved in the four owned runtime modules (`src/schemas/cloudBackupSchema.ts`, `src/utils/backupRecoveryInspection.ts`, `src/utils/teachingHistorySnapshot.ts`, `src/utils/movementIdeaDraft.ts`) and verified as `PASS_ENFORCED_GUARD`:

| Defect ID | Case ID | Target Module / Function | Enforced Runtime Behavior |
| :--- | :--- | :--- | :--- |
| **D1** | `BND-REF-004` | `src/schemas/cloudBackupSchema.ts` (`stepSchema`, `exerciseSchema`, `sequenceSchema`, `groupSchema`, `historySchema`) + `src/utils/backupRecoveryInspection.ts` (`strippedKeys`) | Removed unbounded `.passthrough()` from domain schemas and declared explicit allowlisted optional fields (hierarchy/snapshot/draft fields + contract extension fields). Unknown fields on domain records are stripped by Zod and rejected by `strippedKeys(data, checked)` with `unsupported_fields`. |
| **D2** | `BND-PROTO-002` | `src/utils/backupRecoveryInspection.ts` (`assertSafeJsonInputTree`, `canonicalRecoveryContent`), `src/utils/movementIdeaDraft.ts` (`getScopedHumanDraftMap`, `getMovementIdeaMetaMap`, `getMovementIdeaMeta`, `getHumanDraftForIdeaExercise`), `src/utils/teachingHistorySnapshot.ts` (`stripUndefinedDeep`, `getSafeOwnRecordValue`, `resolveTeachingHistoryView`) | 1) `assertSafeJsonInputTree` rejects any own `__proto__`, `constructor`, or `prototype` key anywhere in parsed backup JSON before envelope/schema parsing (`unsupported_fields`).<br>2) `canonicalRecoveryContent`, `getScopedHumanDraftMap`, and `getMovementIdeaMetaMap` skip dangerous keys so local intermediate/returned maps never have their prototype mutated.<br>3) `getSafeOwnRecordValue` / `getSafeOwnEntry` use `Object.prototype.hasOwnProperty.call` and block `__proto__`/`constructor`/`prototype`, preventing `TypeError` on `exerciseId: 'constructor'`. |
| **D3** | `BND-REF-005` | `src/schemas/cloudBackupSchema.ts` (`teachingProgramSnapshotSchema`, `classSequenceSnapshotSchema`, `historySchema`) + `src/utils/teachingHistorySnapshot.ts` (`isUsableProgramSnapshot`, `isUsableSequenceSnapshot`, `resolveTeachingHistoryView`, `collectMissingSnapshotExercises`, `collectDriftedSnapshotExercises`, `reconstructStepsSnapshotFromHistoryLog`, `cloneTeachingHistoryToNextClassDraft`) | `historySchema` strictly validates optional `programSnapshot` and `sequenceSnapshot` before store write (`invalid_data`), and all history snapshot consumers validate `isUsableProgramSnapshot` / `isUsableSequenceSnapshot` and fall back cleanly to `stepsSnapshot` / `exerciseIds` without throwing `TypeError`. |
| **D4** | `BND-REF-006` | `src/utils/backupRecoveryInspection.ts` (`hasDuplicateStepIds`, `hasInvalidHistorySnapshotExerciseRefs`, `parseInput`, `inspectBackupRecovery`) | Rejects duplicate `stepId` within `sequence.steps`, `activeDraft.steps`, `historyLog.stepsSnapshot`, `historyLog.programSnapshot.items`, and `historyLog.sequenceSnapshot.steps` with `duplicate_id`; rejects dangling or mismatched `exerciseId` in `programSnapshot.items` / `sequenceSnapshot.steps` with `missing_exercise`. |
| **D5** | `BND-REF-007` | `src/utils/teachingHistorySnapshot.ts` (`isRecordWithNonEmptyId`, `isValidBackupPreRestoreDomainState`, `inspectPersistedRollbackPoint`) | `inspectPersistedRollbackPoint` requires an explicit integer `version` of `0` or `1` (rejecting missing `version: undefined` with `unsupported-version`), and `isValidBackupPreRestoreDomainState` verifies every element in `exercises`, `savedSequences`, `classGroups`, `historyLogs`, and `conditionTemplates` is a plain object with a non-empty string `id` (`invalid-shape`). |
| **D6** | `BND-LIM-004` | `src/schemas/cloudBackupSchema.ts` (`historySchema`) + `src/utils/backupRecoveryInspection.ts` (`MAX_BACKUP_JSON_DEPTH`, `assertSafeJsonInputTree`) | Enforces `.max(1000)` on `historySchema.exerciseIds` and `historySchema.stepsSnapshot`, enforces `textSchema` (`<= 20,000` chars) across domain fields, and rejects JSON nesting depth `> MAX_BACKUP_JSON_DEPTH` (`64`) with `invalid_data`. |
