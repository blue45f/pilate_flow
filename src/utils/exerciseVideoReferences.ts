import {
  VERIFIED_YOUTUBE_VIDEO_POOL,
  type CuratedYouTubeVideoItem,
  type RawVerifiedYouTubeItem,
} from '../data/exerciseYouTubeCatalog';
import { getExerciseVideoEvidence } from '../data/exerciseVideoBindings';
import { EXERCISE_VIDEO_COMPONENTS, VIDEO_REFERENCE_SCOPE } from '../data/exerciseVideoComponents';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
} from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { normalizeReferenceUrlPolicy } from '../features/referenceLinkPolicyCandidate/urlPolicyEngine';
import type { BodyPosition, PilatesExercise, PropType, YouTubeClipRef } from '../types/pilates';
import {
  getVideoReferenceScope,
  normalizeVideoSearchText,
  scoreVideoSemanticMatch,
  type VideoSemanticExercise,
} from './videoSemanticMatching';

export type ExerciseVideoRelation =
  'named-movement' | 'related-variant' | 'flow-component' | 'saved-reference';

export interface ExerciseVideoReference extends CuratedYouTubeVideoItem {
  readonly relation: ExerciseVideoRelation;
  readonly relationLabelKo: string;
  readonly isPrimary: boolean;
  readonly endSec?: number;
  readonly clip: YouTubeClipRef;
  readonly metadataStatus:
    'creator-page-and-oembed' | 'existing-catalog-metadata' | 'saved-reference';
  readonly exactDemonstrationVerified: false;
  readonly segmentVerified: false;
  readonly professionalReviewVerified: false;
}

interface Candidate extends RawVerifiedYouTubeItem {
  bodyPositions?: BodyPosition[];
  props?: PropType[];
}

const canonicalExercises = new Map(
  [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES].map((exercise) => [
    exercise.id,
    exercise,
  ]),
);
const pool: readonly Candidate[] = (() => {
  const byId = new Map<string, Candidate>();
  for (const video of CRAWLED_YOUTUBE_DISCOVERY_POOL) {
    byId.set(video.videoId, {
      videoId: video.videoId,
      title: video.title,
      authorName: video.channelName,
      region: video.region,
      apparatus: [...video.apparatus],
      blocks: [...video.blocks],
      keywords: [...video.keywords],
      bodyPositions: video.bodyPositions ? [...video.bodyPositions] : undefined,
      props: video.props ? [...video.props] : undefined,
      playbackVerified: false,
    });
  }
  // Creator metadata takes precedence over local seed labels for the same video.
  for (const video of VERIFIED_YOUTUBE_VIDEO_POOL) byId.set(video.videoId, video);
  return [...byId.values()];
})();
const byVideoId = new Map(pool.map((video) => [video.videoId, video]));
const labels: Record<ExerciseVideoRelation, string> = {
  'named-movement': '동작명 일치',
  'related-variant': '관련 변형',
  'flow-component': '구성 동작',
  'saved-reference': '저장한 참조',
};
const sameItems = (left: readonly string[], right: readonly string[]) =>
  [...new Set(left)].sort().join('|') === [...new Set(right)].sort().join('|');

function hasCurrentCatalogIdentity(exercise: PilatesExercise): boolean {
  const original = canonicalExercises.get(exercise.id);
  return Boolean(
    original &&
    original.nameEn === exercise.nameEn &&
    original.apparatus === exercise.apparatus &&
    original.bodyPosition === exercise.bodyPosition &&
    sameItems(original.props, exercise.props) &&
    sameItems(
      original.requiredEquipment ?? [original.apparatus],
      exercise.requiredEquipment ?? [exercise.apparatus],
    ),
  );
}

function hasSpecificApparatusConflict(exercise: PilatesExercise, candidate: Candidate): boolean {
  const required = exercise.requiredEquipment ?? [];
  return (
    (required.includes('ladder-barrel') &&
      /spine[\s-]*corrector|스파인\s*코렉터/i.test(candidate.title)) ||
    (required.includes('spine-corrector') &&
      /ladder[\s-]*barrel|래더\s*바렐/i.test(candidate.title))
  );
}

function scoreNamedReference(query: VideoSemanticExercise, video: Candidate) {
  // An unmodified Scissors component does not establish the High Scissors setup.
  if (/\bhigh[\s-]*scissors\b/i.test(video.title) && !/\bhigh[\s-]*scissors\b/i.test(query.nameEn))
    return null;
  const score = scoreVideoSemanticMatch(query, video);
  if (score > 0) return { score, baseVariation: false };
  if (!query.props?.some((prop) => prop !== 'none')) return null;
  // Only relax a missing requested prop. Apparatus, posture, task and extra-prop
  // gates still apply; a matching base demonstration is labeled as a variant.
  const baseScore = scoreVideoSemanticMatch({ ...query, props: [] }, video);
  return baseScore > 0 ? { score: baseScore - 5, baseVariation: true } : null;
}

