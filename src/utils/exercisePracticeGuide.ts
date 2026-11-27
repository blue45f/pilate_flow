import { practiceNotesByExerciseId, singleSideSteps } from '../data/exercisePracticeNotes';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { WORLD_PILATES_BY_ID, type VariationKind } from '../data/worldPilatesRepertoire1000';
import type { PilatesExercise } from '../types/pilates';

export interface ExercisePracticeGuide {
  readonly benefit: string;
  readonly steps: readonly string[];
  readonly breath: string;
  readonly focus: string;
}

const localCatalogById = new Map(
  [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES].map((exercise) => [
    exercise.id,
    exercise,
  ]),
);

const focusAreas: readonly [RegExp, string][] = [
  [/복사근|옆구리|측면 복부|요방형근/, '옆구리'],
  [/복횡근|복직근|코어|복부|몸통|파워하우스/, '배와 몸통'],
  [/중둔근|소둔근|외전근/, '엉덩이 옆쪽'],
  [/대둔근|둔근|엉덩이/, '엉덩이'],
  [/햄스트링|대퇴이두|허벅지 뒤/, '허벅지 뒤쪽'],
  [/내전근|허벅지 안/, '허벅지 안쪽'],
  [/대퇴사두|대퇴직근|앞허벅지/, '허벅지 앞쪽'],
  [/장요근|고관절 굴곡/, '골반 앞쪽'],
  [/고관절|골반/, '골반 주변'],
  [/종아리|비복근|가자미근|아킬레스/, '종아리'],
  [/발목|발바닥|발 아치|족저|족궁/, '발과 발목'],
  [/능형근|승모근|광배근|등|흉추|다열근|기립근|척추/, '등'],
  [/삼두근|삼두/, '팔 뒤쪽'],
  [/이두근|이두/, '팔 앞쪽'],
  [/전거근|견갑|삼각근|어깨|회전근개/, '어깨 주변'],
  [/가슴|대흉근|소흉근|흉근/, '가슴'],
  [/늑간근|횡격막|호흡|갈비뼈/, '갈비뼈 주변'],
  [/하체|대퇴|허벅지|다리/, '다리'],
  [/상완|팔/, '팔'],
];

function everydayFocus(exercise: PilatesExercise): string {
  const areas = new Set<string>();
  for (const target of exercise.targetMuscles) {
    const area = focusAreas.find(([pattern]) => pattern.test(target))?.[1];
    if (area) areas.add(area);
  }
  return (
    [...areas].slice(0, 3).join(' · ') ||
    exercise.targetMuscles.filter(Boolean).slice(0, 2).join(' · ') ||
    '동작에 따라 달라요'
  );
}

type ModifiedPractice = Exclude<
  VariationKind,
  'archetype' | 'custom-remix' | 'single-leg' | 'unilateral-arm'
>;

const variationAdvice: Record<ModifiedPractice, string> = {
  'prop-mini-ball':
    '미니볼이 떨어지지 않을 만큼만 가볍게 받쳐요. 공이 심하게 찌그러지면 힘을 조금 풀어 보세요.',
  'prop-magic-circle':
    '링이 몸에 닿는 두 곳에 힘을 고르게 나눠요. 돌아올 때 링이 갑자기 벌어지지 않게 천천히 힘을 풀어요.',
  'prop-foam-roller':
    '폼롤러가 옆으로 굴러가지 않도록 중심부터 잡아요. 흔들리면 움직이는 거리를 줄여 보세요.',
  'prop-loop-band':
    '강사와 고리 밴드가 닿는 자리를 맞춰요. 밴드에 끌려 무릎이 안쪽으로 쏠리지 않게 움직였다가 천천히 돌아와요.',
  'prop-theraband':
    '밴드가 당기는 방향을 먼저 확인해요. 손을 짚거나 기구를 잡는 동작은 그 지지를 유지하고, 밴드가 돌아올 때 힘을 서서히 풀어요.',
  'prop-toning-ball':
    '몸을 받치는 손은 제자리에 두고, 작은 공을 쓸 수 있는 위치부터 맞춰요. 공 무게로 어깨가 올라오면 팔을 몸 가까이 가져와요.',
  'prop-bosu':
    '반구 모양의 보수 위에서 중심을 먼저 잡아요. 흔들리면 동작 크기를 줄이고 균형부터 다시 찾아요.',
  'tempo-pulse':
    '동작 끝에서 오가는 폭을 아주 작게 해요. 몸을 튕기지 않고 원래 자리로 천천히 돌아와요.',
  'isometric-hold':
    '편하게 버틸 수 있는 지점에서 최대 5초 머물러요. 기다리는 동안에도 숨은 천천히 쉬어요.',
  'rotation-layer':
    '기본 동작에 가슴을 돌리는 움직임을 더해요. 골반이 따라가지 않는 거리까지만 작게 돌려요.',
  'spring-light-control':
    '강사와 스프링을 가볍게 맞춘 뒤 움직임을 짧게 시작해요. 기구에 몸이 끌려가지 않게 천천히 출발 자세로 돌아와요.',
  'regression-supported':
    '몸을 받쳐 주는 곳을 늘리고 움직임을 작게 시작하는 준비 동작이에요. 혼자 돌아올 수 있는 거리부터 찾아요.',
};

