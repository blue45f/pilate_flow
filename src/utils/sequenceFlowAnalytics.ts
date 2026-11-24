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
  let prevBox: BoxState | null = null;
  let prevFootbar: FootbarState | null = null;
  let prevHeadrest: HeadrestState | null = null;

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
    const effectiveBox: BoxState = step.boxOverride ?? exercise.box;
    const effectiveFootbar: FootbarState = step.footbarOverride ?? exercise.footbar;
    const effectiveHeadrest: HeadrestState = step.headrestOverride ?? exercise.headrest;
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
      box: effectiveBox,
      footbar: effectiveFootbar,
      headrest: effectiveHeadrest,
      selectedLayer: step.selectedLayer,
      durationMin: safeDurationMin,
      cumulativeMinutes: Number(totalDurationMin.toFixed(1)),
      intensityScore,
      isUnilateral: exercise.isUnilateral,
    });

    boxSequence.push({ stepOrder, box: effectiveBox, exerciseNameKo: exercise.nameKo });
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
      if (prevBox !== null && prevBox !== effectiveBox) {
        boxSwapCount += 1;
        changedFields.push('box');
        stepFriction += 20;
        changeBadgesKo.push(`박스 ${BOX_LABELS_KO[prevBox]} → ${BOX_LABELS_KO[effectiveBox]}`);
      }
      if (prevSprings !== null && prevSprings !== effectiveSprings) {
        springSwapCount += 1;
        changedFields.push('springs');
        stepFriction += 10;
        changeBadgesKo.push(`스프링 ${prevSprings} → ${effectiveSprings}`);
      }
      if (prevFootbar !== null && prevFootbar !== effectiveFootbar) {
        footbarSwapCount += 1;
        changedFields.push('footbar');
        stepFriction += 8;
        changeBadgesKo.push(
          `${FOOTBAR_LABELS_KO[prevFootbar]} → ${FOOTBAR_LABELS_KO[effectiveFootbar]}`,
        );
      }
      if (prevHeadrest !== null && prevHeadrest !== effectiveHeadrest) {
        headrestSwapCount += 1;
        changedFields.push('headrest');
        stepFriction += 5;
        changeBadgesKo.push(
          `${HEADREST_LABELS_KO[prevHeadrest]} → ${HEADREST_LABELS_KO[effectiveHeadrest]}`,
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
      box: effectiveBox,
      previousBox: prevBox,
      footbar: effectiveFootbar,
      previousFootbar: prevFootbar,
      headrest: effectiveHeadrest,
      previousHeadrest: prevHeadrest,
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
      effectiveHeadrest === 'up'
    ) {
      biomechanicalWarningsKo.push(
        `#${stepOrder} ${exercise.nameKo}: 브릿징(견갑·골반 리프트) 구간에서 헤드레스트가 Up 상태입니다. 경추 과굴곡 예방을 위해 Flat 전환 큐잉을 권장합니다.`,
      );
    }

    prevStep = step;
    prevExercise = exercise;
    prevSprings = effectiveSprings;
    prevBox = effectiveBox;
    prevFootbar = effectiveFootbar;
    prevHeadrest = effectiveHeadrest;
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

export interface SequenceTransitionOptimizationPlan {
  optimizedSteps: SequenceStep[];
  beforeAnalysis: SequenceFlowAnalysisResult;
  afterAnalysis: SequenceFlowAnalysisResult;
  beforeFrictionScore: number;
  afterFrictionScore: number;
  frictionDelta: number;
  savedTransitionSec: number;
  boxSwapsSaved: number;
  springChangesSaved: number;
  movedCount: number;
  canImprove: boolean;
  summaryKo: string;
}

interface StepSetupProfile {
  originalIndex: number;
  step: SequenceStep;
  exercise: PilatesExercise;
  blockCategory: ClassBlockCategory;
  apparatus: ApparatusType;
  box: BoxState;
  springs: string;
  footbar: FootbarState;
  headrest: HeadrestState;
  bodyPosition: BodyPosition;
  actualTransitionSec: number;
  isHighRpeExtensionOrInversion: boolean;
}

interface EdgeCostPair {
  a: number;
  b: number;
}

interface ExerciseBlockRun {
  kind: 'fixed' | 'optimizable';
  blockCategory: ClassBlockCategory;
  items: StepSetupProfile[];
  forbidHazardFirst: boolean;
}

const EXACT_DP_MAX_BLOCK_SIZE = 8;

const INVERSION_NAME_PATTERN =
  /inversion|roll[\s-]?over|short[\s-]?spine|long[\s-]?spine|overhead|jackknife|인버전|롤\s*오버|숏\s*스파인|롱\s*스파인|오버헤드|잭나이프/i;

function isHighRpeExtensionOrInversionStep(
  step: SequenceStep,
  exercise: PilatesExercise,
): boolean {
  const effectiveBlock = step.blockCategory || exercise.blockCategory;
  const descriptor = `${exercise.id} ${exercise.nameEn} ${exercise.nameKo} ${exercise.movementFamily ?? ''}`;
  if (INVERSION_NAME_PATTERN.test(descriptor)) {
    return true;
  }
  const intensity = computeStepIntensityScore(step, exercise);
  const isHighRpe =
    exercise.level === '2.0' || step.selectedLayer === 'hard' || intensity >= 72;
  const isExtension =
    effectiveBlock === 'extension' || exercise.spinalPlanes.includes('extension');
  return isExtension && isHighRpe;
}

function buildStepSetupProfile(
  step: SequenceStep,
  exercise: PilatesExercise,
  originalIndex: number,
): StepSetupProfile {
  return {
    originalIndex,
    step,
    exercise,
    blockCategory: step.blockCategory || exercise.blockCategory,
    apparatus: exercise.apparatus,
    box: step.boxOverride ?? exercise.box,
    springs: normalizeSprings(step, exercise),
    footbar: step.footbarOverride ?? exercise.footbar,
    headrest: step.headrestOverride ?? exercise.headrest,
    bodyPosition: exercise.bodyPosition,
    actualTransitionSec: Math.max(
      0,
      Math.round(step.transitionSec ?? step.timeEstimate?.transitionSec ?? 0),
    ),
    isHighRpeExtensionOrInversion: isHighRpeExtensionOrInversionStep(step, exercise),
  };
}

function computeTransitionEdgeCost(prev: StepSetupProfile, curr: StepSetupProfile): EdgeCostPair {
  const changedFields: SetupChangeField[] = [];
  let analyzeFriction = 0;
  let boxSwap = 0;
  let apparatusSwap = 0;
  let springSwap = 0;

  if (prev.apparatus !== curr.apparatus) {
    changedFields.push('apparatus');
    analyzeFriction += 22;
    apparatusSwap = 1;
  }
  if (prev.box !== curr.box) {
    changedFields.push('box');
    analyzeFriction += 20;
    boxSwap = 1;
  }
  if (prev.springs !== curr.springs) {
    changedFields.push('springs');
    analyzeFriction += 10;
    springSwap = 1;
  }
  if (prev.footbar !== curr.footbar) {
    changedFields.push('footbar');
    analyzeFriction += 8;
  }
  if (prev.headrest !== curr.headrest) {
    changedFields.push('headrest');
    analyzeFriction += 5;
  }
  if (prev.bodyPosition !== curr.bodyPosition) {
    changedFields.push('bodyPosition');
    analyzeFriction += 7;
  }

  const recommendedTransitionSec = computeRecommendedTransitionSec(changedFields);
  const bufferShortfallSec = Math.max(0, recommendedTransitionSec - curr.actualTransitionSec);
  if (bufferShortfallSec > 0) {
    analyzeFriction += Math.min(10, Math.ceil(bufferShortfallSec / 3));
  }

  // Secondary tie-breaker strictly prioritizes:
  // box swaps (highest) > apparatus switches > recommended transition sec > spring changes > total hardware swaps.
  const recSecDiv5 = Math.round(recommendedTransitionSec / 5);
  const secondary =
    boxSwap * 1_000_000_000_000 +
    apparatusSwap * 2_000_000_000 +
    recSecDiv5 * 1_000_000 +
    springSwap * 2_000 +
    changedFields.length;

  return { a: analyzeFriction, b: secondary };
}

function compareIndexPaths(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

function compareStringTuples(a: readonly string[], b: readonly string[]): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
  return a.length - b.length;
}

function isStrictlyLowerCost(a1: number, b1: number, a2: number, b2: number): boolean {
  return a1 < a2 || (a1 === a2 && b1 < b2);
}

interface ExactPathEntry {
  a: number;
  b: number;
  path: number[];
}

function solveExactBlockPairwisePaths(run: ExerciseBlockRun): Array<Array<ExactPathEntry | null>> {
  const { items, forbidHazardFirst } = run;
  const n = items.length;
  const matA: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const matB: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));

  for (let u = 0; u < n; u += 1) {
    for (let v = 0; v < n; v += 1) {
      if (u === v) continue;
      const cost = computeTransitionEdgeCost(items[u], items[v]);
      matA[u][v] = cost.a;
      matB[u][v] = cost.b;
    }
  }

  const result: Array<Array<ExactPathEntry | null>> = Array.from({ length: n }, () =>
    new Array<ExactPathEntry | null>(n).fill(null),
  );

  const maskCount = 1 << n;
  const fullMask = maskCount - 1;

  for (let start = 0; start < n; start += 1) {
    if (forbidHazardFirst && items[start].isHighRpeExtensionOrInversion) {
      continue;
    }

    const dpA = new Float64Array(maskCount * n);
    const dpB = new Float64Array(maskCount * n);
    dpA.fill(Number.POSITIVE_INFINITY);
    dpB.fill(Number.POSITIVE_INFINITY);
    const dpPath: Array<number[] | null> = new Array<number[] | null>(maskCount * n).fill(null);

    const startMask = 1 << start;
    const baseSlot = startMask * n + start;
    dpA[baseSlot] = 0;
    dpB[baseSlot] = 0;
    dpPath[baseSlot] = [start];

    for (let mask = startMask; mask < maskCount; mask += 1) {
      if ((mask & startMask) === 0) continue;
      const rowOffset = mask * n;
      for (let last = 0; last < n; last += 1) {
        const curA = dpA[rowOffset + last];
        if (!Number.isFinite(curA)) continue;
        const curB = dpB[rowOffset + last];
        const curPath = dpPath[rowOffset + last];
        if (!curPath) continue;

        for (let next = 0; next < n; next += 1) {
          if ((mask & (1 << next)) !== 0) continue;
          const nextMask = mask | (1 << next);
          const nextSlot = nextMask * n + next;
          const candA = curA + matA[last][next];
          const candB = curB + matB[last][next];
          const bestA = dpA[nextSlot];
          const bestB = dpB[nextSlot];

          if (candA < bestA || (candA === bestA && candB < bestB)) {
            dpA[nextSlot] = candA;
            dpB[nextSlot] = candB;
            dpPath[nextSlot] = [...curPath, next];
          } else if (candA === bestA && candB === bestB) {
            const candPath = [...curPath, next];
            const existingPath = dpPath[nextSlot];
            if (!existingPath || compareIndexPaths(candPath, existingPath) < 0) {
              dpPath[nextSlot] = candPath;
            }
          }
        }
      }
    }

    const fullRowOffset = fullMask * n;
    for (let end = 0; end < n; end += 1) {
      if (end === start) continue;
      const slot = fullRowOffset + end;
      const endA = dpA[slot];
      const endPath = dpPath[slot];
      if (Number.isFinite(endA) && endPath) {
        result[start][end] = {
          a: endA,
          b: dpB[slot],
          path: endPath,
        };
      }
    }
  }

  return result;
}

