import { matchesDiscoverySearch } from './discoverySearch';
import { z } from 'zod';

const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);
const nullableList = z.array(z.string().min(1).max(250)).max(30).nullable();
const httpsUrl = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === 'https:');
const publisherEvidenceSchema = z
  .object({
    sourceUrl: httpsUrl,
    sourceTitle: z.string().min(1).max(1500),
    publisherUrl: httpsUrl,
    checkedAt: z.string().datetime({ offset: true }),
    factualRecordSha256: z.string().regex(/^[a-f0-9]{64}$/),
    basis: z.string().min(1).max(2000),
    relation: z.literal('official-publisher-exact-video-link'),
  })
  .strict();
const entrySchema = z
  .object({
    id: z.string().min(1).max(100),
    canonicalUrl: z.string().url(),
    videoId: videoIdSchema,
    title: z.string().min(1).max(1500),
    titleCompleteness: z.enum(['complete-as-observed', 'partial-as-observed']),
    publisher: z.string().min(1).max(500).nullable(),
    publisherEvidence: z.unknown().optional(),
    publisherRegion: z.string().max(500).nullable(),
    publisherAmendment: publisherEvidenceSchema.optional(),
    titleLanguage: z.array(z.string().min(1).max(20)).min(1).max(10),
    spokenLanguage: z.null(),
    facts: z.object({
      apparatus: nullableList,
      props: nullableList,
      difficulty: z.string().max(250).nullable(),
      bodyTags: nullableList,
    }),
    duration: z.object({
      officialMetadataSeconds: z.null(),
      publisherTitleDeclaredMinutes: z.number().positive().finite().nullable(),
      publisherDescriptionDeclaredMinutes: z
        .number()
        .positive()
        .finite()
        .nullable(),
    }),
    availability: z.object({
      checkedAt: z.string().datetime({ offset: true }),
      currentWatchPageAccessibility: z.literal('not-established'),
      fullPlaybackVerified: z.literal(false),
      embeddingAvailability: z.literal('unknown'),
    }),
    rights: z.literal('link-only'),
    professionalReview: z.literal(0),
    autoRecommend: z.literal(false),
    movementReferencesExtracted: z.literal(0),
    movementBounds: z.null(),
    checkedAt: z.string().datetime({ offset: true }),
    limitations: z.array(z.string().max(2000)).max(30),
    researchDisposition: z.enum([
      'named-publisher-complete-title',
      'metadata-incomplete',
    ]),
  })
  .superRefine((entry, context) => {
    if (
      entry.canonicalUrl !== `https://www.youtube.com/watch?v=${entry.videoId}`
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['canonicalUrl'],
        message: 'Canonical video identity mismatch.',
      });
    }
    if (
      entry.researchDisposition === 'named-publisher-complete-title' &&
      (!entry.publisher || entry.titleCompleteness !== 'complete-as-observed')
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['researchDisposition'],
        message: 'Incomplete publisher/title metadata.',
      });
    }
  });

export type CourseReference = z.infer<typeof entrySchema>;
const publisherAmendmentSchema = z
  .object({
    id: z.string().min(1).max(100),
    expected: z
      .object({
        id: z.string().min(1).max(100),
        videoId: videoIdSchema,
        canonicalUrl: httpsUrl,
        title: z.string().min(1).max(1500),
        titleCompleteness: z.literal('complete-as-observed'),
        publisher: z.null(),
        publisherEvidence: z.null(),
        researchDisposition: z.literal('metadata-incomplete'),
      })
      .strict(),
    publisher: z.string().trim().min(1).max(500),
    evidence: publisherEvidenceSchema,
  })
  .strict();

/** Identity metadata enrichment only; source records, title, duration and review remain untouched. */
export function applyCoursePublisherAmendments(
  entries: readonly CourseReference[],
  source: unknown,
): readonly CourseReference[] {
  const parsed = z
    .object({
      schemaVersion: z.literal(1),
      purpose: z.literal('publisher-identity-metadata-only'),
      amendments: z.array(publisherAmendmentSchema).max(100),
    })
    .strict()
    .safeParse(source);
  if (!parsed.success) return entries;
  const amendments = parsed.data.amendments;
  if (
    new Set(amendments.map((a) => a.expected.id)).size !== amendments.length ||
    new Set(amendments.map((a) => a.id)).size !== amendments.length
  )
    return entries;
  return Object.freeze(
    entries.map((entry) => {
      const amendment = amendments.find((a) => a.expected.id === entry.id);
      if (!amendment || entry.publisherAmendment) return entry;
      const expected = amendment.expected;
      if (
        expected.canonicalUrl !==
          `https://www.youtube.com/watch?v=${expected.videoId}` ||
        !Object.entries(expected).every(
          ([key, value]) => entry[key as keyof typeof expected] === value,
        )
      )
        return entry;
      return Object.freeze({
        ...entry,
        publisher: amendment.publisher,
        publisherAmendment: Object.freeze({ ...amendment.evidence }),
      });
    }),
  );
}

/** Current recorded identity completeness; historical source disposition is preserved separately. */
export const hasCompleteCourseMetadata = (entry: CourseReference) =>
  entry.publisher !== null &&
  entry.titleCompleteness === 'complete-as-observed';

