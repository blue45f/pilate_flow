import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { WORLD_PILATES_BY_ID } from '../data/worldPilatesRepertoire1000';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { ApparatusType, PilatesExercise, SavedSequence, SequenceStep } from '../types/pilates';
import { expandInstructorSchedule, localScheduleDate } from './instructorSchedule';
import {
  NATURAL_VOICE_PROSODY_BY_TONE,
  buildNaturalExerciseScript,
  formatSpringsSpokenKo,
  type NaturalVoiceSegment,
} from './naturalVoiceScriptBuilder';
import { isRestStep } from './sequenceEngine';

export type DailyBriefingMode = 'quick-1min' | 'full-continuous';
export type DailyBriefingSourceKind = 'today-schedule' | 'saved-selection' | 'active-draft';

export interface DailyBriefingClassItem {
  readonly id: string;
  readonly sourceKind: DailyBriefingSourceKind;
  readonly timeLabelKo: string;
  readonly titleKo: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly apparatusLabelKo: string;
  readonly targetMinutes: number;
  readonly stepCount: number;
  readonly startingSpringKo: string;
  readonly anchorExerciseIds: readonly string[];
  readonly anchorExerciseNamesKo: readonly string[];
  readonly steps: readonly SequenceStep[];
}

export interface DailyBriefingPlaylist {
  readonly dateLabelKo: string;
  readonly sourceKind: DailyBriefingSourceKind;
  readonly sourceBadgeKo: string;
  readonly mode: DailyBriefingMode;
  readonly classes: readonly DailyBriefingClassItem[];
  readonly segments: readonly NaturalVoiceSegment[];
  readonly classStartSegmentIndex: ReadonlyMap<string, number>;
  readonly estimatedTotalSec: number;
}

const MAX_BRIEFING_CLASSES = 5;

function resolveExercise(
  id: string,
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): PilatesExercise | null {
  return exercisesById.get(id) ?? WORLD_PILATES_BY_ID.get(id) ?? null;
}

function getApparatusLabelKo(apparatus: ApparatusType | 'mixed'): string {
  if (apparatus === 'mixed') return '혼합 기구';
  return APPARATUS_LABELS[apparatus]?.ko ?? '필라테스';
}

function summarizeClassSteps(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  apparatus: ApparatusType | 'mixed',
): {
  readonly startingSpringKo: string;
  readonly anchorExerciseIds: readonly string[];
  readonly anchorExerciseNamesKo: readonly string[];
  readonly movementSteps: readonly SequenceStep[];
} {
  const movementSteps = steps.filter((s) => !isRestStep(s) && Boolean(s.exerciseId));
  const resolved = movementSteps
    .map((s) => ({ step: s, ex: resolveExercise(s.exerciseId, exercisesById) }))
    .filter((item): item is { step: SequenceStep; ex: PilatesExercise } => item.ex !== null);

  const first = resolved[0];
  const rawSpring = first?.step.customSpringOverride?.trim() || first?.ex.springs?.trim() || 'Bodyweight';
  const resolvedApparatus = first?.ex.apparatus ?? (apparatus === 'mixed' ? 'reformer' : apparatus);
  const startingSpringKo = formatSpringsSpokenKo(rawSpring, resolvedApparatus);

  // Pick up to 3 representative anchor movements (opening, peak middle, closing)
  const pickedIndices: number[] = [];
  if (resolved.length <= 3) {
    for (let i = 0; i < resolved.length; i += 1) pickedIndices.push(i);
  } else {
    pickedIndices.push(0, Math.floor(resolved.length / 2), resolved.length - 1);
  }

  const anchorExerciseIds = pickedIndices.map((idx) => resolved[idx]!.ex.id);
  const anchorExerciseNamesKo = pickedIndices.map((idx) => resolved[idx]!.ex.nameKo);

  return {
    startingSpringKo,
    anchorExerciseIds,
    anchorExerciseNamesKo,
    movementSteps,
  };
}

/**
 * Collects today's real scheduled classes (up to 5). If no classes are scheduled today,
 * transparently surfaces the instructor's saved sequences + current draft so they can pick
 * up to 5 classes for hands-free commute audio briefing (zero fabricated schedule).
 */
