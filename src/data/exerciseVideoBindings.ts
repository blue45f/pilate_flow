import existingCatalog from './verifiedPilatesYouTubeCatalog.json';
import expandedCatalog from './expandedPilatesVideoCatalog.json';
import type {
  ApparatusType,
  BodyPosition,
  PilatesExercise,
  YouTubeClipRef,
} from '../types/pilates';

interface BindingPlan {
  readonly exerciseId: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly videoId: string;
  readonly relation: 'named-movement-reference' | 'related-variant';
  readonly relationshipNoteKo: string;
}

/** Existing catalogue candidates only. No source is represented as a watched demonstration. */
export const EXERCISE_VIDEO_BINDING_PLANS: readonly BindingPlan[] = [
  {
    exerciseId: 'original-mat-pelvic-clock',
    nameEn: 'Pelvic Clock',
    apparatus: 'mat',
    bodyPosition: 'supine',
    videoId: '0dhzD6d1ru0',
    relation: 'named-movement-reference',
    relationshipNoteKo: '골반 시계라는 제목과 매트 분류가 일치합니다.',
  },
  {
    exerciseId: 'original-mat-bridge',
    nameEn: 'Mat Bridge',
    apparatus: 'mat',
    bodyPosition: 'supine',
    videoId: 'IDu9N1yi4ts',
    relation: 'named-movement-reference',
    relationshipNoteKo: '매트 브릿지 제목의 기존 카탈로그 참조입니다.',
  },
  {
    exerciseId: 'original-mat-heel-slide',
    nameEn: 'Heel Slide',
    apparatus: 'mat',
    bodyPosition: 'supine',
    videoId: 't17Z6HeiiQs',
    relation: 'named-movement-reference',
    relationshipNoteKo: 'Heel Slides 제목이 일치합니다. 다른 무릎 접기 영상으로 대체하지 않습니다.',
  },
  {
    exerciseId: 'original-mat-quadruped-reach',
    nameEn: 'Quadruped Reach',
    apparatus: 'mat',
    bodyPosition: 'quadruped',
    videoId: '237SapG5jck',
    relation: 'related-variant',
    relationshipNoteKo:
      '반대 팔·다리 리치라는 제목의 관련 변형입니다. 앱의 준비 단계와 전체 시범의 일치는 미확인입니다.',
  },
  {
    exerciseId: 'original-mat-mermaid',
    nameEn: 'Mat Mermaid',
    apparatus: 'mat',
    bodyPosition: 'seated',
    videoId: 'pV_wmfYnE84',
    relation: 'named-movement-reference',
    relationshipNoteKo: '제작자 원문의 매트 Mermaid 제목을 연결합니다.',
  },
  {
    exerciseId: 'original-reformer-parallel-footwork',
    nameEn: 'Parallel Footwork',
    apparatus: 'reformer',
    bodyPosition: 'supine',
    videoId: 'MPL0zq_0yP8',
    relation: 'related-variant',
    relationshipNoteKo:
      '리포머 Footwork 참고입니다. 평행 발 배치의 정확한 구간은 확인하지 않았습니다.',
  },
  {
    exerciseId: 'original-reformer-supported-bridge',
    nameEn: 'Reformer Bridge Preparation',
    apparatus: 'reformer',
    bodyPosition: 'supine',
    videoId: 'lqaIxlzhBw4',
    relation: 'related-variant',
    relationshipNoteKo:
      '리포머 Shoulder Bridge 분류의 관련 참조입니다. 준비 단계·지지 조건은 별도 확인이 필요합니다.',
  },
  {
    exerciseId: 'original-reformer-strap-frog',
    nameEn: 'Feet in Straps Frog Preparation',
    apparatus: 'reformer',
    bodyPosition: 'supine',
    videoId: '2LnDbhMh3CE',
    relation: 'related-variant',
    relationshipNoteKo:
      'Frogs and Circles 제작자 자료입니다. Frog 준비 단계의 시작·끝 구간은 미확인입니다.',
  },
  {
    exerciseId: 'original-chair-seated-pedal-press',
    nameEn: 'Seated Double-Leg Pedal Press',
    apparatus: 'chair',
    bodyPosition: 'seated',
    videoId: 'iPEpNe3OhcA',
    relation: 'related-variant',
    relationshipNoteKo:
      'Stability Chair Footwork 제목의 관련 참조입니다. 양발 페달 프레스 구간과 세팅은 미확인입니다.',
  },
  {
    exerciseId: 'original-chair-seated-mermaid',
    nameEn: 'Chair Seated Mermaid',
    apparatus: 'chair',
    bodyPosition: 'seated',
    videoId: 'iP3V_eRn99k',
    relation: 'named-movement-reference',
    relationshipNoteKo: 'Mermaid Seated on the Wunda Chair라는 제목이 기구·자세와 일치합니다.',
  },
  {
    exerciseId: 'original-barrel-supported-swan',
    nameEn: 'Barrel Swan Preparation',
    apparatus: 'barrel',
    bodyPosition: 'prone',
    videoId: 'VWQNwXEZXJk',
    relation: 'related-variant',
    relationshipNoteKo:
      'Ladder Barrel Swan 제목의 관련 참조입니다. 보조된 준비 단계와 난이도는 별도 확인이 필요합니다.',
  },
  {
    exerciseId: 'original-barrel-supported-side-bend',
    nameEn: 'Barrel Side Bend Preparation',
    apparatus: 'barrel',
    bodyPosition: 'side-lying',
    videoId: 'M1mUQaCSEEo',
    relation: 'related-variant',
    relationshipNoteKo:
      'Ladder Barrel Side Sit Ups Prep 관련 자료입니다. 앱의 지지·측굴 범위와 동일하다고 검수하지 않았습니다.',
  },
  {
    exerciseId: 'crawled-mat-double-leg-stretch',
    nameEn: 'Double Leg Stretch',
    apparatus: 'mat',
    bodyPosition: 'supine',
    videoId: 'SbAzXngP480',
    relation: 'named-movement-reference',
    relationshipNoteKo:
      '34개 동작 전체 수업 대신 Double Leg Stretch 제목의 개별 제작자 자료를 연결했습니다.',
  },
  {
    exerciseId: 'crawled-mat-neck-pull',
    nameEn: 'Neck Pull',
    apparatus: 'mat',
    bodyPosition: 'supine',
    videoId: 'B6iIe9KjVTo',
    relation: 'named-movement-reference',
    relationshipNoteKo: '전체 수업 대신 Neck Pull 제목의 개별 제작자 자료를 연결했습니다.',
  },
  {
    exerciseId: 'crawled-mat-corkscrew',
    nameEn: 'Corkscrew',
    apparatus: 'mat',
    bodyPosition: 'supine',
    videoId: 'MZoj2FqYdDY',
    relation: 'named-movement-reference',
    relationshipNoteKo: '전체 수업 대신 Corkscrew 제목의 개별 제작자 자료를 연결했습니다.',
  },
  {
    exerciseId: 'crawled-chair-going-up-side',
    nameEn: 'Going Up Side',
    apparatus: 'chair',
    bodyPosition: 'standing',
    videoId: 's483YzcUJSQ',
    relation: 'named-movement-reference',
    relationshipNoteKo:
      'Going Down the Mountain Side 오연결을 제거하고 Going Up Side 제목과 제작자 원문을 대조했습니다.',
  },
  {
    exerciseId: 'crawled-barrel-fullbody-ladder-flow',
    nameEn: 'Ladder Barrel Ballet Stretches',
    apparatus: 'barrel',
    bodyPosition: 'standing',
    videoId: '67sQoYOphpM',
    relation: 'named-movement-reference',
    relationshipNoteKo:
      '전체 바렐 수업 대신 Ballet Stretches 제목의 개별 제작자 자료를 연결했습니다.',
  },
];

