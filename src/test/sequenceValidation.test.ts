import { describe, expect, it } from 'vitest';
import type {
  HierarchyPilatesExercise,
  HumanMovementDraft,
  MovementSnapshot,
} from '../types/hierarchy';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import {
  applyAutoApparatusTransitions,
  balanceSequenceSides,
  calculateApparatusTransitionDetail,
  calculateSequenceTimeBreakdown,
  mergeSplitUnilateralPairsForRehearsal,
  normalizeSequenceDifficultyFlow,
  validateMovementSourceBoundary,
  validateSequenceHierarchy,
  validateSequenceStructure,
} from '../utils/sequenceValidation';

function makeApprovedExercise(
  overrides: Partial<HierarchyPilatesExercise> & { id: string },
): HierarchyPilatesExercise {
  const base: HierarchyPilatesExercise = {
    id: overrides.id,
    nameKo: overrides.nameKo ?? `동작 ${overrides.id}`,
    nameEn: overrides.nameEn ?? `Exercise ${overrides.id}`,
    apparatus: overrides.apparatus ?? 'reformer',
    requiredEquipment: overrides.requiredEquipment,
    movementFamily: overrides.movementFamily,
    props: overrides.props ?? ['none'],
    blockCategory: overrides.blockCategory ?? 'core',
    spinalPlanes: overrides.spinalPlanes ?? ['neutral'],
    bodyPosition: overrides.bodyPosition ?? 'supine',
    level: overrides.level ?? '1.5',
    defaultDurationMin: overrides.defaultDurationMin ?? 5,
    defaultRepetitions: overrides.defaultRepetitions ?? 8,
    defaultSets: overrides.defaultSets ?? 2,
    isUnilateral: overrides.isUnilateral ?? false,
    springs: overrides.springs ?? '1R 1B',
    box: overrides.box ?? 'none',
    footbar: overrides.footbar ?? 'mid',
    headrest: overrides.headrest ?? 'up',
    targetMuscles: overrides.targetMuscles ?? ['코어'],
    breathPattern: overrides.breathPattern ?? '날숨에 수축',
    cues: overrides.cues ?? ['골반 중립 유지'],
    precautions: overrides.precautions ?? '과신전 주의',
    layers: overrides.layers ?? {
      easy: '가동범위 축소',
      standard: '정통 정렬 유지',
      hard: '챌린지 템포',
    },
    youtube: overrides.youtube ?? {
      videoId: 'dQw4w9WgXcQ',
      channelName: 'Pilates Studio',
      videoTitle: 'Reference Clip',
      startSec: 10,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    favoriteTag: overrides.favoriteTag ?? 'none',
  };

  return {
    ...base,
    review: {
      status: 'approved',
      reviewerAlias: 'LeadInstructor',
      reviewedAt: '2026-04-01T09:00:00Z',
      revision: exerciseRevision(base),
      scope: 'planning-metadata',
      credentialVerified: false,
    },
  };
}

const sampleExercises: PilatesExercise[] = [
  makeApprovedExercise({
    id: 'ex-warmup',
    nameKo: '리포머 호흡 워밍업',
    nameEn: 'Reformer Breath Warmup',
    apparatus: 'reformer',
    blockCategory: 'warmup',
    level: '1.0',
    springs: '1R',
    box: 'none',
    bodyPosition: 'supine',
  }),
  makeApprovedExercise({
    id: 'ex-footwork',
    nameKo: '풋워크 힐즈',
    nameEn: 'Footwork Heels',
    apparatus: 'reformer',
    blockCategory: 'footwork',
    level: '1.5',
    springs: '2R 1B',
    box: 'none',
    bodyPosition: 'supine',
  }),
  makeApprovedExercise({
    id: 'ex-box-swan',
    nameKo: '롱박스 스완',
    nameEn: 'Long Box Swan',
    apparatus: 'reformer',
    blockCategory: 'extension',
    level: '1.5',
    springs: '1R',
    box: 'long-box',
    bodyPosition: 'prone',
    spinalPlanes: ['extension'],
    precautions: '요추 통증 및 디스크 급성기 주의',
  }),
  makeApprovedExercise({
    id: 'ex-scooter',
    nameKo: '스쿠터',
    nameEn: 'Scooter',
    apparatus: 'reformer',
    blockCategory: 'lower-body',
    level: '1.5',
    isUnilateral: true,
    springs: '1R',
    box: 'none',
    bodyPosition: 'standing',
  }),
  makeApprovedExercise({
    id: 'ex-chair-pike',
    nameKo: '체어 파이크',
    nameEn: 'Chair Pike',
    apparatus: 'chair',
    requiredEquipment: ['chair'],
    blockCategory: 'plank',
    level: '2.0',
    springs: '2R',
    box: 'none',
    bodyPosition: 'standing',
    spinalPlanes: ['flexion'],
    props: ['mini-ball'],
  }),
  makeApprovedExercise({
    id: 'ex-cooldown',
    nameKo: '머메이드 스트레칭',
    nameEn: 'Mermaid Stretch',
    apparatus: 'reformer',
    blockCategory: 'cooldown',
    level: '1.0',
    isUnilateral: true,
    springs: '1B',
    box: 'none',
    bodyPosition: 'seated',
    spinalPlanes: ['lateral'],
  }),
];

describe('Sequence Timing & Apparatus Transitions', () => {
  it('calculates apparatus transition detail across apparatus, box, spring, position, and same setup', () => {
    const stepWarmup: SequenceStep = {
      stepId: 's1',
      order: 1,
      blockCategory: 'warmup',
      exerciseId: 'ex-warmup',
      durationMin: 5,
      selectedLayer: 'standard',
      transitionSec: 0,
    };
    const stepFootwork: SequenceStep = {
      stepId: 's2',
      order: 2,
      blockCategory: 'footwork',
      exerciseId: 'ex-footwork',
      durationMin: 6,
      selectedLayer: 'standard',
      transitionSec: 15,
    };
    const stepBoxSwan: SequenceStep = {
      stepId: 's3',
      order: 3,
      blockCategory: 'extension',
      exerciseId: 'ex-box-swan',
      durationMin: 6,
      selectedLayer: 'standard',
      transitionSec: 25,
    };
    const stepChairPike: SequenceStep = {
      stepId: 's4',
      order: 4,
      blockCategory: 'plank',
      exerciseId: 'ex-chair-pike',
      durationMin: 6,
      selectedLayer: 'standard',
      transitionSec: 20,
    };

    // Spring change only -> 15s
    const springTransition = calculateApparatusTransitionDetail(
      stepWarmup,
      stepFootwork,
      0,
      1,
      sampleExercises,
    );
    expect(springTransition.springChanged).toBe(true);
    expect(springTransition.boxChanged).toBe(false);
    expect(springTransition.apparatusChanged).toBe(false);
    expect(springTransition.recommendedTransitionSec).toBe(15);
    expect(springTransition.configuredTransitionSec).toBe(15);

    // Box change -> 25s
    const boxTransition = calculateApparatusTransitionDetail(
      stepFootwork,
      stepBoxSwan,
      1,
      2,
      sampleExercises,
    );
    expect(boxTransition.boxChanged).toBe(true);
    expect(boxTransition.recommendedTransitionSec).toBe(25);

    // Apparatus/equipment change -> 45s
    const apparatusTransition = calculateApparatusTransitionDetail(
      stepBoxSwan,
      stepChairPike,
      2,
      3,
      sampleExercises,
    );
    expect(apparatusTransition.apparatusChanged).toBe(true);
    expect(apparatusTransition.equipmentChanged).toBe(true);
    expect(apparatusTransition.recommendedTransitionSec).toBe(45);
    expect(apparatusTransition.configuredTransitionSec).toBe(20);

    // Identical setup -> 10s
    const sameSetupTransition = calculateApparatusTransitionDetail(
      stepWarmup,
      { ...stepWarmup, stepId: 's1-copy', transitionSec: 10 },
      0,
      1,
      sampleExercises,
    );
    expect(sameSetupTransition.recommendedTransitionSec).toBe(10);
  });

  it('computes full SequenceTimeBreakdown including sections, rest, deltaSec, and recommended transition delta', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 's1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup',
        durationMin: 5,
        explanationSec: 20,
        transitionSec: 0,
        selectedLayer: 'standard',
      },
      {
        kind: 'rest',
        stepId: 'r1',
        order: 2,
        blockCategory: 'core',
        exerciseId: '',
        durationMin: 2,
        selectedLayer: 'standard',
      },
      {
        stepId: 's2',
        order: 3,
        blockCategory: 'plank',
        exerciseId: 'ex-chair-pike',
        durationMin: 8,
        explanationSec: 30,
        transitionSec: 15, // recommended is 45 (delta +30s)
        selectedLayer: 'standard',
      },
      {
        stepId: 's3',
        order: 4,
        blockCategory: 'cooldown',
        exerciseId: 'ex-cooldown',
        durationMin: 5,
        explanationSec: 15,
        transitionSec: 45,
        selectedLayer: 'standard',
      },
    ];

    const breakdown = calculateSequenceTimeBreakdown(steps, sampleExercises, 20);
    expect(breakdown.totalSec).toBe(20 * 60);
    expect(breakdown.totalMinutes).toBe(20);
    expect(breakdown.targetSec).toBe(1200);
    expect(breakdown.deltaSec).toBe(0);
    expect(breakdown.restSec).toBe(120);
    expect(breakdown.exerciseSec).toBe(1080);
    expect(breakdown.explanationSec).toBe(65);
    expect(breakdown.transitionSec).toBe(60);
    expect(breakdown.movementSec).toBe(1080 - 65 - 60);
    expect(breakdown.sectionDurations).toEqual({
      preparationSec: 300,
      mainSec: 480,
      cooldownSec: 300,
      restSec: 120,
    });
    expect(breakdown.transitions).toHaveLength(2);
    expect(breakdown.recommendedAdditionalTransitionSec).toBe(30);
    expect(breakdown.effectiveTotalWithRecommendedTransitionSec).toBe(1230);
  });

  it('applies automatic apparatus transitions and optionally fits to target minutes', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 's1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup',
        durationMin: 5,
        explanationSec: 20,
        transitionSec: 30,
        selectedLayer: 'standard',
      },
      {
        stepId: 's2',
        order: 2,
        blockCategory: 'extension',
        exerciseId: 'ex-box-swan',
        durationMin: 6,
        explanationSec: 20,
        transitionSec: 0,
        selectedLayer: 'standard',
      },
      {
        stepId: 's3',
        order: 3,
        blockCategory: 'plank',
        exerciseId: 'ex-chair-pike',
        durationMin: 6,
        explanationSec: 20,
        transitionSec: 0,
        selectedLayer: 'standard',
      },
    ];

    const withTransitions = applyAutoApparatusTransitions(steps, sampleExercises, 20);
    expect(withTransitions[0].transitionSec).toBe(0);
    expect(withTransitions[1].transitionSec).toBe(25); // box changed
    expect(withTransitions[2].transitionSec).toBe(45); // apparatus changed
    const breakdown = calculateSequenceTimeBreakdown(withTransitions, sampleExercises, 20);
    expect(breakdown.deltaSec).toBe(0);
  });

  it('uses exerciseSnapshot when catalog exercise is missing', () => {
    const snapshot: MovementSnapshot = {
      id: 'snap-only-ex',
      nameKo: '스냅샷 전용 동작',
      nameEn: 'Snapshot Only Move',
      apparatus: 'cadillac',
      requiredEquipment: ['cadillac'],
      blockCategory: 'warmup',
      level: '1.0',
      defaultDurationMin: 5,
      isUnilateral: false,
      springs: '1R',
      box: 'none',
      footbar: 'none',
      headrest: 'flat',
      props: ['none'],
      spinalPlanes: ['neutral'],
      bodyPosition: 'supine',
      targetMuscles: ['코어'],
      breathPattern: '호흡',
      cues: ['정렬'],
      precautions: '주의',
      layers: { easy: '쉬움', standard: '보통', hard: '어려움' },
      capturedAt: '2026-04-01T00:00:00Z',
    };

    const steps: SequenceStep[] = [
      {
        stepId: 's-snap',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'snap-only-ex',
        durationMin: 10,
        selectedLayer: 'standard',
        exerciseSnapshot: snapshot,
      },
    ];

    const report = validateSequenceStructure(steps, [], {
      targetMinutes: 10,
      level: '1.5',
      availableEquipment: ['cadillac'],
    });
    expect(report.issues.some((i) => i.code === 'unknown-exercise')).toBe(false);
    expect(report.valid).toBe(true);
  });
});

