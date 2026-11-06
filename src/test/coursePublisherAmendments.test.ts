import { describe, expect, it } from 'vitest';
import source from '../data/courseCollectionSource.json';
import amendments from '../data/coursePublisherAmendments.json';
import {
  applyCoursePublisherAmendments,
  filterCourseReferences,
  hasCompleteCourseMetadata,
  INITIAL_COURSE_FILTERS,
  readCourseReferences,
} from '../utils/courseReferences';

const records = readCourseReferences(source);
const original = records.find((entry) => entry.videoId === 'D3TC-tz3TeQ')!;
const clone = <T>(value: T): T => structuredClone(value);
describe('bounded official publisher identity amendment', () => {
  it('enriches one exact missing publisher and preserves every other fact and raw source', () => {
    const before = JSON.stringify(source);
    const enriched = applyCoursePublisherAmendments(records, amendments);
    expect(
      filterCourseReferences(records, INITIAL_COURSE_FILTERS),
    ).toHaveLength(26);
    expect(
      filterCourseReferences(enriched, INITIAL_COURSE_FILTERS),
    ).toHaveLength(27);
    const updated = enriched.find((entry) => entry.id === original.id)!;
    expect(updated.publisher).toBe('Jessica Valant');
    expect(updated.publisherAmendment?.relation).toBe(
      'official-publisher-exact-video-link',
    );
    expect(updated.researchDisposition).toBe(original.researchDisposition);
    expect(hasCompleteCourseMetadata(updated)).toBe(true);
    expect(
      enriched.every(
        (entry) =>
          entry.professionalReview === 0 &&
          !entry.autoRecommend &&
          !entry.availability.fullPlaybackVerified &&
          entry.spokenLanguage === null &&
          entry.duration.officialMetadataSeconds === null &&
          entry.movementBounds === null,
      ),
    ).toBe(true);
    for (const key of Object.keys(original) as (keyof typeof original)[])
      if (key !== 'publisher') expect(updated[key]).toEqual(original[key]);
    for (const entry of records)
      if (entry.id !== original.id)
        expect(enriched.find((x) => x.id === entry.id)).toBe(entry);
    expect(JSON.stringify(source)).toBe(before);
    expect(original.publisher).toBeNull();
  });
  it('rejects stale title, changed identity and already populated publisher without overwrite', () => {
    for (const patch of [
      { title: 'Changed title' },
      { videoId: 'other000000' },
      { publisher: 'Personal override' },
      { publisherEvidence: { basis: 'Newly recorded evidence' } },
      { canonicalUrl: 'https://www.youtube.com/watch?v=other000000' },
    ]) {
      const altered = [{ ...original, ...patch }];
      expect(applyCoursePublisherAmendments(altered, amendments)[0]).toBe(
        altered[0],
      );
    }
    const first = applyCoursePublisherAmendments(records, amendments);
    const second = applyCoursePublisherAmendments(first, amendments);
    expect(second).toEqual(first);
  });
  it('rejects unrecognized authority fields, approval attempts, unsafe links and malformed hashes', () => {
    for (const change of [
      (v: typeof amendments) =>
        Object.assign(v.amendments[0], { professionalReview: 1 }),
      (v: typeof amendments) =>
        Object.assign(v.amendments[0], { autoRecommend: true }),
      (v: typeof amendments) => {
        v.amendments[0].evidence.sourceUrl = 'javascript:alert(1)';
      },
      (v: typeof amendments) => {
        v.amendments[0].evidence.factualRecordSha256 = 'not-a-hash';
      },
      (v: typeof amendments) => {
        v.amendments[0].expected.videoId = 'other000000';
      },
    ]) {
      const bad = clone(amendments);
      change(bad);
      expect(applyCoursePublisherAmendments(records, bad)).toEqual(records);
    }
  });
  it('rejects duplicate amendments atomically and leaves incomplete titles undiscoverable by default', () => {
    const duplicate = clone(amendments);
    duplicate.amendments.push({
      ...duplicate.amendments[0],
      id: 'duplicate-target',
    });
    expect(applyCoursePublisherAmendments(records, duplicate)).toBe(records);
    expect(
      hasCompleteCourseMetadata({
        ...original,
        publisher: 'Known publisher',
        titleCompleteness: 'partial-as-observed',
      }),
    ).toBe(false);
  });
});
