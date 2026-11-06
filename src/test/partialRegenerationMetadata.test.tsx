import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  DifficultyLevel,
  SequenceStep,
} from '../types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { getSequenceDurations } from '../utils/sequenceEngine';
import { syntheticPlanningExercise } from './planningFixtures';
import { closeWorkbenchConditions, openWorkbenchConditions } from './workbenchControls';

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const productionIds = new Set(production.map((exercise) => exercise.id));
function planningFixture(
  apparatus: ApparatusType,
  block: ClassBlockCategory,
  variant: 'alpha' | 'beta' = 'alpha',
  level: DifficultyLevel = '1.0',
) {
  const record = { ...syntheticPlanningExercise(apparatus, block, variant, false), level };
  return {
    ...record,
    review: {
      status: 'approved' as const,
      scope: 'planning-metadata' as const,
      credentialVerified: false as const,
      reviewerAlias: 'V9 synthetic planning QA · no professional credential',
      reviewedAt: '2026-11-05T08:00:00.000Z',
      revision: exerciseRevision(record),
    },
  };
}
const fixtures = [
  planningFixture('mat', 'warmup'),
  planningFixture('mat', 'core'),
  planningFixture('mat', 'core', 'beta'),
  planningFixture('mat', 'lower-body'),
  planningFixture('mat', 'cooldown'),
  planningFixture('reformer', 'core', 'alpha', '1.5'),
  planningFixture('reformer', 'core', 'beta', '1.5'),
];
const exerciseStep = (fixtureIndex: number, order: number, durationMin: number): SequenceStep => ({
  stepId: `v9-original-step-${order}`,
  order,
  exerciseId: fixtures[fixtureIndex].id,
  blockCategory: fixtures[fixtureIndex].blockCategory,
  durationMin,
  selectedLayer: 'standard',
  explanationSec: 20,
  transitionSec: 10,
});
const steps: SequenceStep[] = [
  exerciseStep(0, 1, 6),
  {
    ...exerciseStep(1, 2, 4),
    locked: true,
    instructorNote: 'V9 합성 잠금 메모 · 실제 운동 지시 아님',
    customSpringOverride: 'V9 합성 이번 계획 설정',
    repetitions: 8,
    sets: 2,
    sideMode: 'right-then-left',
  },
  {
    kind: 'rest',
    stepId: 'v9-original-rest',
    order: 3,
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 4,
    selectedLayer: 'standard',
    instructorNote: 'V9 합성 휴식 메모',
  },
  exerciseStep(2, 4, 15),
  exerciseStep(3, 5, 15),
  exerciseStep(4, 6, 6),
];
const groups = ['a', 'b'].map((alias) => ({
  id: `v9-group-${alias}`,
  name: `V9 합성 대상 ${alias.toUpperCase()}`,
  type: 'group' as const,
  defaultLevel: '1.0' as const,
  scheduleLabel: '',
  notes: '합성 QA 대상 · 실명 아님',
}));
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: [],
  level: '1.0',
  targetMinutes: 50,
  restMinutes: 4,
  focusPreset: 'full-body',
  excludeDaysWindow: 0,
  defaultLayer: 'standard',
  targetGroupId: groups[0].id,
};
const title = 'V9 사용자가 쓴 합성 수업 제목';
const subtitle = 'V9 사용자가 쓴 부제 · 자동 변경 금지';
const assertRetained = (before: PilatesStudioState, after: PilatesStudioState) => {
  for (const index of [0, 1, 2, 5]) {
    expect(after.activeSteps[index]).toBe(before.activeSteps[index]);
    expect(after.activeSteps[index]).toEqual(steps[index]);
  }
  expect(after.activeTitle).toBe(title);
  expect(after.activeSubtitle).toBe(subtitle);
};
const assertDraftRestored = (before: PilatesStudioState) => {
  const after = usePilatesStore.getState();
  for (const field of [
    'activeSequenceId',
    'activeTitle',
    'activeSubtitle',
    'activeSteps',
    'activeApparatus',
    'activeLevel',
    'activeTargetMinutes',
    'activeTargetGroupId',
    'draftCriteria',
    'lastCriteria',
  ] as const)
    expect(after[field]).toEqual(before[field]);
  expect(after.undoStack).toHaveLength(before.undoStack.length);
};

