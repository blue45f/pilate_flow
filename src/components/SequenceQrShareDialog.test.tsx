import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { stepSchema } from '../schemas/cloudBackupSchema';
import { createSequenceSnapshot, usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { createMovementSnapshot } from '../utils/hierarchyModel';
import {
  buildSequenceShareUrl,
  parseSequenceShareFromHashOrToken,
} from '../utils/localQrSequenceShare';
import { SequenceQrImportDialog } from './SequenceQrShareDialog';

const initialState = usePilatesStore.getState();
const exercise = INITIAL_EXERCISES[0]!;
const step: SequenceStep = {
  stepId: 'qr-undo-existing-step',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: 4,
  selectedLayer: 'standard',
};
const criteria: AutoGenerateCriteria = {
  apparatus: 'reformer',
  level: '1.5',
  targetMinutes: 50,
  focusPreset: 'full-body',
  preferredProps: ['none'],
  defaultLayer: 'standard',
  excludeDaysWindow: 0,
};

beforeEach(() => {
  usePilatesStore.setState({ ...initialState, undoStack: [] }, true);
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(initialState, true);
});

describe('QR import draft recovery', () => {
  it.each([false, true])(
    'restores the complete previous draft, including an empty draft: %s',
    (hasSteps) => {
      const oldStep = {
        ...step,
        exerciseSnapshot: structuredClone(createMovementSnapshot(exercise)),
      };
      usePilatesStore.setState({
        activeSequenceId: 'previous-draft-id',
        activeTitle: '이전 초안',
        activeSubtitle: '직접 입력한 부제',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 30,
        activeTargetGroupId: 'previous-class-group',
        activeSteps: hasSteps ? [oldStep] : [],
        draftCriteria: criteria,
        lastCriteria: criteria,
      });
      const before = createSequenceSnapshot(usePilatesStore.getState());
      const onImported = vi.fn();
      render(
        <SequenceQrImportDialog
          sharedSequence={{
            title: '공유 수업',
            subtitle: '',
            apparatus: 'reformer',
            level: '1.5',
            targetMinutes: 50,
            reformerBrand: 'stott',
            notesIncluded: false,
            steps: [step],
          }}
          onDismiss={vi.fn()}
          onImported={onImported}
        />,
      );
      fireEvent.click(screen.getByTestId('confirm-qr-sequence-import-btn'));
      expect(onImported).toHaveBeenCalledOnce();
      expect(usePilatesStore.getState()).toMatchObject({
        activeTitle: '공유 수업',
        activeTargetGroupId: '',
        draftCriteria: null,
        lastCriteria: null,
      });
      if (hasSteps) oldStep.exerciseSnapshot.cues = ['이전 객체에서 바뀐 큐'];
      act(() => usePilatesStore.getState().undoSequence());
      expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(before);
      expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    },
  );

  it('decodes a custom movement fallback into a persistable step without private notes', () => {
    const customExercise = { ...exercise, id: 'ex-custom-qr-test' };
    const encoded = buildSequenceShareUrl({
      title: '직접 만든 동작 공유',
      apparatus: 'mixed',
      level: '1.5',
      targetMinutes: 30,
      steps: [{ ...step, exerciseId: customExercise.id, instructorNote: '개인 비공개 메모' }],
      exercises: [customExercise],
    });
    const decoded = parseSequenceShareFromHashOrToken(encoded.hashFragment)!;
    expect(decoded.apparatus).toBe('mixed');
    expect(decoded.steps[0]!.exerciseSnapshot?.id).toBe(customExercise.id);
    expect(decoded.steps[0]!.instructorNote).toBeUndefined();
    expect(stepSchema.safeParse(decoded.steps[0]).success).toBe(true);
  });
});
