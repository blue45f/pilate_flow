import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from '../components/ClassBinderView';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, ClassHistoryLog, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const first = syntheticPlanningExercise('mat', 'warmup');
const last = syntheticPlanningExercise('mat', 'cooldown');
const steps: SequenceStep[] = [
  {
    stepId: 'binder-first',
    order: 1,
    blockCategory: 'warmup',
    exerciseId: first.id,
    durationMin: 25,
    selectedLayer: 'standard',
  },
  {
    stepId: 'binder-rest-one',
    order: 2,
    kind: 'rest',
    blockCategory: 'core',
    exerciseId: '',
    durationMin: 5,
    selectedLayer: 'standard',
    locked: true,
  },
  {
    stepId: 'binder-last',
    order: 3,
    blockCategory: 'cooldown',
    exerciseId: last.id,
    durationMin: 25,
    selectedLayer: 'standard',
  },
  {
    stepId: 'binder-rest-two',
    order: 4,
    kind: 'rest',
    blockCategory: 'core',
    exerciseId: '',
    durationMin: 5,
    selectedLayer: 'standard',
  },
];
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 0,
  targetMinutes: 60,
  defaultLayer: 'standard',
  restMinutes: 10,
};
const group = {
  id: 'binder-test-group',
  name: '합성 저장 검증 반',
  type: 'group' as const,
  defaultLevel: '1.0' as const,
  scheduleLabel: '',
  notes: '',
};
const log: ClassHistoryLog = {
  id: 'binder-test-log',
  sequenceId: 'binder-test-sequence',
  sequenceTitle: '휴식 포함 기록 테스트',
  groupId: group.id,
  groupName: group.name,
  taughtAt: '2026-11-04T13:00:00.000Z',
  apparatus: 'mat',
  level: '1.0',
  exerciseIds: [first.id, last.id],
  rating: 4,
  intensity: 'moderate',
  instructorReflection: '합성 수업 기록입니다.',
  stepsSnapshot: structuredClone(steps),
  criteriaSnapshot: criteria,
};
const createUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const revokeUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
let exportedBlob: Blob | undefined;

beforeEach(() => {
  exportedBlob = undefined;
  usePilatesStore.setState(
    {
      ...original,
      exercises: [...INITIAL_EXERCISES, first, last],
      activeSteps: structuredClone(steps),
      activeTitle: '휴식 포함 저장 테스트',
      activeSubtitle: '',
      activeSequenceId: 'binder-test-sequence',
      activeTargetMinutes: 60,
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetGroupId: group.id,
      classGroups: [group],
      savedSequences: [],
      historyLogs: [],
      conditionTemplates: [],
      lastCriteria: criteria,
      draftCriteria: criteria,
      generationError: null,
      saveFeedback: null,
    },
    true,
  );
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return 'blob:rest-binder-test';
    }),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (createUrlDescriptor) Object.defineProperty(URL, 'createObjectURL', createUrlDescriptor);
  else Reflect.deleteProperty(URL, 'createObjectURL');
  if (revokeUrlDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeUrlDescriptor);
  else Reflect.deleteProperty(URL, 'revokeObjectURL');
});
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

