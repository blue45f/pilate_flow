import { isExerciseAutoEligible } from './exerciseReview';
import {
  DEFAULT_OWNED_EQUIPMENT,
  EQUIPMENT_OPTIONS,
  getExerciseEquipment,
  equipmentRequirementsSatisfied,
  isEquipmentId,
} from '../data/equipmentCatalog';
import { parseReferenceTime, parseYouTubeReference } from '../schemas/pilatesSchema';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  POSITION_LABELS,
  PROP_LABELS,
  REFORMER_BRAND_META,
} from '../data/pilatesCatalog';
import type {
  AutoGenerateCriteria,
  ClassBlockCategory,
  ClassHistoryLog,
  PilatesExercise,
  ReformerBrand,
  SequenceAnalytics,
  SequenceStep,
  SpinalPlane,
  TransitionAlert,
} from '../types/pilates';

export function extractYouTubeVideoId(url: string): string {
  return parseYouTubeReference(url)?.videoId ?? '';
}

export function parseTimeTextToSeconds(timeText: string): number {
  return parseReferenceTime(timeText) ?? 0;
}

export function formatSecondsToMMSS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function inferBlockCategoryFromText(text: string, index = 0): ClassBlockCategory {
  const lower = text.toLowerCase();
  if (
    /호흡|워밍업|예열|임프린트|펠빅|롤다운 바|릴리즈|warmup|breath|imprint|pelvic clock/.test(lower)
  ) {
    return 'warmup';
  }
  if (/풋워크|카프|프랜싱|footwork|heels|arches|prancing/.test(lower)) {
    return 'footwork';
  }
  if (/브릿지|브릿징|분절|아티큘레이션|패러킷|bridge|bridging|pelvic lift/.test(lower)) {
    return 'bridging';
  }
  if (/헌드레드|복부|코어|크런치|앱|크리스크로스|롤백|hundred|core|abs|criss/.test(lower)) {
    return 'core';
  }
  if (/상체|로잉|암|체스트|트위스트|어깨|스트랩 암|arm|rowing|chest|shave|hug/.test(lower)) {
    return 'upper-body';
  }
  if (
    /하체|스쿠터|런지|스플릿|스쿼트|둔근|힙|사이드 라잉|scooter|lunge|split|glute|leg/.test(lower)
  ) {
    return 'lower-body';
  }
  if (
    /플랭크|롱스트레치|롱 스트레치|엘리펀트|파이크|니 스트레치|plank|stretch|elephant|pike/.test(
      lower,
    )
  ) {
    return 'plank';
  }
  if (/신전|스완|풀링|백 익스텐션|브레스트|swan|pulling|extension/.test(lower)) {
    return 'extension';
  }
  if (
    /핏인스트랩|핏 인 스트랩|프로그|레그써클|숏스파인|feet in straps|frog|short spine/.test(lower)
  ) {
    return 'feet-in-straps';
  }
  if (/머메이드|쿨다운|마무리|파이널|스트레칭|mermaid|cool|rolldown/.test(lower)) {
    return 'cooldown';
  }
  const fallbackOrder: ClassBlockCategory[] = [
    'warmup',
    'footwork',
    'bridging',
    'core',
    'upper-body',
    'lower-body',
    'plank',
    'extension',
    'feet-in-straps',
    'cooldown',
  ];
  return fallbackOrder[index % fallbackOrder.length];
}

export function extractSpringFromText(text: string): string {
  const springMatch = text.match(/\b([1-3][RBYGW](?:\s*[+,/]?\s*[1-2][RBYGW])?)\b/i);
  if (springMatch?.[1]) {
    return springMatch[1].toUpperCase().replace(/[+,/]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (/빨강\s*2.*파랑\s*1/.test(text)) return '2R 1B';
  if (/빨강\s*2/.test(text)) return '2R';
  if (/빨강\s*1.*파랑\s*1/.test(text)) return '1R 1B';
  if (/빨강\s*1.*노랑\s*1/.test(text)) return '1R 1Y';
  if (/빨강\s*1/.test(text)) return '1R';
  if (/파랑\s*1/.test(text)) return '1B';
  if (/노랑\s*1/.test(text)) return '1Y';
  return '1R 1B';
}

export interface ParsedChapterClip {
  startSec: number;
  endSec?: number;
  startTimeText: string;
  titleKo: string;
  inferredBlock: ClassBlockCategory;
  inferredSprings: string;
  estimatedDurationMin: number;
}

export function parseYouTubeChaptersText(rawText: string): ParsedChapterClip[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const rawItems: Array<{ startSec: number; startTimeText: string; title: string }> = [];

  for (const line of lines) {
    const match = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–·]?\s*(.+)/);
    if (match?.[1] && match?.[2]) {
      const startSec = parseTimeTextToSeconds(match[1]);
      rawItems.push({
        startSec,
        startTimeText: match[1],
        title: match[2].trim(),
      });
    }
  }

  return rawItems.map((item, idx) => {
    const nextItem = rawItems[idx + 1];
    const endSec = nextItem ? nextItem.startSec : undefined;
    const rawDiffMin = endSec ? Math.round((endSec - item.startSec) / 60) : 5;
    const estimatedDurationMin = Math.min(12, Math.max(2, rawDiffMin || 5));
    const inferredBlock = inferBlockCategoryFromText(item.title, idx);
    const inferredSprings = extractSpringFromText(item.title);
    const cleanedTitle = item.title.replace(/\([1-3][RBYGW][^)]*\)/gi, '').trim();

    return {
      startSec: item.startSec,
      endSec,
      startTimeText: item.startTimeText,
      titleKo: cleanedTitle || item.title,
      inferredBlock,
      inferredSprings,
      estimatedDurationMin,
    };
  });
}

export function getRecentlyTaughtExerciseIds(
  historyLogs: ClassHistoryLog[],
  daysWindow: number,
  targetGroupId?: string,
  referenceDate: Date = new Date(),
): Set<string> {
  if (daysWindow <= 0) return new Set();
  const cutoffMs = referenceDate.getTime() - daysWindow * 24 * 60 * 60 * 1000;
  const recentSet = new Set<string>();

  for (const log of historyLogs) {
    if (targetGroupId && targetGroupId !== 'all' && log.groupId !== targetGroupId) {
      continue;
    }
    const logTime = new Date(log.taughtAt).getTime();
    if (logTime >= cutoffMs && logTime <= referenceDate.getTime()) {
      for (const exId of log.exerciseIds) {
        recentSet.add(exId);
      }
    }
  }
  return recentSet;
}