describe('partial regeneration commits validated class metadata', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        activeTab: 'workbench',
        activeSequenceId: 'v9-original-draft',
        activeTitle: title,
        activeSubtitle: subtitle,
        activeSteps: structuredClone(steps),
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        activeTargetGroupId: groups[0].id,
        draftCriteria: structuredClone(criteria),
        lastCriteria: structuredClone(criteria),
        exercises: [...INITIAL_EXERCISES, ...fixtures],
        classGroups: structuredClone(groups),
        ownedApparatus: ['mat', 'reformer'],
        ownedEquipment: ['mat', 'reformer'],
        ownedProps: [],
        savedSequences: [],
        historyLogs: [],
        conditionTemplates: [],
        instructorSchedule: { locations: [], classes: [], exceptions: [] },
        undoStack: [],
        generationError: null,
        saveFeedback: null,
        persistenceError: null,
      },
      true,
    );
  });
  afterEach(() => {
    cleanup();
    expect(INITIAL_EXERCISES).toEqual(production);
    expect(
      usePilatesStore.getState().exercises.filter((exercise) => productionIds.has(exercise.id)),
    ).toEqual(production);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    usePilatesStore.setState(original, true);
    localStorage.clear();
  });

  it('uses actual Workbench mixed-gear/max-level controls and preserves metadata in save/export and Undo', () => {
    render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );
    const conditionForm = openWorkbenchConditions();
    fireEvent.click(conditionForm.getByRole('checkbox', { name: '리포머' }));
    fireEvent.change(conditionForm.getByRole('combobox', { name: '최대 난이도' }), {
      target: { value: '1.5' },
    });
    fireEvent.change(conditionForm.getByRole('combobox', { name: '수업 별칭' }), {
      target: { value: groups[1].id },
    });
    closeWorkbenchConditions();
    const before = usePilatesStore.getState();
    expect(before.draftCriteria).toMatchObject({
      apparatus: 'mixed',
      availableEquipment: ['mat', 'reformer'],
      level: '1.5',
      targetGroupId: groups[1].id,
    });
    expect(before.activeApparatus).toBe('mat');
    expect(before.activeLevel).toBe('1.0');
    fireEvent.change(screen.getByRole('combobox', { name: '다시 만들 구간' }), {
      target: { value: 'main' },
    });
    fireEvent.click(screen.getByRole('button', { name: '잠그지 않은 동작 다시 만들기' }));
    const after = usePilatesStore.getState();
    expect(after.generationError).toBeNull();
    expect(
      after.activeSteps.some(
        (step) =>
          fixtures.find((exercise) => exercise.id === step.exerciseId)?.apparatus === 'reformer',
      ),
    ).toBe(true);
    expect(
      after.activeSteps.some(
        (step) => fixtures.find((exercise) => exercise.id === step.exerciseId)?.level === '1.5',
      ),
    ).toBe(true);
    expect(after.activeApparatus).toBe('mixed');
    expect(after.activeLevel).toBe('1.5');
    expect(after.activeTargetMinutes).toBe(50);
    expect(after.activeTargetGroupId).toBe(groups[1].id);
    expect(getSequenceDurations(after.activeSteps)).toEqual({
      totalSec: 3000,
      exerciseSec: 2760,
      restSec: 240,
    });
    assertRetained(before, after);
    expect(after.undoStack).toHaveLength(1);
    fireEvent.click(
      within(screen.getByRole('region', { name: '오늘의 시퀀스' })).getByRole('button', {
        name: '저장',
      }),
    );
    const savedState = usePilatesStore.getState();
    const saved = savedState.savedSequences.find(
      (sequence) => sequence.id === savedState.activeSequenceId,
    )!;
    expect(saved).toMatchObject({
      title,
      subtitle,
      apparatus: 'mixed',
      level: '1.5',
      targetMinutes: 50,
    });
    expect(saved.criteriaSnapshot).toMatchObject({
      apparatus: 'mixed',
      level: '1.5',
      targetGroupId: groups[1].id,
    });
    const exported = JSON.parse(savedState.exportBackup());
    expect(
      exported.data.savedSequences.find((sequence: { id: string }) => sequence.id === saved.id),
    ).toEqual(saved);
    expect(exported.data.historyLogs).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    assertDraftRestored(before);
    expect(usePilatesStore.getState().savedSequences).toEqual(savedState.savedSequences);
  });

  it('honors an explicit sixty-minute store request after template apply while preserving current UI time policy', () => {
    const templateCriteria = { ...criteria, targetMinutes: 60, targetGroupId: groups[1].id };
    usePilatesStore.setState({
      conditionTemplates: [
        {
          id: 'v9-template60',
          name: 'V9 합성60분 조건',
          criteria: templateCriteria,
          createdAt: '2026-11-05T08:00:00.000Z',
        },
      ],
    });
    usePilatesStore.getState().applyConditionTemplate('v9-template60');
    const before = usePilatesStore.getState();
    expect(before.activeTargetMinutes).toBe(50);
    expect(before.activeSteps).toEqual(steps);
    expect(before.draftCriteria?.targetMinutes).toBe(60);
    // Explicit store/API contract; the unchanged Workbench button passes activeTargetMinutes.
    before.regenerateUnlocked(before.draftCriteria!, 'main');
    const after = usePilatesStore.getState();
    expect(after.generationError).toBeNull();
    expect(getSequenceDurations(after.activeSteps).totalSec).toBe(3600);
    expect(after.activeTargetMinutes).toBe(60);
    expect(after.activeTargetGroupId).toBe(groups[1].id);
    expect(after.lastCriteria?.targetMinutes).toBe(60);
    assertRetained(before, after);
    expect(after.activeSteps[3].durationMin).toBe(20);
    expect(after.activeSteps[4].durationMin).toBe(20);
    after.undoSequence();
    assertDraftRestored(before);
    expect(usePilatesStore.getState().conditionTemplates).toBe(before.conditionTemplates);
  });

  it('rejects incompatible retained steps before committing any class metadata or Undo', () => {
    const before = usePilatesStore.getState();
    before.regenerateUnlocked(
      {
        ...criteria,
        apparatus: 'reformer',
        availableEquipment: ['reformer'],
        ownedApparatus: ['reformer'],
        level: '1.5',
        targetMinutes: 60,
        targetGroupId: groups[1].id,
      },
      'main',
    );
    const after = usePilatesStore.getState();
    expect(after.generationError).toMatch(/유지할 항목/);
    for (const field of [
      'activeSequenceId',
      'activeTitle',
      'activeSubtitle',
      'activeSteps',
      'activeApparatus',
      'activeLevel',
      'activeTargetMinutes',
      'activeTargetGroupId',
      'draftCriteria',
      'lastCriteria',
      'undoStack',
      'savedSequences',
      'historyLogs',
      'classGroups',
      'exercises',
      'conditionTemplates',
    ] as const)
      expect(after[field]).toBe(before[field]);
  });
});
