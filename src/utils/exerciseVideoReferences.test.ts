import { describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { isStrictNoAutoplayEmbedUrl } from '../features/referenceLinkPolicyCandidate/urlPolicyEngine';
import type { PilatesExercise } from '../types/pilates';
import {
  exerciseVideoGalleryKey,
  getExerciseVideoCoverage,
  getExerciseVideoReferences,
} from './exerciseVideoReferences';

vi.mock('../data/exerciseYouTubeCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/exerciseYouTubeCatalog')>();
  return {
    ...actual,
    VERIFIED_YOUTUBE_VIDEO_POOL: [
      ...actual.VERIFIED_YOUTUBE_VIDEO_POOL,
      {
        videoId: 'posture0001',
        title: 'Prone Footwork',
        authorName: 'Posture regression fixture',
        region: 'global',
        apparatus: ['reformer'],
        blocks: ['footwork'],
        keywords: [],
        props: ['mini-ball'],
      },
      {
        videoId: 'propband001',
        title: 'Footwork with a Resistance Band',
        authorName: 'Prop regression fixture',
        region: 'global',
        apparatus: ['reformer'],
        blocks: ['footwork'],
        keywords: [],
      },
    ],
  };
});

const findExercise = (id: string) => INITIAL_EXERCISES.find((exercise) => exercise.id === id)!;
const noSource = (exercise: PilatesExercise): PilatesExercise => ({
  ...exercise,
  youtube: { ...exercise.youtube, videoId: '', url: '' },
});

