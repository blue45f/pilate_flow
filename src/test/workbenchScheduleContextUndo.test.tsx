import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { usePilatesStore as store } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from './planningFixtures';
import { saveSequenceStepsAsReusableBlock } from '../utils/movementIdeaDraft';
import { matchingTeachingScheduleContext } from '../utils/teachingScheduleContext';

const initial = store.getState();
const exercise = syntheticPlanningExercise('mat', 'warmup');
const context = {
  draftSequenceId: 'synthetic-dated-draft',
  classId: 'synthetic-class',
  locationId: 'synthetic-venue',
  originalDate: '2026-11-17',
  date: '2026-11-17',
  startTime: '10:00',
  endTime: '10:50',
  locationAlias: '합성 매트룸',
  classTitle: '합성 일정',
};
const steps = [
  {
    stepId: 'synthetic-step',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: exercise.blockCategory,
    durationMin: 5,
    selectedLayer: 'standard' as const,
  },
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  store.setState(
    {
      ...initial,
      exercises: [exercise],
      activeSequenceId: context.draftSequenceId,
      activeScheduleContext: context,
      activeSteps: structuredClone(steps),
      activeTitle: '합성 초안',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      activeTab: 'workbench',
      undoStack: [],
      savedSequences: [],
      historyLogs: [],
      generationError: null,
      saveFeedback: null,
      persistenceError: null,
      draftCriteria: null,
      lastCriteria: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  store.setState(initial, true);
  vi.restoreAllMocks();
});

it.each(['saved restore', 'reusable insertion'])(
  '%s preserves dated context through UI edit, new save and undo',
  (route) => {
    if (route === 'saved restore') {
      const s = store.getState();
      store.setState({
        savedSequences: [
          {
            id: s.activeSequenceId,
            title: s.activeTitle,
            subtitle: s.activeSubtitle,
            apparatus: 'mat',
            level: '1.0',
            targetMinutes: 50,
            focusTags: [],
            steps: [{ ...steps[0], durationMin: 3 }],
            taughtCount: 0,
            createdAt: '2026-11-15T00:00:00.000Z',
            updatedAt: '2026-11-15T00:00:00.000Z',
          },
        ],
      });
    } else {
      expect(saveSequenceStepsAsReusableBlock({ steps, title: '합성 재사용 묶음' }).ok).toBe(true);
    }
    const originals = structuredClone(store.getState().savedSequences);
    render(
      <SequenceWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );
    if (route === 'saved restore')
      fireEvent.click(screen.getByTestId('workbench-restore-saved-btn'));
    else fireEvent.click(screen.getAllByRole('button', { name: /합성 재사용 묶음/ })[0]);
    expect(store.getState().undoStack.at(-1)?.activeScheduleContext).toEqual(context);
    expect(store.getState().activeSteps).not.toEqual(steps);
    fireEvent.click(screen.getByRole('button', { name: '사본 저장' }));
    const savedId = store.getState().activeSequenceId;
    expect(savedId).not.toBe(context.draftSequenceId);
    expect(store.getState().activeScheduleContext?.draftSequenceId).toBe(savedId);
    const savedAfter = structuredClone(store.getState().savedSequences);
    fireEvent.click(screen.getAllByRole('button', { name: '되돌리기' })[0]);
    const restored = store.getState();
    expect(restored.activeSequenceId).toBe(context.draftSequenceId);
    expect(restored.activeSteps).toEqual(steps);
    expect(
      matchingTeachingScheduleContext(restored.activeScheduleContext, restored.activeSequenceId),
    ).toEqual(context);
    expect(restored.savedSequences).toEqual(savedAfter);
    for (const original of originals)
      expect(restored.savedSequences.find((s) => s.id === original.id)).toEqual(original);
    expect(restored.historyLogs).toEqual([]);
  },
);
