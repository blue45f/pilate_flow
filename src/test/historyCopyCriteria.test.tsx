import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from '../components/ClassBinderView';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { cloudBackupDataSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  ClassHistoryLog,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';
import {
  closeWorkbenchConditions,
  openWorkbenchConditions,
  openWorkbenchPlanPreview,
} from './workbenchControls';

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const productionIds = new Set(production.map((exercise) => exercise.id));
function fixture(apparatus: 'mat' | 'reformer', block: 'warmup' | 'core', loop = false) {
  const record: PilatesExercise = {
    ...syntheticPlanningExercise(apparatus, block, loop ? 'beta' : 'alpha', false),
    defaultDurationMin: 15,
    props: loop ? ['loop-band'] : ['none'],
  };
  return {
    ...record,
    review: {
      status: 'approved' as const,
      scope: 'planning-metadata' as const,
      credentialVerified: false as const,
      reviewerAlias: 'V10 synthetic QA · no professional credential',
      reviewedAt: '2026-11-04T10:00:00.000Z',
      revision: exerciseRevision(record),
    },
  };
}
const mat = fixture('mat', 'warmup');
const extraMat = fixture('mat', 'core');
const reformer = fixture('reformer', 'core');
const reformerLoop = fixture('reformer', 'core', true);
const exercises = [mat, extraMat, reformer, reformerLoop];
const groups = ['a', 'b', 'c'].map((alias) => ({
  id: `v10-group-${alias}`,
  name: `V10 합성 대상 ${alias.toUpperCase()}`,
  type: 'group' as const,
  defaultLevel: '1.0' as const,
  scheduleLabel: '',
  notes: '',
}));
const movement = (exercise = mat, minutes = 15, order = 1): SequenceStep => ({
  stepId: `v10-history-${exercise.id}-${order}`,
  order,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: minutes,
  selectedLayer: 'standard',
  explanationSec: 2,
  transitionSec: 1,
  locked: true,
  instructorNote: 'V10 합성 당시 메모 · 실제 수업 아님',
  repetitions: 8,
  sets: 2,
  sideMode: 'right-then-left',
});
const rest = (minutes = 6, order = 2): SequenceStep => ({
  kind: 'rest',
  stepId: `v10-history-rest-${order}`,
  order,
  exerciseId: '',
  blockCategory: 'core',
  durationMin: minutes,
  selectedLayer: 'standard',
  instructorNote: 'V10 합성 당시 휴식 메모',
});
const recordedCriteria: AutoGenerateCriteria = {
  apparatus: 'mixed',
  availableEquipment: ['mat', 'reformer'],
  ownedApparatus: ['mat', 'reformer'],
  preferredProps: [],
  level: '1.0',
  focusPreset: 'mobility-rehab',
  excludeDaysWindow: 14,
  defaultLayer: 'standard',
  targetMinutes: 50,
  restMinutes: 5,
  targetGroupId: groups[1].id,
  planningGoals: ['mobility'],
  instructorObservations: ['posterior-pelvic-tilt'],
};
const unrelated: AutoGenerateCriteria = {
  apparatus: 'reformer',
  availableEquipment: ['reformer'],
  ownedApparatus: ['reformer'],
  preferredProps: ['magic-circle'],
  level: '2.0',
  focusPreset: 'core-sculpt',
  excludeDaysWindow: 90,
  defaultLayer: 'hard',
  targetMinutes: 90,
  restMinutes: 0,
  targetGroupId: groups[0].id,
  planningGoals: ['strength'],
  instructorObservations: ['anterior-pelvic-tilt'],
};
const baseLog: ClassHistoryLog = {
  id: 'v10-history-source',
  sequenceId: 'v10-recorded-source-sequence',
  sequenceTitle: 'V10 합성 당시 수업',
  groupId: groups[1].id,
  groupName: groups[1].name,
  taughtAt: '2026-11-04T12:00:00.000Z',
  apparatus: 'mixed',
  level: '1.0',
  exerciseIds: [mat.id],
  rating: 3,
  intensity: 'moderate',
  instructorReflection: 'V10 합성 기록 복사 검증 · 실제 수업 아님',
  stepsSnapshot: [movement(), rest()],
  criteriaSnapshot: recordedCriteria,
  actualDurationSec: 7,
  actualRestDurationSec: 2,
};
function Journey() {
  const tab = usePilatesStore((state) => state.activeTab);
  return tab === 'history' ? (
    <ClassBinderView view="history" onOpenLogModal={vi.fn()} />
  ) : (
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />
  );
}
const assertFrozen = (before: PilatesStudioState) => {
  const after = usePilatesStore.getState();
  for (const field of [
    'historyLogs',
    'savedSequences',
    'exercises',
    'classGroups',
    'ownedApparatus',
    'ownedEquipment',
    'ownedProps',
  ] as const)
    expect(after[field]).toBe(before[field]);
};
const assertPriorDraft = (before: PilatesStudioState) => {
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

describe('history copies create matching independent current conditions', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        activeTab: 'history',
        activeSequenceId: 'v10-unrelated-draft',
        activeTitle: 'V10 현재 다른 반의 작업',
        activeSubtitle: 'V10 되돌릴 현재 부제',
        activeSteps: [movement(reformer, 10)],
        activeApparatus: 'reformer',
        activeLevel: '2.0',
        activeTargetMinutes: 90,
        activeTargetGroupId: groups[0].id,
        draftCriteria: structuredClone(unrelated),
        lastCriteria: structuredClone(unrelated),
        ownedApparatus: ['mat', 'reformer'],
        ownedEquipment: ['mat', 'reformer'],
        ownedProps: ['magic-circle', 'loop-band'],
        exercises: [...INITIAL_EXERCISES, ...exercises],
        classGroups: structuredClone(groups),
        historyLogs: [structuredClone(baseLog)],
        savedSequences: [],
        undoStack: [],
        generationError: null,
        saveFeedback: null,
        persistenceError: null,
      },
      true,
    );
    usePilatesStore.getState().saveCurrentSequenceToBinder();
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

  it('uses the real History button and shows21/6 current conditions while original50/5 and saved plans remain frozen', () => {
    const before = usePilatesStore.getState();
    const frozenLog = structuredClone(before.historyLogs[0]);
    render(<Journey />);
    fireEvent.click(screen.getByRole('button', { name: '이 수업 다시 계획' }));
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toEqual(frozenLog.stepsSnapshot);
    expect(after.activeSteps).not.toBe(frozenLog.stepsSnapshot);
    expect(after.activeTargetMinutes).toBe(21);
    expect(after.draftCriteria?.targetMinutes).toBe(21);
    expect(after.draftCriteria?.restMinutes).toBe(6);
    expect(after.activeApparatus).toBe('mat');
    expect(after.activeTargetGroupId).toBe(groups[1].id);
    expect(after.draftCriteria).toMatchObject({
      apparatus: 'mat',
      availableEquipment: ['mat'],
      ownedApparatus: ['mat'],
      preferredProps: [],
      targetMinutes: 21,
      restMinutes: 6,
      targetGroupId: groups[1].id,
      planningGoals: ['mobility'],
      instructorObservations: ['posterior-pelvic-tilt'],
    });
    expect(after.lastCriteria).toEqual(after.draftCriteria);
    expect(after.lastCriteria).not.toBe(after.draftCriteria);
    const conditions = openWorkbenchConditions();
    expect(conditions.getByRole('spinbutton', { name: '직접 지정 수업 시간' })).toHaveValue(21);
    expect(conditions.getByText('총 21분 = 동작 15분 + 휴식 6분')).toBeInTheDocument();
    expect(conditions.getByRole('checkbox', { name: '매트' })).toBeChecked();
    expect(conditions.getByRole('checkbox', { name: '리포머' })).not.toBeChecked();
    expect(conditions.getByRole('combobox', { name: '수업 별칭' })).toHaveValue(groups[1].id);
    closeWorkbenchConditions();
    assertFrozen(before);
    expect(after.historyLogs[0]).toEqual(frozenLog);
    expect(after.historyLogs[0].criteriaSnapshot).toMatchObject({
      apparatus: 'mixed',
      targetMinutes: 50,
      restMinutes: 5,
    });
    expect(after.activeSequenceId).not.toBe(before.activeSequenceId);
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    assertPriorDraft(before);
    assertFrozen(before);
  });

  it('isolates a legacy copy from another draft group/gear/private tags and permits compatible manual additions', () => {
    const legacy = {
      ...baseLog,
      apparatus: 'mat' as const,
      criteriaSnapshot: undefined,
      stepsSnapshot: undefined,
    };
    usePilatesStore.setState({ historyLogs: [legacy] });
    const before = usePilatesStore.getState();
    before.loadHistoryIntoWorkbench(legacy.id);
    let after = usePilatesStore.getState();
    expect(after.activeSteps[0].durationMin).toBe(15);
    expect(after.activeSubtitle).toContain('현재 기본값');
    expect(after.draftCriteria).toMatchObject({
      apparatus: 'mat',
      availableEquipment: ['mat'],
      preferredProps: [],
      targetMinutes: 15,
      restMinutes: 0,
      targetGroupId: groups[1].id,
      focusPreset: 'full-body',
      defaultLayer: 'standard',
      excludeDaysWindow: 14,
    });
    expect(after.draftCriteria?.planningGoals).toBeUndefined();
    expect(after.draftCriteria?.instructorObservations).toBeUndefined();
    expect(after.lastCriteria).toEqual(after.draftCriteria);
    after.appendExerciseToSequence(extraMat.id);
    after = usePilatesStore.getState();
    expect(after.generationError).toBeNull();
    expect(after.activeSteps.map((step) => step.exerciseId)).toEqual([mat.id, extraMat.id]);
    expect(after.activeSteps[1].selectedLayer).toBe('standard');
    assertFrozen(before);
    after.undoSequence();
    usePilatesStore.getState().undoSequence();
    assertPriorDraft(before);
  });

  it.each([
    { name: 'short4', copied: [movement(mat, 4)], target: 10, total: 4, restMinutes: 0 },
    {
      name: 'long130',
      copied: [movement(mat, 60), rest(10), movement(extraMat, 60, 3)],
      target: 120,
      total: 130,
      restMinutes: 10,
    },
  ])(
    'preserves $name snapshot exactly while bounding only the new target with explicit feedback and valid export',
    ({ copied, target, total, restMinutes }) => {
      const log = {
        ...baseLog,
        stepsSnapshot: copied,
        exerciseIds: copied.filter((step) => step.kind !== 'rest').map((step) => step.exerciseId),
      };
      usePilatesStore.setState({ historyLogs: [log] });
      const before = usePilatesStore.getState();
      before.loadHistoryIntoWorkbench(log.id);
      const after = usePilatesStore.getState();
      expect(after.activeSteps).toEqual(copied);
      expect(after.activeSteps.reduce((sum, step) => sum + step.durationMin, 0)).toBe(total);
      expect(after.activeTargetMinutes).toBe(target);
      expect(after.draftCriteria).toMatchObject({ targetMinutes: target, restMinutes });
      expect(after.lastCriteria).toEqual(after.draftCriteria);
      expect(after.saveFeedback).toContain('항목·시간은 그대로');
      expect(after.saveFeedback).toContain(`${target}분`);
      expect(after.saveFeedback).toContain('그대로 시작하거나 시간을 조정');
      expect(cloudBackupDataSchema.safeParse(JSON.parse(after.exportBackup()).data).success).toBe(
        true,
      );
      render(
        <SequenceWorkbench
          onOpenYouTubePreview={vi.fn()}
          onOpenClipper={vi.fn()}
          onOpenLogModal={vi.fn()}
        />,
      );
      expect(screen.getByText(after.saveFeedback!)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '수업 시작' })).not.toBeInTheDocument();
      const preview = openWorkbenchPlanPreview();
      expect(preview.getByRole('button', { name: '수업 시작' })).toBeEnabled();
      expect(screen.queryByRole('timer')).not.toBeInTheDocument();
      assertFrozen(before);
      expect(after.historyLogs[0].criteriaSnapshot?.targetMinutes).toBe(50);
    },
  );

  it('rejects unrepresentable130-minute rest atomically instead of creating an invalid backup draft', () => {
    const log = { ...baseLog, exerciseIds: [], stepsSnapshot: [rest(120, 1), rest(10, 2)] };
    usePilatesStore.setState({
      historyLogs: [log],
      generationError: 'V10 다른 작업에서 남은 이전 오류',
    });
    const before = usePilatesStore.getState();
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이 수업 다시 계획' }));
    const after = usePilatesStore.getState();
    expect(screen.getByRole('alert')).toHaveTextContent(/휴식 합계.*지원/);
    expect(screen.getByRole('alert')).not.toHaveTextContent('다른 작업에서 남은 이전 오류');
    expect(after.generationError).toMatch(/휴식 합계.*지원/);
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
    ] as const)
      expect(after[field]).toBe(before[field]);
    assertFrozen(before);
    expect(cloudBackupDataSchema.safeParse(JSON.parse(after.exportBackup()).data).success).toBe(
      true,
    );
  });

  it('retains required unowned gear without expanding inventory and drops only cross-group copied observations', () => {
    const source = {
      ...recordedCriteria,
      apparatus: 'reformer' as const,
      availableEquipment: ['reformer'],
      ownedApparatus: ['reformer' as const],
      preferredProps: ['loop-band' as const],
      targetGroupId: groups[2].id,
    };
    const log = {
      ...baseLog,
      apparatus: 'reformer' as const,
      exerciseIds: [reformerLoop.id],
      stepsSnapshot: [movement(reformerLoop), rest()],
      criteriaSnapshot: source,
    };
    usePilatesStore.setState({
      historyLogs: [log],
      ownedApparatus: ['mat'],
      ownedEquipment: ['mat'],
      ownedProps: [],
    });
    const before = usePilatesStore.getState();
    const frozenSource = structuredClone(log);
    before.loadHistoryIntoWorkbench(log.id);
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toEqual(log.stepsSnapshot);
    expect(after.draftCriteria).toMatchObject({
      apparatus: 'reformer',
      availableEquipment: ['reformer'],
      ownedApparatus: ['reformer'],
      preferredProps: ['loop-band'],
      targetMinutes: 21,
      restMinutes: 6,
      targetGroupId: groups[1].id,
      planningGoals: ['mobility'],
    });
    expect(after.draftCriteria?.instructorObservations).toBeUndefined();
    expect(after.lastCriteria).toEqual(after.draftCriteria);
    assertFrozen(before);
    expect(after.ownedEquipment).toEqual(['mat']);
    expect(after.ownedProps).toEqual([]);
    expect(after.historyLogs[0]).toEqual(frozenSource);
    expect(after.historyLogs[0].criteriaSnapshot?.instructorObservations).toEqual([
      'posterior-pelvic-tilt',
    ]);
  });
});
