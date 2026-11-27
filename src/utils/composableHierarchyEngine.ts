import { videoReferenceSubject } from './videoSemanticMatching';
import {
  WORLD_PILATES_BY_ID,
  WORLD_PILATES_EXERCISES,
  getExerciseAnatomyInsight,
  getProgressionTree,
  resolveVerifiedYouTubeForExercise,
  type AnatomyVisualZone,
  type PilatesSchoolTag,
  type WorldPilatesExercise,
} from '../data/worldPilatesRepertoire1000';
import { CANONICAL_BLOCKS, PROP_LABELS } from '../data/pilatesCatalog';
import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';

// =============================================================================
// TIER 1: 10-SECOND ONE-TAP REMIX ENGINE (ATOMIC -> VARIATION)
// =============================================================================

export type RemixModifier =
  | 'single-leg'
  | 'pulse'
  | 'hold'
  | 'rotation'
  | 'light-spring'
  | 'heavy-spring'
  | 'easier'
  | 'harder';

export interface RemixVariationOptions {
  readonly prop?: PropType;
  readonly modifier?: RemixModifier;
  readonly apparatus?: ApparatusType;
}

const DEFAULT_SPRINGS_BY_APPARATUS_AND_BLOCK: Readonly<
  Record<ApparatusType, Readonly<Record<ClassBlockCategory, string>>>
> = {
  reformer: {
    warmup: '1R 1B',
    footwork: '2R 1B',
    bridging: '2R',
    core: '1R 1B',
    'upper-body': '1R',
    'lower-body': '1R',
    plank: '1R 1B',
    extension: '1R',
    'feet-in-straps': '1R 1B',
    cooldown: '1B',
  },
  cadillac: {
    warmup: '상단 2 Yellow (롤백 바)',
    footwork: '하단 1 Red + 세이프티 스트랩',
    bridging: '상단 1 Red (푸쉬스루 바)',
    core: '상단 1 Blue (푸쉬스루 바)',
    'upper-body': '중단 암 스프링 2 Yellow',
    'lower-body': '중단 레그 스프링 1 Yellow',
    plank: '상단 1 Blue',
    extension: '상단 1 Blue',
    'feet-in-straps': '레그 스프링 2 Yellow',
    cooldown: '상단 1 Blue (푸쉬스루 바)',
  },
  chair: {
    warmup: '1 Medium + 1 Light',
    footwork: '2 Heavy',
    bridging: '1 Heavy + 1 Medium',
    core: '1 Heavy + 1 Light',
    'upper-body': '1 Medium',
    'lower-body': '1 Heavy + 1 Medium',
    plank: '1 Heavy + 1 Medium',
    extension: '1 Heavy',
    'feet-in-straps': '1 Heavy + 1 Light',
    cooldown: '1 Medium',
  },
  barrel: {
    warmup: '바렐 지지 체중 저항',
    footwork: '바렐 지지 체중 저항',
    bridging: '바렐 지지 체중 저항',
    core: '바렐 지지 체중 저항',
    'upper-body': '바렐 지지 체중 저항',
    'lower-body': '바렐 지지 체중 저항',
    plank: '바렐 지지 체중 저항',
    extension: '바렐 지지 체중 저항',
    'feet-in-straps': '바렐 지지 체중 저항',
    cooldown: '바렐 지지 체중 저항',
  },
  mat: {
    warmup: '매트 체중 저항',
    footwork: '매트 체중 저항',
    bridging: '매트 체중 저항',
    core: '매트 체중 저항',
    'upper-body': '매트 체중 저항',
    'lower-body': '매트 체중 저항',
    plank: '매트 체중 저항',
    extension: '매트 체중 저항',
    'feet-in-straps': '매트 체중 저항',
    cooldown: '매트 체중 저항',
  },
};

const APPARATUS_NAME_KO: Readonly<Record<ApparatusType, string>> = {
  reformer: '리포머',
  cadillac: '캐딜락',
  chair: '운다 체어',
  barrel: '바렐',
  mat: '매트',
};

const APPARATUS_NAME_EN: Readonly<Record<ApparatusType, string>> = {
  reformer: 'Reformer',
  cadillac: 'Cadillac',
  chair: 'Wunda Chair',
  barrel: 'Barrel',
  mat: 'Mat',
};

const MODIFIER_META: Readonly<
  Record<
    RemixModifier,
    {
      readonly suffixKo: string;
      readonly suffixEn: string;
      readonly cueLine: string;
      readonly benefitLine: string;
      readonly fault: { readonly fault: string; readonly fixCue: string };
    }
  >
> = {
  'single-leg': {
    suffixKo: '한 다리 변형',
    suffixEn: 'Single-Leg',
    cueLine: '한 다리를 띄워 편측 지지 상태로 전환하고, 양쪽 골반뼈 높이를 수평으로 잠가주세요.',
    benefitLine: '단측 지지 전환으로 좌우 근력 균형과 항회전 복사근 안정화 강화',
    fault: {
      fault: '한 다리를 띄우는 순간 골반이 옆으로 기울어지며 허리가 비틀림',
      fixCue: '양쪽 골반 위에 물컵을 올린 듯 수평 높이를 끝까지 유지하세요.',
    },
  },
  pulse: {
    suffixKo: '3펄스 변형',
    suffixEn: '3-Pulse',
    cueLine: '근육 자극 정점에서 2cm 미세 범위로 반동 없이 짧게 3회 리듬 펄스를 더해 주세요.',
    benefitLine: '정점 긴장 시간 확대로 목표 근육 지구력과 탄력 자극 극대화',
    fault: {
      fault: '펄스 속도가 빨라지며 반동으로 관절을 튕김',
      fixCue: '짧은 날숨 3박자에 맞춰 2cm 안에서만 정교하게 밀어내세요.',
    },
  },
  hold: {
    suffixKo: '5초 홀드 변형',
    suffixEn: '5-Sec Hold',
    cueLine: '정점에서 자세를 멈추고 숨을 참지 않은 채 5초간(2호흡) 심부 안정화를 버텨 주세요.',
    benefitLine: '등척성 정점 유지로 숨은 보상 패턴 억제 및 심부 코어 지구력 향상',
    fault: {
      fault: '버티는 동안 호흡을 멈춰 목과 어깨에 힘이 몰림',
      fixCue: '가는 날숨을 끝까지 이어가며 아랫배 코르셋을 단단히 감싸세요.',
    },
  },
  rotation: {
    suffixKo: '흉추 회전 변형',
    suffixEn: 'Thoracic Rotation',
    cueLine: '정점에서 골반은 정면에 고정한 채 갈비뼈와 시선을 부드럽게 회전해 복사근을 깨워요.',
    benefitLine: '흉추 회전 가동성과 복사근 대각선 연결을 동시에 강화',
    fault: {
      fault: '흉추 대신 골반이 함께 따라 돌아감',
      fixCue: '양쪽 좌골·골반을 50:50 정면으로 고정하고 갈비뼈 윗부분만 돌려주세요.',
    },
  },
  'light-spring': {
    suffixKo: '라이트 스프링 제어',
    suffixEn: 'Light-Spring Control',
    cueLine: '스프링을 가볍게 낮춰 기구 보조를 줄이고, 느린 3박자 속도로 심부 코어 제어를 느껴요.',
    benefitLine: '낮은 스프링 보조 환경에서 복횡근·안정화근의 순수 제어력 극대화',
    fault: {
      fault: '가벼운 스프링에서 캐리지·페달이 빠르게 흔들리며 스토퍼에 부딪힘',
      fixCue: '끝 지점 2cm 앞에서 아랫배 브레이크를 걸어 무음으로 전환하세요.',
    },
  },
  'heavy-spring': {
    suffixKo: '헤비 저항 강화',
    suffixEn: 'Heavy Resistance',
    cueLine: '스프링 장력을 한 단계 올려 강한 저항을 끝까지 밀어내고 돌아올 때도 버티며 제어해요.',
    benefitLine: '높아진 장력으로 주동근 근력 부하와 지지 안정성 강화',
    fault: {
      fault: '무거운 스프링을 밀 때 어깨가 으쓱하거나 허리가 과도하게 꺾임',
      fixCue: '움직이기 전 복횡근과 견갑 하강을 먼저 잠근 뒤 천천히 추진하세요.',
    },
  },
  easier: {
    suffixKo: '입문 완화 변형',
    suffixEn: 'Gentle Prep',
    cueLine: '무릎을 살짝 굽히거나 가동 범위를 70%로 줄여 관절 부담 없이 정확한 정렬부터 익혀요.',
    benefitLine: '초보자·피로한 컨디션에서도 안전하게 핵심 근육 패턴 학습',
    fault: {
      fault: '억지로 큰 가동 범위를 따라가다 정렬이 무너짐',
      fixCue: '중립 척추가 유지되는 편안한 범위 안에서 호흡과 함께 반복하세요.',
    },
  },
  harder: {
    suffixKo: '심화 챌린지',
    suffixEn: 'Advanced Challenge',
    cueLine: '긴 지렛대와 느린 4박자 편심성 복귀를 결합해 전신 파워하우스 제어력을 끝까지 끌어올려요.',
    benefitLine: '긴 지렛대 제어와 편심성 근력 심화로 상급 컨트롤 완성',
    fault: {
      fault: '난이도가 높아지며 호흡이 끊기고 보상 긴장이 올라옴',
      fixCue: '속도를 한 박자 더 늦춰 깊은 날숨으로 중심축을 먼저 고정하세요.',
    },
  },
};

function shiftSpringTension(
  apparatus: ApparatusType,
  springs: string,
  direction: 'lighter' | 'heavier',
): string {
  if (apparatus === 'mat' || apparatus === 'barrel') return springs;
  if (apparatus === 'reformer') {
    const ladder = ['1Y', '1B', '1B 1Y', '1R', '1R 1Y', '1R 1B', '2R', '2R 1B', '3R'];
    const idx = ladder.findIndex((s) => springs.toUpperCase().startsWith(s));
    if (idx >= 0) {
      const targetIdx =
        direction === 'lighter'
          ? Math.max(0, idx - 1)
          : Math.min(ladder.length - 1, idx + 1);
      return ladder[targetIdx]!;
    }
    return direction === 'lighter' ? '1B' : '2R 1B';
  }
  if (apparatus === 'chair') {
    const ladder = ['1 Light', '1 Medium', '1 Medium + 1 Light', '1 Heavy', '1 Heavy + 1 Light', '1 Heavy + 1 Medium', '2 Heavy'];
    const idx = ladder.findIndex((s) => springs.toLowerCase().includes(s.toLowerCase()));
    if (idx >= 0) {
      const targetIdx =
        direction === 'lighter'
          ? Math.max(0, idx - 1)
          : Math.min(ladder.length - 1, idx + 1);
      return ladder[targetIdx]!;
    }
    return direction === 'lighter' ? '1 Medium' : '2 Heavy';
  }
  if (apparatus === 'cadillac') {
    return direction === 'lighter' ? '상단 1 Yellow (경량 제어)' : '상단 1 Red (저항 강화)';
  }
  return springs;
}

export function remixExerciseVariation(
  baseExercise: PilatesExercise | WorldPilatesExercise,
  options: RemixVariationOptions,
): WorldPilatesExercise {
  const baseInsight = getExerciseAnatomyInsight(baseExercise);
  const parentArchetypeId =
    'parentArchetypeId' in baseExercise ? baseExercise.parentArchetypeId : baseExercise.id;
  const schoolTag: PilatesSchoolTag =
    'schoolTag' in baseExercise ? baseExercise.schoolTag : 'korean-studio';

  const targetApparatus: ApparatusType = options.apparatus ?? baseExercise.apparatus;
  const apparatusChanged = targetApparatus !== baseExercise.apparatus;

  const targetProp = options.prop;
  const hasAddedProp = Boolean(targetProp && targetProp !== 'none');
  const nextProps: PropType[] = hasAddedProp && targetProp
    ? [targetProp, ...baseExercise.props.filter((p) => p !== 'none' && p !== targetProp)]
    : targetProp === 'none'
      ? ['none']
      : [...baseExercise.props];

  let nextSprings = apparatusChanged
    ? DEFAULT_SPRINGS_BY_APPARATUS_AND_BLOCK[targetApparatus][baseExercise.blockCategory]
    : baseExercise.springs;

  let nextLevel: DifficultyLevel = baseExercise.level;
  let nextUnilateral = baseExercise.isUnilateral;
  const nextPlanes: SpinalPlane[] = [...baseExercise.spinalPlanes];
  let nextTempo = baseExercise.tempo ?? 'moderate-flow';
  const nextMuscles = [...baseExercise.targetMuscles];

  const mod = options.modifier;
  if (mod === 'single-leg') {
    nextUnilateral = true;
    nextLevel = baseExercise.level === '1.0' ? '1.5' : '2.0';
    if (targetApparatus === 'reformer' && /2R/i.test(nextSprings)) {
      nextSprings = '1R 1B';
    }
    if (!nextMuscles.includes('중둔근')) nextMuscles.push('중둔근');
  } else if (mod === 'pulse') {
    nextLevel = baseExercise.level === '1.0' ? '1.5' : '2.0';
    nextTempo = 'athletic-burn';
  } else if (mod === 'hold') {
    nextTempo = 'slow-precise';
  } else if (mod === 'rotation') {
    nextUnilateral = true;
    if (!nextPlanes.includes('rotation')) nextPlanes.push('rotation');
    if (!nextMuscles.includes('외복사근')) nextMuscles.unshift('외복사근');
  } else if (mod === 'light-spring') {
    nextSprings = shiftSpringTension(targetApparatus, nextSprings, 'lighter');
    nextLevel = baseExercise.level === '1.0' ? '1.5' : '2.0';
    nextTempo = 'slow-precise';
  } else if (mod === 'heavy-spring') {
    nextSprings = shiftSpringTension(targetApparatus, nextSprings, 'heavier');
    nextLevel = baseExercise.level === '1.0' ? '1.5' : baseExercise.level;
  } else if (mod === 'easier') {
    nextLevel = baseExercise.level === '2.0' ? '1.5' : '1.0';
    nextTempo = 'slow-precise';
    if (baseExercise.blockCategory === 'plank' || (targetApparatus === 'chair' && baseExercise.bodyPosition === 'standing')) {
      nextSprings = shiftSpringTension(targetApparatus, nextSprings, 'heavier');
    }
  } else if (mod === 'harder') {
    nextLevel = baseExercise.level === '1.0' ? '1.5' : '2.0';
    nextTempo = 'athletic-burn';
  }

  const tagPartsKo: string[] = [];
  const tagPartsEn: string[] = [];
  const idParts: string[] = [];

  if (apparatusChanged) {
    tagPartsKo.push(`${APPARATUS_NAME_KO[targetApparatus]} 전환`);
    tagPartsEn.push(`on ${APPARATUS_NAME_EN[targetApparatus]}`);
    idParts.push(targetApparatus);
  }
  if (hasAddedProp && targetProp) {
    const propMeta = PROP_LABELS[targetProp];
    tagPartsKo.push(propMeta.ko);
    tagPartsEn.push(`with ${propMeta.en}`);
    idParts.push(targetProp);
    if (targetProp === 'mini-ball' || targetProp === 'magic-circle') {
      if (!nextMuscles.includes('내전근')) nextMuscles.unshift('내전근');
    } else if (targetProp === 'loop-band') {
      if (!nextMuscles.includes('중둔근')) nextMuscles.unshift('중둔근');
    }
  }
  if (mod) {
    const meta = MODIFIER_META[mod];
    tagPartsKo.push(meta.suffixKo);
    tagPartsEn.push(meta.suffixEn);
    idParts.push(mod);
  }

  if (idParts.length === 0) {
    tagPartsKo.push('맞춤 변형');
    tagPartsEn.push('Custom Remix');
    idParts.push('custom');
  }

  const nameKo = `${baseExercise.nameKo} · ${tagPartsKo.join(' + ')}`;
  const nameEn = `${baseExercise.nameEn} (${tagPartsEn.join(' / ')})`;
  const id = `remix-${baseExercise.id}-${idParts.join('-')}`;

  const propCue =
    hasAddedProp && targetProp
      ? `${PROP_LABELS[targetProp].ko}을(를) 활용해 목표 근육의 압박·균형 피드백을 일정하게 유지해 주세요.`
      : null;
  const modCue = mod ? MODIFIER_META[mod].cueLine : null;
  const apparatusCue = apparatusChanged
    ? `${APPARATUS_NAME_KO[targetApparatus]} 셋업(${nextSprings})에 맞춰 지지면과 중심축을 먼저 안정시켜요.`
    : null;

  const rawCues = [
    apparatusCue,
    propCue,
    modCue,
    baseExercise.cues[0],
    baseExercise.cues[1],
    '호흡 리듬을 놓치지 말고 시작과 복귀 모두 같은 속도로 정교하게 마무리해요.',
  ].filter((c): c is string => Boolean(c && c.trim()));
  const cues: [string, string, string] = [rawCues[0]!, rawCues[1]!, rawCues[2]!];

  const nextBox = targetApparatus === 'reformer' ? baseExercise.box : 'none';
  const nextFootbar =
    targetApparatus === 'reformer'
      ? baseExercise.footbar === 'none'
        ? 'high'
        : baseExercise.footbar
      : 'none';
  const nextHeadrest =
    targetApparatus === 'reformer' && baseExercise.bodyPosition === 'supine'
      ? baseExercise.headrest
      : 'flat';

  const baseForInsight: PilatesExercise = {
    ...baseExercise,
    id,
    nameKo,
    nameEn,
    apparatus: targetApparatus,
    props: nextProps,
    spinalPlanes: nextPlanes,
    level: nextLevel,
    isUnilateral: nextUnilateral,
    springs: nextSprings,
    box: nextBox,
    footbar: nextFootbar,
    headrest: nextHeadrest,
    targetMuscles: nextMuscles.slice(0, 4),
    cues,
    tempo: nextTempo,
    layers: {
      easy: `${nameKo} 입문 조절 — 지지면을 넓히고 가동 범위를 70%로 줄여 정렬을 먼저 지켜요.`,
      standard: `${nameKo} 기본 수행 — 8~10회 호흡 리듬을 맞추며 목표 근육을 고르게 활성화해요.`,
      hard: `${nameKo} 심화 컨트롤 — 느린 4박자 복귀와 정점 2초 유지로 심부 코어 자극을 높여요.`,
    },
  };

  const recomputedInsight = getExerciseAnatomyInsight(baseForInsight);
  const benefitsKo = [
    ...(mod ? [MODIFIER_META[mod].benefitLine] : []),
    ...(hasAddedProp && targetProp
      ? [`${PROP_LABELS[targetProp].ko} 피드백으로 중심선·안정화근 수축 인지력 향상`]
      : []),
    ...baseInsight.benefitsKo,
  ].slice(0, 3);

  const springMechanicsKo =
    mod === 'light-spring'
      ? `스프링을 ${nextSprings}로 낮춰 기구 보조를 줄였기 때문에 심부 코어와 안정화근이 스스로 제어해야 하는 난이도가 높아집니다.`
      : mod === 'heavy-spring'
        ? `스프링을 ${nextSprings}로 높여 주동근 저항과 지지 안정성을 강화했습니다.`
        : recomputedInsight.springMechanicsKo;

  const commonFaultsKo: readonly [
    { readonly fault: string; readonly fixCue: string },
    { readonly fault: string; readonly fixCue: string },
  ] = mod
    ? [MODIFIER_META[mod].fault, baseInsight.commonFaultsKo[0]]
    : recomputedInsight.commonFaultsKo;

  const youtube = resolveVerifiedYouTubeForExercise({
    nameKo,
    nameEn,
    apparatus: targetApparatus,
    blockCategory: baseExercise.blockCategory,
    bodyPosition: baseExercise.bodyPosition,
    props: nextProps,
    youtube: apparatusChanged || !baseExercise.youtube.videoId
      ? undefined
      : {
          ...baseExercise.youtube,
          referenceScope: 'base-movement',
          referenceSubject: videoReferenceSubject(baseForInsight, baseExercise.youtube.videoId),
        },
  });

  return {
    ...baseForInsight,
    youtube,
    anatomyInsight: {
      agonistsKo: nextMuscles.slice(0, 4),
      stabilizersKo: recomputedInsight.stabilizersKo,
      benefitsKo,
      springMechanicsKo,
      commonFaultsKo,
      anatomyVisualZone:
        mod === 'rotation'
          ? 'lateral'
          : targetProp === 'loop-band'
            ? 'glutes'
            : baseInsight.anatomyVisualZone,
    },
    tier: 'variation',
    parentArchetypeId,
    schoolTag,
    variationKind: 'custom-remix',
  };
}

