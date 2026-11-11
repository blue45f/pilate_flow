import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StepTimeEstimateEditor } from './StepTimeEstimateEditor';
import type { StepTimeEstimate } from '../schemas/stepTimeEstimate';
import type { StepSideMode } from '../types/pilates';
import { resolveAppliedSideMode } from '../utils/stepTimeEstimatePresentation';

function openCalculator() {
  const summary = screen.getByText('반복·유지·호흡으로 시간 계산', { selector: 'summary' });
  const details = summary.closest('details');
  if (details && !details.open) {
    fireEvent.click(summary);
  }
}

function changeInput(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('StepTimeEstimateEditor scope preview, side alignment, and invalid input recovery', () => {
  it('never auto-applies or invents recommended cadence while blank, and preserves 0s teaching/transition semantics', () => {
    const onUse = vi.fn();
    render(
      <StepTimeEstimateEditor
        initial={null}
        repetitions={undefined}
        sets={undefined}
        sideMode={undefined}
        explanationSec={0}
        transitionSec={0}
        currentDurationMin={3}
        onUse={onUse}
      />,
    );

    openCalculator();
    const cadenceInput = screen.getByLabelText('한 회 움직임 · 초');
    expect(cadenceInput).toHaveValue(null);
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      '빈 가정 시간을 직접 입력하면 합계를 볼 수 있어요.',
    );

    changeInput('계산용 횟수 · 한 세트마다', '10');
    changeInput('계산용 세트 · 한쪽마다', '3');
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeDisabled();

    changeInput('한 회 움직임 · 초', '2');
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.getByText('가정 총시간 01:00')).toBeInTheDocument();

    const preview = screen.getByTestId('ste-apply-preview');
    expect(preview).toHaveTextContent('03:00 → 01:00');
    expect(preview).toHaveTextContent('미지정 · 미지정 → 10회 · 3세트');
    expect(preview).toHaveTextContent('동작 기본 → 양쪽 함께');
    expect(preview).toHaveTextContent('티칭 0초 · 전환 0초 유지');

    fireEvent.click(screen.getByRole('button', { name: '계산값을 편집란에 넣기' }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse).toHaveBeenCalledWith(
      expect.objectContaining({
        repetitions: 10,
        sets: 3,
        sides: 1,
        secondsPerRep: 2,
        explanationSec: 0,
        transitionSec: 0,
      }),
      1,
    );
  });

  it('warns clearly when 수행할 쪽 and 계산할 쪽(1배/2배) differ, syncs upper values on demand, and preserves bilateral/unilateral order rules', () => {
    expect(resolveAppliedSideMode(2, 'right-then-left')).toBe('right-then-left');
    expect(resolveAppliedSideMode(2, 'left-then-right')).toBe('left-then-right');
    expect(resolveAppliedSideMode(2, 'left')).toBe('left-then-right');
    expect(resolveAppliedSideMode(1, 'left')).toBe('left');
    expect(resolveAppliedSideMode(1, 'right')).toBe('right');
    expect(resolveAppliedSideMode(1, 'right-then-left')).toBe('together');

    const onUse = vi.fn();
    const { rerender } = render(
      <StepTimeEstimateEditor
        initial={null}
        repetitions={6}
        sets={2}
        sideMode="together"
        explanationSec={15}
        transitionSec={10}
        currentDurationMin={4}
        onUse={onUse}
      />,
    );

    openCalculator();
    expect(screen.queryByTestId('ste-side-mismatch-notice')).not.toBeInTheDocument();

    // Simulate instructor changing upper form fields AFTER calculator initialized
    rerender(
      <StepTimeEstimateEditor
        initial={null}
        repetitions={12}
        sets={3}
        sideMode="right-then-left"
        explanationSec={25}
        transitionSec={15}
        currentDurationMin={4}
        onUse={onUse}
      />,
    );

    const mismatch = screen.getByTestId('ste-side-mismatch-notice');
    expect(mismatch).toHaveTextContent(
      '현재 수행할 쪽(오른쪽부터 양쪽)과 계산할 쪽(1배)이 다릅니다.',
    );
    expect(mismatch).toHaveTextContent('그대로 넣으면 수행할 쪽이 ‘양쪽 함께’(으)로 바뀝니다.');

    // Sync from upper draft in one tap without touching blank secondsPerRep or calling onUse
    fireEvent.click(screen.getByTestId('ste-sync-from-draft'));
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.queryByTestId('ste-side-mismatch-notice')).not.toBeInTheDocument();
    expect(screen.getByLabelText('계산할 쪽')).toHaveValue('2');
    expect(screen.getByLabelText('계산용 횟수 · 한 세트마다')).toHaveValue(12);
    expect(screen.getByLabelText('계산용 세트 · 한쪽마다')).toHaveValue(3);
    expect(screen.getByLabelText('계산용 티칭 · 초')).toHaveValue(25);
    expect(screen.getByLabelText('기구·다음 동작 이동 · 초')).toHaveValue(15);
    expect(screen.getByLabelText('한 회 움직임 · 초')).toHaveValue(null);

    changeInput('한 회 움직임 · 초', '2');
    expect(screen.getByTestId('ste-apply-preview')).toHaveTextContent('오른쪽부터 양쪽 유지');

    // Unilateral catalog movement with blank sideMode ('동작 기본') + 1배 also warns clearly
    rerender(
      <StepTimeEstimateEditor
        initial={null}
        repetitions={8}
        sets={2}
        sideMode={undefined}
        explanationSec={20}
        transitionSec={10}
        currentDurationMin={4}
        isUnilateralExercise
        onUse={onUse}
      />,
    );
    changeInput('계산할 쪽', '1');
    expect(screen.getByTestId('ste-side-mismatch-notice')).toHaveTextContent(
      '편측 동작이지만 현재 계산할 쪽이 1배입니다.',
    );
  });

  it('recovers from invalid numbers and missing breath duration in one tap and guards duplicate transfer clicks', () => {
    let appliedEstimate: StepTimeEstimate | null = null;
    let appliedDuration = 4;
    let appliedReps: number | undefined = 8;
    let appliedSets: number | undefined = 2;
    let appliedSide: StepSideMode | undefined = 'left';
    let appliedExp: number | undefined = 20;
    let appliedTrans: number | undefined = 10;

    const onUse = vi.fn((estimate: StepTimeEstimate, durationMin: number) => {
      appliedEstimate = estimate;
      appliedDuration = durationMin;
      appliedReps = estimate.repetitions;
      appliedSets = estimate.sets;
      appliedSide = resolveAppliedSideMode(estimate.sides, appliedSide);
      appliedExp = estimate.explanationSec;
      appliedTrans = estimate.transitionSec;
    });

    const { rerender } = render(
      <StepTimeEstimateEditor
        initial={appliedEstimate}
        repetitions={appliedReps}
        sets={appliedSets}
        sideMode={appliedSide}
        explanationSec={appliedExp}
        transitionSec={appliedTrans}
        currentDurationMin={appliedDuration}
        onUse={onUse}
      />,
    );

    openCalculator();
    changeInput('한 회 움직임 · 초', '5');
    changeInput('세트마다 별도 호흡 · 회', '2');
    expect(screen.getByLabelText('별도 호흡 한 회 · 초')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeDisabled();

    // 1-tap reset of extra breath count restores valid calculation
    fireEvent.click(screen.getByTestId('ste-reset-extra-breath'));
    expect(screen.getByLabelText('세트마다 별도 호흡 · 회')).toHaveValue(0);
    expect(screen.getByLabelText('별도 호흡 한 회 · 초')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeEnabled();

    // Negative or decimal optional seconds trigger aria-invalid and 1-tap cleanup without altering secondsPerRep
    changeInput('세트 사이 쉼 · 초', '-5');
    changeInput('한 회마다 추가 유지 · 초', '1.5');
    expect(screen.getByLabelText('세트 사이 쉼 · 초')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('한 회마다 추가 유지 · 초')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeDisabled();

    const recoveryBox = screen.getByTestId('ste-validation-recovery');
    fireEvent.click(within(recoveryBox).getByTestId('ste-sanitize-invalid-optional'));
    expect(screen.getByLabelText('세트 사이 쉼 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('한 회마다 추가 유지 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('한 회 움직임 · 초')).toHaveValue(5);
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeEnabled();

    // Transfer once -> calls onUse; re-render with updated upper props and click again -> deduplicated!
    fireEvent.click(screen.getByRole('button', { name: '계산값을 편집란에 넣기' }));
    expect(onUse).toHaveBeenCalledTimes(1);

    rerender(
      <StepTimeEstimateEditor
        initial={appliedEstimate}
        repetitions={appliedReps}
        sets={appliedSets}
        sideMode={appliedSide}
        explanationSec={appliedExp}
        transitionSec={appliedTrans}
        currentDurationMin={appliedDuration}
        onUse={onUse}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '계산값을 편집란에 넣기' }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/이미 편집란에 같은 계산값이 반영되어 있습니다/),
    ).toHaveAttribute('role', 'status');
  });

  it('preserves negative, decimal, zero, and blank repetitions/sets/secondsPerRep and sides when cleaning invalid optional times, keeping apply blocked and never calling onUse', () => {
    const onUse = vi.fn();
    render(
      <StepTimeEstimateEditor
        initial={null}
        repetitions={8}
        sets={3}
        sideMode="right-then-left"
        explanationSec={20}
        transitionSec={10}
        currentDurationMin={4}
        onUse={onUse}
      />,
    );

    openCalculator();
    const applyButton = screen.getByRole('button', { name: '계산값을 편집란에 넣기' });

    // Case 1: negative repetitions (-3) and zero sets (0) alongside invalid optional times
    changeInput('계산할 쪽', '2');
    changeInput('계산용 횟수 · 한 세트마다', '-3');
    changeInput('계산용 세트 · 한쪽마다', '0');
    changeInput('한 회 움직임 · 초', '4');
    changeInput('세트 사이 쉼 · 초', '-10');
    changeInput('좌우 바꾸기 · 초', '2.5');

    expect(screen.getByLabelText('계산용 횟수 · 한 세트마다')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('계산용 세트 · 한쪽마다')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('세트 사이 쉼 · 초')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('좌우 바꾸기 · 초')).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByTestId('ste-sanitize-invalid-optional'));

    // Optional fields are cleaned to 0, while core fields (-3, 0, 4, sides=2) remain untouched and invalid
    expect(screen.getByLabelText('세트 사이 쉼 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('좌우 바꾸기 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('계산용 횟수 · 한 세트마다')).toHaveValue(-3);
    expect(screen.getByLabelText('계산용 세트 · 한쪽마다')).toHaveValue(0);
    expect(screen.getByLabelText('한 회 움직임 · 초')).toHaveValue(4);
    expect(screen.getByLabelText('계산할 쪽')).toHaveValue('2');
    expect(screen.getByLabelText('계산용 횟수 · 한 세트마다')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('계산용 세트 · 한쪽마다')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '횟수·세트·좌우와 가정 시간을 확인해 주세요.',
    );
    expect(applyButton).toBeDisabled();
    fireEvent.click(applyButton);
    expect(onUse).not.toHaveBeenCalled();

    // Case 2: decimal repetitions (2.5), decimal sets (1.5), negative cadence (-2), sides=1 + invalid optional times
    changeInput('계산할 쪽', '1');
    changeInput('계산용 횟수 · 한 세트마다', '2.5');
    changeInput('계산용 세트 · 한쪽마다', '1.5');
    changeInput('한 회 움직임 · 초', '-2');
    changeInput('한 회마다 추가 유지 · 초', '-4');
    changeInput('계산용 티칭 · 초', '1205');
    changeInput('기구·다음 동작 이동 · 초', '3.5');

    fireEvent.click(screen.getByTestId('ste-sanitize-invalid-optional'));

    expect(screen.getByLabelText('한 회마다 추가 유지 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('계산용 티칭 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('기구·다음 동작 이동 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('계산용 횟수 · 한 세트마다')).toHaveValue(2.5);
    expect(screen.getByLabelText('계산용 세트 · 한쪽마다')).toHaveValue(1.5);
    expect(screen.getByLabelText('한 회 움직임 · 초')).toHaveValue(-2);
    expect(screen.getByLabelText('계산할 쪽')).toHaveValue('1');
    expect(screen.getByLabelText('계산용 횟수 · 한 세트마다')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('계산용 세트 · 한쪽마다')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText('한 회 움직임 · 초')).toHaveAttribute('aria-invalid', 'true');
    expect(applyButton).toBeDisabled();
    fireEvent.click(applyButton);
    expect(onUse).not.toHaveBeenCalled();

    // Case 3: blank repetitions, blank sets, blank secondsPerRep, sides=2 + invalid optional time
    changeInput('계산할 쪽', '2');
    changeInput('계산용 횟수 · 한 세트마다', '');
    changeInput('계산용 세트 · 한쪽마다', '');
    changeInput('한 회 움직임 · 초', '');
    changeInput('세트 사이 쉼 · 초', '-8');

    fireEvent.click(screen.getByTestId('ste-sanitize-invalid-optional'));

    expect(screen.getByLabelText('세트 사이 쉼 · 초')).toHaveValue(0);
    expect(screen.getByLabelText('계산용 횟수 · 한 세트마다')).toHaveValue(null);
    expect(screen.getByLabelText('계산용 세트 · 한쪽마다')).toHaveValue(null);
    expect(screen.getByLabelText('한 회 움직임 · 초')).toHaveValue(null);
    expect(screen.getByLabelText('계산할 쪽')).toHaveValue('2');
    expect(screen.getByRole('status')).toHaveTextContent(
      '빈 가정 시간을 직접 입력하면 합계를 볼 수 있어요.',
    );
    expect(applyButton).toBeDisabled();
    fireEvent.click(applyButton);
    expect(onUse).not.toHaveBeenCalled();
  });

  it('enforces >=44px touch targets, :focus-visible outlines, 480px mobile layout, and prefers-reduced-motion in step-time-estimate.css', () => {
    const cssPath = resolve(process.cwd(), 'src/styles/step-time-estimate.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('min-height: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 480px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
