import rawVerifiedCatalog from './verifiedPilatesYouTubeCatalog.json';
import expandedVideoCatalog from './expandedPilatesVideoCatalog.json';
import additionalVideoCatalog from './additionalPilatesVideoCatalog.json';
import creatorVideoCatalog from './creatorPilatesVideoCatalog.json';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
} from './globalCrawledRepertoirePack';
import {
  WORLD_NEW_ATOMIC_SEEDS,
  type AnatomyVisualZone,
  type CommonFaultCorrection,
  type ExerciseAnatomyInsight,
  type PilatesSchoolTag,
  type WorldAtomicSeed,
} from './worldPilatesAtomicSeeds';
import { WORLD_FUSION_AND_ADVANCED_SEEDS } from './worldPilatesFusionAndAdvancedSeeds';
import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  SpinalPlane,
  YouTubeClipRef,
} from '../types/pilates';

export type {
  AnatomyVisualZone,
  CommonFaultCorrection,
  ExerciseAnatomyInsight,
  PilatesSchoolTag,
  WorldAtomicSeed,
};

export type RepertoireTier = 'atomic' | 'variation';

export type VariationKind =
  | 'archetype'
  | 'prop-mini-ball'
  | 'prop-magic-circle'
  | 'prop-foam-roller'
  | 'prop-loop-band'
  | 'prop-theraband'
  | 'prop-toning-ball'
  | 'prop-bosu'
  | 'single-leg'
  | 'unilateral-arm'
  | 'tempo-pulse'
  | 'isometric-hold'
  | 'rotation-layer'
  | 'spring-light-control'
  | 'regression-supported'
  | 'custom-remix';

export interface WorldPilatesExercise extends PilatesExercise {
  readonly anatomyInsight: ExerciseAnatomyInsight;
  readonly tier: RepertoireTier;
  readonly parentArchetypeId: string;
  readonly schoolTag: PilatesSchoolTag;
  readonly variationKind: VariationKind;
}

export interface WorldRepertoireStats {
  readonly totalCount: number;
  readonly atomicCount: number;
  readonly variationCount: number;
  readonly existingCoreCount: number;
  readonly verifiedVideoCount: number;
  readonly byApparatus: Readonly<Record<ApparatusType, number>>;
  readonly bySchool: Readonly<Record<PilatesSchoolTag, number>>;
  readonly byLevel: Readonly<Record<DifficultyLevel, number>>;
  readonly byTier: Readonly<Record<RepertoireTier, number>>;
  readonly byBlock: Readonly<Record<ClassBlockCategory, number>>;
  readonly byVisualZone: Readonly<Record<AnatomyVisualZone, number>>;
}

export interface ProgressionTreeNode {
  readonly id: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly level: DifficultyLevel;
  readonly apparatus: ApparatusType;
  readonly springs: string;
  readonly props: readonly PropType[];
  readonly tier: RepertoireTier;
  readonly variationKind: VariationKind;
  readonly schoolTag: PilatesSchoolTag;
  readonly relationLabelKo: string;
}

export interface ProgressionTree {
  readonly archetypeId: string;
  readonly current: WorldPilatesExercise | null;
  readonly base: ProgressionTreeNode | null;
  readonly easier: readonly ProgressionTreeNode[];
  readonly harder: readonly ProgressionTreeNode[];
  readonly propVariations: readonly ProgressionTreeNode[];
  readonly allFamilyNodes: readonly ProgressionTreeNode[];
}

export const PILATES_SCHOOL_LABELS: Readonly<
  Record<PilatesSchoolTag, { readonly ko: string; readonly shortKo: string; readonly group: 'traditional' | 'fusion' }>
> = {
  classical: { ko: '클래식 필라테스', shortKo: '클래식', group: 'traditional' },
  stott: { ko: '스탓(STOTT) 컨템포러리', shortKo: 'STOTT', group: 'traditional' },
  'balanced-body': { ko: '밸런스드 바디', shortKo: 'Balanced Body', group: 'traditional' },
  basi: { ko: 'BASI 블록 시스템', shortKo: 'BASI', group: 'traditional' },
  'korean-studio': { ko: '국내 스튜디오 시그니처', shortKo: '국내 스튜디오', group: 'traditional' },
  'fusion-barre': { ko: '바레 퓨전 (Barre)', shortKo: '바레 퓨전', group: 'fusion' },
  'fusion-athletic': { ko: '애슬레틱·기능성 퓨전', shortKo: '애슬레틱 퓨전', group: 'fusion' },
  'fusion-mobility': { ko: '가동성·모빌리티 플로우', shortKo: '모빌리티 퓨전', group: 'fusion' },
};

export const ANATOMY_VISUAL_ZONE_META: Readonly<
  Record<AnatomyVisualZone, { readonly labelKo: string; readonly imagePath: string }>
> = {
  core: { labelKo: '심부 코어 · 복부', imagePath: '/images/atelier-anatomy/anatomy-core-deep.webp' },
  glutes: { labelKo: '둔근 · 하체 후면', imagePath: '/images/atelier-anatomy/anatomy-glutes-lower.webp' },
  spine: { labelKo: '척추 분절 · 등 상부', imagePath: '/images/atelier-anatomy/anatomy-spine-back.webp' },
  shoulder: { labelKo: '견갑대 · 팔 라인', imagePath: '/images/atelier-anatomy/anatomy-shoulder-upper.webp' },
  lateral: { labelKo: '복사근 · 옆구리 라인', imagePath: '/images/atelier-anatomy/anatomy-lateral-obliques.webp' },
  hip: { labelKo: '고관절 · 내전근 정렬', imagePath: '/images/atelier-anatomy/anatomy-hip-mobility.webp' },
};

// =============================================================================
// 1. VERIFIED YOUTUBE POOL (STRICTLY FROM 5 REPO CATALOGS — ZERO FABRICATION)
// =============================================================================

interface VerifiedVideoPoolItem {
  readonly videoId: string;
  readonly title: string;
  readonly channelName: string;
  readonly region: 'kr' | 'global';
  readonly apparatus: readonly ApparatusType[];
  readonly blocks: readonly ClassBlockCategory[];
  readonly keywords: readonly string[];
  readonly searchText: string;
}

interface RawJsonVideoItem {
  videoId: string;
  title: string;
  authorName: string;
  region: 'kr' | 'global';
  apparatus: ApparatusType[];
  blocks: ClassBlockCategory[];
  keywords: string[];
}

function normalizeTokenText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const VERIFIED_VIDEO_POOL: readonly VerifiedVideoPoolItem[] = (() => {
  const byId = new Map<string, VerifiedVideoPoolItem>();
  const jsonSources: RawJsonVideoItem[] = [
    ...(rawVerifiedCatalog as RawJsonVideoItem[]),
    ...(expandedVideoCatalog as RawJsonVideoItem[]),
    ...(additionalVideoCatalog as RawJsonVideoItem[]),
    ...(creatorVideoCatalog as RawJsonVideoItem[]),
  ];

  for (const item of jsonSources) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(item.videoId)) continue;
    if (byId.has(item.videoId)) continue;
    byId.set(item.videoId, {
      videoId: item.videoId,
      title: item.title,
      channelName: item.authorName,
      region: item.region,
      apparatus: item.apparatus,
      blocks: item.blocks,
      keywords: item.keywords ?? [],
      searchText: normalizeTokenText(`${item.title} ${(item.keywords ?? []).join(' ')}`),
    });
  }

  for (const item of CRAWLED_YOUTUBE_DISCOVERY_POOL) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(item.videoId)) continue;
    if (byId.has(item.videoId)) continue;
    byId.set(item.videoId, {
      videoId: item.videoId,
      title: item.title,
      channelName: item.channelName,
      region: item.region,
      apparatus: item.apparatus,
      blocks: item.blocks,
      keywords: item.keywords,
      searchText: normalizeTokenText(`${item.title} ${item.keywords.join(' ')}`),
    });
  }

  return Array.from(byId.values());
})();

export const VERIFIED_REPERTOIRE_VIDEO_ID_SET: ReadonlySet<string> = new Set(
  VERIFIED_VIDEO_POOL.map((item) => item.videoId),
);

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'mat',
  'reformer',
  'cadillac',
  'chair',
  'wunda',
  'barrel',
  'ladder',
  'pilates',
  'classical',
  'fusion',
  'barre',
  'athletic',
  'mobility',
  'prep',
  'preparation',
  'supported',
  'flow',
  'series',
]);

export function resolveVerifiedYouTubeForExercise(
  exercise: Pick<
    PilatesExercise,
    'nameKo' | 'nameEn' | 'apparatus' | 'blockCategory' | 'bodyPosition' | 'props'
  > & { readonly youtube?: YouTubeClipRef },
  videoHints: readonly string[] = [],
): YouTubeClipRef {
  const existingId = exercise.youtube?.videoId?.trim() ?? '';
  if (existingId && VERIFIED_REPERTOIRE_VIDEO_ID_SET.has(existingId) && exercise.youtube) {
    return {
      ...exercise.youtube,
      url: exercise.youtube.url || `https://www.youtube.com/watch?v=${existingId}`,
    };
  }

  const tokens = [
    ...new Set(
      normalizeTokenText(`${exercise.nameEn} ${exercise.nameKo} ${videoHints.join(' ')}`)
        .split(' ')
        .filter((t) => t.length >= 2 && !STOP_WORDS.has(t)),
    ),
  ];

  const activeProps = exercise.props.filter((p) => p !== 'none');

  let best: VerifiedVideoPoolItem | null = null;
  let bestScore = -Infinity;

  for (const candidate of VERIFIED_VIDEO_POOL) {
    let score = 0;
    if (candidate.apparatus.includes(exercise.apparatus)) {
      score += 50;
    } else {
      score -= 45;
    }

    if (candidate.blocks.includes(exercise.blockCategory)) {
      score += 20;
    }

    for (const hint of videoHints) {
      const normHint = normalizeTokenText(hint);
      if (normHint.length >= 3 && candidate.searchText.includes(normHint)) {
        score += 32;
      }
    }

    let tokenHits = 0;
    for (const token of tokens) {
      if (candidate.searchText.includes(token)) {
        tokenHits += 1;
        score += token.length >= 5 ? 16 : 10;
      }
    }
    if (tokenHits >= 2) score += 14;

    for (const prop of activeProps) {
      const propKeyword = prop.replace('-', ' ');
      if (candidate.searchText.includes(propKeyword) || candidate.searchText.includes(prop)) {
        score += 18;
      }
    }

    if (candidate.region === 'kr') score += 2;

    if (score > bestScore || (score === bestScore && best && candidate.videoId < best.videoId)) {
      bestScore = score;
      best = candidate;
    }
  }

  const chosen = best ?? VERIFIED_VIDEO_POOL[0]!;
  return {
    videoId: chosen.videoId,
    channelName: chosen.channelName,
    videoTitle: chosen.title,
    startSec: 0,
    url: `https://www.youtube.com/watch?v=${chosen.videoId}`,
    note: `저장소 검증 카탈로그 의미 매칭 (${chosen.channelName})`,
    region: chosen.region,
  };
}

// =============================================================================
// 2. INTUITIVE ANATOMY INSIGHT ENGINE (WORKS ON ALL 218 LEGACY + ALL 1,050+)
// =============================================================================

