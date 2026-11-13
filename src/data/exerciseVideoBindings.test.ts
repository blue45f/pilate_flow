import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import {
  EXERCISE_VIDEO_BINDING_PLANS,
  getExerciseSourcePageReferences,
  getExerciseVideoEvidence,
} from './exerciseVideoBindings';
import { getMovementProvenance } from './movementProvenance';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from './globalCrawledRepertoirePack';
import { getMatchedPublicSourcesForExercise } from '../utils/movementMediaMatcher';

describe('existing candidate links and separated evidence states', () => {
  it('fills only 12 of the original 65 gaps without changing catalog size or claiming playback', () => {
    expect(INITIAL_EXERCISES).toHaveLength(158);
    const originals = INITIAL_EXERCISES.filter((exercise) => exercise.id.startsWith('original-'));
    const linked = originals.filter((exercise) => exercise.youtube.videoId);
    expect(linked).toHaveLength(12);
    const unlinked = INITIAL_EXERCISES.filter(
      (exercise) => !exercise.id.startsWith('expanded-') && !exercise.youtube.videoId,
    );
    expect(unlinked).toHaveLength(53);
    for (const exercise of linked) {
      const evidence = getExerciseVideoEvidence(exercise)!;
      expect(evidence).toMatchObject({
        playbackVerified: false,
        segmentVerified: false,
        exactDemonstrationVerified: false,
        professionalReviewVerified: false,
      });
      expect(evidence.title).toBe(exercise.youtube.videoTitle);
      expect(exercise.youtube.startSec).toBe(0);
      expect(exercise.youtube.endSec).toBeUndefined();
      expect(exercise.youtube.note).toContain('0초는 검증된 동작 시작점이 아닙니다');
      expect(getMovementProvenance(exercise).label).not.toContain('원본 영상 출처 없음');
      const source = getMatchedPublicSourcesForExercise(exercise).find(
        (match) => match.matchTier === 'curated-youtube-reference',
      )!;
      expect(source.isExactDemonstration).toBe(false);
      expect(source.source.verificationStatusLabelKo).toContain('구간 미검수');
      expect(source.source.publisherType).toBe('instructor-curated-reference');
    }
  });

  it('invalidates binding evidence after changes to identity, setup, title, link or segment', () => {
    const exercise = INITIAL_EXERCISES.find((entry) => entry.id === 'original-mat-heel-slide')!;
    expect(getExerciseVideoEvidence(exercise)).toBeDefined();
    for (const changed of [
      { ...exercise, nameEn: 'Knee Fold' },
      { ...exercise, apparatus: 'chair' as const },
      { ...exercise, bodyPosition: 'seated' as const },
      { ...exercise, props: ['magic-circle' as const] },
      { ...exercise, youtube: { ...exercise.youtube, videoId: 'abcdefghijk' } },
      {
        ...exercise,
        youtube: { ...exercise.youtube, url: 'https://www.youtube.com/watch?v=abcdefghijk' },
      },
      { ...exercise, youtube: { ...exercise.youtube, videoTitle: 'Changed title' } },
      { ...exercise, youtube: { ...exercise.youtube, startSec: 25 } },
    ])
      expect(getExerciseVideoEvidence(changed)).toBeUndefined();
  });

  it('uses the existing individual candidates for four omnibus links and the corrected Going Up Side', () => {
    const expected = {
      'crawled-mat-double-leg-stretch': 'SbAzXngP480',
      'crawled-mat-neck-pull': 'B6iIe9KjVTo',
      'crawled-mat-corkscrew': 'MZoj2FqYdDY',
      'crawled-barrel-fullbody-ladder-flow': '67sQoYOphpM',
      'crawled-chair-going-up-side': 's483YzcUJSQ',
    };
    expect(GLOBAL_CRAWLED_REPERTOIRE_EXERCISES).toHaveLength(60);
    for (const [id, videoId] of Object.entries(expected)) {
      const exercise = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((entry) => entry.id === id)!;
      expect(exercise.youtube.videoId).toBe(videoId);
      expect(getExerciseVideoEvidence(exercise)?.metadataStatus).toBe('creator-page-and-oembed');
      expect(getExerciseVideoEvidence(exercise)?.playbackVerified).toBe(false);
    }
    for (const plan of EXERCISE_VIDEO_BINDING_PLANS) {
      expect(
        [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES].some(
          (exercise) => exercise.id === plan.exerciseId && getExerciseVideoEvidence(exercise),
        ),
      ).toBe(true);
    }
  });

  it('preserves source-only text and transition evidence without inventing a video ID', () => {
    const kick = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find(
      (entry) => entry.id === 'crawled-mat-single-leg-kick',
    )!;
    const sources = getExerciseSourcePageReferences(kick);
    expect(sources).toHaveLength(2);
    expect(sources.map((source) => source.relation)).toEqual([
      'movement-description',
      'transition-reference',
    ]);
    expect(
      sources.every(
        (source) => source.sourceTextChecked && !source.playbackVerified && !source.segmentVerified,
      ),
    ).toBe(true);
    expect(kick.youtube.videoId).toBe('');
    expect(getMovementProvenance(kick).label).toContain('영상 연결 미확인');
  });
});
