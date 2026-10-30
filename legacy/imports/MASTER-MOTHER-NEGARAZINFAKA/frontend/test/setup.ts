import '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * The browser globals the client relies on, provided in a form jsdom does not implement.
 *
 * `matchMedia` is the one React 19 reaches for during layout effects, and without it every render reports a
 * missing API rather than the behaviour under test.
 */
beforeEach(() => {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }

  window.scrollTo = () => undefined;
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});