function inferVisualZone(
  exercise: Pick<PilatesExercise, 'blockCategory' | 'spinalPlanes' | 'bodyPosition' | 'targetMuscles'>,
): AnatomyVisualZone {
  const muscleText = exercise.targetMuscles.join(' ');
  if (/중둔근|대둔근|둔근|햄스트링/.test(muscleText)) {
    if (exercise.blockCategory === 'bridging' || exercise.blockCategory === 'lower-body') {
      return 'glutes';
    }
  }
  if (/외복사근|내복사근|요방형근|옆구리/.test(muscleText) || exercise.spinalPlanes.includes('lateral')) {
    return 'lateral';
  }
  if (/내전근|장요근|고관절|발목|비복근|이상근/.test(muscleText) || exercise.blockCategory === 'feet-in-straps' || exercise.blockCategory === 'footwork') {
    return 'hip';
  }
  if (
    exercise.blockCategory === 'upper-body' ||
    /삼두근|이두근|삼각근|승모근|능형근|전거근|대흉근|광배근|회전근개/.test(muscleText)
  ) {
    return 'shoulder';
  }
  if (exercise.blockCategory === 'extension' || exercise.blockCategory === 'warmup' || exercise.blockCategory === 'cooldown') {
    return exercise.spinalPlanes.includes('lateral') ? 'lateral' : 'spine';
  }
  if (exercise.blockCategory === 'bridging' || exercise.blockCategory === 'lower-body') {
    return 'glutes';
  }
  return 'core';
}

function buildSpringMechanicsKo(
  exercise: Pick<PilatesExercise, 'apparatus' | 'springs' | 'blockCategory' | 'box' | 'bodyPosition' | 'props'>,
): string {
  const sp = exercise.springs.trim();
  const activeProps = exercise.props.filter((p) => p !== 'none');

  if (exercise.apparatus === 'mat') {
    if (activeProps.includes('mini-ball')) {
      return '스프링 대신 미니볼의 탄성 압박과 불안정 지지가 내전근·심부 코어 참여를 자연스럽게 끌어올립니다.';
    }
    if (activeProps.includes('magic-circle')) {
      return '써클링의 양방향 탄성 저항이 관절 충격 없이 내전근·가슴·코어의 등척성 수축을 선명하게 유도합니다.';
    }
    if (activeProps.includes('foam-roller')) {
      return '폼롤러의 좁은 곡면 지지대가 균형 흔들림을 만들어 깊은 다열근과 복횡근을 자동 점화합니다.';
    }
    if (activeProps.includes('loop-band') || activeProps.includes('theraband')) {
      return '탄력 밴드는 늘어날수록 점진적으로 저항이 커져 동작 끝 지점의 근육 수축을 선명하게 만듭니다.';
    }
    if (activeProps.includes('bosu')) {
      return '보수 돔의 공기압 불안정성이 발목·코어 안정화근의 반사적 지지력을 크게 끌어올립니다.';
    }
    if (activeProps.includes('sliders')) {
      return '슬라이더의 낮은 마찰력이 리포머 캐리지와 비슷한 편심성 버팀 부하를 코어와 하체에 전달합니다.';
    }
    if (activeProps.includes('toning-ball') || activeProps.includes('dumbbell')) {
      return '가벼운 소중량 저항이 팔 지렛대 끝 무게감을 더해 어깨 안정화근과 상체 지구력을 균형 있게 자극합니다.';
    }
    return '기구 스프링 없이 순수 체중과 중력 지렛대를 제어하며 심부 안정화근의 자발적 수축력을 기릅니다.';
  }

  if (exercise.apparatus === 'barrel') {
    if (exercise.blockCategory === 'extension') {
      return '바렐 아크 곡면이 골반과 흉추를 안정적으로 받쳐 주어 중력 저항 속에서도 허리 꺾임 없는 신전을 돕습니다.';
    }
    if (exercise.blockCategory === 'cooldown' || exercise.blockCategory === 'warmup') {
      return '스프링 대신 바렐의 완만한 곡면이 척추와 고관절의 안전한 지지대가 되어 깊은 가동성 확장을 유도합니다.';
    }
    return '바렐의 높은 곡면 지지와 사다리 고정점이 중력 지렛대를 넓혀 코어·둔근의 전체 가동 범위 수축을 이끕니다.';
  }

  if (exercise.apparatus === 'reformer') {
    if (exercise.box === 'short-box' || /고정|fixed/i.test(sp)) {
      return `고중량 세팅(${sp || '2R 1B'})은 저항이 아니라 캐리지 흔들림을 잠그는 안전 닻 역할을 하여 중력·체중 제어에 집중하게 합니다.`;
    }
    if (exercise.blockCategory === 'footwork') {
      return `중강 스프링(${sp || '2R 1B'})이 하지 신전에 직접 저항을 주고, 복귀 구간에서는 관절 정렬 피드백을 제공합니다.`;
    }
    if (exercise.blockCategory === 'bridging') {
      return `브릿징(${sp || '2R'})은 스프링이 가벼울수록 캐리지가 밀리기 쉬워 햄스트링과 코어의 캐리지 고정 난이도가 높아집니다.`;
    }
    if (exercise.blockCategory === 'plank') {
      return `플랭크 계열(${sp || '1R 1B'})은 무거운 스프링이 캐리지 복귀를 보조하고, 가벼운 스프링일수록 복횡근·전거근 제어 부하가 커집니다.`;
    }
    if (exercise.blockCategory === 'feet-in-straps') {
      return `스트랩 스프링(${sp || '1R 1B'})이 다리 무게를 공중에서 보조해 고관절을 감압하면서 내전근·후면 사슬에 고른 저항을 줍니다.`;
    }
    if (exercise.blockCategory === 'upper-body') {
      return `경·중량 스트랩(${sp || '1R / 1B'})이 당김·밀기 전 구간에 균일한 저항을 주어 승모근 과긴장 없이 어깨 안정화를 이끕니다.`;
    }
    if (exercise.blockCategory === 'lower-body' && exercise.bodyPosition === 'standing') {
      return `스탠딩 리포머(${sp || '1R'})는 가벼운 스프링일수록 지지 보조가 줄어 앞다리 둔근·내전근과 코어 밸런스 난이도가 높아집니다.`;
    }
    return `스프링(${sp || '1R 1B'})이 캐리지 이동에는 저항을, 복귀 구간에는 편심성 브레이크 피드백을 제공해 심부 코어를 깨웁니다.`;
  }

  if (exercise.apparatus === 'cadillac') {
    if (/하단|bottom/i.test(sp)) {
      return `하단 스프링(${sp})이 수직 밀기 저항을 제공하므로 반드시 세이프티 스트랩 체결 상태에서 정교하게 제어합니다.`;
    }
    if (/상단|롤백|롤다운|푸쉬스루/i.test(sp)) {
      return `상단 스프링(${sp})이 몸통 무게를 탄력적으로 보조해 초보자도 안전하게 깊은 척추 분절과 흉추 신전을 익힐 수 있습니다.`;
    }
    if (/레그|암/i.test(sp)) {
      return `좌우 독립 스프링(${sp})이 양측 힘 차이를 그대로 드러내어 대칭적인 근력 협응과 중심축 제어를 훈련합니다.`;
    }
    return `캐딜락의 안정된 프레임과 탄성 스프링(${sp || '맞춤 장력'})이 가동 범위 보조와 균형 저항을 동시에 제공합니다.`;
  }

  // Wunda Chair
  if (exercise.blockCategory === 'footwork') {
    return `체어 페달(${sp || '2 Heavy'})은 무거운 스프링일수록 하향 압박 시 대퇴사두·종아리 저항이 커지고 직립 코어 지지를 요구합니다.`;
  }
  if (exercise.blockCategory === 'plank' || (exercise.blockCategory === 'lower-body' && exercise.bodyPosition === 'standing')) {
    return `체어 스탠딩·파이크(${sp || '1 Heavy + 1 Medium'})는 스프링이 무거울수록 체중을 밀어 올려 보조하고, 가벼울수록 코어·둔근 난이도가 높아집니다.`;
  }
  return `체어 페달 스프링(${sp || '1 Medium'})이 상·하강 전 구간에 수직 탄성 반력을 제공해 좁은 지지면에서의 정밀 제어를 훈련합니다.`;
}

function buildBenefitsKo(
  exercise: Pick<PilatesExercise, 'blockCategory' | 'spinalPlanes' | 'targetMuscles' | 'props' | 'isUnilateral'>,
): readonly string[] {
  const list: string[] = [];
  const blockMap: Record<ClassBlockCategory, [string, string]> = {
    warmup: ['흉곽 호흡 리듬과 골반 중립 감각 확립', '본 운동 전 관절 가동성과 심부 코어 예열'],
    footwork: ['발목-무릎-고관절 하지 정렬 감각 강화', '대퇴사두·둔근·발 아치 균형 활성화'],
    bridging: ['대둔근·햄스트링 후면 사슬 탄력 강화', '요추·흉추 부드러운 척추 분절 유연성 증진'],
    core: ['복횡근·복직근 중심 파워하우스 지지력 향상', '팔다리 움직임 중 골반·척추 안정화 강화'],
    'upper-body': ['등 상부·어깨 안정화근 활성화와 팔 라인 정리', '라운드 숄더 완화에 도움 되는 흉곽 정렬 학습'],
    'lower-body': ['중둔근·대둔근·허벅지 균형 하체 근력 강화', '무릎 정렬 유지와 단측 하체 안정성 향상'],
    plank: ['전거근 어깨 지지력과 전신 중심축 지구력 강화', '허리 처짐을 막는 항신전 심부 코어 컨트롤 향상'],
    extension: ['굽은 상체를 펴는 흉추 신전 가동성 향상', '척추기립근·후면 사슬 균형 근력 강화'],
    'feet-in-straps': ['고관절 감압과 내전근·햄스트링 부드러운 유연성 증진', '천골 고정 상태의 정교한 고관절 제어력 향상'],
    cooldown: ['운동 후 긴장된 근막 이완과 호흡 리듬 안정화', '척추·고관절 가동 범위 회복 마무리'],
  };

  const [b1, b2] = blockMap[exercise.blockCategory];
  list.push(b1, b2);

  if (exercise.spinalPlanes.includes('rotation')) {
    list.push('흉추 회전 가동성과 복사근 대각선 연결 강화');
  } else if (exercise.spinalPlanes.includes('lateral')) {
    list.push('측면 복사근 강화와 갈비뼈 사이 호흡 공간 확장');
  } else if (exercise.isUnilateral) {
    list.push('좌우 근력·균형 비대칭 인지 및 편측 안정성 보완');
  } else if (exercise.props.some((p) => p !== 'none')) {
    list.push('소도구 피드백으로 목표 근육 수축 인지력 상승');
  }

  return list.slice(0, 3);
}

