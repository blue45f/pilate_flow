import { APPARATUS_LABELS, CANONICAL_BLOCKS } from '../data/pilatesCatalog';
import type { PilatesExercise, SavedSequence } from '../types/pilates';
import { formatSecondsToMMSS, getSequenceDurations, getStepTiming, isRestStep } from './sequenceEngine';

const LAYER_KO: Record<'easy' | 'standard' | 'hard', string> = {
  easy: '가볍게',
  standard: '기본',
  hard: '도전',
};

export interface PortableSequencePackageV1 {
  schemaVersion: 'pilates-flow-sequence-package-v1';
  exportedAt: string;
  sequence: SavedSequence;
  summary: {
    totalDurationSec: number;
    exerciseDurationSec: number;
    restDurationSec: number;
    stepCount: number;
  };
}

/**
 * Formats a `SavedSequence` as a structured Markdown Studio Cue Sheet (`.md`)
 * suitable for tablet/Obsidian/Notion archiving or studio handout printing.
 */
export function formatSequenceAsMarkdownCueSheet(
  sequence: SavedSequence,
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): string {
  const durations = getSequenceDurations(sequence.steps);
  const totalMin = Number((durations.totalSec / 60).toFixed(2));
  const apparatusLabel =
    sequence.apparatus === 'mixed'
      ? '복합 기구'
      : APPARATUS_LABELS[sequence.apparatus]?.ko ?? sequence.apparatus;

  const lines: string[] = [
    `# ${sequence.title}`,
    '',
    `> ${sequence.subtitle || '필라테스 수업 시퀀스 큐시트'}`,
    '',
    `- **기구 · 레벨**: ${apparatusLabel} · Lv ${sequence.level}`,
    `- **계획 시간**: 총 ${totalMin}분 (${formatSecondsToMMSS(durations.totalSec)}) · 동작·설명·전환 ${formatSecondsToMMSS(durations.exerciseSec)} · 휴식 ${formatSecondsToMMSS(durations.restSec)}`,
    `- **최종 수정일**: ${sequence.updatedAt.slice(0, 10)}`,
    '',
    '## 동작 순서 및 세팅 큐시트',
    '',
    '| 순서 | 구간 | 동작명 | 시간 | 세팅 · 스프링 | 레이어 | 핵심 티칭 큐 |',
    '| :---: | :--- | :--- | :---: | :--- | :---: | :--- |',
  ];

  sequence.steps.forEach((step, idx) => {
    const orderStr = String(idx + 1).padStart(2, '0');
    if (isRestStep(step)) {
      lines.push(
        `| ${orderStr} | 중간 휴식 | **휴식** | ${formatSecondsToMMSS(step.durationMin * 60)} | - | - | ${step.instructorNote || '호흡 정리 및 수분 보충'} |`,
      );
      return;
    }

    const exercise = exercisesById.get(step.exerciseId);
    const timing = getStepTiming(step, exercise);
    const blockName =
      CANONICAL_BLOCKS.find((b) => b.category === step.blockCategory)?.nameKo ?? step.blockCategory;
    const nameKo = exercise?.nameKo ?? step.exerciseSnapshot?.nameKo ?? '삭제된 동작';
    const springs =
      step.customSpringOverride || exercise?.springs || step.exerciseSnapshot?.springs || '-';
    const layer = LAYER_KO[step.selectedLayer ?? 'standard'];
    const primaryCue =
      step.instructorNote ||
      exercise?.cues?.[0] ||
      step.exerciseSnapshot?.cues?.[0] ||
      '-';

    lines.push(
      `| ${orderStr} | ${blockName} | **${nameKo}** | ${formatSecondsToMMSS(timing.totalSec)} | ${springs.replace(/\|/g, '·')} | ${layer} | ${primaryCue.replace(/\|/g, '·')} |`,
    );
  });

  lines.push(
    '',
    '> 강사 검토용 계획 자료입니다. 실제 수업 전 기구 스프링 장력과 회원별 몸 상태를 직접 확인해 주세요.',
    '',
  );

  return lines.join('\n');
}

/**
 * Exports a single `SavedSequence` as a portable JSON package (`pilates-flow-sequence-package-v1`).
 */
export function formatSequenceAsPortableJson(
  sequence: SavedSequence,
  _exercisesById?: ReadonlyMap<string, PilatesExercise>,
): string {
  const durations = getSequenceDurations(sequence.steps);
  const pkg: PortableSequencePackageV1 = {
    schemaVersion: 'pilates-flow-sequence-package-v1',
    exportedAt: new Date().toISOString(),
    sequence,
    summary: {
      totalDurationSec: durations.totalSec,
      exerciseDurationSec: durations.exerciseSec,
      restDurationSec: durations.restSec,
      stepCount: sequence.steps.length,
    },
  };
  return JSON.stringify(pkg, null, 2);
}

/**
 * Parses and validates a portable sequence JSON string.
 */
export function parsePortableSequenceJson(rawJson: string): SavedSequence | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<PortableSequencePackageV1>;
    if (
      parsed?.schemaVersion !== 'pilates-flow-sequence-package-v1' ||
      !parsed.sequence ||
      typeof parsed.sequence.title !== 'string' ||
      !Array.isArray(parsed.sequence.steps)
    ) {
      return null;
    }
    return parsed.sequence;
  } catch {
    return null;
  }
}

/**
 * Normalizes an imported portable JSON sequence into a fresh `SavedSequence`
 * with a non-colliding ID and updated timestamp for safe binder insertion.
 */
export function importPortableSequenceToSavedSequence(
  rawJson: string,
  nowIso: string = new Date().toISOString(),
): SavedSequence | null {
  const base = parsePortableSequenceJson(rawJson);
  if (!base) return null;
  return {
    ...base,
    id: `seq-imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: base.title.trim() || '가져온 수업 시퀀스',
    createdAt: base.createdAt || nowIso,
    updatedAt: nowIso,
  };
}