export function resolveDailyBriefingCandidates(params: {
  readonly instructorSchedule: InstructorScheduleData;
  readonly savedSequences: readonly SavedSequence[];
  readonly activeDraft: {
    readonly title: string;
    readonly apparatus: ApparatusType | 'mixed';
    readonly targetMinutes: number;
    readonly steps: readonly SequenceStep[];
  };
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly todayDate?: string;
}): {
  readonly sourceKind: DailyBriefingSourceKind;
  readonly sourceBadgeKo: string;
  readonly dateLabelKo: string;
  readonly candidates: readonly DailyBriefingClassItem[];
} {
  const today = params.todayDate ?? localScheduleDate();
  const savedById = new Map(params.savedSequences.map((seq) => [seq.id, seq]));
  const todayOccurrences = expandInstructorSchedule(params.instructorSchedule, today, today)
    .filter((occ) => occ.status === 'scheduled' || occ.status === 'moved')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, MAX_BRIEFING_CLASSES);

  const dateLabelKo = `${today.slice(5, 7)}월 ${today.slice(8, 10)}일`;

  if (todayOccurrences.length > 0) {
    const candidates: DailyBriefingClassItem[] = todayOccurrences.map((occ) => {
      const linked = occ.linkSavedSequenceId ? savedById.get(occ.linkSavedSequenceId) : undefined;
      const steps = linked?.steps ?? params.activeDraft.steps;
      const apparatus = linked?.apparatus ?? params.activeDraft.apparatus;
      const summary = summarizeClassSteps(steps, params.exercisesById, apparatus);
      return {
        id: occ.id,
        sourceKind: 'today-schedule',
        timeLabelKo: `${occ.startTime}~${occ.endTime}`,
        titleKo: occ.title || linked?.title || '예정 수업',
        apparatus,
        apparatusLabelKo: getApparatusLabelKo(apparatus),
        targetMinutes: linked?.targetMinutes ?? 50,
        stepCount: summary.movementSteps.length,
        startingSpringKo: summary.startingSpringKo,
        anchorExerciseIds: summary.anchorExerciseIds,
        anchorExerciseNamesKo: summary.anchorExerciseNamesKo,
        steps: summary.movementSteps,
      };
    });

    return {
      sourceKind: 'today-schedule',
      sourceBadgeKo: `오늘 예정 수업 ${candidates.length}건`,
      dateLabelKo,
      candidates,
    };
  }

  const candidates: DailyBriefingClassItem[] = [];
  if (params.activeDraft.steps.some((s) => !isRestStep(s))) {
    const summary = summarizeClassSteps(
      params.activeDraft.steps,
      params.exercisesById,
      params.activeDraft.apparatus,
    );
    candidates.push({
      id: 'active-draft',
      sourceKind: 'active-draft',
      timeLabelKo: '현재 작업 중',
      titleKo: params.activeDraft.title || '현재 수업안',
      apparatus: params.activeDraft.apparatus,
      apparatusLabelKo: getApparatusLabelKo(params.activeDraft.apparatus),
      targetMinutes: params.activeDraft.targetMinutes,
      stepCount: summary.movementSteps.length,
      startingSpringKo: summary.startingSpringKo,
      anchorExerciseIds: summary.anchorExerciseIds,
      anchorExerciseNamesKo: summary.anchorExerciseNamesKo,
      steps: summary.movementSteps,
    });
  }

  for (const seq of params.savedSequences) {
    if (candidates.length >= MAX_BRIEFING_CLASSES) break;
    const summary = summarizeClassSteps(seq.steps, params.exercisesById, seq.apparatus);
    if (summary.movementSteps.length === 0) continue;
    candidates.push({
      id: seq.id,
      sourceKind: 'saved-selection',
      timeLabelKo: `${seq.targetMinutes}분 수업`,
      titleKo: seq.title,
      apparatus: seq.apparatus,
      apparatusLabelKo: getApparatusLabelKo(seq.apparatus),
      targetMinutes: seq.targetMinutes,
      stepCount: summary.movementSteps.length,
      startingSpringKo: summary.startingSpringKo,
      anchorExerciseIds: summary.anchorExerciseIds,
      anchorExerciseNamesKo: summary.anchorExerciseNamesKo,
      steps: summary.movementSteps,
    });
  }

  const primaryKind: DailyBriefingSourceKind =
    candidates[0]?.sourceKind === 'active-draft' && candidates.length === 1
      ? 'active-draft'
      : 'saved-selection';

  return {
    sourceKind: primaryKind,
    sourceBadgeKo:
      candidates.length > 0
        ? `오늘 일정 없음 · 저장 수업 ${candidates.length}개 빠른 브리핑`
        : '예정·저장된 수업이 아직 없어요',
    dateLabelKo,
    candidates,
  };
}

/**
 * Stitches 1~5 selected classes into a continuous hands-free commute audio playlist
 * powered by Tier-0 Studio AI Neural MP3s (briefing clips + exercise narration MP3s).
 */