// =============================================================================
// TIER 2: GOLDEN MICRO-FLOW COMBOS (32 ZERO/LOW-TRANSITION 8~12 MIN BLOCKS)
// =============================================================================

export interface MicroFlowCombo {
  readonly id: string;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly apparatus: ApparatusType;
  readonly level: DifficultyLevel;
  readonly targetMinutes: number;
  readonly sharedSpringSetup: string;
  readonly sharedBodyPosition: BodyPosition | 'mixed-smooth';
  readonly transitionSummaryKo: string;
  readonly focusZone: AnatomyVisualZone;
  readonly schoolTag: PilatesSchoolTag;
  readonly exerciseIds: readonly string[];
  readonly flowCueKo: string;
}

export const GOLDEN_MICRO_FLOW_COMBOS: readonly MicroFlowCombo[] = [
  // --- REFORMER (12) ---
  {
    id: 'combo-ref-footwork-2r1b',
    titleKo: '리포머 2R 1B 황금 풋워크 4종',
    subtitleKo: '스프링·자세 변경 0회로 발끝부터 종아리까지 하지 정렬 완성',
    apparatus: 'reformer',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '2R 1B',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 · 2R 1B 고정 · 전환 0회',
    focusZone: 'hip',
    schoolTag: 'classical',
    exerciseIds: [
      'world-reformer-footwork-toes-parallel',
      'world-reformer-footwork-arches',
      'world-reformer-footwork-heels',
      'world-reformer-footwork-running-prancing',
    ],
    flowCueKo: '발 위치만 토우→아치→힐→러닝 순으로 매끄럽게 옮기며 10분 만에 하체 혈류와 정렬을 깨워요.',
  },
  {
    id: 'combo-ref-supine-core-1r1b',
    titleKo: '리포머 1R 1B 누운 스트랩 코어·헌드레드 3종',
    subtitleKo: '같은 1R 1B 스트랩으로 랫 풀다운·헌드레드·트라이셉스를 끊김 없이 연결',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '1R 1B',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 · 1R 1B 고정 · 전환 0회',
    focusZone: 'core',
    schoolTag: 'stott',
    exerciseIds: [
      'world-reformer-reformer-supine-lat-pulldown',
      'world-reformer-reformer-hundred-classic',
      'world-reformer-supine-triceps-press',
    ],
    flowCueKo: '스트랩을 손에서 놓지 않고 광배근 예열→헌드레드 100카운트→팔 뒤쪽 삼두근으로 자연스럽게 이어가요.',
  },
  {
    id: 'combo-ref-shortbox-core',
    titleKo: '리포머 숏박스 2R 1B 4방향 복부 시그니처',
    subtitleKo: '고정 캐리지 위에서 굴곡·중립·측굴·회전을 한 번에 완성하는 코어 블록',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 11,
    sharedSpringSetup: '2R 1B',
    sharedBodyPosition: 'seated',
    transitionSummaryKo: '앉은 자세 · 숏박스 2R 1B 고정 · 전환 0회',
    focusZone: 'core',
    schoolTag: 'classical',
    exerciseIds: [
      'ex-core-02',
      'world-reformer-shortbox-flat-back',
      'world-reformer-shortbox-side-to-side',
      'world-reformer-shortbox-twist-reach',
    ],
    flowCueKo: '풋스트랩에 발을 걸고 라운드→플랫→사이드→트위스트 순으로 복부 전 방위를 쉼 없이 자극해요.',
  },
  {
    id: 'combo-ref-longbox-extension',
    titleKo: '리포머 롱박스 엎드린 등 상부·후면 사슬 3종',
    subtitleKo: '박스 이동 없이 플로우 풀링→브레스트스트로크→그래스하퍼 연속 흐름',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '1R → 1R 1B',
    sharedBodyPosition: 'prone',
    transitionSummaryKo: '엎드린 자세 · 롱박스 유지 · 스프링 최소 조정',
    focusZone: 'spine',
    schoolTag: 'classical',
    exerciseIds: [
      'world-reformer-longbox-pulling-straps-plow',
      'crawled-reformer-breaststroke-longbox',
      'world-reformer-longbox-grasshopper',
    ],
    flowCueKo: '롱박스에 엎드린 자세 그대로 등 상부 신전에서 엉덩이·햄스트링 비츠까지 후면 사슬을 통째로 깨워요.',
  },
  {
    id: 'combo-ref-seated-arms-1b',
    titleKo: '리포머 1B 시티드 팔뚝·쇄골 라인 4종',
    subtitleKo: '파랑 스프링 하나로 오퍼링·허그어트리·살루트·드로우어소드 완주',
    apparatus: 'reformer',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '1B',
    sharedBodyPosition: 'seated',
    transitionSummaryKo: '앉은 자세 · 1B 고정 · 전환 0회',
    focusZone: 'shoulder',
    schoolTag: 'stott',
    exerciseIds: [
      'world-reformer-seated-offering',
      'world-reformer-seated-hug-a-tree',
      'world-reformer-seated-salute',
      'world-reformer-seated-draw-a-sword',
    ],
    flowCueKo: '어깨가 솟지 않는 1B 경량 장력으로 이두·가슴·삼두·회전근개까지 우아한 상체 10분을 구성해요.',
  },
  {
    id: 'combo-ref-kneeling-arms-1b',
    titleKo: '리포머 1B 닐링 코어·항회전 상체 3종',
    subtitleKo: '무릎 선 자세와 1B 고정으로 상체와 코어 밸런스 동시 자극',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 9,
    sharedSpringSetup: '1B',
    sharedBodyPosition: 'kneeling',
    transitionSummaryKo: '무릎 선 자세 · 1B 고정 · 전환 0회',
    focusZone: 'shoulder',
    schoolTag: 'korean-studio',
    exerciseIds: [
      'world-reformer-kneeling-reverse-chest-expansion',
      'world-reformer-reformer-kneeling-hug-a-tree',
      'world-reformer-reformer-kneeling-spine-twist',
    ],
    flowCueKo: '하이 닐링 축을 유지한 채 프레스→허그→트위스트로 넘어가며 팔과 옆구리를 동시에 깨워요.',
  },
  {
    id: 'combo-ref-standing-glute-1r',
    titleKo: '리포머 1R 스탠딩 힙업·중둔근 버닝 3종',
    subtitleKo: '빨강 스프링 하나로 스쿠터→포워드 런지→스케이팅 무휴식 연결',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '1R',
    sharedBodyPosition: 'standing',
    transitionSummaryKo: '선 자세 · 1R 고정 · 전환 0회',
    focusZone: 'glutes',
    schoolTag: 'korean-studio',
    exerciseIds: [
      'ex-lower-01',
      'world-reformer-reformer-standing-lunge',
      'world-reformer-reformer-skating',
    ],
    flowCueKo: '스프링 변경 없이 좌측 3동작 연속→우측 3동작 연속으로 진행하면 힙업 만족도가 폭발해요.',
  },
  {
    id: 'combo-ref-side-lying-hip-1r',
    titleKo: '리포머 1R 사이드 라잉 스트랩 힙 스컬프 3종',
    subtitleKo: '옆으로 누워 롱스트랩 하나로 중둔근·외회전근 집중 10분 완성',
    apparatus: 'reformer',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '1R',
    sharedBodyPosition: 'side-lying',
    transitionSummaryKo: '옆으로 누운 자세 · 1R 고정 · 전환 0회',
    focusZone: 'glutes',
    schoolTag: 'stott',
    exerciseIds: [
      'ex-lower-04',
      'world-reformer-reformer-side-lying-circles',
      'world-reformer-reformer-side-lying-clam',
    ],
    flowCueKo: '발에서 스트랩을 빼지 않고 프레스→레그 서클→클램으로 이어가면 중둔근이 깊이 타올라요.',
  },
  {
    id: 'combo-ref-straps-release-1r1b',
    titleKo: '리포머 1R 1B 핏인스트랩 고관절 감압 4종',
    subtitleKo: '수업 후반부 뭉친 하체와 고관절을 시원하게 풀어주는 시그니처 콤보',
    apparatus: 'reformer',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '1R 1B',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 · 1R 1B 고정 · 전환 0회',
    focusZone: 'hip',
    schoolTag: 'stott',
    exerciseIds: [
      'ex-straps-01',
      'world-reformer-reformer-straps-leg-lowers',
      'world-reformer-reformer-straps-scissors-beats',
      'world-reformer-reformer-straps-peter-pan',
    ],
    flowCueKo: '프로그→레그 로우어→오픈 앤 클로즈→피터팬으로 부드럽게 마무리해 개운함을 선사해요.',
  },
  {
    id: 'combo-ref-jumpboard-cardio',
    titleKo: '리포머 점프보드 1R 1B 유산소·하체 탄력 3종',
    subtitleKo: '관절 충격 줄인 수평 플라이오 점프 3단 리듬 플로우',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 9,
    sharedSpringSetup: '1R 1B',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 · 점프보드 1R 1B 고정 · 전환 0회',
    focusZone: 'hip',
    schoolTag: 'balanced-body',
    exerciseIds: [
      'world-reformer-jumpboard-parallel-jump',
      'world-reformer-jumpboard-pilates-v',
      'world-reformer-jumpboard-wide-frog',
    ],
    flowCueKo: '패럴렐→필라테스 V→와이드 프로그 순으로 소리 없는 부드러운 착지 리듬을 타며 심박수를 올려요.',
  },
  {
    id: 'combo-ref-barre-fusion',
    titleKo: '[바레 퓨전] 리포머 고정 풋바 스탠딩 힙·내전근 4종',
    subtitleKo: '2R 1B 고정 풋바를 발레 바로 활용하는 트렌디 스탠딩 콤보',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 11,
    sharedSpringSetup: '2R 1B (캐리지 고정)',
    sharedBodyPosition: 'standing',
    transitionSummaryKo: '선 자세 · 2R 1B 고정 · 전환 0회',
    focusZone: 'glutes',
    schoolTag: 'fusion-barre',
    exerciseIds: [
      'world-reformer-fusion-barre-footbar-releve',
      'world-reformer-fusion-barre-footbar-plie-pulse',
      'world-reformer-fusion-barre-footbar-arabesque',
      'world-reformer-fusion-barre-footbar-attitude',
    ],
    flowCueKo: '릴레베→와이드 플리에→아라베스크→애티튜드로 이어지는 매끄러운 바레 리듬으로 하체를 조각해요.',
  },
  {
    id: 'combo-ref-advanced-plank',
    titleKo: '리포머 중·상급 1R 1B 플랭크·파이크 3종',
    subtitleKo: '롱 스트레치에서 아라베스크·밸런스 컨트롤까지 이어지는 심화 파워하우스',
    apparatus: 'reformer',
    level: '2.0',
    targetMinutes: 10,
    sharedSpringSetup: '1R 1B',
    sharedBodyPosition: 'mixed-smooth',
    transitionSummaryKo: '풋바 지지 플랭크 계열 · 1R 1B 고정 · 스프링 전환 0회',
    focusZone: 'core',
    schoolTag: 'classical',
    exerciseIds: [
      'expanded-reformer-long-stretch',
      'world-reformer-reformer-arabesque',
      'world-reformer-reformer-balance-control-pushup',
    ],
    flowCueKo: '양손을 풋바에 고정한 채 롱 스트레치→아라베스크→밸런스 컨트롤 푸시업으로 전신 중심을 완성해요.',
  },

  // --- MAT & PROPS (6) ---
  {
    id: 'combo-mat-ab-series-5',
    titleKo: '매트 클래식 앱 시리즈 핵심 4종',
    subtitleKo: '누운 자세 그대로 복직근·복횡근·복사근을 8분 만에 완전 정복',
    apparatus: 'mat',
    level: '1.5',
    targetMinutes: 9,
    sharedSpringSetup: '매트 체중 저항',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 유지 · 체위 변경 0회',
    focusZone: 'core',
    schoolTag: 'classical',
    exerciseIds: [
      'original-mat-single-leg-stretch',
      'crawled-mat-double-leg-stretch',
      'world-mat-single-straight-leg-stretch',
      'world-mat-criss-cross',
    ],
    flowCueKo: '싱글→더블→시저스→크리스 크로스까지 상체 컬업 리듬을 이어가며 파워하우스를 깨워요.',
  },
  {
    id: 'combo-mat-miniball-core',
    titleKo: '미니볼 매트 수파인 코어·브리지 3종',
    subtitleKo: '미니볼 하나로 흉추 컬업→내전근 브리지→천골 시저스 부드럽게 연결',
    apparatus: 'mat',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '매트 + 미니볼',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 · 미니볼 위치만 이동 · 체위 변경 0회',
    focusZone: 'core',
    schoolTag: 'korean-studio',
    exerciseIds: [
      'world-mat-miniball-thoracic-curl',
      'world-mat-miniball-inner-thigh-bridge',
      'world-mat-miniball-sacrum-scissors',
    ],
    flowCueKo: '볼을 날개뼈 뒤→무릎 사이→천골 아래로 옮기며 누운 채로 복부·둔근·내전근을 전부 자극해요.',
  },
  {
    id: 'combo-mat-circle-sculpt',
    titleKo: '써클링 매트 누운 하체·코어 스컬프 3종',
    subtitleKo: '내전근→외전근→헌드레드로 이어지는 써클링 10분 시그니처',
    apparatus: 'mat',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '매트 + 써클링',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 유지 · 써클링 1개로 연속 진행',
    focusZone: 'hip',
    schoolTag: 'stott',
    exerciseIds: [
      'world-mat-circle-inner-thigh-press',
      'world-mat-circle-outer-thigh-abduction',
      'world-mat-circle-supine-hundred',
    ],
    flowCueKo: '허벅지 안쪽 조임→바깥쪽 밀어냄→발목 헌드레드로 하체 정렬과 코어를 한 번에 잡아요.',
  },
  {
    id: 'combo-mat-roller-balance',
    titleKo: '폼롤러 세로 지지 코어·어깨 3종',
    subtitleKo: '폼롤러 위에 누운 채 어깨 개방에서 심부 데드버그까지 단계별 상승',
    apparatus: 'mat',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '매트 + 폼롤러',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '세로 폼롤러 위 누운 자세 고정 · 전환 0회',
    focusZone: 'core',
    schoolTag: 'stott',
    exerciseIds: [
      'world-mat-roller-angel-arms',
      'world-mat-roller-marching',
      'world-mat-roller-dead-bug',
    ],
    flowCueKo: '엔젤 암스로 어깨를 열고 마칭→데드버그로 난이도를 자연스럽게 올려 심부 다열근을 깨워요.',
  },
  {
    id: 'combo-mat-side-kick-series',
    titleKo: '매트 사이드 라잉 힙·옆구리 4종',
    subtitleKo: '옆으로 누운 한 자세로 중둔근·내전근·복사근 360도 자극',
    apparatus: 'mat',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '매트 체중 저항',
    sharedBodyPosition: 'side-lying',
    transitionSummaryKo: '옆으로 누운 자세 유지 · 좌우 1회만 전환',
    focusZone: 'glutes',
    schoolTag: 'classical',
    exerciseIds: [
      'original-mat-clam',
      'world-mat-side-kick-bicycle',
      'world-mat-side-kick-ronde-de-jambe',
      'world-mat-side-kick-beats',
    ],
    flowCueKo: '클램으로 중둔근을 깨운 뒤 바이시클→큰 서클→더블 레그 비츠로 측면 전체를 마무리해요.',
  },
  {
    id: 'combo-mat-mobility-warmup',
    titleKo: '[모빌리티 퓨전] 전신 관절 깨우기 10분 오프닝',
    subtitleKo: '90/90 고관절→스레드 더 니들→월드 그레이티스트 스트레치 완벽 워밍업',
    apparatus: 'mat',
    level: '1.0',
    targetMinutes: 9,
    sharedSpringSetup: '매트 체중 저항',
    sharedBodyPosition: 'mixed-smooth',
    transitionSummaryKo: '앉기→네발기기→무릎 런지로 매끄러운 바닥 전환',
    focusZone: 'spine',
    schoolTag: 'fusion-mobility',
    exerciseIds: [
      'world-mat-fusion-mobility-9090-hip-switch',
      'world-mat-fusion-mobility-thread-the-needle',
      'world-mat-fusion-mobility-worlds-greatest-stretch',
    ],
    flowCueKo: '고관절 내·외회전부터 흉추 회전·햄스트링까지 굳은 관절을 부드럽게 열어 본 수업을 준비해요.',
  },

  // --- CADILLAC (5) ---
  {
    id: 'combo-cad-legsprings-supine',
    titleKo: '캐딜락 레그 스프링 수파인 4종 플로우',
    subtitleKo: '양발에 2 Yellow 레그 스프링을 걸고 한 번에 끝내는 고관절·코어 10분',
    apparatus: 'cadillac',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '레그 스프링 2 Yellow',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 · 레그 스프링 2 Yellow 고정 · 전환 0회',
    focusZone: 'hip',
    schoolTag: 'classical',
    exerciseIds: [
      'world-cadillac-legsprings-frog',
      'world-cadillac-legsprings-circles',
      'world-cadillac-legsprings-walking',
      'world-cadillac-legsprings-scissors',
    ],
    flowCueKo: '프로그→서클→워킹→시저스까지 스프링을 벗지 않고 좌우 하체 대칭과 고관절 감압을 완성해요.',
  },
  {
    id: 'combo-cad-side-legsprings',
    titleKo: '캐딜락 사이드 레그 스프링 힙 스컬프 3종',
    subtitleKo: '중단 1 Yellow 스프링 하나로 클램→서클→바이시클 힙 집중',
    apparatus: 'cadillac',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '중단 레그 스프링 1 Yellow',
    sharedBodyPosition: 'side-lying',
    transitionSummaryKo: '옆으로 누운 자세 · 1 Yellow 고정 · 전환 0회',
    focusZone: 'glutes',
    schoolTag: 'classical',
    exerciseIds: [
      'world-cadillac-legsprings-side-clam',
      'world-cadillac-legsprings-side-circles',
      'world-cadillac-cadillac-side-bend-trapeze',
    ],
    flowCueKo: '스프링 부유 지지를 타고 중둔근 고립→360도 고관절 회전→전후 바이시클로 매끄럽게 이어가요.',
  },
  {
    id: 'combo-cad-rollback-bar',
    titleKo: '캐딜락 롤백 바 시티드 분절·상체 3종',
    subtitleKo: '상단 2 Yellow 롤백 바 하나로 척추 분절·회전·등 상부까지 완성',
    apparatus: 'cadillac',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '상단 2 Yellow (롤백 바)',
    sharedBodyPosition: 'seated',
    transitionSummaryKo: '앉은 자세 · 롤백 바 고정 · 전환 0회',
    focusZone: 'core',
    schoolTag: 'classical',
    exerciseIds: [
      'original-cadillac-seated-roll-back',
      'world-cadillac-rollback-single-arm-twist',
      'world-cadillac-rollback-chest-opener',
    ],
    flowCueKo: '기본 롤백으로 분절을 깨운 뒤 원암 트위스트→체스트 오프너로 가슴과 등까지 열어 마무리해요.',
  },
  {
    id: 'combo-cad-pushthrough-top',
    titleKo: '캐딜락 상단 푸쉬스루 바 3방향 척추 모빌리티',
    subtitleKo: '상단 1 Blue 세팅 유지로 굴곡·측굴·신전을 앉은 채 모두 해결',
    apparatus: 'cadillac',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '상단 1 Blue (푸쉬스루 바)',
    sharedBodyPosition: 'seated',
    transitionSummaryKo: '앉은 자세 · 상단 1 Blue 고정 · 전환 0회',
    focusZone: 'spine',
    schoolTag: 'stott',
    exerciseIds: [
      'world-cadillac-pushthrough-seated-forward',
      'world-cadillac-pushthrough-mermaid',
      'world-cadillac-cadillac-reverse-pushthrough',
    ],
    flowCueKo: '앞으로 숙이는 굴곡→옆구리 머메이드 측굴→가슴 여는 흉추 신전까지 스프링 한 번도 안 바꿔요.',
  },
  {
    id: 'combo-cad-armsprings-standing',
    titleKo: '캐딜락 중단 암 스프링 스탠딩 상체·코어 3종',
    subtitleKo: '선 자세에서 가슴·회전 펀치·항회전 팔로프 프레스를 한 번에 연결',
    apparatus: 'cadillac',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '중단 암 스프링 2 Yellow',
    sharedBodyPosition: 'standing',
    transitionSummaryKo: '선 자세 · 중단 암 스프링 유지 · 전환 0회',
    focusZone: 'shoulder',
    schoolTag: 'fusion-athletic',
    exerciseIds: [
      'world-cadillac-armsprings-hug-a-tree',
      'world-cadillac-armsprings-boxing',
      'world-cadillac-fusion-athletic-cadillac-pallof',
    ],
    flowCueKo: '허그 어 트리→스탠딩 복싱 회전→팔로프 항회전 홀드로 상체와 코어를 입체적으로 단련해요.',
  },

  // --- WUNDA CHAIR (5) ---
  {
    id: 'combo-chr-footwork-seated',
    titleKo: '운다 체어 시티드 2 Heavy 풋워크 4종',
    subtitleKo: '앉은 자세 2 Heavy 그대로 토우·힐·필라테스 V·아킬레스까지 완주',
    apparatus: 'chair',
    level: '1.0',
    targetMinutes: 10,
    sharedSpringSetup: '2 Heavy',
    sharedBodyPosition: 'seated',
    transitionSummaryKo: '앉은 자세 · 2 Heavy 고정 · 전환 0회',
    focusZone: 'hip',
    schoolTag: 'classical',
    exerciseIds: [
      'world-chair-chair-footwork-toes',
      'world-chair-chair-footwork-heels',
      'world-chair-chair-footwork-pilates-v',
      'world-chair-chair-achilles-stretch',
    ],
    flowCueKo: '직립 척추를 세운 채 발 위치만 바꿔 하체 정렬과 종아리 펌핑을 10분 만에 끝내요.',
  },
  {
    id: 'combo-chr-standing-glute',
    titleKo: '운다 체어 스탠딩 힙·스텝업 버닝 3종',
    subtitleKo: '1 Heavy + 1 Medium 고정으로 정면·후방·크로스오버 3방향 힙 폭격',
    apparatus: 'chair',
    level: '2.0',
    targetMinutes: 11,
    sharedSpringSetup: '1 Heavy + 1 Medium',
    sharedBodyPosition: 'standing',
    transitionSummaryKo: '선 자세 · 1 Heavy + 1 Medium 고정 · 전환 0회',
    focusZone: 'glutes',
    schoolTag: 'korean-studio',
    exerciseIds: [
      'crawled-chair-going-up-front',
      'world-chair-chair-backward-step-down',
      'world-chair-chair-crossover-step-up',
    ],
    flowCueKo: '고잉 업 프론트→백워드 스텝다운→크로스오버 스텝업으로 대둔근과 중둔근을 빈틈없이 자극해요.',
  },
  {
    id: 'combo-chr-prone-extension',
    titleKo: '운다 체어 프론 견갑·스완·프레스업 3종',
    subtitleKo: '시트에 엎드린 자세 그대로 견갑 세팅→스완→삼두 프레스업 단계별 빌드',
    apparatus: 'chair',
    level: '1.5',
    targetMinutes: 9,
    sharedSpringSetup: '1 Heavy + 1 Light',
    sharedBodyPosition: 'prone',
    transitionSummaryKo: '엎드린 자세 유지 · 체위 변경 0회',
    focusZone: 'spine',
    schoolTag: 'stott',
    exerciseIds: [
      'world-chair-chair-scapular-isolations',
      'expanded-chair-swan',
      'world-chair-chair-prone-press-up',
    ],
    flowCueKo: '날개뼈 분리 움직임으로 어깨를 안정화한 뒤 흉추 스완과 팔 뒤쪽 프레스업으로 힘차게 이어가요.',
  },
  {
    id: 'combo-chr-advanced-pike',
    titleKo: '운다 체어 심화 파이크·코어 마스터 3종',
    subtitleKo: '풀업 파이크→사이드 풀업 트위스트→텐던 스트레치 고난도 파워하우스',
    apparatus: 'chair',
    level: '2.0',
    targetMinutes: 10,
    sharedSpringSetup: '1 Heavy + 1 Medium',
    sharedBodyPosition: 'standing',
    transitionSummaryKo: '페달 스탠딩 코어 계열 · 스프링 고정 · 전환 최소화',
    focusZone: 'core',
    schoolTag: 'classical',
    exerciseIds: [
      'crawled-chair-pull-up-hamstring3',
      'world-chair-chair-side-pullup-twist',
      'world-chair-chair-tendon-stretch',
    ],
    flowCueKo: '정면 파이크→측면 복사근 파이크→리버스 텐던 스트레치로 체어 고급 코어의 정점을 완성해요.',
  },
  {
    id: 'combo-chr-barre-standing',
    titleKo: '[바레+애슬레틱 퓨전] 체어 스탠딩 하체 스컬프 3종',
    subtitleKo: '핸들 바레 플리에→아라베스크 킥백→불가리안 스플릿 스쿼트 콤보',
    apparatus: 'chair',
    level: '1.5',
    targetMinutes: 10,
    sharedSpringSetup: '체어 고정 / 1 Medium + 1 Light',
    sharedBodyPosition: 'standing',
    transitionSummaryKo: '선 자세 유지 · 체위 변경 0회',
    focusZone: 'glutes',
    schoolTag: 'fusion-barre',
    exerciseIds: [
      'world-chair-fusion-barre-chair-plie-heel-lift',
      'world-chair-fusion-barre-chair-arabesque-press',
      'world-chair-fusion-athletic-chair-bulgarian-squat',
    ],
    flowCueKo: '체어 옆·앞·뒤 동선만 가볍게 바꿔가며 내전근·둔근·대퇴사두 전체를 탄탄하게 조각해요.',
  },

  // --- LADDER BARREL & SPINE CORRECTOR (4) ---
  {
    id: 'combo-brl-shortbox-core',
    titleKo: '래더 바렐 숏박스 4방향 복부 마스터',
    subtitleKo: '사다리 발 고정 그대로 라운드→플랫→트위스트→어라운드 더 월드 완주',
    apparatus: 'barrel',
    level: '1.5',
    targetMinutes: 11,
    sharedSpringSetup: '래더 발 고정 (스프링 없음)',
    sharedBodyPosition: 'seated',
    transitionSummaryKo: '앉은 자세 고정 · 전환 0회',
    focusZone: 'core',
    schoolTag: 'classical',
    exerciseIds: [
      'crawled-barrel-shortbox-roundback',
      'world-barrel-barrel-shortbox-flat-back',
      'world-barrel-barrel-shortbox-twist',
      'world-barrel-barrel-shortbox-around-world',
    ],
    flowCueKo: '발을 사다리 봉에 고정한 채 복부 굴곡·중립·회전·360도 순환까지 끊김 없이 몰아붙여요.',
  },
  {
    id: 'combo-brl-ballet-cooldown',
    titleKo: '래더 바렐 발레 스트레치 3방향 쿨다운',
    subtitleKo: '프론트(햄스트링)→사이드(내전근·측굴)→백(장요근) 우아한 마무리',
    apparatus: 'barrel',
    level: '1.0',
    targetMinutes: 9,
    sharedSpringSetup: '바렐 탑 지지 (스프링 없음)',
    sharedBodyPosition: 'standing',
    transitionSummaryKo: '선 자세 유지 · 몸 방향만 90도씩 회전',
    focusZone: 'hip',
    schoolTag: 'classical',
    exerciseIds: [
      'world-barrel-barrel-ballet-stretch-front',
      'world-barrel-barrel-ballet-stretch-side',
      'world-barrel-barrel-ballet-stretch-back',
    ],
    flowCueKo: '한쪽 다리를 바렐에 얹고 정면→측면→후면으로 부드럽게 돌며 하체 전체를 시원하게 풀어요.',
  },
  {
    id: 'combo-brl-spine-corrector-legs',
    titleKo: '스파인 코렉터 수파인 코어·고관절 4종',
    subtitleKo: '아크 곡면 지지 위에서 컬업→레그 서클→시저스→바이시클 논스톱 플로우',
    apparatus: 'barrel',
    level: '1.5',
    targetMinutes: 11,
    sharedSpringSetup: '스파인 코렉터 아크 지지',
    sharedBodyPosition: 'supine',
    transitionSummaryKo: '누운 자세 고정 · 전환 0회',
    focusZone: 'core',
    schoolTag: 'classical',
    exerciseIds: [
      'world-barrel-spine-corrector-chest-lift',
      'world-barrel-spine-corrector-leg-circles',
      'world-barrel-spine-corrector-scissors',
      'world-barrel-spine-corrector-bicycle',
    ],
    flowCueKo: '아크의 완만한 경사가 하복부와 고관절 움직임을 부드럽게 도와 다리가 가벼워져요.',
  },
  {
    id: 'combo-brl-prone-posterior',
    titleKo: '래더 바렐 프론 스완 & 후면 사슬 3종',
    subtitleKo: '엎드린 자세 그대로 스완 프렙→풀 스완→둔근 비츠 연속 자극',
    apparatus: 'barrel',
    level: '1.5',
    targetMinutes: 9,
    sharedSpringSetup: '바렐 아크 지지 (스프링 없음)',
    sharedBodyPosition: 'prone',
    transitionSummaryKo: '엎드린 자세 고정 · 전환 0회',
    focusZone: 'spine',
    schoolTag: 'classical',
    exerciseIds: [
      'world-barrel-barrel-prone-swan-prep',
      'crawled-barrel-swan-dive-full',
      'world-barrel-barrel-prone-leg-beats',
    ],
    flowCueKo: '흉추 신전 워밍업에서 풀 스완 아크, 그리고 둔근·내전근 비츠까지 등 뒤 전체를 길게 깨워요.',
  },
];

