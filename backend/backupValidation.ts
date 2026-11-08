import { z } from 'zod';
import { cloudBackupDataSchema } from '../src/schemas/cloudBackupSchema';

// Match the current native-v3 recovery consumer; this is not a review/approval gate.
const exportedAtSchema = z
  .string()
  .datetime()
  .refine((value) => {
    const date = new Date(value);
    return (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
      Number.isFinite(date.getTime()) &&
      value.slice(0, 19) === date.toISOString().slice(0, 19)
    );
  });
const envelopeSchema = z
  .object({
    format: z.literal('pilates-flow-atelier'),
    version: z.literal(3),
    exportedAt: exportedAtSchema,
    data: z.record(z.unknown()),
  })
  .strict();

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_BACKUP_JSON_DEPTH = 64;
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function assertSafeJsonInputTree(root: unknown, maxDepth = MAX_BACKUP_JSON_DEPTH): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  while (stack.length > 0) {
    const { value, depth } = stack.pop()!;
    if (value === null || typeof value !== 'object') continue;
    if (depth > maxDepth) throw new Error('Backup JSON nesting depth exceeded');
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        stack.push({ value: value[i], depth: depth + 1 });
      }
      continue;
    }
    const ownNames = Object.getOwnPropertyNames(value);
    for (let i = 0; i < ownNames.length; i += 1) {
      const key = ownNames[i]!;
      if (DANGEROUS_OBJECT_KEYS.has(key)) throw new Error('Dangerous prototype key in backup JSON');
      stack.push({ value: (value as Record<string, unknown>)[key], depth: depth + 1 });
    }
  }
}

function hasDuplicateStepIds(steps: ReadonlyArray<{ stepId: string }> | undefined): boolean {
  if (!steps || steps.length <= 1) return false;
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.stepId)) return true;
    seen.add(step.stepId);
  }
  return false;
}

function hasInvalidHistorySnapshotExerciseRefs(
  log: z.infer<typeof cloudBackupDataSchema>['historyLogs'][number],
  known: Set<string>,
): boolean {
  const snapshotExerciseIds = new Set<string>();
  if (log.programSnapshot) {
    const { exercisesById, items } = log.programSnapshot;
    for (const [key, exSnap] of Object.entries(exercisesById)) {
      if (DANGEROUS_OBJECT_KEYS.has(key) || exSnap.id !== key) return true;
      snapshotExerciseIds.add(key);
    }
    for (const item of items) {
      if (item.kind === 'rest') {
        if (item.exerciseId !== '') return true;
        continue;
      }
      if (!item.exerciseId || DANGEROUS_OBJECT_KEYS.has(item.exerciseId)) return true;
      if (item.exerciseSnapshot !== undefined && item.exerciseSnapshot.id !== item.exerciseId)
        return true;
      if (item.movementSnapshot !== undefined && item.movementSnapshot.id !== item.exerciseId)
        return true;
      const inExercisesById =
        own(exercisesById, item.exerciseId) &&
        exercisesById[item.exerciseId]?.id === item.exerciseId;
      const inItemSnapshot =
        item.exerciseSnapshot?.id === item.exerciseId ||
        item.movementSnapshot?.id === item.exerciseId;
      if (inItemSnapshot) snapshotExerciseIds.add(item.exerciseId);
      if (!known.has(item.exerciseId) && !inExercisesById && !inItemSnapshot) return true;
    }
  }
  const sequenceSnapshots = [log.sequenceSnapshot, log.programSnapshot?.sequenceSnapshot];
  for (const seqSnap of sequenceSnapshots) {
    if (!seqSnap) continue;
    for (const [key, moveSnap] of Object.entries(seqSnap.exerciseSnapshots)) {
      if (DANGEROUS_OBJECT_KEYS.has(key) || moveSnap.id !== key) return true;
      snapshotExerciseIds.add(key);
    }
    for (const step of seqSnap.steps) {
      if (step.kind === 'rest') continue;
      if (!step.exerciseId || DANGEROUS_OBJECT_KEYS.has(step.exerciseId)) return true;
      if (step.exerciseSnapshot !== undefined && step.exerciseSnapshot.id !== step.exerciseId)
        return true;
      const inSnapMap =
        own(seqSnap.exerciseSnapshots, step.exerciseId) &&
        seqSnap.exerciseSnapshots[step.exerciseId]?.id === step.exerciseId;
      const inStepSnap = step.exerciseSnapshot?.id === step.exerciseId;
      if (inStepSnap) snapshotExerciseIds.add(step.exerciseId);
      if (!known.has(step.exerciseId) && !inSnapMap && !inStepSnap) return true;
    }
  }
  if (log.stepsSnapshot) {
    for (const step of log.stepsSnapshot) {
      if (step.kind === 'rest') continue;
      if (!step.exerciseId || DANGEROUS_OBJECT_KEYS.has(step.exerciseId)) return true;
      if (step.exerciseSnapshot !== undefined && step.exerciseSnapshot.id !== step.exerciseId)
        return true;
      if (step.exerciseSnapshot?.id === step.exerciseId) snapshotExerciseIds.add(step.exerciseId);
    }
    if (
      log.stepsSnapshot.some(
        (step) =>
          step.kind !== 'rest' &&
          !known.has(step.exerciseId) &&
          !snapshotExerciseIds.has(step.exerciseId),
      )
    )
      return true;
  }
  if (
    log.exerciseIds.some(
      (id) => DANGEROUS_OBJECT_KEYS.has(id) || (!known.has(id) && !snapshotExerciseIds.has(id)),
    )
  )
    return true;
  return false;
}