function hasSameInstructions(a: PilatesExercise, b: PilatesExercise): boolean {
  if (a === b) return true;
  const equipmentA = a.requiredEquipment ?? [a.apparatus];
  const equipmentB = b.requiredEquipment ?? [b.apparatus];
  return (
    equipmentA.length === equipmentB.length &&
    equipmentA.every((item) => equipmentB.includes(item)) &&
    a.nameKo === b.nameKo &&
    a.nameEn === b.nameEn &&
    a.apparatus === b.apparatus &&
    a.bodyPosition === b.bodyPosition &&
    a.blockCategory === b.blockCategory &&
    a.box === b.box &&
    a.footbar === b.footbar &&
    a.headrest === b.headrest &&
    a.springs === b.springs &&
    a.precautions === b.precautions &&
    a.level === b.level &&
    a.breathPattern === b.breathPattern &&
    a.isUnilateral === b.isUnilateral &&
    a.targetMuscles.length === b.targetMuscles.length &&
    a.targetMuscles.every((item, i) => item === b.targetMuscles[i]) &&
    a.props.length === b.props.length &&
    a.props.every((item, i) => item === b.props[i]) &&
    a.cues.length === b.cues.length &&
    a.cues.every((cue, i) => cue === b.cues[i])
  );
}

function plainBreath(exercise: PilatesExercise): string {
  const pattern = exercise.breathPattern.trim();
  if (/헌드레드|hundred/i.test(exercise.nameEn + exercise.nameKo)) {
    return '팔을 작게 두드리는 박자에 맞춰 다섯 박자 동안 들이쉬고, 다음 다섯 박자 동안 내쉬어요. 길면 편한 박자로 줄여요.';
  }
  if (/갈비뼈|rib|breath/i.test(exercise.nameEn) && exercise.blockCategory === 'warmup') {
    return '들이쉴 때는 갈비뼈 양옆이 넓어지고, 내쉴 때는 천천히 모여요. 어깨는 편하게 두세요.';
  }
  const firstBreath = pattern.match(/들이마시|들숨|들쉬|내쉬|날숨/);
  if (firstBreath) {
    if (/준비|세팅/.test(pattern.split(/[,→]/)[0] ?? '')) {
      return '자세를 잡으며 숨을 편하게 들이쉬고 내쉬어요. 힘을 쓸 때도 숨이 끊기지 않게 해요.';
    }
    if (/내쉬|날숨/.test(firstBreath[0])) {
      return '첫 움직임에 맞춰 숨을 천천히 내쉬어 보세요. 다음 숨을 편하게 들이쉴 수 있는 속도로 움직여요.';
    }
    return '처음에는 숨을 편하게 들이쉬며 움직여요. 내쉴 때도 서두르지 않고 다음 움직임으로 이어가요.';
  }
  return '편하게 숨을 들이쉬고 내쉬면서 움직여요. 숨이 막히면 잠깐 쉬고, 다시 할 때는 움직임을 조금 줄여요.';
}

export function getExercisePracticeGuide(exercise: PilatesExercise): ExercisePracticeGuide {
  const world = WORLD_PILATES_BY_ID.get(exercise.id);
  const initial = localCatalogById.get(exercise.id);
  const matchesCatalog =
    (world && hasSameInstructions(exercise, world)) ||
    (initial && hasSameInstructions(exercise, initial));
  const baseId = world?.parentArchetypeId ?? exercise.id;
  const note = matchesCatalog ? practiceNotesByExerciseId.get(baseId) : undefined;
  const focus = everydayFocus(exercise);
  if (!note) {
    const cues = exercise.cues.filter((cue) => cue.trim());
    return {
      benefit: exercise.targetMuscles.length
        ? `수업 메모에 적힌 집중 부위는 ${focus}입니다.`
        : '동작을 만든 분이 적어 둔 순서에 맞춰 연습해요.',
      steps: cues.length ? cues : ['연습을 시작하기 전에 강사와 자세와 움직이는 방향을 확인해요.'],
      breath: exercise.breathPattern.trim() || '동작을 하는 동안 숨을 편하게 이어가요.',
      focus,
    };
  }

  const kind = world?.variationKind;
  const unilateral = kind === 'single-leg' || kind === 'unilateral-arm';
  const sideSteps = unilateral ? singleSideSteps.get(baseId) : undefined;
  const [setup, movement] = sideSteps ?? [note.setup, note.movement];
  const variation =
    kind && !unilateral && kind !== 'archetype' && kind !== 'custom-remix'
      ? variationAdvice[kind]
      : undefined;
  const steps = variation
    ? [setup, variation, movement, note.check]
    : [setup, movement, note.check];
  return { benefit: note.benefit, steps, breath: plainBreath(exercise), focus };
}
