import type { PilatesExercise, SequenceStep, SpinalPlane } from '../types/pilates';
import { isRestStep } from './sequenceEngine';

export interface ExerciseKinesiologyProfile {
  /** Primary concentric/eccentric prime movers */
  readonly agonistsKo: readonly string[];
  /** Isometric powerhouse & girdle stabilizers */
  readonly stabilizersKo: readonly string[];
  /** Most frequent studio compensation pattern to watch for */
  readonly commonFaultKo: string;
  /** Immediate verbal/tactile cue to resolve the compensation */
  readonly correctionCueKo: string;
  /** Breath-to-core coordination rationale */
  readonly breathMechanicsKo: string;
}

const STABILIZER_BY_POSITION_AND_CATEGORY: ReadonlyArray<{
  match: (ex: PilatesExercise) => boolean;
  stabilizers: readonly string[];
  fault: string;
  fix: string;
}> = [
  {
    match: (ex) => ex.blockCategory === 'footwork',
    stabilizers: ['복횡근(중립 골반 고정)', '내측광근·발목 내재근', '하부승모근'],
    fault: '캐리지를 밀 때 무릎 과신전(Locking) 또는 골반 후방 말림',
    fix: '뒤꿈치-두 번째 발가락 정렬을 유지하고 무릎을 1% 부드럽게 남겨 대퇴사두·둔근을 함께 쓰도록 안내하세요.',
  },
  {
    match: (ex) => ex.blockCategory === 'bridging',
    stabilizers: ['복횡근·골반저근', '내전근군(무릎 정렬 유지)', '전거근·광배근(견갑 지지)'],
    fault: '둔근 대신 허리(요추 기립근)로 과신전하거나 햄스트링 경련 발생',
    fix: '갈비뼈 아랫단과 치골의 거리를 좁힌 채 좌골을 무릎 뒤쪽으로 길게 보내며 캐리지를 고정하세요.',
  },
  {
    match: (ex) => ex.blockCategory === 'plank' || ex.bodyPosition === 'quadruped',
    stabilizers: ['전거근·하부승모근(익상견갑 방지)', '복횡근·복사근', '둔근·심부 경추 굴곡근'],
    fault: '날개뼈 사이가 무너지며 상부승모근·손목에 체중이 쏠리고 요추가 처짐',
    fix: '손바닥 전체로 바닥/풋바를 밀어내 흉추 사이를 채우고, 정수리부터 뒤꿈치까지 하나의 사선 축을 유지하세요.',
  },
  {
    match: (ex) => ex.blockCategory === 'extension' || ex.spinalPlanes.includes('extension'),
    stabilizers: ['복횡근(요추 압박 보호)', '하부승모근·능형근', '대둔근 하부 섬유'],
    fault: '흉추 분절 대신 목을 뒤로 꺾거나 하부 요추만 꺾여 허리 압박 호소',
    fix: '배꼽을 등 쪽으로 가볍게 당겨 요추 길이를 먼저 확보한 뒤, 쇄골을 좌우로 넓히며 윗등(흉추)부터 길게 들어 올리세요.',
  },
  {
    match: (ex) => ex.blockCategory === 'feet-in-straps',
    stabilizers: ['복횡근·내복사근(골반 고정)', '고관절 심부 외회전근', '광배근·하부승모근'],
    fault: '다리를 내릴 때 갈비뼈가 들리거나(Rib Flaring) 다리를 올릴 때 꼬리뼈가 매트에서 말려 올라감',
    fix: '천골(엉치뼈)을 캐리지에 무겁게 닻처럼 내려두고, 골반이 흔들리지 않는 가동범위 안에서만 스트랩 호를 그리세요.',
  },
  {
    match: (ex) => ex.spinalPlanes.includes('lateral') || ex.bodyPosition === 'side-lying',
    stabilizers: ['요방형근·내외복사근', '중둔근·소둔근', '견갑대 하강 안정화근'],
    fault: '상체가 앞뒤로 회전하거나 아래쪽 옆구리가 매트/배럴에 힘없이 주저앉음',
    fix: '두 골반과 두 어깨가 보이지 않는 유리벽 사이에 놓인 것처럼 정렬하고, 아래쪽 갈비뼈도 살짝 들어 긴장감을 유지하세요.',
  },
  {
    match: (ex) => ex.spinalPlanes.includes('rotation'),
    stabilizers: ['다열근·내외복사근', '골반 고정근(내전근·둔근)', '전거근'],
    fault: '흉추 회전 대신 골반이 함께 돌아가거나 팔만 넘겨 어깨 전방 압박 발생',
    fix: '양쪽 좌골의 무게를 50:50으로 고정한 상태에서 날숨에 갈비뼈와 흉골이 나선형으로 회전하도록 유도하세요.',
  },
  {
    match: (ex) => ex.blockCategory === 'upper-body',
    stabilizers: ['하부승모근·전거근(견갑골 하강·외전 제어)', '복횡근(흉곽 들림 억제)', '심부 경추 굴곡근'],
    fault: '스트랩을 당길 때 어깨가 귀 쪽으로 으쓱 올라가고 상부승모근·목 앞쪽이 과긴장됨',
    fix: '움직이기 전 겨드랑이 아래(광배근·전거근)를 먼저 연결하고, 쇄골과 귀 사이 공간을 넓게 유지하세요.',
  },
  {
    match: (ex) => ex.blockCategory === 'lower-body' || ex.bodyPosition === 'standing',
    stabilizers: ['중둔근(골반 수평 유지)', '복횡근', '족궁(발바닥 삼각 지지점)'],
    fault: '지지 다리 쪽 골반이 옆으로 빠지거나 무릎이 안쪽(Valgus)으로 무너짐',
    fix: '지지 발의 엄지발볼·새끼발볼·뒤꿈치 삼각 지점을 고르게 누르고, 양쪽 골반 높이를 나란히 맞추세요.',
  },
  {
    match: (ex) => ex.blockCategory === 'core' || ex.spinalPlanes.includes('flexion'),
    stabilizers: ['복횡근·골반저근', '다열근', '전거근(상체 컬업 시 견갑 안정)'],
    fault: '복부 심부 수축 대신 목(흉쇄유돌근)을 당기거나 고관절 굴곡근(장요근) 과우세로 골반이 흔들림',
    fix: '턱 끝과 쇄골 사이에 주먹 하나 공간을 두고, 날숨에 흉골과 하부 갈비뼈가 골반 쪽으로 미끄러지듯 분절하세요.',
  },
];

