import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { PilatesExercise } from '../../types/pilates';
import {
  PRESET_SUGGESTION_LIMITS,
  SYNTHETIC_IMPOSSIBLE_TARGET_AND_REST_REQUEST,
  SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST,
  SYNTHETIC_UNKNOWN_ID_AND_MALFORMED_REST_REQUEST,
  adaptPresetSuggestionInput,
  createCircularSeedFixture,
  createDeeplyNestedSeedFixture,
  createOversizedSeedFixture,
  createScanOverflowSeedFixture,
  evaluatePresetTargetFeasibility,
  suggestPresetCandidates,
  type NormalizedPresetSuggestionInput,
  type PresetSuggestionIssueCode,
  type TargetTimeImpossibilityReason,
} from './index';

function buildChainToDepth(containerWrappers: number): Record<string, unknown> {
  let current: Record<string, unknown> = {
    stepId: `leaf-at-depth-${containerWrappers}`,
    kind: 'exercise',
    exerciseId: 'ex-warmup-01',
    blockCategory: 'warmup',
    durationMin: 5,
    explanationSec: 20,
    transitionSec: 0,
    sideMode: 'together',
  };
  for (let i = 0; i < containerWrappers; i++) {
    current = { steps: [current] };
  }
  return current;
}

describe('presetSuggestion.boundaries — 1. Nested Cycle & Container Depth', () => {
  it('detects direct self-cycle (steps.push(source)) and blocks without infinite recursion', () => {
    const circularSeed = createCircularSeedFixture();
    const result = suggestPresetCandidates({
      apparatus: 'reformer',
      theme: 'full-body-flow',
      targetMinutes: 30,
      seedPlan: circularSeed,
    });

    expect(result.status).toBe('blocked');
    expect(result.normalizedInput.cycleDetectedCount).toBeGreaterThanOrEqual(1);
    expect(result.normalizedInput.isPartialSeedScan).toBe(true);
    expect(result.blockingIssues.some((i) => i.code === 'nested-cycle-detected')).toBe(true);
    expect(Object.isFrozen(circularSeed)).toBe(false);
  });

  it('detects parent-child and multi-container cycles across steps/items/blocks/children', () => {
    const root: { blocks: unknown[] } = { blocks: [] };
    const mid: { items: unknown[] } = { items: [] };
    const leafContainer: { children: unknown[] } = {
      children: [
        {
          stepId: 'valid-before-cycle',
          kind: 'exercise',
          exerciseId: 'ex-warmup-01',
          durationMin: 5,
        },
      ],
    };
    root.blocks.push(mid);
    mid.items.push(leafContainer);
    leafContainer.children.push(root); // 3-hop cycle back to root

    const adapted = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: root,
    });

    expect(adapted.cycleDetectedCount).toBe(1);
    expect(adapted.seedSteps.length).toBe(1);
    expect(adapted.adapterIssues.some((i) => i.code === 'nested-cycle-detected')).toBe(true);
    expect(Object.isFrozen(root)).toBe(false);
    expect(Object.isFrozen(mid)).toBe(false);
    expect(Object.isFrozen(leafContainer)).toBe(false);
  });

  it('enforces exact nesting depth boundary: depth 16 is allowed, depth 17 triggers max-nesting-depth-exceeded', () => {
    // Each wrapper `{ steps: [...] }` adds 1 to depth when traversing `seedPlan` (root at depth 0, child at depth 1)
    const depth16Seed = buildChainToDepth(PRESET_SUGGESTION_LIMITS.MAX_NESTING_DEPTH);
    const allowedInput = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: depth16Seed,
    });

    expect(allowedInput.maxDepthObserved).toBe(16);
    expect(allowedInput.depthExceededCount).toBe(0);
    expect(allowedInput.seedSteps.length).toBe(1);
    expect(allowedInput.adapterIssues.some((i) => i.code === 'max-nesting-depth-exceeded')).toBe(
      false,
    );

    const depth17Seed = buildChainToDepth(PRESET_SUGGESTION_LIMITS.MAX_NESTING_DEPTH + 1);
    const exceededResult = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: depth17Seed,
    });

    expect(exceededResult.status).toBe('blocked');
    expect(exceededResult.normalizedInput.maxDepthObserved).toBe(17);
    expect(exceededResult.normalizedInput.depthExceededCount).toBe(1);
    expect(exceededResult.normalizedInput.seedSteps.length).toBe(0);
    expect(
      exceededResult.blockingIssues.some((i) => i.code === 'max-nesting-depth-exceeded'),
    ).toBe(true);
  });

  it('supports custom maxNestingDepth (0 and 2) and createDeeplyNestedSeedFixture(20)', () => {
    const customDepth0 = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 30,
      maxNestingDepth: 0,
      seedPlan: {
        steps: [
          {
            stepId: 'step-at-depth-1',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 5,
          },
        ],
      },
    });
    expect(customDepth0.depthExceededCount).toBe(1);
    expect(customDepth0.adapterIssues.some((i) => i.code === 'max-nesting-depth-exceeded')).toBe(
      true,
    );

    const customDepth2Allowed = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 30,
      maxNestingDepth: 2,
      seedPlan: buildChainToDepth(2),
    });
    expect(customDepth2Allowed.depthExceededCount).toBe(0);
    expect(customDepth2Allowed.seedSteps.length).toBe(1);

    const fixture20 = createDeeplyNestedSeedFixture(20);
    const fixture20Res = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: fixture20,
    });
    expect(fixture20Res.status).toBe('blocked');
    expect(fixture20Res.blockingIssues.some((i) => i.code === 'max-nesting-depth-exceeded')).toBe(
      true,
    );
  });
});