function optimizeExactRunChain(
  chain: readonly ExerciseBlockRun[],
  prevAnchor: StepSetupProfile | null,
  nextAnchor: StepSetupProfile | null,
): StepSetupProfile[][] {
  const numRuns = chain.length;
  const blockSolutions = chain.map((run) => solveExactBlockPairwisePaths(run));

  // Evaluate identity order cost across the chain
  let identityA = 0;
  let identityB = 0;
  let cursor = prevAnchor;
  for (let r = 0; r < numRuns; r += 1) {
    for (const item of chain[r].items) {
      if (cursor) {
        const edge = computeTransitionEdgeCost(cursor, item);
        identityA += edge.a;
        identityB += edge.b;
      }
      cursor = item;
    }
  }
  if (cursor && nextAnchor) {
    const tail = computeTransitionEdgeCost(cursor, nextAnchor);
    identityA += tail.a;
    identityB += tail.b;
  }

  // Viterbi DP over the ending item of each block in the chain
  interface ViterbiState {
    a: number;
    b: number;
    concatPath: number[];
    chosenPaths: number[][];
  }

  let prevStates: Array<ViterbiState | null> = [];

  for (let r = 0; r < numRuns; r += 1) {
    const run = chain[r];
    const n = run.items.length;
    const pairwise = blockSolutions[r];
    const nextStates: Array<ViterbiState | null> = new Array<ViterbiState | null>(n).fill(null);

    if (r === 0) {
      for (let start = 0; start < n; start += 1) {
        const headEdge = prevAnchor
          ? computeTransitionEdgeCost(prevAnchor, run.items[start])
          : { a: 0, b: 0 };
        for (let end = 0; end < n; end += 1) {
          const entry = pairwise[start][end];
          if (!entry) continue;
          const candA = headEdge.a + entry.a;
          const candB = headEdge.b + entry.b;
          const existing = nextStates[end];
          if (
            !existing ||
            isStrictlyLowerCost(candA, candB, existing.a, existing.b) ||
            (candA === existing.a &&
              candB === existing.b &&
              compareIndexPaths(entry.path, existing.concatPath) < 0)
          ) {
            nextStates[end] = {
              a: candA,
              b: candB,
              concatPath: entry.path,
              chosenPaths: [entry.path],
            };
          }
        }
      }
    } else {
      const prevRun = chain[r - 1];
      for (let prevEnd = 0; prevEnd < prevStates.length; prevEnd += 1) {
        const prevState = prevStates[prevEnd];
        if (!prevState) continue;
        const prevItem = prevRun.items[prevEnd];

        for (let start = 0; start < n; start += 1) {
          const linkEdge = computeTransitionEdgeCost(prevItem, run.items[start]);
          for (let end = 0; end < n; end += 1) {
            const entry = pairwise[start][end];
            if (!entry) continue;
            const candA = prevState.a + linkEdge.a + entry.a;
            const candB = prevState.b + linkEdge.b + entry.b;
            const existing = nextStates[end];
            if (!existing || isStrictlyLowerCost(candA, candB, existing.a, existing.b)) {
              nextStates[end] = {
                a: candA,
                b: candB,
                concatPath: [...prevState.concatPath, ...entry.path],
                chosenPaths: [...prevState.chosenPaths, entry.path],
              };
            } else if (candA === existing.a && candB === existing.b) {
              const candConcat = [...prevState.concatPath, ...entry.path];
              if (compareIndexPaths(candConcat, existing.concatPath) < 0) {
                nextStates[end] = {
                  a: candA,
                  b: candB,
                  concatPath: candConcat,
                  chosenPaths: [...prevState.chosenPaths, entry.path],
                };
              }
            }
          }
        }
      }
    }

    prevStates = nextStates;
  }

  const lastRun = chain[numRuns - 1];
  let bestFinal: ViterbiState | null = null;
  for (let end = 0; end < prevStates.length; end += 1) {
    const st = prevStates[end];
    if (!st) continue;
    const tail = nextAnchor
      ? computeTransitionEdgeCost(lastRun.items[end], nextAnchor)
      : { a: 0, b: 0 };
    const candA = st.a + tail.a;
    const candB = st.b + tail.b;
    if (
      !bestFinal ||
      isStrictlyLowerCost(candA, candB, bestFinal.a, bestFinal.b) ||
      (candA === bestFinal.a &&
        candB === bestFinal.b &&
        compareIndexPaths(st.concatPath, bestFinal.concatPath) < 0)
    ) {
      bestFinal = {
        a: candA,
        b: candB,
        concatPath: st.concatPath,
        chosenPaths: st.chosenPaths,
      };
    }
  }

  if (!bestFinal || !isStrictlyLowerCost(bestFinal.a, bestFinal.b, identityA, identityB)) {
    return chain.map((run) => [...run.items]);
  }

  return chain.map((run, r) => bestFinal!.chosenPaths[r].map((idx) => run.items[idx]));
}

