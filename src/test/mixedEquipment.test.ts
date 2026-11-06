import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  EQUIPMENT_IDS,
  getEquipmentFamilies,
  getEquipmentFamily,
  getExerciseEquipment,
} from '../data/equipmentCatalog';
import { CURATED_SEQUENCE_PROGRAMS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  ClassBlockCategory,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import {
  fitSequenceDuration,
  generateOptimal50MinSequence,
  getMovementKey,
  getStepTiming,
  regenerateSequence,
} from '../utils/sequenceEngine';

const reviewedAt = '2026-11-04T10:00:00.000Z';
function approved(exercise: PilatesExercise): PilatesExercise {
  // Use the same serializable record that a real persisted review would retain.
  const record = JSON.parse(JSON.stringify(exercise)) as PilatesExercise;
  return {
    ...record,
    review: {
      status: 'approved',
      scope: 'planning-metadata',
      credentialVerified: false,
      reviewerAlias: 'Test reviewer',
      reviewedAt,
      revision: exerciseRevision(record),
    },
  };
}

const names: Record<'mat' | 'reformer' | 'chair', string[]> = {
  mat: [
    'Supine rib expansion',
    'Pelvic clock awareness',
    'Alternating knee float',
    'Quadruped opposite arm reach',
    'Supine knee sway',
    'Resting lateral breath',
  ],
  reformer: [
    'Parallel heel press',
    'Forefoot carriage glide',
    'Strap leg circle',
    'Seated rowing reach',
    'Supported hip flexor lengthening',
    'Seated lateral trunk reach',
  ],
  chair: [
    'Seated pedal ankle press',
    'Standing heel lowering',
    'Supported single pedal control',
    'Seated arm pedal press',
    'Standing side body opening',
    'Supported calf release',
  ],
};
const categories: ClassBlockCategory[] = [
  'warmup',
  'warmup',
  'core',
  'core',
  'cooldown',
  'cooldown',
];
const fixtures = (Object.keys(names) as ('mat' | 'reformer' | 'chair')[]).flatMap((equipment) =>
  names[equipment].map((name, index) =>
    approved({
      ...INITIAL_EXERCISES[0]!,
      id: `mixed-test-${equipment}-${index}`,
      nameKo: `${name} 계획 동작`,
      nameEn: name,
      movementFamily: `test-movement-${name.toLowerCase().replaceAll(' ', '-')}`,
      apparatus: equipment,
      requiredEquipment: [equipment],
      props: ['none'],
      level: '1.0',
      blockCategory: categories[index]!,
      defaultDurationMin: 4,
      isUnilateral: index === 2,
      isCustom: true,
      youtube: { videoId: '', channelName: 'Test fixture', videoTitle: '', startSec: 0, url: '' },
    }),
  ),
);

function criteriaFor(selected: string[], targetMinutes = 63): AutoGenerateCriteria {
  return {
    apparatus: selected.length > 1 ? 'mixed' : getEquipmentFamily(selected[0]!)!,
    ownedApparatus: getEquipmentFamilies(selected),
    availableEquipment: [...selected],
    level: '1.0',
    focusPreset: 'full-body',
    preferredProps: [],
    excludeDaysWindow: 0,
    targetMinutes,
    defaultLayer: 'standard',
    planningGoals: ['pelvic-control', 'trunk-hip-coordination'],
    instructorObservations: ['anterior-pelvic-tilt'],
  };
}
const criteria = criteriaFor(['mat', 'reformer']);
const totalSec = (steps: SequenceStep[]) =>
  steps.reduce((sum, step) => sum + getStepTiming(step).totalSec, 0);
function represented(steps: SequenceStep[], pool = fixtures) {
  const byId = new Map(pool.map((exercise) => [exercise.id, exercise]));
  return new Set(
    steps.flatMap((step) => getExerciseEquipment(byId.get(step.exerciseId)!).requiredEquipment),
  );
}

// These approvals are test fixtures. No production record is approved by these tests.
describe('mixed class coverage and exact timing', () => {
  it.each([
    ['mat', 'reformer'],
    ['chair', 'reformer'],
  ])('represents every selected apparatus: %j', (...selected) => {
    const requested = criteriaFor(selected);
    const steps = generateOptimal50MinSequence(requested, fixtures, []);
    expect([...represented(steps)].sort()).toEqual([...selected].sort());
    expect(totalSec(steps)).toBe(63 * 60);
    expect(
      new Set(
        steps.map((step) =>
          getMovementKey(fixtures.find((exercise) => exercise.id === step.exerciseId)!),
        ),
      ).size,
    ).toBe(steps.length);
  });

  it('keeps every requirement inside the selected subset rather than expanding to all owned equipment', () => {
    const request = { ...criteria, ownedApparatus: ['mat', 'reformer', 'chair'] as const };
    const steps = generateOptimal50MinSequence(
      { ...request, ownedApparatus: [...request.ownedApparatus] },
      fixtures,
      [],
    );
    expect([...represented(steps)].sort()).toEqual(['mat', 'reformer']);
    expect(steps.every((step) => !step.exerciseId.includes('chair'))).toBe(true);
  });

  it('reports an empty exact selection instead of expanding to owned apparatus', () => {
    expect(() =>
      generateOptimal50MinSequence({ ...criteria, availableEquipment: [] }, fixtures, []),
    ).toThrow();
  });

  it.each(['tower', 'ladder-barrel', 'spine-corrector'])(
    'reports unavailable exact selected equipment %s instead of ignoring it',
    (equipment) => {
      expect(() =>
        generateOptimal50MinSequence(criteriaFor(['mat', equipment]), fixtures, []),
      ).toThrow();
    },
  );

  it.each([{ level: '2.0' as const }, { props: ['magic-circle' as const] }])(
    'does not ignore a selected apparatus whose candidates violate another hard constraint: %j',
    (change) => {
      const restricted = fixtures.map((exercise) =>
        exercise.apparatus === 'chair' ? approved({ ...exercise, ...change }) : exercise,
      );
      expect(() =>
        generateOptimal50MinSequence(criteriaFor(['mat', 'chair']), restricted, []),
      ).toThrow();
    },
  );

  it('fits all eight independent apparatus only when their movement, explanation and setup time fits', () => {
    const independentNames = [
      'Rib breath awareness',
      'Pelvic curl articulation',
      'Scapular upward glide',
      'Standing ankle rise',
      'Supported hip hinge',
      'Side body lengthening',
      'Prone chest lift',
      'Seated arm extension',
    ];
    const allEquipment = EQUIPMENT_IDS.map((equipment, index) =>
      approved({
        ...fixtures[index % fixtures.length]!,
        id: `eight-equipment-${index}`,
        nameKo: `${independentNames[index]} 계획 동작`,
        nameEn: independentNames[index]!,
        movementFamily: `independent-test-${index}`,
        apparatus: getEquipmentFamily(equipment)!,
        requiredEquipment: [equipment],
        props: ['none'],
        blockCategory: 'core',
        isUnilateral: false,
      }),
    );
    expect(() =>
      generateOptimal50MinSequence(criteriaFor([...EQUIPMENT_IDS], 10), allEquipment, []),
    ).toThrow();
    const steps = generateOptimal50MinSequence(
      criteriaFor([...EQUIPMENT_IDS], 15),
      allEquipment,
      [],
    );
    expect([...represented(steps, allEquipment)].sort()).toEqual([...EQUIPMENT_IDS].sort());
    expect(totalSec(steps)).toBe(900);
  });

  it('includes both sides and a 45-second apparatus change allowance inside the requested total', () => {
    const steps = generateOptimal50MinSequence(criteria, fixtures, []);
    const byId = new Map(fixtures.map((exercise) => [exercise.id, exercise]));
    let apparatusChanges = 0;
    steps.forEach((step, index) => {
      const exercise = byId.get(step.exerciseId)!;
      const timing = getStepTiming(step, exercise);
      expect(timing.perSideSec * timing.sides + timing.explanationSec + timing.transitionSec).toBe(
        timing.totalSec,
      );
      if (
        index > 0 &&
        byId.get(steps[index - 1]!.exerciseId)!.requiredEquipment?.join() !==
          exercise.requiredEquipment?.join()
      ) {
        apparatusChanges += 1;
        expect(timing.transitionSec).toBeGreaterThanOrEqual(45);
      }
    });
    expect(apparatusChanges).toBeGreaterThan(0);
    expect(totalSec(steps)).toBe(3780);
  });

  it('preserves every locked field and object while regenerating and fitting a 63-minute mixed class', () => {
    const original = generateOptimal50MinSequence({ ...criteria, targetMinutes: 50 }, fixtures, []);
    const steps = original.map((step, index) =>
      index === 2
        ? {
            ...step,
            locked: true,
            instructorNote: '보존할 수업 큐',
            customSpringOverride: '강사 설정',
          }
        : step,
    );
    const locked = steps[2]!;
    const next = regenerateSequence(criteria, fixtures, [], steps);
    expect(next[2]).toBe(locked);
    expect(next[2]).toEqual(locked);
    expect(totalSec(next)).toBe(3780);
    expect([...represented(next)].sort()).toEqual(['mat', 'reformer']);
    const fitted = fitSequenceDuration(steps, 63);
    expect(fitted[2]).toBe(locked);
    expect(totalSec(fitted)).toBe(3780);
    expect(() =>
      fitSequenceDuration(
        steps.map((step) => ({ ...step, locked: true })),
        63,
      ),
    ).toThrow();
  });

  it('retains a locked legacy explanation and transition allowance while fitting 63 minutes', () => {
    const original = generateOptimal50MinSequence({ ...criteria, targetMinutes: 50 }, fixtures, []);
    const steps = original.map((step, index) =>
      index === 2
        ? {
            ...step,
            locked: true,
            explanationSec: 7,
            transitionSec: 3,
            selectedLayer: 'hard' as const,
            instructorNote: '이전 수업의 잠긴 큐',
            customSpringOverride: '이전 강사 설정',
          }
        : step,
    );
    const locked = steps[2]!;
    const regenerated = regenerateSequence(criteria, fixtures, [], steps);
    expect(regenerated[2]).toBe(locked);
    expect(regenerated[2]).toEqual(locked);
    expect(
      getStepTiming(
        regenerated[2]!,
        fixtures.find((exercise) => exercise.id === locked.exerciseId),
      ),
    ).toMatchObject({ explanationSec: 7, transitionSec: 3 });
    expect(totalSec(regenerated)).toBe(3780);
    const fitted = fitSequenceDuration(steps, 63);
    expect(fitted[2]).toBe(locked);
    expect(totalSec(fitted)).toBe(3780);
  });

  it('does not repeat normalized versions of the same movement to fill a longer class', () => {
    const duplicates = ['Mat Pelvic Curl', 'Ｍａｔ　Ｐｅｌｖｉｃ　Ｃｕｒｌ'].map((nameEn, index) =>
      approved({
        ...fixtures[0]!,
        id: `duplicate-movement-${index}`,
        nameKo: '골반 컬',
        nameEn,
        movementFamily: undefined,
        apparatus: 'mat',
        requiredEquipment: ['mat'],
        blockCategory: 'core',
      }),
    );
    expect(getMovementKey(duplicates[0]!)).toBe(getMovementKey(duplicates[1]!));
    const short = generateOptimal50MinSequence(criteriaFor(['mat'], 15), duplicates, []);
    expect(short).toHaveLength(1);
    expect(() => generateOptimal50MinSequence(criteriaFor(['mat'], 50), duplicates, [])).toThrow();
  });

  it('keeps unapproved source material out of automatic class composition', () => {
    const unapproved = fixtures.map((exercise) => ({ ...exercise, review: undefined }));
    expect(() => generateOptimal50MinSequence(criteria, unapproved, [])).toThrow();
  });
});

const originalStore = usePilatesStore.getState();
describe('draft criteria and saved condition snapshots', () => {
  beforeEach(() => {
    usePilatesStore.setState(
      {
        ...originalStore,
        exercises: fixtures,
        savedSequences: [],
        historyLogs: [],
        ownedEquipment: ['mat', 'reformer', 'chair'],
        ownedApparatus: ['mat', 'reformer', 'chair'],
        ownedProps: [],
        activeSteps: generateOptimal50MinSequence(criteria, fixtures, []),
        activeApparatus: 'mixed',
        activeLevel: '1.0',
        activeTargetMinutes: 63,
        draftCriteria: criteria,
        lastCriteria: criteria,
        generationError: null,
      },
      true,
    );
  });
  afterEach(() => {
    usePilatesStore.setState(originalStore, true);
  });

  it('adopts valid draft conditions when appending the first manual exercise to a blank class', () => {
    const draft = {
      ...criteriaFor(['reformer'], 50),
      level: '1.5' as const,
      targetGroupId: 'new-class-alias',
    };
    usePilatesStore.setState({
      activeSteps: [],
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 63,
      lastCriteria: null,
      draftCriteria: draft,
    });
    const selected = fixtures.find((exercise) => exercise.apparatus === 'reformer')!;
    usePilatesStore.getState().appendExerciseToSequence(selected.id);
    const state = usePilatesStore.getState();
    expect(state.activeSteps.map((step) => step.exerciseId)).toEqual([selected.id]);
    expect(state.generationError).toBeNull();
    expect(state.activeApparatus).toBe('reformer');
    expect(state.activeLevel).toBe('1.5');
    expect(state.activeTargetMinutes).toBe(50);
    expect(state.activeTargetGroupId).toBe('new-class-alias');
  });

  it('uses the default active apparatus when no saved or draft conditions exist for a blank class', () => {
    usePilatesStore.setState({
      activeSteps: [],
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 63,
      lastCriteria: null,
      draftCriteria: null,
    });
    const mat = fixtures.find((exercise) => exercise.apparatus === 'mat')!;
    usePilatesStore.getState().appendExerciseToSequence(mat.id);
    const state = usePilatesStore.getState();
    expect(state.activeSteps.map((step) => step.exerciseId)).toEqual([mat.id]);
    expect(state.generationError).toBeNull();
    expect(state.activeApparatus).toBe('mat');
    const before = structuredClone(state.activeSteps);
    state.appendExerciseToSequence(
      fixtures.find((exercise) => exercise.apparatus === 'reformer')!.id,
    );
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
    expect(usePilatesStore.getState().generationError).toEqual(expect.any(String));
  });

  it('rejects normalized duplicate movements through both append and replacement APIs without altering the class', () => {
    const first = approved({
      ...fixtures[0]!,
      id: 'manual-duplicate-base',
      movementFamily: undefined,
      nameKo: '누워 갈비뼈 호흡',
      nameEn: 'Mat Supine Rib Expansion',
    });
    const duplicate = approved({
      ...first,
      id: 'manual-duplicate-variant',
      nameEn: 'Ｍａｔ　Ｓｕｐｉｎｅ　Ｒｉｂ　Ｅｘｐａｎｓｉｏｎ',
    });
    const second = fixtures[1]!;
    expect(getMovementKey(first)).toBe(getMovementKey(duplicate));
    const steps: SequenceStep[] = [first, second].map((exercise, index) => ({
      stepId: `manual-${index}`,
      order: index + 1,
      exerciseId: exercise.id,
      blockCategory: exercise.blockCategory,
      durationMin: 5,
      selectedLayer: 'standard',
    }));
    const matCriteria = criteriaFor(['mat'], 10);
    usePilatesStore.setState({
      exercises: [first, duplicate, ...fixtures],
      activeSteps: steps,
      activeApparatus: 'mat',
      activeTargetMinutes: 10,
      lastCriteria: matCriteria,
      draftCriteria: matCriteria,
    });
    const state = usePilatesStore.getState();
    state.appendExerciseToSequence(duplicate.id);
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    expect(usePilatesStore.getState().generationError).toEqual(expect.any(String));
    usePilatesStore.setState({ generationError: null });
    state.replaceStepExercise(1, duplicate.id);
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    expect(usePilatesStore.getState().generationError).toEqual(expect.any(String));
  });

  it('catches a freshness swap failure and preserves a locked legacy duplicate draft', () => {
    const exercise = fixtures[0]!;
    const steps: SequenceStep[] = [1, 2].map((order) => ({
      stepId: `locked-duplicate-${order}`,
      order,
      exerciseId: exercise.id,
      blockCategory: exercise.blockCategory,
      durationMin: 5,
      selectedLayer: 'standard',
      locked: true,
      instructorNote: `보존할 큐 ${order}`,
    }));
    const matCriteria = criteriaFor(['mat'], 10);
    usePilatesStore.setState({
      activeSteps: steps,
      activeApparatus: 'mat',
      activeTargetMinutes: 10,
      lastCriteria: matCriteria,
      draftCriteria: matCriteria,
      activeTargetGroupId: 'swap-group',
      historyLogs: [
        {
          id: 'swap-recent-log',
          sequenceId: 'old-swap-class',
          sequenceTitle: '이전 수업',
          groupId: 'swap-group',
          groupName: '수업 별칭',
          taughtAt: new Date().toISOString(),
          apparatus: 'mat',
          level: '1.0',
          exerciseIds: [exercise.id],
          rating: 4,
          intensity: 'moderate',
          instructorReflection: '반복 검토',
        },
      ],
    });
    expect(() => usePilatesStore.getState().swapFreshExercisesForGroup()).not.toThrow();
    expect(usePilatesStore.getState().activeSteps).toBe(steps);
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    expect(usePilatesStore.getState().generationError).toEqual(expect.any(String));
  });

  it('persists valid form conditions across tab changes and hydration before generation', async () => {
    const pending = {
      ...criteria,
      targetMinutes: 50,
      instructorObservations: ['posterior-pelvic-tilt' as const],
    };
    usePilatesStore.getState().setDraftCriteria(pending);
    usePilatesStore.getState().setActiveTab('atlas');
    usePilatesStore.getState().setActiveTab('workbench');
    expect(usePilatesStore.getState().draftCriteria).toEqual(pending);
    const raw = localStorage.getItem('pilates-flow-atelier-storage-v3')!;
    expect(JSON.parse(raw).state.draftCriteria).toEqual(pending);
    usePilatesStore.setState({ draftCriteria: null });
    localStorage.setItem('pilates-flow-atelier-storage-v3', raw);
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().draftCriteria).toEqual(pending);
    usePilatesStore.getState().setDraftCriteria({ ...pending, targetMinutes: 0 });
    expect(usePilatesStore.getState().draftCriteria).toEqual(pending);
  });

  it('captures immutable lesson and history conditions and restores goals and observations on replay', () => {
    const state = usePilatesStore.getState();
    state.autoGenerateSequence(criteria);
    expect(usePilatesStore.getState().lastCriteria?.availableEquipment).toEqual([
      'mat',
      'reformer',
    ]);
    const sequenceId = state.saveCurrentSequenceToBinder(true);
    const saved = usePilatesStore
      .getState()
      .savedSequences.find((sequence) => sequence.id === sequenceId)!;
    const {
      availableEquipment: requestedEquipment,
      ownedApparatus: requestedFamilies,
      ...requestedNotes
    } = criteria;
    expect(saved.criteriaSnapshot).toMatchObject(requestedNotes);
    expect(new Set(saved.criteriaSnapshot?.availableEquipment)).toEqual(
      new Set(requestedEquipment),
    );
    expect(new Set(saved.criteriaSnapshot?.ownedApparatus)).toEqual(new Set(requestedFamilies));
    const captured = structuredClone(saved.criteriaSnapshot);
    state.setDraftCriteria({
      ...criteria,
      planningGoals: ['strength'],
      instructorObservations: [],
    });
    expect(saved.criteriaSnapshot).toEqual(captured);
    state.loadSequenceIntoWorkbench(sequenceId);
    expect(usePilatesStore.getState().draftCriteria).toEqual(captured);
    state.logClassSession({
      sequenceId,
      groupId: 'class-alias',
      taughtAt: reviewedAt,
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '다음 수업 참고',
    });
    const log = usePilatesStore.getState().historyLogs[0]!;
    expect(log.criteriaSnapshot).toEqual(captured);
    state.setDraftCriteria({ ...criteria, instructorObservations: [] });
    state.loadHistoryIntoWorkbench(log.id);
    const expectedCopy = { ...captured, targetGroupId: log.groupId };
    delete expectedCopy.instructorObservations;
    expect(usePilatesStore.getState().draftCriteria).toEqual(expectedCopy);
    const backup = JSON.parse(state.exportBackup());
    expect(
      backup.data.savedSequences.find((sequence: SavedSequence) => sequence.id === sequenceId)
        .criteriaSnapshot,
    ).toEqual(captured);
    expect(backup.data.historyLogs[0].criteriaSnapshot).toEqual(captured);
  });

  it('keeps a saved program condition snapshot immutable after later form edits', () => {
    const program = CURATED_SEQUENCE_PROGRAMS.find((item) =>
      item.requiredApparatus.every((equipment) => ['mat', 'reformer', 'chair'].includes(equipment)),
    );
    expect(program).toBeDefined();
    const state = usePilatesStore.getState();
    state.applyCuratedProgram(program!.id);
    expect(usePilatesStore.getState().generationError).toBeNull();
    const generatedCriteria = structuredClone(usePilatesStore.getState().lastCriteria);
    const sequenceId = state.saveCurrentSequenceToBinder(true);
    const saved = usePilatesStore
      .getState()
      .savedSequences.find((sequence) => sequence.id === sequenceId)!;
    const {
      availableEquipment: requestedEquipment,
      ownedApparatus: requestedFamilies,
      ...requestedNotes
    } = generatedCriteria!;
    expect(saved.criteriaSnapshot).toMatchObject(requestedNotes);
    expect(new Set(saved.criteriaSnapshot?.availableEquipment)).toEqual(
      new Set(requestedEquipment),
    );
    expect(new Set(saved.criteriaSnapshot?.ownedApparatus)).toEqual(new Set(requestedFamilies));
    const captured = structuredClone(saved.criteriaSnapshot);
    state.setDraftCriteria({
      ...criteria,
      planningGoals: ['mobility'],
      instructorObservations: ['posterior-pelvic-tilt'],
    });
    expect(saved.criteriaSnapshot).toEqual(captured);
  });

  it('loads legacy lessons without condition snapshots while retaining their recorded steps', () => {
    const state = usePilatesStore.getState();
    const id = state.saveCurrentSequenceToBinder(true);
    const saved = usePilatesStore.getState().savedSequences.find((sequence) => sequence.id === id)!;
    const legacy = { ...saved, id: 'legacy-no-snapshot', criteriaSnapshot: undefined };
    usePilatesStore.setState({ savedSequences: [legacy] });
    expect(() => state.loadSequenceIntoWorkbench(legacy.id)).not.toThrow();
    expect(usePilatesStore.getState().activeSteps).toEqual(legacy.steps);
  });
});
