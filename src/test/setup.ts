import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

// Polyfill HTMLDialogElement methods for jsdom environment
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
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
