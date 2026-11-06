import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LightDismissDialog } from './LightDismissDialog';
import type { DialogCloseRequest } from './LightDismissDialog';

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('optional dialog before-close decision', () => {
  it('keeps the existing close button behavior when no hook is supplied', () => {
    const onClose = vi.fn();
    render(
      <LightDismissDialog open title="합성 대화상자" onClose={onClose}>
        내용
      </LightDismissDialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.getByText('합성 대화상자').closest('dialog')).not.toHaveAttribute('open');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(['close-button', 'native-cancel', 'backdrop'] as const)(
    'vetoes %s before closing without reopening',
    (reason) => {
      const onClose = vi.fn();
      const before = vi.fn(() => false);
      render(
        <LightDismissDialog open title="합성 대화상자" onClose={onClose} onBeforeClose={before}>
          내용
        </LightDismissDialog>,
      );
      const dialog = screen.getByRole('dialog');
      const showCount = vi.mocked(HTMLDialogElement.prototype.showModal).mock.calls.length;
      if (reason === 'close-button') fireEvent.click(screen.getByRole('button', { name: '닫기' }));
      else if (reason === 'native-cancel') {
        const event = new Event('cancel', { cancelable: true });
        fireEvent(dialog, event);
        expect(event.defaultPrevented).toBe(true);
      } else fireEvent.click(dialog, { clientX: 100, clientY: 100 });
      expect(dialog).toHaveAttribute('open');
      expect(before).toHaveBeenCalledTimes(1);
      expect(before).toHaveBeenCalledWith(
        expect.objectContaining({ reason, close: expect.any(Function) }),
      );
      expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
      expect(vi.mocked(HTMLDialogElement.prototype.showModal).mock.calls.length).toBe(showCount);
      expect(onClose).not.toHaveBeenCalled();
    },
  );

  it('allows a deferred explicit decision to close once without requesting the decision again', () => {
    let deferred: DialogCloseRequest | undefined;
    const onClose = vi.fn();
    const before = vi.fn((request: DialogCloseRequest) => {
      deferred = request;
      return false;
    });
    render(
      <LightDismissDialog open title="합성 대화상자" onClose={onClose} onBeforeClose={before}>
        내용
      </LightDismissDialog>,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(dialog).toHaveAttribute('open');
    deferred!.close();
    deferred!.close();
    expect(dialog).not.toHaveAttribute('open');
    expect(before).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes through the native path when an installed hook allows cancel', () => {
    const onClose = vi.fn();
    const before = vi.fn(() => true);
    render(
      <LightDismissDialog open title="합성 대화상자" onClose={onClose} onBeforeClose={before}>
        내용
      </LightDismissDialog>,
    );
    const dialog = screen.getByRole('dialog');
    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog).not.toHaveAttribute('open');
    expect(before).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
