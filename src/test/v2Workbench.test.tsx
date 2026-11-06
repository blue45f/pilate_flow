import { getVisibleWorkbenchButton } from './workbenchControls';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const pending = INITIAL_EXERCISES.find((exercise) => exercise.apparatus === 'mat')!;
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  level: '1.0',
  preferredProps: ['none'],
  focusPreset: 'full-body',
  excludeDaysWindow: 14,
  targetMinutes: 10,
  restMinutes: 2,
  defaultLayer: 'standard',
};
const steps: SequenceStep[] = [
  {
    stepId: 'v2-locked-movement',
    order: 1,
    exerciseId: pending.id,
    blockCategory: 'warmup',
    durationMin: 8,
    explanationSec: 30,
    transitionSec: 15,
    selectedLayer: 'standard',
    locked: true,
    instructorNote: '보존할 메모',
  },
  {
    stepId: 'v2-rest',
    kind: 'rest',
    order: 2,
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 2,
    selectedLayer: 'standard',
  },
];
const generate = vi.fn();
const renderWorkbench = (onOpenInventory = vi.fn()) =>
  render(
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
      onOpenInventory={onOpenInventory}
    />,
  );
const openConditions = () => {
  fireEvent.click(screen.getByRole('button', { name: '수업 조건' }));
  return screen.getByRole('dialog', { name: '수업 조건' });
};
const closeConditions = (dialog: HTMLElement) =>
  fireEvent.click(within(dialog).getAllByRole('button', { name: '닫기' }).at(-1)!);

