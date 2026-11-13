import rawCatalog from './verifiedPilatesYouTubeCatalog.json';
import expandedCatalog from './expandedPilatesVideoCatalog.json';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import { getExerciseVideoEvidence } from './exerciseVideoBindings';
import {
  hasVideoSetupConflict,
  movementSlug,
  safeVideoDiscoveryLimit,
  scoreVideoSemanticMatch,
  hasAuditedVideoTitleMismatch,
  getVideoMatchReasonKo,
} from '../utils/videoSemanticMatching';
import type { MotionPatternReference } from './motionPatternReferences';
import type { ApparatusType, ClassBlockCategory, PilatesExercise } from '../types/pilates';

export interface RawVerifiedYouTubeItem {
  videoId: string;
  title: string;
  authorName: string;
  region: 'kr' | 'global';
  apparatus: ApparatusType[];
  blocks: ClassBlockCategory[];
  keywords: string[];
  /** Creator page and public metadata checks; never a playback or coaching approval. */
  sourceUrl?: string;
  sourceTitle?: string;
  verifiedAt?: string;
  verificationMethod?: 'creator-page-and-oembed';
  playbackVerified?: false;
}

export interface CuratedYouTubeVideoItem extends RawVerifiedYouTubeItem {
  thumbnailUrl: string;
  hqThumbnailUrl: string;
  embedUrl: string;
  watchUrl: string;
  startSec?: number;
  matchReasonKo: string;
}

export const VERIFIED_YOUTUBE_VIDEO_POOL: readonly RawVerifiedYouTubeItem[] = [
  ...rawCatalog,
  ...expandedCatalog,
] as RawVerifiedYouTubeItem[];

export const VERIFIED_YOUTUBE_BY_ID: ReadonlyMap<string, RawVerifiedYouTubeItem> = new Map(
  VERIFIED_YOUTUBE_VIDEO_POOL.map((item) => [item.videoId, item]),
);

export function getVerifiedYouTubeItemById(videoId: string): RawVerifiedYouTubeItem | undefined {
  return VERIFIED_YOUTUBE_BY_ID.get(videoId.trim());
}

export const VERIFIED_YOUTUBE_CATALOG_STATS = {
  totalVideos: VERIFIED_YOUTUBE_VIDEO_POOL.length,
  koreanVideos: VERIFIED_YOUTUBE_VIDEO_POOL.filter((item) => item.region === 'kr').length,
  globalVideos: VERIFIED_YOUTUBE_VIDEO_POOL.filter((item) => item.region === 'global').length,
} as const;

function toCuratedItem(
  raw: RawVerifiedYouTubeItem,
  matchReasonKo: string,
  startSec = 0,
): CuratedYouTubeVideoItem {
  const safeStart = Math.max(0, Math.floor(startSec || 0));
  const startParam = safeStart > 0 ? `&start=${safeStart}` : '';
  const watchStart = safeStart > 0 ? `&t=${safeStart}s` : '';
  return {
    ...raw,
    thumbnailUrl: `https://i.ytimg.com/vi/${raw.videoId}/mqdefault.jpg`,
    hqThumbnailUrl: `https://i.ytimg.com/vi/${raw.videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${raw.videoId}?rel=0${startParam}`,
    watchUrl: `https://www.youtube.com/watch?v=${raw.videoId}${watchStart}`,
    startSec: safeStart > 0 ? safeStart : undefined,
    matchReasonKo,
  };
}