const videoById = new Map(
  [...existingCatalog, ...expandedCatalog].map((item) => [item.videoId, item]),
);
const planById = new Map(EXERCISE_VIDEO_BINDING_PLANS.map((plan) => [plan.exerciseId, plan]));

export interface ExerciseVideoEvidence {
  readonly videoId: string;
  readonly title: string;
  readonly publisher: string;
  readonly sourceUrl: string;
  readonly relation: BindingPlan['relation'];
  readonly relationshipNoteKo: string;
  readonly metadataStatus: 'existing-catalog-metadata' | 'creator-page-and-oembed';
  readonly metadataCheckedAt: string | null;
  readonly mappingReviewedAt: '2026-11-13';
  readonly playbackVerified: false;
  readonly segmentVerified: false;
  readonly exactDemonstrationVerified: false;
  readonly professionalReviewVerified: false;
}

function getCompatiblePlan(exercise: PilatesExercise): BindingPlan | undefined {
  const plan = planById.get(exercise.id);
  return plan &&
    plan.apparatus === exercise.apparatus &&
    plan.bodyPosition === exercise.bodyPosition &&
    plan.nameEn === exercise.nameEn &&
    exercise.props.every((prop) => prop === 'none')
    ? plan
    : undefined;
}

/** A locally edited identity or link cannot inherit the catalogue's evidence. */
export function getExerciseVideoEvidence(
  exercise: PilatesExercise,
): ExerciseVideoEvidence | undefined {
  const plan = getCompatiblePlan(exercise);
  const video = plan && videoById.get(plan.videoId);
  if (
    !plan ||
    !video ||
    exercise.youtube.videoId !== video.videoId ||
    exercise.youtube.url !== `https://www.youtube.com/watch?v=${video.videoId}` ||
    exercise.youtube.videoTitle !== video.title ||
    exercise.youtube.channelName !== video.authorName ||
    exercise.youtube.startSec !== 0 ||
    exercise.youtube.endSec !== undefined
  )
    return undefined;
  const hasSource = 'sourceUrl' in video && typeof video.sourceUrl === 'string';
  return Object.freeze({
    videoId: video.videoId,
    title: video.title,
    publisher: video.authorName,
    sourceUrl: hasSource
      ? String(video.sourceUrl)
      : `https://www.youtube.com/watch?v=${video.videoId}`,
    relation: plan.relation,
    relationshipNoteKo: plan.relationshipNoteKo,
    metadataStatus: hasSource ? 'creator-page-and-oembed' : 'existing-catalog-metadata',
    metadataCheckedAt:
      'verifiedAt' in video && typeof video.verifiedAt === 'string' ? video.verifiedAt : null,
    mappingReviewedAt: '2026-11-13',
    playbackVerified: false,
    segmentVerified: false,
    exactDemonstrationVerified: false,
    professionalReviewVerified: false,
  });
}