describe('Left/Right Pairing & Side Balance Validation + Fixes', () => {
  it('detects bilateral mode mismatch, missing pair, duration imbalance, and reps imbalance on unilateral steps', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 'u-together',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-cooldown', // unilateral
        durationMin: 4,
        sideMode: 'together',
        selectedLayer: 'standard',
      },
      {
        stepId: 'u-left-only',
        order: 2,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter', // unilateral
        durationMin: 5,
        sideMode: 'left',
        selectedLayer: 'standard',
      },
    ];

    const report = validateSequenceStructure(steps, sampleExercises, {
      targetMinutes: 9,
      level: '1.5',
    });

    expect(report.issues.some((i) => i.code === 'unilateral-bilateral-mode-mismatch')).toBe(true);
    expect(report.issues.some((i) => i.code === 'unilateral-missing-pair')).toBe(true);
    expect(report.sideBalanceSummary.unpairedLeftIds).toContain('ex-scooter');

    // Now test paired left/right with unequal duration and reps
    const imbalancedPairSteps: SequenceStep[] = [
      {
        stepId: 'sc-l',
        order: 1,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter',
        durationMin: 6,
        sideMode: 'left',
        repetitions: 10,
        sets: 2,
        selectedLayer: 'standard',
      },
      {
        stepId: 'sc-r',
        order: 2,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter',
        durationMin: 4,
        sideMode: 'right',
        repetitions: 8,
        sets: 2,
        selectedLayer: 'standard',
      },
    ];

    const pairReport = validateSequenceStructure(imbalancedPairSteps, sampleExercises, {
      targetMinutes: 10,
      level: '1.5',
    });
    expect(pairReport.issues.some((i) => i.code === 'unilateral-duration-imbalance')).toBe(true);
    expect(pairReport.issues.some((i) => i.code === 'unilateral-reps-imbalance')).toBe(true);
    expect(pairReport.issues.some((i) => i.code === 'duplicate-movement')).toBe(false);

    // Fix with balanceSequenceSides
    const fixedPair = balanceSequenceSides(imbalancedPairSteps, sampleExercises);
    const fixedReport = validateSequenceStructure(fixedPair, sampleExercises, {
      targetMinutes: 10,
      level: '1.5',
    });
    expect(fixedReport.issues.filter((i) => i.category === 'side-balance')).toHaveLength(0);
    expect(fixedPair[0].durationMin).toBe(5);
    expect(fixedPair[1].durationMin).toBe(5);
    expect(fixedPair[0].repetitions).toBe(10);
    expect(fixedPair[1].repetitions).toBe(10);
  });

  it('merges split unilateral L/R pairs into a single left-then-right step so rehearsal gate passes', () => {
    const splitSteps: SequenceStep[] = [
      {
        stepId: 'w1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup',
        durationMin: 4,
        explanationSec: 20,
        transitionSec: 0,
        selectedLayer: 'standard',
      },
      {
        stepId: 'sc-left',
        order: 2,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter',
        durationMin: 3,
        explanationSec: 15,
        transitionSec: 15,
        sideMode: 'left',
        repetitions: 8,
        selectedLayer: 'standard',
      },
      {
        stepId: 'sc-right',
        order: 3,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter',
        durationMin: 3,
        explanationSec: 0,
        transitionSec: 15,
        sideMode: 'right',
        repetitions: 8,
        selectedLayer: 'standard',
      },
    ];

    // Before merging, buildSequenceSimulation rejects duplicate movement key
    const rawSim = buildSequenceSimulation(splitSteps, sampleExercises, 10);
    expect(rawSim.gate.canRehearse).toBe(false);
    expect(rawSim.gate.reasons.some((r) => r.code === 'duplicate-movement')).toBe(true);

    // After merging, rehearsal gate passes cleanly with preserved total duration
    const merged = mergeSplitUnilateralPairsForRehearsal(splitSteps, sampleExercises);
    expect(merged).toHaveLength(2);
    expect(merged[1].sideMode).toBe('left-then-right');
    expect(merged[1].durationMin).toBe(6);

    const mergedSim = buildSequenceSimulation(merged, sampleExercises, 10);
    expect(mergedSim.gate.canRehearse).toBe(true);
    expect(mergedSim.totals.totalSec).toBe(600);
  });
});