/**
 * Synthesizes Muscle & Motion-inspired 3-role kinesiology intelligence
 * (Prime Movers / Deep Stabilizers / Common Compensation Fault + Tactile Fix)
 * deterministically from verified catalog biomechanics.
 */
export function analyzeExerciseKinesiology(exercise: PilatesExercise): ExerciseKinesiologyProfile {
  const rawTargets = exercise.targetMuscles.filter(Boolean);
  const agonistsKo =
    rawTargets.length > 0 ? rawTargets.slice(0, 3) : ['복직근·복사근', '둔근·하지 협응근'];

  const matchedRule = STABILIZER_BY_POSITION_AND_CATEGORY.find((rule) => rule.match(exercise));
  const stabilizersKo = matchedRule
    ? matchedRule.stabilizers
    : ['복횡근·다열근(심부 코어)', '하부승모근·전거근', '골반저근'];

  const commonFaultKo =
    matchedRule?.fault ??
    '호흡이 멈추며 상부승모근과 허리에 불필요한 보상 긴장이 개입됨';

  const correctionCueKo =
    matchedRule?.fix ??
    (exercise.cues[0] || '날숨에 하부 흉곽을 부드럽게 닫아 심부 코어 지지를 먼저 연결하세요.');

  const breathMechanicsKo = exercise.breathPattern
    ? `${exercise.breathPattern} — 날숨에서 복횡근·골반저근의 선행 수축으로 척추·골반 중립 지지력을 확보합니다.`
    : '코로 마시며 흉곽을 입체적으로 넓히고, 입으로 내쉬며 복횡근을 연결해 움직임 축을 안정화합니다.';

  return {
    agonistsKo,
    stabilizersKo,
    commonFaultKo,
    correctionCueKo,
    breathMechanicsKo,
  };
}

export interface SequenceSpinalBalanceSummary {
  readonly planeCounts: Readonly<Record<SpinalPlane, number>>;
  readonly coveredPlanesCount: number;
  readonly unilateralStepCount: number;
  readonly totalExerciseCount: number;
  readonly springChangeCount: number;
  readonly missingPlaneHintKo: string | null;
}

export function summarizeSequenceSpinalAndFlowBalance(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): SequenceSpinalBalanceSummary {
  const planeCounts: Record<SpinalPlane, number> = {
    neutral: 0,
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
  };
  let unilateralStepCount = 0;
  let totalExerciseCount = 0;
  let springChangeCount = 0;
  let prevSpring: string | null = null;

  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exercisesById.get(step.exerciseId);
    if (!ex) continue;
    totalExerciseCount += 1;
    if (ex.isUnilateral || (step.sideMode && step.sideMode !== 'together')) {
      unilateralStepCount += 1;
    }
    for (const plane of ex.spinalPlanes) {
      planeCounts[plane] = (planeCounts[plane] ?? 0) + 1;
    }
    const spring = (step.customSpringOverride ?? ex.springs ?? '').trim();
    if (spring) {
      if (prevSpring !== null && prevSpring !== spring) {
        springChangeCount += 1;
      }
      prevSpring = spring;
    }
  }

  const activeMovementPlanes: Array<{ plane: SpinalPlane; labelKo: string }> = [
    { plane: 'flexion', labelKo: '굴곡' },
    { plane: 'extension', labelKo: '신전' },
    { plane: 'lateral', labelKo: '측굴' },
    { plane: 'rotation', labelKo: '회전' },
  ];
  const coveredPlanesCount = activeMovementPlanes.filter((p) => planeCounts[p.plane] > 0).length;

  let missingPlaneHintKo: string | null = null;
  if (totalExerciseCount >= 4) {
    const missing = activeMovementPlanes
      .filter((p) => planeCounts[p.plane] === 0)
      .map((p) => p.labelKo);
    if (missing.length > 0 && missing.length <= 2) {
      missingPlaneHintKo = `${missing.join('·')} 방향 동작을 1개 더하면 4면 척추 밸런스가 완성돼요`;
    } else if (planeCounts.flexion >= 4 && planeCounts.extension === 0) {
      missingPlaneHintKo = '굴곡 비중이 높아요 · 마무리 전 가벼운 흉추 신전(스완 등)을 권장해요';
    }
  }

  return {
    planeCounts,
    coveredPlanesCount,
    unilateralStepCount,
    totalExerciseCount,
    springChangeCount,
    missingPlaneHintKo,
  };
}