export function hasInvalidBackupExerciseReferences(
  data: z.infer<typeof cloudBackupDataSchema>,
): boolean {
  const known = new Set(data.exercises.map((exercise) => exercise.id));
  const sequences = [...data.savedSequences, ...(data.activeDraft ? [data.activeDraft] : [])];
  if (
    sequences.some((sequence) =>
      sequence.steps.some(
        (step) =>
          step.kind !== 'rest' &&
          (DANGEROUS_OBJECT_KEYS.has(step.exerciseId) ||
            (step.exerciseSnapshot !== undefined && step.exerciseSnapshot.id !== step.exerciseId) ||
            (!known.has(step.exerciseId) && step.exerciseSnapshot?.id !== step.exerciseId)),
      ),
    )
  )
    return true;
  if (data.historyLogs.some((log) => hasInvalidHistorySnapshotExerciseRefs(log, known)))
    return true;
  return false;
}

/** Check discarded keys only. Intentional passthrough fields and missing optionals stay valid. */
function discardsFields(raw: unknown, parsed: unknown): boolean {
  if (Array.isArray(raw) && Array.isArray(parsed))
    return raw.some((item, index) => discardsFields(item, parsed[index]));
  if (!isObject(raw) || !isObject(parsed)) return false;
  return Object.keys(raw).some(
    (key) =>
      !Object.prototype.hasOwnProperty.call(parsed, key) || discardsFields(raw[key], parsed[key]),
  );
}

/** Pure native-v3 shape validation before a server snapshot can replace the previous one. */
export function parseRecoverableNativeBackup(raw: string): z.infer<typeof cloudBackupDataSchema> {
  const parsedJson: unknown = JSON.parse(raw);
  assertSafeJsonInputTree(parsedJson);
  const envelope = envelopeSchema.parse(parsedJson);
  const data = cloudBackupDataSchema.parse(envelope.data);
  if (discardsFields(envelope.data, data)) throw new Error('Unsupported backup fields');
  for (const records of [
    data.exercises,
    data.savedSequences,
    data.classGroups,
    data.historyLogs,
    data.conditionTemplates ?? [],
  ]) {
    if (new Set(records.map((record) => record.id)).size !== records.length)
      throw new Error('Duplicate backup record');
  }
  if (data.activeDraft && data.savedSequences.some((record) => record.id === data.activeDraft!.id))
    throw new Error('Saved sequence and active draft ID collision');
  if (
    data.savedSequences.some((sequence) => hasDuplicateStepIds(sequence.steps)) ||
    hasDuplicateStepIds(data.activeDraft?.steps) ||
    data.historyLogs.some(
      (log) =>
        hasDuplicateStepIds(log.stepsSnapshot) ||
        hasDuplicateStepIds(log.programSnapshot?.items) ||
        hasDuplicateStepIds(log.sequenceSnapshot?.steps) ||
        hasDuplicateStepIds(log.programSnapshot?.sequenceSnapshot?.steps),
    )
  ) {
    throw new Error('Duplicate stepId in backup');
  }
  if (hasInvalidBackupExerciseReferences(data)) throw new Error('Missing exercise');
  return data;
}