describe('Difficulty Flow, Duplicates, Equipment & Personal Constraints', () => {
  it('validates difficulty flow issues and normalizes section order and difficulty spikes', () => {
    const invertedSteps: SequenceStep[] = [
      {
        stepId: 's-cool',
        order: 1,
        blockCategory: 'cooldown',
        exerciseId: 'ex-cooldown',
        durationMin: 4,
        selectedLayer: 'hard', // score 1.25
      },
      {
        stepId: 's-main',
        order: 2,
        blockCategory: 'warmup',
        classSection: 'main',
        exerciseId: 'ex-warmup', // level 1.0, easy -> score 0.75
        durationMin: 6,
        selectedLayer: 'easy',
      },
      {
        stepId: 's-prep',
        order: 3,
        blockCategory: 'footwork',
        classSection: 'preparation',
        exerciseId: 'ex-footwork', // level 1.5, hard -> score 1.75
        durationMin: 5,
        selectedLayer: 'hard',
      },
    ];

    const report = validateSequenceStructure(invertedSteps, sampleExercises, {
      targetMinutes: 15,
      level: '1.5',
    });

    expect(report.issues.some((i) => i.code === 'section-order-inverted')).toBe(true);
    expect(report.issues.some((i) => i.code === 'warmup-difficulty-spike')).toBe(true);
    expect(report.issues.some((i) => i.code === 'cooldown-difficulty-high')).toBe(true);
    expect(report.issues.some((i) => i.code === 'abrupt-level-jump')).toBe(true);

    const normalized = normalizeSequenceDifficultyFlow(invertedSteps, sampleExercises);
    const afterReport = validateSequenceStructure(normalized, sampleExercises, {
      targetMinutes: 15,
      level: '1.5',
    });

    expect(afterReport.difficultyFlowSummary.sectionOrderValid).toBe(true);
    expect(afterReport.issues.some((i) => i.code === 'section-order-inverted')).toBe(false);
    expect(afterReport.issues.some((i) => i.code === 'cooldown-difficulty-high')).toBe(false);
  });

  it('detects duplicate movements, equipment/prop mismatches, coverage gaps, and local personal constraints', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 'd1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup',
        durationMin: 5,
        selectedLayer: 'standard',
      },
      {
        stepId: 'd2',
        order: 2,
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup', // duplicate
        durationMin: 5,
        selectedLayer: 'standard',
      },
      {
        stepId: 'd3',
        order: 3,
        blockCategory: 'extension',
        exerciseId: 'ex-box-swan',
        durationMin: 5,
        selectedLayer: 'standard',
      },
      {
        stepId: 'd4',
        order: 4,
        blockCategory: 'plank',
        exerciseId: 'ex-chair-pike', // level 2.0, requires chair + mini-ball
        durationMin: 5,
        selectedLayer: 'standard',
      },
    ];

    const report = validateSequenceStructure(steps, sampleExercises, {
      targetMinutes: 20,
      level: '1.5',
      availableEquipment: ['reformer', 'cadillac'], // chair is missing, cadillac is unused
      preferredProps: ['none'], // mini-ball is missing
      localConstraints: {
        avoidSpinalPlanes: ['extension'],
        avoidBodyPositions: ['prone'],
        precautionKeywords: ['디스크'],
        maxLevel: '1.5',
      },
    });

    expect(report.valid).toBe(false);
    expect(report.canConfirmClass).toBe(false);
    expect(report.issues.some((i) => i.code === 'duplicate-movement')).toBe(true);
    expect(report.duplicateExerciseIds).toContain('ex-warmup');
    expect(report.issues.some((i) => i.code === 'level-exceeds-target')).toBe(true);
    expect(report.issues.some((i) => i.code === 'equipment-mismatch')).toBe(true);
    expect(report.issues.some((i) => i.code === 'prop-mismatch')).toBe(true);
    expect(report.issues.some((i) => i.code === 'equipment-coverage-missing')).toBe(true);
    expect(report.issues.some((i) => i.code === 'local-precaution-warning')).toBe(true);
    expect(report.violatedEquipmentIds).toContain('chair');
    expect(report.violatedEquipmentIds).toContain('cadillac');
  });

  it('handles empty-sequence, rest-budget-exceeded, transition-underbudgeted, missing prep/cooldown, and locked unpaired side step', () => {
    const emptyReport = validateSequenceStructure([], sampleExercises, {
      targetMinutes: 10,
      level: '1.5',
    });
    expect(emptyReport.issues.some((i) => i.code === 'empty-sequence')).toBe(true);
    expect(emptyReport.valid).toBe(false);

    // Rest budget exceeded & underbudgeted transition & missing prep/cooldown
    const mainOnlySteps: SequenceStep[] = [
      {
        stepId: 'm1',
        order: 1,
        blockCategory: 'footwork',
        exerciseId: 'ex-footwork',
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 'm2',
        order: 2,
        blockCategory: 'extension',
        exerciseId: 'ex-box-swan',
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 'm3',
        order: 3,
        blockCategory: 'plank',
        exerciseId: 'ex-chair-pike',
        durationMin: 4,
        transitionSec: 10, // equipment changed (reformer -> chair), < 30s
        selectedLayer: 'standard',
      },
      {
        kind: 'rest',
        stepId: 'r-bad',
        order: 4,
        blockCategory: 'core',
        exerciseId: '',
        durationMin: 0, // invalid rest <= 0
        selectedLayer: 'standard',
      },
    ];

    const mainOnlyReport = validateSequenceStructure(mainOnlySteps, sampleExercises, {
      targetMinutes: 12,
      level: '2.0',
    });
    expect(mainOnlyReport.issues.some((i) => i.code === 'rest-budget-exceeded')).toBe(true);
    expect(mainOnlyReport.issues.some((i) => i.code === 'transition-underbudgeted')).toBe(true);
    expect(mainOnlyReport.issues.some((i) => i.code === 'missing-preparation')).toBe(true);
    expect(mainOnlyReport.issues.some((i) => i.code === 'missing-cooldown')).toBe(true);

    // Locked unpaired step creates a partner step instead of mutating the locked step
    const lockedUnpaired: SequenceStep[] = [
      {
        stepId: 'locked-left',
        order: 1,
        blockCategory: 'lower-body',
        exerciseId: 'ex-scooter',
        durationMin: 5,
        sideMode: 'left',
        locked: true,
        selectedLayer: 'standard',
      },
    ];
    const balancedFromLocked = balanceSequenceSides(lockedUnpaired, sampleExercises);
    expect(balancedFromLocked).toHaveLength(2);
    expect(balancedFromLocked[0].sideMode).toBe('left');
    expect(balancedFromLocked[0].locked).toBe(true);
    expect(balancedFromLocked[1].sideMode).toBe('right');
    expect(balancedFromLocked[1].locked).toBe(false);
  });
});

