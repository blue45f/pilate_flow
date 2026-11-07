import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import {
  detectForbiddenPaidVoiceOrDownloadUrl,
  isPermittedEmbedUrl,
  validateSafeExternalReferenceUrl,
} from '../schemas/movementMediaGuidanceSchema';
import type { PilatesExercise } from '../types/pilates';
import {
  getMatchedPublicSourcesForExercise,
  resolveEmbedFailureFallback,
  resolveMovementMediaBundle,
} from './movementMediaMatcher';

describe('movementMediaMatcher', () => {
  it('resolves valid MovementMediaBundles for all INITIAL_EXERCISES (both original-* and ex-*) without mutating catalogs', () => {
    const initialSnapshot = JSON.stringify(INITIAL_EXERCISES);
    const verifiedSnapshot = JSON.stringify(VERIFIED_REFERENCES);

    const originalExercises = INITIAL_EXERCISES.filter((ex) => ex.id.startsWith('original-'));
    const curatedExercises = INITIAL_EXERCISES.filter((ex) => ex.id.startsWith('ex-'));
    expect(originalExercises.length).toBeGreaterThanOrEqual(60);
    expect(curatedExercises.length).toBeGreaterThanOrEqual(30);
    expect(originalExercises.length + curatedExercises.length).toBe(INITIAL_EXERCISES.length);

    for (const exercise of INITIAL_EXERCISES) {
      const bundle = resolveMovementMediaBundle(exercise);
      expect(bundle.exerciseId).toBe(exercise.id);
      expect(bundle.exerciseNameKo).toBe(exercise.nameKo);
      expect(bundle.exerciseNameEn).toBe(exercise.nameEn);
      expect(bundle.matches.length).toBeGreaterThanOrEqual(2);
      expect(bundle.matches).toContain(bundle.primaryMatch);

      expect(bundle.compliance).toEqual({
        usesPaidVoiceApi: false,
        usesUnauthorizedVideoDownload: false,
        usesRedistributedMediaBinary: false,
        autoPlaysOnEntryOrSwitch: false,
        externalOriginalLinkAlwaysPresent: true,
      });

      const hasEmbeddableCandidate = bundle.matches.some(
        (m) =>
          m.source.embedPolicy === 'youtube-nocookie-allowed' &&
          m.embedResolution.allowed === true &&
          isPermittedEmbedUrl(m.embedResolution.embedUrl),
      );
      const hasExternalOnlyOfficialCandidate = bundle.matches.some(
        (m) =>
          m.source.embedPolicy === 'external-link-only' &&
          m.embedResolution.allowed === false &&
          m.embedResolution.embedUrl === null,
      );

      expect(
        hasEmbeddableCandidate,
        `Expected ${exercise.id} to have an embeddable YouTube candidate`,
      ).toBe(true);
      expect(
        hasExternalOnlyOfficialCandidate,
        `Expected ${exercise.id} to have an external-link-only official/institution candidate`,
      ).toBe(true);

      const seenKeys = new Set<string>();
      for (const match of bundle.matches) {
        expect(match.exerciseId).toBe(exercise.id);
        expect(match.isExactDemonstration).toBe(false);
        expect(validateSafeExternalReferenceUrl(match.embedResolution.externalOriginalUrl)).toBe(
          match.embedResolution.externalOriginalUrl,
        );
        expect(
          detectForbiddenPaidVoiceOrDownloadUrl(match.embedResolution.externalOriginalUrl)
            .forbidden,
        ).toBe(false);

        if (match.embedResolution.allowed) {
          expect(match.source.provider).toBe('youtube');
          expect(match.source.embedPolicy).toBe('youtube-nocookie-allowed');
          expect(isPermittedEmbedUrl(match.embedResolution.embedUrl)).toBe(true);
          expect(match.embedResolution.embedUrl).toContain(
            'https://www.youtube-nocookie.com/embed/',
          );
          expect(match.embedResolution.embedUrl).toContain('autoplay=0');
          expect(match.embedResolution.embedUrl).toContain('rel=0');
          expect(match.embedResolution.embedUrl).not.toContain('autoplay=1');
        } else {
          expect(match.embedResolution.embedUrl).toBeNull();
        }

        const dedupKey = `${match.source.url.trim()}::${match.source.startSec ?? -1}`;
        expect(seenKeys.has(dedupKey)).toBe(false);
        seenKeys.add(dedupKey);
      }
    }

    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(initialSnapshot);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(verifiedSnapshot);
  });

  it('includes Tier 1 exact-source-snapshot first when exercise.sourceReference is present', () => {
    const baseExercise = INITIAL_EXERCISES[0];
    const withSnapshot: PilatesExercise = {
      ...baseExercise,
      id: 'custom-snapshot-chair-footwork',
      sourceReference: {
        referenceId: 'mv-01',
        url: 'https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair',
        title: '체어 풋워크',
        publisher: 'Merrithew 공식 웹사이트',
        region: 'global',
        verificationStatus: 'partial-playback-checked',
        verifiedAt: '2026-11-04',
        rights: 'link-only',
        rawLedgerFile: 'verified-source-catalog.json',
        rawItemId: 'mv-01',
      },
    };

    const bundle = resolveMovementMediaBundle(withSnapshot);
    expect(bundle.matches[0].matchTier).toBe('exact-source-snapshot');
    expect(bundle.primaryMatch.matchTier).toBe('exact-source-snapshot');
    expect(bundle.matches[0].source.embedPolicy).toBe('external-link-only');
    expect(bundle.matches[0].embedResolution.embedUrl).toBeNull();
    expect(bundle.matches[0].embedResolution.externalOriginalUrl).toBe(
      'https://www.merrithew.com/blog/post/2019-01-04/exercise-of-the-month-footwork-on-stability-chair',
    );
  });

  it('includes Tier 3 clinical-pattern-source matches for exercises with pattern references or candidate research', () => {
    const swanPrep = INITIAL_EXERCISES.find((ex) => ex.id === 'original-mat-swan-prep');
    expect(swanPrep).toBeDefined();

    const matches = getMatchedPublicSourcesForExercise(swanPrep!);
    const clinicalMatches = matches.filter((m) => m.matchTier === 'clinical-pattern-source');
    expect(clinicalMatches.length).toBeGreaterThanOrEqual(2);

    for (const match of clinicalMatches) {
      expect(match.source.embedPolicy).toBe('external-link-only');
      expect(match.embedResolution.allowed).toBe(false);
      expect(match.embedResolution.embedUrl).toBeNull();
      expect(match.embedResolution.externalOriginalUrl).toMatch(/^https?:\/\//);
    }
  });

  it('resolves structured embed failure fallbacks that always preserve externalOriginalUrl', () => {
    const curatedExercise = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-warmup-01')!;
    const bundle = resolveMovementMediaBundle(curatedExercise);

    const blockedFallback = resolveEmbedFailureFallback(bundle.primaryMatch, 'embed-blocked');
    expect(blockedFallback.state).toBe('embed-blocked');
    expect(blockedFallback.embedUrl).toBeNull();
    expect(blockedFallback.externalOriginalUrl).toBe(
      'https://www.youtube.com/watch?v=DJtd3AqZzH0',
    );
    expect(blockedFallback.noticeKo).toContain('외부 원본 보기');

    const failedFallback = resolveEmbedFailureFallback(bundle.primaryMatch, 'playback-failed');
    expect(failedFallback.state).toBe('playback-failed');
    expect(failedFallback.embedUrl).toBeNull();
    expect(failedFallback.externalOriginalUrl).toBe(
      'https://www.youtube.com/watch?v=DJtd3AqZzH0',
    );
    expect(failedFallback.noticeKo).toContain('오류');

    const verifiedFootwork = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
    const footworkBundle = resolveMovementMediaBundle(verifiedFootwork);
    const footworkFallback = resolveEmbedFailureFallback(
      footworkBundle.primaryMatch,
      'embed-blocked',
    );
    expect(footworkFallback.externalOriginalUrl).toBe(
      'https://www.youtube.com/watch?v=QDBzjlhKsco&t=0s',
    );
  });

  it('resolves at least 2 credible matches for custom instructor-authored movements with no YouTube URL', () => {
    const customExercise: PilatesExercise = {
      ...INITIAL_EXERCISES[0],
      id: 'ex-custom-own-123',
      nameKo: '강사 직접 작성 코어 헌드레드 변형',
      nameEn: 'Custom Instructor Core Hundred Variation',
      apparatus: 'mat',
      blockCategory: 'core',
      isCustom: true,
      youtube: {
        videoId: '',
        channelName: '내가 직접 작성한 동작',
        videoTitle: '',
        startSec: 0,
        url: '',
      },
    };

    const bundle = resolveMovementMediaBundle(customExercise);
    expect(bundle.matches.length).toBeGreaterThanOrEqual(2);
    expect(bundle.primaryMatch.embedResolution.allowed).toBe(true);
    expect(bundle.primaryMatch.embedResolution.embedUrl).toContain(
      'https://www.youtube-nocookie.com/embed/Bkgcbd1nabU',
    );
    expect(bundle.matches.some((m) => m.matchTier === 'public-education-portal')).toBe(true);
  });
});
