import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryPreview } from './RecoveryPreview';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SavedSequence, SequenceStep } from '../types/pilates';

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const currentStep: SequenceStep = {
  stepId: 'qa-private-working',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: 'core',
  durationMin: 5,
  selectedLayer: 'standard',
  locked: true,
  instructorNote: 'PRIVATE_CURRENT_CUE',
};
function backup(count = 1) {
  const sequence: SavedSequence = {
    id: 'qa-file-plan',
    title: 'PRIVATE_FILE_TITLE',
    subtitle: 'PRIVATE_SUBTITLE',
    apparatus: 'mat',
    level: '1.0',
    focusTags: [],
    targetMinutes: 50,
    createdAt: '',
    updatedAt: '',
    taughtCount: 0,
    steps: [{ ...currentStep, durationMin: 50, instructorNote: 'PRIVATE_IMPORTED_CUE' }],
  };
  return JSON.stringify({
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: '2026-11-05T01:00:00.000Z',
    data: {
      exercises: [exercise],
      savedSequences: Array.from({ length: count }, (_, index) => ({
        ...sequence,
        id: `qa-file-plan-${index}`,
      })),
      classGroups: [],
      historyLogs: [],
    },
  });
}
function select(raw: string, name = 'PRIVATE_FILENAME.json') {
  const file = new File([raw], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue(raw) });
  fireEvent.change(screen.getByLabelText('백업 JSON 파일 선택'), { target: { files: [file] } });
  return file;
}
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    exercises: [structuredClone(exercise)],
    savedSequences: [],
    classGroups: [],
    historyLogs: [],
    conditionTemplates: [],
    instructorSchedule: createEmptyInstructorSchedule(),
    instructorStudyState: undefined,
    datedSequencePlanning: undefined,
    ownedEquipment: ['mat'],
    ownedApparatus: ['mat'],
    ownedProps: [],
    activeSteps: [structuredClone(currentStep)],
    lastCriteria: null,
    draftCriteria: null,
    undoStack: [],
    saveFeedback: null,
  }),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('count-only file recovery preflight', () => {
  it('does not alter data on file choice, hides raw private content and applies only after the restore click', async () => {
    render(<RecoveryPreview />);
    const before = usePilatesStore.getState();
    select(backup());
    expect(await screen.findByRole('region', { name: '복구 전 확인' })).toBeInTheDocument();
    expect(screen.getByText(/새로 추가 1개/)).toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE_/)).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: '이 내용으로 복원 적용' }));
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
    expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    expect(screen.queryByRole('region', { name: '복구 전 확인' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '백업 불러오기' })).toHaveFocus();
  });

  it('requires reinspection after current records change and preserves the newer working draft', async () => {
    render(<RecoveryPreview />);
    select(backup());
    await screen.findByRole('region', { name: '복구 전 확인' });
    act(() =>
      usePilatesStore.setState({
        activeSteps: [{ ...currentStep, instructorNote: 'PRIVATE_NEWER_WORK' }],
      }),
    );
    expect(screen.getByRole('button', { name: '이 내용으로 복원 적용' })).toBeDisabled();
    expect(screen.getByText(/검토 후 현재 자료가 달라졌습니다/)).toBeInTheDocument();
    const newer = usePilatesStore.getState().activeSteps;
    fireEvent.click(screen.getByRole('button', { name: '현재 자료로 다시 검토' }));
    expect(screen.getByRole('button', { name: '이 내용으로 복원 적용' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '이 내용으로 복원 적용' }));
    expect(usePilatesStore.getState().activeSteps).toBe(newer);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
  });

  it('shows a bounded format error and allows choosing the same file again; cancel is read-only', async () => {
    render(<RecoveryPreview />);
    const before = usePilatesStore.getState();
    select(
      JSON.stringify({
        format: 'PRIVATE_FOREIGN',
        version: 3,
        data: { PRIVATE_FIELD: 'PRIVATE_VALUE' },
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '지원하는 Pilates Flow 백업 형식이 아닙니다',
    );
    expect(screen.queryByText(/PRIVATE_/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '이 내용으로 복원 적용' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('백업 JSON 파일 선택')).toHaveValue('');
    select(backup());
    await screen.findByRole('button', { name: '복원 취소' });
    fireEvent.click(screen.getByRole('button', { name: '복원 취소' }));
    expect(usePilatesStore.getState()).toBe(before);
    expect(screen.getByRole('button', { name: '백업 불러오기' })).toHaveFocus();
  });

  it('ignores a stale file-read result after a second file was selected', async () => {
    render(<RecoveryPreview />);
    let resolveFirst!: (value: string) => void;
    const first = new File(['pending'], 'first.json', { type: 'application/json' });
    Object.defineProperty(first, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
    });
    fireEvent.change(screen.getByLabelText('백업 JSON 파일 선택'), { target: { files: [first] } });
    select(backup(2), 'second.json');
    await screen.findByText(/새로 추가 2개/);
    await act(async () => resolveFirst(backup(1)));
    await waitFor(() => expect(screen.getByText(/새로 추가 2개/)).toBeInTheDocument());
    expect(usePilatesStore.getState().savedSequences).toHaveLength(0);
  });
  it('discloses empty condition backfill before Apply while keeping current blocks/title/group/time', async () => {
    usePilatesStore.setState({
      activeSteps: [],
      draftCriteria: null,
      lastCriteria: null,
      activeTitle: '현재 빈 수업',
      activeTargetGroupId: 'qa-current-group',
      activeTargetMinutes: 50,
    });
    const before = usePilatesStore.getState();
    const value = JSON.parse(backup(0));
    const condition = {
      apparatus: 'mat',
      availableEquipment: ['mat'],
      level: '1.5',
      focusPreset: 'full-body',
      preferredProps: [],
      excludeDaysWindow: 0,
      targetMinutes: 60,
      defaultLayer: 'hard',
      targetGroupId: 'PRIVATE_OLD_GROUP',
      instructorObservations: ['posterior-pelvic-tilt'],
    };
    value.data.draftCriteria = condition;
    value.data.lastCriteria = condition;
    render(<RecoveryPreview />);
    select(JSON.stringify(value));
    await screen.findByRole('region', { name: '복구 전 확인' });
    expect(
      screen.getByText(/블록이 없는 작업대의 비어 있는 수업 조건·최근 조건을 백업 값으로 채웁니다/),
    ).toBeInTheDocument();
    expect(screen.getByText(/백업 값으로 채웁니다.*\(2개\)/)).toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE_|posterior-pelvic-tilt/)).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: '이 내용으로 복원 적용' }));
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.activeTargetGroupId).toBe(before.activeTargetGroupId);
    expect(after.activeTargetMinutes).toBe(50);
    expect(after.draftCriteria).toEqual(condition);
    expect(after.lastCriteria).toEqual(condition);
  });
});