function buildCommonFaultsKo(
  exercise: Pick<PilatesExercise, 'blockCategory' | 'spinalPlanes' | 'bodyPosition' | 'apparatus'>,
): readonly [CommonFaultCorrection, CommonFaultCorrection] {
  if (exercise.blockCategory === 'footwork') {
    return [
      {
        fault: '다리를 끝까지 펼 때 무릎을 튕기듯 과신전하거나 발목이 바깥으로 꺾임',
        fixCue: '무릎을 1% 부드럽게 남기고 엄지·새끼발볼·뒤꿈치 삼각 지점을 고르게 밀어내세요.',
      },
      {
        fault: '돌아올 때 스프링에 끌려오며 꼬리뼈가 캐리지에서 말려 올라감',
        fixCue: '천골을 바닥에 무겁게 둔 채 고관절 앞주름이 접히는 느낌으로 천천히 제어 복귀하세요.',
      },
    ];
  }
  if (exercise.blockCategory === 'bridging') {
    return [
      {
        fault: '둔근 대신 허리(요추 기립근)를 과하게 꺾어 갈비뼈가 천장으로 들림',
        fixCue: '갈비뼈 아랫단과 치골 사이를 가볍게 잠근 채 좌골을 무릎 뒤쪽으로 길게 보내세요.',
      },
      {
        fault: '올라가는 동안 양무릎이 바깥으로 벌어지거나 목 뒤에 체중이 쏠림',
        fixCue: '무릎 사이에 주먹 하나 너비를 유지하고 체중은 날개뼈 하단선까지만 실어주세요.',
      },
    ];
  }
  if (exercise.blockCategory === 'plank' || exercise.bodyPosition === 'quadruped') {
    return [
      {
        fault: '날개뼈 사이가 푹 꺼지며 손목·상부승모근에 체중이 집중됨',
        fixCue: '손바닥 전체로 지지면을 밀어 겨드랑이 아래 전거근을 단단히 채워 세워주세요.',
      },
      {
        fault: '버티는 도중 아랫배 힘이 풀려 허리가 아래로 처지거나 고개가 떨어짐',
        fixCue: '배꼽을 등 쪽으로 끌어올리고 정수리부터 뒤꿈치까지 하나의 사선 축을 유지하세요.',
      },
    ];
  }
  if (exercise.blockCategory === 'extension' || exercise.spinalPlanes.includes('extension')) {
    return [
      {
        fault: '흉추를 길게 펴지 않고 고개를 뒤로 젖히거나 하부 요추만 과도하게 꺾음',
        fixCue: '배꼽을 바닥에서 살짝 띄워 허리를 보호한 뒤 쇄골을 넓히며 윗등부터 들어 올리세요.',
      },
      {
        fault: '팔과 어깨에 힘이 들어가 승모근이 귀 쪽으로 으쓱 올라감',
        fixCue: '날개뼈를 등 뒤 허리 주머니 쪽으로 부드럽게 끌어내려 목 옆선을 길게 비워두세요.',
      },
    ];
  }
  if (exercise.blockCategory === 'feet-in-straps') {
    return [
      {
        fault: '다리를 내릴 때 갈비뼈가 들리고 허리가 바닥에서 과도하게 뜸',
        fixCue: '날숨에 복횡근을 단단히 닫아 허리가 중립을 유지하는 각도까지만 다리를 내리세요.',
      },
      {
        fault: '다리를 천장으로 올릴 때 꼬리뼈가 말려 올라가며 스트랩 텐션이 풀림',
        fixCue: '천골을 닻처럼 무겁게 눌러 고정하고 발뒤꿈치로 스트랩을 끝까지 밀어내세요.',
      },
    ];
  }
  if (exercise.spinalPlanes.includes('lateral') || exercise.bodyPosition === 'side-lying') {
    return [
      {
        fault: '몸통이 앞뒤로 비틀어지거나 아래쪽 옆구리가 바닥·기구에 힘없이 주저앉음',
        fixCue: '두 골반과 어깨를 유리벽 사이에 세우듯 수직으로 쌓고 아래 옆구리에 작은 공간을 띄우세요.',
      },
      {
        fault: '어깨가 귀 쪽으로 솟아 목 옆선이 짧아지고 호흡이 얕아짐',
        fixCue: '팔을 길게 뻗어 견갑을 낮춘 채 위쪽 갈비뼈 사이로 깊게 호흡을 채워 넣으세요.',
      },
    ];
  }
  if (exercise.spinalPlanes.includes('rotation')) {
    return [
      {
        fault: '흉추 대신 골반이 함께 따라 돌아가며 회전 효과가 분산됨',
        fixCue: '양쪽 좌골이나 골반뼈를 50:50 정면으로 고정한 뒤 갈비뼈만 나선형으로 돌려주세요.',
      },
      {
        fault: '몸통은 멈춘 채 팔만 과도하게 뒤로 넘겨 어깨 앞쪽이 눌림',
        fixCue: '팔은 가슴뼈 앞에 프레임처럼 고정하고 흉골과 시선이 함께 회전하는 범위만 움직이세요.',
      },
    ];
  }
  if (exercise.blockCategory === 'upper-body') {
    return [
      {
        fault: '당기거나 밀 때 어깨가 귀 쪽으로 으쓱 올라가 상부승모근이 과긴장됨',
        fixCue: '움직임 전 겨드랑이 아래 광배근·전거근을 먼저 연결하고 쇄골을 좌우로 넓게 유지하세요.',
      },
      {
        fault: '팔을 뻗을 때 흉곽이 앞으로 들리거나 손목이 뒤로 꺾임',
        fixCue: '손등과 전완을 평평한 일직선으로 맞추고 날숨에 갈비뼈 아랫단을 부드럽게 닫아주세요.',
      },
    ];
  }
  if (exercise.blockCategory === 'lower-body' || exercise.bodyPosition === 'standing') {
    return [
      {
        fault: '지지하는 무릎이 안쪽으로 모이거나 지지측 골반이 옆으로 빠짐',
        fixCue: '지지 발의 삼각 지점을 고르게 누르고 무릎이 두 번째 발가락 방향을 향하게 잠가주세요.',
      },
      {
        fault: '하체 움직임 중 상체가 흔들리거나 허리가 과도하게 젖혀짐',
        fixCue: '갈비뼈를 골반 위에 반듯하게 정렬하고 날숨에 복횡근을 연결한 채 움직이세요.',
      },
    ];
  }
  return [
    {
      fault: '복부 심부 수축 대신 목 앞쪽을 당기거나 어깨에 불필요한 힘이 들어감',
      fixCue: '턱과 쇄골 사이 주먹 하나 공간을 유지하고 날숨에 갈비뼈를 골반 방향으로 부드럽게 말아주세요.',
    },
    {
      fault: '호흡을 참으며 움직여 허리가 뜨거나 고관절 앞쪽만 뻐근해짐',
      fixCue: '동작의 가장 힘든 구간에서 길게 내쉬며 아랫배를 등 쪽으로 납작하게 연결하세요.',
    },
  ];
}

function buildStabilizersKo(
  exercise: Pick<PilatesExercise, 'blockCategory' | 'bodyPosition' | 'spinalPlanes'>,
): readonly string[] {
  if (exercise.blockCategory === 'plank' || exercise.bodyPosition === 'quadruped') {
    return ['전거근·하부승모근', '복횡근·복사근', '심부 경추 굴곡근'];
  }
  if (exercise.blockCategory === 'upper-body') {
    return ['하부승모근·전거근', '복횡근(흉곽 고정)', '회전근개 안정화근'];
  }
  if (exercise.blockCategory === 'lower-body' || exercise.bodyPosition === 'standing') {
    return ['중둔근(골반 수평 고정)', '복횡근·다열근', '발목·족궁 지지근'];
  }
  if (exercise.spinalPlanes.includes('lateral') || exercise.bodyPosition === 'side-lying') {
    return ['내외복사근·요방형근', '중둔근(측면 정렬)', '견갑 하강 안정화근'];
  }
  if (exercise.blockCategory === 'extension' || exercise.spinalPlanes.includes('extension')) {
    return ['복횡근(요추 보호)', '하부승모근·능형근', '대둔근 하부 섬유'];
  }
  return ['복횡근·골반저근', '척추 심부 다열근', '견갑대 하강 안정화근'];
}

export function getExerciseAnatomyInsight(
  exercise: PilatesExercise | WorldPilatesExercise,
): ExerciseAnatomyInsight {
  if ('anatomyInsight' in exercise && exercise.anatomyInsight) {
    return exercise.anatomyInsight;
  }

  const agonistsKo =
    exercise.targetMuscles.filter(Boolean).length > 0
      ? exercise.targetMuscles.filter(Boolean).slice(0, 4)
      : ['복횡근', '척추·골반 협응근'];

  return {
    agonistsKo,
    stabilizersKo: buildStabilizersKo(exercise),
    benefitsKo: buildBenefitsKo(exercise),
    springMechanicsKo: buildSpringMechanicsKo(exercise),
    commonFaultsKo: buildCommonFaultsKo(exercise),
    anatomyVisualZone: inferVisualZone(exercise),
  };
}

// =============================================================================
// 3. LEGACY 218 ENRICHMENT + NEW ATOMIC ARCHETYPES (~440 ATOMIC CORE)
// =============================================================================

function ensureThreeStudioCues(
  existingCues: readonly string[],
  exercise: Pick<PilatesExercise, 'breathPattern' | 'blockCategory' | 'bodyPosition' | 'springs'>,
): [string, string, string] {
  const cleaned = existingCues.map((c) => c.trim()).filter(Boolean);
  if (cleaned.length >= 3) {
    return [cleaned[0]!, cleaned[1]!, cleaned[2]!];
  }
  const fallbackPool: string[] = [
    exercise.breathPattern
      ? `${exercise.breathPattern} 리듬에 맞춰 흔들림 없이 제어해 주세요.`
      : '코로 깊게 마시고 내쉬는 숨에 갈비뼈를 부드럽게 닫아 중심을 세워요.',
    exercise.bodyPosition === 'supine'
      ? '어깨와 목 긴장을 내려놓고 천골의 무게를 지지면에 고르게 두세요.'
      : exercise.bodyPosition === 'standing'
        ? '지지 발바닥 삼각 지점을 고르게 누르고 양쪽 골반 높이를 나란히 맞춰요.'
        : '어깨가 귀로 올라가지 않게 겨드랑이 아래 힘을 연결하며 부드럽게 반복해요.',
    '반동 없이 시작과 돌아오는 구간 모두 같은 속도로 정교하게 마무리해요.',
  ];

  const out = [...cleaned];
  for (const line of fallbackPool) {
    if (out.length >= 3) break;
    if (!out.includes(line)) out.push(line);
  }
  return [out[0]!, out[1]!, out[2]!];
}

function inferLegacySchoolTag(exercise: PilatesExercise): PilatesSchoolTag {
  if (exercise.id.startsWith('ex-kr-')) return 'korean-studio';
  if (exercise.id.startsWith('ex-global-reformer-02')) return 'basi';
  if (exercise.id.startsWith('ex-global-reformer-03')) return 'balanced-body';
  if (exercise.id.startsWith('crawled-')) return 'classical';
  if (exercise.id.startsWith('expanded-')) {
    return /rowing|hundred|roll-up|elephant|long-stretch|swan|horseback|teaser|table|pull-up/i.test(
      exercise.id,
    )
      ? 'classical'
      : 'stott';
  }
  if (exercise.id.startsWith('original-')) return 'stott';
  return 'balanced-body';
}

function inferSpinalPlanes(
  exercise: Pick<PilatesExercise, 'nameKo' | 'nameEn' | 'blockCategory' | 'bodyPosition' | 'spinalPlanes'>,
): SpinalPlane[] {
  if (exercise.spinalPlanes && exercise.spinalPlanes.length > 0) {
    return [...exercise.spinalPlanes];
  }
  const text = `${exercise.nameKo} ${exercise.nameEn}`;
  const planes: SpinalPlane[] = [];
  if (/트위스트|로테이션|회전|쏘우|코크스크류|스네이크|twist|rotation|saw|corkscrew|snake/i.test(text)) {
    planes.push('rotation');
  }
  if (/측굴|사이드\s*벤드|사이드\s*싯업|사이드\s*오버|머메이드|side[\s-]*(?:bend|sit|over)|mermaid/i.test(text)) {
    planes.push('lateral');
  }
  if (
    exercise.blockCategory === 'extension' ||
    /스완|신전|그래스하퍼|브레스트|다운\s*스트레치|스프레드\s*이글|오프너|싱글\s*레그\s*킥|swan|extension|grasshopper|breaststroke|down[\s-]*stretch|spread[\s-]*eagle|opener|single[\s-]*leg[\s-]*kick|arch/i.test(
      text,
    )
  ) {
    planes.push('extension');
  }
  if (
    /롤|티저|잭나이프|숏\s*스파인|라운드|파이크|텐던|몽키|타워|부메랑|라커|씰|트리|스파인\s*스트레치|더블\s*레그\s*스트레치|넥\s*풀|세미서클|컨트롤\s*밸런스|roll|teaser|jack[\s-]*knife|short[\s-]*spine|round|pike|tendon|monkey|tower|boomerang|rocker|seal|tree|spine[\s-]*stretch|double[\s-]*leg[\s-]*stretch|neck[\s-]*pull|semi[\s-]*circle|control[\s-]*balance|pull[\s-]*up/i.test(
      text,
    )
  ) {
    planes.push('flexion');
  }
  if (planes.length === 0) {
    planes.push('neutral');
  }
  return planes;
}

