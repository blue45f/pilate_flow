import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import { MOTION_PATTERN_REFERENCES } from './motionPatternReferences';
import {
  getRelatedYouTubeVideosForExercise,
  getRelatedYouTubeVideosForMotion,
  VERIFIED_YOUTUBE_CATALOG_STATS,
  VERIFIED_YOUTUBE_VIDEO_POOL,
} from './exerciseYouTubeCatalog';
import { ExerciseYouTubeGallery } from '../components/ExerciseYouTubeGallery';

function expandGallery() {
  const opener = screen.queryByRole('button', { name: /참고 영상.*펼치기/ });
  if (opener) fireEvent.click(opener);
}

describe('oEmbed-verified domestic & global YouTube catalog and inline embedded player', () => {
  afterEach(() => {
    cleanup();
  });

  it('maintains 310 metadata-verified videos (76 domestic KR + 234 global)', () => {
    expect(VERIFIED_YOUTUBE_VIDEO_POOL.length).toBe(310);
    expect(VERIFIED_YOUTUBE_CATALOG_STATS.koreanVideos).toBe(76);
    expect(VERIFIED_YOUTUBE_CATALOG_STATS.globalVideos).toBe(234);
    for (const item of VERIFIED_YOUTUBE_VIDEO_POOL) {
      expect(item.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(['kr', 'global']).toContain(item.region);
      expect(item.apparatus.length).toBeGreaterThan(0);
    }
  });

  it('keeps all catalog exercise searches within their equipment and never pads regional quotas', () => {
    expect(INITIAL_EXERCISES).toHaveLength(158);
    for (const exercise of INITIAL_EXERCISES) {
      const related = getRelatedYouTubeVideosForExercise(exercise, 3);
      expect(related.length).toBeLessThanOrEqual(7);
      expect(new Set(related.map((v) => v.videoId)).size).toBe(related.length);
      for (const video of related) {
        expect(video.apparatus).toContain(exercise.apparatus);
        expect(video.thumbnailUrl).toBe(`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`);
        expect(video.embedUrl).toContain(`https://www.youtube-nocookie.com/embed/${video.videoId}`);
      }
    }
  });

  it('bounds motion searches and permits no match rather than inventing a mat fallback', () => {
    expect(MOTION_PATTERN_REFERENCES.length).toBeGreaterThanOrEqual(22);
    for (const ref of MOTION_PATTERN_REFERENCES) {
      const related = getRelatedYouTubeVideosForMotion(ref, 2);
      expect(related.length).toBeLessThanOrEqual(4);
      expect(new Set(related.map((v) => v.videoId)).size).toBe(related.length);
      for (const video of related) expect(video.matchReasonKo).toContain('동일 시범 미검수');
    }
  });

  it('renders thumbnails and opens an inline embedded YouTube iframe on click', () => {
    const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!;
    render(<ExerciseYouTubeGallery exercise={exercise} maxPerRegion={2} />);
    const gallery = screen.getByRole('region', {
      name: `${exercise.nameKo} 연관 국내·해외 YouTube 영상`,
    });
    expect(within(gallery).queryByTitle(/ - /)).not.toBeInTheDocument();

    expect(gallery.querySelector('img')).toBeNull();
    expandGallery();
    const playButtons = within(gallery).getAllByRole('button', { name: /인베드 영상 불러오기/ });
    expect(playButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(playButtons[0]);
    const playerRegion = within(gallery).getByRole('region', { name: /인베드 플레이어/ });
    expect(playerRegion).toHaveFocus();
    const iframe = playerRegion.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toContain('https://www.youtube-nocookie.com/embed/');
    expect(iframe?.getAttribute('src')).toContain('autoplay=0');
    expect(iframe?.getAttribute('allow')).not.toContain('autoplay');
    fireEvent.click(screen.getByRole('button', { name: '인베드 플레이어 닫기' }));
    expect(playButtons[0]).toHaveFocus();
  });

  it('requires a new explicit load after close, subject change, filtering, and remount', () => {
    const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!;
    const view = render(<ExerciseYouTubeGallery exercise={exercise} maxPerRegion={2} />);
    const load = () => {
      expandGallery();
      fireEvent.click(screen.getAllByRole('button', { name: /인베드 영상 불러오기/ })[0]);
    };
    expect(document.querySelector('iframe')).toBeNull();
    load();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '인베드 플레이어 닫기' }));
    expect(document.querySelector('iframe')).toBeNull();
    load();
    fireEvent.click(screen.getByRole('button', { name: /국내 \(KR\)/ }));
    expect(document.querySelector('iframe')).toBeNull();
    load();
    // The two subjects may share the same related video: subject identity still resets consent.
    view.rerender(
      <ExerciseYouTubeGallery
        exercise={{ ...exercise, id: 'test-different-subject' }}
        maxPerRegion={2}
      />,
    );
    expect(document.querySelector('iframe')).toBeNull();
    load();
    view.unmount();
    render(<ExerciseYouTubeGallery exercise={exercise} maxPerRegion={2} />);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('unloads the iframe on pagehide and never resumes it automatically', () => {
    render(
      <ExerciseYouTubeGallery
        exercise={INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!}
        maxPerRegion={2}
      />,
    );
    expandGallery();
    fireEvent.click(screen.getAllByRole('button', { name: /인베드 영상 불러오기/ })[0]);
    expect(document.querySelector('iframe')).not.toBeNull();
    fireEvent(window, new Event('pagehide'));
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent(window, new Event('pageshow'));
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('quarantines the audited fixed-seat/Pike and seated-reach/Swan mismatches', () => {
    for (const slug of ['incline-support', 'seated-back-reach']) {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === `original-chair-${slug}`)!;
      expect(exercise).toBeDefined();
      expect(getRelatedYouTubeVideosForExercise(exercise, 3)).toEqual([]);
    }
    const heel = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-heel-slide')!;
    const videos = getRelatedYouTubeVideosForExercise(heel, 3);
    expect(videos).toHaveLength(1);
    expect(videos[0].videoId).toBe('t17Z6HeiiQs');
    expect(videos[0].title).toMatch(/heel slides/i);
    expect(videos.some((video) => video.region === 'kr')).toBe(false);
  });

  it('does not treat shared posture as a movement-specific motion match', () => {
    const reference = MOTION_PATTERN_REFERENCES.find(
      (item) => item.variantId === 'supine-knee-fold',
    )!;
    expect(reference).toBeDefined();
    const related = getRelatedYouTubeVideosForMotion(reference, 6);
    expect(related.some((item) => item.videoId === '0oUg-GKSXTM')).toBe(false);
    for (const item of related) {
      const metadata = [item.title, ...item.keywords].join(' ').toLowerCase();
      expect(/knee-fold|니폴드|single-leg-stretch/.test(metadata)).toBe(true);
    }
  });

  it('shows an honest empty state with no iframe instead of unrelated videos', () => {
    const exercise = INITIAL_EXERCISES.find(
      (item) => item.id === 'original-chair-incline-support',
    )!;
    render(<ExerciseYouTubeGallery exercise={exercise} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      '다른 동작이나 다른 기구의 영상으로 빈자리를 채우지 않습니다',
    );
    expect(screen.queryByRole('button', { name: /인베드 영상/ })).not.toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('does not invent matches from equipment alone and bounds invalid requested limits', () => {
    const base = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!;
    const exercise = {
      ...base,
      id: 'unmatched-zzqvzx',
      nameKo: 'zzqvzx',
      nameEn: 'zzqvzx',
      youtube: { ...base.youtube, videoId: '', url: '' },
    };
    expect(getRelatedYouTubeVideosForExercise(exercise, 3)).toEqual([]);
    for (const limit of [-1, NaN, Infinity, 0]) {
      expect(
        getRelatedYouTubeVideosForExercise(
          { ...base, youtube: { ...base.youtube, videoId: '', url: '' } },
          limit,
        ),
      ).toEqual([]);
    }
  });

  it('keeps explicitly linked references separate and clearly unverified', () => {
    const exercise = INITIAL_EXERCISES.find(
      (item) => item.id === 'original-chair-incline-support',
    )!;
    const linked = {
      ...exercise,
      youtube: {
        ...exercise.youtube,
        videoId: 'abcdefghijk',
        videoTitle: 'User linked reference',
        startSec: 12,
      },
    };
    const videos = getRelatedYouTubeVideosForExercise(linked, 3);
    expect(videos).toHaveLength(1);
    expect(videos[0].matchReasonKo).toContain('직접 연결한 참조');
    expect(videos[0].matchReasonKo).toContain('미검수');
    expect(videos[0].startSec).toBe(12);
  });

  it('starts compact, unloads on collapse, and never resumes a player when reopened', () => {
    render(
      <ExerciseYouTubeGallery
        exercise={INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!}
        maxPerRegion={2}
      />,
    );
    expect(screen.getByRole('button', { name: /참고 영상.*펼치기/ })).toHaveAccessibleDescription(
      '연관 자료 · 동일 동작 시범은 미검수',
    );
    expect(document.querySelector('.eyg-section img')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expandGallery();
    fireEvent.click(screen.getAllByRole('button', { name: /인베드 영상 불러오기/ })[0]);
    expect(document.querySelector('iframe')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /참고 영상.*접기/ }));
    expect(document.querySelector('.eyg-section img')).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
    expandGallery();
    expect(document.querySelector('.eyg-section img')).not.toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('enforces Round 5 DEF-MEDIA-01 corrections: all original IDs preserved, linked ex-* videos match oEmbed pool title/channel/apparatus, and unverified items are explicitly marked 자료 미확인', () => {
    expect(INITIAL_EXERCISES).toHaveLength(158);
    const poolById = new Map(VERIFIED_YOUTUBE_VIDEO_POOL.map((v) => [v.videoId, v]));

    // None of the 9 unrelated non-Pilates/yoga/HIIT/meditation video IDs from DEF-MEDIA-01 may remain linked
    const forbiddenMislinkedIds = new Set([
      'lCg_gh_fppI',
      'UItWltVZZmE',
      'g_tea8ZNk5A',
      'v7AYKMP6rOE',
      '4pKly2JojMw',
      'inpok4MKVLM',
      '1f8yoFFdkcY',
      'bTo4NrSriWw',
      'sTANio_2E0Q',
    ]);

    const legacyExercises = INITIAL_EXERCISES.filter((ex) => ex.id.startsWith('ex-'));
    expect(legacyExercises).toHaveLength(38);

    const unverifiedLegacyIds: string[] = [];
    for (const ex of legacyExercises) {
      expect(forbiddenMislinkedIds.has(ex.youtube.videoId)).toBe(false);
      if (ex.youtube.videoId === '') {
        unverifiedLegacyIds.push(ex.id);
        expect(ex.youtube.url).toBe('');
        expect(ex.youtube.videoTitle).toBe('');
        expect(ex.youtube.channelName).toContain('자료 미확인');
        expect(ex.youtube.note).toContain('자료 미확인');
      } else {
        const verified = poolById.get(ex.youtube.videoId);
        expect(
          verified,
          `Expected ${ex.id} (${ex.youtube.videoId}) in verified oEmbed pool`,
        ).toBeDefined();
        expect(verified!.apparatus).toContain(ex.apparatus);
        expect(ex.youtube.videoTitle).toBe(verified!.title);
        expect(ex.youtube.channelName).toBe(verified!.authorName);
        expect(ex.youtube.url).toBe(`https://www.youtube.com/watch?v=${ex.youtube.videoId}`);
      }
    }

    expect(unverifiedLegacyIds).toEqual([
      'ex-warmup-01',
      'ex-footwork-02',
      'ex-cooldown-02',
      'ex-core-04',
      'ex-lower-04',
    ]);
  });
});
