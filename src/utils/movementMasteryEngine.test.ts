import { describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import {
  ALL_APPARATUS_ORDER,
  buildMovementStudyCard,
  computeMasterySummary,
  extractSequenceExerciseIds,
  generateMovementQuiz,
  loadMovementMasteryRecords,
  MOVEMENT_MASTERY_STORAGE_KEY,
  recordMasteryOutcome,
  saveMovementMasteryRecords,
  selectDailyStudyQueue,
  type MovementMasteryRecord,
} from './movementMasteryEngine';

const sampleReformerFootwork = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
const sampleReformerPlank =
  INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'plank') ??
  INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer')!;
const sampleMatWarmup = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'mat')!;
const sampleCadillac = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'cadillac')!;
const sampleChair = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'chair')!;
const sampleBarrel = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'barrel')!;

describe('movementMasteryEngine', () => {
  describe('buildMovementStudyCard', () => {
    it('builds a complete study card with anatomy image, 3 setup items, spring role, and 3-level spoken scripts', () => {
      const card = buildMovementStudyCard(sampleReformerFootwork);

      expect(card.exerciseId).toBe(sampleReformerFootwork.id);
      expect(card.difficultyLabelKo).toBe('입문 ★☆☆');
      expect(card.springRole).toBe('resistance');
      expect(card.springPrincipleKo).toContain('스프링');
      expect(card.breathCueKo.length).toBeGreaterThan(8);
      expect(card.setupChecklistKo).toHaveLength(3);
      expect(card.setupChecklistKo.every((item) => item.trim().length > 5)).toBe(true);

      expect(card.cueScriptByLevel.easy.length).toBeGreaterThan(20);
      expect(card.cueScriptByLevel.standard.length).toBeGreaterThan(20);
      expect(card.cueScriptByLevel.challenge.length).toBeGreaterThan(20);
      expect(card.cueScriptByLevel.easy).not.toBe(card.cueScriptByLevel.challenge);

      expect(card.targetMusclesKo.length).toBeGreaterThan(0);
      expect(card.anatomyImageSrc).toMatch(/^\/images\/atelier-anatomy\/anatomy-.*\.webp$/);
      expect(card.anatomyImageFallbackSrc).toMatch(/^\/images\/atelier-anatomy\/anatomy-.*\.png$/);
    });

    it('accurately classifies spring mechanics across reformer stability, cadillac assist, and mat/barrel bodyweight', () => {
      const plankCard = buildMovementStudyCard(sampleReformerPlank);
      expect(['stability', 'resistance']).toContain(plankCard.springRole);
      if (sampleReformerPlank.blockCategory === 'plank') {
        expect(plankCard.springRole).toBe('stability');
        expect(plankCard.springPrincipleKo).toContain('가벼울수록');
      }

      const matCard = buildMovementStudyCard(sampleMatWarmup);
      expect(matCard.springRole).toBe('bodyweight');

      const barrelCard = buildMovementStudyCard(sampleBarrel);
      expect(barrelCard.springRole).toBe('bodyweight');
      expect(barrelCard.springPrincipleKo).toContain('바렐');

      const cadillacCard = buildMovementStudyCard(sampleCadillac);
      expect(cadillacCard.springRole).toBe('assist');

      const chairCard = buildMovementStudyCard(sampleChair);
      expect(['stability', 'resistance', 'bodyweight']).toContain(chairCard.springRole);
    });

    it('produces natural non-medical Korean across all 5 apparatuses without translationese', () => {
      const samples = [
        sampleReformerFootwork,
        sampleCadillac,
        sampleChair,
        sampleBarrel,
        sampleMatWarmup,
      ];
      for (const ex of samples) {
        const card = buildMovementStudyCard(ex);
        const joined = [
          card.springPrincipleKo,
          card.breathCueKo,
          ...card.setupChecklistKo,
          card.cueScriptByLevel.easy,
          card.cueScriptByLevel.standard,
          card.cueScriptByLevel.challenge,
        ].join(' ');
        expect(joined).not.toMatch(/완치|진단|처방|치료 보장|하는 것을 가능하게 합니다/);
      }
    });
  });

  describe('generateMovementQuiz', () => {
    it('generates 3 deterministic 4-option multiple-choice questions with distinct options and clear explanations', () => {
      const firstRun = generateMovementQuiz(sampleReformerFootwork, INITIAL_EXERCISES);
      const secondRun = generateMovementQuiz(sampleReformerFootwork, INITIAL_EXERCISES);

      expect(firstRun).toHaveLength(3);
      expect(firstRun).toEqual(secondRun);

      expect(firstRun[0]?.category).toBe('fault-correction');
      expect(firstRun[1]?.category).toBe('spring-mechanics');
      expect(['layer-modification', 'breath-cue']).toContain(firstRun[2]?.category);

      for (const q of firstRun) {
        expect(q.optionsKo).toHaveLength(4);
        expect(new Set(q.optionsKo).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
        expect(q.promptKo.trim().length).toBeGreaterThan(10);
        expect(q.explanationKo.trim().length).toBeGreaterThan(10);
      }
    });

    it('gracefully handles an empty exercise pool without throwing or losing option uniqueness', () => {
      const quiz = generateMovementQuiz(sampleMatWarmup, []);
      expect(quiz).toHaveLength(3);
      for (const q of quiz) {
        expect(q.optionsKo).toHaveLength(4);
        expect(new Set(q.optionsKo).size).toBe(4);
      }
    });

    it('covers both layer-modification and breath-cue across catalog exercises', () => {
      const thirdCategories = new Set(
        INITIAL_EXERCISES.slice(0, 20).map(
          (ex) => generateMovementQuiz(ex, INITIAL_EXERCISES)[2]?.category,
        ),
      );
      expect(thirdCategories.has('layer-modification')).toBe(true);
      expect(thirdCategories.has('breath-cue')).toBe(true);
    });
  });

  describe('recordMasteryOutcome', () => {
    const baseNow = '2026-11-23T09:00:00.000Z';

    it('schedules again -> practicing (+1 day, streak 0) immutably', () => {
      const initial: Record<string, MovementMasteryRecord> = {};
      const next = recordMasteryOutcome(initial, 'ex-footwork-01', 'again', baseNow);

      expect(initial).toEqual({});
      expect(next['ex-footwork-01']).toEqual({
        exerciseId: 'ex-footwork-01',
        status: 'practicing',
        streak: 0,
        reviewCount: 1,
        lastReviewedAt: '2026-11-23T09:00:00.000Z',
        nextReviewAt: '2026-11-24T09:00:00.000Z',
      });
    });

    it('progresses good ratings across streak 1 -> 2 -> 3 (ready -> ready -> mastered, 3~7 days)', () => {
      const r1 = recordMasteryOutcome({}, 'ex-footwork-01', 'good', baseNow);
      expect(r1['ex-footwork-01']?.status).toBe('ready');
      expect(r1['ex-footwork-01']?.streak).toBe(1);
      expect(r1['ex-footwork-01']?.nextReviewAt).toBe('2026-11-26T09:00:00.000Z'); // +3 days

      const r2 = recordMasteryOutcome(r1, 'ex-footwork-01', 'good', '2026-11-26T09:00:00.000Z');
      expect(r2['ex-footwork-01']?.status).toBe('ready');
      expect(r2['ex-footwork-01']?.streak).toBe(2);
      expect(r2['ex-footwork-01']?.nextReviewAt).toBe('2026-12-01T09:00:00.000Z'); // +5 days

      const r3 = recordMasteryOutcome(r2, 'ex-footwork-01', 'good', '2026-12-01T09:00:00.000Z');
      expect(r3['ex-footwork-01']?.status).toBe('mastered');
      expect(r3['ex-footwork-01']?.streak).toBe(3);
      expect(r3['ex-footwork-01']?.reviewCount).toBe(3);
      expect(r3['ex-footwork-01']?.nextReviewAt).toBe('2026-12-08T09:00:00.000Z'); // +7 days
    });

    it('marks mastered immediately with a 14-day review interval and resets streak on again', () => {
      const m = recordMasteryOutcome({}, 'ex-footwork-01', 'mastered', baseNow);
      expect(m['ex-footwork-01']?.status).toBe('mastered');
      expect(m['ex-footwork-01']?.streak).toBeGreaterThanOrEqual(3);
      expect(m['ex-footwork-01']?.nextReviewAt).toBe('2026-12-07T09:00:00.000Z'); // +14 days

      const reset = recordMasteryOutcome(m, 'ex-footwork-01', 'again', '2026-12-07T09:00:00.000Z');
      expect(reset['ex-footwork-01']?.status).toBe('practicing');
      expect(reset['ex-footwork-01']?.streak).toBe(0);
      expect(reset['ex-footwork-01']?.reviewCount).toBe(2);
      expect(reset['ex-footwork-01']?.nextReviewAt).toBe('2026-12-08T09:00:00.000Z');
    });
  });

  describe('selectDailyStudyQueue & extractSequenceExerciseIds', () => {
    const nowIso = '2026-11-23T12:00:00.000Z';

    it('orders tomorrow sequence movements first, then due reviews, then unseen movements', () => {
      const pool: PilatesExercise[] = INITIAL_EXERCISES.slice(0, 6);
      const [ex0, ex1, ex2, ex3, ex4, ex5] = pool;

      const records: Record<string, MovementMasteryRecord> = {
        // ex0 is mastered and NOT due -> should drop to the back
        [ex0.id]: {
          exerciseId: ex0.id,
          status: 'mastered',
          streak: 3,
          reviewCount: 3,
          lastReviewedAt: '2026-11-20T12:00:00.000Z',
          nextReviewAt: '2026-12-04T12:00:00.000Z',
        },
        // ex2 is due for review yesterday -> should come right after sequence priority
        [ex2.id]: {
          exerciseId: ex2.id,
          status: 'practicing',
          streak: 0,
          reviewCount: 1,
          lastReviewedAt: '2026-11-21T12:00:00.000Z',
          nextReviewAt: '2026-11-22T12:00:00.000Z',
        },
      };

      const queue = selectDailyStudyQueue(pool, records, {
        prioritizeExerciseIds: [ex4.id, ex5.id],
        limit: 5,
        nowIso,
      });

      expect(queue).toHaveLength(5);
      // Priority 1: sequence exercises
      expect(queue[0]?.id).toBe(ex4.id);
      expect(queue[1]?.id).toBe(ex5.id);
      // Priority 2: overdue review
      expect(queue[2]?.id).toBe(ex2.id);
      // Priority 3: unseen exercises (ex1, ex3) ahead of already-mastered ex0
      expect(queue.slice(3).map((e) => e.id)).toEqual(expect.arrayContaining([ex1.id, ex3.id]));
      expect(queue.some((e) => e.id === ex0.id)).toBe(false);
    });

    it('filters by apparatus and ignores rest steps when extracting sequence IDs', () => {
      const matQueue = selectDailyStudyQueue(INITIAL_EXERCISES, {}, { apparatus: 'mat', limit: 4 });
      expect(matQueue.length).toBeGreaterThan(0);
      expect(matQueue.every((ex) => ex.apparatus === 'mat')).toBe(true);

      const steps: SequenceStep[] = [
        {
          stepId: 's1',
          order: 1,
          blockCategory: 'warmup',
          exerciseId: sampleReformerFootwork.id,
          durationMin: 4,
          selectedLayer: 'standard',
        },
        {
          stepId: 's-rest',
          order: 2,
          kind: 'rest',
          blockCategory: 'cooldown',
          exerciseId: '',
          durationMin: 2,
          selectedLayer: 'standard',
        },
        {
          stepId: 's2',
          order: 3,
          blockCategory: 'warmup',
          exerciseId: sampleMatWarmup.id,
          durationMin: 4,
          selectedLayer: 'standard',
        },
        // Duplicate exerciseId should deduplicate
        {
          stepId: 's3',
          order: 4,
          blockCategory: 'warmup',
          exerciseId: sampleReformerFootwork.id,
          durationMin: 3,
          selectedLayer: 'easy',
        },
      ];

      expect(extractSequenceExerciseIds(steps)).toEqual([
        sampleReformerFootwork.id,
        sampleMatWarmup.id,
      ]);
    });
  });

  describe('computeMasterySummary', () => {
    it('computes accurate global and per-apparatus counts and percentages', () => {
      const subset = [sampleReformerFootwork, sampleCadillac, sampleChair, sampleBarrel, sampleMatWarmup];
      const nowIso = '2026-11-23T12:00:00.000Z';

      let records: Record<string, MovementMasteryRecord> = {};
      records = recordMasteryOutcome(records, sampleReformerFootwork.id, 'mastered', nowIso);
      records = recordMasteryOutcome(records, sampleCadillac.id, 'good', nowIso);
      records = recordMasteryOutcome(records, sampleChair.id, 'again', '2026-11-20T12:00:00.000Z'); // due

      const summary = computeMasterySummary(subset, records, nowIso);
      expect(summary.totalCount).toBe(5);
      expect(summary.masteredCount).toBe(1);
      expect(summary.readyCount).toBe(1);
      expect(summary.practicingCount).toBe(1);
      expect(summary.unseenCount).toBe(2);
      expect(summary.dueCount).toBe(1);
      expect(summary.progressPct).toBeGreaterThan(0);
      expect(summary.progressPct).toBeLessThan(100);

      for (const app of ALL_APPARATUS_ORDER) {
        expect(summary.byApparatus[app].totalCount).toBe(1);
      }
      expect(summary.byApparatus.reformer.progressPct).toBe(100);
      expect(summary.byApparatus.mat.progressPct).toBe(0);
    });

    it('returns 0% for empty catalog and 100% when all exercises are mastered', () => {
      const emptySummary = computeMasterySummary([], {});
      expect(emptySummary.totalCount).toBe(0);
      expect(emptySummary.progressPct).toBe(0);

      const two = [sampleReformerFootwork, sampleMatWarmup];
      let records = recordMasteryOutcome({}, sampleReformerFootwork.id, 'mastered');
      records = recordMasteryOutcome(records, sampleMatWarmup.id, 'mastered');
      const fullSummary = computeMasterySummary(two, records);
      expect(fullSummary.progressPct).toBe(100);
      expect(fullSummary.masteredCount).toBe(2);
    });
  });

  describe('storage persistence', () => {
    it('round-trips valid records under pf_movement_mastery_v1 and discards corrupt data safely', () => {
      expect(MOVEMENT_MASTERY_STORAGE_KEY).toBe('pf_movement_mastery_v1');

      const map = new Map<string, string>();
      const fakeStorage = {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, val: string) => {
          map.set(key, val);
        },
      };

      const records = recordMasteryOutcome(
        {},
        'ex-footwork-01',
        'good',
        '2026-11-23T09:00:00.000Z',
      );
      expect(saveMovementMasteryRecords(records, fakeStorage)).toBe(true);
      expect(loadMovementMasteryRecords(fakeStorage)).toEqual(records);

      // Corrupt JSON
      map.set(MOVEMENT_MASTERY_STORAGE_KEY, '{not-json');
      expect(loadMovementMasteryRecords(fakeStorage)).toEqual({});

      // Partially invalid entry
      map.set(
        MOVEMENT_MASTERY_STORAGE_KEY,
        JSON.stringify({
          good: records['ex-footwork-01'],
          bad: { exerciseId: '', status: 'invalid-status', streak: -2 },
        }),
      );
      expect(Object.keys(loadMovementMasteryRecords(fakeStorage))).toEqual(['good']);

      // Throwing storage never crashes
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error('denied');
        }),
        setItem: vi.fn(() => {
          throw new Error('quota');
        }),
      };
      expect(loadMovementMasteryRecords(throwingStorage)).toEqual({});
      expect(saveMovementMasteryRecords(records, throwingStorage)).toBe(false);
    });
  });
});