function enrichExistingAtomicExercise(exercise: PilatesExercise): WorldPilatesExercise {
  const cues = ensureThreeStudioCues(exercise.cues, exercise);
  const youtube = resolveVerifiedYouTubeForExercise(exercise);
  const schoolTag = inferLegacySchoolTag(exercise);
  const spinalPlanes = inferSpinalPlanes(exercise);
  const props: PropType[] = exercise.props && exercise.props.length > 0 ? [...exercise.props] : ['none'];
  const normalized: PilatesExercise = {
    ...exercise,
    spinalPlanes,
    props,
    cues,
    youtube,
  };
  const anatomyInsight = getExerciseAnatomyInsight(normalized);

  return {
    ...normalized,
    anatomyInsight,
    tier: 'atomic',
    parentArchetypeId: exercise.id,
    schoolTag,
    variationKind: 'archetype',
  };
}

function buildNewAtomicExercise(seed: WorldAtomicSeed): WorldPilatesExercise {
  const id = `world-${seed.apparatus}-${seed.slug}`;
  const props: PropType[] = seed.props && seed.props.length > 0 ? [...seed.props] : ['none'];
  const box = seed.box ?? 'none';
  const footbar = seed.footbar ?? (seed.apparatus === 'reformer' ? 'high' : 'none');
  const headrest = seed.headrest ?? (seed.apparatus === 'reformer' && seed.bodyPosition === 'supine' ? 'up' : 'flat');
  const defaultDurationMin = seed.defaultDurationMin ?? (seed.level === '2.0' ? 4 : 3.5);
  const isUnilateral = Boolean(seed.isUnilateral);

  const layers = seed.layers ?? {
    easy: `${seed.nameKo} 입문 단계 — 가동 범위를 70%로 줄이고 지지면을 넓혀 안정된 정렬부터 익혀요.`,
    standard: `${seed.nameKo} 기본 수행 — ${seed.breathPattern} 리듬에 맞춰 좌우 균형 있게 8~10회 진행해요.`,
    hard: `${seed.nameKo} 심화 컨트롤 — 정점 2초 홀드 또는 느린 4박자 복귀로 심부 안정화 자극을 높여요.`,
  };

  const baseShape: PilatesExercise = {
    id,
    nameKo: seed.nameKo,
    nameEn: seed.nameEn,
    apparatus: seed.apparatus,
    requiredEquipment: seed.requiredEquipment ? [...seed.requiredEquipment] : undefined,
    props,
    blockCategory: seed.blockCategory,
    spinalPlanes: [...seed.spinalPlanes],
    bodyPosition: seed.bodyPosition,
    level: seed.level,
    defaultDurationMin,
    isUnilateral,
    springs: seed.springs,
    box,
    footbar,
    headrest,
    targetMuscles: [...seed.targetMuscles],
    breathPattern: seed.breathPattern,
    cues: [...seed.cues],
    precautions: seed.precautions,
    layers,
    youtube: resolveVerifiedYouTubeForExercise(
      {
        nameKo: seed.nameKo,
        nameEn: seed.nameEn,
        apparatus: seed.apparatus,
        blockCategory: seed.blockCategory,
        bodyPosition: seed.bodyPosition,
        props,
      },
      seed.videoHints ?? [],
    ),
    favoriteTag: seed.level === '2.0' ? 'burn-sculpt' : seed.blockCategory === 'cooldown' ? 'rehab-posture' : 'none',
    tempo: seed.tempo ?? (seed.level === '2.0' ? 'moderate-flow' : 'slow-precise'),
  };

  const anatomyInsight: ExerciseAnatomyInsight = {
    agonistsKo: [...seed.targetMuscles].slice(0, 4),
    stabilizersKo: buildStabilizersKo(baseShape),
    benefitsKo: seed.benefitsKo.slice(0, 3),
    springMechanicsKo: seed.springMechanicsKo ?? buildSpringMechanicsKo(baseShape),
    commonFaultsKo: seed.commonFaultsKo ?? buildCommonFaultsKo(baseShape),
    anatomyVisualZone: seed.visualZone,
  };

  return {
    ...baseShape,
    anatomyInsight,
    tier: 'atomic',
    parentArchetypeId: id,
    schoolTag: seed.schoolTag,
    variationKind: 'archetype',
  };
}

// =============================================================================
// 4. BIOMECHANICALLY GATED STUDIO VARIATION ENGINE (~720+ MEANINGFUL VARIATIONS)
// =============================================================================

function bumpLevel(level: DifficultyLevel): DifficultyLevel {
  if (level === '1.0') return '1.5';
  return '2.0';
}

function lowerLevel(level: DifficultyLevel): DifficultyLevel {
  if (level === '2.0') return '1.5';
  return '1.0';
}

function adjustSpringForVariation(
  apparatus: ApparatusType,
  currentSpring: string,
  kind: 'single-leg' | 'unilateral-arm' | 'light-control' | 'assist-heavier',
): string {
  if (apparatus === 'mat' || apparatus === 'barrel') return currentSpring;

  if (apparatus === 'reformer') {
    if (kind === 'single-leg') {
      if (/2R\s*1B/i.test(currentSpring)) return '1R 1B';
      if (/^2R\b/i.test(currentSpring)) return '1R 1B';
      if (/강사가/.test(currentSpring)) return '1R 1B (단측 경량 세팅)';
      return currentSpring;
    }
    if (kind === 'unilateral-arm') {
      if (/1R\s*1B/i.test(currentSpring)) return '1R';
      if (/^1R\b/i.test(currentSpring)) return '1B';
      if (/강사가/.test(currentSpring)) return '1B (원암 경량 세팅)';
      return currentSpring;
    }
    if (kind === 'light-control') {
      if (/2R\s*1B/i.test(currentSpring)) return '1R 1B';
      if (/^2R\b/i.test(currentSpring)) return '1R 1B';
      if (/1R\s*1B/i.test(currentSpring)) return '1R';
      if (/^1R\b/i.test(currentSpring)) return '1B';
      if (/강사가/.test(currentSpring)) return '1B (라이트 코어 제어)';
      return '1B';
    }
    if (kind === 'assist-heavier') {
      if (/^1B\b/i.test(currentSpring)) return '1R';
      if (/^1R\b/i.test(currentSpring)) return '1R 1B';
      if (/1R\s*1B/i.test(currentSpring)) return '2R';
      if (/강사가/.test(currentSpring)) return '1R 1B (지지 보조 강화)';
      return currentSpring;
    }
  }

  if (apparatus === 'chair') {
    if (kind === 'light-control') {
      if (/2\s*Heavy/i.test(currentSpring)) return '1 Heavy + 1 Light';
      if (/1\s*Heavy\s*\+\s*1\s*Medium/i.test(currentSpring)) return '1 Heavy';
      if (/1\s*Heavy\s*\+\s*1\s*Light/i.test(currentSpring)) return '1 Medium + 1 Light';
      if (/강사가/.test(currentSpring)) return '1 Medium (라이트 제어)';
      return '1 Medium';
    }
    if (kind === 'assist-heavier') {
      if (/1\s*Medium/i.test(currentSpring) && !/Heavy/i.test(currentSpring)) return '1 Heavy + 1 Light';
      if (/1\s*Heavy\s*\+\s*1\s*Light/i.test(currentSpring)) return '1 Heavy + 1 Medium';
      if (/1\s*Heavy\s*\+\s*1\s*Medium/i.test(currentSpring)) return '2 Heavy';
      if (/강사가/.test(currentSpring)) return '1 Heavy + 1 Medium (보조 강화)';
      return currentSpring;
    }
  }

  return currentSpring;
}

interface VariationRule {
  readonly kind: Exclude<VariationKind, 'archetype' | 'custom-remix'>;
  readonly suffixId: string;
  readonly matches: (base: WorldPilatesExercise) => boolean;
  readonly transform: (base: WorldPilatesExercise) => WorldPilatesExercise;
}

function mergeProps(existing: readonly PropType[], added: PropType): PropType[] {
  const filtered = existing.filter((p) => p !== 'none' && p !== added);
  return [added, ...filtered];
}

