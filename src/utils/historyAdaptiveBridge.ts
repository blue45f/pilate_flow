import type {
  ApparatusType,
  ClassBlockCategory,
  ClassHistoryLog,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import { getEquipmentFamilies } from '../data/equipmentCatalog';
import { isExerciseAuthoringEligible } from './exerciseAuthoring';
import { isRestStep } from './sequenceEngine';

export type AdaptiveCautionTag =
  | 'wrist'
  | 'neck'
  | 'lumbar'
  | 'knee'
  | 'shoulder'
  | 'hip';

export interface AdaptiveSubstitutionRecord {
  fromExerciseId: string;
  fromNameKo: string;
  toExerciseId: string;
  toNameKo: string;
  reasonKo: string;
}

export interface AdaptiveHistorySignalSummary {
  analyzedLogCount: number;
  sourceGroupLabelKo: string;
  latestSequenceTitle: string;
  latestTaughtAt: string;
  avgRating: number;
  dominantIntensity: 'relaxed' | 'moderate' | 'intense';
  cautionTags: AdaptiveCautionTag[];
  cautionLabelsKo: string[];
  springLoadSignal: 'step-down' | 'keep' | 'step-up';
  pacingSignal: 'trim-transitions' | 'keep' | 'expand-hold';
  recommendedLayer: LayerMode;
  recommendedLevel: DifficultyLevel;
  headlineKo: string;
  rationaleBulletsKo: string[];
}

export interface AdaptiveNextClassPrescription {
  signal: AdaptiveHistorySignalSummary;
  draftTitle: string;
  draftSubtitle: string;
  targetMinutes: number;
  steps: SequenceStep[];
  substitutions: AdaptiveSubstitutionRecord[];
  rotatedFreshCount: number;
  honestDisclaimerKo: string;
}

export const ADAPTIVE_BRIDGE_DISCLAIMER_KO =
  '강사가 기록한 수업 체감·관찰 메모를 바탕으로 구성한 수업 계획 참고 보정안이며, 의학적 진단이나 재활 처방이 아닙니다.';

const CAUTION_RULES: readonly {
  tag: AdaptiveCautionTag;
  labelKo: string;
  reflectionPattern: RegExp;
  isExerciseFlagged: (ex: PilatesExercise) => boolean;
  cueGuidanceKo: string;
}[] = [
  {
    tag: 'wrist',
    labelKo: '손목 지지 부담 완화',
    reflectionPattern: /손목|수근관|손바닥\s*압박|플랭크\s*부담|네발\s*부담/i,
    isExerciseFlagged: (ex) =>
      ex.blockCategory === 'plank' ||
      ex.bodyPosition === 'quadruped' ||
      /손목/.test(ex.precautions),
    cueGuidanceKo: '손목 과신전 대신 전완 지지·스트랩 루프 활용 확인',
  },
  {
    tag: 'neck',
    labelKo: '경추·승모 긴장 완화',
    reflectionPattern: /목\s*(긴장|뻐근|통증|부담|불편)|경추|승모|헤드레스트|머리\s*들기/i,
    isExerciseFlagged: (ex) =>
      (ex.bodyPosition === 'supine' &&
        ex.spinalPlanes.includes('flexion') &&
        ex.blockCategory === 'core') ||
      /경추|목\s*긴장|목에\s*힘/.test(ex.precautions),
    cueGuidanceKo: '경추 중립 유지 · 필요 시 헤드레스트 높이 조정 및 머리 내려놓고 진행',
  },
  {
    tag: 'lumbar',
    labelKo: '요추 중립·코어 지지 우선',
    reflectionPattern: /허리|요추|신전\s*부담|과신전|골반\s*말림/i,
    isExerciseFlagged: (ex) =>
      ex.blockCategory === 'extension' ||
      ex.spinalPlanes.includes('extension') ||
      /요추\s*과신전|허리\s*꺾임/.test(ex.precautions),
    cueGuidanceKo: '늑골-골반 연결 유지 · 과신전 대신 중립 가동범위 안에서 진행',
  },
  {
    tag: 'knee',
    labelKo: '무릎 굴곡·체중 압박 완화',
    reflectionPattern: /무릎|슬개|무릎\s*꿇기|런지\s*부담/i,
    isExerciseFlagged: (ex) =>
      ex.bodyPosition === 'kneeling' || /무릎\s*통증|슬개/.test(ex.precautions),
    cueGuidanceKo: '무릎 과굴곡 회피 · 패드 보강 또는 누운 자세 스트랩 동작으로 대체',
  },
  {
    tag: 'shoulder',
    labelKo: '견갑 안정·상지 저항 완화',
    reflectionPattern: /어깨|견갑|회전근개|상체\s*버거움/i,
    isExerciseFlagged: (ex) =>
      (ex.blockCategory === 'upper-body' && ex.level === '2.0') ||
      /어깨\s*충돌|견갑\s*거상/.test(ex.precautions),
    cueGuidanceKo: '귀-어깨 간격 확보 · 가벼운 스프링에서 견갑 하강 먼저 인지',
  },
  {
    tag: 'hip',
    labelKo: '고관절 집힘 완화·분절 가동',
    reflectionPattern: /고관절|서혜부|장요근\s*긴장|집힘/i,
    isExerciseFlagged: (ex) =>
      (ex.blockCategory === 'core' && ex.level === '2.0' && ex.bodyPosition === 'supine') ||
      /고관절\s*집힘|서혜부/.test(ex.precautions),
    cueGuidanceKo: '고관절 굴곡근 과긴장 시 가동범위 축소 · 외회전/스트랩 서클로 이완 병행',
  },
];

function stepDownLevel(level: DifficultyLevel): DifficultyLevel {
  if (level === '2.0') return '1.5';
  return '1.0';
}

function stepUpLevel(level: DifficultyLevel): DifficultyLevel {
  if (level === '1.0') return '1.5';
  return '2.0';
}

function levelRank(level: DifficultyLevel): number {
  if (level === '1.0') return 1;
  if (level === '1.5') return 2;
  return 3;
}

function lightenSpringText(rawSprings: string): string {
  const trimmed = rawSprings.trim();
  if (!trimmed || trimmed === '없음') return trimmed;
  if (/2R\s*\+\s*1B/i.test(trimmed)) return '1R + 1B';
  if (/3R/i.test(trimmed)) return '2R';
  if (/2R/i.test(trimmed)) return '1R + 1B';
  if (/1R\s*\+\s*1B/i.test(trimmed)) return '1R';
  if (/1R/i.test(trimmed)) return '1B + 1Y';
  return trimmed;
}

/**
 * Analyzes 1 or more ClassHistoryLog entries to extract structured adaptive signals.
 */
export function analyzeHistoryLogsForNextClass(
  logs: readonly ClassHistoryLog[],
  options?: {
    targetGroupId?: string;
    groupNameFallback?: string;
  },
): AdaptiveHistorySignalSummary | null {
  const groupFiltered =
    options?.targetGroupId && options.targetGroupId !== 'all'
      ? logs.filter((l) => l.groupId === options.targetGroupId)
      : [];
  const scoped = groupFiltered.length > 0 ? groupFiltered : [...logs];

  if (scoped.length === 0) return null;

  const sorted = [...scoped].sort(
    (a, b) => new Date(b.taughtAt).getTime() - new Date(a.taughtAt).getTime(),
  );
  const recent = sorted.slice(0, 4);
  const latest = recent[0];

  const avgRating =
    Math.round(
      (recent.reduce((acc, item) => acc + (item.rating || 3), 0) / recent.length) * 10,
    ) / 10;

  const intenseCount = recent.filter((l) => l.intensity === 'intense').length;
  const relaxedCount = recent.filter((l) => l.intensity === 'relaxed').length;
  const dominantIntensity: 'relaxed' | 'moderate' | 'intense' =
    latest.intensity === 'intense' || intenseCount >= Math.ceil(recent.length / 2)
      ? 'intense'
      : latest.intensity === 'relaxed' && relaxedCount >= Math.ceil(recent.length / 2)
        ? 'relaxed'
        : 'moderate';

  const combinedReflection = recent
    .map((l) => l.instructorReflection || '')
    .join(' \n ');

  const matchedRules = CAUTION_RULES.filter((rule) =>
    rule.reflectionPattern.test(combinedReflection),
  );
  const cautionTags = matchedRules.map((r) => r.tag);
  const cautionLabelsKo = matchedRules.map((r) => r.labelKo);

  const heavySpringMentioned =
    /스프링\s*(무거|강함|강했|버거|낮출|줄일)|저항\s*(강함|버거)|무거웠/i.test(combinedReflection);
  const lightSpringMentioned =
    /스프링\s*(가벼|약함|올릴|추가)|여유\s*있|난이도\s*올려|한\s*단계\s*업/i.test(combinedReflection);

  const springLoadSignal: 'step-down' | 'keep' | 'step-up' =
    heavySpringMentioned || (dominantIntensity === 'intense' && avgRating <= 3.2)
      ? 'step-down'
      : lightSpringMentioned ||
          (dominantIntensity === 'relaxed' && avgRating >= 4.2 && cautionTags.length === 0)
        ? 'step-up'
        : 'keep';

  const timeTightMentioned =
    /시간\s*(부족|촉박|초과|오버|모자람)|전환\s*길었|빠듯/i.test(combinedReflection);
  const timeLooseMentioned = /시간\s*남음|여유롭게\s*끝|일찍\s*종료/i.test(combinedReflection);

  const pacingSignal: 'trim-transitions' | 'keep' | 'expand-hold' = timeTightMentioned
    ? 'trim-transitions'
    : timeLooseMentioned
      ? 'expand-hold'
      : 'keep';

  const baseLevel: DifficultyLevel = latest.level ?? '1.5';
  const recommendedLevel: DifficultyLevel =
    dominantIntensity === 'intense' || avgRating <= 2.5
      ? stepDownLevel(baseLevel)
      : dominantIntensity === 'relaxed' && avgRating >= 4.5 && cautionTags.length === 0
        ? stepUpLevel(baseLevel)
        : baseLevel;

  const recommendedLayer: LayerMode =
    springLoadSignal === 'step-down' || dominantIntensity === 'intense'
      ? 'easy'
      : springLoadSignal === 'step-up'
        ? 'hard'
        : 'standard';

  const rationaleBulletsKo: string[] = [];
  if (dominantIntensity === 'intense') {
    rationaleBulletsKo.push(
      `최근 수업 체감 강도가 ‘높음(평점 ${avgRating}점)’으로 기록되어 기본 레이어를 ‘부담 완화(Easy)’와 Lv ${recommendedLevel} 기준으로 낮췄습니다.`,
    );
  } else if (dominantIntensity === 'relaxed' && springLoadSignal === 'step-up') {
    rationaleBulletsKo.push(
      `최근 수업이 ‘여유(평점 ${avgRating}점)’로 마무리되어 코어·본운동 구간에 점진적 챌린지 레이어를 반영했습니다.`,
    );
  } else {
    rationaleBulletsKo.push(
      `최근 ${recent.length}회 수업 흐름(평균 ${avgRating}점)의 뼈대는 유지하면서 중복 피로를 줄이도록 본운동 변형을 조합했습니다.`,
    );
  }

  if (cautionLabelsKo.length > 0) {
    rationaleBulletsKo.push(
      `강사 메모에서 감지된 관찰 포인트(${cautionLabelsKo.join(' · ')})를 고려해 부담 동작을 관절 친화 동작으로 자동 교체합니다.`,
    );
  }

  if (springLoadSignal === 'step-down') {
    rationaleBulletsKo.push(
      '스프링 저항 부담 신호에 맞춰 고저항 구간의 권장 스프링을 한 단계 완화된 세팅으로 제안합니다.',
    );
  } else if (pacingSignal === 'trim-transitions') {
    rationaleBulletsKo.push(
      '시간 촉박 메모를 반영해 전환 시간을 10초로 정돈하고 전체 구성을 목표 시간 안에 여유 있게 맞췄습니다.',
    );
  }

  const sourceGroupLabelKo =
    latest.groupName || options?.groupNameFallback || '선택 반';

  const headlineKo =
    cautionLabelsKo.length > 0
      ? `${sourceGroupLabelKo} 메모 반영 · ${cautionLabelsKo[0]} 맞춤 보정`
      : dominantIntensity === 'intense'
        ? `${sourceGroupLabelKo} 강도 완화 · 회복 밸런스 보정`
        : springLoadSignal === 'step-up'
          ? `${sourceGroupLabelKo} 점진적 강화(Progressive) 다음 수업`
          : `${sourceGroupLabelKo} 피드백 연속성 다음 수업 보정`;

  return {
    analyzedLogCount: recent.length,
    sourceGroupLabelKo,
    latestSequenceTitle: latest.sequenceTitle,
    latestTaughtAt: latest.taughtAt,
    avgRating,
    dominantIntensity,
    cautionTags,
    cautionLabelsKo,
    springLoadSignal,
    pacingSignal,
    recommendedLayer,
    recommendedLevel,
    headlineKo,
    rationaleBulletsKo,
  };
}

/**
 * Builds a complete, ready-to-apply adaptive next-class sequence draft from history logs.
 */
export function buildAdaptiveNextClassDraft(input: {
  logs: readonly ClassHistoryLog[];
  exercises: readonly PilatesExercise[];
  ownedEquipment?: readonly string[];
  targetGroupId?: string;
  fallbackTargetMinutes?: number;
}): AdaptiveNextClassPrescription | null {
  const signal = analyzeHistoryLogsForNextClass(input.logs, {
    targetGroupId: input.targetGroupId,
  });
  if (!signal) return null;

  const groupFiltered =
    input.targetGroupId && input.targetGroupId !== 'all'
      ? input.logs.filter((l) => l.groupId === input.targetGroupId)
      : [];
  const scoped = groupFiltered.length > 0 ? groupFiltered : [...input.logs];
  const sorted = [...scoped].sort(
    (a, b) => new Date(b.taughtAt).getTime() - new Date(a.taughtAt).getTime(),
  );
  const latest = sorted[0];
  if (!latest) return null;

  const ownedFamilies =
    input.ownedEquipment && input.ownedEquipment.length > 0
      ? getEquipmentFamilies([...input.ownedEquipment])
      : [];
  const ownedSet =
    ownedFamilies.length > 0
      ? new Set<string>([...ownedFamilies, ...(input.ownedEquipment ?? [])])
      : input.ownedEquipment && input.ownedEquipment.length > 0
        ? new Set<string>(input.ownedEquipment)
        : null;

  const eligibleCatalog = input.exercises.filter((ex) => {
    if (!isExerciseAuthoringEligible(ex)) return false;
    if (ownedSet && !ownedSet.has(ex.apparatus)) return false;
    return true;
  });

  if (eligibleCatalog.length === 0) return null;

  const exerciseMap = new Map(eligibleCatalog.map((ex) => [ex.id, ex]));
  const activeRules = CAUTION_RULES.filter((r) => signal.cautionTags.includes(r.tag));

  const isFlaggedByCaution = (ex: PilatesExercise): { flagged: boolean; reasonKo: string } => {
    for (const rule of activeRules) {
      if (rule.isExerciseFlagged(ex)) {
        return { flagged: true, reasonKo: rule.labelKo };
      }
    }
    if (levelRank(ex.level) > levelRank(signal.recommendedLevel) && signal.dominantIntensity === 'intense') {
      return { flagged: true, reasonKo: `강도 조절 (Lv ${signal.recommendedLevel} 이하 권장)` };
    }
    return { flagged: false, reasonKo: '' };
  };

  const targetApparatus: ApparatusType =
    latest.apparatus !== 'mixed' &&
    (!ownedSet || ownedSet.has(latest.apparatus))
      ? latest.apparatus
      : eligibleCatalog[0].apparatus;

  const targetMinutes =
    latest.criteriaSnapshot?.targetMinutes ??
    (latest.actualDurationSec ? Math.max(30, Math.min(60, Math.round(latest.actualDurationSec / 60 / 5) * 5)) : undefined) ??
    input.fallbackTargetMinutes ??
    50;

  // Reconstruct base exercise list from latest log snapshot or exerciseIds
  const baseStepsFromSnapshot: SequenceStep[] =
    latest.stepsSnapshot && latest.stepsSnapshot.length > 0
      ? latest.stepsSnapshot.filter((st) => !isRestStep(st))
      : latest.exerciseIds.map((exId, idx) => {
          const found = exerciseMap.get(exId);
          return {
            kind: 'exercise',
            stepId: `hist-seed-${idx + 1}`,
            order: idx + 1,
            exerciseId: exId,
            blockCategory: found?.blockCategory ?? (idx === 0 ? 'warmup' : 'core'),
            durationMin: found?.defaultDurationMin ?? 5,
            selectedLayer: 'standard',
          };
        });

  const usedIds = new Set<string>();
  const substitutions: AdaptiveSubstitutionRecord[] = [];
  let rotatedFreshCount = 0;

  const pickReplacement = (
    preferredBlock: ClassBlockCategory,
    preferredApparatus: ApparatusType,
    avoidIds: ReadonlySet<string>,
  ): PilatesExercise | undefined => {
    const candidates = eligibleCatalog.filter((cand) => {
      if (usedIds.has(cand.id) || avoidIds.has(cand.id)) return false;
      if (isFlaggedByCaution(cand).flagged) return false;
      if (levelRank(cand.level) > levelRank(signal.recommendedLevel) + 1) return false;
      return true;
    });

    return (
      candidates.find(
        (c) =>
          c.apparatus === preferredApparatus &&
          c.blockCategory === preferredBlock &&
          levelRank(c.level) <= levelRank(signal.recommendedLevel),
      ) ??
      candidates.find(
        (c) => c.apparatus === preferredApparatus && c.blockCategory === preferredBlock,
      ) ??
      candidates.find(
        (c) =>
          c.apparatus === preferredApparatus &&
          levelRank(c.level) <= levelRank(signal.recommendedLevel),
      ) ??
      candidates.find((c) => c.blockCategory === preferredBlock) ??
      candidates[0]
    );
  };

  const recentTaughtIds = new Set(latest.exerciseIds);
  const draftSteps: SequenceStep[] = [];
  const seedList: SequenceStep[] =
    baseStepsFromSnapshot.length >= 4
      ? baseStepsFromSnapshot
      : (['warmup', 'footwork', 'bridging', 'core', 'lower-body', 'cooldown'] as ClassBlockCategory[]).map(
          (cat, idx) => {
            const fallbackEx =
              eligibleCatalog.find((e) => e.apparatus === targetApparatus && e.blockCategory === cat) ??
              eligibleCatalog[idx % eligibleCatalog.length];
            return {
              kind: 'exercise' as const,
              stepId: `adaptive-fallback-${idx + 1}`,
              order: idx + 1,
              exerciseId: fallbackEx.id,
              blockCategory: fallbackEx.blockCategory,
              durationMin: fallbackEx.defaultDurationMin || 6,
              selectedLayer: signal.recommendedLayer,
            };
          },
        );

  seedList.forEach((origStep, idx) => {
    const origEx = exerciseMap.get(origStep.exerciseId);
    const desiredBlock = origEx?.blockCategory ?? origStep.blockCategory;
    const desiredApparatus = origEx?.apparatus ?? targetApparatus;

    let chosenEx = origEx;
    let noteAddon = '';

    if (!chosenEx) {
      chosenEx = pickReplacement(desiredBlock, desiredApparatus, usedIds);
    } else {
      const check = isFlaggedByCaution(chosenEx);
      if (check.flagged) {
        const safeAlt = pickReplacement(desiredBlock, desiredApparatus, recentTaughtIds) ??
          pickReplacement(desiredBlock, desiredApparatus, new Set([chosenEx.id]));
        if (safeAlt && safeAlt.id !== chosenEx.id) {
          substitutions.push({
            fromExerciseId: chosenEx.id,
            fromNameKo: chosenEx.nameKo,
            toExerciseId: safeAlt.id,
            toNameKo: safeAlt.nameKo,
            reasonKo: check.reasonKo,
          });
          chosenEx = safeAlt;
          noteAddon = `[피드백 보정: ${check.reasonKo}]`;
        }
      } else if (
        // Rotate 1-2 middle main-block exercises for fresh variety even when no caution fired
        rotatedFreshCount < 2 &&
        idx > 0 &&
        idx < seedList.length - 1 &&
        desiredBlock !== 'warmup' &&
        desiredBlock !== 'cooldown'
      ) {
        const freshAlt = pickReplacement(desiredBlock, desiredApparatus, recentTaughtIds);
        if (freshAlt && freshAlt.id !== chosenEx.id) {
          chosenEx = freshAlt;
          rotatedFreshCount += 1;
          noteAddon = '[지난 수업 변형 루틴]';
        }
      }
    }

    if (!chosenEx || usedIds.has(chosenEx.id)) {
      chosenEx = pickReplacement(desiredBlock, desiredApparatus, new Set());
    }
    if (!chosenEx) return;

    usedIds.add(chosenEx.id);

    const stepLayer: LayerMode =
      chosenEx.blockCategory === 'warmup' || chosenEx.blockCategory === 'cooldown'
        ? signal.recommendedLayer === 'hard'
          ? 'standard'
          : signal.recommendedLayer
        : signal.recommendedLayer;

    const rawSprings = origStep.customSpringOverride || chosenEx.springs || '';
    const adjustedSpring =
      signal.springLoadSignal === 'step-down' ? lightenSpringText(rawSprings) : rawSprings;

    const cautionGuidance = activeRules
      .map((r) => r.cueGuidanceKo)
      .slice(0, 1)
      .join(' · ');

    const combinedNote = [noteAddon, cautionGuidance]
      .filter(Boolean)
      .join(' ')
      .slice(0, 140);

    const baseDuration = Math.max(
      2,
      Math.min(
        15,
        signal.pacingSignal === 'trim-transitions'
          ? Math.max(3, (origStep.durationMin || chosenEx.defaultDurationMin || 5) - 0.5)
          : origStep.durationMin || chosenEx.defaultDurationMin || 5,
      ),
    );

    draftSteps.push({
      kind: 'exercise',
      stepId: `adaptive-${Date.now()}-${idx + 1}`,
      order: draftSteps.length + 1,
      exerciseId: chosenEx.id,
      blockCategory: chosenEx.blockCategory,
      durationMin: baseDuration,
      explanationSec: 25,
      transitionSec: signal.pacingSignal === 'trim-transitions' ? 10 : 20,
      repetitions: signal.recommendedLayer === 'easy' ? 8 : signal.recommendedLayer === 'hard' ? 12 : 10,
      selectedLayer: stepLayer,
      customSpringOverride:
        adjustedSpring && adjustedSpring !== chosenEx.springs ? adjustedSpring : undefined,
      instructorNote: combinedNote || undefined,
    });
  });

  // Normalize total duration close to targetMinutes
  if (draftSteps.length > 0) {
    const currentSum = draftSteps.reduce((acc, st) => acc + st.durationMin, 0);
    const diff = targetMinutes - currentSum;
    if (Math.abs(diff) >= 1) {
      const perStepDelta = Math.round((diff / draftSteps.length) * 2) / 2;
      if (perStepDelta !== 0) {
        for (let i = 0; i < draftSteps.length; i += 1) {
          draftSteps[i] = {
            ...draftSteps[i],
            durationMin: Math.max(2, Math.min(18, Number((draftSteps[i].durationMin + perStepDelta).toFixed(1)))),
          };
        }
      }
    }
  }

  const draftTitle = `${signal.sourceGroupLabelKo} · 피드백 보정 다음 시퀀스`;
  const draftSubtitle =
    signal.cautionLabelsKo.length > 0
      ? `${signal.cautionLabelsKo.join('·')} 반영 · Lv ${signal.recommendedLevel}`
      : `최근 수업(${signal.latestSequenceTitle}) 피드백 기반 맞춤 보정`;

  return {
    signal,
    draftTitle,
    draftSubtitle,
    targetMinutes,
    steps: draftSteps,
    substitutions,
    rotatedFreshCount,
    honestDisclaimerKo: ADAPTIVE_BRIDGE_DISCLAIMER_KO,
  };
}
