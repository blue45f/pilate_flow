import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OFFLINE_BLOCK_PRESETS,
  OFFLINE_CLASS_PRESETS,
  PRESET_THEME_CATALOG,
} from '../data/classBlockPresets';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { instantiateClassPresetAsEditableSequence } from '../utils/classBlockPresetValidator';
import {
  resetMovementIdeaStateForTests,
  saveIdeaToReusableBlock,
} from '../utils/movementIdeaDraft';
import { formatSecondsToMMSS, getStepTiming } from '../utils/sequenceEngine';
import { OfflinePresetPicker, PRESET_PICKER_DRAFT_STORAGE_KEY } from './OfflinePresetPicker';

const originalState = usePilatesStore.getState();
const initialExercisesSnapshot = JSON.stringify(INITIAL_EXERCISES);
const initialClassPresetsSnapshot = JSON.stringify(OFFLINE_CLASS_PRESETS);
const initialBlockPresetsSnapshot = JSON.stringify(OFFLINE_BLOCK_PRESETS);

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
  resetMovementIdeaStateForTests();
  usePilatesStore.setState(
    {
      ...originalState,
      activeSteps: [],
      undoStack: [],
      savedSequences: [],
      historyLogs: [],
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  resetMovementIdeaStateForTests();
  usePilatesStore.setState(originalState, true);
  vi.restoreAllMocks();
  expect(JSON.stringify(INITIAL_EXERCISES)).toBe(initialExercisesSnapshot);
  expect(JSON.stringify(OFFLINE_CLASS_PRESETS)).toBe(initialClassPresetsSnapshot);
  expect(JSON.stringify(OFFLINE_BLOCK_PRESETS)).toBe(initialBlockPresetsSnapshot);
});

