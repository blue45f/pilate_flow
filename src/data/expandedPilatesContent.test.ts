import { describe, expect, it } from 'vitest';
import { EXPANDED_MOVEMENTS, EXPANDED_MOVEMENT_SEEDS } from './expandedMovements';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from './globalCrawledRepertoirePack';
import {
  getRelatedYouTubeVideosForExercise,
  VERIFIED_YOUTUBE_BY_ID,
  VERIFIED_YOUTUBE_VIDEO_POOL,
} from './exerciseYouTubeCatalog';
import additions from './expandedPilatesVideoCatalog.json';
import sources from './expandedPilatesVideoProvenance.json';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { parseYouTubeReference, PropSchema } from '../schemas/pilatesSchema';
import { resolveExtendedMotionSourceAudit } from './extendedMotionVerificationCatalog';
import { getVisualSourceComparison } from './movementVisualSourceAudit';
import { resolveMovementMediaBundle } from '../utils/movementMediaMatcher';

const movementIdentity = (apparatus: string, name: string) =>
  `${apparatus}:${name
    .toLowerCase()
    .replace(/\b(?:mat|reformer|cadillac|wunda|chair|ladder|barrel|on|the|classical)\b/g, '')
    .replace(/[^a-z0-9]/g, '')}`;

describe('source-linked Pilates content expansion', () => {
  it('does not inherit a historical movement audit, digest, frame approval, or creator credential', () => {
    for (const exercise of EXPANDED_MOVEMENTS) {
      const audit = resolveExtendedMotionSourceAudit(exercise);
      expect(audit.checkedAt).toBe('2026-11-13');
      expect(audit.verifiedReferenceAuditRecord).toBeNull();
      expect(audit.verifiedReferencePublicEntry).toBeNull();
      expect(audit.candidateMatMotionModel).toBeNull();
      expect(audit.primaryFactualRecordSha256).toBe('');
      expect(audit.sha256IntegrityVerified).toBe(false);
      const visual = getVisualSourceComparison(exercise);
      expect(visual.reviewStage).toBe('unreviewed-draft');
      expect(visual.professionalMotionReviewCount).toBe(0);
      expect(visual.extendedAuditSummary.auditCheckedAt).toBe('2026-11-13');
      expect(visual.matchedReliableSources).toHaveLength(2);
      expect(visual.matchedReliableSources[0].url).toContain('onlinepilatesclasses.com');
      const source = resolveMovementMediaBundle(exercise).matches.find(
        (match) => match.matchTier === 'curated-youtube-reference',
      );
      expect(source?.isExactDemonstration).toBe(false);
      expect(source?.source.publisherType).toBe('instructor-curated-reference');
      expect(source?.source.verifiedAt).toBe('2026-11-13');
    }
  });

  it('invalidates the metadata binding when a local exercise changes its source video', () => {
    const original = EXPANDED_MOVEMENTS[0];
    const changed = {
      ...original,
      youtube: {
        ...original.youtube,
        videoId: 'abcdefghijk',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
      },
    };
    const audit = resolveExtendedMotionSourceAudit(changed);
    expect(audit.checkedAt).toBe('');
    expect(audit.verifiedReferenceAuditRecord).toBeNull();
    expect(audit.primaryFactualRecordSha256).toBe('');
    expect(getVisualSourceComparison(changed).matchedReliableSources).toHaveLength(0);
  });
  it('adds sixty distinct addressable movements across all five apparatus families', () => {
    expect(EXPANDED_MOVEMENTS).toHaveLength(60);
    expect(new Set(INITIAL_EXERCISES.map((exercise) => exercise.id)).size).toBe(
      INITIAL_EXERCISES.length,
    );
    const existingIdentities = new Set(
      [
        ...INITIAL_EXERCISES.filter((exercise) => !exercise.id.startsWith('expanded-')),
        ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
      ].map((exercise) => movementIdentity(exercise.apparatus, exercise.nameEn)),
    );
    const newIdentities = new Set<string>();
    for (const exercise of EXPANDED_MOVEMENTS) {
      expect(INITIAL_EXERCISES.find((item) => item.id === exercise.id)).toEqual(exercise);
      const identity = movementIdentity(exercise.apparatus, exercise.nameEn);
      expect(existingIdentities.has(identity), exercise.id).toBe(false);
      expect(newIdentities.has(identity), exercise.id).toBe(false);
      newIdentities.add(identity);
      expect(isExerciseAutoEligible(exercise)).toBe(false);
      expect(exercise.cues).toHaveLength(3);
      expect(exercise.cues.every((cue) => cue.length > 15)).toBe(true);
      for (const prop of exercise.props) expect(PropSchema.safeParse(prop).success).toBe(true);
    }
    expect(new Set(EXPANDED_MOVEMENTS.map((exercise) => exercise.apparatus))).toEqual(
      new Set(['mat', 'reformer', 'cadillac', 'chair', 'barrel']),
    );
  });

  it('binds each new movement to its own checked creator page and exact public video metadata', () => {
    const bySlug = new Map(sources.map((source) => [source.sourceSlug, source]));
    for (const [index, exercise] of EXPANDED_MOVEMENTS.entries()) {
      const source = bySlug.get(EXPANDED_MOVEMENT_SEEDS[index].sourceSlug)!;
      expect(source).toBeDefined();
      expect(source.apparatus).toBe(exercise.apparatus);
      expect(exercise.youtube.videoId).toBe(source.videoId);
      expect(exercise.youtube.videoTitle).toBe(source.youtubeTitle);
      expect(exercise.youtube.channelName).toBe(source.youtubeAuthor);
      expect(parseYouTubeReference(exercise.youtube.url)?.videoId).toBe(source.videoId);
      expect(exercise.youtube.startSec).toBe(0);
      expect(exercise.youtube.note).toContain(source.sourceUrl);
      expect(exercise.youtube.note).toContain('미검수');
      const related = getRelatedYouTubeVideosForExercise(exercise, 1);
      expect(related[0].videoId).toBe(source.videoId);
      expect(related[0].apparatus).toContain(exercise.apparatus);
    }
  });

  it('keeps metadata checks separate from playback, professional review, and reuse permission', () => {
    expect(sources.length).toBeGreaterThanOrEqual(additions.length);
    for (const source of sources) {
      expect(source.sourceUrl).toMatch(/^https:\/\/onlinepilatesclasses\.com\/pilates-exercises\//);
      expect(source.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(source.verificationMethod).toBe('creator-page-and-oembed');
      expect(source.playbackVerified).toBe(false);
      expect(source.professionalReviewVerified).toBe(false);
      expect(source.rights).toBe('link-only');
      expect(source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new URL(source.oEmbedUrl).searchParams.get('url')).toBe(
        `https://www.youtube.com/watch?v=${source.videoId}`,
      );
      expect(VERIFIED_YOUTUBE_BY_ID.has(source.videoId)).toBe(true);
    }
    expect(new Set(VERIFIED_YOUTUBE_VIDEO_POOL.map((video) => video.videoId)).size).toBe(
      VERIFIED_YOUTUBE_VIDEO_POOL.length,
    );
    for (const video of additions) {
      expect(VERIFIED_YOUTUBE_BY_ID.get(video.videoId)).toEqual(video);
      expect(video.playbackVerified).toBe(false);
      expect(video.title).toContain('Online Pilates Classes');
    }
  });

  it('preserves audited equipment distinctions for standing Cadillac and weighted barrel tutorials', () => {
    for (const slug of ['biceps', 'shave', 'side-arm']) {
      expect(
        EXPANDED_MOVEMENTS.find((exercise) => exercise.id === `expanded-cadillac-roll-back-${slug}`)
          ?.bodyPosition,
      ).toBe('standing');
    }
    for (const slug of ['arm-circles', 'arm-hug', 'arm-up-down', 'horseback', 'horseback-jockey']) {
      const exercise = EXPANDED_MOVEMENTS.find((item) => item.id === `expanded-barrel-${slug}`)!;
      expect(exercise.requiredEquipment).toEqual(['ladder-barrel']);
      expect(exercise.props).toContain('dumbbell');
    }
    expect(
      EXPANDED_MOVEMENTS.filter((exercise) => exercise.id.startsWith('expanded-barrel-short-box')),
    ).toHaveLength(0);
  });
});