export interface CourseFilters {
  search: string;
  equipment: string[];
  props: string[];
  titleLanguage: string;
  difficulty: string;
  bodyTag: string;
  duration: 'all' | 'under-30' | '30-49' | '50-plus' | 'unknown';
  incomplete: boolean;
  ownedOnly: boolean;
}
export const INITIAL_COURSE_FILTERS: CourseFilters = {
  search: '',
  equipment: [],
  props: [],
  titleLanguage: 'all',
  difficulty: 'all',
  bodyTag: 'all',
  duration: 'all',
  incomplete: false,
  ownedOnly: false,
};

/** A catalog entry stays a whole-course link; no exercise/timestamp/eligibility is inferred. */
export function readCourseReferences(
  source: unknown,
): readonly CourseReference[] {
  const envelope = z
    .object({ entries: z.array(z.unknown()).max(500) })
    .safeParse(source);
  if (!envelope.success) return Object.freeze([]);
  const entries: CourseReference[] = [];
  const seenVideos = new Set<string>();
  const seenIds = new Set<string>();
  for (const item of envelope.data.entries) {
    const parsed = entrySchema.safeParse(item);
    if (
      !parsed.success ||
      seenVideos.has(parsed.data.videoId) ||
      seenIds.has(parsed.data.id)
    )
      continue;
    seenVideos.add(parsed.data.videoId);
    seenIds.add(parsed.data.id);
    entries.push(parsed.data);
  }
  return Object.freeze(entries);
}

const EQUIPMENT_LABELS: Record<string, string> = {
  mat: '매트',
  reformer: '리포머',
  chair: '체어',
  cadillac: '캐딜락',
  tower: '타워',
  'ladder barrel': '래더 바렐',
  'ladder-barrel': '래더 바렐',
  'barrel-unspecified': '바렐 · 종류 미확인',
  barrels: '바렐 · 종류 미확인',
  'pilates chair': '체어',
};
const PROP_LABELS: Record<string, string> = {
  'mini-ball': '미니볼',
  'mini ball': '미니볼',
  box: '박스',
  'small-ball-unspecified': '작은 볼 · 종류 미확인',
  'resistance band': '탄력 밴드 · 종류 미확인',
  weights: '웨이트 · 종류 미확인',
  'loof band (publisher spelling; band subtype unverified)':
    'Loof band · 게시자 표기, 종류 미확인',
};
const BODY_LABELS: Record<string, string> = {
  'full-body': '전신',
  'full body': '전신',
  'total body': '전신',
  core: '코어',
  'lower-body': '하체',
  spine: '척추',
};
export const courseEquipmentLabel = (value: string) =>
  EQUIPMENT_LABELS[value.toLowerCase()] ?? value;
export const coursePropLabel = (value: string) =>
  PROP_LABELS[value.toLowerCase()] ?? value;
export const courseBodyLabel = (value: string) =>
  BODY_LABELS[value.toLowerCase()] ?? value;
export const courseDifficultyLabel = (value: string) => {
  const labels: Record<string, string> = {
    beginner: '입문 · 게시자 표기',
    'for beginners': '입문자 대상 · 게시자 표기',
    'beginner to intermediate': '입문–중급 · 게시자 표기',
    intermediate: '중급 · 게시자 표기',
    'publisher-level-high': '높은 난도 · 게시자 표기',
  };
  return labels[value.toLowerCase()] ?? value;
};
export const declaredCourseMinutes = (entry: CourseReference): number | null =>
  entry.duration.publisherTitleDeclaredMinutes ??
  entry.duration.publisherDescriptionDeclaredMinutes;

export function filterCourseReferences(
  entries: readonly CourseReference[],
  filters: CourseFilters,
): CourseReference[] {
  return entries.filter((entry) => {
    if (!filters.incomplete && !hasCompleteCourseMetadata(entry)) return false;
    // Public metadata does not establish a complete set of required apparatus/props.
    if (filters.ownedOnly) return false;
    const equipment = (entry.facts.apparatus ?? []).map(courseEquipmentLabel);
    const props = (entry.facts.props ?? []).map(coursePropLabel);
    const bodyTags = (entry.facts.bodyTags ?? []).map(courseBodyLabel);
    if (
      filters.equipment.length &&
      !filters.equipment.some((item) => equipment.includes(item))
    )
      return false;
    if (
      filters.props.length &&
      !filters.props.some((item) => props.includes(item))
    )
      return false;
    if (
      filters.titleLanguage !== 'all' &&
      !entry.titleLanguage.includes(filters.titleLanguage)
    )
      return false;
    if (filters.difficulty === 'unknown' && entry.facts.difficulty !== null)
      return false;
    if (
      !['all', 'unknown'].includes(filters.difficulty) &&
      entry.facts.difficulty !== filters.difficulty
    )
      return false;
    if (filters.bodyTag === 'unknown' && bodyTags.length) return false;
    if (
      !['all', 'unknown'].includes(filters.bodyTag) &&
      !bodyTags.includes(filters.bodyTag)
    )
      return false;
    const minutes = declaredCourseMinutes(entry);
    if (filters.duration === 'unknown' && minutes !== null) return false;
    if (!['all', 'unknown'].includes(filters.duration)) {
      if (minutes === null) return false;
      if (filters.duration === 'under-30' && minutes >= 30) return false;
      if (filters.duration === '30-49' && (minutes < 30 || minutes >= 50))
        return false;
      if (filters.duration === '50-plus' && minutes < 50) return false;
    }
    const fields = [
      entry.title,
      entry.publisher ?? '',
      ...equipment,
      ...props,
      ...bodyTags,
      entry.facts.difficulty ?? '',
      ...(entry.facts.apparatus ?? []),
      ...(entry.facts.props ?? []),
    ];
    return matchesDiscoverySearch(fields, filters.search);
  });
}
