import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { isExerciseAuthoringEligible } from './exerciseAuthoring';
import { resolveStudio3DMotionForExercise } from './studio3dMotionCatalog';

export type CurriculumThemeId =
  | 'posture-core'
  | 'lower-glute-sculpt'
  | 'spine-shoulder-relief'
  | 'athletic-reformer-flow';

export interface CurriculumThemeOption {
  id: CurriculumThemeId;
  labelKo: string;
  summaryKo: string;
  preferredBlocks: readonly ClassBlockCategory[];
}

export const CURRICULUM_THEME_OPTIONS: readonly CurriculumThemeOption[] = [
  {
    id: 'posture-core',
    labelKo: '체형 정렬 & 심부 코어 4주 완성',
    summaryKo: '골반·늑골 중립 인지부터 다열근·복횡근 통합 제어까지 단계별 완성',
    preferredBlocks: ['warmup', 'footwork', 'bridging', 'core', 'upper-body', 'cooldown'],
  },
  {
    id: 'lower-glute-sculpt',
    labelKo: '하지 정렬 & 둔근 파워 4주 프로그램',
    summaryKo: '고관절-무릎-발목 정렬에서 시작해 편측 안정성과 둔근 근지구력 강화',
    preferredBlocks: ['warmup', 'footwork', 'lower-body', 'bridging', 'feet-in-straps', 'cooldown'],
  },
  {
    id: 'spine-shoulder-relief',
    labelKo: '흉추 가동성 & 라운드숄더 케어 4주',
    summaryKo: '견갑골 안정화·흉추 신전·회전 가동범위를 무리 없이 확장하는 케어 루틴',
    preferredBlocks: ['warmup', 'upper-body', 'extension', 'core', 'feet-in-straps', 'cooldown'],
  },
  {
    id: 'athletic-reformer-flow',
    labelKo: '전신 협응 & 애슬레틱 플로우 4주',
    summaryKo: '기초 컨트롤에서 코어-사지 협응, 플랭크·전신 연속 플로우로 빌드업',
    preferredBlocks: ['warmup', 'footwork', 'core', 'plank', 'lower-body', 'cooldown'],
  },
];

export interface ProgressiveWeekDraft {
  weekNumber: 1 | 2 | 3 | 4;
  weekBadgeKo: string;
  phaseFocusKo: string;
  coachingGoalKo: string;
  level: DifficultyLevel;
  defaultLayer: LayerMode;
  title: string;
  subtitle: string;
  apparatus: ApparatusType;
  targetMinutes: number;
  steps: SequenceStep[];
  leadThumb3dUrl: string;
  movementNamesKo: string[];
}

export interface FourWeekCurriculumResult {
  curriculumId: string;
  theme: CurriculumThemeOption;
  groupLabelKo: string;
  apparatus: ApparatusType;
  apparatusLabelKo: string;
  targetMinutes: number;
  weeks: [
    ProgressiveWeekDraft,
    ProgressiveWeekDraft,
    ProgressiveWeekDraft,
    ProgressiveWeekDraft,
  ];
  honestNoteKo: string;
}

function levelRank(level: DifficultyLevel): number {
  if (level === '1.0') return 1;
  if (level === '1.5') return 2;
  return 3;
}

const WEEK_BLUEPRINTS: readonly {
  weekNumber: 1 | 2 | 3 | 4;
  weekBadgeKo: string;
  phaseFocusKo: string;
  coachingGoalKo: string;
  targetLevelOffset: 0 | 1 | 2;
  layer: LayerMode;
  reps: number;
}[] = [
  {
    weekNumber: 1,
    weekBadgeKo: '1주차 · 기초 정렬·인지',
    phaseFocusKo: '호흡·골반 중립 & 기구 저항 인지',
    coachingGoalKo: '과도한 긴장 없이 중립 정렬과 정확한 가동범위를 익힙니다.',
    targetLevelOffset: 0,
    layer: 'easy',
    reps: 8,
  },
  {
    weekNumber: 2,
    weekBadgeKo: '2주차 · 안정성·협응 연결',
    phaseFocusKo: '코어 안정화 & 상·하지 분리 협응',
    coachingGoalKo: '1주차 패턴 위에서 몸통 흔들림 없는 사지 협응을 연결합니다.',
    targetLevelOffset: 0,
    layer: 'standard',
    reps: 10,
  },
  {
    weekNumber: 3,
    weekBadgeKo: '3주차 · 근지구력·편측 제어',
    phaseFocusKo: '저항 확장 & 좌우 밸런스 강화',
    coachingGoalKo: '세트 집중도와 편측 컨트롤을 높여 목표 근육 지구력을 끌어올립니다.',
    targetLevelOffset: 1,
    layer: 'standard',
    reps: 10,
  },
  {
    weekNumber: 4,
    weekBadgeKo: '4주차 · 통합 플로우·마스터리',
    phaseFocusKo: '전신 연속 플로우 & 주체적 컨트롤',
    coachingGoalKo: '4주간 익힌 정렬·코어·호흡을 끊김 없는 시그니처 플로우로 통합합니다.',
    targetLevelOffset: 1,
    layer: 'hard',
    reps: 12,
  },
];