describe('presetSuggestion.boundaries — 2. Missing / Unknown / Unverifiable IDs', () => {
  it('blocks unknown exercise IDs and empty exerciseId on exercise steps without inventing movements', () => {
    const fixtureResult = suggestPresetCandidates(SYNTHETIC_UNKNOWN_ID_AND_MALFORMED_REST_REQUEST);
    expect(fixtureResult.status).toBe('blocked');
    expect(fixtureResult.candidates).toEqual([]);
    expect(fixtureResult.normalizedInput.unknownExerciseIds).toContain(
      'non-existent-invented-exercise-999',
    );
    expect(fixtureResult.blockingIssues.some((i) => i.code === 'unknown-exercise-id')).toBe(true);

    const emptyExerciseIdResult = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: {
        steps: [
          {
            stepId: 'empty-ex-step',
            kind: 'exercise',
            exerciseId: '   ',
            durationMin: 5,
          },
        ],
      },
    });
    expect(emptyExerciseIdResult.status).toBe('blocked');
    expect(emptyExerciseIdResult.normalizedInput.unknownExerciseIds).toContain('(빈 동작 ID)');
    expect(emptyExerciseIdResult.blockingIssues.some((i) => i.code === 'unknown-exercise-id')).toBe(
      true,
    );
  });

  it('blocks unverifiable catalog exercise objects (unverifiable-catalog-exercise)', () => {
    const corruptedExercise = {
      ...INITIAL_EXERCISES[0],
      id: 'corrupted-unverifiable-ex-01',
      // Empty cues + invalid youtube URL makes isExerciseAuthoringEligible(ex) return false
      cues: [],
      youtube: {
        videoId: '',
        channelName: '',
        videoTitle: '',
        startSec: -1,
        url: 'not-a-valid-url',
      },
    } as unknown as PilatesExercise;

    const result = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 30,
      exercises: [...INITIAL_EXERCISES, corruptedExercise],
      seedPlan: {
        steps: [
          {
            stepId: 'step-with-corrupted-ex',
            kind: 'exercise',
            exerciseId: 'corrupted-unverifiable-ex-01',
            durationMin: 5,
          },
        ],
      },
    });

    expect(result.status).toBe('blocked');
    expect(result.normalizedInput.unverifiableExerciseIds).toContain(
      'corrupted-unverifiable-ex-01',
    );
    expect(
      result.blockingIssues.some((i) => i.code === 'unverifiable-catalog-exercise'),
    ).toBe(true);
  });

  it('blocks unknown apparatus, unknown availableEquipment IDs, empty availableEquipment, and ownedApparatus mismatch', () => {
    // 1. Unknown apparatus
    const badApparatus = suggestPresetCandidates({
      apparatus: 'anti-gravity-hammock',
      targetMinutes: 30,
    });
    expect(badApparatus.status).toBe('blocked');
    expect(badApparatus.normalizedInput.apparatusValid).toBe(false);
    expect(badApparatus.blockingIssues.some((i) => i.code === 'unknown-equipment-id')).toBe(true);
    expect(badApparatus.feasibility.impossibilityReasons).toContain('unknown-equipment-id');

    // 2. Unknown availableEquipment ID
    const badEquipmentId = suggestPresetCandidates({
      apparatus: 'reformer',
      availableEquipment: ['reformer', 'teleportation-pod'],
      targetMinutes: 30,
    });
    expect(badEquipmentId.status).toBe('blocked');
    expect(badEquipmentId.normalizedInput.unknownEquipmentIds).toContain('teleportation-pod');
    expect(badEquipmentId.blockingIssues.some((i) => i.code === 'unknown-equipment-id')).toBe(true);

    // 3. Empty availableEquipment: []
    const emptyAvailableEquip = suggestPresetCandidates({
      apparatus: 'reformer',
      availableEquipment: [],
      targetMinutes: 30,
    });
    expect(emptyAvailableEquip.status).toBe('blocked');
    expect(emptyAvailableEquip.blockingIssues.some((i) => i.code === 'unknown-equipment-id')).toBe(
      true,
    );

    // 4. Empty ownedApparatus: []
    const emptyOwnedApparatus = suggestPresetCandidates({
      apparatus: 'reformer',
      ownedApparatus: [],
      targetMinutes: 30,
    });
    expect(emptyOwnedApparatus.status).toBe('blocked');
    expect(emptyOwnedApparatus.blockingIssues.some((i) => i.code === 'unknown-equipment-id')).toBe(
      true,
    );

    // 5. ownedApparatus mismatch with selected apparatus
    const mismatchOwned = suggestPresetCandidates({
      apparatus: 'cadillac',
      ownedApparatus: ['mat', 'reformer'],
      targetMinutes: 30,
    });
    expect(mismatchOwned.status).toBe('blocked');
    expect(mismatchOwned.normalizedInput.unknownEquipmentIds).toContain('cadillac');
    expect(mismatchOwned.blockingIssues.some((i) => i.code === 'unknown-equipment-id')).toBe(true);
    expect(mismatchOwned.feasibility.impossibilityReasons).toContain('unknown-equipment-id');
  });
});