describe('per-exercise video reference selection', () => {
  it('keeps and deduplicates the saved primary with its exact clip bounds and no autoplay', () => {
    const base = findExercise('original-mat-bridge');
    const exercise = { ...base, youtube: { ...base.youtube, startSec: 12, endSec: 36 } };
    const references = getExerciseVideoReferences(exercise);
    expect(references[0].videoId).toBe(base.youtube.videoId);
    expect(references[0].isPrimary).toBe(true);
    expect(references[0].clip).toEqual(exercise.youtube);
    expect(references[0].embedUrl).toContain('start=12');
    expect(references[0].embedUrl).toContain('end=36');
    expect(new Set(references.map((video) => video.videoId)).size).toBe(references.length);
    expect(references.every((video) => isStrictNoAutoplayEmbedUrl(video.embedUrl))).toBe(true);
    expect(
      references.every(
        (video) =>
          !video.segmentVerified &&
          !video.exactDemonstrationVerified &&
          !video.professionalReviewVerified,
      ),
    ).toBe(true);
  });

  it('allows a labeled prop-free base component but rejects wrong equipment, posture and additional props', () => {
    const exercise = findExercise('ex-footwork-01');
    expect(exercise.props).toContain('mini-ball');
    const references = getExerciseVideoReferences(exercise);
    expect(references.length).toBeGreaterThan(2);
    const baseFootwork = references.find((video) => video.videoId === 'MPL0zq_0yP8')!;
    expect(baseFootwork.relation).toBe('related-variant');
    expect(baseFootwork.matchReasonKo).toContain('기본 동작 참고 · 소도구/세팅 다름');
    expect(baseFootwork.matchReasonKo).toContain('풋워크');
    expect(references.every((video) => video.apparatus.includes('reformer'))).toBe(true);
    for (const rejected of ['4f33Abh-seU', 'posture0001', 'propband001']) {
      expect(references.some((video) => video.videoId === rejected)).toBe(false);
    }
    const matSeries = getExerciseVideoReferences(findExercise('ex-core-03'));
    expect(matSeries.find((video) => video.videoId === 'SbAzXngP480')?.relation).toBe(
      'related-variant',
    );
    expect(matSeries.some((video) => video.videoId === 'n-nd72k1k58')).toBe(false);
    expect(matSeries.some((video) => /high scissors/i.test(video.title))).toBe(false);
  });

  it('keeps component references distinct from demonstrations of an entire flow', () => {
    const references = getExerciseVideoReferences(findExercise('ex-plank-01'));
    expect(references.length).toBeGreaterThan(2);
    const elephant = references.find((video) => video.videoId === '6onkc1noAi8')!;
    expect(elephant.relation).toBe('flow-component');
    expect(elephant.matchReasonKo).toContain('전체 흐름');
  });

  it('connects new creator sources while distinguishing variants, components and different movement tasks', () => {
    const bridge = getExerciseVideoReferences(findExercise('original-mat-bridge'));
    expect(bridge.length).toBeGreaterThanOrEqual(3);
    expect(bridge.find((video) => video.videoId === 'D4JE3LB_zTM')?.relation).toBe('named-movement');
    expect(bridge.find((video) => video.videoId === 'QFv_Fex3Mko')).toMatchObject({
      relation: 'related-variant', matchReasonKo: expect.stringContaining('한 다리'),
    });
    const chest = getExerciseVideoReferences(findExercise('original-mat-chest-lift'));
    expect(chest.find((video) => video.videoId === 'ELPUVY8mH6E')?.relation).toBe('named-movement');
    for (const id of ['JjSQy9U2eqA', '1SnsqJYN2lw']) {
      expect(chest.find((video) => video.videoId === id)?.relation).toBe('related-variant');
    }
    expect(getExerciseVideoReferences(findExercise('original-mat-open-book')).some((video) => video.videoId === 'YggCTIawob0')).toBe(true);
    expect(getExerciseVideoReferences(findExercise('original-mat-knee-fold')).some((video) => video.videoId === 'eMp-Cxvaj7g')).toBe(false);
    expect(getExerciseVideoReferences(findExercise('ex-plank-01')).find((video) => video.videoId === 'V3_HSYh2Rvo')?.relation).toBe('flow-component');
  });

  it('does not recommend kneeling Mermaid as seated Mermaid on the same apparatus', () => {
    const custom: PilatesExercise = {
      ...findExercise('original-mat-bridge'),
      id: 'custom-mermaid-reference', nameKo: '머메이드 참조', nameEn: 'Mermaid',
      apparatus: 'reformer', requiredEquipment: ['reformer'], props: ['none'],
      bodyPosition: 'seated', isCustom: true,
      youtube: { videoId: 'abcdefghijk', url: 'https://www.youtube.com/watch?v=abcdefghijk', videoTitle: 'My saved reference', channelName: 'Saved source', startSec: 0 },
    };
    expect(getExerciseVideoReferences(custom).some((video) => video.videoId === 'vtp6S3ELcck')).toBe(false);
    const kneeling = getExerciseVideoReferences({ ...custom, bodyPosition: 'kneeling' });
    expect(kneeling.find((video) => video.videoId === 'vtp6S3ELcck')?.relation).toBe('related-variant');
  });

  it('does not invent references for custom exercises without a source or unsupported source-only movements', () => {
    const base = findExercise('original-mat-bridge');
    expect(
      getExerciseVideoReferences(noSource({ ...base, id: 'custom-bridge', isCustom: true })),
    ).toEqual([]);
    expect(getExerciseVideoReferences(findExercise('original-chair-incline-support'))).toEqual([]);
    expect(getExerciseVideoReferences(findExercise('original-chair-seated-back-reach'))).toEqual(
      [],
    );
  });

  it('invalidates old-name aliases for edited IDs and honestly labels unrelated saved links', () => {
    const base = findExercise('original-mat-heel-slide');
    const edited = { ...base, nameEn: 'Unknown New Movement', nameKo: '새 사용자 동작' };
    const references = getExerciseVideoReferences(edited);
    expect(references).toHaveLength(1);
    expect(references[0].relation).toBe('saved-reference');
    expect(references[0].matchReasonKo).toContain('일치는 별도 확인');
    expect(getExerciseVideoReferences(noSource(edited))).toEqual([]);
  });

  it('does not trust an unsafe URL or a URL whose video ID differs from the saved ID', () => {
    const base = findExercise('original-chair-incline-support');
    for (const url of ['javascript:alert(1)', 'https://www.youtube.com/watch?v=lmnopqrstuv']) {
      expect(
        getExerciseVideoReferences({
          ...base,
          youtube: { ...base.youtube, videoId: 'abcdefghijk', url },
        }),
      ).toEqual([]);
    }
  });

  it('resets playback identity for name, posture, props, equipment and clip edits', () => {
    const base = findExercise('original-mat-bridge');
    for (const edit of [
      { nameEn: 'Renamed Bridge' },
      { bodyPosition: 'standing' as const },
      { props: ['magic-circle' as const] },
      { requiredEquipment: ['chair' as const] },
      { youtube: { ...base.youtube, startSec: 8 } },
    ])
      expect(exerciseVideoGalleryKey({ ...base, ...edit })).not.toBe(exerciseVideoGalleryKey(base));
    expect(exerciseVideoGalleryKey({ ...base })).toBe(exerciseVideoGalleryKey(base));
  });

  it('reports every exercise in 0/1/2+ coverage without duplicate references', () => {
    const exercises = [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
    const coverage = getExerciseVideoCoverage(exercises);
    expect(coverage.zero + coverage.one + coverage.multiple).toBe(exercises.length);
    expect(coverage.rows).toHaveLength(exercises.length);
    expect(coverage.multiple).toBeGreaterThan(35);
    for (const row of coverage.rows) {
      expect(row.relatedCount).toBeLessThanOrEqual(row.count);
      expect(new Set(row.videoIds).size).toBe(row.count);
    }
  });
});