const VARIATION_RULES: readonly VariationRule[] = [
  // 1. Mini-Ball Adductor / Thoracic / Lumbar Integration
  {
    kind: 'prop-mini-ball',
    suffixId: 'var-miniball',
    matches: (b) =>
      !b.props.includes('mini-ball') &&
      b.box === 'none' &&
      !/미니볼|mini[\s-]*ball|bosu|보수|폼롤러|foam[\s-]*roller|짐볼|fitness[\s-]*ball/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ) &&
      ((b.bodyPosition === 'supine' &&
        ['footwork', 'bridging', 'core', 'warmup', 'feet-in-straps'].includes(b.blockCategory)) ||
        (b.bodyPosition === 'seated' && ['core', 'warmup'].includes(b.blockCategory)) ||
        (b.bodyPosition === 'side-lying' && b.blockCategory === 'lower-body')),
    transform: (base) => {
      const placementKo =
        base.bodyPosition === 'seated'
          ? '양무릎 사이나 천골 뒤에 미니볼을 끼워'
          : base.bodyPosition === 'side-lying'
            ? '양발목 사이에 미니볼을 가볍게 감싸'
            : '양무릎 안쪽에 미니볼을 30% 탄력으로 안아';
      const props = mergeProps(base.props, 'mini-ball');
      const next: WorldPilatesExercise = {
        ...base,
        id: `${base.id}--var-miniball`,
        nameKo: `${base.nameKo} · 미니볼 내전근`,
        nameEn: `${base.nameEn} with Mini-Ball`,
        props,
        targetMuscles: [...new Set(['내전근', '골반저근', ...base.targetMuscles])].slice(0, 4),
        cues: [
          `${placementKo} 허벅지 안쪽과 골반저근 중심선을 먼저 깨워주세요.`,
          base.cues[0] ?? '호흡을 내쉬며 코어 지지력을 일정하게 유지해요.',
          '볼을 쥐어짜지 말고 30% 일정한 탄력을 끝까지 유지하며 정렬을 지켜요.',
        ],
        layers: {
          easy: '미니볼 공기압을 60%로 부드럽게 조절해 가볍게 안는 감각부터 익혀요.',
          standard: `${placementKo} 8~10회 일정한 내전 압력을 유지하며 진행해요.`,
          hard: '각 반복 정점에서 미니볼을 3회 미세하게 조이는 내전 펄스를 추가해요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          agonistsKo: [...new Set(['내전근', ...base.anatomyInsight.agonistsKo])].slice(0, 4),
          stabilizersKo: [...new Set(['골반저근·복횡근', ...base.anatomyInsight.stabilizersKo])].slice(0, 3),
          benefitsKo: [
            '미니볼 탄성 피드백으로 허벅지 안쪽 내전근·골반저근 동시 활성화',
            base.anatomyInsight.benefitsKo[0] ?? '중심축 정렬 감각 강화',
            '무릎 안쪽·바깥쪽 흔들림 방지에 도움',
          ],
          springMechanicsKo: `${base.anatomyInsight.springMechanicsKo} 여기에 미니볼 등척성 압박이 내전근-복부 중심선 연결을 배가합니다.`,
          commonFaultsKo: [
            base.anatomyInsight.commonFaultsKo[0],
            {
              fault: '미니볼을 지나치게 세게 눌러 고관절 앞쪽이나 어깨까지 긴장이 번짐',
              fixCue: '공이 계란처럼 터지지 않을 30% 부드러운 압력만 유지하며 길게 호흡하세요.',
            },
          ],
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'prop-mini-ball',
      };
      return next;
    },
  },

  // 2. Magic Circle Resistance
  {
    kind: 'prop-magic-circle',
    suffixId: 'var-circle',
    matches: (b) =>
      !b.props.includes('magic-circle') &&
      b.box === 'none' &&
      !/써클링|서클링|magic[\s-]*circle|bosu|보수|폼롤러|foam[\s-]*roller|짐볼|jump/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ) &&
      ((b.bodyPosition === 'supine' &&
        ['footwork', 'bridging', 'core', 'feet-in-straps'].includes(b.blockCategory)) ||
        (b.bodyPosition === 'seated' && ['core', 'upper-body'].includes(b.blockCategory)) ||
        (b.bodyPosition === 'standing' &&
          b.blockCategory === 'lower-body' &&
          !/split|arabesque|attitude|pigeon|ballet|lunge|going|mountain|step|frog/i.test(b.nameEn))),
    transform: (base) => {
      const props = mergeProps(base.props, 'magic-circle');
      const gripKo =
        base.blockCategory === 'upper-body' || base.bodyPosition === 'standing'
          ? '양손바닥 사이에 써클링을 쥐고 가슴 앞에서 지그시 누르며'
          : '무릎 위 허벅지 안쪽(또는 발목 사이)에 써클링을 끼워';
      return {
        ...base,
        id: `${base.id}--var-circle`,
        nameKo: `${base.nameKo} · 써클링 저항`,
        nameEn: `${base.nameEn} with Magic Circle`,
        props,
        level: base.level === '1.0' ? '1.5' : base.level,
        targetMuscles: [
          ...new Set([
            base.blockCategory === 'upper-body' ? '대흉근·전거근' : '내전근',
            ...base.targetMuscles,
          ]),
        ].slice(0, 4),
        cues: [
          `${gripKo} 탄성 저항을 일정하게 유지한 채 시작해요.`,
          base.cues[0] ?? '내쉬는 숨에 복부 코어와 목표 근육을 동시에 연결해요.',
          '돌아올 때 링이 튕겨 나가지 않게 탄성을 끝까지 버티며 천천히 풀어줘요.',
        ],
        layers: {
          easy: '써클링 압박 강도를 30% 가볍게 유지해 정렬 감각만 먼저 챙겨요.',
          standard: '내쉬는 구간마다 써클링을 부드럽게 압박하며 8~10회 컨트롤해요.',
          hard: '써클링 압박을 50% 유지한 채 동작 끝 지점에서 2초 등척성 홀드를 더해요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          benefitsKo: [
            '써클링 탄성 저항으로 내전근·전거근 등척성 근력 동시 강화',
            base.anatomyInsight.benefitsKo[0] ?? '코어 안정화 향상',
            '좌우 대칭 압박 피드백으로 몸통 중심축 인지력 상승',
          ],
          springMechanicsKo: `${base.anatomyInsight.springMechanicsKo} 써클링의 양방향 저항이 목표 근육의 지속 긴장을 높여 줍니다.`,
          commonFaultsKo: [
            base.anatomyInsight.commonFaultsKo[0],
            {
              fault: '써클링을 쥔 손목이 꺾이거나 무릎 관절 뼈에 패드가 직접 닿음',
              fixCue: '손바닥 밑동이나 허벅지 근육 부위에 패드를 정확히 대고 부드럽게 압박하세요.',
            },
          ],
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'prop-magic-circle',
      };
    },
  },

  // 3. Loop Band Glute Medius Abduction
  {
    kind: 'prop-loop-band',
    suffixId: 'var-loopband',
    matches: (b) =>
      !b.props.includes('loop-band') &&
      b.box === 'none' &&
      ['footwork', 'bridging', 'lower-body'].includes(b.blockCategory) &&
      ['supine', 'standing', 'side-lying', 'quadruped'].includes(b.bodyPosition) &&
      !/루프밴드|loop[\s-]*band|세라밴드|band|jump|점프|split|스플릿|ballet|발레|pigeon|피전|stretch|스트레치|strap|스트랩|써클링|circle/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const props = mergeProps(base.props, 'loop-band');
      return {
        ...base,
        id: `${base.id}--var-loopband`,
        nameKo: `${base.nameKo} · 루프밴드 중둔근`,
        nameEn: `${base.nameEn} with Loop Band`,
        props,
        level: base.level === '1.0' ? '1.5' : base.level,
        targetMuscles: [...new Set(['중둔근', '소둔근', ...base.targetMuscles])].slice(0, 4),
        cues: [
          '무릎 위 허벅지에 루프밴드를 걸고 밴드가 헐거워지지 않게 바깥으로 가볍게 밀어 유지해요.',
          base.cues[0] ?? '무릎이 안쪽으로 모이지 않게 엉덩이 바깥 중둔근을 단단히 켜주세요.',
          '돌아오는 구간에서도 밴드 탄성에 끌려 무릎이 모이지 않게 천천히 제어해요.',
        ],
        layers: {
          easy: '가장 부드러운 라이트 루프밴드로 무릎 정렬 피드백만 가볍게 느껴요.',
          standard: '미디엄 루프밴드를 걸고 엉덩이 바깥 텐션을 끝까지 유지하며 10회 진행해요.',
          hard: '매 반복 정점에서 무릎을 바깥으로 2회 밀어내는 외전 펄스를 추가해요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          agonistsKo: [...new Set(['중둔근', ...base.anatomyInsight.agonistsKo])].slice(0, 4),
          benefitsKo: [
            '루프밴드 외전 저항으로 중둔근과 힙 외측 라인 집중 활성화',
            '무릎 안쪽 무너짐을 방지하는 하체 정렬 습관 형성',
            base.anatomyInsight.benefitsKo[0] ?? '하체 근력 지구력 향상',
          ],
          springMechanicsKo: `${base.anatomyInsight.springMechanicsKo} 루프밴드 외전 탄성이 더해져 무릎 정렬과 중둔근 개입을 즉각 강화합니다.`,
          anatomyVisualZone: 'glutes',
          commonFaultsKo: [
            base.anatomyInsight.commonFaultsKo[0],
            {
              fault: '밴드 장력에 져서 무릎이 안쪽으로 말리거나 발 바깥 날이 들림',
              fixCue: '엄지발볼을 바닥·풋바에 단단히 붙인 채 허벅지 바깥으로 밴드를 고르게 밀어내세요.',
            },
          ],
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'prop-loop-band',
      };
    },
  },

  // 4. Single-Leg Unilateral Progression (Intermediate / Advanced)
  {
    kind: 'single-leg',
    suffixId: 'var-single-leg',
    matches: (b) =>
      !b.isUnilateral &&
      ['footwork', 'bridging', 'plank', 'feet-in-straps'].includes(b.blockCategory) &&
      ['supine', 'quadruped', 'prone', 'standing', 'seated'].includes(b.bodyPosition) &&
      !/싱글|원레그|한\s*다리|교대|교차|시저스|바이시클|러닝|프랜싱|프로그|점프|스플릿|single|one[\s-]*leg|alternat|scissors|bicycle|running|prancing|frog|jump|split|arabesque|control/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const nextSprings = adjustSpringForVariation(base.apparatus, base.springs, 'single-leg');
      const nextLevel = bumpLevel(base.level);
      const nextBase = { ...base, springs: nextSprings, isUnilateral: true, level: nextLevel };
      return {
        ...nextBase,
        id: `${base.id}--var-single-leg`,
        nameKo: `${base.nameKo} · 싱글 레그 심화`,
        nameEn: `${base.nameEn} (Single-Leg)`,
        cues: [
          '한 다리를 테이블탑 또는 사선으로 길게 띄워 양쪽 골반 높이가 수평을 지키게 세팅해요.',
          base.cues[0] ?? '지지 다리와 복사근 항회전 힘으로 몸통이 한쪽으로 기울지 않게 제어해요.',
          '좌우 같은 횟수로 진행하며 약한 쪽 다리의 정렬과 리듬을 더 정교하게 챙겨주세요.',
        ],
        layers: {
          easy: '반대쪽 발뒤꿈치만 살짝 띄우는 킥스탠드 지지로 편측 감각부터 익혀요.',
          standard: '한 다리를 테이블탑으로 유지하며 좌우 각각 8회 균형 있게 컨트롤해요.',
          hard: '띄운 다리를 천장으로 길게 뻗어 긴 지렛대 항회전 코어 부하까지 끌어올려요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          stabilizersKo: ['외복사근·내복사근(항회전)', '지지측 중둔근', '복횡근'],
          benefitsKo: [
            '단측 지지 전환으로 좌우 근력 비대칭 인지 및 균형 보완',
            '골반 기울어짐을 막는 복사근 항회전 코어 안정화 극대화',
            base.anatomyInsight.benefitsKo[0] ?? '하체 및 코어 지구력 강화',
          ],
          springMechanicsKo:
            base.apparatus === 'reformer' && nextSprings !== base.springs
              ? `양발 대비 스프링을 ${nextSprings}로 낮춰 편측 관절 부하를 알맞게 조절하고 골반 수평 제어 비중을 높입니다.`
              : `${buildSpringMechanicsKo(nextBase)} 단측 지지로 전환되어 항회전 코어 요구량이 크게 상승합니다.`,
          commonFaultsKo: [
            {
              fault: '한 다리를 띄우는 순간 반대쪽 골반이 툭 떨어지거나 몸통이 회전함',
              fixCue: '양쪽 골반뼈(ASIS) 위에 물컵을 올려둔 듯 수평 높이를 끝까지 지켜주세요.',
            },
            base.anatomyInsight.commonFaultsKo[0],
          ],
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'single-leg',
      };
    },
  },

  // 5. Light-Spring Core Control (Authentic Pilates Reformer / Chair Mechanics)
  {
    kind: 'spring-light-control',
    suffixId: 'var-light-spring',
    matches: (b) =>
      (b.apparatus === 'reformer' || b.apparatus === 'chair') &&
      ['plank', 'lower-body', 'core', 'bridging'].includes(b.blockCategory) &&
      b.box === 'none' &&
      !/고정|fixed|라이트|light|1Y|^1B$|헤비|heavy|플리에|릴레베|아라베스크|애티튜드|코펜하겐|불가리안|피전|스트레치|plie|releve|attitude|copenhagen|bulgarian|pigeon|stretch|jump/i.test(
        `${b.springs} ${b.nameKo} ${b.nameEn}`,
      ) &&
      /(?:R|Heavy|Medium|강사가)/i.test(b.springs),
    transform: (base) => {
      const nextSprings = adjustSpringForVariation(base.apparatus, base.springs, 'light-control');
      const nextLevel = bumpLevel(base.level);
      return {
        ...base,
        id: `${base.id}--var-light-spring`,
        nameKo: `${base.nameKo} · 라이트 스프링 코어 제어`,
        nameEn: `${base.nameEn} (Light-Spring Control)`,
        springs: nextSprings,
        level: nextLevel,
        tempo: 'slow-precise',
        cues: [
          `스프링을 ${nextSprings}로 가볍게 낮춰 기구 보조를 줄이고 심부 코어 제어력을 깨워요.`,
          '캐리지나 페달이 탄성에 흔들리지 않게 3초씩 느리고 매끄럽게 밀고 당겨주세요.',
          base.cues[1] ?? '아랫배와 호흡 연결을 끝까지 유지하며 관절이 아닌 중심축으로 움직여요.',
        ],
        layers: {
          easy: '이동 범위를 절반으로 줄여 가벼운 스프링의 흔들림 제어 감각부터 익혀요.',
          standard: `${nextSprings} 경량 세팅에서 3초 느린 템포로 8회 정밀하게 컨트롤해요.`,
          hard: '끝 지점에서 캐리지·페달을 2초 완전히 정지시켜 심부 안정화근을 극대화해요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          stabilizersKo: ['복횡근·다열근(심부 제동)', '전거근·골반저근', ...base.anatomyInsight.stabilizersKo.slice(0, 1)],
          benefitsKo: [
            '스프링 보조를 줄여 순수 파워하우스·심부 안정화근 제어력 극대화',
            '반동 없는 편심성 브레이크 감각과 정교한 정렬 완성',
            base.anatomyInsight.benefitsKo[0] ?? '중·상급 기구 컨트롤 숙련',
          ],
          springMechanicsKo: `스프링을 ${nextSprings}로 낮추면 기구의 복귀·체중 보조가 줄어들어 복횡근과 안정화근이 스스로 움직임을 제어해야 하는 심화 원리입니다.`,
          commonFaultsKo: [
            {
              fault: '가벼운 스프링에서 속도가 빨라지며 캐리지나 페달이 스토퍼에 쿵 부딪힘',
              fixCue: '끝 지점 2cm 앞에서 아랫배 힘으로 부드럽게 브레이크를 걸어 무음으로 전환하세요.',
            },
            base.anatomyInsight.commonFaultsKo[0],
          ],
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'spring-light-control',
      };
    },
  },

  // 6. Thoracic Rotation Layer
  {
    kind: 'rotation-layer',
    suffixId: 'var-rotation',
    matches: (b) =>
      !b.spinalPlanes.includes('rotation') &&
      ['core', 'upper-body', 'lower-body', 'cooldown'].includes(b.blockCategory) &&
      ['seated', 'kneeling', 'standing', 'supine'].includes(b.bodyPosition) &&
      !/트위스트|로테이션|회전|크리스|쏘우|코크|롤링|라커|씰|크랩|오버헤드|점프|프로그|피전|피겨|twist|rotation|criss|saw|corkscrew|rolling|rocker|seal|crab|overhead|jump|frog|pigeon|figure|split|short[\s-]*spine/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const nextLevel = base.level === '1.0' ? '1.5' : base.level;
      return {
        ...base,
        id: `${base.id}--var-rotation`,
        nameKo: `${base.nameKo} · 흉추 로테이션 결합`,
        nameEn: `${base.nameEn} with Thoracic Rotation`,
        spinalPlanes: [...new Set<SpinalPlane>([...base.spinalPlanes, 'rotation'])],
        isUnilateral: true,
        level: nextLevel,
        targetMuscles: [...new Set(['외복사근', '내복사근', ...base.targetMuscles])].slice(0, 4),
        cues: [
          '기본 동작의 정점에서 양쪽 골반을 고정한 채 흉골과 갈비뼈를 부드럽게 회전해요.',
          '팔만 넘기지 말고 시선과 가슴뼈가 함께 돌아가는 나선형 흉추 움직임을 느껴요.',
          '내쉬며 회전하고 들이마시며 정수리가 길어지게 중앙으로 돌아와 좌우 대칭을 맞춰요.',
        ],
        layers: {
          easy: '회전 각도를 15~20도 작게 유지해 골반이 따라 돌지 않는 분리 감각부터 익혀요.',
          standard: '기본 동작 끝에 좌우 교대 흉추 회전을 결합해 8~10회 유려하게 연결해요.',
          hard: '회전 정점에서 2초 숨을 더 내쉬며 복사근 깊은 수축을 유지한 뒤 복귀해요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          agonistsKo: [...new Set(['외복사근', '내복사근', ...base.anatomyInsight.agonistsKo])].slice(0, 4),
          benefitsKo: [
            '기본 움직임에 흉추 회전 가동성과 복사근 대각선 연결을 동시 결합',
            '시퀀스 내 부족하기 쉬운 회전 평면 척추 밸런스 보강',
            base.anatomyInsight.benefitsKo[0] ?? '몸통 중심축 제어력 향상',
          ],
          anatomyVisualZone: 'lateral',
          commonFaultsKo: [
            {
              fault: '흉추 회전 시 골반이 함께 따라 돌아가 허리에 비틀림이 집중됨',
              fixCue: '양쪽 골반뼈와 무릎 정면을 닻처럼 고정한 상태에서 갈비뼈 윗부분만 돌려주세요.',
            },
            base.anatomyInsight.commonFaultsKo[0],
          ],
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'rotation-layer',
      };
    },
  },

  // 7. Single-Arm Anti-Rotation (Upper Body)
  {
    kind: 'unilateral-arm',
    suffixId: 'var-one-arm',
    matches: (b) =>
      !b.isUnilateral &&
      b.blockCategory === 'upper-body' &&
      ['seated', 'kneeling', 'standing', 'supine'].includes(b.bodyPosition) &&
      !/원암|한\s*팔|사이드|트위스트|복싱|소드|롤백\s*바|푸쉬스루|푸시스루|롱\s*백|one[\s-]*arm|single[\s-]*arm|sword|boxing|side|twist|rotation|bar|long[\s-]*back|hanging/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const nextSprings = adjustSpringForVariation(base.apparatus, base.springs, 'unilateral-arm');
      const nextLevel = bumpLevel(base.level);
      return {
        ...base,
        id: `${base.id}--var-one-arm`,
        nameKo: `${base.nameKo} · 원암 항회전 심화`,
        nameEn: `${base.nameEn} (Single-Arm Anti-Rotation)`,
        isUnilateral: true,
        springs: nextSprings,
        level: nextLevel,
        targetMuscles: [...new Set(['외복사근', ...base.targetMuscles])].slice(0, 4),
        cues: [
          '한 팔로만 움직이면서 반대쪽 어깨와 갈비뼈가 따라 회전하지 않게 복사근으로 잠가요.',
          base.cues[0] ?? '겨드랑이 아래 광배근을 먼저 연결해 어깨가 귀로 올라가지 않게 유지해요.',
          '좌우 각각 8~10회 진행하며 평소 덜 쓰던 약한 쪽 팔의 견갑 안정성을 집중 점검해요.',
        ],
        layers: {
          easy: '반대쪽 손끝을 갈비뼈 옆에 대고 몸통이 돌아가지 않는지 촉각으로 확인하며 진행해요.',
          standard: '좌우 각각 8~10회 정면 축을 흔들림 없이 유지하며 컨트롤해요.',
          hard: '반대쪽 팔을 앞으로 길게 뻗어 고정한 채 진행해 항회전 코어 부하를 끌어올려요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          stabilizersKo: ['외복사근·내복사근(항회전)', '하부승모근·전거근', '복횡근'],
          benefitsKo: [
            '단측 팔 저항에 맞서는 항회전 코어와 좌우 어깨 균형 동시 강화',
            '일상에서 생기기 쉬운 좌우 상체 근력 비대칭 보완',
            base.anatomyInsight.benefitsKo[0] ?? '어깨 안정화 및 팔 라인 정리',
          ],
          springMechanicsKo:
            base.apparatus === 'reformer' && nextSprings !== base.springs
              ? `단측 작업에 맞춰 ${nextSprings} 경량 세팅으로 전환해 어깨 무리는 줄이고 복사근 항회전 자극을 선명하게 높입니다.`
              : `${base.anatomyInsight.springMechanicsKo} 한 팔 단독 부하로 전환되어 몸통 회전 억제 코어가 강하게 켜집니다.`,
          commonFaultsKo: [
            {
              fault: '한 팔을 당길 때 어깨가 뒤로 빠지며 상체가 한쪽으로 회전함',
              fixCue: '양쪽 쇄골과 골반이 정면 벽을 그대로 마주 보게 고정한 채 팔만 움직이세요.',
            },
            base.anatomyInsight.commonFaultsKo[0],
          ],
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'unilateral-arm',
      };
    },
  },

  // 8. End-Range Micro-Pulse Endurance
  {
    kind: 'tempo-pulse',
    suffixId: 'var-pulse',
    matches: (b) =>
      ['footwork', 'bridging', 'lower-body', 'core', 'upper-body', 'extension'].includes(
        b.blockCategory,
      ) &&
      !/펄스|비츠|헌드레드|롤링|라커|씰|크랩|점프|스위밍|브리딩|스트레치|pulse|beat|hundred|roll|rocker|seal|crab|jump|swimming|breathing|stretch|wave/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => ({
      ...base,
      id: `${base.id}--var-pulse`,
      nameKo: `${base.nameKo} · 엔드레인지 3펄스`,
      nameEn: `${base.nameEn} (End-Range 3-Pulse)`,
      level: bumpLevel(base.level),
      tempo: 'athletic-burn',
      cues: [
        '목표 근육이 가장 선명하게 켜지는 정점 구간에서 2cm 폭으로 리듬감 있게 3회 펄스해요.',
        '펄스하는 동안 반동으로 관절을 튕기지 말고 호흡을 짧게 세 번 나누어 내쉬어요.',
        base.cues[0] ?? '중립 척추와 어깨 안정화를 끝까지 유지하며 근육 지구력을 끌어올려요.',
      ],
      layers: {
        easy: '3펄스 대신 부드러운 2펄스로 짧게 호흡하며 정렬을 지켜요.',
        standard: '정점 2cm 범위에서 3회 제어 펄스 후 천천히 시작 자세로 복귀해요.',
        hard: '마지막 8회차에 연속 8펄스를 더해 강렬한 근지구력 피니시로 마무리해요.',
      },
      anatomyInsight: {
        ...base.anatomyInsight,
        benefitsKo: [
          '정점 근육 긴장 시간(TUT)을 늘려 선명한 근지구력·탄력 자극 형성',
          base.anatomyInsight.benefitsKo[0] ?? '목표 근육 집중 활성화',
          '짧은 리듬 호흡과 미세 범위 관절 제어력 향상',
        ],
        commonFaultsKo: [
          {
            fault: '펄스 속도가 빨라지며 반동으로 관절을 흔들고 코어 고정이 풀림',
            fixCue: '움직임 폭을 2cm 이내로 작게 유지하고 근육 수축으로만 정교하게 밀어내세요.',
          },
          base.anatomyInsight.commonFaultsKo[0],
        ],
      },
      tier: 'variation',
      parentArchetypeId: base.id,
      variationKind: 'tempo-pulse',
    }),
  },

  // 9. 5-Second Isometric Breath Hold
  {
    kind: 'isometric-hold',
    suffixId: 'var-hold',
    matches: (b) =>
      ['bridging', 'core', 'plank', 'lower-body', 'extension', 'upper-body'].includes(
        b.blockCategory,
      ) &&
      !/홀드|롤링|라커|씰|크랩|점프|비츠|펄스|스트레치|웨이브|스위치|hold|roll|rocker|seal|crab|jump|beat|pulse|stretch|wave|switch/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => ({
      ...base,
      id: `${base.id}--var-hold`,
      nameKo: `${base.nameKo} · 5초 정점 홀드`,
      nameEn: `${base.nameEn} (5-Sec Isometric Hold)`,
      tempo: 'slow-precise',
      cues: [
        '동작 정점에서 자세를 완전히 멈추고 코로 마시고 입으로 길게 내쉬며 5초간 유지해요.',
        '멈춰 있는 동안 숨을 참지 말고 날숨마다 심부 복횡근을 한 번 더 단단히 조여줘요.',
        '홀드가 끝난 뒤에도 힘을 툭 풀지 말고 4박자에 걸쳐 천천히 시작 자세로 돌아와요.',
      ],
      layers: {
        easy: '정점 홀드 시간을 3초(1호흡)로 설정해 정렬 흔들림이 없는지 점검해요.',
        standard: '정점에서 5초(2호흡) 등척성 유지 후 느리게 복귀하는 패턴을 6회 반복해요.',
        hard: '정점 5초 홀드 중 팔·발목 미세 움직임을 더해 심부 안정화 지구력을 극대화해요.',
      },
      anatomyInsight: {
        ...base.anatomyInsight,
        benefitsKo: [
          '등척성 정점 유지로 숨은 보상 패턴을 차단하고 심부 안정화근 깊이 강화',
          '호흡을 멈추지 않고 코어 긴장을 유지하는 호흡 제어력 향상',
          base.anatomyInsight.benefitsKo[0] ?? '정확한 정렬 지구력 확립',
        ],
        commonFaultsKo: [
          {
            fault: '5초 버티는 동안 숨을 참아 얼굴과 어깨에 과도한 힘이 몰림',
            fixCue: '스- 하고 가는 숨을 끝까지 내쉬며 흉곽을 닫아 복부 깊숙한 지지력에 집중하세요.',
          },
          base.anatomyInsight.commonFaultsKo[0],
        ],
      },
      tier: 'variation',
      parentArchetypeId: base.id,
      variationKind: 'isometric-hold',
    }),
  },

  // 10. Supported Beginner Prep / Regression (for Progression Trees!)
  {
    kind: 'regression-supported',
    suffixId: 'var-prep',
    matches: (b) =>
      (b.level === '1.5' || b.level === '2.0') &&
      !/프렙|준비|입문|보조|기초|prep|preparation|supported|basic/i.test(`${b.nameKo} ${b.nameEn}`),
    transform: (base) => {
      const nextLevel = lowerLevel(base.level);
      const nextSprings =
        base.blockCategory === 'plank' || (base.apparatus === 'chair' && base.bodyPosition === 'standing')
          ? adjustSpringForVariation(base.apparatus, base.springs, 'assist-heavier')
          : base.springs;
      return {
        ...base,
        id: `${base.id}--var-prep`,
        nameKo: `${base.nameKo} · 입문 지지 프렙`,
        nameEn: `${base.nameEn} (Supported Prep)`,
        level: nextLevel,
        springs: nextSprings,
        tempo: 'slow-precise',
        cues: [
          '가동 범위를 60~70%로 줄이고 무릎 굽힘·지지면 확대로 초보자도 안전하게 진입해요.',
          base.layers.easy || base.cues[0] || '호흡과 중립 척추 정렬을 최우선으로 천천히 움직여요.',
          '불편한 관절 압박 없이 목표 근육이 부드럽게 켜지는 지점까지만 정확히 반복해요.',
        ],
        layers: {
          easy: '지지면을 최대한 넓히고 호흡과 시작 자세 정렬만 5회 집중 연습해요.',
          standard: '축소된 지렛대(무릎 굽힘 또는 보조 스프링)로 8회 흔들림 없이 완성해요.',
          hard: '정렬이 완벽히 안정되면 본 동작(원자 아키타입)으로 자연스럽게 단계를 올려요.',
        },
        anatomyInsight: {
          ...base.anatomyInsight,
          benefitsKo: [
            '초보자나 컨디션 저하일에도 무리 없이 본 동작의 핵심 패턴을 학습',
            '관절 부담을 줄이면서 심부 코어와 정렬 기초를 탄탄히 구축',
            base.anatomyInsight.benefitsKo[0] ?? '안전한 단계적 근력 향상',
          ],
          springMechanicsKo:
            nextSprings !== base.springs
              ? `스프링을 ${nextSprings}로 조정해 체중·캐리지 지지 보조를 높여 초보자도 안정적으로 본 동작 패턴을 익히게 돕습니다.`
              : `${base.anatomyInsight.springMechanicsKo} 지렛대를 짧게 줄여 관절 부담 없이 정확한 근육 패턴을 익힙니다.`,
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'regression-supported',
      };
    },
  },

  // 11. Foam Roller Mat Balance Variation
  {
    kind: 'prop-foam-roller',
    suffixId: 'var-roller',
    matches: (b) =>
      b.apparatus === 'mat' &&
      !b.props.includes('foam-roller') &&
      ['warmup', 'bridging', 'core', 'extension', 'plank'].includes(b.blockCategory) &&
      ['supine', 'prone', 'quadruped'].includes(b.bodyPosition) &&
      !/폼롤러|롤러|보수|미니볼|써클링|짐볼|슬라이더|롤링|라커|씰|크랩|잭나이프|부메랑|컨트롤|롤\s*오버|roller|bosu|ball|circle|slider|rolling|rocker|seal|crab|jack|boomerang|control|roll[\s-]*over/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const props = mergeProps(base.props, 'foam-roller');
      const setupKo =
        base.blockCategory === 'bridging'
          ? '양발 아치 아래 가로로 폼롤러를 두고'
          : base.bodyPosition === 'supine'
            ? '척추 세로선 아래 폼롤러를 받치고'
            : '전완 또는 정강이 아래 폼롤러를 안정적으로 얹고';
      return {
        ...base,
        id: `${base.id}--var-roller`,
        nameKo: `${base.nameKo} · 폼롤러 밸런스`,
        nameEn: `${base.nameEn} on Foam Roller`,
        props,
        level: bumpLevel(base.level),
        cues: [
          `${setupKo} 몸통이 좌우로 구르지 않게 중심축을 먼저 고정해요.`,
          base.cues[0] ?? '내쉬는 숨에 복횡근과 다열근을 깊게 연결해 미세 흔들림을 제어해요.',
          '동작 속도보다 롤러 위에서 수평 균형을 지키는 정교함에 집중해요.',
        ],
        anatomyInsight: {
          ...base.anatomyInsight,
          stabilizersKo: ['다열근·복횡근(고유수용성 안정화)', '견갑대·골반 지지근', '내외복사근'],
          benefitsKo: [
            '폼롤러 불안정 지지면에서 깊은 척추 주변 다열근·복횡근 자동 활성화',
            '좌우 체중 편향과 균형 감각 즉각 인지',
            base.anatomyInsight.benefitsKo[0] ?? '코어 안정화 심화',
          ],
          springMechanicsKo:
            '폼롤러의 좁은 원통 지지면이 미세 흔들림을 유도해 매트 평면 대비 심부 안정화근 동원율을 크게 높입니다.',
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'prop-foam-roller',
      };
    },
  },

  // 12. Theraband Elastic Resistance Variation
  {
    kind: 'prop-theraband',
    suffixId: 'var-band',
    matches: (b) =>
      ['mat', 'barrel', 'chair'].includes(b.apparatus) &&
      !b.props.includes('theraband') &&
      ['upper-body', 'core', 'warmup', 'cooldown'].includes(b.blockCategory) &&
      ['seated', 'supine', 'standing'].includes(b.bodyPosition) &&
      !/밴드|볼|링|롤러|보수|덤벨|슬라이더|블록|band|ball|circle|roller|bosu|dumbbell|slider|block|rolling|rocker|seal|crab/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const props = mergeProps(base.props, 'theraband');
      return {
        ...base,
        id: `${base.id}--var-band`,
        nameKo: `${base.nameKo} · 세라밴드 탄성`,
        nameEn: `${base.nameEn} with Theraband`,
        props,
        cues: [
          '세라밴드를 양손에 감아 어깨너비로 부드럽게 당겨 견갑대 연결을 먼저 켜요.',
          base.cues[0] ?? '밴드의 점진적 탄성 저항을 느끼며 시작부터 끝까지 균일한 속도로 움직여요.',
          '돌아올 때 밴드가 느슨하게 풀리지 않게 10% 기본 장력을 끝까지 유지해요.',
        ],
        anatomyInsight: {
          ...base.anatomyInsight,
          benefitsKo: [
            '세라밴드의 점진적 탄성 저항으로 전 구간 균일한 근력 자극 제공',
            '어깨 거상을 줄이고 광배근·전거근 연결 인지력 향상',
            base.anatomyInsight.benefitsKo[0] ?? '상체·코어 협응 강화',
          ],
          springMechanicsKo:
            '세라밴드는 늘어날수록 저항이 부드럽게 커지는 탄성 특성으로 관절 부담 없이 끝 범위 수축력을 강화합니다.',
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'prop-theraband',
      };
    },
  },

  // 13. Toning Ball Weighted Arm Line (only when hands are free!)
  {
    kind: 'prop-toning-ball',
    suffixId: 'var-toningball',
    matches: (b) =>
      ['mat', 'reformer', 'chair', 'barrel'].includes(b.apparatus) &&
      !b.props.includes('toning-ball') &&
      b.box !== 'long-box' &&
      ['footwork', 'core', 'lower-body'].includes(b.blockCategory) &&
      ['supine', 'seated', 'standing'].includes(b.bodyPosition) &&
      !/스트랩|바|플랭크|로잉|암|바이셉|트라이셉|허그|살루트|소드|복싱|토닝볼|덤벨|써클링|폼롤러|밴드|보수|슬라이더|점프|트리|롤링|라커|씰|크랩|strap|bar|plank|row|arm|bicep|tricep|hug|salute|sword|box|toning|dumbbell|circle|roller|band|bosu|slider|jump|tree|rolling|rocker|seal|crab|arabesque|attitude|plie|releve|going|mountain|step|frog|split/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const props = mergeProps(base.props, 'toning-ball');
      return {
        ...base,
        id: `${base.id}--var-toningball`,
        nameKo: `${base.nameKo} · 토닝볼 암 라인`,
        nameEn: `${base.nameEn} with Toning Balls`,
        props,
        level: base.level === '1.0' ? '1.5' : base.level,
        targetMuscles: [...new Set([...base.targetMuscles, '삼각근·견갑 안정화'])].slice(0, 4),
        cues: [
          '양손에 0.5~1kg 가벼운 토닝볼을 쥐고 어깨가 뜨지 않게 견갑을 넓게 고정해요.',
          base.cues[0] ?? '하체·코어 움직임과 동시에 팔을 천장·앞으로 뻗어 상·하체를 통합해요.',
          '팔을 들어 올릴 때 갈비뼈가 들리지 않게 호흡을 내쉬며 복부 코어를 잠가요.',
        ],
        anatomyInsight: {
          ...base.anatomyInsight,
          benefitsKo: [
            '하체·코어 동작에 가벼운 상체 중량을 더해 전신 협응과 에너지 소비 증대',
            '팔·어깨 라인 지구력과 흉곽 고정 능력 동시 향상',
            base.anatomyInsight.benefitsKo[0] ?? '전신 밸런스 강화',
          ],
          springMechanicsKo: `${base.anatomyInsight.springMechanicsKo} 손에 든 토닝볼의 소중량 지렛대가 견갑 안정화와 코어 참여를 함께 끌어올립니다.`,
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'prop-toning-ball',
      };
    },
  },

  // 14. BOSU Dome Mat Proprioceptive Challenge
  {
    kind: 'prop-bosu',
    suffixId: 'var-bosu',
    matches: (b) =>
      b.apparatus === 'mat' &&
      !b.props.includes('bosu') &&
      ['lower-body', 'plank', 'bridging'].includes(b.blockCategory) &&
      ['standing', 'prone', 'supine'].includes(b.bodyPosition) &&
      !/보수|폼롤러|짐볼|슬라이더|미니볼|써클링|롤링|라커|씰|크랩|bosu|roller|ball|slider|circle|rolling|rocker|seal|crab|squat|plank/i.test(
        `${b.nameKo} ${b.nameEn}`,
      ),
    transform: (base) => {
      const props = mergeProps(base.props, 'bosu');
      return {
        ...base,
        id: `${base.id}--var-bosu`,
        nameKo: `${base.nameKo} · 보수 밸런스 심화`,
        nameEn: `${base.nameEn} on BOSU Dome`,
        props,
        level: bumpLevel(base.level),
        cues: [
          '보수 돔 정중앙에 발이나 지지 부위를 안정적으로 두고 시선을 한 점에 고정해요.',
          base.cues[0] ?? '돔의 미세한 공기압 흔들림에 맞서 심부 코어와 관절 안정화근을 깨워요.',
          '속도를 낮추고 호흡을 고르게 이어가며 흔들림을 스스로 제어하는 감각을 키워요.',
        ],
        anatomyInsight: {
          ...base.anatomyInsight,
          benefitsKo: [
            '보수 돔의 다방향 불안정성으로 발목·무릎·코어 고유수용감각 극대화',
            '일반 매트보다 높은 심부 안정화근 활성도 확보',
            base.anatomyInsight.benefitsKo[0] ?? '전신 균형 제어력 향상',
          ],
          springMechanicsKo:
            '보수 돔의 탄성 공기 쿠션이 관절 충격을 줄이면서 모든 방향의 균형 흔들림을 만들어 깊은 안정화근을 훈련합니다.',
        },
        tier: 'variation',
        parentArchetypeId: base.id,
        variationKind: 'prop-bosu',
      };
    },
  },
];

function buildAllWorldExercises(): readonly WorldPilatesExercise[] {
  const existingCore: WorldPilatesExercise[] = [
    ...INITIAL_EXERCISES.map(enrichExistingAtomicExercise),
    ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.map(enrichExistingAtomicExercise),
  ];

  const newAtomics: WorldPilatesExercise[] = [
    ...WORLD_NEW_ATOMIC_SEEDS.map(buildNewAtomicExercise),
    ...WORLD_FUSION_AND_ADVANCED_SEEDS.map(buildNewAtomicExercise),
  ];

  const allAtomics = [...existingCore, ...newAtomics];
  const seenIds = new Set<string>(allAtomics.map((e) => e.id));
  const seenKo = new Set<string>(allAtomics.map((e) => e.nameKo.trim().toLowerCase()));
  const seenEn = new Set<string>(allAtomics.map((e) => e.nameEn.trim().toLowerCase()));

  const variations: WorldPilatesExercise[] = [];

  // Select up to 2–3 biomechanically distinct variations per atomic archetype
  // (prioritizing prop + progression/control + regression diversity for clean progression trees)
  for (let idx = 0; idx < allAtomics.length; idx += 1) {
    const base = allAtomics[idx]!;
    const matchedRules = VARIATION_RULES.filter((rule) => rule.matches(base));
    if (matchedRules.length === 0) continue;

    // Pick a diverse set of up to 2–3 variations:
    // 1) At most 1 prop variation (rotated deterministically for broad prop variety)
    // 2) At most 1 biomechanical progression (single-leg / light-spring / rotation / one-arm / pulse / hold)
    // 3) At most 1 regression-supported (when level 1.5/2.0) or second distinct progression
    const propRules = matchedRules.filter((r) => r.kind.startsWith('prop-'));
    const regressionRule = matchedRules.find((r) => r.kind === 'regression-supported');
    const progRules = matchedRules.filter(
      (r) => !r.kind.startsWith('prop-') && r.kind !== 'regression-supported',
    );

    const chosen: VariationRule[] = [];
    if (propRules.length > 0) {
      chosen.push(propRules[idx % propRules.length]!);
    }
    if (progRules.length > 0) {
      chosen.push(progRules[idx % progRules.length]!);
      if (progRules.length > 1 && chosen.length < 3 && idx % 3 !== 2) {
        const second = progRules[(idx + 1) % progRules.length]!;
        if (second.kind !== chosen[chosen.length - 1]!.kind) {
          chosen.push(second);
        }
      }
    }
    if (regressionRule && chosen.length < 3) {
      chosen.push(regressionRule);
    }
    // If still < 2 and another prop rule exists, add one more distinct prop variation
    if (chosen.length < 2 && propRules.length > 1) {
      const extraProp = propRules[(idx + 1) % propRules.length]!;
      if (!chosen.some((r) => r.kind === extraProp.kind)) {
        chosen.push(extraProp);
      }
    }

    for (const rule of chosen) {
      const candidate = rule.transform(base);
      const koKey = candidate.nameKo.trim().toLowerCase();
      const enKey = candidate.nameEn.trim().toLowerCase();
      if (seenIds.has(candidate.id) || seenKo.has(koKey) || seenEn.has(enKey)) {
        continue;
      }
      seenIds.add(candidate.id);
      seenKo.add(koKey);
      seenEn.add(enKey);
      variations.push(candidate);
    }
  }

  return [...allAtomics, ...variations];
}

export const WORLD_PILATES_EXERCISES: readonly WorldPilatesExercise[] = buildAllWorldExercises();

export const WORLD_PILATES_BY_ID: ReadonlyMap<string, WorldPilatesExercise> = new Map(
  WORLD_PILATES_EXERCISES.map((ex) => [ex.id, ex]),
);

const FAMILY_BY_ARCHETYPE_ID: ReadonlyMap<string, readonly WorldPilatesExercise[]> = (() => {
  const map = new Map<string, WorldPilatesExercise[]>();
  for (const ex of WORLD_PILATES_EXERCISES) {
    const list = map.get(ex.parentArchetypeId) ?? [];
    list.push(ex);
    map.set(ex.parentArchetypeId, list);
  }
  return map;
})();

export const WORLD_REPERTOIRE_STATS: WorldRepertoireStats = (() => {
  const byApparatus: Record<ApparatusType, number> = {
    reformer: 0,
    cadillac: 0,
    chair: 0,
    barrel: 0,
    mat: 0,
  };
  const bySchool: Record<PilatesSchoolTag, number> = {
    classical: 0,
    stott: 0,
    'balanced-body': 0,
    basi: 0,
    'korean-studio': 0,
    'fusion-barre': 0,
    'fusion-athletic': 0,
    'fusion-mobility': 0,
  };
  const byLevel: Record<DifficultyLevel, number> = { '1.0': 0, '1.5': 0, '2.0': 0 };
  const byTier: Record<RepertoireTier, number> = { atomic: 0, variation: 0 };
  const byBlock: Record<ClassBlockCategory, number> = {
    warmup: 0,
    footwork: 0,
    bridging: 0,
    core: 0,
    'upper-body': 0,
    'lower-body': 0,
    plank: 0,
    extension: 0,
    'feet-in-straps': 0,
    cooldown: 0,
  };
  const byVisualZone: Record<AnatomyVisualZone, number> = {
    core: 0,
    glutes: 0,
    spine: 0,
    shoulder: 0,
    lateral: 0,
    hip: 0,
  };

  let verifiedVideoCount = 0;

  for (const ex of WORLD_PILATES_EXERCISES) {
    byApparatus[ex.apparatus] += 1;
    bySchool[ex.schoolTag] += 1;
    byLevel[ex.level] += 1;
    byTier[ex.tier] += 1;
    byBlock[ex.blockCategory] += 1;
    byVisualZone[ex.anatomyInsight.anatomyVisualZone] += 1;
    if (VERIFIED_REPERTOIRE_VIDEO_ID_SET.has(ex.youtube.videoId)) {
      verifiedVideoCount += 1;
    }
  }

  return {
    totalCount: WORLD_PILATES_EXERCISES.length,
    atomicCount: byTier.atomic,
    variationCount: byTier.variation,
    existingCoreCount: INITIAL_EXERCISES.length + GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length,
    verifiedVideoCount,
    byApparatus,
    bySchool,
    byLevel,
    byTier,
    byBlock,
    byVisualZone,
  };
})();

const VARIATION_RELATION_LABELS: Readonly<Record<VariationKind, string>> = {
  archetype: '기본 원자 동작',
  'regression-supported': '더 쉽게 (입문 지지)',
  'prop-mini-ball': '소도구 · 미니볼',
  'prop-magic-circle': '소도구 · 써클링',
  'prop-foam-roller': '소도구 · 폼롤러',
  'prop-loop-band': '소도구 · 루프밴드',
  'prop-theraband': '소도구 · 세라밴드',
  'prop-toning-ball': '소도구 · 토닝볼',
  'prop-bosu': '소도구 · 보수',
  'single-leg': '심화 · 싱글 레그',
  'unilateral-arm': '심화 · 원암 항회전',
  'tempo-pulse': '심화 · 엔드레인지 펄스',
  'isometric-hold': '정밀 · 5초 정점 홀드',
  'rotation-layer': '변형 · 흉추 로테이션',
  'spring-light-control': '심화 · 라이트 스프링',
  'custom-remix': '강사 10초 리믹스',
};

function toProgressionNode(ex: WorldPilatesExercise): ProgressionTreeNode {
  return {
    id: ex.id,
    nameKo: ex.nameKo,
    nameEn: ex.nameEn,
    level: ex.level,
    apparatus: ex.apparatus,
    springs: ex.springs,
    props: ex.props,
    tier: ex.tier,
    variationKind: ex.variationKind,
    schoolTag: ex.schoolTag,
    relationLabelKo: VARIATION_RELATION_LABELS[ex.variationKind],
  };
}

function levelRank(level: DifficultyLevel): number {
  return level === '1.0' ? 1 : level === '1.5' ? 2 : 3;
}

export function getProgressionTree(exerciseId: string): ProgressionTree {
  const current = WORLD_PILATES_BY_ID.get(exerciseId) ?? null;
  if (!current) {
    return {
      archetypeId: exerciseId,
      current: null,
      base: null,
      easier: [],
      harder: [],
      propVariations: [],
      allFamilyNodes: [],
    };
  }

  const archetypeId = current.parentArchetypeId;
  const family = FAMILY_BY_ARCHETYPE_ID.get(archetypeId) ?? [current];
  const baseExercise = family.find((ex) => ex.tier === 'atomic') ?? current;
  const baseRank = levelRank(baseExercise.level);

  const easier: ProgressionTreeNode[] = [];
  const harder: ProgressionTreeNode[] = [];
  const propVariations: ProgressionTreeNode[] = [];

  for (const member of family) {
    if (member.id === baseExercise.id) continue;
    const node = toProgressionNode(member);
    if (member.variationKind === 'regression-supported' || levelRank(member.level) < baseRank) {
      easier.push(node);
    } else if (member.variationKind.startsWith('prop-')) {
      propVariations.push(node);
    } else {
      harder.push(node);
    }
  }

  const allFamilyNodes = [
    ...easier,
    toProgressionNode(baseExercise),
    ...propVariations,
    ...harder,
  ];

  return {
    archetypeId,
    current,
    base: toProgressionNode(baseExercise),
    easier,
    harder,
    propVariations,
    allFamilyNodes,
  };
}