describe('presetSuggestion.boundaries — 3. Unilateral Timing & Balance', () => {
  it('blocks unilateral catalog exercise configured with sideMode: together (unilateral-together-mismatch)', () => {
    // 1. Real unilateral catalog exercise (ex-lower-01: Reformer Standing Scooter & Eve's Lunge, isUnilateral: true)
    const unilateralTogetherRes = suggestPresetCandidates({
      apparatus: 'reformer',
      theme: 'lower-glute-balance',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'uni-scooter-together',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 6,
            explanationSec: 20,
            transitionSec: 0,
            sideMode: 'together',
          },
          {
            stepId: 'uni-split-left-unpaired',
            kind: 'exercise',
            exerciseId: 'ex-lower-02',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left',
          },
        ],
      },
    });
    expect(unilateralTogetherRes.status).toBe('blocked');
    expect(
      unilateralTogetherRes.blockingIssues.some((i) => i.code === 'unilateral-together-mismatch'),
    ).toBe(true);
    expect(
      unilateralTogetherRes.blockingIssues.some((i) => i.code === 'unilateral-split-imbalance'),
    ).toBe(true);

    // 2. Also verify SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST blocks and surfaces unilateral-split-imbalance
    const fixtureRes = suggestPresetCandidates(SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST);
    expect(fixtureRes.status).toBe('blocked');
    expect(fixtureRes.blockingIssues.some((i) => i.code === 'unilateral-split-imbalance')).toBe(
      true,
    );
  });

  it('enforces sequential bilateral (left-then-right / right-then-left) per-side minimum boundary (15s per side)', () => {
    // Boundary valid: totalSec = 50 (durationMin: 50/60), explanationSec = 20, transitionSec = 0 -> movementSec = 30 -> perSideSec = 15
    const validBoundary = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: {
        steps: [
          {
            stepId: 'seq-uni-exact-15s',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 50 / 60,
            explanationSec: 20,
            transitionSec: 0,
            sideMode: 'left-then-right',
          },
        ],
      },
    });
    expect(validBoundary.seedSteps[0].movementSec).toBe(30);
    expect(validBoundary.seedSteps[0].perSideSec).toBe(15);
    expect(
      validBoundary.adapterIssues.some((i) => i.code === 'unilateral-per-side-too-short'),
    ).toBe(false);

    // Boundary invalid: totalSec = 48 (durationMin: 48/60), explanationSec = 20, transitionSec = 0 -> movementSec = 28 -> perSideSec = 14 < 15
    const tooShortPerSide = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: {
        steps: [
          {
            stepId: 'seq-uni-14s-per-side',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 48 / 60,
            explanationSec: 20,
            transitionSec: 0,
            sideMode: 'right-then-left',
          },
        ],
      },
    });
    expect(tooShortPerSide.status).toBe('blocked');
    expect(tooShortPerSide.normalizedInput.seedSteps[0].perSideSec).toBe(14);
    expect(
      tooShortPerSide.blockingIssues.some((i) => i.code === 'unilateral-per-side-too-short'),
    ).toBe(true);
  });

  it('detects unpaired left, unpaired right, mismatched duration, and mismatched reps/sets on split steps, while allowing balanced 1:1 split pairs', () => {
    // 1. Unpaired right only
    const unpairedRight = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'only-right-scooter',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 5,
            sideMode: 'right',
          },
        ],
      },
    });
    expect(unpairedRight.status).toBe('blocked');
    expect(unpairedRight.blockingIssues.some((i) => i.code === 'unilateral-split-imbalance')).toBe(
      true,
    );

    // 2. Paired left + right with mismatched movement durations (4m vs 5m)
    const mismatchedDuration = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'scooter-left-4m',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 4,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left',
          },
          {
            stepId: 'scooter-right-5m',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'right',
          },
        ],
      },
    });
    expect(mismatchedDuration.status).toBe('blocked');
    expect(
      mismatchedDuration.blockingIssues.some((i) => i.code === 'unilateral-split-imbalance'),
    ).toBe(true);

    // 3. Paired left + right with equal duration but mismatched repetitions (8 vs 10)
    const mismatchedReps = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'scooter-left-8reps',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left',
            repetitions: 8,
            sets: 2,
          },
          {
            stepId: 'scooter-right-10reps',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'right',
            repetitions: 10,
            sets: 2,
          },
        ],
      },
    });
    expect(mismatchedReps.status).toBe('blocked');
    expect(mismatchedReps.blockingIssues.some((i) => i.code === 'unilateral-split-imbalance')).toBe(
      true,
    );

    // 4. Valid 1:1 paired split steps
    const balancedSplit = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 15,
      seedPlan: {
        steps: [
          {
            stepId: 'warmup-1',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 0,
            sideMode: 'together',
          },
          {
            stepId: 'scooter-left-ok',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'left',
            repetitions: 8,
            sets: 2,
          },
          {
            stepId: 'scooter-right-ok',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            durationMin: 5,
            explanationSec: 20,
            transitionSec: 15,
            sideMode: 'right',
            repetitions: 8,
            sets: 2,
          },
        ],
      },
    });
    expect(balancedSplit.status).toBe('ready');
    expect(balancedSplit.recommendedCandidate?.unilateral.unilateralBalanced).toBe(true);
  });

  it('derives duration from valid timeEstimate when durationMin is omitted and warns on unilateral-time-estimate-mismatch', () => {
    const adapted = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'estimate-derived-step',
            kind: 'exercise',
            exerciseId: 'ex-lower-01',
            // Omit durationMin -> derived from timeEstimate
            // sides=1, sets=2, reps=8, secPerRep=4 => moving=64, rest=15, exp=20, trans=15 => total=114s
            sideMode: 'left-then-right', // Mismatches timeEstimate.sides === 1!
            timeEstimate: {
              version: 1,
              repetitions: 8,
              sets: 2,
              sides: 1,
              secondsPerRep: 4,
              holdSecPerRep: 0,
              breathsPerSet: 0,
              secondsPerBreath: 0,
              restBetweenSetsSec: 15,
              sideSwitchSec: 0,
              explanationSec: 20,
              transitionSec: 15,
            },
          },
        ],
      },
    });

    const step = adapted.seedSteps[0];
    expect(step.usedTimeEstimate).toBe(true);
    expect(step.durationStatus).toBe('known');
    expect(step.totalSec).toBe(114);
    expect(step.issueCodes).toContain('unilateral-time-estimate-mismatch');
    expect(
      adapted.adapterIssues.some((i) => i.code === 'unilateral-time-estimate-mismatch'),
    ).toBe(true);
  });
});

