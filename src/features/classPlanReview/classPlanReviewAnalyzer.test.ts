import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { ClassSequenceSnapshot } from '../../types/hierarchy';
import type { SequenceStep } from '../../types/pilates';
import { buildPlanInsights } from '../../utils/classInsights';
import { getSequenceDurations, getStepTiming } from '../../utils/sequenceEngine';
import { calculateSequenceTimeBreakdown } from '../../utils/sequenceValidation';
import { calculateStepTimeEstimate } from '../../utils/stepTimeEstimate';
import {
  adaptClassPlanForReview,
  adaptClassSnapshotForReview,
  adaptReusableBlockForReview,
  adaptSavedSequenceForReview,
  adaptSequenceStepsForReview,
} from './classPlanReviewAdapter';
import {
  analyzeNormalizedClassPlan,
  checkExistingUtilityParity,
  formatReviewDurationKo,
  reviewClassPlan,
} from './classPlanReviewAnalyzer';
import {
  SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE,
  SYNTHETIC_50MIN_NORMAL_CLASS_FIXTURE,
  SYNTHETIC_CORRUPTED_INPUT_FIXTURE,
  SYNTHETIC_EMPTY_CLASS_FIXTURE,
  SYNTHETIC_MINIMAL_HUMAN_DRAFTS,
  SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE,
  SYNTHETIC_NAME_ONLY_DRAFT_FIXTURE,
  SYNTHETIC_REUSABLE_BLOCK_FIXTURE,
  createCircularReviewFixture,
  createDeeplyNestedReviewFixture,
  createOversizedReviewFixture,
} from './classPlanReviewFixtures';
import { CLASS_PLAN_REVIEW_LIMITS } from './classPlanReviewTypes';

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value as object)) {
    return value;
  }
  seen.add(value as object);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key], seen);
  }
  return Object.freeze(value);
}

