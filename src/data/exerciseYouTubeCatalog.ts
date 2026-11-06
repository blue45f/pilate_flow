import rawCatalog from './verifiedPilatesYouTubeCatalog.json';
import { APPARATUS_LABELS, CANONICAL_BLOCKS } from './pilatesCatalog';
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
}

export interface CuratedYouTubeVideoItem {
  videoId: string;
  title: string;
  authorName: string;
  region: 'kr' | 'global';
  apparatus: ApparatusType[];
  blocks: ClassBlockCategory[];
  keywords: string[];
  thumbnailUrl: string;
  hqThumbnailUrl: string;
  embedUrl: string;
  watchUrl: string;
  startSec?: number;
  matchReasonKo: string;
}

export const VERIFIED_YOUTUBE_VIDEO_POOL: readonly RawVerifiedYouTubeItem[] =
  rawCatalog as RawVerifiedYouTubeItem[];

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

function extractSlugFromExerciseId(exerciseId: string): string {
  return exerciseId.replace(/^original-(?:mat|reformer|cadillac|chair|barrel)-/, '');
}

function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// Keyword tags are discovery metadata, not evidence that two movements are equivalent.
// These audited names need title evidence because older tags connected them to a different task.
const AUDITED_TITLE_REQUIREMENTS: Readonly<Record<string, RegExp>> = {
  'incline-support': /fixed[\s-]*(?:seat|support)|incline[\s-]*support|고정\s*(?:좌면|지지)/i,
  'seated-back-reach': /seated.*(?:chest|back).*reach|(?:앉|시티드).*(?:가슴|체스트).*리치/i,
  'heel-slide': /heel[\s-]*slides?|힐\s*슬라이드/i,
};

function hasCompatibleAuditedTitle(item: RawVerifiedYouTubeItem, slug: string): boolean {
  return AUDITED_TITLE_REQUIREMENTS[slug]?.test(item.title) ?? true;
}

function discoveryLimit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(6, Math.floor(value))) : 0;
}

const GENERIC_MOVEMENT_WORDS = new Set([
  'pilates',
  'mat',
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'standing',
  'seated',
  'supine',
  'prone',
  '필라테스',
  '매트',
  '리포머',
  '캐딜락',
  '체어',
  '바렐',
  '시티드',
  '누워서',
  '앉아서',
]);

