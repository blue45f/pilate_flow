# Deterministic Backup & Teaching History Input Boundary Corpus & Runner

This suite provides a **deterministic synthetic fixture corpus**, a **Vitest boundary regression suite**, and a **bounded CLI runner** that directly import and test the real backup/history inspection, legacy conversion, normalization, restore, and rollback functions without modifying any product runtime files.

- **Synthetic Corpus**: `src/test/fixtures/backup-recovery/backupInputBoundaryCorpus.json`
- **Vitest Suite**: `src/test/backupInputBoundaries.test.ts`
- **Bounded CLI Runner**: `scripts/backup-input-boundaries.mjs`
- **Corpus Seed**: `pilates-backup-boundary-seed-20261106-v1`
- **Total Boundary Cases**: `27` (`20` `PASS_ENFORCED_GUARD`, `6` `REPRODUCED_DEFECT`, `1` `PASS_NEGATIVE_CONTROL`, `0` `ENV_LIMIT`)

---

## 1. Finite Resource & Safety Upper Bounds

All generated payloads and executions are strictly bounded to prevent OOM or unbounded fuzzing:

| Bound | Limit | Purpose |
| :--- | :--- | :--- |
| `maxPayloadBytes` | `15,000,000` bytes (15 MB) | Product `MAX_LOCAL_BACKUP_BYTES` UTF-8 ceiling |
| `maxOversizeTestBytes` | `15,000,128` bytes | Finite upper bound for `too_large` rejection test (`BND-LIM-001`) |
| `maxGeneratedStringBytes` | `262,144` bytes (256 KB) | Finite ceiling for long-string boundary tests (`BND-LIM-002`, `BND-LIM-004`) |
| `maxGeneratedArrayLength` | `2,000` items | Finite ceiling for large-array boundary tests (`BND-LIM-003`, `BND-LIM-004`) |
| `maxGeneratedNestingDepth` | `128` levels | Finite ceiling for deep JSON nesting tests (`BND-LIM-004`) |
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

# 2. Run the bounded CLI runner (includes automatic negative-control subprocess verification)
node scripts/backup-input-boundaries.mjs

# 3. Verify that unpatched runtime defects fail when strict defect mode is enabled
node scripts/backup-input-boundaries.mjs --fail-on-reproduced-defects --no-verify-negative-control