export function buildDailyCommuteBriefingPlaylist(params: {
  readonly dateLabelKo: string;
  readonly sourceKind: DailyBriefingSourceKind;
  readonly sourceBadgeKo: string;
  readonly selectedClasses: readonly DailyBriefingClassItem[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly mode: DailyBriefingMode;
}): DailyBriefingPlaylist {
  const { dateLabelKo, sourceKind, sourceBadgeKo, selectedClasses, exercisesById, mode } = params;
  const segments: NaturalVoiceSegment[] = [];
  const classStartSegmentIndex = new Map<string, number>();

  if (selectedClasses.length === 0) {
    return {
      dateLabelKo,
      sourceKind,
      sourceBadgeKo,
      mode,
      classes: [],
      segments: [],
      classStartSegmentIndex,
      estimatedTotalSec: 0,
    };
  }

  // Opening studio neural welcome clip (`briefing-welcome`)
  segments.push({
    id: 'briefing-welcome',
    index: 0,
    tone: 'warm-intro',
    labelKo: '출근길 오디오 브리핑 시작',
    textKo: `좋은 하루예요 강사님. 오늘 준비하신 ${selectedClasses.length}개 수업 흐름을 차분하게 이어서 브리핑해 드릴게요.`,
    pauseMs: 650,
    prosody: {
      rateScale: NATURAL_VOICE_PROSODY_BY_TONE['warm-intro'].rateScale,
      pitch: NATURAL_VOICE_PROSODY_BY_TONE['warm-intro'].pitch,
      breathChime: 'bell',
    },
  });

  selectedClasses.forEach((cls, clsIdx) => {
    if (clsIdx > 0) {
      segments.push({
        id: `briefing-next-class-${clsIdx}`,
        index: segments.length,
        tone: 'warm-intro',
        labelKo: `${clsIdx + 1}번째 수업 전환`,
        textKo: `이제 ${clsIdx + 1}번째 수업, ${cls.timeLabelKo} ${cls.titleKo} 흐름으로 넘어갈게요.`,
        pauseMs: 650,
        prosody: {
          rateScale: NATURAL_VOICE_PROSODY_BY_TONE['warm-intro'].rateScale,
          pitch: NATURAL_VOICE_PROSODY_BY_TONE['warm-intro'].pitch,
          breathChime: 'bell',
        },
      });
    }

    classStartSegmentIndex.set(cls.id, segments.length);

    // Quick 1-min mode picks up to 2 key anchor exercises per class (~45~65s per class)
    // Full continuous mode walks through every step of each class sequentially
    const targetSteps =
      mode === 'quick-1min'
        ? cls.steps.filter((s) => cls.anchorExerciseIds.slice(0, 2).includes(s.exerciseId)).slice(0, 2)
        : cls.steps;

    const effectiveSteps = targetSteps.length > 0 ? targetSteps : cls.steps.slice(0, 2);

    if (effectiveSteps.length === 0) {
      segments.push({
        id: `briefing-empty-${cls.id}`,
        index: segments.length,
        tone: 'setup',
        labelKo: `${cls.titleKo} 개요`,
        textKo: `${cls.timeLabelKo} ${cls.titleKo} 수업은 ${cls.apparatusLabelKo} ${cls.targetMinutes}분 일정이에요.`,
        pauseMs: 600,
        prosody: {
          rateScale: NATURAL_VOICE_PROSODY_BY_TONE.setup.rateScale,
          pitch: NATURAL_VOICE_PROSODY_BY_TONE.setup.pitch,
          breathChime: 'none',
        },
      });
      return;
    }

    effectiveSteps.forEach((step, sIdx) => {
      const ex = resolveExercise(step.exerciseId, exercisesById);
      if (!ex) return;
      const exScript = buildNaturalExerciseScript(ex, {
        step,
        orderLabel: `${clsIdx + 1}교시 ${sIdx + 1}번`,
        stepIndex: sIdx,
        stepOrder: step.order,
        includeTip: mode === 'full-continuous',
      });
      for (const seg of exScript.segments) {
        segments.push({
          ...seg,
          id: `brief-${cls.id}-${sIdx}-${seg.id}`,
          index: segments.length,
          labelKo: `${cls.titleKo} · ${ex.nameKo}`,
        });
      }
    });
  });

  // Closing studio neural wrap-up clip (`briefing-complete`)
  segments.push({
    id: 'briefing-complete',
    index: segments.length,
    tone: 'tip',
    labelKo: '출근길 브리핑 마무리',
    textKo: '오늘 모든 수업 브리핑을 마쳤어요. 강사님 컨디션도 챙기시고 오늘 수업도 멋지게 이끌어 주세요.',
    pauseMs: 500,
    prosody: {
      rateScale: NATURAL_VOICE_PROSODY_BY_TONE.tip.rateScale,
      pitch: NATURAL_VOICE_PROSODY_BY_TONE.tip.pitch,
      breathChime: 'exhale',
    },
  });

  const estimatedTotalSec = Math.max(
    20,
    Math.round(
      segments.reduce((acc, s) => acc + s.textKo.replace(/\s+/g, '').length / 4.7 + s.pauseMs / 1000, 0),
    ),
  );

  return {
    dateLabelKo,
    sourceKind,
    sourceBadgeKo,
    mode,
    classes: selectedClasses,
    segments,
    classStartSegmentIndex,
    estimatedTotalSec,
  };
}
