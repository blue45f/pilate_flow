/**
 * Detects whether a keyboard event occurs during active CJK / Hangul IME composition.
 * Checks both React SyntheticEvent and native KeyboardEvent properties, plus legacy
 * Chromium/WebKit `keyCode === 229` emitted when an IME consumes Enter/Escape/Arrow keys.
 */
export interface ImeCheckableKeyboardEvent {
  readonly isComposing?: boolean;
  readonly keyCode?: number;
  readonly which?: number;
  readonly nativeEvent?: {
    readonly isComposing?: boolean;
    readonly keyCode?: number;
    readonly which?: number;
  };
}

export function isImeComposing(event: ImeCheckableKeyboardEvent | null | undefined): boolean {
  if (!event) return false;
  return Boolean(
    event.isComposing ||
      event.nativeEvent?.isComposing ||
      event.keyCode === 229 ||
      event.nativeEvent?.keyCode === 229 ||
      event.which === 229 ||
      event.nativeEvent?.which === 229,
  );
}