export function attachExistingVideoReference(exercise: PilatesExercise): PilatesExercise {
  const plan = getCompatiblePlan(exercise);
  const video = plan && videoById.get(plan.videoId);
  if (!plan || !video || !video.apparatus.includes(exercise.apparatus)) return exercise;
  const youtube: YouTubeClipRef = {
    videoId: video.videoId,
    videoTitle: video.title,
    channelName: video.authorName,
    region: video.region as 'kr' | 'global',
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    startSec: 0,
    note: `${plan.relationshipNoteKo} 기존 제목·출처 메타데이터 대조 · 실제 영상 재생·동일 시범·시작/종료 구간 미검수 · 0초는 검증된 동작 시작점이 아닙니다.`,
  };
  return { ...exercise, youtube };
}

export interface ExerciseSourcePageReference {
  readonly url: string;
  readonly title: string;
  readonly publisher: string;
  readonly checkedAt: '2026-11-13';
  readonly relation: 'movement-description' | 'transition-reference';
  readonly sourceTextChecked: true;
  readonly playbackVerified: false;
  readonly segmentVerified: false;
}

const sourcePage = (
  url: string,
  title: string,
  publisher: string,
  relation: ExerciseSourcePageReference['relation'] = 'movement-description',
): ExerciseSourcePageReference =>
  Object.freeze({
    url,
    title,
    publisher,
    checkedAt: '2026-11-13',
    relation,
    sourceTextChecked: true,
    playbackVerified: false,
    segmentVerified: false,
  });

const OPC = 'Online Pilates Classes by Lesley Logan';
const SINGLE_LEG_KICK_SOURCE = sourcePage(
  'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-single-leg-kick/',
  'Single Leg Kick on the Mat',
  OPC,
);
const TRANSITIONS_SOURCE = sourcePage(
  'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-transitions-part-2/',
  'Transitions Part 2 on the Mat',
  OPC,
  'transition-reference',
);

/** Source-only pages: no YouTube identifier or playable iframe is invented. */
export function getExerciseSourcePageReferences(
  exercise: PilatesExercise,
): readonly ExerciseSourcePageReference[] {
  if (exercise.apparatus !== 'mat') return [];
  const pages: ExerciseSourcePageReference[] = [];
  if (
    exercise.id === 'original-mat-chest-lift' &&
    exercise.nameEn === 'Chest Lift' &&
    exercise.bodyPosition === 'supine'
  ) {
    pages.push(
      sourcePage(
        'https://us.physitrack.com/home-exercise-video/pilates-chest-lift',
        'Pilates chest lift',
        'Physitrack',
      ),
    );
  }
  if (
    exercise.id === 'original-mat-single-leg-stretch' &&
    exercise.nameEn === 'Single Leg Stretch Preparation' &&
    exercise.bodyPosition === 'supine'
  ) {
    pages.push(
      sourcePage(
        'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-single-leg-stretch/',
        'Single Leg Stretch on the Mat',
        OPC,
      ),
    );
  }
  if (
    exercise.id === 'crawled-mat-single-leg-kick' &&
    exercise.nameEn === 'Single Leg Kick' &&
    exercise.bodyPosition === 'prone'
  )
    pages.push(SINGLE_LEG_KICK_SOURCE);
  const transitionNames: Readonly<Record<string, string>> = {
    'crawled-mat-spine-stretch-forward': 'Spine Stretch Forward',
    'crawled-mat-open-leg-rocker': 'Open Leg Rocker',
    'crawled-mat-corkscrew': 'Corkscrew',
    'crawled-mat-saw': 'The Saw',
    'crawled-mat-single-leg-kick': 'Single Leg Kick',
  };
  if (transitionNames[exercise.id] === exercise.nameEn) pages.push(TRANSITIONS_SOURCE);
  return pages;
}