export function getExerciseLastTaughtInfo(
  exerciseId: string,
  historyLogs: ClassHistoryLog[],
  targetGroupId?: string,
): { count: number; lastTaughtAt?: string; lastGroupName?: string } {
  let count = 0;
  let lastTaughtAt: string | undefined;
  let lastGroupName: string | undefined;

  for (const log of historyLogs) {
    if (targetGroupId && targetGroupId !== 'all' && log.groupId !== targetGroupId) {
      continue;
    }
    if (log.exerciseIds.includes(exerciseId)) {
      count += 1;
      if (!lastTaughtAt || new Date(log.taughtAt) > new Date(lastTaughtAt)) {
        lastTaughtAt = log.taughtAt;
        lastGroupName = log.groupName;
      }
    }
  }

  return { count, lastTaughtAt, lastGroupName };
}

export function analyzeSequence(
  steps: SequenceStep[],
  exercisesMap: Map<string, PilatesExercise>,
  historyLogs: ClassHistoryLog[],
  targetGroupId?: string,
  targetMinutes = 50,
): SequenceAnalytics {
  const spinalPlaneCounts: Record<SpinalPlane, number> = {
    flexion: 0,
    extension: 0,
    lateral: 0,
    rotation: 0,
    neutral: 0,
  };

  let totalMinutes = 0;
  let springChangeCount = 0;
  let boxChangeCount = 0;
  let positionChangeCount = 0;
  const transitionAlerts: TransitionAlert[] = [];

  const recentIds = getRecentlyTaughtExerciseIds(historyLogs, 10, targetGroupId);
  let recentlyTaughtCount = 0;

  steps.forEach((step, idx) => {
    totalMinutes += step.durationMin;
    const ex = exercisesMap.get(step.exerciseId);
    if (!ex) return;

    if (recentIds.has(ex.id)) {
      recentlyTaughtCount += 1;
    }

    for (const plane of ex.spinalPlanes) {
      spinalPlaneCounts[plane] = (spinalPlaneCounts[plane] ?? 0) + 1;
    }

    if (idx > 0) {
      const prevStep = steps[idx - 1];
      const prevEx = exercisesMap.get(prevStep.exerciseId);
      if (prevEx) {
        const reasons: string[] = [];
        const prevSpring = prevStep.customSpringOverride || prevEx.springs;
        const currSpring = step.customSpringOverride || ex.springs;

        if (prevSpring !== currSpring) {
          springChangeCount += 1;
          reasons.push(`스프링 변경 (${prevSpring} → ${currSpring})`);
        }
        if (prevEx.box !== ex.box) {
          boxChangeCount += 1;
          const boxLabel: Record<string, string> = {
            none: '박스 없음',
            'long-box': '롱박스',
            'short-box': '숏박스',
          };
          reasons.push(`박스 세팅 (${boxLabel[prevEx.box]} → ${boxLabel[ex.box]})`);
        }
        if (prevEx.bodyPosition !== ex.bodyPosition) {
          positionChangeCount += 1;
          reasons.push(
            `포지션 전환 (${POSITION_LABELS[prevEx.bodyPosition].ko.split(' ')[0]} → ${POSITION_LABELS[ex.bodyPosition].ko.split(' ')[0]})`,
          );
        }

        let severity: 'smooth' | 'minor' | 'major' = 'smooth';
        if (prevEx.box !== ex.box || reasons.length >= 2) {
          severity = 'major';
        } else if (reasons.length === 1) {
          severity = 'minor';
        }

        transitionAlerts.push({
          fromStepIndex: idx - 1,
          toStepIndex: idx,
          reasons,
          severity,
        });
      }
    }
  });

  const requiredPlanes: SpinalPlane[] = ['flexion', 'extension', 'lateral', 'rotation'];
  const missingSpinalPlanes = requiredPlanes.filter((p) => spinalPlaneCounts[p] === 0);

  // In a 10-block 50-min class, up to 4 spring shifts and 1 box placement are baseline studio flow
  const excessSprings = Math.max(0, springChangeCount - 4);
  const excessBoxes = Math.max(0, boxChangeCount - 1);
  const excessPositions = Math.max(0, positionChangeCount - 5);
  const penalty = excessSprings * 3 + excessBoxes * 5 + excessPositions * 2;
  const transitionScore = steps.length === 0 ? 100 : Math.max(68, Math.min(100, 98 - penalty));

  return {
    totalMinutes,
    targetMinutes,
    pacingDelta: totalMinutes - targetMinutes,
    spinalPlaneCounts,
    missingSpinalPlanes,
    transitionScore,
    transitionAlerts,
    springChangeCount,
    boxChangeCount,
    positionChangeCount,
    recentlyTaughtCount,
  };
}

export interface StepTiming {
  totalSec: number;
  movementSec: number;
  perSideSec: number;
  sides: 1 | 2;
  explanationSec: number;
  transitionSec: number;
}

export function isRestStep(step: Pick<SequenceStep, 'kind'>): boolean {
  return step.kind === 'rest';
}

/** Whole-second totals; rest remains part of the class total. */
export function getSequenceDurations(steps: SequenceStep[]): {
  totalSec: number;
  exerciseSec: number;
  restSec: number;
} {
  let exerciseSec = 0;
  let restSec = 0;
  for (const step of steps) {
    const seconds = getStepTiming(step).totalSec;
    if (isRestStep(step)) restSec += seconds;
    else exerciseSec += seconds;
  }
  return { totalSec: exerciseSec + restSec, exerciseSec, restSec };
}

function validateRestBudget(steps: SequenceStep[], targetMinutes: number): void {
  const rests = steps.filter(isRestStep);
  if (
    rests.some(
      (step) =>
        !Number.isFinite(step.durationMin) ||
        step.durationMin <= 0 ||
        Math.round(step.durationMin * 60) <= 0 ||
        step.exerciseId !== '' ||
        step.repetitions !== undefined ||
        step.sets !== undefined ||
        step.sideMode !== undefined,
    )
  )
    throw new Error('휴식 시간은 0보다 큰 유효한 시간으로 입력해 주세요.');
  if (getSequenceDurations(rests).restSec >= Math.round(targetMinutes * 60))
    throw new Error(
      '휴식 합계는 전체 수업 시간보다 작아야 합니다. 휴식을 줄이거나 수업 시간을 늘려 주세요.',
    );
}