# 4. Verify that an injected boundary invariant failure exits non-zero (exit code 1)
node scripts/backup-input-boundaries.mjs --inject-negative-control
```

---

## 3. Reproduced Runtime Boundary Defects (`D1`–`D6`)

In accordance with the read-only product runtime constraint, newly uncovered runtime boundary gaps are **not** disguised as passing guards; they are explicitly classified as `REPRODUCED_DEFECT` in `backupInputBoundaryCorpus.json` and `scripts/backup-input-boundaries.mjs`:

| Defect ID | Case ID | Target Module / Function | Reproduced Runtime Behavior |
| :--- | :--- | :--- | :--- |
| **D1** | `BND-REF-004` | `src/schemas/cloudBackupSchema.ts` (`stepSchema`, `exerciseSchema`, `sequenceSchema`, `groupSchema`, `historySchema`) + `src/utils/backupRecoveryInspection.ts` (`strippedKeys`) | `.passthrough()` retains arbitrary unknown fields on `checked`, so `strippedKeys(data, checked)` returns `0` instead of rejecting with `unsupported_fields` or stripping unknown nested keys. |
| **D2** | `BND-PROTO-002` | `src/utils/backupRecoveryInspection.ts` (`exportEnvelope`), `src/utils/movementIdeaDraft.ts` (`getMovementIdeaMetaMap`, `getScopedHumanDraftMap`), `src/utils/teachingHistorySnapshot.ts` (`stripUndefinedDeep`, `resolveTeachingHistoryView`), `src/utils/humanMovementCreation.ts` (`stripUndefined`) | 1) `exportEnvelope`'s `data: z.record(z.unknown())` assigns `result['__proto__'] = ...`, mutating `envelope.data.data`'s prototype and erasing `'__proto__'` from `Object.keys(data)` before `strippedKeys` runs (`success: true`).<br>2) `merged[id] = entry` in `getMovementIdeaMetaMap` mutates `Object.getPrototypeOf(merged)` when `id === '__proto__'`.<br>3) `snapshot.exercisesById[item.exerciseId]` in `resolveTeachingHistoryView` lacks `Object.prototype.hasOwnProperty.call`, resolving `exerciseId: 'constructor'` to `Object` and throwing `TypeError`. |
| **D3** | `BND-REF-005` | `src/schemas/cloudBackupSchema.ts` (`historySchema`) + `src/utils/teachingHistorySnapshot.ts` (`resolveTeachingHistoryView`, `collectMissingSnapshotExercises`) | `historySchema` does not validate `programSnapshot` or `sequenceSnapshot`. A `historyLog` with `programSnapshot: { snapshotVersion: 1, items: null, exercisesById: null }` passes `inspectBackupRecovery` (`success: true`) and then throws `TypeError` when `resolveTeachingHistoryView` or `collectMissingSnapshotExercises` accesses `snapshot.items.length` / `Object.entries(snapshot.exercisesById)`. |
| **D4** | `BND-REF-006` | `src/utils/backupRecoveryInspection.ts` (`parseInput`) | Top-level duplicate record IDs are rejected, but duplicate `step.stepId` inside `sequence.steps` / `historyLog.stepsSnapshot` and dangling `exerciseId` inside `historyLog.programSnapshot.items` are accepted without validation. |
| **D5** | `BND-REF-007` | `src/utils/teachingHistorySnapshot.ts` (`isValidBackupPreRestoreDomainState`, `inspectPersistedRollbackPoint`) | `isValidBackupPreRestoreDomainState` only checks `Array.isArray(...)` without checking element object shapes (`exercises: [null, 'corrupted']` passes as `valid: true`), and `inspectPersistedRollbackPoint` coerces omitted `version: undefined` to `version: 1`. |
| **D6** | `BND-LIM-004` | `src/schemas/cloudBackupSchema.ts` (`historySchema`) + `src/utils/backupRecoveryInspection.ts` (`parseInput`) | Unlike `sequenceSchema.steps` (`.max(1000)`), `historySchema.stepsSnapshot` and `historySchema.exerciseIds` have no `.max(1000)` cap, and `.passthrough()` allows unbounded 256KB strings and depth-128 nested objects inside domain records. |

---

## 4. Minimal Unapplied Runtime Patch Proposal (For Integration Owner)

 Product runtime files were kept 100% read-only in this branch (`0` runtime lines modified). Once active UI/store integration completes, applying the following minimal patch resolves `D1`–`D6` so `node scripts/backup-input-boundaries.mjs --fail-on-reproduced-defects` passes:

```diff
--- a/src/utils/backupRecoveryInspection.ts
+++ b/src/utils/backupRecoveryInspection.ts
@@ -135,6 +135,8 @@
 const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
 const isObject = (value: unknown): value is Record<string, unknown> =>
   !!value && typeof value === 'object' && !Array.isArray(value);
+const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
+const MAX_JSON_NESTING_DEPTH = 64;
 
+function assertSafeJsonTree(value: unknown, depth = 0): void {
+  if (depth > MAX_JSON_NESTING_DEPTH) {
+    throw new InspectionError('invalid_data', '백업 JSON 중첩 깊이가 허용 상한을 초과했습니다.');
+  }
+  if (Array.isArray(value)) {
+    for (const item of value) assertSafeJsonTree(item, depth + 1);
+    return;
+  }
+  if (isObject(value)) {
+    for (const key of Object.keys(value)) {
+      if (DANGEROUS_OBJECT_KEYS.has(key)) {
+        throw new InspectionError('unsupported_fields', '보안상 허용되지 않는 예약 키가 포함되어 있습니다.', 1);
+      }
+      assertSafeJsonTree(value[key], depth + 1);
+    }
+  }
+}
+
@@ -329,6 +349,7 @@
   const input: unknown = JSON.parse(raw);
   if (!isObject(input))
     throw new InspectionError('invalid_format', '알려진 전체 JSON 백업 형식을 확인해 주세요.');
+  assertSafeJsonTree(input);
@@ -422,6 +443,19 @@
         '같은 유형 안에 중복된 자료 ID가 있어 안전하게 병합할 수 없습니다. 어떤 항목도 적용하지 않았습니다.',
       );
