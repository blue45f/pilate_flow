import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
} from '../types/pilates';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { getEquipmentFamilies } from '../data/equipmentCatalog';
import { isExerciseAuthoringEligible } from './exerciseAuthoring';
import { formatBrandSpringEquivalent } from './brandSpringConverter';
import { resolveStudio3DMotionForExercise } from './studio3dMotionCatalog';

export type CircuitStationCount = 2 | 3 | 4;
export type CircuitRoundCount = 1 | 2 | 3;
export type CircuitTransitionSec = 30 | 45 | 60;

export interface CircuitStationAssignment {
  stationIndex: number;
  stationLabelKo: string;
  apparatus: ApparatusType;
  apparatusLabelKo: string;
  exercise: PilatesExercise;
  durationMin: number;
  springsLabelKo: string;
  brandSpringSummaryKo: string;
  thumb3dUrl: string;
  selectedLayer: LayerMode;
}

export interface CircuitRoundPlan {
  roundNumber: number;
  roundLabelKo: string;
  stations: CircuitStationAssignment[];
  rotationRestSec: number;
}

export interface GeneratedStudioCircuitPlan {
  title: string;
  subtitle: string;
  stationCount: CircuitStationCount;
  roundCount: CircuitRoundCount;
  transitionSec: CircuitTransitionSec;
  targetMinutes: number;
  level: DifficultyLevel;
  availableFamilies: ApparatusType[];
  warmupExercise: PilatesExercise;
  cooldownExercise: PilatesExercise;
  rounds: CircuitRoundPlan[];
  steps: SequenceStep[];
  totalPlannedSeconds: number;
  stationSummaryKo: string;
}

const CANONICAL_STATION_ORDER: readonly ApparatusType[] = [
  'reformer',
  'chair',
  'cadillac',
  'barrel',
  'mat',
];

function levelRank(level: DifficultyLevel): number {
  if (level === '1.0') return 1;
  if (level === '1.5') return 2;
  return 3;
}

export function resolveAvailableCircuitFamilies(
  ownedEquipment?: readonly string[],
): ApparatusType[] {
  const families =
    ownedEquipment && ownedEquipment.length > 0
      ? getEquipmentFamilies([...ownedEquipment])
      : [...CANONICAL_STATION_ORDER];
  const ordered = CANONICAL_STATION_ORDER.filter((app) => families.includes(app));
  return ordered.length > 0 ? ordered : ['reformer', 'mat'];
}

/**
 * Builds a synchronized Duet (2-station), Trio (3-station), or Quartet (4-station)
 * multi-apparatus circuit timeline with equalized station durations and clean rotation blocks.
 */