export const GOLDEN_COMBOS_BY_ID: ReadonlyMap<string, MicroFlowCombo> = new Map(
  GOLDEN_MICRO_FLOW_COMBOS.map((combo) => [combo.id, combo]),
);

export function expandComboToSequenceSteps(
  combo: MicroFlowCombo,
  pool: readonly (PilatesExercise | WorldPilatesExercise)[] = WORLD_PILATES_EXERCISES,
  startOrder = 1,
): SequenceStep[] {
  const byId = new Map(pool.map((ex) => [ex.id, ex]));
  const perStepMin = Math.max(
    2,
    Math.round((combo.targetMinutes / Math.max(1, combo.exerciseIds.length)) * 2) / 2,
  );
  return combo.exerciseIds
    .map((exerciseId, idx) => {
      const ex = byId.get(exerciseId) ?? WORLD_PILATES_BY_ID.get(exerciseId);
      if (!ex) return null;
      const step: SequenceStep = {
        stepId: `${combo.id}-step-${startOrder + idx}`,
        order: startOrder + idx,
        blockCategory: ex.blockCategory,
        exerciseId: ex.id,
        durationMin: perStepMin,
        selectedLayer: combo.level === '1.0' ? 'easy' : combo.level === '2.0' ? 'hard' : 'standard',
        sourceBlockId: combo.id,
        sourceBlockTitle: combo.titleKo,
        instructorNote: idx === 0 ? combo.flowCueKo : undefined,
      };
      return step;
    })
    .filter((s): s is SequenceStep => s !== null);
}

