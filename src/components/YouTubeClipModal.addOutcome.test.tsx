import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { YouTubePreviewModal } from './YouTubeClipModal';

vi.mock('./MotionReferencePlayer', () => ({ MotionReferencePlayer: () => null }));
const original = usePilatesStore.getState();
const canonical = structuredClone(INITIAL_EXERCISES);
const note = syntheticPlanningExercise('mat', 'core');
const other = syntheticPlanningExercise('reformer', 'core');
const alias = '이번 창에서 직접 입력한 합성 별칭';

beforeEach(() => {
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'atlas',
      activeSequenceId: 'v11-synthetic-add-outcome',
      activeSteps: [],
      exercises: [...INITIAL_EXERCISES, note, other],
      ownedApparatus: ['mat', 'reformer'],
      ownedEquipment: ['mat', 'reformer'],
      ownedProps: [],
      savedSequences: [],
      historyLogs: [],
      generationError: null,
      saveFeedback: null,
      persistenceError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  expect(INITIAL_EXERCISES).toEqual(canonical);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  expect(
    usePilatesStore.getState().exercises.filter((e) => canonical.some((c) => c.id === e.id)),
  ).toEqual(canonical);
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

describe('movement addition reports the actual result without losing the current context', () => {
  it('labels a composite flow source as a partial reference without loading or approving its playback', () => {
    const flow = INITIAL_EXERCISES.find((exercise) => exercise.id === 'ex-straps-01')!;
    render(<YouTubePreviewModal exercise={flow} onClose={vi.fn()} onAddToSequence={vi.fn()} />);
    const drawer = screen.getByTestId('crawled-related-videos-drawer');
    fireEvent.click(within(drawer).getByText(/추가 관련 영상/, { selector: 'summary span' }));
    expect(within(drawer).getAllByText(/구성 동작을 위한 부분 참고/).length).toBeGreaterThan(0);
    expect(within(drawer).getAllByText(/전체 흐름·실제 재생·구간 미검수/)[0]).toBeVisible();
    expect(drawer.querySelector('[data-reference-scope="named-component"]')).toBeInTheDocument();
    expect(drawer.querySelector('iframe')).toBeNull();
    expect(within(drawer).queryByText(/공식 시범|해외 공식 채널/)).not.toBeInTheDocument();
  });

  it('retains the detail and typed alias when a structured add outcome is rejected', () => {
    const close = vi.fn();
    const add = vi.fn(() => ({
      success: false,
      message: '합성 추가 거절 · 현재 수업 조건을 확인해 주세요.',
    }));
    render(<YouTubePreviewModal exercise={note} onClose={close} onAddToSequence={add} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    fireEvent.change(screen.getByLabelText('검토한 강사 별칭'), { target: { value: alias } });
    fireEvent.click(screen.getByRole('button', { name: '수업안에 추가' }));
    expect(add).toHaveBeenCalledExactlyOnceWith(note.id);
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('합성 추가 거절');
    expect(screen.getByLabelText('검토한 강사 별칭')).toHaveValue(alias);
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
  });

  it('explains that an existing movement is already in the current lesson and disables another add', () => {
    usePilatesStore.setState({
      activeSteps: [
        {
          stepId: 'v11-existing',
          order: 1,
          exerciseId: note.id,
          blockCategory: 'core',
          durationMin: 10,
          selectedLayer: 'standard',
        },
      ],
    });
    const add = vi.fn();
    render(<YouTubePreviewModal exercise={note} onClose={vi.fn()} onAddToSequence={add} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    expect(screen.getByRole('button', { name: '수업안에 추가됨' })).toBeDisabled();
    expect(
      screen.getByText('이미 현재 수업안에 담은 동작입니다. 창을 닫고 수업 구성을 이어가세요.'),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: '내 강사 검토' })).getByRole('status'),
    ).not.toHaveTextContent('위의 ‘수업안에 추가’');
    expect(add).not.toHaveBeenCalled();
  });

  it('closes once after an explicitly successful outcome', () => {
    const close = vi.fn();
    const add = vi.fn(() => ({ success: true }));
    render(<YouTubePreviewModal exercise={note} onClose={close} onAddToSequence={add} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    fireEvent.click(screen.getByRole('button', { name: '수업안에 추가' }));
    expect(add).toHaveBeenCalledExactlyOnceWith(note.id);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps legacy void callbacks compatible', () => {
    const close = vi.fn();
    const add = vi.fn();
    render(<YouTubePreviewModal exercise={note} onClose={close} onAddToSequence={add} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    fireEvent.click(screen.getByRole('button', { name: '수업안에 추가' }));
    expect(add).toHaveBeenCalledExactlyOnceWith(note.id);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('keeps the real App detail open after a gear mismatch without changing the lesson', async () => {
    const criteria = {
      apparatus: 'mat' as const,
      availableEquipment: ['mat' as const],
      ownedApparatus: ['mat' as const],
      preferredProps: [] as const,
      level: '1.0' as const,
      focusPreset: 'full-body' as const,
      targetMinutes: 10,
      restMinutes: 0,
      excludeDaysWindow: 0,
      defaultLayer: 'standard' as const,
    };
    usePilatesStore.setState({
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 10,
      activeSteps: [
        {
          stepId: 'v11-current-mat',
          order: 1,
          exerciseId: note.id,
          blockCategory: 'core',
          durationMin: 10,
          selectedLayer: 'standard',
        },
      ],
      draftCriteria: { ...criteria, preferredProps: [] },
      lastCriteria: { ...criteria, preferredProps: [] },
    });
    const before = usePilatesStore.getState();
    render(<App />);
    fireEvent.change(
      await screen.findByRole('searchbox', { name: '동작 검색' }, { timeout: 15000 }),
      {
        target: { value: other.nameKo },
      },
    );
    fireEvent.click(await screen.findByRole('button', { name: `${other.nameKo} 상세 보기` }));
    const detail = await screen.findByRole('dialog', { name: other.nameKo }, { timeout: 10000 });
    fireEvent.click(within(detail).getByRole('button', { name: '수업안에 추가' }));
    await waitFor(() =>
      expect(within(detail).getByRole('alert')).toHaveTextContent('현재 선택한 기구'),
    );
    expect(screen.getByRole('dialog', { name: other.nameKo })).toBeVisible();
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().savedSequences).toBe(before.savedSequences);
    expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
  }, 20000);
});