export function generateStudioCircuitPlan(input: {
  exercises: readonly PilatesExercise[];
  ownedEquipment?: readonly string[];
  stationCount?: CircuitStationCount;
  roundCount?: CircuitRoundCount;
  transitionSec?: CircuitTransitionSec;
  targetMinutes?: number;
  level?: DifficultyLevel;
  reformerBrand?: ReformerBrand;
  preferredStations?: readonly ApparatusType[];
}): GeneratedStudioCircuitPlan | null {
  const availableFamilies = resolveAvailableCircuitFamilies(input.ownedEquipment);
  const eligible = input.exercises.filter(
    (ex) => isExerciseAuthoringEligible(ex) && availableFamilies.includes(ex.apparatus),
  );
  if (eligible.length < 3) return null;

  const stationCount: CircuitStationCount = input.stationCount ?? (availableFamilies.length >= 3 ? 3 : 2);
  const roundCount: CircuitRoundCount = input.roundCount ?? 2;
  const transitionSec: CircuitTransitionSec = input.transitionSec ?? 45;
  const targetMinutes = Math.max(30, Math.min(90, input.targetMinutes ?? 50));
  const level: DifficultyLevel = input.level ?? '1.5';
  const brand: ReformerBrand = input.reformerBrand ?? 'balanced-body';
  const maxRank = levelRank(level);

  // Build station apparatus list (cycles cleanly if studio owns fewer apparatus families than stations, e.g. 2 Reformers + Mat)
  const stationApparatusList: ApparatusType[] = [];
  const seedStations =
    input.preferredStations && input.preferredStations.length > 0
      ? input.preferredStations.filter((a) => availableFamilies.includes(a))
      : availableFamilies;
  const effectiveSeed = seedStations.length > 0 ? seedStations : availableFamilies;

  for (let i = 0; i < stationCount; i += 1) {
    stationApparatusList.push(effectiveSeed[i % effectiveSeed.length]);
  }

  const usedIds = new Set<string>();

  const pickExercise = (
    preferredApparatus: ApparatusType,
    preferredBlocks: readonly ClassBlockCategory[],
  ): PilatesExercise => {
    const pool = eligible.filter((ex) => !usedIds.has(ex.id));
    const activePool = pool.length > 0 ? pool : eligible;
    const chosen =
      activePool.find(
        (ex) =>
          ex.apparatus === preferredApparatus &&
          preferredBlocks.includes(ex.blockCategory) &&
          levelRank(ex.level) <= maxRank,
      ) ??
      activePool.find(
        (ex) => ex.apparatus === preferredApparatus && levelRank(ex.level) <= maxRank,
      ) ??
      activePool.find((ex) => ex.apparatus === preferredApparatus) ??
      activePool.find(
        (ex) => preferredBlocks.includes(ex.blockCategory) && levelRank(ex.level) <= maxRank,
      ) ??
      activePool[0];
    usedIds.add(chosen.id);
    return chosen;
  };

  const warmupExercise = pickExercise(stationApparatusList[0], ['warmup', 'footwork']);
  const cooldownCandidatePool = eligible.filter((ex) => !usedIds.has(ex.id));
  const cooldownExercise =
    cooldownCandidatePool.find((ex) => ex.blockCategory === 'cooldown') ??
    cooldownCandidatePool.find((ex) => ex.blockCategory === 'feet-in-straps') ??
    pickExercise(stationApparatusList[stationApparatusList.length - 1], ['cooldown', 'feet-in-straps']);
  usedIds.add(cooldownExercise.id);

  // Calculate time budget: warmup + cooldown + (stationCount * roundCount) stations + rotation rests between stations/rounds
  const warmupMin = 5;
  const cooldownMin = 5;
  const totalSlots = stationCount * roundCount;
  const rotationBlocksCount = Math.max(0, totalSlots - 1);
  const transitionMinEach = Number((transitionSec / 60).toFixed(2));
  const totalTransitionMin = rotationBlocksCount * transitionMinEach;
  const remainingForStationsMin = Math.max(
    totalSlots * 2.5,
    targetMinutes - warmupMin - cooldownMin - totalTransitionMin,
  );
  const perStationMin = Math.max(
    2.5,
    Math.min(12, Math.round((remainingForStationsMin / totalSlots) * 2) / 2),
  );

  const roundFocusBlocks: readonly (readonly ClassBlockCategory[])[] = [
    ['lower-body', 'footwork', 'bridging', 'core'],
    ['core', 'upper-body', 'plank', 'extension'],
    ['plank', 'lower-body', 'upper-body', 'feet-in-straps'],
  ];

  const rounds: CircuitRoundPlan[] = [];
  const steps: SequenceStep[] = [];
  const batchStamp = Date.now();

  // 1. Opening shared warmup
  steps.push({
    kind: 'exercise',
    stepId: `circuit-${batchStamp}-warmup`,
    order: 1,
    exerciseId: warmupExercise.id,
    blockCategory: 'warmup',
    durationMin: warmupMin,
    explanationSec: 25,
    transitionSec: 15,
    repetitions: 8,
    selectedLayer: 'standard',
    instructorNote: '[통합 웜업] 전 스테이션 호흡·골반 중립 동시 정렬',
  });

  // 2. Synchronized station rounds
  for (let r = 0; r < roundCount; r += 1) {
    const stations: CircuitStationAssignment[] = [];
    const blockPrefs = roundFocusBlocks[r % roundFocusBlocks.length];

    for (let sIdx = 0; sIdx < stationCount; sIdx += 1) {
      const app = stationApparatusList[sIdx];
      const rotatedPref = [
        blockPrefs[(sIdx + r) % blockPrefs.length],
        ...blockPrefs,
      ];
      const ex = pickExercise(app, rotatedPref);
      const springsRaw = ex.springs || '없음';
      const converted = formatBrandSpringEquivalent(springsRaw, brand, ex.apparatus);
      const motion3d = resolveStudio3DMotionForExercise(ex);
      const layer: LayerMode =
        r === roundCount - 1 && level !== '1.0' ? 'hard' : level === '1.0' ? 'easy' : 'standard';

      const stationLabelKo = `Station ${String.fromCharCode(65 + sIdx)} · ${APPARATUS_LABELS[app].ko}`;
      stations.push({
        stationIndex: sIdx,
        stationLabelKo,
        apparatus: app,
        apparatusLabelKo: APPARATUS_LABELS[app].ko,
        exercise: ex,
        durationMin: perStationMin,
        springsLabelKo: springsRaw,
        brandSpringSummaryKo: converted.isNonSpringApparatus
          ? '체중/매트 저항'
          : `${converted.brandShortLabelKo} ${converted.equivalentLabelKo}`,
        thumb3dUrl: motion3d.peakImg,
        selectedLayer: layer,
      });

      steps.push({
        kind: 'exercise',
        stepId: `circuit-${batchStamp}-r${r + 1}-s${sIdx + 1}`,
        order: steps.length + 1,
        exerciseId: ex.id,
        blockCategory: ex.blockCategory,
        durationMin: perStationMin,
        explanationSec: 20,
        transitionSec: 15,
        repetitions: 10,
        selectedLayer: layer,
        instructorNote: `[${r + 1}R · ${stationLabelKo}] 동일 시간(${perStationMin}분) 동기화 진행`,
      });

      const isLastStationOverall = r === roundCount - 1 && sIdx === stationCount - 1;
      if (!isLastStationOverall) {
        const nextApp =
          sIdx + 1 < stationCount
            ? stationApparatusList[sIdx + 1]
            : stationApparatusList[0];
        steps.push({
          kind: 'rest',
          stepId: `circuit-${batchStamp}-rot-r${r + 1}-s${sIdx + 1}`,
          order: steps.length + 1,
          exerciseId: '',
          blockCategory: ex.blockCategory,
          durationMin: transitionMinEach,
          selectedLayer: 'standard',
          instructorNote:
            sIdx + 1 < stationCount
              ? `기구 스테이션 교대 (${APPARATUS_LABELS[app].ko} → ${APPARATUS_LABELS[nextApp].ko}) · 스프링/위생 점검`
              : `${r + 1}라운드 완료 → ${r + 2}라운드 첫 스테이션(${APPARATUS_LABELS[nextApp].ko}) 이동`,
        });
      }
    }

    rounds.push({
      roundNumber: r + 1,
      roundLabelKo:
        r === 0
          ? '1라운드 · 기구 적응 & 코어 연결'
          : r === 1
            ? '2라운드 · 기구 교대 & 근지구력 통합'
            : '3라운드 · 피크 컨트롤 순환',
      stations,
      rotationRestSec: transitionSec,
    });
  }

  // 3. Closing shared cooldown
  steps.push({
    kind: 'exercise',
    stepId: `circuit-${batchStamp}-cooldown`,
    order: steps.length + 1,
    exerciseId: cooldownExercise.id,
    blockCategory: 'cooldown',
    durationMin: cooldownMin,
    explanationSec: 20,
    transitionSec: 10,
    repetitions: 6,
    selectedLayer: 'easy',
    instructorNote: '[통합 쿨다운] 호흡 이완 및 척추 분절 마무리',
  });

  const uniqueStationNames = [...new Set(stationApparatusList.map((a) => APPARATUS_LABELS[a].ko))];
  const formatBadge =
    stationCount === 2 ? '듀엣 2스테이션' : stationCount === 3 ? '트리오 3스테이션' : '그룹 4스테이션';
  const stationSummaryKo = stationApparatusList
    .map((a, idx) => `${String.fromCharCode(65 + idx)}:${APPARATUS_LABELS[a].short}`)
    .join(' ↔ ');

  const totalPlannedSeconds = Math.round(
    steps.reduce((acc, st) => acc + st.durationMin * 60, 0),
  );

  return {
    title: `${formatBadge} 멀티 기구 순환 서킷 (${uniqueStationNames.join('·')})`,
    subtitle: `${roundCount}라운드 × 스테이션당 ${perStationMin}분 · 교대 전환 ${transitionSec}초`,
    stationCount,
    roundCount,
    transitionSec,
    targetMinutes,
    level,
    availableFamilies,
    warmupExercise,
    cooldownExercise,
    rounds,
    steps,
    totalPlannedSeconds,
    stationSummaryKo,
  };
}
