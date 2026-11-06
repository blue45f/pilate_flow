import { describe, expect, it } from 'vitest';
import source from '../data/courseCollectionSource.json';
import {
  filterCourseReferences,
  INITIAL_COURSE_FILTERS,
  readCourseReferences,
} from './courseReferences';

describe('whole-course discovery references', () => {
  const entries = readCourseReferences(source);
  it('preserves separate unique course identities and unverified status', () => {
    expect(entries).toHaveLength(32);
    expect(new Set(entries.map((item) => item.videoId)).size).toBe(32);
    expect(
      entries.every(
        (item) =>
          item.autoRecommend === false &&
          item.professionalReview === 0 &&
          item.movementBounds === null,
      ),
    ).toBe(true);
    expect(
      entries.every(
        (item) => item.spokenLanguage === null && item.duration.officialMetadataSeconds === null,
      ),
    ).toBe(true);
    expect(filterCourseReferences(entries, INITIAL_COURSE_FILTERS)).toHaveLength(26);
    expect(
      filterCourseReferences(entries, {
        ...INITIAL_COURSE_FILTERS,
        incomplete: true,
      }),
    ).toHaveLength(32);
  });
  it('rejects forged identities, unsafe URLs, invented playback and approval', () => {
    const first = source.entries[0];
    for (const patch of [
      { canonicalUrl: 'javascript:alert(1)' },
      { canonicalUrl: 'https://example.com/watch?v=' + first.videoId },
      { videoId: 'other000000' },
      { autoRecommend: true },
      { professionalReview: 1 },
      { spokenLanguage: 'ko' },
      { duration: { ...first.duration, officialMetadataSeconds: 3000 } },
      { availability: { ...first.availability, fullPlaybackVerified: true } },
    ])
      expect(readCourseReferences({ entries: [{ ...first, ...patch }] })).toHaveLength(0);
    expect(readCourseReferences({ entries: [first, first] })).toHaveLength(1);
  });
  it('combines multi-apparatus OR with other filters and keeps unknowns explicit', () => {
    const all = { ...INITIAL_COURSE_FILTERS, incomplete: true };
    const mat = filterCourseReferences(entries, {
      ...all,
      equipment: ['매트'],
    });
    const chair = filterCourseReferences(entries, {
      ...all,
      equipment: ['체어'],
    });
    const combined = filterCourseReferences(entries, {
      ...all,
      equipment: ['매트', '체어'],
    });
    expect(combined.length).toBe(new Set([...mat, ...chair].map((item) => item.id)).size);
    const koreanChair = filterCourseReferences(entries, {
      ...all,
      equipment: ['체어'],
      titleLanguage: 'ko',
      duration: '50-plus',
    });
    expect(koreanChair.length).toBeGreaterThan(0);
    expect(koreanChair.every((item) => item.titleLanguage.includes('ko'))).toBe(true);
    expect(filterCourseReferences(entries, { ...all, ownedOnly: true })).toHaveLength(0);
    expect(
      filterCourseReferences(entries, {
        ...all,
        search: 'no-such-title-000000',
      }),
    ).toHaveLength(0);
  });
  it('never infers a complete equipment set or a band subtype from a publisher typo', () => {
    const typo = filterCourseReferences(entries, {
      ...INITIAL_COURSE_FILTERS,
      search: 'Loof band',
    });
    expect(typo.length).toBeGreaterThan(0);
    expect(
      filterCourseReferences(typo, {
        ...INITIAL_COURSE_FILTERS,
        props: ['루프 밴드'],
      }),
    ).toHaveLength(0);
    expect(
      filterCourseReferences(entries, {
        ...INITIAL_COURSE_FILTERS,
        difficulty: 'unknown',
      }).every((item) => item.facts.difficulty === null),
    ).toBe(true);
  });
});