/** Legacy steps without a timing breakdown retain their original total duration. */
export function getStepTiming(step: SequenceStep, exercise?: PilatesExercise): StepTiming {
  const totalSec = Number.isFinite(step.durationMin)
    ? Math.max(0, Math.round(step.durationMin * 60))
    : 0;
  if (isRestStep(step))
    return {
      totalSec,
      movementSec: 0,
      perSideSec: 0,
      sides: 1,
      explanationSec: 0,
      transitionSec: 0,
    };
  const explanationSec = Math.min(totalSec, Math.max(0, Math.round(step.explanationSec ?? 0)));
  const transitionSec = Math.min(
    totalSec - explanationSec,
    Math.max(0, Math.round(step.transitionSec ?? 0)),
  );
  const movementSec = totalSec - explanationSec - transitionSec;
  const sides =
    step.sideMode === 'left-then-right' || step.sideMode === 'right-then-left'
      ? 2
      : step.sideMode
        ? 1
        : exercise?.isUnilateral
          ? 2
          : 1;
  return {
    totalSec,
    movementSec,
    perSideSec: movementSec / sides,
    sides,
    explanationSec,
    transitionSec,
  };
}

/** Anatomical labels only when explicitly entered; catalog unilateral metadata gives no side order. */
export function getStepSideLabels(step: SequenceStep, exercise?: PilatesExercise): string[] {
  if (isRestStep(step)) return [];
  switch (step.sideMode) {
    case 'left':
      return ['왼쪽'];
    case 'right':
      return ['오른쪽'];
    case 'together':
      return ['양쪽 함께'];
    case 'left-then-right':
      return ['왼쪽', '오른쪽'];
    case 'right-then-left':
      return ['오른쪽', '왼쪽'];
    default:
      return exercise?.isUnilateral ? ['첫 번째 쪽', '반대쪽'] : ['함께'];
  }
}

/** Explicit movement families win; otherwise normalize names across apparatus and formatting. */
export function getMovementKey(exercise: PilatesExercise): string {
  if (exercise.movementFamily?.trim())
    return exercise.movementFamily
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '');
  return (
    (exercise.nameEn.trim() || exercise.nameKo)
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(
        /\b(?:reformer|cadillac|tower|wunda|chair|ladder[\s-]*barrel|spine[\s-]*corrector|barrel|matwork|mat|pilates|workout|routine|flow)\b/g,
        ' ',
      )
      .replace(
        /리포머|캐딜락|타워|운다|체어|래더\s*바렐|스파인\s*코렉터|바렐|매트|필라테스|시퀀스/g,
        ' ',
      )
      .replace(/\b\d+\s*(?:min|minutes?)\b|\d+\s*분/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, '') || `unnamed:${exercise.id}`
  );
}

export function exerciseMatchesCriteria(
  exercise: PilatesExercise,
  criteria: AutoGenerateCriteria,
): boolean {
  const requirements = getExerciseEquipment(exercise);
  const availableEquipment =
    criteria.availableEquipment ??
    criteria.ownedApparatus ??
    (criteria.apparatus === 'mixed' ? DEFAULT_OWNED_EQUIPMENT : [criteria.apparatus]);
  return (
    requirements.requirementsKnown &&
    equipmentRequirementsSatisfied(requirements.requiredEquipment, availableEquipment) &&
    (criteria.apparatus === 'mixed' || exercise.apparatus === criteria.apparatus) &&
    (!criteria.ownedApparatus || criteria.ownedApparatus.includes(exercise.apparatus)) &&
    Number(exercise.level) <= Number(criteria.level) &&
    exercise.props.every((prop) => prop === 'none' || criteria.preferredProps.includes(prop))
  );
}

function validateCriteria(criteria: AutoGenerateCriteria): void {
  if (
    !Number.isFinite(criteria.targetMinutes) ||
    criteria.targetMinutes < 10 ||
    criteria.targetMinutes > 120
  ) {
    throw new Error('수업 시간은 10분부터 120분 사이로 입력해 주세요.');
  }
  if (
    !Number.isFinite(criteria.restMinutes ?? 0) ||
    (criteria.restMinutes ?? 0) < 0 ||
    (criteria.restMinutes ?? 0) >= criteria.targetMinutes
  )
    throw new Error('휴식 시간은 0 이상이며 전체 수업 시간보다 작아야 합니다.');
  if (!['1.0', '1.5', '2.0'].includes(criteria.level))
    throw new Error('최대 난이도를 확인해 주세요.');
  if (
    criteria.availableEquipment &&
    (criteria.availableEquipment.length === 0 ||
      criteria.availableEquipment.some((id) => !isEquipmentId(id)))
  ) {
    throw new Error(
      '사용 가능한 세부 기구를 선택해 주세요. 알 수 없는 기구는 사용 가능하다고 판단하지 않습니다.',
    );
  }
  if (
    criteria.ownedApparatus &&
    (criteria.ownedApparatus.length === 0 ||
      (criteria.apparatus !== 'mixed' && !criteria.ownedApparatus.includes(criteria.apparatus)))
  ) {
    throw new Error('선택한 기구가 보유 기구에 없습니다. 기구 조건을 확인해 주세요.');
  }
}

function getEligibleExercises(
  criteria: AutoGenerateCriteria,
  exercises: PilatesExercise[],
): PilatesExercise[] {
  validateCriteria(criteria);
  const eligible = exercises.filter(
    (exercise) => isExerciseAutoEligible(exercise) && exerciseMatchesCriteria(exercise, criteria),
  );
  if (!eligible.length)
    throw new Error(
      '선택한 기구·소도구와 최대 난이도에 맞는 승인된 동작이 부족합니다. 라이브러리에서 강사가 동작을 검토·승인한 뒤 다시 만들어 주세요.',
    );
  return eligible;
}

