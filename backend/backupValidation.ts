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
  const envelope = envelopeSchema.parse(JSON.parse(raw));
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
  return data;
}