function resolveWeekLevel(baseLevel: DifficultyLevel, offset: 0 | 1 | 2): DifficultyLevel {
  const levels: DifficultyLevel[] = ['1.0', '1.5', '2.0'];
  const baseIdx = Math.max(0, levels.indexOf(baseLevel));
  return levels[Math.min(levels.length - 1, baseIdx + offset)];
}

/**
 * Generates a cohesive 4-Week Progressive Studio Curriculum (Weeks 1..4)
 * that shares foundational warmup/cooldown anchors while progressively advancing
 * main blocks across difficulty, layer, and unilateral/flow demand.
 */
export function generateFourWeekCurriculum(input: {
  exercises: readonly PilatesExercise[];
  themeId?: CurriculumThemeId;
  apparatus?: ApparatusType;
  baseLevel?: DifficultyLevel;
  targetMinutes?: number;
  groupLabelKo?: string;
}): FourWeekCurriculumResult | null {
  const theme =
    CURRICULUM_THEME_OPTIONS.find((t) => t.id === input.themeId) ??
    CURRICULUM_THEME_OPTIONS[0];
  const apparatus: ApparatusType = input.apparatus ?? 'reformer';
  const baseLevel: DifficultyLevel = input.baseLevel ?? '1.0';
  const targetMinutes = Math.max(30, Math.min(90, input.targetMinutes ?? 50));
  const groupLabelKo = (input.groupLabelKo || '').trim() || '정규 클래스';

  const eligible = input.exercises.filter(
    (ex) => isExerciseAuthoringEligible(ex) && ex.apparatus === apparatus,
  );
  const fallbackPool =
    eligible.length >= 6
      ? eligible
      : input.exercises.filter((ex) => isExerciseAuthoringEligible(ex));

  if (fallbackPool.length < 4) return null;

  const curriculumStamp = Date.now();
  const curriculumId = `curr4w-${curriculumStamp}`;
  const stepCount = targetMinutes >= 50 ? 7 : 6;
  const perStepMin = Math.max(4, Math.round((targetMinutes / stepCount) * 2) / 2);

  // Keep consistent warmup & cooldown anchor across weeks so members feel measurable mastery,
  // while rotating/progressing middle core/main movements week over week!
  const sharedWarmup =
    fallbackPool.find((ex) => ex.blockCategory === 'warmup') ?? fallbackPool[0];
  const sharedCooldown =
    fallbackPool.find((ex) => ex.blockCategory === 'cooldown' && ex.id !== sharedWarmup.id) ??
    fallbackPool[fallbackPool.length - 1];

  const mainUseCounts = new Map<string, number>();

  const weeks = WEEK_BLUEPRINTS.map((bp) => {
    const weekLevel = resolveWeekLevel(baseLevel, bp.targetLevelOffset);
    const maxRank = levelRank(weekLevel);
    const weekUsedIds = new Set<string>([sharedWarmup.id, sharedCooldown.id]);
    const mainSlotCount = stepCount - 2;
    const middleBlocks = theme.preferredBlocks.filter(
      (b) => b !== 'warmup' && b !== 'cooldown',
    );

    const chosenMainExercises: PilatesExercise[] = [];
    for (let slot = 0; slot < mainSlotCount; slot += 1) {
      const desiredBlock = middleBlocks[(slot + bp.weekNumber - 1) % middleBlocks.length];
      const candidates = fallbackPool
        .filter((ex) => !weekUsedIds.has(ex.id) && levelRank(ex.level) <= maxRank)
        .sort((a, b) => {
          const useDiff = (mainUseCounts.get(a.id) ?? 0) - (mainUseCounts.get(b.id) ?? 0);
          if (useDiff !== 0) return useDiff;
          // Prefer unilateral / higher level in weeks 3-4
          if (bp.weekNumber >= 3) {
            const uniDiff = Number(b.isUnilateral) - Number(a.isUnilateral);
            if (uniDiff !== 0) return uniDiff;
            return levelRank(b.level) - levelRank(a.level);
          }
          return levelRank(a.level) - levelRank(b.level);
        });

      const picked =
        candidates.find((c) => c.blockCategory === desiredBlock) ??
        candidates[0] ??
        fallbackPool.find((c) => !weekUsedIds.has(c.id)) ??
        fallbackPool[slot % fallbackPool.length];

      weekUsedIds.add(picked.id);
      mainUseCounts.set(picked.id, (mainUseCounts.get(picked.id) ?? 0) + 1);
      chosenMainExercises.push(picked);
    }

    const orderedExercises = [sharedWarmup, ...chosenMainExercises, sharedCooldown];
    const steps: SequenceStep[] = orderedExercises.map((ex, idx) => {
      const isWarmOrCool = idx === 0 || idx === orderedExercises.length - 1;
      const stepLayer: LayerMode = isWarmOrCool
        ? bp.layer === 'hard'
          ? 'standard'
          : bp.layer
        : bp.layer;

      return {
        kind: 'exercise',
        stepId: `${curriculumId}-w${bp.weekNumber}-s${idx + 1}`,
        order: idx + 1,
        exerciseId: ex.id,
        blockCategory: ex.blockCategory,
        durationMin: perStepMin,
        explanationSec: bp.weekNumber === 1 ? 30 : 20,
        transitionSec: bp.weekNumber === 4 ? 12 : 18,
        repetitions: isWarmOrCool ? 8 : bp.reps,
        selectedLayer: stepLayer,
        instructorNote: `[${bp.weekBadgeKo}] ${bp.phaseFocusKo}`,
      };
    });

    // Adjust final step slightly so total matches targetMinutes cleanly
    const currentTotal = steps.reduce((acc, st) => acc + st.durationMin, 0);
    const diff = Number((targetMinutes - currentTotal).toFixed(1));
    if (Math.abs(diff) >= 0.5 && steps.length >= 2) {
      const adjustIdx = steps.length - 2;
      steps[adjustIdx] = {
        ...steps[adjustIdx],
        durationMin: Math.max(2, Math.min(18, Number((steps[adjustIdx].durationMin + diff).toFixed(1)))),
      };
    }

    const leadMotion = resolveStudio3DMotionForExercise(chosenMainExercises[0] ?? sharedWarmup);

    return {
      weekNumber: bp.weekNumber,
      weekBadgeKo: bp.weekBadgeKo,
      phaseFocusKo: bp.phaseFocusKo,
      coachingGoalKo: bp.coachingGoalKo,
      level: weekLevel,
      defaultLayer: bp.layer,
      title: `[${groupLabelKo} · ${bp.weekNumber}주차] ${theme.labelKo.replace(/\s*4주.*$/, '')}`,
      subtitle: `${bp.phaseFocusKo} · Lv ${weekLevel}`,
      apparatus,
      targetMinutes,
      steps,
      leadThumb3dUrl: leadMotion.peakImg,
      movementNamesKo: orderedExercises.map((e) => e.nameKo),
    };
  }) as [
    ProgressiveWeekDraft,
    ProgressiveWeekDraft,
    ProgressiveWeekDraft,
    ProgressiveWeekDraft,
  ];

  return {
    curriculumId,
    theme,
    groupLabelKo,
    apparatus,
    apparatusLabelKo: APPARATUS_LABELS[apparatus].ko,
    targetMinutes,
    weeks,
    honestNoteKo:
      '4주 프로그램은 동일 웜업·쿨다운 앵커로 회원의 주간 성장 체감을 높이고 본운동 난이도·레이어를 점진 확장하는 강사용 참고 커리큘럼입니다.',
  };
}

/**
 * Converts a ProgressiveWeekDraft into a SavedSequence object ready for binder storage.
 */
export function buildSavedSequenceFromWeekDraft(
  week: ProgressiveWeekDraft,
  nowIso = new Date().toISOString(),
): SavedSequence {
  return {
    id: `seq-curr-w${week.weekNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: week.title,
    subtitle: week.subtitle,
    apparatus: week.apparatus,
    level: week.level,
    focusTags: [week.phaseFocusKo],
    targetMinutes: week.targetMinutes,
    createdAt: nowIso,
    updatedAt: nowIso,
    taughtCount: 0,
    steps: week.steps.map((st, idx) => ({ ...st, order: idx + 1 })),
  };
}