/** Allocates whole seconds; locked steps remain the same objects and keep all their fields. */
export function fitSequenceDuration(steps: SequenceStep[], targetMinutes: number): SequenceStep[] {
  if (!Number.isFinite(targetMinutes) || targetMinutes < 10 || targetMinutes > 120) {
    throw new Error('수업 시간은 10분부터 120분 사이로 입력해 주세요.');
  }
  if (!steps.length) throw new Error('시간을 맞출 동작이 없습니다. 먼저 초안을 만들어 주세요.');
  validateRestBudget(steps, targetMinutes);
  const adjustable = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !step.locked && !isRestStep(step));
  const lockedSec = steps
    .filter((step) => step.locked || isRestStep(step))
    .reduce((sum, step) => sum + getStepTiming(step).totalSec, 0);
  const targetSec = Math.round(targetMinutes * 60);
  const remainingSec = targetSec - lockedSec;
  if (!adjustable.length) {
    if (remainingSec === 0) return steps;
    throw new Error(
      '모든 항목이 잠겨 있어 시간을 맞출 수 없습니다. 일부 항목의 잠금을 해제해 주세요.',
    );
  }
  const minimums = adjustable.map(({ step }) =>
    Math.ceil(Math.max(60, (step.explanationSec ?? 0) + (step.transitionSec ?? 0) + 30)),
  );
  const minimumTotal = minimums.reduce((sum, duration) => sum + duration, 0);
  if (remainingSec < minimumTotal) {
    throw new Error(
      '잠긴 항목과 각 동작의 최소 시간을 유지하면 목표 시간에 맞출 수 없습니다. 잠금을 해제하거나 목표 시간을 늘려 주세요.',
    );
  }
  const weights = adjustable.map(({ step }, index) =>
    Math.max(1, getStepTiming(step).totalSec - minimums[index]),
  );
  const maxStepSec = 20 * 60;
  if (
    minimums.some((minimum) => minimum > maxStepSec) ||
    remainingSec > adjustable.length * maxStepSec
  ) {
    throw new Error(
      '잠금을 유지하고 각 항목을 20분 이내로 배분하면 목표 시간에 맞출 수 없습니다. 동작을 추가하거나 잠금을 해제해 주세요.',
    );
  }
  const allocated = [...minimums];
  let spare = remainingSec - minimumTotal;
  let open = allocated.map((_, index) => index).filter((index) => allocated[index] < maxStepSec);
  while (spare > 0 && open.length) {
    const weightSum = open.reduce((sum, index) => sum + weights[index], 0);
    const capped = open.filter(
      (index) => (spare * weights[index]) / weightSum >= maxStepSec - allocated[index],
    );
    if (capped.length) {
      for (const index of capped) {
        spare -= maxStepSec - allocated[index];
        allocated[index] = maxStepSec;
      }
      open = open.filter((index) => !capped.includes(index));
      continue;
    }
    const shares = open.map((index) => ({ index, exact: (spare * weights[index]) / weightSum }));
    for (const { index, exact } of shares) allocated[index] += Math.floor(exact);
    let leftover = spare - shares.reduce((sum, { exact }) => sum + Math.floor(exact), 0);
    shares.sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.index - b.index);
    for (const { index } of shares) {
      if (leftover-- <= 0) break;
      allocated[index] += 1;
    }
    spare = 0;
  }
  const durations = new Map(adjustable.map(({ index }, i) => [index, allocated[i] / 60]));
  return steps.map((step, index) =>
    step.locked || isRestStep(step) ? step : { ...step, durationMin: durations.get(index)! },
  );
}

function candidateScore(
  exercise: PilatesExercise,
  criteria: AutoGenerateCriteria,
  recentIds: Set<string>,
  usedIds: Set<string>,
  previous?: PilatesExercise,
  replacedIds: Set<string> = new Set(),
): number {
  let score = exercise.level === criteria.level ? 12 : 0;
  if (exercise.props.some((prop) => criteria.preferredProps.includes(prop))) score += 15;
  if (criteria.focusPreset === 'core-sculpt' && exercise.blockCategory === 'core') score += 25;
  if (
    criteria.focusPreset === 'glute-lower' &&
    ['lower-body', 'bridging'].includes(exercise.blockCategory)
  )
    score += 25;
  if (
    criteria.focusPreset === 'posture-upper' &&
    ['upper-body', 'extension'].includes(exercise.blockCategory)
  )
    score += 25;
  if (criteria.focusPreset === 'mobility-rehab' && exercise.favoriteTag === 'rehab-posture')
    score += 20;
  if (recentIds.has(exercise.id)) score -= 120;
  if (usedIds.has(exercise.id)) score -= 250;
  if (replacedIds.has(exercise.id)) score -= 80;
  if (previous?.springs === exercise.springs) score += 8;
  if (previous?.box === exercise.box) score += 6;
  if (previous?.bodyPosition === exercise.bodyPosition) score += 3;
  return score;
}

function requestedEquipment(criteria: AutoGenerateCriteria): string[] {
  return [
    ...new Set(
      criteria.availableEquipment ??
        (criteria.apparatus === 'mixed' ? (criteria.ownedApparatus ?? []) : [criteria.apparatus]),
    ),
  ];
}

function equipmentLabel(id: string): string {
  return EQUIPMENT_OPTIONS.find((equipment) => equipment.id === id)?.labelKo ?? id;
}

function chooseUniqueExercise(
  category: ClassBlockCategory,
  pool: PilatesExercise[],
  criteria: AutoGenerateCriteria,
  recentIds: Set<string>,
  selected: PilatesExercise[],
  replacedIds?: Set<string>,
): PilatesExercise | undefined {
  const usedKeys = new Set(selected.map(getMovementKey));
  const unused = pool.filter((exercise) => !usedKeys.has(getMovementKey(exercise)));
  const sameCategory = unused.filter((exercise) => exercise.blockCategory === category);
  const main = unused.filter(
    (exercise) => !['warmup', 'cooldown'].includes(exercise.blockCategory),
  );
  const candidates = sameCategory.length ? sameCategory : main.length ? main : unused;
  const usedIds = new Set(selected.map((exercise) => exercise.id));
  return [...candidates].sort(
    (a, b) =>
      candidateScore(b, criteria, recentIds, usedIds, selected.at(-1), replacedIds) -
        candidateScore(a, criteria, recentIds, usedIds, selected.at(-1), replacedIds) ||
      a.id.localeCompare(b.id),
  )[0];
}