describe('classPlanReviewAdapter & classPlanReviewAnalyzer', () => {
  describe('1. Normal 30-minute and 50-minute synthetic classes', () => {
    it('reviews the 30-minute normal class with exact 1800s total and balanced left/right sides', () => {
      const report = reviewClassPlan(SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE);

      expect(report.boundary.reviewScope).toBe('local-schedule-and-timing-facts');
      expect(report.boundary.exercisePrescriptionClaimed).toBe(false);
      expect(report.boundary.efficacyOrSafetyGuaranteed).toBe(false);
      expect(report.boundary.sideBalanceMeansSafety).toBe(false);
      expect(report.boundary.externalApiOrHealthDataUsed).toBe(false);

      expect(report.timing.knownTotalSec).toBe(1800);
      expect(report.timing.knownTotalMinutes).toBe(30);
      expect(report.timing.targetSec).toBe(1800);
      expect(report.timing.knownDeltaSec).toBe(0);
      expect(report.timing.exactTargetMatch).toBe(true);
      expect(report.timing.isPartialTotal).toBe(false);
      expect(report.timing.unspecifiedTimeItemCount).toBe(0);
      expect(report.timing.invalidTimeItemCount).toBe(0);
      expect(report.timing.knownRestSec).toBe(120);
      expect(report.timing.knownExerciseSec).toBe(1680);

      expect(report.laterality.explicitLeftItemCount).toBe(1);
      expect(report.laterality.explicitRightItemCount).toBe(1);
      expect(report.laterality.bothSequentialItemCount).toBe(2);
      expect(report.laterality.knownLeftRightDiffSec).toBe(0);
      expect(report.laterality.unpairedLeftItemIds).toEqual([]);
      expect(report.laterality.unpairedRightItemIds).toEqual([]);
      expect(report.laterality.imbalancedMovementGroupKeys).toEqual([]);
      expect(report.issues).toHaveLength(0);
    });

    it('reviews the 50-minute normal class with exact 3000s total and balanced left/right sides', () => {
      const report = reviewClassPlan(SYNTHETIC_50MIN_NORMAL_CLASS_FIXTURE);

      expect(report.timing.knownTotalSec).toBe(3000);
      expect(report.timing.knownTotalMinutes).toBe(50);
      expect(report.timing.targetSec).toBe(3000);
      expect(report.timing.knownDeltaSec).toBe(0);
      expect(report.timing.exactTargetMatch).toBe(true);
      expect(report.timing.isPartialTotal).toBe(false);
      expect(report.timing.unspecifiedTimeItemCount).toBe(0);
      expect(report.timing.invalidTimeItemCount).toBe(0);

      expect(report.laterality.knownLeftRightDiffSec).toBe(0);
      expect(report.laterality.unpairedLeftItemIds).toEqual([]);
      expect(report.laterality.unpairedRightItemIds).toEqual([]);
      expect(report.laterality.imbalancedMovementGroupKeys).toEqual([]);
      expect(report.issues).toHaveLength(0);
    });
  });

  describe('2. Rest, repetitions, sets, bilateral/sequential sides, and missing/unspecified time', () => {
    it('does not double-count repetitions, sets, sequential sides, explanation, or transition, and never fakes missing time as 0s', () => {
      const report = reviewClassPlan(SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE);

      // Step 2 has durationMin: 6 (360s), explanationSec: 20, transitionSec: 20, repetitions: 10, sets: 3, sideMode: 'left-then-right'
      const seqItem = report.plan.items.find((i) => i.itemId === 'step-mix-2-seq-both');
      expect(seqItem).toBeDefined();
      expect(seqItem?.knownTotalSec).toBe(360);
      expect(seqItem?.knownMovementSec).toBe(320);
      expect(seqItem?.knownPerSideSec).toBe(160);
      expect(seqItem?.knownExplanationSec).toBe(20);
      expect(seqItem?.knownTransitionSec).toBe(20);
      expect(seqItem?.repetitions).toBe(10);
      expect(seqItem?.sets).toBe(3);

      // Rest step has 3 min = 180s
      const restItem = report.plan.items.find((i) => i.itemId === 'step-mix-3-rest');
      expect(restItem?.kind).toBe('rest');
      expect(restItem?.knownTotalSec).toBe(180);
      expect(restItem?.knownRestSec).toBe(180);
      expect(restItem?.knownMovementSec).toBe(0);
      expect(restItem?.lateralityStatus).toBe('not-applicable');

      // Missing time items must be 'unspecified' with knownTotalSec: null (NEVER 0)
      const unspec1 = report.plan.items.find((i) => i.itemId === 'step-mix-8-unspec-1');
      const unspec2 = report.plan.items.find((i) => i.itemId === 'step-mix-9-unspec-2');
      expect(unspec1?.durationStatus).toBe('unspecified');
      expect(unspec1?.knownTotalSec).toBeNull();
      expect(unspec2?.durationStatus).toBe('unspecified');
      expect(unspec2?.knownTotalSec).toBeNull();

      // Known total is 4 + 6 + 3 + 5 + 4 + 2 + 3 = 27 min (1620s) + 2 unspecified items
      expect(report.timing.knownTotalSec).toBe(1620);
      expect(report.timing.unspecifiedTimeItemCount).toBe(2);
      expect(report.timing.unspecifiedTimeItemIds).toEqual([
        'step-mix-8-unspec-1',
        'step-mix-9-unspec-2',
      ]);
      expect(report.timing.isPartialTotal).toBe(true);
      expect(report.timing.exactTargetMatch).toBe(false);
      expect(report.timing.headlineKo).toContain('27분');
      expect(report.timing.headlineKo).toContain('2개');

      // Laterality findings: unpaired left, split time difference, split reps difference, unilateral together mismatch
      const issueCodes = report.issues.map((issue) => issue.code);
      expect(issueCodes).toContain('unspecified-item-duration');
      expect(issueCodes).toContain('laterality-unpaired-side');
      expect(issueCodes).toContain('laterality-time-difference');
      expect(issueCodes).toContain('laterality-reps-or-sets-difference');
      expect(issueCodes).toContain('laterality-unilateral-together-mismatch');

      expect(report.laterality.unpairedLeftItemIds).toContain('step-mix-4-unpaired-left');
      expect(report.laterality.unilateralTogetherMismatchItemIds).toContain(
        'step-mix-7-unilateral-together',
      );
    });

    it('derives known duration from a valid StepTimeEstimate fallback when durationMin is omitted', () => {
      const timeEstimate = {
        version: 1 as const,
        repetitions: 8,
        sets: 2,
        sides: 2 as const,
        secondsPerRep: 4,
        holdSecPerRep: 1,
        breathsPerSet: 2,
        secondsPerBreath: 5,
        restBetweenSetsSec: 15,
        sideSwitchSec: 10,
        explanationSec: 20,
        transitionSec: 10,
      };
      const expectedEstimate = calculateStepTimeEstimate(timeEstimate);
      expect(expectedEstimate.success).toBe(true);
      if (!expectedEstimate.success) return;

      const report = reviewClassPlan({
        id: 'seq-estimate-fallback',
        title: '시간 추정값 폴백 검증',
        targetMinutes: 5,
        steps: [
          {
            stepId: 'step-with-estimate',
            nameKo: '리포머 런지 추정 시간 동작',
            durationMin: undefined,
            sideMode: 'left-then-right',
            timeEstimate,
          },
        ],
      });

      const item = report.plan.items[0];
      expect(item.durationStatus).toBe('known');
      expect(item.usedTimeEstimateFallback).toBe(true);
      expect(item.knownTotalSec).toBe(expectedEstimate.totalSec);
      expect(item.knownExplanationSec).toBe(20);
      expect(item.knownTransitionSec).toBe(10);
    });
  });

  describe('3. Name-only creative movement drafts', () => {
    it('reviews name-only and minimal human drafts cleanly without requiring anatomy, classification, or health data', () => {
      const report = reviewClassPlan(SYNTHETIC_NAME_ONLY_DRAFT_FIXTURE, {
        humanDrafts: SYNTHETIC_MINIMAL_HUMAN_DRAFTS,
      });

      expect(report.counts.totalItems).toBe(5);
      expect(report.counts.creativeDraftItems).toBeGreaterThanOrEqual(4);
      expect(report.counts.nameOnlyDraftItems).toBeGreaterThanOrEqual(3);

      const draft1 = report.plan.items.find((i) => i.itemId === 'draft-step-1');
      expect(draft1?.displayNameKo).toBe('갈비뼈 호흡 서클 초안');
      expect(draft1?.isNameOnlyDraft).toBe(true);
      expect(draft1?.durationStatus).toBe('unspecified');
      expect(draft1?.knownTotalSec).toBeNull();
      expect(draft1?.lateralityStatus).toBe('unknown');

      const draft2 = report.plan.items.find((i) => i.itemId === 'draft-step-2');
      expect(draft2?.displayNameKo).toBe('스트랩 잡고 한쪽 다리 롱 서클');
      expect(draft2?.durationStatus).toBe('known');
      expect(draft2?.knownTotalSec).toBe(300);
      // Must NOT arbitrarily guess left or right when sideMode/isUnilateral are absent
      expect(draft2?.lateralityStatus).toBe('unknown');

      const draft3 = report.plan.items.find((i) => i.itemId === 'draft-step-3');
      expect(draft3?.lateralityStatus).toBe('both-sequential');
      expect(draft3?.knownTotalSec).toBe(360);
      expect(draft3?.knownPerSideSec).toBe(180);

      const draft4 = report.plan.items.find((i) => i.itemId === 'draft-step-4');
      expect(draft4?.isHumanCreated).toBe(true);
      expect(draft4?.displayNameKo).toContain('미니볼 끼고 흉곽 호흡 서클 연습');
      expect(draft4?.knownTotalSec).toBe(240);

      // Should not report unknown-catalog-exercise for creative drafts
      expect(report.issues.some((i) => i.code === 'unknown-catalog-exercise')).toBe(false);
    });
  });

  describe('4. Empty class plan & reusable block review', () => {
    it('handles an empty sequence gracefully with empty-class-plan notice', () => {
      const report = reviewClassPlan(SYNTHETIC_EMPTY_CLASS_FIXTURE);

      expect(report.counts.totalItems).toBe(0);
      expect(report.timing.knownTotalSec).toBe(0);
      expect(report.timing.exactTargetMatch).toBe(false);
      expect(report.issues.some((issue) => issue.code === 'empty-class-plan')).toBe(true);
    });

    it('adapts and reviews a ReusableBlock and a ClassSequenceSnapshot', () => {
      const blockPlan = adaptReusableBlockForReview(SYNTHETIC_REUSABLE_BLOCK_FIXTURE, {
        targetMinutes: 15,
      });
      const blockReport = analyzeNormalizedClassPlan(blockPlan, { targetMinutes: 15 });

      expect(blockReport.plan.sourceModelKind).toBe('reusable-block');
      expect(blockReport.timing.knownTotalSec).toBe(900);
      expect(blockReport.timing.exactTargetMatch).toBe(true);

      const snapshot: ClassSequenceSnapshot = {
        snapshotId: 'snap-test-1',
        capturedAt: '2026-04-10T12:00:00.000Z',
        sourceSequenceId: SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE.id,
        sourceSequenceVersion: 1,
        title: SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE.title,
        subtitle: SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE.subtitle,
        apparatus: 'reformer',
        level: '1.5',
        targetMinutes: 30,
        steps: SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE.steps,
        exerciseSnapshots: {},
        blockSnapshots: [],
        timeBreakdown: {
          movementSec: 1410,
          explanationSec: 120,
          transitionSec: 150,
          restSec: 120,
          totalSec: 1800,
        },
      };
      const snapshotPlan = adaptClassSnapshotForReview(snapshot);
      expect(snapshotPlan.sourceModelKind).toBe('class-snapshot');
      expect(snapshotPlan.items).toHaveLength(8);
    });
  });

  describe('5. Oversized, corrupted, negative/NaN/Infinity, deep nesting, and circular inputs', () => {
    it('diagnoses corrupted durations, repetitions, sets, targetMinutes, duplicate IDs, and malformed steps without throwing', () => {
      const report = reviewClassPlan(SYNTHETIC_CORRUPTED_INPUT_FIXTURE);

      expect(report.timing.targetDurationStatus).toBe('invalid');
      expect(report.timing.targetSec).toBeNull();
      expect(report.timing.invalidTimeItemCount).toBeGreaterThanOrEqual(6);
      expect(report.plan.stats.skippedMalformedCount).toBe(2);

      const codes = new Set(report.issues.map((i) => i.code));
      expect(codes.has('invalid-target-duration')).toBe(true);
      expect(codes.has('invalid-item-duration')).toBe(true);
      expect(codes.has('rest-duration-invalid')).toBe(true);
      expect(codes.has('invalid-repetition-or-set')).toBe(true);
      expect(codes.has('invalid-side-mode')).toBe(true);
      expect(codes.has('duplicate-or-missing-item-id')).toBe(true);
      expect(codes.has('unknown-catalog-exercise')).toBe(true);
      expect(codes.has('malformed-item-skipped')).toBe(true);

      // Every item ID in normalized plan must be unique even when input had duplicates/empty IDs
      const ids = report.plan.items.map((item) => item.itemId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('enforces MAX_NESTING_DEPTH on deeply nested containers', () => {
      const deepFixture = createDeeplyNestedReviewFixture(22);
      const report = reviewClassPlan(deepFixture);

      expect(report.plan.stats.maxDepthReached).toBeGreaterThan(
        CLASS_PLAN_REVIEW_LIMITS.MAX_NESTING_DEPTH,
      );
      expect(report.issues.some((i) => i.code === 'max-nesting-depth-exceeded')).toBe(true);
    });

    it('detects circular container references without infinite recursion', () => {
      const circularFixture = createCircularReviewFixture();
      const report = reviewClassPlan(circularFixture);

      expect(report.plan.stats.circularReferenceCount).toBeGreaterThanOrEqual(1);
      expect(report.issues.some((i) => i.code === 'circular-reference-detected')).toBe(true);
      expect(report.counts.totalItems).toBe(2);
    });

    it('truncates oversized inputs exceeding MAX_ITEMS in bounded time', () => {
      const oversizedFixture = createOversizedReviewFixture(1200);
      const report = reviewClassPlan(oversizedFixture);

      expect(report.plan.items).toHaveLength(CLASS_PLAN_REVIEW_LIMITS.MAX_ITEMS);
      expect(report.plan.stats.truncatedByMaxItems).toBe(true);
      expect(report.issues.some((i) => i.code === 'max-item-count-exceeded')).toBe(true);
    });
  });

  describe('6. Input immutability & 7. Deterministic output', () => {
    it('never mutates or auto-fixes frozen input objects across normal, draft, and corrupted fixtures', () => {
      const inputs = [
        structuredClone(SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE),
        structuredClone(SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE),
        structuredClone(SYNTHETIC_NAME_ONLY_DRAFT_FIXTURE),
        structuredClone(SYNTHETIC_CORRUPTED_INPUT_FIXTURE),
      ];

      for (const input of inputs) {
        const beforeJson = JSON.stringify(input);
        deepFreeze(input);
        expect(() => reviewClassPlan(input)).not.toThrow();
        const afterJson = JSON.stringify(input);
        expect(afterJson).toBe(beforeJson);
      }
    });

    it('returns deterministic, deep-equal reports across repeated executions', () => {
      const first = reviewClassPlan(SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE);
      const second = reviewClassPlan(SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE);
      const third = reviewClassPlan(SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE);

      expect(first).toEqual(second);
      expect(second).toEqual(third);
    });
  });

  describe('8. Parity with existing read-only sequence utilities', () => {
    it('matches getStepTiming, getSequenceDurations, calculateSequenceTimeBreakdown, and buildPlanInsights on 30-min and 50-min sequences', () => {
      for (const sequence of [
        SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE,
        SYNTHETIC_50MIN_NORMAL_CLASS_FIXTURE,
      ]) {
        const report = reviewClassPlan(sequence, { exercises: INITIAL_EXERCISES });
        const durations = getSequenceDurations(sequence.steps);
        const breakdown = calculateSequenceTimeBreakdown(
          sequence.steps,
          INITIAL_EXERCISES,
          sequence.targetMinutes,
        );
        const insights = buildPlanInsights(sequence.steps, INITIAL_EXERCISES);
        const parity = checkExistingUtilityParity(
          sequence.steps,
          INITIAL_EXERCISES,
          sequence.targetMinutes,
        );

        expect(parity.checked).toBe(true);
        expect(parity.stepTimingMatches).toBe(true);
        expect(parity.sequenceDurationsMatches).toBe(true);
        expect(parity.planInsightsSidesMatches).toBe(true);

        expect(report.timing.knownTotalSec).toBe(durations.totalSec);
        expect(report.timing.knownExerciseSec).toBe(durations.exerciseSec);
        expect(report.timing.knownRestSec).toBe(durations.restSec);

        expect(report.timing.knownMovementSec).toBe(breakdown.movementSec);
        expect(report.timing.knownExplanationSec).toBe(breakdown.explanationSec);
        expect(report.timing.knownTransitionSec).toBe(breakdown.transitionSec);
        expect(report.timing.knownDeltaSec).toBe(breakdown.deltaSec);

        expect(report.laterality.knownLeftMovementSec).toBe(insights.sides.leftSec);
        expect(report.laterality.knownRightMovementSec).toBe(insights.sides.rightSec);
        expect(report.laterality.knownTogetherMovementSec).toBe(insights.sides.togetherSec);

        sequence.steps.forEach((step: SequenceStep, idx: number) => {
          const catalogEx = INITIAL_EXERCISES.find((ex) => ex.id === step.exerciseId);
          const stepTiming = getStepTiming(step, catalogEx);
          const item = report.plan.items[idx];
          expect(item.knownTotalSec).toBe(stepTiming.totalSec);
          expect(item.knownMovementSec).toBe(stepTiming.movementSec);
        });
      }
    });

    it('supports direct helper adapters and Korean duration formatting', () => {
      const savedPlan = adaptSavedSequenceForReview(SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE);
      const stepsPlan = adaptSequenceStepsForReview(SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE.steps, {
        planId: 'custom-steps-plan',
        title: '단계 배열 직접 검토',
        targetMinutes: 30,
      });
      const genericPlan = adaptClassPlanForReview(SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE.steps, {
        targetMinutes: 30,
      });

      expect(savedPlan.items).toHaveLength(8);
      expect(stepsPlan.items).toHaveLength(8);
      expect(genericPlan.items).toHaveLength(8);

      expect(formatReviewDurationKo(null)).toContain('시간 미정');
      expect(formatReviewDurationKo(0)).toBe('0초');
      expect(formatReviewDurationKo(45)).toBe('45초');
      expect(formatReviewDurationKo(180)).toBe('3분');
      expect(formatReviewDurationKo(195)).toBe('3분 15초');
    });
  });
});