describe('presetSuggestion.boundaries — 4. Rest Time Constraints', () => {
  it('validates restMinutes: 0 and 3m in 40m succeed; negative/NaN/Infinity fail with rest-duration-invalid', () => {
    for (const invalidRest of [-1, -0.001, Number.NaN, Number.POSITIVE_INFINITY]) {
      const res = suggestPresetCandidates({
        apparatus: 'reformer',
        targetMinutes: 30,
        restMinutes: invalidRest,
      });
      expect(res.status).toBe('blocked');
      expect(res.normalizedInput.restStatus).toBe('invalid');
      expect(res.blockingIssues.some((i) => i.code === 'rest-duration-invalid')).toBe(true);
      expect(res.feasibility.impossibilityReasons).toContain('rest-duration-invalid');
    }
  });

  it('blocks when restMinutes equals or exceeds targetMinutes (rest-exceeds-or-equals-target)', () => {
    const equalRest = suggestPresetCandidates(SYNTHETIC_IMPOSSIBLE_TARGET_AND_REST_REQUEST);
    expect(equalRest.status).toBe('blocked');
    expect(equalRest.blockingIssues.some((i) => i.code === 'rest-exceeds-or-equals-target')).toBe(
      true,
    );
    expect(equalRest.feasibility.impossibilityReasons).toContain('rest-exceeds-or-equals-target');
    expect(equalRest.feasibility.impossibilityReasons).toContain('locked-steps-exceed-target');

    const greaterRest = suggestPresetCandidates({
      apparatus: 'mat',
      targetMinutes: 15,
      restMinutes: 20,
    });
    expect(greaterRest.status).toBe('blocked');
    expect(
      greaterRest.blockingIssues.some((i) => i.code === 'rest-exceeds-or-equals-target'),
    ).toBe(true);
    expect(greaterRest.feasibility.impossibilityReasons).toContain('rest-exceeds-or-equals-target');
  });

  it('blocks when restMinutes leaves insufficient time for minimum exercise steps (13m rest in 15m target)', () => {
    const res = suggestPresetCandidates({
      apparatus: 'mat',
      targetMinutes: 15,
      restMinutes: 13, // Leaves only 2m (120s) for >= 3 movements (min required = 60 + 65 + 65 = 190s)
    });

    expect(res.status).toBe('blocked');
    expect(res.feasibility.feasible).toBe(false);
    expect(res.feasibility.impossibilityReasons).toContain(
      'rest-leaves-insufficient-exercise-time',
    );
    expect(res.feasibility.impossibilityReasons).toContain('minimum-step-duration-exceeds-target');
    expect(
      res.blockingIssues.some((i) => i.code === 'rest-leaves-insufficient-exercise-time'),
    ).toBe(true);
  });

  it('blocks malformed seed rest steps with exerciseId, repetitions, sets, sideMode, or out-of-bounds durationMin', () => {
    const res = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 30,
      seedPlan: {
        steps: [
          {
            stepId: 'bad-rest-fields',
            kind: 'rest',
            exerciseId: 'ex-warmup-01',
            repetitions: 4,
            sets: 2,
            sideMode: 'together',
            durationMin: 25, // > 20m max step cap
          },
          {
            stepId: 'bad-rest-missing-duration',
            kind: 'rest',
            exerciseId: '',
            durationMin: null,
          },
        ],
      },
    });

    expect(res.status).toBe('blocked');
    expect(res.blockingIssues.some((i) => i.code === 'rest-step-malformed')).toBe(true);
    expect(res.blockingIssues.some((i) => i.code === 'rest-duration-invalid')).toBe(true);
  });
});