function relationFor(exercise: PilatesExercise, video: Candidate, currentIdentity: boolean) {
  if (hasSpecificApparatusConflict(exercise, video)) return null;
  // A changed exercise cannot inherit the audited alias of its old ID.
  const query = currentIdentity ? exercise : { ...exercise, id: 'custom-video-query' };
  const components = currentIdentity ? EXERCISE_VIDEO_COMPONENTS[exercise.id] : undefined;
  for (const component of components ?? []) {
    const componentQuery = {
      ...query,
      id: 'named-flow-component',
      nameEn: component.nameEn,
      nameKo: component.labelKo,
    };
    const match = scoreNamedReference(componentQuery, video);
    if (match)
      return {
        relation: match.baseVariation ? ('related-variant' as const) : ('flow-component' as const),
        score: match.score,
        reason: match.baseVariation
          ? `기본 동작 참고 · 소도구/세팅 다름 · 복합 흐름 중 ${component.labelKo} 참고`
          : `복합 흐름 중 ${component.labelKo} 참고 · 전체 흐름과 구간은 미확인`,
      };
  }
  const ordinaryMatch = scoreNamedReference(query, video);
  const match =
    ordinaryMatch ??
    (currentIdentity && exercise.id === 'original-mat-open-book'
      ? scoreNamedReference(
          { ...query, id: 'book-opening-reference', nameEn: 'Book Opening' },
          video,
        )
      : null);
  if (!match) return null;
  const { score, baseVariation } = match;
  if (baseVariation)
    return {
      relation: 'related-variant' as const,
      score,
      reason: '기본 동작 참고 · 소도구/세팅 다름 · 실제 시범과 구간은 미확인',
    };
  if (currentIdentity && getVideoReferenceScope(exercise) === 'named-component')
    return {
      relation: 'flow-component' as const,
      score,
      reason: '복합 흐름의 구성 동작 참고 · 전체 흐름과 구간은 미확인',
    };
  if (VIDEO_REFERENCE_SCOPE[video.videoId] === 'flow-component')
    return {
      relation: 'flow-component' as const,
      score,
      reason: '여러 동작이 담긴 영상 중 해당 구성 동작 참고 · 전체 시범과 구간은 미확인',
    };
  const name = normalizeVideoSearchText(exercise.nameEn);
  const title = normalizeVideoSearchText(video.title);
  const modified =
    VIDEO_REFERENCE_SCOPE[video.videoId] === 'related-variant' ||
    /\bprep(?:aration)?\b|\bsupported\b|\bsupport\b/.test(name) ||
    [
      /\bvariations?\b|\bmodified\b|\bmodifications?\b/,
      /\bsingle leg\b/,
      /\bdouble leg\b/,
      /\bprep(?:aration)?\b/,
      /\barm arcs?\b|\boutstretched arms?\b/,
    ].some((pattern) => pattern.test(title) && !pattern.test(name));
  return {
    relation: modified ? ('related-variant' as const) : ('named-movement' as const),
    score,
    reason: modified
      ? video.videoId === 'QFv_Fex3Mko'
        ? '한 다리 숄더 브리지 변형 참고 · 기본 브리지와 지지·범위가 다릅니다'
        : '동작 계열이 같은 변형 참고 · 준비 자세·지지·범위는 별도 확인'
      : '공개 제목의 동작명·기구가 대응합니다. 동일 시범·구간은 미확인입니다.',
  };
}