/** Small equipment bitmask search, choosing at most one variant of each movement family. */
function coveragePlan(
  pool: PilatesExercise[],
  required: string[],
  criteria: AutoGenerateCriteria,
  recentIds: Set<string>,
): PilatesExercise[] {
  if (!required.length) return [];
  const missing = required.filter(
    (id) => !pool.some((exercise) => getExerciseEquipment(exercise).requiredEquipment.includes(id)),
  );
  if (missing.length)
    throw new Error(
      `${missing.map(equipmentLabel).join(', ')} 기구에 맞는 승인된 고유 동작이 부족합니다. 해당 기구의 동작을 검토·승인하거나 수업 기구 선택을 조정해 주세요.`,
    );
  const groups = new Map<string, PilatesExercise[]>();
  for (const exercise of pool) {
    const key = getMovementKey(exercise);
    groups.set(key, [...(groups.get(key) ?? []), exercise]);
  }
  type Plan = { exercises: PilatesExercise[]; score: number };
  let plans = new Map<number, Plan>([[0, { exercises: [], score: 0 }]]);
  const maskFor = (exercise: PilatesExercise) =>
    required.reduce(
      (mask, id, index) =>
        getExerciseEquipment(exercise).requiredEquipment.includes(id) ? mask | (1 << index) : mask,
      0,
    );
  for (const [, variants] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const next = new Map(plans);
    for (const [mask, plan] of plans)
      for (const exercise of variants) {
        const covered = mask | maskFor(exercise);
        if (covered === mask) continue;
        const candidate: Plan = {
          exercises: [...plan.exercises, exercise],
          score: plan.score + candidateScore(exercise, criteria, recentIds, new Set()),
        };
        const previous = next.get(covered);
        if (
          !previous ||
          candidate.exercises.length < previous.exercises.length ||
          (candidate.exercises.length === previous.exercises.length &&
            candidate.score > previous.score)
        )
          next.set(covered, candidate);
      }
    plans = next;
  }
  const complete = plans.get((1 << required.length) - 1);
  if (!complete)
    throw new Error(
      '선택한 모든 기구를 서로 다른 승인 동작으로 구성할 수 없습니다. 같은 동작의 기구별 변형을 반복하지 않으므로 다른 동작을 검토·승인해 주세요.',
    );
  return complete.exercises;
}

function equipmentSignature(exercise: PilatesExercise): string {
  return [...getExerciseEquipment(exercise).requiredEquipment].sort().join('|');
}

export function applyTransitionAllowances(
  steps: SequenceStep[],
  exercisesMap: Map<string, PilatesExercise>,
): SequenceStep[] {
  return steps.map((step, index) => {
    if (step.locked || isRestStep(step)) return step;
    const previousStep = steps
      .slice(0, index)
      .reverse()
      .find((item) => !isRestStep(item));
    const previous = previousStep ? exercisesMap.get(previousStep.exerciseId) : undefined;
    const current = exercisesMap.get(step.exerciseId);
    const transitionSec = !previousStep
      ? 0
      : previous && current && equipmentSignature(previous) === equipmentSignature(current)
        ? 15
        : 45;
    return { ...step, transitionSec };
  });
}

function assertDistinctSteps(
  steps: SequenceStep[],
  exercisesMap: Map<string, PilatesExercise>,
): void {
  const keys = steps
    .filter((step) => !isRestStep(step))
    .map((step) => {
      const exercise = exercisesMap.get(step.exerciseId);
      return exercise ? getMovementKey(exercise) : step.exerciseId;
    });
  if (new Set(keys).size !== keys.length)
    throw new Error(
      '같은 동작의 중복 구성이 있습니다. 서로 다른 승인 동작으로 바꾼 뒤 다시 시도해 주세요.',
    );
}

function assertEquipmentCoverage(
  steps: SequenceStep[],
  exercisesMap: Map<string, PilatesExercise>,
  criteria: AutoGenerateCriteria,
): void {
  const used = new Set(
    steps.flatMap((step) => {
      const exercise = exercisesMap.get(step.exerciseId);
      return exercise ? getExerciseEquipment(exercise).requiredEquipment : [];
    }),
  );
  const missing = requestedEquipment(criteria).filter((id) => !used.has(id));
  if (missing.length)
    throw new Error(
      `${missing.map(equipmentLabel).join(', ')} 기구가 수업에 포함되지 않았습니다. 승인된 동작이나 잠금·구간 선택을 확인해 주세요.`,
    );
}

export function generateOptimal50MinSequence(
  criteria: AutoGenerateCriteria,
  exercises: PilatesExercise[],
  historyLogs: ClassHistoryLog[],
): SequenceStep[] {
  const pool = getEligibleExercises(criteria, exercises);
  const exerciseMinutes = criteria.targetMinutes - (criteria.restMinutes ?? 0);
  const required = requestedEquipment(criteria);
  if (!required.length) throw new Error('이번 수업에 사용할 기구를 한 개 이상 선택해 주세요.');
  const recentIds = getRecentlyTaughtExerciseIds(
    historyLogs,
    criteria.excludeDaysWindow,
    criteria.targetGroupId,
  );
  const uniqueCount = new Set(pool.map(getMovementKey)).size;
  if (uniqueCount < Math.ceil(exerciseMinutes / 20))
    throw new Error(
      '반복 없이 각 동작을 20분 이내로 구성할 승인된 고유 동작이 부족합니다. 다른 동작을 검토·승인하거나 수업 시간을 줄여 주세요.',
    );
  let blocks = CANONICAL_BLOCKS;
  if (exerciseMinutes <= 15)
    blocks = CANONICAL_BLOCKS.filter((block) =>
      ['warmup', 'core', 'lower-body', 'cooldown'].includes(block.category),
    );
  else if (exerciseMinutes <= 20)
    blocks = CANONICAL_BLOCKS.filter((block) =>
      ['warmup', 'footwork', 'core', 'upper-body', 'cooldown'].includes(block.category),
    );
  else if (exerciseMinutes <= 30)
    blocks = CANONICAL_BLOCKS.filter((block) =>
      ['warmup', 'footwork', 'bridging', 'core', 'lower-body', 'cooldown'].includes(block.category),
    );
  else if (exerciseMinutes <= 45)
    blocks = CANONICAL_BLOCKS.filter((block) => block.category !== 'plank');
  const selected = coveragePlan(pool, required, criteria, recentIds);
  for (const category of ['warmup', 'cooldown'] as const) {
    if (!selected.some((exercise) => exercise.blockCategory === category)) {
      const anchor = chooseUniqueExercise(
        category,
        pool.filter((exercise) => exercise.blockCategory === category),
        criteria,
        recentIds,
        selected,
      );
      if (anchor) selected.push(anchor);
    }
  }
  const desiredCount = Math.min(
    uniqueCount,
    Math.max(blocks.length, selected.length, Math.ceil(exerciseMinutes / 20)),
  );
  let cursor = 0;
  while (selected.length < desiredCount) {
    const category = blocks[cursor % blocks.length].category;
    const firstPass = cursor++ < blocks.length;
    if (firstPass && selected.some((exercise) => exercise.blockCategory === category)) continue;
    const exercise = chooseUniqueExercise(category, pool, criteria, recentIds, selected);
    if (!exercise) break;
    selected.push(exercise);
  }
  const equipmentOrder = (exercise: PilatesExercise) =>
    Math.min(
      ...getExerciseEquipment(exercise).requiredEquipment.map((id) =>
        Math.max(0, required.indexOf(id)),
      ),
    );
  const sectionOrder = (exercise: PilatesExercise) =>
    exercise.blockCategory === 'warmup' ? 0 : exercise.blockCategory === 'cooldown' ? 2 : 1;
  selected.sort(
    (a, b) =>
      sectionOrder(a) - sectionOrder(b) ||
      equipmentOrder(a) - equipmentOrder(b) ||
      CANONICAL_BLOCKS.findIndex((block) => block.category === a.blockCategory) -
        CANONICAL_BLOCKS.findIndex((block) => block.category === b.blockCategory) ||
      a.id.localeCompare(b.id),
  );
  const steps = selected.map((exercise, index): SequenceStep => ({
    stepId: `step-${index + 1}-${exercise.id}`,
    order: index + 1,
    blockCategory: exercise.blockCategory,
    exerciseId: exercise.id,
    durationMin: exercise.defaultDurationMin,
    selectedLayer: criteria.defaultLayer,
    explanationSec: 20,
    transitionSec: 0,
  }));
  const map = new Map(pool.map((exercise) => [exercise.id, exercise]));
  assertDistinctSteps(steps, map);
  assertEquipmentCoverage(steps, map, criteria);
  const timed = applyTransitionAllowances(steps, map);
  const restMinutes = criteria.restMinutes ?? 0;
  if (!restMinutes) return fitSequenceDuration(timed, criteria.targetMinutes);
  const rest: SequenceStep = {
    kind: 'rest',
    stepId: 'rest-generated-1',
    order: timed.length + 1,
    blockCategory: 'core',
    exerciseId: '',
    durationMin: restMinutes,
    selectedLayer: 'standard',
  };
  const fitted = fitSequenceDuration([...timed, rest], criteria.targetMinutes);
  const exerciseSteps = fitted.filter((step) => !isRestStep(step));
  const halfway = getSequenceDurations(exerciseSteps).exerciseSec / 2;
  let elapsed = 0;
  let insertion = 1;
  let distance = Infinity;
  exerciseSteps.forEach((step, index) => {
    elapsed += getStepTiming(step).totalSec;
    if (
      (exerciseSteps.length === 1 || index < exerciseSteps.length - 1) &&
      Math.abs(elapsed - halfway) < distance
    ) {
      insertion = index + 1;
      distance = Math.abs(elapsed - halfway);
    }
  });
  exerciseSteps.splice(insertion, 0, rest);
  return exerciseSteps.map((step, index) => ({ ...step, order: index + 1 }));
}