export function getRelatedYouTubeVideosForExercise(
  exercise: PilatesExercise,
  maxPerRegion = 4,
): CuratedYouTubeVideoItem[] {
  const slug = extractSlugFromExerciseId(exercise.id).toLowerCase();
  const limit = discoveryLimit(maxPerRegion);
  const exerciseTokens = new Set([
    slug,
    ...slug.split('-').filter((t) => t.length >= 3),
    ...tokenizeText(exercise.nameKo),
    ...tokenizeText(exercise.nameEn),
  ]);

  const scored = VERIFIED_YOUTUBE_VIDEO_POOL.filter(
    (item) => item.apparatus.includes(exercise.apparatus) && hasCompatibleAuditedTitle(item, slug),
  ).map((item) => {
    let score = 0;
    const reasons: string[] = [];

    const hasExactSlug = item.keywords.some((k) => k.toLowerCase() === slug);
    if (hasExactSlug) {
      score += 55;
      reasons.push(`‘${exercise.nameKo}’ 핵심 동작 키워드 일치`);
    }

    const hay = [item.title, item.authorName, ...item.keywords].join(' ').toLowerCase();
    let tokenHits = 0;
    for (const token of exerciseTokens) {
      if (token.length >= 2 && !GENERIC_MOVEMENT_WORDS.has(token) && hay.includes(token)) {
        tokenHits += 1;
      }
    }
    if (tokenHits > 0) {
      score += Math.min(36, tokenHits * 8);
      if (!hasExactSlug) {
        reasons.push(`동작 이름 키워드 ${tokenHits}건 · 동일 시범 미검수`);
      }
    }

    if (item.apparatus.includes(exercise.apparatus)) {
      score += 24;
      reasons.push(`${APPARATUS_LABELS[exercise.apparatus].ko} 기구 일치`);
    }

    if (item.blocks.includes(exercise.blockCategory)) {
      score += 18;
      const blockName =
        CANONICAL_BLOCKS.find((b) => b.category === exercise.blockCategory)?.nameKo ??
        exercise.blockCategory;
      reasons.push(`${blockName} 구간 일치`);
    }

    return {
      item,
      score,
      relevant: hasExactSlug || tokenHits > 0,
      reasonKo:
        reasons.slice(0, 2).join(' · ') || `${APPARATUS_LABELS[exercise.apparatus].ko} 참고 시퀀스`,
    };
  });

  const eligible = scored.filter((entry) => entry.relevant);
  eligible.sort((a, b) => b.score - a.score || a.item.videoId.localeCompare(b.item.videoId));

  const results: CuratedYouTubeVideoItem[] = [];
  const seenIds = new Set<string>();

  // If the exercise already has an explicit valid YouTube videoId, put it first
  if (exercise.youtube?.videoId && /^[A-Za-z0-9_-]{11}$/.test(exercise.youtube.videoId)) {
    seenIds.add(exercise.youtube.videoId);
    results.push(
      toCuratedItem(
        {
          videoId: exercise.youtube.videoId,
          title: exercise.youtube.videoTitle || `${exercise.nameKo} 참조 영상`,
          authorName: exercise.youtube.channelName || '등록된 채널',
          region: exercise.youtube.region ?? 'global',
          apparatus: [exercise.apparatus],
          blocks: [exercise.blockCategory],
          keywords: [slug],
        },
        '직접 연결한 참조 · 동작 일치와 적합성 미검수',
        exercise.youtube.startSec || 0,
      ),
    );
  }

  const krPicks = eligible
    .filter((entry) => entry.item.region === 'kr' && !seenIds.has(entry.item.videoId))
    .slice(0, limit);
  const globalPicks = eligible
    .filter((entry) => entry.item.region === 'global' && !seenIds.has(entry.item.videoId))
    .slice(0, limit);

  // Interleave domestic (kr) and international (global) for balanced discovery
  const maxLen = Math.max(krPicks.length, globalPicks.length);
  for (let i = 0; i < maxLen; i++) {
    if (krPicks[i]) {
      seenIds.add(krPicks[i].item.videoId);
      results.push(toCuratedItem(krPicks[i].item, krPicks[i].reasonKo));
    }
    if (globalPicks[i]) {
      seenIds.add(globalPicks[i].item.videoId);
      results.push(toCuratedItem(globalPicks[i].item, globalPicks[i].reasonKo));
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

// Posture, apparatus and body-area tags may rank a match but cannot establish one.
const GENERIC_MOTION_HINTS = new Set([
  ...GENERIC_MOVEMENT_WORDS,
  'quadruped', '네발기기', '골반고정', '골반', '복부', '코어', '흉추', '회전',
  '중둔근', '발목', '사이드', '스트랩', '밴드', '세라밴드', '운다체어', '래더바렐',
]);

export function getRelatedYouTubeVideosForMotion(
  reference: MotionPatternReference,
  maxPerRegion = 3,
): CuratedYouTubeVideoItem[] {
  const hint = MOTION_VARIANT_KEYWORD_MAP[reference.variantId];
  // An unknown pattern must not silently become a mat exercise.
  if (!hint) return [];
  const limit = discoveryLimit(maxPerRegion);
  const intendedSlugs = reference.intendedExerciseIds.map(extractSlugFromExerciseId);
  const scored = VERIFIED_YOUTUBE_VIDEO_POOL.filter(
    (item) =>
      item.apparatus.some((app) => hint.apparatus.includes(app)) &&
      intendedSlugs.every((slug) => hasCompatibleAuditedTitle(item, slug)),
  )
    .map((item) => {
      let score = 0;
      let movementSpecificHit = false;
      const hay = [item.title, item.authorName, ...item.keywords].join(' ').toLowerCase();

      for (const term of hint.terms) {
        if (hay.includes(term.toLowerCase())) {
          score += 22;
          if (!GENERIC_MOTION_HINTS.has(term.toLowerCase())) movementSpecificHit = true;
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
