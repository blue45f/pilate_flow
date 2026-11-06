import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { SYNTHETIC_APPROVED_EXERCISES } from '../test/planningFixtures';
import {
  AI_THEME_PRESETS,
  collectExcludedRecentExercises,
  generateAiThematicSequence,
} from './geminiSequenceAi';
import type { ClassHistoryLog, SavedSequence } from '../types/pilates';
import { isRestStep } from '../utils/sequenceEngine';

describe('Private local thematic sequence recommendations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fits exact target class duration in seconds (30, 50, 60 min) including rest steps', async () => {
    for (const targetMinutes of [30, 50, 60]) {
      const result = await generateAiThematicSequence({
        themeId: 'posture-upper',
        targetMinutes,
        restMinutes: 3,
        equipmentIds: ['reformer', 'mat'],
        level: '1.5',
        excludeDaysWindow: 14,
        exercises: SYNTHETIC_APPROVED_EXERCISES,
        historyLogs: [],
      });

      expect(result.targetMinutes).toBe(targetMinutes);
      expect(result.totalSeconds).toBe(targetMinutes * 60);
      expect(result.steps.some((step) => isRestStep(step))).toBe(true);
      expect(result.rationales.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('excludes exercises from recent historyLogs and savedSequences with zero overlap', async () => {
    const recentExercises = SYNTHETIC_APPROVED_EXERCISES.filter(
      (ex) => ex.apparatus === 'reformer',
    ).slice(0, 4);
    const historyLogs: ClassHistoryLog[] = [
      {
        id: 'log-recent-1',
        sequenceId: 'seq-prev-1',
        groupId: 'grp-mon-wed-7pm',
        groupName: '월·수 저녁반',
        sequenceTitle: '지난 리포머 수업',
        apparatus: 'reformer',
        level: '1.5',
        taughtAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        exerciseIds: recentExercises.slice(0, 2).map((ex) => ex.id),
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '테스트 기록',
      },
    ];
    const savedSequences: SavedSequence[] = [
      {
        id: 'seq-recent-1',
        title: '최근 저장 시퀀스',
        subtitle: '',
        apparatus: 'reformer',
        level: '1.5',
        targetMinutes: 50,
        focusTags: ['전신'],
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        taughtCount: 1,
        steps: recentExercises.slice(2, 4).map((ex, i) => ({
          stepId: `s-${i}`,
          order: i + 1,
          blockCategory: ex.blockCategory,
          exerciseId: ex.id,
          durationMin: 5,
          selectedLayer: 'standard',
        })),
      },
    ];

    const { excludedIds } = collectExcludedRecentExercises(
      historyLogs,
      savedSequences,
      14,
      'grp-mon-wed-7pm',
      SYNTHETIC_APPROVED_EXERCISES,
    );
    expect(excludedIds.size).toBe(4);

    const result = await generateAiThematicSequence({
      themeId: 'glute-lower',
      customPrompt: '어제 하체를 많이 해서 오늘은 상체·흉추 회전과 코어 위주로 구성해 줘',
      targetMinutes: 50,
      equipmentIds: ['reformer'],
      level: '1.5',
      excludeDaysWindow: 14,
      targetGroupId: 'grp-mon-wed-7pm',
      exercises: SYNTHETIC_APPROVED_EXERCISES,
      historyLogs,
      savedSequences,
    });

    expect(result.zeroOverlapVerified).toBe(true);
    expect(result.excludedRecentCount).toBe(4);
    for (const step of result.steps) {
      if (!isRestStep(step)) {
        expect(excludedIds.has(step.exerciseId)).toBe(false);
      }
    }
  });

  it('never calls an external API and labels the result as local rules', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await generateAiThematicSequence({
      themeId: 'pelvic-core',
      customPrompt: '로컬 테스트 메모',
      targetMinutes: 50,
      equipmentIds: ['mat'],
      level: '1.5',
      excludeDaysWindow: 14,
      exercises: SYNTHETIC_APPROVED_EXERCISES,
      historyLogs: [],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.engineSource).toBe('local-rules');
    expect(result.modelName).toContain('외부 AI 미연결');
    expect(result.totalSeconds).toBe(3000);
    expect(AI_THEME_PRESETS).toHaveLength(8);
    expect(
      result.steps
        .filter((s) => !isRestStep(s))
        .every(
          (step) =>
            SYNTHETIC_APPROVED_EXERCISES.find((e) => e.id === step.exerciseId)?.apparatus === 'mat',
        ),
    ).toBe(true);
  });

  it('does not fall back to unreviewed catalog or unavailable equipment', async () => {
    const base = {
      themeId: 'pelvic-core' as const,
      targetMinutes: 50,
      equipmentIds: ['mat'],
      level: '1.5' as const,
      excludeDaysWindow: 0,
      historyLogs: [],
    };
    await expect(
      generateAiThematicSequence({ ...base, exercises: INITIAL_EXERCISES }),
    ).rejects.toThrow('검토 완료 동작');
    await expect(
      generateAiThematicSequence({
        ...base,
        exercises: SYNTHETIC_APPROVED_EXERCISES.filter((e) => e.apparatus === 'reformer'),
      }),
    ).rejects.toThrow('검토 완료 동작');
    await expect(
      generateAiThematicSequence({
        ...base,
        exercises: SYNTHETIC_APPROVED_EXERCISES,
        targetMinutes: NaN,
      }),
    ).rejects.toThrow('수업 시간');
    await expect(
      generateAiThematicSequence({
        ...base,
        exercises: SYNTHETIC_APPROVED_EXERCISES,
        restMinutes: 49,
      }),
    ).rejects.toThrow('수업 시간');
  });
});