export type SequenceSection = 'warmup' | 'main' | 'cooldown';

function stepSection(step: SequenceStep): SequenceSection {
  if (step.classSection) return step.classSection === 'preparation' ? 'warmup' : step.classSection;
  return step.blockCategory === 'warmup' || step.blockCategory === 'cooldown'
    ? step.blockCategory
    : 'main';
}

export function regenerateSequence(
  criteria: AutoGenerateCriteria,
  exercises: PilatesExercise[],
  historyLogs: ClassHistoryLog[],
  steps: SequenceStep[],
  section?: SequenceSection,
): SequenceStep[] {
  const eligible = getEligibleExercises(criteria, exercises);
  if (!steps.length) return generateOptimal50MinSequence(criteria, exercises, historyLogs);
  const map = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const canChange = (step: SequenceStep) =>
    !step.locked && !isRestStep(step) && (!section || stepSection(step) === section);
  const retained = steps.filter((step) => !canChange(step));
  for (const step of retained) {
    if (isRestStep(step)) continue;
    const exercise = map.get(step.exerciseId);
    if (
      !exercise ||
      !isExerciseAutoEligible(exercise) ||
      !exerciseMatchesCriteria(exercise, criteria)
    )
      throw new Error(
        '유지할 항목의 승인 또는 기구·소도구·난이도 조건이 맞지 않습니다. 검토·승인하거나 잠금과 조건을 확인해 주세요.',
      );
  }
  assertDistinctSteps(retained, map);
  const indexes = steps
    .map((step, index) => (canChange(step) ? index : -1))
    .filter((index) => index >= 0);
  if (!indexes.length) throw new Error('선택한 구간에 잠금 해제된 항목이 없습니다.');
  const retainedKeys = new Set(
    retained
      .filter((step) => !isRestStep(step))
      .map((step) => getMovementKey(map.get(step.exerciseId)!)),
  );
  const pool = eligible.filter(
    (exercise) =>
      !retainedKeys.has(getMovementKey(exercise)) &&
      (!section ||
        stepSection({ blockCategory: exercise.blockCategory } as SequenceStep) === section),
  );
  if (new Set(pool.map(getMovementKey)).size < indexes.length)
    throw new Error(
      '선택한 구간을 반복 없이 바꿀 승인된 고유 동작이 부족합니다. 다른 동작을 검토·승인하거나 항목 수를 줄여 주세요.',
    );
  const retainedEquipment = new Set(
    retained
      .filter((step) => !isRestStep(step))
      .flatMap((step) => getExerciseEquipment(map.get(step.exerciseId)!).requiredEquipment),
  );
  const missingEquipment = requestedEquipment(criteria).filter((id) => !retainedEquipment.has(id));
  const recentIds = getRecentlyTaughtExerciseIds(
    historyLogs,
    criteria.excludeDaysWindow,
    criteria.targetGroupId,
  );
  const replacedIds = new Set(indexes.map((index) => steps[index].exerciseId));
  const selected = coveragePlan(pool, missingEquipment, criteria, recentIds);
  if (selected.length > indexes.length)
    throw new Error(
      '잠금과 구간을 유지하면 선택한 모든 기구를 포함할 수 없습니다. 전체 구간 또는 잠금을 확인해 주세요.',
    );
  let cursor = 0;
  while (selected.length < indexes.length) {
    const exercise = chooseUniqueExercise(
      steps[indexes[cursor++ % indexes.length]].blockCategory,
      pool,
      criteria,
      recentIds,
      selected,
      replacedIds,
    );
    if (!exercise) throw new Error('반복 없이 구성할 승인된 동작이 부족합니다.');
    selected.push(exercise);
  }
  const categoryOrder = (exercise: PilatesExercise) =>
    exercise.blockCategory === 'warmup'
      ? -1
      : exercise.blockCategory === 'cooldown'
        ? 100
        : CANONICAL_BLOCKS.findIndex((block) => block.category === exercise.blockCategory);
  selected.sort(
    (a, b) =>
      categoryOrder(a) - categoryOrder(b) ||
      equipmentSignature(a).localeCompare(equipmentSignature(b)) ||
      a.id.localeCompare(b.id),
  );
  let selectedIndex = 0;
  const next = steps.map((step, index) => {
    if (!canChange(step)) return step;
    const exercise = selected[selectedIndex++];
    return {
      ...step,
      stepId: `regen-${step.stepId}-${index}-${exercise.id}`.slice(-180),
      exerciseId: exercise.id,
      blockCategory: exercise.blockCategory,
      selectedLayer: criteria.defaultLayer,
      customSpringOverride: undefined,
      instructorNote: undefined,
      repetitions: undefined,
      sets: undefined,
      sideMode: undefined,
      motionStudy: exercise.id === step.exerciseId ? step.motionStudy : undefined,
      explanationSec: step.explanationSec ?? 20,
    };
  });
  const timed = applyTransitionAllowances(next, map).map((step, index) =>
    canChange(steps[index]) ? step : steps[index],
  );
  const temporarilyLocked = timed.map((step, index) =>
    canChange(steps[index]) || step.locked ? step : { ...step, locked: true },
  );
  const fitted = fitSequenceDuration(temporarilyLocked, criteria.targetMinutes).map(
    (step, index) => (canChange(steps[index]) ? step : steps[index]),
  );
  assertDistinctSteps(fitted, map);
  assertEquipmentCoverage(fitted, map, criteria);
  return fitted;
}