describe('OfflinePresetPicker usability & apply safety flows', () => {
  it('supports title/summary search, individual condition chip recovery, keyboard focus, and sessionStorage draft restoration without mutating store before apply', () => {
    const firstPreset = OFFLINE_CLASS_PRESETS[0]!;
    const firstTheme = PRESET_THEME_CATALOG[0]!;
    const onApplied = vi.fn();

    const { unmount } = render(<OfflinePresetPicker onApplied={onApplied} />);
    const baseline = usePilatesStore.getState();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(firstPreset.title) }));
    expect(usePilatesStore.getState()).toBe(baseline);

    const searchInput = screen.getByLabelText('프리셋 제목 또는 요약 검색');
    fireEvent.change(screen.getByLabelText('프리셋 기구'), { target: { value: 'mat' } });
    fireEvent.change(screen.getByLabelText('프리셋 주제'), { target: { value: firstTheme.id } });
    fireEvent.change(screen.getByLabelText('프리셋 계획 시간'), { target: { value: '60' } });
    fireEvent.change(searchInput, { target: { value: '존재하지않는합성검색어999' } });

    const emptyFilterRegion = screen.getByTestId('preset-empty-filter-zero');
    expect(emptyFilterRegion).toBeInTheDocument();
    expect(screen.queryByTestId('preset-empty-no-data')).toBeNull();
    expect(screen.getByRole('region', { name: '선택한 프리셋 확인' })).toHaveTextContent(
      firstPreset.title,
    );

    fireEvent.click(within(emptyFilterRegion).getByRole('button', { name: '검색어만 지우기' }));
    expect(searchInput).toHaveValue('');
    expect(document.activeElement).toBe(searchInput);

    const chipGroup = screen.getByRole('group', { name: '적용된 프리셋 조건' });
    const apparatusChip = within(chipGroup).getByRole('button', {
      name: '기구 매트 조건 해제',
    });
    const themeChip = within(chipGroup).getByRole('button', {
      name: `주제 ${firstTheme.labelKo} 조건 해제`,
    });
    const minutesChip = within(chipGroup).getByRole('button', {
      name: '계획 시간 60분 조건 해제',
    });

    apparatusChip.focus();
    fireEvent.keyDown(chipGroup, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(themeChip);
    fireEvent.keyDown(chipGroup, { key: 'End' });
    expect(document.activeElement).toBe(minutesChip);
    fireEvent.keyDown(chipGroup, { key: 'Home' });
    expect(document.activeElement).toBe(apparatusChip);

    fireEvent.click(apparatusChip);
    expect(screen.getByLabelText('프리셋 기구')).toHaveValue('all');
    expect(document.activeElement).toBe(themeChip);

    const statusActions = screen.getByRole('group', { name: '목록 빠른 작업' });
    fireEvent.click(within(statusActions).getByRole('button', { name: '조건 초기화' }));
    expect(screen.getByLabelText('프리셋 주제')).toHaveValue('all');
    expect(screen.getByLabelText('프리셋 계획 시간')).toHaveValue('all');
    expect(document.activeElement).toBe(searchInput);

    const titleSlice = firstPreset.title.slice(0, 6);
    fireEvent.change(searchInput, { target: { value: titleSlice } });

    const persistedRaw = sessionStorage.getItem(PRESET_PICKER_DRAFT_STORAGE_KEY);
    expect(persistedRaw).not.toBeNull();
    expect(persistedRaw).toContain(titleSlice);
    expect(persistedRaw).toContain(firstPreset.id);

    unmount();
    render(<OfflinePresetPicker onApplied={onApplied} />);

    expect(screen.getByLabelText('프리셋 제목 또는 요약 검색')).toHaveValue(titleSlice);
    expect(screen.getByRole('region', { name: '선택한 프리셋 확인' })).toHaveTextContent(
      firstPreset.title,
    );
    expect(onApplied).not.toHaveBeenCalled();
    expect(usePilatesStore.getState()).toBe(baseline);
  });

  it('distinguishes 내 재사용 블록 from 시간·휴식 맞춤 후보 and separates empty source data from filter-zero results', () => {
    const { unmount } = render(<OfflinePresetPicker onApplied={vi.fn()} />);

    const tabGroup = screen.getByRole('group', { name: '프리셋 종류' });
    const classTab = within(tabGroup).getByRole('button', { name: /^수업 전체/ });
    const blockTab = within(tabGroup).getByRole('button', { name: /^연계 동작 묶음/ });
    const reusableTab = within(tabGroup).getByRole('button', { name: /^내 재사용 블록/ });
    const suggestedTab = within(tabGroup).getByRole('button', { name: '시간·휴식 맞춤 후보' });

    classTab.focus();
    fireEvent.keyDown(tabGroup, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(blockTab);

    expect(screen.getByTestId('preset-tab-scope-caption')).toHaveTextContent('수업 전체 프리셋');

    fireEvent.click(reusableTab);
    expect(screen.getByTestId('preset-tab-scope-caption')).toHaveTextContent(
      '내가 ‘블록 조합’에서 직접 묶어 저장한 블록',
    );
    expect(screen.getByTestId('preset-empty-no-data')).toHaveTextContent(
      '아직 저장한 내 재사용 블록이 없어요',
    );
    expect(screen.queryByTestId('preset-empty-filter-zero')).toBeNull();
    expect(screen.queryByRole('group', { name: '목록 빠른 작업' })).toBeNull();
    expect(screen.queryByRole('button', { name: '프리셋 조건 초기화' })).toBeNull();

    fireEvent.click(suggestedTab);
    expect(screen.getByTestId('preset-tab-scope-caption')).toHaveTextContent(
      '고정 프리셋 대신 현재 목표 시간·휴식·보유 장비 조건에 맞춘 초안을 계산합니다',
    );

    unmount();

    const syntheticMatExercise = syntheticPlanningExercise('mat', 'core', 'alpha', true);
    usePilatesStore.setState({
      exercises: [...originalState.exercises, syntheticMatExercise],
    });
    const saved = saveIdeaToReusableBlock({
      exerciseId: syntheticMatExercise.id,
      blockTitle: '합성 QA 매트 코어 루틴',
      durationMin: 4,
    });
    expect(saved.ok).toBe(true);

    sessionStorage.clear();
    render(<OfflinePresetPicker onApplied={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^내 재사용 블록/ }));

    expect(screen.getByRole('button', { name: /합성 QA 매트 코어 루틴/ })).toBeInTheDocument();
    expect(screen.queryByTestId('preset-empty-no-data')).toBeNull();

    fireEvent.change(screen.getByLabelText('프리셋 기구'), { target: { value: 'reformer' } });
    const emptyFilterZero = screen.getByTestId('preset-empty-filter-zero');
    expect(emptyFilterZero).toBeInTheDocument();
    expect(screen.queryByTestId('preset-empty-no-data')).toBeNull();

    fireEvent.click(
      within(emptyFilterZero).getByRole('button', { name: '프리셋 조건 초기화' }),
    );
    expect(screen.getByRole('button', { name: /합성 QA 매트 코어 루틴/ })).toBeInTheDocument();
  });

  it('hands off focus on 프리셋 더 보기 and supports round-trip between list card and preview even across narrowing filters and pagination', () => {
    expect(OFFLINE_CLASS_PRESETS.length).toBeGreaterThan(6);
    const seventhPreset = OFFLINE_CLASS_PRESETS[6]!;

    render(<OfflinePresetPicker onApplied={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: new RegExp(seventhPreset.title) }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '프리셋 더 보기' }));
    const seventhCard = screen.getByRole('button', { name: new RegExp(seventhPreset.title) });
    expect(document.activeElement).toBe(seventhCard);

    fireEvent.click(seventhCard);
    const preview = screen.getByRole('region', { name: '선택한 프리셋 확인' });
    expect(preview).toHaveTextContent(seventhPreset.title);

    const statusActions = screen.getByRole('group', { name: '목록 빠른 작업' });
    fireEvent.click(within(statusActions).getByRole('button', { name: '선택 확인으로 이동' }));
    expect(document.activeElement).toBe(within(preview).getByRole('heading', { level: 3 }));

    fireEvent.change(screen.getByLabelText('프리셋 제목 또는 요약 검색'), {
      target: { value: '일치하지않는임시검색어777' },
    });
    expect(screen.getByTestId('preset-empty-filter-zero')).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole('button', { name: '목록의 선택 위치로' }));

    expect(screen.getByLabelText('프리셋 제목 또는 요약 검색')).toHaveValue('');
    const restoredCard = screen.getByRole('button', { name: new RegExp(seventhPreset.title) });
    expect(document.activeElement).toBe(restoredCard);
  });

  it('distinguishes self-apply from external change, supports re-inspect + second explicit apply + undo rollback without false stale alerts', () => {
    const syntheticWarmup = syntheticPlanningExercise('mat', 'warmup', 'alpha', true);
    const initialSteps: SequenceStep[] = [
      {
        stepId: 'qa-step-ex-1',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: syntheticWarmup.id,
        durationMin: 4,
        explanationSec: 20,
        transitionSec: 10,
        selectedLayer: 'standard',
      },
      {
        kind: 'rest',
        stepId: 'qa-step-rest-2',
        order: 2,
        blockCategory: 'core',
        exerciseId: '',
        durationMin: 1.5,
        selectedLayer: 'standard',
      },
    ];

    usePilatesStore.setState({
      exercises: [...originalState.exercises, syntheticWarmup],
      activeSteps: initialSteps,
      activeTargetMinutes: 50,
      undoStack: [],
    });

    const targetPreset = OFFLINE_CLASS_PRESETS[0]!;
    const exercisesList = usePilatesStore.getState().exercises;
    const exercisesMap = new Map(exercisesList.map((item) => [item.id, item]));
    const { sequence } = instantiateClassPresetAsEditableSequence(
      targetPreset,
      undefined,
      exercisesList,
    );
    const incomingSec = sequence.steps.reduce(
      (sum, step) => sum + getStepTiming(step, exercisesMap.get(step.exerciseId)).totalSec,
      0,
    );
    const currentSec = initialSteps.reduce(
      (sum, step) => sum + getStepTiming(step, exercisesMap.get(step.exerciseId)).totalSec,
      0,
    );
    expect(currentSec).toBe(330);

    const onApplied = vi.fn();
    render(<OfflinePresetPicker onApplied={onApplied} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(targetPreset.title) }));

    const impactRegion = screen.getByTestId('preset-impact-comparison');
    expect(screen.getByTestId('preset-impact-current')).toHaveTextContent(
      `2항목 · 5.5분 (${formatSecondsToMMSS(currentSec)})`,
    );
    expect(impactRegion).toHaveTextContent('동작 1 · 휴식 1 (01:30) · 목표 50분');
    expect(screen.getByTestId('preset-impact-projected')).toHaveTextContent(
      `${2 + sequence.steps.length}항목`,
    );
    expect(screen.getByTestId('preset-impact-projected')).toHaveTextContent(
      `(${formatSecondsToMMSS(currentSec + incomingSec)})`,
    );

    fireEvent.change(screen.getByLabelText('현재 수업에 적용하는 방법'), {
      target: { value: 'replace' },
    });
    expect(screen.getByTestId('preset-impact-projected')).toHaveTextContent(
      `${sequence.steps.length}항목`,
    );
    expect(screen.getByTestId('preset-impact-projected')).toHaveTextContent(
      `(${formatSecondsToMMSS(incomingSec)})`,
    );
    expect(impactRegion).toHaveTextContent(`목표 ${targetPreset.durationMinutes}분`);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('현재 수업에 적용하는 방법'), {
      target: { value: 'append' },
    });
    const preview = screen.getByRole('region', { name: '선택한 프리셋 확인' });
    const applyButton = within(preview).getByRole('button', { name: '현재 수업 뒤에 추가' });

    // 1st explicit apply with rapid repeated clicks: applies once, no false stale alert, disables duplicate post-render click
    fireEvent.click(applyButton);
    fireEvent.click(applyButton);
    fireEvent.click(applyButton);

    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(applyButton).toBeDisabled();
    expect(screen.getByTestId('preset-applied-reinspect')).toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2 + sequence.steps.length);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);

    // Clicking disabled apply button after render still prevents duplicate apply
    fireEvent.click(applyButton);
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2 + sequence.steps.length);

    // Re-inspecting the same preset against the updated class does NOT auto-apply and enables a 2nd explicit apply
    fireEvent.click(
      within(preview).getByRole('button', { name: '현재 수업 기준으로 다시 검토' }),
    );
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTestId('preset-applied-reinspect')).toBeNull();
    expect(screen.getByTestId('preset-impact-current')).toHaveTextContent(
      `${2 + sequence.steps.length}항목`,
    );
    expect(screen.getByTestId('preset-impact-projected')).toHaveTextContent(
      `${2 + sequence.steps.length * 2}항목`,
    );
    expect(applyButton).toBeEnabled();

    // 2nd explicit apply succeeds cleanly without false stale alert
    fireEvent.click(applyButton);
    expect(onApplied).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(applyButton).toBeDisabled();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2 + sequence.steps.length * 2);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);

    // Subsequent external class/account change after successful apply MUST trigger real stale defense
    act(() => {
      usePilatesStore.setState({
        activeTitle: '외부에서 전환된 오후 수업',
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('다시 선택');
    expect(applyButton).toBeDisabled();

    // Undo rolls back both applies cleanly in reverse order, preserving the original rest step
    act(() => {
      usePilatesStore.getState().undoSequence();
    });
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2 + sequence.steps.length);

    act(() => {
      usePilatesStore.getState().undoSequence();
    });
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2);
    expect(usePilatesStore.getState().activeSteps[1]?.kind).toBe('rest');
    expect(usePilatesStore.getState().activeSteps[1]?.durationMin).toBe(1.5);
  });

  it('invalidates prior replace confirmation across both pre-apply and post-apply external class/account switches without auto-applying', () => {
    const syntheticCore = syntheticPlanningExercise('reformer', 'core', 'beta', true);
    usePilatesStore.setState({
      exercises: [...originalState.exercises, syntheticCore],
      activeTitle: '오전 기구반 A',
      activeSequenceId: 'seq-class-a',
      activeSteps: [
        {
          stepId: 'qa-step-reformer-1',
          order: 1,
          blockCategory: 'core',
          exerciseId: syntheticCore.id,
          durationMin: 5,
          explanationSec: 20,
          transitionSec: 0,
          selectedLayer: 'standard',
        },
      ],
      undoStack: [],
    });

    const targetPreset = OFFLINE_CLASS_PRESETS[1]!;
    const onApplied = vi.fn();
    render(<OfflinePresetPicker onApplied={onApplied} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(targetPreset.title) }));
    fireEvent.change(screen.getByLabelText('현재 수업에 적용하는 방법'), {
      target: { value: 'replace' },
    });

    const preview = screen.getByRole('region', { name: '선택한 프리셋 확인' });
    const checkbox = within(preview).getByRole('checkbox');
    const replaceButton = within(preview).getByRole('button', { name: '복사해서 편집' });

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(replaceButton).toBeEnabled();

    // 1. Pre-apply external class/account switch invalidates confirmation and triggers stale alert
    act(() => {
      usePilatesStore.setState({
        activeTitle: '저녁 개인레슨 B',
        activeSequenceId: 'seq-account-b',
      });
    });

    expect(replaceButton).toBeDisabled();
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('다시 선택');

    fireEvent.click(
      within(preview).getByRole('button', { name: '현재 수업 기준으로 다시 검토' }),
    );

    expect(onApplied).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(syntheticCore.id);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toBeChecked();
    expect(replaceButton).toBeDisabled();

    // 2. Explicit confirmation + replace apply: no false stale alert, confirmation invalidated immediately after apply
    fireEvent.click(checkbox);
    expect(replaceButton).toBeEnabled();
    fireEvent.click(replaceButton);

    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(replaceButton).toBeDisabled();
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);

    // 3. Subsequent external class/account switch after replace apply triggers stale alert and keeps confirmation invalidated
    act(() => {
      usePilatesStore.setState({
        activeTitle: '다른 강사 계정 수업 C',
        activeSequenceId: 'seq-account-c',
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('다시 선택');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(replaceButton).toBeDisabled();

    // Re-inspecting after post-apply external switch still requires fresh confirmation before replacing
    fireEvent.click(
      within(preview).getByRole('button', { name: '현재 수업 기준으로 다시 검토' }),
    );
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(checkbox).toBeEnabled();
    expect(checkbox).not.toBeChecked();
    expect(replaceButton).toBeDisabled();

    act(() => {
      usePilatesStore.getState().undoSequence();
    });
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(syntheticCore.id);

    const componentCss = readFileSync(
      resolve(__dirname, './OfflinePresetPicker.css'),
      'utf8',
    );
    const sharedCss = readFileSync(
      resolve(__dirname, '../styles/offline-presets.css'),
      'utf8',
    );
    expect(componentCss).toContain('min-height: 44px');
    expect(componentCss).toContain('word-break: keep-all');
    expect(componentCss).toContain('@media (max-width: 390px)');
    expect(componentCss).toContain('@media (max-width: 320px)');
    expect(componentCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(sharedCss).toContain(':focus-visible');
  });
});