describe('Human-Created Movement Drafts & AI/Human Boundary', () => {
  const ideaOnlyDraft: HumanMovementDraft = {
    id: 'draft-idea-1',
    sourceOrigin: 'human-created',
    completenessStage: 'idea-only',
    ideaLine: '리포머 풋바 잡고 흉추 회전 스트레칭 아이디어',
    revision: 1,
    revisionHistory: [],
    feelLogs: [],
    modificationLogs: [],
    photoReferences: [],
    safetyBoundary: {
      originType: 'instructor-created-draft',
      evaluationBasis: 'subjective-instructor-feel',
      aiSafetyGuaranteed: false,
      objectiveEfficacyClaimed: false,
      expertVerified: false,
      disclaimerKo: '강사의 주관적 체감 메모이며 객관적 효능·안전 보증이 아닙니다.',
    },
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-04-01T09:00:00Z',
  };

  const classReadyDraft: HumanMovementDraft = {
    id: 'draft-ready-2',
    sourceOrigin: 'human-created',
    completenessStage: 'class-ready',
    ideaLine: '캐딜락 푸쉬스루바 코어 분절 변형',
    workingNameKo: '푸쉬스루바 코어 분절 플로우',
    apparatus: 'cadillac',
    requiredEquipment: ['cadillac'],
    blockCategory: 'core',
    sectionRole: 'main',
    level: '1.5',
    defaultDurationMin: 6,
    isUnilateral: false,
    springs: '1R',
    revision: 3,
    revisionHistory: [],
    feelLogs: [],
    modificationLogs: [],
    photoReferences: [],
    safetyBoundary: {
      originType: 'instructor-created-draft',
      evaluationBasis: 'subjective-instructor-feel',
      aiSafetyGuaranteed: false,
      objectiveEfficacyClaimed: false,
      expertVerified: false,
      disclaimerKo: '강사의 주관적 체감 메모이며 객관적 효능·안전 보증이 아닙니다.',
    },
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-04-02T10:00:00Z',
  };

  it('validates a sequence containing idea-only and class-ready human drafts without unknown-exercise errors and emits non-blocking draft-metadata-guidance warning', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 's-idea',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: 'draft-idea-1',
        humanDraftId: 'draft-idea-1',
        humanDraftRevision: 1,
        durationMin: 4,
        explanationSec: 15,
        transitionSec: 0,
        selectedLayer: 'standard',
      },
      {
        stepId: 's-ready',
        order: 2,
        blockCategory: 'core',
        exerciseId: 'draft-ready-2',
        humanDraftId: 'draft-ready-2',
        humanDraftRevision: 3,
        durationMin: 6,
        explanationSec: 20,
        transitionSec: 45,
        selectedLayer: 'standard',
      },
      {
        stepId: 's-cool',
        order: 3,
        blockCategory: 'cooldown',
        exerciseId: 'ex-cooldown',
        durationMin: 5,
        explanationSec: 15,
        transitionSec: 45,
        selectedLayer: 'standard',
      },
    ];

    const report = validateSequenceHierarchy(steps, sampleExercises, {
      targetMinutes: 15,
      level: '1.5',
      availableEquipment: ['reformer', 'cadillac'],
      humanDrafts: [ideaOnlyDraft, classReadyDraft],
    });

    // Never flagged as unknown-exercise
    expect(report.issues.some((i) => i.code === 'unknown-exercise')).toBe(false);

    // Time breakdown sums human drafts accurately
    expect(report.timeBreakdown.totalSec).toBe(15 * 60);
    expect(report.timeBreakdown.deltaSec).toBe(0);
    expect(report.timeBreakdown.sectionDurations.preparationSec).toBe(240);
    expect(report.timeBreakdown.sectionDurations.mainSec).toBe(360);
    expect(report.timeBreakdown.sectionDurations.cooldownSec).toBe(300);

    // Emits non-blocking draft-metadata-guidance warning only for idea-only draft missing apparatus/defaultDurationMin
    const guidanceIssue = report.issues.find((i) => i.code === 'draft-metadata-guidance');
    expect(guidanceIssue).toBeDefined();
    expect(guidanceIssue?.category).toBe('draft-readiness');
    expect(guidanceIssue?.severity).toBe('warning');
    expect(guidanceIssue?.stepIndices).toEqual([0]);
    expect(guidanceIssue?.exerciseIds).toContain('draft-idea-1');
    expect(guidanceIssue?.exerciseIds).not.toContain('draft-ready-2');

    // Sequence remains valid and confirmable because guidance is a warning, not an error
    expect(report.valid).toBe(true);
    expect(report.canConfirmClass).toBe(true);
  });

  it('enforces validateMovementSourceBoundary between AI catalog-only recommendation and human-created movement freedom', () => {
    const aiResult = validateMovementSourceBoundary({
      mode: 'ai-auto-recommendation',
      candidateIds: ['ex-warmup', 'draft-idea-1', 'hallucinated-ai-move-99'],
      catalogExercises: sampleExercises,
      humanDrafts: [ideaOnlyDraft, classReadyDraft],
    });

    expect(aiResult.allowed).toBe(false);
    expect(aiResult.rejectedIds).toEqual(['draft-idea-1', 'hallucinated-ai-move-99']);
    expect(aiResult.reasonKo).toContain('AI 자동 추천');

    const aiCleanResult = validateMovementSourceBoundary({
      mode: 'ai-auto-recommendation',
      candidateIds: ['ex-warmup', 'ex-footwork'],
      catalogExercises: sampleExercises,
      humanDrafts: [ideaOnlyDraft, classReadyDraft],
    });
    expect(aiCleanResult.allowed).toBe(true);
    expect(aiCleanResult.rejectedIds).toEqual([]);

    const humanResult = validateMovementSourceBoundary({
      mode: 'human-creation',
      candidateIds: ['ex-warmup', 'draft-idea-1', 'draft-ready-2'],
      catalogExercises: sampleExercises,
      humanDrafts: [ideaOnlyDraft, classReadyDraft],
    });

    expect(humanResult.allowed).toBe(true);
    expect(humanResult.rejectedIds).toEqual([]);
  });
});