export interface AlternativeProposal {
  exercise: PilatesExercise;
  reasons: string[];
  matchScore: number;
}

export function proposeBlockAlternatives(
  blockCategory: ClassBlockCategory,
  stepIndex: number,
  steps: SequenceStep[],
  exercises: PilatesExercise[],
  historyLogs: ClassHistoryLog[],
  targetGroupId?: string,
  criteria?: AutoGenerateCriteria,
): AlternativeProposal[] {
  if (steps[stepIndex] && isRestStep(steps[stepIndex])) return [];
  const currentExerciseId = steps[stepIndex]?.exerciseId;
  const prevStep = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const prevEx = prevStep ? exercises.find((e) => e.id === prevStep.exerciseId) : undefined;
  const recentIds = getRecentlyTaughtExerciseIds(historyLogs, 10, targetGroupId);

  const usedKeys = new Set(
    steps
      .filter((step) => !isRestStep(step))
      .map((step) => {
        const exercise = exercises.find((item) => item.id === step.exerciseId);
        return exercise ? getMovementKey(exercise) : step.exerciseId;
      }),
  );
  const allowedExercises = exercises.filter(
    (exercise) =>
      isExerciseAutoEligible(exercise) &&
      (!criteria || exerciseMatchesCriteria(exercise, criteria)) &&
      !usedKeys.has(getMovementKey(exercise)),
  );
  const sameBlock = allowedExercises.filter(
    (e) => e.blockCategory === blockCategory && e.id !== currentExerciseId,
  );
  const pool =
    sameBlock.length >= 3
      ? sameBlock
      : [
          ...sameBlock,
          ...allowedExercises.filter(
            (e) => e.blockCategory !== blockCategory && e.id !== currentExerciseId,
          ),
        ];

  const proposals = pool.map((ex) => {
    const reasons: string[] = [];
    let matchScore = 75;

    if (ex.blockCategory === blockCategory) {
      matchScore += 15;
    }
    if (prevEx && prevEx.springs === ex.springs) {
      matchScore += 10;
      reasons.push(`이전 블록과 동일한 ${ex.springs} 스프링 유지`);
    }
    if (prevEx && prevEx.box === ex.box && ex.box !== 'none') {
      matchScore += 8;
      reasons.push('박스 세팅 그대로 연속 진행 가능');
    }
    if (!recentIds.has(ex.id)) {
      matchScore += 12;
      reasons.push('최근 10일 내 해당 반 미수업 신선 동작');
    }
    if (ex.spinalPlanes.includes('rotation') || ex.spinalPlanes.includes('lateral')) {
      reasons.push('흉추 회전·측굴 가동성 밸런스 보강');
    }
    if (reasons.length === 0) {
      reasons.push(`${APPARATUS_LABELS[ex.apparatus].ko} 정통 큐잉 & 유튜브 레퍼런스 포함`);
    }

    return {
      exercise: ex,
      reasons: reasons.slice(0, 2),
      matchScore: Math.min(99, matchScore),
    };
  });

  proposals.sort((a, b) => b.matchScore - a.matchScore);
  const proposedKeys = new Set<string>();
  return proposals
    .filter((proposal) => {
      const key = getMovementKey(proposal.exercise);
      if (proposedKeys.has(key)) return false;
      proposedKeys.add(key);
      return true;
    })
    .slice(0, 3);
}

export function optimizeSequenceTransitions(
  steps: SequenceStep[],
  exercisesMap: Map<string, PilatesExercise>,
): SequenceStep[] {
  if (steps.length <= 4) return steps;

  // Keep opening (warmup, footwork) and closing (feet-in-straps, cooldown) anchored
  const opening = steps.slice(0, 2);
  const middle = steps
    .slice(2, steps.length - 2)
    .filter((step) => !step.locked && !isRestStep(step));
  const closing = steps.slice(steps.length - 2);

  middle.sort((a, b) => {
    const exA = exercisesMap.get(a.exerciseId);
    const exB = exercisesMap.get(b.exerciseId);
    if (!exA || !exB) return 0;

    // Group box states together (none -> short-box -> long-box)
    const boxOrder: Record<string, number> = { none: 0, 'short-box': 1, 'long-box': 2 };
    if (boxOrder[exA.box] !== boxOrder[exB.box]) {
      return boxOrder[exA.box] - boxOrder[exB.box];
    }

    // Group body positions (supine -> seated -> kneeling -> standing -> quadruped -> prone)
    const posOrder: Record<string, number> = {
      supine: 0,
      'side-lying': 1,
      seated: 2,
      kneeling: 3,
      standing: 4,
      quadruped: 5,
      prone: 6,
    };
    if (posOrder[exA.bodyPosition] !== posOrder[exB.bodyPosition]) {
      return posOrder[exA.bodyPosition] - posOrder[exB.bodyPosition];
    }

    return exA.springs.localeCompare(exB.springs);
  });

  let cursor = 0;
  const arranged = [
    ...opening,
    ...steps
      .slice(2, steps.length - 2)
      .map((step) => (step.locked || isRestStep(step) ? step : middle[cursor++])),
    ...closing,
  ];
  return arranged.map((step, idx) =>
    step.locked || isRestStep(step) ? step : { ...step, order: idx + 1 },
  );
}

