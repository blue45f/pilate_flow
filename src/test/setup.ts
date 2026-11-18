import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

// Polyfill HTMLDialogElement methods and PointerEvent for jsdom environment
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
}

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class JSDOMPointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    readonly width: number;
    readonly height: number;
    readonly pressure: number;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? 'mouse';
      this.isPrimary = params.isPrimary ?? true;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? (this.buttons ? 0.5 : 0);
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: JSDOMPointerEvent,
  });
  Object.defineProperty(globalThis, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: JSDOMPointerEvent,
  });
}

const rafTimeouts = new Set<number>();

// Mock window.scrollTo, navigator.clipboard, and decouple requestAnimationFrame from jsdom's internal setInterval
beforeEach(() => {
  // Continuity is tested with remounts inside a test, never inherited from another test.
  // Keep this independent of app imports so per-file store/account mocks stay isolated.
  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith('pf_workspace_browse_v1:')) window.sessionStorage.removeItem(key);
    }
  } catch {
    // Storage-denial tests can intentionally leave access unavailable until cleanup.
  }
  window.scrollTo = vi.fn();
  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = window.setTimeout(() => {
      rafTimeouts.delete(id);
      callback(performance.now());
    }, 16);
    rafTimeouts.add(id);
    return id;
  };
  window.cancelAnimationFrame = (handle: number) => {
    rafTimeouts.delete(handle);
    window.clearTimeout(handle);
  };
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  rafTimeouts.forEach((id) => window.clearTimeout(id));
  rafTimeouts.clear();
});