beforeEach(() => {
  generate.mockReset();
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      activeSteps: structuredClone(steps),
      activeTitle: '보존할 수업',
      activeTargetMinutes: 10,
      activeApparatus: 'mat',
      activeLevel: '1.0',
      exercises: [pending],
      draftCriteria: criteria,
      lastCriteria: null,
      ownedEquipment: ['mat', 'reformer', 'chair'],
      ownedApparatus: ['mat', 'reformer', 'chair'],
      ownedProps: [],
      historyLogs: [],
      savedSequences: [],
      instructorSchedule: createEmptyInstructorSchedule(),
      generationError: null,
      saveFeedback: null,
      autoGenerateSequence: generate,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('v2 shared class editor', () => {
  it('keeps optional controls collapsed and reveals them without changing the draft', () => {
    const before = usePilatesStore.getState();
    renderWorkbench();
    const summaries = [/^시간 구성$/, /^편집 방식/, /^조건 불러오기·자동 구성$/, /^수업 준비 순서$/];
    for (const label of summaries) {
      const summary = screen.getByText(label, { selector: 'summary' });
      expect(summary).toBeVisible();
      expect(summary.closest('details')).not.toHaveAttribute('open');
    }
    expect(screen.getByRole('button', { name: '직접 편집' })).not.toBeVisible();
    expect(screen.getByRole('button', { name: '시퀀스 만들기' })).not.toBeVisible();
    expect(screen.getByRole('button', { name: '3 미리보기' })).not.toBeVisible();
    getVisibleWorkbenchButton('직접 편집');
    getVisibleWorkbenchButton('시퀀스 만들기');
    getVisibleWorkbenchButton('3 미리보기');
    fireEvent.click(screen.getByText('시간 구성', { selector: 'summary' }));
    expect(screen.getByLabelText('시간 상세 구성')).toBeVisible();
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('keeps the editor visible while mode and condition views preserve steps, locks, title and notes', () => {
    const before = usePilatesStore.getState();
    const view = renderWorkbench();
    expect(screen.getByRole('heading', { level: 1, name: '수업 구성' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '수업 조건' })).not.toBeInTheDocument();
    expect(getVisibleWorkbenchButton('자동 구성')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getVisibleWorkbenchButton('시퀀스 만들기')).toBeInTheDocument();
    fireEvent.click(getVisibleWorkbenchButton('직접 편집'));
    expect(getVisibleWorkbenchButton('직접 편집')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('region', { name: '오늘의 시퀀스' })).toBeVisible();
    expect(view.container.querySelector('[data-mobile-view]')).toBeNull();
    expect(screen.queryByRole('button', { name: '시퀀스 만들기' })).not.toBeInTheDocument();
    expect(getVisibleWorkbenchButton('동작 찾기')).toBeInTheDocument();
    closeConditions(openConditions());
    fireEvent.click(getVisibleWorkbenchButton('자동 구성'));
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.activeSteps[0]).toBe(before.activeSteps[0]);
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.activeTab).toBe('workbench');
    expect(generate).not.toHaveBeenCalled();
    expect(getVisibleWorkbenchButton('시퀀스 만들기')).toHaveAccessibleDescription(
      /전체를 새 초안/,
    );
    expect(
      getVisibleWorkbenchButton('잠그지 않은 동작 다시 만들기'),
    ).toBeInTheDocument();
  });

  it('uses real movement, teaching, transition and rest seconds exactly once', () => {
    const { container } = renderWorkbench();
    fireEvent.click(screen.getByText('시간 구성', { selector: 'summary' }));
    const breakdown = within(screen.getByLabelText('시간 상세 구성'));
    expect(breakdown.getByText('07:15')).toBeInTheDocument();
    expect(breakdown.getByText('00:30')).toBeInTheDocument();
    expect(breakdown.getByText('00:15')).toBeInTheDocument();
    expect(breakdown.getByText('02:00')).toBeInTheDocument();
    const overall = screen.getByLabelText('수업 시간 구성');
    expect(overall).toHaveTextContent('10:00');
    expect(overall).toHaveTextContent('08:00');
    expect(overall).toHaveTextContent('02:00');
    const widths = Array.from(
      container.querySelectorAll<HTMLElement>('.v2-duration-track > span'),
    ).map((segment) => Number.parseFloat(segment.style.width));
    expect(widths).toEqual([72.5, 5, 2.5, 20]);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(100);
    fireEvent.click(getVisibleWorkbenchButton('3 미리보기'));
    const preview = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    expect(within(preview).getByRole('button', { name: '수업 시작' })).toBeEnabled();
  });

  it('closes the native conditions dialog before generation and exposes one global error', () => {
    // Preserve the pending block; a separate synthetic reviewed record admits the generation path.
    usePilatesStore.setState({ exercises: [pending, syntheticPlanningExercise('mat', 'warmup')] });
    generate.mockImplementation(() => {
      expect(document.querySelector('.v2-conditions-content')?.closest('dialog')?.open).toBe(false);
      usePilatesStore.setState({ generationError: '검토한 동작이 부족합니다.' });
    });
    renderWorkbench();
    const dialog = openConditions();
    fireEvent.click(within(dialog).getByRole('button', { name: '조건 적용하고 만들기' }));
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ targetMinutes: 10, restMinutes: 2 }),
    );
    expect(screen.queryByRole('dialog', { name: '수업 조건' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('검토한 동작이 부족합니다.');
  });

  it('closes conditions before opening inventory and distinguishes exact class gear from finder filters', () => {
    usePilatesStore.setState({
      draftCriteria: {
        ...criteria,
        apparatus: 'mixed',
        availableEquipment: ['mat', 'reformer'],
        ownedApparatus: ['mat', 'reformer'],
      },
    });
    const inventory = vi.fn(() =>
      expect(document.querySelector('.v2-conditions-content')?.closest('dialog')?.open).toBe(false),
    );
    renderWorkbench(inventory);
    expect(
      screen.getByRole('button', { name: '이번 수업 기구: 매트 · 리포머 · 조건 열기' }),
    ).toHaveTextContent('기구 2');
    const dialog = openConditions();
    expect(within(dialog).getByRole('checkbox', { name: '매트' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: '리포머' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: '체어' })).not.toBeChecked();
    fireEvent.click(within(dialog).getByRole('button', { name: '내 보유 기구·소도구 설정' }));
    expect(inventory).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '수업 조건' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().draftCriteria?.availableEquipment).toEqual([
      'mat',
      'reformer',
    ]);
  });
});

describe('approved V3 block interactions', () => {
  it('applies time, counts, sets and anatomical sides as one edit without approving source content', () => {
    usePilatesStore.setState({
      activeSteps: [{ ...steps[0], locked: false }, steps[1]],
      undoStack: [],
    });
    renderWorkbench();
    const before = usePilatesStore.getState();
    fireEvent.click(screen.getByRole('button', { name: '1번 동작 블록 편집' }));
    const sheet = screen.getByRole('dialog', { name: '동작 블록 편집' });
    expect(within(sheet).getByText('계획 정보 미검토')).toBeInTheDocument();
    const motionState = within(sheet).getByRole('region', { name: '수업에 저장할 모션 초안' });
    fireEvent.click(within(motionState).getByText('수업 모션 연결'));
    expect(within(motionState).queryByRole('radio')).not.toBeInTheDocument();
    expect(
      within(motionState).getByText(/아직 이 동작에 연결할 수 있는 도식이 없습니다/),
    ).toBeVisible();
    fireEvent.change(within(sheet).getByLabelText('블록 총시간 · 분'), { target: { value: '7' } });
    fireEvent.change(within(sheet).getByLabelText('강사가 정한 횟수'), { target: { value: '12' } });
    fireEvent.change(within(sheet).getByLabelText('강사가 정한 세트'), { target: { value: '2' } });
    fireEvent.change(within(sheet).getByLabelText('수행할 쪽'), {
      target: { value: 'right-then-left' },
    });
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    fireEvent.click(within(sheet).getByRole('button', { name: '변경 적용' }));
    const after = usePilatesStore.getState();
    expect(after.activeSteps[0]).toMatchObject({
      durationMin: 7,
      repetitions: 12,
      sets: 2,
      sideMode: 'right-then-left',
    });
    expect(after.undoStack).toHaveLength(1);
    expect(after.exercises).toBe(before.exercises);
    expect(after.activeSteps[1]).toEqual(steps[1]);
    expect(screen.queryByRole('dialog', { name: '동작 블록 편집' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(before.activeSteps);
  });

  it('keeps unapplied block fields when switching between mobile sheet and desktop properties', () => {
    const originalWidth = window.innerWidth;
    const resize = (width: number) => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
      fireEvent(window, new Event('resize'));
    };
    resize(390);
    usePilatesStore.setState({
      activeSteps: [{ ...steps[0], locked: false }, steps[1]],
      undoStack: [],
    });
    renderWorkbench();
    try {
      fireEvent.click(screen.getByRole('button', { name: '1번 동작 블록 편집' }));
      fireEvent.change(
        within(screen.getByRole('dialog', { name: '동작 블록 편집' })).getByLabelText(
          '강사가 정한 세트',
        ),
        { target: { value: '3' } },
      );
      resize(1440);
      expect(screen.queryByRole('dialog', { name: '동작 블록 편집' })).not.toBeInTheDocument();
      const panel = screen.getByRole('complementary', { name: '선택 동작 속성' });
      expect(within(panel).getByLabelText('강사가 정한 세트')).toHaveValue(3);
      resize(390);
      const sheet = screen.getByRole('dialog', { name: '동작 블록 편집' });
      expect(within(sheet).getByLabelText('강사가 정한 세트')).toHaveValue(3);
      expect(usePilatesStore.getState().activeSteps[0].sets).toBeUndefined();
      fireEvent.click(within(sheet).getByRole('button', { name: '변경 적용' }));
      expect(usePilatesStore.getState().activeSteps[0].sets).toBe(3);
    } finally {
      resize(originalWidth);
    }
  });

  it('opens the whole-plan preview without starting or editing a pending class', () => {
    renderWorkbench();
    const before = usePilatesStore.getState();
    fireEvent.click(screen.getByRole('button', { name: '시퀀스 미리보기' }));
    const preview = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    expect(within(preview).getByText('계획 미리보기 · 모션 시범 미완료')).toBeInTheDocument();
    expect(within(preview).getByLabelText('미리보기 시간 구성')).toHaveTextContent('10:00');
    expect(within(preview).getByRole('button', { name: '수업 시작' })).toBeEnabled();
    fireEvent.click(within(preview).getByRole('button', { name: '계획 미리보기 닫기' }));
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(screen.queryByRole('button', { name: '수업 시작' })).not.toBeInTheDocument();
  });
});
