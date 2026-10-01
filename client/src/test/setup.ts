import '@testing-library/jest-dom/vitest';
import {afterEach} from 'vitest';

import {cleanup} from '@testing-library/react';

// jsdom has no layout. React Aria scrolls the focused row into view while moving
// between rows, and Recharts watches its container size; both need these to exist.
// Server tests run in the node environment, where there is no DOM to patch.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollTo ??= function scrollTo() {};

  Element.prototype.scrollIntoView ??= function scrollIntoView() {};

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??= ResizeObserverStub;
}

afterEach(() => {
  cleanup();
});
