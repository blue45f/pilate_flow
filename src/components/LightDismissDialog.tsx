import React, { useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import '../styles/light-dismiss-dialog.css';

export interface DialogCloseRequest {
  reason: 'close-button' | 'native-cancel' | 'backdrop';
  /** Commit a deferred, explicitly chosen close without repeating the decision. */
  close: () => void;
}

interface LightDismissDialogProps {
  open: boolean;
  onClose: () => void;
  /** Return false to keep this same dialog open for a local unsaved-change decision. */
  onBeforeClose?: (request: DialogCloseRequest) => boolean;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  className?: string;
  /** 'modal' (centered) or 'sheet' (bottom sheet on mobile, centered on desktop). */
  variant?: 'modal' | 'sheet';
  children: React.ReactNode;
}

export const LightDismissDialog: React.FC<LightDismissDialogProps> = ({
  open,
  onClose,
  onBeforeClose,
  title,
  subtitle,
  maxWidth = '760px',
  className = '',
  variant = 'modal',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);
  const titleId = useId();
  const subtitleId = useId();
  const restoreOpenerFocus = useCallback((dialogElement?: HTMLDialogElement | null) => {
    const dialog = dialogElement ?? dialogRef.current;
    const active = document.activeElement;
    if (
      (active === null ||
        active === document.body ||
        (dialog !== null && dialog.contains(active))) &&
      openerRef.current?.isConnected
    ) {
      openerRef.current.focus();
    }
  }, []);
  const finalizeClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    restoreOpenerFocus();
    onClose();
  }, [onClose, restoreOpenerFocus]);
  const requestClose = useCallback(
    (reason: DialogCloseRequest['reason']) => {
      const dialog = dialogRef.current;
      if (!dialog?.open) return;
      const close = () => {
        if (dialog.open) dialog.close();
        finalizeClose();
      };
      if (onBeforeClose?.({ reason, close }) === false) return;
      close();
    },
    [onBeforeClose, finalizeClose],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      closingRef.current = false;
      if (
        document.activeElement instanceof HTMLElement &&
        document.activeElement !== document.body &&
        !dialog.contains(document.activeElement)
      ) {
        openerRef.current = document.activeElement;
      }
      if (!dialog.open) {
        dialog.showModal();
      }
      return () => {
        restoreOpenerFocus(dialog);
      };
    }

    if (dialog.open) {
      dialog.close();
    }
    restoreOpenerFocus(dialog);
    return undefined;
  }, [open, restoreOpenerFocus]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleNativeClose = () => {
      finalizeClose();
    };

    const handleNativeCancel = (event: Event) => {
      if (!onBeforeClose) return;
      // Native Escape and supported closedby="any" light dismiss both request cancel.
      // Decide before the browser closes; never close and reopen a guarded dialog.
      event.preventDefault();
      requestClose('native-cancel');
    };

    const handleBackdropClick = (event: MouseEvent) => {
      // Fallback for browsers without native closedby="any" support (e.g. Safari)
      if (!('closedBy' in HTMLDialogElement.prototype)) {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        requestClose('backdrop');
      }
    };

    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('close', handleNativeClose);
    dialog.addEventListener('cancel', handleNativeCancel);
    dialog.addEventListener('click', handleBackdropClick);
    dialog.addEventListener('keydown', handleKeyboard);
    return () => {
      dialog.removeEventListener('close', handleNativeClose);
      dialog.removeEventListener('cancel', handleNativeCancel);
      dialog.removeEventListener('click', handleBackdropClick);
      dialog.removeEventListener('keydown', handleKeyboard);
    };
  }, [finalizeClose, onBeforeClose, requestClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      className={[
        'atelier-modal-dialog',
        'pf-modal-dialog',
        'light-dismiss-dialog',
        variant === 'sheet' ? 'pf-modal-dialog--sheet' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ maxWidth }}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="atelier-modal-shell">
        <header className="atelier-modal-header">
          <div>
            <h2 id={titleId} className="atelier-modal-title">
              {title}
            </h2>
            {subtitle && (
              <p id={subtitleId} className="atelier-modal-subtitle">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="icon-btn pf-btn pf-btn--icon"
            onClick={() => requestClose('close-button')}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </header>
        <div className="atelier-modal-body">{children}</div>
      </div>
    </dialog>
  );
};
