import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getRelatedYouTubeVideosForExercise } from '../data/exerciseYouTubeCatalog';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  getCrawledRelatedVideosForExercise,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
} from '../data/globalCrawledRepertoirePack';
import { getMatchedPublicSourcesForExercise } from './movementMediaMatcher';
import { scoreVideoSemanticMatch } from './videoSemanticMatching';

const exercise = (id: string) => INITIAL_EXERCISES.find((entry) => entry.id === id)!;

describe('shared movement-video semantic filtering', () => {
  it('blocks the audited false positives in both discovery pools and the reference matcher', () => {
    const cases = [
      ['original-chair-incline-support', /pull.?up|pike|going.?up/i],
      ['original-chair-seated-back-reach', /swan|going.?up/i],
      ['original-chair-seated-spine-twist', /twisting.?swan/i],
      ['original-mat-band-row', /roll.?up|ring|써클링/i],
      ['original-mat-chest-lift', /roll.?up|hundred|헌드레드/i],
      ['original-mat-side-leg-lift', /clam/i],
      ['original-mat-single-leg-stretch', /single.?leg.?extension|heel.?slide/i],
    ] as const;
    for (const [id, forbiddenTitle] of cases) {
      const target = exercise(id);
      expect(target).toBeDefined();
      const videos = [
        ...getRelatedYouTubeVideosForExercise(target, 6),
        ...getCrawledRelatedVideosForExercise(target, 6),
      ];
      for (const video of videos) expect(video.title).not.toMatch(forbiddenTitle);
      for (const match of getMatchedPublicSourcesForExercise(target).filter(
        (entry) => entry.source.provider === 'youtube',
      )) {
        expect(match.source.originalTitle).not.toMatch(forbiddenTitle);
      }
    }
  });

  it('requires public title evidence and filters apparatus, posture, prop and direction contradictions', () => {
    const bandRow = exercise('original-mat-band-row');
    expect(
      scoreVideoSemanticMatch(bandRow, { title: 'Seated Band Row', apparatus: ['mat'] }),
    ).toBeGreaterThan(0);
    expect(scoreVideoSemanticMatch(bandRow, { title: 'Seated Ring Row', apparatus: ['mat'] })).toBe(
      0,
    );
    expect(
      scoreVideoSemanticMatch(bandRow, { title: 'Seated Band Row', apparatus: ['chair'] }),
    ).toBe(0);
    expect(
      scoreVideoSemanticMatch(bandRow, { title: 'Standing Band Row', apparatus: ['mat'] }),
    ).toBe(0);
    expect(scoreVideoSemanticMatch(bandRow, { title: 'Band Roll Up', apparatus: ['mat'] })).toBe(0);
    expect(
      scoreVideoSemanticMatch(bandRow, { title: 'Seated Loop Band Row', apparatus: ['mat'] }),
    ).toBe(0);
    const side = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find(
      (entry) => entry.id === 'crawled-chair-going-up-side',
    )!;
    expect(
      scoreVideoSemanticMatch(side, {
        title: 'Going Up Side on the Wunda Chair',
        apparatus: ['chair'],
      }),
    ).toBeGreaterThan(0);
    expect(
      scoreVideoSemanticMatch(side, {
        title: 'Going Down the Mountain Side on the Wunda Chair',
        apparatus: ['chair'],
      }),
    ).toBe(0);
  });

  it('never fills a shared class block or an invalid limit with unrelated videos', () => {
    const target = {
      ...exercise('original-mat-band-row'),
      id: 'unknown-zxyq',
      nameKo: 'zxyq',
      nameEn: 'zxyq',
    };
    expect(getCrawledRelatedVideosForExercise(target, 6)).toEqual([]);
    expect(getRelatedYouTubeVideosForExercise(target, 6)).toEqual([]);
    for (const limit of [0, -2, NaN, Infinity]) {
      expect(getCrawledRelatedVideosForExercise(exercise('original-mat-mermaid'), limit)).toEqual(
        [],
      );
    }
  });

  it('recognizes named components of a catalog flow without treating keyword-only Frog links as demonstrations', () => {
    const strapFlow = exercise('ex-straps-01');
    const shortSpine = CRAWLED_YOUTUBE_DISCOVERY_POOL.find(
      (video) => video.videoId === 'ZcV9nTAVBcg',
    )!;
    expect(scoreVideoSemanticMatch(strapFlow, shortSpine)).toBeGreaterThan(0);
    expect(
      getCrawledRelatedVideosForExercise(strapFlow, 6).map((video) => video.videoId),
    ).toContain('ZcV9nTAVBcg');
    // This same source has a manual “frog” keyword, but its actual title names Short Spine.
    expect(scoreVideoSemanticMatch(exercise('original-reformer-strap-frog'), shortSpine)).toBe(0);
    expect(getCrawledRelatedVideosForExercise(exercise('original-reformer-strap-frog'))).toEqual(
      [],
    );
    expect(
      getCrawledRelatedVideosForExercise(exercise('ex-plank-01')).map((video) => video.videoId),
    ).toContain('Q326QGZfleM');
  });

  it('separates apparatus attachment names and explicit advanced variants from the requested movement', () => {
    const rollBack = exercise('original-cadillac-seated-roll-back');
    for (const title of [
      'Bicep Curls with Roll Back Bar on the Cadillac',
      'Side Arm with Roll Back Bar on the Cadillac',
      'Rolling Stomach Massage with Roll Back Bar on the Cadillac',
    ])
      expect(scoreVideoSemanticMatch(rollBack, { title, apparatus: ['cadillac'] })).toBe(0);
    expect(
      scoreVideoSemanticMatch(rollBack, {
        title: 'Roll Back with Arm Springs on the Cadillac',
        apparatus: ['cadillac'],
      }),
    ).toBeGreaterThan(0);
    for (const [id, title, apparatus] of [
      ['original-reformer-strap-frog', 'High Frogs on the Reformer', 'reformer'],
      ['original-barrel-supported-swan', 'Swan Dive + Grasshopper Pilates Ladder Barrel', 'barrel'],
      [
        'original-barrel-supported-side-bend',
        'Side Sit Ups Advanced on the Ladder Barrel',
        'barrel',
      ],
    ] as const)
      expect(scoreVideoSemanticMatch(exercise(id), { title, apparatus: [apparatus] })).toBe(0);
    expect(
      getCrawledRelatedVideosForExercise(exercise('original-barrel-supported-side-bend')).map(
        (video) => video.videoId,
      ),
    ).toContain('_QjVo_gNvAw');
  });

  it('does not generate empty-ID players or carry the removed Single Leg Kick mislink into discovery', () => {
    expect(
      CRAWLED_YOUTUBE_DISCOVERY_POOL.every((video) => /^[A-Za-z0-9_-]{11}$/.test(video.videoId)),
    ).toBe(true);
    expect(CRAWLED_YOUTUBE_DISCOVERY_POOL.some((video) => video.videoId === 'ZbtEw_pcPp4')).toBe(
      false,
    );
    const kick = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find(
      (entry) => entry.id === 'crawled-mat-single-leg-kick',
    )!;
    expect(kick.youtube.videoId).toBe('');
    expect(kick.youtube.url).toBe('');
    expect(getCrawledRelatedVideosForExercise(kick)).toEqual([]);
    const matches = getMatchedPublicSourcesForExercise(kick);
    expect(matches.some((match) => match.source.url.endsWith('/mat-single-leg-kick/'))).toBe(true);
    expect(
      matches
        .filter((match) => match.source.url.includes('/mat-single-leg-kick/'))
        .every((match) => !match.embedResolution.allowed && match.source.youtubeVideoId === null),
    ).toBe(true);
  });
});