export function swapDuplicateStepsWithFresh(
  steps: SequenceStep[],
  exercises: PilatesExercise[],
  historyLogs: ClassHistoryLog[],
  targetGroupId?: string,
  criteria?: AutoGenerateCriteria,
): SequenceStep[] {
  const recentIds = getRecentlyTaughtExerciseIds(historyLogs, 10, targetGroupId);
  if (recentIds.size === 0) return steps;

  const usedIds = new Set(steps.map((s) => s.exerciseId));
  const usedKeys = new Set(
    steps.map((step) => {
      const exercise = exercises.find((item) => item.id === step.exerciseId);
      return exercise ? getMovementKey(exercise) : step.exerciseId;
    }),
  );

  const swapped = steps.map((step, idx) => {
    if (step.locked || isRestStep(step) || !recentIds.has(step.exerciseId)) return step;

    const original = exercises.find((exercise) => exercise.id === step.exerciseId);
    const approvedExercises = exercises.filter(isExerciseAutoEligible);
    const allowed = criteria
      ? approvedExercises.filter((exercise) => exerciseMatchesCriteria(exercise, criteria))
      : approvedExercises.filter(
          (exercise) =>
            original &&
            exercise.apparatus === original.apparatus &&
            Number(exercise.level) <= Number(original.level),
        );
    const proposals = proposeBlockAlternatives(
      step.blockCategory,
      idx,
      steps,
      allowed,
      historyLogs,
      targetGroupId,
      criteria,
    );
    const freshPick = proposals.find(
      (p) =>
        !recentIds.has(p.exercise.id) &&
        !usedIds.has(p.exercise.id) &&
        !usedKeys.has(getMovementKey(p.exercise)),
    );

    if (!freshPick) return step;
    usedIds.add(freshPick.exercise.id);
    usedKeys.add(getMovementKey(freshPick.exercise));

    return {
      ...step,
      exerciseId: freshPick.exercise.id,
      blockCategory: freshPick.exercise.blockCategory,
      customSpringOverride: undefined,
      repetitions: undefined,
      sets: undefined,
      sideMode: undefined,
      motionStudy: undefined,
    };
  });
  const map = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  assertDistinctSteps(swapped, map);
  if (criteria) assertEquipmentCoverage(swapped, map, criteria);
  const targetMinutes = steps.reduce((sum, step) => sum + step.durationMin, 0);
  return targetMinutes >= 10 && targetMinutes <= 120
    ? fitSequenceDuration(applyTransitionAllowances(swapped, map), targetMinutes)
    : swapped;
}

export function formatSpringForBrand(springCode: string, brand: ReformerBrand): string {
  const brandMeta = REFORMER_BRAND_META[brand];
  return brandMeta.springMapping[springCode] ?? springCode;
}

export function formatSequenceAsStudioSheet(
  title: string,
  subtitle: string,
  steps: SequenceStep[],
  exercisesMap: Map<string, PilatesExercise>,
  brand: ReformerBrand,
): string {
  const totalMin = Number(
    (steps.reduce((acc, step) => acc + getStepTiming(step).totalSec, 0) / 60).toFixed(2),
  );
  const brandName = REFORMER_BRAND_META[brand].nameKo;
  const header = [
    `🧘‍♀️ [Pilates Flow Atelier] ${title}`,
    `• 부제: ${subtitle}`,
    `• 총 수업 시간: ${totalMin}분 (${steps.length}블록) | 기구 세팅 기준: ${brandName}`,
    `────────────────────────────────────────`,
  ];

  const lines = steps.map((step, idx) => {
    if (isRestStep(step))
      return `${String(idx + 1).padStart(2, '0')}. [${formatSecondsToMMSS(getStepTiming(step).totalSec)}] 휴식${step.instructorNote ? `\n   ↳ 강사 메모: ${step.instructorNote}` : ''}`;
    const ex = exercisesMap.get(step.exerciseId);
    if (!ex) return `${idx + 1}. 동작 미지정 (${step.durationMin}분)`;
    const timing = getStepTiming(step, ex);
    const springText = step.customSpringOverride || ex.springs;
    const layerLabel =
      step.selectedLayer === 'easy'
        ? '이지(모디파이)'
        : step.selectedLayer === 'hard'
          ? '하드(챌린지)'
          : '스탠다드';
    const propText = ex.props
      .filter((p) => p !== 'none')
      .map((p) => PROP_LABELS[p].ko)
      .join(', ');
    const sideLabels = getStepSideLabels(step, ex);
    const practiceText = [
      step.repetitions === undefined ? '' : `횟수: ${step.repetitions}회`,
      step.sets === undefined ? '' : `세트: ${step.sets}세트`,
    ]
      .filter(Boolean)
      .join(' · ');
    const sideTag = step.sideMode
      ? ` [${sideLabels.join(' → ')}]`
      : timing.sides === 2
        ? ' [양쪽 포함 · 순서 미지정]'
        : '';

    return [
      `${String(idx + 1).padStart(2, '0')}. [${formatSecondsToMMSS(timing.totalSec)}] ${ex.nameKo}${sideTag}`,
      practiceText ? `   ↳ ${practiceText} (강사 입력)` : '',
      `   ↳ 수행 ${formatSecondsToMMSS(timing.movementSec)}${timing.sides === 2 ? ` (한쪽 ${formatSecondsToMMSS(timing.perSideSec)})` : ''} · 설명 ${timing.explanationSec}초 · 전환 ${timing.transitionSec}초`,
      `   ↳ 기구/스프링: ${APPARATUS_LABELS[ex.apparatus].ko} · ${springText}${propText ? ` · 소도구: ${propText}` : ''}`,
      `   ↳ 레이어(${layerLabel}): ${ex.layers[step.selectedLayer]}`,
      `   ↳ 핵심 큐잉: ${ex.cues[0] ?? ex.breathPattern}`,
      step.instructorNote ? `   ↳ 강사 메모: ${step.instructorNote}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });

  return [...header, ...lines].join('\n');
}