function toReference(
  video: Candidate,
  relation: ExerciseVideoRelation,
  reason: string,
  primary?: YouTubeClipRef,
): ExerciseVideoReference | null {
  const policy = normalizeReferenceUrlPolicy(
    primary?.url ?? `https://www.youtube.com/watch?v=${video.videoId}`,
    {
      startSec: primary?.startSec ?? 0,
      endSec: primary?.endSec,
    },
  );
  if (
    !policy.ok ||
    !policy.embedUrl ||
    !policy.canonicalExternalUrl ||
    policy.youtubeVideoId !== video.videoId
  )
    return null;
  const clip: YouTubeClipRef = primary
    ? { ...primary }
    : {
        videoId: video.videoId,
        videoTitle: video.title,
        channelName: video.authorName,
        url: `https://www.youtube.com/watch?v=${video.videoId}`,
        startSec: 0,
        region: video.region,
      };
  return {
    ...video,
    thumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
    hqThumbnailUrl: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
    watchUrl: policy.canonicalExternalUrl,
    embedUrl: policy.embedUrl,
    startSec: policy.startSec ?? 0,
    endSec: policy.endSec ?? undefined,
    clip,
    relation,
    relationLabelKo: labels[relation],
    matchReasonKo: reason,
    isPrimary: Boolean(primary),
    metadataStatus:
      video.verificationMethod === 'creator-page-and-oembed'
        ? 'creator-page-and-oembed'
        : byVideoId.has(video.videoId)
          ? 'existing-catalog-metadata'
          : 'saved-reference',
    playbackVerified: false,
    exactDemonstrationVerified: false,
    segmentVerified: false,
    professionalReviewVerified: false,
  };
}

/** Deduplicated references without apparatus-only or regional filler. */
export function getExerciseVideoReferences(exercise: PilatesExercise): ExerciseVideoReference[] {
  const currentIdentity = hasCurrentCatalogIdentity(exercise);
  const primaryPolicy = normalizeReferenceUrlPolicy(exercise.youtube?.url ?? '', {
    startSec: exercise.youtube?.startSec,
    endSec: exercise.youtube?.endSec,
  });
  const hasPrimary = primaryPolicy.ok && primaryPolicy.youtubeVideoId === exercise.youtube?.videoId;
  if (!currentIdentity && !hasPrimary) return [];
  const results: ExerciseVideoReference[] = [];
  const seen = new Set<string>();
  if (hasPrimary) {
    const primary = exercise.youtube;
    const metadata = byVideoId.get(primary.videoId);
    const video: Candidate = metadata ?? {
      videoId: primary.videoId,
      title: primary.videoTitle || `${exercise.nameKo} 연결 영상`,
      authorName: primary.channelName || '등록된 채널',
      region: primary.region ?? 'global',
      apparatus: [exercise.apparatus],
      blocks: [exercise.blockCategory],
      keywords: [],
    };
    const evidence = getExerciseVideoEvidence(exercise);
    const matched = metadata ? relationFor(exercise, metadata, currentIdentity) : null;
    const relation =
      evidence?.relation === 'related-variant'
        ? 'related-variant'
        : evidence?.relation === 'named-movement-reference'
          ? 'named-movement'
          : (matched?.relation ?? 'saved-reference');
    const primaryRef = toReference(
      video,
      relation,
      evidence?.relationshipNoteKo ??
        matched?.reason ??
        '저장한 원본 링크 · 현재 동작·기구와의 일치는 별도 확인',
      primary,
    );
    if (primaryRef) {
      results.push(primaryRef);
      seen.add(primaryRef.videoId);
    }
  }
  const eligible = pool
    .flatMap((video) => {
      if (seen.has(video.videoId) || !/^[A-Za-z0-9_-]{11}$/.test(video.videoId)) return [];
      const match = relationFor(exercise, video, currentIdentity);
      if (!match) return [];
      const reference = toReference(video, match.relation, match.reason);
      return reference ? [{ reference, score: match.score }] : [];
    })
    .sort((a, b) => b.score - a.score || a.reference.title.localeCompare(b.reference.title));
  for (const { reference } of eligible) {
    if (seen.has(reference.videoId)) continue;
    seen.add(reference.videoId);
    results.push(reference);
  }
  return results;
}

/** Editing the subject or saved source requires another explicit playback action. */
export function exerciseVideoGalleryKey(exercise: PilatesExercise): string {
  return JSON.stringify([
    exercise.id,
    exercise.nameEn,
    exercise.nameKo,
    exercise.apparatus,
    exercise.bodyPosition,
    exercise.props,
    exercise.requiredEquipment,
    exercise.youtube,
  ]);
}

export function getExerciseVideoCoverage(exercises: readonly PilatesExercise[]) {
  const rows = exercises.map((exercise) => {
    const references = getExerciseVideoReferences(exercise);
    return {
      exerciseId: exercise.id,
      nameKo: exercise.nameKo,
      apparatus: exercise.apparatus,
      count: references.length,
      relatedCount: references.filter((video) => video.relation !== 'saved-reference').length,
      videoIds: references.map((video) => video.videoId),
    };
  });
  return {
    total: rows.length,
    zero: rows.filter((row) => row.count === 0).length,
    one: rows.filter((row) => row.count === 1).length,
    multiple: rows.filter((row) => row.count >= 2).length,
    rows,
  };
}