+  for (const seq of [...checked.savedSequences, ...(checked.activeDraft ? [checked.activeDraft] : [])]) {
+    if (new Set(seq.steps.map((s) => s.stepId)).size !== seq.steps.length) {
+      throw new InspectionError('duplicate_id', '시퀀스 단계(stepId)에 중복된 ID가 있습니다.');
+    }
+  }
+  for (const log of checked.historyLogs) {
+    if (log.stepsSnapshot && new Set(log.stepsSnapshot.map((s) => s.stepId)).size !== log.stepsSnapshot.length) {
+      throw new InspectionError('duplicate_id', '수업 기록 단계(stepId)에 중복된 ID가 있습니다.');
+    }
+  }
```

```diff
--- a/src/schemas/cloudBackupSchema.ts
+++ b/src/schemas/cloudBackupSchema.ts
@@ -306,11 +306,11 @@
-    exerciseIds: z.array(idSchema),
+    exerciseIds: z.array(idSchema).max(1000),
     rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
     intensity: z.enum(['relaxed', 'moderate', 'intense']),
     instructorReflection: textSchema,
     actualDurationSec: z.number().finite().nonnegative().optional(),
     actualRestDurationSec: z.number().finite().nonnegative().optional(),
-    stepsSnapshot: z.array(stepSchema).optional(),
+    stepsSnapshot: z.array(stepSchema).max(1000).optional(),
```

```diff
--- a/src/utils/teachingHistorySnapshot.ts
+++ b/src/utils/teachingHistorySnapshot.ts
@@ -96,7 +96,8 @@
   if (value && typeof value === 'object') {
     const result: Record<string, unknown> = {};
     for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
-      if (entry !== undefined) {
+      if (entry !== undefined && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
         result[key] = stripUndefinedDeep(entry);
       }
     }
     return result as T;
@@ -728,7 +729,11 @@
   const log = rawLog as ClassHistoryLogWithSnapshot;
-  const snapshot = log.programSnapshot;
+  const snapshot =
+    log.programSnapshot &&
+    Array.isArray(log.programSnapshot.items) &&
+    log.programSnapshot.exercisesById &&
+    typeof log.programSnapshot.exercisesById === 'object'
+      ? log.programSnapshot
+      : undefined;
@@ -827,7 +832,11 @@
       const exSnap =
         item.exerciseSnapshot ??
-        snapshot.exercisesById[item.exerciseId] ??
+        (Object.prototype.hasOwnProperty.call(snapshot.exercisesById, item.exerciseId)
+          ? snapshot.exercisesById[item.exerciseId]
+          : undefined) ??
         (p1MoveSnap ? movementSnapshotToTeachingExerciseSnapshot(p1MoveSnap) : undefined);
@@ -1868,12 +1877,14 @@
+  const isRecordArray = (arr: unknown): arr is Record<string, unknown>[] =>
+    Array.isArray(arr) && arr.every((item) => Boolean(item && typeof item === 'object' && !Array.isArray(item)));
   return (
-    Array.isArray(candidate.exercises) &&
-    Array.isArray(candidate.savedSequences) &&
-    Array.isArray(candidate.classGroups) &&
-    Array.isArray(candidate.historyLogs) &&
-    Array.isArray(candidate.conditionTemplates) &&
+    isRecordArray(candidate.exercises) &&
+    isRecordArray(candidate.savedSequences) &&
+    isRecordArray(candidate.classGroups) &&
+    isRecordArray(candidate.historyLogs) &&
+    isRecordArray(candidate.conditionTemplates) &&
```

```diff
--- a/src/utils/movementIdeaDraft.ts
+++ b/src/utils/movementIdeaDraft.ts
@@ -189,7 +189,7 @@
     for (const draft of stored.humanMovementDrafts) {
-      if (draft && typeof draft.id === 'string') {
+      if (draft && typeof draft.id === 'string' && draft.id !== '__proto__' && draft.id !== 'constructor' && draft.id !== 'prototype') {
         if (isNewerVersionedEntry(draft, Object.prototype.hasOwnProperty.call(merged, draft.id) ? merged[draft.id] : undefined)) {
           merged[draft.id] = draft;
         }
@@ -277,7 +277,8 @@
   for (const [id, entry] of Object.entries(stored)) {
-    if (entry && isNewerVersionedEntry(entry, merged[id])) {
+    if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;
+    if (entry && isNewerVersionedEntry(entry, Object.prototype.hasOwnProperty.call(merged, id) ? merged[id] : undefined)) {
       merged[id] = entry;
     }
   }
```
