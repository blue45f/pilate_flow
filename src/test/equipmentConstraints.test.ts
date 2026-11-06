import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getExerciseAvailability, getExerciseEquipment } from '../data/equipmentCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, PilatesExercise, PropType } from '../types/pilates';
import { exerciseMatchesCriteria, generateOptimal50MinSequence } from '../utils/sequenceEngine';
import { exerciseRevision } from '../utils/exerciseReview';

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
      reviewedAt: '2026-11-04T10:00:00.000Z',
      revision: exerciseRevision(record),
    },
  };
}

const families = ['reformer', 'cadillac', 'chair', 'barrel', 'mat'] as const;
const criteria: AutoGenerateCriteria = {
  apparatus: 'mixed',
  ownedApparatus: [...families],
  availableEquipment: ['mat', 'reformer', 'chair', 'cadillac', 'barrel'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: [],
  excludeDaysWindow: 0,
  targetMinutes: 50,
  defaultLayer: 'standard',
};

function exercise(overrides: Partial<PilatesExercise> = {}): PilatesExercise {
  return {
    ...INITIAL_EXERCISES[0]!,
    id: 'legacy-equipment-fixture',
    nameKo: '장비 조건 테스트',
    nameEn: 'Equipment fixture',
    apparatus: 'mat',
    props: ['none'],
    level: '1.0',
    requiredEquipment: undefined,
    isCustom: undefined,
    ...overrides,
  };
}

describe('shared apparatus and prop requirements', () => {
  it('keeps legacy family metadata usable without inferring variants from movement or video names', () => {
    const legacy = exercise({
      apparatus: 'cadillac',
      nameKo: '공식 타워 · 래더 바렐 · 스파인 코렉터 수업',
      nameEn: 'Verified Tower Ladder Barrel Spine Corrector',
      youtube: {
        ...INITIAL_EXERCISES[0]!.youtube,
        videoTitle: 'Official verified tower lesson',
      },
    });
    expect(getExerciseEquipment(legacy)).toMatchObject({
      requiredEquipment: ['cadillac'],
      requiredProps: [],
      requirementsKnown: true,
      metadataStatus: 'unverified',
    });
  });

  it('distinguishes authored planning metadata and user-entered metadata from verified media', () => {
    const original = INITIAL_EXERCISES.find((item) => item.id.startsWith('original-'))!;
    expect(getExerciseEquipment(original).metadataStatus).toBe('original-planning');
    expect(
      getExerciseEquipment(exercise({ id: 'custom-fixture', isCustom: true })).metadataStatus,
    ).toBe('user-entered');
    expect(getExerciseEquipment(exercise()).metadataStatus).toBe('unverified');
  });

  it('requires every exact item for combined apparatus requirements', () => {
    const combined = exercise({ apparatus: 'cadillac', requiredEquipment: ['mat', 'tower'] });
    expect(getExerciseEquipment(combined)).toMatchObject({
      requiredEquipment: ['mat', 'tower'],
      requirementsKnown: true,
    });
    expect(exerciseMatchesCriteria(combined, { ...criteria, availableEquipment: ['mat'] })).toBe(
      false,
    );
    expect(exerciseMatchesCriteria(combined, { ...criteria, availableEquipment: ['tower'] })).toBe(
      false,
    );
    expect(
      exerciseMatchesCriteria(combined, { ...criteria, availableEquipment: ['mat', 'tower'] }),
    ).toBe(true);
  });

  it.each([
    ['tower', 'cadillac'],
    ['ladder-barrel', 'barrel'],
    ['spine-corrector', 'barrel'],
  ] as const)('does not substitute family equipment %s with %s', (specific, family) => {
    const exact = exercise({ apparatus: family, requiredEquipment: [specific] });
    expect(exerciseMatchesCriteria(exact, { ...criteria, availableEquipment: [family] })).toBe(
      false,
    );
    expect(exerciseMatchesCriteria(exact, { ...criteria, availableEquipment: [specific] })).toBe(
      true,
    );
  });

  it.each([{ requiredEquipment: [] }, { requiredEquipment: ['unknown-apparatus'] }])(
    'does not claim feasibility for unknown requirements %j',
    ({ requiredEquipment }) => {
      const unknown = exercise({ requiredEquipment });
      expect(getExerciseEquipment(unknown).requirementsKnown).toBe(false);
      expect(
        exerciseMatchesCriteria(unknown, {
          ...criteria,
          availableEquipment: [...criteria.availableEquipment!, 'unknown-apparatus'],
        }),
      ).toBe(false);
    },
  );

  it('reports every missing item using the shared availability helper and never marks unknown metadata possible', () => {
    const combined = exercise({
      requiredEquipment: ['mat', 'tower'],
      props: ['loop-band', 'dumbbell'],
    });
    expect(getExerciseAvailability(combined, ['mat'], ['dumbbell'])).toMatchObject({
      possible: false,
      requirementsKnown: true,
      missingEquipment: ['tower'],
      missingProps: ['loop-band'],
    });
    expect(
      getExerciseAvailability(combined, ['mat', 'tower'], ['loop-band', 'dumbbell']).possible,
    ).toBe(true);
    expect(
      getExerciseAvailability(
        exercise({ requiredEquipment: ['unrecognized'] }),
        ['unrecognized'],
        [],
      ).possible,
    ).toBe(false);
    expect(getExerciseAvailability(exercise({ requiredEquipment: [] }), ['mat'], []).possible).toBe(
      false,
    );
    expect(getExerciseAvailability(exercise(), ['unrecognized'], []).possible).toBe(false);
  });

  it('retains legacy apparatus and owned-apparatus filtering when new availability is absent', () => {
    const mat = exercise();
    const legacyCriteria = {
      ...criteria,
      availableEquipment: undefined,
      apparatus: 'mat' as const,
      ownedApparatus: ['mat' as const],
    };
    expect(exerciseMatchesCriteria(mat, legacyCriteria)).toBe(true);
    expect(exerciseMatchesCriteria(exercise({ apparatus: 'reformer' }), legacyCriteria)).toBe(
      false,
    );
    expect(
      exerciseMatchesCriteria(mat, {
        ...legacyCriteria,
        apparatus: 'mixed',
        ownedApparatus: ['reformer'],
      }),
    ).toBe(false);
  });

  it('does not fall back to broad legacy ownership when exact availability is explicitly empty or unknown', () => {
    expect(exerciseMatchesCriteria(exercise(), { ...criteria, availableEquipment: [] })).toBe(
      false,
    );
    expect(
      exerciseMatchesCriteria(exercise(), { ...criteria, availableEquipment: ['unrecognized'] }),
    ).toBe(false);
  });

  it('still respects an explicitly requested family within equipment availability', () => {
    const tower = exercise({ apparatus: 'cadillac', requiredEquipment: ['tower'] });
    expect(
      exerciseMatchesCriteria(tower, {
        ...criteria,
        apparatus: 'mat',
        availableEquipment: ['mat', 'tower'],
      }),
    ).toBe(false);
  });

  it('requires every prop and keeps ball sizes and elastic-band types distinct', () => {
    const requiredProps: PropType[] = [
      'fitness-ball',
      'loop-band',
      'dumbbell',
      'sliders',
      'yoga-block',
    ];
    const combined = exercise({ props: requiredProps });
    expect(getExerciseEquipment(combined).requiredProps).toEqual(requiredProps);
    expect(exerciseMatchesCriteria(combined, { ...criteria, preferredProps: requiredProps })).toBe(
      true,
    );
    for (const prop of requiredProps) {
      expect(
        exerciseMatchesCriteria(combined, {
          ...criteria,
          preferredProps: requiredProps.filter((owned) => owned !== prop),
        }),
      ).toBe(false);
    }
    expect(
      exerciseMatchesCriteria(exercise({ props: ['fitness-ball'] }), {
        ...criteria,
        preferredProps: ['mini-ball'],
      }),
    ).toBe(false);
    for (const band of ['loop-band', 'tube-band', 'long-band'] as const) {
      expect(
        exerciseMatchesCriteria(exercise({ props: [band] }), {
          ...criteria,
          preferredProps: ['theraband'],
        }),
      ).toBe(false);
      expect(
        exerciseMatchesCriteria(exercise({ props: [band] }), {
          ...criteria,
          preferredProps: [band],
        }),
      ).toBe(true);
    }
  });

  it('excludes unavailable combined equipment during generation and fits the same valid request', () => {
    const combined = approved(
      exercise({ id: 'approved-combined-fixture', requiredEquipment: ['mat', 'tower'] }),
    );
    expect(() =>
      generateOptimal50MinSequence({ ...criteria, availableEquipment: ['mat'] }, [combined], []),
    ).toThrow();
    const steps = generateOptimal50MinSequence(
      { ...criteria, availableEquipment: ['mat', 'tower'], targetMinutes: 15 },
      [combined],
      [],
    );
    expect(steps.every((step) => step.exerciseId === combined.id)).toBe(true);
    expect(steps.reduce((sum, step) => sum + step.durationMin, 0)).toBeCloseTo(15, 8);
    expect(steps).toHaveLength(1);
  });
});

const originalStore = usePilatesStore.getState();

describe('equipment ownership persistence and safe backup merge', () => {
  beforeEach(() => {
    usePilatesStore.setState(
      {
        ...originalStore,
        ownedApparatus: ['mat', 'reformer'],
        ownedEquipment: ['mat', 'reformer'],
        ownedProps: [],
        activeSteps: [],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        lastCriteria: null,
      },
      true,
    );
  });

  afterEach(() => {
    usePilatesStore.setState(originalStore, true);
  });

  it('does not assume ownership of newly distinguished apparatus variants', () => {
    expect(originalStore.ownedEquipment).toEqual(expect.arrayContaining([...families]));
    expect(originalStore.ownedEquipment).not.toEqual(expect.arrayContaining(['tower']));
    expect(originalStore.ownedEquipment).not.toEqual(expect.arrayContaining(['ladder-barrel']));
    expect(originalStore.ownedEquipment).not.toEqual(expect.arrayContaining(['spine-corrector']));
  });

  it('toggles equipment and props independently and retains exact subtype IDs', () => {
    const store = usePilatesStore.getState();
    store.toggleOwnedEquipment('tower');
    store.toggleOwnedProp('loop-band');
    store.toggleOwnedProp('dumbbell');
    expect(usePilatesStore.getState().ownedEquipment).toContain('tower');
    expect(usePilatesStore.getState().ownedProps).toEqual(
      expect.arrayContaining(['loop-band', 'dumbbell']),
    );
    expect(usePilatesStore.getState().ownedProps).not.toContain('tube-band');
    store.toggleOwnedEquipment('tower');
    store.toggleOwnedProp('loop-band');
    expect(usePilatesStore.getState().ownedEquipment).not.toContain('tower');
    expect(usePilatesStore.getState().ownedProps).toEqual(['dumbbell']);
  });

  it('roundtrips exact custom requirements and merges owned items without deleting current ownership', () => {
    const custom = exercise({
      id: 'custom-combined-backup',
      isCustom: true,
      requiredEquipment: ['mat', 'tower'],
      props: ['sliders', 'loop-band'],
    });
    usePilatesStore.setState({
      exercises: [...originalStore.exercises, custom],
      ownedEquipment: ['mat', 'tower'],
      ownedProps: ['sliders', 'loop-band'],
    });
    const backup = usePilatesStore.getState().exportBackup();
    usePilatesStore.setState({
      exercises: originalStore.exercises,
      ownedEquipment: ['reformer'],
      ownedProps: ['dumbbell'],
    });
    const result = usePilatesStore.getState().restoreBackup(backup);
    expect(result.success).toBe(true);
    expect(
      usePilatesStore.getState().exercises.find((item) => item.id === custom.id)?.requiredEquipment,
    ).toEqual(['mat', 'tower']);
    expect(
      usePilatesStore.getState().exercises.find((item) => item.id === custom.id)?.props,
    ).toEqual(['sliders', 'loop-band']);
    expect(usePilatesStore.getState().ownedEquipment).toEqual(
      expect.arrayContaining(['mat', 'tower', 'reformer']),
    );
    expect(usePilatesStore.getState().ownedProps).toEqual(
      expect.arrayContaining(['sliders', 'loop-band', 'dumbbell']),
    );
  });

  it('preserves a draft when generation requests equipment or props that are not actually owned', () => {
    const combined = exercise({ requiredEquipment: ['mat', 'tower'], props: ['loop-band'] });
    usePilatesStore.setState({ exercises: [combined], ownedEquipment: ['mat'], ownedProps: [] });
    const state = usePilatesStore.getState();
    const before = structuredClone(state.activeSteps);
    state.autoGenerateSequence({
      ...criteria,
      availableEquipment: ['mat', 'tower'],
      preferredProps: ['loop-band'],
    });
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
    expect(usePilatesStore.getState().generationError).toEqual(expect.any(String));
  });

  it('migrates explicitly selected legacy props without inventing band or ball variants', async () => {
    localStorage.setItem(
      'pilates-flow-atelier-storage-v3',
      JSON.stringify({
        state: {
          ownedApparatus: ['mat'],
          lastCriteria: {
            ...criteria,
            availableEquipment: undefined,
            ownedApparatus: ['mat'],
            preferredProps: ['none', 'mini-ball', 'theraband'],
          },
        },
        version: 0,
      }),
    );
    await usePilatesStore.persist.rehydrate();
    const props = usePilatesStore.getState().ownedProps;
    expect(props).toEqual(expect.arrayContaining(['mini-ball', 'theraband']));
    expect(props).not.toContain('none');
    expect(props).not.toContain('fitness-ball');
    expect(props).not.toContain('loop-band');
  });

  it('hydrates older saved ownership without assuming new variants or new prop types', async () => {
    localStorage.setItem(
      'pilates-flow-atelier-storage-v3',
      JSON.stringify({
        state: { ownedApparatus: ['mat', 'barrel'], exercises: originalStore.exercises },
        version: 0,
      }),
    );
    await usePilatesStore.persist.rehydrate();
    const state = usePilatesStore.getState();
    expect(state.ownedEquipment).toEqual(expect.arrayContaining(['mat', 'barrel']));
    expect(state.ownedEquipment).not.toContain('reformer');
    expect(state.ownedEquipment).not.toContain('tower');
    expect(state.ownedEquipment).not.toContain('ladder-barrel');
    expect(state.ownedEquipment).not.toContain('spine-corrector');
    expect(state.ownedProps).not.toContain('fitness-ball');
    expect(state.ownedProps).not.toContain('loop-band');
    expect(typeof state.toggleOwnedEquipment).toBe('function');
  });
});
