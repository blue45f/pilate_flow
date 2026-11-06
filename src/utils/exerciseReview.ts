import type { PilatesExercise } from '../types/pilates';

export type ExerciseReviewState = 'pending' | 'approved' | 'stale';

const NON_MATERIAL_FIELDS = new Set([
  'review',
  'favoriteTag',
  'lastUsedAt',
  'lastUsedCount',
  'lastTaughtAt',
  'taughtCount',
  'usageCount',
]);

/** Canonicalize JSON-persisted material content with stable recursive key ordering. */
function stableSerialize(value: unknown, ancestors = new Set<object>()): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return Object.is(value, -0) ? 'number:-0' : `number:${String(value)}`;
    case 'undefined':
      return 'undefined';
    case 'bigint':
      return `bigint:${value.toString()}`;
    case 'object': {
      if (ancestors.has(value)) throw new TypeError('Exercise records must not contain cycles.');
      ancestors.add(value);
      const serializeFields = (keys: string[]) =>
        keys
          .sort()
          .map(
            (key) =>
              `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key], ancestors)}`,
          )
          .join(',');
      let result: string;
      if (Array.isArray(value)) {
        const values = Array.from({ length: value.length }, (_, index) =>
          Object.hasOwn(value, index) ? stableSerialize(value[index], ancestors) : 'empty',
        );
        const extraKeys = Object.keys(value).filter((key) => {
          const index = Number(key);
          return (
            !Number.isInteger(index) || index < 0 || index >= value.length || String(index) !== key
          );
        });
        result = `array:[${values.join(',')}]{${serializeFields(extraKeys)}}`;
      } else {
        result = `object:{${serializeFields(Object.keys(value))}}`;
      }
      ancestors.delete(value);
      return result;
    }
    default:
      throw new TypeError('Exercise records must contain serializable data only.');
  }
}

/**
 * A deterministic checksum of persisted content, not authentication or proof of
 * credentials. JSON normalization matches storage/backup semantics: undefined object
 * fields are omitted and missing/undefined array entries become null. Arrays keep
 * their order; object keys do not. Review metadata, favorite preferences and usage
 * bookkeeping do not change planning approval. Source-reference snapshots remain
 * material content: changing their origin or evidence requires another review.
 * Non-serializable content fails closed.
 */
export function exerciseRevision(exercise: PilatesExercise): string {
  const record = Object.fromEntries(
    Object.keys(exercise)
      .filter((key) => !NON_MATERIAL_FIELDS.has(key))
      .map((key) => [key, (exercise as unknown as Record<string, unknown>)[key]]),
  );
  const persistedRecord: unknown = JSON.parse(JSON.stringify(record));
  const bytes = new TextEncoder().encode(stableSerialize(persistedRecord));
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  const prime = 0x0000000001000000000000000000013bn;
  const mask = (1n << 128n) - 1n;
  for (const byte of bytes) hash = ((hash ^ BigInt(byte)) * prime) & mask;
  return `planning-v3-json-fnv1a128-${hash.toString(16).padStart(32, '0')}`;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2}))?$/,
  );
  if (!match || !Number.isFinite(new Date(value).getTime())) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1];
}

export function getExerciseReviewState(exercise: PilatesExercise): ExerciseReviewState {
  const review: unknown = (exercise as unknown as { review?: unknown }).review;
  if (!review || typeof review !== 'object' || Array.isArray(review)) return 'pending';
  const record = review as Record<string, unknown>;
  if (
    record.status !== 'approved' ||
    record.scope !== 'planning-metadata' ||
    record.credentialVerified !== false ||
    typeof record.reviewerAlias !== 'string' ||
    record.reviewerAlias.trim().length === 0 ||
    record.reviewerAlias.trim().length > 80 ||
    !isIsoDate(record.reviewedAt) ||
    typeof record.revision !== 'string' ||
    record.revision.length === 0
  ) {
    return 'pending';
  }
  try {
    return record.revision === exerciseRevision(exercise) ? 'approved' : 'stale';
  } catch {
    return 'pending';
  }
}

export function isExerciseAutoEligible(exercise: PilatesExercise): boolean {
  return getExerciseReviewState(exercise) === 'approved';
}
