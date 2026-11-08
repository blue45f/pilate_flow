import {
  APPARATUS_LABELS,
  POSITION_LABELS,
  SPINAL_PLANE_LABELS,
} from '../data/pilatesCatalog';
import type {
  ApparatusType,
  BoxState,
  BodyPosition,
  ClassBlockCategory,
  FootbarState,
  HeadrestState,
  LayerMode,
  PilatesExercise,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';

export type ExerciseLookupInput =
  | ReadonlyMap<string, PilatesExercise>
  | Record<string, PilatesExercise>
  | readonly PilatesExercise[];

export type SetupChangeField =
  | 'apparatus'
  | 'box'
  | 'footbar'
  | 'headrest'
  | 'springs'
  | 'bodyPosition';

export interface SequenceStepSetupDiff {
  stepId: string;
  stepIndex: number;
  order: number;
  exerciseId: string;
  exerciseNameKo: string;
  fromStepId: string | null;
  fromExerciseNameKo: string | null;
  apparatus: ApparatusType;
  previousApparatus: ApparatusType | null;
  springs: string;
  previousSprings: string | null;
  box: BoxState;
  previousBox: BoxState | null;
  footbar: FootbarState;
  previousFootbar: FootbarState | null;
  headrest: HeadrestState;
  previousHeadrest: HeadrestState | null;
  bodyPosition: BodyPosition;
  previousBodyPosition: BodyPosition | null;
  changedFields: SetupChangeField[];
  changeBadgesKo: string[];
  actualTransitionSec: number;
  recommendedTransitionSec: number;
  bufferShortfallSec: number;
  frictionPoints: number;
  severity: 'smooth' | 'minor' | 'major';
}

export interface SequenceWavePoint {
  stepId: string;
  stepIndex: number;
  order: number;
  exerciseId: string;
  exerciseNameKo: string;
  blockCategory: ClassBlockCategory;
  apparatus: ApparatusType;
  primaryPlane: SpinalPlane;
  spinalPlanes: SpinalPlane[];
  bodyPosition: BodyPosition;
  effectiveSprings: string;
  box: BoxState;
  footbar: FootbarState;
  headrest: HeadrestState;
  selectedLayer: LayerMode;
  durationMin: number;
  cumulativeMinutes: number;
  intensityScore: number;
  isUnilateral: boolean;
}

export interface UnilateralPacingAlert {
  stepId: string;
  stepIndex: number;
  order: number;
  exerciseId: string;
  exerciseNameKo: string;
  sides: 1 | 2;
  totalDurationSec: number;
  explanationSec: number;
  transitionSec: number;
  netPracticeSec: number;
  netPerSideSec: number;
  reasonKo: string;
}

export interface SequenceFlowAnalysisResult {
  exerciseStepCount: number;
  restStepCount: number;
  totalDurationMin: number;
  transitionFrictionScore: number;
  flowReadinessScore: number;
  apparatusSwapCount: number;
  springSwapCount: number;
  boxSwapCount: number;
  footbarSwapCount: number;
  headrestSwapCount: number;
  bodyPositionSwitchCount: number;
  totalHardwareSwapCount: number;
  totalRecommendedBufferDeltaSec: number;
  stepsNeedingBufferUpgradeCount: number;
  spinalPlaneCounts: Record<SpinalPlane, number>;
  spinalPlaneDistribution: Record<SpinalPlane, number>;
  dominantSpinalPlane: SpinalPlane;
  missingSpinalPlanes: SpinalPlane[];
  wavePoints: SequenceWavePoint[];
  stepDiffs: SequenceStepSetupDiff[];
  unilateralStepCount: number;
  unilateralAlerts: UnilateralPacingAlert[];
  setupOptimizationTipsKo: string[];
  biomechanicalWarningsKo: string[];
}

const ALL_SPINAL_PLANES: readonly SpinalPlane[] = [
  'flexion',
  'extension',
  'lateral',
  'rotation',
  'neutral',
];

const BOX_LABELS_KO: Record<BoxState, string> = {
  none: '박스 없음',
  'long-box': '롱박스',
  'short-box': '숏박스',
};

const FOOTBAR_LABELS_KO: Record<FootbarState, string> = {
  high: '풋바 High',
  mid: '풋바 Mid',
  low: '풋바 Low',
  down: '풋바 Down',
  none: '풋바 없음',
};

const HEADREST_LABELS_KO: Record<HeadrestState, string> = {
  up: '헤드레스트 Up',
  flat: '헤드레스트 Flat',
  down: '헤드레스트 Down',
};

const BLOCK_BASE_INTENSITY: Record<ClassBlockCategory, number> = {
  warmup: 28,
  footwork: 48,
  bridging: 56,
  core: 68,
  'upper-body': 60,
  'lower-body': 74,
  plank: 84,
  extension: 66,
  'feet-in-straps': 46,
  cooldown: 24,
};

const LAYER_INTENSITY_BONUS: Record<LayerMode, number> = {
  easy: -10,
  standard: 0,
  hard: 12,
};

const LEVEL_INTENSITY_BONUS: Record<PilatesExercise['level'], number> = {
  '1.0': -4,
  '1.5': 2,
  '2.0': 8,
};

function resolveExerciseMap(lookup: ExerciseLookupInput): ReadonlyMap<string, PilatesExercise> {
  if (lookup instanceof Map) {
    return lookup;
  }
  if (Array.isArray(lookup)) {
    const map = new Map<string, PilatesExercise>();
    for (const ex of lookup) {
      map.set(ex.id, ex);
    }
    return map;
  }
  const record = lookup as Record<string, PilatesExercise>;
  const map = new Map<string, PilatesExercise>();
  for (const [key, value] of Object.entries(record)) {
    if (value) {
      map.set(key, value);
    }
  }
  return map;
}

function normalizeSprings(step: SequenceStep, exercise: PilatesExercise): string {
  const override = step.customSpringOverride?.trim();
  if (override && override.length > 0) {
    return override;
  }
  return exercise.springs.trim() || 'Bodyweight';
}

function computeStepIntensityScore(step: SequenceStep, exercise: PilatesExercise): number {
  const base = BLOCK_BASE_INTENSITY[step.blockCategory] ?? BLOCK_BASE_INTENSITY[exercise.blockCategory] ?? 50;
  const layerBonus = LAYER_INTENSITY_BONUS[step.selectedLayer] ?? 0;
  const levelBonus = LEVEL_INTENSITY_BONUS[exercise.level] ?? 0;
  const tempoBonus =
    exercise.tempo === 'athletic-burn' ? 6 : exercise.tempo === 'slow-precise' ? -4 : 0;
  return Math.max(10, Math.min(100, Math.round(base + layerBonus + levelBonus + tempoBonus)));
}

function computeRecommendedTransitionSec(changedFields: readonly SetupChangeField[]): number {
  if (changedFields.length === 0) {
    return 0;
  }
  if (changedFields.includes('apparatus') || changedFields.includes('box')) {
    return 25;
  }
  if (
    changedFields.includes('springs') ||
    changedFields.includes('bodyPosition') ||
    changedFields.includes('footbar') ||
    changedFields.includes('headrest')
  ) {
    return 15;
  }
  return 10;
}

function resolveUnilateralSides(step: SequenceStep): 1 | 2 {
  if (step.sideMode === 'left' || step.sideMode === 'right') {
    return 1;
  }
  return 2;
}

/**
 * Analyzes a Pilates sequence for hardware setup transition friction,
 * spinal plane biomechanical wave balance, and unilateral pacing symmetry.
 */
export function analyzeSequenceFlow(
  steps: readonly SequenceStep[],
  exercisesById: ExerciseLookupInput,
): SequenceFlowAnalysisResult {
  const exerciseMap = resolveExerciseMap(exercisesById);

  const spinalPlaneCounts: Record<SpinalPlane, number> = {
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
    neutral: 0,
  };

  let exerciseStepCount = 0;
  let restStepCount = 0;
  let totalDurationMin = 0;
  let apparatusSwapCount = 0;
  let springSwapCount = 0;
  let boxSwapCount = 0;
  let footbarSwapCount = 0;
  let headrestSwapCount = 0;
  let bodyPositionSwitchCount = 0;
  let rawFrictionPoints = 0;
  let unilateralStepCount = 0;
  let totalRecommendedBufferDeltaSec = 0;
  let stepsNeedingBufferUpgradeCount = 0;

  const wavePoints: SequenceWavePoint[] = [];
  const stepDiffs: SequenceStepSetupDiff[] = [];
  const unilateralAlerts: UnilateralPacingAlert[] = [];
  const setupOptimizationTipsKo: string[] = [];
  const biomechanicalWarningsKo: string[] = [];

  let prevStep: SequenceStep | null = null;
  let prevExercise: PilatesExercise | null = null;
  let prevSprings: string | null = null;

  const boxSequence: Array<{ stepOrder: number; box: BoxState; exerciseNameKo: string }> = [];
  const springSequence: Array<{ stepOrder: number; springs: string; exerciseNameKo: string }> = [];
  const apparatusSequence: Array<{
    stepOrder: number;
    apparatus: ApparatusType;
    exerciseNameKo: string;
  }> = [];

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const safeDurationMin = Math.max(0, Number.isFinite(step.durationMin) ? step.durationMin : 0);
    totalDurationMin += safeDurationMin;

    if (step.kind === 'rest') {
      restStepCount += 1;
      continue;
    }

    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) {
      continue;
    }

    exerciseStepCount += 1;
    const stepOrder = step.order || index + 1;
    const effectiveSprings = normalizeSprings(step, exercise);
    const planes: SpinalPlane[] =
      exercise.spinalPlanes.length > 0 ? [...exercise.spinalPlanes] : ['neutral'];
    const primaryPlane: SpinalPlane = planes[0] ?? 'neutral';

    for (const plane of planes) {
      spinalPlaneCounts[plane] = (spinalPlaneCounts[plane] ?? 0) + 1;
    }

    const intensityScore = computeStepIntensityScore(step, exercise);
    wavePoints.push({
      stepId: step.stepId,
      stepIndex: index,
      order: stepOrder,
      exerciseId: exercise.id,
      exerciseNameKo: exercise.nameKo,
      blockCategory: step.blockCategory || exercise.blockCategory,
      apparatus: exercise.apparatus,
      primaryPlane,
      spinalPlanes: planes,
      bodyPosition: exercise.bodyPosition,
      effectiveSprings,
      box: exercise.box,
      footbar: exercise.footbar,
      headrest: exercise.headrest,
      selectedLayer: step.selectedLayer,
      durationMin: safeDurationMin,
      cumulativeMinutes: Number(totalDurationMin.toFixed(1)),
      intensityScore,
      isUnilateral: exercise.isUnilateral,
    });

    boxSequence.push({ stepOrder, box: exercise.box, exerciseNameKo: exercise.nameKo });
    springSequence.push({
      stepOrder,
      springs: effectiveSprings,
      exerciseNameKo: exercise.nameKo,
    });
    apparatusSequence.push({
      stepOrder,
      apparatus: exercise.apparatus,
      exerciseNameKo: exercise.nameKo,
    });

    const changedFields: SetupChangeField[] = [];
    const changeBadgesKo: string[] = [];
    let stepFriction = 0;

    if (prevExercise && prevStep) {
      if (prevExercise.apparatus !== exercise.apparatus) {
        apparatusSwapCount += 1;
        changedFields.push('apparatus');
        stepFriction += 22;
        changeBadgesKo.push(
          `기구 ${APPARATUS_LABELS[prevExercise.apparatus].short} → ${APPARATUS_LABELS[exercise.apparatus].short}`,
        );
      }
      if (prevExercise.box !== exercise.box) {
        boxSwapCount += 1;
        changedFields.push('box');
        stepFriction += 20;
        changeBadgesKo.push(`박스 ${BOX_LABELS_KO[prevExercise.box]} → ${BOX_LABELS_KO[exercise.box]}`);
      }
      if (prevSprings !== null && prevSprings !== effectiveSprings) {
        springSwapCount += 1;
        changedFields.push('springs');
        stepFriction += 10;
        changeBadgesKo.push(`스프링 ${prevSprings} → ${effectiveSprings}`);
      }
      if (prevExercise.footbar !== exercise.footbar) {
        footbarSwapCount += 1;
        changedFields.push('footbar');
        stepFriction += 8;
        changeBadgesKo.push(
          `${FOOTBAR_LABELS_KO[prevExercise.footbar]} → ${FOOTBAR_LABELS_KO[exercise.footbar]}`,
        );
      }
      if (prevExercise.headrest !== exercise.headrest) {
        headrestSwapCount += 1;
        changedFields.push('headrest');
        stepFriction += 5;
        changeBadgesKo.push(
          `${HEADREST_LABELS_KO[prevExercise.headrest]} → ${HEADREST_LABELS_KO[exercise.headrest]}`,
        );
      }
      if (prevExercise.bodyPosition !== exercise.bodyPosition) {
        bodyPositionSwitchCount += 1;
        changedFields.push('bodyPosition');
        stepFriction += 7;
        changeBadgesKo.push(
          `자세 ${POSITION_LABELS[prevExercise.bodyPosition].ko.split(' ')[0]} → ${POSITION_LABELS[exercise.bodyPosition].ko.split(' ')[0]}`,
        );
      }
    }

    const actualTransitionSec = Math.max(
      0,
      Math.round(step.transitionSec ?? step.timeEstimate?.transitionSec ?? 0),
    );
    const recommendedTransitionSec = prevExercise
      ? computeRecommendedTransitionSec(changedFields)
      : 0;
    const bufferShortfallSec = Math.max(0, recommendedTransitionSec - actualTransitionSec);

    if (bufferShortfallSec > 0) {
      totalRecommendedBufferDeltaSec += bufferShortfallSec;
      stepsNeedingBufferUpgradeCount += 1;
      stepFriction += Math.min(10, Math.ceil(bufferShortfallSec / 3));
    }

    rawFrictionPoints += stepFriction;

    const severity: SequenceStepSetupDiff['severity'] =
      stepFriction >= 20 ? 'major' : stepFriction >= 8 ? 'minor' : 'smooth';

    stepDiffs.push({
      stepId: step.stepId,
      stepIndex: index,
      order: stepOrder,
      exerciseId: exercise.id,
      exerciseNameKo: exercise.nameKo,
      fromStepId: prevStep?.stepId ?? null,
      fromExerciseNameKo: prevExercise?.nameKo ?? null,
      apparatus: exercise.apparatus,
      previousApparatus: prevExercise?.apparatus ?? null,
      springs: effectiveSprings,
      previousSprings: prevSprings,
      box: exercise.box,
      previousBox: prevExercise?.box ?? null,
      footbar: exercise.footbar,
      previousFootbar: prevExercise?.footbar ?? null,
      headrest: exercise.headrest,
      previousHeadrest: prevExercise?.headrest ?? null,
      bodyPosition: exercise.bodyPosition,
      previousBodyPosition: prevExercise?.bodyPosition ?? null,
      changedFields,
      changeBadgesKo,
      actualTransitionSec,
      recommendedTransitionSec,
      bufferShortfallSec,
      frictionPoints: stepFriction,
      severity,
    });

    // Unilateral symmetry & pacing check
    if (exercise.isUnilateral) {
      unilateralStepCount += 1;
      const sides = resolveUnilateralSides(step);
      const totalDurationSec = Math.round(safeDurationMin * 60);
      const explanationSec = Math.max(
        0,
        Math.round(step.explanationSec ?? step.timeEstimate?.explanationSec ?? 0),
      );
      const netPracticeSec = Math.max(0, totalDurationSec - explanationSec - actualTransitionSec);
      const netPerSideSec = Math.floor(netPracticeSec / 2);

      if (sides !== 2) {
        unilateralAlerts.push({
          stepId: step.stepId,
          stepIndex: index,
          order: stepOrder,
          exerciseId: exercise.id,
          exerciseNameKo: exercise.nameKo,
          sides,
          totalDurationSec,
          explanationSec,
          transitionSec: actualTransitionSec,
          netPracticeSec,
          netPerSideSec,
          reasonKo: `#${stepOrder} ${exercise.nameKo}: 단측성(Unilateral) 동작이나 한쪽 방향(${step.sideMode === 'left' ? '좌측' : '우측'})만 설정되어 좌·우 대칭(양측 2세트) 확인이 필요합니다.`,
        });
      } else if (netPerSideSec < 20) {
        unilateralAlerts.push({
          stepId: step.stepId,
          stepIndex: index,
          order: stepOrder,
          exerciseId: exercise.id,
          exerciseNameKo: exercise.nameKo,
          sides,
          totalDurationSec,
          explanationSec,
          transitionSec: actualTransitionSec,
          netPracticeSec,
          netPerSideSec,
          reasonKo: `#${stepOrder} ${exercise.nameKo}: 설명(${explanationSec}초)·전환(${actualTransitionSec}초)을 제외한 측면당 실수련 시간이 ${netPerSideSec}초(< 20초)로 촉박합니다. 스텝 시간을 늘리거나 전환 동선을 묶어주세요.`,
        });
      }
    }

    // Bridging cervical safety check
    if (
      (step.blockCategory === 'bridging' || exercise.blockCategory === 'bridging') &&
      exercise.headrest === 'up'
    ) {
      biomechanicalWarningsKo.push(
        `#${stepOrder} ${exercise.nameKo}: 브릿징(견갑·골반 리프트) 구간에서 헤드레스트가 Up 상태입니다. 경추 과굴곡 예방을 위해 Flat 전환 큐잉을 권장합니다.`,
      );
    }

    prevStep = step;
    prevExercise = exercise;
    prevSprings = effectiveSprings;
  }

  // Detect non-contiguous box usage (e.g. short-box -> none -> short-box)
  const seenBoxes = new Set<BoxState>();
  let lastBox: BoxState | null = null;
  const nonContiguousBoxes = new Set<BoxState>();
  for (const item of boxSequence) {
    if (item.box !== 'none' && item.box !== lastBox) {
      if (seenBoxes.has(item.box)) {
        nonContiguousBoxes.add(item.box);
      }
      seenBoxes.add(item.box);
    }
    lastBox = item.box;
  }
  for (const boxType of nonContiguousBoxes) {
    setupOptimizationTipsKo.push(
      `${BOX_LABELS_KO[boxType]} 세팅이 비연속적으로 반복됩니다. ${BOX_LABELS_KO[boxType]} 동작들을 인접 블록으로 그룹화하거나 전환 여유시간(+25초)을 추가해 세팅 흐름을 매끄럽게 다듬어보세요.`,
    );
  }

  // Detect non-contiguous spring ping-ponging (A -> B -> A)
  for (let i = 2; i < springSequence.length; i += 1) {
    const a = springSequence[i - 2];
    const b = springSequence[i - 1];
    const c = springSequence[i];
    if (a.springs === c.springs && a.springs !== b.springs) {
      setupOptimizationTipsKo.push(
        `#${a.stepOrder}~#${c.stepOrder} 구간에서 스프링(${a.springs} → ${b.springs} → ${c.springs}) 왕복 교체가 감지되었습니다. 동일 스프링(${a.springs}) 동작을 연속 배치하거나 +15초 전환 여유시간을 권장합니다.`,
      );
      break;
    }
  }

  // Detect non-contiguous apparatus switches
  const seenApparatus = new Set<ApparatusType>();
  let lastApparatus: ApparatusType | null = null;
  for (const item of apparatusSequence) {
    if (item.apparatus !== lastApparatus) {
      if (seenApparatus.has(item.apparatus)) {
        setupOptimizationTipsKo.push(
          `${APPARATUS_LABELS[item.apparatus].ko} 기구 이동이 비연속적으로 분산되어 있습니다. 기구별 스테이션 블록으로 묶거나 이동 버퍼(+25초)를 확보하세요.`,
        );
        break;
      }
      seenApparatus.add(item.apparatus);
    }
    lastApparatus = item.apparatus;
  }

  if (stepsNeedingBufferUpgradeCount > 0) {
    setupOptimizationTipsKo.push(
      `기구·스프링·자세 전환이 있는 ${stepsNeedingBufferUpgradeCount}개 스텝에 권장 전환 여유시간(총 +${totalRecommendedBufferDeltaSec}초)을 반영하면 수업 딜레이를 예방할 수 있습니다.`,
    );
  }

  // Spinal plane distribution & biomechanical warnings
  const totalPlaneMentions = ALL_SPINAL_PLANES.reduce(
    (sum, plane) => sum + spinalPlaneCounts[plane],
    0,
  );

  const spinalPlaneDistribution: Record<SpinalPlane, number> = {
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
    neutral: 0,
  };

  if (totalPlaneMentions > 0) {
    for (const plane of ALL_SPINAL_PLANES) {
      spinalPlaneDistribution[plane] = Math.round(
        (spinalPlaneCounts[plane] / totalPlaneMentions) * 100,
      );
    }
  }

  let dominantSpinalPlane: SpinalPlane = 'neutral';
  let maxPlaneCount = -1;
  for (const plane of ALL_SPINAL_PLANES) {
    if (spinalPlaneCounts[plane] > maxPlaneCount) {
      maxPlaneCount = spinalPlaneCounts[plane];
      dominantSpinalPlane = plane;
    }
  }

  const missingSpinalPlanes = ALL_SPINAL_PLANES.filter((plane) => spinalPlaneCounts[plane] === 0);

  // Consecutive flexion steps without extension counter-balance
  let consecutiveFlexionCount = 0;
  let maxConsecutiveFlexionCount = 0;
  for (const wp of wavePoints) {
    const hasFlexion = wp.spinalPlanes.includes('flexion');
    const hasExtension = wp.spinalPlanes.includes('extension');
    if (hasFlexion && !hasExtension) {
      consecutiveFlexionCount += 1;
      if (consecutiveFlexionCount > maxConsecutiveFlexionCount) {
        maxConsecutiveFlexionCount = consecutiveFlexionCount;
      }
    } else if (hasExtension) {
      consecutiveFlexionCount = 0;
    }
  }

  if (maxConsecutiveFlexionCount >= 3 && spinalPlaneCounts.extension === 0) {
    biomechanicalWarningsKo.push(
      `척추 굴곡(Flexion) 동작이 ${maxConsecutiveFlexionCount}회 연속 이어지며 흉추 신전(Extension) 카운터 밸런스가 없습니다. 스완/풀링 스트랩 등 신전 블록 보강을 권장합니다.`,
    );
  } else if (maxConsecutiveFlexionCount >= 3) {
    biomechanicalWarningsKo.push(
      `척추 굴곡(Flexion) 위주 스텝이 ${maxConsecutiveFlexionCount}회 연속 배치되었습니다. 요추 피로도 완화를 위해 중간에 중립(Neutral) 또는 흉추 신전(Extension) 동작을 배치해 보세요.`,
    );
  }

  if (exerciseStepCount >= 4) {
    const hasWarmup = wavePoints.some((wp) => wp.blockCategory === 'warmup');
    const hasCooldown = wavePoints.some((wp) => wp.blockCategory === 'cooldown');
    if (!hasWarmup) {
      biomechanicalWarningsKo.push(
        `초반 워밍업(호흡·골반 임프린팅) 블록이 누락되었습니다. 본 운동 전 심부 코어 예열 스텝을 추가해 보세요.`,
      );
    }
    if (!hasCooldown) {
      biomechanicalWarningsKo.push(
        `마무리 쿨다운(측굴·호흡 정리) 블록이 없습니다. 수업 말미에 머메이드 또는 롤다운 스트레칭을 권장합니다.`,
      );
    }
  }

  if (
    exerciseStepCount >= 3 &&
    spinalPlaneCounts.flexion > 0 &&
    spinalPlaneCounts.extension === 0
  ) {
    const alreadyWarned = biomechanicalWarningsKo.some((msg) => msg.includes('신전(Extension)'));
    if (!alreadyWarned) {
      biomechanicalWarningsKo.push(
        `시퀀스 내 굴곡(${SPINAL_PLANE_LABELS.flexion.ko}) 대비 신전(${SPINAL_PLANE_LABELS.extension.ko}) 자극이 비어 있습니다. 전면·후면 사슬 균형을 점검해 보세요.`,
      );
    }
  }

  const transitionFrictionScore =
    exerciseStepCount <= 1
      ? 0
      : Math.max(0, Math.min(100, Math.round(rawFrictionPoints)));

  const warningPenalty =
    unilateralAlerts.length * 6 + Math.min(18, biomechanicalWarningsKo.length * 5);
  const flowReadinessScore =
    exerciseStepCount === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round(100 - transitionFrictionScore * 0.65 - warningPenalty)));

  const totalHardwareSwapCount =
    apparatusSwapCount +
    springSwapCount +
    boxSwapCount +
    footbarSwapCount +
    headrestSwapCount +
    bodyPositionSwitchCount;

  return {
    exerciseStepCount,
    restStepCount,
    totalDurationMin: Number(totalDurationMin.toFixed(1)),
    transitionFrictionScore,
    flowReadinessScore,
    apparatusSwapCount,
    springSwapCount,
    boxSwapCount,
    footbarSwapCount,
    headrestSwapCount,
    bodyPositionSwitchCount,
    totalHardwareSwapCount,
    totalRecommendedBufferDeltaSec,
    stepsNeedingBufferUpgradeCount,
    spinalPlaneCounts,
    spinalPlaneDistribution,
    dominantSpinalPlane,
    missingSpinalPlanes,
    wavePoints,
    stepDiffs,
    unilateralStepCount,
    unilateralAlerts,
    setupOptimizationTipsKo,
    biomechanicalWarningsKo,
  };
}

/**
 * Pure helper that returns a new copy of `steps` with minimum recommended `transitionSec`
 * (`>= 15s` on spring/position/footbar/headrest changes, `>= 25s` on box/apparatus changes)
 * without mutating the input array or step objects.
 */
export function buildOptimizedTransitionSteps(
  steps: readonly SequenceStep[],
  exercisesById: ExerciseLookupInput,
): SequenceStep[] {
  const analysis = analyzeSequenceFlow(steps, exercisesById);
  const diffByStepId = new Map<string, SequenceStepSetupDiff>();
  for (const diff of analysis.stepDiffs) {
    diffByStepId.set(diff.stepId, diff);
  }

  return steps.map((step) => {
    const diff = diffByStepId.get(step.stepId);
    if (!diff || diff.recommendedTransitionSec <= 0) {
      return { ...step };
    }
    const currentTransitionSec = Math.max(0, Math.round(step.transitionSec ?? 0));
    const nextTransitionSec = Math.max(currentTransitionSec, diff.recommendedTransitionSec);
    return {
      ...step,
      transitionSec: nextTransitionSec,
    };
  });
}
