import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria } from '../types/pilates';
import {
  closeWorkbenchConditions,
  openWorkbenchAutomation,
  openWorkbenchConditions,
} from './workbenchControls';

const initialCriteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 14,
  targetMinutes: 63,
  defaultLayer: 'standard',
  planningGoals: [],
  instructorObservations: [],
};
const originalStore = usePilatesStore.getState();
const generate = vi.fn();
const renderForm = () =>
  render(
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );

const generateEmptyDraft = () => {
  fireEvent.click(openWorkbenchAutomation().getByRole('button', { name: '시퀀스 만들기' }));
};

describe('exact mixed-equipment planning form', () => {
  beforeEach(() => {
    generate.mockReset();
    usePilatesStore.setState(
      {
        ...originalStore,
        activeSteps: [],
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 63,
        activeTitle: '계획 조건 테스트',
        ownedApparatus: ['mat', 'reformer', 'chair'],
        ownedEquipment: ['mat', 'reformer', 'chair'],
        ownedProps: ['mini-ball', 'loop-band'],
        draftCriteria: initialCriteria,
        lastCriteria: null,
        generationError: null,
        saveFeedback: null,
        autoGenerateSequence: generate,
      },
      true,
    );
  });
  afterEach(() => {
    cleanup();
    usePilatesStore.setState(originalStore, true);
  });

  it('passes exactly the checked apparatus to mixed generation without adding another owned apparatus', () => {
    renderForm();
    openWorkbenchConditions();
    expect(screen.getByRole('checkbox', { name: '매트' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: '리포머' }));
    expect(screen.getByRole('checkbox', { name: '체어' })).not.toBeChecked();
    closeWorkbenchConditions();
    generateEmptyDraft();
    expect(generate).toHaveBeenCalledTimes(1);
    const request = generate.mock.calls[0]![0] as AutoGenerateCriteria;
    expect(request.apparatus).toBe('mixed');
    expect(request.availableEquipment).toEqual(['mat', 'reformer']);
    expect(request.ownedApparatus).toEqual(['mat', 'reformer']);
    expect(request.availableEquipment).not.toContain('chair');
    openWorkbenchConditions();
    expect(screen.getByRole('checkbox', { name: '타워 · 미보유' })).toBeDisabled();
  });

  it('retains selected props, goals and observation memos when the form is unmounted and reopened', () => {
    const view = renderForm();
    openWorkbenchConditions();
    fireEvent.click(screen.getByText('소도구·반복 회피 설정'));
    fireEvent.click(screen.getByRole('button', { name: '미니볼' }));
    fireEvent.click(screen.getByRole('button', { name: '루프 밴드' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '골반 움직임 인지·조절' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '전방경사 관찰' }));
    expect(generate).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      preferredProps: ['mini-ball', 'loop-band'],
      planningGoals: ['pelvic-control'],
      instructorObservations: ['anterior-pelvic-tilt'],
    });
    view.unmount();
    renderForm();
    openWorkbenchConditions();
    fireEvent.click(screen.getByText('소도구·반복 회피 설정'));
    expect(screen.getByRole('button', { name: '미니볼' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '루프 밴드' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('checkbox', { name: '골반 움직임 인지·조절' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '전방경사 관찰' })).toBeChecked();
    expect(
      screen.getByText(
        /관찰·계획 메모로 보관하며 자동 진단이나 치료 목적의 추천에는 사용하지 않습니다/,
      ),
    ).toBeInTheDocument();
  });

  it('keeps the last valid 63-minute draft after an invalid nine-minute entry and a remount', () => {
    const view = renderForm();
    openWorkbenchConditions();
    fireEvent.change(screen.getByRole('spinbutton', { name: '직접 지정 수업 시간' }), {
      target: { value: '9' },
    });
    expect(usePilatesStore.getState().draftCriteria?.targetMinutes).toBe(63);
    expect(usePilatesStore.getState().activeTargetMinutes).toBe(63);
    closeWorkbenchConditions();
    generateEmptyDraft();
    expect(generate).not.toHaveBeenCalled();
    view.unmount();
    renderForm();
    openWorkbenchConditions();
    expect(screen.getByRole('spinbutton', { name: '직접 지정 수업 시간' })).toHaveValue(63);
    expect(usePilatesStore.getState().draftCriteria?.targetMinutes).toBe(63);
  });
});
