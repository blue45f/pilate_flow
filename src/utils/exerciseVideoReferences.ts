import {
  VERIFIED_YOUTUBE_VIDEO_POOL,
  type CuratedYouTubeVideoItem,
  type RawVerifiedYouTubeItem,
} from '../data/exerciseYouTubeCatalog';
import {
  getExerciseVideoEvidence,
  refreshCatalogVideoReference,
} from '../data/exerciseVideoBindings';
import { EXERCISE_VIDEO_COMPONENTS, VIDEO_REFERENCE_SCOPE } from '../data/exerciseVideoComponents';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
} from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { normalizeReferenceUrlPolicy } from '../features/referenceLinkPolicyCandidate/urlPolicyEngine';
import type {
  ApparatusType,
  BodyPosition,
  PilatesExercise,
  PropType,
  YouTubeClipRef,
} from '../types/pilates';
import {
  getVideoReferenceScope,
  normalizeVideoSearchText,
  scoreVideoSemanticMatch,
  videoReferenceSubject,
  type VideoSemanticExercise,
} from './videoSemanticMatching';

export type ExerciseVideoRelation =
  'named-movement' | 'related-variant' | 'flow-component' | 'saved-reference' | 'base-reference';

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
const poolByApparatus = new Map<ApparatusType, Candidate[]>();
for (const video of pool) {
  for (const apparatus of video.apparatus) {
    const candidates = poolByApparatus.get(apparatus) ?? [];
    candidates.push(video);
    poolByApparatus.set(apparatus, candidates);
  }
}
const labels: Record<ExerciseVideoRelation, string> = {
  'named-movement': '같은 이름의 동작',
  'related-variant': '비슷한 동작',
  'flow-component': '수업 중 한 동작',
  'saved-reference': '연결한 영상',
  'base-reference': '기본 동작의 참고 영상',
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
      reason: '여러 동작 중 한 가지를 비교할 수 있어요. 전체 순서가 같은지, 이 동작이 몇 분에 나오는지는 아직 확인하지 못했어요.',
    };
  if (VIDEO_REFERENCE_SCOPE[video.videoId] === 'flow-component')
    return {
      relation: 'flow-component' as const,
      score,
      reason: '여러 동작이 담긴 수업이에요. 이 동작이 나오는 부분을 찾아보세요.',
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
        : '비슷한 동작이에요. 시작 자세와 손발을 짚는 위치가 어떻게 다른지 살펴보세요.'
      : '제목에 같은 동작과 기구가 나와요. 영상에서 시작 자세를 먼저 확인해 보세요.',
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
export function getExerciseVideoReferences(record: PilatesExercise): ExerciseVideoReference[] {
  const exercise = refreshCatalogVideoReference(record);
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
    const familyScope =
      primary.referenceSubject === videoReferenceSubject(exercise, video.videoId)
        ? primary.referenceScope
        : undefined;
    const oldAutomaticLink = primary.note?.startsWith('저장소 검증 카탈로그 의미 매칭');
    const relation =
      familyScope === 'base-movement'
        ? 'base-reference'
        : familyScope === 'movement-family'
          ? 'related-variant'
          : evidence?.relation === 'related-variant'
            ? 'related-variant'
            : evidence?.relation === 'named-movement-reference'
              ? 'named-movement'
              : (matched?.relation ?? 'saved-reference');
    const primaryRef = toReference(
      video,
      relation,
      (familyScope === 'base-movement'
        ? '기본 동작에 연결된 영상이에요. 이 변형에서는 도구나 속도, 지지하는 쪽이 달라질 수 있어요.'
        : familyScope === 'movement-family'
          ? '같은 계열의 동작이에요. 시작 자세와 움직이는 범위를 비교해 보세요.'
          : evidence?.relationshipNoteKo) ??
        matched?.reason ??
        '연결해 둔 영상이에요. 같은 동작과 기구인지 먼저 확인해 보세요.',
      primary,
    );
    if (primaryRef && (!oldAutomaticLink || matched || familyScope)) {
      results.push(primaryRef);
      seen.add(primaryRef.videoId);
    }
  }
  const eligible = (poolByApparatus.get(exercise.apparatus) ?? [])
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
      relatedCount: references.filter(
        (video) => video.relation !== 'saved-reference' && video.relation !== 'base-reference',
      ).length,
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
