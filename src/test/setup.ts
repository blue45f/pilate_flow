import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Polyfill HTMLDialogElement methods for jsdom environment
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
}

// Mock window.scrollTo and navigator.clipboard
beforeEach(() => {
  window.scrollTo = vi.fn();
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});