export function getRelatedYouTubeVideosForExercise(
  exercise: PilatesExercise,
  maxPerRegion = 4,
): CuratedYouTubeVideoItem[] {
  const limit = safeVideoDiscoveryLimit(maxPerRegion);
  const eligible = VERIFIED_YOUTUBE_VIDEO_POOL.map((item) => ({
    item,
    score: scoreVideoSemanticMatch(exercise, item),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.videoId.localeCompare(b.item.videoId));

  const results: CuratedYouTubeVideoItem[] = [];
  const seenIds = new Set<string>();
  const linkedId = exercise.youtube?.videoId;
  if (linkedId && /^[A-Za-z0-9_-]{11}$/.test(linkedId)) {
    const verifiedEntry = VERIFIED_YOUTUBE_BY_ID.get(linkedId);
    if (
      verifiedEntry &&
      !hasVideoSetupConflict(exercise, verifiedEntry) &&
      !hasAuditedVideoTitleMismatch(exercise, verifiedEntry)
    ) {
      const evidence = getExerciseVideoEvidence(exercise);
      seenIds.add(linkedId);
      results.push(
        toCuratedItem(
          verifiedEntry,
          evidence
            ? `${evidence.relation === 'related-variant' ? '관련 변형 참조' : '이름이 대응하는 참조'} · 제목·출처 메타데이터 대조 · 실제 재생·동일 시범·구간 미검수`
            : '직접 연결한 참조 · 카탈로그 제목·채널 대조 · 실제 재생·동일 시범·구간 미검수',
          exercise.youtube.startSec || 0,
        ),
      );
    } else if (!verifiedEntry && (exercise.isCustom || !exercise.id.startsWith('ex-'))) {
      // Explicit user input remains an unreviewed reference, never an automatic recommendation.
      seenIds.add(linkedId);
      results.push(
        toCuratedItem(
          {
            videoId: linkedId,
            title: exercise.youtube.videoTitle || `${exercise.nameKo} 참조 영상`,
            authorName: exercise.youtube.channelName || '등록된 채널',
            region: exercise.youtube.region ?? 'global',
            apparatus: [exercise.apparatus],
            blocks: [exercise.blockCategory],
            keywords: [movementSlug(exercise.id)],
          },
          '직접 연결한 참조 · 제목·재생·동작 일치 미검수',
          exercise.youtube.startSec || 0,
        ),
      );
    }
  }
  const krPicks = eligible
    .filter((entry) => entry.item.region === 'kr' && !seenIds.has(entry.item.videoId))
    .slice(0, limit);
  const globalPicks = eligible
    .filter((entry) => entry.item.region === 'global' && !seenIds.has(entry.item.videoId))
    .slice(0, limit);
  for (let i = 0; i < Math.max(krPicks.length, globalPicks.length); i++) {
    for (const pick of [krPicks[i], globalPicks[i]]) {
      if (!pick || seenIds.has(pick.item.videoId)) continue;
      seenIds.add(pick.item.videoId);
      results.push(toCuratedItem(pick.item, getVideoMatchReasonKo(exercise)));
    }
  }
  return results;
}

const MOTION_VARIANT_KEYWORD_MAP: Record<string, { apparatus: ApparatusType[]; terms: string[] }> =
  {
    'articulated-pelvic-curl': {
      apparatus: ['mat'],
      terms: ['bridge', 'pelvic-clock', '브릿지', '숄더브리지', '골반', '척추분절'],
    },
    'supine-knee-fold': {
      apparatus: ['mat'],
      terms: ['knee-fold', '니폴드', '골반고정', 'single-leg-stretch', 'supine'],
    },
    'adult-supine-heel-slide': {
      apparatus: ['mat'],
      terms: ['heel-slide', '힐슬라이드', 'knee-fold', '골반고정', 'supine'],
    },
    'supine-chest-lift': {
      apparatus: ['mat'],
      terms: ['chest-lift', 'hundred', '헌드레드', '롤업', '복부', '컬업'],
    },
    'side-lying-clam': {
      apparatus: ['mat'],
      terms: ['clam', 'side-leg-lift', '클램', '중둔근', 'side-lying'],
    },
    'side-lying-straight-leg-lift': {
      apparatus: ['mat'],
      terms: ['side-leg-lift', 'clam', '사이드', '중둔근', 'side-lying'],
    },
    'side-lying-open-book': {
      apparatus: ['mat'],
      terms: ['open-book', 'seated-arm-reach', '스파인트위스트', '흉추', '회전'],
    },
    'quadruped-arm-reach': {
      apparatus: ['mat'],
      terms: ['quadruped-reach', 'cat-stretch', '네발기기', '버드독', 'quadruped'],
    },
    'quadruped-leg-slide': {
      apparatus: ['mat'],
      terms: ['quadruped-reach', 'cat-stretch', '네발기기', '버드독', 'quadruped'],
    },
    'quadruped-opposite-arm-leg-reach': {
      apparatus: ['mat'],
      terms: ['quadruped-reach', 'forearm-plank', '네발기기', '버드독', '코어'],
    },
    'seated-band-row': {
      apparatus: ['mat'],
      terms: ['band-row', 'seated-row', '세라밴드', '밴드', '로잉'],
    },
    'supine-band-arm-arc': {
      apparatus: ['mat', 'reformer'],
      terms: ['supine-breath', 'supine-arm-press', 'rib-breath', '암아크', '스트랩'],
    },
    'standing-wall-roll-down': {
      apparatus: ['mat'],
      terms: ['roll-up', '롤다운', '척추분절', 'standing'],
    },
    'standing-supported-heel-raise': {
      apparatus: ['mat', 'chair'],
      terms: ['ankle-reach', 'supported-calf-raise', '발목', '카프레이즈', 'footwork'],
    },
    'reformer-carriage-footwork': {
      apparatus: ['reformer'],
      terms: ['parallel-footwork', '풋워크', '리포머풋워크', 'footwork'],
    },
    'reformer-supine-strap-arm-lower': {
      apparatus: ['reformer'],
      terms: ['supine-arm-press', 'supine-breath', '헌드레드', '스트랩', '리포머'],
    },
    'cadillac-roll-down-bar-articulation': {
      apparatus: ['cadillac'],
      terms: ['seated-roll-back', 'table-breath', '캐딜락', '롤다운바', '푸쉬스루바'],
    },
    'chair-seated-pedal-press': {
      apparatus: ['chair'],
      terms: ['seated-pedal-press', 'alternating-pedal', '체어', '운다체어', '풋워크'],
    },
    'barrel-supported-side-bend': {
      apparatus: ['barrel'],
      terms: ['supported-side-bend', 'supported-swan', '바렐', '래더바렐', '사이드벤드', '스완'],
    },
    'prone- thoracic-extension-prep': {
      apparatus: ['mat', 'barrel'],
      terms: ['swan-prep', '스완', '흉추신전', 'extension'],
    },
    'supine-single-leg-reach': {
      apparatus: ['mat'],
      terms: ['single-leg-stretch', 'heel-slide', 'knee-fold', '싱글레그', '코어'],
    },
  };

export function getRelatedYouTubeVideosForMotion(
  reference: MotionPatternReference,
  maxPerRegion = 3,
): CuratedYouTubeVideoItem[] {
  const hint = MOTION_VARIANT_KEYWORD_MAP[reference.variantId];
  // An unknown pattern must not silently become a mat exercise.
  if (!hint) return [];
  const limit = safeVideoDiscoveryLimit(maxPerRegion);
  const intendedExercises = INITIAL_EXERCISES.filter((exercise) =>
    reference.intendedExerciseIds.includes(exercise.id),
  );
  if (!intendedExercises.length) return [];
  const scored = VERIFIED_YOUTUBE_VIDEO_POOL.filter(
    (item) =>
      item.apparatus.some((app) => hint.apparatus.includes(app)) &&
      intendedExercises.some((exercise) => scoreVideoSemanticMatch(exercise, item) > 0),
  )
    .map((item) => {
      let score = 0;
      let movementSpecificHit = false;
      const hay = item.title.toLowerCase();

      for (const term of hint.terms) {
        if (hay.includes(term.toLowerCase())) {
          score += 22;
          movementSpecificHit = true;
        }
      }
      if (item.apparatus.some((app) => hint.apparatus.includes(app))) {
        score += 20;
      }

      return {
        item,
        score,
        movementSpecificHit,
        reasonKo: `‘${reference.title}’ 패턴의 ${item.region === 'kr' ? '국내' : '해외'} 연관 탐색 자료 · 동일 시범 미검수`,
      };
    })
    .filter((entry) => entry.movementSpecificHit)
    .sort((a, b) => b.score - a.score || a.item.videoId.localeCompare(b.item.videoId));

  const krPicks = scored.filter((e) => e.item.region === 'kr').slice(0, limit);
  const globalPicks = scored.filter((e) => e.item.region === 'global').slice(0, limit);

  const combined: CuratedYouTubeVideoItem[] = [];
  const maxLen = Math.max(krPicks.length, globalPicks.length);
  for (let i = 0; i < maxLen; i++) {
    if (krPicks[i]) combined.push(toCuratedItem(krPicks[i].item, krPicks[i].reasonKo));
    if (globalPicks[i]) combined.push(toCuratedItem(globalPicks[i].item, globalPicks[i].reasonKo));
  }
  return combined;
}
