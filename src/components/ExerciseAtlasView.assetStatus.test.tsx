import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseAtlasView } from './ExerciseAtlasView';
import { usePilatesStore } from '../store/usePilatesStore';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import { MOTION_PATTERN_REFERENCES } from '../data/motionPatternReferences';

const original = usePilatesStore.getState();

beforeEach(() => {
  usePilatesStore.setState(
    { ...original, exercises: ORIGINAL_MOVEMENTS, activeSteps: [], historyLogs: [] },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

const renderAtlas = () =>
  render(<ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

describe('library asset status presentation', () => {
  it('keeps the unreviewed warning and demonstration limit visible while counts are collapsed', () => {
    const { container } = renderAtlas();
    const disclosure = container.querySelector('details.library-asset-status')!;
    const summary = disclosure.querySelector('summary')!;

    expect(disclosure).not.toHaveAttribute('open');
    expect(summary).toHaveTextContent(`도해 초안 ${MOTION_PATTERN_REFERENCES.length}개`);
    expect(within(summary as HTMLElement).getByText('전문가 검토 전')).toBeVisible();
    const note = screen.getByText('관련 패턴 참고용 · 검증된 운동 시범이 아닙니다.');
    expect(note).toBeVisible();
    expect(disclosure).not.toContainElement(note);
    expect(disclosure.querySelector('.ml-inventory')).toHaveTextContent('0정확히 일치하는 모션');
    expect(disclosure.querySelector('.ml-inventory')).toHaveTextContent('0전문가 검토 완료');
  });

  it('does not change filters, movement eligibility or saved data when status details are toggled', () => {
    const before = usePilatesStore.getState();
    const { container } = renderAtlas();
    const search = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(search, { target: { value: '호흡' } });
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    const review = screen.getByLabelText('내 강사 검토 상태');
    fireEvent.change(review, { target: { value: 'pending' } });
    const countBefore = container.querySelectorAll('.movement-card').length;
    const disclosure = container.querySelector('details.library-asset-status')!;
    const summary = disclosure.querySelector('summary')!;

    fireEvent.click(summary);
    expect(disclosure).toHaveAttribute('open');
    fireEvent.click(summary);
    expect(disclosure).not.toHaveAttribute('open');
    expect(search).toHaveValue('호흡');
    expect(review).toHaveValue('pending');
    expect(container.querySelectorAll('.movement-card')).toHaveLength(countBefore);
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
    expect(usePilatesStore.getState().instructorStudyState).toBe(before.instructorStudyState);
  });
});