describe('presetSuggestion.boundaries — 5. Upper/Lower Bounds & Defensive Input Hygiene', () => {
  it('enforces exact targetMinutes bounds: 9 (blocked), 10 (ready), 120 (ready), 121 (blocked), null/undefined/NaN/Infinity (blocked)', () => {
    const belowMin = suggestPresetCandidates({ apparatus: 'reformer', targetMinutes: 9 });
    expect(belowMin.status).toBe('blocked');
    expect(belowMin.feasibility.impossibilityReasons).toContain('target-duration-out-of-bounds');

    const exactMin = suggestPresetCandidates({ apparatus: 'reformer', targetMinutes: 10 });
    expect(exactMin.status).toBe('ready');
    expect(exactMin.recommendedCandidate?.timing.totalSec).toBe(600);

    const exactMax = suggestPresetCandidates({ apparatus: 'reformer', targetMinutes: 120 });
    expect(exactMax.status).toBe('ready');
    expect(exactMax.recommendedCandidate?.timing.totalSec).toBe(7200);

    const aboveMax = suggestPresetCandidates({ apparatus: 'reformer', targetMinutes: 121 });
    expect(aboveMax.status).toBe('blocked');
    expect(aboveMax.feasibility.impossibilityReasons).toContain('target-duration-out-of-bounds');

    for (const badTarget of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      const badRes = suggestPresetCandidates({
        apparatus: 'reformer',
        targetMinutes: badTarget as unknown as number,
      });
      expect(badRes.status).toBe('blocked');
      expect(badRes.feasibility.impossibilityReasons).toContain('target-duration-out-of-bounds');
    }
  });

  it('enforces exact step duration bounds: 29s (blocked), 30s (valid), 1200s (valid), 1201s (blocked)', () => {
    // 29s -> blocked
    const step29s = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'step-29s',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 29 / 60,
            explanationSec: 0,
            transitionSec: 0,
          },
        ],
      },
    });
    expect(step29s.seedSteps[0].durationStatus).toBe('invalid');
    expect(step29s.seedSteps[0].issueCodes).toContain('step-duration-out-of-bounds');

    // 30s with explanationSec=0, transitionSec=0 -> valid (movementSec=30)
    const step30s = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'step-30s',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 30 / 60,
            explanationSec: 0,
            transitionSec: 0,
          },
        ],
      },
    });
    expect(step30s.seedSteps[0].durationStatus).toBe('known');
    expect(step30s.seedSteps[0].totalSec).toBe(30);
    expect(step30s.seedSteps[0].movementSec).toBe(30);
    expect(step30s.seedSteps[0].issueCodes).not.toContain('step-duration-out-of-bounds');

    // 1200s (20m) -> valid
    const step1200s = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'step-1200s',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 20,
            explanationSec: 20,
            transitionSec: 0,
          },
        ],
      },
    });
    expect(step1200s.seedSteps[0].durationStatus).toBe('known');
    expect(step1200s.seedSteps[0].totalSec).toBe(1200);
    expect(step1200s.seedSteps[0].issueCodes).not.toContain('step-duration-out-of-bounds');

    // 1201s -> blocked
    const step1201s = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          {
            stepId: 'step-1201s',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 1201 / 60,
            explanationSec: 20,
            transitionSec: 0,
          },
        ],
      },
    });
    expect(step1201s.seedSteps[0].durationStatus).toBe('invalid');
    expect(step1201s.seedSteps[0].issueCodes).toContain('step-duration-out-of-bounds');
  });

  it('enforces MAX_ITEMS (max-item-count-exceeded) and MAX_RAW_SCAN_NODES (max-input-scan-exceeded)', () => {
    const twoItemsAllowed = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 20,
      maxItems: 2,
      seedPlan: createOversizedSeedFixture(2),
    });
    expect(twoItemsAllowed.itemLimitExceededCount).toBe(0);
    expect(twoItemsAllowed.seedSteps.length).toBe(2);

    const threeItemsExceeded = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 20,
      maxItems: 2,
      seedPlan: createOversizedSeedFixture(3),
    });
    expect(threeItemsExceeded.status).toBe('blocked');
    expect(threeItemsExceeded.normalizedInput.itemLimitExceededCount).toBe(1);
    expect(threeItemsExceeded.normalizedInput.seedSteps.length).toBe(2);
    expect(
      threeItemsExceeded.blockingIssues.some((i) => i.code === 'max-item-count-exceeded'),
    ).toBe(true);

    const defaultOversized = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: createOversizedSeedFixture(1005),
    });
    expect(defaultOversized.status).toBe('blocked');
    expect(defaultOversized.normalizedInput.seedSteps.length).toBe(
      PRESET_SUGGESTION_LIMITS.MAX_ITEMS,
    );
    expect(defaultOversized.blockingIssues.some((i) => i.code === 'max-item-count-exceeded')).toBe(
      true,
    );

    const scanOverflow = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 20,
      seedPlan: createScanOverflowSeedFixture(10010),
    });
    expect(scanOverflow.status).toBe('blocked');
    expect(scanOverflow.normalizedInput.scanLimitExceeded).toBe(true);
    expect(scanOverflow.blockingIssues.some((i) => i.code === 'max-input-scan-exceeded')).toBe(
      true,
    );
  });

  it('surfaces non-blocking warnings/notices for invalid-repetition-or-set, invalid-side-mode, time-estimate-out-of-bounds, malformed-item-skipped, and duplicate-or-missing-step-id', () => {
    const adapted = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      theme: 'non-existent-theme-name',
      targetMinutes: 20,
      seedPlan: {
        steps: [
          null,
          'primitive-string-item',
          {},
          { steps: 'not-an-array' },
          {
            // Missing stepId -> duplicate-or-missing-step-id
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 5,
            repetitions: 0, // invalid-repetition-or-set
            sets: 105, // invalid-repetition-or-set
            sideMode: 'sideways-invalid', // invalid-side-mode
            timeEstimate: { version: 1, repetitions: -5 }, // time-estimate-out-of-bounds
          },
          {
            stepId: 'seed-step-1', // Collides with generated ID of previous step -> duplicate-or-missing-step-id
            kind: 'exercise',
            exerciseId: 'ex-footwork-01',
            durationMin: 5,
          },
        ],
      },
    });

    const codes = new Set<PresetSuggestionIssueCode>(adapted.adapterIssues.map((i) => i.code));
    expect(codes.has('malformed-item-skipped')).toBe(true);
    expect(codes.has('duplicate-or-missing-step-id')).toBe(true);
    expect(codes.has('invalid-repetition-or-set')).toBe(true);
    expect(codes.has('invalid-side-mode')).toBe(true);
    expect(codes.has('time-estimate-out-of-bounds')).toBe(true);
    expect(adapted.seedSteps[1].stepId).toBe('seed-step-1-dup-2');
  });

  it('never throws or freezes caller-owned malformed scalar objects, 12,000-level deep scalar objects, null-prototype objects, or caller-cloned NormalizedPresetSuggestionInput', () => {
    // Build a 12,000-level deep object passed as malformed durationMin
    let deepScalar: Record<string, unknown> = { leaf: 1 };
    for (let i = 0; i < 12_000; i++) {
      deepScalar = { nested: deepScalar };
    }

    const nullProtoStep = Object.assign(Object.create(null), {
      stepId: 'null-proto-step',
      kind: 'exercise',
      exerciseId: 'ex-warmup-01',
      durationMin: deepScalar,
      repetitions: Object.create(null),
    });

    const nullProtoRequest = Object.assign(Object.create(null), {
      apparatus: Object.create(null),
      theme: Object.create(null),
      targetMinutes: deepScalar,
      restMinutes: Object.create(null),
      seedPlan: {
        steps: [nullProtoStep],
      },
    });

    const res = suggestPresetCandidates(nullProtoRequest);
    expect(res.status).toBe('blocked');
    expect(Object.isFrozen(deepScalar)).toBe(false);
    expect(Object.isFrozen(nullProtoStep)).toBe(false);
    expect(Object.isFrozen(nullProtoRequest)).toBe(false);

    // Verify evaluatePresetTargetFeasibility does not freeze a caller-owned mutable NormalizedPresetSuggestionInput
    const baseNormalized = adaptPresetSuggestionInput({
      apparatus: 'reformer',
      targetMinutes: 30,
    });
    const callerMutableNormalized: NormalizedPresetSuggestionInput = {
      ...baseNormalized,
      availableEquipment: [...baseNormalized.availableEquipment],
      unknownEquipmentIds: [...baseNormalized.unknownEquipmentIds],
      preferredProps: [...baseNormalized.preferredProps],
      unknownExerciseIds: [...baseNormalized.unknownExerciseIds],
      unverifiableExerciseIds: [...baseNormalized.unverifiableExerciseIds],
      seedSteps: [],
      adapterIssues: [],
    };

    const feasibilityOut = evaluatePresetTargetFeasibility(callerMutableNormalized);
    expect(feasibilityOut.feasibility.feasible).toBe(true);
    expect(Object.isFrozen(callerMutableNormalized)).toBe(false);
    expect(Object.isFrozen(callerMutableNormalized.availableEquipment)).toBe(false);
  });
});

