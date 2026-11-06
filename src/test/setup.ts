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
