import type {
  DifficultyLevel,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
} from '../types/pilates';
import { buildStepBreathingCadence } from './breathingCadenceEngine';
import { formatSecondsToMMSS, getStepTiming, isRestStep } from './sequenceEngine';
import { convertSpringTensionAcrossBrands } from './springTensionMatrix';

export interface VoiceScriptSegment {
  order: number;
  startTimeLabel: string;
  endTimeLabel: string;
  titleKo: string;
  springHintKo: string;
  breathingCueKo: string;
  spokenScriptKo: string;
}

/**
 * Generates a timecoded Korean instructor voice-cue teleprompter script
 * combining step timings, brand-specific spring translations, and breathing cadences.
 */
export function generateInstructorVoiceScript(
  sequenceTitle: string,
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  options?: {
    level?: DifficultyLevel;
    reformerBrand?: ReformerBrand;
  },
): {
  segments: VoiceScriptSegment[];
  fullTextKo: string;
} {
  const level = options?.level ?? '1.5';
  const brand = options?.reformerBrand ?? 'balanced';
  const segments: VoiceScriptSegment[] = [];
  let cursorSec = 0;

  steps.forEach((step, idx) => {
    const ex = exercisesById.get(step.exerciseId);
    const timing = getStepTiming(step, ex);
    const startSec = cursorSec;
    const endSec = cursorSec + timing.totalSec;
    cursorSec = endSec;

    const startTimeLabel = formatSecondsToMMSS(startSec);
    const endTimeLabel = formatSecondsToMMSS(endSec);
    const breath = buildStepBreathingCadence(step, ex, level);

    if (isRestStep(step)) {
      segments.push({
        order: idx + 1,
        startTimeLabel,
        endTimeLabel,
        titleKo: '중간 휴식 및 호흡 정리',
        springHintKo: '세팅 유지',
        breathingCueKo: breath.summaryCueKo,
        spokenScriptKo: `[${startTimeLabel}~${endTimeLabel}] 잠시 호흡을 가다듬겠습니다. ${breath.inhalePhaseKo}, ${breath.exhalePhaseKo}.`,
      });
      return;
    }

    const titleKo = ex?.nameKo ?? step.exerciseSnapshot?.nameKo ?? '동작';
    const rawSpring = step.customSpringOverride || ex?.springs || '';
    const springHintKo = rawSpring
      ? convertSpringTensionAcrossBrands(rawSpring).equivalentsByBrand[brand]
      : '매트/기본 세팅';
    const primaryCue =
      step.instructorNote ||
      ex?.cues?.[0] ||
      step.exerciseSnapshot?.cues?.[0] ||
      '정렬을 유지하며 천천히 움직여 보세요.';

    segments.push({
      order: idx + 1,
      startTimeLabel,
      endTimeLabel,
      titleKo,
      springHintKo,
      breathingCueKo: breath.summaryCueKo,
      spokenScriptKo: `[${startTimeLabel}~${endTimeLabel}] ${String(idx + 1).padStart(2, '0')}. ${titleKo} (${springHintKo}) — ${primaryCue} (${breath.inhalePhaseKo} / ${breath.exhalePhaseKo})`,
    });
  });

  const header = `# ${sequenceTitle || '오늘의 필라테스 수업'} — 강사 타임코드 티칭 대본 (${brand} 기준)`;
  const fullTextKo = [header, '', ...segments.map((seg) => seg.spokenScriptKo)].join('\n');

  return { segments, fullTextKo };
}