// =============================================================================
// TIER 3: ZERO-TRANSITION NEXT RECOMMENDER
// =============================================================================

export interface NextExerciseRecommendation {
  readonly exercise: WorldPilatesExercise;
  readonly transitionCost: number;
  readonly sameApparatus: boolean;
  readonly samePosition: boolean;
  readonly sameSpring: boolean;
  readonly sameBox: boolean;
  readonly reasonKo: string;
}

const BLOCK_ORDER_INDEX: Readonly<Record<ClassBlockCategory, number>> = Object.fromEntries(
  CANONICAL_BLOCKS.map((b, i) => [b.category, i]),
) as Record<ClassBlockCategory, number>;

const ADJACENT_POSITIONS: Readonly<Record<BodyPosition, readonly BodyPosition[]>> = {
  supine: ['supine', 'side-lying', 'seated'],
  'side-lying': ['side-lying', 'supine', 'prone', 'kneeling'],
  prone: ['prone', 'quadruped', 'side-lying', 'kneeling'],
  quadruped: ['quadruped', 'kneeling', 'prone'],
  kneeling: ['kneeling', 'quadruped', 'seated', 'standing'],
  seated: ['seated', 'supine', 'kneeling'],
  standing: ['standing', 'kneeling'],
};

function normalizeSpringKey(springs: string): string {
  return springs
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toWorldExercise(ex: PilatesExercise | WorldPilatesExercise): WorldPilatesExercise {
  const existing = WORLD_PILATES_BY_ID.get(ex.id);
  if (existing) return existing;
  if ('anatomyInsight' in ex && 'tier' in ex) return ex;
  return {
    ...ex,
    anatomyInsight: getExerciseAnatomyInsight(ex),
    tier: 'atomic',
    parentArchetypeId: ex.id,
    schoolTag: 'korean-studio',
    variationKind: 'archetype',
  };
}

export function computeExerciseTransitionCost(
  fromEx: PilatesExercise | WorldPilatesExercise,
  toEx: PilatesExercise | WorldPilatesExercise,
): {
  readonly transitionCost: number;
  readonly sameApparatus: boolean;
  readonly samePosition: boolean;
  readonly sameSpring: boolean;
  readonly sameBox: boolean;
} {
  const sameApparatus = fromEx.apparatus === toEx.apparatus;
  const samePosition = fromEx.bodyPosition === toEx.bodyPosition;
  const sameBox = fromEx.box === toEx.box;

  const fromSpring = normalizeSpringKey(fromEx.springs);
  const toSpring = normalizeSpringKey(toEx.springs);
  const springIrrelevant = fromEx.apparatus === 'mat' || fromEx.apparatus === 'barrel';
  const sameSpring =
    sameApparatus && (springIrrelevant || Boolean(fromSpring && fromSpring === toSpring));

  const positionAdj = ADJACENT_POSITIONS[fromEx.bodyPosition].includes(toEx.bodyPosition);
  const positionCost = samePosition ? 0 : positionAdj ? 8 : 16;
  const springCost = sameSpring ? 0 : 10;
  const boxCost = sameBox ? 0 : 18;
  const apparatusCost = sameApparatus ? 0 : 40;

  return {
    transitionCost: apparatusCost + boxCost + positionCost + springCost,
    sameApparatus,
    samePosition,
    sameSpring,
    sameBox,
  };
}

const POSITION_SHORT_KO: Readonly<Record<BodyPosition, string>> = {
  supine: '누운 자세',
  prone: '엎드린 자세',
  'side-lying': '옆으로 누운 자세',
  seated: '앉은 자세',
  kneeling: '무릎 선 자세',
  standing: '선 자세',
  quadruped: '네발기기',
};

const BLOCK_SHORT_KO: Readonly<Record<ClassBlockCategory, string>> = {
  warmup: '호흡·예열',
  footwork: '풋워크',
  bridging: '브릿징',
  core: '코어·복부',
  'upper-body': '상체·어깨',
  'lower-body': '하체·둔근',
  plank: '플랭크',
  extension: '흉추 신전',
  'feet-in-straps': '핏인스트랩',
  cooldown: '마무리 이완',
};

export function recommendZeroTransitionNext(
  currentExercise: PilatesExercise | WorldPilatesExercise,
  pool: readonly (PilatesExercise | WorldPilatesExercise)[] = WORLD_PILATES_EXERCISES,
  existingIds: readonly string[] = [],
  limit = 3,
): NextExerciseRecommendation[] {
  const excluded = new Set<string>([currentExercise.id, ...existingIds]);
  const currentWorld = toWorldExercise(currentExercise);
  const currentBlockIdx = BLOCK_ORDER_INDEX[currentWorld.blockCategory];
  const currentLevelNum = currentWorld.level === '1.0' ? 1 : currentWorld.level === '1.5' ? 2 : 3;

  const scored: Array<NextExerciseRecommendation & { readonly rankScore: number }> = [];

  for (const rawCandidate of pool) {
    if (excluded.has(rawCandidate.id)) continue;
    const candidate = toWorldExercise(rawCandidate);
    const transition = computeExerciseTransitionCost(currentWorld, candidate);

    // Base score prioritizes minimal transition cost
    let rankScore = 100 - transition.transitionCost * 2.2;

    // Prefer different atomic archetype for real class flow (not repeating same move immediately)
    if (candidate.parentArchetypeId === currentWorld.parentArchetypeId) {
      rankScore -= 28;
    }

    // Prefer canonical block progression (same block or +1..+2 forward)
    const blockDelta = BLOCK_ORDER_INDEX[candidate.blockCategory] - currentBlockIdx;
    if (blockDelta === 0) rankScore += 10;
    else if (blockDelta === 1 || blockDelta === 2) rankScore += 16;
    else if (blockDelta > 2 && blockDelta <= 4) rankScore += 4;
    else if (blockDelta < 0) rankScore -= 8;

    // Reward adding a complementary spinal plane
    const addsNewPlane = candidate.spinalPlanes.some(
      (p) => p !== 'neutral' && !currentWorld.spinalPlanes.includes(p),
    );
    if (addsNewPlane) rankScore += 9;

    // Reward compatible difficulty level
    const candLevelNum = candidate.level === '1.0' ? 1 : candidate.level === '1.5' ? 2 : 3;
    if (Math.abs(candLevelNum - currentLevelNum) === 0) rankScore += 6;
    else if (Math.abs(candLevelNum - currentLevelNum) === 1) rankScore += 2;
    else rankScore -= 10;

    // Slight preference for atomic archetypes so recommendations feel clean and iconic
    if (candidate.tier === 'atomic') rankScore += 5;

    // Build crisp 1-line Korean instructor reason
    const posLabel = POSITION_SHORT_KO[candidate.bodyPosition];
    const blockLabel = BLOCK_SHORT_KO[candidate.blockCategory];
    let reasonKo: string;
    if (transition.sameApparatus && transition.samePosition && transition.sameSpring && transition.sameBox) {
      reasonKo =
        candidate.apparatus === 'mat' || candidate.apparatus === 'barrel'
          ? `같은 ${posLabel} 그대로 동선 끊김 없이 ${blockLabel} 흐름을 이어가요`
          : `같은 ${posLabel} · 스프링(${candidate.springs}) 유지로 끊김 없이 ${blockLabel} 연결해요`;
    } else if (transition.sameApparatus && transition.samePosition && transition.sameBox) {
      reasonKo = `같은 ${posLabel} 유지 · 스프링만 가볍게 조정해 ${blockLabel} 구간으로 넘어가요`;
    } else if (transition.sameApparatus && transition.sameSpring && transition.sameBox) {
      reasonKo = `스프링(${candidate.springs}) 그대로 유지하고 ${posLabel}로 부드럽게 전환해요`;
    } else if (transition.sameApparatus) {
      reasonKo = `같은 ${APPARATUS_NAME_KO[candidate.apparatus]}에서 ${blockLabel} 자극으로 균형 있게 이어가요`;
    } else {
      reasonKo = `${blockLabel} 목표를 이어가는 보조 기구 전환 추천 동작이에요`;
    }

    scored.push({
      exercise: candidate,
      ...transition,
      reasonKo,
      rankScore,
    });
  }

  scored.sort(
    (a, b) =>
      b.rankScore - a.rankScore ||
      a.transitionCost - b.transitionCost ||
      a.exercise.id.localeCompare(b.exercise.id),
  );

  // Deduplicate by parentArchetypeId in top picks for high variety
  const picked: NextExerciseRecommendation[] = [];
  const usedArchetypes = new Set<string>();
  const safeLimit = Math.max(1, Math.min(10, Math.floor(limit)));

  for (const item of scored) {
    if (picked.length >= safeLimit) break;
    if (usedArchetypes.has(item.exercise.parentArchetypeId)) continue;
    usedArchetypes.add(item.exercise.parentArchetypeId);
    picked.push({
      exercise: item.exercise,
      transitionCost: item.transitionCost,
      sameApparatus: item.sameApparatus,
      samePosition: item.samePosition,
      sameSpring: item.sameSpring,
      sameBox: item.sameBox,
      reasonKo: item.reasonKo,
    });
  }

  return picked;
}

// =============================================================================
// TIER 4: CURATED MULTI-WEEK PROGRAMS (12) + 4-WEEK GENERATOR + FRESHNESS + PLAN B
// =============================================================================

export interface ProgramWeekPlan {
  readonly weekNumber: number;
  readonly themeKo: string;
  readonly weeklyGoalKo: string;
  readonly progressionNoteKo: string;
  readonly recommendedComboIds: readonly string[];
  readonly exerciseIds: readonly string[];
}

export interface MultiWeekProgram {
  readonly id: string;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly durationWeeks: 4 | 8;
  readonly targetMinutesPerClass: 30 | 45 | 50 | 60;
  readonly apparatus: readonly ApparatusType[];
  readonly level: DifficultyLevel;
  readonly focusZone: AnatomyVisualZone;
  readonly schoolTag: PilatesSchoolTag;
  readonly summaryKo: string;
  readonly weeks: readonly ProgramWeekPlan[];
}

export const CURATED_MULTI_WEEK_PROGRAMS: readonly MultiWeekProgram[] = [
  {
    id: 'program-beginner-reformer-4w',
    titleKo: '초보 입문 리포머 4주 기초 완성',
    subtitleKo: '호흡·풋워크 정렬부터 기본 스트랩·브릿징·머메이드까지 부담 없는 4주 성장',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['reformer'],
    level: '1.0',
    focusZone: 'core',
    schoolTag: 'stott',
    summaryKo: '처음 리포머에 오르는 회원이 4주 동안 중립 골반, 호흡 연결, 기본 스프링 감각을 단계적으로 익히도록 구성했습니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 호흡 & 하지 정렬 입문',
        weeklyGoalKo: '2R 1B 풋워크 정렬과 중립 골반 감각 확립',
        progressionNoteKo: '스프링 변경을 2회 이내로 최소화해 기구 적응력을 높입니다.',
        recommendedComboIds: ['combo-ref-footwork-2r1b', 'combo-ref-straps-release-1r1b'],
        exerciseIds: [
          'ex-warmup-01',
          'world-reformer-footwork-toes-parallel',
          'world-reformer-footwork-heels',
          'original-reformer-supported-bridge',
          'world-reformer-reformer-supine-lat-pulldown',
          'world-reformer-seated-offering',
          'world-reformer-reformer-straps-leg-lowers',
          'ex-cooldown-01',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 미니볼 내전근 & 팔 라인 연결',
        weeklyGoalKo: '미니볼 피드백으로 중심선·어깨 하강 감각 강화',
        progressionNoteKo: '1주차 동작에 미니볼과 시티드 스트랩 워크를 부드럽게 얹습니다.',
        recommendedComboIds: ['combo-ref-seated-arms-1b', 'combo-ref-side-lying-hip-1r'],
        exerciseIds: [
          'ex-warmup-01',
          'world-reformer-footwork-pilates-v',
          'ex-bridging-01',
          'world-reformer-seated-hug-a-tree',
          'world-reformer-seated-midback-row',
          'world-reformer-reformer-side-lying-clam',
          'world-reformer-reformer-straps-peter-pan',
          'world-reformer-reformer-hip-flexor-stretch',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 코어 100카운트 & 니 스트레치',
        weeklyGoalKo: '누운 복부 지구력과 무릎 선 중심축 제어 도전',
        progressionNoteKo: '수파인에서 닐링·네발기기로 체위 변화를 자연스럽게 확장합니다.',
        recommendedComboIds: ['combo-ref-supine-core-1r1b'],
        exerciseIds: [
          'original-reformer-supine-breath',
          'world-reformer-footwork-second-wide',
          'world-reformer-reformer-hundred-classic',
          'world-reformer-supine-triceps-press',
          'world-reformer-reformer-knee-stretch-flat',
          'world-reformer-reformer-side-lying-circles',
          'world-reformer-reformer-straps-scissors-beats',
          'ex-cooldown-01',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 첫 스탠딩 런지 & 전신 50분 통합',
        weeklyGoalKo: '4방향 척추 움직임과 스탠딩 하체까지 입문 졸업 플로우',
        progressionNoteKo: '1~3주차 핵심을 하나의 매끄러운 50분 시그니처 수업으로 통합합니다.',
        recommendedComboIds: ['combo-ref-footwork-2r1b', 'combo-ref-standing-glute-1r'],
        exerciseIds: [
          'ex-warmup-01',
          'world-reformer-footwork-single-leg',
          'ex-bridging-01',
          'world-reformer-reformer-hundred-classic',
          'world-reformer-seated-draw-a-sword',
          'ex-lower-01',
          'world-reformer-longbox-pulling-straps-plow',
          'world-reformer-reformer-eves-lunge-stretch',
        ],
      },
    ],
  },
  {
    id: 'program-glute-lower-4w',
    titleKo: '힙·하체 탄력 집중 4주 스컬프',
    subtitleKo: '중둔근·대둔근·내전근을 누운 자세부터 스탠딩·바레 퓨전까지 입체 자극',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['reformer'],
    level: '1.5',
    focusZone: 'glutes',
    schoolTag: 'korean-studio',
    summaryKo: '하체 정렬을 지키면서 대둔근과 중둔근의 근지구력을 주차별로 끌어올리는 인기 4주 힙 집중 커리큘럼입니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 브릿징 & 사이드 스트랩 기초',
        weeklyGoalKo: '허리 개입 없이 둔근·중둔근 단독 점화 감각 잡기',
        progressionNoteKo: '누운·옆으로 누운 자세에서 둔근 자극 인지력을 먼저 키웁니다.',
        recommendedComboIds: ['combo-ref-side-lying-hip-1r'],
        exerciseIds: [
          'ex-warmup-01',
          'world-reformer-footwork-heels',
          'ex-bridging-01',
          'world-reformer-reformer-side-lying-clam',
          'world-reformer-reformer-side-lying-circles',
          'world-reformer-reformer-straps-leg-lowers',
          'world-reformer-fusion-mobility-reformer-pigeon-footbar',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 1R 스탠딩 스쿠터 & 스케이팅',
        weeklyGoalKo: '단측 스탠딩 밸런스와 양측 중둔근 동시 활성화',
        progressionNoteKo: '1R 고정 세팅으로 스탠딩 하체 버닝 블록을 본격 도입합니다.',
        recommendedComboIds: ['combo-ref-standing-glute-1r'],
        exerciseIds: [
          'world-reformer-footwork-second-wide',
          'world-reformer-footwork-single-leg',
          'ex-lower-01',
          'world-reformer-reformer-standing-lunge',
          'world-reformer-reformer-skating',
          'world-reformer-reformer-straps-peter-pan',
          'world-reformer-reformer-eves-lunge-stretch',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 바레 퓨전 & 사이드 스플릿 헤비·라이트',
        weeklyGoalKo: '외전(중둔근)과 내전(안쪽 허벅지)의 입체 밸런스 완성',
        progressionNoteKo: '풋바 바레 펄스와 사이드 스플릿을 결합해 하체 라인을 다듬습니다.',
        recommendedComboIds: ['combo-ref-barre-fusion'],
        exerciseIds: [
          'world-reformer-fusion-barre-footbar-plie-pulse',
          'world-reformer-fusion-barre-footbar-arabesque',
          'world-reformer-fusion-barre-footbar-attitude',
          'world-reformer-reformer-side-splits-heavy',
          'world-reformer-reformer-side-splits-light',
          'world-reformer-longbox-grasshopper',
          'world-reformer-fusion-mobility-reformer-pigeon-footbar',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 불가리안·리버스 런지 피크 스컬프',
        weeklyGoalKo: '고강도 단측 둔근 제어와 1B 경량 밸런스 완주',
        progressionNoteKo: '가벼운 스프링(1B)과 단측 스플릿으로 4주 힙업 커리큘럼을 완성합니다.',
        recommendedComboIds: ['combo-ref-standing-glute-1r', 'combo-ref-straps-release-1r1b'],
        exerciseIds: [
          'world-reformer-reformer-high-bridge',
          'world-reformer-reformer-reverse-lunge',
          'world-reformer-reformer-curtsy-lunge',
          'world-reformer-fusion-athletic-reformer-bulgarian-squat',
          'world-reformer-fusion-athletic-reformer-single-leg-hinge',
          'world-reformer-reformer-straps-scissors-beats',
          'world-reformer-fusion-mobility-reformer-wgs-twist',
        ],
      },
    ],
  },
  {
    id: 'program-deep-core-4w',
    titleKo: '딥코어·복부 안정화 4주 파워하우스',
    subtitleKo: '복횡근·복사근·항회전 코어를 숏박스·헌드레드·팔로프 프레스로 단계 완성',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['reformer', 'mat'],
    level: '1.5',
    focusZone: 'core',
    schoolTag: 'classical',
    summaryKo: '목과 허리에 부담을 주지 않으면서 깊은 복부 지지력, 회전·항회전 제어, V자 티저까지 4주 만에 끌어올립니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 심부 복횡근 & 중립 골반 잠금',
        weeklyGoalKo: '팔다리 움직임 속 요추 중립 유지 능력 확립',
        progressionNoteKo: '목 부담 없는 수파인 코어와 기본 스트랩 연결에 집중합니다.',
        recommendedComboIds: ['combo-ref-supine-core-1r1b'],
        exerciseIds: [
          'world-mat-dead-bug-core',
          'world-mat-toe-taps',
          'world-reformer-reformer-supine-lat-pulldown',
          'world-reformer-reformer-hundred-classic',
          'world-reformer-reformer-knee-stretch-flat',
          'world-mat-shell-stretch',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 숏박스 4방향 & 항회전 팔로프',
        weeklyGoalKo: '굴곡·측굴·회전 및 측면 장력 항회전 코어 강화',
        progressionNoteKo: '숏박스 시리즈와 닐링 팔로프 프레스로 복사근을 입체적으로 자극합니다.',
        recommendedComboIds: ['combo-ref-shortbox-core'],
        exerciseIds: [
          'ex-core-02',
          'world-reformer-shortbox-flat-back',
          'world-reformer-shortbox-side-to-side',
          'world-reformer-shortbox-twist-reach',
          'world-reformer-fusion-athletic-reformer-pallof-press',
          'ex-cooldown-01',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 베어 호버·휠배로우 & 리버스 앱스',
        weeklyGoalKo: '가벼운 1R/1B 스프링에서의 항신전 플랭크 제어',
        progressionNoteKo: '캐리지 흔들림 제어 난이도를 한 단계 높여 파워하우스를 단단히 다집니다.',
        recommendedComboIds: ['combo-ref-advanced-plank'],
        exerciseIds: [
          'world-reformer-reformer-tictoc',
          'ex-core-04',
          'world-reformer-reformer-wheelbarrow',
          'world-reformer-reformer-bear-crawl',
          'world-reformer-fusion-athletic-reformer-knee-tuck-pike',
          'world-reformer-reformer-kneeling-mermaid',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 롱박스 티저·숏박스 티저·코펜하겐 통합',
        weeklyGoalKo: '중상급 전신 중심축 밸런스와 측면 코어 피크 완주',
        progressionNoteKo: '클래식 티저와 애슬레틱 코펜하겐 플랭크로 4주 코어를 완성합니다.',
        recommendedComboIds: ['combo-ref-shortbox-core', 'combo-mat-ab-series-5'],
        exerciseIds: [
          'crawled-reformer-longbox-teaser',
          'world-reformer-reformer-shortbox-teaser',
          'world-reformer-shortbox-around-the-world',
          'world-reformer-fusion-athletic-reformer-copenhagen',
          'crawled-reformer-short-spine-massage',
          'world-reformer-fusion-mobility-reformer-thread-needle',
        ],
      },
    ],
  },
  {
    id: 'program-upper-thoracic-4w',
    titleKo: '상체·굽은 등 완화 & 흉추 가동성 4주 흐름',
    subtitleKo: '목·어깨 긴장은 비우고 흉추 신전·견갑 안정화·쇄골 라인을 살리는 프로그램',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['reformer', 'cadillac'],
    level: '1.0',
    focusZone: 'shoulder',
    schoolTag: 'stott',
    summaryKo: '장시간 책상 업무로 굳기 쉬운 흉추와 어깨 앞면을 부드럽게 열고 등 상부·하부승모근 지지력을 길러주는 4주 흐름입니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 견갑 세팅 & 흉추 호흡 개방',
        weeklyGoalKo: '상부 승모근 힘 빼고 겨드랑이 아래 전거근·광배근 인지',
        progressionNoteKo: '누운·앉은 경량 스트랩으로 어깨 긴장 없이 움직임을 시작합니다.',
        recommendedComboIds: ['combo-ref-seated-arms-1b'],
        exerciseIds: [
          'ex-warmup-03',
          'world-mat-fusion-mobility-scapular-pushup',
          'world-reformer-supine-arm-circles',
          'world-reformer-seated-midback-row',
          'world-reformer-seated-offering',
          'world-reformer-fusion-mobility-reformer-thread-needle',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 롱박스 풀링 스트랩 & 흉추 신전',
        weeklyGoalKo: '엎드린 흉추 신전으로 등 상부 근력과 가슴 전면 개방',
        progressionNoteKo: '플로우·T-풀 스트랩으로 능형근과 하부승모근을 선명하게 깨웁니다.',
        recommendedComboIds: ['combo-ref-longbox-extension'],
        exerciseIds: [
          'world-reformer-longbox-overhead-press',
          'world-reformer-longbox-pulling-straps-plow',
          'world-reformer-longbox-pulling-straps-t',
          'world-reformer-seated-hug-a-tree',
          'world-reformer-seated-draw-a-sword',
          'ex-cooldown-01',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 캐딜락 푸쉬스루·롤백 바 흉추 확장',
        weeklyGoalKo: '상단 스프링 보조로 흉추 분절·회전·신전 범위 확대',
        progressionNoteKo: '캐딜락 상단 스프링의 탄력을 빌려 어깨 부담 없이 가동 범위를 넓힙니다.',
        recommendedComboIds: ['combo-cad-pushthrough-top', 'combo-cad-rollback-bar'],
        exerciseIds: [
          'world-cadillac-fusion-mobility-cadillac-spinal-wave',
          'world-cadillac-rollback-chest-opener',
          'world-cadillac-pushthrough-mermaid',
          'world-cadillac-cadillac-reverse-pushthrough',
          'world-cadillac-cadillac-prone-dart',
          'world-cadillac-cadillac-standing-rolldown',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 닐링 체스트 익스팬션 & 스완 플로우 완성',
        weeklyGoalKo: '중력 직립 자세에서 바른 상체 정렬 유지 지구력 확립',
        progressionNoteKo: '닐링·스탠딩 상체 동작으로 일상 속 가벼운 어깨 감각을 완성합니다.',
        recommendedComboIds: ['combo-ref-kneeling-arms-1b'],
        exerciseIds: [
          'world-reformer-kneeling-chest-expansion',
          'world-reformer-reformer-kneeling-salute',
          'world-reformer-reformer-kneeling-spine-twist',
          'world-reformer-shortbox-swan',
          'world-reformer-longbox-double-leg-kick',
          'world-reformer-reformer-kneeling-mermaid',
        ],
      },
    ],
  },
  {
    id: 'program-reformer-chair-combo-4w',
    titleKo: '리포머 + 운다 체어 콤비 4주 애슬레틱',
    subtitleKo: '리포머의 유려한 신장과 체어의 폭발적 코어·하체 파워를 결합한 콤비 수업',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['reformer', 'chair'],
    level: '2.0',
    focusZone: 'glutes',
    schoolTag: 'fusion-athletic',
    summaryKo: '중·상급 회원이나 주말 콤비 그룹 반을 위해 리포머 25분 + 운다 체어 25분 황금 리듬을 4주간 점진 설계했습니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 리포머 풋워크 + 체어 스텝업 기초',
        weeklyGoalKo: '두 기구의 스프링 특성 차이를 몸으로 체득하는 콤비 입문',
        progressionNoteKo: '리포머에서 정렬을 잡고 체어 스탠딩 하체로 에너지를 끌어올립니다.',
        recommendedComboIds: ['combo-ref-footwork-2r1b', 'combo-chr-footwork-seated'],
        exerciseIds: [
          'world-reformer-footwork-toes-parallel',
          'world-reformer-reformer-hundred-classic',
          'world-chair-chair-footwork-heels',
          'crawled-chair-going-up-front',
          'world-chair-chair-scapular-isolations',
          'world-chair-chair-standing-mermaid',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 리포머 런지 + 체어 스완·프레스업',
        weeklyGoalKo: '스탠딩 하체 버닝과 체어 프론 후면 사슬 통합',
        progressionNoteKo: '1R 리포머 스탠딩 직후 체어 엎드린 신전으로 전후면 균형을 맞춥니다.',
        recommendedComboIds: ['combo-ref-standing-glute-1r', 'combo-chr-prone-extension'],
        exerciseIds: [
          'ex-lower-01',
          'world-reformer-reformer-skating',
          'world-chair-chair-supine-bridge-pedal',
          'expanded-chair-swan',
          'world-chair-chair-prone-press-up',
          'world-chair-chair-hamstring-stretch-2',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 리포머 롱 스트레치 + 체어 파이크·클라이머',
        weeklyGoalKo: '두 기구의 대표 플랭크·파이크 코어 시그니처 도전',
        progressionNoteKo: '손목 분산을 위해 하체 스텝업과 파이크를 교차 배치합니다.',
        recommendedComboIds: ['combo-ref-advanced-plank', 'combo-chr-standing-glute'],
        exerciseIds: [
          'expanded-reformer-long-stretch',
          'world-reformer-reformer-arabesque',
          'crawled-chair-mountain-climber',
          'crawled-chair-pull-up-hamstring3',
          'world-chair-chair-side-plank-pedal',
          'ex-cooldown-01',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 애슬레틱 코펜하겐·텐던 스트레치 마스터 피크',
        weeklyGoalKo: '리포머·체어 상급 파워하우스와 단측 밸런스 완성',
        progressionNoteKo: '4주 누적 근력을 바탕으로 50분 마스터 콤비 클래스를 완주합니다.',
        recommendedComboIds: ['combo-chr-advanced-pike', 'combo-ref-straps-release-1r1b'],
        exerciseIds: [
          'world-reformer-fusion-athletic-reformer-knee-tuck-pike',
          'world-reformer-reformer-reverse-lunge',
          'world-chair-chair-mountain-climber-handsfree',
          'world-chair-chair-side-pullup-twist',
          'world-chair-fusion-athletic-chair-copenhagen',
          'world-reformer-reformer-straps-peter-pan',
        ],
      },
    ],
  },
  {
    id: 'program-cadillac-balance-4w',
    titleKo: '캐딜락 척추 분절·전신 밸런스 4주',
    subtitleKo: '롤백 바·푸쉬스루 바·레그/암 스프링까지 캐딜락 단독 50분 완벽 설계',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['cadillac'],
    level: '1.5',
    focusZone: 'spine',
    schoolTag: 'classical',
    summaryKo: '캐딜락 한 대로 워밍업부터 좌우 독립 스프링 밸런스, 타워, 에어플레인까지 단계적으로 완성하는 4주 프로그램입니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 롤백 바 & 수파인 레그 스프링 기초',
        weeklyGoalKo: '독립 스프링 좌우 대칭 감각과 척추 분절 리듬 익히기',
        progressionNoteKo: '상단 보조 스프링으로 편안하게 캐딜락 전신 흐름을 익힙니다.',
        recommendedComboIds: ['combo-cad-rollback-bar', 'combo-cad-legsprings-supine'],
        exerciseIds: [
          'crawled-cadillac-9-essential-flow',
          'original-cadillac-seated-roll-back',
          'world-cadillac-legsprings-frog',
          'world-cadillac-legsprings-circles',
          'world-cadillac-pushthrough-mermaid',
          'world-cadillac-cadillac-standing-rolldown',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 푸쉬스루 바 모빌리티 & 사이드 레그 스프링',
        weeklyGoalKo: '흉추 3방향 움직임과 중둔근 집중 활성화',
        progressionNoteKo: '누운 자세에서 옆으로 누운·앉은 자세로 부드럽게 확장합니다.',
        recommendedComboIds: ['combo-cad-pushthrough-top', 'combo-cad-side-legsprings'],
        exerciseIds: [
          'world-cadillac-pushthrough-seated-forward',
          'world-cadillac-pushthrough-cat-stretch',
          'world-cadillac-legsprings-side-clam',
          'world-cadillac-legsprings-side-circles',
          'world-cadillac-armsprings-kneeling-rowing',
          'world-cadillac-cadillac-ballet-stretches',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 타워 프렙·티저 & 스탠딩 암 스프링',
        weeklyGoalKo: '하단 세이프티 타워 브릿징과 스탠딩 항회전 상체 강화',
        progressionNoteKo: '세이프티 스트랩 하단 스프링 작업과 스탠딩 팔로프 프레스를 결합합니다.',
        recommendedComboIds: ['combo-cad-armsprings-standing'],
        exerciseIds: [
          'world-cadillac-pushthrough-supine-footwork',
          'crawled-cadillac-tower-prep',
          'crawled-cadillac-teaser-pushthrough',
          'world-cadillac-armsprings-boxing',
          'world-cadillac-fusion-athletic-cadillac-pallof',
          'crawled-cadillac-monkey',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 트라피즈 브리딩·에어플레인·스프레드 이글 마스터',
        weeklyGoalKo: '캐딜락 클래식 시그니처 전신 통합 완성',
        progressionNoteKo: '트라피즈와 상단 프레임 동작으로 캐딜락 고유의 역동성을 경험합니다.',
        recommendedComboIds: ['combo-cad-legsprings-supine'],
        exerciseIds: [
          'world-cadillac-trapeze-breathing',
          'world-cadillac-cadillac-teaser-top-rollup',
          'world-cadillac-cadillac-airplane',
          'world-cadillac-pushthrough-swan-dive',
          'crawled-cadillac-spread-eagle',
          'world-cadillac-cadillac-ballet-stretches',
        ],
      },
    ],
  },
  {
    id: 'program-barrel-mobility-4w',
    titleKo: '래더 바렐 & 스파인 코렉터 가동성 4주',
    subtitleKo: '아크 곡면을 활용한 깊은 흉추 개방, 옆구리 코어, 발레 스트레치 완성',
    durationWeeks: 4,
    targetMinutesPerClass: 45,
    apparatus: ['barrel'],
    level: '1.5',
    focusZone: 'lateral',
    schoolTag: 'classical',
    summaryKo: '스프링 대신 곡면 아크와 중력을 활용해 척추 4방향 가동성과 복부·측면 코어 근력을 균형 있게 키우는 4주 프로그램입니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 아크 바렐 호흡 & 흉추 오프닝',
        weeklyGoalKo: '스파인 코렉터 지지에서 편안한 컬업과 흉추 신전 감각 익히기',
        progressionNoteKo: '낮은 아크 바렐과 스파인 코렉터로 안전한 곡면 적응을 시작합니다.',
        recommendedComboIds: ['combo-brl-spine-corrector-legs'],
        exerciseIds: [
          'world-barrel-arc-barrel-thoracic-extension',
          'world-barrel-arc-barrel-hundred',
          'world-barrel-spine-corrector-chest-lift',
          'world-barrel-spine-corrector-shoulder-bridge',
          'world-barrel-spine-corrector-swan',
          'world-barrel-spine-corrector-mermaid',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 래더 바렐 숏박스 & 발레 스트레치',
        weeklyGoalKo: '사다리 고정 코어 지구력과 하체 3방향 유연성 확보',
        progressionNoteKo: '래더 바렐 숏박스 코어 직후 발레 스트레치로 개운함을 극대화합니다.',
        recommendedComboIds: ['combo-brl-shortbox-core', 'combo-brl-ballet-cooldown'],
        exerciseIds: [
          'crawled-barrel-shortbox-roundback',
          'world-barrel-barrel-shortbox-flat-back',
          'world-barrel-barrel-shortbox-twist',
          'world-barrel-barrel-ballet-stretch-front',
          'world-barrel-barrel-ballet-stretch-side',
          'world-barrel-barrel-ballet-stretch-back',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 사이드 싯업 & 스완·후면 사슬 강화',
        weeklyGoalKo: '중력 저항 측면 코어와 엎드린 등·둔근 탄력 집중',
        progressionNoteKo: '옆구리와 후면 사슬을 균형 있게 배치해 전신 탄력을 끌어올립니다.',
        recommendedComboIds: ['combo-brl-prone-posterior'],
        exerciseIds: [
          'crawled-barrel-side-sit-up',
          'world-barrel-barrel-side-leg-lift',
          'world-barrel-barrel-prone-swan-prep',
          'crawled-barrel-swan-dive-full',
          'world-barrel-barrel-prone-leg-beats',
          'world-barrel-barrel-layback-stretch',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 홀스백·레이아웃·클라임 어 트리 마스터',
        weeklyGoalKo: '바렐 클래식 상급 시그니처와 전신 가동성 통합',
        progressionNoteKo: '스파인 코렉터 헬리콥터와 래더 바렐 티저·트리를 매끄럽게 연결합니다.',
        recommendedComboIds: ['combo-brl-shortbox-core', 'combo-brl-ballet-cooldown'],
        exerciseIds: [
          'world-barrel-spine-corrector-helicopter',
          'world-barrel-barrel-teaser',
          'expanded-barrel-horseback',
          'world-barrel-barrel-layout-extension',
          'crawled-barrel-grasshopper',
          'crawled-barrel-climb-a-tree',
        ],
      },
    ],
  },
  {
    id: 'program-classical-mat34-8w',
    titleKo: '매트 클래식 34 마스터 8주 점진 완성',
    subtitleKo: '조셉 필라테스 정통 매트 34 레퍼토리를 초급→중급→상급 8주에 걸쳐 완전 정복',
    durationWeeks: 8,
    targetMinutesPerClass: 50,
    apparatus: ['mat'],
    level: '2.0',
    focusZone: 'core',
    schoolTag: 'classical',
    summaryKo: '클래식 매트 34의 정통 순서를 8주 단계별 커리큘럼으로 분해해 기초 호흡부터 티저·부메랑·컨트롤 밸런스까지 안전하게 도달합니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 파워하우스 & 기초 5동작',
        weeklyGoalKo: '헌드레드·하프 롤백·원레그 서클 정렬 확립',
        progressionNoteKo: '호흡과 중립 골반을 몸에 익히는 1단계 기초 블록입니다.',
        recommendedComboIds: ['combo-mat-ab-series-5'],
        exerciseIds: [
          'original-mat-rib-breath',
          'expanded-mat-hundred',
          'expanded-mat-half-roll-back',
          'expanded-mat-single-leg-circle',
          'crawled-mat-rolling-like-a-ball',
          'crawled-mat-spine-stretch-forward',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 클래식 앱 시리즈 5종 완성',
        weeklyGoalKo: '컬업 높이를 지킨 채 복부 5종 논스톱 연결',
        progressionNoteKo: '상체 컬업 지구력과 다리 각도 제어력을 집중 훈련합니다.',
        recommendedComboIds: ['combo-mat-ab-series-5'],
        exerciseIds: [
          'expanded-mat-roll-up',
          'original-mat-single-leg-stretch',
          'crawled-mat-double-leg-stretch',
          'world-mat-single-straight-leg-stretch',
          'world-mat-double-straight-leg-stretch',
          'world-mat-criss-cross',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 척추 회전·신전 & 후면 사슬',
        weeklyGoalKo: '쏘우·스파인 트위스트·스완·싱글/더블 레그 킥 연결',
        progressionNoteKo: '굴곡 중심 복부 운동에 회전과 신전을 균형 있게 통합합니다.',
        recommendedComboIds: ['combo-mat-mobility-warmup'],
        exerciseIds: [
          'crawled-mat-saw',
          'world-mat-spine-twist-classic',
          'original-mat-swan-prep',
          'crawled-mat-single-leg-kick',
          'expanded-mat-double-leg-kick',
          'world-mat-shell-stretch',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 사이드 킥 시리즈 & 숄더 브리지',
        weeklyGoalKo: '측면 골반 안정화와 편측 둔근 지구력 완성',
        progressionNoteKo: '옆으로 누운 자세의 모든 클래식 사이드 킥 변형을 익힙니다.',
        recommendedComboIds: ['combo-mat-side-kick-series'],
        exerciseIds: [
          'expanded-mat-side-kicks',
          'world-mat-side-kick-bicycle',
          'world-mat-side-kick-ronde-de-jambe',
          'world-mat-side-kick-beats',
          'world-mat-shoulder-bridge-classic',
          'original-mat-mermaid',
        ],
      },
      {
        weekNumber: 5,
        themeKo: '5주차 · 중급 롤링·코크스크류·넥 풀',
        weeklyGoalKo: '오픈 레그 라커와 코크스크류로 역동적 척추 분절 진입',
        progressionNoteKo: '복부 감속 브레이크와 회전 제어 능력을 끌어올립니다.',
        recommendedComboIds: ['combo-mat-ab-series-5'],
        exerciseIds: [
          'crawled-mat-open-leg-rocker',
          'crawled-mat-corkscrew',
          'crawled-mat-neck-pull',
          'expanded-mat-swimming',
          'expanded-mat-leg-pull-front',
          'crawled-mat-seal',
        ],
      },
      {
        weekNumber: 6,
        themeKo: '6주차 · 티저 I·II·III & 힙 서클',
        weeklyGoalKo: 'V자 파워하우스 중심축 밸런스와 전신 통합 리프트',
        progressionNoteKo: '티저 3단계 시리즈를 호흡과 함께 끊김 없이 연결합니다.',
        recommendedComboIds: ['combo-mat-ab-series-5'],
        exerciseIds: [
          'crawled-mat-teaser-classic',
          'world-mat-teaser-two',
          'world-mat-teaser-three',
          'expanded-mat-hip-circles',
          'expanded-mat-leg-pull-back',
          'expanded-mat-side-bend',
        ],
      },
      {
        weekNumber: 7,
        themeKo: '7주차 · 역전 제어 (롤 오버·잭나이프·하이 시저스)',
        weeklyGoalKo: '견갑대 지지 역전 동작의 안전한 진입과 분절 착지',
        progressionNoteKo: '경추 무리 없이 하복부와 후면 사슬을 깊게 통제합니다.',
        recommendedComboIds: ['combo-mat-side-kick-series'],
        exerciseIds: [
          'world-mat-roll-over',
          'crawled-mat-jack-knife',
          'crawled-mat-scissors-high',
          'expanded-mat-kneeling-side-kicks',
          'world-mat-swan-dive',
          'world-mat-shell-stretch',
        ],
      },
      {
        weekNumber: 8,
        themeKo: '8주차 · 클래식 34 피날레 (부메랑·컨트롤 밸런스·푸시업)',
        weeklyGoalKo: '최상급 클래식 매트 시그니처와 스탠딩 롤다운 푸시업 완주',
        progressionNoteKo: '8주 여정의 정점을 매끄러운 클래식 플로우로 완성합니다.',
        recommendedComboIds: ['combo-mat-ab-series-5', 'combo-mat-side-kick-series'],
        exerciseIds: [
          'crawled-mat-boomerang',
          'crawled-mat-control-balance',
          'world-mat-crab',
          'expanded-mat-rocking',
          'world-mat-star-side-plank',
          'crawled-mat-pilates-pushup',
        ],
      },
    ],
  },
  {
    id: 'program-jumpboard-cardio-4w',
    titleKo: '리포머 점프보드 유산소·하체 탄력 4주',
    subtitleKo: '관절 충격은 줄이고 심폐 활력·하체 탄력·코어 공중 제어력을 키우는 4주',
    durationWeeks: 4,
    targetMinutesPerClass: 45,
    apparatus: ['reformer'],
    level: '1.5',
    focusZone: 'hip',
    schoolTag: 'balanced-body',
    summaryKo: '점프보드의 부드러운 착지 기술부터 편측 홉, 사이드 라잉 점프, 코어 인터벌까지 단계적으로 심폐 지구력을 끌어올립니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 무음 착지 & 패럴렐·V 점프 입문',
        weeklyGoalKo: '발가락→발볼→뒤꿈치 롤링 착지와 허리 중립 유지',
        progressionNoteKo: '점프 높이보다 조용하고 탄력 있는 착지 감각을 먼저 잡습니다.',
        recommendedComboIds: ['combo-ref-jumpboard-cardio'],
        exerciseIds: [
          'ex-warmup-01',
          'world-reformer-jumpboard-parallel-jump',
          'world-reformer-jumpboard-pilates-v',
          'world-reformer-reformer-supine-lat-pulldown',
          'world-reformer-reformer-straps-leg-lowers',
          'ex-cooldown-01',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 와이드 프로그 & 코어 인터벌',
        weeklyGoalKo: '점프 유산소와 수파인 스트랩 코어를 교차 배치해 심박 유지',
        progressionNoteKo: '유산소 블록과 정적 코어 블록을 교차해 지루함 없이 몰입도를 높입니다.',
        recommendedComboIds: ['combo-ref-jumpboard-cardio', 'combo-ref-supine-core-1r1b'],
        exerciseIds: [
          'world-reformer-jumpboard-parallel-jump',
          'world-reformer-jumpboard-wide-frog',
          'world-reformer-reformer-hundred-classic',
          'world-reformer-supine-triceps-press',
          'world-reformer-reformer-straps-scissors-beats',
          'world-reformer-reformer-hip-flexor-stretch',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 싱글 레그 홉 & 사이드 라잉 점프',
        weeklyGoalKo: '1R 경량 스프링에서 편측 착지 안정성과 중둔근 폭발력 강화',
        progressionNoteKo: '단측 점프로 난이도를 올리되 스프링을 1R로 낮춰 무릎을 보호합니다.',
        recommendedComboIds: ['combo-ref-side-lying-hip-1r'],
        exerciseIds: [
          'world-reformer-jumpboard-pilates-v',
          'world-reformer-jumpboard-single-leg-hop',
          'world-reformer-jumpboard-side-lying-jump',
          'world-reformer-reformer-side-lying-clam',
          'world-reformer-reformer-straps-peter-pan',
          'world-reformer-fusion-mobility-reformer-pigeon-footbar',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 전신 점프보드 애슬레틱 피크',
        weeklyGoalKo: '점프보드 5종 + 베어 파이크로 활력 넘치는 45분 완주',
        progressionNoteKo: '전신 유산소와 깊은 하체 릴리즈의 조화로 개운하게 마무리합니다.',
        recommendedComboIds: ['combo-ref-jumpboard-cardio', 'combo-ref-straps-release-1r1b'],
        exerciseIds: [
          'world-reformer-jumpboard-parallel-jump',
          'world-reformer-jumpboard-wide-frog',
          'world-reformer-jumpboard-single-leg-hop',
          'world-reformer-jumpboard-side-lying-jump',
          'world-reformer-reformer-bear-crawl',
          'world-reformer-reformer-eves-lunge-stretch',
        ],
      },
    ],
  },
  {
    id: 'program-props-mat-signature-4w',
    titleKo: '소도구 매트 시그니처 4주 (미니볼·써클링·폼롤러·밴드)',
    subtitleKo: '매주 메인 소도구 1~2개로 대기구 못지않은 자극을 만드는 소그룹·홈트 4주',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['mat'],
    level: '1.5',
    focusZone: 'core',
    schoolTag: 'korean-studio',
    summaryKo: '대기구 없이도 매트와 소도구만으로 내전근, 중둔근, 상체, 고유수용감각까지 완벽하게 자극하는 4주 테마 수업입니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 미니볼 딥코어 & 내전근 주간',
        weeklyGoalKo: '미니볼 탄성 피드백으로 복부·내전근·흉추 신전 동시 자극',
        progressionNoteKo: '미니볼 하나로 누운·앉은·엎드린 전신 흐름을 완성합니다.',
        recommendedComboIds: ['combo-mat-miniball-core'],
        exerciseIds: [
          'world-mat-miniball-thoracic-curl',
          'world-mat-miniball-inner-thigh-bridge',
          'world-mat-miniball-sacrum-scissors',
          'world-mat-miniball-seated-c-curve',
          'world-mat-miniball-oblique-twist',
          'world-mat-miniball-prone-swan-press',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 써클링 라인 스컬프 주간',
        weeklyGoalKo: '양방향 등척성 저항으로 팔·허벅지 안팎·복부 탄력 강화',
        progressionNoteKo: '관절 충격 없이 높은 수축감을 이끌어내는 써클링 시그니처입니다.',
        recommendedComboIds: ['combo-mat-circle-sculpt'],
        exerciseIds: [
          'world-mat-circle-chest-press',
          'world-mat-circle-inner-thigh-press',
          'world-mat-circle-outer-thigh-abduction',
          'world-mat-circle-supine-hundred',
          'world-mat-circle-roll-up',
          'world-mat-circle-teaser',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 폼롤러 밸런스 & 근막 이완 주간',
        weeklyGoalKo: '불안정 지지면에서 깊은 다열근·복횡근·햄스트링 활성화',
        progressionNoteKo: '어깨 개방으로 시작해 데드버그·롤아웃까지 균형 감각을 끌어올립니다.',
        recommendedComboIds: ['combo-mat-roller-balance'],
        exerciseIds: [
          'ex-warmup-03',
          'world-mat-roller-angel-arms',
          'world-mat-roller-marching',
          'world-mat-roller-dead-bug',
          'world-mat-roller-bridge-rollout',
          'world-mat-roller-prone-swan',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 밴드·보수·슬라이더 애슬레틱 퓨전 주간',
        weeklyGoalKo: '루프밴드·세라밴드·토닝볼·슬라이더로 전신 에너지 피크',
        progressionNoteKo: '소도구 퓨전으로 대기구 수업 이상의 성취감을 제공합니다.',
        recommendedComboIds: ['combo-mat-mobility-warmup'],
        exerciseIds: [
          'world-mat-fusion-athletic-loopband-clamshell',
          'world-mat-loopband-monster-walk',
          'world-mat-fusion-athletic-toningball-upper-combo',
          'world-mat-fusion-athletic-sliders-hamstring-curl',
          'world-mat-sliders-core-pike',
          'world-mat-theraband-leg-circles',
        ],
      },
    ],
  },
  {
    id: 'program-chair-barrel-sculpt-4w',
    titleKo: '체어 + 바렐 2기구 콤비 4주 옆구리·힙 스컬프',
    subtitleKo: '운다 체어의 하체·파이크와 래더 바렐의 측굴·스완을 결합한 50분 콤비',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['chair', 'barrel'],
    level: '1.5',
    focusZone: 'lateral',
    schoolTag: 'korean-studio',
    summaryKo: '국내 스튜디오에서 인기 높은 체어+바렐 콤비 반을 위해 4주 동안 옆구리·힙·등 라인을 입체적으로 조각합니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 체어 풋워크 + 바렐 아크 워밍업',
        weeklyGoalKo: '체어 직립 하체 정렬과 바렐 흉추·복부 기초 연결',
        progressionNoteKo: '체어 시티드 풋워크 직후 바렐 숏박스 라운드 백으로 매끄럽게 전환합니다.',
        recommendedComboIds: ['combo-chr-footwork-seated', 'combo-brl-ballet-cooldown'],
        exerciseIds: [
          'world-chair-chair-footwork-toes',
          'world-chair-chair-footwork-pilates-v',
          'world-chair-chair-kneeling-cat',
          'crawled-barrel-shortbox-roundback',
          'world-barrel-barrel-prone-swan-prep',
          'world-barrel-barrel-ballet-stretch-front',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 체어 스탠딩 펌프 + 바렐 사이드 싯업',
        weeklyGoalKo: '중둔근 단측 안정화와 바렐 옆구리 코어 집중',
        progressionNoteKo: '측면 하체와 측면 복부를 연달아 자극해 매끄러운 허리·힙 라인을 만듭니다.',
        recommendedComboIds: ['combo-brl-shortbox-core'],
        exerciseIds: [
          'world-chair-chair-standing-pump-side',
          'world-chair-chair-standing-pump-back',
          'world-chair-chair-seated-one-arm-press',
          'crawled-barrel-side-sit-up',
          'world-barrel-barrel-side-leg-lift',
          'world-barrel-barrel-ballet-stretch-side',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 체어 바레 퓨전 + 바렐 스완·애티튜드',
        weeklyGoalKo: '바레 퓨전 힙 펄스와 엎드린 후면 사슬 강화',
        progressionNoteKo: '리드미컬한 바레 펄스로 수업 활력을 끌어올립니다.',
        recommendedComboIds: ['combo-chr-barre-standing', 'combo-brl-prone-posterior'],
        exerciseIds: [
          'world-chair-fusion-barre-chair-plie-heel-lift',
          'world-chair-fusion-barre-chair-arabesque-press',
          'world-barrel-fusion-barre-barrel-attitude-pulse',
          'crawled-barrel-swan-dive-full',
          'world-barrel-barrel-prone-leg-beats',
          'world-barrel-fusion-mobility-barrel-pigeon-release',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 체어 파이크·사이드 바디 트위스트 + 바렐 홀스백',
        weeklyGoalKo: '2기구 중상급 코어·둔근 시그니처 피날레',
        progressionNoteKo: '4주 누적 체력으로 체어·바렐 대표 심화 동작을 완주합니다.',
        recommendedComboIds: ['combo-chr-advanced-pike', 'combo-brl-ballet-cooldown'],
        exerciseIds: [
          'crawled-chair-going-up-side',
          'crawled-chair-pull-up-hamstring3',
          'world-chair-chair-side-body-twist',
          'world-barrel-barrel-teaser',
          'crawled-barrel-grasshopper',
          'crawled-barrel-climb-a-tree',
        ],
      },
    ],
  },
  {
    id: 'program-barre-mobility-fusion-4w',
    titleKo: '바레·모빌리티 퓨전 4주 밸런스 플로우',
    subtitleKo: '굳은 고관절·흉추를 여는 모빌리티와 우아한 바레 힙·내전근 버닝의 조화',
    durationWeeks: 4,
    targetMinutesPerClass: 50,
    apparatus: ['reformer', 'mat', 'cadillac'],
    level: '1.5',
    focusZone: 'hip',
    schoolTag: 'fusion-barre',
    summaryKo: '트렌디한 모빌리티 오프닝과 바레 퓨전 하체 스컬프, 기능성 코어를 조화롭게 엮은 현대 부티크 스튜디오용 4주 프로그램입니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 90/90 모빌리티 + 매트 바레 스컬프',
        weeklyGoalKo: '고관절 가동성 확장 후 중둔근·내전근 탄력 집중',
        progressionNoteKo: '관절이 열린 상태에서 바레 펄스를 진행해 자극 효율을 높입니다.',
        recommendedComboIds: ['combo-mat-mobility-warmup'],
        exerciseIds: [
          'world-mat-fusion-mobility-9090-hip-switch',
          'world-mat-fusion-mobility-9090-shinbox-lift',
          'world-mat-fusion-barre-mat-wide-plie-arms',
          'world-mat-fusion-barre-mat-pretzel-glute',
          'world-mat-fusion-barre-mat-passe-releve',
          'world-mat-fusion-mobility-pigeon-hip-release',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 리포머 풋바 바레 + 팔로프 항회전',
        weeklyGoalKo: '고정 풋바 바레 4종과 리포머 항회전 코어 결합',
        progressionNoteKo: '스탠딩 하체 버닝 직후 닐링 코어와 피전 스트레치로 마무리합니다.',
        recommendedComboIds: ['combo-ref-barre-fusion'],
        exerciseIds: [
          'world-reformer-fusion-barre-footbar-releve',
          'world-reformer-fusion-barre-footbar-plie-pulse',
          'world-reformer-fusion-barre-footbar-arabesque',
          'world-reformer-fusion-barre-footbar-attitude',
          'world-reformer-fusion-athletic-reformer-pallof-press',
          'world-reformer-fusion-mobility-reformer-pigeon-footbar',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 캐딜락 폴 바레 + 척추 웨이브 플로우',
        weeklyGoalKo: '캐딜락 폴 턴아웃 밸런스와 푸쉬스루 척추 파동 연결',
        progressionNoteKo: '상체·척추 이완과 하체 바레 리듬의 대비를 살립니다.',
        recommendedComboIds: ['combo-cad-pushthrough-top'],
        exerciseIds: [
          'world-cadillac-fusion-mobility-cadillac-spinal-wave',
          'world-cadillac-fusion-barre-cadillac-plie-releve',
          'world-cadillac-fusion-barre-cadillac-arabesque-pulse',
          'world-cadillac-fusion-barre-cadillac-attitude-passe',
          'world-cadillac-pushthrough-mermaid',
          'world-cadillac-cadillac-ballet-stretches',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 전신 모빌리티·바레·애슬레틱 퓨전 완성',
        weeklyGoalKo: '가동성·근지구력·밸런스가 어우러진 부티크 시그니처 50분',
        progressionNoteKo: '딥 스쿼트 모빌리티부터 월드 그레이티스트 런지 트위스트까지 유려하게 마무리합니다.',
        recommendedComboIds: ['combo-mat-mobility-warmup', 'combo-ref-barre-fusion'],
        exerciseIds: [
          'world-mat-fusion-mobility-deep-squat-thoracic-reach',
          'world-mat-fusion-mobility-spinal-wave',
          'world-reformer-fusion-barre-footbar-arabesque',
          'world-reformer-fusion-athletic-reformer-standing-pallof',
          'world-reformer-fusion-mobility-reformer-wgs-twist',
          'world-mat-fusion-mobility-thoracic-windmill',
        ],
      },
    ],
  },
  {
    id: 'program-full-studio-mastery-8w',
    titleKo: '전 기구 마스터 8주 풀 스튜디오 순환',
    subtitleKo: '리포머·캐딜락·체어·바렐·매트 5대 기구 중상급 레퍼토리를 8주간 체계적 마스터',
    durationWeeks: 8,
    targetMinutesPerClass: 60,
    apparatus: ['reformer', 'cadillac', 'chair', 'barrel', 'mat'],
    level: '2.0',
    focusZone: 'core',
    schoolTag: 'classical',
    summaryKo: '1:1 VIP 장기 회원이나 강사 워크숍을 위해 5대 기구 전체의 중급·상급 핵심 동작을 8주 순환 커리큘럼으로 정교하게 설계했습니다.',
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 리포머 클래식 오더 (중급)',
        weeklyGoalKo: '풋워크·헌드레드·숏박스·롱 스트레치 표준 흐름 정립',
        progressionNoteKo: '전 기구 순환의 기준축이 되는 리포머 파워하우스를 세웁니다.',
        recommendedComboIds: ['combo-ref-footwork-2r1b', 'combo-ref-shortbox-core'],
        exerciseIds: [
          'world-reformer-footwork-pilates-v',
          'world-reformer-reformer-hundred-classic',
          'ex-core-02',
          'expanded-reformer-long-stretch',
          'crawled-reformer-short-spine-massage',
          'ex-cooldown-01',
        ],
      },
      {
        weekNumber: 2,
        themeKo: '2주차 · 캐딜락 타워 & 레그/암 스프링 통합',
        weeklyGoalKo: '독립 스프링 대칭 제어와 타워·티저 분절 완성',
        progressionNoteKo: '리포머에서 발견한 좌우 편차를 캐딜락 독립 스프링으로 정교화합니다.',
        recommendedComboIds: ['combo-cad-legsprings-supine', 'combo-cad-rollback-bar'],
        exerciseIds: [
          'world-cadillac-rollback-single-arm-twist',
          'crawled-cadillac-teaser-pushthrough',
          'crawled-cadillac-tower-prep',
          'world-cadillac-legsprings-circles',
          'world-cadillac-armsprings-boxing',
          'crawled-cadillac-monkey',
        ],
      },
      {
        weekNumber: 3,
        themeKo: '3주차 · 운다 체어 스탠딩 & 파이크 밸런스',
        weeklyGoalKo: '좁은 지지면에서의 단측 하체·복부 제어력 강화',
        progressionNoteKo: '체어 특유의 수직 저항으로 중둔근과 전거근을 집중 단련합니다.',
        recommendedComboIds: ['combo-chr-standing-glute', 'combo-chr-prone-extension'],
        exerciseIds: [
          'world-chair-chair-single-leg-pump-seated',
          'crawled-chair-going-up-front',
          'crawled-chair-going-up-side',
          'crawled-chair-pull-up-hamstring3',
          'expanded-chair-swan',
          'world-chair-chair-standing-mermaid',
        ],
      },
      {
        weekNumber: 4,
        themeKo: '4주차 · 래더 바렐 & 스파인 코렉터 척추 아크',
        weeklyGoalKo: '3차원 척추 가동성과 중력 저항 후면 사슬 완성',
        progressionNoteKo: '중간 점검 주간으로 척추 전 방향 유연성과 밸런스를 재정비합니다.',
        recommendedComboIds: ['combo-brl-shortbox-core', 'combo-brl-spine-corrector-legs'],
        exerciseIds: [
          'world-barrel-spine-corrector-scissors',
          'world-barrel-barrel-shortbox-around-world',
          'crawled-barrel-side-sit-up',
          'crawled-barrel-swan-dive-full',
          'crawled-barrel-grasshopper',
          'crawled-barrel-climb-a-tree',
        ],
      },
      {
        weekNumber: 5,
        themeKo: '5주차 · 리포머 상급 스플릿·스네이크·세미서클',
        weeklyGoalKo: '고급 리포머 시그니처의 부드러운 연결과 균형 유지',
        progressionNoteKo: '가벼운 스프링 제어와 편측 스탠딩 상급 단계에 진입합니다.',
        recommendedComboIds: ['combo-ref-advanced-plank'],
        exerciseIds: [
          'crawled-reformer-semicircle',
          'world-reformer-reformer-long-spine-massage',
          'crawled-reformer-snake-twist',
          'world-reformer-reformer-star',
          'crawled-reformer-russian-splits',
          'world-reformer-reformer-front-splits-hands-free',
        ],
      },
      {
        weekNumber: 6,
        themeKo: '6주차 · 캐딜락 에어플레인·기요틴·행잉 상급',
        weeklyGoalKo: '역전 코어와 현수 신전의 안전한 상급 컨트롤',
        progressionNoteKo: '강사의 세심한 스포팅과 호흡 리듬으로 캐딜락 고급 흐름을 완주합니다.',
        recommendedComboIds: ['combo-cad-armsprings-standing'],
        exerciseIds: [
          'world-cadillac-trapeze-breathing',
          'world-cadillac-cadillac-guillotine',
          'world-cadillac-cadillac-airplane',
          'world-cadillac-cadillac-spread-eagle-single',
          'crawled-cadillac-hanging-pullups',
          'world-cadillac-cadillac-ballet-stretches',
        ],
      },
      {
        weekNumber: 7,
        themeKo: '7주차 · 체어 원암 푸시업·스타 + 바렐 레이아웃',
        weeklyGoalKo: '단측 상체·측면 코어·긴 지렛대 복부 최고 수준 통합',
        progressionNoteKo: '체어와 바렐의 최상급 동작을 균형 있게 교차 구성합니다.',
        recommendedComboIds: ['combo-chr-advanced-pike', 'combo-brl-ballet-cooldown'],
        exerciseIds: [
          'world-chair-chair-one-arm-pushup',
          'world-chair-chair-standing-pike-one-arm',
          'world-chair-chair-star',
          'world-barrel-barrel-layout-extension',
          'world-barrel-barrel-swan-arms-overhead',
          'world-barrel-barrel-layback-stretch',
        ],
      },
      {
        weekNumber: 8,
        themeKo: '8주차 · 5대 기구 마스터 쇼케이스 60분',
        weeklyGoalKo: '매트·리포머·캐딜락·체어·바렐 핵심 시그니처 그랜드 피날레',
        progressionNoteKo: '8주 동안 쌓아 올린 전신 통합 컨트롤을 한 세션에 우아하게 담아냅니다.',
        recommendedComboIds: ['combo-ref-straps-release-1r1b', 'combo-brl-ballet-cooldown'],
        exerciseIds: [
          'crawled-mat-boomerang',
          'world-reformer-reformer-balance-control-pushup',
          'crawled-reformer-longbox-teaser',
          'world-cadillac-cadillac-teaser-top-rollup',
          'world-chair-chair-tendon-stretch',
          'world-barrel-barrel-teaser',
        ],
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// AUTOMATIC 4-WEEK PROGRESSIVE CURRICULUM GENERATOR
// -----------------------------------------------------------------------------

export interface GeneratedFourWeekPlan {
  readonly titleKo: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly weeks: readonly {
    readonly weekNumber: 1 | 2 | 3 | 4;
    readonly themeKo: string;
    readonly strategyKo: string;
    readonly steps: readonly SequenceStep[];
    readonly mutatedExercises: readonly WorldPilatesExercise[];
  }[];
}

export function generateFourWeekProgram(
  baseSteps: readonly SequenceStep[],
  exercises: readonly (PilatesExercise | WorldPilatesExercise)[] = WORLD_PILATES_EXERCISES,
  options?: { readonly titleKo?: string },
): GeneratedFourWeekPlan {
  const byId = new Map<string, WorldPilatesExercise>();
  for (const ex of WORLD_PILATES_EXERCISES) byId.set(ex.id, ex);
  for (const ex of exercises) byId.set(ex.id, toWorldExercise(ex));

  const exerciseSteps = baseSteps.filter((s) => s.kind !== 'rest');
  const apparatuses = new Set<ApparatusType>();
  for (const s of exerciseSteps) {
    const ex = byId.get(s.exerciseId);
    if (ex) apparatuses.add(ex.apparatus);
  }
  const apparatus: ApparatusType | 'mixed' =
    apparatuses.size === 1 ? [...apparatuses][0]! : 'mixed';

  const pickWeekVariant = (
    baseEx: WorldPilatesExercise,
    weekNumber: 2 | 3 | 4,
    usedIdsAcrossWeeks: ReadonlySet<string>,
  ): WorldPilatesExercise => {
    // Keep warmup & cooldown gentle and steady unless prop variation is smooth
    const isGentleBlock =
      baseEx.blockCategory === 'warmup' || baseEx.blockCategory === 'cooldown';
    const tree = getProgressionTree(baseEx.id);

    if (weekNumber === 2) {
      // Week 2: Prop feedback or subtle tempo/rotation variation
      const propCandidate = tree.propVariations
        .map((n) => byId.get(n.id))
        .find((ex): ex is WorldPilatesExercise => Boolean(ex && !usedIdsAcrossWeeks.has(ex.id)));
      if (propCandidate) return propCandidate;
      if (!isGentleBlock) {
        return remixExerciseVariation(baseEx, {
          prop: baseEx.props.includes('mini-ball') ? 'magic-circle' : 'mini-ball',
        });
      }
      return baseEx;
    }

    if (weekNumber === 3) {
      // Week 3: Unilateral / Light-Spring / Pulse progression for main blocks
      if (isGentleBlock) return baseEx;
      const harderCandidate = tree.harder
        .map((n) => byId.get(n.id))
        .find((ex): ex is WorldPilatesExercise => Boolean(ex && !usedIdsAcrossWeeks.has(ex.id)));
      if (harderCandidate) return harderCandidate;
      return remixExerciseVariation(baseEx, {
        modifier: baseEx.isUnilateral ? 'pulse' : 'single-leg',
      });
    }

    // Week 4: Mastery flow — pick an unused progression or rich rotation/hold mastery remix
    if (isGentleBlock) {
      const rotationCandidate = tree.harder
        .concat(tree.propVariations)
        .map((n) => byId.get(n.id))
        .find((ex): ex is WorldPilatesExercise => Boolean(ex && !usedIdsAcrossWeeks.has(ex.id)));
      return rotationCandidate ?? baseEx;
    }

    const unusedHarder = tree.harder
      .map((n) => byId.get(n.id))
      .find((ex): ex is WorldPilatesExercise => Boolean(ex && !usedIdsAcrossWeeks.has(ex.id)));
    if (unusedHarder) return unusedHarder;

    const nextMod: RemixModifier =
      baseEx.apparatus === 'reformer' || baseEx.apparatus === 'chair'
        ? 'light-spring'
        : !baseEx.spinalPlanes.includes('rotation')
          ? 'rotation'
          : 'hold';
    return remixExerciseVariation(baseEx, { modifier: nextMod });
  };

  const usedMainIds = new Set<string>(
    exerciseSteps
      .filter((s) => s.blockCategory !== 'warmup' && s.blockCategory !== 'cooldown')
      .map((s) => s.exerciseId),
  );

  const week1Steps: SequenceStep[] = baseSteps.map((step, i) => ({
    ...step,
    stepId: `w1-${step.stepId || i + 1}`,
    order: i + 1,
  }));

  const buildDerivedWeek = (
    weekNumber: 2 | 3 | 4,
    themeKo: string,
    strategyKo: string,
  ) => {
    const mutated: WorldPilatesExercise[] = [];
    const steps: SequenceStep[] = baseSteps.map((step, i) => {
      if (step.kind === 'rest' || step.locked) {
        return { ...step, stepId: `w${weekNumber}-${step.stepId || i + 1}`, order: i + 1 };
      }
      const baseEx = byId.get(step.exerciseId);
      if (!baseEx) {
        return { ...step, stepId: `w${weekNumber}-${step.stepId || i + 1}`, order: i + 1 };
      }
      const nextEx = pickWeekVariant(baseEx, weekNumber, usedMainIds);
      if (nextEx.id !== baseEx.id) {
        usedMainIds.add(nextEx.id);
        mutated.push(nextEx);
      }
      return {
        ...step,
        stepId: `w${weekNumber}-${step.stepId || i + 1}`,
        order: i + 1,
        exerciseId: nextEx.id,
        selectedLayer:
          weekNumber === 4 ? 'hard' : weekNumber === 3 ? 'standard' : step.selectedLayer,
        instructorNote:
          nextEx.id !== baseEx.id
            ? `${weekNumber}주차 점진 변주: ${nextEx.nameKo}`
            : step.instructorNote,
      };
    });

    return { weekNumber, themeKo, strategyKo, steps, mutatedExercises: mutated };
  };

  const week2 = buildDerivedWeek(
    2,
    '2주차 · 소도구 피드백 & 정렬 정교화',
    '1주차 동선과 체위를 유지하면서 메인 동작에 소도구 변주를 얹어 자극 인지력을 높입니다.',
  );
  const week3 = buildDerivedWeek(
    3,
    '3주차 · 편측·템포 심화 빌드업',
    '싱글 레그·펄스·회전 변형으로 좌우 균형과 근지구력을 한 단계 끌어올립니다.',
  );
  const week4 = buildDerivedWeek(
    4,
    '4주차 · 통합 컨트롤 & 마스터 플로우',
    '경량 스프링 제어와 복합 회전·홀드 변주로 4주 성장 체감을 완성합니다.',
  );

  return {
    titleKo: options?.titleKo ?? '자동 생성 4주 점진 필라테스 커리큘럼',
    apparatus,
    weeks: [
      {
        weekNumber: 1,
        themeKo: '1주차 · 기초 정렬 & 호흡 세팅',
        strategyKo: '입력한 1회차 수업을 기준으로 정확한 정렬과 호흡 리듬을 몸에 익힙니다.',
        steps: week1Steps,
        mutatedExercises: [],
      },
      week2,
      week3,
      week4,
    ],
  };
}

// -----------------------------------------------------------------------------
// ONE-TAP LAST-WEEK DUPLICATE SWAPPER
// -----------------------------------------------------------------------------

export interface StepReplacementRecord {
  readonly stepId: string;
  readonly stepIndex: number;
  readonly previousExerciseId: string;
  readonly previousNameKo: string;
  readonly nextExerciseId: string;
  readonly nextNameKo: string;
  readonly reasonKo: string;
}

export interface ReplaceRepeatedResult {
  readonly steps: readonly SequenceStep[];
  readonly replacements: readonly StepReplacementRecord[];
  readonly replacedCount: number;
  readonly keptLockedIds: readonly string[];
}

export function replaceRepeatedFromLastWeek(
  steps: readonly SequenceStep[],
  recentExerciseIds: readonly string[],
  pool: readonly (PilatesExercise | WorldPilatesExercise)[] = WORLD_PILATES_EXERCISES,
): ReplaceRepeatedResult {
  const recentSet = new Set(recentExerciseIds);
  const poolWorld = pool.map(toWorldExercise);
  const byId = new Map<string, WorldPilatesExercise>(poolWorld.map((ex) => [ex.id, ex]));
  for (const ex of WORLD_PILATES_EXERCISES) {
    if (!byId.has(ex.id)) byId.set(ex.id, ex);
  }

  const usedInSequence = new Set<string>(
    steps.filter((s) => s.kind !== 'rest').map((s) => s.exerciseId),
  );
  const replacements: StepReplacementRecord[] = [];
  const keptLockedIds: string[] = [];

  const nextSteps: SequenceStep[] = steps.map((step, index) => {
    if (step.kind === 'rest') return step;
    if (!recentSet.has(step.exerciseId)) return step;
    if (step.locked) {
      keptLockedIds.push(step.stepId);
      return step;
    }

    const currentEx = byId.get(step.exerciseId);
    if (!currentEx) return step;

    const prevStep = index > 0 ? steps[index - 1] : undefined;
    const prevEx = prevStep && prevStep.kind !== 'rest' ? byId.get(prevStep.exerciseId) : undefined;

    let bestCandidate: WorldPilatesExercise | null = null;
    let bestScore = -Infinity;

    for (const cand of poolWorld) {
      if (cand.id === currentEx.id) continue;
      if (recentSet.has(cand.id) || usedInSequence.has(cand.id)) continue;

      let score = 0;
      if (cand.apparatus === currentEx.apparatus) score += 60;
      else score -= 50;

      if (cand.blockCategory === currentEx.blockCategory) score += 35;
      else if (cand.anatomyInsight.anatomyVisualZone === currentEx.anatomyInsight.anatomyVisualZone) {
        score += 15;
      }

      if (cand.bodyPosition === currentEx.bodyPosition) score += 20;
      if (normalizeSpringKey(cand.springs) === normalizeSpringKey(currentEx.springs)) score += 16;
      if (cand.box === currentEx.box) score += 12;

      if (cand.level === currentEx.level) score += 10;
      else if (
        Math.abs(
          (cand.level === '1.0' ? 1 : cand.level === '1.5' ? 2 : 3) -
            (currentEx.level === '1.0' ? 1 : currentEx.level === '1.5' ? 2 : 3),
        ) === 1
      ) {
        score += 4;
      }

      // Bonus for staying smooth from previous step
      if (prevEx) {
        const trans = computeExerciseTransitionCost(prevEx, cand);
        score -= trans.transitionCost * 0.5;
      }

      // Fresh archetype preferred over trivial same-parent tweak, though sibling variation is still valid
      if (cand.parentArchetypeId !== currentEx.parentArchetypeId) score += 8;

      if (
        score > bestScore ||
        (score === bestScore && bestCandidate && cand.id < bestCandidate.id)
      ) {
        bestScore = score;
        bestCandidate = cand;
      }
    }

    if (!bestCandidate) return step;

    usedInSequence.add(bestCandidate.id);
    const samePos = bestCandidate.bodyPosition === currentEx.bodyPosition;
    const sameSpring =
      normalizeSpringKey(bestCandidate.springs) === normalizeSpringKey(currentEx.springs);
    const reasonKo =
      samePos && sameSpring
        ? `지난주 중복 제외 · 같은 ${POSITION_SHORT_KO[bestCandidate.bodyPosition]}와 스프링 유지 교체`
        : samePos
          ? `지난주 중복 제외 · 같은 ${POSITION_SHORT_KO[bestCandidate.bodyPosition]}의 새 자극으로 교체`
          : `지난주 중복 제외 · 같은 ${BLOCK_SHORT_KO[bestCandidate.blockCategory]} 목적의 새 동작으로 교체`;

    replacements.push({
      stepId: step.stepId,
      stepIndex: index,
      previousExerciseId: currentEx.id,
      previousNameKo: currentEx.nameKo,
      nextExerciseId: bestCandidate.id,
      nextNameKo: bestCandidate.nameKo,
      reasonKo,
    });

    return {
      ...step,
      exerciseId: bestCandidate.id,
      blockCategory: bestCandidate.blockCategory,
      instructorNote: `지난주 중복 교체 · ${bestCandidate.nameKo}`,
    };
  });

  return {
    steps: nextSteps,
    replacements,
    replacedCount: replacements.length,
    keptLockedIds,
  };
}

// -----------------------------------------------------------------------------
// INSTANT 0.5-SEC IN-CLASS PLAN B ALTERNATIVE FINDER
// -----------------------------------------------------------------------------

export type PlanBConstraint = 'wrist' | 'neck' | 'knee' | 'easier' | 'harder';

export interface PlanBAlternativeItem {
  readonly exercise: WorldPilatesExercise;
  readonly reasonKo: string;
  readonly transitionCost: number;
}

export interface PlanBAlternativeResult {
  readonly constraint: PlanBConstraint;
  readonly constraintLabelKo: string;
  readonly primary: PlanBAlternativeItem | null;
  readonly alternatives: readonly PlanBAlternativeItem[];
  readonly rationaleKo: string;
}

const CONSTRAINT_LABELS_KO: Readonly<Record<PlanBConstraint, string>> = {
  wrist: '손목 편하게 (체중 지지 제외)',
  neck: '목 부담 ↓ (머리 지지·중립 유지)',
  knee: '무릎 편하게 (무릎 압박·깊은 굴곡 제외)',
  easier: '난이도 낮추기 (완화·지지 변형)',
  harder: '난이도 올리기 (심화·도전 변형)',
};

function violatesWristConstraint(ex: WorldPilatesExercise): boolean {
  if (ex.bodyPosition === 'quadruped') return true;
  if (ex.blockCategory === 'plank' && ex.bodyPosition !== 'supine' && !/전완|forearm/i.test(`${ex.nameKo} ${ex.nameEn}`)) {
    return true;
  }
  return /푸시업|푸시다운|풀업|파이크|플랭크|스타|스네이크|휠배로우|텐던|핸드스탠드|롱\s*백|트라이셉스\s*싯|스캐퓰라\s*푸시업|push[\s-]*up|push[\s-]*down|pull[\s-]*up|pike|plank|star|snake|wheelbarrow|tendon|handstand|long[\s-]*back|tricep[\s-]*sit|cat[\s-]*cow/i.test(
    `${ex.nameKo} ${ex.nameEn}`,
  );
}

function violatesNeckConstraint(ex: WorldPilatesExercise): boolean {
  if (
    /롤\s*오버|잭나이프|컨트롤\s*밸런스|오버헤드|숏\s*스파인|롱\s*스파인|넥\s*풀|부메랑|크랩|라커|롤링|체스트\s*리프트|컬업|헌드레드|크리스\s*크로스|싱글\s*레그\s*스트레치|더블\s*레그\s*스트레치|시저스|티저|레이아웃|roll[\s-]*over|jack[\s-]*knife|control[\s-]*balance|overhead|short[\s-]*spine|long[\s-]*spine|neck[\s-]*pull|boomerang|crab|rocker|rolling|chest[\s-]*lift|hundred|criss[\s-]*cross|single[\s-]*leg[\s-]*stretch|double[\s-]*leg[\s-]*stretch|teaser|layout|crunch/i.test(
      `${ex.nameKo} ${ex.nameEn}`,
    )
  ) {
    return true;
  }
  return ex.bodyPosition === 'supine' && ex.blockCategory === 'core' && ex.spinalPlanes.includes('flexion');
}

function violatesKneeConstraint(ex: WorldPilatesExercise): boolean {
  if (ex.bodyPosition === 'kneeling' || ex.bodyPosition === 'quadruped') return true;
  return /런지|스쿼트|스텝업|스텝다운|고잉\s*업|마운틴\s*클라이머|커시|불가리안|플리에|피전|쉘\s*스트레치|니\s*스트레치|싸이\s*스트레치|lunge|squat|step[\s-]*up|step[\s-]*down|going[\s-]*up|mountain[\s-]*climber|curtsy|bulgarian|plie|pigeon|shell[\s-]*stretch|knee[\s-]*stretch|thigh[\s-]*stretch/i.test(
    `${ex.nameKo} ${ex.nameEn}`,
  );
}

export function findPlanBAlternative(
  exercise: PilatesExercise | WorldPilatesExercise,
  constraint: PlanBConstraint,
  pool: readonly (PilatesExercise | WorldPilatesExercise)[] = WORLD_PILATES_EXERCISES,
  limit = 3,
): PlanBAlternativeResult {
  const current = toWorldExercise(exercise);
  const poolWorld = pool.map(toWorldExercise);
  const currentLevelNum = current.level === '1.0' ? 1 : current.level === '1.5' ? 2 : 3;
  const tree = getProgressionTree(current.id);
  const easierTreeIds = new Set(tree.easier.map((n) => n.id));
  const harderTreeIds = new Set(tree.harder.map((n) => n.id));

  const scored: Array<PlanBAlternativeItem & { readonly score: number }> = [];

  for (const cand of poolWorld) {
    if (cand.id === current.id) continue;

    if (constraint === 'wrist' && violatesWristConstraint(cand)) continue;
    if (constraint === 'neck' && violatesNeckConstraint(cand)) continue;
    if (constraint === 'knee' && violatesKneeConstraint(cand)) continue;

    const candLevelNum = cand.level === '1.0' ? 1 : cand.level === '1.5' ? 2 : 3;
    if (constraint === 'easier' && candLevelNum > currentLevelNum) continue;
    if (constraint === 'harder' && candLevelNum < currentLevelNum) continue;

    const trans = computeExerciseTransitionCost(current, cand);
    let score = 100 - trans.transitionCost * 1.4;

    if (cand.apparatus === current.apparatus) score += 55;
    if (cand.blockCategory === current.blockCategory) score += 35;
    if (cand.anatomyInsight.anatomyVisualZone === current.anatomyInsight.anatomyVisualZone) {
      score += 24;
    }

    if (constraint === 'easier') {
      if (easierTreeIds.has(cand.id)) score += 90;
      if (candLevelNum < currentLevelNum) score += 45;
      if (cand.variationKind === 'regression-supported') score += 30;
      if (cand.id === current.parentArchetypeId && current.tier === 'variation') score += 60;
    } else if (constraint === 'harder') {
      if (harderTreeIds.has(cand.id)) score += 90;
      if (candLevelNum > currentLevelNum) score += 45;
      if (cand.isUnilateral && !current.isUnilateral) score += 20;
      if (cand.variationKind === 'spring-light-control' || cand.variationKind === 'single-leg') {
        score += 25;
      }
    } else {
      // Comfort swaps prefer equal or gentler intensity
      if (candLevelNum <= currentLevelNum) score += 16;
      if (cand.tier === 'atomic') score += 8;
    }

    const reasonKo =
      constraint === 'wrist'
        ? `손목 체중 지지 없이 ${POSITION_SHORT_KO[cand.bodyPosition]}에서 같은 부위 자극을 안전하게 이어가요`
        : constraint === 'neck'
          ? `목을 들지 않는 중립 정렬로 경추 부담을 줄이면서 핵심 근육을 활성화해요`
          : constraint === 'knee'
            ? `무릎 직접 압박과 깊은 굴곡을 피해 ${POSITION_SHORT_KO[cand.bodyPosition]}에서 편안하게 대체해요`
            : constraint === 'easier'
              ? `난이도 ${cand.level} 완화 단계로 관절 부담을 낮추며 핵심 패턴을 유지해요`
              : `난이도 ${cand.level} 심화 변형으로 근육 자극과 중심축 도전 강도를 끌어올려요`;

    scored.push({
      exercise: cand,
      reasonKo,
      transitionCost: trans.transitionCost,
      score,
    });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.transitionCost - b.transitionCost ||
      a.exercise.id.localeCompare(b.exercise.id),
  );

  const safeLimit = Math.max(1, Math.min(8, Math.floor(limit)));
  const alternatives: PlanBAlternativeItem[] = [];
  const usedIds = new Set<string>();
  for (const item of scored) {
    if (alternatives.length >= safeLimit) break;
    if (usedIds.has(item.exercise.id)) continue;
    usedIds.add(item.exercise.id);
    alternatives.push({
      exercise: item.exercise,
      reasonKo: item.reasonKo,
      transitionCost: item.transitionCost,
    });
  }

  // Fallback synthesis via remix if pool was very small for easier/harder
  if (alternatives.length === 0 && (constraint === 'easier' || constraint === 'harder')) {
    const remixed = remixExerciseVariation(current, { modifier: constraint });
    alternatives.push({
      exercise: remixed,
      reasonKo:
        constraint === 'easier'
          ? '즉석 완화 리믹스로 가동 범위와 지지 부담을 부드럽게 낮췄어요'
          : '즉석 심화 리믹스로 근지구력과 제어 난이도를 끌어올렸어요',
      transitionCost: 0,
    });
  }

  const primary = alternatives[0] ?? null;
  const rationaleKo = primary
    ? `${CONSTRAINT_LABELS_KO[constraint]} 기준 1순위 추천: ${primary.exercise.nameKo}`
    : `${CONSTRAINT_LABELS_KO[constraint]} 조건에 맞는 대체 동작을 찾지 못했습니다.`;

  return {
    constraint,
    constraintLabelKo: CONSTRAINT_LABELS_KO[constraint],
    primary,
    alternatives,
    rationaleKo,
  };
}
