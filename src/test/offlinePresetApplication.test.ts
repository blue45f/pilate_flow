import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { OFFLINE_BLOCK_PRESETS, OFFLINE_CLASS_PRESETS } from '../data/classBlockPresets';
import {
  instantiateClassPresetAsEditableSequence,
  insertBlockPresetIntoSequence,
} from '../utils/classBlockPresetValidator';
const original = usePilatesStore.getState();
beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    { ...original, activeSteps: [], undoStack: [], lastCriteria: null },
    true,
  );
});
afterEach(() => {
  usePilatesStore.setState(original, true);
  localStorage.clear();
});
const classInput = (index = 0) => {
  const preset = OFFLINE_CLASS_PRESETS[index];
  const { sequence } = instantiateClassPresetAsEditableSequence(
    preset,
    undefined,
    usePilatesStore.getState().exercises,
  );
  return {
    steps: sequence.steps,
    title: sequence.title,
    subtitle: sequence.subtitle,
    targetMinutes: preset.durationMinutes,
  };
};
describe('explicit offline preset copies', () => {
  it.each(OFFLINE_CLASS_PRESETS.map((item, i) => [item.id, i] as const))(
    'loads %s without granting review or mutating saved data',
    (_, index) => {
      const state = usePilatesStore.getState();
      const input = classInput(index);
      const catalogBefore = JSON.stringify(OFFLINE_CLASS_PRESETS);
      const result = state.applyPresetDraft(input, 'replace', state);
      expect(result.success).toBe(true);
      const next = usePilatesStore.getState();
      expect(next.activeSteps).toEqual(input.steps);
      expect(next.activeSteps).not.toBe(input.steps);
      expect(next.exercises).toBe(state.exercises);
      expect(next.savedSequences).toBe(state.savedSequences);
      expect(next.historyLogs).toBe(state.historyLogs);
      expect(next.activeTargetMinutes).toBe(input.targetMinutes);
      expect(next.undoStack).toHaveLength(1);
      expect(JSON.stringify(OFFLINE_CLASS_PRESETS)).toBe(catalogBefore);
      next.undoSequence();
      expect(usePilatesStore.getState().activeSteps).toEqual([]);
    },
  );
  it.each(OFFLINE_BLOCK_PRESETS.map((item) => [item.id, item] as const))(
    'appends %s with one undo and preserves existing locked content',
    (_, preset) => {
      const existing = {
        ...classInput().steps[0],
        stepId: 'existing',
        locked: true,
        instructorNote: 'Keep me',
      };
      usePilatesStore.setState({ activeSteps: [existing] });
      const state = usePilatesStore.getState();
      const before = JSON.stringify(preset);
      const result = insertBlockPresetIntoSequence([], preset, undefined, state.exercises);
      expect(
        state.applyPresetDraft(
          { steps: result.steps, title: preset.title, subtitle: '', targetMinutes: 50 },
          'append',
          state,
        ).success,
      ).toBe(true);
      const next = usePilatesStore.getState();
      expect(next.activeSteps[0]).toEqual({ ...existing, order: 1 });
      expect(next.activeSteps).toHaveLength(result.steps.length + 1);
      expect(next.activeTargetMinutes).toBe(state.activeTargetMinutes);
      expect(next.activeSequenceId).toBe(state.activeSequenceId);
      expect(next.undoStack).toHaveLength(1);
      expect(JSON.stringify(preset)).toBe(before);
      next.undoSequence();
      expect(usePilatesStore.getState().activeSteps).toEqual([existing]);
    },
  );
  it('rejects newer edits or an account hydration without writes', () => {
    const expected = usePilatesStore.getState();
    const input = classInput();
    usePilatesStore.setState({ ...expected, activeTitle: 'Another account or newer draft' }, true);
    const before = usePilatesStore.getState();
    const disk = JSON.stringify(localStorage);
    expect(before.applyPresetDraft(input, 'replace', expected).success).toBe(false);
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(localStorage)).toBe(disk);
  });
  it('rejects missing exercises, invalid time and duplicate step IDs atomically', () => {
    for (const change of ['missing', 'time', 'id']) {
      const state = usePilatesStore.getState();
      const input = classInput();
      if (change === 'missing') input.steps[0].exerciseId = 'not-in-catalog';
      if (change === 'time') input.steps[0].durationMin = NaN;
      if (change === 'id') input.steps[1].stepId = input.steps[0].stepId;
      expect(state.applyPresetDraft(input, 'replace', state).success).toBe(false);
      expect(usePilatesStore.getState()).toBe(state);
    }
  });
  it('persists an editable copy without changing the template or history', async () => {
    const state = usePilatesStore.getState();
    const input = classInput();
    expect(state.applyPresetDraft(input, 'replace', state).success).toBe(true);
    const copied = structuredClone(usePilatesStore.getState().activeSteps);
    const history = usePilatesStore.getState().historyLogs;
    const persisted = localStorage.getItem(RECOVERY_STORAGE_KEY)!;
    usePilatesStore.setState({ activeSteps: [] });
    localStorage.setItem(RECOVERY_STORAGE_KEY, persisted);
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().activeSteps).toEqual(copied);
    expect(usePilatesStore.getState().historyLogs).toEqual(history);
  });
});