function evaluateLargeTourCost(
  tour: readonly StepSetupProfile[],
  prevAnchor: StepSetupProfile | null,
  nextAnchor: StepSetupProfile | null,
): EdgeCostPair {
  let a = 0;
  let b = 0;
  if (tour.length === 0) return { a, b };
  if (prevAnchor) {
    const head = computeTransitionEdgeCost(prevAnchor, tour[0]);
    a += head.a;
    b += head.b;
  }
  for (let i = 1; i < tour.length; i += 1) {
    const edge = computeTransitionEdgeCost(tour[i - 1], tour[i]);
    a += edge.a;
    b += edge.b;
  }
  if (nextAnchor) {
    const tail = computeTransitionEdgeCost(tour[tour.length - 1], nextAnchor);
    a += tail.a;
    b += tail.b;
  }
  return { a, b };
}

function optimizeLargeBlockHeuristic(
  run: ExerciseBlockRun,
  prevAnchor: StepSetupProfile | null,
  nextAnchor: StepSetupProfile | null,
): StepSetupProfile[] {
  const { items, forbidHazardFirst } = run;
  const n = items.length;
  const identityCost = evaluateLargeTourCost(items, prevAnchor, nextAnchor);

  // Canonicalize by stepId so heuristic output is 100% invariant to input permutation (strict idempotency).
  const canonical = [...items].sort((x, y) =>
    x.step.stepId === y.step.stepId
      ? x.originalIndex - y.originalIndex
      : x.step.stepId < y.step.stepId
        ? -1
        : 1,
  );

  const validStarts: number[] = [];
  for (let i = 0; i < n; i += 1) {
    if (forbidHazardFirst && canonical[i].isHighRpeExtensionOrInversion) continue;
    validStarts.push(i);
  }
  if (validStarts.length === 0) {
    return [...items];
  }

  // Cap start candidates deterministically for very large blocks while checking all starts for n <= 20
  let startIndices = validStarts;
  if (validStarts.length > 20) {
    const ranked = [...validStarts].sort((ia, ib) => {
      if (prevAnchor) {
        const ca = computeTransitionEdgeCost(prevAnchor, canonical[ia]);
        const cb = computeTransitionEdgeCost(prevAnchor, canonical[ib]);
        if (ca.a !== cb.a) return ca.a - cb.a;
        if (ca.b !== cb.b) return ca.b - cb.b;
      }
      return ia - ib;
    });
    startIndices = ranked.slice(0, 16);
  }

  let bestTour: StepSetupProfile[] | null = null;
  let bestCost: EdgeCostPair = { a: Number.POSITIVE_INFINITY, b: Number.POSITIVE_INFINITY };
  let bestIds: string[] = [];

  for (const startIdx of startIndices) {
    const used = new Uint8Array(n);
    const tour: StepSetupProfile[] = [canonical[startIdx]];
    used[startIdx] = 1;

    while (tour.length < n) {
      const current = tour[tour.length - 1];
      let bestNext = -1;
      let bestNextCost: EdgeCostPair = { a: Number.POSITIVE_INFINITY, b: Number.POSITIVE_INFINITY };
      const isLastPick = tour.length === n - 1;

      for (let candIdx = 0; candIdx < n; candIdx += 1) {
        if (used[candIdx]) continue;
        const edge = computeTransitionEdgeCost(current, canonical[candIdx]);
        let candA = edge.a;
        let candB = edge.b;
        if (isLastPick && nextAnchor) {
          const tail = computeTransitionEdgeCost(canonical[candIdx], nextAnchor);
          candA += tail.a;
          candB += tail.b;
        }
        if (isStrictlyLowerCost(candA, candB, bestNextCost.a, bestNextCost.b)) {
          bestNextCost = { a: candA, b: candB };
          bestNext = candIdx;
        }
      }

      if (bestNext === -1) break;
      used[bestNext] = 1;
      tour.push(canonical[bestNext]);
    }

    // 2-opt local search until fixed point
    let curCost = evaluateLargeTourCost(tour, prevAnchor, nextAnchor);
    let improved = true;
    let guard = 0;
    while (improved && guard < 120) {
      improved = false;
      guard += 1;
      for (let i = 0; i < n - 1; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          if (i === 0 && forbidHazardFirst && tour[j].isHighRpeExtensionOrInversion) {
            continue;
          }
          const candidate = [
            ...tour.slice(0, i),
            ...tour.slice(i, j + 1).reverse(),
            ...tour.slice(j + 1),
          ];
          const candCost = evaluateLargeTourCost(candidate, prevAnchor, nextAnchor);
          if (isStrictlyLowerCost(candCost.a, candCost.b, curCost.a, curCost.b)) {
            for (let k = 0; k < n; k += 1) {
              tour[k] = candidate[k];
            }
            curCost = candCost;
            improved = true;
          }
        }
      }
    }

    const tourIds = tour.map((p) => p.step.stepId);
    if (
      !bestTour ||
      isStrictlyLowerCost(curCost.a, curCost.b, bestCost.a, bestCost.b) ||
      (curCost.a === bestCost.a &&
        curCost.b === bestCost.b &&
        compareStringTuples(tourIds, bestIds) < 0)
    ) {
      bestTour = tour;
      bestCost = curCost;
      bestIds = tourIds;
    }
  }

  if (!bestTour || !isStrictlyLowerCost(bestCost.a, bestCost.b, identityCost.a, identityCost.b)) {
    return [...items];
  }
  return bestTour;
}