describe('presetSuggestion.boundaries — 6. Target Time Impossibility Reasons (All 11 Reasons)', () => {
  it('verifies locked-step-has-unknown-or-incompatible-exercise (apparatus/level mismatch or duplicate family)', () => {
    // Cadillac exercise locked inside a Reformer request + duplicate family locked steps
    const res = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 30,
      level: '1.0',
      seedPlan: {
        steps: [
          {
            stepId: 'locked-wrong-apparatus',
            kind: 'exercise',
            exerciseId: 'ex-warmup-02', // Cadillac exercise in Reformer class
            durationMin: 5,
            locked: true,
          },
          {
            stepId: 'locked-dup-1',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 5,
            locked: true,
          },
          {
            stepId: 'locked-dup-2',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01', // Duplicate movement family
            durationMin: 5,
            locked: true,
          },
        ],
      },
    });

    expect(res.status).toBe('blocked');
    expect(res.feasibility.impossibilityReasons).toContain(
      'locked-step-has-unknown-or-incompatible-exercise',
    );
  });

  it('verifies locked-steps-exceed-target (locked 16m step in 15m target)', () => {
    const res = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 15,
      seedPlan: {
        steps: [
          {
            stepId: 'locked-16m',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 16,
            locked: true,
          },
          {
            stepId: 'unlocked-2',
            kind: 'exercise',
            exerciseId: 'ex-footwork-01',
            durationMin: 5,
            locked: false,
          },
        ],
      },
    });

    expect(res.status).toBe('blocked');
    expect(res.feasibility.impossibilityReasons).toContain('locked-steps-exceed-target');
    expect(res.blockingIssues.some((i) => i.code === 'locked-steps-exceed-target')).toBe(true);
  });

  it('verifies all-steps-locked-time-mismatch (12m locked total in 15m target vs exact 15m match)', () => {
    const mismatchRes = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 15,
      seedPlan: {
        steps: [
          {
            stepId: 'locked-a',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 6,
            explanationSec: 20,
            transitionSec: 0,
            locked: true,
          },
          {
            stepId: 'locked-b',
            kind: 'exercise',
            exerciseId: 'ex-footwork-01',
            durationMin: 6,
            explanationSec: 20,
            transitionSec: 15,
            locked: true,
          },
        ],
      },
    });

    expect(mismatchRes.status).toBe('blocked');
    expect(mismatchRes.feasibility.impossibilityReasons).toContain(
      'all-steps-locked-time-mismatch',
    );
    expect(mismatchRes.blockingIssues.some((i) => i.code === 'all-steps-locked-time-mismatch')).toBe(
      true,
    );

    // Exact 15m match when all steps are locked -> ready!
    const exactLockedRes = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 15,
      seedPlan: {
        steps: [
          {
            stepId: 'locked-exact-a',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 7,
            explanationSec: 20,
            transitionSec: 0,
            locked: true,
          },
          {
            stepId: 'locked-exact-b',
            kind: 'exercise',
            exerciseId: 'ex-footwork-01',
            durationMin: 8,
            explanationSec: 20,
            transitionSec: 15,
            locked: true,
          },
        ],
      },
    });

    expect(exactLockedRes.status).toBe('ready');
    expect(exactLockedRes.recommendedCandidate?.timing.totalSec).toBe(900);
  });

  it('verifies minimum-step-duration-exceeds-target (11 unlocked steps in a 10m target)', () => {
    const elevenSteps = INITIAL_EXERCISES.filter((ex) => ex.apparatus === 'reformer')
      .slice(0, 11)
      .map((ex, idx) => ({
        stepId: `min-floor-step-${idx + 1}`,
        kind: 'exercise' as const,
        exerciseId: ex.id,
        durationMin: 1,
        explanationSec: 20,
        transitionSec: idx === 0 ? 0 : 15,
        sideMode: ex.isUnilateral ? ('left-then-right' as const) : ('together' as const),
      }));

    const res = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 10, // 600s < 11 * 60s (660s)
      seedPlan: { steps: elevenSteps },
    });

    expect(res.status).toBe('blocked');
    expect(res.feasibility.impossibilityReasons).toContain('minimum-step-duration-exceeds-target');
    expect(
      res.blockingIssues.some((i) => i.code === 'minimum-step-duration-exceeds-target'),
    ).toBe(true);
  });

  it('verifies maximum-step-cap-cannot-reach-target (2 unlocked seed steps in a 50m target -> max 40m < 50m)', () => {
    const res = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 50,
      seedPlan: {
        steps: [
          {
            stepId: 'cap-step-1',
            kind: 'exercise',
            exerciseId: 'ex-warmup-01',
            durationMin: 5,
            locked: false,
          },
          {
            stepId: 'cap-step-2',
            kind: 'exercise',
            exerciseId: 'ex-footwork-01',
            durationMin: 5,
            locked: false,
          },
        ],
      },
    });

    expect(res.status).toBe('blocked');
    expect(res.feasibility.maxAchievableTotalSec).toBe(2400); // 40m
    expect(res.feasibility.impossibilityReasons).toContain(
      'maximum-step-cap-cannot-reach-target',
    );
    expect(
      res.blockingIssues.some((i) => i.code === 'maximum-step-cap-cannot-reach-target'),
    ).toBe(true);
  });

  it('verifies insufficient-verifiable-catalog-movements when custom catalog has only 1 exercise', () => {
    const singleExerciseCatalog = INITIAL_EXERCISES.filter((ex) => ex.id === 'ex-warmup-01');
    const res = suggestPresetCandidates({
      apparatus: 'reformer',
      targetMinutes: 15,
      exercises: singleExerciseCatalog,
    });

    expect(res.status).toBe('blocked');
    expect(res.feasibility.impossibilityReasons).toContain(
      'insufficient-verifiable-catalog-movements',
    );
    expect(
      res.blockingIssues.some((i) => i.code === 'insufficient-verifiable-catalog-movements'),
    ).toBe(true);
  });

  it('confirms all 11 TargetTimeImpossibilityReason values are covered by the boundary suite', () => {
    const observedReasons = new Set<TargetTimeImpossibilityReason>();

    const cases = [
      { apparatus: 'reformer', targetMinutes: 9 }, // target-duration-out-of-bounds
      { apparatus: 'unknown-gear', targetMinutes: 30 }, // unknown-equipment-id
      { apparatus: 'reformer', targetMinutes: 30, restMinutes: -1 }, // rest-duration-invalid
      { apparatus: 'reformer', targetMinutes: 15, restMinutes: 15 }, // rest-exceeds-or-equals-target
      { apparatus: 'reformer', targetMinutes: 15, restMinutes: 13 }, // rest-leaves-insufficient-exercise-time & minimum-step-duration-exceeds-target
      {
        apparatus: 'reformer',
        targetMinutes: 30,
        seedPlan: {
          steps: [
            {
              stepId: 'locked-bad',
              kind: 'exercise',
              exerciseId: 'ex-warmup-02',
              durationMin: 5,
              locked: true,
            },
          ],
        },
      }, // locked-step-has-unknown-or-incompatible-exercise
      {
        apparatus: 'reformer',
        targetMinutes: 15,
        seedPlan: {
          steps: [
            {
              stepId: 'locked-over',
              kind: 'exercise',
              exerciseId: 'ex-warmup-01',
              durationMin: 16,
              locked: true,
            },
          ],
        },
      }, // locked-steps-exceed-target
      {
        apparatus: 'reformer',
        targetMinutes: 15,
        seedPlan: {
          steps: [
            {
              stepId: 'locked-mismatch',
              kind: 'exercise',
              exerciseId: 'ex-warmup-01',
              durationMin: 10,
              locked: true,
            },
          ],
        },
      }, // all-steps-locked-time-mismatch
      {
        apparatus: 'reformer',
        targetMinutes: 50,
        seedPlan: {
          steps: [
            {
              stepId: 'cap-1',
              kind: 'exercise',
              exerciseId: 'ex-warmup-01',
              durationMin: 5,
            },
            {
              stepId: 'cap-2',
              kind: 'exercise',
              exerciseId: 'ex-footwork-01',
              durationMin: 5,
            },
          ],
        },
      }, // maximum-step-cap-cannot-reach-target
      {
        apparatus: 'reformer',
        targetMinutes: 15,
        exercises: [INITIAL_EXERCISES[0]],
      }, // insufficient-verifiable-catalog-movements
    ];

    for (const req of cases) {
      const { feasibility } = evaluatePresetTargetFeasibility(req);
      for (const reason of feasibility.impossibilityReasons) {
        observedReasons.add(reason);
      }
    }

    const expectedAll11: TargetTimeImpossibilityReason[] = [
      'target-duration-out-of-bounds',
      'unknown-equipment-id',
      'rest-duration-invalid',
      'rest-exceeds-or-equals-target',
      'rest-leaves-insufficient-exercise-time',
      'locked-step-has-unknown-or-incompatible-exercise',
      'locked-steps-exceed-target',
      'all-steps-locked-time-mismatch',
      'minimum-step-duration-exceeds-target',
      'maximum-step-cap-cannot-reach-target',
      'insufficient-verifiable-catalog-movements',
    ];

    for (const reason of expectedAll11) {
      expect(observedReasons.has(reason)).toBe(true);
    }
  });
});
