import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { usePilatesStore } from '../store/usePilatesStore';
import { computeFiveMinutePrepSummary } from '../utils/fiveMinutePrepAudit';
import { FiveMinutePrepDrawer } from '../components/workbench/FiveMinutePrepDrawer';
import type { SequenceStep } from '../types/pilates';

describe('Wave 13 Five-Minute Pre-Class Prep Drawer & Honest Provenance Audit', () => {
  it('computes 4-step readiness, locked/rest counts, delta, and honest provenance split accurately', () => {
    const exercises = usePilatesStore.getState().exercises;
    const exA = exercises[0]!;
    const exMap = new Map(exercises.map((item) => [item.id, item]));
    const steps: SequenceStep[] = [
      {
        stepId: 's-1',
        order: 1,
        blockCategory: exA.blockCategory,
        exerciseId: exA.id,
        durationMin: 10,
        selectedLayer: 'standard',
        locked: true,
      },
      {
        stepId: 'rest-1',
        order: 2,
        stepType: 'rest',
        blockCategory: 'cooldown-stretch',
        exerciseId: '__rest__',
        durationMin: 2,
        selectedLayer: 'standard',
      },
    ];

    const summary = computeFiveMinutePrepSummary({
      activeSteps: steps,
      exercisesById: exMap,
      targetMinutes: 12,
      selectedEquipmentCount: 1,
      canStartClass: true,
    });

    expect(summary.completedSteps).toBe(4);
    expect(summary.exerciseCount).toBe(1);
    expect(summary.lockedCount).toBe(1);
    expect(summary.restCount).toBe(1);
    expect(summary.deltaSec).toBe(0);
    expect(summary.originalOrDedicatedCount + summary.videoOrReferenceCount).toBe(1);
    expect(summary.reviewedCount + summary.unreviewedCount).toBe(1);
  });

  it('wires all 4 checklist actions and undo/redo recovery buttons end-to-end', () => {
    const exercises = usePilatesStore.getState().exercises;
    const exA = exercises[0]!;
    const exMap = new Map(exercises.map((item) => [item.id, item]));
    const onOpenConditions = vi.fn();
    const onOpenFinder = vi.fn();
    const onFitDuration = vi.fn();
    const onStartClass = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();

    const { getByText } = render(
      <FiveMinutePrepDrawer
        activeSteps={[
          {
            stepId: 's-1',
            order: 1,
            blockCategory: exA.blockCategory,
            exerciseId: exA.id,
            durationMin: 5,
            selectedLayer: 'standard',
          },
        ]}
        exercisesById={exMap}
        targetMinutes={50}
        selectedEquipmentCount={1}
        canStartClass
        canAutoFitDuration
        undoCount={2}
        redoCount={1}
        hasPersistenceError={false}
        onOpenConditions={onOpenConditions}
        onOpenFinder={onOpenFinder}
        onFitDuration={onFitDuration}
        onStartClass={onStartClass}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    );

    fireEvent.click(getByText('조건 조정'));
    fireEvent.click(getByText('동작 담기'));
    fireEvent.click(getByText('시간 맞춤'));
    fireEvent.click(getByText('수업 시작'));
    fireEvent.click(getByText('되돌리기 (2)'));
    fireEvent.click(getByText('다시 실행 (1)'));

    expect(onOpenConditions).toHaveBeenCalledTimes(1);
    expect(onOpenFinder).toHaveBeenCalledTimes(1);
    expect(onFitDuration).toHaveBeenCalledTimes(1);
    expect(onStartClass).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});