function sumRecommendedTransitionSec(analysis: SequenceFlowAnalysisResult): number {
  return analysis.stepDiffs.reduce((sum, diff) => sum + diff.recommendedTransitionSec, 0);
}

/**
 * Pure, deterministic, strictly idempotent optimizer that reorders unlocked exercise steps
 * ONLY within contiguous non-warmup/non-cooldown `blockCategory` runs to minimize box,
 * apparatus, spring, footbar, headrest, and posture transition friction while preserving
 * all biomechanical and pedagogical safety boundaries.
 */
export function optimizeSequenceTransitions(
  steps: readonly SequenceStep[],
  exercisesById: ExerciseLookupInput,
): SequenceTransitionOptimizationPlan {
  const exerciseMap = resolveExerciseMap(exercisesById);
  const beforeAnalysis = analyzeSequenceFlow(steps, exerciseMap);
  const beforeFrictionScore = beforeAnalysis.transitionFrictionScore;

  const buildNoOpPlan = (): SequenceTransitionOptimizationPlan => ({
    optimizedSteps: steps.map((step) => ({ ...step })),
    beforeAnalysis,
    afterAnalysis: beforeAnalysis,
    beforeFrictionScore,
    afterFrictionScore: beforeFrictionScore,
    frictionDelta: 0,
    savedTransitionSec: 0,
    boxSwapsSaved: 0,
    springChangesSaved: 0,
    movedCount: 0,
    canImprove: false,
    summaryKo: '현재 블록 경계 내에서 기구·스프링 전환 동선이 이미 최적화되어 있습니다.',
  });

  if (steps.length <= 1) {
    return buildNoOpPlan();
  }

  // Locate the last warmup exercise index so pre-warmup high-RPE extension/inversion steps stay pinned
  let lastWarmupIndex = -1;
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (step.kind === 'rest') continue;
    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) continue;
    const blockCategory = step.blockCategory || exercise.blockCategory;
    if (blockCategory === 'warmup') {
      lastWarmupIndex = i;
    }
  }

  // Partition into contiguous exercise-bearing runs; rest, unknown, locked, warmup, cooldown,
  // and pre-warmup high-RPE extension/inversion steps act as immovable boundaries.
  const runs: ExerciseBlockRun[] = [];
  let pendingOptimizable: StepSetupProfile[] = [];
  let pendingBlockCategory: ClassBlockCategory | null = null;

  const flushPending = () => {
    if (pendingOptimizable.length === 0 || pendingBlockCategory === null) {
      pendingOptimizable = [];
      pendingBlockCategory = null;
      return;
    }
    runs.push({
      kind: pendingOptimizable.length >= 2 ? 'optimizable' : 'fixed',
      blockCategory: pendingBlockCategory,
      items: pendingOptimizable,
      forbidHazardFirst: false,
    });
    pendingOptimizable = [];
    pendingBlockCategory = null;
  };

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.kind === 'rest') {
      flushPending();
      continue;
    }
    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) {
      flushPending();
      continue;
    }

    const profile = buildStepSetupProfile(step, exercise, index);
    const isProtectedBlock =
      profile.blockCategory === 'warmup' || profile.blockCategory === 'cooldown';
    const isPreWarmupHazard =
      lastWarmupIndex >= 0 &&
      index < lastWarmupIndex &&
      profile.isHighRpeExtensionOrInversion;

    if (step.locked || isProtectedBlock || isPreWarmupHazard) {
      flushPending();
      runs.push({
        kind: 'fixed',
        blockCategory: profile.blockCategory,
        items: [profile],
        forbidHazardFirst: false,
      });
      continue;
    }

    if (pendingBlockCategory !== null && pendingBlockCategory !== profile.blockCategory) {
      flushPending();
    }
    pendingBlockCategory = profile.blockCategory;
    pendingOptimizable.push(profile);
  }
  flushPending();

  // Standalone length-2 run with no adjacent exercise blocks has no boundary friction to reduce.
  if (runs.length === 1 && runs[0].kind === 'optimizable' && runs[0].items.length === 2) {
    return buildNoOpPlan();
  }

  // If sequence has no warmup at all and the very first run starts with a non-hazard step
  // while containing high-RPE extension/inversion steps, prevent moving a hazard to index 0.
  if (lastWarmupIndex === -1 && runs.length > 0 && runs[0].kind === 'optimizable') {
    const firstItems = runs[0].items;
    const hasHazard = firstItems.some((item) => item.isHighRpeExtensionOrInversion);
    const startsSafe = !firstItems[0].isHighRpeExtensionOrInversion;
    if (hasHazard && startsSafe) {
      runs[0].forbidHazardFirst = true;
    }
  }

  // Solve run-by-run: maximal consecutive chains of small optimizable runs (n <= 8)
  // are solved jointly with exact Held-Karp + Viterbi DP; larger runs use canonical NN + 2-opt.
  const optimizedProfilesByRun: StepSetupProfile[][] = new Array<StepSetupProfile[]>(runs.length);
  let prevAnchor: StepSetupProfile | null = null;
  let r = 0;

  while (r < runs.length) {
    const run = runs[r];
    if (run.kind === 'fixed') {
      optimizedProfilesByRun[r] = [...run.items];
      prevAnchor = run.items[run.items.length - 1] ?? prevAnchor;
      r += 1;
      continue;
    }

    if (run.items.length > EXACT_DP_MAX_BLOCK_SIZE) {
      const nextRun = r + 1 < runs.length ? runs[r + 1] : null;
      const nextAnchor = nextRun && nextRun.kind === 'fixed' ? (nextRun.items[0] ?? null) : null;
      const solved = optimizeLargeBlockHeuristic(run, prevAnchor, nextAnchor);
      optimizedProfilesByRun[r] = solved;
      prevAnchor = solved[solved.length - 1] ?? prevAnchor;
      r += 1;
      continue;
    }

    let chainEnd = r;
    while (
      chainEnd < runs.length &&
      runs[chainEnd].kind === 'optimizable' &&
      runs[chainEnd].items.length <= EXACT_DP_MAX_BLOCK_SIZE
    ) {
      chainEnd += 1;
    }

    const chain = runs.slice(r, chainEnd);
    const afterRun = chainEnd < runs.length ? runs[chainEnd] : null;
    const nextAnchor =
      afterRun && afterRun.kind === 'fixed' ? (afterRun.items[0] ?? null) : null;

    const solvedChain = optimizeExactRunChain(chain, prevAnchor, nextAnchor);
    for (let k = 0; k < solvedChain.length; k += 1) {
      optimizedProfilesByRun[r + k] = solvedChain[k];
    }
    const lastSolved = solvedChain[solvedChain.length - 1];
    prevAnchor = lastSolved[lastSolved.length - 1] ?? prevAnchor;
    r = chainEnd;
  }

  // Reconstruct full step list placing optimized profiles into their original block slots
  // while preserving rest/unknown/locked/warmup/cooldown slots verbatim.
  const nextSteps: SequenceStep[] = steps.map((step) => ({ ...step }));
  for (let runIdx = 0; runIdx < runs.length; runIdx += 1) {
    const originalItems = runs[runIdx].items;
    const solvedItems = optimizedProfilesByRun[runIdx];
    for (let i = 0; i < originalItems.length; i += 1) {
      const targetIndex = originalItems[i].originalIndex;
      nextSteps[targetIndex] = { ...solvedItems[i].step };
    }
  }

  let movedCount = 0;
  for (let i = 0; i < steps.length; i += 1) {
    if (nextSteps[i].stepId !== steps[i].stepId) {
      movedCount += 1;
    }
  }

  if (movedCount === 0) {
    return buildNoOpPlan();
  }

  const reindexedSteps: SequenceStep[] = nextSteps.map((step, index) => ({
    ...step,
    order: index + 1,
  }));

  const afterAnalysis = analyzeSequenceFlow(reindexedSteps, exerciseMap);
  const afterFrictionScore = afterAnalysis.transitionFrictionScore;
  const frictionDelta = Math.max(0, beforeFrictionScore - afterFrictionScore);
  const savedTransitionSec = Math.max(
    0,
    sumRecommendedTransitionSec(beforeAnalysis) - sumRecommendedTransitionSec(afterAnalysis),
  );
  const boxSwapsSaved = Math.max(0, beforeAnalysis.boxSwapCount - afterAnalysis.boxSwapCount);
  const springChangesSaved = Math.max(
    0,
    beforeAnalysis.springSwapCount - afterAnalysis.springSwapCount,
  );
  const hardwareSwapsSaved = Math.max(
    0,
    beforeAnalysis.totalHardwareSwapCount - afterAnalysis.totalHardwareSwapCount,
  );

  const hasVerifiedImprovement =
    afterFrictionScore <= beforeFrictionScore &&
    (frictionDelta > 0 ||
      savedTransitionSec > 0 ||
      boxSwapsSaved > 0 ||
      springChangesSaved > 0 ||
      hardwareSwapsSaved > 0);

  if (!hasVerifiedImprovement) {
    return buildNoOpPlan();
  }

  const metricParts: string[] = [];
  if (frictionDelta > 0) metricParts.push(`마찰도 -${frictionDelta}점`);
  if (savedTransitionSec > 0) metricParts.push(`전환 시간 -${savedTransitionSec}초`);
  if (boxSwapsSaved > 0) metricParts.push(`박스 전환 -${boxSwapsSaved}회`);
  if (springChangesSaved > 0) metricParts.push(`스프링 교체 -${springChangesSaved}회`);

  const summaryKo =
    metricParts.length > 0
      ? `블록 경계와 워밍업·쿨다운을 유지한 채 ${movedCount}개 동작 순서를 정돈했습니다 (${metricParts.join(' · ')}).`
      : `블록 경계와 워밍업·쿨다운을 유지한 채 ${movedCount}개 동작 순서를 정돈했습니다.`;

  return {
    optimizedSteps: reindexedSteps,
    beforeAnalysis,
    afterAnalysis,
    beforeFrictionScore,
    afterFrictionScore,
    frictionDelta,
    savedTransitionSec,
    boxSwapsSaved,
    springChangesSaved,
    movedCount,
    canImprove: true,
    summaryKo,
  };
}
