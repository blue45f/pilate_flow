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
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import { getStepTiming } from '../utils/sequenceEngine';
import { SequenceQrImportDialog, SequenceQrShareDialog } from './SequenceQrShareDialog';
import { OnePageVisual3DCueSheet } from './OnePageVisual3DCueSheet';

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
        reformerBrand: 'classical',
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
      expect(usePilatesStore.getState().reformerBrand).toBe('classical');
      act(() => usePilatesStore.getState().redoSequence());
      expect(usePilatesStore.getState().reformerBrand).toBe('stott');
    },
  );

  it('decodes a custom movement fallback into a persistable step without private notes', () => {
    const customExercise = {
      ...exercise,
      id: 'ex-custom-qr-test',
      isUnilateral: true,
      footbar: 'down' as const,
    };
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
    expect(decoded.steps[0]!.exerciseSnapshot).toMatchObject({
      id: customExercise.id,
      isUnilateral: true,
      footbar: 'down',
      bodyPosition: customExercise.bodyPosition,
    });
    expect(decoded.steps[0]!.instructorNote).toBeUndefined();
    expect(stepSchema.safeParse(decoded.steps[0]).success).toBe(true);
    render(<SequenceQrImportDialog sharedSequence={decoded} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTestId('confirm-qr-sequence-import-btn'));
    const imported = usePilatesStore.getState();
    expect(imported.exercises.filter((entry) => entry.id === customExercise.id)).toHaveLength(1);
    expect(
      imported.exercises.find((entry) => entry.id === customExercise.id)?.review,
    ).toBeUndefined();
    expect(
      buildSequenceSimulation(
        imported.activeSteps,
        imported.exercises,
        imported.activeTargetMinutes,
      ).gate.canRehearse,
    ).toBe(true);
  });
});

const sharedClass = {
  title: '기구별 연습 수업',
  apparatus: 'reformer' as const,
  level: '1.5' as const,
  targetMinutes: 50,
  exercises: [exercise],
};

describe('수업 링크 공유', () => {
  const submittedSteps = Array.from({ length: 32 }, (_, index): SequenceStep => ({
    ...step,
    stepId: `공유순서-${index + 1}`,
    order: index + 1,
    durationMin: 2 + index / 60,
    explanationSec: 17,
    transitionSec: 11,
    footbarOverride: 'low',
    boxOverride: 'long-box',
    classSection: 'main',
    locked: true,
    instructorNote: `연습 큐 ${index + 1}`,
  }));

  it('QR 용량을 넘긴 수업을 링크로 복사하고 모든 순서와 시간·기구 설정을 가져온다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      const sender = render(
        <SequenceQrShareDialog {...sharedClass} open onClose={vi.fn()} steps={submittedSteps} />,
      );
      expect(screen.queryByTestId('local-qr-share-svg')).toBeNull();
      expect(screen.getByRole('button', { name: 'QR 인쇄' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'QR SVG 저장' })).toBeDisabled();
      const url = (
        screen.getByRole('textbox', { name: '로컬 시퀀스 공유 링크' }) as HTMLInputElement
      ).value;
      await act(async () => fireEvent.click(screen.getByRole('button', { name: '링크 복사' })));
      expect(writeText).toHaveBeenCalledWith(url);
      const imported = parseSequenceShareFromHashOrToken(url)!;
      expect(imported.notesIncluded).toBe(false);
      expect(imported.steps.every((s) => s.instructorNote === undefined)).toBe(true);
      sender.unmount();
      render(<SequenceQrImportDialog sharedSequence={imported} onDismiss={vi.fn()} />);
      fireEvent.click(screen.getByTestId('confirm-qr-sequence-import-btn'));
      const actual = usePilatesStore.getState().activeSteps;
      expect(actual).toHaveLength(submittedSteps.length);
      actual.forEach((received, index) => {
        const sent = submittedSteps[index]!;
        expect(received).toMatchObject({
          order: sent.order,
          exerciseId: sent.exerciseId,
          durationMin: sent.durationMin,
          footbarOverride: 'low',
          boxOverride: 'long-box',
          classSection: 'main',
          locked: true,
        });
        expect(getStepTiming(received)).toEqual(getStepTiming(sent));
        expect(stepSchema.safeParse(received).success).toBe(true);
      });
    } finally {
      if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('강사가 선택한 공유에서만 개인 메모를 포함하고 다음 공유에서는 다시 제외한다', () => {
    const props = { ...sharedClass, open: true, onClose: vi.fn(), steps: [submittedSteps[0]!] };
    const { rerender } = render(<SequenceQrShareDialog {...props} />);
    const currentShare = () =>
      parseSequenceShareFromHashOrToken(
        (screen.getByTestId('qr-share-url-input') as HTMLInputElement).value,
      )!;
    expect(currentShare().steps[0]!.instructorNote).toBeUndefined();
    fireEvent.click(screen.getByTestId('qr-share-include-notes-toggle'));
    expect(currentShare().steps[0]!.instructorNote).toBe(submittedSteps[0]!.instructorNote);
    rerender(<SequenceQrShareDialog {...props} open={false} />);
    rerender(<SequenceQrShareDialog {...props} />);
    expect(currentShare().steps[0]!.instructorNote).toBeUndefined();
  });

  it('기존 v1 링크를 읽고 opt-in되지 않은 메모는 제외한다', () => {
    const old = {
      v: 1,
      t: 'Legacy',
      ap: 'mat',
      lv: '1.0',
      min: 30,
      notesIncluded: false,
      st: [{ id: exercise.id, b: 'warmup', d: 2, nt: 'excluded' }],
    };
    const decoded = parseSequenceShareFromHashOrToken(btoa(JSON.stringify(old)))!;
    expect(decoded.title).toBe('Legacy');
    expect(decoded.steps[0]).toMatchObject({ exerciseId: exercise.id, durationMin: 2 });
    expect(decoded.steps[0]!.instructorNote).toBeUndefined();
  });

  it('인쇄 큐시트에서도 QR 생성에 실패하면 원래 목표 시간을 담은 링크로 공유한다', () => {
    render(<OnePageVisual3DCueSheet {...sharedClass} steps={submittedSteps} />);
    fireEvent.click(screen.getByTestId('one-page-visual-cuesheet-qr-toggle'));
    const url = (screen.getByRole('textbox', { name: '큐시트 공유 링크' }) as HTMLInputElement)
      .value;
    const decoded = parseSequenceShareFromHashOrToken(url)!;
    expect(decoded.targetMinutes).toBe(50);
    expect(decoded.steps).toHaveLength(submittedSteps.length);
  });
});
