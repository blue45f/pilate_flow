import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SequencePlanPreview } from '../components/SequencePlanPreview';
import { LogSessionModal } from '../components/LogSessionModal';
import { usePilatesStore } from '../store/usePilatesStore';

describe('Parallel Track 2 — SequencePlanPreview & LogSessionModal UX', () => {
  it('displays spring transition readiness summary in SequencePlanPreview and 1-tap quick reflection chips in LogSessionModal', () => {
    const moves = usePilatesStore.getState().exercises.slice(0, 2);
    usePilatesStore.setState({
      activeTitle: '프리뷰·기록 병렬 검증',
      activeSteps: moves.map((ex, idx) => ({
        stepId: `pv-${idx}`,
        exerciseId: ex.id,
        blockCategory: ex.blockCategory,
        durationMin: 4,
        selectedLayer: 'standard',
      })),
    });

    if (typeof HTMLDialogElement !== 'undefined') {
      HTMLDialogElement.prototype.showModal ??= function showModalPolyfill(this: HTMLDialogElement) {
        this.open = true;
      };
      HTMLDialogElement.prototype.close ??= function closePolyfill(this: HTMLDialogElement) {
        this.open = false;
      };
    }

    const { unmount } = render(<SequencePlanPreview onClose={() => undefined} />);
    expect(screen.getByTestId('plan-preview-spring-summary')).toHaveTextContent('수업 직전 체크');
    unmount();

    render(<LogSessionModal sequenceId="seq-log-test" onClose={() => undefined} />);
    const chipGroup = screen.getByTestId('log-quick-note-chips');
    fireEvent.click(within(chipGroup).getByRole('button', { name: /호흡·속도 안정적/ }));
    expect(
      screen.getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' }),
    ).toHaveValue('호흡·속도 안정적');
  });
});
