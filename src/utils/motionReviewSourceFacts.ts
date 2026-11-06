import mainLedger from '../data/motionDraftSourceLedger.json';
import apparatusLedger from '../data/motionApparatusSourceLedger.json';
import quadrupedLedger from '../data/motionQuadrupedSourceLedger.json';
import tensionLedger from '../data/motionTensionSourceLedger.json';
import standingLedger from '../data/motionStandingSourceLedger.json';
import selectedV5 from '../data/motionSelectedV5SourceLedger.json';
import selectedV6 from '../data/motionSelectedV6SourceLedger.json';
import type { MotionDraftDefinition, MotionDraftSource } from '../data/motionDrafts';

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;
function strings(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(strings);
  const record = object(value);
  return record ? Object.values(record).flatMap(strings) : [];
}
export function reviewHttpUrl(value: unknown): string | null {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
    )
  )
    return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
      ? value
      : null;
  } catch {
    return null;
  }
}
export interface MotionReviewSourceFact {
  sourceId: string | null;
  label: string;
  url: string | null;
  context: string | null;
  binding: 'linked-factual-record' | 'unbound-reference';
  sourceChecked: boolean | null;
  checkedAtUtc: string | null;
  factualRecordSha256: string | null;
  hashScope: string | null;
  facts: readonly string[];
  unknown: readonly string[];
  population: string | null;
  rights: {
    use: 'reference-only';
    mediaIncluded: false;
    reuseLicense: 'not-established';
    recordedNotice: string | null;
  };
}
interface SourceGroup {
  ledger: RecordValue;
  records: RecordValue[];
  hashScope: string | null;
}
function group(value: unknown): SourceGroup {
  const ledger = object(value) ?? {};
  const rows = ledger.sources ?? ledger.source_facts ?? ledger.source_factual_records;
  const specification = object(ledger.hash_specification);
  return {
    ledger,
    records: Array.isArray(rows)
      ? rows.flatMap((row) => {
          const parsed = object(row);
          return parsed ? [parsed] : [];
        })
      : [],
    hashScope:
      text(ledger.hashMethod) ?? text(ledger.hash_method) ?? text(specification?.individual_scope),
  };
}
// A fresh V6 record may preserve the V5 fact hash while retaining newer checked/attribution metadata.
const groups = [
  selectedV6,
  selectedV5,
  mainLedger,
  apparatusLedger,
  quadrupedLedger,
  tensionLedger,
  standingLedger,
].map(group);

function resolve(reference: MotionDraftSource): MotionReviewSourceFact {
  const sourceId = text(reference.sourceId);
  const declaredHash = text(reference.factualRecordSha256);
  const url = reviewHttpUrl(reference.url);
  let linked: { record: RecordValue; group: SourceGroup } | null = null;
  if (sourceId && declaredHash && url) {
    for (const collection of groups) {
      const record = collection.records.find(
        (candidate) =>
          (candidate.sourceId ?? candidate.source_id ?? candidate.id) === sourceId &&
          (candidate.factualRecordSha256 ?? candidate.factual_record_sha256) === declaredHash &&
          candidate.url === url,
      );
      if (record) {
        linked = { record, group: collection };
        break;
      }
    }
  }
  const record = linked?.record;
  const access = object(record?.access);
  const checked =
    typeof record?.sourceChecked === 'boolean'
      ? record.sourceChecked
      : typeof access?.body_read === 'boolean'
        ? access.body_read
        : null;
  const factRecords = record?.factualRecord ?? record?.source_checked_facts;
  const facts = Array.isArray(factRecords)
    ? factRecords.flatMap((fact) => {
        const value = object(fact);
        return strings(value?.fact ?? value?.summary ?? fact);
      })
    : strings(factRecords);
  return {
    sourceId,
    label: reference.label,
    url,
    context: text(reference.context),
    binding: linked ? 'linked-factual-record' : 'unbound-reference',
    sourceChecked: linked ? checked : null,
    checkedAtUtc: record
      ? (text(record.checkedAtUtc) ??
        text(record.checked_at_utc) ??
        text(record.accessDateUtc) ??
        text(record.accessDate) ??
        null)
      : null,
    factualRecordSha256: linked ? declaredHash : null,
    hashScope: linked?.group.hashScope ?? null,
    facts,
    unknown: strings(
      record?.unknown ??
        record?.notEstablished ??
        record?.not_established ??
        record?.unknownOrNotEstablished,
    ),
    population: record
      ? strings(
          record.populationContext ??
            record.intendedPopulationContext ??
            record.population_context ??
            record.sourceContext ??
            record.context ??
            record.applicability,
        ).join(' · ') || null
      : null,
    rights: {
      use: 'reference-only',
      mediaIncluded: false,
      reuseLicense: 'not-established',
      recordedNotice: strings(record?.rights).join(' · ') || null,
    },
  };
}

/** Exact source ID + factual hash + URL binding only. Dates and URL shape never grant a check. */
export function getMotionReviewSourceFacts(
  draft: MotionDraftDefinition,
): readonly MotionReviewSourceFact[] {
  return draft.sources.map(resolve);
}
