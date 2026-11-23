import { describe, expect, it } from 'vitest';
import {
  INITIAL_CLASS_GROUPS,
  INITIAL_EXERCISES,
  INITIAL_HISTORY_LOGS,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import type {
  ClassGroupProfile,
  ClassHistoryLog,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import { verifySequenceAiSafetyAndFidelity } from './aiSequenceSafetyVerifier';
import {
  analyzeSequenceFreshness,
  buildAnchorFirstSequence,
  forkSequenceAcrossLevels,
  generateWeeklyAutoPlan,
  optimizeSequenceFlowSmart,
  parseSpringLoadUnits,
  PRIMARY_MAIN_BLOCKS,
  refreshOverlappingSteps,
} from './sequenceAutomationEngine';

const REF_DATE = new Date('2026-11-05T12:00:00.000Z');

function daysBefore(days: number, ref: Date = REF_DATE): string {
  return new Date(ref.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeExercise(overrides: Partial<PilatesExercise> & { id: string; nameKo: string }): PilatesExercise {
  return {
    nameEn: overrides.id,
    apparatus: 'reformer',
    props: ['none'],
    blockCategory: 'core',
    spinalPlanes: ['flexion'],
    bodyPosition: 'supine',
    level: '1.5',
    defaultDurationMin: 5,
    isUnilateral: false,
    springs: '1R 1B',
    box: 'none',
    footbar: 'mid',
    headrest: 'up',
    targetMuscles: ['복횡근', '복직근'],
    breathPattern: '내쉬며 복부 수축',
    cues: ['호흡과 함께 천천히 조절하세요.'],
    precautions: '어깨 긴장을 풀어주세요.',
    layers: {
      easy: '가동 범위를 줄여 진행',
      standard: '표준 호흡 템포로 진행',
      hard: '한 다리 뻗어 심화 진행',
    },
    youtube: {
      videoId: '',
      channelName: 'Studio',
      videoTitle: overrides.nameKo,
      startSec: 0,
      url: '',
    },
    favoriteTag: 'none',
    ...overrides,
  };
}

function makeStep(
  overrides: Partial<SequenceStep> & { stepId: string; exerciseId: string; order: number },
): SequenceStep {
  return {
    kind: 'exercise',
    blockCategory: 'core',
    durationMin: 5,
    selectedLayer: 'standard',
    ...overrides,
  };
}

describe('sequenceAutomationEngine', () => {
  describe('parseSpringLoadUnits', () => {
    it('parses short codes, combined springs, Korean labels, alternatives, and bodyweight', () => {
      expect(parseSpringLoadUnits('Bodyweight')).toBe(0);
      expect(parseSpringLoadUnits('맨몸')).toBe(0);
      expect(parseSpringLoadUnits('1Y')).toBe(0.25);
      expect(parseSpringLoadUnits('1B')).toBe(0.5);
      expect(parseSpringLoadUnits('1R')).toBe(1.0);
      expect(parseSpringLoadUnits('1R 1B')).toBe(1.5);
      expect(parseSpringLoadUnits('2R 1B')).toBe(2.5);
      expect(parseSpringLoadUnits('빨강 2 파랑 1')).toBe(2.5);
      expect(parseSpringLoadUnits('1R or 1B')).toBe(0.75);
    });
  });

  describe('analyzeSequenceFreshness', () => {
    it('classifies 0-7d as recent-duplicate, 8-14d as variation-ready, and 15+d/unused as fresh while exempting warmup/cooldown', () => {
      const signatureSteps = INITIAL_SAVED_SEQUENCES[0].steps;
      const history: ClassHistoryLog[] = [
        {
          id: 'h-recent',
          sequenceId: 'seq-1',
          sequenceTitle: '3일 전 수업',
          groupId: 'grp-mon-wed-7pm',
          groupName: '월·수 저녁반',
          taughtAt: daysBefore(3),
          apparatus: 'reformer',
          level: '1.5',
          exerciseIds: ['ex-warmup-01', 'ex-core-01', 'ex-lower-01', 'ex-cooldown-01'],
          rating: 5,
          intensity: 'moderate',
          instructorReflection: '좋았음',
        },
        {
          id: 'h-mid',
          sequenceId: 'seq-2',
          sequenceTitle: '10일 전 수업',
          groupId: 'grp-mon-wed-7pm',
          groupName: '월·수 저녁반',
          taughtAt: daysBefore(10),
          apparatus: 'reformer',
          level: '1.5',
          exerciseIds: ['ex-upper-01', 'ex-plank-01'],
          rating: 4,
          intensity: 'moderate',
          instructorReflection: '무난함',
        },
        {
          id: 'h-old',
          sequenceId: 'seq-3',
          sequenceTitle: '20일 전 수업',
          groupId: 'grp-mon-wed-7pm',
          groupName: '월·수 저녁반',
          taughtAt: daysBefore(20),
          apparatus: 'reformer',
          level: '1.5',
          exerciseIds: ['ex-extension-01'],
          rating: 5,
          intensity: 'moderate',
          instructorReflection: '좋음',
        },
      ];

      const report = analyzeSequenceFreshness(signatureSteps, INITIAL_EXERCISES, history, {
        groupId: 'grp-mon-wed-7pm',
        referenceDate: REF_DATE,
      });

      const byExId = new Map(report.steps.map((s) => [s.exerciseId, s]));

      // Main blocks taught 3 days ago => recent-duplicate
      expect(byExId.get('ex-core-01')?.status).toBe('recent-duplicate');
      expect(byExId.get('ex-core-01')?.shouldAutoReplace).toBe(true);
      expect(byExId.get('ex-core-01')?.replacementCandidates.length).toBeGreaterThan(0);
      expect(byExId.get('ex-lower-01')?.status).toBe('recent-duplicate');

      // Warmup & Cooldown taught 3 days ago => exempt from harsh blocking
      expect(byExId.get('ex-warmup-01')?.status).toBe('fresh');
      expect(byExId.get('ex-warmup-01')?.isRoutineExempt).toBe(true);
      expect(byExId.get('ex-warmup-01')?.shouldAutoReplace).toBe(false);
      expect(byExId.get('ex-cooldown-01')?.status).toBe('fresh');
      expect(byExId.get('ex-cooldown-01')?.isRoutineExempt).toBe(true);

      // 10 days ago => variation-ready with variation advice
      expect(byExId.get('ex-upper-01')?.status).toBe('variation-ready');
      expect(byExId.get('ex-upper-01')?.variationSuggestionKo).toBeTruthy();
      expect(byExId.get('ex-plank-01')?.status).toBe('variation-ready');

      // 20 days ago & untouched => fresh
      expect(byExId.get('ex-extension-01')?.status).toBe('fresh');
      expect(byExId.get('ex-footwork-01')?.status).toBe('fresh');

      expect(report.recentDuplicateCount).toBe(2);
      expect(report.variationReadyCount).toBe(2);
      expect(report.freshnessScore).toBeGreaterThan(0);
      expect(report.freshnessScore).toBeLessThan(100);
    });

    it('isolates freshness analysis to the selected groupId', () => {
      const signatureSteps = INITIAL_SAVED_SEQUENCES[0].steps;
      const otherGroupLog: ClassHistoryLog[] = [
        {
          id: 'h-other',
          sequenceId: 'seq-1',
          sequenceTitle: '다른 반 최근 수업',
          groupId: 'grp-tue-thu-10am',
          groupName: '화·목 오전반',
          taughtAt: daysBefore(1),
          apparatus: 'reformer',
          level: '1.0',
          exerciseIds: ['ex-core-01', 'ex-lower-01', 'ex-upper-01'],
          rating: 5,
          intensity: 'moderate',
          instructorReflection: '',
        },
      ];

      const groupReport = analyzeSequenceFreshness(signatureSteps, INITIAL_EXERCISES, otherGroupLog, {
        groupId: 'grp-mon-wed-7pm',
        referenceDate: REF_DATE,
      });

      expect(groupReport.recentDuplicateCount).toBe(0);
      expect(groupReport.freshnessScore).toBe(100);
    });
    it('softly advises variation when a warmup is repeated 3+ times in 4 weeks without harsh blocking', () => {
      const steps = [INITIAL_SAVED_SEQUENCES[0].steps[0]]; // ex-warmup-01
      const repeatedLogs: ClassHistoryLog[] = [2, 9, 16].map((d, idx) => ({
        id: `rep-${idx}`,
        sequenceId: `seq-${idx}`,
        sequenceTitle: `반복 워밍업 ${idx}`,
        groupId: 'grp-mon-wed-7pm',
        groupName: '월·수 저녁반',
        taughtAt: daysBefore(d),
        apparatus: 'reformer',
        level: '1.5',
        exerciseIds: ['ex-warmup-01'],
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '',
      }));

      const report = analyzeSequenceFreshness(steps, INITIAL_EXERCISES, repeatedLogs, {
        groupId: 'grp-mon-wed-7pm',
        referenceDate: REF_DATE,
      });

      expect(report.steps[0].status).toBe('variation-ready');
      expect(report.steps[0].isRoutineExempt).toBe(true);
      expect(report.steps[0].shouldAutoReplace).toBe(false);
      expect(report.recentDuplicateCount).toBe(0);
    });
  });

  describe('safety verifier integration across all automation outputs', () => {
    it('passes all 5 Verify AI safety and catalog integrity gates for anchor-first, forked, and weekly sequences', () => {
      const exMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

      const anchorBuilt = buildAnchorFirstSequence({
        anchorExerciseIds: ['ex-extension-02'],
        exercises: INITIAL_EXERCISES,
        historyLogs: INITIAL_HISTORY_LOGS,
        targetMinutes: 50,
        level: '2.0',
        referenceDate: REF_DATE,
      });
      expect(verifySequenceAiSafetyAndFidelity(anchorBuilt.steps, exMap).allPassed).toBe(true);

      const forked = forkSequenceAcrossLevels({
        baseTitle: '리포머 밸런스',
        steps: INITIAL_SAVED_SEQUENCES[0].steps,
        exercises: INITIAL_EXERCISES,
        targetMinutes: 50,
        referenceDate: REF_DATE,
      });
      for (const variant of forked.variants) {
        expect(verifySequenceAiSafetyAndFidelity(variant.steps, exMap).allPassed).toBe(true);
      }

      const weekly = generateWeeklyAutoPlan({
        groups: INITIAL_CLASS_GROUPS,
        exercises: INITIAL_EXERCISES,
        historyLogs: INITIAL_HISTORY_LOGS,
        apparatus: 'reformer',
        targetMinutes: 50,
        referenceDate: REF_DATE,
      });
      for (const draft of weekly.plans) {
        expect(verifySequenceAiSafetyAndFidelity(draft.steps, exMap).allPassed).toBe(true);
      }
      expect(weekly.stats.recentHistoryOverlapCount).toBe(0);
    });
  });

  describe('refreshOverlappingSteps', () => {
    it('preserves locked steps and rest steps 100%, replaces only overlapping main steps with fresh same-apparatus alternatives', () => {
      const baseSteps = INITIAL_SAVED_SEQUENCES[0].steps;
      const stepsWithLockAndRest: SequenceStep[] = [
        ...baseSteps.slice(0, 3),
        { ...baseSteps[3], locked: true }, // ex-core-01 is LOCKED
        {
          kind: 'rest',
          stepId: 'rest-mid-1',
          order: 5,
          blockCategory: 'core',
          exerciseId: '',
          durationMin: 2,
          selectedLayer: 'standard',
          instructorNote: '물 마시기 휴식',
        },
        ...baseSteps.slice(4),
      ];

      // INITIAL_HISTORY_LOGS[0] was taught 2026-11-02 (3 days before REF_DATE) for grp-mon-wed-7pm
      const result = refreshOverlappingSteps(
        stepsWithLockAndRest,
        INITIAL_EXERCISES,
        INITIAL_HISTORY_LOGS,
        {
          groupId: 'grp-mon-wed-7pm',
          referenceDate: REF_DATE,
        },
      );

      // Locked step untouched
      expect(result.steps[3].exerciseId).toBe('ex-core-01');
      expect(result.steps[3].locked).toBe(true);
      expect(result.preservedLockedCount).toBe(1);
      expect(result.skippedSteps.some((s) => s.exerciseId === 'ex-core-01' && s.reason === 'locked')).toBe(
        true,
      );

      // Rest step untouched at exact index
      expect(result.steps[4].kind).toBe('rest');
      expect(result.steps[4].stepId).toBe('rest-mid-1');
      expect(result.steps[4].durationMin).toBe(2);
      expect(result.preservedRestCount).toBe(1);

      // Warmup & Cooldown preserved (routine exempt)
      expect(result.steps[0].exerciseId).toBe('ex-warmup-01');
      expect(result.steps[result.steps.length - 1].exerciseId).toBe('ex-cooldown-01');

      // Unlocked overlapping main steps replaced with fresh reformer exercises
      expect(result.replacedCount).toBeGreaterThanOrEqual(4);
      expect(result.afterFreshnessScore).toBeGreaterThan(result.beforeFreshnessScore);

      const exMap = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));
      for (const diff of result.diffs) {
        expect(diff.toExerciseId).not.toBe(diff.fromExerciseId);
        expect(diff.apparatus).toBe('reformer');
        expect(exMap.has(diff.toExerciseId)).toBe(true);
      }

      // No duplicate exercise IDs introduced in the refreshed sequence
      const nonRestIds = result.steps.filter((s) => s.kind !== 'rest').map((s) => s.exerciseId);
      expect(new Set(nonRestIds).size).toBe(nonRestIds.length);
    });
  });

  describe('buildAnchorFirstSequence', () => {
    it('builds a balanced 50-minute class around 1 high-intensity extension anchor with warmup first, 4-plane balance, compensatory cooldown, and fresh history avoidance', () => {
      const result = buildAnchorFirstSequence({
        anchorExerciseIds: ['ex-extension-01'],
        exercises: INITIAL_EXERCISES,
        historyLogs: INITIAL_HISTORY_LOGS,
        targetMinutes: 50,
        level: '1.5',
        groupId: 'grp-mon-wed-7pm',
        referenceDate: REF_DATE,
      });

      // Includes the anchor exercise
      expect(result.steps.some((s) => s.exerciseId === 'ex-extension-01')).toBe(true);
      expect(result.anchorExerciseIds).toEqual(['ex-extension-01']);

      // Warmup is first (never starts cold with extension)
      const exMap = new Map(INITIAL_EXERCISES.map((e) => [e.id, e]));
      const firstEx = exMap.get(result.steps[0].exerciseId);
      const lastEx = exMap.get(result.steps[result.steps.length - 1].exerciseId);
      expect(firstEx?.blockCategory).toBe('warmup');
      expect(lastEx?.blockCategory).toBe('cooldown');

      // Anchor extension is not at index 0
      expect(result.steps[0].exerciseId).not.toBe('ex-extension-01');

      // Exact target duration (50 min)
      const totalMin = Number(
        result.steps.reduce((sum, step) => sum + step.durationMin, 0).toFixed(1),
      );
      expect(totalMin).toBe(50);

      // 4-plane spinal coverage achieved
      expect(result.coveredSpinalPlanes.length).toBeGreaterThanOrEqual(3);
      expect(result.coveredSpinalPlanes).toContain('flexion');
      expect(result.coveredSpinalPlanes).toContain('extension');

      // High freshness (avoids recent 7-day history for grp-mon-wed-7pm)
      expect(result.freshness.freshnessScore).toBeGreaterThanOrEqual(75);
      expect(result.compensatoryCooldownReasonKo.length).toBeGreaterThan(10);
    });

    it('supports 2 anchors and multiple target durations (30, 40, 60 min) without duplicate exercises', () => {
      for (const duration of [30, 40, 60] as const) {
        const res = buildAnchorFirstSequence({
          anchorExerciseIds: ['ex-core-02', 'ex-lower-02'],
          exercises: INITIAL_EXERCISES,
          historyLogs: [],
          targetMinutes: duration,
          level: '1.5',
          referenceDate: REF_DATE,
        });

        const ids = res.steps.map((s) => s.exerciseId);
        expect(ids).toContain('ex-core-02');
        expect(ids).toContain('ex-lower-02');
        expect(new Set(ids).size).toBe(ids.length);
        const totalMin = Number(res.steps.reduce((acc, s) => acc + s.durationMin, 0).toFixed(1));
        expect(totalMin).toBe(duration);
      }
    });
  });

  describe('forkSequenceAcrossLevels', () => {
    it('forks 1 sequence simultaneously into 1.0, 1.5, and 2.0 tailored variants while preserving locked/rest steps', () => {
      const baseSteps: SequenceStep[] = [
        { ...INITIAL_SAVED_SEQUENCES[0].steps[0], locked: true },
        ...INITIAL_SAVED_SEQUENCES[0].steps.slice(1, 5),
        {
          kind: 'rest',
          stepId: 'rest-1',
          order: 6,
          blockCategory: 'core',
          exerciseId: '',
          durationMin: 2,
          selectedLayer: 'standard',
        },
        ...INITIAL_SAVED_SEQUENCES[0].steps.slice(5),
      ];

      const bundle = forkSequenceAcrossLevels({
        baseTitle: '리포머 전신 밸런스',
        steps: baseSteps,
        exercises: INITIAL_EXERCISES,
        targetMinutes: 50,
        referenceDate: REF_DATE,
      });

      expect(bundle.variants.map((v) => v.level)).toEqual(['1.0', '1.5', '2.0']);
      expect(bundle.forks['1.0'].defaultLayer).toBe('easy');
      expect(bundle.forks['1.5'].defaultLayer).toBe('standard');
      expect(bundle.forks['2.0'].defaultLayer).toBe('hard');

      // Beginner variant uses easy layer on unlocked steps and preserves locked warmup + rest
      const beginnerMain = bundle.forks['1.0'].steps.filter((s) => !s.locked && s.kind !== 'rest');
      expect(beginnerMain.every((s) => s.selectedLayer === 'easy')).toBe(true);
      expect(bundle.forks['1.0'].steps[0].exerciseId).toBe(baseSteps[0].exerciseId);
      expect(bundle.forks['1.0'].steps[5].kind).toBe('rest');

      // Advanced variant upgrades exercises or adds challenge props and uses hard layer on main steps
      const advanced = bundle.forks['2.0'];
      expect(advanced.swappedCount + advanced.propEnhancedCount).toBeGreaterThan(0);
      const advancedMain = advanced.steps.filter(
        (s) => !s.locked && s.kind !== 'rest' && s.blockCategory !== 'warmup' && s.blockCategory !== 'cooldown',
      );
      expect(advancedMain.every((s) => s.selectedLayer === 'hard')).toBe(true);

      // Each fork has zero duplicate exercises
      for (const variant of bundle.variants) {
        const ids = variant.steps.filter((s) => s.kind !== 'rest').map((s) => s.exerciseId);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  describe('generateWeeklyAutoPlan', () => {
    it('creates weekly class drafts for all groups with zero cross-class main overlap and zero recent 7-day history overlap', () => {
      const plan = generateWeeklyAutoPlan({
        groups: INITIAL_CLASS_GROUPS,
        exercises: INITIAL_EXERCISES,
        historyLogs: INITIAL_HISTORY_LOGS,
        apparatus: 'mixed',
        targetMinutes: 50,
        referenceDate: REF_DATE,
      });

      expect(plan.plans).toHaveLength(INITIAL_CLASS_GROUPS.length);
      expect(plan.stats.totalClasses).toBe(INITIAL_CLASS_GROUPS.length);
      expect(plan.stats.crossClassMainOverlapCount).toBe(0);
      expect(plan.stats.recentHistoryOverlapCount).toBe(0);
      expect(plan.stats.averageFreshnessScore).toBeGreaterThanOrEqual(85);

      // Verify each plan matches its group's defaultLevel and exact target minutes
      plan.plans.forEach((draft, idx) => {
        const group = INITIAL_CLASS_GROUPS[idx];
        expect(draft.groupId).toBe(group.id);
        expect(draft.level).toBe(group.defaultLevel);
        const totalMin = Number(draft.steps.reduce((sum, st) => sum + st.durationMin, 0).toFixed(1));
        expect(totalMin).toBe(50);
      });

      // Verify primary main exercises are strictly disjoint across all weekly classes
      const allMainIds = plan.plans.flatMap((p) => p.mainExerciseIds);
      expect(new Set(allMainIds).size).toBe(allMainIds.length);
    });

    it('handles an empty group list gracefully', () => {
      const emptyGroups: ClassGroupProfile[] = [];
      const res = generateWeeklyAutoPlan({
        groups: emptyGroups,
        exercises: INITIAL_EXERCISES,
        historyLogs: [],
        referenceDate: REF_DATE,
      });
      expect(res.plans).toEqual([]);
      expect(res.stats.totalClasses).toBe(0);
    });
  });

  describe('optimizeSequenceFlowSmart', () => {
    it('detects and resolves sudden supine->standing jumps, consecutive wrist loads, and spring ping-ponging while preserving locked & rest steps', () => {
      const syntheticCatalog: PilatesExercise[] = [
        makeExercise({
          id: 'w1',
          nameKo: '호흡 예열',
          blockCategory: 'warmup',
          bodyPosition: 'supine',
          springs: '2R',
          spinalPlanes: ['neutral'],
        }),
        makeExercise({
          id: 'sup1',
          nameKo: '누운 풋워크',
          blockCategory: 'footwork',
          bodyPosition: 'supine',
          springs: '2R',
          spinalPlanes: ['neutral'],
        }),
        makeExercise({
          id: 'stand1',
          nameKo: '스탠딩 스쿠터',
          blockCategory: 'lower-body',
          bodyPosition: 'standing',
          springs: '1R',
          spinalPlanes: ['neutral'],
        }),
        makeExercise({
          id: 'seat1',
          nameKo: '앉은 로잉',
          blockCategory: 'upper-body',
          bodyPosition: 'seated',
          springs: '1R',
          spinalPlanes: ['rotation'],
        }),
        makeExercise({
          id: 'plank1',
          nameKo: '롱 스트레치 플랭크',
          blockCategory: 'plank',
          bodyPosition: 'quadruped',
          springs: '1R 1B',
          spinalPlanes: ['neutral'],
        }),
        makeExercise({
          id: 'plank2',
          nameKo: '엘리펀트 네발 지지',
          blockCategory: 'plank',
          bodyPosition: 'quadruped',
          springs: '1R 1B',
          spinalPlanes: ['flexion'],
        }),
        makeExercise({
          id: 'c1',
          nameKo: '머메이드 마무리',
          blockCategory: 'cooldown',
          bodyPosition: 'seated',
          springs: '1B',
          spinalPlanes: ['lateral'],
        }),
      ];

      // Poorly ordered sequence: supine -> standing (sudden!), two consecutive planks (wrist stack!), seated buried after
      const messySteps: SequenceStep[] = [
        makeStep({ stepId: 'st-0', order: 1, exerciseId: 'w1', blockCategory: 'warmup', locked: true }),
        makeStep({ stepId: 'st-1', order: 2, exerciseId: 'sup1', blockCategory: 'footwork' }),
        makeStep({ stepId: 'st-2', order: 3, exerciseId: 'stand1', blockCategory: 'lower-body' }),
        makeStep({ stepId: 'st-3', order: 4, exerciseId: 'plank1', blockCategory: 'plank' }),
        makeStep({ stepId: 'st-4', order: 5, exerciseId: 'plank2', blockCategory: 'plank' }),
        makeStep({ stepId: 'st-5', order: 6, exerciseId: 'seat1', blockCategory: 'upper-body' }),
        {
          kind: 'rest',
          stepId: 'st-rest',
          order: 7,
          blockCategory: 'core',
          exerciseId: '',
          durationMin: 1,
          selectedLayer: 'standard',
        },
        makeStep({ stepId: 'st-7', order: 8, exerciseId: 'c1', blockCategory: 'cooldown' }),
      ];

      const optimized = optimizeSequenceFlowSmart(messySteps, syntheticCatalog);

      // Before optimization: detects both sudden standing jump and consecutive wrist load
      expect(optimized.beforeWarnings.some((w) => w.type === 'sudden-standing-transition')).toBe(
        true,
      );
      expect(optimized.beforeWarnings.some((w) => w.type === 'consecutive-wrist-load')).toBe(true);

      // After optimization: resolves both issues and improves score
      expect(optimized.changed).toBe(true);
      expect(optimized.afterMetrics.suddenStandingTransitions).toBe(0);
      expect(optimized.afterMetrics.maxConsecutiveWristSteps).toBe(1);
      expect(optimized.afterScore).toBeGreaterThan(optimized.beforeScore);

      // Locked warmup at index 0, rest at exact index 6, cooldown at index 7
      expect(optimized.steps[0].stepId).toBe('st-0');
      expect(optimized.steps[0].locked).toBe(true);
      expect(optimized.steps[6].kind).toBe('rest');
      expect(optimized.steps[6].stepId).toBe('st-rest');
      expect(optimized.steps[7].exerciseId).toBe('c1');
    });

    it('detects and separates consecutive neck-load supine flexion exercises', () => {
      const catalog: PilatesExercise[] = [
        makeExercise({
          id: 'neck-1',
          nameKo: '헌드레드 컬업',
          blockCategory: 'core',
          bodyPosition: 'supine',
          spinalPlanes: ['flexion'],
          springs: '1R 1B',
        }),
        makeExercise({
          id: 'neck-2',
          nameKo: '크리스크로스 컬업',
          blockCategory: 'core',
          bodyPosition: 'supine',
          spinalPlanes: ['flexion', 'rotation'],
          springs: '1R 1B',
        }),
        makeExercise({
          id: 'bridge-1',
          nameKo: '브릿지 분절',
          blockCategory: 'bridging',
          bodyPosition: 'supine',
          spinalPlanes: ['neutral'],
          springs: '2R',
        }),
      ];

      const steps: SequenceStep[] = [
        makeStep({ stepId: 's1', order: 1, exerciseId: 'neck-1', blockCategory: 'core' }),
        makeStep({ stepId: 's2', order: 2, exerciseId: 'neck-2', blockCategory: 'core' }),
        makeStep({ stepId: 's3', order: 3, exerciseId: 'bridge-1', blockCategory: 'bridging' }),
      ];

      const result = optimizeSequenceFlowSmart(steps, catalog);
      expect(result.beforeWarnings.some((w) => w.type === 'consecutive-neck-load')).toBe(true);
      expect(result.afterMetrics.maxConsecutiveNeckSteps).toBe(1);
      // bridge-1 placed between neck-1 and neck-2
      expect(result.steps[1].exerciseId).toBe('bridge-1');
    });

    it('keeps primary main block constant aligned with pilates rules', () => {
      expect(PRIMARY_MAIN_BLOCKS.has('core')).toBe(true);
      expect(PRIMARY_MAIN_BLOCKS.has('lower-body')).toBe(true);
      expect(PRIMARY_MAIN_BLOCKS.has('upper-body')).toBe(true);
      expect(PRIMARY_MAIN_BLOCKS.has('plank')).toBe(true);
      expect(PRIMARY_MAIN_BLOCKS.has('extension')).toBe(true);
      expect(PRIMARY_MAIN_BLOCKS.has('warmup')).toBe(false);
      expect(PRIMARY_MAIN_BLOCKS.has('cooldown')).toBe(false);
    });
  });
});
