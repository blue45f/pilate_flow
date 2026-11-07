import { describe, expect, it } from 'vitest';
import {
  OFFLINE_BLOCK_PRESETS,
  OFFLINE_CLASS_PRESETS,
  PRESET_THEME_CATALOG,
} from '../../data/classBlockPresets';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { ApparatusType, ClassHistoryLog, SequenceStep } from '../../types/pilates';
import { inspectUnverifiedHealthOrRehabClaims } from '../../utils/classBlockPresetValidator';
import { isExerciseAuthoringEligible } from '../../utils/exerciseAuthoring';
import {
  getSequenceDurations,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../../utils/sequenceEngine';
import { calculateSequenceTimeBreakdown } from '../../utils/sequenceValidation';
import {
  DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY,
  PRESET_SUGGESTION_FIXTURE_PRESETS,
  PRESET_SUGGESTION_LIMITS,
  SYNTHETIC_CADILLAC_25MIN_CUSTOM_REQUEST,
  SYNTHETIC_REFORMER_40MIN_WITH_REST_REQUEST,
  SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST,
  evaluatePresetTargetFeasibility,
  instantiateSuggestedCandidateAsEditableDraft,
  suggestPresetCandidates,
  type PresetCandidateSourceTier,
  type PresetSuggestionCandidate,
} from './index';

const CATALOG_MAP = new Map(INITIAL_EXERCISES.map((ex) => [ex.id, ex]));

function assertCandidateParityAndContracts(
  candidate: PresetSuggestionCandidate,
  expectedTargetMinutes: number,
  expectedRestMinutes = 0,
): void {
  expect(Object.isFrozen(candidate)).toBe(true);
  expect(Object.isFrozen(candidate.steps)).toBe(true);
  expect(Object.isFrozen(candidate.stepDetails)).toBe(true);
  expect(Object.isFrozen(candidate.timing)).toBe(true);
  expect(Object.isFrozen(candidate.unilateral)).toBe(true);
  expect(Object.isFrozen(candidate.sequenceDraft)).toBe(true);
  expect(Object.isFrozen(candidate.conditionTemplate)).toBe(true);
  expect(Object.isFrozen(candidate.truthBoundary)).toBe(true);

  // 1. Every non-rest step references an existing, authoring-eligible catalog exercise
  const nonRestSteps = candidate.steps.filter((s) => !isRestStep(s));
  expect(nonRestSteps.length).toBeGreaterThan(0);
  expect(candidate.verifiedExerciseIds.length).toBe(nonRestSteps.length);

  for (const step of nonRestSteps) {
    const exercise = CATALOG_MAP.get(step.exerciseId);
    expect(exercise).toBeDefined();
    expect(isExerciseAuthoringEligible(exercise!)).toBe(true);
    expect(step.exerciseSnapshot?.id).toBe(exercise!.id);
    if (exercise!.isUnilateral) {
      expect(step.sideMode).not.toBe('together');
    }
  }

  // 2. Step-by-step timing & side label parity with getStepTiming & getStepSideLabels
  expect(candidate.stepDetails.length).toBe(candidate.steps.length);
  candidate.steps.forEach((step, idx) => {
    const detail = candidate.stepDetails[idx];
    const exercise = isRestStep(step) ? undefined : CATALOG_MAP.get(step.exerciseId);
    const expectedTiming = getStepTiming(step, exercise);
    const expectedSideLabels = getStepSideLabels(step, exercise);

    expect(detail.stepId).toBe(step.stepId);
    expect(detail.order).toBe(idx + 1);
    expect(detail.totalSec).toBe(expectedTiming.totalSec);
    expect(detail.movementSec).toBe(expectedTiming.movementSec);
    expect(detail.perSideSec).toBe(expectedTiming.perSideSec);
    expect(detail.sides).toBe(expectedTiming.sides);
    expect(detail.explanationSec).toBe(expectedTiming.explanationSec);
    expect(detail.transitionSec).toBe(expectedTiming.transitionSec);
    expect(detail.sideLabelsKo).toEqual(expectedSideLabels);

    if (isRestStep(step)) {
      expect(detail.kind).toBe('rest');
      expect(detail.restSec).toBe(expectedTiming.totalSec);
      expect(detail.movementSec).toBe(0);
    } else {
      expect(detail.kind).toBe('exercise');
      expect(detail.restSec).toBe(0);
      expect(detail.totalSec).toBeGreaterThanOrEqual(PRESET_SUGGESTION_LIMITS.MIN_STEP_TOTAL_SEC);
      expect(detail.totalSec).toBeLessThanOrEqual(PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC);
      expect(detail.movementSec).toBeGreaterThanOrEqual(PRESET_SUGGESTION_LIMITS.MIN_MOVEMENT_SEC);
      if (detail.sides === 2) {
        expect(detail.perSideSec).toBeGreaterThanOrEqual(PRESET_SUGGESTION_LIMITS.MIN_PER_SIDE_SEC);
      }
    }
  });

  // 3. Sequence duration parity with getSequenceDurations & calculateSequenceTimeBreakdown
  const mutableSteps = candidate.steps.map((s) => ({ ...s })) as SequenceStep[];
  const seqDurations = getSequenceDurations(mutableSteps);
  const timeBreakdown = calculateSequenceTimeBreakdown(
    candidate.steps,
    INITIAL_EXERCISES,
    expectedTargetMinutes,
  );

  const expectedTargetSec = Math.round(expectedTargetMinutes * 60);
  const expectedRestSec = Math.round(expectedRestMinutes * 60);

  expect(candidate.timing.targetMinutes).toBe(expectedTargetMinutes);
  expect(candidate.timing.targetSec).toBe(expectedTargetSec);
  expect(candidate.timing.totalSec).toBe(expectedTargetSec);
  expect(candidate.timing.deltaSec).toBe(0);
  expect(candidate.timing.exactTargetMatch).toBe(true);
  expect(candidate.timing.withinStepDurationBounds).toBe(true);

  expect(candidate.timing.totalSec).toBe(seqDurations.totalSec);
  expect(candidate.timing.exerciseSec).toBe(seqDurations.exerciseSec);
  expect(candidate.timing.restSec).toBe(seqDurations.restSec);
  expect(candidate.timing.restSec).toBe(expectedRestSec);

  expect(candidate.timing.totalSec).toBe(timeBreakdown.totalSec);
  expect(candidate.timing.exerciseSec).toBe(timeBreakdown.exerciseSec);
  expect(candidate.timing.restSec).toBe(timeBreakdown.restSec);
  expect(candidate.timing.movementSec).toBe(timeBreakdown.movementSec);
  expect(candidate.timing.explanationSec).toBe(timeBreakdown.explanationSec);
  expect(candidate.timing.transitionSec).toBe(timeBreakdown.transitionSec);
  expect(candidate.timing.deltaSec).toBe(timeBreakdown.deltaSec);

  // 4. Unilateral balance verification
  expect(candidate.unilateral.unilateralBalanced).toBe(true);
  expect(candidate.unilateral.leftTotalSec).toBe(candidate.unilateral.rightTotalSec);
  expect(candidate.unilateral.leftRightDiffSec).toBe(0);
  expect(candidate.unilateral.imbalancedExerciseIds).toEqual([]);
  expect(candidate.unilateral.unilateralTogetherMismatchIds).toEqual([]);

  // 5. Truthfulness & non-AI / non-clinical boundary verification
  expect(candidate.truthBoundary).toEqual(DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY);
  expect(candidate.truthBoundary.aiUsed).toBe(false);
  expect(candidate.truthBoundary.isAiGenerated).toBe(false);
  expect(candidate.truthBoundary.clinicalSafetyGuaranteed).toBe(false);
  expect(candidate.truthBoundary.medicalOrRehabEfficacyClaimed).toBe(false);
  expect(candidate.truthBoundary.anatomicalVerificationCompleted).toBe(false);
  expect(candidate.truthBoundary.expertClinicalVerified).toBe(false);
  expect(candidate.truthBoundary.newMovementInvented).toBe(false);
  expect(candidate.truthBoundary.newEvidenceOrAngleInvented).toBe(false);
  expect(candidate.truthBoundary.catalogIdsOnly).toBe(true);
  expect(candidate.truthBoundary.isEditableDraft).toBe(true);

  const claimCheck = inspectUnverifiedHealthOrRehabClaims(
    [
      candidate.titleKo,
      candidate.subtitleKo,
      candidate.rationaleKo,
      candidate.editingGuideKo,
      candidate.unilateral.summaryKo,
      candidate.truthBoundary.disclaimerKo,
    ].join(' '),
  );
  expect(claimCheck.safe).toBe(true);
  expect(claimCheck.matchedClaims).toEqual([]);
}

describe('presetSuggestionEngine — Deterministic Repeatability & Core Contracts', () => {
  it('returns deeply equal and deeply frozen results when called repeatedly with identical inputs', () => {
    const request = {
      apparatus: 'reformer' as const,
      theme: 'full-body-flow' as const,
      targetMinutes: 50,
      restMinutes: 0,
      level: '1.5' as const,
      referenceDateIso: '2026-11-06T09:00:00.000Z',
    };

    const resultA = suggestPresetCandidates(request);
    const resultB = suggestPresetCandidates(request);

    expect(resultA).toEqual(resultB);
    expect(resultA.status).toBe('ready');
    expect(Object.isFrozen(resultA)).toBe(true);
    expect(Object.isFrozen(resultA.normalizedInput)).toBe(true);
    expect(Object.isFrozen(resultA.feasibility)).toBe(true);
    expect(Object.isFrozen(resultA.candidates)).toBe(true);
    expect(Object.isFrozen(resultA.issues)).toBe(true);
    expect(Object.isFrozen(resultA.truthBoundary)).toBe(true);
    expect(Object.isFrozen(request)).toBe(false);

    for (const candidate of resultA.candidates) {
      assertCandidateParityAndContracts(candidate, 50, 0);
    }
  });

  it('produces all 4 candidate source tiers across exact and custom duration requests', () => {
    // 1. Exact class preset request with maxCandidates: 5 returns all 4 tiers (exact, adapted, block assembly, catalog)
    const exactRes = suggestPresetCandidates({
      ...SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST,
      maxCandidates: 5,
    });
    expect(exactRes.status).toBe('ready');
    const exactTiers = new Set<PresetCandidateSourceTier>(
      exactRes.candidates.map((c) => c.sourceTier),
    );
    expect(exactTiers.has('offline-class-preset-exact')).toBe(true);
    expect(exactTiers.has('offline-block-preset-assembly')).toBe(true);
    expect(exactTiers.has('catalog-deterministic-composition')).toBe(true);

    // 2. Adapted class preset request (Reformer 40m with 3m Rest) -> Tier 1 adapted, Tier 2 block assembly, Tier 3 catalog
    const adaptedRes = suggestPresetCandidates({
      ...SYNTHETIC_REFORMER_40MIN_WITH_REST_REQUEST,
      maxCandidates: 5,
    });
    expect(adaptedRes.status).toBe('ready');
    const adaptedTiers = new Set<PresetCandidateSourceTier>(
      adaptedRes.candidates.map((c) => c.sourceTier),
    );
    expect(adaptedTiers.has('offline-class-preset-adapted')).toBe(true);
    expect(adaptedTiers.has('offline-block-preset-assembly')).toBe(true);
    expect(adaptedTiers.has('catalog-deterministic-composition')).toBe(true);

    for (const cand of adaptedRes.candidates) {
      assertCandidateParityAndContracts(cand, 40, 3);
    }

    // 3. Cadillac 25m custom duration request
    const cadillacRes = suggestPresetCandidates(SYNTHETIC_CADILLAC_25MIN_CUSTOM_REQUEST);
    expect(cadillacRes.status).toBe('ready');
    for (const cand of cadillacRes.candidates) {
      assertCandidateParityAndContracts(cand, 25, 0);
    }
  });

  it('covers all apparatus types (mat, reformer, cadillac, chair, barrel, mixed)', () => {
    const apparatusList: Array<ApparatusType | 'mixed'> = [
      'mat',
      'reformer',
      'cadillac',
      'chair',
      'barrel',
      'mixed',
    ];

    for (const apparatus of apparatusList) {
      const result = suggestPresetCandidates({
        apparatus,
        theme: 'full-body-flow',
        targetMinutes: 30,
        restMinutes: 0,
        level: '2.0',
      });

      expect(result.status).toBe('ready');
      expect(result.feasibility.feasible).toBe(true);
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.recommendedCandidate).not.toBeNull();

      for (const candidate of result.candidates) {
        expect(candidate.apparatus).toBe(apparatus);
        assertCandidateParityAndContracts(candidate, 30, 0);
        if (apparatus !== 'mixed') {
          for (const detail of candidate.stepDetails) {
            if (detail.kind === 'exercise') {
              expect(detail.apparatus).toBe(apparatus);
            }
          }
        }
      }
    }
  });

  it('covers all 7 preset themes in PRESET_THEME_CATALOG', () => {
    expect(PRESET_THEME_CATALOG.length).toBe(7);

    for (const themeMeta of PRESET_THEME_CATALOG) {
      const result = suggestPresetCandidates({
        apparatus: 'reformer',
        theme: themeMeta.id,
        targetMinutes: 45,
        restMinutes: 0,
        level: '1.5',
      });

      expect(result.status).toBe('ready');
      expect(result.normalizedInput.theme).toBe(themeMeta.id);
      expect(result.normalizedInput.focusPreset).toBe(themeMeta.defaultFocusPreset);
      expect(result.candidates.length).toBeGreaterThan(0);

      for (const candidate of result.candidates) {
        expect(candidate.theme).toBe(themeMeta.id);
        expect(candidate.themeLabelKo).toBe(themeMeta.labelKo);
        assertCandidateParityAndContracts(candidate, 45, 0);
      }
    }
  });

  it('covers standard preset durations (15, 20, 30, 45, 50, 60m) and custom non-preset durations (12, 25, 40, 75m)', () => {
    const durations = [15, 20, 30, 45, 50, 60, 12, 25, 40, 75];

    for (const targetMinutes of durations) {
      const result = suggestPresetCandidates({
        apparatus: 'reformer',
        theme: 'core-spinal-control',
        targetMinutes,
        restMinutes: 0,
        level: '2.0',
      });

      expect(result.status).toBe('ready');
      expect(result.feasibility.feasible).toBe(true);
      expect(result.feasibility.targetMinutes).toBe(targetMinutes);
      expect(result.feasibility.targetSec).toBe(targetMinutes * 60);
      expect(result.candidates.length).toBeGreaterThan(0);

      for (const candidate of result.candidates) {
        assertCandidateParityAndContracts(candidate, targetMinutes, 0);
      }
    }
  });

  it('covers optional restMinutes (0, 2, 3, 5) as part of total targetMinutes without drift', () => {
    const restOptions = [0, 2, 3, 5];

    for (const restMinutes of restOptions) {
      const targetMinutes = 30;
      const result = suggestPresetCandidates({
        apparatus: 'mat',
        theme: 'breath-pelvic-foundation',
        targetMinutes,
        restMinutes,
        level: '1.5',
      });

      expect(result.status).toBe('ready');
      expect(result.feasibility.feasible).toBe(true);
      expect(result.feasibility.totalRestSec).toBe(restMinutes * 60);

      for (const candidate of result.candidates) {
        assertCandidateParityAndContracts(candidate, targetMinutes, restMinutes);
        const restSteps = candidate.steps.filter(isRestStep);
        if (restMinutes === 0) {
          expect(restSteps.length).toBe(0);
        } else {
          expect(restSteps.length).toBe(1);
          expect(Math.round(restSteps[0].durationMin * 60)).toBe(restMinutes * 60);
        }
      }
    }
  });

  it('adapts caller-supplied seedPlan steps while preserving locked steps and fitting unlocked steps', () => {
    const result = suggestPresetCandidates({
      apparatus: 'reformer',
      theme: 'lower-glute-balance',
      targetMinutes: 25,
      restMinutes: 2,
      level: '1.5',
      seedPlan: {
        steps: [
          {
            stepId: 'locked-warmup-1',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            blockCategory: 'warmup',
            durationMin: 4,
            explanationSec: 20,
            transitionSec: 0,
            sideMode: 'together',
            instructorNote: '강사 고정 워밍업 노트',
            locked: true,
          },
          {
            stepId: 'unlocked-footwork-2',
            kind: 'exercise',
            exerciseId: 'ex-footwork-01',
            blockCategory: 'footwork',
            durationMin: 6,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'together',
            locked: false,
          },
          {
            stepId: 'unlocked-scooter-3',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            blockCategory: 'lower-body',
            durationMin: 7,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left-then-right',
            locked: false,
          },
          {
            stepId: 'unlocked-cooldown-4',
            kind: 'exercise',
            exerciseId: 'ex-cooldown-01',
            blockCategory: 'cooldown',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left-then-right',
            locked: false,
          },
        ],
      },
    });

    expect(result.status).toBe('ready');
    expect(result.candidates.length).toBe(1);
    const candidate = result.recommendedCandidate!;
    expect(candidate.sourceTier).toBe('catalog-deterministic-composition');
    assertCandidateParityAndContracts(candidate, 25, 2);

    const lockedStep = candidate.steps.find((s) => s.stepId === 'locked-warmup-1');
    expect(lockedStep).toBeDefined();
    expect(lockedStep?.locked).toBe(true);
    expect(lockedStep?.durationMin).toBe(4);
    expect(lockedStep?.instructorNote).toBe('강사 고정 워밍업 노트');
  });

  it('maintains split left/right parity even when adapting split seed steps to an odd-second budget', () => {
    const result = suggestPresetCandidates({
      apparatus: 'reformer',
      theme: 'lower-glute-balance',
      targetMinutes: 20,
      restMinutes: 0,
      level: '1.5',
      seedPlan: {
        steps: [
          {
            stepId: 'split-warmup',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            blockCategory: 'warmup',
            durationMin: 4,
            explanationSec: 20,
            transitionSec: 0,
            sideMode: 'together',
          },
          {
            stepId: 'split-scooter-left',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            blockCategory: 'lower-body',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left',
            repetitions: 8,
            sets: 2,
          },
          {
            stepId: 'split-scooter-right',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            blockCategory: 'lower-body',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'right',
            repetitions: 8,
            sets: 2,
          },
          {
            stepId: 'split-cooldown',
            kind: 'exercise',
            exerciseId: 'ex-cooldown-01',
            blockCategory: 'cooldown',
            durationMin: 3,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left-then-right',
          },
        ],
      },
    });

    expect(result.status).toBe('ready');
    const candidate = result.recommendedCandidate!;
    assertCandidateParityAndContracts(candidate, 20, 0);
    expect(candidate.unilateral.splitLeftStepCount).toBe(1);
    expect(candidate.unilateral.splitRightStepCount).toBe(1);
    expect(candidate.unilateral.leftTotalSec).toBe(candidate.unilateral.rightTotalSec);
  });

  it('penalizes recently taught exercises from historyLogs within excludeDaysWindow', () => {
    const referenceDateIso = '2026-11-06T09:00:00.000Z';
    const baseResult = suggestPresetCandidates({
      apparatus: 'reformer',
      theme: 'core-spinal-control',
      targetMinutes: 25,
      level: '1.5',
      classPresets: [],
      blockPresets: [],
      referenceDateIso,
    });
    expect(baseResult.status).toBe('ready');
    const baselineExerciseIds = baseResult.recommendedCandidate!.verifiedExerciseIds;

    const historyLogs: ClassHistoryLog[] = [
      {
        id: 'hist-1',
        sequenceId: 'seq-prev',
        sequenceTitle: '이전 수업',
        groupId: 'grp-morning',
        groupName: '오전반',
        taughtAt: '2026-11-04T09:00:00.000Z',
        apparatus: 'reformer',
        level: '1.5',
        exerciseIds: [...baselineExerciseIds],
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '이전 수업 기록',
      },
    ];

    const penalizedResult = suggestPresetCandidates({
      apparatus: 'reformer',
      theme: 'core-spinal-control',
      targetMinutes: 25,
      level: '1.5',
      classPresets: [],
      blockPresets: [],
      targetGroupId: 'grp-morning',
      excludeDaysWindow: 10,
      historyLogs,
      referenceDateIso,
    });

    expect(penalizedResult.status).toBe('ready');
    const nextExerciseIds = penalizedResult.recommendedCandidate!.verifiedExerciseIds;
    expect(nextExerciseIds).not.toEqual(baselineExerciseIds);
  });

  it('produces an unfrozen, isolated editable draft via instantiateSuggestedCandidateAsEditableDraft without mutating candidates or catalogs', () => {
    const catalogSnapshotBefore = JSON.stringify(INITIAL_EXERCISES.slice(0, 5));
    const classPresetSnapshotBefore = JSON.stringify(OFFLINE_CLASS_PRESETS.slice(0, 3));
    const blockPresetSnapshotBefore = JSON.stringify(OFFLINE_BLOCK_PRESETS.slice(0, 3));

    const result = suggestPresetCandidates(SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST);
    expect(result.status).toBe('ready');
    const candidate = result.recommendedCandidate!;
    const candidateSnapshotBefore = JSON.stringify(candidate);

    const editable = instantiateSuggestedCandidateAsEditableDraft(candidate, {
      titleKo: '강사 커스텀 수정 시퀀스',
      subtitleKo: '강사 메모 추가본',
      copyIdSuffix: 'instructor-edit-1',
      nowIso: '2026-11-07T00:00:00.000Z',
    });

    expect(editable.isEditableDraft).toBe(true);
    expect(editable.sourceCandidateId).toBe(candidate.candidateId);
    expect(Object.isFrozen(editable.sequence)).toBe(false);
    expect(Object.isFrozen(editable.steps)).toBe(false);
    expect(Object.isFrozen(editable.steps[0])).toBe(false);
    expect(Object.isFrozen(editable.conditionTemplate)).toBe(false);

    // Mutate the instantiated editable draft heavily
    editable.sequence.title = '완전히 변경된 수업 제목';
    editable.steps[0].durationMin = 12;
    editable.steps[0].instructorNote = '수정된 첫 번째 스텝 노트';
    editable.steps[0].locked = true;
    if (editable.steps[0].exerciseSnapshot) {
      editable.steps[0].exerciseSnapshot.nameKo = '커스텀 스냅샷 명칭';
      editable.steps[0].exerciseSnapshot.cues = [
        ...editable.steps[0].exerciseSnapshot.cues,
        '새로운 큐잉 추가',
      ];
    }
    editable.conditionTemplate.name = '수정된 조건 템플릿 이름';
    editable.conditionTemplate.criteria.availableEquipment = ['reformer', 'cadillac'];

    // Verify zero mutation on the frozen candidate and static catalogs
    expect(JSON.stringify(candidate)).toBe(candidateSnapshotBefore);
    expect(JSON.stringify(INITIAL_EXERCISES.slice(0, 5))).toBe(catalogSnapshotBefore);
    expect(JSON.stringify(OFFLINE_CLASS_PRESETS.slice(0, 3))).toBe(classPresetSnapshotBefore);
    expect(JSON.stringify(OFFLINE_BLOCK_PRESETS.slice(0, 3))).toBe(blockPresetSnapshotBefore);
  });

  it('verifies all 6 fixture presets in PRESET_SUGGESTION_FIXTURE_PRESETS behave deterministically', () => {
    expect(PRESET_SUGGESTION_FIXTURE_PRESETS.length).toBe(6);

    for (const fixture of PRESET_SUGGESTION_FIXTURE_PRESETS) {
      const res1 = suggestPresetCandidates(fixture.request);
      const res2 = suggestPresetCandidates(fixture.request);
      expect(res1).toEqual(res2);

      const feasibilityDirect = evaluatePresetTargetFeasibility(fixture.request);
      expect(feasibilityDirect.feasibility).toEqual(res1.feasibility);

      const headlineSafety = inspectUnverifiedHealthOrRehabClaims(res1.statusHeadlineKo);
      expect(headlineSafety.safe).toBe(true);
    }
  });
});