describe('saved classes and histories containing real rest steps', () => {
  it('saves and clones rests with honest movement counts and ordered print/text export', async () => {
    const id = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const card = within(
      screen.getByRole('heading', { name: '휴식 포함 저장 테스트' }).closest('article')!,
    );
    fireEvent.click(card.getByRole('button', { name: /더보기$/ }));
    expect(card.getByText('2개 동작')).toBeInTheDocument();
    expect(card.getByText('휴식 2개')).toBeInTheDocument();
    expect(card.getByText('60분')).toBeInTheDocument();
    expect(card.getByLabelText('저장 수업 시간 구성')).toHaveTextContent(
      '동작·설명·전환 50:00 · 휴식 10:00',
    );
    expect(card.queryByText('삭제된 동작')).not.toBeInTheDocument();
    expect(card.getAllByText('휴식 05:00')).toHaveLength(2);

    fireEvent.click(card.getByRole('button', { name: '인쇄' }));
    const dialog = screen.getByRole('dialog', { name: '수업 계획 인쇄' });
    const printText = dialog.querySelector('pre')!.textContent!;
    expect(printText).toContain('총 60분 · 동작·설명·전환 50분 · 휴식 10분');
    expect(printText).toContain('02. [05:00] 휴식');
    expect(printText).toContain('04. [05:00] 휴식');
    expect(printText.indexOf(first.nameKo)).toBeLessThan(printText.indexOf('02. [05:00] 휴식'));
    expect(printText.indexOf('02. [05:00] 휴식')).toBeLessThan(printText.indexOf(last.nameKo));
    expect(printText).not.toContain('동작 미지정');
    fireEvent.click(within(dialog).getAllByRole('button', { name: '닫기' }).at(-1)!);
    vi.useFakeTimers();
    fireEvent.click(card.getByRole('button', { name: '텍스트' }));
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    const exported = await readBlob(exportedBlob!);
    expect(exported).toContain(printText);
    expect(exported).toContain('휴식은 별도 항목으로 전체 시간에 포함');

    fireEvent.click(card.getByRole('button', { name: '복제' }));
    const saved = usePilatesStore.getState().savedSequences.find((item) => item.id === id)!;
    const copy = usePilatesStore.getState().savedSequences.find((item) => item.id !== id)!;
    expect(copy.steps).toEqual(saved.steps);
    expect(copy.steps).not.toBe(saved.steps);
    expect(copy.steps[1]).toEqual(
      expect.objectContaining({ kind: 'rest', durationMin: 5, locked: true }),
    );
    expect(copy.criteriaSnapshot?.restMinutes).toBe(10);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('renders and replays a rest history while overlap and frequency count movements only', () => {
    usePilatesStore.setState({ historyLogs: [log] });
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    const card = within(
      screen.getByRole('heading', { name: log.sequenceTitle }).closest('article')!,
    );
    expect(card.getByText('2개 동작')).toBeInTheDocument();
    expect(card.getByText('휴식 2개')).toBeInTheDocument();
    expect(card.getByLabelText('기록한 수업 계획 시간 구성')).toHaveTextContent(
      '계획 총 60:00 · 동작·설명·전환 50:00 · 휴식 10:00',
    );
    expect(card.getAllByText('휴식 05:00')).toHaveLength(2);
    expect(screen.queryByText('삭제된 동작')).not.toBeInTheDocument();
    const repeat = screen
      .getByRole('heading', { name: '현재 초안과 최근 수업' })
      .closest('section')!;
    expect(repeat).toHaveTextContent('2 / 2개');
    fireEvent.click(card.getByRole('button', { name: '복사해 새 수업 만들기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(log.stepsSnapshot);
    expect(usePilatesStore.getState().activeTargetMinutes).toBe(60);
    expect(usePilatesStore.getState().draftCriteria?.restMinutes).toBe(10);
    expect(usePilatesStore.getState().generationError).toBeNull();
  });

  it('still blocks an actually missing movement without treating rest as the missing record', () => {
    const missing = {
      ...log,
      stepsSnapshot: [{ ...steps[0], exerciseId: 'missing-real-movement' }, steps[1]],
      exerciseIds: ['missing-real-movement'],
    };
    usePilatesStore.setState({ historyLogs: [missing] });
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    const card = within(
      screen.getByRole('heading', { name: log.sequenceTitle }).closest('article')!,
    );
    expect(card.getByText('1개 동작')).toBeInTheDocument();
    expect(card.getByText('휴식 1개')).toBeInTheDocument();
    expect(card.getByRole('button', { name: '복사해 새 수업 만들기' })).toBeDisabled();
    expect(card.getByText('휴식 05:00')).toBeInTheDocument();
    expect(card.getByText('삭제된 동작')).toBeInTheDocument();
  });
});
